import { useMemo } from 'react';
import katex from 'katex';
import type { CodeLanguage } from '../types/quiz';
import {
  detectCodeLanguage,
  getLanguageLabel,
  highlightCode,
} from '../utils/codeHighlight';
import { parseRichSegments } from '../utils/richText';
import { sanitizeSvg } from '../utils/svgSanitizer';

interface CodeBlockProps {
  code: string;
  lang?: CodeLanguage | string;
  className?: string;
}

export function CodeBlock({ code, lang, className = '' }: CodeBlockProps) {
  const resolvedLang = useMemo(() => detectCodeLanguage(code, lang), [code, lang]);
  const highlighted = useMemo(() => highlightCode(code, resolvedLang), [code, resolvedLang]);
  const label = getLanguageLabel(resolvedLang);

  return (
    <div
      className={`relative rounded-lg border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3.5 py-1.5 text-[11px] font-mono-code uppercase tracking-[0.06em] text-[var(--dim)]">
        <span>{label}</span>
      </div>
      <pre
        className="m-0 overflow-x-auto px-4 py-3 text-[13px] leading-[1.65] font-mono-code tab-[4] text-[var(--text)]"
        data-code-lang={resolvedLang}
      >
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

interface SafeSvgBlockProps {
  svg: string;
  className?: string;
}

export function SafeSvgBlock({ svg, className = '' }: SafeSvgBlockProps) {
  const sanitized = useMemo(() => sanitizeSvg(svg), [svg]);
  if (!sanitized) return null;

  return (
    <figure
      className={`my-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 text-[var(--text)] overflow-x-auto ${className}`}
      data-testid="svg-diagram"
    >
      <div
        className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </figure>
  );
}

function renderKatexHtml(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
    });
  } catch {
    return tex;
  }
}

interface RichContentProps {
  text: string;
  className?: string;
  inline?: boolean;
}

/**
 * Renders mixed French technical prose with:
 * - KaTeX inline ($...$) and display ($$...$$) formulas
 * - Multi-language fenced code blocks (C, VHDL, Assembly, Python)
 * - Inline monospace code (`...`)
 * - Sanitized inline <svg>...</svg> diagrams
 */
export function RichContent({ text, className = '', inline = false }: RichContentProps) {
  const segments = useMemo(() => parseRichSegments(text), [text]);

  if (segments.length === 0) return null;

  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <span key={idx} className="whitespace-pre-wrap break-words">
              {seg.value}
            </span>
          );
        }
        if (seg.type === 'code-inline') {
          return (
            <code
              key={idx}
              className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.88em] font-mono-code text-[var(--text)]"
            >
              {seg.value}
            </code>
          );
        }
        if (seg.type === 'math-inline') {
          return (
            <span
              key={idx}
              className="inline-block align-baseline"
              dangerouslySetInnerHTML={{ __html: renderKatexHtml(seg.value, false) }}
            />
          );
        }
        if (seg.type === 'math-display') {
          return (
            <div
              key={idx}
              className="my-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderKatexHtml(seg.value, true) }}
            />
          );
        }
        if (seg.type === 'code-block') {
          return <CodeBlock key={idx} code={seg.value} lang={seg.lang} className="my-3" />;
        }
        if (seg.type === 'svg') {
          return <SafeSvgBlock key={idx} svg={seg.value} />;
        }
        return null;
      })}
    </Wrapper>
  );
}
