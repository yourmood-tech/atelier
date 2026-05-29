import { NextResponse } from "next/server";
import { construirePayloadJoaillerie, JoaillerieInfos } from "@/lib/produits/joaillerie-rules";
import { makeShopifyClient } from "@/lib/produits/shopify";
import { getStore } from "@/lib/stores";
import { genererSeoViaIA } from "@/lib/produits/seo-ia";

export async function POST(request: Request) {
  const body = await request.json();
  const { store: storeKey = 'mood-joaillerie', ...infos } = body || {};

  if (!infos.nom)
    return NextResponse.json({ error: "champ manquant : nom" }, { status: 400 });
  if (!infos.matiere)
    return NextResponse.json({ error: "champ manquant : matiere" }, { status: 400 });

  try {
    const storeConfig = getStore(storeKey);
    const client = makeShopifyClient(storeConfig.shopifyDomain, storeConfig.shopifyToken);

    // Génération SEO via IA (mode joaillerie)
    const seoIA = await genererSeoViaIA({
      nom: infos.nom,
      format: infos.format,
      matiere: infos.matiere,
      finition: infos.finition,
      couleur: infos.couleur,
      mode: 'joaillerie',
      pierres: infos.pierres,
      carat: infos.carat,
      type_sertissage: infos.type_sertissage,
      sous_type_piece: infos.sous_type_piece,
      texteInspiration: infos.description_ia,
    });

    const payload = construirePayloadJoaillerie(infos as JoaillerieInfos, seoIA);
    const creation = await client.creerProduit(payload);
    if (!creation.ok)
      return NextResponse.json(
        { etape: "création produit", erreur: creation.data },
        { status: creation.status }
      );

    const product = (creation.data as {
      product: Record<string, unknown> & {
        id: number;
        handle: string;
        title: string;
        status: string;
        tags: string;
        options: { name: string }[];
        variants: Array<{
          sku: string;
          option1: string;
          price: string;
          inventory_item_id: number;
        }>;
      };
    }).product;

    const journal: Record<string, unknown> = {
      idProduit: product.id,
      handle: product.handle,
      titre: product.title,
      statut: product.status,
      urlAdmin: `https://${storeConfig.shopifyDomain}/admin/products/${product.id}`,
      variantes: product.variants.length,
      etiquettes: product.tags,
      etapes: {
        creation: "OK",
      },
    };

    // Stock
    let locations = await client.listerLocations();
    if (!locations || !locations.length) {
      locations = await client.listerLocationsViaInventaire(product.variants[0].inventory_item_id);
    }
    if (locations && locations.length) {
      let okStock = 0;
      const cible = product.variants.length * locations.length;
      for (const v of product.variants) {
        for (const loc of locations) {
          const r = await client.setStock(loc.id, v.inventory_item_id, 10000);
          if (r.ok) okStock++;
        }
      }
      (journal.etapes as Record<string, string>).stock = `${okStock}/${cible} (boutiques: ${locations.length})`;
    } else {
      (journal.etapes as Record<string, string>).stock = "aucune boutique trouvée (vérifier permissions)";
    }

    // Canaux de vente
    const canaux = await client.listerCanaux();
    if (canaux.length) {
      let okCanal = 0;
      for (const c of canaux) {
        const r = await client.publierSurCanal(c.id, product.id);
        if (r.ok) okCanal++;
      }
      (journal.etapes as Record<string, string>).canauxVente = `${okCanal}/${canaux.length} canaux`;
    } else {
      (journal.etapes as Record<string, string>).canauxVente =
        "permissions read_publications/write_publications manquantes";
    }

    if (infos.collectionCible && String(infos.collectionCible).trim()) {
      const res = await client.ajouterProduitAUneCollection(
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
