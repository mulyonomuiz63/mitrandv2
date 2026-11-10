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
  ChevronRight
} from 'lucide-react';
import { Mitra, ClientDeal, CommissionTransaction, PayoutRequest } from '../types';

interface AdminOperationsHubProps {
  mitras: Mitra[];
  clientDeals: ClientDeal[];
  commissions: CommissionTransaction[];
  onRefreshData: () => void;
}

export const AdminOperationsHub: React.FC<AdminOperationsHubProps> = ({
  mitras,
  clientDeals,
  commissions,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'client_validation' | 'mitra_analysis' | 'payout_management'>('client_validation');
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<'all' | 'pending_acc' | 'active_subscription' | 'deal_closed'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // 1. ACC Client Deal
  const handleAccClient = async (dealId: string) => {
    setProcessingId(dealId);
    try {
      const res = await fetch(`/api/clients/${dealId}/acc`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Klien "${data.data.companyName}" berhasil di-ACC! Komisi telah ditambahkan ke saldo Mitra.`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to ACC client:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Process Monthly Recurring Billing for Subscriber
  const handleConfirmMonthlyBill = async (dealId: string) => {
    setProcessingId(dealId);
    try {
      const res = await fetch(`/api/clients/${dealId}/bill-cycle`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Pembayaran bulan ke-${data.data.recurringPaidMonths} untuk "${data.data.companyName}" berhasil dikonfirmasi! Komisi bulanan masuk ke Mitra.`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to confirm monthly billing:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 3. Approve Payout Request
  const handleApprovePayout = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const res = await fetch(`/api/commissions/payout-requests/${payoutId}/approve`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Pencairan dana Rp ${data.data.amount.toLocaleString('id-ID')} untuk ${data.data.mitraName} disetujui & tercatat berhasil ditransfer!`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        fetchPayoutRequests();
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to approve payout:', err);
    } finally {
      setProcessingId(null);
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
            Validasi deal masuk dari referral mitra, atur ACC komisi (case-by-case &amp; langganan bulanan), serta otorisasi pencairan saldo rekening mitra.
          </p>
        </div>

        <button
          onClick={() => {
            fetchPayoutRequests();
            onRefreshData();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
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
          <span>Analisa Kinerja Mitra ({mitras.length})</span>
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
          <span>Kelola Pencairan Komisi</span>
          {pendingPayoutCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-mono font-black">
              {pendingPayoutCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: VALIDASI & ACC KLIEN */}
      {activeSubTab === 'client_validation' && (
        <div className="space-y-4">
          
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari perusahaan, PIC, referral..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
              <button
                type="button"
                onClick={() => setClientFilter('all')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors shrink-0 ${
                  clientFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Semua ({clientDeals.length})
              </button>
              <button
                type="button"
                onClick={() => setClientFilter('pending_acc')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors shrink-0 ${
                  clientFilter === 'pending_acc' ? 'bg-amber-500 text-white font-bold' : 'bg-amber-50 text-amber-800'
                }`}
              >
                Menunggu ACC ({pendingAccCount})
              </button>
              <button
                type="button"
                onClick={() => setClientFilter('active_subscription')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors shrink-0 ${
                  clientFilter === 'active_subscription' ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-700'
                }`}
              >
                Langganan Aktif
              </button>
              <button
                type="button"
                onClick={() => setClientFilter('deal_closed')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors shrink-0 ${
                  clientFilter === 'deal_closed' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Case Closed
              </button>
            </div>
          </div>

          {/* Client Deals Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Perusahaan Klien &amp; PIC</th>
                    <th className="py-3 px-4">Mitra Referral</th>
                    <th className="py-3 px-4">Layanan</th>
                    <th className="py-3 px-4">Skema Pembayaran</th>
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
                    filteredDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
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
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {formatRupiah(deal.dealValue)}
                          {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400">/bln</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatRupiah(deal.commissionAmount)}
                          {deal.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-400">/bln</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {deal.status === 'pending_acc' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Menunggu ACC
                            </span>
                          ) : deal.status === 'active_subscription' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Langganan Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Deal Closed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {deal.status === 'pending_acc' ? (
                            <button
                              type="button"
                              onClick={() => handleAccClient(deal.id)}
                              disabled={processingId === deal.id}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
                            >
                              {processingId === deal.id ? 'Memproses...' : '✓ ACC Klien'}
                            </button>
                          ) : deal.pricingType === 'monthly_subscription' ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmMonthlyBill(deal.id)}
                              disabled={processingId === deal.id}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                              title="Konfirmasi Pembayaran Bulan Berikutnya (Komisi mitra otomatis mengalir lagi)"
                            >
                              + Konfirmasi Bayar Bulan #{ (deal.recurringPaidMonths || 1) + 1 }
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Selesai</span>
                          )}
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
                  Daftar Pengajuan Pencairan Dana Komisi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi nomor rekening bank tujuan dan otorisasi transfer komisi mitra.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-600">
                Total {payoutRequests.length} Pengajuan
              </div>
            </div>

            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Tanggal Request</th>
                    <th className="p-3">Mitra</th>
                    <th className="p-3">Rekening Bank Tujuan</th>
                    <th className="p-3 text-right">Nominal Payout</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Tindakan Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payoutRequests.map((req) => (
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
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(req.amount)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Menunggu Transfer
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Berhasil Ditransfer
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleApprovePayout(req.id)}
                            disabled={processingId === req.id}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-all disabled:opacity-50"
                          >
                            {processingId === req.id ? 'Memproses...' : 'Setujui & Transfer'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Selesai ({req.processedDate || req.requestDate})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
