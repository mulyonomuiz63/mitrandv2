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
  ExternalLink,
  Users,
  MessageSquare,
  Check,
  Power,
  Trash2,
  Ban,
  Briefcase,
  ChevronDown,
  MoreVertical,
  Pencil,
  RotateCcw,
  BellRing,
  Copy,
  Link2,
  Download,
  UserPlus,
  UserMinus,
  QrCode,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { AppSettings, AuthUser, Mitra, ChatRoom, ClientDeal, getMitraKtpFileUrl, getMitraKtpFileName, getMissingMitraFields } from '../types';
import { getDefaultAvatar } from '../avatars';
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
import { AdminEditMitraModal } from './AdminEditMitraModal';

interface MitraVerificationPanelProps {
  mitras: Mitra[];
  clientDeals?: ClientDeal[];
  settings?: AppSettings | null;
  currentUser?: AuthUser | null;
  onVerifyMitra: (
    id: string,
    status: 'verified' | 'rejected' | 'pending',
    rejectionReason?: string,
    groupChatIds?: string[]
  ) => Promise<void>;
  onSelectMitraPreview: (mitra: Mitra) => void;
  onUpdateMitraProfile?: (id: string, data: Partial<Mitra> & Record<string, any>) => Promise<any>;
  onToggleMitraActive?: (id: string, isActive: boolean, reason?: string) => Promise<any>;
  onDeleteMitra?: (id: string) => Promise<any>;
  onRefreshData?: () => void;
}

const REJECTION_REASON_PRESETS = [
  'Dokumen File KTP / NPWP belum diunggah atau tidak terbaca dengan jelas.',
  'Nomor NIK KTP (16 digit) tidak sesuai atau belum valid.',
  'Nama pemilik rekening bank tidak sesuai dengan nama lengkap Mitra terdaftar.',
  'Nomor rekening bank pencairan tidak valid / belum lengkap.',
  'Nomor WhatsApp aktif atau data profil belum lengkap.',
];

const INCOMPLETE_DATA_CHECKLIST = [
  'Foto Profil Resmi',
  'Upload File KTP / NPWP',
  'NIK KTP (16 Digit)',
  'Nomor WhatsApp Aktif',
  'Data Rekening Bank Pencairan',
  'Kolom Data Diri Tambahan',
];

export const MitraVerificationPanel: React.FC<MitraVerificationPanelProps> = ({
  mitras,
  clientDeals = [],
  settings,
  currentUser,
  onVerifyMitra,
  onSelectMitraPreview,
  onUpdateMitraProfile,
  onToggleMitraActive,
  onDeleteMitra,
  onRefreshData,
}) => {
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<Mitra | null>(null);
  const [editingMitra, setEditingMitra] = useState<Mitra | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isAdminUploadingKtp, setIsAdminUploadingKtp] = useState(false);
  const [adminUploadMsg, setAdminUploadMsg] = useState<string | null>(null);
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<{
    mitra: Mitra;
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!openActionMenu) return;
    const handleClose = () => setOpenActionMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionMenu(null);
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionMenu]);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, m: Mitra) => {
    e.stopPropagation();
    if (openActionMenu?.mitra.id === m.id) {
      setOpenActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const estimatedMenuHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const top = openUpward ? rect.top - 6 : rect.bottom + 6;
    setOpenActionMenu({ mitra: m, top, left, openUpward });
  };

  // Approve Modal + Optional Group Chat Selection State
  const [mitraToApprove, setMitraToApprove] = useState<Mitra | null>(null);
  const [availableGroups, setAvailableGroups] = useState<ChatRoom[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Rejection Reason Modal State
  const [mitraToReject, setMitraToReject] = useState<Mitra | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>(
    'Data rekening bank / NIK KTP belum sesuai dengan identitas pendaftaran. Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.'
  );

  // Revoke Verification Modal State (Batalkan Verifikasi)
  const [mitraToRevoke, setMitraToRevoke] = useState<Mitra | null>(null);
  const [revokeReasonInput, setRevokeReasonInput] = useState<string>('');

  // Notify Incomplete Data Modal State (Info Lengkapi Data Diri)
  const [mitraToNotifyIncomplete, setMitraToNotifyIncomplete] = useState<Mitra | null>(null);
  const [selectedMissingItems, setSelectedMissingItems] = useState<string[]>([]);
  const [incompleteMessageInput, setIncompleteMessageInput] = useState<string>('');
  const [sendingIncompleteNotice, setSendingIncompleteNotice] = useState<boolean>(false);

  // WhatsApp Group Invite & Config Modal State
  const [mitraForWaGroup, setMitraForWaGroup] = useState<Mitra | null>(null);
  const [waGroupNameInput, setWaGroupNameInput] = useState<string>(
    settings?.whatsappGroupName || 'Grup WhatsApp Mitra ND Tax & Law'
  );
  const [waGroupLinkInput, setWaGroupLinkInput] = useState<string>(
    settings?.whatsappGroupLink || ''
  );
  const [waGroupJidInput, setWaGroupJidInput] = useState<string>(
    settings?.whatsappGroupJid || ''
  );
  const [waCustomNoteInput, setWaCustomNoteInput] = useState<string>('');
  const [isWaGroupConfigModalOpen, setIsWaGroupConfigModalOpen] = useState<boolean>(false);
  const [waGroupModalTab, setWaGroupModalTab] = useState<'members' | 'connection' | 'settings'>('members');
  const [waMemberSearch, setWaMemberSearch] = useState<string>('');
  const [waMemberFilter, setWaMemberFilter] = useState<'all' | 'not_joined' | 'joined'>('all');
  const [selectedWaMitraIds, setSelectedWaMitraIds] = useState<string[]>([]);
  const [savingWaGroup, setSavingWaGroup] = useState<boolean>(false);
  const [copiedWaLink, setCopiedWaLink] = useState<boolean>(false);
  const [copiedWaPhones, setCopiedWaPhones] = useState<boolean>(false);
  const [waModalFeedback, setWaModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real WhatsApp Linked-Device (Baileys QR) State
  const [waConnStatus, setWaConnStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'connected'>('disconnected');
  const [waStatusDetail, setWaStatusDetail] = useState<string | null>(null);
  const [waQrDataUrl, setWaQrDataUrl] = useState<string | null>(null);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string | null>(null);
  const [waConnectedName, setWaConnectedName] = useState<string | null>(null);
  const [waConnError, setWaConnError] = useState<string | null>(null);
  const [waGroupsList, setWaGroupsList] = useState<Array<{ id: string; subject: string; participantsCount: number; isAdmin: boolean }>>([]);
  const [loadingWaGroups, setLoadingWaGroups] = useState<boolean>(false);
  const [syncingWaMembers, setSyncingWaMembers] = useState<boolean>(false);

  const fetchWaConnectionStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const json = await res.json();
      if (json?.success && json.data) {
        setWaConnStatus(json.data.status || 'disconnected');
        setWaStatusDetail(json.data.statusDetail || null);
        setWaQrDataUrl(json.data.qrDataUrl || null);
        setWaConnectedPhone(json.data.connectedPhone || null);
        setWaConnectedName(json.data.connectedName || null);
        setWaConnError(json.data.lastError || null);
        if (json.data.whatsappGroupJid) setWaGroupJidInput(json.data.whatsappGroupJid);
      }
    } catch {
      // ignore transient poll errors
    }
  }, []);

  const fetchWaGroupsList = React.useCallback(async () => {
    setLoadingWaGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setWaGroupsList(json.data);
        if (json.selectedGroupJid) setWaGroupJidInput(json.selectedGroupJid);
      }
    } catch {
      // ignore
    } finally {
      setLoadingWaGroups(false);
    }
  }, []);

  React.useEffect(() => {
    if (settings?.whatsappGroupName) setWaGroupNameInput(settings.whatsappGroupName);
    if (typeof settings?.whatsappGroupLink === 'string') setWaGroupLinkInput(settings.whatsappGroupLink);
    if (typeof settings?.whatsappGroupJid === 'string') setWaGroupJidInput(settings.whatsappGroupJid);
  }, [settings?.whatsappGroupName, settings?.whatsappGroupLink, settings?.whatsappGroupJid]);

  // Poll WhatsApp status while either WA modal is open (faster while connecting/QR)
  React.useEffect(() => {
    if (!isWaGroupConfigModalOpen && !mitraForWaGroup) return;
    fetchWaConnectionStatus();
    const pollMs = waConnStatus === 'connecting' || waConnStatus === 'qr' ? 1500 : 3000;
    const interval = setInterval(() => {
      fetchWaConnectionStatus();
    }, pollMs);
    return () => clearInterval(interval);
  }, [isWaGroupConfigModalOpen, mitraForWaGroup, waConnStatus, fetchWaConnectionStatus]);

  // Auto-load real WhatsApp groups once connected
  React.useEffect(() => {
    if ((isWaGroupConfigModalOpen || mitraForWaGroup) && waConnStatus === 'connected' && waGroupsList.length === 0) {
      fetchWaGroupsList();
    }
  }, [isWaGroupConfigModalOpen, mitraForWaGroup, waConnStatus, waGroupsList.length, fetchWaGroupsList]);

  const handleConnectWhatsAppQr = async (forceReset: boolean = false) => {
    setWaModalFeedback(null);
    setWaConnError(null);
    setWaConnStatus('connecting');
    setWaStatusDetail('Menghubungkan ke server WhatsApp & menyiapkan QR Code...');
    if (forceReset) {
      setWaQrDataUrl(null);
    }
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReset }),
      });
      const json = await res.json();
      if (json?.data) {
        setWaConnStatus(json.data.status || 'disconnected');
        setWaStatusDetail(json.data.statusDetail || null);
        setWaQrDataUrl(json.data.qrDataUrl || null);
        setWaConnectedPhone(json.data.connectedPhone || null);
        setWaConnError(json.data.lastError || null);
      } else if (!res.ok) {
        setWaConnStatus('disconnected');
        setWaStatusDetail(null);
        setWaConnError(json?.message || 'Gagal memulai koneksi WhatsApp.');
      }
    } catch (err: any) {
      setWaConnStatus('disconnected');
      setWaStatusDetail(null);
      setWaConnError(err?.message || 'Gagal memulai koneksi WhatsApp.');
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setSavingWaGroup(true);
    setWaModalFeedback(null);
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const json = await res.json();
      setWaConnStatus('disconnected');
      setWaQrDataUrl(null);
      setWaConnectedPhone(null);
      setWaConnectedName(null);
      setWaGroupsList([]);
      setWaModalFeedback({
        type: 'success',
        text: json?.message || 'Koneksi WhatsApp Admin berhasil diputuskan.',
      });
    } catch (err: any) {
      setWaModalFeedback({
        type: 'error',
        text: err?.message || 'Gagal memutuskan koneksi WhatsApp.',
      });
    } finally {
      setSavingWaGroup(false);
    }
  };

  const handleSyncRealWaMembers = async (overrideGroupJid?: string) => {
    setSyncingWaMembers(true);
    setWaModalFeedback(null);
    try {
      const res = await fetch('/api/whatsapp/sync-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupJid: overrideGroupJid || waGroupJidInput }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal menyinkronkan peserta Grup WhatsApp.');
      }
      setWaModalFeedback({ type: 'success', text: json.message });
      if (onRefreshData) onRefreshData();
      mitraDt.refresh();
    } catch (err: any) {
      setWaModalFeedback({
        type: 'error',
        text: err?.message || 'Gagal menyinkronkan peserta Grup WhatsApp.',
      });
    } finally {
      setSyncingWaMembers(false);
    }
  };

  const handleSelectTargetWaGroup = async (group: { id: string; subject: string }) => {
    setSavingWaGroup(true);
    setWaModalFeedback(null);
    try {
      const res = await fetch('/api/settings/whatsapp-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappGroupJid: group.id,
          whatsappGroupName: group.subject,
          whatsappGroupLink: waGroupLinkInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal memilih Grup WhatsApp tujuan.');
      }
      setWaGroupJidInput(group.id);
      setWaGroupNameInput(group.subject);
      if (json.data?.whatsappGroupLink) setWaGroupLinkInput(json.data.whatsappGroupLink);
      if (onRefreshData) onRefreshData();
      // Immediately sync real participants from this WhatsApp group!
      await handleSyncRealWaMembers(group.id);
      setWaGroupModalTab('members');
    } catch (err: any) {
      setWaModalFeedback({
        type: 'error',
        text: err?.message || 'Gagal menyimpan Grup WhatsApp tujuan.',
      });
    } finally {
      setSavingWaGroup(false);
    }
  };

  const formatWaNumber = (rawPhone?: string) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  };

  const downloadMitrasVcf = (targetList: Mitra[]) => {
    const sanitizeVcf = (val: string) =>
      String(val || '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/[;,\\]/g, ' ')
        .trim();
    const cards = targetList
      .map((m) => {
        const waNum = formatWaNumber(m.phone);
        if (!waNum) return null;
        const displayName = sanitizeVcf(`Mitra ND - ${m.fullName}`);
        const org = sanitizeVcf(waGroupNameInput.trim() || 'Mitra ND Tax & Law');
        const note = sanitizeVcf(`Kode Mitra: ${m.memberCode || '-'} | ${m.email || '-'}`);
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${displayName}`,
          `N:${displayName};;;;`,
          `ORG:${org}`,
          `TEL;TYPE=CELL,VOICE:+${waNum}`,
          m.email ? `EMAIL:${sanitizeVcf(m.email)}` : '',
          `NOTE:${note}`,
          'END:VCARD',
        ]
          .filter(Boolean)
          .join('\r\n');
      })
      .filter(Boolean) as string[];

    if (cards.length === 0) {
      setPanelFeedback({
        type: 'error',
        text: 'Tidak ada Mitra dengan nomor WhatsApp valid untuk diunduh kontaknya.',
      });
      return;
    }

    const blob = new Blob([cards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      cards.length === 1
        ? `Kontak_Mitra_${sanitizeVcf(targetList[0].fullName).replace(/\s+/g, '_')}.vcf`
        : `Kontak_Peserta_Grup_WA_${cards.length}_Mitra.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setPanelFeedback({
      type: 'success',
      text: `${cards.length} kontak Mitra (.vcf) berhasil diunduh. Impor ke kontak HP/WhatsApp untuk menambah peserta langsung ke grup.`,
    });
  };

  const waGroupMemberCount = React.useMemo(
    () => mitras.filter((m) => m.whatsappGroupInvited).length,
    [mitras]
  );

  const filteredWaModalMitras = React.useMemo(() => {
    const q = waMemberSearch.trim().toLowerCase();
    return mitras.filter((m) => {
      if (waMemberFilter === 'joined' && !m.whatsappGroupInvited) return false;
      if (waMemberFilter === 'not_joined' && m.whatsappGroupInvited) return false;
      if (!q) return true;
      return (
        (m.fullName || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.memberCode || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    });
  }, [mitras, waMemberSearch, waMemberFilter]);

  const openRevokeModal = (m: Mitra) => {
    setMitraToRevoke(m);
    const missing = getMissingMitraFields(m, settings);
    setRevokeReasonInput(
      missing.length > 0
        ? `Status verifikasi dibatalkan sementara. Mohon lengkapi data berikut terlebih dahulu: ${missing.join(', ')}.`
        : 'Status verifikasi dibatalkan sementara oleh Admin untuk peninjauan ulang / kelengkapan data diri.'
    );
  };

  const handleConfirmRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraToRevoke) return;
    setActionLoadingId(mitraToRevoke.id);
    setPanelFeedback(null);
    try {
      await onVerifyMitra(mitraToRevoke.id, 'pending', revokeReasonInput.trim());
      if (selectedMitraDetail && selectedMitraDetail.id === mitraToRevoke.id) {
        setSelectedMitraDetail(null);
      }
      setPanelFeedback({
        type: 'success',
        text: `Verifikasi Mitra "${mitraToRevoke.fullName}" berhasil dibatalkan dan dikembalikan ke status Pending Verifikasi.`,
      });
      setMitraToRevoke(null);
      mitraDt.refresh();
    } catch (err: any) {
      setPanelFeedback({
        type: 'error',
        text: err?.message || 'Gagal membatalkan verifikasi mitra.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openNotifyIncompleteModal = (m: Mitra) => {
    const autoMissing = getMissingMitraFields(m, settings);
    setMitraToNotifyIncomplete(m);
    setSelectedMissingItems(autoMissing);
    setIncompleteMessageInput(
      autoMissing.length > 0
        ? `Halo ${m.fullName}, mohon segera melengkapi data diri wajib berikut di Portal Mitra ND Tax & Law: ${autoMissing.join(', ')}.`
        : `Halo ${m.fullName}, mohon segera memeriksa dan melengkapi data diri serta dokumen verifikasi Anda di menu Profil Portal Mitra.`
    );
  };

  const toggleMissingChecklistItem = (item: string) => {
    setSelectedMissingItems((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      if (mitraToNotifyIncomplete) {
        setIncompleteMessageInput(
          next.length > 0
            ? `Halo ${mitraToNotifyIncomplete.fullName}, mohon segera melengkapi data diri wajib berikut di Portal Mitra ND Tax & Law: ${next.join(', ')}.`
            : `Halo ${mitraToNotifyIncomplete.fullName}, mohon segera melengkapi data diri Anda di menu Profil Portal Mitra.`
        );
      }
      return next;
    });
  };

  const handleSendIncompleteNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraToNotifyIncomplete) return;
    setSendingIncompleteNotice(true);
    setPanelFeedback(null);
    try {
      const res = await fetch(`/api/mitra/${encodeURIComponent(mitraToNotifyIncomplete.id)}/notify-incomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: incompleteMessageInput.trim(),
          missingItems: selectedMissingItems,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal mengirim pemberitahuan kelengkapan data.');
      }
      if (selectedMitraDetail && selectedMitraDetail.id === mitraToNotifyIncomplete.id && json.data) {
        setSelectedMitraDetail(json.data);
      }
      setPanelFeedback({
        type: 'success',
        text: json.message || `Pemberitahuan kelengkapan data berhasil dikirim ke ${mitraToNotifyIncomplete.fullName}.`,
      });
      setMitraToNotifyIncomplete(null);
      if (onRefreshData) onRefreshData();
      mitraDt.refresh();
    } catch (err: any) {
      setPanelFeedback({
        type: 'error',
        text: err?.message || 'Gagal mengirim pemberitahuan kelengkapan data.',
      });
    } finally {
      setSendingIncompleteNotice(false);
    }
  };

  const openWaGroupInviteModal = (m: Mitra) => {
    setMitraForWaGroup(m);
    setWaGroupNameInput(settings?.whatsappGroupName || 'Grup WhatsApp Mitra ND Tax & Law');
    setWaGroupLinkInput(settings?.whatsappGroupLink || '');
    setWaCustomNoteInput('');
    setCopiedWaLink(false);
  };

  const handleSaveWaGroupConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWaGroup(true);
    setWaModalFeedback(null);
    setPanelFeedback(null);
    try {
      const res = await fetch('/api/settings/whatsapp-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappGroupName: waGroupNameInput.trim(),
          whatsappGroupLink: waGroupLinkInput.trim(),
          whatsappGroupJid: waGroupJidInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal menyimpan pengaturan Grup WhatsApp.');
      }
      setWaModalFeedback({
        type: 'success',
        text: json.message || 'Pengaturan Grup WhatsApp Mitra berhasil disimpan.',
      });
      setPanelFeedback({
        type: 'success',
        text: json.message || 'Pengaturan Grup WhatsApp Mitra berhasil disimpan.',
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setWaModalFeedback({
        type: 'error',
        text: err?.message || 'Gagal menyimpan pengaturan Grup WhatsApp.',
      });
      setPanelFeedback({
        type: 'error',
        text: err?.message || 'Gagal menyimpan pengaturan Grup WhatsApp.',
      });
    } finally {
      setSavingWaGroup(false);
    }
  };

  const handleInviteMitraToWaGroup = async (e: React.FormEvent, action: 'add' | 'remove' = 'add') => {
    e.preventDefault();
    if (!mitraForWaGroup) return;
    setSavingWaGroup(true);
    setWaModalFeedback(null);
    setPanelFeedback(null);
    try {
      const res = await fetch(`/api/mitra/${encodeURIComponent(mitraForWaGroup.id)}/whatsapp-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          groupName: waGroupNameInput.trim(),
          groupLink: waGroupLinkInput.trim(),
          groupJid: waGroupJidInput.trim(),
          customMessage: waCustomNoteInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        if (json?.requiresWhatsAppConnection) {
          setMitraForWaGroup(null);
          setWaGroupModalTab('connection');
          setIsWaGroupConfigModalOpen(true);
          setWaModalFeedback({ type: 'error', text: json.message });
          return;
        }
        throw new Error(json?.message || 'Gagal memperbarui status peserta Grup WhatsApp.');
      }
      if (selectedMitraDetail && selectedMitraDetail.id === mitraForWaGroup.id && json.data) {
        setSelectedMitraDetail(json.data);
      }
      if (json.data) {
        setMitraForWaGroup(json.data);
      }
      const msg =
        json.message ||
        (action === 'remove'
          ? `${mitraForWaGroup.fullName} dikeluarkan dari Grup WhatsApp.`
          : `${mitraForWaGroup.fullName} berhasil diproses ke Grup WhatsApp.`);
      setWaModalFeedback({ type: 'success', text: msg });
      setPanelFeedback({ type: 'success', text: msg });
      if (onRefreshData) onRefreshData();
      mitraDt.refresh();
    } catch (err: any) {
      const msg = err?.message || 'Gagal memperbarui peserta Grup WhatsApp.';
      setWaModalFeedback({ type: 'error', text: msg });
      setPanelFeedback({ type: 'error', text: msg });
    } finally {
      setSavingWaGroup(false);
    }
  };

  const handleBatchWaGroupMembers = async (targetIds: string[], action: 'add' | 'remove') => {
    if (targetIds.length === 0) return;
    setSavingWaGroup(true);
    setWaModalFeedback(null);
    setPanelFeedback(null);
    try {
      const res = await fetch('/api/whatsapp-group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraIds: targetIds,
          action,
          groupJid: waGroupJidInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        if (json?.requiresWhatsAppConnection) {
          setWaGroupModalTab('connection');
          setWaModalFeedback({ type: 'error', text: json.message });
          return;
        }
        throw new Error(json?.message || 'Gagal memperbarui peserta Grup WhatsApp.');
      }
      setSelectedWaMitraIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      const msg =
        json.message ||
        (action === 'add'
          ? `${targetIds.length} Mitra berhasil ditambahkan ke Grup WhatsApp.`
          : `${targetIds.length} Mitra berhasil dikeluarkan dari Grup WhatsApp.`);
      setWaModalFeedback({ type: 'success', text: msg });
      setPanelFeedback({ type: 'success', text: msg });
      if (onRefreshData) onRefreshData();
      mitraDt.refresh();
    } catch (err: any) {
      const msg = err?.message || 'Gagal memperbarui peserta Grup WhatsApp.';
      setWaModalFeedback({ type: 'error', text: msg });
      setPanelFeedback({ type: 'error', text: msg });
    } finally {
      setSavingWaGroup(false);
    }
  };

  const clientCountByMitraId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const deal of clientDeals) {
      if (!deal?.mitraId) continue;
      map.set(deal.mitraId, (map.get(deal.mitraId) || 0) + 1);
    }
    return map;
  }, [clientDeals]);

  const getMitraClientCount = React.useCallback(
    (m: Mitra) => Math.max(clientCountByMitraId.get(m.id) || 0, Number(m.referredClientsCount || 0)),
    [clientCountByMitraId]
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
        const matchesFilter =
          statusFilter === 'all' ||
          (statusFilter === 'inactive' ? m.isActive === false : m.status === statusFilter);
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
    dependencyKey: `${mitras.length}-${mitras.map((m) => `${m.status}:${m.isActive !== false ? 1 : 0}`).join(',')}`,
  });

  const filteredMitras = mitraDt.rows;

  const handleApproveAction = async (id: string) => {
    const targetMitra = mitras.find((m) => m.id === id) || selectedMitraDetail;
    if (!targetMitra) return;

    setMitraToApprove(targetMitra);
    setSelectedGroupIds([]);
    setGroupSearchQuery('');
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/chat/groups');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setAvailableGroups(json.data);
      } else {
        setAvailableGroups([]);
      }
    } catch {
      setAvailableGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleConfirmApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraToApprove) return;

    const targetId = mitraToApprove.id;
    setActionLoadingId(targetId);
    try {
      await onVerifyMitra(
        targetId,
        'verified',
        undefined,
        selectedGroupIds.length > 0 ? selectedGroupIds : undefined
      );
      if (selectedMitraDetail && selectedMitraDetail.id === targetId) {
        setSelectedMitraDetail(null);
      }
      setMitraToApprove(null);
      setSelectedGroupIds([]);
      mitraDt.refresh();
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

  const handleToggleActiveAction = async (m: Mitra) => {
    if (!onToggleMitraActive) return;
    const currentlyActive = m.isActive !== false;
    const nextActive = !currentlyActive;

    const ok = await confirm({
      title: nextActive ? 'Aktifkan Kembali Akun Mitra' : 'Nonaktifkan Akun Mitra',
      message: nextActive
        ? `Apakah Anda yakin ingin mengaktifkan kembali akun Mitra "${m.fullName}"? Mitra akan dapat login kembali ke portal.`
        : `Apakah Anda yakin ingin menonaktifkan akun Mitra "${m.fullName}"? Setelah dinonaktifkan, mitra ini TIDAK DAPAT LOGIN ke portal sampai diaktifkan kembali.`,
      detail: `Nama Mitra: ${m.fullName}\nID Anggota: ${m.memberCode}\nEmail: ${m.email}\nJumlah Klien: ${getMitraClientCount(m)} Klien`,
      confirmText: nextActive ? 'Ya, Aktifkan Akun' : 'Ya, Nonaktifkan Mitra',
      cancelText: 'Batalkan',
      variant: nextActive ? 'success' : 'danger',
    });
    if (!ok) return;

    setPanelFeedback(null);
    setActionLoadingId(m.id);
    try {
      const res = await onToggleMitraActive(m.id, nextActive);
      if (selectedMitraDetail && selectedMitraDetail.id === m.id && res?.data) {
        setSelectedMitraDetail(res.data);
      }
      setPanelFeedback({
        type: 'success',
        text:
          res?.message ||
          (nextActive
            ? `Akun Mitra "${m.fullName}" berhasil diaktifkan kembali.`
            : `Akun Mitra "${m.fullName}" berhasil dinonaktifkan dan tidak bisa login.`),
      });
      mitraDt.refresh();
    } catch (err: any) {
      setPanelFeedback({
        type: 'error',
        text: err?.message || 'Gagal mengubah status aktif mitra.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteMitraAction = async (m: Mitra) => {
    if (!onDeleteMitra) return;
    const clientCount = getMitraClientCount(m);
    if (clientCount > 0) {
      setPanelFeedback({
        type: 'error',
        text: `Data Mitra "${m.fullName}" tidak dapat dihapus karena sudah memiliki ${clientCount} klien terdaftar. Silakan gunakan tombol Nonaktifkan agar mitra tidak dapat login.`,
      });
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Hapus Permanen Data Mitra',
      message: `Apakah Anda yakin ingin menghapus permanen data Mitra "${m.fullName}"? Mitra ini belum memiliki klien sehingga aman untuk dihapus. Tindakan ini tidak dapat dibatalkan.`,
      detail: `Nama Mitra: ${m.fullName}\nID Anggota: ${m.memberCode}\nEmail: ${m.email}\nNIK / NPWP: ${m.nik}\nJumlah Klien: 0 Klien`,
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

    setPanelFeedback(null);
    setActionLoadingId(m.id);
    try {
      const res = await onDeleteMitra(m.id);
      if (selectedMitraDetail && selectedMitraDetail.id === m.id) {
        setSelectedMitraDetail(null);
      }
      setPanelFeedback({
        type: 'success',
        text: res?.message || `Data Mitra "${m.fullName}" berhasil dihapus secara permanen.`,
      });
      mitraDt.refresh();
    } catch (err: any) {
      setPanelFeedback({
        type: 'error',
        text: err?.message || 'Gagal menghapus data mitra.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = mitras.filter((m) => m.status === 'pending').length;
  const verifiedCount = mitras.filter((m) => m.status === 'verified').length;
  const rejectedCount = mitras.filter((m) => m.status === 'rejected').length;
  const inactiveCount = mitras.filter((m) => m.isActive === false).length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Title & WhatsApp Group Config Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2 flex-wrap">
            <span>Verifikasi &amp; Manajemen Data Mitra</span>
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingCount} Perlu Ditinjau
              </span>
            )}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setWaGroupModalTab('members');
            setSelectedWaMitraIds([]);
            setIsWaGroupConfigModalOpen(true);
          }}
          className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer transition-colors shadow-2xs"
        >
          <Users className="w-4 h-4 text-[#25D366]" />
          <span>Kelola Grup WhatsApp Mitra</span>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
            {waGroupMemberCount}
          </span>
        </button>
      </div>

      {panelFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            panelFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {panelFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{panelFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setPanelFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
            aria-label="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mitra..."
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
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'inactive'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nonaktif ({inactiveCount})
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
                <th className="py-3 px-6 text-right">Aksi</th>
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
                filteredMitras.map((m) => {
                  const isMitraActive = m.isActive !== false;
                  const mitraClientCount = getMitraClientCount(m);
                  return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isMitraActive ? 'hover:bg-slate-50/70' : 'bg-slate-50/90 opacity-85 hover:bg-slate-100/80'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <ImageWithSkeleton
                          src={m.avatarUrl || getDefaultAvatar(m.gender, m.fullName)}
                          fallbackSrc={getDefaultAvatar(m.gender, m.fullName)}
                          alt={m.fullName}
                          className={`w-9 h-9 rounded-full object-cover ring-1 ${
                            isMitraActive ? 'ring-slate-200' : 'ring-red-300 grayscale'
                          }`}
                          containerClassName="w-9 h-9 shrink-0"
                          rounded="rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 leading-snug font-display">
                              {m.fullName}
                            </p>
                            {!isMitraActive && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white">
                                <Ban className="w-2.5 h-2.5" />
                                <span>Nonaktif</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {m.memberCode} · NIK: {m.nik}
                          </p>
                          <div className="mt-1 flex items-center flex-wrap gap-1.5">
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
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                mitraClientCount > 0
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <Briefcase className="w-3 h-3" />
                              <span>{mitraClientCount} Klien</span>
                            </span>
                            {m.whatsappGroupInvited && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Users className="w-3 h-3 text-[#25D366]" />
                                <span>Grup WA ✓</span>
                              </span>
                            )}
                            {(m.profileCompletionNotice || getMissingMitraFields(m, settings).length > 0) && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                title={
                                  m.profileCompletionNotice ||
                                  `Data belum lengkap: ${getMissingMitraFields(m, settings).join(', ')}`
                                }
                              >
                                <BellRing className="w-3 h-3" />
                                <span>Perlu Lengkapi Data</span>
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
                      <div className="flex flex-col items-center gap-1">
                        {m.status === 'verified' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lulus Verifikasi
                          </span>
                        ) : m.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Menunggu Cek Admin
                          </span>
                        ) : (
                          <>
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
                          </>
                        )}
                        {!isMitraActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <Ban className="w-3 h-3 text-red-600" /> Login Dinonaktifkan
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => handleToggleActionMenu(e, m)}
                        disabled={actionLoadingId === m.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                          openActionMenu?.mitra.id === m.id
                            ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                        }`}
                        aria-haspopup="menu"
                        aria-expanded={openActionMenu?.mitra.id === m.id}
                        title="Buka daftar aksi untuk mitra ini"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                        <span>{actionLoadingId === m.id ? 'Memproses...' : 'Aksi'}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            openActionMenu?.mitra.id === m.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Dropdown Menu Aksi Mitra (Anti-Clipping) */}
        {openActionMenu && (() => {
          const target =
            mitras.find((item) => item.id === openActionMenu.mitra.id) || openActionMenu.mitra;
          const isTargetActive = target.isActive !== false;
          const targetClientCount = getMitraClientCount(target);
          return (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: openActionMenu.top,
                left: openActionMenu.left,
                transform: openActionMenu.openUpward ? 'translateY(-100%)' : undefined,
              }}
              className="z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95"
            >
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{target.fullName}</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {target.memberCode} · {targetClientCount} Klien
                </p>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenActionMenu(null);
                    setSelectedMitraDetail(target);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Cek Data Mitra</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenActionMenu(null);
                    setEditingMitra(target);
                  }}
                  className="w-full px-3 py-2 text-left text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Edit Data Mitra</span>
                </button>

                {target.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenActionMenu(null);
                        handleApproveAction(target.id);
                      }}
                      className="w-full px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Setujui (Approve)</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenActionMenu(null);
                        openRejectModal(target);
                      }}
                      className="w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Tolak &amp; Beri Alasan</span>
                    </button>
                  </>
                )}

                {target.status === 'rejected' && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenActionMenu(null);
                      handleApproveAction(target.id);
                    }}
                    className="w-full px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Setujui (Approve)</span>
                  </button>
                )}

                {target.status === 'verified' && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenActionMenu(null);
                        onSelectMitraPreview(target);
                      }}
                      className="w-full px-3 py-2 text-left text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Lihat ID Card</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenActionMenu(null);
                        openRevokeModal(target);
                      }}
                      className="w-full px-3 py-2 text-left text-orange-700 hover:bg-orange-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Batalkan Verifikasi</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenActionMenu(null);
                    openNotifyIncompleteModal(target);
                  }}
                  className="w-full px-3 py-2 text-left text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Info Lengkapi Data</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenActionMenu(null);
                    openWaGroupInviteModal(target);
                  }}
                  className="w-full px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 font-semibold cursor-pointer transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                  <span>{target.whatsappGroupInvited ? 'Kirim Ulang Grup WA' : 'Masukkan ke Grup WA'}</span>
                </button>
              </div>

              {(onToggleMitraActive || onDeleteMitra) && (
                <div className="border-t border-slate-100 py-1">
                  {onToggleMitraActive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenActionMenu(null);
                        handleToggleActiveAction(target);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 font-semibold cursor-pointer transition-colors ${
                        isTargetActive
                          ? 'text-amber-800 hover:bg-amber-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <Power
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isTargetActive ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      />
                      <span>{isTargetActive ? 'Nonaktifkan Akun' : 'Aktifkan Kembali'}</span>
                    </button>
                  )}

                  {onDeleteMitra && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={targetClientCount > 0}
                      onClick={() => {
                        setOpenActionMenu(null);
                        handleDeleteMitraAction(target);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start gap-2.5 transition-colors ${
                        targetClientCount > 0
                          ? 'text-slate-400 cursor-not-allowed bg-slate-50/50'
                          : 'text-red-700 hover:bg-red-50 font-semibold cursor-pointer'
                      }`}
                      title={
                        targetClientCount > 0
                          ? `Tidak dapat dihapus karena sudah memiliki ${targetClientCount} klien.`
                          : 'Hapus permanen data mitra ini'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block leading-tight">Hapus Mitra</span>
                        {targetClientCount > 0 && (
                          <span className="block text-[10px] font-normal text-slate-400 mt-0.5 leading-tight">
                            Terkunci ({targetClientCount} klien aktif)
                          </span>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
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
                  src={
                    selectedMitraDetail.avatarUrl ||
                    getDefaultAvatar(selectedMitraDetail.gender, selectedMitraDetail.fullName)
                  }
                  fallbackSrc={getDefaultAvatar(
                    selectedMitraDetail.gender,
                    selectedMitraDetail.fullName
                  )}
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
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 sm:px-6 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditingMitra(selectedMitraDetail)}
                  className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
                {onToggleMitraActive && (
                  <button
                    type="button"
                    onClick={() => handleToggleActiveAction(selectedMitraDetail)}
                    disabled={actionLoadingId === selectedMitraDetail.id}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 ${
                      selectedMitraDetail.isActive !== false
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>
                      {selectedMitraDetail.isActive !== false ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                    </span>
                  </button>
                )}

                {onDeleteMitra && (() => {
                  const detailClientCount = getMitraClientCount(selectedMitraDetail);
                  return (
                    <button
                      type="button"
                      onClick={() => handleDeleteMitraAction(selectedMitraDetail)}
                      disabled={actionLoadingId === selectedMitraDetail.id || detailClientCount > 0}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                        detailClientCount > 0
                          ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-70'
                          : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200 cursor-pointer'
                      }`}
                      title={
                        detailClientCount > 0
                          ? `Tidak dapat dihapus karena sudah memiliki ${detailClientCount} klien.`
                          : 'Hapus permanen data mitra ini'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {detailClientCount > 0 ? `Tidak Bisa Dihapus (${detailClientCount} Klien)` : 'Hapus Mitra'}
                      </span>
                    </button>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedMitraDetail(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMitraDetail;
                    setSelectedMitraDetail(null);
                    openNotifyIncompleteModal(target);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600" />
                  <span>Info Lengkapi Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMitraDetail;
                    setSelectedMitraDetail(null);
                    openWaGroupInviteModal(target);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Grup WA</span>
                </button>

                {selectedMitraDetail.status === 'verified' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedMitraDetail;
                      setSelectedMitraDetail(null);
                      openRevokeModal(target);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                    <span>Batalkan Verifikasi</span>
                  </button>
                )}

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
        </div>
      )}

      {/* Modal Approve Verifikasi Mitra + Pilih Group Chat (Opsional) */}
      {mitraToApprove && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    APPROVE VERIFIKASI MITRA
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                    Setujui (Approve) Verifikasi Data Mitra
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraToApprove(null)}
                disabled={actionLoadingId === mitraToApprove.id}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproveSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setelah disetujui, status Mitra <strong>{mitraToApprove.fullName}</strong> akan menjadi{' '}
                  <strong className="text-emerald-700">Lulus Verifikasi</strong> dan Kode Referral, Input Klien, Tools Marketing, serta Kartu Identitas Mitra langsung aktif.
                </p>

                {/* Ringkasan Data Mitra */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center gap-2.5 pb-2 mb-1.5 border-b border-slate-200/80">
                    <ImageWithSkeleton
                      src={
                        mitraToApprove.avatarUrl ||
                        getDefaultAvatar(mitraToApprove.gender, mitraToApprove.fullName)
                      }
                      fallbackSrc={getDefaultAvatar(mitraToApprove.gender, mitraToApprove.fullName)}
                      alt={mitraToApprove.fullName}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                      containerClassName="w-9 h-9 shrink-0"
                      rounded="rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{mitraToApprove.fullName}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {mitraToApprove.memberCode} · {mitraToApprove.email}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">NIK KTP:</span>{' '}
                    <strong className="font-mono text-slate-800">{mitraToApprove.nik}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Rekening Bank:</span>{' '}
                    <strong className="text-slate-800">
                      {mitraToApprove.bankDetails.bankName} - {mitraToApprove.bankDetails.accountNumber} (a.n. {mitraToApprove.bankDetails.accountHolder})
                    </strong>
                  </div>
                </div>

                {/* Pilihan Group Chat (Opsional) */}
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>Masukkan ke Group Chat</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200">
                          Opsional
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Pilih satu atau beberapa group chat jika ingin langsung memasukkan mitra ini, atau biarkan kosong untuk approve tanpa masuk group.
                      </p>
                    </div>
                    {selectedGroupIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedGroupIds([])}
                        className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline shrink-0 cursor-pointer"
                      >
                        Kosongkan ({selectedGroupIds.length})
                      </button>
                    )}
                  </div>

                  {loadingGroups ? (
                    <div className="space-y-2 py-2">
                      <div className="h-11 rounded-lg bg-white/80 border border-blue-100 animate-pulse" />
                      <div className="h-11 rounded-lg bg-white/80 border border-blue-100 animate-pulse" />
                    </div>
                  ) : availableGroups.length === 0 ? (
                    <div className="p-3 rounded-lg bg-white border border-blue-100 text-[11px] text-slate-500 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Belum ada group chat yang tersedia saat ini. Anda tetap dapat langsung menyetujui mitra ini.</span>
                    </div>
                  ) : (
                    <>
                      {availableGroups.length > 4 && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            placeholder="Cari grup..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                        {(() => {
                          const q = groupSearchQuery.trim().toLowerCase();
                          const filteredGroups = availableGroups.filter((g) => {
                            if (!q) return true;
                            return (
                              (g.name || '').toLowerCase().includes(q) ||
                              (g.description || '').toLowerCase().includes(q)
                            );
                          });
                          if (filteredGroups.length === 0) {
                            return (
                              <div className="p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-500 text-center">
                                Tidak ada group chat yang cocok dengan pencarian "{groupSearchQuery}".
                              </div>
                            );
                          }
                          return filteredGroups.map((group) => {
                            const alreadyMember = group.participantIds.includes(mitraToApprove.id);
                            const isChecked = selectedGroupIds.includes(group.id);
                            return (
                              <button
                                key={group.id}
                                type="button"
                                disabled={alreadyMember}
                                onClick={() => toggleGroupSelection(group.id)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                  alreadyMember
                                    ? 'bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed'
                                    : isChecked
                                    ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300 shadow-2xs cursor-pointer'
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                      alreadyMember
                                        ? 'bg-slate-300 border-slate-300 text-white'
                                        : isChecked
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {group.name || 'Grup Chat'}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                      {group.description || 'Grup Diskusi Mitra & Staf'}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {alreadyMember ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                      Sudah Anggota
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      <Users className="w-3 h-3" />
                                      <span>{group.participantIds.length}</span>
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      <div className="text-[11px] font-medium text-slate-600 pt-1 border-t border-blue-200/70 flex items-center justify-between">
                        <span>
                          {selectedGroupIds.length > 0 ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ Mitra akan otomatis dimasukkan ke {selectedGroupIds.length} group chat terpilih
                            </span>
                          ) : (
                            <span>Tidak memilih group chat (mitra hanya di-approve saja)</span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 sm:px-6 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setMitraToApprove(null)}
                  disabled={actionLoadingId === mitraToApprove.id}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === mitraToApprove.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {actionLoadingId === mitraToApprove.id
                      ? 'Memproses Approve...'
                      : selectedGroupIds.length > 0
                      ? `Setujui & Masukkan ke ${selectedGroupIds.length} Grup`
                      : 'Ya, Setujui & Lulus Verifikasi'}
                  </span>
                </button>
              </div>
            </form>
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
                    placeholder="Alasan penolakan..."
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

      {/* Admin / Staf Full Edit Mitra Modal */}
      <AdminEditMitraModal
        mitra={editingMitra}
        settings={settings}
        currentUser={currentUser}
        onClose={() => setEditingMitra(null)}
        onSave={async (id, payload) => {
          let result: any;
          if (onUpdateMitraProfile) {
            result = await onUpdateMitraProfile(id, payload);
          } else {
            const res = await fetch(`/api/mitra/${id}/profile`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json?.success) {
              throw new Error(json?.message || 'Gagal memperbarui data mitra.');
            }
            result = json;
          }
          if (selectedMitraDetail && selectedMitraDetail.id === id && result?.data) {
            setSelectedMitraDetail(result.data);
          }
          setPanelFeedback({
            type: 'success',
            text:
              result?.message ||
              `Data lengkap Mitra "${result?.data?.fullName || payload.fullName || ''}" berhasil diperbarui.`,
          });
          mitraDt.refresh();
          return result;
        }}
      />

      {/* Modal Batalkan Verifikasi Mitra */}
      {mitraToRevoke && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                    PEMBATALAN VERIFIKASI
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                    Batalkan Verifikasi Mitra
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraToRevoke(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmRevokeSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Status Mitra <strong>{mitraToRevoke.fullName}</strong> ({mitraToRevoke.memberCode}) akan dikembalikan ke{' '}
                <strong className="text-amber-700">Menunggu Verifikasi (Pending)</strong>. Akses Input Klien, ID Card, dan Tools Marketing akan terkunci sementara hingga disetujui kembali.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan / Alasan Pembatalan (Tampil di Portal &amp; Notifikasi Mitra)
                </label>
                <textarea
                  rows={3}
                  required
                  value={revokeReasonInput}
                  onChange={(e) => setRevokeReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMitraToRevoke(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === mitraToRevoke.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                >
                  {actionLoadingId === mitraToRevoke.id ? 'Memproses...' : 'Ya, Batalkan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Info Lengkapi Data Diri Mitra */}
      {mitraToNotifyIncomplete && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Informasikan Lengkapi Data Diri
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kirim pengingat ke {mitraToNotifyIncomplete.fullName} ({mitraToNotifyIncomplete.memberCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraToNotifyIncomplete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendIncompleteNoticeSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-800 mb-2">Pilih Data yang Perlu Dilengkapi:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    new Set([...getMissingMitraFields(mitraToNotifyIncomplete, settings), ...INCOMPLETE_DATA_CHECKLIST])
                  ).map((item) => {
                    const checked = selectedMissingItems.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleMissingChecklistItem(item)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          checked
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pesan Pemberitahuan untuk Mitra *
                </label>
                <textarea
                  rows={4}
                  required
                  value={incompleteMessageInput}
                  onChange={(e) => setIncompleteMessageInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Pesan akan tampil sebagai banner pengingat di Portal Mitra, masuk ke notifikasi aplikasi, dan dikirim ke email Mitra.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {formatWaNumber(mitraToNotifyIncomplete.phone) ? (
                  <a
                    href={`https://wa.me/${formatWaNumber(mitraToNotifyIncomplete.phone)}?text=${encodeURIComponent(
                      incompleteMessageInput.trim()
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Kirim juga via WhatsApp</span>
                  </a>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMitraToNotifyIncomplete(null)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sendingIncompleteNotice}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                  >
                    {sendingIncompleteNotice ? 'Mengirim...' : 'Kirim Pemberitahuan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Masukkan Mitra ke Grup WhatsApp (Single Mitra) */}
      {mitraForWaGroup && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Tambahkan Peserta ke Grup WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {mitraForWaGroup.fullName} · {mitraForWaGroup.phone || 'Belum ada nomor WA'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMitraForWaGroup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleInviteMitraToWaGroup(e, 'add')} className="p-5 overflow-y-auto flex-1 space-y-4">
              {mitraForWaGroup.whatsappGroupInvited && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mitra ini sudah terdaftar sebagai peserta Grup WhatsApp.</span>
                  </div>
                  <button
                    type="button"
                    disabled={savingWaGroup}
                    onClick={(e) => handleInviteMitraToWaGroup(e as any, 'remove')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Keluarkan</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nama Grup WhatsApp Resmi</label>
                <input
                  type="text"
                  value={waGroupNameInput}
                  onChange={(e) => setWaGroupNameInput(e.target.value)}
                  placeholder="Grup WhatsApp Mitra ND Tax & Law"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link Undangan Grup WhatsApp (Opsional — untuk dikirim via WA)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={waGroupLinkInput}
                    onChange={(e) => setWaGroupLinkInput(e.target.value)}
                    placeholder="https://chat.whatsapp.com/xxxxxxxxxxxx"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {waGroupLinkInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(waGroupLinkInput.trim());
                        setCopiedWaLink(true);
                        setTimeout(() => setCopiedWaLink(false), 2500);
                      }}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedWaLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWaLink ? 'Disalin' : 'Salin'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={waCustomNoteInput}
                  onChange={(e) => setWaCustomNoteInput(e.target.value)}
                  placeholder="Selamat bergabung di grup koordinasi resmi Mitra ND Tax & Law..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700">Aksi Cepat Tambah ke WhatsApp:</p>
                <div className="flex flex-wrap items-center gap-2">
                  {formatWaNumber(mitraForWaGroup.phone) ? (
                    <>
                      <a
                        href={`https://wa.me/${formatWaNumber(mitraForWaGroup.phone)}?text=${encodeURIComponent(
                          `Halo ${mitraForWaGroup.fullName}, Anda telah ditambahkan ke ${
                            waGroupNameInput.trim() || 'Grup WhatsApp Mitra ND Tax & Law'
                          }!${
                            waGroupLinkInput.trim()
                              ? `\n\nTautan grup resmi:\n${waGroupLinkInput.trim()}`
                              : ''
                          }${waCustomNoteInput.trim() ? `\n\n${waCustomNoteInput.trim()}` : ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Kirim via WhatsApp ({mitraForWaGroup.phone})</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadMitrasVcf([mitraForWaGroup])}
                        className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>Unduh Kontak (.VCF)</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-amber-700">Mitra belum mengisi nomor WhatsApp.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMitraForWaGroup(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={savingWaGroup}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{savingWaGroup ? 'Menyimpan...' : 'Tambahkan ke Grup WA'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Peserta & Pengaturan Grup WhatsApp Mitra */}
      {isWaGroupConfigModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {waGroupNameInput.trim() || 'Grup WhatsApp Mitra ND Tax & Law'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pilih &amp; tambahkan peserta Mitra ke Grup WhatsApp ({waGroupMemberCount} dari {mitras.length} Mitra terdaftar)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWaGroupConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setWaGroupModalTab('members')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  waGroupModalTab === 'members'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah &amp; Kelola Peserta</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWaGroupModalTab('connection');
                  fetchWaConnectionStatus();
                }}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  waGroupModalTab === 'connection'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {waConnStatus === 'connected' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Koneksi WhatsApp</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    waConnStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setWaGroupModalTab('settings')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  waGroupModalTab === 'settings'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Pengaturan Grup</span>
              </button>
            </div>

            {waModalFeedback && (
              <div
                className={`mx-5 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-start justify-between gap-2 shrink-0 ${
                  waModalFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {waModalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{waModalFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWaModalFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {waGroupModalTab === 'connection' ? (
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    waConnStatus === 'connected'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        waConnStatus === 'connected'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}
                    >
                      {waConnStatus === 'connected' ? (
                        <Wifi className="w-5 h-5" />
                      ) : (
                        <WifiOff className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {waConnStatus === 'connected'
                          ? `WhatsApp Admin Terhubung (+${waConnectedPhone || ''})`
                          : waConnStatus === 'qr'
                            ? 'Scan QR Code dengan WhatsApp Admin Grup'
                            : waConnStatus === 'connecting'
                              ? waStatusDetail || 'Menghubungkan ke server WhatsApp...'
                              : 'WhatsApp Admin Belum Terhubung'}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {waConnStatus === 'connected'
                          ? `${waConnectedName ? `${waConnectedName} · ` : ''}Siap menambahkan & mengeluarkan peserta secara langsung di Grup WhatsApp.`
                          : 'Hubungkan nomor WhatsApp yang menjadi Admin Grup agar penambahan peserta langsung masuk ke Grup WhatsApp asli.'}
                      </p>
                    </div>
                  </div>

                  {waConnStatus === 'connected' ? (
                    <button
                      type="button"
                      disabled={savingWaGroup}
                      onClick={handleDisconnectWhatsApp}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold cursor-pointer shrink-0"
                    >
                      Putuskan (Logout)
                    </button>
                  ) : waConnStatus === 'connecting' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-2 rounded-xl bg-emerald-600/15 text-emerald-900 text-xs font-bold inline-flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghubungkan...</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConnectWhatsAppQr(true)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        title="Reset koneksi & muat ulang QR baru"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Ulang</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectWhatsAppQr(waConnStatus === 'qr')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{waConnStatus === 'qr' ? 'Muat Ulang QR' : 'Tampilkan QR WhatsApp'}</span>
                    </button>
                  )}
                </div>

                {waConnError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{waConnError}</span>
                    </div>
                    {waConnStatus === 'disconnected' && (
                      <button
                        type="button"
                        onClick={() => handleConnectWhatsAppQr(true)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-center"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Coba Lagi</span>
                      </button>
                    )}
                  </div>
                )}

                {waConnStatus === 'qr' && waQrDataUrl && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
                    <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-sm shrink-0">
                      <img src={waQrDataUrl} alt="QR WhatsApp Linked Devices" className="w-52 h-52 object-contain" />
                    </div>
                    <div className="space-y-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900 text-sm">Cara Menghubungkan WhatsApp Admin Grup:</p>
                      <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                        <li>Buka aplikasi <strong>WhatsApp</strong> di HP Admin Grup <strong>{waGroupNameInput || 'MITRA NDTAXANDLAW'}</strong>.</li>
                        <li>Ketuk menu <strong>Perangkat Tertaut (Linked Devices)</strong> &rarr; <strong>Tautkan Perangkat</strong>.</li>
                        <li>Arahkan kamera ke QR Code di samping. Setelah terhubung, pilih grup tujuan di bawah ini.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {waConnStatus === 'connected' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Pilih Grup WhatsApp Tujuan</h4>
                        <p className="text-[11px] text-slate-500">
                          Pilih grup tempat Anda menjadi Admin agar peserta otomatis masuk ke grup tersebut.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchWaGroupsList}
                        disabled={loadingWaGroups}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingWaGroups ? 'animate-spin' : ''}`} />
                        <span>Muat Grup</span>
                      </button>
                    </div>

                    {loadingWaGroups ? (
                      <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2 border border-slate-200 rounded-xl">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Mengambil daftar Grup WhatsApp dari HP Admin...</span>
                      </div>
                    ) : waGroupsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 border border-slate-200 rounded-xl">
                        Belum ada Grup WhatsApp ditemukan. Klik &ldquo;Muat Grup&rdquo; untuk menyegarkan.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        {waGroupsList.map((g) => {
                          const isSelected = waGroupJidInput === g.id;
                          return (
                            <div
                              key={g.id}
                              className={`p-3 flex items-center justify-between gap-3 ${
                                isSelected ? 'bg-emerald-50/70' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 truncate">{g.subject}</span>
                                  {g.isAdmin ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      Admin Grup
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                      Bukan Admin
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      Grup Aktif ✓
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {g.participantsCount} anggota
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={savingWaGroup}
                                onClick={() => handleSelectTargetWaGroup(g)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isSelected ? 'Sinkronkan Ulang' : 'Pilih Grup Ini'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : waGroupModalTab === 'members' ? (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Live WhatsApp Connection Status Strip */}
                {waConnStatus === 'connected' && waGroupJidInput ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                      <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Terhubung ke WhatsApp (+{waConnectedPhone}) · Grup: <strong>{waGroupNameInput}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={syncingWaMembers}
                      onClick={() => handleSyncRealWaMembers()}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingWaMembers ? 'animate-spin' : ''}`} />
                      <span>{syncingWaMembers ? 'Menyinkronkan...' : 'Sinkronkan Peserta Asli WA'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-start gap-2 text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {waConnStatus === 'connected'
                          ? 'WhatsApp Admin sudah terhubung, silakan pilih Grup WhatsApp tujuan terlebih dahulu.'
                          : 'WhatsApp Admin belum terhubung. Scan QR WhatsApp Admin Grup terlebih dahulu agar tombol Tambahkan benar-benar memasukkan peserta ke Grup WhatsApp.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWaGroupModalTab('connection');
                        if (waConnStatus === 'disconnected') handleConnectWhatsAppQr();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{waConnStatus === 'connected' ? 'Pilih Grup WA' : 'Hubungkan WhatsApp (Scan QR)'}</span>
                    </button>
                  </div>
                )}

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={waMemberSearch}
                      onChange={(e) => setWaMemberSearch(e.target.value)}
                      placeholder="Cari nama, nomor WhatsApp, atau kode mitra..."
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {([
                      { id: 'all', label: 'Semua' },
                      { id: 'not_joined', label: 'Belum Masuk' },
                      { id: 'joined', label: 'Di Grup WA' },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setWaMemberFilter(tab.id)}
                        className={`px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          waMemberFilter === tab.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selection & Bulk Action Bar */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const notJoinedIds = filteredWaModalMitras
                          .filter((m) => !m.whatsappGroupInvited)
                          .map((m) => m.id);
                        setSelectedWaMitraIds(notJoinedIds);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer"
                    >
                      Pilih Belum Masuk
                    </button>
                    {selectedWaMitraIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedWaMitraIds([])}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-[11px] cursor-pointer"
                      >
                        Batal Pilih ({selectedWaMitraIds.length})
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedWaMitraIds.length === 0}
                      onClick={() => {
                        const chosen = mitras.filter((m) => selectedWaMitraIds.includes(m.id));
                        const nums = chosen.map((m) => formatWaNumber(m.phone)).filter(Boolean);
                        if (nums.length > 0) {
                          navigator.clipboard.writeText(nums.join('\n'));
                          setCopiedWaPhones(true);
                          setTimeout(() => setCopiedWaPhones(false), 2500);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedWaPhones ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWaPhones ? 'Nomor Disalin' : 'Salin Nomor'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={selectedWaMitraIds.length === 0}
                      onClick={() => {
                        const chosen = mitras.filter((m) => selectedWaMitraIds.includes(m.id));
                        downloadMitrasVcf(chosen);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Unduh Kontak (.VCF)</span>
                    </button>
                    <button
                      type="button"
                      disabled={selectedWaMitraIds.length === 0 || savingWaGroup}
                      onClick={() => handleBatchWaGroupMembers(selectedWaMitraIds, 'add')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {savingWaGroup
                          ? 'Memproses...'
                          : `Tambahkan (${selectedWaMitraIds.length}) ke Grup WA`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Mitra List */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {filteredWaModalMitras.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Tidak ada Mitra yang sesuai filter.
                    </div>
                  ) : (
                    filteredWaModalMitras.map((m) => {
                      const isChecked = selectedWaMitraIds.includes(m.id);
                      const waNum = formatWaNumber(m.phone);
                      return (
                        <div
                          key={m.id}
                          className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                            isChecked ? 'bg-emerald-50/50' : 'bg-white hover:bg-slate-50/70'
                          }`}
                        >
                          <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedWaMitraIds((prev) => [...prev, m.id]);
                                } else {
                                  setSelectedWaMitraIds((prev) => prev.filter((id) => id !== m.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate">{m.fullName}</span>
                                {m.whatsappGroupInvited ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    Di Grup WA ✓
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                    Belum Masuk
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {m.phone || 'Belum ada nomor WA'} · {m.memberCode}
                              </p>
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {waNum && (
                              <a
                                href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                                  `Halo ${m.fullName}, Anda telah ditambahkan ke ${
                                    waGroupNameInput.trim() || 'Grup WhatsApp Mitra ND Tax & Law'
                                  }!${
                                    waGroupLinkInput.trim()
                                      ? `\n\nTautan grup resmi:\n${waGroupLinkInput.trim()}`
                                      : ''
                                  }`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-emerald-800 border border-[#25D366]/30 text-[11px] font-bold inline-flex items-center gap-1"
                                title="Kirim pesan WhatsApp ke Mitra ini"
                              >
                                <ExternalLink className="w-3 h-3 text-[#25D366]" />
                                <span>WA</span>
                              </a>
                            )}
                            {m.whatsappGroupInvited ? (
                              <button
                                type="button"
                                disabled={savingWaGroup}
                                onClick={() => handleBatchWaGroupMembers([m.id], 'remove')}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Keluarkan</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={savingWaGroup}
                                onClick={() => handleBatchWaGroupMembers([m.id], 'add')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Tambahkan</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveWaGroupConfig} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Nama Grup WhatsApp Resmi</label>
                  <input
                    type="text"
                    required
                    value={waGroupNameInput}
                    onChange={(e) => setWaGroupNameInput(e.target.value)}
                    placeholder="Grup WhatsApp Mitra ND Tax & Law"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tautan Undangan Grup WhatsApp (Opsional — HTTPS)
                  </label>
                  <input
                    type="url"
                    value={waGroupLinkInput}
                    onChange={(e) => setWaGroupLinkInput(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Digunakan khusus oleh Admin saat mengirim pesan undangan langsung ke WhatsApp Mitra. Tidak ditampilkan sebagai tombol di portal Mitra.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsWaGroupConfigModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={savingWaGroup}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                  >
                    {savingWaGroup ? 'Menyimpan...' : 'Simpan Pengaturan Grup'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
