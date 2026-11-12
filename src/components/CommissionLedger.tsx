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
import { Mitra, CommissionTransaction, ClientDeal, PayoutRequest } from '../types';
import { UserCheck, Sparkles, Plus, Repeat } from 'lucide-react';
import { PayoutReceiptModal } from './PayoutReceiptModal';
import { useConfirm } from './ConfirmDialogModal';

interface CommissionLedgerProps {
  mitra: Mitra;
  userRole: 'admin' | 'mitra';
  transactions: CommissionTransaction[];
  clientDeals?: ClientDeal[];
  onRequestPayout: (mitraId: string, amount: number) => Promise<void>;
  onEditBankDetails: () => void;
  onOpenClientInput?: () => void;
}

export const CommissionLedger: React.FC<CommissionLedgerProps> = ({
  mitra,
  userRole,
  transactions,
  clientDeals = [],
  onRequestPayout,
  onEditBankDetails,
  onOpenClientInput,
}) => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'referrals' | 'transactions' | 'payouts'>('referrals');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(mitra.pendingPayout || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Mitra's payout requests
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutRequest | null>(null);

  // Calculate fixed commission available for withdrawal (pendingPayout minus already pending requests)
  const pendingRequestsAmount = payouts
    .filter((p) => p.mitraId === mitra.id && p.status === 'pending')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const availableFixCommission = Math.max(0, (Number(mitra.pendingPayout) || 0) - pendingRequestsAmount);

  useEffect(() => {
    setPayoutAmount(availableFixCommission);
  }, [availableFixCommission, isPayoutModalOpen]);

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

  // Filter transactions
  const displayTransactions = userRole === 'admin' 
    ? transactions 
    : transactions.filter((t) => t.mitraId === mitra.id);

  // Filter client deals
  const displayClientDeals = userRole === 'admin'
    ? clientDeals
    : clientDeals.filter((d) => d.mitraId === mitra.id);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    if (availableFixCommission <= 0) {
      setPayoutError('Belum ada dana komisi fix yang dapat dicairkan.');
      return;
    }
    if (payoutAmount <= 0 || payoutAmount > availableFixCommission) {
      setPayoutError(`Nominal pencairan tidak boleh melebihi dana komisi fix tersedia (${formatRupiah(availableFixCommission)}).`);
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Pengajuan Pencairan Komisi',
      message: `Apakah Anda yakin ingin mengajukan pencairan komisi sebesar ${formatRupiah(payoutAmount)}?`,
      detail: `Nominal Pengajuan: ${formatRupiah(payoutAmount)}\nBank Tujuan: ${mitra.bankDetails.bankName}\nNo. Rekening: ${mitra.bankDetails.accountNumber}\nAtas Nama: ${mitra.bankDetails.accountHolder}`,
      confirmText: 'Ya, Ajukan Pencairan',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await onRequestPayout(mitra.id, payoutAmount);
      setIsPayoutModalOpen(false);
      setSuccessToast(`Pengajuan pencairan komisi ${formatRupiah(payoutAmount)} berhasil dikirimkan ke tim finance.`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchPayoutHistory();
    } catch (err: any) {
      console.error(err);
      setPayoutError(err?.message || 'Gagal mengajukan pencairan komisi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
          <p className="text-sm text-slate-600 mt-0.5">
            {userRole === 'admin'
              ? 'Pantau perolehan komisi seluruh mitra, verifikasi rekening bank, dan otorisasi pencairan dana.'
              : 'Pantau akumulasi komisi penjualan, bonus target kuartalan, dan status pencairan ke rekening Anda.'}
          </p>
        </div>

        {userRole === 'mitra' && (
          <button
            onClick={() => {
              setPayoutError(null);
              setIsPayoutModalOpen(true);
            }}
            disabled={availableFixCommission <= 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {availableFixCommission > 0
                ? `Tarik Komisi Fix (${formatRupiah(availableFixCommission)})`
                : 'Belum Ada Saldo Komisi Fix'}
            </span>
          </button>
        )}
      </div>

      {/* Stat Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {userRole === 'admin' ? 'Total Komisi Terakumulasi' : 'Saldo Komisi Aktif (Belum Ditarik)'}
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
            Bonus Target: {formatRupiah(mitra.totalBonus || 0)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Dana Fix Siap Dicairkan
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono tabular-nums">
            {formatRupiah(
              userRole === 'admin'
                ? payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
                : Number(mitra.pendingPayout) || 0
            )}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {pendingRequestsAmount > 0
              ? `Sedang diajukan pencairan: ${formatRupiah(pendingRequestsAmount)} (Berkurang setelah di-approve)`
              : 'Hanya komisi yang telah di-approve Admin'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Rekening Bank Mitra
            </p>
            {userRole === 'mitra' && (
              <button
                onClick={onEditBankDetails}
                className="text-xs text-blue-700 hover:underline font-semibold"
              >
                Ubah
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2 truncate">
            {mitra.bankDetails.bankName}
          </p>
          <p className="text-xs font-mono text-slate-600 mt-0.5 tracking-wider">
            {mitra.bankDetails.accountNumber}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            a.n. {mitra.bankDetails.accountHolder}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center bg-slate-200/70 p-1 rounded-xl self-start border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Klien Referral &amp; Kontrak ({displayClientDeals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Riwayat Transaksi Komisi ({displayTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'payouts'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-700" />
            <span>Riwayat Pencairan &amp; Bukti Transfer ({payouts.length})</span>
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
              mitra.status === 'verified'
                ? 'Input Klien Baru (Referral)'
                : 'Akun Anda masih dalam proses verifikasi Admin. Input klien baru dapat dilakukan setelah akun di-approve Admin.'
            }
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all shrink-0 ${
              mitra.status === 'verified'
                ? 'text-white bg-blue-700 hover:bg-blue-800'
                : 'text-slate-400 bg-slate-200 cursor-not-allowed'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {mitra.status === 'verified'
                ? 'Input Klien Baru (Referral)'
                : '🔒 Input Klien Baru (Menunggu Approve Admin)'}
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
              <p className="text-xs text-slate-500 mt-0.5">
                Klien yang tercatat menggunakan kode referral Anda. Skema Langganan Bulanan / Tahunan rutin menghasilkan komisi pasif selama kontrak aktif.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total {displayClientDeals.length} Klien Terdaftar
            </div>
          </div>

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
                {displayClientDeals.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 8 : 7} className="py-8 text-center text-slate-500">
                      Belum ada klien yang terdaftar. Klik <strong>"Input Klien Baru"</strong> untuk mereferensikan klien pertama Anda.
                    </td>
                  </tr>
                ) : (
                  displayClientDeals.map((deal) => (
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
                        {deal.status === 'pending_acc' ? (
                          <div>
                            <div className="font-bold text-amber-700">Rp 0</div>
                            <span className="inline-block text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                              Menunggu Approve Admin (Est: {formatRupiah(deal.commissionAmount)})
                            </span>
                          </div>
                        ) : deal.status === 'rejected' ? (
                          <div>
                            <div className="font-bold text-rose-700">Rp 0</div>
                            <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                              Tidak Deal (Komisi Rp 0)
                            </span>
                          </div>
                        ) : deal.status === 'cancelled' ? (
                          <div>
                            <div className="line-through text-slate-400 text-[11px]">
                              {formatRupiah(deal.commissionAmount)}
                              {deal.pricingType === 'monthly_subscription' ? ' / bln' : deal.pricingType === 'annual_subscription' ? ' / thn' : ''}
                            </div>
                            <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                              Komisi Dihentikan (Langganan Berakhir)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-emerald-700">
                              {formatRupiah(deal.commissionAmount)}
                              {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / bln</span>}
                              {deal.pricingType === 'annual_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / thn</span>}
                            </div>
                            <span className="inline-block text-[9px] font-semibold text-emerald-700">
                              ✓ Komisi Masuk Saldo
                            </span>
                          </div>
                        )}
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
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian komisi otomatis setiap kali klien berhasil deal atau membayar tagihan langganan yang telah di-approve Admin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Total {displayTransactions.length} komisi masuk
            </span>
          </div>
        </div>

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
              {displayTransactions.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 8 : 7} className="py-8 text-center text-slate-500">
                    Belum ada riwayat komisi masuk. Komisi akan otomatis tampil di sini setelah pengajuan klien atau pembayaran langganan klien di-approve oleh Admin.
                  </td>
                </tr>
              ) : (
                displayTransactions.map((trx) => {
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
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian transparansi dana yang ditransfer ke rekening bank Anda, bukti potong pajak PPh 21 tenaga ahli, biaya admin, serta slip transfer resmi.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total {payouts.length} Riwayat Pencairan
            </div>
          </div>

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
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Belum ada riwayat penarikan dana. Klik <strong>"Tarik Komisi ke Rekening"</strong> untuk mengajukan penarikan pertama Anda.
                    </td>
                  </tr>
                ) : (
                  payouts.map((pay) => {
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
        </div>
      )}

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Ajukan Pencairan Komisi
              </h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="mt-4 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-semibold text-slate-800">Rekening Tujuan Pencairan:</p>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-900">{mitra.bankDetails.bankName}</p>
                    <p className="font-mono text-slate-600">{mitra.bankDetails.accountNumber}</p>
                    <p className="text-[11px] text-slate-500">a.n. {mitra.bankDetails.accountHolder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayoutModalOpen(false);
                      onEditBankDetails();
                    }}
                    className="text-xs text-blue-700 underline font-semibold"
                  >
                    Edit Rekening
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Penarikan Komisi Fix (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="10000"
                    max={availableFixCommission}
                    step="any"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dana komisi fix siap ditarik: <strong className="font-mono text-emerald-700">{formatRupiah(availableFixCommission)}</strong>
                </p>
                {payoutError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{payoutError}</p>
                )}
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Pencairan diproses setiap hari kerja pukul 15.00 WIB langsung ke rekening bank Anda dengan struk dan rincian bukti transfer transparan.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Memproses...' : 'Konfirmasi Pencairan'}
                </button>
              </div>
            </form>
          </div>
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
