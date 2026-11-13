import { createHash } from "crypto";
// Groupe témoin du Mood Cash Engine (décision Philippe 13.11.2026) : 5 % des personnes, tirées une fois pour toutes
// par une règle fixe sur l'adresse email (même adresse → toujours le même résultat, aussi pour les nouvelles venues).
// Elles reçoivent tout comme avant (newsletters comprises) SAUF les messages des nouveaux moteurs (pépites ciblées,
// retours en stock, deuxième commande, listes des vendeuses) → on compare leurs achats avec les autres pour mesurer le gain.
// Marques : Klaviyo groupe_temoin=true (+ groupe_temoin_depuis) ; Shopify étiquette « groupe-temoin ».
export function estTemoin(email: string): boolean {
  const h = createHash("sha256").update("mood-temoin-2026|" + email.trim().toLowerCase()).digest("hex");
  return parseInt(h.slice(0, 8), 16) % 100 < 5;
}
