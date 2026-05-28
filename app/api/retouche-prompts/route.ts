import { NextResponse } from "next/server";

// === PROMPTS FR ORIGINAUX D'AMILA ===
// Extraits depuis les archives Claude /Users/amila/.claude/projects/
// Lignes : 17312 (Terre d'ombre), 17522 (Terre Olive), 17558 (Tropical),
// 17661 (Sakura), 17838 (Pur White), 18379 (Zanzibar), 18459 (Béton),
// 18494 (Pastel), 18517 (In the mood for), 18543 (Lifestyle).
//
// Cette endpoint sert les VERSIONS ORIGINALES écrites par Amila en français.
// Différent du code de l'app qui utilise les versions anglaises traduites/enrichies.

type Prompts = {
  label: string;
  porte: string;      // Prompt bague portée
  ambiance: string;   // Prompt bague d'ambiance / objet
  porte_homme?: string; // Variante homme (si Amila l'a livrée)
};

const PROMPTS_FR_AMILA: Record<string, Prompts> = {
  "terre-olive": {
    label: "Terre Olive",
    porte: `femme asiatique, longs cheveux noirs lisses. Photographie éditoriale minimaliste de bijoux de luxe, ambiance très épurée et sophistiquée. Lumière naturelle directionnelle de fin de journée créant des ombres profondes et graphiques. Esthétique inspirée de Jacquemus, Bottega Veneta et campagnes joaillerie haut de gamme. Composition ultra minimaliste avec beaucoup d'espace vide, focus total sur le bijou. Atmosphère calme, organique, moderne et luxueuse. Rendu photo éditorial premium, ultra réaliste, lumière chaude et cinématographique, profondeur de champ douce, détails précieux, esthétique luxe silencieux et contemporain. Tenue : blouse très fluide (comme un foulard) avec mouvement en coton blanc, épaule dénudée, manucure naturel très soignée. Zoom sur la bague.`,
    ambiance: `Photographie éditoriale minimaliste de bijoux de luxe, ambiance très épurée et sophistiquée. Fond uni texturé dans des tons olive doux, beige sable ou ivoire chaud. Lumière naturelle directionnelle de fin de journée créant des ombres profondes et graphiques. Esthétique inspirée de Jacquemus, Bottega Veneta et campagnes joaillerie haut de gamme. Bijoux mis en scène avec très peu d'éléments : une feuille floue, une ombre végétale, une surface mate, un reflet dans l'eau ou un simple jeu de lumière. Composition ultra minimaliste avec beaucoup d'espace vide, focus total sur le bijou. Atmosphère calme, organique, moderne et luxueuse. Rendu photo éditorial premium, ultra réaliste, lumière chaude et cinématographique, profondeur de champ douce, détails précieux, esthétique luxe silencieux et contemporain.`,
  },
  "tropical": {
    label: "Tropical",
    porte: `Photographie macro éditoriale de bijoux portés, mise en scène végétale tropicale sombre et satinée. Tons vert forêt, olive foncé, noir végétal et reflets dorés subtils. Lumière dramatique et directionnelle créant des zones d'ombre intenses et des éclats lumineux précis sur le bijou.`,
    ambiance: `Photographie macro éditoriale de bijoux de luxe posés sur de grandes feuilles tropicales sombres et satinées. Ambiance végétale profonde, élégante et mystérieuse. Tons vert forêt, olive foncé, noir végétal et reflets dorés subtils. Lumière dramatique et directionnelle créant des zones d'ombre intenses et des éclats lumineux précis sur le bijou. Atmosphère luxueuse et organique, inspirée des campagnes haute joaillerie contemporaines. Rendu ultra réaliste, esthétique premium et sophistiquée, profondeur de champ douce, détails précieux.`,
  },
  "sakura": {
    label: "Sakura",
    porte: `Photographie macro éditoriale de luxe d'une bague portée sur une main féminine élégante, focus très net et rapproché sur la bague. Main délicatement posée près d'une épaule dénudée, peau légèrement bronzée et lumineuse. Robe fluide rose clair en tissu léger et aérien, mouvement subtil du textile dans une ambiance printanière douce et sophistiquée. Lumière naturelle du matin, chaude et délicate, créant de fines ombres de branches de sakura sur la peau et le décor. Palette pastel raffinée : rose poudré, beige chaud, blanc crème et reflets dorés subtils. Composition minimaliste et haut de gamme inspirée de Jacquemus et des campagnes joaillerie luxe contemporaines.`,
    ambiance: `Photographie éditoriale de luxe minimaliste inspirée de Jacquemus et des campagnes mode haut de gamme contemporaines. Univers printanier épuré, moderne et lumineux. Lumière douce du matin entrant latéralement, créant de délicates ombres de branches de sakura projetées sur les surfaces et la peau. Palette raffinée et naturelle : blanc crème, beige chaud, rose poudré très subtil, pierre claire et reflets dorés doux. Composition ultra minimaliste avec beaucoup d'espace négatif, architecture méditerranéenne contemporaine, matières nobles et textures mates sophistiquées. Atmosphère calme, aérienne et premium, mélange de poésie printanière et de luxe silencieux. Esthétique propre, artistique et haut de gamme, sans surcharge visuelle. Rendu ultra réaliste, lumière cinématographique naturelle, ombres graphiques délicates, style magazine mode luxe contemporain.`,
  },
  "pur-white": {
    label: "Pur White (Joaillerie)",
    porte: `Photographie éditoriale de haute joaillerie portée, lumière cristalline et aérienne. Main féminine élégante, peau lumineuse. Fond blanc glacé ou gris perle très clair. Ambiance pure, minimaliste, premium. Bijou en focus, éclats prismatiques et reflets diamantés.`,
    ambiance: `Photographie éditoriale de haute joaillerie ultra lumineuse et cristalline, inspirée des campagnes Swarovski et de la photographie diamant contemporaine. Bijoux photographiés sur fond blanc glacé ou gris perle très clair, dans une ambiance pure, aérienne et minimaliste. Lumière naturelle intense et directionnelle créant des éclats prismatiques, reflets diamantés et arcs-en-ciel subtils sur les surfaces polies. Esthétique luxe pur, élégante et cristalline, sans surcharge visuelle. Composition épurée, focus total sur la pureté du bijou.`,
  },
  "zanzibar": {
    label: "Zanzibar",
    porte: `Photo lifestyle minimaliste et élégante, lumière naturelle douce, femme portant une chemise blanche oversize, ambiance éditoriale moderne, cadrage rapproché sur les mains et poignets, pose naturelle et détendue, fond clair et épuré, profondeur de champ légère, tons chauds et lumineux, style premium, esthétique simple et raffinée, rendu photoréaliste, très peu d'accessoires, ambiance douce et féminine.`,
    ambiance: `Décor photo minimaliste blanc, formes organiques douces, lumière naturelle diffuse, ambiance luxe épurée, fond propre et aérien, quelques courbes inspirées des vagues, ombres légères, style studio premium, très peu d'accessoires, composition simple et élégante, rendu photoréaliste.`,
  },
  "beton": {
    label: "Béton",
    porte: `Editorial fashion lifestyle, femme élégante style urbain chic, top noir minimaliste, lumière douce et sombre, ambiance luxe moderne, accumulation de bijoux fins et audacieux, pose naturelle miroir ou cadrage rapproché, esthétique Pinterest premium, rendu cinématographique photoréaliste, fond discret et flou, style sophistiqué et tendance.`,
    porte_homme: `Editorial masculin minimaliste, lumière naturelle tamisée, ambiance moody et élégante, vêtements oversize texturés dans des tons terreux et neutres, cadrage focus mains et torse, esthétique luxe contemporaine, style urbain raffiné, rendu cinématographique photoréaliste, fond épuré sombre, attitude calme et confiante.`,
    ambiance: `Studio photo minimaliste sombre, textures métalliques organiques et sculptées à la main, inspiration roche brute et matière fondue, fond béton anthracite texturé, lumière cinématographique douce, ambiance luxe artisanale, esthétique moderne et minérale, rendu premium photoréaliste, composition sobre et élégante.`,
  },
  "pastel": {
    label: "Pastel",
    porte: `Photo lifestyle urbaine moderne, cadrage dynamique en perspective avec les poings tendus vers l'objectif, focus net sur les mains au premier plan et arrière-plan volontairement flou, profondeur de champ très faible avec bokeh doux, attitude confiante et playful, lumière naturelle douce légèrement cinématographique, ambiance streetwear minimaliste, hoodie oversize pastel, esthétique moderne et tendance, style éditorial Pinterest premium, composition immersive avec effet de profondeur, rendu photoréaliste, ombres douces, ambiance jeune et cool, focus principal sur les mains et les détails au premier plan, arrière-plan flou artistique.`,
    ambiance: `Photo macro produit haut de gamme, bague principale parfaitement nette et centrée au premier plan, arrière-plan composé uniquement d'anneaux colorés reprenant exactement la même couleur, la même texture, la même taille et la même largeur que l'anneau central de la bague principale, sans les bordures métalliques visibles. Les anneaux en arrière-plan sont disposés aléatoirement de façon naturelle et harmonieuse, certains debout, certains couchés, créant une composition organique et équilibrée. Profondeur de champ très faible avec arrière-plan fortement flou, bokeh doux et crémeux, focus ultra précis sur la bague centrale, lumière studio diffuse et chaleureuse, ambiance minimaliste premium, surface en bois clair naturel, style éditorial luxe moderne, rendu photoréaliste, éclairage cinématographique doux, objectif macro 85mm, f/2.8.`,
  },
  "in-the-mood-for": {
    label: "In the mood for",
    porte: `Photo lifestyle éditoriale moderne, belle femme bronzée, ongles manucurés forme amande avec French élégante, petit tatouage discret au doigt, poings tendus vers l'objectif devant le visage pour le cacher partiellement, focus ultra net sur les mains au premier plan, visage et arrière-plan fortement flous, profondeur de champ très faible avec bokeh doux et crémeux, lumière naturelle diffuse et chaleureuse, ambiance cosy et premium, vêtements doux beige nude, esthétique minimaliste et féminine, pose confiante et moderne, style Pinterest luxe, rendu photoréaliste, ombres délicates, cadrage immersif centré sur les mains, objectif portrait 85mm, ambiance douce et tendance.`,
    porte_homme: `Photo lifestyle éditoriale moderne, homme bronzé, poings tendus vers l'objectif devant le visage pour le cacher partiellement, focus ultra net sur les mains au premier plan, visage et arrière-plan fortement flous, profondeur de champ très faible avec bokeh doux et crémeux, lumière naturelle diffuse et chaleureuse, ambiance cosy et premium, vêtements doux beige nude, esthétique minimaliste, pose confiante et moderne, style Pinterest luxe, rendu photoréaliste, ombres délicates, cadrage immersif centré sur les mains, objectif portrait 85mm, ambiance douce et tendance. (Pas de manucure.)`,
    ambiance: `Photo produit lifestyle premium, décor minimaliste chaleureux et élégant, surface beige clair, arrière-plan textile crème légèrement flou, ambiance cozy et luxe moderne, lumière naturelle douce et chaude, ombres délicates, profondeur de champ très faible, style Pinterest éditorial, textures douces et raffinées, esthétique minimaliste féminine, composition épurée et harmonieuse, rendu photoréaliste, arrière-plan flou crémeux, ambiance soft luxury contemporaine.`,
  },
  "lifestyle": {
    label: "Lifestyle",
    porte: `Photo lifestyle spontanée prise à la main, main tendue vers le paysage ou l'environnement, focus naturel sur la main au premier plan avec arrière-plan vivant et immersif, ambiance authentique "daily life", lumière naturelle réelle, style photo souvenir premium, esthétique Pinterest lifestyle, cadrage simple et spontané comme une photo prise sur le moment avec smartphone, profondeur légère naturelle, environnement légèrement flou mais reconnaissable, rendu photoréaliste, ambiance voyage et moments de vie, composition décontractée et organique, lumière extérieure réaliste, style non studio, sensation de vrai instant capturé.`,
    ambiance: `Photo naturelle non studio, lumière du jour réelle, décor vivant en arrière-plan, ambiance spontanée et authentique, rendu simple et réaliste, style souvenir de voyage.`,
  },
  "terre-dombre": {
    label: "Terre d'ombre",
    porte: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
    ambiance: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
  },
  "riviera": {
    label: "Riviera",
    porte: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
    ambiance: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
  },
  "black-joaillerie": {
    label: "Black Joaillerie",
    porte: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
    ambiance: `(Prompt FR original non retrouvé dans archives — à fournir par Amila si besoin)`,
  },
};

export async function GET() {
  const liste = Object.entries(PROMPTS_FR_AMILA).map(([key, p]) => ({
    key,
    label: p.label,
    porte: p.porte,
    ambiance: p.ambiance,
    porte_homme: p.porte_homme || null,
  }));
  return NextResponse.json({ themes: liste });
}
