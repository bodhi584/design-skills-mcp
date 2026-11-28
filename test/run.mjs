import fs from 'fs';
import { checkContrast, designDirection, lintDesign } from '../src/design.js';
let pass=0, fail=0; const ok=(c,m)=>{ c?pass++:(fail++,console.log('FAIL',m)); };
// G3
const ref=[['#777777','#ffffff',4.48],['#000','#fff',21],['#767676','#fff',4.54],['#ffffff','#2563eb',5.17],['#595959','#fff',7.0]];
const r=checkContrast({pairs:ref.map(([fg,bg])=>({fg,bg}))}).results;
ref.forEach(([f,b,v],i)=>ok(Math.abs(r[i].ratio-v)<0.02,`contrast ${f}/${b} got ${r[i].ratio} want ${v}`));
ok(r[0].fixed_fg && checkContrast({pairs:[{fg:r[0].fixed_fg,bg:'#fff'}]}).results[0].aa,'fixed_fg passes');
// G1
const briefs=['landing page for a free remote MCP server for developers','telc German exam practice site for adults','custom song gift for a wedding anniversary','SaaS analytics dashboard for marketing teams','Pokemon daily guessing game','AI photo to video generator, playful'];
for(const b of briefs){ const d=designDirection({product:b}); const all=[...d.palette.light.contrast_checks,...d.palette.dark.contrast_checks].filter(c=>c.aa_text!==undefined);
  const bad=all.filter(c=>!c.aa_text); ok(!bad.length,`${b}: ${JSON.stringify(bad)}`); ok(d.typography.display&&d.css_variables.includes('--color-primary'),'tokens '+b); console.log(b,'->',d.preset, d.palette.light.tokens.primary, d.palette.dark.tokens.primary, d.typography.display+'/'+d.typography.body);}
const br=designDirection({product:'bakery website',brand_color:'#8b5cf6'}); ok([...br.palette.light.contrast_checks,...br.palette.dark.contrast_checks].every(c=>c.aa_text!==false),'brand palette AA');
// G2
const seeded=['zoom-disabled','title','html-lang','landmark-main','h1-multiple','heading-skip','heading-empty','img-alt','img-size','input-label','button-name','link-text','link-as-button','click-non-button','tabindex-positive','autoplay-sound','duplicate-id','contrast','focus-removed','reduced-motion','transition-all','vw-font','too-many-fonts','tell-cream-terracotta','tell-eyebrows','tell-gradients','tell-card-kit','tell-middots','tell-numbering','copy-buzzwords','copy-placeholder','arrow-cta','typography-ellipsis','svg-a11y'];
const L=lintDesign({html:fs.readFileSync(new URL('./bad.html',import.meta.url),'utf8')}); const got=new Set(L.findings.map(f=>f.rule));
const missed=seeded.filter(s=>!got.has(s)); console.log('bad fixture: caught',seeded.length-missed.length,'/',seeded.length,'missed',missed,'score',L.score);
ok((seeded.length-missed.length)/seeded.length>=0.9,'G2 recall');
// good page
const G=lintDesign({html:fs.readFileSync(new URL('./good.html',import.meta.url),'utf8')}); console.log('good page',G.score,G.counts,G.findings.map(f=>f.severity+':'+f.rule+': '+f.message.slice(0,90)));
// regressions found by dogfooding (2026-11-27)
{ const R=lintDesign({html:'<!doctype html><html lang="en"><head><title>t</title><meta name="viewport" content="width=device-width"><style>body{background:#fff}.b{color:#0071e3;background:rgba(0,113,227,.07)}</style></head><body><main><h1>x</h1><a class="b" href="/">Go</a></main></body></html>'});
  const c=R.findings.find(f=>f.rule==='contrast'); ok(!c || c.severity!=='error', 'translucent bg blended over page bg: '+(c&&c.message)); }
{ const R=lintDesign({html:'<!doctype html><html lang="en"><head><title>t</title><meta name="viewport" content="width=device-width"></head><body><main><h1>x</h1><h2 id="t"></h2><script>document.getElementById("t").textContent="y"</script></main></body></html>'});
  const h=R.findings.find(f=>f.rule==='heading-empty'); ok(h && h.severity==='tip', 'script-filled heading is a tip'); }
{ const R=lintDesign({html:'<p style="font-family:&quot;Lora&quot;,serif">a</p><style>.x{font-family:var(--nope),sans-serif}</style>'});
  ok(!(R.stats.font_families||[]).some(f=>/^var\(|&quot/.test(f)), 'font list has no var()/&quot: '+R.stats.font_families); }
{ const big='<!doctype html><html lang="en"><head><title>t</title></head><body><main><h1>x</h1></main><script>'+'a'.repeat(450000)+'</script></body></html>';
  ok(!lintDesign({html:big}).error, 'script bodies do not count toward size limit'); }
// regressions 2026-11-28 (issue i_3f9312a851694d)
{ const R=lintDesign({html:'<!doctype html><html lang="en"><head><title>t</title><meta name="viewport" content="width=device-width"></head><body><main><h1>x</h1><input type="file" id="f" hidden><input type="file" style="display:none"><input aria-hidden="true" tabindex="-1"><input name="q"></main></body></html>'});
  const l=R.findings.filter(f=>f.rule==='input-label'); ok(l.length===1 && /name="q"/.test(l[0].message), 'hidden inputs skipped, visible unlabeled still caught: '+JSON.stringify(l.map(f=>f.message))); }
{ const R=lintDesign({html:'<!doctype html><html lang="en"><head><title>t</title><style>:root{--ink:#111;--bg:#151515;--text:#222}</style></head><body><main><h1>x</h1></main></body></html>'});
  const tk=R.findings.filter(f=>f.rule==='token-contrast'); ok(tk.some(f=>/--ink/.test(f.message)&&f.severity==='warn'), '--ink is warn'); ok(tk.some(f=>/--text/.test(f.message)&&f.severity==='error'), '--text still error'); }
{ const R=lintDesign({html:'<!doctype html><html lang="en"><head><title>t</title><style>body{background:#fbf9f4}.nav a:hover{background:rgba(255,255,255,.14);color:#fff}.chip{background:rgba(255,106,43,.1);color:#ff6a2b}</style></head><body><main><h1>x</h1><a id="rules"></a><a href="/x"></a></main></body></html>'});
  const c=R.findings.filter(f=>f.rule==='contrast'); ok(!c.some(f=>/nav a:hover/.test(f.message)), 'white wash under white text skipped'); ok(c.some(f=>/chip/.test(f.message)), 'brand tint still checked over page bg');
  const ln=R.findings.filter(f=>f.rule==='link-name'); ok(ln.length===1, 'anchor target without href is not a link: '+ln.length); }
// worker.js carries its own copy of lintDesign (it is deployed as a single file): both copies must match
{ const seg=s=>{const a=s.indexOf('function lintDesign'); return s.slice(a, s.indexOf('\n}\n',a)+3);};
  ok(seg(fs.readFileSync(new URL('../src/design.js',import.meta.url),'utf8'))===seg(fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8')), 'lintDesign in worker.js matches design.js'); }
console.log(`pass ${pass} fail ${fail}`);
