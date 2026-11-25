import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Download,
  Trash2,
  Building2,
  MapPin,
  Users,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  Lock,
  UserCheck,
  Pencil,
  FileEdit,
  RotateCcw,
  Mail,
} from 'lucide-react';
import {
  AuthUser,
  DEFAULT_PROSPECT_LETTER_CONTENT,
  Mitra,
  ProspectAddressParts,
  ProspectLetter,
  ProspectLetterContent,
  ProspectMitraSummaryRow,
  resolveProspectLetterContent,
} from '../types';
import { ProspectsSubTab } from '../utils/navigationHistory';
import {
  INDONESIAN_PROVINCES,
  assembleStructuredAddress,
  formatIndonesianLetterDate,
} from '../utils/prospectLetterPdf';
import {
  ServerDataTableFooter,
  ServerDataTableMeta,
  ServerDataTableTopBar,
  TableSkeletonRows,
} from './ServerDataTableControls';
import { ProspectLetterPreviewModal } from './ProspectLetterPreviewModal';
import { ProspectEnvelopeModal } from './ProspectEnvelopeModal';
import { ProspectLetterContentEditor } from './ProspectLetterContentEditor';
import { downloadProspectLetterPdfFromView } from './ProspectLetterDocument';
import { useConfirm } from './ConfirmDialogModal';
import { resolveAvatarUrl } from '../avatars';

interface ProspectsHubProps {
  userRole: 'admin' | 'mitra';
  currentUser: AuthUser | null;
  activeMitra: Mitra;
  allMitras: Mitra[];
  logoUrl?: string;
  initialLetterTemplate?: Partial<ProspectLetterContent>;
  activeSubTab?: ProspectsSubTab;
  onSubTabChange?: (sub: ProspectsSubTab) => void;
  onOpenLetterVerify?: (verificationCode: string) => void;
  onOpenMitraVerify?: (memberCode: string) => void;
}

const EMPTY_META: ServerDataTableMeta = {
  page: 1,
  perPage: 10,
  totalItems: 0,
  totalPages: 1,
  totalAll: 0,
};

const EMPTY_ADDRESS: ProspectAddressParts = {
  street: '',
  village: '',
  district: '',
  cityType: 'Kota',
  city: '',
  province: '',
  postalCode: '',
};

const MAX_COMPANY_NAME_LEN = 90;
const MAX_ADDRESS_COMBINED_LEN = 220;

function extractAddressPartsFromLetter(letter: ProspectLetter): ProspectAddressParts {
  if (letter.addressParts && typeof letter.addressParts === 'object') {
    return {
      street: letter.addressParts.street || '',
      village: letter.addressParts.village || '',
      district: letter.addressParts.district || '',
      cityType: letter.addressParts.cityType === 'Kab.' ? 'Kab.' : 'Kota',
      city: letter.addressParts.city || '',
      province: letter.addressParts.province || 'DKI Jakarta',
      postalCode: letter.addressParts.postalCode || '',
    };
  }
  return {
    ...EMPTY_ADDRESS,
    street: (letter.companyAddress || '').slice(0, 75),
  };
}

export const ProspectsHub: React.FC<ProspectsHubProps> = ({
  userRole,
  currentUser,
  activeMitra,
  allMitras,
  logoUrl,
  initialLetterTemplate,
  activeSubTab = 'mitra_summary',
  onSubTabChange,
  onOpenLetterVerify,
  onOpenMitraVerify,
}) => {
  const confirm = useConfirm();
  const isStaff = userRole === 'admin' && currentUser?.roleCode === 'staff';
  const isAdminOrStaff = userRole === 'admin';

  // Local sub-tab fallback if parent doesn't control it
  const [localSubTab, setLocalSubTab] = useState<ProspectsSubTab>(activeSubTab);
  const currentSubTab = onSubTabChange ? activeSubTab : localSubTab;
  const setSubTab = (next: ProspectsSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(next);
    } else {
      setLocalSubTab(next);
    }
  };

  // Global refresh trigger shared across server tables
  const [refreshTick, setRefreshTick] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Global letter content template (synced from /api/prospects/template for all roles)
  const [masterTemplate, setMasterTemplate] = useState<ProspectLetterContent>(() =>
    resolveProspectLetterContent(undefined, initialLetterTemplate)
  );

  const fetchLatestMasterTemplate = useCallback(async (): Promise<ProspectLetterContent> => {
    try {
      const res = await fetch('/api/prospects/template', {
        headers: { 'x-skip-crud-alert': 'true' },
      });
      const json = await res.json();
      if (res.ok && json?.success && json?.data) {
        const resolved = resolveProspectLetterContent(undefined, json.data);
        setMasterTemplate(resolved);
        return resolved;
      }
    } catch {
      // Fall back to current in-memory template
    }
    return masterTemplate;
  }, [masterTemplate]);

  useEffect(() => {
    let active = true;
    fetch('/api/prospects/template', { headers: { 'x-skip-crud-alert': 'true' } })
      .then((r) => r.json())
      .then((json) => {
        if (!active || !json?.success || !json?.data) return;
        setMasterTemplate(resolveProspectLetterContent(undefined, json.data));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshTick]);

  // Preview, Envelope & PDF download state
  const [previewLetter, setPreviewLetter] = useState<ProspectLetter | null>(null);
  const [envelopeLetter, setEnvelopeLetter] = useState<ProspectLetter | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // =========================================================================
  // 1. SERVER-SIDE DATATABLE: LETTERS (Mitra own letters OR Admin All Letters)
  // =========================================================================
  const [lettersRows, setLettersRows] = useState<ProspectLetter[]>([]);
  const [lettersMeta, setLettersMeta] = useState<ServerDataTableMeta>(EMPTY_META);
  const [lettersPage, setLettersPage] = useState(1);
  const [lettersPerPage, setLettersPerPage] = useState(10);
  const [lettersSearch, setLettersSearch] = useState('');
  const [debouncedLettersSearch, setDebouncedLettersSearch] = useState('');
  const [lettersMitraFilter, setLettersMitraFilter] = useState<string>('all');
  const [lettersLoading, setLettersLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedLettersSearch(lettersSearch.trim()), 260);
    return () => window.clearTimeout(t);
  }, [lettersSearch]);

  useEffect(() => {
    setLettersPage(1);
  }, [debouncedLettersSearch, lettersPerPage, lettersMitraFilter]);

  const fetchLettersTable = useCallback(async () => {
    if (isAdminOrStaff && currentSubTab !== 'all_letters') return;
    if (!isAdminOrStaff && (!activeMitra?.id || activeMitra.id === 'mitra-empty')) return;

    setLettersLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(lettersPage));
      qs.set('perPage', String(lettersPerPage));
      if (debouncedLettersSearch) qs.set('search', debouncedLettersSearch);
      if (!isAdminOrStaff) {
        qs.set('mitraId', activeMitra.id);
      } else if (lettersMitraFilter && lettersMitraFilter !== 'all') {
        qs.set('mitraId', lettersMitraFilter);
      }

      const res = await fetch(`/api/datatables/prospects?${qs.toString()}`, {
        headers: { 'x-skip-crud-alert': 'true' },
      });
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data) && json.meta) {
        setLettersRows(json.data);
        setLettersMeta(json.meta);
      }
    } catch (err) {
      console.error('Failed to fetch prospects table:', err);
    } finally {
      setLettersLoading(false);
    }
  }, [
    isAdminOrStaff,
    currentSubTab,
    activeMitra?.id,
    lettersPage,
    lettersPerPage,
    debouncedLettersSearch,
    lettersMitraFilter,
  ]);

  useEffect(() => {
    fetchLettersTable();
  }, [fetchLettersTable, refreshTick]);

  // =========================================================================
  // 2. SERVER-SIDE DATATABLE: ADMIN PER-MITRA SUMMARY
  // =========================================================================
  const [summaryRows, setSummaryRows] = useState<ProspectMitraSummaryRow[]>([]);
  const [summaryMeta, setSummaryMeta] = useState<ServerDataTableMeta>(EMPTY_META);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPerPage, setSummaryPerPage] = useState(10);
  const [summarySearch, setSummarySearch] = useState('');
  const [debouncedSummarySearch, setDebouncedSummarySearch] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<'all' | 'has_letters' | 'no_letters'>('all');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [statsOverview, setStatsOverview] = useState<{ totalLetters: number; thisMonth: number; activeMitras: number }>({
    totalLetters: 0,
    thisMonth: 0,
    activeMitras: 0,
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSummarySearch(summarySearch.trim()), 260);
    return () => window.clearTimeout(t);
  }, [summarySearch]);

  useEffect(() => {
    setSummaryPage(1);
  }, [debouncedSummarySearch, summaryPerPage, summaryStatusFilter]);

  const fetchSummaryTable = useCallback(async () => {
    if (!isAdminOrStaff || currentSubTab !== 'mitra_summary') return;
    setSummaryLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(summaryPage));
      qs.set('perPage', String(summaryPerPage));
      if (debouncedSummarySearch) qs.set('search', debouncedSummarySearch);
      if (summaryStatusFilter !== 'all') qs.set('status', summaryStatusFilter);

      const res = await fetch(`/api/datatables/prospects-summary?${qs.toString()}`, {
        headers: { 'x-skip-crud-alert': 'true' },
      });
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data) && json.meta) {
        setSummaryRows(json.data);
        setSummaryMeta(json.meta);
      }
    } catch (err) {
      console.error('Failed to fetch prospects summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [isAdminOrStaff, currentSubTab, summaryPage, summaryPerPage, debouncedSummarySearch, summaryStatusFilter]);

  useEffect(() => {
    fetchSummaryTable();
  }, [fetchSummaryTable, refreshTick]);

  // Lightweight overview KPI fetch
  useEffect(() => {
    let active = true;
    const qs = !isAdminOrStaff && activeMitra?.id ? `?mitraId=${encodeURIComponent(activeMitra.id)}` : '';
    fetch(`/api/prospects${qs}`, { headers: { 'x-skip-crud-alert': 'true' } })
      .then((r) => r.json())
      .then((json) => {
        if (!active || !json?.success || !Array.isArray(json.data)) return;
        const list: ProspectLetter[] = json.data;
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisMonth = list.filter((l) => (l.letterDate || l.createdAt || '').startsWith(ym)).length;
        const uniqueMitras = new Set(list.map((l) => l.mitraId)).size;
        setStatsOverview({
          totalLetters: list.length,
          thisMonth,
          activeMitras: uniqueMitras,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdminOrStaff, activeMitra?.id, refreshTick]);

  // =========================================================================
  // 3. ADMIN/STAF MITRA DETAIL DRILL-DOWN MODAL (Server-Side Paginated)
  // =========================================================================
  const [detailMitra, setDetailMitra] = useState<ProspectMitraSummaryRow | null>(null);
  const [detailRows, setDetailRows] = useState<ProspectLetter[]>([]);
  const [detailMeta, setDetailMeta] = useState<ServerDataTableMeta>(EMPTY_META);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPerPage, setDetailPerPage] = useState(10);
  const [detailSearch, setDetailSearch] = useState('');
  const [debouncedDetailSearch, setDebouncedDetailSearch] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedDetailSearch(detailSearch.trim()), 260);
    return () => window.clearTimeout(t);
  }, [detailSearch]);

  useEffect(() => {
    setDetailPage(1);
  }, [debouncedDetailSearch, detailPerPage, detailMitra?.mitraId]);

  const fetchDetailTable = useCallback(async () => {
    if (!detailMitra) return;
    setDetailLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(detailPage));
      qs.set('perPage', String(detailPerPage));
      qs.set('mitraId', detailMitra.mitraId);
      if (debouncedDetailSearch) qs.set('search', debouncedDetailSearch);

      const res = await fetch(`/api/datatables/prospects?${qs.toString()}`, {
        headers: { 'x-skip-crud-alert': 'true' },
      });
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data) && json.meta) {
        setDetailRows(json.data);
        setDetailMeta(json.meta);
      }
    } catch (err) {
      console.error('Failed to fetch Mitra prospect detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [detailMitra, detailPage, detailPerPage, debouncedDetailSearch]);

  useEffect(() => {
    fetchDetailTable();
  }, [fetchDetailTable, refreshTick]);

  // =========================================================================
  // 4. CREATE / EDIT OFFER LETTER MODAL STATE
  // =========================================================================
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<ProspectLetter | null>(null);
  const [targetMitraId, setTargetMitraId] = useState<string>('');
  const [mitraPickerQuery, setMitraPickerQuery] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressParts, setAddressParts] = useState<ProspectAddressParts>(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // =========================================================================
  // 5. ADMIN/STAF GLOBAL TEMPLATE EDITOR MODAL STATE
  // =========================================================================
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<ProspectLetterContent>(DEFAULT_PROSPECT_LETTER_CONTENT);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const selectableMitras = useMemo(() => {
    const sorted = [...allMitras].sort((a, b) => {
      if (a.status === 'verified' && b.status !== 'verified') return -1;
      if (b.status === 'verified' && a.status !== 'verified') return 1;
      return a.fullName.localeCompare(b.fullName);
    });
    if (!mitraPickerQuery.trim()) return sorted;
    const q = mitraPickerQuery.toLowerCase().trim();
    return sorted.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [allMitras, mitraPickerQuery]);

  const openCreateModal = (preselectedMitraId?: string) => {
    setEditingLetter(null);
    setFormError('');
    setCompanyName('');
    setAddressParts({ ...EMPTY_ADDRESS });
    setMitraPickerQuery('');
    if (isAdminOrStaff) {
      const preferred =
        preselectedMitraId ||
        allMitras.find((m) => m.status === 'verified')?.id ||
        allMitras[0]?.id ||
        '';
      setTargetMitraId(preferred);
    } else {
      setTargetMitraId(activeMitra.id);
    }
    setIsFormOpen(true);
  };

  const openEditModal = (letter: ProspectLetter) => {
    setEditingLetter(letter);
    setFormError('');
    setCompanyName(letter.companyName || '');
    setAddressParts(extractAddressPartsFromLetter(letter));
    setMitraPickerQuery('');
    setTargetMitraId(letter.mitraId || activeMitra.id);
    setIsFormOpen(true);
  };

  const openTemplateModal = async () => {
    setTemplateError('');
    const latest = await fetchLatestMasterTemplate();
    setTemplateDraft(resolveProspectLetterContent(undefined, latest));
    setIsTemplateOpen(true);
  };

  const openPreviewLetter = (letter: ProspectLetter) => {
    setPreviewLetter(letter);
    void fetchLatestMasterTemplate();
  };

  const formattedAddressPreview = useMemo(
    () => assembleStructuredAddress(addressParts),
    [addressParts]
  );

  const isAddressOverLimit = formattedAddressPreview.length > MAX_ADDRESS_COMBINED_LEN;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedCompany = companyName.replace(/\s+/g, ' ').trim();
    if (trimmedCompany.length < 2) {
      setFormError('Nama perusahaan wajib diisi (minimal 2 karakter).');
      return;
    }
    if (trimmedCompany.length > MAX_COMPANY_NAME_LEN) {
      setFormError(`Nama perusahaan maksimal ${MAX_COMPANY_NAME_LEN} karakter.`);
      return;
    }
    if (!addressParts.street.trim() || !addressParts.village.trim() || !addressParts.district.trim() || !addressParts.city.trim() || !addressParts.province.trim()) {
      setFormError('Lengkapi seluruh kolom alamat berurutan.');
      return;
    }
    if (isAddressOverLimit) {
      setFormError(`Total alamat terlalu panjang (${formattedAddressPreview.length}/${MAX_ADDRESS_COMBINED_LEN} karakter).`);
      return;
    }

    const chosenMitraId = isAdminOrStaff ? targetMitraId : activeMitra.id;
    if (!chosenMitraId) {
      setFormError('Pilih Mitra tujuan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingLetter);
      const url = isEdit ? `/api/prospects/${encodeURIComponent(editingLetter!.id)}` : '/api/prospects';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        companyName: trimmedCompany,
        addressParts,
        mitraId: chosenMitraId,
        actorRole: isAdminOrStaff ? (isStaff ? 'staff' : 'admin') : 'mitra',
        actorName: isAdminOrStaff ? currentUser?.name || 'Admin Operasional' : activeMitra.fullName,
        actorId: isAdminOrStaff ? currentUser?.id : activeMitra.id,
        actorEmail: isAdminOrStaff ? currentUser?.email : activeMitra.email,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        setFormError(json?.message || (isEdit ? 'Gagal memperbarui surat.' : 'Gagal membuat surat.'));
        return;
      }

      const savedLetter: ProspectLetter = json.data;
      setIsFormOpen(false);
      setEditingLetter(null);
      triggerRefresh();
      openPreviewLetter(savedLetter);
    } catch {
      setFormError('Terjadi kendala jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async (resetToDefault = false) => {
    setTemplateError('');
    setTemplateSaving(true);
    try {
      const res = await fetch('/api/prospects/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: resetToDefault ? undefined : templateDraft,
          resetToDefault,
          actorRole: isStaff ? 'staff' : 'admin',
          actorId: currentUser?.id,
          actorName: currentUser?.name || (isStaff ? 'Staf Operasional' : 'Admin Operasional'),
          actorEmail: currentUser?.email,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        setTemplateError(json?.message || 'Gagal menyimpan template.');
        return;
      }
      setMasterTemplate(resolveProspectLetterContent(json.data));
      setTemplateDraft(resolveProspectLetterContent(json.data));
      if (!resetToDefault) {
        setIsTemplateOpen(false);
      }
      triggerRefresh();
    } catch {
      setTemplateError('Terjadi kendala jaringan.');
    } finally {
      setTemplateSaving(false);
    }
  };

  // =========================================================================
  // 6. ACTIONS: DIRECT PDF DOWNLOAD & DELETE
  // =========================================================================
  const handleQuickDownloadPdf = async (letter: ProspectLetter) => {
    setDownloadingId(letter.id);
    try {
      const latestTemplate = await fetchLatestMasterTemplate();
      await downloadProspectLetterPdfFromView(letter, logoUrl, latestTemplate);
    } catch (err) {
      console.error('Download PDF failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteLetter = async (letter: ProspectLetter) => {
    const ok = await confirm({
      title: 'Hapus Surat Penawaran?',
      message: `Surat penawaran untuk ${letter.companyName} (${letter.letterNumber}) akan dihapus dari daftar prospek.`,
      detail: `Mitra: ${letter.mitraName} (${letter.mitraMemberCode})\nAlamat: ${letter.companyAddress}`,
      confirmText: 'Ya, Hapus Surat',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingId(letter.id);
    try {
      const res = await fetch(`/api/prospects/${encodeURIComponent(letter.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: isAdminOrStaff ? (isStaff ? 'staff' : 'admin') : 'mitra',
          actorName: isAdminOrStaff ? currentUser?.name || 'Admin Operasional' : activeMitra.fullName,
          actorId: isAdminOrStaff ? currentUser?.id : activeMitra.id,
        }),
      });
      if (res.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error('Delete prospect letter failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const mitraVerified = isAdminOrStaff || activeMitra.status === 'verified';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display tracking-tight">
            {isAdminOrStaff ? 'Manajemen Surat Prospek Mitra' : 'Prospek & Surat Penawaran'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdminOrStaff && (
            <button
              type="button"
              onClick={openTemplateModal}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            >
              <FileEdit className="w-4 h-4 text-[#092147] shrink-0" />
              <span>Edit Isi Surat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openCreateModal()}
            disabled={!mitraVerified}
            title={
              !mitraVerified
                ? 'Akun Anda sedang menunggu verifikasi Admin.'
                : undefined
            }
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all shrink-0 shadow-xs cursor-pointer ${
              mitraVerified
                ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 hover:brightness-110'
                : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
            }`}
          >
            {mitraVerified ? <Plus className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
            <span>{isAdminOrStaff ? 'Buat Surat untuk Mitra' : 'Buat Surat Penawaran'}</span>
          </button>
        </div>
      </div>

      {/* Unverified Mitra Notice */}
      {!mitraVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pembuatan Surat Menunggu Verifikasi Akun</p>
            <p className="text-amber-800 mt-0.5">
              Setelah akun disetujui Admin, Anda dapat langsung membuat surat penawaran resmi.
            </p>
          </div>
        </div>
      )}

      {/* Clean KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {isAdminOrStaff ? 'Total Surat Diterbitkan' : 'Total Surat Saya'}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums mt-1">
            {statsOverview.totalLetters}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Dibuat Bulan Ini
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#092147] tabular-nums mt-1">
            {statsOverview.thisMonth}
          </p>
        </div>

        {isAdminOrStaff ? (
          <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Mitra Aktif Prospek
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {statsOverview.activeMitras}
              <span className="text-sm font-semibold text-slate-400 ml-1">/ {allMitras.length}</span>
            </p>
          </div>
        ) : (
          <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Identitas Penandatangan
            </p>
            <p className="text-sm font-bold text-slate-900 truncate mt-1.5">
              {activeMitra.fullName}
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {activeMitra.memberCode}
            </p>
          </div>
        )}
      </div>

      {/* Admin/Staf Sub-Tabs */}
      {isAdminOrStaff && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setSubTab('mitra_summary')}
            className={`px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer ${
              currentSubTab === 'mitra_summary'
                ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Rekap Per Mitra</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('all_letters')}
            className={`px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer ${
              currentSubTab === 'all_letters'
                ? 'bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-amber-300 border border-amber-400/40 shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Semua Surat Prospek</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW A: ADMIN/STAF PER-MITRA SUMMARY (SERVER-SIDE DATATABLE)      */}
      {/* ================================================================= */}
      {isAdminOrStaff && currentSubTab === 'mitra_summary' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <ServerDataTableTopBar
            perPage={summaryPerPage}
            onPerPageChange={setSummaryPerPage}
            search={summarySearch}
            onSearchChange={setSummarySearch}
            searchPlaceholder="Cari mitra..."
            isLoading={summaryLoading}
            onRefresh={fetchSummaryTable}
            unitLabel="mitra"
            rightSlot={
              <select
                value={summaryStatusFilter}
                onChange={(e) => setSummaryStatusFilter(e.target.value as 'all' | 'has_letters' | 'no_letters')}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="all">Semua Mitra</option>
                <option value="has_letters">Sudah Buat Surat</option>
                <option value="no_letters">Belum Ada Surat</option>
              </select>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Mitra Strategis</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Jumlah Surat</th>
                  <th className="py-3 px-4">Perusahaan Prospek Terbaru</th>
                  <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {summaryLoading && summaryRows.length === 0 ? (
                  <TableSkeletonRows rows={5} columns={4} />
                ) : summaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-6 text-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Tidak ada data mitra.</p>
                    </td>
                  </tr>
                ) : (
                  summaryRows.map((row) => (
                    <tr key={row.mitraId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <img
                            src={resolveAvatarUrl(row.avatarUrl, row.gender, row.mitraName)}
                            alt={row.mitraName}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{row.mitraName}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              {row.memberCode} · {row.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-base font-extrabold tabular-nums ${
                            row.totalLetters > 0 ? 'text-[#092147]' : 'text-slate-400'
                          }`}
                        >
                          {row.totalLetters}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1">surat</span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[220px]">
                        {row.totalLetters > 0 ? (
                          <div>
                            <p className="font-semibold text-slate-800 truncate max-w-xs">
                              {row.latestCompanyName}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formatIndonesianLetterDate(row.latestLetterDate || undefined)}
                              {row.recentCompanies.length > 1 && (
                                <span className="text-slate-400">
                                  {' '}
                                  · +{row.totalLetters - 1} lainnya
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailSearch('');
                              setDetailPage(1);
                              setDetailMitra(row);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Lihat Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openCreateModal(row.mitraId)}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-[#092147] hover:bg-[#113872] border border-amber-400/30 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buat Surat</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <ServerDataTableFooter
            page={summaryMeta.page}
            perPage={summaryPerPage}
            totalItems={summaryMeta.totalItems}
            totalPages={summaryMeta.totalPages}
            onPageChange={setSummaryPage}
            unitLabel="mitra"
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW B: MITRA LETTERS OR ADMIN ALL LETTERS (SERVER-SIDE DATATABLE)*/}
      {/* ================================================================= */}
      {(!isAdminOrStaff || currentSubTab === 'all_letters') && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <ServerDataTableTopBar
            perPage={lettersPerPage}
            onPerPageChange={setLettersPerPage}
            search={lettersSearch}
            onSearchChange={setLettersSearch}
            searchPlaceholder="Cari surat..."
            isLoading={lettersLoading}
            onRefresh={fetchLettersTable}
            unitLabel="surat"
            rightSlot={
              isAdminOrStaff ? (
                <select
                  value={lettersMitraFilter}
                  onChange={(e) => setLettersMitraFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-700 max-w-[220px] focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="all">Semua Mitra</option>
                  {allMitras.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberCode})
                    </option>
                  ))}
                </select>
              ) : undefined
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6 whitespace-nowrap">Nomor &amp; Tanggal</th>
                  <th className="py-3 px-4">Perusahaan Prospek &amp; Alamat</th>
                  {isAdminOrStaff && <th className="py-3 px-4 whitespace-nowrap">Mitra Strategis</th>}
                  <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lettersLoading && lettersRows.length === 0 ? (
                  <TableSkeletonRows rows={5} columns={isAdminOrStaff ? 4 : 3} />
                ) : lettersRows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrStaff ? 4 : 3} className="py-12 px-6 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Belum ada surat penawaran.</p>
                    </td>
                  </tr>
                ) : (
                  lettersRows.map((letter) => (
                    <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap align-top">
                        <p className="font-mono font-bold text-slate-900">{letter.letterNumber}</p>
                        <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          {formatIndonesianLetterDate(letter.letterDate || letter.createdAt)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Oleh:{' '}
                          {letter.createdByRole === 'admin'
                            ? 'Admin'
                            : letter.createdByRole === 'staff'
                            ? 'Staf'
                            : 'Mitra'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 align-top min-w-[240px] max-w-md">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#092147] shrink-0" />
                          <span className="break-words">{letter.companyName}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words">{letter.companyAddress}</span>
                        </p>
                      </td>

                      {isAdminOrStaff && (
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{letter.mitraName}</p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {letter.mitraMemberCode}
                          </p>
                        </td>
                      )}

                      <td className="py-3.5 px-4 sm:px-6 text-right align-top whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPreviewLetter(letter)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-[#092147] bg-blue-50 hover:bg-blue-100 border border-blue-200/70 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(letter)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickDownloadPdf(letter)}
                            disabled={downloadingId === letter.id}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-[#092147] hover:bg-[#113872] border border-amber-400/30 rounded-lg inline-flex items-center gap-1 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {downloadingId === letter.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEnvelopeLetter(letter)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Amplop</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLetter(letter)}
                            disabled={deletingId === letter.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            aria-label="Hapus surat"
                          >
                            {deletingId === letter.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <ServerDataTableFooter
            page={lettersMeta.page}
            perPage={lettersPerPage}
            totalItems={lettersMeta.totalItems}
            totalPages={lettersMeta.totalPages}
            onPageChange={setLettersPage}
            unitLabel="surat"
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: ADMIN/STAF DETAIL SURAT PER MITRA                        */}
      {/* ================================================================= */}
      {isAdminOrStaff && detailMitra && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={resolveAvatarUrl(detailMitra.avatarUrl, detailMitra.gender, detailMitra.mitraName)}
                  alt={detailMitra.mitraName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold truncate">
                    {detailMitra.mitraName}
                  </h2>
                  <p className="text-[11px] text-amber-200/90 font-mono truncate">
                    {detailMitra.memberCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openCreateModal(detailMitra.mitraId)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buat Surat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailMitra(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  aria-label="Tutup Detail Mitra"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Server-side table of companies for this Mitra */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <ServerDataTableTopBar
                perPage={detailPerPage}
                onPerPageChange={setDetailPerPage}
                search={detailSearch}
                onSearchChange={setDetailSearch}
                searchPlaceholder="Cari surat..."
                isLoading={detailLoading}
                onRefresh={fetchDetailTable}
                unitLabel="surat"
              />

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 whitespace-nowrap">Nomor &amp; Tanggal</th>
                      <th className="py-3 px-4">Perusahaan &amp; Alamat</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {detailLoading && detailRows.length === 0 ? (
                      <TableSkeletonRows rows={4} columns={3} />
                    ) : detailRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-10 px-6 text-center text-slate-500">
                          <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">Belum ada surat.</p>
                        </td>
                      </tr>
                    ) : (
                      detailRows.map((letter) => (
                        <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap align-top">
                            <p className="font-mono font-bold text-slate-900">{letter.letterNumber}</p>
                            <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                              {formatIndonesianLetterDate(letter.letterDate || letter.createdAt)}
                            </p>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <p className="font-bold text-slate-900">{letter.companyName}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {letter.companyAddress}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPreviewLetter(letter)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-[#092147] bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(letter)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickDownloadPdf(letter)}
                                disabled={downloadingId === letter.id}
                                className="px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-[#092147] hover:bg-[#113872] rounded-lg inline-flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                              >
                                {downloadingId === letter.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEnvelopeLetter(letter)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Amplop</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLetter(letter)}
                                disabled={deletingId === letter.id}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                aria-label="Hapus surat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <ServerDataTableFooter
                page={detailMeta.page}
                perPage={detailPerPage}
                totalItems={detailMeta.totalItems}
                totalPages={detailMeta.totalPages}
                onPageChange={setDetailPage}
                unitLabel="surat"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: FORM BUAT / EDIT SURAT PENAWARAN PROSPEK                 */}
      {/* ================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header (clean, without format spec label) */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold font-display truncate">
                  {editingLetter
                    ? `Edit Surat — ${editingLetter.letterNumber}`
                    : isAdminOrStaff
                    ? 'Buat Surat untuk Mitra'
                    : 'Buat Surat Penawaran'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingLetter(null);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Mitra Selector (Admin & Staf only) */}
              {isAdminOrStaff && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-[#092147]" />
                          <span>Mitra *</span>
                        </label>
                        <input
                          type="text"
                          value={mitraPickerQuery}
                          onChange={(e) => setMitraPickerQuery(e.target.value)}
                          placeholder="Cari mitra..."
                          className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg w-36 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <select
                        required
                        value={targetMitraId}
                        onChange={(e) => setTargetMitraId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Pilih mitra</option>
                        {selectableMitras.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} — {m.memberCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Nama Perusahaan */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800">
                        Nama Perusahaan *
                      </label>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          companyName.length >= MAX_COMPANY_NAME_LEN ? 'text-amber-600 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {companyName.length}/{MAX_COMPANY_NAME_LEN}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={MAX_COMPANY_NAME_LEN}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nama perusahaan"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Alamat Perusahaan Berurutan */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Alamat Perusahaan *
                      </label>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isAddressOverLimit ? 'text-rose-600 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {formattedAddressPreview.length}/{MAX_ADDRESS_COMBINED_LEN}
                      </span>
                    </div>

                    {/* 1. Jalan / Gedung / Nomor */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        1. Jalan / Gedung / No. *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={75}
                        value={addressParts.street}
                        onChange={(e) => setAddressParts((p) => ({ ...p, street: e.target.value }))}
                        placeholder="Jalan / no."
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    {/* 2. Desa/Kelurahan & 3. Kecamatan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          2. Desa / Kelurahan *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={40}
                          value={addressParts.village}
                          onChange={(e) => setAddressParts((p) => ({ ...p, village: e.target.value }))}
                          placeholder="Desa / kelurahan"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          3. Kecamatan *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={40}
                          value={addressParts.district}
                          onChange={(e) => setAddressParts((p) => ({ ...p, district: e.target.value }))}
                          placeholder="Kecamatan"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* 4. Kota/Kabupaten & 5. Provinsi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          4. Kota / Kabupaten *
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={addressParts.cityType}
                            onChange={(e) =>
                              setAddressParts((p) => ({
                                ...p,
                                cityType: e.target.value === 'Kab.' ? 'Kab.' : 'Kota',
                              }))
                            }
                            className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 shrink-0"
                          >
                            <option value="Kota">Kota</option>
                            <option value="Kab.">Kab.</option>
                          </select>
                          <input
                            type="text"
                            required
                            maxLength={40}
                            value={addressParts.city}
                            onChange={(e) => setAddressParts((p) => ({ ...p, city: e.target.value }))}
                            placeholder="Kota / kab."
                            className="w-full min-w-0 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          5. Provinsi *
                        </label>
                        <select
                          required
                          value={addressParts.province}
                          onChange={(e) => setAddressParts((p) => ({ ...p, province: e.target.value }))}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">Pilih provinsi</option>
                          {INDONESIAN_PROVINCES.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 6. Kode Pos */}
                    <div className="sm:w-1/2 sm:pr-1.5">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        6. Kode Pos
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={addressParts.postalCode || ''}
                        onChange={(e) =>
                          setAddressParts((p) => ({
                            ...p,
                            postalCode: e.target.value.replace(/[^\d]/g, '').slice(0, 5),
                          }))
                        }
                        placeholder="Kode pos"
                        className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    {/* Compact Assembled Address Line */}
                    {formattedAddressPreview && (
                      <div
                        className={`p-3 rounded-xl border text-xs ${
                          isAddressOverLimit
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <p className="font-medium leading-relaxed break-words">
                          {formattedAddressPreview}
                        </p>
                      </div>
                    )}
                  </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingLetter(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || isAddressOverLimit}
                  className="px-5 py-2.5 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? 'Menyimpan...'
                      : editingLetter
                      ? 'Simpan Perubahan'
                      : 'Buat & Lihat Surat'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: ADMIN/STAF EDIT ISI SURAT GLOBAL (BERLAKU SEMUA MITRA)   */}
      {/* ================================================================= */}
      {isAdminOrStaff && isTemplateOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
              <h2 className="text-base font-extrabold font-display">
                Edit Isi Surat Global
              </h2>
              <button
                type="button"
                onClick={() => setIsTemplateOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Tutup Editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-50">
              {templateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{templateError}</span>
                </div>
              )}

              <ProspectLetterContentEditor
                value={templateDraft}
                onChange={setTemplateDraft}
                logoUrl={logoUrl}
              />
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={templateSaving}
                onClick={() => handleSaveTemplate(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={templateSaving}
                  onClick={() => handleSaveTemplate(false)}
                  className="px-5 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {templateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
                  <span>{templateSaving ? 'Menyimpan...' : 'Simpan Isi Surat'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: 4-PAGE A4 PREVIEW & PDF DOWNLOAD                         */}
      {/* ================================================================= */}
      <ProspectLetterPreviewModal
        letter={previewLetter}
        logoUrl={logoUrl}
        masterTemplate={masterTemplate}
        onClose={() => setPreviewLetter(null)}
      />

      {/* ================================================================= */}
      {/* MODAL 5: CETAK & UNDUH AMPLOP 11cm x 22cm                         */}
      {/* ================================================================= */}
      <ProspectEnvelopeModal
        letter={envelopeLetter}
        logoUrl={logoUrl}
        onClose={() => setEnvelopeLetter(null)}
      />
    </div>
  );
};
