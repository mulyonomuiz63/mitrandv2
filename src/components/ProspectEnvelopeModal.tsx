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

  // Adaptive font sizing so long company names stay cleanly inside the 84.5mm x 40.5mm rounded box
  const companyFontSize = includeAddress
    ? cleanCompany.length > 60
      ? '9pt'
      : cleanCompany.length > 38
      ? '10pt'
      : '11pt'
    : cleanCompany.length > 72
    ? '9.5pt'
    : cleanCompany.length > 52
    ? '10.5pt'
    : cleanCompany.length > 32
    ? '11.5pt'
    : '12.5pt';

  const addressFontSize = cleanAddress.length > 140 ? '7.5pt' : cleanAddress.length > 95 ? '8pt' : '8.5pt';

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
        color: '#0A4B78',
        fontFamily: 'Arial, Helvetica, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxShadow: mode === 'preview' ? '0 10px 30px rgba(9, 33, 71, 0.18)' : 'none',
      }}
    >
      {/* TOP-LEFT LOGO (follows Admin's uploaded logo or default ND Tax and Law emblem) */}
      {isCustomUploadedLogo ? (
        <div
          style={{
            position: 'absolute',
            top: '7.5mm',
            left: '5mm',
            width: '46mm',
            height: '26mm',
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
              maxWidth: '46mm',
              maxHeight: '26mm',
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
            top: '7.5mm',
            left: '4.5mm',
            width: '36mm',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <img
            src={defaultEmblemSrc}
            alt="ND TAX AND LAW"
            style={{
              width: '18.5mm',
              height: '16.5mm',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block',
            }}
          />
          <div
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '11.2pt',
              fontWeight: 700,
              letterSpacing: '0.35px',
              color: '#D5A76B',
              lineHeight: 1.12,
              marginTop: '1mm',
            }}
          >
            TAX AND LAW
          </div>
          <div
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '5.4pt',
              fontWeight: 500,
              letterSpacing: '0.5px',
              color: '#D5A76B',
              lineHeight: 1.15,
              marginTop: '0.4mm',
            }}
          >
            NURTIYAS &amp; DARMAWAN
          </div>
        </div>
      )}

      {/* TOP-RIGHT TAGLINE & WEBSITE */}
      <div
        style={{
          position: 'absolute',
          top: '9mm',
          right: '6mm',
          textAlign: 'right',
          fontFamily: 'Arial, Helvetica, sans-serif',
          lineHeight: 1.32,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '10.2pt', fontStyle: 'italic', color: '#C89B58' }}>
          Your Trusted Partner in
        </div>
        <div style={{ fontSize: '10.2pt', fontStyle: 'italic', color: '#C89B58' }}>
          Tax &amp; Legal Solutions
        </div>
        <div style={{ fontSize: '10pt', fontStyle: 'normal', color: '#0A4B78', marginTop: '0.3mm' }}>
          www.ndtaxandlaw.com
        </div>
      </div>

      {/* BOTTOM-LEFT ROUNDED RECIPIENT BOX */}
      <div
        style={{
          position: 'absolute',
          bottom: '11.5mm',
          left: '4.5mm',
          width: '84.5mm',
          height: '40.5mm',
          border: '1.5px solid #0A4B78',
          borderRadius: '7.5mm',
          backgroundColor: '#FFFFFF',
          padding: '4.8mm 5.2mm',
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
            fontSize: '10.2pt',
            fontWeight: 700,
            color: '#0A4B78',
            letterSpacing: '0.2px',
            lineHeight: 1.2,
            marginBottom: '2.2mm',
          }}
        >
          KEPADA YTH:
        </div>
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: companyFontSize,
            fontWeight: 700,
            color: '#0A4B78',
            lineHeight: 1.3,
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
              color: '#0A4B78',
              lineHeight: 1.3,
              marginTop: '1.5mm',
              wordBreak: 'break-word',
            }}
          >
            {cleanAddress}
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT OFFICE ADDRESS BLOCK */}
      <div
        style={{
          position: 'absolute',
          bottom: '14mm',
          right: '6mm',
          textAlign: 'right',
          fontFamily: 'Arial, Helvetica, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '11.5pt',
            fontWeight: 700,
            color: '#D4A15E',
            lineHeight: 1.25,
            marginBottom: '0.6mm',
          }}
        >
          ND TAX AND LAW
        </div>
        <div style={{ fontSize: '9.8pt', color: '#0A4B78', lineHeight: 1.36 }}>
          Menara 165 Lantai 4, Jakarta Selatan
        </div>
        <div style={{ fontSize: '9.8pt', color: '#0A4B78', lineHeight: 1.36 }}>
          Grand Prima Bintara, Bekasi Barat
        </div>
        <div style={{ fontSize: '9.8pt', color: '#0A4B78', lineHeight: 1.36 }}>
          Jl. Sawo Raya, Jati Agung, Lampung
        </div>
        <div style={{ fontSize: '9.8pt', color: '#0A4B78', lineHeight: 1.36 }}>
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
    `<div style="width:${ENVELOPE_WIDTH_PX}px;height:${ENVELOPE_HEIGHT_PX}px;transform:scale(${scale});transform-origin:top left;margin:0;padding:0;background:#ffffff;color:#0A4B78;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;">`,
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

  const rightX = ENVELOPE_WIDTH_MM - 6;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, ENVELOPE_WIDTH_MM, ENVELOPE_HEIGHT_MM, 'F');

  // Top-left logo
  if (inlineLogo.isCustom && inlineLogo.dataUrl.startsWith('data:image/')) {
    doc.addImage(inlineLogo.dataUrl, 'PNG', 5, 7.5, 36, 22, undefined, 'FAST');
  } else {
    if (inlineLogo.dataUrl.startsWith('data:image/')) {
      doc.addImage(inlineLogo.dataUrl, 'PNG', 13.5, 7.5, 18, 16.5, undefined, 'FAST');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(213, 167, 107);
    doc.text('TAX AND LAW', 22.5, 27.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('NURTIYAS & DARMAWAN', 22.5, 30.2, { align: 'center' });
  }

  // Top-right tagline & website
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.2);
  doc.setTextColor(200, 155, 88);
  doc.text('Your Trusted Partner in', rightX, 13, { align: 'right' });
  doc.text('Tax & Legal Solutions', rightX, 17.8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(10, 75, 120);
  doc.text('www.ndtaxandlaw.com', rightX, 22.8, { align: 'right' });

  // Bottom-left rounded recipient box (84.5mm x 40.5mm at left 4.5mm, bottom 11.5mm -> top 58mm)
  const boxX = 4.5;
  const boxY = ENVELOPE_HEIGHT_MM - 11.5 - 40.5;
  const boxW = 84.5;
  const boxH = 40.5;
  doc.setDrawColor(10, 75, 120);
  doc.setLineWidth(0.45);
  doc.roundedRect(boxX, boxY, boxW, boxH, 7.5, 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(10, 75, 120);
  doc.text('KEPADA YTH:', boxX + 5.2, boxY + 8.5);

  const companyName = String(letter.companyName || '').trim();
  const companySize = companyName.length > 52 ? 10 : companyName.length > 32 ? 11 : 12;
  doc.setFontSize(companySize);
  const companyLines: string[] = doc.splitTextToSize(companyName, boxW - 10.4);
  doc.text(companyLines, boxX + 5.2, boxY + 14.5);

  if (includeAddress && letter.companyAddress) {
    const afterCompanyY = boxY + 14.5 + companyLines.length * (companySize * 0.45) + 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const addrLines: string[] = doc.splitTextToSize(letter.companyAddress, boxW - 10.4);
    doc.text(addrLines.slice(0, 4), boxX + 5.2, afterCompanyY);
  }

  // Bottom-right address block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(212, 161, 94);
  doc.text('ND TAX AND LAW', rightX, 76, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  doc.setTextColor(10, 75, 120);
  doc.text('Menara 165 Lantai 4, Jakarta Selatan', rightX, 81.2, { align: 'right' });
  doc.text('Grand Prima Bintara, Bekasi Barat', rightX, 86, { align: 'right' });
  doc.text('Jl. Sawo Raya, Jati Agung, Lampung', rightX, 90.8, { align: 'right' });
  doc.text('Telp: 021-86941220 | 0821-8074-4977', rightX, 95.6, { align: 'right' });

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
