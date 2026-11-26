import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  RemoveFormatting,
  Building2,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  ProspectLetterComparisonRow,
  ProspectLetterContent,
  ProspectLetterLawItem,
  ProspectLetterServiceItem,
} from '../types';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from './ProspectLetterDocument';
import {
  PROSPECT_TEXT_COLORS,
  buildRichDomFragment,
  normalizeHexColor,
  serializeRichDomElement,
} from '../utils/prospectRichText';
import { generateQrWithLogoDataUrl } from '../utils/qrWithLogo';

interface ProspectLetterContentEditorProps {
  value: ProspectLetterContent;
  onChange: (next: ProspectLetterContent) => void;
  logoUrl?: string;
  logoBarcodeUrl?: string;
}

const DEFAULT_VERTICAL_SVG = '/assets/aistudio/logo_nd_vertikal.svg';
const DEFAULT_EMBLEM_PNG = '/assets/aistudio/logo_kotak_5ecb05e4.png';
// 297mm - 40mm (top) - 40mm (bottom) = 217mm ≈ 820.16px at 96dpi
const MAX_BODY_HEIGHT_PX = 820;

interface ActiveFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
}

const DEFAULT_FORMAT_STATE: ActiveFormatState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: '#000000',
};

interface RichEditableFieldProps {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  inline?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  onFieldFocus?: (el: HTMLElement) => void;
  onSelectionActivity?: () => void;
}

/**
 * True WYSIWYG inline rich-text editable field built without innerHTML / dangerouslySetInnerHTML.
 * Displays live Bold, Italic, Underline, Strikethrough, and Text Color directly on the A4 letter sheet
 * with zero layout shift (uses outline instead of border and 0 padding so line wraps match Lihat Surat 1:1).
 */
const RichEditableField: React.FC<RichEditableFieldProps> = ({
  value,
  onChange,
  multiline = true,
  inline = false,
  placeholder,
  style,
  ariaLabel,
  onFieldFocus,
  onSelectionActivity,
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const defaultBold =
    style?.fontWeight === 700 ||
    style?.fontWeight === '700' ||
    style?.fontWeight === 'bold';
  const defaultColor = typeof style?.color === 'string' ? style.color : '#000000';

  const emitCurrentDom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const serialized = serializeRichDomElement(el, {
      multiline,
      defaultBold,
      defaultColor,
    });
    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      onChangeRef.current(serialized);
    }
  }, [multiline, defaultBold, defaultColor]);

  // Populate DOM cleanly on initial mount and whenever value changes externally (e.g., Reset Default)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastEmittedRef.current === value) return;
    lastEmittedRef.current = value;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    if (value) {
      el.appendChild(buildRichDomFragment(document, value, multiline));
    }
  }, [value, multiline]);

  // Allow toolbar to trigger re-serialization immediately after formatting commands
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleSync = () => emitCurrentDom();
    el.addEventListener('nd-rich-sync', handleSync);
    return () => el.removeEventListener('nd-rich-sync', handleSync);
  }, [emitCurrentDom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    // Support standard keyboard shortcuts Ctrl/Cmd + B / I / U
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u') {
        e.preventDefault();
        const cmd = k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline';
        document.execCommand(cmd, false);
        emitCurrentDom();
        onSelectionActivity?.();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const rawText = e.clipboardData.getData('text/plain') || '';
    const cleaned = multiline ? rawText.replace(/\r\n/g, '\n') : rawText.replace(/[\r\n]+/g, ' ');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(cleaned);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    emitCurrentDom();
  };

  const commonProps = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-multiline': multiline,
    'aria-label': ariaLabel,
    'data-placeholder': placeholder || '',
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      onFieldFocus?.(e.currentTarget);
      onSelectionActivity?.();
    },
    onInput: () => {
      emitCurrentDom();
      onSelectionActivity?.();
    },
    onBlur: () => emitCurrentDom(),
    onKeyDown: handleKeyDown,
    onKeyUp: () => onSelectionActivity?.(),
    onMouseUp: () => onSelectionActivity?.(),
    onPaste: handlePaste,
    className: 'nd-wysiwyg-field',
  };

  const fieldStyle: React.CSSProperties = {
    display: inline ? 'inline' : 'block',
    width: inline ? 'auto' : '100%',
    minHeight: inline ? undefined : '1em',
    background: 'transparent',
    border: 'none',
    borderRadius: '2px',
    padding: 0,
    margin: 0,
    outline: '1px dashed transparent',
    outlineOffset: '1px',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
    boxSizing: 'border-box',
    whiteSpace: inline ? 'pre-wrap' : multiline ? 'pre-wrap' : 'nowrap',
    overflow: inline ? 'visible' : multiline ? 'visible' : 'hidden',
    wordBreak: 'break-word',
    ...style,
  };

  if (inline) {
    return (
      <span
        ref={(node) => {
          ref.current = node;
        }}
        {...commonProps}
        style={fieldStyle}
      />
    );
  }

  return (
    <div
      ref={(node) => {
        ref.current = node;
      }}
      {...commonProps}
      style={fieldStyle}
    />
  );
};

const EditorHeaderLogo: React.FC<{ logoUrl?: string; marginLeftMm?: number }> = ({
  logoUrl,
  marginLeftMm = 30,
}) => {
  const trimmed = String(logoUrl || '').trim();
  const isCustomUploadedLogo = Boolean(trimmed && trimmed !== DEFAULT_VERTICAL_SVG);
  const safeLeft = Math.min(55, Math.max(10, Number(marginLeftMm) || 30));
  const defaultLogoLeft = Math.max(6, safeLeft - 4);

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
        left: `${defaultLogoLeft}mm`,
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
  logoBarcodeUrl,
}) => {
  const [pageTab, setPageTab] = useState<1 | 2 | 3 | 4>(1);
  const [sampleQrDataUrl, setSampleQrDataUrl] = useState<string>('');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bodyFrameRef = useRef<HTMLDivElement | null>(null);
  const bodyMeasureRef = useRef<HTMLDivElement | null>(null);
  const activeFieldRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [bodyHeightPx, setBodyHeightPx] = useState(0);
  const [frameHeightPx, setFrameHeightPx] = useState(MAX_BODY_HEIGHT_PX);
  const [formatState, setFormatState] = useState<ActiveFormatState>(DEFAULT_FORMAT_STATE);

  useEffect(() => {
    let active = true;
    generateQrWithLogoDataUrl('https://mitra.ndtaxandlaw.com/?verify=ND-PREVIEW', {
      width: 240,
      margin: 1,
      darkColor: '#092147',
      lightColor: '#FFFFFF',
      logoUrl: logoBarcodeUrl,
    })
      .then((url) => {
        if (active) setSampleQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [logoBarcodeUrl]);
  // Mirror ProspectLetterDocument's exact per-page auto-compact levels so Edit matches View 1:1
  const [compactLevels, setCompactLevels] = useState<{ 1: number; 2: number; 3: number; 4: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });

  const patch = <K extends keyof ProspectLetterContent>(key: K, nextVal: ProspectLetterContent[K]) => {
    onChange({ ...value, [key]: nextVal });
  };

  // Query active formatting state at current cursor/selection
  const refreshFormatState = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      const anchorEl = anchor?.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor?.parentElement;
      if (!anchorEl?.closest('.nd-wysiwyg-field')) return;

      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      const strike = document.queryCommandState('strikeThrough');
      const rawColor = document.queryCommandValue('foreColor');
      const color = normalizeHexColor(rawColor) || '#000000';
      setFormatState({ bold, italic, underline, strike, color });
    } catch {
      // Ignore queryCommandState errors in restricted environments
    }
  }, []);

  useEffect(() => {
    const onSelChange = () => refreshFormatState();
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, [refreshFormatState]);

  const resolveTargetField = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const anchor = sel.anchorNode;
      const anchorEl =
        anchor?.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor?.parentElement;
      const matched = anchorEl?.closest('.nd-wysiwyg-field') as HTMLElement | null;
      if (matched) {
        activeFieldRef.current = matched;
        return matched;
      }
    }
    return activeFieldRef.current;
  };

  const applyFormatCommand = (
    cmd: 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'foreColor' | 'removeFormat',
    arg?: string
  ) => {
    const activeEl = resolveTargetField();
    if (!activeEl) return;

    // Ensure focus stays in the active WYSIWYG field
    if (document.activeElement !== activeEl && !activeEl.contains(document.activeElement)) {
      activeEl.focus();
    }

    try {
      if (cmd === 'foreColor' && arg) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, arg);
      } else {
        document.execCommand(cmd, false, arg);
      }
    } catch {
      // Ignore unsupported command
    }

    activeEl.dispatchEvent(new CustomEvent('nd-rich-sync'));
    refreshFormatState();
  };

  const insertPlaceholderToken = (token: string) => {
    const activeEl = resolveTargetField();
    if (!activeEl) return;

    if (document.activeElement !== activeEl && !activeEl.contains(document.activeElement)) {
      activeEl.focus();
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && activeEl.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(token);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      activeEl.appendChild(document.createTextNode(` ${token}`));
    }

    activeEl.dispatchEvent(new CustomEvent('nd-rich-sync'));
    refreshFormatState();
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

  // Reset active page compact level when content changes so it re-evaluates cleanly (exact parity with ProspectLetterDocument)
  useLayoutEffect(() => {
    setCompactLevels((prev) => (prev[pageTab] === 0 ? prev : { ...prev, [pageTab]: 0 }));
  }, [pageTab, value]);

  // Measure active page body height in real time and step compactLevel identically to ProspectLetterDocument
  useLayoutEffect(() => {
    const measureEl = bodyMeasureRef.current;
    const frameEl = bodyFrameRef.current;
    if (!measureEl || !frameEl) return;

    const maxLevel = pageTab === 4 ? 4 : 6;
    const measure = () => {
      const computed = window.getComputedStyle(frameEl);
      const padV =
        (parseFloat(computed.paddingTop || '0') || 0) +
        (parseFloat(computed.paddingBottom || '0') || 0);
      const availableH = Math.max(200, (frameEl.clientHeight || MAX_BODY_HEIGHT_PX) - padV);
      const contentH = Math.ceil(measureEl.scrollHeight);
      setFrameHeightPx(availableH);
      setBodyHeightPx(contentH);
      if (contentH > availableH + 1) {
        setCompactLevels((prev) =>
          prev[pageTab] < maxLevel ? { ...prev, [pageTab]: prev[pageTab] + 1 } : prev
        );
      }
    };

    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(measureEl);
    return () => obs.disconnect();
  }, [pageTab, value, compactLevels]);

  // Exact typography & spacing formulas mirrored from ProspectLetterDocument.tsx
  const p1CompactLevel = compactLevels[1];
  const p2CompactLevel = compactLevels[2];
  const p3CompactLevel = compactLevels[3];
  const p4CompactLevel = compactLevels[4];

  const p1LH = [1.16, 1.13, 1.1, 1.07, 1.04, 1.02, 1.0][p1CompactLevel] || 1.16;
  const p1GapMm = [3.4, 2.7, 2.1, 1.6, 1.2, 0.9, 0.7][p1CompactLevel] || 3.4;
  const p1ItemGapMm = [2.0, 1.6, 1.3, 1.0, 0.8, 0.6, 0.5][p1CompactLevel] || 2.0;
  const p1BodyFont =
    p1CompactLevel >= 6 ? '9.8pt' : p1CompactLevel >= 5 ? '10.2pt' : p1CompactLevel >= 4 ? '10.5pt' : '11pt';
  const p1RecipFont = p1CompactLevel >= 3 ? '10pt' : p1CompactLevel >= 2 ? '10.5pt' : '11pt';

  const p2LH = [1.15, 1.12, 1.09, 1.06, 1.03, 1.01, 0.99][p2CompactLevel] || 1.15;
  const p2ItemGapMm = [1.8, 1.4, 1.1, 0.8, 0.6, 0.45, 0.35][p2CompactLevel] || 1.8;
  const p2SectionGapMm = [4.6, 3.6, 2.8, 2.2, 1.7, 1.3, 1.0][p2CompactLevel] || 4.6;
  const p2BodyFont =
    p2CompactLevel >= 6
      ? '9.6pt'
      : p2CompactLevel >= 5
      ? '10pt'
      : p2CompactLevel >= 4
      ? '10.4pt'
      : p2CompactLevel >= 3
      ? '10.7pt'
      : '11pt';

  const p3LH = [1.16, 1.13, 1.1, 1.07, 1.04, 1.02, 1.0][p3CompactLevel] || 1.16;
  const p3GapMm = [3.4, 2.8, 2.2, 1.7, 1.3, 1.0, 0.8][p3CompactLevel] || 3.4;
  const p3CellPad =
    p3CompactLevel >= 3 ? '1.1mm 2mm' : p3CompactLevel >= 1 ? '1.35mm 2.2mm' : '1.6mm 2.3mm';
  const p3BodyFont =
    p3CompactLevel >= 6 ? '9.8pt' : p3CompactLevel >= 5 ? '10.2pt' : p3CompactLevel >= 4 ? '10.5pt' : '11pt';
  const p3TableFont = p3CompactLevel >= 5 ? '9.6pt' : p3CompactLevel >= 3 ? '10pt' : '10.8pt';

  const p4LH = [1.22, 1.17, 1.12, 1.08, 1.04][p4CompactLevel] || 1.22;
  const p4SigGapMm = [15, 11, 8, 6, 4][p4CompactLevel] || 15;

  const activeBodyFont =
    pageTab === 1 ? p1BodyFont : pageTab === 2 ? p2BodyFont : pageTab === 3 ? p3BodyFont : '11pt';
  const activeBodyLH =
    pageTab === 1 ? p1LH : pageTab === 2 ? p2LH : pageTab === 3 ? p3LH : p4LH;

  const activeMaxCompact = pageTab === 4 ? 4 : 6;
  const activeCompactLevel = compactLevels[pageTab];
  const usagePct = Math.round((bodyHeightPx / frameHeightPx) * 100);
  const overflowPx = Math.max(0, bodyHeightPx - frameHeightPx);
  const isOverflowing = activeCompactLevel >= activeMaxCompact && overflowPx > 2;
  const isNearLimit = !isOverflowing && usagePct >= 96;

  const fieldHandlers = {
    onFieldFocus: (el: HTMLElement) => {
      activeFieldRef.current = el;
    },
    onSelectionActivity: refreshFormatState,
  };

  // Law items helper (Section I, II, III) — all edit actions live in the 30mm right margin gutter (0px layout impact!)
  const renderEditableLawList = (
    sectionKey: 'section1Items' | 'section2Items' | 'section3Items',
    items: ProspectLetterLawItem[],
    itemGapMm: number,
    lastItemGapMm: number
  ) => {
    const updateItem = (idx: number, updated: ProspectLetterLawItem) => {
      const next = items.map((it, i) => (i === idx ? updated : it));
      patch(sectionKey, next);
    };
    const removeItem = (idx: number) => {
      if (items.length <= 1) return;
      patch(sectionKey, items.filter((_, i) => i !== idx));
    };

    return (
      <div>
        {items.map((item, idx) => (
          <div
            key={`${sectionKey}-${idx}`}
            className="group/law"
            style={{
              paddingLeft: '6.5mm',
              marginBottom: idx === items.length - 1 ? `${lastItemGapMm}mm` : `${itemGapMm}mm`,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', position: 'relative' }}>
              <span style={{ width: '6mm', flexShrink: 0 }}>{idx + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <RichEditableField
                  value={item.title}
                  onChange={(title) => updateItem(idx, { ...item, title })}
                  placeholder="Judul pasal / poin"
                  {...fieldHandlers}
                />
              </div>
              {/* Floating right-margin controls (0px impact on body flow) */}
              <div
                style={{
                  position: 'absolute',
                  left: 'calc(100% + 5px)',
                  top: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.bullets.length < 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(idx, { ...item, bullets: [...item.bullets, 'Rincian baru'] })
                    }
                    title="Tambah sub-poin"
                    style={{
                      fontSize: '7pt',
                      fontWeight: 600,
                      color: '#2563eb',
                      backgroundColor: '#eff6ff',
                      border: '1px dashed #93c5fd',
                      borderRadius: '4px',
                      padding: '0 4px',
                      height: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '1px',
                      cursor: 'pointer',
                      opacity: 0.75,
                    }}
                    className="hover:!opacity-100"
                  >
                    <Plus style={{ width: '9px', height: '9px' }} />
                    <span>Sub</span>
                  </button>
                )}
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
                    <Trash2 style={{ width: '11px', height: '11px' }} />
                  </button>
                )}
              </div>
            </div>

            {item.bullets.map((bullet, bIdx) => (
              <div
                key={`${sectionKey}-${idx}-b-${bIdx}`}
                style={{ display: 'flex', textAlign: 'justify', position: 'relative' }}
              >
                <span style={{ width: '6mm', flexShrink: 0 }}>-</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RichEditableField
                    value={bullet}
                    onChange={(val) => {
                      const nextBullets = item.bullets.map((b, i) => (i === bIdx ? val : b));
                      updateItem(idx, { ...item, bullets: nextBullets });
                    }}
                    placeholder="Isi rincian"
                    style={{ textAlign: 'justify' }}
                    {...fieldHandlers}
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
                      position: 'absolute',
                      left: 'calc(100% + 5px)',
                      top: '1px',
                      opacity: 0.35,
                      padding: '1px',
                      color: '#e11d48',
                      cursor: 'pointer',
                    }}
                    className="hover:!opacity-100"
                  >
                    <Trash2 style={{ width: '10px', height: '10px' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
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
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <RichEditableField
          value={value.footerLeftTitle}
          onChange={(v) => patch('footerLeftTitle', v)}
          multiline={false}
          placeholder="Judul kiri"
          style={{ fontWeight: 700, color: '#111111' }}
          {...fieldHandlers}
        />
        {value.footerLeftLines.slice(0, 5).map((line, i) => (
          <RichEditableField
            key={`fl-${i}`}
            value={line}
            onChange={(v) => {
              const next = [...value.footerLeftLines];
              next[i] = v;
              patch('footerLeftLines', next);
            }}
            multiline={false}
            placeholder={`Baris ${i + 1}`}
            {...fieldHandlers}
          />
        ))}
      </div>

      <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
        <RichEditableField
          value={value.footerRightTitle}
          onChange={(v) => patch('footerRightTitle', v)}
          multiline={false}
          placeholder="Judul kanan"
          style={{ fontWeight: 700, color: '#BA984A', textAlign: 'right' }}
          {...fieldHandlers}
        />
        {value.footerRightLines.slice(0, 5).map((line, i) => (
          <RichEditableField
            key={`fr-${i}`}
            value={line}
            onChange={(v) => {
              const next = [...value.footerRightLines];
              next[i] = v;
              patch('footerRightLines', next);
            }}
            multiline={false}
            placeholder={`Baris ${i + 1}`}
            style={{ textAlign: 'right' }}
            {...fieldHandlers}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Hover/focus & empty placeholder CSS scoped specifically to inline WYSIWYG fields */}
      <style>{`
        .nd-wysiwyg-field:hover {
          outline: 1px dashed rgba(59, 130, 246, 0.55) !important;
          background: rgba(239, 246, 255, 0.35) !important;
        }
        .nd-wysiwyg-field:focus {
          outline: 1px solid #2563eb !important;
          background: rgba(239, 246, 255, 0.65) !important;
        }
        .nd-wysiwyg-field:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
      `}</style>

      {/* Sticky Top Control Strip: Page Selector + Rich Text Formatting Toolbar + Overflow Meter */}
      <div className="sticky top-0 z-30 space-y-2 bg-slate-50/95 backdrop-blur-xs pb-1">
        {/* Row 1: Page Tabs & Live Overflow Meter */}
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

        {/* Row 2: Rich Text Formatting Toolbar (Bold, Italic, Underline, Strikethrough, Color, Clear, Company Tag) */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              title="Tebal (Ctrl+B)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatCommand('bold')}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                formatState.bold
                  ? 'bg-[#092147] text-amber-300 border-[#092147]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              aria-label="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              type="button"
              title="Miring (Ctrl+I)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatCommand('italic')}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                formatState.italic
                  ? 'bg-[#092147] text-amber-300 border-[#092147]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              aria-label="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>

            <button
              type="button"
              title="Garis Bawah (Ctrl+U)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatCommand('underline')}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                formatState.underline
                  ? 'bg-[#092147] text-amber-300 border-[#092147]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              aria-label="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>

            <button
              type="button"
              title="Coret"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatCommand('strikeThrough')}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                formatState.strike
                  ? 'bg-[#092147] text-amber-300 border-[#092147]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              aria-label="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Compact Text Color Swatches */}
            <div className="inline-flex items-center gap-1 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              {PROSPECT_TEXT_COLORS.map((swatch) => {
                const isActive = formatState.color === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={`Warna: ${swatch.label}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatCommand('foreColor', swatch.hex)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-[#092147] scale-110 border-white'
                        : 'border-slate-300 hover:scale-110'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                    aria-label={`Warna teks ${swatch.label}`}
                  />
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button
              type="button"
              title="Hapus Format Teks"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormatCommand('removeFormat')}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Normal</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              title="Sisipkan variabel nama perusahaan otomatis ({{NAMA_PERUSAHAAN}})"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertPlaceholderToken('{{NAMA_PERUSAHAAN}}')}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>+ Nama Perusahaan</span>
            </button>
            <button
              type="button"
              title="Sisipkan variabel alamat perusahaan otomatis ({{ALAMAT_PERUSAHAAN}})"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertPlaceholderToken('{{ALAMAT_PERUSAHAAN}}')}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>+ Alamat</span>
            </button>
          </div>
        </div>

        {/* 4-Side Margin & Padding Controls (mm) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-slate-800 w-14 shrink-0">Margin</span>
            {([
              { key: 'marginTopMm', label: 'Atas', min: 15, max: 70, fallback: 40 },
              { key: 'marginBottomMm', label: 'Bawah', min: 15, max: 70, fallback: 40 },
              { key: 'marginLeftMm', label: 'Kiri', min: 10, max: 55, fallback: 30 },
              { key: 'marginRightMm', label: 'Kanan', min: 10, max: 55, fallback: 30 },
            ] as const).map((ctrl) => {
              const currentVal = Number(value[ctrl.key] ?? ctrl.fallback);
              return (
                <div
                  key={ctrl.key}
                  className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                >
                  <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    {ctrl.label}
                  </span>
                  <input
                    type="number"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={1}
                    value={Number.isFinite(currentVal) ? currentVal : ctrl.fallback}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (!Number.isFinite(parsed)) return;
                      const clamped = Math.min(ctrl.max, Math.max(ctrl.min, Math.round(parsed * 10) / 10));
                      patch(ctrl.key, clamped);
                    }}
                    aria-label={`Margin ${ctrl.label} (mm)`}
                    className="w-13 px-1 py-0.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-[#092147]/30"
                  />
                  <span className="text-[10px] font-semibold text-slate-500">mm</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-slate-800 w-14 shrink-0">Padding</span>
            {([
              { key: 'paddingTopMm', label: 'Atas', min: 0, max: 30, fallback: 0 },
              { key: 'paddingBottomMm', label: 'Bawah', min: 0, max: 30, fallback: 0 },
              { key: 'paddingLeftMm', label: 'Kiri', min: 0, max: 30, fallback: 0 },
              { key: 'paddingRightMm', label: 'Kanan', min: 0, max: 30, fallback: 0 },
            ] as const).map((ctrl) => {
              const currentVal = Number(value[ctrl.key] ?? ctrl.fallback);
              return (
                <div
                  key={ctrl.key}
                  className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                >
                  <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    {ctrl.label}
                  </span>
                  <input
                    type="number"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={1}
                    value={Number.isFinite(currentVal) ? currentVal : ctrl.fallback}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (!Number.isFinite(parsed)) return;
                      const clamped = Math.min(ctrl.max, Math.max(ctrl.min, Math.round(parsed * 10) / 10));
                      patch(ctrl.key, clamped);
                    }}
                    aria-label={`Padding ${ctrl.label} (mm)`}
                    className="w-13 px-1 py-0.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-[#092147]/30"
                  />
                  <span className="text-[10px] font-semibold text-slate-500">mm</span>
                </div>
              );
            })}
            {((value.marginTopMm ?? 40) !== 40 ||
              (value.marginBottomMm ?? 40) !== 40 ||
              (value.marginLeftMm ?? 30) !== 30 ||
              (value.marginRightMm ?? 30) !== 30 ||
              (value.paddingTopMm ?? 0) !== 0 ||
              (value.paddingBottomMm ?? 0) !== 0 ||
              (value.paddingLeftMm ?? 0) !== 0 ||
              (value.paddingRightMm ?? 0) !== 0) && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    marginTopMm: 40,
                    marginBottomMm: 40,
                    marginLeftMm: 30,
                    marginRightMm: 30,
                    paddingTopMm: 0,
                    paddingBottomMm: 0,
                    paddingLeftMm: 0,
                    paddingRightMm: 0,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Spasi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live A4 Paper Sheet Stage */}
      <div className="bg-slate-700/90 rounded-xl p-2 sm:p-5 overflow-hidden">
        <div ref={stageRef} className="w-full max-w-[794px] mx-auto">
          <div
            style={{
              width: `${Math.round(A4_WIDTH_PX * scale)}px`,
              height: `${Math.round(A4_HEIGHT_PX * scale)}px`,
              margin: '0 auto',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isOverflowing
                ? '0 0 0 3px #f43f5e, 0 10px 30px rgba(15, 23, 42, 0.35)'
                : '0 10px 30px rgba(15, 23, 42, 0.35)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${A4_WIDTH_PX}px`,
                minWidth: `${A4_WIDTH_PX}px`,
                maxWidth: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                overflow: 'hidden',
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11pt',
                WebkitTextSizeAdjust: 'none',
                textSizeAdjust: 'none',
              }}
            >
            {/* Header Logo */}
            <EditorHeaderLogo logoUrl={logoUrl} marginLeftMm={value.marginLeftMm ?? 30} />

            {/* Red Dashed Bottom Margin Guide when near or over limit */}
            {(isOverflowing || isNearLimit) && (
              <div
                style={{
                  position: 'absolute',
                  bottom: `${Math.min(70, Math.max(15, Number(value.marginBottomMm ?? 40) || 40))}mm`,
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

            {/* Editable A4 Body Content Area (Dynamic 4-Side Margin & Padding — mirrors ProspectLetterDocument 1:1) */}
            <div
              ref={bodyFrameRef}
              style={{
                position: 'absolute',
                top: `${Math.min(70, Math.max(15, Number(value.marginTopMm ?? 40) || 40))}mm`,
                bottom: `${Math.min(70, Math.max(15, Number(value.marginBottomMm ?? 40) || 40))}mm`,
                left: `${Math.min(55, Math.max(10, Number(value.marginLeftMm ?? 30) || 30))}mm`,
                right: `${Math.min(55, Math.max(10, Number(value.marginRightMm ?? 30) || 30))}mm`,
                paddingTop: `${Math.min(30, Math.max(0, Number(value.paddingTopMm ?? 0) || 0))}mm`,
                paddingBottom: `${Math.min(30, Math.max(0, Number(value.paddingBottomMm ?? 0) || 0))}mm`,
                paddingLeft: `${Math.min(30, Math.max(0, Number(value.paddingLeftMm ?? 0) || 0))}mm`,
                paddingRight: `${Math.min(30, Math.max(0, Number(value.paddingRightMm ?? 0) || 0))}mm`,
                boxSizing: 'border-box',
                overflow: 'visible',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: activeBodyFont,
                lineHeight: activeBodyLH,
                color: '#000000',
                zIndex: 10,
              }}
            >
              <div ref={bodyMeasureRef}>
                {/* ===================== HALAMAN 1 ===================== */}
                {pageTab === 1 && (
                  <>
                    <div style={{ marginBottom: '0.6mm' }}>
                      <RichEditableField
                        value={value.dateLine}
                        onChange={(v) => {
                          const extractedCity = v.split(',')[0]?.replace(/[*_~]/g, '').trim();
                          onChange({
                            ...value,
                            dateLine: v,
                            city: extractedCity || value.city,
                          });
                        }}
                        multiline={false}
                        placeholder="Jakarta, {{TANGGAL_SURAT}}"
                        style={{ textAlign: 'right' }}
                        {...fieldHandlers}
                      />
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
                          <td style={{ width: '25mm', padding: 0, verticalAlign: 'top' }}>
                            <RichEditableField
                              value={value.metaNomorLabel}
                              onChange={(v) => patch('metaNomorLabel', v)}
                              multiline={false}
                              placeholder="Nomor"
                              {...fieldHandlers}
                            />
                          </td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                              <span>:</span>
                              <RichEditableField
                                value={value.nomorValue}
                                onChange={(v) => patch('nomorValue', v)}
                                multiline={false}
                                placeholder="{{NOMOR_SURAT}}"
                                {...fieldHandlers}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <RichEditableField
                              value={value.metaSifatLabel}
                              onChange={(v) => patch('metaSifatLabel', v)}
                              multiline={false}
                              placeholder="Sifat"
                              {...fieldHandlers}
                            />
                          </td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                              <span>:</span>
                              <RichEditableField
                                value={value.sifat}
                                onChange={(v) => patch('sifat', v)}
                                multiline={false}
                                placeholder="Sifat"
                                {...fieldHandlers}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <RichEditableField
                              value={value.metaLampiranLabel}
                              onChange={(v) => patch('metaLampiranLabel', v)}
                              multiline={false}
                              placeholder="Lampiran"
                              {...fieldHandlers}
                            />
                          </td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                              <span>:</span>
                              <RichEditableField
                                value={value.lampiran}
                                onChange={(v) => patch('lampiran', v)}
                                multiline={false}
                                placeholder="Lampiran"
                                {...fieldHandlers}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <RichEditableField
                              value={value.metaPerihalLabel}
                              onChange={(v) => patch('metaPerihalLabel', v)}
                              multiline={false}
                              placeholder="Perihal"
                              {...fieldHandlers}
                            />
                          </td>
                          <td style={{ padding: 0, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                              <span>:</span>
                              <RichEditableField
                                value={value.perihal}
                                onChange={(v) => patch('perihal', v)}
                                multiline={false}
                                placeholder="Perihal"
                                {...fieldHandlers}
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginBottom: `${p1GapMm}mm`, fontSize: p1RecipFont, wordBreak: 'break-word' }}>
                      <RichEditableField
                        value={value.recipientBlock}
                        onChange={(v) => patch('recipientBlock', v)}
                        placeholder={'Kepada Yth\nPimpinan/Direksi {{NAMA_PERUSAHAAN}}\nAlamat: {{ALAMAT_PERUSAHAAN}}'}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ marginBottom: '0.5mm' }}>
                      <RichEditableField
                        value={value.greeting}
                        onChange={(v) => patch('greeting', v)}
                        multiline={false}
                        placeholder="Salam pembuka"
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ marginBottom: `${p1GapMm}mm` }}>
                      <RichEditableField
                        value={value.introPara1}
                        onChange={(v) => patch('introPara1', v)}
                        placeholder="Paragraf pembuka 1"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ marginBottom: `${p1GapMm + 1}mm` }}>
                      <RichEditableField
                        value={value.introPara2}
                        onChange={(v) => patch('introPara2', v)}
                        placeholder="Paragraf pembuka 2"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ fontWeight: 700, marginBottom: `${Math.max(1.6, p1GapMm * 0.85)}mm` }}>
                      <RichEditableField
                        value={value.sectionMainTitle}
                        onChange={(v) => patch('sectionMainTitle', v)}
                        placeholder="Judul bagian utama"
                        style={{ fontWeight: 700 }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.6mm', position: 'relative' }}>
                      <span style={{ width: '6.5mm', flexShrink: 0 }}>I.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.section1Title}
                          onChange={(v) => patch('section1Title', v)}
                          multiline={false}
                          placeholder="Judul Bagian I"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                      {value.section1Items.length < 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('section1Items', [
                              ...value.section1Items,
                              { title: 'Dasar hukum baru', bullets: ['Keterangan poin'] },
                            ])
                          }
                          title="Tambah poin Bagian I"
                          style={{
                            position: 'absolute',
                            left: 'calc(100% + 5px)',
                            top: 0,
                            fontSize: '7.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '0 6px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus style={{ width: '10px', height: '10px' }} />
                          <span>Poin</span>
                        </button>
                      )}
                    </div>

                    {renderEditableLawList(
                      'section1Items',
                      value.section1Items,
                      p1ItemGapMm,
                      Math.max(1.8, p1ItemGapMm + 0.4)
                    )}

                    <div
                      style={{
                        marginLeft: '6.5mm',
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.5mm 2.5mm',
                        textAlign: 'justify',
                      }}
                    >
                      <RichEditableField
                        value={value.section1Sanction}
                        onChange={(v) => patch('section1Sanction', v)}
                        placeholder="Teks kotak sanksi I"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>
                  </>
                )}

                {/* ===================== HALAMAN 2 ===================== */}
                {pageTab === 2 && (
                  <>
                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm', position: 'relative' }}>
                      <span style={{ width: '6.5mm', flexShrink: 0 }}>II.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.section2Title}
                          onChange={(v) => patch('section2Title', v)}
                          multiline={false}
                          placeholder="Judul Bagian II"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                      {value.section2Items.length < 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('section2Items', [
                              ...value.section2Items,
                              { title: 'Dasar hukum baru', bullets: ['Keterangan poin'] },
                            ])
                          }
                          title="Tambah poin Bagian II"
                          style={{
                            position: 'absolute',
                            left: 'calc(100% + 5px)',
                            top: 0,
                            fontSize: '7.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '0 6px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus style={{ width: '10px', height: '10px' }} />
                          <span>Poin</span>
                        </button>
                      )}
                    </div>

                    {renderEditableLawList(
                      'section2Items',
                      value.section2Items,
                      p2ItemGapMm,
                      Math.max(1.5, p2ItemGapMm + 0.4)
                    )}

                    <div
                      style={{
                        marginLeft: '6.5mm',
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.4mm 2.5mm',
                        textAlign: 'justify',
                        marginBottom: `${p2SectionGapMm}mm`,
                      }}
                    >
                      <RichEditableField
                        value={value.section2Sanction}
                        onChange={(v) => patch('section2Sanction', v)}
                        placeholder="Teks kotak sanksi II"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm', position: 'relative' }}>
                      <span style={{ width: '6.5mm', flexShrink: 0 }}>III.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.section3Title}
                          onChange={(v) => patch('section3Title', v)}
                          multiline={false}
                          placeholder="Judul Bagian III"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                      {value.section3Items.length < 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('section3Items', [
                              ...value.section3Items,
                              { title: 'Dasar hukum baru', bullets: ['Keterangan poin'] },
                            ])
                          }
                          title="Tambah poin Bagian III"
                          style={{
                            position: 'absolute',
                            left: 'calc(100% + 5px)',
                            top: 0,
                            fontSize: '7.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '0 6px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus style={{ width: '10px', height: '10px' }} />
                          <span>Poin</span>
                        </button>
                      )}
                    </div>

                    {renderEditableLawList(
                      'section3Items',
                      value.section3Items,
                      p2ItemGapMm,
                      Math.max(1.5, p2ItemGapMm + 0.4)
                    )}

                    <div
                      style={{
                        marginLeft: '6.5mm',
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #000000',
                        padding: '1.4mm 2.5mm',
                        textAlign: 'justify',
                      }}
                    >
                      <RichEditableField
                        value={value.section3Sanction}
                        onChange={(v) => patch('section3Sanction', v)}
                        placeholder="Teks kotak sanksi III"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>
                  </>
                )}

                {/* ===================== HALAMAN 3 ===================== */}
                {pageTab === 3 && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: `${p3GapMm}mm` }}>
                      <RichEditableField
                        value={value.aboutTitle}
                        onChange={(v) => patch('aboutTitle', v)}
                        multiline={false}
                        placeholder="Judul tentang perusahaan"
                        style={{ fontWeight: 700 }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ marginBottom: `${p3GapMm}mm` }}>
                      <RichEditableField
                        value={value.aboutPara}
                        onChange={(v) => patch('aboutPara', v)}
                        placeholder="Profil singkat"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '0.5mm', position: 'relative' }}>
                      <span style={{ width: '6.5mm', flexShrink: 0 }}>I.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.servicesTitle}
                          onChange={(v) => patch('servicesTitle', v)}
                          multiline={false}
                          placeholder="Judul layanan"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                      {value.servicesItems.length < 8 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('servicesItems', [
                              ...value.servicesItems,
                              { lead: 'Layanan Baru:', body: 'deskripsi layanan' },
                            ])
                          }
                          title="Tambah layanan"
                          style={{
                            position: 'absolute',
                            left: 'calc(100% + 5px)',
                            top: 0,
                            fontSize: '7.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '0 6px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus style={{ width: '10px', height: '10px' }} />
                          <span>Layanan</span>
                        </button>
                      )}
                    </div>

                    <div style={{ paddingLeft: '6.5mm', marginBottom: '1.2mm' }}>
                      <RichEditableField
                        value={value.servicesIntro}
                        onChange={(v) => patch('servicesIntro', v)}
                        placeholder="Pengantar layanan"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ paddingLeft: '12.5mm', marginBottom: `${Math.max(1.8, p3GapMm * 0.85)}mm` }}>
                      {value.servicesItems.map((svc: ProspectLetterServiceItem, idx) => (
                        <div
                          key={`svc-${idx}`}
                          style={{
                            display: 'flex',
                            marginBottom: idx === value.servicesItems.length - 1 ? 0 : '0.8mm',
                            textAlign: 'justify',
                            position: 'relative',
                          }}
                        >
                          <span style={{ width: '5.5mm', flexShrink: 0 }}>{idx + 1}.</span>
                          {/* Inline lead + body matches ProspectLetterDocument 1:1 */}
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'justify' }}>
                            <RichEditableField
                              inline
                              value={svc.lead}
                              onChange={(v) => {
                                const next = value.servicesItems.map((it, i) =>
                                  i === idx ? { ...it, lead: v } : it
                                );
                                patch('servicesItems', next);
                              }}
                              multiline={false}
                              placeholder="Judul layanan:"
                              style={{ fontWeight: 700 }}
                              {...fieldHandlers}
                            />
                            {' '}
                            <RichEditableField
                              inline
                              value={svc.body}
                              onChange={(v) => {
                                const next = value.servicesItems.map((it, i) =>
                                  i === idx ? { ...it, body: v } : it
                                );
                                patch('servicesItems', next);
                              }}
                              placeholder="deskripsi layanan"
                              {...fieldHandlers}
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
                                position: 'absolute',
                                left: 'calc(100% + 5px)',
                                top: '1px',
                                opacity: 0.4,
                                padding: '2px',
                                color: '#e11d48',
                                cursor: 'pointer',
                              }}
                              className="hover:!opacity-100"
                            >
                              <Trash2 style={{ width: '11px', height: '11px' }} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: `${p3GapMm + 1}mm` }}>
                      <RichEditableField
                        value={value.servicesCaseNote}
                        onChange={(v) => patch('servicesCaseNote', v)}
                        placeholder="Catatan case-by-case"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '1.4mm', position: 'relative' }}>
                      <span style={{ width: '6.5mm', flexShrink: 0 }}>II.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.comparisonTitle}
                          onChange={(v) => patch('comparisonTitle', v)}
                          multiline={false}
                          placeholder="Judul perbandingan"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                      {value.comparisonRows.length < 8 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch('comparisonRows', [
                              ...value.comparisonRows,
                              { component: 'Komponen baru', internalStaff: '-', consultant: '-' },
                            ])
                          }
                          title="Tambah baris tabel"
                          style={{
                            position: 'absolute',
                            left: 'calc(100% + 5px)',
                            top: 0,
                            fontSize: '7.5pt',
                            fontWeight: 600,
                            color: '#092147',
                            backgroundColor: '#eff6ff',
                            border: '1px dashed #93c5fd',
                            borderRadius: '4px',
                            padding: '0 6px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus style={{ width: '10px', height: '10px' }} />
                          <span>Baris</span>
                        </button>
                      )}
                    </div>

                    <div style={{ marginBottom: '1.2mm' }}>
                      <RichEditableField
                        value={value.comparisonIntro}
                        onChange={(v) => patch('comparisonIntro', v)}
                        multiline={false}
                        placeholder="Pengantar tabel"
                        {...fieldHandlers}
                      />
                    </div>

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
                        <tr style={{ backgroundColor: '#DFDCCE' }}>
                          {([0, 1, 2] as const).map((colIdx) => (
                            <th
                              key={`hdr-${colIdx}`}
                              style={{
                                border: '1px solid #000000',
                                padding: p3CellPad,
                                textAlign: 'left',
                                width: colIdx === 0 ? '34%' : colIdx === 1 ? '40%' : '26%',
                                fontWeight: 700,
                              }}
                            >
                              <RichEditableField
                                value={value.comparisonHeaders[colIdx]}
                                onChange={(v) => {
                                  const next: [string, string, string] = [...value.comparisonHeaders];
                                  next[colIdx] = v;
                                  patch('comparisonHeaders', next);
                                }}
                                multiline={false}
                                placeholder={`Kolom ${colIdx + 1}`}
                                style={{ fontWeight: 700 }}
                                {...fieldHandlers}
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {value.comparisonRows.map((row: ProspectLetterComparisonRow, rIdx) => (
                          <tr key={`row-${rIdx}`}>
                            <td style={{ border: '1px solid #000000', padding: p3CellPad }}>
                              <RichEditableField
                                value={row.component}
                                onChange={(v) => {
                                  const next = value.comparisonRows.map((r, i) =>
                                    i === rIdx ? { ...r, component: v } : r
                                  );
                                  patch('comparisonRows', next);
                                }}
                                multiline={false}
                                placeholder="Komponen"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ border: '1px solid #000000', padding: p3CellPad }}>
                              <RichEditableField
                                value={row.internalStaff}
                                onChange={(v) => {
                                  const next = value.comparisonRows.map((r, i) =>
                                    i === rIdx ? { ...r, internalStaff: v } : r
                                  );
                                  patch('comparisonRows', next);
                                }}
                                multiline={false}
                                placeholder="Internal"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ border: '1px solid #000000', padding: p3CellPad, position: 'relative' }}>
                              <RichEditableField
                                value={row.consultant}
                                onChange={(v) => {
                                  const next = value.comparisonRows.map((r, i) =>
                                    i === rIdx ? { ...r, consultant: v } : r
                                  );
                                  patch('comparisonRows', next);
                                }}
                                multiline={false}
                                placeholder="Konsultan"
                                style={{ fontWeight: rIdx === 0 ? 700 : 400 }}
                                {...fieldHandlers}
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
                                    position: 'absolute',
                                    left: 'calc(100% + 5px)',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    opacity: 0.4,
                                    padding: '2px',
                                    color: '#e11d48',
                                    cursor: 'pointer',
                                  }}
                                  className="hover:!opacity-100"
                                >
                                  <Trash2 style={{ width: '11px', height: '11px' }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <RichEditableField
                      value={value.comparisonClosing}
                      onChange={(v) => patch('comparisonClosing', v)}
                      placeholder="Penutup perbandingan"
                      style={{ textAlign: 'justify' }}
                      {...fieldHandlers}
                    />
                  </>
                )}

                {/* ===================== HALAMAN 4 ===================== */}
                {pageTab === 4 && (
                  <>
                    <div style={{ display: 'flex', fontWeight: 700, marginBottom: '2.4mm' }}>
                      <span style={{ width: '8mm', flexShrink: 0 }}>III.</span>
                      <div style={{ flex: 1 }}>
                        <RichEditableField
                          value={value.consultTitle}
                          onChange={(v) => patch('consultTitle', v)}
                          multiline={false}
                          placeholder="Judul bagian III"
                          style={{ fontWeight: 700 }}
                          {...fieldHandlers}
                        />
                      </div>
                    </div>

                    <div style={{ paddingLeft: '8mm', marginBottom: '7.5mm' }}>
                      <RichEditableField
                        value={value.consultPara}
                        onChange={(v) => patch('consultPara', v)}
                        placeholder="Paragraf konsultasi"
                        style={{ textAlign: 'justify' }}
                        {...fieldHandlers}
                      />
                    </div>

                    <div
                      style={{
                        marginLeft: '8mm',
                        border: '1px solid #000000',
                        padding: '3.8mm 4.2mm',
                        marginBottom: '7mm',
                      }}
                    >
                      <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3.2mm' }}>
                        <RichEditableField
                          value={value.mitraBoxTitle}
                          onChange={(v) => patch('mitraBoxTitle', v)}
                          multiline={false}
                          placeholder="Mitra Strategis"
                          style={{ fontWeight: 700, textDecoration: 'underline' }}
                          {...fieldHandlers}
                        />
                      </div>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11pt', lineHeight: 1.3 }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '24mm', padding: 0 }}>
                              <RichEditableField
                                value={value.mitraBoxNameLabel}
                                onChange={(v) => patch('mitraBoxNameLabel', v)}
                                multiline={false}
                                placeholder="Nama"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ padding: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                                <span>:</span>
                                <RichEditableField
                                  value={value.mitraBoxNameValue}
                                  onChange={(v) => patch('mitraBoxNameValue', v)}
                                  multiline={false}
                                  placeholder="{{NAMA_MITRA}}"
                                  {...fieldHandlers}
                                />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>
                              <RichEditableField
                                value={value.mitraBoxIdLabel}
                                onChange={(v) => patch('mitraBoxIdLabel', v)}
                                multiline={false}
                                placeholder="No. ID"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ padding: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                                <span>:</span>
                                <RichEditableField
                                  value={value.mitraBoxIdValue}
                                  onChange={(v) => patch('mitraBoxIdValue', v)}
                                  multiline={false}
                                  placeholder="{{ID_MITRA}}"
                                  {...fieldHandlers}
                                />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>
                              <RichEditableField
                                value={value.mitraBoxPhoneLabel}
                                onChange={(v) => patch('mitraBoxPhoneLabel', v)}
                                multiline={false}
                                placeholder="Whatsapp"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ padding: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                                <span>:</span>
                                <RichEditableField
                                  value={value.mitraBoxPhoneValue}
                                  onChange={(v) => patch('mitraBoxPhoneValue', v)}
                                  multiline={false}
                                  placeholder="{{WA_MITRA}}"
                                  {...fieldHandlers}
                                />
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 0 }}>
                              <RichEditableField
                                value={value.mitraBoxEmailLabel}
                                onChange={(v) => patch('mitraBoxEmailLabel', v)}
                                multiline={false}
                                placeholder="Email"
                                {...fieldHandlers}
                              />
                            </td>
                            <td style={{ padding: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px' }}>
                                <span>:</span>
                                <RichEditableField
                                  value={value.mitraBoxEmailValue}
                                  onChange={(v) => patch('mitraBoxEmailValue', v)}
                                  multiline={false}
                                  placeholder="{{EMAIL_MITRA}}"
                                  {...fieldHandlers}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ paddingLeft: '8mm', marginBottom: `${p4SigGapMm}mm` }}>
                      <RichEditableField
                        value={value.closingPara}
                        onChange={(v) => patch('closingPara', v)}
                        placeholder="Paragraf penutup"
                        {...fieldHandlers}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12mm' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <RichEditableField
                          value={value.directorSignHeading}
                          onChange={(v) => patch('directorSignHeading', v)}
                          multiline={false}
                          placeholder="Mengetahui,"
                          style={{ textAlign: 'center' }}
                          {...fieldHandlers}
                        />
                        <div style={{ marginBottom: '3.5mm' }}>
                          <RichEditableField
                            value={value.directorFirmLabel}
                            onChange={(v) => patch('directorFirmLabel', v)}
                            multiline={false}
                            placeholder="Nama firma"
                            style={{ fontWeight: 700, textAlign: 'center' }}
                            {...fieldHandlers}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                          {sampleQrDataUrl ? (
                            <img
                              src={sampleQrDataUrl}
                              alt="Preview QR Direktur"
                              style={{ width: '27mm', height: '27mm', objectFit: 'contain' }}
                            />
                          ) : (
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
                          )}
                        </div>
                        <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                          Ditandatangani secara elektronik
                        </div>
                        <RichEditableField
                          value={value.directorName}
                          onChange={(v) => patch('directorName', v)}
                          multiline={false}
                          placeholder="Nama direktur"
                          style={{ fontWeight: 700, textAlign: 'center' }}
                          {...fieldHandlers}
                        />
                        <RichEditableField
                          value={value.directorTitle}
                          onChange={(v) => patch('directorTitle', v)}
                          multiline={false}
                          placeholder="Jabatan direktur"
                          style={{ textAlign: 'center' }}
                          {...fieldHandlers}
                        />
                      </div>

                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <RichEditableField
                          value={value.mitraSignHeading}
                          onChange={(v) => patch('mitraSignHeading', v)}
                          multiline={false}
                          placeholder="Hormat Kami,"
                          style={{ textAlign: 'center' }}
                          {...fieldHandlers}
                        />
                        <div style={{ marginBottom: '3.5mm' }}>
                          <RichEditableField
                            value={value.mitraSignerLabel}
                            onChange={(v) => patch('mitraSignerLabel', v)}
                            multiline={false}
                            placeholder="Label mitra"
                            style={{ fontWeight: 700, textAlign: 'center' }}
                            {...fieldHandlers}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4mm' }}>
                          {sampleQrDataUrl ? (
                            <img
                              src={sampleQrDataUrl}
                              alt="Preview QR Mitra"
                              style={{ width: '27mm', height: '27mm', objectFit: 'contain' }}
                            />
                          ) : (
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
                          )}
                        </div>
                        <div style={{ fontSize: '9.5pt', color: '#999999', marginBottom: '3.5mm' }}>
                          Ditandatangani secara elektronik
                        </div>
                        <RichEditableField
                          value={value.mitraSignerName}
                          onChange={(v) => patch('mitraSignerName', v)}
                          multiline={false}
                          placeholder="{{NAMA_MITRA}}"
                          style={{ fontWeight: 700, textAlign: 'center' }}
                          {...fieldHandlers}
                        />
                        <RichEditableField
                          value={value.mitraRoleLabel}
                          onChange={(v) => patch('mitraRoleLabel', v)}
                          multiline={false}
                          placeholder="Jabatan mitra"
                          style={{ textAlign: 'center' }}
                          {...fieldHandlers}
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
    </div>
  );
};
