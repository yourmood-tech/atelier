export type StoreKey = 'mood-collection' | 'mood-joaillerie';

export interface StoreConfig {
  label: string;
  shopifyDomain: string;
  shopifyToken: string;
}

export const STORES: Record<StoreKey, StoreConfig> = {
  'mood-collection': {
    label: 'Mood Collection',
    shopifyDomain: process.env.MOOD_SHOPIFY_DOMAIN!,
    shopifyToken: process.env.MOOD_SHOPIFY_ACCESS_TOKEN!,
  },
  'mood-joaillerie': {
    label: 'Mood Joaillerie',
    shopifyDomain: process.env.MOODJOAILLERIE_SHOPIFY_DOMAIN!,
    shopifyToken: process.env.MOODJOAILLERIE_SHOPIFY_ACCESS_TOKEN!,
  },
};

export function getStore(key: string): StoreConfig {
  const store = STORES[key as StoreKey];
  if (!store) throw new Error(`Store inconnu : ${key}`);
  return store;
}
