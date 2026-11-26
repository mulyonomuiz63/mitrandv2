import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  ProspectLetter,
  ProspectLetterContent,
} from '../types';
import {
  buildDirectorQrUrl,
  buildMitraQrUrl,
  generateQrDataUrl,
} from '../utils/prospectLetterPdf';
import { ProspectLetterDocument } from './ProspectLetterDocument';

interface ProspectLetterPreviewModalProps {
  letter: ProspectLetter | null;
  logoUrl?: string;
  logoBarcodeUrl?: string;
  masterTemplate?: Partial<ProspectLetterContent> | null;
  onClose: () => void;
}

export const ProspectLetterPreviewModal: React.FC<ProspectLetterPreviewModalProps> = ({
  letter,
  logoUrl,
  logoBarcodeUrl,
  masterTemplate,
  onClose,
}) => {
  const [directorQr, setDirectorQr] = useState<string>('');
  const [mitraQr, setMitraQr] = useState<string>('');

  useEffect(() => {
    if (!letter) return;
    let active = true;
    Promise.all([
      generateQrDataUrl(buildDirectorQrUrl(letter), logoBarcodeUrl),
      generateQrDataUrl(buildMitraQrUrl(letter.mitraMemberCode), logoBarcodeUrl),
    ])
      .then(([dUrl, mUrl]) => {
        if (!active) return;
        setDirectorQr(dUrl);
        setMitraQr(mUrl);
      })
      .catch((err) => console.error('QR generation failed:', err));
    return () => {
      active = false;
    };
  }, [letter, logoBarcodeUrl]);

  if (!letter) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col print:hidden">
      {/* Clean Header Bar — Title & Close Only */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
            Surat Penawaran — {letter.companyName}
          </h2>
          <span className="text-xs font-mono text-slate-500">· {letter.letterNumber}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Tutup Pratinjau"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable 4-Page A4 Preview Canvas (Identical Desktop A4 Layout Scaled Proportionally on Mobile) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-6 py-4 sm:py-6 bg-slate-800/95 space-y-4 sm:space-y-6">
        <ProspectLetterDocument
          letter={letter}
          logoUrl={logoUrl}
          masterTemplate={masterTemplate}
          directorQr={directorQr}
          mitraQr={mitraQr}
          mode="preview"
        />
      </div>
    </div>
  );
};
