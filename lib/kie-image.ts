// Moteur d'images sur le compte KIE de l'atelier (même modèle que Gemini 3 Pro Image = nano-banana-pro).
// Utilisé en priorité par la retouche quand KIE_API_KEY est présente ; sinon on garde Gemini direct.
const KIE_KEY = process.env.KIE_API_KEY;
const UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";
const JOBS = "https://api.kie.ai/api/v1/jobs";
const RATIOS_OK = new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);

export const kieDisponible = () => !!KIE_KEY;

async function envoyer(dataUrl: string, i: number): Promise<string> {
  const r = await fetch(UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ base64Data: dataUrl, uploadPath: "retouche", fileName: `ref-${Date.now()}-${i}.png` }),
  });
  const j = await r.json().catch(() => null);
  const u = j?.data?.downloadUrl;
  if (!u) throw new Error("envoi image KIE : " + JSON.stringify(j).slice(0, 160));
  return u;
}

export async function kieImage(dataUrls: string[], prompt: string, aspectRatio: string, taille: "1K" | "2K"): Promise<{ image?: string; error?: string }> {
  if (!KIE_KEY) return { error: "KIE_API_KEY absente" };
  try {
    const urls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) urls.push(await envoyer(dataUrls[i], i));
    const input = { prompt, image_input: urls, aspect_ratio: RATIOS_OK.has(aspectRatio) ? aspectRatio : "1:1", resolution: taille, output_format: "png" };
    const cr = await fetch(`${JOBS}/createTask`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nano-banana-pro", input }),
    });
    const cj = await cr.json().catch(() => null);
    const taskId = cj?.data?.taskId;
    if (!taskId) return { error: "KIE : " + (cj?.msg || JSON.stringify(cj).slice(0, 160)) };
    const debut = Date.now();
    while (Date.now() - debut < 250000) {
      await new Promise((r) => setTimeout(r, 3000));
      const pr = await fetch(`${JOBS}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${KIE_KEY}` } });
      const d = (await pr.json().catch(() => null))?.data;
      const st = String(d?.state || "").toLowerCase();
      if (st === "success") {
        const rj = typeof d.resultJson === "string" ? JSON.parse(d.resultJson) : d.resultJson;
        const out = (rj?.resultUrls || rj?.result_urls || [])[0];
        if (!out) return { error: "KIE : pas d'image en sortie" };
        const img = await fetch(out);
        const buf = Buffer.from(await img.arrayBuffer());
        const mime = img.headers.get("content-type") || "image/png";
        return { image: `data:${mime};base64,${buf.toString("base64")}` };
      }
      if (st === "fail" || st === "failed") return { error: "KIE : " + (d?.failMsg || d?.failCode || "échec") };
    }
    return { error: "KIE : délai dépassé" };
  } catch (e) {
    return { error: String((e as Error)?.message || e) };
  }
}
