"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type Prop = { name: string; value: string };
type LineItem = { title: string; quantity: number; price: string; variant_id: number; properties: Prop[] };
type Customer = { id: number; first_name?: string; last_name?: string; email?: string };
type DraftOrder = {
  id: number;
  name: string;
  status: string;
  email: string;
  note: string;
  tags: string;
  total_price: string;
  line_items: LineItem[];
  customer?: Customer;
  invoice_url?: string;
  created_at: string;
  updated_at: string;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "#27272a", borderRadius: 4, padding: "0.15rem 0.5rem", fontSize: "0.72rem", color: "#a1a1aa", display: "inline-block", margin: "0.1rem" }}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.82rem", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #27272a", fontSize: "0.83rem" }}>
      <span style={{ color: "#71717a" }}>{label}</span>
      <span style={{ color: "#e4e4e7", fontWeight: 500, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{value || "—"}</span>
    </div>
  );
}

export default function DevisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prix
  const [editingPrix, setEditingPrix] = useState(false);
  const [newPrix, setNewPrix] = useState("");
  const [savingPrix, setSavingPrix] = useState(false);

  // SVG upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingsvg, setUploadingsvg] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Envoi devis (notification design + prix)
  const [sendingDevis, setSendingDevis] = useState(false);
  const [devisMsg, setDevisMsg] = useState<string | null>(null);
  const [devisMessage, setDevisMessage] = useState("Bonjour, voici ton devis personnalisé Mood. Tu trouveras ci-dessous le lien vers ton design ainsi que le prix validé par notre équipe.");

  // Envoi facture
  const [sendingFacture, setSendingFacture] = useState(false);
  const [factureMsg, setFactureMsg] = useState<string | null>(null);
  const [factureMessage, setFactureMessage] = useState("Bonjour, ton devis personnalisé Mood est confirmé. Tu peux finaliser ta commande en cliquant sur le lien ci-dessous.");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/devis/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDraft(d.draft_order);
        setSvgContent(d.svgContent);
        setNewPrix(d.draft_order?.total_price ?? "");
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function savePrix() {
    setSavingPrix(true);
    try {
      const r = await fetch(`/api/admin/devis/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prix: newPrix }),
      });
      const d = await r.json();
      if (d.ok && d.draft_order) {
        setDraft(d.draft_order);
        setNewPrix(d.draft_order.total_price ?? "");
        setEditingPrix(false);
      } else alert("Erreur Shopify : " + (d.error ?? "inconnue"));
    } catch (e) {
      alert("Erreur réseau : " + String(e));
    } finally {
      setSavingPrix(false);
    }
  }

  async function uploadSvg(file: File) {
    setUploadingsvg(true);
    setUploadMsg(null);
    const r = await fetch(`/api/admin/devis/${id}/svg`, {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: (() => { const f = new FormData(); f.append("svg", file); return f; })(),
    });
    const d = await r.json();
    setUploadingsvg(false);
    if (d.ok) { setUploadMsg("✓ Design mis à jour"); load(); }
    else setUploadMsg("Erreur : " + (d.error ?? "inconnue"));
  }

  async function envoyerDevis() {
    setSendingDevis(true);
    setDevisMsg(null);
    try {
      const r = await fetch(`/api/admin/devis/${id}/notifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: devisMessage }),
      });
      const d = await r.json();
      if (d.ok) { setDevisMsg(`✓ Devis envoyé à ${d.email}`); load(); }
      else setDevisMsg("Erreur : " + (d.error ?? "inconnue"));
    } catch (e) {
      setDevisMsg("Erreur réseau : " + String(e));
    } finally {
      setSendingDevis(false);
    }
  }

  async function envoyerFacture() {
    setSendingFacture(true);
    setFactureMsg(null);
    const r = await fetch(`/api/admin/devis/${id}/envoyer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: factureMessage }),
    });
    const d = await r.json();
    setSendingFacture(false);
    if (d.ok) { setFactureMsg(`✓ Facture envoyée à ${d.email}`); load(); }
    else setFactureMsg("Erreur : " + (d.error ?? "inconnue"));
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#09090b", color: "#71717a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>Chargement…</div>;
  if (error || !draft) return <div style={{ minHeight: "100vh", background: "#09090b", color: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>Erreur : {error}</div>;

  const li = draft.line_items?.[0];
  const props = li?.properties ?? [];
  const client = draft.customer
    ? `${draft.customer.first_name ?? ""} ${draft.customer.last_name ?? ""}`.trim() || draft.email
    : draft.email;
  const isValide = draft.status === "completed";

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button onClick={() => router.push("/admin/devis")} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "1.2rem", padding: 0 }}>←</button>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>{draft.name} — {client}</h1>
            <p style={{ color: "#71717a", fontSize: "0.78rem", margin: 0 }}>{draft.email}</p>
          </div>
          <span style={{ marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, color: isValide ? "#22c55e" : draft.status === "invoice_sent" ? "#f59e0b" : "#60a5fa" }}>
            {isValide ? "✓ Payé" : draft.status === "invoice_sent" ? "Facture envoyée" : "En attente"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Colonne gauche */}
          <div>
            {/* Prix */}
            <Section title="Prix du devis">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {editingPrix ? (
                  <>
                    <input
                      value={newPrix}
                      onChange={(e) => setNewPrix(e.target.value)}
                      style={{ background: "#09090b", border: "1px solid #c9a96e", borderRadius: 6, padding: "0.4rem 0.6rem", color: "#f4f4f5", fontSize: "1rem", width: 100 }}
                    />
                    <span style={{ color: "#71717a", fontSize: "0.85rem" }}>CHF</span>
                    <button onClick={savePrix} disabled={savingPrix} style={{ background: "#c9a96e", color: "#09090b", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                      {savingPrix ? "…" : "Sauvegarder"}
                    </button>
                    <button onClick={() => setEditingPrix(false)} style={{ background: "none", color: "#71717a", border: "1px solid #27272a", borderRadius: 6, padding: "0.4rem 0.6rem", cursor: "pointer", fontSize: "0.82rem" }}>Annuler</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c9a96e" }}>{Number(draft.total_price).toFixed(2)} CHF</span>
                    {!isValide && (
                      <button onClick={() => { setEditingPrix(true); setNewPrix(draft.total_price); }} style={{ background: "#27272a", color: "#a1a1aa", border: "none", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.78rem" }}>
                        ✏️ Modifier
                      </button>
                    )}
                  </>
                )}
              </div>
            </Section>

            {/* Client */}
            <Section title="Client">
              <Row label="Nom" value={client} />
              <Row label="Email" value={draft.email} />
            </Section>

            {/* Propriétés produit */}
            <Section title="Détails de la commande">
              {props.length === 0 ? (
                <p style={{ color: "#52525b", fontSize: "0.82rem" }}>Aucune propriété</p>
              ) : (
                props.map((p) => <Row key={p.name} label={p.name} value={p.value} />)
              )}
            </Section>

            {/* Note */}
            {draft.note && (
              <Section title="Note interne">
                <p style={{ color: "#a1a1aa", fontSize: "0.82rem", whiteSpace: "pre-wrap", margin: 0 }}>{draft.note}</p>
              </Section>
            )}

            {/* Timeline */}
            {draft.note && (() => {
              const lines = draft.note.split("\n").filter((l) => l.startsWith("▸"));
              if (!lines.length) return null;
              return (
                <Section title="Historique">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {lines.map((l, i) => {
                      const [, ts, ...rest] = l.match(/▸\s+(.+?)\s+—\s+(.+)/) ?? [null, "", l.slice(2)];
                      return (
                        <div key={i} style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem" }}>
                          <span style={{ color: "#52525b", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ts}</span>
                          <span style={{ color: "#a1a1aa" }}>{rest.join(" — ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              );
            })()}

            {/* Envoyer le devis (email design + prix) */}
            {!isValide && (
              <Section title="Envoyer le devis au client">
                <textarea
                  value={devisMessage}
                  onChange={(e) => setDevisMessage(e.target.value)}
                  rows={3}
                  style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, padding: "0.5rem", color: "#f4f4f5", fontSize: "0.82rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <button
                  onClick={envoyerDevis}
                  disabled={sendingDevis}
                  style={{ marginTop: "0.5rem", background: "#3f3f46", color: "#e4e4e7", border: "none", borderRadius: 6, padding: "0.5rem 1.2rem", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", width: "100%" }}
                >
                  {sendingDevis ? "Envoi…" : "✉️ Envoyer le devis (design + prix)"}
                </button>
                {devisMsg && <p style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: devisMsg.startsWith("✓") ? "#22c55e" : "#fca5a5" }}>{devisMsg}</p>}
              </Section>
            )}

            {/* Envoyer la facture */}
            {!isValide && (
              <Section title="Envoyer la facture de paiement">
                <textarea
                  value={factureMessage}
                  onChange={(e) => setFactureMessage(e.target.value)}
                  rows={3}
                  style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, padding: "0.5rem", color: "#f4f4f5", fontSize: "0.82rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <button
                  onClick={envoyerFacture}
                  disabled={sendingFacture}
                  style={{ marginTop: "0.5rem", background: "#c9a96e", color: "#09090b", border: "none", borderRadius: 6, padding: "0.5rem 1.2rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}
                >
                  {sendingFacture ? "Envoi…" : "📨 Envoyer la facture"}
                </button>
                {factureMsg && <p style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: factureMsg.startsWith("✓") ? "#22c55e" : "#fca5a5" }}>{factureMsg}</p>}
              </Section>
            )}
          </div>

          {/* Colonne droite — Design SVG */}
          <div>
            <Section title="Design SVG">
              {svgContent ? (
                <div
                  style={{ background: "#09090b", borderRadius: 8, padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 260 }}
                  dangerouslySetInnerHTML={{ __html: svgContent.replace(/<\?xml[^>]*\?>/g, "") }}
                />
              ) : (
                <div style={{ background: "#09090b", borderRadius: 8, padding: "2rem", textAlign: "center", color: "#52525b", fontSize: "0.82rem", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Design non disponible
                </div>
              )}

              {/* Upload SVG */}
              {!isValide && (
                <div style={{ marginTop: "0.75rem" }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSvg(f); }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingsvg}
                    style={{ background: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46", borderRadius: 6, padding: "0.45rem 1rem", cursor: "pointer", fontSize: "0.82rem", width: "100%" }}
                  >
                    {uploadingsvg ? "Upload…" : "📁 Remplacer le design (SVG)"}
                  </button>
                  {uploadMsg && <p style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: uploadMsg.startsWith("✓") ? "#22c55e" : "#fca5a5" }}>{uploadMsg}</p>}
                </div>
              )}
            </Section>

            {/* Tags */}
            <Section title="Tags">
              {draft.tags.split(",").filter(Boolean).map((t) => (
                <Pill key={t}>{t.trim()}</Pill>
              ))}
            </Section>

            {/* Lien invoice Shopify */}
            {draft.invoice_url && (
              <Section title="Lien de paiement">
                <a href={draft.invoice_url} target="_blank" rel="noreferrer" style={{ color: "#c9a96e", fontSize: "0.78rem", wordBreak: "break-all" }}>
                  {draft.invoice_url}
                </a>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
