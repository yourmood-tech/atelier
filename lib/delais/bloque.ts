// Qui empêche de donner une date ? (décision Philippe 03.11.2026 : le tableau blanc des délais est
// tenu PAR FOURNISSEUR). Règle pure, partagée par la rédaction des brouillons et la page /delais.
// null = une date fiable existe (colis parti, pièce arrivée, date Icelea à venir, estimation valable).
export const BOITES = "Boîtes de rangement";
export const INCONNU = "Fournisseur inconnu";

type F = {
  statut: string; boites?: string[];
  iceleaArrivee?: unknown; iceleaLivraison?: string | null;
  iceleaPO?: unknown; iceleaEnRoute?: { depassee: boolean } | null;
  estimation?: { fournisseur: string; depassee: boolean } | null;
};

export function fournisseurBloquant(f: F | null | undefined): string | null {
  if (!f || f.statut === "expediee" || f.statut === "annulee" || f.statut === "introuvable") return null;
  if (f.boites?.length) return BOITES;
  if (f.iceleaArrivee) return null;
  if (f.iceleaEnRoute?.depassee) return "Icelea";
  if (f.iceleaPO && !f.iceleaLivraison && !f.iceleaEnRoute) return "Icelea";
  if (f.iceleaLivraison) return null;
  if (f.estimation) return f.estimation.depassee ? f.estimation.fournisseur : null;
  return INCONNU;
}
