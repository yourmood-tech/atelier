// Compteur anti-saturation — règles décidées par Philippe le 12.11.2026 (Mood Cash Engine, étage 1).
// Ce qui compte : newsletters, relances automatiques à but commercial, WhatsApp publicitaires, push, SMS,
// messages « 1 à 1 » des gérantes (ce sont des campagnes Klaviyo).
// Ce qui ne compte pas : réponses du service client (Gorgias par email = hors Klaviyo ; WhatsApp
// « conversation » = réponses Gorgias passant par Klaviyo) et messages de service (paiement, fabrication, devis).

export const BUDGET = { hebdo: 2, normale: 5, addict: 10, superAddict: 14 } as const;
export type Profil = keyof typeof BUDGET;

// Addict = a cliqué dans un message sur au moins N jours différents en 90 jours, sans désinscription ni plainte.
export const SEUIL_ADDICT = 13;
export const SEUIL_SUPER_ADDICT = 26;
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

// Inscrites qui ont choisi « une newsletter par semaine » : budget 2, jamais addict.
export const SEGMENTS_HEBDO = ["YiANYi"]; // propriété send-frequency = oneperweek (FR + DE)
export const LISTES_HEBDO = ["UfzzhQ", "Tb8B4v"]; // « 1_fois_par_semaine », « Une fois par semaine »

export function profilDe(o: { hebdo: boolean; joursClic: number; desabonnee: boolean }): Profil {
  if (o.hebdo) return "hebdo";
  if (o.desabonnee) return "normale";
  if (o.joursClic >= SEUIL_SUPER_ADDICT) return "superAddict";
  if (o.joursClic >= SEUIL_ADDICT) return "addict";
  return "normale";
}

// Un message reçu compte-t-il ? (propriétés de l'événement Klaviyo)
export function compte(mesure: string, p: Record<string, unknown>): boolean {
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
