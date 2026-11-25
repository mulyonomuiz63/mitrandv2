import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from 'lucide-react';
import {
  ProspectLetterComparisonRow,
  ProspectLetterContent,
  ProspectLetterLawItem,
  ProspectLetterServiceItem,
} from '../types';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from './ProspectLetterDocument';

interface ProspectLetterContentEditorProps {
  value: ProspectLetterContent;
  onChange: (next: ProspectLetterContent) => void;
  logoUrl?: string;
}

const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';
// 297mm - 40mm (top) - 40mm (bottom) = 217mm ≈ 820.16px at 96dpi
const MAX_BODY_HEIGHT_PX = 820;

const AutoGrowTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, style, ariaLabel }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 18)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="nd-wysiwyg-field"
      style={{
        display: 'block',
        width: '100%',
        resize: 'none',
        overflow: 'hidden',
        background: 'transparent',
        border: '1px dashed transparent',
        borderRadius: '3px',
        padding: '0 2px',
        margin: 0,
        outline: 'none',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        color: 'inherit',
        textAlign: 'inherit',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
};

const InlineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, style, ariaLabel }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={ariaLabel}
    className="nd-wysiwyg-field"
    style={{
      background: 'transparent',
      border: '1px dashed transparent',
      borderRadius: '3px',
      padding: '0 2px',
      margin: 0,
      outline: 'none',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      textAlign: 'inherit',
      boxSizing: 'border-box',
      width: '100%',
      ...style,
    }}
  />
);

const EditorHeaderLogo: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
  const trimmed = String(logoUrl || '').trim();
  const isCustomUploadedLogo = Boolean(trimmed && trimmed !== DEFAULT_VERTICAL_SVG);

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
          src={trimmed}
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
        src={DEFAULT_EMBLEM_PNG}
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

export const ProspectLetterContentEditor: React.FC<ProspectLetterContentEditorProps> = ({
  value,
  onChange,
  logoUrl,
}) => {
  const [pageTab, setPageTab] = useState<1 | 2 | 3 | 4>(1);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bodyMeasureRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [bodyHeightPx, setBodyHeightPx] = useState(0);

  const patch = <K extends keyof ProspectLetterContent>(key: K, nextVal: ProspectLetterContent[K]) => {
    onChange({ ...value, [key]: nextVal });
  };

  // Scale A4 sheet smoothly if modal width < 794px
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      if (!stageRef.current) return;
      const w = stageRef.current.clientWidth;
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
  }, []);

  // Measure active page body height in real time to detect overflow
  useLayoutEffect(() => {
    const el = bodyMeasureRef.current;
    if (!el) return;
    const measure = () => {
      setBodyHeightPx(Math.ceil(el.scrollHeight));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageTab, value]);

  const usagePct = Math.round((bodyHeightPx / MAX_BODY_HEIGHT_PX) * 100);
  const overflowPx = Math.max(0, bodyHeightPx - MAX_BODY_HEIGHT_PX);
  const isOverflowing = overflowPx > 2;
  const isNearLimit = !isOverflowing && usagePct >= 93;

  // Law items helper (Section I, II, III)
  const renderEditableLawList = (
    sectionKey: 'section1Items' | 'section2Items' | 'section3Items',
    items: ProspectLetterLawItem[]
  ) => {
    const updateItem = (idx: number, updated: ProspectLetterLawItem) => {
      const next = items.map((it, i) => (i === idx ? updated : it));
      patch(sectionKey, next);
    };
    const removeItem = (idx: number) => {
      if (items.length <= 1) return;
      patch(sectionKey, items.filter((_, i) => i !== idx));
    };
    const addItem = () => {
      if (items.length >= 6) return;
      patch(sectionKey, [...items, { title: 'Dasar hukum baru', bullets: ['Keterangan poin'] }]);
    };

    return (
      <div>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="group/law"
            style={{
              paddingLeft: '9mm',
              marginBottom: idx === items.length - 1 ? '1.8mm' : '1.4mm',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', gap: '3mm', alignItems: 'flex-start' }}>
              <span style={{ width: '4.5mm', flexShrink: 0 }}>{idx + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <AutoGrowTextarea
                    value={item.title}
                    onChange={(title) => updateItem(idx, { ...item, title })}
                    placeholder="Judul pasal / poin"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Hapus poin"
                      style={{
                        opacity: 0.45,
                        padding: '2px',
                        color: '#e11d48',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      className="hover:!opacity-100"
                    >
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                    </button>
                  )}
                </div>

                {item.bullets.map((bullet, bIdx) => (
                  <div
                    key={bIdx}
                    style={{ display: 'flex', gap: '2.5mm', alignItems: 'flex-start', textAlign: 'justify' }}
                  >
                    <span>-</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <AutoGrowTextarea
                        value={bullet}
                        onChange={(val) => {
                          const nextBullets = item.bullets.map((b, i) => (i === bIdx ? val : b));
                          updateItem(idx, { ...item, bullets: nextBullets });
                        }}
                        placeholder="Isi rincian"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>
                    {item.bullets.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(idx, {
                            ...item,
                            bullets: item.bullets.filter((_, i) => i !== bIdx),
                          })
                        }
                        title="Hapus rincian"
                        style={{
                          opacity: 0.35,
                          padding: '2px',
                          color: '#e11d48',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        className="hover:!opacity-100"
                      >
                        <Trash2 style={{ width: '11px', height: '11px' }} />
                      </button>
                    )}
                  </div>
                ))}

                {item.bullets.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(idx, { ...item, bullets: [...item.bullets, 'Rincian baru'] })
                    }
                    style={{
                      fontSize: '8pt',
                      color: '#2563eb',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      marginTop: '1px',
                      cursor: 'pointer',
                      opacity: 0.75,
                    }}
                    className="hover:!opacity-100"
                  >
                    <Plus style={{ width: '10px', height: '10px' }} />
                    <span>Sub-poin</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length < 6 && (
          <div style={{ paddingLeft: '9mm', marginBottom: '1.5mm' }}>
            <button
              type="button"
              onClick={addItem}
              style={{
                fontSize: '8.5pt',
                fontWeight: 600,
                color: '#092147',
                backgroundColor: '#eff6ff',
                border: '1px dashed #93c5fd',
                borderRadius: '4px',
                padding: '1px 7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
              }}
            >
              <Plus style={{ width: '11px', height: '11px' }} />
              <span>Tambah Poin</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Shared editable footer at bottom of every page
  const renderEditableFooter = () => (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '33mm',
        backgroundColor: '#F4F4F4',
        padding: '4.5mm 22mm 3.5mm 22mm',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '10mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '8.4pt',
        lineHeight: 1.35,
        color: '#1A1A1A',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1, textAlign: 'left' }}>
        <InlineInput
          value={value.footerLeftTitle}
          onChange={(v) => patch('footerLeftTitle', v)}
          placeholder="Judul kiri"
          style={{ fontWeight: 700, color: '#111111' }}
        />
        {value.footerLeftLines.slice(0, 5).map((line, i) => (
          <InlineInput
            key={i}
            value={line}
            onChange={(v) => {
              const next = [...value.footerLeftLines];
              next[i] = v;
              patch('footerLeftLines', next);
            }}
            placeholder={`Baris ${i + 1}`}
          />
        ))}
      </div>

      <div style={{ flex: 1, textAlign: 'right' }}>
        <InlineInput
          value={value.footerRightTitle}
          onChange={(v) => patch('footerRightTitle', v)}
          placeholder="Judul kanan"
          style={{ fontWeight: 700, color: '#BA984A', textAlign: 'right' }}
        />
        {value.footerRightLines.slice(0, 5).map((line, i) => (
          <InlineInput
            key={i}
            value={line}
            onChange={(v) => {
              const next = [...value.footerRightLines];
              next[i] = v;
              patch('footerRightLines', next);
            }}
            placeholder={`Baris ${i + 1}`}
            style={{ textAlign: 'right' }}
          />
        ))}
      </div>
    </div>
  );

  // Dynamic sample pills styled like real letter text with subtle visual cue
  const autoTagStyle: React.CSSProperties = {
    backgroundColor: 'rgba(254, 243, 199, 0.55)',
    borderRadius: '2px',
    padding: '0 2px',
  };

  return (
    <div className="space-y-3">
      {/* Hover/focus CSS scoped specifically to inline WYSIWYG fields */}
      <style>{`
        .nd-wysiwyg-field:hover {
          border-color: rgba(59, 130, 246, 0.45) !important;
          background: rgba(239, 246, 255, 0.35) !important;
        }
        .nd-wysiwyg-field:focus {
          border-color: #2563eb !important;
          border-style: solid !important;
          background: rgba(239, 246, 255, 0.7) !important;
        }
      `}</style>

      {/* Top Page Selector & Live Overflow Meter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {([1, 2, 3, 4] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPageTab(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                pageTab === p
                  ? 'bg-[#092147] text-amber-300 shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Halaman {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Live Page Fit / Overflow Status */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              isOverflowing
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : isNearLimit
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isOverflowing ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Kelebihan +{overflowPx}px</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Muat · {Math.min(usagePct, 100)}%</span>
              </>
            )}
          </div>

          {/* Quick Prev / Next Page Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageTab === 1}
              onClick={() => setPageTab((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3 | 4) : p))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pageTab === 4}
              onClick={() => setPageTab((p) => (p < 4 ? ((p + 1) as 1 | 2 | 3 | 4) : p))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live A4 Paper Sheet Stage */}
      <div className="bg-slate-700/90 rounded-xl p-3 sm:p-5 overflow-hidden">
        <div
          ref={stageRef}
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
              boxShadow: isOverflowing
                ? '0 0 0 3px #f43f5e, 0 10px 30px rgba(15, 23, 42, 0.35)'
                : '0 10px 30px rgba(15, 23, 42, 0.35)',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '11pt',
            }}
          >
            {/* Header Logo */}
            <EditorHeaderLogo logoUrl={logoUrl} />

            {/* Red Dashed Bottom Margin Guide when near or over limit */}
            {(isOverflowing || isNearLimit) && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '40mm',
                  left: '16mm',
                  right: '16mm',
                  borderTop: `1.5px dashed ${isOverflowing ? '#e11d48' : '#d97706'}`,
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: '8pt',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: isOverflowing ? '#e11d48' : '#d97706',
                    padding: '1px 6px',
                    borderRadius: '0 0 4px 4px',
                  }}
                >
                  {isOverflowing ? `Batas Halaman (Kelebihan +${overflowPx}px)` : 'Batas Bawah Halaman'}
                </span>
              </div>
            )}

            {/* Editable A4 Body Content Area (Exact 30mm L/R, 40mm Top/Bottom) */}
            <div
              style={{
                position: 'absolute',
                top: '40mm',
                left: '30mm',
                right: '30mm',
                height: `${MAX_BODY_HEIGHT_PX}px`,
                overflow: 'visible',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11pt',
                lineHeight: pageTab === 2 ? 1.2 : pageTab === 4 ? 1.3 : 1.24,
                color: '#000000',
                zIndex: 10,
              }}
            >
              <div ref={bodyMeasureRef}>
                {/* ===================== HALAMAN 1 ===================== */}
                {pageTab === 1 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        marginBottom: '0.8mm',
                      }}
                    >
                      <InlineInput
                        value={value.city}
                        onChange={(v) => patch('city', v)}
                        placeholder="Kota"
                        style={{ width: '90px', textAlign: 'right' }}
                      />
                      <span>, </span>
                      <span style={autoTagStyle}>25 November 2026</span>
                    </div>

                    <table
                      style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        fontSize: '11pt',
                        lineHeight: 1.24,
                        marginBottom: '3.6mm',
                      }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ width: '25mm', padding: 0, verticalAlign: 'top' }}>Nomor</td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            : <span style={autoTagStyle}>001/ND/SPP/XI/2026</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>Sifat</td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>:</span>
                              <InlineInput
                                value={value.sifat}
                                onChange={(v) => patch('sifat', v)}
                                placeholder="Sifat"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>Lampiran</td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>:</span>
                              <InlineInput
                                value={value.lampiran}
                                onChange={(v) => patch('lampiran', v)}
                                placeholder="Lampiran"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>Perihal</td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>:</span>
                              <InlineInput
                                value={value.perihal}
                                onChange={(v) => patch('perihal', v)}
                                placeholder="Perihal"
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginBottom: '3.6mm' }}>
                      <div>Kepada Yth</div>
                      <div>
                        Pimpinan/Direksi <span style={autoTagStyle}>PT Contoh Perusahaan Indonesia</span>
                      </div>
                      <div>
                        Alamat:{' '}
                        <span style={autoTagStyle}>
                          Jl. Jend. Sudirman No. 10, Kel. Karet, Kec. Setiabudi, Kota Jakarta Selatan, Prov. DKI Jakarta
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.6mm' }}>
                      <InlineInput
                        value={value.greeting}
                        onChange={(v) => patch('greeting', v)}
                        placeholder="Salam pembuka"
                      />
                    </div>

                    <div style={{ marginBottom: '3.6mm' }}>
                      <AutoGrowTextarea
                        value={value.introPara1}
                        onChange={(v) => patch('introPara1', v)}
                        placeholder="Paragraf pembuka 1"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ marginBottom: '4.6mm' }}>
                      <AutoGrowTextarea
                        value={value.introPara2}
                        onChange={(v) => patch('introPara2', v)}
                        placeholder="Paragraf pembuka 2"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ fontWeight: 700, marginBottom: '2.8mm' }}>
                      <AutoGrowTextarea
                        value={value.sectionMainTitle}
                        onChange={(v) => patch('sectionMainTitle', v)}
                        placeholder="Judul bagian utama"
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '0.8mm' }}>
                      <span style={{ width: '5mm', flexShrink: 0 }}>I.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.section1Title}
                          onChange={(v) => patch('section1Title', v)}
                          placeholder="Judul Bagian I"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    {renderEditableLawList('section1Items', value.section1Items)}

                    <div
                      style={{
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.8mm 2.8mm',
                        textAlign: 'justify',
                      }}
                    >
                      <AutoGrowTextarea
                        value={value.section1Sanction}
                        onChange={(v) => patch('section1Sanction', v)}
                        placeholder="Teks kotak sanksi I"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>
                  </>
                )}

                {/* ===================== HALAMAN 2 ===================== */}
                {pageTab === 2 && (
                  <>
                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '0.8mm' }}>
                      <span style={{ width: '5mm', flexShrink: 0 }}>II.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.section2Title}
                          onChange={(v) => patch('section2Title', v)}
                          placeholder="Judul Bagian II"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    {renderEditableLawList('section2Items', value.section2Items)}

                    <div
                      style={{
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.8mm 2.8mm',
                        textAlign: 'justify',
                        marginBottom: '5.2mm',
                      }}
                    >
                      <AutoGrowTextarea
                        value={value.section2Sanction}
                        onChange={(v) => patch('section2Sanction', v)}
                        placeholder="Teks kotak sanksi II"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '0.8mm' }}>
                      <span style={{ width: '6mm', flexShrink: 0 }}>III.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.section3Title}
                          onChange={(v) => patch('section3Title', v)}
                          placeholder="Judul Bagian III"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    {renderEditableLawList('section3Items', value.section3Items)}

                    <div
                      style={{
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.8mm 2.8mm',
                        textAlign: 'justify',
                      }}
                    >
                      <AutoGrowTextarea
                        value={value.section3Sanction}
                        onChange={(v) => patch('section3Sanction', v)}
                        placeholder="Teks kotak sanksi III"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>
                  </>
                )}

                {/* ===================== HALAMAN 3 ===================== */}
                {pageTab === 3 && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: '3.2mm' }}>
                      <InlineInput
                        value={value.aboutTitle}
                        onChange={(v) => patch('aboutTitle', v)}
                        placeholder="Judul tentang perusahaan"
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ marginBottom: '3.6mm' }}>
                      <AutoGrowTextarea
                        value={value.aboutPara}
                        onChange={(v) => patch('aboutPara', v)}
                        placeholder="Profil singkat"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '0.8mm' }}>
                      <span style={{ width: '5mm', flexShrink: 0 }}>I.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.servicesTitle}
                          onChange={(v) => patch('servicesTitle', v)}
                          placeholder="Judul layanan"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    <div style={{ paddingLeft: '9mm', marginBottom: '2mm' }}>
                      <AutoGrowTextarea
                        value={value.servicesIntro}
                        onChange={(v) => patch('servicesIntro', v)}
                        placeholder="Pengantar layanan"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ paddingLeft: '11mm', marginBottom: '3mm' }}>
                      {value.servicesItems.map((svc: ProspectLetterServiceItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '3mm',
                            alignItems: 'flex-start',
                            marginBottom: '1.2mm',
                          }}
                        >
                          <span style={{ width: '4.5mm', flexShrink: 0 }}>{idx + 1}.</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <InlineInput
                              value={svc.lead}
                              onChange={(v) => {
                                const next = value.servicesItems.map((it, i) =>
                                  i === idx ? { ...it, lead: v } : it
                                );
                                patch('servicesItems', next);
                              }}
                              placeholder="Judul layanan"
                              style={{ fontWeight: 700 }}
                            />
                            <AutoGrowTextarea
                              value={svc.body}
                              onChange={(v) => {
                                const next = value.servicesItems.map((it, i) =>
                                  i === idx ? { ...it, body: v } : it
                                );
                                patch('servicesItems', next);
                              }}
                              placeholder="Deskripsi layanan"
                              style={{ textAlign: 'justify' }}
                            />
                          </div>
                          {value.servicesItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                patch(
                                  'servicesItems',
                                  value.servicesItems.filter((_, i) => i !== idx)
                                )
                              }
                              title="Hapus layanan"
                              style={{
                                opacity: 0.4,
                                padding: '2px',
                                color: '#e11d48',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                              className="hover:!opacity-100"
                            >
                              <Trash2 style={{ width: '12px', height: '12px' }} />
                            </button>
                          )}
                        </div>
                      ))}

                      {value.servicesItems.length < 8 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('servicesItems', [
                              ...value.servicesItems,
                              { lead: 'Layanan Baru,', body: 'deskripsi layanan' },
                            ])
                          }
                          style={{
                            fontSize: '8.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '1px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginTop: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus style={{ width: '11px', height: '11px' }} />
                          <span>Tambah Layanan</span>
                        </button>
                      )}
                    </div>

                    <div style={{ marginBottom: '4.2mm' }}>
                      <AutoGrowTextarea
                        value={value.servicesCaseNote}
                        onChange={(v) => patch('servicesCaseNote', v)}
                        placeholder="Catatan case-by-case"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '1.5mm' }}>
                      <span style={{ width: '5mm', flexShrink: 0 }}>II.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.comparisonTitle}
                          onChange={(v) => patch('comparisonTitle', v)}
                          placeholder="Judul perbandingan"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '2mm' }}>
                      <InlineInput
                        value={value.comparisonIntro}
                        onChange={(v) => patch('comparisonIntro', v)}
                        placeholder="Pengantar tabel"
                      />
                    </div>

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '10.5pt',
                        marginBottom: '3.2mm',
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#DFDCCE' }}>
                          {([0, 1, 2] as const).map((colIdx) => (
                            <th
                              key={colIdx}
                              style={{
                                border: '1px solid #000000',
                                padding: '1.8mm 2mm',
                                textAlign: 'left',
                                width: colIdx === 0 ? '34%' : colIdx === 1 ? '40%' : '26%',
                                fontWeight: 700,
                              }}
                            >
                              <InlineInput
                                value={value.comparisonHeaders[colIdx]}
                                onChange={(v) => {
                                  const next: [string, string, string] = [...value.comparisonHeaders];
                                  next[colIdx] = v;
                                  patch('comparisonHeaders', next);
                                }}
                                placeholder={`Kolom ${colIdx + 1}`}
                                style={{ fontWeight: 700 }}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {value.comparisonRows.map((row: ProspectLetterComparisonRow, rIdx) => (
                          <tr key={rIdx}>
                            <td style={{ border: '1px solid #000000', padding: '1.5mm 2mm' }}>
                              <InlineInput
                                value={row.component}
                                onChange={(v) => {
                                  const next = value.comparisonRows.map((r, i) =>
                                    i === rIdx ? { ...r, component: v } : r
                                  );
                                  patch('comparisonRows', next);
                                }}
                                placeholder="Komponen"
                              />
                            </td>
                            <td style={{ border: '1px solid #000000', padding: '1.5mm 2mm' }}>
                              <InlineInput
                                value={row.internalStaff}
                                onChange={(v) => {
                                  const next = value.comparisonRows.map((r, i) =>
                                    i === rIdx ? { ...r, internalStaff: v } : r
                                  );
                                  patch('comparisonRows', next);
                                }}
                                placeholder="Internal"
                              />
                            </td>
                            <td style={{ border: '1px solid #000000', padding: '1.5mm 2mm' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <InlineInput
                                  value={row.consultant}
                                  onChange={(v) => {
                                    const next = value.comparisonRows.map((r, i) =>
                                      i === rIdx ? { ...r, consultant: v } : r
                                    );
                                    patch('comparisonRows', next);
                                  }}
                                  placeholder="Konsultan"
                                  style={{ fontWeight: rIdx === 0 ? 700 : 400 }}
                                />
                                {value.comparisonRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patch(
                                        'comparisonRows',
                                        value.comparisonRows.filter((_, i) => i !== rIdx)
                                      )
                                    }
                                    title="Hapus baris"
                                    style={{
                                      opacity: 0.35,
                                      padding: '1px',
                                      color: '#e11d48',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                    }}
                                    className="hover:!opacity-100"
                                  >
                                    <Trash2 style={{ width: '11px', height: '11px' }} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {value.comparisonRows.length < 8 && (
                      <div style={{ marginBottom: '2.5mm' }}>
                        <button
                          type="button"
                          onClick={() =>
                            patch('comparisonRows', [
                              ...value.comparisonRows,
                              { component: 'Komponen baru', internalStaff: '-', consultant: '-' },
                            ])
                          }
                          style={{
                            fontSize: '8.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '1px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus style={{ width: '11px', height: '11px' }} />
                          <span>Tambah Baris</span>
                        </button>
                      </div>
                    )}

                    <AutoGrowTextarea
                      value={value.comparisonClosing}
                      onChange={(v) => patch('comparisonClosing', v)}
                      placeholder="Penutup perbandingan"
                      style={{ textAlign: 'justify' }}
                    />
                  </>
                )}

                {/* ===================== HALAMAN 4 ===================== */}
                {pageTab === 4 && (
                  <>
                    <div style={{ display: 'flex', gap: '4mm', fontWeight: 700, marginBottom: '2.5mm' }}>
                      <span style={{ width: '6mm', flexShrink: 0 }}>III.</span>
                      <div style={{ flex: 1 }}>
                        <InlineInput
                          value={value.consultTitle}
                          onChange={(v) => patch('consultTitle', v)}
                          placeholder="Judul bagian III"
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    <div style={{ paddingLeft: '10mm', marginBottom: '8mm' }}>
                      <AutoGrowTextarea
                        value={value.consultPara}
                        onChange={(v) => patch('consultPara', v)}
                        placeholder="Paragraf konsultasi"
                        style={{ textAlign: 'justify' }}
                      />
                    </div>

                    <div
                      style={{
                        border: '1px solid #000000',
                        padding: '4mm 4.5mm',
                        marginBottom: '7.5mm',
                      }}
                    >
                      <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3.5mm' }}>
                        Mitra Strategis
                      </div>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11pt', lineHeight: 1.35 }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '24mm', padding: 0 }}>Nama</td>
                            <td style={{ padding: 0 }}>
                              : <span style={autoTagStyle}>Nama Mitra (otomatis)</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>No. ID</td>
                            <td style={{ padding: 0 }}>
                              : <span style={autoTagStyle}>ND-TAX-LAW-0001</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>Whatsapp</td>
                            <td style={{ padding: 0 }}>
                              : <span style={autoTagStyle}>0812-3456-7890</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>Email</td>
                            <td style={{ padding: 0 }}>
                              : <span style={autoTagStyle}>mitra@ndtaxandlaw.com</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginBottom: '18mm' }}>
                      <AutoGrowTextarea
                        value={value.closingPara}
                        onChange={(v) => patch('closingPara', v)}
                        placeholder="Paragraf penutup"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12mm' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div>Mengetahui,</div>
                        <div style={{ marginBottom: '3.5mm' }}>
                          <InlineInput
                            value={value.directorFirmLabel}
                            onChange={(v) => patch('directorFirmLabel', v)}
                            placeholder="Nama firma"
                            style={{ fontWeight: 700, textAlign: 'center' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                          <div
                            style={{
                              width: '27mm',
                              height: '27mm',
                              border: '1px dashed #94a3b8',
                              backgroundColor: '#f8fafc',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                              fontSize: '7.5pt',
                            }}
                          >
                            <QrCode style={{ width: '26px', height: '26px', marginBottom: '2px' }} />
                            <span>QR Direktur</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                          Ditandatangani secara elektronik
                        </div>
                        <InlineInput
                          value={value.directorName}
                          onChange={(v) => patch('directorName', v)}
                          placeholder="Nama direktur"
                          style={{ fontWeight: 700, textAlign: 'center' }}
                        />
                        <InlineInput
                          value={value.directorTitle}
                          onChange={(v) => patch('directorTitle', v)}
                          placeholder="Jabatan direktur"
                          style={{ textAlign: 'center' }}
                        />
                      </div>

                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div>Hormat Kami,</div>
                        <div style={{ marginBottom: '3.5mm' }}>
                          <InlineInput
                            value={value.mitraSignerLabel}
                            onChange={(v) => patch('mitraSignerLabel', v)}
                            placeholder="Label mitra"
                            style={{ fontWeight: 700, textAlign: 'center' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                          <div
                            style={{
                              width: '27mm',
                              height: '27mm',
                              border: '1px dashed #94a3b8',
                              backgroundColor: '#f8fafc',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                              fontSize: '7.5pt',
                            }}
                          >
                            <QrCode style={{ width: '26px', height: '26px', marginBottom: '2px' }} />
                            <span>QR Mitra</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                          Ditandatangani secara elektronik
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          <span style={autoTagStyle}>Nama Mitra</span>
                        </div>
                        <InlineInput
                          value={value.mitraRoleLabel}
                          onChange={(v) => patch('mitraRoleLabel', v)}
                          placeholder="Jabatan mitra"
                          style={{ textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editable Footer Strip */}
            {renderEditableFooter()}
          </div>
        </div>
      </div>
    </div>
  );
};
