import type { CodeLanguage } from '../types/quiz';

/**
 * Multi-language syntax highlighter tuned for INSA Rennes ESET 3A courses:
 * - C (pointers, malloc/free, bitwise masks, structures, fixed-width types)
 * - VHDL (entity, architecture, process, std_logic, signal assignments <=)
 * - Assembly (ARM / RISC-V / x86 instructions, registers, immediates, labels)
 * - Python (def, class, numpy/scipy style code, decorators, f-strings)
 */

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeCodeLanguage(raw?: string): CodeLanguage {
  if (!raw) return 'c';
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'c' || cleaned === 'cpp' || cleaned === 'c++' || cleaned === 'h') return 'c';
  if (cleaned === 'vhdl' || cleaned === 'vhd') return 'vhdl';
  if (
    cleaned === 'asm' ||
    cleaned === 'assembly' ||
    cleaned === 'arm' ||
    cleaned === 's' ||
    cleaned === 'nasm' ||
    cleaned === 'riscv' ||
    cleaned === 'x86'
  ) {
    return 'asm';
  }
  if (cleaned === 'python' || cleaned === 'py' || cleaned === 'python3') return 'python';
  if (cleaned === 'text' || cleaned === 'plain' || cleaned === 'txt') return 'text';
  return 'c';
}

export function detectCodeLanguage(code: string, explicit?: string): CodeLanguage {
  if (explicit && explicit.trim().length > 0) {
    return normalizeCodeLanguage(explicit);
  }
  const sample = code.trim();
  // VHDL heuristics
  if (
    /\b(entity|architecture|std_logic|std_logic_vector|rising_edge|downto|process\s*\(|signal\s+\w+\s*:)\b/i.test(
      sample
    )
  ) {
    return 'vhdl';
  }
  // Python heuristics
  if (
    /(^|\n)\s*(def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|elif\b|print\s*\()/m.test(sample) &&
    !/#include\b/.test(sample) &&
    !/;\s*$/m.test(sample.split('\n')[0] ?? '')
  ) {
    return 'python';
  }
  // Assembly heuristics
  if (
    /(^|\n)\s*(MOV|MOVS|LDR|STR|ADD|ADDS|SUB|SUBS|CMP|BNE|BEQ|BL|BX|PUSH|POP|LSL|LSR|AND|ORR|EOR|NOP|JMP|CALL|RET|LW|SW|ADDI)\b/im.test(
      sample
    ) &&
    !/#include\b|\bint\s+main\b|\bvoid\b/.test(sample)
  ) {
    return 'asm';
  }
  return 'c';
}

export function getLanguageLabel(lang: CodeLanguage): string {
  switch (lang) {
    case 'c':
      return 'C';
    case 'vhdl':
      return 'VHDL';
    case 'asm':
      return 'Assembly';
    case 'python':
      return 'Python';
    default:
      return 'Code';
  }
}

// ---------------------------------------------------------------------------
// C Highlighter
// ---------------------------------------------------------------------------
const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double',
  'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long',
  'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static', 'struct',
  'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'bool',
  'true', 'false', 'NULL', 'size_t', 'ssize_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t',
  'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t',
  'int64_t', 'FILE',
]);

const C_STDLIB_FUNCS = new Set([
  'malloc', 'calloc', 'realloc', 'free', 'printf', 'fprintf', 'sprintf', 'snprintf',
  'scanf', 'sscanf', 'fgets', 'fputs', 'puts', 'putchar', 'getchar', 'strlen',
  'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp', 'strchr', 'strstr',
  'memcpy', 'memmove', 'memset', 'memcmp', 'fopen', 'fclose', 'fread', 'fwrite',
  'exit', 'assert',
]);

const C_TOKEN_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^[ \t]*#\s*(?:include|define|ifdef|ifndef|endif|else|elif|undef|pragma)\b[^\n]*)|\b(0[xX][0-9a-fA-F]+[uUlL]*|0[bB][01]+[uUlL]*|0[0-7]+[uUlL]*|\d+\.\d+(?:[eE][+-]?\d+)?[fFlL]?|\d+[uUlL]*)\b|\b([A-Za-z_]\w*)\b|(->|<<=|>>=|<<|>>|&=|\|=|\^=|~|\^|\|\||&&|&|\|)/gm;

export function highlightC(code: string): string {
  let out = '';
  let lastIndex = 0;
  C_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = C_TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIndex, match.index));
    const [full, comment, strLit, preproc, numLit, ident, op] = match;

    if (comment) {
      out += `<span class="hl-c">${escapeHtml(comment)}</span>`;
    } else if (strLit) {
      out += `<span class="hl-s">${escapeHtml(strLit)}</span>`;
    } else if (preproc) {
      out += `<span class="hl-p">${escapeHtml(preproc)}</span>`;
    } else if (numLit) {
      out += `<span class="hl-n">${escapeHtml(numLit)}</span>`;
    } else if (ident) {
      if (C_KEYWORDS.has(ident)) {
        out += `<span class="hl-k">${escapeHtml(ident)}</span>`;
      } else if (C_STDLIB_FUNCS.has(ident)) {
        out += `<span class="hl-fn">${escapeHtml(ident)}</span>`;
      } else {
        out += escapeHtml(ident);
      }
    } else if (op) {
      out += `<span class="hl-op">${escapeHtml(op)}</span>`;
    } else {
      out += escapeHtml(full);
    }

    lastIndex = C_TOKEN_RE.lastIndex;
  }

  out += escapeHtml(code.slice(lastIndex));
  return out;
}

// ---------------------------------------------------------------------------
// VHDL Highlighter
// ---------------------------------------------------------------------------
const VHDL_KEYWORDS = new Set([
  'library', 'use', 'entity', 'is', 'port', 'generic', 'in', 'out', 'inout', 'buffer',
  'end', 'architecture', 'of', 'begin', 'signal', 'variable', 'constant', 'type',
  'subtype', 'component', 'process', 'if', 'then', 'elsif', 'else', 'case', 'when',
  'others', 'for', 'loop', 'while', 'generate', 'map', 'with', 'select', 'downto',
  'to', 'and', 'or', 'xor', 'nand', 'nor', 'not', 'sll', 'srl', 'wait', 'until',
  'after', 'all', 'package', 'body', 'function', 'procedure', 'return',
]);

const VHDL_TYPES_FUNCS = new Set([
  'std_logic', 'std_logic_vector', 'unsigned', 'signed', 'integer', 'natural',
  'positive', 'boolean', 'bit', 'bit_vector', 'rising_edge', 'falling_edge',
  'to_unsigned', 'to_signed', 'to_integer', 'ieee', 'std_logic_1164', 'numeric_std',
]);

const VHDL_TOKEN_RE =
  /(--[^\n]*)|("(?:[^"\\]|\\.)*"|'[01XZUWLH-]')|\b([xXbBoO]"[0-9a-fA-F_]+")|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b|(<=|=>|:=|\/=|&)/gm;

export function highlightVHDL(code: string): string {
  let out = '';
  let lastIndex = 0;
  VHDL_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = VHDL_TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIndex, match.index));
    const [full, comment, strLit, basedLit, numLit, ident, op] = match;

    if (comment) {
      out += `<span class="hl-c">${escapeHtml(comment)}</span>`;
    } else if (strLit) {
      out += `<span class="hl-s">${escapeHtml(strLit)}</span>`;
    } else if (basedLit || numLit) {
      out += `<span class="hl-n">${escapeHtml(basedLit || numLit)}</span>`;
    } else if (ident) {
      const lower = ident.toLowerCase();
      if (VHDL_KEYWORDS.has(lower)) {
        out += `<span class="hl-k">${escapeHtml(ident)}</span>`;
      } else if (VHDL_TYPES_FUNCS.has(lower)) {
        out += `<span class="hl-fn">${escapeHtml(ident)}</span>`;
      } else {
        out += escapeHtml(ident);
      }
    } else if (op) {
      out += `<span class="hl-op">${escapeHtml(op)}</span>`;
    } else {
      out += escapeHtml(full);
    }

    lastIndex = VHDL_TOKEN_RE.lastIndex;
  }

  out += escapeHtml(code.slice(lastIndex));
  return out;
}

// ---------------------------------------------------------------------------
// Assembly Highlighter (ARM Cortex-M, RISC-V, x86)
// ---------------------------------------------------------------------------
const ASM_MNEMONICS = new Set([
  'mov', 'movs', 'mvn', 'ldr', 'ldrb', 'ldrh', 'str', 'strb', 'strh', 'add', 'adds',
  'adc', 'sub', 'subs', 'sbc', 'mul', 'muls', 'div', 'sdiv', 'udiv', 'and', 'ands',
  'orr', 'orrs', 'eor', 'eors', 'bic', 'lsl', 'lsr', 'asr', 'ror', 'cmp', 'cmn',
  'tst', 'teq', 'b', 'bl', 'bx', 'blx', 'beq', 'bne', 'bgt', 'blt', 'bge', 'ble',
  'bhi', 'blo', 'push', 'pop', 'nop', 'svc', 'wfi', 'jmp', 'je', 'jne', 'jg', 'jl',
  'call', 'ret', 'lea', 'inc', 'dec', 'xor', 'shl', 'shr', 'lw', 'sw', 'addi', 'li',
  'la', 'jal', 'jalr', 'ecall',
]);

const ASM_REGISTERS = new Set([
  'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12',
  'sp', 'lr', 'pc', 'cpsr', 'apsr', 'spsr',
  'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp',
  'rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rsp', 'rbp',
  'x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'a0', 'a1', 'a2', 'a3', 't0', 't1', 't2', 's0', 's1', 'ra', 'zero',
]);

const ASM_TOKEN_RE =
  /(;[^\n]*|@[^\n]*|\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(^[ \t]*\.[A-Za-z_]\w*\b)|(^[ \t]*[A-Za-z_]\w*:)|(#-?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)|\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+)\b)|\b([A-Za-z_]\w*)\b/gm;

export function highlightAssembly(code: string): string {
  let out = '';
  let lastIndex = 0;
  ASM_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ASM_TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIndex, match.index));
    const [full, comment, strLit, directive, label, numLit, ident] = match;

    if (comment) {
      out += `<span class="hl-c">${escapeHtml(comment)}</span>`;
    } else if (strLit) {
      out += `<span class="hl-s">${escapeHtml(strLit)}</span>`;
    } else if (directive) {
      out += `<span class="hl-p">${escapeHtml(directive)}</span>`;
    } else if (label) {
      out += `<span class="hl-op">${escapeHtml(label)}</span>`;
    } else if (numLit) {
      out += `<span class="hl-n">${escapeHtml(numLit)}</span>`;
    } else if (ident) {
      const lower = ident.toLowerCase();
      if (ASM_MNEMONICS.has(lower)) {
        out += `<span class="hl-k">${escapeHtml(ident)}</span>`;
      } else if (ASM_REGISTERS.has(lower)) {
        out += `<span class="hl-fn">${escapeHtml(ident)}</span>`;
      } else {
        out += escapeHtml(ident);
      }
    } else {
      out += escapeHtml(full);
    }

    lastIndex = ASM_TOKEN_RE.lastIndex;
  }

  out += escapeHtml(code.slice(lastIndex));
  return out;
}

// ---------------------------------------------------------------------------
// Python Highlighter
// ---------------------------------------------------------------------------
const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const PY_BUILTINS = new Set([
  'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'dict', 'enumerate',
  'filter', 'float', 'format', 'hex', 'int', 'isinstance', 'len', 'list', 'map',
  'max', 'min', 'open', 'pow', 'print', 'range', 'round', 'set', 'sorted', 'str',
  'sum', 'tuple', 'type', 'zip', 'np', 'fft', 'array', 'linspace', 'zeros', 'ones',
]);

const PY_TOKEN_RE =
  /(#[^\n]*)|([fFrRbBuU]?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))|(^[ \t]*@[A-Za-z_][\w.]*)|\b(0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d+\.\d+(?:[eE][+-]?\d+)?j?|\d+j?)\b|\b([A-Za-z_]\w*)\b|(->|:=|\*\*|\/\/|==|!=|<=|>=|<<|>>)/gm;

export function highlightPython(code: string): string {
  let out = '';
  let lastIndex = 0;
  PY_TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PY_TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIndex, match.index));
    const [full, comment, strLit, decorator, numLit, ident, op] = match;

    if (comment) {
      out += `<span class="hl-c">${escapeHtml(comment)}</span>`;
    } else if (strLit) {
      out += `<span class="hl-s">${escapeHtml(strLit)}</span>`;
    } else if (decorator) {
      out += `<span class="hl-p">${escapeHtml(decorator)}</span>`;
    } else if (numLit) {
      out += `<span class="hl-n">${escapeHtml(numLit)}</span>`;
    } else if (ident) {
      if (PY_KEYWORDS.has(ident)) {
        out += `<span class="hl-k">${escapeHtml(ident)}</span>`;
      } else if (PY_BUILTINS.has(ident)) {
        out += `<span class="hl-fn">${escapeHtml(ident)}</span>`;
      } else {
        out += escapeHtml(ident);
      }
    } else if (op) {
      out += `<span class="hl-op">${escapeHtml(op)}</span>`;
    } else {
      out += escapeHtml(full);
    }

    lastIndex = PY_TOKEN_RE.lastIndex;
  }

  out += escapeHtml(code.slice(lastIndex));
  return out;
}

export function highlightCode(code: string, lang: CodeLanguage = 'c'): string {
  switch (lang) {
    case 'vhdl':
      return highlightVHDL(code);
    case 'asm':
      return highlightAssembly(code);
    case 'python':
      return highlightPython(code);
    case 'text':
      return escapeHtml(code);
    case 'c':
    default:
      return highlightC(code);
  }
}
