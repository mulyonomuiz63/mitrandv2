import React, { useEffect, useRef, useState } from 'react';
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
import { renderProspectRichText, stripProspectRichText } from '../utils/prospectRichText';
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
      {/* Row 1: Headers + uniform signature space so all 3 horizontal lines align perfectly */}
      <div style={{ paddingBottom: '24mm' }}>
        <div style={{ color: '#000000' }}>Mengetahui,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Acknowledged by,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>ND TAX AND LAW</div>
      </div>

      <div style={{ paddingBottom: '24mm' }}>
        <div style={{ color: '#000000' }}>Hormat kami,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Sincerely,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>MITRA RESMI</div>
      </div>

      <div style={{ paddingBottom: '24mm' }}>
        <div style={{ color: '#000000' }}>Menyetujui,</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Approved by,</div>
        <div style={{ fontWeight: 700, color: '#000000', marginTop: '0.6mm' }}>{sph.companyName}</div>
      </div>

      {/* Row 2: Perfectly aligned signature lines & signer names/titles */}
      <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm' }}>
        <div style={{ fontWeight: 700, color: '#000000' }}>{directorName}</div>
        <div style={{ color: '#000000' }}>{directorTitleId}</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{directorTitleEn}</div>
      </div>

      <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm' }}>
        <div style={{ fontWeight: 700, color: '#000000' }}>{sph.mitraName}</div>
        <div style={{ color: '#000000' }}>Mitra Strategis</div>
        <div style={{ fontStyle: 'italic', color: '#4B5563' }}>Strategic Partner</div>
      </div>

      <div style={{ borderTop: '1px solid #374151', paddingTop: '1.5mm', minHeight: '14mm' }}>
        {clientSignerName && (
          <div style={{ fontWeight: 700, color: '#000000' }}>{clientSignerName}</div>
        )}
        {clientSignerTitleId && (
          <div style={{ color: '#000000' }}>{clientSignerTitleId}</div>
        )}
        {clientSignerTitleEn && (
          <div style={{ fontStyle: 'italic', color: '#4B5563' }}>{clientSignerTitleEn}</div>
        )}
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

type CachedSphLogo = {
  isCustom: boolean;
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  naturalWidth: number;
  naturalHeight: number;
};

const sphLogoCache = new Map<string, CachedSphLogo | null>();

async function getCachedSphLogo(adminLogoUrl?: string): Promise<CachedSphLogo | null> {
  const key = String(adminLogoUrl || '').trim() || '__default__';
  if (sphLogoCache.has(key)) {
    return sphLogoCache.get(key) ?? null;
  }
  const inlineLogo = await resolveInlineProspectLogo(adminLogoUrl);
  if (!inlineLogo?.dataUrl) {
    sphLogoCache.set(key, null);
    return null;
  }
  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 300 });
    img.onerror = () => resolve({ w: 300, h: 300 });
    img.src = inlineLogo.dataUrl;
  });
  const format: 'PNG' | 'JPEG' = /^data:image\/jpe?g/i.test(inlineLogo.dataUrl) ? 'JPEG' : 'PNG';
  const entry: CachedSphLogo = {
    isCustom: inlineLogo.isCustom,
    dataUrl: inlineLogo.dataUrl,
    format,
    naturalWidth: dims.w,
    naturalHeight: dims.h,
  };
  sphLogoCache.set(key, entry);
  return entry;
}

type RgbColor = [number, number, number];

interface VectorCellLine {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  color?: RgbColor;
  fontSize?: number;
  spaceBefore?: number;
}

/**
 * Generates an instant, crisp 100% native vector A4 PDF for SPH using jsPDF.
 * Eliminates SVG/Canvas bitmap blur and reduces export time from ~8-15s to <150ms.
 */
export async function downloadSphPdfFromView(
  sph: SphDocument,
  adminLogoUrl?: string,
  masterTemplate?: Partial<ProspectLetterContent> | null
): Promise<void> {
  const content = resolveProspectLetterContent(undefined, masterTemplate);
  const formattedDate = formatIndonesianLetterDate(sph.sphDate || sph.createdAt);
  const city = content.city || 'Jakarta';
  const titles = composeSphBilingualTitles(sph.services || []);
  const logo = await getCachedSphLogo(adminLogoUrl);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_L = 23;
  const MARGIN_R = 23;
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 164mm
  const COL_GAP = 8;
  const COL_W = (CONTENT_W - COL_GAP) / 2; // 78mm
  const COL1_X = MARGIN_L;
  const COL2_X = MARGIN_L + COL_W + COL_GAP;
  const BODY_TOP_Y = 38;
  const BODY_BOTTOM_Y = 259;

  const COLOR_BLACK: RgbColor = [0, 0, 0];
  const COLOR_DARK: RgbColor = [17, 17, 17];
  const COLOR_GRAY: RgbColor = [75, 85, 99];
  const COLOR_MUTED: RgbColor = [107, 114, 128];
  const COLOR_EMERALD: RgbColor = [6, 95, 70];
  const COLOR_EMERALD_LIGHT: RgbColor = [4, 120, 87];
  const COLOR_WHITE: RgbColor = [255, 255, 255];
  const COLOR_HEADER_EN: RgbColor = [229, 231, 235];

  const ptToMm = (pt: number) => pt * 0.352778;
  const lineStep = (pt: number, mult = 1.38) => ptToMm(pt) * mult;

  const setFontStyle = (
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal',
    color: RgbColor = COLOR_BLACK
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const drawPageChrome = () => {
    // 1. Header (matches SphLetterHeader / Surat Penawaran)
    const safeLeft = MARGIN_L;
    const defaultLogoLeft = Math.max(6, safeLeft - 3);
    if (logo) {
      if (logo.isCustom) {
        const maxW = 58;
        const maxH = 25;
        const ratio = logo.naturalWidth / Math.max(1, logo.naturalHeight);
        let drawW = maxW;
        let drawH = drawW / ratio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * ratio;
        }
        const drawY = 7.5 + (maxH - drawH) / 2;
        doc.addImage(logo.dataUrl, logo.format, safeLeft, drawY, drawW, drawH, 'nd-sph-logo', 'FAST');
      } else {
        const emblemSize = 17.5;
        const boxCenterX = defaultLogoLeft + 17;
        doc.addImage(
          logo.dataUrl,
          logo.format,
          boxCenterX - emblemSize / 2,
          7,
          emblemSize,
          emblemSize,
          'nd-sph-logo',
          'FAST'
        );
        setFontStyle(10, 'bold', [181, 148, 94]);
        doc.text('TAX AND LAW', boxCenterX, 28.4, { align: 'center', charSpace: 0.25 });
        setFontStyle(5, 'bold', [156, 130, 88]);
        doc.text('NURTIYAS & DARMAWAN', boxCenterX, 31.1, { align: 'center', charSpace: 0.35 });
      }
    }

    // 2. Footer bar (exact match to SphLetterFooter / Surat Penawaran)
    const footerTop = PAGE_H - 33;
    doc.setFillColor(244, 244, 244);
    doc.rect(0, footerTop, PAGE_W, 33, 'F');

    const footerStep = 4.05;
    let fyLeft = footerTop + 7.2;
    setFontStyle(8.4, 'bold', [17, 17, 17]);
    const leftTitle = stripProspectRichText(content.footerLeftTitle || '');
    if (leftTitle) {
      doc.text(leftTitle, 22, fyLeft);
      fyLeft += footerStep;
    }
    setFontStyle(8.4, 'normal', [26, 26, 26]);
    for (const rawLine of (content.footerLeftLines || []).slice(0, 5)) {
      const clean = stripProspectRichText(rawLine || '');
      if (clean) {
        doc.text(clean, 22, fyLeft);
        fyLeft += footerStep;
      }
    }

    let fyRight = footerTop + 7.2;
    setFontStyle(8.4, 'bold', [186, 152, 74]);
    const rightTitle = stripProspectRichText(content.footerRightTitle || '');
    if (rightTitle) {
      doc.text(rightTitle, PAGE_W - 22, fyRight, { align: 'right' });
      fyRight += footerStep;
    }
    setFontStyle(8.4, 'normal', [26, 26, 26]);
    for (const rawLine of (content.footerRightLines || []).slice(0, 5)) {
      const clean = stripProspectRichText(rawLine || '');
      if (clean) {
        doc.text(clean, PAGE_W - 22, fyRight, { align: 'right' });
        fyRight += footerStep;
      }
    }
  };

  drawPageChrome();
  let y = BODY_TOP_Y;

  const startNewPage = () => {
    doc.addPage('a4', 'portrait');
    drawPageChrome();
    y = BODY_TOP_Y;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > BODY_BOTTOM_Y) {
      startNewPage();
    }
  };

  const drawBilingualHeading = (leftText: string, rightText: string, fontSize = 10, gapAfter = 2.6) => {
    ensureSpace(12);
    setFontStyle(fontSize, 'bold', COLOR_BLACK);
    const lLines: string[] = doc.splitTextToSize(leftText, COL_W);
    setFontStyle(fontSize, 'bold', COLOR_DARK);
    const rLines: string[] = doc.splitTextToSize(rightText, COL_W);
    const step = lineStep(fontSize, 1.32);
    const rows = Math.max(lLines.length, rLines.length);

    setFontStyle(fontSize, 'bold', COLOR_BLACK);
    lLines.forEach((ln, idx) => doc.text(ln, COL1_X, y + idx * step));
    setFontStyle(fontSize, 'bold', COLOR_DARK);
    rLines.forEach((ln, idx) => doc.text(ln, COL2_X, y + idx * step));

    y += rows * step + gapAfter;
  };

  const drawBilingualParagraph = (
    leftText: string,
    rightText: string,
    fontSize = 9.3,
    gapAfter = 3.2
  ) => {
    setFontStyle(fontSize, 'normal', COLOR_BLACK);
    const lLines: string[] = doc.splitTextToSize(leftText, COL_W);
    setFontStyle(fontSize, 'normal', COLOR_GRAY);
    const rLines: string[] = doc.splitTextToSize(rightText, COL_W);
    const step = lineStep(fontSize, 1.38);
    const blockH = Math.max(lLines.length, rLines.length) * step;

    ensureSpace(blockH + 2);
    setFontStyle(fontSize, 'normal', COLOR_BLACK);
    lLines.forEach((ln, idx) => doc.text(ln, COL1_X, y + idx * step));
    setFontStyle(fontSize, 'normal', COLOR_GRAY);
    rLines.forEach((ln, idx) => doc.text(ln, COL2_X, y + idx * step));

    y += blockH + gapAfter;
  };

  const drawBilingualNumberedItem = (
    numLabel: string,
    leftText: string,
    rightText: string,
    fontSize = 9.2,
    gapAfter = 1.6
  ) => {
    const numW = 5.8;
    const textW = COL_W - numW;
    setFontStyle(fontSize, 'normal', COLOR_BLACK);
    const lLines: string[] = doc.splitTextToSize(leftText, textW);
    setFontStyle(fontSize, 'normal', COLOR_GRAY);
    const rLines: string[] = doc.splitTextToSize(rightText, textW);
    const step = lineStep(fontSize, 1.34);
    const blockH = Math.max(lLines.length, rLines.length) * step;

    ensureSpace(blockH + 1.5);
    setFontStyle(fontSize, 'normal', COLOR_BLACK);
    doc.text(numLabel, COL1_X, y);
    lLines.forEach((ln, idx) => doc.text(ln, COL1_X + numW, y + idx * step));

    setFontStyle(fontSize, 'normal', COLOR_GRAY);
    doc.text(numLabel, COL2_X, y);
    rLines.forEach((ln, idx) => doc.text(ln, COL2_X + numW, y + idx * step));

    y += blockH + gapAfter;
  };

  // =========================================================================
  // 1. DATE, LETTER METADATA & RECIPIENT
  // =========================================================================
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text(`${city}, ${formattedDate}`, PAGE_W - MARGIN_R, y, { align: 'right' });
  y += 5.5;

  const metaLabelW = 37;
  const metaColonX = MARGIN_L + metaLabelW;
  const metaValX = metaColonX + 3.5;
  const metaValW = CONTENT_W - metaLabelW - 3.5;
  const metaStep = lineStep(9.5, 1.34);

  // Nomor / Number
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text('Nomor / Number', MARGIN_L, y);
  doc.text(':', metaColonX, y);
  setFontStyle(9.5, 'bold', COLOR_BLACK);
  doc.text(sph.sphNumber || '-', metaValX, y);
  y += metaStep + 0.8;

  // Sifat / Classification
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text('Sifat / Classification', MARGIN_L, y);
  doc.text(':', metaColonX, y);
  doc.text('Terbatas', metaValX, y);
  setFontStyle(9.5, 'italic', COLOR_GRAY);
  doc.text('Restricted', metaValX, y + metaStep);
  y += metaStep * 2 + 0.8;

  // Perihal / Subject
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text('Perihal / Subject', MARGIN_L, y);
  doc.text(':', metaColonX, y);
  setFontStyle(9.5, 'bold', COLOR_BLACK);
  const subjIdLines: string[] = doc.splitTextToSize(titles.subjectId, metaValW);
  subjIdLines.forEach((ln, idx) => doc.text(ln, metaValX, y + idx * metaStep));
  setFontStyle(9.5, 'italic', COLOR_GRAY);
  const subjEnLines: string[] = doc.splitTextToSize(titles.subjectEn, metaValW);
  const subjEnStartY = y + subjIdLines.length * metaStep;
  subjEnLines.forEach((ln, idx) => doc.text(ln, metaValX, subjEnStartY + idx * metaStep));
  y = subjEnStartY + subjEnLines.length * metaStep + 4.2;

  // Recipient
  const recStep = lineStep(9.5, 1.38);
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text('Kepada Yth. / To:', MARGIN_L, y);
  y += recStep;

  setFontStyle(9.5, 'bold', COLOR_BLACK);
  const compIdLines: string[] = doc.splitTextToSize(`Pimpinan ${sph.companyName}`, CONTENT_W);
  compIdLines.forEach((ln) => {
    doc.text(ln, MARGIN_L, y);
    y += recStep;
  });

  setFontStyle(9.5, 'italic', COLOR_GRAY);
  const compEnLines: string[] = doc.splitTextToSize(`The Management of ${sph.companyName}`, CONTENT_W);
  compEnLines.forEach((ln) => {
    doc.text(ln, MARGIN_L, y);
    y += recStep;
  });

  if (sph.companyAddress?.trim()) {
    setFontStyle(9.5, 'normal', COLOR_BLACK);
    const addrLines: string[] = doc.splitTextToSize(sph.companyAddress.trim(), CONTENT_W);
    addrLines.forEach((ln) => {
      doc.text(ln, MARGIN_L, y);
      y += recStep;
    });
  }
  setFontStyle(9.5, 'normal', COLOR_BLACK);
  doc.text('di Tempat / At your office', MARGIN_L, y);
  y += recStep + 3.2;

  // =========================================================================
  // 2. OPENING BILINGUAL SALUTATION & INTRO
  // =========================================================================
  drawBilingualParagraph('Dengan hormat,', 'Dear Sir/Madam,', 9.4, 1.8);
  drawBilingualParagraph(
    `Menindaklanjuti proposal penawaran harga jasa yang telah kami sampaikan sebelumnya, bersama surat ini ND TAX AND LAW mengajukan penawaran harga ${titles.openingPhraseId} untuk ${sph.companyName} dengan rincian sebagai berikut.`,
    `Further to the service fee proposal we previously submitted, ND TAX AND LAW hereby submits a fee quotation for ${titles.openingPhraseEn} for ${sph.companyName} with the following details.`,
    9.3,
    4.5
  );

  // =========================================================================
  // 3. SECTION I: RUANG LINGKUP PEKERJAAN / SCOPE OF WORK
  // =========================================================================
  const services = sph.services || [];
  const isSingle = services.length <= 1;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  drawBilingualHeading('I. Ruang Lingkup Pekerjaan', 'I. Scope of Work', 10, 2.4);

  services.forEach((svc, sIdx) => {
    if (!isSingle) {
      const prefix = letters[sIdx] || String(sIdx + 1);
      drawBilingualHeading(
        `${prefix}. ${svc.serviceNameId}`,
        `${prefix}. ${svc.serviceNameEn}`,
        9.4,
        1.8
      );
    }
    const scopeFont = svc.scopeItems.length >= 10 || !isSingle ? 8.8 : 9.2;
    svc.scopeItems.forEach((item, idx) => {
      drawBilingualNumberedItem(`${idx + 1}.`, item.idText, item.enText, scopeFont, 1.4);
    });
    y += 2.6;
  });

  // =========================================================================
  // 4. SECTION II: HARGA JASA / SERVICE FEE (CRISP VECTOR TABLE)
  // =========================================================================
  y += 1.5;
  ensureSpace(36);
  drawBilingualHeading('II. Harga Jasa', 'II. Service Fee', 10, 2.5);

  const measureAndRenderTable = (
    colWidths: number[],
    headerCells: VectorCellLine[][],
    bodyRows: Array<{ bg?: RgbColor; cells: VectorCellLine[][]; colSpans?: number[]; minHeight?: number }>
  ) => {
    const padX = 2.8;
    const padY = 2.3;

    const layoutRow = (
      cells: VectorCellLine[][],
      colSpans?: number[],
      minHeight = 0
    ) => {
      const renderedCells: Array<{
        x: number;
        w: number;
        lines: Array<{
          text: string;
          style: 'normal' | 'bold' | 'italic' | 'bolditalic';
          color: RgbColor;
          fontSize: number;
          strike: boolean;
          yOffset: number;
        }>;
      }> = [];

      let colIdx = 0;
      let cursorX = MARGIN_L;
      let maxContentH = 0;

      for (let c = 0; c < cells.length; c++) {
        const span = colSpans?.[c] || 1;
        let cellW = 0;
        for (let k = 0; k < span; k++) {
          cellW += colWidths[colIdx + k] || 0;
        }
        const innerW = Math.max(8, cellW - padX * 2);
        const flatLines: Array<{
          text: string;
          style: 'normal' | 'bold' | 'italic' | 'bolditalic';
          color: RgbColor;
          fontSize: number;
          strike: boolean;
          yOffset: number;
        }> = [];

        let curY = 0;
        for (const item of cells[c]) {
          const fs = item.fontSize || 9.1;
          const style: 'normal' | 'bold' | 'italic' | 'bolditalic' =
            item.bold && item.italic
              ? 'bolditalic'
              : item.bold
                ? 'bold'
                : item.italic
                  ? 'italic'
                  : 'normal';
          const color = item.color || COLOR_BLACK;
          const step = lineStep(fs, 1.32);
          if (item.spaceBefore) curY += item.spaceBefore;

          setFontStyle(fs, style, color);
          const rawParagraphs = String(item.text || '').split('\n');
          for (const para of rawParagraphs) {
            const wrapped: string[] = para ? doc.splitTextToSize(para, innerW) : [''];
            for (const wLine of wrapped) {
              curY += step;
              flatLines.push({
                text: wLine,
                style,
                color,
                fontSize: fs,
                strike: Boolean(item.strike),
                yOffset: curY - step * 0.22,
              });
            }
          }
        }

        if (curY > maxContentH) maxContentH = curY;
        renderedCells.push({ x: cursorX, w: cellW, lines: flatLines });
        cursorX += cellW;
        colIdx += span;
      }

      const rowH = Math.max(minHeight, maxContentH + padY * 2);
      return { renderedCells, rowH };
    };

    const drawLaidOutRow = (
      laidOut: ReturnType<typeof layoutRow>,
      bg?: RgbColor
    ) => {
      const startY = y;
      const { renderedCells, rowH } = laidOut;
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.24);

      for (const cell of renderedCells) {
        if (bg) {
          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.rect(cell.x, startY, cell.w, rowH, 'FD');
        } else {
          doc.rect(cell.x, startY, cell.w, rowH, 'S');
        }

        for (const ln of cell.lines) {
          if (!ln.text) continue;
          setFontStyle(ln.fontSize, ln.style, ln.color);
          const textX = cell.x + padX;
          const textY = startY + padY + ln.yOffset;
          doc.text(ln.text, textX, textY);
          if (ln.strike) {
            const tw = doc.getTextWidth(ln.text);
            const strikeY = textY - ptToMm(ln.fontSize) * 0.3;
            doc.setDrawColor(ln.color[0], ln.color[1], ln.color[2]);
            doc.setLineWidth(0.22);
            doc.line(textX, strikeY, textX + tw, strikeY);
            doc.setDrawColor(156, 163, 175);
            doc.setLineWidth(0.24);
          }
        }
      }

      y += rowH;
    };

    const headerBg: RgbColor = [30, 36, 43];
    const laidHeader = layoutRow(headerCells);
    ensureSpace(laidHeader.rowH + 14);
    drawLaidOutRow(laidHeader, headerBg);

    for (const row of bodyRows) {
      const laidBody = layoutRow(row.cells, row.colSpans, row.minHeight || 0);
      if (y + laidBody.rowH > BODY_BOTTOM_Y) {
        startNewPage();
        drawLaidOutRow(laidHeader, headerBg);
      }
      drawLaidOutRow(laidBody, row.bg);
    }
  };

  const hasDiscount = sph.discountAmount > 0 && sph.finalTotalMonthly < sph.normalTotalMonthly;
  const discountPct =
    sph.normalTotalMonthly > 0
      ? Math.round((sph.discountAmount / sph.normalTotalMonthly) * 1000) / 10
      : 0;

  if (isSingle) {
    const svc = services[0];
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

    const colWidths = [CONTENT_W * 0.38, CONTENT_W * 0.62];
    const headerCells: VectorCellLine[][] = [
      [
        { text: 'Uraian', bold: true, color: COLOR_WHITE },
        { text: 'Description', italic: true, color: COLOR_HEADER_EN },
      ],
      [
        { text: 'Keterangan', bold: true, color: COLOR_WHITE },
        { text: 'Details', italic: true, color: COLOR_HEADER_EN },
      ],
    ];

    const bodyRows: Array<{ bg?: RgbColor; cells: VectorCellLine[][]; minHeight?: number }> = [
      {
        cells: [
          [
            { text: 'Omset rata-rata per tahun', color: COLOR_BLACK },
            { text: 'Average annual turnover', italic: true, color: COLOR_GRAY },
          ],
          [
            { text: svc?.turnoverLabelId || '-', color: COLOR_BLACK },
            { text: svc?.turnoverLabelEn || '-', color: COLOR_GRAY },
          ],
        ],
      },
      {
        bg: [249, 250, 251],
        cells: [
          [
            { text: volumeTitleId, color: COLOR_BLACK },
            { text: volumeTitleEn, italic: true, color: COLOR_GRAY },
          ],
          [
            { text: svc?.volumeLabelId || '-', color: COLOR_BLACK },
            { text: svc?.volumeLabelEn || '-', color: COLOR_GRAY },
          ],
        ],
      },
    ];

    if (hasDiscount) {
      bodyRows.push({
        cells: [
          [
            { text: 'Harga normal per bulan', color: COLOR_BLACK },
            { text: 'Regular monthly fee', italic: true, color: COLOR_GRAY },
          ],
          [
            { text: formatSphCurrencyId(sph.normalTotalMonthly), strike: true, color: COLOR_GRAY },
            { text: formatSphCurrencyEn(sph.normalTotalMonthly), strike: true, color: COLOR_MUTED },
          ],
        ],
      });
      bodyRows.push({
        bg: [249, 250, 251],
        cells: [
          [
            { text: 'Diskon penawaran', color: COLOR_BLACK },
            { text: 'Special discount', italic: true, color: COLOR_GRAY },
          ],
          [
            {
              text: `- ${formatSphCurrencyId(sph.discountAmount)}${discountPct > 0 ? ` (${discountPct}%)` : ''}`,
              bold: true,
              color: COLOR_EMERALD,
            },
            { text: `- ${formatSphCurrencyEn(sph.discountAmount)}`, color: COLOR_EMERALD_LIGHT },
          ],
        ],
      });
    }

    bodyRows.push({
      bg: [243, 244, 246],
      cells: [
        [
          {
            text: hasDiscount ? 'Harga jasa spesial per bulan' : 'Harga jasa per bulan',
            bold: true,
            color: COLOR_BLACK,
          },
          {
            text: hasDiscount ? 'Special monthly service fee' : 'Monthly service fee',
            italic: true,
            color: COLOR_GRAY,
          },
        ],
        [
          {
            text: `${formatSphCurrencyId(sph.finalTotalMonthly)} (${terbilangRupiahId(sph.finalTotalMonthly)})`,
            bold: true,
            color: COLOR_BLACK,
          },
          {
            text: `${formatSphCurrencyEn(sph.finalTotalMonthly)} (${terbilangRupiahEn(sph.finalTotalMonthly)})`,
            color: [55, 65, 81],
            spaceBefore: 0.6,
          },
        ],
      ],
    });

    bodyRows.push({
      minHeight: 12,
      cells: [
        [
          { text: 'Catatan', bold: true, color: COLOR_BLACK },
          { text: 'Notes', italic: true, color: COLOR_GRAY },
        ],
        [{ text: sph.notes?.trim() || '', color: [17, 24, 39] }],
      ],
    });

    measureAndRenderTable(colWidths, headerCells, bodyRows);
  } else {
    const colWidths = [CONTENT_W * 0.24, CONTENT_W * 0.48, CONTENT_W * 0.28];
    const headerCells: VectorCellLine[][] = [
      [
        { text: 'Layanan', bold: true, color: COLOR_WHITE },
        { text: 'Service', italic: true, color: COLOR_HEADER_EN },
      ],
      [
        { text: 'Dasar Perhitungan', bold: true, color: COLOR_WHITE },
        { text: 'Basis of Calculation', italic: true, color: COLOR_HEADER_EN },
      ],
      [
        { text: 'Harga per Bulan', bold: true, color: COLOR_WHITE },
        { text: 'Monthly Fee', italic: true, color: COLOR_HEADER_EN },
      ],
    ];

    const bodyRows: Array<{
      bg?: RgbColor;
      cells: VectorCellLine[][];
      colSpans?: number[];
      minHeight?: number;
    }> = services.map((svc, idx) => ({
      bg: idx % 2 === 1 ? [249, 250, 251] : undefined,
      cells: [
        [
          { text: svc.serviceNameId, bold: true, color: COLOR_BLACK },
          { text: svc.serviceNameEn, italic: true, color: COLOR_GRAY },
        ],
        [
          { text: `Omset ${svc.turnoverLabelId}, ${svc.volumeLabelId}`, color: COLOR_BLACK },
          { text: `Turnover ${svc.turnoverLabelEn}, ${svc.volumeLabelEn}`, color: COLOR_GRAY },
        ],
        [
          { text: formatSphCurrencyId(svc.monthlyPrice), bold: true, color: COLOR_BLACK },
          { text: formatSphCurrencyEn(svc.monthlyPrice), color: COLOR_GRAY },
        ],
      ],
    }));

    bodyRows.push({
      cells: [
        [
          { text: 'Jumlah harga normal', bold: true, color: COLOR_BLACK },
          { text: 'Total regular price', italic: true, color: COLOR_GRAY },
        ],
        [],
        [
          {
            text: formatSphCurrencyId(sph.normalTotalMonthly),
            bold: true,
            strike: hasDiscount,
            color: hasDiscount ? COLOR_MUTED : COLOR_BLACK,
          },
          {
            text: formatSphCurrencyEn(sph.normalTotalMonthly),
            strike: hasDiscount,
            color: COLOR_GRAY,
          },
        ],
      ],
    });

    if (hasDiscount) {
      bodyRows.push({
        bg: [243, 244, 246],
        cells: [
          [
            { text: 'Harga paket spesial', bold: true, color: COLOR_BLACK },
            { text: 'Special package price', italic: true, color: COLOR_GRAY },
          ],
          [
            {
              text: `Hemat ${formatSphCurrencyId(sph.discountAmount)}${discountPct > 0 ? ` (${discountPct}%)` : ''}`,
              bold: true,
              color: COLOR_EMERALD,
            },
            {
              text: `Save ${formatSphCurrencyEn(sph.discountAmount)} (${terbilangRupiahId(sph.finalTotalMonthly)})`,
              color: COLOR_EMERALD_LIGHT,
              fontSize: 8.4,
            },
          ],
          [
            { text: formatSphCurrencyId(sph.finalTotalMonthly), bold: true, color: COLOR_BLACK },
            { text: formatSphCurrencyEn(sph.finalTotalMonthly), color: [55, 65, 81] },
          ],
        ],
      });
    }

    bodyRows.push({
      minHeight: 11,
      colSpans: [1, 2],
      cells: [
        [
          { text: 'Catatan', bold: true, color: COLOR_BLACK },
          { text: 'Notes', italic: true, color: COLOR_GRAY },
        ],
        [{ text: sph.notes?.trim() || '', color: [17, 24, 39] }],
      ],
    });

    measureAndRenderTable(colWidths, headerCells, bodyRows);
  }

  y += 5;

  // =========================================================================
  // 5. SECTION III: KETENTUAN PENAWARAN / TERMS OF OFFER
  // =========================================================================
  const hasJournal = services.some((s) => s.unitType === 'journal');
  const hasTransaction = services.some((s) => s.unitType === 'transaction');
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
  const hasSpecialPackage = !isSingle && sph.discountAmount > 0;

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
        services.length === 2
          ? 'Harga paket spesial hanya berlaku apabila kedua layanan diambil sekaligus.'
          : 'Harga paket spesial hanya berlaku apabila seluruh layanan tersebut diambil sekaligus.',
      en:
        services.length === 2
          ? 'The special package price applies only if both services are engaged together.'
          : 'The special package price applies only if all listed services are engaged together.',
    });
  }
  terms.push({
    id: 'Penawaran ini berlaku selama 30 (tiga puluh) hari sejak tanggal surat.',
    en: 'This offer is valid for 30 (thirty) days from the date of this letter.',
  });

  ensureSpace(26);
  drawBilingualHeading('III. Ketentuan Penawaran', 'III. Terms of Offer', 10, 2.2);
  terms.forEach((t, idx) => {
    drawBilingualNumberedItem(`${idx + 1}.`, t.id, t.en, 9.2, 2.0);
  });

  y += 2;
  drawBilingualParagraph(
    'Demikian surat penawaran ini kami sampaikan. Apabila Bapak/Ibu menyetujui penawaran ini, mohon menandatangani kolom persetujuan di bawah dan mengirimkannya kembali kepada kami. Untuk pertanyaan lebih lanjut, Bapak/Ibu dapat menghubungi kami melalui WhatsApp 0821-8074-4977 atau email business@ndtaxandlaw.com.',
    'We hereby submit this quotation. Should you agree to this offer, please sign the approval column below and return it to us. For further inquiries, please contact us via WhatsApp at 0821-8074-4977 or by email at business@ndtaxandlaw.com.',
    9.2,
    3.5
  );

  // =========================================================================
  // 6. THANK YOU + 3-COLUMN ALIGNED SIGNATURE BLOCK (KEPT TOGETHER)
  // =========================================================================
  const sigGap = 7;
  const sigColW = (CONTENT_W - sigGap * 2) / 3;
  const sigStep = lineStep(9.2, 1.36);

  setFontStyle(9.2, 'bold', COLOR_BLACK);
  const compSigLines: string[] = doc.splitTextToSize(sph.companyName || '', sigColW);
  const topHeaderHeight = sigStep * 2 + 1 + Math.max(1, compSigLines.length) * sigStep;
  const sigTotalNeeded = 11 + topHeaderHeight + 22 + 16;
  ensureSpace(sigTotalNeeded);

  drawBilingualParagraph(
    'Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
    'Thank you for your attention and cooperation.',
    9.3,
    7
  );

  const sigStartY = y;
  const sigCols = [
    {
      x: MARGIN_L,
      labelId: 'Mengetahui,',
      labelEn: 'Acknowledged by,',
      orgLines: ['ND TAX AND LAW'],
      name: sph.directorName || content.directorName || 'Nurtiyas, S.E., M.Ak., BKP.',
      titleId: sph.directorTitleId || content.directorTitle || 'Direktur Utama',
      titleEn: sph.directorTitleEn || 'President Director',
    },
    {
      x: MARGIN_L + sigColW + sigGap,
      labelId: 'Hormat kami,',
      labelEn: 'Sincerely,',
      orgLines: ['MITRA RESMI'],
      name: sph.mitraName || '',
      titleId: 'Mitra Strategis',
      titleEn: 'Strategic Partner',
    },
    {
      x: MARGIN_L + (sigColW + sigGap) * 2,
      labelId: 'Menyetujui,',
      labelEn: 'Approved by,',
      orgLines: compSigLines,
      name: sph.clientSignerName?.trim() || '',
      titleId: sph.clientSignerTitleId?.trim() || '',
      titleEn: sph.clientSignerTitleEn?.trim() || '',
    },
  ];

  // Uniform baseline for all 3 horizontal signature lines
  const lineY = sigStartY + topHeaderHeight + 22;

  for (const col of sigCols) {
    const cx = col.x + sigColW / 2;
    let cy = sigStartY;
    setFontStyle(9.2, 'normal', COLOR_BLACK);
    doc.text(col.labelId, cx, cy, { align: 'center' });
    cy += sigStep;
    setFontStyle(9.2, 'italic', COLOR_GRAY);
    doc.text(col.labelEn, cx, cy, { align: 'center' });
    cy += sigStep + 0.6;
    setFontStyle(9.2, 'bold', COLOR_BLACK);
    col.orgLines.forEach((ln) => {
      doc.text(ln, cx, cy, { align: 'center' });
      cy += sigStep;
    });

    // Horizontal signature line (exact same Y across all 3 columns)
    doc.setDrawColor(55, 65, 81);
    doc.setLineWidth(0.3);
    doc.line(col.x, lineY, col.x + sigColW, lineY);

    let ny = lineY + 4.3;
    if (col.name) {
      setFontStyle(9.2, 'bold', COLOR_BLACK);
      const nLines: string[] = doc.splitTextToSize(col.name, sigColW);
      nLines.forEach((ln) => {
        doc.text(ln, cx, ny, { align: 'center' });
        ny += sigStep;
      });
    }
    if (col.titleId) {
      setFontStyle(9.2, 'normal', COLOR_BLACK);
      const tIdLines: string[] = doc.splitTextToSize(col.titleId, sigColW);
      tIdLines.forEach((ln) => {
        doc.text(ln, cx, ny, { align: 'center' });
        ny += sigStep;
      });
    }
    if (col.titleEn) {
      setFontStyle(9.2, 'italic', COLOR_GRAY);
      const tEnLines: string[] = doc.splitTextToSize(col.titleEn, sigColW);
      tEnLines.forEach((ln) => {
        doc.text(ln, cx, ny, { align: 'center' });
        ny += sigStep;
      });
    }
  }

  const safeCompany = sph.companyName
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
  const safeNum = sph.sphNumber.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  triggerPdfBlobDownload(doc, `SPH_${safeNum || 'ND'}_${safeCompany || 'Klien'}.pdf`);
}
