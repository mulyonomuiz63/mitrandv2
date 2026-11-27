import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys';

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';

export interface WhatsAppClientStatusSnapshot {
  status: WhatsAppConnectionStatus;
  qrDataUrl: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
  hasSavedSession: boolean;
}

export interface WhatsAppGroupSummary {
  id: string;
  subject: string;
  participantsCount: number;
  isAdmin: boolean;
}

export interface ParticipantUpdateEntry {
  mitraId: string;
  fullName: string;
  phone: string;
}

export interface ParticipantUpdateOutcome {
  mitraId: string;
  fullName: string;
  phone: string;
  formattedPhone: string;
  outcome:
    | 'added'
    | 'removed'
    | 'already_in_group'
    | 'invited_via_dm'
    | 'not_on_whatsapp'
    | 'not_admin'
    | 'failed';
  detail: string;
}

const AUTH_DIR = path.join(process.cwd(), 'data', 'wa-auth');
const silentLogger = pino({ level: 'silent' });

let activeSocket: WASocket | null = null;
let connectionStatus: WhatsAppConnectionStatus = 'disconnected';
let currentQrDataUrl: string | null = null;
let connectedPhone: string | null = null;
let connectedName: string | null = null;
let lastError: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
let isStarting = false;

export function normalizeIndonesianWaDigits(rawPhone?: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function extractPhoneDigitsFromJid(jid?: string | null): string {
  if (!jid) return '';
  const beforeAt = jid.split('@')[0] || '';
  const beforeColon = beforeAt.split(':')[0] || '';
  return beforeColon.replace(/\D/g, '');
}

function hasSavedSessionFiles(): boolean {
  try {
    return fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
  } catch {
    return false;
  }
}

function clearAuthDirectory(): void {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('[WhatsApp] Failed to clear auth directory:', err);
  }
}

export function getWhatsAppStatus(): WhatsAppClientStatusSnapshot {
  return {
    status: connectionStatus,
    qrDataUrl: currentQrDataUrl,
    connectedPhone,
    connectedName,
    lastError,
    hasSavedSession: hasSavedSessionFiles(),
  };
}

export async function connectWhatsApp(): Promise<WhatsAppClientStatusSnapshot> {
  if (connectionStatus === 'connected' && activeSocket) {
    return getWhatsAppStatus();
  }
  if (isStarting || connectionStatus === 'connecting' || connectionStatus === 'qr') {
    return getWhatsAppStatus();
  }

  isStarting = true;
  manualDisconnect = false;
  lastError = null;
  connectionStatus = 'connecting';

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version: [number, number, number] | undefined;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch {
      version = undefined;
    }

    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      logger: silentLogger as any,
      browser: Browsers.macOS('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      printQRInTerminal: false,
    });

    activeSocket = sock;

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.warn('[WhatsApp] saveCreds error:', err);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            width: 280,
            margin: 2,
            color: { dark: '#092147', light: '#FFFFFF' },
          });
          connectionStatus = 'qr';
          lastError = null;
        } catch (err) {
          console.warn('[WhatsApp] QR generation error:', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQrDataUrl = null;
        lastError = null;
        reconnectAttempts = 0;
        const userId = sock.user?.id || '';
        connectedPhone = extractPhoneDigitsFromJid(userId) || null;
        connectedName = sock.user?.name || null;
      }

      if (connection === 'close') {
        const errObj = lastDisconnect?.error as any;
        const statusCode: number | undefined =
          errObj?.output?.statusCode ?? errObj?.data?.statusCode ?? errObj?.statusCode;

        activeSocket = null;
        currentQrDataUrl = null;

        if (manualDisconnect) {
          connectionStatus = 'disconnected';
          connectedPhone = null;
          connectedName = null;
          return;
        }

        const isLoggedOut =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === 401 ||
          statusCode === DisconnectReason.badSession;

        if (isLoggedOut) {
          clearAuthDirectory();
          connectionStatus = 'disconnected';
          connectedPhone = null;
          connectedName = null;
          lastError = 'Sesi WhatsApp terputus atau logout dari perangkat. Silakan scan QR kembali.';
          return;
        }

        // Code 515 (restartRequired) happens normally right after scanning QR code
        const shouldAutoReconnect = statusCode === DisconnectReason.restartRequired || statusCode === 515 || reconnectAttempts < 5;
        if (shouldAutoReconnect) {
          reconnectAttempts += 1;
          connectionStatus = 'connecting';
          const delayMs = statusCode === 515 ? 800 : Math.min(5000, reconnectAttempts * 1500);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectWhatsApp().catch(() => {});
          }, delayMs);
        } else {
          connectionStatus = 'disconnected';
          connectedPhone = null;
          connectedName = null;
          lastError = errObj?.message || 'Koneksi WhatsApp terputus. Silakan hubungkan ulang.';
        }
      }
    });
  } catch (err: any) {
    connectionStatus = 'disconnected';
    activeSocket = null;
    currentQrDataUrl = null;
    lastError = err?.message || 'Gagal memulai koneksi WhatsApp.';
  } finally {
    isStarting = false;
  }

  return getWhatsAppStatus();
}

export async function disconnectWhatsApp(logout: boolean = true): Promise<WhatsAppClientStatusSnapshot> {
  manualDisconnect = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const sock = activeSocket;
  activeSocket = null;
  connectionStatus = 'disconnected';
  currentQrDataUrl = null;
  connectedPhone = null;
  connectedName = null;
  lastError = null;
  reconnectAttempts = 0;

  if (sock) {
    try {
      if (logout) {
        await sock.logout();
      } else {
        sock.end(undefined);
      }
    } catch {
      try {
        sock.end(undefined);
      } catch {}
    }
  }

  if (logout) {
    clearAuthDirectory();
  }

  return getWhatsAppStatus();
}

export function initWhatsAppIfSavedSession(): void {
  if (hasSavedSessionFiles()) {
    connectWhatsApp().catch((err) => {
      console.warn('[WhatsApp] Auto-resume session failed:', err?.message || err);
    });
  }
}

export async function listAdminWhatsAppGroups(): Promise<WhatsAppGroupSummary[]> {
  if (connectionStatus !== 'connected' || !activeSocket) {
    throw new Error('WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.');
  }
  const sock = activeSocket;
  const selfPhone = extractPhoneDigitsFromJid(sock.user?.id);
  const selfLid = extractPhoneDigitsFromJid((sock.user as any)?.lid);
  const groupsMap = await sock.groupFetchAllParticipating();

  const list: WhatsAppGroupSummary[] = Object.values(groupsMap || {}).map((g) => {
    const participants = Array.isArray(g.participants) ? g.participants : [];
    const me = participants.find((p) => {
      const pDigits = extractPhoneDigitsFromJid(p.phoneNumber || p.id);
      const pLid = extractPhoneDigitsFromJid(p.lid || p.id);
      return (
        (selfPhone && pDigits === selfPhone) ||
        (selfLid && pLid === selfLid)
      );
    });
    const isAdmin = Boolean(
      me && (me.admin === 'admin' || me.admin === 'superadmin' || me.isAdmin || me.isSuperAdmin)
    );
    return {
      id: g.id,
      subject: g.subject || g.id,
      participantsCount: participants.length,
      isAdmin,
    };
  });

  list.sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return a.subject.localeCompare(b.subject, 'id');
  });

  return list;
}

export async function getWhatsAppGroupInviteLink(groupJid: string): Promise<string | null> {
  if (connectionStatus !== 'connected' || !activeSocket || !groupJid) return null;
  try {
    const code = await activeSocket.groupInviteCode(groupJid);
    return code ? `https://chat.whatsapp.com/${code}` : null;
  } catch {
    return null;
  }
}

export async function getWhatsAppGroupParticipantPhones(groupJid: string): Promise<Set<string>> {
  if (connectionStatus !== 'connected' || !activeSocket) {
    throw new Error('WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.');
  }
  const meta = await activeSocket.groupMetadata(groupJid);
  const phones = new Set<string>();
  for (const p of meta.participants || []) {
    const pnDigits = extractPhoneDigitsFromJid(p.phoneNumber || p.id);
    if (pnDigits) phones.add(pnDigits);
  }
  return phones;
}

export async function updateWhatsAppGroupParticipants(
  groupJid: string,
  entries: ParticipantUpdateEntry[],
  action: 'add' | 'remove',
  groupName?: string,
  fallbackInviteLink?: string
): Promise<ParticipantUpdateOutcome[]> {
  if (connectionStatus !== 'connected' || !activeSocket) {
    throw new Error('WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.');
  }
  const sock = activeSocket;
  const outcomes: ParticipantUpdateOutcome[] = [];

  // Pre-fetch group invite link lazily if needed for privacy-restricted (403) participants
  let cachedInviteLink: string | null | undefined = undefined;
  const resolveInviteLink = async (): Promise<string> => {
    if (cachedInviteLink === undefined) {
      cachedInviteLink = await getWhatsAppGroupInviteLink(groupJid);
    }
    return cachedInviteLink || fallbackInviteLink || '';
  };

  for (const entry of entries) {
    const formattedPhone = normalizeIndonesianWaDigits(entry.phone);
    if (!formattedPhone || formattedPhone.length < 9) {
      outcomes.push({
        ...entry,
        formattedPhone,
        outcome: 'not_on_whatsapp',
        detail: 'Nomor WhatsApp Mitra tidak valid atau belum diisi.',
      });
      continue;
    }

    let targetJid = `${formattedPhone}@s.whatsapp.net`;

    // Verify WhatsApp registration before adding
    if (action === 'add') {
      try {
        const check = await sock.onWhatsApp(formattedPhone);
        const first = Array.isArray(check) ? check[0] : undefined;
        if (!first || !first.exists) {
          outcomes.push({
            ...entry,
            formattedPhone,
            outcome: 'not_on_whatsapp',
            detail: `Nomor ${entry.phone} belum terdaftar di WhatsApp.`,
          });
          continue;
        }
        if (first.jid) {
          targetJid = first.jid;
        }
      } catch {
        // Proceed with standard s.whatsapp.net JID if onWhatsApp check fails transiently
      }
    }

    try {
      const responseList = await sock.groupParticipantsUpdate(groupJid, [targetJid], action);
      const item = Array.isArray(responseList) ? responseList[0] : undefined;
      const statusStr = String(item?.status ?? '200');

      if (statusStr === '200') {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: action === 'add' ? 'added' : 'removed',
          detail:
            action === 'add'
              ? `Berhasil ditambahkan langsung ke Grup WhatsApp ${groupName || ''}.`.trim()
              : `Berhasil dikeluarkan dari Grup WhatsApp ${groupName || ''}.`.trim(),
        });
      } else if (statusStr === '409' && action === 'add') {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: 'already_in_group',
          detail: 'Nomor Mitra ini sudah berada di dalam Grup WhatsApp.',
        });
      } else if (statusStr === '403' && action === 'add') {
        // Participant's WhatsApp privacy setting blocks direct group add -> send invite link directly via WA DM!
        const link = await resolveInviteLink();
        let dmSent = false;
        if (link) {
          try {
            await sock.sendMessage(targetJid, {
              text: `Halo ${entry.fullName}, Admin mengundang Anda bergabung ke grup WhatsApp resmi *${
                groupName || 'Mitra ND Tax & Law'
              }*.\n\nPengaturan privasi WhatsApp Anda membatasi penambahan otomatis, silakan klik tautan resmi berikut untuk bergabung:\n${link}`,
            });
            dmSent = true;
          } catch (dmErr) {
            console.warn('[WhatsApp] Failed to send fallback invite DM:', dmErr);
          }
        }
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: 'invited_via_dm',
          detail: dmSent
            ? 'Privasi WA peserta membatasi tambah langsung — undangan resmi otomatis dikirim ke chat WA peserta.'
            : 'Privasi WA peserta membatasi tambah langsung. Pastikan nomor Admin WA adalah Admin Grup agar link undangan bisa dikirim otomatis.',
        });
      } else if (statusStr === '401') {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: 'not_admin',
          detail: 'Nomor WhatsApp yang terhubung bukan Admin pada grup WhatsApp tujuan.',
        });
      } else if (statusStr === '408') {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: 'failed',
          detail: 'Peserta baru saja keluar dari grup ini sehingga WhatsApp membatasi penambahan langsung sementara.',
        });
      } else if (statusStr === '404') {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: action === 'remove' ? 'removed' : 'not_on_whatsapp',
          detail:
            action === 'remove'
              ? 'Peserta sudah tidak berada di dalam grup.'
              : `Nomor ${entry.phone} tidak ditemukan di WhatsApp.`,
        });
      } else {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: 'failed',
          detail: `WhatsApp mengembalikan kode status ${statusStr}.`,
        });
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNotAdmin = /forbidden|not-authorized|401/i.test(msg);
      outcomes.push({
        ...entry,
        formattedPhone,
        outcome: isNotAdmin ? 'not_admin' : 'failed',
        detail: isNotAdmin
          ? 'Nomor WhatsApp yang terhubung bukan Admin pada grup WhatsApp tujuan.'
          : msg || 'Gagal memproses permintaan ke server WhatsApp.',
      });
    }
  }

  return outcomes;
}
