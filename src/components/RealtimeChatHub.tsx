import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Users,
  Plus,
  Image as ImageIcon,
  Smile,
  Reply,
  Forward,
  Edit3,
  Trash2,
  X,
  CheckCheck,
  ExternalLink,
  Shield,
  Lock,
  Copy,
  Share2,
  UserPlus,
  Clock,
  Eye,
  Power,
  ArrowLeft,
  Info,
  Check,
  Link2,
  Maximize2,
  MessageCircle,
  Mail,
  Volume2,
  VolumeX,
  BellRing,
  Pin,
  PinOff,
  Camera,
  ChevronDown,
  ChevronUp,
  Save,
  Download,
  FolderOpen,
  RotateCcw,
  FileText,
  RefreshCw,
  Paperclip,
  Film,
  Loader2,
} from 'lucide-react';
import {
  ChatParticipant,
  ChatRoom,
  ChatMessage,
  ChatReplyQuote,
  ChatLinkPreview,
} from '../types';
import { useConfirm, useAlert } from './ConfirmDialogModal';
import { Skeleton } from './SkeletonLoader';

interface RealtimeChatHubProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'staff' | 'mitra';
  currentUserAvatar: string;
  currentUserCode?: string;
  chatEnabled: boolean;
  isChatPageOpen: boolean;
  initialRoomId?: string | null;
  onSelectedRoomChange?: (roomId: string | null) => void;
  onOpenChatPage: (roomId?: string) => void;
  onToggleChatEnabled?: (enabled: boolean) => Promise<void>;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Populer & Kerja',
    emojis: ['😊', '👍', '🙏', '🤝', '✅', '📄', '📊', '💼', '📌', '🔥', '🎉', '🚀', '✨', '💡', '⚠️', '📅'],
  },
  {
    label: 'Ekspresi & Pajak',
    emojis: ['😄', '🙌', '👏', '💪', '🫡', '🧐', '📝', '📁', '💰', '🏦', '⚖️', '🏛️', '📈', '🛡️', '❤️', '🌟'],
  },
];

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatChatDateBadge(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Hari Ini';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"]+/i);
  return match ? match[0] : null;
}

// Shared AudioContext for Chat Notification Ringtone
let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a pleasant, unmistakable multi-tone notification ringtone chime
 * using Web Audio API (no external audio file dependencies).
 */
export function playChatNotificationRingtone(): void {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Melodic 3-note crystalline chime (E5 -> G#5 -> B5 -> E6)
    const notes = [
      { freq: 659.25, start: 0, duration: 0.14, gain: 0.22 },
      { freq: 830.61, start: 0.11, duration: 0.14, gain: 0.24 },
      { freq: 987.77, start: 0.22, duration: 0.18, gain: 0.26 },
      { freq: 1318.51, start: 0.34, duration: 0.42, gain: 0.28 },
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 2, now + start);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.06, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      harmonic.start(now + start);
      osc.stop(now + start + duration + 0.02);
      harmonic.stop(now + start + duration + 0.02);
    });
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

async function compressImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.72
): Promise<{
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  name: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi kompresi kanvas gambar'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        // Calculate approximate byte size of base64 payload
        const base64Length = compressedDataUrl.split(',')[1]?.length || 0;
        const compressedBytes = Math.round((base64Length * 3) / 4);
        resolve({
          dataUrl: compressedDataUrl,
          originalSize: file.size,
          compressedSize: compressedBytes,
          name: file.name.replace(/\.[^.]+$/, '') + '-compressed.jpg',
        });
      };
      img.onerror = () => reject(new Error('Gagal memuat file gambar'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

const CHAT_MEDIA_ACCEPT =
  'image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/3gpp,video/*';
const CHAT_DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip';
const MAX_CHAT_FILE_BYTES = 30 * 1024 * 1024;
const ALLOWED_CHAT_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp4',
  'webm',
  'mov',
  'm4v',
  '3gp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'rtf',
  'odt',
  'ods',
  'odp',
  'zip',
  'rar',
  '7z',
]);

type ChatAttachmentKind = 'image' | 'video' | 'document';

function isImageAttachment(url?: string, name?: string): boolean {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return false;
  if (safeUrl.startsWith('data:image/')) return true;
  const target = `${safeUrl} ${name || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg)(\b|\?|$)/i.test(target);
}

function isVideoAttachment(url?: string, name?: string): boolean {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return false;
  if (safeUrl.startsWith('data:video/')) return true;
  const target = `${safeUrl} ${name || ''}`.toLowerCase();
  return /\.(mp4|webm|mov|m4v|3gp)(\b|\?|$)/i.test(target);
}

function getVideoMimeType(url?: string, name?: string): string {
  const target = `${url || ''} ${name || ''}`.toLowerCase();
  if (target.includes('video/webm') || /\.webm(\b|\?|$)/i.test(target)) return 'video/webm';
  if (target.includes('video/quicktime') || /\.mov(\b|\?|$)/i.test(target)) return 'video/mp4';
  if (target.includes('video/3gpp') || /\.3gp(\b|\?|$)/i.test(target)) return 'video/3gpp';
  return 'video/mp4';
}

function isPdfAttachment(url?: string, name?: string): boolean {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return false;
  if (safeUrl.startsWith('data:application/pdf')) return true;
  const target = `${safeUrl} ${name || ''}`.toLowerCase();
  return /\.pdf(\b|\?|$)/i.test(target);
}

function getAttachmentKind(url?: string, name?: string): ChatAttachmentKind {
  if (isImageAttachment(url, name)) return 'image';
  if (isVideoAttachment(url, name)) return 'video';
  return 'document';
}

function getAttachmentSummaryText(url?: string, name?: string): string {
  const kind = getAttachmentKind(url, name);
  if (kind === 'image') return '📷 Mengirim gambar';
  if (kind === 'video') return '🎬 Mengirim video';
  return `📄 ${name || 'Mengirim dokumen'}`;
}

function getAttachmentPrefixIcon(url?: string, name?: string): string {
  const kind = getAttachmentKind(url, name);
  if (kind === 'image') return '📷 ';
  if (kind === 'video') return '🎬 ';
  return '📄 ';
}

function getDocumentBadgeMeta(fileName?: string, url?: string): {
  extLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const raw = String(fileName || url || '').split('?')[0];
  const extMatch = /\.([a-z0-9]{1,6})$/i.exec(raw);
  const ext = (extMatch?.[1] || 'file').toLowerCase();
  const extLabel = ext.toUpperCase().slice(0, 5);

  if (ext === 'pdf') {
    return {
      extLabel: 'PDF',
      bgClass: 'bg-rose-100',
      textClass: 'text-rose-700',
      borderClass: 'border-rose-200',
    };
  }
  if (ext === 'doc' || ext === 'docx' || ext === 'odt' || ext === 'rtf') {
    return {
      extLabel,
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200',
    };
  }
  if (ext === 'xls' || ext === 'xlsx' || ext === 'ods' || ext === 'csv') {
    return {
      extLabel,
      bgClass: 'bg-emerald-100',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200',
    };
  }
  if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') {
    return {
      extLabel,
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200',
    };
  }
  if (ext === 'zip' || ext === 'rar' || ext === '7z') {
    return {
      extLabel,
      bgClass: 'bg-violet-100',
      textClass: 'text-violet-700',
      borderClass: 'border-violet-200',
    };
  }
  return {
    extLabel,
    bgClass: 'bg-slate-200',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
  };
}

function readFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export const RealtimeChatHub: React.FC<RealtimeChatHubProps> = ({
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserAvatar,
  currentUserCode,
  chatEnabled,
  isChatPageOpen,
  initialRoomId,
  onSelectedRoomChange,
  onOpenChatPage,
  onToggleChatEnabled,
}) => {
  const confirm = useConfirm();
  const showAlert = useAlert();

  const isAdminMonitor = currentUserRole === 'admin';

  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() =>
    isChatPageOpen ? initialRoomId ?? null : null
  );
  const [draftDirectRoom, setDraftDirectRoom] = useState<ChatRoom | null>(null);

  // Sidebar Filters & Tabs
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarRoleFilter, setSidebarRoleFilter] = useState<'all' | 'staff' | 'mitra'>('all');
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'groups' | 'contacts'>('chats');

  // In-room Message Search
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Composer State
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatReplyQuote | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingImage, setPendingImage] = useState<{
    dataUrl: string;
    originalSize: number;
    compressedSize: number;
    name: string;
    kind?: ChatAttachmentKind;
  } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [composerLinkPreview, setComposerLinkPreview] = useState<ChatLinkPreview | null>(null);
  const [isLoadingLinkPreview, setIsLoadingLinkPreview] = useState(false);
  const [isChatInitialLoading, setIsChatInitialLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState<string>('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  // Group Info / Edit Profile, Description & Members Modal
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState<string>('');
  const [removeGroupAvatarFlag, setRemoveGroupAvatarFlag] = useState(false);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [groupInfoMemberSearch, setGroupInfoMemberSearch] = useState('');

  // Pinned Messages Expandable List
  const [showAllPinnedList, setShowAllPinnedList] = useState(false);
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null);

  // Admin Chat File Gallery & Admin Chat Reset
  const [showAdminGalleryModal, setShowAdminGalleryModal] = useState(false);
  const [adminGalleryFiles, setAdminGalleryFiles] = useState<
    Array<{
      id: string;
      messageId: string;
      roomId: string;
      roomName: string;
      roomType: 'direct' | 'group';
      senderId: string;
      senderName: string;
      senderRole: string;
      fileUrl: string;
      fileName: string;
      isImage: boolean;
      isVideo?: boolean;
      byteSize: number;
      formattedSize: string;
      caption: string;
      createdAt: string;
    }>
  >([]);
  const [adminGallerySummary, setAdminGallerySummary] = useState<{
    totalFiles: number;
    totalBytes: number;
    totalFormattedSize: string;
  }>({ totalFiles: 0, totalBytes: 0, totalFormattedSize: '0 B' });
  const [isLoadingAdminGallery, setIsLoadingAdminGallery] = useState(false);
  const [adminGallerySearch, setAdminGallerySearch] = useState('');
  const [adminGalleryFilter, setAdminGalleryFilter] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

  const [showAdminResetModal, setShowAdminResetModal] = useState(false);
  const [selectedResetPeriod, setSelectedResetPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('3m');
  const [adminResetStats, setAdminResetStats] = useState<
    Record<'3m' | '6m' | '1y' | 'all', { messages: number; files: number; totalBytes: number; formattedSize: string }>
  >({
    '3m': { messages: 0, files: 0, totalBytes: 0, formattedSize: '0 B' },
    '6m': { messages: 0, files: 0, totalBytes: 0, formattedSize: '0 B' },
    '1y': { messages: 0, files: 0, totalBytes: 0, formattedSize: '0 B' },
    all: { messages: 0, files: 0, totalBytes: 0, formattedSize: '0 B' },
  });
  const [isLoadingResetStats, setIsLoadingResetStats] = useState(false);
  const [isExecutingReset, setIsExecutingReset] = useState(false);

  // Real-Time In-App Chat Notification Toast (Personal Chat, Group Chat & Added to Group)
  const [chatToast, setChatToast] = useState<{
    id: string;
    roomId: string;
    roomTitle: string;
    isGroup: boolean;
    isSystem: boolean;
    senderName: string;
    avatar: string;
    previewText: string;
    createdAt: string;
  } | null>(null);
  const chatToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forward Modal & Multi-Select Forward Mode
  const [forwardingMessages, setForwardingMessages] = useState<ChatMessage[]>([]);
  const [forwardRoomSearch, setForwardRoomSearch] = useState('');
  const [isForwardSelectMode, setIsForwardSelectMode] = useState(false);
  const [selectedForwardMsgIds, setSelectedForwardMsgIds] = useState<string[]>([]);
  const [isForwardingBatch, setIsForwardingBatch] = useState(false);

  // WhatsApp-style Floating Context Menu (Right-click, Desktop Hover Chevron, Mobile Long-Press)
  const [contextMenu, setContextMenu] = useState<{
    message: ChatMessage;
    x: number;
    y: number;
  } | null>(null);

  // Image Lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name?: string } | null>(null);

  // Highlighted message when clicking a quote reply or pinned message
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Clock tick every second so 5-minute edit/recall window updates live
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Unread indicator tracking
  const [lastSeenByRoom, setLastSeenByRoom] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`nd_chat_seen_${currentUserId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const newGroupAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const editGroupAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedRoomIdRef = useRef<string | null>(selectedRoomId);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const contextMenuOpenedAtRef = useRef<number>(0);
  const suppressNextBackdropClickUntilRef = useRef<number>(0);
  const isChatPageOpenRef = useRef<boolean>(isChatPageOpen);
  const roomsRef = useRef<ChatRoom[]>(rooms);
  const participantsRef = useRef<ChatParticipant[]>(participants);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
    setShowAllPinnedList(false);
  }, [selectedRoomId]);

  useEffect(() => {
    isChatPageOpenRef.current = isChatPageOpen;
  }, [isChatPageOpen]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Honor initialRoomId when opening Chat from a notification toast or browser Back/Forward
  useEffect(() => {
    if (!isChatPageOpen) return;
    const targetRoom = initialRoomId ?? null;
    if (selectedRoomIdRef.current !== targetRoom) {
      setSelectedRoomId(targetRoom);
    }
  }, [isChatPageOpen, initialRoomId]);

  // Report user-selected chat room changes upward for browser Back/Forward history
  useEffect(() => {
    if (!isChatPageOpen || !onSelectedRoomChange) return;
    const expected = initialRoomId ?? null;
    if (selectedRoomId !== expected) {
      onSelectedRoomChange(selectedRoomId);
    }
  }, [selectedRoomId, isChatPageOpen]);

  // Helper to show a clickable real-time chat toast banner
  const triggerChatNotificationToast = useCallback(
    (incoming: ChatMessage, roomHint?: ChatRoom) => {
      // Skip if user is already viewing this exact room on the Chat page
      if (isChatPageOpenRef.current && selectedRoomIdRef.current === incoming.roomId) {
        return;
      }
      const targetRoom =
        roomHint || roomsRef.current.find((r) => r.id === incoming.roomId);
      const isGroup = targetRoom?.type === 'group';
      const roomTitle = isGroup
        ? targetRoom?.name || 'Grup Diskusi'
        : incoming.senderName || targetRoom?.name || 'Pesan Baru';
      const avatar = isGroup
        ? targetRoom?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            roomTitle
          )}&background=0f766e&color=fff&bold=true`
        : incoming.senderAvatar ||
          participantsRef.current.find((p) => p.id === incoming.senderId)?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            incoming.senderName || 'User'
          )}&background=1d4ed8&color=fff`;

      const previewText =
        incoming.text ||
        (incoming.imageUrl
          ? getAttachmentSummaryText(incoming.imageUrl, incoming.imageName)
          : 'Pesan baru masuk');

      setChatToast({
        id: incoming.id,
        roomId: incoming.roomId,
        roomTitle,
        isGroup: Boolean(isGroup),
        isSystem: Boolean(incoming.isSystemMessage),
        senderName: incoming.senderName,
        avatar,
        previewText,
        createdAt: incoming.createdAt,
      });

      if (chatToastTimerRef.current) {
        clearTimeout(chatToastTimerRef.current);
      }
      chatToastTimerRef.current = setTimeout(() => {
        setChatToast((prev) => (prev?.id === incoming.id ? null : prev));
      }, 7500);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (chatToastTimerRef.current) clearTimeout(chatToastTimerRef.current);
    };
  }, []);

  // Notification Ringtone state & refs
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nd_chat_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef<boolean>(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try {
      localStorage.setItem('nd_chat_sound_enabled', soundEnabled ? 'true' : 'false');
    } catch {}
  }, [soundEnabled]);

  // Unlock Web Audio API on first user gesture so background ringtones play reliably
  useEffect(() => {
    const unlockAudio = () => {
      getOrCreateAudioContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Live 1s timer for 5-minute edit/recall countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial chat state
  const fetchChatState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/state?userId=${encodeURIComponent(currentUserId)}&role=${encodeURIComponent(currentUserRole)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.participants)) setParticipants(data.participants);
      const fetchedRooms: ChatRoom[] = Array.isArray(data.rooms) ? data.rooms : [];
      if (Array.isArray(data.rooms)) setRooms(fetchedRooms);
      if (Array.isArray(data.messages)) {
        const fetchedMessages: ChatMessage[] = data.messages;
        if (initialFetchDoneRef.current) {
          const newIncomingMsgs = fetchedMessages.filter(
            (m) =>
              !knownMessageIdsRef.current.has(m.id) &&
              m.senderId !== currentUserId &&
              !m.isDeleted
          );
          if (newIncomingMsgs.length > 0) {
            if (soundEnabledRef.current) {
              playChatNotificationRingtone();
            }
            const latestNew = newIncomingMsgs[newIncomingMsgs.length - 1];
            const matchedRoom = fetchedRooms.find((r) => r.id === latestNew.roomId);
            triggerChatNotificationToast(latestNew, matchedRoom);
          }
        }
        fetchedMessages.forEach((m) => knownMessageIdsRef.current.add(m.id));
        initialFetchDoneRef.current = true;
        setMessages(fetchedMessages);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsChatInitialLoading(false);
    }
  }, [currentUserId, currentUserRole, triggerChatNotificationToast]);

  useEffect(() => {
    fetchChatState();
    const pollInterval = setInterval(fetchChatState, 8000);
    return () => clearInterval(pollInterval);
  }, [fetchChatState]);

  const loadAdminChatFiles = useCallback(async () => {
    if (!isAdminMonitor) return;
    setIsLoadingAdminGallery(true);
    try {
      const qs = new URLSearchParams({
        actorRole: currentUserRole,
        actorId: currentUserId,
      });
      const res = await fetch(`/api/chat/admin/files?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAdminGalleryFiles(Array.isArray(json.data) ? json.data : []);
        if (json.summary) {
          setAdminGallerySummary(json.summary);
        }
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setIsLoadingAdminGallery(false);
    }
  }, [isAdminMonitor, currentUserRole, currentUserId]);

  const loadAdminResetStats = useCallback(async () => {
    if (!isAdminMonitor) return;
    setIsLoadingResetStats(true);
    try {
      const qs = new URLSearchParams({
        actorRole: currentUserRole,
        actorId: currentUserId,
      });
      const res = await fetch(`/api/chat/admin/reset-stats?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.stats) {
          setAdminResetStats(json.stats);
        }
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setIsLoadingResetStats(false);
    }
  }, [isAdminMonitor, currentUserRole, currentUserId]);

  const handleOpenAdminGallery = () => {
    setShowAdminGalleryModal(true);
    void loadAdminChatFiles();
  };

  const handleOpenAdminReset = () => {
    setShowAdminResetModal(true);
    void loadAdminResetStats();
  };

  const handleAdminDeleteChatFile = async (item: { messageId: string; fileName: string }) => {
    if (!isAdminMonitor || deletingGalleryId) return;
    const ok = await confirm({
      title: 'Hapus File Chat',
      message: `Hapus "${item.fileName}" secara permanen dari server?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingGalleryId(item.messageId);
    try {
      const res = await fetch(`/api/chat/admin/files/${encodeURIComponent(item.messageId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: currentUserRole,
          actorId: currentUserId,
          actorName: currentUserName,
        }),
      });
      if (res.ok) {
        await Promise.all([loadAdminChatFiles(), fetchChatState()]);
        showAlert({
          type: 'success',
          title: 'File Dihapus',
          message: `"${item.fileName}" berhasil dihapus.`,
        });
      }
    } finally {
      setDeletingGalleryId(null);
    }
  };

  const handleAdminResetChat = async () => {
    if (!isAdminMonitor || isExecutingReset) return;
    const targetStat = adminResetStats[selectedResetPeriod];
    const periodLabel =
      selectedResetPeriod === '3m'
        ? '> 3 Bulan Lalu'
        : selectedResetPeriod === '6m'
        ? '> 6 Bulan Lalu'
        : selectedResetPeriod === '1y'
        ? '> 1 Tahun Lalu'
        : 'Semua Chat';

    const ok = await confirm({
      title: `Reset Chat (${periodLabel})`,
      message: `${targetStat.messages} pesan & ${targetStat.files} file (${targetStat.formattedSize}) akan dihapus permanen.`,
      confirmText: 'Reset Chat',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!ok) return;

    setIsExecutingReset(true);
    try {
      const res = await fetch('/api/chat/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: selectedResetPeriod,
          actorRole: currentUserRole,
          actorId: currentUserId,
          actorName: currentUserName,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await Promise.all([fetchChatState(), loadAdminResetStats()]);
        setShowAdminResetModal(false);
        showAlert({
          type: 'success',
          title: 'Reset Chat Berhasil',
          message: `${json.deletedMessages || 0} pesan & ${json.deletedFiles || 0} file dihapus.`,
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Gagal Reset Chat',
          message: json.message || 'Gagal memproses reset chat.',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Gagal Reset Chat',
        message: 'Terjadi kesalahan koneksi server.',
      });
    } finally {
      setIsExecutingReset(false);
    }
  };

  // Connect WebSocket for instant real-time updates
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${encodeURIComponent(
          currentUserId
        )}&role=${encodeURIComponent(currentUserRole)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'chat:sync') {
              fetchChatState();
            } else if (payload.type === 'chat:message_created' && payload.message) {
              const incoming: ChatMessage = payload.message;
              const isNewMsg = !knownMessageIdsRef.current.has(incoming.id);
              knownMessageIdsRef.current.add(incoming.id);

              const roomForMsg: ChatRoom | undefined = payload.room;
              const userCanSeeRoom =
                isAdminMonitor ||
                !roomForMsg ||
                roomForMsg.participantIds.includes(currentUserId);

              if (
                isNewMsg &&
                incoming.senderId !== currentUserId &&
                !incoming.isDeleted &&
                userCanSeeRoom
              ) {
                if (soundEnabledRef.current) {
                  playChatNotificationRingtone();
                }
                triggerChatNotificationToast(incoming, roomForMsg);
              }

              setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
              });
              if (payload.room) {
                const updatedRoom: ChatRoom = payload.room;
                setDraftDirectRoom((prev) =>
                  prev && prev.id === updatedRoom.id ? null : prev
                );
                setRooms((prev) => {
                  const canSee =
                    isAdminMonitor || updatedRoom.participantIds.includes(currentUserId);
                  if (!canSee) return prev;
                  const exists = prev.some((r) => r.id === updatedRoom.id);
                  if (exists) {
                    return prev
                      .map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
                      .sort(
                        (a, b) =>
                          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                      );
                  }
                  return [updatedRoom, ...prev];
                });
              }
            } else if (payload.type === 'chat:message_updated' && payload.message) {
              const updated: ChatMessage = payload.message;
              setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              if (payload.room) {
                const updatedRoom: ChatRoom = payload.room;
                setRooms((prev) =>
                  prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
                );
              }
            } else if (payload.type === 'chat:room_updated' && payload.room) {
              const updatedRoom: ChatRoom = payload.room;
              setRooms((prev) => {
                if (updatedRoom.type === 'direct' && !updatedRoom.lastMessageAt) {
                  return prev;
                }
                const canSee =
                  isAdminMonitor || updatedRoom.participantIds.includes(currentUserId);
                if (!canSee) return prev.filter((r) => r.id !== updatedRoom.id);
                const exists = prev.some((r) => r.id === updatedRoom.id);
                if (exists) {
                  return prev
                    .map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                }
                return [updatedRoom, ...prev];
              });
            } else if (payload.type === 'chat:room_deleted' && payload.roomId) {
              setRooms((prev) => prev.filter((r) => r.id !== payload.roomId));
              setSelectedRoomId((prev) => (prev === payload.roomId ? null : prev));
            }
          } catch {
            // Ignore malformed WS message
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            reconnectTimer = setTimeout(connectWs, 3500);
          }
        };
      } catch {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [currentUserId, currentUserRole, isAdminMonitor, fetchChatState, triggerChatNotificationToast]);

  // Requirement 9: Pressing ESC when a chat is open closes the active chat (selectedRoomId -> null)
  // while keeping the user on the dedicated Chat page so they can select another user to chat with.
  useEffect(() => {
    if (!isChatPageOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (lightboxImage) {
          setLightboxImage(null);
          return;
        }
        if (forwardingMessages.length > 0) {
          setForwardingMessages([]);
          return;
        }
        if (showCreateGroupModal) {
          setShowCreateGroupModal(false);
          return;
        }
        if (showGroupInfoModal) {
          setShowGroupInfoModal(false);
          return;
        }
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          return;
        }
        if (isForwardSelectMode) {
          setIsForwardSelectMode(false);
          setSelectedForwardMsgIds([]);
          return;
        }
        if (editingMessage) {
          setEditingMessage(null);
          setInputText('');
          return;
        }
        if (replyingTo) {
          setReplyingTo(null);
          return;
        }
        if (selectedRoomId) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setSelectedRoomId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isChatPageOpen,
    selectedRoomId,
    contextMenu,
    lightboxImage,
    forwardingMessages.length,
    isForwardSelectMode,
    showCreateGroupModal,
    showGroupInfoModal,
    showEmojiPicker,
    editingMessage,
    replyingTo,
  ]);

  // Detect URL in composer and fetch WhatsApp-style link metadata preview
  useEffect(() => {
    const detectedUrl = extractFirstUrl(inputText);
    if (!detectedUrl) {
      setComposerLinkPreview(null);
      return;
    }
    if (composerLinkPreview?.url === detectedUrl) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingLinkPreview(true);
      try {
        const res = await fetch(
          `/api/chat/link-preview?url=${encodeURIComponent(detectedUrl)}`
        );
        if (res.ok && !cancelled) {
          const preview = await res.json();
          if (preview && preview.title) {
            setComposerLinkPreview(preview);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingLinkPreview(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputText, composerLinkPreview?.url]);

  // Mark room as seen when selected or new message arrives in open room
  useEffect(() => {
    if (!selectedRoomId || !isChatPageOpen) return;
    const nowIso = new Date().toISOString();
    setLastSeenByRoom((prev) => {
      const next = { ...prev, [selectedRoomId]: nowIso };
      try {
        localStorage.setItem(`nd_chat_seen_${currentUserId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [selectedRoomId, isChatPageOpen, messages.length, currentUserId]);

  // Auto scroll to bottom when opening room or receiving new message
  const selectedRoomMessages = useMemo(() => {
    if (!selectedRoomId) return [];
    return messages
      .filter((m) => m.roomId === selectedRoomId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId && isChatPageOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRoomId, selectedRoomMessages.length, isChatPageOpen]);

  // Clear temporary unsent direct chat draft, context menu, and forward selection whenever navigating back or switching rooms
  useEffect(() => {
    if (draftDirectRoom && selectedRoomId !== draftDirectRoom.id) {
      setDraftDirectRoom(null);
    }
    setContextMenu(null);
    setIsForwardSelectMode(false);
    setSelectedForwardMsgIds([]);
  }, [selectedRoomId, draftDirectRoom]);

  // Visible rooms for current user:
  // - Admin: all rooms (1-on-1 & group) for monitoring
  // - Mitra & Staf: ONLY rooms where room.participantIds.includes(currentUserId)
  // - Direct 1-on-1 rooms only appear in chat history once at least 1 message has been sent
  //   (including messages that were later recalled/deleted).
  const visibleRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        if (!isAdminMonitor && !room.participantIds.includes(currentUserId)) return false;
        if (room.type === 'direct') {
          const hasHistory =
            Boolean(room.lastMessageAt) || messages.some((m) => m.roomId === room.id);
          if (!hasHistory) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [rooms, messages, isAdminMonitor, currentUserId]);

  // Unread messages count across visible rooms
  const unreadCountByRoom = useMemo(() => {
    const map: Record<string, number> = {};
    for (const room of visibleRooms) {
      const lastSeen = lastSeenByRoom[room.id];
      const count = messages.filter(
        (m) =>
          m.roomId === room.id &&
          m.senderId !== currentUserId &&
          !m.isDeleted &&
          (!lastSeen || new Date(m.createdAt).getTime() > new Date(lastSeen).getTime())
      ).length;
      map[room.id] = count;
    }
    return map;
  }, [visibleRooms, messages, lastSeenByRoom, currentUserId]);

  const totalUnreadCount = useMemo(() => {
    return (Object.values(unreadCountByRoom) as number[]).reduce((acc, n) => acc + n, 0);
  }, [unreadCountByRoom]);

  const groupUnreadCount = useMemo(() => {
    return visibleRooms
      .filter((r) => r.type === 'group')
      .reduce((acc, r) => acc + (unreadCountByRoom[r.id] || 0), 0);
  }, [visibleRooms, unreadCountByRoom]);

  // Helper to resolve display title, subtitle, and avatar for a room
  const getRoomDisplayMeta = useCallback(
    (room: ChatRoom) => {
      if (room.type === 'group') {
        const memberNames = room.participantIds
          .map((id) => participants.find((p) => p.id === id)?.name)
          .filter(Boolean);
        return {
          title: room.name || 'Grup Diskusi',
          subtitle: `${room.participantIds.length} Anggota${
            memberNames.length > 0 ? ` • ${memberNames.slice(0, 3).join(', ')}` : ''
          }`,
          avatar:
            room.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              room.name || 'Grup'
            )}&background=0f766e&color=fff&bold=true`,
          roleBadge: 'Grup Privat',
          otherParticipant: null as ChatParticipant | null,
        };
      }

      // Direct 1-on-1 room
      if (isAdminMonitor) {
        const p1 = participants.find((p) => p.id === room.participantIds[0]);
        const p2 = participants.find((p) => p.id === room.participantIds[1]);
        const title =
          p1 && p2
            ? `${p1.name} ↔ ${p2.name}`
            : room.name || 'Percakapan Personal';
        return {
          title,
          subtitle: `${p1?.role === 'staff' ? 'Staf' : 'Mitra'} & ${
            p2?.role === 'staff' ? 'Staf' : 'Mitra'
          }`,
          avatar:
            p1?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=1e40af&color=fff`,
          roleBadge: '1-on-1 Monitor',
          otherParticipant: p1 || null,
        };
      }

      const otherId =
        room.participantIds.find((id) => id !== currentUserId) || room.participantIds[0];
      const other = participants.find((p) => p.id === otherId) || null;
      return {
        title: other?.name || room.name || 'Mitra / Staf',
        subtitle: other
          ? `${other.role === 'staff' ? 'Staf Operasional' : 'Mitra Konsultan'}${
              other.code ? ` • ${other.code}` : ''
            }`
          : 'Kontak Terdaftar',
        avatar:
          other?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            other?.name || 'User'
          )}&background=1d4ed8&color=fff`,
        roleBadge: other?.role === 'staff' ? 'Staf' : 'Mitra',
        otherParticipant: other,
      };
    },
    [participants, isAdminMonitor, currentUserId]
  );

  // Filtered rooms for sidebar
  const filteredRooms = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return visibleRooms.filter((room) => {
      if (sidebarTab === 'groups' && room.type !== 'group') return false;
      const meta = getRoomDisplayMeta(room);
      if (sidebarRoleFilter !== 'all' && room.type === 'direct') {
        if (meta.otherParticipant && meta.otherParticipant.role !== sidebarRoleFilter) {
          return false;
        }
      }
      if (!q) return true;
      const memberMatch = room.participantIds.some((pid) => {
        const p = participants.find((item) => item.id === pid);
        if (!p) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.specialization && p.specialization.toLowerCase().includes(q))
        );
      });
      return (
        meta.title.toLowerCase().includes(q) ||
        meta.subtitle.toLowerCase().includes(q) ||
        memberMatch
      );
    });
  }, [
    visibleRooms,
    sidebarTab,
    sidebarSearch,
    sidebarRoleFilter,
    getRoomDisplayMeta,
    participants,
  ]);

  // Filtered participants (Mitra & Staf) for starting a chat or searching
  const filteredContacts = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return participants
      .filter((p) => p.id !== currentUserId)
      .filter((p) => (sidebarRoleFilter === 'all' ? true : p.role === sidebarRoleFilter))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.specialization && p.specialization.toLowerCase().includes(q)) ||
          p.role.toLowerCase().includes(q)
        );
      });
  }, [participants, currentUserId, sidebarRoleFilter, sidebarSearch]);

  const selectedRoom = useMemo(
    () =>
      visibleRooms.find((r) => r.id === selectedRoomId) ||
      (draftDirectRoom && draftDirectRoom.id === selectedRoomId ? draftDirectRoom : null),
    [visibleRooms, draftDirectRoom, selectedRoomId]
  );

  const pinnedMessages = useMemo(() => {
    return selectedRoomMessages
      .filter((m) => m.isPinned && !m.isDeleted && !m.isSystemMessage)
      .sort(
        (a, b) =>
          new Date(b.pinnedAt || b.createdAt).getTime() -
          new Date(a.pinnedAt || a.createdAt).getTime()
      );
  }, [selectedRoomMessages]);

  const displayedMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return selectedRoomMessages;
    return selectedRoomMessages.filter(
      (m) =>
        !m.isDeleted &&
        (m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          (m.linkPreview?.title && m.linkPreview.title.toLowerCase().includes(q)))
    );
  }, [selectedRoomMessages, messageSearch]);

  // Sync Group Info Modal edit form whenever opened or selectedRoom changes
  useEffect(() => {
    if (showGroupInfoModal && selectedRoom && selectedRoom.type === 'group') {
      setEditGroupName(selectedRoom.name || '');
      setEditGroupDescription(selectedRoom.description || '');
      setEditGroupAvatar(selectedRoom.avatarUrl || '');
      setRemoveGroupAvatarFlag(false);
      setGroupInfoMemberSearch('');
    }
  }, [showGroupInfoModal, selectedRoom]);

  // Staff can always edit group description & group profile photo; group creator can also edit
  const canEditSelectedGroup = Boolean(
    selectedRoom &&
      selectedRoom.type === 'group' &&
      !isAdminMonitor &&
      (currentUserRole === 'staff' || selectedRoom.createdBy === currentUserId)
  );

  // Start or open a direct 1-on-1 chat with a participant
  const handleStartDirectChat = async (target: ChatParticipant) => {
    if (isAdminMonitor) {
      // For Admin monitor: find any existing direct room involving this participant
      const existing = visibleRooms.find(
        (r) => r.type === 'direct' && r.participantIds.includes(target.id)
      );
      if (existing) {
        setSelectedRoomId(existing.id);
        setSidebarTab('chats');
      } else {
        showAlert({
          type: 'info',
          title: 'Mode Monitoring Admin',
          message: `Belum ada riwayat percakapan langsung untuk ${target.name}. Admin memantau percakapan yang dibuat oleh Mitra dan Staf.`,
        });
      }
      return;
    }

    const existing = visibleRooms.find(
      (r) =>
        r.type === 'direct' &&
        r.participantIds.includes(currentUserId) &&
        r.participantIds.includes(target.id)
    );
    if (existing) {
      setDraftDirectRoom(null);
      setSelectedRoomId(existing.id);
      setSidebarTab('chats');
      return;
    }

    // Open an unsent local draft direct chat without saving to history or database.
    // If the user goes back without sending a message, no empty chat history will exist.
    const sorted = [String(currentUserId), String(target.id)].sort();
    const nowIso = new Date().toISOString();
    const draftRoom: ChatRoom = {
      id: `room-direct-${sorted[0]}__${sorted[1]}`,
      type: 'direct',
      name: `${currentUserName} & ${target.name}`,
      participantIds: sorted,
      createdBy: String(currentUserId),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setDraftDirectRoom(draftRoom);
    setSelectedRoomId(draftRoom.id);
  };

  // Select & compress Group Profile Photo (for Create Group or Edit Group modal)
  const handleSelectGroupAvatar = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'create' | 'edit'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      showAlert({
        type: 'warning',
        title: 'Format Tidak Didukung',
        message: 'Silakan pilih file gambar (JPG, PNG, atau WEBP) untuk foto profil grup.',
      });
      return;
    }
    try {
      const compressed = await compressImageFile(file, 512, 0.8);
      if (mode === 'create') {
        setNewGroupAvatar(compressed.dataUrl);
      } else {
        setEditGroupAvatar(compressed.dataUrl);
        setRemoveGroupAvatarFlag(false);
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Gagal Memproses Foto',
        message: 'Terjadi kesalahan saat mengompres foto profil grup.',
      });
    }
  };

  // Create Group Chat (Mitra & Staf)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (selectedGroupMemberIds.length === 0) {
      showAlert({
        type: 'warning',
        title: 'Pilih Anggota Grup',
        message: 'Silakan pilih minimal 1 rekan Mitra atau Staf untuk bergabung ke dalam grup.',
      });
      return;
    }

    const participantIds = Array.from(new Set([currentUserId, ...selectedGroupMemberIds]));
    try {
      const res = await fetch('/api/chat/rooms/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || 'Grup Koordinasi Internal Mitra & Staf',
          avatarUrl: newGroupAvatar || undefined,
          participantIds,
          createdBy: currentUserId,
          createdByName: currentUserName,
        }),
      });
      if (res.ok) {
        const created: ChatRoom = await res.json();
        setRooms((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
        setSelectedRoomId(created.id);
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupAvatar('');
        setSelectedGroupMemberIds([]);
        setSidebarTab('chats');
      }
    } catch {
      // ignore
    }
  };

  // Save Group Profile (Name, Description & Group Profile Photo) — accessible to Staff & Group Creator
  const handleSaveGroupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || selectedRoom.type !== 'group' || !canEditSelectedGroup) return;
    if (!editGroupName.trim()) {
      showAlert({
        type: 'warning',
        title: 'Nama Grup Wajib Diisi',
        message: 'Nama grup tidak boleh kosong.',
      });
      return;
    }

    setIsSavingGroupInfo(true);
    try {
      const payload: Record<string, unknown> = {
        name: editGroupName.trim(),
        description: editGroupDescription.trim(),
        actorId: currentUserId,
        actorName: currentUserName,
      };
      if (removeGroupAvatarFlag) {
        payload.removeAvatar = true;
      } else if (editGroupAvatar && editGroupAvatar !== selectedRoom.avatarUrl) {
        payload.avatarUrl = editGroupAvatar;
      }

      const res = await fetch(`/api/chat/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-crud-alert': 'true',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated: ChatRoom = await res.json();
        setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditGroupAvatar(updated.avatarUrl || '');
        setRemoveGroupAvatarFlag(false);
        showAlert({
          type: 'success',
          title: 'Profil Grup Diperbarui',
          message: 'Nama, deskripsi, dan foto profil grup berhasil disimpan.',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan saat menyimpan perubahan grup.',
      });
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  // Pin / Unpin any message in BOTH Personal (Direct) & Group Chat
  const handleTogglePinMessage = async (msg: ChatMessage) => {
    if (isAdminMonitor || msg.isDeleted || msg.isSystemMessage) return;
    setPinningMessageId(msg.id);
    try {
      const res = await fetch(`/api/chat/messages/${msg.id}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-crud-alert': 'true',
        },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole,
          pinned: !msg.isPinned,
        }),
      });
      if (res.ok) {
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch {
      // ignore
    } finally {
      setPinningMessageId(null);
    }
  };

  // File/Image/Video/Document selection + automatic compression for images
  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_CHAT_FILE_BYTES) {
      showAlert({
        type: 'warning',
        title: 'Ukuran File Terlalu Besar',
        message: 'Ukuran maksimal file yang dapat dikirim di chat adalah 30 MB.',
      });
      return;
    }

    const ext = file.name.includes('.')
      ? (file.name.split('.').pop() || '').toLowerCase()
      : '';
    const isImg =
      file.type.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isVid =
      file.type.startsWith('video/') ||
      ['mp4', 'webm', 'mov', 'm4v', '3gp'].includes(ext);

    if (!isImg && !isVid && !ALLOWED_CHAT_EXTS.has(ext)) {
      showAlert({
        type: 'warning',
        title: 'Format File Tidak Didukung',
        message:
          'Format yang didukung: Gambar, Video (MP4, WEBM, MOV), serta Dokumen (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, ZIP/RAR).',
      });
      return;
    }

    setIsCompressingImage(true);
    try {
      if (isImg) {
        const compressed = await compressImageFile(file, 1024, 0.72);
        setPendingImage({
          ...compressed,
          kind: 'image',
        });
      } else {
        const dataUrl = await readFileToDataUrl(file);
        setPendingImage({
          dataUrl,
          name: file.name,
          originalSize: file.size,
          compressedSize: file.size,
          kind: isVid ? 'video' : 'document',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Gagal Memuat File',
        message: 'Terjadi kesalahan saat memproses file dari perangkat Anda.',
      });
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Send or Save Edited Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAdminMonitor || !selectedRoomId || isSending) return;

    const trimmed = inputText.trim();
    if (!trimmed && !pendingImage) return;

    setIsSending(true);
    try {
      if (editingMessage) {
        // Edit existing message (must be within 5 minutes)
        const elapsed = Date.now() - new Date(editingMessage.createdAt).getTime();
        if (elapsed >= FIVE_MINUTES_MS) {
          showAlert({
            type: 'warning',
            title: 'Batas Waktu Edit Habis',
            message: 'Pesan hanya dapat diedit dalam waktu maksimal 5 menit setelah dikirim.',
          });
          setEditingMessage(null);
          setInputText('');
          setIsSending(false);
          return;
        }

        const res = await fetch(`/api/chat/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            text: trimmed,
          }),
        });
        if (res.ok) {
          const updated: ChatMessage = await res.json();
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setEditingMessage(null);
          setInputText('');
          setComposerLinkPreview(null);
        }
      } else {
        // Send new message
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-skip-crud-alert': 'true',
          },
          body: JSON.stringify({
            roomId: selectedRoomId,
            participantIds: selectedRoom?.participantIds,
            senderId: currentUserId,
            senderName: currentUserName,
            senderRole: currentUserRole === 'staff' ? 'staff' : 'mitra',
            senderAvatar: currentUserAvatar,
            text: trimmed,
            imageUrl: pendingImage?.dataUrl,
            imageName: pendingImage?.name,
            imageOriginalSize: pendingImage?.originalSize,
            imageCompressedSize: pendingImage?.compressedSize,
            replyTo: replyingTo || undefined,
            linkPreview: composerLinkPreview || undefined,
          }),
        });

        if (res.ok) {
          const created: ChatMessage = await res.json();
          setMessages((prev) =>
            prev.some((m) => m.id === created.id) ? prev : [...prev, created]
          );
          // Promote draft direct room into persistent chat history once the first message is sent
          if (draftDirectRoom && draftDirectRoom.id === selectedRoomId) {
            const promotedRoom: ChatRoom = {
              ...draftDirectRoom,
              updatedAt: created.createdAt,
              lastMessageAt: created.createdAt,
              lastMessageSenderName: created.senderName,
              lastMessageText:
                created.text ||
                (created.imageUrl
                  ? getAttachmentSummaryText(created.imageUrl, created.imageName)
                  : 'Pesan baru'),
            };
            setRooms((prev) =>
              prev.some((r) => r.id === promotedRoom.id)
                ? prev.map((r) => (r.id === promotedRoom.id ? promotedRoom : r))
                : [promotedRoom, ...prev]
            );
            setDraftDirectRoom(null);
            setSidebarTab('chats');
          }
          setInputText('');
          setReplyingTo(null);
          setPendingImage(null);
          setComposerLinkPreview(null);
          setShowEmojiPicker(false);
        } else {
          const errJson = await res.json().catch(() => null);
          showAlert({
            type: 'error',
            title: 'Gagal Mengirim Pesan',
            message: errJson?.message || 'Gagal mengunggah lampiran ke server.',
          });
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  // Recall / Delete message within 5 minutes
  const handleRecallMessage = async (msg: ChatMessage) => {
    const elapsed = Date.now() - new Date(msg.createdAt).getTime();
    if (elapsed >= FIVE_MINUTES_MS) {
      showAlert({
        type: 'warning',
        title: 'Batas Waktu Tarik Pesan Habis',
        message: 'Pesan hanya dapat ditarik atau dihapus sebelum 5 menit sejak dikirim.',
      });
      return;
    }

    const ok = await confirm({
      title: 'Tarik / Hapus Pesan Chat',
      message: 'Apakah Anda yakin ingin menarik dan menghapus pesan ini untuk semua anggota di ruang percakapan?',
      confirmText: 'Ya, Tarik Pesan',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/chat/messages/${msg.id}?userId=${encodeURIComponent(currentUserId)}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setRooms((prev) =>
          prev.map((r) =>
            r.id === updated.roomId ? { ...r, lastMessageText: '🚫 Pesan telah ditarik' } : r
          )
        );
      }
    } catch {
      // ignore
    }
  };

  // Open WhatsApp-style floating context menu safely clamped inside viewport
  const openMessageContextMenu = useCallback(
    (msg: ChatMessage, clientX: number, clientY: number) => {
      if (msg.isDeleted || msg.isSystemMessage) return;
      const menuWidth = 248;
      const estimatedHeight = 360;
      const pad = 12;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      const isSmallScreen = vw < 640;
      const rawX = isSmallScreen ? (vw - menuWidth) / 2 : clientX;
      const rawY = isSmallScreen ? clientY - 40 : clientY;
      const x = Math.max(pad, Math.min(rawX, vw - menuWidth - pad));
      const y = Math.max(pad, Math.min(rawY, vh - estimatedHeight - pad));
      contextMenuOpenedAtRef.current = Date.now();
      setContextMenu({ message: msg, x, y });
    },
    []
  );

  // Cancel any pending mobile long-press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  }, []);

  // Toggle selection of a message in Multi-Select Forward Mode
  const toggleForwardMessageSelection = useCallback((msgId: string) => {
    setSelectedForwardMsgIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  }, []);

  // Enter Multi-Select Forward Mode starting with an optional message
  const enterForwardSelectMode = useCallback((initialMsgId?: string) => {
    setContextMenu(null);
    setIsForwardSelectMode(true);
    setSelectedForwardMsgIds(initialMsgId ? [initialMsgId] : []);
  }, []);

  // Trigger attachment download cleanly (supports images, videos, and documents)
  const handleDownloadChatImage = useCallback((fileUrl: string, fileName?: string) => {
    try {
      const safeFileName = fileName || `lampiran-chat-${Date.now()}`;
      const isHosted = fileUrl.startsWith('/uploads/');
      const downloadHref = isHosted
        ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=1&name=${encodeURIComponent(safeFileName)}`
        : fileUrl;
      const link = document.createElement('a');
      link.href = downloadHref;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  }, []);

  // Toggle emoji reaction on any message (Group Chat & Personal 1-on-1 Chat)
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (isAdminMonitor) return;
    setContextMenu(null);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-crud-alert': 'true',
        },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole,
          emoji,
        }),
      });
      if (res.ok) {
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch {
      // ignore
    }
  };

  // Forward 1 or multiple selected messages internally to another room or contact
  const handleForwardToInternalRoom = async (targetRoom: ChatRoom) => {
    if (forwardingMessages.length === 0 || isAdminMonitor || isForwardingBatch) return;
    setIsForwardingBatch(true);
    try {
      const ordered = [...forwardingMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      let lastCreated: ChatMessage | null = null;

      for (const item of ordered) {
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-skip-crud-alert': 'true',
          },
          body: JSON.stringify({
            roomId: targetRoom.id,
            participantIds: targetRoom.participantIds,
            senderId: currentUserId,
            senderName: currentUserName,
            senderRole: currentUserRole === 'staff' ? 'staff' : 'mitra',
            senderAvatar: currentUserAvatar,
            text: item.text,
            imageUrl: item.imageUrl,
            imageName: item.imageName,
            imageOriginalSize: item.imageOriginalSize,
            imageCompressedSize: item.imageCompressedSize,
            linkPreview: item.linkPreview,
            forwardedFrom: item.senderName,
          }),
        });
        if (res.ok) {
          const created: ChatMessage = await res.json();
          lastCreated = created;
          setMessages((prev) =>
            prev.some((m) => m.id === created.id) ? prev : [...prev, created]
          );
        }
      }

      if (lastCreated) {
        const promotedRoom: ChatRoom = {
          ...targetRoom,
          updatedAt: lastCreated.createdAt,
          lastMessageAt: lastCreated.createdAt,
          lastMessageSenderName: lastCreated.senderName,
          lastMessageText:
            lastCreated.text ||
            (lastCreated.imageUrl
              ? getAttachmentSummaryText(lastCreated.imageUrl, lastCreated.imageName)
              : 'Pesan diteruskan'),
        };
        setRooms((prev) =>
          prev.some((r) => r.id === promotedRoom.id)
            ? prev.map((r) => (r.id === promotedRoom.id ? promotedRoom : r))
            : [promotedRoom, ...prev]
        );
        setDraftDirectRoom(null);
        setForwardingMessages([]);
        setForwardRoomSearch('');
        setIsForwardSelectMode(false);
        setSelectedForwardMsgIds([]);
        setSelectedRoomId(targetRoom.id);
        setSidebarTab('chats');
      }
    } catch {
      // ignore
    } finally {
      setIsForwardingBatch(false);
    }
  };

  // Scroll to quoted message when clicked
  const scrollToQuotedMessage = (messageId: string) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2200);
    }
  };

  // Build social share text for forwarding 1 or multiple selected messages
  const buildForwardShareText = (msgs: ChatMessage[]) => {
    const ordered = [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return ordered
      .map((msg) => {
        const header = `[NDTAXANDLAW Live Chat • ${msg.senderName}]`;
        const body = msg.text || (msg.imageUrl ? '[Lampiran Gambar Terkompresi]' : '');
        const urlPart = msg.linkPreview?.url ? `\n🔗 ${msg.linkPreview.url}` : '';
        return `${header}\n${body}${urlPart}`;
      })
      .join('\n\n');
  };

  // Update group members (for existing group)
  const handleToggleExistingGroupMember = async (memberId: string) => {
    if (!selectedRoom || selectedRoom.type !== 'group' || isAdminMonitor) return;
    const exists = selectedRoom.participantIds.includes(memberId);
    if (exists && selectedRoom.participantIds.length <= 2) {
      showAlert({
        type: 'warning',
        title: 'Minimal Anggota Grup',
        message: 'Grup harus memiliki minimal 2 anggota aktif.',
      });
      return;
    }
    const nextIds = exists
      ? selectedRoom.participantIds.filter((id) => id !== memberId)
      : [...selectedRoom.participantIds, memberId];

    try {
      const res = await fetch(`/api/chat/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedRoom.name,
          description: selectedRoom.description,
          participantIds: nextIds,
          actorId: currentUserId,
          actorName: currentUserName,
        }),
      });
      if (res.ok) {
        const updated: ChatRoom = await res.json();
        setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
    } catch {
      // ignore
    }
  };

  // Requirement 8: If chat is disabled by Admin, Mitra and Staf should NOT see floating button or chat page
  if (!chatEnabled && !isAdminMonitor) {
    return null;
  }

  // FLOATING BOTTOM-RIGHT CHAT BUTTON + REAL-TIME MESSAGE / GROUP TOAST NOTIFICATION
  if (!isChatPageOpen) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5">
        {chatToast && (
          <div className="w-76 sm:w-84 bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <BellRing className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide truncate">
                  {chatToast.isSystem
                    ? 'Ditambahkan ke Grup Chat'
                    : chatToast.isGroup
                    ? `Pesan Grup • ${chatToast.roomTitle}`
                    : 'Pesan Personal Baru'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setChatToast(null);
                }}
                className="p-0.5 rounded text-white/80 hover:text-white cursor-pointer"
                aria-label="Tutup notifikasi chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const targetRoomId = chatToast.roomId;
                setChatToast(null);
                onOpenChatPage(targetRoomId);
              }}
              className="w-full p-3 flex items-start gap-2.5 text-left hover:bg-emerald-50/60 transition-colors cursor-pointer"
            >
              <img
                src={chatToast.avatar}
                alt={chatToast.roomTitle}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {chatToast.isGroup ? chatToast.roomTitle : chatToast.senderName}
                  </p>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatChatTime(chatToast.createdAt)}
                  </span>
                </div>
                {chatToast.isGroup && !chatToast.isSystem && (
                  <p className="text-[10px] font-bold text-teal-700 truncate">
                    {chatToast.senderName}
                  </p>
                )}
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                  {chatToast.previewText}
                </p>
                <p className="text-[10px] font-bold text-emerald-700 mt-1">
                  Klik untuk membuka percakapan →
                </p>
              </div>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenChatPage()}
          title={
            isAdminMonitor
              ? 'Monitor Chat - ND TAX AND LAW'
              : 'Chat - ND TAX AND LAW'
          }
          aria-label="Buka Chat"
          className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-2xl shadow-emerald-900/40 hover:from-emerald-500 hover:to-teal-500 hover:scale-105 active:scale-95 transition-all border-2 border-white/90 cursor-pointer"
        >
          <MessageSquare className="w-6 h-6 text-white" />

          {!chatEnabled && isAdminMonitor && (
            <span
              className="absolute -bottom-1 px-1.5 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded-full border border-white"
              title="Chat saat ini dinonaktifkan untuk Mitra & Staf"
            >
              OFF
            </span>
          )}

          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md border-2 border-white animate-bounce">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // DEDICATED FULL-PAGE CHAT VIEW
  const selectedMeta = selectedRoom ? getRoomDisplayMeta(selectedRoom) : null;

  return (
    <div className="space-y-2.5 relative">
      {/* Real-Time Chat Notification Toast when another room receives a message or user is added to a group */}
      {chatToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 w-76 sm:w-84 bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <BellRing className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wide truncate">
                {chatToast.isSystem
                  ? 'Ditambahkan ke Grup Baru'
                  : chatToast.isGroup
                  ? `Pesan Grup • ${chatToast.roomTitle}`
                  : 'Pesan Personal Baru'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setChatToast(null)}
              className="p-0.5 rounded text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const targetRoomId = chatToast.roomId;
              setChatToast(null);
              setSelectedRoomId(targetRoomId);
              setSidebarTab('chats');
            }}
            className="w-full p-3 flex items-start gap-2.5 text-left hover:bg-emerald-50/60 transition-colors cursor-pointer"
          >
            <img
              src={chatToast.avatar}
              alt={chatToast.roomTitle}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-slate-900 truncate">
                  {chatToast.isGroup ? chatToast.roomTitle : chatToast.senderName}
                </p>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatChatTime(chatToast.createdAt)}
                </span>
              </div>
              {chatToast.isGroup && !chatToast.isSystem && (
                <p className="text-[10px] font-bold text-teal-700 truncate">
                  {chatToast.senderName}
                </p>
              )}
              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                {chatToast.previewText}
              </p>
            </div>
          </button>
        </div>
      )}
      {/* Simple Top Header Bar: Icon + Chat - ND TAX AND LAW + Ringtone Toggle */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-xl px-3 md:px-4 py-2 md:py-2.5 shadow-md border border-emerald-700/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-emerald-300" />
          </div>
          <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
            Chat - ND TAX AND LAW
          </h2>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Ringtone Notification Toggle & Preview */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) {
                playChatNotificationRingtone();
              }
            }}
            title={
              soundEnabled
                ? 'Nada Dering Notifikasi Chat Aktif (Klik untuk membisukan)'
                : 'Nada Dering Notifikasi Chat Bisu (Klik untuk mengaktifkan & tes nada dering)'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Nada Dering: Aktif' : 'Nada Dering: Bisu'}
            </span>
          </button>

          {soundEnabled && (
            <button
              type="button"
              onClick={() => playChatNotificationRingtone()}
              title="Tes Suara Nada Dering Notifikasi Chat"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Tes Nada</span>
            </button>
          )}

          {isAdminMonitor && (
            <>
              <button
                type="button"
                onClick={handleOpenAdminGallery}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 border border-sky-400/30 transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-300" />
                <span>Galeri File</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdminReset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-400/35 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
                <span>Reset Chat</span>
              </button>
            </>
          )}

          {isAdminMonitor && onToggleChatEnabled && (
            <button
              type="button"
              onClick={() => onToggleChatEnabled(!chatEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all shadow-sm cursor-pointer ${
                chatEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>
                {chatEnabled ? 'Chat Mitra & Staf: AKTIF' : 'Chat Mitra & Staf: NONAKTIF'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main WhatsApp-Style Split Container — Full viewport fit on Desktop & Tablet, expanded downward on Mobile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-180px)] sm:h-[calc(100dvh-185px)] md:h-[calc(100dvh-230px)] min-h-[440px] md:max-h-[760px]">
        {/* LEFT SIDEBAR: Rooms, Groups & Participant Directory */}
        <div
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/60 h-full overflow-hidden ${
            selectedRoomId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3.5 bg-white border-b border-slate-200 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUserAvatar}
                  alt={currentUserName}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {currentUserName}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700 truncate">
                    {isAdminMonitor
                      ? 'Administrator (Monitoring)'
                      : currentUserRole === 'staff'
                      ? 'Staf Operasional'
                      : `Mitra Konsultan ${currentUserCode ? `(${currentUserCode})` : ''}`}
                  </p>
                </div>
              </div>

              {!isAdminMonitor && (
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buat Grup
                </button>
              )}
            </div>

            {/* Search & Role Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Cari kontak atau grup..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => setSidebarTab('chats')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                      sidebarTab === 'chats'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Chat ({visibleRooms.length})</span>
                    {totalUnreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-tight">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('groups')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                      sidebarTab === 'groups'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Grup ({visibleRooms.filter((r) => r.type === 'group').length})</span>
                    {groupUnreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-extrabold leading-tight">
                        {groupUnreadCount > 99 ? '99+' : groupUnreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('contacts')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      sidebarTab === 'contacts'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Peserta ({participants.filter((p) => p.id !== currentUserId).length})
                  </button>
                </div>
              </div>

              {/* Filter by Role (Semua / Staf / Mitra) */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Filter:
                </span>
                {(['all', 'staff', 'mitra'] as const).map((roleOpt) => (
                  <button
                    key={roleOpt}
                    type="button"
                    onClick={() => setSidebarRoleFilter(roleOpt)}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      sidebarRoleFilter === roleOpt
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {roleOpt === 'all'
                      ? 'Semua'
                      : roleOpt === 'staff'
                      ? 'Staf Operasional'
                      : 'Mitra'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {sidebarTab === 'contacts' ? (
              filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada peserta Mitra/Staf yang cocok dengan pencarian.
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleStartDirectChat(contact)}
                    className="w-full p-3.5 flex items-center gap-3 hover:bg-emerald-50/70 transition-colors text-left cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          contact.role === 'staff' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {contact.name}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            contact.role === 'staff'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {contact.role === 'staff' ? 'Staf' : 'Mitra'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {contact.code ? `${contact.code} • ` : ''}
                        {contact.specialization || contact.email}
                      </p>
                    </div>
                  </button>
                ))
              )
            ) : (
              <>
                {isChatInitialLoading && filteredRooms.length === 0 ? (
                  <div className="p-3 space-y-3 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="w-11 h-11 shrink-0" rounded="rounded-full" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      {sidebarSearch
                        ? 'Tidak ada percakapan yang cocok.'
                        : 'Belum ada percakapan aktif.'}
                    </p>
                    {!isAdminMonitor && (
                      <button
                        type="button"
                        onClick={() => setSidebarTab('contacts')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        Pilih Kontak Mitra / Staf untuk Mulai Chat
                      </button>
                    )}
                  </div>
                ) : (
                  filteredRooms.map((room) => {
                    const meta = getRoomDisplayMeta(room);
                    const isSelected = room.id === selectedRoomId;
                    const unread = unreadCountByRoom[room.id] || 0;

                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600'
                            : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={meta.avatar}
                            alt={meta.title}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                          />
                          {room.type === 'group' && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center border border-white">
                              <Users className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="text-xs font-extrabold text-slate-900 truncate">
                              {meta.title}
                            </p>
                            {room.lastMessageAt && (
                              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                {formatChatTime(room.lastMessageAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                room.type === 'group'
                                  ? 'bg-teal-100 text-teal-800'
                                  : meta.roleBadge === 'Staf'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {meta.roleBadge}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {meta.subtitle}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <p className="text-[11px] text-slate-600 truncate">
                              {room.lastMessageSenderName
                                ? `${room.lastMessageSenderName}: `
                                : ''}
                              {room.lastMessageText || 'Belum ada pesan'}
                            </p>
                            {unread > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shrink-0">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}

                {/* If searching, also show matching contacts directly below rooms */}
                {sidebarSearch.trim() && filteredContacts.length > 0 && (
                  <div className="bg-slate-100/70">
                    <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Kontak Mitra &amp; Staf ({filteredContacts.length})
                    </div>
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleStartDirectChat(contact)}
                        className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                      >
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {contact.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {contact.role === 'staff' ? 'Staf Operasional' : 'Mitra'} • Klik untuk chat
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT CONVERSATION PANE */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden bg-[#efeae2] ${
            selectedRoomId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!selectedRoom || !selectedMeta ? (
            /* Empty State when no chat is selected (or after pressing ESC) */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-50 to-emerald-50/30">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-inner">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {isAdminMonitor
                  ? 'Panel Monitoring Percakapan Mitra & Staf'
                  : 'Pilih Percakapan atau Mulai Chat Baru'}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                {isAdminMonitor
                  ? 'Pilih salah satu ruang percakapan 1-on-1 atau grup di sebelah kiri untuk memonitor komunikasi antara Mitra dan Staf secara real-time.'
                  : 'Pilih rekan Mitra, Staf Operasional, atau Grup Diskusi di panel kiri untuk mengirim pesan teks, tautan ber-meta preview, emoji/ikon, maupun gambar terkompresi.'}
              </p>
            </div>
          ) : (
            <>
              {/* Active Room Header */}
              <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Kembali ke daftar chat"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <img
                    src={selectedMeta.avatar}
                    alt={selectedMeta.title}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate">
                        {selectedMeta.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {selectedMeta.roleBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedMeta.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Search inside current room */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMessageSearch(!showMessageSearch);
                      if (showMessageSearch) setMessageSearch('');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      showMessageSearch
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Cari pesan di ruang chat ini"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Group Members Info / Manage Profile & Description */}
                  {selectedRoom.type === 'group' && (
                    <button
                      type="button"
                      onClick={() => setShowGroupInfoModal(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors cursor-pointer"
                      title={
                        canEditSelectedGroup
                          ? 'Info Grup, Edit Deskripsi, Foto Profil & Anggota'
                          : 'Lihat Info & Anggota Grup'
                      }
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {canEditSelectedGroup
                          ? `Edit & Info (${selectedRoom.participantIds.length})`
                          : `Info Grup (${selectedRoom.participantIds.length})`}
                      </span>
                    </button>
                  )}

                  {/* Close Chat Button (Icon X only) */}
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 transition-colors cursor-pointer"
                    title="Tutup percakapan (ESC)"
                    aria-label="Tutup percakapan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* In-Room Search Bar */}
              {showMessageSearch && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Cari pesan..."
                    className="flex-1 text-xs bg-transparent outline-none text-slate-800"
                    autoFocus
                  />
                  {messageSearch && (
                    <button
                      type="button"
                      onClick={() => setMessageSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}

              {/* Group Description & Privacy Banner */}
              {selectedRoom.type === 'group' && (
                <div className="px-4 py-1.5 bg-teal-900/90 text-teal-100 text-[11px] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Lock className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span className="truncate">
                      {selectedRoom.description
                        ? selectedRoom.description
                        : `Grup Privat: Hanya ${selectedRoom.participantIds.length} anggota terdaftar yang dapat melihat & berdiskusi di grup ini.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroupInfoModal(true)}
                    className="text-[10px] font-bold underline text-teal-200 hover:text-white shrink-0 cursor-pointer"
                  >
                    {canEditSelectedGroup ? 'Edit Grup & Anggota' : 'Info & Anggota'}
                  </button>
                </div>
              )}

              {/* STICKY PINNED MESSAGES BAR (Works in BOTH Personal 1-on-1 & Group Chat) */}
              {pinnedMessages.length > 0 && (
                <div className="bg-amber-50/95 border-b border-amber-200/90 shrink-0">
                  <div className="px-4 py-2 flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => scrollToQuotedMessage(pinnedMessages[0].id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left group cursor-pointer"
                      title="Klik untuk melompat ke pesan yang disematkan"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                        <Pin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                            Pesan Disematkan
                          </span>
                          {pinnedMessages.length > 1 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-300/80 text-amber-950 text-[9px] font-extrabold">
                              {pinnedMessages.length} pesan
                            </span>
                          )}
                          <span className="text-[10px] text-amber-700 truncate">
                            • {pinnedMessages[0].senderName}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 truncate group-hover:text-amber-950">
                          {pinnedMessages[0].imageUrl
                            ? getAttachmentPrefixIcon(pinnedMessages[0].imageUrl, pinnedMessages[0].imageName)
                            : ''}
                          {pinnedMessages[0].text ||
                            pinnedMessages[0].imageName ||
                            'Lampiran'}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {pinnedMessages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowAllPinnedList((prev) => !prev)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-300/80 text-amber-950 text-[10px] font-bold cursor-pointer"
                        >
                          <span>{showAllPinnedList ? 'Tutup' : `Semua (${pinnedMessages.length})`}</span>
                          {showAllPinnedList ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      {!isAdminMonitor && (
                        <button
                          type="button"
                          disabled={pinningMessageId === pinnedMessages[0].id}
                          onClick={() => handleTogglePinMessage(pinnedMessages[0])}
                          className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-200/80 transition-colors cursor-pointer"
                          title="Lepas sematan pesan ini"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showAllPinnedList && pinnedMessages.length > 1 && (
                    <div className="px-4 pb-2.5 pt-1 border-t border-amber-200/70 max-h-44 overflow-y-auto space-y-1.5">
                      {pinnedMessages.map((pm, pIdx) => (
                        <div
                          key={pm.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/90 border border-amber-200/80"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              scrollToQuotedMessage(pm.id);
                              setShowAllPinnedList(false);
                            }}
                            className="min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <p className="text-[10px] font-bold text-amber-900 truncate">
                              #{pIdx + 1} • {pm.senderName}
                              {pm.pinnedByName ? ` (disematkan oleh ${pm.pinnedByName})` : ''}
                            </p>
                            <p className="text-[11px] text-slate-700 truncate">
                              {pm.imageUrl
                                ? getAttachmentPrefixIcon(pm.imageUrl, pm.imageName)
                                : ''}
                              {pm.text || pm.imageName || 'Lampiran'}
                            </p>
                          </button>
                          {!isAdminMonitor && (
                            <button
                              type="button"
                              disabled={pinningMessageId === pm.id}
                              onClick={() => handleTogglePinMessage(pm)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Lepas sematan"
                            >
                              <PinOff className="w-3 h-3" />
                              <span>Lepas</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]">
                {displayedMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="px-4 py-2.5 rounded-xl bg-white/90 shadow-xs text-xs text-slate-600">
                      Belum ada pesan di ruang percakapan ini.
                    </div>
                  </div>
                ) : (
                  displayedMessages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId;
                    const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
                    const showDateBadge =
                      !prevMsg ||
                      formatChatDateBadge(prevMsg.createdAt) !==
                        formatChatDateBadge(msg.createdAt);

                    const isSelectedForForward = selectedForwardMsgIds.includes(msg.id);
                    const isContextActive = contextMenu?.message.id === msg.id;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateBadge && (
                          <div className="flex justify-center my-2">
                            <span className="px-3 py-1 rounded-full bg-white/90 text-slate-600 text-[10px] font-bold shadow-xs">
                              {formatChatDateBadge(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        {msg.isSystemMessage ? (
                          <div id={`chat-msg-${msg.id}`} className="flex justify-center my-1.5">
                            <div className="max-w-[90%] px-3.5 py-1.5 rounded-xl bg-teal-50/95 border border-teal-200 text-teal-900 text-[11px] font-semibold text-center shadow-2xs flex items-center gap-1.5">
                              <span>{msg.text}</span>
                              <span className="text-[9px] text-teal-600 font-mono shrink-0">
                                {formatChatTime(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        ) : (
                        <div
                          id={`chat-msg-${msg.id}`}
                          onClick={() => {
                            if (isForwardSelectMode && !msg.isDeleted) {
                              toggleForwardMessageSelection(msg.id);
                            }
                          }}
                          className={`flex items-center gap-2.5 transition-all duration-200 ${
                            isForwardSelectMode && !msg.isDeleted
                              ? `cursor-pointer px-2 py-1 -mx-2 rounded-xl ${
                                  isSelectedForForward
                                    ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40'
                                    : 'hover:bg-black/5'
                                }`
                              : ''
                          } ${
                            highlightedMessageId === msg.id
                              ? ' ring-4 ring-amber-400 rounded-2xl bg-amber-100/50 p-1'
                              : ''
                          }`}
                        >
                          {/* Multi-Select Checkbox for Batch Forwarding */}
                          {isForwardSelectMode && !msg.isDeleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleForwardMessageSelection(msg.id);
                              }}
                              aria-label={
                                isSelectedForForward ? 'Batalkan pilihan pesan' : 'Pilih pesan untuk diteruskan'
                              }
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isSelectedForForward
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-400 text-transparent hover:border-emerald-500'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                          )}

                          <div
                            className={`flex-1 flex flex-col ${
                              isMine ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              onContextMenu={(e) => {
                                if (msg.isDeleted || isForwardSelectMode) return;
                                e.preventDefault();
                                e.stopPropagation();
                                // Ignore Android Chrome's delayed native contextmenu right after our long-press already opened the menu
                                if (
                                  longPressTriggeredRef.current &&
                                  Date.now() - contextMenuOpenedAtRef.current < 800
                                ) {
                                  return;
                                }
                                openMessageContextMenu(msg, e.clientX, e.clientY);
                              }}
                              onClickCapture={(e) => {
                                if (longPressTriggeredRef.current) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  longPressTriggeredRef.current = false;
                                }
                              }}
                              onTouchStart={(e) => {
                                if (msg.isDeleted || isForwardSelectMode) return;
                                const touch = e.touches[0];
                                if (!touch) return;
                                const startX = touch.clientX;
                                const startY = touch.clientY;
                                longPressTriggeredRef.current = false;
                                clearLongPressTimer();
                                longPressOriginRef.current = {
                                  x: startX,
                                  y: startY,
                                };
                                longPressTimerRef.current = setTimeout(() => {
                                  longPressTriggeredRef.current = true;
                                  suppressNextBackdropClickUntilRef.current = Date.now() + 700;
                                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                    try {
                                      navigator.vibrate(15);
                                    } catch {
                                      // ignore
                                    }
                                  }
                                  openMessageContextMenu(msg, startX, startY);
                                }, 400);
                              }}
                              onTouchMove={(e) => {
                                if (!longPressOriginRef.current) return;
                                const touch = e.touches[0];
                                if (!touch) return;
                                const dx = Math.abs(touch.clientX - longPressOriginRef.current.x);
                                const dy = Math.abs(touch.clientY - longPressOriginRef.current.y);
                                if (dx > 18 || dy > 18) {
                                  clearLongPressTimer();
                                }
                              }}
                              onTouchEnd={(e) => {
                                clearLongPressTimer();
                                if (longPressTriggeredRef.current) {
                                  suppressNextBackdropClickUntilRef.current = Date.now() + 550;
                                  if (e.cancelable) {
                                    e.preventDefault();
                                  }
                                }
                              }}
                              onTouchCancel={() => clearLongPressTimer()}
                              className={`chat-touch-bubble group relative max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-xs ${
                                isForwardSelectMode && !msg.isDeleted ? 'pointer-events-none' : ''
                              } ${
                                msg.isDeleted
                                  ? 'bg-slate-200/90 text-slate-500 italic border border-slate-300'
                                  : isContextActive
                                  ? isMine
                                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs ring-2 ring-emerald-500 shadow-md'
                                    : 'bg-white text-slate-900 rounded-tl-xs ring-2 ring-emerald-500 shadow-md'
                                  : msg.isPinned
                                  ? isMine
                                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs ring-2 ring-amber-400/80'
                                    : 'bg-white text-slate-900 rounded-tl-xs ring-2 ring-amber-400/80'
                                  : isMine
                                  ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                                  : 'bg-white text-slate-900 rounded-tl-xs'
                              }`}
                            >
                              {/* Desktop Hover Downward Chevron Trigger (Opens Context Menu) */}
                              {!msg.isDeleted && !isForwardSelectMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    openMessageContextMenu(
                                      msg,
                                      isMine ? rect.left - 210 : rect.right - 24,
                                      rect.bottom + 6
                                    );
                                  }}
                                  className={`hidden md:flex items-center justify-center w-6 h-6 rounded-full absolute top-1.5 right-1.5 z-10 transition-all cursor-pointer shadow-xs ${
                                    isContextActive
                                      ? 'opacity-100 bg-slate-900 text-white'
                                      : isMine
                                      ? 'opacity-0 group-hover:opacity-100 focus:opacity-100 bg-[#d9fdd3]/95 hover:bg-emerald-200 text-slate-600 hover:text-slate-900'
                                      : 'opacity-0 group-hover:opacity-100 focus:opacity-100 bg-white/95 hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                                  }`}
                                  title="Opsi pesan (atau klik kanan)"
                                  aria-label="Opsi pesan"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              )}

                              {/* Sender Header */}
                              <div className="flex items-center justify-between gap-3 mb-1 pr-6 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[11px] font-extrabold ${
                                    isMine ? 'text-emerald-800' : 'text-blue-800'
                                  }`}
                                >
                                  {isMine ? 'Anda' : msg.senderName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    msg.senderRole === 'staff'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {msg.senderRole === 'staff' ? 'Staf' : 'Mitra'}
                                </span>
                                {msg.isPinned && !msg.isDeleted && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-extrabold"
                                    title={
                                      msg.pinnedByName
                                        ? `Disematkan oleh ${msg.pinnedByName}`
                                        : 'Pesan disematkan'
                                    }
                                  >
                                    <Pin className="w-2.5 h-2.5" />
                                    Disematkan
                                  </span>
                                )}
                              </div>

                              {msg.forwardedFrom && !msg.isDeleted && (
                                <span className="inline-flex items-center gap-1 text-[10px] italic text-slate-500">
                                  <Forward className="w-3 h-3" />
                                  Diteruskan dari {msg.forwardedFrom}
                                </span>
                              )}
                            </div>

                            {/* Quoted Reply Preview inside bubble (Requirement 6) */}
                            {msg.replyTo && !msg.isDeleted && (
                              <button
                                type="button"
                                onClick={() => scrollToQuotedMessage(msg.replyTo!.messageId)}
                                className="w-full text-left mb-2 p-2 rounded-lg bg-black/5 border-l-4 border-l-emerald-600 hover:bg-black/10 transition-colors cursor-pointer"
                              >
                                <p className="text-[10px] font-extrabold text-emerald-800">
                                  {msg.replyTo.senderName}
                                </p>
                                <p className="text-[11px] text-slate-600 line-clamp-2">
                                  {msg.replyTo.imageUrl
                                    ? isImageAttachment(msg.replyTo.imageUrl)
                                      ? '📷 [Gambar] '
                                      : isVideoAttachment(msg.replyTo.imageUrl)
                                      ? '🎬 [Video] '
                                      : '📄 [Dokumen] '
                                    : ''}
                                  {msg.replyTo.text}
                                </p>
                              </button>
                            )}

                            {/* Deleted / Recalled State */}
                            {msg.isDeleted ? (
                              <p className="text-xs flex items-center gap-1.5 py-0.5">
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                Pesan ini telah ditarik oleh pengirim
                              </p>
                            ) : (
                              <>
                                {/* Image / Video / Document Attachment */}
                                {msg.imageUrl && (() => {
                                  const attachKind = getAttachmentKind(msg.imageUrl, msg.imageName);

                                  if (attachKind === 'image') {
                                    return (
                                      <div className="mb-2">
                                        <div className="relative group/img rounded-xl overflow-hidden border border-black/10 bg-slate-900/5">
                                          <img
                                            src={msg.imageUrl}
                                            alt={msg.imageName || 'Lampiran Chat'}
                                            onClick={() =>
                                              setLightboxImage({
                                                url: msg.imageUrl!,
                                                name: msg.imageName,
                                              })
                                            }
                                            className="max-h-64 w-auto object-contain mx-auto cursor-zoom-in"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLightboxImage({
                                                url: msg.imageUrl!,
                                                name: msg.imageName,
                                              })
                                            }
                                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                                            title="Perbesar Gambar"
                                          >
                                            <Maximize2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        {msg.imageCompressedSize && (
                                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                                            <span>
                                              ⚡ Terkompresi:{' '}
                                              {formatFileSize(msg.imageCompressedSize)}
                                              {msg.imageOriginalSize
                                                ? ` (dari ${formatFileSize(msg.imageOriginalSize)})`
                                                : ''}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  if (attachKind === 'video') {
                                    const videoMime = getVideoMimeType(msg.imageUrl, msg.imageName);
                                    return (
                                      <div
                                        className="mb-2"
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchMove={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => e.stopPropagation()}
                                      >
                                        <div className="rounded-xl overflow-hidden border border-black/15 bg-black">
                                          <video
                                            key={msg.imageUrl}
                                            controls
                                            playsInline
                                            preload="auto"
                                            controlsList="nodownload"
                                            className="block max-h-72 w-full min-w-[220px] max-w-[320px] bg-black"
                                          >
                                            <source src={msg.imageUrl} type={videoMime} />
                                            <source src={msg.imageUrl} />
                                          </video>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-600">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <Film className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                            <span className="truncate font-semibold">
                                              {msg.imageName || 'Video'}
                                            </span>
                                            {(msg.imageCompressedSize || msg.imageOriginalSize) && (
                                              <span className="text-[10px] text-slate-500 shrink-0">
                                                • {formatFileSize(msg.imageCompressedSize || msg.imageOriginalSize || 0)}
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadChatImage(msg.imageUrl!, msg.imageName || 'video-chat.mp4');
                                            }}
                                            className="p-1 rounded-lg hover:bg-black/10 text-slate-700 shrink-0 cursor-pointer"
                                            title="Unduh Video"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  const docMeta = getDocumentBadgeMeta(msg.imageName, msg.imageUrl);
                                  const canPreviewPdf = isPdfAttachment(msg.imageUrl, msg.imageName);
                                  const displayFileName = msg.imageName || 'Dokumen';
                                  const displaySize = msg.imageCompressedSize || msg.imageOriginalSize;

                                  return (
                                    <div className="mb-2 p-2.5 rounded-xl bg-black/[0.04] border border-black/10 flex items-center gap-2.5 min-w-[210px] max-w-[320px]">
                                      <div
                                        className={`w-10 h-10 rounded-lg border ${docMeta.bgClass} ${docMeta.borderClass} ${docMeta.textClass} flex flex-col items-center justify-center shrink-0`}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-[8px] font-black leading-none mt-0.5">
                                          {docMeta.extLabel}
                                        </span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="text-xs font-bold text-slate-900 truncate"
                                          title={displayFileName}
                                        >
                                          {displayFileName}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-500">
                                          {docMeta.extLabel}
                                          {displaySize ? ` • ${formatFileSize(displaySize)}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {canPreviewPdf && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewDocument({
                                                url: msg.imageUrl!,
                                                name: displayFileName,
                                              });
                                            }}
                                            className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                                            title="Pratinjau PDF"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadChatImage(msg.imageUrl!, displayFileName);
                                          }}
                                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                                          title="Unduh Dokumen"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Message Text */}
                                {msg.text && (
                                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                )}

                                {/* Link Metadata Preview Card (Requirement 4) */}
                                {msg.linkPreview && (
                                  <a
                                    href={msg.linkPreview.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 block rounded-xl overflow-hidden border border-slate-300/80 bg-white/95 hover:bg-white transition-all shadow-2xs"
                                  >
                                    {msg.linkPreview.image && (
                                      <img
                                        src={msg.linkPreview.image}
                                        alt={msg.linkPreview.title}
                                        className="w-full h-32 object-cover border-b border-slate-100"
                                      />
                                    )}
                                    <div className="p-2.5">
                                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-emerald-700 uppercase">
                                        <span>{msg.linkPreview.siteName}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </div>
                                      <p className="text-xs font-extrabold text-slate-900 mt-0.5 line-clamp-1">
                                        {msg.linkPreview.title}
                                      </p>
                                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                                        {msg.linkPreview.description}
                                      </p>
                                      <p className="text-[10px] text-blue-600 truncate mt-1 font-mono">
                                        {msg.linkPreview.url}
                                      </p>
                                    </div>
                                  </a>
                                )}
                                {/* Grouped Message Reactions Display (Group & Personal Chat) */}
                                {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1">
                                    {Object.entries(
                                      msg.reactions.reduce<
                                        Record<
                                          string,
                                          { count: number; names: string[]; hasMine: boolean }
                                        >
                                      >((acc, r) => {
                                        if (!r || !r.emoji) return acc;
                                        if (!acc[r.emoji]) {
                                          acc[r.emoji] = { count: 0, names: [], hasMine: false };
                                        }
                                        acc[r.emoji].count += 1;
                                        acc[r.emoji].names.push(
                                          r.userId === currentUserId ? 'Anda' : r.userName
                                        );
                                        if (r.userId === currentUserId) {
                                          acc[r.emoji].hasMine = true;
                                        }
                                        return acc;
                                      }, {})
                                    ).map(([emojiKey, info]) => (
                                      <button
                                        key={emojiKey}
                                        type="button"
                                        disabled={isAdminMonitor}
                                        onClick={() => handleToggleReaction(msg.id, emojiKey)}
                                        title={`Reaksi dari: ${info.names.join(', ')}`}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                                          info.hasMine
                                            ? 'bg-emerald-600/15 border-emerald-500 text-emerald-900 shadow-2xs'
                                            : 'bg-white/90 border-slate-300 text-slate-700 hover:bg-white'
                                        } ${isAdminMonitor ? 'cursor-default' : 'cursor-pointer hover:scale-105'}`}
                                      >
                                        <span className="text-xs leading-none">{emojiKey}</span>
                                        <span className="text-[10px]">{info.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Clean Timestamp + Edited Indicator + Double Check Footer */}
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
                              {msg.editedAt && !msg.isDeleted && (
                                <span className="italic text-slate-500">(diedit)</span>
                              )}
                              <span>{formatChatTime(msg.createdAt)}</span>
                              {isMine && !msg.isDeleted && (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </div>
                          </div>
                        </div>
                        </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* BOTTOM MULTI-SELECT FORWARD BAR, ADMIN MONITORING BAR, OR COMPOSER */}
              {isForwardSelectMode ? (
                <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForwardSelectMode(false);
                        setSelectedForwardMsgIds([]);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Batalkan mode pilih pesan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                        {selectedForwardMsgIds.length} pesan dipilih
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Klik pesan yang ingin ditandai untuk diteruskan sekaligus
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedForwardMsgIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedForwardMsgIds([])}
                        className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Bersihkan
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={selectedForwardMsgIds.length === 0}
                      onClick={() => {
                        const chosen = selectedRoomMessages.filter(
                          (m) =>
                            !m.isDeleted &&
                            !m.isSystemMessage &&
                            selectedForwardMsgIds.includes(m.id)
                        );
                        if (chosen.length > 0) {
                          setForwardingMessages(chosen);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Forward className="w-4 h-4" />
                      <span>Teruskan ({selectedForwardMsgIds.length})</span>
                    </button>
                  </div>
                </div>
              ) : isAdminMonitor ? (
                <div className="p-3.5 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Mode Monitoring Admin:</strong> Anda sedang memantau percakapan ini secara real-time. Hanya Mitra &amp; Staf yang mengirim pesan operasional.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-t border-slate-200 p-3 space-y-2 shrink-0">
                  {/* Active Quote Reply Banner */}
                  {replyingTo && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border-l-4 border-l-emerald-600 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1">
                          <Reply className="w-3.5 h-3.5" />
                          Membalas pesan {replyingTo.senderName}
                        </p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {replyingTo.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Active Edit Banner */}
                  {editingMessage && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border-l-4 border-l-amber-500 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5" />
                          Mengedit Pesan (Maksimal 5 menit sejak dikirim)
                        </p>
                        <p className="text-xs text-amber-700 truncate mt-0.5">
                          {editingMessage.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(null);
                          setInputText('');
                        }}
                        className="p-1 rounded-lg text-amber-700 hover:bg-amber-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Pending Image / Video / Document Preview */}
                  {pendingImage && (() => {
                    const pendingKind =
                      pendingImage.kind || getAttachmentKind(pendingImage.dataUrl, pendingImage.name);
                    const pendingDocMeta = getDocumentBadgeMeta(pendingImage.name, pendingImage.dataUrl);
                    return (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {pendingKind === 'image' ? (
                            <img
                              src={pendingImage.dataUrl}
                              alt={pendingImage.name}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-300 shrink-0"
                            />
                          ) : pendingKind === 'video' ? (
                            <div className="relative w-14 h-12 rounded-lg overflow-hidden bg-slate-950 border border-slate-300 shrink-0">
                              <video
                                src={pendingImage.dataUrl}
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/75 text-white text-[8px] font-bold">
                                VIDEO
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-lg border ${pendingDocMeta.bgClass} ${pendingDocMeta.borderClass} ${pendingDocMeta.textClass} flex flex-col items-center justify-center shrink-0`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-[9px] font-black leading-none mt-0.5">
                                {pendingDocMeta.extLabel}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {pendingImage.name}
                            </p>
                            {pendingKind === 'image' ? (
                              <p className="text-[11px] font-semibold text-emerald-700">
                                ⚡ {formatFileSize(pendingImage.originalSize)} →{' '}
                                {formatFileSize(pendingImage.compressedSize)}
                              </p>
                            ) : (
                              <p className="text-[11px] font-semibold text-slate-500">
                                {pendingKind === 'video' ? 'Video' : pendingDocMeta.extLabel} •{' '}
                                {formatFileSize(pendingImage.originalSize)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingImage(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Live Link Metadata Preview in Composer */}
                  {(isLoadingLinkPreview || composerLinkPreview) && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Link2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        {isLoadingLinkPreview ? (
                          <span className="text-xs text-blue-700 font-medium">
                            Membaca metadata tautan...
                          </span>
                        ) : (
                          composerLinkPreview && (
                            <div className="min-w-0">
                              <p className="text-[10px] font-extrabold uppercase text-blue-700">
                                {composerLinkPreview.siteName}
                              </p>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {composerLinkPreview.title}
                              </p>
                              <p className="text-[11px] text-slate-600 line-clamp-1">
                                {composerLinkPreview.description}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setComposerLinkPreview(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Emoji / Icon Picker Popover */}
                  {showEmojiPicker && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-700">
                          Pilih Emoji &amp; Ikon Cepat
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Tutup
                        </button>
                      </div>
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                          <p className="text-[10px] font-bold text-slate-400 mb-1">
                            {cat.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + emoji);
                                  composerInputRef.current?.focus();
                                }}
                                className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 flex items-center justify-center text-base transition-transform hover:scale-110 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input Row */}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={CHAT_MEDIA_ACCEPT}
                      onChange={handleSelectImage}
                      className="hidden"
                    />
                    <input
                      ref={docInputRef}
                      type="file"
                      accept={CHAT_DOCUMENT_ACCEPT}
                      onChange={handleSelectImage}
                      className="hidden"
                    />

                    {/* Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                        showEmojiPicker
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Photo & Video Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage || isSending || !!editingMessage}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Foto & Video"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Document Upload Button */}
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      disabled={isCompressingImage || isSending || !!editingMessage}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Dokumen (PDF, Word, Excel, ZIP)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <textarea
                      ref={composerInputRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ketik pesan..."
                      className="flex-1 min-w-0 px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none max-h-28"
                    />

                    <button
                      type="submit"
                      disabled={isSending || isCompressingImage || (!inputText.trim() && !pendingImage)}
                      className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {editingMessage ? 'Simpan' : 'Kirim'}
                      </span>
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE GROUP CHAT (Mitra & Staf) */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-extrabold">Buat Grup Diskusi Baru</h3>
                  <p className="text-[11px] text-emerald-100">
                    Grup bersifat privat &amp; hanya terlihat oleh anggota yang dipilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Group Profile Photo Uploader */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  ref={newGroupAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSelectGroupAvatar(e, 'create')}
                  className="hidden"
                />
                <div className="relative shrink-0">
                  <img
                    src={
                      newGroupAvatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        newGroupName.trim() || 'Grup'
                      )}&background=0f766e&color=fff&bold=true`
                    }
                    alt="Foto Profil Grup"
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/40 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => newGroupAvatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer"
                    title="Pilih Foto Profil Grup"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    Foto Profil Grup (Opsional)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unggah logo atau ikon grup agar mudah dikenali anggota.
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => newGroupAvatarInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                    >
                      {newGroupAvatar ? 'Ganti Foto' : 'Unggah Foto'}
                    </button>
                    {newGroupAvatar && (
                      <button
                        type="button"
                        onClick={() => setNewGroupAvatar('')}
                        className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] font-bold cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Grup Diskusi *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nama grup"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Topik Grup
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Deskripsi grup..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Anggota Grup (Mitra &amp; Staf) ({selectedGroupMemberIds.length} dipilih)
                  </label>
                </div>

                <input
                  type="text"
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  placeholder="Cari Mitra / Staf..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-2 outline-none"
                />

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {participants
                    .filter((p) => p.id !== currentUserId)
                    .filter(
                      (p) =>
                        !groupMemberSearch.trim() ||
                        p.name.toLowerCase().includes(groupMemberSearch.toLowerCase()) ||
                        p.role.toLowerCase().includes(groupMemberSearch.toLowerCase())
                    )
                    .map((p) => {
                      const checked = selectedGroupMemberIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50/50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedGroupMemberIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== p.id)
                                    : [...prev, p.id]
                                );
                              }}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {p.name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {p.code || p.email}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.role === 'staff'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {p.role === 'staff' ? 'Staf' : 'Mitra'}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Buat Grup Privat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GROUP INFO, PROFILE PHOTO, DESCRIPTION & MEMBERS MANAGEMENT */}
      {showGroupInfoModal && selectedRoom && selectedRoom.type === 'group' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    removeGroupAvatarFlag
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          editGroupName || selectedRoom.name || 'Grup'
                        )}&background=0f766e&color=fff&bold=true`
                      : editGroupAvatar ||
                        selectedRoom.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          selectedRoom.name || 'Grup'
                        )}&background=0f766e&color=fff&bold=true`
                  }
                  alt={selectedRoom.name || 'Grup'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/40 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold truncate">{selectedRoom.name}</h3>
                  <p className="text-[11px] text-teal-200">
                    {selectedRoom.participantIds.length} Anggota Terdaftar • Grup Privat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* SECTION 1: GROUP PROFILE PHOTO & DESCRIPTION (Editable by Staff & Creator) */}
              {canEditSelectedGroup ? (
                <form
                  onSubmit={handleSaveGroupProfile}
                  className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900">
                      Pengaturan Profil &amp; Deskripsi Grup
                    </span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[9px] font-bold">
                      {currentUserRole === 'staff' ? 'Akses Staf' : 'Pembuat Grup'}
                    </span>
                  </div>

                  {/* Group Photo Picker */}
                  <div className="flex items-center gap-3.5">
                    <input
                      ref={editGroupAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectGroupAvatar(e, 'edit')}
                      className="hidden"
                    />
                    <div className="relative shrink-0">
                      <img
                        src={
                          removeGroupAvatarFlag
                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                editGroupName || selectedRoom.name || 'Grup'
                              )}&background=0f766e&color=fff&bold=true`
                            : editGroupAvatar ||
                              selectedRoom.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                editGroupName || selectedRoom.name || 'Grup'
                              )}&background=0f766e&color=fff&bold=true`
                        }
                        alt="Foto Grup"
                        className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/40 bg-white shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => editGroupAvatarInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer"
                        title="Ganti Foto Profil Grup"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold text-slate-900">Foto Profil Grup</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => editGroupAvatarInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Ganti Foto Profil</span>
                        </button>
                        {(editGroupAvatar || selectedRoom.avatarUrl) && !removeGroupAvatarFlag && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditGroupAvatar('');
                              setRemoveGroupAvatarFlag(true);
                            }}
                            className="px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                          >
                            Reset Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Group Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Grup
                    </label>
                    <input
                      type="text"
                      required
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  {/* Group Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Deskripsi Grup
                    </label>
                    <textarea
                      rows={3}
                      value={editGroupDescription}
                      onChange={(e) => setEditGroupDescription(e.target.value)}
                      placeholder="Deskripsi grup..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingGroupInfo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingGroupInfo ? 'Menyimpan...' : 'Simpan Profil Grup'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Deskripsi Grup
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedRoom.description || 'Belum ada deskripsi untuk grup ini.'}
                  </p>
                </div>
              )}

              {/* SECTION 2: GROUP MEMBERS DIRECTORY */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                    Daftar Anggota ({selectedRoom.participantIds.length})
                  </p>
                </div>

                {!isAdminMonitor && (
                  <input
                    type="text"
                    value={groupInfoMemberSearch}
                    onChange={(e) => setGroupInfoMemberSearch(e.target.value)}
                    placeholder="Cari Mitra / Staf..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-2 outline-none"
                  />
                )}

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl px-3">
                  {participants
                    .filter((p) => {
                      const isMember = selectedRoom.participantIds.includes(p.id);
                      if (isAdminMonitor && !isMember) return false;
                      const q = groupInfoMemberSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        p.name.toLowerCase().includes(q) ||
                        p.email.toLowerCase().includes(q) ||
                        (p.code && p.code.toLowerCase().includes(q))
                      );
                    })
                    .map((p) => {
                      const isMember = selectedRoom.participantIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className="py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {p.name} {p.id === currentUserId ? '(Anda)' : ''}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {p.role === 'staff' ? 'Staf Operasional' : 'Mitra Konsultan'}
                              </p>
                            </div>
                          </div>

                          {!isAdminMonitor ? (
                            <button
                              type="button"
                              onClick={() => handleToggleExistingGroupMember(p.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 ${
                                isMember
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-700'
                                  : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              {isMember ? '✓ Anggota' : '+ Tambahkan'}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              Anggota
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP-STYLE FLOATING MESSAGE CONTEXT MENU (Right-Click / Hover Chevron / Mobile Long-Press) */}
      {contextMenu && (() => {
        const liveMsg =
          messages.find((m) => m.id === contextMenu.message.id) || contextMenu.message;
        if (liveMsg.isDeleted || liveMsg.isSystemMessage) return null;
        const isMineCtx = liveMsg.senderId === currentUserId;
        const elapsedMs = nowTick - new Date(liveMsg.createdAt).getTime();
        const canEditOrRecallCtx =
          isMineCtx &&
          !isAdminMonitor &&
          !liveMsg.isDeleted &&
          elapsedMs >= 0 &&
          elapsedMs < FIVE_MINUTES_MS;
        const remainingSeconds = canEditOrRecallCtx
          ? Math.max(0, Math.ceil((FIVE_MINUTES_MS - elapsedMs) / 1000))
          : 0;
        const remainingMin = Math.floor(remainingSeconds / 60);
        const remainingSec = remainingSeconds % 60;

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/35 sm:bg-transparent"
            onClick={() => {
              const now = Date.now();
              if (
                now - contextMenuOpenedAtRef.current < 550 ||
                now < suppressNextBackdropClickUntilRef.current
              ) {
                return;
              }
              setContextMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const now = Date.now();
              if (
                now - contextMenuOpenedAtRef.current < 800 ||
                now < suppressNextBackdropClickUntilRef.current
              ) {
                return;
              }
              setContextMenu(null);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
              className="fixed w-60 rounded-2xl bg-[#182229] text-slate-100 border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Top Quick Emoji Reaction Strip */}
              {!isAdminMonitor && (
                <div className="px-2.5 py-2 flex items-center justify-between gap-1 border-b border-white/10">
                  {QUICK_REACTION_EMOJIS.map((emojiOpt) => {
                    const myReacted = liveMsg.reactions?.some(
                      (r) => r.userId === currentUserId && r.emoji === emojiOpt
                    );
                    return (
                      <button
                        key={emojiOpt}
                        type="button"
                        onClick={() => handleToggleReaction(liveMsg.id, emojiOpt)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer ${
                          myReacted
                            ? 'bg-emerald-500/30 ring-2 ring-emerald-400'
                            : 'hover:bg-white/10'
                        }`}
                        title={`Reaksi ${emojiOpt}`}
                      >
                        {emojiOpt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Context Menu Action List */}
              <div className="py-1.5">
                {!isAdminMonitor && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo({
                        messageId: liveMsg.id,
                        senderId: liveMsg.senderId,
                        senderName: liveMsg.senderName,
                        text:
                          liveMsg.text ||
                          (liveMsg.imageUrl ? 'Lampiran Gambar' : 'Pesan'),
                        imageUrl: liveMsg.imageUrl,
                      });
                      setEditingMessage(null);
                      setContextMenu(null);
                      composerInputRef.current?.focus();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Reply className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Balas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    setForwardingMessages([liveMsg]);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <Forward className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Teruskan</span>
                </button>

                <button
                  type="button"
                  onClick={() => enterForwardSelectMode(liveMsg.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <CheckCheck className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Pilih</span>
                </button>

                {!isAdminMonitor && (
                  <button
                    type="button"
                    disabled={pinningMessageId === liveMsg.id}
                    onClick={() => {
                      setContextMenu(null);
                      handleTogglePinMessage(liveMsg);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    {liveMsg.isPinned ? (
                      <>
                        <PinOff className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Lepas Pin</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 text-slate-300 shrink-0" />
                        <span>Pin</span>
                      </>
                    )}
                  </button>
                )}

                {liveMsg.text && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(liveMsg.text);
                      setContextMenu(null);
                      showAlert({
                        type: 'success',
                        title: 'Pesan Disalin',
                        message: 'Teks pesan berhasil disalin ke clipboard.',
                      });
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Copy className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Salin</span>
                  </button>
                )}

                {liveMsg.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadChatImage(liveMsg.imageUrl!, liveMsg.imageName);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-slate-100 hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Download className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Unduh</span>
                  </button>
                )}

                {canEditOrRecallCtx && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(liveMsg);
                        setReplyingTo(null);
                        setInputText(liveMsg.text);
                        setContextMenu(null);
                        composerInputRef.current?.focus();
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-medium text-amber-300 hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Edit</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      type="button"
                      onClick={() => {
                        setContextMenu(null);
                        handleRecallMessage(liveMsg);
                      }}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-[13px] font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
                    >
                      <span className="inline-flex items-center gap-3">
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Hapus</span>
                      </span>
                      <span className="text-[11px] font-mono text-rose-300/90">
                        {remainingMin}:{String(remainingSec).padStart(2, '0')}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: FORWARD 1 OR MULTIPLE MESSAGES TO WHATSAPP, SOCIAL MEDIA, OR INTERNAL CHAT */}
      {forwardingMessages.length > 0 && (() => {
        const shareText = buildForwardShareText(forwardingMessages);
        const firstMsg = forwardingMessages[0];
        const qForward = forwardRoomSearch.trim().toLowerCase();

        // Build unified internal forward targets: existing rooms + contacts without existing room yet
        const existingDirectPartnerIds = new Set(
          visibleRooms
            .filter((r) => r.type === 'direct')
            .map((r) => r.participantIds.find((id) => id !== currentUserId))
            .filter(Boolean) as string[]
        );

        const extraContactDraftRooms: ChatRoom[] = participants
          .filter(
            (p) => p.id !== currentUserId && !existingDirectPartnerIds.has(p.id)
          )
          .map((p) => {
            const sorted = [String(currentUserId), String(p.id)].sort();
            const nowIso = new Date().toISOString();
            return {
              id: `room-direct-${sorted[0]}__${sorted[1]}`,
              type: 'direct' as const,
              name: `${currentUserName} & ${p.name}`,
              participantIds: sorted,
              createdBy: String(currentUserId),
              createdAt: nowIso,
              updatedAt: nowIso,
            };
          });

        const forwardTargetRooms = [...visibleRooms, ...extraContactDraftRooms].filter(
          (r) => {
            const meta = getRoomDisplayMeta(r);
            return !qForward || meta.title.toLowerCase().includes(qForward);
          }
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-200" />
                  <div>
                    <h3 className="text-sm font-extrabold">
                      Teruskan {forwardingMessages.length > 1 ? `${forwardingMessages.length} Pesan Terpilih` : 'Pesan'}
                    </h3>
                    <p className="text-[11px] text-emerald-100">
                      Bagikan ke luar atau teruskan ke rekan Mitra/Staf &amp; Grup
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForwardingMessages([])}
                  className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Message snippet(s) + Quick button to mark/select additional messages */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  {forwardingMessages.length === 1 ? (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                        Pesan dari {firstMsg.senderName}:
                      </p>
                      <p className="line-clamp-3">
                        {firstMsg.text || '[Lampiran Gambar Terkompresi]'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 mb-1">
                        {forwardingMessages.length} pesan ditandai untuk diteruskan:
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {forwardingMessages.map((fm) => (
                          <p key={fm.id} className="text-[11px] text-slate-700 truncate">
                            <span className="font-bold text-slate-900">{fm.senderName}:</span>{' '}
                            {fm.text || '[Lampiran Gambar]'}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRoomId && (
                    <button
                      type="button"
                      onClick={() => {
                        const preIds = forwardingMessages.map((m) => m.id);
                        setForwardingMessages([]);
                        setIsForwardSelectMode(true);
                        setSelectedForwardMsgIds(preIds);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>
                        {forwardingMessages.length > 1
                          ? 'Ubah / Tambah Pesan yang Ditandai'
                          : 'Tandai Beberapa Pesan Lain untuk Di-Forward'}
                      </span>
                    </button>
                  )}
                </div>

                {/* External Social Share Buttons */}
                <div>
                  <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    1. Bagikan ke WhatsApp &amp; Media Sosial Eksternal
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-extrabold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>

                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(
                        firstMsg.linkPreview?.url || window.location.origin
                      )}&text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-extrabold shadow-xs transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Telegram
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `Pesan Koordinasi NDTAXANDLAW - ${firstMsg.senderName}`
                      )}&body=${encodeURIComponent(shareText)}`}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shareText);
                        showAlert({
                          type: 'success',
                          title: 'Teks Pesan Disalin',
                          message:
                            'Isi pesan berhasil disalin ke clipboard untuk ditempel di media sosial lainnya.',
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Salin Teks
                    </button>
                  </div>
                </div>

                {/* Internal Forward to Another Chat Room or Contact */}
                {!isAdminMonitor && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                      2. Teruskan ke Ruang Chat / Kontak / Grup Internal
                    </p>
                    <input
                      type="text"
                      value={forwardRoomSearch}
                      onChange={(e) => setForwardRoomSearch(e.target.value)}
                      placeholder="Cari tujuan..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-2 outline-none"
                    />
                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {forwardTargetRooms.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                          Tidak ada kontak atau grup yang cocok.
                        </div>
                      ) : (
                        forwardTargetRooms.map((room) => {
                          const meta = getRoomDisplayMeta(room);
                          return (
                            <div
                              key={room.id}
                              className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-emerald-50/60"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={meta.avatar}
                                  alt={meta.title}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {meta.title}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {meta.roleBadge}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={isForwardingBatch}
                                onClick={() => handleForwardToInternalRoom(room)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-[10px] font-bold cursor-pointer shrink-0"
                              >
                                {isForwardingBatch ? 'Mengirim...' : 'Kirim'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: IMAGE LIGHTBOX */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4"
        >
          <div className="max-w-4xl max-h-[85vh] relative">
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name || 'Preview'}
              className="max-h-[80vh] w-auto rounded-xl shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-900 shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4B: IN-APP PDF DOCUMENT PREVIEW */}
      {previewDocument && (
        <div
          onClick={() => setPreviewDocument(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full h-[86vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#092147] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="text-xs sm:text-sm font-bold truncate">
                  {previewDocument.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadChatImage(previewDocument.url, previewDocument.name)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={previewDocument.url}
                title={previewDocument.name}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADMIN CHAT FILE GALLERY */}
      {isAdminMonitor && showAdminGalleryModal && (() => {
        const q = adminGallerySearch.trim().toLowerCase();
        const filteredFiles = adminGalleryFiles.filter((item) => {
          const itemIsVideo = Boolean(item.isVideo) || isVideoAttachment(item.fileUrl, item.fileName);
          if (adminGalleryFilter === 'image' && !item.isImage) return false;
          if (adminGalleryFilter === 'video' && !itemIsVideo) return false;
          if (adminGalleryFilter === 'file' && (item.isImage || itemIsVideo)) return false;
          if (!q) return true;
          return (
            item.fileName.toLowerCase().includes(q) ||
            item.senderName.toLowerCase().includes(q) ||
            item.roomName.toLowerCase().includes(q)
          );
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderOpen className="w-5 h-5 text-amber-300 shrink-0" />
                  <h3 className="text-sm sm:text-base font-extrabold truncate">
                    Galeri File Chat
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 text-[11px] font-bold text-amber-200 whitespace-nowrap">
                    {adminGallerySummary.totalFiles} file • {adminGallerySummary.totalFormattedSize}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void loadAdminChatFiles()}
                    disabled={isLoadingAdminGallery}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Muat ulang"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingAdminGallery ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdminGalleryModal(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={adminGallerySearch}
                    onChange={(e) => setAdminGallerySearch(e.target.value)}
                    placeholder="Cari nama file, pengirim, atau grup..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'image', label: 'Gambar' },
                      { id: 'video', label: 'Video' },
                      { id: 'file', label: 'Dokumen' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAdminGalleryFilter(tab.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        adminGalleryFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {isLoadingAdminGallery ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <Skeleton className="w-full h-32 rounded-lg" />
                        <Skeleton className="w-3/4 h-3.5" />
                        <Skeleton className="w-1/2 h-3" />
                      </div>
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">Belum ada file chat</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredFiles.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-shadow"
                      >
                        {item.isImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({ url: item.fileUrl, name: item.fileName })
                            }
                            className="relative h-36 bg-slate-100 overflow-hidden group cursor-pointer"
                          >
                            <img
                              src={item.fileUrl}
                              alt={item.fileName}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-bold">
                              {item.formattedSize}
                            </span>
                          </button>
                        ) : Boolean(item.isVideo) || isVideoAttachment(item.fileUrl, item.fileName) ? (
                          <div className="relative h-36 bg-slate-950 flex items-center justify-center overflow-hidden">
                            <video
                              src={item.fileUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-bold pointer-events-none">
                              {item.formattedSize}
                            </span>
                          </div>
                        ) : (() => {
                          const gDocMeta = getDocumentBadgeMeta(item.fileName, item.fileUrl);
                          const gIsPdf = isPdfAttachment(item.fileUrl, item.fileName);
                          return (
                            <div className="relative h-36 bg-slate-50 flex flex-col items-center justify-center gap-2 p-3 border-b border-slate-100">
                              <div
                                className={`w-12 h-12 rounded-xl border ${gDocMeta.bgClass} ${gDocMeta.borderClass} ${gDocMeta.textClass} flex flex-col items-center justify-center`}
                              >
                                <FileText className="w-5 h-5" />
                                <span className="text-[9px] font-black leading-none mt-0.5">
                                  {gDocMeta.extLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                                  {item.formattedSize}
                                </span>
                                {gIsPdf && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewDocument({
                                        url: item.fileUrl,
                                        name: item.fileName,
                                      })
                                    }
                                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Lihat</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <p
                              className="text-xs font-bold text-slate-900 truncate"
                              title={item.fileName}
                            >
                              {item.fileName}
                            </p>
                            <p className="text-[11px] font-semibold text-emerald-700 truncate">
                              {item.senderName} • {item.roomName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadChatImage(item.fileUrl, item.fileName)
                              }
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Unduh</span>
                            </button>
                            <button
                              type="button"
                              disabled={deletingGalleryId === item.messageId}
                              onClick={() => void handleAdminDeleteChatFile(item)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: ADMIN RESET CHAT BY AGE */}
      {isAdminMonitor && showAdminResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-rose-700 to-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-200" />
                <h3 className="text-sm sm:text-base font-extrabold">Reset Chat</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminResetModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {(
                [
                  { id: '3m', label: '> 3 Bulan Lalu' },
                  { id: '6m', label: '> 6 Bulan Lalu' },
                  { id: '1y', label: '> 1 Tahun Lalu' },
                  { id: 'all', label: 'Semua Chat' },
                ] as const
              ).map((opt) => {
                const st = adminResetStats[opt.id];
                const isSelected = selectedResetPeriod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedResetPeriod(opt.id)}
                    className={`w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/70'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {opt.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                      {isLoadingResetStats
                        ? '...'
                        : `${st.messages} pesan • ${st.files} file (${st.formattedSize})`}
                    </span>
                  </button>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminResetModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isExecutingReset ||
                    isLoadingResetStats ||
                    adminResetStats[selectedResetPeriod].messages === 0
                  }
                  onClick={() => void handleAdminResetChat()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-extrabold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isExecutingReset ? 'Memproses...' : 'Reset Chat'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
