import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Check,
  ChevronLeft,
  Calendar,
  Lock,
  Upload
} from 'lucide-react';
import { compressAndUploadFile, isAllowedVerificationDocumentFile } from '../utils/fileCompressor';
import {
  ServiceItem,
  Mitra,
  AppSettings,
  DynamicFormField,
  ClientSystemFieldKey,
  resolveClientFormFields,
  OFFICIAL_ND_SERVICES,
  resolveServicePricingType,
} from '../types';
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
  const [services, setServices] = useState<ServiceItem[]>(OFFICIAL_ND_SERVICES);
  const [dynamicSettings, setDynamicSettings] = useState<AppSettings | null>(settings || null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(OFFICIAL_ND_SERVICES[0]?.id || '');
  const [pricingType, setPricingType] = useState<'case_by_case' | 'monthly_subscription' | 'annual_subscription'>(
    resolveServicePricingType(OFFICIAL_ND_SERVICES[0])
  );
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

  const allClientFields = React.useMemo(
    () => resolveClientFormFields(dynamicSettings),
    [dynamicSettings]
  );
  const getSysField = React.useCallback(
    (key: ClientSystemFieldKey) => allClientFields.find((f) => f.systemKey === key),
    [allClientFields]
  );
  const isSysActive = React.useCallback(
    (key: ClientSystemFieldKey) => {
      const f = getSysField(key);
      return f ? f.isActive !== false : false;
    },
    [getSysField]
  );

  const activeClientCustomFields: DynamicFormField[] = React.useMemo(
    () => allClientFields.filter((f) => !f.systemKey && f.isActive !== false),
    [allClientFields]
  );

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
          setPricingType(resolveServicePricingType(resServices.data[0]));
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

  const selectedServiceObj = services.find((srv) => srv.id === selectedServiceId);
  const effectivePricingType = selectedServiceObj
    ? resolveServicePricingType(selectedServiceObj)
    : pricingType;

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedServiceId(sId);
    const s = services.find((srv) => srv.id === sId);
    if (s) {
      setDealValue(s.defaultPrice);
      setPricingType(resolveServicePricingType(s));
    }
  };

  const autoDuration = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
  const autoPeriodStart = `${MONTH_NAMES_ID[startMonth - 1] || 'Januari'} ${startYear}`;
  const autoPeriodEnd = `${MONTH_NAMES_ID[endMonth - 1] || 'Desember'} ${endYear}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || (isSysActive('companyName') && !companyName.trim())) {
      setErrorMsg('Mohon lengkapi nama perusahaan dan layanan.');
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

    const finalCompanyName = companyName.trim() || picName.trim() || 'Klien Referral NDTAXANDLAW';
    const finalPicName = isSysActive('picName') ? picName.trim() || finalCompanyName : '-';
    const finalPicPhone = isSysActive('picPhone') ? picPhone.trim() : '-';
    const finalPicEmail = isSysActive('picEmail') ? picEmail.trim() : '';
    const finalNotes = isSysActive('notes') ? notes.trim() : '';

    const selectedService = services.find((s) => s.id === selectedServiceId);
    const ok = await confirm({
      title: 'Konfirmasi Pendaftaran Layanan Klien',
      message: `Apakah data perusahaan "${finalCompanyName}" yang Anda isi sudah benar dan siap dikirimkan ke tim konsultan NDTAXANDLAW?`,
      detail: `Perusahaan: ${finalCompanyName}\nNama PIC: ${finalPicName} (${finalPicPhone})\nLayanan Dipilih: ${selectedService?.name || '-'}\nEstimasi Nilai Kontrak: Rp ${Number(dealValue).toLocaleString('id-ID')}`,
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
          companyName: finalCompanyName,
          picName: finalPicName,
          picPhone: finalPicPhone,
          picEmail: finalPicEmail,
          serviceId: selectedServiceId,
          dealValue: Number(dealValue),
          pricingType: effectivePricingType,
          periodStart: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoPeriodStart : undefined,
          periodEnd: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoPeriodEnd : undefined,
          durationMonths: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoDuration : undefined,
          notes: finalNotes,
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
    <div className="min-h-screen bg-gradient-to-br from-[#092147] via-[#113872] to-[#061835] text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        
        {/* Top Header & Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-amber-400/30 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-sm">
              <img
                src={dynamicSettings?.logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
                alt="NDTAXANDLAW Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block border-l border-amber-400/30 pl-3">
              <span className="text-xs font-bold text-amber-300 block uppercase tracking-wider">
                NDTAXANDLAW Portal Klien
              </span>
              <span className="text-[10px] text-blue-100">
                Formulir Mandiri Layanan Pajak &amp; Laporan Keuangan
              </span>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-white transition-colors bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-amber-400/40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        {!loading && dynamicSettings?.allowClientSelfRegister === false ? (
          <div className="bg-[#092147]/90 border border-rose-500/40 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <span className="inline-block px-3 py-1 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full uppercase">
                Akses Tautan Dinonaktifkan
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Pendaftaran Mandiri Klien Tidak Tersedia
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Fitur pendaftaran mandiri klien melalui tautan referral saat ini sedang dinonaktifkan oleh Administrator NDTAXANDLAW. Silakan hubungi Mitra pendamping Anda secara langsung untuk pendaftaran layanan.
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
        ) : !loading && (!mitra || mitra.status !== 'verified') ? (
          <div className="bg-[#092147]/90 border border-amber-400/40 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
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
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
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
          <div className="bg-[#092147]/90 border border-amber-400/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">
                Pendaftaran Klien Berhasil Diterima!
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 max-w-lg mx-auto leading-relaxed">
                Terima kasih, data perusahaan <strong>{companyName || picName || 'Klien'}</strong> telah berhasil didaftarkan ke tim konsultan NDTAXANDLAW.
              </p>
            </div>

            <div className="bg-[#061835]/90 border border-amber-400/30 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between text-blue-200 pb-2 border-b border-white/10">
                <span>Mitra Pendamping:</span>
                <span className="font-bold text-white">{mitra ? mitra.fullName : 'Mitra Terdaftar'}</span>
              </div>
              <div className="flex justify-between text-blue-200 pb-2 border-b border-white/10">
                <span>Status Verifikasi:</span>
                <span className="font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded border border-amber-400/30">
                  Menunggu Validasi Admin (ACC)
                </span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span>Estimasi Tindak Lanjut:</span>
                <span className="text-white font-semibold">Maksimal 1x24 Jam Kerja</span>
              </div>
            </div>

            <p className="text-xs text-blue-200 max-w-md mx-auto">
              Tim Konsultan Pajak NDTAXANDLAW akan segera menghubungi nomor WhatsApp <strong>{picPhone || 'PIC'}</strong> untuk konfirmasi berkas dan jadwal kickoff konsultasi.
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
          <div className="bg-[#092147]/90 border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            
            {/* Verified Referral Badge Banner */}
            <div className="p-4 bg-gradient-to-r from-[#061835] via-[#113872] to-[#092147] border border-amber-400/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-md shrink-0">
                  REF
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    Tautan Rekomendasi Resmi
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {mitra ? mitra.fullName : 'Mitra Terdaftar NDTAXANDLAW'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                Referral Terverifikasi
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Formulir Pendaftaran Klien Baru
              </h1>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Company & PIC Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isSysActive('companyName') && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      {getSysField('companyName')?.label || 'Nama Perusahaan / Entitas Bisnis'}{' '}
                      {getSysField('companyName')?.required !== false && (
                        <span className="text-rose-400">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-amber-300/70 absolute left-3 top-3" />
                      <input
                        type="text"
                        required={getSysField('companyName')?.required !== false}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={
                          getSysField('companyName')?.placeholder || 'Nama perusahaan'
                        }
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picName') && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      {getSysField('picName')?.label || 'Nama PIC / Penanggung Jawab'}{' '}
                      {getSysField('picName')?.required !== false && (
                        <span className="text-rose-400">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-amber-300/70 absolute left-3 top-3" />
                      <input
                        type="text"
                        required={getSysField('picName')?.required !== false}
                        value={picName}
                        onChange={(e) => setPicName(e.target.value)}
                        placeholder={
                          getSysField('picName')?.placeholder || 'Nama PIC'
                        }
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picPhone') && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      {getSysField('picPhone')?.label || 'Nomor WhatsApp / HP PIC'}{' '}
                      {getSysField('picPhone')?.required !== false && (
                        <span className="text-rose-400">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-amber-300/70 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required={getSysField('picPhone')?.required !== false}
                        value={picPhone}
                        onChange={(e) => setPicPhone(e.target.value)}
                        placeholder={getSysField('picPhone')?.placeholder || '0812xxxx'}
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picEmail') && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      {getSysField('picEmail')?.label || 'Email Kantor / PIC'}{' '}
                      {getSysField('picEmail')?.required && <span className="text-rose-400">*</span>}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-amber-300/70 absolute left-3 top-3" />
                      <input
                        type="email"
                        required={Boolean(getSysField('picEmail')?.required)}
                        value={picEmail}
                        onChange={(e) => setPicEmail(e.target.value)}
                        placeholder={
                          getSysField('picEmail')?.placeholder || 'email@perusahaan.com'
                        }
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Dynamic Custom Fields for Client (Managed by Admin) */}
                {activeClientCustomFields.map((field) => (
                  <div
                    key={field.id}
                    className={
                      field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''
                    }
                  >
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      {field.label} {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.type === 'file' ? (
                      <div className="p-3 rounded-xl bg-[#061835] border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs text-blue-100 truncate">
                          {customFields[field.label] ? (
                            <span className="font-bold text-emerald-300">
                              ✓ File sudah diunggah
                            </span>
                          ) : (
                            <span>{field.placeholder || 'JPG, PNG, atau PDF'}</span>
                          )}
                        </div>
                        <label className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {customFields[field.label] ? 'Ganti File' : 'Upload File'}
                          </span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (!isAllowedVerificationDocumentFile(f)) return;
                              try {
                                const compressed = await compressAndUploadFile(f, {
                                  maxDimension: 1400,
                                  quality: 0.78,
                                  uploadToServer: true,
                                });
                                setCustomFields((prev) => ({
                                  ...prev,
                                  [field.label]: compressed.hostedUrl || compressed.dataUrl,
                                }));
                              } catch {}
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={customFields[field.label] || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="" className="bg-[#061835] text-slate-400">
                          -- Pilih {field.label} --
                        </option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt} className="bg-[#061835] text-white">
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
                        placeholder={field.placeholder || `Isi ${field.label}`}
                        className="w-full px-3 py-2 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        required={field.required}
                        value={customFields[field.label] || ''}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        placeholder={field.placeholder || `Isi ${field.label}`}
                        className="w-full px-3 py-2.5 text-sm bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Service Selection */}
              <div className="p-4 bg-[#061835]/90 border border-amber-400/30 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Layanan Pajak &amp; Akuntansi yang Dibutuhkan
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-200 mb-1">
                    Pilih Paket Layanan
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2.5 text-sm bg-[#092147] border border-amber-400/30 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id} className="bg-[#061835] text-white">
                        {srv.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Case by case custom multi-month period */}
                {effectivePricingType === 'case_by_case' && (
                  <div className="p-3.5 bg-[#092147]/90 rounded-2xl border border-amber-400/30 shadow-sm space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-blue-100">
                      <input
                        type="checkbox"
                        checked={isCustomPeriod}
                        onChange={(e) => setIsCustomPeriod(e.target.checked)}
                        className="rounded border-amber-400/40 bg-[#061835] text-amber-400 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                      />
                      <span>Atur Rentang Bulan &amp; Tahun Perikatan (Opsional: Multi-Bulan Sekali Bayar)</span>
                    </label>

                    {isCustomPeriod && (
                      <div className="pt-2 border-t border-amber-400/20 space-y-3 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="p-3 bg-[#061835] border border-amber-400/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                              Total Durasi Terhitung Otomatis
                            </span>
                            <span className="text-xs text-blue-100 font-medium">
                              Periode: <strong className="text-white">{autoPeriodStart}</strong> s/d <strong className="text-white">{autoPeriodEnd}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-200">Durasi:</span>
                            <span className="px-3 py-1 bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-md shadow-xs">
                              {autoDuration} Bulan
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-blue-200 leading-relaxed">
                          ℹ️ Durasi perikatan terisi otomatis dari rentang bulan &amp; tahun yang Anda pilih tanpa perlu input manual. Pembayaran bersifat sekali bayar (case-by-case).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-amber-200 mb-1">
                    Perkiraan Anggaran / Nilai Kontrak Layanan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold font-mono bg-[#092147] border border-amber-400/30 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-[10px] text-blue-200 mt-0.5 block">
                    {effectivePricingType === 'monthly_subscription'
                      ? 'Estimasi tagihan per bulan'
                      : effectivePricingType === 'annual_subscription'
                      ? 'Estimasi tagihan per tahun'
                      : 'Total nilai perikatan 1x bayar (Per Projek / Case-by-Case)'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {isSysActive('notes') && (
                <div>
                  <label className="block text-xs font-semibold text-amber-200 mb-1">
                    {getSysField('notes')?.label || 'Kebutuhan Spesifik / Batas Waktu Klien'}{' '}
                    {getSysField('notes')?.required && <span className="text-rose-400">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    required={Boolean(getSysField('notes')?.required)}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      getSysField('notes')?.placeholder || 'Catatan kebutuhan...'
                    }
                    className="w-full px-3 py-2 text-xs bg-[#061835] border border-amber-400/30 rounded-xl text-white placeholder-blue-300/50 focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Mengirimkan Data...</span>
                  ) : (
                    <>
                      <span>Kirim Pendaftaran</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Copyright Footer */}
        <div className="mt-8 pt-6 border-t border-amber-400/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200/80">
          <div className="flex items-center gap-2">
            <img
              src={dynamicSettings?.logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
              alt="ND TAX AND LAW"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="text-center sm:text-right flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <span>{dynamicSettings?.copyrightText || 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.'}</span>
            {dynamicSettings?.appVersion && (
              <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 text-[10px] font-bold">
                {dynamicSettings.appVersion}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
