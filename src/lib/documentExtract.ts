/**
 * Zero-dependency browser/Node document extractor for Coach Partiels ingestion.
 * - PDF & images: encoded to base64 for native Gemini multimodal understanding.
 * - DOCX, ODT, XLSX, PPTX: unzipped via standard DecompressionStream('deflate-raw') + XML text extraction.
 * - TXT, MD, CSV, C, ASM, SH, PY: decoded directly as UTF-8 text.
 */

export interface ExtractedDocument {
  filename: string;
  mimeType: string;
  fileSize: number;
  mode: 'binary' | 'text';
  base64?: string;
  text?: string;
  summaryInfo: string;
}

const MAX_BINARY_BYTES = 18 * 1024 * 1024; // 18 MB inline limit
const MAX_TEXT_CHARS = 120_000;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  await writer.write(new Uint8Array(compressed));
  await writer.close();
  const ab = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Minimal ZIP Central Directory parser (supports stored=0 and deflate=8 entries).
 */
export async function readZipTextEntries(
  buf: ArrayBuffer,
  predicate: (entryName: string) => boolean
): Promise<Array<{ name: string; text: string }>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // Locate End of Central Directory record (0x06054b50)
  let eocd = -1;
  const minPos = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minPos; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Archive ZIP/Office invalide.');

  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder('utf-8');
  const results: Array<{ name: string; text: string }> = [];

  let pos = cdOffset;
  const end = cdOffset + cdSize;
  while (pos + 46 <= end) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;

    if (!predicate(name)) continue;

    // Parse Local File Header to locate compressed payload
    const lfNameLen = view.getUint16(localHeaderOffset + 26, true);
    const lfExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lfNameLen + lfExtraLen;
    const payload = bytes.subarray(dataStart, dataStart + compSize);

    let outBytes: Uint8Array;
    if (method === 0) {
      outBytes = payload;
    } else if (method === 8) {
      outBytes = await inflateRaw(payload);
    } else {
      continue;
    }
    results.push({ name, text: decoder.decode(outBytes) });
  }
  return results;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripXmlToLines(xml: string, blockTags: RegExp): string {
  return decodeXmlEntities(
    xml
      .replace(blockTags, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim()
  );
}

async function extractOfficeText(buf: ArrayBuffer, ext: string): Promise<string> {
  if (ext === 'docx') {
    const entries = await readZipTextEntries(
      buf,
      (n) => n === 'word/document.xml' || /^word\/(header|footer)\d*\.xml$/.test(n)
    );
    return entries.map((e) => stripXmlToLines(e.text, /<\/w:(?:p|tr)>/g)).join('\n');
  }

  if (ext === 'odt' || ext === 'odp' || ext === 'ods') {
    const entries = await readZipTextEntries(buf, (n) => n === 'content.xml');
    return entries.map((e) => stripXmlToLines(e.text, /<\/text:(?:p|h)|<\/table:table-row>/g)).join('\n');
  }

  if (ext === 'pptx') {
    const entries = await readZipTextEntries(buf, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return entries
      .map((e, i) => `--- Slide ${i + 1} ---\n` + stripXmlToLines(e.text, /<\/a:p>/g))
      .join('\n\n');
  }

  if (ext === 'xlsx') {
    const entries = await readZipTextEntries(
      buf,
      (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
    );
    const ssEntry = entries.find((e) => e.name === 'xl/sharedStrings.xml');
    const sharedStrings: string[] = [];
    if (ssEntry) {
      const siMatches = ssEntry.text.matchAll(/<si[\s>][\s\S]*?<\/si>/g);
      for (const m of siMatches) {
        const parts = Array.from(m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((t) => decodeXmlEntities(t[1]));
        sharedStrings.push(parts.join(''));
      }
    }
    const sheets = entries
      .filter((e) => e.name.startsWith('xl/worksheets/'))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const out: string[] = [];
    for (const sh of sheets) {
      const rows = sh.text.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
      for (const rm of rows) {
        const cells: string[] = [];
        const cellMatches = rm[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);
        for (const cm of cellMatches) {
          const attrs = cm[1];
          const body = cm[2];
          const vMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
          if (!vMatch) continue;
          const isShared = /\bt="s"/.test(attrs);
          const val = isShared ? sharedStrings[Number(vMatch[1])] ?? '' : decodeXmlEntities(vMatch[1]);
          if (val.trim()) cells.push(val.trim());
        }
        if (cells.length) out.push(cells.join(' | '));
      }
    }
    return out.join('\n');
  }

  return '';
}

export async function extractDocumentForGemini(file: File): Promise<ExtractedDocument> {
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type || guessMimeType(ext);
  const fileSize = file.size;

  // Native multimodal binary for PDF and images
  if (mimeType === 'application/pdf' || ext === 'pdf' || mimeType.startsWith('image/')) {
    if (fileSize > MAX_BINARY_BYTES) {
      throw new Error(`Le fichier « ${filename} » dépasse 18 Mo (${(fileSize / 1048576).toFixed(1)} Mo).`);
    }
    const buf = await file.arrayBuffer();
    return {
      filename,
      mimeType: ext === 'pdf' ? 'application/pdf' : mimeType,
      fileSize,
      mode: 'binary',
      base64: arrayBufferToBase64(buf),
      summaryInfo: `${ext.toUpperCase()} multimodal (${(fileSize / 1024).toFixed(0)} Ko)`,
    };
  }

  // Office / OpenDocument ZIP formats
  if (['docx', 'odt', 'xlsx', 'pptx', 'odp', 'ods'].includes(ext)) {
    const buf = await file.arrayBuffer();
    const rawText = await extractOfficeText(buf, ext);
    if (!rawText.trim()) {
      throw new Error(`Impossible d'extraire du texte depuis « ${filename} ».`);
    }
    const text = rawText.slice(0, MAX_TEXT_CHARS);
    return {
      filename,
      mimeType,
      fileSize,
      mode: 'text',
      text,
      summaryInfo: `${ext.toUpperCase()} extrait (${text.length.toLocaleString('fr-FR')} caractères)`,
    };
  }

  // Plain text / source code / markdown / csv
  const rawText = await file.text();
  if (!rawText.trim()) {
    throw new Error(`Le fichier « ${filename} » semble vide.`);
  }
  const text = rawText.slice(0, MAX_TEXT_CHARS);
  return {
    filename,
    mimeType: mimeType || 'text/plain',
    fileSize,
    mode: 'text',
    text,
    summaryInfo: `Texte extrait (${text.length.toLocaleString('fr-FR')} caractères)`,
  };
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}
