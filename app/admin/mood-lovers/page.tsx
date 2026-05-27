"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type Compo = {
  id: string;
  name: string;
  city: string;
  description: string | null;
  instagram: string | null;
  image_url: string;
  approved: boolean;
  created_at: string;
};

type Data = {
  pending: Compo[];
  approved: Compo[];
  voteCounts: Record<string, number>;
  error?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: "1rem 1.25rem" }}>
      <div style={{ fontSize: "0.72rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#c9a96e", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#52525b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function CompoCard({
  c,
  votes,
  onApprove,
  onReject,
  pending,
}: {
  c: Compo;
  votes: number;
  onApprove?: () => void;
  onReject?: () => void;
  pending?: boolean;
}) {
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", paddingBottom: "100%", background: "#09090b" }}>
        <Image
          src={c.image_url}
          alt={c.name}
          fill
          style={{ objectFit: "cover" }}
          sizes="300px"
          unoptimized
        />
      </div>
      <div style={{ padding: "0.85rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 600, color: "#f4f4f5", fontSize: "0.9rem" }}>{c.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#71717a" }}>📍 {c.city}</div>
          </div>
          {!onApprove && (
            <span style={{ fontSize: "0.72rem", color: "#c9a96e", fontWeight: 600, whiteSpace: "nowrap" }}>
              ❤️ {votes}
            </span>
          )}
        </div>
        {c.description && (
          <div style={{ fontSize: "0.78rem", color: "#a1a1aa", lineHeight: 1.5, marginBottom: 8 }}>{c.description}</div>
        )}
        {c.instagram && (
          <div style={{ fontSize: "0.72rem", color: "#52525b", marginBottom: 8 }}>{c.instagram}</div>
        )}
        <div style={{ fontSize: "0.68rem", color: "#3f3f46", marginBottom: onApprove ? 10 : 0 }}>{formatDate(c.created_at)}</div>
        {onApprove && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onApprove}
              disabled={pending}
              style={{ flex: 1, background: "#166534", border: "none", borderRadius: 7, padding: "0.5rem", color: "#bbf7d0", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", opacity: pending ? 0.5 : 1 }}
            >
              ✓ Publier
            </button>
            <button
              onClick={onReject}
              disabled={pending}
              style={{ flex: 1, background: "#7f1d1d", border: "none", borderRadius: 7, padding: "0.5rem", color: "#fecaca", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", opacity: pending ? 0.5 : 1 }}
            >
              ✕ Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#c9a96e" : "transparent",
        border: `1px solid ${active ? "#c9a96e" : "#27272a"}`,
        borderRadius: 8,
        padding: "0.45rem 1rem",
        color: active ? "#09090b" : "#71717a",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export default function MoodLoversAdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "published" | "analytics">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/mood-lovers");
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    await fetch("/api/admin/mood-lovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActing(null);
    load();
  }

  const S = {
    page: { minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" } as React.CSSProperties,
    header: { borderBottom: "1px solid #18181b", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
    title: { fontSize: "1.05rem", fontWeight: 700, color: "#f4f4f5" } as React.CSSProperties,
    sub: { fontSize: "0.75rem", color: "#52525b" } as React.CSSProperties,
    body: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem" } as React.CSSProperties,
    tabs: { display: "flex", gap: 8, marginBottom: "1.5rem" } as React.CSSProperties,
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" } as React.CSSProperties,
    metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" } as React.CSSProperties,
    empty: { textAlign: "center" as const, padding: "3rem 0", color: "#3f3f46", fontSize: "0.9rem" },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" },
    th: { textAlign: "left" as const, padding: "0.5rem 0.75rem", color: "#52525b", fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid #27272a" },
    td: { padding: "0.6rem 0.75rem", borderBottom: "1px solid #18181b", color: "#a1a1aa" },
    sectionTitle: { fontSize: "0.78rem", fontWeight: 600, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.75rem", marginTop: "1.5rem" },
  };

  if (loading && !data) {
    return (
      <div style={S.page}>
        <div style={{ ...S.body, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ color: "#52525b" }}>Chargement…</div>
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div style={S.page}>
        <div style={S.body}>
          <div style={{ background: "#7f1d1d", borderRadius: 10, padding: "1rem", color: "#fecaca", fontSize: "0.85rem" }}>
            ⚠️ {data.error}
          </div>
        </div>
      </div>
    );
  }

  const { pending = [], approved = [], voteCounts = {} } = data ?? {};

  // Analytics
  const totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0);
  const cities = new Set([...pending, ...approved].map((c) => c.city)).size;
  const totalAll = pending.length + approved.length;
  const validationRate = totalAll > 0 ? Math.round((approved.length / totalAll) * 100) : 0;

  const contributors: Record<string, { count: number; city: string; votes: number }> = {};
  approved.forEach((c) => {
    if (!contributors[c.name]) contributors[c.name] = { count: 0, city: c.city, votes: 0 };
    contributors[c.name].count++;
    contributors[c.name].votes += voteCounts[c.id] || 0;
  });
  const topContributors = Object.entries(contributors)
    .sort(([, a], [, b]) => b.count - a.count || b.votes - a.votes)
    .slice(0, 8);

  const topByVotes = [...approved]
    .map((c) => ({ ...c, votes: voteCounts[c.id] || 0 }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8);

  // Submissions by week (last 8 weeks)
  const weekMap: Record<string, number> = {};
  [...pending, ...approved].forEach((c) => {
    const d = new Date(c.created_at);
    const mon = new Date(d);
    mon.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    const key = mon.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" });
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const weekEntries = Object.entries(weekMap).slice(-8);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.title}>🫶 Mood Lovers · Galerie Admin</div>
          <div style={S.sub}>Modération des compos · Analytics · {totalAll} soumissions au total</div>
        </div>
        <button
          onClick={load}
          style={{ background: "transparent", border: "1px solid #27272a", borderRadius: 7, padding: "0.4rem 0.9rem", color: "#71717a", fontSize: "0.78rem", cursor: "pointer" }}
        >
          ↻ Actualiser
        </button>
      </div>

      <div style={S.body}>
        <div style={S.tabs}>
          <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
            En attente {pending.length > 0 && `(${pending.length})`}
          </TabBtn>
          <TabBtn active={tab === "published"} onClick={() => setTab("published")}>
            Publiées ({approved.length})
          </TabBtn>
          <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")}>
            Analytics
          </TabBtn>
        </div>

        {tab === "pending" && (
          pending.length === 0 ? (
            <div style={S.empty}>✓ Aucune compo en attente de validation</div>
          ) : (
            <div style={S.grid}>
              {pending.map((c) => (
                <CompoCard
                  key={c.id}
                  c={c}
                  votes={0}
                  onApprove={() => act(c.id, "approve")}
                  onReject={() => act(c.id, "reject")}
                  pending={acting === c.id}
                />
              ))}
            </div>
          )
        )}

        {tab === "published" && (
          approved.length === 0 ? (
            <div style={S.empty}>Aucune compo publiée pour l'instant</div>
          ) : (
            <div style={S.grid}>
              {approved.map((c) => (
                <CompoCard key={c.id} c={c} votes={voteCounts[c.id] || 0} />
              ))}
            </div>
          )
        )}

        {tab === "analytics" && (
          <div>
            <div style={S.metricsGrid}>
              <MetricCard label="En attente" value={pending.length} sub="à valider" />
              <MetricCard label="Publiées" value={approved.length} sub="compos live" />
              <MetricCard label="Votes totaux" value={totalVotes} sub="❤️ cumulés" />
              <MetricCard label="Villes" value={cities} sub="représentées" />
              <MetricCard label="Taux validation" value={`${validationRate}%`} sub={`${approved.length}/${totalAll}`} />
            </div>

            {topContributors.length > 0 && (
              <>
                <div style={S.sectionTitle}>Top Mood Lovers</div>
                <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden", marginBottom: "1.5rem" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Mood Lover</th>
                        <th style={S.th}>Ville</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Compos</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Votes reçus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topContributors.map(([name, { count, city, votes }], i) => (
                        <tr key={name}>
                          <td style={{ ...S.td, color: "#3f3f46", width: 30 }}>{i + 1}</td>
                          <td style={{ ...S.td, color: "#f4f4f5", fontWeight: 500 }}>{name}</td>
                          <td style={S.td}>{city}</td>
                          <td style={{ ...S.td, textAlign: "right", color: "#c9a96e", fontWeight: 600 }}>{count}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>❤️ {votes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {topByVotes.length > 0 && (
              <>
                <div style={S.sectionTitle}>Compos les plus aimées</div>
                <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, overflow: "hidden", marginBottom: "1.5rem" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Mood Lover</th>
                        <th style={S.th}>Ville</th>
                        <th style={S.th}>Compo</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topByVotes.map((c, i) => (
                        <tr key={c.id}>
                          <td style={{ ...S.td, color: "#3f3f46", width: 30 }}>{i + 1}</td>
                          <td style={{ ...S.td, color: "#f4f4f5", fontWeight: 500 }}>{c.name}</td>
                          <td style={S.td}>{c.city}</td>
                          <td style={{ ...S.td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description ?? "—"}</td>
                          <td style={{ ...S.td, textAlign: "right", color: "#c9a96e", fontWeight: 600 }}>❤️ {c.votes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {weekEntries.length > 0 && (
              <>
                <div style={S.sectionTitle}>Soumissions par semaine</div>
                <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                    {weekEntries.map(([week, count]) => {
                      const max = Math.max(...weekEntries.map(([, c]) => c), 1);
                      const h = Math.round((count / max) * 68);
                      return (
                        <div key={week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: "0.65rem", color: "#c9a96e", fontWeight: 600 }}>{count}</div>
                          <div style={{ width: "100%", height: h, background: "#c9a96e", borderRadius: "3px 3px 0 0", opacity: 0.75 }} />
                          <div style={{ fontSize: "0.6rem", color: "#3f3f46", whiteSpace: "nowrap" }}>{week}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
