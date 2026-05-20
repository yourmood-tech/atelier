import { NextResponse } from "next/server";
import { callClaude } from "@/lib/claude-ai";

const STYLE_MOOD = `Tu es l'adjoint marketing de Mood Collection — marque suisse de joaillerie contemporaine, minimaliste poétique.

ÉCRIS la description produit dans le STYLE EXACT de Mood :
- 2 paragraphes courts (40-70 mots chacun)
- Minimaliste poétique, sensoriel, évocateur
- "on" inclusif, JAMAIS "nous" / "vous"
- Métaphores naturelles : lumière, eau, ciel, pierre, saison, souffle, instant
- Suggérer plutôt qu'expliquer — pas de superlatifs commerciaux
- Pas de hashtags, pas de CTA, pas de "découvrez", "n'hésitez pas"
- Banni absolu : "premium", "élégance intemporelle", "exceptionnel", "raffinement"

EXEMPLE DU STYLE ATTENDU (à reproduire exactement) :
"Le coffret PRINTEMPS DORÉ s'inspire de la douceur des premiers rayons de soleil, de la chaleur qui revient et des teintes délicates qui éveillent la saison. Une harmonie lumineuse entre ivoire, blush et nuances dorées, évoquant un renouveau doux et élégant.

Dans cette atmosphère chaleureuse, les matières captent la lumière avec subtilité : les textures sablées diffusent un éclat tendre, tandis que le rose gold apporte une touche précieuse et solaire. Une esthétique apaisante, où fraîcheur et éclat se rencontrent naturellement."

Génère la description SANS phrase d'introduction, SANS méta-commentaire — juste le texte poétique brut, deux paragraphes séparés par une ligne vide.`;

const STYLE_JOAILLERIE = `Tu es l'adjoint marketing de Mood Joaillerie — gamme haute joaillerie suisse de Mood Collection.

ÉCRIS une description produit complète, technique et pédagogique au format de Mood Joaillerie. Structure obligatoire (séparer chaque section par une ligne vide) :

1. Titre fonctionnel décrivant le produit (matière + format + sertissage + pierre + taille mm)
2. Phrase courte sur le sertissage
3. Détails techniques pierre : qualité, diamètre, provenance ("notre fournisseur suisse agréé")
4. Note sur la nature de la pierre (variations naturelles, sélection soignée)
5. Si fragilité particulière de la pierre, avertissement (émeraudes, opales)
6. Détails du sertissage et choix techniques (hauteur des pierres, etc.)
7. Conseils d'association (mediums conseillés, bases compatibles)
8. Phrase finale rappelant ce qu'est le format (addon = partie interchangeable, base = anneau porteur, etc.)

EXEMPLE EXACT du style attendu :
"Addon medium palladium entièrement serti d'émeraudes 1.6 mm pour bague personnalisable mood

Full serti en émeraudes véritables, sertissage grain.

Qualité AA, diamètre 1,6mm, provenance par notre fournisseur suisse agréé de pierres précieuses.

L'émeraude étant une pierre naturelle, il peut y avoir de très légères variations de couleurs et de taille. Nous sélectionnons avec soin les pierres avant sertissage pour une qualité parfaite.

Attention, les émeraudes sont des pierres plus fragiles que les diamants, notamment aux chocs.

Le sertissage en grain est sur un medium en palladium, les émeraudes sont légèrement plus basses que lors des sertissages de diamants, pour permettre aux pierres d'être mieux protégées.

Nous conseillons d'associer les émeraudes avec des mediums de couleurs neutres, pour une mise en valeur du full serti.
À associer avec des mediums acier poli, des tantales, ou mediums en alu gris ou noirs.
Il convient sur toutes les bases, noires ou acier.

Un addon est la partie interchangeable de la bague mood qui vient se loger sur la base en acier. Pour commander cet article, vous devez aussi commander une base ou en avoir déjà une."

RÈGLES :
- Adapte la phrase finale selon le format : addon / medium / deux tiers / mini = pièce interchangeable qui se clipse sur une base. Base sertie = anneau porteur autonome.
- Si pas de pierre fragile particulière (diamants, saphirs, rubis durs), saute la section avertissement.
- Garde le ton informatif Mood : précis, technique, mais accessible. Pas de superlatifs commerciaux.
- Banni absolu : "exceptionnel", "raffinement", "découvrez", "premium".
- Génère SANS phrase d'introduction de ta part — juste le texte de la fiche produit brut.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante côté serveur — Philippe doit l'ajouter dans Vercel" }, { status: 500 });

  const body = await request.json();
  const { nom, format, matiere, finition, couleur, motsCles, mode, pierres, sertissage, type_sertissage } = body || {};

  if (!motsCles || !motsCles.trim())
    return NextResponse.json({ error: 'champ "motsCles" requis (2-3 mots-clés)' }, { status: 400 });

  const isJoaillerie = mode === 'joaillerie';

  const pierresDescription = Array.isArray(pierres) && pierres.length > 0
    ? pierres.map((p: { type?: string; taille?: string; quantite?: number }) =>
        `${p.quantite || 1}× ${p.type || ''} ${p.taille || ''}mm`).join(', ')
    : '';

  const contexte = [
    nom && `Nom du produit : ${nom}`,
    format && `Format : ${format}`,
    matiere && `Matière : ${matiere}`,
    finition && finition !== "aucune" && `Finition : ${finition}`,
    couleur && `Couleur dominante : ${couleur}`,
    pierresDescription && `Pierres serties : ${pierresDescription}`,
    sertissage && `Mode de sertissage : ${sertissage}`,
    type_sertissage && `Type de sertissage joaillier : ${type_sertissage}`,
    `Mots-clés à intégrer : ${motsCles}`,
  ]
    .filter(Boolean)
    .join("\n");

  const stylePrompt = isJoaillerie ? STYLE_JOAILLERIE : STYLE_MOOD;
  const prompt = `${stylePrompt}\n\n--- CONTEXTE DU PRODUIT ---\n${contexte}\n\n--- TEXTE ---\n`;

  try {
    const texte = await callClaude({ prompt, maxTokens: 2048, temperature: 0.85 });
    if (!texte) {
      return NextResponse.json({ error: "Claude n'a pas pu générer le texte (vérifier ANTHROPIC_API_KEY dans Vercel)" }, { status: 500 });
    }
    return NextResponse.json({ texte });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
