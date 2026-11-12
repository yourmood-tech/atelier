// Prépare à l'avance la voix de toutes les phrases fixes du bonhomme (pour qu'il réponde sans attendre).
// À relancer après chaque modification des phrases :  node scripts/guide-voix-prechauffe.mjs
import fs from "fs";
const s = fs.readFileSync(new URL("../html/guide.html", import.meta.url), "utf8");
const js = s.split("<script>")[1].split("</script>")[0];
const pourDire = eval("(" + s.match(/function pourDire[\s\S]*?\.trim\(\); }/)[0] + ")");
const morceaux = eval("(" + s.match(/function morceaux[\s\S]*?return out; }/)[0] + ")");
const phrases = new Set();
for (const m of js.matchAll(/\bdit\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\)/g)) phrases.add(eval(m[1]));
const HUM = eval(js.match(/var HUM=(\[[\s\S]*?\n\]);/)[1]);
for (const h of HUM) phrases.add(h[2]);
const urls = [];
for (const p of phrases) for (const m of morceaux(pourDire(p))) urls.push("https://mood-tools.yourmood.net/api/guide/voix?t=" + encodeURIComponent(m.slice(0, 600)));
console.log(phrases.size, "phrases →", urls.length, "morceaux");
let ok = 0;
for (let i = 0; i < urls.length; i += 4) {
  const r = await Promise.all(urls.slice(i, i + 4).map((u) => fetch(u).then((x) => (x.arrayBuffer(), x.status)).catch(() => 0)));
  ok += r.filter((x) => x === 200).length;
}
console.log("prêts :", ok, "/", urls.length);
