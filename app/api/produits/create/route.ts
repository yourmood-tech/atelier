import { NextResponse } from "next/server";
import { construirePayloadProduit } from "@/lib/produits/mood-rules";
import { genererSeoViaIA } from "@/lib/produits/seo-ia";
import {
  creerProduit,
  setCoutAchat,
  listerLocations,
  listerLocationsViaInventaire,
  setStock,
  listerCanaux,
  publierSurCanal,
  ajouterProduitAUneCollection,
} from "@/lib/produits/shopify";

export async function POST(request: Request) {
  const infos = await request.json();
  const champsObligatoires = ["format", "nom", "matiere", "prixVente"];
  for (const c of champsObligatoires) {
    if (!infos[c])
      return NextResponse.json({ error: `champ manquant : ${c}` }, { status: 400 });
  }

  try {
    const seoIA = await genererSeoViaIA(infos);
    const payload = construirePayloadProduit(infos, seoIA);
    const creation = await creerProduit(payload);
    if (!creation.ok)
      return NextResponse.json(
        { etape: "création produit", erreur: creation.data },
        { status: creation.status }
      );

    const product = (creation.data as { product: Record<string, unknown> & {
      id: number;
      handle: string;
      title: string;
      status: string;
      tags: string;
      options: { name: string }[];
      variants: Array<{ sku: string; option1: string; option2?: string; option3?: string; price: string; inventory_item_id: number }>;
    } }).product;


    const journal: Record<string, unknown> = {
      idProduit: product.id,
      handle: product.handle,
      titre: product.title,
      statut: product.status,
      urlAdmin: `https://${process.env.MOOD_SHOPIFY_DOMAIN}/admin/products/${product.id}`,
      variantes: product.variants.length,
      etiquettes: product.tags,
      seoIA: seoIA
        ? `${seoIA.title} (${seoIA.title.length}c) | ${seoIA.description} (${seoIA.description.length}c)`
        : "fallback template",
      etapes: {
        creation: "OK",
        seo: seoIA ? "généré par IA avec mots-clés Mood" : "template par défaut",
      },
      productPourKatana: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        options: product.options,
        variants: product.variants.map((v) => ({
          sku: v.sku,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          price: v.price,
        })),
      },
      infosFormPourKatana: {
        format: infos.format,
        formats: infos.formats,
        matiere: infos.matiere,
        couleurs: infos.couleurs,
      },
    };

    if (infos.coutAchat) {
      let okCout = 0;
      for (const v of product.variants) {
        const r = await setCoutAchat(v.inventory_item_id, infos.coutAchat);
        if (r.ok) okCout++;
      }
      (journal.etapes as Record<string, string>).coutAchat = `${okCout}/${product.variants.length} variantes`;
    } else {
      (journal.etapes as Record<string, string>).coutAchat = "non fourni";
    }

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
    } else {
      (journal.etapes as Record<string, string>).stock = "aucune boutique trouvée (vérifier permissions)";
    }

    const canaux = await listerCanaux();
    if (canaux.length) {
      let okCanal = 0;
      for (const c of canaux) {
        const r = await publierSurCanal(c.id, product.id);
        if (r.ok) okCanal++;
      }
      (journal.etapes as Record<string, string>).canauxVente = `${okCanal}/${canaux.length} canaux`;
    } else {
      (journal.etapes as Record<string, string>).canauxVente =
        "permissions read_publications/write_publications manquantes";
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
