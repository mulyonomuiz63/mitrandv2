import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, Sparkles, Trash2, Edit3, PlusCircle, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  type?: 'primary' | 'success' | 'warning' | 'danger';
}

export interface AlertPopupOptions {
  title: string;
  message: string;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE' | 'INFO' | 'ERROR';
  entityName?: string;
  variant?: 'success' | 'info' | 'warning' | 'danger';
  type?: 'success' | 'info' | 'warning' | 'danger' | 'error';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type AlertFn = (options: AlertPopupOptions) => void;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);
const AlertPopupContext = createContext<AlertFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
};

export const useAlert = (): AlertFn => {
  const ctx = useContext(AlertPopupContext);
  if (!ctx) {
    return () => {};
  }
  return ctx;
};

function resolveEntityLabelFromUrl(url: string): string {
  if (url.includes('/api/mitra')) return 'Data Mitra Konsultan';
  if (url.includes('/api/services')) return 'Layanan Pajak & Hukum';
  if (url.includes('/api/clients')) return 'Data & Kontrak Klien';
  if (url.includes('/api/commissions')) return 'Pencairan Komisi & Payout';
  if (url.includes('/api/marketing-tools')) return 'Materi & Tools Marketing';
  if (url.includes('/api/staff')) return 'Akun Staf Operasional';
  if (url.includes('/api/admin/profile')) return 'Profil & Kredensial Admin';
  if (url.includes('/api/settings')) return 'Pengaturan Sistem NDTAXANDLAW';
  if (url.includes('/api/roles')) return 'Manajemen Role & Hak Akses';
  if (url.includes('/api/chat/rooms')) return 'Grup & Ruang Percakapan';
  if (url.includes('/api/chat/settings')) return 'Manajemen Live Chat';
  if (url.includes('/api/system/database')) return 'Database Sistem';
  if (url.includes('/api/auth/')) return 'Keamanan & Autentikasi Akun';
  return 'Data Sistem Operasional';
}

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [alertPopup, setAlertPopup] = useState<AlertPopupOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog(options);
    });
  }, []);

  const showAlert = useCallback((options: AlertPopupOptions) => {
    setAlertPopup(options);
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(confirmed);
      resolverRef.current = null;
    }
    setDialog(null);
  };

  // Global interceptor for all CREATE (POST), UPDATE (PUT/PATCH), and DELETE operations
  useEffect(() => {
    if (typeof window === 'undefined' || !window.fetch) return;
    const rawFetch = window.fetch;
    const originalFetch = rawFetch.bind(window);

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const method = (init?.method || 'GET').toUpperCase();
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url || '';

      // Check if caller requested to skip CRUD alert popup via header
      let skipAlert = false;
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          skipAlert = init.headers.get('x-skip-crud-alert') === 'true';
        } else if (Array.isArray(init.headers)) {
          skipAlert = init.headers.some(
            ([k, v]) => k.toLowerCase() === 'x-skip-crud-alert' && v === 'true'
          );
        } else if (typeof init.headers === 'object') {
          const h = init.headers as Record<string, string>;
          skipAlert = h['x-skip-crud-alert'] === 'true' || h['X-Skip-Crud-Alert'] === 'true';
        }
      }

      const response = await originalFetch(input, init);

      // Only intercept API mutation calls (POST, PUT, PATCH, DELETE)
      if (
        !skipAlert &&
        urlStr.includes('/api/') &&
        (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')
      ) {
        // Skip silent background endpoints or real-time chat message send
        const isSilentEndpoint =
          urlStr.includes('/api/auth/login') ||
          urlStr.includes('/api/notifications/read-all') ||
          urlStr.includes('/api/supabase/test') ||
          urlStr.includes('/api/chat/link-preview') ||
          urlStr.includes('/api/chat/rooms/direct') ||
          urlStr.includes('/api/ai/') ||
          (urlStr.includes('/api/chat/messages') && method === 'POST');

        if (!isSilentEndpoint) {
          try {
            const cloned = response.clone();
            const data = await cloned.json();
            const entityName = resolveEntityLabelFromUrl(urlStr);

            let opType: 'CREATE' | 'UPDATE' | 'DELETE' =
              method === 'DELETE' ? 'DELETE' : method === 'POST' ? 'CREATE' : 'UPDATE';

            if (urlStr.includes('/delete') || urlStr.includes('/terminate') || urlStr.includes('/reject')) {
              opType = method === 'DELETE' ? 'DELETE' : 'UPDATE';
            }

            if (response.ok && data && data.success !== false) {
              const defaultTitles: Record<'CREATE' | 'UPDATE' | 'DELETE', string> = {
                CREATE: `Penambahan ${entityName} Berhasil`,
                UPDATE: `Pembaruan ${entityName} Berhasil`,
                DELETE: `Penghapusan ${entityName} Berhasil`,
              };
              const defaultMessages: Record<'CREATE' | 'UPDATE' | 'DELETE', string> = {
                CREATE: `${entityName} baru telah berhasil dibuat dan disimpan ke dalam database sistem NDTAXANDLAW.`,
                UPDATE: `Perubahan pada ${entityName} telah berhasil diperbarui dan disinkronkan secara real-time.`,
                DELETE: `${entityName} telah berhasil dihapus secara permanen dari sistem.`,
              };

              setAlertPopup({
                title: defaultTitles[opType],
                message: data.message || defaultMessages[opType],
                operation: opType,
                entityName,
                variant: opType === 'DELETE' ? 'warning' : 'success',
              });
            } else if (!response.ok || (data && data.success === false)) {
              setAlertPopup({
                title: `Proses ${opType} ${entityName} Gagal`,
                message:
                  data?.message ||
                  'Terjadi kendala saat memproses permintaan Anda. Silakan periksa kembali data yang diinput.',
                operation: 'ERROR',
                entityName,
                variant: 'danger',
              });
            }
          } catch {
            // Non-JSON response, ignore
          }
        }
      }

      return response;
    };

    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: () => wrappedFetch,
        set: () => {},
      });
    } catch {
      // Fallback if window.fetch descriptor is non-configurable
    }

    return () => {
      try {
        Object.defineProperty(window, 'fetch', {
          configurable: true,
          enumerable: true,
          get: () => rawFetch,
          set: () => {},
        });
      } catch {
        // Ignore cleanup error
      }
    };
  }, []);

  // Close alert popup on Escape if no confirm dialog is active
  useEffect(() => {
    if (!alertPopup) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialog) {
        setAlertPopup(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [alertPopup, dialog]);

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

  const getAlertConfig = (alertItem: AlertPopupOptions) => {
    if (alertItem.variant === 'danger' || alertItem.operation === 'ERROR') {
      return {
        icon: ShieldAlert,
        headerGradient: 'from-rose-900 via-red-900 to-slate-900',
        iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
        badgeText: 'PERINGATAN SISTEM • PROSES GAGAL',
        badgeClass: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
        btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      };
    }
    if (alertItem.operation === 'DELETE') {
      return {
        icon: Trash2,
        headerGradient: 'from-slate-900 via-amber-950 to-slate-900',
        iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
        badgeText: 'NOTIFIKASI SISTEM • PROSES DELETE BERHASIL',
        badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
        btnClass: 'bg-slate-900 hover:bg-slate-800 text-white',
      };
    }
    if (alertItem.operation === 'CREATE') {
      return {
        icon: PlusCircle,
        headerGradient: 'from-emerald-950 via-blue-950 to-slate-900',
        iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        badgeText: 'NOTIFIKASI SISTEM • PROSES CREATE BERHASIL',
        badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
        btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      };
    }
    return {
      icon: Edit3,
      headerGradient: 'from-blue-950 via-indigo-950 to-slate-900',
      iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
      badgeText: 'NOTIFIKASI SISTEM • PROSES UPDATE BERHASIL',
      badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
      btnClass: 'bg-blue-700 hover:bg-blue-800 text-white',
    };
  };

  const cfg = getVariantConfig(dialog?.variant);
  const IconComp = cfg.icon;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      <AlertPopupContext.Provider value={showAlert}>
        {children}

        {/* PRE-ACTION CONFIRMATION MODAL */}
        {dialog && (
          <div className="fixed inset-0 z-[210] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
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

        {/* POST-ACTION EXECUTIVE ALERT POPUP MODAL (FOR ALL CREATE, UPDATE, DELETE PROCESSES) */}
        {alertPopup && !dialog && (() => {
          const alertCfg = getAlertConfig(alertPopup);
          const AlertIcon = alertCfg.icon;
          return (
            <div className="fixed inset-0 z-[205] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Executive Header Banner */}
                <div className={`px-5 py-4 bg-gradient-to-r ${alertCfg.headerGradient} text-white flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${alertCfg.badgeClass}`}>
                      {alertCfg.badgeText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertPopup(null)}
                    className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Tutup Informasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${alertCfg.iconBg}`}>
                      <AlertIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 font-display leading-snug">
                        {alertPopup.title}
                      </h3>
                      {alertPopup.entityName && (
                        <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
                          Modul: {alertPopup.entityName}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2.5">
                        {alertPopup.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>NDTAXANDLAW Advisory System</span>
                    <span className="font-mono">
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setAlertPopup(null)}
                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${alertCfg.btnClass}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OK, Mengerti</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </AlertPopupContext.Provider>
    </ConfirmDialogContext.Provider>
  );
};

