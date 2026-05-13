import Link from "next/link";

type Tool = {
  href: string;
  emoji: string;
  title: string;
  description: string;
};

const sections: { id: string; title: string; summary: string; tools: Tool[] }[] = [
  {
    id: "atelier",
    title: "Outils Atelier",
    summary: "Production, impression des bons, rassemblement des commandes et ordres d'achat Icelea.",
    tools: [
      {
        href: "/scanner",
        emoji: "📦",
        title: "Scanner atelier",
        description: "Scannez un produit Shopify pour voir sa recette Katana et lancer une production.",
      },
      {
        href: "/reprint",
        emoji: "🖨️",
        title: "Réimpression",
        description: "Réimprimez le bon de fabrication d'une commande existante, par processus ou en mode complet.",
      },
      {
        href: "/rassemblement",
        emoji: "🗂️",
        title: "Rassemblement",
        description: "Préparez une commande article par article. Coffrets et packs gérés avec compteur progressif.",
      },
      {
        href: "/fulfillment",
        emoji: "✅",
        title: "Fulfillment",
        description: "Fulfillment rapide par scanner : articles expédiés, numéro de suivi Swiss Post, validation en quelques secondes.",
      },
      {
        href: "/icelea-po",
        emoji: "🛒",
        title: "Commande Icelea",
        description: "Créez un ordre d'achat Icelea depuis Katana : scan produit, choix taille, confirmation ingrédients.",
      },
    ],
  },
  {
    id: "creation",
    title: "Création de produits",
    summary: "Mise en ligne Shopify, bundles CSV et édition des recettes Katana.",
    tools: [
      {
        href: "/product-creator",
        emoji: "💍",
        title: "Créer un produit Shopify",
        description: "Créez un produit, un coffret ou un pack directement dans Shopify : SKU, variantes, SEO et photos en un formulaire.",
      },
      {
        href: "/bundles",
        emoji: "🎁",
        title: "Générateur de bundles",
        description: "Créez les CSV d'import pour Simple Bundles & Kits, variant par variant, avec filtre par option.",
      },
      {
        href: "/recipes",
        emoji: "⚗️",
        title: "Éditeur de recettes",
        description: "Consultez et éditez les recettes de fabrication Katana sans passer par l'application.",
      },
    ],
  },
  {
    id: "boutiques",
    title: "Outils Boutiques",
    summary: "Inventaire en boutique et correction de fulfillments pour les équipes en point de vente.",
    tools: [
      {
        href: "/stock",
        emoji: "📊",
        title: "Scanner stock",
        description: "Inventaire rapide par scan : comptez les unités, suivez les batches de production, gérez les délais fournisseurs.",
      },
      {
        href: "/unfulfill",
        emoji: "↩️",
        title: "Unfulfill",
        description: "Annulez un fulfillment pour corriger une erreur d'expédition ou relancer la production d'un article.",
      },
    ],
  },
  {
    id: "stats",
    title: "Stats & Conditions",
    summary: "Analyse des stats hebdomadaires MasterTech, identification de condition et Battle Plan personnalisé.",
    tools: [
      {
        href: "/stats-conditions",
        emoji: "📈",
        title: "Analyser mes stats",
        description: "Uploadez une capture MasterTech, obtenez la condition (Affluence, Urgence…), le plan d'action et un Battle Plan jeudi→mercredi.",
      },
    ],
  },
  {
    id: "rd",
    title: "R&D & Création",
    summary: "Pipeline de création produits, planning annuel et brainstorm IA.",
    tools: [
      {
        href: "/r-and-d",
        emoji: "🎨",
        title: "Pipeline R&D",
        description: "Calendrier annuel jeudi→mercredi pour planifier les nouveautés. Suivi des 9 étapes (idée → mise en ligne) + objectifs CA mensuels par produit.",
      },
      {
        href: "/offres",
        emoji: "🎁",
        title: "Offres par nouveauté",
        description: "Vue orientée offres pour Stéphanie : champ libre par produit R&D, synchro auto avec le pipeline. Ventes Shopify de la semaine pour décider en fonction du succès.",
      },
      {
        href: "/perso",
        emoji: "🖋️",
        title: "Personnalisation",
        description: "Vectorise les empreintes / dessins clients en SVG dimensionné selon format et taille. Génère le fichier prêt pour Illustrator/Gravograph.",
      },
    ],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
    >
      <span className="text-xl leading-none mt-0.5 shrink-0">{tool.emoji}</span>
      <div className="min-w-0">
        <p className="font-semibold text-zinc-100 group-hover:text-white text-sm mb-0.5">
          {tool.title}
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <span className="ml-auto text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 self-center">
        →
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
            Mood Collection
          </p>
          <h1 className="text-3xl font-semibold text-zinc-50 mb-3">
            Mood Dashboard
          </h1>
          <p className="text-zinc-400 text-base">
            Tous les outils internes — atelier, produits Shopify, stats et conditions.
          </p>
        </header>

        {/* Table des matières */}
        <nav className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-1">
                {s.title}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {s.summary}
              </p>
            </a>
          ))}
        </nav>

        {/* Sections — 3 colonnes sur grand écran */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">
                {section.title}
              </h2>
              <div className="flex flex-col gap-2.5">
                {section.tools.map((tool) => (
                  <ToolCard key={tool.href + tool.title} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  );
}
