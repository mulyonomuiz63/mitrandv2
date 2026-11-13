import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Award,
  Phone,
  Mail,
  ChevronLeft,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { resolveAvatarUrl, MALE_AVATAR_URL } from '../avatars';

interface MitraPublicVerificationViewProps {
  verifyCode: string;
  onBackToHome: () => void;
}

interface VerifiedMitraPublicData {
  id: string;
  memberCode: string;
  referralCode: string;
  fullName: string;
  specialization: string;
  joinedDate: string;
  avatarUrl: string;
  gender?: 'male' | 'female';
  status: 'verified';
  firmName: string;
  supportPhone: string;
  supportEmail: string;
  officeAddress: string;
}

export const MitraPublicVerificationView: React.FC<MitraPublicVerificationViewProps> = ({
  verifyCode,
  onBackToHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [verifiedData, setVerifiedData] = useState<VerifiedMitraPublicData | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVerifiedData(null);
    setNotFoundMsg('');

    fetch(`/api/mitra/public-verify/${encodeURIComponent(verifyCode || '')}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.verified && json.data) {
          setVerifiedData(json.data);
        } else {
          setNotFoundMsg(
            json.message || 'Informasi Data Mitra Tidak Ditemukan di Sistem Resmi NDTAXANDLAW.'
          );
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setNotFoundMsg('Informasi Data Mitra Tidak Ditemukan.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [verifyCode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_c3fdb6de.png"
              alt="NDTAXANDLAW"
              className="h-8 sm:h-9 w-auto object-contain brightness-110"
            />
            <div className="border-l border-slate-800 pl-3">
              <span className="text-xs font-extrabold text-white block uppercase tracking-wider">
                Verifikasi Kredensial Mitra
              </span>
              <span className="text-[10px] text-slate-400">
                Sistem Validasi Keanggotaan Resmi NDTAXANDLAW
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Beranda</span>
          </button>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full border-3 border-blue-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-bold text-white">
              Memvalidasi Kredensial QR Code Mitra...
            </p>
            <p className="text-xs text-slate-400 font-mono">{verifyCode}</p>
          </div>
        ) : verifiedData ? (
          /* VERIFIED MITRA DATA CARD */
          <div className="bg-gradient-to-b from-slate-900 via-blue-950/60 to-slate-900 border-2 border-emerald-500/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Top Status Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest block text-emerald-100">
                    HASIL PEMINDAIAN QR CODE RESMI
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                    DATA MITRA TERVERIFIKASI
                  </h1>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-200" />
                Aktif
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Mitra Identity Header */}
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-5 pb-6 border-b border-white/10">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-2xl p-0.5 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-xl">
                    <img
                      src={
                        resolveAvatarUrl(
                          verifiedData.avatarUrl,
                          verifiedData.gender,
                          verifiedData.fullName
                        ) || MALE_AVATAR_URL
                      }
                      alt={verifiedData.fullName}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-slate-900 shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>MITRA RESMI TERVERIFIKASI</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {verifiedData.fullName}
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-300 font-semibold">
                    {verifiedData.specialization}
                  </p>
                </div>
              </div>

              {/* Detailed Official Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nama Lengkap Mitra
                  </span>
                  <span className="font-bold text-white text-sm block">
                    {verifiedData.fullName}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                    Status Keanggotaan
                  </span>
                  <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>TERVERIFIKASI (VERIFIED)</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nomor ID Kartu Mitra
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm block">
                    {verifiedData.memberCode}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kode Referral Resmi
                  </span>
                  <span className="font-mono font-bold text-blue-300 text-sm block">
                    {verifiedData.referralCode}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bidang Spesialisasi</span>
                  </span>
                  <span className="font-semibold text-slate-200 block">
                    {verifiedData.specialization}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Terdaftar Sejak</span>
                  </span>
                  <span className="font-semibold text-slate-200 block">
                    {verifiedData.joinedDate || '-'}
                  </span>
                </div>
              </div>

              {/* Official Statement */}
              <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-800/60 text-xs text-slate-300 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Pernyataan Keabsahan Kemitraan {verifiedData.firmName}</span>
                </div>
                <p>
                  Pemegang kartu identitas ini adalah <strong>Mitra Resmi Terverifikasi</strong> dari{' '}
                  <strong>{verifiedData.firmName}</strong> yang berwenang mereferensikan dan mendampingi calon klien korporasi maupun perorangan dalam layanan konsultasi pajak, laporan keuangan, dan hukum pajak.
                </p>
              </div>

              {/* Firm Contact Info */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{verifiedData.firmName} Official Verification</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {verifiedData.supportPhone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-400" />
                    {verifiedData.supportEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DATA NOT FOUND CARD */
          <div className="bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider">
                Verifikasi Gagal / Tidak Terdaftar
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Informasi Data Tidak Ditemukan
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {notFoundMsg ||
                  'Data mitra dengan kode tersebut tidak ditemukan atau belum berstatus terverifikasi di dalam sistem resmi NDTAXANDLAW.'}
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
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
              >
                Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 pt-8">
        &copy; 2026 NDTAXANDLAW Corporate &amp; Tax Advisory. Seluruh Hak Dilindungi.
      </div>
    </div>
  );
};
