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
import { StaffProfileEditModal } from './components/StaffProfileEditModal';
import { StaffManagementPanel } from './components/StaffManagementPanel';
import { MitraPublicVerificationView } from './components/MitraPublicVerificationView';
import { OnboardingSpotlightTour } from './components/OnboardingSpotlightTour';
import { RealtimeChatHub } from './components/RealtimeChatHub';
import { Mitra, MarketingTool, CommissionTransaction, NotificationItem, SalesHistoryMonth, BankDetails, AuthUser, ClientDeal, AppSettings, DEFAULT_STAFF_ALLOWED_MENUS, filterNotificationsForViewer } from './types';
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

const ADMIN_VALID_TABS = ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'ai-reports', 'idcard', 'staff-management', 'chat'];
const MITRA_VALID_TABS = ['dashboard', 'idcard', 'marketing-tools', 'commissions', 'chat'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nd_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<'landing' | 'portal' | 'auth' | 'client_register' | 'mitra_verify'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('verify')) return 'mitra_verify';
      if (urlParams.get('ref')) return 'client_register';
    }
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      if (savedUser) return 'portal';
    } catch {}
    return 'landing';
  });

  const [clientRefCode, setClientRefCode] = useState<string | null>(null);
  const [verifyMemberCode, setVerifyMemberCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('verify');
    }
    return null;
  });
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
          return savedTab && MITRA_VALID_TABS.includes(savedTab) ? savedTab : 'dashboard';
        }
      }
    } catch {}
    return 'dashboard';
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
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isIncompleteProfileAlertOpen, setIsIncompleteProfileAlertOpen] = useState(false);
  const [dismissedProfileAlertForId, setDismissedProfileAlertForId] = useState<string | null>(null);

  // Dark / Light Theme Mode for Portal (Mitra, Staf, & Admin)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('nd_portal_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  const handleToggleThemeMode = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('nd_portal_theme', next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isPortalDark = themeMode === 'dark' && viewMode !== 'landing';
    document.documentElement.classList.toggle('dark-portal', isPortalDark);
    return () => {
      document.documentElement.classList.remove('dark-portal');
    };
  }, [themeMode, viewMode]);

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
      const verify = urlParams.get('verify');
      const ref = urlParams.get('ref');
      if (verify) {
        setVerifyMemberCode(verify);
        setViewMode('mitra_verify');
      } else if (ref) {
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

    const isStaffRole = currentUser.roleCode === 'staff';
    const staffMenus =
      currentUser.allowedMenus && currentUser.allowedMenus.length > 0
        ? currentUser.allowedMenus
        : DEFAULT_STAFF_ALLOWED_MENUS;

    const isChatAllowedForUser =
      (effectivePortalRole === 'admin' && !isStaffRole) || settings?.chatEnabled !== false;

    const validTabs = isStaffRole
      ? [
          ...(staffMenus.includes('dashboard') ? ['dashboard'] : []),
          ...(staffMenus.includes('admin-operations') ? ['admin-operations'] : []),
          ...(staffMenus.includes('verification') ? ['verification', 'idcard'] : []),
          ...(staffMenus.includes('marketing-tools') ? ['marketing-tools'] : []),
          ...(staffMenus.includes('commissions') ? ['commissions'] : []),
          ...(isChatAllowedForUser ? ['chat'] : []),
        ]
      : currentUser.allowedTabs && currentUser.allowedTabs.length > 0
        ? [...currentUser.allowedTabs, 'staff-management', ...(isChatAllowedForUser ? ['chat'] : [])]
        : effectivePortalRole === 'admin'
          ? ADMIN_VALID_TABS
          : MITRA_VALID_TABS.filter((t) => (t === 'chat' ? isChatAllowedForUser : true));

    const defaultRoleTab = isStaffRole
      ? validTabs[0] || 'dashboard'
      : 'dashboard';

    if (effectivePortalRole === 'mitra') {
      const targetId = currentUser.mitraId || currentUser.id;
      if (targetId && activeMitraId !== targetId) {
        setActiveMitraId(targetId);
      }
    }

    if (!validTabs.includes(activeTab)) {
      setActiveTab(defaultRoleTab);
    }
  }, [currentUser, currentRole, activeTab, activeMitraId, settings?.chatEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('nd_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Auto-trigger Onboarding Spotlight Tour for first-time user in Mitra, Staf, or Admin role
  useEffect(() => {
    if (viewMode !== 'portal' || !currentUser) return;
    try {
      const roleKey = currentUser.roleCode || currentUser.role || currentRole;
      const userKey = currentUser.id || currentUser.email || 'default';
      const storageKey = `nd_onboarding_seen_v1_${roleKey}_${userKey}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = window.setTimeout(() => {
          setIsTourOpen(true);
        }, 480);
        return () => window.clearTimeout(timer);
      }
    } catch {}
  }, [viewMode, currentUser, currentRole]);

  const handleCloseOnboardingTour = () => {
    setIsTourOpen(false);
    if (!currentUser) return;
    try {
      const roleKey = currentUser.roleCode || currentUser.role || currentRole;
      const userKey = currentUser.id || currentUser.email || 'default';
      const storageKey = `nd_onboarding_seen_v1_${roleKey}_${userKey}`;
      localStorage.setItem(storageKey, 'true');
    } catch {}
  };

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
        memberCode: 'ND-TAX-LAW-0001',
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
        memberCode: 'ND-TAX-LAW-0000',
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

  const effectiveViewerRole: 'admin' | 'staff' | 'mitra' =
    currentRole === 'mitra'
      ? 'mitra'
      : currentUser?.roleCode === 'staff'
      ? 'staff'
      : 'admin';

  const visibleNotifications = React.useMemo(() => {
    const mitraCompanyNames = clientDeals
      .filter((d) => d.mitraId === activeMitra.id)
      .map((d) => d.companyName);
    return filterNotificationsForViewer(notifications, {
      viewerRole: effectiveViewerRole,
      mitraId: activeMitra.id,
      mitraName: activeMitra.fullName,
      mitraMemberCode: activeMitra.memberCode,
      mitraReferralCode: activeMitra.referralCode,
      mitraClientCompanyNames: mitraCompanyNames,
    });
  }, [notifications, effectiveViewerRole, activeMitra, clientDeals]);

  const unreadNotifCount = visibleNotifications.filter((n) => !n.isRead).length;

  // Check if logged-in Mitra still has incomplete profile / bank details
  const isMitraProfileIncomplete = React.useMemo(() => {
    if (currentRole !== 'mitra' || !activeMitra || activeMitra.id === 'mitra-empty') {
      return false;
    }
    const missingBank =
      !activeMitra.bankDetails?.accountNumber ||
      activeMitra.bankDetails.accountNumber.trim() === '' ||
      activeMitra.bankDetails.accountNumber.trim() === '-' ||
      !activeMitra.bankDetails?.bankName ||
      activeMitra.bankDetails.bankName.trim() === '' ||
      activeMitra.bankDetails.bankName.trim() === '-';
    const missingNik =
      !activeMitra.nik ||
      activeMitra.nik.trim() === '' ||
      activeMitra.nik.trim() === '-' ||
      activeMitra.nik.trim() === '3201000000000000';
    const missingPhone =
      !activeMitra.phone ||
      activeMitra.phone.trim() === '' ||
      activeMitra.phone.trim() === '-';
    return missingBank || missingNik || missingPhone;
  }, [currentRole, activeMitra]);

  useEffect(() => {
    if (
      viewMode === 'portal' &&
      currentRole === 'mitra' &&
      isMitraProfileIncomplete &&
      dismissedProfileAlertForId !== activeMitra.id
    ) {
      setIsIncompleteProfileAlertOpen(true);
    } else if (!isMitraProfileIncomplete) {
      setIsIncompleteProfileAlertOpen(false);
    }
  }, [viewMode, currentRole, isMitraProfileIncomplete, dismissedProfileAlertForId, activeMitra.id]);

  // Handlers
  const handleRegisterMitra = async (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
    customFields?: Record<string, string>;
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
      const targetIds = visibleNotifications.map((n) => n.id);
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds }),
      });
      const idSet = new Set(targetIds);
      setNotifications((prev) =>
        prev.map((n) => (idSet.size === 0 || idSet.has(n.id) ? { ...n, isRead: true } : n))
      );
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
      setActiveTab('dashboard');
      setDismissedProfileAlertForId(null);
      try {
        localStorage.setItem('nd_active_tab', 'dashboard');
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
          supportEmail={settings?.supportEmail || 'advisory@ndtaxandlaw.com'}
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
          onOpenClientRegister={
            settings?.allowClientSelfRegister !== false
              ? () => setViewMode('client_register')
              : undefined
          }
          logoUrl={settings?.logoUrl}
          copyrightText={settings?.copyrightText}
          appVersion={settings?.appVersion}
        />

        {/* Global Modals available from Landing Page */}
        <RegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={handleRegisterMitra}
          settings={settings}
        />
      </div>
    );
  }

  // 1.25 Public QR Code Mitra Verification View (Via ?verify=ND-2026-XXXX)
  if (viewMode === 'mitra_verify') {
    return (
      <MitraPublicVerificationView
        verifyCode={verifyMemberCode || activeMitra?.memberCode || ''}
        onBackToHome={() => {
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          if (currentUser) {
            setViewMode('portal');
          } else {
            setViewMode('landing');
          }
        }}
      />
    );
  }

  // 1.5 Client Self Registration View (Via Mitra Referral Link)
  if (viewMode === 'client_register') {
    return (
      <div className="relative">
        <ClientSelfRegistration
          referralCode={clientRefCode || (activeMitra?.referralCode || 'ND-REF-0042')}
          onBackToHome={() => {
            if (typeof window !== 'undefined' && window.location.search) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            if (currentUser) {
              setViewMode('portal');
            } else {
              setViewMode('landing');
            }
          }}
          settings={settings}
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
        <AuthView
          onLoginSuccess={handleLoginSuccess}
          onRegisterSubmit={async (formData) => {
            return await handleRegisterMitra(formData);
          }}
          appEnvironment={settings?.appEnvironment || 'development'}
          initialMode={authInitialMode}
          supportPhone={settings?.supportPhone || '0812-8899-7711'}
          firmName={settings?.firmName || 'NDTAXANDLAW'}
          settings={settings}
          onBackToLanding={() => setViewMode('landing')}
        />

        <RegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegister={handleRegisterMitra}
          settings={settings}
        />
      </div>
    );
  }

  // 3. Portal View (Mitra & Admin Operations)
  return (
    <div className="portal-root min-h-screen w-full overflow-x-hidden pb-20 md:pb-0 bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
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
          onStartOnboardingTour={() => setIsTourOpen(true)}
          appEnvironment={settings?.appEnvironment || 'development'}
          themeMode={themeMode}
          onToggleTheme={handleToggleThemeMode}
          logoUrl={settings?.logoUrl}
        />

        {/* Executive Sub-Header / Persona Context Bar (Matched to Mitra ID Card Royal Navy & Gold Theme) */}
        <div className="w-full bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white border-b border-amber-400/40 py-2.5 shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2.5 py-1 rounded-md font-mono font-bold uppercase text-[10px] bg-amber-400/15 border border-amber-400/40 text-amber-300 shrink-0">
                {currentRole === 'admin'
                  ? currentUser?.roleCode === 'staff'
                    ? 'PANEL OPERASIONAL STAF'
                    : 'PANEL OPERASIONAL ADMIN'
                  : 'PORTAL RESMI MITRA'}
              </span>
              {(currentRole === 'mitra' || currentUser?.roleCode === 'staff') && (
                <>
                  <span className="text-amber-300/60 hidden md:inline shrink-0">·</span>
                  <span className="text-slate-100 font-medium truncate hidden sm:inline">
                    {currentRole === 'admin'
                      ? `Staf Aktif: ${currentUser?.name} (${currentUser?.position || 'Staf Operasional'})`
                      : `Aktif sebagai: ${activeMitra.fullName} (${activeMitra.memberCode})`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Viewport */}
        <main className={activeTab === 'chat' ? 'pb-3' : 'pb-16'}>
          {activeTab === 'dashboard' && (
            <AnalyticsDashboard
              salesHistory={salesHistory}
              userRole={currentRole}
              activeMitra={activeMitra}
              allMitras={mitras}
              allClientDeals={clientDeals}
              commissions={commissions}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'idcard' && (
            <div>
              {currentRole === 'admin' && (
                <div className="max-w-7xl mx-auto pt-4 px-3 sm:px-6 lg:px-8 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Pratinjau Kartu Identitas Mitra: <strong>{activeMitra.fullName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 rounded-lg"
                  >
                    ← Kembali ke Verifikasi Mitra
                  </button>
                </div>
              )}
              <ExclusiveIdCard
                mitra={activeMitra}
                onEditProfile={() => setIsProfileOpen(true)}
                onUpdateProfile={handleUpdateProfile}
                allowClientSelfRegister={settings?.allowClientSelfRegister !== false}
                supportPhone={settings?.supportPhone || '0812-8899-7711'}
                supportEmail={settings?.supportEmail || 'advisory@ndtaxandlaw.com'}
                officeAddress={settings?.officeAddress}
                logoUrl={settings?.logoUrl}
                onOpenClientSelfRegister={
                  settings?.allowClientSelfRegister !== false
                    ? (refCode) => {
                        setClientRefCode(refCode);
                        setViewMode('client_register');
                      }
                    : undefined
                }
                onOpenVerifyPreview={(memberCode) => {
                  setVerifyMemberCode(memberCode);
                  setViewMode('mitra_verify');
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
              allMitras={mitras}
              userRole={currentRole}
              transactions={commissions}
              clientDeals={clientDeals}
              settings={settings}
              onRequestPayout={handleRequestPayout}
              onEditBankDetails={() => setIsProfileOpen(true)}
              onOpenClientInput={() => setIsClientModalOpen(true)}
              onNavigateToOperations={() => setActiveTab('admin-operations')}
            />
          )}

          {activeTab === 'ai-reports' && (
            <AnalyticsDashboard
              salesHistory={salesHistory}
              userRole={currentRole}
              activeMitra={activeMitra}
              allMitras={mitras}
              allClientDeals={clientDeals}
              commissions={commissions}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'admin-operations' && currentRole === 'admin' && (
            <AdminOperationsHub
              mitras={mitras}
              clientDeals={clientDeals}
              commissions={commissions}
              onRefreshData={fetchData}
              onOpenSettings={
                currentUser?.roleCode !== 'staff' ||
                (currentUser?.allowedMenus || DEFAULT_STAFF_ALLOWED_MENUS).includes('settings-general') ||
                (currentUser?.allowedMenus || DEFAULT_STAFF_ALLOWED_MENUS).includes('settings-forms')
                  ? () => setIsSettingsOpen(true)
                  : undefined
              }
              initialSubTab="client_validation"
              mode="operations"
            />
          )}

          {activeTab === 'activity-logs' && currentRole === 'admin' && currentUser?.roleCode !== 'staff' && (
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

          {activeTab === 'staff-management' && currentRole === 'admin' && currentUser?.roleCode !== 'staff' && (
            <StaffManagementPanel
              currentUser={currentUser}
              onAdminUserUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                try {
                  localStorage.setItem('nd_auth_user', JSON.stringify(updatedUser));
                } catch {}
              }}
            />
          )}

          {activeTab === 'chat' && (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
              <RealtimeChatHub
                currentUserId={
                  currentRole === 'mitra'
                    ? activeMitra.id
                    : currentUser?.id || (currentUser?.roleCode === 'staff' ? 'staff-01' : 'admin-01')
                }
                currentUserName={
                  currentRole === 'mitra'
                    ? activeMitra.fullName
                    : currentUser?.name || 'Admin Operasional'
                }
                currentUserRole={
                  currentRole === 'mitra'
                    ? 'mitra'
                    : currentUser?.roleCode === 'staff'
                    ? 'staff'
                    : 'admin'
                }
                currentUserAvatar={
                  currentRole === 'mitra'
                    ? resolveAvatarUrl(activeMitra.avatarUrl, activeMitra.gender, activeMitra.fullName)
                    : resolveAvatarUrl(currentUser?.avatarUrl, currentUser?.gender || 'male', currentUser?.name)
                }
                currentUserCode={
                  currentRole === 'mitra' ? activeMitra.memberCode : currentUser?.position
                }
                chatEnabled={settings?.chatEnabled !== false}
                isChatPageOpen={true}
                onOpenChatPage={() => setActiveTab('chat')}
                onToggleChatEnabled={
                  currentRole === 'admin' && currentUser?.roleCode !== 'staff'
                    ? async (enabled) => {
                        const res = await fetch('/api/chat/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ chatEnabled: enabled }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.settings) setSettings(data.settings);
                        }
                      }
                    : undefined
                }
              />
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom-Right Chat Button (Shown when activeTab !== 'chat' and chat is enabled for Mitra/Staf or user is Admin) */}
      {activeTab !== 'chat' && (
        <RealtimeChatHub
          currentUserId={
            currentRole === 'mitra'
              ? activeMitra.id
              : currentUser?.id || (currentUser?.roleCode === 'staff' ? 'staff-01' : 'admin-01')
          }
          currentUserName={
            currentRole === 'mitra'
              ? activeMitra.fullName
              : currentUser?.name || 'Admin Operasional'
          }
          currentUserRole={
            currentRole === 'mitra'
              ? 'mitra'
              : currentUser?.roleCode === 'staff'
              ? 'staff'
              : 'admin'
          }
          currentUserAvatar={
            currentRole === 'mitra'
              ? resolveAvatarUrl(activeMitra.avatarUrl, activeMitra.gender, activeMitra.fullName)
              : resolveAvatarUrl(currentUser?.avatarUrl, currentUser?.gender || 'male', currentUser?.name)
          }
          currentUserCode={
            currentRole === 'mitra' ? activeMitra.memberCode : currentUser?.position
          }
          chatEnabled={settings?.chatEnabled !== false}
          isChatPageOpen={false}
          onOpenChatPage={() => setActiveTab('chat')}
        />
      )}

      {/* Corporate Modern Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={settings?.logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
              alt="ND TAX AND LAW"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <span>{settings?.copyrightText || 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.'}</span>
            {settings?.appVersion && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                {settings.appVersion}
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={handleRegisterMitra}
        settings={settings}
      />

      {currentRole === 'mitra' ? (
        <ProfileEditModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          mitra={activeMitra}
          onUpdateProfile={handleUpdateProfile}
          settings={settings}
        />
      ) : (
        <StaffProfileEditModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('nd_auth_user', JSON.stringify(updatedUser));
            } catch {}
          }}
          onNavigateToStaffManagement={
            currentUser?.roleCode !== 'staff'
              ? () => setActiveTab('staff-management')
              : undefined
          }
        />
      )}

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={visibleNotifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onSelectAction={(tab) => setActiveTab(tab)}
        userRole={effectiveViewerRole}
      />

      <ClientInputModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        currentMitra={activeMitra}
        settings={settings}
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
        currentUser={currentUser}
        onSettingsSaved={(newSettings) => {
          setSettings(newSettings);
          fetchData();
        }}
      />

      {/* Popup Alert Informasi Lengkapi Data Diri Mitra (Shown when Mitra registers & logs in or has incomplete data diri) */}
      {isIncompleteProfileAlertOpen && currentRole === 'mitra' && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-300/60 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] px-6 py-4 border-b border-amber-400/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Informasi Kelengkapan Data Diri
                </h3>
                <p className="text-[11px] text-amber-200/90">
                  Portal Mitra Resmi NDTAXANDLAW
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Halo <strong>{activeMitra.fullName}</strong>, selamat datang di Portal Mitra NDTAXANDLAW!
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                Data diri atau informasi rekening pencairan komisi Anda saat ini <strong>belum lengkap</strong>. Silakan lengkapi data diri Anda sekarang agar proses verifikasi akun dan pencairan komisi dapat diproses dengan lancar.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissedProfileAlertForId(activeMitra.id);
                    setIsIncompleteProfileAlertOpen(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedProfileAlertForId(activeMitra.id);
                    setIsIncompleteProfileAlertOpen(false);
                    setIsProfileOpen(true);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Lengkapi Data Diri</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Onboarding Tooltip / Spotlight Tour for Mitra, Staf, & Admin */}
      <OnboardingSpotlightTour
        isOpen={isTourOpen && !isIncompleteProfileAlertOpen}
        onClose={handleCloseOnboardingTour}
        currentRole={currentRole}
        currentUser={currentUser}
      />
    </div>
  );
}
