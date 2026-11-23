/**
 * Report stylesheet (DESIGN.md, report rules). Inline only: the page's Content Security Policy
 * allows inline styles, data: fonts and same-origin images, and nothing else.
 */
import { readFile } from 'node:fs/promises';

const FONTS = [
  { family: 'Bricolage Grotesque', file: 'bricolage-grotesque.woff2' },
  { family: 'Atkinson Hyperlegible Next', file: 'atkinson-hyperlegible-next.woff2' },
  { family: 'Atkinson Hyperlegible Mono', file: 'atkinson-hyperlegible-mono.woff2' },
];

async function fontFaces(): Promise<string> {
  const faces = await Promise.all(FONTS.map(async ({ family, file }) => {
    const data = await readFile(new URL(`./assets/fonts/${file}`, import.meta.url));
    return `@font-face{font-family:"${family}";font-weight:200 800;font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${data.toString('base64')}) format("woff2")}`;
  }));
  return faces.join('\n');
}

const CSS = `
:root{
  --dominant:#0E3A5B;--accent:#D9F53B;
  --paper:#F5F3EC;--surface:#FFFFFF;--ink:#121A22;--ink-muted:#4A5866;--rule:#B9B3A3;
  --pass-fg:#0F5132;--pass-bg:#DDF1E4;--fail-fg:#8E1C1C;--fail-bg:#FBE3E0;
  --inconc-fg:#7A4A00;--inconc-bg:#FCEBC7;--notrun-fg:#4A4A4A;--notrun-bg:#ECEAE4;
  --infra-fg:#33475B;--infra-bg:#E2E8EE;--unsup-fg:#5C5650;
  --font-display:"Bricolage Grotesque",Georgia,serif;
  --font-body:"Atkinson Hyperlegible Next",Verdana,sans-serif;
  --font-mono:"Atkinson Hyperlegible Mono",Consolas,monospace;
  color-scheme:light;
}
*{box-sizing:border-box}
html{background:var(--paper);color:var(--ink);font:400 16px/24px var(--font-body);-webkit-font-smoothing:antialiased}
body{margin:0}
h1,h2,h3,h4,p,dl,dd,ol,ul,figure{margin:0}
ol,ul{padding:0;list-style:none}
a{color:var(--dominant);text-underline-offset:4px}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--dominant);outline-offset:2px}
code,pre,.mono{font-family:var(--font-mono);font-size:16px;line-height:24px}
pre{white-space:pre-wrap;overflow-wrap:anywhere}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
@media (min-width:640px){.wrap{padding:0 32px}}
.muted{color:var(--ink-muted)}
.label{font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;color:var(--ink-muted)}
.display{font-family:var(--font-display);font-size:48px;line-height:56px;font-weight:200;letter-spacing:-.01em}
.display b{font-weight:800}
.mega{font-family:var(--font-display);font-size:144px;line-height:144px;font-weight:800;font-variant-numeric:tabular-nums}
@media (max-width:639px){.mega{font-size:clamp(96px,26vw,144px);line-height:1}.display{font-size:40px;line-height:48px}}
.strong{font-weight:800}
.num{font-variant-numeric:tabular-nums}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.gap{margin-top:8px}.gap-l{margin-top:16px}.gap-xl{margin-top:32px}
.wrap-any{overflow-wrap:anywhere}
.narrow{max-width:480px}
.notes{margin-top:16px;display:grid;gap:8px;list-style:disc;padding-left:24px}
.hash{display:inline-block;margin:0}
.hash summary{color:inherit;font-weight:400}
caption{text-align:left;padding:16px}
h4{font-weight:800}
section{padding:64px 0;border-top:1px solid var(--rule)}
section>.wrap>header{margin-bottom:32px}
section>.wrap>header p{margin-top:16px;max-width:65ch}

/* identity bar */
.identity{background:var(--dominant);color:#fff;padding:24px 0}
.identity .wrap{display:flex;flex-wrap:wrap;gap:8px 32px;align-items:baseline;justify-content:space-between}
.identity .label{color:#ffffffcc}
.identity a{color:#fff}
.identity .same{display:inline-block;background:var(--accent);color:var(--ink);padding:0 8px;border-radius:2px}
.hero{padding:64px 0 48px;border-top:0}
.hero .wrap{display:grid;gap:32px}
@media (min-width:900px){.hero .wrap{grid-template-columns:auto 1fr;align-items:end}}
.hero h1{max-width:18ch}
.totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(152px,1fr));border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.totals>div{padding:16px 16px 16px 0}
.totals dd{font-family:var(--font-display);font-size:48px;line-height:56px;font-weight:800}

/* verdict and decision badges: text + icon + border style, never colour alone */
.v{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:2px;font-family:var(--font-mono);font-weight:800;white-space:nowrap;line-height:16px}
.v svg{width:16px;height:16px;flex:none}
.v-PASS{background:var(--pass-bg);color:var(--pass-fg);border:2px solid var(--pass-fg)}
.v-FAIL{background:var(--fail-bg);color:var(--fail-fg);border:2px solid var(--fail-bg);border-left:4px solid var(--fail-fg)}
.v-INCONCLUSIVE{background:var(--inconc-bg);color:var(--inconc-fg);border:2px dashed var(--inconc-fg)}
.v-NOT_RUN{background:var(--notrun-bg);color:var(--notrun-fg);border:2px dotted var(--notrun-fg)}
.v-INFRA_ERROR{background:var(--infra-bg);color:var(--infra-fg);border:3px double var(--infra-fg)}
.v-UNSUPPORTED{background:transparent;color:var(--unsup-fg);border:1px solid var(--unsup-fg)}
.d{display:inline-block;padding:4px 8px;border:1px solid var(--dominant);border-radius:2px;color:var(--dominant);font-family:var(--font-mono);font-weight:800;text-transform:uppercase;line-height:16px}
.legend{display:grid;gap:8px 24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));margin-top:24px}
.legend div{display:flex;gap:8px;align-items:baseline}

/* matrix */
.table-scroll{overflow-x:auto;border:1px solid var(--rule);background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:720px}
th,td{text-align:left;vertical-align:top;padding:16px}
thead th{border-bottom:2px solid var(--dominant);white-space:nowrap}
tbody tr+tr{border-top:1px solid var(--rule)}
tbody th{font-weight:400;overflow-wrap:anywhere;max-width:240px}
.cell{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.cell a{text-decoration:none}
.state{display:flex;gap:8px;align-items:center}
.state .label{min-width:64px}
.mtx-name small{display:block;font-family:var(--font-mono);color:var(--ink-muted)}

/* builds, scenarios, evidence */
.build{padding:32px 0;border-top:1px solid var(--rule)}
.build:first-of-type{border-top:0;padding-top:0}
.build h3{font-family:var(--font-display);font-size:48px;line-height:56px;font-weight:200}
.meta{display:grid;gap:8px 32px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));margin-top:16px}
.meta dd{overflow-wrap:anywhere}
.checks{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:16px}
.checks li{display:flex;gap:8px;align-items:center}
.ok{color:var(--pass-fg)}.bad{color:var(--fail-fg)}
.scenarios{display:grid;gap:0;margin-top:24px;border-top:1px solid var(--rule)}
.scenario{border-bottom:1px solid var(--rule);padding:24px 0}
.scenario:target{border-left:8px solid var(--accent);padding-left:16px}
.scenario-head{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.scenario-head h4{font-weight:800}
.reason{margin-top:8px;max-width:75ch;overflow-wrap:anywhere}
.eo{display:grid;gap:8px 16px;grid-template-columns:auto 1fr;margin-top:16px;max-width:75ch}
.eo dd{overflow-wrap:anywhere}
details{margin-top:16px}
summary{cursor:pointer;font-weight:800;color:var(--dominant)}
.steps{display:grid;gap:16px;margin-top:16px;counter-reset:step}
.step{display:grid;gap:16px;grid-template-columns:1fr;padding:16px;background:var(--surface);border:1px solid var(--rule)}
@media (min-width:800px){.step{grid-template-columns:minmax(0,1fr) 320px}}
.step.decisive{border-left:8px solid var(--accent)}
.step .vals{display:grid;grid-template-columns:auto 1fr;gap:0 16px;margin-top:8px}
.step .vals dd{overflow-wrap:anywhere}
.shot{display:block;border:1px solid var(--rule)}
.shot img{display:block;width:100%;height:auto}
.noshot{padding:16px;border:1px dashed var(--rule);color:var(--ink-muted)}

/* repair record */
.timeline{display:grid;gap:0;margin-top:24px}
.stage{position:relative;padding:0 0 32px 40px}
.stage::before{content:"";position:absolute;left:11px;top:24px;bottom:0;width:2px;background:var(--rule)}
.stage:last-child::before{display:none}
.stage>.dot{position:absolute;left:0;top:0;width:24px;height:24px;border:2px solid var(--dominant);background:var(--paper);border-radius:2px;font-family:var(--font-mono);font-size:16px;line-height:20px;text-align:center;font-weight:800;color:var(--dominant)}
.stage h4{font-weight:800}
.agent{margin-top:16px;padding:16px;border:2px dashed var(--dominant);background:var(--surface)}
.agent>.label{color:var(--dominant)}
.diff{margin-top:16px;border:1px solid var(--rule);background:var(--surface);overflow-x:auto}
.diff span{display:block;padding:0 16px;white-space:pre-wrap;overflow-wrap:anywhere}
.diff .add{background:var(--pass-bg)}
.diff .del{background:var(--fail-bg)}
.diff .hunk{color:var(--ink-muted)}
.meter{display:grid;gap:8px;margin-top:16px;max-width:480px}
.meter div{display:grid;grid-template-columns:120px 1fr auto;gap:16px;align-items:center}
.bar{height:8px;background:var(--rule);position:relative}
.bar i{position:absolute;inset:0 auto 0 0;background:var(--dominant)}

/* contract */
.contract{display:grid;gap:16px;margin-top:16px}
@media (min-width:800px){.contract{grid-template-columns:1fr 1fr}}
.panel{padding:16px;border:1px solid var(--rule);background:var(--surface)}
.panel.judged{background:transparent;border:2px dashed var(--ink-muted)}
.panel ol{display:grid;gap:8px;margin-top:8px}
.calib td,.calib th{padding:8px 16px}

footer{padding:32px 0 64px;border-top:1px solid var(--rule);color:var(--ink-muted)}

@media print{
  html{background:#fff}
  .identity{background:#fff;color:var(--ink);border-bottom:2px solid var(--ink)}
  .identity .label,.identity a{color:var(--ink)}
  details>*{display:block}
  .step,.panel,.table-scroll{break-inside:avoid}
  a{color:var(--ink)}
}
`;

export async function stylesheet(): Promise<string> {
  return `${await fontFaces()}\n${CSS}`;
}
