/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ExclusiveIdCard } from './components/ExclusiveIdCard';
import { MarketingToolsHub } from './components/MarketingToolsHub';
import { CommissionLedger } from './components/CommissionLedger';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { MitraVerificationPanel } from './components/MitraVerificationPanel';
import { RegistrationModal } from './components/RegistrationModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthView } from './components/AuthView';
import { LandingPage } from './components/LandingPage';
import { ClientInputModal } from './components/ClientInputModal';
import { ServicesManagementModal } from './components/ServicesManagementModal';
import { AdminOperationsHub } from './components/AdminOperationsHub';
import { AppSettingsModal } from './components/AppSettingsModal';
import { ClientSelfRegistration } from './components/ClientSelfRegistration';
import { Mitra, MarketingTool, CommissionTransaction, NotificationItem, SalesHistoryMonth, BankDetails, AuthUser, ClientDeal, AppSettings } from './types';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Layers, 
  ChevronRight,
  Lock,
  Building2,
  FileCheck2,
  Award,
  Globe
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nd_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<'landing' | 'portal' | 'auth' | 'client_register'>('landing');
  const [clientRefCode, setClientRefCode] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'mitra'>('mitra');
  const [activeTab, setActiveTab] = useState<string>('idcard');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // State from server API with immediate offline fallbacks
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [activeMitraId, setActiveMitraId] = useState<string>('mitra-01');
  const [marketingTools, setMarketingTools] = useState<MarketingTool[]>([]);
  const [commissions, setCommissions] = useState<CommissionTransaction[]>([]);
  const [clientDeals, setClientDeals] = useState<ClientDeal[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryMonth[]>([]);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [resMitra, resTools, resComm, resClients, resNotif, resAnalytics, resSettings] = await Promise.allSettled([
        fetch('/api/mitra').then((r) => r.json()),
        fetch('/api/marketing-tools').then((r) => r.json()),
        fetch('/api/commissions').then((r) => r.json()),
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/notifications').then((r) => r.json()),
        fetch('/api/analytics/monthly').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);

      if (resMitra.status === 'fulfilled' && resMitra.value?.data) {
        setMitras(resMitra.value.data);
      }
      if (resTools.status === 'fulfilled' && resTools.value?.data) {
        setMarketingTools(resTools.value.data);
      }
      if (resComm.status === 'fulfilled' && resComm.value?.data) {
        setCommissions(resComm.value.data);
      }
      if (resClients.status === 'fulfilled' && resClients.value?.data) {
        setClientDeals(resClients.value.data);
      }
      if (resNotif.status === 'fulfilled' && resNotif.value?.data) {
        setNotifications(resNotif.value.data);
      }
      if (resAnalytics.status === 'fulfilled' && resAnalytics.value?.data?.salesHistory) {
        setSalesHistory(resAnalytics.value.data.salesHistory);
      }
      if (resSettings.status === 'fulfilled' && resSettings.value?.data) {
        setSettings(resSettings.value.data);
      }
    } catch (err) {
      console.warn('API fetch warning, using seeded defaults', err);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        setClientRefCode(ref);
        setViewMode('client_register');
      }
    }
  }, []);

  const activeMitra = mitras.find((m) => m.id === activeMitraId) || mitras[0] || {
    id: 'mitra-01',
    memberCode: 'ND-2026-LAW-0042',
    fullName: 'Bambang Sudirman, S.H., M.Kn.',
    email: 'bambang.sudirman@example.com',
    phone: '0812-8899-7711',
    nik: '3201123456780001',
    specialization: 'Konsultan Hukum Korporasi & Kontrak Bisnis',
    status: 'verified',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    joinedDate: '2026-01-15',
    bankDetails: {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830192837',
      accountHolder: 'Bambang Sudirman',
    },
    totalCommission: 34500000,
    totalBonus: 7500000,
    pendingPayout: 6200000,
    paidPayout: 35800000,
  };

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  // Handlers
  const handleRegisterMitra = async (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
  }) => {
    try {
      const res = await fetch('/api/mitra/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMitras((prev) => [data.data, ...prev]);
        setActiveMitraId(data.data.id);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyMitra = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const res = await fetch(`/api/mitra/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMitras((prev) => prev.map((m) => (m.id === id ? data.data : m)));
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (id: string, profileData: Partial<Mitra>) => {
    try {
      const res = await fetch(`/api/mitra/${id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMitras((prev) => prev.map((m) => (m.id === id ? data.data : m)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMarketingTool = async (newTool: Partial<MarketingTool>) => {
    try {
      const res = await fetch('/api/marketing-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTool),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMarketingTools((prev) => [data.data, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMarketingTool = async (id: string) => {
    try {
      await fetch(`/api/marketing-tools/${id}`, { method: 'DELETE' });
      setMarketingTools((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPayout = async (mitraId: string, amount: number) => {
    try {
      await fetch('/api/commissions/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mitraId, amount }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('nd_auth_user', JSON.stringify(user));
    } catch {}

    if (user.role === 'admin') {
      setCurrentRole('admin');
      setActiveTab('verification');
    } else {
      setCurrentRole('mitra');
      setActiveTab('idcard');
      if (user.mitraId) {
        setActiveMitraId(user.mitraId);
      }
    }
    setViewMode('portal');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setViewMode('landing');
    try {
      localStorage.removeItem('nd_auth_user');
    } catch {}
  };

  // If role changes, ensure activeTab is valid (only permitted in development mode)
  const handleRoleChange = (newRole: 'admin' | 'mitra') => {
    if (settings?.appEnvironment === 'production' && currentUser) {
      // In production mode, role is permanently locked to authenticated user account
      setCurrentRole(currentUser.role);
      return;
    }
    setCurrentRole(newRole);
    if (newRole === 'admin' && (activeTab === 'idcard')) {
      setActiveTab('admin-operations');
    } else if (newRole === 'mitra' && (activeTab === 'verification' || activeTab === 'admin-operations')) {
      setActiveTab('idcard');
    }
  };

  // 1. Landing Page View (Public Facing for Financial Services & Tax Reports)
  if (viewMode === 'landing') {
    return (
      <div className="relative">
        {currentUser && (
          <div className="sticky top-0 z-50 bg-blue-900 text-white text-xs px-4 py-2 flex items-center justify-between border-b border-blue-800 shadow-md">
            <span className="font-medium">
              Anda sedang login sebagai <strong>{currentUser.name}</strong> ({currentUser.role === 'admin' ? 'Admin' : 'Mitra'}).
            </span>
            <button
              onClick={() => setViewMode('portal')}
              className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded-md hover:bg-amber-300 transition-colors shadow-xs"
            >
              Kembali ke Portal Kemitraan →
            </button>
          </div>
        )}

        <LandingPage
          onEnterPortal={() => {
            if (currentUser) {
              setViewMode('portal');
            } else {
              setViewMode('auth');
            }
          }}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenClientRegister={() => setViewMode('client_register')}
        />

        {/* Global Modals available from Landing Page */}
        <RegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={handleRegisterMitra}
        />
      </div>
    );
  }

  // 1.5 Client Self Registration View (Via Mitra Referral Link)
  if (viewMode === 'client_register') {
    return (
      <div className="relative">
        <ClientSelfRegistration
          referralCode={clientRefCode || (activeMitra?.referralCode || 'ND-REF-0042')}
          onBackToHome={() => setViewMode('landing')}
          onSuccess={() => {
            fetchData();
            if (currentUser) {
              setViewMode('portal');
            } else {
              setViewMode('landing');
            }
          }}
        />
      </div>
    );
  }

  // 2. Auth View (Login / Register / Forgot Password)
  if (viewMode === 'auth' || !currentUser) {
    return (
      <div className="relative">
        <div className="bg-slate-900 text-slate-300 px-4 py-2.5 text-xs flex items-center justify-between border-b border-slate-800">
          <button
            onClick={() => setViewMode('landing')}
            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5"
          >
            ← Kembali ke Landing Page Jasa Keuangan &amp; Pajak
          </button>
          <span className="text-slate-400">NDTAXANDLAW Partner Security Gateway</span>
        </div>

        <AuthView
          onLoginSuccess={handleLoginSuccess}
          onRegisterSubmit={async (formData) => {
            await handleRegisterMitra(formData);
          }}
          appEnvironment={settings?.appEnvironment || 'development'}
        />

        <RegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={handleRegisterMitra}
        />
      </div>
    );
  }

  // 3. Portal View (Mitra & Admin Operations)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <div>
        {/* Navigation Bar */}
        <Navbar
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeMitra={activeMitra}
          allMitras={mitras}
          onSelectMitra={(m) => setActiveMitraId(m.id)}
          unreadCount={unreadNotifCount}
          onOpenNotifications={() => setIsNotifDrawerOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
          onViewLandingPage={() => setViewMode('landing')}
          onOpenServicesModal={() => setIsServicesModalOpen(true)}
          onOpenClientInput={() => setIsClientModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          appEnvironment={settings?.appEnvironment || 'development'}
        />

        {/* Executive Sub-Header / Persona Context Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white border-b border-blue-900/50 py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-blue-700/60 border border-blue-400/30 text-blue-200">
                {currentRole === 'admin' ? 'PANEL OPERASIONAL ADMIN' : 'PORTAL RESMI MITRA'}
              </span>
              <span className="text-slate-300 hidden md:inline">·</span>
              <span className="text-slate-200 font-medium hidden md:inline">
                {currentRole === 'admin'
                  ? 'Manajemen Verifikasi, Monitoring Komisi Bank, & Unggah Tools Pemasaran'
                  : `Aktif sebagai: ${activeMitra.fullName} (${activeMitra.memberCode})`}
              </span>
            </div>

            {/* Mitra Action Bar */}
            {currentRole === 'mitra' ? (
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded-md hover:bg-amber-300 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>+ Input Klien Baru</span>
                </button>
                {/* Switcher ONLY IN DEV MODE */}
                {settings?.appEnvironment !== 'production' && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-400 hidden sm:inline">Mitra:</span>
                    <select
                      value={activeMitra.id}
                      onChange={(e) => setActiveMitraId(e.target.value)}
                      className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium border border-white/20 focus:outline-hidden cursor-pointer"
                    >
                      {mitras.map((m) => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                          {m.fullName.split(',')[0]} ({m.status === 'verified' ? 'Verified' : 'Pending'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsServicesModalOpen(true)}
                  className="px-3 py-1 bg-blue-700 text-white font-bold rounded-md hover:bg-blue-600 transition-colors border border-blue-500 shadow-xs"
                >
                  Kelola Layanan Pajak
                </button>
                <div className="text-slate-300 font-mono text-[11px] hidden sm:block">
                  <span className="text-emerald-400">Database &amp; AI Aktif</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Viewport */}
        <main className="pb-16">
          {activeTab === 'dashboard' && (
            <AnalyticsDashboard
              salesHistory={salesHistory}
              userRole={currentRole}
              activeMitra={activeMitra}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'idcard' && currentRole === 'mitra' && (
            <ExclusiveIdCard
              mitra={activeMitra}
              onEditProfile={() => setIsProfileOpen(true)}
              onOpenClientSelfRegister={(refCode) => {
                setClientRefCode(refCode);
                setViewMode('client_register');
              }}
            />
          )}

          {activeTab === 'marketing-tools' && (
            <MarketingToolsHub
              tools={marketingTools}
              userRole={currentRole}
              onAddTool={handleAddMarketingTool}
              onDeleteTool={handleDeleteMarketingTool}
            />
          )}

          {activeTab === 'commissions' && (
            <CommissionLedger
              mitra={activeMitra}
              userRole={currentRole}
              transactions={commissions}
              clientDeals={clientDeals}
              onRequestPayout={handleRequestPayout}
              onEditBankDetails={() => setIsProfileOpen(true)}
              onOpenClientInput={() => setIsClientModalOpen(true)}
            />
          )}

          {activeTab === 'ai-reports' && (
            <AnalyticsDashboard
              salesHistory={salesHistory}
              userRole={currentRole}
              activeMitra={activeMitra}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'admin-operations' && currentRole === 'admin' && (
            <AdminOperationsHub
              mitras={mitras}
              clientDeals={clientDeals}
              commissions={commissions}
              onRefreshData={fetchData}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {activeTab === 'verification' && currentRole === 'admin' && (
            <MitraVerificationPanel
              mitras={mitras}
              onVerifyMitra={handleVerifyMitra}
              onSelectMitraPreview={(m) => {
                setActiveMitraId(m.id);
                setCurrentRole('mitra');
                setActiveTab('idcard');
              }}
            />
          )}
        </main>
      </div>

      {/* Corporate Modern Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_c3fdb6de.png"
              alt="ND TAX AND LAW"
              className="h-6 w-auto object-contain"
            />
            <span aria-hidden="true">·</span>
            <span>Tax, Legal &amp; Corporate Advisory Portal</span>
            <span aria-hidden="true">·</span>
            <span>Hak Cipta &copy; 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setViewMode('landing')}
              className="text-blue-700 hover:underline font-semibold"
            >
              Lihat Web Layanan Publik
            </button>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              Sistem Kemitraan Resmi
            </span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={handleRegisterMitra}
      />

      <ProfileEditModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        mitra={activeMitra}
        onUpdateProfile={handleUpdateProfile}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onSelectAction={(tab) => setActiveTab(tab)}
      />

      <ClientInputModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        currentMitra={activeMitra}
        onDealAdded={() => {
          fetchData();
        }}
      />

      <ServicesManagementModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        onServiceUpdated={() => {
          fetchData();
        }}
      />

      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(newSettings) => {
          setSettings(newSettings);
          fetchData();
        }}
      />
    </div>
  );
}
