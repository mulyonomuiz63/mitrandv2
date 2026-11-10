import React from 'react';
import { 
  ShieldCheck, 
  Bell, 
  UserCircle2, 
  ArrowLeftRight, 
  Sparkles,
  CheckCircle2,
  Lock,
  LogOut
} from 'lucide-react';
import { Mitra, AuthUser } from '../types';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  activeMitra,
  allMitras,
  onSelectMitra,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenRegister,
  onLogout,
  currentUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          
          {/* Zone 1: Brand Wordmark with Official Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <a href="/" className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="ND TAX AND LAW"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </a>
          </div>

          {/* Zone 2: Navigation Links (Single Line, Clean Typography) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard Analitik
            </button>

            {currentRole === 'mitra' && (
              <button
                onClick={() => onTabChange('idcard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'idcard'
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Kartu Identitas Eksklusif</span>
                {activeMitra.status === 'verified' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            )}

            <button
              onClick={() => onTabChange('marketing-tools')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'marketing-tools'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tools Marketing &amp; Pelatihan
            </button>

            <button
              onClick={() => onTabChange('commissions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'commissions'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Komisi &amp; Payout
            </button>

            <button
              onClick={() => onTabChange('ai-reports')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeTab === 'ai-reports'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Analisis Kinerja AI</span>
            </button>

            {currentRole === 'admin' && (
              <button
                onClick={() => onTabChange('verification')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'verification'
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Verifikasi &amp; Data Mitra
              </button>
            )}
          </nav>

          {/* Zone 3: Quick Role Switcher, Notifications, & Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Role Switcher (Admin / Mitra) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => onRoleChange('mitra')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  currentRole === 'mitra'
                    ? 'bg-white text-blue-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Beralih ke Portal Mitra"
              >
                <span>Mitra</span>
              </button>
              <button
                onClick={() => onRoleChange('admin')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  currentRole === 'admin'
                    ? 'bg-blue-800 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Beralih ke Panel Admin Operasional"
              >
                <Lock className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifikasi Pembaruan"
              aria-label="Buka Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* If in Mitra mode: Switch Mitra preview or Edit Profile */}
            {currentRole === 'mitra' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors"
                  title="Lihat &amp; Edit Profil Mitra"
                >
                  <img
                    src={activeMitra.avatarUrl}
                    alt={activeMitra.fullName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-600/30"
                  />
                  <div className="hidden sm:block max-w-[130px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {activeMitra.fullName.split(',')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {activeMitra.memberCode}
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenRegister}
                className="px-3 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                + Daftarkan Mitra
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
              title="Keluar dari Akun (Logout)"
            >
              <LogOut className="w-4 h-4 text-slate-500 hover:text-red-600" />
              <span className="hidden sm:inline text-xs font-semibold">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
