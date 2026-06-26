// Liste des matchs du jeu-concours Mondial 2026 (mêmes id que html/pronostics.html).
// Étape suivante : cette liste sera alimentée automatiquement par le calendrier officiel.
export interface Match {
  id: string;
  jour: string;
  teamA: string;
  teamB: string;
}

export const MATCHES: Match[] = [
  { id: "g-jpn-swe", jour: "Vendredi 26 juin", teamA: "Japon", teamB: "Suède" },
  { id: "g-tun-ned", jour: "Vendredi 26 juin", teamA: "Tunisie", teamB: "Pays-Bas" },
  { id: "g-nor-fra", jour: "Vendredi 26 juin", teamA: "Norvège", teamB: "France" },
  { id: "g-sen-irq", jour: "Vendredi 26 juin", teamA: "Sénégal", teamB: "Irak" },
  { id: "g-tur-usa", jour: "Vendredi 26 juin", teamA: "Turquie", teamB: "États-Unis" },
  { id: "g-par-aus", jour: "Vendredi 26 juin", teamA: "Paraguay", teamB: "Australie" },
  { id: "g-uru-esp", jour: "Samedi 27 juin", teamA: "Uruguay", teamB: "Espagne" },
  { id: "g-cpv-ksa", jour: "Samedi 27 juin", teamA: "Cap-Vert", teamB: "Arabie saoudite" },
  { id: "g-egy-irn", jour: "Samedi 27 juin", teamA: "Égypte", teamB: "Iran" },
  { id: "g-nzl-bel", jour: "Samedi 27 juin", teamA: "Nouvelle-Zélande", teamB: "Belgique" },
  { id: "g-pan-eng", jour: "Samedi 27 juin", teamA: "Panama", teamB: "Angleterre" },
  { id: "g-cro-gha", jour: "Samedi 27 juin", teamA: "Croatie", teamB: "Ghana" },
];

export const MATCH_IDS = new Set(MATCHES.map((m) => m.id));
