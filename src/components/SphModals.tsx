import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Tag,
} from 'lucide-react';
import {
  ProspectLetter,
  ProspectLetterContent,
  ServiceItem,
  SphDocument,
  SphServiceKey,
  SphServiceSelection,
  SphTurnoverTierId,
  SphVolumeTierId,
} from '../types';
import {
  SPH_MONTHLY_SERVICES,
  SPH_TURNOVER_TIERS,
  SPH_VOLUME_TIERS,
  buildSphServiceSelection,
  formatSphCurrencyId,
} from '../utils/sphCatalog';
import { formatIndonesianLetterDate } from '../utils/prospectLetterPdf';
import { SphDocumentView, downloadSphPdfFromView } from './SphDocumentView';
import { useConfirm } from './ConfirmDialogModal';

export function getSphStatusBadge(status: SphDocument['status']): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  if (status === 'approved') {
    return {
      label: 'Disetujui Admin',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Ditolak Admin',
      className: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    };
  }
  return {
    label: 'Menunggu Persetujuan',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  };
}

// =========================================================================
// 1. SPH FORM MODAL (Create / Edit & Resubmit SPH for a Prospect Letter)
// =========================================================================
interface SphFormModalProps {
  letter: ProspectLetter;
  editingSph?: SphDocument | null;
  systemServices?: ServiceItem[];
  actorRole: 'mitra' | 'admin' | 'staff';
  actorName: string;
  actorId?: string;
  actorEmail?: string;
  onClose: () => void;
  onSaved: (saved: SphDocument) => void;
}

interface DraftServiceRow {
  serviceKey: SphServiceKey;
  turnoverTierId: SphTurnoverTierId;
  volumeTierId: SphVolumeTierId;
  customPrice: number | null;
}

export const SphFormModal: React.FC<SphFormModalProps> = ({
  letter,
  editingSph,
  systemServices,
  actorRole,
  actorName,
  actorId,
  actorEmail,
  onClose,
  onSaved,
}) => {
  const isAdminOrStaff = actorRole === 'admin' || actorRole === 'staff';
  const [sharedTurnover, setSharedTurnover] = useState<SphTurnoverTierId>(
    editingSph?.services?.[0]?.turnoverTierId || 'up_to_1b'
  );
  const [selectedRows, setSelectedRows] = useState<DraftServiceRow[]>(() => {
    if (editingSph && editingSph.services.length > 0) {
      return editingSph.services.map((s) => ({
        serviceKey: s.serviceKey,
        turnoverTierId: s.turnoverTierId,
        volumeTierId: s.volumeTierId,
        customPrice: s.monthlyPrice !== s.defaultMonthlyPrice || s.isNegotiation ? s.monthlyPrice : null,
      }));
    }
    return [
      {
        serviceKey: 'accounting',
        turnoverTierId: 'up_to_1b',
        volumeTierId: '0_50',
        customPrice: null,
      },
    ];
  });

  const [discountType, setDiscountType] = useState<SphDocument['discountType']>(
    editingSph?.discountType || 'none'
  );
  const [discountInput, setDiscountInput] = useState<string>(() => {
    if (!editingSph || editingSph.discountType === 'none') return '';
    if (editingSph.discountType === 'special_package') return String(editingSph.finalTotalMonthly || '');
    return String(editingSph.discountValue || '');
  });
  const [durationMonths, setDurationMonths] = useState<number>(editingSph?.durationMonths || 12);
  const [clientSignerName, setClientSignerName] = useState<string>(editingSph?.clientSignerName || '');
  const [clientSignerTitleId, setClientSignerTitleId] = useState<string>(
    editingSph?.clientSignerTitleId || ''
  );
  const [clientSignerTitleEn, setClientSignerTitleEn] = useState<string>(
    editingSph?.clientSignerTitleEn || ''
  );
  const [notes, setNotes] = useState<string>(editingSph?.notes || '');
  const [autoApproveAdmin, setAutoApproveAdmin] = useState<boolean>(isAdminOrStaff);
  const [showScopePreview, setShowScopePreview] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const builtServices: SphServiceSelection[] = useMemo(
    () =>
      selectedRows.map((row) =>
        buildSphServiceSelection(
          row.serviceKey,
          row.turnoverTierId,
          row.volumeTierId,
          systemServices,
          row.customPrice !== null ? row.customPrice : undefined
        )
      ),
    [selectedRows, systemServices]
  );

  const normalTotalMonthly = useMemo(
    () => builtServices.reduce((sum, s) => sum + (Number(s.monthlyPrice) || 0), 0),
    [builtServices]
  );

  const { discountAmount, finalTotalMonthly, parsedDiscountValue } = useMemo(() => {
    const rawNum = Math.max(0, Number(String(discountInput || '0').replace(/[^\d.]/g, '')) || 0);
    if (discountType === 'none' || normalTotalMonthly <= 0) {
      return { discountAmount: 0, finalTotalMonthly: normalTotalMonthly, parsedDiscountValue: 0 };
    }
    if (discountType === 'percent') {
      const pct = Math.min(90, rawNum);
      const disc = Math.round((normalTotalMonthly * pct) / 100);
      return {
        discountAmount: disc,
        finalTotalMonthly: Math.max(0, normalTotalMonthly - disc),
        parsedDiscountValue: pct,
      };
    }
    if (discountType === 'amount') {
      const disc = Math.min(normalTotalMonthly, Math.round(rawNum));
      return {
        discountAmount: disc,
        finalTotalMonthly: Math.max(0, normalTotalMonthly - disc),
        parsedDiscountValue: disc,
      };
    }
    // special_package
    const pkgPrice = rawNum > 0 ? Math.min(normalTotalMonthly, Math.round(rawNum)) : normalTotalMonthly;
    const disc = Math.max(0, normalTotalMonthly - pkgPrice);
    return {
      discountAmount: disc,
      finalTotalMonthly: pkgPrice,
      parsedDiscountValue: pkgPrice,
    };
  }, [discountType, discountInput, normalTotalMonthly]);

  const toggleService = (key: SphServiceKey) => {
    setSelectedRows((prev) => {
      const exists = prev.some((r) => r.serviceKey === key);
      if (exists) {
        return prev.filter((r) => r.serviceKey !== key);
      }
      return [
        ...prev,
        {
          serviceKey: key,
          turnoverTierId: sharedTurnover,
          volumeTierId: '0_50',
          customPrice: null,
        },
      ];
    });
  };

  const applyQuickPreset = (keys: SphServiceKey[]) => {
    setSelectedRows(
      keys.map((k) => ({
        serviceKey: k,
        turnoverTierId: sharedTurnover,
        volumeTierId: '0_50',
        customPrice: null,
      }))
    );
  };

  const handleSharedTurnoverChange = (nextTurnover: SphTurnoverTierId) => {
    setSharedTurnover(nextTurnover);
    setSelectedRows((prev) =>
      prev.map((row) => ({
        ...row,
        turnoverTierId: nextTurnover,
        customPrice: null,
      }))
    );
  };

  const updateRow = (serviceKey: SphServiceKey, patch: Partial<DraftServiceRow>) => {
    setSelectedRows((prev) =>
      prev.map((row) => (row.serviceKey === serviceKey ? { ...row, ...patch } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (builtServices.length === 0) {
      setError('Pilih minimal 1 layanan bulanan untuk surat penawaran harga (SPH).');
      return;
    }
    const zeroPriceService = builtServices.find((s) => !s.monthlyPrice || s.monthlyPrice <= 0);
    if (zeroPriceService) {
      setError(
        `Masukkan nominal harga bulanan untuk ${zeroPriceService.serviceNameId} (kategori Negosiasi wajib diisi nominal harga).`
      );
      return;
    }
    if (finalTotalMonthly <= 0) {
      setError('Harga akhir penawaran per bulan harus lebih dari Rp0.');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingSph);
      const endpoint = isEdit ? `/api/sph/${encodeURIComponent(editingSph!.id)}` : '/api/sph';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectLetterId: letter.id,
          services: builtServices,
          discountType,
          discountValue: parsedDiscountValue,
          discountAmount,
          finalTotalMonthly,
          normalTotalMonthly,
          durationMonths: Math.max(1, Math.min(60, Number(durationMonths) || 12)),
          clientSignerName: clientSignerName.trim(),
          clientSignerTitleId: clientSignerTitleId.trim(),
          clientSignerTitleEn: clientSignerTitleEn.trim(),
          notes: notes.trim(),
          autoApprove: isAdminOrStaff && autoApproveAdmin,
          actorRole,
          actorName,
          actorId,
          actorEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        setError(json?.message || 'Gagal menyimpan pengajuan SPH.');
        return;
      }
      onSaved(json.data);
    } catch {
      setError('Terjadi kendala jaringan saat menyimpan SPH.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[93vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-base font-extrabold font-display truncate">
            {editingSph
              ? `Edit SPH — ${editingSph.sphNumber}`
              : `Buat SPH — ${letter.companyName}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
            aria-label="Tutup form SPH"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {editingSph?.status === 'rejected' && editingSph.rejectionReason && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Alasan Penolakan:</p>
                <p className="mt-0.5">{editingSph.rejectionReason}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Layanan */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900">
                Layanan *
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyQuickPreset(['accounting', 'tax'])}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer"
                >
                  Akuntansi + Pajak
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset(['finance', 'accounting', 'tax'])}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg cursor-pointer"
                >
                  Paket FAT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SPH_MONTHLY_SERVICES.map((svc) => {
                const isSelected = selectedRows.some((r) => r.serviceKey === svc.key);
                return (
                  <button
                    key={svc.key}
                    type="button"
                    onClick={() => toggleService(svc.key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-snug truncate">
                      {svc.nameId}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Omset & Volume */}
          {builtServices.length > 0 && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Omset / Tahun *
                </label>
                <select
                  value={sharedTurnover}
                  onChange={(e) => handleSharedTurnoverChange(e.target.value as SphTurnoverTierId)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                >
                  {SPH_TURNOVER_TIERS.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.labelId}
                      {tier.isNegotiation ? ' (Negosiasi)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                {builtServices.map((svc) => {
                  const rawRow = selectedRows.find((r) => r.serviceKey === svc.serviceKey);
                  const isJournal = svc.unitType === 'journal';
                  const isPackage = svc.unitType === 'package';
                  return (
                    <div
                      key={svc.serviceKey}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">{svc.serviceNameId}</p>
                        <span className="text-xs font-extrabold text-[#092147] font-mono">
                          {svc.monthlyPrice > 0
                            ? `${formatSphCurrencyId(svc.monthlyPrice)} / bln`
                            : 'NEGOSIASI'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {!isPackage && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              {isJournal ? 'Jumlah Jurnal / Bulan *' : 'Jumlah Transaksi / Bulan *'}
                            </label>
                            <select
                              value={svc.volumeTierId}
                              onChange={(e) =>
                                updateRow(svc.serviceKey, {
                                  volumeTierId: e.target.value as SphVolumeTierId,
                                  customPrice: null,
                                })
                              }
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                            >
                              {SPH_VOLUME_TIERS.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {isJournal ? v.labelJournalId : v.labelTransactionId}
                                  {v.isNegotiation ? ' (Negosiasi)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className={isPackage ? 'sm:col-span-2' : ''}>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Harga / Bulan (Rp) *
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={rawRow?.customPrice !== null && rawRow?.customPrice !== undefined ? rawRow.customPrice : svc.monthlyPrice}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                              updateRow(svc.serviceKey, { customPrice: val });
                            }}
                            placeholder="2500000"
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Skema Harga */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-700" />
                <span>Skema Harga</span>
              </label>
              <span className="text-xs font-bold font-mono text-slate-900">
                {formatSphCurrencyId(normalTotalMonthly)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'Harga Normal' },
                { id: 'special_package', label: 'Harga Paket' },
                { id: 'amount', label: 'Diskon (Rp)' },
                { id: 'percent', label: 'Diskon (%)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDiscountType(opt.id as SphDocument['discountType']);
                    if (opt.id === 'none') setDiscountInput('');
                    else if (opt.id === 'special_package' && !discountInput && normalTotalMonthly > 0) {
                      setDiscountInput(String(normalTotalMonthly));
                    }
                  }}
                  className={`px-2.5 py-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    discountType === opt.id
                      ? 'bg-[#092147] text-amber-300 border-[#092147]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {discountType !== 'none' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {discountType === 'special_package'
                    ? 'Harga Paket (Rp)'
                    : discountType === 'percent'
                      ? 'Diskon (%)'
                      : 'Diskon (Rp)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 90 : normalTotalMonthly}
                  step={discountType === 'percent' ? 1 : 1000}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder={
                    discountType === 'percent'
                      ? '10'
                      : discountType === 'special_package'
                        ? '1750000'
                        : '200000'
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Total / Bulan</p>
                <p className="text-lg font-extrabold text-[#092147] font-mono">
                  {formatSphCurrencyId(finalTotalMonthly)}
                </p>
              </div>
              {discountAmount > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 self-start sm:self-center">
                  -{formatSphCurrencyId(discountAmount)}
                </div>
              )}
            </div>
          </div>

          {/* 4. Detail Kontrak */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durasi (Bulan)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={durationMonths}
                onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value) || 12))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pimpinan <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input
                type="text"
                value={clientSignerName}
                onChange={(e) => setClientSignerName(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input
                type="text"
                value={clientSignerTitleId}
                onChange={(e) => {
                  const val = e.target.value;
                  setClientSignerTitleId(val);
                  const lower = val.trim().toLowerCase();
                  if (!lower) {
                    setClientSignerTitleEn('');
                  } else if (lower.includes('direktur utama')) {
                    setClientSignerTitleEn('President Director');
                  } else if (lower.includes('direktur')) {
                    setClientSignerTitleEn('Director');
                  } else if (lower.includes('komisaris')) {
                    setClientSignerTitleEn('Commissioner');
                  } else if (lower.includes('manajer') || lower.includes('manager')) {
                    setClientSignerTitleEn('Manager');
                  } else {
                    setClientSignerTitleEn('');
                  }
                }}
                placeholder="Opsional"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Ruang Lingkup Pekerjaan */}
          {builtServices.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowScopePreview((v) => !v)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
              >
                <span>Ruang Lingkup Pekerjaan ({builtServices.length})</span>
                {showScopePreview ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {showScopePreview && (
                <div className="p-4 space-y-3 bg-white max-h-56 overflow-y-auto text-[11px]">
                  {builtServices.map((svc, idx) => (
                    <div key={svc.serviceKey} className="space-y-1">
                      <p className="font-bold text-slate-900">
                        {builtServices.length > 1 ? `${String.fromCharCode(65 + idx)}. ` : ''}
                        {svc.serviceNameId}
                      </p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                        {svc.scopeItems.map((item, i) => (
                          <li key={i}>{item.idText}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isAdminOrStaff && (
            <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApproveAdmin}
                onChange={(e) => setAutoApproveAdmin(e.target.checked)}
                className="rounded border-emerald-400 text-emerald-700"
              />
              <span>Langsung Approve SPH</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || builtServices.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 rounded-xl disabled:opacity-50 inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {submitting
                  ? 'Mengirim...'
                  : editingSph
                    ? 'Simpan & Ajukan Ulang SPH'
                    : isAdminOrStaff && autoApproveAdmin
                      ? 'Terbitkan & Setujui SPH'
                      : 'Ajukan SPH ke Admin'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 2. ADMIN REJECT REASON MODAL
// =========================================================================
interface SphRejectModalProps {
  sph: SphDocument;
  onClose: () => void;
  onConfirmReject: (reason: string) => Promise<void>;
}

export const SphRejectModal: React.FC<SphRejectModalProps> = ({
  sph,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Tuliskan alasan penolakan minimal 5 karakter agar Mitra dapat memperbaikinya.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirmReject(reason.trim());
    } catch (err: any) {
      setError(err?.message || 'Gagal menolak SPH.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
          <h3 className="text-sm font-bold truncate">Tolak SPH — {sph.sphNumber}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Alasan Penolakan *
            </label>
            <textarea
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan penolakan..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tolak &amp; Kirim Alasan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. SPH PREVIEW MODAL (Bilingual A4 Preview + Approve/Reject + PDF Download)
// =========================================================================
interface SphPreviewModalProps {
  sph: SphDocument;
  isAdminOrStaff: boolean;
  logoUrl?: string;
  masterTemplate?: Partial<ProspectLetterContent> | null;
  onClose: () => void;
  onApprove?: (sph: SphDocument) => Promise<void>;
  onOpenReject?: (sph: SphDocument) => void;
}

export const SphPreviewModal: React.FC<SphPreviewModalProps> = ({
  sph,
  isAdminOrStaff,
  logoUrl,
  masterTemplate,
  onClose,
  onApprove,
  onOpenReject,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [approving, setApproving] = useState(false);
  const canDownload = isAdminOrStaff || sph.status === 'approved';
  const badge = getSphStatusBadge(sph.status);

  const handleDownload = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      await downloadSphPdfFromView(sph, logoUrl, masterTemplate);
    } catch (err) {
      console.error('SPH PDF download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-100 rounded-2xl border border-slate-300 shadow-2xl w-full max-w-5xl h-[93vh] flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm font-extrabold font-display truncate">
              {sph.sphNumber} — {sph.companyName}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isAdminOrStaff && sph.status !== 'approved' && onApprove && (
              <button
                type="button"
                disabled={approving}
                onClick={async () => {
                  setApproving(true);
                  try {
                    await onApprove(sph);
                  } finally {
                    setApproving(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Approve SPH</span>
              </button>
            )}

            {isAdminOrStaff && sph.status === 'pending' && onOpenReject && (
              <button
                type="button"
                onClick={() => onOpenReject(sph)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Tolak</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canDownload || downloading}
              onClick={handleDownload}
              title={
                !canDownload
                  ? 'SPH dapat diunduh setelah disetujui (Approve) oleh Admin.'
                  : 'Unduh PDF SPH'
              }
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                canDownload
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                  : 'bg-white/15 text-white/60 cursor-not-allowed'
              }`}
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : canDownload ? (
                <Download className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>{canDownload ? 'Unduh PDF SPH' : 'Menunggu Approve'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              aria-label="Tutup Pratinjau SPH"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sph.status === 'rejected' && sph.rejectionReason && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              <strong>Alasan Penolakan Admin:</strong> {sph.rejectionReason}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <SphDocumentView
            sph={sph}
            logoUrl={logoUrl}
            masterTemplate={masterTemplate}
            mode="preview"
          />
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. SPH MANAGER MODAL (All SPHs for a specific Surat Penawaran / Company)
// =========================================================================
interface SphManagerModalProps {
  letter: ProspectLetter;
  isAdminOrStaff: boolean;
  actorRole: 'mitra' | 'admin' | 'staff';
  actorName: string;
  actorId?: string;
  actorEmail?: string;
  systemServices?: ServiceItem[];
  logoUrl?: string;
  masterTemplate?: Partial<ProspectLetterContent> | null;
  onClose: () => void;
  onChanged: () => void;
}

export const SphManagerModal: React.FC<SphManagerModalProps> = ({
  letter,
  isAdminOrStaff,
  actorRole,
  actorName,
  actorId,
  actorEmail,
  systemServices,
  logoUrl,
  masterTemplate,
  onClose,
  onChanged,
}) => {
  const confirm = useConfirm();
  const [items, setItems] = useState<SphDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSph, setEditingSph] = useState<SphDocument | null>(null);
  const [previewSph, setPreviewSph] = useState<SphDocument | null>(null);
  const [rejectingSph, setRejectingSph] = useState<SphDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sph?prospectLetterId=${encodeURIComponent(letter.id)}`,
        { headers: { 'x-skip-crud-alert': 'true' } }
      );
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Failed to load SPH list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [letter.id]);

  const handleApprove = async (sph: SphDocument) => {
    setBusyId(sph.id);
    try {
      const res = await fetch(`/api/sph/${encodeURIComponent(sph.id)}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorRole, actorName, actorId, actorEmail }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        await loadList();
        onChanged();
        if (previewSph?.id === sph.id) setPreviewSph(json.data);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (sph: SphDocument, reason: string) => {
    const res = await fetch(`/api/sph/${encodeURIComponent(sph.id)}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason: reason, actorRole, actorName, actorId, actorEmail }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || 'Gagal menolak SPH.');
    }
    setRejectingSph(null);
    await loadList();
    onChanged();
    if (previewSph?.id === sph.id && json.data) setPreviewSph(json.data);
  };

  const handleDelete = async (sph: SphDocument) => {
    const ok = await confirm({
      title: 'Hapus SPH?',
      message: `SPH ${sph.sphNumber} untuk ${sph.companyName} akan dihapus permanen.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(sph.id);
    try {
      const res = await fetch(`/api/sph/${encodeURIComponent(sph.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorRole, actorName, actorId }),
      });
      if (res.ok) {
        await loadList();
        onChanged();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (sph: SphDocument) => {
    setDownloadingId(sph.id);
    try {
      await downloadSphPdfFromView(sph, logoUrl, masterTemplate);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-amber-300 shrink-0" />
              <h2 className="text-base font-extrabold font-display truncate">
                SPH — {letter.companyName}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingSph(null);
                  setIsFormOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat SPH</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                aria-label="Tutup daftar SPH"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>Memuat...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Belum ada SPH
                </p>
              </div>
            ) : (
              items.map((sph) => {
                const badge = getSphStatusBadge(sph.status);
                const canDownload = isAdminOrStaff || sph.status === 'approved';
                const canEdit = isAdminOrStaff || sph.status !== 'approved';
                return (
                  <div
                    key={sph.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {sph.sphNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatIndonesianLetterDate(sph.sphDate || sph.createdAt)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {sph.services.map((s) => (
                            <span
                              key={s.serviceKey}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold"
                            >
                              {s.serviceNameId} ({s.volumeLabelId})
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
                          <span className="text-slate-600">
                            Omset: <strong>{sph.services[0]?.turnoverLabelId || '-'}</strong>
                          </span>
                          {sph.discountAmount > 0 ? (
                            <span className="text-slate-600">
                              Normal:{' '}
                              <span className="line-through text-slate-400 font-mono">
                                {formatSphCurrencyId(sph.normalTotalMonthly)}
                              </span>{' '}
                              &rarr;{' '}
                              <strong className="text-emerald-700 font-mono">
                                {formatSphCurrencyId(sph.finalTotalMonthly)}/bln
                              </strong>
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              Harga:{' '}
                              <strong className="text-[#092147] font-mono">
                                {formatSphCurrencyId(sph.finalTotalMonthly)}/bln
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewSph(sph)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-[#092147] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>

                        {canDownload ? (
                          <button
                            type="button"
                            disabled={downloadingId === sph.id}
                            onClick={() => handleDownload(sph)}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-[#092147] hover:bg-[#113872] rounded-lg inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {downloadingId === sph.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Unduh PDF</span>
                          </button>
                        ) : (
                          <span
                            title="PDF SPH dapat diunduh setelah disetujui Admin"
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </span>
                        )}

                        {isAdminOrStaff && sph.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busyId === sph.id}
                            onClick={() => handleApprove(sph)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {isAdminOrStaff && sph.status === 'pending' && (
                          <button
                            type="button"
                            disabled={busyId === sph.id}
                            onClick={() => setRejectingSph(sph)}
                            className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSph(sph);
                              setIsFormOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>{sph.status === 'rejected' ? 'Revisi' : 'Edit'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyId === sph.id}
                          onClick={() => handleDelete(sph)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Hapus SPH"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {sph.status === 'rejected' && sph.rejectionReason && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Alasan Penolakan Admin:</strong> {sph.rejectionReason}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <SphFormModal
          letter={letter}
          editingSph={editingSph}
          systemServices={systemServices}
          actorRole={actorRole}
          actorName={actorName}
          actorId={actorId}
          actorEmail={actorEmail}
          onClose={() => {
            setIsFormOpen(false);
            setEditingSph(null);
          }}
          onSaved={async (saved) => {
            setIsFormOpen(false);
            setEditingSph(null);
            await loadList();
            onChanged();
            setPreviewSph(saved);
          }}
        />
      )}

      {previewSph && (
        <SphPreviewModal
          sph={previewSph}
          isAdminOrStaff={isAdminOrStaff}
          logoUrl={logoUrl}
          masterTemplate={masterTemplate}
          onClose={() => setPreviewSph(null)}
          onApprove={isAdminOrStaff ? handleApprove : undefined}
          onOpenReject={isAdminOrStaff ? (s) => setRejectingSph(s) : undefined}
        />
      )}

      {rejectingSph && (
        <SphRejectModal
          sph={rejectingSph}
          onClose={() => setRejectingSph(null)}
          onConfirmReject={(reason) => handleReject(rejectingSph, reason)}
        />
      )}
    </>
  );
};
