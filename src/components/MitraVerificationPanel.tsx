import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  UserCheck, 
  Building2, 
  CreditCard, 
  Mail, 
  Phone, 
  Eye, 
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Mitra } from '../types';
import { useConfirm } from './ConfirmDialogModal';

interface MitraVerificationPanelProps {
  mitras: Mitra[];
  onVerifyMitra: (id: string, status: 'verified' | 'rejected') => Promise<void>;
  onSelectMitraPreview: (mitra: Mitra) => void;
}

export const MitraVerificationPanel: React.FC<MitraVerificationPanelProps> = ({
  mitras,
  onVerifyMitra,
  onSelectMitraPreview,
}) => {
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<Mitra | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredMitras = mitras.filter((m) => {
    const matchesFilter = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAction = async (id: string, status: 'verified' | 'rejected') => {
    const targetMitra = mitras.find((m) => m.id === id);
    const isApprove = status === 'verified';
    const ok = await confirm({
      title: isApprove ? 'Setujui (Approve) Pendaftaran Mitra' : 'Tolak Pendaftaran Mitra',
      message: isApprove
        ? `Apakah Anda yakin ingin menyetujui pendaftaran Mitra "${targetMitra?.fullName || ''}"? Setelah disetujui, Kode Referral, Input Klien, dan Kartu Identitas Mitra akan langsung aktif.`
        : `Apakah Anda yakin ingin menolak pendaftaran Mitra "${targetMitra?.fullName || ''}"?`,
      detail: targetMitra
        ? `Nama Mitra: ${targetMitra.fullName}\nEmail: ${targetMitra.email}\nSpesialisasi: ${targetMitra.specialization}\nRekening Bank: ${targetMitra.bankDetails.bankName} - ${targetMitra.bankDetails.accountNumber}`
        : undefined,
      confirmText: isApprove ? 'Ya, Setujui Mitra' : 'Ya, Tolak Pendaftaran',
      cancelText: 'Batalkan',
      variant: isApprove ? 'success' : 'danger',
    });
    if (!ok) return;

    setActionLoadingId(id);
    try {
      await onVerifyMitra(id, status);
      if (selectedMitraDetail && selectedMitraDetail.id === id) {
        setSelectedMitraDetail(null);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = mitras.filter((m) => m.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span>Verifikasi &amp; Manajemen Data Mitra</span>
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingCount} Perlu Ditinjau
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Otorisasi berkas pendaftaran mitra baru, validasi rekening bank pencairan komisi, dan kelola nomor keanggotaan resmi.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama mitra, kode ID, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({mitras.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Verifikasi ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'verified'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Terverifikasi ({mitras.filter((m) => m.status === 'verified').length})
          </button>
        </div>
      </div>

      {/* Mitras Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6">Mitra &amp; ID Anggota</th>
                <th className="py-3 px-6">Spesialisasi Hukum / Pajak</th>
                <th className="py-3 px-6">Rekening Bank Pencairan</th>
                <th className="py-3 px-6">Tanggal Bergabung</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMitras.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatarUrl}
                        alt={m.fullName}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900 leading-snug font-display">
                          {m.fullName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {m.memberCode} · NIK: {m.nik.slice(0, 8)}****
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-slate-700">
                    <span className="font-medium">{m.specialization}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{m.email}</span>
                      <span>·</span>
                      <span>{m.phone}</span>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <p className="font-semibold text-slate-800">
                      {m.bankDetails.bankName}
                    </p>
                    <p className="font-mono text-slate-600 text-[11px] tabular-nums">
                      {m.bankDetails.accountNumber}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      a.n. {m.bankDetails.accountHolder}
                    </p>
                  </td>

                  <td className="py-4 px-6 font-mono text-slate-600 whitespace-nowrap">
                    {m.joinedDate}
                  </td>

                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    {m.status === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                      </span>
                    ) : m.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Menunggu Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <XCircle className="w-3.5 h-3.5" /> Ditolak
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedMitraDetail(m)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Lihat Detail Berkas"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {m.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(m.id, 'verified')}
                            disabled={actionLoadingId === m.id}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1"
                            title="Setujui dan terbitkan kartu identitas"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>

                          <button
                            onClick={() => handleAction(m.id, 'rejected')}
                            disabled={actionLoadingId === m.id}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            title="Tolak pendaftaran"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </>
                      )}

                      {m.status === 'verified' && (
                        <button
                          onClick={() => onSelectMitraPreview(m)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Lihat ID Card
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Detail Modal */}
      {selectedMitraDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMitraDetail.avatarUrl}
                  alt={selectedMitraDetail.fullName}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-600/20"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {selectedMitraDetail.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedMitraDetail.memberCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMitraDetail(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500">Nomor Induk Kependudukan (NIK)</p>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{selectedMitraDetail.nik}</p>
                </div>
                <div>
                  <p className="text-slate-500">Spesialisasi</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedMitraDetail.specialization}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email Korespondensi</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedMitraDetail.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Nomor WhatsApp</p>
                  <p className="font-mono font-medium text-slate-800 mt-0.5">{selectedMitraDetail.phone}</p>
                </div>
              </div>

              {/* Bank Verification Section */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                  Verifikasi Data Rekening Bank untuk Komisi
                </p>
                <div className="mt-2 space-y-1">
                  <p><span className="text-slate-600">Institusi Bank:</span> <strong className="text-blue-950">{selectedMitraDetail.bankDetails.bankName}</strong></p>
                  <p><span className="text-slate-600">Nomor Rekening:</span> <strong className="font-mono text-slate-900 text-sm">{selectedMitraDetail.bankDetails.accountNumber}</strong></p>
                  <p><span className="text-slate-600">Nama Pemilik Rekening:</span> <strong className="text-slate-900">{selectedMitraDetail.bankDetails.accountHolder}</strong></p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedMitraDetail(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Tutup
              </button>

              {selectedMitraDetail.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedMitraDetail.id, 'rejected')}
                    className="px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg border border-red-200"
                  >
                    Tolak Berkas
                  </button>
                  <button
                    onClick={() => handleAction(selectedMitraDetail.id, 'verified')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi &amp; Terbitkan ID Card</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
