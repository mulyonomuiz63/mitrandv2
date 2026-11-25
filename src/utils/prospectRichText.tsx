import React from 'react';

export interface RichTextColorSwatch {
  label: string;
  hex: string;
}

export const PROSPECT_TEXT_COLORS: RichTextColorSwatch[] = [
  { label: 'Hitam', hex: '#000000' },
  { label: 'Biru ND', hex: '#092147' },
  { label: 'Emas ND', hex: '#B5945E' },
  { label: 'Merah', hex: '#B91C1C' },
  { label: 'Hijau', hex: '#047857' },
  { label: 'Abu-abu', hex: '#475569' },
];

export interface RichTextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
}

export interface RichTextSegment extends RichTextStyle {
  text: string;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeHexColor(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (HEX_COLOR_RE.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  const shortHex = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toUpperCase();
  }
  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(trimmed);
  if (rgbMatch) {
    const toHex = (n: string) =>
      Math.max(0, Math.min(255, Number(n) || 0))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`.toUpperCase();
  }
  return undefined;
}

function sameStyle(a: RichTextStyle, b: RichTextStyle): boolean {
  return (
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.italic) === Boolean(b.italic) &&
    Boolean(a.underline) === Boolean(b.underline) &&
    Boolean(a.strike) === Boolean(b.strike) &&
    (a.color || '') === (b.color || '')
  );
}

function mergeSegments(segments: RichTextSegment[]): RichTextSegment[] {
  const out: RichTextSegment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameStyle(prev, seg)) {
      prev.text += seg.text;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

// Inline token patterns (ordered from most specific to simplest)
const TOKEN_REGEX =
  /\[color=(#[0-9a-fA-F]{6})\]([\s\S]+?)\[\/color\]|\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\n]+?)\*/g;

function parseRecursive(input: string, inherited: RichTextStyle, depth = 0): RichTextSegment[] {
  if (!input) return [];
  if (depth > 8) {
    return [{ text: input, ...inherited }];
  }

  const results: RichTextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(TOKEN_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      results.push({ text: input.slice(lastIndex, match.index), ...inherited });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // [color=#RRGGBB]...[/color]
      const color = normalizeHexColor(match[1]);
      results.push(...parseRecursive(match[2], { ...inherited, color }, depth + 1));
    } else if (match[3] !== undefined) {
      // ***bold + italic***
      results.push(...parseRecursive(match[3], { ...inherited, bold: true, italic: true }, depth + 1));
    } else if (match[4] !== undefined) {
      // **bold**
      results.push(...parseRecursive(match[4], { ...inherited, bold: true }, depth + 1));
    } else if (match[5] !== undefined) {
      // __underline__
      results.push(...parseRecursive(match[5], { ...inherited, underline: true }, depth + 1));
    } else if (match[6] !== undefined) {
      // ~~strikethrough~~
      results.push(...parseRecursive(match[6], { ...inherited, strike: true }, depth + 1));
    } else if (match[7] !== undefined) {
      // *italic*
      results.push(...parseRecursive(match[7], { ...inherited, italic: true }, depth + 1));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    results.push({ text: input.slice(lastIndex), ...inherited });
  }

  return results;
}

/**
 * Parses safe inline rich text markup into styled text segments.
 * Supports: **bold**, *italic*, __underline__, ~~strike~~, [color=#RRGGBB]...[/color].
 */
export function parseProspectRichText(input: string): RichTextSegment[] {
  if (!input) return [];
  return mergeSegments(parseRecursive(String(input), {}));
}

export type ProspectLetterVariables = Record<string, string>;

/**
 * Replaces dynamic letter placeholders (e.g. {{NAMA_PERUSAHAAN}}, {{ALAMAT_PERUSAHAAN}},
 * {{TANGGAL_SURAT}}, {{NOMOR_SURAT}}, {{NAMA_MITRA}}, etc.) cleanly inside text.
 */
export function interpolateProspectVariables(
  text: string,
  variables?: ProspectLetterVariables
): string {
  if (!text || !variables) return text;
  return text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (match, rawKey) => {
    const key = String(rawKey || '').toUpperCase();
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key] ?? '';
    }
    return match;
  });
}

/**
 * Removes inline formatting markers to produce clean plain text (e.g., for vector PDF fallback).
 */
export function stripProspectRichText(input: string, variables?: ProspectLetterVariables): string {
  if (!input) return '';
  return parseProspectRichText(input)
    .map((s) => interpolateProspectVariables(s.text, variables))
    .join('');
}

function splitAutoBold(text: string, phrases: string[]): Array<{ text: string; autoBold: boolean }> {
  if (!text || phrases.length === 0) {
    return [{ text, autoBold: false }];
  }
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  return text
    .split(regex)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, autoBold: phrases.includes(part) }));
}

function renderTextWithLineBreaks(text: string, keyPrefix: string): React.ReactNode {
  if (!text.includes('\n')) return text;
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={`${keyPrefix}-l${i}`}>
      {i > 0 && <br />}
      {line}
    </React.Fragment>
  ));
}

function wrapSegmentNode(node: React.ReactNode, style: RichTextStyle, key: string): React.ReactNode {
  let el: React.ReactNode = node;
  if (style.strike) {
    el = <s key={`${key}-s`}>{el}</s>;
  }
  if (style.underline) {
    el = <u key={`${key}-u`}>{el}</u>;
  }
  if (style.italic) {
    el = <em key={`${key}-i`}>{el}</em>;
  }
  if (style.bold) {
    el = <strong key={`${key}-b`}>{el}</strong>;
  }
  if (style.color && HEX_COLOR_RE.test(style.color)) {
    el = (
      <span key={`${key}-c`} style={{ color: style.color }}>
        {el}
      </span>
    );
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}

export interface RenderProspectRichTextOptions {
  autoBoldPhrases?: string[];
  variables?: ProspectLetterVariables;
}

/**
 * Renders safe React elements from inline rich text markup (zero dangerouslySetInnerHTML).
 * Parses formatting tokens BEFORE interpolating dynamic variables so special characters in
 * company names or addresses never break formatting and styles applied to placeholders
 * (e.g. **{{NAMA_PERUSAHAAN}}**) apply automatically across all Mitra letters.
 */
export function renderProspectRichText(
  input: string,
  optionsOrAutoBold?: string[] | RenderProspectRichTextOptions
): React.ReactNode {
  if (!input) return null;
  const segments = parseProspectRichText(input);
  if (segments.length === 0) return null;

  const autoBoldPhrases = Array.isArray(optionsOrAutoBold)
    ? optionsOrAutoBold
    : optionsOrAutoBold?.autoBoldPhrases;
  const variables = Array.isArray(optionsOrAutoBold) ? undefined : optionsOrAutoBold?.variables;

  return segments.map((seg, idx) => {
    const resolvedText = variables ? interpolateProspectVariables(seg.text, variables) : seg.text;
    if (!seg.bold && autoBoldPhrases && autoBoldPhrases.length > 0) {
      const pieces = splitAutoBold(resolvedText, autoBoldPhrases);
      return (
        <React.Fragment key={`seg-${idx}`}>
          {pieces.map((piece, pIdx) => {
            const pieceStyle: RichTextStyle = piece.autoBold ? { ...seg, bold: true } : seg;
            return wrapSegmentNode(
              renderTextWithLineBreaks(piece.text, `seg-${idx}-${pIdx}`),
              pieceStyle,
              `seg-${idx}-${pIdx}`
            );
          })}
        </React.Fragment>
      );
    }
    return wrapSegmentNode(renderTextWithLineBreaks(resolvedText, `seg-${idx}`), seg, `seg-${idx}`);
  });
}

/**
 * Safely constructs a DocumentFragment for a contentEditable field using strictly
 * document.createTextNode and whitelisted inline elements (strong, em, u, s, span).
 * Zero innerHTML or raw HTML parsing.
 */
export function buildRichDomFragment(
  doc: Document,
  input: string,
  multiline = true
): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const segments = parseProspectRichText(input);

  for (const seg of segments) {
    const appendText = (target: Node, text: string) => {
      if (!multiline || !text.includes('\n')) {
        target.appendChild(doc.createTextNode(text));
        return;
      }
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (i > 0) {
          target.appendChild(doc.createElement('br'));
        }
        if (line) {
          target.appendChild(doc.createTextNode(line));
        }
      });
    };

    const hasFormatting = Boolean(seg.bold || seg.italic || seg.underline || seg.strike || seg.color);
    if (!hasFormatting) {
      appendText(frag, seg.text);
      continue;
    }

    let rootEl: HTMLElement | null = null;
    let leafEl: HTMLElement | null = null;

    const pushEl = (el: HTMLElement) => {
      if (!rootEl) {
        rootEl = el;
        leafEl = el;
      } else if (leafEl) {
        leafEl.appendChild(el);
        leafEl = el;
      }
    };

    if (seg.color && HEX_COLOR_RE.test(seg.color)) {
      const span = doc.createElement('span');
      span.style.color = seg.color;
      pushEl(span);
    }
    if (seg.bold) {
      pushEl(doc.createElement('strong'));
    }
    if (seg.italic) {
      pushEl(doc.createElement('em'));
    }
    if (seg.underline) {
      pushEl(doc.createElement('u'));
    }
    if (seg.strike) {
      pushEl(doc.createElement('s'));
    }

    if (rootEl && leafEl) {
      appendText(leafEl, seg.text);
      frag.appendChild(rootEl);
    }
  }

  return frag;
}

function wrapSingleLineToMarkup(raw: string, seg: RichTextStyle): string {
  if (!raw) return '';

  // Keep leading/trailing whitespace outside markers so markdown syntax stays crisp & unambiguous
  const leadMatch = /^(\s*)/.exec(raw);
  const trailMatch = /(\s*)$/.exec(raw);
  const lead = leadMatch ? leadMatch[1] : '';
  const trail = trailMatch ? trailMatch[1] : '';
  const core = raw.slice(lead.length, raw.length - trail.length);

  if (!core) return raw;

  let out = core;
  if (seg.strike) out = `~~${out}~~`;
  if (seg.underline) out = `__${out}__`;
  if (seg.italic) out = `*${out}*`;
  if (seg.bold) out = `**${out}**`;
  if (seg.color && HEX_COLOR_RE.test(seg.color)) {
    out = `[color=${seg.color}]${out}[/color]`;
  }
  return `${lead}${out}${trail}`;
}

function wrapSegmentToMarkup(seg: RichTextSegment): string {
  const raw = seg.text;
  if (!raw) return '';
  if (!raw.includes('\n')) {
    return wrapSingleLineToMarkup(raw, seg);
  }
  return raw
    .split('\n')
    .map((line) => wrapSingleLineToMarkup(line, seg))
    .join('\n');
}

/**
 * Walks a contentEditable element and serializes its safe inline formatting
 * back to our clean markup format (**bold**, *italic*, __underline__, ~~strike~~, [color=#HEX]).
 */
export function serializeRichDomElement(
  root: HTMLElement,
  options?: {
    multiline?: boolean;
    defaultBold?: boolean;
    defaultColor?: string;
  }
): string {
  const multiline = options?.multiline ?? true;
  const defaultBold = Boolean(options?.defaultBold);
  const defaultColor = normalizeHexColor(options?.defaultColor) || '#000000';

  const rawSegments: RichTextSegment[] = [];

  const pushText = (text: string, style: RichTextStyle) => {
    const cleaned = text.replace(/\u00A0/g, ' ').replace(/\u200B/g, '');
    if (!cleaned) return;
    const normalizedStyle: RichTextStyle = {
      bold: style.bold && !defaultBold ? true : undefined,
      italic: style.italic ? true : undefined,
      underline: style.underline ? true : undefined,
      strike: style.strike ? true : undefined,
      color:
        style.color && style.color !== defaultColor && style.color !== '#000000'
          ? style.color
          : style.color && defaultColor !== '#000000' && style.color === '#000000'
          ? '#000000'
          : undefined,
    };
    rawSegments.push({ text: cleaned, ...normalizedStyle });
  };

  const walk = (node: Node, inherited: RichTextStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.nodeValue || '', inherited);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (tag === 'BR') {
      if (multiline) {
        rawSegments.push({ text: '\n' });
      } else {
        rawSegments.push({ text: ' ' });
      }
      return;
    }

    const nextStyle: RichTextStyle = { ...inherited };

    if (tag === 'B' || tag === 'STRONG') {
      nextStyle.bold = true;
    }
    if (tag === 'I' || tag === 'EM') {
      nextStyle.italic = true;
    }
    if (tag === 'U') {
      nextStyle.underline = true;
    }
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') {
      nextStyle.strike = true;
    }
    if (tag === 'FONT') {
      const fontColor = normalizeHexColor(el.getAttribute('color'));
      if (fontColor) nextStyle.color = fontColor;
    }

    const inlineStyle = el.style;
    if (inlineStyle) {
      if (inlineStyle.fontWeight) {
        const fw = inlineStyle.fontWeight.toLowerCase();
        const num = Number(fw);
        if (fw === 'bold' || fw === 'bolder' || (!Number.isNaN(num) && num >= 600)) {
          nextStyle.bold = true;
        } else if (fw === 'normal' || (!Number.isNaN(num) && num <= 500)) {
          nextStyle.bold = false;
        }
      }
      if (inlineStyle.fontStyle) {
        const fs = inlineStyle.fontStyle.toLowerCase();
        if (fs === 'italic' || fs === 'oblique') nextStyle.italic = true;
        else if (fs === 'normal') nextStyle.italic = false;
      }
      const td = (inlineStyle.textDecoration || inlineStyle.textDecorationLine || '').toLowerCase();
      if (td.includes('underline')) nextStyle.underline = true;
      if (td.includes('line-through')) nextStyle.strike = true;
      if (inlineStyle.color) {
        const c = normalizeHexColor(inlineStyle.color);
        if (c) nextStyle.color = c;
      }
    }

    const isBlock = tag === 'DIV' || tag === 'P';
    if (isBlock && rawSegments.length > 0) {
      const last = rawSegments[rawSegments.length - 1];
      if (last && !last.text.endsWith('\n')) {
        rawSegments.push({ text: multiline ? '\n' : ' ' });
      }
    }

    const children = Array.from(el.childNodes);
    for (const child of children) {
      walk(child, nextStyle);
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child, {});
  }

  const merged = mergeSegments(rawSegments);
  let output = merged.map(wrapSegmentToMarkup).join('');

  if (!multiline) {
    output = output.replace(/\s*\n\s*/g, ' ');
  } else {
    // Trim trailing browser placeholder <br> newline
    output = output.replace(/\n+$/, '');
  }

  return output;
}
