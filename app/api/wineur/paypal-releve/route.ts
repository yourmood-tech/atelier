import { NextRequest, NextResponse } from "next/server";

// Lecture seule du relevé PayPal, pour les contrôles de rapprochement :
// mouvements bruts (code, montant, solde après mouvement) et soldes par devise
// à une date. N'écrit aucune écriture.

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

async function getToken(): Promise<string> {
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = await res.json() as { access_token?: string };
  if (!j.access_token) throw new Error("PayPal auth failed");
  return j.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start et end requis" }, { status: 400 });

  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };

  const mouvements: Record<string, unknown>[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `https://api-m.paypal.com/v1/reporting/transactions?start_date=${start}T00:00:00-0000&end_date=${end}T23:59:59-0000&fields=transaction_info,payer_info&page_size=500&page=${page}`,
      { headers }
    );
    const j = await res.json() as { transaction_details?: Record<string, unknown>[]; total_pages?: number };
    for (const tx of j.transaction_details ?? []) {
      const info  = tx.transaction_info as Record<string, Record<string, string> | string>;
      const payer = tx.payer_info as Record<string, Record<string, string>> | undefined;
      const amt   = info.transaction_amount as Record<string, string> | undefined;
      const fee   = info.fee_amount as Record<string, string> | undefined;
      const bal   = info.ending_balance as Record<string, string> | undefined;
      mouvements.push({
        date: String(info.transaction_initiation_date ?? "").slice(0, 19),
        code: info.transaction_event_code,
        statut: info.transaction_status,
        devise: amt?.currency_code,
        montant: Number(amt?.value ?? 0),
        frais: Number(fee?.value ?? 0),
        solde_apres: bal ? Number(bal.value) : null,
        nom: payer?.payer_name?.alternate_full_name ?? "",
      });
    }
    if (!j.total_pages || page >= j.total_pages) break;
  }

  const resBal = await fetch(
    `https://api-m.paypal.com/v1/reporting/balances?as_of_time=${end}T23:59:59-0000`,
    { headers }
  );
  const soldes = await resBal.json();

  return NextResponse.json({ mouvements, soldes });
}
