import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg } from './svgSanitizer';
import { parseRichSegments } from './richText';

test('sanitizeSvg preserves safe technical diagram SVG and adds role="img"', () => {
  const safe = `<svg viewBox="0 0 200 100"><line x1="10" y1="50" x2="190" y2="50" stroke="currentColor"/><circle cx="100" cy="50" r="10"/></svg>`;
  const out = sanitizeSvg(safe);
  assert.ok(out.includes('<line x1="10"'));
  assert.ok(out.includes('<circle cx="100"'));
  assert.ok(out.includes('role="img"'));
});

test('sanitizeSvg strips scripts, event handlers, foreignObject, and javascript hrefs', () => {
  const malicious = `<svg viewBox="0 0 100 100" onload="alert(1)"><script>alert(2)</script><foreignObject><div>xss</div></foreignObject><a href="javascript:alert(3)"><rect width="10" height="10" onclick="evil()"/></a></svg>`;
  const out = sanitizeSvg(malicious);
  assert.ok(!out.toLowerCase().includes('<script'));
  assert.ok(!out.toLowerCase().includes('onload'));
  assert.ok(!out.toLowerCase().includes('onclick'));
  assert.ok(!out.toLowerCase().includes('foreignobject'));
  assert.ok(!out.toLowerCase().includes('javascript:'));
  assert.ok(out.includes('<rect width="10" height="10"'));
});

test('parseRichSegments splits inline math, display math, fenced code, inline code, and SVG', () => {
  const input = `Soit $f_c = 1\\,\\text{kHz}$ et:\n$$H(f) = \\frac{1}{1+j f/f_c}$$\n\`\`\`vhdl\nq <= d;\n\`\`\`\n<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>\nFin \`ok\`.`;
  const segs = parseRichSegments(input);
  assert.equal(segs.some((s) => s.type === 'math-inline' && s.value.includes('f_c')), true);
  assert.equal(segs.some((s) => s.type === 'math-display' && s.value.includes('H(f)')), true);
  assert.equal(segs.some((s) => s.type === 'code-block' && s.lang === 'vhdl' && s.value === 'q <= d;'), true);
  assert.equal(segs.some((s) => s.type === 'svg' && s.value.startsWith('<svg')), true);
  assert.equal(segs.some((s) => s.type === 'code-inline' && s.value === 'ok'), true);
});
