import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog(options);
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(confirmed);
      resolverRef.current = null;
    }
    setDialog(null);
  };

  const getVariantConfig = (variant: ConfirmOptions['variant'] = 'primary') => {
    switch (variant) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
          badge: 'KONFIRMASI OTORISASI',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'danger':
        return {
          icon: ShieldAlert,
          iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          badge: 'KONFIRMASI TINDAKAN PENTING',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          badge: 'PERHATIAN SEBELUM PROSES',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      default:
        return {
          icon: HelpCircle,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
          btnClass: 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20',
          badge: 'KONFIRMASI PROSES SISTEM',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        };
    }
  };

  const cfg = getVariantConfig(dialog?.variant);
  const IconComp = cfg.icon;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[200] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.badgeClass}`}>
                      {cfg.badge}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                      {dialog.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-4">
                {dialog.message}
              </p>

              {dialog.detail && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                  {dialog.detail}
                </div>
              )}

              <div className="mt-4 p-2.5 rounded-lg bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Pilih <strong>Batalkan</strong> jika belum yakin, atau <strong>Lanjutkan</strong> untuk memproses.</span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
              >
                {dialog.cancelText || 'Batalkan'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${cfg.btnClass}`}
              >
                {dialog.confirmText || 'Ya, Lanjutkan Proses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};
