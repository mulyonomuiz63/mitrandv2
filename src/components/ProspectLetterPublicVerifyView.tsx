import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  FileSpreadsheet,
  MapPin,
  UserCheck,
  ChevronLeft,
  Phone,
  Mail,
  BadgeCheck,
} from 'lucide-react';
import { formatIndonesianLetterDate } from '../utils/prospectLetterPdf';

interface ProspectLetterPublicVerifyViewProps {
  verifyCode: string;
  documentType?: 'prospect_letter' | 'sph';
  onBackToHome: () => void;
  onOpenMitraVerify?: (memberCode: string) => void;
  logoUrl?: string;
}

interface VerifiedSphServiceItem {
  serviceNameId: string;
  serviceNameEn?: string;
  tierLabel?: string;
  turnoverLabel?: string;
  monthlyPrice: number;
}

interface VerifiedLetterPublicData {
  documentType?: 'prospect_letter' | 'sph';
  id: string;
  sphNumber?: string;
  letterNumber: string;
  verificationCode: string;
  letterDate: string;
  prospectLetterNumber?: string;
  companyName: string;
  companyAddress: string;
  businessField?: string;
  clientSignerName?: string;
  clientSignerTitleId?: string;
  mitraName: string;
  mitraMemberCode: string;
  mitraPhone: string;
  mitraEmail: string;
  directorName: string;
  directorTitle: string;
  firmName: string;
  firmLegalBasis: string;
  supportPhone: string;
  supportEmail: string;
  services?: VerifiedSphServiceItem[];
  normalTotalMonthly?: number;
  discountAmount?: number;
  finalTotalMonthly?: number;
  durationMonths?: number;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

function formatIdr(amount?: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export const ProspectLetterPublicVerifyView: React.FC<ProspectLetterPublicVerifyViewProps> = ({
  verifyCode,
  documentType = 'prospect_letter',
  onBackToHome,
  logoUrl,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifiedLetterPublicData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isSphMode = documentType === 'sph' || data?.documentType === 'sph';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setData(null);
    setErrorMsg('');

    const endpoint =
      documentType === 'sph'
        ? `/api/sph/public-verify/${encodeURIComponent(verifyCode || '')}`
        : `/api/prospects/public-verify/${encodeURIComponent(verifyCode || '')}`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success && json.verified && json.data) {
          setData(json.data);
        } else {
          setErrorMsg(
            json.message ||
              (documentType === 'sph'
                ? 'Data Surat Penawaran Harga (SPH) tidak ditemukan atau belum disetujui di sistem resmi ND TAX AND LAW.'
                : 'Data surat penawaran tidak ditemukan atau tidak terdaftar di sistem resmi ND TAX AND LAW.')
          );
        }
      })
      .catch(() => {
        if (!mounted) return;
        setErrorMsg(
          documentType === 'sph'
            ? 'Gagal memverifikasi keabsahan Surat Penawaran Harga (SPH).'
            : 'Gagal memverifikasi keabsahan surat penawaran.'
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [verifyCode, documentType]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl || '/assets/aistudio/logo_c3fdb6de.png'}
              alt="ND TAX AND LAW"
              className="h-8 sm:h-9 w-auto object-contain brightness-110"
            />
            <div className="border-l border-slate-800 pl-3">
              <span className="text-xs font-extrabold text-white block uppercase tracking-wider">
                {isSphMode
                  ? 'Verifikasi Surat Penawaran Harga (SPH)'
                  : 'Verifikasi Surat Penawaran'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Beranda</span>
          </button>
        </div>

        {/* Main Card */}
        {loading ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full border-3 border-blue-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-bold text-white">
              {isSphMode
                ? 'Memvalidasi Surat Penawaran Harga (SPH)...'
                : 'Memvalidasi Surat Penawaran...'}
            </p>
            <p className="text-xs text-slate-400 font-mono">{verifyCode}</p>
          </div>
        ) : data ? (
          <div
            className={`bg-gradient-to-b from-slate-900 via-blue-950/60 to-slate-900 border-2 rounded-3xl overflow-hidden shadow-2xl ${
              isSphMode ? 'border-amber-400/60' : 'border-emerald-500/50'
            }`}
          >
            {/* Verified Banner */}
            <div
              className={`px-6 py-4 text-white flex items-center gap-3 ${
                isSphMode
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-emerald-700 border-b border-amber-400/40'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600'
              }`}
            >
              {isSphMode ? (
                <BadgeCheck className="w-6 h-6 text-amber-300 shrink-0" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
              )}
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                {isSphMode
                  ? `SURAT PENAWARAN HARGA (SPH) SAH — ${data.firmName}`
                  : `SURAT PENAWARAN SAH — ${data.firmName}`}
              </h1>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Issuer & Director Authority Block */}
              <div className="p-4 rounded-2xl bg-blue-950/70 border border-amber-400/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Otorisasi Penerbit &amp; Penandatangan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-white text-sm block">
                      {data.firmName}
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      {data.firmLegalBasis}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-amber-300 text-sm block">
                      {data.directorName}
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      {data.directorTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Letter / SPH Metadata & Target Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    {isSphMode ? (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{isSphMode ? 'Nomor Surat SPH' : 'Nomor Surat'}</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm block">
                    {isSphMode ? data.sphNumber || data.letterNumber : data.letterNumber}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isSphMode ? 'Tanggal SPH' : 'Tanggal Surat'}</span>
                  </span>
                  <span className="font-bold text-white text-sm block">
                    Jakarta, {formatIndonesianLetterDate(data.letterDate)}
                  </span>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-extrabold text-white text-base leading-snug">
                      {data.companyName}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 leading-relaxed">
                      {data.companyAddress}
                    </span>
                  </div>
                  {isSphMode && data.prospectLetterNumber && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400">
                      Ref. Surat Penawaran:{' '}
                      <strong className="font-mono text-slate-200">
                        {data.prospectLetterNumber}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SPH-Exclusive Service & Monthly Fee Summary */}
              {isSphMode && Array.isArray(data.services) && data.services.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Rincian Layanan &amp; Harga</span>
                    </span>
                    {data.durationMonths && (
                      <span className="text-[11px] font-semibold text-slate-300">
                        {data.durationMonths} Bulan
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-white/10">
                    {data.services.map((svc, idx) => (
                      <div
                        key={idx}
                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white block">{svc.serviceNameId}</span>
                          {(svc.tierLabel || svc.turnoverLabel) && (
                            <span className="text-[11px] text-slate-400 block">
                              {[svc.tierLabel, svc.turnoverLabel].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-200 shrink-0">
                          {formatIdr(svc.monthlyPrice)}/bln
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2.5 border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-200">Total Bulanan</span>
                    <div className="text-right">
                      {Boolean(data.discountAmount && data.discountAmount > 0 && data.normalTotalMonthly) && (
                        <span className="text-[11px] text-slate-400 line-through mr-2 font-mono">
                          {formatIdr(data.normalTotalMonthly)}
                        </span>
                      )}
                      <span className="font-mono font-extrabold text-amber-300 text-sm">
                        {formatIdr(data.finalTotalMonthly)} / bulan
                      </span>
                    </div>
                  </div>
                  {data.approvedAt && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-emerald-200/90">
                      Disetujui Admin · {formatIndonesianLetterDate(data.approvedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Mitra Strategis Pengaju */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mitra Strategis</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="font-bold text-white">{data.mitraName}</div>
                  <div className="font-mono font-bold text-amber-300">{data.mitraMemberCode}</div>
                  <div className="text-slate-200">{data.mitraPhone}</div>
                  <div className="text-slate-200 break-all">{data.mitraEmail}</div>
                </div>
              </div>

              {/* Footer Contact */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-mono">
                  {isSphMode
                    ? data.sphNumber || data.letterNumber
                    : data.verificationCode}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {data.supportPhone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-400" />
                    {data.supportEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {isSphMode
                  ? 'Surat Penawaran Harga (SPH) Tidak Ditemukan'
                  : 'Surat Penawaran Tidak Ditemukan'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {errorMsg}
              </p>
              {verifyCode && (
                <div className="pt-2">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-rose-300">
                    {verifyCode}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={onBackToHome}
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-500 pt-8">
        &copy; {new Date().getFullYear()} ND TAX AND LAW. Seluruh Hak Dilindungi.
      </div>
    </div>
  );
};
