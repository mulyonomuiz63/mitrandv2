import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  CreditCard, 
  Eye, 
  Clock,
  X
} from 'lucide-react';
import { Mitra } from '../types';
import { useConfirm } from './ConfirmDialogModal';

interface MitraVerificationPanelProps {
  mitras: Mitra[];
  onVerifyMitra: (id: string, status: 'verified' | 'rejected', rejectionReason?: string) => Promise<void>;
  onSelectMitraPreview: (mitra: Mitra) => void;
}

const REJECTION_REASON_PRESETS = [
  'Nomor NIK KTP (16 digit) tidak sesuai atau belum valid.',
  'Nama pemilik rekening bank tidak sesuai dengan nama lengkap Mitra terdaftar.',
  'Nomor rekening bank pencairan tidak valid / belum lengkap.',
  'Nomor WhatsApp aktif atau data profil belum lengkap.',
];

export const MitraVerificationPanel: React.FC<MitraVerificationPanelProps> = ({
  mitras,
  onVerifyMitra,
  onSelectMitraPreview,
}) => {
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<Mitra | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Rejection Reason Modal State
  const [mitraToReject, setMitraToReject] = useState<Mitra | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>(
    'Data rekening bank / NIK KTP belum sesuai dengan identitas pendaftaran. Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.'
  );

  const filteredMitras = mitras.filter((m) => {
    const matchesFilter = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApproveAction = async (id: string) => {
    const targetMitra = mitras.find((m) => m.id === id);
    const ok = await confirm({
      title: 'Setujui (Approve) Verifikasi Data Mitra',
      message: `Apakah Anda yakin ingin menyetujui pendaftaran Mitra "${targetMitra?.fullName || ''}"? Setelah disetujui, status Mitra menjadi Lulus Verifikasi dan Kode Referral, Input Klien, serta Kartu Identitas Mitra langsung aktif.`,
      detail: targetMitra
        ? `Nama Mitra: ${targetMitra.fullName}\nNIK KTP: ${targetMitra.nik}\nEmail: ${targetMitra.email}\nRekening Bank: ${targetMitra.bankDetails.bankName} - ${targetMitra.bankDetails.accountNumber} (a.n. ${targetMitra.bankDetails.accountHolder})`
        : undefined,
      confirmText: 'Ya, Setujui & Lulus Verifikasi',
      cancelText: 'Batalkan',
      variant: 'success',
    });
    if (!ok) return;

    setActionLoadingId(id);
    try {
      await onVerifyMitra(id, 'verified');
      if (selectedMitraDetail && selectedMitraDetail.id === id) {
        setSelectedMitraDetail(null);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (mitra: Mitra) => {
    setMitraToReject(mitra);
    setRejectionReasonInput(
      mitra.rejectionReason ||
        'Data rekening bank / NIK KTP belum sesuai dengan identitas pendaftaran. Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.'
    );
  };

  const handleConfirmRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraToReject) return;
    const trimmedReason = rejectionReasonInput.trim();
    if (!trimmedReason) return;

    const ok = await confirm({
      title: 'Konfirmasi Tolak Verifikasi Data Mitra',
      message: `Apakah Anda yakin ingin menolak data pendaftaran Mitra "${mitraToReject.fullName}"? Mitra akan menerima keterangan alasan penolakan ini dan dapat memperbaiki datanya untuk diajukan kembali.`,
      detail: `Nama Mitra: ${mitraToReject.fullName}\nAlasan Penolakan: "${trimmedReason}"`,
      confirmText: 'Ya, Tolak & Kirim Keterangan',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

    setActionLoadingId(mitraToReject.id);
    try {
      await onVerifyMitra(mitraToReject.id, 'rejected', trimmedReason);
      if (selectedMitraDetail && selectedMitraDetail.id === mitraToReject.id) {
        setSelectedMitraDetail(null);
      }
      setMitraToReject(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = mitras.filter((m) => m.status === 'pending').length;
  const verifiedCount = mitras.filter((m) => m.status === 'verified').length;
  const rejectedCount = mitras.filter((m) => m.status === 'rejected').length;

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
            Otorisasi berkas pendaftaran mitra baru, berikan catatan perbaikan jika data ditolak, dan setujui mitra yang telah lulus verifikasi.
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
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({mitras.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Verifikasi ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'verified'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lulus Verifikasi ({verifiedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'rejected'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ditolak / Perbaikan ({rejectedCount})
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
                <th className="py-3 px-6 text-center">Status Verifikasi</th>
                <th className="py-3 px-6 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMitras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada data mitra yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredMitras.map((m) => (
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
                            {m.memberCode} · NIK: {m.nik}
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

                    <td className="py-4 px-6 text-center">
                      {m.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lulus Verifikasi
                        </span>
                      ) : m.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Cek Admin
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5" /> Ditolak (Perlu Perbaikan)
                          </span>
                          {m.rejectionReason && (
                            <span
                              className="text-[10px] text-red-600 max-w-[210px] truncate block"
                              title={m.rejectionReason}
                            >
                              Alasan: {m.rejectionReason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedMitraDetail(m)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Cek Detail Berkas Mitra"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Cek Data</span>
                        </button>

                        {m.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveAction(m.id)}
                              disabled={actionLoadingId === m.id}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1"
                              title="Setujui dan terbitkan kartu identitas"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(m)}
                              disabled={actionLoadingId === m.id}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 flex items-center gap-1"
                              title="Tolak pendaftaran & berikan alasan"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}

                        {m.status === 'rejected' && (
                          <button
                            onClick={() => handleApproveAction(m.id)}
                            disabled={actionLoadingId === m.id}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                            title="Setujui pendaftaran mitra ini"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
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
                ))
              )}
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
                    {selectedMitraDetail.memberCode} · Status:{' '}
                    <strong className={
                      selectedMitraDetail.status === 'verified'
                        ? 'text-emerald-700'
                        : selectedMitraDetail.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }>
                      {selectedMitraDetail.status === 'verified'
                        ? 'Lulus Verifikasi'
                        : selectedMitraDetail.status === 'rejected'
                        ? 'Ditolak (Menunggu Perbaikan Mitra)'
                        : 'Menunggu Verifikasi Admin'}
                    </strong>
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
              {selectedMitraDetail.status === 'rejected' && selectedMitraDetail.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
                  <p className="font-bold text-red-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Keterangan Alasan Penolakan Sebelumnya:</span>
                  </p>
                  <p className="mt-1 text-red-800 leading-relaxed">
                    "{selectedMitraDetail.rejectionReason}"
                  </p>
                </div>
              )}

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

              {/* Dynamic Custom Fields Section (if any) */}
              {selectedMitraDetail.customFields && Object.keys(selectedMitraDetail.customFields).length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
                    Data Tambahan Pendaftaran Mitra
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.entries(selectedMitraDetail.customFields).map(([k, v]) => (
                      <div key={k} className="bg-white p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block">{k}</span>
                        <span className="font-semibold text-slate-900 text-xs">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedMitraDetail(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Tutup
              </button>

              {selectedMitraDetail.status !== 'verified' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedMitraDetail;
                      setSelectedMitraDetail(null);
                      openRejectModal(target);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                  >
                    Tolak Data &amp; Beri Keterangan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveAction(selectedMitraDetail.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve (Lulus Verifikasi)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Alasan Penolakan Data Mitra */}
      {mitraToReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                    VERIFIKASI DITOLAK SEMENTARA
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                    Tolak Data Mitra &amp; Berikan Keterangan Perbaikan
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraToReject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectSubmit} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div><span className="text-slate-500">Nama Mitra:</span> <strong className="text-slate-900">{mitraToReject.fullName}</strong></div>
                <div><span className="text-slate-500">NIK KTP:</span> <strong className="font-mono text-slate-800">{mitraToReject.nik}</strong></div>
                <div><span className="text-slate-500">Rekening Bank:</span> <strong className="text-slate-800">{mitraToReject.bankDetails.bankName} - {mitraToReject.bankDetails.accountNumber} (a.n. {mitraToReject.bankDetails.accountHolder})</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Pilih Cepat Alasan Penolakan (Atau Ketik Manual di Bawah):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {REJECTION_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonInput(preset)}
                      className={`text-left text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                        rejectionReasonInput === preset
                          ? 'bg-red-600 text-white border-red-600 font-semibold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Keterangan Alasan Ditolak (Tampil di Portal Mitra) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Tuliskan alasan mengapa data mitra ditolak dan bagian mana yang harus diperbaiki..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Keterangan ini akan langsung tampil di halaman Mitra agar Mitra dapat memperbaiki datanya dan mengajukan verifikasi ulang.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMitraToReject(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === mitraToReject.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
                >
                  Tolak Data &amp; Kirim Keterangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
