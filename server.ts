import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured, getSupabaseConfig, testSupabaseConnection } from './src/supabase.ts';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar, resolveAvatarUrl, inferGenderFromName } from './src/avatars.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

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
}

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
  defaultCommissionRate: number;
  allowClientSelfRegister: boolean;
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
  actorRole: 'admin' | 'mitra' | 'client' | 'system';
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
    | 'settings_update';
  operation: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE';
  targetEntity: string;
  description: string;
  timestamp: string;
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
  type: 'tools_update' | 'verification' | 'commission' | 'training' | 'client_deal';
  timestamp: string;
  isRead: boolean;
}

// Initial Data with Default Male/Female Avatars
let mitras: Mitra[] = [
  {
    id: 'mitra-01',
    memberCode: 'ND-2026-LAW-0042',
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
    memberCode: 'ND-2026-TAX-0077',
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
    memberCode: 'ND-2026-LAW-0089',
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

let services: ServiceItem[] = [
  {
    id: 'srv-01',
    name: 'Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)',
    category: 'Laporan Keuangan',
    defaultPrice: 7500000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Penyusunan Neraca, Laba Rugi, Cashflow, Jurnal Penyesuaian, Buku Besar, dan Rekonsiliasi Bank berkala sesuai PSAK.',
    isActive: true,
  },
  {
    id: 'srv-02',
    name: 'Kepatuhan & Pelaporan SPT Tahunan Badan (PPh Badan 1771)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 15000000,
    pricingType: 'case_by_case',
    commissionRate: 15,
    description: 'Kalkulasi kredit pajak, koreksi fiskal positif/negatif, lampiran khusus, dan e-filing resmi DJP dengan garansi nihil teguran formil.',
    isActive: true,
  },
  {
    id: 'srv-03',
    name: 'Paket Kepatuhan Pajak Bulanan (SPT Masa PPh 21/23/25/4(2) & PPN 1111)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 4500000,
    pricingType: 'monthly_subscription',
    commissionRate: 12,
    description: 'Pembuatan bukti potong Unifikasi, rekonsiliasi faktur pajak keluaran/masukan, dan pelaporan tepat waktu setiap bulan.',
    isActive: true,
  },
  {
    id: 'srv-04',
    name: 'Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP',
    category: 'Pendampingan Audit',
    defaultPrice: 35000000,
    pricingType: 'case_by_case',
    commissionRate: 20,
    description: 'Penyusunan tanggapan tertulis resmi SP2DK, rekonsiliasi data pengujian silang, dan pendampingan tatap muka dengan Account Representative DJP.',
    isActive: true,
  },
  {
    id: 'srv-05',
    name: 'Tax Planning, Restrukturisasi Bisnis & Dokumentasi Transfer Pricing (TP Doc)',
    category: 'Konsultasi Finansial',
    defaultPrice: 50000000,
    pricingType: 'case_by_case',
    commissionRate: 18,
    description: 'Optimasi beban pajak korporasi secara legal (tax avoidance vs evasion compliant), skema holding, dan Master/Local File TP Doc.',
    isActive: true,
  },
  {
    id: 'srv-06',
    name: 'Pendirian Legalitas PT / PMA, Perizinan OSS-RBA & NIB Berbasis Risiko',
    category: 'Legalitas Korporasi',
    defaultPrice: 18000000,
    pricingType: 'case_by_case',
    commissionRate: 15,
    description: 'Akta Notaris, SK Kemenkumham, NPWP Badan, NIB Berbasis Risiko OSS-RBA, dan sertifikat standar operasional.',
    isActive: true,
  },
  {
    id: 'srv-07',
    name: 'Retainer Kepatuhan Pajak & Audit Keuangan Tahunan (Annual Retainer)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 65000000,
    pricingType: 'annual_subscription',
    commissionRate: 15,
    description: 'Paket langganan komprehensif 1 tahun penuh: SPT Tahunan Badan, SPT Masa 12 bulan, audit internal laporan keuangan, dan konsultasi tak terbatas.',
    isActive: true,
  },
  {
    id: 'srv-08',
    name: 'Retainer Konsultan Hukum Korporasi & Pengawasan Kontrak (Tahunan)',
    category: 'Legalitas Korporasi',
    defaultPrice: 85000000,
    pricingType: 'annual_subscription',
    commissionRate: 15,
    description: 'Pendampingan legal corporate retainer tahunan: legal opinion, review & drafting kontrak bisnis berkala, dan penanganan sengketa ketenagakerjaan.',
    isActive: true,
  },
];

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
    commissionAmount: 1800000,
    status: 'active_subscription',
    date: '2026-08-10',
    subscriptionStartDate: '2026-08-10',
    billingDayOfMonth: 10,
    nextBillingDate: '2026-11-10',
    lastBilledDate: '2026-10-10',
    isBillingDue: true,
    recurringPaidMonths: 3,
    notes: 'Klien berlangganan retainer laporan keuangan bulanan & review pajak sejak Agustus 2026.',
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
    commissionAmount: 9000000,
    status: 'deal_closed',
    date: '2026-10-15',
    notes: 'Kasus SP2DK ketidaksesuaian omset PPN telah selesai diselesaikan dengan DJP, komisi 1x bayar cair.',
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
    dealValue: 5000000,
    commissionAmount: 600000,
    status: 'active_subscription',
    date: '2026-09-01',
    subscriptionStartDate: '2026-09-01',
    billingDayOfMonth: 1,
    nextBillingDate: '2026-11-01',
    lastBilledDate: '2026-10-01',
    isBillingDue: true,
    recurringPaidMonths: 2,
    notes: 'Pelaporan SPT Masa rutin setiap bulan.',
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
    commissionAmount: 1500000,
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
    commissionAmount: 7000000,
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
    commissionAmount: 15300000,
    status: 'deal_closed',
    date: '2026-06-15',
    periodStart: 'Februari 2024',
    periodEnd: 'April 2025',
    durationMonths: 15,
    paymentTermType: 'one_time',
    notes: 'Perikatan restrukturisasi keuangan & pajak multi-bulan periode Feb 2024 s/d Apr 2025 (15 Bulan) - Sekali bayar.',
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
    commissionAmount: 9750000,
    status: 'active_subscription',
    date: '2026-03-20',
    subscriptionStartDate: '2026-03-20',
    billingDayOfMonth: 20,
    nextBillingDate: '2027-03-20',
    lastBilledDate: '2026-03-20',
    isBillingDue: false,
    recurringPaidYears: 1,
    notes: 'Langganan tahunan retainer kepatuhan pajak & audit keuangan komprehensif.',
  },
];

let payoutRequests: PayoutRequest[] = [
  {
    id: 'pay-001',
    mitraId: 'mitra-01',
    mitraName: 'Bambang Sudirman, S.H., M.Kn.',
    memberCode: 'ND-2026-LAW-0042',
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
    memberCode: 'ND-2026-TAX-0077',
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
    memberCode: 'ND-2026-LAW-0042',
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
  supportEmail: 'advisory@ndtaxlaw.com',
  officeAddress: 'Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950',
  defaultCommissionRate: 15,
  allowClientSelfRegister: true,
  googleOAuthEnabled: false,
  googleClientId: '',
  geminiApiEnabled: true,
  geminiModel: 'gemini-3.8-flash',
  appEnvironment: (process.env.APP_ENV === 'development' ? 'development' : 'production') as 'development' | 'production',
  smtpEnabled: true,
  smtpHost: process.env.SMTP_HOST || 'mail.ndtaxlaw.com',
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpEncryption: (process.env.SMTP_ENCRYPTION as 'ssl' | 'tls' | 'none') || 'ssl',
  smtpUser: process.env.SMTP_USER || 'notifications@ndtaxlaw.com',
  smtpPassword: process.env.SMTP_PASS || '',
  smtpSenderName: 'NDTAXANDLAW System',
  smtpSenderEmail: process.env.SMTP_USER || 'notifications@ndtaxlaw.com',
  smtpReplyToEmail: 'advisory@ndtaxlaw.com',
  emailOnRegistrationVerify: true,
  emailOnPayoutDisbursed: true,
  emailOnClientAcc: true,
  emailOnPasswordReset: true,
  emailOnRecurringInvoice: true,
};

let emailLogs: EmailLogItem[] = [];

let activityLogs: ActivityLogItem[] = [
  {
    id: 'act-seed-01',
    actorRole: 'admin',
    actorId: 'admin-01',
    actorName: 'Admin Operasional NDTAXANDLAW',
    actorEmail: 'admin@ndtaxlaw.com',
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

export const persistEmailLogsToSupabase = async (latestItem?: EmailLogItem) => {
  if (!supabase) return;
  try {
    const compactLogs = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
    await supabase.from('user_passwords').upsert([
      { email: '__sys_email_logs__@ndtaxlaw.internal', password: JSON.stringify(compactLogs) },
    ]);
  } catch (e) {
    console.warn('[Supabase Email Logs KV Warning]', e);
  }
  if (latestItem) {
    try {
      await supabase.from('email_logs').upsert([latestItem]);
    } catch {
      // Table email_logs is optional if user_passwords KV is active
    }
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
  if (activityLogs.length > 500) {
    activityLogs = activityLogs.slice(0, 500);
  }
  saveDatabase();
  void persistActivityLogsToSupabase(newItem);
  return newItem;
};

// Build Professional HTML Email Template
const buildEmailHtml = (subject: string, recipientName: string, snippet: string) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #092147 0%, #113872 100%); padding: 20px 24px; border-radius: 10px 10px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">${appSettings.firmName || 'NDTAXANDLAW'}</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fcd34d;">${appSettings.tagline || 'Tax & Legal Advisory Portal'}</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none; color: #1e293b;">
        <p style="margin-top: 0; font-size: 14px;">Yth. <strong>${recipientName || 'Mitra NDTAXANDLAW'}</strong>,</p>
        <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px;">${subject}</h3>
        <div style="background-color: #f1f5f9; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #334155;">
          ${snippet.replace(/\n/g, '<br/>')}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Jika Anda memiliki pertanyaan, silakan hubungi tim operasional kami melalui WhatsApp di <strong>${appSettings.supportPhone}</strong> atau balas email ini ke <strong>${appSettings.supportEmail}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Email ini dikirim secara otomatis oleh Sistem Portal Kemitraan ${appSettings.firmName}.<br/>
          ${appSettings.officeAddress}
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
  const host = (appSettings.smtpHost || process.env.SMTP_HOST || '').trim();
  const port = Number(appSettings.smtpPort || process.env.SMTP_PORT || 465);
  const user = (appSettings.smtpUser || process.env.SMTP_USER || '').trim();
  const pass = appSettings.smtpPassword || process.env.SMTP_PASS || '';
  const encryption = appSettings.smtpEncryption || 'ssl';
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

  // Check trigger switches
  if (params.category === 'registration_verify' && !appSettings.emailOnRegistrationVerify) {
    return { success: false, logId: '', message: 'Notifikasi verifikasi registrasi dinonaktifkan' };
  }
  if (params.category === 'payout_disbursed' && !appSettings.emailOnPayoutDisbursed) {
    return { success: false, logId: '', message: 'Notifikasi pencairan komisi dinonaktifkan' };
  }
  if (params.category === 'client_acc' && !appSettings.emailOnClientAcc) {
    return { success: false, logId: '', message: 'Notifikasi validasi client ACC dinonaktifkan' };
  }
  if (params.category === 'password_reset' && !appSettings.emailOnPasswordReset) {
    return { success: false, logId: '', message: 'Notifikasi reset password dinonaktifkan' };
  }
  if (params.category === 'recurring_invoice' && !appSettings.emailOnRecurringInvoice) {
    return { success: false, logId: '', message: 'Notifikasi invoice perikatan dinonaktifkan' };
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

  const isSecure = encryption === 'ssl' || port === 465;

  // On Niagahoster / cPanel / Hostinger, sender email must match authenticated user or same domain to avoid 550 Sender Verify Failed
  let fromEmail = (appSettings.smtpSenderEmail || '').trim();
  if (!fromEmail || fromEmail === 'notifications@ndtaxlaw.com' || !fromEmail.includes('@')) {
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
    id: 'notif-01',
    title: 'Tools Marketing Baru Ditambahkan',
    message: 'Admin telah mengunggah "Deck Presentasi Pitching Dewan Direksi (PDF)" ke repositori tools marketing.',
    type: 'tools_update',
    timestamp: '2026-11-06T09:30:00Z',
    isRead: false,
  },
  {
    id: 'notif-02',
    title: 'Materi Pelatihan Baru Tersedia',
    message: 'Akses modul eksklusif "Playbook Strategi Closing Klien Konsultan Hukum Pajak" sekarang terbuka untuk semua mitra.',
    type: 'training',
    timestamp: '2026-11-04T14:15:00Z',
    isRead: false,
  },
  {
    id: 'notif-03',
    title: 'Pencairan Komisi Diproses',
    message: 'Komisi transaksi PT Global Indo Logistik sebesar Rp 23.000.000 telah ditransfer ke rekening Bank Mandiri.',
    type: 'commission',
    timestamp: '2026-10-26T11:00:00Z',
    isRead: true,
  },
];

// Monthly Performance Baseline
const monthlySalesHistory = [
  { month: 'Jun 2026', totalSales: 310000000, totalCommission: 46500000, mitraCount: 18, dealsClosed: 14 },
  { month: 'Jul 2026', totalSales: 420000000, totalCommission: 63000000, mitraCount: 24, dealsClosed: 19 },
  { month: 'Agu 2026', totalSales: 540000000, totalCommission: 81000000, mitraCount: 29, dealsClosed: 25 },
  { month: 'Sep 2026', totalSales: 610000000, totalCommission: 91500000, mitraCount: 35, dealsClosed: 28 },
  { month: 'Okt 2026', totalSales: 785000000, totalCommission: 117750000, mitraCount: 42, dealsClosed: 36 },
  { month: 'Nov 2026 (M-T-D)', totalSales: 430000000, totalCommission: 64500000, mitraCount: 48, dealsClosed: 21 },
];

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

// Saat ini role yang aktif adalah 'admin' dan 'mitra', dirancang siap diekspansi untuk banyak role baru ke depannya
let systemRoles: RoleDefinition[] = [
  {
    code: 'admin',
    name: 'Administrator Operasional',
    description: 'Akses penuh manajemen operasional, validasi klien & mitra, pencairan komisi, log audit, dan pengaturan sistem.',
    portalView: 'admin',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'admin-operations', 'verification', 'activity-logs', 'marketing-tools', 'commissions', 'ai-reports', 'idcard'],
    permissions: ['all', 'manage_mitra', 'manage_clients', 'approve_payouts', 'manage_services', 'view_logs', 'manage_settings', 'manage_roles'],
    isSystem: true,
    isActive: true,
  },
  {
    code: 'mitra',
    name: 'Mitra Konsultan & Referral',
    description: 'Akses portal kemitraan eksklusif: kartu identitas mitra, input klien referral, pelacakan komisi, penarikan dana, dan materi promosi.',
    portalView: 'mitra',
    defaultTab: 'idcard',
    allowedTabs: ['idcard', 'dashboard', 'marketing-tools', 'commissions', 'ai-reports'],
    permissions: ['view_idcard', 'input_client', 'view_commissions', 'request_payout', 'download_tools'],
    isSystem: true,
    isActive: true,
  },
];

export const getRoleDefinition = (roleCode?: string): RoleDefinition => {
  const normalized = (roleCode || 'mitra').trim().toLowerCase();
  const found = systemRoles.find((r) => r.code.toLowerCase() === normalized && r.isActive);
  if (found) return found;
  return normalized === 'admin' ? systemRoles[0] : systemRoles[1];
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

const adminAccount = {
  id: 'admin-01',
  name: 'Admin Operasional NDTAXANDLAW',
  email: 'admin@ndtaxlaw.com',
  password: 'adminND2026!',
  role: 'admin' as const,
  gender: 'male' as const,
  avatarUrl: MALE_AVATAR_URL,
};

const userPasswords = new Map<string, string>([
  ['admin@ndtaxlaw.com', encryptUserPassword('adminND2026!', 'admin')],
  ['bambang.sudirman@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
  ['dewi.lestari@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
  ['rian.pratama@example.com', encryptUserPassword('mitraND2026!', 'mitra')],
]);

// Store password reset OTP tokens in memory
const passwordResetTokens = new Map<string, { otp: string; expiresAt: number }>();

export const isProductionMode = (): boolean => {
  return (
    appSettings.appEnvironment === 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  );
};

// Normalize mitra avatars so stock unsplash URLs are replaced with clean default Male/Female SVG avatars
const normalizeMitraAvatars = (list: Mitra[]): Mitra[] => {
  return list.map((m) => {
    const gender = m.gender || inferGenderFromName(m.fullName);
    return {
      ...m,
      gender,
      avatarUrl: resolveAvatarUrl(m.avatarUrl, gender, m.fullName),
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

  return {
    ...row,
    notes: cleanNotes,
    subscriptionStartDate: row.subscriptionStartDate || meta.subscriptionStartDate,
    billingDayOfMonth: row.billingDayOfMonth || meta.billingDayOfMonth,
    nextBillingDate: row.nextBillingDate || meta.nextBillingDate,
    lastBilledDate: row.lastBilledDate || meta.lastBilledDate,
    isBillingDue: row.isBillingDue !== undefined ? row.isBillingDue : meta.isBillingDue,
    terminatedAt: row.terminatedAt || meta.terminatedAt,
    terminationReason: row.terminationReason || meta.terminationReason,
    rejectedAt: row.rejectedAt || meta.rejectedAt,
    rejectionReason: row.rejectionReason || meta.rejectionReason,
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
// - PRODUCTION MODE: STRICTLY SUPABASE ONLY (No local database.json fallback)
// - DEVELOPMENT MODE: Local database.json fallback only if Supabase is offline
// ========================================================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export const saveDatabase = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const passwordsObj: Record<string, string> = {};
    for (const [k, v] of userPasswords.entries()) {
      const role = k.toLowerCase() === adminAccount.email.toLowerCase() ? 'admin' : extractUserRole(v, 'mitra');
      passwordsObj[k.toLowerCase()] = encryptUserPassword(v, role);
    }
    // Always persist appSettings, logs, and encrypted passwords; only persist entity caches in development mode
    const payload = {
      mitras: isProductionMode() ? [] : mitras,
      services: isProductionMode() ? [] : services,
      clientDeals: isProductionMode() ? [] : clientDeals,
      payoutRequests: isProductionMode() ? [] : payoutRequests,
      marketingTools: isProductionMode() ? [] : marketingTools,
      commissions: isProductionMode() ? [] : commissions,
      notifications: isProductionMode() ? [] : notifications,
      emailLogs,
      activityLogs,
      appSettings,
      roles: systemRoles,
      userPasswords: passwordsObj,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage Error] Gagal menyimpan konfigurasi ke disk:', err);
  }
};

export const loadDatabase = () => {
  try {
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
        // Default to production if supabase is configured unless explicitly set by env
        if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
          appSettings.appEnvironment = 'production';
        }
      }

      if (Array.isArray(data.roles) && data.roles.length > 0) {
        systemRoles = data.roles;
      }

      if (Array.isArray(data.emailLogs)) {
        emailLogs = data.emailLogs.filter((l: EmailLogItem) => !['email-001', 'email-002', 'email-003'].includes(l.id));
      }
      if (Array.isArray(data.activityLogs)) {
        activityLogs = data.activityLogs;
      }

      if (data.userPasswords && typeof data.userPasswords === 'object') {
        for (const [em, pass] of Object.entries(data.userPasswords)) {
          const emailKey = em.toLowerCase();
          const role = emailKey === adminAccount.email.toLowerCase() ? 'admin' : extractUserRole(pass as string, 'mitra');
          userPasswords.set(emailKey, encryptUserPassword(pass as string, role));
        }
      }

      // PENTING: Jika Mode Production aktif, JANGAN muat data entitas lokal/dummy dari database.json!
      // Seluruh data wajib 100% berasal dari Supabase Database.
      if (isProductionMode()) {
        mitras = [];
        services = [];
        clientDeals = [];
        payoutRequests = [];
        marketingTools = [];
        commissions = [];
        notifications = [];
        console.log('[Production Mode] Hanya terhubung ke Database Supabase (penyimpanan lokal dinonaktifkan).');
      } else {
        if (Array.isArray(data.mitras)) mitras = normalizeMitraAvatars(data.mitras);
        if (Array.isArray(data.services)) services = data.services;
        if (Array.isArray(data.clientDeals)) clientDeals = normalizeClientDeals(data.clientDeals);
        if (Array.isArray(data.payoutRequests)) payoutRequests = data.payoutRequests;
        if (Array.isArray(data.marketingTools)) marketingTools = data.marketingTools;
        if (Array.isArray(data.commissions)) commissions = data.commissions;
        if (Array.isArray(data.notifications)) notifications = data.notifications;
        console.log(`[Development Mode] Konfigurasi lokal dimuat dari ${DB_FILE}`);
      }
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
      services = dbServices;
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

    // 6. Marketing Tools
    const { data: dbTools, error: errT } = await supabase.from('marketing_tools').select('*');
    if (!errT && Array.isArray(dbTools)) {
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
        if (emailLower.startsWith('__sys_') && emailLower.endsWith('@ndtaxlaw.internal')) {
          continue;
        }

        const defaultRole = row.role || (emailLower === adminAccount.email.toLowerCase() ? 'admin' : 'mitra');
        if (!isEncryptedPassword(row.password)) {
          const encrypted = encryptUserPassword(row.password, defaultRole);
          userPasswords.set(emailLower, encrypted);
          toUpgradeInSupabase.push({ email: emailLower, password: encrypted });
        } else {
          userPasswords.set(emailLower, row.password);
        }
      }

      // Seed System Config, Roles, Activity Logs, and Email Logs into Supabase if not yet present
      if (!hasSysConfig) {
        toUpgradeInSupabase.push({ email: '__sys_config__@ndtaxlaw.internal', password: JSON.stringify(appSettings) });
      }
      if (!hasSysRoles) {
        toUpgradeInSupabase.push({ email: '__sys_roles__@ndtaxlaw.internal', password: JSON.stringify(systemRoles) });
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

      // Ensure Admin has an encrypted password record in Supabase user_passwords
      const adminEmail = adminAccount.email.toLowerCase();
      if (!dbPasswords.some((r: any) => r.email && r.email.toLowerCase() === adminEmail)) {
        const adminEnc = userPasswords.get(adminEmail) || encryptUserPassword(adminAccount.password, 'admin');
        userPasswords.set(adminEmail, adminEnc);
        toUpgradeInSupabase.push({ email: adminEmail, password: adminEnc });
      }

      if (toUpgradeInSupabase.length > 0) {
        await supabase.from('user_passwords').upsert(toUpgradeInSupabase);
        console.log(`[Supabase Cloud] Sinkronisasi pengaturan, log aktivitas, log email & kredensial terenkripsi ke Supabase selesai.`);
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
      const { data: dbEmLogs, error: errEm } = await supabase.from('email_logs').select('*').order('sentAt', { ascending: false }).limit(200);
      if (!errEm && Array.isArray(dbEmLogs) && dbEmLogs.length > 0) {
        emailLogs = dbEmLogs;
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
          : ['idcard', 'dashboard', 'marketing-tools', 'commissions', 'ai-reports']),
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
  const normalizedEmail = (email || '').trim().toLowerCase();
  const isProd = isProductionMode();

  // Sinkronisasi kredensial terbaru dari Supabase saat login
  if (supabase) {
    try {
      const { data: pwRow } = await supabase
        .from('user_passwords')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      if (pwRow && pwRow.email && pwRow.password) {
        const defaultRole = pwRow.email.toLowerCase() === adminAccount.email.toLowerCase() ? 'admin' : 'mitra';
        if (!isEncryptedPassword(pwRow.password)) {
          const enc = encryptUserPassword(pwRow.password, defaultRole);
          userPasswords.set(pwRow.email.toLowerCase(), enc);
          await supabase.from('user_passwords').upsert([{ email: pwRow.email.toLowerCase(), password: enc }]);
        } else {
          userPasswords.set(pwRow.email.toLowerCase(), pwRow.password);
        }
      }
    } catch {}
  }

  // 1. Check Admin Login
  if (normalizedEmail === adminAccount.email.toLowerCase()) {
    const storedAdminCred = userPasswords.get(adminAccount.email.toLowerCase()) || encryptUserPassword(adminAccount.password, 'admin');
    const verifyRes = verifyUserPassword(password, storedAdminCred, 'admin');

    if (verifyRes.valid) {
      const roleDef = getRoleDefinition(verifyRes.role || 'admin');
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
          role: roleDef.portalView,
          roleCode: roleDef.code,
          roleName: roleDef.name,
          portalView: roleDef.portalView,
          defaultTab: roleDef.defaultTab,
          allowedTabs: roleDef.allowedTabs,
          permissions: roleDef.permissions,
          gender: 'male',
          avatarUrl: adminAccount.avatarUrl,
        },
        environment: appSettings.appEnvironment,
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi admin tidak valid.' });
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
    message: 'Akun tidak ditemukan di database Supabase. Pastikan email atau nomor keanggotaan sudah terdaftar.',
  });
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from('mitras').select('*');
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {}
  }

  const isAdmin = normalizedEmail === adminAccount.email.toLowerCase();
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);

  if (!isAdmin && !mitra) {
    return res.status(404).json({
      success: false,
      message: 'Email tidak terdaftar di database sistem NDTAXANDLAW.',
    });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  passwordResetTokens.set(normalizedEmail, {
    otp: otpCode,
    expiresAt: Date.now() + 30 * 60 * 1000,
  });

  const recipientName = isAdmin ? adminAccount.name : (mitra ? mitra.fullName : 'Pengguna NDTAXANDLAW');

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
  const { email, otpCode, newPassword } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
  }

  const storedToken = passwordResetTokens.get(normalizedEmail);
  if (storedToken) {
    if (otpCode && storedToken.otp !== String(otpCode).trim()) {
      return res.status(400).json({ success: false, message: 'Kode OTP pemulihan tidak cocok. Silakan periksa kembali email Anda.' });
    }
    passwordResetTokens.delete(normalizedEmail);
  }

  const existingRole = normalizedEmail === adminAccount.email.toLowerCase()
    ? 'admin'
    : extractUserRole(userPasswords.get(normalizedEmail), 'mitra');
  const encryptedPassword = encryptUserPassword(newPassword, existingRole);

  userPasswords.set(normalizedEmail, encryptedPassword);
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  recordActivity({
    actorRole: normalizedEmail === adminAccount.email.toLowerCase() ? 'admin' : 'mitra',
    actorId: mitra?.id || 'admin-01',
    actorName: mitra?.fullName || adminAccount.name,
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
  const normalizedEmail = (email || '').trim().toLowerCase();
  const inputToken = (token || '').trim();

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

  const isTokenValid = Boolean(mitra.verificationToken && mitra.verificationToken === inputToken);
  if (!isTokenValid) {
    return res.status(400).json({
      success: false,
      message: 'Kode verifikasi 6-digit salah atau tidak cocok. Silakan periksa kembali pesan di email Anda.',
    });
  }

  mitra.emailVerified = true;
  mitra.verificationToken = undefined;
  mitra.verificationTokenExpiry = undefined;

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
      await supabase.from('mitras').update({
        emailVerified: true,
        verificationToken: null,
      }).eq('email', normalizedEmail);
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

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('mitras').update({
        verificationToken: newToken,
        verificationTokenExpiry: expiryIso,
      }).eq('email', normalizedEmail);
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
app.get('/api/mitra', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('mitras').select('*');
      if (!error && Array.isArray(data)) {
        // LANGSUNG gunakan data dari Supabase tanpa merge lokal, sehingga jika data dihapus di Supabase otomatis hilang saat refresh!
        mitras = normalizeMitraAvatars(data);
        saveDatabase();
        return res.json({ success: true, data: mitras });
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
  res.json({ success: true, data: mitras });
});

app.post('/api/mitra/register', async (req: Request, res: Response) => {
  const { fullName, email, phone, nik, specialization, bankDetails, password, gender, role } = req.body;
  if (!fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Nama lengkap, Email, dan No WhatsApp wajib diisi.' });
  }

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
  const generatedReferralCode = `ND-REF-${Math.floor(1000 + Math.random() * 9000)}`;
  const resolvedGender: 'male' | 'female' = gender === 'female' ? 'female' : (gender === 'male' ? 'male' : inferGenderFromName(fullName));
  const assignedRole = getRoleDefinition(role || 'mitra').code;

  const newMitra: Mitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${new Date().getFullYear()}-PEN-${Math.floor(1000 + Math.random() * 9000)}`,
    referralCode: generatedReferralCode,
    fullName,
    email: normalizedEmail,
    phone,
    nik: nik || '3201000000000000',
    specialization: specialization || 'Konsultan Bisnis, Pajak & Hukum',
    status: 'pending',
    gender: resolvedGender,
    avatarUrl: getDefaultAvatar(resolvedGender, fullName),
    joinedDate: new Date().toISOString().split('T')[0],
    bankDetails: bankDetails || {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '',
      accountHolder: fullName,
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
    description: `Pendaftaran mitra baru "${newMitra.fullName}" (${newMitra.email}, Role: ${assignedRole}) dengan Spesialisasi Bisnis: ${newMitra.specialization}. Password dienkripsi (scrypt + AES-256-GCM).`,
  });

  if (supabase) {
    try {
      const { gender: _g, ...supabaseMitraPayload } = newMitra;
      const { error: insertErr } = await supabase.from('mitras').insert([supabaseMitraPayload]);
      if (insertErr) {
        console.warn('Supabase mitra insert warning:', insertErr.message);
      }
      await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: encryptedPass }]);
    } catch (e) {
      console.warn('Supabase insert error for new mitra', e);
    }
  }

  saveDatabase();

  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: fullName,
    subject: `Kode Verifikasi Email & Aktivasi Kemitraan NDTAXANDLAW: ${verificationToken}`,
    category: 'registration_verify',
    previewSnippet: `Halo ${fullName},\n\nSelamat bergabung di jaringan Kemitraan NDTAXANDLAW.\nKode verifikasi email 6-digit Anda adalah: ${verificationToken}\n\nSilakan masukkan kode ini pada formulir aktivasi akun untuk mengaktifkan akun Anda sebelum dapat masuk (login).`,
  });

  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Pendaftaran Mitra Baru',
    message: `${fullName} baru saja mendaftar kemitraan (Menunggu verifikasi email & approval).`,
    type: 'verification',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(newNotif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([newNotif]);
    } catch {}
  }

  saveDatabase();

  res.status(201).json({
    success: true,
    data: newMitra,
    needsEmailVerification: true,
    email: normalizedEmail,
    emailSent: emailResult.success,
    emailError: emailResult.error,
    message: emailResult.success
      ? `Pendaftaran berhasil disimpan! Kode verifikasi 6-digit telah dikirimkan ke email ${normalizedEmail}. Silakan cek inbox/spam Anda.`
      : `Pendaftaran berhasil disimpan, namun pengiriman email verifikasi mengalami kendala SMTP: ${emailResult.message}`,
  });
});

app.put('/api/mitra/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'verified' | 'rejected'
  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  mitra.status = status;
  if (status === 'verified') {
    const randomCode = Math.floor(100 + Math.random() * 900);
    mitra.memberCode = `ND-${new Date().getFullYear()}-LAW-${randomCode}`;
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Status Kemitraan Disetujui',
      message: `Pendaftaran ${mitra.fullName} telah disetujui. Kartu Identitas Eksklusif (${mitra.memberCode}) telah aktif.`,
      type: 'verification',
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    notifications.unshift(notif);

    if (supabase) {
      try {
        await supabase.from('notifications').insert([notif]);
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
    description: `Admin memperbarui status verifikasi Mitra "${mitra.fullName}" menjadi ${status === 'verified' ? `TERVERIFIKASI (${mitra.memberCode})` : 'DITOLAK'}.`,
  });

  if (supabase) {
    try {
      await supabase.from('mitras').update({ status, memberCode: mitra.memberCode }).eq('id', id);
    } catch (e) {
      console.warn('Supabase update verify error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, data: mitra });
});

app.put('/api/mitra/:id/profile', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, phone, specialization, bankDetails, gender, avatarUrl, newPassword } = req.body;
  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  if (fullName) mitra.fullName = fullName;
  if (phone) mitra.phone = phone;
  if (specialization) mitra.specialization = specialization;
  if (bankDetails) mitra.bankDetails = { ...mitra.bankDetails, ...bankDetails };
  if (gender === 'male' || gender === 'female') {
    mitra.gender = gender;
    mitra.avatarUrl = getDefaultAvatar(gender, mitra.fullName);
  } else if (avatarUrl) {
    mitra.avatarUrl = avatarUrl;
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
    targetEntity: 'Profil & Rekening Mitra',
    description: `Mitra "${mitra.fullName}" memperbarui data profil dan rekening bank (${mitra.bankDetails.bankName} - ${mitra.bankDetails.accountNumber}).`,
  });

  if (supabase) {
    try {
      await supabase.from('mitras').update({
        fullName: mitra.fullName,
        phone: mitra.phone,
        specialization: mitra.specialization,
        bankDetails: mitra.bankDetails,
        avatarUrl: mitra.avatarUrl,
      }).eq('id', id);
    } catch (e) {
      console.warn('Supabase update profile error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, data: mitra });
});

// ========================================================
// 2. MARKETING TOOLS ENDPOINTS
// ========================================================
app.get('/api/marketing-tools', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('marketing_tools').select('*');
      if (!error && Array.isArray(data)) {
        marketingTools = data;
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

  const newTool: MarketingTool = {
    id: `tool-${Date.now()}`,
    title,
    category,
    fileType: fileType || 'pdf',
    fileSize: fileSize || '3.5 MB',
    downloadUrl: downloadUrl || '#file-download',
    thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    description: description || 'Materi pendukung pemasaran resmi NDTAXANDLAW.',
    targetProduct: targetProduct || 'Layanan Konsultasi Pajak & Hukum',
    duration: duration || undefined,
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
    description: `Admin mengunggah materi marketing baru: "${title}" (${category}).`,
  });

  if (supabase) {
    try {
      await supabase.from('marketing_tools').insert([newTool]);
    } catch (e) {
      console.warn('Supabase insert tool error', e);
    }
  }

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Tools Marketing Baru Ditambahkan',
    message: `Admin telah menambahkan materi baru: "${title}" (${category}). Mitra dapat mengunduhnya sekarang.`,
    type: 'tools_update',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([notif]);
    } catch (e) {
      console.warn('Supabase insert notif error', e);
    }
  }

  saveDatabase();

  res.status(201).json({ success: true, data: newTool });
});

app.delete('/api/marketing-tools/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const target = marketingTools.find((t) => t.id === id);
  marketingTools = marketingTools.filter((t) => t.id !== id);

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
    id: `notif-${Date.now()}`,
    title: 'Pengajuan Penarikan Komisi',
    message: `Pengajuan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString('id-ID')} oleh ${mitra.fullName} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  if (supabase) {
    try {
      await supabase.from('payout_requests').insert([newPayout]);
      await supabase.from('notifications').insert([notif]);
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
        services = data;
        saveDatabase();
      }
    } catch (e) {
      console.warn('Supabase services query error', e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: 'Mode Production hanya membaca dari database Supabase.' });
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

  const newService: ServiceItem = {
    id: `srv-${Date.now()}`,
    name,
    category: category || 'Laporan Keuangan',
    defaultPrice: Number(defaultPrice) || 5000000,
    pricingType: pricingType === 'monthly_subscription' ? 'monthly_subscription' : (pricingType === 'annual_subscription' ? 'annual_subscription' : 'case_by_case'),
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
    id: `notif-${Date.now()}`,
    title: 'Katalog Layanan Diperbarui',
    message: `Admin menambahkan layanan baru: "${name}" (${newService.pricingType === 'monthly_subscription' ? 'Langganan Bulanan' : 'Case by Case'}). Mitra dapat mulai menawarkan ke klien.`,
    type: 'tools_update',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('services').insert([newService]);
      await supabase.from('notifications').insert([notif]);
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
  } = req.body;

  if (!companyName || !picName || !serviceId) {
    return res.status(400).json({ success: false, message: 'Nama perusahaan klien, PIC, dan layanan wajib diisi.' });
  }

  const mitra = mitras.find((m) => m.id === mitraId || m.referralCode === req.body.referralCode);
  const service = services.find((s) => s.id === serviceId);

  const selectedPricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription' =
    pricingType || (service ? service.pricingType : 'case_by_case');
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 10000000);
  const rate = service ? service.commissionRate : 15;
  const commissionCalc = Math.round((nominalValue * rate) / 100);

  // Setiap klien baru yang diinput oleh Mitra maupun Klien mandiri SELALU berstatus 'pending_acc' (Sedang Ditinjau Admin)
  // dan belum mendapatkan komisi sebelum Admin melakukan review & approve (Deal).
  const todayStr = new Date().toISOString().split('T')[0];
  const isSubscription = selectedPricingType === 'monthly_subscription' || selectedPricingType === 'annual_subscription';
  const startSubDate = isSubscription ? (subscriptionStartDate || todayStr) : undefined;
  const billingDay = isSubscription
    ? (Number(billingDayOfMonth) || Number((startSubDate || todayStr).split('-')[2]) || 1)
    : undefined;

  const newDeal: ClientDeal = {
    id: `deal-${Date.now()}`,
    mitraId: mitra ? mitra.id : (mitraId || 'mitra-01'),
    mitraName: mitra ? mitra.fullName : 'Mitra Terdaftar',
    referralCode: mitra ? mitra.referralCode : (req.body.referralCode || 'ND-REF-0000'),
    companyName,
    picName,
    picPhone: picPhone || '-',
    picEmail: picEmail || '-',
    serviceId,
    serviceName: service ? service.name : 'Layanan Konsultasi Pajak & Keuangan',
    pricingType: selectedPricingType,
    dealValue: nominalValue,
    commissionAmount: commissionCalc,
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
    description: `${newDeal.submittedBy === 'client_self' ? `Klien "${companyName}" mendaftar mandiri` : `Mitra "${newDeal.mitraName}" menginput klien baru "${companyName}"`} untuk layanan "${newDeal.serviceName}" senilai Rp ${nominalValue.toLocaleString('id-ID')} (Ref: ${newDeal.referralCode}). Status: Sedang Ditinjau Admin (Komisi Rp 0 sebelum di-approve).`,
  });

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Klien Baru Sedang Ditinjau Admin',
    message: `${newDeal.companyName} terdaftar via kode referral ${newDeal.referralCode} (${newDeal.pricingType === 'annual_subscription' ? 'Langganan Tahunan' : newDeal.pricingType === 'monthly_subscription' ? 'Langganan Bulanan' : 'Case-by-Case'}). Menunggu review & approve deal dari Admin agar komisi masuk ke saldo Mitra.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').insert([toSupabaseClientDeal(newDeal)]);
      await supabase.from('notifications').insert([notif]);
    } catch (e) {
      console.warn('Supabase client deal insert error', e);
    }
  }

  res.status(201).json({ success: true, data: newDeal });
});

// Admin Reviews & Approves (Deal) Client -> Credits Commission Immediately to Mitra
app.put('/api/clients/:id/acc', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subscriptionStartDate, billingDayOfMonth, dealValue, notes } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status !== 'pending_acc') {
    return res.status(400).json({ success: false, message: 'Klien ini sudah direview/divalidasi sebelumnya.' });
  }

  if (dealValue !== undefined && Number(dealValue) > 0) {
    const service = services.find((s) => s.id === deal.serviceId);
    const rate = service ? service.commissionRate : 15;
    deal.dealValue = Number(dealValue);
    deal.commissionAmount = Math.round((deal.dealValue * rate) / 100);
  }
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

  const newCommTrx: CommissionTransaction = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: deal.serviceName,
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
    id: `notif-${Date.now()}`,
    title: 'Deal Klien Di-Approve Admin (Komisi Masuk)',
    message: `Admin telah meng-approve deal klien "${deal.companyName}". Komisi ${deal.pricingType === 'annual_subscription' ? 'Tahun Ke-1' : deal.pricingType === 'monthly_subscription' ? 'Bulan Ke-1' : '1x Bayar (Case-by-Case)'} sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
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
      await supabase.from('notifications').insert([notif]);

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
    id: `notif-${Date.now()}`,
    title: 'Hasil Review Klien: Tidak Deal / Ditolak',
    message: `Pengajuan klien "${deal.companyName}" dinyatakan Tidak Deal oleh Admin (${deal.rejectionReason}). Komisi untuk pengajuan ini adalah Rp 0.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('notifications').insert([notif]);
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

  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.totalCommission = (mitra.totalCommission || 0) + deal.commissionAmount;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + deal.commissionAmount;
  }

  const newCommTrx: CommissionTransaction = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${cycleLabel})`,
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
    actionType: 'client_update',
    operation: 'UPDATE',
    targetEntity: 'Approve Pembayaran Langganan Klien',
    description: `Admin meng-approve pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}". Komisi berulang Rp ${deal.commissionAmount.toLocaleString('id-ID')} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}. Tagihan berikutnya: ${deal.nextBillingDate}.`,
  });

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: `Komisi Langganan Masuk (Approve ${cycleLabel})`,
    message: `Pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve Admin. Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Komisi Langganan Masuk (${cycleLabel}): ${deal.companyName} - Rp ${deal.commissionAmount.toLocaleString('id-ID')}`,
      category: 'recurring_invoice',
      previewSnippet: `Pembayaran perpanjangan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve oleh Admin.\n\nKomisi royalti Anda sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah ditambahkan ke dompet saldo siap cair Anda.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('commissions').insert([newCommTrx]);
      await supabase.from('notifications').insert([notif]);
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
    id: `notif-${Date.now()}`,
    title: 'Langganan Klien Berakhir / Diputus',
    message: `Klien "${deal.companyName}" (${deal.serviceName}) telah berhenti berlangganan per ${deal.terminatedAt}. Komisi berulang untuk Mitra ${deal.mitraName} otomatis dihentikan.`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').upsert([toSupabaseClientDeal(deal)]);
      await supabase.from('notifications').insert([notif]);

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
    id: `notif-${Date.now()}`,
    title: 'Pencairan Komisi Telah Ditransfer',
    message: `Dana komisi kotor Rp ${payout.amount.toLocaleString('id-ID')} (Net Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')}) untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) dengan Ref #${payout.transferRefNumber}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
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
      await supabase.from('notifications').insert([notif]);
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
  res.json({ success: true, data: appSettings, roles: systemRoles });
});

app.put('/api/settings', async (req: Request, res: Response) => {
  const updates = req.body;
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
    id: `notif-${Date.now()}`,
    title: 'Pengaturan Sistem Diperbarui',
    message: 'Konfigurasi profil layanan, server SMTP email & notifikasi otomatis, OAuth Google, dan integrasi AI telah diperbarui.',
    type: 'tools_update',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();
  await persistSettingsToSupabase();

  if (supabase) {
    try {
      await supabase.from('notifications').insert([notif]);
    } catch (e) {
      console.warn('Supabase notification insert error', e);
    }
  }

  res.json({ success: true, data: appSettings });
});

// 3.9 SMTP Email Server & Dispatch Log Endpoints
app.post('/api/settings/test-email', async (req: Request, res: Response) => {
  const { targetEmail, smtpConfig } = req.body;
  const emailToTest = (targetEmail || appSettings.supportEmail || 'admin@ndtaxlaw.com').trim();

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
      const { data: tableLogs, error: errTable } = await supabase
        .from('email_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(300);
      if (!errTable && Array.isArray(tableLogs) && tableLogs.length > 0) {
        emailLogs = tableLogs;
        saveDatabase();
        return res.json({ success: true, data: emailLogs });
      }
      const { data: kvRow, error: errKv } = await supabase
        .from('user_passwords')
        .select('*')
        .eq('email', '__sys_email_logs__@ndtaxlaw.internal')
        .maybeSingle();
      if (!errKv && kvRow && kvRow.password) {
        const parsed = JSON.parse(kvRow.password);
        if (Array.isArray(parsed)) {
          emailLogs = parsed;
          saveDatabase();
        }
      }
    } catch (e) {
      console.warn('Supabase email logs query error', e);
    }
  }
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
      const { data: tableLogs, error: errTable } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (!errTable && Array.isArray(tableLogs) && tableLogs.length > 0) {
        activityLogs = tableLogs;
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
          saveDatabase();
        }
      }
    } catch (e) {
      console.warn('Supabase activity logs query error', e);
    }
  }
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
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  if (supabase) {
    try {
      await supabase.from('notifications').update({ isRead: true }).neq('isRead', true);
    } catch (e) {
      console.warn('Supabase mark read notifications error', e);
    }
  }
  saveDatabase();
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

  res.json({
    success: true,
    data: {
      salesHistory: monthlySalesHistory,
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

    const promptContext = `
Anda adalah Chief Executive Analyst & Tax-Legal Strategy Director di firma NDTAXANDLAW.
Buat laporan evaluasi kinerja bulanan mendalam, ringkas, profesional, dan berdampak tinggi.

Data Operasional NDTAXANDLAW Saat Ini:
- Periode Evaluasi: ${targetPeriod}
- Jumlah Total Mitra Terverifikasi: ${verifiedMitrasCount} Mitra
- Calon Mitra Menunggu Verifikasi: ${pendingCount} Mitra
- Riwayat Penjualan 6 Bulan Terakhir:
${JSON.stringify(monthlySalesHistory, null, 2)}
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

// Production static serving vs Dev Vite Middleware
async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));
  const isCompiledServer = __filename.endsWith('server.js');
  const shouldServeStaticDist =
    hasDistBuild &&
    (process.env.NODE_ENV === 'production' ||
      process.env.APP_ENV === 'production' ||
      isProductionMode() ||
      isCompiledServer);

  if (shouldServeStaticDist) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT} (static=${shouldServeStaticDist})`);
  });
}

startServer();
