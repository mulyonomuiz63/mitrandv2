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
import {
  Mitra,
  ClientDeal,
  CommissionTransaction,
  PayoutRequest,
  ActivityLogItem,
  EmailLogItem,
  CommissionSchemeConfig,
  BonusTargetConfig,
  DEFAULT_COMMISSION_SCHEME,
  DEFAULT_BONUS_TARGET_CONFIG,
  DEFAULT_BONUS_REWARD_TIERS,
  resolveBonusRewardTiers,
  resolveQualifiedRewardTier,
  PayoutScheduleType,
  getPayoutScheduleLabel,
  calculateClientDealCommission,
} from '../types';
import { Award, Target, Gift } from 'lucide-react';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import { useConfirm } from './ConfirmDialogModal';
import { compressAndUploadFile } from '../utils/fileCompressor';
import {
  useServerDataTable,
  ServerDataTableTopBar,
  ServerDataTableFooter,
  parseClientRecordTimestamp,
} from './ServerDataTableControls';

export type AdminSubTab =
  | 'client_validation'
  | 'commission_bonus'
  | 'mitra_analysis'
  | 'payout_management'
  | 'activity_logs'
  | 'email_logs';

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
  const [reviewDealValue, setReviewDealValue] = useState<number>(0);
  const [reviewCustomRate, setReviewCustomRate] = useState<number>(15);
  const [reviewCustomRecurringRate, setReviewCustomRecurringRate] = useState<number>(10);
  const [rejectReason, setRejectReason] = useState<string>('Tidak deal setelah konfirmasi dengan calon klien');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Per-Client Commission Scheme & Bonus Target Management State
  const [commScheme, setCommScheme] = useState<CommissionSchemeConfig>({ ...DEFAULT_COMMISSION_SCHEME });
  const [bonusTarget, setBonusTarget] = useState<BonusTargetConfig>({ ...DEFAULT_BONUS_TARGET_CONFIG });
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutScheduleType>('awal_bulan');
  const [isSavingScheme, setIsSavingScheme] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Grant Bonus to Mitra Modal State
  const [mitraForBonus, setMitraForBonus] = useState<Mitra | null>(null);
  const [bonusAmountInput, setBonusAmountInput] = useState<number>(5000000);
  const [bonusTitleInput, setBonusTitleInput] = useState<string>('Bonus Pencapaian Target Standar Mitra');
  const [bonusPeriodInput, setBonusPeriodInput] = useState<string>('Target Bulanan');
  const [bonusNotesInput, setBonusNotesInput] = useState<string>('Melampaui target standar performa deal klien NDTAXANDLAW');
  const [isGrantingBonus, setIsGrantingBonus] = useState(false);

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
  const [proofFileSizeInfo, setProofFileSizeInfo] = useState<string>('');
  const [isCompressingProof, setIsCompressingProof] = useState<boolean>(false);
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

  const isDealInBillingWindow = (d: ClientDeal): boolean => {
    if (d.status !== 'active_subscription') return false;
    if (d.isBillingDue) return true;
    if (!d.nextBillingDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(`${d.nextBillingDate}T00:00:00`);
    if (isNaN(nextDate.getTime())) return false;
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const fetchCommissionSchemeSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data?.success && data?.data) {
        if (data.data.commissionScheme) {
          setCommScheme({ ...DEFAULT_COMMISSION_SCHEME, ...data.data.commissionScheme });
        }
        if (data.data.bonusTargetConfig) {
          const raw = data.data.bonusTargetConfig;
          const mEnabled = raw.monthlyBonusEnabled !== false;
          const yEnabled = raw.yearlyBonusEnabled !== false;
          let pType: 'monthly' | 'yearly' = raw.periodType === 'yearly' ? 'yearly' : 'monthly';
          if (pType === 'monthly' && !mEnabled && yEnabled) pType = 'yearly';
          if (pType === 'yearly' && !yEnabled && mEnabled) pType = 'monthly';
          const mRev = raw.monthlyTargetDealRevenue ?? (pType === 'monthly' ? raw.targetDealRevenue : DEFAULT_BONUS_TARGET_CONFIG.monthlyTargetDealRevenue) ?? 50000000;
          const mCount = raw.monthlyTargetClientCount ?? (pType === 'monthly' ? raw.targetClientCount : DEFAULT_BONUS_TARGET_CONFIG.monthlyTargetClientCount) ?? 3;
          const mBonus = raw.monthlyStandardBonusAmount ?? (pType === 'monthly' ? raw.standardBonusAmount : DEFAULT_BONUS_TARGET_CONFIG.monthlyStandardBonusAmount) ?? 5000000;
          const yRev = raw.yearlyTargetDealRevenue ?? (pType === 'yearly' ? raw.targetDealRevenue : DEFAULT_BONUS_TARGET_CONFIG.yearlyTargetDealRevenue) ?? 500000000;
          const yCount = raw.yearlyTargetClientCount ?? (pType === 'yearly' ? raw.targetClientCount : DEFAULT_BONUS_TARGET_CONFIG.yearlyTargetClientCount) ?? 12;
          const yBonus = raw.yearlyStandardBonusAmount ?? (pType === 'yearly' ? raw.standardBonusAmount : DEFAULT_BONUS_TARGET_CONFIG.yearlyStandardBonusAmount) ?? 25000000;
          setBonusTarget({
            ...DEFAULT_BONUS_TARGET_CONFIG,
            ...raw,
            periodType: pType,
            monthlyBonusEnabled: mEnabled,
            yearlyBonusEnabled: yEnabled,
            monthlyTargetDealRevenue: mRev,
            monthlyTargetClientCount: mCount,
            monthlyStandardBonusAmount: mBonus,
            yearlyTargetDealRevenue: yRev,
            yearlyTargetClientCount: yCount,
            yearlyStandardBonusAmount: yBonus,
            targetDealRevenue: pType === 'yearly' ? yRev : mRev,
            targetClientCount: pType === 'yearly' ? yCount : mCount,
            standardBonusAmount: pType === 'yearly' ? yBonus : mBonus,
            rewardTiers: resolveBonusRewardTiers(raw),
          });
        }
        if (data.data.payoutSchedule) {
          setPayoutSchedule(data.data.payoutSchedule);
        }
      }
    } catch {}
  };

  const handleSavePayoutSchedule = async (newSchedule: PayoutScheduleType) => {
    setPayoutSchedule(newSchedule);
    setIsSavingSchedule(true);
    try {
      const res = await fetch('/api/admin/commission-scheme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutSchedule: newSchedule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          `Jadwal pencairan komisi berhasil diatur ke: ${getPayoutScheduleLabel(newSchedule)}`
        );
        setTimeout(() => setActionSuccessMsg(''), 4000);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save payout schedule:', err);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests();
    fetchActivityLogs();
    fetchEmailLogs();
    fetchCommissionSchemeSettings();
  }, []);

  const handleSaveCommissionScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    const mEnabled = bonusTarget.monthlyBonusEnabled !== false;
    const yEnabled = bonusTarget.yearlyBonusEnabled !== false;
    const ok = await confirm({
      title: 'Simpan Pengaturan Skema Komisi & Target Bonus',
      message:
        'Apakah Anda yakin ingin memperbarui persentase skema komisi per klien, status aktif bonus bulanan/tahunan, dan tabel hadiah capaian penjualan mitra?',
      detail: `Langganan: <Rp ${(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.subLowRate}%, Rp ${(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')}–${(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.subMidRate}%, ≥Rp ${(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.subHighRate}% (Bulan Berikutnya: ${commScheme.subRecurringRate}%)\nCase-by-Case: <Rp ${(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.caseLowRate}%, Rp ${(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')}–${(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.caseMidRate}%, ≥Rp ${(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')}Jt = ${commScheme.caseHighRate}%\nBonus Per Bulan: ${mEnabled ? `AKTIF (Target Rp ${Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000).toLocaleString('id-ID')})` : 'NONAKTIF'}\nBonus Per Tahun: ${yEnabled ? `AKTIF (Target Rp ${Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000).toLocaleString('id-ID')})` : 'NONAKTIF'}`,
      confirmText: 'Ya, Simpan Skema & Target',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSavingScheme(true);
    try {
      const res = await fetch('/api/admin/commission-scheme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionScheme: commScheme,
          bonusTargetConfig: bonusTarget,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          data.message || 'Skema komisi per klien dan standar target bonus berhasil diperbarui!'
        );
        setTimeout(() => setActionSuccessMsg(''), 4500);
        fetchActivityLogs();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save commission scheme:', err);
    } finally {
      setIsSavingScheme(false);
    }
  };

  const handleOpenGrantBonusModal = (m: Mitra) => {
    const mDeals = clientDeals.filter(
      (d) =>
        d.mitraId === m.id &&
        (d.status === 'active_subscription' || d.status === 'deal_closed')
    );
    const totalDealOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
    const { achievedTier } = resolveQualifiedRewardTier(totalDealOmzet, bonusTarget);
    const mEnabled = bonusTarget.monthlyBonusEnabled !== false;
    const yEnabled = bonusTarget.yearlyBonusEnabled !== false;
    const defaultPeriod =
      bonusTarget.periodType === 'yearly' && yEnabled
        ? 'Target Tahunan'
        : mEnabled
        ? 'Target Bulanan'
        : yEnabled
        ? 'Target Tahunan'
        : 'Bonus Khusus Prestasi';

    setMitraForBonus(m);
    setBonusAmountInput(
      defaultPeriod === 'Target Tahunan'
        ? bonusTarget.yearlyStandardBonusAmount || bonusTarget.standardBonusAmount || 25000000
        : bonusTarget.monthlyStandardBonusAmount || bonusTarget.standardBonusAmount || 5000000
    );
    setBonusTitleInput(
      achievedTier
        ? `Hadiah / Bonus Tier ${achievedTier.no}: ${achievedTier.rewardName}`
        : `Bonus Pencapaian ${defaultPeriod} Mitra`
    );
    setBonusPeriodInput(defaultPeriod);
    setBonusNotesInput(
      achievedTier
        ? `Melampaui Capaian Penjualan Rp ${achievedTier.salesTarget.toLocaleString('id-ID')} — Hadiah/Bonus: ${achievedTier.rewardName}`
        : bonusTarget.rewardDescription || 'Apresiasi pencapaian target performa deal klien'
    );
  };

  const handleGrantBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraForBonus) return;
    const ok = await confirm({
      title: 'Konfirmasi Pemberian Bonus ke Mitra',
      message: `Apakah Anda yakin ingin memberikan bonus sebesar Rp ${Number(bonusAmountInput).toLocaleString('id-ID')} kepada Mitra ${mitraForBonus.fullName}? Dana bonus akan langsung masuk ke saldo siap cair Mitra.`,
      detail: `Penerima: ${mitraForBonus.fullName} (${mitraForBonus.memberCode})\nJudul Bonus: ${bonusTitleInput}\nPeriode Target: ${bonusPeriodInput}\nNominal Bonus: Rp ${Number(bonusAmountInput).toLocaleString('id-ID')}\nCatatan: ${bonusNotesInput}`,
      confirmText: 'Ya, Berikan Bonus ke Mitra',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

    setIsGrantingBonus(true);
    try {
      const res = await fetch(`/api/admin/mitra/${mitraForBonus.id}/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bonusAmount: Number(bonusAmountInput),
          title: bonusTitleInput,
          periodLabel: bonusPeriodInput,
          notes: bonusNotesInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          data.message || `Bonus Rp ${Number(bonusAmountInput).toLocaleString('id-ID')} berhasil diberikan ke ${mitraForBonus.fullName}!`
        );
        setTimeout(() => setActionSuccessMsg(''), 4500);
        setMitraForBonus(null);
        fetchActivityLogs();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to grant bonus:', err);
    } finally {
      setIsGrantingBonus(false);
    }
  };

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
    setReviewDealValue(deal.dealValue);
    const tierCalc = calculateClientDealCommission(deal.pricingType, deal.dealValue, commScheme);
    setReviewCustomRate(deal.appliedCommissionRate ?? tierCalc.initialRate);
    setReviewCustomRecurringRate(
      deal.pricingType === 'case_by_case' ? 0 : deal.lockedRecurringRate ?? tierCalc.recurringRate
    );
    setRejectReason('Tidak deal setelah konfirmasi dengan calon klien');
  };

  // 1.1 Approve Client Deal (Direct or from Review Modal)
  const handleAccClient = async (
    dealId: string,
    customStartDate?: string,
    customBillingDay?: number,
    customVal?: number,
    customRate?: number,
    customRecRate?: number
  ) => {
    const targetDeal = clientDeals.find((d) => d.id === dealId);
    const finalDealVal = customVal !== undefined && customVal > 0 ? customVal : targetDeal?.dealValue || 0;
    const tierCalc = calculateClientDealCommission(
      targetDeal?.pricingType || 'case_by_case',
      finalDealVal,
      commScheme
    );
    const finalRate = customRate !== undefined ? customRate : targetDeal?.appliedCommissionRate ?? tierCalc.initialRate;
    const finalRecRate =
      targetDeal?.pricingType === 'case_by_case'
        ? 0
        : customRecRate !== undefined
          ? customRecRate
          : targetDeal?.lockedRecurringRate ?? tierCalc.recurringRate;
    const finalCommAmt = Math.round((finalDealVal * finalRate) / 100);

    const ok = await confirm({
      title: 'Approve Deal Klien (ACC) & Kunci Komisi',
      message: `Apakah Anda yakin ingin menyetujui (Approve Deal) klien "${targetDeal?.companyName || ''}"? Komisi akan langsung masuk ke saldo akun Mitra dan persentase komisi dikunci pada kontrak klien ini.`,
      detail: targetDeal
        ? `Perusahaan Klien: ${targetDeal.companyName}\nLayanan: ${targetDeal.serviceName}\nMitra Perujuk: ${targetDeal.mitraName}\nNilai Kontrak: ${formatRupiah(finalDealVal)}\nKomisi Deal (${finalRate}%): ${formatRupiah(finalCommAmt)}${targetDeal.pricingType !== 'case_by_case' ? `\nKomisi Berulang Bulan Berikutnya (${finalRecRate}% Terkunci): ${formatRupiah(Math.round((finalDealVal * finalRecRate) / 100))}/siklus` : ''}`
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
          dealValue: finalDealVal,
          customCommissionRate: finalRate,
          customRecurringRate: finalRecRate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(
          `Klien "${data.data.companyName}" berhasil di-Approve (Deal)! Komisi (${data.data.appliedCommissionRate || finalRate}%) Rp ${data.data.commissionAmount.toLocaleString('id-ID')} resmi masuk ke saldo siap cair Mitra ${data.data.mitraName}.`
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

  // 3. Open Approval Modal (existing request or direct disbursement for a Mitra)
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
    setProofFileSizeInfo('');
  };

  const openDirectDisburseModal = (m: Mitra) => {
    const gross = Math.max(0, Number(m.pendingPayout) || 0);
    const syntheticPayout: PayoutRequest = {
      id: '__direct__',
      mitraId: m.id,
      mitraName: m.fullName,
      memberCode: m.memberCode,
      amount: gross,
      bankDetails: m.bankDetails || {
        bankName: '-',
        accountNumber: '-',
        accountHolder: m.fullName,
      },
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    openApproveModal(syntheticPayout);
  };

  // Handle PPh Preset change
  const handlePphPresetChange = (percent: number) => {
    setPphRate(percent);
    if (!payoutToApprove) return;
    const calculated = Math.round((payoutToApprove.amount * percent) / 100);
    setPphNominal(calculated);
  };

  // File Upload Handler (PDF / JPG / PNG with automatic compression & server storage)
  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFileName(file.name);
    setIsCompressingProof(true);
    try {
      const result = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      setProofFileUrl(result.hostedUrl || result.dataUrl);
      if (result.originalFormattedSize !== result.compressedFormattedSize) {
        setProofFileSizeInfo(`${result.compressedFormattedSize} (Dikompresi dari ${result.originalFormattedSize})`);
      } else {
        setProofFileSizeInfo(result.compressedFormattedSize);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setProofFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingProof(false);
    }
  };

  // Submit Approval with Deductions & Proof (Supports both Direct Admin Disbursement and Request Approval)
  const handleSubmitPayoutApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutToApprove) return;

    const gross = payoutToApprove.amount || 0;
    const net = Math.max(0, gross - pphNominal - adminFee);
    const isDirect = payoutToApprove.id === '__direct__';

    const ok = await confirm({
      title: 'Konfirmasi Pencairan & Transfer Komisi Mitra',
      message: `Apakah Anda yakin ingin mencairkan dan menyelesaikan transfer komisi untuk Mitra "${payoutToApprove.mitraName}"? Saldo siap cair Mitra akan otomatis dikurangi.`,
      detail: `Nama Mitra: ${payoutToApprove.mitraName}\nRekening Tujuan: ${payoutToApprove.bankDetails.bankName} - ${payoutToApprove.bankDetails.accountNumber} (a.n. ${payoutToApprove.bankDetails.accountHolder})\nNominal Komisi (Kotor): ${formatRupiah(gross)}\nPotongan PPh 21 & Admin: - ${formatRupiah(pphNominal + adminFee)}\nTotal Bersih Ditransfer: ${formatRupiah(net)}`,
      confirmText: 'Ya, Cairkan & Selesaikan Transfer',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

    setIsSubmittingApproval(true);

    try {
      const url = isDirect
        ? '/api/commissions/direct-disburse'
        : `/api/commissions/payout-requests/${payoutToApprove.id}/approve`;
      const method = isDirect ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraId: payoutToApprove.mitraId,
          amount: gross,
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
        setActionSuccessMsg(`Pencairan komisi untuk ${data.data.mitraName} berhasil diselesaikan! Bersih ditransfer: ${formatRupiah(net)} (Bukti tersimpan).`);
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

  // 1. Validasi & ACC Klien — sorted newest first + server-side DataTables
  const sortedFilteredDeals = React.useMemo(() => {
    const withTs = clientDeals.map((d, idx) => ({
      item: d,
      ts: parseClientRecordTimestamp(d.date || d.subscriptionStartDate, d.id, clientDeals.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    const q = searchTerm.toLowerCase().trim();
    return withTs
      .map((x) => x.item)
      .filter((deal) => {
        const matchFilter = clientFilter === 'all' || deal.status === clientFilter;
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
  }, [clientDeals, clientFilter, searchTerm]);

  const clientsValidationDt = useServerDataTable<ClientDeal>({
    resource: 'clients',
    fallbackItems: sortedFilteredDeals,
    defaultPerPage: 10,
    externalSearch: searchTerm,
    extraParams: { status: clientFilter },
    dependencyKey: `${clientDeals.length}-${clientDeals.map((d) => `${d.id}:${d.status}`).join(',')}`,
  });

  const filteredDeals = clientsValidationDt.rows;

  // 2. Analisa Kinerja Mitra — status pending teratas, kemudian status terverifikasi, dan klien terdaftar terbanyak
  const sortedPerformanceMitras = React.useMemo(() => {
    const getRank = (st: string) => (st === 'pending' ? 0 : st === 'verified' ? 1 : 2);
    return [...mitras].sort((a, b) => {
      const rankDiff = getRank(a.status) - getRank(b.status);
      if (rankDiff !== 0) return rankDiff;
      const cliDiff = (Number(b.referredClientsCount) || 0) - (Number(a.referredClientsCount) || 0);
      if (cliDiff !== 0) return cliDiff;
      return (Number(b.totalCommission) || 0) - (Number(a.totalCommission) || 0);
    });
  }, [mitras]);

  const mitraAnalysisDt = useServerDataTable<Mitra>({
    resource: 'mitra-performance',
    fallbackItems: sortedPerformanceMitras,
    defaultPerPage: 10,
    dependencyKey: `${mitras.length}-${mitras.map((m) => `${m.id}:${m.status}:${m.referredClientsCount}`).join(',')}`,
  });

  // 3. Pencairan Saldo Komisi Mitra — dana komisi terbesar yang siap dicairkan paling atas
  const sortedPayoutBalanceMitras = React.useMemo(() => {
    return [...mitras].sort((a, b) => {
      const balDiff = (Number(b.pendingPayout) || 0) - (Number(a.pendingPayout) || 0);
      if (balDiff !== 0) return balDiff;
      return (Number(b.totalCommission) || 0) - (Number(a.totalCommission) || 0);
    });
  }, [mitras]);

  const payoutBalanceDt = useServerDataTable<Mitra>({
    resource: 'mitra-payout-balances',
    fallbackItems: sortedPayoutBalanceMitras,
    defaultPerPage: 10,
    dependencyKey: `${mitras.length}-${mitras.map((m) => `${m.id}:${m.pendingPayout}`).join(',')}`,
  });

  // 4. Riwayat Pencairan Dana Komisi & Slip Transfer — terbaru paling atas
  const sortedPayoutHistory = React.useMemo(() => {
    const withTs = payoutRequests.map((p, idx) => ({
      item: p,
      ts: parseClientRecordTimestamp(p.processedDate || p.requestDate, p.id, payoutRequests.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map((x) => x.item);
  }, [payoutRequests]);

  const payoutHistoryDt = useServerDataTable<PayoutRequest>({
    resource: 'payout-requests',
    fallbackItems: sortedPayoutHistory,
    defaultPerPage: 10,
    dependencyKey: `${payoutRequests.length}-${payoutRequests.map((p) => `${p.id}:${p.status}`).join(',')}`,
  });

  // 5. Evaluasi Pencapaian Target & Proses Pemberian Bonus ke Mitra — mitra yang sudah mencapai target paling atas
  const sortedTargetEvalMitras = React.useMemo(() => {
    const mRevTarget = Math.max(1, Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000));
    const mCliTarget = Math.max(1, Number(bonusTarget.monthlyTargetClientCount ?? 3));
    const yRevTarget = Math.max(1, Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000));
    const yCliTarget = Math.max(1, Number(bonusTarget.yearlyTargetClientCount ?? 12));

    const enriched = mitras.map((m) => {
      const mDeals = clientDeals.filter(
        (d) =>
          d.mitraId === m.id &&
          (d.status === 'active_subscription' || d.status === 'deal_closed')
      );
      const totalDealOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
      const totalDealClients = mDeals.length;
      const mExceeded = totalDealOmzet >= mRevTarget || totalDealClients >= mCliTarget;
      const yExceeded = totalDealOmzet >= yRevTarget || totalDealClients >= yCliTarget;
      const { achievedTier } = resolveQualifiedRewardTier(totalDealOmzet, bonusTarget);
      const achieved = mExceeded || yExceeded || Boolean(achievedTier);
      return {
        item: m,
        achieved: achieved ? 1 : 0,
        omzet: totalDealOmzet,
        clients: totalDealClients,
      };
    });

    enriched.sort((a, b) => {
      if (b.achieved !== a.achieved) return b.achieved - a.achieved;
      if (b.omzet !== a.omzet) return b.omzet - a.omzet;
      return b.clients - a.clients;
    });

    return enriched.map((x) => x.item);
  }, [mitras, clientDeals, bonusTarget]);

  const targetEvalDt = useServerDataTable<Mitra>({
    resource: 'mitra-target-evaluation',
    fallbackItems: sortedTargetEvalMitras,
    defaultPerPage: 10,
    dependencyKey: `${mitras.length}-${clientDeals.length}-${mitras.map((m) => m.totalBonus).join(',')}`,
  });

  const pendingAccCount = clientDeals.filter((d) => d.status === 'pending_acc').length;
  const pendingPayoutCount = payoutRequests.filter((p) => p.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
      
      {/* Toast Notification (Identik Hijau untuk Sukses, Merah untuk Gagal) */}
      {actionSuccessMsg && (
        <div
          className={`fixed bottom-6 right-6 z-[160] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold border-2 animate-in fade-in ${
            actionSuccessMsg.toLowerCase().includes('gagal') ||
            actionSuccessMsg.toLowerCase().includes('ditolak')
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-emerald-600 text-white border-emerald-400'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            {resolvedMode === 'logs'
              ? 'Pusat Log Aktivitas & Pengiriman Email'
              : 'Pusat Operasional Klien & Komisi Mitra'}
          </h1>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Terpisah Sesuai Menu Utama & Responsif di Mobile) */}
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {resolvedMode === 'operations' ? (
          <>
            <button
              type="button"
              onClick={() => setActiveSubTab('client_validation')}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'client_validation'
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Validasi &amp; ACC Klien</span>
              {pendingAccCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-mono font-black shrink-0">
                  {pendingAccCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('commission_bonus')}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'commission_bonus'
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="truncate">Manajemen Komisi, Target &amp; Bonus Mitra</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('mitra_analysis')}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'mitra_analysis'
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">Analisa Kinerja Mitra</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('payout_management')}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'payout_management'
                  ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span className="truncate">Kelola Pencairan Komisi &amp; Bukti Transfer</span>
              {pendingPayoutCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-mono font-black shrink-0">
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
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'activity_logs'
                  ? 'bg-indigo-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className="truncate">Log Aktivitas Mitra &amp; Admin</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-900 rounded-full text-[10px] font-mono font-black shrink-0">
                {activityLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('email_logs');
                fetchEmailLogs();
              }}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-2 ${
                activeSubTab === 'email_logs'
                  ? 'bg-indigo-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">Log Pengiriman Email</span>
              {emailLogs.filter((e) => e.status === 'failed').length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-mono font-black shrink-0">
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
            <ServerDataTableTopBar
              perPage={clientsValidationDt.perPage}
              onPerPageChange={clientsValidationDt.setPerPage}
              perPageOptions={[10, 25, 50, 100]}
              hideSearch
              isLoading={clientsValidationDt.isLoading}
              onRefresh={clientsValidationDt.refresh}
              unitLabel="klien"
            />
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
                            {(() => {
                              const calc = calculateClientDealCommission(
                                deal.pricingType,
                                deal.dealValue,
                                commScheme
                              );
                              const lockedRate = deal.appliedCommissionRate ?? calc.initialRate;
                              const lockedRecRate =
                                deal.pricingType === 'case_by_case'
                                  ? 0
                                  : deal.lockedRecurringRate ?? calc.recurringRate;
                              const lockedRecAmt =
                                deal.pricingType === 'case_by_case'
                                  ? 0
                                  : deal.recurringCommissionAmount ||
                                    Math.round((deal.dealValue * lockedRecRate) / 100);

                              if (deal.status === 'pending_acc') {
                                return (
                                  <div>
                                    <div className="font-bold text-amber-700 text-xs">Rp 0</div>
                                    <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                      Belum ACC (Deal {lockedRate}%: {formatRupiah(deal.commissionAmount)})
                                    </span>
                                    {deal.pricingType !== 'case_by_case' && (
                                      <div className="text-[9px] text-slate-500 mt-0.5">
                                        Bln Berikutnya ({lockedRecRate}%): {formatRupiah(lockedRecAmt)}/siklus
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              if (deal.status === 'rejected') {
                                return (
                                  <div>
                                    <div className="line-through text-slate-400 text-[11px]">
                                      {formatRupiah(deal.commissionAmount)}
                                    </div>
                                    <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                                      Rp 0 (Tidak Deal)
                                    </span>
                                  </div>
                                );
                              }
                              if (deal.status === 'cancelled') {
                                return (
                                  <div>
                                    <div className="line-through text-slate-400 text-[11px]">
                                      {formatRupiah(deal.commissionAmount)} ({lockedRate}%)
                                    </div>
                                    <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                                      Komisi Berhenti (Rp 0)
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div>
                                  <div className="font-bold text-emerald-700">
                                    {formatRupiah(deal.commissionAmount)}{' '}
                                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                      {lockedRate}% Deal
                                    </span>
                                  </div>
                                  {deal.pricingType !== 'case_by_case' ? (
                                    <div className="text-[9px] font-semibold text-blue-800 mt-0.5">
                                      Bln Berikutnya ({lockedRecRate}% Terkunci): {formatRupiah(lockedRecAmt)}/siklus
                                    </div>
                                  ) : (
                                    <span className="inline-block text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mt-0.5">
                                      ✓ Komisi Terkunci Waktu Deal
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
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
                                {isDealInBillingWindow(deal) ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClientDetail(deal)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Memasuki jadwal tagihan (H-3 s/d jatuh tempo): Klik untuk melihat detail & approve pembayaran"
                                  >
                                    <span>Tagihan Baru</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClientDetail(deal)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Klik untuk melihat detail informasi langganan dan data klien"
                                  >
                                    <span>Detail</span>
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
                                  className="px-3 py-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Klik untuk melihat detail paket case-by-case dan data klien"
                                >
                                  <span>Detail</span>
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
            <ServerDataTableFooter
              page={clientsValidationDt.meta.page}
              perPage={clientsValidationDt.perPage}
              totalItems={clientsValidationDt.meta.totalItems}
              totalPages={clientsValidationDt.meta.totalPages}
              onPageChange={clientsValidationDt.setPage}
              unitLabel="klien"
            />
          </div>
        </div>
      )}

      {/* VIEW 2: ANALISA KINERJA MITRA */}
      {activeSubTab === 'mitra_analysis' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Matriks Kinerja &amp; Produktivitas Mitra Lapangan
              </h3>
            </div>

            <ServerDataTableTopBar
              perPage={mitraAnalysisDt.perPage}
              onPerPageChange={mitraAnalysisDt.setPerPage}
              perPageOptions={[10, 25, 50, 100]}
              search={mitraAnalysisDt.search}
              onSearchChange={mitraAnalysisDt.setSearch}
              searchPlaceholder="Cari nama mitra, kode anggota, referral, atau spesialisasi..."
              isLoading={mitraAnalysisDt.isLoading}
              onRefresh={mitraAnalysisDt.refresh}
              unitLabel="mitra"
            />

            <div className="overflow-x-auto">
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
                  {mitraAnalysisDt.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Tidak ada data mitra yang sesuai dengan kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    mitraAnalysisDt.rows.map((m) => (
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
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.status === 'verified'
                              ? 'Terverifikasi'
                              : m.status === 'rejected'
                              ? 'Ditolak'
                              : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ServerDataTableFooter
              page={mitraAnalysisDt.meta.page}
              perPage={mitraAnalysisDt.perPage}
              totalItems={mitraAnalysisDt.meta.totalItems}
              totalPages={mitraAnalysisDt.meta.totalPages}
              onPageChange={mitraAnalysisDt.setPage}
              unitLabel="mitra"
            />
          </div>
        </div>
      )}

      {/* VIEW 3: MANAJEMEN PENCAIRAN KOMISI */}
      {activeSubTab === 'payout_management' && (
        <div className="space-y-5">
          {/* Jadwal Pencairan Komisi oleh Admin (Awal Bulan / Pertengahan Bulan / Akhir Bulan) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white border border-amber-400/40 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded">
                  JADWAL PENCAIRAN KOMISI RESMI ADMIN
                </span>
                <span className="text-xs text-blue-100 font-semibold">
                  Aktif: {getPayoutScheduleLabel(payoutSchedule)}
                </span>
              </div>
              <h3 className="text-base font-bold font-display">
                Pengaturan Jadwal Pencairan Komisi Terjadwal oleh Admin
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: 'awal_bulan', label: 'Setiap Awal Bulan' },
                { key: 'pertengahan_bulan', label: 'Setiap Pertengahan Bulan' },
                { key: 'akhir_bulan', label: 'Setiap Akhir Bulan' },
              ] as { key: PayoutScheduleType; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={isSavingSchedule}
                  onClick={() => handleSavePayoutSchedule(opt.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    payoutSchedule === opt.key
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-white/10 text-blue-100 border-amber-400/30 hover:bg-white/20'
                  }`}
                >
                  {payoutSchedule === opt.key ? `✓ ${opt.label}` : opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Pencairan Komisi Langsung oleh Admin (Tanpa Menunggu Pengajuan Mitra) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Pencairan Saldo Komisi Mitra oleh Admin ({getPayoutScheduleLabel(payoutSchedule)})
                </h3>
              </div>
              <div className="text-xs font-semibold text-emerald-700">
                {mitras.filter((m) => (Number(m.pendingPayout) || 0) > 0).length} Mitra Memiliki Saldo Siap Dicairkan
              </div>
            </div>

            <ServerDataTableTopBar
              perPage={payoutBalanceDt.perPage}
              onPerPageChange={payoutBalanceDt.setPerPage}
              perPageOptions={[10, 25, 50, 100]}
              search={payoutBalanceDt.search}
              onSearchChange={payoutBalanceDt.setSearch}
              searchPlaceholder="Cari nama mitra, ID anggota, bank, atau nomor rekening..."
              isLoading={payoutBalanceDt.isLoading}
              onRefresh={payoutBalanceDt.refresh}
              unitLabel="mitra"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Mitra</th>
                    <th className="p-3">Rekening Bank Pencairan</th>
                    <th className="p-3 text-right">Total Komisi Akumulasi</th>
                    <th className="p-3 text-right">Sudah Dicairkan</th>
                    <th className="p-3 text-right">Saldo Siap Dicairkan</th>
                    <th className="p-3 text-right">Tindakan Pencairan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payoutBalanceDt.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Tidak ada data mitra yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    payoutBalanceDt.rows.map((m) => {
                      const readyBalance = Number(m.pendingPayout) || 0;
                      const hasBank =
                        Boolean(m.bankDetails?.bankName && m.bankDetails.bankName !== '-') &&
                        Boolean(m.bankDetails?.accountNumber && m.bankDetails.accountNumber !== '-');
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">
                            <div>{m.fullName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{m.memberCode}</div>
                          </td>
                          <td className="p-3 text-slate-700">
                            {hasBank ? (
                              <>
                                <div className="font-bold text-blue-900">{m.bankDetails.bankName}</div>
                                <div className="font-mono text-slate-800">{m.bankDetails.accountNumber}</div>
                                <div className="text-[10px] text-slate-500">a.n. {m.bankDetails.accountHolder}</div>
                              </>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Belum Melengkapi Rekening
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {formatRupiah(m.totalCommission || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                            {formatRupiah(m.paidPayout || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(readyBalance)}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={readyBalance <= 0}
                              onClick={() => openDirectDisburseModal(m)}
                              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all ${
                                readyBalance > 0
                                  ? 'text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 cursor-pointer'
                                  : 'bg-slate-200 text-slate-600 border border-slate-300 cursor-not-allowed'
                              }`}
                            >
                              {readyBalance > 0 ? 'Proses Pencairan Komisi' : 'Belum Ada Komisi'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <ServerDataTableFooter
              page={payoutBalanceDt.meta.page}
              perPage={payoutBalanceDt.perPage}
              totalItems={payoutBalanceDt.meta.totalItems}
              totalPages={payoutBalanceDt.meta.totalPages}
              onPageChange={payoutBalanceDt.setPage}
              unitLabel="mitra"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Riwayat Pencairan Dana Komisi &amp; Slip Transfer
                </h3>
              </div>

              <div className="text-xs font-semibold text-slate-600">
                Total {payoutRequests.length} Riwayat ({pendingPayoutCount} Menunggu)
              </div>
            </div>

            <ServerDataTableTopBar
              perPage={payoutHistoryDt.perPage}
              onPerPageChange={payoutHistoryDt.setPerPage}
              perPageOptions={[10, 25, 50, 100]}
              search={payoutHistoryDt.search}
              onSearchChange={payoutHistoryDt.setSearch}
              searchPlaceholder="Cari nama mitra, ID anggota, bank, rekening, atau tanggal..."
              isLoading={payoutHistoryDt.isLoading}
              onRefresh={payoutHistoryDt.refresh}
              unitLabel="pencairan"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Tanggal Pencairan</th>
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
                  {payoutHistoryDt.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Belum ada riwayat pencairan dana komisi yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    payoutHistoryDt.rows.map((req) => {
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
                            {req.processedDate || req.requestDate}
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            <ServerDataTableFooter
              page={payoutHistoryDt.meta.page}
              perPage={payoutHistoryDt.perPage}
              totalItems={payoutHistoryDt.meta.totalItems}
              totalPages={payoutHistoryDt.meta.totalPages}
              onPageChange={payoutHistoryDt.setPage}
              unitLabel="pencairan"
            />
          </div>
        </div>
      )}

      {/* VIEW 1.5: MANAJEMEN SKEMA KOMISI PER KLIEN, TARGET & PEMBERIAN BONUS MITRA */}
      {activeSubTab === 'commission_bonus' && (
        <div className="space-y-6">
          {/* Top Hero Card (Mitra ID Card Royal Navy & Gold Theme) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white border border-amber-400/40 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold font-display">
                Pengaturan Komisi Berbasis Per Klien, Target Standar &amp; Pemberian Bonus Mitra
              </h2>
            </div>
          </div>

          {/* Form Pengaturan Skema Komisi Per Klien & Standar Target Bonus */}
          <form onSubmit={handleSaveCommissionScheme} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Tier Komisi Langganan & Case-by-Case */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#113872]" />
                    <span>1. Konfigurasi Persentase Komisi Per Klien</span>
                  </h3>
                </div>
              </div>

              {/* Sistem Langganan */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#092147] uppercase tracking-wider">
                    🔄 A. Sistem Langganan Klien (Bulanan / Tahunan)
                  </span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    Default: 10% / 15% / 20% + 10% Berulang
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batas Atas Deal Langganan Tinggi (Rp)
                    </label>
                    <input
                      type="number"
                      value={commScheme.subHighThreshold}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subHighThreshold: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Default: Rp 10.000.000 (10 Juta ke atas)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal &ge; Rp {(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.subHighRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subHighRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batas Menengah Deal Langganan (Rp)
                    </label>
                    <input
                      type="number"
                      value={commScheme.subMidThreshold}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subMidThreshold: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Default: Rp 5.000.000 (5–10 Juta)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal Rp {(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')}–{(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.subMidRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subMidRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal Di Bawah Rp {(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.subLowRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subLowRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-slate-800 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-emerald-800 mb-1">
                      Komisi Berulang Bulan/Siklus Berikutnya (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.subRecurringRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, subRecurringRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-extrabold text-emerald-700 border border-emerald-300 rounded-lg bg-emerald-50/50"
                    />
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Selama klien aktif bayar langganan bulan berikutnya (Default: 10%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Sistem Case-by-Case */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#092147] uppercase tracking-wider">
                    ⚡ B. Sistem Case-by-Case (Per Kasus Sekali Bayar)
                  </span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    Default: 10% (&lt;50Jt) / 15% (50–100Jt) / 20% (&ge;100Jt)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batas Atas Deal Case-by-Case Tinggi (Rp)
                    </label>
                    <input
                      type="number"
                      value={commScheme.caseHighThreshold}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, caseHighThreshold: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Default: Rp 100.000.000 (100 Juta ke atas)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal &ge; Rp {(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.caseHighRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, caseHighRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batas Menengah Deal Case-by-Case (Rp)
                    </label>
                    <input
                      type="number"
                      value={commScheme.caseMidThreshold}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, caseMidThreshold: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[10px] text-slate-500">Default: Rp 50.000.000 (50–100 Juta)</span>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal Rp {(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')}–{(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.caseMidRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, caseMidRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Komisi Deal Di Bawah Rp {(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')} Juta (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={commScheme.caseLowRate}
                      onChange={(e) =>
                        setCommScheme({ ...commScheme, caseLowRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-slate-800 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Pengaturan Standar Target Bulanan / Tahunan & Tabel Hadiah/Bonus */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span>2. Standar Target &amp; Bonus Mitra (Per Bulan / Per Tahun)</span>
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Status Aktif / Nonaktif Target & Bonus Per Bulan dan Per Tahun */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      Status Aktif Bonus Per Bulan &amp; Per Tahun
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Toggle Bonus Per Bulan */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          bonusTarget.monthlyBonusEnabled !== false
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200 opacity-75'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">Bonus Per Bulan</div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            {bonusTarget.monthlyBonusEnabled !== false ? 'Status: Aktif' : 'Status: Nonaktif'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !(bonusTarget.monthlyBonusEnabled !== false);
                            setBonusTarget({
                              ...bonusTarget,
                              monthlyBonusEnabled: nextVal,
                              periodType: !nextVal && bonusTarget.yearlyBonusEnabled !== false ? 'yearly' : bonusTarget.periodType,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                            bonusTarget.monthlyBonusEnabled !== false
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {bonusTarget.monthlyBonusEnabled !== false ? 'AKTIF' : 'NONAKTIF'}
                        </button>
                      </div>

                      {/* Toggle Bonus Per Tahun */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          bonusTarget.yearlyBonusEnabled !== false
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200 opacity-75'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">Bonus Per Tahun</div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            {bonusTarget.yearlyBonusEnabled !== false ? 'Status: Aktif' : 'Status: Nonaktif'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !(bonusTarget.yearlyBonusEnabled !== false);
                            setBonusTarget({
                              ...bonusTarget,
                              yearlyBonusEnabled: nextVal,
                              periodType: !nextVal && bonusTarget.monthlyBonusEnabled !== false ? 'monthly' : bonusTarget.periodType,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                            bonusTarget.yearlyBonusEnabled !== false
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {bonusTarget.yearlyBonusEnabled !== false ? 'AKTIF' : 'NONAKTIF'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tab Pilihan Konfigurasi Periode (Per Bulan / Per Tahun) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Pilih Periode Target untuk Dikonfigurasi / Ditampilkan Utama
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const mRev = bonusTarget.monthlyTargetDealRevenue ?? 50000000;
                          const mCount = bonusTarget.monthlyTargetClientCount ?? 3;
                          const mBonus = bonusTarget.monthlyStandardBonusAmount ?? 5000000;
                          setBonusTarget({
                            ...bonusTarget,
                            periodType: 'monthly',
                            monthlyTargetDealRevenue: mRev,
                            monthlyTargetClientCount: mCount,
                            monthlyStandardBonusAmount: mBonus,
                            targetDealRevenue: mRev,
                            targetClientCount: mCount,
                            standardBonusAmount: mBonus,
                          });
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                          bonusTarget.periodType === 'monthly'
                            ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border-amber-400/40 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        📅 Target Per Bulan {bonusTarget.monthlyBonusEnabled === false ? '(Nonaktif)' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yRev = bonusTarget.yearlyTargetDealRevenue ?? 500000000;
                          const yCount = bonusTarget.yearlyTargetClientCount ?? 12;
                          const yBonus = bonusTarget.yearlyStandardBonusAmount ?? 25000000;
                          setBonusTarget({
                            ...bonusTarget,
                            periodType: 'yearly',
                            yearlyTargetDealRevenue: yRev,
                            yearlyTargetClientCount: yCount,
                            yearlyStandardBonusAmount: yBonus,
                            targetDealRevenue: yRev,
                            targetClientCount: yCount,
                            standardBonusAmount: yBonus,
                          });
                        }}
                        className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                          bonusTarget.periodType === 'yearly'
                            ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border-amber-400/40 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        🏆 Target Per Tahun {bonusTarget.yearlyBonusEnabled === false ? '(Nonaktif)' : ''}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Standar Target Capaian Penjualan ({bonusTarget.periodType === 'yearly' ? 'Per Tahun' : 'Per Bulan'}) (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={
                        bonusTarget.periodType === 'yearly'
                          ? bonusTarget.yearlyTargetDealRevenue ?? bonusTarget.targetDealRevenue
                          : bonusTarget.monthlyTargetDealRevenue ?? bonusTarget.targetDealRevenue
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (bonusTarget.periodType === 'yearly') {
                          setBonusTarget({
                            ...bonusTarget,
                            yearlyTargetDealRevenue: val,
                            targetDealRevenue: val,
                          });
                        } else {
                          setBonusTarget({
                            ...bonusTarget,
                            monthlyTargetDealRevenue: val,
                            targetDealRevenue: val,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Target Jumlah Klien ({bonusTarget.periodType === 'yearly' ? 'Tahunan' : 'Bulanan'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={
                          bonusTarget.periodType === 'yearly'
                            ? bonusTarget.yearlyTargetClientCount ?? bonusTarget.targetClientCount
                            : bonusTarget.monthlyTargetClientCount ?? bonusTarget.targetClientCount
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (bonusTarget.periodType === 'yearly') {
                            setBonusTarget({
                              ...bonusTarget,
                              yearlyTargetClientCount: val,
                              targetClientCount: val,
                            });
                          } else {
                            setBonusTarget({
                              ...bonusTarget,
                              monthlyTargetClientCount: val,
                              targetClientCount: val,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Bonus Tunai Standar ({bonusTarget.periodType === 'yearly' ? 'Tahunan' : 'Bulanan'}) (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={
                          bonusTarget.periodType === 'yearly'
                            ? bonusTarget.yearlyStandardBonusAmount ?? bonusTarget.standardBonusAmount
                            : bonusTarget.monthlyStandardBonusAmount ?? bonusTarget.standardBonusAmount
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (bonusTarget.periodType === 'yearly') {
                            setBonusTarget({
                              ...bonusTarget,
                              yearlyStandardBonusAmount: val,
                              standardBonusAmount: val,
                            });
                          } else {
                            setBonusTarget({
                              ...bonusTarget,
                              monthlyStandardBonusAmount: val,
                              standardBonusAmount: val,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 font-mono font-extrabold text-emerald-700 border border-emerald-300 rounded-lg bg-emerald-50/40"
                      />
                    </div>
                  </div>

                  {/* Tabel 5 Tier Capaian Penjualan & Hadiah/Bonus */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                        Tabel Capaian Penjualan &amp; Hadiah/Bonus
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setBonusTarget({
                            ...bonusTarget,
                            rewardTiers: DEFAULT_BONUS_REWARD_TIERS.map((t) => ({ ...t })),
                          })
                        }
                        className="text-[10px] font-bold text-[#113872] hover:underline cursor-pointer"
                      >
                        Reset Default
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                            <th className="py-2 px-2.5 text-center w-10">NO</th>
                            <th className="py-2 px-2.5">CAPAIAN PENJUALAN (Rp)</th>
                            <th className="py-2 px-2.5">HADIAH/BONUS</th>
                            <th className="py-2 px-2.5 text-center">AKTIF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {resolveBonusRewardTiers(bonusTarget).map((tier, idx) => (
                            <tr key={tier.id} className={tier.isActive === false ? 'opacity-50 bg-slate-50' : ''}>
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700">
                                {tier.no}
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={tier.salesTarget}
                                  onChange={(e) => {
                                    const updated = resolveBonusRewardTiers(bonusTarget).map((item, i) =>
                                      i === idx ? { ...item, salesTarget: Number(e.target.value) } : item
                                    );
                                    setBonusTarget({ ...bonusTarget, rewardTiers: updated });
                                  }}
                                  className="w-full px-2 py-1 font-mono font-bold text-slate-900 border border-slate-300 rounded-md"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={tier.rewardName}
                                  onChange={(e) => {
                                    const updated = resolveBonusRewardTiers(bonusTarget).map((item, i) =>
                                      i === idx ? { ...item, rewardName: e.target.value } : item
                                    );
                                    setBonusTarget({ ...bonusTarget, rewardTiers: updated });
                                  }}
                                  className="w-full px-2 py-1 font-bold text-[#113872] border border-slate-300 rounded-md"
                                />
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={tier.isActive !== false}
                                  onChange={(e) => {
                                    const updated = resolveBonusRewardTiers(bonusTarget).map((item, i) =>
                                      i === idx ? { ...item, isActive: e.target.checked } : item
                                    );
                                    setBonusTarget({ ...bonusTarget, rewardTiers: updated });
                                  }}
                                  className="w-4 h-4 accent-[#113872] cursor-pointer"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
                  🔒 <strong>Jaminan Komisi Waktu Deal:</strong> Perubahan skema komisi di atas hanya berlaku untuk pengajuan klien baru. Klien yang sudah langganan aktif tetap memakai tarif komisi saat waktu deal.
                </div>
                <button
                  type="submit"
                  disabled={isSavingScheme}
                  className="w-full py-2.5 px-4 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>
                    {isSavingScheme
                      ? 'Menyimpan Pengaturan...'
                      : 'Simpan'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Section 3: Tabel Evaluasi Pencapaian Target Mitra & Proses Pemberian Bonus */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#113872]" />
                  <span>3. Evaluasi Pencapaian Target &amp; Proses Pemberian Bonus ke Mitra</span>
                </h3>
              </div>
            </div>

            <ServerDataTableTopBar
              perPage={targetEvalDt.perPage}
              onPerPageChange={targetEvalDt.setPerPage}
              perPageOptions={[10, 25, 50, 100]}
              search={targetEvalDt.search}
              onSearchChange={targetEvalDt.setSearch}
              searchPlaceholder="Cari nama mitra, ID anggota, atau kode referral..."
              isLoading={targetEvalDt.isLoading}
              onRefresh={targetEvalDt.refresh}
              unitLabel="mitra"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Nama Mitra &amp; ID</th>
                    <th className="py-3 px-4 text-center">Klien Deal</th>
                    <th className="py-3 px-4 text-right">Capaian Penjualan</th>
                    <th className="py-3 px-4">Status Target Bulanan &amp; Tahunan</th>
                    <th className="py-3 px-4">Tier Hadiah / Bonus</th>
                    <th className="py-3 px-4 text-right">Total Bonus Diterima</th>
                    <th className="py-3 px-4 text-right">Proses Pemberian Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetEvalDt.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Tidak ada data mitra yang sesuai dengan kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    targetEvalDt.rows.map((m) => {
                      const mDeals = clientDeals.filter(
                        (d) =>
                          d.mitraId === m.id &&
                          (d.status === 'active_subscription' || d.status === 'deal_closed')
                      );
                      const totalDealOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
                      const totalDealClients = mDeals.length;

                      const mEnabled = bonusTarget.monthlyBonusEnabled !== false;
                      const yEnabled = bonusTarget.yearlyBonusEnabled !== false;
                      const mRevTarget = Math.max(1, Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000));
                      const mCliTarget = Math.max(1, Number(bonusTarget.monthlyTargetClientCount ?? 3));
                      const yRevTarget = Math.max(1, Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000));
                      const yCliTarget = Math.max(1, Number(bonusTarget.yearlyTargetClientCount ?? 12));

                      const mPct = Math.min(
                        100,
                        Math.max(
                          Math.round((totalDealOmzet / mRevTarget) * 100),
                          Math.round((totalDealClients / mCliTarget) * 100)
                        )
                      );
                      const yPct = Math.min(
                        100,
                        Math.max(
                          Math.round((totalDealOmzet / yRevTarget) * 100),
                          Math.round((totalDealClients / yCliTarget) * 100)
                        )
                      );
                      const mExceeded = totalDealOmzet >= mRevTarget || totalDealClients >= mCliTarget;
                      const yExceeded = totalDealOmzet >= yRevTarget || totalDealClients >= yCliTarget;
                      const { achievedTier, nextTier } = resolveQualifiedRewardTier(totalDealOmzet, bonusTarget);

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{m.fullName}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {m.memberCode} &bull; Ref: <strong className="text-[#113872]">{m.referralCode}</strong>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                            {totalDealClients} Klien
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(totalDealOmzet)}
                          </td>
                          <td className="py-3.5 px-4 space-y-1.5 min-w-[200px]">
                            {mEnabled ? (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-slate-600">Bulanan:</span>
                                {mExceeded ? (
                                  <span className="px-2 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Tercapai ({mPct}%)
                                  </span>
                                ) : (
                                  <span className="font-mono font-bold text-amber-700">{mPct}%</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">Target Bulanan Nonaktif</div>
                            )}

                            {yEnabled ? (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-slate-600">Tahunan:</span>
                                {yExceeded ? (
                                  <span className="px-2 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Tercapai ({yPct}%)
                                  </span>
                                ) : (
                                  <span className="font-mono font-bold text-[#113872]">{yPct}%</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">Target Tahunan Nonaktif</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {achievedTier ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
                                  🏆 Tier {achievedTier.no}: {achievedTier.rewardName}
                                </span>
                                {nextTier && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Next: {nextTier.rewardName} ({formatRupiah(nextTier.salesTarget)})
                                  </div>
                                )}
                              </div>
                            ) : nextTier ? (
                              <div>
                                <span className="text-[10px] font-bold text-slate-700 block">
                                  Menuju Tier {nextTier.no}: {nextTier.rewardName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Target {formatRupiah(nextTier.salesTarget)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-700">
                            {formatRupiah(m.totalBonus || 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenGrantBonusModal(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-lg shadow-xs transition-all cursor-pointer"
                            >
                              <Gift className="w-3.5 h-3.5 text-amber-400" />
                              <span>Berikan Bonus</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <ServerDataTableFooter
              page={targetEvalDt.meta.page}
              perPage={targetEvalDt.perPage}
              totalItems={targetEvalDt.meta.totalItems}
              totalPages={targetEvalDt.meta.totalPages}
              onPageChange={targetEvalDt.setPage}
              unitLabel="mitra"
            />
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

      {/* MODAL 1: SETUJUI PENCAIRAN KOMISI (FULL LAYAR & DAPAT DI-SCROLL PENUH) */}
      {payoutToApprove && (
        <div className="fixed inset-0 z-[150] bg-slate-100 w-screen h-screen overflow-y-auto flex flex-col animate-in fade-in duration-150">
          {/* STICKY TOP HEADER FULL LAYAR */}
          <div className="sticky top-0 z-20 shrink-0 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white px-4 sm:px-8 py-4 border-b border-amber-400/40 shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                  OTORISASI PENGELUARAN KAS &bull; LAYAR PENUH
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white font-display truncate">
                  Setujui &amp; Transfer Pencairan Komisi Mitra
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayoutToApprove(null)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>

          {/* SCROLLABLE FULL-SCREEN FORM BODY */}
          <form
            onSubmit={handleSubmitPayoutApproval}
            className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-5">
              {/* Target Beneficiary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {payoutToApprove.mitraName}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 font-mono font-bold text-blue-800 text-xs">
                    {payoutToApprove.memberCode}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <span>
                    Bank Tujuan:{' '}
                    <strong className="text-slate-900">
                      {payoutToApprove.bankDetails.bankName}
                    </strong>
                  </span>
                  <span className="sm:text-right">
                    No. Rekening:{' '}
                    <strong className="font-mono text-slate-900">
                      {payoutToApprove.bankDetails.accountNumber}
                    </strong>
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Atas Nama Rekening: <strong className="text-slate-800">{payoutToApprove.bankDetails.accountHolder}</strong>
                </div>
              </div>

              {/* Gross Amount Display */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-blue-950">
                    Hak Komisi Kotor Diajukan:
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Nilai komisi sebelum potongan operasional / pajak.
                  </p>
                </div>
                <span className="font-mono text-xl sm:text-2xl font-black text-blue-950">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePphPresetChange(0)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold text-rose-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminFee(0)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
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
              <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase text-emerald-950 tracking-wider">
                    Total Diterima Bersih (Net Transfer)
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Nilai riil yang wajib ditransfer ke rekening bank mitra.
                  </p>
                </div>
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-800">
                  {formatRupiah(Math.max(0, payoutToApprove.amount - pphNominal - adminFee))}
                </span>
              </div>

              {/* Reference Number & Proof File Upload */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Referensi Transfer Bank (Auto-generated / Dapat diubah)
                  </label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="TRX-BCA-YYYYMMDD-XXXX"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                {/* Upload Bukti Pencairan (PDF / JPG / PNG) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Bukti Pencairan / Struk Transfer (PDF, JPG, JPEG, PNG){' '}
                    <span className="text-slate-500 font-normal">(Otomatis Dikompresi)</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleProofFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileUp className="w-6 h-6 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        {isCompressingProof
                          ? 'Mengompresi & menyimpan bukti transfer...'
                          : proofFileName
                          ? proofFileName
                          : 'Klik atau seret struk transfer (PDF / Gambar) ke sini'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Format didukung: PDF, JPG, JPEG, PNG (Otomatis dikompresi)
                      </span>
                    </div>
                  </div>

                  {proofFileUrl && !isCompressingProof && (
                    <div className="mt-2 flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                      <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          File struk siap disimpan: <strong>{proofFileName}</strong>
                          {proofFileSizeInfo ? ` (${proofFileSizeInfo})` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFileUrl('');
                          setProofFileName('');
                          setProofFileSizeInfo('');
                        }}
                        className="text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* STICKY BOTTOM FOOTER BUTTONS */}
            <div className="sticky bottom-0 z-20 bg-white rounded-2xl border border-slate-200 p-4 shadow-lg flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPayoutToApprove(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingApproval || isCompressingProof}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingApproval
                  ? 'Menyimpan & Mengotorisasi...'
                  : '✓ Approve Berkas Pembayaran & Selesai'}
              </button>
            </div>
          </form>
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
          <div className="bg-white rounded-2xl border border-amber-400/40 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] border-b border-amber-400/30 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Verifikasi &amp; Kunci Komisi Klien Baru
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
              </div>

              {/* Pengaturan Nilai Deal & Komisi Per Klien (Dikunci Saat Deal) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Nilai Deal &amp; Persentase Komisi Klien (Dikunci Saat Deal)
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded">
                    {
                      calculateClientDealCommission(
                        dealToReview.pricingType,
                        reviewDealValue,
                        commScheme
                      ).tierLabel
                    }
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nilai Deal Kontrak (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reviewDealValue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReviewDealValue(val);
                        const autoTier = calculateClientDealCommission(
                          dealToReview.pricingType,
                          val,
                          commScheme
                        );
                        setReviewCustomRate(autoTier.initialRate);
                        if (dealToReview.pricingType !== 'case_by_case') {
                          setReviewCustomRecurringRate(autoTier.recurringRate);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Komisi Deal (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={reviewCustomRate}
                      onChange={(e) => setReviewCustomRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-mono font-bold text-emerald-700 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  {dealToReview.pricingType !== 'case_by_case' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bln Berikutnya (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={reviewCustomRecurringRate}
                        onChange={(e) => setReviewCustomRecurringRate(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 font-mono font-bold text-blue-700 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">Komisi Masuk Mitra Saat ACC:</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatRupiah(Math.round((reviewDealValue * reviewCustomRate) / 100))} ({reviewCustomRate}%)
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
                  onClick={() =>
                    handleAccClient(
                      dealToReview.id,
                      reviewStartDate,
                      reviewBillingDay,
                      reviewDealValue,
                      reviewCustomRate,
                      reviewCustomRecurringRate
                    )
                  }
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-lg shadow-xs transition-all disabled:opacity-50"
                >
                  ✓ Approve Deal &amp; Kunci Komisi Mitra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.5: PROSES PEMBERIAN BONUS KE MITRA */}
      {mitraForBonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-amber-400/40 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] border-b border-amber-400/30 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                    APRESIASI &amp; REWARD TARGET MITRA
                  </span>
                  <h3 className="text-sm font-bold font-display">
                    Proses Pemberian Bonus ke Mitra
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraForBonus(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantBonusSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Mitra Penerima:</span>
                  <span className="font-bold text-slate-900">{mitraForBonus.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Mitra / Kode Referral:</span>
                  <span className="font-mono font-bold text-[#113872]">
                    {mitraForBonus.memberCode} ({mitraForBonus.referralCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bonus Sebelumnya:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatRupiah(mitraForBonus.totalBonus || 0)}
                  </span>
                </div>
              </div>

              {/* Quick Preset Tier Hadiah/Bonus */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Pilih Cepat Tier Hadiah / Bonus Capaian Penjualan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {resolveBonusRewardTiers(bonusTarget)
                    .filter((t) => t.isActive !== false)
                    .map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setBonusTitleInput(`Hadiah / Bonus Tier ${tier.no}: ${tier.rewardName}`);
                          setBonusNotesInput(
                            `Pencapaian Penjualan Rp ${tier.salesTarget.toLocaleString('id-ID')} — Hadiah/Bonus: ${tier.rewardName}`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/60 text-left transition-all cursor-pointer"
                      >
                        <div className="text-[10px] font-extrabold text-[#113872] truncate">
                          {tier.no}. {tier.rewardName}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          Rp {(tier.salesTarget / 1000000).toLocaleString('id-ID')} Jt
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul / Kategori Bonus *
                </label>
                <input
                  type="text"
                  required
                  value={bonusTitleInput}
                  onChange={(e) => setBonusTitleInput(e.target.value)}
                  placeholder="Contoh: Hadiah / Bonus Tier 1: Jalan-Jalan LN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Periode Target *
                  </label>
                  <select
                    value={bonusPeriodInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBonusPeriodInput(val);
                      if (val === 'Target Bulanan') {
                        setBonusAmountInput(bonusTarget.monthlyStandardBonusAmount || 5000000);
                      } else if (val === 'Target Tahunan') {
                        setBonusAmountInput(bonusTarget.yearlyStandardBonusAmount || 25000000);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {bonusTarget.monthlyBonusEnabled !== false && (
                      <option value="Target Bulanan">Target Bulanan</option>
                    )}
                    {bonusTarget.yearlyBonusEnabled !== false && (
                      <option value="Target Tahunan">Target Tahunan</option>
                    )}
                    <option value="Bonus Khusus Prestasi">Bonus Khusus Prestasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nominal Bonus (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="10000"
                    step="any"
                    value={bonusAmountInput}
                    onChange={(e) => setBonusAmountInput(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-extrabold text-emerald-700 border border-emerald-300 rounded-lg bg-emerald-50/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Apresiasi / Keterangan Reward
                </label>
                <textarea
                  rows={2}
                  value={bonusNotesInput}
                  onChange={(e) => setBonusNotesInput(e.target.value)}
                  placeholder="Catatan apresiasi pencapaian target..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMitraForBonus(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGrantingBonus}
                  className="px-4 py-2 font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isGrantingBonus ? 'Memproses...' : 'Berikan Bonus & Masukkan ke Saldo'}</span>
                </button>
              </div>
            </form>
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
                <h3 className="text-base sm:text-lg font-bold font-display">
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
            <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
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
                    {isDealInBillingWindow(selectedClientDetail) && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedClientDetail;
                          setSelectedClientDetail(null);
                          handleConfirmRecurringBill(target.id, target.pricingType);
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        title="Catat & approve pembayaran siklus langganan berikutnya untuk mencairkan komisi rutin Mitra"
                      >
                        ✓ Approve Pembayaran{' '}
                        {selectedClientDetail.pricingType === 'annual_subscription'
                          ? `Tahun Ke-${(selectedClientDetail.recurringPaidYears || 1) + 1}`
                          : `Bulan #${(selectedClientDetail.recurringPaidMonths || 1) + 1}`}
                      </button>
                    )}
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
