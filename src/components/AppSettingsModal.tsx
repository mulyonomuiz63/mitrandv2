import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
  Sparkles,
  Key,
  Globe,
  Sliders,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Percent,
  Check,
  Save,
  AlertTriangle,
  Lock,
  Send,
  Eye,
  EyeOff,
  Server,
  RefreshCw,
  Clock,
  FileText,
  CheckCheck,
  ExternalLink,
  Rocket,
  Wrench,
  Download,
  Upload,
  Database,
  Plus,
  Trash2,
  ListChecks
} from 'lucide-react';
import {
  AppSettings,
  EmailLogItem,
  Mitra,
  ClientDeal,
  SpecializationOptionItem,
  DynamicFormField,
  DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  DEFAULT_BANK_OPTIONS,
  DEFAULT_MITRA_FORM_FIELDS,
  DEFAULT_CLIENT_FORM_FIELDS,
  isBankFormField,
  getBankOptionUsageCount,
  resolveMitraFormFields,
  resolveClientFormFields,
  getSpecializationOptionUsageCount,
  getMitraFieldUsageCount,
  getClientFieldUsageCount,
  AuthUser,
  DEFAULT_STAFF_ALLOWED_MENUS,
} from '../types';
import { useConfirm } from './ConfirmDialogModal';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: AppSettings) => void;
  currentUser?: AuthUser | null;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  currentUser,
}) => {
  const confirm = useConfirm();
  const isStaff = currentUser?.roleCode === 'staff';
  const staffAllowedMenus =
    currentUser?.allowedMenus && currentUser.allowedMenus.length > 0
      ? currentUser.allowedMenus
      : DEFAULT_STAFF_ALLOWED_MENUS;
  const canAccessGeneralTab = !isStaff || staffAllowedMenus.includes('settings-general');
  const canAccessFormsTab = !isStaff || staffAllowedMenus.includes('settings-forms');
  const [settings, setSettings] = useState<AppSettings>({
    firmName: 'NDTAXANDLAW',
    tagline: 'Firma Konsultan Pajak & Kuasa Hukum Pengadilan Pajak Terakreditasi',
    supportPhone: '0812-8899-7711',
    supportEmail: 'advisory@ndtaxlaw.com',
    officeAddress: 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
    defaultCommissionRate: 15,
    allowClientSelfRegister: true,
    googleOAuthEnabled: false,
    googleClientId: '',
    geminiApiEnabled: true,
    geminiModel: 'gemini-3.8-flash',
    appEnvironment: 'production',
    
    // SMTP Email Defaults
    smtpEnabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpEncryption: 'tls',
    smtpUser: 'notifications@ndtaxlaw.com',
    smtpPassword: '••••••••••••••••',
    smtpSenderName: 'NDTAXANDLAW System',
    smtpSenderEmail: 'notifications@ndtaxlaw.com',
    smtpReplyToEmail: 'advisory@ndtaxlaw.com',
    emailOnRegistrationVerify: true,
    emailOnPayoutDisbursed: true,
    emailOnClientAcc: true,
    emailOnPasswordReset: true,
    emailOnRecurringInvoice: true,
    specializationEnabled: true,
    specializationLabel: DEFAULT_SPECIALIZATION_LABEL,
    specializationOptions: DEFAULT_SPECIALIZATION_OPTIONS,
    mitraCustomFields: DEFAULT_MITRA_FORM_FIELDS,
    clientCustomFields: DEFAULT_CLIENT_FORM_FIELDS,
    mitraFieldsInitialized: true,
    clientFieldsInitialized: true,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'forms' | 'environment' | 'supabase' | 'smtp' | 'oauth' | 'ai'>('forms');

  // Registered Mitras & Client Deals for Usage Protection Check
  const [registeredMitras, setRegisteredMitras] = useState<Mitra[]>([]);
  const [registeredClients, setRegisteredClients] = useState<ClientDeal[]>([]);

  // Dynamic Form Builder Local Inputs
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingSpecLabel, setEditingSpecLabel] = useState('');

  const [newMitraFieldLabel, setNewMitraFieldLabel] = useState('');
  const [newMitraFieldType, setNewMitraFieldType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [newMitraFieldPlaceholder, setNewMitraFieldPlaceholder] = useState('');
  const [newMitraFieldOptions, setNewMitraFieldOptions] = useState('');
  const [newMitraFieldRequired, setNewMitraFieldRequired] = useState(false);

  const [newBankOptionName, setNewBankOptionName] = useState('');
  const [newBankFieldLabel, setNewBankFieldLabel] = useState('');
  const [newBankFieldType, setNewBankFieldType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [newBankFieldPlaceholder, setNewBankFieldPlaceholder] = useState('');
  const [newBankFieldOptions, setNewBankFieldOptions] = useState('');
  const [newBankFieldRequired, setNewBankFieldRequired] = useState(false);

  const [editingMitraFieldId, setEditingMitraFieldId] = useState<string | null>(null);
  const [editMitraLabel, setEditMitraLabel] = useState('');
  const [editMitraType, setEditMitraType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [editMitraPlaceholder, setEditMitraPlaceholder] = useState('');
  const [editMitraOptions, setEditMitraOptions] = useState('');
  const [editMitraRequired, setEditMitraRequired] = useState(false);

  const [newClientFieldLabel, setNewClientFieldLabel] = useState('');
  const [newClientFieldType, setNewClientFieldType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [newClientFieldPlaceholder, setNewClientFieldPlaceholder] = useState('');
  const [newClientFieldOptions, setNewClientFieldOptions] = useState('');
  const [newClientFieldRequired, setNewClientFieldRequired] = useState(false);

  const [editingClientFieldId, setEditingClientFieldId] = useState<string | null>(null);
  const [editClientLabel, setEditClientLabel] = useState('');
  const [editClientType, setEditClientType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [editClientPlaceholder, setEditClientPlaceholder] = useState('');
  const [editClientOptions, setEditClientOptions] = useState('');
  const [editClientRequired, setEditClientRequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    success: boolean;
    message: string;
    url?: string;
    hasKey?: boolean;
    error?: string;
    appEnvironment?: 'development' | 'production';
    strictSupabaseOnly?: boolean;
    tableChecks?: Array<{
      table: string;
      label: string;
      exists: boolean;
      missingColumns: string[];
    }>;
    hasPendingMigration?: boolean;
    migrationSql?: string;
    fullSchemaSql?: string;
  } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlQueryMode, setSqlQueryMode] = useState<'migration' | 'full'>('migration');

  // Backup & Restore Database States
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [selectedBackupFileName, setSelectedBackupFileName] = useState<string | null>(null);
  const [parsedBackupPayload, setParsedBackupPayload] = useState<any | null>(null);
  const [backupRestoreFeedback, setBackupRestoreFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Test Email State
  const [testEmailTarget, setTestEmailTarget] = useState('mulyonoazza63@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'config' | 'logs'>('config');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/mitra').then((r) => r.json()).catch(() => null),
        fetch('/api/clients').then((r) => r.json()).catch(() => null),
      ])
        .then(([data, mitraRes, clientRes]) => {
          if (mitraRes?.success && Array.isArray(mitraRes.data)) {
            setRegisteredMitras(mitraRes.data);
          }
          if (clientRes?.success && Array.isArray(clientRes.data)) {
            setRegisteredClients(clientRes.data);
          }
          if (data.success && data.data) {
            setSettings({
              ...data.data,
              specializationEnabled: data.data.specializationEnabled ?? true,
              specializationLabel: data.data.specializationLabel || DEFAULT_SPECIALIZATION_LABEL,
              specializationOptions:
                Array.isArray(data.data.specializationOptions) && data.data.specializationOptions.length > 0
                  ? data.data.specializationOptions
                  : DEFAULT_SPECIALIZATION_OPTIONS,
              mitraCustomFields: resolveMitraFormFields(data.data),
              clientCustomFields: resolveClientFormFields(data.data),
              mitraFieldsInitialized: true,
              clientFieldsInitialized: true,
            });
            if (data.data.supportEmail) {
              setTestEmailTarget(data.data.supportEmail);
            }
          }
        })
        .catch((e) => console.error('Error fetching settings:', e))
        .finally(() => setLoading(false));

      if (!isStaff) {
        fetchEmailLogs();
        checkSupabase();
      } else {
        if (canAccessFormsTab) {
          setActiveTab('forms');
        } else if (canAccessGeneralTab) {
          setActiveTab('general');
        }
      }
    }
  }, [isOpen, isStaff, canAccessFormsTab, canAccessGeneralTab]);

  const checkSupabase = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/system/supabase-status');
      const data = await res.json();
      if (data.success && data.data) {
        setSupabaseStatus(data.data);
      }
    } catch (err: any) {
      setSupabaseStatus({
        isConfigured: false,
        success: false,
        message: 'Gagal menghubungi endpoint status Supabase di backend server.',
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const syncDataToSupabase = async () => {
    const ok = await confirm({
      title: 'Konfirmasi Sinkronisasi Data Awal (Development)',
      message: 'Apakah Anda yakin ingin menyinkronkan data sampel awal ke database Supabase?',
      confirmText: 'Ya, Sinkronkan Data',
      cancelText: 'Batalkan',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncingSupabase(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/system/supabase-sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        checkSupabase();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: 'Gagal mengirim permintaan sinkronisasi ke server.',
      });
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleDownloadBackup = async () => {
    const ok = await confirm({
      title: 'Download Backup Database Supabase (.JSON)',
      message: 'Apakah Anda yakin ingin mengunduh file backup seluruh tabel database Supabase saat ini?',
      confirmText: 'Ya, Download Backup',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsDownloadingBackup(true);
    setBackupRestoreFeedback(null);
    try {
      const res = await fetch('/api/system/database-backup');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunduh data backup dari Supabase.');
      }
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `supabase-backup-${(settings.firmName || 'ndtaxandlaw').toLowerCase().replace(/\s+/g, '-')}-${dateStr}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupRestoreFeedback({
        success: true,
        message: `Backup Database Supabase "${fileName}" berhasil diunduh (${data.counts?.mitras ?? 0} mitra, ${data.counts?.client_deals ?? data.counts?.clientDeals ?? 0} klien/deal, ${data.counts?.commissions ?? 0} komisi).`,
      });
    } catch (err: any) {
      setBackupRestoreFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan saat mengunduh backup dari Supabase.',
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBackupRestoreFeedback(null);
    if (!file) return;
    setSelectedBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const payloadData = parsed?.tables || parsed?.data || parsed;
        if (!payloadData || typeof payloadData !== 'object') {
          throw new Error('Struktur file backup Supabase tidak dikenali.');
        }
        setParsedBackupPayload(parsed);
      } catch (err: any) {
        setParsedBackupPayload(null);
        setBackupRestoreFeedback({
          success: false,
          message: `File "${file.name}" bukan file backup Supabase yang valid.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackupPayload) return;
    const isReplace = restoreMode === 'replace';
    const ok = await confirm({
      title: isReplace ? 'Konfirmasi Timpa Penuh (Replace) Database Supabase' : 'Konfirmasi Gabungkan (Merge) Database Supabase',
      message: isReplace
        ? 'PERINGATAN: Seluruh data di tabel Supabase saat ini akan dihapus dan digantikan penuh dengan isi file backup. Apakah Anda yakin ingin melanjutkan?'
        : 'Data dari file backup akan digabungkan (upsert) ke tabel Supabase tanpa menghapus data lain yang sudah ada. Lanjutkan proses restore?',
      detail: `File Backup: ${selectedBackupFileName || 'backup.json'}\nMode Restore: ${isReplace ? 'Timpa Penuh (Replace All)' : 'Gabungkan Aman (Merge / Upsert)'}`,
      confirmText: isReplace ? 'Ya, Timpa & Restore Database' : 'Ya, Gabungkan & Restore',
      cancelText: 'Batalkan',
      variant: isReplace ? 'danger' : 'warning',
    });
    if (!ok) return;

    setIsRestoringBackup(true);
    setBackupRestoreFeedback(null);
    try {
      const res = await fetch('/api/system/database-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData: parsedBackupPayload,
          mode: restoreMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memulihkan database.');
      }
      setBackupRestoreFeedback({
        success: true,
        message: data.message,
      });
      if (data.settings) {
        setSettings(data.settings);
        if (onSettingsSaved) onSettingsSaved(data.settings);
      }
      checkSupabase();
      fetchEmailLogs();
    } catch (err: any) {
      setBackupRestoreFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan saat melakukan restore database.',
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const defaultMigrationSql = `-- ====================================================================
-- QUERY UPDATE TABEL & KOLOM BARU SUPABASE NDTAXANDLAW
-- Aman dijalankan berulang kali (CREATE TABLE IF NOT EXISTS & ADD COLUMN IF NOT EXISTS)
-- ====================================================================

-- 1. Tambah Kolom Baru pada Tabel Existing (Jika Belum Ada)
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TEXT;

ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "billingDayOfMonth" INTEGER;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "nextBillingDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "lastBilledDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "isBillingDue" BOOLEAN DEFAULT false;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminatedAt" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminationReason" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectedAt" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE public.user_passwords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Buat Tabel Pengaturan Sistem (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'config_primary',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat Tabel Manajemen Role Dinamis (system_roles)
CREATE TABLE IF NOT EXISTS public.system_roles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "portalView" TEXT DEFAULT 'mitra',
    "defaultTab" TEXT DEFAULT 'idcard',
    "allowedTabs" JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    "isSystem" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buat Tabel Log Aktivitas Audit (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actionType" TEXT NOT NULL,
    operation TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Buat Tabel Log Pengiriman Email SMTP (email_logs)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    "smtpResponse" TEXT,
    timestamp TEXT NOT NULL,
    "previewSnippet" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Aktifkan RLS & Kebijakan Akses API
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Anon Access app_settings" ON public.app_settings;
CREATE POLICY "Public Anon Access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access system_roles" ON public.system_roles;
CREATE POLICY "Public Anon Access system_roles" ON public.system_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access activity_logs" ON public.activity_logs;
CREATE POLICY "Public Anon Access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access email_logs" ON public.email_logs;
CREATE POLICY "Public Anon Access email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);`;

  const getDisplayedSqlQuery = () => {
    if (sqlQueryMode === 'migration') {
      return supabaseStatus?.migrationSql || defaultMigrationSql;
    }
    return supabaseStatus?.fullSchemaSql || defaultMigrationSql;
  };

  const copySqlSchema = (customSql?: string) => {
    const sqlText = customSql || getDisplayedSqlQuery();
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const fetchEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/emails/logs');
      const data = await res.json();
      if (data.success && data.data) {
        setEmailLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Konfirmasi Simpan Pengaturan Sistem',
      message: 'Apakah Anda yakin ingin menyimpan seluruh perubahan pengaturan aplikasi, profil firma, dan integrasi ke database?',
      detail: `Nama Firma: ${settings.firmName}\nHotline: ${settings.supportPhone}\nMode Sistem: ${settings.appEnvironment === 'production' ? 'Production (Murni Supabase)' : 'Development'}`,
      confirmText: 'Ya, Simpan Pengaturan',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
        if (onSettingsSaved) onSettingsSaved(data.data);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTarget || !testEmailTarget.includes('@')) {
      setTestResult({ success: false, message: 'Masukkan alamat email tujuan yang valid.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: testEmailTarget, smtpConfig: settings }),
      });
      const data = await res.json();
      fetchEmailLogs();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.message || 'Gagal mengirim email tes.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Terjadi kesalahan saat menghubungkan ke server SMTP.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const applyPreset = (preset: 'gmail' | 'hostinger' | 'niagahoster_tls' | 'microsoft') => {
    if (preset === 'gmail') {
      setSettings((prev) => ({
        ...prev,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpEncryption: 'tls',
      }));
    } else if (preset === 'hostinger') {
      setSettings((prev) => ({
        ...prev,
        smtpHost: prev.smtpHost && !prev.smtpHost.includes('gmail') ? prev.smtpHost : 'mail.domainanda.com',
        smtpPort: 465,
        smtpEncryption: 'ssl',
      }));
    } else if (preset === 'niagahoster_tls') {
      setSettings((prev) => ({
        ...prev,
        smtpHost: prev.smtpHost && !prev.smtpHost.includes('gmail') ? prev.smtpHost : 'mail.domainanda.com',
        smtpPort: 587,
        smtpEncryption: 'tls',
      }));
    } else if (preset === 'microsoft') {
      setSettings((prev) => ({
        ...prev,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpEncryption: 'tls',
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded">
                KONFIGURASI SISTEM
              </span>
              <span className="text-xs text-slate-400">
                Panel Kontrol Layanan NDTAXANDLAW
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              <span>Pengaturan Aplikasi &amp; Integrasi</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto shrink-0">
          {canAccessGeneralTab && (
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Layanan &amp; Profil Firma</span>
            </button>
          )}

          {canAccessFormsTab && (
            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'forms'
                  ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
              <span>Form &amp; Spesialisasi Dinamis</span>
            </button>
          )}

          {!isStaff && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('environment')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'environment'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Rocket className="w-3.5 h-3.5 text-blue-600" />
                <span>Mode Sistem (Dev / Prod)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  settings.appEnvironment === 'production' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {settings.appEnvironment === 'production' ? 'PROD' : 'DEV'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('supabase');
                  checkSupabase();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'supabase'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>Database Supabase</span>
                {supabaseStatus?.success ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smtp')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'smtp'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>SMTP Email &amp; Notifikasi</span>
                {settings.smtpEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('oauth')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'oauth'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Login Google (OAuth)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'ai'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gemini AI Assistant</span>
              </button>
            </>
          )}
        </div>

        {/* Form Container with Sticky Footer */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan aplikasi &amp; server SMTP berhasil disimpan serta diterapkan ke seluruh sistem!</span>
            </div>
          )}

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Firma / Aplikasi
                  </label>
                  <input
                    type="text"
                    value={settings.firmName}
                    onChange={(e) => setSettings({ ...settings, firmName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp Hotline Layanan
                  </label>
                  <input
                    type="text"
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Kontak Dukungan
                  </label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Komisi Mitra Default (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.defaultCommissionRate}
                    onChange={(e) => setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Kantor Resmi
                  </label>
                  <input
                    type="text"
                    value={settings.officeAddress}
                    onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowClientSelfRegister}
                      onChange={(e) => setSettings({ ...settings, allowClientSelfRegister: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        Izinkan Registrasi Mandiri Klien via Tautan Referral Mitra
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Klien dapat langsung mendaftar secara mandiri melalui tautan referral yang dibagikan mitra dan langsung terikat di sistem.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: DYNAMIC FORMS & SPECIALIZATION MANAGEMENT */}
          {activeTab === 'forms' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Info Aturan Proteksi Hapus Data */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-950">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900">
                    Manajemen Input Default &amp; Dinamis + Proteksi Data Terpakai
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Seluruh input <strong>Default (Bawaan)</strong> maupun <strong>Input Tambahan</strong> untuk Pendaftaran Mitra dan Data Klien ditampilkan di bawah ini. Admin dapat <strong>mengedit</strong> label/opsi, <strong>menonaktifkan (mengurangi)</strong> dari form, atau <strong>menghapus</strong> input tersebut. <strong>Aturan Keamanan:</strong> Jika suatu input atau pilihan spesialisasi <strong>sudah digunakan oleh Mitra/Klien yang terdaftar</strong>, maka input tersebut <strong>terkunci dari penghapusan</strong> (hanya dapat diedit atau dinonaktifkan). Input hanya dapat dihapus jika <strong>belum digunakan (0 data)</strong>.
                  </p>
                </div>
              </div>

              {/* Section A: Manajemen Bidang Keahlian / Spesialisasi Mitra */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                        1. Pilihan Spesialisasi / Keahlian Mitra
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Manajemen Pilihan Bidang Keahlian / Profesi Mitra
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Kelola daftar pilihan pada dropdown <strong>"{settings.specializationLabel || DEFAULT_SPECIALIZATION_LABEL}"</strong>. Pilihan default maupun tambahan dapat diedit, dinonaktifkan, atau dihapus (selama belum ada Mitra yang terdaftar dengan pilihan tersebut).
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={settings.specializationEnabled !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updatedMitraFields = resolveMitraFormFields(settings).map((f) =>
                          f.systemKey === 'specialization' ? { ...f, isActive: checked } : f
                        );
                        setSettings({
                          ...settings,
                          specializationEnabled: checked,
                          mitraCustomFields: updatedMitraFields,
                          mitraFieldsInitialized: true,
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      {settings.specializationEnabled !== false ? 'Input Aktif' : 'Input Nonaktif'}
                    </span>
                  </label>
                </div>

                {settings.specializationEnabled !== false && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Label Input pada Form Pendaftaran &amp; Profil Mitra
                        </label>
                        <input
                          type="text"
                          value={settings.specializationLabel || DEFAULT_SPECIALIZATION_LABEL}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedMitraFields = resolveMitraFormFields(settings).map((f) =>
                              f.systemKey === 'specialization' ? { ...f, label: val } : f
                            );
                            setSettings({
                              ...settings,
                              specializationLabel: val,
                              mitraCustomFields: updatedMitraFields,
                              mitraFieldsInitialized: true,
                            });
                          }}
                          placeholder="Contoh: Bidang Keahlian / Profesi Mitra"
                          className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const current = settings.specializationOptions || [];
                          const missingDefaults = DEFAULT_SPECIALIZATION_OPTIONS.filter(
                            (def) =>
                              !current.some(
                                (c) =>
                                  c.id === def.id ||
                                  c.label.toLowerCase() === def.label.toLowerCase()
                              )
                          );
                          if (missingDefaults.length === 0) return;
                          setSettings({
                            ...settings,
                            specializationOptions: [...current, ...missingDefaults],
                          });
                        }}
                        className="px-3 py-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shrink-0"
                      >
                        ↺ Pulihkan Pilihan Default
                      </button>
                    </div>

                    {/* Add New Specialization Option */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newSpecLabel}
                        onChange={(e) => setNewSpecLabel(e.target.value)}
                        placeholder="Tambah pilihan bidang keahlian / spesialisasi baru..."
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newSpecLabel.trim();
                          if (!trimmed) return;
                          const currentList =
                            settings.specializationOptions || DEFAULT_SPECIALIZATION_OPTIONS;
                          const newItem: SpecializationOptionItem = {
                            id: `spec-${Date.now()}`,
                            label: trimmed,
                            isActive: true,
                          };
                          setSettings({
                            ...settings,
                            specializationOptions: [...currentList, newItem],
                          });
                          setNewSpecLabel('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pilihan</span>
                      </button>
                    </div>

                    {/* List of Specialization Options */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(settings.specializationOptions || DEFAULT_SPECIALIZATION_OPTIONS).map(
                        (opt) => {
                          const usageCount = getSpecializationOptionUsageCount(
                            opt.label,
                            registeredMitras
                          );
                          const isDefaultOpt = DEFAULT_SPECIALIZATION_OPTIONS.some(
                            (d) => d.id === opt.id
                          );
                          const isEditing = editingSpecId === opt.id;

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg border text-xs transition-all ${
                                opt.isActive
                                  ? 'bg-white border-slate-200 text-slate-900'
                                  : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}
                            >
                              {isEditing ? (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingSpecLabel}
                                    onChange={(e) => setEditingSpecLabel(e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 text-xs font-semibold border border-blue-400 rounded-lg outline-none"
                                  />
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const trimmed = editingSpecLabel.trim();
                                        if (!trimmed) return;
                                        const updated = (
                                          settings.specializationOptions ||
                                          DEFAULT_SPECIALIZATION_OPTIONS
                                        ).map((item) =>
                                          item.id === opt.id ? { ...item, label: trimmed } : item
                                        );
                                        setSettings({ ...settings, specializationOptions: updated });
                                        setEditingSpecId(null);
                                      }}
                                      className="px-3 py-1 bg-blue-700 text-white font-bold rounded-md text-[11px]"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSpecId(null)}
                                      className="px-2.5 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md text-[11px]"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`font-semibold ${
                                        !opt.isActive ? 'line-through text-slate-400' : ''
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                        isDefaultOpt
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                                      }`}
                                    >
                                      {isDefaultOpt ? 'Default' : 'Tambahan'}
                                    </span>
                                    {usageCount > 0 ? (
                                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" />
                                        Digunakan {usageCount} Mitra
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Belum Digunakan (0 Mitra)
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSpecId(opt.id);
                                        setEditingSpecLabel(opt.label);
                                      }}
                                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (
                                          settings.specializationOptions ||
                                          DEFAULT_SPECIALIZATION_OPTIONS
                                        ).map((item) =>
                                          item.id === opt.id
                                            ? { ...item, isActive: !item.isActive }
                                            : item
                                        );
                                        setSettings({ ...settings, specializationOptions: updated });
                                      }}
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                        opt.isActive
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      }`}
                                    >
                                      {opt.isActive ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (usageCount > 0) {
                                          await confirm({
                                            title: 'Tidak Dapat Menghapus Pilihan yang Sudah Digunakan',
                                            message: `Pilihan "${opt.label}" tidak dapat dihapus karena sudah digunakan oleh ${usageCount} Mitra yang terdaftar.`,
                                            detail:
                                              'Solusi: Anda tetap dapat mengedit nama pilihan ini atau menonaktifkannya (klik tombol Aktif/Nonaktif) agar tidak muncul pada pendaftaran baru.',
                                            confirmText: 'Mengerti',
                                            cancelText: 'Tutup',
                                            variant: 'warning',
                                          });
                                          return;
                                        }
                                        const ok = await confirm({
                                          title: 'Hapus Pilihan Bidang Keahlian',
                                          message: `Apakah Anda yakin ingin menghapus pilihan "${opt.label}"? Pilihan ini belum digunakan oleh Mitra mana pun (0 Mitra).`,
                                          confirmText: 'Ya, Hapus Pilihan',
                                          cancelText: 'Batalkan',
                                          variant: 'danger',
                                        });
                                        if (!ok) return;
                                        const updated = (
                                          settings.specializationOptions ||
                                          DEFAULT_SPECIALIZATION_OPTIONS
                                        ).filter((item) => item.id !== opt.id);
                                        setSettings({ ...settings, specializationOptions: updated });
                                      }}
                                      className={`p-1.5 rounded border transition-colors ${
                                        usageCount > 0
                                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                          : 'bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                                      }`}
                                      title={
                                        usageCount > 0
                                          ? `Terkunci: Sudah digunakan oleh ${usageCount} Mitra`
                                          : 'Hapus pilihan (Belum digunakan)'
                                      }
                                    >
                                      {usageCount > 0 ? (
                                        <Lock className="w-3.5 h-3.5" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section B: Field Input Data Diri Pendaftaran Mitra (Default & Tambahan) */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-800 border border-blue-200">
                        2. Inputan Data Diri Pendaftaran Mitra (Default &amp; Dinamis)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Kelola Field Input Data Diri Mitra
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Semua field input <strong>Data Diri Default Bawaan</strong> (Nama Lengkap, Email, No. WhatsApp, NIK, Bidang Keahlian) maupun <strong>Input Tambahan Data Diri</strong> ditampilkan di bawah ini. Anda dapat mengedit, menonaktifkan/mengurangi, atau menghapus field yang belum digunakan oleh Mitra terdaftar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const current = resolveMitraFormFields(settings);
                      const profileDefaults = DEFAULT_MITRA_FORM_FIELDS.filter((def) => !isBankFormField(def));
                      const missingDefaults = profileDefaults.filter(
                        (def) => !current.some((c) => c.id === def.id || c.systemKey === def.systemKey)
                      );
                      if (missingDefaults.length === 0) return;
                      setSettings({
                        ...settings,
                        mitraCustomFields: [...missingDefaults, ...current],
                        mitraFieldsInitialized: true,
                      });
                    }}
                    className="px-3 py-2 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shrink-0"
                  >
                    ↺ Pulihkan Input Default Data Diri
                  </button>
                </div>

                {/* Add Mitra Profile Custom Field Form */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800">
                    + Tambah Field Input Data Diri Mitra Baru
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Field / Label Input
                      </label>
                      <input
                        type="text"
                        value={newMitraFieldLabel}
                        onChange={(e) => setNewMitraFieldLabel(e.target.value)}
                        placeholder="Contoh: Nomor NPWP / Kota Domisili"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tipe Input
                      </label>
                      <select
                        value={newMitraFieldType}
                        onChange={(e: any) => setNewMitraFieldType(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="text">Teks Singkat (Text)</option>
                        <option value="number">Angka / Nomor (Number)</option>
                        <option value="select">Pilihan Dropdown (Select)</option>
                        <option value="textarea">Catatan Panjang (Textarea)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Placeholder / Petunjuk
                      </label>
                      <input
                        type="text"
                        value={newMitraFieldPlaceholder}
                        onChange={(e) => setNewMitraFieldPlaceholder(e.target.value)}
                        placeholder="Contoh: Masukkan 15/16 digit NPWP"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {newMitraFieldType === 'select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Pilihan Dropdown (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={newMitraFieldOptions}
                        onChange={(e) => setNewMitraFieldOptions(e.target.value)}
                        placeholder="Contoh: Perorangan, Firma Hukum, Kantor Akuntan Publik"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newMitraFieldRequired}
                        onChange={(e) => setNewMitraFieldRequired(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Wajib diisi oleh Mitra saat mendaftar</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const label = newMitraFieldLabel.trim();
                        if (!label) return;
                        const newField: DynamicFormField = {
                          id: `mfield-${Date.now()}`,
                          isDefault: false,
                          section: 'profile',
                          label,
                          type: newMitraFieldType,
                          placeholder: newMitraFieldPlaceholder.trim() || `Isi ${label}`,
                          options:
                            newMitraFieldType === 'select'
                              ? newMitraFieldOptions
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : undefined,
                          required: newMitraFieldRequired,
                          isActive: true,
                        };
                        setSettings({
                          ...settings,
                          mitraCustomFields: [...resolveMitraFormFields(settings), newField],
                          mitraFieldsInitialized: true,
                        });
                        setNewMitraFieldLabel('');
                        setNewMitraFieldPlaceholder('');
                        setNewMitraFieldOptions('');
                        setNewMitraFieldRequired(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Input Data Diri</span>
                    </button>
                  </div>
                </div>

                {/* Mitra Profile Fields List (Default + Custom) */}
                <div className="space-y-2">
                  {resolveMitraFormFields(settings)
                    .filter((f) => !isBankFormField(f))
                    .map((field) => {
                      const usageCount = getMitraFieldUsageCount(field, registeredMitras);
                      const isDefaultField = Boolean(field.isDefault || field.systemKey);
                      const isEditing = editingMitraFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            field.isActive
                              ? 'bg-white border-slate-200 text-slate-900'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Nama Label Input
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraLabel}
                                    onChange={(e) => setEditMitraLabel(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-blue-400 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Tipe Input
                                  </label>
                                  <select
                                    value={editMitraType}
                                    disabled={isDefaultField}
                                    onChange={(e: any) => setEditMitraType(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                  >
                                    <option value="text">Teks Singkat (Text)</option>
                                    <option value="number">Angka / Nomor (Number)</option>
                                    <option value="select">Pilihan Dropdown (Select)</option>
                                    <option value="textarea">Catatan Panjang (Textarea)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Placeholder / Petunjuk
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraPlaceholder}
                                    onChange={(e) => setEditMitraPlaceholder(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              {editMitraType === 'select' && field.systemKey !== 'specialization' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Opsi Dropdown (Pisahkan dengan koma)
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraOptions}
                                    onChange={(e) => setEditMitraOptions(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editMitraRequired}
                                    onChange={(e) => setEditMitraRequired(e.target.checked)}
                                    className="rounded text-blue-600"
                                  />
                                  <span>Wajib diisi (Required)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = editMitraLabel.trim();
                                      if (!trimmed) return;
                                      const updated = resolveMitraFormFields(settings).map((f) =>
                                        f.id === field.id
                                          ? {
                                              ...f,
                                              label: trimmed,
                                              type: isDefaultField ? f.type : editMitraType,
                                              placeholder: editMitraPlaceholder.trim(),
                                              required: editMitraRequired,
                                              options:
                                                editMitraType === 'select' &&
                                                f.systemKey !== 'specialization'
                                                  ? editMitraOptions
                                                      .split(',')
                                                      .map((s) => s.trim())
                                                      .filter(Boolean)
                                                  : f.options,
                                            }
                                          : f
                                      );
                                      setSettings({
                                        ...settings,
                                        specializationLabel:
                                          field.systemKey === 'specialization'
                                            ? trimmed
                                            : settings.specializationLabel,
                                        mitraCustomFields: updated,
                                        mitraFieldsInitialized: true,
                                      });
                                      setEditingMitraFieldId(null);
                                    }}
                                    className="px-3 py-1 bg-blue-700 text-white font-bold rounded-md text-[11px]"
                                  >
                                    Simpan Perubahan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMitraFieldId(null)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md text-[11px]"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`font-bold text-xs ${
                                      !field.isActive ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}
                                  >
                                    {field.label}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                      isDefaultField
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                    }`}
                                  >
                                    {isDefaultField ? 'Default Bawaan' : 'Input Tambahan'}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 uppercase font-mono">
                                    {field.type}
                                  </span>
                                  {field.required ? (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                      Wajib
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
                                      Opsional
                                    </span>
                                  )}
                                  {usageCount > 0 ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      Digunakan {usageCount} Mitra (Tidak Dapat Dihapus)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Belum Digunakan (0 Mitra • Dapat Dihapus)
                                    </span>
                                  )}
                                </div>
                                {field.placeholder && (
                                  <p className="text-[11px] text-slate-500">
                                    Placeholder: "{field.placeholder}"
                                  </p>
                                )}
                                {field.systemKey === 'specialization' ? (
                                  <p className="text-[11px] text-indigo-600 font-medium">
                                    Opsi diambil otomatis dari daftar "Pilihan Spesialisasi / Keahlian Mitra" di atas.
                                  </p>
                                ) : (
                                  field.options &&
                                  field.options.length > 0 && (
                                    <p className="text-[11px] text-slate-500">
                                      Opsi: {field.options.join(', ')}
                                    </p>
                                  )
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMitraFieldId(field.id);
                                    setEditMitraLabel(field.label);
                                    setEditMitraType(field.type);
                                    setEditMitraPlaceholder(field.placeholder || '');
                                    setEditMitraOptions((field.options || []).join(', '));
                                    setEditMitraRequired(field.required);
                                  }}
                                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextActive = !field.isActive;
                                    const updated = resolveMitraFormFields(settings).map((f) =>
                                      f.id === field.id ? { ...f, isActive: nextActive } : f
                                    );
                                    setSettings({
                                      ...settings,
                                      specializationEnabled:
                                        field.systemKey === 'specialization'
                                          ? nextActive
                                          : settings.specializationEnabled,
                                      mitraCustomFields: updated,
                                      mitraFieldsInitialized: true,
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                    field.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {field.isActive ? 'Aktif' : 'Nonaktif'}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (usageCount > 0) {
                                      await confirm({
                                        title: 'Input Tidak Dapat Dihapus (Sudah Digunakan)',
                                        message: `Input "${field.label}" tidak dapat dihapus karena sudah ada ${usageCount} Mitra terdaftar yang menggunakan data input ini.`,
                                        detail:
                                          'Sesuai aturan integritas data: Input yang sudah pernah diisi oleh Mitra tidak boleh dihapus. Anda tetap dapat mengedit nama label/pengaturannya atau menonaktifkannya (klik tombol Aktif/Nonaktif) jika tidak ingin ditampilkan lagi di form pendaftaran baru.',
                                        confirmText: 'Mengerti',
                                        cancelText: 'Tutup',
                                        variant: 'warning',
                                      });
                                      return;
                                    }
                                    const ok = await confirm({
                                      title: 'Konfirmasi Hapus Field Input Mitra',
                                      message: `Apakah Anda yakin ingin menghapus field "${field.label}" dari form pendaftaran Mitra? (Field ini belum digunakan oleh Mitra mana pun).`,
                                      confirmText: 'Ya, Hapus Field',
                                      cancelText: 'Batalkan',
                                      variant: 'danger',
                                    });
                                    if (!ok) return;
                                    const updated = resolveMitraFormFields(settings).filter(
                                      (f) => f.id !== field.id
                                    );
                                    setSettings({
                                      ...settings,
                                      specializationEnabled:
                                        field.systemKey === 'specialization'
                                          ? false
                                          : settings.specializationEnabled,
                                      mitraCustomFields: updated,
                                      mitraFieldsInitialized: true,
                                    });
                                  }}
                                  className={`p-1.5 rounded border transition-colors ${
                                    usageCount > 0
                                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                      : 'bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                                  }`}
                                  title={
                                    usageCount > 0
                                      ? `Terkunci: Sudah digunakan oleh ${usageCount} Mitra`
                                      : 'Hapus input (Belum digunakan)'
                                  }
                                >
                                  {usageCount > 0 ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Section B.2: Manajemen Inputan Data Rekening Pencairan Komisi Mitra (Default & Dinamis) */}
              <div className="p-4 sm:p-5 bg-amber-50/40 border border-amber-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-900 border border-amber-300">
                        3. Inputan Data Rekening Komisi Mitra (Default &amp; Dinamis)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Kelola Field &amp; Pilihan Bank Rekening Pencairan Komisi Mitra
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Kelola seluruh input pada bagian <strong>Data Rekening Pencairan Komisi Mitra</strong> secara dinamis: Anda dapat <strong>menambah/mengurangi pilihan Nama Bank</strong>, <strong>menambah field rekening baru</strong> (misal: Cabang Bank/KCP, Kode Swift/BI-FAST, Nomor E-Wallet Cadangan, NPWP Rekening), maupun <strong>mengedit, mengurangi (menonaktifkan), atau menghapus</strong> field rekening bawaan selama belum digunakan oleh Mitra terdaftar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const current = resolveMitraFormFields(settings);
                      const bankDefaults = DEFAULT_MITRA_FORM_FIELDS.filter((def) => isBankFormField(def));
                      const missingDefaults = bankDefaults.filter(
                        (def) => !current.some((c) => c.id === def.id || c.systemKey === def.systemKey)
                      );
                      if (missingDefaults.length === 0) return;
                      setSettings({
                        ...settings,
                        mitraCustomFields: [...current, ...missingDefaults],
                        mitraFieldsInitialized: true,
                      });
                    }}
                    className="px-3 py-2 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shrink-0"
                  >
                    ↺ Pulihkan Input Default Rekening
                  </button>
                </div>

                {/* Quick Manager for Daftar Pilihan Nama Bank */}
                {(() => {
                  const allFields = resolveMitraFormFields(settings);
                  const bankNameField = allFields.find((f) => f.systemKey === 'bankName');
                  const currentBankOptions =
                    bankNameField?.options && bankNameField.options.length > 0
                      ? bankNameField.options
                      : DEFAULT_BANK_OPTIONS;

                  if (!bankNameField) return null;

                  return (
                    <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Daftar Pilihan Nama Bank Pencairan Komisi ({currentBankOptions.length} Bank)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Tambah bank baru atau kurangi/hapus bank dari dropdown <strong>"{bankNameField.label}"</strong>. Bank yang sudah dipilih oleh Mitra terdaftar terkunci dari penghapusan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const missingBanks = DEFAULT_BANK_OPTIONS.filter(
                              (defBank) =>
                                !currentBankOptions.some(
                                  (b) => b.toLowerCase() === defBank.toLowerCase()
                                )
                            );
                            if (missingBanks.length === 0) return;
                            const nextOpts = [...currentBankOptions, ...missingBanks];
                            const updated = allFields.map((f) =>
                              f.systemKey === 'bankName' ? { ...f, options: nextOpts } : f
                            );
                            setSettings({
                              ...settings,
                              mitraCustomFields: updated,
                              mitraFieldsInitialized: true,
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shrink-0"
                        >
                          ↺ Pulihkan Pilihan Bank Default
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newBankOptionName}
                          onChange={(e) => setNewBankOptionName(e.target.value)}
                          placeholder="Tambah pilihan Nama Bank / E-Wallet baru (Contoh: Bank Permata, Bank Danamon, SeaBank)..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newBankOptionName.trim();
                            if (!trimmed) return;
                            if (
                              currentBankOptions.some(
                                (b) => b.toLowerCase() === trimmed.toLowerCase()
                              )
                            ) {
                              setNewBankOptionName('');
                              return;
                            }
                            const nextOpts = [...currentBankOptions, trimmed];
                            const updated = allFields.map((f) =>
                              f.systemKey === 'bankName' ? { ...f, options: nextOpts } : f
                            );
                            setSettings({
                              ...settings,
                              mitraCustomFields: updated,
                              mitraFieldsInitialized: true,
                            });
                            setNewBankOptionName('');
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Bank</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {currentBankOptions.map((bankOpt) => {
                          const bankUsage = getBankOptionUsageCount(bankOpt, registeredMitras);
                          return (
                            <div
                              key={bankOpt}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                            >
                              <span className="font-semibold">{bankOpt}</span>
                              {bankUsage > 0 ? (
                                <span
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 flex items-center gap-0.5"
                                  title={`Digunakan oleh ${bankUsage} Mitra`}
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  {bankUsage}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                                  0 Mitra
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (bankUsage > 0) {
                                    await confirm({
                                      title: 'Pilihan Bank Tidak Dapat Dihapus (Sudah Digunakan)',
                                      message: `Bank "${bankOpt}" tidak dapat dihapus karena sedang digunakan sebagai rekening pencairan komisi oleh ${bankUsage} Mitra terdaftar.`,
                                      confirmText: 'Mengerti',
                                      cancelText: 'Tutup',
                                      variant: 'warning',
                                    });
                                    return;
                                  }
                                  if (currentBankOptions.length <= 1) {
                                    await confirm({
                                      title: 'Minimal 1 Pilihan Bank',
                                      message: 'Daftar pilihan bank harus menyisakan minimal 1 bank aktif.',
                                      confirmText: 'Mengerti',
                                      cancelText: 'Tutup',
                                      variant: 'warning',
                                    });
                                    return;
                                  }
                                  const nextOpts = currentBankOptions.filter((b) => b !== bankOpt);
                                  const updated = allFields.map((f) =>
                                    f.systemKey === 'bankName' ? { ...f, options: nextOpts } : f
                                  );
                                  setSettings({
                                    ...settings,
                                    mitraCustomFields: updated,
                                    mitraFieldsInitialized: true,
                                  });
                                }}
                                className={`p-0.5 rounded transition-colors ${
                                  bankUsage > 0
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  bankUsage > 0
                                    ? `Terkunci: Digunakan ${bankUsage} Mitra`
                                    : `Hapus/kurangi ${bankOpt}`
                                }
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Add New Bank Custom Field Form */}
                <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800">
                    + Tambah Field Input Data Rekening Komisi Baru
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Field / Label Input Rekening
                      </label>
                      <input
                        type="text"
                        value={newBankFieldLabel}
                        onChange={(e) => setNewBankFieldLabel(e.target.value)}
                        placeholder="Contoh: Cabang Bank (KCP) / Kode Swift"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tipe Input
                      </label>
                      <select
                        value={newBankFieldType}
                        onChange={(e: any) => setNewBankFieldType(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="text">Teks Singkat (Text)</option>
                        <option value="number">Angka / Nomor (Number)</option>
                        <option value="select">Pilihan Dropdown (Select)</option>
                        <option value="textarea">Catatan Panjang (Textarea)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Placeholder / Petunjuk
                      </label>
                      <input
                        type="text"
                        value={newBankFieldPlaceholder}
                        onChange={(e) => setNewBankFieldPlaceholder(e.target.value)}
                        placeholder="Contoh: KCP Sudirman Jakarta"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {newBankFieldType === 'select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Pilihan Dropdown Rekening (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={newBankFieldOptions}
                        onChange={(e) => setNewBankFieldOptions(e.target.value)}
                        placeholder="Contoh: Rekening Pribadi, Rekening Perusahaan / Firma"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newBankFieldRequired}
                        onChange={(e) => setNewBankFieldRequired(e.target.checked)}
                        className="rounded text-amber-600"
                      />
                      <span>Wajib diisi pada bagian Data Rekening Komisi</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const label = newBankFieldLabel.trim();
                        if (!label) return;
                        const newField: DynamicFormField = {
                          id: `mbank-${Date.now()}`,
                          isDefault: false,
                          section: 'bank',
                          label,
                          type: newBankFieldType,
                          placeholder: newBankFieldPlaceholder.trim() || `Isi ${label}`,
                          options:
                            newBankFieldType === 'select'
                              ? newBankFieldOptions
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : undefined,
                          required: newBankFieldRequired,
                          isActive: true,
                        };
                        setSettings({
                          ...settings,
                          mitraCustomFields: [...resolveMitraFormFields(settings), newField],
                          mitraFieldsInitialized: true,
                        });
                        setNewBankFieldLabel('');
                        setNewBankFieldPlaceholder('');
                        setNewBankFieldOptions('');
                        setNewBankFieldRequired(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Input Rekening</span>
                    </button>
                  </div>
                </div>

                {/* All Bank Account Fields List (Default + Custom Bank Fields) */}
                <div className="space-y-2">
                  {resolveMitraFormFields(settings)
                    .filter((f) => isBankFormField(f))
                    .map((field) => {
                      const usageCount = getMitraFieldUsageCount(field, registeredMitras);
                      const isDefaultField = Boolean(field.isDefault || field.systemKey);
                      const isEditing = editingMitraFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            field.isActive
                              ? 'bg-white border-amber-200 text-slate-900'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Nama Label Input Rekening
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraLabel}
                                    onChange={(e) => setEditMitraLabel(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-amber-400 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Tipe Input
                                  </label>
                                  <select
                                    value={editMitraType}
                                    disabled={isDefaultField}
                                    onChange={(e: any) => setEditMitraType(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                  >
                                    <option value="text">Teks Singkat (Text)</option>
                                    <option value="number">Angka / Nomor (Number)</option>
                                    <option value="select">Pilihan Dropdown (Select)</option>
                                    <option value="textarea">Catatan Panjang (Textarea)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Placeholder / Petunjuk
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraPlaceholder}
                                    onChange={(e) => setEditMitraPlaceholder(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              {editMitraType === 'select' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Opsi Dropdown (Pisahkan dengan koma)
                                  </label>
                                  <input
                                    type="text"
                                    value={editMitraOptions}
                                    onChange={(e) => setEditMitraOptions(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editMitraRequired}
                                    onChange={(e) => setEditMitraRequired(e.target.checked)}
                                    className="rounded text-amber-600"
                                  />
                                  <span>Wajib diisi (Required)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = editMitraLabel.trim();
                                      if (!trimmed) return;
                                      const updated = resolveMitraFormFields(settings).map((f) =>
                                        f.id === field.id
                                          ? {
                                              ...f,
                                              label: trimmed,
                                              type: isDefaultField ? f.type : editMitraType,
                                              placeholder: editMitraPlaceholder.trim(),
                                              required: editMitraRequired,
                                              options:
                                                editMitraType === 'select'
                                                  ? editMitraOptions
                                                      .split(',')
                                                      .map((s) => s.trim())
                                                      .filter(Boolean)
                                                  : f.options,
                                            }
                                          : f
                                      );
                                      setSettings({
                                        ...settings,
                                        mitraCustomFields: updated,
                                        mitraFieldsInitialized: true,
                                      });
                                      setEditingMitraFieldId(null);
                                    }}
                                    className="px-3 py-1 bg-amber-700 text-white font-bold rounded-md text-[11px]"
                                  >
                                    Simpan Perubahan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMitraFieldId(null)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md text-[11px]"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`font-bold text-xs ${
                                      !field.isActive ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}
                                  >
                                    {field.label}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                      isDefaultField
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                    }`}
                                  >
                                    {isDefaultField ? 'Default Rekening' : 'Rekening Tambahan'}
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 uppercase font-mono">
                                    {field.type}
                                  </span>
                                  {field.required ? (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                      Wajib
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
                                      Opsional
                                    </span>
                                  )}
                                  {usageCount > 0 ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      Digunakan {usageCount} Mitra (Tidak Dapat Dihapus)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Belum Digunakan (0 Mitra • Dapat Dihapus)
                                    </span>
                                  )}
                                </div>
                                {field.placeholder && (
                                  <p className="text-[11px] text-slate-500">
                                    Placeholder: "{field.placeholder}"
                                  </p>
                                )}
                                {field.options && field.options.length > 0 && (
                                  <p className="text-[11px] text-slate-500">
                                    Opsi: {field.options.join(', ')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMitraFieldId(field.id);
                                    setEditMitraLabel(field.label);
                                    setEditMitraType(field.type);
                                    setEditMitraPlaceholder(field.placeholder || '');
                                    setEditMitraOptions((field.options || []).join(', '));
                                    setEditMitraRequired(field.required);
                                  }}
                                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextActive = !field.isActive;
                                    const updated = resolveMitraFormFields(settings).map((f) =>
                                      f.id === field.id ? { ...f, isActive: nextActive } : f
                                    );
                                    setSettings({
                                      ...settings,
                                      mitraCustomFields: updated,
                                      mitraFieldsInitialized: true,
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                    field.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {field.isActive ? 'Aktif' : 'Nonaktif'}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (usageCount > 0) {
                                      await confirm({
                                        title: 'Input Rekening Tidak Dapat Dihapus (Sudah Digunakan)',
                                        message: `Input "${field.label}" tidak dapat dihapus karena sudah ada ${usageCount} Mitra terdaftar yang menggunakan data rekening ini.`,
                                        detail:
                                          'Anda tetap dapat mengedit nama label/pengaturannya atau menonaktifkannya (klik tombol Aktif/Nonaktif) untuk mengurangi field dari form pendaftaran baru.',
                                        confirmText: 'Mengerti',
                                        cancelText: 'Tutup',
                                        variant: 'warning',
                                      });
                                      return;
                                    }
                                    const ok = await confirm({
                                      title: 'Konfirmasi Hapus Field Rekening Komisi',
                                      message: `Apakah Anda yakin ingin menghapus field "${field.label}" dari bagian Data Rekening Komisi Mitra? (Field ini belum digunakan oleh Mitra mana pun).`,
                                      confirmText: 'Ya, Hapus Field',
                                      cancelText: 'Batalkan',
                                      variant: 'danger',
                                    });
                                    if (!ok) return;
                                    const updated = resolveMitraFormFields(settings).filter(
                                      (f) => f.id !== field.id
                                    );
                                    setSettings({
                                      ...settings,
                                      mitraCustomFields: updated,
                                      mitraFieldsInitialized: true,
                                    });
                                  }}
                                  className={`p-1.5 rounded border transition-colors ${
                                    usageCount > 0
                                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                      : 'bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                                  }`}
                                  title={
                                    usageCount > 0
                                      ? `Terkunci: Sudah digunakan oleh ${usageCount} Mitra`
                                      : 'Hapus input rekening (Belum digunakan)'
                                  }
                                >
                                  {usageCount > 0 ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Section C: Seluruh Field Input Data Klien (Default & Tambahan) */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        4. Seluruh Inputan Data Klien (Default &amp; Dinamis)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Kelola Field Input Data Klien
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Semua field input Klien <strong>Default Bawaan</strong> (Nama Perusahaan, Nama PIC, No. WhatsApp PIC, Email PIC, Catatan) maupun <strong>Input Tambahan</strong> ditampilkan di bawah ini. Field yang sudah digunakan oleh data Klien tidak dapat dihapus, namun dapat diedit atau dinonaktifkan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const current = resolveClientFormFields(settings);
                      const missingDefaults = DEFAULT_CLIENT_FORM_FIELDS.filter(
                        (def) => !current.some((c) => c.id === def.id || c.systemKey === def.systemKey)
                      );
                      if (missingDefaults.length === 0) return;
                      setSettings({
                        ...settings,
                        clientCustomFields: [...missingDefaults, ...current],
                        clientFieldsInitialized: true,
                      });
                    }}
                    className="px-3 py-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shrink-0"
                  >
                    ↺ Pulihkan Input Default Klien
                  </button>
                </div>

                {/* Add Client Custom Field Form */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800">
                    + Tambah Field Input Data Klien Baru
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Field / Label Input Klien
                      </label>
                      <input
                        type="text"
                        value={newClientFieldLabel}
                        onChange={(e) => setNewClientFieldLabel(e.target.value)}
                        placeholder="Contoh: NPWP Badan / KPP Terdaftar"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tipe Input
                      </label>
                      <select
                        value={newClientFieldType}
                        onChange={(e: any) => setNewClientFieldType(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="text">Teks Singkat (Text)</option>
                        <option value="number">Angka / Nomor (Number)</option>
                        <option value="select">Pilihan Dropdown (Select)</option>
                        <option value="textarea">Catatan Panjang (Textarea)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Placeholder / Petunjuk
                      </label>
                      <input
                        type="text"
                        value={newClientFieldPlaceholder}
                        onChange={(e) => setNewClientFieldPlaceholder(e.target.value)}
                        placeholder="Contoh: KPP Pratama Jakarta Setiabudi"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {newClientFieldType === 'select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Pilihan Dropdown (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={newClientFieldOptions}
                        onChange={(e) => setNewClientFieldOptions(e.target.value)}
                        placeholder="Contoh: PKP, Non-PKP, UMKM Final"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newClientFieldRequired}
                        onChange={(e) => setNewClientFieldRequired(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Wajib diisi saat input data klien</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const label = newClientFieldLabel.trim();
                        if (!label) return;
                        const newField: DynamicFormField = {
                          id: `cfield-${Date.now()}`,
                          isDefault: false,
                          label,
                          type: newClientFieldType,
                          placeholder: newClientFieldPlaceholder.trim() || `Isi ${label}`,
                          options:
                            newClientFieldType === 'select'
                              ? newClientFieldOptions
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : undefined,
                          required: newClientFieldRequired,
                          isActive: true,
                        };
                        setSettings({
                          ...settings,
                          clientCustomFields: [...resolveClientFormFields(settings), newField],
                          clientFieldsInitialized: true,
                        });
                        setNewClientFieldLabel('');
                        setNewClientFieldPlaceholder('');
                        setNewClientFieldOptions('');
                        setNewClientFieldRequired(false);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Input Klien</span>
                    </button>
                  </div>
                </div>

                {/* All Client Fields List (Default + Custom) */}
                <div className="space-y-2">
                  {resolveClientFormFields(settings).map((field) => {
                    const usageCount = getClientFieldUsageCount(field, registeredClients);
                    const isDefaultField = Boolean(field.isDefault || field.systemKey);
                    const isEditing = editingClientFieldId === field.id;

                    return (
                      <div
                        key={field.id}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          field.isActive
                            ? 'bg-white border-slate-200 text-slate-900'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Nama Label Input Klien
                                </label>
                                <input
                                  type="text"
                                  value={editClientLabel}
                                  onChange={(e) => setEditClientLabel(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-blue-400 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Tipe Input
                                </label>
                                <select
                                  value={editClientType}
                                  disabled={isDefaultField}
                                  onChange={(e: any) => setEditClientType(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                >
                                  <option value="text">Teks Singkat (Text)</option>
                                  <option value="number">Angka / Nomor (Number)</option>
                                  <option value="select">Pilihan Dropdown (Select)</option>
                                  <option value="textarea">Catatan Panjang (Textarea)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Placeholder / Petunjuk
                                </label>
                                <input
                                  type="text"
                                  value={editClientPlaceholder}
                                  onChange={(e) => setEditClientPlaceholder(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                />
                              </div>
                            </div>

                            {editClientType === 'select' && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Opsi Dropdown (Pisahkan dengan koma)
                                </label>
                                <input
                                  type="text"
                                  value={editClientOptions}
                                  onChange={(e) => setEditClientOptions(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editClientRequired}
                                  onChange={(e) => setEditClientRequired(e.target.checked)}
                                  className="rounded text-blue-600"
                                />
                                <span>Wajib diisi (Required)</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trimmed = editClientLabel.trim();
                                    if (!trimmed) return;
                                    const updated = resolveClientFormFields(settings).map((f) =>
                                      f.id === field.id
                                        ? {
                                            ...f,
                                            label: trimmed,
                                            type: isDefaultField ? f.type : editClientType,
                                            placeholder: editClientPlaceholder.trim(),
                                            required: editClientRequired,
                                            options:
                                              editClientType === 'select'
                                                ? editClientOptions
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean)
                                                : f.options,
                                          }
                                        : f
                                    );
                                    setSettings({
                                      ...settings,
                                      clientCustomFields: updated,
                                      clientFieldsInitialized: true,
                                    });
                                    setEditingClientFieldId(null);
                                  }}
                                  className="px-3 py-1 bg-emerald-700 text-white font-bold rounded-md text-[11px]"
                                >
                                  Simpan Perubahan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingClientFieldId(null)}
                                  className="px-2.5 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md text-[11px]"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`font-bold text-xs ${
                                    !field.isActive ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {field.label}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                    isDefaultField
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}
                                >
                                  {isDefaultField ? 'Default Bawaan' : 'Input Tambahan'}
                                </span>
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 uppercase font-mono">
                                  {field.type}
                                </span>
                                {field.required ? (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                    Wajib
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
                                    Opsional
                                  </span>
                                )}
                                {usageCount > 0 ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    Digunakan {usageCount} Klien (Tidak Dapat Dihapus)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Belum Digunakan (0 Klien • Dapat Dihapus)
                                  </span>
                                )}
                              </div>
                              {field.placeholder && (
                                <p className="text-[11px] text-slate-500">
                                  Placeholder: "{field.placeholder}"
                                </p>
                              )}
                              {field.options && field.options.length > 0 && (
                                <p className="text-[11px] text-slate-500">
                                  Opsi: {field.options.join(', ')}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClientFieldId(field.id);
                                  setEditClientLabel(field.label);
                                  setEditClientType(field.type);
                                  setEditClientPlaceholder(field.placeholder || '');
                                  setEditClientOptions((field.options || []).join(', '));
                                  setEditClientRequired(field.required);
                                }}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = resolveClientFormFields(settings).map((f) =>
                                    f.id === field.id ? { ...f, isActive: !f.isActive } : f
                                  );
                                  setSettings({
                                    ...settings,
                                    clientCustomFields: updated,
                                    clientFieldsInitialized: true,
                                  });
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                  field.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {field.isActive ? 'Aktif' : 'Nonaktif'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (usageCount > 0) {
                                    await confirm({
                                      title: 'Input Klien Tidak Dapat Dihapus (Sudah Digunakan)',
                                      message: `Input "${field.label}" tidak dapat dihapus karena sudah ada ${usageCount} data Klien terdaftar yang menggunakan input ini.`,
                                      detail:
                                        'Sesuai aturan integritas data: Input yang sudah pernah diisi pada data Klien tidak boleh dihapus. Anda tetap dapat mengedit nama label/pengaturannya atau menonaktifkannya jika tidak ingin ditampilkan lagi pada form input klien baru.',
                                      confirmText: 'Mengerti',
                                      cancelText: 'Tutup',
                                      variant: 'warning',
                                    });
                                    return;
                                  }
                                  const ok = await confirm({
                                    title: 'Konfirmasi Hapus Field Input Klien',
                                    message: `Apakah Anda yakin ingin menghapus field "${field.label}" dari form input Klien? (Field ini belum digunakan oleh data Klien mana pun).`,
                                    confirmText: 'Ya, Hapus Field',
                                    cancelText: 'Batalkan',
                                    variant: 'danger',
                                  });
                                  if (!ok) return;
                                  const updated = resolveClientFormFields(settings).filter(
                                    (f) => f.id !== field.id
                                  );
                                  setSettings({
                                    ...settings,
                                    clientCustomFields: updated,
                                    clientFieldsInitialized: true,
                                  });
                                }}
                                className={`p-1.5 rounded border transition-colors ${
                                  usageCount > 0
                                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                                }`}
                                title={
                                  usageCount > 0
                                    ? `Terkunci: Sudah digunakan oleh ${usageCount} Klien`
                                    : 'Hapus input (Belum digunakan)'
                                }
                              >
                                {usageCount > 0 ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODE LINGKUNGAN (DEVELOPMENT VS PRODUCTION) */}
          {activeTab === 'environment' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl border border-blue-800 shadow-xs flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-white/20 text-blue-200">
                      Sistem Operasional
                    </span>
                    <span className="text-xs text-blue-300 font-mono">
                      Status Saat Ini: <strong className="text-white uppercase">{settings.appEnvironment}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Konfigurasi Mode Lingkungan Aplikasi (Dev vs Prod)
                  </h3>
                  <p className="text-xs text-blue-200/90 mt-1 leading-relaxed">
                    Atur perilaku sistem saat dalam fase pengujian lokal (Development) vs saat sudah di-upload ke server hosting (Production).
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  {settings.appEnvironment === 'production' ? (
                    <Rocket className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Wrench className="w-6 h-6 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. DEVELOPMENT MODE */}
                <div
                  onClick={() => setSettings({ ...settings, appEnvironment: 'development' })}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer relative ${
                    settings.appEnvironment === 'development'
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Mode Development</h4>
                        <span className="text-[10px] font-semibold text-amber-700 uppercase">Uji Coba &amp; Debugging</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      settings.appEnvironment === 'development'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-300'
                    }`}>
                      {settings.appEnvironment === 'development' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Dirancang untuk pengembang dan admin saat menguji alur sistem tanpa hambatan login berulang.
                  </p>

                  <div className="space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Tombol Switch [Mitra | Admin]</strong> tampil di navbar atas untuk inspeksi cepat.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Pilihan Akun Demo 1-Klik</strong> tampil di halaman login untuk masuk cepat.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Pilihan Ganti Mitra</strong> di sub-header aktif untuk simulasi profil berbeda.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Password bypass uji coba (<code>mitraND2026!</code>) dapat digunakan.</span>
                    </div>
                  </div>
                </div>

                {/* 2. PRODUCTION MODE */}
                <div
                  onClick={() => setSettings({ ...settings, appEnvironment: 'production' })}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer relative ${
                    settings.appEnvironment === 'production'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                        <Rocket className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Mode Production</h4>
                        <span className="text-[10px] font-semibold text-blue-700 uppercase">Live Hosting &amp; Publik</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      settings.appEnvironment === 'production'
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-300'
                    }`}>
                      {settings.appEnvironment === 'production' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Dirancang saat aplikasi sudah di-deploy ke hosting publik (seperti Hostinger VPS/Cloud) untuk penggunaan riil.
                  </p>

                  <div className="space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Hanya Terkoneksi Database Supabase</strong>: Tidak memakai data dummy atau cache file lokal. Data yang dihapus di Supabase langsung hilang saat di-refresh.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Enkripsi Password Kuat (SCRYPT + AES-256-GCM)</strong>: Seluruh kata sandi user tersimpan terenkripsi kuat (<code>ndenc$v2</code>).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Sistem Role Dinamis</strong>: Mendukung pemisahan hak akses ketat (saat ini aktif: <code>admin</code> &amp; <code>mitra</code>, siap ditambah role baru).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Tombol Switch &amp; Akun Demo Disembunyikan</strong>: Pengguna wajib login riil sesuai role masing-masing.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hostinger / VPS Configuration Note */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Server className="w-4 h-4 text-blue-700" />
                  <span>Pengaturan Otomatis di Hostinger / Cloud VPS (.env)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Selain memilih mode melalui panel ini, Anda juga dapat mengunci mode production secara permanen pada server Hostinger Anda dengan menambahkan variabel di file <code>.env</code>:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto select-all">
                  NODE_ENV=production<br />
                  APP_ENV=production
                </div>
                <p className="text-[11px] text-slate-500">
                  Saat server Node.js dijalankan di Hostinger dengan variabel tersebut, sistem secara otomatis mengunci seluruh portal ke dalam Mode Production tanpa konfigurasi ulang.
                </p>
              </div>
            </div>
          )}

          {/* TAB: DATABASE SUPABASE INTEGRATION & SETUP */}
          {activeTab === 'supabase' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-xl border border-emerald-800/60 shadow-xs flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Cloud Database PostgreSQL
                    </span>
                    <span className="text-xs text-emerald-300 font-mono">
                      Supabase Integration Hub
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Koneksi &amp; Skema Database Supabase
                  </h3>
                  <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed max-w-xl">
                    Hubungkan NDTAXANDLAW ke database PostgreSQL cloud Supabase agar seluruh data kemitraan, klien, deal, dan pencairan komisi tersimpan permanen dan scalable.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Status Koneksi Card */}
              <div className={`p-4 rounded-xl border ${
                supabaseStatus?.success
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-300 text-amber-950'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      supabaseStatus?.success
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {supabaseStatus?.success ? (
                        <CheckCheck className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold">
                          {supabaseStatus?.success
                            ? 'Supabase Terhubung & Siap Digunakan'
                            : (supabaseStatus?.isConfigured ? 'Kredensial Ada, Menunggu Tabel SQL' : 'Kredensial Supabase Belum Terpasang')}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          supabaseStatus?.success
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {supabaseStatus?.success ? 'ONLINE' : 'PERLU SETUP'}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-700 leading-relaxed">
                        {supabaseStatus?.message || 'Memeriksa status koneksi ke endpoint Supabase...'}
                      </p>
                      {supabaseStatus?.url && (
                        <p className="text-[11px] font-mono text-slate-600 mt-1">
                          Endpoint: <strong>{supabaseStatus.url}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={checkSupabase}
                      disabled={isCheckingSupabase}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
                      <span>{isCheckingSupabase ? 'Menguji...' : 'Tes Koneksi'}</span>
                    </button>

                    {supabaseStatus?.success && settings.appEnvironment === 'development' && !supabaseStatus?.strictSupabaseOnly && (
                      <button
                        type="button"
                        onClick={syncDataToSupabase}
                        disabled={isSyncingSupabase}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                        <span>{isSyncingSupabase ? 'Menyinkronkan...' : 'Sinkronkan Data Awal'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {syncResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs border ${
                    syncResult.success 
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {syncResult.message}
                  </div>
                )}
              </div>

              {/* BACKUP & RESTORE DATABASE SUPABASE (PRODUCTION) */}
              <div className="p-5 bg-white border-2 border-blue-600/25 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Backup &amp; Restore Database Supabase (Production)
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                        MURNI DATA SUPABASE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Mengambil langsung seluruh isi tabel dari <strong>Database Production Supabase</strong> Anda (tanpa mencampur data lokal/dummy) ke dalam 1 file cadangan, serta memulihkan kembali langsung ke tabel-tabel di Supabase.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isDownloadingBackup || !supabaseStatus?.success}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingBackup ? 'Mengambil dari Supabase...' : 'Backup Database Supabase'}</span>
                  </button>
                </div>

                {/* Restore Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="md:col-span-7 space-y-2">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-700" />
                      <span>Restore Data ke Tabel Supabase</span>
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pilih file hasil backup Supabase Anda, tentukan mode pemulihan, lalu klik <strong>Restore ke Supabase</strong> untuk mengembalikan seluruh baris tabel ke database Supabase.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="text-blue-700"
                        />
                        <span>Gabungkan / Update ke Supabase (Merge)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="text-amber-600"
                        />
                        <span>Timpa Penuh Tabel Supabase (Full Replace)</span>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col gap-2">
                    <label className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="truncate">
                        {selectedBackupFileName || 'Pilih File Backup Supabase...'}
                      </span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleSelectRestoreFile}
                        className="hidden"
                      />
                    </label>

                    {parsedBackupPayload && (
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-950 space-y-1">
                        <p className="font-bold">
                          Isi File Backup Supabase ({parsedBackupPayload.createdAt ? new Date(parsedBackupPayload.createdAt).toLocaleString('id-ID') : 'Siap Restore'}):
                        </p>
                        <p className="text-[10px] text-blue-800">
                          {(parsedBackupPayload.tables?.mitras || parsedBackupPayload.data?.mitras || []).length} Mitra ·{' '}
                          {(parsedBackupPayload.tables?.client_deals || parsedBackupPayload.data?.clientDeals || []).length} Klien/Deal ·{' '}
                          {(parsedBackupPayload.tables?.commissions || parsedBackupPayload.data?.commissions || []).length} Komisi ·{' '}
                          {(parsedBackupPayload.tables?.services || parsedBackupPayload.data?.services || []).length} Layanan
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={!parsedBackupPayload || isRestoringBackup || !supabaseStatus?.success}
                      className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRestoringBackup ? 'animate-spin' : ''}`} />
                      <span>{isRestoringBackup ? 'Memulihkan ke Supabase...' : 'Restore ke Supabase'}</span>
                    </button>
                  </div>
                </div>

                {backupRestoreFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                      backupRestoreFeedback.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {backupRestoreFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span>{backupRestoreFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* PUSAT QUERY SQL UPDATE TABEL & KOLOM BARU (COPY-PASTE KE SUPABASE) */}
              <div className="p-5 bg-white border-2 border-emerald-600/30 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Pusat Query SQL Update Tabel &amp; Kolom Baru (Copy-Paste ke Supabase)
                      </h4>
                      {supabaseStatus?.hasPendingMigration ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                          ADA UPDATE TABEL / KOLOM
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                          SKEMA TERBARU SIAP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Setiap kali ada pembaruan aplikasi yang menambah <strong>tabel baru</strong> atau <strong>kolom baru</strong>, sistem otomatis menyusun query SQL di bawah ini. Anda cukup klik <strong>Copy Query SQL</strong> lalu jalankan (<strong>RUN</strong>) di SQL Editor Supabase.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copySqlSchema()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedSql ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      <span>{copiedSql ? 'Query Tersalin!' : 'Copy Query SQL'}</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/wopbuflusryycanyfqop/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka SQL Editor</span>
                    </a>
                  </div>
                </div>

                {/* Status 12 Tabel & Kolom di Supabase Anda */}
                {supabaseStatus?.tableChecks && supabaseStatus.tableChecks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Status Deteksi 12 Tabel &amp; Kolom di Database Supabase Anda:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {supabaseStatus.tableChecks.filter((t) => t.exists).length} dari {supabaseStatus.tableChecks.length} tabel sudah dibuat
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {supabaseStatus.tableChecks.map((tbl) => (
                        <div
                          key={tbl.table}
                          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                            tbl.exists && tbl.missingColumns.length === 0
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                              : 'bg-amber-50/60 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-[11px] truncate">public.{tbl.table}</p>
                            <p className="text-[10px] text-slate-600 truncate">{tbl.label}</p>
                            {tbl.missingColumns.length > 0 && (
                              <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                                + Kolom baru: {tbl.missingColumns.join(', ')}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase ${
                              tbl.exists && tbl.missingColumns.length === 0
                                ? 'bg-emerald-200 text-emerald-900'
                                : tbl.exists
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {tbl.exists && tbl.missingColumns.length === 0
                              ? 'AKTIF'
                              : tbl.exists
                              ? 'KURANG KOLOM'
                              : 'BELUM ADA'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pilihan Mode Query: Update Tabel/Kolom Baru vs Skema Lengkap */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSqlQueryMode('migration')}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          sqlQueryMode === 'migration'
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Query Update / Tambah Tabel &amp; Kolom Baru
                      </button>
                      <button
                        type="button"
                        onClick={() => setSqlQueryMode('full')}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          sqlQueryMode === 'full'
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Skrip Lengkap 12 Tabel (Full Schema)
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Aman dijalankan berulang kali (IF NOT EXISTS)
                    </span>
                  </div>

                  <div className="relative">
                    <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                      {getDisplayedSqlQuery()}
                    </pre>
                  </div>
                </div>
              </div>

              {/* PANDUAN 3 LANGKAH MENGHUBUNGKAN SUPABASE */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  <span>Panduan Praktis Menghubungkan Supabase ke Hosting / Production</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
                        1
                      </span>
                      <p className="font-bold text-slate-900">Jalankan Skrip SQL di Supabase</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Buka dashboard Supabase project Anda &rarr; klik menu <strong>SQL Editor</strong> di kiri &rarr; tempelkan skrip tabel &rarr; klik <strong>RUN</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySqlSchema()}
                      className="mt-2 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL Tabel'}</span>
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
                        2
                      </span>
                      <p className="font-bold text-slate-900">Ambil URL &amp; API Key</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Di dashboard Supabase, klik menu <strong>Project Settings</strong> (ikon gerigi) &rarr; pilih <strong>API</strong>. Salin <strong>Project URL</strong> dan <strong>anon/public Key</strong> (atau <em>service_role</em>).
                      </p>
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Supabase Dashboard</span>
                    </a>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs mb-2">
                        3
                      </span>
                      <p className="font-bold text-slate-900">Pasang di File .env Hosting</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Di cPanel / Hostinger VPS / file manager server Anda, buka file <code>.env</code> dan masukkan 2 baris variabel Supabase Anda.
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-1 rounded text-center">
                      Auto-connect saat server start
                    </span>
                  </div>
                </div>

                {/* Environment Template Preview */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-800">
                      Contoh Format Variabel di file <code>.env</code> Hosting / VPS:
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Ditaruh di root folder server</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto select-all leading-relaxed">
                    <span className="text-slate-400"># 1. URL Project Supabase Anda</span><br />
                    SUPABASE_URL="https://xxxxxxxxxxxxxxxx.supabase.co"<br /><br />
                    <span className="text-slate-400"># 2. Key Supabase (anon public atau service_role)</span><br />
                    SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."<br /><br />
                    <span className="text-slate-400"># 3. Kunci ke mode production</span><br />
                    APP_ENV="production"<br />
                    NODE_ENV="production"
                  </div>
                </div>

                {/* Download SQL File Note */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">File Skrip SQL Lengkap Sudah Tersedia di Repository</p>
                    <p className="mt-0.5 text-blue-800 text-[11px] leading-relaxed">
                      File <strong>supabase_schema.sql</strong> telah kami buatkan langsung di dalam root folder proyek. Anda dapat membukanya langsung, menyalin seluruh isinya, dan menempelkannya di menu <em>SQL Editor</em> Supabase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMTP EMAIL & NOTIFICATIONS */}
          {activeTab === 'smtp' && (
            <div className="space-y-5">
              
              {/* Sub-navigation: Config vs Sent Logs */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubView('config')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeSubView === 'config'
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Konfigurasi Server &amp; Pemicu
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubView('logs')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      activeSubView === 'logs'
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Riwayat Email Terkirim</span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-mono">
                      {emailLogs.length}
                    </span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 hidden sm:block">
                  Protokol SMTP Transaksional
                </div>
              </div>

              {activeSubView === 'config' ? (
                <>
                  {/* Master SMTP Toggle Card */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-700" />
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                          Server SMTP Email Transaksional
                        </h4>
                        {settings.smtpEnabled ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                            AKTIF
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                            NON-AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Digunakan untuk mengirim verifikasi email pendaftaran akun, bukti pencairan komisi, notifikasi validasi ACC klien, dan instruksi keamanan.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.smtpEnabled}
                        onChange={(e) => setSettings({ ...settings, smtpEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('hostinger')}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md border border-blue-200 transition-colors"
                    >
                      Niagahoster / cPanel (SSL 465)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('niagahoster_tls')}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md border border-blue-200 transition-colors"
                    >
                      Niagahoster / cPanel (TLS 587)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('gmail')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors"
                    >
                      Google Mail (TLS 587)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('microsoft')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors"
                    >
                      Microsoft 365 / Outlook
                    </button>
                  </div>

                  {/* Server Connection Form */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Parameter Koneksi &amp; Kredensial SMTP
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SMTP Host / Server
                        </label>
                        <input
                          type="text"
                          value={settings.smtpHost}
                          onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                          placeholder="smtp.gmail.com atau mail.ndtaxlaw.com"
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={settings.smtpPort}
                          onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Enkripsi Keamanan
                        </label>
                        <select
                          value={settings.smtpEncryption}
                          onChange={(e) => setSettings({ ...settings, smtpEncryption: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white font-medium"
                        >
                          <option value="tls">TLS / STARTTLS (Port 587)</option>
                          <option value="ssl">SSL / SMTPS (Port 465)</option>
                          <option value="none">Tanpa Enkripsi (Port 25)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SMTP Username / Email Akun
                        </label>
                        <input
                          type="text"
                          value={settings.smtpUser}
                          onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                          placeholder="notifications@ndtaxlaw.com"
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          SMTP Password / App Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={settings.smtpPassword || ''}
                            onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                            placeholder="Kata sandi aplikasi SMTP"
                            className="w-full pl-3 pr-8 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Pengirim (Sender Name)
                        </label>
                        <input
                          type="text"
                          value={settings.smtpSenderName}
                          onChange={(e) => setSettings({ ...settings, smtpSenderName: e.target.value })}
                          placeholder="NDTAXANDLAW System"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Pengirim (Sender From Address)
                        </label>
                        <input
                          type="email"
                          value={settings.smtpSenderEmail}
                          onChange={(e) => setSettings({ ...settings, smtpSenderEmail: e.target.value })}
                          placeholder="notifications@ndtaxlaw.com"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automated Trigger Toggles (Exact requested user cases) */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Aktivasi Notifikasi Email Otomatis (Triggers)
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Pilih peristiwa transaksi yang otomatis memicu pengiriman email konfirmasi ke mitra maupun tim operasional:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. Verifikasi Email Akun Daftar */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnRegistrationVerify}
                          onChange={(e) => setSettings({ ...settings, emailOnRegistrationVerify: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            ✉️ Verifikasi Email Akun Daftar Baru
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Kirimkan link verifikasi dan pengumuman kode referral resmi otomatis saat mitra selesai registrasi.
                          </span>
                        </div>
                      </label>

                      {/* 2. Informasi Pencairan Komisi */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnPayoutDisbursed}
                          onChange={(e) => setSettings({ ...settings, emailOnPayoutDisbursed: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            💸 Informasi Pencairan Komisi Mitra
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Kirimkan rincian transfer bank, potongan pajak PPh 21, dan slip pencairan resmi setelah di-ACC finance.
                          </span>
                        </div>
                      </label>

                      {/* 3. Validasi Keberhasilan Client (ACC) */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnClientAcc}
                          onChange={(e) => setSettings({ ...settings, emailOnClientAcc: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            🤝 Validasi Keberhasilan Client (Deal ACC)
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Notifikasi instan ke mitra saat klien referral berhasil di-ACC admin dan komisi telah dikreditkan ke saldo.
                          </span>
                        </div>
                      </label>

                      {/* 4. Reset & Keamanan Password */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnPasswordReset}
                          onChange={(e) => setSettings({ ...settings, emailOnPasswordReset: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            🔑 Reset Password &amp; Keamanan Akun
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Kirimkan kode OTP atau tautan pemulihan kata sandi saat pengguna memilih lupa password.
                          </span>
                        </div>
                      </label>

                      {/* 5. Tagihan Retainer Bulanan / Tahunan */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={settings.emailOnRecurringInvoice}
                          onChange={(e) => setSettings({ ...settings, emailOnRecurringInvoice: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            📑 Konfirmasi Siklus Pembayaran Langganan (Bulanan &amp; Tahunan)
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Pemberitahuan royalti berulang ke mitra saat klien langganan berhasil memperpanjang masa kontrak perikatan.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Interactive Test Email Dispatcher */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-700" />
                        Uji Coba Pengiriman Email (Live SMTP Test)
                      </h5>
                      <span className="text-[10px] text-emerald-800 font-mono">
                        Status: Siap Tes
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={testEmailTarget}
                          onChange={(e) => setTestEmailTarget(e.target.value)}
                          placeholder="Masukkan email tujuan tes (contoh: email-anda@gmail.com)"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTest || !settings.smtpEnabled}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {isSendingTest ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menghubungi SMTP...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim Email Tes</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 text-xs rounded-lg border flex items-start gap-2 ${
                          testResult.success
                            ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Subview: Sent Email Logs */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase">
                      Log Pengiriman Email Sistem ({emailLogs.length} Terkirim)
                    </h5>
                    <button
                      type="button"
                      onClick={fetchEmailLogs}
                      disabled={loadingLogs}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  {emailLogs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                      Belum ada riwayat email yang dikirim. Coba kirim email tes di tab konfigurasi.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {emailLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-1 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {log.subject}
                            </span>
                            {log.status === 'sent' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                ✓ BERHASIL TERKIRIM
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-700 border border-red-200 shrink-0">
                                ✕ GAGAL TERKIRIM
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>Ke: <strong className="text-slate-700 font-mono">{log.recipient}</strong></span>
                            {log.recipientName && <span>({log.recipientName})</span>}
                            <span>•</span>
                            <span className="capitalize font-medium text-blue-700">
                              Kategori: {log.category.replace('_', ' ')}
                            </span>
                            <span>•</span>
                            <span>{new Date(log.sentAt).toLocaleString('id-ID')}</span>
                          </div>

                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 line-clamp-2">
                            {log.previewSnippet}
                          </p>
                          {log.status === 'failed' && log.errorMessage && (
                            <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 p-2 rounded-lg mt-1 font-mono">
                              <strong>Error SMTP:</strong> {log.errorMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: GOOGLE OAUTH */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 uppercase">
                      Integrasi Login Google (OAuth 2.0)
                    </h4>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Memungkinkan mitra dan admin masuk menggunakan akun Google resmi.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.googleOAuthEnabled}
                      onChange={(e) => setSettings({ ...settings, googleOAuthEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Client ID
                  </label>
                  <input
                    type="text"
                    value={settings.googleClientId}
                    onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                    placeholder="Contoh: 123456789-abcdef.apps.googleusercontent.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-mono bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dapatkan Client ID dari Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Petunjuk Konfigurasi:</p>
                <p>1. Masukkan Domain aplikasi Anda pada <em>Authorized JavaScript Origins</em> di Google Cloud Console.</p>
                <p>2. Saat diaktifkan, tombol "Masuk dengan Akun Google" akan aktif di layar otentikasi.</p>
              </div>
            </div>
          )}

          {/* TAB 4: GEMINI AI API */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Generator Analisis Kinerja Gemini AI
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Mengaktifkan pembuat laporan evaluasi eksekutif bulanan berbasis Google Gemini 3.8 Flash.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.geminiApiEnabled}
                      onChange={(e) => setSettings({ ...settings, geminiApiEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model AI yang Digunakan
                  </label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none font-mono"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Rekomendasi Cepat &amp; Presisi)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Koneksi Server-Side API Key Terkonfigurasi</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Jika AI dinonaktifkan, aplikasi akan secara otomatis beralih ke analisis berbasis data historis internal NDTAXANDLAW tanpa memanggil API eksternal.
              </p>
            </div>
          )}
          </div>

          {/* Sticky Footer Save Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
