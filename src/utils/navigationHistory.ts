export type ViewMode = 'landing' | 'portal' | 'auth' | 'client_register' | 'mitra_verify' | 'letter_verify';

export type PortalModalKey =
  | 'register'
  | 'profile'
  | 'notifications'
  | 'client-input'
  | 'services'
  | 'settings'
  | null;

export type OperationsSubTab =
  | 'client_validation'
  | 'commission_bonus'
  | 'mitra_analysis'
  | 'payout_management';

export type LogsSubTab = 'activity_logs' | 'email_logs';

export type CommissionsSubTab = 'referrals' | 'transactions' | 'payouts';

export type StaffSectionKey = 'staff_list' | 'add_staff' | 'admin_profile';

export type ProspectsSubTab = 'mitra_summary' | 'all_letters' | 'sph_requests';

export type SettingsTabKey = 'general' | 'forms' | 'environment' | 'mysql' | 'smtp' | 'oauth' | 'ai';

export interface AppHistoryState {
  ndNav: true;
  viewMode: ViewMode;
  authMode?: 'login' | 'register';
  activeTab: string;
  subTab?: string | null;
  activeMitraId?: string | null;
  chatRoomId?: string | null;
  modal?: PortalModalKey;
  settingsTab?: SettingsTabKey | null;
  clientRefCode?: string | null;
  verifyMemberCode?: string | null;
  verifyLetterCode?: string | null;
}

const VALID_MODAL_KEYS: Set<string> = new Set([
  'register',
  'profile',
  'notifications',
  'client-input',
  'services',
  'settings',
]);

const VALID_SETTINGS_TABS: Set<string> = new Set([
  'general',
  'forms',
  'environment',
  'mysql',
  'smtp',
  'oauth',
  'ai',
]);

export function isAppHistoryState(value: unknown): value is AppHistoryState {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as Partial<AppHistoryState>).ndNav === true &&
      typeof (value as Partial<AppHistoryState>).viewMode === 'string'
  );
}

export function serializeNavKey(state: AppHistoryState): string {
  const parts = [
    state.viewMode,
    state.viewMode === 'auth' ? state.authMode || 'login' : '',
    state.viewMode === 'portal' ? state.activeTab || 'dashboard' : '',
    state.viewMode === 'portal' ? state.subTab || '' : '',
    state.viewMode === 'portal' && state.activeTab === 'idcard' ? state.activeMitraId || '' : '',
    state.viewMode === 'portal' && state.activeTab === 'chat' ? state.chatRoomId || '' : '',
    state.modal || '',
    state.modal === 'settings' ? state.settingsTab || 'general' : '',
    state.viewMode === 'client_register' ? state.clientRefCode || '' : '',
    state.viewMode === 'mitra_verify' ? state.verifyMemberCode || '' : '',
    state.viewMode === 'letter_verify' ? state.verifyLetterCode || '' : '',
  ];
  return parts.join('|');
}

export function buildNavUrl(state: AppHistoryState): string {
  if (typeof window === 'undefined') return '/';
  const pathname = window.location.pathname || '/';

  if (state.viewMode === 'letter_verify') {
    const code = state.verifyLetterCode || new URLSearchParams(window.location.search).get('verify-surat') || '';
    return code ? `${pathname}?verify-surat=${encodeURIComponent(code)}` : `${pathname}#/verify-surat`;
  }

  if (state.viewMode === 'mitra_verify') {
    const code = state.verifyMemberCode || new URLSearchParams(window.location.search).get('verify') || '';
    return code ? `${pathname}?verify=${encodeURIComponent(code)}` : `${pathname}#/verify`;
  }

  if (state.viewMode === 'client_register') {
    const ref = state.clientRefCode || new URLSearchParams(window.location.search).get('ref') || '';
    return ref ? `${pathname}?ref=${encodeURIComponent(ref)}` : `${pathname}#/client-register`;
  }

  if (state.viewMode === 'landing') {
    const params = new URLSearchParams();
    if (state.modal === 'register') params.set('modal', 'register');
    const q = params.toString();
    return `${pathname}#/landing${q ? `?${q}` : ''}`;
  }

  if (state.viewMode === 'auth') {
    const mode = state.authMode === 'register' ? 'register' : 'login';
    const params = new URLSearchParams();
    if (state.modal === 'register') params.set('modal', 'register');
    const q = params.toString();
    return `${pathname}#/auth/${mode}${q ? `?${q}` : ''}`;
  }

  // Portal view
  const tab = state.activeTab || 'dashboard';
  const params = new URLSearchParams();
  if (state.subTab) params.set('sub', state.subTab);
  if (tab === 'idcard' && state.activeMitraId) params.set('mitra', state.activeMitraId);
  if (tab === 'chat' && state.chatRoomId) params.set('room', state.chatRoomId);
  if (state.modal) params.set('modal', state.modal);
  if (state.modal === 'settings' && state.settingsTab) params.set('stab', state.settingsTab);
  const q = params.toString();
  return `${pathname}#/portal/${encodeURIComponent(tab)}${q ? `?${q}` : ''}`;
}

export function parseHashToNavState(hash: string): Partial<AppHistoryState> | null {
  if (!hash || !hash.startsWith('#/')) return null;

  const withoutPrefix = hash.slice(2); // remove "#/"
  const [rawPath, rawQuery = ''] = withoutPrefix.split('?');
  const segments = rawPath.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const params = new URLSearchParams(rawQuery);
  const modalParam = params.get('modal');
  const modal: PortalModalKey = modalParam && VALID_MODAL_KEYS.has(modalParam)
    ? (modalParam as PortalModalKey)
    : null;
  const stabParam = params.get('stab');
  const settingsTab: SettingsTabKey | null =
    stabParam && VALID_SETTINGS_TABS.has(stabParam) ? (stabParam as SettingsTabKey) : null;

  const head = segments[0];
  if (head === 'landing') {
    return {
      ndNav: true,
      viewMode: 'landing',
      modal: modal === 'register' ? 'register' : null,
    };
  }

  if (head === 'auth') {
    return {
      ndNav: true,
      viewMode: 'auth',
      authMode: segments[1] === 'register' ? 'register' : 'login',
      modal: modal === 'register' ? 'register' : null,
    };
  }

  if (head === 'portal') {
    const tab = segments[1] || 'dashboard';
    return {
      ndNav: true,
      viewMode: 'portal',
      activeTab: tab,
      subTab: params.get('sub') || null,
      activeMitraId: params.get('mitra') || null,
      chatRoomId: params.get('room') || null,
      modal,
      settingsTab,
    };
  }

  if (head === 'client-register') {
    return {
      ndNav: true,
      viewMode: 'client_register',
      clientRefCode: params.get('ref') || null,
    };
  }

  if (head === 'verify') {
    return {
      ndNav: true,
      viewMode: 'mitra_verify',
      verifyMemberCode: params.get('code') || null,
    };
  }

  if (head === 'verify-surat') {
    return {
      ndNav: true,
      viewMode: 'letter_verify',
      verifyLetterCode: params.get('code') || null,
    };
  }

  return null;
}
