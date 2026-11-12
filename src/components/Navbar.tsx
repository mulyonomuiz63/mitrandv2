import React from 'react';
import { 
  ShieldCheck, 
  Bell, 
  Sparkles,
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
  Layers
} from 'lucide-react';
import { Mitra, AuthUser } from '../types';
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
}) => {
  const mitraAvatar = resolveAvatarUrl(activeMitra.avatarUrl, activeMitra.gender, activeMitra.fullName);
  const adminAvatar = resolveAvatarUrl(currentUser?.avatarUrl, currentUser?.gender || 'male', currentUser?.name);

  return (
    <>
      {/* TOP HEADER (Desktop: Brand + Actions + Top Menu Bar | Mobile: Compact Brand + Actions) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Row 1: Brand Identity (Left) & User Actions / Profile (Right) */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
            
            {/* Left: Official Logo & Portal Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
              <button
                type="button"
                onClick={() => onTabChange(currentRole === 'admin' ? 'dashboard' : 'idcard')}
                className="flex items-center gap-2.5 focus:outline-hidden text-left min-w-0"
              >
                <div className="bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl shrink-0">
                  <img
                    src="/assets/aistudio/logo_c3fdb6de.png"
                    alt="ND TAX AND LAW"
                    className="h-7 sm:h-8 w-auto object-contain"
                  />
                </div>
                <div className="hidden sm:flex flex-col justify-center border-l-2 border-amber-400 pl-2.5 min-w-0">
                  <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider truncate">
                    {currentRole === 'admin' ? 'Panel Operasional Admin' : 'Portal Resmi Mitra'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    NDTAXANDLAW Advisory System
                  </span>
                </div>
              </button>
            </div>

            {/* Right: Role Badge, Quick Actions, Notifications, Profile & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Role Badge */}
              {currentRole === 'admin' ? (
                <span className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold text-blue-950 bg-blue-100/90 border border-blue-300 rounded-lg flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Admin</span>
                </span>
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
                  {onOpenServicesModal && (
                    <button
                      type="button"
                      onClick={onOpenServicesModal}
                      className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap border border-amber-200"
                    >
                      <span>Kelola Layanan Pajak</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs"
                  >
                    <span>+ Daftarkan Mitra</span>
                  </button>
                </>
              )}

              {/* System Settings Button (Only for Admin) */}
              {currentRole === 'admin' && onOpenSettingsModal && (
                <button
                  type="button"
                  onClick={onOpenSettingsModal}
                  className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Pengaturan Sistem &amp; Integrasi (SMTP Email, Google Login, Gemini AI)"
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

              {/* Profile Button / Avatar */}
              {currentRole === 'mitra' ? (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors"
                  title="Lihat &amp; Edit Profil Mitra"
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
                <div className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                  <img
                    src={adminAvatar || MALE_AVATAR_URL}
                    alt={currentUser?.name || 'Admin'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-blue-600/30 shrink-0"
                  />
                  <div className="hidden md:block max-w-[110px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {currentUser?.name || 'Admin'}
                    </p>
                  </div>
                </div>
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

          {/* Row 2: DESKTOP NAVIGATION BAR (Tampil di Atas Khusus Layar Desktop md+) */}
          <nav
            aria-label="Navigasi Utama Desktop"
            className="hidden md:flex items-center justify-between gap-2 py-2 border-t border-slate-100"
          >
            <div className="flex flex-wrap items-center gap-1">
              {currentRole === 'mitra' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onTabChange('idcard')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'idcard'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Kartu Identitas Eksklusif</span>
                    {activeMitra.status === 'verified' && (
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'idcard' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('dashboard')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard Mitra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('marketing-tools')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'marketing-tools'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Tools Marketing &amp; Pelatihan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('commissions')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'commissions'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Komisi &amp; Payout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onTabChange('dashboard')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('admin-operations')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'admin-operations'
                        ? 'bg-blue-800 text-white shadow-2xs'
                        : 'text-slate-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Validasi Klien &amp; Payout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('verification')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'verification'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Verifikasi Mitra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('activity-logs')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'activity-logs'
                        ? 'bg-indigo-700 text-white shadow-2xs'
                        : 'text-slate-700 bg-indigo-50/60 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80'
                    }`}
                  >
                    <Activity className={`w-3.5 h-3.5 ${activeTab === 'activity-logs' ? 'text-amber-300' : 'text-indigo-600'}`} />
                    <span>Log Aktivitas &amp; Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('marketing-tools')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'marketing-tools'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Tools Marketing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTabChange('commissions')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === 'commissions'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Komisi &amp; Payout</span>
                  </button>
                </>
              )}
            </div>

            {onViewLandingPage && (
              <button
                type="button"
                onClick={onViewLandingPage}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200 flex items-center gap-1"
                title="Buka Landing Page Publik Jasa Keuangan & Pajak"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
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
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
            <button
              type="button"
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
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
            <button
              type="button"
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
              onClick={() => onTabChange('admin-operations')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'admin-operations'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Validasi</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('verification')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'verification'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Verifikasi</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('activity-logs')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'activity-logs'
                  ? 'text-indigo-700 bg-indigo-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Log &amp; Email</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('commissions')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                activeTab === 'commissions' || activeTab === 'marketing-tools'
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 truncate">Komisi</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
};
