"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Attr = { key: string; value: string };
type LineItem = {
  title: string;
  quantity: number;
  originalUnitPriceSet: { shopMoney: { amount: string } };
  customAttributes: Attr[];
};
type Customer = { firstName?: string; lastName?: string; email?: string };
type DraftOrder = {
  id: string;
  legacyResourceId: string;
  name: string;
  status: string;
  email: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  createdAt: string;
  updatedAt: string;
  note: string;
  tags: string[];
  customer?: Customer;
  lineItems: { nodes: LineItem[] };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function attr(li: LineItem, key: string) {
  return li.customAttributes.find((a) => a.key === key)?.value ?? "—";
}

function DevisCard({ d, valide }: { d: DraftOrder; valide: boolean }) {
  const li = d.lineItems.nodes[0];
  const client = d.customer
    ? `${d.customer.firstName ?? ""} ${d.customer.lastName ?? ""}`.trim() || d.email
    : d.email;
  const prix = d.totalPriceSet.shopMoney;
  const statusColor = valide ? "#22c55e" : d.status === "INVOICE_SENT" ? "#f59e0b" : "#60a5fa";
  const statusLabel = valide ? "Payé" : d.status === "INVOICE_SENT" ? "Facture envoyée" : "En attente";

  return (
    <Link href={`/admin/devis/${d.legacyResourceId}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: "1rem",
        cursor: "pointer", transition: "border-color 0.15s", marginBottom: "0.75rem",
      }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c9a96e")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#27272a")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <div>
            <div style={{ fontWeight: 600, color: "#f4f4f5", fontSize: "0.95rem" }}>{client}</div>
            <div style={{ color: "#71717a", fontSize: "0.78rem", marginTop: 2 }}>{d.email}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 700, color: "#c9a96e", fontSize: "1rem" }}>
              {Number(prix.amount).toFixed(2)} {prix.currencyCode}
            </div>
            <span style={{ fontSize: "0.7rem", color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
          </div>
        </div>

        {li && (
          <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[attr(li, "Format"), attr(li, "Couleur"), attr(li, "Taille"), attr(li, "Finition")].filter((v) => v !== "—").map((v, i) => (
              <span key={i} style={{ background: "#27272a", borderRadius: 4, padding: "0.15rem 0.5rem", fontSize: "0.72rem", color: "#a1a1aa" }}>{v}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: "0.5rem", color: "#52525b", fontSize: "0.72rem" }}>
          {d.name} · {formatDate(d.updatedAt)}
        </div>
      </div>
    </Link>
  );
}

export default function DevisPage() {
  const [enCours, setEnCours] = useState<DraftOrder[]>([]);
  const [valides, setValides] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/devis")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setEnCours(d.enCours ?? []);
        setValides(d.valides ?? []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Gestion des devis</h1>
            <p style={{ color: "#71717a", fontSize: "0.82rem", marginTop: 4 }}>Demandes de validation design avant achat</p>
          </div>
          <button onClick={load} style={{ background: "#27272a", color: "#a1a1aa", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", fontSize: "0.8rem", cursor: "pointer" }}>
            ↻ Actualiser
          </button>
        </div>

        {error && (
          <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.85rem" }}>
            Erreur : {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: "#71717a", textAlign: "center", padding: "3rem" }}>Chargement…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* En cours */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                <h2 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0, color: "#e4e4e7" }}>
                  En cours <span style={{ color: "#52525b", fontWeight: 400 }}>({enCours.length})</span>
                </h2>
              </div>
              {enCours.length === 0 ? (
                <p style={{ color: "#52525b", fontSize: "0.82rem" }}>Aucun devis en attente</p>
              ) : (
                enCours.map((d) => <DevisCard key={d.id} d={d} valide={false} />)
              )}
            </div>

            {/* Validés (payés) */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <h2 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0, color: "#e4e4e7" }}>
                  Validés (payés) <span style={{ color: "#52525b", fontWeight: 400 }}>({valides.length})</span>
                </h2>
              </div>
              {valides.length === 0 ? (
                <p style={{ color: "#52525b", fontSize: "0.82rem" }}>Aucun devis payé</p>
              ) : (
                valides.map((d) => <DevisCard key={d.id} d={d} valide={true} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
