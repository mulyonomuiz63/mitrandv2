import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  MapPin,
  UserCheck,
  ChevronLeft,
  Phone,
  Mail,
} from 'lucide-react';
import { formatIndonesianLetterDate } from '../utils/prospectLetterPdf';

interface ProspectLetterPublicVerifyViewProps {
  verifyCode: string;
  onBackToHome: () => void;
  onOpenMitraVerify?: (memberCode: string) => void;
  logoUrl?: string;
}

interface VerifiedLetterPublicData {
  id: string;
  letterNumber: string;
  verificationCode: string;
  letterDate: string;
  companyName: string;
  companyAddress: string;
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
  createdAt: string;
}

export const ProspectLetterPublicVerifyView: React.FC<ProspectLetterPublicVerifyViewProps> = ({
  verifyCode,
  onBackToHome,
  onOpenMitraVerify,
  logoUrl,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifiedLetterPublicData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setData(null);
    setErrorMsg('');

    fetch(`/api/prospects/public-verify/${encodeURIComponent(verifyCode || '')}`)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success && json.verified && json.data) {
          setData(json.data);
        } else {
          setErrorMsg(
            json.message ||
              'Data surat penawaran tidak ditemukan atau tidak terdaftar di sistem resmi ND TAX AND LAW.'
          );
        }
      })
      .catch(() => {
        if (!mounted) return;
        setErrorMsg('Gagal memverifikasi keabsahan surat penawaran.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [verifyCode]);

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
                Verifikasi Surat Penawaran Resmi
              </span>
              <span className="text-[10px] text-slate-400">
                Validasi Tanda Tangan Elektronik Direktur Utama ND TAX AND LAW
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
              Memvalidasi Keabsahan Surat Penawaran...
            </p>
            <p className="text-xs text-slate-400 font-mono">{verifyCode}</p>
          </div>
        ) : data ? (
          <div className="bg-gradient-to-b from-slate-900 via-blue-950/60 to-slate-900 border-2 border-emerald-500/50 rounded-3xl overflow-hidden shadow-2xl">
            {/* Verified Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-6 py-4 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest block text-emerald-100">
                    DOKUMEN RESMI TERVERIFIKASI
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                    SURAT PENAWARAN SAH — {data.firmName}
                  </h1>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-white/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
                Terdaftar
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Issuer & Director Authority Block */}
              <div className="p-4 rounded-2xl bg-blue-950/70 border border-amber-400/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Otorisasi Penerbit &amp; Penandatangan Elektronik</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Nama Perusahaan Penerbit
                    </span>
                    <span className="font-extrabold text-white text-sm block mt-0.5">
                      {data.firmName}
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      {data.firmLegalBasis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Direktur Penandatangan
                    </span>
                    <span className="font-extrabold text-amber-300 text-sm block mt-0.5">
                      {data.directorName}
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      {data.directorTitle} — {data.firmName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Letter Metadata & Target Prospect Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nomor Surat</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm block">
                    {data.letterNumber}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tanggal Surat</span>
                  </span>
                  <span className="font-bold text-white text-sm block">
                    Jakarta, {formatIndonesianLetterDate(data.letterDate)}
                  </span>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ditujukan Kepada (Perusahaan Prospek)</span>
                    </span>
                    <span className="font-extrabold text-white text-base block mt-1">
                      {data.companyName}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alamat Perusahaan</span>
                    </span>
                    <span className="text-slate-200 leading-relaxed block mt-0.5">
                      {data.companyAddress}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>Perihal: <strong className="text-slate-200">Pemberitahuan dan Penawaran</strong></span>
                    <span>Sifat: <strong className="text-slate-200">Terbatas (Satu set)</strong></span>
                  </div>
                </div>
              </div>

              {/* Mitra Strategis Pengaju */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mitra Strategis Pengaju</span>
                  </span>
                  {onOpenMitraVerify && data.mitraMemberCode && data.mitraMemberCode !== '-' && (
                    <button
                      type="button"
                      onClick={() => onOpenMitraVerify(data.mitraMemberCode)}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      Cek Verifikasi Mitra
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Nama Mitra:</span>{' '}
                    <strong className="text-white">{data.mitraName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">No. ID Mitra:</span>{' '}
                    <strong className="font-mono text-amber-300">{data.mitraMemberCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">WhatsApp:</span>{' '}
                    <strong className="text-slate-200">{data.mitraPhone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{' '}
                    <strong className="text-slate-200 break-all">{data.mitraEmail}</strong>
                  </div>
                </div>
              </div>

              {/* Footer Contact */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-mono">Kode Validasi: {data.verificationCode}</span>
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
              <span className="inline-block px-3 py-1 rounded-md bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider">
                Dokumen Tidak Terdaftar
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Surat Penawaran Tidak Ditemukan
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {errorMsg}
              </p>
              {verifyCode && (
                <div className="pt-2">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-slate-400">
                    Kode Dipindai: <strong className="text-rose-300">{verifyCode}</strong>
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
