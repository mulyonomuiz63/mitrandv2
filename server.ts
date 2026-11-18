import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured, getSupabaseConfig, testSupabaseConnection } from './src/supabase.ts';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar, resolveAvatarUrl, inferGenderFromName } from './src/avatars.ts';
import {
  OFFICIAL_ND_SERVICES,
  resolveServicePricingType,
  type ChatParticipant,
  type ChatRoom,
  type ChatMessage,
  type ChatLinkPreview,
} from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Disable Express fingerprinting header
app.disable('x-powered-by');

// 2. Enterprise HTTP Security Headers (Defense against XSS, MIME-Sniffing & Data Injection)
app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Deep Input Sanitizer (Protects against XSS, Prototype Pollution, Null-Byte & SQL/PostgREST Injection)
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const sanitizeStringValue = (input: string): string => {
  return input
    .replace(/\0/g, '') // Strip null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip <script> blocks
    .replace(/javascript\s*:/gi, 'blocked:') // Block javascript: URI scheme
    .replace(/vbscript\s*:/gi, 'blocked:') // Block vbscript: URI scheme
    .replace(/\bon(error|load|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=/gi, 'data-blocked-event=');
};

const sanitizePayloadDeep = (value: any, depth = 0): any => {
  if (depth > 12 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return sanitizeStringValue(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadDeep(item, depth + 1));
  }
  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      cleaned[key] = sanitizePayloadDeep(val, depth + 1);
    }
    return cleaned;
  }
  return value;
};

export const sanitizeSqlIdentifier = (raw: string): string => {
  return String(raw || '')
    .replace(/[\0;'"\\`]|--|\/\*|\*\//g, '')
    .trim();
};

export const escapeHtml = (unsafe: string): string => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const safeTimingCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// 4. In-Memory Rate Limiter (Protects API & Auth Endpoints from Brute-Force / DDoS)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const apiRateBuckets = new Map<string, RateLimitBucket>();
const authRateBuckets = new Map<string, RateLimitBucket>();

const getClientIp = (req: Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const consumeRateLimit = (
  store: Map<string, RateLimitBucket>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } => {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  existing.count += 1;
  if (existing.count > maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
};

app.use('/api', (req: Request, res: Response, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizePayloadDeep(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizePayloadDeep(req.params);
  }

  const clientIp = getClientIp(req);
  const generalCheck = consumeRateLimit(apiRateBuckets, clientIp, 300, 60 * 1000);
  if (!generalCheck.allowed) {
    res.setHeader('Retry-After', String(generalCheck.retryAfterSec));
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak permintaan dari jaringan Anda. Silakan tunggu ${generalCheck.retryAfterSec} detik sebelum mencoba kembali.`,
    });
  }
  next();
});

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  customBankFields?: Record<string, string>;
}

export interface Mitra {
  id: string;
  memberCode: string;
  referralCode: string;
  fullName: string;
  email: string;
  phone: string;
  nik: string;
  specialization: string;
  status: 'verified' | 'pending' | 'rejected';
  avatarUrl: string;
  gender?: 'male' | 'female';
  joinedDate: string;
  bankDetails: BankDetails;
  totalCommission: number;
  totalBonus: number;
  pendingPayout: number;
  paidPayout: number;
  referredClientsCount: number;
  activeSubscribersCount: number;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  customFields?: Record<string, string>;
}

export interface SpecializationOptionItem {
  id: string;
  label: string;
  isActive: boolean;
}

export interface DynamicFormField {
  id: string;
  systemKey?: string;
  isDefault?: boolean;
  section?: 'profile' | 'bank';
  label: string;
  placeholder?: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required: boolean;
  isActive: boolean;
}

export const DEFAULT_SPECIALIZATION_LABEL = 'Bidang Keahlian / Profesi Mitra';

export const DEFAULT_SPECIALIZATION_OPTIONS: SpecializationOptionItem[] = [
  { id: 'spec-1', label: 'Business Partner', isActive: true },
];

const LEGACY_SEEDED_SPEC_LABELS = new Set([
  'Konsultan Perpajakan & Tax Planning',
  'Hukum Korporasi & Bisnis',
  'Akuntansi & Pembukuan Korporat',
  'Legalitas & Perizinan OSS-RBA',
  'Kuasa Hukum Pengadilan Pajak',
  'Business Partner / Referral Umum',
]);

export const normalizeSpecializationOptions = (
  raw?: SpecializationOptionItem[]
): SpecializationOptionItem[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SPECIALIZATION_OPTIONS;
  }
  const customOrValid = raw.filter(
    (item) => item && item.label && !LEGACY_SEEDED_SPEC_LABELS.has(item.label.trim())
  );
  if (customOrValid.length === 0) {
    return DEFAULT_SPECIALIZATION_OPTIONS;
  }
  const hasBusinessPartner = customOrValid.some(
    (item) => item.label.trim().toLowerCase() === 'business partner'
  );
  return hasBusinessPartner
    ? customOrValid
    : [{ id: 'spec-1', label: 'Business Partner', isActive: true }, ...customOrValid];
};

export const DEFAULT_MITRA_FORM_FIELDS: DynamicFormField[] = [
  {
    id: 'mitra-def-fullName',
    systemKey: 'fullName',
    isDefault: true,
    section: 'profile',
    label: 'Nama Lengkap & Gelar',
    type: 'text',
    placeholder: 'Contoh: Muhammad Reza, S.H., M.H.',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-email',
    systemKey: 'email',
    isDefault: true,
    section: 'profile',
    label: 'Email Resmi',
    type: 'text',
    placeholder: 'nama@email.com',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-phone',
    systemKey: 'phone',
    isDefault: true,
    section: 'profile',
    label: 'No. WhatsApp Aktif',
    type: 'text',
    placeholder: '0812-xxxx-xxxx',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-nik',
    systemKey: 'nik',
    isDefault: true,
    section: 'profile',
    label: 'Nomor KTP / NIK',
    type: 'text',
    placeholder: '16 digit NIK resmi',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-specialization',
    systemKey: 'specialization',
    isDefault: true,
    section: 'profile',
    label: DEFAULT_SPECIALIZATION_LABEL,
    type: 'select',
    placeholder: 'Pilih Bidang Keahlian / Profesi Mitra',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-bankName',
    systemKey: 'bankName',
    isDefault: true,
    section: 'bank',
    label: 'Nama Bank Pencairan Komisi',
    type: 'select',
    options: [
      'Bank Central Asia (BCA)',
      'Bank Mandiri',
      'Bank Rakyat Indonesia (BRI)',
      'Bank Negara Indonesia (BNI)',
      'Bank Syariah Indonesia (BSI)',
      'CIMB Niaga',
    ],
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-accountNumber',
    systemKey: 'accountNumber',
    isDefault: true,
    section: 'bank',
    label: 'Nomor Rekening Bank',
    type: 'text',
    placeholder: 'Contoh: 8830192837',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-accountHolder',
    systemKey: 'accountHolder',
    isDefault: true,
    section: 'bank',
    label: 'Nama Pemilik Rekening',
    type: 'text',
    placeholder: 'Harus sesuai buku tabungan',
    required: true,
    isActive: true,
  },
];

export const DEFAULT_CLIENT_FORM_FIELDS: DynamicFormField[] = [
  {
    id: 'client-def-companyName',
    systemKey: 'companyName',
    isDefault: true,
    label: 'Nama Perusahaan / Entitas Klien',
    type: 'text',
    placeholder: 'Contoh: PT Surya Kencana Abadi',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picName',
    systemKey: 'picName',
    isDefault: true,
    label: 'Nama PIC / Direktur Penanggung Jawab',
    type: 'text',
    placeholder: 'Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picPhone',
    systemKey: 'picPhone',
    isDefault: true,
    label: 'Nomor WhatsApp / HP PIC',
    type: 'text',
    placeholder: '0812-XXXX-XXXX',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picEmail',
    systemKey: 'picEmail',
    isDefault: true,
    label: 'Email PIC / Kantor Klien',
    type: 'text',
    placeholder: 'finance@suryakencana.co.id',
    required: false,
    isActive: true,
  },
  {
    id: 'client-def-notes',
    systemKey: 'notes',
    isDefault: true,
    label: 'Catatan Tambahan & Kebutuhan Spesifik Klien',
    type: 'textarea',
    placeholder:
      'Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP.',
    required: false,
    isActive: true,
  },
];

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Laporan Keuangan' | 'Kepatuhan Pajak' | 'Pendampingan Audit' | 'Legalitas Korporasi' | 'Konsultasi Finansial';
  defaultPrice: number;
  pricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription';
  commissionRate: number;
  description: string;
  isActive: boolean;
}

export interface CommissionSchemeConfig {
  subHighThreshold: number;
  subHighRate: number;
  subMidThreshold: number;
  subMidRate: number;
  subLowRate: number;
  subRecurringRate: number;
  caseHighThreshold: number;
  caseHighRate: number;
  caseMidThreshold: number;
  caseMidRate: number;
  caseLowRate: number;
  updatedAt?: string;
}

export interface BonusRewardTier {
  id: string;
  no: number;
  salesTarget: number;
  rewardName: string;
  isActive: boolean;
}

export const DEFAULT_BONUS_REWARD_TIERS: BonusRewardTier[] = [
  { id: 'tier-1', no: 1, salesTarget: 500000000, rewardName: 'Jalan-Jalan LN', isActive: true },
  { id: 'tier-2', no: 2, salesTarget: 1000000000, rewardName: 'Motor Baru', isActive: true },
  { id: 'tier-3', no: 3, salesTarget: 1500000000, rewardName: 'Umroh', isActive: true },
  { id: 'tier-4', no: 4, salesTarget: 5000000000, rewardName: 'Mobil Baru', isActive: true },
  { id: 'tier-5', no: 5, salesTarget: 10000000000, rewardName: 'Rumah Baru', isActive: true },
];

export interface BonusTargetConfig {
  periodType: 'monthly' | 'yearly';
  monthlyBonusEnabled?: boolean;
  yearlyBonusEnabled?: boolean;
  targetDealRevenue: number;
  targetClientCount: number;
  standardBonusAmount: number;
  monthlyTargetDealRevenue?: number;
  monthlyTargetClientCount?: number;
  monthlyStandardBonusAmount?: number;
  yearlyTargetDealRevenue?: number;
  yearlyTargetClientCount?: number;
  yearlyStandardBonusAmount?: number;
  rewardTiers?: BonusRewardTier[];
  rewardDescription: string;
  updatedAt?: string;
}

export const DEFAULT_COMMISSION_SCHEME: CommissionSchemeConfig = {
  subHighThreshold: 10000000,
  subHighRate: 20,
  subMidThreshold: 5000000,
  subMidRate: 15,
  subLowRate: 10,
  subRecurringRate: 10,
  caseHighThreshold: 100000000,
  caseHighRate: 20,
  caseMidThreshold: 50000000,
  caseMidRate: 15,
  caseLowRate: 10,
};

export const DEFAULT_BONUS_TARGET_CONFIG: BonusTargetConfig = {
  periodType: 'yearly',
  monthlyBonusEnabled: true,
  yearlyBonusEnabled: true,
  targetDealRevenue: 500000000,
  targetClientCount: 12,
  standardBonusAmount: 25000000,
  monthlyTargetDealRevenue: 50000000,
  monthlyTargetClientCount: 3,
  monthlyStandardBonusAmount: 5000000,
  yearlyTargetDealRevenue: 500000000,
  yearlyTargetClientCount: 12,
  yearlyStandardBonusAmount: 25000000,
  rewardTiers: DEFAULT_BONUS_REWARD_TIERS,
  rewardDescription: 'Jalan-Jalan LN, Motor Baru, Umroh, Mobil Baru & Rumah Baru',
};

export const calculateClientDealCommission = (
  pricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription',
  dealValue: number,
  scheme?: Partial<CommissionSchemeConfig> | null
): {
  initialRate: number;
  initialAmount: number;
  recurringRate: number;
  recurringAmount: number;
  tierLabel: string;
} => {
  const cfg: CommissionSchemeConfig = {
    ...DEFAULT_COMMISSION_SCHEME,
    ...(scheme || {}),
  };
  const val = Math.max(0, Number(dealValue) || 0);

  if (pricingType === 'monthly_subscription' || pricingType === 'annual_subscription') {
    let initialRate = cfg.subLowRate;
    let tierLabel = `Langganan < Rp ${(cfg.subMidThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.subLowRate}%)`;

    if (val >= cfg.subHighThreshold) {
      initialRate = cfg.subHighRate;
      tierLabel = `Langganan ≥ Rp ${(cfg.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.subHighRate}%)`;
    } else if (val >= cfg.subMidThreshold) {
      initialRate = cfg.subMidRate;
      tierLabel = `Langganan Rp ${(cfg.subMidThreshold / 1000000).toLocaleString('id-ID')}–${(cfg.subHighThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.subMidRate}%)`;
    }

    const recurringRate = cfg.subRecurringRate;
    return {
      initialRate,
      initialAmount: Math.round((val * initialRate) / 100),
      recurringRate,
      recurringAmount: Math.round((val * recurringRate) / 100),
      tierLabel,
    };
  }

  let initialRate = cfg.caseLowRate;
  let tierLabel = `Per Kasus < Rp ${(cfg.caseMidThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.caseLowRate}%)`;

  if (val >= cfg.caseHighThreshold) {
    initialRate = cfg.caseHighRate;
    tierLabel = `Per Kasus ≥ Rp ${(cfg.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.caseHighRate}%)`;
  } else if (val >= cfg.caseMidThreshold) {
    initialRate = cfg.caseMidRate;
    tierLabel = `Per Kasus Rp ${(cfg.caseMidThreshold / 1000000).toLocaleString('id-ID')}–${(cfg.caseHighThreshold / 1000000).toLocaleString('id-ID')} Juta (${cfg.caseMidRate}%)`;
  }

  return {
    initialRate,
    initialAmount: Math.round((val * initialRate) / 100),
    recurringRate: 0,
    recurringAmount: 0,
    tierLabel,
  };
};

export interface ClientDeal {
  id: string;
  mitraId: string;
  mitraName: string;
  referralCode: string;
  companyName: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  serviceId: string;
  serviceName: string;
  pricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription';
  dealValue: number;
  commissionAmount: number;
  appliedCommissionRate?: number;
  lockedRecurringRate?: number;
  recurringCommissionAmount?: number;
  status: 'pending_acc' | 'deal_closed' | 'active_subscription' | 'in_review' | 'cancelled' | 'rejected';
  date: string;
  recurringPaidMonths?: number;
  recurringPaidYears?: number;
  periodStart?: string;
  periodEnd?: string;
  durationMonths?: number;
  paymentTermType?: 'one_time' | 'milestone';
  notes?: string;
  submittedBy?: 'mitra' | 'client_self';
  subscriptionStartDate?: string;
  billingDayOfMonth?: number;
  nextBillingDate?: string;
  lastBilledDate?: string;
  isBillingDue?: boolean;
  terminatedAt?: string;
  terminationReason?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  customFields?: Record<string, string>;
}

export interface PayoutRequest {
  id: string;
  mitraId: string;
  mitraName: string;
  memberCode: string;
  amount: number;
  bankDetails: BankDetails;
  requestDate: string;
  processedDate?: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  pph21Deduction?: number;
  pph21Rate?: number;
  adminFeeDeduction?: number;
  netAmountTransferred?: number;
  proofFileUrl?: string;
  proofFileName?: string;
  transferRefNumber?: string;
  disbursedBy?: string;
  notes?: string;
}

export interface AppSettings {
  firmName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  officeAddress: string;
  logoUrl?: string;
  appVersion?: string;
  copyrightText?: string;
  defaultCommissionRate: number;
  commissionScheme?: CommissionSchemeConfig;
  bonusTargetConfig?: BonusTargetConfig;
  payoutSchedule?: 'awal_bulan' | 'pertengahan_bulan' | 'akhir_bulan';
  payoutScheduleNote?: string;
  allowClientSelfRegister: boolean;
  chatEnabled?: boolean;
  googleOAuthEnabled: boolean;
  googleClientId: string;
  geminiApiEnabled: boolean;
  geminiModel: string;
  appEnvironment: 'development' | 'production';
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'tls' | 'ssl' | 'none';
  smtpUser: string;
  smtpPassword?: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
  smtpReplyToEmail?: string;
  emailOnRegistrationVerify: boolean;
  emailOnPayoutDisbursed: boolean;
  emailOnClientAcc: boolean;
  emailOnPasswordReset: boolean;
  emailOnRecurringInvoice: boolean;
  specializationEnabled?: boolean;
  specializationLabel?: string;
  specializationOptions?: SpecializationOptionItem[];
  mitraCustomFields?: DynamicFormField[];
  clientCustomFields?: DynamicFormField[];
  mitraFieldsInitialized?: boolean;
  clientFieldsInitialized?: boolean;
}

export interface EmailLogItem {
  id: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  category: 'registration_verify' | 'payout_disbursed' | 'client_acc' | 'password_reset' | 'recurring_invoice' | 'test_email' | 'other';
  sentAt: string;
  status: 'sent' | 'queued' | 'failed';
  previewSnippet: string;
  htmlContent?: string;
  errorMessage?: string;
  smtpHostUsed?: string;
}

export interface ActivityLogItem {
  id: string;
  actorRole: 'admin' | 'staff' | 'mitra' | 'client' | 'system';
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  actionType:
    | 'login'
    | 'register'
    | 'verify_email'
    | 'password_reset'
    | 'mitra_verify'
    | 'profile_update'
    | 'client_create'
    | 'client_acc'
    | 'client_update'
    | 'payout_request'
    | 'payout_approve'
    | 'service_create'
    | 'service_update'
    | 'service_delete'
    | 'tool_create'
    | 'tool_delete'
    | 'settings_update'
    | 'bonus_grant'
    | 'commission_scheme_update';
  operation: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE';
  targetEntity: string;
  description: string;
  timestamp: string;
}

export const DEFAULT_STAFF_ALLOWED_MENUS: string[] = [
  'dashboard',
  'admin-operations',
  'verification',
  'marketing-tools',
  'commissions',
  'manage-services',
  'settings-general',
  'settings-forms',
];

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  gender?: 'male' | 'female';
  avatarUrl: string;
  isActive: boolean;
  allowedMenus: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MarketingTool {
  id: string;
  title: string;
  category: 'Brosur Digital' | 'Banner Promosi' | 'Video Presentasi' | 'Panduan Penjualan' | 'Materi Pelatihan';
  fileType: 'pdf' | 'png' | 'jpg' | 'mp4' | 'stream';
  fileSize: string;
  downloadUrl: string;
  thumbnailUrl: string;
  description: string;
  duration?: string;
  createdAt: string;
  targetProduct: string;
}

export interface CommissionTransaction {
  id: string;
  mitraId: string;
  mitraName: string;
  serviceName: string;
  clientName: string;
  dealValue: number;
  commissionAmount: number;
  bonusAmount: number;
  status: 'paid' | 'processing' | 'pending';
  date: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'tools_update' | 'verification' | 'commission' | 'training' | 'client_deal' | 'system_update';
  timestamp: string;
  isRead: boolean;
  targetAudience?: 'admin_only' | 'admin_staff' | 'mitra';
  mitraId?: string;
}

const toSupabaseNotification = (n: NotificationItem) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type,
  timestamp: n.timestamp,
  isRead: Boolean(n.isRead),
});

// Initial Data with Default Male/Female Avatars
let mitras: Mitra[] = [
  {
    id: 'mitra-01',
    memberCode: 'ND-TAX-LAW-0042',
    referralCode: 'ND-REF-0042',
    fullName: 'Bambang Sudirman, S.H., M.Kn.',
    email: 'bambang.sudirman@example.com',
    phone: '0812-8899-7711',
    nik: '3201123456780001',
    specialization: 'Konsultan Hukum Korporasi & Kontrak Bisnis',
    status: 'verified',
    gender: 'male',
    avatarUrl: MALE_AVATAR_URL,
    joinedDate: '2026-01-15',
    bankDetails: {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830192837',
      accountHolder: 'Bambang Sudirman',
    },
    totalCommission: 34500000,
    totalBonus: 7500000,
    pendingPayout: 6200000,
    paidPayout: 35800000,
    referredClientsCount: 8,
    activeSubscribersCount: 3,
    emailVerified: true,
  },
  {
    id: 'mitra-02',
    memberCode: 'ND-TAX-LAW-0077',
    referralCode: 'ND-REF-0077',
    fullName: 'Dewi Lestari, S.E., B.K.P.',
    email: 'dewi.lestari@example.com',
    phone: '0813-2211-4455',
    nik: '3174098765430002',
    specialization: 'Spesialis Pajak Penghasilan Badan & Tax Planning',
    status: 'verified',
    gender: 'female',
    avatarUrl: FEMALE_AVATAR_URL,
    joinedDate: '2026-03-02',
    bankDetails: {
      bankName: 'Bank Mandiri',
      accountNumber: '1370019283741',
      accountHolder: 'Dewi Lestari',
    },
    totalCommission: 48200000,
    totalBonus: 12000000,
    pendingPayout: 0,
    paidPayout: 60200000,
    referredClientsCount: 12,
    activeSubscribersCount: 5,
    emailVerified: true,
  },
  {
    id: 'mitra-03',
    memberCode: 'ND-TAX-LAW-0089',
    referralCode: 'ND-REF-0089',
    fullName: 'Rian Pratama, S.H.',
    email: 'rian.pratama@example.com',
    phone: '0857-4433-2211',
    nik: '3302051203920003',
    specialization: 'Pendirian Legalitas PT / CV & Perizinan OSS-RBA',
    status: 'pending',
    gender: 'male',
    avatarUrl: MALE_AVATAR_URL,
    joinedDate: '2026-11-05',
    bankDetails: {
      bankName: 'Bank Rakyat Indonesia (BRI)',
      accountNumber: '020601089274502',
      accountHolder: 'Rian Pratama',
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: true,
  },
];

let marketingTools: MarketingTool[] = [
  {
    id: 'tool-01',
    title: 'Katalog Layanan Lengkap NDTAXANDLAW 2026',
    category: 'Brosur Digital',
    fileType: 'pdf',
    fileSize: '4.8 MB',
    downloadUrl: '#katalog-2026-pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    description: 'Panduan komprehensif seluruh portofolio jasa hukum korporasi, litigasi, perencanaan pajak, dan restrukturisasi finansial untuk calon klien.',
    createdAt: '2026-10-20',
    targetProduct: 'Semua Layanan Korporasi & Pajak',
  },
  {
    id: 'tool-02',
    title: 'Banner Promosi: Solusi Audit & SP2DK Pajak 2026',
    category: 'Banner Promosi',
    fileType: 'png',
    fileSize: '2.1 MB',
    downloadUrl: '#banner-sp2dk-png',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    description: 'Format siap posting di Instagram Feed, LinkedIn, & status WhatsApp dengan pesan edukatif pendampingan pemeriksaan pajak resmi.',
    createdAt: '2026-10-28',
    targetProduct: 'Jasa Pendampingan Audit & SP2DK',
  },
  {
    id: 'tool-03',
    title: 'Video Edukasi: Keuntungan Pendirian PT PMA & Legalitas Usaha',
    category: 'Video Presentasi',
    fileType: 'mp4',
    fileSize: '28.4 MB',
    duration: '04:15 min',
    downloadUrl: '#video-pma-mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    description: 'Video animasi penjelasan hukum dan pajak kemudahan investasi dan perizinan berusaha bagi pelaku usaha lokal maupun investor asing.',
    createdAt: '2026-11-02',
    targetProduct: 'Pendirian Legalitas PT / PMA',
  },
  {
    id: 'tool-04',
    title: 'Playbook Strategi Closing Klien Konsultan Hukum Pajak',
    category: 'Materi Pelatihan',
    fileType: 'pdf',
    fileSize: '6.2 MB',
    downloadUrl: '#playbook-closing-pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    description: 'Modul materi pelatihan eksklusif untuk mitra: teknik negosiasi retainer hukum, penanganan objection klien bisnis, dan formulasi proposal.',
    createdAt: '2026-11-04',
    targetProduct: 'Retainer Konsultan Pajak & Hukum',
  },
  {
    id: 'tool-05',
    title: 'Deck Presentasi Pitching Dewan Direksi (PPTX to PDF)',
    category: 'Panduan Penjualan',
    fileType: 'pdf',
    fileSize: '8.5 MB',
    downloadUrl: '#deck-pitch-pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    description: 'Slide siap pakai berstandar tinggi untuk dipresentasikan mitra saat meeting tatap muka dengan Direksi atau Pemegang Saham.',
    createdAt: '2026-11-06',
    targetProduct: 'Legal Due Diligence & M&A',
  },
];

const LEGACY_SEEDED_SERVICE_IDS = new Set([
  'srv-01',
  'srv-02',
  'srv-03',
  'srv-04',
  'srv-05',
  'srv-06',
  'srv-07',
  'srv-08',
]);

export const normalizeServicesCatalog = (
  rawList: ServiceItem[]
): { list: ServiceItem[]; migrated: boolean } => {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return {
      list: OFFICIAL_ND_SERVICES.map((s) => ({ ...s })),
      migrated: true,
    };
  }

  let migrated = false;
  const filtered = rawList
    .filter((s) => {
      if (!s || LEGACY_SEEDED_SERVICE_IDS.has(s.id)) {
        migrated = true;
        return false;
      }
      return true;
    })
    .map((s) => {
      const resolvedPricing = resolveServicePricingType(s);
      if (s.pricingType !== resolvedPricing) {
        migrated = true;
      }
      return {
        ...s,
        pricingType: resolvedPricing,
      };
    });

  const hasOfficial = filtered.some((s) => s.id.startsWith('srv-nd-'));
  if (!hasOfficial) {
    migrated = true;
    return {
      list: [...OFFICIAL_ND_SERVICES.map((s) => ({ ...s })), ...filtered],
      migrated,
    };
  }

  return { list: filtered, migrated };
};

let services: ServiceItem[] = OFFICIAL_ND_SERVICES.map((s) => ({ ...s }));

let clientDeals: ClientDeal[] = [
  {
    id: 'deal-01',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    referralCode: 'ND-REF-0042',
    companyName: 'PT Nusantara Energi Makmur',
    picName: 'Hendra Wijaya (Direktur Keuangan)',
    picPhone: '0811-2233-4455',
    picEmail: 'hendra.wijaya@nusantaraenergi.co.id',
    serviceId: 'srv-01',
    serviceName: 'Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)',
    pricingType: 'monthly_subscription',
    dealValue: 12000000,
    commissionAmount: 2400000,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 1200000,
    status: 'active_subscription',
    date: '2026-08-10',
    subscriptionStartDate: '2026-08-10',
    billingDayOfMonth: 10,
    nextBillingDate: '2026-11-10',
    lastBilledDate: '2026-10-10',
    isBillingDue: true,
    recurringPaidMonths: 3,
    notes: 'Klien berlangganan retainer laporan keuangan bulanan & review pajak sejak Agustus 2026 (Deal ≥10 Jt: Komisi Awal 20%, Bulan Berikutnya 10%).',
  },
  {
    id: 'deal-02',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    referralCode: 'ND-REF-0042',
    companyName: 'PT Sinar Logistik Samudra',
    picName: 'Ibu Ratna Dewi (Komisaris)',
    picPhone: '0812-9988-7766',
    picEmail: 'ratna@sinarlogistik.com',
    serviceId: 'srv-04',
    serviceName: 'Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP',
    pricingType: 'case_by_case',
    dealValue: 45000000,
    commissionAmount: 4500000,
    appliedCommissionRate: 10,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
    status: 'deal_closed',
    date: '2026-10-15',
    notes: 'Kasus SP2DK ketidaksesuaian omset PPN telah selesai diselesaikan dengan DJP (Case <50 Jt: Komisi 10% cair).',
  },
  {
    id: 'deal-03',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    referralCode: 'ND-REF-0077',
    companyName: 'CV Berkah Manunggal Pangan',
    picName: 'Budi Santoso (Founder & CEO)',
    picPhone: '0813-5566-7788',
    picEmail: 'budi@berkahpangan.co.id',
    serviceId: 'srv-03',
    serviceName: 'Paket Kepatuhan Pajak Bulanan (SPT Masa PPh 21/23/25/4(2) & PPN 1111)',
    pricingType: 'monthly_subscription',
    dealValue: 6000000,
    commissionAmount: 900000,
    appliedCommissionRate: 15,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 600000,
    status: 'active_subscription',
    date: '2026-09-01',
    subscriptionStartDate: '2026-09-01',
    billingDayOfMonth: 1,
    nextBillingDate: '2026-11-01',
    lastBilledDate: '2026-10-01',
    isBillingDue: true,
    recurringPaidMonths: 2,
    notes: 'Pelaporan SPT Masa rutin setiap bulan (Deal 5–10 Jt: Komisi Awal 15%, Bulan Berikutnya 10%).',
  },
  {
    id: 'deal-04',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    referralCode: 'ND-REF-0042',
    companyName: 'PT Bahari Mandiri Nusantara',
    picName: 'Ahmad Fauzi (Direktur Operasional)',
    picPhone: '0812-3344-5566',
    picEmail: 'fauzi@baharimandiri.com',
    serviceId: 'srv-01',
    serviceName: 'Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)',
    pricingType: 'monthly_subscription',
    dealValue: 10000000,
    commissionAmount: 2000000,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 1000000,
    status: 'pending_acc',
    date: '2026-11-09',
    subscriptionStartDate: '2026-11-09',
    billingDayOfMonth: 9,
    notes: 'Klien mengisi formulir registrasi mandiri via tautan referral Mitra Bambang Sudirman.',
    submittedBy: 'client_self',
  },
  {
    id: 'deal-05',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    referralCode: 'ND-REF-0077',
    companyName: 'PT Cipta Kreasi Sejahtera',
    picName: 'Maya Indah (General Manager)',
    picPhone: '0813-9900-1122',
    picEmail: 'maya@ciptakreasi.co.id',
    serviceId: 'srv-04',
    serviceName: 'Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP',
    pricingType: 'case_by_case',
    dealValue: 35000000,
    commissionAmount: 3500000,
    appliedCommissionRate: 10,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
    status: 'pending_acc',
    date: '2026-11-08',
    notes: 'Kebutuhan mendesak tanggapan SP2DK KPP Pratama Tebet.',
    submittedBy: 'client_self',
  },
  {
    id: 'deal-06',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    referralCode: 'ND-REF-0042',
    companyName: 'PT Samudera Petro Energi',
    picName: 'Ir. Ridwan Kamil (Project Director)',
    picPhone: '0811-9876-5432',
    picEmail: 'ridwan@samuderapetro.co.id',
    serviceId: 'srv-05',
    serviceName: 'Tax Planning, Restrukturisasi Bisnis & Dokumentasi Transfer Pricing (TP Doc)',
    pricingType: 'case_by_case',
    dealValue: 85000000,
    commissionAmount: 12750000,
    appliedCommissionRate: 15,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
    status: 'deal_closed',
    date: '2026-06-15',
    periodStart: 'Februari 2024',
    periodEnd: 'April 2025',
    durationMonths: 15,
    paymentTermType: 'one_time',
    notes: 'Perikatan restrukturisasi keuangan & pajak multi-bulan periode Feb 2024 s/d Apr 2025 (15 Bulan) - Sekali bayar (Deal 50–100 Jt: Komisi 15%).',
  },
  {
    id: 'deal-07',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    referralCode: 'ND-REF-0077',
    companyName: 'PT Graha Rekayasa Konstruksi',
    picName: 'Drs. Hendro Wibowo (Direktur Utama)',
    picPhone: '0812-7766-5544',
    picEmail: 'hendro@graharekayasa.com',
    serviceId: 'srv-07',
    serviceName: 'Retainer Kepatuhan Pajak & Audit Keuangan Tahunan (Annual Retainer)',
    pricingType: 'annual_subscription',
    dealValue: 65000000,
    commissionAmount: 13000000,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 6500000,
    status: 'active_subscription',
    date: '2026-03-20',
    subscriptionStartDate: '2026-03-20',
    billingDayOfMonth: 20,
    nextBillingDate: '2027-03-20',
    lastBilledDate: '2026-03-20',
    isBillingDue: false,
    recurringPaidYears: 1,
    notes: 'Langganan tahunan retainer kepatuhan pajak & audit keuangan komprehensif (Deal ≥10 Jt: Komisi Awal 20%, Siklus Berikutnya 10%).',
  },
];

let payoutRequests: PayoutRequest[] = [
  {
    id: 'pay-001',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    memberCode: 'ND-TAX-LAW-0042',
    amount: 6200000,
    bankDetails: {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830192837',
      accountHolder: 'Bambang Sudirman',
    },
    requestDate: '2026-11-08',
    status: 'pending',
    notes: 'Pengajuan pencairan komisi closing kuartal berjalan.',
  },
  {
    id: 'pay-002',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    memberCode: 'ND-TAX-LAW-0077',
    amount: 18000000,
    bankDetails: {
      bankName: 'Bank Mandiri',
      accountNumber: '1370019283741',
      accountHolder: 'Dewi Lestari',
    },
    requestDate: '2026-10-26',
    processedDate: '2026-10-26',
    status: 'approved',
    pph21Deduction: 450000,
    pph21Rate: 2.5,
    adminFeeDeduction: 2500,
    netAmountTransferred: 17547500,
    transferRefNumber: 'TRX-MDR-20261026-99214',
    proofFileName: 'Bukti_Transfer_Mandiri_Dewi_Lestari.pdf',
    disbursedBy: 'Admin Operasional NDTAXANDLAW',
    notes: 'Pencairan komisi PT Global Indo Logistik - Sukses ditransfer via BI-FAST.',
  },
  {
    id: 'pay-003',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    memberCode: 'ND-TAX-LAW-0042',
    amount: 11250000,
    bankDetails: {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830192837',
      accountHolder: 'Bambang Sudirman',
    },
    requestDate: '2026-10-15',
    processedDate: '2026-10-15',
    status: 'approved',
    pph21Deduction: 281250,
    pph21Rate: 2.5,
    adminFeeDeduction: 2500,
    netAmountTransferred: 10966250,
    transferRefNumber: 'TRX-BCA-20261015-88102',
    proofFileName: 'Bukti_Transfer_BCA_Bambang_Sudirman.pdf',
    disbursedBy: 'Admin Operasional NDTAXANDLAW',
    notes: 'Pencairan komisi PT Nusantara Megah Resources - Sukses.',
  },
];

let appSettings: AppSettings = {
  firmName: 'NDTAXANDLAW',
  tagline: 'Firma Konsultan Pajak & Kuasa Hukum Pengadilan Pajak Terakreditasi',
  supportPhone: '0812-8899-7711',
  supportEmail: 'advisory@ndtaxandlaw.com',
  officeAddress: 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
  logoUrl: '/assets/aistudio/logo_nd_vertikal.svg',
  appVersion: 'v2.5.0',
  copyrightText: 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.',
  defaultCommissionRate: 15,
  commissionScheme: { ...DEFAULT_COMMISSION_SCHEME },
  bonusTargetConfig: { ...DEFAULT_BONUS_TARGET_CONFIG },
  allowClientSelfRegister: true,
  chatEnabled: true,
  googleOAuthEnabled: false,
  googleClientId: '',
  geminiApiEnabled: true,
  geminiModel: 'gemini-3.8-flash',
  appEnvironment: (process.env.APP_ENV === 'development' ? 'development' : 'production') as 'development' | 'production',
  smtpEnabled: true,
  smtpHost: process.env.SMTP_HOST || 'mail.ndtaxandlaw.com',
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpEncryption: (process.env.SMTP_ENCRYPTION as 'ssl' | 'tls' | 'none') || 'ssl',
  smtpUser: process.env.SMTP_USER || 'notifications@ndtaxandlaw.com',
  smtpPassword: process.env.SMTP_PASS || '',
  smtpSenderName: 'NDTAXANDLAW System',
  smtpSenderEmail: process.env.SMTP_USER || 'notifications@ndtaxandlaw.com',
  smtpReplyToEmail: 'advisory@ndtaxandlaw.com',
  emailOnRegistrationVerify: true,
  emailOnPayoutDisbursed: true,
  emailOnClientAcc: true,
  emailOnPasswordReset: true,
  emailOnRecurringInvoice: true,
  specializationEnabled: true,
  specializationLabel: DEFAULT_SPECIALIZATION_LABEL,
  specializationOptions: DEFAULT_SPECIALIZATION_OPTIONS,
  mitraCustomFields: DEFAULT_MITRA_FORM_FIELDS,
  clientCustomFields: DEFAULT_CLIENT_FORM_FIELDS,
  mitraFieldsInitialized: true,
  clientFieldsInitialized: true,
};

let emailLogs: EmailLogItem[] = [];

let activityLogs: ActivityLogItem[] = [
  {
    id: 'act-seed-01',
    actorRole: 'admin',
    actorId: 'admin-01',
    actorName: 'Admin Operasional NDTAXANDLAW',
    actorEmail: 'admin@ndtaxandlaw.com',
    actionType: 'payout_approve',
    operation: 'UPDATE',
    targetEntity: 'Pembayaran Komisi Mitra',
    description: 'Menyetujui dan mentransfer pembayaran komisi Rp 17.547.500 untuk Mitra Dewi Lestari, S.E., B.K.P. (Ref: #TRX-MDR-20261026-99214).',
    timestamp: '2026-10-26T11:00:00Z',
  },
  {
    id: 'act-seed-02',
    actorRole: 'mitra',
    actorId: 'mitra-01',
    actorName: 'Bambang Sudirman, S.H., M.Kn.',
    actorEmail: 'bambang.sudirman@example.com',
    actionType: 'client_create',
    operation: 'CREATE',
    targetEntity: 'Input Klien',
    description: 'Menambahkan pengajuan deal klien baru "PT Bahari Mandiri Nusantara" dengan nilai kontrak Rp 10.000.000.',
    timestamp: '2026-11-09T09:15:00Z',
  },
  {
    id: 'act-seed-03',
    actorRole: 'mitra',
    actorId: 'mitra-03',
    actorName: 'Rian Pratama, S.H.',
    actorEmail: 'rian.pratama@example.com',
    actionType: 'register',
    operation: 'CREATE',
    targetEntity: 'Pendaftaran Mitra',
    description: 'Pendaftaran akun mitra baru Rian Pratama, S.H. (Spesialisasi Bisnis: Pendirian Legalitas PT / CV & Perizinan OSS-RBA).',
    timestamp: '2026-11-05T14:20:00Z',
  },
];

// Cloud Persistence Helpers for Settings, Activity Logs, and Email Logs (Dual-Layer: Dedicated Table + user_passwords KV Fallback)
export const persistSettingsToSupabase = async () => {
  if (!supabase) return;
  try {
    await supabase.from('user_passwords').upsert([
      { email: '__sys_config__@ndtaxlaw.internal', password: JSON.stringify(appSettings) },
      { email: '__sys_roles__@ndtaxlaw.internal', password: JSON.stringify(systemRoles) },
    ]);
  } catch (e) {
    console.warn('[Supabase Settings KV Warning]', e);
  }
  try {
    await supabase.from('app_settings').upsert([
      { id: 'config_primary', settings: { ...appSettings, roles: systemRoles }, updated_at: new Date().toISOString() },
    ]);
  } catch {
    // Table app_settings is optional if user_passwords KV is active
  }
};

export const getThreeMonthsAgoCutoff = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return {
    cutoffMs: d.getTime(),
    cutoffIso: d.toISOString(),
  };
};

export const pruneOldLogs = async (syncSupabase = false) => {
  const { cutoffMs, cutoffIso } = getThreeMonthsAgoCutoff();
  const prevActLen = activityLogs.length;
  const prevEmLen = emailLogs.length;

  activityLogs = activityLogs.filter((item) => {
    const t = new Date(item.timestamp || 0).getTime();
    return !Number.isNaN(t) && t >= cutoffMs;
  });

  emailLogs = emailLogs.filter((item) => {
    const t = new Date(item.sentAt || 0).getTime();
    return !Number.isNaN(t) && t >= cutoffMs;
  });

  const changed = activityLogs.length !== prevActLen || emailLogs.length !== prevEmLen;
  if (changed) {
    saveDatabase();
  }

  if (supabase && (syncSupabase || changed)) {
    try {
      await Promise.all([
        supabase.from('activity_logs').delete().lt('timestamp', cutoffIso),
        supabase.from('email_logs').delete().lt('timestamp', cutoffIso),
      ]);
      if (changed) {
        await supabase.from('user_passwords').upsert([
          { email: '__sys_activity_logs__@ndtaxlaw.internal', password: JSON.stringify(activityLogs.slice(0, 250)) },
          {
            email: '__sys_email_logs__@ndtaxlaw.internal',
            password: JSON.stringify(emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest)),
          },
        ]);
      }
    } catch {
      // Ignore optional table cleanup errors
    }
  }
};

export const persistActivityLogsToSupabase = async (latestItem?: ActivityLogItem) => {
  if (!supabase) return;
  try {
    await supabase.from('user_passwords').upsert([
      { email: '__sys_activity_logs__@ndtaxlaw.internal', password: JSON.stringify(activityLogs.slice(0, 250)) },
    ]);
  } catch (e) {
    console.warn('[Supabase Activity Logs KV Warning]', e);
  }
  if (latestItem) {
    try {
      await supabase.from('activity_logs').upsert([latestItem]);
    } catch {
      // Table activity_logs is optional if user_passwords KV is active
    }
  }
};

export const toSupabaseEmailLogRow = (item: EmailLogItem) => ({
  id: item.id,
  recipient: item.recipient,
  recipientName: item.recipientName || item.recipient,
  subject: item.subject,
  category: item.category,
  status: item.status,
  smtpResponse:
    item.status === 'failed'
      ? `ERROR [${item.smtpHostUsed || 'SMTP'}]: ${item.errorMessage || 'Gagal mengirim email'}`
      : `OK [${item.smtpHostUsed || 'SMTP'}]`,
  timestamp: item.sentAt || new Date().toISOString(),
  previewSnippet: item.previewSnippet || '',
});

export const fromSupabaseEmailLogRow = (row: any): EmailLogItem => {
  const rawResp = String(row.smtpResponse || '');
  const hostMatch = rawResp.match(/\[(.*?)\]/);
  const extractedHost = row.smtpHostUsed || (hostMatch ? hostMatch[1] : undefined);
  const extractedError =
    row.errorMessage ||
    (row.status === 'failed'
      ? rawResp.replace(/^ERROR\s*\[.*?\]:\s*/i, '').trim() || 'Pengiriman email gagal'
      : undefined);

  return {
    id: row.id,
    recipient: row.recipient || '',
    recipientName: row.recipientName || row.recipient || '',
    subject: row.subject || '',
    category: row.category || 'system_alert',
    sentAt: row.sentAt || row.timestamp || new Date().toISOString(),
    status: row.status === 'sent' ? 'sent' : 'failed',
    previewSnippet: row.previewSnippet || '',
    errorMessage: extractedError,
    smtpHostUsed: extractedHost,
  };
};

export const persistEmailLogsToSupabase = async (latestItem?: EmailLogItem) => {
  await pruneOldLogs(false);
  if (!supabase) return;
  try {
    const compactLogs = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
    await supabase.from('user_passwords').upsert([
      { email: '__sys_email_logs__@ndtaxlaw.internal', password: JSON.stringify(compactLogs) },
    ]);
  } catch (e) {
    console.warn('[Supabase Email Logs KV Warning]', e);
  }
  try {
    if (latestItem) {
      await supabase.from('email_logs').upsert([toSupabaseEmailLogRow(latestItem)]);
    } else if (emailLogs.length > 0) {
      const rows = emailLogs.slice(0, 100).map(toSupabaseEmailLogRow);
      await supabase.from('email_logs').upsert(rows);
    }
  } catch (e) {
    console.warn('[Supabase email_logs Table Warning]', e);
  }
};

// Helper to record system-wide Activity Logs (Admin & Mitra)
export const recordActivity = (params: {
  actorRole: ActivityLogItem['actorRole'];
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  actionType: ActivityLogItem['actionType'];
  operation: ActivityLogItem['operation'];
  targetEntity: string;
  description: string;
}) => {
  const newItem: ActivityLogItem = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorRole: params.actorRole,
    actorId: params.actorId,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actionType: params.actionType,
    operation: params.operation,
    targetEntity: params.targetEntity,
    description: params.description,
    timestamp: new Date().toISOString(),
  };
  activityLogs.unshift(newItem);
  void pruneOldLogs(false);
  if (activityLogs.length > 500) {
    activityLogs = activityLogs.slice(0, 500);
  }
  saveDatabase();
  void persistActivityLogsToSupabase(newItem);
  return newItem;
};

// Build Professional HTML Email Template (Protected with HTML Entity Escaping against XSS/HTML Injection)
const buildEmailHtml = (subject: string, recipientName: string, snippet: string) => {
  const safeFirmName = escapeHtml(appSettings.firmName || 'NDTAXANDLAW');
  const safeTagline = escapeHtml(appSettings.tagline || 'Tax & Legal Advisory Portal');
  const safeRecipient = escapeHtml(recipientName || 'Mitra NDTAXANDLAW');
  const safeSubject = escapeHtml(subject);
  const safeSnippetHtml = escapeHtml(snippet).replace(/\n/g, '<br/>');
  const safePhone = escapeHtml(appSettings.supportPhone || '');
  const safeSupportEmail = escapeHtml(appSettings.supportEmail || '');
  const safeAddress = escapeHtml(appSettings.officeAddress || '');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #092147 0%, #113872 100%); padding: 20px 24px; border-radius: 10px 10px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">${safeFirmName}</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fcd34d;">${safeTagline}</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none; color: #1e293b;">
        <p style="margin-top: 0; font-size: 14px;">Yth. <strong>${safeRecipient}</strong>,</p>
        <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px;">${safeSubject}</h3>
        <div style="background-color: #f1f5f9; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #334155;">
          ${safeSnippetHtml}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Jika Anda memiliki pertanyaan, silakan hubungi tim operasional kami melalui WhatsApp di <strong>${safePhone}</strong> atau balas email ini ke <strong>${safeSupportEmail}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Email ini dikirim secara otomatis oleh Sistem Portal Kemitraan ${safeFirmName}.<br/>
          ${safeAddress}
        </p>
      </div>
    </div>
  `;
};

// Real SMTP Email Dispatcher using Nodemailer
export const sendSystemEmail = async (params: {
  recipient: string;
  recipientName?: string;
  subject: string;
  category: EmailLogItem['category'];
  previewSnippet: string;
  htmlContent?: string;
}): Promise<{ success: boolean; logId: string; message: string; error?: string }> => {
  // Pastikan konfigurasi SMTP terbaru dari Supabase termuat jika ada perubahan
  if (supabase && (!appSettings.smtpPassword || appSettings.smtpPassword === '••••••••••••••••')) {
    try {
      const { data: kvCfg } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('email', '__sys_config__@ndtaxlaw.internal')
        .maybeSingle();
      if (kvCfg && kvCfg.password) {
        const parsed = JSON.parse(kvCfg.password);
        if (parsed && typeof parsed === 'object') {
          appSettings = { ...appSettings, ...parsed };
        }
      }
    } catch {}
  }

  const host = (appSettings.smtpHost || process.env.SMTP_HOST || '').trim();
  const port = Number(appSettings.smtpPort || process.env.SMTP_PORT || 465);
  const user = (appSettings.smtpUser || process.env.SMTP_USER || '').trim();
  const pass = appSettings.smtpPassword || process.env.SMTP_PASS || '';
  const encryption = port === 465 ? 'ssl' : (appSettings.smtpEncryption || 'tls');
  const smtpHostUsed = `${host}:${port} (${encryption.toUpperCase()})`;

  if (!appSettings.smtpEnabled) {
    const failedLog: EmailLogItem = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: new Date().toISOString(),
      status: 'failed',
      previewSnippet: params.previewSnippet,
      errorMessage: 'Server SMTP sedang dinonaktifkan dalam pengaturan sistem.',
      smtpHostUsed,
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    return { success: false, logId: failedLog.id, message: failedLog.errorMessage! };
  }

  // Validate real SMTP credentials before attempting connection
  if (!host || !user || !pass || pass === '••••••••••••••••') {
    const errMsg = 'Kredensial SMTP belum dikonfigurasi lengkap (Host, Email User, atau Password SMTP masih kosong / default). Silakan atur kredensial SMTP Niagahoster/cPanel Anda di menu Pengaturan SMTP.';
    const failedLog: EmailLogItem = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: new Date().toISOString(),
      status: 'failed',
      previewSnippet: params.previewSnippet,
      errorMessage: errMsg,
      smtpHostUsed,
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    console.warn(`[SMTP Gagal] ${errMsg}`);
    return { success: false, logId: failedLog.id, message: errMsg, error: errMsg };
  }

  const isSecure = port === 465;

  // On Niagahoster / cPanel / Hostinger, sender email must match authenticated user or same domain to avoid 550 Sender Verify Failed
  let fromEmail = (appSettings.smtpSenderEmail || '').trim();
  if (
    !fromEmail ||
    fromEmail === 'notifications@ndtaxandlaw.com' ||
    fromEmail === 'notifications@ndtaxlaw.com' ||
    !fromEmail.includes('@')
  ) {
    fromEmail = user;
  }
  const fromName = (appSettings.smtpSenderName || appSettings.firmName || 'NDTAXANDLAW').replace(/"/g, '');

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const htmlBody = params.htmlContent || buildEmailHtml(params.subject, params.recipientName || params.recipient, params.previewSnippet);

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.recipient,
      replyTo: appSettings.smtpReplyToEmail || fromEmail,
      subject: params.subject,
      text: params.previewSnippet,
      html: htmlBody,
    });

    const sentLog: EmailLogItem = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: new Date().toISOString(),
      status: 'sent',
      previewSnippet: params.previewSnippet,
      htmlContent: htmlBody,
      smtpHostUsed,
    };

    emailLogs.unshift(sentLog);
    saveDatabase();
    await persistEmailLogsToSupabase(sentLog);
    console.log(`[SMTP Terkirim] [${params.category}] Ke: ${params.recipient} | MessageID: ${info.messageId} via ${smtpHostUsed}`);
    return {
      success: true,
      logId: sentLog.id,
      message: `Email berhasil dikirim ke ${params.recipient} melalui server SMTP ${smtpHostUsed}.`,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Koneksi ke server SMTP gagal / ditolak.';
    const failedLog: EmailLogItem = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: new Date().toISOString(),
      status: 'failed',
      previewSnippet: params.previewSnippet,
      errorMessage: errMsg,
      smtpHostUsed,
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    console.error(`[SMTP Error] Gagal mengirim email ke ${params.recipient} via ${smtpHostUsed}:`, errMsg);
    return {
      success: false,
      logId: failedLog.id,
      message: `Gagal mengirim email melalui SMTP (${smtpHostUsed}): ${errMsg}`,
      error: errMsg,
    };
  }
};

let commissions: CommissionTransaction[] = [
  {
    id: 'trx-101',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    serviceName: 'Pendirian PT PMA & Izin Usaha Tambang',
    clientName: 'PT Nusantara Megah Resources',
    dealValue: 75000000,
    commissionAmount: 11250000,
    bonusAmount: 2000000,
    status: 'paid',
    date: '2026-10-14',
  },
  {
    id: 'trx-102',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    serviceName: 'Annual Tax Compliance & Transfer Pricing Doc',
    clientName: 'PT Global Indo Logistik',
    dealValue: 120000000,
    commissionAmount: 18000000,
    bonusAmount: 5000000,
    status: 'paid',
    date: '2026-10-25',
  },
  {
    id: 'trx-103',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    serviceName: 'Legal Due Diligence Akuisisi Saham',
    clientName: 'CV Sinar Abadi Raya',
    dealValue: 45000000,
    commissionAmount: 6200000,
    bonusAmount: 0,
    status: 'processing',
    date: '2026-11-02',
  },
  {
    id: 'trx-104',
    mitraId: 'mitra-02',
    mitraName: 'Dewi Lestari, S.E., B.K.P.',
    serviceName: 'Restrukturisasi Utang & Pajak Kepailitan',
    clientName: 'PT Mitra Graha Sentosa',
    dealValue: 90000000,
    commissionAmount: 13500000,
    bonusAmount: 3000000,
    status: 'processing',
    date: '2026-11-07',
  },
];

let notifications: NotificationItem[] = [
  {
    id: 'notif-mtr-mitra-01-verify',
    title: 'Status Kemitraan Disetujui (Lulus Verifikasi)',
    message: 'Selamat! Pendaftaran Mitra R. Hendra Wijaya, S.E., BKP (ND-TAX-LAW-0042) telah disetujui dan divalidasi oleh Admin.',
    type: 'verification',
    timestamp: '2026-11-06T09:30:00Z',
    isRead: false,
    targetAudience: 'mitra',
    mitraId: 'mitra-01',
  },
  {
    id: 'notif-mtr-mitra-01-payout',
    title: 'Pencairan Komisi Diproses',
    message: 'Komisi transaksi PT Global Indo Logistik untuk Mitra R. Hendra Wijaya, S.E., BKP sebesar Rp 23.000.000 telah ditransfer ke rekening Bank Mandiri.',
    type: 'commission',
    timestamp: '2026-10-26T11:00:00Z',
    isRead: true,
    targetAudience: 'mitra',
    mitraId: 'mitra-01',
  },
  {
    id: 'notif-sys-init-01',
    title: 'Pengaturan Sistem Diperbarui',
    message: 'Konfigurasi sistem portal, skema komisi per klien, dan server email SMTP telah diperbarui oleh Admin.',
    type: 'system_update',
    timestamp: '2026-11-04T14:15:00Z',
    isRead: true,
    targetAudience: 'admin_only',
  },
];

// Monthly Performance Baseline (Dev Mode Fallback Only)
const monthlySalesHistory = [
  { month: 'Jun 2026', totalSales: 310000000, totalCommission: 46500000, mitraCount: 18, dealsClosed: 14 },
  { month: 'Jul 2026', totalSales: 420000000, totalCommission: 63000000, mitraCount: 24, dealsClosed: 19 },
  { month: 'Agu 2026', totalSales: 540000000, totalCommission: 81000000, mitraCount: 29, dealsClosed: 25 },
  { month: 'Sep 2026', totalSales: 610000000, totalCommission: 91500000, mitraCount: 35, dealsClosed: 28 },
  { month: 'Okt 2026', totalSales: 785000000, totalCommission: 117750000, mitraCount: 42, dealsClosed: 36 },
  { month: 'Nov 2026 (M-T-D)', totalSales: 430000000, totalCommission: 64500000, mitraCount: 48, dealsClosed: 21 },
];

// Compute 100% Real-Time 6-Month Sales History from Supabase Records (client_deals, commissions, mitras)
export const computeDynamicSalesHistory = () => {
  if (!isProductionMode() && !supabase) {
    return monthlySalesHistory;
  }

  const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const now = new Date();
  const buckets: {
    key: string;
    month: string;
    totalSales: number;
    totalCommission: number;
    mitraCount: number;
    dealsClosed: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${yyyy}-${mm}`;
    const label = `${monthNamesId[d.getMonth()]} ${yyyy}`;
    buckets.push({
      key,
      month: label,
      totalSales: 0,
      totalCommission: 0,
      mitraCount: 0,
      dealsClosed: 0,
    });
  }

  const approvedDeals = clientDeals.filter(
    (d) => d.status === 'active_subscription' || d.status === 'deal_closed'
  );

  for (const deal of approvedDeals) {
    const rawDate = (deal.subscriptionStartDate || deal.date || '').slice(0, 7);
    const targetBucket = buckets.find((b) => b.key === rawDate) || buckets[buckets.length - 1];
    if (targetBucket) {
      targetBucket.totalSales += Number(deal.dealValue) || 0;
      targetBucket.totalCommission += Number(deal.commissionAmount) || 0;
      targetBucket.dealsClosed += 1;
    }
  }

  // If commissions table has additional records not already reflected or if deals were recorded directly
  if (approvedDeals.length === 0 && commissions.length > 0) {
    for (const trx of commissions) {
      const rawDate = (trx.date || '').slice(0, 7);
      const targetBucket = buckets.find((b) => b.key === rawDate) || buckets[buckets.length - 1];
      if (targetBucket) {
        targetBucket.totalSales += Number(trx.dealValue) || 0;
        targetBucket.totalCommission += (Number(trx.commissionAmount) || 0) + (Number(trx.bonusAmount) || 0);
        targetBucket.dealsClosed += 1;
      }
    }
  }

  // Calculate cumulative registered/verified mitras up to each month
  for (const b of buckets) {
    const countUpToMonth = mitras.filter((m) => {
      const jm = (m.joinedDate || '').slice(0, 7);
      return !jm || jm <= b.key;
    }).length;
    b.mitraCount = countUpToMonth;
  }

  return buckets.map(({ key: _k, ...rest }) => rest);
};

// ========================================================
// 0. DYNAMIC ROLE REGISTRY & STRONG PASSWORD ENCRYPTION
// ========================================================
export interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  portalView: 'admin' | 'mitra';
  defaultTab: string;
  allowedTabs: string[];
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

// Role yang aktif adalah 'admin', 'staff' (di bawah admin), dan 'mitra'
let systemRoles: RoleDefinition[] = [
  {
    code: 'admin',
    name: 'Administrator Operasional',
    description: 'Akses penuh manajemen operasional, manajemen staf, validasi klien & mitra, pencairan komisi, log audit, dan pengaturan sistem.',
    portalView: 'admin',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'staff-management', 'ai-reports', 'idcard'],
    permissions: ['all', 'manage_mitra', 'manage_clients', 'approve_payouts', 'manage_services', 'view_logs', 'manage_settings', 'manage_roles', 'manage_staff'],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'staff',
    name: 'Staf Operasional',
    description: 'Role Staf di bawah Admin: akses operasional sesuai menu yang diaktifkan Admin (kecuali Log Aktivitas/Email dan pengaturan sensitif Mode Sistem, Supabase, SMTP, Google OAuth, & Gemini AI).',
    portalView: 'admin',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'admin-operations', 'verification', 'marketing-tools', 'commissions', 'ai-reports', 'idcard'],
    permissions: ['manage_mitra', 'manage_clients', 'approve_payouts', 'manage_services', 'manage_general_settings'],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'mitra',
    name: 'Mitra Konsultan & Referral',
    description: 'Akses portal kemitraan eksklusif: kartu identitas mitra, input klien referral, pelacakan komisi, penarikan dana, dan materi promosi.',
    portalView: 'mitra',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'idcard', 'marketing-tools', 'commissions'],
    permissions: ['view_idcard', 'input_client', 'view_commissions', 'request_payout', 'download_tools'],
    isSystem: true,
    isActive: true,
  },
];

export const getRoleDefinition = (roleCode?: string): RoleDefinition => {
  const normalized = (roleCode || 'mitra').trim().toLowerCase();
  const found = systemRoles.find((r) => r.code.toLowerCase() === normalized && r.isActive);
  if (found) return found;
  if (normalized === 'admin') return systemRoles[0];
  if (normalized === 'staff') return systemRoles[1];
  return systemRoles[2] || systemRoles[1];
};

// Enkripsi Password Kuat: scrypt (N=16384, r=8, p=1, 64-byte key) + 128-bit Random Salt + AES-256-GCM Envelope
const PASSWORD_ENC_PREFIX = 'ndenc$v2$';
const PASSWORD_SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.PASSWORD_SECRET_KEY || 'NDTAXANDLAW-ENTERPRISE-AES256-SCRYPT-KEY-2026')
  .digest();

export const isEncryptedPassword = (val?: string): boolean => {
  return Boolean(val && val.startsWith(PASSWORD_ENC_PREFIX));
};

export const encryptUserPassword = (plainPassword: string, roleCode: string = 'mitra'): string => {
  const cleanRole = (roleCode || 'mitra').trim().toLowerCase();
  // If already encrypted, optionally update role prefix if needed
  if (isEncryptedPassword(plainPassword)) {
    const parts = plainPassword.split('$');
    if (parts.length >= 8) {
      parts[2] = cleanRole;
      return parts.join('$');
    }
    return plainPassword;
  }

  const salt = crypto.randomBytes(16);
  const scryptHash = crypto.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 });

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', PASSWORD_SECRET_KEY, iv);
  const encryptedBuf = Buffer.concat([
    cipher.update(scryptHash),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    'ndenc',
    'v2',
    cleanRole,
    salt.toString('hex'),
    scryptHash.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encryptedBuf.toString('hex'),
  ].join('$');
};

export const extractUserRole = (storedValue?: string, fallbackRole: string = 'mitra'): string => {
  if (!storedValue) return fallbackRole;
  if (isEncryptedPassword(storedValue)) {
    const parts = storedValue.split('$');
    if (parts.length >= 3 && parts[2]) {
      return parts[2].toLowerCase();
    }
  }
  return fallbackRole;
};

export const verifyUserPassword = (
  inputPassword: string,
  storedValue?: string,
  defaultRole: string = 'mitra'
): { valid: boolean; role: string; needsUpgrade: boolean } => {
  if (!storedValue || !inputPassword) {
    return { valid: false, role: defaultRole, needsUpgrade: false };
  }

  if (isEncryptedPassword(storedValue)) {
    try {
      const parts = storedValue.split('$');
      // Format: ndenc$v2$<role>$<saltHex>$<scryptHashHex>$<ivHex>$<authTagHex>$<cipherHex>
      const role = parts[2] || defaultRole;
      const salt = Buffer.from(parts[3], 'hex');
      const expectedHash = Buffer.from(parts[4], 'hex');
      const computedHash = crypto.scryptSync(inputPassword, salt, 64, { N: 16384, r: 8, p: 1 });

      // Also verify AES-256-GCM integrity if present
      if (parts.length >= 8) {
        const iv = Buffer.from(parts[5], 'hex');
        const authTag = Buffer.from(parts[6], 'hex');
        const encryptedBuf = Buffer.from(parts[7], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', PASSWORD_SECRET_KEY, iv);
        decipher.setAuthTag(authTag);
        const decryptedHash = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
        if (
          decryptedHash.length === computedHash.length &&
          crypto.timingSafeEqual(decryptedHash, computedHash)
        ) {
          return { valid: true, role, needsUpgrade: false };
        }
        return { valid: false, role, needsUpgrade: false };
      }

      if (expectedHash.length === computedHash.length && crypto.timingSafeEqual(expectedHash, computedHash)) {
        return { valid: true, role, needsUpgrade: false };
      }
      return { valid: false, role, needsUpgrade: false };
    } catch {
      return { valid: false, role: defaultRole, needsUpgrade: false };
    }
  }

  // Legacy plaintext fallback -> verify and mark for immediate encryption upgrade
  const isMatch = inputPassword === storedValue;
  return { valid: isMatch, role: defaultRole, needsUpgrade: isMatch };
};

let adminAccount = {
  id: 'admin-01',
  name: 'Admin Operasional NDTAXANDLAW',
  email: 'admin@ndtaxandlaw.com',
  phone: '0812-8899-7711',
  position: 'Super Administrator Operasional',
  password: 'adminND2026!',
  role: 'admin' as const,
  gender: 'male' as 'male' | 'female',
  avatarUrl: MALE_AVATAR_URL,
};

let staffAccounts: StaffMember[] = [
  {
    id: 'staff-01',
    name: 'Rina Kusuma, S.E.',
    email: 'staf@ndtaxandlaw.com',
    phone: '0812-7788-9900',
    position: 'Staf Operasional & Verifikasi Pajak',
    gender: 'female',
    avatarUrl: FEMALE_AVATAR_URL,
    isActive: true,
    allowedMenus: [...DEFAULT_STAFF_ALLOWED_MENUS],
    createdAt: '2026-01-15',
  },
];

const userPasswords = new Map<string, string>([
  ['admin@ndtaxandlaw.com', encryptUserPassword('adminND2026!', 'admin')],
  ['admin@ndtaxlaw.com', encryptUserPassword('adminND2026!', 'admin')],
  ['staf@ndtaxandlaw.com', encryptUserPassword('stafND2026!', 'staff')],
  ['staf@ndtaxlaw.com', encryptUserPassword('stafND2026!', 'staff')],
  ['bambang.sudirman@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
  ['dewi.lestari@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
  ['rian.pratama@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
]);

// Seeded Real-Time Chat Rooms & Messages (1-on-1 & Group between Mitra & Staf)
let chatRooms: ChatRoom[] = [
  {
    id: 'room-direct-mitra-01__staff-01',
    type: 'direct',
    name: 'Bambang Sudirman, S.H., M.Kn. & Rina Kusuma, S.E.',
    participantIds: ['mitra-01', 'staff-01'],
    createdBy: 'mitra-01',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 1000 * 15).toISOString(),
    lastMessageText: 'Baik Pak Bambang, dokumen SPT Masa PT Nusantara sudah kami verifikasi.',
    lastMessageAt: new Date(Date.now() - 60 * 1000 * 15).toISOString(),
    lastMessageSenderName: 'Rina Kusuma, S.E.',
  },
  {
    id: 'room-group-koordinasi-pajak',
    type: 'group',
    name: 'Grup Koordinasi Mitra & Staf Pajak',
    description: 'Ruang diskusi cepat koordinasi klien kepatuhan pajak & legalitas korporasi',
    participantIds: ['staff-01', 'mitra-01', 'mitra-02'],
    createdBy: 'staff-01',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 1000 * 8).toISOString(),
    lastMessageText: 'Silakan gunakan grup ini untuk koordinasi dokumen klien secara real-time.',
    lastMessageAt: new Date(Date.now() - 60 * 1000 * 8).toISOString(),
    lastMessageSenderName: 'Rina Kusuma, S.E.',
  },
];

let chatMessages: ChatMessage[] = [
  {
    id: 'msg-seed-01',
    roomId: 'room-direct-mitra-01__staff-01',
    senderId: 'mitra-01',
    senderName: 'Bambang Sudirman, S.H., M.Kn.',
    senderRole: 'mitra',
    senderAvatar: MALE_AVATAR_URL,
    text: 'Selamat pagi Bu Rina, mohon bantuannya untuk cek kelengkapan berkas klien PT Nusantara Energi Makmur.',
    createdAt: new Date(Date.now() - 60 * 1000 * 25).toISOString(),
  },
  {
    id: 'msg-seed-02',
    roomId: 'room-direct-mitra-01__staff-01',
    senderId: 'staff-01',
    senderName: 'Rina Kusuma, S.E.',
    senderRole: 'staff',
    senderAvatar: FEMALE_AVATAR_URL,
    text: 'Baik Pak Bambang, dokumen SPT Masa PT Nusantara sudah kami verifikasi.',
    replyTo: {
      messageId: 'msg-seed-01',
      senderId: 'mitra-01',
      senderName: 'Bambang Sudirman, S.H., M.Kn.',
      text: 'Selamat pagi Bu Rina, mohon bantuannya untuk cek kelengkapan berkas klien PT Nusantara Energi Makmur.',
    },
    createdAt: new Date(Date.now() - 60 * 1000 * 15).toISOString(),
  },
  {
    id: 'msg-seed-03',
    roomId: 'room-group-koordinasi-pajak',
    senderId: 'staff-01',
    senderName: 'Rina Kusuma, S.E.',
    senderRole: 'staff',
    senderAvatar: FEMALE_AVATAR_URL,
    text: 'Selamat datang di Grup Koordinasi Mitra & Staf Pajak NDTAXANDLAW. Silakan gunakan grup ini untuk koordinasi dokumen klien secara real-time.',
    createdAt: new Date(Date.now() - 60 * 1000 * 8).toISOString(),
  },
];

// Store password reset OTP tokens in memory with attempt counter against brute-force
const passwordResetTokens = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

export const isProductionMode = (): boolean => {
  return (
    appSettings.appEnvironment === 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  );
};

// Format memberCode to official ND-TAX-LAW-<noregistrasi> format
export const formatMitraMemberCode = (rawCode?: string, fallbackId?: string): string => {
  const trimmed = String(rawCode || '').trim().toUpperCase();
  if (trimmed.startsWith('ND-TAX-LAW-')) {
    const suffix = trimmed.slice('ND-TAX-LAW-'.length).trim();
    if (suffix) return `ND-TAX-LAW-${suffix}`;
  }
  const parts = trimmed.split('-').filter(Boolean);
  const lastSegment = parts.length > 0 ? parts[parts.length - 1] : '';
  if (lastSegment && /\d/.test(lastSegment)) {
    return `ND-TAX-LAW-${lastSegment}`;
  }
  const idDigits = String(fallbackId || '').replace(/\D/g, '').slice(-4);
  return `ND-TAX-LAW-${idDigits || '0001'}`;
};

// Normalize mitra avatars and memberCode (ND-TAX-LAW-noregistrasi)
const normalizeMitraAvatars = (list: Mitra[]): Mitra[] => {
  return list.map((m) => {
    const bankMeta = (m.bankDetails || {}) as any;
    const avatarInferredGender: 'male' | 'female' | undefined =
      m.avatarUrl === FEMALE_AVATAR_URL
        ? 'female'
        : m.avatarUrl === MALE_AVATAR_URL
        ? 'male'
        : undefined;
    const gender: 'male' | 'female' =
      m.gender === 'female' || m.gender === 'male'
        ? m.gender
        : bankMeta.__gender === 'female' || bankMeta.__gender === 'male'
        ? bankMeta.__gender
        : avatarInferredGender || inferGenderFromName(m.fullName);
    const emailVerified: boolean =
      typeof m.emailVerified === 'boolean'
        ? m.emailVerified
        : typeof bankMeta.__emailVerified === 'boolean'
        ? bankMeta.__emailVerified
        : true;
    const verificationToken: string | undefined =
      m.verificationToken || bankMeta.__verificationToken || undefined;
    const verificationTokenExpiry: string | undefined =
      m.verificationTokenExpiry || bankMeta.__verificationTokenExpiry || undefined;
    return {
      ...m,
      memberCode: formatMitraMemberCode(m.memberCode, m.id),
      gender,
      avatarUrl: resolveAvatarUrl(m.avatarUrl, gender, m.fullName),
      emailVerified,
      verificationToken,
      verificationTokenExpiry,
      rejectionReason: m.rejectionReason || bankMeta.__rejectionReason || undefined,
      rejectedAt: m.rejectedAt || bankMeta.__rejectedAt || undefined,
      customFields: m.customFields || bankMeta.__customFields || undefined,
    };
  });
};

// Helper to compute next billing date from a base date (YYYY-MM-DD), billingDay (1..31), and pricingType
const computeNextBillingDate = (
  baseDateStr: string,
  billingDay: number,
  pricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription'
): string => {
  const parts = (baseDateStr || new Date().toISOString().split('T')[0]).split('-').map(Number);
  let year = parts[0] || new Date().getFullYear();
  let month = (parts[1] || new Date().getMonth() + 1) - 1; // 0-indexed
  const day = Math.min(28, Math.max(1, billingDay || parts[2] || 1));

  if (pricingType === 'annual_subscription') {
    year += 1;
  } else {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

const ND_META_REGEX = /\s*<!--ND_META:(.*?)-->\s*$/s;

// Serialize ClientDeal into exact columns supported by public.client_deals in Supabase
export const toSupabaseClientDeal = (deal: ClientDeal) => {
  const cleanNotes = (deal.notes || '').replace(ND_META_REGEX, '').trim();
  const metaObj = {
    subscriptionStartDate: deal.subscriptionStartDate,
    billingDayOfMonth: deal.billingDayOfMonth,
    nextBillingDate: deal.nextBillingDate,
    lastBilledDate: deal.lastBilledDate,
    isBillingDue: deal.isBillingDue,
    terminatedAt: deal.terminatedAt,
    terminationReason: deal.terminationReason,
    rejectedAt: deal.rejectedAt,
    rejectionReason: deal.rejectionReason,
    customFields: deal.customFields,
    appliedCommissionRate: deal.appliedCommissionRate,
    lockedRecurringRate: deal.lockedRecurringRate,
    recurringCommissionAmount: deal.recurringCommissionAmount,
  };
  const encodedNotes = `${cleanNotes}${cleanNotes ? ' ' : ''}<!--ND_META:${JSON.stringify(metaObj)}-->`;

  return {
    id: deal.id,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    referralCode: deal.referralCode,
    companyName: deal.companyName,
    picName: deal.picName,
    picPhone: deal.picPhone,
    picEmail: deal.picEmail,
    serviceId: deal.serviceId,
    serviceName: deal.serviceName,
    pricingType: deal.pricingType,
    dealValue: deal.dealValue,
    commissionAmount: deal.commissionAmount,
    status: deal.status,
    date: deal.date,
    recurringPaidMonths: deal.recurringPaidMonths ?? null,
    recurringPaidYears: deal.recurringPaidYears ?? null,
    periodStart: deal.periodStart ?? null,
    periodEnd: deal.periodEnd ?? null,
    durationMonths: deal.durationMonths ?? null,
    paymentTermType: deal.paymentTermType ?? 'one_time',
    notes: encodedNotes,
    submittedBy: deal.submittedBy ?? 'mitra',
  };
};

// Deserialize Supabase client_deals row back into full ClientDeal object
export const fromSupabaseClientDeal = (row: any): ClientDeal => {
  const rawNotes = typeof row.notes === 'string' ? row.notes : '';
  const match = rawNotes.match(ND_META_REGEX);
  let meta: Partial<ClientDeal> = {};
  if (match && match[1]) {
    try {
      meta = JSON.parse(match[1]);
    } catch {}
  }
  const cleanNotes = rawNotes.replace(ND_META_REGEX, '').trim();

  const pType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription' =
    row.pricingType || 'case_by_case';
  const dVal = Number(row.dealValue) || 0;
  const fallbackCalc = calculateClientDealCommission(pType, dVal, appSettings?.commissionScheme);

  const appliedRate =
    row.appliedCommissionRate ??
    meta.appliedCommissionRate ??
    (dVal > 0 && row.commissionAmount > 0
      ? Math.round((Number(row.commissionAmount) / dVal) * 100)
      : fallbackCalc.initialRate);

  const lockedRecRate =
    row.lockedRecurringRate ??
    meta.lockedRecurringRate ??
    (pType === 'case_by_case' ? 0 : fallbackCalc.recurringRate);

  const recCommAmt =
    row.recurringCommissionAmount ??
    meta.recurringCommissionAmount ??
    (pType === 'case_by_case' ? 0 : Math.round((dVal * lockedRecRate) / 100));

  return {
    ...row,
    notes: cleanNotes,
    appliedCommissionRate: appliedRate,
    lockedRecurringRate: lockedRecRate,
    recurringCommissionAmount: recCommAmt,
    subscriptionStartDate: row.subscriptionStartDate || meta.subscriptionStartDate,
    billingDayOfMonth: row.billingDayOfMonth || meta.billingDayOfMonth,
    nextBillingDate: row.nextBillingDate || meta.nextBillingDate,
    lastBilledDate: row.lastBilledDate || meta.lastBilledDate,
    isBillingDue: row.isBillingDue !== undefined ? row.isBillingDue : meta.isBillingDue,
    terminatedAt: row.terminatedAt || meta.terminatedAt,
    terminationReason: row.terminationReason || meta.terminationReason,
    rejectedAt: row.rejectedAt || meta.rejectedAt,
    rejectionReason: row.rejectionReason || meta.rejectionReason,
    customFields: row.customFields || meta.customFields,
  };
};

const normalizeClientDeals = (list: ClientDeal[]): ClientDeal[] => {
  const todayStr = new Date().toISOString().split('T')[0];
  return list.map((rawDeal) => {
    const d = fromSupabaseClientDeal(rawDeal);
    if (d.pricingType === 'monthly_subscription' || d.pricingType === 'annual_subscription') {
      const startDate = d.subscriptionStartDate || d.date || todayStr;
      const dayFromDate = Number(startDate.split('-')[2]) || 1;
      const billingDay = d.billingDayOfMonth || dayFromDate;
      let nextBill = d.nextBillingDate;
      let dueFlag = d.isBillingDue;
      if (!nextBill) {
        if (d.id === 'deal-01') {
          nextBill = '2026-11-10';
          dueFlag = true;
        } else if (d.id === 'deal-03') {
          nextBill = '2026-11-01';
          dueFlag = true;
        } else {
          nextBill = computeNextBillingDate(d.lastBilledDate || startDate, billingDay, d.pricingType);
          dueFlag = todayStr >= nextBill;
        }
      } else if (dueFlag === undefined) {
        dueFlag = todayStr >= nextBill;
      }
      return {
        ...d,
        subscriptionStartDate: startDate,
        billingDayOfMonth: billingDay,
        nextBillingDate: nextBill,
        isBillingDue: dueFlag,
      };
    }
    return d;
  });
};

// ========================================================
// STORAGE ENGINE:
// - PRODUCTION MODE: STRICTLY SUPABASE ONLY (No local database.json file created or stored on disk)
// - DEVELOPMENT MODE: Local data/database.json used for local development (git-ignored)
// ========================================================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export const cleanupLocalDatabaseFileInProduction = () => {
  if (!isProductionMode() || !supabase) return;
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      console.log('[Production Mode] File database lokal (data/database.json) dihapus otomatis agar tidak memenuhi penyimpanan server (100% menggunakan Supabase).');
    }
    if (fs.existsSync(DATA_DIR)) {
      const remaining = fs.readdirSync(DATA_DIR);
      if (remaining.length === 0) {
        fs.rmdirSync(DATA_DIR);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
};

export const saveDatabase = () => {
  try {
    // PENTING: Saat Mode Production & Supabase aktif, JANGAN simpan file database lokal ke disk server!
    // Seluruh data disimpan 100% di Cloud Supabase agar penyimpanan server tidak penuh dan lebih aman.
    if (isProductionMode() && supabase) {
      cleanupLocalDatabaseFileInProduction();
      return;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const passwordsObj: Record<string, string> = {};
    for (const [k, v] of userPasswords.entries()) {
      const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === k.toLowerCase());
      const role =
        k.toLowerCase() === adminAccount.email.toLowerCase()
          ? 'admin'
          : isStaffEmail
            ? 'staff'
            : extractUserRole(v, 'mitra');
      passwordsObj[k.toLowerCase()] = encryptUserPassword(v, role);
    }
    // Hanya dijalankan pada Development Mode (atau saat Supabase belum dikonfigurasi)
    const { password: _adminPass, ...safeAdminProfile } = adminAccount;
    const payload = {
      mitras,
      services,
      clientDeals,
      payoutRequests,
      marketingTools,
      commissions,
      notifications,
      emailLogs,
      activityLogs,
      appSettings,
      roles: systemRoles,
      adminProfile: safeAdminProfile,
      staffAccounts,
      chatRooms,
      chatMessages,
      userPasswords: passwordsObj,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage Error] Gagal menyimpan konfigurasi ke disk:', err);
  }
};

export const loadDatabase = () => {
  try {
    // Jika Mode Production & Supabase aktif, jangan buat atau baca file database lokal dari disk
    if (isProductionMode() && supabase) {
      mitras = [];
      services = [];
      clientDeals = [];
      payoutRequests = [];
      marketingTools = [];
      commissions = [];
      notifications = [];
      activityLogs = [];
      emailLogs = [];
      cleanupLocalDatabaseFileInProduction();
      console.log('[Production Mode] Database lokal dinonaktifkan sepenuhnya. Menggunakan Cloud Supabase 100%.');
      return;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);

      if (data.appSettings) {
        appSettings = { ...appSettings, ...data.appSettings };
        if (appSettings.smtpPassword === '••••••••••••••••') {
          appSettings.smtpPassword = process.env.SMTP_PASS || '';
        }
        if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
          appSettings.appEnvironment = 'production';
        }
      }

      if (Array.isArray(data.roles) && data.roles.length > 0) {
        systemRoles = data.roles;
      }

      if (data.adminProfile && typeof data.adminProfile === 'object') {
        adminAccount = {
          ...adminAccount,
          ...data.adminProfile,
          role: 'admin',
        };
      }

      if (Array.isArray(data.staffAccounts)) {
        staffAccounts = data.staffAccounts.map((s: StaffMember) => ({
          ...s,
          allowedMenus:
            Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0
              ? s.allowedMenus
              : [...DEFAULT_STAFF_ALLOWED_MENUS],
        }));
      }

      if (Array.isArray(data.emailLogs)) {
        emailLogs = data.emailLogs.filter((l: EmailLogItem) => !['email-001', 'email-002', 'email-003'].includes(l.id));
      }
      if (Array.isArray(data.activityLogs)) {
        activityLogs = data.activityLogs;
      }
      if (Array.isArray(data.chatRooms)) {
        chatRooms = data.chatRooms;
      }
      if (Array.isArray(data.chatMessages)) {
        chatMessages = data.chatMessages;
      }

      if (data.userPasswords && typeof data.userPasswords === 'object') {
        for (const [em, pass] of Object.entries(data.userPasswords)) {
          const emailKey = em.toLowerCase();
          const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === emailKey);
          const role =
            emailKey === adminAccount.email.toLowerCase()
              ? 'admin'
              : isStaffEmail
                ? 'staff'
                : extractUserRole(pass as string, 'mitra');
          userPasswords.set(emailKey, encryptUserPassword(pass as string, role));
        }
      }

      if (isProductionMode()) {
        mitras = [];
        services = [];
        clientDeals = [];
        payoutRequests = [];
        marketingTools = [];
        commissions = [];
        notifications = [];
        cleanupLocalDatabaseFileInProduction();
        console.log('[Production Mode] Hanya terhubung ke Database Supabase (penyimpanan lokal dinonaktifkan).');
      } else {
        if (Array.isArray(data.mitras)) mitras = normalizeMitraAvatars(data.mitras);
        if (Array.isArray(data.services)) {
          services = normalizeServicesCatalog(data.services).list;
        }
        if (Array.isArray(data.clientDeals)) clientDeals = normalizeClientDeals(data.clientDeals);
        if (Array.isArray(data.payoutRequests)) payoutRequests = data.payoutRequests;
        if (Array.isArray(data.marketingTools)) marketingTools = data.marketingTools;
        if (Array.isArray(data.commissions)) commissions = data.commissions;
        if (Array.isArray(data.notifications)) notifications = data.notifications;
        console.log(`[Development Mode] Database lokal dimuat dari ${DB_FILE}`);
      }
    } else if (isProductionMode()) {
      mitras = [];
      services = [];
      clientDeals = [];
      payoutRequests = [];
      marketingTools = [];
      commissions = [];
      notifications = [];
      activityLogs = [];
      emailLogs = [];
      cleanupLocalDatabaseFileInProduction();
    }
  } catch (err) {
    console.error('[Storage Error] Gagal memuat konfigurasi disk:', err);
  }
};

// Sinkronisasi langsung (Single Source of Truth) dari Cloud Database Supabase
export const syncFromSupabase = async () => {
  if (!supabase) return;
  try {
    // 1. Mitras: Replace directly with Supabase rows (so deleted rows in Supabase are immediately gone!)
    const { data: dbMitras, error: errM } = await supabase.from('mitras').select('*');
    if (!errM && Array.isArray(dbMitras)) {
      mitras = normalizeMitraAvatars(dbMitras);
      console.log(`[Supabase Cloud] Sinkronisasi ${mitras.length} mitra dari Supabase`);
    }

    // 2. Services
    const { data: dbServices, error: errS } = await supabase.from('services').select('*');
    if (!errS && Array.isArray(dbServices)) {
      const normSrv = normalizeServicesCatalog(dbServices);
      services = normSrv.list;
      if (normSrv.migrated) {
        try {
          await supabase.from('services').delete().in('id', Array.from(LEGACY_SEEDED_SERVICE_IDS));
          await supabase.from('services').upsert(services);
        } catch (e) {
          console.warn('[Supabase Services Catalog Sync Warning]', e);
        }
      }
      console.log(`[Supabase Cloud] Sinkronisasi ${services.length} layanan dari Supabase`);
    }

    // 3. Client Deals
    const { data: dbDeals, error: errD } = await supabase.from('client_deals').select('*');
    if (!errD && Array.isArray(dbDeals)) {
      clientDeals = normalizeClientDeals(dbDeals);
      console.log(`[Supabase Cloud] Sinkronisasi ${clientDeals.length} deal klien dari Supabase`);
    }

    // 4. Commissions
    const { data: dbCommissions, error: errC } = await supabase.from('commissions').select('*');
    if (!errC && Array.isArray(dbCommissions)) {
      commissions = dbCommissions;
      console.log(`[Supabase Cloud] Sinkronisasi ${commissions.length} komisi dari Supabase`);
    }

    // 5. Payout Requests
    const { data: dbPayouts, error: errPay } = await supabase.from('payout_requests').select('*');
    if (!errPay && Array.isArray(dbPayouts)) {
      payoutRequests = dbPayouts;
      console.log(`[Supabase Cloud] Sinkronisasi ${payoutRequests.length} pengajuan pencairan dari Supabase`);
    }

    // 6. Marketing Tools (Read from public.marketing_tools and merge with KV backup so nothing is ever lost)
    const { data: dbTools, error: errT } = await supabase.from('marketing_tools').select('*');
    if (!errT && Array.isArray(dbTools) && dbTools.length > 0) {
      marketingTools = dbTools;
      console.log(`[Supabase Cloud] Sinkronisasi ${marketingTools.length} tools marketing dari Supabase`);
    }

    // 7. Notifications
    const { data: dbNotifs, error: errN } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
    if (!errN && Array.isArray(dbNotifs)) {
      notifications = dbNotifs;
      console.log(`[Supabase Cloud] Sinkronisasi ${notifications.length} notifikasi dari Supabase`);
    }

    // 8. User Passwords & Encrypted Credentials + System KV (Settings, Roles, Activity Logs, Email Logs)
    const { data: dbPasswords, error: errP } = await supabase.from('user_passwords').select('*');
    if (!errP && Array.isArray(dbPasswords)) {
      const toUpgradeInSupabase: { email: string; password: string }[] = [];
      let hasSysConfig = false;
      let hasSysRoles = false;
      let hasSysAdminProfile = false;
      let hasSysStaffAccounts = false;
      let hasSysActivityLogs = false;
      let hasSysEmailLogs = false;

      for (const row of dbPasswords) {
        if (!row.email || !row.password) continue;
        const emailLower = row.email.toLowerCase();
        if (emailLower === '__sys_config__@ndtaxlaw.internal') {
          hasSysConfig = true;
          try {
            const parsedSettings = JSON.parse(row.password);
            if (parsedSettings && typeof parsedSettings === 'object') {
              if (parsedSettings.smtpPassword === '••••••••••••••••') {
                delete parsedSettings.smtpPassword;
              }
              appSettings = { ...appSettings, ...parsedSettings };
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_roles__@ndtaxlaw.internal') {
          hasSysRoles = true;
          try {
            const parsedRoles = JSON.parse(row.password);
            if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
              systemRoles = parsedRoles;
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_admin_profile__@ndtaxlaw.internal') {
          hasSysAdminProfile = true;
          try {
            const parsedAdmin = JSON.parse(row.password);
            if (parsedAdmin && typeof parsedAdmin === 'object') {
              adminAccount = {
                ...adminAccount,
                ...parsedAdmin,
                role: 'admin',
              };
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_staff_accounts__@ndtaxlaw.internal') {
          hasSysStaffAccounts = true;
          try {
            const parsedStaff = JSON.parse(row.password);
            if (Array.isArray(parsedStaff)) {
              staffAccounts = parsedStaff.map((s: StaffMember) => ({
                ...s,
                allowedMenus:
                  Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0
                    ? s.allowedMenus
                    : [...DEFAULT_STAFF_ALLOWED_MENUS],
              }));
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_activity_logs__@ndtaxlaw.internal') {
          hasSysActivityLogs = true;
          try {
            const parsedActivity = JSON.parse(row.password);
            if (Array.isArray(parsedActivity)) {
              activityLogs = parsedActivity;
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_email_logs__@ndtaxlaw.internal') {
          hasSysEmailLogs = true;
          try {
            const parsedEmails = JSON.parse(row.password);
            if (Array.isArray(parsedEmails)) {
              emailLogs = parsedEmails;
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_chat_rooms__@ndtaxlaw.internal') {
          try {
            const parsedRooms = JSON.parse(row.password);
            if (Array.isArray(parsedRooms)) {
              chatRooms = parsedRooms;
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_chat_messages__@ndtaxlaw.internal') {
          try {
            const parsedMsgs = JSON.parse(row.password);
            if (Array.isArray(parsedMsgs)) {
              chatMessages = parsedMsgs;
            }
          } catch {}
          continue;
        }
        if (emailLower === '__sys_marketing_tools__@ndtaxlaw.internal') {
          try {
            const parsedTools = JSON.parse(row.password);
            if (Array.isArray(parsedTools) && parsedTools.length > 0) {
              const mergedToolsMap = new Map<string, MarketingTool>();
              for (const t of [...marketingTools, ...parsedTools]) {
                if (t && t.id && !mergedToolsMap.has(t.id)) {
                  mergedToolsMap.set(t.id, t);
                }
              }
              marketingTools = Array.from(mergedToolsMap.values());
            }
          } catch {}
          continue;
        }
        if (emailLower.startsWith('__sys_file_') && emailLower.endsWith('__@ndtaxlaw.internal')) {
          try {
            const parsedFile = JSON.parse(row.password);
            if (parsedFile && parsedFile.fileName && parsedFile.base64) {
              const safeName = path.basename(parsedFile.fileName);
              const buf = Buffer.from(parsedFile.base64, 'base64');
              const pubDir = path.join(__dirname, 'public', 'uploads', 'marketing-tools');
              const homeDir = path.join(os.homedir(), '.ndtaxandlaw_storage', 'uploads', 'marketing-tools');
              if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
              if (!fs.existsSync(homeDir)) fs.mkdirSync(homeDir, { recursive: true });
              const pubTarget = path.join(pubDir, safeName);
              const homeTarget = path.join(homeDir, safeName);
              if (!fs.existsSync(pubTarget)) fs.writeFileSync(pubTarget, buf);
              if (!fs.existsSync(homeTarget)) fs.writeFileSync(homeTarget, buf);
            }
          } catch {}
          continue;
        }
        if (emailLower.startsWith('__sys_') && emailLower.endsWith('@ndtaxlaw.internal')) {
          continue;
        }

        const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === emailLower);
        const defaultRole =
          row.role ||
          (emailLower === adminAccount.email.toLowerCase()
            ? 'admin'
            : isStaffEmail
              ? 'staff'
              : 'mitra');
        if (!isEncryptedPassword(row.password)) {
          const encrypted = encryptUserPassword(row.password, defaultRole);
          userPasswords.set(emailLower, encrypted);
          toUpgradeInSupabase.push({ email: emailLower, password: encrypted });
        } else {
          userPasswords.set(emailLower, row.password);
        }
      }

      // Seed System Config, Roles, Admin Profile, Staff Accounts, Activity Logs, and Email Logs into Supabase if not yet present
      if (!hasSysConfig) {
        toUpgradeInSupabase.push({ email: '__sys_config__@ndtaxlaw.internal', password: JSON.stringify(appSettings) });
      }
      if (!hasSysRoles) {
        toUpgradeInSupabase.push({ email: '__sys_roles__@ndtaxlaw.internal', password: JSON.stringify(systemRoles) });
      }
      if (!hasSysAdminProfile) {
        const { password: _ap, ...safeAdmin } = adminAccount;
        toUpgradeInSupabase.push({ email: '__sys_admin_profile__@ndtaxlaw.internal', password: JSON.stringify(safeAdmin) });
      }
      if (!hasSysStaffAccounts) {
        toUpgradeInSupabase.push({ email: '__sys_staff_accounts__@ndtaxlaw.internal', password: JSON.stringify(staffAccounts) });
      }
      if (!hasSysActivityLogs) {
        toUpgradeInSupabase.push({ email: '__sys_activity_logs__@ndtaxlaw.internal', password: JSON.stringify(activityLogs.slice(0, 250)) });
      }
      if (!hasSysEmailLogs) {
        const compactEmails = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
        toUpgradeInSupabase.push({ email: '__sys_email_logs__@ndtaxlaw.internal', password: JSON.stringify(compactEmails) });
      }

      // Ensure every existing Mitra in Supabase has an encrypted password record in Supabase user_passwords
      for (const m of mitras) {
        const mEmail = m.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r: any) => r.email && r.email.toLowerCase() === mEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(mEmail) || encryptUserPassword('mitraND2026!', 'mitra');
          userPasswords.set(mEmail, localEnc);
          toUpgradeInSupabase.push({ email: mEmail, password: localEnc });
        }
      }

      // Ensure every Staff account has an encrypted password record in Supabase user_passwords
      for (const s of staffAccounts) {
        const sEmail = s.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r: any) => r.email && r.email.toLowerCase() === sEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(sEmail) || encryptUserPassword('stafND2026!', 'staff');
          userPasswords.set(sEmail, localEnc);
          toUpgradeInSupabase.push({ email: sEmail, password: localEnc });
        }
      }

      // Ensure Admin has an encrypted password record in Supabase user_passwords
      const adminEmail = adminAccount.email.toLowerCase();
      if (!dbPasswords.some((r: any) => r.email && r.email.toLowerCase() === adminEmail)) {
        const adminEnc = userPasswords.get(adminEmail) || encryptUserPassword(adminAccount.password, 'admin');
        userPasswords.set(adminEmail, adminEnc);
        toUpgradeInSupabase.push({ email: adminEmail, password: adminEnc });
      }

      if (toUpgradeInSupabase.length > 0) {
        await supabase.from('user_passwords').upsert(toUpgradeInSupabase);
        console.log(`[Supabase Cloud] Sinkronisasi pengaturan, profil admin, akun staf, log aktivitas, log email & kredensial terenkripsi ke Supabase selesai.`);
      }
    }

    // 9. Optional dedicated tables (app_settings, activity_logs, email_logs) if created in Supabase
    try {
      const { data: dbSettings, error: errSet } = await supabase.from('app_settings').select('*').eq('id', 'config_primary').maybeSingle();
      if (!errSet && dbSettings && dbSettings.settings) {
        const cloudSettings = dbSettings.settings as Partial<AppSettings>;
        if (cloudSettings.smtpPassword === '••••••••••••••••') {
          delete cloudSettings.smtpPassword;
        }
        appSettings = { ...appSettings, ...cloudSettings };
      }
    } catch {}

    try {
      const { data: dbActLogs, error: errAct } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(250);
      if (!errAct && Array.isArray(dbActLogs) && dbActLogs.length > 0) {
        activityLogs = dbActLogs;
      }
    } catch {}

    try {
      const { data: dbEmLogs, error: errEm } = await supabase
        .from('email_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (!errEm && Array.isArray(dbEmLogs)) {
        const mappedFromTable = dbEmLogs.map(fromSupabaseEmailLogRow);
        // Merge with any logs loaded from __sys_email_logs__@ndtaxlaw.internal so no logs are lost
        const mergedMap = new Map<string, EmailLogItem>();
        for (const item of [...mappedFromTable, ...emailLogs]) {
          if (item && item.id && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        }
        emailLogs = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
        );
        // Backfill public.email_logs table if KV had logs not yet in public.email_logs
        if (emailLogs.length > dbEmLogs.length) {
          const rowsToSync = emailLogs.slice(0, 100).map(toSupabaseEmailLogRow);
          await supabase.from('email_logs').upsert(rowsToSync);
        }
      }
    } catch {}

    saveDatabase();
  } catch (err) {
    console.warn('[Supabase Cloud Warning] Gagal sinkronisasi data dari Supabase saat startup:', err);
  }
};

// Muat konfigurasi awal & sinkronkan langsung dari Supabase
loadDatabase();
// Pastikan default mode adalah production (terkoneksi eksklusif ke Supabase) kecuali disetel development
if (!process.env.APP_ENV) {
  appSettings.appEnvironment = 'production';
}
syncFromSupabase();

// ========================================================
// 0. AUTHENTICATION & DYNAMIC ROLE ENDPOINTS
// ========================================================
app.get('/api/roles', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: systemRoles,
  });
});

app.post('/api/roles', async (req: Request, res: Response) => {
  const { code, name, description, portalView, defaultTab, allowedTabs, permissions } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Kode role dan nama role wajib diisi.' });
  }
  const cleanCode = String(code).trim().toLowerCase().replace(/\s+/g, '_');
  if (systemRoles.some((r) => r.code.toLowerCase() === cleanCode)) {
    return res.status(400).json({ success: false, message: `Role "${cleanCode}" sudah terdaftar.` });
  }

  const newRole: RoleDefinition = {
    code: cleanCode,
    name: String(name).trim(),
    description: description || `Role akses ${name}`,
    portalView: portalView === 'admin' ? 'admin' : 'mitra',
    defaultTab: defaultTab || (portalView === 'admin' ? 'dashboard' : 'idcard'),
    allowedTabs: Array.isArray(allowedTabs) && allowedTabs.length > 0
      ? allowedTabs
      : (portalView === 'admin'
          ? ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'ai-reports', 'idcard']
          : ['idcard', 'dashboard', 'marketing-tools', 'commissions']),
    permissions: Array.isArray(permissions) ? permissions : [],
    isSystem: false,
    isActive: true,
  };

  systemRoles.push(newRole);
  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([
        { email: '__sys_roles__@ndtaxlaw.internal', password: JSON.stringify(systemRoles) },
      ]);
    } catch {}
  }

  res.status(201).json({ success: true, data: newRole });
});

app.put('/api/roles/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const target = systemRoles.find((r) => r.code.toLowerCase() === code.toLowerCase());
  if (!target) {
    return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });
  }
  const { name, description, portalView, defaultTab, allowedTabs, permissions, isActive } = req.body;
  if (name !== undefined) target.name = name;
  if (description !== undefined) target.description = description;
  if (portalView === 'admin' || portalView === 'mitra') target.portalView = portalView;
  if (defaultTab !== undefined) target.defaultTab = defaultTab;
  if (Array.isArray(allowedTabs)) target.allowedTabs = allowedTabs;
  if (Array.isArray(permissions)) target.permissions = permissions;
  if (isActive !== undefined && !target.isSystem) target.isActive = Boolean(isActive);

  saveDatabase();
  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([
        { email: '__sys_roles__@ndtaxlaw.internal', password: JSON.stringify(systemRoles) },
      ]);
    } catch {}
  }
  res.json({ success: true, data: target });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = sanitizeSqlIdentifier((email || '').trim().toLowerCase());
  const isProd = isProductionMode();

  if (!normalizedEmail || !password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Email/ID Anggota dan kata sandi wajib diisi.',
    });
  }

  // Brute-force login protection per IP + target account (Max 12 attempts per 10 minutes)
  const loginRateKey = `login:${getClientIp(req)}:${normalizedEmail}`;
  const loginRate = consumeRateLimit(authRateBuckets, loginRateKey, 12, 10 * 60 * 1000);
  if (!loginRate.allowed) {
    res.setHeader('Retry-After', String(loginRate.retryAfterSec));
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan login yang gagal. Akun dikunci sementara selama ${loginRate.retryAfterSec} detik demi keamanan.`,
    });
  }

  // Sinkronisasi kredensial, profil admin, dan akun staf terbaru dari Supabase saat login
  if (supabase) {
    try {
      const { data: sysRows } = await supabase
        .from('user_passwords')
        .select('*')
        .in('email', [
          '__sys_admin_profile__@ndtaxlaw.internal',
          '__sys_staff_accounts__@ndtaxlaw.internal',
          normalizedEmail,
        ]);
      if (Array.isArray(sysRows)) {
        for (const r of sysRows) {
          const emLow = (r.email || '').toLowerCase();
          if (emLow === '__sys_admin_profile__@ndtaxlaw.internal' && r.password) {
            try {
              const parsedAdmin = JSON.parse(r.password);
              if (parsedAdmin && typeof parsedAdmin === 'object') {
                adminAccount = { ...adminAccount, ...parsedAdmin, role: 'admin' };
              }
            } catch {}
          } else if (emLow === '__sys_staff_accounts__@ndtaxlaw.internal' && r.password) {
            try {
              const parsedStaff = JSON.parse(r.password);
              if (Array.isArray(parsedStaff)) {
                staffAccounts = parsedStaff.map((s: StaffMember) => ({
                  ...s,
                  allowedMenus:
                    Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0
                      ? s.allowedMenus
                      : [...DEFAULT_STAFF_ALLOWED_MENUS],
                }));
              }
            } catch {}
          }
        }
        const pwRow = sysRows.find((r) => (r.email || '').toLowerCase() === normalizedEmail);
        if (pwRow && pwRow.email && pwRow.password) {
          const isStaff = staffAccounts.some((s) => s.email.toLowerCase() === normalizedEmail);
          const defaultRole =
            normalizedEmail === adminAccount.email.toLowerCase()
              ? 'admin'
              : isStaff
                ? 'staff'
                : 'mitra';
          if (!isEncryptedPassword(pwRow.password)) {
            const enc = encryptUserPassword(pwRow.password, defaultRole);
            userPasswords.set(normalizedEmail, enc);
            await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: enc }]);
          } else {
            userPasswords.set(normalizedEmail, pwRow.password);
          }
        }
      }
    } catch {}
  }

  // 1. Check Admin Login (Supports both @ndtaxandlaw.com and @ndtaxlaw.com)
  const isAdminLoginMatch =
    normalizedEmail === adminAccount.email.toLowerCase() ||
    normalizedEmail === 'admin@ndtaxandlaw.com' ||
    normalizedEmail === 'admin@ndtaxlaw.com';
  if (isAdminLoginMatch) {
    const storedAdminCred =
      userPasswords.get(normalizedEmail) ||
      userPasswords.get(adminAccount.email.toLowerCase()) ||
      encryptUserPassword(adminAccount.password, 'admin');
    const verifyRes = verifyUserPassword(password, storedAdminCred, 'admin');

    if (verifyRes.valid) {
      const roleDef = getRoleDefinition('admin');
      recordActivity({
        actorRole: 'admin',
        actorId: adminAccount.id,
        actorName: adminAccount.name,
        actorEmail: adminAccount.email,
        actionType: 'login',
        operation: 'LOGIN',
        targetEntity: 'Autentikasi Admin',
        description: `Admin Operasional (${adminAccount.email}) berhasil login ke Panel Admin (Enkripsi: scrypt+AES256, Role: ${roleDef.code}).`,
      });
      saveDatabase();

      return res.json({
        success: true,
        user: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          phone: adminAccount.phone || '0812-8899-7711',
          position: adminAccount.position || 'Super Administrator Operasional',
          role: 'admin',
          roleCode: 'admin',
          roleName: roleDef.name,
          portalView: 'admin',
          defaultTab: 'dashboard',
          allowedTabs: [
            'dashboard',
            'admin-operations',
            'verification',
            'activity-logs',
            'marketing-tools',
            'commissions',
            'staff-management',
            'ai-reports',
            'idcard',
            'chat',
          ],
          permissions: roleDef.permissions,
          gender: adminAccount.gender || 'male',
          avatarUrl: resolveAvatarUrl(adminAccount.avatarUrl, adminAccount.gender || 'male', adminAccount.name),
        },
        environment: appSettings.appEnvironment,
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi admin tidak valid.' });
  }

  // 1.5 Check Staff Login (Role di bawah Admin - supports @ndtaxandlaw.com & @ndtaxlaw.com)
  const altStaffEmail = normalizedEmail.endsWith('@ndtaxandlaw.com')
    ? normalizedEmail.replace('@ndtaxandlaw.com', '@ndtaxlaw.com')
    : normalizedEmail.endsWith('@ndtaxlaw.com')
    ? normalizedEmail.replace('@ndtaxlaw.com', '@ndtaxandlaw.com')
    : normalizedEmail;
  const staffMember = staffAccounts.find(
    (s) => s.email.toLowerCase() === normalizedEmail || s.email.toLowerCase() === altStaffEmail
  );
  if (staffMember) {
    if (!staffMember.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun Staf Anda sedang dinonaktifkan oleh Admin. Silakan hubungi Administrator.',
      });
    }

    const storedStaffCred =
      userPasswords.get(normalizedEmail) ||
      userPasswords.get(staffMember.email.toLowerCase()) ||
      encryptUserPassword('stafND2026!', 'staff');
    const verifyRes = verifyUserPassword(password, storedStaffCred, 'staff');
    const isStaffPassValid = isProd ? verifyRes.valid : verifyRes.valid || password === 'stafND2026!';

    if (isStaffPassValid) {
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, 'staff');
        userPasswords.set(normalizedEmail, upgraded);
        if (supabase) {
          try {
            await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: upgraded }]);
          } catch {}
        }
      }

      const allowedMenus =
        Array.isArray(staffMember.allowedMenus) && staffMember.allowedMenus.length > 0
          ? staffMember.allowedMenus
          : [...DEFAULT_STAFF_ALLOWED_MENUS];

      // Derive navigation tabs allowed for this Staff (Activity & Email Logs are strictly excluded for Staff)
      const staffNavTabs = ['dashboard', 'admin-operations', 'verification', 'marketing-tools', 'commissions'].filter(
        (t) => allowedMenus.includes(t)
      );
      const effectiveAllowedTabs = [
        ...(staffNavTabs.length > 0 ? staffNavTabs : ['dashboard']),
        'idcard',
        'ai-reports',
      ];
      const defaultStaffTab = staffNavTabs[0] || 'dashboard';
      const resolvedStaffGender = staffMember.gender || inferGenderFromName(staffMember.name);
      const resolvedStaffAvatar = resolveAvatarUrl(
        staffMember.avatarUrl,
        resolvedStaffGender,
        staffMember.name
      );

      recordActivity({
        actorRole: 'staff',
        actorId: staffMember.id,
        actorName: staffMember.name,
        actorEmail: staffMember.email,
        actionType: 'login',
        operation: 'LOGIN',
        targetEntity: 'Autentikasi Staf',
        description: `Staf Operasional "${staffMember.name}" (${staffMember.email}) berhasil login ke Panel Operasional.`,
      });
      saveDatabase();

      return res.json({
        success: true,
        user: {
          id: staffMember.id,
          staffId: staffMember.id,
          name: staffMember.name,
          email: staffMember.email,
          phone: staffMember.phone,
          position: staffMember.position,
          role: 'admin',
          roleCode: 'staff',
          roleName: staffMember.position || 'Staf Operasional',
          portalView: 'admin',
          defaultTab: defaultStaffTab,
          allowedTabs: effectiveAllowedTabs,
          allowedMenus,
          permissions: ['staff_access', ...allowedMenus],
          gender: resolvedStaffGender,
          avatarUrl: resolvedStaffAvatar,
        },
        environment: appSettings.appEnvironment,
      });
    }

    return res.status(401).json({ success: false, message: 'Kata sandi akun Staf tidak valid.' });
  }

  // 2. Check Mitra Login (Dalam mode Production, WAJIB mengecek langsung ke tabel mitras di Supabase)
  let mitra: Mitra | undefined;
  if (supabase) {
    try {
      const { data: dbMitras, error: errM } = await supabase.from('mitras').select('*');
      if (!errM && Array.isArray(dbMitras)) {
        mitras = normalizeMitraAvatars(dbMitras);
        mitra = mitras.find(
          (m) => m.email.toLowerCase() === normalizedEmail || (m.memberCode && m.memberCode.toLowerCase() === normalizedEmail)
        );
      }
    } catch (e) {
      if (isProd) {
        return res.status(503).json({
          success: false,
          message: 'Gagal terhubung ke Database Supabase pada mode Production.',
        });
      }
    }
  }

  if (!mitra && !isProd) {
    mitra = mitras.find(
      (m) => m.email.toLowerCase() === normalizedEmail || (m.memberCode && m.memberCode.toLowerCase() === normalizedEmail)
    );
  }

  if (mitra) {
    if (mitra.emailVerified === false) {
      return res.status(403).json({
        success: false,
        needsEmailVerification: true,
        email: mitra.email,
        message: 'Akun Anda belum melakukan verifikasi email. Silakan periksa inbox (atau folder spam) email Anda dan masukkan kode verifikasi 6-digit untuk mengaktifkan akun sebelum masuk.',
      });
    }

    const mitraEmailLower = mitra.email.toLowerCase();
    const storedCred = userPasswords.get(mitraEmailLower) || encryptUserPassword('mitraND2026!', 'mitra');
    const verifyRes = verifyUserPassword(password, storedCred, 'mitra');
    const isPasswordValid = isProd
      ? verifyRes.valid
      : (verifyRes.valid || password === 'mitraND2026!');

    if (isPasswordValid) {
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, verifyRes.role || 'mitra');
        userPasswords.set(mitraEmailLower, upgraded);
        if (supabase) {
          try {
            await supabase.from('user_passwords').upsert([{ email: mitraEmailLower, password: upgraded }]);
          } catch {}
        }
      }

      const roleDef = getRoleDefinition(verifyRes.role || 'mitra');
      const resolvedGender = mitra.gender || inferGenderFromName(mitra.fullName);
      const resolvedAvatar = resolveAvatarUrl(mitra.avatarUrl, resolvedGender, mitra.fullName);
      mitra.gender = resolvedGender;
      mitra.avatarUrl = resolvedAvatar;

      recordActivity({
        actorRole: 'mitra',
        actorId: mitra.id,
        actorName: mitra.fullName,
        actorEmail: mitra.email,
        actionType: 'login',
        operation: 'LOGIN',
        targetEntity: 'Autentikasi Mitra',
        description: `Mitra ${mitra.fullName} (${mitra.memberCode}) berhasil login ke Portal Kemitraan (Role: ${roleDef.code}).`,
      });
      saveDatabase();

      return res.json({
        success: true,
        user: {
          id: mitra.id,
          name: mitra.fullName,
          email: mitra.email,
          role: roleDef.portalView,
          roleCode: roleDef.code,
          roleName: roleDef.name,
          portalView: roleDef.portalView,
          defaultTab: roleDef.defaultTab,
          allowedTabs: roleDef.allowedTabs,
          permissions: roleDef.permissions,
          mitraId: mitra.id,
          referralCode: mitra.referralCode,
          gender: resolvedGender,
          avatarUrl: resolvedAvatar,
        },
        environment: appSettings.appEnvironment,
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi akun mitra salah. Silakan periksa kembali.' });
  }

  return res.status(404).json({
    success: false,
    message: 'Akun tidak ditemukan atau belum terdaftar',
  });
});

// ========================================================
// ADMIN PROFILE & STAFF MANAGEMENT ENDPOINTS
// ========================================================
const persistAdminAndStaffToCloud = async () => {
  saveDatabase();
  if (supabase) {
    try {
      const { password: _ap, ...safeAdmin } = adminAccount;
      await supabase.from('user_passwords').upsert([
        { email: '__sys_admin_profile__@ndtaxlaw.internal', password: JSON.stringify(safeAdmin) },
        { email: '__sys_staff_accounts__@ndtaxlaw.internal', password: JSON.stringify(staffAccounts) },
      ]);
    } catch (e) {
      console.warn('Supabase admin/staff sync warning:', e);
    }
  }
};

app.get('/api/admin/profile', async (req: Request, res: Response) => {
  const { password: _ap, ...safeAdmin } = adminAccount;
  res.json({
    success: true,
    data: {
      admin: {
        ...safeAdmin,
        avatarUrl: resolveAvatarUrl(safeAdmin.avatarUrl, safeAdmin.gender || 'male', safeAdmin.name),
      },
      staffList: staffAccounts.map((s) => ({
        ...s,
        avatarUrl: resolveAvatarUrl(s.avatarUrl, s.gender || 'female', s.name),
      })),
    },
  });
});

app.put('/api/admin/profile', async (req: Request, res: Response) => {
  const { name, email, phone, position, gender, avatarUrl, newPassword } = req.body;
  const oldEmailLower = adminAccount.email.toLowerCase();
  const nextEmailLower = email ? String(email).trim().toLowerCase() : oldEmailLower;

  if (!nextEmailLower || !nextEmailLower.includes('@')) {
    return res.status(400).json({ success: false, message: 'Format email Admin tidak valid.' });
  }

  if (
    nextEmailLower !== oldEmailLower &&
    (staffAccounts.some((s) => s.email.toLowerCase() === nextEmailLower) ||
      mitras.some((m) => m.email.toLowerCase() === nextEmailLower))
  ) {
    return res.status(400).json({
      success: false,
      message: `Email "${nextEmailLower}" sudah digunakan oleh akun Staf atau Mitra lain.`,
    });
  }

  if (name) adminAccount.name = String(name).trim();
  if (phone !== undefined) adminAccount.phone = String(phone).trim();
  if (position !== undefined) adminAccount.position = String(position).trim();
  if (gender === 'male' || gender === 'female') adminAccount.gender = gender;
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    adminAccount.avatarUrl = avatarUrl.trim();
  } else if (gender === 'male' || gender === 'female') {
    adminAccount.avatarUrl = getDefaultAvatar(gender, adminAccount.name);
  }

  const prevStoredEnc =
    userPasswords.get(oldEmailLower) || encryptUserPassword(adminAccount.password, 'admin');

  if (nextEmailLower !== oldEmailLower) {
    userPasswords.delete(oldEmailLower);
    adminAccount.email = nextEmailLower;
    if (supabase) {
      try {
        await supabase.from('user_passwords').delete().eq('email', oldEmailLower);
      } catch {}
    }
  }

  if (newPassword && String(newPassword).trim().length >= 6) {
    const cleanNewPass = String(newPassword).trim();
    adminAccount.password = cleanNewPass;
    const encryptedPass = encryptUserPassword(cleanNewPass, 'admin');
    userPasswords.set(nextEmailLower, encryptedPass);
    if (supabase) {
      try {
        await supabase.from('user_passwords').upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {}
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, 'admin');
    userPasswords.set(nextEmailLower, reEncrypted);
    if (supabase) {
      try {
        await supabase.from('user_passwords').upsert([{ email: nextEmailLower, password: reEncrypted }]);
      } catch {}
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'profile_update',
    operation: 'UPDATE',
    targetEntity: 'Profil & Keamanan Admin',
    description: `Admin memperbarui data profil (${adminAccount.name} - ${adminAccount.email})${newPassword ? ' beserta kata sandi akun Admin.' : '.'}`,
  });

  await persistAdminAndStaffToCloud();

  const { password: _ap, ...safeAdmin } = adminAccount;
  res.json({
    success: true,
    message: 'Data profil dan keamanan Admin berhasil diperbarui!',
    data: {
      ...safeAdmin,
      avatarUrl: resolveAvatarUrl(safeAdmin.avatarUrl, safeAdmin.gender || 'male', safeAdmin.name),
    },
  });
});

app.get('/api/staff', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: staffAccounts.map((s) => ({
      ...s,
      avatarUrl: resolveAvatarUrl(s.avatarUrl, s.gender || 'female', s.name),
    })),
  });
});

app.post('/api/staff', async (req: Request, res: Response) => {
  const { name, email, phone, position, gender, avatarUrl, password, allowedMenus, isActive } = req.body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Nama lengkap dan alamat email Staf wajib diisi dengan benar.',
    });
  }

  if (
    cleanEmail === adminAccount.email.toLowerCase() ||
    staffAccounts.some((s) => s.email.toLowerCase() === cleanEmail) ||
    mitras.some((m) => m.email.toLowerCase() === cleanEmail)
  ) {
    return res.status(409).json({
      success: false,
      message: `Email "${cleanEmail}" sudah terdaftar pada sistem. Gunakan alamat email lain.`,
    });
  }

  const resolvedGender: 'male' | 'female' =
    gender === 'female' ? 'female' : gender === 'male' ? 'male' : inferGenderFromName(cleanName);
  const resolvedAvatar =
    avatarUrl && String(avatarUrl).trim().length > 0
      ? String(avatarUrl).trim()
      : getDefaultAvatar(resolvedGender, cleanName);

  const validMenus =
    Array.isArray(allowedMenus) && allowedMenus.length > 0
      ? allowedMenus
      : [...DEFAULT_STAFF_ALLOWED_MENUS];

  const newStaff: StaffMember = {
    id: `staff-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    phone: (phone || '').trim() || '-',
    position: (position || '').trim() || 'Staf Operasional',
    gender: resolvedGender,
    avatarUrl: resolvedAvatar,
    isActive: isActive !== false,
    allowedMenus: validMenus,
    createdAt: new Date().toISOString().split('T')[0],
  };

  staffAccounts.unshift(newStaff);

  const encryptedPass = encryptUserPassword(
    password && String(password).trim().length >= 6 ? String(password).trim() : 'stafND2026!',
    'staff'
  );
  userPasswords.set(cleanEmail, encryptedPass);

  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([{ email: cleanEmail, password: encryptedPass }]);
    } catch {}
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'register',
    operation: 'CREATE',
    targetEntity: 'Manajemen Staf',
    description: `Admin menambahkan akun Staf baru "${newStaff.name}" (${newStaff.email}) dengan jabatan "${newStaff.position}".`,
  });

  await persistAdminAndStaffToCloud();

  res.status(201).json({
    success: true,
    message: `Akun Staf "${newStaff.name}" berhasil ditambahkan!`,
    data: newStaff,
  });
});

app.put('/api/staff/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = staffAccounts.find((s) => s.id === id);
  if (!staff) {
    return res.status(404).json({ success: false, message: 'Data Staf tidak ditemukan.' });
  }

  const { name, email, phone, position, gender, avatarUrl, newPassword, allowedMenus, isActive, actorRole } =
    req.body;
  const oldEmailLower = staff.email.toLowerCase();
  const nextEmailLower = email ? String(email).trim().toLowerCase() : oldEmailLower;

  if (!nextEmailLower || !nextEmailLower.includes('@')) {
    return res.status(400).json({ success: false, message: 'Format email Staf tidak valid.' });
  }

  if (
    nextEmailLower !== oldEmailLower &&
    (nextEmailLower === adminAccount.email.toLowerCase() ||
      staffAccounts.some((s) => s.id !== id && s.email.toLowerCase() === nextEmailLower) ||
      mitras.some((m) => m.email.toLowerCase() === nextEmailLower))
  ) {
    return res.status(409).json({
      success: false,
      message: `Email "${nextEmailLower}" sudah digunakan oleh pengguna lain.`,
    });
  }

  if (name) staff.name = String(name).trim();
  if (phone !== undefined) staff.phone = String(phone).trim();
  if (position !== undefined) staff.position = String(position).trim();
  if (gender === 'male' || gender === 'female') staff.gender = gender;
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    staff.avatarUrl = avatarUrl.trim();
  } else if (gender === 'male' || gender === 'female') {
    staff.avatarUrl = getDefaultAvatar(gender, staff.name);
  }
  if (Array.isArray(allowedMenus)) {
    staff.allowedMenus = allowedMenus;
  }
  if (isActive !== undefined) {
    staff.isActive = Boolean(isActive);
  }
  staff.updatedAt = new Date().toISOString().split('T')[0];

  const prevStoredEnc =
    userPasswords.get(oldEmailLower) || encryptUserPassword('stafND2026!', 'staff');

  if (nextEmailLower !== oldEmailLower) {
    userPasswords.delete(oldEmailLower);
    staff.email = nextEmailLower;
    if (supabase) {
      try {
        await supabase.from('user_passwords').delete().eq('email', oldEmailLower);
      } catch {}
    }
  }

  if (newPassword && String(newPassword).trim().length >= 6) {
    const encryptedPass = encryptUserPassword(String(newPassword).trim(), 'staff');
    userPasswords.set(nextEmailLower, encryptedPass);
    if (supabase) {
      try {
        await supabase.from('user_passwords').upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {}
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, 'staff');
    userPasswords.set(nextEmailLower, reEncrypted);
    if (supabase) {
      try {
        await supabase.from('user_passwords').upsert([{ email: nextEmailLower, password: reEncrypted }]);
      } catch {}
    }
  }

  recordActivity({
    actorRole: actorRole === 'staff' ? 'staff' : 'admin',
    actorId: actorRole === 'staff' ? staff.id : adminAccount.id,
    actorName: actorRole === 'staff' ? staff.name : adminAccount.name,
    actorEmail: actorRole === 'staff' ? staff.email : adminAccount.email,
    actionType: 'profile_update',
    operation: 'UPDATE',
    targetEntity: 'Data & Hak Akses Staf',
    description:
      actorRole === 'staff'
        ? `Staf "${staff.name}" (${staff.email}) memperbarui profil akunnya${newPassword ? ' beserta kata sandi.' : '.'}`
        : `Admin memperbarui data / hak akses menu Staf "${staff.name}" (${staff.email}).`,
  });

  await persistAdminAndStaffToCloud();

  res.json({
    success: true,
    message: 'Data dan konfigurasi akun Staf berhasil diperbarui!',
    data: {
      ...staff,
      avatarUrl: resolveAvatarUrl(staff.avatarUrl, staff.gender || 'female', staff.name),
    },
  });
});

app.delete('/api/staff/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const target = staffAccounts.find((s) => s.id === id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Data Staf tidak ditemukan.' });
  }

  const emailLower = target.email.toLowerCase();
  staffAccounts = staffAccounts.filter((s) => s.id !== id);
  userPasswords.delete(emailLower);

  if (supabase) {
    try {
      await supabase.from('user_passwords').delete().eq('email', emailLower);
    } catch {}
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'profile_update',
    operation: 'DELETE',
    targetEntity: 'Manajemen Staf',
    description: `Admin menghapus akun Staf "${target.name}" (${target.email}).`,
  });

  await persistAdminAndStaffToCloud();

  res.json({
    success: true,
    message: `Akun Staf "${target.name}" berhasil dihapus.`,
  });
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = sanitizeSqlIdentifier((email || '').trim().toLowerCase());

  const otpReqRate = consumeRateLimit(
    authRateBuckets,
    `forgot:${getClientIp(req)}:${normalizedEmail}`,
    5,
    10 * 60 * 1000
  );
  if (!otpReqRate.allowed) {
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak permintaan kode OTP. Silakan tunggu ${otpReqRate.retryAfterSec} detik.`,
    });
  }

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const isAdmin = normalizedEmail === adminAccount.email.toLowerCase();
  const staff = staffAccounts.find((s) => s.email.toLowerCase() === normalizedEmail);
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);

  if (!isAdmin && !staff && !mitra) {
    return res.status(404).json({
      success: false,
      message: 'Email tidak terdaftar di database sistem NDTAXANDLAW.',
    });
  }

  const otpCode = crypto.randomInt(100000, 999999).toString();
  const tokenPayload = {
    otp: otpCode,
    expiresAt: Date.now() + 30 * 60 * 1000,
    attempts: 0,
  };
  passwordResetTokens.set(normalizedEmail, tokenPayload);
  if (supabase) {
    try {
      await supabase
        .from('user_passwords')
        .upsert([{ email: `__otp__:${normalizedEmail}`, password: JSON.stringify(tokenPayload) }]);
    } catch {}
  }

  const recipientName = isAdmin
    ? adminAccount.name
    : staff
      ? staff.name
      : mitra
        ? mitra.fullName
        : 'Pengguna NDTAXANDLAW';

  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName,
    subject: `Kode Verifikasi Pemulihan Kata Sandi Akun NDTAXANDLAW: ${otpCode}`,
    category: 'password_reset',
    previewSnippet: `Halo ${recipientName},\n\nKode OTP pemulihan kata sandi akun Anda adalah: ${otpCode}\n\nGunakan kode 6-digit ini untuk memperbarui kata sandi baru Anda. Kode berlaku selama 30 menit. Jangan bagikan kode ini kepada orang lain demi keamanan.`,
  });

  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message: `Gagal mengirim email kode OTP ke ${email}. Pastikan pengaturan SMTP sudah terhubung dengan benar. (${emailResult.message})`,
    });
  }

  res.json({
    success: true,
    message: `Kode OTP pemulihan kata sandi telah dikirim ke email ${email}. Silakan periksa inbox atau folder spam Anda.`,
  });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  const rawOtp = req.body.otpCode ?? req.body.otp ?? req.body.token ?? '';
  const normalizedEmail = sanitizeSqlIdentifier((email || '').trim().toLowerCase());
  const cleanOtp = String(rawOtp || '').replace(/\D/g, '').trim();

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
  }

  if (!cleanOtp || cleanOtp.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Kode OTP pemulihan 6-digit wajib diisi.',
    });
  }

  let storedToken = passwordResetTokens.get(normalizedEmail);

  // Fallback 1: Check Supabase KV if server restarted
  if (!storedToken && supabase) {
    try {
      const { data: kvOtp } = await supabase
        .from('user_passwords')
        .select('password')
        .eq('email', `__otp__:${normalizedEmail}`)
        .maybeSingle();
      if (kvOtp?.password) {
        const parsed = JSON.parse(kvOtp.password);
        if (parsed && parsed.otp) {
          storedToken = parsed;
          passwordResetTokens.set(normalizedEmail, parsed);
        }
      }
    } catch {}
  }

  // Fallback 2: Check recent emailLogs (within 60 mins) if server restarted before KV was written
  if (!storedToken) {
    const recentResetLog = emailLogs.find(
      (log) =>
        log.category === 'password_reset' &&
        (log.recipient || '').toLowerCase() === normalizedEmail &&
        Date.now() - new Date(log.sentAt || 0).getTime() < 60 * 60 * 1000
    );
    if (recentResetLog) {
      const otpMatch =
        (recentResetLog.subject || '').match(/(\d{6})/) ||
        (recentResetLog.previewSnippet || '').match(/(\d{6})/);
      if (otpMatch && otpMatch[1]) {
        storedToken = {
          otp: otpMatch[1],
          expiresAt: Date.now() + 30 * 60 * 1000,
          attempts: 0,
        };
        passwordResetTokens.set(normalizedEmail, storedToken);
      }
    }
  }

  if (!storedToken || Date.now() > storedToken.expiresAt) {
    passwordResetTokens.delete(normalizedEmail);
    return res.status(400).json({
      success: false,
      message: 'Kode OTP tidak ditemukan atau sudah kedaluwarsa. Silakan minta kode OTP baru.',
    });
  }

  if (!safeTimingCompare(storedToken.otp, cleanOtp)) {
    storedToken.attempts += 1;
    if (storedToken.attempts >= 5) {
      passwordResetTokens.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        message: 'Terlalu banyak percobaan OTP yang salah. Kode OTP telah hangus, silakan minta kode baru.',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Kode OTP pemulihan tidak cocok. Silakan periksa kembali email Anda.',
    });
  }

  passwordResetTokens.delete(normalizedEmail);
  if (supabase) {
    try {
      await supabase.from('user_passwords').delete().eq('email', `__otp__:${normalizedEmail}`);
    } catch {}
  }

  const isStaff = staffAccounts.some((s) => s.email.toLowerCase() === normalizedEmail);
  const existingRole =
    normalizedEmail === adminAccount.email.toLowerCase()
      ? 'admin'
      : isStaff
        ? 'staff'
        : extractUserRole(userPasswords.get(normalizedEmail), 'mitra');
  const encryptedPassword = encryptUserPassword(newPassword, existingRole);

  userPasswords.set(normalizedEmail, encryptedPassword);
  const staff = staffAccounts.find((s) => s.email.toLowerCase() === normalizedEmail);
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  recordActivity({
    actorRole:
      normalizedEmail === adminAccount.email.toLowerCase()
        ? 'admin'
        : isStaff
          ? 'staff'
          : 'mitra',
    actorId: mitra?.id || staff?.id || 'admin-01',
    actorName: mitra?.fullName || staff?.name || adminAccount.name,
    actorEmail: normalizedEmail,
    actionType: 'password_reset',
    operation: 'UPDATE',
    targetEntity: 'Keamanan Akun',
    description: `Kata sandi untuk akun ${normalizedEmail} berhasil diperbarui dan dienkripsi (scrypt + AES-256-GCM).`,
  });
  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: encryptedPassword }]);
    } catch (e) {
      console.warn('Supabase password reset update error', e);
    }
  }

  res.json({
    success: true,
    message: 'Kata sandi Anda telah berhasil diubah dan dienkripsi. Silakan masuk menggunakan kata sandi baru.',
  });
});

// Endpoint: Verifikasi Email Mitra Baru (Token 6-Digit)
app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
  const { email, token } = req.body;
  const normalizedEmail = sanitizeSqlIdentifier((email || '').trim().toLowerCase());
  const inputToken = String(token || '').trim();

  const verifyRate = consumeRateLimit(
    authRateBuckets,
    `verify-email:${getClientIp(req)}:${normalizedEmail}`,
    10,
    10 * 60 * 1000
  );
  if (!verifyRate.allowed) {
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan verifikasi. Silakan tunggu ${verifyRate.retryAfterSec} detik.`,
    });
  }

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Akun dengan email tersebut tidak ditemukan.' });
  }

  if (mitra.emailVerified) {
    return res.json({ success: true, message: 'Email akun ini sudah terverifikasi sebelumnya. Anda dapat langsung masuk.' });
  }

  const isExpired =
    mitra.verificationTokenExpiry && new Date(mitra.verificationTokenExpiry).getTime() < Date.now();
  if (isExpired) {
    return res.status(400).json({
      success: false,
      message: 'Kode verifikasi 6-digit telah kedaluwarsa. Silakan klik Kirim Ulang Kode Verifikasi.',
    });
  }

  const isTokenValid = Boolean(
    mitra.verificationToken && inputToken && safeTimingCompare(mitra.verificationToken, inputToken)
  );
  if (!isTokenValid) {
    return res.status(400).json({
      success: false,
      message: 'Kode verifikasi 6-digit salah atau tidak cocok. Silakan periksa kembali pesan di email Anda.',
    });
  }

  mitra.emailVerified = true;
  mitra.verificationToken = undefined;
  mitra.verificationTokenExpiry = undefined;
  if (mitra.bankDetails) {
    const cleanedBank: any = { ...mitra.bankDetails, __emailVerified: true };
    delete cleanedBank.__verificationToken;
    delete cleanedBank.__verificationTokenExpiry;
    mitra.bankDetails = cleanedBank;
  }

  recordActivity({
    actorRole: 'mitra',
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: 'verify_email',
    operation: 'UPDATE',
    targetEntity: 'Verifikasi Email Mitra',
    description: `Mitra ${mitra.fullName} (${mitra.email}) berhasil memverifikasi alamat email menggunakan kode OTP 6-digit.`,
  });

  saveDatabase();

  if (supabase) {
    try {
      const { error: upErr } = await supabase
        .from('mitras')
        .update({
          emailVerified: true,
          verificationToken: null,
          bankDetails: mitra.bankDetails,
        })
        .eq('id', mitra.id);
      if (upErr) {
        await supabase
          .from('mitras')
          .update({
            bankDetails: mitra.bankDetails,
          })
          .eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase verify-email update error', e);
    }
  }

  res.json({
    success: true,
    message: 'Verifikasi email berhasil! Akun kemitraan Anda kini telah aktif dan siap digunakan untuk masuk ke portal.',
  });
});

// Endpoint: Kirim Ulang Kode Verifikasi Email
app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Akun mitra dengan email tersebut tidak ditemukan.' });
  }

  if (mitra.emailVerified) {
    return res.json({ success: true, message: 'Email akun Anda sudah terverifikasi. Silakan langsung masuk.' });
  }

  const newToken = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  mitra.verificationToken = newToken;
  mitra.verificationTokenExpiry = expiryIso;
  mitra.bankDetails = {
    ...(mitra.bankDetails || {}),
    __emailVerified: false,
    __verificationToken: newToken,
    __verificationTokenExpiry: expiryIso,
  } as any;

  saveDatabase();

  if (supabase) {
    try {
      const { error: upErr } = await supabase
        .from('mitras')
        .update({
          verificationToken: newToken,
          verificationTokenExpiry: expiryIso,
          bankDetails: mitra.bankDetails,
        })
        .eq('id', mitra.id);
      if (upErr) {
        await supabase
          .from('mitras')
          .update({
            bankDetails: mitra.bankDetails,
          })
          .eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase resend-verification update error', e);
    }
  }

  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: mitra.fullName,
    subject: `[Kirim Ulang] Kode Verifikasi Email Akun Kemitraan NDTAXANDLAW: ${newToken}`,
    category: 'registration_verify',
    previewSnippet: `Halo ${mitra.fullName},\n\nBerikut adalah kode verifikasi email 6-digit terbaru Anda: ${newToken}\n\nSilakan masukkan kode tersebut pada halaman verifikasi untuk mengaktifkan akun kemitraan Anda sebelum masuk.`,
  });

  recordActivity({
    actorRole: 'mitra',
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: 'verify_email',
    operation: 'UPDATE',
    targetEntity: 'Kirim Ulang Kode Verifikasi Email',
    description: emailResult.success
      ? `Mitra "${mitra.fullName}" meminta kirim ulang kode OTP verifikasi ke ${mitra.email} (Terkirim via SMTP).`
      : `Mitra "${mitra.fullName}" meminta kirim ulang kode OTP verifikasi ke ${mitra.email}, namun pengiriman email gagal: ${emailResult.message}`,
  });

  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message: `Gagal mengirim email verifikasi ke ${mitra.email}. Silakan periksa konfigurasi SMTP di Pengaturan Sistem. Detail: ${emailResult.message}`,
    });
  }

  res.json({
    success: true,
    message: `Kode verifikasi baru telah dikirimkan ke alamat email ${mitra.email}. Silakan cek kotak masuk atau folder spam Anda.`,
  });
});

// ========================================================
// 1. MITRA ENDPOINTS
// ========================================================
// Helper to strip internal OTP tokens before sending Mitra objects to clients
const toPublicSafeMitraList = (list: Mitra[]) =>
  list.map(({ verificationToken: _vt, verificationTokenExpiry: _vte, ...safeMitra }) => safeMitra);

app.get('/api/mitra', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('mitras').select('*');
      if (!error && Array.isArray(data)) {
        // LANGSUNG gunakan data dari Supabase tanpa merge lokal, sehingga jika data dihapus di Supabase otomatis hilang saat refresh!
        mitras = normalizeMitraAvatars(data);
        saveDatabase();
        return res.json({ success: true, data: toPublicSafeMitraList(mitras) });
      }
      if (isProductionMode() && error) {
        return res.status(503).json({ success: false, message: `Supabase Error: ${error.message}`, data: [] });
      }
    } catch (e: any) {
      if (isProductionMode()) {
        return res.status(503).json({ success: false, message: 'Gagal memuat data mitra dari Supabase.', data: [] });
      }
      console.warn('Supabase query error for mitras, using dev fallback', e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: 'Supabase wajib terhubung pada mode Production.', data: [] });
  }
  mitras = normalizeMitraAvatars(mitras);
  res.json({ success: true, data: toPublicSafeMitraList(mitras) });
});

// Endpoint Verifikasi Publik Kartu Identitas Mitra (Hasil Scan QR Code)
app.get('/api/mitra/public-verify/:code', async (req: Request, res: Response) => {
  const rawCode = String(req.params.code || '').trim();
  if (!rawCode) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Informasi data mitra tidak ditemukan.',
    });
  }

  if (supabase) {
    try {
      const { data } = await supabase.from('mitras').select('*');
      if (Array.isArray(data)) {
        mitras = normalizeMitraAvatars(data);
      }
    } catch {}
  }

  const normalizedQuery = rawCode.toUpperCase();
  const formattedQuery = formatMitraMemberCode(rawCode).toUpperCase();
  const matched = mitras.find(
    (m) =>
      (m.memberCode || '').trim().toUpperCase() === normalizedQuery ||
      (m.memberCode || '').trim().toUpperCase() === formattedQuery ||
      (m.referralCode || '').trim().toUpperCase() === normalizedQuery ||
      (m.id || '').trim().toUpperCase() === normalizedQuery
  );

  if (!matched || matched.status !== 'verified') {
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Informasi Data Mitra Tidak Ditemukan atau Belum Terverifikasi Resmi.',
    });
  }

  return res.json({
    success: true,
    verified: true,
    data: {
      id: matched.id,
      memberCode: matched.memberCode,
      referralCode: matched.referralCode,
      fullName: matched.fullName,
      specialization: matched.specialization,
      joinedDate: matched.joinedDate,
      avatarUrl: matched.avatarUrl,
      gender: matched.gender || 'male',
      status: 'verified',
      firmName: appSettings.firmName || 'NDTAXANDLAW',
      supportPhone: appSettings.supportPhone || '0812-8899-7711',
      supportEmail: appSettings.supportEmail || 'advisory@ndtaxandlaw.com',
      officeAddress:
        appSettings.officeAddress ||
        'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
    },
  });
});

app.post('/api/mitra/register', async (req: Request, res: Response) => {
  const { fullName, email, phone, nik, specialization, bankDetails, password, gender, role, customFields } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email wajib diisi untuk kredensial akun.' });
  }
  const safeFullName = (fullName || '').trim() || email.split('@')[0];
  const safePhone = (phone || '').trim() || '-';

  const normalizedEmail = (email || '').trim().toLowerCase();

  // Sinkronkan daftar mitra dari Supabase terlebih dahulu agar validasi email unik selalu akurat
  if (supabase) {
    try {
      const { data: dbMitras, error: errM } = await supabase.from('mitras').select('*');
      if (!errM && Array.isArray(dbMitras)) {
        mitras = normalizeMitraAvatars(dbMitras);
      }
    } catch {}
  }

  // VALIDASI 1: EMAIL UNIQUE
  const existingMitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (existingMitra) {
    return res.status(400).json({
      success: false,
      message: `Email "${email}" sudah terdaftar sebagai mitra. Silakan masuk (login) ke akun Anda atau gunakan email lain.`,
    });
  }

  const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationExpiryIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const generatedReferralCode = `ND-REF-${Math.floor(1000 + Math.random() * 9000)}`;
  const resolvedGender: 'male' | 'female' = gender === 'female' ? 'female' : (gender === 'male' ? 'male' : inferGenderFromName(safeFullName));
  const assignedRole = getRoleDefinition(role || 'mitra').code;
  const cleanCustomFields = customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0 ? customFields : undefined;

  const baseBank = bankDetails || {
    bankName: 'Bank Central Asia (BCA)',
    accountNumber: '-',
    accountHolder: safeFullName,
  };

  const newMitra: Mitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-TAX-LAW-${Math.floor(1000 + Math.random() * 9000)}`,
    referralCode: generatedReferralCode,
    fullName: safeFullName,
    email: normalizedEmail,
    phone: safePhone,
    nik: (nik || '').trim() || '-',
    specialization: specialization || 'Business Partner',
    status: 'pending',
    gender: resolvedGender,
    avatarUrl: req.body.avatarUrl || getDefaultAvatar(resolvedGender, safeFullName),
    joinedDate: new Date().toISOString().split('T')[0],
    bankDetails: {
      ...baseBank,
      __gender: resolvedGender,
      __emailVerified: false,
      __verificationToken: verificationToken,
      __verificationTokenExpiry: verificationExpiryIso,
      ...(cleanCustomFields ? { __customFields: cleanCustomFields } : {}),
    } as any,
    customFields: cleanCustomFields,
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: verificationExpiryIso,
  };

  mitras.unshift(newMitra);

  const encryptedPass = encryptUserPassword(password || 'mitraND2026!', assignedRole);
  userPasswords.set(normalizedEmail, encryptedPass);

  recordActivity({
    actorRole: 'mitra',
    actorId: newMitra.id,
    actorName: newMitra.fullName,
    actorEmail: newMitra.email,
    actionType: 'register',
    operation: 'CREATE',
    targetEntity: 'Pendaftaran Mitra',
    description: `Pendaftaran mitra baru "${newMitra.fullName}" (${newMitra.email}, Role: ${assignedRole}) dengan ${appSettings.specializationLabel || DEFAULT_SPECIALIZATION_LABEL}: ${newMitra.specialization}. Kode OTP 6-digit dikirim ke email.`,
  });

  if (supabase) {
    try {
      const { gender: _g, customFields: _cf, ...supabaseMitraPayload } = newMitra;
      const { error: insertErr } = await supabase.from('mitras').insert([supabaseMitraPayload]);
      if (insertErr) {
        const {
          emailVerified: _ev,
          verificationToken: _vt,
          verificationTokenExpiry: _vte,
          ...minimalPayload
        } = supabaseMitraPayload;
        const { error: retryErr } = await supabase.from('mitras').insert([minimalPayload]);
        if (retryErr) {
          console.warn('Supabase mitra insert warning:', retryErr.message);
        }
      }
      await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: encryptedPass }]);
    } catch (e) {
      console.warn('Supabase insert error for new mitra', e);
    }
  }

  saveDatabase();

  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: safeFullName,
    subject: `[Kode OTP: ${verificationToken}] Verifikasi Email Akun Kemitraan NDTAXANDLAW`,
    category: 'registration_verify',
    previewSnippet: `Halo ${safeFullName},\n\nTerima kasih telah mendaftar di jaringan Kemitraan Resmi NDTAXANDLAW (${newMitra.memberCode}).\n\nBerikut adalah Kode Verifikasi (OTP) 6-Digit Anda untuk memvalidasi email aktif:\n\nKODE VERIFIKASI: ${verificationToken}\n\nSilakan masukkan 6 digit kode di atas pada halaman Verifikasi Email untuk mengaktifkan akun kemitraan Anda. Kode ini berlaku selama 24 jam.`,
  });

  const newNotif: NotificationItem = {
    id: `notif-ops-${Date.now()}`,
    title: 'Pendaftaran Mitra Baru',
    message: `${safeFullName} (${newMitra.memberCode}) baru saja mendaftar kemitraan (Menunggu validasi Admin).`,
    type: 'verification',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'admin_staff',
  };
  notifications.unshift(newNotif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([toSupabaseNotification(newNotif)]);
    } catch {}
  }

  saveDatabase();

  const { verificationToken: _stripVt, verificationTokenExpiry: _stripVte, ...safeMitraData } = newMitra;

  res.status(201).json({
    success: true,
    data: safeMitraData,
    needsEmailVerification: true,
    email: normalizedEmail,
    emailSent: emailResult.success,
    emailError: emailResult.error,
    message: `Pendaftaran berhasil disimpan! Kami telah mengirimkan kode OTP 6-digit ke alamat email ${normalizedEmail}. Silakan masukkan kode tersebut untuk mengaktifkan akun Anda.`,
  });
});

app.put('/api/mitra/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // 'verified' | 'rejected'

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  mitra.status = status;
  const todayStr = new Date().toISOString().split('T')[0];

  if (status === 'verified') {
    mitra.memberCode = formatMitraMemberCode(mitra.memberCode, mitra.id);
    mitra.rejectionReason = undefined;
    mitra.rejectedAt = undefined;
    if (mitra.bankDetails) {
      const cleanedBank: any = { ...mitra.bankDetails };
      delete cleanedBank.__rejectionReason;
      delete cleanedBank.__rejectedAt;
      mitra.bankDetails = cleanedBank;
    }

    const notif: NotificationItem = {
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: 'Status Kemitraan Disetujui (Lulus Verifikasi)',
      message: `Selamat! Pendaftaran Mitra ${mitra.fullName} telah disetujui oleh Admin. Kartu Identitas Eksklusif (${mitra.memberCode}), Kode Referral (${mitra.referralCode}), dan fitur Input Klien kini telah aktif penuh.`,
      type: 'verification',
      timestamp: new Date().toISOString(),
      isRead: false,
      targetAudience: 'mitra',
      mitraId: mitra.id,
    };
    notifications.unshift(notif);

    if (mitra.email) {
      await sendSystemEmail({
        recipient: mitra.email,
        recipientName: mitra.fullName,
        subject: `Selamat! Akun Mitra NDTAXANDLAW Anda Lulus Verifikasi (${mitra.memberCode})`,
        category: 'registration_verify',
        previewSnippet: `Pendaftaran kemitraan Anda atas nama ${mitra.fullName} telah diperiksa dan DISETUJUI (Lulus Verifikasi) oleh Admin NDTAXANDLAW.\n\nNomor Anggota Resmi: ${mitra.memberCode}\nKode Referral Resmi: ${mitra.referralCode}\n\nSekarang Anda sudah dapat menggunakan Kode Referral, menginput data klien, serta mengunduh Kartu Identitas Eksklusif Mitra di portal.`,
      });
    }

    if (supabase) {
      try {
        await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      } catch (e) {
        console.warn('Supabase insert error', e);
      }
    }
  } else if (status === 'rejected') {
    const reasonText =
      (rejectionReason && String(rejectionReason).trim()) ||
      'Data pendaftaran belum sesuai kriteria verifikasi Admin. Silakan periksa dan perbaiki data diri atau rekening bank Anda, lalu ajukan ulang verifikasi.';
    mitra.rejectionReason = reasonText;
    mitra.rejectedAt = todayStr;
    mitra.bankDetails = {
      ...mitra.bankDetails,
      __rejectionReason: reasonText,
      __rejectedAt: todayStr,
    } as any;

    const notif: NotificationItem = {
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: 'Verifikasi Pendaftaran Mitra Ditolak — Perlu Perbaikan Data',
      message: `Pendaftaran Mitra ${mitra.fullName} ditolak oleh Admin. Alasan: "${reasonText}". Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.`,
      type: 'verification',
      timestamp: new Date().toISOString(),
      isRead: false,
      targetAudience: 'mitra',
      mitraId: mitra.id,
    };
    notifications.unshift(notif);

    if (mitra.email) {
      await sendSystemEmail({
        recipient: mitra.email,
        recipientName: mitra.fullName,
        subject: `Pemberitahuan Hasil Verifikasi Mitra NDTAXANDLAW: Perlu Perbaikan Data`,
        category: 'registration_verify',
        previewSnippet: `Hasil pemeriksaan data pendaftaran Mitra Anda (${mitra.fullName}) memerlukan perbaikan dengan keterangan dari Admin:\n\n"${reasonText}"\n\nSilakan masuk ke Portal Mitra, perbaiki data diri / rekening bank Anda, lalu klik tombol "Ajukan Ulang Verifikasi" agar dapat diperiksa kembali oleh Admin.`,
      });
    }

    if (supabase) {
      try {
        await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      } catch (e) {
        console.warn('Supabase insert error', e);
      }
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'mitra_verify',
    operation: 'UPDATE',
    targetEntity: 'Verifikasi Mitra',
    description:
      status === 'verified'
        ? `Admin menyetujui (Approve) verifikasi Mitra "${mitra.fullName}" menjadi TERVERIFIKASI (${mitra.memberCode}).`
        : `Admin menolak verifikasi data Mitra "${mitra.fullName}". Alasan: "${mitra.rejectionReason}".`,
  });

  if (supabase) {
    try {
      await supabase
        .from('mitras')
        .update({
          status,
          memberCode: mitra.memberCode,
          bankDetails: mitra.bankDetails,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update verify error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, data: mitra });
});

app.put('/api/mitra/:id/profile', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, phone, nik, specialization, bankDetails, gender, avatarUrl, newPassword, resubmitVerification, customFields } = req.body;

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  const wasRejected = mitra.status === 'rejected';

  if (fullName) mitra.fullName = fullName;
  if (phone) mitra.phone = phone;
  if (nik) mitra.nik = nik;
  if (specialization) mitra.specialization = specialization;
  if (customFields && typeof customFields === 'object') {
    mitra.customFields = { ...(mitra.customFields || {}), ...customFields };
  }
  if (gender === 'male' || gender === 'female') {
    mitra.gender = gender;
  }
  if (bankDetails || mitra.customFields || mitra.gender) {
    const mergedBank: any = { ...mitra.bankDetails, ...(bankDetails || {}) };
    if (mitra.gender === 'male' || mitra.gender === 'female') {
      mergedBank.__gender = mitra.gender;
    }
    if (mitra.customFields && Object.keys(mitra.customFields).length > 0) {
      mergedBank.__customFields = mitra.customFields;
    }
    if (wasRejected || resubmitVerification) {
      delete mergedBank.__rejectionReason;
      delete mergedBank.__rejectedAt;
    }
    mitra.bankDetails = mergedBank;
  }
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    mitra.avatarUrl = avatarUrl.trim();
  } else if (gender === 'male' || gender === 'female') {
    mitra.avatarUrl = getDefaultAvatar(gender, mitra.fullName);
  }

  // Jika mitra yang sebelumnya ditolak memperbaiki data / mengajukan ulang verifikasi, kembalikan status ke 'pending'
  if (wasRejected || resubmitVerification) {
    mitra.status = 'pending';
    mitra.rejectionReason = undefined;
    mitra.rejectedAt = undefined;
    if (mitra.bankDetails) {
      const cleanedBank: any = { ...mitra.bankDetails };
      delete cleanedBank.__rejectionReason;
      delete cleanedBank.__rejectedAt;
      mitra.bankDetails = cleanedBank;
    }

    const notif: NotificationItem = {
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: 'Pengajuan Ulang Verifikasi Data Mitra',
      message: `Mitra "${mitra.fullName}" (${mitra.memberCode}) telah memperbaiki data pendaftaran dan mengajukan ulang verifikasi kepada Admin.`,
      type: 'verification',
      timestamp: new Date().toISOString(),
      isRead: false,
      targetAudience: 'mitra',
      mitraId: mitra.id,
    };
    notifications.unshift(notif);
    if (supabase) {
      try {
        await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      } catch {}
    }
  }

  if (newPassword && newPassword.length >= 6) {
    const encryptedPwd = encryptUserPassword(newPassword, 'mitra');
    userPasswords.set(mitra.email.toLowerCase(), encryptedPwd);
    if (supabase) {
      try {
        await supabase.from('user_passwords').upsert([{ email: mitra.email.toLowerCase(), password: encryptedPwd }]);
      } catch {}
    }
  }

  recordActivity({
    actorRole: 'mitra',
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: 'profile_update',
    operation: 'UPDATE',
    targetEntity: wasRejected || resubmitVerification ? 'Pengajuan Ulang Verifikasi Mitra' : 'Profil & Rekening Mitra',
    description:
      wasRejected || resubmitVerification
        ? `Mitra "${mitra.fullName}" memperbarui data diri/rekening dan mengajukan ulang verifikasi pendaftaran ke Admin.`
        : `Mitra "${mitra.fullName}" memperbarui data profil dan rekening bank (${mitra.bankDetails.bankName} - ${mitra.bankDetails.accountNumber}).`,
  });

  if (supabase) {
    try {
      await supabase.from('mitras').update({
        fullName: mitra.fullName,
        phone: mitra.phone,
        nik: mitra.nik,
        specialization: mitra.specialization,
        bankDetails: mitra.bankDetails,
        avatarUrl: mitra.avatarUrl,
        status: mitra.status,
      }).eq('id', id);
    } catch (e) {
      console.warn('Supabase update profile error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, data: mitra });
});

// ========================================================
// 2. MARKETING TOOLS ENDPOINTS & PERMANENT HOSTING FILE STORAGE
// ========================================================
const MARKETING_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'marketing-tools');
const DATA_UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'marketing-tools');
const PERSISTENT_HOME_UPLOADS_DIR = path.join(
  os.homedir(),
  '.ndtaxandlaw_storage',
  'uploads',
  'marketing-tools'
);

for (const dir of [MARKETING_UPLOADS_DIR, DATA_UPLOADS_DIR, PERSISTENT_HOME_UPLOADS_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

// Restore any files from PERSISTENT_HOME_UPLOADS_DIR or DATA_UPLOADS_DIR into MARKETING_UPLOADS_DIR on startup
try {
  for (const backupDir of [PERSISTENT_HOME_UPLOADS_DIR, DATA_UPLOADS_DIR]) {
    if (fs.existsSync(backupDir)) {
      for (const file of fs.readdirSync(backupDir)) {
        const srcPath = path.join(backupDir, file);
        const destPath = path.join(MARKETING_UPLOADS_DIR, file);
        if (!fs.existsSync(destPath) && fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }
} catch {}

const getMimeTypeFromExt = (filename: string): string => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
};

// Self-healing static file handler: restores missing files from persistent OS storage or Supabase Cloud automatically
app.get('/uploads/marketing-tools/:filename', async (req: Request, res: Response) => {
  const safeName = path.basename(String(req.params.filename || ''));
  if (!safeName) {
    return res.status(404).end();
  }

  const primaryPath = path.join(MARKETING_UPLOADS_DIR, safeName);
  const homeBackupPath = path.join(PERSISTENT_HOME_UPLOADS_DIR, safeName);
  const dataBackupPath = path.join(DATA_UPLOADS_DIR, safeName);

  // 1. Check primary public/uploads/marketing-tools
  if (fs.existsSync(primaryPath)) {
    res.setHeader('Content-Type', getMimeTypeFromExt(safeName));
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.sendFile(primaryPath);
  }

  // 2. Self-heal from persistent OS home storage or data/uploads storage
  for (const candidate of [homeBackupPath, dataBackupPath]) {
    if (fs.existsSync(candidate)) {
      try {
        if (!fs.existsSync(MARKETING_UPLOADS_DIR)) {
          fs.mkdirSync(MARKETING_UPLOADS_DIR, { recursive: true });
        }
        fs.copyFileSync(candidate, primaryPath);
        res.setHeader('Content-Type', getMimeTypeFromExt(safeName));
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.sendFile(primaryPath);
      } catch {
        res.setHeader('Content-Type', getMimeTypeFromExt(safeName));
        return res.sendFile(candidate);
      }
    }
  }

  // 3. Self-heal from Supabase Cloud backup if server disk was wiped during redeploy/git pull
  if (supabase) {
    try {
      const cloudKey = `__sys_file_${safeName.toLowerCase()}__@ndtaxlaw.internal`;
      const { data } = await supabase
        .from('user_passwords')
        .select('password')
        .eq('email', cloudKey)
        .maybeSingle();

      if (data?.password) {
        const parsed = JSON.parse(data.password);
        if (parsed?.base64) {
          const buf = Buffer.from(parsed.base64, 'base64');
          for (const dir of [MARKETING_UPLOADS_DIR, PERSISTENT_HOME_UPLOADS_DIR, DATA_UPLOADS_DIR]) {
            try {
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path.join(dir, safeName), buf);
            } catch {}
          }
          res.setHeader('Content-Type', parsed.mime || getMimeTypeFromExt(safeName));
          res.setHeader('Cache-Control', 'public, max-age=604800');
          return res.send(buf);
        }
      }
    } catch {}
  }

  return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '7d' }));

const formatFileSizeServer = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const compressBinaryBuffer = (buf: Buffer, ext: string): Buffer => {
  if (ext === 'pdf' || ext === 'mp4') {
    let start = 0;
    while (start < buf.length && buf[start] === 0) start++;
    let end = buf.length;
    while (
      end > start &&
      (buf[end - 1] === 0 ||
        (ext === 'pdf' && (buf[end - 1] === 0x20 || buf[end - 1] === 0x0a || buf[end - 1] === 0x0d)))
    ) {
      end--;
    }
    const trimmed = buf.subarray(start, end);
    return trimmed.length > 0 ? Buffer.from(trimmed) : buf;
  }
  return buf;
};

const persistMarketingToolsToCloud = async () => {
  if (!supabase) return;
  try {
    await supabase.from('user_passwords').upsert([
      {
        email: '__sys_marketing_tools__@ndtaxlaw.internal',
        password: JSON.stringify(marketingTools),
      },
    ]);
  } catch (e) {
    console.warn('Supabase KV marketing_tools backup warning:', e);
  }
};

const saveDataUrlToHostingServer = (
  dataUrl: string,
  originalName: string,
  fallbackExt: string
): { hostedUrl: string; savedBytes: number; originalBytes: number; formattedSize: string } | null => {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64Data = match[2];
  const rawBuffer = Buffer.from(base64Data, 'base64');
  const originalBytes = rawBuffer.length;

  let ext = fallbackExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  if (mime.includes('pdf')) ext = 'pdf';
  else if (mime.includes('svg')) ext = 'svg';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('mp4') || mime.includes('video')) ext = 'mp4';

  const optimizedBuffer = compressBinaryBuffer(rawBuffer, ext);
  const safeBaseName = String(originalName || 'materi-marketing')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'materi-marketing';

  const fileName = `${Date.now()}-${safeBaseName}.${ext}`;

  // Write to all 3 persistent directories (public/uploads, data/uploads, and OS home .ndtaxandlaw_storage)
  for (const targetDir of [MARKETING_UPLOADS_DIR, DATA_UPLOADS_DIR, PERSISTENT_HOME_UPLOADS_DIR]) {
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, fileName), optimizedBuffer);
    } catch {}
  }

  // Also back up file binary in Supabase Cloud so even a fresh VPS/container redeploy restores it
  if (supabase && optimizedBuffer.length <= 18 * 1024 * 1024) {
    const cloudKey = `__sys_file_${fileName.toLowerCase()}__@ndtaxlaw.internal`;
    const cloudPayload = JSON.stringify({
      fileName,
      mime: getMimeTypeFromExt(fileName),
      base64: optimizedBuffer.toString('base64'),
      savedAt: new Date().toISOString(),
    });
    supabase
      .from('user_passwords')
      .upsert([{ email: cloudKey, password: cloudPayload }])
      .then(() => {}, () => {});
  }

  return {
    hostedUrl: `/uploads/marketing-tools/${fileName}`,
    savedBytes: optimizedBuffer.length,
    originalBytes,
    formattedSize: formatFileSizeServer(optimizedBuffer.length),
  };
};

app.post('/api/marketing-tools/upload', (req: Request, res: Response) => {
  try {
    const { dataUrl, fileName, fileType, originalByteSize } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ success: false, message: 'Data file tidak valid.' });
    }
    const saved = saveDataUrlToHostingServer(dataUrl, fileName || 'materi', fileType || 'pdf');
    if (!saved) {
      return res.status(400).json({ success: false, message: 'Gagal memproses format file.' });
    }
    const origBytes = Number(originalByteSize) > 0 ? Number(originalByteSize) : saved.originalBytes;
    return res.json({
      success: true,
      data: {
        hostedUrl: saved.hostedUrl,
        savedBytes: saved.savedBytes,
        originalBytes: origBytes,
        formattedSize: saved.formattedSize,
        originalFormattedSize: formatFileSizeServer(origBytes),
      },
    });
  } catch (err) {
    console.error('Upload marketing tool file error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan file ke server hosting.' });
  }
});

app.get('/api/marketing-tools', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const [{ data: tableData, error: tableErr }, { data: kvData }] = await Promise.all([
        supabase.from('marketing_tools').select('*'),
        supabase
          .from('user_passwords')
          .select('password')
          .eq('email', '__sys_marketing_tools__@ndtaxlaw.internal')
          .maybeSingle(),
      ]);

      let kvTools: MarketingTool[] = [];
      if (kvData?.password) {
        try {
          const parsed = JSON.parse(kvData.password);
          if (Array.isArray(parsed)) kvTools = parsed;
        } catch {}
      }

      if ((!tableErr && Array.isArray(tableData) && tableData.length > 0) || kvTools.length > 0) {
        const merged = new Map<string, MarketingTool>();
        for (const t of [...(Array.isArray(tableData) ? tableData : []), ...kvTools]) {
          if (t && t.id && !merged.has(t.id)) {
            merged.set(t.id, t);
          }
        }
        marketingTools = Array.from(merged.values());
        saveDatabase();
        return res.json({ success: true, data: marketingTools });
      }
    } catch (e) {
      console.warn('Supabase tools error', e);
    }
  }
  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  }
  res.json({ success: true, data: marketingTools });
});

app.post('/api/marketing-tools', async (req: Request, res: Response) => {
  const { title, category, fileType, fileSize, downloadUrl, thumbnailUrl, description, targetProduct, duration } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, message: 'Judul dan Kategori wajib diisi' });
  }

  let finalDownloadUrl = downloadUrl || '#file-download';
  let finalFileSize = fileSize || '3.5 MB';
  let finalThumbnailUrl =
    thumbnailUrl || (fileType === 'png' || fileType === 'jpg' ? finalDownloadUrl : '');

  // If a raw base64 dataUrl was passed directly, save it to the hosting server automatically
  if (typeof finalDownloadUrl === 'string' && finalDownloadUrl.startsWith('data:')) {
    const saved = saveDataUrlToHostingServer(finalDownloadUrl, title, fileType || 'pdf');
    if (saved) {
      finalDownloadUrl = saved.hostedUrl;
      finalFileSize = saved.formattedSize;
      if (fileType === 'png' || fileType === 'jpg') {
        finalThumbnailUrl = saved.hostedUrl;
      }
    }
  } else if (typeof finalThumbnailUrl === 'string' && finalThumbnailUrl.startsWith('data:')) {
    const savedThumb = saveDataUrlToHostingServer(finalThumbnailUrl, `${title}-thumb`, 'jpg');
    if (savedThumb) {
      finalThumbnailUrl = savedThumb.hostedUrl;
    }
  }

  const newTool: MarketingTool = {
    id: `tool-${Date.now()}`,
    title,
    category,
    fileType: fileType || 'pdf',
    fileSize: finalFileSize,
    downloadUrl: finalDownloadUrl,
    thumbnailUrl: finalThumbnailUrl,
    description: description || 'Materi pendukung pemasaran resmi NDTAXANDLAW.',
    targetProduct: targetProduct || 'Layanan Konsultasi Pajak & Hukum',
    ...(duration ? { duration } : {}),
    createdAt: new Date().toISOString().split('T')[0],
  };

  marketingTools.unshift(newTool);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'tool_create',
    operation: 'CREATE',
    targetEntity: 'Tools Marketing',
    description: `Admin mengunggah materi marketing baru: "${title}" (${category}) [${finalFileSize}].`,
  });

  if (supabase) {
    try {
      const { error: insErr } = await supabase.from('marketing_tools').upsert([newTool]);
      if (insErr) {
        console.warn('Supabase marketing_tools table insert warning (using KV backup):', insErr.message);
      }
    } catch (e) {
      console.warn('Supabase insert tool error', e);
    }
    await persistMarketingToolsToCloud();
  }

  const notif: NotificationItem = {
    id: `notif-sys-${Date.now()}`,
    title: 'Tools Marketing Baru Ditambahkan',
    message: `Admin telah menambahkan materi baru: "${title}" (${category}).`,
    type: 'system_update',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'admin_only',
  };
  notifications.unshift(notif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase insert notif error', e);
    }
  }

  saveDatabase();

  res.status(201).json({ success: true, data: newTool });
});

app.put('/api/marketing-tools/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = marketingTools.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Materi marketing tidak ditemukan.' });
  }

  const existing = marketingTools[idx];
  const {
    title,
    category,
    fileType,
    fileSize,
    downloadUrl,
    thumbnailUrl,
    description,
    targetProduct,
    duration,
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, message: 'Judul dan Kategori wajib diisi.' });
  }

  const nextFileType = fileType || existing.fileType || 'pdf';
  let finalDownloadUrl = downloadUrl || existing.downloadUrl || '#file-download';
  let finalFileSize = fileSize || existing.fileSize || '3.5 MB';
  let finalThumbnailUrl =
    thumbnailUrl !== undefined
      ? thumbnailUrl
      : nextFileType === 'png' || nextFileType === 'jpg'
      ? finalDownloadUrl
      : existing.thumbnailUrl || '';

  if (typeof finalDownloadUrl === 'string' && finalDownloadUrl.startsWith('data:')) {
    const saved = saveDataUrlToHostingServer(finalDownloadUrl, title, nextFileType);
    if (saved) {
      finalDownloadUrl = saved.hostedUrl;
      finalFileSize = saved.formattedSize;
      if (nextFileType === 'png' || nextFileType === 'jpg') {
        finalThumbnailUrl = saved.hostedUrl;
      }
    }
  } else if (typeof finalThumbnailUrl === 'string' && finalThumbnailUrl.startsWith('data:')) {
    const savedThumb = saveDataUrlToHostingServer(finalThumbnailUrl, `${title}-thumb`, 'jpg');
    if (savedThumb) {
      finalThumbnailUrl = savedThumb.hostedUrl;
    }
  }

  const updatedTool: MarketingTool = {
    ...existing,
    title: String(title).trim(),
    category,
    fileType: nextFileType,
    fileSize: finalFileSize,
    downloadUrl: finalDownloadUrl,
    thumbnailUrl:
      nextFileType === 'png' || nextFileType === 'jpg'
        ? finalThumbnailUrl || finalDownloadUrl
        : '',
    description:
      description !== undefined
        ? String(description).trim() || 'Materi pendukung pemasaran resmi NDTAXANDLAW.'
        : existing.description,
    targetProduct:
      targetProduct !== undefined
        ? String(targetProduct).trim() || 'Layanan Konsultasi NDTAXANDLAW'
        : existing.targetProduct,
    duration: nextFileType === 'mp4' ? duration || existing.duration || '03:30 min' : undefined,
    createdAt: new Date().toISOString().split('T')[0],
  };

  marketingTools[idx] = updatedTool;

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'tool_update',
    operation: 'UPDATE',
    targetEntity: 'Tools Marketing',
    description: `Admin memperbarui materi marketing: "${updatedTool.title}" (${updatedTool.category}) [${updatedTool.fileSize}].`,
  });

  if (supabase) {
    try {
      const { error: upErr } = await supabase.from('marketing_tools').upsert([updatedTool]);
      if (upErr) {
        console.warn('Supabase marketing_tools table update warning (using KV backup):', upErr.message);
      }
    } catch (e) {
      console.warn('Supabase update tool error', e);
    }
    await persistMarketingToolsToCloud();
  }

  saveDatabase();

  res.json({ success: true, data: updatedTool });
});

app.delete('/api/marketing-tools/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const target = marketingTools.find((t) => t.id === id);
  marketingTools = marketingTools.filter((t) => t.id !== id);

  // Clean up hosted file from all disk locations and cloud backup if explicitly deleted by Admin
  if (target?.downloadUrl && target.downloadUrl.startsWith('/uploads/marketing-tools/')) {
    const fileName = path.basename(target.downloadUrl);
    for (const dir of [MARKETING_UPLOADS_DIR, DATA_UPLOADS_DIR, PERSISTENT_HOME_UPLOADS_DIR]) {
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
    if (supabase) {
      try {
        await supabase
          .from('user_passwords')
          .delete()
          .eq('email', `__sys_file_${fileName.toLowerCase()}__@ndtaxlaw.internal`);
      } catch {}
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'tool_delete',
    operation: 'DELETE',
    targetEntity: 'Tools Marketing',
    description: `Admin menghapus materi marketing: "${target?.title || id}".`,
  });

  if (supabase) {
    try {
      await supabase.from('marketing_tools').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete tool error', e);
    }
    await persistMarketingToolsToCloud();
  }

  saveDatabase();

  res.json({ success: true, message: 'Materi berhasil dihapus' });
});

// ========================================================
// 3. COMMISSIONS & PAYOUT ENDPOINTS
// ========================================================
app.get('/api/commissions', async (req: Request, res: Response) => {
  const { mitraId } = req.query;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('commissions').select('*');
      if (!error && Array.isArray(data)) {
        commissions = data;
        saveDatabase();
        if (mitraId) {
          return res.json({ success: true, data: commissions.filter((c) => c.mitraId === mitraId) });
        }
        return res.json({ success: true, data: commissions });
      }
    } catch (e) {
      console.warn('Supabase commissions query error', e);
    }
  }

  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  }

  if (mitraId) {
    return res.json({ success: true, data: commissions.filter((c) => c.mitraId === mitraId) });
  }
  res.json({ success: true, data: commissions });
});

app.post('/api/commissions/payout', async (req: Request, res: Response) => {
  const { mitraId, amount } = req.body;
  const mitra = mitras.find((m) => m.id === mitraId);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  // Hitung saldo komisi yang benar-benar fix masuk dan belum diajukan pencairan
  const alreadyPendingAmount = payoutRequests
    .filter((p) => p.mitraId === mitra.id && p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const availableFixCommission = Math.max(0, (mitra.pendingPayout || 0) - alreadyPendingAmount);
  const nominalAmount = Number(amount);

  if (!nominalAmount || nominalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Nominal pencairan harus lebih besar dari Rp 0.',
    });
  }

  if (availableFixCommission <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Saldo komisi fix Anda saat ini Rp 0 (atau seluruh saldo sedang dalam antrean pencairan). Komisi baru hanya masuk setelah klien di-approve oleh Admin.',
    });
  }

  if (nominalAmount > availableFixCommission) {
    return res.status(400).json({
      success: false,
      message: `Nominal penarikan (Rp ${nominalAmount.toLocaleString('id-ID')}) melebihi saldo komisi fix yang tersedia (Rp ${availableFixCommission.toLocaleString('id-ID')}).`,
    });
  }

  const newPayout: PayoutRequest = {
    id: `pay-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    memberCode: mitra.memberCode,
    amount: nominalAmount,
    bankDetails: mitra.bankDetails,
    requestDate: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: 'Pengajuan pencairan komisi melalui Portal Mitra.',
  };

  payoutRequests.unshift(newPayout);

  recordActivity({
    actorRole: 'mitra',
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: 'payout_request',
    operation: 'CREATE',
    targetEntity: 'Pengajuan Pembayaran Komisi',
    description: `Mitra "${mitra.fullName}" mengajukan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString('id-ID')} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}).`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: 'Pengajuan Penarikan Komisi',
    message: `Pengajuan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString('id-ID')} oleh ${mitra.fullName} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: mitra.id,
  };
  notifications.unshift(notif);

  if (supabase) {
    try {
      await supabase.from('payout_requests').insert([newPayout]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase insert payout error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, message: 'Pengajuan pencairan berhasil dikirim', data: newPayout });
});

// ========================================================
// 3.5 DYNAMIC SERVICES ENDPOINTS (ADMIN CONTROLLED)
// ========================================================
app.get('/api/services', async (req: Request, res: Response) => {
  const { all } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('services').select('*');
      if (!error && Array.isArray(data)) {
        const normSrv = normalizeServicesCatalog(data);
        services = normSrv.list;
        if (normSrv.migrated) {
          await supabase.from('services').delete().in('id', Array.from(LEGACY_SEEDED_SERVICE_IDS));
          await supabase.from('services').upsert(services);
        }
        saveDatabase();
      }
    } catch (e) {
      console.warn('Supabase services query error', e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  } else {
    services = normalizeServicesCatalog(services).list;
  }

  if (all === 'true') {
    return res.json({ success: true, data: services });
  }
  return res.json({ success: true, data: services.filter((s) => s.isActive) });
});

app.post('/api/services', async (req: Request, res: Response) => {
  const { name, category, defaultPrice, pricingType, commissionRate, description } = req.body;
  if (!name || !category || !defaultPrice) {
    return res.status(400).json({ success: false, message: 'Nama, kategori, dan nominal default wajib diisi.' });
  }

  const resolvedPricingType = resolveServicePricingType({
    name,
    pricingType:
      pricingType === 'monthly_subscription'
        ? 'monthly_subscription'
        : pricingType === 'annual_subscription'
        ? 'annual_subscription'
        : 'case_by_case',
  });

  const newService: ServiceItem = {
    id: `srv-${Date.now()}`,
    name,
    category: category || 'Laporan Keuangan',
    defaultPrice: Number(defaultPrice) || 5000000,
    pricingType: resolvedPricingType,
    commissionRate: Number(commissionRate) || 15,
    description: description || 'Layanan profesional NDTAXANDLAW.',
    isActive: true,
  };

  services.unshift(newService);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'service_create',
    operation: 'CREATE',
    targetEntity: 'Katalog Layanan Pajak',
    description: `Admin menambahkan paket layanan baru: "${name}" (Harga Default: Rp ${newService.defaultPrice.toLocaleString('id-ID')}, Komisi: ${newService.commissionRate}%).`,
  });

  const notif: NotificationItem = {
    id: `notif-sys-${Date.now()}`,
    title: 'Katalog Layanan Diperbarui',
    message: `Admin menambahkan layanan baru: "${name}" (${newService.pricingType === 'monthly_subscription' ? 'Langganan Bulanan' : 'Case by Case'}).`,
    type: 'system_update',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'admin_only',
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('services').insert([newService]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase insert service error', e);
    }
  }

  res.status(201).json({ success: true, data: newService });
});

app.put('/api/services/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, category, defaultPrice, pricingType, commissionRate, description, isActive } = req.body;
  const service = services.find((s) => s.id === id);

  if (!service) {
    return res.status(404).json({ success: false, message: 'Layanan tidak ditemukan' });
  }

  if (name !== undefined) service.name = name;
  if (category !== undefined) service.category = category;
  if (defaultPrice !== undefined) service.defaultPrice = Number(defaultPrice);
  if (pricingType !== undefined) service.pricingType = pricingType;
  service.pricingType = resolveServicePricingType(service);
  if (commissionRate !== undefined) service.commissionRate = Number(commissionRate);
  if (description !== undefined) service.description = description;
  if (isActive !== undefined) service.isActive = Boolean(isActive);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'service_update',
    operation: 'UPDATE',
    targetEntity: 'Katalog Layanan Pajak',
    description: `Admin memperbarui paket layanan: "${service.name}" (Rp ${service.defaultPrice.toLocaleString('id-ID')}, Status: ${service.isActive ? 'Aktif' : 'Nonaktif'}).`,
  });

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('services').upsert([service]);
    } catch (e) {
      console.warn('Supabase upsert service error', e);
    }
  }

  res.json({ success: true, data: service });
});

app.delete('/api/services/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const target = services.find((s) => s.id === id);
  services = services.filter((s) => s.id !== id);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'service_delete',
    operation: 'DELETE',
    targetEntity: 'Katalog Layanan Pajak',
    description: `Admin menghapus layanan pajak: "${target?.name || id}".`,
  });

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('services').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete service error', e);
    }
  }

  res.json({ success: true, message: 'Layanan berhasil dihapus' });
});

// ========================================================
// 3.6 CLIENT DEALS & REFERRAL TRACKING ENDPOINTS
// ========================================================
app.get('/api/clients', async (req: Request, res: Response) => {
  const { mitraId, referralCode } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('client_deals').select('*');
      if (!error && Array.isArray(data)) {
        clientDeals = data.map((row: any) => fromSupabaseClientDeal(row));
        saveDatabase();
      }
    } catch (e) {
      console.warn('Supabase client_deals query error', e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  }

  let filtered = [...clientDeals];
  if (mitraId) {
    filtered = filtered.filter((d) => d.mitraId === mitraId);
  }
  if (referralCode) {
    filtered = filtered.filter((d) => d.referralCode === referralCode);
  }
  res.json({ success: true, data: filtered });
});

app.post('/api/clients', async (req: Request, res: Response) => {
  const {
    mitraId,
    companyName,
    picName,
    picPhone,
    picEmail,
    serviceId,
    dealValue,
    pricingType,
    subscriptionStartDate,
    billingDayOfMonth,
    periodStart,
    periodEnd,
    durationMonths,
    paymentTermType,
    notes,
    customFields,
  } = req.body;

  if (!serviceId) {
    return res.status(400).json({ success: false, message: 'Pilihan paket layanan wajib diisi.' });
  }
  const safeCompanyName = (companyName || '').trim() || (picName || '').trim() || 'Klien Referral NDTAXANDLAW';
  const safePicName = (picName || '').trim() || safeCompanyName;

  if (supabase) {
    try {
      const { data: supaSettings } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'config_primary')
        .maybeSingle();
      if (supaSettings?.settings) {
        appSettings = { ...appSettings, ...supaSettings.settings };
      }
    } catch {}
    try {
      const { data: supaMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(supaMitras)) {
        mitras = normalizeMitraAvatars(supaMitras);
      }
    } catch {}
  }

  // Tolak jika pendaftaran mandiri klien (submittedBy === 'client_self') tetapi fitur allowClientSelfRegister dinonaktifkan Admin
  if (req.body.submittedBy === 'client_self' && appSettings.allowClientSelfRegister === false) {
    return res.status(403).json({
      success: false,
      message:
        'Pendaftaran Mandiri Klien melalui Tautan Referral saat ini sedang dinonaktifkan oleh Administrator.',
    });
  }

  const mitra = mitras.find((m) => m.id === mitraId || m.referralCode === req.body.referralCode);
  if (!mitra || mitra.status !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Kode referral dan input data klien belum dapat digunakan karena akun mitra masih dalam proses verifikasi Admin.',
    });
  }
  const service = services.find((s) => s.id === serviceId);

  const selectedPricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription' =
    service
      ? resolveServicePricingType(service)
      : pricingType || 'case_by_case';
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 10000000);
  const perClientComm = calculateClientDealCommission(
    selectedPricingType,
    nominalValue,
    appSettings.commissionScheme
  );
  const commissionCalc = perClientComm.initialAmount;

  // Setiap klien baru yang diinput oleh Mitra maupun Klien mandiri SELALU berstatus 'pending_acc' (Sedang Ditinjau Admin)
  // dan belum mendapatkan komisi sebelum Admin melakukan review & approve (Deal).
  const todayStr = new Date().toISOString().split('T')[0];
  const isSubscription = selectedPricingType === 'monthly_subscription' || selectedPricingType === 'annual_subscription';
  const startSubDate = isSubscription ? (subscriptionStartDate || todayStr) : undefined;
  const billingDay = isSubscription
    ? (Number(billingDayOfMonth) || Number((startSubDate || todayStr).split('-')[2]) || 1)
    : undefined;
  const cleanClientCustomFields =
    customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0
      ? customFields
      : undefined;

  const newDeal: ClientDeal = {
    id: `deal-${Date.now()}`,
    mitraId: mitra ? mitra.id : (mitraId || 'mitra-01'),
    mitraName: mitra ? mitra.fullName : 'Mitra Terdaftar',
    referralCode: mitra ? mitra.referralCode : (req.body.referralCode || 'ND-REF-0000'),
    companyName: safeCompanyName,
    picName: safePicName,
    picPhone: picPhone || '-',
    picEmail: picEmail || '-',
    serviceId,
    serviceName: service ? service.name : 'Layanan Konsultasi Pajak & Keuangan',
    pricingType: selectedPricingType,
    dealValue: nominalValue,
    commissionAmount: commissionCalc,
    appliedCommissionRate: perClientComm.initialRate,
    lockedRecurringRate: perClientComm.recurringRate,
    recurringCommissionAmount: perClientComm.recurringAmount,
    status: 'pending_acc',
    date: todayStr,
    subscriptionStartDate: startSubDate,
    billingDayOfMonth: billingDay,
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    durationMonths: durationMonths ? Number(durationMonths) : undefined,
    paymentTermType: paymentTermType || 'one_time',
    notes: notes || '',
    submittedBy: req.body.submittedBy || 'mitra',
    customFields: cleanClientCustomFields,
  };

  clientDeals.unshift(newDeal);

  recordActivity({
    actorRole: newDeal.submittedBy === 'client_self' ? 'client' : 'mitra',
    actorId: newDeal.mitraId,
    actorName: newDeal.submittedBy === 'client_self' ? `${picName} (${companyName})` : newDeal.mitraName,
    actorEmail: mitra?.email || picEmail,
    actionType: 'client_create',
    operation: 'CREATE',
    targetEntity: 'Input Klien (Menunggu Review Admin)',
    description: `${newDeal.submittedBy === 'client_self' ? `Klien "${companyName}" mendaftar mandiri` : `Mitra "${newDeal.mitraName}" menginput klien baru "${companyName}"`} untuk layanan "${newDeal.serviceName}" senilai Rp ${nominalValue.toLocaleString('id-ID')} (${perClientComm.tierLabel}, Ref: ${newDeal.referralCode}). Status: Sedang Ditinjau Admin (Komisi Rp 0 sebelum di-approve).`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${newDeal.mitraId}-${Date.now()}`,
    title: 'Klien Baru Sedang Ditinjau Admin',
    message: `${newDeal.companyName} terdaftar melalui Mitra ${newDeal.mitraName} (${newDeal.referralCode} • ${perClientComm.tierLabel}). Menunggu validasi & approve deal dari Admin agar komisi masuk ke saldo Mitra.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: newDeal.mitraId,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').insert([toSupabaseClientDeal(newDeal)]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase client deal insert error', e);
    }
  }

  res.status(201).json({ success: true, data: newDeal });
});

// Admin Reviews & Approves (Deal) Client -> Credits Commission Immediately to Mitra & Locks Deal-Time Rate
app.put('/api/clients/:id/acc', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    subscriptionStartDate,
    billingDayOfMonth,
    dealValue,
    notes,
    customCommissionRate,
    customRecurringRate,
  } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status !== 'pending_acc') {
    return res.status(400).json({ success: false, message: 'Klien ini sudah direview/divalidasi sebelumnya.' });
  }

  if (dealValue !== undefined && Number(dealValue) > 0) {
    deal.dealValue = Number(dealValue);
  }

  const tierCalc = calculateClientDealCommission(
    deal.pricingType,
    deal.dealValue,
    appSettings.commissionScheme
  );

  // Lock the deal-time commission rate & recurring rate onto the ClientDeal
  const finalInitialRate =
    customCommissionRate !== undefined && Number(customCommissionRate) >= 0
      ? Number(customCommissionRate)
      : tierCalc.initialRate;
  const finalRecurringRate =
    deal.pricingType === 'case_by_case'
      ? 0
      : customRecurringRate !== undefined && Number(customRecurringRate) >= 0
        ? Number(customRecurringRate)
        : tierCalc.recurringRate;

  deal.appliedCommissionRate = finalInitialRate;
  deal.commissionAmount = Math.round((deal.dealValue * finalInitialRate) / 100);
  deal.lockedRecurringRate = finalRecurringRate;
  deal.recurringCommissionAmount =
    deal.pricingType === 'case_by_case'
      ? 0
      : Math.round((deal.dealValue * finalRecurringRate) / 100);

  if (notes !== undefined) {
    deal.notes = notes;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const isSubscription = deal.pricingType === 'monthly_subscription' || deal.pricingType === 'annual_subscription';
  const approvedStatus = isSubscription ? 'active_subscription' : 'deal_closed';
  deal.status = approvedStatus;

  if (isSubscription) {
    const startDate = subscriptionStartDate || deal.subscriptionStartDate || todayStr;
    const billingDay = Number(billingDayOfMonth) || deal.billingDayOfMonth || Number(startDate.split('-')[2]) || 1;
    deal.subscriptionStartDate = startDate;
    deal.billingDayOfMonth = billingDay;
    deal.lastBilledDate = startDate;
    deal.nextBillingDate = computeNextBillingDate(startDate, billingDay, deal.pricingType);
    deal.isBillingDue = todayStr >= deal.nextBillingDate;
    if (deal.pricingType === 'monthly_subscription') {
      deal.recurringPaidMonths = 1;
    } else {
      deal.recurringPaidYears = 1;
    }
  }

  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.referredClientsCount = (mitra.referredClientsCount || 0) + 1;
    if (isSubscription) {
      mitra.activeSubscribersCount = (mitra.activeSubscribersCount || 0) + 1;
    }
    mitra.totalCommission = (mitra.totalCommission || 0) + deal.commissionAmount;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + deal.commissionAmount;
  }

  const initialCycleLabel =
    deal.pricingType === 'monthly_subscription'
      ? 'Bulan #1'
      : deal.pricingType === 'annual_subscription'
      ? 'Tahun #1'
      : 'Deal Kontrak';

  const newCommTrx: CommissionTransaction = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${initialCycleLabel})`,
    clientName: deal.companyName,
    dealValue: deal.dealValue,
    commissionAmount: deal.commissionAmount,
    bonusAmount: 0,
    status: 'pending',
    date: todayStr,
  };
  commissions.unshift(newCommTrx);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_acc',
    operation: 'UPDATE',
    targetEntity: 'Approve Deal Klien (ACC)',
    description: `Admin menyetujui (Approve Deal) klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Komisi sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} resmi masuk ke saldo siap cair Mitra.`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: 'Deal Klien Di-Approve Admin (Komisi Masuk)',
    message: `Admin telah meng-approve deal klien "${deal.companyName}". Komisi ${deal.pricingType === 'annual_subscription' ? 'Tahun Ke-1' : deal.pricingType === 'monthly_subscription' ? 'Bulan Ke-1' : '1x Bayar (Case-by-Case)'} sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: deal.mitraId,
  };
  notifications.unshift(notif);

  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Deal Klien Di-Approve: ${deal.companyName} - Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')} Siap Dicairkan`,
      category: 'client_acc',
      previewSnippet: `Selamat! Klien rujukan Anda "${deal.companyName}" untuk paket ${deal.serviceName} telah dikonfirmasi Deal dan Di-Approve oleh Admin.\n\nKomisi sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah masuk ke saldo komisi siap cair Anda.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('commissions').insert([newCommTrx]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);

      if (mitra) {
        await supabase.from('mitras').update({
          referredClientsCount: mitra.referredClientsCount,
          activeSubscribersCount: mitra.activeSubscribersCount,
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout,
        }).eq('id', deal.mitraId);
      }
    } catch (e) {
      console.warn('Supabase client ACC update error', e);
    }
  }

  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});

// Admin Reviews & Rejects (Tidak Deal) Client -> Mitra receives Rp 0 Commission
app.put('/api/clients/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Data klien tidak ditemukan' });
  }

  if (deal.status !== 'pending_acc') {
    return res.status(400).json({ success: false, message: 'Hanya klien yang sedang ditinjau yang dapat ditolak.' });
  }

  deal.status = 'rejected';
  deal.rejectedAt = new Date().toISOString().split('T')[0];
  deal.rejectionReason = (reason && String(reason).trim()) || 'Tidak deal setelah review dan konfirmasi dengan calon klien';

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Penolakan Klien (Tidak Deal)',
    description: `Admin menolak / menyatakan Tidak Deal untuk klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Alasan: ${deal.rejectionReason}. Mitra tidak mendapatkan komisi (Rp 0).`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: 'Hasil Review Klien: Tidak Deal / Ditolak',
    message: `Pengajuan klien "${deal.companyName}" (Mitra: ${deal.mitraName}) dinyatakan Tidak Deal oleh Admin (${deal.rejectionReason}). Komisi untuk pengajuan ini adalah Rp 0.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: deal.mitraId,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase reject client error', e);
    }
  }

  res.json({
    success: true,
    message: `Klien "${deal.companyName}" ditandai Tidak Deal (Ditolak). Komisi Mitra tetap Rp 0.`,
    data: deal,
  });
});

// Admin triggers or marks subscription billing time as arrived (Waktu Pembayaran Tiba)
app.put('/api/clients/:id/trigger-billing-due', async (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status !== 'active_subscription') {
    return res.status(400).json({ success: false, message: 'Hanya langganan aktif yang memiliki jadwal tagihan.' });
  }

  deal.isBillingDue = true;
  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
    } catch (e) {
      console.warn('Supabase trigger-billing-due error', e);
    }
  }

  res.json({
    success: true,
    message: `Waktu tagihan untuk "${deal.companyName}" telah aktif. Silakan klik tombol Approve Pembayaran Langganan.`,
    data: deal,
  });
});

// Admin approves recurring billing payment for monthly or annual subscription client
app.post('/api/clients/:id/bill-cycle', async (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status === 'cancelled' || deal.status === 'rejected' || deal.status !== 'active_subscription') {
    return res.status(400).json({
      success: false,
      message: 'Langganan klien ini sudah berakhir / dihentikan. Mitra tidak lagi berhak mendapatkan komisi berulang dari klien ini.',
    });
  }

  if (deal.pricingType !== 'monthly_subscription' && deal.pricingType !== 'annual_subscription') {
    return res.status(400).json({ success: false, message: 'Hanya klien berlangganan bulanan atau tahunan yang dapat diproses tagihan siklus berulang.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let cycleLabel = '';
  if (deal.pricingType === 'monthly_subscription') {
    deal.recurringPaidMonths = (deal.recurringPaidMonths || 1) + 1;
    cycleLabel = `Bulan #${deal.recurringPaidMonths}`;
  } else {
    deal.recurringPaidYears = (deal.recurringPaidYears || 1) + 1;
    cycleLabel = `Tahun Ke-${deal.recurringPaidYears}`;
  }

  const billingDay = deal.billingDayOfMonth || Number((deal.subscriptionStartDate || deal.date || todayStr).split('-')[2]) || 1;
  const baseForNext = deal.nextBillingDate || todayStr;
  deal.lastBilledDate = todayStr;
  deal.nextBillingDate = computeNextBillingDate(baseForNext, billingDay, deal.pricingType);
  deal.isBillingDue = false;

  // Use the locked recurring rate from when the deal was made (default 10% for active subscriptions)
  // Even if Admin later changes global commission settings, existing active subscriptions keep their deal-time rate!
  const lockedRecurringRate = deal.lockedRecurringRate ?? 10;
  const recurringCommission =
    deal.recurringCommissionAmount && deal.recurringCommissionAmount > 0
      ? deal.recurringCommissionAmount
      : Math.round((deal.dealValue * lockedRecurringRate) / 100);

  deal.lockedRecurringRate = lockedRecurringRate;
  deal.recurringCommissionAmount = recurringCommission;

  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.totalCommission = (mitra.totalCommission || 0) + recurringCommission;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + recurringCommission;
  }

  const newCommTrx: CommissionTransaction = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${cycleLabel} - Komisi Berulang ${lockedRecurringRate}%)`,
    clientName: deal.companyName,
    dealValue: deal.dealValue,
    commissionAmount: recurringCommission,
    bonusAmount: 0,
    status: 'pending',
    date: todayStr,
  };
  commissions.unshift(newCommTrx);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Approve Pembayaran Langganan Klien',
    description: `Admin meng-approve pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}". Komisi berulang ${lockedRecurringRate}% sebesar Rp ${recurringCommission.toLocaleString('id-ID')} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}. Tagihan berikutnya: ${deal.nextBillingDate}.`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: `Komisi Langganan Masuk (Approve ${cycleLabel} - ${lockedRecurringRate}%)`,
    message: `Pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve Admin. Komisi berulang (${lockedRecurringRate}%) sebesar Rp ${recurringCommission.toLocaleString('id-ID')} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: deal.mitraId,
  };
  notifications.unshift(notif);

  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Komisi Langganan Masuk (${cycleLabel} - ${lockedRecurringRate}%): ${deal.companyName} - Rp ${recurringCommission.toLocaleString('id-ID')}`,
      category: 'recurring_invoice',
      previewSnippet: `Pembayaran perpanjangan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve oleh Admin.\n\nKomisi berulang Anda (${lockedRecurringRate}% sesuai kesepakatan deal) sebesar Rp ${recurringCommission.toLocaleString('id-ID')} telah ditambahkan ke dompet saldo siap cair Anda.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('commissions').insert([newCommTrx]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      if (mitra) {
        await supabase.from('mitras').update({
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout,
        }).eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase bill-cycle error', e);
    }
  }

  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});

// Admin Manages Global Per-Client Commission Scheme & Standard Bonus Target Config
// Note: Active subscriptions and closed deals keep their deal-time locked commission rate!
app.put('/api/admin/commission-scheme', async (req: Request, res: Response) => {
  const { commissionScheme, bonusTargetConfig, payoutSchedule, payoutScheduleNote } = req.body || {};

  if (commissionScheme && typeof commissionScheme === 'object') {
    appSettings.commissionScheme = {
      ...DEFAULT_COMMISSION_SCHEME,
      ...(appSettings.commissionScheme || {}),
      ...commissionScheme,
      updatedAt: new Date().toISOString(),
    };
  }

  if (bonusTargetConfig && typeof bonusTargetConfig === 'object') {
    appSettings.bonusTargetConfig = {
      ...DEFAULT_BONUS_TARGET_CONFIG,
      ...(appSettings.bonusTargetConfig || {}),
      ...bonusTargetConfig,
      updatedAt: new Date().toISOString(),
    };
  }

  if (payoutSchedule === 'awal_bulan' || payoutSchedule === 'pertengahan_bulan' || payoutSchedule === 'akhir_bulan') {
    appSettings.payoutSchedule = payoutSchedule;
  }
  if (typeof payoutScheduleNote === 'string') {
    appSettings.payoutScheduleNote = payoutScheduleNote;
  }

  // Only update pending_acc deals that haven't been locked/approved yet;
  // active_subscription and deal_closed deals strictly keep their deal-time locked rates!
  for (const deal of clientDeals) {
    if (deal.status === 'pending_acc') {
      const calc = calculateClientDealCommission(
        deal.pricingType,
        deal.dealValue,
        appSettings.commissionScheme
      );
      deal.appliedCommissionRate = calc.initialRate;
      deal.commissionAmount = calc.initialAmount;
      deal.lockedRecurringRate = calc.recurringRate;
      deal.recurringCommissionAmount = calc.recurringAmount;
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'commission_scheme_update',
    operation: 'UPDATE',
    targetEntity: 'Manajemen Skema Komisi & Target Bonus Mitra',
    description: `Admin memperbarui skema komisi per klien (Langganan: ${appSettings.commissionScheme?.subLowRate}%/${appSettings.commissionScheme?.subMidRate}%/${appSettings.commissionScheme?.subHighRate}% + Berulang ${appSettings.commissionScheme?.subRecurringRate}%, Case-by-Case: ${appSettings.commissionScheme?.caseLowRate}%/${appSettings.commissionScheme?.caseMidRate}%/${appSettings.commissionScheme?.caseHighRate}%) serta Target Bonus (${appSettings.bonusTargetConfig?.periodType === 'yearly' ? 'Tahunan' : 'Bulanan'}). Klien yang sudah aktif langganan tetap menggunakan tarif komisi saat waktu deal.`,
  });

  saveDatabase();
  await persistSettingsToSupabase();

  res.json({
    success: true,
    message:
      'Skema komisi per klien dan pengaturan target bonus berhasil disimpan. Klien yang sudah berstatus langganan aktif tetap memperoleh komisi sesuai kesepakatan waktu deal.',
    data: {
      commissionScheme: appSettings.commissionScheme,
      bonusTargetConfig: appSettings.bonusTargetConfig,
    },
  });
});

// Admin Updates/Overrides Specific Client Deal Commission Rate
app.put('/api/admin/clients/:id/commission', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { appliedCommissionRate, lockedRecurringRate, dealValue } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Data klien tidak ditemukan.' });
  }

  if (dealValue !== undefined && Number(dealValue) > 0) {
    deal.dealValue = Number(dealValue);
  }

  if (appliedCommissionRate !== undefined && Number(appliedCommissionRate) >= 0) {
    deal.appliedCommissionRate = Number(appliedCommissionRate);
    deal.commissionAmount = Math.round((deal.dealValue * deal.appliedCommissionRate) / 100);
  }

  if (
    (deal.pricingType === 'monthly_subscription' || deal.pricingType === 'annual_subscription') &&
    lockedRecurringRate !== undefined &&
    Number(lockedRecurringRate) >= 0
  ) {
    deal.lockedRecurringRate = Number(lockedRecurringRate);
    deal.recurringCommissionAmount = Math.round((deal.dealValue * deal.lockedRecurringRate) / 100);
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Penyesuaian Komisi Klien',
    description: `Admin menyesuaikan komisi deal klien "${deal.companyName}" (Mitra: ${deal.mitraName}) menjadi ${deal.appliedCommissionRate}% (Rp ${deal.commissionAmount.toLocaleString('id-ID')})${deal.pricingType !== 'case_by_case' ? ` & Komisi Berulang ${deal.lockedRecurringRate}% (Rp ${(deal.recurringCommissionAmount || 0).toLocaleString('id-ID')})` : ''}.`,
  });

  saveDatabase();
  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
    } catch {}
  }

  res.json({
    success: true,
    message: `Komisi untuk klien "${deal.companyName}" berhasil diperbarui.`,
    data: deal,
  });
});

// Admin Grants Target / Performance Bonus to Mitra
app.post('/api/admin/mitra/:id/bonus', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bonusAmount, title, periodLabel, notes } = req.body || {};
  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Data mitra tidak ditemukan.' });
  }

  const amountNum = Math.round(Number(bonusAmount) || 0);
  if (amountNum <= 0) {
    return res.status(400).json({ success: false, message: 'Nominal bonus wajib lebih dari Rp 0.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const bonusTitle = (title || 'Bonus Pencapaian Target Standar Mitra').trim();
  const periodStr = (periodLabel || (appSettings.bonusTargetConfig?.periodType === 'yearly' ? 'Target Tahunan' : 'Target Bulanan')).trim();

  mitra.totalBonus = (mitra.totalBonus || 0) + amountNum;
  mitra.totalCommission = (mitra.totalCommission || 0) + amountNum;
  mitra.pendingPayout = (mitra.pendingPayout || 0) + amountNum;

  const bonusTrx: CommissionTransaction = {
    id: `trx-bonus-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    serviceName: `🏆 ${bonusTitle} (${periodStr})`,
    clientName: notes ? `Apresiasi Mitra: ${String(notes).trim()}` : 'Pencapaian Target Standar NDTAXANDLAW',
    dealValue: 0,
    commissionAmount: 0,
    bonusAmount: amountNum,
    status: 'pending',
    date: todayStr,
  };
  commissions.unshift(bonusTrx);

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'bonus_grant',
    operation: 'CREATE',
    targetEntity: 'Pemberian Bonus Mitra',
    description: `Admin memberikan bonus prestasi "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString('id-ID')} kepada Mitra ${mitra.fullName}. Saldo bonus otomatis masuk ke saldo siap cair Mitra.`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: `Selamat! Bonus Mitra Masuk: Rp ${amountNum.toLocaleString('id-ID')}`,
    message: `Admin telah memberikan "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString('id-ID')} kepada Mitra ${mitra.fullName}. Dana bonus telah masuk ke saldo siap cair Anda.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: mitra.id,
  };
  notifications.unshift(notif);

  if (mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Selamat! Anda Menerima Bonus Prestasi Mitra Rp ${amountNum.toLocaleString('id-ID')} - NDTAXANDLAW`,
      category: 'client_acc',
      previewSnippet: `Halo ${mitra.fullName},\n\nSelamat atas pencapaian performa Anda! Admin NDTAXANDLAW telah memberikan "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString('id-ID')}.${notes ? `\n\nCatatan Apresiasi: ${notes}` : ''}\n\nDana bonus telah ditambahkan langsung ke dompet saldo siap cair Anda.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('commissions').insert([bonusTrx]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      await supabase
        .from('mitras')
        .update({
          totalBonus: mitra.totalBonus,
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout,
        })
        .eq('id', mitra.id);
    } catch (e) {
      console.warn('Supabase bonus grant update error', e);
    }
  }

  res.status(201).json({
    success: true,
    message: `Bonus sebesar Rp ${amountNum.toLocaleString('id-ID')} berhasil diberikan kepada ${mitra.fullName} dan masuk ke saldo siap cair.`,
    data: { mitra, bonusTransaction: bonusTrx },
  });
});

// Admin terminates client subscription -> automatically stops recurring commission for Mitra
app.put('/api/clients/:id/terminate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Langganan klien ini sudah dihentikan sebelumnya.' });
  }

  const wasActiveSubscriber = deal.status === 'active_subscription';
  deal.status = 'cancelled';
  deal.terminatedAt = new Date().toISOString().split('T')[0];
  deal.terminationReason = (reason && String(reason).trim()) || 'Klien berhenti berlangganan layanan';

  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra && wasActiveSubscriber) {
    mitra.activeSubscribersCount = Math.max(0, (mitra.activeSubscribersCount || 1) - 1);
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Pemutusan Langganan Klien',
    description: `Admin memutuskan langganan klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Alasan: ${deal.terminationReason}. Komisi berulang otomatis dihentikan karena langganan telah berakhir.`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: 'Langganan Klien Berakhir / Diputus',
    message: `Klien "${deal.companyName}" (${deal.serviceName}) telah berhenti berlangganan per ${deal.terminatedAt}. Komisi berulang untuk Mitra ${deal.mitraName} otomatis dihentikan.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: deal.mitraId,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);

      if (mitra) {
        await supabase.from('mitras').update({
          activeSubscribersCount: mitra.activeSubscribersCount,
        }).eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase terminate client subscription error', e);
    }
  }

  res.json({
    success: true,
    message: `Langganan klien "${deal.companyName}" berhasil diputus. Mitra ${deal.mitraName} otomatis tidak akan mendapatkan komisi lagi dari klien ini.`,
    data: deal,
  });
});

app.put('/api/clients/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, recurringPaidMonths, recurringPaidYears } = req.body;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  const prevStatus = deal.status;
  if (status) deal.status = status;
  if (recurringPaidMonths !== undefined) deal.recurringPaidMonths = recurringPaidMonths;
  if (recurringPaidYears !== undefined) deal.recurringPaidYears = recurringPaidYears;

  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    if (prevStatus === 'active_subscription' && status === 'cancelled') {
      mitra.activeSubscribersCount = Math.max(0, (mitra.activeSubscribersCount || 1) - 1);
      deal.terminatedAt = new Date().toISOString().split('T')[0];
    } else if (prevStatus === 'cancelled' && status === 'active_subscription') {
      mitra.activeSubscribersCount = (mitra.activeSubscribersCount || 0) + 1;
      deal.terminatedAt = undefined;
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Status Deal Klien',
    description: `Admin memperbarui status deal klien "${deal.companyName}" menjadi "${deal.status}".`,
  });

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      if (mitra) {
        await supabase.from('mitras').update({
          activeSubscribersCount: mitra.activeSubscribersCount,
        }).eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase update client status error', e);
    }
  }

  res.json({ success: true, data: deal });
});

// ========================================================
// 3.7 PAYOUT REQUESTS MANAGEMENT ENDPOINTS
// ========================================================
app.get('/api/commissions/payout-requests', async (req: Request, res: Response) => {
  const { mitraId } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('payout_requests').select('*');
      if (!error && Array.isArray(data)) {
        payoutRequests = data;
        saveDatabase();
      }
    } catch (e) {
      console.warn('Supabase payout_requests query error', e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  }

  if (mitraId) {
    return res.json({ success: true, data: payoutRequests.filter((p) => p.mitraId === mitraId) });
  }
  return res.json({ success: true, data: payoutRequests });
});

app.put('/api/commissions/payout-requests/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    pph21Deduction,
    pph21Rate,
    adminFeeDeduction,
    netAmountTransferred,
    proofFileUrl,
    proofFileName,
    transferRefNumber,
    notes,
  } = req.body;

  const payout = payoutRequests.find((p) => p.id === id);

  if (!payout) {
    return res.status(404).json({ success: false, message: 'Pengajuan pencairan tidak ditemukan' });
  }

  if (payout.status === 'approved') {
    return res.status(400).json({ success: false, message: 'Pengajuan pencairan ini sudah disetujui dan diselesaikan sebelumnya.' });
  }

  payout.status = 'approved';
  payout.processedDate = new Date().toISOString().split('T')[0];

  const pphVal = pph21Deduction !== undefined && pph21Deduction !== '' ? Math.max(0, Number(pph21Deduction)) : 0;
  const pphPercent = pph21Rate !== undefined && pph21Rate !== '' ? Number(pph21Rate) : (pphVal > 0 ? Number(((pphVal / payout.amount) * 100).toFixed(1)) : 0);
  const adminFeeVal = adminFeeDeduction !== undefined && adminFeeDeduction !== '' ? Math.max(0, Number(adminFeeDeduction)) : 0;
  const calculatedNet = Math.max(0, payout.amount - pphVal - adminFeeVal);

  payout.pph21Deduction = pphVal;
  payout.pph21Rate = pphPercent;
  payout.adminFeeDeduction = adminFeeVal;
  payout.netAmountTransferred = netAmountTransferred !== undefined && netAmountTransferred !== '' ? Number(netAmountTransferred) : calculatedNet;

  if (proofFileUrl) payout.proofFileUrl = proofFileUrl;
  if (proofFileName) payout.proofFileName = proofFileName;
  payout.transferRefNumber = transferRefNumber || `TRX-ND-${Date.now().toString().slice(-8)}`;
  payout.disbursedBy = 'Admin Operasional NDTAXANDLAW';
  if (notes) payout.notes = notes;

  const mitra = mitras.find((m) => m.id === payout.mitraId);
  if (mitra) {
    mitra.pendingPayout = Math.max(0, (mitra.pendingPayout || 0) - payout.amount);
    mitra.paidPayout = (mitra.paidPayout || 0) + payout.amount;
  }

  let remainingToMarkPaid = payout.amount;
  const paidCommissionIds: string[] = [];
  for (const c of commissions) {
    if (c.mitraId === payout.mitraId && c.status !== 'paid' && remainingToMarkPaid > 0) {
      c.status = 'paid';
      remainingToMarkPaid -= c.commissionAmount;
      paidCommissionIds.push(c.id);
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'payout_approve',
    operation: 'UPDATE',
    targetEntity: 'Pembayaran Komisi Mitra',
    description: `Admin menyetujui & mentransfer pembayaran komisi Mitra "${payout.mitraName}" sebesar Bersih Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')} (Kotor: Rp ${payout.amount.toLocaleString('id-ID')}, PPh21: Rp ${pphVal.toLocaleString('id-ID')}) ke ${payout.bankDetails.bankName} ${payout.bankDetails.accountNumber} (Ref: #${payout.transferRefNumber}).`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${payout.mitraId}-${Date.now()}`,
    title: 'Pencairan Komisi Telah Ditransfer',
    message: `Dana komisi kotor Rp ${payout.amount.toLocaleString('id-ID')} (Net Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')}) untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) dengan Ref #${payout.transferRefNumber}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: payout.mitraId,
  };
  notifications.unshift(notif);

  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: payout.mitraName,
      subject: `Pencairan Komisi Berhasil Diproses: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')} ke ${payout.bankDetails.bankName}`,
      category: 'payout_disbursed',
      previewSnippet: `Pencairan dana komisi kemitraan Anda telah disetujui & ditransfer via ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) a.n ${payout.bankDetails.accountHolder}.\n\nJumlah Kotor: Rp ${payout.amount.toLocaleString('id-ID')}\nPotongan PPh 21 (${payout.pph21Rate || 2.5}%): Rp ${(payout.pph21Deduction || 0).toLocaleString('id-ID')}\nBiaya Admin: Rp ${(payout.adminFeeDeduction || 0).toLocaleString('id-ID')}\nTotal Bersih Ditransfer: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')}\nNo. Referensi: #${payout.transferRefNumber}`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('payout_requests').upsert([payout]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      if (mitra) {
        await supabase.from('mitras').update({
          pendingPayout: mitra.pendingPayout,
          paidPayout: mitra.paidPayout,
        }).eq('id', payout.mitraId);
      }
      for (const commId of paidCommissionIds) {
        await supabase.from('commissions').update({ status: 'paid' }).eq('id', commId);
      }
    } catch (e) {
      console.warn('Supabase payout approve error', e);
    }
  }

  res.json({ success: true, data: payout });
});

// Direct Admin Commission Disbursement (Admin directly disburses commission to Mitra without waiting for Mitra request)
app.post('/api/commissions/direct-disburse', async (req: Request, res: Response) => {
  const {
    mitraId,
    amount,
    pph21Deduction,
    pph21Rate,
    adminFeeDeduction,
    netAmountTransferred,
    proofFileUrl,
    proofFileName,
    transferRefNumber,
    notes,
  } = req.body || {};

  const mitra = mitras.find((m) => m.id === mitraId);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Data Mitra tidak ditemukan.' });
  }

  const grossAmount = Math.max(0, Number(amount) || Number(mitra.pendingPayout) || 0);
  if (grossAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Mitra belum memiliki saldo komisi siap cair.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const pphVal = pph21Deduction !== undefined && pph21Deduction !== '' ? Math.max(0, Number(pph21Deduction)) : 0;
  const pphPercent =
    pph21Rate !== undefined && pph21Rate !== ''
      ? Number(pph21Rate)
      : pphVal > 0
        ? Number(((pphVal / grossAmount) * 100).toFixed(1))
        : 0;
  const adminFeeVal =
    adminFeeDeduction !== undefined && adminFeeDeduction !== '' ? Math.max(0, Number(adminFeeDeduction)) : 0;
  const calculatedNet = Math.max(0, grossAmount - pphVal - adminFeeVal);
  const finalNet =
    netAmountTransferred !== undefined && netAmountTransferred !== ''
      ? Number(netAmountTransferred)
      : calculatedNet;

  const newPayout: PayoutRequest = {
    id: `pay-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    memberCode: mitra.memberCode,
    amount: grossAmount,
    bankDetails: mitra.bankDetails || {
      bankName: '-',
      accountNumber: '-',
      accountHolder: mitra.fullName,
    },
    requestDate: todayStr,
    processedDate: todayStr,
    status: 'approved',
    pph21Deduction: pphVal,
    pph21Rate: pphPercent,
    adminFeeDeduction: adminFeeVal,
    netAmountTransferred: finalNet,
    proofFileUrl: proofFileUrl || undefined,
    proofFileName: proofFileName || undefined,
    transferRefNumber: transferRefNumber || `TRX-ND-${Date.now().toString().slice(-8)}`,
    disbursedBy: 'Admin Operasional NDTAXANDLAW',
    notes: notes || `Pencairan komisi terjadwal oleh Admin ke rekening ${mitra.fullName}.`,
  };

  payoutRequests.unshift(newPayout);

  // Also resolve any existing pending payout requests for this mitra up to grossAmount
  const updatedPendingPayIds: PayoutRequest[] = [];
  for (const p of payoutRequests) {
    if (p.id !== newPayout.id && p.mitraId === mitra.id && p.status === 'pending') {
      p.status = 'approved';
      p.processedDate = todayStr;
      p.transferRefNumber = newPayout.transferRefNumber;
      p.disbursedBy = newPayout.disbursedBy;
      updatedPendingPayIds.push(p);
    }
  }

  mitra.pendingPayout = Math.max(0, (mitra.pendingPayout || 0) - grossAmount);
  mitra.paidPayout = (mitra.paidPayout || 0) + grossAmount;

  let remainingToMarkPaid = grossAmount;
  const paidCommissionIds: string[] = [];
  for (const c of commissions) {
    if (c.mitraId === mitra.id && c.status !== 'paid' && remainingToMarkPaid > 0) {
      c.status = 'paid';
      remainingToMarkPaid -= c.commissionAmount;
      paidCommissionIds.push(c.id);
    }
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'payout_approve',
    operation: 'CREATE',
    targetEntity: 'Pencairan Komisi Langsung oleh Admin',
    description: `Admin mencairkan & mentransfer komisi Mitra "${mitra.fullName}" sebesar Bersih Rp ${finalNet.toLocaleString('id-ID')} (Kotor: Rp ${grossAmount.toLocaleString('id-ID')}, PPh21: Rp ${pphVal.toLocaleString('id-ID')}) ke ${newPayout.bankDetails.bankName} ${newPayout.bankDetails.accountNumber} (Ref: #${newPayout.transferRefNumber}).`,
  });

  const notif: NotificationItem = {
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: 'Komisi Anda Telah Dicairkan Admin',
    message: `Dana komisi kotor Rp ${grossAmount.toLocaleString('id-ID')} (Bersih Diterima Rp ${finalNet.toLocaleString('id-ID')}) untuk ${mitra.fullName} telah dicairkan oleh Admin ke rekening ${newPayout.bankDetails.bankName} (${newPayout.bankDetails.accountNumber}) dengan Ref #${newPayout.transferRefNumber}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'mitra',
    mitraId: mitra.id,
  };
  notifications.unshift(notif);

  if (mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Pencairan Komisi Resmi NDTAXANDLAW: Rp ${finalNet.toLocaleString('id-ID')} ke ${newPayout.bankDetails.bankName}`,
      category: 'payout_disbursed',
      previewSnippet: `Dana komisi kemitraan Anda telah dicairkan secara terjadwal oleh Admin via ${newPayout.bankDetails.bankName} (${newPayout.bankDetails.accountNumber}) a.n ${newPayout.bankDetails.accountHolder}.\n\nJumlah Kotor: Rp ${grossAmount.toLocaleString('id-ID')}\nPotongan PPh 21 (${pphPercent}%): Rp ${pphVal.toLocaleString('id-ID')}\nBiaya Admin: Rp ${adminFeeVal.toLocaleString('id-ID')}\nTotal Bersih Ditransfer: Rp ${finalNet.toLocaleString('id-ID')}\nNo. Referensi: #${newPayout.transferRefNumber}`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('payout_requests').upsert([newPayout, ...updatedPendingPayIds]);
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
      await supabase
        .from('mitras')
        .update({
          pendingPayout: mitra.pendingPayout,
          paidPayout: mitra.paidPayout,
        })
        .eq('id', mitra.id);
      for (const commId of paidCommissionIds) {
        await supabase.from('commissions').update({ status: 'paid' }).eq('id', commId);
      }
    } catch (e) {
      console.warn('Supabase direct disburse error', e);
    }
  }

  return res.json({ success: true, data: newPayout });
});

// ========================================================
// 3.8 APPLICATION SETTINGS & LOGS ENDPOINTS
// ========================================================
app.get('/api/settings', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data: pwRows, error: errPw } = await supabase
        .from('user_passwords')
        .select('*')
        .in('email', ['__sys_config__@ndtaxlaw.internal', '__sys_roles__@ndtaxlaw.internal']);
      if (!errPw && Array.isArray(pwRows)) {
        for (const row of pwRows) {
          if (row.email === '__sys_config__@ndtaxlaw.internal' && row.password) {
            try {
              const parsed = JSON.parse(row.password);
              const { roles: storedRoles, ...restSettings } = parsed;
              appSettings = { ...appSettings, ...restSettings };
              if (Array.isArray(storedRoles) && storedRoles.length > 0) {
                systemRoles = storedRoles;
              }
            } catch {}
          } else if (row.email === '__sys_roles__@ndtaxlaw.internal' && row.password) {
            try {
              const parsedRoles = JSON.parse(row.password);
              if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
                systemRoles = parsedRoles;
              }
            } catch {}
          }
        }
      }

      const { data: settingsData, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'config_primary')
        .maybeSingle();
      if (!error && settingsData && settingsData.settings) {
        const { roles: storedRoles, ...restSettings } = settingsData.settings;
        appSettings = { ...appSettings, ...restSettings };
        if (Array.isArray(storedRoles) && storedRoles.length > 0) {
          systemRoles = storedRoles;
        }
      }
    } catch (e) {
      console.warn('Supabase settings query error', e);
    }
  }
  if (!appSettings.mitraFieldsInitialized) {
    const existingMitra = Array.isArray(appSettings.mitraCustomFields) ? appSettings.mitraCustomFields : [];
    const hasDef = existingMitra.some((f) => Boolean(f.systemKey || f.isDefault));
    if (!hasDef) {
      appSettings.mitraCustomFields = [...DEFAULT_MITRA_FORM_FIELDS, ...existingMitra];
    }
    appSettings.mitraFieldsInitialized = true;
  }
  if (!appSettings.clientFieldsInitialized) {
    const existingClient = Array.isArray(appSettings.clientCustomFields) ? appSettings.clientCustomFields : [];
    const hasDef = existingClient.some((f) => Boolean(f.systemKey || f.isDefault));
    if (!hasDef) {
      appSettings.clientCustomFields = [...DEFAULT_CLIENT_FORM_FIELDS, ...existingClient];
    }
    appSettings.clientFieldsInitialized = true;
  }
  appSettings.specializationOptions = normalizeSpecializationOptions(appSettings.specializationOptions);
  const clientSafeSettings: AppSettings = {
    ...appSettings,
    smtpPassword: appSettings.smtpPassword ? '••••••••••••••••' : '',
  };
  res.json({ success: true, data: clientSafeSettings, roles: systemRoles });
});

app.put('/api/settings', async (req: Request, res: Response) => {
  const updates = { ...(req.body || {}) };
  if (updates.smtpPassword === '••••••••••••••••') {
    delete updates.smtpPassword;
  }
  const previousEnv = appSettings.appEnvironment;
  appSettings = { ...appSettings, ...updates };

  // Jika beralih ke mode production, langsung sinkronkan penuh dari Supabase (tanpa dummy lokal)
  if (previousEnv !== 'production' && appSettings.appEnvironment === 'production' && supabase) {
    await syncFromSupabase();
    appSettings = { ...appSettings, ...updates };
  }

  recordActivity({
    actorRole: 'admin',
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: 'settings_update',
    operation: 'UPDATE',
    targetEntity: 'Pengaturan Sistem & SMTP',
    description: `Admin memperbarui konfigurasi sistem (SMTP: ${appSettings.smtpHost}:${appSettings.smtpPort}, Mode: ${appSettings.appEnvironment}).`,
  });

  const notif: NotificationItem = {
    id: `notif-sys-${Date.now()}`,
    title: 'Pengaturan Sistem Diperbarui',
    message: 'Konfigurasi profil layanan, server SMTP email & notifikasi otomatis, OAuth Google, dan integrasi sistem telah diperbarui oleh Admin.',
    type: 'system_update',
    timestamp: new Date().toISOString(),
    isRead: false,
    targetAudience: 'admin_only',
  };
  notifications.unshift(notif);

  saveDatabase();
  await persistSettingsToSupabase();

  if (supabase) {
    try {
      await supabase.from('notifications').insert([toSupabaseNotification(notif)]);
    } catch (e) {
      console.warn('Supabase notification insert error', e);
    }
  }

  const clientSafeSettings: AppSettings = {
    ...appSettings,
    smtpPassword: appSettings.smtpPassword ? '••••••••••••••••' : '',
  };
  res.json({ success: true, data: clientSafeSettings });
});

// 3.9 SMTP Email Server & Dispatch Log Endpoints
app.post('/api/settings/test-email', async (req: Request, res: Response) => {
  const { targetEmail, smtpConfig } = req.body;
  const emailToTest = (targetEmail || appSettings.supportEmail || 'admin@ndtaxandlaw.com').trim();

  if (!emailToTest || !emailToTest.includes('@')) {
    return res.status(400).json({ success: false, message: 'Alamat email tujuan tidak valid.' });
  }

  // If frontend sent unsaved smtpConfig fields during test, apply them first
  if (smtpConfig && typeof smtpConfig === 'object') {
    appSettings = { ...appSettings, ...smtpConfig };
    saveDatabase();
    await persistSettingsToSupabase();
  }

  if (!appSettings.smtpEnabled) {
    return res.status(400).json({
      success: false,
      message: 'Server SMTP saat ini dinonaktifkan. Aktifkan switch SMTP terlebih dahulu sebelum mengirim tes email.',
    });
  }

  const result = await sendSystemEmail({
    recipient: emailToTest,
    recipientName: 'Administrator Sistem NDTAXANDLAW',
    subject: `[TEST] Uji Coba Koneksi Server SMTP NDTAXANDLAW (${appSettings.smtpHost})`,
    category: 'test_email',
    previewSnippet: `Konfigurasi server SMTP (${appSettings.smtpHost}:${appSettings.smtpPort} - ${appSettings.smtpEncryption.toUpperCase()}) dari pengirim ${appSettings.smtpSenderName} <${appSettings.smtpSenderEmail || appSettings.smtpUser}> telah berhasil terhubung secara riil dan siap digunakan untuk mengirim kode verifikasi akun, info pencairan komisi, serta ACC klien.`,
  });

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.message,
      data: result,
    });
  }

  res.json({
    success: true,
    message: result.message,
    data: result,
  });
});

app.get('/api/emails/logs', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await supabase.from('email_logs').delete().lt('timestamp', cutoffIso);

      const [{ data: tableLogs, error: errTable }, { data: kvRow, error: errKv }] = await Promise.all([
        supabase.from('email_logs').select('*').order('timestamp', { ascending: false }).limit(300),
        supabase
          .from('user_passwords')
          .select('*')
          .eq('email', '__sys_email_logs__@ndtaxlaw.internal')
          .maybeSingle(),
      ]);

      const fromTable: EmailLogItem[] =
        !errTable && Array.isArray(tableLogs) ? tableLogs.map(fromSupabaseEmailLogRow) : [];
      let fromKv: EmailLogItem[] = [];
      if (!errKv && kvRow && kvRow.password) {
        try {
          const parsed = JSON.parse(kvRow.password);
          if (Array.isArray(parsed)) fromKv = parsed;
        } catch {}
      }

      const mergedMap = new Map<string, EmailLogItem>();
      for (const item of [...fromTable, ...fromKv, ...emailLogs]) {
        if (item && item.id && !mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      }

      emailLogs = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
      );
      await pruneOldLogs(false);
      saveDatabase();

      // Ensure public.email_logs table has all merged logs
      if (emailLogs.length > fromTable.length) {
        try {
          await supabase.from('email_logs').upsert(emailLogs.slice(0, 100).map(toSupabaseEmailLogRow));
        } catch {}
      }

      return res.json({ success: true, data: emailLogs });
    } catch (e) {
      console.warn('Supabase email logs query error', e);
    }
  }
  await pruneOldLogs(false);
  res.json({ success: true, data: emailLogs });
});

app.post('/api/emails/resend/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const existingLog = emailLogs.find((l) => l.id === id);
  if (!existingLog) {
    return res.status(404).json({ success: false, message: 'Catatan email tidak ditemukan.' });
  }

  const resendResult = await sendSystemEmail({
    recipient: existingLog.recipient,
    recipientName: existingLog.recipientName,
    subject: existingLog.subject.startsWith('[KIRIM ULANG]') ? existingLog.subject : `[KIRIM ULANG] ${existingLog.subject}`,
    category: existingLog.category,
    previewSnippet: existingLog.previewSnippet,
  });

  if (!resendResult.success) {
    return res.status(500).json({
      success: false,
      message: resendResult.message,
      data: resendResult,
    });
  }

  res.json({ success: true, message: `Email berhasil dikirim ulang ke ${existingLog.recipient}`, data: resendResult });
});

app.delete('/api/emails/logs', async (req: Request, res: Response) => {
  emailLogs = [];
  saveDatabase();
  await persistEmailLogsToSupabase();
  if (supabase) {
    try {
      await supabase.from('email_logs').delete().neq('id', '');
    } catch {}
  }
  res.json({ success: true, message: 'Riwayat log pengiriman email berhasil dibersihkan dari lokal dan Supabase.' });
});

// 3.10 Activity Logs Endpoints (Admin & Mitra Audit Trail)
app.get('/api/activity-logs', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await supabase.from('activity_logs').delete().lt('timestamp', cutoffIso);

      const { data: tableLogs, error: errTable } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (!errTable && Array.isArray(tableLogs) && tableLogs.length > 0) {
        activityLogs = tableLogs;
        await pruneOldLogs(false);
        saveDatabase();
        return res.json({ success: true, data: activityLogs });
      }
      const { data: kvRow, error: errKv } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('email', '__sys_activity_logs__@ndtaxlaw.internal')
        .maybeSingle();
      if (!errKv && kvRow && kvRow.password) {
        const parsed = JSON.parse(kvRow.password);
        if (Array.isArray(parsed)) {
          activityLogs = parsed;
          await pruneOldLogs(false);
          saveDatabase();
        }
      }
    } catch (e) {
      console.warn('Supabase activity logs query error', e);
    }
  }
  await pruneOldLogs(false);
  res.json({ success: true, data: activityLogs });
});

app.delete('/api/activity-logs', async (req: Request, res: Response) => {
  activityLogs = [];
  saveDatabase();
  await persistActivityLogsToSupabase();
  if (supabase) {
    try {
      await supabase.from('activity_logs').delete().neq('id', '');
    } catch {}
  }
  res.json({ success: true, message: 'Riwayat log aktivitas berhasil dibersihkan dari lokal dan Supabase.' });
});

// ========================================================
// 4. NOTIFICATIONS ENDPOINTS
// ========================================================
app.get('/api/notifications', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
      if (!error && Array.isArray(data)) {
        notifications = data;
        saveDatabase();
        return res.json({ success: true, data: notifications });
      }
    } catch (e) {
      console.warn('Supabase notifications query error', e);
    }
  }
  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
  }
  res.json({ success: true, data: notifications });
});

app.post('/api/notifications/read-all', async (req: Request, res: Response) => {
  const targetIds: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    notifications = notifications.map((n) => (idSet.has(n.id) ? { ...n, isRead: true } : n));
    if (supabase) {
      try {
        await supabase.from('notifications').update({ isRead: true }).in('id', targetIds);
      } catch (e) {
        console.warn('Supabase mark read notifications error', e);
      }
    }
  } else {
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
    if (supabase) {
      try {
        await supabase.from('notifications').update({ isRead: true }).neq('isRead', true);
      } catch (e) {
        console.warn('Supabase mark read notifications error', e);
      }
    }
  }
  saveDatabase();
  res.json({ success: true, data: notifications });
});

app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  notifications = notifications.filter((n) => n.id !== id);
  if (supabase) {
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete notification error', e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: notifications });
});

app.post('/api/notifications/delete-batch', async (req: Request, res: Response) => {
  const targetIds: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    notifications = notifications.filter((n) => !idSet.has(n.id));
    if (supabase) {
      try {
        await supabase.from('notifications').delete().in('id', targetIds);
      } catch (e) {
        console.warn('Supabase batch delete notifications error', e);
      }
    }
    saveDatabase();
  }
  res.json({ success: true, data: notifications });
});

// ========================================================
// 5. ANALYTICS & AI ENDPOINTS
// ========================================================
app.get('/api/analytics/monthly', async (req: Request, res: Response) => {
  if (supabase) {
    await syncFromSupabase();
  }
  const activeDeals = clientDeals.filter((d) => d.status === 'active_subscription' || d.status === 'deal_closed');
  const totalSalesFromDeals = activeDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const totalPaidCommissions = mitras.reduce((sum, m) => sum + (Number(m.paidPayout) || 0) + (Number(m.pendingPayout) || 0), 0);
  const verifiedMitraCount = mitras.filter((m) => m.status === 'verified').length;
  const avgTicket = activeDeals.length > 0 ? Math.round(totalSalesFromDeals / activeDeals.length) : 0;
  const dynamicHistory = computeDynamicSalesHistory();

  res.json({
    success: true,
    data: {
      salesHistory: dynamicHistory,
      summary: {
        currentMonthSales: totalSalesFromDeals,
        currentMonthDeals: activeDeals.length,
        activeMitraCount: verifiedMitraCount,
        totalCommissionsPaid: totalPaidCommissions,
        averageDealTicket: avgTicket,
      },
    },
  });
});

app.post('/api/ai/monthly-report', async (req: Request, res: Response) => {
  try {
    if (!appSettings.geminiApiEnabled) {
      return res.json({
        success: false,
        message: 'Modul Analisis Gemini AI dinonaktifkan di Pengaturan Sistem oleh Admin.',
        disabled: true,
      });
    }

    const { targetPeriod = 'November 2026', userRole = 'admin', specificMitraId } = req.body;

    const targetMitra = specificMitraId ? mitras.find((m) => m.id === specificMitraId) : null;
    const verifiedMitrasCount = mitras.filter((m) => m.status === 'verified').length;
    const pendingCount = mitras.filter((m) => m.status === 'pending').length;
    const dynamicHistory = computeDynamicSalesHistory();

    const promptContext = `
Anda adalah Chief Executive Analyst & Tax-Legal Strategy Director di firma NDTAXANDLAW.
Buat laporan evaluasi kinerja bulanan mendalam, ringkas, profesional, dan berdampak tinggi.

Data Operasional NDTAXANDLAW Saat Ini:
- Periode Evaluasi: ${targetPeriod}
- Jumlah Total Mitra Terverifikasi: ${verifiedMitrasCount} Mitra
- Calon Mitra Menunggu Verifikasi: ${pendingCount} Mitra
- Riwayat Penjualan 6 Bulan Terakhir:
${JSON.stringify(dynamicHistory, null, 2)}
- Transaksi Terakhir Layanan Pajak & Legalitas:
${JSON.stringify(commissions.slice(0, 4), null, 2)}
${targetMitra ? `- Evaluasi Spesifik Mitra: ${targetMitra.fullName} (${targetMitra.memberCode}), Total Komisi: Rp ${targetMitra.totalCommission.toLocaleString('id-ID')}` : ''}

Tugas:
Hasilkan laporan eksekutif terstruktur dengan format Markdown yang rapi:
1. **Executive Performance Summary**: Ringkasan performa penjualan dan pertumbuhan mitra.
2. **Analisis Tren Penjualan & Produk Terlaris**: Evaluasi tren pendapatan, perbandingan bulan lalu ke bulan ini, dan segmen layanan terkuat (Pajak Korporasi vs Pendirian Legalitas).
3. **Evaluasi Produktivitas Mitra**: Analisis perolehan komisi dan rasio closing transaksi mitra.
4. **Rekomendasi Strategis 30 Hari Kedepan**: 3-4 rekomendasi taktis bagi manajemen operasional dan mitra lapangan untuk melipatgandakan omset dan ekspansi klien.

Gunakan bahasa Indonesia formal, berwibawa, analitis, dan berorientasi hasil. Sertakan angka-angka data pendukung secara presisi.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
    });

    const aiReportText = response.text || 'Gagal menghasilkan teks analisis.';

    res.json({
      success: true,
      report: aiReportText,
      generatedAt: new Date().toISOString(),
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    const activeDealsCount = clientDeals.filter((d) => d.status === 'active_subscription' || d.status === 'deal_closed').length;
    const activeDealsValue = clientDeals
      .filter((d) => d.status === 'active_subscription' || d.status === 'deal_closed')
      .reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    const totalMitraCommissions = mitras.reduce((sum, m) => sum + (Number(m.totalCommission) || 0), 0);

    const fallbackReport = `### Executive Performance Summary - NDTAXANDLAW (November 2026)

Berdasarkan konsolidasi metrik operasional NDTAXANDLAW dari database Supabase pada periode **November 2026**, performa kemitraan mencatat total transaksi aktif mencapai **Rp ${activeDealsValue.toLocaleString('id-ID')}** dari **${activeDealsCount} kontrak aktif** dan **${mitras.length} mitra terdaftar**.

#### 1. Analisis Tren Penjualan & Pertumbuhan Mitra
- **Jaringan Mitra Terdaftar**: Terdapat ${mitras.filter((m) => m.status === 'verified').length} mitra terverifikasi dan ${mitras.filter((m) => m.status === 'pending').length} calon mitra yang sedang dalam tahap verifikasi.
- **Layanan Unggulan**: Portofolio layanan perpajakan korporasi, pembukuan, dan kepatuhan SPT tetap menjadi pendorong utama komisi mitra.

#### 2. Evaluasi Distribusi Komisi & Likuiditas Mitra
- Total akumulasi komisi mitra tercatat sebesar **Rp ${totalMitraCommissions.toLocaleString('id-ID')}**.

#### 3. Rekomendasi Aksi Strategis 30 Hari Kedepan
1. **Intensifikasi Kampanye Akhir Tahun (Tax Year-End Closing)**: Distribusikan materi tools marketing bertema persiapan SPT Tahunan Badan dan review risiko SP2DK melalui katalog digital.
2. **Percepatan Verifikasi Mitra & Review Klien**: Tuntaskan proses review klien berstatus *Sedang Ditinjau Admin* dalam tempo 1x24 jam.`;

    res.json({
      success: true,
      report: fallbackReport,
      isFallback: true,
      generatedAt: new Date().toISOString(),
      note: 'Menggunakan analisis cerdas berbasis data riil database Supabase NDTAXANDLAW.',
    });
  }
});

// 7. Supabase Database Diagnostics & One-Click Cloud Sync
app.get('/api/system/supabase-status', async (req: Request, res: Response) => {
  const config = getSupabaseConfig();
  const test = await testSupabaseConnection();
  res.json({
    success: true,
    data: {
      ...config,
      ...test,
      appEnvironment: appSettings.appEnvironment,
      strictSupabaseOnly: isProductionMode(),
      passwordEncryption: 'SCRYPT + AES-256-GCM (ndenc$v2)',
      activeRolesCount: systemRoles.filter((r) => r.isActive).length,
      totalRolesCount: systemRoles.length,
    },
  });
});

app.post('/api/system/supabase-sync', async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: 'SUPABASE_URL atau SUPABASE_KEY belum terpasang di file .env atau Environment Variable hosting Anda.',
    });
  }

  try {
    if (isProductionMode()) {
      return res.status(403).json({
        success: false,
        message: 'Fitur Sinkronkan Data Awal dinonaktifkan pada Mode Production demi melindungi data operasional di Supabase agar tidak tertimpa.',
      });
    }

    const summary = {
      mitras: 0,
      services: 0,
      clientDeals: 0,
      marketingTools: 0,
      commissions: 0,
      activityLogs: activityLogs.length,
      emailLogs: emailLogs.length,
    };

    if (mitras.length > 0) {
      const cleanMitras = mitras.map(({ gender: _g, ...rest }) => rest);
      const { error: errM } = await supabase.from('mitras').upsert(cleanMitras);
      if (!errM) summary.mitras = mitras.length;
      else console.warn('Supabase sync mitras warning:', errM.message);
    }

    if (services.length > 0) {
      const { error: errS } = await supabase.from('services').upsert(services);
      if (!errS) summary.services = services.length;
      else console.warn('Supabase sync services warning:', errS.message);
    }

    if (clientDeals.length > 0) {
      const cleanDeals = clientDeals.map((d) => toSupabaseClientDeal(d));
      const { error: errD } = await supabase.from('client_deals').upsert(cleanDeals);
      if (!errD) summary.clientDeals = clientDeals.length;
      else console.warn('Supabase sync deals warning:', errD.message);
    }

    if (marketingTools.length > 0) {
      const { error: errT } = await supabase.from('marketing_tools').upsert(marketingTools);
      if (!errT) summary.marketingTools = marketingTools.length;
      else console.warn('Supabase sync tools warning:', errT.message);
    }

    if (commissions.length > 0) {
      const { error: errC } = await supabase.from('commissions').upsert(commissions);
      if (!errC) summary.commissions = commissions.length;
      else console.warn('Supabase sync commissions warning:', errC.message);
    }

    await persistSettingsToSupabase();
    await persistActivityLogsToSupabase();
    await persistEmailLogsToSupabase();

    res.json({
      success: true,
      message: 'Seluruh data operasional, pengaturan, log aktivitas, dan log email berhasil disinkronkan ke cloud database Supabase!',
      summary,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Terjadi kendala sinkronisasi ke Supabase: ${err.message || 'Unknown error'}`,
    });
  }
});

// 8. Admin Supabase Cloud Database Backup & Restore Endpoints (Strictly Supabase Only)
app.get('/api/system/database-backup', async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: 'Koneksi Database Supabase belum aktif. Fitur Backup khusus untuk mem-backup data dari server Supabase.',
    });
  }

  try {
    // Query 100% langsung dari seluruh tabel di Supabase (tanpa mencampur data lokal)
    const [
      resMitras,
      resServices,
      resDeals,
      resCommissions,
      resPayouts,
      resTools,
      resNotifs,
      resSettings,
      resRoles,
      resActLogs,
      resEmailLogs,
      resPasswords,
    ] = await Promise.all([
      supabase.from('mitras').select('*'),
      supabase.from('services').select('*'),
      supabase.from('client_deals').select('*'),
      supabase.from('commissions').select('*'),
      supabase.from('payout_requests').select('*'),
      supabase.from('marketing_tools').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('app_settings').select('*'),
      supabase.from('system_roles').select('*'),
      supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }),
      supabase.from('email_logs').select('*').order('timestamp', { ascending: false }),
      supabase.from('user_passwords').select('*'),
    ]);

    const sbMitras = Array.isArray(resMitras.data) ? resMitras.data : [];
    const sbServices = Array.isArray(resServices.data) ? resServices.data : [];
    const sbDeals = Array.isArray(resDeals.data) ? resDeals.data : [];
    const sbCommissions = Array.isArray(resCommissions.data) ? resCommissions.data : [];
    const sbPayouts = Array.isArray(resPayouts.data) ? resPayouts.data : [];
    const sbTools = Array.isArray(resTools.data) ? resTools.data : [];
    const sbNotifs = Array.isArray(resNotifs.data) ? resNotifs.data : [];
    const sbSettings = Array.isArray(resSettings.data) ? resSettings.data : [];
    const sbRoles = Array.isArray(resRoles.data) ? resRoles.data : [];
    const sbActLogs = Array.isArray(resActLogs.data) ? resActLogs.data : [];
    const sbEmailLogs = Array.isArray(resEmailLogs.data) ? resEmailLogs.data : [];
    const sbPasswords = Array.isArray(resPasswords.data) ? resPasswords.data : [];

    const supabaseConfig = getSupabaseConfig();

    const backupPayload = {
      success: true,
      source: 'SUPABASE_PRODUCTION_DATABASE',
      supabaseUrl: supabaseConfig.url,
      backupVersion: '2.4-SUPABASE',
      createdAt: new Date().toISOString(),
      firmName: appSettings.firmName || 'NDTAXANDLAW',
      environment: 'production',
      counts: {
        mitras: sbMitras.length,
        services: sbServices.length,
        client_deals: sbDeals.length,
        commissions: sbCommissions.length,
        payout_requests: sbPayouts.length,
        marketing_tools: sbTools.length,
        notifications: sbNotifs.length,
        app_settings: sbSettings.length,
        system_roles: sbRoles.length,
        activity_logs: sbActLogs.length,
        email_logs: sbEmailLogs.length,
        user_passwords: sbPasswords.length,
      },
      tables: {
        mitras: sbMitras,
        services: sbServices,
        client_deals: sbDeals,
        commissions: sbCommissions,
        payout_requests: sbPayouts,
        marketing_tools: sbTools,
        notifications: sbNotifs,
        app_settings: sbSettings,
        system_roles: sbRoles,
        activity_logs: sbActLogs,
        email_logs: sbEmailLogs,
        user_passwords: sbPasswords,
      },
    };

    recordActivity({
      actorRole: 'admin',
      actorName: 'Admin Operasional',
      actionType: 'settings_update',
      operation: 'CREATE',
      targetEntity: 'Backup Database Supabase',
      description: `Admin mengunduh Backup Database langsung dari Supabase (${sbMitras.length} mitra, ${sbDeals.length} klien/deal, ${sbCommissions.length} komisi, ${sbPayouts.length} payout).`,
    });

    res.json(backupPayload);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Gagal mengambil data backup dari Supabase: ${err.message || 'Unknown error'}`,
    });
  }
});

app.post('/api/system/database-restore', async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: 'Koneksi Database Supabase belum aktif. Fitur Restore hanya dapat dijalankan langsung ke database Supabase.',
    });
  }

  try {
    const { backupData, mode = 'merge' } = req.body;
    // Support both new `tables` format and legacy `data` format
    const rawTables = backupData?.tables || backupData?.data || backupData;

    if (!rawTables || typeof rawTables !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Format file backup Supabase tidak valid atau kosong.',
      });
    }

    const isReplace = mode === 'replace';

    const tblMitras = Array.isArray(rawTables.mitras) ? rawTables.mitras : [];
    const tblServices = Array.isArray(rawTables.services) ? rawTables.services : [];
    const tblDeals = Array.isArray(rawTables.client_deals)
      ? rawTables.client_deals
      : Array.isArray(rawTables.clientDeals)
        ? rawTables.clientDeals.map((d: ClientDeal) => toSupabaseClientDeal(d))
        : [];
    const tblCommissions = Array.isArray(rawTables.commissions) ? rawTables.commissions : [];
    const tblPayouts = Array.isArray(rawTables.payout_requests)
      ? rawTables.payout_requests
      : Array.isArray(rawTables.payoutRequests)
        ? rawTables.payoutRequests
        : [];
    const tblTools = Array.isArray(rawTables.marketing_tools)
      ? rawTables.marketing_tools
      : Array.isArray(rawTables.marketingTools)
        ? rawTables.marketingTools
        : [];
    const tblNotifs = Array.isArray(rawTables.notifications) ? rawTables.notifications : [];
    const tblSettings = Array.isArray(rawTables.app_settings) ? rawTables.app_settings : [];
    const tblRoles = Array.isArray(rawTables.system_roles) ? rawTables.system_roles : [];
    const tblActLogs = Array.isArray(rawTables.activity_logs)
      ? rawTables.activity_logs
      : Array.isArray(rawTables.activityLogs)
        ? rawTables.activityLogs
        : [];
    const tblEmailLogs = Array.isArray(rawTables.email_logs)
      ? rawTables.email_logs
      : Array.isArray(rawTables.emailLogs)
        ? rawTables.emailLogs.map(toSupabaseEmailLogRow)
        : [];
    const tblPasswords = Array.isArray(rawTables.user_passwords)
      ? rawTables.user_passwords
      : rawTables.userPasswords && typeof rawTables.userPasswords === 'object'
        ? Object.entries(rawTables.userPasswords).map(([email, password]) => ({ email, password }))
        : [];

    // 1. Jika mode Timpa Penuh (Full Replace), kosongkan tabel di Supabase terlebih dahulu
    if (isReplace) {
      await Promise.allSettled([
        supabase.from('mitras').delete().neq('id', ''),
        supabase.from('services').delete().neq('id', ''),
        supabase.from('client_deals').delete().neq('id', ''),
        supabase.from('commissions').delete().neq('id', ''),
        supabase.from('payout_requests').delete().neq('id', ''),
        supabase.from('marketing_tools').delete().neq('id', ''),
        supabase.from('notifications').delete().neq('id', ''),
        supabase.from('activity_logs').delete().neq('id', ''),
        supabase.from('email_logs').delete().neq('id', ''),
      ]);
    }

    // 2. Upsert seluruh tabel langsung ke Supabase
    if (tblMitras.length > 0) {
      await supabase.from('mitras').upsert(tblMitras);
    }
    if (tblServices.length > 0) {
      await supabase.from('services').upsert(tblServices);
    }
    if (tblDeals.length > 0) {
      await supabase.from('client_deals').upsert(tblDeals);
    }
    if (tblCommissions.length > 0) {
      await supabase.from('commissions').upsert(tblCommissions);
    }
    if (tblPayouts.length > 0) {
      await supabase.from('payout_requests').upsert(tblPayouts);
    }
    if (tblTools.length > 0) {
      await supabase.from('marketing_tools').upsert(tblTools);
    }
    if (tblNotifs.length > 0) {
      await supabase.from('notifications').upsert(tblNotifs);
    }
    if (tblSettings.length > 0) {
      await supabase.from('app_settings').upsert(tblSettings);
    }
    if (tblRoles.length > 0) {
      await supabase.from('system_roles').upsert(tblRoles);
    }
    if (tblActLogs.length > 0) {
      await supabase.from('activity_logs').upsert(tblActLogs);
    }
    if (tblEmailLogs.length > 0) {
      await supabase.from('email_logs').upsert(tblEmailLogs);
    }
    if (tblPasswords.length > 0) {
      await supabase.from('user_passwords').upsert(tblPasswords);
    }

    // 3. Sinkronkan state aplikasi langsung dari Supabase yang baru di-restore
    await syncFromSupabase();

    recordActivity({
      actorRole: 'admin',
      actorName: 'Admin Operasional',
      actionType: 'settings_update',
      operation: 'UPDATE',
      targetEntity: 'Restore Database Supabase',
      description: `Admin berhasil melakukan Restore Database langsung ke Supabase (${isReplace ? 'Mode Timpa Penuh' : 'Mode Gabung Data'}): ${mitras.length} mitra, ${clientDeals.length} klien/deal, ${commissions.length} komisi.`,
    });

    res.json({
      success: true,
      message: `Restore ke Database Supabase berhasil (${isReplace ? 'Timpa Penuh' : 'Gabung Data'})! Data di Supabase saat ini: ${mitras.length} Mitra, ${clientDeals.length} Klien/Deal, ${commissions.length} Komisi.`,
      counts: {
        mitras: mitras.length,
        services: services.length,
        client_deals: clientDeals.length,
        commissions: commissions.length,
        payout_requests: payoutRequests.length,
        marketing_tools: marketingTools.length,
        activity_logs: activityLogs.length,
        email_logs: emailLogs.length,
      },
      settings: appSettings,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Gagal memproses restore ke Supabase: ${err.message || 'Unknown error'}`,
    });
  }
});

// ========================================================
// 4. REAL-TIME WHATSAPP-STYLE CHAT HUB (REST + WEBSOCKETS)
// ========================================================
const chatWsClients = new Set<WebSocket>();

const broadcastChatEvent = (payload: Record<string, any>) => {
  const raw = JSON.stringify(payload);
  for (const client of chatWsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(raw);
      } catch {
        // ignore
      }
    }
  }
};

const persistChatToCloud = async () => {
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([
        {
          email: '__sys_chat_rooms__@ndtaxlaw.internal',
          password: JSON.stringify(chatRooms.slice(0, 150)),
        },
        {
          email: '__sys_chat_messages__@ndtaxlaw.internal',
          password: JSON.stringify(chatMessages.slice(-400)),
        },
      ]);
    } catch {
      // ignore
    }
  }
};

const buildChatParticipantsList = (): ChatParticipant[] => {
  const staffList: ChatParticipant[] = staffAccounts
    .filter((s) => s.isActive)
    .map((s) => {
      const g = s.gender || inferGenderFromName(s.name);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'staff',
        avatar: resolveAvatarUrl(s.avatarUrl, g, s.name),
        code: s.position || 'Staf Operasional',
        specialization: s.position || 'Staf Operasional & Verifikasi Pajak',
      };
    });

  const mitraList: ChatParticipant[] = mitras.map((m) => {
    const g = m.gender || inferGenderFromName(m.fullName);
    return {
      id: m.id,
      name: m.fullName,
      email: m.email,
      role: 'mitra',
      avatar: resolveAvatarUrl(m.avatarUrl, g, m.fullName),
      code: m.memberCode,
      specialization: m.specialization,
    };
  });

  return [...staffList, ...mitraList];
};

const extractServerLinkMetadata = async (rawUrl: string): Promise<ChatLinkPreview | null> => {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const hostname = parsed.hostname.replace(/^www\./i, '');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const resp = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NDTaxAndLawChatBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const html = (await resp.text()).slice(0, 65000);
        const getMeta = (prop: string): string => {
          const reg1 = new RegExp(
            `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            'i'
          );
          const reg2 = new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
            'i'
          );
          return reg1.exec(html)?.[1] || reg2.exec(html)?.[1] || '';
        };

        const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
        const ogTitle = getMeta('og:title') || getMeta('twitter:title') || titleMatch?.[1] || hostname;
        const ogDesc =
          getMeta('og:description') ||
          getMeta('twitter:description') ||
          getMeta('description') ||
          `Tautan referensi dari ${hostname}`;
        const ogSite = getMeta('og:site_name') || hostname.toUpperCase();
        let ogImage = getMeta('og:image') || getMeta('twitter:image') || '';
        if (ogImage && ogImage.startsWith('/')) {
          ogImage = `${parsed.origin}${ogImage}`;
        }

        return {
          url: parsed.toString(),
          title: ogTitle.trim().slice(0, 140),
          description: ogDesc.trim().slice(0, 240),
          siteName: ogSite.trim().slice(0, 60),
          image: ogImage || undefined,
        };
      }
    } catch {
      clearTimeout(timeout);
    }

    return {
      url: parsed.toString(),
      title: `${hostname.toUpperCase()} — Tautan Eksternal`,
      description: `Buka tautan ${parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : parsed.hostname} di tab baru.`,
      siteName: hostname.toUpperCase(),
    };
  } catch {
    return null;
  }
};

// GET Chat State (Filtered by visibility: Admin sees all rooms for monitoring; Mitra & Staf see only rooms where they are members)
app.get('/api/chat/state', (req: Request, res: Response) => {
  const userId = String(req.query.userId || '').trim();
  const role = String(req.query.role || 'mitra').trim().toLowerCase();
  const isAdmin = role === 'admin';

  const participants = buildChatParticipantsList();
  const visibleRooms = chatRooms
    .filter((r) => isAdmin || r.participantIds.includes(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const visibleRoomIds = new Set(visibleRooms.map((r) => r.id));
  const visibleMessages = chatMessages.filter((m) => visibleRoomIds.has(m.roomId));

  res.json({
    chatEnabled: appSettings.chatEnabled !== false,
    participants,
    rooms: visibleRooms,
    messages: visibleMessages,
  });
});

// GET Link Metadata Preview (WhatsApp-style URL metadata)
app.get('/api/chat/link-preview', async (req: Request, res: Response) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ message: 'URL wajib diisi' });
  }
  const preview = await extractServerLinkMetadata(rawUrl);
  if (!preview) {
    return res.status(400).json({ message: 'Tidak dapat membaca metadata URL' });
  }
  res.json(preview);
});

// POST Create or Open Direct 1-on-1 Room between two participants (Mitra <-> Staf, Mitra <-> Mitra, Staf <-> Staf)
app.post('/api/chat/rooms/direct', async (req: Request, res: Response) => {
  const { userAId, userBId } = req.body;
  if (!userAId || !userBId || userAId === userBId) {
    return res.status(400).json({ message: 'Peserta percakapan tidak valid.' });
  }

  const sorted = [String(userAId), String(userBId)].sort();
  const existing = chatRooms.find(
    (r) =>
      r.type === 'direct' &&
      r.participantIds.length === 2 &&
      r.participantIds.includes(sorted[0]) &&
      r.participantIds.includes(sorted[1])
  );

  if (existing) {
    return res.json(existing);
  }

  const participants = buildChatParticipantsList();
  const pA = participants.find((p) => p.id === sorted[0]);
  const pB = participants.find((p) => p.id === sorted[1]);
  const nowIso = new Date().toISOString();

  const newRoom: ChatRoom = {
    id: `room-direct-${sorted[0]}__${sorted[1]}`,
    type: 'direct',
    name: `${pA?.name || sorted[0]} & ${pB?.name || sorted[1]}`,
    participantIds: sorted,
    createdBy: String(userAId),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  chatRooms.unshift(newRoom);
  await persistChatToCloud();
  broadcastChatEvent({ type: 'chat:room_updated', room: newRoom });
  res.status(201).json(newRoom);
});

// POST Create Group Chat (Only visible to group members + Admin monitor)
app.post('/api/chat/rooms/group', async (req: Request, res: Response) => {
  const { name, description, participantIds, createdBy, createdByName } = req.body;
  if (!name || !Array.isArray(participantIds) || participantIds.length < 2) {
    return res.status(400).json({
      message: 'Nama grup dan minimal 2 peserta wajib dipilih.',
    });
  }

  const uniqueIds = Array.from(new Set(participantIds.map(String)));
  const nowIso = new Date().toISOString();
  const newRoom: ChatRoom = {
    id: `room-group-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'group',
    name: String(name).trim(),
    description: String(description || 'Grup Diskusi Mitra & Staf').trim(),
    participantIds: uniqueIds,
    createdBy: String(createdBy || uniqueIds[0]),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastMessageText: `Grup "${String(name).trim()}" dibuat oleh ${createdByName || 'Anggota'}`,
    lastMessageAt: nowIso,
    lastMessageSenderName: String(createdByName || 'Sistem'),
  };

  chatRooms.unshift(newRoom);
  await persistChatToCloud();
  broadcastChatEvent({ type: 'chat:room_updated', room: newRoom });

  res.status(201).json(newRoom);
});

// PUT Update Group Chat Members / Name
app.put('/api/chat/rooms/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = chatRooms.find((r) => r.id === id);
  if (!room) {
    return res.status(404).json({ message: 'Ruang grup tidak ditemukan.' });
  }

  const { name, description, participantIds } = req.body;
  if (name) room.name = String(name).trim();
  if (description !== undefined) room.description = String(description).trim();
  if (Array.isArray(participantIds) && participantIds.length >= 2) {
    room.participantIds = Array.from(new Set(participantIds.map(String)));
  }
  room.updatedAt = new Date().toISOString();

  await persistChatToCloud();
  broadcastChatEvent({ type: 'chat:room_updated', room });
  res.json(room);
});

// POST Send Chat Message (Supports text, compressed image, quote reply, social forward, and auto link metadata)
app.post('/api/chat/messages', async (req: Request, res: Response) => {
  const {
    roomId,
    senderId,
    senderName,
    senderRole,
    senderAvatar,
    text,
    imageUrl,
    imageName,
    imageOriginalSize,
    imageCompressedSize,
    replyTo,
    linkPreview,
    forwardedFrom,
  } = req.body;

  if (senderRole === 'admin') {
    return res.status(403).json({
      message: 'Admin berada dalam Mode Monitoring dan tidak mengirim pesan di ruang chat Mitra/Staf.',
    });
  }

  const room = chatRooms.find((r) => r.id === roomId);
  if (!room) {
    return res.status(404).json({ message: 'Ruang percakapan tidak ditemukan.' });
  }

  if (!room.participantIds.includes(String(senderId))) {
    return res.status(403).json({
      message: 'Anda bukan anggota dari ruang percakapan atau grup ini.',
    });
  }

  const cleanText = String(text || '').trim();
  if (!cleanText && !imageUrl) {
    return res.status(400).json({ message: 'Isi pesan atau gambar tidak boleh kosong.' });
  }

  let resolvedLinkPreview: ChatLinkPreview | undefined = linkPreview;
  if (!resolvedLinkPreview && cleanText) {
    const urlMatch = cleanText.match(/https?:\/\/[^\s<>"]+/i);
    if (urlMatch) {
      const extracted = await extractServerLinkMetadata(urlMatch[0]);
      if (extracted) resolvedLinkPreview = extracted;
    }
  }

  const nowIso = new Date().toISOString();
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    roomId: room.id,
    senderId: String(senderId),
    senderName: String(senderName || 'Peserta'),
    senderRole: senderRole === 'staff' ? 'staff' : 'mitra',
    senderAvatar: String(senderAvatar || MALE_AVATAR_URL),
    text: cleanText,
    imageUrl: imageUrl ? String(imageUrl) : undefined,
    imageName: imageName ? String(imageName) : undefined,
    imageOriginalSize: imageOriginalSize ? Number(imageOriginalSize) : undefined,
    imageCompressedSize: imageCompressedSize ? Number(imageCompressedSize) : undefined,
    linkPreview: resolvedLinkPreview,
    replyTo: replyTo || undefined,
    forwardedFrom: forwardedFrom ? String(forwardedFrom) : undefined,
    createdAt: nowIso,
  };

  chatMessages.push(newMsg);
  if (chatMessages.length > 600) {
    chatMessages = chatMessages.slice(-600);
  }

  room.updatedAt = nowIso;
  room.lastMessageAt = nowIso;
  room.lastMessageSenderName = newMsg.senderName;
  room.lastMessageText =
    cleanText || (imageUrl ? '📷 Mengirim gambar terkompresi' : 'Pesan baru');

  await persistChatToCloud();
  broadcastChatEvent({
    type: 'chat:message_created',
    message: newMsg,
    room,
  });

  res.status(201).json(newMsg);
});

// PUT Edit Message (Allowed only within 5 minutes of createdAt, in both 1-on-1 & Group chat)
app.put('/api/chat/messages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, text } = req.body;
  const msg = chatMessages.find((m) => m.id === id);

  if (!msg) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
  }
  if (msg.senderId !== String(userId)) {
    return res.status(403).json({ message: 'Anda hanya dapat mengedit pesan milik Anda sendiri.' });
  }
  if (msg.isDeleted) {
    return res.status(400).json({ message: 'Pesan yang sudah ditarik tidak dapat diedit.' });
  }

  const elapsedMs = Date.now() - new Date(msg.createdAt).getTime();
  if (elapsedMs >= 5 * 60 * 1000) {
    return res.status(400).json({
      message: 'Batas waktu edit 5 menit telah berakhir. Pesan tidak dapat diubah lagi.',
    });
  }

  const cleanText = String(text || '').trim();
  if (!cleanText) {
    return res.status(400).json({ message: 'Teks pesan tidak boleh kosong.' });
  }

  msg.text = cleanText;
  msg.editedAt = new Date().toISOString();

  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room) {
    room.lastMessageText = `${cleanText} (diedit)`;
  }

  await persistChatToCloud();
  broadcastChatEvent({ type: 'chat:message_updated', message: msg });
  res.json(msg);
});

// DELETE Recall / Unsend Message (Allowed only within 5 minutes of createdAt, in both 1-on-1 & Group chat)
app.delete('/api/chat/messages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = String(req.query.userId || req.body?.userId || '').trim();
  const msg = chatMessages.find((m) => m.id === id);

  if (!msg) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
  }
  if (msg.senderId !== userId) {
    return res.status(403).json({ message: 'Anda hanya dapat menarik pesan milik Anda sendiri.' });
  }

  const elapsedMs = Date.now() - new Date(msg.createdAt).getTime();
  if (elapsedMs >= 5 * 60 * 1000) {
    return res.status(400).json({
      message: 'Batas waktu penarikan pesan 5 menit telah berakhir.',
    });
  }

  msg.isDeleted = true;
  msg.deletedAt = new Date().toISOString();
  msg.text = '';
  msg.imageUrl = undefined;
  msg.linkPreview = undefined;

  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room) {
    room.lastMessageText = '🚫 Pesan telah ditarik';
  }

  await persistChatToCloud();
  broadcastChatEvent({ type: 'chat:message_updated', message: msg });
  res.json(msg);
});

// PUT Admin Toggle Chat Feature Active / Inactive
app.put('/api/chat/settings', async (req: Request, res: Response) => {
  const { chatEnabled } = req.body;
  appSettings.chatEnabled = Boolean(chatEnabled);
  saveDatabase();
  await persistSettingsToSupabase();
  broadcastChatEvent({
    type: 'chat:sync',
    chatEnabled: appSettings.chatEnabled,
  });

  res.json({
    success: true,
    message: appSettings.chatEnabled
      ? 'Fitur Live Chat berhasil DIAKTIFKAN untuk seluruh Mitra & Staf.'
      : 'Fitur Live Chat berhasil DINONAKTIFKAN untuk Mitra & Staf.',
    settings: {
      ...appSettings,
      smtpPassword: appSettings.smtpPassword ? '••••••••••••••••' : '',
    },
  });
});

// Production static serving vs Dev Vite Middleware
async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const hasDistBuild = fs.existsSync(distIndexPath);
  const isCompiledServer = __filename.endsWith('server.js');
  const shouldServeStaticDist =
    hasDistBuild && (process.env.NODE_ENV === 'production' || isCompiledServer);

  if (shouldServeStaticDist) {
    const sendSanitizedDistHtml = (_req: Request, res: Response) => {
      try {
        const rawHtml = fs.readFileSync(distIndexPath, 'utf-8');
        // Strip anonymous crossorigin attributes so partitioned auth cookies are always sent in iframe preview
        const safeHtml = rawHtml.replace(/\scrossorigin(?:="[^"]*")?/gi, '');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(safeHtml);
      } catch {
        res.sendFile(distIndexPath);
      }
    };

    app.get('/', sendSanitizedDistHtml);
    app.get('/index.html', sendSanitizedDistHtml);
    app.use(express.static(distPath, { index: false }));
    app.get('*', sendSanitizedDistHtml);
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT} (static=${shouldServeStaticDist})`);
  });

  // Attach Real-Time WebSocket Server at /ws/chat using noServer upgrade so other upgrades are untouched
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      const first = protocols.values().next().value;
      return first || false;
    },
  });
  wss.on('connection', (ws: WebSocket) => {
    chatWsClients.add(ws);
    ws.on('close', () => {
      chatWsClients.delete(ws);
    });
    ws.on('error', () => {
      chatWsClients.delete(ws);
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    if (reqUrl.startsWith('/ws/chat')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Accept Vite client HMR WebSocket handshake cleanly so @vite/client never throws "WebSocket closed without opened"
      wss.handleUpgrade(request, socket, head, (ws) => {
        try {
          ws.send(JSON.stringify({ type: 'connected' }));
        } catch {
          // ignore
        }
      });
    }
  });
}

startServer();
