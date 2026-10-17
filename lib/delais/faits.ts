// Assistant des délais — ce que Shopify sait de la commande, SANS rien inventer.
// Sources : la commande (lignes, reste à expédier, envois + suivi) et ses étiquettes posées par
// l'outil d'atelier (étapes de production, Icelea commandé / arrivé, rupture, pièce prête).
// La langue vient du profil client Shopify (pas de Klaviyo — décision Philippe 16.10.2026).
import { shopifyGet } from "@/lib/shopify";
import { getShopifyProfileLocale } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRecipeWithSuppliers } from "@/lib/katana";
import { notesEquipe, type NoteEquipe } from "./notes";

export type Statut =
  | "expediee"            // tout est parti : suivi colis
  | "expediee_partiel"    // une partie est partie, le reste est encore à l'atelier
  | "attente_icelea"      // pièce commandée chez Icelea, date de livraison à venir
  | "piece_arrivee"       // pièce Icelea arrivée à l'atelier (Icelea-recu / Icelea-partiel)
  | "etape"               // étape d'atelier connue
  | "estimation_fournisseur" // rien de précis, mais délai estimé d'après le fournisseur des pièces
  | "boite"               // la commande attend une boîte de rangement mood : date laissée en blanc pour Philippe
  | "rien"                // juste « en production » : à traiter par Philippe
  | "introuvable"         // aucune commande trouvée
  | "annulee";

export type Faits = {
  statut: Statut;
  commande: string | null;
  commandeId: number | null;
  passeeLe: string | null;
  prenom: string;
  langue: string;                       // fr / de / en / it…
  articlesEnAttente: string[];          // titres encore à expédier
  envois: { date: string; transporteur: string | null; numero: string | null; lien: string | null; articles: string[] }[];
  iceleaLivraison: string | null;       // jj.mm.aaaa (à venir)
  iceleaArrivee: { date: string; complet: boolean } | null;
  etape: { nom: string; entree: boolean; date: string; delaiMin: number | null; delaiMax: number | null; unite: string | null } | null;
  rupture: string | null;               // date de l'étiquette « Rupture »
  boites: string[];                     // boîtes de rangement mood encore à expédier (noire, turquoise, OO N°1/N°2)
  // estimation d'après le contenu : fournisseur des pièces (recette Katana) et son délai habituel
  estimation: { fournisseur: string; delaiMin: number; delaiMax: number; du: string; au: string; depassee: boolean } | null;
  etiquettesUtilisees: string[];        // pour la page de validation (preuve)
  notes?: NoteEquipe[];                 // note de la commande + commentaires de l'équipe dans son historique
};

// boîtes de rangement : OO N°1 / N°2, « On n'en a jamais trop » (turquoise), « Black Obsession » (noire)
export const BOITE = /BOITEDERANGEMENT|^BOX-JAMAISTROP|^BOX-NUIT-NOIR|^COFFRET-ESCAPADE/i;
// délais fixes donnés par Philippe pour des articles sans fournisseur dans l'atelier (jours depuis la commande)
const DELAIS_FIXES: { rx: RegExp; nom: string; min: number; max: number }[] = [
  { rx: /^CO-PLUMIER/i, nom: "Boîte des écoliers romands", min: 15, max: 20 },
];
export const BLANC_DATE = "[DATE À COMPLÉTER]";

const d6 = (s: string) => `${s.slice(0, 2)}.${s.slice(2, 4)}.20${s.slice(4, 6)}`;
const toDate = (jjmmaaaa: string) => { const [j, m, a] = jjmmaaaa.split("."); return new Date(Number(a), Number(m) - 1, Number(j)); };

async function trouverCommande(numero: string | null, email: string): Promise<Record<string, unknown> | null> {
  if (numero) {
    const n = numero.replace(/\D/g, "");
    const j = await shopifyGet(`/orders.json?name=%23${n}&status=any&limit=1`);
    const o = ((j.orders ?? []) as Record<string, unknown>[])[0];
    if (o) return o;
  }
  if (!email) return null;
  // sinon : la commande la plus récente de cette adresse, en priorité une pas encore entièrement partie
  const j = await shopifyGet(`/orders.json?email=${encodeURIComponent(email)}&status=any&limit=10`);
  const os = ((j.orders ?? []) as Record<string, unknown>[]).filter((o) => !o.cancelled_at);
  return os.find((o) => o.fulfillment_status !== "fulfilled") ?? os[0] ?? null;
}

export async function faitsCommande(numero: string | null, email: string): Promise<Faits> {
  const vide: Faits = { statut: "introuvable", commande: null, commandeId: null, passeeLe: null, prenom: "", langue: "fr",
    articlesEnAttente: [], envois: [], iceleaLivraison: null, iceleaArrivee: null, etape: null, rupture: null, estimation: null, boites: [], etiquettesUtilisees: [] };
  const o = await trouverCommande(numero, email);
  if (!o) return vide;
  const cust = (o.customer ?? {}) as Record<string, unknown>;
  const langueProfil = await getShopifyProfileLocale(String(o.email ?? cust.email ?? email));
  const langue = langueProfil ?? String(o.customer_locale ?? "fr").split("-")[0].toLowerCase();
  const lignes = ((o.line_items ?? []) as Record<string, unknown>[]);
  const tags = String(o.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const f: Faits = { ...vide, commande: String(o.name), commandeId: Number(o.id), passeeLe: String(o.created_at).slice(0, 10),
    prenom: String(cust.first_name ?? ""), langue, statut: "rien" };
  f.notes = await notesEquipe(Number(o.id), o.note);
  if (o.cancelled_at) { f.statut = "annulee"; return f; }

  f.articlesEnAttente = lignes.filter((l) => Number(l.fulfillable_quantity ?? 0) > 0).map((l) => String(l.title));
  f.envois = ((o.fulfillments ?? []) as Record<string, unknown>[]).filter((x) => x.status !== "cancelled").map((x) => ({
    date: String(x.created_at).slice(0, 10),
    transporteur: (x.tracking_company as string) ?? null,
    numero: (x.tracking_number as string) ?? null,
    lien: (x.tracking_url as string) ?? null,
    articles: ((x.line_items ?? []) as Record<string, unknown>[]).map((l) => String(l.title)),
  }));

  // boîtes de rangement mood (leur date d'arrivée n'est connue que de Philippe → laissée en blanc)
  f.boites = lignes.filter((l) => Number(l.fulfillable_quantity ?? 0) > 0 && BOITE.test(String(l.sku ?? ""))).map((l) => String(l.title));

  // étiquettes d'atelier
  const now = new Date(); now.setHours(0, 0, 0, 0);
  for (const t of tags) {
    let m = t.match(/^Icelea-livraison:(\d\d\.\d\d\.\d{4})$/);
    if (m && toDate(m[1]) >= now) { f.iceleaLivraison = m[1]; f.etiquettesUtilisees.push(t); }
    m = t.match(/^Icelea-(recu|partiel):(\d\d\.\d\d\.\d{4})$/);
    if (m) { f.iceleaArrivee = { date: m[2], complet: m[1] === "recu" }; f.etiquettesUtilisees.push(t); }
    m = t.match(/^Rupture.*-(\d{6})-\d\dh\d\d$/);
    if (m) { f.rupture = d6(m[1]); f.etiquettesUtilisees.push(t); }
  }
  // dernière étape d'atelier (étiquettes « étape-in/out-jjmmaa-HHhMM »)
  const etapes = tags.map((t) => t.match(/^(.+)-(in|out)-(\d{6})-(\d\d)h(\d\d)$/)).filter((m): m is RegExpMatchArray => !!m && !m[1].startsWith("Rupture"))
    .map((m) => ({ key: m[1], entree: m[2] === "in", date: d6(m[3]), tri: `20${m[3].slice(4, 6)}${m[3].slice(2, 4)}${m[3].slice(0, 2)}${m[4]}${m[5]}`, tag: m[0] }))
    .sort((a, b) => a.tri.localeCompare(b.tri));
  const derniere = etapes[etapes.length - 1];
  if (derniere) {
    const { data } = await supabaseAdmin.from("production_steps")
      .select("name,name_de,name_en,lead_time_min,lead_time_max,lead_time_unit").eq("step_key", derniere.key).limit(1);
    const st = (data ?? [])[0] as Record<string, unknown> | undefined;
    const nom = String((langue === "de" ? st?.name_de : langue === "en" ? st?.name_en : st?.name) ?? st?.name ?? derniere.key);
    f.etape = { nom, entree: derniere.entree, date: derniere.date,
      delaiMin: (st?.lead_time_min as number) ?? null, delaiMax: (st?.lead_time_max as number) ?? null, unite: (st?.lead_time_unit as string) ?? null };
    f.etiquettesUtilisees.push(derniere.tag);
  }

  // une rupture déjà suivie d'une étape d'atelier ou d'une arrivée de pièce n'est plus d'actualité
  if (f.rupture) {
    const r = toDate(f.rupture).getTime();
    const apres = (f.etape && toDate(f.etape.date).getTime() >= r) || (f.iceleaArrivee && toDate(f.iceleaArrivee.date).getTime() >= r);
    if (apres) { f.etiquettesUtilisees = f.etiquettesUtilisees.filter((t) => !t.startsWith("Rupture")); f.rupture = null; }
  }

  // statut principal (du plus sûr au moins sûr)
  if (f.articlesEnAttente.length === 0 && f.envois.length) f.statut = "expediee";
  else if (f.iceleaArrivee) f.statut = "piece_arrivee";
  else if (f.iceleaLivraison) f.statut = "attente_icelea";
  else if (f.etape) f.statut = "etape";
  else f.statut = "rien";
  // contenu encore à expédier → fournisseur des pièces → délai habituel compté depuis la commande
  if (f.statut === "rien" || f.statut === "etape") {
    try { f.estimation = await estimationFournisseur(lignes, f.passeeLe!); } catch (e) { console.error("[délais] estimation", e); }
    if (f.statut === "rien" && f.estimation && !f.estimation.depassee) f.statut = "estimation_fournisseur";
  }
  if (f.boites.length && f.statut !== "expediee") f.statut = "boite";
  if (f.envois.length && f.articlesEnAttente.length && f.statut !== "expediee") {
    f.etiquettesUtilisees.push("envoi partiel");
    if (f.statut === "rien") f.statut = "expediee_partiel";
  }
  return f;
}

// Fournisseur au délai le plus long parmi les pièces achetées des articles encore à expédier
// (délais habituels de la table supplier_lead_times, en jours, comptés depuis la date de commande).
async function estimationFournisseur(lignes: Record<string, unknown>[], passeeLe: string): Promise<Faits["estimation"]> {
  const skus = [...new Set(lignes.filter((l) => Number(l.fulfillable_quantity ?? 0) > 0).map((l) => String(l.sku ?? "")).filter(Boolean))];
  if (!skus.length) return null;
  const fournisseurs = new Map<number, string>();
  for (const sku of skus.slice(0, 6)) {
    const r = await recetteSouple(sku);
    (r?.ingredients ?? []).forEach((i) => { if (i.supplier) fournisseurs.set(i.supplier.id, i.supplier.name); });
  }
  const { data } = fournisseurs.size ? await supabaseAdmin.from("supplier_lead_times")
    .select("supplier_id,supplier_name,lead_time_min,lead_time_max").in("supplier_id", [...fournisseurs.keys()]) : { data: [] };
  const rows = ((data ?? []) as { supplier_id: number; supplier_name: string; lead_time_min: number | null; lead_time_max: number | null }[])
    .filter((x) => x.lead_time_min != null);
  DELAIS_FIXES.filter((d) => skus.some((k) => d.rx.test(k))).forEach((d, i) => {
    rows.push({ supplier_id: -1 - i, supplier_name: d.nom, lead_time_min: d.min, lead_time_max: d.max });
  });
  if (!rows.length) return null;
  const pire = rows.sort((a, b) => (b.lead_time_max ?? b.lead_time_min!) - (a.lead_time_max ?? a.lead_time_min!))[0];
  const min = pire.lead_time_min!, max = pire.lead_time_max ?? pire.lead_time_min!;
  const base = new Date(passeeLe + "T12:00:00");
  const plus = (j: number) => { const d = new Date(base); d.setDate(d.getDate() + j); return d; };
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return { fournisseur: fournisseurs.get(pire.supplier_id) ?? pire.supplier_name, delaiMin: min, delaiMax: max,
    du: fmt(plus(min)), au: fmt(plus(max)), depassee: plus(max) < auj };
}

// Le SKU Shopify et celui de l'atelier ne s'écrivent pas toujours pareil : une variante Shopify
// « …COMPAGNONAURAPEARL58-62 » (plage de tailles) correspond dans Katana à « …COMPAGNONAURAPEARL-58 ».
// On essaie le SKU exact, puis la même famille avec chaque taille de la plage (le fournisseur ne
// change pas d'une taille à l'autre).
async function recetteSouple(sku: string) {
  const exact = await getRecipeWithSuppliers(sku).catch(() => null);
  if (exact?.ingredients?.length) return exact;
  const m = sku.match(/^(.*?)-?(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  const famille = m[1].replace(/-$/, "");
  const tailles = [m[2], m[3]].filter(Boolean) as string[];
  for (const t of tailles) {
    for (const essai of [`${famille}-${t}`, `${famille}${t}`]) {
      if (essai === sku) continue;
      const r = await getRecipeWithSuppliers(essai).catch(() => null);
      if (r?.ingredients?.length) return r;
    }
  }
  return null;
}
