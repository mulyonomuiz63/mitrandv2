import React, { useState, useRef } from 'react';
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
  CheckCircle, 
  BookOpen,
  Share2,
  Upload,
  X,
  FileUp
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
  const [newFileSize, setNewFileSize] = useState('');
  const [newDuration, setNewDuration] = useState('03:30 min');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string>('');
  const [originalFileSizeLabel, setOriginalFileSizeLabel] = useState<string>('');
  const [isCompressingFile, setIsCompressingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    { id: 'all', label: 'Semua Materi' },
    { id: 'Brosur Digital', label: 'Brosur Digital (PDF)' },
    { id: 'Banner Promosi', label: 'Banner Promosi (JPG/PNG)' },
    { id: 'Video Presentasi', label: 'Video Presentasi (MP4)' },
    { id: 'Panduan Penjualan', label: 'Panduan Penjualan (Proposal & Compro)' },
    { id: 'Materi Pelatihan', label: 'Materi Pelatihan Eksklusif' },
  ];

  const visibleCategories = categories.filter((cat) =>
    cat.id === 'all' ? tools.length > 0 : tools.some((t) => t.category === cat.id)
  );

  React.useEffect(() => {
    if (selectedCategory !== 'all' && !tools.some((t) => t.category === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [tools, selectedCategory]);

  const getFileAcceptConfig = (type: 'pdf' | 'png' | 'jpg' | 'mp4') => {
    switch (type) {
      case 'pdf':
        return {
          accept: '.pdf,application/pdf',
          label: 'Upload File Dokumen PDF *',
          helper: 'Format .PDF (Brosur, Proposal Penawaran, Company Profile, Panduan). Otomatis dikompresi & disimpan di server hosting.',
        };
      case 'png':
        return {
          accept: '.png,image/png',
          label: 'Upload File Gambar PNG *',
          helper: 'Format .PNG untuk Banner Promosi. File besar otomatis dikompresi ke ukuran kecil & disimpan di server hosting.',
        };
      case 'jpg':
        return {
          accept: '.jpg,.jpeg,image/jpeg',
          label: 'Upload File Gambar JPG / JPEG *',
          helper: 'Format .JPG / .JPEG untuk Poster Promosi. File besar otomatis dikompresi ke ukuran kecil & disimpan di server hosting.',
        };
      case 'mp4':
        return {
          accept: '.mp4,video/mp4',
          label: 'Upload File Video MP4 *',
          helper: 'Format .MP4 untuk Video Presentasi / Pelatihan. Disimpan langsung di server hosting.',
        };
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const compressImageDataUrl = (rawDataUrl: string, targetType: 'png' | 'jpg', rawByteSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        if (targetType === 'jpg' || rawByteSize > 450 * 1024) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.85);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = newFileType === 'mp4' ? 35 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `Ukuran file terlalu besar (${formatBytes(file.size)}). Maksimal ${
          newFileType === 'mp4' ? '35 MB' : '25 MB'
        }.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const origSizeFormatted = formatBytes(file.size);
    setUploadedFileName(file.name);
    setOriginalFileSizeLabel(origSizeFormatted);
    setNewFileSize(origSizeFormatted);
    setIsCompressingFile(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) {
          setUploadError('Gagal membaca file. Silakan coba pilih ulang file Anda.');
          setIsCompressingFile(false);
          return;
        }

        // Compress large images on client before sending to hosting server
        if (newFileType === 'png' || newFileType === 'jpg') {
          dataUrl = await compressImageDataUrl(dataUrl, newFileType, file.size);
        }

        // Upload compressed payload to hosting server so it is stored as a static file in /uploads/marketing-tools/
        const res = await fetch('/api/marketing-tools/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
            fileType: newFileType,
            originalByteSize: file.size,
          }),
        });
        const json = await res.json();
        if (res.ok && json?.success && json?.data?.hostedUrl) {
          setUploadedFileDataUrl(json.data.hostedUrl);
          setNewFileSize(json.data.formattedSize || origSizeFormatted);
          if (newFileType === 'png' || newFileType === 'jpg') {
            setUploadedThumbnailUrl(json.data.hostedUrl);
          }
        } else {
          // Fallback to dataUrl if server upload endpoint didn't respond
          setUploadedFileDataUrl(dataUrl);
          if (newFileType === 'png' || newFileType === 'jpg') {
            setUploadedThumbnailUrl(dataUrl);
          }
        }
      } catch (err) {
        console.error('File compression/upload error:', err);
        const fallback = typeof reader.result === 'string' ? reader.result : '';
        setUploadedFileDataUrl(fallback);
        if (newFileType === 'png' || newFileType === 'jpg') {
          setUploadedThumbnailUrl(fallback);
        }
      } finally {
        setIsCompressingFile(false);
      }
    };
    reader.onerror = () => {
      setIsCompressingFile(false);
      setUploadError('Gagal membaca file. Silakan coba pilih ulang file Anda.');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadTool = (tool: MarketingTool) => {
    if (
      tool.downloadUrl &&
      (tool.downloadUrl.startsWith('data:') ||
        tool.downloadUrl.startsWith('http') ||
        tool.downloadUrl.startsWith('/'))
    ) {
      const link = document.createElement('a');
      link.href = tool.downloadUrl;
      const safeName = tool.title
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      link.download = `${safeName || 'Materi-NDTAXANDLAW'}.${tool.fileType === 'stream' ? 'mp4' : tool.fileType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    showToast(`Materi "${tool.title}" berhasil diunduh ke perangkat Anda.`);
  };

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
    setUploadError(null);
    if (!newTitle.trim()) return;
    if (isCompressingFile) {
      setUploadError('Mohon tunggu proses kompresi & penyimpanan file ke server selesai.');
      return;
    }
    if (!uploadedFileDataUrl) {
      setUploadError(`Silakan pilih / upload file ${newFileType.toUpperCase()} terlebih dahulu.`);
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Unggah Materi Promosi Baru',
      message: `Apakah Anda yakin ingin mengunggah materi "${newTitle.trim()}" dan menyiarkan notifikasinya ke seluruh Mitra?`,
      detail: `Judul Materi: ${newTitle.trim()}\nKategori: ${newCategory}\nFile Diunggah: ${uploadedFileName || newFileType.toUpperCase()} (${newFileSize || '-'})`,
      confirmText: 'Ya, Unggah Materi',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;
    setIsSubmitting(true);

    try {
      await onAddTool({
        title: newTitle.trim(),
        category: newCategory,
        fileType: newFileType,
        fileSize: newFileSize || '2.5 MB',
        targetProduct: newTargetProduct || 'Layanan Konsultasi NDTAXANDLAW',
        description: newDescription || 'Materi resmi pendukung penjualan mitra.',
        duration: newFileType === 'mp4' ? newDuration : undefined,
        downloadUrl: uploadedFileDataUrl,
        thumbnailUrl:
          newFileType === 'png' || newFileType === 'jpg'
            ? uploadedThumbnailUrl || uploadedFileDataUrl
            : '',
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewTargetProduct('');
      setNewFileSize('');
      setOriginalFileSizeLabel('');
      setUploadedFileDataUrl('');
      setUploadedFileName('');
      setUploadedThumbnailUrl('');
      showToast('Tools Marketing berhasil dikompresi, disimpan di server & dipublikasikan ke mitra!');
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

  const currentFileAccept = getFileAcceptConfig(newFileType);

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-bold border-2 border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-5 h-5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Tools Marketing &amp; Materi Pelatihan
          </h1>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => {
              setUploadError(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
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
              placeholder="Cari brosur, proposal penawaran, company profile, video pitching, atau panduan closing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap self-end sm:self-center">
            Menampilkan <strong>{filteredTools.length}</strong> materi
          </div>
        </div>

        {/* Clean Segmented Filter Buttons - Only shown when data is uploaded for that category */}
        {visibleCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
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
            const isValidMediaUrl = (url?: string) =>
              Boolean(
                url &&
                  (url.startsWith('/uploads/') ||
                    url.startsWith('data:') ||
                    url.startsWith('http'))
              );
            const imageSource =
              isValidMediaUrl(tool.downloadUrl) &&
              (tool.fileType === 'png' || tool.fileType === 'jpg')
                ? tool.downloadUrl
                : tool.thumbnailUrl;
            const hasVideoSource =
              (tool.fileType === 'mp4' || tool.fileType === 'stream') &&
              isValidMediaUrl(tool.downloadUrl);

            return (
              <div
                key={tool.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Banner with Scrim & Media Indicator */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden group">
                    {tool.fileType === 'pdf' ? (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0F2547] to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shadow-lg border-2 border-red-400/50 group-hover:scale-105 transition-transform duration-300 mb-2">
                          <FileText className="w-8 h-8" />
                          <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
                            PDF
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-300">
                          Dokumen PDF Resmi
                        </span>
                      </div>
                    ) : hasVideoSource ? (
                      <video
                        src={`${tool.downloadUrl}#t=0.5`}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover bg-slate-950 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : tool.fileType === 'mp4' || tool.fileType === 'stream' ? (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-emerald-400/50 group-hover:scale-105 transition-transform duration-300 mb-2">
                          <Video className="w-8 h-8" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-300">
                          Video Presentasi MP4
                        </span>
                      </div>
                    ) : (
                      <img
                        src={imageSource}
                        alt={tool.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent pointer-events-none" />

                    {/* Media Type Tag */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-[11px] font-semibold text-slate-900 shadow-xs">
                      <BadgeIcon
                        className={`w-3.5 h-3.5 ${
                          tool.fileType === 'pdf'
                            ? 'text-red-600'
                            : tool.fileType === 'mp4' || tool.fileType === 'stream'
                            ? 'text-emerald-600'
                            : 'text-blue-700'
                        }`}
                      />
                      <span>{badge.label}</span>
                      {tool.duration && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-[10px] text-slate-600">{tool.duration}</span>
                        </>
                      )}
                    </div>

                    {/* Target Product Kicker */}
                    <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
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
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-xs text-white cursor-pointer"
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
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </button>

                    <button
                      onClick={() => handleDownloadTool(tool)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
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
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Media Canvas Area */}
            <div className="my-4 bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
              {selectedPreviewTool.fileType === 'mp4' ? (
                selectedPreviewTool.downloadUrl?.startsWith('data:video') ||
                selectedPreviewTool.downloadUrl?.startsWith('/uploads/') ||
                selectedPreviewTool.downloadUrl?.startsWith('http') ? (
                  <video
                    src={selectedPreviewTool.downloadUrl}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
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
                )
              ) : selectedPreviewTool.fileType === 'pdf' ? (
                selectedPreviewTool.downloadUrl?.startsWith('data:application/pdf') ||
                selectedPreviewTool.downloadUrl?.startsWith('/uploads/') ||
                selectedPreviewTool.downloadUrl?.startsWith('http') ? (
                  <iframe
                    src={selectedPreviewTool.downloadUrl}
                    title={selectedPreviewTool.title}
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
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
                )
              ) : (
                <img
                  src={
                    selectedPreviewTool.downloadUrl?.startsWith('data:image') ||
                    selectedPreviewTool.downloadUrl?.startsWith('/uploads/')
                      ? selectedPreviewTool.downloadUrl
                      : selectedPreviewTool.thumbnailUrl
                  }
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

              <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleDownloadTool(selectedPreviewTool);
                      setSelectedPreviewTool(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                Unggah Tools Marketing Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
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
                  placeholder="Contoh: Proposal Penawaran & Company Profile NDTAXANDLAW 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Materi *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MarketingTool['category'])}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="Brosur Digital">Brosur Digital</option>
                    <option value="Banner Promosi">Banner Promosi</option>
                    <option value="Video Presentasi">Video Presentasi</option>
                    <option value="Panduan Penjualan">
                      Panduan Penjualan (Proposal Penawaran &amp; Company Profile)
                    </option>
                    <option value="Materi Pelatihan">Materi Pelatihan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe File *
                  </label>
                  <select
                    value={newFileType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'pdf' | 'png' | 'jpg' | 'mp4';
                      setNewFileType(nextType);
                      setUploadedFileDataUrl('');
                      setUploadedFileName('');
                      setUploadedThumbnailUrl('');
                      setNewFileSize('');
                      setUploadError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  >
                    <option value="pdf">PDF (Dokumen / Brosur / Proposal / Compro)</option>
                    <option value="png">PNG (Banner Grafis)</option>
                    <option value="jpg">JPG (Foto Promosi)</option>
                    <option value="mp4">MP4 (Video Presentasi)</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 -mt-2">
                💡 <em>Proposal Penawaran</em> dan <em>Company Profile</em> masuk ke dalam kategori <strong>Panduan Penjualan</strong>.
              </p>

              {/* Tempat Upload File sesuai Tipe File yang dipilih */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    {currentFileAccept.label}
                  </label>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold uppercase">
                    .{newFileType}
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={currentFileAccept.accept}
                  onChange={handleFileChange}
                  className="hidden"
                  id="marketing-tool-file-input"
                />

                {isCompressingFile ? (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-2.5 text-xs font-semibold text-blue-800">
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Mengompresi ukuran file &amp; menyimpan ke server hosting...</span>
                  </div>
                ) : !uploadedFileDataUrl ? (
                  <label
                    htmlFor="marketing-tool-file-input"
                    className="flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-xl bg-white hover:bg-blue-50/40 cursor-pointer transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-blue-800">
                      Klik untuk Memilih File {newFileType.toUpperCase()} dari Perangkat
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {currentFileAccept.helper}
                    </span>
                  </label>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {uploadedFileName}
                        </p>
                        <p className="text-[11px] font-mono text-emerald-700">
                          Tipe: {newFileType.toUpperCase()} &bull; Ukuran Akhir: {newFileSize}
                          {originalFileSizeLabel && originalFileSizeLabel !== newFileSize
                            ? ` (Dikompresi dari ${originalFileSizeLabel})`
                            : ''}
                        </p>
                        {uploadedFileDataUrl.startsWith('/uploads/') && (
                          <p className="text-[10px] font-mono text-emerald-800 truncate mt-0.5">
                            Tersimpan di Server: {uploadedFileDataUrl}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label
                        htmlFor="marketing-tool-file-input"
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
                      >
                        Ganti File
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileDataUrl('');
                          setUploadedFileName('');
                          setUploadedThumbnailUrl('');
                          setNewFileSize('');
                          setOriginalFileSizeLabel('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Hapus file terpilih"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs font-semibold text-red-600">{uploadError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ukuran File (Otomatis / Edit)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 4.2 MB"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Layanan Target
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jasa Perpajakan & Hukum"
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
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
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

