import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  Briefcase,
  Calculator,
  Calendar,
  RefreshCw,
  Plane,
  Landmark,
  Car,
  Home,
  ZoomIn,
  X,
  Download,
  QrCode,
  Wallet,
  Sparkles,
  ChevronRight,
  Users,
  FileText,
  BadgePercent,
} from 'lucide-react';
import { AuthUser } from '../types';

interface LandingPageProps {
  onEnterPortal: () => void;
  onOpenRegister: () => void;
  onOpenClientRegister?: () => void;
  currentUser?: AuthUser | null;
  userAvatarUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
}

type SimulationMode = 'per_kasus' | 'bulanan';

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterPortal,
  onOpenRegister,
  currentUser,
  userAvatarUrl,
  supportPhone = '0812-8899-7711',
  supportEmail = 'kemitraan@ndtaxandlaw.co.id',
}) => {
  // Interactive Commission Simulator State (strictly matching Poster rules)
  const [simMode, setSimMode] = useState<SimulationMode>('per_kasus');
  const [caseContractMillions, setCaseContractMillions] = useState<number>(150); // Default Rp 150 Juta (matches poster example)
  const [monthlyContractMillions, setMonthlyContractMillions] = useState<number>(12); // Default Rp 12 Juta/bulan (matches poster example)
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12); // Default 12 bulan
  const [closingCountPerMonth, setClosingCountPerMonth] = useState<number>(2);
  const [isPosterZoomed, setIsPosterZoomed] = useState<boolean>(false);

  // Tier calculation matching official poster:
  // JASA KONSULTAN PER KASUS:
  // - Di atas Rp100 juta -> 15%
  // - Rp50 - 100 juta -> 12,5%
  // - Di bawah Rp50 juta -> 10%
  const getCaseCommissionRate = (millions: number): number => {
    if (millions > 100) return 15;
    if (millions >= 50) return 12.5;
    return 10;
  };

  // JASA KONSULTAN BULANAN:
  // - Di atas Rp10 juta -> 15%
  // - Rp5 - 10 juta -> 12,5%
  // - Di bawah Rp5 juta -> 10%
  const getMonthlyCommissionRate = (millions: number): number => {
    if (millions > 10) return 15;
    if (millions >= 5) return 12.5;
    return 10;
  };

  const activeRate =
    simMode === 'per_kasus'
      ? getCaseCommissionRate(caseContractMillions)
      : getMonthlyCommissionRate(monthlyContractMillions);

  const contractValueRupiah =
    simMode === 'per_kasus'
      ? caseContractMillions * 1_000_000
      : monthlyContractMillions * 1_000_000;

  // Initial closing commission (first payment / case closing)
  const initialCommissionRupiah = Math.round(contractValueRupiah * (activeRate / 100));

  // Recurring monthly commission (10% tiap bulan sepanjang kontrak berjalan untuk layanan bulanan)
  const recurringMonthlyCommissionRupiah =
    simMode === 'bulanan' ? Math.round(contractValueRupiah * 0.1) : 0;

  // Total commission per 1 client contract
  const totalPerClientRupiah =
    simMode === 'per_kasus'
      ? initialCommissionRupiah
      : initialCommissionRupiah +
        recurringMonthlyCommissionRupiah * Math.max(0, contractDurationMonths - 1);

  // Total potential with multiple closings
  const grandTotalPotentialRupiah = totalPerClientRupiah * closingCountPerMonth;

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-[#071126] text-white flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navigation Bar — Strictly 4 Top-Level Items */}
      <header className="sticky top-0 z-40 bg-[#071126]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="ND TAX AND LAW"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block pl-3 border-l border-amber-400/40">
              <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400 block">
                PROGRAM MITRA STRATEGIS
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Eksklusif Rekrutmen &amp; Portal Kemitraan Resmi
              </span>
            </div>
          </div>

          {/* Navigation Anchors */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#skema-komisi" className="hover:text-amber-400 transition-colors">
              Skema Komisi 15% + 10%
            </a>
            <a href="#simulasi-komisi" className="hover:text-amber-400 transition-colors">
              Kalkulator Komisi Mitra
            </a>
            <a href="#bonus-mitra" className="hover:text-amber-400 transition-colors">
              Reward &amp; Bonus Prestasi
            </a>
            <a href="#alur-kemitraan" className="hover:text-amber-400 transition-colors">
              Cara Bergabung
            </a>
          </nav>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <button
                onClick={onEnterPortal}
                className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all flex items-center gap-2.5 whitespace-nowrap"
              >
                {userAvatarUrl && (
                  <img
                    src={userAvatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-900/20"
                  />
                )}
                <span>Buka Dashboard ({currentUser.name})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={onEnterPortal}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-all whitespace-nowrap"
                >
                  Masuk Portal Mitra
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-5 py-2.5 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Bergabung Menjadi Mitra</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION: Hook Utama & Poster Program Mitra Strategis */}
      <section className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-24 border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/50 via-[#071126] to-[#050C1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Power Hook & Value Proposition for Mitra */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-extrabold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>PROGRAM MITRA STRATEGIS • ND TAX AND LAW</span>
              </div>

              <div className="space-y-3">
                <p className="text-sm sm:text-base font-extrabold tracking-widest uppercase text-blue-300">
                  —— BERGABUNG MENJADI MITRA RESMI
                </p>
                <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.08] text-white uppercase">
                  PELUANG BISNIS JASA{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                    TANPA MODAL.
                  </span>
                  <span className="block mt-2 text-white">
                    CLOSING BESAR, KOMISI BESAR,{' '}
                    <span className="text-amber-400">BONUS BESAR.</span>
                  </span>
                </h1>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Bangun penghasilan aktif dan <strong className="text-white">passive income bulanan</strong> bersama firma konsultan pajak &amp; hukum korporasi terintegrasi. Anda cukup merekomendasikan relasi bisnis atau perusahaan—seluruh presentasi teknis, pengerjaan kasus, hingga kepatuhan pajak ditangani langsung oleh tim ahli berlisensi resmi <strong className="text-amber-300">NDTAXANDLAW</strong>.
              </p>

              {/* Key Commission Highlights from Poster */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-white/[0.06] border border-amber-400/30 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    KOMISI CLOSING AWAL
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">
                    Hingga 15%
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Dari nilai kontrak Jasa Per Kasus maupun Bulanan
                  </p>
                </div>

                <div className="bg-white/[0.06] border border-emerald-400/30 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    KOMISI BERULANG
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 tabular-nums">
                    +10% / Bulan
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Mengalir terus setiap bulan sepanjang kontrak klien aktif
                  </p>
                </div>

                <div className="bg-white/[0.06] border border-blue-400/30 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    MODAL PENDAFTARAN
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 tabular-nums">
                    Rp 0 (Gratis)
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Langsung dapat ID Card Ber-QR &amp; Link Referral Otomatis
                  </p>
                </div>
              </div>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="px-7 py-4 text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2.5 whitespace-nowrap"
                >
                  <span>Daftar Jadi Mitra Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#simulasi-komisi"
                  className="px-6 py-4 text-sm font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Hitung Simulasi Komisi Anda</span>
                </a>
              </div>

              {/* Operational Assurance Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cair setiap awal bulan setelah klien bayar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transparansi status deal &amp; bukti transfer real-time</span>
                </div>
              </div>
            </div>

            {/* Right Column: Official Program Mitra Strategis Poster Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow Backdrop */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-amber-500/30 via-blue-500/20 to-amber-400/30 rounded-3xl blur-xl opacity-80 pointer-events-none" />

                <div className="relative bg-[#0B1D3A] border-2 border-amber-400/50 rounded-3xl p-3 shadow-2xl">
                  {/* Top Bar inside Poster Frame */}
                  <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        MATERI RESMI PROGRAM MITRA STRATEGIS
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPosterZoomed(true)}
                      className="text-[11px] font-bold text-blue-300 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Perbesar</span>
                    </button>
                  </div>

                  {/* Attached Official Poster Image */}
                  <div
                    onClick={() => setIsPosterZoomed(true)}
                    className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/10"
                  >
                    <img
                      src="/assets/aistudio/image_34f52bcb.png"
                      alt="Program Mitra Strategis ND TAX AND LAW - Closing Besar, Komisi Besar, Bonus Besar"
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ZoomIn className="w-4 h-4 text-amber-400" />
                        Klik untuk melihat ukuran penuh
                      </span>
                      <a
                        href="/assets/aistudio/image_34f52bcb.png"
                        download="Program-Mitra-Strategis-NDTAXANDLAW.png"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh Brosur
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: SKEMA KOMISI TRANSPARAN (PER KASUS & BULANAN) — Sesuai Poster */}
      <section id="skema-komisi" className="py-20 bg-[#0A1730] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                STRUKTUR PEMBAGIAN HASIL MITRA
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Skema Komisi Besar: Jasa Per Kasus &amp; Jasa Bulanan
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Semakin besar nilai penjualan layanan yang berhasil closing dari referensi Anda, semakin tinggi persentase komisi yang langsung Anda terima.
              </p>
            </div>

            <div className="bg-amber-400/10 border border-amber-400/40 rounded-2xl px-5 py-3.5 flex items-center gap-3 self-start md:self-auto">
              <BadgePercent className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  MAKSIMAL KOMISI MITRA
                </div>
                <div className="text-lg font-black text-white">
                  15% Komisi Awal + 10% Tiap Bulan
                </div>
              </div>
            </div>
          </div>

          {/* 2 Main Cards matching the Poster Side-by-Side Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CARD 1: JASA KONSULTAN PER KASUS */}
            <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-900/40 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="bg-[#12316B] px-7 py-6 border-b-4 border-amber-400 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-200 block">
                        JASA KONSULTAN
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                        PER KASUS
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md bg-white/10 text-amber-300 border border-amber-400/30">
                    Case-by-Case
                  </span>
                </div>

                {/* Tier Progress Bars */}
                <div className="p-7 space-y-6">
                  {/* Tier 15% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        15%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan di atas Rp100 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-amber-500 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Tier 12,5% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        12,5%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan Rp50 – 100 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-[#12316B] rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Tier 10% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        10%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan di bawah Rp50 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/5 bg-slate-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contoh Simulasi Box (Bottom of Card 1) */}
              <div className="px-7 pb-7">
                <div className="bg-[#12316B] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">
                      CONTOH SIMULASI
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      Penjualan Rp150 juta
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                      KOMISI 15%
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                      Rp22,5 JT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: JASA KONSULTAN BULANAN */}
            <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-900/40 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="bg-[#12316B] px-7 py-6 border-b-4 border-amber-400 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-200 block">
                        JASA KONSULTAN
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                        BULANAN
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    +10% Tiap Bulan
                  </span>
                </div>

                {/* Tier Progress Bars */}
                <div className="p-7 space-y-6">
                  {/* Tier 15% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        15%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan di atas Rp10 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-amber-500 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Tier 12,5% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        12,5%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan Rp5 – 10 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-4/5 bg-[#12316B] rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Tier 10% */}
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        10%
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-9 space-y-2">
                      <div className="text-sm font-bold text-slate-800">
                        Penjualan di bawah Rp5 juta
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/5 bg-slate-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contoh Simulasi Box (Bottom of Card 2) */}
              <div className="px-7 pb-7">
                <div className="bg-[#12316B] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">
                      CONTOH SIMULASI
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      Penjualan Rp12 juta/bulan
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                      KOMISI 15%
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                      Rp1,8 JT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Bottom Highlight Boxes from Poster: Komisi Berulang & Cair Setiap Bulan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-[#0D2149] border-2 border-amber-400/60 rounded-2xl p-6 flex items-start gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">
                  Komisi <span className="text-amber-400">Berulang</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Mitra berhak mendapatkan komisi <strong className="text-amber-300">10% setiap bulan</strong> sepanjang kontrak klien berjalan. Sekali closing, penghasilan pasif mengalir rutin setiap bulan.
                </p>
              </div>
            </div>

            <div className="bg-[#0D2149] border-2 border-amber-400/60 rounded-2xl p-6 flex items-start gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">
                  Cair <span className="text-amber-400">Setiap Bulan</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Pembayaran komisi dilakukan <strong className="text-amber-300">setiap awal bulan</strong> setelah klien melakukan pembayaran, lengkap dengan notifikasi dan bukti transfer resmi di portal Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: KALKULATOR SIMULASI KOMISI & PASSIVE INCOME MITRA */}
      <section id="simulasi-komisi" className="py-20 bg-[#071126] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              SIMULATOR PENDAPATAN MITRA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Hitung Sendiri Potensi Komisi &amp; Passive Income Anda
            </h2>
            <p className="text-sm text-slate-300">
              Geser nilai kontrak penjualan di bawah ini untuk melihat perhitungan komisi otomatis sesuai skema resmi Program Mitra Strategis NDTAXANDLAW.
            </p>
          </div>

          <div className="bg-[#0C1D3B] border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    1. Pilih Jenis Layanan yang Direferensikan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSimMode('per_kasus')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        simMode === 'per_kasus'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-lg'
                          : 'bg-white/5 text-white border-white/15 hover:bg-white/10 font-semibold'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">Jasa Konsultan Per Kasus</div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            simMode === 'per_kasus' ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          Komisi 10% – 15% per proyek/kasus
                        </div>
                      </div>
                      <Briefcase className="w-5 h-5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimMode('bulanan')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        simMode === 'bulanan'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-lg'
                          : 'bg-white/5 text-white border-white/15 hover:bg-white/10 font-semibold'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">Jasa Konsultan Bulanan</div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            simMode === 'bulanan' ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          Komisi Awal 10–15% + 10% Tiap Bulan
                        </div>
                      </div>
                      <Calendar className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Contract Value Slider */}
                {simMode === 'per_kasus' ? (
                  <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        2. Nilai Kontrak Penjualan Per Kasus
                      </label>
                      <span className="text-lg font-black text-amber-400 tabular-nums">
                        Rp {caseContractMillions} Juta
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={500}
                      step={5}
                      value={caseContractMillions}
                      onChange={(e) => setCaseContractMillions(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>&lt; Rp50 Jt (10%)</span>
                      <span>Rp50–100 Jt (12,5%)</span>
                      <span>&gt; Rp100 Jt (15%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 bg-white/5 p-5 rounded-2xl border border-white/10">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          2. Nilai Retainer Klien Per Bulan
                        </label>
                        <span className="text-lg font-black text-amber-400 tabular-nums">
                          Rp {monthlyContractMillions} Juta / bulan
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={50}
                        step={1}
                        value={monthlyContractMillions}
                        onChange={(e) => setMonthlyContractMillions(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>&lt; Rp5 Jt (10%)</span>
                        <span>Rp5–10 Jt (12,5%)</span>
                        <span>&gt; Rp10 Jt (15%)</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Durasi Kontrak Langganan Klien
                        </label>
                        <span className="text-sm font-black text-emerald-400 tabular-nums">
                          {contractDurationMonths} Bulan
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={36}
                        step={1}
                        value={contractDurationMonths}
                        onChange={(e) => setContractDurationMonths(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>1 Bulan</span>
                        <span>12 Bulan</span>
                        <span>24 Bulan</span>
                        <span>36 Bulan</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Number of Closings Slider */}
                <div className="space-y-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      3. Jumlah Klien yang Anda Referensikan
                    </label>
                    <span className="text-base font-black text-white tabular-nums">
                      {closingCountPerMonth} Klien Closing
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={closingCountPerMonth}
                    onChange={(e) => setClosingCountPerMonth(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Right Output Card */}
              <div className="lg:col-span-5">
                <div className="bg-gradient-to-b from-[#132C5B] to-[#091834] border-2 border-amber-400 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 block">
                        HASIL SIMULASI KOMISI MITRA
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        Tier Komisi Anda: <span className="text-amber-400">{activeRate}%</span>
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-sm tabular-nums">
                      {activeRate}%
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-slate-300">
                        Komisi Closing Awal ({activeRate}% per klien):
                      </span>
                      <span className="font-bold text-white text-sm tabular-nums">
                        {formatRupiah(initialCommissionRupiah)}
                      </span>
                    </div>

                    {simMode === 'bulanan' && (
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-emerald-300 font-semibold">
                          {contractDurationMonths > 1
                            ? `Komisi Berulang 10% / bulan (bln ke-2 s/d ${contractDurationMonths}):`
                            : 'Komisi Berulang 10% / bulan (aktif mulai bln ke-2):'}
                        </span>
                        <span className="font-bold text-emerald-400 text-sm tabular-nums">
                          {formatRupiah(recurringMonthlyCommissionRupiah)} / bln
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-slate-300">Total Komisi per 1 Klien:</span>
                      <span className="font-bold text-amber-300 text-sm tabular-nums">
                        {formatRupiah(totalPerClientRupiah)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-amber-400/40 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 block">
                      ESTIMASI TOTAL PENDAPATAN ({closingCountPerMonth} KLIEN)
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                      {formatRupiah(grandTotalPotentialRupiah)}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dibayarkan langsung ke rekening bank Mitra setiap awal bulan setelah klien membayar tagihan.
                    </p>
                  </div>

                  <button
                    onClick={onOpenRegister}
                    className="w-full py-3.5 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Ambil Peluang Komisi Ini — Daftar Mitra</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: RAIH HADIAH IMPIAN — DAPATKAN BONUS KHUSUS MITRA BERPRESTASI */}
      <section
        id="bonus-mitra"
        className="py-20 bg-gradient-to-b from-[#D9A74A] via-[#C8963E] to-[#B8842D] text-slate-950 border-b border-amber-300/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#0D2149]">
                RAIH HADIAH IMPIAN
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-[#0D2149] tracking-tight uppercase mt-1">
                DAPATKAN BONUS!
              </h2>
            </div>

            <div className="bg-[#0D2149] text-white px-5 py-2.5 rounded-lg font-extrabold text-xs sm:text-sm uppercase tracking-wider self-start md:self-auto shadow-md">
              KHUSUS MITRA BERPRESTASI
            </div>
          </div>

          {/* 4 Bonus Cards matching the exact Poster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Bonus 1: Jalan-Jalan ke Luar Negeri */}
            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Plane className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Jalan-Jalan
                <span className="block">ke Luar Negeri</span>
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Apresiasi perjalanan eksklusif mancanegara bagi mitra dengan pencapaian target tahunan.
              </p>
            </div>

            {/* Bonus 2: Umroh */}
            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Landmark className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Umroh / Wisata Religi
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Hadiah ibadah Umroh atau perjalanan spiritual VIP penuh fasilitas bagi mitra berprestasi.
              </p>
            </div>

            {/* Bonus 3: Mobil */}
            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Car className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Mobil Impian
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Reward kendaraan operasional berkelas untuk mitra strategis dengan akumulasi closing korporasi tertinggi.
              </p>
            </div>

            {/* Bonus 4: Rumah */}
            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Home className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Rumah
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Grand reward properti hunian impian sebagai puncak pencapaian kemitraan strategis NDTAXANDLAW.
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold italic text-[#0D2149] mt-6">
            *Syarat dan ketentuan berlaku sesuai kebijakan pencapaian kuota tahunan Mitra Strategis NDTAXANDLAW.
          </p>
        </div>
      </section>

      {/* SECTION 4: ALUR KEMITRAAN & FASILITAS PORTAL MITRA */}
      <section id="alur-kemitraan" className="py-20 bg-[#071126] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              SISTEM KERJA TANPA MODAL &amp; TANPA RIBET
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              4 Langkah Mudah Menghasilkan Komisi &amp; Bonus Besar
            </h2>
            <p className="text-sm text-slate-300">
              Anda tidak perlu menguasai teknis perpajakan atau hukum yang rumit. Fokus pada jejaring relasi Anda, biarkan sistem dan tim ahli kami yang bekerja.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-amber-400 text-slate-950">
                  LANGKAH 01
                </span>
                <QrCode className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Daftar Gratis &amp; Terima ID Card Ber-QR
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Registrasi akun Mitra tanpa biaya. Anda langsung mendapatkan Kode Referral unik dan Kartu Identitas Digital Eksklusif ber-QR Code resmi.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-blue-500 text-white">
                  LANGKAH 02
                </span>
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Input Prospek atau Bagikan Link Referral
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gunakan Marketing Tools siap pakai di portal, bagikan link QR Anda, atau daftarkan perusahaan relasi yang membutuhkan jasa konsultan pajak &amp; hukum.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-indigo-500 text-white">
                  LANGKAH 03
                </span>
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Tim Ahli Kami Menangani Presentasi &amp; Proyek
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Konsultan berlisensi resmi NDTAXANDLAW melakukan pendampingan, negosiasi, hingga penyelesaian pekerjaan klien. Anda dapat memantau progresnya di dashboard.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-emerald-400/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-emerald-400 text-slate-950">
                  LANGKAH 04
                </span>
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Komisi Cair Rutin Setiap Awal Bulan
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Nikmati komisi hingga 15% saat closing ditambah 10% komisi berulang setiap bulan sepanjang kontrak klien berjalan, langsung ditransfer ke rekening Anda.
              </p>
            </div>
          </div>

          {/* Final Call-To-Action Banner */}
          <div className="mt-14 bg-gradient-to-r from-[#12316B] via-[#0F2756] to-[#12316B] border-2 border-amber-400/60 rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-2 text-center lg:text-left max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                PELUANG BISNIS JASA TANPA MODAL
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                CLOSING BESAR, KOMISI BESAR, BONUS BESAR!
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Bergabunglah bersama ekosistem Mitra Strategis NDTAXANDLAW hari ini. Dapatkan akses penuh ke Dashboard Kemitraan, Marketing Kit Eksklusif, dan Live Chat Koordinasi Tim.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5 shrink-0">
              <button
                onClick={onOpenRegister}
                className="px-7 py-4 text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <span>Daftar Menjadi Mitra Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onEnterPortal}
                className="px-6 py-4 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/15 border border-white/25 rounded-xl transition-all whitespace-nowrap"
              >
                Login Portal Mitra
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QUIET FOOTER */}
      <footer className="bg-[#040A17] text-slate-400 text-xs py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-white/10">
            <div className="space-y-3">
              <div className="bg-white inline-flex px-3 py-1.5 rounded-lg">
                <img
                  src="/assets/aistudio/logo_c3fdb6de.png"
                  alt="ND TAX AND LAW"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Program Mitra Strategis Resmi NDTAXANDLAW — Ekosistem Kemitraan Jasa Konsultan Pajak &amp; Hukum Korporasi dengan Komisi Berulang Transparan.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Navigasi Kemitraan
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <a href="#skema-komisi" className="hover:text-amber-400 transition-colors">
                    Skema Komisi Per Kasus &amp; Bulanan
                  </a>
                </li>
                <li>
                  <a href="#simulasi-komisi" className="hover:text-amber-400 transition-colors">
                    Kalkulator Simulasi Komisi Mitra
                  </a>
                </li>
                <li>
                  <a href="#bonus-mitra" className="hover:text-amber-400 transition-colors">
                    Program Bonus Mitra Berprestasi
                  </a>
                </li>
                <li>
                  <button
                    onClick={onOpenRegister}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Registrasi Mitra Baru
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Dukungan Mitra Strategis
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{supportPhone} (Hotline Kemitraan)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{supportEmail}</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Terintegrasi Sistem Pelacakan Komisi Real-Time</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>© 2026 NDTAXANDLAW. Program Mitra Strategis — Seluruh Hak Cipta Dilindungi.</div>
            <div className="flex items-center gap-4">
              <button onClick={onEnterPortal} className="text-slate-400 hover:text-amber-400">
                Masuk Portal Kemitraan
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX MODAL FOR FULL-SIZE POSTER */}
      {isPosterZoomed && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsPosterZoomed(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[92vh] bg-[#0B1D3A] border border-amber-400/50 rounded-2xl p-3 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Brosur Resmi Program Mitra Strategis ND TAX AND LAW
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="/assets/aistudio/image_34f52bcb.png"
                  download="Program-Mitra-Strategis-NDTAXANDLAW.png"
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar</span>
                </a>
                <button
                  onClick={() => setIsPosterZoomed(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 flex items-center justify-center">
              <img
                src="/assets/aistudio/image_34f52bcb.png"
                alt="Poster Program Mitra Strategis ND TAX AND LAW"
                className="max-h-[80vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
