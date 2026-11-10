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
  Wrench
} from 'lucide-react';
import { AppSettings, EmailLogItem } from '../types';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
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
    appEnvironment: 'development',
    
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
  });

  const [activeTab, setActiveTab] = useState<'general' | 'environment' | 'supabase' | 'smtp' | 'oauth' | 'ai'>('supabase');
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
  } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

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
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setSettings(data.data);
            if (data.data.supportEmail) {
              setTestEmailTarget(data.data.supportEmail);
            }
          }
        })
        .catch((e) => console.error('Error fetching settings:', e))
        .finally(() => setLoading(false));

      fetchEmailLogs();
      checkSupabase();
    }
  }, [isOpen]);

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

  const copySqlSchema = () => {
    const sqlText = `-- SKEMA SUPABASE NDTAXANDLAW
CREATE TABLE IF NOT EXISTS public.mitras (
    id TEXT PRIMARY KEY,
    "memberCode" TEXT,
    "referralCode" TEXT,
    "fullName" TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    nik TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'pending',
    "avatarUrl" TEXT,
    "joinedDate" TEXT,
    "bankDetails" JSONB,
    "totalCommission" NUMERIC DEFAULT 0,
    "totalBonus" NUMERIC DEFAULT 0,
    "pendingPayout" NUMERIC DEFAULT 0,
    "paidPayout" NUMERIC DEFAULT 0,
    "referredClientsCount" INTEGER DEFAULT 0,
    "activeSubscribersCount" INTEGER DEFAULT 0,
    "emailVerified" BOOLEAN DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TEXT
);

CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    "defaultPrice" NUMERIC NOT NULL,
    "pricingType" TEXT DEFAULT 'case_by_case',
    "commissionRate" NUMERIC DEFAULT 15,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.client_deals (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "referralCode" TEXT,
    "companyName" TEXT NOT NULL,
    "picName" TEXT NOT NULL,
    "picPhone" TEXT,
    "picEmail" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "pricingType" TEXT,
    "dealValue" NUMERIC NOT NULL,
    "commissionAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending_acc',
    date TEXT,
    "recurringPaidMonths" INTEGER,
    "recurringPaidYears" INTEGER,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "durationMonths" INTEGER,
    "paymentTermType" TEXT DEFAULT 'one_time',
    notes TEXT,
    "submittedBy" TEXT DEFAULT 'mitra'
);

CREATE TABLE IF NOT EXISTS public.commissions (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "serviceName" TEXT,
    "clientName" TEXT,
    "dealValue" NUMERIC DEFAULT 0,
    "commissionAmount" NUMERIC DEFAULT 0,
    "bonusAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT
);

CREATE TABLE IF NOT EXISTS public.payout_requests (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "memberCode" TEXT,
    amount NUMERIC NOT NULL,
    "bankDetails" JSONB,
    "requestDate" TEXT,
    "processedDate" TEXT,
    status TEXT DEFAULT 'pending',
    "pph21Deduction" NUMERIC DEFAULT 0,
    "pph21Rate" NUMERIC DEFAULT 0,
    "adminFeeDeduction" NUMERIC DEFAULT 0,
    "netAmountTransferred" NUMERIC DEFAULT 0,
    "proofFileUrl" TEXT,
    "proofFileName" TEXT,
    "transferRefNumber" TEXT,
    "disbursedBy" TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.marketing_tools (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" TEXT,
    "downloadUrl" TEXT,
    "thumbnailUrl" TEXT,
    description TEXT,
    "createdAt" TEXT,
    "targetProduct" TEXT,
    duration TEXT
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    timestamp TEXT,
    "isRead" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_passwords (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
);

-- RLS & Policies
ALTER TABLE public.mitras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public mitras" ON public.mitras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public client_deals" ON public.client_deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public commissions" ON public.commissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public payout_requests" ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public marketing_tools" ON public.marketing_tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public user_passwords" ON public.user_passwords FOR ALL USING (true) WITH CHECK (true);`;

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
        body: JSON.stringify({ targetEmail: testEmailTarget }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        fetchEmailLogs();
      } else {
        setTestResult({ success: false, message: data.message || 'Gagal mengirim email tes.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Terjadi kesalahan saat menghubungkan ke server SMTP.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const applyPreset = (preset: 'gmail' | 'hostinger' | 'microsoft') => {
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
        smtpHost: 'smtp.hostinger.com',
        smtpPort: 465,
        smtpEncryption: 'ssl',
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
                      <span><strong>Tombol Switch [Mitra | Admin] DISEMBUNYIKAN</strong> total dari navbar atas.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Akun Demo 1-Klik DISEMBUNYIKAN</strong> dari formulir login pengguna.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span><strong>Login Wajib Riil</strong>: Pengguna hanya dapat masuk dengan email &amp; kata sandi terdaftar.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span>Mitra terkunci pada data pribadi miliknya (tidak dapat melihat atau berganti ke akun mitra lain).</span>
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

                    {supabaseStatus?.success && (
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
                      onClick={copySqlSchema}
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
                      onClick={() => applyPreset('gmail')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors"
                    >
                      Google Mail (TLS 587)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('hostinger')}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors"
                    >
                      Hostinger / cPanel (SSL 465)
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
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              ✓ {log.status.toUpperCase()}
                            </span>
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
