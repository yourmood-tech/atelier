export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Le calendrier mood</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{--nuit:#101E2D;--bois:#22405C;--bois2:#1A3148;--or:#C9A961;--orclair:#E8D3A2;--neige:#F4F8FB}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{min-height:100vh;color:#EAF1F7;font-family:Poppins,system-ui,sans-serif;font-weight:300;
  background:
   radial-gradient(900px 500px at 50% 8%, #2B4A69 0%, transparent 62%),
   linear-gradient(180deg,#1B3048 0%, #0D1726 70%, #0A121D 100%);
  overflow-x:hidden}
.flocons{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.55;
  background-image:radial-gradient(2px 2px at 8% 12%,#fff,transparent),radial-gradient(1.6px 1.6px at 26% 32%,#fff,transparent),
  radial-gradient(1.4px 1.4px at 44% 8%,#fff,transparent),radial-gradient(2px 2px at 62% 26%,#fff,transparent),
  radial-gradient(1.5px 1.5px at 78% 14%,#fff,transparent),radial-gradient(1.8px 1.8px at 92% 36%,#fff,transparent),
  radial-gradient(1.4px 1.4px at 16% 58%,#fff,transparent),radial-gradient(1.7px 1.7px at 36% 76%,#fff,transparent),
  radial-gradient(1.5px 1.5px at 58% 64%,#fff,transparent),radial-gradient(2px 2px at 84% 72%,#fff,transparent),
  radial-gradient(1.4px 1.4px at 70% 90%,#fff,transparent),radial-gradient(1.6px 1.6px at 22% 92%,#fff,transparent)}
.wrap{position:relative;z-index:1;width:min(1020px,100%);margin:0 auto;padding:0 18px}
header{text-align:center;padding:54px 18px 8px}
.kick{font-size:10px;letter-spacing:.42em;text-transform:uppercase;color:var(--orclair)}
h1{font-family:Playfair Display,serif;font-weight:400;font-size:clamp(32px,5vw,54px);margin:14px 0 0;line-height:1.08}
h1 em{font-style:italic;color:var(--orclair)}
.sous{max-width:44ch;margin:16px auto 0;font-size:13.5px;line-height:1.9;color:#B9CDDC}

/* ---------- la maison ---------- */
.maison{margin:44px auto 0;max-width:760px;filter:drop-shadow(0 34px 70px rgba(0,0,0,.55))}
.toit{position:relative;height:clamp(96px,15vw,168px)}
.toit svg{display:block;width:100%;height:100%}
.cheminee{position:absolute;right:16%;top:-7%;width:clamp(26px,3.6vw,42px);height:clamp(40px,6vw,74px);
  background:linear-gradient(180deg,#2C4C6B,#1E3850);border-radius:3px 3px 0 0;box-shadow:inset 0 -6px 12px rgba(0,0,0,.3)}
.cheminee::after{content:"";position:absolute;left:-12%;top:-7px;width:124%;height:10px;border-radius:5px;background:var(--neige)}
.facade{background:linear-gradient(180deg,#24405C 0%,#1A3148 72%,#16293D 100%);
  border-radius:0 0 16px 16px;padding:clamp(16px,2.4vw,26px);position:relative}
.facade::before{content:"";position:absolute;left:0;right:0;top:-9px;height:14px;border-radius:7px;background:var(--neige);box-shadow:0 2px 10px rgba(0,0,0,.25)}
.portes{display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(7px,1.1vw,13px)}
@media(max-width:700px){.portes{grid-template-columns:repeat(4,1fr)}}
.porte{position:relative;aspect-ratio:1/1.22;border-radius:7px;
  background:linear-gradient(168deg,rgba(255,255,255,.085),rgba(255,255,255,.02));
  border:1px solid rgba(232,211,162,.26);display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 2px 6px rgba(0,0,0,.25)}
.porte::after{content:"";position:absolute;right:6px;top:50%;width:4px;height:4px;border-radius:50%;
  background:var(--or);transform:translateY(-50%);opacity:.75}
.porte span{font-family:Playfair Display,serif;font-size:clamp(15px,2.1vw,24px);color:var(--orclair);opacity:.92}
.socle{height:16px;margin:0 auto;width:92%;border-radius:0 0 10px 10px;background:linear-gradient(180deg,#132436,#0C1726)}
.sol{height:60px;margin-top:-10px;background:radial-gradient(60% 100% at 50% 0%, rgba(244,248,251,.22), transparent 70%)}
.pied{text-align:center;padding:30px 18px 70px;font-size:11px;letter-spacing:.14em;color:#7D95A8}
</style></head><body>
<div class="flocons"></div>

<header>
  <div class="kick">décembre 2026</div>
  <h1>Le calendrier<br><em>mood</em></h1>
  <p class="sous">Vingt-quatre cases. Derrière chacune, une surprise — un polymère, un aluminium, un serti.</p>
</header>

<div class="wrap">
  <div class="maison">
    <div class="toit">
      <div class="cheminee"></div>
      <svg viewBox="0 0 760 160" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="380,6 756,158 4,158" fill="#1C3449"/>
        <polygon points="380,6 756,158 700,158 380,36 60,158 4,158" fill="#F4F8FB"/>
      </svg>
    </div>
    <div class="facade">
      <div class="portes" id="portes"></div>
    </div>
    <div class="socle"></div>
    <div class="sol"></div>
  </div>
  <p class="pied">Maquette — la maison seule pour l'instant</p>
</div>

<script>
var p=document.getElementById("portes");
for(var i=1;i<=24;i++){ var d=document.createElement("div"); d.className="porte"; d.innerHTML="<span>"+i+"</span>"; p.appendChild(d); }
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
