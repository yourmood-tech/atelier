// Heures d'attente « ouvrées » d'une demande cliente (décision Philippe 10.11.2026) : toutes les
// demandes doivent recevoir une réponse en 24 heures, mais personne ne répond entre le vendredi
// 17h00 et le lundi 9h00 (heure suisse). Ce créneau du week-end n'est donc pas compté.
const TZ = "Europe/Zurich";

/** Décalage (en minutes) de l'heure suisse par rapport à l'heure universelle, à cet instant. */
function decalage(d: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((local - Math.floor(d.getTime() / 60000) * 60000) / 60000);
}

/** Instant correspondant à une date + heure suisse (jour = date UTC servant de repère). */
function instantSuisse(annee: number, mois: number, jour: number, heure: number): number {
  const approx = new Date(Date.UTC(annee, mois, jour, heure));
  return approx.getTime() - decalage(approx) * 60000;
}

/** Jour de la semaine en Suisse (0 = dimanche … 5 = vendredi). */
function jourSuisse(t: number): { annee: number; mois: number; jour: number; semaine: number } {
  const d = new Date(t + decalage(new Date(t)) * 60000);
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth(), jour: d.getUTCDate(), semaine: d.getUTCDay() };
}

/** Heures écoulées entre deux instants, sans le créneau vendredi 17h → lundi 9h. */
export function heuresOuvrees(debut: Date | string, fin: Date | string = new Date()): number {
  const a = new Date(debut).getTime(), b = new Date(fin).getTime();
  if (!(b > a)) return 0;
  let total = b - a;
  // chaque vendredi entre (début − 3 jours) et la fin : on retire le recouvrement avec son week-end
  const j = jourSuisse(a - 3 * 86400000);
  let ref = Date.UTC(j.annee, j.mois, j.jour);
  for (let k = 0; k < 400 && ref <= b + 86400000; k++, ref += 86400000) {
    const d = new Date(ref);
    if (d.getUTCDay() !== 5) continue;
    const ven = instantSuisse(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 17);
    const lun = instantSuisse(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3, 9);
    const chevauche = Math.min(b, lun) - Math.max(a, ven);
    if (chevauche > 0) total -= chevauche;
  }
  return total / 3600000;
}

/** Vrai pendant le week-end sans réponse (vendredi 17h → lundi 9h, heure suisse). */
export function estWeekEnd(t: Date = new Date()): boolean {
  const j = jourSuisse(t.getTime());
  const h = new Date(t.getTime() + decalage(t) * 60000).getUTCHours();
  return (j.semaine === 5 && h >= 17) || j.semaine === 6 || j.semaine === 0 || (j.semaine === 1 && h < 9);
}

/** Heure suisse (0-23) maintenant. */
export function heureSuisse(t: Date = new Date()): number {
  return new Date(t.getTime() + decalage(t) * 60000).getUTCHours();
}
