"use client";

import { useState, useEffect } from "react";

type Commande = {
  designId: string;
  date: string;
  prenom: string;
  email: string;
  tel?: string;
  message?: string;
  format: string;
  couleur: string;
  couleurNom?: string;
  taille?: string;
  nbElements?: number;
  variantId?: number;
  cartUrl?: string;
};

const FORMAT_LABEL: Record<string, string> = {
  "addon": "Addon (7 mm)",
  "2-3": "Deux tiers (4.6 mm)",
  "medium": "Medium (2.3 mm)",
  "open-mood": "Open mood (10 mm)",
};

export default function PersoCommandesPage() {
  const [commandes, setCommandes] = useState<Commande[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/perso-commandes")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setCommandes(d.commandes || []);
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Commandes personnalisées</h1>
          <button
            onClick={() => location.reload()}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            🔄 Actualiser
          </button>
        </div>

        {error && <p className="text-red-400 mb-4">Erreur : {error}</p>}
        {commandes === null && !error && <p className="text-zinc-500">Chargement…</p>}
        {commandes && commandes.length === 0 && (
          <p className="text-zinc-500">Aucune commande personnalisée pour l'instant.</p>
        )}

        {commandes && commandes.length > 0 && (
          <>
            <p className="text-sm text-zinc-400 mb-4">{commandes.length} commande{commandes.length > 1 ? "s" : ""} reçue{commandes.length > 1 ? "s" : ""}</p>
            <div className="grid gap-4">
              {commandes.map((c) => (
                <div key={c.designId} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                  {/* Aperçu SVG */}
                  <div className="bg-white rounded-lg p-3 md:w-72 flex items-center justify-center" style={{ aspectRatio: "3/1" }}>
                    <img
                      src={`/api/design/${c.designId}`}
                      alt="Design"
                      className="max-w-full max-h-full"
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="col-span-2 mb-2">
                      <h3 className="font-semibold text-zinc-100">{c.prenom}</h3>
                      <p className="text-xs text-zinc-500">{new Date(c.date).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" })}</p>
                    </div>
                    <div><span className="text-zinc-500">Email :</span> <a href={`mailto:${c.email}`} className="text-amber-400 hover:underline">{c.email}</a></div>
                    {c.tel && <div><span className="text-zinc-500">Tél :</span> {c.tel}</div>}
                    <div><span className="text-zinc-500">Format :</span> {FORMAT_LABEL[c.format] || c.format}</div>
                    <div><span className="text-zinc-500">Couleur :</span> {c.couleurNom || c.couleur}</div>
                    <div><span className="text-zinc-500">Taille :</span> <strong className="text-amber-400">{c.taille}</strong></div>
                    <div><span className="text-zinc-500">Éléments :</span> {c.nbElements || "—"}</div>
                    {c.message && <div className="col-span-2 mt-1"><span className="text-zinc-500">Message :</span> <em className="text-zinc-300">{c.message}</em></div>}
                  </div>

                  {/* Actions */}
                  <div className="md:w-44 flex flex-col gap-2">
                    <a
                      href={`/api/design/${c.designId}`}
                      download={`${c.prenom}_${c.format}_${c.couleur}.svg`}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-sm text-center"
                    >
                      📥 Télécharger SVG
                    </a>
                    <a
                      href={`/api/design/${c.designId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-sm text-center"
                    >
                      👁️ Voir en grand
                    </a>
                    {c.cartUrl && (
                      <a
                        href={c.cartUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-300 text-center"
                      >
                        Lien cart Shopify ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
