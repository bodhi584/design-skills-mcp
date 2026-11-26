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
console.log(`pass ${pass} fail ${fail}`);
