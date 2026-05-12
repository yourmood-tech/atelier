import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const GQL_QUERY = `
query DevisList {
  draftOrders(first: 100, query: "tag:devis-sur-mesure", sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id
      legacyResourceId
      name
      status
      email
      totalPriceSet { shopMoney { amount currencyCode } }
      createdAt
      updatedAt
      note
      tags
      customer { firstName lastName email }
      lineItems(first: 3) {
        nodes {
          title
          quantity
          originalUnitPriceSet { shopMoney { amount } }
          customAttributes { key value }
        }
      }
    }
  }
}
`;

export async function GET() {
  try {
    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: GQL_QUERY }),
      cache: "no-store",
    });
    const json = await r.json();
    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      return NextResponse.json({ error: "GraphQL error", details: json.errors }, { status: 500 });
    }

    const nodes = json.data?.draftOrders?.nodes ?? [];

    // Séparer en cours (open) et validés (completed = payé)
    const enCours = nodes.filter((d: { status: string }) => d.status === "OPEN" || d.status === "INVOICE_SENT");
    const valides = nodes.filter((d: { status: string }) => d.status === "COMPLETED");

    return NextResponse.json({ enCours, valides });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
