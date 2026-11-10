import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Mitra, CommissionTransaction, ClientDeal } from '../types';
import { UserCheck, Sparkles, Plus, Repeat } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'transactions' | 'referrals'>('referrals');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(mitra.pendingPayout || 5000000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
    setIsSubmitting(true);
    try {
      await onRequestPayout(mitra.id, payoutAmount);
      setIsPayoutModalOpen(false);
      setSuccessToast(`Pengajuan pencairan komisi ${formatRupiah(payoutAmount)} berhasil dikirimkan ke tim finance.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error(err);
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
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Tarik Komisi ke Rekening</span>
          </button>
        )}
      </div>

      {/* Stat Cards Strip (Tabular Figures, Clean Single-Level Flat Surfaces) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Komisi Terakumulasi
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? 398000000 : mitra.totalCommission)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> Berdasarkan transaksi tervalidasi
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Bonus Target &amp; Akselerasi
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? 68000000 : mitra.totalBonus)}
          </p>
          <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
            Pencapaian kuartal berjalan
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Siap Dicairkan (Pending)
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? 19700000 : mitra.pendingPayout)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Jadwal transfer berkala setiap hari kerja
          </span>
        </div>

        {/* Bank Details Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Rekening Pencairan
              </p>
              {userRole === 'mitra' && (
                <button
                  onClick={onEditBankDetails}
                  className="text-[11px] text-blue-700 hover:underline font-semibold"
                >
                  Ubah
                </button>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 mt-2 font-display">
              {mitra.bankDetails.bankName || 'Belum Diatur'}
            </p>
            <p className="text-xs text-slate-600 font-mono mt-0.5 tabular-nums">
              {mitra.bankDetails.accountNumber || '-'}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            a.n. {mitra.bankDetails.accountHolder}
          </p>
        </div>
      </div>

      {/* Tab Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'referrals'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Klien Referral ({displayClientDeals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Riwayat Pembayaran Komisi ({displayTransactions.length})</span>
          </button>
        </div>

        {userRole === 'mitra' && onOpenClientInput && (
          <button
            type="button"
            onClick={onOpenClientInput}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Klien Baru (Referral)</span>
          </button>
        )}
      </div>

      {/* Referral Clients Table */}
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
                Klien yang tercatat menggunakan kode referral Anda. Skema Langganan Bulanan akan rutin menghasilkan komisi pasif selama kontrak aktif.
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
                        {deal.pricingType === 'monthly_subscription' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            <Repeat className="w-3 h-3 text-blue-600" />
                            Langganan Bulanan ({deal.recurringPaidMonths ?? 1} bln)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            ⚡ Case 1x Bayar
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {formatRupiah(deal.dealValue)}
                        {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / bln</span>}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(deal.commissionAmount)}
                        {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400 font-normal"> / bln</span>}
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        {deal.status === 'active_subscription' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Langganan Aktif
                          </span>
                        ) : deal.status === 'deal_closed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" /> Deal Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" /> Dalam Proses
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

      {/* Transaction Table */}
      {activeTab === 'transactions' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Riwayat Transaksi &amp; Pencairan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian komisi per kesepakatan kontrak layanan klien.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Total {displayTransactions.length} transaksi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Tanggal</th>
                {userRole === 'admin' && <th className="py-3 px-6">Mitra</th>}
                <th className="py-3 px-6">Klien Korporat</th>
                <th className="py-3 px-6">Layanan Pajak &amp; Hukum</th>
                <th className="py-3 px-6 text-right">Nilai Deal</th>
                <th className="py-3 px-6 text-right">Komisi Bersih</th>
                <th className="py-3 px-6 text-right">Bonus Target</th>
                <th className="py-3 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                    {trx.date}
                  </td>
                  {userRole === 'admin' && (
                    <td className="py-3.5 px-6 font-semibold text-slate-900 whitespace-nowrap">
                      {trx.mitraName}
                    </td>
                  )}
                  <td className="py-3.5 px-6 font-medium text-slate-900">
                    {trx.clientName}
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    {trx.serviceName}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                    {formatRupiah(trx.dealValue)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                    {formatRupiah(trx.commissionAmount)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-blue-700 tabular-nums whitespace-nowrap">
                    {trx.bonusAmount > 0 ? formatRupiah(trx.bonusAmount) : '-'}
                  </td>
                  <td className="py-3.5 px-6 text-center whitespace-nowrap">
                    {trx.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ditransfer
                      </span>
                    ) : trx.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <Clock className="w-3.5 h-3.5" /> Diproses Bank
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> Menunggu Payout
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Payout Modal */}
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
                  Nominal Penarikan (IDR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="500000"
                    step="100000"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Saldo komisi pending yang tersedia: <strong className="font-mono">{formatRupiah(mitra.pendingPayout || 6200000)}</strong>
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Pencairan diproses setiap hari kerja pukul 15.00 WIB langsung ke rekening bank Anda tanpa potongan biaya admin.
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
    </div>
  );
};
