import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  ProspectAddressParts,
  ProspectLetter,
  ProspectLetterContent,
  resolveProspectLetterContent,
} from '../types';
import { stripProspectRichText } from './prospectRichText';

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
    const scale = Math.max(2, Math.min(4, 600 / Math.max(natW, natH)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(natW * scale));
    canvas.height = Math.max(1, Math.round(natH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#092147',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generates an exact 4-page A4 PDF matching ND Tax and Law official template:
 * - Paper: A4 Portrait (210mm x 297mm)
 * - Font: Arial / Helvetica 11pt
 * - Margins: Left & Right 30mm (3cm), Top & Bottom 40mm (4cm)
 * - Logo follows Admin-uploaded logo from AppSettings
 * - Body content follows Admin/Staf master template & per-letter overrides
 */
export async function generateProspectLetterPdf(
  letter: ProspectLetter,
  mode: 'download' | 'bloburl' = 'download',
  adminLogoUrl?: string,
  masterTemplate?: Partial<ProspectLetterContent> | null
): Promise<string | void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const rawContent = resolveProspectLetterContent(undefined, masterTemplate);
  const s = stripProspectRichText;
  const content: ProspectLetterContent = {
    ...rawContent,
    city: s(rawContent.city),
    sifat: s(rawContent.sifat),
    lampiran: s(rawContent.lampiran),
    perihal: s(rawContent.perihal),
    greeting: s(rawContent.greeting),
    introPara1: s(rawContent.introPara1),
    introPara2: s(rawContent.introPara2),
    sectionMainTitle: s(rawContent.sectionMainTitle),
    section1Title: s(rawContent.section1Title),
    section1Items: rawContent.section1Items.map((it) => ({
      title: s(it.title),
      bullets: it.bullets.map((b) => s(b)),
    })),
    section1Sanction: s(rawContent.section1Sanction),
    section2Title: s(rawContent.section2Title),
    section2Items: rawContent.section2Items.map((it) => ({
      title: s(it.title),
      bullets: it.bullets.map((b) => s(b)),
    })),
    section2Sanction: s(rawContent.section2Sanction),
    section3Title: s(rawContent.section3Title),
    section3Items: rawContent.section3Items.map((it) => ({
      title: s(it.title),
      bullets: it.bullets.map((b) => s(b)),
    })),
    section3Sanction: s(rawContent.section3Sanction),
    aboutTitle: s(rawContent.aboutTitle),
    aboutPara: s(rawContent.aboutPara),
    servicesTitle: s(rawContent.servicesTitle),
    servicesIntro: s(rawContent.servicesIntro),
    servicesItems: rawContent.servicesItems.map((it) => ({
      lead: s(it.lead),
      body: s(it.body),
    })),
    servicesCaseNote: s(rawContent.servicesCaseNote),
    comparisonTitle: s(rawContent.comparisonTitle),
    comparisonIntro: s(rawContent.comparisonIntro),
    comparisonHeaders: [
      s(rawContent.comparisonHeaders[0]),
      s(rawContent.comparisonHeaders[1]),
      s(rawContent.comparisonHeaders[2]),
    ],
    comparisonRows: rawContent.comparisonRows.map((r) => ({
      component: s(r.component),
      internalStaff: s(r.internalStaff),
      consultant: s(r.consultant),
    })),
    comparisonClosing: s(rawContent.comparisonClosing),
    consultTitle: s(rawContent.consultTitle),
    consultPara: s(rawContent.consultPara),
    closingPara: s(rawContent.closingPara),
    directorFirmLabel: s(rawContent.directorFirmLabel),
    directorName: s(rawContent.directorName),
    directorTitle: s(rawContent.directorTitle),
    mitraSignerLabel: s(rawContent.mitraSignerLabel),
    mitraRoleLabel: s(rawContent.mitraRoleLabel),
    footerLeftTitle: s(rawContent.footerLeftTitle),
    footerLeftLines: rawContent.footerLeftLines.map((l) => s(l)),
    footerRightTitle: s(rawContent.footerRightTitle),
    footerRightLines: rawContent.footerRightLines.map((l) => s(l)),
  };

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_X = 30; // 3 cm left & right
  const MARGIN_TOP = 40; // 4 cm top
  const MARGIN_BOTTOM = 40; // 4 cm bottom
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 150 mm
  const CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM; // 257 mm
  const CONTENT_H = CONTENT_BOTTOM - MARGIN_TOP; // 217 mm

  const useCustomAdminLogo = !isDefaultVerticalLogo(adminLogoUrl);
  const targetLogoSrc = useCustomAdminLogo ? String(adminLogoUrl).trim() : DEFAULT_EMBLEM_PNG;

  const [loadedLogo, directorQrDataUrl, mitraQrDataUrl] = await Promise.all([
    loadRasterizedLogoPng(targetLogoSrc).then((res) =>
      res || (useCustomAdminLogo ? loadRasterizedLogoPng(DEFAULT_EMBLEM_PNG) : null)
    ),
    generateQrDataUrl(buildDirectorQrUrl(letter)),
    generateQrDataUrl(buildMitraQrUrl(letter.mitraMemberCode)),
  ]);
  const hasCustomLogoRendered = Boolean(useCustomAdminLogo && loadedLogo && cachedLogos.has(targetLogoSrc));

  const drawHeaderAndFooter = () => {
    // HEADER (inside top 40mm zone)
    if (hasCustomLogoRendered && loadedLogo) {
      const maxW = 56;
      const maxH = 25;
      const ratio = loadedLogo.width / Math.max(1, loadedLogo.height);
      let drawW = maxW;
      let drawH = drawW / ratio;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * ratio;
      }
      const drawX = MARGIN_X;
      const drawY = 7.5 + (maxH - drawH) / 2;
      doc.addImage(loadedLogo.dataUrl, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
    } else {
      const logoCenterX = MARGIN_X + 12;
      if (loadedLogo) {
        doc.addImage(loadedLogo.dataUrl, 'PNG', logoCenterX - 9, 6.5, 18, 18, undefined, 'FAST');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(178, 146, 94);
      doc.text('TAX AND LAW', logoCenterX, 28.2, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.4);
      doc.setTextColor(156, 130, 88);
      doc.text('NURTIYAS & DARMAWAN', logoCenterX, 31.3, { align: 'center' });
    }

    // FOOTER (inside bottom 40mm zone: gray strip y=263..297mm)
    doc.setFillColor(244, 244, 244);
    doc.rect(0, 263, PAGE_W, PAGE_H - 263, 'F');

    const footY = 271.5;
    const footLineGap = 4.1;
    const footLeftX = 22;
    const footRightX = PAGE_W - 22;

    // Left Footer Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(17, 17, 17);
    doc.text(content.footerLeftTitle, footLeftX, footY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 35, 35);
    content.footerLeftLines.slice(0, 5).forEach((line, i) => {
      doc.text(line, footLeftX, footY + footLineGap * (i + 1));
    });

    // Right Footer Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(186, 152, 74);
    doc.text(content.footerRightTitle, footRightX, footY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 35, 35);
    content.footerRightLines.slice(0, 5).forEach((line, i) => {
      doc.text(line, footRightX, footY + footLineGap * (i + 1), { align: 'right' });
    });

    doc.setTextColor(0, 0, 0);
  };

  const drawWrapped = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    align: 'left' | 'justify' = 'left'
  ): number => {
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    if (align === 'justify') {
      lines.forEach((line, idx) => {
        const isLast = idx === lines.length - 1;
        if (isLast) {
          doc.text(line, x, y + idx * lineHeight);
        } else {
          doc.text(line, x, y + idx * lineHeight, { align: 'justify', maxWidth });
        }
      });
    } else {
      lines.forEach((line, idx) => {
        doc.text(line, x, y + idx * lineHeight);
      });
    }
    return y + lines.length * lineHeight;
  };

  const measureLines = (text: string, maxWidth: number, fontSize = 11, style: 'normal' | 'bold' = 'normal'): string[] => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  // =========================================================================
  // PAGE 1 — SURAT PENGANTAR & DASAR HUKUM LAPORAN KEUANGAN (LOCKED TO PAGE 1)
  // =========================================================================
  drawHeaderAndFooter();

  const formattedDate = formatIndonesianLetterDate(letter.letterDate || letter.createdAt);
  const companyText = letter.companyName.trim();
  const addressText = letter.companyAddress.trim();

  const p1Para1 = interpolateCompanyName(content.introPara1, companyText);
  const p1Para2 = interpolateCompanyName(content.introPara2, companyText);
  const p1Heading = content.sectionMainTitle;
  const p1LawItems = content.section1Items;
  const p1Sanction = content.section1Sanction;

  const computePage1Metrics = (lh: number, gap: number, recipFontSize: number, bodyFontSize: number) => {
    const recipLH = recipFontSize === 11 ? lh : Math.max(3.75, lh - 0.35);
    const lCompany = measureLines(`Pimpinan/Direksi ${companyText}`, CONTENT_W, recipFontSize, 'normal');
    const lAddress = measureLines(`Alamat: ${addressText}`, CONTENT_W, recipFontSize, 'normal');
    const lPara1 = measureLines(p1Para1, CONTENT_W, bodyFontSize, 'normal');
    const lPara2 = measureLines(p1Para2, CONTENT_W, bodyFontSize, 'normal');
    const lHeading = measureLines(p1Heading, CONTENT_W, bodyFontSize, 'bold');
    const lSanction = measureLines(p1Sanction, CONTENT_W - 6, bodyFontSize, 'normal');

    let lawHeight = lh;
    for (const item of p1LawItems) {
      const tLines = measureLines(item.title, CONTENT_W - 12.5, bodyFontSize, 'normal');
      lawHeight += tLines.length * lh;
      for (const b of item.bullets) {
        const bLines = measureLines(b, CONTENT_W - 12.5, bodyFontSize, 'normal');
        lawHeight += bLines.length * lh;
      }
      lawHeight += gap * 0.55;
    }

    const totalH =
      lh +
      4 * lh +
      gap +
      lh +
      lCompany.length * recipLH +
      lAddress.length * recipLH +
      gap +
      lh +
      lPara1.length * lh +
      gap +
      lPara2.length * lh +
      gap * 1.25 +
      lHeading.length * lh +
      gap * 0.9 +
      lawHeight +
      gap * 0.4 +
      (lSanction.length * lh + 4.4);

    return { totalH, lh, recipLH, gap, recipFontSize, bodyFontSize };
  };

  const candidates: Array<[number, number, number, number]> = [
    [4.45, 3.4, 11, 11],
    [4.3, 2.8, 11, 11],
    [4.15, 2.3, 11, 11],
    [4.05, 2.0, 10.5, 11],
    [3.95, 1.7, 10, 11],
    [3.82, 1.4, 9.5, 10.5],
    [3.68, 1.2, 9.5, 10],
  ];
  let p1Layout = computePage1Metrics(4.45, 3.4, 11, 11);
  for (const [lh, gap, rfs, bfs] of candidates) {
    const test = computePage1Metrics(lh, gap, rfs, bfs);
    p1Layout = test;
    if (test.totalH <= CONTENT_H - 1.5) break;
  }

  let y = MARGIN_TOP + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p1Layout.bodyFontSize);
  doc.setTextColor(0, 0, 0);

  doc.text(`${content.city}, ${formattedDate}`, PAGE_W - MARGIN_X, y, { align: 'right' });
  y += p1Layout.lh;

  const metaRows: Array<[string, string]> = [
    ['Nomor', letter.letterNumber],
    ['Sifat', content.sifat],
    ['Lampiran', content.lampiran],
    ['Perihal', content.perihal],
  ];
  for (const [label, val] of metaRows) {
    doc.text(label, MARGIN_X, y);
    doc.text(`: ${val}`, MARGIN_X + 25, y);
    y += p1Layout.lh;
  }
  y += p1Layout.gap;

  doc.setFontSize(p1Layout.bodyFontSize);
  doc.text('Kepada Yth', MARGIN_X, y);
  y += p1Layout.lh;

  doc.setFontSize(p1Layout.recipFontSize);
  y = drawWrapped(`Pimpinan/Direksi ${companyText}`, MARGIN_X, y, CONTENT_W, p1Layout.recipLH, 'left');
  y = drawWrapped(`Alamat: ${addressText}`, MARGIN_X, y, CONTENT_W, p1Layout.recipLH, 'left');
  y += p1Layout.gap;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p1Layout.bodyFontSize);
  doc.text(content.greeting, MARGIN_X, y);
  y += p1Layout.lh;

  y = drawWrapped(p1Para1, MARGIN_X, y, CONTENT_W, p1Layout.lh, 'justify');
  y += p1Layout.gap;

  y = drawWrapped(p1Para2, MARGIN_X, y, CONTENT_W, p1Layout.lh, 'justify');
  y += p1Layout.gap * 1.25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p1Layout.bodyFontSize);
  y = drawWrapped(p1Heading, MARGIN_X, y, CONTENT_W, p1Layout.lh, 'left');
  y += p1Layout.gap * 0.85;

  doc.text('I.', MARGIN_X, y);
  y = drawWrapped(content.section1Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p1Layout.lh, 'left');

  doc.setFont('helvetica', 'normal');
  p1LawItems.forEach((item, idx) => {
    doc.text(`${idx + 1}.`, MARGIN_X + 6.5, y);
    y = drawWrapped(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p1Layout.lh, 'left');
    for (const bullet of item.bullets) {
      doc.text('-', MARGIN_X + 6.5, y);
      y = drawWrapped(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p1Layout.lh, 'justify');
    }
    y += p1Layout.gap * 0.55;
  });

  y += p1Layout.gap * 0.25;
  const p1BoxW = CONTENT_W - 6.5;
  const p1BoxLines = measureLines(p1Sanction, p1BoxW - 5, p1Layout.bodyFontSize, 'normal');
  const p1BoxH = p1BoxLines.length * p1Layout.lh + 3.4;
  const p1BoxY = Math.min(y - 3.2, CONTENT_BOTTOM - p1BoxH);
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X + 6.5, p1BoxY, p1BoxW, p1BoxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p1Layout.bodyFontSize);
  doc.setTextColor(0, 0, 0);
  drawWrapped(p1Sanction, MARGIN_X + 9, p1BoxY + 4.1, p1BoxW - 5, p1Layout.lh, 'justify');

  // =========================================================================
  // PAGE 2 — DASAR HUKUM PERPAJAKAN & KETENAGAKERJAAN (LOCKED TO PAGE 2)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const p2BoxW = CONTENT_W - 6.5;
  const computePage2Height = (lh: number, gap: number, fs: number) => {
    let h = lh; // II. heading
    for (const item of content.section2Items) {
      h += measureLines(item.title, CONTENT_W - 12.5, fs, 'normal').length * lh;
      for (const b of item.bullets) {
        h += measureLines(b, CONTENT_W - 12.5, fs, 'normal').length * lh;
      }
      h += gap;
    }
    h += measureLines(content.section2Sanction, p2BoxW - 5, fs, 'normal').length * lh + 3.4 + 5.2;
    h += lh; // III. heading
    for (const item of content.section3Items) {
      h += measureLines(item.title, CONTENT_W - 12.5, fs, 'normal').length * lh;
      for (const b of item.bullets) {
        h += measureLines(b, CONTENT_W - 12.5, fs, 'normal').length * lh;
      }
      h += gap;
    }
    h += measureLines(content.section3Sanction, p2BoxW - 5, fs, 'normal').length * lh + 3.4;
    return h;
  };

  const p2Candidates: Array<[number, number, number]> = [
    [4.35, 2.0, 11],
    [4.2, 1.6, 11],
    [4.05, 1.4, 10.6],
    [3.9, 1.2, 10.2],
    [3.75, 1.0, 9.8],
    [3.6, 0.85, 9.4],
  ];
  let p2LH = 4.35;
  let p2Gap = 2.0;
  let p2FS = 11;
  for (const [lh, gap, fs] of p2Candidates) {
    p2LH = lh;
    p2Gap = gap;
    p2FS = fs;
    if (computePage2Height(lh, gap, fs) <= CONTENT_H - 1.5) break;
  }

  y = MARGIN_TOP + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p2FS);
  doc.text('II.', MARGIN_X, y);
  y = drawWrapped(content.section2Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p2LH, 'left');

  doc.setFont('helvetica', 'normal');
  content.section2Items.forEach((item, idx) => {
    doc.text(`${idx + 1}.`, MARGIN_X + 6.5, y);
    y = drawWrapped(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2LH, 'left');
    for (const bullet of item.bullets) {
      doc.text('-', MARGIN_X + 6.5, y);
      y = drawWrapped(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2LH, 'justify');
    }
    y += p2Gap;
  });

  const p2TaxBoxLines = measureLines(content.section2Sanction, p2BoxW - 5, p2FS, 'normal');
  const p2TaxBoxH = p2TaxBoxLines.length * p2LH + 3.4;
  const p2TaxBoxY = y - 2.4;
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X + 6.5, p2TaxBoxY, p2BoxW, p2TaxBoxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p2FS);
  doc.setTextColor(0, 0, 0);
  drawWrapped(content.section2Sanction, MARGIN_X + 9, p2TaxBoxY + 4.1, p2BoxW - 5, p2LH, 'justify');
  y = p2TaxBoxY + p2TaxBoxH + 5.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p2FS);
  doc.text('III.', MARGIN_X, y);
  y = drawWrapped(content.section3Title, MARGIN_X + 6.5, y, CONTENT_W - 6.5, p2LH, 'left');

  doc.setFont('helvetica', 'normal');
  content.section3Items.forEach((item, idx) => {
    doc.text(`${idx + 1}.`, MARGIN_X + 6.5, y);
    y = drawWrapped(item.title, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2LH, 'left');
    for (const bullet of item.bullets) {
      doc.text('-', MARGIN_X + 6.5, y);
      y = drawWrapped(bullet, MARGIN_X + 12.5, y, CONTENT_W - 12.5, p2LH, 'justify');
    }
    y += p2Gap;
  });

  const p2LaborBoxLines = measureLines(content.section3Sanction, p2BoxW - 5, p2FS, 'normal');
  const p2LaborBoxH = p2LaborBoxLines.length * p2LH + 3.4;
  const p2LaborBoxY = Math.min(y - 2.0, CONTENT_BOTTOM - p2LaborBoxH);
  doc.setFillColor(244, 244, 244);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X + 6.5, p2LaborBoxY, p2BoxW, p2LaborBoxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p2FS);
  doc.setTextColor(0, 0, 0);
  drawWrapped(content.section3Sanction, MARGIN_X + 9, p2LaborBoxY + 4.1, p2BoxW - 5, p2LH, 'justify');

  // =========================================================================
  // PAGE 3 — TENTANG ND TAX AND LAW, LAYANAN & TABEL PERBANDINGAN (LOCKED)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const p3About = interpolateCompanyName(content.aboutPara, companyText);
  const p3LH = 4.65;
  y = MARGIN_TOP + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(content.aboutTitle, MARGIN_X, y);
  y += p3LH + 2.5;

  doc.setFont('helvetica', 'normal');
  y = drawWrapped(p3About, MARGIN_X, y, CONTENT_W, p3LH, 'justify');
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('I.', MARGIN_X, y);
  y = drawWrapped(content.servicesTitle, MARGIN_X + 7, y, CONTENT_W - 7, p3LH, 'left');

  doc.setFont('helvetica', 'normal');
  y = drawWrapped(content.servicesIntro, MARGIN_X + 7, y, CONTENT_W - 7, p3LH, 'justify');
  y += 1.2;

  content.servicesItems.forEach((s, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.text(`${idx + 1}.`, MARGIN_X + 10, y);
    const leadWithSpace = s.lead ? (s.lead.endsWith(' ') ? s.lead : `${s.lead} `) : '';
    const fullLine = `${leadWithSpace}${s.body}`;
    const wrapped = doc.splitTextToSize(fullLine, CONTENT_W - 17);
    wrapped.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0 && leadWithSpace && line.startsWith(leadWithSpace)) {
        doc.setFont('helvetica', 'bold');
        doc.text(leadWithSpace, MARGIN_X + 17, y);
        const leadW = doc.getTextWidth(leadWithSpace);
        doc.setFont('helvetica', 'normal');
        doc.text(line.slice(leadWithSpace.length), MARGIN_X + 17 + leadW, y);
      } else {
        doc.setFont('helvetica', 'normal');
        const isLast = lineIdx === wrapped.length - 1;
        doc.text(line, MARGIN_X + 17, y, isLast ? undefined : { align: 'justify', maxWidth: CONTENT_W - 17 });
      }
      y += p3LH;
    });
    y += 0.6;
  });

  y += 2.2;
  doc.setFont('helvetica', 'normal');
  y = drawWrapped(content.servicesCaseNote, MARGIN_X, y, CONTENT_W, p3LH, 'justify');
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('II.', MARGIN_X, y);
  y = drawWrapped(content.comparisonTitle, MARGIN_X + 7, y, CONTENT_W - 7, p3LH, 'left');
  y += 1.5;

  doc.setFont('helvetica', 'normal');
  y = drawWrapped(content.comparisonIntro, MARGIN_X, y, CONTENT_W, p3LH, 'left');
  y += 2.2;

  const colW = [52, 60, 38];
  const rowH = 8.4;
  const tableRows: Array<[string, string, string, boolean]> = [
    [content.comparisonHeaders[0], content.comparisonHeaders[1], content.comparisonHeaders[2], true],
    ...content.comparisonRows.map(
      (r): [string, string, string, boolean] => [r.component, r.internalStaff, r.consultant, false]
    ),
  ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  tableRows.forEach((row, rIdx) => {
    const isHeader = row[3];
    let curX = MARGIN_X;
    for (let c = 0; c < 3; c++) {
      if (isHeader) {
        doc.setFillColor(223, 220, 206);
        doc.rect(curX, y, colW[c], rowH, 'FD');
      } else {
        doc.rect(curX, y, colW[c], rowH, 'S');
      }
      const isBoldCell = isHeader || (rIdx === 1 && c === 2);
      doc.setFont('helvetica', isBoldCell ? 'bold' : 'normal');
      doc.setFontSize(10.5);
      doc.text(String(row[c] ?? ''), curX + 2.2, y + 5.5);
      curX += colW[c];
    }
    y += rowH;
  });

  y += 6.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  drawWrapped(content.comparisonClosing, MARGIN_X, y, CONTENT_W, p3LH, 'justify');

  // =========================================================================
  // PAGE 4 — KONSULTASI AWAL, MITRA STRATEGIS & TANDA TANGAN BARCODE (LOCKED)
  // =========================================================================
  doc.addPage();
  drawHeaderAndFooter();

  const p4LH = 4.9;
  y = MARGIN_TOP + 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('III.', MARGIN_X, y);
  y = drawWrapped(content.consultTitle, MARGIN_X + 8, y, CONTENT_W - 8, p4LH, 'left');
  y += 2.5;

  doc.setFont('helvetica', 'normal');
  y = drawWrapped(
    interpolateCompanyName(content.consultPara, companyText),
    MARGIN_X + 8,
    y,
    CONTENT_W - 8,
    p4LH,
    'justify'
  );
  y += 8;

  const boxTopY = y;
  const boxHeight = 37;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.32);
  doc.rect(MARGIN_X, boxTopY, CONTENT_W, boxHeight);

  let boxY = boxTopY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Mitra Strategis', MARGIN_X + 4, boxY);
  const titleW = doc.getTextWidth('Mitra Strategis');
  doc.setLineWidth(0.35);
  doc.line(MARGIN_X + 4, boxY + 0.8, MARGIN_X + 4 + titleW, boxY + 0.8);

  boxY += 8.2;
  doc.setFont('helvetica', 'normal');
  const mitraRows: Array<[string, string]> = [
    ['Nama', letter.mitraName || '-'],
    ['No. ID', letter.mitraMemberCode || '-'],
    ['Whatsapp', letter.mitraPhone || '-'],
    ['Email', letter.mitraEmail || '-'],
  ];
  for (const [lbl, val] of mitraRows) {
    doc.text(lbl, MARGIN_X + 4, boxY);
    doc.text(`: ${val}`, MARGIN_X + 27, boxY);
    boxY += 5.1;
  }

  y = boxTopY + boxHeight + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  y = drawWrapped(interpolateCompanyName(content.closingPara, companyText), MARGIN_X, y, CONTENT_W, p4LH, 'left');

  y += 17;
  const leftCenterX = MARGIN_X + 34;
  const rightCenterX = PAGE_W - MARGIN_X - 34;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Mengetahui,', leftCenterX, y, { align: 'center' });
  doc.text('Hormat Kami,', rightCenterX, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(content.directorFirmLabel, leftCenterX, y, { align: 'center' });
  doc.text(content.mitraSignerLabel, rightCenterX, y, { align: 'center' });
  y += 5;

  const qrSize = 27;
  if (directorQrDataUrl) {
    doc.addImage(directorQrDataUrl, 'PNG', leftCenterX - qrSize / 2, y, qrSize, qrSize);
  }
  if (mitraQrDataUrl) {
    doc.addImage(mitraQrDataUrl, 'PNG', rightCenterX - qrSize / 2, y, qrSize, qrSize);
  }
  y += qrSize + 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Ditandatangani secara elektronik', leftCenterX, y, { align: 'center' });
  doc.text('Ditandatangani secara elektronik', rightCenterX, y, { align: 'center' });
  y += 7;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(content.directorName || letter.directorName || 'Nurtiyas, S.E., M.Ak, BKP', leftCenterX, y, {
    align: 'center',
  });

  const mitraSignerName = letter.mitraName || 'Mitra Strategis';
  const mitraNameFontSize = mitraSignerName.length > 34 ? 9.5 : mitraSignerName.length > 26 ? 10.2 : 11;
  doc.setFontSize(mitraNameFontSize);
  doc.text(mitraSignerName, rightCenterX, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(content.directorTitle || letter.directorTitle || 'Direktur Utama', leftCenterX, y, { align: 'center' });
  doc.text(content.mitraRoleLabel, rightCenterX, y, { align: 'center' });

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
