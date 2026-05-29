import { NextResponse } from "next/server";
import { construirePayloadCoffret } from "@/lib/produits/coffret-rules";
import {
  creerProduit,
  listerLocations,
  listerLocationsViaInventaire,
  setStock,
  listerCanaux,
  publierSurCanal,
  ajouterProduitAUneCollection,
} from "@/lib/produits/shopify";

export async function POST(request: Request) {
  const infos = await request.json();
  if (!infos.nom)
    return NextResponse.json({ error: "champ requis : nom" }, { status: 400 });

  try {
    const payload = construirePayloadCoffret(infos);
    const creation = await creerProduit(payload);
    if (!creation.ok)
      return NextResponse.json(
        { etape: "création coffret", erreur: creation.data },
        { status: creation.status }
      );

    const product = (creation.data as { product: Record<string, unknown> & {
      id: number;
      handle: string;
      title: string;
      status: string;
      tags: string;
      variants: Array<{ inventory_item_id: number }>;
    } }).product;


    const journal: Record<string, unknown> = {
      idProduit: product.id,
      handle: product.handle,
      titre: product.title,
      statut: product.status,
      urlAdmin: `https://${process.env.MOOD_SHOPIFY_DOMAIN}/admin/products/${product.id}`,
      variantes: product.variants.length,
      etiquettes: product.tags,
      etapes: { creation: "OK" },
    };

    let locations = await listerLocations();
    if (!locations || !locations.length) {
      locations = await listerLocationsViaInventaire(product.variants[0].inventory_item_id);
    }
    if (locations && locations.length) {
      let okStock = 0;
      const cible = product.variants.length * locations.length;
      for (const v of product.variants) {
        for (const loc of locations) {
          const r = await setStock(loc.id, v.inventory_item_id, 10000);
          if (r.ok) okStock++;
        }
      }
      (journal.etapes as Record<string, string>).stock = `${okStock}/${cible} (boutiques: ${locations.length})`;
    }

    const canaux = await listerCanaux();
    if (canaux.length) {
      let okCanal = 0;
      for (const c of canaux) {
        const r = await publierSurCanal(c.id, product.id);
        if (r.ok) okCanal++;
      }
      (journal.etapes as Record<string, string>).canauxVente = `${okCanal}/${canaux.length} canaux`;
    }

    if (infos.collectionCible && String(infos.collectionCible).trim()) {
      const res = await ajouterProduitAUneCollection(
        product.id,
        String(infos.collectionCible).trim()
      );
      if (res.ok) {
        (journal.etapes as Record<string, string>).collection = res.cree
          ? `✓ collection "${res.collectionTitre}" créée + produit ajouté`
          : `✓ produit ajouté à la collection "${res.collectionTitre}"`;
        (journal as Record<string, unknown>).collection = {
          id: res.collectionId,
          titre: res.collectionTitre,
          cree: res.cree,
        };
      } else {
        (journal.etapes as Record<string, string>).collection = `✗ ${res.erreur || "échec"}`;
      }
    }

    return NextResponse.json(journal);
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
