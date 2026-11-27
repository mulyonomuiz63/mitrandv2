import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestWaWebVersion,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys';

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';

export interface WhatsAppClientStatusSnapshot {
  status: WhatsAppConnectionStatus;
  statusDetail: string | null;
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
const CONNECT_WATCHDOG_MS = 25_000;
const VERSION_FETCH_TIMEOUT_MS = 6_000;

let activeSocket: WASocket | null = null;
let connectionStatus: WhatsAppConnectionStatus = 'disconnected';
let statusDetail: string | null = null;
let currentQrDataUrl: string | null = null;
let connectedPhone: string | null = null;
let connectedName: string | null = null;
let lastError: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectingWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
let isStarting = false;
let socketGeneration = 0;
let credsSaveChain: Promise<void> = Promise.resolve();
let hasHadQrInAttempt = false;
let cachedWaVersion: { version: [number, number, number]; fetchedAt: number } | null = null;

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

function isSavedSessionRegistered(): boolean {
  try {
    const credsPath = path.join(AUTH_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    const parsed = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    return Boolean(parsed?.registered && parsed?.me?.id);
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

function clearAllTimers(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (connectingWatchdogTimer) {
    clearTimeout(connectingWatchdogTimer);
    connectingWatchdogTimer = null;
  }
}

function closeSocketQuietly(sock: WASocket | null): void {
  if (!sock) return;
  try {
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
  } catch {}
  try {
    sock.end(undefined);
  } catch {}
}

function startConnectingWatchdog(expectedGen: number): void {
  if (connectingWatchdogTimer) {
    clearTimeout(connectingWatchdogTimer);
    connectingWatchdogTimer = null;
  }
  connectingWatchdogTimer = setTimeout(() => {
    connectingWatchdogTimer = null;
    if (expectedGen !== socketGeneration) return;
    if (connectionStatus !== 'connecting') return;

    console.warn('[WhatsApp] Connection watchdog timeout — resetting stuck connecting state.');
    const staleSock = activeSocket;
    activeSocket = null;
    socketGeneration += 1;
    closeSocketQuietly(staleSock);

    if (!isSavedSessionRegistered()) {
      clearAuthDirectory();
    }

    connectionStatus = 'disconnected';
    statusDetail = null;
    currentQrDataUrl = null;
    connectedPhone = null;
    connectedName = null;
    isStarting = false;
    reconnectAttempts = 0;
    lastError =
      'Koneksi ke server WhatsApp melebihi batas waktu atau penautan di HP gagal. Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.';
  }, CONNECT_WATCHDOG_MS);
}

async function resolveLatestWaVersion(): Promise<[number, number, number] | undefined> {
  // Cache resolved version for 6 hours to make QR & 515 reconnects instant
  if (cachedWaVersion && Date.now() - cachedWaVersion.fetchedAt < 6 * 60 * 60 * 1000) {
    return cachedWaVersion.version;
  }

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Version fetch timeout')), ms)),
    ]);

  try {
    const waWeb = await withTimeout(fetchLatestWaWebVersion({}), VERSION_FETCH_TIMEOUT_MS);
    if (Array.isArray(waWeb?.version) && waWeb.version.length === 3) {
      cachedWaVersion = { version: waWeb.version, fetchedAt: Date.now() };
      return waWeb.version;
    }
  } catch {
    // fallback below
  }

  try {
    const baileysVer = await withTimeout(fetchLatestBaileysVersion(), VERSION_FETCH_TIMEOUT_MS);
    if (Array.isArray(baileysVer?.version) && baileysVer.version.length === 3) {
      cachedWaVersion = { version: baileysVer.version, fetchedAt: Date.now() };
      return baileysVer.version;
    }
  } catch {
    // fallback to bundled version
  }

  return undefined;
}

export function getWhatsAppStatus(): WhatsAppClientStatusSnapshot {
  return {
    status: connectionStatus,
    statusDetail,
    qrDataUrl: currentQrDataUrl,
    connectedPhone,
    connectedName,
    lastError,
    hasSavedSession: hasSavedSessionFiles(),
  };
}

async function startSocketConnection(options?: {
  isReconnect?: boolean;
  detailMessage?: string;
}): Promise<WhatsAppClientStatusSnapshot> {
  if (isStarting) {
    return getWhatsAppStatus();
  }

  isStarting = true;
  manualDisconnect = false;
  clearAllTimers();

  // Close any previous socket before creating a new one
  if (activeSocket) {
    const prev = activeSocket;
    activeSocket = null;
    closeSocketQuietly(prev);
  }

  const myGen = ++socketGeneration;
  connectionStatus = 'connecting';
  statusDetail = options?.detailMessage || 'Menghubungkan ke server WhatsApp...';
  currentQrDataUrl = null;
  if (!options?.isReconnect) {
    lastError = null;
    hasHadQrInAttempt = false;
  }

  startConnectingWatchdog(myGen);

  try {
    // Ensure any pending creds write from the prior socket has completely flushed to disk
    await credsSaveChain.catch(() => {});

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await resolveLatestWaVersion();

    // Abort if cancelled/reset while awaiting auth or version fetch
    if (myGen !== socketGeneration || manualDisconnect) {
      return getWhatsAppStatus();
    }

    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger as any),
      },
      logger: silentLogger as any,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 25_000,
      defaultQueryTimeoutMs: 25_000,
      keepAliveIntervalMs: 25_000,
      qrTimeout: 45_000,
    });

    activeSocket = sock;

    sock.ev.on('creds.update', () => {
      credsSaveChain = credsSaveChain
        .then(() => saveCreds())
        .catch((err) => {
          console.warn('[WhatsApp] saveCreds error:', err);
        });
    });

    sock.ev.on('connection.update', async (update) => {
      if (myGen !== socketGeneration) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        if (connectingWatchdogTimer) {
          clearTimeout(connectingWatchdogTimer);
          connectingWatchdogTimer = null;
        }
        hasHadQrInAttempt = true;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            width: 280,
            margin: 2,
            color: { dark: '#092147', light: '#FFFFFF' },
          });
          connectionStatus = 'qr';
          statusDetail = 'Scan QR Code menggunakan WhatsApp di HP Admin Grup';
          lastError = null;
          reconnectAttempts = 0;
        } catch (err) {
          console.warn('[WhatsApp] QR generation error:', err);
        }
      }

      if (connection === 'open') {
        clearAllTimers();
        connectionStatus = 'connected';
        statusDetail = 'Terhubung';
        currentQrDataUrl = null;
        lastError = null;
        reconnectAttempts = 0;
        hasHadQrInAttempt = false;
        const userId = sock.user?.id || '';
        connectedPhone = extractPhoneDigitsFromJid(userId) || null;
        connectedName = sock.user?.name || null;
        console.log(`[WhatsApp] Connected as +${connectedPhone || 'unknown'} (${connectedName || '-'})`);
      }

      if (connection === 'close') {
        if (connectingWatchdogTimer) {
          clearTimeout(connectingWatchdogTimer);
          connectingWatchdogTimer = null;
        }

        const errObj = lastDisconnect?.error as any;
        const statusCode: number | undefined =
          errObj?.output?.statusCode ?? errObj?.data?.statusCode ?? errObj?.statusCode;
        const errMessage = String(errObj?.message || '');

        console.log(
          `[WhatsApp] Connection closed (code=${statusCode ?? 'unknown'}, msg="${errMessage}", registered=${Boolean(
            state.creds.registered
          )})`
        );

        activeSocket = null;
        currentQrDataUrl = null;

        if (manualDisconnect) {
          connectionStatus = 'disconnected';
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          return;
        }

        // Wait for any in-flight creds.update write before deciding next step
        await credsSaveChain.catch(() => {});
        if (myGen !== socketGeneration || manualDisconnect) return;

        // 515 (restartRequired): Normal WhatsApp handshake step right after scanning QR code!
        const isRestartRequired =
          statusCode === DisconnectReason.restartRequired || statusCode === 515;

        if (isRestartRequired) {
          reconnectAttempts = 0;
          connectionStatus = 'connecting';
          statusDetail = 'QR berhasil dipindai! Menyelesaikan penautan dengan WhatsApp...';
          lastError = null;
          startConnectingWatchdog(myGen);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (myGen !== socketGeneration || manualDisconnect) return;
            startSocketConnection({
              isReconnect: true,
              detailMessage: 'Menyelesaikan penautan perangkat dengan WhatsApp...',
            }).catch(() => {});
          }, 500);
          return;
        }

        const isLoggedOutOrBadSession =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === 401 ||
          statusCode === 405 ||
          statusCode === DisconnectReason.badSession;

        if (isLoggedOutOrBadSession) {
          clearAuthDirectory();
          connectionStatus = 'disconnected';
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError =
            statusCode === 405
              ? 'Penautan ditolak oleh server WhatsApp (kode 405). Sesi lama telah dibersihkan — silakan klik "Tampilkan QR WhatsApp" dan scan ulang.'
              : 'Sesi WhatsApp terputus atau penautan dibatalkan dari HP. Silakan klik "Tampilkan QR WhatsApp" untuk scan ulang.';
          return;
        }

        const isQrExpiredOrPairingTimeout =
          statusCode === DisconnectReason.timedOut ||
          statusCode === 408 ||
          /qr refs attempts ended|timed out/i.test(errMessage);

        if (isQrExpiredOrPairingTimeout && (!state.creds.registered || hasHadQrInAttempt)) {
          if (!isSavedSessionRegistered()) {
            clearAuthDirectory();
          }
          connectionStatus = 'disconnected';
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError =
            'QR Code kedaluwarsa atau penautan di HP gagal. Silakan klik "Tampilkan QR WhatsApp" untuk memuat QR baru.';
          return;
        }

        // Transient disconnect: retry up to 2 times for already-registered sessions or initial handshake
        const maxRetries = isSavedSessionRegistered() ? 3 : 1;
        if (reconnectAttempts < maxRetries) {
          reconnectAttempts += 1;
          connectionStatus = 'connecting';
          statusDetail = `Menghubungkan ulang ke WhatsApp (percobaan ${reconnectAttempts}/${maxRetries})...`;
          startConnectingWatchdog(myGen);
          const delayMs = reconnectAttempts * 1500;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (myGen !== socketGeneration || manualDisconnect) return;
            startSocketConnection({
              isReconnect: true,
              detailMessage: `Menghubungkan ulang ke WhatsApp (${reconnectAttempts}/${maxRetries})...`,
            }).catch(() => {});
          }, delayMs);
        } else {
          if (!isSavedSessionRegistered()) {
            clearAuthDirectory();
          }
          connectionStatus = 'disconnected';
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError =
            errMessage && errMessage !== 'Connection Closed'
              ? `Koneksi WhatsApp gagal (${errMessage}). Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.`
              : 'Penautan WhatsApp gagal atau terputus. Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.';
        }
      }
    });
  } catch (err: any) {
    clearAllTimers();
    connectionStatus = 'disconnected';
    statusDetail = null;
    activeSocket = null;
    currentQrDataUrl = null;
    lastError = err?.message || 'Gagal memulai koneksi WhatsApp. Silakan coba lagi.';
  } finally {
    isStarting = false;
  }

  return getWhatsAppStatus();
}

export async function connectWhatsApp(options?: {
  forceReset?: boolean;
}): Promise<WhatsAppClientStatusSnapshot> {
  const forceReset = Boolean(options?.forceReset);

  if (!forceReset) {
    if (connectionStatus === 'connected' && activeSocket) {
      return getWhatsAppStatus();
    }
    if ((isStarting || activeSocket) && (connectionStatus === 'connecting' || connectionStatus === 'qr')) {
      return getWhatsAppStatus();
    }
  } else {
    // Explicit fresh start / retry requested by Admin
    manualDisconnect = false;
    clearAllTimers();
    socketGeneration += 1;
    if (activeSocket) {
      const old = activeSocket;
      activeSocket = null;
      closeSocketQuietly(old);
    }
    isStarting = false;
    reconnectAttempts = 0;
    // Clear incomplete/stale auth files when resetting a non-connected session
    if (connectionStatus !== 'connected') {
      clearAuthDirectory();
    }
    connectionStatus = 'disconnected';
    statusDetail = null;
    currentQrDataUrl = null;
    lastError = null;
  }

  return startSocketConnection({
    isReconnect: false,
    detailMessage: 'Menghubungkan ke server WhatsApp & menyiapkan QR Code...',
  });
}

export async function disconnectWhatsApp(logout: boolean = true): Promise<WhatsAppClientStatusSnapshot> {
  manualDisconnect = true;
  clearAllTimers();
  socketGeneration += 1;
  const sock = activeSocket;
  activeSocket = null;
  isStarting = false;
  connectionStatus = 'disconnected';
  statusDetail = null;
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
        closeSocketQuietly(sock);
      }
    } catch {
      closeSocketQuietly(sock);
    }
  }

  if (logout) {
    clearAuthDirectory();
  }

  return getWhatsAppStatus();
}

export function initWhatsAppIfSavedSession(): void {
  if (isSavedSessionRegistered()) {
    connectWhatsApp().catch((err) => {
      console.warn('[WhatsApp] Auto-resume session failed:', err?.message || err);
    });
  } else if (hasSavedSessionFiles()) {
    // Clean up half-paired unregistered credentials from a previously aborted scan
    clearAuthDirectory();
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
