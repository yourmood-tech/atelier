export type Direction = "IN" | "OUT";

export type ScanRequest = {
  sku: string;
  direction: Direction;
  sessionId?: string | null;
  deviceName?: string | null;
};

export type ScanApiResponse = {
  ok: boolean;
  sku?: string;
  direction?: Direction;
  eventId?: string;
  variantName?: string;
  error?: string;
  details?: unknown;
};

export type KatanaRecipeIngredient = {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string | null;
};

export type KatanaRecipe = {
  id: number;
  name: string;
  sku: string | null;
  ingredients: KatanaRecipeIngredient[];
};

export type RecipesApiResponse = {
  ok: boolean;
  count?: number;
  items?: KatanaRecipe[];
  error?: string;
};

export type KatanaSupplier = {
  id: number;
  name: string;
};

export type KatanaRecipeIngredientWithSupplier = KatanaRecipeIngredient & {
  supplier: KatanaSupplier | null;
};

export type ShopifyVariantInfo = {
  variantId: number;
  productId: number;
  productTitle: string;
  variantTitle: string;
  sku: string;
};

export type RecipeLookupResult = {
  shopify: ShopifyVariantInfo;
  recipe: {
    id: number;
    name: string;
    sku: string | null;
    ingredients: KatanaRecipeIngredientWithSupplier[];
  } | null;
};

export type RecipeLookupApiResponse = {
  ok: boolean;
  result?: RecipeLookupResult;
  error?: string;
};
