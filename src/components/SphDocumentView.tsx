import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import {
  ProspectLetterContent,
  SphDocument,
  SphServiceSelection,
  resolveProspectLetterContent,
} from '../types';
import {
  formatIndonesianLetterDate,
  resolveInlineProspectLogo,
  triggerPdfBlobDownload,
} from '../utils/prospectLetterPdf';
import { renderProspectRichText } from '../utils/prospectRichText';
import {
  composeSphBilingualTitles,
  formatSphCurrencyEn,
  formatSphCurrencyId,
  numberWordEn,
  numberWordId,
  terbilangRupiahEn,
  terbilangRupiahId,
} from '../utils/sphCatalog';

export const SPH_A4_WIDTH_PX = 794; // 210mm at 96dpi
export const SPH_A4_HEIGHT_PX = 1123; // 297mm at 96dpi
const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';

/**
 * Exact same letterhead header as Surat Penawaran (`ProspectLetterDocument.tsx`)
 */
const SphLetterHeader: React.FC<{
  logoUrl?: string;
  inlineLogo?: { isCustom: boolean; dataUrl: string } | null;
  marginLeftMm?: number;
}> = ({ logoUrl, inlineLogo, marginLeftMm = 25 }) => {
  const trimmed = String(logoUrl || '').trim();
  const isCustomUploadedLogo = inlineLogo
    ? inlineLogo.isCustom
    : Boolean(trimmed && trimmed !== DEFAULT_VERTICAL_SVG);
  const customLogoSrc = inlineLogo?.isCustom ? inlineLogo.dataUrl : trimmed;
  const defaultEmblemSrc =
    inlineLogo && !inlineLogo.isCustom ? inlineLogo.dataUrl : DEFAULT_EMBLEM_PNG;
  const safeLeft = Math.min(55, Math.max(10, Number(marginLeftMm) || 25));
  const defaultLogoLeft = Math.max(6, safeLeft - 3);

  if (isCustomUploadedLogo) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '7.5mm',
          left: `${safeLeft}mm`,
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
        left: `${defaultLogoLeft}mm`,
        width: '34mm',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <img
        src={defaultEmblemSrc}
        alt="ND TAX AND LAW"
        style={{
          width: '17.5mm',
          height: '17.5mm',
          objectFit: 'contain',
          margin: '0 auto',
          display: 'block',
        }}
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

/**
 * Exact same footer bar as Surat Penawaran (`ProspectLetterDocument.tsx`)
 */
const SphLetterFooter: React.FC<{ content: ProspectLetterContent }> = ({ content }) => (
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
      <div style={{ fontWeight: 700, color: '#111111' }}>
        {renderProspectRichText(content.footerLeftTitle)}
      </div>
      {content.footerLeftLines.slice(0, 5).map((line, i) => (
        <div key={i}>{renderProspectRichText(line)}</div>
      ))}
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, color: '#BA984A' }}>
        {renderProspectRichText(content.footerRightTitle)}
      </div>
      {content.footerRightLines.slice(0, 5).map((line, i) => (
        <div key={i}>{renderProspectRichText(line)}</div>
      ))}
    </div>
  </div>
);

const SphA4PageFrame: React.FC<{
  children: React.ReactNode;
  mode: 'preview' | 'capture';
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
      if (w > 0) setScale(Math.min(1, w / SPH_A4_WIDTH_PX));
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

  if (mode === 'capture') {
    return (
      <div
        className="nd-sph-a4-capture-page"
        style={{
          width: `${SPH_A4_WIDTH_PX}px`,
          height: `${SPH_A4_HEIGHT_PX}px`,
          backgroundColor: '#FFFFFF',
          color: '#000000',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9.6pt',
        }}
      >
        {children}
      </div>
    );
  }

  const scaledW = Math.round(SPH_A4_WIDTH_PX * scale);
  const scaledH = Math.round(SPH_A4_HEIGHT_PX * scale);

  return (
    <div ref={wrapRef} className="w-full max-w-[794px] mx-auto">
      <div
        style={{
          width: `${scaledW}px`,
          height: `${scaledH}px`,
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.22)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${SPH_A4_WIDTH_PX}px`,
            minWidth: `${SPH_A4_WIDTH_PX}px`,
            maxWidth: `${SPH_A4_WIDTH_PX}px`,
            height: `${SPH_A4_HEIGHT_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundColor: '#FFFFFF',
            color: '#000000',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '9.6pt',
            WebkitTextSizeAdjust: 'none',
            textSizeAdjust: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const BilingualScopeSection: React.FC<{
  service: SphServiceSelection;
  letterPrefix?: string;
  compact?: boolean;
}> = ({ service, letterPrefix, compact = false }) => {
  const fontSize = compact ? '8.7pt' : '9.5pt';
  const rowGap = compact ? '1.1mm' : '1.5mm';
  return (
    <div style={{ marginBottom: compact ? '3.5mm' : '4.5mm' }}>
      {letterPrefix && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '8mm',
            fontWeight: 700,
            fontSize: compact ? '9.3pt' : '9.8pt',
            marginBottom: '1.6mm',
          }}
        >
          <div style={{ color: '#000000' }}>
            {letterPrefix}. {service.serviceNameId}
          </div>
          <div style={{ color: '#111111' }}>
            {letterPrefix}. {service.serviceNameEn}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
        {service.scopeItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '8mm',
              fontSize,
              lineHeight: 1.32,
            }}
          >
            <div style={{ display: 'flex', color: '#000000' }}>
              <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
              <span style={{ flex: 1 }}>{item.idText}</span>
            </div>
            <div style={{ display: 'flex', color: '#4B5563' }}>
              <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
              <span style={{ flex: 1 }}>{item.enText}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SphFeeTable: React.FC<{ sph: SphDocument }> = ({ sph }) => {
  const isMulti = sph.services.length > 1;
  const hasDiscount = sph.discountAmount > 0 && sph.finalTotalMonthly < sph.normalTotalMonthly;
  const headerCellStyle: React.CSSProperties = {
    backgroundColor: '#1E242B',
    color: '#FFFFFF',
    padding: '2.5mm 3mm',
    border: '1px solid #9CA3AF',
    textAlign: 'left',
    verticalAlign: 'top',
    fontSize: '9.2pt',
    lineHeight: 1.3,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
  const cellStyle: React.CSSProperties = {
    padding: '2.4mm 3mm',
    border: '1px solid #9CA3AF',
    verticalAlign: 'top',
    fontSize: '9.2pt',
    lineHeight: 1.35,
  };

  if (!isMulti) {
    const svc = sph.services[0];
    const volumeTitleId =
      svc?.unitType === 'journal'
        ? 'Jurnal rata-rata per bulan'
        : svc?.unitType === 'package'
          ? 'Skema layanan'
          : 'Transaksi rata-rata per bulan';
    const volumeTitleEn =
      svc?.unitType === 'journal'
        ? 'Average monthly journal entries'
        : svc?.unitType === 'package'
          ? 'Service scheme'
          : 'Average monthly transactions';

    return (
      <div style={{ marginBottom: '5mm' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '8mm',
            fontWeight: 700,
            fontSize: '10pt',
            marginBottom: '2mm',
          }}
        >
          <div style={{ color: '#000000' }}>II. Harga Jasa</div>
          <div style={{ color: '#111111' }}>II. Service Fee</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: '38%' }}>
                <div style={{ fontWeight: 700 }}>Uraian</div>
                <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#E5E7EB' }}>Description</div>
              </th>
              <th style={{ ...headerCellStyle, width: '62%' }}>
                <div style={{ fontWeight: 700 }}>Keterangan</div>
                <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#E5E7EB' }}>Details</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}>
                <div style={{ color: '#000000' }}>Omset rata-rata per tahun</div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Average annual turnover</div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#000000' }}>{svc?.turnoverLabelId || '-'}</div>
                <div style={{ color: '#4B5563' }}>{svc?.turnoverLabelEn || '-'}</div>
              </td>
            </tr>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <td style={cellStyle}>
                <div style={{ color: '#000000' }}>{volumeTitleId}</div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{volumeTitleEn}</div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#000000' }}>{svc?.volumeLabelId || '-'}</div>
                <div style={{ color: '#4B5563' }}>{svc?.volumeLabelEn || '-'}</div>
              </td>
            </tr>
            {hasDiscount && (
              <>
                <tr>
                  <td style={cellStyle}>
                    <div style={{ color: '#000000' }}>Harga normal per bulan</div>
                    <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Regular monthly fee</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ color: '#4B5563', textDecoration: 'line-through' }}>
                      {formatSphCurrencyId(sph.normalTotalMonthly)}
                    </div>
                    <div style={{ color: '#6B7280', textDecoration: 'line-through' }}>
                      {formatSphCurrencyEn(sph.normalTotalMonthly)}
                    </div>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <td style={cellStyle}>
                    <div style={{ color: '#000000' }}>Diskon penawaran</div>
                    <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Special discount</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600, color: '#065F46' }}>
                      - {formatSphCurrencyId(sph.discountAmount)}
                      {sph.normalTotalMonthly > 0
                        ? ` (${Math.round((sph.discountAmount / sph.normalTotalMonthly) * 1000) / 10}%)`
                        : ''}
                    </div>
                    <div style={{ color: '#047857' }}>- {formatSphCurrencyEn(sph.discountAmount)}</div>
                  </td>
                </tr>
              </>
            )}
            <tr style={{ backgroundColor: '#F3F4F6' }}>
              <td style={cellStyle}>
                <div style={{ fontWeight: 700, color: '#000000' }}>
                  {hasDiscount ? 'Harga jasa spesial per bulan' : 'Harga jasa per bulan'}
                </div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>
                  {hasDiscount ? 'Special monthly service fee' : 'Monthly service fee'}
                </div>
              </td>
              <td style={cellStyle}>
                <div style={{ fontWeight: 700, color: '#000000' }}>
                  {formatSphCurrencyId(sph.finalTotalMonthly)} ({terbilangRupiahId(sph.finalTotalMonthly)})
                </div>
                <div style={{ color: '#374151', marginTop: '0.5mm' }}>
                  {formatSphCurrencyEn(sph.finalTotalMonthly)} ({terbilangRupiahEn(sph.finalTotalMonthly)})
                </div>
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>
                <div style={{ fontWeight: 700, color: '#000000' }}>Catatan</div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Notes</div>
              </td>
              <td style={{ ...cellStyle, minHeight: '11mm' }}>
                <div style={{ color: '#111827', whiteSpace: 'pre-wrap' }}>{sph.notes?.trim() || ' '}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Multi-service 3-column table (exact match to Draf_SPH_Bilingual_-_Jasa_Akuntansi_dan_Perpajakan_Bulanan.pdf)
  return (
    <div style={{ marginBottom: '5mm' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '8mm',
          fontWeight: 700,
          fontSize: '10pt',
          marginBottom: '2mm',
        }}
      >
        <div style={{ color: '#000000' }}>II. Harga Jasa</div>
        <div style={{ color: '#111111' }}>II. Service Fee</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '24%' }}>
              <div style={{ fontWeight: 700 }}>Layanan</div>
              <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#E5E7EB' }}>Service</div>
            </th>
            <th style={{ ...headerCellStyle, width: '48%' }}>
              <div style={{ fontWeight: 700 }}>Dasar Perhitungan</div>
              <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#E5E7EB' }}>
                Basis of Calculation
              </div>
            </th>
            <th style={{ ...headerCellStyle, width: '28%' }}>
              <div style={{ fontWeight: 700 }}>Harga per Bulan</div>
              <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#E5E7EB' }}>Monthly Fee</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sph.services.map((svc, idx) => (
            <tr key={`${svc.serviceKey}-${idx}`} style={{ backgroundColor: idx % 2 === 1 ? '#F9FAFB' : '#FFFFFF' }}>
              <td style={cellStyle}>
                <div style={{ color: '#000000', fontWeight: 600 }}>{svc.serviceNameId}</div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{svc.serviceNameEn}</div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#000000' }}>
                  Omset {svc.turnoverLabelId}, {svc.volumeLabelId}
                </div>
                <div style={{ color: '#4B5563' }}>
                  Turnover {svc.turnoverLabelEn}, {svc.volumeLabelEn}
                </div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#000000', fontWeight: 600 }}>{formatSphCurrencyId(svc.monthlyPrice)}</div>
                <div style={{ color: '#4B5563' }}>{formatSphCurrencyEn(svc.monthlyPrice)}</div>
              </td>
            </tr>
          ))}
          <tr>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700, color: '#000000' }}>Jumlah harga normal</div>
              <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Total regular price</div>
            </td>
            <td style={cellStyle} />
            <td style={cellStyle}>
              <div
                style={{
                  fontWeight: 700,
                  color: hasDiscount ? '#6B7280' : '#000000',
                  textDecoration: hasDiscount ? 'line-through' : 'none',
                }}
              >
                {formatSphCurrencyId(sph.normalTotalMonthly)}
              </div>
              <div style={{ color: '#4B5563', textDecoration: hasDiscount ? 'line-through' : 'none' }}>
                {formatSphCurrencyEn(sph.normalTotalMonthly)}
              </div>
            </td>
          </tr>
          {hasDiscount && (
            <tr style={{ backgroundColor: '#F3F4F6' }}>
              <td style={cellStyle}>
                <div style={{ fontWeight: 700, color: '#000000' }}>Harga paket spesial</div>
                <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Special package price</div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#065F46', fontWeight: 600 }}>
                  Hemat {formatSphCurrencyId(sph.discountAmount)}
                  {sph.normalTotalMonthly > 0
                    ? ` (${Math.round((sph.discountAmount / sph.normalTotalMonthly) * 1000) / 10}%)`
                    : ''}
                </div>
                <div style={{ color: '#047857', fontSize: '8.4pt' }}>
                  Save {formatSphCurrencyEn(sph.discountAmount)} ({terbilangRupiahId(sph.finalTotalMonthly)})
                </div>
              </td>
              <td style={cellStyle}>
                <div style={{ fontWeight: 700, color: '#000000' }}>
                  {formatSphCurrencyId(sph.finalTotalMonthly)}
                </div>
                <div style={{ color: '#374151' }}>{formatSphCurrencyEn(sph.finalTotalMonthly)}</div>
              </td>
            </tr>
          )}
          <tr>
            <td style={cellStyle}>
              <div style={{ fontWeight: 700, color: '#000000' }}>Catatan</div>
              <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Notes</div>
            </td>
            <td colSpan={2} style={{ ...cellStyle, minHeight: '10mm' }}>
              <div style={{ color: '#111827', whiteSpace: 'pre-wrap' }}>{sph.notes?.trim() || ' '}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const SphTermsBlock: React.FC<{ sph: SphDocument; includeThankYou?: boolean }> = ({
  sph,
  includeThankYou = false,
}) => {
  const isMulti = sph.services.length > 1;
  const hasJournal = sph.services.some((s) => s.unitType === 'journal');
  const hasTransaction = sph.services.some((s) => s.unitType === 'transaction');
  const metricPhraseId =
    hasJournal && hasTransaction
      ? 'jumlah transaksi/jurnal per bulan'
      : hasJournal
        ? 'jumlah jurnal per bulan'
        : 'jumlah transaksi per bulan';
  const metricPhraseEn =
    hasJournal && hasTransaction
      ? 'monthly number of transactions/journal entries'
      : hasJournal
        ? 'monthly number of journal entries'
        : 'monthly number of transactions';

  const durationNum = Math.max(1, Number(sph.durationMonths) || 12);
  const durationLabelId = `${durationNum} (${numberWordId(durationNum)})`;
  const durationLabelEn = `${durationNum} (${numberWordEn(durationNum)})`;
  const hasSpecialPackage = isMulti && sph.discountAmount > 0;

  const terms: Array<{ id: string; en: string }> = [
    {
      id: `Harga jasa ditetapkan berdasarkan omset per tahun dan ${metricPhraseId} sebagaimana tercantum di atas. Apabila selama masa kerja sama terjadi peningkatan omset atau ${metricPhraseId.replace(' per bulan', '')} Klien, harga jasa dapat disesuaikan atas kesepakatan kedua belah pihak.`,
      en: `The service fee is determined based on the annual turnover and the ${metricPhraseEn} stated above. Should the Client's turnover or ${metricPhraseEn.replace('monthly ', '')} increase during the engagement period, the service fee may be adjusted upon mutual agreement of both parties.`,
    },
    {
      id: 'Pembayaran dilakukan setiap bulan paling lambat akhir bulan berjalan melalui transfer ke rekening resmi ND TAX AND LAW.',
      en: 'Payment shall be made monthly no later than the end of the current month by bank transfer to the official account of ND TAX AND LAW.',
    },
    {
      id: `Jangka waktu kerja sama selama ${durationLabelId} bulan dan akan dituangkan dalam perjanjian kerja sama.`,
      en: `The engagement period shall be ${durationLabelEn} months and will be set out in a service agreement.`,
    },
  ];

  if (hasSpecialPackage) {
    terms.push({
      id:
        sph.services.length === 2
          ? 'Harga paket spesial hanya berlaku apabila kedua layanan diambil sekaligus.'
          : 'Harga paket spesial hanya berlaku apabila seluruh layanan tersebut diambil sekaligus.',
      en:
        sph.services.length === 2
          ? 'The special package price applies only if both services are engaged together.'
          : 'The special package price applies only if all listed services are engaged together.',
    });
  }

  terms.push({
    id: 'Penawaran ini berlaku selama 30 (tiga puluh) hari sejak tanggal surat.',
    en: 'This offer is valid for 30 (thirty) days from the date of this letter.',
  });

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '8mm',
          fontWeight: 700,
          fontSize: '10pt',
          marginBottom: '2mm',
        }}
      >
        <div style={{ color: '#000000' }}>III. Ketentuan Penawaran</div>
        <div style={{ color: '#111111' }}>III. Terms of Offer</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', marginBottom: '4mm' }}>
        {terms.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '8mm',
              fontSize: '9.3pt',
              lineHeight: 1.38,
            }}
          >
            <div style={{ display: 'flex', color: '#000000' }}>
              <span style={{ width: '5.5mm', flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{t.id}</span>
            </div>
            <div style={{ display: 'flex', color: '#4B5563' }}>
              <span style={{ width: '5.5mm', flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{t.en}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '8mm',
          fontSize: '9.3pt',
          lineHeight: 1.4,
          marginBottom: includeThankYou ? '3.5mm' : '0',
        }}
      >
        <div style={{ color: '#000000' }}>
          Demikian surat penawaran ini kami sampaikan. Apabila Bapak/Ibu menyetujui penawaran ini,
          mohon menandatangani kolom persetujuan di bawah dan mengirimkannya kembali kepada kami.
          Untuk pertanyaan lebih lanjut, Bapak/Ibu dapat menghubungi kami melalui WhatsApp
          0821-8074-4977 atau email business@ndtaxandlaw.com.
        </div>
        <div style={{ color: '#4B5563' }}>
          We hereby submit this quotation. Should you agree to this offer, please sign the approval
          column below and return it to us. For further inquiries, please contact us via WhatsApp at
          0821-8074-4977 or by email at business@ndtaxandlaw.com.
        </div>
      </div>

      {includeThankYou && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '8mm',
            fontSize: '9.3pt',
            lineHeight: 1.4,
            marginBottom: '6mm',
          }}
        >
          <div style={{ color: '#000000' }}>
            Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
          </div>
          <div style={{ color: '#4B5563' }}>Thank you for your attention and cooperation.</div>
        </div>
      )}
    </div>
  );
};

const SphSignatureBlock: React.FC<{ sph: SphDocument; content: ProspectLetterContent }> = ({
  sph,
  content,
}) => {
  const directorName = sph.directorName || content.directorName || 'Nurtiyas, S.E., M.Ak., BKP.';
  const directorTitleId = sph.directorTitleId || content.directorTitle || 'Direktur Utama';
  const directorTitleEn = sph.directorTitleEn || 'President Director';
  const clientSignerName = sph.clientSignerName?.trim() || '';
  const clientSignerTitleId = sph.clientSignerTitleId?.trim() || '';
  const clientSignerTitleEn = sph.clientSignerTitleEn?.trim() || '';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        columnGap: '7mm',
        textAlign: 'center',
        fontSize: '9.3pt',
        lineHeight: 1.35,
      }}
    >
      <div>
        <div style={{ color: '#000000' }}>Mengetahui,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Acknowledged by,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>ND TAX AND LAW</div>
        <div style={{ height: '24mm' }} />
        <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm' }}>
          <div style={{ fontWeight: 700, color: '#000000' }}>{directorName}</div>
          <div style={{ color: '#000000' }}>{directorTitleId}</div>
          <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{directorTitleEn}</div>
        </div>
      </div>

      <div>
        <div style={{ color: '#000000' }}>Hormat kami,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Sincerely,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>MITRA RESMI</div>
        <div style={{ height: '24mm' }} />
        <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm' }}>
          <div style={{ fontWeight: 700, color: '#000000' }}>{sph.mitraName}</div>
          <div style={{ color: '#000000' }}>Mitra Strategis</div>
          <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Strategic Partner</div>
        </div>
      </div>

      <div>
        <div style={{ color: '#000000' }}>Menyetujui,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Approved by,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>{sph.companyName}</div>
        <div style={{ height: '24mm' }} />
        <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm' }}>
          <div style={{ fontWeight: 700, color: '#000000' }}>
            {clientSignerName || '( .................................... )'}
          </div>
          {clientSignerTitleId && (
            <div style={{ color: '#000000' }}>{clientSignerTitleId}</div>
          )}
          {clientSignerTitleEn && (
            <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{clientSignerTitleEn}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export interface SphDocumentViewProps {
  sph: SphDocument;
  logoUrl?: string;
  inlineLogo?: { isCustom: boolean; dataUrl: string } | null;
  masterTemplate?: Partial<ProspectLetterContent> | null;
  mode: 'preview' | 'capture';
}

export const SphDocumentView: React.FC<SphDocumentViewProps> = ({
  sph,
  logoUrl,
  inlineLogo,
  masterTemplate,
  mode,
}) => {
  const content = resolveProspectLetterContent(undefined, masterTemplate);
  const formattedDate = formatIndonesianLetterDate(sph.sphDate || sph.createdAt);
  const city = content.city || 'Jakarta';
  const titles = composeSphBilingualTitles(sph.services);

  const marginLeftMm = 23;
  const marginRightMm = 23;
  const bodyBoxStyle: React.CSSProperties = {
    position: 'absolute',
    top: '36mm',
    bottom: '36mm',
    left: `${marginLeftMm}mm`,
    right: `${marginRightMm}mm`,
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#000000',
    overflow: 'hidden',
  };

  const services = sph.services || [];
  const isSingle = services.length <= 1;
  const isTwo = services.length === 2;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className={mode === 'preview' ? 'space-y-6' : ''}>
      {/* PAGE 1: Header + Meta + Recipient + Opening + First Scope of Work */}
      <SphA4PageFrame mode={mode}>
        <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
        <div style={bodyBoxStyle}>
          <div style={{ textAlign: 'right', fontSize: '9.5pt', marginBottom: '2.5mm' }}>
            {city}, {formattedDate}
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '9.5pt',
              lineHeight: 1.35,
              marginBottom: '4mm',
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: '38mm', verticalAlign: 'top', padding: '0.4mm 0' }}>
                  Nomor / Number
                </td>
                <td style={{ width: '4mm', verticalAlign: 'top', padding: '0.4mm 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0', fontWeight: 600 }}>
                  {sph.sphNumber}
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>Sifat / Classification</td>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>
                  <div>Terbatas</div>
                  <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Restricted</div>
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>Perihal / Subject</td>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '0.4mm 0' }}>
                  <div style={{ fontWeight: 600 }}>{titles.subjectId}</div>
                  <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{titles.subjectEn}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '9.5pt', lineHeight: 1.38, marginBottom: '4mm' }}>
            <div>Kepada Yth. / To:</div>
            <div style={{ fontWeight: 700 }}>Pimpinan {sph.companyName}</div>
            <div style={{ fontStyle: 'italic', color: '#4B5563' }}>
              The Management of {sph.companyName}
            </div>
            <div>{sph.companyAddress}</div>
            <div>di Tempat / At your office</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '8mm',
              fontSize: '9.4pt',
              lineHeight: 1.4,
              marginBottom: '4.5mm',
            }}
          >
            <div>
              <div style={{ marginBottom: '2mm' }}>Dengan hormat,</div>
              <div>
                Menindaklanjuti proposal penawaran harga jasa yang telah kami sampaikan sebelumnya,
                bersama surat ini ND TAX AND LAW mengajukan penawaran harga {titles.openingPhraseId}{' '}
                untuk <strong>{sph.companyName}</strong> dengan rincian sebagai berikut.
              </div>
            </div>
            <div style={{ color: '#4B5563' }}>
              <div style={{ marginBottom: '2mm' }}>Dear Sir/Madam,</div>
              <div>
                Further to the service fee proposal we previously submitted, ND TAX AND LAW hereby
                submits a fee quotation for {titles.openingPhraseEn} for{' '}
                <strong>{sph.companyName}</strong> with the following details.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '8mm',
              fontWeight: 700,
              fontSize: '10pt',
              marginBottom: '2.2mm',
            }}
          >
            <div>I. Ruang Lingkup Pekerjaan</div>
            <div>I. Scope of Work</div>
          </div>

          {services[0] && (
            <BilingualScopeSection
              service={services[0]}
              letterPrefix={isSingle ? undefined : 'A'}
              compact={services[0].scopeItems.length >= 10}
            />
          )}
        </div>
        <SphLetterFooter content={content} />
      </SphA4PageFrame>

      {/* SINGLE SERVICE LAYOUT: Page 2 (Fee + Terms), Page 3 (Thank you + Signatures) */}
      {isSingle && (
        <>
          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              <SphFeeTable sph={sph} />
              <SphTermsBlock sph={sph} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>

          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  columnGap: '8mm',
                  fontSize: '9.5pt',
                  lineHeight: 1.45,
                  marginBottom: '10mm',
                }}
              >
                <div style={{ color: '#000000' }}>
                  Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
                </div>
                <div style={{ color: '#4B5563' }}>Thank you for your attention and cooperation.</div>
              </div>
              <SphSignatureBlock sph={sph} content={content} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>
        </>
      )}

      {/* TWO SERVICES LAYOUT: Page 2 (Scope B + Fee Table), Page 3 (Terms + Thank you + Signatures) */}
      {isTwo && (
        <>
          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              {services[1] && (
                <BilingualScopeSection service={services[1]} letterPrefix="B" compact />
              )}
              <SphFeeTable sph={sph} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>

          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              <SphTermsBlock sph={sph} includeThankYou />
              <SphSignatureBlock sph={sph} content={content} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>
        </>
      )}

      {/* 3+ SERVICES LAYOUT: Extra scope pages (2 per page), then Fee + Terms page, then Signatures page */}
      {!isSingle && !isTwo && (
        <>
          {Array.from({ length: Math.ceil((services.length - 1) / 2) }).map((_, chunkIdx) => {
            const firstIdx = 1 + chunkIdx * 2;
            const secondIdx = firstIdx + 1;
            return (
              <SphA4PageFrame key={`scope-page-${chunkIdx}`} mode={mode}>
                <SphLetterHeader
                  logoUrl={logoUrl}
                  inlineLogo={inlineLogo}
                  marginLeftMm={marginLeftMm}
                />
                <div style={bodyBoxStyle}>
                  {services[firstIdx] && (
                    <BilingualScopeSection
                      service={services[firstIdx]}
                      letterPrefix={letters[firstIdx] || String(firstIdx + 1)}
                      compact
                    />
                  )}
                  {services[secondIdx] && (
                    <BilingualScopeSection
                      service={services[secondIdx]}
                      letterPrefix={letters[secondIdx] || String(secondIdx + 1)}
                      compact
                    />
                  )}
                </div>
                <SphLetterFooter content={content} />
              </SphA4PageFrame>
            );
          })}

          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              <SphFeeTable sph={sph} />
              <SphTermsBlock sph={sph} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>

          <SphA4PageFrame mode={mode}>
            <SphLetterHeader logoUrl={logoUrl} inlineLogo={inlineLogo} marginLeftMm={marginLeftMm} />
            <div style={bodyBoxStyle}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  columnGap: '8mm',
                  fontSize: '9.5pt',
                  lineHeight: 1.45,
                  marginBottom: '10mm',
                }}
              >
                <div style={{ color: '#000000' }}>
                  Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
                </div>
                <div style={{ color: '#4B5563' }}>Thank you for your attention and cooperation.</div>
              </div>
              <SphSignatureBlock sph={sph} content={content} />
            </div>
            <SphLetterFooter content={content} />
          </SphA4PageFrame>
        </>
      )}
    </div>
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

async function renderSphA4NodeToPngDataUrl(pageEl: HTMLElement, scale = 3.0): Promise<string> {
  const scaledW = Math.round(SPH_A4_WIDTH_PX * scale);
  const scaledH = Math.round(SPH_A4_HEIGHT_PX * scale);
  const serialized = new XMLSerializer().serializeToString(pageEl);
  const svgXml = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scaledW}" height="${scaledH}" viewBox="0 0 ${scaledW} ${scaledH}">`,
    `<foreignObject x="0" y="0" width="${scaledW}" height="${scaledH}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${scaledW}px;height:${scaledH}px;overflow:hidden;position:relative;margin:0;padding:0;background:#ffffff;">`,
    `<div style="width:${SPH_A4_WIDTH_PX}px;height:${SPH_A4_HEIGHT_PX}px;transform:scale(${scale});transform-origin:top left;margin:0;padding:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;">`,
    `<style>*,*::before,*::after{box-sizing:border-box;}p{margin:0;}table{border-collapse:collapse;border-spacing:0;}img{display:block;max-width:none;}</style>`,
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
    image.onerror = () => reject(new Error('SVG foreignObject image failed to render'));
    image.src = svgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = scaledW;
  canvas.height = scaledH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, scaledW, scaledH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, scaledW, scaledH);
  return canvas.toDataURL('image/png');
}

export async function downloadSphPdfFromView(
  sph: SphDocument,
  adminLogoUrl?: string,
  masterTemplate?: Partial<ProspectLetterContent> | null
): Promise<void> {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  try {
    const inlineLogo = await resolveInlineProspectLogo(adminLogoUrl);

    container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '-12000px';
    container.style.top = '0';
    container.style.width = `${SPH_A4_WIDTH_PX}px`;
    container.style.backgroundColor = '#FFFFFF';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(
      <SphDocumentView
        sph={sph}
        logoUrl={adminLogoUrl}
        inlineLogo={inlineLogo}
        masterTemplate={masterTemplate}
        mode="capture"
      />
    );

    await new Promise<void>((r) => window.setTimeout(r, 120));
    await waitForImages(container);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const pageNodes = Array.from(
      container.querySelectorAll<HTMLElement>('.nd-sph-a4-capture-page')
    );
    if (pageNodes.length === 0) {
      throw new Error('Tidak ada halaman SPH yang dapat dirender.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageNodes.length; i++) {
      let pngDataUrl: string;
      try {
        pngDataUrl = await renderSphA4NodeToPngDataUrl(pageNodes[i], 3.0);
      } catch {
        pngDataUrl = await renderSphA4NodeToPngDataUrl(pageNodes[i], 2.2);
      }
      if (i > 0) doc.addPage('a4', 'portrait');
      doc.addImage(pngDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const safeCompany = sph.companyName
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 42);
    const safeNum = sph.sphNumber.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    triggerPdfBlobDownload(doc, `SPH_${safeNum || 'ND'}_${safeCompany || 'Klien'}.pdf`);
  } finally {
    if (root) {
      try {
        root.unmount();
      } catch {}
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
