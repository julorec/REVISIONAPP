import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCodeLanguage,
  escapeHtml,
  highlightAssembly,
  highlightC,
  highlightCode,
  highlightPython,
  highlightVHDL,
} from './codeHighlight';

test('escapeHtml neutralizes HTML special characters', () => {
  assert.equal(escapeHtml('<script>"a&b"</script>'), '&lt;script&gt;&quot;a&amp;b&quot;&lt;/script&gt;');
});

test('highlightC highlights keywords, malloc/free, bitwise operators, hex literals, and pointers', () => {
  const sample = `#include <stdlib.h>\nuint8_t *p = malloc(4);\np->val = (0x0F << 2) & ~1; // mask\nfree(p);`;
  const html = highlightC(sample);
  assert.match(html, /class="hl-p"#include|class="hl-p">&?#?include|hl-p">#include/);
  assert.ok(html.includes('<span class="hl-k">uint8_t</span>'));
  assert.ok(html.includes('<span class="hl-fn">malloc</span>'));
  assert.ok(html.includes('<span class="hl-fn">free</span>'));
  assert.ok(html.includes('<span class="hl-op">-&gt;</span>'));
  assert.ok(html.includes('<span class="hl-n">0x0F</span>'));
  assert.ok(html.includes('<span class="hl-op">&lt;&lt;</span>'));
  assert.ok(html.includes('<span class="hl-c">// mask</span>'));
});

test('highlightVHDL highlights entity, std_logic, comments, and signal assignment <=', () => {
  const sample = `-- Bascule D\nentity dff is\n  port(clk : in std_logic);\nend entity;\nq <= d;`;
  const html = highlightVHDL(sample);
  assert.ok(html.includes('<span class="hl-c">-- Bascule D</span>'));
  assert.ok(html.includes('<span class="hl-k">entity</span>'));
  assert.ok(html.includes('<span class="hl-fn">std_logic</span>'));
  assert.ok(html.includes('<span class="hl-op">&lt;=</span>'));
});

test('highlightAssembly highlights ARM mnemonics, registers, immediates, and labels', () => {
  const sample = `loop:\n  MOV r0, #0x10 ; init\n  ADD r1, r0, #4\n  BNE loop`;
  const html = highlightAssembly(sample);
  assert.ok(html.includes('<span class="hl-op">loop:</span>'));
  assert.ok(html.includes('<span class="hl-k">MOV</span>'));
  assert.ok(html.includes('<span class="hl-fn">r0</span>'));
  assert.ok(html.includes('<span class="hl-n">#0x10</span>'));
  assert.ok(html.includes('<span class="hl-c">; init</span>'));
});

test('highlightPython highlights def, keywords, builtins, comments, and strings', () => {
  const sample = `import numpy as np\ndef gain(x):\n    # dB\n    return len("ok")`;
  const html = highlightPython(sample);
  assert.ok(html.includes('<span class="hl-k">import</span>'));
  assert.ok(html.includes('<span class="hl-k">def</span>'));
  assert.ok(html.includes('<span class="hl-fn">len</span>'));
  assert.ok(html.includes('<span class="hl-s">&quot;ok&quot;</span>'));
  assert.ok(html.includes('<span class="hl-c"># dB</span>'));
});

test('detectCodeLanguage infers VHDL, Python, Assembly, and C accurately', () => {
  assert.equal(detectCodeLanguage('signal q : std_logic;'), 'vhdl');
  assert.equal(detectCodeLanguage('def fft_mag(x):\n    return abs(x)'), 'python');
  assert.equal(detectCodeLanguage('MOV r0, #5\nADD r0, r0, #1'), 'asm');
  assert.equal(detectCodeLanguage('int *p = malloc(sizeof(int));'), 'c');
  assert.equal(detectCodeLanguage('anything', 'VHDL'), 'vhdl');
  assert.ok(highlightCode('MOV r0, #1', 'asm').includes('hl-k'));
});
