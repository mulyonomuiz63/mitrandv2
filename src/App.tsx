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
import { MALE_AVATAR_URL, resolveAvatarUrl } from './avatars';
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

const ADMIN_VALID_TABS = ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'ai-reports', 'idcard'];
const MITRA_VALID_TABS = ['idcard', 'dashboard', 'marketing-tools', 'commissions'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nd_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<'landing' | 'portal' | 'auth' | 'client_register'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('ref')) return 'client_register';
    }
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      if (savedUser) return 'portal';
    } catch {}
    return 'landing';
  });

  const [clientRefCode, setClientRefCode] = useState<string | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const [currentRole, setCurrentRole] = useState<'admin' | 'mitra'>(() => {
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      if (savedUser) {
        const parsed: AuthUser = JSON.parse(savedUser);
        return parsed.role === 'admin' ? 'admin' : 'mitra';
      }
    } catch {}
    return 'mitra';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      const savedTab = localStorage.getItem('nd_active_tab');
      if (savedUser) {
        const parsed: AuthUser = JSON.parse(savedUser);
        if (parsed.role === 'admin') {
          return savedTab && ADMIN_VALID_TABS.includes(savedTab) ? savedTab : 'dashboard';
        } else {
          return savedTab && MITRA_VALID_TABS.includes(savedTab) ? savedTab : 'idcard';
        }
      }
    } catch {}
    return 'idcard';
  });

  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // State from server API with immediate offline fallbacks
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [activeMitraId, setActiveMitraId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      if (savedUser) {
        const parsed: AuthUser = JSON.parse(savedUser);
        if (parsed.mitraId) return parsed.mitraId;
        if (parsed.role === 'mitra' && parsed.id) return parsed.id;
      }
    } catch {}
    return 'mitra-01';
  });
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

  // Synchronize role, activeTab, and activeMitraId strictly with logged-in user (supports extensible roles)
  useEffect(() => {
    if (!currentUser) return;
    const effectivePortalRole: 'admin' | 'mitra' =
      currentUser.portalView === 'admin' || currentUser.role === 'admin' ? 'admin' : 'mitra';

    if (currentRole !== effectivePortalRole) {
      setCurrentRole(effectivePortalRole);
    }

    const validTabs =
      currentUser.allowedTabs && currentUser.allowedTabs.length > 0
        ? currentUser.allowedTabs
        : effectivePortalRole === 'admin'
          ? ADMIN_VALID_TABS
          : MITRA_VALID_TABS;

    const defaultRoleTab =
      currentUser.defaultTab || (effectivePortalRole === 'admin' ? 'dashboard' : 'idcard');

    if (effectivePortalRole === 'mitra') {
      const targetId = currentUser.mitraId || currentUser.id;
      if (targetId && activeMitraId !== targetId) {
        setActiveMitraId(targetId);
      }
    }

    if (!validTabs.includes(activeTab)) {
      setActiveTab(defaultRoleTab);
    }
  }, [currentUser, currentRole, activeTab, activeMitraId]);

  useEffect(() => {
    try {
      localStorage.setItem('nd_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Resolve the active Mitra profile without ever leaking another Mitra's account on reload
  const resolvedLoggedInMitra = React.useMemo(() => {
    if (currentUser && (currentUser.portalView === 'mitra' || currentUser.role === 'mitra')) {
      const byId = mitras.find(
        (m) => m.id === currentUser.mitraId || m.id === currentUser.id
      );
      if (byId) return byId;
      const byEmail = mitras.find(
        (m) => m.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
      // Fallback strictly using currentUser's own identity while mitras list is loading
      return {
        id: currentUser.mitraId || currentUser.id,
        memberCode: 'ND-2026-MTR',
        referralCode: currentUser.referralCode || 'ND-REF-MTR',
        fullName: currentUser.name,
        email: currentUser.email,
        phone: '-',
        nik: '-',
        specialization: 'Konsultan Bisnis & Pajak',
        status: 'pending' as const,
        gender: currentUser.gender || 'male',
        avatarUrl: resolveAvatarUrl(currentUser.avatarUrl, currentUser.gender, currentUser.name),
        joinedDate: new Date().toISOString().slice(0, 10),
        bankDetails: {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '-',
          accountHolder: currentUser.name,
        },
        totalCommission: 0,
        totalBonus: 0,
        pendingPayout: 0,
        paidPayout: 0,
        referredClientsCount: 0,
        activeSubscribersCount: 0,
      };
    }

    return (
      mitras.find((m) => m.id === activeMitraId) ||
      mitras[0] || {
        id: 'mitra-empty',
        memberCode: 'ND-2026-0000',
        referralCode: 'ND-REF-0000',
        fullName: 'Belum Ada Mitra Terdaftar',
        email: '-',
        phone: '-',
        nik: '-',
        specialization: 'Konsultan Bisnis & Pajak',
        status: 'pending' as const,
        gender: 'male' as const,
        avatarUrl: MALE_AVATAR_URL,
        joinedDate: new Date().toISOString().slice(0, 10),
        bankDetails: {
          bankName: '-',
          accountNumber: '-',
          accountHolder: '-',
        },
        totalCommission: 0,
        totalBonus: 0,
        pendingPayout: 0,
        paidPayout: 0,
        referredClientsCount: 0,
        activeSubscribersCount: 0,
      }
    );
  }, [currentUser, mitras, activeMitraId]);

  const activeMitra = resolvedLoggedInMitra;

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  // Handlers
  const handleRegisterMitra = async (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
  }) => {
    const res = await fetch('/api/mitra/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Pendaftaran gagal diproses.');
    }
    if (data.success && data.data) {
      setMitras((prev) => [data.data, ...prev]);
      setActiveMitraId(data.data.id);
      fetchData();
    }
    return data;
  };

  const handleVerifyMitra = async (id: string, status: 'verified' | 'rejected', rejectionReason?: string) => {
    try {
      const res = await fetch(`/api/mitra/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
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
        if (currentUser && (currentUser.mitraId === id || currentUser.id === id)) {
          const updatedUser: AuthUser = {
            ...currentUser,
            name: data.data.fullName || currentUser.name,
            avatarUrl: data.data.avatarUrl || currentUser.avatarUrl,
            gender: data.data.gender || currentUser.gender,
          };
          setCurrentUser(updatedUser);
          try {
            localStorage.setItem('nd_auth_user', JSON.stringify(updatedUser));
          } catch {}
        }
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
    const res = await fetch('/api/commissions/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mitraId, amount }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengajukan pencairan komisi.');
    }
    fetchData();
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
      setActiveTab('dashboard');
      try {
        localStorage.setItem('nd_active_tab', 'dashboard');
      } catch {}
    } else {
      setCurrentRole('mitra');
      setActiveTab('idcard');
      try {
        localStorage.setItem('nd_active_tab', 'idcard');
      } catch {}
      const mitraTargetId = user.mitraId || user.id;
      if (mitraTargetId) {
        setActiveMitraId(mitraTargetId);
      }
    }
    setViewMode('portal');
    fetchData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setViewMode('landing');
    try {
      localStorage.removeItem('nd_auth_user');
      localStorage.removeItem('nd_active_tab');
    } catch {}
  };

  // Role is strictly locked to the authenticated user's role
  const handleRoleChange = (_newRole: 'admin' | 'mitra') => {
    if (currentUser) {
      setCurrentRole(currentUser.role);
    }
  };

  // 1. Landing Page View (Public Facing for Financial Services & Tax Reports)
  if (viewMode === 'landing') {
    const loggedInAvatar =
      currentUser?.role === 'mitra'
        ? resolveAvatarUrl(activeMitra.avatarUrl, activeMitra.gender, activeMitra.fullName)
        : resolveAvatarUrl(currentUser?.avatarUrl, currentUser?.gender || 'male', currentUser?.name);

    return (
      <div className="relative">
        <LandingPage
          currentUser={currentUser}
          userAvatarUrl={loggedInAvatar}
          supportPhone={settings?.supportPhone || '0812-8899-7711'}
          supportEmail={settings?.supportEmail || 'advisory@ndtaxlaw.com'}
          onEnterPortal={() => {
            if (currentUser) {
              setViewMode('portal');
            } else {
              setAuthInitialMode('login');
              setViewMode('auth');
            }
          }}
          onOpenRegister={() => {
            if (currentUser) {
              setViewMode('portal');
            } else {
              setAuthInitialMode('register');
              setViewMode('auth');
            }
          }}
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
          initialMode={authInitialMode}
          supportPhone={settings?.supportPhone || '0812-8899-7711'}
          firmName={settings?.firmName || 'NDTAXANDLAW'}
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
    <div className="min-h-screen w-full overflow-x-hidden pb-20 md:pb-0 bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full min-w-0">
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
        <div className="w-full bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white border-b border-blue-900/50 py-2.5 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] bg-blue-700/60 border border-blue-400/30 text-blue-200 shrink-0">
                {currentRole === 'admin' ? 'PANEL OPERASIONAL ADMIN' : 'PORTAL RESMI MITRA'}
              </span>
              <span className="text-slate-300 hidden md:inline shrink-0">·</span>
              <span className="text-slate-200 font-medium truncate hidden sm:inline">
                {currentRole === 'admin'
                  ? 'Manajemen Verifikasi, Monitoring Komisi Bank, & Unggah Tools Pemasaran'
                  : `Aktif sebagai: ${activeMitra.fullName} (${activeMitra.memberCode})`}
              </span>
            </div>

            {/* Admin Action Bar */}
            {currentRole === 'admin' && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsServicesModalOpen(true)}
                  className="px-2.5 py-1 bg-blue-700 text-white font-bold rounded-md hover:bg-blue-600 transition-colors border border-blue-500 shadow-xs text-[11px] sm:text-xs"
                >
                  Kelola Layanan Pajak
                </button>
                <div className="text-slate-300 font-mono text-[11px] hidden lg:block">
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
              allMitras={mitras}
              allClientDeals={clientDeals}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'idcard' && (
            <div>
              {currentRole === 'admin' && (
                <div className="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Pratinjau Kartu Identitas Mitra: <strong>{activeMitra.fullName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                  >
                    ← Kembali ke Verifikasi Mitra
                  </button>
                </div>
              )}
              <ExclusiveIdCard
                mitra={activeMitra}
                onEditProfile={() => setIsProfileOpen(true)}
                onUpdateProfile={handleUpdateProfile}
                supportPhone={settings?.supportPhone || '0812-8899-7711'}
                supportEmail={settings?.supportEmail || 'advisory@ndtaxlaw.com'}
                onOpenClientSelfRegister={(refCode) => {
                  setClientRefCode(refCode);
                  setViewMode('client_register');
                }}
              />
            </div>
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
              allMitras={mitras}
              allClientDeals={clientDeals}
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
              initialSubTab="client_validation"
              mode="operations"
            />
          )}

          {activeTab === 'activity-logs' && currentRole === 'admin' && (
            <AdminOperationsHub
              mitras={mitras}
              clientDeals={clientDeals}
              commissions={commissions}
              onRefreshData={fetchData}
              onOpenSettings={() => setIsSettingsOpen(true)}
              initialSubTab="activity_logs"
              mode="logs"
            />
          )}

          {activeTab === 'verification' && currentRole === 'admin' && (
            <MitraVerificationPanel
              mitras={mitras}
              onVerifyMitra={handleVerifyMitra}
              onSelectMitraPreview={(m) => {
                setActiveMitraId(m.id);
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
