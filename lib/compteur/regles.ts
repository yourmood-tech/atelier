// Compteur anti-saturation — règles décidées par Philippe le 12.11.2026 (Mood Cash Engine, étage 1),
// revues avec Stéphanie le 14.11.2026 :
// Ce qui compte : seulement ce qu'un humain décide d'envoyer = newsletters (campagnes email, WhatsApp, SMS, push)
// et messages « 1 à 1 » des gérantes (campagnes Klaviyo + emails des adresses boutiques envoyés depuis la fiche Shopify). Les messages automatiques (flows : relances panier,
// produit vu, anniversaire, fabrication, paiement…) ne comptent plus. Réponses du service client : jamais.
// Plafond : 5 par semaine ; « une newsletter par semaine » : 2 ; sans plafond : grandes cliqueuses (≥ 13 jours
// de clic en 90 j) + liste du jour « sans plafond » (vraies ouvertures + commandes, voir libres.ts).
// Les newsletters qui sautent quand le plafond est atteint = au hasard du calendrier (choix assumé le 14.11).

export const SANS_PLAFOND = 999;
export const BUDGET = { hebdo: 2, normale: 5, sansPlafond: SANS_PLAFOND } as const;
export type Profil = keyof typeof BUDGET;

// Grande cliqueuse = a cliqué dans un message sur au moins N jours différents en 90 jours, sans désinscription ni plainte.
export const SEUIL_ADDICT = 13;
export const JOURS_PROFIL = 90;
export const JOURS_FENETRE = 7;

// Mesures Klaviyo (compte Mood Collection SA).
export const M = {
  recuEmail: "NevzXL",
  recuWhatsapp: "R4jCCz",
  recuSms: "UKYdx8",
  recuPush: "SXyk2D",
  clic: "NpL6Ey",
  desinscription: "XENhsD",
  spam: "HtiHPB",
} as const;
export const MESURES_RECU = [M.recuEmail, M.recuWhatsapp, M.recuSms, M.recuPush] as const;
export const MESURES_SIGNAUX = [M.clic, M.desinscription, M.spam] as const;

// Relances automatiques de service : jamais comptées. Liste revue le 12.11.2026 sur les relances actives.
export const RELANCES_DE_SERVICE = new Set([
  "J7pmTj", // Paid Orders Virement
  "NpRKAz", // Paid Orders BVR
  "T5ihhf", // Production-Step-Started
  "TNLM2p", // Production-Step-Completed
  "TiaJSe", // Production-Back-Order
  "Wcyqz3", // Envoi-devis
  "RsHspJ", // Père Noël – envoi du bon cadeau (carte grattée)
  "UZWuYa", // Concours Run Mate — alerte interne (Stéphanie)
  "S4J2L3", // CNIL FR
]);

// Inscrites qui ont choisi « une newsletter par semaine » : budget 2, même si elles sont très actives (leur choix).
export const SEGMENTS_HEBDO = ["YiANYi"]; // propriété send-frequency = oneperweek (FR + DE)
export const LISTES_HEBDO = ["UfzzhQ", "Tb8B4v"]; // « 1_fois_par_semaine », « Une fois par semaine »

export function profilDe(o: { hebdo: boolean; joursClic: number; desabonnee: boolean; libre?: boolean }): Profil {
  if (o.hebdo) return "hebdo"; // elle a choisi une newsletter par semaine : on respecte son choix
  if (o.desabonnee) return "normale";
  if (o.joursClic >= SEUIL_ADDICT || o.libre) return "sansPlafond";
  return "normale";
}

// Un message reçu compte-t-il ? (propriétés de l'événement Klaviyo)
export function compte(mesure: string, p: Record<string, unknown>): boolean {
  if (p["$flow"]) return false; // message automatique : ne compte plus (décision du 14.11.2026)
  if (mesure === M.recuWhatsapp) {
    if (String(p["Message Type"] ?? "").toLowerCase() === "conversation") return false;
    if (String(p["Content Type"] ?? "").toLowerCase() === "service") return false;
    return true;
  }
  if (mesure === M.recuEmail) {
    const flow = String(p["$flow"] ?? "");
    if (flow && RELANCES_DE_SERVICE.has(flow)) return false;
    return true;
  }
  return true;
}

// Jour suisse (AAAA-MM-JJ) d'un instant.
const FORMAT_JOUR = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }); // créé une seule fois (lent à créer)
export function jourSuisse(iso: string | Date): string {
  return FORMAT_JOUR.format(typeof iso === "string" ? new Date(iso) : iso);
}
export function joursAvant(n: number, depuis = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(jourSuisse(new Date(depuis.getTime() - i * 86400000)));
  return out;
}
