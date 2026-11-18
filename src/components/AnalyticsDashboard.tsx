import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Briefcase,
  BarChart3,
  ArrowUpRight,
  Calendar,
  Plane,
  Award,
  Landmark,
  Car,
  Home,
} from 'lucide-react';
import { SalesHistoryMonth, Mitra, ClientDeal, CommissionTransaction } from '../types';

interface AnalyticsDashboardProps {
  salesHistory: SalesHistoryMonth[];
  userRole: 'admin' | 'mitra';
  activeMitra: Mitra;
  allMitras?: Mitra[];
  allClientDeals?: ClientDeal[];
  commissions?: CommissionTransaction[];
  onNavigateTab: (tab: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  salesHistory,
  userRole,
  activeMitra,
  allMitras = [],
  allClientDeals = [],
  commissions = [],
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('November 2026');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Live metrics from Supabase / active state
  const approvedDeals = allClientDeals.filter(
    (d) => d.status === 'active_subscription' || d.status === 'deal_closed'
  );
  const myApprovedDeals = approvedDeals.filter(
    (d) => d.mitraId === activeMitra.id || d.referralCode === activeMitra.referralCode
  );
  const myCommissions = commissions.filter((c) => c.mitraId === activeMitra.id);

  const totalAdminSales = approvedDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const totalMitraSales = myApprovedDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const verifiedMitrasCount = allMitras.filter((m) => m.status === 'verified').length;
  const pendingMitrasCount = allMitras.filter((m) => m.status === 'pending').length;
  const totalAdminCommissions = allMitras.reduce((sum, m) => sum + (Number(m.totalCommission) || 0), 0);

  // Build Mitra-exclusive 6-month sales & commission history when userRole === 'mitra'
  const displayedSalesHistory: SalesHistoryMonth[] = React.useMemo(() => {
    const baseMonths =
      salesHistory.length > 0
        ? salesHistory.map((s) => s.month)
        : ['Jun 2026', 'Jul 2026', 'Agu 2026', 'Sep 2026', 'Okt 2026', 'Nov 2026'];

    if (userRole === 'admin') {
      return salesHistory.length > 0
        ? salesHistory
        : baseMonths.map((month) => ({
            month,
            totalSales: 0,
            totalCommission: 0,
            mitraCount: verifiedMitrasCount,
            dealsClosed: 0,
          }));
    }

    const monthAliases: Record<string, number[]> = {
      Jan: [1],
      Feb: [2],
      Mar: [3],
      Apr: [4],
      Mei: [5],
      May: [5],
      Jun: [6],
      Jul: [7],
      Agu: [8],
      Aug: [8],
      Sep: [9],
      Okt: [10],
      Oct: [10],
      Nov: [11],
      Des: [12],
      Dec: [12],
    };

    const buckets = baseMonths.map((monthLabel) => ({
      month: monthLabel,
      totalSales: 0,
      totalCommission: 0,
      mitraCount: 1,
      dealsClosed: 0,
    }));

    const findBucketIndex = (dateStr?: string) => {
      if (!dateStr) return buckets.length - 1;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        const m = parsed.getMonth() + 1;
        const idx = buckets.findIndex((b) => {
          const prefix = b.month.split(' ')[0];
          return (monthAliases[prefix] || []).includes(m);
        });
        if (idx >= 0) return idx;
      }
      return buckets.length - 1;
    };

    for (const deal of myApprovedDeals) {
      const idx = findBucketIndex(deal.date);
      if (buckets[idx]) {
        buckets[idx].totalSales += Number(deal.dealValue) || 0;
        buckets[idx].dealsClosed += 1;
      }
    }

    if (myCommissions.length > 0) {
      for (const comm of myCommissions) {
        const idx = findBucketIndex(comm.date);
        if (buckets[idx]) {
          buckets[idx].totalCommission +=
            (Number(comm.commissionAmount) || 0) + (Number(comm.bonusAmount) || 0);
        }
      }
    } else if (myApprovedDeals.length > 0) {
      for (const deal of myApprovedDeals) {
        const idx = findBucketIndex(deal.date);
        if (buckets[idx]) {
          buckets[idx].totalCommission += Number(deal.commissionAmount) || 0;
        }
      }
    } else if ((Number(activeMitra.totalCommission) || 0) > 0 && buckets.length > 0) {
      buckets[buckets.length - 1].totalCommission += Number(activeMitra.totalCommission) || 0;
    }

    return buckets;
  }, [salesHistory, userRole, myApprovedDeals, myCommissions, activeMitra.totalCommission, verifiedMitrasCount]);

  // Max value for SVG scale calculations
  const maxSales = Math.max(
    ...displayedSalesHistory.map((s) => Math.max(s.totalSales, s.totalCommission)),
    1
  );
  const hasAnySalesInHistory = displayedSalesHistory.some(
    (s) => s.totalSales > 0 || s.totalCommission > 0
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              {userRole === 'mitra'
                ? `Dashboard Kinerja Mitra — ${activeMitra.fullName}`
                : 'Dashboard Analitik & Laporan Kinerja'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="November 2026">Periode: November 2026</option>
              <option value="Oktober 2026">Periode: Oktober 2026</option>
              <option value="September 2026">Periode: September 2026</option>
              <option value="Q3 2026">Kuartal 3 (Q3 2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Akumulasi Deal Klien Anda */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Total Omset Deal Aktif' : 'Akumulasi Deal Klien Anda'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? totalAdminSales : totalMitraSales)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Data Realtime Database</span>
          </div>
        </div>

        {/* Card 2: Saldo Komisi Aktif */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Total Akumulasi Komisi Mitra' : 'Saldo Komisi Aktif'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {formatRupiah(userRole === 'admin' ? totalAdminCommissions : activeMitra.pendingPayout)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <span>
              {userRole === 'admin'
                ? 'Sinkron langsung dengan database'
                : `Sudah Ditarik: ${formatRupiah(activeMitra.paidPayout || 0)} | Total: ${formatRupiah(
                    activeMitra.totalCommission
                  )}`}
            </span>
          </div>
        </div>

        {/* Card 3: Kontrak Klien Anda */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Kontrak Deal Disetujui' : 'Kontrak Klien Anda'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {userRole === 'admin'
              ? `${approvedDeals.length} Kontrak`
              : `${myApprovedDeals.length} Kontrak`}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <span>
              {userRole === 'admin'
                ? `Total pengajuan klien: ${allClientDeals.length}`
                : `Total klien diinput: ${
                    allClientDeals.filter(
                      (d) =>
                        d.mitraId === activeMitra.id ||
                        d.referralCode === activeMitra.referralCode
                    ).length
                  }`}
            </span>
          </div>
        </div>

        {/* Card 4: Nomor Registrasi Mitra */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Mitra Aktif Berlisensi' : 'Nomor Registrasi Mitra'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {userRole === 'admin' ? `${verifiedMitrasCount} Mitra` : activeMitra.memberCode}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <span>
              {userRole === 'admin'
                ? `${pendingMitrasCount} pendaftaran menunggu review (Total ${allMitras.length})`
                : 'Terverifikasi resmi di sistem'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Sales Bar Chart */}
      <div className="grid grid-cols-1 gap-6">
        {/* Sales Performance Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {userRole === 'mitra'
                  ? 'Grafik Penjualan & Komisi Akun Anda (6 Bulan)'
                  : 'Grafik Penjualan & Tren Pertumbuhan Omset (6 Bulan)'}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#092147] inline-block" />
                <span>{userRole === 'mitra' ? 'Penjualan Klien Anda' : 'Total Penjualan'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                <span>{userRole === 'mitra' ? 'Komisi Anda' : 'Komisi Mitra'}</span>
              </div>
            </div>
          </div>

          {/* Clean Interactive SVG Bar Chart with Tabular Numerals */}
          <div className="h-64 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-200 relative">
            {!hasAnySalesInHistory && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500">
                  Belum ada transaksi penjualan / deal disetujui (Rp 0)
                </span>
              </div>
            )}
            {displayedSalesHistory.map((item, idx) => {
              const salesHeightPercent =
                item.totalSales > 0 ? Math.max((item.totalSales / maxSales) * 100, 4) : 2;
              const commHeightPercent =
                item.totalCommission > 0
                  ? Math.max((item.totalCommission / maxSales) * 100, 4)
                  : 2;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#092147] text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20 font-mono border border-amber-400/40">
                    <p className="font-bold text-amber-300">{item.month}</p>
                    <p>Penjualan: {formatRupiah(item.totalSales)}</p>
                    <p className="text-emerald-300">Komisi: {formatRupiah(item.totalCommission)}</p>
                    <p className="text-blue-200">
                      {userRole === 'mitra'
                        ? `${item.dealsClosed} deal klien Anda`
                        : `${item.dealsClosed} deals · ${item.mitraCount} mitra`}
                    </p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                    {/* Sales Bar */}
                    <div
                      style={{ height: `${salesHeightPercent}%` }}
                      className={`w-1/2 sm:w-8 rounded-t-sm transition-all duration-300 ${
                        item.totalSales > 0 ? 'bg-[#092147] hover:bg-[#113872]' : 'bg-slate-200'
                      }`}
                    />
                    {/* Commission Bar */}
                    <div
                      style={{ height: `${commHeightPercent}%` }}
                      className={`w-1/2 sm:w-8 rounded-t-sm transition-all duration-300 ${
                        item.totalCommission > 0
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month Labels */}
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-3 px-2">
            {displayedSalesHistory.map((item, idx) => (
              <span key={idx} className="text-center font-display text-[11px] truncate">
                {item.month.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MOTIVATIONAL REWARD TIERS & TABLE FOR MITRA DASHBOARD (COMPLETE WITH NUMBERS) */}
      {userRole === 'mitra' && (
        <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-b from-[#D4973B] via-[#C98A2C] to-[#B8791E] shadow-xl border border-amber-300/40 space-y-8">
          {/* 5 Reward Tier Cards with Full Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {/* TIER 1 */}
            <div className="bg-[#0B2559] rounded-2xl p-5 sm:p-6 text-center text-white shadow-xl border border-white/10 flex flex-col items-center justify-between">
              <div className="w-full flex flex-col items-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-4">
                  TIER 1 &bull; RP 500 JUTA
                </span>
                <div className="w-15 h-15 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3.5">
                  <Plane className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">Jalan-Jalan LN</h4>
                <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                  Capaian Rp 500.000.000
                </p>
                <p className="text-xs text-slate-200 leading-relaxed mt-2.5">
                  Apresiasi perjalanan eksklusif ke Luar Negeri bagi mitra yang mencapai penjualan Rp 500 Juta.
                </p>
              </div>
            </div>

            {/* TIER 2 */}
            <div className="bg-[#0B2559] rounded-2xl p-5 sm:p-6 text-center text-white shadow-xl border border-white/10 flex flex-col items-center justify-between">
              <div className="w-full flex flex-col items-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-4">
                  TIER 2 &bull; RP 1 MILIAR
                </span>
                <div className="w-15 h-15 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3.5">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">Motor Baru</h4>
                <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                  Capaian Rp 1.000.000.000
                </p>
                <p className="text-xs text-slate-200 leading-relaxed mt-2.5">
                  Reward unit kendaraan roda dua baru bagi mitra strategis dengan capaian penjualan Rp 1 Miliar.
                </p>
              </div>
            </div>

            {/* TIER 3 */}
            <div className="bg-[#0B2559] rounded-2xl p-5 sm:p-6 text-center text-white shadow-xl border border-white/10 flex flex-col items-center justify-between">
              <div className="w-full flex flex-col items-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-4">
                  TIER 3 &bull; RP 1,5 MILIAR
                </span>
                <div className="w-15 h-15 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3.5">
                  <Landmark className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">Umroh</h4>
                <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                  Capaian Rp 1.500.000.000
                </p>
                <p className="text-xs text-slate-200 leading-relaxed mt-2.5">
                  Hadiah ibadah Umroh / perjalanan spiritual VIP penuh fasilitas dengan capaian Rp 1,5 Miliar.
                </p>
              </div>
            </div>

            {/* TIER 4 */}
            <div className="bg-[#0B2559] rounded-2xl p-5 sm:p-6 text-center text-white shadow-xl border border-white/10 flex flex-col items-center justify-between">
              <div className="w-full flex flex-col items-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-4">
                  TIER 4 &bull; RP 5 MILIAR
                </span>
                <div className="w-15 h-15 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3.5">
                  <Car className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">Mobil Baru</h4>
                <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                  Capaian Rp 5.000.000.000
                </p>
                <p className="text-xs text-slate-200 leading-relaxed mt-2.5">
                  Reward unit Mobil Baru berkelas untuk mitra strategis dengan capaian penjualan Rp 5 Miliar.
                </p>
              </div>
            </div>

            {/* TIER 5 */}
            <div className="bg-[#0B2559] rounded-2xl p-5 sm:p-6 text-center text-white shadow-xl border border-white/10 flex flex-col items-center justify-between">
              <div className="w-full flex flex-col items-center">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-4">
                  TIER 5 &bull; RP 10 MILIAR
                </span>
                <div className="w-15 h-15 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3.5">
                  <Home className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">Rumah Baru</h4>
                <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                  Capaian Rp 10.000.000.000
                </p>
                <p className="text-xs text-slate-200 leading-relaxed mt-2.5">
                  Grand reward properti Rumah Baru sebagai puncak pencapaian kemitraan Rp 10 Miliar.
                </p>
              </div>
            </div>
          </div>

          {/* Complete Sales Achievement & Reward Table */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#081A3E]">
              <div className="px-6 py-4 bg-[#061430] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-amber-400 uppercase tracking-wide">
                  TABEL CAPAIAN PENJUALAN &amp; HADIAH / BONUS MITRA
                </h3>
                <span className="text-xs font-medium text-slate-300">
                  Target Per Bulan / Per Tahun
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-white border-collapse">
                  <thead>
                    <tr className="bg-[#0B2358] text-amber-400 font-extrabold uppercase text-xs border-b border-white/10">
                      <th className="py-3.5 px-5 text-left w-20">NO</th>
                      <th className="py-3.5 px-5 text-center">CAPAIAN PENJUALAN</th>
                      <th className="py-3.5 px-5 text-right">HADIAH/BONUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-amber-400">1</td>
                      <td className="py-3.5 px-5 text-center font-bold text-white">Rp 500.000.000</td>
                      <td className="py-3.5 px-5 text-right font-sans font-extrabold text-amber-400">Jalan-Jalan LN</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-amber-400">2</td>
                      <td className="py-3.5 px-5 text-center font-bold text-white">Rp 1.000.000.000</td>
                      <td className="py-3.5 px-5 text-right font-sans font-extrabold text-amber-400">Motor Baru</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-amber-400">3</td>
                      <td className="py-3.5 px-5 text-center font-bold text-white">Rp 1.500.000.000</td>
                      <td className="py-3.5 px-5 text-right font-sans font-extrabold text-amber-400">Umroh</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-amber-400">4</td>
                      <td className="py-3.5 px-5 text-center font-bold text-white">Rp 5.000.000.000</td>
                      <td className="py-3.5 px-5 text-right font-sans font-extrabold text-amber-400">Mobil Baru</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-amber-400">5</td>
                      <td className="py-3.5 px-5 text-center font-bold text-white">Rp 10.000.000.000</td>
                      <td className="py-3.5 px-5 text-right font-sans font-extrabold text-amber-400">Rumah Baru</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-center text-xs italic text-slate-950 font-medium mt-4">
              *Syarat dan ketentuan berlaku sesuai kebijakan pencapaian target bulanan maupun tahunan Mitra Strategis NDTAXANDLAW.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
