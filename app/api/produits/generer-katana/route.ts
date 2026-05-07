import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { genererLignesKatana } from "@/lib/produits/katana-rules";

async function buildExcelProducts(lignes: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Products");
  ws.addRow([
    "Product name (required)",
    "Unit of measure",
    "Make?",
    "Buy?",
    "Kit / Bundle? ",
    "Product tracking",
    "Variant code / SKU",
    "Variant option 1",
    "Variant value 1",
    null,
  ]);
  for (const l of lignes) ws.addRow(l);
  return await wb.xlsx.writeBuffer();
}

async function buildExcelRecipes(lignes: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Product recipes (BOM)");
  ws.addRow([
    "Product variant code / SKU (required)",
    "Ingredient variant code / SKU (required)",
    "Quantity (required)",
  ]);
  for (const l of lignes) ws.addRow(l);
  return await wb.xlsx.writeBuffer();
}

export async function POST(request: Request) {
  const body = await request.json();
  const { product, infosForm } = body || {};

  if (!product || !product.variants)
    return NextResponse.json({ error: 'champ "product" requis avec ses variants' }, { status: 400 });

  try {
    const { lignesProducts, lignesRecipes } = genererLignesKatana(product, infosForm || {});

    const bufProducts = await buildExcelProducts(lignesProducts);
    const bufRecipes = await buildExcelRecipes(lignesRecipes);

    const zip = new JSZip();
    zip.file("katana-step-2-products.xlsx", bufProducts);
    zip.file("katana-add-new-recipes.xlsx", bufRecipes);
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

    const handle = (product.handle || "produit").replace(/[^a-z0-9]/gi, "-");
    return new Response(zipBuf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="katana-${handle}.zip"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "erreur serveur", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
