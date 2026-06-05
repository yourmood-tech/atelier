// Taux de change mensuels ESTV — Administration fédérale des contributions
// Source : https://www.estv.admin.ch/fr/{mois}-{année}

const MOIS_FR = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre",
];

// Cache in-process : évite de re-fetcher pour plusieurs transactions du même mois
const cache = new Map<string, number>();

/**
 * Retourne le taux de change CHF par 1 unité de devise, selon les taux ESTV
 * valables pour le mois de la date fournie.
 *
 * Ex: getESTVRate("2026-01-15", "EUR") → 0.9430 (1 EUR = 0.9430 CHF)
 */
export async function getESTVRate(date: string, devise: string): Promise<number> {
  const dev = devise.toUpperCase();
  if (dev === "CHF") return 1;

  const year  = parseInt(date.slice(0, 4));
  const month = parseInt(date.slice(5, 7));
  const key   = `${year}-${String(month).padStart(2, "0")}/${dev}`;

  if (cache.has(key)) return cache.get(key)!;

  const mois = MOIS_FR[month - 1];
  const url  = `https://www.estv.admin.ch/fr/${mois}-${year}`;
  const res  = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`ESTV ${mois}-${year} : HTTP ${res.status}`);

  const raw  = await res.text();
  // Le tableau est embarqué en JS dans la page : < est encodé <
  const html = raw.replace(/\\u003C/g, "<").replace(/\\u003E/g, ">");

  // Pattern : "(N) {DEVISE}</td>...>(taux)</td>"
  // Certaines devises utilisent 100 unités (ex: 100 ZAR = 0.0477 CHF)
  const re = new RegExp(
    `(\\d+)\\s+${dev}<\\/td>[\\s\\S]{0,400}?>(\\d+\\.\\d+)<\\/td>`,
    "i"
  );
  const m = html.match(re);
  if (!m) throw new Error(`ESTV : taux ${dev} introuvable pour ${mois}-${year}`);

  const rate = parseFloat(m[2]) / parseInt(m[1]); // CHF par 1 unité de devise
  cache.set(key, rate);
  return rate;
}
