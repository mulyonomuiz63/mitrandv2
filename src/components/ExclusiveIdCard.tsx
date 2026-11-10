import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Printer, 
  RotateCw, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Sparkles,
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { Mitra } from '../types';

interface ExclusiveIdCardProps {
  mitra: Mitra;
  onEditProfile: () => void;
  onOpenClientSelfRegister?: (refCode: string) => void;
}

export const ExclusiveIdCard: React.FC<ExclusiveIdCardProps> = ({
  mitra,
  onEditProfile,
  onOpenClientSelfRegister,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDualSidedModal, setShowDualSidedModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = () => {
    setShowDualSidedModal(true);
  };

  const handlePrint = () => {
    setShowDualSidedModal(true);
  };

  const clientSelfRegisterLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${mitra.referralCode || 'ND-REF-0042'}`
    : `https://ndtaxlaw.com/?ref=${mitra.referralCode || 'ND-REF-0042'}`;

  const handleCopyClientLink = () => {
    navigator.clipboard.writeText(clientSelfRegisterLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const isVerified = mitra.status === 'verified';

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header and status banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Kartu Identitas Eksklusif Mitra
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Official Credential
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Kartu digital resmi NDTAXANDLAW yang diakui untuk representasi hukum, pajak, dan pitching klien korporasi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? 'Lihat Sisi Depan' : 'Lihat Sisi Belakang'}</span>
          </button>
          <button
            onClick={() => setShowDualSidedModal(true)}
            disabled={!isVerified}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs ${
              isVerified
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            title="Download / Cetak Kartu Tampak Depan & Belakang Sekaligus"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Depan &amp; Belakang</span>
          </button>
        </div>
      </div>

      {/* Pending status warning */}
      {!isVerified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Pendaftaran Anda Sedang Dalam Proses Verifikasi Admin</p>
            <p className="text-amber-800 mt-0.5">
              Kartu identitas Anda saat ini berstatus peninjauan. Setelah diverifikasi oleh tim operasional NDTAXANDLAW, QR code resmi dan nomor anggota permanen akan aktif penuh.
            </p>
            <button
              onClick={onEditProfile}
              className="mt-2 text-xs font-semibold text-amber-900 underline hover:text-amber-950"
            >
              Pastikan kelengkapan data diri &amp; rekening bank pencairan di sini &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Referral Code & Dual Earning Showcase Banner */}
      <div className="mb-6 p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-blue-700/60 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-950 rounded uppercase tracking-wider">
                KODE REFERRAL MITRA RESMI
              </span>
              <span className="text-xs text-blue-200">
                Gunakan saat mereferensikan calon klien
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-2xl font-black text-amber-300 tracking-wider bg-white/10 px-3.5 py-1 rounded-xl border border-white/15">
                {mitra.referralCode || 'ND-REF-0042'}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(mitra.referralCode || 'ND-REF-0042');
                  alert(`Kode referral ${mitra.referralCode || 'ND-REF-0042'} berhasil disalin ke clipboard!`);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/20"
              >
                Salin Kode
              </button>
              <a
                href={`https://wa.me/?text=Halo,%20saya%20merekomendasikan%20layanan%20jasa%20keuangan%20dan%20laporan%20pajak%20terpercaya%20dari%20NDTAXANDLAW.%20Gunakan%20kode%20referral%20saya%20${mitra.referralCode || 'ND-REF-0042'}%20untuk%20konsultasi%20resmi.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
              >
                Bagikan via WA
              </a>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-5">
            <div className="text-center px-2">
              <div className="text-xl font-bold font-mono text-white">
                {mitra.referredClientsCount ?? 8}
              </div>
              <div className="text-[10px] text-blue-200 uppercase font-semibold">
                Klien Terdaftar
              </div>
            </div>
            <div className="h-8 w-px bg-white/15"></div>
            <div className="text-center px-2">
              <div className="text-xl font-bold font-mono text-emerald-400">
                {mitra.activeSubscribersCount ?? 3}
              </div>
              <div className="text-[10px] text-emerald-200 uppercase font-semibold">
                Langganan Aktif
              </div>
            </div>
          </div>
        </div>

        {/* Client Self-Registration Direct Link (Update 2) */}
        <div className="p-3 bg-white/10 border border-white/15 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-amber-300 block">Tautan Registrasi Mandiri Calon Klien:</span>
            <span className="font-mono text-slate-300 text-[11px] break-all">
              {clientSelfRegisterLink}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyClientLink}
              className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all"
            >
              {copiedLink ? '✓ Tautan Disalin!' : 'Salin Tautan Klien'}
            </button>
            {onOpenClientSelfRegister && (
              <button
                type="button"
                onClick={() => onOpenClientSelfRegister(mitra.referralCode || 'ND-REF-0042')}
                className="px-2.5 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
                title="Pratinjau formulir yang akan dilihat calon klien"
              >
                Buka Form (Tes)
              </button>
            )}
          </div>
        </div>

        {/* Earning Rules Explain */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">⚡ Case-by-case:</span>
            <span>Mitra menerima komisi 1x penuh saat deal proyek closing (SP2DK, PT PMA, Audit).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold shrink-0">🔄 Langganan Bulanan:</span>
            <span>Mitra menerima komisi pasif rutin setiap bulan selama klien tetap aktif berlangganan jasa akuntansi & pajak.</span>
          </div>
        </div>
      </div>

      {/* ID Card Presentation Area */}
      <div className="flex flex-col items-center justify-center py-4">
        <div 
          className="w-full max-w-[520px] aspect-[1.586/1] rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-all duration-500 shadow-xl select-none"
          style={{
            background: isFlipped
              ? 'linear-gradient(135deg, #07162c 0%, #0d274c 50%, #041020 100%)'
              : 'linear-gradient(135deg, #092147 0%, #113872 45%, #061835 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
          }}
        >
          {/* Guilloche / Luxury security pattern background */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Golden metallic wave accent */}
          <div className="absolute -right-20 -bottom-24 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/20 via-blue-400/10 to-transparent blur-xl pointer-events-none" />
          <div className="absolute -left-20 -top-24 w-72 h-72 rounded-full bg-gradient-to-br from-blue-400/15 via-amber-400/10 to-transparent blur-xl pointer-events-none" />

          {!isFlipped ? (
            /* FRONT OF CARD */
            <div className="relative z-10 h-full flex flex-col justify-between text-white">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 p-0.5 shadow-md shrink-0">
                    <div className="w-full h-full bg-[#092147] rounded-[10px] flex items-center justify-center p-1 overflow-hidden">
                      <img
                        src="/assets/aistudio/logo_kotak_5ecb05e4.png"
                        alt="ND Emblem"
                        className="w-full h-full object-contain filter drop-shadow"
                      />
                    </div>
                  </div>
                  <div>
                    <img
                      src="/assets/aistudio/logo_c3fdb6de.png"
                      alt="ND TAX AND LAW"
                      className="h-6 sm:h-7 w-auto object-contain filter brightness-110 drop-shadow"
                    />
                    <p className="text-[9px] tracking-widest uppercase font-semibold text-amber-300/90 mt-0.5">
                      Tax &amp; Legal Consulting Partner
                    </p>
                  </div>
                </div>

                {/* Hologram / Status Badge */}
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-amber-300/40 text-[10px] font-semibold text-amber-200 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{isVerified ? 'VERIFIED PARTNER' : 'PENDING REVIEW'}</span>
                  </div>
                  <p className="text-[9px] text-slate-300/80 mt-1 font-mono tracking-wider">
                    EXP: 12/2028
                  </p>
                </div>
              </div>

              {/* Middle Section: Smart Chip Graphic & Member Details */}
              <div className="my-auto py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar Frame with Gold Rim */}
                  <div className="relative">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl p-0.5 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
                      <img
                        src={mitra.avatarUrl}
                        alt={mitra.fullName}
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                    </div>
                    {isVerified && (
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-[#092147] shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Name and Designation */}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug line-clamp-1 font-display">
                      {mitra.fullName}
                    </h2>
                    <p className="text-xs text-amber-300/90 font-medium mt-0.5 line-clamp-1">
                      {mitra.specialization}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-slate-300/80 tracking-wider">ID MITRA:</span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/10">
                        {mitra.memberCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EMV Microchip Vector */}
                <div className="hidden sm:flex flex-col items-end">
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 border border-amber-600/50 p-1 flex flex-col justify-between shadow-inner">
                    <div className="w-full h-0.5 bg-amber-700/40 rounded-full" />
                    <div className="w-full h-0.5 bg-amber-700/40 rounded-full" />
                    <div className="w-full h-0.5 bg-amber-700/40 rounded-full" />
                  </div>
                  <span className="text-[8px] text-amber-300/70 tracking-widest mt-1 font-mono">SECURE-CHIP</span>
                </div>
              </div>

              {/* Card Footer: QR Code & Verification Tag */}
              <div className="flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Kredensial Resmi</p>
                  <p className="text-xs font-semibold text-slate-200">Mitra Konsultan NDTAXANDLAW</p>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-xs text-left"
                  title="Klik untuk memindai QR Verifikasi"
                >
                  <div className="w-7 h-7 bg-white p-0.5 rounded flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-slate-900" />
                  </div>
                  <div className="hidden xs:block">
                    <p className="text-[8px] text-amber-300 font-mono">SCAN TO VERIFY</p>
                    <p className="text-[10px] text-white font-semibold">Otentikasi Klien</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* BACK OF CARD */
            <div className="relative z-10 h-full flex flex-col justify-between text-white text-xs">
              {/* Magnetic Strip */}
              <div className="w-full h-9 bg-black/80 -mx-6 -mt-2 px-6 flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-slate-400">
                  ND-TAX-LEGAL-SECURITY-ENCRYPTED-PARTNER-ID
                </span>
                <span className="text-[9px] font-mono text-amber-400">2026.11</span>
              </div>

              {/* Bank payout verification & Terms */}
              <div className="py-2 space-y-2 text-[10px] text-slate-300">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-[9px] text-amber-300 uppercase tracking-wider font-semibold">
                    Rekening Pencairan Komisi Terdaftar:
                  </p>
                  <p className="font-semibold text-white mt-0.5">
                    {mitra.bankDetails.bankName} - <span className="font-mono text-amber-200">{mitra.bankDetails.accountNumber}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    a.n. {mitra.bankDetails.accountHolder}
                  </p>
                </div>

                <p className="text-[9px] text-slate-400 leading-relaxed">
                  1. Kartu ini merupakan identitas resmi kemitraan profesional NDTAXANDLAW. Segala penyalahgunaan wewenang akan ditindak sesuai kode etik dan hukum yang berlaku.
                  <br />
                  2. Pindai QR Code untuk memvalidasi keabsahan surat tugas atau mandat pendampingan klien.
                </p>
              </div>

              {/* Footer contact & Barcode */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[9px] text-slate-400">
                <div>
                  <p className="font-semibold text-slate-200">Head Office NDTAXANDLAW</p>
                  <p>Menara Kadin Indonesia, Jakarta Selatan</p>
                  <p>Hotline: (021) 5299-8800 | support@ndtaxlaw.com</p>
                </div>
                <div className="text-right font-mono text-slate-300">
                  <div className="text-xs tracking-widest">||| | |||| | ||||| ||</div>
                  <p className="text-[8px] text-slate-400 mt-0.5">{mitra.memberCode}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Klik <strong>"Lihat Sisi Belakang"</strong> untuk melihat data rekening komisi dan verifikasi keamanan.</span>
        </p>
      </div>

      {/* QR Verification Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-center mb-3">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="ND TAX AND LAW"
                className="h-8 w-auto object-contain"
              />
            </div>

            <h3 className="text-base font-bold text-slate-900 font-display">
              Verifikasi Keabsahan Mitra
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pindai QR ini melalui smartphone klien untuk memvalidasi legalitas kemitraan resmi NDTAXANDLAW.
            </p>

            {/* Simulated Live QR Code SVG */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 my-4 flex flex-col items-center justify-center">
              <div className="w-40 h-40 bg-white p-2 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  {/* QR Pattern visual elements */}
                  <rect x="5" y="5" width="25" height="25" rx="3" fill="#0B2545" />
                  <rect x="10" y="10" width="15" height="15" fill="#FFFFFF" />
                  <rect x="13" y="13" width="9" height="9" fill="#0B2545" />

                  <rect x="70" y="5" width="25" height="25" rx="3" fill="#0B2545" />
                  <rect x="75" y="10" width="15" height="15" fill="#FFFFFF" />
                  <rect x="78" y="13" width="9" height="9" fill="#0B2545" />

                  <rect x="5" y="70" width="25" height="25" rx="3" fill="#0B2545" />
                  <rect x="10" y="75" width="15" height="15" fill="#FFFFFF" />
                  <rect x="13" y="78" width="9" height="9" fill="#0B2545" />

                  <rect x="35" y="15" width="8" height="8" fill="#1D4ED8" />
                  <rect x="48" y="20" width="6" height="6" fill="#0B2545" />
                  <rect x="40" y="38" width="20" height="20" rx="2" fill="#D97706" />
                  <circle cx="50" cy="48" r="4" fill="#FFFFFF" />

                  <rect x="20" y="45" width="10" height="10" fill="#0B2545" />
                  <rect x="70" y="45" width="12" height="6" fill="#1D4ED8" />
                  <rect x="40" y="70" width="15" height="8" fill="#0B2545" />
                  <rect x="65" y="75" width="20" height="10" fill="#0B2545" />
                </svg>
              </div>
              <span className="font-mono text-xs font-bold text-slate-800 mt-2">
                {mitra.memberCode}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Status: Terotentikasi di Sistem Pusat
              </span>
            </div>

            <div className="text-left text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 space-y-1">
              <p><span className="text-slate-500">Nama:</span> <strong className="text-slate-800">{mitra.fullName}</strong></p>
              <p><span className="text-slate-500">Keahlian:</span> <strong className="text-slate-800">{mitra.specialization}</strong></p>
              <p><span className="text-slate-500">Bank Terdaftar:</span> <strong className="text-slate-800">{mitra.bankDetails.bankName}</strong></p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Tutup Jendela
            </button>
          </div>
        </div>
      )}

      {/* DUAL-SIDED PRINTABLE MODAL (Update 1: Download & Cetak Depan Belakang) */}
      {showDualSidedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded uppercase tracking-wider">
                  HIGH-DEFINITION PRINT READY
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Format Cetak Kartu Mitra (Depan &amp; Belakang)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standar dimensi ISO/IEC 7810 ID-1 (85.60 mm &times; 53.98 mm) siap dicetak pada PVC Card atau kertas foto ganda.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDualSidedModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Sheet Canvas with Cut Marks */}
            <div className="bg-slate-100 p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col md:flex-row items-center justify-center gap-8">
              
              {/* SIDE 1: FRONT */}
              <div className="space-y-2 text-center">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  [ SISI DEPAN (FRONT) ]
                </div>
                <div 
                  className="w-[340px] sm:w-[380px] aspect-[1.586/1] rounded-xl p-5 relative overflow-hidden shadow-lg text-white text-left select-none border border-amber-400/50"
                  style={{
                    background: 'linear-gradient(135deg, #092147 0%, #113872 45%, #061835 100%)',
                  }}
                >
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src="/assets/aistudio/logo_kotak_5ecb05e4.png"
                          alt="Logo ND"
                          className="w-7 h-7 object-contain"
                        />
                        <div>
                          <img
                            src="/assets/aistudio/logo_c3fdb6de.png"
                            alt="ND TAX AND LAW"
                            className="h-4 w-auto object-contain brightness-110"
                          />
                          <p className="text-[7px] text-amber-300 font-semibold tracking-wider uppercase">
                            Tax &amp; Legal Consulting Partner
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-amber-200 bg-white/10 px-1.5 py-0.5 rounded border border-amber-300/30">
                          VERIFIED PARTNER
                        </span>
                      </div>
                    </div>

                    <div className="my-auto py-1 flex items-center gap-3">
                      <img
                        src={mitra.avatarUrl}
                        alt={mitra.fullName}
                        className="w-13 h-13 rounded-lg object-cover ring-1 ring-amber-400 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{mitra.fullName}</h4>
                        <p className="text-[9px] text-amber-300 font-medium line-clamp-1">{mitra.specialization}</p>
                        <p className="font-mono text-[9px] font-bold text-white mt-1 bg-white/10 px-1.5 py-0.5 rounded inline-block">
                          {mitra.memberCode}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[7px] text-slate-300">
                      <span>Kredensial Resmi NDTAXANDLAW</span>
                      <span className="font-mono">EXP: 12/2028</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDE 2: BACK */}
              <div className="space-y-2 text-center">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  [ SISI BELAKANG (BACK) ]
                </div>
                <div 
                  className="w-[340px] sm:w-[380px] aspect-[1.586/1] rounded-xl p-5 relative overflow-hidden shadow-lg text-white text-left select-none border border-amber-400/50"
                  style={{
                    background: 'linear-gradient(135deg, #07162c 0%, #0d274c 50%, #041020 100%)',
                  }}
                >
                  <div className="h-full flex flex-col justify-between text-[8px]">
                    <div className="w-full h-6 bg-black/80 -mx-5 -mt-2 px-5 flex items-center justify-between text-[7px] font-mono text-slate-400">
                      <span>ND-TAX-LEGAL-ENCRYPTED-ID</span>
                      <span className="text-amber-400">2026.11</span>
                    </div>

                    <div className="p-2 rounded bg-white/5 border border-white/10 space-y-0.5 mt-2">
                      <span className="text-[7px] text-amber-300 uppercase font-semibold">Rekening Pencairan Terdaftar:</span>
                      <p className="text-[9px] font-bold text-white">{mitra.bankDetails.bankName}</p>
                      <p className="font-mono text-[9px] text-amber-200">{mitra.bankDetails.accountNumber} - a.n. {mitra.bankDetails.accountHolder}</p>
                    </div>

                    <p className="text-[7px] text-slate-400 leading-tight">
                      1. Kartu ini merupakan identitas resmi kemitraan profesional NDTAXANDLAW.<br/>
                      2. Pindai QR Code untuk memvalidasi keabsahan mandat pendampingan.
                    </p>

                    <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[7px] text-slate-400">
                      <span>Menara Kadin Indonesia, Jakarta Selatan</span>
                      <span className="font-mono text-slate-300">||| | |||| | |||||</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Print Guide Tips */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tip: Pada dialog cetak, pilih <strong>Orientation: Landscape</strong> dan <strong>Scale: 100%</strong> untuk hasil ukuran ID Card presisi.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDualSidedModal(false)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
