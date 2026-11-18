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
          urlStr.includes('/api/marketing-tools/upload') ||
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
                variant: 'success',
                type: 'success',
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
                type: 'error',
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
    const isError =
      alertItem.variant === 'danger' ||
      alertItem.type === 'danger' ||
      alertItem.type === 'error' ||
      alertItem.operation === 'ERROR';

    const isWarning =
      alertItem.variant === 'warning' ||
      alertItem.type === 'warning';

    const isInfo =
      alertItem.variant === 'info' ||
      alertItem.type === 'info' ||
      alertItem.operation === 'INFO';

    if (isError) {
      return {
        category: 'error' as const,
        icon: ShieldAlert,
        cardBorder: 'border-2 border-red-500 ring-4 ring-red-500/20',
        headerGradient: 'from-red-600 via-rose-700 to-red-800',
        iconBg: 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30',
        badgeText: 'PROSES GAGAL • ERROR SISTEM',
        badgeClass: 'bg-white/20 text-white border-white/40',
        statusBannerClass: 'bg-red-50 border-red-300 text-red-900',
        statusBannerText: 'Proses gagal dijalankan. Silakan periksa pesan kesalahan di bawah ini.',
        btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25',
        btnLabel: 'Tutup & Perbaiki',
      };
    }

    if (isWarning) {
      return {
        category: 'warning' as const,
        icon: AlertTriangle,
        cardBorder: 'border-2 border-amber-500 ring-4 ring-amber-500/20',
        headerGradient: 'from-amber-600 via-amber-700 to-orange-800',
        iconBg: 'bg-amber-500 text-white border-amber-300 shadow-lg shadow-amber-500/30',
        badgeText: 'PERHATIAN • INFORMASI PENTING',
        badgeClass: 'bg-white/20 text-white border-white/40',
        statusBannerClass: 'bg-amber-50 border-amber-300 text-amber-900',
        statusBannerText: 'Harap perhatikan informasi peringatan berikut sebelum melanjutkan.',
        btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25',
        btnLabel: 'Mengerti',
      };
    }

    if (isInfo) {
      return {
        category: 'info' as const,
        icon: HelpCircle,
        cardBorder: 'border-2 border-blue-500 ring-4 ring-blue-500/20',
        headerGradient: 'from-blue-700 via-indigo-800 to-slate-900',
        iconBg: 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30',
        badgeText: 'INFORMASI SISTEM',
        badgeClass: 'bg-blue-400/25 text-blue-100 border-blue-300/40',
        statusBannerClass: 'bg-blue-50 border-blue-200 text-blue-900',
        statusBannerText: 'Informasi status sistem NDTAXANDLAW.',
        btnClass: 'bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-700/25',
        btnLabel: 'OK, Mengerti',
      };
    }

    // Default & CRUD Success (CREATE, UPDATE, DELETE, or type/variant === 'success') -> IDENTIK HIJAU EMERALD
    const opBadge =
      alertItem.operation === 'DELETE'
        ? 'PROSES SELESAI & BERHASIL • DATA DIHAPUS'
        : alertItem.operation === 'CREATE'
        ? 'PROSES SELESAI & BERHASIL • DATA DITAMBAHKAN'
        : alertItem.operation === 'UPDATE'
        ? 'PROSES SELESAI & BERHASIL • DATA DIPERBARUI'
        : 'PROSES SELESAI & BERHASIL • SUCCESS';

    return {
      category: 'success' as const,
      icon: CheckCircle2,
      cardBorder: 'border-2 border-emerald-500 ring-4 ring-emerald-500/25',
      headerGradient: 'from-emerald-600 via-emerald-700 to-teal-800',
      iconBg: 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30',
      badgeText: opBadge,
      badgeClass: 'bg-white/20 text-white border-white/40',
      statusBannerClass: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      statusBannerText: 'Proses telah selesai berjalan dengan sukses dan tersimpan di database.',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30',
      btnLabel: 'Selesai & Lanjutkan',
    };
  };

  const cfg = getVariantConfig(dialog?.variant);
  const IconComp = cfg.icon;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      <AlertPopupContext.Provider value={showAlert}>
        {children}

        {/* PRE-ACTION CONFIRMATION MODAL (INFORMASI KONFIRMASI SEBELUM PROSES) */}
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

        {/* POST-ACTION CRUD SUCCESS (HIJAU) / ERROR (MERAH) / INFO (BIRU) MODAL */}
        {alertPopup && !dialog && (() => {
          const alertCfg = getAlertConfig(alertPopup);
          const AlertIcon = alertCfg.icon;
          return (
            <div className="fixed inset-0 z-[205] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className={`bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${alertCfg.cardBorder}`}>
                {/* Distinct Status Header Banner */}
                <div className={`px-5 py-4 bg-gradient-to-r ${alertCfg.headerGradient} text-white flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2.5">
                    {alertCfg.category === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                    ) : alertCfg.category === 'error' ? (
                      <ShieldAlert className="w-5 h-5 text-white shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    )}
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${alertCfg.badgeClass}`}>
                      {alertCfg.badgeText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertPopup(null)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                    aria-label="Tutup Informasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6">
                  {/* Status Indicator Strip */}
                  <div className={`mb-4 px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${alertCfg.statusBannerClass}`}>
                    <AlertIcon className="w-4 h-4 shrink-0" />
                    <span>{alertCfg.statusBannerText}</span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${alertCfg.iconBg}`}>
                      <AlertIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold text-slate-900 font-display leading-snug">
                        {alertPopup.title}
                      </h3>
                      {alertPopup.entityName && (
                        <p className={`text-[11px] font-bold mt-0.5 ${
                          alertCfg.category === 'success'
                            ? 'text-emerald-700'
                            : alertCfg.category === 'error'
                            ? 'text-red-700'
                            : 'text-blue-700'
                        }`}>
                          Modul: {alertPopup.entityName}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2">
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
                <div className={`px-5 py-3.5 border-t flex items-center justify-end ${
                  alertCfg.category === 'success'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : alertCfg.category === 'error'
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setAlertPopup(null)}
                    className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${alertCfg.btnClass}`}
                  >
                    <AlertIcon className="w-4 h-4" />
                    <span>{alertCfg.btnLabel}</span>
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

