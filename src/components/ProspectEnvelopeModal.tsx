import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { X, Printer, Download, Loader2, Mail } from 'lucide-react';
import { ProspectLetter } from '../types';
import {
  resolveInlineProspectLogo,
  triggerPdfBlobDownload,
} from '../utils/prospectLetterPdf';

// Exact envelope dimensions: 23cm x 11cm (230mm x 110mm) at 96dpi
const ENVELOPE_WIDTH_MM = 230;
const ENVELOPE_HEIGHT_MM = 110;
const ENVELOPE_WIDTH_PX = 869; // 230mm * 96 / 25.4
const ENVELOPE_HEIGHT_PX = 416; // 110mm * 96 / 25.4

const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';

interface ProspectEnvelopeSheetProps {
  companyName: string;
  companyAddress?: string;
  includeAddress?: boolean;
  logoUrl?: string;
  inlineLogo?: { isCustom: boolean; dataUrl: string } | null;
  mode?: 'preview' | 'print' | 'capture';
}

const ProspectEnvelopeSheet: React.FC<ProspectEnvelopeSheetProps> = ({
  companyName,
  companyAddress,
  includeAddress = false,
  logoUrl,
  inlineLogo,
  mode = 'preview',
}) => {
  const trimmedLogo = String(logoUrl || '').trim();
  const isCustomUploadedLogo = inlineLogo
    ? inlineLogo.isCustom
    : Boolean(trimmedLogo && trimmedLogo !== DEFAULT_VERTICAL_SVG);
  const customLogoSrc = inlineLogo?.isCustom ? inlineLogo.dataUrl : trimmedLogo;
  const defaultEmblemSrc =
    inlineLogo && !inlineLogo.isCustom ? inlineLogo.dataUrl : DEFAULT_EMBLEM_PNG;

  const cleanCompany = String(companyName || '').trim();
  const cleanAddress = String(companyAddress || '').trim();

  // Adaptive font sizing so Pimpinan/Manajemen + company name + optional address stay cleanly inside 84mm x 40mm box
  const companyFontSize = includeAddress
    ? cleanCompany.length > 60
      ? '8.8pt'
      : cleanCompany.length > 38
      ? '9.6pt'
      : '10.5pt'
    : cleanCompany.length > 72
    ? '9.5pt'
    : cleanCompany.length > 52
    ? '10.5pt'
    : cleanCompany.length > 32
    ? '11pt'
    : '11.5pt';

  const addressFontSize = cleanAddress.length > 140 ? '7.2pt' : cleanAddress.length > 95 ? '7.8pt' : '8.2pt';

  const isPrint = mode === 'print';
  const isCapture = mode === 'capture';

  return (
    <div
      className={
        isPrint
          ? 'nd-prospect-envelope-page'
          : isCapture
          ? 'nd-prospect-envelope-capture-page'
          : undefined
      }
      style={{
        position: 'relative',
        width: isPrint ? `${ENVELOPE_WIDTH_MM}mm` : `${ENVELOPE_WIDTH_PX}px`,
        height: isPrint ? `${ENVELOPE_HEIGHT_MM}mm` : `${ENVELOPE_HEIGHT_PX}px`,
        backgroundColor: '#FFFFFF',
        color: '#1F4E79',
        fontFamily: 'Arial, Helvetica, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxShadow: mode === 'preview' ? '0 10px 30px rgba(9, 33, 71, 0.18)' : 'none',
      }}
    >
      {/* TOP-LEFT LOGO (matches AMPLOP_ND_PRINT PDF: left 9mm, top 8.8mm, width 34.1mm, height 23.8mm) */}
      {isCustomUploadedLogo ? (
        <div
          style={{
            position: 'absolute',
            top: '8.8mm',
            left: '9mm',
            width: '44mm',
            height: '24mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          <img
            src={customLogoSrc}
            alt="Logo Perusahaan"
            style={{
              maxWidth: '44mm',
              maxHeight: '24mm',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: '8.8mm',
            left: '9mm',
            width: '34.1mm',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '23.9mm',
              height: '14.5mm',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            <img
              src={defaultEmblemSrc}
              alt="ND TAX AND LAW"
              style={{
                width: '23.9mm',
                height: '23.9mm',
                marginTop: '-4.65mm',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <div
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '13.4pt',
              fontWeight: 500,
              letterSpacing: '0.25px',
              color: '#D2AA6A',
              lineHeight: 1,
              marginTop: '2.35mm',
              whiteSpace: 'nowrap',
            }}
          >
            TAX AND LAW
          </div>
          <div
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '5pt',
              fontWeight: 400,
              letterSpacing: '0.35px',
              color: '#D2AA6A',
              lineHeight: 1,
              marginTop: '1.9mm',
              whiteSpace: 'nowrap',
            }}
          >
            NURTIYAS &amp; DARMAWAN
          </div>
        </div>
      )}

      {/* TOP-RIGHT TAGLINE & WEBSITE (matches AMPLOP_ND_PRINT PDF: top 9.1mm, right 11mm, 10.1pt, tight 1.15 leading) */}
      <div
        style={{
          position: 'absolute',
          top: '9.1mm',
          right: '11mm',
          textAlign: 'right',
          fontFamily: 'Arial, Helvetica, sans-serif',
          lineHeight: 1.15,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '10.1pt', fontStyle: 'italic', color: '#BD9861' }}>
          Your Trusted Partner in
        </div>
        <div style={{ fontSize: '10.1pt', fontStyle: 'italic', color: '#BD9861' }}>
          Tax &amp; Legal Solutions
        </div>
        <div style={{ fontSize: '10.1pt', fontStyle: 'normal', color: '#1F4E79' }}>
          www.ndtaxandlaw.com
        </div>
      </div>

      {/* BOTTOM-LEFT ROUNDED RECIPIENT BOX (matches AMPLOP_ND_PRINT PDF: left 9mm, bottom 11.35mm, 84mm x 40mm, r=6.65mm, 1pt #1F4E79) */}
      <div
        style={{
          position: 'absolute',
          bottom: '11.35mm',
          left: '9mm',
          width: '84mm',
          height: '40mm',
          border: '1pt solid #1F4E79',
          borderRadius: '6.65mm',
          backgroundColor: '#FFFFFF',
          padding: '4.6mm 4.7mm 3.8mm 4.7mm',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}
      >
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            fontWeight: 700,
            color: '#1F4E79',
            letterSpacing: '0.1px',
            lineHeight: 1.15,
            marginBottom: '1.3mm',
          }}
        >
          KEPADA YTH:
        </div>
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: companyFontSize,
            fontWeight: 700,
            color: '#1F4E79',
            lineHeight: 1.24,
            marginBottom: '0.5mm',
          }}
        >
          Pimpinan/Manajemen
        </div>
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: companyFontSize,
            fontWeight: 700,
            color: '#1F4E79',
            lineHeight: 1.24,
            wordBreak: 'break-word',
          }}
        >
          {cleanCompany}
        </div>
        {includeAddress && cleanAddress && (
          <div
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: addressFontSize,
              fontWeight: 400,
              color: '#1F4E79',
              lineHeight: 1.25,
              marginTop: '1.2mm',
              wordBreak: 'break-word',
            }}
          >
            {cleanAddress}
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT OFFICE ADDRESS BLOCK (matches AMPLOP_ND_PRINT PDF: bottom 14mm, right 11mm, 12pt gold heading + 10.1pt #1F4E79 lines) */}
      <div
        style={{
          position: 'absolute',
          bottom: '14mm',
          right: '11mm',
          textAlign: 'right',
          fontFamily: 'Arial, Helvetica, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '12pt',
            fontWeight: 700,
            color: '#D2A969',
            lineHeight: 1.15,
            marginBottom: '0.35mm',
          }}
        >
          ND TAX AND LAW
        </div>
        <div style={{ fontSize: '10.1pt', color: '#1F4E79', lineHeight: 1.15 }}>
          Menara 165 Lantai 4, Jakarta Selatan
        </div>
        <div style={{ fontSize: '10.1pt', color: '#1F4E79', lineHeight: 1.15 }}>
          Grand Prima Bintara, Bekasi Barat
        </div>
        <div style={{ fontSize: '10.1pt', color: '#1F4E79', lineHeight: 1.15 }}>
          Jl. Sawo Raya, Jati Agung, Lampung
        </div>
        <div style={{ fontSize: '10.1pt', color: '#1F4E79', lineHeight: 1.15 }}>
          Telp: 021-86941220 | 0821-8074-4977
        </div>
      </div>
    </div>
  );
};

async function waitForEnvelopeImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            if (typeof img.decode === 'function') {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          window.setTimeout(done, 1500);
        })
    )
  );
}

async function renderEnvelopeNodeToPngDataUrl(node: HTMLElement, scale = 3.5): Promise<string> {
  const scaledW = Math.round(ENVELOPE_WIDTH_PX * scale);
  const scaledH = Math.round(ENVELOPE_HEIGHT_PX * scale);
  const serialized = new XMLSerializer().serializeToString(node);
  const svgXml = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scaledW}" height="${scaledH}" viewBox="0 0 ${scaledW} ${scaledH}">`,
    `<foreignObject x="0" y="0" width="${scaledW}" height="${scaledH}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${scaledW}px;height:${scaledH}px;overflow:hidden;position:relative;margin:0;padding:0;background:#ffffff;">`,
    `<div style="width:${ENVELOPE_WIDTH_PX}px;height:${ENVELOPE_HEIGHT_PX}px;transform:scale(${scale});transform-origin:top left;margin:0;padding:0;background:#ffffff;color:#1F4E79;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;">`,
    `<style>*,*::before,*::after{box-sizing:border-box;}img{display:block;max-width:none;}</style>`,
    serialized,
    `</div>`,
    `</div>`,
    `</foreignObject>`,
    `</svg>`,
  ].join('');

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.width = scaledW;
    image.height = scaledH;
    image.decoding = 'async';
    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(() => resolve(image)).catch(() => resolve(image));
      } else {
        resolve(image);
      }
    };
    image.onerror = () => reject(new Error('Envelope SVG foreignObject failed to render'));
    image.src = svgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = scaledW;
  canvas.height = scaledH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, scaledW, scaledH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, scaledW, scaledH);

  return canvas.toDataURL('image/png');
}

async function generateEnvelopePdfVectorFallback(
  letter: ProspectLetter,
  includeAddress: boolean,
  adminLogoUrl?: string
): Promise<void> {
  const inlineLogo = await resolveInlineProspectLogo(adminLogoUrl);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [ENVELOPE_WIDTH_MM, ENVELOPE_HEIGHT_MM],
    compress: true,
  });

  const rightX = ENVELOPE_WIDTH_MM - 11;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, ENVELOPE_WIDTH_MM, ENVELOPE_HEIGHT_MM, 'F');

  // Top-left logo (matches AMPLOP_ND_PRINT PDF: left 9mm, top 8.8mm, width 34.1mm)
  if (inlineLogo.isCustom && inlineLogo.dataUrl.startsWith('data:image/')) {
    doc.addImage(inlineLogo.dataUrl, 'PNG', 9, 8.8, 36, 22, undefined, 'FAST');
  } else {
    const logoCenterX = 9 + 34.1 / 2;
    if (inlineLogo.dataUrl.startsWith('data:image/')) {
      doc.addImage(inlineLogo.dataUrl, 'PNG', logoCenterX - 11.95, 4.15, 23.9, 23.9, undefined, 'FAST');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13.4);
    doc.setTextColor(210, 170, 106);
    doc.text('TAX AND LAW', logoCenterX, 29.2, { align: 'center' });
    doc.setFontSize(5);
    doc.text('NURTIYAS & DARMAWAN', logoCenterX, 32.4, { align: 'center' });
  }

  // Top-right tagline & website (matches AMPLOP_ND_PRINT PDF: right 11mm, 10.1pt, 4.06mm line step)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.1);
  doc.setTextColor(189, 152, 97);
  doc.text('Your Trusted Partner in', rightX, 12.45, { align: 'right' });
  doc.text('Tax & Legal Solutions', rightX, 16.51, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.1);
  doc.setTextColor(31, 78, 121);
  doc.text('www.ndtaxandlaw.com', rightX, 20.57, { align: 'right' });

  // Bottom-left rounded recipient box (84mm x 40mm at left 9mm, bottom 11.35mm -> top 58.65mm, r=6.65mm, 1pt stroke)
  const boxX = 9;
  const boxY = ENVELOPE_HEIGHT_MM - 11.35 - 40;
  const boxW = 84;
  const boxH = 40;
  doc.setDrawColor(31, 78, 121);
  doc.setLineWidth(0.353);
  doc.roundedRect(boxX, boxY, boxW, boxH, 6.65, 6.65, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 78, 121);
  doc.text('KEPADA YTH:', boxX + 4.7, boxY + 8.2);

  const companyName = String(letter.companyName || '').trim();
  const companySize = includeAddress
    ? companyName.length > 52
      ? 9.2
      : companyName.length > 32
      ? 9.8
      : 10.5
    : companyName.length > 52
    ? 10
    : companyName.length > 32
    ? 10.8
    : 11.5;
  doc.setFontSize(companySize);
  doc.text('Pimpinan/Manajemen', boxX + 4.7, boxY + 13.3);
  const companyStartY = boxY + 13.3 + companySize * 0.44 + 0.6;
  const companyLines: string[] = doc.splitTextToSize(companyName, boxW - 9.4);
  doc.text(companyLines, boxX + 4.7, companyStartY);

  if (includeAddress && letter.companyAddress) {
    const afterCompanyY = companyStartY + companyLines.length * (companySize * 0.44) + 1.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const addrLines: string[] = doc.splitTextToSize(letter.companyAddress, boxW - 9.4);
    doc.text(addrLines.slice(0, 4), boxX + 4.7, afterCompanyY);
  }

  // Bottom-right address block (matches AMPLOP_ND_PRINT PDF: right 11mm, 12pt gold heading + 10.1pt #1F4E79 lines)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(210, 169, 105);
  doc.text('ND TAX AND LAW', rightX, 78.6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.1);
  doc.setTextColor(31, 78, 121);
  doc.text('Menara 165 Lantai 4, Jakarta Selatan', rightX, 82.8, { align: 'right' });
  doc.text('Grand Prima Bintara, Bekasi Barat', rightX, 86.86, { align: 'right' });
  doc.text('Jl. Sawo Raya, Jati Agung, Lampung', rightX, 90.92, { align: 'right' });
  doc.text('Telp: 021-86941220 | 0821-8074-4977', rightX, 94.98, { align: 'right' });

  const safeSlug = companyName
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  triggerPdfBlobDownload(doc, `Amplop_ND_Tax_and_Law_${safeSlug || 'Prospek'}.pdf`);
}

export async function downloadProspectEnvelopePdf(
  letter: ProspectLetter,
  includeAddress: boolean,
  adminLogoUrl?: string
): Promise<void> {
  if (typeof document === 'undefined') {
    await generateEnvelopePdfVectorFallback(letter, includeAddress, adminLogoUrl);
    return;
  }

  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  try {
    const inlineLogo = await resolveInlineProspectLogo(adminLogoUrl);

    container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '-12000px';
    container.style.top = '0';
    container.style.width = `${ENVELOPE_WIDTH_PX}px`;
    container.style.height = `${ENVELOPE_HEIGHT_PX}px`;
    container.style.backgroundColor = '#FFFFFF';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(
      <ProspectEnvelopeSheet
        companyName={letter.companyName}
        companyAddress={letter.companyAddress}
        includeAddress={includeAddress}
        logoUrl={adminLogoUrl}
        inlineLogo={inlineLogo}
        mode="capture"
      />
    );

    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await waitForEnvelopeImages(container);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const sheetNode = container.querySelector<HTMLElement>('.nd-prospect-envelope-capture-page');
    if (!sheetNode) {
      throw new Error('Envelope capture node not found');
    }

    let pngDataUrl: string;
    try {
      pngDataUrl = await renderEnvelopeNodeToPngDataUrl(sheetNode, 3.5);
    } catch {
      pngDataUrl = await renderEnvelopeNodeToPngDataUrl(sheetNode, 2.5);
    }
    if (!pngDataUrl.startsWith('data:image/png;base64,') || pngDataUrl.length < 3000) {
      throw new Error('Captured envelope image appears empty');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [ENVELOPE_WIDTH_MM, ENVELOPE_HEIGHT_MM],
      compress: true,
    });
    doc.addImage(pngDataUrl, 'PNG', 0, 0, ENVELOPE_WIDTH_MM, ENVELOPE_HEIGHT_MM, undefined, 'FAST');

    const safeSlug = letter.companyName
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
    triggerPdfBlobDownload(doc, `Amplop_ND_Tax_and_Law_${safeSlug || 'Prospek'}.pdf`);
  } catch (err) {
    console.warn('[Prospect Envelope PDF Capture Fallback]', err);
    await generateEnvelopePdfVectorFallback(letter, includeAddress, adminLogoUrl);
  } finally {
    if (root) {
      try {
        root.unmount();
      } catch {
        // Ignore unmount error
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

interface ProspectEnvelopeModalProps {
  letter: ProspectLetter | null;
  logoUrl?: string;
  onClose: () => void;
}

export const ProspectEnvelopeModal: React.FC<ProspectEnvelopeModalProps> = ({
  letter,
  logoUrl,
  onClose,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Reset address toggle when opening a different letter (default: company name only under KEPADA YTH:)
  useEffect(() => {
    setIncludeAddress(false);
  }, [letter?.id]);

  // Responsive scale so 220mm x 110mm envelope fits cleanly on desktop & mobile viewports
  useEffect(() => {
    if (!letter) return;
    const recalc = () => {
      const el = stageRef.current;
      if (!el) return;
      const availW = Math.max(260, el.clientWidth - 24);
      setScale(Math.min(1, availW / ENVELOPE_WIDTH_PX));
    };
    recalc();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalc) : null;
    if (ro && stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', recalc);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [letter]);

  // Cleanup print mode if modal unmounts unexpectedly
  useEffect(() => {
    return () => {
      document.body.classList.remove('nd-printing-prospect-envelope');
      const dynamicStyle = document.getElementById('nd-envelope-dynamic-page-style');
      if (dynamicStyle && dynamicStyle.parentNode) {
        dynamicStyle.parentNode.removeChild(dynamicStyle);
      }
    };
  }, []);

  if (!letter) return null;

  const handleDirectPrint = () => {
    setIsPrinting(true);

    // Ensure browser print dialog automatically picks exact 230mm x 110mm (11cm x 23cm) paper size
    let styleEl = document.getElementById('nd-envelope-dynamic-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'nd-envelope-dynamic-page-style';
      styleEl.textContent = '@page { size: 230mm 110mm; margin: 0; }';
      document.head.appendChild(styleEl);
    }

    document.body.classList.add('nd-printing-prospect-envelope');

    const cleanup = () => {
      document.body.classList.remove('nd-printing-prospect-envelope');
      const existing = document.getElementById('nd-envelope-dynamic-page-style');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    window.setTimeout(() => {
      window.print();
      // Fallback cleanup in case afterprint does not fire in an embedded iframe
      window.setTimeout(cleanup, 1500);
    }, 120);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadProspectEnvelopePdf(letter, includeAddress, logoUrl);
    } catch (err) {
      console.error('Envelope PDF download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold truncate">
                  Cetak Amplop — {letter.companyName}
                </h3>
                <p className="text-[11px] text-amber-200/90 font-mono">
                  Ukuran 11 cm × 23 cm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Tutup Cetak Amplop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Canvas */}
          <div
            ref={stageRef}
            className="flex-1 overflow-auto bg-slate-200/80 p-3 sm:p-6 flex items-center justify-center"
          >
            <div
              style={{
                width: `${Math.round(ENVELOPE_WIDTH_PX * scale)}px`,
                height: `${Math.round(ENVELOPE_HEIGHT_PX * scale)}px`,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: `${ENVELOPE_WIDTH_PX}px`,
                  height: `${ENVELOPE_HEIGHT_PX}px`,
                }}
              >
                <ProspectEnvelopeSheet
                  companyName={letter.companyName}
                  companyAddress={letter.companyAddress}
                  includeAddress={includeAddress}
                  logoUrl={logoUrl}
                  mode="preview"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAddress}
                onChange={(e) => setIncludeAddress(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#092147] focus:ring-blue-600 cursor-pointer"
              />
              <span>Sertakan alamat di bawah nama perusahaan</span>
            </label>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-3.5 py-2 text-xs font-bold text-[#092147] bg-white hover:bg-slate-100 border border-slate-300 rounded-xl inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isDownloading ? 'Menyiapkan...' : 'Unduh PDF (11×23 cm)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={isPrinting}
                className="px-4 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Amplop</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top-level body portal for exact 230mm x 110mm native browser printing */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="nd-prospect-envelope-print-root">
            <ProspectEnvelopeSheet
              companyName={letter.companyName}
              companyAddress={letter.companyAddress}
              includeAddress={includeAddress}
              logoUrl={logoUrl}
              mode="print"
            />
          </div>,
          document.body
        )}
    </>
  );
};
