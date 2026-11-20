import type { CodeLanguage } from '../types/quiz';
import { normalizeCodeLanguage } from './codeHighlight';

/**
 * Parses mixed prose containing:
 * - Embedded <svg ...>...</svg> diagrams
 * - Fenced code blocks (```c, ```vhdl, ```asm, ```python, etc.)
 * - KaTeX display math ($$...$$, \[...\])
 * - Inline code (`...`)
 * - KaTeX inline math ($...$, \(...\))
 */

export type RichSegment =
  | { type: 'text'; value: string }
  | { type: 'svg'; value: string }
  | { type: 'math-display'; value: string }
  | { type: 'math-inline'; value: string }
  | { type: 'code-block'; lang: CodeLanguage; value: string }
  | { type: 'code-inline'; value: string };

const BLOCK_AND_INLINE_RE =
  /(<svg\b[\s\S]*?<\/svg>)|(```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```)|(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])|(`[^`\n]+`)|(\$(?!\s)([^$\n]+?)(?<!\s)\$|\\\(([\s\S]+?)\\\))/gi;

export function parseRichSegments(input: string): RichSegment[] {
  if (!input) return [];
  const segments: RichSegment[] = [];
  let lastIndex = 0;
  BLOCK_AND_INLINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = BLOCK_AND_INLINE_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }

    const [
      full,
      svgBlock,
      codeBlock,
      codeLang,
      codeBody,
      displayMath,
      inlineCode,
      inlineMathFull,
      inlineDollarBody,
      inlineParenBody,
    ] = match;

    if (svgBlock) {
      segments.push({ type: 'svg', value: svgBlock });
    } else if (codeBlock) {
      segments.push({
        type: 'code-block',
        lang: normalizeCodeLanguage(codeLang || 'c'),
        value: (codeBody || '').replace(/\n$/, ''),
      });
    } else if (displayMath) {
      const inner = displayMath.slice(2, -2).trim();
      segments.push({ type: 'math-display', value: inner });
    } else if (inlineCode) {
      segments.push({ type: 'code-inline', value: inlineCode.slice(1, -1) });
    } else if (inlineMathFull) {
      const inner = (inlineDollarBody ?? inlineParenBody ?? '').trim();
      segments.push({ type: 'math-inline', value: inner });
    } else {
      segments.push({ type: 'text', value: full });
    }

    lastIndex = BLOCK_AND_INLINE_RE.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }

  return segments;
}
