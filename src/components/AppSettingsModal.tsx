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
  Lock
} from 'lucide-react';
import { AppSettings } from '../types';

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
  });

  const [activeTab, setActiveTab] = useState<'general' | 'oauth' | 'ai'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setSettings(data.data);
          }
        })
        .catch((e) => console.error('Error fetching settings:', e))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 relative flex justify-between items-center">
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
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'general'
                ? 'border-blue-700 bg-white text-blue-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Layanan &amp; Profil Firma
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-blue-700 bg-white text-blue-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Login Google (OAuth)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-blue-700 bg-white text-blue-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gemini AI Assistant</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan aplikasi berhasil disimpan &amp; diterapkan ke seluruh sistem!</span>
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
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        Izinkan Registrasi Mandiri Klien via Tautan Referral Mitra
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Klien dapat langsung mendaftar melalui tautan yang dibagikan mitra dan langsung terdata sebagai referral.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE OAUTH */}
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

          {/* TAB 3: GEMINI AI API */}
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
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
