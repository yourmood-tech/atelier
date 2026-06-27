// Réduit les avatars à ~512px + compression PNG → repo léger.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DIR = "/Users/amila/YourRender/atelier/public/avatars";
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
let n = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  const buf = await sharp(p).resize({ width: 512, height: 512, fit: "inside" }).png({ quality: 80, compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(p, buf);
  n++;
}
console.log(`optimisé ${n} images`);
