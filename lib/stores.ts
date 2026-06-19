export type StoreKey = 'mood-collection' | 'mood-joaillerie';

export interface StoreConfig {
  label: string;
  shopifyDomain: string;     // domaine *.myshopify.com pour l'API admin
  publicDomain: string;       // domaine public yourmood.net / moodjoaillerie.net pour les URLs visiteur
  shopifyToken: string;
}

export const STORES: Record<StoreKey, StoreConfig> = {
  'mood-collection': {
    label: 'Mood Collection',
    shopifyDomain: process.env.MOOD_SHOPIFY_DOMAIN!,
    publicDomain: 'yourmood.net',
    // Clé vivante en priorité (SHOPIFY_API_TOKEN) ; MOOD_SHOPIFY_ACCESS_TOKEN est l'ancienne clé morte
    // qui ne remonte plus les produits en brouillon. Même correctif que les services ventes (S175).
    shopifyToken: (process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN)!,
  },
  'mood-joaillerie': {
    label: 'Mood Joaillerie',
    shopifyDomain: process.env.MOODJOAILLERIE_SHOPIFY_DOMAIN!,
    publicDomain: 'moodjoaillerie.net',
    shopifyToken: process.env.MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN!,
  },
};

export function getStore(key: string): StoreConfig {
  const store = STORES[key as StoreKey];
  if (!store) throw new Error(`Store inconnu : ${key}`);
  return store;
}
