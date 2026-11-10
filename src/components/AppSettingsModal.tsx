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
  ExternalLink
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

  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'oauth' | 'ai'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    }
  }, [isOpen]);

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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
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

          {/* TAB 2: SMTP EMAIL & NOTIFICATIONS */}
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

          {/* Footer Save Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
