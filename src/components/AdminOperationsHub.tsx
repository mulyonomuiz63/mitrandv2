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
import { useConfirm } from './ConfirmDialogModal';

export type AdminSubTab = 'client_validation' | 'mitra_analysis' | 'payout_management' | 'activity_logs' | 'email_logs';

interface AdminOperationsHubProps {
  mitras: Mitra[];
  clientDeals: ClientDeal[];
  commissions: CommissionTransaction[];
  onRefreshData: () => void;
  onOpenSettings?: () => void;
  initialSubTab?: AdminSubTab;
  mode?: 'operations' | 'logs';
}

export const AdminOperationsHub: React.FC<AdminOperationsHubProps> = ({
  mitras,
  clientDeals,
  commissions,
  onRefreshData,
  onOpenSettings,
  initialSubTab = 'client_validation',
  mode,
}) => {
  const resolvedMode: 'operations' | 'logs' =
    mode || (initialSubTab === 'activity_logs' || initialSubTab === 'email_logs' ? 'logs' : 'operations');
  const confirm = useConfirm();
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

  // Full Client & Package Detail Modal State (Available before & after approval)
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientDeal | null>(null);

  // Activity & Email Logs States
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [activityRoleFilter, setActivityRoleFilter] = useState<'all' | 'admin' | 'mitra'>('all');
  const [activityOpFilter, setActivityOpFilter] = useState<'all' | 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [emailPage, setEmailPage] = useState(1);
  const [emailPageSize, setEmailPageSize] = useState(10);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  // Cutoff 3 Bulan Terakhir (Data > 3 bulan lalu otomatis dihapus)
  const threeMonthsAgoMs = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.getTime();
  })();

  const filteredActivityLogs = activityLogs.filter((item) => {
    const t = new Date(item.timestamp || 0).getTime();
    if (Number.isNaN(t) || t < threeMonthsAgoMs) return false;
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
  });

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivityLogs.length / activityPageSize));
  const safeActivityPage = Math.min(activityPage, totalActivityPages);
  const paginatedActivityLogs = filteredActivityLogs.slice(
    (safeActivityPage - 1) * activityPageSize,
    safeActivityPage * activityPageSize
  );

  const filteredEmailLogs = emailLogs.filter((log) => {
    const t = new Date(log.sentAt || 0).getTime();
    if (Number.isNaN(t) || t < threeMonthsAgoMs) return false;
    const matchStatus = emailStatusFilter === 'all' || log.status === emailStatusFilter;
    const q = emailSearch.toLowerCase();
    const matchSearch =
      !q ||
      log.recipient.toLowerCase().includes(q) ||
      (log.recipientName || '').toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalEmailPages = Math.max(1, Math.ceil(filteredEmailLogs.length / emailPageSize));
  const safeEmailPage = Math.min(emailPage, totalEmailPages);
  const paginatedEmailLogs = filteredEmailLogs.slice(
    (safeEmailPage - 1) * emailPageSize,
    safeEmailPage * emailPageSize
  );

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
    const targetLog = emailLogs.find((l) => l.id === logId);
    const ok = await confirm({
      title: 'Kirim Ulang Email Notifikasi',
      message: `Apakah Anda yakin ingin mengirim ulang email ini ke ${targetLog?.recipient || 'penerima'}?`,
      detail: targetLog ? `Penerima: ${targetLog.recipientName} (${targetLog.recipient})\nSubjek: ${targetLog.subject}` : undefined,
      confirmText: 'Ya, Kirim Ulang Email',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;
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
    const targetDeal = clientDeals.find((d) => d.id === dealId);
    const ok = await confirm({
      title: 'Approve Deal Klien (ACC)',
      message: `Apakah Anda yakin ingin menyetujui (Approve Deal) klien "${targetDeal?.companyName || ''}"? Komisi akan langsung masuk ke saldo akun Mitra.`,
      detail: targetDeal
        ? `Perusahaan Klien: ${targetDeal.companyName}\nLayanan: ${targetDeal.serviceName}\nMitra Perujuk: ${targetDeal.mitraName}\nNilai Kontrak: ${formatRupiah(targetDeal.dealValue)}\nKomisi Masuk Mitra: ${formatRupiah(targetDeal.commissionAmount)}`
        : undefined,
      confirmText: 'Ya, Approve Deal & Cairkan Komisi',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

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
    const targetDeal = clientDeals.find((d) => d.id === dealId);
    const finalReason = reasonText || rejectReason || 'Tidak deal setelah konfirmasi dengan calon klien';
    const ok = await confirm({
      title: 'Tolak Pengajuan Klien (Tidak Deal)',
      message: `Apakah Anda yakin ingin menolak / menyatakan Tidak Deal untuk klien "${targetDeal?.companyName || ''}"?`,
      detail: targetDeal
        ? `Perusahaan Klien: ${targetDeal.companyName}\nMitra Perujuk: ${targetDeal.mitraName}\nAlasan: ${finalReason}\nKomisi Mitra: Rp 0`
        : undefined,
      confirmText: 'Ya, Tolak (Tidak Deal)',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

    setProcessingId(dealId);
    setIsReviewSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${dealId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: finalReason,
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
    const targetDeal = clientDeals.find((d) => d.id === dealId);
    const ok = await confirm({
      title: 'Aktifkan Waktu Tagihan Langganan',
      message: `Tandai bahwa waktu tagihan langganan untuk klien "${targetDeal?.companyName || ''}" telah tiba?`,
      detail: targetDeal ? `Klien: ${targetDeal.companyName}\nLayanan: ${targetDeal.serviceName}` : undefined,
      confirmText: 'Ya, Aktifkan Tagihan',
      cancelText: 'Batalkan',
      variant: 'warning',
    });
    if (!ok) return;

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
    const targetDeal = clientDeals.find((d) => d.id === dealId);
    const nextCycle =
      pricingType === 'annual_subscription'
        ? `Tahun Ke-${(targetDeal?.recurringPaidYears || 1) + 1}`
        : `Bulan #${(targetDeal?.recurringPaidMonths || 1) + 1}`;
    const ok = await confirm({
      title: `Approve Pembayaran Langganan (${nextCycle})`,
      message: `Apakah Anda yakin ingin meng-approve pembayaran langganan ${nextCycle} untuk klien "${targetDeal?.companyName || ''}"?`,
      detail: targetDeal
        ? `Perusahaan Klien: ${targetDeal.companyName}\nSiklus Pembayaran: ${nextCycle}\nNilai Tagihan: ${formatRupiah(targetDeal.dealValue)}\nKomisi Masuk ke Mitra (${targetDeal.mitraName}): + ${formatRupiah(targetDeal.commissionAmount)}`
        : undefined,
      confirmText: 'Ya, Approve Pembayaran & Tambah Komisi',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: 'Konfirmasi Pemutusan Langganan Klien',
      message: `Apakah Anda yakin ingin memutus/menghentikan langganan klien "${dealToTerminate.companyName}"? Komisi berulang untuk Mitra akan dihentikan.`,
      detail: `Perusahaan Klien: ${dealToTerminate.companyName}\nMitra Perujuk: ${dealToTerminate.mitraName}\nAlasan Pemutusan: ${terminationReason.trim() || 'Klien berhenti berlangganan layanan'}`,
      confirmText: 'Ya, Putus Langganan Klien',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

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

    const gross = payoutToApprove.amount || 0;
    const net = Math.max(0, gross - pphNominal - adminFee);

    const ok = await confirm({
      title: 'Konfirmasi Approve & Transfer Pencairan Komisi',
      message: `Apakah Anda yakin ingin menyetujui dan menyelesaikan pencairan komisi untuk Mitra "${payoutToApprove.mitraName}"? Saldo siap cair Mitra akan otomatis dikurangi.`,
      detail: `Nama Mitra: ${payoutToApprove.mitraName}\nRekening Tujuan: ${payoutToApprove.bankDetails.bankName} - ${payoutToApprove.bankDetails.accountNumber} (a.n. ${payoutToApprove.bankDetails.accountHolder})\nNominal Pengajuan (Kotor): ${formatRupiah(gross)}\nPotongan PPh 21 & Admin: - ${formatRupiah(pphNominal + adminFee)}\nTotal Bersih Ditransfer: ${formatRupiah(net)}`,
      confirmText: 'Ya, Approve & Selesaikan Transfer',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

    setIsSubmittingApproval(true);

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

  // Filter clients (searches company, PIC, phone, email, package/service name, referral, mitra, notes & custom fields)
  const filteredDeals = clientDeals.filter((deal) => {
    const matchFilter = clientFilter === 'all' || deal.status === clientFilter;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchFilter;
    const customFieldsText = deal.customFields
      ? Object.entries(deal.customFields)
          .map(([k, v]) => `${k} ${v}`)
          .join(' ')
          .toLowerCase()
      : '';
    const matchSearch =
      deal.companyName.toLowerCase().includes(q) ||
      deal.picName.toLowerCase().includes(q) ||
      (deal.picPhone || '').toLowerCase().includes(q) ||
      (deal.picEmail || '').toLowerCase().includes(q) ||
      deal.serviceName.toLowerCase().includes(q) ||
      deal.referralCode.toLowerCase().includes(q) ||
      deal.mitraName.toLowerCase().includes(q) ||
      (deal.notes || '').toLowerCase().includes(q) ||
      customFieldsText.includes(q);
    return matchFilter && matchSearch;
  });

  const pendingAccCount = clientDeals.filter((d) => d.status === 'pending_acc').length;
  const pendingPayoutCount = payoutRequests.filter((p) => p.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
      
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
              {resolvedMode === 'logs' ? 'AUDIT & MONITORING SISTEM' : 'PANEL ADMIN OPERASIONAL'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {resolvedMode === 'logs'
                ? 'Log Aktivitas & Pengiriman Email'
                : 'Validasi Klien & Manajemen Dana Komisi'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            {resolvedMode === 'logs'
              ? 'Pusat Log Aktivitas & Pengiriman Email'
              : 'Pusat Operasional Klien & Komisi Mitra'}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {resolvedMode === 'logs'
              ? 'Pantau riwayat aktivitas login, perubahan data oleh Mitra & Admin, serta status pengiriman email notifikasi sistem secara real-time.'
              : 'Validasi deal referral mitra (case-by-case, langganan bulanan & tahunan), atur ACC komisi, serta otorisasi pencairan saldo dengan bukti transfer & rincian potongan PPh 21.'}
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
              <span>Pengaturan Sistem, Form &amp; Spesialisasi</span>
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

      {/* Navigation Sub-Tabs (Terpisah Sesuai Menu Utama) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {resolvedMode === 'operations' ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* VIEW 1: VALIDASI & ACC KLIEN */}
      {activeSubTab === 'client_validation' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari perusahaan klien, PIC, paket layanan pajak, mitra, atau kode referral..."
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
                    <th className="py-3 px-4 min-w-[200px]">Entitas Klien &amp; PIC</th>
                    <th className="py-3 px-4 min-w-[140px]">Mitra / Referral</th>
                    <th className="py-3 px-4 min-w-[250px]">Paket Layanan Diambil</th>
                    <th className="py-3 px-4">Skema &amp; Jadwal Langganan</th>
                    <th className="py-3 px-4 text-right">Nilai Kontrak</th>
                    <th className="py-3 px-4 text-right">Komisi Mitra</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan &amp; Detail</th>
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
                            <button
                              type="button"
                              onClick={() => setSelectedClientDetail(deal)}
                              className="text-left font-bold text-slate-900 hover:text-blue-700 hover:underline transition-colors"
                              title="Klik untuk melihat detail lengkap klien & paket layanan"
                            >
                              {deal.companyName}
                            </button>
                            <div className="text-[11px] font-normal text-slate-600 mt-0.5">
                              {deal.picName} ({deal.picPhone})
                            </div>
                            {deal.picEmail && (
                              <div className="text-[10px] font-mono text-slate-500">
                                ✉️ {deal.picEmail}
                              </div>
                            )}
                            {deal.customFields && Object.keys(deal.customFields).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(deal.customFields).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded"
                                  >
                                    {k}: <strong>{v}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                            {deal.submittedBy === 'client_self' && (
                              <span className="inline-block px-1.5 py-0.2 mt-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                                Registrasi Mandiri Klien
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="font-semibold text-slate-900">{deal.mitraName}</div>
                            <div className="font-mono text-[10px] text-blue-700 font-bold">{deal.referralCode}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tgl Input: {deal.date}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 min-w-[250px] max-w-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedClientDetail(deal)}
                              className="text-left font-bold text-slate-900 hover:text-blue-700 hover:underline leading-snug block transition-colors"
                              title="Klik nama paket untuk melihat rincian paket layanan & informasi klien"
                            >
                              {deal.serviceName}
                            </button>
                            {deal.notes && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic">
                                &ldquo;{deal.notes}&rdquo;
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedClientDetail(deal)}
                              className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded transition-colors"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>
                                {deal.pricingType === 'monthly_subscription'
                                  ? 'Detail Paket Langganan Bulanan'
                                  : deal.pricingType === 'annual_subscription'
                                    ? 'Detail Paket Langganan Tahunan'
                                    : 'Detail Paket Case-by-Case'}
                              </span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {deal.pricingType === 'annual_subscription' ? (
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  title="Klik untuk membuka informasi langganan tahunan klien"
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                    deal.status === 'cancelled' || deal.status === 'rejected'
                                      ? 'text-slate-500 bg-slate-100 border-slate-300 hover:bg-slate-200'
                                      : 'text-purple-800 bg-purple-50 border-purple-200 hover:bg-purple-100'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-purple-600" />
                                  <span>Langganan Tahunan ({deal.recurringPaidYears ?? 1} thn)</span>
                                </button>
                                <div className="text-[10px] text-slate-600 font-mono pt-0.5">
                                  <div>Mulai: <strong className="text-slate-800">{startSubDate}</strong></div>
                                  <div>Tagihan: <strong className="text-purple-800">Setiap Tanggal {billDay}</strong></div>
                                  {deal.status === 'active_subscription' && deal.nextBillingDate && (
                                    <div className="text-emerald-700 font-semibold">Berjalan • Tagihan: {deal.nextBillingDate}</div>
                                  )}
                                  {deal.status === 'cancelled' && deal.terminatedAt && (
                                    <div className="text-rose-700 font-bold">Diputus: {deal.terminatedAt}</div>
                                  )}
                                </div>
                              </div>
                            ) : deal.pricingType === 'monthly_subscription' ? (
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  title="Klik untuk membuka informasi langganan bulanan klien"
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                    deal.status === 'cancelled' || deal.status === 'rejected'
                                      ? 'text-slate-500 bg-slate-100 border-slate-300 hover:bg-slate-200'
                                      : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  }`}
                                >
                                  <Repeat className="w-3 h-3 text-blue-600" />
                                  <span>Langganan Bulanan ({deal.recurringPaidMonths ?? 1} bln)</span>
                                </button>
                                <div className="text-[10px] text-slate-600 font-mono pt-0.5">
                                  <div>Mulai: <strong className="text-slate-800">{startSubDate}</strong></div>
                                  <div>Tagihan: <strong className="text-blue-700">Setiap Tanggal {billDay}</strong></div>
                                  {deal.status === 'active_subscription' && deal.nextBillingDate && (
                                    <div className="text-emerald-700 font-semibold">Berjalan • Tagihan: {deal.nextBillingDate}</div>
                                  )}
                                  {deal.status === 'cancelled' && deal.terminatedAt && (
                                    <div className="text-rose-700 font-bold">Diputus: {deal.terminatedAt}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  title="Klik untuk membuka informasi paket case-by-case klien"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 rounded transition-colors"
                                >
                                  <span>⚡ Case-by-Case (Sekali Bayar)</span>
                                </button>
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
                                  <CheckCircle2 className="w-3 h-3" /> Langganan Masih Berjalan
                                </span>
                                {isPaymentDue && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-900 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-full animate-pulse">
                                    🔔 Jadwal Tagihan Tiba
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Deal Closed (Case-by-Case)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {deal.status === 'pending_acc' ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClientDetail(deal)}
                                    className="px-2.5 py-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                                  >
                                    📋 Informasi Paket &amp; Detail Klien
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(deal)}
                                    disabled={processingId === deal.id}
                                    className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all"
                                  >
                                    🔍 Review &amp; Konfirmasi
                                  </button>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
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
                              </div>
                            ) : deal.status === 'rejected' ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                >
                                  📋 Informasi Pengajuan &amp; Detail Klien
                                </button>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                  Tidak Deal • Komisi Rp 0
                                </span>
                                {deal.rejectionReason && (
                                  <p className="text-[10px] text-slate-500 max-w-[200px] truncate ml-auto" title={deal.rejectionReason}>
                                    {deal.rejectionReason}
                                  </p>
                                )}
                              </div>
                            ) : deal.status === 'cancelled' ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                >
                                  📋 Informasi Riwayat Langganan &amp; Klien
                                </button>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                  Pemutusan Di-Approve • Komisi Berhenti
                                </span>
                                {deal.terminationReason && (
                                  <p className="text-[10px] text-slate-500 max-w-[200px] truncate ml-auto" title={deal.terminationReason}>
                                    {deal.terminationReason}
                                  </p>
                                )}
                              </div>
                            ) : deal.pricingType === 'annual_subscription' || deal.pricingType === 'monthly_subscription' ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Klik untuk melihat detail lengkap informasi langganan yang sedang berjalan dan data klien"
                                >
                                  <span>
                                    📋{' '}
                                    {deal.pricingType === 'annual_subscription'
                                      ? 'Informasi Langganan Tahunan Berjalan'
                                      : 'Informasi Langganan Bulanan Berjalan'}
                                  </span>
                                </button>
                                {isPaymentDue && (
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
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientDetail(deal)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Klik untuk melihat detail lengkap paket case-by-case dan data klien"
                                >
                                  <span>📋 Informasi Paket Case-by-Case &amp; Klien</span>
                                </button>
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                                  ✓ Kontrak Case-by-Case Aktif (1x Bayar)
                                </span>
                              </div>
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
                    const net =
                      req.status === 'approved' && req.netAmountTransferred && req.netAmountTransferred > 0
                        ? req.netAmountTransferred
                        : Math.max(0, gross - totalDeduction);

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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span>Log Aktivitas Seluruh Mitra &amp; Admin (Audit Trail)</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    Retensi Otomatis: 3 Bulan Terakhir
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data log yang berusia lebih dari 3 bulan otomatis dihapus sistem sehingga hanya menyisakan riwayat 3 bulan terbaru.
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
                  onChange={(e) => {
                    setActivitySearch(e.target.value);
                    setActivityPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activityRoleFilter}
                  onChange={(e: any) => {
                    setActivityRoleFilter(e.target.value);
                    setActivityPage(1);
                  }}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Role (Admin &amp; Mitra)</option>
                  <option value="mitra">Hanya Aktivitas Mitra</option>
                  <option value="admin">Hanya Aktivitas Admin</option>
                </select>

                <select
                  value={activityOpFilter}
                  onChange={(e: any) => {
                    setActivityOpFilter(e.target.value);
                    setActivityPage(1);
                  }}
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
                  {paginatedActivityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Tidak ada data log aktivitas dalam 3 bulan terakhir yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedActivityLogs.map((item) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Activity Logs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Menampilkan{' '}
                  <strong>
                    {filteredActivityLogs.length === 0 ? 0 : (safeActivityPage - 1) * activityPageSize + 1}–
                    {Math.min(safeActivityPage * activityPageSize, filteredActivityLogs.length)}
                  </strong>{' '}
                  dari <strong>{filteredActivityLogs.length}</strong> log (3 bulan terakhir)
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={activityPageSize}
                    onChange={(e) => {
                      setActivityPageSize(Number(e.target.value));
                      setActivityPage(1);
                    }}
                    className="border border-slate-300 rounded-md px-2 py-1 bg-white font-semibold text-slate-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeActivityPage <= 1}
                  onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  « Sebelumnya
                </button>
                {Array.from({ length: totalActivityPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalActivityPages || Math.abs(p - safeActivityPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-slate-400">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivityPage(p)}
                        className={`w-7 h-7 rounded-lg font-bold transition-colors ${
                          p === safeActivityPage
                            ? 'bg-indigo-700 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  disabled={safeActivityPage >= totalActivityPages}
                  onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  Berikutnya »
                </button>
              </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Log Pengiriman Email Sistem (SMTP Status: Berhasil / Gagal)</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Retensi Otomatis: 3 Bulan Terakhir
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data log email yang berusia lebih dari 3 bulan otomatis dihapus sistem sehingga hanya menyisakan riwayat 3 bulan terbaru.
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
                  onChange={(e) => {
                    setEmailSearch(e.target.value);
                    setEmailPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={emailStatusFilter}
                  onChange={(e: any) => {
                    setEmailStatusFilter(e.target.value);
                    setEmailPage(1);
                  }}
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
                  {paginatedEmailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Belum ada log pengiriman email dalam 3 bulan terakhir yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmailLogs.map((log) => (
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

            {/* Pagination Controls for Email Logs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Menampilkan{' '}
                  <strong>
                    {filteredEmailLogs.length === 0 ? 0 : (safeEmailPage - 1) * emailPageSize + 1}–
                    {Math.min(safeEmailPage * emailPageSize, filteredEmailLogs.length)}
                  </strong>{' '}
                  dari <strong>{filteredEmailLogs.length}</strong> log email (3 bulan terakhir)
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={emailPageSize}
                    onChange={(e) => {
                      setEmailPageSize(Number(e.target.value));
                      setEmailPage(1);
                    }}
                    className="border border-slate-300 rounded-md px-2 py-1 bg-white font-semibold text-slate-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeEmailPage <= 1}
                  onClick={() => setEmailPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  « Sebelumnya
                </button>
                {Array.from({ length: totalEmailPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalEmailPages || Math.abs(p - safeEmailPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-slate-400">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEmailPage(p)}
                        className={`w-7 h-7 rounded-lg font-bold transition-colors ${
                          p === safeEmailPage
                            ? 'bg-blue-700 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  disabled={safeEmailPage >= totalEmailPages}
                  onClick={() => setEmailPage((p) => Math.min(totalEmailPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700"
                >
                  Berikutnya »
                </button>
              </div>
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
                    step="any"
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
                {dealToReview.customFields && Object.keys(dealToReview.customFields).length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Data Tambahan Klien:
                    </span>
                    {Object.entries(dealToReview.customFields).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-slate-500">{k}:</span>
                        <span className="font-semibold text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* MODAL 5: DETAIL LENGKAP INFORMASI KLIEN & PAKET LAYANAN (TERSEDIA SEBELUM MAUPUN SETELAH DI-APPROVE) */}
      {selectedClientDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="shrink-0 p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/25 border border-blue-400/40 text-blue-200 rounded">
                    {selectedClientDetail.status === 'active_subscription'
                      ? selectedClientDetail.pricingType === 'annual_subscription'
                        ? 'INFORMASI LANGGANAN TAHUNAN BERJALAN'
                        : 'INFORMASI LANGGANAN BULANAN BERJALAN'
                      : selectedClientDetail.status === 'deal_closed'
                        ? 'INFORMASI PAKET CASE-BY-CASE AKTIF'
                        : selectedClientDetail.status === 'pending_acc'
                          ? 'DETAIL PENGAJUAN KLIEN & PAKET'
                          : 'ARSIP & RIWAYAT KONTRAK KLIEN'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    ID: {selectedClientDetail.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-display mt-1">
                  {selectedClientDetail.companyName}
                </h3>
                <p className="text-[11px] text-blue-200 font-medium mt-0.5">
                  Paket Diambil: {selectedClientDetail.serviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Tutup Detail Klien"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* Status Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Status Kontrak &amp; Layanan:</span>
                  {selectedClientDetail.status === 'pending_acc' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Sedang Ditinjau Admin
                    </span>
                  ) : selectedClientDetail.status === 'active_subscription' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Langganan Masih Berjalan (
                      {selectedClientDetail.pricingType === 'annual_subscription'
                        ? `Tahun Ke-${selectedClientDetail.recurringPaidYears || 1}`
                        : `Bulan Ke-${selectedClientDetail.recurringPaidMonths || 1}`}
                      )
                    </span>
                  ) : selectedClientDetail.status === 'deal_closed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Kontrak Case-by-Case Aktif / Selesai (1x Bayar)
                    </span>
                  ) : selectedClientDetail.status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" /> Langganan Diputus / Berakhir
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" /> Tidak Deal / Ditolak
                    </span>
                  )}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Tanggal Pendaftaran: <strong className="text-slate-900">{selectedClientDetail.date}</strong>
                </div>
              </div>

              {/* Section 1: Detail Paket Layanan Pajak & Hukum yang Diambil */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-700" />
                    Rincian Paket Layanan &amp; Skema Pembayaran
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-700 text-white">
                    {selectedClientDetail.pricingType === 'monthly_subscription'
                      ? '🔄 Paket Langganan Bulanan'
                      : selectedClientDetail.pricingType === 'annual_subscription'
                        ? '📅 Paket Langganan Tahunan'
                        : '⚡ Paket Case-by-Case (Sekali Bayar)'}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                      Nama Paket Layanan Diambil:
                    </span>
                    <p className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                      {selectedClientDetail.serviceName}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Nilai Kontrak Paket</span>
                      <span className="font-mono text-sm font-black text-slate-900">
                        {formatRupiah(selectedClientDetail.dealValue)}
                        {selectedClientDetail.pricingType === 'monthly_subscription'
                          ? ' / bln'
                          : selectedClientDetail.pricingType === 'annual_subscription'
                            ? ' / thn'
                            : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Hak Komisi Mitra</span>
                      <span className="font-mono text-sm font-black text-emerald-700">
                        {formatRupiah(selectedClientDetail.commissionAmount)}
                        {selectedClientDetail.pricingType === 'monthly_subscription'
                          ? ' / bln'
                          : selectedClientDetail.pricingType === 'annual_subscription'
                            ? ' / thn'
                            : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Jadwal / Siklus Kontrak</span>
                      {selectedClientDetail.pricingType === 'monthly_subscription' ||
                      selectedClientDetail.pricingType === 'annual_subscription' ? (
                        <div className="font-mono text-[11px] text-slate-800 font-semibold">
                          <div>Mulai: {selectedClientDetail.subscriptionStartDate || selectedClientDetail.date}</div>
                          <div className="text-blue-700">
                            Tagihan: Setiap Tgl {selectedClientDetail.billingDayOfMonth || 1}
                          </div>
                          {selectedClientDetail.nextBillingDate && (
                            <div className="text-emerald-700">Tagihan Berikutnya: {selectedClientDetail.nextBillingDate}</div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-800 font-semibold">
                          {selectedClientDetail.periodStart && selectedClientDetail.periodEnd
                            ? `${selectedClientDetail.periodStart} s/d ${selectedClientDetail.periodEnd}`
                            : 'Kontrak Proyek 1x Bayar'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ringkasan Siklus Langganan Berjalan (Khusus Paket Langganan) */}
                  {(selectedClientDetail.pricingType === 'monthly_subscription' ||
                    selectedClientDetail.pricingType === 'annual_subscription') &&
                    selectedClientDetail.status !== 'pending_acc' &&
                    selectedClientDetail.status !== 'rejected' && (
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg">
                        <div className="text-[11px] text-slate-700">
                          Total Siklus Terbayar:{' '}
                          <strong className="text-blue-800 font-mono">
                            {selectedClientDetail.pricingType === 'annual_subscription'
                              ? `${selectedClientDetail.recurringPaidYears || 1} Tahun`
                              : `${selectedClientDetail.recurringPaidMonths || 1} Bulan`}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          Total Akumulasi Komisi Diterima Mitra:{' '}
                          <strong className="text-emerald-700 font-mono">
                            {formatRupiah(
                              selectedClientDetail.commissionAmount *
                                (selectedClientDetail.pricingType === 'annual_subscription'
                                  ? selectedClientDetail.recurringPaidYears || 1
                                  : selectedClientDetail.recurringPaidMonths || 1)
                            )}
                          </strong>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Section 2: Informasi Lengkap Perusahaan & PIC Klien */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    Identitas Perusahaan &amp; Kontak PIC
                  </span>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Nama Entitas:</span>
                      <span className="font-bold text-slate-900 text-right">{selectedClientDetail.companyName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Nama PIC / Jabatan:</span>
                      <span className="font-semibold text-slate-900 text-right">{selectedClientDetail.picName}</span>
                    </div>
                    <div className="flex justify-between gap-2 items-center">
                      <span className="text-slate-500">No. WhatsApp PIC:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{selectedClientDetail.picPhone}</span>
                        {selectedClientDetail.picPhone && selectedClientDetail.picPhone !== '-' && (
                          <a
                            href={`https://wa.me/${selectedClientDetail.picPhone.replace(/\D/g, '').replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Chat WA
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Email Klien / PIC:</span>
                      <span className="font-mono text-slate-800 text-right">
                        {selectedClientDetail.picEmail || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Metode Pendaftaran:</span>
                      <span className="font-semibold text-indigo-700 text-right">
                        {selectedClientDetail.submittedBy === 'client_self'
                          ? 'Registrasi Mandiri via Tautan Referral'
                          : 'Diinput oleh Mitra Konsultan'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Informasi Mitra Perujuk */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Mitra Perujuk (Referral)
                  </span>
                  {(() => {
                    const refMitra = mitras.find(
                      (m) =>
                        m.id === selectedClientDetail.mitraId ||
                        m.referralCode === selectedClientDetail.referralCode
                    );
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Nama Mitra:</span>
                          <span className="font-bold text-slate-900 text-right">
                            {selectedClientDetail.mitraName}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Kode Referral:</span>
                          <span className="font-mono font-bold text-blue-700">
                            {selectedClientDetail.referralCode}
                          </span>
                        </div>
                        {refMitra && (
                          <>
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500">Nomor Anggota:</span>
                              <span className="font-mono text-slate-800">{refMitra.memberCode}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500">WhatsApp Mitra:</span>
                              <span className="font-mono text-slate-800">{refMitra.phone}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500">Email Mitra:</span>
                              <span className="font-mono text-slate-800 truncate max-w-[180px]">
                                {refMitra.email}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Section 4: Data Inputan Tambahan Klien (Dynamic Custom Fields) */}
              {selectedClientDetail.customFields &&
                Object.keys(selectedClientDetail.customFields).length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 block">
                      Informasi &amp; Data Inputan Tambahan Klien
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.entries(selectedClientDetail.customFields).map(([label, val]) => (
                        <div
                          key={label}
                          className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between"
                        >
                          <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                          <span className="font-bold text-slate-900 mt-0.5">{val || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Section 5: Catatan & Kebutuhan Spesifik Klien */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 block">
                  Catatan Kebutuhan Klien &amp; Riwayat Verifikasi
                </span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedClientDetail.notes || 'Tidak ada catatan tambahan khusus pada pengajuan klien ini.'}
                </p>
                {selectedClientDetail.rejectionReason && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                    <strong>Alasan Ditolak ({selectedClientDetail.rejectedAt || '-'}):</strong>{' '}
                    {selectedClientDetail.rejectionReason}
                  </div>
                )}
                {selectedClientDetail.terminationReason && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                    <strong>Alasan Pemutusan Langganan ({selectedClientDetail.terminatedAt || '-'}):</strong>{' '}
                    {selectedClientDetail.terminationReason}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                Informasi detail paket &amp; data klien tersimpan permanen di sistem.
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {selectedClientDetail.status === 'pending_acc' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedClientDetail;
                      setSelectedClientDetail(null);
                      openReviewModal(target);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    🔍 Lanjut Review &amp; Approve Klien
                  </button>
                )}
                {selectedClientDetail.status === 'active_subscription' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedClientDetail;
                        setSelectedClientDetail(null);
                        handleConfirmRecurringBill(target.id, target.pricingType);
                      }}
                      className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                      title="Catat & approve pembayaran siklus langganan berikutnya untuk mencairkan komisi rutin Mitra"
                    >
                      ✓ Approve Pembayaran{' '}
                      {selectedClientDetail.pricingType === 'annual_subscription'
                        ? `Tahun Ke-${(selectedClientDetail.recurringPaidYears || 1) + 1}`
                        : `Bulan #${(selectedClientDetail.recurringPaidMonths || 1) + 1}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedClientDetail;
                        setSelectedClientDetail(null);
                        setDealToTerminate(target);
                        setTerminationReason(
                          target.pricingType === 'annual_subscription'
                            ? 'Klien mengakhiri / putus langganan layanan tahunan'
                            : 'Klien mengakhiri / putus langganan layanan bulanan'
                        );
                      }}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      ✕ Putus Langganan
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedClientDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
