// Réassort boutique — partie commune à la page et au serveur (aucun accès extérieur ici).
// pretes = pièces prêtes à partir selon le calcul de nuit (null = article pas suivi par ce calcul)
export type TailleDispo = { taille: string; variantId: number; sku: string; pretes: number | null };

// délai habituel, mêmes mots que sur les fiches du site
export function delai(pretes: number | null, quantite = 1): { texte: string; couleur: "vert" | "orange" | "gris" } {
  if (pretes == null) return { texte: "délai : à confirmer par l'atelier", couleur: "gris" };
  if (pretes >= quantite) return { texte: "prête à partir — environ 72 h", couleur: "vert" };
  if (pretes > 0) return { texte: `${pretes} prête(s) sous 72 h, le reste fabriqué — environ 4 semaines`, couleur: "orange" };
  return { texte: "fabriquée pour toi — environ 4 semaines", couleur: "orange" };
}
export type Candidat = { productId: number; titre: string; image: string | null; tailles: TailleDispo[]; sansTaille: boolean; alerte: string | null };
export type Demande = {
  texte: string; recherche: string; tailles: number[] | null; taille_min: number | null; taille_max: number | null;
  quantite_par_taille: number | null; quantite_totale: number | null;
};
export type Proposition = {
  texte: string; recherche: string; demande: Demande; candidats: Candidat[]; choisi: number | null;
  quantites: Record<string, number>; remarque: string | null;
};

export const tailleDe = (v: string): number | null => {
  const m = v.match(/(\d{2})/);
  const n = m ? Number(m[1]) : NaN;
  return n >= 40 && n <= 80 ? n : null;
};

// tailles et quantités proposées pour un article donné, à partir de ce que la vendeuse a dit
export function repartir(c: Candidat, d: Demande): { quantites: Record<string, number>; remarque: string | null } {
  const q: Record<string, number> = {};
  if (c.sansTaille) {
    q[c.tailles[0]?.taille ?? "—"] = d.quantite_totale ?? d.quantite_par_taille ?? 1;
    return { quantites: q, remarque: null };
  }
  let cibles: TailleDispo[] = [];
  if (d.tailles?.length) {
    cibles = c.tailles.filter((t) => d.tailles!.includes(tailleDe(t.taille) ?? -1));
  } else if (d.taille_min != null || d.taille_max != null) {
    const min = d.taille_min ?? 0, max = d.taille_max ?? 999;
    cibles = c.tailles.filter((t) => { const n = tailleDe(t.taille); return n != null && n >= min && n <= max; });
    // « 10, 2 par taille entre 54 et 62 » = 5 tailles : si le compte ne tombe pas juste, on essaie les tailles paires
    if (d.quantite_totale && d.quantite_par_taille && cibles.length * d.quantite_par_taille !== d.quantite_totale) {
      const paires = cibles.filter((t) => (tailleDe(t.taille) ?? 1) % 2 === 0);
      if (paires.length * d.quantite_par_taille === d.quantite_totale) cibles = paires;
    }
  }
  if (!cibles.length) {
    const dit = d.quantite_totale ? `${d.quantite_totale} pièces demandées. ` : "";
    return { quantites: {}, remarque: `${dit}Quelles tailles ? Remplis les quantités ci-dessous.` };
  }
  if (d.quantite_par_taille) {
    for (const t of cibles) q[t.taille] = d.quantite_par_taille;
  } else if (d.quantite_totale) {
    const base = Math.floor(d.quantite_totale / cibles.length);
    let reste = d.quantite_totale - base * cibles.length;
    for (const t of cibles) { q[t.taille] = base + (reste > 0 ? 1 : 0); if (reste > 0) reste--; }
  } else {
    for (const t of cibles) q[t.taille] = 1;
  }
  for (const k of Object.keys(q)) if (!q[k]) delete q[k];
  const total = Object.values(q).reduce((s, n) => s + n, 0);
  const remarques: string[] = [];
  if (d.quantite_totale && total !== d.quantite_totale) remarques.push(`Tu as dit ${d.quantite_totale} pièces, la répartition en donne ${total} : vérifie.`);
  const manquantes = (d.tailles ?? []).filter((n) => !c.tailles.some((t) => tailleDe(t.taille) === n));
  if (manquantes.length) remarques.push(`Taille(s) ${manquantes.join(", ")} inexistante(s) pour cet article.`);
  return { quantites: q, remarque: remarques.join(" ") || null };
}
