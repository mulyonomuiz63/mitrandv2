import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Check,
  ChevronLeft,
  Calendar,
  Lock
} from 'lucide-react';
import { ServiceItem, Mitra, AppSettings, DynamicFormField } from '../types';
import { MonthYearPicker, MONTH_NAMES_ID } from './MonthYearPicker';
import { useConfirm } from './ConfirmDialogModal';

interface ClientSelfRegistrationProps {
  referralCode: string;
  onSuccess: () => void;
  onBackToHome: () => void;
  settings?: AppSettings | null;
}

export const ClientSelfRegistration: React.FC<ClientSelfRegistrationProps> = ({
  referralCode,
  onSuccess,
  onBackToHome,
  settings,
}) => {
  const confirm = useConfirm();
  const [mitra, setMitra] = useState<Mitra | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [dynamicSettings, setDynamicSettings] = useState<AppSettings | null>(settings || null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [pricingType, setPricingType] = useState<'case_by_case' | 'monthly_subscription' | 'annual_subscription'>('case_by_case');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  
  // Interactive Month & Year Picker state (No manual typing)
  const [startMonth, setStartMonth] = useState<number>(2); // Februari
  const [startYear, setStartYear] = useState<number>(2024);
  const [endMonth, setEndMonth] = useState<number>(4); // April
  const [endYear, setEndYear] = useState<number>(2025);
  
  const [dealValue, setDealValue] = useState<number>(7500000);
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) setDynamicSettings(settings);
  }, [settings]);

  const activeClientCustomFields: DynamicFormField[] = (dynamicSettings?.clientCustomFields || []).filter((f) => f.isActive !== false);

  useEffect(() => {
    // Fetch Mitra by referralCode and available services
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [resMitras, resServices, resSettings] = await Promise.all([
          fetch('/api/mitra').then((r) => r.json()),
          fetch('/api/services').then((r) => r.json()),
          fetch('/api/settings').then((r) => r.json()).catch(() => null),
        ]);

        if (resMitras.success && resMitras.data) {
          const matched = resMitras.data.find(
            (m: Mitra) => m.referralCode?.toUpperCase() === referralCode?.toUpperCase()
          );
          if (matched) {
            setMitra(matched);
          }
        }

        if (resServices.success && resServices.data && resServices.data.length > 0) {
          setServices(resServices.data);
          setSelectedServiceId(resServices.data[0].id);
          setDealValue(resServices.data[0].defaultPrice);
          setPricingType(resServices.data[0].pricingType);
        }

        if (resSettings?.success && resSettings?.data) {
          setDynamicSettings(resSettings.data);
        }
      } catch (err) {
        console.error('Error fetching referral details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [referralCode]);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedServiceId(sId);
    const s = services.find((srv) => srv.id === sId);
    if (s) {
      setDealValue(s.defaultPrice);
      setPricingType(s.pricingType);
    }
  };

  const autoDuration = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
  const autoPeriodStart = `${MONTH_NAMES_ID[startMonth - 1] || 'Januari'} ${startYear}`;
  const autoPeriodEnd = `${MONTH_NAMES_ID[endMonth - 1] || 'Desember'} ${endYear}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !picName.trim() || !picPhone.trim() || !selectedServiceId) {
      setErrorMsg('Mohon lengkapi nama perusahaan, penanggung jawab (PIC), nomor telepon, dan layanan.');
      return;
    }

    for (const field of activeClientCustomFields) {
      if (field.required && !String(customFields[field.label] || '').trim()) {
        setErrorMsg(`Mohon lengkapi kolom wajib: "${field.label}".`);
        return;
      }
    }

    const cleanedCustomFields: Record<string, string> = {};
    for (const field of activeClientCustomFields) {
      const val = String(customFields[field.label] || '').trim();
      if (val) cleanedCustomFields[field.label] = val;
    }

    const selectedService = services.find((s) => s.id === selectedServiceId);
    const ok = await confirm({
      title: 'Konfirmasi Pendaftaran Layanan Klien',
      message: `Apakah data perusahaan "${companyName.trim()}" yang Anda isi sudah benar dan siap dikirimkan ke tim konsultan NDTAXANDLAW?`,
      detail: `Perusahaan: ${companyName.trim()}\nNama PIC: ${picName.trim()} (${picPhone.trim()})\nLayanan Dipilih: ${selectedService?.name || '-'}\nEstimasi Nilai Kontrak: Rp ${Number(dealValue).toLocaleString('id-ID')}`,
      confirmText: 'Ya, Kirim Pendaftaran',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraId: mitra ? mitra.id : 'mitra-01',
          referralCode: referralCode || (mitra ? mitra.referralCode : 'ND-REF-0042'),
          companyName: companyName.trim(),
          picName: picName.trim(),
          picPhone: picPhone.trim(),
          picEmail: picEmail.trim(),
          serviceId: selectedServiceId,
          dealValue: Number(dealValue),
          pricingType,
          periodStart: pricingType === 'case_by_case' && isCustomPeriod ? autoPeriodStart : undefined,
          periodEnd: pricingType === 'case_by_case' && isCustomPeriod ? autoPeriodEnd : undefined,
          durationMonths: pricingType === 'case_by_case' && isCustomPeriod ? autoDuration : undefined,
          notes: notes.trim(),
          customFields: Object.keys(cleanedCustomFields).length > 0 ? cleanedCustomFields : undefined,
          submittedBy: 'client_self',
          status: 'pending_acc',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.message || 'Gagal mengirimkan formulir pendaftaran.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        
        {/* Top Header & Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_c3fdb6de.png"
              alt="NDTAXANDLAW Logo"
              className="h-9 w-auto object-contain brightness-110"
            />
            <div className="hidden sm:block border-l border-slate-800 pl-3">
              <span className="text-xs font-bold text-white block uppercase tracking-wider">
                NDTAXANDLAW Portal Klien
              </span>
              <span className="text-[10px] text-slate-400">
                Formulir Mandiri Layanan Pajak &amp; Laporan Keuangan
              </span>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Web Layanan</span>
          </button>
        </div>

        {!loading && (!mitra || mitra.status !== 'verified') ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <span className="inline-block px-3 py-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full uppercase">
                Kode Referral Belum Aktif
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Tautan Referral Belum Dapat Digunakan
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Kode referral <span className="font-mono font-bold text-amber-300">{referralCode}</span> saat ini belum aktif karena akun mitra terkait masih dalam proses verifikasi oleh Admin NDTAXANDLAW.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToHome}
                className="px-6 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
              >
                Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        ) : submitted ? (
          /* Submission Success Card */
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">
                Pendaftaran Klien Berhasil Diterima!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                Terima kasih, data perusahaan <strong>{companyName}</strong> telah berhasil didaftarkan dan terhubung secara resmi melalui kode referral <span className="font-mono font-bold text-amber-300">{referralCode}</span>.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Mitra Pendamping:</span>
                <span className="font-bold text-white">{mitra ? mitra.fullName : 'Mitra Terdaftar'}</span>
              </div>
              <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Status Verifikasi:</span>
                <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  Menunggu Validasi Admin (ACC)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimasi Tindak Lanjut:</span>
                <span className="text-slate-300">Maksimal 1x24 Jam Kerja</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tim Konsultan Pajak NDTAXANDLAW akan segera menghubungi nomor WhatsApp <strong>{picPhone}</strong> untuk konfirmasi berkas dan jadwal kickoff konsultasi.
            </p>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onBackToHome}
                className="px-6 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
              >
                Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        ) : (
          /* Self-Registration Form */
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
            
            {/* Verified Referral Badge Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-slate-900 border border-blue-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                  REF
                </div>
                <div>
                  <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Tautan Rekomendasi Resmi
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {mitra ? mitra.fullName : 'Mitra Terdaftar NDTAXANDLAW'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Kode Referral: <strong className="text-amber-300">{referralCode || 'ND-REF-0042'}</strong>
                  </div>
                </div>
              </div>

              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                Referral Terverifikasi
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Formulir Pendaftaran Klien Baru
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Lengkapi rincian profil perusahaan dan kebutuhan perpajakan Anda. Tim ahli NDTAXANDLAW akan mempersiapkan proposal dan penanganan terbaik.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Company & PIC Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Perusahaan / Entitas Bisnis <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: PT Sumber Pangan Makmur"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama PIC / Penanggung Jawab <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      placeholder="Contoh: Budi Santoso (Direktur)"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nomor WhatsApp / HP PIC <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={picPhone}
                      onChange={(e) => setPicPhone(e.target.value)}
                      placeholder="0812-XXXX-XXXX"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Kantor / PIC
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={picEmail}
                      onChange={(e) => setPicEmail(e.target.value)}
                      placeholder="finance@sumberpangan.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Dynamic Custom Fields for Client (Managed by Admin) */}
                {activeClientCustomFields.map((field) => (
                  <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {field.label} {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={customFields[field.label] || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">
                          -- Pilih {field.label} --
                        </option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt} className="bg-slate-900 text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        required={field.required}
                        value={customFields[field.label] || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        placeholder={field.placeholder || `Masukkan ${field.label}`}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        required={field.required}
                        value={customFields[field.label] || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        placeholder={field.placeholder || `Masukkan ${field.label}`}
                        className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Service Selection */}
              <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Layanan Pajak &amp; Akuntansi yang Dibutuhkan
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Paket Layanan
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id} className="bg-slate-900 text-white">
                        {srv.name} ({srv.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Model Pembayaran &amp; Skema Komisi Klien
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPricingType('case_by_case')}
                      className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                        pricingType === 'case_by_case'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      <span className="font-bold text-sm block">⚡ Case-by-Case</span>
                      <span className={`block text-[11px] mt-0.5 ${pricingType === 'case_by_case' ? 'text-blue-100' : 'text-slate-400'}`}>
                        1x Bayar (Proyek / Multi-Bulan)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingType('monthly_subscription')}
                      className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                        pricingType === 'monthly_subscription'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      <span className="font-bold text-sm block">🔄 Langganan Bulanan</span>
                      <span className={`block text-[11px] mt-0.5 ${pricingType === 'monthly_subscription' ? 'text-blue-100' : 'text-slate-400'}`}>
                        Komisi tiap siklus bulanan
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingType('annual_subscription')}
                      className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                        pricingType === 'annual_subscription'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      <span className="font-bold text-sm block">📅 Langganan Tahunan</span>
                      <span className={`block text-[11px] mt-0.5 ${pricingType === 'annual_subscription' ? 'text-blue-100' : 'text-slate-400'}`}>
                        Annual Retainer Perikatan
                      </span>
                    </button>
                  </div>
                </div>

                {/* Case by case custom multi-month period */}
                {pricingType === 'case_by_case' && (
                  <div className="p-3.5 bg-slate-850 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-sm space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
                      <input
                        type="checkbox"
                        checked={isCustomPeriod}
                        onChange={(e) => setIsCustomPeriod(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Atur Rentang Bulan &amp; Tahun Perikatan (Opsional: Multi-Bulan Sekali Bayar)</span>
                    </label>

                    {isCustomPeriod && (
                      <div className="pt-2 border-t border-slate-700/70 space-y-3 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Click-to-select Month & Year in Dark Theme */}
                          <MonthYearPicker
                            label="Bulan & Tahun Mulai Perikatan"
                            selectedMonth={startMonth}
                            selectedYear={startYear}
                            isDarkTheme={true}
                            onChange={(m, y) => {
                              setStartMonth(m);
                              setStartYear(y);
                            }}
                          />

                          <MonthYearPicker
                            label="Bulan & Tahun Selesai Perikatan"
                            selectedMonth={endMonth}
                            selectedYear={endYear}
                            isDarkTheme={true}
                            onChange={(m, y) => {
                              setEndMonth(m);
                              setEndYear(y);
                            }}
                          />
                        </div>

                        {/* Auto-calculated contract duration */}
                        <div className="p-3 bg-slate-900/90 border border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                              Total Durasi Terhitung Otomatis
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                              Periode: <strong className="text-white">{autoPeriodStart}</strong> s/d <strong className="text-white">{autoPeriodEnd}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Durasi:</span>
                            <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-md shadow-xs">
                              {autoDuration} Bulan
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          ℹ️ Durasi perikatan terisi otomatis dari rentang bulan &amp; tahun yang Anda pilih tanpa perlu input manual. Pembayaran bersifat sekali bayar (case-by-case).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Perkiraan Anggaran / Nilai Kontrak Layanan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold font-mono bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {pricingType === 'monthly_subscription'
                      ? 'Estimasi tagihan per bulan'
                      : pricingType === 'annual_subscription'
                      ? 'Estimasi tagihan per tahun'
                      : 'Total nilai perikatan 1x bayar'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kebutuhan Spesifik / Batas Waktu Klien
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Perlu pendampingan untuk membalas surat SP2DK atau persiapan audit laporan keuangan akhir tahun."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Mengirimkan Data...</span>
                  ) : (
                    <>
                      <span>Kirim Pendaftaran &amp; Dapatkan Jadwal Konsultasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
