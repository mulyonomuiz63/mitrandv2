import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  CheckCircle2,
  LogOut,
  Settings,
  UserCheck,
  Activity,
  LayoutDashboard,
  CreditCard,
  Briefcase,
  DollarSign,
  PlusCircle,
  Globe,
  Layers,
  Users,
  Edit3,
  HelpCircle,
  ChevronDown,
  X,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';
import { Mitra, AuthUser, DEFAULT_STAFF_ALLOWED_MENUS, StaffMenuAccessKey, isMitraDataIncomplete } from '../types';
import { MALE_AVATAR_URL, resolveAvatarUrl } from '../avatars';

interface NavbarProps {
  currentRole: 'admin' | 'mitra';
  onRoleChange: (role: 'admin' | 'mitra') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeMitra: Mitra;
  allMitras: Mitra[];
  onSelectMitra: (mitra: Mitra) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  currentUser?: AuthUser | null;
  onViewLandingPage?: () => void;
  onOpenServicesModal?: () => void;
  onOpenClientInput?: () => void;
  onOpenSettingsModal?: () => void;
  onStartOnboardingTour?: () => void;
  appEnvironment?: 'development' | 'production';
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
  logoUrl?: string;
  pendingMitraCount?: number;
  pendingClientCount?: number;
  pendingSphCount?: number;
  isProfileIncomplete?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeTab,
  onTabChange,
  activeMitra,
  allMitras,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenRegister,
  onLogout,
  currentUser,
  onViewLandingPage,
  onOpenServicesModal,
  onOpenClientInput,
  onOpenSettingsModal,
  onStartOnboardingTour,
  themeMode = 'light',
  onToggleTheme,
  logoUrl = '/assets/aistudio/logo_nd_vertikal.svg',
  pendingMitraCount,
  pendingClientCount = 0,
  pendingSphCount = 0,
  isProfileIncomplete,
}) => {
  const mitraIncomplete =
    typeof isProfileIncomplete === 'boolean'
      ? isProfileIncomplete
      : isMitraDataIncomplete(activeMitra);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvedPendingMitraCount =
    typeof pendingMitraCount === 'number'
      ? pendingMitraCount
      : (allMitras || []).filter((m) => m.status === 'pending').length;
  const resolvedPendingClientCount = pendingClientCount;
  const resolvedPendingSphCount = pendingSphCount;

  const mitraAvatar = resolveAvatarUrl(
    activeMitra.avatarUrl,
    activeMitra.gender,
    activeMitra.fullName
  );
  const adminAvatar = resolveAvatarUrl(
    currentUser?.avatarUrl,
    currentUser?.gender || 'male',
    currentUser?.name
  );

  const isStaff = currentRole === 'admin' && currentUser?.roleCode === 'staff';
  const staffAllowedMenus: StaffMenuAccessKey[] =
    currentUser?.allowedMenus && currentUser.allowedMenus.length > 0
      ? currentUser.allowedMenus
      : DEFAULT_STAFF_ALLOWED_MENUS;

  const canAccessMenu = (key: StaffMenuAccessKey) => {
    if (!isStaff) return true;
    return staffAllowedMenus.includes(key);
  };

  const canOpenSettings =
    !isStaff ||
    staffAllowedMenus.includes('settings-general') ||
    staffAllowedMenus.includes('settings-forms');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const rawDisplayName =
    currentRole === 'mitra'
      ? activeMitra.fullName.split(',')[0]
      : currentUser?.name || (isStaff ? 'Staf Operasional' : 'Admin Operasional');
  const displayName =
    rawDisplayName.length > 14 ? `${rawDisplayName.slice(0, 14).trim()}...` : rawDisplayName;

  const displaySubtext =
    currentRole === 'mitra'
      ? activeMitra.memberCode
      : currentUser?.position || (isStaff ? 'Staf Operasional' : 'Super Administrator');

  const displayAvatar = currentRole === 'mitra' ? mitraAvatar : adminAvatar;

  return (
    <>
      {/* TOP HEADER — Clean & Uncluttered on Mobile, Full Executive Bar on Tablet/Desktop */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Row 1: Brand Identity (Left) & User Actions / Profile (Right) */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-15 sm:h-16">
            {/* Left: Official Logo (Locked aspect ratio so it never squishes on mobile) */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onTabChange('dashboard')}
                className="flex items-center focus:outline-hidden text-left shrink-0 cursor-pointer"
              >
                <div className="logo-light-box bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl shrink-0 flex items-center shadow-2xs">
                  <img
                    src={logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
                    alt="ND TAX AND LAW"
                    className="h-7 sm:h-9 w-auto max-w-[134px] object-contain shrink-0"
                  />
                </div>
              </button>
            </div>

            {/* Right: Desktop Actions, Notifications & Profile/Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" ref={menuRef}>

              {/* Primary Action CTA on Desktop/Tablet (Hidden on Mobile to keep mobile navbar clean) */}
              {currentRole === 'mitra' && onOpenClientInput && (
                <button
                  type="button"
                  data-tour="tour-action-input-client"
                  onClick={() => {
                    if (activeMitra.status === 'verified') {
                      onOpenClientInput();
                    }
                  }}
                  disabled={activeMitra.status !== 'verified'}
                  title={
                    activeMitra.status !== 'verified'
                      ? 'Akun Anda sedang dalam verifikasi Admin. Input klien baru aktif setelah di-approve Admin.'
                      : mitraIncomplete
                      ? 'Lengkapi Data Diri wajib terlebih dahulu untuk menginput klien baru.'
                      : 'Input Data Klien Baru'
                  }
                  className={`hidden md:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                    activeMitra.status !== 'verified'
                      ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                      : mitraIncomplete
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 hover:brightness-110'
                  }`}
                >
                  <span>
                    {activeMitra.status !== 'verified'
                      ? '🔒 Input Klien'
                      : mitraIncomplete
                      ? '🔒 Input Klien (Lengkapi Data)'
                      : '+ Input Klien'}
                  </span>
                </button>
              )}

              {currentRole === 'admin' && (
                <>
                  {onOpenServicesModal && canAccessMenu('manage-services') && (
                    <button
                      type="button"
                      data-tour="tour-action-services"
                      onClick={onOpenServicesModal}
                      className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap border border-amber-300 cursor-pointer"
                    >
                      <span>Kelola Layanan Pajak</span>
                    </button>
                  )}
                  {canAccessMenu('verification') && (
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 hover:brightness-110 rounded-lg transition-all whitespace-nowrap shadow-xs cursor-pointer"
                    >
                      <span>+ Daftarkan Mitra</span>
                    </button>
                  )}
                </>
              )}

              {/* Onboarding Spotlight Tour Button (Icon-only Question Mark) */}
              {onStartOnboardingTour && (
                <button
                  type="button"
                  onClick={onStartOnboardingTour}
                  className="hidden md:flex p-2 text-[#092147] hover:text-[#113872] bg-amber-50/70 hover:bg-amber-100 border border-amber-300/80 rounded-xl transition-colors items-center justify-center cursor-pointer"
                  title="Putar Panduan Tur Fitur (Spotlight Tour)"
                  aria-label="Panduan Fitur"
                >
                  <HelpCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#092147] shrink-0" />
                </button>
              )}

              {/* System Settings Button (Desktop/Tablet) */}
              {currentRole === 'admin' && onOpenSettingsModal && canOpenSettings && (
                <button
                  type="button"
                  data-tour="tour-action-settings"
                  onClick={onOpenSettingsModal}
                  className="hidden md:flex p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title={
                    isStaff
                      ? 'Pengaturan Layanan Firma & Form Dinamis'
                      : 'Pengaturan Sistem & Integrasi (SMTP Email & Google Login)'
                  }
                  aria-label="Buka Pengaturan"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* Dark / Light Mode Toggle Button (Visible on Mobile & Desktop for Mitra, Staf, Admin) */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={
                    themeMode === 'dark'
                      ? 'Mode Gelap Aktif — Klik untuk Mode Terang (Light)'
                      : 'Mode Terang Aktif — Klik untuk Mode Gelap (Dark)'
                  }
                  aria-label="Toggle Dark atau Light Mode"
                >
                  {themeMode === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 shrink-0" />
                      <span className="hidden xl:inline text-xs font-bold text-amber-400">
                        Light
                      </span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700 shrink-0" />
                      <span className="hidden xl:inline text-xs font-bold text-slate-700">
                        Dark
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Notification Bell (Always visible on Mobile & Desktop) */}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 md:border-transparent transition-colors cursor-pointer"
                title="Notifikasi Pembaruan"
                aria-label="Buka Notifikasi"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* DESKTOP Profile Button (md and up) */}
              <button
                type="button"
                data-tour="tour-action-profile"
                onClick={onOpenProfile}
                className="hidden md:flex items-center gap-2 pl-2 pr-2.5 py-1 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-amber-400/60 rounded-xl text-left transition-colors cursor-pointer"
                title="Lihat & Edit Profil"
              >
                <img
                  src={displayAvatar || MALE_AVATAR_URL}
                  alt={displayName}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/50 shrink-0"
                />
                <div className="max-w-[125px]">
                  <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[9px] text-slate-500 font-mono truncate">{displaySubtext}</p>
                </div>
              </button>

              {/* DESKTOP Logout Button (md and up) */}
              <button
                type="button"
                onClick={onLogout}
                className="hidden md:flex px-2.5 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors items-center gap-1.5 border border-slate-200 cursor-pointer"
                title="Keluar dari Akun (Logout)"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">Keluar</span>
              </button>

              {/* MOBILE COMPACT PROFILE & ACTION MENU TRIGGER (< md) */}
              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  aria-label="Menu Akun & Aksi Cepat"
                >
                  <img
                    src={displayAvatar || MALE_AVATAR_URL}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/50 shrink-0"
                  />
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-600 transition-transform ${
                      mobileMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Mobile Clean Dropdown Panel */}
                {mobileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* User Identity Header */}
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {displayName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {displaySubtext}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1.5 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl flex items-center gap-2.5 text-left"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Edit Profil &amp; Akun</span>
                      </button>

                      {currentRole === 'mitra' && onOpenClientInput && (
                        <button
                          type="button"
                          disabled={activeMitra.status !== 'verified'}
                          onClick={() => {
                            if (activeMitra.status === 'verified') {
                              setMobileMenuOpen(false);
                              onOpenClientInput();
                            }
                          }}
                          className={`w-full px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 text-left ${
                            activeMitra.status !== 'verified'
                              ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
                              : mitraIncomplete
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40'
                          }`}
                        >
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {activeMitra.status !== 'verified'
                              ? '🔒 Input Klien (Menunggu ACC)'
                              : mitraIncomplete
                              ? '🔒 Input Klien (Lengkapi Data)'
                              : '+ Input Klien Baru'}
                          </span>
                        </button>
                      )}

                      {currentRole === 'admin' && canAccessMenu('verification') && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenRegister();
                          }}
                          className="w-full px-3 py-2 text-xs font-bold bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 rounded-xl flex items-center gap-2.5 text-left"
                        >
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>+ Daftarkan Mitra Baru</span>
                        </button>
                      )}

                      {currentRole === 'admin' &&
                        onOpenServicesModal &&
                        canAccessMenu('manage-services') && (
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              onOpenServicesModal();
                            }}
                            className="w-full px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50/80 hover:bg-amber-100 rounded-xl flex items-center gap-2.5 text-left"
                          >
                            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Kelola Layanan Pajak</span>
                          </button>
                        )}

                      {currentRole === 'admin' && onOpenSettingsModal && canOpenSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenSettingsModal();
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 text-left"
                        >
                          <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                          <span>Pengaturan Sistem &amp; Form</span>
                        </button>
                      )}

                      {onStartOnboardingTour && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onStartOnboardingTour();
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 text-left"
                        >
                          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Panduan Tur Fitur</span>
                        </button>
                      )}

                      {onViewLandingPage && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onViewLandingPage();
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 text-left"
                        >
                          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Halaman Program Mitra ↗</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1.5 px-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Keluar dari Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: DESKTOP & TABLET NAVIGATION MENU BAR (Hidden on Mobile < md because Mobile uses Bottom Navigation Bar) */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center justify-between gap-2 pt-2.5 pb-2 border-t border-slate-100 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-2 min-w-max">
              {currentRole === 'mitra' ? (
                <>
                  <button
                    type="button"
                    data-tour="tour-nav-dashboard"
                    onClick={() => onTabChange('dashboard')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-idcard"
                    onClick={() => onTabChange('idcard')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'idcard'
                        ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>Kartu Identitas</span>
                    {activeMitra.status === 'verified' && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'idcard' ? 'text-emerald-300' : 'text-emerald-600'
                        }`}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-marketing"
                    onClick={() => onTabChange('marketing-tools')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'marketing-tools'
                        ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>Tools Marketing</span>
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-commissions"
                    onClick={() => onTabChange('commissions')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'commissions'
                        ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Monitoring</span>
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-prospects"
                    onClick={() => onTabChange('prospects')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'prospects'
                        ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Prospek</span>
                  </button>
                </>
              ) : (
                <>
                  {canAccessMenu('dashboard') && (
                    <button
                      type="button"
                      data-tour="tour-nav-dashboard"
                      onClick={() => onTabChange('dashboard')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                      <span>Dashboard</span>
                    </button>
                  )}

                  {canAccessMenu('verification') && (
                    <button
                      type="button"
                      data-tour="tour-nav-verification"
                      onClick={() => onTabChange('verification')}
                      className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'verification'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Mitra</span>
                      {resolvedPendingMitraCount > 0 && (
                        <span
                          title={`${resolvedPendingMitraCount} Mitra baru menunggu persetujuan (Approve)`}
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-extrabold flex items-center justify-center shadow-sm ring-2 ring-white z-10 leading-none"
                        >
                          {resolvedPendingMitraCount}
                        </span>
                      )}
                    </button>
                  )}

                  {canAccessMenu('admin-operations') && (
                    <button
                      type="button"
                      data-tour="tour-nav-operations"
                      onClick={() => onTabChange('admin-operations')}
                      className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'admin-operations'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Klien &amp; Payout</span>
                      {resolvedPendingClientCount > 0 && (
                        <span
                          title={`${resolvedPendingClientCount} Klien baru menunggu persetujuan (Approve)`}
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-extrabold flex items-center justify-center shadow-sm ring-2 ring-white z-10 leading-none"
                        >
                          {resolvedPendingClientCount}
                        </span>
                      )}
                    </button>
                  )}

                  {canAccessMenu('marketing-tools') && (
                    <button
                      type="button"
                      data-tour="tour-nav-marketing"
                      onClick={() => onTabChange('marketing-tools')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'marketing-tools'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      <span>Tools Marketing</span>
                    </button>
                  )}

                  {canAccessMenu('commissions') && (
                    <button
                      type="button"
                      data-tour="tour-nav-commissions"
                      onClick={() => onTabChange('commissions')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'commissions'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span>Monitoring</span>
                    </button>
                  )}

                  {canAccessMenu('prospects') && (
                    <button
                      type="button"
                      data-tour="tour-nav-prospects"
                      onClick={() => onTabChange('prospects')}
                      className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'prospects'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>Prospek</span>
                      {resolvedPendingSphCount > 0 && (
                        <span
                          title={`${resolvedPendingSphCount} Pengajuan SPH menunggu persetujuan (Approve)`}
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-extrabold flex items-center justify-center shadow-sm ring-2 ring-white z-10 leading-none"
                        >
                          {resolvedPendingSphCount}
                        </span>
                      )}
                    </button>
                  )}

                  {!isStaff && (
                    <button
                      type="button"
                      data-tour="tour-nav-staff"
                      onClick={() => onTabChange('staff-management')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'staff-management'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Users
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'staff-management' ? 'text-amber-300' : 'text-emerald-700'
                        }`}
                      />
                      <span>Staf</span>
                    </button>
                  )}

                  {!isStaff && (
                    <button
                      type="button"
                      data-tour="tour-nav-logs"
                      onClick={() => onTabChange('activity-logs')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'activity-logs'
                          ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                          : 'text-slate-700 bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80'
                      }`}
                    >
                      <Activity
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'activity-logs' ? 'text-amber-300' : 'text-indigo-600'
                        }`}
                      />
                      <span>Log Aktifitas</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {onViewLandingPage && (
              <button
                type="button"
                onClick={onViewLandingPage}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200 flex items-center gap-1 ml-auto cursor-pointer"
                title="Buka Halaman Program Mitra"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Program Mitra ↗</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Android APK-Style Bottom Bar on Mobile < md) */}
      <nav
        aria-label="Navigasi Bawah Aplikasi Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.1)] px-1.5 py-1.5"
      >
        {currentRole === 'mitra' ? (
          <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 items-center">
            <button
              type="button"
              data-tour="tour-nav-dashboard"
              onClick={() => onTabChange('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate">Home</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-idcard"
              onClick={() => onTabChange('idcard')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === 'idcard'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate">Kartu ID</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-prospects"
              onClick={() => onTabChange('prospects')}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl shadow-sm font-bold transition-all ${
                activeTab === 'prospects'
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 ring-1 ring-amber-400/50'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate">Prospek</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-commissions"
              onClick={() => onTabChange('commissions')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === 'commissions'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate">Komisi</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-marketing"
              onClick={() => onTabChange('marketing-tools')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                activeTab === 'marketing-tools'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate">Tools</span>
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto flex items-center justify-between gap-0.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {canAccessMenu('dashboard') && (
              <button
                type="button"
                data-tour="tour-nav-dashboard"
                onClick={() => onTabChange('dashboard')}
                className={`flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Dashboard</span>
              </button>
            )}

            {canAccessMenu('verification') && (
              <button
                type="button"
                data-tour="tour-nav-verification"
                onClick={() => onTabChange('verification')}
                className={`relative flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'verification'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Mitra</span>
                {resolvedPendingMitraCount > 0 && (
                  <span
                    title={`${resolvedPendingMitraCount} Mitra baru menunggu persetujuan (Approve)`}
                    className="absolute top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-extrabold flex items-center justify-center shadow-xs ring-1 ring-white z-10 leading-none"
                  >
                    {resolvedPendingMitraCount}
                  </span>
                )}
              </button>
            )}

            {canAccessMenu('admin-operations') && (
              <button
                type="button"
                data-tour="tour-nav-operations"
                onClick={() => onTabChange('admin-operations')}
                className={`relative flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'admin-operations'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Klien &amp; Payout</span>
                {resolvedPendingClientCount > 0 && (
                  <span
                    title={`${resolvedPendingClientCount} Klien baru menunggu persetujuan (Approve)`}
                    className="absolute top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-extrabold flex items-center justify-center shadow-xs ring-1 ring-white z-10 leading-none"
                  >
                    {resolvedPendingClientCount}
                  </span>
                )}
              </button>
            )}

            {canAccessMenu('marketing-tools') && (
              <button
                type="button"
                data-tour="tour-nav-marketing"
                onClick={() => onTabChange('marketing-tools')}
                className={`flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'marketing-tools'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Tools</span>
              </button>
            )}

            {canAccessMenu('commissions') && (
              <button
                type="button"
                data-tour="tour-nav-commissions"
                onClick={() => onTabChange('commissions')}
                className={`flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'commissions'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Monitoring</span>
              </button>
            )}

            {canAccessMenu('prospects') && (
              <button
                type="button"
                data-tour="tour-nav-prospects"
                onClick={() => onTabChange('prospects')}
                className={`relative flex-1 min-w-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'prospects'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Prospek</span>
                {resolvedPendingSphCount > 0 && (
                  <span
                    title={`${resolvedPendingSphCount} Pengajuan SPH menunggu persetujuan (Approve)`}
                    className="absolute top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-extrabold flex items-center justify-center shadow-xs ring-1 ring-white z-10 leading-none"
                  >
                    {resolvedPendingSphCount}
                  </span>
                )}
              </button>
            )}

            {!isStaff && (
              <button
                type="button"
                data-tour="tour-nav-staff"
                onClick={() => onTabChange('staff-management')}
                className={`flex-1 min-w-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'staff-management'
                    ? 'text-emerald-700 bg-emerald-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Staf</span>
              </button>
            )}

            {!isStaff && (
              <button
                type="button"
                data-tour="tour-nav-logs"
                onClick={() => onTabChange('activity-logs')}
                className={`flex-1 min-w-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'activity-logs'
                    ? 'text-indigo-700 bg-indigo-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate">Log</span>
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};
