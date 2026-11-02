import type { NextRequest } from "next/server";

// Les tâches planifiées de Vercel arrivent avec l'agent « vercel-cron/1.0 » (pas d'en-tête x-vercel-cron).
// Si CRON_SECRET est défini sur Vercel, Vercel l'envoie en « Authorization: Bearer … » : c'est alors la seule preuve acceptée.
export function estCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/") || req.headers.get("x-vercel-cron") !== null;
}
