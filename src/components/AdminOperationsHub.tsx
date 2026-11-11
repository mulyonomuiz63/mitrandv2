import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Send,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Search,
  Filter,
  Repeat,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  Calendar,
  Upload,
  FileUp,
  Receipt,
  Download,
  Percent,
  Settings,
  Activity,
  Trash2,
  UserCheck,
  LogIn
} from 'lucide-react';
import { Mitra, ClientDeal, CommissionTransaction, PayoutRequest, ActivityLogItem, EmailLogItem } from '../types';
import { PayoutReceiptModal } from './PayoutReceiptModal';

export type AdminSubTab = 'client_validation' | 'mitra_analysis' | 'payout_management' | 'activity_logs' | 'email_logs';

interface AdminOperationsHubProps {
  mitras: Mitra[];
  clientDeals: ClientDeal[];
  commissions: CommissionTransaction[];
  onRefreshData: () => void;
  onOpenSettings?: () => void;
  initialSubTab?: AdminSubTab;
}

export const AdminOperationsHub: React.FC<AdminOperationsHubProps> = ({
  mitras,
  clientDeals,
  commissions,
  onRefreshData,
  onOpenSettings,
  initialSubTab = 'client_validation',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<'all' | 'pending_acc' | 'active_subscription' | 'deal_closed' | 'cancelled' | 'rejected'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Review & Confirm New Client Modal State
  const [dealToReview, setDealToReview] = useState<ClientDeal | null>(null);
  const [reviewStartDate, setReviewStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reviewBillingDay, setReviewBillingDay] = useState<number>(() => new Date().getDate());
  const [rejectReason, setRejectReason] = useState<string>('Tidak deal setelah konfirmasi dengan calon klien');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Terminate Subscription Modal State
  const [dealToTerminate, setDealToTerminate] = useState<ClientDeal | null>(null);
  const [terminationReason, setTerminationReason] = useState<string>('Klien berhenti berlangganan layanan');
  const [isTerminating, setIsTerminating] = useState(false);

  // Activity & Email Logs States
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [activityRoleFilter, setActivityRoleFilter] = useState<'all' | 'admin' | 'mitra'>('all');
  const [activityOpFilter, setActivityOpFilter] = useState<'all' | 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [activitySearch, setActivitySearch] = useState('');

  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Modal States
  const [payoutToApprove, setPayoutToApprove] = useState<PayoutRequest | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutRequest | null>(null);

  // Approval Form State (PPh 21, Admin Fee, Proof Upload)
  const [pphRate, setPphRate] = useState<number | ''>(2.5);
  const [pphNominal, setPphNominal] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(2500); // Default BI-FAST Rp 2.500
  const [transferRef, setTransferRef] = useState<string>('');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [proofFileUrl, setProofFileUrl] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Fetch payout requests
  const fetchPayoutRequests = async () => {
    setLoadingPayouts(true);
    try {
      const res = await fetch('/api/commissions/payout-requests');
      const data = await res.json();
      if (data.success && data.data) {
        setPayoutRequests(data.data);
      }
    } catch (err) {
      console.error('Error loading payout requests:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchActivityLogs = async () => {
    setLoadingActivityLogs(true);
    try {
      const res = await fetch('/api/activity-logs');
      const data = await res.json();
      if (data.success && data.data) {
        setActivityLogs(data.data);
      }
    } catch (err) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoadingActivityLogs(false);
    }
  };

  const fetchEmailLogs = async () => {
    setLoadingEmailLogs(true);
    try {
      const res = await fetch('/api/emails/logs');
      const data = await res.json();
      if (data.success && data.data) {
        setEmailLogs(data.data);
      }
    } catch (err) {
      console.error('Error loading email logs:', err);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  const handleResendEmailFromLog = async (logId: string) => {
    setResendingEmailId(logId);
    try {
      const res = await fetch(`/api/emails/resend/${logId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(data.message || 'Email berhasil dikirim ulang!');
      } else {
        setActionSuccessMsg(`Gagal kirim ulang: ${data.message || 'Cek pengaturan SMTP'}`);
      }
      setTimeout(() => setActionSuccessMsg(''), 4500);
      fetchEmailLogs();
    } catch {
      setActionSuccessMsg('Gagal menghubungi server untuk kirim ulang email.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } finally {
      setResendingEmailId(null);
    }
  };

  useEffect(() => {
    fetchPayoutRequests();
    fetchActivityLogs();
    fetchEmailLogs();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // 1. Open Review & Confirm Modal for New Client
  const openReviewModal = (deal: ClientDeal) => {
    setDealToReview(deal);
    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = deal.subscriptionStartDate || deal.date || todayStr;
    setReviewStartDate(startStr);
    const dayNum = deal.billingDayOfMonth || Number(startStr.split('-')[2]) || 1;
    setReviewBillingDay(dayNum);
    setRejectReason('Tidak deal setelah konfirmasi dengan calon klien');
  };

  // 1.1 Approve Client Deal (Direct or from Review Modal)
  const handleAccClient = async (dealId: string, customStartDate?: string, customBillingDay?: number) => {
    setProcessingId(dealId);
    setIsReviewSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${dealId}/acc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionStartDate: customStartDate,
          billingDayOfMonth: customBillingDay,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          `Klien "${data.data.companyName}" berhasil di-Approve (Deal)! Komisi Rp ${data.data.commissionAmount.toLocaleString('id-ID')} resmi masuk ke saldo siap cair Mitra ${data.data.mitraName}.`
        );
        setTimeout(() => setActionSuccessMsg(''), 4500);
        setDealToReview(null);
        fetchActivityLogs();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to ACC client:', err);
    } finally {
      setProcessingId(null);
      setIsReviewSubmitting(false);
    }
  };

  // 1.2 Reject Client Deal (Tidak Deal -> Mitra gets Rp 0 commission)
  const handleRejectClient = async (dealId: string, reasonText?: string) => {
    setProcessingId(dealId);
    setIsReviewSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${dealId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reasonText || rejectReason || 'Tidak deal setelah konfirmasi dengan calon klien',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          data.message || `Klien "${data.data.companyName}" ditolak (Tidak Deal). Mitra tidak mendapatkan komisi (Rp 0).`
        );
        setTimeout(() => setActionSuccessMsg(''), 4500);
        setDealToReview(null);
        fetchActivityLogs();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to reject client:', err);
    } finally {
      setProcessingId(null);
      setIsReviewSubmitting(false);
    }
  };

  // 1.9 Trigger Subscription Billing Time Arrived
  const handleTriggerBillingDue = async (dealId: string) => {
    setProcessingId(dealId);
    try {
      const res = await fetch(`/api/clients/${dealId}/trigger-billing-due`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(data.message || 'Waktu tagihan diaktifkan. Silakan klik Approve Pembayaran Langganan.');
        setTimeout(() => setActionSuccessMsg(''), 4000);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to trigger billing due:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Process Monthly or Annual Recurring Billing for Subscriber
  const handleConfirmRecurringBill = async (dealId: string, pricingType: string) => {
    setProcessingId(dealId);
    try {
      const res = await fetch(`/api/clients/${dealId}/bill-cycle`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        const cycleText = pricingType === 'annual_subscription'
          ? `tahun ke-${data.data.recurringPaidYears}`
          : `bulan ke-${data.data.recurringPaidMonths}`;
        setActionSuccessMsg(`Pembayaran ${cycleText} untuk "${data.data.companyName}" berhasil diverifikasi! Komisi mitra otomatis dicairkan.`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        fetchActivityLogs();
        onRefreshData();
      } else {
        setActionSuccessMsg(data.message || 'Gagal memproses siklus langganan.');
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to confirm recurring billing:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 2.5 Terminate Client Subscription (Stops Recurring Mitra Commission)
  const handleTerminateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealToTerminate) return;
    setIsTerminating(true);
    setProcessingId(dealToTerminate.id);
    try {
      const res = await fetch(`/api/clients/${dealToTerminate.id}/terminate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: terminationReason.trim() || 'Klien berhenti berlangganan layanan',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          data.message ||
            `Langganan klien "${dealToTerminate.companyName}" berhasil diputus. Mitra ${dealToTerminate.mitraName} otomatis tidak mendapatkan komisi lagi.`
        );
        setTimeout(() => setActionSuccessMsg(''), 5000);
        setDealToTerminate(null);
        setTerminationReason('Klien berhenti berlangganan layanan');
        fetchActivityLogs();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to terminate subscription:', err);
    } finally {
      setIsTerminating(false);
      setProcessingId(null);
    }
  };

  // 3. Open Approval Modal
  const openApproveModal = (payout: PayoutRequest) => {
    setPayoutToApprove(payout);
    const gross = payout.amount || 0;
    const defaultPph = Math.round((gross * 2.5) / 100);
    setPphRate(2.5);
    setPphNominal(defaultPph);
    setAdminFee(2500);
    setTransferRef(`TRX-BCA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setApprovalNotes(`Pencairan dana komisi ${payout.mitraName} via transfer bank lunas.`);
    setProofFileUrl('');
    setProofFileName('');
  };

  // Handle PPh Preset change
  const handlePphPresetChange = (percent: number) => {
    setPphRate(percent);
    if (!payoutToApprove) return;
    const calculated = Math.round((payoutToApprove.amount * percent) / 100);
    setPphNominal(calculated);
  };

  // File Upload Handler (PDF / JPG / PNG via FileReader)
  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setProofFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Approval with Deductions & Proof
  const handleSubmitPayoutApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutToApprove) return;

    setIsSubmittingApproval(true);
    const gross = payoutToApprove.amount || 0;
    const net = Math.max(0, gross - pphNominal - adminFee);

    try {
      const res = await fetch(`/api/commissions/payout-requests/${payoutToApprove.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pph21Deduction: pphNominal,
          pph21Rate: pphRate === '' ? 0 : pphRate,
          adminFeeDeduction: adminFee,
          netAmountTransferred: net,
          proofFileUrl: proofFileUrl || undefined,
          proofFileName: proofFileName || (proofFileUrl ? 'bukti_transfer.pdf' : undefined),
          transferRefNumber: transferRef,
          notes: approvalNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Pencairan dana untuk ${data.data.mitraName} berhasil disetujui! Bersih ditransfer: ${formatRupiah(net)} (Bukti tersimpan).`);
        setTimeout(() => setActionSuccessMsg(''), 5000);
        setPayoutToApprove(null);
        fetchPayoutRequests();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to approve payout:', err);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Filter clients
  const filteredDeals = clientDeals.filter((deal) => {
    const matchFilter = clientFilter === 'all' || deal.status === clientFilter;
    const matchSearch = deal.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.picName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.mitraName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingAccCount = clientDeals.filter((d) => d.status === 'pending_acc').length;
  const pendingPayoutCount = payoutRequests.filter((p) => p.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm border border-emerald-500/40 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
              PANEL ADMIN OPERASIONAL
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Validasi Klien &amp; Manajemen Dana Komisi
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            Pusat Operasional Klien &amp; Komisi Mitra
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Validasi deal referral mitra (case-by-case, langganan bulanan &amp; tahunan), atur ACC komisi, serta otorisasi pencairan saldo dengan bukti transfer &amp; rincian potongan PPh 21.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-blue-600" />
              <span>Pengaturan SMTP &amp; Sistem</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchPayoutRequests();
              fetchActivityLogs();
              fetchEmailLogs();
              onRefreshData();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('client_validation')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'client_validation'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Validasi &amp; ACC Klien</span>
          {pendingAccCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-mono font-black">
              {pendingAccCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mitra_analysis')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'mitra_analysis'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analisa Kinerja Mitra</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payout_management')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'payout_management'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Kelola Pencairan Komisi &amp; Bukti Transfer</span>
          {pendingPayoutCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-mono font-black">
              {pendingPayoutCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('activity_logs');
            fetchActivityLogs();
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'activity_logs'
              ? 'bg-indigo-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Log Aktivitas Mitra &amp; Admin</span>
          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-900 rounded-full text-[10px] font-mono font-black">
            {activityLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('email_logs');
            fetchEmailLogs();
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeSubTab === 'email_logs'
              ? 'bg-indigo-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Log Pengiriman Email</span>
          {emailLogs.filter((e) => e.status === 'failed').length > 0 && (
            <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-mono font-black">
              {emailLogs.filter((e) => e.status === 'failed').length} Gagal
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: VALIDASI & ACC KLIEN */}
      {activeSubTab === 'client_validation' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama perusahaan klien, PIC, mitra, atau kode referral..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={clientFilter}
                onChange={(e: any) => setClientFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Status ({clientDeals.length})</option>
                <option value="pending_acc">Sedang Ditinjau Admin ({pendingAccCount})</option>
                <option value="active_subscription">Langganan Aktif (Bulanan / Tahunan)</option>
                <option value="deal_closed">Deal Closed (Case-by-case)</option>
                <option value="cancelled">Langganan Berakhir / Diputus ({clientDeals.filter((d) => d.status === 'cancelled').length})</option>
                <option value="rejected">Tidak Deal / Ditolak ({clientDeals.filter((d) => d.status === 'rejected').length})</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Entitas Klien &amp; PIC</th>
                    <th className="py-3 px-4">Mitra / Referral</th>
                    <th className="py-3 px-4">Layanan</th>
                    <th className="py-3 px-4">Skema &amp; Jadwal Langganan</th>
                    <th className="py-3 px-4 text-right">Nilai Kontrak</th>
                    <th className="py-3 px-4 text-right">Komisi Mitra</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Tidak ada data klien yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredDeals.map((deal) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const startSubDate = deal.subscriptionStartDate || deal.date;
                      const billDay = deal.billingDayOfMonth || Number((startSubDate || todayStr).split('-')[2]) || 1;
                      const isPaymentDue = Boolean(
                        deal.status === 'active_subscription' &&
                          (deal.isBillingDue || (deal.nextBillingDate && todayStr >= deal.nextBillingDate))
                      );

                      return (
                        <tr
                          key={deal.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            deal.status === 'cancelled' || deal.status === 'rejected' ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{deal.companyName}</div>
                            <div className="text-[11px] font-normal text-slate-600">
                              {deal.picName} ({deal.picPhone})
                            </div>
                            {deal.submittedBy === 'client_self' && (
                              <span className="inline-block px-1.5 py-0.2 mt-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                                Registrasi Mandiri Klien
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="font-semibold text-slate-900">{deal.mitraName}</div>
                            <div className="font-mono text-[10px] text-blue-700 font-bold">{deal.referralCode}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <div className="line-clamp-2">{deal.serviceName}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {deal.pricingType === 'annual_subscription' ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    deal.status === 'cancelled' || deal.status === 'rejected'
                                      ? 'text-slate-500 bg-slate-100 border-slate-300'
                                      : 'text-purple-800 bg-purple-50 border-purple-200'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-purple-600" />
                                  Langganan Tahunan ({deal.recurringPaidYears ?? 1} thn)
                                </span>
                                <div className="text-[10px] text-slate-600 font-mono pt-0.5">
                                  <div>Mulai: <strong className="text-slate-800">{startSubDate}</strong></div>
                                  <div>Tagihan: <strong className="text-purple-800">Setiap Tanggal {billDay}</strong></div>
                                  {deal.status === 'active_subscription' && deal.nextBillingDate && (
                                    <div className="text-slate-500">Berikutnya: {deal.nextBillingDate}</div>
                                  )}
                                  {deal.status === 'cancelled' && deal.terminatedAt && (
                                    <div className="text-rose-700 font-bold">Diputus: {deal.terminatedAt}</div>
                                  )}
                                </div>
                              </div>
                            ) : deal.pricingType === 'monthly_subscription' ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    deal.status === 'cancelled' || deal.status === 'rejected'
                                      ? 'text-slate-500 bg-slate-100 border-slate-300'
                                      : 'text-blue-700 bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  <Repeat className="w-3 h-3 text-blue-600" />
                                  Langganan Bulanan ({deal.recurringPaidMonths ?? 1} bln)
                                </span>
                                <div className="text-[10px] text-slate-600 font-mono pt-0.5">
                                  <div>Mulai: <strong className="text-slate-800">{startSubDate}</strong></div>
                                  <div>Tagihan: <strong className="text-blue-700">Setiap Tanggal {billDay}</strong></div>
                                  {deal.status === 'active_subscription' && deal.nextBillingDate && (
                                    <div className="text-slate-500">Berikutnya: {deal.nextBillingDate}</div>
                                  )}
                                  {deal.status === 'cancelled' && deal.terminatedAt && (
                                    <div className="text-rose-700 font-bold">Diputus: {deal.terminatedAt}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                  ⚡ Case-by-Case (Sekali Bayar)
                                </span>
                                {deal.periodStart && deal.periodEnd && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    {deal.periodStart} s/d {deal.periodEnd} {deal.durationMonths ? `(${deal.durationMonths} bln)` : ''}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {formatRupiah(deal.dealValue)}
                            {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400">/bln</span>}
                            {deal.pricingType === 'annual_subscription' && <span className="text-[10px] text-slate-400">/thn</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                            {deal.status === 'pending_acc' ? (
                              <div>
                                <div className="font-bold text-amber-700 text-xs">Rp 0</div>
                                <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                  Belum Approve (Potensi: {formatRupiah(deal.commissionAmount)})
                                </span>
                              </div>
                            ) : deal.status === 'rejected' ? (
                              <div>
                                <div className="line-through text-slate-400 text-[11px]">
                                  {formatRupiah(deal.commissionAmount)}
                                </div>
                                <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                                  Rp 0 (Tidak Deal)
                                </span>
                              </div>
                            ) : deal.status === 'cancelled' ? (
                              <div>
                                <div className="line-through text-slate-400 text-[11px]">
                                  {formatRupiah(deal.commissionAmount)}
                                  {deal.pricingType === 'monthly_subscription' ? '/bln' : deal.pricingType === 'annual_subscription' ? '/thn' : ''}
                                </div>
                                <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                                  Komisi Berhenti (Rp 0)
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-emerald-700">
                                  {formatRupiah(deal.commissionAmount)}
                                  {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400 font-normal">/bln</span>}
                                  {deal.pricingType === 'annual_subscription' && <span className="text-[10px] text-slate-400 font-normal">/thn</span>}
                                </div>
                                <span className="inline-block text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-0.5">
                                  ✓ Masuk Komisi Mitra
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {deal.status === 'pending_acc' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Sedang Ditinjau Admin
                              </span>
                            ) : deal.status === 'rejected' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                                  <X className="w-3 h-3" /> Tidak Deal / Ditolak
                                </span>
                                {deal.rejectedAt && (
                                  <span className="text-[9px] font-mono text-slate-500">
                                    Ditolak: {deal.rejectedAt}
                                  </span>
                                )}
                              </div>
                            ) : deal.status === 'cancelled' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                                  <X className="w-3 h-3" /> Langganan Diputus
                                </span>
                                {deal.terminatedAt && (
                                  <span className="text-[9px] font-mono text-slate-500">
                                    Berakhir: {deal.terminatedAt}
                                  </span>
                                )}
                              </div>
                            ) : deal.status === 'active_subscription' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Langganan Aktif
                                </span>
                                {isPaymentDue && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-900 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-full animate-pulse">
                                    🔔 Waktu Tagihan Tiba
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Deal Closed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {deal.status === 'pending_acc' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(deal)}
                                  disabled={processingId === deal.id}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                                >
                                  🔍 Review &amp; Konfirmasi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAccClient(deal.id, deal.subscriptionStartDate, deal.billingDayOfMonth)}
                                  disabled={processingId === deal.id}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
                                >
                                  ✓ Approve (Deal)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(deal)}
                                  disabled={processingId === deal.id}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                                >
                                  ✕ Tolak
                                </button>
                              </div>
                            ) : deal.status === 'rejected' ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
                                  Tidak Deal • Komisi Rp 0
                                </span>
                                {deal.rejectionReason && (
                                  <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate ml-auto" title={deal.rejectionReason}>
                                    {deal.rejectionReason}
                                  </p>
                                )}
                              </div>
                            ) : deal.status === 'cancelled' ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md">
                                  Pemutusan Di-Approve • Komisi Berhenti
                                </span>
                                {deal.terminationReason && (
                                  <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate ml-auto" title={deal.terminationReason}>
                                    {deal.terminationReason}
                                  </p>
                                )}
                              </div>
                            ) : deal.pricingType === 'annual_subscription' || deal.pricingType === 'monthly_subscription' ? (
                              <div className="flex flex-col items-end gap-1.5">
                                {isPaymentDue ? (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRecurringBill(deal.id, deal.pricingType)}
                                    disabled={processingId === deal.id}
                                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                                    title="Waktu pembayaran tiba: Approve pembayaran langganan agar komisi masuk ke Mitra"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      Approve Pembayaran{' '}
                                      {deal.pricingType === 'annual_subscription'
                                        ? `Tahun Ke-${(deal.recurringPaidYears || 1) + 1}`
                                        : `Bulan #${(deal.recurringPaidMonths || 1) + 1}`}
                                    </span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                      ⏳ Tagihan Tgl {deal.nextBillingDate}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerBillingDue(deal.id)}
                                      disabled={processingId === deal.id}
                                      className="px-2 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                                      title="Tandai waktu pembayaran langganan telah tiba untuk meng-approve tagihan"
                                    >
                                      ⚡ Waktu Tagihan Tiba
                                    </button>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDealToTerminate(deal);
                                    setTerminationReason(
                                      deal.pricingType === 'annual_subscription'
                                        ? 'Klien mengakhiri / putus langganan layanan tahunan'
                                        : 'Klien mengakhiri / putus langganan layanan bulanan'
                                    );
                                  }}
                                  disabled={processingId === deal.id}
                                  className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                                  title="Approve Pemutusan Langganan Klien & Hentikan Komisi Mitra"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Approve Pemutusan Langganan</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Selesai (1x Bayar)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ANALISA KINERJA MITRA */}
      {activeSubTab === 'mitra_analysis' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Matriks Kinerja &amp; Produktivitas Mitra Lapangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi perolehan klien, omset deal, dan akumulasi hak komisi per masing-masing mitra terdaftar.
            </p>

            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Mitra Konsultan</th>
                    <th className="p-3">Kode Anggota &amp; Referral</th>
                    <th className="p-3 text-center">Klien Terdaftar</th>
                    <th className="p-3 text-center">Langganan Aktif</th>
                    <th className="p-3 text-right">Total Komisi</th>
                    <th className="p-3 text-right">Komisi Pending</th>
                    <th className="p-3 text-right">Sudah Dicairkan</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {mitras.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 flex items-center gap-2.5">
                        <img
                          src={m.avatarUrl}
                          alt={m.fullName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
                        />
                        <div>
                          <div>{m.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{m.specialization}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-slate-700">{m.memberCode}</div>
                        <div className="font-mono font-bold text-blue-700 text-[11px]">{m.referralCode}</div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900">
                        {m.referredClientsCount || 0}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">
                        {m.activeSubscribersCount || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(m.totalCommission)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">
                        {formatRupiah(m.pendingPayout)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-600">
                        {formatRupiah(m.paidPayout)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.status === 'verified' ? 'Terverifikasi' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MANAJEMEN PENCAIRAN KOMISI */}
      {activeSubTab === 'payout_management' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Daftar Pengajuan Pencairan Dana Komisi &amp; Slip Transfer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi nomor rekening mitra, terapkan potongan PPh 21 dan biaya admin (opsional), serta upload bukti transfer perbankan resmi (PDF/JPG).
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-600">
                Total {payoutRequests.length} Pengajuan ({pendingPayoutCount} Menunggu)
              </div>
            </div>

            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Tanggal Request</th>
                    <th className="p-3">Mitra</th>
                    <th className="p-3">Rekening Bank Tujuan</th>
                    <th className="p-3 text-right">Hak Kotor</th>
                    <th className="p-3 text-right">Potongan (PPh21 + Admin)</th>
                    <th className="p-3 text-right">Bersih Ditransfer</th>
                    <th className="p-3 text-center">Status &amp; Dokumen</th>
                    <th className="p-3 text-right">Tindakan Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payoutRequests.map((req) => {
                    const gross = req.amount || 0;
                    const pph = req.pph21Deduction || 0;
                    const admin = req.adminFeeDeduction || 0;
                    const totalDeduction = pph + admin;
                    const net = req.netAmountTransferred !== undefined ? req.netAmountTransferred : Math.max(0, gross - totalDeduction);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                          {req.requestDate}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{req.mitraName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{req.memberCode}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="font-bold text-blue-900">{req.bankDetails.bankName}</div>
                          <div className="font-mono text-slate-800">{req.bankDetails.accountNumber}</div>
                          <div className="text-[10px] text-slate-500">a.n. {req.bankDetails.accountHolder}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatRupiah(gross)}
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">
                          {totalDeduction > 0 ? (
                            <div>
                              <span className="font-bold text-rose-700">- {formatRupiah(totalDeduction)}</span>
                              <div className="text-[9px] text-slate-400">
                                {pph > 0 ? `PPh21: ${formatRupiah(pph)}` : ''} {admin > 0 ? `Adm: ${formatRupiah(admin)}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Rp 0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap text-sm">
                          {formatRupiah(net)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ⏳ Menunggu Cek &amp; Transfer
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Selesai (Lunas Ditransfer)
                              </span>
                              {req.proofFileName && (
                                <span className="text-[9px] font-mono text-slate-500">
                                  {req.proofFileName.length > 20 ? req.proofFileName.slice(0, 18) + '...' : req.proofFileName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => openApproveModal(req)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-all"
                            >
                              Cek &amp; Approve Berkas Pembayaran
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Lihat Slip &amp; Bukti</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: LOG AKTIVITAS MITRA & ADMIN */}
      {activeSubTab === 'activity_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Log Aktivitas Seluruh Mitra &amp; Admin (Audit Trail)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seluruh aktivitas login, pendaftaran mitra, input klien, pembayaran &amp; komisi yang bersifat Create dan Update tercatat secara kronologis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchActivityLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingActivityLogs ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang Log</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pelaku, email, modul, atau deskripsi aktivitas..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activityRoleFilter}
                  onChange={(e: any) => setActivityRoleFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Role (Admin &amp; Mitra)</option>
                  <option value="mitra">Hanya Aktivitas Mitra</option>
                  <option value="admin">Hanya Aktivitas Admin</option>
                </select>

                <select
                  value={activityOpFilter}
                  onChange={(e: any) => setActivityOpFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Tipe Operasi</option>
                  <option value="LOGIN">LOGIN (Masuk Akun)</option>
                  <option value="CREATE">CREATE (Pendaftaran / Input Baru)</option>
                  <option value="UPDATE">UPDATE (Perubahan / Verifikasi / Pembayaran)</option>
                  <option value="DELETE">DELETE (Hapus Data)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Waktu (Timestamp)</th>
                    <th className="p-3">Pelaku &amp; Role</th>
                    <th className="p-3 text-center">Sifat Aksi</th>
                    <th className="p-3">Kategori Aktivitas</th>
                    <th className="p-3">Rincian Aktivitas &amp; Objek</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activityLogs
                    .filter((item) => {
                      const matchRole = activityRoleFilter === 'all' || item.actorRole === activityRoleFilter;
                      const matchOp = activityOpFilter === 'all' || item.operation === activityOpFilter;
                      const q = activitySearch.toLowerCase();
                      const matchSearch =
                        !q ||
                        item.actorName.toLowerCase().includes(q) ||
                        (item.actorEmail || '').toLowerCase().includes(q) ||
                        item.description.toLowerCase().includes(q) ||
                        item.actionType.toLowerCase().includes(q) ||
                        (item.targetEntity || '').toLowerCase().includes(q);
                      return matchRole && matchOp && matchSearch;
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.actorRole === 'admin'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : item.actorRole === 'mitra'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.actorRole}
                            </span>
                            <span className="font-bold text-slate-900">{item.actorName}</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 mt-0.5">{item.actorEmail || '-'}</div>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              item.operation === 'LOGIN'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : item.operation === 'CREATE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.operation === 'UPDATE'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {item.operation}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.actionType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 max-w-md">
                          <div className="font-medium text-slate-900">{item.description}</div>
                          {item.targetEntity && (
                            <div className="text-[10px] font-mono text-blue-700 mt-0.5">
                              Target: {item.targetEntity}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Tercatat
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: LOG PENGIRIMAN EMAIL (BERHASIL / GAGAL) */}
      {activeSubTab === 'email_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Log Pengiriman Email Sistem (SMTP Status: Berhasil / Gagal)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau status koneksi dan pengiriman email riil via SMTP (Niagahoster / cPanel / Custom SMTP) beserta pesan error apabila pengiriman gagal.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Konfigurasi SMTP Email</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchEmailLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEmailLogs ? 'animate-spin' : ''}`} />
                  <span>Segarkan Log Email</span>
                </button>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari alamat email tujuan, nama penerima, atau subjek email..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={emailStatusFilter}
                  onChange={(e: any) => setEmailStatusFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Status ({emailLogs.length})</option>
                  <option value="sent">Berhasil Terkirim ({emailLogs.filter((e) => e.status === 'sent').length})</option>
                  <option value="failed">Gagal Terkirim ({emailLogs.filter((e) => e.status === 'failed').length})</option>
                </select>
              </div>
            </div>

            {/* Email Logs Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Waktu Pengiriman</th>
                    <th className="p-3">Penerima</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Subjek &amp; Isi Pesan / Error SMTP</th>
                    <th className="p-3 text-center">Status Pengiriman</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Belum ada log pengiriman email yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    emailLogs
                      .filter((log) => {
                        const matchStatus = emailStatusFilter === 'all' || log.status === emailStatusFilter;
                        const q = emailSearch.toLowerCase();
                        const matchSearch =
                          !q ||
                          log.recipient.toLowerCase().includes(q) ||
                          (log.recipientName || '').toLowerCase().includes(q) ||
                          log.subject.toLowerCase().includes(q);
                        return matchStatus && matchSearch;
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'medium',
                            })}
                            {log.smtpHostUsed && (
                              <div className="text-[9px] text-slate-400 mt-0.5">SMTP: {log.smtpHostUsed}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{log.recipientName || '-'}</div>
                            <div className="font-mono text-[11px] text-blue-700">{log.recipient}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-[10px] uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {log.category}
                            </span>
                          </td>
                          <td className="p-3 max-w-md">
                            <div className="font-bold text-slate-900">{log.subject}</div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 whitespace-pre-line">
                              {log.previewSnippet}
                            </div>
                            {log.status === 'failed' && log.errorMessage && (
                              <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-mono">
                                <strong>Error SMTP:</strong> {log.errorMessage}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {log.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> BERHASIL TERKIRIM
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <AlertCircle className="w-3.5 h-3.5" /> GAGAL TERKIRIM
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleResendEmailFromLog(log.id)}
                              disabled={resendingEmailId === log.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              <span>{resendingEmailId === log.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SETUJUI PENCAIRAN KOMISI (DENGAN INPUT POTONGAN PPH21, BIAYA ADMIN & UPLOAD BUKTI) */}
      {payoutToApprove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* FIXED TOP HEADER */}
            <div className="shrink-0 p-5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Otorisasi Pengeluaran Kas
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Setujui &amp; Transfer Pencairan Komisi Mitra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayoutToApprove(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayoutApproval} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* SCROLLABLE FORM BODY */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                
                {/* Target Beneficiary Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{payoutToApprove.mitraName}</span>
                  <span className="font-mono font-bold text-blue-700">{payoutToApprove.memberCode}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-600">
                  <span>Bank: <strong className="text-slate-900">{payoutToApprove.bankDetails.bankName}</strong></span>
                  <span>No. Rekening: <strong className="font-mono text-slate-900">{payoutToApprove.bankDetails.accountNumber}</strong></span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Atas Nama: {payoutToApprove.bankDetails.accountHolder}
                </div>
              </div>

              {/* Gross Amount Display */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-900">Hak Komisi Kotor Diajukan:</span>
                  <p className="text-[11px] text-slate-500">Nilai komisi sebelum potongan operasional / pajak.</p>
                </div>
                <span className="font-mono text-lg font-black text-blue-950">
                  {formatRupiah(payoutToApprove.amount)}
                </span>
              </div>

              {/* Deductions: PPh 21 (Optional) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-rose-600" />
                    Potongan PPh Pasal 21 Tenaga Ahli (Opsional)
                  </label>
                  <span className="text-[11px] text-slate-500">Sifat: Opsional</span>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePphPresetChange(0)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      pphRate === 0
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Bebas / 0%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePphPresetChange(2.5)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      pphRate === 2.5
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    2.5% (Standar)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePphPresetChange(5)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      pphRate === 5
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    5% (Non-NPWP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPphRate('');
                    }}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      pphRate === ''
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Nominal Bebas
                  </button>
                </div>

                {/* Nominal Input */}
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={pphNominal}
                    onChange={(e) => {
                      setPphNominal(Number(e.target.value));
                      setPphRate('');
                    }}
                    placeholder="Masukkan nominal potongan PPh 21 jika ada..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold text-rose-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  DJP mensyaratkan bukti potong PPh 21 bukan pegawai. Kosongkan jika komisi dibayarkan penuh / nett.
                </p>
              </div>

              {/* Deductions: Bank Admin Fee (Optional) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Biaya Transfer Admin Bank (Opsional)
                  </label>
                  <span className="text-[11px] text-slate-500">Sifat: Opsional</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminFee(0)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      adminFee === 0
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Gratis / Rp 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminFee(2500)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      adminFee === 2500
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    BI-FAST (Rp 2.500)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminFee(6500)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                      adminFee === 6500
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Online (Rp 6.500)
                  </button>
                </div>
              </div>

              {/* LIVE NET AMOUNT CALCULATION */}
              <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-400 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase text-emerald-950 tracking-wider">
                    Total Diterima Bersih (Net Transfer)
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Nilai riil yang wajib ditransfer ke rekening bank mitra.
                  </p>
                </div>
                <span className="font-mono text-xl font-black text-emerald-800">
                  {formatRupiah(Math.max(0, payoutToApprove.amount - pphNominal - adminFee))}
                </span>
              </div>

              {/* Reference Number & Proof File Upload */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Referensi Transfer Bank (Auto-generated / Dapat diubah)
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="TRX-BCA-YYYYMMDD-XXXX"
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                {/* Upload Bukti Pencairan (PDF / JPG / PNG) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Bukti Pencairan / Struk Transfer (PDF, JPG, PNG) <span className="text-slate-500 font-normal">(Disarankan)</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleProofFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileUp className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        {proofFileName ? proofFileName : 'Klik atau seret struk transfer (PDF / Gambar) ke sini'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Format didukung: PDF, JPG, PNG (Maks 10MB)
                      </span>
                    </div>
                  </div>

                  {proofFileUrl && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                      <span className="text-emerald-800 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> File struk berhasil diunggah: <strong>{proofFileName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFileUrl('');
                          setProofFileName('');
                        }}
                        className="text-slate-500 hover:text-rose-600"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Verifikasi Finance (Opsional)
                  </label>
                  <input
                    type="text"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Catatan pelengkap pencairan..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* FIXED BOTTOM FOOTER BUTTONS */}
              <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayoutToApprove(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingApproval ? 'Menyimpan & Mengotorisasi...' : '✓ Approve Berkas Pembayaran & Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL SLIP BUKTI PENCAIRAN RESMI */}
      <PayoutReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        payout={selectedReceipt}
      />

      {/* MODAL 3: REVIEW & KONFIRMASI KLIEN BARU (APPROVE DEAL vs TOLAK TIDAK DEAL) */}
      {dealToReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Verifikasi &amp; Konfirmasi Klien Baru
                </span>
                <h3 className="text-base font-bold font-display">
                  Review Data Klien &amp; Keputusan Deal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDealToReview(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info Klien & Mitra */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Perusahaan Klien:</span>
                  <span className="font-bold text-slate-900">{dealToReview.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PIC / Kontak:</span>
                  <span className="font-semibold text-slate-800">{dealToReview.picName} ({dealToReview.picPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[260px] truncate">{dealToReview.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mitra Perujuk:</span>
                  <span className="font-bold text-blue-800">{dealToReview.mitraName} ({dealToReview.referralCode})</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Nilai Kontrak &amp; Komisi (Jika Deal):</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatRupiah(dealToReview.dealValue)} → Komisi {formatRupiah(dealToReview.commissionAmount)}
                  </span>
                </div>
              </div>

              {/* Pengaturan Jadwal Langganan (Jika Bulanan / Tahunan) */}
              {dealToReview.pricingType !== 'case_by_case' && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    Jadwal Mulai Langganan &amp; Tanggal Tagihan Rutin
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tanggal Mulai Langganan
                      </label>
                      <input
                        type="date"
                        value={reviewStartDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReviewStartDate(val);
                          const d = Number(val.split('-')[2]);
                          if (d >= 1 && d <= 31) setReviewBillingDay(d);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Setiap Tanggal Tagihan
                      </label>
                      <select
                        value={reviewBillingDay}
                        onChange={(e) => setReviewBillingDay(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            Setiap Tanggal {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Konfirmasi Admin / Alasan Tidak Deal (Opsional saat Approve, Wajib jika Ditolak)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Klien telah konfirmasi pembayaran kontrak / Batal karena belum sepakat harga"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                <strong>Aturan Komisi:</strong> Jika <strong>Approve Deal</strong>, komisi sebesar <strong>{formatRupiah(dealToReview.commissionAmount)}</strong> otomatis masuk ke saldo komisi aktif Mitra dan siap dicairkan. Jika <strong>Tolak / Tidak Deal</strong>, Mitra mendapatkan <strong>Rp 0 komisi</strong>.
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDealToReview(null)}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isReviewSubmitting}
                  onClick={() => handleRejectClient(dealToReview.id, rejectReason)}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-all disabled:opacity-50"
                >
                  ✕ Tolak / Tidak Deal (Komisi Rp 0)
                </button>
                <button
                  type="button"
                  disabled={isReviewSubmitting}
                  onClick={() => handleAccClient(dealToReview.id)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
                >
                  ✓ Approve Deal &amp; Cairkan Komisi ke Mitra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KONFIRMASI PEMUTUSAN LANGGANAN KLIEN */}
      {dealToTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold font-display">Approve Pemutusan Langganan Klien</h3>
                  <p className="text-[11px] text-rose-200">Penghentian Kontrak Berulang &amp; Hak Komisi Mitra</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDealToTerminate(null)}
                className="p-1 text-rose-200 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTerminateSubscription} className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Perusahaan Klien:</span>
                  <span className="font-bold text-slate-900">{dealToTerminate.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[220px] truncate">{dealToTerminate.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mitra Perujuk:</span>
                  <span className="font-bold text-blue-800">{dealToTerminate.mitraName} ({dealToTerminate.referralCode})</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-rose-200/80">
                  <span className="text-rose-800 font-semibold">Komisi yang Dihentikan:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatRupiah(dealToTerminate.commissionAmount)} / {dealToTerminate.pricingType === 'annual_subscription' ? 'thn' : 'bln'} → Rp 0
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                <strong>Perhatian:</strong> Dengan meng-approve pemutusan langganan klien ini, status kontrak berubah menjadi <strong>Langganan Diputus</strong> dan <strong>Mitra otomatis tidak akan mendapatkan komisi berulang lagi</strong> karena masa langganan klien telah berakhir.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan / Informasi Pemutusan Langganan
                </label>
                <input
                  type="text"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="Contoh: Klien menghentikan kontrak retainer per bulan ini"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDealToTerminate(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isTerminating}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isTerminating ? 'Memproses...' : '✓ Approve Pemutusan Langganan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
