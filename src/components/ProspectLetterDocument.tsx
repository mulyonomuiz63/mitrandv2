import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { QrCode } from 'lucide-react';
import {
  ProspectLetter,
  ProspectLetterContent,
  resolveProspectLetterContent,
} from '../types';
import {
  buildDirectorQrUrl,
  buildMitraQrUrl,
  formatIndonesianLetterDate,
  generateProspectLetterPdf,
  generateQrDataUrl,
  interpolateCompanyName,
  resolveInlineProspectLogo,
  triggerPdfBlobDownload,
} from '../utils/prospectLetterPdf';
import { renderProspectRichText } from '../utils/prospectRichText';

export const A4_WIDTH_PX = 794; // 210mm at 96dpi
export const A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';

interface LetterHeaderProps {
  logoUrl?: string;
  inlineLogo?: { isCustom: boolean; dataUrl: string } | null;
}

const LetterHeader: React.FC<LetterHeaderProps> = ({ logoUrl, inlineLogo }) => {
  const trimmed = String(logoUrl || '').trim();
  const isCustomUploadedLogo = inlineLogo
    ? inlineLogo.isCustom
    : Boolean(trimmed && trimmed !== DEFAULT_VERTICAL_SVG);
  const customLogoSrc = inlineLogo?.isCustom ? inlineLogo.dataUrl : trimmed;
  const defaultEmblemSrc = inlineLogo && !inlineLogo.isCustom ? inlineLogo.dataUrl : DEFAULT_EMBLEM_PNG;

  if (isCustomUploadedLogo) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '7.5mm',
          left: '30mm',
          height: '25mm',
          maxWidth: '58mm',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          src={customLogoSrc}
          alt="Logo Resmi Perusahaan"
          style={{
            maxHeight: '25mm',
            maxWidth: '58mm',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '7mm',
        left: '26mm',
        width: '34mm',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <img
        src={defaultEmblemSrc}
        alt="ND TAX AND LAW"
        style={{ width: '17.5mm', height: '17.5mm', objectFit: 'contain', margin: '0 auto', display: 'block' }}
      />
      <div
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10pt',
          fontWeight: 700,
          letterSpacing: '0.4px',
          color: '#B5945E',
          lineHeight: 1.15,
          marginTop: '1mm',
        }}
      >
        TAX AND LAW
      </div>
      <div
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '5pt',
          fontWeight: 600,
          letterSpacing: '0.6px',
          color: '#9C8258',
          lineHeight: 1.1,
          marginTop: '0.4mm',
        }}
      >
        NURTIYAS &amp; DARMAWAN
      </div>
    </div>
  );
};

const LetterFooter: React.FC<{ content: ProspectLetterContent }> = ({ content }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '33mm',
      backgroundColor: '#F4F4F4',
      padding: '5.5mm 22mm 4mm 22mm',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '8.4pt',
      lineHeight: 1.38,
      color: '#1A1A1A',
      boxSizing: 'border-box',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    }}
  >
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontWeight: 700, color: '#111111' }}>{renderProspectRichText(content.footerLeftTitle)}</div>
      {content.footerLeftLines.slice(0, 5).map((line, i) => (
        <div key={i}>{renderProspectRichText(line)}</div>
      ))}
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, color: '#BA984A' }}>{renderProspectRichText(content.footerRightTitle)}</div>
      {content.footerRightLines.slice(0, 5).map((line, i) => (
        <div key={i}>{renderProspectRichText(line)}</div>
      ))}
    </div>
  </div>
);

const A4PageFrame: React.FC<{
  children: React.ReactNode;
  mode: 'preview' | 'print' | 'capture';
}> = ({ children, mode }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (mode !== 'preview') return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      if (w > 0) {
        setScale(Math.min(1, w / A4_WIDTH_PX));
      }
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    window.addEventListener('resize', update);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [mode]);

  if (mode === 'print') {
    return (
      <div
        className="nd-prospect-a4-page"
        style={{
          width: '210mm',
          height: '297mm',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11pt',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {children}
      </div>
    );
  }

  if (mode === 'capture') {
    return (
      <div
        className="nd-prospect-a4-capture-page"
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          backgroundColor: '#FFFFFF',
          color: '#000000',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11pt',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="w-full max-w-[794px] mx-auto relative flex justify-center"
      style={{ height: `${Math.round(A4_HEIGHT_PX * scale)}px` }}
    >
      <div
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.25)',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11pt',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export interface ProspectLetterDocumentProps {
  letter: ProspectLetter;
  logoUrl?: string;
  inlineLogo?: { isCustom: boolean; dataUrl: string } | null;
  masterTemplate?: Partial<ProspectLetterContent> | null;
  directorQr: string;
  mitraQr: string;
  mode: 'preview' | 'print' | 'capture';
  onLayoutReady?: () => void;
}

export const ProspectLetterDocument: React.FC<ProspectLetterDocumentProps> = ({
  letter,
  logoUrl,
  inlineLogo,
  masterTemplate,
  directorQr,
  mitraQr,
  mode,
  onLayoutReady,
}) => {
  const [p1CompactLevel, setP1CompactLevel] = useState(0);
  const [p2CompactLevel, setP2CompactLevel] = useState(0);
  const [p3CompactLevel, setP3CompactLevel] = useState(0);
  const [p4CompactLevel, setP4CompactLevel] = useState(0);
  const page1ContentRef = useRef<HTMLDivElement | null>(null);
  const page2ContentRef = useRef<HTMLDivElement | null>(null);
  const page3ContentRef = useRef<HTMLDivElement | null>(null);
  const page4ContentRef = useRef<HTMLDivElement | null>(null);
  const readyFiredRef = useRef(false);

  useEffect(() => {
    setP1CompactLevel(0);
    setP2CompactLevel(0);
    setP3CompactLevel(0);
    setP4CompactLevel(0);
    readyFiredRef.current = false;
  }, [letter, masterTemplate]);

  useLayoutEffect(() => {
    if (mode === 'print') return;
    let adjusted = false;

    const el1 = page1ContentRef.current;
    if (el1 && el1.scrollHeight > el1.clientHeight + 1 && p1CompactLevel < 6) {
      setP1CompactLevel((prev) => Math.min(6, prev + 1));
      adjusted = true;
    }

    const el2 = page2ContentRef.current;
    if (el2 && el2.scrollHeight > el2.clientHeight + 1 && p2CompactLevel < 6) {
      setP2CompactLevel((prev) => Math.min(6, prev + 1));
      adjusted = true;
    }

    const el3 = page3ContentRef.current;
    if (el3 && el3.scrollHeight > el3.clientHeight + 1 && p3CompactLevel < 6) {
      setP3CompactLevel((prev) => Math.min(6, prev + 1));
      adjusted = true;
    }

    const el4 = page4ContentRef.current;
    if (el4 && el4.scrollHeight > el4.clientHeight + 1 && p4CompactLevel < 4) {
      setP4CompactLevel((prev) => Math.min(4, prev + 1));
      adjusted = true;
    }

    if (!adjusted && onLayoutReady && !readyFiredRef.current) {
      readyFiredRef.current = true;
      onLayoutReady();
    }
  }, [mode, letter, masterTemplate, p1CompactLevel, p2CompactLevel, p3CompactLevel, p4CompactLevel, onLayoutReady]);

  // Global content exclusively — applies uniformly to all Mitra
  const content = resolveProspectLetterContent(undefined, masterTemplate);
  const formattedDate = formatIndonesianLetterDate(letter.letterDate || letter.createdAt);

  // Page 1 metrics (exact Arial 11pt Word single spacing ~1.16, auto-compacts only if long company/address)
  const p1LH = [1.16, 1.13, 1.1, 1.07, 1.04, 1.02, 1.0][p1CompactLevel] || 1.16;
  const p1GapMm = [3.4, 2.7, 2.1, 1.6, 1.2, 0.9, 0.7][p1CompactLevel] || 3.4;
  const p1ItemGapMm = [2.0, 1.6, 1.3, 1.0, 0.8, 0.6, 0.5][p1CompactLevel] || 2.0;
  const p1BodyFont = p1CompactLevel >= 6 ? '9.8pt' : p1CompactLevel >= 5 ? '10.2pt' : p1CompactLevel >= 4 ? '10.5pt' : '11pt';
  const p1RecipFont = p1CompactLevel >= 3 ? '10pt' : p1CompactLevel >= 2 ? '10.5pt' : '11pt';

  // Page 2 metrics (exact Arial 11pt Word single spacing 1.15 — all of II & III fit comfortably on Page 2!)
  const p2LH = [1.15, 1.12, 1.09, 1.06, 1.03, 1.01, 0.99][p2CompactLevel] || 1.15;
  const p2ItemGapMm = [1.8, 1.4, 1.1, 0.8, 0.6, 0.45, 0.35][p2CompactLevel] || 1.8;
  const p2SectionGapMm = [4.6, 3.6, 2.8, 2.2, 1.7, 1.3, 1.0][p2CompactLevel] || 4.6;
  const p2BodyFont = p2CompactLevel >= 6 ? '9.6pt' : p2CompactLevel >= 5 ? '10pt' : p2CompactLevel >= 4 ? '10.4pt' : p2CompactLevel >= 3 ? '10.7pt' : '11pt';

  // Page 3 metrics (exact Arial 11pt Word single spacing 1.16 — fits all of Tentang + Layanan + Table + Closing cleanly!)
  const p3LH = [1.16, 1.13, 1.1, 1.07, 1.04, 1.02, 1.0][p3CompactLevel] || 1.16;
  const p3GapMm = [3.4, 2.8, 2.2, 1.7, 1.3, 1.0, 0.8][p3CompactLevel] || 3.4;
  const p3CellPad = p3CompactLevel >= 3 ? '1.1mm 2mm' : p3CompactLevel >= 1 ? '1.35mm 2.2mm' : '1.6mm 2.3mm';
  const p3BodyFont = p3CompactLevel >= 6 ? '9.8pt' : p3CompactLevel >= 5 ? '10.2pt' : p3CompactLevel >= 4 ? '10.5pt' : '11pt';
  const p3TableFont = p3CompactLevel >= 5 ? '9.6pt' : p3CompactLevel >= 3 ? '10pt' : '10.8pt';

  // Page 4 metrics
  const p4LH = [1.22, 1.17, 1.12, 1.08, 1.04][p4CompactLevel] || 1.22;
  const p4SigGapMm = [15, 11, 8, 6, 4][p4CompactLevel] || 15;

  const measureRef = mode !== 'print';

  return (
    <>
      {/* PAGE 1 */}
      <A4PageFrame mode={mode}>
        <LetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} />
        <div
          ref={measureRef ? page1ContentRef : undefined}
          style={{
            position: 'absolute',
            top: '40mm',
            bottom: '40mm',
            left: '30mm',
            right: '30mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: p1BodyFont,
            lineHeight: p1LH,
            color: '#000000',
            overflow: 'hidden',
          }}
        >
          <div style={{ textAlign: 'right', marginBottom: '0.6mm' }}>
            {renderProspectRichText(content.city)}, {formattedDate}
          </div>

          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: p1BodyFont,
              lineHeight: p1LH,
              marginBottom: `${p1GapMm}mm`,
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: '25mm', padding: 0, verticalAlign: 'top' }}>Nomor</td>
                <td style={{ padding: 0, verticalAlign: 'top' }}>: {letter.letterNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: 0, verticalAlign: 'top' }}>Sifat</td>
                <td style={{ padding: 0, verticalAlign: 'top' }}>: {renderProspectRichText(content.sifat)}</td>
              </tr>
              <tr>
                <td style={{ padding: 0, verticalAlign: 'top' }}>Lampiran</td>
                <td style={{ padding: 0, verticalAlign: 'top' }}>: {renderProspectRichText(content.lampiran)}</td>
              </tr>
              <tr>
                <td style={{ padding: 0, verticalAlign: 'top' }}>Perihal</td>
                <td style={{ padding: 0, verticalAlign: 'top' }}>: {renderProspectRichText(content.perihal)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginBottom: `${p1GapMm}mm` }}>
            <div>Kepada Yth</div>
            <div style={{ fontSize: p1RecipFont, wordBreak: 'break-word' }}>
              Pimpinan/Direksi {letter.companyName}
            </div>
            <div style={{ fontSize: p1RecipFont, wordBreak: 'break-word' }}>
              Alamat: {letter.companyAddress}
            </div>
          </div>

          <div style={{ marginBottom: '0.5mm' }}>{renderProspectRichText(content.greeting)}</div>
          <p style={{ margin: `0 0 ${p1GapMm}mm 0`, textAlign: 'justify' }}>
            {renderProspectRichText(interpolateCompanyName(content.introPara1, letter.companyName))}
          </p>

          <p style={{ margin: `0 0 ${p1GapMm + 1}mm 0`, textAlign: 'justify' }}>
            {renderProspectRichText(interpolateCompanyName(content.introPara2, letter.companyName))}
          </p>

          <div style={{ fontWeight: 700, marginBottom: `${Math.max(1.6, p1GapMm * 0.85)}mm` }}>
            {renderProspectRichText(content.sectionMainTitle)}
          </div>

          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.6mm' }}>
            <span style={{ width: '6.5mm', flexShrink: 0 }}>I.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.section1Title)}</span>
          </div>

          {content.section1Items.map((item, idx) => (
            <div
              key={idx}
              style={{
                paddingLeft: '6.5mm',
                marginBottom:
                  idx === content.section1Items.length - 1
                    ? `${Math.max(1.8, p1ItemGapMm + 0.4)}mm`
                    : `${p1ItemGapMm}mm`,
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
                <div style={{ flex: 1 }}>{renderProspectRichText(item.title)}</div>
              </div>
              {item.bullets.map((bullet, bIdx) => (
                <div key={bIdx} style={{ display: 'flex', textAlign: 'justify' }}>
                  <span style={{ width: '6mm', flexShrink: 0 }}>-</span>
                  <div style={{ flex: 1 }}>{renderProspectRichText(bullet)}</div>
                </div>
              ))}
            </div>
          ))}

          <div
            style={{
              marginLeft: '6.5mm',
              backgroundColor: '#F4F4F4',
              border: '1px solid #000000',
              padding: '1.5mm 2.5mm',
              textAlign: 'justify',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {renderProspectRichText(content.section1Sanction)}
          </div>
        </div>
        <LetterFooter content={content} />
      </A4PageFrame>

      {/* PAGE 2 */}
      <A4PageFrame mode={mode}>
        <LetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} />
        <div
          ref={measureRef ? page2ContentRef : undefined}
          style={{
            position: 'absolute',
            top: '40mm',
            bottom: '40mm',
            left: '30mm',
            right: '30mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: p2BodyFont,
            lineHeight: p2LH,
            color: '#000000',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm' }}>
            <span style={{ width: '6.5mm', flexShrink: 0 }}>II.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.section2Title)}</span>
          </div>

          {content.section2Items.map((item, idx) => (
            <div
              key={idx}
              style={{
                paddingLeft: '6.5mm',
                marginBottom:
                  idx === content.section2Items.length - 1
                    ? `${Math.max(1.5, p2ItemGapMm + 0.4)}mm`
                    : `${p2ItemGapMm}mm`,
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
                <div style={{ flex: 1 }}>{renderProspectRichText(item.title)}</div>
              </div>
              {item.bullets.map((bullet, bIdx) => (
                <div key={bIdx} style={{ display: 'flex', textAlign: 'justify' }}>
                  <span style={{ width: '6mm', flexShrink: 0 }}>-</span>
                  <div style={{ flex: 1 }}>{renderProspectRichText(bullet)}</div>
                </div>
              ))}
            </div>
          ))}

          <div
            style={{
              marginLeft: '6.5mm',
              backgroundColor: '#F4F4F4',
              border: '1px solid #000000',
              padding: '1.4mm 2.5mm',
              textAlign: 'justify',
              marginBottom: `${p2SectionGapMm}mm`,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {renderProspectRichText(content.section2Sanction)}
          </div>

          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm' }}>
            <span style={{ width: '6.5mm', flexShrink: 0 }}>III.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.section3Title)}</span>
          </div>

          {content.section3Items.map((item, idx) => (
            <div
              key={idx}
              style={{
                paddingLeft: '6.5mm',
                marginBottom:
                  idx === content.section3Items.length - 1
                    ? `${Math.max(1.5, p2ItemGapMm + 0.4)}mm`
                    : `${p2ItemGapMm}mm`,
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
                <div style={{ flex: 1 }}>{renderProspectRichText(item.title)}</div>
              </div>
              {item.bullets.map((bullet, bIdx) => (
                <div key={bIdx} style={{ display: 'flex', textAlign: 'justify' }}>
                  <span style={{ width: '6mm', flexShrink: 0 }}>-</span>
                  <div style={{ flex: 1 }}>{renderProspectRichText(bullet)}</div>
                </div>
              ))}
            </div>
          ))}

          <div
            style={{
              marginLeft: '6.5mm',
              backgroundColor: '#F4F4F4',
              border: '1px solid #000000',
              padding: '1.4mm 2.5mm',
              textAlign: 'justify',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {renderProspectRichText(content.section3Sanction)}
          </div>
        </div>
        <LetterFooter content={content} />
      </A4PageFrame>

      {/* PAGE 3 */}
      <A4PageFrame mode={mode}>
        <LetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} />
        <div
          ref={measureRef ? page3ContentRef : undefined}
          style={{
            position: 'absolute',
            top: '40mm',
            bottom: '40mm',
            left: '30mm',
            right: '30mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: p3BodyFont,
            lineHeight: p3LH,
            color: '#000000',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: `${p3GapMm}mm` }}>{renderProspectRichText(content.aboutTitle)}</div>

          <p style={{ margin: `0 0 ${p3GapMm}mm 0`, textAlign: 'justify' }}>
            {renderProspectRichText(interpolateCompanyName(content.aboutPara, letter.companyName))}
          </p>

          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm' }}>
            <span style={{ width: '6.5mm', flexShrink: 0 }}>I.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.servicesTitle)}</span>
          </div>

          <div style={{ paddingLeft: '6.5mm', marginBottom: '1.2mm', textAlign: 'justify' }}>
            {renderProspectRichText(content.servicesIntro, ['999 Ribu'])}
          </div>

          <div style={{ paddingLeft: '12.5mm', marginBottom: `${Math.max(1.8, p3GapMm * 0.85)}mm` }}>
            {content.servicesItems.map((svc, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  marginBottom: idx === content.servicesItems.length - 1 ? 0 : '0.8mm',
                  textAlign: 'justify',
                }}
              >
                <span style={{ width: '5.5mm', flexShrink: 0 }}>{idx + 1}.</span>
                <div style={{ flex: 1 }}>
                  {svc.lead ? <strong>{renderProspectRichText(svc.lead)} </strong> : null}
                  {renderProspectRichText(svc.body)}
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: `0 0 ${p3GapMm + 1}mm 0`, textAlign: 'justify' }}>
            {renderProspectRichText(content.servicesCaseNote)}
          </p>

          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '1.4mm' }}>
            <span style={{ width: '6.5mm', flexShrink: 0 }}>II.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.comparisonTitle)}</span>
          </div>

          <div style={{ marginBottom: '1.2mm' }}>{renderProspectRichText(content.comparisonIntro)}</div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: p3TableFont,
              lineHeight: 1.18,
              marginBottom: `${p3GapMm}mm`,
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#DFDCCE', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <th style={{ border: '1px solid #000000', padding: p3CellPad, textAlign: 'left', width: '34%', fontWeight: 700 }}>
                  {renderProspectRichText(content.comparisonHeaders[0])}
                </th>
                <th style={{ border: '1px solid #000000', padding: p3CellPad, textAlign: 'left', width: '40%', fontWeight: 700 }}>
                  {renderProspectRichText(content.comparisonHeaders[1])}
                </th>
                <th style={{ border: '1px solid #000000', padding: p3CellPad, textAlign: 'left', width: '26%', fontWeight: 700 }}>
                  {renderProspectRichText(content.comparisonHeaders[2])}
                </th>
              </tr>
            </thead>
            <tbody>
              {content.comparisonRows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000000', padding: p3CellPad }}>
                    {renderProspectRichText(row.component)}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: p3CellPad }}>
                    {renderProspectRichText(row.internalStaff)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: p3CellPad,
                      fontWeight: idx === 0 ? 700 : 400,
                    }}
                  >
                    {renderProspectRichText(row.consultant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ margin: 0, textAlign: 'justify' }}>{renderProspectRichText(content.comparisonClosing)}</p>
        </div>
        <LetterFooter content={content} />
      </A4PageFrame>

      {/* PAGE 4 */}
      <A4PageFrame mode={mode}>
        <LetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} />
        <div
          ref={measureRef ? page4ContentRef : undefined}
          style={{
            position: 'absolute',
            top: '40mm',
            bottom: '40mm',
            left: '30mm',
            right: '30mm',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: p4LH,
            color: '#000000',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', fontWeight: 700, marginBottom: '2.4mm' }}>
            <span style={{ width: '8mm', flexShrink: 0 }}>III.</span>
            <span style={{ flex: 1 }}>{renderProspectRichText(content.consultTitle)}</span>
          </div>

          <p style={{ paddingLeft: '8mm', margin: '0 0 7.5mm 0', textAlign: 'justify' }}>
            {renderProspectRichText(interpolateCompanyName(content.consultPara, letter.companyName), [
              '082180744977',
              'business@ndtaxandlaw.com',
              'www.ndtaxandlaw.com',
            ])}
          </p>

          <div
            style={{
              marginLeft: '8mm',
              border: '1px solid #000000',
              padding: '3.8mm 4.2mm',
              marginBottom: '7mm',
            }}
          >
            <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3.2mm' }}>
              Mitra Strategis
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11pt', lineHeight: 1.3 }}>
              <tbody>
                <tr>
                  <td style={{ width: '24mm', padding: 0 }}>Nama</td>
                  <td style={{ padding: 0 }}>: {letter.mitraName}</td>
                </tr>
                <tr>
                  <td style={{ padding: 0 }}>No. ID</td>
                  <td style={{ padding: 0 }}>: {letter.mitraMemberCode}</td>
                </tr>
                <tr>
                  <td style={{ padding: 0 }}>Whatsapp</td>
                  <td style={{ padding: 0 }}>: {letter.mitraPhone}</td>
                </tr>
                <tr>
                  <td style={{ padding: 0 }}>Email</td>
                  <td style={{ padding: 0 }}>: {letter.mitraEmail}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ paddingLeft: '8mm', margin: `0 0 ${p4SigGapMm}mm 0` }}>
            {renderProspectRichText(interpolateCompanyName(content.closingPara, letter.companyName))}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12mm' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div>Mengetahui,</div>
              <div style={{ fontWeight: 700, marginBottom: '3.5mm' }}>
                {renderProspectRichText(content.directorFirmLabel)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                {directorQr ? (
                  <img
                    src={directorQr}
                    alt="QR Verifikasi Surat Direktur Utama ND TAX AND LAW"
                    style={{ width: '27mm', height: '27mm', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '27mm',
                      height: '27mm',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QrCode style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                Ditandatangani secara elektronik
              </div>
              <div style={{ fontWeight: 700 }}>
                {renderProspectRichText(content.directorName || letter.directorName || 'Nurtiyas, S.E., M.Ak, BKP')}
              </div>
              <div>{renderProspectRichText(content.directorTitle || letter.directorTitle || 'Direktur Utama')}</div>
            </div>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div>Hormat Kami,</div>
              <div style={{ fontWeight: 700, marginBottom: '3.5mm' }}>
                {renderProspectRichText(content.mitraSignerLabel)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                {mitraQr ? (
                  <img
                    src={mitraQr}
                    alt={`QR Verifikasi Mitra ${letter.mitraName}`}
                    style={{ width: '27mm', height: '27mm', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '27mm',
                      height: '27mm',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QrCode style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                Ditandatangani secara elektronik
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: letter.mitraName.length > 32 ? '9.8pt' : '11pt',
                }}
              >
                {letter.mitraName}
              </div>
              <div>{renderProspectRichText(content.mitraRoleLabel)}</div>
            </div>
          </div>
        </div>
        <LetterFooter content={content} />
      </A4PageFrame>
    </>
  );
};

async function waitForImages(container: HTMLElement): Promise<void> {
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

/**
 * Renders a self-contained inline-styled A4 DOM page directly via XHTML
 * SVG foreignObject -> high-DPI Canvas. Avoids cloning global Tailwind v4
 * stylesheets, producing pixel-identical output to the View modal.
 */
async function renderA4NodeToPngDataUrl(pageEl: HTMLElement, scale = 2): Promise<string> {
  const serialized = new XMLSerializer().serializeToString(pageEl);
  const svgXml = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH_PX}" height="${A4_HEIGHT_PX}" viewBox="0 0 ${A4_WIDTH_PX} ${A4_HEIGHT_PX}">`,
    `<foreignObject x="0" y="0" width="100%" height="100%">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${A4_WIDTH_PX}px;height:${A4_HEIGHT_PX}px;margin:0;padding:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;">`,
    `<style>*,*::before,*::after{box-sizing:border-box;}p{margin:0;}table{border-collapse:collapse;border-spacing:0;}img{display:block;max-width:none;}</style>`,
    serialized,
    `</div>`,
    `</foreignObject>`,
    `</svg>`,
  ].join('');

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG foreignObject image failed to render'));
    image.src = svgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(A4_WIDTH_PX * scale);
  canvas.height = Math.round(A4_HEIGHT_PX * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

  return canvas.toDataURL('image/png');
}

/**
 * Downloads the 4-page A4 PDF by rendering the EXACT same View layout
 * (`ProspectLetterDocument`) at native 794x1123px (210mm x 297mm) and
 * capturing each page directly into a 4-page A4 PDF so View and
 * Download PDF match identically.
 */
export async function downloadProspectLetterPdfFromView(
  letter: ProspectLetter,
  adminLogoUrl?: string,
  masterTemplate?: Partial<ProspectLetterContent> | null
): Promise<void> {
  if (typeof document === 'undefined') {
    await generateProspectLetterPdf(letter, 'download', adminLogoUrl, masterTemplate);
    return;
  }

  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  try {
    const [inlineLogo, directorQr, mitraQr] = await Promise.all([
      resolveInlineProspectLogo(adminLogoUrl),
      generateQrDataUrl(buildDirectorQrUrl(letter)),
      generateQrDataUrl(buildMitraQrUrl(letter.mitraMemberCode)),
    ]);

    container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '-12000px';
    container.style.top = '0';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.backgroundColor = '#FFFFFF';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    let resolveLayout: (() => void) | null = null;
    const layoutReadyPromise = new Promise<void>((resolve) => {
      resolveLayout = resolve;
      window.setTimeout(resolve, 700);
    });

    root = createRoot(container);
    root.render(
      <ProspectLetterDocument
        letter={letter}
        logoUrl={adminLogoUrl}
        inlineLogo={inlineLogo}
        masterTemplate={masterTemplate}
        directorQr={directorQr}
        mitraQr={mitraQr}
        mode="capture"
        onLayoutReady={() => resolveLayout?.()}
      />
    );

    await layoutReadyPromise;
    await waitForImages(container);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const pageNodes = Array.from(
      container.querySelectorAll<HTMLElement>('.nd-prospect-a4-capture-page')
    );

    if (pageNodes.length !== 4) {
      throw new Error('Expected 4 rendered A4 pages for PDF capture.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageNodes.length; i++) {
      const pngDataUrl = await renderA4NodeToPngDataUrl(pageNodes[i], 2);
      if (!pngDataUrl.startsWith('data:image/png;base64,') || pngDataUrl.length < 4000) {
        throw new Error(`Captured page ${i + 1} appears empty`);
      }
      if (i > 0) {
        doc.addPage('a4', 'portrait');
      }
      doc.addImage(pngDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const safeSlug = letter.companyName
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
    const fileName = `Surat_Penawaran_ND_Tax_and_Law_${safeSlug || 'Prospek'}.pdf`;
    triggerPdfBlobDownload(doc, fileName);
  } catch (err) {
    console.warn('[Prospect PDF View Capture Fallback]', err);
    await generateProspectLetterPdf(letter, 'download', adminLogoUrl, masterTemplate);
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
