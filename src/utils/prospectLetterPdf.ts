import { jsPDF } from 'jspdf';
import { generateQrWithLogoDataUrl } from './qrWithLogo';
import {
  ProspectAddressParts,
  ProspectLetter,
  ProspectLetterContent,
  resolveProspectLetterContent,
} from '../types';
import {
  interpolateProspectVariables,
  parseProspectRichText,
  ProspectLetterVariables,
  RichTextSegment,
  RichTextStyle,
} from './prospectRichText';

export const INDONESIAN_PROVINCES: string[] = [
  'Aceh',
  'Bali',
  'Banten',
  'Bengkulu',
  'DI Yogyakarta',
  'DKI Jakarta',
  'Gorontalo',
  'Jambi',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Kalimantan Tengah',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Kepulauan Bangka Belitung',
  'Kepulauan Riau',
  'Lampung',
  'Maluku',
  'Maluku Utara',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Papua',
  'Papua Barat',
  'Papua Barat Daya',
  'Papua Pegunungan',
  'Papua Selatan',
  'Papua Tengah',
  'Riau',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tengah',
  'Sulawesi Tenggara',
  'Sulawesi Utara',
  'Sumatera Barat',
  'Sumatera Selatan',
  'Sumatera Utara',
];

const ID_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatIndonesianLetterDate(dateInput?: string): string {
  if (!dateInput) {
    const now = new Date();
    return `${now.getDate()} ${ID_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput.trim());
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIdx = Math.max(0, Math.min(11, Number(isoMatch[2]) - 1));
    const day = Number(isoMatch[3]);
    return `${day} ${ID_MONTH_NAMES[monthIdx]} ${year}`;
  }
  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getDate()} ${ID_MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }
  return dateInput;
}

export function interpolateCompanyName(text: string, companyName: string): string {
  return String(text || '').replace(/\{\{\s*NAMA_PERUSAHAAN\s*\}\}/gi, companyName.trim());
}

export function assembleStructuredAddress(parts: ProspectAddressParts): string {
  const clean = (v?: string) => String(v || '').replace(/\s+/g, ' ').trim();
  const streetRaw = clean(parts.street);
  const villageRaw = clean(parts.village);
  const districtRaw = clean(parts.district);
  const cityType = parts.cityType === 'Kab.' ? 'Kab.' : 'Kota';
  const cityRaw = clean(parts.city);
  const provinceRaw = clean(parts.province);
  const postalRaw = clean(parts.postalCode).replace(/[^\d]/g, '').slice(0, 5);

  const segments: string[] = [];
  if (streetRaw) {
    segments.push(streetRaw);
  }
  if (villageRaw) {
    const hasPrefix = /^(kel\.?|kelurahan|desa|ds\.?)\s+/i.test(villageRaw);
    segments.push(hasPrefix ? villageRaw : `Kel./Desa ${villageRaw}`);
  }
  if (districtRaw) {
    const hasPrefix = /^(kec\.?|kecamatan)\s+/i.test(districtRaw);
    segments.push(hasPrefix ? districtRaw : `Kec. ${districtRaw}`);
  }
  if (cityRaw) {
    const hasPrefix = /^(kota|kab\.?|kabupaten)\s+/i.test(cityRaw);
    segments.push(hasPrefix ? cityRaw : `${cityType} ${cityRaw}`);
  }
  if (provinceRaw) {
    const hasPrefix = /^(prov\.?|provinsi)\s+/i.test(provinceRaw);
    segments.push(hasPrefix ? provinceRaw : `Prov. ${provinceRaw}`);
  }
  const joined = segments.join(', ');
  return postalRaw ? (joined ? `${joined} ${postalRaw}` : postalRaw) : joined;
}

export function buildMitraQrUrl(memberCode?: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://mitra.ndtaxandlaw.com';
  return `${origin}/?verify=${encodeURIComponent(memberCode || 'ND-TAX-LAW-0000')}`;
}

export function buildDirectorQrUrl(letter: Pick<ProspectLetter, 'verificationCode' | 'id'>): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://mitra.ndtaxandlaw.com';
  const code = letter.verificationCode || letter.id;
  return `${origin}/?verify-surat=${encodeURIComponent(code)}`;
}

interface RasterizedLogo {
  dataUrl: string;
  width: number;
  height: number;
}

const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';

// Cache rasterized PNG logos keyed by URL so admin logo updates take effect immediately
const cachedLogos = new Map<string, RasterizedLogo>();

function isDefaultVerticalLogo(logoUrl?: string): boolean {
  const trimmed = String(logoUrl || '').trim();
  return !trimmed || trimmed === DEFAULT_VERTICAL_SVG;
}

async function loadRasterizedLogoPng(srcUrl: string): Promise<RasterizedLogo | null> {
  const key = srcUrl.trim();
  if (!key) return null;
  const cached = cachedLogos.get(key);
  if (cached) return cached;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = key;
    });

    const natW = img.naturalWidth || img.width || 300;
    const natH = img.naturalHeight || img.height || 300;
    const scale = Math.max(2, Math.min(5, 1400 / Math.max(natW, natH)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(natW * scale));
    canvas.height = Math.max(1, Math.round(natH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const result: RasterizedLogo = { dataUrl, width: natW, height: natH };
    cachedLogos.set(key, result);
    return result;
  } catch {
    try {
      const res = await fetch(key);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (!dataUrl) return null;
      const result: RasterizedLogo = { dataUrl, width: 300, height: 300 };
      cachedLogos.set(key, result);
      return result;
    } catch {
      return null;
    }
  }
}

export async function resolveInlineProspectLogo(
  adminLogoUrl?: string
): Promise<{ isCustom: boolean; dataUrl: string }> {
  const useCustom = !isDefaultVerticalLogo(adminLogoUrl);
  const customSrc = useCustom ? String(adminLogoUrl).trim() : '';
  if (useCustom && customSrc) {
    const customLoaded = await loadRasterizedLogoPng(customSrc);
    if (customLoaded?.dataUrl) {
      return { isCustom: true, dataUrl: customLoaded.dataUrl };
    }
  }
  const defaultLoaded = await loadRasterizedLogoPng(DEFAULT_EMBLEM_PNG);
  return {
    isCustom: false,
    dataUrl: defaultLoaded?.dataUrl || DEFAULT_EMBLEM_PNG,
  };
}

const cachedQrMap = new Map<string, string>();

export async function generateQrDataUrl(
  content: string,
  barcodeLogoUrl?: string
): Promise<string> {
  const cacheKey = `${content}|${String(barcodeLogoUrl || '').trim()}`;
  const hit = cachedQrMap.get(cacheKey);
  if (hit) return hit;

  const dataUrl = await generateQrWithLogoDataUrl(content, {
    width: 520,
    margin: 1,
    darkColor: '#092147',
    lightColor: '#FFFFFF',
    logoUrl: barcodeLogoUrl,
  });
  if (dataUrl) {
    if (cachedQrMap.size > 100) {
      const oldestKey = cachedQrMap.keys().next().value;
      if (oldestKey) cachedQrMap.delete(oldestKey);
    }
    cachedQrMap.set(cacheKey, dataUrl);
  }
  return dataUrl;
}

// ============================================================================
// NATIVE VECTOR RICH-TEXT + TRUE FULL-JUSTIFY ENGINE (1:1 PARITY WITH VIEW)
// ============================================================================

const PT_TO_MM = 0.352778;

interface PdfRichPiece extends RichTextStyle {
  text: string;
  width: number;
}

interface PdfRichWord {
  pieces: PdfRichPiece[];
  width: number;
}

interface PdfRichLine {
  words: PdfRichWord[];
  wordsWidth: number;
  isHardEnd: boolean;
}

interface RichTextParseOpts {
  variables?: ProspectLetterVariables;
  autoBoldPhrases?: string[];
  baseStyle?: RichTextStyle;
}

function getJsPdfFontStyle(style: RichTextStyle): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  if (style.bold && style.italic) return 'bolditalic';
  if (style.bold) return 'bold';
  if (style.italic) return 'italic';
  return 'normal';
}

function hexToRgbTuple(hex?: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function cleanPdfText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ').replace(/\u200B/g, '');
}

function splitAutoBoldSegments(
  segments: RichTextSegment[],
  phrases?: string[]
): RichTextSegment[] {
  if (!phrases || phrases.length === 0) return segments;
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const out: RichTextSegment[] = [];
  for (const seg of segments) {
    if (seg.bold || !seg.text) {
      out.push(seg);
      continue;
    }
    const parts = seg.text.split(regex);
    for (const part of parts) {
      if (!part) continue;
      if (phrases.includes(part)) {
        out.push({ ...seg, text: part, bold: true });
      } else {
        out.push({ ...seg, text: part });
      }
    }
  }
  return out;
}

function toStyledSegments(rawInput: string, opts?: RichTextParseOpts): RichTextSegment[] {
  const parsed = parseProspectRichText(String(rawInput || ''));
  const base = opts?.baseStyle || {};
  const interpolated: RichTextSegment[] = parsed.map((seg) => ({
    text: cleanPdfText(
      opts?.variables ? interpolateProspectVariables(seg.text, opts.variables) : seg.text
    ),
    bold: seg.bold || base.bold || undefined,
    italic: seg.italic || base.italic || undefined,
    underline: seg.underline || base.underline || undefined,
    strike: seg.strike || base.strike || undefined,
    color: seg.color || base.color,
  }));
  return splitAutoBoldSegments(interpolated, opts?.autoBoldPhrases);
}

function layoutRichSegments(
  doc: jsPDF,
  segments: RichTextSegment[],
  maxWidth: number,
  fontSize: number
): PdfRichLine[] {
  const measurePiece = (text: string, style: RichTextStyle): number => {
    doc.setFont('helvetica', getJsPdfFontStyle(style));
    doc.setFontSize(fontSize);
    return doc.getTextWidth(text);
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const spaceW = doc.getTextWidth(' ');

  // Split segments by explicit \n into hard paragraphs
  const paragraphs: RichTextSegment[][] = [[]];
  for (const seg of segments) {
    if (!seg.text) continue;
    const parts = seg.text.split('\n');
    parts.forEach((part, idx) => {
      if (idx > 0) {
        paragraphs.push([]);
      }
      if (part.length > 0) {
        paragraphs[paragraphs.length - 1].push({ ...seg, text: part });
      }
    });
  }

  const allLines: PdfRichLine[] = [];

  for (const para of paragraphs) {
    // Build words where adjacent non-whitespace styled pieces stay fused (e.g. **082180744977**,)
    const words: PdfRichWord[] = [];
    let currentPieces: PdfRichPiece[] = [];
    let currentW = 0;

    const flushWord = () => {
      if (currentPieces.length > 0) {
        words.push({ pieces: currentPieces, width: currentW });
        currentPieces = [];
        currentW = 0;
      }
    };

    for (const seg of para) {
      const tokens = seg.text.split(/(\s+)/);
      for (const tok of tokens) {
        if (!tok) continue;
        if (/^\s+$/.test(tok)) {
          flushWord();
        } else {
          const w = measurePiece(tok, seg);
          currentPieces.push({
            text: tok,
            width: w,
            bold: seg.bold,
            italic: seg.italic,
            underline: seg.underline,
            strike: seg.strike,
            color: seg.color,
          });
          currentW += w;
        }
      }
    }
    flushWord();

    if (words.length === 0) {
      allLines.push({ words: [], wordsWidth: 0, isHardEnd: true });
      continue;
    }

    // Break any single word that exceeds maxWidth (e.g. very long URL/email without spaces)
    const safeWords: PdfRichWord[] = [];
    for (const word of words) {
      if (word.width <= maxWidth + 0.05) {
        safeWords.push(word);
        continue;
      }
      let chunkPieces: PdfRichPiece[] = [];
      let chunkW = 0;
      for (const piece of word.pieces) {
        let acc = '';
        for (const ch of piece.text) {
          const nextW = measurePiece(acc + ch, piece);
          if (chunkW + nextW > maxWidth && (acc.length > 0 || chunkPieces.length > 0)) {
            if (acc.length > 0) {
              const accW = measurePiece(acc, piece);
              chunkPieces.push({ ...piece, text: acc, width: accW });
              chunkW += accW;
              acc = '';
            }
            if (chunkPieces.length > 0) {
              safeWords.push({ pieces: chunkPieces, width: chunkW });
              chunkPieces = [];
              chunkW = 0;
            }
          }
          acc += ch;
        }
        if (acc.length > 0) {
          const accW = measurePiece(acc, piece);
          chunkPieces.push({ ...piece, text: acc, width: accW });
          chunkW += accW;
        }
      }
      if (chunkPieces.length > 0) {
        safeWords.push({ pieces: chunkPieces, width: chunkW });
      }
    }

    // Greedy line packing
    let lineWords: PdfRichWord[] = [];
    let lineWordsW = 0;

    for (const word of safeWords) {
      const projectedW =
        lineWords.length === 0
          ? word.width
          : lineWordsW + lineWords.length * spaceW + word.width;
      if (lineWords.length > 0 && projectedW > maxWidth + 0.05) {
        allLines.push({
          words: lineWords,
          wordsWidth: lineWordsW,
          isHardEnd: false,
        });
        lineWords = [word];
        lineWordsW = word.width;
      } else {
        lineWords.push(word);
        lineWordsW += word.width;
      }
    }

    if (lineWords.length > 0) {
      allLines.push({
        words: lineWords,
        wordsWidth: lineWordsW,
        isHardEnd: true,
      });
    }
  }

  return allLines;
}

function drawRichLines(
  doc: jsPDF,
  lines: PdfRichLine[],
  x: number,
  topY: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number,
  align: 'left' | 'right' | 'center' | 'justify' = 'left',
  defaultColor: [number, number, number] = [0, 0, 0]
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  const normalSpaceW = doc.getTextWidth(' ');
  const fontH = fontSize * PT_TO_MM;
  // Exact CSS line-box baseline offset: half-leading + ascender (~0.78 of em)
  const baselineOffset = (lineHeight - fontH) / 2 + fontH * 0.78;
  const decoLineW = Math.max(0.22, fontSize * 0.025);

  lines.forEach((line, idx) => {
    if (line.words.length === 0) return;
    const baselineY = topY + baselineOffset + idx * lineHeight;
    const gapCount = line.words.length - 1;

    let startX = x;
    let gapW = normalSpaceW;

    if (align === 'justify' && !line.isHardEnd && gapCount > 0) {
      const computedGap = (maxWidth - line.wordsWidth) / gapCount;
      gapW = Math.max(normalSpaceW * 0.65, computedGap);
    } else if (align === 'right') {
      const naturalW = line.wordsWidth + gapCount * normalSpaceW;
      startX = x - naturalW;
    } else if (align === 'center') {
      const naturalW = line.wordsWidth + gapCount * normalSpaceW;
      startX = x - naturalW / 2;
    }

    let curX = startX;
    for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
      const word = line.words[wIdx];
      let pieceX = curX;
      for (const piece of word.pieces) {
        const rgb = hexToRgbTuple(piece.color, defaultColor);
        doc.setFont('helvetica', getJsPdfFontStyle(piece));
        doc.setFontSize(fontSize);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(piece.text, pieceX, baselineY);

        if (piece.underline) {
          doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          doc.setLineWidth(decoLineW);
          doc.line(pieceX, baselineY + 0.65, pieceX + piece.width, baselineY + 0.65);
        }
        if (piece.strike) {
          doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          doc.setLineWidth(decoLineW);
          doc.line(pieceX, baselineY - fontH * 0.3, pieceX + piece.width, baselineY - fontH * 0.3);
        }
        pieceX += piece.width;
      }

      // Continuous underline/strike across spaces when adjacent words share the decoration
      if (wIdx < line.words.length - 1) {
        const lastP = word.pieces[word.pieces.length - 1];
        const nextP = line.words[wIdx + 1].pieces[0];
        if (lastP && nextP) {
          if (lastP.underline && nextP.underline) {
            const rgb = hexToRgbTuple(lastP.color, defaultColor);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(decoLineW);
            doc.line(curX + word.width, baselineY + 0.65, curX + word.width + gapW, baselineY + 0.65);
          }
          if (lastP.strike && nextP.strike) {
            const rgb = hexToRgbTuple(lastP.color, defaultColor);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(decoLineW);
            doc.line(
              curX + word.width,
              baselineY - fontH * 0.3,
              curX + word.width + gapW,
              baselineY - fontH * 0.3
            );
          }
        }
      }

      curX += word.width + gapW;
    }
  });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  return topY + lines.length * lineHeight;
}

/**
 * Generates an exact 4-page A4 native vector PDF matching ProspectLetterDocument view 1:1:
 * - Paper: A4 Portrait (210mm x 297mm)
 * - Font: Helvetica / Arial 11pt (metrically identical)
 * - Margins: Left & Right 30mm (3cm), Top & Bottom 40mm (4cm) + configurable padding
 * - Full Rich Text support (**bold**, *italic*, __underline__, ~~strike~~, [color=#HEX])
 * - True full justification (rata kanan kiri) on every justified block & bullet
 * - Logo follows Admin-uploaded logo from AppSettings
 */
export async function generateProspectLetterPdf(
  letter: ProspectLetter,
  mode: 'download' | 'bloburl' = 'download',
  adminLogoUrl?: string,
  masterTemplate?: Partial<ProspectLetterContent> | null,
  barcodeLogoUrl?: string
): Promise<string | void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const content = resolveProspectLetterContent(undefined, masterTemplate);
  const formattedDate = formatIndonesianLetterDate(letter.letterDate || letter.createdAt);
  const letterVariables: ProspectLetterVariables = {
    NAMA_PERUSAHAAN: letter.companyName.trim(),
    ALAMAT_PERUSAHAAN: letter.companyAddress.trim(),
    TANGGAL_SURAT: formattedDate,
    NOMOR_SURAT: letter.letterNumber || '',
    NAMA_MITRA: letter.mitraName || '',
    ID_MITRA: letter.mitraMemberCode || '',
    WA_MITRA: letter.mitraPhone || '',
    EMAIL_MITRA: letter.mitraEmail || '',
  };

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_TOP_VAL = Math.min(70, Math.max(15, Number(content.marginTopMm ?? 40) || 40));
  const MARGIN_BOTTOM_VAL = Math.min(70, Math.max(15, Number(content.marginBottomMm ?? 40) || 40));
  const MARGIN_LEFT = Math.min(55, Math.max(10, Number(content.marginLeftMm ?? 30) || 30));
  const MARGIN_RIGHT = Math.min(55, Math.max(10, Number(content.marginRightMm ?? 30) || 30));
  const PAD_TOP = Math.min(30, Math.max(0, Number(content.paddingTopMm ?? 0) || 0));
  const PAD_BOTTOM = Math.min(30, Math.max(0, Number(content.paddingBottomMm ?? 0) || 0));
  const PAD_LEFT = Math.min(30, Math.max(0, Number(content.paddingLeftMm ?? 0) || 0));
  const PAD_RIGHT = Math.min(30, Math.max(0, Number(content.paddingRightMm ?? 0) || 0));
  const MARGIN_X = MARGIN_LEFT + PAD_LEFT;
  const RIGHT_EDGE_X = Math.max(MARGIN_X + 80, PAGE_W - (MARGIN_RIGHT + PAD_RIGHT));
  const MARGIN_TOP = MARGIN_TOP_VAL + PAD_TOP;
  const MARGIN_BOTTOM = MARGIN_BOTTOM_VAL + PAD_BOTTOM;
  const CONTENT_W = RIGHT_EDGE_X - MARGIN_X;
  const CONTENT_BOTTOM = Math.max(MARGIN_TOP + 120, PAGE_H - MARGIN_BOTTOM);
  const CONTENT_H = CONTENT_BOTTOM - MARGIN_TOP;

  const useCustomAdminLogo = !isDefaultVerticalLogo(adminLogoUrl);
  const targetLogoSrc = useCustomAdminLogo ? String(adminLogoUrl).trim() : DEFAULT_EMBLEM_PNG;

  const [loadedLogo, directorQrDataUrl, mitraQrDataUrl] = await Promise.all([
    loadRasterizedLogoPng(targetLogoSrc).then((res) =>
      res || (useCustomAdminLogo ? loadRasterizedLogoPng(DEFAULT_EMBLEM_PNG) : null)
    ),
    generateQrDataUrl(buildDirectorQrUrl(letter), barcodeLogoUrl),
    generateQrDataUrl(buildMitraQrUrl(letter.mitraMemberCode), barcodeLogoUrl),
  ]);
  const hasCustomLogoRendered = Boolean(useCustomAdminLogo && loadedLogo && cachedLogos.has(targetLogoSrc));

  const layoutRich = (
    raw: string,
    maxWidth: number,
    fontSize: number,
    opts?: RichTextParseOpts
  ): PdfRichLine[] => {
    const segs = toStyledSegments(raw, opts);
    return layoutRichSegments(doc, segs, maxWidth, fontSize);
  };

  const drawRich = (
    raw: string,
    x: number,
    topY: number,
    maxWidth: number,
    lineHeight: number,
    fontSize: number,
    align: 'left' | 'right' | 'center' | 'justify' = 'left',
    opts?: RichTextParseOpts,
    defaultColor: [number, number, number] = [0, 0, 0]
  ): number => {
    const lines = layoutRich(raw, maxWidth, fontSize, opts);
    return drawRichLines(doc, lines, x, topY, maxWidth, lineHeight, fontSize, align, defaultColor);
  };

  const drawMarker = (
    marker: string,
    x: number,
    topY: number,
    lineHeight: number,
    fontSize: number,
    bold = false
  ) => {
    const fontH = fontSize * PT_TO_MM;
    const baselineY = topY + (lineHeight - fontH) / 2 + fontH * 0.78;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(marker, x, baselineY);
  };

  const drawHeaderAndFooter = () => {
    // HEADER (exact match with LetterHeader in ProspectLetterDocument)
    if (hasCustomLogoRendered && loadedLogo) {
      const maxW = 58;
      const maxH = 25;
      const ratio = loadedLogo.width / Math.max(1, loadedLogo.height);
      let drawW = maxW;
      let drawH = drawW / ratio;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * ratio;
      }
      const drawX = MARGIN_LEFT;
      const drawY = 7.5 + (maxH - drawH) / 2;
      doc.addImage(loadedLogo.dataUrl, 'PNG', drawX, drawY, drawW, drawH, 'nd-prospect-logo', 'FAST');
    } else {
      const defaultLogoLeft = Math.max(6, MARGIN_LEFT - 4);
      const logoCenterX = defaultLogoLeft + 17; // width 34mm centered
      if (loadedLogo) {
        doc.addImage(loadedLogo.dataUrl, 'PNG', logoCenterX - 8.75, 7, 17.5, 17.5, 'nd-prospect-logo', 'FAST');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(181, 148, 94);
      doc.text('TAX AND LAW', logoCenterX, 28.4, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(156, 130, 88);
      doc.text('NURTIYAS & DARMAWAN', logoCenterX, 30.8, { align: 'center' });
    }

    // FOOTER (exact match with LetterFooter: height 33mm, padding 5.5mm 22mm 4mm 22mm, 8.4pt, lh 1.38)
    const footerTop = PAGE_H - 33;
    doc.setFillColor(244, 244, 244);
    doc.rect(0, footerTop, PAGE_W, 33, 'F');

    const footFs = 8.4;
    const footLH = footFs * PT_TO_MM * 1.38;
    const footStartY = footerTop + 5.5;
    const footLeftX = 22;
    const footRightX = PAGE_W - 22;
    const footColMaxW = (PAGE_W - 44) * 0.5;

    // Left Footer Column
    let fY = drawRich(
      content.footerLeftTitle,
      footLeftX,
      footStartY,
      footColMaxW,
      footLH,
      footFs,
      'left',
      { baseStyle: { bold: true } },
      [17, 17, 17]
    );
    content.footerLeftLines.slice(0, 5).forEach((line) => {
      fY = drawRich(line, footLeftX, fY, footColMaxW, footLH, footFs, 'left', undefined, [26, 26, 26]);
    });

    // Right Footer Column
    let frY = drawRich(
      content.footerRightTitle,
      footRightX,
      footStartY,
      footColMaxW,
      footLH,
      footFs,
      'right',
      { baseStyle: { bold: true } },
      [186, 152, 74]
    );
    content.footerRightLines.slice(0, 5).forEach((line) => {
      frY = drawRich(line, footRightX, frY, footColMaxW, footLH, footFs, 'right', undefined, [26, 26, 26]);
    });

    doc.setTextColor(0, 0, 0);
  };

  // =========================================================================
  // PAGE 1 — SURAT PENGANTAR & DASAR HUKUM LAPORAN KEUANGAN (EXACT VIEW PARITY)
  // =========================================================================
  drawHeaderAndFooter();

  const p1Levels = [
    { lhFactor: 1.16, gap: 3.4, itemGap: 2.0, bodyFs: 11, recipFs: 11 },
    { lhFactor: 1.13, gap: 2.7, itemGap: 1.6, bodyFs: 11, recipFs: 11 },
    { lhFactor: 1.10, gap: 2.1, itemGap: 1.3, bodyFs: 11, recipFs: 10.5 },
    { lhFactor: 1.07, gap: 1.6, itemGap: 1.0, bodyFs: 11, recipFs: 10 },
    { lhFactor: 1.04, gap: 1.2, itemGap: 0.8, bodyFs: 10.5, recipFs: 10 },
    { lhFactor: 1.02, gap: 0.9, itemGap: 0.6, bodyFs: 10.2, recipFs: 10 },
    { lhFactor: 1.00, gap: 0.7, itemGap: 0.5, bodyFs: 9.8, recipFs: 10 },
  ];

  const metaRowsRaw: Array<[string, string]> = [
    [content.metaNomorLabel, content.nomorValue],
    [content.metaSifatLabel, content.sifat],
    [content.metaLampiranLabel, content.lampiran],
    [content.metaPerihalLabel, content.perihal],
  ];

  const measurePage1 = (lvl: (typeof p1Levels)[number]) => {
    const lh = lvl.bodyFs * PT_TO_MM * lvl.lhFactor;
    const recipLH = lvl.recipFs * PT_TO_MM * lvl.lhFactor;
    let h = 0;

    // Date line
    h += layoutRich(content.dateLine, CONTENT_W, lvl.bodyFs, { variables: letterVariables }).length * lh + 0.6;

    // Meta table
    for (const [lbl, val] of metaRowsRaw) {
      const lLines = layoutRich(lbl, 25, lvl.bodyFs, { variables: letterVariables }).length;
      const vLines = layoutRich(`: ${val}`, CONTENT_W - 25, lvl.bodyFs, { variables: letterVariables }).length;
      h += Math.max(lLines, vLines) * lh;
    }
    h += lvl.gap;

    // Recipient block
    h +=
      layoutRich(content.recipientBlock, CONTENT_W, lvl.recipFs, { variables: letterVariables }).length * recipLH +
      lvl.gap;

    // Greeting + intro paragraphs
    h += layoutRich(content.greeting, CONTENT_W, lvl.bodyFs, { variables: letterVariables }).length * lh + 0.5;
    h += layoutRich(content.introPara1, CONTENT_W, lvl.bodyFs, { variables: letterVariables }).length * lh + lvl.gap;
    h +=
      layoutRich(content.introPara2, CONTENT_W, lvl.bodyFs, { variables: letterVariables }).length * lh + (lvl.gap + 1);

    // Main title + Section I
    h +=
      layoutRich(content.sectionMainTitle, CONTENT_W, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh +
      Math.max(1.6, lvl.gap * 0.85);
    h +=
      layoutRich(content.section1Title, CONTENT_W - 6.5, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh + 0.6;

    content.section1Items.forEach((item, idx) => {
      h += layoutRich(item.title, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      for (const b of item.bullets) {
        h += layoutRich(b, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      }
      h += idx === content.section1Items.length - 1 ? Math.max(1.8, lvl.itemGap + 0.4) : lvl.itemGap;
    });

    // Sanction box (marginLeft 6.5, padding 1.5mm 2.5mm)
    const p1BoxLines = layoutRich(content.section1Sanction, CONTENT_W - 6.5 - 5, lvl.bodyFs);
    h += p1BoxLines.length * lh + 3.0;

    return { h, lh, recipLH, lvl };
  };

  let p1Fit = measurePage1(p1Levels[0]);
  for (const lvl of p1Levels) {
    const test = measurePage1(lvl);
    p1Fit = test;
    if (test.h <= CONTENT_H + 0.5) break;
  }

  let y = MARGIN_TOP;
  y = drawRich(content.dateLine, RIGHT_EDGE_X, y, CONTENT_W, p1Fit.lh, p1Fit.lvl.bodyFs, 'right', {
    variables: letterVariables,
  });
  y += 0.6;

  for (const [lbl, val] of metaRowsRaw) {
    const yLbl = drawRich(lbl, MARGIN_X, y, 25, p1Fit.lh, p1Fit.lvl.bodyFs, 'left', {
      variables: letterVariables,
    });
    const yVal = drawRich(`: ${val}`, MARGIN_X + 25, y, CONTENT_W - 25, p1Fit.lh, p1Fit.lvl.bodyFs, 'left', {
      variables: letterVariables,
    });
    y = Math.max(yLbl, yVal);
  }
  y += p1Fit.lvl.gap;

  y = drawRich(content.recipientBlock, MARGIN_X, y, CONTENT_W, p1Fit.recipLH, p1Fit.lvl.recipFs, 'left', {
    variables: letterVariables,
  });
  y += p1Fit.lvl.gap;

  y = drawRich(content.greeting, MARGIN_X, y, CONTENT_W, p1Fit.lh, p1Fit.lvl.bodyFs, 'left', {
    variables: letterVariables,
  });
  y += 0.5;

  y = drawRich(content.introPara1, MARGIN_X, y, CONTENT_W, p1Fit.lh, p1Fit.lvl.bodyFs, 'justify', {
    variables: letterVariables,
  });
  y += p1Fit.lvl.gap;

  y = drawRich(content.introPara2, MARGIN_X, y, CONTENT_W, p1Fit.lh, p1Fit.lvl.bodyFs, 'justify', {
    variables: letterVariables,
  });
  y += p1Fit.lvl.gap + 1;

  y = drawRich(content.sectionMainTitle, MARGIN_X, y, CONTENT_W, p1Fit.lh, p1Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += Math.max(1.6, p1Fit.lvl.gap * 0.85);

  drawMarker('I.', MARGIN_X, y, p1Fit.lh, p1Fit.lvl.bodyFs, true);
  y = drawRich(content.section1Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p1Fit.lh, p1Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += 0.6;

  content.section1Items.forEach((item, idx) => {
    drawMarker(`${idx + 1}.`, MARGIN_X + 6.5, y, p1Fit.lh, p1Fit.lvl.bodyFs, false);
    y = drawRich(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p1Fit.lh, p1Fit.lvl.bodyFs, 'left');
    for (const bullet of item.bullets) {
      drawMarker('-', MARGIN_X + 6.5, y, p1Fit.lh, p1Fit.lvl.bodyFs, false);
      y = drawRich(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p1Fit.lh, p1Fit.lvl.bodyFs, 'justify');
    }
    y += idx === content.section1Items.length - 1 ? Math.max(1.8, p1Fit.lvl.itemGap + 0.4) : p1Fit.lvl.itemGap;
  });

  const p1BoxW = CONTENT_W - 6.5;
  const p1BoxLines = layoutRich(content.section1Sanction, p1BoxW - 5, p1Fit.lvl.bodyFs);
  const p1BoxH = p1BoxLines.length * p1Fit.lh + 3.0;
  const p1BoxY = Math.min(y, CONTENT_BOTTOM - p1BoxH);
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.rect(MARGIN_X + 6.5, p1BoxY, p1BoxW, p1BoxH, 'FD');
  drawRichLines(doc, p1BoxLines, MARGIN_X + 6.5 + 2.5, p1BoxY + 1.5, p1BoxW - 5, p1Fit.lh, p1Fit.lvl.bodyFs, 'justify');

  // =========================================================================
  // PAGE 2 — DASAR HUKUM PERPAJAKAN & KETENAGAKERJAAN (EXACT VIEW PARITY)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const p2Levels = [
    { lhFactor: 1.15, itemGap: 1.8, sectionGap: 4.6, bodyFs: 11 },
    { lhFactor: 1.12, itemGap: 1.4, sectionGap: 3.6, bodyFs: 11 },
    { lhFactor: 1.09, itemGap: 1.1, sectionGap: 2.8, bodyFs: 11 },
    { lhFactor: 1.06, itemGap: 0.8, sectionGap: 2.2, bodyFs: 10.7 },
    { lhFactor: 1.03, itemGap: 0.6, sectionGap: 1.7, bodyFs: 10.4 },
    { lhFactor: 1.01, itemGap: 0.45, sectionGap: 1.3, bodyFs: 10.0 },
    { lhFactor: 0.99, itemGap: 0.35, sectionGap: 1.0, bodyFs: 9.6 },
  ];

  const p2BoxW = CONTENT_W - 6.5;

  const measurePage2 = (lvl: (typeof p2Levels)[number]) => {
    const lh = lvl.bodyFs * PT_TO_MM * lvl.lhFactor;
    let h = 0;

    h +=
      layoutRich(content.section2Title, CONTENT_W - 6.5, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh + 0.5;
    content.section2Items.forEach((item, idx) => {
      h += layoutRich(item.title, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      for (const b of item.bullets) {
        h += layoutRich(b, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      }
      h += idx === content.section2Items.length - 1 ? Math.max(1.5, lvl.itemGap + 0.4) : lvl.itemGap;
    });
    h += layoutRich(content.section2Sanction, p2BoxW - 5, lvl.bodyFs).length * lh + 2.8 + lvl.sectionGap;

    h +=
      layoutRich(content.section3Title, CONTENT_W - 6.5, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh + 0.5;
    content.section3Items.forEach((item, idx) => {
      h += layoutRich(item.title, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      for (const b of item.bullets) {
        h += layoutRich(b, CONTENT_W - 12.5, lvl.bodyFs).length * lh;
      }
      h += idx === content.section3Items.length - 1 ? Math.max(1.5, lvl.itemGap + 0.4) : lvl.itemGap;
    });
    h += layoutRich(content.section3Sanction, p2BoxW - 5, lvl.bodyFs).length * lh + 2.8;

    return { h, lh, lvl };
  };

  let p2Fit = measurePage2(p2Levels[0]);
  for (const lvl of p2Levels) {
    const test = measurePage2(lvl);
    p2Fit = test;
    if (test.h <= CONTENT_H + 0.5) break;
  }

  y = MARGIN_TOP;
  drawMarker('II.', MARGIN_X, y, p2Fit.lh, p2Fit.lvl.bodyFs, true);
  y = drawRich(content.section2Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += 0.5;

  content.section2Items.forEach((item, idx) => {
    drawMarker(`${idx + 1}.`, MARGIN_X + 6.5, y, p2Fit.lh, p2Fit.lvl.bodyFs, false);
    y = drawRich(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'left');
    for (const bullet of item.bullets) {
      drawMarker('-', MARGIN_X + 6.5, y, p2Fit.lh, p2Fit.lvl.bodyFs, false);
      y = drawRich(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'justify');
    }
    y += idx === content.section2Items.length - 1 ? Math.max(1.5, p2Fit.lvl.itemGap + 0.4) : p2Fit.lvl.itemGap;
  });

  const p2TaxBoxLines = layoutRich(content.section2Sanction, p2BoxW - 5, p2Fit.lvl.bodyFs);
  const p2TaxBoxH = p2TaxBoxLines.length * p2Fit.lh + 2.8;
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.rect(MARGIN_X + 6.5, y, p2BoxW, p2TaxBoxH, 'FD');
  drawRichLines(doc, p2TaxBoxLines, MARGIN_X + 6.5 + 2.5, y + 1.4, p2BoxW - 5, p2Fit.lh, p2Fit.lvl.bodyFs, 'justify');
  y += p2TaxBoxH + p2Fit.lvl.sectionGap;

  drawMarker('III.', MARGIN_X, y, p2Fit.lh, p2Fit.lvl.bodyFs, true);
  y = drawRich(content.section3Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += 0.5;

  content.section3Items.forEach((item, idx) => {
    drawMarker(`${idx + 1}.`, MARGIN_X + 6.5, y, p2Fit.lh, p2Fit.lvl.bodyFs, false);
    y = drawRich(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'left');
    for (const bullet of item.bullets) {
      drawMarker('-', MARGIN_X + 6.5, y, p2Fit.lh, p2Fit.lvl.bodyFs, false);
      y = drawRich(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2Fit.lh, p2Fit.lvl.bodyFs, 'justify');
    }
    y += idx === content.section3Items.length - 1 ? Math.max(1.5, p2Fit.lvl.itemGap + 0.4) : p2Fit.lvl.itemGap;
  });

  const p2LaborBoxLines = layoutRich(content.section3Sanction, p2BoxW - 5, p2Fit.lvl.bodyFs);
  const p2LaborBoxH = p2LaborBoxLines.length * p2Fit.lh + 2.8;
  const p2LaborBoxY = Math.min(y, CONTENT_BOTTOM - p2LaborBoxH);
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.rect(MARGIN_X + 6.5, p2LaborBoxY, p2BoxW, p2LaborBoxH, 'FD');
  drawRichLines(
    doc,
    p2LaborBoxLines,
    MARGIN_X + 6.5 + 2.5,
    p2LaborBoxY + 1.4,
    p2BoxW - 5,
    p2Fit.lh,
    p2Fit.lvl.bodyFs,
    'justify'
  );

  // =========================================================================
  // PAGE 3 — TENTANG ND TAX AND LAW, LAYANAN & TABEL PERBANDINGAN (EXACT PARITY)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const colW = [CONTENT_W * 0.34, CONTENT_W * 0.40, CONTENT_W * 0.26];
  const tableRowsRaw: Array<[string, string, string, boolean]> = [
    [content.comparisonHeaders[0], content.comparisonHeaders[1], content.comparisonHeaders[2], true],
    ...content.comparisonRows.map(
      (r): [string, string, string, boolean] => [r.component, r.internalStaff, r.consultant, false]
    ),
  ];

  const p3Levels = [
    { lhFactor: 1.16, gap: 3.4, padY: 1.6, padX: 2.3, bodyFs: 11, tableFs: 10.8 },
    { lhFactor: 1.13, gap: 2.8, padY: 1.35, padX: 2.2, bodyFs: 11, tableFs: 10.8 },
    { lhFactor: 1.10, gap: 2.2, padY: 1.35, padX: 2.2, bodyFs: 11, tableFs: 10.8 },
    { lhFactor: 1.07, gap: 1.7, padY: 1.1, padX: 2.0, bodyFs: 11, tableFs: 10.0 },
    { lhFactor: 1.04, gap: 1.3, padY: 1.1, padX: 2.0, bodyFs: 10.5, tableFs: 10.0 },
    { lhFactor: 1.02, gap: 1.0, padY: 1.1, padX: 2.0, bodyFs: 10.2, tableFs: 9.6 },
    { lhFactor: 1.00, gap: 0.8, padY: 1.1, padX: 2.0, bodyFs: 9.8, tableFs: 9.6 },
  ];

  const buildServiceItemSegments = (lead: string, body: string): RichTextSegment[] => {
    const segs: RichTextSegment[] = [];
    if (lead && lead.trim()) {
      segs.push(...toStyledSegments(lead, { baseStyle: { bold: true } }));
      segs.push({ text: ' ', bold: true });
    }
    segs.push(...toStyledSegments(body));
    return segs;
  };

  const measurePage3 = (lvl: (typeof p3Levels)[number]) => {
    const lh = lvl.bodyFs * PT_TO_MM * lvl.lhFactor;
    const tblLH = lvl.tableFs * PT_TO_MM * 1.18;
    let h = 0;

    h += layoutRich(content.aboutTitle, CONTENT_W, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh + lvl.gap;
    h += layoutRich(content.aboutPara, CONTENT_W, lvl.bodyFs, { variables: letterVariables }).length * lh + lvl.gap;
    h +=
      layoutRich(content.servicesTitle, CONTENT_W - 6.5, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh + 0.5;
    h +=
      layoutRich(content.servicesIntro, CONTENT_W - 6.5, lvl.bodyFs, { autoBoldPhrases: ['999 Ribu'] }).length * lh +
      1.2;

    content.servicesItems.forEach((svc, idx) => {
      const segs = buildServiceItemSegments(svc.lead, svc.body);
      h += layoutRichSegments(doc, segs, CONTENT_W - 18, lvl.bodyFs).length * lh;
      if (idx < content.servicesItems.length - 1) h += 0.8;
    });
    h += Math.max(1.8, lvl.gap * 0.85);

    h += layoutRich(content.servicesCaseNote, CONTENT_W, lvl.bodyFs).length * lh + (lvl.gap + 1);
    h +=
      layoutRich(content.comparisonTitle, CONTENT_W - 6.5, lvl.bodyFs, { baseStyle: { bold: true } }).length * lh +
      1.4;
    h += layoutRich(content.comparisonIntro, CONTENT_W, lvl.bodyFs).length * lh + 1.2;

    tableRowsRaw.forEach((row, rIdx) => {
      const isHeader = row[3];
      let maxLines = 1;
      for (let c = 0; c < 3; c++) {
        const isBoldCell = isHeader || (rIdx === 1 && c === 2);
        const lines = layoutRich(String(row[c] ?? ''), colW[c] - lvl.padX * 2, lvl.tableFs, {
          baseStyle: isBoldCell ? { bold: true } : undefined,
        });
        if (lines.length > maxLines) maxLines = lines.length;
      }
      h += maxLines * tblLH + lvl.padY * 2;
    });
    h += lvl.gap;

    h += layoutRich(content.comparisonClosing, CONTENT_W, lvl.bodyFs).length * lh;

    return { h, lh, tblLH, lvl };
  };

  let p3Fit = measurePage3(p3Levels[0]);
  for (const lvl of p3Levels) {
    const test = measurePage3(lvl);
    p3Fit = test;
    if (test.h <= CONTENT_H + 0.5) break;
  }

  y = MARGIN_TOP;
  y = drawRich(content.aboutTitle, MARGIN_X, y, CONTENT_W, p3Fit.lh, p3Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += p3Fit.lvl.gap;

  y = drawRich(content.aboutPara, MARGIN_X, y, CONTENT_W, p3Fit.lh, p3Fit.lvl.bodyFs, 'justify', {
    variables: letterVariables,
  });
  y += p3Fit.lvl.gap;

  drawMarker('I.', MARGIN_X, y, p3Fit.lh, p3Fit.lvl.bodyFs, true);
  y = drawRich(content.servicesTitle, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p3Fit.lh, p3Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += 0.5;

  y = drawRich(content.servicesIntro, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p3Fit.lh, p3Fit.lvl.bodyFs, 'justify', {
    autoBoldPhrases: ['999 Ribu'],
  });
  y += 1.2;

  content.servicesItems.forEach((svc, idx) => {
    drawMarker(`${idx + 1}.`, MARGIN_X + 12.5, y, p3Fit.lh, p3Fit.lvl.bodyFs, false);
    const segs = buildServiceItemSegments(svc.lead, svc.body);
    const lines = layoutRichSegments(doc, segs, CONTENT_W - 18, p3Fit.lvl.bodyFs);
    y = drawRichLines(doc, lines, MARGIN_X + 18, y, CONTENT_W - 18, p3Fit.lh, p3Fit.lvl.bodyFs, 'justify');
    if (idx < content.servicesItems.length - 1) y += 0.8;
  });
  y += Math.max(1.8, p3Fit.lvl.gap * 0.85);

  y = drawRich(content.servicesCaseNote, MARGIN_X, y, CONTENT_W, p3Fit.lh, p3Fit.lvl.bodyFs, 'justify');
  y += p3Fit.lvl.gap + 1;

  drawMarker('II.', MARGIN_X, y, p3Fit.lh, p3Fit.lvl.bodyFs, true);
  y = drawRich(content.comparisonTitle, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p3Fit.lh, p3Fit.lvl.bodyFs, 'left', {
    baseStyle: { bold: true },
  });
  y += 1.4;

  y = drawRich(content.comparisonIntro, MARGIN_X, y, CONTENT_W, p3Fit.lh, p3Fit.lvl.bodyFs, 'left');
  y += 1.2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);

  tableRowsRaw.forEach((row, rIdx) => {
    const isHeader = row[3];
    const wrappedCells: PdfRichLine[][] = [];
    let maxLines = 1;
    for (let c = 0; c < 3; c++) {
      const isBoldCell = isHeader || (rIdx === 1 && c === 2);
      const lines = layoutRich(String(row[c] ?? ''), colW[c] - p3Fit.lvl.padX * 2, p3Fit.lvl.tableFs, {
        baseStyle: isBoldCell ? { bold: true } : undefined,
      });
      wrappedCells.push(lines);
      if (lines.length > maxLines) maxLines = lines.length;
    }
    const rowH = maxLines * p3Fit.tblLH + p3Fit.lvl.padY * 2;
    let curX = MARGIN_X;
    for (let c = 0; c < 3; c++) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.28);
      if (isHeader) {
        doc.setFillColor(223, 220, 206);
        doc.rect(curX, y, colW[c], rowH, 'FD');
      } else {
        doc.rect(curX, y, colW[c], rowH, 'S');
      }
      // Vertically center cell text like HTML <td> vertical-align: middle
      const cellTextH = wrappedCells[c].length * p3Fit.tblLH;
      const cellTextTop = y + (rowH - cellTextH) / 2;
      drawRichLines(
        doc,
        wrappedCells[c],
        curX + p3Fit.lvl.padX,
        cellTextTop,
        colW[c] - p3Fit.lvl.padX * 2,
        p3Fit.tblLH,
        p3Fit.lvl.tableFs,
        'left'
      );
      curX += colW[c];
    }
    y += rowH;
  });

  y += p3Fit.lvl.gap;
  drawRich(content.comparisonClosing, MARGIN_X, y, CONTENT_W, p3Fit.lh, p3Fit.lvl.bodyFs, 'justify');

  // =========================================================================
  // PAGE 4 — KONSULTASI AWAL, MITRA STRATEGIS & TANDA TANGAN QR (EXACT PARITY)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const p4Fs = 11;
  const p4Levels = [
    { lhFactor: 1.22, sigGap: 15 },
    { lhFactor: 1.17, sigGap: 11 },
    { lhFactor: 1.12, sigGap: 8 },
    { lhFactor: 1.08, sigGap: 6 },
    { lhFactor: 1.04, sigGap: 4 },
  ];

  const mitraBoxX = MARGIN_X + 8;
  const mitraBoxW = CONTENT_W - 8;
  const mitraPadX = 4.2;
  const mitraPadY = 3.8;
  const mitraLabelW = 24;
  const mitraValW = Math.max(40, mitraBoxW - mitraPadX * 2 - mitraLabelW);
  const mitraRowLH = p4Fs * PT_TO_MM * 1.3;

  const mitraRowsRaw: Array<[string, string]> = [
    [content.mitraBoxNameLabel, content.mitraBoxNameValue || '-'],
    [content.mitraBoxIdLabel, content.mitraBoxIdValue || '-'],
    [content.mitraBoxPhoneLabel, content.mitraBoxPhoneValue || '-'],
    [content.mitraBoxEmailLabel, content.mitraBoxEmailValue || '-'],
  ];

  const wrappedMitraRows = mitraRowsRaw.map(([lbl, val]) => ({
    lblLines: layoutRich(lbl, mitraLabelW, p4Fs, { variables: letterVariables }),
    valLines: layoutRich(`: ${val}`, mitraValW, p4Fs, { variables: letterVariables }),
  }));

  const sigColW = (CONTENT_W - 12) / 2;
  const leftCenterX = MARGIN_X + sigColW / 2;
  const rightCenterX = RIGHT_EDGE_X - sigColW / 2;
  const qrSize = 27;

  const measurePage4 = (lvl: (typeof p4Levels)[number]) => {
    const lh = p4Fs * PT_TO_MM * lvl.lhFactor;
    const noteLH = 9.5 * PT_TO_MM * lvl.lhFactor;
    let h = 0;

    h += layoutRich(content.consultTitle, CONTENT_W - 8, p4Fs, { baseStyle: { bold: true } }).length * lh + 2.4;
    h +=
      layoutRich(content.consultPara, CONTENT_W - 8, p4Fs, {
        variables: letterVariables,
        autoBoldPhrases: ['082180744977', 'business@ndtaxandlaw.com', 'www.ndtaxandlaw.com'],
      }).length *
        lh +
      7.5;

    const titleLines = layoutRich(content.mitraBoxTitle, mitraBoxW - mitraPadX * 2, p4Fs, {
      variables: letterVariables,
      baseStyle: { bold: true, underline: true },
    });
    const rowsH = wrappedMitraRows.reduce(
      (sum, r) => sum + Math.max(1, r.lblLines.length, r.valLines.length) * mitraRowLH,
      0
    );
    const boxH = mitraPadY * 2 + titleLines.length * lh + 3.2 + rowsH;
    h += boxH + 7;

    h += layoutRich(content.closingPara, CONTENT_W - 8, p4Fs, { variables: letterVariables }).length * lh + lvl.sigGap;

    // Signature block height: heading + firm + 3.5 + 27(QR) + 4 + note + 3.5 + name + role
    const sigH = lh + lh + 3.5 + qrSize + 4 + noteLH + 3.5 + lh + lh;
    h += sigH;

    return { h, lh, noteLH, boxH, titleLines, sigH, lvl };
  };

  let p4Fit = measurePage4(p4Levels[0]);
  for (const lvl of p4Levels) {
    const test = measurePage4(lvl);
    p4Fit = test;
    if (test.h <= CONTENT_H + 0.5) break;
  }

  y = MARGIN_TOP;
  drawMarker('III.', MARGIN_X, y, p4Fit.lh, p4Fs, true);
  y = drawRich(content.consultTitle, MARGIN_X + 8, y, CONTENT_W - 8, p4Fit.lh, p4Fs, 'left', {
    baseStyle: { bold: true },
  });
  y += 2.4;

  y = drawRich(content.consultPara, MARGIN_X + 8, y, CONTENT_W - 8, p4Fit.lh, p4Fs, 'justify', {
    variables: letterVariables,
    autoBoldPhrases: ['082180744977', 'business@ndtaxandlaw.com', 'www.ndtaxandlaw.com'],
  });
  y += 7.5;

  // Mitra Box (exact match with ProspectLetterDocument)
  const boxTopY = y;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.rect(mitraBoxX, boxTopY, mitraBoxW, p4Fit.boxH, 'S');

  let boxY = boxTopY + mitraPadY;
  boxY = drawRichLines(
    doc,
    p4Fit.titleLines,
    mitraBoxX + mitraPadX,
    boxY,
    mitraBoxW - mitraPadX * 2,
    p4Fit.lh,
    p4Fs,
    'left'
  );
  boxY += 3.2;

  for (const row of wrappedMitraRows) {
    const yL = drawRichLines(doc, row.lblLines, mitraBoxX + mitraPadX, boxY, mitraLabelW, mitraRowLH, p4Fs, 'left');
    const yV = drawRichLines(
      doc,
      row.valLines,
      mitraBoxX + mitraPadX + mitraLabelW,
      boxY,
      mitraValW,
      mitraRowLH,
      p4Fs,
      'left'
    );
    boxY = Math.max(yL, yV);
  }

  y = boxTopY + p4Fit.boxH + 7;
  y = drawRich(content.closingPara, MARGIN_X + 8, y, CONTENT_W - 8, p4Fit.lh, p4Fs, 'left', {
    variables: letterVariables,
  });

  // Signature block (exact 2-column centered layout matching View, clamped safely above footer)
  y = Math.min(y + p4Fit.lvl.sigGap, Math.max(y + 3, CONTENT_BOTTOM - p4Fit.sigH));

  const yHeadL = drawRich(content.directorSignHeading, leftCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
  });
  const yHeadR = drawRich(content.mitraSignHeading, rightCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
  });
  y = Math.max(yHeadL, yHeadR);

  const yFirmL = drawRich(content.directorFirmLabel, leftCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
    baseStyle: { bold: true },
  });
  const yFirmR = drawRich(content.mitraSignerLabel, rightCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
    baseStyle: { bold: true },
  });
  y = Math.max(yFirmL, yFirmR) + 3.5;

  if (directorQrDataUrl) {
    doc.addImage(directorQrDataUrl, 'PNG', leftCenterX - qrSize / 2, y, qrSize, qrSize, undefined, 'FAST');
  }
  if (mitraQrDataUrl) {
    doc.addImage(mitraQrDataUrl, 'PNG', rightCenterX - qrSize / 2, y, qrSize, qrSize, undefined, 'FAST');
  }
  y += qrSize + 4;

  const yNoteL = drawRich(
    'Ditandatangani secara elektronik',
    leftCenterX,
    y,
    sigColW,
    p4Fit.noteLH,
    9.5,
    'center',
    undefined,
    [153, 153, 153]
  );
  const yNoteR = drawRich(
    'Ditandatangani secara elektronik',
    rightCenterX,
    y,
    sigColW,
    p4Fit.noteLH,
    9.5,
    'center',
    undefined,
    [153, 153, 153]
  );
  y = Math.max(yNoteL, yNoteR) + 3.5;

  const directorNameRaw = content.directorName || letter.directorName || 'Nurtiyas, S.E., M.Ak, BKP';
  const mitraNameFs = letter.mitraName.length > 32 ? 9.8 : 11;
  const mitraNameLH = mitraNameFs * PT_TO_MM * p4Fit.lvl.lhFactor;

  const yNameL = drawRich(directorNameRaw, leftCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
    baseStyle: { bold: true },
  });
  const yNameR = drawRich(content.mitraSignerName, rightCenterX, y, sigColW, mitraNameLH, mitraNameFs, 'center', {
    variables: letterVariables,
    baseStyle: { bold: true },
  });
  y = Math.max(yNameL, yNameR);

  const directorTitleRaw = content.directorTitle || letter.directorTitle || 'Direktur Utama';
  drawRich(directorTitleRaw, leftCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
  });
  drawRich(content.mitraRoleLabel, rightCenterX, y, sigColW, p4Fit.lh, p4Fs, 'center', {
    variables: letterVariables,
  });

  const safeSlug = letter.companyName
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const fileName = `Surat_Penawaran_ND_Tax_and_Law_${safeSlug || 'Prospek'}.pdf`;

  if (mode === 'bloburl') {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }

  triggerPdfBlobDownload(doc, fileName);
}

export function triggerPdfBlobDownload(doc: jsPDF, fileName: string): void {
  const blob = doc.output('blob');
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    doc.save(fileName);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 15000);
}
