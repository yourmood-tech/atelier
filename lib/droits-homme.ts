// Collection « Droits de l'Homme » 2026 : textes et formats des 30 articles.
// Ces textes ne sortent par l'adresse publique QUE pour les articles déjà en vente (surprise gardée).
export const ARTICLES: Record<number, { titre: string; sens: string; format?: string }> = {
  1: { titre: "Libres et égaux", sens: "Tous les êtres humains naissent libres et égaux en dignité et en droits.", format: "addon" },
  2: { titre: "Sans aucune distinction", sens: "Chacun a les mêmes droits, quelles que soient sa couleur, son sexe, sa langue, sa religion ou son origine.", format: "addon" },
  3: { titre: "Vie, liberté, sûreté", sens: "Tout individu a droit à la vie, à la liberté et à la sûreté de sa personne.", format: "deux tiers" },
  4: { titre: "Contre l'esclavage", sens: "Nul ne sera tenu en esclavage ni en servitude.", format: "deux tiers" },
  5: { titre: "Contre la torture", sens: "Nul ne sera soumis à la torture, ni à des peines ou traitements cruels, inhumains ou dégradants.", format: "addon" },
  6: { titre: "Reconnu partout", sens: "Chacun a le droit d'être reconnu partout comme une personne devant la loi.", format: "addon" },
  7: { titre: "Égaux devant la loi", sens: "Tous sont égaux devant la loi et ont droit à une égale protection de la loi.", format: "deux tiers" },
  8: { titre: "Le droit d'être défendu", sens: "Toute personne a droit à un recours effectif devant les tribunaux si ses droits sont violés.", format: "deux tiers" },
  9: { titre: "Contre l'arrestation arbitraire", sens: "Nul ne peut être arbitrairement arrêté, détenu ni exilé.", format: "addon" },
  10: { titre: "Un procès équitable", sens: "Toute personne a droit à ce que sa cause soit entendue équitablement par un tribunal indépendant et impartial.", format: "deux tiers" },
  11: { titre: "Présumé innocent", sens: "Toute personne accusée est présumée innocente jusqu'à ce que sa culpabilité soit légalement prouvée.", format: "addon" },
  12: { titre: "La vie privée", sens: "Nul ne sera l'objet d'immixtions arbitraires dans sa vie privée, sa famille, son domicile ou sa correspondance.", format: "deux tiers" },
  13: { titre: "Libre de circuler", sens: "Toute personne a le droit de circuler librement, de quitter tout pays, y compris le sien, et d'y revenir.", format: "deux tiers" },
  14: { titre: "Le droit d'asile", sens: "Devant la persécution, toute personne a le droit de chercher asile dans d'autres pays.", format: "deux tiers" },
  15: { titre: "Une nationalité", sens: "Tout individu a droit à une nationalité, et nul ne peut en être arbitrairement privé.", format: "addon" },
  16: { titre: "Se marier, fonder une famille", sens: "L'homme et la femme ont le droit de se marier librement et de fonder une famille, protégée par la société.", format: "deux tiers" },
  17: { titre: "La propriété", sens: "Toute personne a droit à la propriété, et nul ne peut en être arbitrairement privé." },
  18: { titre: "Pensée, conscience, religion", sens: "Toute personne a droit à la liberté de pensée, de conscience et de religion." },
  19: { titre: "Opinion et expression", sens: "Tout individu a droit à la liberté d'opinion et d'expression, sans être inquiété pour ses opinions." },
  20: { titre: "Se réunir librement", sens: "Toute personne a droit à la liberté de réunion et d'association pacifiques." },
  21: { titre: "Choisir ses dirigeants", sens: "Toute personne a le droit de prendre part à la direction de son pays ; la volonté du peuple s'exprime par des élections libres." },
  22: { titre: "La sécurité sociale", sens: "Toute personne a droit à la sécurité sociale et aux droits indispensables à sa dignité." },
  23: { titre: "Le travail", sens: "Toute personne a droit au travail, à des conditions justes et à un salaire égal pour un travail égal." },
  24: { titre: "Le repos et les loisirs", sens: "Toute personne a droit au repos, aux loisirs et à des congés payés." },
  25: { titre: "Une vie digne", sens: "Toute personne a droit à un niveau de vie suffisant : nourriture, logement, soins." },
  26: { titre: "L'éducation", sens: "Toute personne a droit à l'éducation, gratuite au moins pour l'enseignement élémentaire." },
  27: { titre: "La culture et les arts", sens: "Toute personne a le droit de prendre part à la vie culturelle, de jouir des arts et du progrès scientifique." },
  28: { titre: "Un monde où ces droits vivent", sens: "Toute personne a droit à un ordre, dans son pays et dans le monde, où ces droits peuvent être pleinement réalisés." },
  29: { titre: "Nos devoirs", sens: "Chacun a des devoirs envers la communauté ; nos libertés s'arrêtent là où commencent celles des autres." },
  30: { titre: "Rien ne peut les effacer", sens: "Aucune disposition de cette Déclaration ne peut être utilisée pour détruire les droits et libertés qu'elle énonce." },
};

// Dessins (noms imprévisibles : impossible de deviner l'adresse d'un article encore scellé)
export const DESSINS: Record<number, string> = {
  1: "bande_01-78c672f477.jpg",
  2: "bande_02-15931e38a0.jpg",
  3: "bande_03-26874c9b3c.jpg",
  4: "bande_04-5f920b1543.jpg",
  5: "bande_05-2b2e46aa44.jpg",
  6: "bande_06-339dd02962.jpg",
  7: "bande_07-25d8a42ca8.jpg",
  8: "bande_08-0ce3af749f.jpg",
  9: "bande_09-ab353f2fbe.jpg",
  10: "bande_10-4c153d2edd.jpg",
  11: "bande_11-fdb589c04a.jpg",
  12: "bande_12-fcfb349839.jpg",
  13: "bande_13-4878c4ba62.jpg",
  14: "bande_14-faa565f683.jpg",
  15: "bande_15-698c0682b2.jpg",
  16: "bande_16-d5e6c1f2ff.jpg",
  17: "bande_17-72ce8d2216.jpg",
  18: "bande_18-ba29cd3e4f.jpg",
  19: "bande_19-417c82092b.jpg",
  20: "bande_20-06466a2652.jpg",
  21: "bande_21-73e8178b84.jpg",
  22: "bande_22-a347519139.jpg",
  23: "bande_23-922a329376.jpg",
  24: "bande_24-3f1a8c14e0.jpg",
  25: "bande_25-2a37cd53b6.jpg",
  26: "bande_26-3580b1f20e.jpg",
  27: "bande_27-61419fc2d3.jpg",
};

// Récit d'Amila affiché (tapé) à côté de l'addon du jour. **mot** = en gras. Paragraphes séparés par une ligne vide.
export const RECITS: Record<number, string> = {
  1: `Aujourd’hui, j’aimerais vous présenter l’**article 1** de la Déclaration universelle des droits de l’homme.

« Tous les êtres humains naissent **LIBRES** et **ÉGAUX** en dignité et en droits. »

Pour représenter cet article, j’ai imaginé un design composé de plusieurs **silhouettes humaines**. Des silhouettes différentes, qui peuvent représenter **tout le monde**, n’importe qui, **sans distinction**.

Elles se tiennent toutes debout sur un **symbole d’égalité**, qui fait le tour de l’add-on. Ce symbole est la base du dessin : peu importe qui nous sommes, nous sommes **tous égaux en droits**.

Le choix des pierres a également une signification particulière. J’ai sélectionné des **saphirs roses, bruns et orange**, ainsi que des **diamants blancs et noirs**.

Ces différentes nuances évoquent la **diversité** des couleurs de peau et des origines humaines. Chaque pierre est différente, mais toutes ont **la même place** et **la même importance** dans le bijou.

L’idée est simple : nous sommes tous **DIFFÉRENTS**, mais nous naissons tous **LIBRES ET ÉGAUX EN DROITS**.`,
};
