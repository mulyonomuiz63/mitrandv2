import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, FileText, CheckCircle2, DollarSign, Calendar, Copy, Check, ArrowRight, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { compressAndUploadFile, isAllowedVerificationDocumentFile } from '../utils/fileCompressor';
import {
  Mitra,
  ServiceItem,
  ClientDeal,
  AppSettings,
  DynamicFormField,
  ClientSystemFieldKey,
  resolveClientFormFields,
  calculateClientDealCommission,
  OFFICIAL_ND_SERVICES,
  resolveServicePricingType,
  isMitraDataIncomplete,
} from '../types';
import { MonthYearPicker, MONTH_NAMES_ID } from './MonthYearPicker';
import { useConfirm } from './ConfirmDialogModal';

interface ClientInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMitra: Mitra;
  onDealAdded?: (newDeal: ClientDeal) => void;
  onOpenProfile?: () => void;
  settings?: AppSettings | null;
}

export const ClientInputModal: React.FC<ClientInputModalProps> = ({
  isOpen,
  onClose,
  currentMitra,
  onDealAdded,
  onOpenProfile,
  settings,
}) => {
  const confirm = useConfirm();
  const [services, setServices] = useState<ServiceItem[]>(OFFICIAL_ND_SERVICES);
  const [dynamicSettings, setDynamicSettings] = useState<AppSettings | null>(settings || null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(OFFICIAL_ND_SERVICES[0]?.id || '');
  const [companyName, setCompanyName] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  const [dealValue, setDealValue] = useState<number>(0);
  const [pricingType, setPricingType] = useState<'case_by_case' | 'monthly_subscription' | 'annual_subscription'>(
    resolveServicePricingType(OFFICIAL_ND_SERVICES[0])
  );
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false);
  
  // Interactive Month & Year Picker state (No manual typing)
  const [startMonth, setStartMonth] = useState<number>(2); // Februari
  const [startYear, setStartYear] = useState<number>(2024);
  const [endMonth, setEndMonth] = useState<number>(4); // April
  const [endYear, setEndYear] = useState<number>(2025);
  
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [billingDayOfMonth, setBillingDayOfMonth] = useState<number>(() => new Date().getDate());
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [lastSubmittedDeal, setLastSubmittedDeal] = useState<ClientDeal | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  const resetFormFields = (serviceList: ServiceItem[] = services) => {
    setCompanyName('');
    setPicName('');
    setPicPhone('');
    setPicEmail('');
    setNotes('');
    setCustomFields({});
    setIsCustomPeriod(false);
    setStartMonth(2);
    setStartYear(2024);
    setEndMonth(4);
    setEndYear(2025);
    const todayStr = new Date().toISOString().split('T')[0];
    setSubscriptionStartDate(todayStr);
    setBillingDayOfMonth(new Date().getDate());
    setErrorMessage('');
    if (serviceList.length > 0) {
      setSelectedServiceId(serviceList[0].id);
      setDealValue(0);
      setPricingType(resolveServicePricingType(serviceList[0]));
    }
  };

  // Fetch available services & reset form every time modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmissionSuccess(false);
      setLastSubmittedDeal(null);
      resetFormFields();
      setLoadingServices(true);
      Promise.all([
        fetch('/api/services').then((res) => res.json()),
        fetch('/api/settings').then((res) => res.json()).catch(() => null),
      ])
        .then(([data, settingsRes]) => {
          if (data.success && data.data && data.data.length > 0) {
            setServices(data.data);
            resetFormFields(data.data);
          }
          if (settingsRes?.success && settingsRes?.data) {
            setDynamicSettings(settingsRes.data);
          }
        })
        .catch((err) => console.error('Error fetching services:', err))
        .finally(() => setLoadingServices(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const lockedPricingType = resolveServicePricingType(selectedService);
  const effectivePricingType = selectedService ? lockedPricingType : pricingType;
  const commissionCalc = calculateClientDealCommission(
    effectivePricingType,
    dealValue,
    dynamicSettings?.commissionScheme
  );
  const commissionRate = commissionCalc.initialRate;
  const estimatedCommission = commissionCalc.initialAmount;

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedServiceId(sId);
    const s = services.find((srv) => srv.id === sId);
    if (s) {
      setPricingType(resolveServicePricingType(s));
    }
  };

  const handleCopyReferral = () => {
    if (currentMitra.referralCode) {
      navigator.clipboard.writeText(currentMitra.referralCode);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const autoDuration = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
  const autoPeriodStart = `${MONTH_NAMES_ID[startMonth - 1] || 'Januari'} ${startYear}`;
  const autoPeriodEnd = `${MONTH_NAMES_ID[endMonth - 1] || 'Desember'} ${endYear}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || (isSysActive('companyName') && !companyName.trim())) {
      setErrorMessage('Mohon lengkapi nama perusahaan klien dan jenis layanan.');
      return;
    }

    for (const field of activeClientCustomFields) {
      if (field.required && !String(customFields[field.label] || '').trim()) {
        setErrorMessage(`Mohon lengkapi kolom wajib: "${field.label}".`);
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

    const ok = await confirm({
      title: 'Konfirmasi Input Data Klien Referral',
      message: `Apakah Anda yakin ingin mendaftarkan klien "${finalCompanyName}" untuk direview dan di-approve oleh Admin?`,
      detail: `Perusahaan Klien: ${finalCompanyName}\nNama PIC: ${finalPicName} (${finalPicPhone || '-'})\nLayanan: ${selectedService?.name || '-'}\nNilai Kontrak: Rp ${Number(dealValue).toLocaleString('id-ID')}\nSkema Komisi Klien: ${commissionCalc.tierLabel}\nEstimasi Komisi Closing: Rp ${estimatedCommission.toLocaleString('id-ID')}${pricingType !== 'case_by_case' ? `\nKomisi Langganan Bulan Berikutnya (${commissionCalc.recurringRate}%): Rp ${commissionCalc.recurringAmount.toLocaleString('id-ID')}/siklus` : ''}`,
      confirmText: 'Ya, Daftarkan Klien',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraId: currentMitra.id,
          companyName: finalCompanyName,
          picName: finalPicName,
          picPhone: finalPicPhone,
          picEmail: finalPicEmail,
          serviceId: selectedServiceId,
          dealValue: Number(dealValue),
          pricingType: effectivePricingType,
          status: 'pending_acc',
          subscriptionStartDate: effectivePricingType !== 'case_by_case' ? subscriptionStartDate : undefined,
          billingDayOfMonth: effectivePricingType !== 'case_by_case' ? Number(billingDayOfMonth) : undefined,
          periodStart: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoPeriodStart : undefined,
          periodEnd: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoPeriodEnd : undefined,
          durationMonths: effectivePricingType === 'case_by_case' && isCustomPeriod ? autoDuration : undefined,
          paymentTermType: 'one_time',
          notes: finalNotes,
          customFields: Object.keys(cleanedCustomFields).length > 0 ? cleanedCustomFields : undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLastSubmittedDeal(result.data);
        resetFormFields(services);
        setSubmissionSuccess(true);
        if (onDealAdded) {
          onDealAdded(result.data);
        }
      } else {
        setErrorMessage(result.message || 'Gagal menyimpan data klien.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan deal klien.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-400/30 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* FIXED STICKY HEADER (Mitra ID Card Theme) */}
        <div className="shrink-0 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] border-b border-amber-400/30 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-300 hover:text-amber-300 transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold tracking-tight text-white">
            Input Data Klien
          </h2>
        </div>

        {/* Modal Content / Form Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {currentMitra.status !== 'verified' ? (
            <div className="flex-1 overflow-y-auto p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-block px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                  Menunggu Verifikasi Admin
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Fitur Input Klien &amp; Kode Referral Belum Aktif
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Akun kemitraan Anda saat ini masih dalam proses peninjauan oleh Admin. Kode referral dan input data klien baru akan aktif secara otomatis setelah akun Anda <strong>di-approve oleh Admin</strong>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          ) : isMitraDataIncomplete(currentMitra) ? (
            <div className="flex-1 overflow-y-auto p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-block px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                  Data Diri Belum Lengkap
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Lengkapi Data Diri Terlebih Dahulu
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sebelum dapat melakukan penambahan klien maupun menyalin dan membagikan tautan registrasi klien, silakan lengkapi <strong>Data Diri</strong> (NIK KTP, Upload File KTP/NPWP, Nomor WhatsApp, serta Rekening Bank Pencairan Komisi) terlebih dahulu.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="px-5 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl transition-all cursor-pointer"
                  >
                    Lengkapi Data Diri Sekarang
                  </button>
                )}
              </div>
            </div>
          ) : submissionSuccess ? (
            <div className="flex-1 overflow-y-auto p-6 py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 mb-2 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                  ⏳ Status: Sedang Ditinjau Admin
                </span>
                <h3 className="text-xl font-bold text-slate-900">Data Klien Berhasil Dikirim untuk Ditinjau Admin!</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Data klien <strong className="text-slate-800">{lastSubmittedDeal?.companyName}</strong> telah terikat dengan kode referral <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{currentMitra.referralCode}</span> dan saat ini sedang direview oleh Admin.
                </p>
              </div>

              {/* Commission Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2.5">
                <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                  <span>Skema Layanan:</span>
                  <span className="font-bold text-slate-800">
                    {lastSubmittedDeal?.pricingType === 'monthly_subscription'
                      ? 'Langganan Bulanan (Recurring)'
                      : lastSubmittedDeal?.pricingType === 'annual_subscription'
                      ? 'Langganan Tahunan'
                      : 'Case-by-Case (1x Bayar)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-600">Komisi Masuk Saat Ini:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Rp 0 (Menunggu Approve Admin)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Potensi Komisi (Jika Deal Di-Approve):</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    Rp {(lastSubmittedDeal?.commissionAmount || estimatedCommission).toLocaleString('id-ID')}
                    {lastSubmittedDeal?.pricingType === 'monthly_subscription' && <span className="text-xs text-slate-500 font-normal"> / bln</span>}
                    {lastSubmittedDeal?.pricingType === 'annual_subscription' && <span className="text-xs text-slate-500 font-normal"> / thn</span>}
                  </span>
                </div>
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 p-2.5 rounded-lg leading-relaxed">
                  ℹ️ <strong>Penting:</strong> Komisi baru akan masuk ke saldo Anda setelah Admin melakukan review, konfirmasi dengan klien, dan melakukan <strong>Approve (Deal)</strong>. Jika tidak deal / ditolak, maka komisi tetap Rp 0.
                </p>
              </div>

              <div className="pt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    resetFormFields(services);
                    setLastSubmittedDeal(null);
                    setSubmissionSuccess(false);
                  }}
                  className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  + Input Klien Lainnya (Form Baru)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetFormFields(services);
                    setLastSubmittedDeal(null);
                    setSubmissionSuccess(false);
                    onClose();
                  }}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
                >
                  Tutup &amp; Kembali ke Portal
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* SCROLLABLE FORM FIELDS */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                
                {/* Referral Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    REF
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-900">Kode Referral Mitra Anda:</div>
                    <div className="font-mono font-bold text-blue-800 text-base tracking-wider">
                      {currentMitra.referralCode || 'ND-REF-0042'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors shadow-xs"
                  >
                    {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReferral ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    (Otomatis tersemat di transaksi ini)
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Client Organization & PIC Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isSysActive('companyName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('companyName')?.label || 'Nama Perusahaan / Entitas Klien'}{' '}
                      {getSysField('companyName')?.required !== false && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required={getSysField('companyName')?.required !== false}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={
                          getSysField('companyName')?.placeholder ||
                          'Contoh: PT Surya Kencana Abadi'
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('picName')?.label || 'Nama PIC / Direktur Penanggung Jawab'}{' '}
                      {getSysField('picName')?.required !== false && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required={getSysField('picName')?.required !== false}
                        value={picName}
                        onChange={(e) => setPicName(e.target.value)}
                        placeholder={
                          getSysField('picName')?.placeholder ||
                          'Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)'
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picPhone') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('picPhone')?.label || 'Nomor WhatsApp / HP PIC'}{' '}
                      {getSysField('picPhone')?.required !== false && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required={getSysField('picPhone')?.required !== false}
                        value={picPhone}
                        onChange={(e) => setPicPhone(e.target.value)}
                        placeholder={getSysField('picPhone')?.placeholder || '0812-XXXX-XXXX'}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}

                {isSysActive('picEmail') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('picEmail')?.label || 'Email PIC / Kantor Klien'}{' '}
                      {getSysField('picEmail')?.required && (
                        <span className="text-rose-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required={Boolean(getSysField('picEmail')?.required)}
                        value={picEmail}
                        onChange={(e) => setPicEmail(e.target.value)}
                        placeholder={
                          getSysField('picEmail')?.placeholder || 'finance@suryakencana.co.id'
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Dynamic Custom Fields for Client (Managed by Admin) */}
                {activeClientCustomFields.map((field) => (
                  <div
                    key={field.id}
                    className={
                      field.type === 'textarea' || field.type === 'file' ? 'md:col-span-2' : ''
                    }
                  >
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.type === 'file' ? (
                      <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs text-slate-600 truncate">
                          {customFields[field.label] ? (
                            <span className="font-bold text-emerald-700">
                              ✓ File sudah diunggah
                            </span>
                          ) : (
                            <span>{field.placeholder || 'Format: JPG, JPEG, PNG, atau PDF'}</span>
                          )}
                        </div>
                        <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
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
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      >
                        <option value="">-- Pilih {field.label} --</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
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
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
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
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Service Selection & Pricing Type */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Paket Layanan & Skema Finansial
                  </h4>
                  <span className="text-xs text-slate-500">
                    Katalog dinamis dikelola Admin
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Layanan Pajak / Akuntansi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={handleServiceChange}
                      disabled={loadingServices}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    >
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Model Pembayaran &amp; Skema Komisi Klien
                      </label>
                      <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        Otomatis mengikuti jenis layanan ({effectivePricingType === 'monthly_subscription' ? 'Langganan Bulanan' : effectivePricingType === 'annual_subscription' ? 'Langganan Tahunan' : 'Case-by-Case / Per Projek'})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        disabled={effectivePricingType !== 'case_by_case'}
                        onClick={() => {
                          if (effectivePricingType === 'case_by_case') setPricingType('case_by_case');
                        }}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          effectivePricingType === 'case_by_case'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-bold text-sm block">⚡ Case-by-Case (Per Projek)</span>
                        <span className={`block text-[11px] mt-0.5 ${effectivePricingType === 'case_by_case' ? 'text-blue-100' : 'text-slate-400'}`}>
                          1x Bayar (Per Projek / Multi-Bulan)
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={effectivePricingType !== 'monthly_subscription'}
                        onClick={() => {
                          if (effectivePricingType === 'monthly_subscription') setPricingType('monthly_subscription');
                        }}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          effectivePricingType === 'monthly_subscription'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-bold text-sm block">🔄 Langganan Bulanan</span>
                        <span className={`block text-[11px] mt-0.5 ${effectivePricingType === 'monthly_subscription' ? 'text-blue-100' : 'text-slate-400'}`}>
                          Komisi tiap siklus bulanan
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={effectivePricingType !== 'annual_subscription'}
                        onClick={() => {
                          if (effectivePricingType === 'annual_subscription') setPricingType('annual_subscription');
                        }}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          effectivePricingType === 'annual_subscription'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-bold text-sm block">📅 Langganan Tahunan</span>
                        <span className={`block text-[11px] mt-0.5 ${effectivePricingType === 'annual_subscription' ? 'text-blue-100' : 'text-slate-400'}`}>
                          Annual Retainer Perikatan
                        </span>
                      </button>
                    </div>

                    {/* Subscription Start Date & Recurring Billing Day */}
                    {(effectivePricingType === 'monthly_subscription' || effectivePricingType === 'annual_subscription') && (
                      <div className="mt-3 p-3.5 bg-white rounded-xl border border-blue-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tanggal Mulai Langganan
                          </label>
                          <input
                            type="date"
                            value={subscriptionStartDate}
                            onChange={(e) => {
                              setSubscriptionStartDate(e.target.value);
                              if (e.target.value) {
                                const day = Number(e.target.value.split('-')[2]);
                                if (day >= 1 && day <= 31) setBillingDayOfMonth(day);
                              }
                            }}
                            className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jadwal Tagihan Rutin (Setiap Tanggal)
                          </label>
                          <select
                            value={billingDayOfMonth}
                            onChange={(e) => setBillingDayOfMonth(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Setiap Tanggal {d} ({effectivePricingType === 'annual_subscription' ? 'Tahunan' : 'Bulanan'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Case by case custom multi-month period section */}
                    {effectivePricingType === 'case_by_case' && (
                      <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={isCustomPeriod}
                            onChange={(e) => setIsCustomPeriod(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Atur Rentang Bulan &amp; Tahun Perikatan (Opsional: Multi-Bulan Sekali Bayar)</span>
                        </label>

                        {isCustomPeriod && (
                          <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Click-to-select Month & Year (No manual typing) */}
                              <MonthYearPicker
                                label="Bulan & Tahun Mulai Perikatan"
                                selectedMonth={startMonth}
                                selectedYear={startYear}
                                onChange={(m, y) => {
                                  setStartMonth(m);
                                  setStartYear(y);
                                }}
                              />

                              <MonthYearPicker
                                label="Bulan & Tahun Selesai Perikatan"
                                selectedMonth={endMonth}
                                selectedYear={endYear}
                                onChange={(m, y) => {
                                  setEndMonth(m);
                                  setEndYear(y);
                                }}
                              />
                            </div>

                            {/* Auto-calculated contract duration */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                                  Total Durasi Terhitung Otomatis
                                </span>
                                <span className="text-xs text-slate-700 font-medium">
                                  Periode: <strong className="text-blue-800">{autoPeriodStart}</strong> s/d <strong className="text-blue-800">{autoPeriodEnd}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600">Durasi:</span>
                                <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-md shadow-xs">
                                  {autoDuration} Bulan
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deal Nominal Value (Mitra can custom input) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nominal Kesepakatan Kontrak (Rp) <span className="text-slate-500 font-normal">(Dapat disesuaikan)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={String(dealValue)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const cleaned = digits.replace(/^0+(?=\d)/, '');
                          setDealValue(cleaned === '' ? 0 : Number(cleaned));
                        }}
                        className="w-full pl-10 pr-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {effectivePricingType === 'monthly_subscription'
                        ? 'Nominal tagihan retensi per bulan ke klien.'
                        : effectivePricingType === 'annual_subscription'
                        ? 'Nominal tagihan retensi per tahun ke klien.'
                        : 'Total nilai kontrak satu kali pengerjaan (Per Projek / Case-by-Case).'}
                    </p>
                  </div>

                  {/* Calculated Commission Preview Box (Per-Client Tier System) */}
                  <div className="p-3.5 bg-gradient-to-br from-[#092147] via-[#113872] to-[#061835] text-white border border-amber-400/40 rounded-xl flex flex-col justify-between shadow-md">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                        <span>Komisi Deal Klien ({commissionRate}%):</span>
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold rounded">
                          {commissionCalc.tierLabel}
                        </span>
                      </div>
                      <div className="text-xl font-extrabold text-white mt-1 font-mono tracking-tight">
                        Rp {estimatedCommission.toLocaleString('id-ID')}
                        {effectivePricingType !== 'case_by_case' && (
                          <span className="text-xs font-normal text-amber-300"> (Bulan ke-1)</span>
                        )}
                      </div>
                      {effectivePricingType !== 'case_by_case' && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100">
                          <span>Komisi Langganan Bulan Berikutnya ({commissionCalc.recurringRate}%):</span>
                          <span className="font-mono font-bold text-emerald-300">
                            Rp {commissionCalc.recurringAmount.toLocaleString('id-ID')} / siklus
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-100/90 mt-2 leading-tight">
                      {effectivePricingType !== 'case_by_case'
                        ? `✔️ Langganan: <5 Jt (10%), 5–10 Jt (15%), ≥10 Jt (20%). Selama klien aktif langganan bulan berikutnya tetap dapat ${commissionCalc.recurringRate}% (dikunci sesuai komisi waktu deal).`
                        : '✔️ Case-by-Case (Per Projek): <50 Jt (10%), 50–100 Jt (15%), ≥100 Jt (20%). Komisi dikunci sesuai kesepakatan waktu deal.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Project Notes */}
              {isSysActive('notes') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {getSysField('notes')?.label || 'Catatan Tambahan & Kebutuhan Spesifik Klien'}{' '}
                    {getSysField('notes')?.required && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    required={Boolean(getSysField('notes')?.required)}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      getSysField('notes')?.placeholder ||
                      'Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP.'
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  />
                </div>
              )}
            </div>

            {/* FIXED BOTTOM FOOTER BUTTONS */}
              <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <span>Simpan</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
