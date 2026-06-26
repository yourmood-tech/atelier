import { NextRequest, NextResponse } from "next/server";
import {
  hasRedis, redisGet, redisSet, loadSubmissions, loadResults, computeWinners, bonKey,
  SENT_KEY,
} from "@/lib/pronostics/store";
import {
  shopifyReady, klaviyoReady, ensurePriceRule, createDiscountCode, sendBonEvent,
} from "@/lib/pronostics/bons";

type SentMap = Record<string, { code: string; ts: string; email: string; match: string; score: string }>;

async function loadSent(): Promise<SentMap> {
  return ((await redisGet(SENT_KEY)) as SentMap) || {};
}

// GET : aperçu — qui a gagné, qui a déjà reçu son bon, qui reste à envoyer, état des branchements
export async function GET() {
  if (!hasRedis()) return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });
  const [submissions, results, sent] = await Promise.all([loadSubmissions(), loadResults(), loadSent()]);
  const winners = computeWinners(submissions, results);
  const toSend = winners.filter((w) => !sent[bonKey(w.email, w.matchId)]);
  return NextResponse.json({
    pret: { shopify: shopifyReady(), klaviyo: klaviyoReady() },
    gagnantes: winners.length,
    deja_envoyes: Object.keys(sent).length,
    a_envoyer: toSend.length,
    apercu: toSend,
  });
}

// POST : envoi.  { confirm:false } (défaut) = test à blanc.  { confirm:true } = envoi réel.
export async function POST(request: NextRequest) {
  if (!hasRedis()) return NextResponse.json({ error: "stockage non configuré" }, { status: 503 });

  let body: { confirm?: boolean } = {};
  try { body = await request.json(); } catch { /* corps vide = test à blanc */ }
  const confirm = body.confirm === true;

  const [submissions, results, sent] = await Promise.all([loadSubmissions(), loadResults(), loadSent()]);
  const winners = computeWinners(submissions, results);
  const toSend = winners.filter((w) => !sent[bonKey(w.email, w.matchId)]);

  // TEST À BLANC : on montre ce qui partirait, sans rien créer ni envoyer.
  if (!confirm) {
    return NextResponse.json({
      mode: "test à blanc",
      pret: { shopify: shopifyReady(), klaviyo: klaviyoReady() },
      a_envoyer: toSend.length,
      apercu: toSend.map((w) => ({ email: w.email, match: w.match, score: w.score, bon: "10.- (simulé)" })),
      note: "Aucun code ni mail créé. Renvoyer avec confirm:true pour l'envoi réel.",
    });
  }

  // ENVOI RÉEL — exige Shopify + Klaviyo prêts
  if (!shopifyReady()) return NextResponse.json({ error: "Shopify non configuré" }, { status: 503 });
  if (!klaviyoReady()) return NextResponse.json({ error: "Klaviyo non configuré (clé manquante côté serveur)" }, { status: 503 });

  let priceRuleId: number;
  try { priceRuleId = await ensurePriceRule(); }
  catch (e) { return NextResponse.json({ error: "règle de prix Shopify", detail: String((e as Error).message) }, { status: 500 }); }

  const envoyes: Array<{ email: string; match: string; code: string }> = [];
  const erreurs: Array<{ email: string; match: string; erreur: string }> = [];

  for (const w of toSend) {
    const k = bonKey(w.email, w.matchId);
    try {
      const code = await createDiscountCode(priceRuleId);
      await sendBonEvent({ email: w.email, code, match: w.match, score: w.score, team: w.team });
      sent[k] = { code, ts: new Date().toISOString(), email: w.email, match: w.match, score: w.score };
      await redisSet(SENT_KEY, sent); // sauvegarde après chaque envoi → idempotent même si interruption
      envoyes.push({ email: w.email, match: w.match, code });
    } catch (e) {
      erreurs.push({ email: w.email, match: w.match, erreur: String((e as Error).message) });
    }
  }

  return NextResponse.json({ mode: "envoi réel", envoyes: envoyes.length, erreurs: erreurs.length, detail_envoyes: envoyes, detail_erreurs: erreurs });
}
