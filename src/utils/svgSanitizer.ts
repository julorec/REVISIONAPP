/**
 * Pure, dependency-free SVG sanitizer for safely rendering embedded circuit,
 * timing, memory, and math diagrams from quiz JSON without XSS risk.
 */

const BLOCKED_TAGS = [
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'applet',
  'audio',
  'video',
  'animate',
  'set',
];

export function sanitizeSvg(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // Extract the first <svg ...>...</svg> block if surrounded by whitespace
  const match = raw.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (!match) return '';

  let svg = match[0];

  // 1. Remove dangerous paired tags and their content (case-insensitive)
  for (const tag of BLOCKED_TAGS) {
    const pairedRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    const selfClosingRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    svg = svg.replace(pairedRe, '').replace(selfClosingRe, '');
  }

  // 2. Sanitize <style> blocks against @import, expression(), or javascript: URLs
  svg = svg.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, cssBody: string) => {
    const cleaned = cssBody
      .replace(/@import[^;]*;?/gi, '')
      .replace(/url\s*\(\s*['"]?\s*(?:javascript:|data:text\/html)[^)]*\)/gi, '')
      .replace(/expression\s*\([^)]*\)/gi, '');
    return `<style>${cleaned}</style>`;
  });

  // 3. Remove any inline event handlers (onClick, onload, onerror, etc.)
  svg = svg.replace(
    /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ''
  );

  // 4. Neutralize javascript:, vbscript:, or data:text/html in href / xlink:href / src
  svg = svg.replace(
    /\s+(?:xlink:)?(?:href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*')/gi,
    ''
  );

  // 5. Remove any <use> referencing external http/https URLs (keep only local #id refs)
  svg = svg.replace(
    /\s+(?:xlink:)?href\s*=\s*(?:"https?:\/\/[^"]*"|'https?:\/\/[^']*')/gi,
    ''
  );

  // 6. Ensure root <svg> has responsive styling class and role="img" if absent
  svg = svg.replace(/^<svg\b([^>]*)>/i, (_full, attrs: string) => {
    let nextAttrs = attrs;
    if (!/\bxmlns\s*=/i.test(nextAttrs)) {
      nextAttrs += ' xmlns="http://www.w3.org/2000/svg"';
    }
    if (!/\brole\s*=/i.test(nextAttrs)) {
      nextAttrs += ' role="img"';
    }
    return `<svg${nextAttrs}>`;
  });

  return svg.trim();
}
