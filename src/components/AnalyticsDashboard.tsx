import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Sparkles, 
  BarChart3, 
  ArrowUpRight, 
  Download, 
  RefreshCw, 
  Calendar,
  CheckCircle2,
  Copy,
  Printer,
  ChevronRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { SalesHistoryMonth, Mitra, ClientDeal } from '../types';

interface AnalyticsDashboardProps {
  salesHistory: SalesHistoryMonth[];
  userRole: 'admin' | 'mitra';
  activeMitra: Mitra;
  allMitras?: Mitra[];
  allClientDeals?: ClientDeal[];
  onNavigateTab: (tab: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  salesHistory,
  userRole,
  activeMitra,
  allMitras = [],
  allClientDeals = [],
  onNavigateTab,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('November 2026');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate or fetch default AI insight if none exists
  const generateAiReport = async () => {
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/ai/monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPeriod: selectedPeriod,
          userRole,
          specificMitraId: userRole === 'mitra' ? activeMitra.id : undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.report) {
        setAiReport(data.report);
        setAiGeneratedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to generate AI report:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    // Generate initial report if empty
    if (!aiReport) {
      generateAiReport();
    }
  }, [selectedPeriod]);

  const handleCopyReport = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Max value for SVG scale calculations
  const maxSales = Math.max(...salesHistory.map((s) => s.totalSales), 1);
  const hasAnySalesInHistory = salesHistory.some((s) => s.totalSales > 0 || s.totalCommission > 0);

  // Live metrics from Supabase / active state
  const approvedDeals = allClientDeals.filter(
    (d) => d.status === 'active_subscription' || d.status === 'deal_closed'
  );
  const myApprovedDeals = approvedDeals.filter(
    (d) => d.mitraId === activeMitra.id || d.referralCode === activeMitra.referralCode
  );
  const totalAdminSales = approvedDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const totalMitraSales = myApprovedDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const verifiedMitrasCount = allMitras.filter((m) => m.status === 'verified').length;
  const pendingMitrasCount = allMitras.filter((m) => m.status === 'pending').length;
  const totalAdminCommissions = allMitras.reduce((sum, m) => sum + (Number(m.totalCommission) || 0), 0);

  // Dynamic Service Composition from real deals in Supabase
  const relevantDealsForBreakdown = userRole === 'admin' ? approvedDeals : myApprovedDeals;
  const totalBreakdownValue = relevantDealsForBreakdown.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);

  const serviceBreakdown = React.useMemo(() => {
    const defaultCategories = [
      { label: 'Pajak Korporasi & Transfer Pricing', color: 'bg-blue-700', value: 0, count: 0 },
      { label: 'Pendirian PT PMA & Perizinan OSS', color: 'bg-indigo-600', value: 0, count: 0 },
      { label: 'Pendampingan Audit & SP2DK Pajak', color: 'bg-emerald-600', value: 0, count: 0 },
      { label: 'Legal Due Diligence & Retainer', color: 'bg-amber-600', value: 0, count: 0 },
    ];

    if (relevantDealsForBreakdown.length === 0) {
      return defaultCategories.map((c) => ({ ...c, percent: 0 }));
    }

    const grouped = new Map<string, { value: number; count: number }>();
    for (const deal of relevantDealsForBreakdown) {
      const name = (deal.serviceName || 'Layanan Konsultasi Pajak & Hukum').trim();
      const prev = grouped.get(name) || { value: 0, count: 0 };
      grouped.set(name, {
        value: prev.value + (Number(deal.dealValue) || 0),
        count: prev.count + 1,
      });
    }

    const colors = ['bg-blue-700', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600'];
    const sorted = Array.from(grouped.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 4);

    return sorted.map(([label, stats], idx) => ({
      label,
      color: colors[idx % colors.length],
      value: stats.value,
      count: stats.count,
      percent:
        totalBreakdownValue > 0
          ? Math.round((stats.value / totalBreakdownValue) * 100)
          : Math.round((stats.count / relevantDealsForBreakdown.length) * 100),
    }));
  }, [relevantDealsForBreakdown, totalBreakdownValue]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Dashboard Analitik &amp; Laporan Kinerja
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Live Analytics
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Monitoring komprehensif performa penjualan jasa hukum-pajak, pertumbuhan mitra, dan ringkasan eksekutif AI.
          </p>
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

          <button
            onClick={generateAiReport}
            disabled={isGeneratingAi}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAi ? 'Menganalisis...' : 'Perbarui Analisis AI'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Total Omset Deal Aktif' : 'Akumulasi Deal Layanan'}
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

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Mitra Aktif Berlisensi' : 'Status Kartu Identitas'}
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

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kontrak Deal Disetujui
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {userRole === 'admin' ? `${approvedDeals.length} Kontrak` : `${myApprovedDeals.length} Kontrak`}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <span>
              {userRole === 'admin'
                ? `Total pengajuan klien: ${allClientDeals.length}`
                : `Total klien diinput: ${allClientDeals.filter((d) => d.mitraId === activeMitra.id).length}`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {userRole === 'admin' ? 'Total Akumulasi Komisi Mitra' : 'Saldo Komisi Aktif Anda'}
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
                ? 'Sinkron langsung dengan database Supabase'
                : `Sudah Ditarik: ${formatRupiah(activeMitra.paidPayout || 0)} | Total: ${formatRupiah(activeMitra.totalCommission)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Sales Bar Chart & Mitra Growth Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Grafik Penjualan &amp; Tren Pertumbuhan Omset (6 Bulan)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai kontrak bruto (Rupiah) dan akumulasi komisi mitra per periode (Realtime Database Supabase).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-700 inline-block" />
                <span>Total Penjualan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                <span>Komisi Mitra</span>
              </div>
            </div>
          </div>

          {/* Clean Interactive SVG Bar Chart with Tabular Numerals */}
          <div className="h-64 w-full flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-200 relative">
            {!hasAnySalesInHistory && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500">
                  Belum ada transaksi penjualan / deal disetujui pada database (Rp 0)
                </span>
              </div>
            )}
            {salesHistory.map((item, idx) => {
              const salesHeightPercent = item.totalSales > 0 ? Math.max((item.totalSales / maxSales) * 100, 4) : 2;
              const commHeightPercent = item.totalCommission > 0 ? Math.max((item.totalCommission / maxSales) * 100, 4) : 2;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20 font-mono">
                    <p className="font-bold">{item.month}</p>
                    <p>Penjualan: {formatRupiah(item.totalSales)}</p>
                    <p className="text-emerald-300">Komisi: {formatRupiah(item.totalCommission)}</p>
                    <p className="text-blue-200">{item.dealsClosed} deals · {item.mitraCount} mitra</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                    {/* Sales Bar */}
                    <div
                      style={{ height: `${salesHeightPercent}%` }}
                      className={`w-1/2 sm:w-8 rounded-t-sm transition-all duration-300 ${
                        item.totalSales > 0 ? 'bg-blue-700 hover:bg-blue-800' : 'bg-slate-200'
                      }`}
                    />
                    {/* Commission Bar */}
                    <div
                      style={{ height: `${commHeightPercent}%` }}
                      className={`w-1/2 sm:w-8 rounded-t-sm transition-all duration-300 ${
                        item.totalCommission > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month Labels */}
          <div className="flex justify-between text-xs text-slate-500 font-medium pt-3 px-2">
            {salesHistory.map((item, idx) => (
              <span key={idx} className="text-center font-display text-[11px] truncate">
                {item.month.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Growth & Services Breakdown (1 Column) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Komposisi Layanan Terlaris
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {relevantDealsForBreakdown.length > 0
                ? `Berdasarkan ${relevantDealsForBreakdown.length} kontrak deal aktif di database.`
                : 'Belum ada transaksi deal disetujui di database (0%).'}
            </p>

            <div className="mt-5 space-y-4 text-xs">
              {serviceBreakdown.map((srv, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1 gap-2">
                    <span className="truncate">{srv.label}</span>
                    <span className="font-mono shrink-0">{srv.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${srv.color} h-full transition-all duration-300`}
                      style={{ width: `${srv.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('marketing-tools')}
              className="w-full py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between"
            >
              <span>Akses Tools Marketing Layanan Ini</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AI-Powered Monthly Performance Analysis Card (Powered by Gemini 3.8 Flash) */}
      <div className="bg-white rounded-xl border border-blue-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <span>Generator Analisis Cerdas &amp; Ringkasan Laporan Bulanan</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Sintesis kinerja otomatis berbasis data metrik riil NDTAXANDLAW periode {selectedPeriod}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {aiGeneratedAt && (
              <span className="text-[11px] text-blue-300 font-mono hidden sm:block">
                Diperbarui pukul {aiGeneratedAt}
              </span>
            )}
            <button
              onClick={handleCopyReport}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Salin Analisis ke Papan Klip"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Cetak Laporan"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Analysis Content Body */}
        <div className="p-6">
          {isGeneratingAi ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-700 rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Gemini 3.8 Flash sedang memproses data kinerja...
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Mengkonsolidasikan pertumbuhan mitra, rasio closing kesepakatan, dan merumuskan rekomendasi 30 hari ke depan.
              </p>
            </div>
          ) : aiReport ? (
            <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 space-y-4">
              {/* Custom renderer for Markdown-like text */}
              {aiReport.split('\n\n').map((paragraph, pIdx) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={pIdx} className="text-base font-bold text-slate-900 font-display border-b border-slate-100 pb-2 mt-4 first:mt-0">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('#### ')) {
                  return (
                    <h4 key={pIdx} className="text-sm font-bold text-blue-900 font-display mt-3">
                      {paragraph.replace('#### ', '')}
                    </h4>
                  );
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                  return (
                    <ul key={pIdx} className="list-disc pl-5 space-y-1 text-slate-700">
                      {paragraph.split('\n').map((item, iIdx) => (
                        <li key={iIdx}>{item.replace(/^[-*]\s+/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                if (/^\d+\.\s/.test(paragraph)) {
                  return (
                    <ol key={pIdx} className="list-decimal pl-5 space-y-1 text-slate-700">
                      {paragraph.split('\n').map((item, iIdx) => (
                        <li key={iIdx}>{item.replace(/^\d+\.\s+/, '')}</li>
                      ))}
                    </ol>
                  );
                }
                return (
                  <p key={pIdx} className="text-slate-700">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Klik tombol &quot;Perbarui Analisis AI&quot; di atas untuk memproses laporan eksekutif.
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Laporan terverifikasi oleh Sistem Analitik &amp; Operasional NDTAXANDLAW
            </span>
            <span className="font-mono text-[11px]">
              Engine: Server-Side @google/genai (gemini-3.8-flash)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
