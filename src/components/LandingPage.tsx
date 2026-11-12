import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Award,
  Users,
  Building2,
  ArrowRight,
  Calculator,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  Briefcase,
  Zap,
  Repeat,
  Check,
  DollarSign
} from 'lucide-react';
import { AuthUser } from '../types';
import { MALE_AVATAR_URL } from '../avatars';

interface LandingPageProps {
  onEnterPortal: () => void;
  onOpenRegister: () => void;
  onOpenClientRegister?: () => void;
  currentUser?: AuthUser | null;
  userAvatarUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterPortal,
  onOpenRegister,
  onOpenClientRegister,
  currentUser,
  userAvatarUrl,
  supportPhone = '0812-8899-7711',
  supportEmail = 'advisory@ndtaxlaw.com',
}) => {
  // Interactive Fee Estimator State
  const [companyTurnover, setCompanyTurnover] = useState<number>(3); // in Billion IDR
  const [serviceTier, setServiceTier] = useState<'basic' | 'comprehensive' | 'premium'>('comprehensive');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['spt_masa']);

  // Calculate estimated retainer
  const calculateEstimatedFee = () => {
    let base = 5000000;
    if (serviceTier === 'basic') base = 3500000;
    if (serviceTier === 'premium') base = 8500000;

    const turnoverMultiplier = 1 + (companyTurnover * 0.15);
    let total = base * turnoverMultiplier;

    if (selectedAddons.includes('spt_masa')) total += 2000000;
    if (selectedAddons.includes('sp2dk_defense')) total += 3500000;
    if (selectedAddons.includes('legal_retainer')) total += 4000000;

    return Math.round(total / 500000) * 500000;
  };

  const toggleAddon = (addon: string) => {
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== addon));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-800 flex flex-col font-sans pb-16 lg:pb-0">
      
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-3 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] min-w-0">
            <span className="flex items-center gap-1.5 text-blue-400 truncate">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Konsultan Pajak &amp; Kuasa Hukum Pengadilan Pajak Resmi</span>
            </span>
            <span className="hidden xl:inline text-slate-500">•</span>
            <span className="hidden xl:inline text-slate-400 truncate">
              Standar Akuntansi Keuangan SAK / ETAP / IFRS Compliant
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] shrink-0 ml-auto">
            <a
              href={`https://wa.me/${supportPhone.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20NDTAXANDLAW,%20saya%20ingin%20konsultasi%20mengenai%20jasa%20keuangan%20dan%20laporan%20pajak.`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 whitespace-nowrap"
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>Hotline: {supportPhone}</span>
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <button
              onClick={onEnterPortal}
              className="hidden sm:inline text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap"
            >
              Masuk Portal Mitra →
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation (Desktop Top Bar & Mobile Compact Header) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand Identity (Hanya Logo) */}
          <a href="#" className="flex items-center min-w-0 shrink-0">
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="Logo NDTAXANDLAW"
                className="h-7 sm:h-8 lg:h-9 w-auto object-contain"
              />
            </div>
          </a>

          {/* Desktop Navigation Links (Tampil di Atas pada Layar Desktop lg+) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-xs xl:text-sm font-semibold text-slate-700 shrink-0">
            <a href="#layanan" className="hover:text-blue-700 transition-colors whitespace-nowrap py-1">
              Layanan Keuangan &amp; Pajak
            </a>
            <a href="#kalkulator" className="hover:text-blue-700 transition-colors whitespace-nowrap py-1">
              Simulasi Biaya Retainer
            </a>
            <a href="#keunggulan" className="hover:text-blue-700 transition-colors whitespace-nowrap py-1">
              Mengapa NDTAXANDLAW
            </a>
            <a href="#kemitraan" className="hover:text-blue-700 transition-colors flex items-center gap-1.5 text-blue-700 font-bold whitespace-nowrap py-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Program Mitra &amp; Referral</span>
            </a>
          </nav>

          {/* Action CTA: Jika belum login tampilkan tombol Masuk dan Daftar, jika sudah login gambar profil saja */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {currentUser ? (
              <button
                onClick={onEnterPortal}
                title={`Buka Portal (${currentUser.name})`}
                className="relative group rounded-full p-0.5 border-2 border-blue-600 hover:border-amber-500 shadow-sm hover:shadow-md transition-all focus:outline-hidden"
              >
                <img
                  src={userAvatarUrl || MALE_AVATAR_URL}
                  alt={currentUser.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-100"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onEnterPortal}
                  className="inline-flex items-center justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all whitespace-nowrap"
                >
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap"
                >
                  <span>Daftar</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Menu di Bawah khusus Mobile seperti Aplikasi) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] px-2 py-1.5"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <a
            href="#layanan"
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-blue-700" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Layanan</span>
          </a>
          <a
            href="#kalkulator"
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
          >
            <Calculator className="w-4 h-4 text-blue-700" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Simulasi</span>
          </a>
          <a
            href="#keunggulan"
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Keunggulan</span>
          </a>
          <a
            href="#kemitraan"
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-700" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Kemitraan</span>
          </a>
          <button
            type="button"
            onClick={onEnterPortal}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-blue-700 text-white shadow-xs transition-colors"
          >
            {currentUser ? (
              <img
                src={userAvatarUrl || MALE_AVATAR_URL}
                alt={currentUser.name}
                className="w-4 h-4 rounded-full object-cover border border-white"
              />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span className="text-[10px] font-bold mt-0.5 truncate">
              {currentUser ? 'Portal' : 'Masuk'}
            </span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-20 lg:py-24">
        {/* Subtle geometric grid backdrop */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Firma Konsultan Pajak & Kuasa Hukum Terakreditasi
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Solusi Terpadu Jasa Keuangan, Akuntansi & Kepatuhan Pajak Korporasi
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Bebaskan bisnis Anda dari risiko sanksi administrasi, surat panggilan SP2DK, dan ketidakakuratan laporan keuangan. Didukung tim Akuntan Berregister Negara dan Kuasa Hukum Pajak berpengalaman lebih dari 15 tahun.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="https://wa.me/6281288997711?text=Halo%20NDTAXANDLAW,%20saya%20ingin%20konsultasi%20laporan%20keuangan%20dan%20pajak%20badan."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg hover:shadow-amber-400/20 transition-all"
              >
                <Phone className="w-4 h-4" />
                Konsultasi Pajak Gratis via WhatsApp
              </a>

              <a
                href="#kemitraan"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all"
              >
                <span>Program Afiliasi Mitra (Komisi Bulanan)</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Credential Badges */}
            <div className="pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Konsultan Pajak Berizin Kemenkeu</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kuasa Hukum Pengadilan Pajak</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Standar PSAK & Fiskal DJP</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Garansi Kerahasiaan Data (NDA)</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Quick Statistics Bar */}
      <section className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-2">
              <div className="text-2xl lg:text-3xl font-extrabold text-blue-900 font-mono">350+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Klien Korporasi Aktif</div>
            </div>
            <div className="p-2">
              <div className="text-2xl lg:text-3xl font-extrabold text-blue-900 font-mono">99.4%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">SP2DK Selesai Tanpa Denda</div>
            </div>
            <div className="p-2">
              <div className="text-2xl lg:text-3xl font-extrabold text-blue-900 font-mono">Rp 280M+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Aset Finansial Terkelola</div>
            </div>
            <div className="p-2">
              <div className="text-2xl lg:text-3xl font-extrabold text-blue-900 font-mono">48+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Mitra Konsultan Berlisensi</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="layanan" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-md uppercase tracking-wider">
              PORTFOLIO LAYANAN UNGGULAN
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Layanan Keuangan, Pembukuan & Laporan Pajak Profesional
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kami menyusun laporan keuangan yang tidak hanya akurat untuk dewan direksi dan bank kreditur, tetapi juga selaras dengan aturan perundang-undangan perpajakan nasional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Service 1 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                    AKUNTANSI & AUDIT
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                    Penyusunan Laporan Keuangan (Komersial & Fiskal)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Penyusunan Neraca, Laporan Laba Rugi Komprehensif, Arus Kas (Cash Flow), Perubahan Ekuitas, serta Catatan Atas Laporan Keuangan (CALK) standar PSAK.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rekonsiliasi Bank & Penyesuaian Jurnal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Laporan Keuangan untuk Pengajuan Kredit Bank</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Opsi: Retainer Bulanan atau Tutup Buku Tahunan</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Mulai Dari</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">Rp 450.000 <span className="text-[10px] text-slate-500 font-normal">/ bln</span></div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Halo,%20saya%20ingin%20informasi%20layanan%20Laporan%20Keuangan%20Bulanan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Konsultasi →
                </a>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-blue-500 shadow-md hover:shadow-xl transition-all relative flex flex-col justify-between">
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Paling Sering Digunakan
              </div>
              <div className="space-y-4 pt-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                    KEPATUHAN PERPAJAKAN
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    Paket Kepatuhan Pajak Bulanan & SPT Tahunan Badan
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Penanganan menyeluruh administrasi perpajakan: SPT Masa PPh 21, 23, 25, 4(2), pelaporan e-Faktur PPN 1111, serta formulir SPT Tahunan Badan 1771.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pembuatan Bukti Potong e-Bupot Unifikasi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Koreksi Fiskal Positif & Negatif Akurat</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pelaporan Resmi DJP Online (Nihil Denda Keterlambatan)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Mulai Dari</div>
                  <div className="text-base font-extrabold text-blue-700 font-mono">Rp 450.000 <span className="text-[10px] text-slate-500 font-normal">/ bln</span></div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Halo,%20saya%20ingin%20konsultasi%20Kepatuhan%20Pajak%20Bulanan%20dan%20SPT%20Tahunan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
                >
                  Pilih Layanan →
                </a>
              </div>
            </div>

            {/* Service 3 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded">
                    LITIGASI & PEMERIKSAAN
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-amber-700 transition-colors">
                    Pendampingan SP2DK & Audit Pajak
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bantuan hukum dan rekonsiliasi data jika perusahaan Anda menerima Surat Permintaan Penjelasan (SP2DK) atau Surat Pemberitahuan Pemeriksaan Pajak dari KPP.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Penyusunan Surat Tanggapan Resmi SP2DK</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pendampingan Pertemuan Tatap Muka dengan AR</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ekualisasi Data Omset vs Rekening Koran</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Skema</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">Case-by-Case</div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Darurat%20SP2DK:%20Perusahaan%20kami%20menerima%20surat%20dari%20KPP%20dan%20memerlukan%20pendampingan%20segera."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  Bantuan Darurat →
                </a>
              </div>
            </div>

            {/* Service 4 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                    STRATEGI & EFISIENSI
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">
                    Tax Planning & Transfer Pricing (TP Doc)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Perencanaan pajak legal korporasi guna meminimalkan beban pajak secara sah, penyusunan Master File dan Local File untuk transaksi pihak terafiliasi.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Analisis Skema Restrukturisasi Bisnis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Penyusunan Dokumentasi Penentuan Harga Transfer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kajian Insentif Tax Holiday / Super Deduction</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Skema</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">Proyek / Retainer</div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Halo,%20saya%20ingin%20konsultasi%20Tax%20Planning%20dan%20TP%20Doc."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  Konsultasi →
                </a>
              </div>
            </div>

            {/* Service 5 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded">
                    LEGALITAS USAHA
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-purple-700 transition-colors">
                    Pendirian PT / PMA & Perizinan Berusaha OSS-RBA
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Layanan legalitas satu pintu: Akta Notaris, SK Kemenkumham, NPWP Badan, Nomor Induk Berusaha (NIB) Berbasis Risiko, dan izin operasional komersial.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PT Domestik & PT Penanaman Modal Asing (PMA)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Integrasi Sistem OSS-RBA BKPM</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Penyusunan Perjanjian Pemegang Saham (SHA)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Mulai Dari</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">Rp 450.000</div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Halo,%20saya%20ingin%20mendirikan%20PT%20/%20PMA%20baru."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  Konsultasi →
                </a>
              </div>
            </div>

            {/* Service 6 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold group-hover:bg-slate-800 group-hover:text-white transition-colors">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                    SISTEM & MANAJEMEN
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-slate-800 transition-colors">
                    Review Sistem Akuntansi & Standard Operating Procedure (SOP)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pemeriksaan mendalam atas alur kas masuk/keluar, sistem persediaan barang, serta perancangan SOP keuangan untuk mencegah kecurangan internal (fraud).
                </p>
                <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Setup Software Akuntansi (Accurate, Jurnal, SAP)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pelatihan Staf Finance & Pajak Internal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Evaluasi Pengendalian Internal (Internal Control)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Skema</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono">Custom Setup</div>
                </div>
                <a
                  href="https://wa.me/6281288997711?text=Halo,%20saya%20ingin%20konsultasi%20setup%20sistem%20akuntansi%20perusahaan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Konsultasi →
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive Fee Estimator Section */}
      <section id="kalkulator" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-md uppercase tracking-wider">
                TRANSPARANSI BIAYA JASA
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Simulasi Estimasi Biaya Retainer Laporan Keuangan & Pajak
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Biaya jasa retainer dihitung berdasarkan skala omset usaha, kompleksitas transaksi, dan lingkup kepatuhan yang ditangani. Dapatkan estimasi awal secara instan.
              </p>

              {/* Turnover Range Slider */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>Omset Tahunan Perusahaan:</span>
                  <span className="font-mono text-sm text-blue-800 font-bold bg-white px-3 py-1 border border-slate-200 rounded-md shadow-xs">
                    Rp {companyTurnover} Miliar / tahun
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={companyTurnover}
                  onChange={(e) => setCompanyTurnover(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Rp 500 Juta</span>
                  <span>Rp 25 Miliar</span>
                  <span>Rp 50+ Miliar</span>
                </div>
              </div>

              {/* Service Tier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tingkat Kompleksitas Pembukuan:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setServiceTier('basic')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      serviceTier === 'basic'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">Standard</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">&lt; 100 Trx/bln</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceTier('comprehensive')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      serviceTier === 'comprehensive'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">Komprehensif</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">100 - 500 Trx/bln</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceTier('premium')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      serviceTier === 'premium'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">Korporasi Besar</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">&gt; 500 Trx/bln</div>
                  </button>
                </div>
              </div>

              {/* Addons Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Layanan Tambahan (Add-on):
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes('spt_masa')}
                      onChange={() => toggleAddon('spt_masa')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">Pelaporan SPT Masa PPh & e-Faktur PPN Bulanan</span>
                      <span className="text-slate-500 text-[11px] block">(+Rp 2.000.000/bln)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes('sp2dk_defense')}
                      onChange={() => toggleAddon('sp2dk_defense')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">Proteksi Garansi Audit & SP2DK Tanpa Biaya Tambahan</span>
                      <span className="text-slate-500 text-[11px] block">(+Rp 3.500.000/bln)</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Calculated Card */}
            <div className="lg:col-span-6">
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 shadow-2xl border border-blue-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="relative space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="text-xs font-semibold tracking-wider uppercase text-blue-300">
                      Rangkuman Estimasi Retainer
                    </span>
                    <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-mono">
                      Paket Bulanan
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Estimasi Investasi Jasa:</div>
                    <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono mt-1 tracking-tight">
                      Rp {calculateEstimatedFee().toLocaleString('id-ID')}
                      <span className="text-sm font-normal text-slate-400"> / bulan</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Sudah mencakup penyusunan buku besar, rekonsiliasi bank, laporan laba rugi bulanan, dan asistensi konsultasi dengan Konsultan Pajak Berlisensi.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dedicated Account Manager & Senior Tax Specialist</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Review berkala risiko fiskal setiap kuartal (Tax Health Check)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Garansi Kerahasiaan Dokumen Perusahaan (NDA)</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <a
                      href={`https://wa.me/6281288997711?text=Halo%20NDTAXANDLAW,%20saya%20telah%20menghitung%20estimasi%20retainer%20dengan%20omset%20Rp%20${companyTurnover}%20Miliar/tahun%20dan%20estimasi%20Rp%20${calculateEstimatedFee().toLocaleString('id-ID')}/bulan.%20Mohon%20jadwalkan%20diskusi.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
                    >
                      <span>Ajukan Proposal Resmi untuk Klien Ini</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Mitra Partnership & Referral Program Section */}
      <section id="kemitraan" className="py-20 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-md uppercase tracking-wider">
              PROGRAM AFILIASI & KEMITRAAN BISNIS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bermitra dengan NDTAXANDLAW & Dapatkan Passive Income Berkelanjutan
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Apakah Anda seorang Konsultan Hukum, Notaris, Pengacara, Praktisi Keuangan, atau Profesional Bisnis? Rekomendasikan klien Anda dan nikmati skema komisi transparan dengan sistem auto-tracking referral.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Model 1: Referral Code */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm space-y-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-white">
                Kode Referral Otomatis Saat Mendaftar
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Setiap mitra yang mendaftar langsung mendapatkan kode referral unik (cth: <span className="font-mono text-amber-300 font-bold">ND-REF-0042</span>) dan Kartu Identitas Digital Eksklusif resmi dari firma.
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 font-mono">
                ✔️ Tercatat permanen di sistem cloud NDTAXANDLAW.
              </div>
            </div>

            {/* Model 2: Case by Case Commission */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm space-y-4">
              <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-xl flex items-center justify-center font-bold text-base shadow-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-white">
                Komisi Case-by-Case (1x Closing)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Untuk layanan bernilai proyek (seperti Pendampingan SP2DK, Pembuatan Akta PT PMA, atau Tax Planning), mitra menerima komisi sekali bayar sebesar <strong className="text-amber-300">15% - 20%</strong> dari total nilai kontrak setelah closing.
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 font-mono">
                ✔️ Dicairkan langsung ke rekening bank mitra terdaftar.
              </div>
            </div>

            {/* Model 3: Recurring Monthly Subscription */}
            <div className="bg-white/5 border-2 border-emerald-400/50 rounded-2xl p-7 backdrop-blur-sm space-y-4 relative">
              <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded">
                RECURRING INCOME
              </div>
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-white">
                Komisi Langganan Bulanan (Retainer Rutin)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jika klien mengambil paket Laporan Keuangan Bulanan atau Retainer Kepatuhan Pajak, <strong className="text-emerald-300">mitra akan selalu mendapatkan komisi setiap bulan</strong> selama klien tersebut masih aktif berlangganan!
              </p>
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 font-mono">
                ✔️ Pasif income bulanan tanpa perlu input ulang berkali-kali.
              </div>
            </div>

          </div>

          {/* Mitra CTA Bar */}
          <div className="mt-12 p-8 bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-700 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white">
                Siap Melipatgandakan Penghasilan sebagai Mitra NDTAXANDLAW?
              </h3>
              <p className="text-xs text-blue-200">
                Pendaftaran gratis, verifikasi cepat, dan dilengkapi materi marketing tools multimedia siap pakai.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenRegister}
                className="px-6 py-3 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
              >
                Daftar Jadi Mitra Sekarang
              </button>
              <button
                onClick={onEnterPortal}
                className="px-6 py-3 text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded-xl transition-all"
              >
                Masuk ke Portal Kemitraan →
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Trust & Testimonial Section */}
      <section id="keunggulan" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Mengapa Memilih NDTAXANDLAW?
            </h2>
            <p className="text-xs text-slate-600">
              Integritas, akurasi kalkulasi, dan perlindungan hukum adalah prioritas kami.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-blue-700 font-bold text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Legalitas & Akreditasi Resmi
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh opini dan laporan ditandatangani oleh pemegang Izin Praktik Konsultan Pajak resmi Kemenkeu dan Berita Acara Sumpah (BAS) Pengadilan Pajak.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-blue-700 font-bold text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Dashboard Transparan Real-Time
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mitra dan klien memiliki akses portal cerdas untuk memantau status deal, jadwal pelaporan pajak, histori komisi, hingga materi presentasi bisnis.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-blue-700 font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                Pendampingan Tatap Muka
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kami siap mendampingi direksi klien saat menghadapi klarifikasi Account Representative (AR) di kantor pajak atau meeting evaluasi finansial.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 py-14 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            
            <div className="space-y-3 md:col-span-1">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="Logo NDTAXANDLAW"
                className="h-9 w-auto object-contain brightness-110"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Firma Konsultan Pajak, Kuasa Hukum Pengadilan Pajak, dan Penasihat Keuangan Korporasi terintegrasi.
              </p>
              <div className="text-[11px] text-slate-500">
                Jakarta Selatan, DKI Jakarta 12950
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Layanan Utama</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#layanan" className="hover:text-white transition-colors">Laporan Keuangan SAK</a></li>
                <li><a href="#layanan" className="hover:text-white transition-colors">Kepatuhan SPT Masa & Tahunan</a></li>
                <li><a href="#layanan" className="hover:text-white transition-colors">Pendampingan SP2DK & Audit</a></li>
                <li><a href="#layanan" className="hover:text-white transition-colors">Transfer Pricing Documentation</a></li>
                <li><a href="#layanan" className="hover:text-white transition-colors">Pendirian Legalitas PT / PMA</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Kemitraan</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={onOpenRegister} className="hover:text-white transition-colors">Pendaftaran Mitra Baru</button></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors">Masuk Portal Mitra</button></li>
                <li><a href="#kemitraan" className="hover:text-white transition-colors">Skema Komisi Bulanan & Referral</a></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors">Akses ID Card Eksklusif</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Kontak Operasional</h4>
              <ul className="space-y-2 text-[11px]">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{supportPhone} (Hotline / WA)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{supportEmail}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Senin - Jumat: 08.30 - 17.30 WIB</span>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 NDTAXANDLAW. Seluruh Hak Cipta Dilindungi Undang-Undang.
            </div>
            <div className="flex gap-4">
              <button onClick={onEnterPortal} className="text-slate-400 hover:text-white">
                Portal Manajemen
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
