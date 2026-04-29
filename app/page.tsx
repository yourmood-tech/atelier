import Link from "next/link";

const tools = [
  {
    href: "/scanner",
    emoji: "📦",
    title: "Scanner de recettes",
    description: "Scannez un produit Shopify pour voir sa recette Katana, lancer une production ou enregistrer un mouvement de stock.",
  },
  {
    href: "/fulfillment",
    emoji: "✅",
    title: "Fulfillment",
    description: "Fulfillment rapide par scanner : sélectionnez les articles expédiés, ajoutez un numéro de suivi Swiss Post, validez en quelques secondes.",
  },
  {
    href: "/rassemblement",
    emoji: "🗂️",
    title: "Rassemblement",
    description: "Préparez une commande article par article. Scannez ou sélectionnez chaque produit prêt — les coffrets et packs sont gérés avec compteur progressif.",
  },
  {
    href: "/reprint",
    emoji: "🖨️",
    title: "Réimpression",
    description: "Réimprimez le bon de fabrication d'une commande existante, par processus ou en mode complet.",
  },
  {
    href: "/icelea-po",
    emoji: "🛒",
    title: "Commande Icelea",
    description: "Créez un ordre d'achat Icelea directement depuis Katana : scannez le produit Shopify, choisissez la taille, confirmez les ingrédients et soumettez.",
  },
  {
    href: "/bundles",
    emoji: "🎁",
    title: "Générateur de bundles",
    description: "Créez les fichiers CSV d'import pour Simple Bundles & Kits. Associez un produit bundle à ses composants variant par variant, filtrez par option.",
  },
  {
    href: "/recipes",
    emoji: "⚗️",
    title: "Éditeur de recettes",
    description: "Consultez et éditez les recettes de fabrication Katana depuis l'interface web, sans passer par l'application Katana.",
  },
  {
    href: "/stock",
    emoji: "📊",
    title: "Scanner stock",
    description: "Inventaire rapide par scan : comptez les unités en stock, suivez les batches de production, gérez les délais fournisseurs.",
  },
  {
    href: "/unfulfill",
    emoji: "↩️",
    title: "Unfulfill",
    description: "Annulez un fulfillment Shopify existant pour corriger une erreur d'expédition ou relancer la production d'un article.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
            Mood Collection — Atelier
          </p>
          <h1 className="text-3xl font-semibold text-zinc-50 mb-3">
            Outils de production
          </h1>
          <p className="text-zinc-400 text-base">
            Tous les outils opérationnels de l&apos;atelier, du fulfillment et de la gestion Katana.
          </p>
        </header>

        <nav className="grid gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
            >
              <span className="text-2xl leading-none mt-0.5 shrink-0">{tool.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100 group-hover:text-white mb-0.5">
                  {tool.title}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>
              <span className="ml-auto text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 self-center text-lg">
                →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
