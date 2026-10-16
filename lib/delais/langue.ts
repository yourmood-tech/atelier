// Langue du message de la cliente (décision Philippe 16.10.2026 : on répond dans la langue où elle
// écrit ; la langue du profil Shopify ne sert que si le message ne permet pas de trancher).
const MOTS: Record<string, string[]> = {
  fr: ["bonjour", "merci", "commande", "je", "vous", "pour", "pas", "est", "les", "une", "ma", "mon", "taille", "avec", "que", "cordialement", "madame", "monsieur"],
  de: ["guten", "hallo", "danke", "bestellung", "ich", "sie", "nicht", "und", "die", "der", "das", "mit", "meine", "grüsse", "grüße", "freundliche", "liebe"],
  en: ["hello", "hi", "thank", "thanks", "order", "the", "my", "you", "please", "and", "not", "with", "size", "regards", "dear"],
  it: ["buongiorno", "ciao", "grazie", "ordine", "il", "la", "mio", "mia", "non", "per", "con", "cordiali", "saluti"],
  es: ["hola", "gracias", "pedido", "mi", "el", "los", "por", "con", "saludos"],
};

export function langueDuMessage(texte: string): string | null {
  // formulaire de contact Shopify : l'en-tête est toujours en français, seul le « Corps » compte
  const corps = (texte || "").split(/Corps\s*:/i).pop() ?? "";
  const mots = corps.toLowerCase().normalize("NFC").match(/[a-zàâäçéèêëîïôöùûüß]+/g) ?? [];
  if (mots.length < 3) return null;
  const score: Record<string, number> = {};
  for (const [l, liste] of Object.entries(MOTS)) score[l] = mots.filter((m) => liste.includes(m)).length;
  const tri = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (tri[0][1] < 2 || tri[0][1] < 1.5 * (tri[1]?.[1] ?? 0)) return null;   // pas assez net
  return tri[0][0];
}
