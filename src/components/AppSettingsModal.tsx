import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  ShieldCheck,
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
  resolveSpecializationOptions,
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
  activeTab?: 'general' | 'forms' | 'environment' | 'mysql' | 'smtp' | 'oauth' | 'ai';
  onTabChange?: (tab: 'general' | 'forms' | 'environment' | 'mysql' | 'smtp' | 'oauth' | 'ai') => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  currentUser,
  activeTab: controlledTab,
  onTabChange,
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
    tagline: 'Kantor Konsultan Pajak & Hukum',
    supportPhone: '0812-8899-7711',
    supportEmail: 'advisory@ndtaxandlaw.com',
    officeAddress: 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
    logoUrl: '/assets/aistudio/logo_nd_vertikal.svg',
    logoVerticalUrl: '/assets/aistudio/logo_nd_vertikal.svg',
    logoHorizontalUrl: '/assets/aistudio/logo_c3fdb6de.png',
    activeLogoType: 'vertical',
    appVersion: 'v2.5.0',
    copyrightText: 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.',
    defaultCommissionRate: 15,
    allowClientSelfRegister: true,
    chatEnabled: true,
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
    smtpUser: 'notifications@ndtaxandlaw.com',
    smtpPassword: '••••••••••••••••',
    smtpSenderName: 'NDTAXANDLAW System',
    smtpSenderEmail: 'notifications@ndtaxandlaw.com',
    smtpReplyToEmail: 'advisory@ndtaxandlaw.com',
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

  const [activeTab, setActiveTabState] = useState<'general' | 'forms' | 'environment' | 'mysql' | 'smtp' | 'oauth' | 'ai'>(
    controlledTab || 'general'
  );
  const setActiveTab = (
    next: 'general' | 'forms' | 'environment' | 'mysql' | 'smtp' | 'oauth' | 'ai'
  ) => {
    setActiveTabState(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    if (controlledTab && controlledTab !== activeTab) {
      setActiveTabState(controlledTab);
    }
  }, [controlledTab]);

  // Registered Mitras & Client Deals for Usage Protection Check
  const [registeredMitras, setRegisteredMitras] = useState<Mitra[]>([]);
  const [registeredClients, setRegisteredClients] = useState<ClientDeal[]>([]);

  // Dynamic Form Builder Local Inputs
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingSpecLabel, setEditingSpecLabel] = useState('');

  const [newMitraFieldLabel, setNewMitraFieldLabel] = useState('');
  const [newMitraFieldType, setNewMitraFieldType] = useState<'text' | 'number' | 'select' | 'textarea' | 'file'>('text');
  const [newMitraFieldPlaceholder, setNewMitraFieldPlaceholder] = useState('');
  const [newMitraFieldOptions, setNewMitraFieldOptions] = useState('');
  const [newMitraFieldRequired, setNewMitraFieldRequired] = useState(false);

  const [newBankOptionName, setNewBankOptionName] = useState('');
  const [newBankFieldLabel, setNewBankFieldLabel] = useState('');
  const [newBankFieldType, setNewBankFieldType] = useState<'text' | 'number' | 'select' | 'textarea' | 'file'>('text');
  const [newBankFieldPlaceholder, setNewBankFieldPlaceholder] = useState('');
  const [newBankFieldOptions, setNewBankFieldOptions] = useState('');
  const [newBankFieldRequired, setNewBankFieldRequired] = useState(false);

  const [editingMitraFieldId, setEditingMitraFieldId] = useState<string | null>(null);
  const [editMitraLabel, setEditMitraLabel] = useState('');
  const [editMitraType, setEditMitraType] = useState<'text' | 'number' | 'select' | 'textarea' | 'file'>('text');
  const [editMitraPlaceholder, setEditMitraPlaceholder] = useState('');
  const [editMitraOptions, setEditMitraOptions] = useState('');
  const [editMitraRequired, setEditMitraRequired] = useState(false);

  const [newClientFieldLabel, setNewClientFieldLabel] = useState('');
  const [newClientFieldType, setNewClientFieldType] = useState<'text' | 'number' | 'select' | 'textarea' | 'file'>('text');
  const [newClientFieldPlaceholder, setNewClientFieldPlaceholder] = useState('');
  const [newClientFieldOptions, setNewClientFieldOptions] = useState('');
  const [newClientFieldRequired, setNewClientFieldRequired] = useState(false);

  const [editingClientFieldId, setEditingClientFieldId] = useState<string | null>(null);
  const [editClientLabel, setEditClientLabel] = useState('');
  const [editClientType, setEditClientType] = useState<'text' | 'number' | 'select' | 'textarea' | 'file'>('text');
  const [editClientPlaceholder, setEditClientPlaceholder] = useState('');
  const [editClientOptions, setEditClientOptions] = useState('');
  const [editClientRequired, setEditClientRequired] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // MySQL Database State
  const [mysqlStatus, setMysqlStatus] = useState<{
    isConfigured: boolean;
    success: boolean;
    message: string;
    host?: string;
    port?: number;
    user?: string;
    database?: string;
    serverVersion?: string;
    url?: string;
    error?: string;
    appEnvironment?: 'development' | 'production';
    strictMysqlOnly?: boolean;
    tablesFound?: number;
    tableChecks?: Array<{
      table: string;
      label: string;
      exists: boolean;
      missingColumns: string[];
      rowCount?: number;
    }>;
    hasPendingMigration?: boolean;
    migrationSql?: string;
    fullSchemaSql?: string;
  } | null>(null);
  const [isCheckingMysql, setIsCheckingMysql] = useState(false);
  const [isInitializingSchema, setIsInitializingSchema] = useState(false);
  const [isSyncingMysql, setIsSyncingMysql] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlQueryMode, setSqlQueryMode] = useState<'migration' | 'full'>('migration');

  // Backup & Restore Database States
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isDownloadingSqlDump, setIsDownloadingSqlDump] = useState(false);
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
            const fetched = data.data as AppSettings;
            const resolvedVert =
              fetched.logoVerticalUrl ||
              (fetched.logoUrl && fetched.logoUrl !== '/assets/aistudio/logo_c3fdb6de.png'
                ? fetched.logoUrl
                : '/assets/aistudio/logo_nd_vertikal.svg');
            const resolvedHoriz =
              fetched.logoHorizontalUrl ||
              (fetched.logoUrl === '/assets/aistudio/logo_c3fdb6de.png'
                ? fetched.logoUrl
                : '/assets/aistudio/logo_c3fdb6de.png');
            const resolvedActiveType: 'vertical' | 'horizontal' =
              fetched.activeLogoType ||
              (fetched.logoUrl === resolvedHoriz && fetched.logoUrl !== resolvedVert
                ? 'horizontal'
                : 'vertical');
            setSettings({
              ...fetched,
              logoVerticalUrl: resolvedVert,
              logoHorizontalUrl: resolvedHoriz,
              activeLogoType: resolvedActiveType,
              logoUrl: resolvedActiveType === 'horizontal' ? resolvedHoriz : resolvedVert,
              specializationEnabled: fetched.specializationEnabled ?? true,
              specializationLabel: fetched.specializationLabel || DEFAULT_SPECIALIZATION_LABEL,
              specializationOptions: resolveSpecializationOptions(fetched),
              mitraCustomFields: resolveMitraFormFields(fetched),
              clientCustomFields: resolveClientFormFields(fetched),
              mitraFieldsInitialized: true,
              clientFieldsInitialized: true,
            });
            if (fetched.supportEmail) {
              setTestEmailTarget(fetched.supportEmail);
            }
          }
        })
        .catch((e) => console.error('Error fetching settings:', e))
        .finally(() => setLoading(false));

      if (!isStaff) {
        fetchEmailLogs();
        checkMysql();
      } else {
        if (controlledTab === 'forms' && canAccessFormsTab) {
          setActiveTabState('forms');
        } else if (controlledTab === 'general' && canAccessGeneralTab) {
          setActiveTabState('general');
        } else if (canAccessFormsTab) {
          setActiveTabState('forms');
        } else if (canAccessGeneralTab) {
          setActiveTabState('general');
        }
      }
    }
  }, [isOpen, isStaff, canAccessFormsTab, canAccessGeneralTab]);

  const checkMysql = async () => {
    setIsCheckingMysql(true);
    try {
      const res = await fetch('/api/system/mysql-status');
      const data = await res.json();
      if (data.success && data.data) {
        setMysqlStatus(data.data);
      }
    } catch {
      setMysqlStatus({
        isConfigured: false,
        success: false,
        message: 'Gagal menghubungi endpoint status MySQL di backend server.',
      });
    } finally {
      setIsCheckingMysql(false);
    }
  };

  const handleInitMysqlSchema = async () => {
    const ok = await confirm({
      title: 'Buat / Sinkronkan 14 Tabel & Kolom MySQL',
      message:
        'Sistem akan membuat tabel yang belum ada (CREATE TABLE IF NOT EXISTS) serta menambahkan kolom baru yang kurang tanpa menghapus data yang sudah ada di MySQL. Lanjutkan?',
      confirmText: 'Ya, Sinkronkan Skema MySQL',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsInitializingSchema(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/system/mysql-init-schema', { method: 'POST' });
      const data = await res.json();
      setSyncResult({
        success: Boolean(data.success),
        message: data.message || 'Skema MySQL selesai diproses.',
      });
      await checkMysql();
    } catch {
      setSyncResult({
        success: false,
        message: 'Gagal menghubungi server untuk inisialisasi skema MySQL.',
      });
    } finally {
      setIsInitializingSchema(false);
    }
  };

  const syncDataToMysql = async () => {
    const ok = await confirm({
      title: 'Konfirmasi Sinkronisasi Data Awal (Development)',
      message: 'Apakah Anda yakin ingin menyinkronkan data sampel awal ke database MySQL?',
      confirmText: 'Ya, Sinkronkan Data',
      cancelText: 'Batalkan',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncingMysql(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/system/mysql-sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        checkMysql();
      }
    } catch {
      setSyncResult({
        success: false,
        message: 'Gagal mengirim permintaan sinkronisasi ke server.',
      });
    } finally {
      setIsSyncingMysql(false);
    }
  };

  const handleDownloadBackup = async () => {
    const ok = await confirm({
      title: 'Download Backup Database MySQL (.JSON)',
      message: 'Apakah Anda yakin ingin mengunduh file backup seluruh 14 tabel database MySQL saat ini?',
      confirmText: 'Ya, Download Backup JSON',
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
        throw new Error(data.message || 'Gagal mengunduh data backup dari MySQL.');
      }
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `mysql-backup-${(settings.firmName || 'ndtaxandlaw').toLowerCase().replace(/\s+/g, '-')}-${dateStr}.json`;
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
        message: `Backup Database MySQL "${fileName}" berhasil diunduh (${data.counts?.mitras ?? 0} mitra, ${data.counts?.client_deals ?? 0} klien/deal, ${data.counts?.commissions ?? 0} komisi).`,
      });
    } catch (err: any) {
      setBackupRestoreFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan saat mengunduh backup dari MySQL.',
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleDownloadSqlDump = async () => {
    setIsDownloadingSqlDump(true);
    setBackupRestoreFeedback(null);
    try {
      const res = await fetch('/api/system/database-backup?format=sql');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal mengunduh SQL dump MySQL.');
      }
      const sqlText = await res.text();
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `mysql-backup-${(settings.firmName || 'ndtaxandlaw').toLowerCase().replace(/\s+/g, '-')}-${dateStr}.sql`;
      const blob = new Blob([sqlText], { type: 'application/sql' });
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
        message: `Backup SQL "${fileName}" berhasil diunduh dan siap di-import langsung di phpMyAdmin / MySQL CLI.`,
      });
    } catch (err: any) {
      setBackupRestoreFeedback({
        success: false,
        message: err.message || 'Gagal mengunduh file SQL dump MySQL.',
      });
    } finally {
      setIsDownloadingSqlDump(false);
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
          throw new Error('Struktur file backup JSON tidak dikenali.');
        }
        setParsedBackupPayload(parsed);
      } catch {
        setParsedBackupPayload(null);
        setBackupRestoreFeedback({
          success: false,
          message: `File "${file.name}" bukan file backup JSON yang valid.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackupPayload) return;
    const isReplace = restoreMode === 'replace';
    const ok = await confirm({
      title: isReplace ? 'Konfirmasi Timpa Penuh (Replace) Database MySQL' : 'Konfirmasi Gabungkan (Merge) ke Database MySQL',
      message: isReplace
        ? 'PERINGATAN: Seluruh data di tabel MySQL saat ini akan dihapus dan digantikan penuh dengan isi file backup. Apakah Anda yakin ingin melanjutkan?'
        : 'Data dari file backup (mendukung format Backup MySQL maupun Backup Supabase lama) akan digabungkan (upsert) ke tabel MySQL tanpa menghapus data lain yang sudah ada. Lanjutkan?',
      detail: `File Backup: ${selectedBackupFileName || 'backup.json'}\nMode Restore: ${isReplace ? 'Timpa Penuh (Replace All)' : 'Gabungkan Aman (Merge / Upsert)'}`,
      confirmText: isReplace ? 'Ya, Timpa & Restore MySQL' : 'Ya, Gabungkan & Restore ke MySQL',
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
        throw new Error(data.message || 'Gagal memulihkan database ke MySQL.');
      }
      setBackupRestoreFeedback({
        success: true,
        message: data.message,
      });
      if (data.settings) {
        setSettings(data.settings);
        if (onSettingsSaved) onSettingsSaved(data.settings);
      }
      checkMysql();
      fetchEmailLogs();
    } catch (err: any) {
      setBackupRestoreFeedback({
        success: false,
        message: err.message || 'Terjadi kesalahan saat melakukan restore database ke MySQL.',
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const defaultMysqlSchemaFallback = `-- Lihat file mysql_schema.sql di root proyek atau klik "Tes Koneksi" untuk memuat skema lengkap 14 tabel MySQL.`;

  const getDisplayedSqlQuery = () => {
    if (sqlQueryMode === 'migration') {
      return mysqlStatus?.migrationSql || defaultMysqlSchemaFallback;
    }
    return mysqlStatus?.fullSchemaSql || defaultMysqlSchemaFallback;
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
      detail: `Nama Firma: ${settings.firmName}\nHotline: ${settings.supportPhone}\nMode Sistem: ${settings.appEnvironment === 'production' ? 'Production (Murni MySQL)' : 'Development'}`,
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
              <span>Manajemen Form Input</span>
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
                  setActiveTab('mysql');
                  checkMysql();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'mysql'
                    ? 'border-blue-700 bg-white text-blue-900 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>Database MySQL</span>
                {mysqlStatus?.success ? (
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

                <div className="sm:col-span-2">
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Kantor Resmi (Ditampilkan di Kartu Identitas Mitra &amp; Portal)
                  </label>
                  <input
                    type="text"
                    value={settings.officeAddress}
                    onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Upload Logo ND & Informasi Versi / Hak Cipta */}
                <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Logo
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const targetUrl =
                            settings.logoVerticalUrl || '/assets/aistudio/logo_nd_vertikal.svg';
                          const nextSettings: AppSettings = {
                            ...settings,
                            activeLogoType: 'vertical',
                            logoVerticalUrl: targetUrl,
                            logoUrl: targetUrl,
                          };
                          setSettings(nextSettings);
                          try {
                            const res = await fetch('/api/settings', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-skip-crud-alert': 'true',
                              },
                              body: JSON.stringify(nextSettings),
                            });
                            const json = await res.json();
                            if (json?.success && json?.data && onSettingsSaved) {
                              onSettingsSaved(json.data);
                            }
                          } catch {}
                        }}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          (settings.activeLogoType || 'vertical') === 'vertical'
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Logo Vertikal
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const targetUrl =
                            settings.logoHorizontalUrl || '/assets/aistudio/logo_c3fdb6de.png';
                          const nextSettings: AppSettings = {
                            ...settings,
                            activeLogoType: 'horizontal',
                            logoHorizontalUrl: targetUrl,
                            logoUrl: targetUrl,
                          };
                          setSettings(nextSettings);
                          try {
                            const res = await fetch('/api/settings', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-skip-crud-alert': 'true',
                              },
                              body: JSON.stringify(nextSettings),
                            });
                            const json = await res.json();
                            if (json?.success && json?.data && onSettingsSaved) {
                              onSettingsSaved(json.data);
                            }
                          } catch {}
                        }}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          settings.activeLogoType === 'horizontal'
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Logo Horizontal
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="flex flex-col items-center justify-center p-4 bg-[#071B3B] rounded-xl border border-amber-400/30 min-h-[110px]">
                      <img
                        key={`${settings.activeLogoType || 'vertical'}-${
                          settings.activeLogoType === 'horizontal'
                            ? settings.logoHorizontalUrl || settings.logoUrl
                            : settings.logoVerticalUrl || settings.logoUrl
                        }`}
                        src={
                          (settings.activeLogoType === 'horizontal'
                            ? settings.logoHorizontalUrl || settings.logoUrl
                            : settings.logoVerticalUrl || settings.logoUrl) ||
                          '/assets/aistudio/logo_nd_vertikal.svg'
                        }
                        alt="Preview Logo NDTAXANDLAW"
                        className="max-h-20 w-auto object-contain"
                      />
                      <span className="text-[10px] text-amber-200/80 mt-2 font-medium">
                        Preview {settings.activeLogoType === 'horizontal' ? 'Logo Horizontal' : 'Logo Vertikal'} Aktif
                      </span>
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Upload File {settings.activeLogoType === 'horizontal' ? 'Logo Horizontal' : 'Logo Vertikal'} (PNG / SVG / WEBP / JPG)
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs shrink-0">
                            <Upload className="w-3.5 h-3.5 text-blue-700" />
                            <span>Pilih File Logo...</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                const activeMode = settings.activeLogoType || 'vertical';
                                let newLogoUrl = '';
                                try {
                                  const { compressAndUploadFile } = await import('../utils/fileCompressor');
                                  const compressed = await compressAndUploadFile(file, {
                                    maxDimension: 1000,
                                    quality: 0.9,
                                    uploadToServer: true,
                                  });
                                  newLogoUrl = compressed.hostedUrl || compressed.dataUrl;
                                } catch {
                                  newLogoUrl = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = () =>
                                      resolve(typeof reader.result === 'string' ? reader.result : '');
                                    reader.onerror = () => resolve('');
                                    reader.readAsDataURL(file);
                                  });
                                }
                                if (!newLogoUrl) return;
                                const nextSettings: AppSettings = {
                                  ...settings,
                                  activeLogoType: activeMode,
                                  logoUrl: newLogoUrl,
                                  ...(activeMode === 'horizontal'
                                    ? { logoHorizontalUrl: newLogoUrl }
                                    : { logoVerticalUrl: newLogoUrl }),
                                };
                                setSettings(nextSettings);
                                try {
                                  const res = await fetch('/api/settings', {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-skip-crud-alert': 'true',
                                    },
                                    body: JSON.stringify(nextSettings),
                                  });
                                  const json = await res.json();
                                  if (json?.success && json?.data) {
                                    setSettings((prev) => ({
                                      ...prev,
                                      logoUrl: json.data.logoUrl || newLogoUrl,
                                      logoVerticalUrl:
                                        json.data.logoVerticalUrl || nextSettings.logoVerticalUrl,
                                      logoHorizontalUrl:
                                        json.data.logoHorizontalUrl || nextSettings.logoHorizontalUrl,
                                      activeLogoType: json.data.activeLogoType || activeMode,
                                    }));
                                    if (onSettingsSaved) {
                                      onSettingsSaved(json.data);
                                    }
                                  }
                                } catch {}
                              }}
                            />
                          </label>
                          <input
                            type="text"
                            value={
                              (settings.activeLogoType === 'horizontal'
                                ? settings.logoHorizontalUrl || settings.logoUrl
                                : settings.logoVerticalUrl || settings.logoUrl) ||
                              '/assets/aistudio/logo_nd_vertikal.svg'
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              const activeMode = settings.activeLogoType || 'vertical';
                              setSettings({
                                ...settings,
                                logoUrl: val,
                                ...(activeMode === 'horizontal'
                                  ? { logoHorizontalUrl: val }
                                  : { logoVerticalUrl: val }),
                              });
                            }}
                            placeholder="URL logo"
                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Versi Aplikasi
                          </label>
                          <input
                            type="text"
                            value={settings.appVersion ?? 'v2.5.0'}
                            onChange={(e) => setSettings({ ...settings, appVersion: e.target.value })}
                            placeholder="v2.5.0"
                            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Informasi Hak Cipta Aplikasi (Footer)
                          </label>
                          <input
                            type="text"
                            value={settings.copyrightText ?? 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.'}
                            onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                            placeholder="Teks hak cipta"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200 space-y-3">
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

                  {!isStaff && (
                    <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-100">
                      <input
                        type="checkbox"
                        checked={settings.chatEnabled !== false}
                        onChange={(e) => setSettings({ ...settings, chatEnabled: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800">
                          Aktifkan Fitur Live Chat Real-Time (Mitra &amp; Staf)
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Jika diaktifkan, ikon chat melayang di pojok kanan bawah akan tampil pada portal Mitra &amp; Staf untuk komunikasi 1-on-1 dan grup real-time (Admin memonitor seluruh percakapan). Jika dinonaktifkan, fitur chat tidak tampil di Mitra maupun Staf.
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: DYNAMIC FORMS & SPECIALIZATION MANAGEMENT */}
          {activeTab === 'forms' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Info Aturan Proteksi Hapus Data */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-blue-950">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <p className="font-bold text-blue-900">
                    Manajemen Input Default &amp; Dinamis + Proteksi Data Terpakai
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
                          placeholder="Label bidang keahlian"
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
                        placeholder="Tambah keahlian baru..."
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
                        placeholder="Nama kolom"
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
                        <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
                        placeholder="Teks bantuan"
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
                        placeholder="Opsi1, Opsi2, Opsi3"
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
                                    disabled={isDefaultField && field.systemKey !== 'accountNumber'}
                                    onChange={(e: any) => setEditMitraType(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                  >
                                    <option value="text">Teks Singkat (Text)</option>
                                    <option value="number">Angka / Nomor (Number)</option>
                                    <option value="select">Pilihan Dropdown (Select)</option>
                                    <option value="textarea">Catatan Panjang (Textarea)</option>
                                    <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
                                              type:
                                                isDefaultField && field.systemKey !== 'accountNumber'
                                                  ? f.type
                                                  : editMitraType,
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
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newBankOptionName}
                          onChange={(e) => setNewBankOptionName(e.target.value)}
                          placeholder="Tambah bank / e-wallet..."
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
                        placeholder="Nama kolom"
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
                        <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
                        placeholder="Teks bantuan"
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
                        placeholder="Opsi1, Opsi2"
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
                                    disabled={isDefaultField && field.systemKey !== 'accountNumber'}
                                    onChange={(e: any) => setEditMitraType(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                  >
                                    <option value="text">Teks Singkat (Text)</option>
                                    <option value="number">Angka / Nomor (Number)</option>
                                    <option value="select">Pilihan Dropdown (Select)</option>
                                    <option value="textarea">Catatan Panjang (Textarea)</option>
                                    <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
                                              type:
                                                isDefaultField && field.systemKey !== 'accountNumber'
                                                  ? f.type
                                                  : editMitraType,
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
                        placeholder="Nama kolom"
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
                        <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
                        placeholder="Teks bantuan"
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
                        placeholder="Opsi1, Opsi2, Opsi3"
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
                                  <option value="file">Upload File (JPG, JPEG, PNG, PDF)</option>
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
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl border border-blue-800 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Konfigurasi Mode Lingkungan Aplikasi (Dev vs Prod)
                  </h3>
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
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between">
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
                </div>
              </div>
            </div>
          )}

          {/* TAB: DATABASE MYSQL & MIGRASI PRODUKSI */}
          {activeTab === 'mysql' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white rounded-xl border border-blue-800/60 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Database MySQL / MariaDB &amp; Pusat Migrasi Produksi
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Seluruh 14 tabel operasional aplikasi kini berjalan 100% di atas MySQL tanpa ketergantungan Supabase.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Status Koneksi MySQL Card */}
              <div
                className={`p-4 rounded-xl border ${
                  mysqlStatus?.success
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        mysqlStatus?.success
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {mysqlStatus?.success ? (
                        <CheckCheck className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold">
                          {mysqlStatus?.success
                            ? `MySQL Terhubung & Aktif${mysqlStatus.serverVersion ? ` (${mysqlStatus.serverVersion})` : ''}`
                            : mysqlStatus?.isConfigured
                              ? 'Kredensial MySQL Terpasang, Menunggu Koneksi / Tabel'
                              : 'Kredensial MySQL Belum Terpasang di .env'}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            mysqlStatus?.success
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {mysqlStatus?.success ? 'ONLINE' : 'PERLU SETUP'}
                        </span>
                      </div>
                      {mysqlStatus?.message &&
                        !(mysqlStatus.success && !mysqlStatus.hasPendingMigration) && (
                          <p className="text-xs mt-1 text-slate-700 leading-relaxed">
                            {mysqlStatus.message}
                          </p>
                        )}
                      {mysqlStatus?.url && (
                        <p className="text-[11px] font-mono text-slate-600 mt-1">
                          Server: <strong>{mysqlStatus.url}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={checkMysql}
                      disabled={isCheckingMysql}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMysql ? 'animate-spin' : ''}`} />
                      <span>{isCheckingMysql ? 'Menguji...' : 'Tes Koneksi'}</span>
                    </button>

                    {mysqlStatus?.isConfigured && (
                      <button
                        type="button"
                        onClick={handleInitMysqlSchema}
                        disabled={isInitializingSchema}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <Database className={`w-3.5 h-3.5 ${isInitializingSchema ? 'animate-pulse' : ''}`} />
                        <span>{isInitializingSchema ? 'Membuat Tabel...' : 'Auto-Buat / Update 14 Tabel'}</span>
                      </button>
                    )}

                    {mysqlStatus?.success && settings.appEnvironment === 'development' && !mysqlStatus?.strictMysqlOnly && (
                      <button
                        type="button"
                        onClick={syncDataToMysql}
                        disabled={isSyncingMysql}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMysql ? 'animate-spin' : ''}`} />
                        <span>{isSyncingMysql ? 'Menyinkronkan...' : 'Sinkronkan Data Awal'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {syncResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs border ${
                      syncResult.success
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {syncResult.message}
                  </div>
                )}
              </div>

              {/* BACKUP & RESTORE DATABASE MYSQL (.JSON & .SQL) */}
              <div className="p-5 bg-white border-2 border-blue-600/25 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Database className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Backup &amp; Restore Database MySQL (Production)
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                        MURNI DATA MYSQL
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadSqlDump}
                      disabled={isDownloadingSqlDump || !mysqlStatus?.success}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isDownloadingSqlDump ? 'Membuat .SQL...' : 'Export .SQL (phpMyAdmin)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      disabled={isDownloadingBackup || !mysqlStatus?.success}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isDownloadingBackup ? 'Mengambil dari MySQL...' : 'Backup .JSON MySQL'}</span>
                    </button>
                  </div>
                </div>

                {/* Restore / Import Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="md:col-span-7 space-y-2">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-700" />
                      <span>Restore / Import File Backup (.JSON) ke MySQL</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Mendukung file backup <strong>MySQL (.json)</strong> maupun file backup <strong>Supabase lama (.json)</strong> untuk migrasi offline 1-klik.
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
                        <span>Gabungkan / Update ke MySQL (Merge)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="text-amber-600"
                        />
                        <span>Timpa Penuh Tabel MySQL (Full Replace)</span>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col gap-2">
                    <label className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="truncate">
                        {selectedBackupFileName || 'Pilih File Backup .JSON (MySQL / Supabase)...'}
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
                          Isi File Backup ({parsedBackupPayload.createdAt ? new Date(parsedBackupPayload.createdAt).toLocaleString('id-ID') : 'Siap Import'}):
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
                      disabled={!parsedBackupPayload || isRestoringBackup || !mysqlStatus?.isConfigured}
                      className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRestoringBackup ? 'animate-spin' : ''}`} />
                      <span>{isRestoringBackup ? 'Memulihkan ke MySQL...' : 'Restore / Import ke MySQL'}</span>
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

              {/* PUSAT SKEMA SQL MYSQL (14 TABEL) */}
              <div className="p-5 bg-white border-2 border-emerald-600/30 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Status 14 Tabel &amp; Skema SQL MySQL / MariaDB
                      </h4>
                      {mysqlStatus?.hasPendingMigration ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                          ADA TABEL / KOLOM BELUM SINKRON
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                          14 TABEL SINKRON
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copySqlSchema()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedSql ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      <span>{copiedSql ? 'Query Tersalin!' : 'Copy Skema SQL MySQL'}</span>
                    </button>
                  </div>
                </div>

                {/* Status 14 Tabel MySQL */}
                {mysqlStatus?.tableChecks && mysqlStatus.tableChecks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Deteksi 14 Tabel &amp; Kolom di Database MySQL Anda:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {mysqlStatus.tableChecks.filter((t) => t.exists).length} dari {mysqlStatus.tableChecks.length} tabel aktif
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {mysqlStatus.tableChecks.map((tbl) => (
                        <div
                          key={tbl.table}
                          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                            tbl.exists && tbl.missingColumns.length === 0
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                              : 'bg-amber-50/60 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-[11px] truncate">`{tbl.table}`</p>
                            <p className="text-[10px] text-slate-600 truncate">
                              {tbl.label}
                              {tbl.exists && typeof tbl.rowCount === 'number' ? ` · ${tbl.rowCount} baris` : ''}
                            </p>
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

                {/* Pilihan Mode Query */}
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
                        Query Update / Tabel Belum Ada
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
                        Skrip Lengkap 14 Tabel (mysql_schema.sql)
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      MySQL 5.7+ / 8.0+ / MariaDB 10.2+ (UTF8MB4)
                    </span>
                  </div>

                  <div className="relative">
                    <pre className="bg-slate-950 text-emerald-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                      {getDisplayedSqlQuery()}
                    </pre>
                  </div>
                </div>
              </div>

              {/* PANDUAN 3 LANGKAH KONEKSI MYSQL DI HOSTING / VPS */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  <span>Panduan Setup Database MySQL di VPS / cPanel / Production</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <p className="font-bold text-slate-900">Buat Database MySQL</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Buat database kosong di cPanel / phpMyAdmin / VPS MySQL (misal: <code>ndtaxlaw_db</code>) beserta user &amp; password-nya.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <p className="font-bold text-slate-900">Pasang Kredensial di .env</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Isi <code>MYSQL_HOST</code>, <code>MYSQL_PORT</code>, <code>MYSQL_USER</code>, <code>MYSQL_PASSWORD</code>, dan <code>MYSQL_DATABASE</code> di file <code>.env</code> server lalu restart Node.js.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <p className="font-bold text-slate-900">Sinkronisasi Tabel &amp; Backup</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Seluruh 14 tabel terbuat otomatis saat startup. Gunakan tombol <strong>Auto-Buat / Update 14 Tabel</strong> atau fitur <strong>Backup &amp; Restore</strong> di atas untuk pemeliharaan rutin.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-800">
                      Contoh Konfigurasi File <code>.env</code> Production (MySQL):
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">Root folder server</span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto select-all leading-relaxed">
                    <span className="text-slate-400"># Konfigurasi Database MySQL / MariaDB</span><br />
                    MYSQL_HOST="127.0.0.1"<br />
                    MYSQL_PORT="3306"<br />
                    MYSQL_USER="ndtaxlaw_user"<br />
                    MYSQL_PASSWORD="password_kuat_anda"<br />
                    MYSQL_DATABASE="ndtaxlaw_db"<br />
                    MYSQL_SSL="false"<br /><br />
                    <span className="text-slate-400"># Kunci ke mode production</span><br />
                    APP_ENV="production"<br />
                    NODE_ENV="production"
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">File Skema MySQL Tersedia di Root Proyek</p>
                    <p className="mt-0.5 text-blue-800 text-[11px] leading-relaxed">
                      File <strong>mysql_schema.sql</strong> (siap import phpMyAdmin / MySQL CLI) telah tersedia di repository sebagai referensi struktur 14 tabel produksi.
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
                          placeholder="smtp.domain.com"
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
                          placeholder="notifications@ndtaxandlaw.com"
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
                            placeholder="Password SMTP"
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
                          placeholder="notifications@ndtaxandlaw.com"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. Verifikasi Email Akun Daftar */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnRegistrationVerify}
                          onChange={(e) => setSettings({ ...settings, emailOnRegistrationVerify: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            ✉️ Verifikasi Email Akun Daftar Baru
                          </span>
                        </div>
                      </label>

                      {/* 2. Informasi Pencairan Komisi */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnPayoutDisbursed}
                          onChange={(e) => setSettings({ ...settings, emailOnPayoutDisbursed: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            💸 Informasi Pencairan Komisi Mitra
                          </span>
                        </div>
                      </label>

                      {/* 3. Validasi Keberhasilan Client (ACC) */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnClientAcc}
                          onChange={(e) => setSettings({ ...settings, emailOnClientAcc: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            🤝 Validasi Keberhasilan Client (Deal ACC)
                          </span>
                        </div>
                      </label>

                      {/* 4. Reset & Keamanan Password */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.emailOnPasswordReset}
                          onChange={(e) => setSettings({ ...settings, emailOnPasswordReset: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            🔑 Reset Password &amp; Keamanan Akun
                          </span>
                        </div>
                      </label>

                      {/* 5. Tagihan Retainer Bulanan / Tahunan */}
                      <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={settings.emailOnRecurringInvoice}
                          onChange={(e) => setSettings({ ...settings, emailOnRecurringInvoice: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            📑 Konfirmasi Siklus Pembayaran Langganan (Bulanan &amp; Tahunan)
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
                          placeholder="Email tujuan tes"
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
                    placeholder="Google Client ID"
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
