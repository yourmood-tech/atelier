export type QuestionType = "single" | "multi" | "text" | "longtext" | "contact";

export type Option = {
  value: string;
  label: string;
  emoji?: string;
  color?: string;
};

export type Question = {
  id: string;
  bloc: number;
  blocTitle: string;
  type: QuestionType;
  question: string;
  hint?: string;
  options?: Option[];
  placeholder?: string;
  optional?: boolean;
};

export const BLOCS = [
  { num: 1, title: "Toi & ton histoire mood", emoji: "🌸" },
  { num: 2, title: "Ta compo actuelle", emoji: "💍" },
  { num: 3, title: "Tes envies nouveautés", emoji: "✨" },
  { num: 4, title: "Les coffrets", emoji: "🎁" },
  { num: 5, title: "La joaillerie", emoji: "💎" },
  { num: 6, title: "Ta pépite rêvée", emoji: "💌" },
];

export const QUESTIONS: Question[] = [
  // BLOC 1 — Toi & ton histoire mood
  {
    id: "anciennete",
    bloc: 1,
    blocTitle: "Toi & ton histoire mood",
    type: "single",
    question: "Depuis quand es-tu une moodeuse ❤️ ?",
    options: [
      { value: "decouvre", label: "Je découvre tout juste", emoji: "🌱" },
      { value: "moins1", label: "Moins d'un an", emoji: "🌸" },
      { value: "1a3", label: "Entre 1 et 3 ans", emoji: "💫" },
      { value: "3a5", label: "Entre 3 et 5 ans", emoji: "✨" },
      { value: "plus5", label: "Plus de 5 ans (fidèle 💎)", emoji: "👑" },
    ],
  },
  {
    id: "nombre_bagues",
    bloc: 1,
    blocTitle: "Toi & ton histoire mood",
    type: "single",
    question: "Combien de bagues mood as-tu (à peu près) ?",
    hint: "Pas besoin d'aller les compter — au feeling 😉",
    options: [
      { value: "1a3", label: "1 à 3", emoji: "🤍" },
      { value: "4a7", label: "4 à 7", emoji: "💕" },
      { value: "8a15", label: "8 à 15", emoji: "🩵" },
      { value: "15plus", label: "Plus de 15", emoji: "💎" },
      { value: "perdu_compte", label: "J'ai perdu le compte 😄", emoji: "🌹" },
    ],
  },
  {
    id: "frequence",
    bloc: 1,
    blocTitle: "Toi & ton histoire mood",
    type: "single",
    question: "Tu portes mood plutôt...",
    options: [
      { value: "quotidien", label: "Au quotidien, sans y penser", emoji: "☀️" },
      { value: "occasions", label: "Pour les occasions spéciales", emoji: "🥂" },
      { value: "mood_du_jour", label: "Les deux, selon mon mood du jour", emoji: "🦋" },
    ],
  },
  {
    id: "occasions_preferees",
    bloc: 1,
    blocTitle: "Toi & ton histoire mood",
    type: "multi",
    question: "Tes occasions préférées pour porter mood ✨",
    hint: "Plusieurs réponses possibles",
    options: [
      { value: "bureau", label: "Au bureau", emoji: "💼" },
      { value: "weekend", label: "Le weekend", emoji: "🌿" },
      { value: "sport", label: "Au sport", emoji: "🏃‍♀️" },
      { value: "soiree", label: "En soirée", emoji: "🥂" },
      { value: "voyage", label: "En voyage", emoji: "✈️" },
      { value: "mariage", label: "Pour les mariages", emoji: "💒" },
      { value: "anniversaire", label: "Pour mon anniversaire", emoji: "🎂" },
      { value: "fete_meres", label: "Fête des mères", emoji: "🌹" },
      { value: "cadeau_soi", label: "Quand je m'offre un cadeau", emoji: "💝" },
    ],
  },

  // BLOC 2 — Ta compo actuelle
  {
    id: "matieres_possedees",
    bloc: 2,
    blocTitle: "Ta compo actuelle",
    type: "multi",
    question: "Quelles matières as-tu déjà dans ta compo ?",
    hint: "Coche tout ce que tu possèdes",
    options: [
      { value: "acier", label: "Acier", emoji: "⚙️" },
      { value: "titane", label: "Titane", emoji: "✨" },
      { value: "argent", label: "Argent 925", emoji: "🤍" },
      { value: "or_rose", label: "Or rose", emoji: "🌹" },
      { value: "or_jaune", label: "Or jaune", emoji: "☀️" },
      { value: "or_gris", label: "Or gris", emoji: "💎" },
      { value: "ceramique", label: "Céramique noire", emoji: "🖤" },
      { value: "tantale", label: "Tantale", emoji: "🩶" },
      { value: "alu_couleur", label: "Aluminium coloré", emoji: "🌈" },
      { value: "carbone", label: "Carbone", emoji: "⚫" },
    ],
  },
  {
    id: "largeur",
    bloc: 2,
    blocTitle: "Ta compo actuelle",
    type: "single",
    question: "Ta largeur préférée ?",
    options: [
      { value: "xs", label: "XS — 9mm, fine et délicate", emoji: "🤍" },
      { value: "s", label: "S — 11mm, l'équilibre parfait", emoji: "💕" },
      { value: "l", label: "L — 13mm, statement", emoji: "💫" },
      { value: "melange", label: "Je mélange tout, c'est ça le clic mood", emoji: "🦋" },
    ],
  },
  {
    id: "nb_addons",
    bloc: 2,
    blocTitle: "Ta compo actuelle",
    type: "single",
    question: "Combien d'addons en moyenne sur ta base ?",
    options: [
      { value: "1", label: "1 — minimaliste", emoji: "🤍" },
      { value: "2", label: "2 — équilibrée", emoji: "💕" },
      { value: "3", label: "3 — gourmande", emoji: "✨" },
      { value: "4plus", label: "4 et plus — j'assume 😄", emoji: "💎" },
      { value: "varie", label: "Ça varie selon mon mood", emoji: "🌸" },
    ],
  },
  {
    id: "style",
    bloc: 2,
    blocTitle: "Ta compo actuelle",
    type: "single",
    question: "Ton style mood, c'est plutôt...",
    options: [
      { value: "minimal", label: "Minimal & épuré", emoji: "🤍" },
      { value: "eclat", label: "Éclat & lumière", emoji: "✨" },
      { value: "colore", label: "Coloré & joyeux", emoji: "🌈" },
      { value: "mystere", label: "Mystère & rebelle", emoji: "🖤" },
      { value: "romantique", label: "Romantique & poétique", emoji: "🌹" },
      { value: "mix", label: "Un mix de tout selon les jours", emoji: "🦋" },
    ],
  },
  {
    id: "matiere_manquante",
    bloc: 2,
    blocTitle: "Ta compo actuelle",
    type: "text",
    question: "Une matière ou couleur qui te manque dans ta compo ?",
    placeholder: "Ex : un bleu nuit profond, du tantale, une céramique colorée...",
    optional: true,
  },

  // BLOC 3 — Tes envies nouveautés
  {
    id: "nouvelle_pepite",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "single",
    question: "Si on créait UNE nouvelle pépite, ça serait plutôt...",
    options: [
      { value: "or_massif", label: "Une pièce en or massif", emoji: "👑" },
      { value: "ceram_couleur", label: "Une céramique colorée inédite", emoji: "🌈" },
      { value: "pierres", label: "Une pièce avec pierres précieuses", emoji: "💎" },
      { value: "matiere_surprise", label: "Une matière qu'on n'a jamais vue", emoji: "✨" },
      { value: "addon_original", label: "Un addon vraiment original", emoji: "🦋" },
      { value: "collab", label: "Une collab avec une artiste", emoji: "🎨" },
    ],
  },
  {
    id: "couleurs_vibrent",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "multi",
    question: "Les couleurs qui te font vibrer en ce moment 🩵",
    hint: "Coche tes 3-5 préférées",
    options: [
      { value: "blanc_neige", label: "Blanc neige", color: "#FFFFFF" },
      { value: "crème", label: "Crème nacré", color: "#F5E6D3" },
      { value: "rose_poudre", label: "Rose poudré", color: "#E8C5B5" },
      { value: "rouge_passion", label: "Rouge passion", color: "#C73E3E" },
      { value: "rose_fuchsia", label: "Fuchsia", color: "#D63384" },
      { value: "orange_corail", label: "Corail", color: "#FF7F50" },
      { value: "jaune_soleil", label: "Jaune soleil", color: "#F4C430" },
      { value: "vert_emeraude", label: "Vert émeraude", color: "#2E8B57" },
      { value: "vert_menthe", label: "Vert menthe", color: "#98D8C1" },
      { value: "bleu_ciel", label: "Bleu ciel", color: "#87CEEB" },
      { value: "bleu_nuit", label: "Bleu nuit", color: "#1B2951" },
      { value: "violet", label: "Violet améthyste", color: "#9966CC" },
      { value: "noir", label: "Noir profond", color: "#0A0A0A" },
      { value: "gris_perle", label: "Gris perle", color: "#C0C0C0" },
    ],
  },
  {
    id: "pierres_revees",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "multi",
    question: "Les pierres qui te font rêver 💎",
    hint: "Plusieurs choix possibles",
    options: [
      { value: "diamant", label: "Diamant", emoji: "💎" },
      { value: "saphir", label: "Saphir bleu", emoji: "🔵" },
      { value: "saphir_rose", label: "Saphir rose", emoji: "🌸" },
      { value: "rubis", label: "Rubis", emoji: "❤️" },
      { value: "emeraude", label: "Émeraude", emoji: "💚" },
      { value: "topaze", label: "Topaze London Blue", emoji: "🩵" },
      { value: "peridot", label: "Péridot", emoji: "🍀" },
      { value: "amethyste", label: "Améthyste", emoji: "💜" },
      { value: "opale", label: "Opale", emoji: "🤍" },
      { value: "perle", label: "Perle", emoji: "🌕" },
      { value: "morganite", label: "Morganite", emoji: "🌹" },
      { value: "tanzanite", label: "Tanzanite", emoji: "💙" },
    ],
  },
  {
    id: "finition",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "single",
    question: "Ta finition préférée ?",
    options: [
      { value: "poli", label: "Poli miroir, éclat maximum", emoji: "✨" },
      { value: "mat", label: "Mat, doux et discret", emoji: "🤍" },
      { value: "brosse", label: "Brossé, texturé", emoji: "🌿" },
      { value: "satine", label: "Satiné, élégant", emoji: "💫" },
      { value: "martele", label: "Martelé, caractère", emoji: "🪨" },
      { value: "mix", label: "Un mix selon les pièces", emoji: "🦋" },
    ],
  },
  {
    id: "sertissage",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "single",
    question: "Les pierres serties sur tes bagues...",
    options: [
      { value: "adore", label: "J'adore, plus il y en a mieux c'est", emoji: "💎" },
      { value: "discret", label: "Oui mais discret et délicat", emoji: "✨" },
      { value: "couleur", label: "Oui surtout les pierres colorées", emoji: "🌈" },
      { value: "non", label: "Non, je préfère sans pierres", emoji: "🤍" },
      { value: "depend", label: "Ça dépend de mon mood", emoji: "🦋" },
    ],
  },
  {
    id: "pepite_inedite",
    bloc: 3,
    blocTitle: "Tes envies nouveautés",
    type: "longtext",
    question: "La pépite qu'on n'a pas encore créée et qui te ferait craquer ?",
    hint: "Décris-la nous, même en quelques mots, on lit tout 🌸",
    placeholder: "Ex : un addon avec une pierre en forme de cœur, une base bicolore or rose et or gris, une collection inspirée des étoiles...",
    optional: true,
  },

  // BLOC 4 — Les coffrets
  {
    id: "coffret_achete",
    bloc: 4,
    blocTitle: "Les coffrets",
    type: "single",
    question: "Tu as déjà acheté un coffret mood ?",
    options: [
      { value: "oui_moi", label: "Oui, pour moi", emoji: "🎁" },
      { value: "oui_cadeau", label: "Oui, en cadeau", emoji: "💝" },
      { value: "oui_les_deux", label: "Oui, pour moi ET en cadeau", emoji: "✨" },
      { value: "non_interesse", label: "Non, mais ça m'intéresse", emoji: "🌸" },
      { value: "non_jamais", label: "Non, et pas mon truc", emoji: "🤍" },
    ],
  },
  {
    id: "coffret_pour_qui",
    bloc: 4,
    blocTitle: "Les coffrets",
    type: "multi",
    question: "À qui penses-tu d'abord pour offrir un coffret mood ?",
    hint: "Plusieurs réponses possibles",
    options: [
      { value: "maman", label: "Maman", emoji: "🌹" },
      { value: "soeur", label: "Une sœur", emoji: "💕" },
      { value: "amie", label: "Ma meilleure amie", emoji: "🫶🏼" },
      { value: "partenaire", label: "Mon ou ma partenaire", emoji: "❤️" },
      { value: "fille", label: "Ma fille", emoji: "🌸" },
      { value: "belle_mere", label: "Ma belle-mère", emoji: "💐" },
      { value: "collegue", label: "Une collègue chère", emoji: "🌿" },
      { value: "moi", label: "Moi-même 💝", emoji: "✨" },
    ],
  },
  {
    id: "coffret_occasion",
    bloc: 4,
    blocTitle: "Les coffrets",
    type: "multi",
    question: "Pour quelles occasions tu offrirais un coffret ?",
    options: [
      { value: "noel", label: "Noël", emoji: "🎄" },
      { value: "saint_valentin", label: "Saint-Valentin", emoji: "❤️" },
      { value: "fete_meres", label: "Fête des mères", emoji: "🌹" },
      { value: "anniversaire", label: "Un anniversaire", emoji: "🎂" },
      { value: "mariage", label: "Un mariage", emoji: "💒" },
      { value: "naissance", label: "Une naissance", emoji: "🌸" },
      { value: "diplome", label: "Un diplôme / réussite", emoji: "🎓" },
      { value: "juste_parce_que", label: "Juste parce que", emoji: "✨" },
    ],
  },
  {
    id: "coffret_budget",
    bloc: 4,
    blocTitle: "Les coffrets",
    type: "single",
    question: "Budget idéal pour un coffret cadeau ?",
    options: [
      { value: "moins60", label: "Moins de 60 CHF", emoji: "🤍" },
      { value: "60_100", label: "60 à 100 CHF", emoji: "💕" },
      { value: "100_150", label: "100 à 150 CHF", emoji: "🌸" },
      { value: "150_250", label: "150 à 250 CHF", emoji: "✨" },
      { value: "250plus", label: "250 CHF et plus", emoji: "💎" },
      { value: "depend", label: "Ça dépend de la personne", emoji: "🦋" },
    ],
  },
  {
    id: "coffret_compo",
    bloc: 4,
    blocTitle: "Les coffrets",
    type: "single",
    question: "La compo idéale d'un coffret, pour toi ?",
    options: [
      { value: "base_2addons", label: "1 base + 2 addons", emoji: "🎁" },
      { value: "base_3_5", label: "1 base + 3 à 5 addons", emoji: "✨" },
      { value: "mini_collection", label: "Une mini collection thématique", emoji: "🌸" },
      { value: "trio", label: "Un trio cohérent (collier + bague + boucles)", emoji: "💎" },
      { value: "surprise", label: "Une surprise box mystère", emoji: "🦋" },
      { value: "personnalise", label: "Quelque chose de personnalisé au prénom", emoji: "💌" },
    ],
  },

  // BLOC 5 — La joaillerie
  {
    id: "joaillerie_position",
    bloc: 5,
    blocTitle: "La joaillerie",
    type: "single",
    question: "La joaillerie haute (or massif, vraies pierres précieuses, 500.- et +) 💎",
    options: [
      { value: "deja_achete", label: "J'en ai déjà acheté", emoji: "👑" },
      { value: "reve", label: "J'en rêve depuis longtemps", emoji: "✨" },
      { value: "regarde", label: "Je regarde mais c'est cher", emoji: "🌸" },
      { value: "pas_pour_moi", label: "Pas vraiment pour moi", emoji: "🤍" },
    ],
  },
  {
    id: "joaillerie_occasion",
    bloc: 5,
    blocTitle: "La joaillerie",
    type: "multi",
    question: "Pour quelles occasions tu envisagerais une pièce joaillerie ?",
    options: [
      { value: "fiancailles", label: "Fiançailles", emoji: "💍" },
      { value: "anniv_mariage", label: "Anniversaire de mariage", emoji: "💒" },
      { value: "transmission", label: "Transmission (héritage à offrir)", emoji: "👑" },
      { value: "naissance", label: "Naissance d'un enfant", emoji: "🌸" },
      { value: "cadeau_soi", label: "Un cadeau à moi-même", emoji: "💝" },
      { value: "celebration", label: "Une célébration importante", emoji: "🥂" },
      { value: "juste_beau", label: "Juste parce que c'est beau", emoji: "✨" },
    ],
  },
  {
    id: "joaillerie_piece",
    bloc: 5,
    blocTitle: "La joaillerie",
    type: "single",
    question: "La pièce joaillerie qui te fait rêver ?",
    options: [
      { value: "solitaire", label: "Un solitaire diamant", emoji: "💎" },
      { value: "alliance", label: "Une alliance en or massif", emoji: "👑" },
      { value: "pendentif", label: "Un pendentif unique", emoji: "✨" },
      { value: "boucles", label: "Des boucles précieuses", emoji: "🌸" },
      { value: "bague_joaillerie", label: "Une bague joaillerie mood", emoji: "💍" },
      { value: "bracelet", label: "Un bracelet en or", emoji: "🩷" },
      { value: "parure", label: "Une parure complète", emoji: "🦋" },
    ],
  },
  {
    id: "piece_unique",
    bloc: 5,
    blocTitle: "La joaillerie",
    type: "single",
    question: "Une pièce unique, créée rien que pour toi, ça te tente ?",
    options: [
      { value: "absolument", label: "Oui absolument, c'est mon rêve", emoji: "✨" },
      { value: "si_pas_cher", label: "Oui, si le prix reste raisonnable", emoji: "💕" },
      { value: "peut_etre", label: "Peut-être, à voir le projet", emoji: "🌸" },
      { value: "collection", label: "Non, je préfère les collections", emoji: "🤍" },
    ],
  },

  // BLOC 6 — Ta pépite rêvée + cadeau
  {
    id: "piece_revee",
    bloc: 6,
    blocTitle: "Ta pépite rêvée",
    type: "longtext",
    question: "Décris-nous la pièce mood de tes rêves 💌",
    hint: "Imagine qu'on peut la créer pour toi. Qu'est-ce que ce serait ? Pas besoin d'être précise, juste ce qui te vient.",
    placeholder: "Ex : une bague qui change de couleur selon la lumière, une compo qui raconte mon histoire, un coffret avec ma pierre de naissance...",
    optional: true,
  },
  {
    id: "contact",
    bloc: 6,
    blocTitle: "Ta pépite rêvée",
    type: "contact",
    question: "Ton prénom et ton email pour recevoir ton bon 20.- ✨",
    hint: "On t'envoie ton code par email tout de suite — promis, zéro spam, juste les pépites créatives.",
  },
];
