/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { ProspectLetterPublicVerifyView } from './components/ProspectLetterPublicVerifyView';
import { ProspectsHub } from './components/ProspectsHub';
import { OnboardingSpotlightTour } from './components/OnboardingSpotlightTour';
import { RealtimeChatHub } from './components/RealtimeChatHub';
import { PageLoadingSkeleton } from './components/SkeletonLoader';
import { Mitra, MarketingTool, CommissionTransaction, NotificationItem, SalesHistoryMonth, BankDetails, AuthUser, ClientDeal, AppSettings, DEFAULT_STAFF_ALLOWED_MENUS, filterNotificationsForViewer, isMitraDataIncomplete } from './types';
import { MALE_AVATAR_URL, resolveAvatarUrl } from './avatars';
import {
  AppHistoryState,
  CommissionsSubTab,
  LogsSubTab,
  OperationsSubTab,
  PortalModalKey,
  ProspectsSubTab,
  SettingsTabKey,
  StaffSectionKey,
  ViewMode,
  buildNavUrl,
  isAppHistoryState,
  parseHashToNavState,
  serializeNavKey,
} from './utils/navigationHistory';
import { 
  ShieldCheck, 
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

const ADMIN_VALID_TABS = ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'prospects', 'ai-reports', 'idcard', 'staff-management', 'chat'];
const MITRA_VALID_TABS = ['dashboard', 'idcard', 'marketing-tools', 'commissions', 'prospects', 'chat'];
const VALID_OPERATIONS_SUBTABS: OperationsSubTab[] = [
  'client_validation',
  'commission_bonus',
  'mitra_analysis',
  'payout_management',
];
const VALID_LOGS_SUBTABS: LogsSubTab[] = ['activity_logs', 'email_logs'];
const VALID_COMMISSIONS_SUBTABS: CommissionsSubTab[] = ['referrals', 'transactions', 'payouts'];
const VALID_STAFF_SECTIONS: StaffSectionKey[] = ['staff_list', 'add_staff', 'admin_profile'];
const VALID_PROSPECTS_SUBTABS: ProspectsSubTab[] = ['mitra_summary', 'all_letters'];

function readInitialHashNav(): Partial<AppHistoryState> | null {
  if (typeof window === 'undefined') return null;
  if (isAppHistoryState(window.history.state)) return window.history.state;
  return parseHashToNavState(window.location.hash);
}

export default function App() {
  const initialHashNav = useMemo(() => readInitialHashNav(), []);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nd_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('verify-surat')) return 'letter_verify';
      if (urlParams.get('verify')) return 'mitra_verify';
      if (urlParams.get('ref')) return 'client_register';
    }
    let hasSavedUser = false;
    try {
      hasSavedUser = Boolean(localStorage.getItem('nd_auth_user'));
    } catch {}

    const hashNav = readInitialHashNav();
    if (hashNav?.viewMode === 'landing') return 'landing';
    if (hashNav?.viewMode === 'auth') return hasSavedUser ? 'portal' : 'auth';
    if (hashNav?.viewMode === 'portal') return hasSavedUser ? 'portal' : 'auth';

    return hasSavedUser ? 'portal' : 'landing';
  });

  const [clientRefCode, setClientRefCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('ref');
    }
    return null;
  });
  const [verifyMemberCode, setVerifyMemberCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('verify');
    }
    return null;
  });
  const [verifyLetterCode, setVerifyLetterCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('verify-surat');
    }
    return null;
  });
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>(() => {
    const hashNav = readInitialHashNav();
    return hashNav?.authMode === 'register' ? 'register' : 'login';
  });

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
      const hashNav = readInitialHashNav();
      const savedTab =
        (hashNav?.viewMode === 'portal' && hashNav.activeTab) ||
        localStorage.getItem('nd_active_tab');
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

  // Sub-tabs synced with browser Back/Forward history across Admin, Staf, & Mitra
  const [operationsSubTab, setOperationsSubTab] = useState<OperationsSubTab>(() => {
    const sub = initialHashNav?.subTab;
    return initialHashNav?.activeTab === 'admin-operations' &&
      sub &&
      VALID_OPERATIONS_SUBTABS.includes(sub as OperationsSubTab)
      ? (sub as OperationsSubTab)
      : 'client_validation';
  });
  const [logsSubTab, setLogsSubTab] = useState<LogsSubTab>(() => {
    const sub = initialHashNav?.subTab;
    return initialHashNav?.activeTab === 'activity-logs' &&
      sub &&
      VALID_LOGS_SUBTABS.includes(sub as LogsSubTab)
      ? (sub as LogsSubTab)
      : 'activity_logs';
  });
  const [commissionsSubTab, setCommissionsSubTab] = useState<CommissionsSubTab>(() => {
    const sub = initialHashNav?.subTab;
    return initialHashNav?.activeTab === 'commissions' &&
      sub &&
      VALID_COMMISSIONS_SUBTABS.includes(sub as CommissionsSubTab)
      ? (sub as CommissionsSubTab)
      : 'referrals';
  });
  const [staffSection, setStaffSection] = useState<StaffSectionKey>(() => {
    const sub = initialHashNav?.subTab;
    return initialHashNav?.activeTab === 'staff-management' &&
      sub &&
      VALID_STAFF_SECTIONS.includes(sub as StaffSectionKey)
      ? (sub as StaffSectionKey)
      : 'staff_list';
  });
  const [prospectsSubTab, setProspectsSubTab] = useState<ProspectsSubTab>(() => {
    const sub = initialHashNav?.subTab;
    return initialHashNav?.activeTab === 'prospects' &&
      sub &&
      VALID_PROSPECTS_SUBTABS.includes(sub as ProspectsSubTab)
      ? (sub as ProspectsSubTab)
      : 'mitra_summary';
  });
  const [settingsActiveTab, setSettingsActiveTab] = useState<SettingsTabKey>(() =>
    initialHashNav?.settingsTab || 'general'
  );

  const [pendingChatRoomId, setPendingChatRoomId] = useState<string | null>(() =>
    initialHashNav?.viewMode === 'portal' && initialHashNav.activeTab === 'chat'
      ? initialHashNav.chatRoomId || null
      : null
  );
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // State from server API with immediate offline fallbacks
  const [mitras, setMitras] = useState<Mitra[]>(() => {
    try {
      const cached = localStorage.getItem('nd_cached_active_mitra');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) return [parsed];
      }
    } catch {}
    return [];
  });
  const [isMitrasLoaded, setIsMitrasLoaded] = useState<boolean>(false);
  const [activeMitraId, setActiveMitraId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('nd_auth_user');
      if (savedUser) {
        const parsed: AuthUser = JSON.parse(savedUser);
        if (parsed.role === 'admin' && initialHashNav?.activeMitraId) {
          return initialHashNav.activeMitraId;
        }
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

  // Modals state (synced with browser Back/Forward history)
  const [isRegisterOpen, setIsRegisterOpen] = useState(() => initialHashNav?.modal === 'register');
  const [isProfileOpen, setIsProfileOpen] = useState(
    () => initialHashNav?.viewMode === 'portal' && initialHashNav?.modal === 'profile'
  );
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(
    () => initialHashNav?.viewMode === 'portal' && initialHashNav?.modal === 'notifications'
  );
  const [isClientModalOpen, setIsClientModalOpen] = useState(
    () => initialHashNav?.viewMode === 'portal' && initialHashNav?.modal === 'client-input'
  );
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(
    () => initialHashNav?.viewMode === 'portal' && initialHashNav?.modal === 'services'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => initialHashNav?.viewMode === 'portal' && initialHashNav?.modal === 'settings'
  );
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isIncompleteProfileAlertOpen, setIsIncompleteProfileAlertOpen] = useState(false);
  const [dismissedProfileAlertForId, setDismissedProfileAlertForId] = useState<string | null>(null);

  const applyModalState = useCallback((modal: PortalModalKey) => {
    setIsRegisterOpen(modal === 'register');
    setIsProfileOpen(modal === 'profile');
    setIsNotifDrawerOpen(modal === 'notifications');
    setIsClientModalOpen(modal === 'client-input');
    setIsServicesModalOpen(modal === 'services');
    setIsSettingsOpen(modal === 'settings');
  }, []);

  const activeModal: PortalModalKey = isSettingsOpen
    ? 'settings'
    : isServicesModalOpen
    ? 'services'
    : isClientModalOpen
    ? 'client-input'
    : isNotifDrawerOpen
    ? 'notifications'
    : isProfileOpen
    ? 'profile'
    : isRegisterOpen
    ? 'register'
    : null;

  const activeSubTabForHistory: string | null =
    activeTab === 'admin-operations'
      ? operationsSubTab
      : activeTab === 'activity-logs'
      ? logsSubTab
      : activeTab === 'commissions'
      ? commissionsSubTab
      : activeTab === 'staff-management'
      ? staffSection
      : activeTab === 'prospects' && currentRole === 'admin'
      ? prospectsSubTab
      : null;

  const currentNavState = useMemo<AppHistoryState>(
    () => ({
      ndNav: true,
      viewMode,
      authMode: viewMode === 'auth' ? authInitialMode : undefined,
      activeTab,
      subTab: viewMode === 'portal' ? activeSubTabForHistory : null,
      activeMitraId:
        viewMode === 'portal' && activeTab === 'idcard' && currentRole === 'admin'
          ? activeMitraId
          : null,
      chatRoomId: viewMode === 'portal' && activeTab === 'chat' ? pendingChatRoomId : null,
      modal:
        viewMode === 'portal'
          ? activeModal
          : activeModal === 'register'
          ? 'register'
          : null,
      settingsTab: viewMode === 'portal' && activeModal === 'settings' ? settingsActiveTab : null,
      clientRefCode: viewMode === 'client_register' ? clientRefCode : null,
      verifyMemberCode: viewMode === 'mitra_verify' ? verifyMemberCode : null,
      verifyLetterCode: viewMode === 'letter_verify' ? verifyLetterCode : null,
    }),
    [
      viewMode,
      authInitialMode,
      activeTab,
      activeSubTabForHistory,
      currentRole,
      activeMitraId,
      pendingChatRoomId,
      activeModal,
      settingsActiveTab,
      clientRefCode,
      verifyMemberCode,
      verifyLetterCode,
    ]
  );

  // Browser Back / Forward history tracking refs
  const hasInitHistoryRef = useRef(false);
  const lastHistoryKeyRef = useRef<string>('');
  const replaceNextHistoryRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const currentRoleRef = useRef(currentRole);
  currentRoleRef.current = currentRole;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const activeMitraIdRef = useRef(activeMitraId);
  activeMitraIdRef.current = activeMitraId;

  // Push / replace browser history entry whenever app navigation state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextKey = serializeNavKey(currentNavState);
    const nextUrl = buildNavUrl(currentNavState);

    if (!hasInitHistoryRef.current) {
      hasInitHistoryRef.current = true;
      lastHistoryKeyRef.current = nextKey;
      try {
        window.history.replaceState(currentNavState, '', nextUrl);
      } catch {}
      return;
    }

    if (nextKey === lastHistoryKeyRef.current) {
      replaceNextHistoryRef.current = false;
      return;
    }

    lastHistoryKeyRef.current = nextKey;
    try {
      if (replaceNextHistoryRef.current) {
        replaceNextHistoryRef.current = false;
        window.history.replaceState(currentNavState, '', nextUrl);
      } else {
        window.history.pushState(currentNavState, '', nextUrl);
      }
    } catch {}
  }, [currentNavState]);

  // Listen to browser Back (←) & Forward (→) buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyRestoredNavState = (raw: Partial<AppHistoryState>) => {
      const user = currentUserRef.current;
      const role = currentRoleRef.current;
      let targetViewMode: ViewMode = raw.viewMode || (user ? 'portal' : 'landing');

      // Prevent unauthenticated access to portal via browser Back/Forward
      if (targetViewMode === 'portal' && !user) {
        targetViewMode = 'auth';
      }
      // Keep authenticated users out of login screen when stepping back
      if (targetViewMode === 'auth' && user) {
        targetViewMode = 'landing';
      }

      const targetAuthMode: 'login' | 'register' =
        raw.authMode === 'register' ? 'register' : 'login';
      const validList = role === 'admin' ? ADMIN_VALID_TABS : MITRA_VALID_TABS;
      const targetTab =
        raw.activeTab && validList.includes(raw.activeTab) ? raw.activeTab : 'dashboard';

      let resolvedSubTab: string | null = null;
      if (targetViewMode === 'portal') {
        if (targetTab === 'admin-operations') {
          resolvedSubTab =
            raw.subTab && VALID_OPERATIONS_SUBTABS.includes(raw.subTab as OperationsSubTab)
              ? raw.subTab
              : 'client_validation';
        } else if (targetTab === 'activity-logs') {
          resolvedSubTab =
            raw.subTab && VALID_LOGS_SUBTABS.includes(raw.subTab as LogsSubTab)
              ? raw.subTab
              : 'activity_logs';
        } else if (targetTab === 'commissions') {
          resolvedSubTab =
            raw.subTab && VALID_COMMISSIONS_SUBTABS.includes(raw.subTab as CommissionsSubTab)
              ? raw.subTab
              : 'referrals';
        } else if (targetTab === 'staff-management') {
          resolvedSubTab =
            raw.subTab && VALID_STAFF_SECTIONS.includes(raw.subTab as StaffSectionKey)
              ? raw.subTab
              : 'staff_list';
        } else if (targetTab === 'prospects' && role === 'admin') {
          resolvedSubTab =
            raw.subTab && VALID_PROSPECTS_SUBTABS.includes(raw.subTab as ProspectsSubTab)
              ? raw.subTab
              : 'mitra_summary';
        }
      }

      const targetModal: PortalModalKey =
        targetViewMode === 'portal'
          ? raw.modal || null
          : raw.modal === 'register'
          ? 'register'
          : null;
      const targetSettingsTab: SettingsTabKey = raw.settingsTab || 'general';
      const targetChatRoom =
        targetViewMode === 'portal' && targetTab === 'chat' ? raw.chatRoomId || null : null;
      const targetMitraId =
        targetViewMode === 'portal' && targetTab === 'idcard' && role === 'admin'
          ? raw.activeMitraId || activeMitraIdRef.current
          : null;
      const targetClientRef =
        targetViewMode === 'client_register' ? raw.clientRefCode || null : null;
      const targetVerifyCode =
        targetViewMode === 'mitra_verify' ? raw.verifyMemberCode || null : null;
      const targetVerifyLetterCode =
        targetViewMode === 'letter_verify' ? raw.verifyLetterCode || null : null;

      const normalized: AppHistoryState = {
        ndNav: true,
        viewMode: targetViewMode,
        authMode: targetViewMode === 'auth' ? targetAuthMode : undefined,
        activeTab: targetTab,
        subTab: resolvedSubTab,
        activeMitraId: targetMitraId,
        chatRoomId: targetChatRoom,
        modal: targetModal,
        settingsTab: targetViewMode === 'portal' && targetModal === 'settings' ? targetSettingsTab : null,
        clientRefCode: targetClientRef,
        verifyMemberCode: targetVerifyCode,
        verifyLetterCode: targetVerifyLetterCode,
      };

      // Update key before React state updates so the sync effect won't push a duplicate entry
      lastHistoryKeyRef.current = serializeNavKey(normalized);

      setViewMode(targetViewMode);
      if (targetViewMode === 'auth') {
        setAuthInitialMode(targetAuthMode);
      }
      if (targetViewMode === 'client_register') {
        setClientRefCode(targetClientRef);
      }
      if (targetViewMode === 'mitra_verify') {
        setVerifyMemberCode(targetVerifyCode);
      }
      if (targetViewMode === 'letter_verify') {
        setVerifyLetterCode(targetVerifyLetterCode);
      }
      if (targetViewMode === 'portal') {
        setActiveTab(targetTab);
        if (targetTab === 'admin-operations' && resolvedSubTab) {
          setOperationsSubTab(resolvedSubTab as OperationsSubTab);
        } else if (targetTab === 'activity-logs' && resolvedSubTab) {
          setLogsSubTab(resolvedSubTab as LogsSubTab);
        } else if (targetTab === 'commissions' && resolvedSubTab) {
          setCommissionsSubTab(resolvedSubTab as CommissionsSubTab);
        } else if (targetTab === 'staff-management' && resolvedSubTab) {
          setStaffSection(resolvedSubTab as StaffSectionKey);
        } else if (targetTab === 'prospects' && resolvedSubTab) {
          setProspectsSubTab(resolvedSubTab as ProspectsSubTab);
        }
        if (targetMitraId) {
          setActiveMitraId(targetMitraId);
        }
        setPendingChatRoomId(targetChatRoom);
      }

      if (targetModal === 'settings') {
        setSettingsActiveTab(targetSettingsTab);
      }
      applyModalState(targetModal);
    };

    const handlePopState = (event: PopStateEvent) => {
      if (isAppHistoryState(event.state)) {
        applyRestoredNavState(event.state);
        return;
      }

      const parsedHash = parseHashToNavState(window.location.hash);
      if (parsedHash) {
        applyRestoredNavState(parsedHash);
        return;
      }

      // Allow native in-page anchor scrolling on the Landing Page (e.g. #alur-kemitraan)
      if (
        viewModeRef.current === 'landing' &&
        window.location.hash &&
        !window.location.hash.startsWith('#/')
      ) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const verifySurat = urlParams.get('verify-surat');
      const verify = urlParams.get('verify');
      const ref = urlParams.get('ref');
      if (verifySurat) {
        applyRestoredNavState({
          ndNav: true,
          viewMode: 'letter_verify',
          verifyLetterCode: verifySurat,
        });
      } else if (verify) {
        applyRestoredNavState({
          ndNav: true,
          viewMode: 'mitra_verify',
          verifyMemberCode: verify,
        });
      } else if (ref) {
        applyRestoredNavState({
          ndNav: true,
          viewMode: 'client_register',
          clientRefCode: ref,
        });
      } else {
        applyRestoredNavState({
          ndNav: true,
          viewMode: currentUserRef.current ? 'portal' : 'landing',
          activeTab: 'dashboard',
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyModalState]);

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
        setIsMitrasLoaded(true);
      } else {
        setIsMitrasLoaded(true);
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
      setIsMitrasLoaded(true);
      console.warn('API fetch warning, using seeded defaults', err);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const verifySurat = urlParams.get('verify-surat');
      const verify = urlParams.get('verify');
      const ref = urlParams.get('ref');
      if (verifySurat) {
        setVerifyLetterCode(verifySurat);
        setViewMode('letter_verify');
      } else if (verify) {
        setVerifyMemberCode(verify);
        setViewMode('mitra_verify');
      } else if (ref) {
        setClientRefCode(ref);
        setViewMode('client_register');
      }
    }
  }, []);

  // Keep Mitras and Clients counts fresh in Portal mode for Admin/Staff badge notifications
  useEffect(() => {
    if (viewMode !== 'portal' || !currentUser) return;
    const interval = window.setInterval(() => {
      fetchData();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [viewMode, currentUser]);

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
          ...(staffMenus.includes('prospects') ? ['prospects'] : []),
          ...(isChatAllowedForUser ? ['chat'] : []),
        ]
      : currentUser.allowedTabs && currentUser.allowedTabs.length > 0
        ? [...currentUser.allowedTabs, 'prospects', 'staff-management', ...(isChatAllowedForUser ? ['chat'] : [])]
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
      replaceNextHistoryRef.current = true;
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
      if (byId) {
        return {
          ...byId,
          gender: byId.gender || currentUser.gender || 'male',
        };
      }
      const byEmail = mitras.find(
        (m) => m.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) {
        return {
          ...byEmail,
          gender: byEmail.gender || currentUser.gender || 'male',
        };
      }
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
        isLoadingFallback: true,
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
        isLoadingFallback: true,
      }
    );
  }, [currentUser, mitras, activeMitraId]);

  const activeMitra = resolvedLoggedInMitra;

  // Cache real resolved Mitra profile in localStorage so page refreshes have immediate complete data
  useEffect(() => {
    if (
      currentRole === 'mitra' &&
      activeMitra &&
      activeMitra.id !== 'mitra-empty' &&
      !activeMitra.isLoadingFallback
    ) {
      try {
        localStorage.setItem('nd_cached_active_mitra', JSON.stringify(activeMitra));
      } catch {}
    }
  }, [currentRole, activeMitra]);

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

  // Check if logged-in Mitra still has incomplete profile / bank details (only after server data has loaded)
  const isMitraProfileIncomplete = React.useMemo(() => {
    if (
      !isMitrasLoaded ||
      currentRole !== 'mitra' ||
      !activeMitra ||
      activeMitra.id === 'mitra-empty' ||
      activeMitra.isLoadingFallback
    ) {
      return false;
    }
    return isMitraDataIncomplete(activeMitra, settings);
  }, [isMitrasLoaded, currentRole, activeMitra, settings]);

  useEffect(() => {
    if (
      isMitrasLoaded &&
      viewMode === 'portal' &&
      currentRole === 'mitra' &&
      isMitraProfileIncomplete &&
      dismissedProfileAlertForId !== activeMitra.id
    ) {
      setIsIncompleteProfileAlertOpen(true);
    } else if (!isMitraProfileIncomplete) {
      setIsIncompleteProfileAlertOpen(false);
    }
  }, [isMitrasLoaded, viewMode, currentRole, isMitraProfileIncomplete, dismissedProfileAlertForId, activeMitra.id]);

  // Auto-logout if currently logged-in Mitra account has been deactivated by Admin/Staff
  useEffect(() => {
    if (
      isMitrasLoaded &&
      viewMode === 'portal' &&
      currentRole === 'mitra' &&
      activeMitra &&
      !activeMitra.isLoadingFallback &&
      activeMitra.isActive === false
    ) {
      setCurrentUser(null);
      setViewMode('auth');
      setAuthInitialMode('login');
      try {
        localStorage.removeItem('nd_auth_user');
        localStorage.removeItem('nd_cached_active_mitra');
      } catch {}
    }
  }, [isMitrasLoaded, viewMode, currentRole, activeMitra]);

  // Handlers
  const handleRegisterMitra = async (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
    customFields?: Record<string, string>;
  }) => {
    const isPortalAdminOrStaff =
      viewMode === 'portal' &&
      Boolean(currentUser) &&
      (currentUser?.portalView === 'admin' ||
        currentUser?.role === 'admin' ||
        currentUser?.roleCode === 'staff');

    const payload = isPortalAdminOrStaff
      ? {
          ...formData,
          autoApprove: true,
          actorRole: currentUser?.roleCode === 'staff' ? 'staff' : 'admin',
          actorName: currentUser?.name,
          actorId: currentUser?.id,
          actorEmail: currentUser?.email,
        }
      : formData;

    const res = await fetch('/api/mitra/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  const handleVerifyMitra = async (
    id: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string,
    groupChatIds?: string[]
  ) => {
    try {
      const res = await fetch(`/api/mitra/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason, groupChatIds }),
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

  const handleToggleMitraActive = async (id: string, isActive: boolean, reason?: string) => {
    const res = await fetch(`/api/mitra/${id}/active-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isActive,
        reason,
        actorName: currentUser?.name,
        actorRole: currentUser?.roleCode === 'staff' ? 'staff' : 'admin',
        actorId: currentUser?.id,
        actorEmail: currentUser?.email,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengubah status aktif mitra.');
    }
    if (data.data) {
      setMitras((prev) => prev.map((m) => (m.id === id ? data.data : m)));
      fetchData();
    }
    return data;
  };

  const handleDeleteMitra = async (id: string) => {
    const res = await fetch(`/api/mitra/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorName: currentUser?.name,
        actorRole: currentUser?.roleCode === 'staff' ? 'staff' : 'admin',
        actorId: currentUser?.id,
        actorEmail: currentUser?.email,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal menghapus data mitra.');
    }
    setMitras((prev) => prev.filter((m) => m.id !== id));
    fetchData();
    return data;
  };

  const handleUpdateProfile = async (id: string, profileData: Partial<Mitra>) => {
    const res = await fetch(`/api/mitra/${id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal memperbarui data profil.');
    }
    if (data.success && data.data) {
      setMitras((prev) => {
        const exists = prev.some((m) => m.id === id);
        return exists ? prev.map((m) => (m.id === id ? data.data : m)) : [data.data, ...prev];
      });
      if (currentRole === 'mitra' || activeMitraId === id) {
        try {
          localStorage.setItem('nd_cached_active_mitra', JSON.stringify(data.data));
        } catch {}
      }
      if (currentUser && (currentUser.mitraId === id || currentUser.id === id)) {
        const updatedUser: AuthUser = {
          ...currentUser,
          name: data.data.fullName || currentUser.name,
          email: data.data.email || currentUser.email,
          avatarUrl: data.data.avatarUrl || currentUser.avatarUrl,
          gender: data.data.gender || currentUser.gender,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('nd_auth_user', JSON.stringify(updatedUser));
        } catch {}
      }
    }
    return data;
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

  const handleUpdateMarketingTool = async (id: string, updates: Partial<MarketingTool>) => {
    try {
      const res = await fetch(`/api/marketing-tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMarketingTools((prev) => prev.map((t) => (t.id === id ? data.data : t)));
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

  const handleDeleteNotification = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      const targetIds = visibleNotifications.map((n) => n.id);
      if (targetIds.length === 0) return;
      const idSet = new Set(targetIds);
      setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      await fetch('/api/notifications/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    replaceNextHistoryRef.current = true;
    applyModalState(null);
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
    replaceNextHistoryRef.current = true;
    applyModalState(null);
    setPendingChatRoomId(null);
    setCurrentUser(null);
    setViewMode('landing');
    try {
      localStorage.removeItem('nd_auth_user');
      localStorage.removeItem('nd_active_tab');
      localStorage.removeItem('nd_cached_active_mitra');
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
        logoUrl={settings?.logoHorizontalUrl || settings?.logoUrl}
        onBackToHome={() => {
          if (currentUser) {
            setViewMode('portal');
          } else {
            setViewMode('landing');
          }
        }}
      />
    );
  }

  // 1.3 Public QR Code Director Offer Letter Verification View (Via ?verify-surat=ND-SPP-...)
  if (viewMode === 'letter_verify') {
    return (
      <ProspectLetterPublicVerifyView
        verifyCode={verifyLetterCode || ''}
        logoUrl={settings?.logoHorizontalUrl || settings?.logoUrl}
        onBackToHome={() => {
          if (currentUser) {
            setViewMode('portal');
          } else {
            setViewMode('landing');
          }
        }}
        onOpenMitraVerify={(memberCode) => {
          setVerifyMemberCode(memberCode);
          setViewMode('mitra_verify');
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
  if (!isMitrasLoaded) {
    return <PageLoadingSkeleton brandName={settings?.firmName} />;
  }

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
          onOpenClientInput={() => {
            if (currentRole === 'mitra' && isMitraProfileIncomplete) {
              setIsIncompleteProfileAlertOpen(true);
              return;
            }
            setIsClientModalOpen(true);
          }}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          onStartOnboardingTour={() => setIsTourOpen(true)}
          appEnvironment={settings?.appEnvironment || 'development'}
          themeMode={themeMode}
          onToggleTheme={handleToggleThemeMode}
          logoUrl={settings?.logoUrl}
          pendingMitraCount={mitras.filter((m) => m.status === 'pending').length}
          pendingClientCount={clientDeals.filter((d) => d.status === 'pending_acc').length}
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

        {/* Persistent Incomplete Data Diri Banner for Mitra */}
        {currentRole === 'mitra' && isMitraProfileIncomplete && (
          <div className="bg-amber-50 border-b border-amber-300 py-3 px-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-950">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold">Data Diri &amp; Berkas Verifikasi Anda Belum Lengkap.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-lg shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Lengkapi Data Diri &amp; Upload KTP/NPWP
              </button>
            </div>
          </div>
        )}

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
              settings={settings}
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
                onRequireCompleteProfile={() => setIsIncompleteProfileAlertOpen(true)}
                onUpdateProfile={handleUpdateProfile}
                allowClientSelfRegister={settings?.allowClientSelfRegister !== false}
                supportPhone={settings?.supportPhone || '0812-8899-7711'}
                supportEmail={settings?.supportEmail || 'advisory@ndtaxandlaw.com'}
                officeAddress={settings?.officeAddress}
                logoUrl={settings?.logoUrl}
                logoHorizontalUrl={settings?.logoHorizontalUrl || settings?.logoUrl}
                onOpenClientSelfRegister={
                  settings?.allowClientSelfRegister !== false
                    ? (refCode) => {
                        if (currentRole === 'mitra' && isMitraProfileIncomplete) {
                          setIsIncompleteProfileAlertOpen(true);
                          return;
                        }
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
              activeMitra={activeMitra}
              onEditProfile={() => setIsProfileOpen(true)}
              onAddTool={handleAddMarketingTool}
              onUpdateTool={handleUpdateMarketingTool}
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
              onOpenClientInput={() => {
                if (currentRole === 'mitra' && isMitraProfileIncomplete) {
                  setIsIncompleteProfileAlertOpen(true);
                  return;
                }
                setIsClientModalOpen(true);
              }}
              onNavigateToOperations={() => setActiveTab('admin-operations')}
              activeSubTab={commissionsSubTab}
              onSubTabChange={setCommissionsSubTab}
            />
          )}

          {activeTab === 'prospects' && (
            <ProspectsHub
              userRole={currentRole}
              currentUser={currentUser}
              activeMitra={activeMitra}
              allMitras={mitras}
              settings={settings}
              isProfileIncomplete={isMitraProfileIncomplete}
              onOpenProfileEdit={() => setIsProfileOpen(true)}
              onRequireCompleteProfile={() => setIsIncompleteProfileAlertOpen(true)}
              logoUrl={settings?.logoUrl}
              initialLetterTemplate={settings?.prospectLetterTemplate}
              activeSubTab={prospectsSubTab}
              onSubTabChange={setProspectsSubTab}
              onOpenLetterVerify={(verificationCode) => {
                setVerifyLetterCode(verificationCode);
                setViewMode('letter_verify');
              }}
              onOpenMitraVerify={(memberCode) => {
                setVerifyMemberCode(memberCode);
                setViewMode('mitra_verify');
              }}
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
              settings={settings}
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
              initialSubTab={operationsSubTab}
              onSubTabChange={(nextSub) => {
                if (VALID_OPERATIONS_SUBTABS.includes(nextSub as OperationsSubTab)) {
                  setOperationsSubTab(nextSub as OperationsSubTab);
                }
              }}
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
              initialSubTab={logsSubTab}
              onSubTabChange={(nextSub) => {
                if (VALID_LOGS_SUBTABS.includes(nextSub as LogsSubTab)) {
                  setLogsSubTab(nextSub as LogsSubTab);
                }
              }}
              mode="logs"
            />
          )}

          {activeTab === 'verification' && currentRole === 'admin' && (
            <MitraVerificationPanel
              mitras={mitras}
              clientDeals={clientDeals}
              settings={settings}
              currentUser={currentUser}
              onVerifyMitra={handleVerifyMitra}
              onUpdateMitraProfile={handleUpdateProfile}
              onToggleMitraActive={handleToggleMitraActive}
              onDeleteMitra={handleDeleteMitra}
              onSelectMitraPreview={(m) => {
                setActiveMitraId(m.id);
                setActiveTab('idcard');
              }}
            />
          )}

          {activeTab === 'staff-management' && currentRole === 'admin' && currentUser?.roleCode !== 'staff' && (
            <StaffManagementPanel
              currentUser={currentUser}
              activeSection={staffSection}
              onSectionChange={setStaffSection}
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
                initialRoomId={pendingChatRoomId}
                onSelectedRoomChange={setPendingChatRoomId}
                onOpenChatPage={(roomId) => {
                  if (roomId) setPendingChatRoomId(roomId);
                  setActiveTab('chat');
                }}
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
          onOpenChatPage={(roomId) => {
            setPendingChatRoomId(roomId || null);
            setActiveTab('chat');
          }}
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
        isAdminOrStaffMode={currentRole === 'admin'}
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
        onDeleteNotification={handleDeleteNotification}
        onDeleteAllNotifications={handleDeleteAllNotifications}
        onSelectAction={(tab) => setActiveTab(tab)}
        userRole={effectiveViewerRole}
      />

      <ClientInputModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        currentMitra={activeMitra}
        settings={settings}
        onOpenProfile={() => {
          setIsClientModalOpen(false);
          setIsProfileOpen(true);
        }}
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
        activeTab={settingsActiveTab}
        onTabChange={setSettingsActiveTab}
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
                Data diri, berkas verifikasi <strong>File KTP / NPWP (JPG, PNG, JPEG, atau PDF)</strong>, atau informasi rekening pencairan komisi Anda saat ini <strong>belum lengkap</strong>. Selama data diri dan unggahan berkas KTP/NPWP belum dilengkapi, Anda belum dapat melakukan <strong>penambahan klien</strong>, <strong>pembuatan surat penawaran</strong>, maupun <strong>menyalin dan membagikan tautan registrasi klien</strong>. Silakan lengkapi Data Diri &amp; unggah file KTP/NPWP Anda sekarang untuk mengaktifkan seluruh fitur kemitraan.
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
