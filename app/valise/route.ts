export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>La Grande Valise</title><meta name="robots" content="noindex,nofollow"></head><body>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Poppins:wght@200;300;400;500&display=swap">
<style>
:root{
  --nuit:#20090e; --creme:#f7f1e8; --or:#c9a46a; --rouge:#8e1f2f;
  --doux:rgba(247,241,232,.62); --ligne:rgba(201,164,106,.28);
  --titre:'Playfair Display',Georgia,'Times New Roman',serif;
  --texte:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{background:var(--nuit);color:var(--creme);font-family:var(--texte);font-weight:300;
  line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
#neige{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.halo{position:fixed;left:50%;top:-20vh;width:120vw;height:70vh;transform:translateX(-50%);
  background:radial-gradient(ellipse at center,rgba(142,31,47,.38),rgba(32,9,14,0) 68%);pointer-events:none;z-index:0}
main{position:relative;z-index:2;width:min(1280px,100%);margin:0 auto;padding:0 18px}

header{padding-block:clamp(26px,4vw,44px) clamp(10px,1.6vw,18px);text-align:center}
.sur{font-size:10px;letter-spacing:.36em;text-transform:uppercase;color:var(--or);margin:0 0 12px}
h1{font-family:var(--titre);font-weight:400;font-size:clamp(30px,5.4vw,52px);line-height:1.05;margin:0}
h1 em{font-style:italic;color:var(--or)}
.chapeau{margin:12px auto 0;max-width:40em;color:var(--doux);font-size:13.5px}
.brouillon{display:inline-block;margin-top:12px;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;
  color:rgba(247,241,232,.42);border:1px solid rgba(247,241,232,.16);border-radius:999px;padding:4px 12px}

/* ——— les cinq colonnes ——— */
.rangee{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:clamp(14px,2.2vw,24px)}
.col{min-width:0;display:flex;flex-direction:column}
.col h3{margin:0 0 2px;font-family:var(--titre);font-weight:400;font-size:14.5px;text-align:center;line-height:1.3}
.col .px{display:none;margin:0 0 9px;text-align:center;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--doux)}
.cage{position:relative;border:1px solid rgba(247,241,232,.11);border-radius:3px;overflow:hidden;
  background:rgba(45,13,20,.5)}
.cage::before,.cage::after{content:"";position:absolute;left:0;right:0;height:38px;pointer-events:none;z-index:2}
.cage::before{top:0;background:linear-gradient(rgba(32,9,14,.95),rgba(32,9,14,0))}
.cage::after{bottom:0;background:linear-gradient(rgba(32,9,14,0),rgba(32,9,14,.95))}
.piste{height:clamp(240px,34vh,340px);overflow-y:auto;scroll-behavior:smooth;scrollbar-width:none;
  padding:12px 10px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
.piste::-webkit-scrollbar{display:none}
.carte{flex:0 0 auto;background:transparent;border:0;padding:0;cursor:pointer;font:inherit;
  color:var(--doux);text-align:center;transition:color .2s ease,transform .18s ease}
.carte:hover{color:var(--creme);transform:translateY(-2px)}
.rond{position:relative;width:100%;aspect-ratio:1/1;border-radius:3px;overflow:hidden;
  border:1px solid rgba(247,241,232,.14);display:grid;place-items:center;
  transition:border-color .2s ease,box-shadow .2s ease}
.rond img{width:100%;height:100%;object-fit:cover;display:block;background:#f3f1ee}
.rond .pastille{width:46%;aspect-ratio:1/1;border-radius:50%;display:block;
  box-shadow:0 0 0 1px rgba(32,9,14,.25) inset,0 8px 20px rgba(0,0,0,.45)}
.rond .avenir{position:absolute;bottom:6px;left:0;right:0;font-style:normal;font-size:8.5px;
  letter-spacing:.1em;text-transform:uppercase;color:rgba(247,241,232,.34)}
.rond .larg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:2px;font-style:normal;
  background:linear-gradient(rgba(32,9,14,.10),rgba(32,9,14,.62))}
.rond .larg b{font-family:var(--titre);font-weight:500;font-size:34px;line-height:1;color:var(--creme);
  text-shadow:0 2px 12px rgba(0,0,0,.75);letter-spacing:.02em}
.rond .larg s{text-decoration:none;font-size:10px;letter-spacing:.2em;color:var(--or);
  text-shadow:0 1px 8px rgba(0,0,0,.8)}
.carte[aria-pressed="true"] .rond .larg{background:linear-gradient(rgba(32,9,14,.05),rgba(32,9,14,.45))}
.rond .mystere{position:absolute;bottom:6px;left:0;right:0;font-style:normal;font-size:9px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--or);text-shadow:0 1px 6px rgba(0,0,0,.6)}
.carte .nom{display:block;margin-top:6px;font-size:11.5px;line-height:1.3}
.carte[aria-pressed="true"] .rond{border-color:var(--or);box-shadow:0 0 0 1px var(--or)}
.carte[aria-pressed="true"]{color:var(--or)}
.carte[aria-pressed="true"] .rond::after{content:"✓";position:absolute;top:5px;right:7px;color:var(--or);font-size:12px}
.cmd{display:flex;justify-content:center;gap:8px;margin-top:8px}
.flh{width:38px;height:26px;border-radius:999px;border:1px solid var(--ligne);
  background:rgba(32,9,14,.9);color:var(--creme);cursor:pointer;display:grid;place-items:center;
  font-size:11px;line-height:1;transition:background .2s ease,border-color .2s ease}
.flh:hover{background:var(--rouge);border-color:var(--rouge)}
@keyframes clin{0%,100%{transform:translateY(0)}35%{transform:translateY(-14px)}70%{transform:translateY(4px)}}
.piste.clin>*{animation:clin 1.5s ease-in-out}

/* ——— la barre du bas ——— */
.socle{position:sticky;bottom:0;z-index:6;margin-top:16px;
  background:linear-gradient(rgba(32,9,14,.72),rgba(32,9,14,.98) 22%);
  padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))}
.tailles{margin-top:0;text-align:center;border:1px solid var(--ligne);border-radius:4px;
  padding:16px 14px 14px;background:linear-gradient(180deg,rgba(45,13,20,.55),rgba(32,9,14,.55));
  transition:border-color .3s ease,box-shadow .3s ease}
.tailles.manque{border-color:var(--or);box-shadow:0 0 0 1px var(--or),0 0 34px rgba(201,164,106,.22);
  animation:respire 2.2s ease-in-out infinite}
@keyframes respire{0%,100%{box-shadow:0 0 0 1px var(--or),0 0 26px rgba(201,164,106,.16)}
  50%{box-shadow:0 0 0 1px var(--or),0 0 42px rgba(201,164,106,.34)}}
.tailles .tt{margin:0 0 4px;font-family:var(--titre);font-size:19px;color:var(--creme)}
.tailles .ts{margin:0 0 14px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--or)}
.tbtns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.tb{background:transparent;border:1px solid rgba(247,241,232,.22);border-radius:999px;color:var(--creme);
  font:inherit;font-size:15px;min-width:52px;padding:11px 16px;cursor:pointer;transition:all .18s ease;
  font-variant-numeric:tabular-nums}
.tb:hover{border-color:var(--or);transform:translateY(-1px)}
.tb[aria-pressed="true"]{background:var(--or);border-color:var(--or);color:var(--nuit);font-weight:500;
  box-shadow:0 6px 18px rgba(201,164,106,.35)}
.tb.inconnue{font-size:12.5px;letter-spacing:.06em}
.barre{position:relative;z-index:4;margin-top:10px;
  background:linear-gradient(rgba(32,9,14,.80),rgba(32,9,14,.97));
  border-top:1px solid var(--ligne);
  padding:12px 0 6px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.bagage{flex:1 1 330px;min-width:0;display:flex;align-items:center;gap:14px}
.malle{position:relative;flex:0 0 auto;width:188px;padding:11px 12px 14px;border-radius:7px;
  background:linear-gradient(170deg,#56131f,#380d16);
  border:1px solid rgba(201,164,106,.55);
  box-shadow:0 10px 26px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);
  transition:transform .22s cubic-bezier(.3,1.5,.5,1)}
.malle.pouf{transform:translateY(-5px) scale(1.035)}
.malle::before{content:"";position:absolute;top:-8px;left:50%;transform:translateX(-50%);
  width:44px;height:11px;border:2px solid rgba(201,164,106,.75);border-bottom:0;border-radius:9px 9px 0 0}
.malle::after{content:"";position:absolute;left:10px;right:10px;top:50%;height:1px;
  background:rgba(201,164,106,.30)}
.cases{display:flex;gap:6px;position:relative;z-index:2}
.case{flex:1 1 0;aspect-ratio:1/1;border-radius:3px;overflow:hidden;position:relative;
  border:1px dashed rgba(201,164,106,.45);background:rgba(0,0,0,.22)}
.case img{width:100%;height:100%;object-fit:cover;display:block;
  animation:atterri .42s cubic-bezier(.2,1.4,.4,1)}
.case.plein{border-style:solid;border-color:rgba(201,164,106,.85)}
@keyframes atterri{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
.malle .etiq{display:block;margin-top:9px;text-align:center;font-size:9px;letter-spacing:.24em;
  text-transform:uppercase;color:rgba(247,241,232,.55)}
.resume{flex:1 1 150px;min-width:0;font-size:12px;color:rgba(247,241,232,.45);line-height:1.55}
.resume b{color:var(--creme);font-weight:400}
.vol{position:fixed;z-index:60;border-radius:3px;overflow:hidden;pointer-events:none;
  box-shadow:0 10px 28px rgba(0,0,0,.55);border:1px solid rgba(201,164,106,.7)}
.vol img{width:100%;height:100%;object-fit:cover;display:block}
.droite{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.chiffres{text-align:right;line-height:1.2;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.chiffres .eco{display:inline-block;background:var(--or);color:var(--nuit);font-size:10px;font-weight:500;
  letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:999px}
.chiffres .barre-val{font-size:11px;white-space:nowrap;color:var(--doux);text-decoration:line-through}
.chiffres .px400{font-family:var(--titre);font-size:30px;color:var(--or);display:block}
.bouton{background:var(--rouge);color:var(--creme);border:0;border-radius:2px;padding:15px 30px;
  letter-spacing:.14em;text-transform:uppercase;font-family:var(--texte);font-size:11px;cursor:pointer;
  transition:background .25s ease,opacity .25s ease;white-space:nowrap}
.bouton:hover:not(:disabled){background:#a4283a}
.bouton:disabled{opacity:.34;cursor:not-allowed}
.apres{width:100%;font-size:11.5px;color:var(--or);padding-top:6px}
.mention{margin:14px auto 26px;max-width:34em;color:rgba(247,241,232,.34);font-size:11px;text-align:center;line-height:1.6}

@media(max-width:860px){
  .rangee{grid-template-columns:repeat(2,1fr);gap:10px}
  .piste{height:clamp(210px,30vh,260px);padding:10px 8px}
}
@media(max-width:720px){
  main{padding:0 12px}
  header{padding-block:22px 8px}
  h1{font-size:clamp(28px,8.6vw,40px)}
  .chapeau{font-size:12.5px;margin-top:8px}
  .brouillon{margin-top:8px;font-size:8.5px;padding:3px 9px}
  .sur{font-size:9px;letter-spacing:.3em;margin-bottom:8px}
  .rangee{grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}
  .col h3{font-size:12.5px;line-height:1.25}
  .piste{height:200px;padding:9px 7px;gap:8px}
  .carte .nom{font-size:10.5px;margin-top:4px}
  .rond .larg b{font-size:24px}
  .rond .larg s{font-size:8px;letter-spacing:.12em}
  .rond .mystere{font-size:7.5px;bottom:4px}
  .rond .avenir{font-size:7px}
  .flh{width:34px;height:24px;font-size:10px}
  .cmd{margin-top:6px;gap:6px}
  /* sur telephone : la taille suit la page, seule la barre prix reste collee */
  .socle{display:contents}
  .tailles{position:static;margin-top:12px;padding:11px 9px 10px;border-radius:3px}
  .tailles .tt{font-size:15px;margin-bottom:1px}
  .tailles .ts{font-size:8.5px;letter-spacing:.14em;margin-bottom:8px}
  .tbtns{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;gap:6px;
    padding-bottom:3px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .tbtns::-webkit-scrollbar{display:none}
  .tb{flex:0 0 auto;min-width:46px;padding:9px 12px;font-size:14px}
  .tb.inconnue{font-size:11px;padding:9px 13px}
  .barre{position:sticky;bottom:0;z-index:7;margin-top:10px;
    padding:9px 12px calc(7px + env(safe-area-inset-bottom,0px));gap:10px;align-items:center;
    background:linear-gradient(rgba(32,9,14,.70),rgba(32,9,14,.985) 38%);
    border-top:1px solid var(--ligne);
    margin-left:-12px;margin-right:-12px;flex-wrap:wrap;row-gap:8px}
  .bagage{flex:0 0 auto}
  .droite{flex:1 1 auto;justify-content:flex-end;gap:0}
  .bouton{flex:0 0 100%;width:100%;order:3;padding:13px 10px}
  .bagage{flex:1 1 auto;gap:9px}
  .malle{width:132px;padding:7px 8px 9px;border-radius:5px}
  .malle::before{width:30px;height:7px;top:-6px}
  .cases{gap:4px}
  .malle .etiq{margin-top:5px;font-size:8px;letter-spacing:.16em}
  .resume{display:none}
  .droite{gap:9px}
  .chiffres{gap:2px;align-items:flex-end;text-align:right}
  .chiffres .eco{font-size:8.5px;padding:3px 8px;letter-spacing:.06em;line-height:1.1}
  .chiffres .barre-val{font-size:9.5px;line-height:1.2}
  .chiffres .px400{font-size:24px;line-height:1}
  .bouton{padding:12px 16px;font-size:9.5px;letter-spacing:.1em}
  .apres{font-size:10px;padding-top:4px;line-height:1.4}
  .mention{font-size:9.5px;margin:10px auto 12px}
  .pied{padding-bottom:10px}
}
@media(max-width:460px){
  .rangee{grid-template-columns:repeat(2,1fr)}
  .piste{height:178px}
  .malle{width:116px}
  .chiffres .px400{font-size:21px}
}
</style>

<div class="halo"></div>
<canvas id="neige"></canvas>

<main>
  <header>
    <p class="sur">Édition d'hiver · 2026</p>
    <h1>La <em>Grande</em> Valise</h1>
    <p class="chapeau">Une base surprise, puis quatre choix. Faites défiler chaque colonne, cliquez — la pièce part dans votre valise et le prix ne bouge pas.</p>
    <span class="brouillon">Maquette — certaines pièces n'existent pas encore</span>
  </header>

  <div class="rangee" id="rangee"></div>

  <div class="socle">
  <div class="tailles">
    <p class="tt">Votre taille</p>
    <p class="ts" id="tsous">dernière étape</p>
    <div class="tbtns" id="tbtns"></div>
  </div>

  <div class="barre">
    <div class="bagage">
      <div class="malle" id="malle">
        <div class="cases" id="cases"></div>
        <span class="etiq"><span id="fait">0</span> / 5</span>
      </div>
      <p class="resume" id="resume"></p>
    </div>
    <div class="droite">
      <div class="chiffres">
        <span class="eco">−788.– d'économie</span>
        <span class="barre-val">valeur jusqu'à 1 217.–</span>
        <span class="px400">429.–</span>
      </div>
      <button class="bouton" id="go" disabled>Je prends ma valise</button>
    </div>
    <p class="apres" id="apres"></p>
  </div>
  </div>

  <p class="mention">📷 Photo non contractuelle — les nuances peuvent varier légèrement en raison du travail artisanal.</p>
</main>

<script>
(function(){
  var ACHAT={"0":{"extra small":{"px":250,"v":{"50":"64862608556409","52":"64862608654713","54":"64862608753017","56":"64862608851321","58":"64862608949625","60":"64862609047929","62":"64862609146233","64":"64862609244537","66":"64862609342841","68":"64862609441145","70":"64862609539449","72":"64862609637753","taille inconnue":"64862608458105"}},"small":{"px":250,"v":{"50":"64862608589177","52":"64862608687481","54":"64862608785785","56":"64862608884089","58":"64862608982393","60":"64862609080697","62":"64862609179001","64":"64862609277305","66":"64862609375609","68":"64862609473913","70":"64862609572217","72":"64862609670521","taille inconnue":"64862608490873"}},"large":{"px":250,"v":{"50":"64862608621945","52":"64862608720249","54":"64862608818553","56":"64862608916857","58":"64862609015161","60":"64862609113465","62":"64862609211769","64":"64862609310073","66":"64862609408377","68":"64862609506681","70":"64862609604985","72":"64862609703289","taille inconnue":"64862608523641"}}},"1":{"bordeaux":{"px":199,"v":{"50":"64862602690937","52":"64862602723705","54":"64862602756473","56":"64862602789241","58":"64862602822009","60":"64862602854777","62":"64862602887545","64":"64862602920313","66":"64862602953081","68":"64862602985849","70":"64862603018617","72":"64862603051385","taille inconnue":"64862602658169"}},"céleste":{"px":119,"v":{"50":"54966147514745","52":"54966147547513","54":"54966147580281","56":"54966147613049","58":"54966147645817","60":"54966147678585","62":"54966147711353","64":"54966147744121","66":"54966147776889","68":"54966147809657","70":"54966147842425","72":"54966147875193","taille inconnue":"54966147481977"}},"authentique rose gold":{"px":119,"v":{"50":"64206967964025","52":"64206967996793","54":"64206968029561","56":"64206968062329","58":"64206968095097","60":"64206968127865","62":"64206968160633","64":"64206968193401","66":"64206968226169","68":"64206968258937","70":"64206968291705","72":"64206968324473","taille inconnue":"64206967931257"}},"coquelicot":{"px":119,"v":{"50":"55327166366073","52":"55327166398841","54":"55327166431609","56":"55327166464377","58":"55327166497145","60":"55327166529913","62":"55327166562681","64":"55327166595449","66":"55327166628217","68":"55327166660985","70":"55327166693753","72":"55327166726521","taille inconnue":"55327166333305"}},"sucre d'orge":{"px":199,"v":{"50":"56021217870201","52":"56021217902969","54":"56021217935737","56":"56021217968505","58":"56021218001273","60":"56021218034041","62":"56021218066809","64":"56021218099577","66":"56021218132345","68":"56021218165113","70":"56021218197881","72":"56021218230649","taille inconnue":"56021217837433"}},"givré":{"px":119,"v":{"50":"56093501129081","52":"56093501161849","54":"56093501194617","56":"56093501227385","58":"56093501260153","60":"56093501292921","62":"56093501325689","64":"56093501358457","66":"56093501391225","68":"56093501423993","70":"56093501456761","72":"56093501489529","taille inconnue":"56093501096313"}},"des bois":{"px":119,"v":{"50":"55901467214201","52":"55901467246969","54":"55901467279737","56":"55901467312505","58":"55901467345273","60":"55901467378041","62":"55901467410809","64":"55901467443577","66":"55901467476345","68":"55901467509113","70":"55901467541881","72":"55901467574649","taille inconnue":"55901467181433"}},"authentique":{"px":154,"v":{"50":"54830812070265","52":"54830812103033","54":"54830812135801","56":"54830812168569","58":"54830812201337","60":"54830812234105","62":"54830812266873","64":"54830812299641","66":"54830812332409","68":"54830812365177","70":"54830812397945","72":"54830812430713","taille inconnue":"54830812037497"}}},"2":{"coquelicot":{"px":240,"v":{"50":"64862603673977","52":"64862603706745","54":"64862603739513","56":"64862603772281","58":"64862603805049","60":"64862603837817","62":"64862603870585","64":"64862603903353","66":"64862603936121","68":"64862603968889","70":"64862604001657","72":"64862604034425","taille inconnue":"64862603641209"}},"sucre d'orge":{"px":240,"v":{"50":"64862604362105","52":"64862604394873","54":"64862604427641","56":"64862604460409","58":"64862604493177","60":"64862604525945","62":"64862604558713","64":"64862604591481","66":"64862604624249","68":"64862604657017","70":"64862604689785","72":"64862604722553","taille inconnue":"64862604329337"}},"givré":{"px":240,"v":{"50":"64862675108217","52":"64862675140985","54":"64862675173753","56":"64862675206521","58":"64862675239289","60":"64862675272057","62":"64862675304825","64":"64862675337593","66":"64862675370361","68":"64862675403129","70":"64862675435897","72":"64862675468665","taille inconnue":"64862675075449"}},"céleste":{"px":225,"v":{"50":"55233621983609","52":"55233622016377","54":"55233622049145","56":"55233622081913","58":"55233622114681","60":"55233622147449","62":"55233622180217","64":"55233622212985","66":"55233622245753","68":"55233622278521","70":"55233622311289","72":"55233622344057","taille inconnue":"55233621950841"}},"bordeaux":{"px":240,"v":{"50":"64862605017465","52":"64862605050233","54":"64862605083001","56":"64862605115769","58":"64862605148537","60":"64862605181305","62":"64862605214073","64":"64862605246841","66":"64862605279609","68":"64862605312377","70":"64862605345145","72":"64862605377913","taille inconnue":"64862604984697"}},"authentique":{"px":225,"v":{"50":"55053627687289","52":"55053627785593","54":"55053627883897","56":"55053627982201","58":"55053628080505","60":"55053628178809","62":"55053628277113","64":"55053628375417","66":"55053628473721","68":"55053628572025","70":"55053628670329","72":"55053628768633","taille inconnue":"55053627588985"}}},"3":{"rouge":{"px":269,"v":{"50":"64866304262521","52":"64866304295289","54":"64866304328057","56":"64866304360825","58":"64866304393593","60":"64866304426361","62":"64866304459129","64":"64866304491897","66":"64866304524665","68":"64866304557433","70":"64866304590201","72":"64866304622969","taille inconnue":"64866304229753"}},"sucre d'orge":{"px":269,"v":{"50":"64862605476217","52":"64862605508985","54":"64862605541753","56":"64862605574521","58":"64862605607289","60":"64862605640057","62":"64862605672825","64":"64862605705593","66":"64862605738361","68":"64862605771129","70":"64862605803897","72":"64862605836665","taille inconnue":"64862605443449"}},"givré":{"px":269,"v":{"50":"64862605934969","52":"64862605967737","54":"64862606000505","56":"64862606033273","58":"64862606066041","60":"64862606098809","62":"64862606131577","64":"64862606164345","66":"64862606197113","68":"64862606229881","70":"64862606262649","72":"64862606295417","taille inconnue":"64862605902201"}},"céleste":{"px":269,"v":{"50":"64862606426489","52":"64862606459257","54":"64862606492025","56":"64862606524793","58":"64862606557561","60":"64862606590329","62":"64862606623097","64":"64862606655865","66":"64862606688633","68":"64862606721401","70":"64862606754169","72":"64862606786937","taille inconnue":"64862606393721"}},"azure":{"px":161,"v":{"50":"57067022975353","52":"57067023008121","54":"57067023040889","56":"57067023073657","58":"57067023106425","60":"57067023139193","62":"57067023171961","64":"57067023204729","66":"57067023237497","68":"57067023270265","70":"57067023303033","72":"57067023335801","taille inconnue":"57067022942585"}},"white":{"px":161,"v":{"50":"64017008853369","52":"64017008886137","54":"64017008918905","56":"64017008951673","58":"64017008984441","60":"64017009017209","62":"64017009049977","64":"64017009082745","66":"64017009115513","68":"64017009148281","70":"64017009181049","72":"64017009213817","taille inconnue":"64017008820601"}},"Lumina":{"px":113,"v":{"50":"55217712202105","52":"55217712234873","54":"55217712267641","56":"55217712300409","58":"55217712333177","60":"55217712365945","62":"55217712398713","64":"55217712431481","66":"55217712464249","68":"55217712497017","70":"55217712529785","72":"55217712562553","taille inconnue":"55217712169337"}},"Lumina émeraude":{"px":155,"v":{"50":"55447929422201","52":"55447929454969","54":"55447929487737","56":"55447929520505","58":"55447929553273","60":"55447929586041","62":"55447929618809","64":"55447929651577","66":"55447929684345","68":"55447929717113","70":"55447929749881","72":"55447929782649","taille inconnue":"55447929389433"}},"Lumina rose":{"px":155,"v":{"50":"55677812703609","52":"55677812736377","54":"55677812769145","56":"55677812801913","58":"55677812834681","60":"55677812867449","62":"55677812900217","64":"55677812932985","66":"55677812965753","68":"55677812998521","70":"55677813031289","72":"55677813064057","taille inconnue":"55677812670841"}},"Lumina kabricot":{"px":155,"v":{"50":"55677822632313","52":"55677822665081","54":"55677822697849","56":"55677822730617","58":"55677822763385","60":"55677822796153","62":"55677822828921","64":"55677822861689","66":"55677822894457","68":"55677822927225","70":"55677822959993","72":"55677822992761","taille inconnue":"55677822599545"}},"Lumina orange impérial":{"px":155,"v":{"50":"55677844881785","52":"55677844914553","54":"55677844947321","56":"55677844980089","58":"55677845012857","60":"55677845045625","62":"55677845078393","64":"55677845111161","66":"55677845143929","68":"55677845176697","70":"55677845209465","72":"55677845242233","taille inconnue":"55677844849017"}}},"4":{"rouge":{"px":259,"v":{"50":"64862606983545","52":"64862607016313","54":"64862607049081","56":"64862607081849","58":"64862607114617","60":"64862607147385","62":"64862607180153","64":"64862607212921","66":"64862607245689","68":"64862607278457","70":"64862607311225","72":"64862607343993","taille inconnue":"64862606950777"}},"sucre d'orge":{"px":259,"v":{"50":"64862607573369","52":"64862607606137","54":"64862607638905","56":"64862607671673","58":"64862607704441","60":"64862607737209","62":"64862607769977","64":"64862607802745","66":"64862607835513","68":"64862607868281","70":"64862607901049","72":"64862607933817","taille inconnue":"64862607540601"}},"givré":{"px":259,"v":{"50":"64862608032121","52":"64862608064889","54":"64862608097657","56":"64862608130425","58":"64862608163193","60":"64862608195961","62":"64862608228729","64":"64862608261497","66":"64862608294265","68":"64862608327033","70":"64862608359801","72":"64862608392569","taille inconnue":"64862607999353"}},"white":{"px":155,"v":{"50":"55687903215993","52":"55687903248761","54":"55687903281529","56":"55687903314297","58":"55687903347065","60":"55687903379833","62":"55687903412601","64":"55687903445369","66":"55687903478137","68":"55687903510905","70":"55687903543673","72":"55687903576441","taille inconnue":"55687903183225"}},"Willow":{"px":177,"v":{"50":"55049956196729","52":"55049956229497","54":"55049956262265","56":"55049956295033","58":"55049956327801","60":"55049956360569","62":"55049956393337","64":"55049956426105","66":"55049956458873","68":"55049956491641","70":"55049956524409","72":"55049956557177","taille inconnue":"55049956163961"}},"Willow purple":{"px":149,"v":{"50":"55139614228857","52":"55139614261625","54":"55139614294393","56":"55139614327161","58":"55139614359929","60":"55139614392697","62":"55139614425465","64":"55139614458233","66":"55139614491001","68":"55139614523769","70":"55139614556537","72":"55139614589305","taille inconnue":"55139614196089"}},"Willow white":{"px":177,"v":{"50":"55629579682169","52":"55629579714937","54":"55629579747705","56":"55629579780473","58":"55629579813241","60":"55629579846009","62":"55629579878777","64":"55629579911545","66":"55629579944313","68":"55629579977081","70":"55629580009849","72":"55629580042617","taille inconnue":"55629579649401"}},"Willow sucre d'orge":{"px":177,"v":{"50":"56021399372153","52":"56021399404921","54":"56021399437689","56":"56021399470457","58":"56021399503225","60":"56021399535993","62":"56021399568761","64":"56021399601529","66":"56021399634297","68":"56021399667065","70":"56021399699833","72":"56021399732601","taille inconnue":"56021399339385"}},"Willow glacé":{"px":177,"v":{"50":"56430044807545","52":"56430044840313","54":"56430044873081","56":"56430044905849","58":"56430044938617","60":"56430044971385","62":"56430045004153","64":"56430045036921","66":"56430045069689","68":"56430045102457","70":"56430045135225","72":"56430045167993","taille inconnue":"56430044774777"}}}};
  var TAILLES=['taille inconnue','50','52','54','56','58','60','62','64','66','68','70','72'];
  var taille=null;
  var B='https://cdn.shopify.com/s/files/1/0798/2303/files/';
  var ETAPES=[
   {t:"La base", court:"Base", px:"250.–", surprise:true,
    o:[{n:"extra small",g:"XS",mm:"9 mm",f:"/valise/base-surprise.jpg"},
       {n:"small",g:"S",mm:"11 mm",f:"/valise/base-surprise.jpg"},
       {n:"large",g:"L",mm:"13 mm",f:"/valise/base-surprise.jpg"}]},
   {t:"L'Aura medium", court:"Aura medium", px:"199.–",
    o:[{n:"bordeaux",c:"#6E1B2A",f:"/valise/aura-bordeaux.jpg"},
       {n:"céleste",c:"#A8C8E0",i:"MG_7645-modif.jpg"},
       {n:"authentique rose gold",c:"#E3B7A0",i:"ChatGPTImage10aout2026a14_23_27.png"},
       {n:"coquelicot",c:"#D4342B",f:"/valise/aura-coquelicot.jpg"},
       {n:"sucre d'orge",c:"#F2A9B8",f:"/valise/aura-sucredorge.jpg"},
       {n:"givré",c:"#DCE2E6",f:"/valise/aura-givre.jpg"},
       {n:"des bois",c:"#2E8B63",f:"/valise/aura-desbois.jpg"},
       {n:"authentique",c:"#EDEDEB",f:"/valise/aura-authentique.jpg"}]},
   {t:"Les 2 minis Aura", court:"2 minis", px:"240.–",
    o:[{n:"coquelicot",c:"#D4342B",f:"/valise/mini-coquelicot.jpg"},
       {n:"sucre d'orge",c:"#F2A9B8",f:"/valise/mini-sucredorge.jpg"},
       {n:"givré",c:"#E8EEF2",f:"/valise/mini-givre.jpg"},
       {n:"céleste",c:"#A8C8E0",f:"/valise/mini-celeste.jpg"},
       {n:"bordeaux",c:"#6E1B2A",f:"/valise/mini-bordeaux.jpg"},
       {n:"authentique",c:"#EDEDEB",f:"/valise/mini-authentique.jpg"}]},
   {t:"Le deux tiers Aurheart ou Lumina", court:"Aurheart / Lumina", px:"269.–",
    o:[{n:"rouge",c:"#9E1B2F",f:"/valise/aurheart-rouge.jpg"},
       {n:"sucre d'orge",c:"#F2A9B8",f:"/valise/aurheart-sucredorge.jpg"},
       {n:"givré",c:"#E8EEF2",f:"/valise/aurheart-givre.jpg"},
       {n:"céleste",c:"#A8C8E0",f:"/valise/aurheart-celeste.jpg"},
       {n:"azure",c:"#4E8FD0",f:"/valise/aurheart-azure.jpg"},
       {n:"white",c:"#F4F4F2",f:"/valise/aurheart-white.jpg"},
       {n:"Lumina",c:"#DCDCDC",f:"/valise/lumina.jpg"},
       {n:"Lumina émeraude",c:"#1E9B63",f:"/valise/lumina-emeraude.jpg"},
       {n:"Lumina rose",c:"#E7A6BE",f:"/valise/lumina-rose.jpg"},
       {n:"Lumina kabricot",c:"#E0A87E",f:"/valise/lumina-kabricot.jpg"},
       {n:"Lumina orange impérial",c:"#E8862B",f:"/valise/lumina-imperial.jpg"}]},
   {t:"Le deux tiers Auraline ou Willow", court:"Auraline / Willow", px:"259.–",
    o:[{n:"rouge",c:"#9E1B2F",f:"/valise/auraline-rouge.jpg"},
       {n:"sucre d'orge",c:"#F2A9B8",f:"/valise/auraline-sucredorge.jpg"},
       {n:"givré",c:"#E8EEF2",f:"/valise/auraline-givre.jpg"},
       {n:"white",c:"#F4F4F2",f:"/valise/auraline-white.jpg"},
       {n:"Willow",c:"#C9C3CF",f:"/valise/willow.jpg"},
       {n:"Willow purple",c:"#6E4A78",f:"/valise/willow-purple.jpg"},
       {n:"Willow white",c:"#E9E6E2",f:"/valise/willow-white.jpg"},
       {n:"Willow sucre d'orge",c:"#C0303A",f:"/valise/willow-sucredorge.jpg"},
       {n:"Willow glacé",c:"#2F4E8C",f:"/valise/willow-glace.jpg"}]}
  ];
  var choix=new Array(ETAPES.length).fill(null);
  var rangee=document.getElementById('rangee'), resume=document.getElementById('resume'),
      go=document.getElementById('go'), apres=document.getElementById('apres'),
      cases=document.getElementById('cases'), malle=document.getElementById('malle'),
      fait=document.getElementById('fait');

  ETAPES.forEach(function(e,i){
    var col=document.createElement('div'); col.className='col';
    var h='<h3>'+e.t+'</h3>'+
          '<div class="cage"><div class="piste" id="piste'+i+'">';
    e.o.forEach(function(op,j){
      var dedans = (op.f ? '<img src="'+op.f+'" alt="" loading="lazy">'
           : op.i ? '<img src="'+B+op.i+'?width=420" alt="" loading="lazy">'
                : '<span class="pastille" style="background:'+op.c+'"></span><em class="avenir">photo à venir</em>');
      h+='<button type="button" class="carte" aria-pressed="false" data-e="'+i+'" data-o="'+j+'">'+
         '<span class="rond">'+dedans+
         (op.g?'<em class="larg"><b>'+op.g+'</b><s>'+op.mm+'</s></em>':'')+
         (e.surprise?'<em class="mystere">surprise</em>':'')+
         '</span><span class="nom">'+op.n+'</span></button>';
    });
    h+='</div></div><div class="cmd">'+
       '<button class="flh" type="button" data-r="'+i+'" data-s="-1">▲</button>'+
       '<button class="flh" type="button" data-r="'+i+'" data-s="1">▼</button></div>';
    col.innerHTML=h; rangee.appendChild(col);
  });

  function photo(i){ var op=ETAPES[i].o[choix[i]]; return op.f ? op.f : (op.i ? B+op.i+'?width=420' : ''); }

  function rendu(){
    cases.innerHTML='';
    ETAPES.forEach(function(e,i){
      var d=document.createElement('span'); d.className='case';
      if(choix[i]!==null){ d.classList.add('plein'); d.innerHTML='<img src="'+photo(i)+'" alt="">'; }
      cases.appendChild(d);
    });
    var n=choix.filter(function(x){return x!==null}).length;
    fait.textContent=n;
    var complet = (n===ETAPES.length) && !!taille;
    resume.innerHTML = n<ETAPES.length
      ? 'Il manque&nbsp;: <b>'+ETAPES.filter(function(e,i){return choix[i]===null}).map(function(e){return e.court}).join(', ')+'</b>'
      : ETAPES.map(function(e,i){return e.court+' <b>'+e.o[choix[i]].n+'</b>'}).join(' · ');
    var zt=document.querySelector('.tailles');
    if(zt) zt.classList.toggle('manque', n===ETAPES.length && !taille);
    var ts=document.getElementById('tsous');
    if(ts) ts.textContent = taille ? ('taille '+(taille==='taille inconnue'?'à définir ensemble':taille)) : 'dernière étape';
    go.disabled=!complet;
    if(!complet){
      apres.textContent='';
      if(n===ETAPES.length && !taille) resume.innerHTML='Il manque&nbsp;: <b>votre taille</b>';
    }
  }

  // la bague s'envole jusque dans la valise
  function envole(depuis, src, place){
    var a=depuis.getBoundingClientRect();
    var cible=cases.children[place]; if(!cible) return;
    var b=cible.getBoundingClientRect();
    var v=document.createElement('div'); v.className='vol';
    v.style.left=a.left+'px'; v.style.top=a.top+'px';
    v.style.width=a.width+'px'; v.style.height=a.height+'px';
    v.innerHTML='<img src="'+src+'" alt="">';
    document.body.appendChild(v);
    var dx=(b.left+b.width/2)-(a.left+a.width/2), dy=(b.top+b.height/2)-(a.top+a.height/2);
    v.animate([
      {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1,offset:0},
      {transform:'translate('+(dx*0.45)+'px,'+(dy*0.30-70)+'px) scale(.72) rotate(-9deg)',opacity:1,offset:.55},
      {transform:'translate('+dx+'px,'+dy+'px) scale('+(b.width/a.width)+') rotate(4deg)',opacity:.85,offset:1}
    ],{duration:760,easing:'cubic-bezier(.35,.05,.25,1)'}).onfinish=function(){
      v.remove();
      malle.classList.add('pouf'); setTimeout(function(){malle.classList.remove('pouf');},260);
      rendu();
    };
  }

  rangee.addEventListener('click',function(ev){
    var fl=ev.target.closest('.flh');
    if(fl){ document.getElementById('piste'+fl.dataset.r)
      .scrollBy({top:(+fl.dataset.s)*180,behavior:'smooth'}); return; }
    var b=ev.target.closest('.carte'); if(!b) return;
    var i=+b.dataset.e, j=+b.dataset.o;
    var avant=choix[i];
    choix[i]=(choix[i]===j)?null:j;
    rangee.querySelectorAll('.carte[data-e="'+i+'"]').forEach(function(x){
      x.setAttribute('aria-pressed',(+x.dataset.o===choix[i])?'true':'false');
    });
    var img=b.querySelector('img');
    if(choix[i]!==null && img && avant!==choix[i]){
      envole(b.querySelector('.rond'), img.getAttribute('src'), i);
    } else { rendu(); }
  });

  go.addEventListener('click',function(){
    var ids=[], manque=[];
    for(var i=0;i<ETAPES.length;i++){
      var nom=ETAPES[i].o[choix[i]].n;
      var fiche=(ACHAT[String(i)]||{})[nom];
      if(!fiche || !fiche.v[taille]){ manque.push(ETAPES[i].court+' · '+nom); continue; }
      ids.push(fiche.v[taille]);
    }
    if(manque.length){ apres.innerHTML='Pas encore commandable dans cette taille&nbsp;: '+manque.join(', '); return; }
    go.disabled=true; apres.innerHTML='On prépare votre valise…';
    fetch('/api/valise-panier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:ids})})
      .then(function(r){return r.json();})
      .then(function(j){
        if(j && j.lien){ apres.innerHTML='On vous emmène au paiement…'; window.location.href=j.lien; }
        else { go.disabled=false; apres.innerHTML='Un souci est survenu, réessayez dans un instant.'; }
      })
      .catch(function(){ go.disabled=false; apres.innerHTML='Un souci est survenu, réessayez dans un instant.'; });
  });

  // les boutons de taille
  var tb=document.getElementById('tbtns');
  TAILLES.forEach(function(t){
    var b=document.createElement('button'); b.type='button'; b.className='tb';
    b.setAttribute('aria-pressed','false'); b.dataset.t=t;
    if(t==='taille inconnue'){ b.textContent='je ne la connais pas'; b.classList.add('inconnue'); }
    else b.textContent=t;
    tb.appendChild(b);
  });
  tb.addEventListener('click',function(ev){
    var b=ev.target.closest('.tb'); if(!b) return;
    taille = (taille===b.dataset.t) ? null : b.dataset.t;
    tb.querySelectorAll('.tb').forEach(function(x){x.setAttribute('aria-pressed',(x.dataset.t===taille)?'true':'false');});
    rendu();
  });

  rendu();

  // petit mouvement au depart : chaque colonne descend puis remonte, l'une apres l'autre
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    ETAPES.forEach(function(e,i){
      var p=document.getElementById('piste'+i);
      setTimeout(function(){
        p.classList.add('clin');
        p.scrollTo({top:96,behavior:'smooth'});
        setTimeout(function(){ p.scrollTo({top:0,behavior:'smooth'});
          setTimeout(function(){p.classList.remove('clin');},900); },760);
      }, 500+i*190);
    });
  }

  var c=document.getElementById('neige');
  if(c){
    var x=c.getContext('2d'), f=[], L=0, H=0, doux=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function taille(){ L=c.width=innerWidth*devicePixelRatio; H=c.height=innerHeight*devicePixelRatio;
      c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; }
    taille(); addEventListener('resize',taille);
    var n=doux?24:60;
    for(var i=0;i<n;i++) f.push({x:Math.random(),y:Math.random(),r:(Math.random()*1.6+.5)*devicePixelRatio,
      v:(Math.random()*.00032+.00011),o:Math.random()*.42+.12,d:Math.random()*6.28});
    (function dessine(t){
      x.clearRect(0,0,L,H);
      for(var i=0;i<f.length;i++){ var p=f[i];
        p.y+=p.v; if(p.y>1.05){p.y=-.05;p.x=Math.random();}
        var dx=Math.sin(t*0.00016+p.d)*0.006;
        x.beginPath(); x.arc((p.x+dx)*L,p.y*H,p.r,0,6.2832);
        x.fillStyle='rgba(247,241,232,'+p.o+')'; x.fill();
      }
      requestAnimationFrame(dessine);
    })(0);
  }
})();
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
