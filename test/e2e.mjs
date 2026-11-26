import { designDirection, lintDesign, checkContrast } from '../src/design.js';
for (const b of ['telc German exam practice for adults','free AI photo to video generator','wedding custom song gift']) {
  const d = designDirection({ product: b });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title><style>${d.css_variables}\n${d.starter_css}</style></head><body><main><h1>Title</h1><p class="muted">Sub</p><label for="e">Email</label><input id="e" type="email" autocomplete="email"><button class="btn btn-primary">Start practice</button><a class="btn btn-secondary" href="/x">See the test format</a><section class="panel"><h2>Section</h2><p>Text</p></section></main></body></html>`;
  const L = lintDesign({ html });
  const t=d.palette.light.tokens, k=d.palette.dark.tokens;
  const c = checkContrast({ pairs: [{fg:t['on-primary'],bg:t.primary},{fg:t['primary-text'],bg:t.surface},{fg:k['on-primary'],bg:k.primary},{fg:t.muted,bg:t.surface}] }).results.map(r=>r.ratio);
  console.log(b, '| preset', d.preset, '| lint', L.score, JSON.stringify(L.findings.map(f=>f.rule)), '| contrast', c.join(','));
}
