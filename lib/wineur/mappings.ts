// Wineur mapping manager — overlay Vercel KV sur les JSON statiques
import { kv } from "@vercel/kv";
import comptesPostfinance from "@/lib/wineur/comptes_postfinance.json";
import comptesPaypal from "@/lib/wineur/comptes_paypal.json";

export type MappingSource = "postfinance" | "paypal";

const KV_KEY: Record<MappingSource, string> = {
  postfinance: "wineur_mappings_postfinance",
  paypal:      "wineur_mappings_paypal",
};

const STATIC: Record<MappingSource, Record<string, string>> = {
  postfinance: comptesPostfinance as Record<string, string>,
  paypal:      comptesPaypal      as Record<string, string>,
};

// Charge les overrides KV (silencieux si KV non disponible)
async function loadKv(source: MappingSource): Promise<Record<string, string>> {
  try {
    return (await kv.get<Record<string, string>>(KV_KEY[source])) ?? {};
  } catch {
    return {};
  }
}

// Retourne le mapping fusionné (KV override statique)
export async function getMappings(source: MappingSource): Promise<Record<string, string>> {
  const kvOverrides = await loadKv(source);
  return { ...STATIC[source], ...kvOverrides };
}

// Sauvegarde un nouveau mapping dans KV
export async function saveMapping(source: MappingSource, key: string, compte: string): Promise<void> {
  const existing = await loadKv(source);
  existing[key.toLowerCase().trim()] = compte.trim();
  await kv.set(KV_KEY[source], existing);
}

// Lookup avec correspondance partielle — retourne null si inconnu
export function lookupInMap(haystack: string, config: Record<string, string>): string | null {
  const h = haystack.toLowerCase();
  // Correspondance exacte
  if (config[h]) return config[h];
  // Correspondance partielle (plus longue clé commune en premier)
  const matches: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(config)) {
    const kn = k.toLowerCase().trim();
    if (!kn) continue;
    if (h.includes(kn) || kn.includes(h.split(" ")[0])) matches.push([kn, v]);
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b[0].length - a[0].length);
  return matches[0][1];
}

export interface UnknownEntry {
  key: string;        // clé normalisée à stocker
  label: string;      // description lisible pour l'UI
  amount: number;
  date: string;
  source: MappingSource;
}
