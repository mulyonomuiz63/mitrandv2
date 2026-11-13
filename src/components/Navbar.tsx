import React from 'react';
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
  HelpCircle
} from 'lucide-react';
import { Mitra, AuthUser, DEFAULT_STAFF_ALLOWED_MENUS, StaffMenuAccessKey } from '../types';
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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeTab,
  onTabChange,
  activeMitra,
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
}) => {
  const mitraAvatar = resolveAvatarUrl(activeMitra.avatarUrl, activeMitra.gender, activeMitra.fullName);
  const adminAvatar = resolveAvatarUrl(currentUser?.avatarUrl, currentUser?.gender || 'male', currentUser?.name);

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

  return (
    <>
      {/* TOP HEADER (Desktop: Brand + Actions + Top Menu Bar | Mobile: Compact Brand + Actions) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Row 1: Brand Identity (Left) & User Actions / Profile (Right) */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
            
            {/* Left: Official Logo */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
              <button
                type="button"
                onClick={() => onTabChange(currentRole === 'admin' ? 'dashboard' : 'idcard')}
                className="flex items-center focus:outline-hidden text-left min-w-0"
              >
                <div className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
                  <img
                    src="/assets/aistudio/logo_c3fdb6de.png"
                    alt="ND TAX AND LAW"
                    className="h-7 sm:h-8 w-auto object-contain"
                  />
                </div>
              </button>
            </div>

            {/* Right: Role Badge, Quick Actions, Notifications, Profile & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Role Badge */}
              {currentRole === 'admin' ? (
                isStaff ? (
                  <span className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-indigo-950 bg-indigo-100/90 border border-indigo-300 rounded-lg flex items-center gap-1 shadow-2xs">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                    <span>Staf</span>
                  </span>
                ) : (
                  <span className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-blue-950 bg-blue-100/90 border border-blue-300 rounded-lg flex items-center gap-1 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Admin</span>
                  </span>
                )
              ) : (
                <span className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-emerald-950 bg-emerald-100/90 border border-emerald-300 rounded-lg flex items-center gap-1 shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Mitra</span>
                </span>
              )}

              {/* Primary Action CTA on Desktop/Tablet (Hanya Aktif Jika Mitra Sudah Di-Approve Admin) */}
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
                    activeMitra.status === 'verified'
                      ? 'Input Data Klien Baru'
                      : 'Akun Anda sedang dalam verifikasi Admin. Input klien baru aktif setelah di-approve Admin.'
                  }
                  className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-xs ${
                    activeMitra.status === 'verified'
                      ? 'text-white bg-blue-700 hover:bg-blue-800'
                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <span>{activeMitra.status === 'verified' ? '+ Input Klien' : '🔒 Input Klien (Menunggu Approve)'}</span>
                </button>
              )}

              {currentRole === 'admin' && (
                <>
                  {onOpenServicesModal && canAccessMenu('manage-services') && (
                    <button
                      type="button"
                      data-tour="tour-action-services"
                      onClick={onOpenServicesModal}
                      className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap border border-amber-200"
                    >
                      <span>Kelola Layanan Pajak</span>
                    </button>
                  )}
                  {canAccessMenu('verification') && (
                    <button
                      type="button"
                      onClick={onOpenRegister}
                      className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs"
                    >
                      <span>+ Daftarkan Mitra</span>
                    </button>
                  )}
                </>
              )}

              {/* Onboarding Spotlight Tour Button ("Panduan") */}
              {onStartOnboardingTour && (
                <button
                  type="button"
                  onClick={onStartOnboardingTour}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors flex items-center gap-1"
                  title="Putar Panduan Tur Fitur (Spotlight Tour)"
                  aria-label="Panduan Fitur"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="hidden lg:inline text-xs font-bold">Panduan</span>
                </button>
              )}

              {/* System Settings Button (Admin or Staff with settings-general / settings-forms access) */}
              {currentRole === 'admin' && onOpenSettingsModal && canOpenSettings && (
                <button
                  type="button"
                  data-tour="tour-action-settings"
                  onClick={onOpenSettingsModal}
                  className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title={
                    isStaff
                      ? 'Pengaturan Layanan Firma & Form Dinamis'
                      : 'Pengaturan Sistem & Integrasi (SMTP Email, Google Login, Gemini AI)'
                  }
                  aria-label="Buka Pengaturan"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-1.5 sm:p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifikasi Pembaruan"
                aria-label="Buka Notifikasi"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Profile Button / Avatar (Clickable for Mitra, Staff, and Admin) */}
              {currentRole === 'mitra' ? (
                <button
                  type="button"
                  data-tour="tour-action-profile"
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors"
                  title="Lihat & Edit Profil Mitra"
                >
                  <img
                    src={mitraAvatar || MALE_AVATAR_URL}
                    alt={activeMitra.fullName}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-blue-600/30 shrink-0"
                  />
                  <div className="hidden md:block max-w-[120px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {activeMitra.fullName.split(',')[0]}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">
                      {activeMitra.memberCode}
                    </p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  data-tour="tour-action-profile"
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-2.5 py-1 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-colors"
                  title={isStaff ? 'Edit Profil & Password Staf' : 'Edit Profil & Password Admin'}
                >
                  <img
                    src={adminAvatar || MALE_AVATAR_URL}
                    alt={currentUser?.name || (isStaff ? 'Staf' : 'Admin')}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-blue-600/30 shrink-0"
                  />
                  <div className="hidden md:block max-w-[120px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {currentUser?.name || (isStaff ? 'Staf Operasional' : 'Admin')}
                    </p>
                    <p className="text-[9px] text-blue-700 font-semibold flex items-center gap-0.5 truncate">
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Edit Profil</span>
                    </p>
                  </div>
                </button>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
                title="Keluar dari Akun (Logout)"
              >
                <LogOut className="w-4 h-4 text-slate-500 hover:text-red-600 shrink-0" />
                <span className="hidden sm:inline text-xs font-semibold">Keluar</span>
              </button>
            </div>
          </div>

          {/* Row 2: RESPONSIVE NAVIGATION MENU BAR (Rapi & Responsif di Mobile, Tablet, dan Desktop) */}
          <nav
            aria-label="Navigasi Utama"
            className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              {currentRole === 'mitra' ? (
                <>
                  <button
                    type="button"
                    data-tour="tour-nav-idcard"
                    onClick={() => onTabChange('idcard')}
                    className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      activeTab === 'idcard'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>Kartu Identitas Eksklusif</span>
                    {activeMitra.status === 'verified' && (
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'idcard' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-dashboard"
                    onClick={() => onTabChange('dashboard')}
                    className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>Dashboard Mitra</span>
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-marketing"
                    onClick={() => onTabChange('marketing-tools')}
                    className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      activeTab === 'marketing-tools'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>Tools Marketing &amp; Pelatihan</span>
                  </button>

                  <button
                    type="button"
                    data-tour="tour-nav-commissions"
                    onClick={() => onTabChange('commissions')}
                    className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      activeTab === 'commissions'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Komisi &amp; Payout</span>
                  </button>
                </>
              ) : (
                <>
                  {canAccessMenu('dashboard') && (
                    <button
                      type="button"
                      data-tour="tour-nav-dashboard"
                      onClick={() => onTabChange('dashboard')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'dashboard'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                      <span>{isStaff ? 'Dashboard Operasional' : 'Dashboard Admin'}</span>
                    </button>
                  )}

                  {canAccessMenu('admin-operations') && (
                    <button
                      type="button"
                      data-tour="tour-nav-operations"
                      onClick={() => onTabChange('admin-operations')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'admin-operations'
                          ? 'bg-blue-800 text-white shadow-2xs'
                          : 'text-slate-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Validasi Klien &amp; Payout</span>
                    </button>
                  )}

                  {canAccessMenu('verification') && (
                    <button
                      type="button"
                      data-tour="tour-nav-verification"
                      onClick={() => onTabChange('verification')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'verification'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Verifikasi Mitra</span>
                    </button>
                  )}

                  {/* Log Aktivitas & Email HANYA untuk Admin (Staf tidak bisa akses) */}
                  {!isStaff && (
                    <button
                      type="button"
                      data-tour="tour-nav-logs"
                      onClick={() => onTabChange('activity-logs')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'activity-logs'
                          ? 'bg-indigo-700 text-white shadow-2xs'
                          : 'text-slate-700 bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80'
                      }`}
                    >
                      <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'activity-logs' ? 'text-amber-300' : 'text-indigo-600'}`} />
                      <span>Log Aktivitas &amp; Email</span>
                    </button>
                  )}

                  {canAccessMenu('marketing-tools') && (
                    <button
                      type="button"
                      data-tour="tour-nav-marketing"
                      onClick={() => onTabChange('marketing-tools')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'marketing-tools'
                          ? 'bg-blue-700 text-white shadow-2xs'
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
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'commissions'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span>Komisi &amp; Payout</span>
                    </button>
                  )}

                  {/* Manajemen Staf & Akun Admin HANYA untuk Admin */}
                  {!isStaff && (
                    <button
                      type="button"
                      data-tour="tour-nav-staff"
                      onClick={() => onTabChange('staff-management')}
                      className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'staff-management'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Users className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'staff-management' ? 'text-white' : 'text-emerald-700'}`} />
                      <span>Manajemen Staf &amp; Admin</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {onViewLandingPage && (
              <button
                type="button"
                onClick={onViewLandingPage}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200 flex items-center gap-1 ml-auto"
                title="Buka Landing Page Publik Jasa Keuangan & Pajak"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Web Layanan ↗</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Tampil di Bawah Khusus Layar Mobile < md Seperti Aplikasi Modern) */}
      <nav
        aria-label="Navigasi Bawah Aplikasi Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.1)] px-2 py-1.5"
      >
        {currentRole === 'mitra' ? (
          <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 items-center">
            <button
              type="button"
              data-tour="tour-nav-idcard"
              onClick={() => onTabChange('idcard')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'idcard'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">ID Mitra</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-dashboard"
              onClick={() => onTabChange('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Dashboard</span>
            </button>

            <button
              type="button"
              data-tour="tour-action-input-client"
              onClick={() => {
                if (activeMitra.status === 'verified' && onOpenClientInput) {
                  onOpenClientInput();
                }
              }}
              disabled={activeMitra.status !== 'verified'}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl shadow-sm font-bold ${
                activeMitra.status === 'verified'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">+ Klien</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-commissions"
              onClick={() => onTabChange('commissions')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'commissions'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Komisi</span>
            </button>

            <button
              type="button"
              data-tour="tour-nav-marketing"
              onClick={() => onTabChange('marketing-tools')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'marketing-tools'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Tools</span>
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto flex items-center justify-between gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {canAccessMenu('dashboard') && (
              <button
                type="button"
                data-tour="tour-nav-dashboard"
                onClick={() => onTabChange('dashboard')}
                className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Dashboard</span>
              </button>
            )}

            {canAccessMenu('admin-operations') && (
              <button
                type="button"
                data-tour="tour-nav-operations"
                onClick={() => onTabChange('admin-operations')}
                className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'admin-operations'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Validasi</span>
              </button>
            )}

            {canAccessMenu('verification') && (
              <button
                type="button"
                data-tour="tour-nav-verification"
                onClick={() => onTabChange('verification')}
                className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'verification'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Verifikasi</span>
              </button>
            )}

            {!isStaff && (
              <button
                type="button"
                data-tour="tour-nav-logs"
                onClick={() => onTabChange('activity-logs')}
                className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'activity-logs'
                    ? 'text-indigo-700 bg-indigo-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Log</span>
              </button>
            )}

            {canAccessMenu('marketing-tools') && (
              <button
                type="button"
                data-tour="tour-nav-marketing"
                onClick={() => onTabChange('marketing-tools')}
                className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'marketing-tools'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Tools</span>
              </button>
            )}

            {canAccessMenu('commissions') && (
              <button
                type="button"
                data-tour="tour-nav-commissions"
                onClick={() => onTabChange('commissions')}
                className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'commissions'
                    ? 'text-blue-700 bg-blue-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Komisi</span>
              </button>
            )}

            {!isStaff && (
              <button
                type="button"
                data-tour="tour-nav-staff"
                onClick={() => onTabChange('staff-management')}
                className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all shrink-0 ${
                  activeTab === 'staff-management'
                    ? 'text-emerald-700 bg-emerald-50 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 truncate">Staf</span>
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};
