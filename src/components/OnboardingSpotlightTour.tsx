import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { AuthUser, DEFAULT_STAFF_ALLOWED_MENUS, StaffMenuAccessKey } from '../types';

export interface TourStepItem {
  targetAttr: string;
  title: string;
  description: string;
  badgeText: string;
}

interface OnboardingSpotlightTourProps {
  currentUser: AuthUser;
  currentRole: 'admin' | 'mitra';
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingSpotlightTour: React.FC<OnboardingSpotlightTourProps> = ({
  currentUser,
  currentRole,
  isOpen,
  onClose,
}) => {
  const isStaff = currentRole === 'admin' && currentUser?.roleCode === 'staff';
  const staffAllowedMenus: StaffMenuAccessKey[] =
    currentUser?.allowedMenus && currentUser.allowedMenus.length > 0
      ? currentUser.allowedMenus
      : DEFAULT_STAFF_ALLOWED_MENUS;

  const rawSteps: TourStepItem[] = React.useMemo(() => {
    if (currentRole === 'mitra') {
      return [
        {
          targetAttr: 'tour-nav-idcard',
          badgeText: 'PANDUAN MITRA • IDENTITAS & REFERRAL',
          title: 'Kartu Identitas Eksklusif & Kode Referral',
          description:
            'Di menu ini Anda dapat melihat Kartu Identitas Mitra resmi lengkap dengan QR Code validasi, membagikan tautan referral via WhatsApp, serta mencetak kartu depan & belakang.',
        },
        {
          targetAttr: 'tour-action-input-client',
          badgeText: 'PANDUAN MITRA • INPUT KLIEN',
          title: 'Tombol + Input Data Klien Baru',
          description:
            'Gunakan tombol cepat ini untuk mendaftarkan calon klien atau perusahaan yang Anda referensikan agar langsung masuk ke antrean validasi Admin dan terikat dengan komisi Anda.',
        },
        {
          targetAttr: 'tour-nav-dashboard',
          badgeText: 'PANDUAN MITRA • ANALITIK',
          title: 'Dashboard Performa Mitra',
          description:
            'Pantau ringkasan total komisi, jumlah klien terdaftar, langganan bulanan yang aktif, serta grafik perkembangan kontribusi Anda.',
        },
        {
          targetAttr: 'tour-nav-marketing',
          badgeText: 'PANDUAN MITRA • MATERI PEMASARAN',
          title: 'Tools Marketing & Pelatihan',
          description:
            'Unduh materi resmi seperti Company Profile, brosur layanan pajak, proposal penawaran, dan panduan edukasi untuk memudahkan Anda melakukan pitching ke calon klien.',
        },
        {
          targetAttr: 'tour-nav-commissions',
          badgeText: 'PANDUAN MITRA • KOMISI & PAYOUT',
          title: 'Komisi & Pencairan Dana (Payout)',
          description:
            'Cek rincian komisi dari setiap deal klien, pantau saldo komisi yang siap dicairkan, ajukan penarikan dana (payout), dan unduh bukti transfer resmi.',
        },
        {
          targetAttr: 'tour-action-profile',
          badgeText: 'PANDUAN MITRA • PROFIL & REKENING',
          title: 'Pengaturan Profil & Rekening Bank',
          description:
            'Klik profil Anda di pojok kanan atas untuk memperbarui foto kartu identitas, biodata, kata sandi, serta nomor rekening bank tujuan pencairan komisi.',
        },
      ];
    }

    if (isStaff) {
      const steps: TourStepItem[] = [];
      if (staffAllowedMenus.includes('dashboard')) {
        steps.push({
          targetAttr: 'tour-nav-dashboard',
          badgeText: 'PANDUAN STAF • MONITORING',
          title: 'Dashboard Operasional',
          description:
            'Lihat ringkasan statistik mitra terdaftar, kontrak klien yang sedang berjalan, serta grafik pertumbuhan bulanan firma.',
        });
      }
      if (staffAllowedMenus.includes('admin-operations')) {
        steps.push({
          targetAttr: 'tour-nav-operations',
          badgeText: 'PANDUAN STAF • VALIDASI & PAYOUT',
          title: 'Validasi Klien & Pencairan Komisi',
          description:
            'Menu utama operasional untuk me-review & meng-ACC pengajuan klien dari mitra, mengelola tagihan berlangganan, serta memproses pencairan komisi beserta bukti transfer.',
        });
      }
      if (staffAllowedMenus.includes('verification')) {
        steps.push({
          targetAttr: 'tour-nav-verification',
          badgeText: 'PANDUAN STAF • VERIFIKASI MITRA',
          title: 'Verifikasi Pendaftaran Mitra',
          description:
            'Periksa data diri, NIK, dan rekening calon mitra baru untuk disetujui (Verified) atau ditolak disertai catatan perbaikan.',
        });
      }
      if (staffAllowedMenus.includes('marketing-tools')) {
        steps.push({
          targetAttr: 'tour-nav-marketing',
          badgeText: 'PANDUAN STAF • TOOLS MARKETING',
          title: 'Kelola Materi & Tools Marketing',
          description:
            'Unggah atau perbarui dokumen pemasaran, brosur, dan materi pelatihan yang akan digunakan oleh para Mitra.',
        });
      }
      if (staffAllowedMenus.includes('manage-services')) {
        steps.push({
          targetAttr: 'tour-action-services',
          badgeText: 'PANDUAN STAF • LAYANAN PAJAK',
          title: 'Kelola Katalog Layanan Pajak',
          description:
            'Atur daftar paket layanan perpajakan, akuntansi, dan hukum beserta harga estimasi dan persentase komisi mitra.',
        });
      }
      if (
        staffAllowedMenus.includes('settings-general') ||
        staffAllowedMenus.includes('settings-forms')
      ) {
        steps.push({
          targetAttr: 'tour-action-settings',
          badgeText: 'PANDUAN STAF • PENGATURAN',
          title: 'Pengaturan Profil Firma & Form Dinamis',
          description:
            'Kelola informasi kontak layanan firma serta atur kolom input dinamis untuk pendaftaran mitra, rekening bank, dan data klien.',
        });
      }
      steps.push({
        targetAttr: 'tour-action-profile',
        badgeText: 'PANDUAN STAF • AKUN SAYA',
        title: 'Edit Profil & Kata Sandi Staf',
        description:
          'Klik tombol profil ini untuk mengubah nama lengkap, email login, nomor WhatsApp, foto profil, maupun mengganti password akun Staf Anda.',
      });
      return steps;
    }

    // Super Admin Steps
    return [
      {
        targetAttr: 'tour-nav-dashboard',
        badgeText: 'PANDUAN ADMIN • EKSEKUTIF',
        title: 'Dashboard Analitik Admin',
        description:
          'Pantau metrik utama firma secara menyeluruh: total nilai kontrak klien, akumulasi komisi mitra, serta tren performa bulanan.',
      },
      {
        targetAttr: 'tour-nav-operations',
        badgeText: 'PANDUAN ADMIN • OPERASIONAL',
        title: 'Validasi Klien & Otorisasi Payout',
        description:
          'Pusat kendali untuk menyetujui (ACC) deal klien baru, memantau siklus tagihan berlangganan, serta mengotorisasi transfer pencairan komisi mitra.',
      },
      {
        targetAttr: 'tour-nav-verification',
        badgeText: 'PANDUAN ADMIN • KEANGGOTAAN',
        title: 'Verifikasi Mitra & Kartu Identitas',
        description:
          'Tinjau dan setujui pendaftaran mitra baru agar Kartu Identitas ber-QR Code dan kode referral resmi mitra langsung aktif.',
      },
      {
        targetAttr: 'tour-nav-logs',
        badgeText: 'PANDUAN ADMIN • AUDIT SISTEM',
        title: 'Log Aktivitas & Log Pengiriman Email',
        description:
          'Pantau riwayat aktivitas seluruh pengguna dan status pengiriman email notifikasi SMTP dengan retensi otomatis 3 bulan terakhir.',
      },
      {
        targetAttr: 'tour-nav-staff',
        badgeText: 'PANDUAN ADMIN • OTORITAS & TIM',
        title: 'Manajemen Staf, Hak Akses Menu & Profil Admin',
        description:
          'Tambahkan akun Staf operasional, aktifkan atau nonaktifkan akses menu tertentu untuk setiap Staf, serta perbarui data profil dan password Admin utama.',
      },
      {
        targetAttr: 'tour-action-settings',
        badgeText: 'PANDUAN ADMIN • KONFIGURASI SISTEM',
        title: 'Pengaturan Sistem, Form Dinamis & Database',
        description:
          'Konfigurasi profil firma, aktifkan/nonaktifkan tautan registrasi mandiri klien, kelola form input dinamis, koneksi Supabase, Mode Dev/Prod, dan SMTP Email.',
      },
    ];
  }, [currentRole, isStaff, staffAllowedMenus]);

  // Helper to locate visible DOM element matching data-tour attribute
  const findVisibleTargetElement = useCallback((attrValue: string): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${attrValue}"]`);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      ) {
        return el;
      }
    }
    return null;
  }, []);

  // Filter steps to those that currently have a visible element in the viewport
  const [availableSteps, setAvailableSteps] = useState<TourStepItem[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const visible = rawSteps.filter((s) => findVisibleTargetElement(s.targetAttr) !== null);
      setAvailableSteps(visible.length > 0 ? visible : rawSteps);
      setCurrentStepIndex(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [isOpen, rawSteps, findVisibleTargetElement]);

  const activeStep = availableSteps[currentStepIndex] || null;

  const updateHighlightPosition = useCallback(() => {
    if (!isOpen || !activeStep) return;
    const el = findVisibleTargetElement(activeStep.targetAttr);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [isOpen, activeStep, findVisibleTargetElement]);

  useEffect(() => {
    if (!isOpen || !activeStep) return;
    const el = findVisibleTargetElement(activeStep.targetAttr);
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {}
    }
    updateHighlightPosition();

    const handleResizeOrScroll = () => updateHighlightPosition();
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, activeStep, findVisibleTargetElement, updateHighlightPosition]);

  if (!isOpen || !activeStep) return null;

  const pad = 6;
  const spotTop = targetRect ? Math.max(4, targetRect.top - pad) : 0;
  const spotLeft = targetRect ? Math.max(4, targetRect.left - pad) : 0;
  const spotWidth = targetRect ? targetRect.width + pad * 2 : 0;
  const spotHeight = targetRect ? targetRect.height + pad * 2 : 0;

  // Calculate smart tooltip coordinates so it never overflows screen edges
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 768;
  const tooltipWidth = Math.min(360, viewportW - 24);

  const isTargetNearBottom = targetRect ? targetRect.top > viewportH * 0.62 : false;
  const tooltipTop = targetRect
    ? isTargetNearBottom
      ? Math.max(16, spotTop - 210)
      : Math.min(viewportH - 230, spotTop + spotHeight + 14)
    : Math.max(80, viewportH / 2 - 110);

  const rawTooltipLeft = targetRect
    ? spotLeft + spotWidth / 2 - tooltipWidth / 2
    : viewportW / 2 - tooltipWidth / 2;
  const tooltipLeft = Math.max(12, Math.min(viewportW - tooltipWidth - 12, rawTooltipLeft));

  const arrowLeftOffset = targetRect
    ? Math.max(20, Math.min(tooltipWidth - 28, spotLeft + spotWidth / 2 - tooltipLeft))
    : tooltipWidth / 2;

  const isLastStep = currentStepIndex >= availableSteps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Pengguna Portal NDTAXANDLAW"
    >
      {/* Dimmed Backdrop with Spotlight Cutout */}
      {targetRect ? (
        <div
          className="fixed rounded-xl transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: `${spotTop}px`,
            left: `${spotLeft}px`,
            width: `${spotWidth}px`,
            height: `${spotHeight}px`,
            boxShadow:
              '0 0 0 9999px rgba(15, 23, 42, 0.74), 0 0 0 3px #f59e0b, 0 0 28px 6px rgba(245, 158, 11, 0.45)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs" />
      )}

      {/* Click-blocker overlay around screen */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Spotlight Tooltip Pop-up Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
        className="fixed z-[101] bg-slate-900 text-white rounded-2xl border border-amber-400/50 shadow-2xl p-5 transition-all duration-300 ease-out"
      >
        {/* Pointer Arrow */}
        {targetRect && (
          <div
            style={{ left: `${arrowLeftOffset}px` }}
            className={`w-3.5 h-3.5 bg-slate-900 border-amber-400/50 rotate-45 absolute -translate-x-1/2 ${
              isTargetNearBottom
                ? '-bottom-2 border-r border-b'
                : '-top-2 border-l border-t'
            }`}
          />
        )}

        {/* Top Row: Badge + Close */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{activeStep.badgeText}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Explanation */}
        <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
          {activeStep.title}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
          {activeStep.description}
        </p>

        {/* Progress Dots & Navigation Buttons */}
        <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {availableSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-5 bg-amber-400'
                    : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Langkah ${idx + 1}`}
              />
            ))}
            <span className="text-[10px] font-mono text-slate-400 ml-1.5">
              {currentStepIndex + 1}/{availableSteps.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {currentStepIndex === 0 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Lewati
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}

            {!isLastStep ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentStepIndex((prev) => Math.min(availableSteps.length - 1, prev + 1))
                }
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 shadow-md transition-colors"
              >
                <span>Lanjut</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-md transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai &amp; Mengerti</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
