import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, FileText, CheckCircle2, DollarSign, Calendar, Copy, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Mitra, ServiceItem, ClientDeal } from '../types';
import { MonthYearPicker, MONTH_NAMES_ID } from './MonthYearPicker';

interface ClientInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMitra: Mitra;
  onDealAdded?: (newDeal: ClientDeal) => void;
}

export const ClientInputModal: React.FC<ClientInputModalProps> = ({
  isOpen,
  onClose,
  currentMitra,
  onDealAdded,
}) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  const [dealValue, setDealValue] = useState<number>(10000000);
  const [pricingType, setPricingType] = useState<'case_by_case' | 'monthly_subscription' | 'annual_subscription'>('case_by_case');
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false);
  
  // Interactive Month & Year Picker state (No manual typing)
  const [startMonth, setStartMonth] = useState<number>(2); // Februari
  const [startYear, setStartYear] = useState<number>(2024);
  const [endMonth, setEndMonth] = useState<number>(4); // April
  const [endYear, setEndYear] = useState<number>(2025);
  
  const [notes, setNotes] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch available services
  useEffect(() => {
    if (isOpen) {
      setLoadingServices(true);
      fetch('/api/services')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data && data.data.length > 0) {
            setServices(data.data);
            setSelectedServiceId(data.data[0].id);
            setDealValue(data.data[0].defaultPrice);
            setPricingType(data.data[0].pricingType);
          }
        })
        .catch((err) => console.error('Error fetching services:', err))
        .finally(() => setLoadingServices(false));
      
      // Reset form state
      setSubmissionSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const commissionRate = selectedService ? selectedService.commissionRate : 15;
  const estimatedCommission = Math.round((dealValue * commissionRate) / 100);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedServiceId(sId);
    const s = services.find((srv) => srv.id === sId);
    if (s) {
      setDealValue(s.defaultPrice);
      setPricingType(s.pricingType);
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
    if (!companyName.trim() || !picName.trim() || !selectedServiceId) {
      setErrorMessage('Mohon lengkapi nama perusahaan, penanggung jawab (PIC), dan jenis layanan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraId: currentMitra.id,
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
          paymentTermType: 'one_time',
          notes: notes.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* FIXED STICKY HEADER */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
              PORTAL DEAL KLIEN MITRA
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Tracking Komisi
            </span>
          </div>
          
          <h2 className="text-xl font-bold tracking-tight text-white">
            Input Data Klien &amp; Registrasi Proyek
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Data klien akan otomatis dihubungkan dengan Kode Referral Anda untuk penghitungan komisi closing atau royalti bulanan.
          </p>
        </div>

        {/* Modal Content / Form Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {submissionSuccess ? (
            <div className="flex-1 overflow-y-auto p-6 py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Data Klien Berhasil Didaftarkan!</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Proyek atas nama <strong className="text-slate-800">{companyName}</strong> telah terikat dengan kode referral <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{currentMitra.referralCode}</span>.
                </p>
              </div>

              {/* Commission Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
                <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                  <span>Skema Komisi:</span>
                  <span className="font-bold text-slate-800">
                    {pricingType === 'monthly_subscription' ? 'Langganan Bulanan (Recurring)' : pricingType === 'annual_subscription' ? 'Langganan Tahunan' : 'Case-by-Case (1x Bayar)'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Estimasi Komisi Mitra:</span>
                  <span className="font-bold text-emerald-600 text-base">
                    Rp {estimatedCommission.toLocaleString('id-ID')}
                    {pricingType === 'monthly_subscription' && <span className="text-xs text-slate-500 font-normal"> / bulan</span>}
                    {pricingType === 'annual_subscription' && <span className="text-xs text-slate-500 font-normal"> / tahun</span>}
                  </span>
                </div>
                {pricingType === 'monthly_subscription' && (
                  <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg leading-relaxed">
                    ℹ️ Komisi akan ditransfer setiap bulan ke rekening Anda selama klien tetap aktif menggunakan jasa perpajakan &amp; akuntansi NDTAXANDLAW.
                  </p>
                )}
              </div>

              <div className="pt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionSuccess(false);
                    setCompanyName('');
                    setPicName('');
                    setPicPhone('');
                    setPicEmail('');
                    setNotes('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Input Klien Lainnya
                </button>
                <button
                  type="button"
                  onClick={onClose}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Perusahaan / Entitas Klien <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: PT Surya Kencana Abadi"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC / Direktur Penanggung Jawab <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      placeholder="Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP PIC <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={picPhone}
                      onChange={(e) => setPicPhone(e.target.value)}
                      placeholder="0812-XXXX-XXXX"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email PIC / Kantor Klien
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={picEmail}
                      onChange={(e) => setPicEmail(e.target.value)}
                      placeholder="finance@suryakencana.co.id"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
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
                          {srv.name} ({srv.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Model Pembayaran &amp; Skema Komisi Klien
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPricingType('case_by_case')}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          pricingType === 'case_by_case'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-sm block">⚡ Case-by-Case</span>
                        <span className={`block text-[11px] mt-0.5 ${pricingType === 'case_by_case' ? 'text-blue-100' : 'text-slate-500'}`}>
                          1x Bayar (Proyek / Multi-Bulan)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPricingType('monthly_subscription')}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          pricingType === 'monthly_subscription'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-sm block">🔄 Langganan Bulanan</span>
                        <span className={`block text-[11px] mt-0.5 ${pricingType === 'monthly_subscription' ? 'text-blue-100' : 'text-slate-500'}`}>
                          Komisi tiap siklus bulanan
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPricingType('annual_subscription')}
                        className={`p-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          pricingType === 'annual_subscription'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-sm block">📅 Langganan Tahunan</span>
                        <span className={`block text-[11px] mt-0.5 ${pricingType === 'annual_subscription' ? 'text-blue-100' : 'text-slate-500'}`}>
                          Annual Retainer Perikatan
                        </span>
                      </button>
                    </div>

                    {/* Case by case custom multi-month period section */}
                    {pricingType === 'case_by_case' && (
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

                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              ℹ️ Durasi perikatan otomatis terhitung berdasarkan pilihan bulan dan tahun di atas. Meskipun perikatan mencakup multi-bulan (misal: Februari 2024 s/d April 2025 = 15 Bulan), skema transaksi tetap case-by-case (sekali bayar lunas, komisi mitra cair 1x).
                            </p>
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
                        type="number"
                        min="1000000"
                        step="500000"
                        value={dealValue}
                        onChange={(e) => setDealValue(Number(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {pricingType === 'monthly_subscription'
                        ? 'Nominal tagihan retensi per bulan ke klien.'
                        : pricingType === 'annual_subscription'
                        ? 'Nominal tagihan retensi per tahun ke klien.'
                        : 'Total nilai kontrak satu kali pengerjaan.'}
                    </p>
                  </div>

                  {/* Calculated Commission Preview Box */}
                  <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                        <span>Hak Komisi Mitra ({commissionRate}%):</span>
                        <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-900 text-[10px] font-bold rounded">
                          {pricingType === 'monthly_subscription' ? 'KOMISI BERULANG' : 'SEKALI CAIR'}
                        </span>
                      </div>
                      <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono tracking-tight">
                        Rp {estimatedCommission.toLocaleString('id-ID')}
                        {pricingType === 'monthly_subscription' && (
                          <span className="text-xs font-normal text-slate-600"> / bulan</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-900 mt-2 leading-tight">
                      {pricingType === 'monthly_subscription'
                        ? '✔️ Mitra menerima komisi ini setiap bulan selama kontrak klien masih aktif.'
                        : '✔️ Komisi dicairkan 1x penuh setelah pembayaran klien diverifikasi tim finance.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Project Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan & Kebutuhan Spesifik Klien
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                />
              </div>
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <span>Simpan Klien &amp; Tautkan Referral</span>
                      <ArrowRight className="w-4 h-4" />
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
