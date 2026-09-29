import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Maquette de la page « On n'en a jamais trop » — lien à montrer à l'équipe.
const PAGE = String.raw`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>On n'en a jamais trop — mood</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#F6F5F2;color:#16161A;}
body{font-family:'Jost','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
a{color:inherit;text-decoration:none}
.w{max-width:1180px;margin:0 auto;padding:0 32px}
:root{--turq:#7EC8C8;--turq-pale:#DFF1F1;--gris:#6E6E76}

header.h{padding:86px 0 0;text-align:center}
.kick{font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gris)}
h1{font-size:clamp(42px,7.4vw,96px);line-height:.96;font-weight:200;margin:22px 0 0;letter-spacing:-.025em}
h1 b{font-weight:500}
.sub{font-size:17px;font-weight:300;color:#43434C;max-width:46ch;margin:26px auto 0}
.prixligne{display:flex;align-items:baseline;justify-content:center;gap:16px;margin:34px 0 0}
.avant{font-size:17px;color:#9A9AA2;text-decoration:line-through;font-weight:300}
.apres{font-size:40px;font-weight:500;letter-spacing:-.02em}
.cta{display:inline-flex;align-items:center;height:56px;padding:0 38px;margin-top:26px;background:#16161A;color:#F6F5F2;
 font-size:11px;letter-spacing:.24em;text-transform:uppercase;border-radius:2px;transition:.3s}
.cta:hover{background:var(--turq);color:#16161A}
.compte{margin-top:16px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--gris)}

.massue{margin:88px 0 0;background:#16161A;color:#F6F5F2;padding:72px 0}
.massue p{max-width:20ch;margin:0 auto;text-align:center;font-size:clamp(26px,3.6vw,44px);font-weight:200;line-height:1.24;letter-spacing:-.01em}
.massue p b{font-weight:500}

section{padding:86px 0 0}
.eb{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gris);text-align:center}
h2{font-size:clamp(26px,3.4vw,40px);font-weight:200;text-align:center;margin:14px 0 0;letter-spacing:-.015em}
.lede{max-width:56ch;margin:20px auto 0;text-align:center;color:#4A4A53;font-weight:300}

.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#E4E2DD;margin-top:44px;border:1px solid #E4E2DD}
.trio div{background:#F6F5F2;padding:40px 30px;text-align:center}
.trio .t{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--gris)}
.trio .d{margin-top:14px;font-size:19px;font-weight:300;line-height:1.45}

.grille{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:48px}
.p{display:block;text-align:center}
.pim{display:block;position:relative;aspect-ratio:1/1;background:#EFEDE8;border-radius:2px;overflow:hidden}
.pim img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.p:hover .pim img{transform:scale(1.06)}
.pq{display:inline-block;margin-top:14px;font-size:11px;letter-spacing:.2em;color:#16161A;background:var(--turq-pale);padding:3px 9px;border-radius:99px}
.pn{display:block;margin-top:8px;font-size:14px;font-weight:300}
.pp{display:block;margin-top:3px;font-size:13px;color:var(--gris)}

.boite{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;margin-top:48px}
.boite .ph{aspect-ratio:4/3;border-radius:3px;background:linear-gradient(150deg,#DFF1F1,#BFE4E4 60%,#A9DADA);
 display:flex;align-items:center;justify-content:center;color:#3E6E6E;font-size:11px;letter-spacing:.24em;text-transform:uppercase}
.boite h3{font-size:clamp(24px,3vw,34px);font-weight:200;margin:0 0 16px;letter-spacing:-.01em}
.boite p{color:#4A4A53;font-weight:300;margin:0 0 12px}

.calc{margin-top:48px;border:1px solid #E4E2DD;border-radius:3px;max-width:640px;margin-left:auto;margin-right:auto;background:#FBFAF8}
.calc .l{display:flex;justify-content:space-between;padding:15px 26px;border-bottom:1px solid #EDEBE6;font-weight:300;font-size:15px}
.calc .l:last-child{border:0}
.calc .tot{background:#16161A;color:#F6F5F2;font-weight:400}
.calc .tot span:last-child{font-weight:500}

.chiffres{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#E4E2DD;margin-top:48px;border:1px solid #E4E2DD}
.chiffres div{background:#F6F5F2;padding:34px 12px;text-align:center}
.chiffres .n{font-size:34px;font-weight:300;letter-spacing:-.02em}
.chiffres .q{margin-top:6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gris)}

.faq{max-width:760px;margin:44px auto 0}
.faq details{border-bottom:1px solid #E4E2DD;padding:18px 0}
.faq summary{cursor:pointer;list-style:none;font-size:16px;font-weight:400}
.faq summary::-webkit-details-marker{display:none}
.faq p{margin:12px 0 0;color:#4A4A53;font-weight:300}

.fin{margin-top:96px;background:#16161A;color:#F6F5F2;padding:86px 0;text-align:center}
.fin h2{color:#F6F5F2;margin:0}
.fin .cta{background:#F6F5F2;color:#16161A;margin-top:30px}
.fin .cta:hover{background:var(--turq)}
footer{padding:28px 0 54px;text-align:center;color:#9A9AA2;font-size:11px;letter-spacing:.2em;text-transform:uppercase}

@media(max-width:900px){
 .w{padding:0 20px}
 .trio,.grille,.chiffres{grid-template-columns:repeat(2,1fr)}
 .boite{grid-template-columns:1fr;gap:26px}
}
</style>
</head><body>

<header class="h"><div class="w">
  <div class="kick">Deux jours · 300 box</div>
  <h1>On n'en a<br><b>jamais trop.</b></h1>
  <p class="sub">Sept essentiels mood. Ceux que vous portez déjà, ceux que vous cherchez au fond du tiroir le matin. Réunis neufs, dans une boîte de rangement turquoise clair.</p>
  <div class="prixligne"><span class="avant">512.–</span><span class="apres">160.–</span></div>
  <a class="cta" href="https://www.yourmood.net/products/on-nen-a-jamais-trop-7-essentiels-mood-tout-neufs-dans-la-nouvelle-boite-turquoise">Je prends la mienne</a>
  <div class="compte">Il en reste <b id="reste">300</b></div>
</div></header>

<div class="massue"><div class="w">
  <p>Vous les avez déjà&nbsp;?<br><b>C'est précisément pour ça qu'on les a choisis.</b></p>
</div></div>

<section><div class="w">
  <div class="eb">Le principe</div>
  <h2>Il y a des choses qu'on possède déjà<br>et qu'on adore racheter.</h2>
  <div class="trio">
    <div><div class="t">La chemise</div><div class="d">Blanche. Impeccable. La même que la précédente.</div></div>
    <div><div class="t">Les baskets</div><div class="d">Exactement le modèle d'avant, en blanc qui n'a rien vu.</div></div>
    <div><div class="t">Les draps</div><div class="d">Changés le jeudi soir. Personne ne s'en lasse.</div></div>
  </div>
  <p class="lede">Ce n'est pas de la nouveauté. C'est mieux&nbsp;: le plaisir de retrouver ce qu'on aime, parfaitement neuf.<br>Vos froissés, vous les connaissez. Ils ont attrapé toutes les lumières. On vous les remet entre les mains — neufs.</p>
</div></section>

<section><div class="w">
  <div class="eb">Dans la box</div>
  <h2>Sept bijoux et la boîte de rangement.</h2>
  <div class="grille"><a class="p" href="https://www.yourmood.net/products/deux-tiers-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/products/froissegris.web.jpg?width=900" alt="Deux tiers en acier froissé"></span>
      <span class="pq">×1</span><span class="pn">Deux tiers en acier froissé</span><span class="pp">109.–</span></a><a class="p" href="https://www.yourmood.net/products/medium-en-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/products/medium-acier-medium-en-acier-froisse-1.jpg?width=900" alt="Medium en acier froissé"></span>
      <span class="pq">×2</span><span class="pn">Medium en acier froissé</span><span class="pp">77.– pièce</span></a><a class="p" href="https://www.yourmood.net/products/mini-acier-froisse" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/files/Bague_mood_interchangeable_addon_mini_acier_froisse.jpg?width=900" alt="Mini en acier froissé"></span>
      <span class="pq">×2</span><span class="pn">Mini en acier froissé</span><span class="pp">60.– pièce</span></a><a class="p" href="https://www.yourmood.net/products/addon-medium-blanc" target="_blank" rel="noopener">
      <span class="pim"><img loading="lazy" src="https://cdn.shopify.com/s/files/1/0798/2303/products/addon-medium-addon-medium-blanc-1.jpg?width=900" alt="Medium blanc"></span>
      <span class="pq">×2</span><span class="pn">Medium blanc</span><span class="pp">15.– pièce</span></a></div>
</div></section>

<section><div class="w">
  <div class="boite">
    <div class="ph">Photo de la boîte turquoise</div>
    <div>
      <div class="eb" style="text-align:left">La boîte de rangement</div>
      <h3 style="text-align:left">Turquoise clair. Elle ne demande la permission à personne, surtout pas à octobre.</h3>
      <p>Assez belle pour rester dehors&nbsp;: sur la commode, à côté du lit, là où on la voit.</p>
      <p>Dedans, le froissé fait le reste — il attrape le peu de soleil qui traîne et le renvoie. Et le blanc, c'est le neuf.</p>
    </div>
  </div>
</div></section>

<section><div class="w">
  <div class="eb">Le compte</div>
  <h2>512.– de bijoux. 160.–.</h2>
  <div class="calc">
    <div class="l"><span>1 deux tiers en acier froissé</span><span>109.–</span></div>
    <div class="l"><span>2 medium en acier froissé</span><span>154.–</span></div>
    <div class="l"><span>2 minis en acier froissé</span><span>120.–</span></div>
    <div class="l"><span>2 medium blancs</span><span>30.–</span></div>
    <div class="l"><span>La boîte de rangement turquoise</span><span>99.–</span></div>
    <div class="l tot"><span>La box</span><span>160.–</span></div>
  </div>
  <p class="lede">Pas de petite ristourne, pas de calcul compliqué. On voulait finir septembre en beauté.</p>
</div></section>

<section><div class="w">
  <div class="chiffres">
    <div><div class="n">300</div><div class="q">box</div></div>
    <div><div class="n">2</div><div class="q">jours</div></div>
    <div><div class="n">7</div><div class="q">essentiels</div></div>
    <div><div class="n">160.–</div><div class="q">la box</div></div>
  </div>
</div></section>

<section><div class="w">
  <div class="eb">Questions</div>
  <h2>Ce qu'on nous demande déjà.</h2>
  <div class="faq">
    <details open><summary>Ce sont des nouveautés&nbsp;?</summary><p>Non, et c'est volontaire. Ce sont nos essentiels — les pièces les plus portées de la maison.</p></details>
    <details><summary>J'en ai déjà plusieurs, ça vaut le coup&nbsp;?</summary><p>C'est exactement pour vous qu'on l'a faite. Un froissé neuf n'a pas la même lumière qu'un froissé porté trois ans.</p></details>
    <details><summary>Pourquoi 160.– au lieu de 512.–&nbsp;?</summary><p>Parce qu'on voulait finir septembre en beauté, et qu'on a assumé un geste franc.</p></details>
    <details><summary>Combien de temps&nbsp;?</summary><p>300 box, deux jours. On affiche ce qu'il reste.</p></details>
  </div>
</div></section>

<div class="fin"><div class="w">
  <h2>On ne remplace pas ses préférés.<br>On les rachète.</h2>
  <a class="cta" href="https://www.yourmood.net/products/on-nen-a-jamais-trop-7-essentiels-mood-tout-neufs-dans-la-nouvelle-boite-turquoise">Je prends la mienne — 160.–</a>
</div></div>

<footer>mood collection · Orbe · Suisse</footer>
</body></html>`;

export async function GET() {
  return new NextResponse(PAGE, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}
