import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  fill,
  stroke,
  setFillingColor,
  setStrokingColor,
  setLineWidth,
  PDFPage,
  PDFFont,
  PDFImage,
} from 'pdf-lib';

export interface DynamicMitraCardData {
  fullName: string;
  email: string;
  phone: string;
  avatarBuffer?: Buffer | null;
  avatarMime?: string | null;
}

export type ProposalLanguage = 'id' | 'en';
export type ProposalStampMode = 'first_and_last' | 'first_only' | 'all_pages' | 'none';

const BASE_PAGE_W = 594.96;
const BASE_PAGE_H = 841.92;

// Kappa constant for cubic Bezier approximation of a 90-degree circular arc
const KAPPA = 0.5522847498;

/**
 * Strip characters outside WinAnsi (Windows-1252) so StandardFonts never throw.
 */
function sanitizeWinAnsi(input: string): string {
  const normalized = String(input || '')
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      out += normalized[i];
    }
  }
  return out;
}

function getInitials(name: string): string {
  const parts = sanitizeWinAnsi(name)
    .split(/\s+/)
    .filter((w) => w && !w.includes('.'));
  if (parts.length === 0) return 'ND';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Push a rounded rectangle path onto the current PDF graphics state.
 * Coordinates use bottom-left PDF origin (x, y, w, h).
 */
function roundedRectOps(x: number, y: number, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const c = r * KAPPA;
  return [
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + c, y, x + w, y + r - c, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - r + c, x + w - r + c, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + r - c, y + h, x, y + h - r + c, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - c, x + r - c, y, x + r, y),
    closePath(),
  ];
}

function isPngBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

function isJpegBuffer(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Convert non-PNG/JPEG raster images (e.g. WebP / GIF) to PNG using ffmpeg if available.
 */
async function convertImageBufferToPng(
  buf: Buffer,
  ffmpegBin?: string | null
): Promise<Buffer | null> {
  if (!ffmpegBin) return null;
  const uid = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const inPath = path.join(os.tmpdir(), `nd-avatar-in-${uid}`);
  const outPath = path.join(os.tmpdir(), `nd-avatar-out-${uid}.png`);
  try {
    fs.writeFileSync(inPath, buf);
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegBin,
        ['-y', '-i', inPath, '-frames:v', '1', outPath],
        { timeout: 15_000, maxBuffer: 5 * 1024 * 1024 },
        (err) => (err ? reject(err) : resolve())
      );
    });
    if (fs.existsSync(outPath)) {
      const converted = fs.readFileSync(outPath);
      return converted.length > 0 ? converted : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    try {
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
    } catch {}
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {}
  }
}

async function embedMitraAvatarImage(
  pdfDoc: PDFDocument,
  avatarBuffer?: Buffer | null,
  ffmpegBin?: string | null
): Promise<PDFImage | null> {
  if (!avatarBuffer || avatarBuffer.length < 16) return null;
  try {
    if (isPngBuffer(avatarBuffer)) {
      return await pdfDoc.embedPng(avatarBuffer);
    }
    if (isJpegBuffer(avatarBuffer)) {
      return await pdfDoc.embedJpg(avatarBuffer);
    }
    const convertedPng = await convertImageBufferToPng(avatarBuffer, ffmpegBin);
    if (convertedPng && isPngBuffer(convertedPng)) {
      return await pdfDoc.embedPng(convertedPng);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Fit text inside maxWidth by stepping down font size, and truncating with ellipsis only if needed.
 */
function fitSingleLineText(
  text: string,
  font: PDFFont,
  preferredSize: number,
  minSize: number,
  maxWidth: number
): { text: string; size: number } {
  const clean = sanitizeWinAnsi(text);
  if (!clean) return { text: '-', size: preferredSize };

  let size = preferredSize;
  while (size > minSize && font.widthOfTextAtSize(clean, size) > maxWidth) {
    size = Number((size - 0.35).toFixed(2));
  }
  if (size < minSize) size = minSize;

  if (font.widthOfTextAtSize(clean, size) <= maxWidth) {
    return { text: clean, size };
  }

  let truncated = clean;
  while (truncated.length > 3 && font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
    truncated = truncated.slice(0, -1).trimEnd();
  }
  return { text: `${truncated}...`, size };
}

/**
 * Draw tracked uppercase header text (matching "ND STRATEGIC PARTNER" / "MITRA STRATEGIS ND").
 */
function drawTrackedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  letterSpacing: number,
  color: ReturnType<typeof rgb>
) {
  let cursorX = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    page.drawText(ch, { x: cursorX, y, size, font, color });
    cursorX += font.widthOfTextAtSize(ch, size) + letterSpacing;
  }
}

/**
 * Stamp the dark-and-gold ND Strategic Partner card over the bottom-left card slot
 * on a PDF page. Coordinates are calibrated to exact A4 proposal geometry and scale
 * proportionally on any page size.
 */
function drawPartnerCardOnPage(
  page: PDFPage,
  mitra: DynamicMitraCardData,
  lang: ProposalLanguage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  avatarImage: PDFImage | null
) {
  const { width: pageW, height: pageH } = page.getSize();
  const sx = pageW / BASE_PAGE_W;
  const sy = pageH / BASE_PAGE_H;
  const s = Math.min(sx, sy);

  // Card bounding box slightly +0.6pt oversized to cover any anti-aliased edge of template card
  const cardX = 44.4 * sx;
  const cardY = 44.8 * sy;
  const cardW = 243.4 * sx;
  const cardH = 98.7 * sy;
  const cardR = 4.6 * s;

  const darkBg = rgb(0.055, 0.071, 0.094);      // #0E1218
  const subtleBorder = rgb(0.29, 0.259, 0.196); // #4A4232
  const gold = rgb(0.788, 0.643, 0.361);        // #C9A45C
  const white = rgb(1, 1, 1);
  const softWhite = rgb(0.898, 0.914, 0.933);   // #E5E9EE
  const photoBackdrop = rgb(0.84, 0.855, 0.875);
  const navyFallback = rgb(0.067, 0.22, 0.447); // #113872

  // 1. Outer rounded dark card fill
  page.pushOperators(
    pushGraphicsState(),
    setFillingColor(darkBg),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    fill(),
    popGraphicsState()
  );

  // 2. Gold left accent bar clipped neatly inside the outer rounded rectangle
  page.pushOperators(
    pushGraphicsState(),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    clip(),
    endPath(),
    setFillingColor(gold),
    ...roundedRectOps(cardX, cardY, 3.1 * sx, cardH, 0),
    fill(),
    popGraphicsState()
  );

  // 3. Outer subtle gold-bronze border
  page.pushOperators(
    pushGraphicsState(),
    setStrokingColor(subtleBorder),
    setLineWidth(0.85 * s),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    stroke(),
    popGraphicsState()
  );

  // 4. Square rounded Mitra Photo on left side of card
  const photoX = 62.6 * sx;
  const photoY = 60.8 * sy;
  const photoW = 67.5 * sx;
  const photoH = 67.5 * sy;
  const photoR = 5.2 * s;

  page.pushOperators(
    pushGraphicsState(),
    ...roundedRectOps(photoX, photoY, photoW, photoH, photoR),
    clip(),
    endPath(),
    setFillingColor(avatarImage ? photoBackdrop : navyFallback),
    ...roundedRectOps(photoX, photoY, photoW, photoH, 0),
    fill()
  );

  if (avatarImage) {
    const imgDims = avatarImage.scale(1);
    const coverScale = Math.max(photoW / Math.max(1, imgDims.width), photoH / Math.max(1, imgDims.height));
    const drawW = imgDims.width * coverScale;
    const drawH = imgDims.height * coverScale;
    const drawX = photoX + (photoW - drawW) / 2;
    // Slight upper-center vertical bias (65% toward top) so portraits frame the face cleanly
    const drawY = photoY + (photoH - drawH) * 0.65;
    page.drawImage(avatarImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  } else {
    const initials = getInitials(mitra.fullName);
    const initSize = 22 * s;
    const initW = fontBold.widthOfTextAtSize(initials, initSize);
    page.drawText(initials, {
      x: photoX + (photoW - initW) / 2,
      y: photoY + (photoH - initSize * 0.72) / 2,
      size: initSize,
      font: fontBold,
      color: gold,
    });
  }

  page.pushOperators(popGraphicsState());

  // Gold rounded border around photo
  page.pushOperators(
    pushGraphicsState(),
    setStrokingColor(gold),
    setLineWidth(1.0 * s),
    ...roundedRectOps(photoX, photoY, photoW, photoH, photoR),
    stroke(),
    popGraphicsState()
  );

  // 5. Right column header label ("ND STRATEGIC PARTNER" or "MITRA STRATEGIS ND")
  const colX = 144.8 * sx;
  const textX = 159.5 * sx;
  const maxTextW = Math.max(60 * sx, cardX + cardW - 10 * sx - textX);
  const roleLabel = lang === 'en' ? 'ND STRATEGIC PARTNER' : 'MITRA STRATEGIS ND';

  drawTrackedText(
    page,
    roleLabel,
    colX,
    118.2 * sy,
    fontBold,
    6.6 * s,
    0.95 * s,
    gold
  );

  // 6. Crisp Lucide-style vector icons (24x24 viewBox scaled to ~9.5pt)
  const iconScale = (9.5 * s) / 24;
  const iconStroke = 1.85;

  // Row 1: User icon + Mitra Name
  const nameRowBaseY = 97.2 * sy;
  const nameIconTopY = nameRowBaseY + 8.6 * sy;
  page.drawSvgPath('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', {
    x: colX,
    y: nameIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke,
  });
  page.drawSvgPath('M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z', {
    x: colX,
    y: nameIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke,
  });

  const fittedName = fitSingleLineText(
    mitra.fullName || 'Mitra ND Tax and Law',
    fontBold,
    10.0 * s,
    7.2 * s,
    maxTextW
  );
  page.drawText(fittedName.text, {
    x: textX,
    y: nameRowBaseY,
    size: fittedName.size,
    font: fontBold,
    color: white,
  });

  // Row 2: Mail icon + Mitra Email
  const emailRowBaseY = 79.8 * sy;
  const emailIconTopY = emailRowBaseY + 8.1 * sy;
  page.drawSvgPath('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', {
    x: colX,
    y: emailIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke,
  });
  page.drawSvgPath('M22 6l-10 7L2 6', {
    x: colX,
    y: emailIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke,
  });

  const fittedEmail = fitSingleLineText(
    mitra.email || '-',
    fontRegular,
    8.5 * s,
    6.4 * s,
    maxTextW
  );
  page.drawText(fittedEmail.text, {
    x: textX,
    y: emailRowBaseY,
    size: fittedEmail.size,
    font: fontRegular,
    color: softWhite,
  });

  // Row 3: Phone icon + Mitra Phone
  const phoneRowBaseY = 63.0 * sy;
  const phoneIconTopY = phoneRowBaseY + 8.3 * sy;
  page.drawSvgPath(
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
    {
      x: colX,
      y: phoneIconTopY,
      scale: iconScale,
      borderColor: gold,
      borderWidth: iconStroke,
    }
  );

  const fittedPhone = fitSingleLineText(
    mitra.phone || '-',
    fontRegular,
    8.5 * s,
    6.6 * s,
    maxTextW
  );
  page.drawText(fittedPhone.text, {
    x: textX,
    y: phoneRowBaseY,
    size: fittedPhone.size,
    font: fontRegular,
    color: softWhite,
  });
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

export async function stampMitraPartnerCardOnPdf(
  templatePdfBuffer: Buffer,
  mitra: DynamicMitraCardData,
  options: {
    lang: ProposalLanguage;
    stampMode?: ProposalStampMode;
    ffmpegBin?: string | null;
  }
): Promise<Buffer> {
  const mode = options.stampMode || 'first_and_last';
  if (mode === 'none') {
    return templatePdfBuffer;
  }

  const pdfDoc = await PDFDocument.load(templatePdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    return templatePdfBuffer;
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const avatarImage = await embedMitraAvatarImage(
    pdfDoc,
    mitra.avatarBuffer,
    options.ffmpegBin
  );

  const targetIndices = new Set<number>();
  if (mode === 'first_only') {
    targetIndices.add(0);
  } else if (mode === 'all_pages') {
    for (let i = 0; i < pages.length; i++) targetIndices.add(i);
  } else {
    // Default: first_and_last (Page 1 Cover & Final Thank You Page)
    targetIndices.add(0);
    if (pages.length > 1) {
      targetIndices.add(pages.length - 1);
    }
  }

  for (const idx of targetIndices) {
    drawPartnerCardOnPage(
      pages[idx],
      mitra,
      options.lang,
      fontRegular,
      fontBold,
      avatarImage
    );
  }

  const outBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(outBytes);
}
