import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function SondageAdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sheetUrl = process.env.GOOGLE_SHEET_URL
    || "https://docs.google.com/spreadsheets/d/1JVAOQFcEUz4kgvF8LWFwk5VGYpSeX03lPc2zEi0JkRc/edit";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
          Mood Collection — Sondage clientes
        </p>
        <h1 className="text-3xl font-semibold text-zinc-50 mb-6">
          Tes réponses sondage 💌
        </h1>

        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Toutes les réponses au sondage arrivent en temps réel dans ton Google Sheet personnel.
          Tu peux filtrer, trier, exporter, faire des graphiques — tout est à toi.
        </p>

        {sheetUrl ? (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-amber-700 hover:bg-amber-600 transition-colors text-white px-6 py-3 rounded-lg text-sm font-medium mb-8"
          >
            📊 Ouvrir mon Google Sheet
          </a>
        ) : (
          <div className="border border-amber-700/30 bg-amber-950/20 rounded-xl p-5 mb-8">
            <p className="text-sm text-amber-300 mb-2 font-medium">
              ⚠️ Le lien vers ton Sheet n&apos;est pas encore configuré
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Demande à Claude de hardcoder ton URL Google Sheet dans le code, ou ajoute la variable{" "}
              <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-amber-400">GOOGLE_SHEET_URL</code>{" "}
              dans Vercel (Project Settings → Environment Variables).
            </p>
          </div>
        )}

        <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-5">
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">
            🎁 Côté Shopify
          </p>
          <p className="text-sm text-zinc-300 mb-2">
            Code promo actif :{" "}
            <code className="bg-zinc-800 px-2 py-0.5 rounded text-amber-400 font-mono">MERCIAVOUS20</code>
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            20 CHF dès 50 CHF d&apos;achat · 1 fois par cliente · 60 jours
          </p>
        </div>

        <p className="text-xs text-zinc-600 mt-8 text-center">
          Le lien public du sondage :{" "}
          <a href="/sondage" target="_blank" className="text-zinc-400 hover:text-zinc-200 underline">
            /sondage
          </a>
        </p>
      </div>
    </main>
  );
}
