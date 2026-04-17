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

export type ShopifyCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  locale: string; // e.g. "fr", "de", "en"
};

export type ShopifyOrderLineItem = {
  id: number;
  productId: number;
  variantId: number;
  title: string;
  sku: string;
  quantity: number;
};

export type ShopifyOrder = {
  id: number;
  name: string; // e.g. "#12345"
  customer: ShopifyCustomer;
  lineItems: ShopifyOrderLineItem[];
};

export type KatanaPurchaseOrderRow = {
  id: string;
  variantId: number;
  variantSku: string | null;
  variantName: string;
  quantity: number;
  receivedQuantity: number;
};

export type KatanaPurchaseOrder = {
  id: number;
  number: string;
  supplierId: number;
  supplierName: string;
  status: string;
  estimatedDelivery: string | null; // ISO date
  rows: KatanaPurchaseOrderRow[];
};

export type BackorderAnalysis = {
  order: ShopifyOrder;
  product: ShopifyVariantInfo;
  materials: KatanaRecipeIngredientWithSupplier[];
  purchaseOrder: KatanaPurchaseOrder | null;
  estimatedDelivery: string | null;
  leadTimeMin: number | null;
  leadTimeMax: number | null;
  emailDraft: string | null;
  followUpEmailDraft: string | null; // generated when lead time > 12 days
};

export type BackorderApiResponse = {
  ok: boolean;
  result?: BackorderAnalysis;
  error?: string;
};
