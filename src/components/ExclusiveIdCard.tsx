import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Download, 
  Printer, 
  RotateCw, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  X,
  Check,
  Camera,
  Lock
} from 'lucide-react';
import { Mitra, isMitraDataIncomplete } from '../types';
import { useConfirm } from './ConfirmDialogModal';
import { Skeleton, ImageWithSkeleton } from './SkeletonLoader';

const CARD_BASE_WIDTH = 500;
const CARD_BASE_HEIGHT = 315;

/**
 * Scales the fixed-geometry 500x315 CR80 ID Card proportionally to fit any mobile viewport
 * so the mobile visual layout is 100% identical to desktop (never squishing or wrapping ID codes),
 * while resetting to 1:1 full resolution when printed (@media print).
 */
const ResponsiveIdCardScaler: React.FC<{
  children: React.ReactNode;
  forPrintSheet?: boolean;
}> = ({ children, forPrintSheet = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth;
      if (availableWidth > 0) {
        const nextScale = Math.min(1, availableWidth / CARD_BASE_WIDTH);
        setScale(nextScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const scaledHeight = Math.round(CARD_BASE_HEIGHT * scale);

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-[500px] mx-auto relative flex justify-center ${
        forPrintSheet ? 'print-card-outer-wrapper' : ''
      }`}
      style={{ height: `${scaledHeight}px` }}
    >
      <div
        className={`id-card-preserve-colors origin-top ${
          forPrintSheet ? 'print-card-inner-scaler' : ''
        }`}
        style={{
          width: `${CARD_BASE_WIDTH}px`,
          height: `${CARD_BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const getCardNameStyle = (name?: string) => {
  const len = (name || '').trim().length;
  if (len > 45) return 'text-[11px] leading-tight';
  if (len > 32) return 'text-xs leading-snug';
  if (len > 22) return 'text-sm leading-snug';
  return 'text-lg leading-snug';
};

interface ExclusiveIdCardProps {
  mitra: Mitra;
  onEditProfile: () => void;
  onRequireCompleteProfile?: () => void;
  onUpdateProfile?: (id: string, data: Partial<Mitra>) => Promise<void>;
  onOpenClientSelfRegister?: (refCode: string) => void;
  onOpenVerifyPreview?: (memberCode: string) => void;
  allowClientSelfRegister?: boolean;
  supportPhone?: string;
  supportEmail?: string;
  officeAddress?: string;
  logoUrl?: string;
  logoHorizontalUrl?: string;
}

export const ExclusiveIdCard: React.FC<ExclusiveIdCardProps> = ({
  mitra,
  onEditProfile,
  onRequireCompleteProfile,
  onUpdateProfile,
  onOpenClientSelfRegister,
  onOpenVerifyPreview,
  allowClientSelfRegister = true,
  supportPhone = '0812-8899-7711',
  supportEmail = 'advisory@ndtaxandlaw.com',
  officeAddress = 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
  logoUrl = '/assets/aistudio/logo_nd_vertikal.svg',
  logoHorizontalUrl,
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
    : `https://ndtaxandlaw.com/?ref=${mitra.referralCode || 'ND-REF-0042'}`;

  const mitraVerificationLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify=${encodeURIComponent(mitra.memberCode || 'ND-TAX-LAW-0000')}`
    : `https://ndtaxandlaw.com/?verify=${encodeURIComponent(mitra.memberCode || 'ND-TAX-LAW-0000')}`;

  if (mitra.isLoadingFallback) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[380px] h-[520px] rounded-3xl bg-slate-200 border border-slate-300 p-6 space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="w-28 h-28 rounded-2xl mx-auto" />
              <Skeleton className="h-5 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const isDataIncomplete = isMitraDataIncomplete(mitra);

  const handleCopyClientLink = () => {
    if (isDataIncomplete) {
      if (onRequireCompleteProfile) {
        onRequireCompleteProfile();
      } else {
        onEditProfile();
      }
      return;
    }
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

  /**
   * Renders the exact 500x315 CR80 Front or Back ID Card face so that Desktop, Mobile,
   * Print Preview, and Physical/PDF Print are 100% identical without text wrapping or clipping.
   */
  const renderCardFace = (side: 'front' | 'back', isInteractive = true) => {
    const isBack = side === 'back';
    return (
      <div
        className="w-[500px] h-[315px] rounded-2xl p-6 relative overflow-hidden shadow-xl select-none text-left"
        style={{
          background: isBack
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

        {!isBack ? (
          /* FRONT OF CARD */
          <div className="relative z-10 h-full flex flex-col justify-between text-white">
            {/* Card Header: Logo & Verified Partner Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
                  alt="NDTAXANDLAW"
                  className="h-10 w-auto object-contain filter brightness-110 drop-shadow"
                />
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-amber-300/40 text-[10px] font-semibold text-amber-200 shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                  <span>VERIFIED PARTNER</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Member Details + Scannable QR Code */}
            <div className="my-auto py-1 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Avatar Frame with Gold Rim */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl p-0.5 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
                    <ImageWithSkeleton
                      src={mitra.avatarUrl}
                      alt={mitra.fullName}
                      className="w-full h-full object-cover rounded-[10px]"
                      containerClassName="w-full h-full"
                      rounded="rounded-[10px]"
                    />
                  </div>
                </div>

                {/* Name, Specialization & Single-Line Member ID */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h2 className={`${getCardNameStyle(mitra.fullName)} font-bold text-white tracking-tight font-display break-words`}>
                    {mitra.fullName}
                  </h2>
                  <p className="text-xs text-amber-300/95 font-medium mt-0.5 truncate">
                    {mitra.specialization}
                  </p>
                  <div className="mt-2 flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[10px] uppercase font-semibold text-slate-300/90 tracking-wider shrink-0">
                      ID MITRA:
                    </span>
                    <span className="font-mono text-xs font-bold text-white tracking-wider bg-white/10 px-2.5 py-0.5 rounded border border-white/15 whitespace-nowrap">
                      {mitra.memberCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Scannable QR Code on Card Front */}
              {isInteractive ? (
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="qr-light-box shrink-0 bg-white p-1.5 rounded-xl shadow-lg border-2 border-amber-300/80 hover:scale-105 transition-transform flex flex-col items-center cursor-pointer"
                  title="Scan QR Code ini langsung dengan kamera HP atau klik untuk memperbesar"
                >
                  {qrDataUrl ? (
                    <ImageWithSkeleton
                      src={qrDataUrl}
                      alt={`QR Code Verifikasi ${mitra.fullName}`}
                      className="w-20 h-20 object-contain"
                      containerClassName="w-20 h-20"
                      rounded="rounded-none"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                  )}
                  <span className="text-[8px] font-extrabold text-slate-900 uppercase tracking-tighter mt-0.5">
                    SCAN VERIFY
                  </span>
                </button>
              ) : (
                <div className="qr-light-box shrink-0 bg-white p-1.5 rounded-xl shadow-lg border-2 border-amber-300/80 flex flex-col items-center">
                  {qrDataUrl ? (
                    <ImageWithSkeleton
                      src={qrDataUrl}
                      alt={`QR Code Verifikasi ${mitra.fullName}`}
                      className="w-20 h-20 object-contain"
                      containerClassName="w-20 h-20"
                      rounded="rounded-none"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                  )}
                  <span className="text-[8px] font-extrabold text-slate-900 uppercase tracking-tighter mt-0.5">
                    SCAN VERIFY
                  </span>
                </div>
              )}
            </div>

            {/* Card Footer: Office Address from Admin Settings & WhatsApp Mitra */}
            <div className="pt-1.5 border-t border-white/10 flex flex-col justify-end">
              <p className="text-[9.5px] font-medium text-slate-200 leading-tight line-clamp-2">
                {officeAddress || 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950'}
              </p>
              {mitra.phone && (
                <div className="flex items-center gap-1.5 mt-1 text-slate-200">
                  <svg className="w-2.5 h-2.5 text-[#25D366] shrink-0" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M16.004 3.2c-7.068 0-12.8 5.732-12.8 12.8 0 2.257.59 4.46 1.71 6.404L3.09 28.8l6.565-1.722a12.742 12.742 0 0 0 6.349 1.682h.005c7.068 0 12.8-5.732 12.8-12.8 0-3.42-1.332-6.635-3.75-9.054A12.716 12.716 0 0 0 16.004 3.2zm0 23.398h-.004a10.61 10.61 0 0 1-5.409-1.482l-.388-.23-4.022 1.055 1.073-3.92-.252-.402a10.583 10.583 0 0 1-1.628-5.659c0-5.862 4.77-10.631 10.634-10.631 2.84 0 5.509 1.106 7.516 3.115a10.562 10.562 0 0 1 3.112 7.517c0 5.863-4.77 10.637-10.632 10.637zm5.832-7.965c-.32-.16-1.892-.934-2.186-1.04-.293-.107-.506-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.186.214-.373.24-.693.08-.32-.16-1.351-.498-2.573-1.588-.951-.848-1.593-1.896-1.78-2.216-.186-.32-.02-.493.14-.653.144-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.213 2.256 3.445 5.465 4.83.764.33 1.36.527 1.824.675.766.243 1.464.209 2.015.127.615-.092 1.892-.773 2.159-1.52.266-.747.266-1.387.186-1.52-.08-.133-.293-.213-.613-.373z" />
                  </svg>
                  <span className="text-[9px] font-semibold text-slate-300">WhatsApp:</span>
                  <span className="font-mono text-[9.5px] font-bold text-white tracking-wide">
                    {mitra.phone}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* BACK OF CARD — HANYA PERATURAN */
          <div className="relative z-10 h-full flex flex-col justify-center text-white">
            <div className="p-5 rounded-xl bg-white/5 border border-amber-400/30 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300 border-b border-white/10 pb-2">
                Peraturan &amp; Ketentuan Kartu Identitas
              </p>
              <div className="space-y-2.5 text-xs text-slate-200 leading-relaxed">
                <p>
                  1. Kartu ini merupakan identitas resmi kemitraan NDTAXANDLAW. Segala penyalahgunaan wewenang akan ditindak sesuai kode etik dan hukum yang berlaku.
                </p>
                <p>
                  2. Pindai QR Code untuk memvalidasi keabsahan surat tugas atau mandat pendampingan klien.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-5 sm:py-6 px-3 sm:px-6 lg:px-8">
      {/* Header and status banner */}
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Kartu Identitas Eksklusif Mitra
          </h1>
        </div>
      </div>

      {/* Status Banner: Rejected vs Pending */}
      {isRejected ? (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 shadow-xs space-y-3">
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
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-blue-700/60 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider bg-white/10 px-3.5 py-1 rounded-xl border border-white/15">
                  {mitra.referralCode || 'ND-REF-0042'}
                </span>
                {allowClientSelfRegister !== false && (
                  isDataIncomplete ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequireCompleteProfile) {
                          onRequireCompleteProfile();
                        } else {
                          onEditProfile();
                        }
                      }}
                      title="Lengkapi Data Diri terlebih dahulu untuk membagikan tautan registrasi klien"
                      className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Bagikan via WA (Lengkapi Data Diri)</span>
                    </button>
                  ) : (
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
                  )
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center justify-around sm:justify-start gap-3 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-5">
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
            isDataIncomplete ? (
              <div className="p-3.5 bg-amber-500/15 border border-amber-400/40 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs min-w-0 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block">
                      Tautan Registrasi Klien Terkunci Sementara (Data Diri Belum Lengkap)
                    </span>
                    <span className="text-slate-200 text-[11px] leading-relaxed block mt-0.5">
                      Silakan lengkapi Data Diri (NIK KTP, Upload File KTP/NPWP, No. WhatsApp, dan Rekening Bank) terlebih dahulu agar Anda dapat menyalin dan membagikan tautan registrasi klien maupun menginput klien baru.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onRequireCompleteProfile) {
                        onRequireCompleteProfile();
                      } else {
                        onEditProfile();
                      }
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Lengkapi Data Diri
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/10 border border-white/15 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs min-w-0">
                  <span className="font-bold text-amber-300 block">Tautan Registrasi Mandiri Calon Klien:</span>
                  <span className="font-mono text-slate-300 text-[11px] break-all">
                    {clientSelfRegisterLink}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyClientLink}
                    className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {copiedLink ? '✓ Tautan Disalin!' : 'Salin Tautan Klien'}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="p-3 bg-white/5 border border-white/15 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Tautan registrasi mandiri klien saat ini <strong>dinonaktifkan oleh Admin</strong>. Silakan daftarkan klien baru secara langsung melalui tombol <strong>+ Input Klien</strong> di atas.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 p-5 bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
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
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-xs">
          {/* Card Controls Toolbar — Symmetrical Grid on Mobile, Flex on Tablet/Desktop */}
          <div className="w-full mb-5 pb-4 border-b border-slate-100 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="truncate">{isFlipped ? 'Lihat Sisi Depan' : 'Lihat Sisi Belakang'}</span>
            </button>

            <button
              type="button"
              onClick={onEditProfile}
              className="px-3 py-2 sm:py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl sm:rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              title="Ubah Foto Profil & Data Diri Mitra"
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Edit Data Diri &amp; Foto</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDualSidedModal(true)}
              className="col-span-2 sm:col-span-1 px-3.5 py-2 sm:py-1.5 text-xs font-bold rounded-xl sm:rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs bg-amber-400 hover:bg-amber-300 text-slate-950 sm:ml-auto cursor-pointer"
              title="Download / Cetak Kartu Tampak Depan & Belakang Sekaligus"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak Depan &amp; Belakang</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-1 sm:py-2">
            {/* Proportional Scaler: Guarantees Mobile & Desktop look 100% identical */}
            <ResponsiveIdCardScaler>
              {renderCardFace(isFlipped ? 'back' : 'front', true)}
            </ResponsiveIdCardScaler>

            <p className="text-xs text-slate-500 mt-3.5 text-center flex items-center justify-center gap-1.5 px-2">
              <RotateCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Klik <strong>"{isFlipped ? 'Lihat Sisi Depan' : 'Lihat Sisi Belakang'}"</strong> untuk melihat data rekening komisi dan verifikasi keamanan.
              </span>
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-center mb-3">
              <div className="logo-light-box px-3 py-1.5 rounded-xl bg-white border border-slate-200 inline-flex items-center justify-center">
                <img
                  src={logoHorizontalUrl || logoUrl || '/assets/aistudio/logo_c3fdb6de.png'}
                  alt="NDTAXANDLAW"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 font-display">
              QR Code Verifikasi Keabsahan Mitra
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pindai QR ini melalui kamera smartphone untuk membuka tautan validasi resmi Mitra NDTAXANDLAW.
            </p>

            {/* Real Scannable QR Code */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 my-4 flex flex-col items-center justify-center">
              <div className="qr-light-box w-48 h-48 bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center">
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
                  className="flex-1 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
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
                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Buka Link QR</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-SIDED PRINTABLE MODAL (Kartu Tampil & Kartu Cetak 100% Sama Persis di Mobile, Desktop, & Print) */}
      {showDualSidedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
          <style>{`
            @media print {
              @page {
                size: auto;
                margin: 10mm;
              }
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
                padding: 8px !important;
                box-shadow: none !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 20px !important;
              }
              #mitra-id-card-print-area .print-card-outer-wrapper {
                width: 500px !important;
                max-width: 500px !important;
                height: 315px !important;
              }
              #mitra-id-card-print-area .print-card-inner-scaler {
                width: 500px !important;
                height: 315px !important;
                transform: none !important;
              }
            }
          `}</style>
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-6xl w-full p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6 my-auto animate-in fade-in zoom-in-95 print:shadow-none print:p-0">
            {/* Modal Header — Responsive on Mobile & Desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded uppercase tracking-wider">
                    HIGH-DEFINITION PRINT READY
                  </span>
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
                    Format Cetak Kartu Mitra (Depan &amp; Belakang)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tampilan cetak 100% identik dengan kartu digital resmi (Standar ISO/IEC 7810 ID-1).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDualSidedModal(false)}
                  className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDualSidedModal(false)}
                  className="hidden sm:inline-flex p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Sheet Canvas — Tampilan Depan & Belakang Sama Persis di Mobile, Desktop, & Hasil Cetak */}
            <div
              id="mitra-id-card-print-area"
              className="bg-slate-100 p-3 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col xl:flex-row items-center justify-center gap-6 sm:gap-8 print:bg-white print:border-none print:p-0"
            >
              {/* SIDE 1: FRONT */}
              <div className="space-y-2 text-center w-full max-w-[500px]">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider print:mb-1">
                  [ SISI DEPAN (FRONT) ]
                </div>
                <ResponsiveIdCardScaler forPrintSheet>
                  {renderCardFace('front', false)}
                </ResponsiveIdCardScaler>
              </div>

              {/* SIDE 2: BACK */}
              <div className="space-y-2 text-center w-full max-w-[500px]">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider print:mb-1">
                  [ SISI BELAKANG (BACK) ]
                </div>
                <ResponsiveIdCardScaler forPrintSheet>
                  {renderCardFace('back', false)}
                </ResponsiveIdCardScaler>
              </div>
            </div>

            {/* Print Guide Tips */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-600 print:hidden">
              <div className="flex items-start sm:items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Tip: Pada dialog cetak, aktifkan <strong>Background Graphics (Grafis Latar Belakang)</strong> dan pilih <strong>Save as PDF / Cetak</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDualSidedModal(false)}
                className="w-full sm:w-auto py-1.5 px-3 rounded-lg bg-slate-200/70 sm:bg-transparent text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
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
