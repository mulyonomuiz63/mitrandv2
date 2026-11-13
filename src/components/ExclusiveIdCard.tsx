import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  Check,
  Camera,
  Lock
} from 'lucide-react';
import { Mitra } from '../types';
import { useConfirm } from './ConfirmDialogModal';

interface ExclusiveIdCardProps {
  mitra: Mitra;
  onEditProfile: () => void;
  onUpdateProfile?: (id: string, data: Partial<Mitra>) => Promise<void>;
  onOpenClientSelfRegister?: (refCode: string) => void;
  onOpenVerifyPreview?: (memberCode: string) => void;
  allowClientSelfRegister?: boolean;
  supportPhone?: string;
  supportEmail?: string;
}

export const ExclusiveIdCard: React.FC<ExclusiveIdCardProps> = ({
  mitra,
  onEditProfile,
  onUpdateProfile,
  onOpenClientSelfRegister,
  onOpenVerifyPreview,
  allowClientSelfRegister = true,
  supportPhone = '0812-8899-7711',
  supportEmail = 'advisory@ndtaxlaw.com',
}) => {
  const confirm = useConfirm();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDualSidedModal, setShowDualSidedModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVerifyLink, setCopiedVerifyLink] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const clientSelfRegisterLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${mitra.referralCode || 'ND-REF-0042'}`
    : `https://ndtaxlaw.com/?ref=${mitra.referralCode || 'ND-REF-0042'}`;

  const mitraVerificationLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify=${encodeURIComponent(mitra.memberCode || 'ND-2026-0000')}`
    : `https://ndtaxlaw.com/?verify=${encodeURIComponent(mitra.memberCode || 'ND-2026-0000')}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(mitraVerificationLink, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#092147',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR generation error:', err));
    return () => {
      active = false;
    };
  }, [mitraVerificationLink]);

  const handleCopyClientLink = () => {
    navigator.clipboard.writeText(clientSelfRegisterLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyVerifyLink = () => {
    navigator.clipboard.writeText(mitraVerificationLink);
    setCopiedVerifyLink(true);
    setTimeout(() => setCopiedVerifyLink(false), 3000);
  };

  const isVerified = mitra.status === 'verified';
  const isRejected = mitra.status === 'rejected';

  const handleResubmitVerification = async () => {
    if (!onUpdateProfile) {
      onEditProfile();
      return;
    }
    const ok = await confirm({
      title: 'Ajukan Ulang Verifikasi Data Mitra',
      message: 'Apakah Anda sudah memastikan data diri, NIK KTP, dan rekening bank Anda benar untuk diajukan kembali ke Admin?',
      detail: `Nama Lengkap: ${mitra.fullName}\nNIK KTP: ${mitra.nik}\nNo. WhatsApp: ${mitra.phone}\nRekening Bank: ${mitra.bankDetails.bankName} - ${mitra.bankDetails.accountNumber} (a.n. ${mitra.bankDetails.accountHolder})`,
      confirmText: 'Ya, Ajukan Ulang ke Admin',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsResubmitting(true);
    try {
      await onUpdateProfile(mitra.id, { resubmitVerification: true } as any);
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8">
      {/* Header and status banner */}
      <div className="mb-6">
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

      {/* Status Banner: Rejected vs Pending */}
      {isRejected ? (
        <div className="mb-6 p-5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white rounded">
                  VERIFIKASI DATA DITOLAK ADMIN
                </span>
                {mitra.rejectedAt && (
                  <span className="text-xs font-mono text-red-700">
                    Tanggal: {mitra.rejectedAt}
                  </span>
                )}
              </div>
              <p className="font-bold text-base text-red-950 mt-1">
                Data Pendaftaran Anda Memerlukan Perbaikan Sebelum Dapat Disetujui
              </p>

              <div className="mt-2.5 p-3.5 rounded-xl bg-white border border-red-200 text-xs text-slate-800">
                <span className="font-bold text-red-800 block uppercase tracking-wider text-[10px] mb-1">
                  Keterangan / Alasan Penolakan dari Admin:
                </span>
                <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                  "{mitra.rejectionReason || 'Data pendaftaran belum sesuai dengan kriteria verifikasi Admin. Silakan periksa kembali kelengkapan data diri, NIK KTP, atau rekening bank Anda.'}"
                </p>
              </div>

              <p className="text-xs text-red-800 mt-2.5 leading-relaxed">
                Silakan klik tombol <strong>"Perbaiki Data Diri &amp; Rekening"</strong> di bawah untuk memperbarui data sesuai catatan Admin, lalu ajukan kembali untuk diverifikasi ulang oleh Admin.
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Perbaiki Data Diri &amp; Ajukan Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={handleResubmitVerification}
                  disabled={isResubmitting}
                  className="px-4 py-2 text-xs font-bold text-red-800 bg-white hover:bg-red-100 border border-red-300 rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                  <span>{isResubmitting ? 'Mengirim Pengajuan...' : 'Ajukan Ulang Verifikasi Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : !isVerified ? (
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
              Pastikan kelengkapan data diri, foto profil &amp; rekening bank pencairan di sini &rarr;
            </button>
          </div>
        </div>
      ) : null}

      {/* Referral Code & Dual Earning Showcase Banner */}
      {isVerified ? (
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
                {allowClientSelfRegister !== false && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Halo, saya merekomendasikan layanan jasa keuangan, perpajakan, dan hukum terpercaya dari NDTAXANDLAW.\n\nSilakan daftar langsung untuk konsultasi resmi melalui tautan berikut (Kode Referral: ${mitra.referralCode || 'ND-REF-0042'}):\n${clientSelfRegisterLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
                  >
                    Bagikan via WA
                  </a>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-5">
              <div className="text-center px-2">
                <div className="text-xl font-bold font-mono text-white">
                  {mitra.referredClientsCount ?? 0}
                </div>
                <div className="text-[10px] text-blue-200 uppercase font-semibold">
                  Klien Terdaftar
                </div>
              </div>
              <div className="h-8 w-px bg-white/15"></div>
              <div className="text-center px-2">
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {mitra.activeSubscribersCount ?? 0}
                </div>
                <div className="text-[10px] text-emerald-200 uppercase font-semibold">
                  Langganan Aktif
                </div>
              </div>
            </div>
          </div>

          {/* Client Self-Registration Direct Link (Only if enabled by Admin in Settings) */}
          {allowClientSelfRegister !== false ? (
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
          ) : (
            <div className="p-3 bg-white/5 border border-white/15 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Tautan registrasi mandiri klien saat ini <strong>dinonaktifkan oleh Admin</strong>. Silakan daftarkan klien baru secara langsung melalui tombol <strong>+ Input Klien</strong> di atas.
              </span>
            </div>
          )}

          {/* Earning Rules Explain */}
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">⚡ Case-by-case:</span>
              <span>Mitra menerima komisi 1x penuh saat deal proyek closing (SP2DK, PT PMA, Audit).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold shrink-0">🔄 Langganan Bulanan:</span>
              <span>Mitra menerima komisi pasif rutin setiap bulan selama klien tetap aktif berlangganan jasa akuntansi &amp; pajak.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-5 bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded uppercase tracking-wider">
                  KODE REFERRAL MITRA (BELUM AKTIF)
                </span>
                <span className="text-xs text-slate-400">
                  Menunggu Persetujuan (Approve) Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Kode referral resmi dan tautan registrasi klien mandiri belum diterbitkan karena akun Anda sedang dalam proses verifikasi Admin.
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-amber-300 shrink-0 text-center">
              🔒 MENUNGGU APPROVE ADMIN
            </div>
          </div>
        </div>
      )}

      {/* ID Card Presentation Area (Full-Width Symmetrical Container Aligned with Navbar & Sub-Header) */}
      {isVerified ? (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          {/* Card Controls Toolbar (Full-Width Header Bar Inside Container) */}
          <div className="w-full mb-5 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-700" />
                <span>{isFlipped ? 'Lihat Sisi Depan' : 'Lihat Sisi Belakang'}</span>
              </button>

              <button
                type="button"
                onClick={onEditProfile}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Ubah Foto Profil & Data Diri Mitra"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Edit Data Diri &amp; Foto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDualSidedModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs bg-amber-400 hover:bg-amber-300 text-slate-950 ml-auto"
              title="Download / Cetak Kartu Tampak Depan & Belakang Sekaligus"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Depan &amp; Belakang</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <div
              className="w-full max-w-[520px] aspect-[1.586/1] rounded-2xl p-5 sm:p-7 relative overflow-hidden transition-all duration-500 shadow-xl select-none"
              style={{
                background: isFlipped
                  ? 'linear-gradient(135deg, #07162c 0%, #0d274c 50%, #041020 100%)'
                  : 'linear-gradient(135deg, #092147 0%, #113872 45%, #061835 100%)',
                border: '1.5px solid rgba(212, 175, 55, 0.45)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
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
                  {/* Card Header: Hanya Logo & Nama NDTAXANDLAW tanpa teks Tax & Legal dan tanpa EXP */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src="/assets/aistudio/logo_c3fdb6de.png"
                        alt="NDTAXANDLAW"
                        className="h-8 sm:h-9 w-auto object-contain filter brightness-110 drop-shadow"
                      />
                    </div>

                    {/* Status Badge (Tanpa Expired) */}
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-amber-300/40 text-[10px] font-semibold text-amber-200 shadow-xs">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>VERIFIED PARTNER</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Member Details + Directly Scannable QR Code */}
                  <div className="my-auto py-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar Frame with Gold Rim */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl p-0.5 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
                          <img
                            src={mitra.avatarUrl}
                            alt={mitra.fullName}
                            className="w-full h-full object-cover rounded-[10px]"
                          />
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-[#092147] shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Name and Designation */}
                      <div className="min-w-0">
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

                    {/* Direct Scannable QR Code on Card Front */}
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="shrink-0 bg-white p-1.5 rounded-xl shadow-lg border-2 border-amber-300/80 hover:scale-105 transition-transform flex flex-col items-center"
                      title="Scan QR Code ini langsung dengan kamera HP atau klik untuk memperbesar"
                    >
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR Code Verifikasi ${mitra.fullName}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-slate-900" />
                        </div>
                      )}
                      <span className="text-[8px] font-extrabold text-slate-900 uppercase tracking-tighter mt-0.5">
                        SCAN VERIFY
                      </span>
                    </button>
                  </div>

                  {/* Card Footer: Verification Tag */}
                  <div className="flex items-end justify-between pt-2 border-t border-white/10">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Kredensial Resmi</p>
                      <p className="text-xs font-semibold text-slate-200">Mitra Konsultan NDTAXANDLAW</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
                    >
                      <span>Detail Link QR</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                /* BACK OF CARD */
                <div className="relative z-10 h-full flex flex-col justify-between text-white text-xs">
                  {/* Magnetic Strip */}
                  <div className="w-full h-9 bg-black/80 -mx-6 -mt-2 px-6 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest text-slate-400">
                      NDTAXANDLAW-SECURITY-ENCRYPTED-PARTNER-ID
                    </span>
                    <span className="text-[9px] font-mono text-amber-400">OFFICIAL</span>
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
                      {mitra.bankDetails.customBankFields &&
                        Object.keys(mitra.bankDetails.customBankFields).length > 0 && (
                          <div className="mt-1 pt-1 border-t border-white/10 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-300">
                            {Object.entries(mitra.bankDetails.customBankFields).map(([k, v]) =>
                              v ? (
                                <span key={k}>
                                  <span className="text-slate-400">{k}:</span>{' '}
                                  <strong className="text-white">{v}</strong>
                                </span>
                              ) : null
                            )}
                          </div>
                        )}
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
                      <p>Hotline: {supportPhone} | {supportEmail}</p>
                    </div>
                    <div className="text-right font-mono text-slate-300">
                      <div className="text-xs tracking-widest">||| | |||| | ||||| ||</div>
                      <p className="text-[8px] text-slate-400 mt-0.5">{mitra.memberCode}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-3 text-center flex items-center justify-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Klik <strong>"Lihat Sisi Belakang"</strong> untuk melihat data rekening komisi dan verifikasi keamanan.</span>
            </p>
          </div>
        </div>
      ) : (
        /* LOCKED / UNAVAILABLE CARD PLACEHOLDER WHEN PENDING OR REJECTED */
        <div className="w-full">
          <div
            className={`w-full bg-white border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs ${
              isRejected ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
                isRejected
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              {isRejected ? <AlertCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
            </div>
            <div className="space-y-1.5">
              <span
                className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                  isRejected
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isRejected
                  ? 'Status: Data Ditolak — Perlu Perbaikan & Pengajuan Ulang'
                  : 'Status: Sedang Dalam Verifikasi Admin'}
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Kartu Identitas Eksklusif Belum Tersedia
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {isRejected ? (
                  <>
                    Pendaftaran Anda ditolak sementara oleh Admin dengan alasan:{' '}
                    <strong className="text-red-700">
                      "{mitra.rejectionReason || 'Data belum sesuai kriteria verifikasi.'}"
                    </strong>
                    . Silakan perbaiki data diri Anda dan ajukan ulang agar dapat disetujui Admin.
                  </>
                ) : (
                  <>
                    Kartu Identitas Digital, Kode Referral Resmi, serta fitur Input Data Klien baru akan tersedia dan berfungsi penuh setelah akun Anda <strong>disetujui (Approve) oleh Admin</strong>.
                  </>
                )}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onEditProfile}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 ${
                  isRejected
                    ? 'text-white bg-red-600 hover:bg-red-700 shadow-xs'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isRejected ? 'Perbaiki Data Diri & Ajukan Ulang' : 'Edit Data Diri & Foto Profil'}</span>
              </button>
              {isRejected && (
                <button
                  type="button"
                  onClick={handleResubmitVerification}
                  disabled={isResubmitting}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isResubmitting ? 'Mengirim...' : 'Ajukan Ulang Verifikasi'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Verification Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-center mb-3">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="NDTAXANDLAW"
                className="h-8 w-auto object-contain"
              />
            </div>

            <h3 className="text-base font-bold text-slate-900 font-display">
              QR Code Verifikasi Keabsahan Mitra
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pindai QR ini melalui kamera smartphone untuk membuka tautan validasi resmi Mitra NDTAXANDLAW.
            </p>

            {/* Real Scannable QR Code */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 my-4 flex flex-col items-center justify-center">
              <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Verifikasi ${mitra.fullName}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-24 h-24 text-slate-900" />
                )}
              </div>
              <span className="font-mono text-xs font-bold text-slate-800 mt-2">
                {mitra.memberCode}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Status: Terverifikasi di Sistem Pusat
              </span>
            </div>

            <div className="text-left text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 space-y-1.5">
              <p><span className="text-slate-500">Nama Mitra:</span> <strong className="text-slate-800">{mitra.fullName}</strong></p>
              <p><span className="text-slate-500">Status:</span> <strong className="text-emerald-700">Terverifikasi Resmi</strong></p>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 block">Link Hasil Scan QR:</span>
                <span className="font-mono text-[10px] text-blue-700 break-all block">
                  {mitraVerificationLink}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyVerifyLink}
                  className="flex-1 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  {copiedVerifyLink ? '✓ Link Tersalin' : 'Salin Link Verifikasi'}
                </button>
                {onOpenVerifyPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(false);
                      onOpenVerifyPreview(mitra.memberCode);
                    }}
                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Buka Link QR</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-SIDED PRINTABLE MODAL (Kartu Tampil & Kartu Cetak 100% Sama Persis) */}
      {showDualSidedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #mitra-id-card-print-area,
              #mitra-id-card-print-area * {
                visibility: visible !important;
              }
              #mitra-id-card-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                border: none !important;
                padding: 16px !important;
                box-shadow: none !important;
              }
            }
          `}</style>
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95 print:shadow-none print:p-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded uppercase tracking-wider">
                  HIGH-DEFINITION PRINT READY
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Format Cetak Kartu Mitra (Depan &amp; Belakang)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tampilan cetak 100% identik dengan kartu digital resmi (Standar ISO/IEC 7810 ID-1).
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

            {/* Print Sheet Canvas — Tampilan Depan & Belakang Sama Persis dengan Kartu Utama */}
            <div
              id="mitra-id-card-print-area"
              className="bg-slate-100 p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col xl:flex-row items-center justify-center gap-8 print:bg-white print:border-none print:p-0"
            >
              {/* SIDE 1: FRONT (100% Identik dengan Kartu Tampil) */}
              <div className="space-y-2 text-center w-full max-w-[520px]">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider print:mb-1">
                  [ SISI DEPAN (FRONT) ]
                </div>
                <div
                  className="w-full max-w-[520px] aspect-[1.586/1] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-xl select-none text-left mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #092147 0%, #113872 45%, #061835 100%)',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
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
                  <div className="absolute -right-20 -bottom-24 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/20 via-blue-400/10 to-transparent blur-xl pointer-events-none" />
                  <div className="absolute -left-20 -top-24 w-72 h-72 rounded-full bg-gradient-to-br from-blue-400/15 via-amber-400/10 to-transparent blur-xl pointer-events-none" />

                  <div className="relative z-10 h-full flex flex-col justify-between text-white">
                    {/* Card Header: Hanya Logo & Nama NDTAXANDLAW */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img
                          src="/assets/aistudio/logo_c3fdb6de.png"
                          alt="NDTAXANDLAW"
                          className="h-8 sm:h-9 w-auto object-contain filter brightness-110 drop-shadow"
                        />
                      </div>

                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-amber-300/40 text-[10px] font-semibold text-amber-200 shadow-xs">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>VERIFIED PARTNER</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Member Details + Scannable QR Code on Print Card */}
                    <div className="my-auto py-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl p-0.5 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
                            <img
                              src={mitra.avatarUrl}
                              alt={mitra.fullName}
                              className="w-full h-full object-cover rounded-[10px]"
                            />
                          </div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-[#092147] shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="min-w-0">
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

                      <div className="shrink-0 bg-white p-1.5 rounded-xl shadow-lg border-2 border-amber-300/80 flex flex-col items-center">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt={`QR Code Verifikasi ${mitra.fullName}`}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                            <QrCode className="w-12 h-12 text-slate-900" />
                          </div>
                        )}
                        <span className="text-[8px] font-extrabold text-slate-900 uppercase tracking-tighter mt-0.5">
                          SCAN VERIFY
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Kredensial Resmi</p>
                        <p className="text-xs font-semibold text-slate-200">Mitra Konsultan NDTAXANDLAW</p>
                      </div>

                      <div className="text-[9px] font-mono text-amber-300">
                        Verified QR Credential
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIDE 2: BACK (100% Identik dengan Sisi Belakang Kartu Tampil) */}
              <div className="space-y-2 text-center w-full max-w-[520px]">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider print:mb-1">
                  [ SISI BELAKANG (BACK) ]
                </div>
                <div
                  className="w-full max-w-[520px] aspect-[1.586/1] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-xl select-none text-left mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #07162c 0%, #0d274c 50%, #041020 100%)',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <div className="absolute -right-20 -bottom-24 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/20 via-blue-400/10 to-transparent blur-xl pointer-events-none" />
                  <div className="absolute -left-20 -top-24 w-72 h-72 rounded-full bg-gradient-to-br from-blue-400/15 via-amber-400/10 to-transparent blur-xl pointer-events-none" />

                  <div className="relative z-10 h-full flex flex-col justify-between text-white text-xs">
                    {/* Magnetic Strip */}
                    <div className="w-full h-9 bg-black/80 -mx-6 -mt-2 px-6 flex items-center justify-between">
                      <span className="text-[9px] font-mono tracking-widest text-slate-400">
                        NDTAXANDLAW-SECURITY-ENCRYPTED-PARTNER-ID
                      </span>
                      <span className="text-[9px] font-mono text-amber-400">OFFICIAL</span>
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
                        {mitra.bankDetails.customBankFields &&
                          Object.keys(mitra.bankDetails.customBankFields).length > 0 && (
                            <div className="mt-1 pt-1 border-t border-white/10 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-300">
                              {Object.entries(mitra.bankDetails.customBankFields).map(([k, v]) =>
                                v ? (
                                  <span key={k}>
                                    <span className="text-slate-400">{k}:</span>{' '}
                                    <strong className="text-white">{v}</strong>
                                  </span>
                                ) : null
                              )}
                            </div>
                          )}
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
                        <p>Hotline: {supportPhone} | {supportEmail}</p>
                      </div>
                      <div className="text-right font-mono text-slate-300">
                        <div className="text-xs tracking-widest">||| | |||| | ||||| ||</div>
                        <p className="text-[8px] text-slate-400 mt-0.5">{mitra.memberCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Guide Tips */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600 print:hidden">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tip: Pada dialog cetak, pilih <strong>Orientation: Landscape</strong>, <strong>Background Graphics: Checked</strong>, dan <strong>Scale: 100%</strong>.</span>
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
