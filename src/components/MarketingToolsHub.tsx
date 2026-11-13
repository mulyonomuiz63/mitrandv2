import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Search, 
  Plus, 
  Trash2, 
  Eye, 
  Sparkles, 
  Clock, 
  Filter, 
  CheckCircle, 
  ExternalLink,
  BookOpen,
  Share2
} from 'lucide-react';
import { MarketingTool } from '../types';
import { useConfirm } from './ConfirmDialogModal';

interface MarketingToolsHubProps {
  tools: MarketingTool[];
  userRole: 'admin' | 'mitra';
  onAddTool: (tool: Partial<MarketingTool>) => Promise<void>;
  onDeleteTool: (id: string) => Promise<void>;
}

export const MarketingToolsHub: React.FC<MarketingToolsHubProps> = ({
  tools,
  userRole,
  onAddTool,
  onDeleteTool,
}) => {
  const confirm = useConfirm();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPreviewTool, setSelectedPreviewTool] = useState<MarketingTool | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Admin Upload
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MarketingTool['category']>('Brosur Digital');
  const [newFileType, setNewFileType] = useState<'pdf' | 'png' | 'jpg' | 'mp4'>('pdf');
  const [newTargetProduct, setNewTargetProduct] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFileSize, setNewFileSize] = useState('4.2 MB');
  const [newDuration, setNewDuration] = useState('03:30 min');

  const categories = [
    { id: 'all', label: 'Semua Materi' },
    { id: 'Brosur Digital', label: 'Brosur Digital (PDF)' },
    { id: 'Banner Promosi', label: 'Banner Promosi (JPG/PNG)' },
    { id: 'Video Presentasi', label: 'Video Presentasi (MP4)' },
    { id: 'Panduan Penjualan', label: 'Panduan Penjualan' },
    { id: 'Materi Pelatihan', label: 'Materi Pelatihan Eksklusif' },
  ];

  const filteredTools = tools.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = 
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.targetProduct.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const ok = await confirm({
      title: 'Konfirmasi Unggah Materi Promosi Baru',
      message: `Apakah Anda yakin ingin mengunggah materi "${newTitle.trim()}" dan menyiarkan notifikasinya ke seluruh Mitra?`,
      detail: `Judul Materi: ${newTitle.trim()}\nKategori: ${newCategory}\nFormat File: ${newFileType.toUpperCase()}`,
      confirmText: 'Ya, Unggah Materi',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;
    setIsSubmitting(true);

    try {
      await onAddTool({
        title: newTitle,
        category: newCategory,
        fileType: newFileType,
        fileSize: newFileSize,
        targetProduct: newTargetProduct || 'Layanan Konsultasi NDTAXANDLAW',
        description: newDescription || 'Materi resmi pendukung penjualan mitra.',
        duration: newFileType === 'mp4' ? newDuration : undefined,
        downloadUrl: `#download-${Date.now()}`,
        thumbnailUrl: newFileType === 'mp4'
          ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'
          : newFileType === 'pdf'
          ? 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'
          : 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewTargetProduct('');
      showToast('Tools Marketing berhasil diunggah & notifikasi disiarkan ke semua mitra!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getFileBadge = (type: MarketingTool['fileType']) => {
    switch (type) {
      case 'pdf':
        return { label: 'PDF', icon: FileText, color: 'text-red-700 bg-red-50 border-red-200' };
      case 'png':
      case 'jpg':
        return { label: 'IMG', icon: ImageIcon, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'mp4':
      case 'stream':
        return { label: 'VIDEO', icon: Video, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      default:
        return { label: 'DOC', icon: FileText, color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Tools Marketing &amp; Materi Pelatihan
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Koleksi aset promosi digital, panduan konsultasi hukum-pajak, dan video edukasi siap pakai untuk mitra.
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tools / Video Baru</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari brosur, video pitching, materi SPT, atau panduan closing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap self-end sm:self-center">
            Menampilkan <strong>{filteredTools.length}</strong> materi
          </div>
        </div>

        {/* Clean Segmented Filter Buttons (Standard button elements with active states) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Marketing Tools */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-6">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Materi Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Tidak ada dokumen atau video yang sesuai dengan kata kunci pencarian Anda. Coba ubah filter kategori.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const badge = getFileBadge(tool.fileType);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={tool.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Banner with Scrim & Media Indicator */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden group">
                    <img
                      src={tool.thumbnailUrl}
                      alt={tool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                    {/* Media Type Tag (Unboxed clean tag) */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-[11px] font-semibold text-slate-900 shadow-xs">
                      <BadgeIcon className="w-3.5 h-3.5 text-blue-700" />
                      <span>{badge.label}</span>
                      {tool.duration && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-[10px] text-slate-600">{tool.duration}</span>
                        </>
                      )}
                    </div>

                    {/* Target Product Kicker */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider line-clamp-1">
                        {tool.targetProduct}
                      </p>
                      <p className="text-xs text-slate-200 font-mono mt-0.5">
                        Ukuran: {tool.fileSize}
                      </p>
                    </div>

                    {/* Quick Preview Hover Trigger */}
                    <button
                      onClick={() => setSelectedPreviewTool(tool)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-xs text-white"
                      title="Pratinjau Materi"
                    >
                      <div className="px-3.5 py-2 bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                        <Eye className="w-4 h-4" />
                        <span>Lihat Pratinjau</span>
                      </div>
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                      <span>{tool.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Diperbarui {tool.createdAt}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 font-display line-clamp-2 leading-snug">
                      {tool.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPreviewTool(tool)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </button>

                    <button
                      onClick={() => showToast(`Materi "${tool.title}" berhasil diunduh ke perangkat Anda.`)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </button>
                  </div>

                  {userRole === 'admin' && (
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Hapus Materi Promosi & Pelatihan',
                          message: `Apakah Anda yakin ingin menghapus materi "${tool.title}"?`,
                          detail: `Judul: ${tool.title}\nKategori: ${tool.category}`,
                          confirmText: 'Ya, Hapus Materi',
                          cancelText: 'Batalkan',
                          variant: 'danger',
                        });
                        if (ok) {
                          onDeleteTool(tool.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Hapus Materi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal for PDF, Video, Image */}
      {selectedPreviewTool && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                  {selectedPreviewTool.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display mt-0.5">
                  {selectedPreviewTool.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreviewTool(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Media Canvas Area */}
            <div className="my-4 bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
              {selectedPreviewTool.fileType === 'mp4' ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white mb-3 shadow-lg ring-4 ring-blue-500/30">
                    <Video className="w-7 h-7" />
                  </div>
                  <h4 className="font-semibold text-sm">{selectedPreviewTool.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-md">
                    Memutar streaming materi video presentasi beresolusi HD untuk presentasi calon klien korporat.
                  </p>
                  <div className="w-full max-w-md bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-blue-500 h-full w-2/3" />
                  </div>
                  <div className="flex items-center justify-between w-full max-w-md text-[10px] text-slate-300 font-mono mt-1">
                    <span>02:45</span>
                    <span>{selectedPreviewTool.duration || '04:15'}</span>
                  </div>
                </div>
              ) : selectedPreviewTool.fileType === 'pdf' ? (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-red-600/90 flex items-center justify-center text-white mb-3 shadow-lg">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="font-semibold text-sm">{selectedPreviewTool.title}</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Format Dokumen Resmi PDF (Ukuran: {selectedPreviewTool.fileSize})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 max-w-md">
                    Dokumen siap cetak dan dilengkapi stempel otentikasi NDTAXANDLAW. Anda dapat mendistribusikannya via email atau WhatsApp kepada calon klien.
                  </p>
                </div>
              ) : (
                <img
                  src={selectedPreviewTool.thumbnailUrl}
                  alt={selectedPreviewTool.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Description and Action */}
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedPreviewTool.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Target Layanan: <strong>{selectedPreviewTool.targetProduct}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      showToast(`Tautan salinan materi disalin ke papan klip.`);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Salin Tautan</span>
                  </button>

                  <button
                    onClick={() => {
                      showToast(`Materi "${selectedPreviewTool.title}" berhasil diunduh.`);
                      setSelectedPreviewTool(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh File Lengkap</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Tool Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Unggah Tools Marketing Baru (Admin)
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTool} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Materi / File *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Brosur Pajak Korporasi &amp; SP2DK 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Materi *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    <option value="Brosur Digital">Brosur Digital</option>
                    <option value="Banner Promosi">Banner Promosi</option>
                    <option value="Video Presentasi">Video Presentasi</option>
                    <option value="Panduan Penjualan">Panduan Penjualan</option>
                    <option value="Materi Pelatihan">Materi Pelatihan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe File *
                  </label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    <option value="pdf">PDF (Dokumen / Brosur)</option>
                    <option value="png">PNG (Banner Grafis)</option>
                    <option value="jpg">JPG (Foto Promosi)</option>
                    <option value="mp4">MP4 (Video Presentasi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Ukuran File
                  </label>
                  <input
                    type="text"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Layanan Target
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pajak Penghasilan Badan"
                    value={newTargetProduct}
                    onChange={(e) => setNewTargetProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {newFileType === 'mp4' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durasi Video
                  </label>
                  <input
                    type="text"
                    placeholder="04:20 min"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi &amp; Panduan Penggunaan
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan cara mitra menggunakan file ini untuk memasarkan layanan kepada calon klien."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900 border border-blue-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Notifikasi Otomatis Real-Time:
                </p>
                <p className="mt-0.5 text-blue-800 text-[11px]">
                  Setelah diunggah, sistem secara otomatis akan mengirimkan siaran notifikasi instan ke seluruh portal mitra.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Mengunggah...' : 'Publikasikan ke Mitra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
