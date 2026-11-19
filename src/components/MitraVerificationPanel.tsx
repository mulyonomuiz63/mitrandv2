import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  CreditCard, 
  Eye, 
  Clock,
  X,
  FileText,
  Upload,
  ExternalLink
} from 'lucide-react';
import { Mitra, getMitraKtpFileUrl, getMitraKtpFileName } from '../types';
import { useConfirm } from './ConfirmDialogModal';
import { compressAndUploadFile, isAllowedVerificationDocumentFile } from '../utils/fileCompressor';
import {
  useServerDataTable,
  ServerDataTableTopBar,
  ServerDataTableFooter,
  parseClientRecordTimestamp,
  TableSkeletonRows,
} from './ServerDataTableControls';
import { ImageWithSkeleton } from './SkeletonLoader';

interface MitraVerificationPanelProps {
  mitras: Mitra[];
  onVerifyMitra: (id: string, status: 'verified' | 'rejected', rejectionReason?: string) => Promise<void>;
  onSelectMitraPreview: (mitra: Mitra) => void;
  onUpdateMitraProfile?: (id: string, data: Partial<Mitra>) => Promise<void>;
}

const REJECTION_REASON_PRESETS = [
  'Dokumen File KTP / NPWP belum diunggah atau tidak terbaca dengan jelas.',
  'Nomor NIK KTP (16 digit) tidak sesuai atau belum valid.',
  'Nama pemilik rekening bank tidak sesuai dengan nama lengkap Mitra terdaftar.',
  'Nomor rekening bank pencairan tidak valid / belum lengkap.',
  'Nomor WhatsApp aktif atau data profil belum lengkap.',
];

export const MitraVerificationPanel: React.FC<MitraVerificationPanelProps> = ({
  mitras,
  onVerifyMitra,
  onSelectMitraPreview,
  onUpdateMitraProfile,
}) => {
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<Mitra | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isAdminUploadingKtp, setIsAdminUploadingKtp] = useState(false);
  const [adminUploadMsg, setAdminUploadMsg] = useState<string | null>(null);

  // Rejection Reason Modal State
  const [mitraToReject, setMitraToReject] = useState<Mitra | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>(
    'Data rekening bank / NIK KTP belum sesuai dengan identitas pendaftaran. Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.'
  );

  const sortedFilteredMitras = React.useMemo(() => {
    const withTs = mitras.map((m, idx) => ({
      item: m,
      ts: parseClientRecordTimestamp(m.joinedDate, m.id, mitras.length - idx),
    }));
    withTs.sort((a, b) => b.ts - a.ts);
    const q = searchQuery.toLowerCase().trim();
    return withTs
      .map((x) => x.item)
      .filter((m) => {
        const matchesFilter = statusFilter === 'all' || m.status === statusFilter;
        const matchesSearch =
          !q ||
          m.fullName.toLowerCase().includes(q) ||
          m.memberCode.toLowerCase().includes(q) ||
          m.specialization.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.nik || '').toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
      });
  }, [mitras, statusFilter, searchQuery]);

  const mitraDt = useServerDataTable<Mitra>({
    resource: 'mitras',
    fallbackItems: sortedFilteredMitras,
    defaultPerPage: 10,
    externalSearch: searchQuery,
    extraParams: { status: statusFilter },
    dependencyKey: `${mitras.length}-${mitras.map((m) => m.status).join(',')}`,
  });

  const filteredMitras = mitraDt.rows;

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
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
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
        <ServerDataTableTopBar
          perPage={mitraDt.perPage}
          onPerPageChange={mitraDt.setPerPage}
          perPageOptions={[10, 25, 50, 100]}
          hideSearch
          isLoading={mitraDt.isLoading}
          onRefresh={mitraDt.refresh}
          unitLabel="mitra"
        />
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
              {mitraDt.isLoading ? (
                <TableSkeletonRows columns={6} rows={mitraDt.perPage > 10 ? 10 : mitraDt.perPage} />
              ) : filteredMitras.length === 0 ? (
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
                        <ImageWithSkeleton
                          src={m.avatarUrl}
                          alt={m.fullName}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                          containerClassName="w-9 h-9 shrink-0"
                          rounded="rounded-full"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-snug font-display">
                            {m.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {m.memberCode} · NIK: {m.nik}
                          </p>
                          <div className="mt-1">
                            {getMitraKtpFileUrl(m) ? (
                              <a
                                href={getMitraKtpFileUrl(m)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Berkas KTP/NPWP Terunggah</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                <span>Belum Upload KTP/NPWP</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-medium">{m.specialization}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-1">
                        <span>{m.email}</span>
                        <span>·</span>
                        {m.phone ? (
                          <a
                            href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Hubungi WhatsApp ${m.fullName} (${m.phone})`}
                            className="inline-flex items-center gap-1 font-mono text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 hover:bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200/80 transition-colors font-medium text-[11px]"
                          >
                            <svg className="w-3 h-3 text-[#25D366] shrink-0" viewBox="0 0 32 32" fill="currentColor">
                              <path d="M16.004 3.2c-7.068 0-12.8 5.732-12.8 12.8 0 2.257.59 4.46 1.71 6.404L3.09 28.8l6.565-1.722a12.742 12.742 0 0 0 6.349 1.682h.005c7.068 0 12.8-5.732 12.8-12.8 0-3.42-1.332-6.635-3.75-9.054A12.716 12.716 0 0 0 16.004 3.2zm0 23.398h-.004a10.61 10.61 0 0 1-5.409-1.482l-.388-.23-4.022 1.055 1.073-3.92-.252-.402a10.583 10.583 0 0 1-1.628-5.659c0-5.862 4.77-10.631 10.634-10.631 2.84 0 5.509 1.106 7.516 3.115a10.562 10.562 0 0 1 3.112 7.517c0 5.863-4.77 10.637-10.632 10.637zm5.832-7.965c-.32-.16-1.892-.934-2.186-1.04-.293-.107-.506-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.186.214-.373.24-.693.08-.32-.16-1.351-.498-2.573-1.588-.951-.848-1.593-1.896-1.78-2.216-.186-.32-.02-.493.14-.653.144-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.213 2.256 3.445 5.465 4.83.764.33 1.36.527 1.824.675.766.243 1.464.209 2.015.127.615-.092 1.892-.773 2.159-1.52.266-.747.266-1.387.186-1.52-.08-.133-.293-.213-.613-.373z" />
                            </svg>
                            <span>{m.phone}</span>
                          </a>
                        ) : (
                          <span>-</span>
                        )}
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
        <ServerDataTableFooter
          page={mitraDt.meta.page}
          perPage={mitraDt.perPage}
          totalItems={mitraDt.meta.totalItems}
          totalPages={mitraDt.meta.totalPages}
          onPageChange={mitraDt.setPage}
          unitLabel="mitra"
        />
      </div>

      {/* Inspect Detail Modal */}
      {selectedMitraDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header (Fixed, Always Visible) */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <ImageWithSkeleton
                  src={selectedMitraDetail.avatarUrl}
                  alt={selectedMitraDetail.fullName}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-600/20"
                  containerClassName="w-12 h-12 shrink-0"
                  rounded="rounded-xl"
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
                type="button"
                onClick={() => setSelectedMitraDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
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
                  {selectedMitraDetail.phone ? (
                    <a
                      href={`https://wa.me/${selectedMitraDetail.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Hubungi WhatsApp ${selectedMitraDetail.fullName} (${selectedMitraDetail.phone})`}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors mt-0.5 text-xs sm:text-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-[#25D366] shrink-0" viewBox="0 0 32 32" fill="currentColor">
                        <path d="M16.004 3.2c-7.068 0-12.8 5.732-12.8 12.8 0 2.257.59 4.46 1.71 6.404L3.09 28.8l6.565-1.722a12.742 12.742 0 0 0 6.349 1.682h.005c7.068 0 12.8-5.732 12.8-12.8 0-3.42-1.332-6.635-3.75-9.054A12.716 12.716 0 0 0 16.004 3.2zm0 23.398h-.004a10.61 10.61 0 0 1-5.409-1.482l-.388-.23-4.022 1.055 1.073-3.92-.252-.402a10.583 10.583 0 0 1-1.628-5.659c0-5.862 4.77-10.631 10.634-10.631 2.84 0 5.509 1.106 7.516 3.115a10.562 10.562 0 0 1 3.112 7.517c0 5.863-4.77 10.637-10.632 10.637zm5.832-7.965c-.32-.16-1.892-.934-2.186-1.04-.293-.107-.506-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.186.214-.373.24-.693.08-.32-.16-1.351-.498-2.573-1.588-.951-.848-1.593-1.896-1.78-2.216-.186-.32-.02-.493.14-.653.144-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.146 3.093 1.306 3.307.16.213 2.256 3.445 5.465 4.83.764.33 1.36.527 1.824.675.766.243 1.464.209 2.015.127.615-.092 1.892-.773 2.159-1.52.266-.747.266-1.387.186-1.52-.08-.133-.293-.213-.613-.373z" />
                      </svg>
                      <span>{selectedMitraDetail.phone}</span>
                    </a>
                  ) : (
                    <p className="font-mono text-slate-400 mt-0.5">-</p>
                  )}
                </div>
              </div>

              {/* Berkas Verifikasi KTP / NPWP Section (View & Manual Upload by Admin) */}
              {(() => {
                const ktpUrl = getMitraKtpFileUrl(selectedMitraDetail);
                const ktpName = getMitraKtpFileName(selectedMitraDetail);
                const isPdf =
                  ktpUrl.toLowerCase().endsWith('.pdf') ||
                  ktpUrl.startsWith('data:application/pdf');

                const handleAdminKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAdminUploadMsg(null);
                  if (!isAllowedVerificationDocumentFile(file)) {
                    setAdminUploadMsg('Format file wajib JPG, JPEG, PNG, atau PDF.');
                    e.target.value = '';
                    return;
                  }
                  setIsAdminUploadingKtp(true);
                  try {
                    const compressed = await compressAndUploadFile(file, {
                      maxDimension: 1400,
                      quality: 0.78,
                      uploadToServer: true,
                    });
                    const finalUrl = compressed.hostedUrl || compressed.dataUrl;
                    const finalName = compressed.fileName || file.name;
                    const payload = {
                      ktpFileUrl: finalUrl,
                      ktpFileName: finalName,
                      customFields: {
                        ...(selectedMitraDetail.customFields || {}),
                        'Upload File KTP / NPWP': finalUrl,
                        'mitra-def-ktpFile': finalUrl,
                        __ktpFileName: finalName,
                      },
                    };
                    if (onUpdateMitraProfile) {
                      await onUpdateMitraProfile(selectedMitraDetail.id, payload);
                    } else {
                      await fetch(`/api/mitra/${selectedMitraDetail.id}/profile`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                    }
                    setSelectedMitraDetail({
                      ...selectedMitraDetail,
                      ktpFileUrl: finalUrl,
                      ktpFileName: finalName,
                      customFields: payload.customFields,
                    });
                    mitraDt.refresh();
                    setAdminUploadMsg(
                      `Berkas "${finalName}" berhasil dikompres (${compressed.originalFormattedSize} → ${compressed.compressedFormattedSize}) dan disimpan.`
                    );
                  } catch (err: any) {
                    setAdminUploadMsg(err?.message || 'Gagal mengunggah berkas KTP/NPWP.');
                  } finally {
                    setIsAdminUploadingKtp(false);
                  }
                };

                return (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      ktpUrl
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/80 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-700" />
                          <span>Dokumen Verifikasi KTP / NPWP Mitra</span>
                        </p>
                        {ktpUrl ? (
                          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            ✓ Berkas: {ktpName || 'Dokumen_KTP_NPWP'}
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-900 font-semibold mt-0.5">
                            ⚠ Mitra belum mengunggah file KTP / NPWP (Wajib JPG, JPEG, PNG, atau PDF)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ktpUrl && (
                          <a
                            href={ktpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Lihat / Unduh</span>
                          </a>
                        )}
                        <label className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer inline-flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>
                            {isAdminUploadingKtp
                              ? 'Mengompres...'
                              : ktpUrl
                              ? 'Ganti File'
                              : 'Upload Manual'}
                          </span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                            onChange={handleAdminKtpUpload}
                            disabled={isAdminUploadingKtp}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {ktpUrl && !isPdf && (
                      <div className="pt-1">
                        <a href={ktpUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <ImageWithSkeleton
                            src={ktpUrl}
                            alt="Berkas KTP/NPWP Mitra"
                            className="max-h-36 rounded-lg border border-slate-200 object-contain bg-white p-1"
                            rounded="rounded-lg"
                          />
                        </a>
                      </div>
                    )}

                    {adminUploadMsg && (
                      <p className="text-[11px] font-semibold text-blue-800 bg-white/80 px-2.5 py-1.5 rounded-lg border border-blue-200">
                        {adminUploadMsg}
                      </p>
                    )}
                  </div>
                );
              })()}

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
                  {selectedMitraDetail.bankDetails.customBankFields &&
                    Object.entries(selectedMitraDetail.bankDetails.customBankFields).map(([k, v]) =>
                      v ? (
                        <p key={k}>
                          <span className="text-slate-600">{k}:</span>{' '}
                          {typeof v === 'string' && (v.startsWith('/uploads/') || v.startsWith('data:')) ? (
                            <a
                              href={v}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-blue-700 hover:underline"
                            >
                              Lihat Berkas Terunggah
                            </a>
                          ) : (
                            <strong className="text-slate-900">{v}</strong>
                          )}
                        </p>
                      ) : null
                    )}
                </div>
              </div>

              {/* Dynamic Custom Fields Section (if any) */}
              {selectedMitraDetail.customFields &&
                Object.keys(selectedMitraDetail.customFields).filter(
                  (k) => k !== '__ktpFileName' && k !== 'mitra-def-ktpFile'
                ).length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
                    Data Tambahan Pendaftaran Mitra
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.entries(selectedMitraDetail.customFields)
                      .filter(([k]) => k !== '__ktpFileName' && k !== 'mitra-def-ktpFile')
                      .map(([k, v]) => (
                        <div key={k} className="bg-white p-2 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 block">{k}</span>
                          {typeof v === 'string' &&
                          (v.startsWith('/uploads/') || v.startsWith('data:')) ? (
                            <a
                              href={v}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-blue-700 hover:underline text-xs inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Lihat Berkas</span>
                            </a>
                          ) : (
                            <span className="font-semibold text-slate-900 text-xs">{v || '-'}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Fixed, Always Visible) */}
            <div className="flex items-center justify-end gap-2 p-4 sm:px-6 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedMitraDetail(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
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
                    className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer transition-colors"
                  >
                    Tolak Data &amp; Beri Keterangan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveAction(selectedMitraDetail.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200 shrink-0 bg-white">
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

            <form onSubmit={handleConfirmRejectSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
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
              </div>

              <div className="flex items-center justify-end gap-2 p-4 sm:px-6 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setMitraToReject(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === mitraToReject.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors cursor-pointer"
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
