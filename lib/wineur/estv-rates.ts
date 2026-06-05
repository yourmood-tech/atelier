// Taux de change mensuels ESTV — via l'API BAZG (Office fédéral des douanes)
// Endpoint : https://www.backend-rates.bazg.admin.ch/avgrateshtml?j={année}&m={mois}&locale=fr
// Nécessite Referer + Origin pointant vers estv.admin.ch pour contourner le CORS serveur.
//
// Si le mois demandé n'est pas encore publié, recule d'un mois (max 4 mois en arrière).

const MOIS_FR = [
  "janvier","fevrier","mars","avril","mai","juin",
  "juillet","aout","septembre","octobre","novembre","decembre",
];

// Cache in-process : évite de re-fetcher pour plusieurs transactions du même mois
const cache = new Map<string, number>();

async function fetchRateForMonth(year: number, month: number, dev: string): Promise<number | null> {
  const m   = String(month).padStart(2, "0");
  const url = `https://www.backend-rates.bazg.admin.ch/avgrateshtml?j=${year}&m=${m}&locale=fr`;

  const res = await fetch(url, {
    headers: {
      Referer:      `https://www.estv.admin.ch/fr/${MOIS_FR[month - 1]}-${year}`,
      Origin:       "https://www.estv.admin.ch",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:       "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const html = await res.text();
  // Format : "(N) {DEVISE}</td>\n<td ...>(taux)</td>"
  const re   = new RegExp(`(\\d+)\\s+${dev}<\\/td>\\s*<td[^>]*>([\\d.]+)<\\/td>`, "i");
  const match = html.match(re);
  if (!match) return null;

  return parseFloat(match[2]) / parseInt(match[1]); // CHF par 1 unité de devise
}

/**
 * Retourne le taux de change CHF par 1 unité de devise selon les taux ESTV
 * valables pour le mois de la date fournie.
 * Si le mois n'est pas encore publié, utilise le mois précédent (max 4 mois).
 *
 * Ex: getESTVRate("2026-05-10", "EUR") → 0.9295 (taux mai 2026)
 */
export async function getESTVRate(date: string, devise: string): Promise<number> {
  const dev   = devise.toUpperCase();
  if (dev === "CHF") return 1;

  const year  = parseInt(date.slice(0, 4));
  const month = parseInt(date.slice(5, 7));

  for (let back = 0; back <= 4; back++) {
    let mo = month - back;
    let yr = year;
    if (mo <= 0) { mo += 12; yr -= 1; }

    const key = `${yr}-${String(mo).padStart(2, "0")}/${dev}`;
    if (cache.has(key)) return cache.get(key)!;

    const rate = await fetchRateForMonth(yr, mo, dev);
    if (rate !== null) {
      cache.set(key, rate);
      return rate;
    }
  }

  throw new Error(`ESTV : taux ${dev} introuvable pour les 5 derniers mois`);
}
