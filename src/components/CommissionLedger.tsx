import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Building2, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Download, 
  Send,
  AlertCircle,
  Receipt,
  Calendar,
  FileText,
  ShieldCheck,
  Percent
} from 'lucide-react';
import {
  Mitra,
  CommissionTransaction,
  ClientDeal,
  PayoutRequest,
  AppSettings,
  DEFAULT_COMMISSION_SCHEME,
  DEFAULT_BONUS_TARGET_CONFIG,
  resolveBonusRewardTiers,
  resolveQualifiedRewardTier,
  getPayoutScheduleLabel,
  calculateClientDealCommission,
  isMitraDataIncomplete,
} from '../types';
import { UserCheck, Sparkles, Plus, Repeat, Award, Target, Gift } from 'lucide-react';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import {
  useServerDataTable,
  ServerDataTableTopBar,
  ServerDataTableFooter,
  parseClientRecordTimestamp,
  TableSkeletonRows,
} from './ServerDataTableControls';

interface CommissionLedgerProps {
  mitra: Mitra;
  allMitras?: Mitra[];
  userRole: 'admin' | 'mitra';
  transactions: CommissionTransaction[];
  clientDeals?: ClientDeal[];
  settings?: AppSettings | null;
  onRequestPayout?: (mitraId: string, amount: number) => Promise<void>;
  onEditBankDetails: () => void;
  onOpenClientInput?: () => void;
  onNavigateToOperations?: () => void;
}

export const CommissionLedger: React.FC<CommissionLedgerProps> = ({
  mitra,
  allMitras = [],
  userRole,
  transactions,
  clientDeals = [],
  settings,
  onEditBankDetails,
  onOpenClientInput,
  onNavigateToOperations,
}) => {
  const [activeTab, setActiveTab] = useState<'referrals' | 'transactions' | 'payouts'>('referrals');
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(settings || null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    } else {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d?.data) setLocalSettings(d.data);
        })
        .catch(() => {});
    }
  }, [settings]);

  const commScheme = {
    ...DEFAULT_COMMISSION_SCHEME,
    ...(localSettings?.commissionScheme || {}),
  };
  const bonusTarget = {
    ...DEFAULT_BONUS_TARGET_CONFIG,
    ...(localSettings?.bonusTargetConfig || {}),
  };
  const mBonusEnabled = bonusTarget.monthlyBonusEnabled !== false;
  const yBonusEnabled = bonusTarget.yearlyBonusEnabled !== false;
  const [selectedBonusPeriod, setSelectedBonusPeriod] = useState<'monthly' | 'yearly'>(() => {
    if (mBonusEnabled && !yBonusEnabled) return 'monthly';
    if (!mBonusEnabled && yBonusEnabled) return 'yearly';
    return bonusTarget.periodType === 'monthly' && mBonusEnabled ? 'monthly' : 'yearly';
  });
  useEffect(() => {
    if (selectedBonusPeriod === 'monthly' && !mBonusEnabled && yBonusEnabled) {
      setSelectedBonusPeriod('yearly');
    } else if (selectedBonusPeriod === 'yearly' && !yBonusEnabled && mBonusEnabled) {
      setSelectedBonusPeriod('monthly');
    }
  }, [mBonusEnabled, yBonusEnabled, selectedBonusPeriod]);
  const scheduleLabel = getPayoutScheduleLabel(localSettings?.payoutSchedule);
  const [successToast] = useState<string | null>(null);

  // Mitra's payout history
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutRequest | null>(null);

  const hasBankCompleted =
    Boolean(mitra.bankDetails?.bankName && mitra.bankDetails.bankName !== '-') &&
    Boolean(mitra.bankDetails?.accountNumber && mitra.bankDetails.accountNumber !== '-');

  const fetchPayoutHistory = async () => {
    try {
      const url = userRole === 'admin' 
        ? '/api/commissions/payout-requests' 
        : `/api/commissions/payout-requests?mitraId=${mitra.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setPayouts(data.data);
      }
    } catch (err) {
      console.error('Failed to load payout history:', err);
    }
  };

  useEffect(() => {
    fetchPayoutHistory();
  }, [mitra.id, userRole]);

  // Filter transactions (sorted newest first)
  const displayTransactions = React.useMemo(() => {
    const raw =
      userRole === 'admin'
        ? [...transactions]
        : transactions.filter((t) => t.mitraId === mitra.id);
    const withTs = raw.map((t, idx) => ({
      item: t,
      ts: parseClientRecordTimestamp(t.date, t.id, raw.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map((x) => x.item);
  }, [transactions, userRole, mitra.id]);

  // Filter client deals (sorted newest first)
  const displayClientDeals = React.useMemo(() => {
    const raw =
      userRole === 'admin'
        ? [...clientDeals]
        : clientDeals.filter((d) => d.mitraId === mitra.id);
    const withTs = raw.map((d, idx) => ({
      item: d,
      ts: parseClientRecordTimestamp(d.date || d.subscriptionStartDate, d.id, raw.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map((x) => x.item);
  }, [clientDeals, userRole, mitra.id]);

  // Sorted payout history (sorted newest first)
  const displayPayouts = React.useMemo(() => {
    const withTs = payouts.map((p, idx) => ({
      item: p,
      ts: parseClientRecordTimestamp(p.processedDate || p.requestDate, p.id, payouts.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    return withTs.map((x) => x.item);
  }, [payouts]);

  // Filter Mode untuk Tabel Pemantauan Target & Bonus Per Mitra (Capaian Penjualan, Bulanan, Tahunan)
  const [monitoringTargetFilter, setMonitoringTargetFilter] = useState<'tiers' | 'monthly' | 'yearly'>(() => {
    if (!mBonusEnabled && !yBonusEnabled) return 'tiers';
    if (yBonusEnabled) return 'yearly';
    if (mBonusEnabled) return 'monthly';
    return 'tiers';
  });

  useEffect(() => {
    if (monitoringTargetFilter === 'monthly' && !mBonusEnabled) {
      setMonitoringTargetFilter(yBonusEnabled ? 'yearly' : 'tiers');
    } else if (monitoringTargetFilter === 'yearly' && !yBonusEnabled) {
      setMonitoringTargetFilter(mBonusEnabled ? 'monthly' : 'tiers');
    }
  }, [mBonusEnabled, yBonusEnabled, monitoringTargetFilter]);

  // Sorted Mitras for Tabel Pemantauan Target & Bonus Per Mitra (Achieved target with highest sales at the top)
  const sortedMonitoringMitras = React.useMemo(() => {
    const sourceMitras = allMitras.length > 0 ? [...allMitras] : [mitra];
    const isTiers = monitoringTargetFilter === 'tiers';
    const tRev =
      monitoringTargetFilter === 'monthly'
        ? Math.max(1, Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000))
        : Math.max(1, Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000));
    const tCli =
      monitoringTargetFilter === 'monthly'
        ? Math.max(1, Number(bonusTarget.monthlyTargetClientCount ?? 3))
        : Math.max(1, Number(bonusTarget.yearlyTargetClientCount ?? 12));

    const enriched = sourceMitras.map((m) => {
      const mDeals = clientDeals.filter(
        (d) =>
          d.mitraId === m.id &&
          (d.status === 'active_subscription' || d.status === 'deal_closed')
      );
      const mOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
      const mClients = mDeals.length;
      const tierInfo = resolveQualifiedRewardTier(mOmzet, bonusTarget);
      const mAchieved = isTiers
        ? Boolean(tierInfo.achievedTier)
        : mOmzet >= tRev || mClients >= tCli;
      return {
        item: m,
        achieved: mAchieved ? 1 : 0,
        tierNo: tierInfo.achievedTier ? tierInfo.achievedTier.no : 0,
        omzet: mOmzet,
        clients: mClients,
      };
    });

    enriched.sort((a, b) => {
      if (b.achieved !== a.achieved) return b.achieved - a.achieved;
      if (isTiers && b.tierNo !== a.tierNo) return b.tierNo - a.tierNo;
      if (b.omzet !== a.omzet) return b.omzet - a.omzet;
      return b.clients - a.clients;
    });

    return enriched.map((x) => x.item);
  }, [allMitras, mitra, clientDeals, monitoringTargetFilter, bonusTarget]);

  const monitoringTargetsDt = useServerDataTable<Mitra>({
    resource: 'mitra-monitoring-targets',
    fallbackItems: sortedMonitoringMitras,
    defaultPerPage: 10,
    extraParams: { period: monitoringTargetFilter },
    dependencyKey: `${allMitras.length}-${clientDeals.length}-${monitoringTargetFilter}`,
  });

  const referralsDt = useServerDataTable<ClientDeal>({
    resource: 'clients',
    fallbackItems: displayClientDeals,
    defaultPerPage: 10,
    extraParams: { mitraId: userRole === 'mitra' ? mitra.id : undefined },
    dependencyKey: `${displayClientDeals.length}-${userRole}-${mitra.id}`,
  });

  const transactionsDt = useServerDataTable<CommissionTransaction>({
    resource: 'commissions',
    fallbackItems: displayTransactions,
    defaultPerPage: 10,
    extraParams: { mitraId: userRole === 'mitra' ? mitra.id : undefined },
    dependencyKey: `${displayTransactions.length}-${userRole}-${mitra.id}`,
  });

  const payoutsDt = useServerDataTable<PayoutRequest>({
    resource: 'payout-requests',
    fallbackItems: displayPayouts,
    defaultPerPage: 10,
    extraParams: { mitraId: userRole === 'mitra' ? mitra.id : undefined },
    dependencyKey: `${displayPayouts.length}-${userRole}-${mitra.id}`,
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            {userRole === 'admin' ? 'Monitoring Transaksi & Pencairan Komisi' : 'Komisi & Bonus Mitra'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3.5 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] border border-amber-400/40 rounded-lg flex items-center gap-2 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Jadwal Pencairan Admin: {scheduleLabel}</span>
          </span>

          {userRole === 'mitra' && (
            <button
              type="button"
              onClick={onEditBankDetails}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{hasBankCompleted ? 'Ubah Data Rekening' : 'Lengkapi Data Rekening'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner if Mitra hasn't completed Bank Account yet */}
      {userRole === 'mitra' && !hasBankCompleted && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <p className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
              Data Rekening Pencairan Komisi Belum Dilengkapi
            </p>
            <p className="text-xs text-amber-900 mt-1">
              Pencairan komisi dilakukan langsung oleh Admin secara terjadwal ({scheduleLabel}). Silakan lengkapi nama bank dan nomor rekening Anda agar dana komisi dapat ditransfer.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditBankDetails}
            className="px-4 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] border border-amber-400/40 rounded-lg shadow-xs shrink-0 transition-all cursor-pointer"
          >
            Lengkapi Data Rekening Sekarang
          </button>
        </div>
      )}

      {/* Alert Banner if Mitra is Rejected */}
      {userRole === 'mitra' && mitra.status === 'rejected' && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <p className="text-xs font-extrabold text-red-900 uppercase tracking-wider">
              Pengajuan Verifikasi Data Mitra Ditolak Admin
            </p>
            <p className="text-xs text-red-800 mt-1">
              <span className="font-bold">Keterangan Penolakan:</span>{' '}
              {mitra.rejectionReason || 'Mohon periksa dan lengkapi kembali data diri serta nomor rekening Anda.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditBankDetails}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs shrink-0 transition-colors"
          >
            Perbaiki Data &amp; Ajukan Ulang
          </button>
        </div>
      )}

      {/* Stat Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {userRole === 'admin' ? 'Total Komisi Terakumulasi' : 'Saldo Komisi Aktif (Siap Dicairkan Admin)'}
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? transactions.reduce((s, t) => s + t.commissionAmount, 0) : mitra.pendingPayout)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            {userRole === 'admin'
              ? 'Berdasarkan transaksi tervalidasi'
              : `Total Akumulasi Historis: ${formatRupiah(mitra.totalCommission)}`}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Komisi Sudah Dicairkan (Selesai)
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(
              userRole === 'admin'
                ? payouts.filter((p) => p.status === 'approved').reduce((s, p) => s + p.amount, 0)
                : mitra.paidPayout || 0
            )}
          </p>
          <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
            Bonus Target: {formatRupiah(
              userRole === 'admin'
                ? transactions.reduce((s, t) => s + (Number(t.bonusAmount) || 0), 0)
                : mitra.totalBonus || 0
            )}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Saldo Siap Dicairkan Terjadwal
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono tabular-nums">
            {formatRupiah(
              userRole === 'admin'
                ? (allMitras.length > 0 ? allMitras : [mitra]).reduce((s, m) => s + (Number(m.pendingPayout) || 0), 0)
                : Number(mitra.pendingPayout) || 0
            )}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Jadwal Pencairan Admin' : 'Rekening Bank Mitra'}
            </p>
            {userRole === 'mitra' && !hasBankCompleted && (
              <button
                onClick={onEditBankDetails}
                className="text-xs text-blue-700 hover:underline font-semibold"
              >
                Lengkapi
              </button>
            )}
          </div>
          {userRole === 'admin' ? (
            <>
              <p className="text-sm font-bold text-slate-900 mt-2">
                {scheduleLabel}
              </p>
            </>
          ) : hasBankCompleted ? (
            <>
              <p className="text-sm font-bold text-slate-900 mt-2 truncate">
                {mitra.bankDetails.bankName}
              </p>
              <p className="text-xs font-mono text-slate-600 mt-0.5 tracking-wider">
                {mitra.bankDetails.accountNumber}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                a.n. {mitra.bankDetails.accountHolder}
              </p>
            </>
          ) : (
            <div className="mt-2">
              <p className="text-xs font-bold text-amber-700">Belum Dilengkapi</p>
              <button
                type="button"
                onClick={onEditBankDetails}
                className="mt-1 text-xs font-bold text-blue-700 underline cursor-pointer"
              >
                + Isi Rekening Bank Pencairan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Per-Client Commission Scheme & Target Bonus Progress Banner (Mitra ID Card Theme) */}
      {(() => {
        const mitraApprovedDeals = clientDeals.filter(
          (d) =>
            (userRole === 'admin' ? true : d.mitraId === mitra.id) &&
            (d.status === 'active_subscription' || d.status === 'deal_closed')
        );
        const achievedRevenue = mitraApprovedDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
        const achievedClients = mitraApprovedDeals.length;

        const isCurrentPeriodEnabled =
          selectedBonusPeriod === 'yearly' ? yBonusEnabled : mBonusEnabled;
        const anyBonusEnabled = mBonusEnabled || yBonusEnabled;

        const targetRev = Math.max(
          1,
          selectedBonusPeriod === 'yearly'
            ? Number(bonusTarget.yearlyTargetDealRevenue ?? bonusTarget.targetDealRevenue ?? 500000000)
            : Number(bonusTarget.monthlyTargetDealRevenue ?? bonusTarget.targetDealRevenue ?? 50000000)
        );
        const targetCli = Math.max(
          1,
          selectedBonusPeriod === 'yearly'
            ? Number(bonusTarget.yearlyTargetClientCount ?? bonusTarget.targetClientCount ?? 12)
            : Number(bonusTarget.monthlyTargetClientCount ?? bonusTarget.targetClientCount ?? 3)
        );
        const currentStandardBonus =
          selectedBonusPeriod === 'yearly'
            ? Number(bonusTarget.yearlyStandardBonusAmount ?? bonusTarget.standardBonusAmount ?? 25000000)
            : Number(bonusTarget.monthlyStandardBonusAmount ?? bonusTarget.standardBonusAmount ?? 5000000);

        const revPct = Math.min(100, Math.round((achievedRevenue / targetRev) * 100));
        const cliPct = Math.min(100, Math.round((achievedClients / targetCli) * 100));
        const isTargetExceeded = achievedRevenue >= targetRev || achievedClients >= targetCli;
        const { achievedTier, nextTier, activeTiers } = resolveQualifiedRewardTier(
          achievedRevenue,
          bonusTarget
        );

        return (
          <>
          <div className="mb-7 rounded-2xl bg-gradient-to-br from-[#092147] via-[#113872] to-[#061835] text-white border border-amber-400/40 shadow-lg p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Cols: Per-Client Commission Tiers (Full 12 cols when both Monthly & Yearly bonus targets are Off) */}
            <div className={`${anyBonusEnabled ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-md">
                    SKEMA KOMISI PER KLIEN
                  </span>
                  <span className="text-[11px] text-blue-100 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Komisi Terkunci Saat Waktu Deal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Langganan Card */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-amber-400/30 space-y-1.5">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>🔄 Sistem Langganan Klien</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-extrabold">
                      +{commScheme.subRecurringRate}% Bln Berikutnya
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-blue-50 pt-1">
                    <div className="flex justify-between">
                      <span>Deal &ge; Rp {(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.subHighRate}% Komisi</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Deal Rp {(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')}–{(commScheme.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.subMidRate}% Komisi</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Deal &lt; Rp {(commScheme.subMidThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.subLowRate}% Komisi</strong>
                    </div>
                    <div className="pt-1 border-t border-white/15 flex justify-between text-emerald-300 font-semibold">
                      <span>Bayar Bulan Berikutnya (Aktif):</span>
                      <strong className="font-mono">Tetap {commScheme.subRecurringRate}%</strong>
                    </div>
                  </div>
                </div>

                {/* Case-by-Case Card */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-amber-400/30 space-y-1.5">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>⚡ Sistem Case-by-Case</span>
                    <span className="text-[10px] bg-white/15 text-amber-200 px-1.5 py-0.5 rounded font-semibold">
                      Per Kasus Klien
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-blue-50 pt-1">
                    <div className="flex justify-between">
                      <span>Deal &ge; Rp {(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.caseHighRate}% Komisi</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Deal Rp {(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')}–{(commScheme.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.caseMidRate}% Komisi</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Deal &lt; Rp {(commScheme.caseMidThreshold / 1000000).toLocaleString('id-ID')} Juta:</span>
                      <strong className="text-amber-300 font-mono">{commScheme.caseLowRate}% Komisi</strong>
                    </div>
                    <div className="pt-1 border-t border-white/15 text-[10px] text-blue-200">
                      Jika Admin merubah komisi di kemudian hari, klien langganan aktif tetap mendapat komisi waktu deal.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Target & Bonus Mitra Progress (Hidden completely if both Per Bulan & Per Tahun are Off) */}
            {anyBonusEnabled && (
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950/40 border border-amber-400/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/15">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-400" />
                      Target &amp; Bonus Mitra
                    </span>

                    {/* Switch Per Bulan / Per Tahun (Only show buttons that are enabled) */}
                    <div className="inline-flex rounded-lg bg-white/10 p-0.5 border border-white/15 text-[10px] font-bold">
                      {mBonusEnabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedBonusPeriod('monthly')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            selectedBonusPeriod === 'monthly'
                              ? 'bg-amber-400 text-slate-950 font-extrabold'
                              : 'text-blue-100 hover:text-white'
                          }`}
                        >
                          Per Bulan
                        </button>
                      )}
                      {yBonusEnabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedBonusPeriod('yearly')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            selectedBonusPeriod === 'yearly'
                              ? 'bg-amber-400 text-slate-950 font-extrabold'
                              : 'text-blue-100 hover:text-white'
                          }`}
                        >
                          Per Tahun
                        </button>
                      )}
                    </div>
                  </div>

                  {userRole === 'mitra' ? (
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-blue-200 font-semibold">
                          Evaluasi Target {selectedBonusPeriod === 'yearly' ? 'Tahunan' : 'Bulanan'}:
                        </span>
                        {isTargetExceeded ? (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full">
                            🏆 Target Tercapai!
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full">
                            Progres {Math.max(revPct, cliPct)}%
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-blue-100 mb-1">
                          <span>Capaian Penjualan Anda:</span>
                          <span className="font-mono font-bold text-white">
                            {formatRupiah(achievedRevenue)} / {formatRupiah(targetRev)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${revPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-blue-100">
                        <span>Realisasi Klien Deal:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {achievedClients} / {targetCli} Klien ({cliPct}%)
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-blue-200">Tier Hadiah / Bonus:</span>
                        {achievedTier ? (
                          <span className="font-extrabold text-emerald-300">
                            🏆 Tier {achievedTier.no}: {achievedTier.rewardName}
                          </span>
                        ) : nextTier ? (
                          <span className="font-bold text-amber-300">
                            Menuju Tier {nextTier.no}: {nextTier.rewardName}
                          </span>
                        ) : (
                          <span className="text-blue-200">-</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const mitraList = allMitras.length > 0 ? allMitras : [mitra];
                      const achievedMitraCount = mitraList.filter((m) => {
                        const mDeals = clientDeals.filter(
                          (d) =>
                            d.mitraId === m.id &&
                            (d.status === 'active_subscription' || d.status === 'deal_closed')
                        );
                        const mRev = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
                        return mRev >= targetRev || mDeals.length >= targetCli;
                      }).length;

                      return (
                        <div className="mt-3 space-y-2 text-xs text-blue-100">
                          <div className="flex justify-between">
                            <span>Target Penjualan ({selectedBonusPeriod === 'yearly' ? 'Per Tahun' : 'Per Bulan'}):</span>
                            <strong className="font-mono text-white">{formatRupiah(targetRev)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Target Klien ({selectedBonusPeriod === 'yearly' ? 'Per Tahun' : 'Per Bulan'}):</span>
                            <strong className="font-mono text-amber-300">{targetCli} Klien Deal</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Mitra Capai Target:</span>
                            <strong className="font-mono text-emerald-300">
                              {achievedMitraCount} / {mitraList.length} Mitra
                            </strong>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-blue-200 block">
                      Standar Bonus ({selectedBonusPeriod === 'yearly' ? 'Tahunan' : 'Bulanan'}):
                    </span>
                    <span className="font-mono font-extrabold text-amber-300">
                      {isCurrentPeriodEnabled ? formatRupiah(currentStandardBonus) : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-blue-200 block">
                      {userRole === 'admin' ? 'Total Bonus Disalurkan:' : 'Total Bonus Diterima:'}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-300">
                      {formatRupiah(
                        userRole === 'admin'
                          ? transactions.reduce((s, t) => s + (Number(t.bonusAmount) || 0), 0)
                          : mitra.totalBonus || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabel Capaian Penjualan & Hadiah/Bonus (5 Tier Resmi - Tetap Berjalan) */}
          {activeTiers.length > 0 && (
            <div className="mb-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#113872]" />
                    <span>Tabel Capaian Penjualan &amp; Hadiah / Bonus Mitra</span>
                  </h3>
                </div>
                {userRole === 'mitra' && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0D2149] text-white text-xs font-bold">
                    Capaian Penjualan Anda:{' '}
                    <span className="font-mono text-amber-300">{formatRupiah(achievedRevenue)}</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 text-center w-14">NO</th>
                      <th className="py-3 px-5 text-right">CAPAIAN PENJUALAN</th>
                      <th className="py-3 px-5">HADIAH / BONUS</th>
                      <th className="py-3 px-5">
                        {userRole === 'mitra' ? 'PROGRES CAPAIAN ANDA' : 'MITRA MENCAPAI TIER'}
                      </th>
                      <th className="py-3 px-5 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTiers.map((tier) => {
                      const pct = Math.min(
                        100,
                        Math.round((achievedRevenue / Math.max(1, tier.salesTarget)) * 100)
                      );
                      const isReached = achievedRevenue >= tier.salesTarget;
                      const mitraReachedCount =
                        userRole === 'admin'
                          ? (allMitras.length > 0 ? allMitras : [mitra]).filter((m) => {
                              const mRev = clientDeals
                                .filter(
                                  (d) =>
                                    d.mitraId === m.id &&
                                    (d.status === 'active_subscription' || d.status === 'deal_closed')
                                )
                                .reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
                              return mRev >= tier.salesTarget;
                            }).length
                          : 0;

                      return (
                        <tr key={tier.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-800">
                            {tier.no}
                          </td>
                          <td className="py-3 px-5 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(tier.salesTarget)}
                          </td>
                          <td className="py-3 px-5 font-extrabold text-[#113872]">
                            {tier.rewardName}
                          </td>
                          <td className="py-3 px-5 min-w-[180px]">
                            {userRole === 'mitra' ? (
                              <div>
                                <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                                  <span>{formatRupiah(achievedRevenue)}</span>
                                  <span className="font-mono font-bold text-slate-900">{pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isReached ? 'bg-emerald-500' : 'bg-[#113872]'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-800">
                                {mitraReachedCount} dari {(allMitras.length > 0 ? allMitras : [mitra]).length} Mitra
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap">
                            {userRole === 'mitra' ? (
                              isReached ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🏆 Tercapai
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Progres {pct}%
                                </span>
                              )
                            ) : mitraReachedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {mitraReachedCount} Mitra Capai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Belum Ada
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabel Pemantauan Target & Bonus Per Masing-Masing Mitra (Khusus Admin / Staf) */}
          {userRole === 'admin' && (
            <div className="mb-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#113872]" />
                    <span>
                      {monitoringTargetFilter === 'tiers'
                        ? 'Tabel Pemantauan Target Capaian Penjualan & Hadiah Mitra'
                        : `Tabel Pemantauan Target & Bonus Per Mitra (${
                            monitoringTargetFilter === 'yearly' ? 'Per Tahun' : 'Per Bulan'
                          })`}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {monitoringTargetFilter === 'tiers' ? (
                      <>
                        Standar Capaian Penjualan: Monitoring progres real-time masing-masing Mitra menuju{' '}
                        <strong>5 Tier Hadiah / Bonus Mitra</strong> (Mulai dari{' '}
                        {formatRupiah(activeTiers[0]?.salesTarget || 500000000)} -{' '}
                        {activeTiers[0]?.rewardName || 'Jalan-Jalan LN'}).
                      </>
                    ) : (
                      <>
                        Standar Target ({monitoringTargetFilter === 'yearly' ? 'Tahunan' : 'Bulanan'}): Capaian Penjualan{' '}
                        <strong>
                          {formatRupiah(
                            monitoringTargetFilter === 'yearly'
                              ? Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000)
                              : Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000)
                          )}
                        </strong>{' '}
                        atau{' '}
                        <strong>
                          {monitoringTargetFilter === 'yearly'
                            ? Number(bonusTarget.yearlyTargetClientCount ?? 12)
                            : Number(bonusTarget.monthlyTargetClientCount ?? 3)}{' '}
                          Klien Deal
                        </strong>{' '}
                        per masing-masing Mitra.
                      </>
                    )}
                  </p>
                </div>

                {/* Filter Selector Target: Menggantikan Tombol 'Kelola Target, Bonus & Pencairan Komisi' */}
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-300 shadow-2xs self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">
                    Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonitoringTargetFilter('tiers')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      monitoringTargetFilter === 'tiers'
                        ? 'bg-[#113872] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Target Capaian Penjualan
                  </button>
                  {mBonusEnabled && (
                    <button
                      type="button"
                      onClick={() => setMonitoringTargetFilter('monthly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        monitoringTargetFilter === 'monthly'
                          ? 'bg-[#113872] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Target Bulanan
                    </button>
                  )}
                  {yBonusEnabled && (
                    <button
                      type="button"
                      onClick={() => setMonitoringTargetFilter('yearly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        monitoringTargetFilter === 'yearly'
                          ? 'bg-[#113872] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Target Tahunan
                    </button>
                  )}
                </div>
              </div>

              <ServerDataTableTopBar
                perPage={monitoringTargetsDt.perPage}
                onPerPageChange={monitoringTargetsDt.setPerPage}
                perPageOptions={[10, 25, 50, 100]}
                search={monitoringTargetsDt.search}
                onSearchChange={monitoringTargetsDt.setSearch}
                searchPlaceholder="Cari nama mitra, ID anggota, atau kode referral..."
                isLoading={monitoringTargetsDt.isLoading}
                onRefresh={monitoringTargetsDt.refresh}
                unitLabel="mitra"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-5">Nama Mitra &amp; ID</th>
                      <th className="py-3 px-4 text-center">
                        {monitoringTargetFilter === 'tiers' ? 'Klien Deal' : 'Klien Deal vs Target'}
                      </th>
                      <th className="py-3 px-4 text-right">
                        {monitoringTargetFilter === 'tiers' ? 'Total Capaian Penjualan' : 'Capaian Penjualan vs Target'}
                      </th>
                      <th className="py-3 px-4">Tier Hadiah / Bonus</th>
                      <th className="py-3 px-4 text-center">
                        {monitoringTargetFilter === 'tiers' ? 'Status Capaian Tier' : 'Status Target'}
                      </th>
                      <th className="py-3 px-4 text-right">Total Bonus Diterima</th>
                      <th className="py-3 px-5 text-right">Saldo Komisi Siap Cair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monitoringTargetsDt.isLoading ? (
                      <TableSkeletonRows columns={7} rows={monitoringTargetsDt.perPage > 10 ? 10 : monitoringTargetsDt.perPage} />
                    ) : monitoringTargetsDt.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Belum ada data evaluasi mitra.
                        </td>
                      </tr>
                    ) : (
                      monitoringTargetsDt.rows.map((m) => {
                      const mDeals = clientDeals.filter(
                        (d) =>
                          d.mitraId === m.id &&
                          (d.status === 'active_subscription' || d.status === 'deal_closed')
                      );
                      const mOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
                      const mClients = mDeals.length;

                      const isTiers = monitoringTargetFilter === 'tiers';
                      const currentTRev =
                        monitoringTargetFilter === 'monthly'
                          ? Math.max(1, Number(bonusTarget.monthlyTargetDealRevenue ?? 50000000))
                          : Math.max(1, Number(bonusTarget.yearlyTargetDealRevenue ?? 500000000));
                      const currentTCli =
                        monitoringTargetFilter === 'monthly'
                          ? Math.max(1, Number(bonusTarget.monthlyTargetClientCount ?? 3))
                          : Math.max(1, Number(bonusTarget.yearlyTargetClientCount ?? 12));

                      const mRevPct = Math.min(100, Math.round((mOmzet / currentTRev) * 100));
                      const mCliPct = Math.min(100, Math.round((mClients / currentTCli) * 100));
                      const bestPct = Math.max(mRevPct, mCliPct);
                      const mAchieved = mOmzet >= currentTRev || mClients >= currentTCli;
                      const mTierInfo = resolveQualifiedRewardTier(mOmzet, bonusTarget);

                      const isCurrentFilterPeriodEnabled =
                        monitoringTargetFilter === 'yearly'
                          ? yBonusEnabled
                          : monitoringTargetFilter === 'monthly'
                          ? mBonusEnabled
                          : true;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-5 font-semibold text-slate-900">
                            <div>{m.fullName}</div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {m.memberCode} · {m.referralCode}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {isTiers ? (
                              <span>{mClients} Klien</span>
                            ) : (
                              <span>{mClients} / {currentTCli} Klien</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <div className="font-bold text-slate-900">{formatRupiah(mOmzet)}</div>
                            {!isTiers && (
                              <div className="text-[10px] text-slate-400">dari {formatRupiah(currentTRev)}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {mTierInfo.achievedTier ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
                                🏆 Tier {mTierInfo.achievedTier.no}: {mTierInfo.achievedTier.rewardName}
                              </span>
                            ) : mTierInfo.nextTier ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-semibold text-slate-700 block">
                                  Menuju {mTierInfo.nextTier.rewardName}
                                </span>
                                <span className="text-[9.5px] font-mono text-slate-400 block">
                                  ({Math.min(100, Math.round((mOmzet / mTierInfo.nextTier.salesTarget) * 100))}% dari {formatRupiah(mTierInfo.nextTier.salesTarget)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isTiers ? (
                              mTierInfo.achievedTier ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🏆 Tercapai Tier {mTierInfo.achievedTier.no}
                                </span>
                              ) : mTierInfo.nextTier ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                  Progres ({Math.min(100, Math.round((mOmzet / mTierInfo.nextTier.salesTarget) * 100))}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  Belum Ada Capaian
                                </span>
                              )
                            ) : !isCurrentFilterPeriodEnabled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Nonaktif
                              </span>
                            ) : mAchieved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🏆 Melampaui Target
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Sedang Mengejar ({bestPct}%)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                            {formatRupiah(m.totalBonus || 0)}
                          </td>
                          <td className="py-3 px-5 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(m.pendingPayout || 0)}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
              <ServerDataTableFooter
                page={monitoringTargetsDt.meta.page}
                perPage={monitoringTargetsDt.perPage}
                totalItems={monitoringTargetsDt.meta.totalItems}
                totalPages={monitoringTargetsDt.meta.totalPages}
                onPageChange={monitoringTargetsDt.setPage}
                unitLabel="mitra"
              />
            </div>
          )}
        </>
        );
      })()}

      {/* Navigation Sub-Tabs — Responsive on Mobile, Tablet & Desktop (Never overflows off-screen) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:inline-flex w-full lg:w-auto gap-1.5 bg-slate-200/70 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Klien Referral &amp; Kontrak ({displayClientDeals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Riwayat Transaksi Komisi ({displayTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`px-3.5 py-2.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span className="truncate">Riwayat Pencairan &amp; Bukti ({payouts.length})</span>
          </button>
        </div>

        {userRole === 'mitra' && onOpenClientInput && (
          <button
            type="button"
            onClick={() => {
              if (mitra.status === 'verified') {
                onOpenClientInput();
              }
            }}
            disabled={mitra.status !== 'verified'}
            title={
              mitra.status !== 'verified'
                ? mitra.status === 'rejected'
                  ? `Data verifikasi ditolak: ${mitra.rejectionReason || 'Silakan perbaiki data diri dan ajukan ulang.'}`
                  : 'Akun Anda masih dalam proses verifikasi Admin. Input klien baru dapat dilakukan setelah akun di-approve Admin.'
                : isMitraDataIncomplete(mitra)
                ? 'Lengkapi Data Diri terlebih dahulu sebelum menginput klien baru.'
                : 'Input Klien Baru (Referral)'
            }
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-bold rounded-xl shadow-sm transition-all w-full lg:w-auto shrink-0 cursor-pointer ${
              mitra.status !== 'verified'
                ? 'text-slate-400 bg-slate-200 cursor-not-allowed'
                : isMitraDataIncomplete(mitra)
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'text-white bg-blue-700 hover:bg-blue-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {mitra.status !== 'verified'
                ? mitra.status === 'rejected'
                  ? '🔒 Input Klien Baru (Data Ditolak)'
                  : '🔒 Input Klien Baru (Menunggu Approve)'
                : isMitraDataIncomplete(mitra)
                ? '🔒 Input Klien Baru (Lengkapi Data Diri)'
                : 'Input Klien Baru (Referral)'}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: Referral Clients Table */}
      {activeTab === 'referrals' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Daftar Klien Referral &amp; Kontrak Berjalan</span>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  Auto Referral Linked
                </span>
              </h3>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total {displayClientDeals.length} Klien Terdaftar
            </div>
          </div>

          <ServerDataTableTopBar
            perPage={referralsDt.perPage}
            onPerPageChange={referralsDt.setPerPage}
            perPageOptions={[10, 25, 50, 100]}
            search={referralsDt.search}
            onSearchChange={referralsDt.setSearch}
            searchPlaceholder="Cari perusahaan klien, PIC, layanan, atau kode referral..."
            isLoading={referralsDt.isLoading}
            onRefresh={referralsDt.refresh}
            unitLabel="klien"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6">Perusahaan Klien</th>
                  <th className="py-3 px-6">Penanggung Jawab (PIC)</th>
                  {userRole === 'admin' && <th className="py-3 px-6">Mitra Referral</th>}
                  <th className="py-3 px-6">Layanan Diambil</th>
                  <th className="py-3 px-6">Skema Pembayaran</th>
                  <th className="py-3 px-6 text-right">Nilai Kontrak</th>
                  <th className="py-3 px-6 text-right">Komisi Mitra</th>
                  <th className="py-3 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referralsDt.isLoading ? (
                  <TableSkeletonRows columns={userRole === 'admin' ? 8 : 7} rows={referralsDt.perPage > 10 ? 10 : referralsDt.perPage} />
                ) : referralsDt.rows.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 8 : 7} className="py-8 text-center text-slate-500">
                      Belum ada klien yang terdaftar. Klik <strong>"Input Klien Baru"</strong> untuk mereferensikan klien pertama Anda.
                    </td>
                  </tr>
                ) : (
                  referralsDt.rows.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        <div>{deal.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Ref: {deal.referralCode}</div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-700">
                        <div>{deal.picName}</div>
                        <div className="text-[10px] text-slate-500">{deal.picPhone}</div>
                      </td>
                      {userRole === 'admin' && (
                        <td className="py-3.5 px-6 font-semibold text-slate-900 whitespace-nowrap">
                          {deal.mitraName}
                        </td>
                      )}
                      <td className="py-3.5 px-6 text-slate-600 max-w-xs">
                        <span className="line-clamp-2">{deal.serviceName}</span>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        {deal.pricingType === 'annual_subscription' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              Langganan Tahunan ({deal.recurringPaidYears ?? (deal.status === 'pending_acc' || deal.status === 'rejected' ? 0 : 1)} thn)
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Mulai: {deal.subscriptionStartDate || deal.date} · Tagihan Tgl {deal.billingDayOfMonth || 1}
                            </div>
                          </div>
                        ) : deal.pricingType === 'monthly_subscription' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              <Repeat className="w-3 h-3 text-blue-600" />
                              Langganan Bulanan ({deal.recurringPaidMonths ?? (deal.status === 'pending_acc' || deal.status === 'rejected' ? 0 : 1)} bln)
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Mulai: {deal.subscriptionStartDate || deal.date} · Tagihan Tgl {deal.billingDayOfMonth || 1}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              ⚡ Case-by-Case
                            </span>
                            {deal.periodStart && deal.periodEnd && (
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {deal.periodStart} s/d {deal.periodEnd}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {formatRupiah(deal.dealValue)}
                        {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / bln</span>}
                        {deal.pricingType === 'annual_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / thn</span>}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono whitespace-nowrap">
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
                                <div className="font-bold text-amber-700">Rp 0</div>
                                <span className="inline-block text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                  Menunggu ACC (Deal {lockedRate}%: {formatRupiah(deal.commissionAmount)})
                                </span>
                                {deal.pricingType !== 'case_by_case' && (
                                  <div className="text-[9px] text-slate-500 mt-0.5">
                                    Bulan Berikutnya ({lockedRecRate}%): {formatRupiah(lockedRecAmt)}/siklus
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (deal.status === 'rejected') {
                            return (
                              <div>
                                <div className="font-bold text-rose-700">Rp 0</div>
                                <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                                  Tidak Deal (Komisi Rp 0)
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
                                  Komisi Dihentikan (Langganan Berakhir)
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div>
                              <div className="font-bold text-emerald-700">
                                {formatRupiah(deal.commissionAmount)}{' '}
                                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  {lockedRate}% Deal
                                </span>
                              </div>
                              {deal.pricingType !== 'case_by_case' ? (
                                <div className="text-[10px] font-semibold text-blue-800 mt-0.5">
                                  Bulan Berikutnya ({lockedRecRate}% Terkunci): {formatRupiah(lockedRecAmt)}/siklus
                                </div>
                              ) : (
                                <span className="inline-block text-[9px] font-semibold text-emerald-700">
                                  ✓ Komisi Masuk Saldo (Terkunci Waktu Deal)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        {deal.status === 'active_subscription' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Deal (Langganan Aktif)
                          </span>
                        ) : deal.status === 'rejected' ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> Tidak Deal / Ditolak
                            </span>
                            {deal.rejectionReason && (
                              <span className="text-[9px] text-rose-600 max-w-[160px] truncate" title={deal.rejectionReason}>
                                {deal.rejectionReason}
                              </span>
                            )}
                          </div>
                        ) : deal.status === 'cancelled' ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3" /> Langganan Berakhir
                            </span>
                            {deal.terminatedAt && (
                              <span className="text-[9px] font-mono text-slate-500">
                                Diputus: {deal.terminatedAt}
                              </span>
                            )}
                          </div>
                        ) : deal.status === 'deal_closed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" /> Deal Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                            <Clock className="w-3 h-3" /> Sedang Ditinjau Admin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ServerDataTableFooter
            page={referralsDt.meta.page}
            perPage={referralsDt.perPage}
            totalItems={referralsDt.meta.totalItems}
            totalPages={referralsDt.meta.totalPages}
            onPageChange={referralsDt.setPage}
            unitLabel="klien"
          />
        </div>
      )}

      {/* TAB 2: Transaction Table */}
      {activeTab === 'transactions' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Riwayat Hasil Komisi Klien (Deal &amp; Pembayaran Langganan)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Total {displayTransactions.length} komisi masuk
            </span>
          </div>
        </div>

        <ServerDataTableTopBar
          perPage={transactionsDt.perPage}
          onPerPageChange={transactionsDt.setPerPage}
          perPageOptions={[10, 25, 50, 100]}
          search={transactionsDt.search}
          onSearchChange={transactionsDt.setSearch}
          searchPlaceholder="Cari klien, mitra, layanan, atau tanggal..."
          isLoading={transactionsDt.isLoading}
          onRefresh={transactionsDt.refresh}
          unitLabel="transaksi"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Tanggal Approve</th>
                {userRole === 'admin' && <th className="py-3 px-6">Mitra</th>}
                <th className="py-3 px-6">Klien Perusahaan</th>
                <th className="py-3 px-6">Detail Layanan &amp; Siklus Pembayaran</th>
                <th className="py-3 px-6 text-right">Nilai Pembayaran Klien</th>
                <th className="py-3 px-6 text-right">Komisi Masuk</th>
                <th className="py-3 px-6 text-right">Bonus Target</th>
                <th className="py-3 px-6 text-center">Status Saldo Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionsDt.isLoading ? (
                <TableSkeletonRows columns={userRole === 'admin' ? 8 : 7} rows={transactionsDt.perPage > 10 ? 10 : transactionsDt.perPage} />
              ) : transactionsDt.rows.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 8 : 7} className="py-8 text-center text-slate-500">
                    Belum ada riwayat komisi masuk. Komisi akan otomatis tampil di sini setelah pengajuan klien atau pembayaran langganan klien di-approve oleh Admin.
                  </td>
                </tr>
              ) : (
                transactionsDt.rows.map((trx) => {
                  const matchedDeal = clientDeals.find(
                    (d) =>
                      d.mitraId === trx.mitraId &&
                      d.companyName.toLowerCase() === trx.clientName.toLowerCase()
                  );
                  const hasCycleTag = /\((Bulan|Tahun|Deal)\s*#?\d*/i.test(trx.serviceName);
                  const fallbackCycleBadge = !hasCycleTag
                    ? matchedDeal?.pricingType === 'monthly_subscription'
                      ? 'Pembayaran Langganan (Bulan #1)'
                      : matchedDeal?.pricingType === 'annual_subscription'
                      ? 'Pembayaran Langganan (Tahun #1)'
                      : 'Pembayaran Deal Kontrak'
                    : null;

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {trx.date}
                      </td>
                      {userRole === 'admin' && (
                        <td className="py-3.5 px-6 font-semibold text-slate-900 whitespace-nowrap">
                          {trx.mitraName}
                        </td>
                      )}
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {trx.clientName}
                      </td>
                      <td className="py-3.5 px-6 text-slate-700">
                        <div className="font-medium text-slate-800">{trx.serviceName}</div>
                        {fallbackCycleBadge && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {fallbackCycleBadge}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {formatRupiah(trx.dealValue)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        + {formatRupiah(trx.commissionAmount)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-blue-700 tabular-nums whitespace-nowrap">
                        {trx.bonusAmount > 0 ? formatRupiah(trx.bonusAmount) : '-'}
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Komisi Masuk ke Saldo (Siap Ditarik)</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ServerDataTableFooter
          page={transactionsDt.meta.page}
          perPage={transactionsDt.perPage}
          totalItems={transactionsDt.meta.totalItems}
          totalPages={transactionsDt.meta.totalPages}
          onPageChange={transactionsDt.setPage}
          unitLabel="transaksi"
        />
      </div>
      )}

      {/* TAB 3: Payout History & Proof of Transfer Slip */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-700" />
                <span>Riwayat Pencairan Komisi, Potongan PPh 21, &amp; Bukti Transfer Bank</span>
              </h3>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total {payouts.length} Riwayat Pencairan
            </div>
          </div>

          <ServerDataTableTopBar
            perPage={payoutsDt.perPage}
            onPerPageChange={payoutsDt.setPerPage}
            perPageOptions={[10, 25, 50, 100]}
            search={payoutsDt.search}
            onSearchChange={payoutsDt.setSearch}
            searchPlaceholder="Cari bank, nomor rekening, atas nama, atau tanggal..."
            isLoading={payoutsDt.isLoading}
            onRefresh={payoutsDt.refresh}
            unitLabel="pencairan"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-6">Tanggal Request / Cair</th>
                  <th className="py-3 px-6">Rekening Tujuan</th>
                  <th className="py-3 px-6 text-right">Hak Kotor</th>
                  <th className="py-3 px-6 text-right">Potongan PPh 21 &amp; Adm</th>
                  <th className="py-3 px-6 text-right">Bersih Diterima</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Rincian Slip &amp; Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutsDt.isLoading ? (
                  <TableSkeletonRows columns={7} rows={payoutsDt.perPage > 10 ? 10 : payoutsDt.perPage} />
                ) : payoutsDt.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Belum ada riwayat penarikan dana. Klik <strong>"Tarik Komisi ke Rekening"</strong> untuk mengajukan penarikan pertama Anda.
                    </td>
                  </tr>
                ) : (
                  payoutsDt.rows.map((pay) => {
                    const gross = pay.amount || 0;
                    const pph = pay.pph21Deduction || 0;
                    const admin = pay.adminFeeDeduction || 0;
                    const totalDeduction = pph + admin;
                    const isApproved = pay.status === 'approved';
                    const net =
                      isApproved && pay.netAmountTransferred && pay.netAmountTransferred > 0
                        ? pay.netAmountTransferred
                        : Math.max(0, gross - totalDeduction);

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-slate-700 whitespace-nowrap">
                          <div>{pay.requestDate}</div>
                          {pay.processedDate && (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Cair: {pay.processedDate}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-blue-900">{pay.bankDetails.bankName}</div>
                          <div className="font-mono text-slate-700">{pay.bankDetails.accountNumber}</div>
                          <div className="text-[10px] text-slate-500">a.n. {pay.bankDetails.accountHolder}</div>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatRupiah(gross)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono whitespace-nowrap">
                          {!isApproved ? (
                            <span className="text-slate-400 font-normal">Menunggu Hitung Admin</span>
                          ) : totalDeduction > 0 ? (
                            <div>
                              <span className="font-bold text-rose-700">- {formatRupiah(totalDeduction)}</span>
                              <div className="text-[9px] text-slate-400">
                                {pph > 0 ? `PPh21 (${pay.pph21Rate || 2.5}%): ${formatRupiah(pph)}` : ''}
                                {admin > 0 ? ` · Adm: ${formatRupiah(admin)}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Rp 0 (Tanpa Potongan)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-extrabold whitespace-nowrap text-sm">
                          {isApproved ? (
                            <span className="text-emerald-700">{formatRupiah(net)}</span>
                          ) : (
                            <span className="text-slate-500 font-semibold" title="Estimasi sebelum potongan PPh 21 / Admin">
                              {formatRupiah(gross)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center whitespace-nowrap">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Selesai (Lunas Ditransfer)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Cek &amp; Approve Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(pay)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Lihat Detail &amp; Bukti Transfer</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Bukti transfer hanya dapat dibuka setelah pengajuan di-approve oleh Admin"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-75"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Lihat Detail &amp; Bukti Transfer</span>
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
            page={payoutsDt.meta.page}
            perPage={payoutsDt.perPage}
            totalItems={payoutsDt.meta.totalItems}
            totalPages={payoutsDt.meta.totalPages}
            onPageChange={payoutsDt.setPage}
            unitLabel="pencairan"
          />
        </div>
      )}

      {/* Slip Bukti Pencairan Resmi Modal */}
      <PayoutReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        payout={selectedReceipt}
      />
    </div>
  );
};
