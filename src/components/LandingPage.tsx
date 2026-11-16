import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  ArrowRight,
  ArrowUp,
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
  UserPlus,
  LogIn,
  Sun,
  Moon,
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
  // Theme Mode State (Dark / Light) persisted in localStorage
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('nd_landing_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const isDark = themeMode === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
    try {
      localStorage.setItem('nd_landing_theme', next);
    } catch {}
  };

  // Interactive Commission Simulator State (strictly matching Poster rules)
  const [simMode, setSimMode] = useState<SimulationMode>('per_kasus');
  const [caseContractMillions, setCaseContractMillions] = useState<number>(150); // Default Rp 150 Juta (matches poster example)
  const [monthlyContractMillions, setMonthlyContractMillions] = useState<number>(12); // Default Rp 12 Juta/bulan (matches poster example)
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12); // Default 12 bulan (1-36 step 1)
  const [closingCountPerMonth, setClosingCountPerMonth] = useState<number>(2);
  const [isPosterZoomed, setIsPosterZoomed] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [activeNavSection, setActiveNavSection] = useState<string>('top');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setShowScrollTop(scrollY > 300 || scrollY + windowHeight >= docHeight - 180);

      const sections = ['alur-kemitraan', 'bonus-mitra', 'simulasi-komisi', 'skema-komisi'];
      let found = 'top';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 220) {
            found = id;
            break;
          }
        }
      }
      setActiveNavSection(found);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tier calculation matching official poster:
  // JASA KONSULTAN PER KASUS:
  // - Di atas Rp100 juta -> 20%
  // - Rp50 - 100 juta -> 15%
  // - Di bawah Rp50 juta -> 10%
  const getCaseCommissionRate = (millions: number): number => {
    if (millions > 100) return 20;
    if (millions >= 50) return 15;
    return 10;
  };

  // JASA KONSULTAN BULANAN:
  // - Di atas Rp10 juta -> 20%
  // - Rp5 - 10 juta -> 15%
  // - Di bawah Rp5 juta -> 10%
  const getMonthlyCommissionRate = (millions: number): number => {
    if (millions > 10) return 20;
    if (millions >= 5) return 15;
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
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 pb-20 lg:pb-0 transition-colors duration-300 ${
        isDark ? 'bg-[#071126] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Navigation Bar — Responsive on Mobile & Desktop with Dark/Light Mode Switch */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
          isDark
            ? 'bg-[#071126]/95 border-white/10'
            : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Lockup — Never shrinks on mobile so logo is always 100% clear */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={scrollToTop}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border flex items-center shrink-0 cursor-pointer transition-all ${
                isDark
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
              }`}
              title="ND TAX AND LAW"
            >
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="ND TAX AND LAW"
                className="h-6 sm:h-8 w-[108px] sm:w-[136px] object-contain shrink-0"
              />
            </button>
            <div
              className={`hidden md:block pl-3 border-l ${
                isDark ? 'border-amber-400/40' : 'border-blue-800/30'
              }`}
            >
              <span
                className={`text-xs font-extrabold tracking-widest uppercase block ${
                  isDark ? 'text-amber-400' : 'text-[#12316B]'
                }`}
              >
                PROGRAM MITRA STRATEGIS
              </span>
              <span
                className={`text-[11px] font-medium ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Eksklusif Rekrutmen &amp; Portal Kemitraan Resmi
              </span>
            </div>
          </div>

          {/* Navigation Anchors (Desktop) */}
          <nav
            className={`hidden lg:flex items-center gap-7 text-xs font-semibold ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <a
              href="#skema-komisi"
              className={`transition-colors ${
                isDark ? 'hover:text-amber-400' : 'hover:text-blue-700'
              }`}
            >
              Skema Komisi 20% + 10%
            </a>
            <a
              href="#simulasi-komisi"
              className={`transition-colors ${
                isDark ? 'hover:text-amber-400' : 'hover:text-blue-700'
              }`}
            >
              Kalkulator Komisi Mitra
            </a>
            <a
              href="#bonus-mitra"
              className={`transition-colors ${
                isDark ? 'hover:text-amber-400' : 'hover:text-blue-700'
              }`}
            >
              Reward &amp; Bonus Prestasi
            </a>
            <a
              href="#alur-kemitraan"
              className={`transition-colors ${
                isDark ? 'hover:text-amber-400' : 'hover:text-blue-700'
              }`}
            >
              Cara Bergabung
            </a>
          </nav>

          {/* Primary Actions + Dark/Light Mode Switch */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
              aria-label="Toggle Dark atau Light Mode"
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 border-white/15 text-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden xl:inline text-[11px] text-white">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#12316B] shrink-0" />
                  <span className="hidden xl:inline text-[11px] text-slate-800">Dark</span>
                </>
              )}
            </button>

            {currentUser ? (
              <button
                onClick={onEnterPortal}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {userAvatarUrl && (
                  <img
                    src={userAvatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-900/20 shrink-0"
                  />
                )}
                <span className="sm:hidden">Portal</span>
                <span className="hidden sm:inline">Dashboard ({currentUser.name})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <>
                <button
                  onClick={onEnterPortal}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isDark
                      ? 'text-white bg-white/10 hover:bg-white/15 border-white/15'
                      : 'text-slate-800 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs'
                  }`}
                >
                  <LogIn
                    className={`w-3.5 h-3.5 hidden sm:inline ${
                      isDark ? 'text-amber-400' : 'text-[#12316B]'
                    }`}
                  />
                  <span>Masuk</span>
                </button>
                <button
                  onClick={onOpenRegister}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    isDark
                      ? 'text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/20'
                      : 'text-white bg-[#12316B] hover:bg-blue-900 shadow-blue-900/20'
                  }`}
                >
                  <span>Daftar Mitra</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION: Hook Utama & Poster Program Mitra Strategis */}
      <section
        className={`relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b transition-colors duration-300 ${
          isDark
            ? 'border-white/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/50 via-[#071126] to-[#050C1A]'
            : 'border-slate-200 bg-gradient-to-b from-blue-50/70 via-white to-slate-100/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Power Hook & Value Proposition for Mitra */}
            <div className="lg:col-span-7 space-y-6">
              <div
                className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-md border text-xs font-extrabold tracking-widest uppercase ${
                  isDark
                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                    : 'bg-[#12316B]/10 border-[#12316B]/25 text-[#12316B]'
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDark ? 'text-amber-400' : 'text-amber-600'
                  }`}
                />
                <span>PROGRAM MITRA STRATEGIS • ND TAX AND LAW</span>
              </div>

              <div className="space-y-3">
                <p
                  className={`text-xs sm:text-sm font-extrabold tracking-widest uppercase ${
                    isDark ? 'text-blue-300' : 'text-blue-800'
                  }`}
                >
                  —— BERGABUNG MENJADI MITRA RESMI
                </p>
                <h1
                  className={`text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.08] uppercase ${
                    isDark ? 'text-white' : 'text-[#0B1D3A]'
                  }`}
                >
                  PELUANG BISNIS JASA{' '}
                  <span
                    className={
                      isDark
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500'
                        : 'text-amber-600'
                    }
                  >
                    TANPA MODAL.
                  </span>
                  <span className={`block mt-2 ${isDark ? 'text-white' : 'text-[#0B1D3A]'}`}>
                    CLOSING BESAR, KOMISI BESAR,{' '}
                    <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>
                      BONUS BESAR.
                    </span>
                  </span>
                </h1>
              </div>

              <p
                className={`text-sm sm:text-base leading-relaxed max-w-2xl ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Bangun penghasilan aktif dan{' '}
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                  passive income bulanan
                </strong>{' '}
                bersama firma konsultan pajak &amp; hukum korporasi terintegrasi. Anda cukup
                merekomendasikan relasi bisnis atau perusahaan—seluruh presentasi teknis,
                pengerjaan kasus, hingga kepatuhan pajak ditangani langsung oleh tim ahli
                berlisensi resmi{' '}
                <strong className={isDark ? 'text-amber-300' : 'text-[#12316B]'}>
                  NDTAXANDLAW
                </strong>
                .
              </p>

              {/* Key Commission Highlights from Poster */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div
                  className={`rounded-2xl p-4 border ${
                    isDark
                      ? 'bg-white/[0.06] border-amber-400/30'
                      : 'bg-white border-amber-300 shadow-sm'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    KOMISI CLOSING AWAL
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
                      isDark ? 'text-white' : 'text-[#12316B]'
                    }`}
                  >
                    Hingga 20%
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Dari nilai kontrak Jasa Per Kasus maupun Bulanan
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-4 border ${
                    isDark
                      ? 'bg-white/[0.06] border-emerald-400/30'
                      : 'bg-white border-emerald-300 shadow-sm'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    KOMISI BERULANG
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    +10% / Bulan
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Mengalir terus setiap bulan sepanjang kontrak klien aktif
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-4 border ${
                    isDark
                      ? 'bg-white/[0.06] border-blue-400/30'
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'text-blue-300' : 'text-blue-800'
                    }`}
                  >
                    MODAL PENDAFTARAN
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
                      isDark ? 'text-white' : 'text-[#12316B]'
                    }`}
                  >
                    Rp 0 (Gratis)
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Langsung dapat ID Card Ber-QR &amp; Link Referral Otomatis
                  </p>
                </div>
              </div>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="px-6 sm:px-7 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Daftar Mitra Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#simulasi-komisi"
                  className={`px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-bold rounded-xl border transition-all flex items-center gap-2 whitespace-nowrap ${
                    isDark
                      ? 'text-white bg-white/10 hover:bg-white/15 border-white/20'
                      : 'text-[#12316B] bg-white hover:bg-blue-50 border-slate-300 shadow-xs'
                  }`}
                >
                  <Calculator
                    className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                  <span>Hitung Simulasi Komisi</span>
                </a>
              </div>

              {/* Operational Assurance Bar */}
              <div
                className={`pt-4 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-xs ${
                  isDark
                    ? 'border-white/10 text-slate-300'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Cair setiap awal bulan setelah klien bayar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Transparansi status deal &amp; bukti transfer real-time</span>
                </div>
              </div>
            </div>

            {/* Right Column: Official Program Mitra Strategis Poster Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-2 bg-gradient-to-tr from-amber-500/30 via-blue-500/20 to-amber-400/30 rounded-3xl blur-xl opacity-80 pointer-events-none" />

                <div className="relative bg-[#0B1D3A] border-2 border-amber-400/60 rounded-3xl p-3 shadow-2xl">
                  <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        MATERI RESMI PROGRAM MITRA STRATEGIS
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPosterZoomed(true)}
                      className="text-[11px] font-bold text-blue-300 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Perbesar</span>
                    </button>
                  </div>

                  <div
                    onClick={() => setIsPosterZoomed(true)}
                    className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/10"
                  >
                    <img
                      src="/assets/aistudio/9555b616-9ff3-4d7d-83ac-4bbcb7bde59e_page-0001_99829f74.jpg"
                      alt="Program Mitra Strategis ND TAX AND LAW - Closing Besar, Komisi Besar, Bonus Besar"
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ZoomIn className="w-4 h-4 text-amber-400" />
                        Klik untuk melihat ukuran penuh
                      </span>
                      <a
                        href="/assets/aistudio/9555b616-9ff3-4d7d-83ac-4bbcb7bde59e_page-0001_99829f74.jpg"
                        download="Program-Mitra-Strategis-NDTAXANDLAW.jpg"
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
      <section
        id="skema-komisi"
        className={`py-20 border-b transition-colors duration-300 ${
          isDark ? 'bg-[#0A1730] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2 max-w-2xl">
              <span
                className={`text-xs font-extrabold uppercase tracking-widest ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                }`}
              >
                STRUKTUR PEMBAGIAN HASIL MITRA
              </span>
              <h2
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-[#0B1D3A]'
                }`}
              >
                Skema Komisi Besar: Jasa Per Kasus &amp; Jasa Bulanan
              </h2>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Semakin besar nilai penjualan layanan yang berhasil closing dari referensi Anda,
                semakin tinggi persentase komisi yang langsung Anda terima.
              </p>
            </div>

            <div
              className={`rounded-2xl px-5 py-3.5 flex items-center gap-3 self-start md:self-auto border ${
                isDark
                  ? 'bg-amber-400/10 border-amber-400/40'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <BadgePercent
                className={`w-8 h-8 shrink-0 ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                }`}
              />
              <div>
                <div
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}
                >
                  MAKSIMAL KOMISI MITRA
                </div>
                <div
                  className={`text-lg font-black ${
                    isDark ? 'text-white' : 'text-[#0B1D3A]'
                  }`}
                >
                  20% Komisi Awal + 10% Tiap Bulan
                </div>
              </div>
            </div>
          </div>

          {/* 2 Main Cards matching the Poster Side-by-Side Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CARD 1: JASA KONSULTAN PER KASUS */}
            <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-[#12316B]/25 flex flex-col justify-between">
              <div>
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

                <div className="p-7 space-y-6">
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        20%
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

                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        15%
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
                      KOMISI 20%
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                      Rp30 JT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: JASA KONSULTAN BULANAN */}
            <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-[#12316B]/25 flex flex-col justify-between">
              <div>
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

                <div className="p-7 space-y-6">
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        20%
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

                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className="col-span-4 sm:col-span-3">
                      <span className="text-3xl sm:text-4xl font-black text-[#12316B] tabular-nums">
                        15%
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
                      KOMISI 20%
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                      Rp2,4 JT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Bottom Highlight Boxes from Poster: Komisi Berulang & Cair Setiap Bulan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-[#0D2149] border-2 border-amber-400/60 rounded-2xl p-6 flex items-start gap-4 shadow-lg text-white">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">
                  Komisi <span className="text-amber-400">Berulang</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Mitra berhak mendapatkan komisi{' '}
                  <strong className="text-amber-300">10% setiap bulan</strong> sepanjang kontrak
                  klien berjalan. Sekali closing, penghasilan pasif mengalir rutin setiap bulan.
                </p>
              </div>
            </div>

            <div className="bg-[#0D2149] border-2 border-amber-400/60 rounded-2xl p-6 flex items-start gap-4 shadow-lg text-white">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-white">
                  Cair <span className="text-amber-400">Setiap Bulan</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Pembayaran komisi dilakukan{' '}
                  <strong className="text-amber-300">setiap awal bulan</strong> setelah klien
                  melakukan pembayaran, lengkap dengan notifikasi dan bukti transfer resmi di
                  portal Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: KALKULATOR SIMULASI KOMISI & PASSIVE INCOME MITRA */}
      <section
        id="simulasi-komisi"
        className={`py-20 border-b transition-colors duration-300 ${
          isDark ? 'bg-[#071126] border-white/10' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span
              className={`text-xs font-extrabold uppercase tracking-widest ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            >
              SIMULATOR PENDAPATAN MITRA
            </span>
            <h2
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-[#0B1D3A]'
              }`}
            >
              Hitung Sendiri Potensi Komisi &amp; Passive Income Anda
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Geser nilai kontrak penjualan di bawah ini untuk melihat perhitungan komisi
              otomatis sesuai skema resmi Program Mitra Strategis NDTAXANDLAW.
            </p>
          </div>

          <div
            className={`rounded-3xl p-6 sm:p-10 shadow-2xl border ${
              isDark
                ? 'bg-[#0C1D3B] border-white/15 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Mode Selector */}
                <div className="space-y-2">
                  <label
                    className={`text-xs font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    1. Pilih Jenis Layanan yang Direferensikan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSimMode('per_kasus')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        simMode === 'per_kasus'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-lg'
                          : isDark
                          ? 'bg-white/5 text-white border-white/15 hover:bg-white/10 font-semibold'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">Jasa Konsultan Per Kasus</div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            simMode === 'per_kasus'
                              ? 'text-slate-800'
                              : isDark
                              ? 'text-slate-400'
                              : 'text-slate-500'
                          }`}
                        >
                          Komisi 10% – 20% per proyek/kasus
                        </div>
                      </div>
                      <Briefcase className="w-5 h-5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimMode('bulanan')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        simMode === 'bulanan'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold shadow-lg'
                          : isDark
                          ? 'bg-white/5 text-white border-white/15 hover:bg-white/10 font-semibold'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">Jasa Konsultan Bulanan</div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            simMode === 'bulanan'
                              ? 'text-slate-800'
                              : isDark
                              ? 'text-slate-400'
                              : 'text-slate-500'
                          }`}
                        >
                          Komisi Awal 10–20% + 10% Tiap Bulan
                        </div>
                      </div>
                      <Calendar className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Contract Value Slider */}
                {simMode === 'per_kasus' ? (
                  <div
                    className={`space-y-2 p-5 rounded-2xl border ${
                      isDark
                        ? 'bg-white/5 border-white/10'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        2. Nilai Kontrak Penjualan Per Kasus
                      </label>
                      <span
                        className={`text-lg font-black tabular-nums ${
                          isDark ? 'text-amber-400' : 'text-[#12316B]'
                        }`}
                      >
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
                    <div
                      className={`flex justify-between text-[11px] font-mono ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <span>&lt; Rp50 Jt (10%)</span>
                      <span>Rp50–100 Jt (15%)</span>
                      <span>&gt; Rp100 Jt (20%)</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`space-y-5 p-5 rounded-2xl border ${
                      isDark
                        ? 'bg-white/5 border-white/10'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          2. Nilai Retainer Klien Per Bulan
                        </label>
                        <span
                          className={`text-lg font-black tabular-nums ${
                            isDark ? 'text-amber-400' : 'text-[#12316B]'
                          }`}
                        >
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
                      <div
                        className={`flex justify-between text-[11px] font-mono ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>&lt; Rp5 Jt (10%)</span>
                        <span>Rp5–10 Jt (15%)</span>
                        <span>&gt; Rp10 Jt (20%)</span>
                      </div>
                    </div>

                    <div
                      className={`space-y-2 pt-3 border-t ${
                        isDark ? 'border-white/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Durasi Kontrak Langganan Klien
                        </label>
                        <span
                          className={`text-sm font-black tabular-nums ${
                            isDark ? 'text-emerald-400' : 'text-emerald-600'
                          }`}
                        >
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
                      <div
                        className={`flex justify-between text-[11px] font-mono ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <span>1 Bulan</span>
                        <span>12 Bulan</span>
                        <span>24 Bulan</span>
                        <span>36 Bulan</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Number of Closings Slider */}
                <div
                  className={`space-y-2 p-5 rounded-2xl border ${
                    isDark
                      ? 'bg-white/5 border-white/10'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      3. Jumlah Klien yang Anda Referensikan
                    </label>
                    <span
                      className={`text-base font-black tabular-nums ${
                        isDark ? 'text-white' : 'text-[#12316B]'
                      }`}
                    >
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
                <div className="bg-gradient-to-b from-[#132C5B] to-[#091834] border-2 border-amber-400 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl text-white">
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
                      Dibayarkan langsung ke rekening bank Mitra setiap awal bulan setelah klien
                      membayar tagihan.
                    </p>
                  </div>

                  <button
                    onClick={onOpenRegister}
                    className="w-full py-3.5 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Plane className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Jalan-Jalan
                <span className="block">ke Luar Negeri</span>
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Apresiasi perjalanan eksklusif mancanegara bagi mitra dengan pencapaian target
                tahunan.
              </p>
            </div>

            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Landmark className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">
                Umroh / Wisata Religi
              </h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Hadiah ibadah Umroh atau perjalanan spiritual VIP penuh fasilitas bagi mitra
                berprestasi.
              </p>
            </div>

            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Car className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">Mobil Impian</h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Reward kendaraan operasional berkelas untuk mitra strategis dengan akumulasi
                closing korporasi tertinggi.
              </p>
            </div>

            <div className="bg-[#12316B] text-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-white/15 hover:-translate-y-1 transition-transform">
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex items-center justify-center mb-5 bg-[#0D2149]">
                <Home className="w-9 h-9 text-amber-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white leading-snug">Rumah</h3>
              <p className="text-xs text-blue-200 mt-2 leading-relaxed">
                Grand reward properti hunian impian sebagai puncak pencapaian kemitraan
                strategis NDTAXANDLAW.
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold italic text-[#0D2149] mt-6">
            *Syarat dan ketentuan berlaku sesuai kebijakan pencapaian kuota tahunan Mitra
            Strategis NDTAXANDLAW.
          </p>
        </div>
      </section>

      {/* SECTION 4: ALUR KEMITRAAN & FASILITAS PORTAL MITRA */}
      <section
        id="alur-kemitraan"
        className={`py-20 border-b transition-colors duration-300 ${
          isDark ? 'bg-[#071126] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span
              className={`text-xs font-extrabold uppercase tracking-widest ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            >
              SISTEM KERJA TANPA MODAL &amp; TANPA RIBET
            </span>
            <h2
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-[#0B1D3A]'
              }`}
            >
              4 Langkah Mudah Menghasilkan Komisi &amp; Bonus Besar
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Anda tidak perlu menguasai teknis perpajakan atau hukum yang rumit. Fokus pada
              jejaring relasi Anda, biarkan sistem dan tim ahli kami yang bekerja.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              className={`rounded-2xl p-6 space-y-4 border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-amber-400 text-slate-950">
                  LANGKAH 01
                </span>
                <QrCode className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              </div>
              <h3
                className={`text-base font-extrabold ${
                  isDark ? 'text-white' : 'text-[#0B1D3A]'
                }`}
              >
                Daftar Gratis &amp; Terima ID Card Ber-QR
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Registrasi akun Mitra tanpa biaya. Anda langsung mendapatkan Kode Referral unik
                dan Kartu Identitas Digital Eksklusif ber-QR Code resmi.
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 space-y-4 border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-blue-600 text-white">
                  LANGKAH 02
                </span>
                <Users className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3
                className={`text-base font-extrabold ${
                  isDark ? 'text-white' : 'text-[#0B1D3A]'
                }`}
              >
                Input Prospek atau Bagikan Link Referral
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Gunakan Marketing Tools siap pakai di portal, bagikan link QR Anda, atau
                daftarkan perusahaan relasi yang membutuhkan jasa konsultan pajak &amp; hukum.
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 space-y-4 border ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-indigo-600 text-white">
                  LANGKAH 03
                </span>
                <FileText
                  className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                />
              </div>
              <h3
                className={`text-base font-extrabold ${
                  isDark ? 'text-white' : 'text-[#0B1D3A]'
                }`}
              >
                Tim Ahli Kami Menangani Presentasi &amp; Proyek
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Konsultan berlisensi resmi NDTAXANDLAW melakukan pendampingan, negosiasi, hingga
                penyelesaian pekerjaan klien. Anda dapat memantau progresnya di dashboard.
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 space-y-4 border ${
                isDark
                  ? 'bg-white/[0.04] border-emerald-400/30'
                  : 'bg-emerald-50/60 border-emerald-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-3 py-1 rounded-md bg-emerald-500 text-slate-950">
                  LANGKAH 04
                </span>
                <TrendingUp
                  className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
              </div>
              <h3
                className={`text-base font-extrabold ${
                  isDark ? 'text-white' : 'text-[#0B1D3A]'
                }`}
              >
                Komisi Cair Rutin Setiap Awal Bulan
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Nikmati komisi hingga 20% saat closing ditambah 10% komisi berulang setiap bulan
                sepanjang kontrak klien berjalan, langsung ditransfer ke rekening Anda.
              </p>
            </div>
          </div>

          {/* Final Call-To-Action Banner */}
          <div className="mt-14 bg-gradient-to-r from-[#12316B] via-[#0F2756] to-[#12316B] border-2 border-amber-400/60 rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl text-white">
            <div className="space-y-2 text-center lg:text-left max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                PELUANG BISNIS JASA TANPA MODAL
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                CLOSING BESAR, KOMISI BESAR, BONUS BESAR!
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Bergabunglah bersama ekosistem Mitra Strategis NDTAXANDLAW hari ini. Dapatkan
                akses penuh ke Dashboard Kemitraan, Marketing Kit Eksklusif, dan Live Chat
                Koordinasi Tim.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5 shrink-0">
              <button
                onClick={onOpenRegister}
                className="px-7 py-4 text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>Daftar Mitra Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onEnterPortal}
                className="px-6 py-4 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/15 border border-white/25 rounded-xl transition-all whitespace-nowrap cursor-pointer"
              >
                Masuk Portal
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
                Program Mitra Strategis Resmi NDTAXANDLAW — Ekosistem Kemitraan Jasa Konsultan
                Pajak &amp; Hukum Korporasi dengan Komisi Berulang Transparan.
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
                    className="hover:text-amber-400 transition-colors text-left cursor-pointer"
                  >
                    Daftar Mitra Baru
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
            <div>
              © 2026 NDTAXANDLAW. Program Mitra Strategis — Seluruh Hak Cipta Dilindungi.
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onEnterPortal}
                className="text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                Masuk Portal Kemitraan
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* FLOATING SCROLL-TO-TOP BUTTON (One-click smooth scroll to top) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="Kembali ke Atas"
          aria-label="Scroll ke atas"
          className="fixed bottom-20 lg:bottom-7 right-4 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/30 border-2 border-white/90 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Ke Atas</span>
        </button>
      )}

      {/* ANDROID APK-STYLE BOTTOM NAVIGATION BAR ON MOBILE & TABLET */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.45)] px-2 py-1.5 transition-colors duration-300 ${
          isDark
            ? 'bg-[#071126]/95 border-white/15'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1">
          <a
            href="#skema-komisi"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeNavSection === 'skema-komisi'
                ? isDark
                  ? 'text-amber-400 font-extrabold'
                  : 'text-[#12316B] font-extrabold'
                : isDark
                ? 'text-slate-300 hover:text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <BadgePercent className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Komisi</span>
          </a>

          <a
            href="#simulasi-komisi"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeNavSection === 'simulasi-komisi'
                ? isDark
                  ? 'text-amber-400 font-extrabold'
                  : 'text-[#12316B] font-extrabold'
                : isDark
                ? 'text-slate-300 hover:text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Calculator className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Simulasi</span>
          </a>

          <button
            type="button"
            onClick={currentUser ? onEnterPortal : onOpenRegister}
            className="flex flex-col items-center justify-center -mt-4 cursor-pointer group"
          >
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 group-active:scale-95 transition-transform ${
                isDark ? 'border-[#071126]' : 'border-white'
              }`}
            >
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span
              className={`text-[10px] font-extrabold mt-0.5 leading-tight ${
                isDark ? 'text-amber-400' : 'text-[#12316B]'
              }`}
            >
              {currentUser ? 'Portal' : 'Daftar'}
            </span>
          </button>

          <a
            href="#bonus-mitra"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeNavSection === 'bonus-mitra'
                ? isDark
                  ? 'text-amber-400 font-extrabold'
                  : 'text-[#12316B] font-extrabold'
                : isDark
                ? 'text-slate-300 hover:text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Award className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Bonus</span>
          </a>

          <a
            href="#alur-kemitraan"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeNavSection === 'alur-kemitraan'
                ? isDark
                  ? 'text-amber-400 font-extrabold'
                  : 'text-[#12316B] font-extrabold'
                : isDark
                ? 'text-slate-300 hover:text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Alur</span>
          </a>
        </div>
      </nav>

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
                  href="/assets/aistudio/9555b616-9ff3-4d7d-83ac-4bbcb7bde59e_page-0001_99829f74.jpg"
                  download="Program-Mitra-Strategis-NDTAXANDLAW.jpg"
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
                src="/assets/aistudio/9555b616-9ff3-4d7d-83ac-4bbcb7bde59e_page-0001_99829f74.jpg"
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
