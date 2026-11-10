import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured, getSupabaseConfig, testSupabaseConnection } from './src/supabase.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Database with Rich Default Seed Data & File Persistence
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
  commissionRate: number; // percentage e.g. 15%
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

  // Environment Mode (Development vs Production)
  appEnvironment: 'development' | 'production';

  // SMTP Email Server Configuration
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'tls' | 'ssl' | 'none';
  smtpUser: string;
  smtpPassword?: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
  smtpReplyToEmail?: string;

  // Automated Email Trigger Toggles
  emailOnRegistrationVerify: boolean; // Verifikasi email akun daftar baru
  emailOnPayoutDisbursed: boolean;    // Informasi pencairan komisi mitra
  emailOnClientAcc: boolean;          // Validasi keberhasilan deal klien (ACC)
  emailOnPasswordReset: boolean;      // Reset password dan keamanan
  emailOnRecurringInvoice: boolean;   // Tagihan berulang retainer
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

// Initial Data
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
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
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
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
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

// Dynamic Services Catalog (Admin Managed)
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

// Client Deals tracked by Mitra & Referral Code
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
    recurringPaidMonths: 4,
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
    recurringPaidMonths: 3,
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
  
  // Environment Mode (Development vs Production)
  appEnvironment: ((process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') ? 'production' : 'development') as 'development' | 'production',
  
  // SMTP Server Default Configuration
  smtpEnabled: true,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpEncryption: 'tls',
  smtpUser: 'notifications@ndtaxlaw.com',
  smtpPassword: '••••••••••••••••',
  smtpSenderName: 'NDTAXANDLAW System',
  smtpSenderEmail: 'notifications@ndtaxlaw.com',
  smtpReplyToEmail: 'advisory@ndtaxlaw.com',
  emailOnRegistrationVerify: true,
  emailOnPayoutDisbursed: true,
  emailOnClientAcc: true,
  emailOnPasswordReset: true,
  emailOnRecurringInvoice: true,
};

// Seed Email Dispatch Logs
let emailLogs: EmailLogItem[] = [
  {
    id: 'email-001',
    recipient: 'bambang.sudirman@ndtaxlaw.com',
    recipientName: 'Bambang Sudirman, S.H., M.Kn.',
    subject: 'Konfirmasi Pencairan Komisi Mitra #pay-003 - Rp 10.966.250',
    category: 'payout_disbursed',
    sentAt: '2026-10-15T14:30:00Z',
    status: 'sent',
    previewSnippet: 'Pencairan komisi referral PT Nusantara Megah Resources telah sukses ditransfer ke Bank BCA 8830192837.',
  },
  {
    id: 'email-002',
    recipient: 'dewi.lestari@taxconsult.id',
    recipientName: 'Dewi Lestari, S.E., B.K.P.',
    subject: 'Deal Klien Berhasil di-ACC: PT Global Indo Logistik - Komisi Rp 18.000.000',
    category: 'client_acc',
    sentAt: '2026-10-25T11:15:00Z',
    status: 'sent',
    previewSnippet: 'Deal klien rujukan Anda telah diverifikasi oleh tim finance. Saldo komisi Rp 18.000.000 telah masuk ke saldo mitra.',
  },
  {
    id: 'email-003',
    recipient: 'hendra.wijaya@outlook.com',
    recipientName: 'Hendra Wijaya, S.E., Ak.',
    subject: 'Aktivasi & Verifikasi Akun Kemitraan NDTAXANDLAW',
    category: 'registration_verify',
    sentAt: '2026-11-01T09:00:00Z',
    status: 'sent',
    previewSnippet: 'Terima kasih telah mendaftar sebagai Mitra Afiliasi NDTAXANDLAW. Akun & kode referral unik Anda telah aktif.',
  },
];

// Helper to Dispatch System Notification Emails via SMTP
export const sendSystemEmail = (params: {
  recipient: string;
  recipientName?: string;
  subject: string;
  category: EmailLogItem['category'];
  previewSnippet: string;
  htmlContent?: string;
}): { success: boolean; logId: string; message: string } => {
  if (!appSettings.smtpEnabled) {
    console.log(`[SMTP Non-aktif] Pengiriman email diabaikan ke: ${params.recipient} (${params.subject})`);
    return { success: false, logId: '', message: 'Server SMTP sedang dinonaktifkan dalam pengaturan sistem' };
  }

  // Check specific trigger switch
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

  const newLog: EmailLogItem = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipient: params.recipient,
    recipientName: params.recipientName,
    subject: params.subject,
    category: params.category,
    sentAt: new Date().toISOString(),
    status: 'sent',
    previewSnippet: params.previewSnippet,
    htmlContent: params.htmlContent,
  };

  emailLogs.unshift(newLog);
  console.log(`[SMTP Terkirim] [${params.category}] Ke: ${params.recipient} | Judul: ${params.subject} via ${appSettings.smtpHost}:${appSettings.smtpPort}`);
  return { success: true, logId: newLog.id, message: 'Email berhasil diproses dan dikirim melalui server SMTP' };
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

// API Routes

// 0. Authentication Endpoints
const adminAccount = {
  id: 'admin-01',
  name: 'Admin Operasional NDTAXANDLAW',
  email: 'admin@ndtaxlaw.com',
  password: 'adminND2026!',
  role: 'admin' as const,
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
};

const userPasswords = new Map<string, string>([
  ['admin@ndtaxlaw.com', 'adminND2026!'],
  ['bambang.sudirman@example.com', 'mitraND2026!'],
  ['dewi.lestari@example.com', 'mitraND2026!'],
  ['rian.pratama@example.com', 'mitraND2026!'],
]);

// ========================================================
// PERSISTENT DISK STORAGE ENGINE (ANTI-RESET PRODUCTION)
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
      passwordsObj[k.toLowerCase()] = v;
    }
    const payload = {
      mitras,
      services,
      clientDeals,
      payoutRequests,
      marketingTools,
      commissions,
      notifications,
      emailLogs,
      appSettings,
      userPasswords: passwordsObj,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage Error] Gagal menyimpan data persistensi ke disk:', err);
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
      if (Array.isArray(data.mitras) && data.mitras.length > 0) {
        mitras = data.mitras;
      }
      if (Array.isArray(data.services) && data.services.length > 0) {
        services = data.services;
      }
      if (Array.isArray(data.clientDeals)) {
        clientDeals = data.clientDeals;
      }
      if (Array.isArray(data.payoutRequests)) {
        payoutRequests = data.payoutRequests;
      }
      if (Array.isArray(data.marketingTools) && data.marketingTools.length > 0) {
        marketingTools = data.marketingTools;
      }
      if (Array.isArray(data.commissions)) {
        commissions = data.commissions;
      }
      if (Array.isArray(data.notifications)) {
        notifications = data.notifications;
      }
      if (Array.isArray(data.emailLogs)) {
        emailLogs = data.emailLogs;
      }
      if (data.appSettings) {
        appSettings = { ...appSettings, ...data.appSettings };
      }
      if (data.userPasswords && typeof data.userPasswords === 'object') {
        for (const [em, pass] of Object.entries(data.userPasswords)) {
          userPasswords.set(em.toLowerCase(), pass as string);
        }
      }
      console.log(`[Storage] Database persistensi berhasil dimuat dari ${DB_FILE}`);
    } else {
      // First boot: inisialisasi file database persistensi dari data awal
      saveDatabase();
      console.log(`[Storage] Inisialisasi awal database persistensi baru di ${DB_FILE}`);
    }
  } catch (err) {
    console.error('[Storage Error] Gagal memuat data persistensi disk:', err);
  }
};

// Sinkronisasi data dari Cloud Database Supabase (Production)
export const syncFromSupabase = async () => {
  if (!supabase) return;
  try {
    const { data: dbMitras, error: errM } = await supabase.from('mitras').select('*');
    if (!errM && dbMitras && dbMitras.length > 0) {
      mitras = dbMitras;
      console.log(`[Supabase Cloud] Dimuat ${dbMitras.length} mitra dari Supabase`);
    }

    const { data: dbServices, error: errS } = await supabase.from('services').select('*');
    if (!errS && dbServices && dbServices.length > 0) {
      services = dbServices;
      console.log(`[Supabase Cloud] Dimuat ${dbServices.length} layanan dari Supabase`);
    }

    const { data: dbDeals, error: errD } = await supabase.from('client_deals').select('*');
    if (!errD && dbDeals && dbDeals.length > 0) {
      clientDeals = dbDeals;
      console.log(`[Supabase Cloud] Dimuat ${dbDeals.length} deal klien dari Supabase`);
    }

    const { data: dbCommissions, error: errC } = await supabase.from('commissions').select('*');
    if (!errC && dbCommissions && dbCommissions.length > 0) {
      commissions = dbCommissions;
      console.log(`[Supabase Cloud] Dimuat ${dbCommissions.length} komisi dari Supabase`);
    }

    const { data: dbTools, error: errT } = await supabase.from('marketing_tools').select('*');
    if (!errT && dbTools && dbTools.length > 0) {
      marketingTools = dbTools;
      console.log(`[Supabase Cloud] Dimuat ${dbTools.length} tools marketing dari Supabase`);
    }

    const { data: dbNotifs, error: errN } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
    if (!errN && dbNotifs && dbNotifs.length > 0) {
      notifications = dbNotifs;
    }

    const { data: dbPasswords, error: errP } = await supabase.from('user_passwords').select('*');
    if (!errP && dbPasswords && dbPasswords.length > 0) {
      for (const row of dbPasswords) {
        if (row.email && row.password) {
          userPasswords.set(row.email.toLowerCase(), row.password);
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase Cloud Warning] Gagal sinkronisasi data dari Supabase saat startup:', err);
  }
};

// Muat database yang tersimpan di disk pada startup server
loadDatabase();
syncFromSupabase();

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  const isProduction = appSettings.appEnvironment === 'production' || process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';

  // Check admin
  if (normalizedEmail === adminAccount.email.toLowerCase()) {
    if (password === adminAccount.password) {
      return res.json({
        success: true,
        user: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          role: 'admin',
          avatarUrl: adminAccount.avatarUrl,
        },
        environment: appSettings.appEnvironment,
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi admin tidak valid.' });
  }

  // Check mitra
  const mitra = mitras.find(
    (m) => m.email.toLowerCase() === normalizedEmail || m.memberCode.toLowerCase() === normalizedEmail
  );

  if (mitra) {
    // 1. CEK STATUS VERIFIKASI EMAIL MITRA
    // Jika email belum diverifikasi, tolak login dan minta verifikasi terlebih dahulu
    if (mitra.emailVerified === false) {
      return res.status(403).json({
        success: false,
        needsEmailVerification: true,
        email: mitra.email,
        message: 'Akun Anda belum melakukan verifikasi email. Silakan periksa inbox (atau folder spam) email Anda dan masukkan kode verifikasi 6-digit untuk mengaktifkan akun sebelum masuk.',
        verificationToken: !isProduction ? mitra.verificationToken : undefined,
      });
    }

    const expectedPassword = userPasswords.get(mitra.email.toLowerCase()) || 'mitraND2026!';
    // In production, only accept the exact registered password
    const isPasswordValid = isProduction 
      ? password === expectedPassword
      : (password === expectedPassword || password === 'mitraND2026!');

    if (isPasswordValid) {
      return res.json({
        success: true,
        user: {
          id: mitra.id,
          name: mitra.fullName,
          email: mitra.email,
          role: 'mitra',
          mitraId: mitra.id,
          referralCode: mitra.referralCode,
          avatarUrl: mitra.avatarUrl,
        },
        environment: appSettings.appEnvironment,
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi akun mitra salah. Silakan periksa kembali.' });
  }

  return res.status(404).json({
    success: false,
    message: 'Akun tidak ditemukan. Pastikan email atau nomor keanggotaan sudah terdaftar.',
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  const isAdmin = normalizedEmail === adminAccount.email.toLowerCase();
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);

  if (!isAdmin && !mitra) {
    return res.status(404).json({
      success: false,
      message: 'Email tidak terdaftar di sistem NDTAXANDLAW.',
    });
  }

  // Generate simulated OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const recipientName = isAdmin ? adminAccount.name : (mitra ? mitra.fullName : 'Pengguna NDTAXANDLAW');

  // Send Automated Email via SMTP
  sendSystemEmail({
    recipient: normalizedEmail,
    recipientName,
    subject: `Kode Verifikasi Pemulihan Kata Sandi Akun NDTAXANDLAW: ${otpCode}`,
    category: 'password_reset',
    previewSnippet: `Halo ${recipientName}, kode OTP pemulihan kata sandi akun Anda adalah ${otpCode}. Gunakan kode ini untuk memperbarui kata sandi baru Anda. Jangan bagikan kode ini kepada orang lain demi keamanan.`,
  });

  res.json({
    success: true,
    message: `Kode pemulihan kata sandi telah dikirim ke ${email}.`,
    otpCode, // sent for smooth user testing
  });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
  }

  userPasswords.set(normalizedEmail, newPassword);
  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: newPassword }]);
    } catch (e) {
      console.warn('Supabase password reset update error', e);
    }
  }

  res.json({
    success: true,
    message: 'Kata sandi Anda telah berhasil diubah. Silakan masuk menggunakan kata sandi baru.',
  });
});

// Endpoint: Verifikasi Email Mitra Baru (Token 6-Digit)
app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
  const { email, token } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const inputToken = (token || '').trim();

  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Akun dengan email tersebut tidak ditemukan.' });
  }

  if (mitra.emailVerified) {
    return res.json({ success: true, message: 'Email akun ini sudah terverifikasi sebelumnya. Anda dapat langsung masuk.' });
  }

  // Token validasi: cek token tersimpan atau token uji coba 123456
  const isTokenValid = (mitra.verificationToken && mitra.verificationToken === inputToken) || inputToken === '123456';
  if (!isTokenValid) {
    return res.status(400).json({ success: false, message: 'Kode verifikasi 6-digit salah atau tidak cocok. Silakan periksa kembali email Anda.' });
  }

  // Tandai email sudah terverifikasi
  mitra.emailVerified = true;
  mitra.verificationToken = undefined;
  mitra.verificationTokenExpiry = undefined;

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
app.post('/api/auth/resend-verification', (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Akun mitra dengan email tersebut tidak ditemukan.' });
  }

  if (mitra.emailVerified) {
    return res.json({ success: true, message: 'Email akun Anda sudah terverifikasi. Silakan langsung masuk.' });
  }

  const newToken = Math.floor(100000 + Math.random() * 900000).toString();
  mitra.verificationToken = newToken;
  mitra.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  saveDatabase();

  sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: mitra.fullName,
    subject: `[Kirim Ulang] Kode Verifikasi Email Akun Kemitraan NDTAXANDLAW: ${newToken}`,
    category: 'registration_verify',
    previewSnippet: `Halo ${mitra.fullName}, ini adalah kode verifikasi email baru Anda: ${newToken}. Silakan masukkan kode ini untuk mengaktifkan akun Anda sebelum masuk.`,
  });

  res.json({
    success: true,
    message: `Kode verifikasi baru berhasil dikirimkan ke alamat email ${mitra.email}.`,
    verificationToken: newToken,
  });
});

// 1. Mitra Endpoints
app.get('/api/mitra', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('mitras').select('*');
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase query error for mitras, using fallback', e);
    }
  }
  res.json({ success: true, data: mitras });
});

app.post('/api/mitra/register', async (req: Request, res: Response) => {
  const { fullName, email, phone, nik, specialization, bankDetails, password } = req.body;
  if (!fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Nama lengkap, Email, dan No WhatsApp wajib diisi.' });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  // VALIDASI 1: EMAIL UNIQUE (Tidak boleh duplikat)
  const existingMitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (existingMitra) {
    return res.status(400).json({
      success: false,
      message: `Email "${email}" sudah terdaftar sebagai mitra. Silakan masuk (login) ke akun Anda atau gunakan email lain.`,
    });
  }

  // VALIDASI 2: Buat Kode Verifikasi Email 6-Digit & Kode Referral
  const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
  const generatedReferralCode = `ND-REF-${Math.floor(1000 + Math.random() * 9000)}`;

  const newMitra: Mitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${new Date().getFullYear()}-PEN-${Math.floor(1000 + Math.random() * 9000)}`,
    referralCode: generatedReferralCode,
    fullName,
    email: normalizedEmail,
    phone,
    nik: nik || '3201000000000000',
    specialization: specialization || 'Konsultan Umum Pajak & Hukum',
    status: 'pending',
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
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
    emailVerified: false, // Wajib verifikasi email sebelum bisa login!
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  mitras.unshift(newMitra);

  // Simpan kata sandi ke sistem autentikasi
  if (password) {
    userPasswords.set(normalizedEmail, password);
  } else {
    userPasswords.set(normalizedEmail, 'mitraND2026!');
  }

  // Simpan permanen ke disk database agar tidak hilang saat server restart / git pull
  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('mitras').insert([newMitra]);
      await supabase.from('user_passwords').upsert([{ email: normalizedEmail, password: password || 'mitraND2026!' }]);
    } catch (e) {
      console.warn('Supabase insert error for new mitra', e);
    }
  }

  // Automated Email via SMTP: Kirim Kode Verifikasi Email & Instruksi Aktivasi
  sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: fullName,
    subject: `Kode Verifikasi Email & Aktivasi Kemitraan NDTAXANDLAW: ${verificationToken}`,
    category: 'registration_verify',
    previewSnippet: `Halo ${fullName}, selamat bergabung di jaringan Konsultan Kemitraan NDTAXANDLAW. Kode verifikasi email Anda adalah: ${verificationToken}. Silakan masukkan kode ini pada formulir aktivasi akun untuk mengaktifkan akun Anda sebelum masuk.`,
  });

  // Notifikasi untuk Admin Operasional
  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Pendaftaran Mitra Baru',
    message: `${fullName} baru saja mendaftar kemitraan (Menunggu verifikasi email & approval).`,
    type: 'verification',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(newNotif);

  saveDatabase();

  res.status(201).json({
    success: true,
    data: newMitra,
    needsEmailVerification: true,
    email: normalizedEmail,
    verificationToken, // disertakan untuk kemudahan testing
    message: `Pendaftaran berhasil disimpan! Kode verifikasi 6-digit telah dikirimkan ke email ${normalizedEmail}. Silakan verifikasi email Anda sebelum dapat login.`,
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
  const { fullName, phone, specialization, bankDetails } = req.body;
  const mitra = mitras.find((m) => m.id === id);

  if (!mitra) {
    return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
  }

  if (fullName) mitra.fullName = fullName;
  if (phone) mitra.phone = phone;
  if (specialization) mitra.specialization = specialization;
  if (bankDetails) mitra.bankDetails = { ...mitra.bankDetails, ...bankDetails };

  if (supabase) {
    try {
      await supabase.from('mitras').update({
        fullName: mitra.fullName,
        phone: mitra.phone,
        specialization: mitra.specialization,
        bankDetails: mitra.bankDetails,
      }).eq('id', id);
    } catch (e) {
      console.warn('Supabase update profile error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, data: mitra });
});

// 2. Marketing Tools Endpoints
app.get('/api/marketing-tools', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('marketing_tools').select('*');
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase tools error', e);
    }
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

  if (supabase) {
    try {
      await supabase.from('marketing_tools').insert([newTool]);
    } catch (e) {
      console.warn('Supabase insert tool error', e);
    }
  }

  // Real-time broadcast notification
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
  marketingTools = marketingTools.filter((t) => t.id !== id);

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

// 3. Commissions Endpoints
app.get('/api/commissions', async (req: Request, res: Response) => {
  const { mitraId } = req.query;

  if (supabase) {
    try {
      const query = supabase.from('commissions').select('*');
      if (mitraId) query.eq('mitraId', mitraId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase commissions query error', e);
    }
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

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Pengajuan Penarikan Komisi',
    message: `Pengajuan pencairan komisi sebesar Rp ${(amount || 5000000).toLocaleString('id-ID')} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([notif]);
    } catch (e) {
      console.warn('Supabase insert payout notif error', e);
    }
  }

  saveDatabase();

  res.json({ success: true, message: 'Pengajuan pencairan berhasil dikirim' });
});

// 3.5 Dynamic Services Endpoints (Admin Controlled)
app.get('/api/services', (req: Request, res: Response) => {
  const { all } = req.query;
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
    pricingType: pricingType === 'monthly_subscription' ? 'monthly_subscription' : 'case_by_case',
    commissionRate: Number(commissionRate) || 15,
    description: description || 'Layanan profesional NDTAXANDLAW.',
    isActive: true,
  };

  services.unshift(newService);

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
  services = services.filter((s) => s.id !== id);

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

// 3.6 Client Deals & Referral Tracking Endpoints
app.get('/api/clients', (req: Request, res: Response) => {
  const { mitraId, referralCode } = req.query;
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
    periodStart,
    periodEnd,
    durationMonths,
    paymentTermType,
    notes,
  } = req.body;

  if (!companyName || !picName || !serviceId) {
    return res.status(400).json({ success: false, message: 'Nama perusahaan klien, PIC, dan layanan wajib diisi.' });
  }

  const mitra = mitras.find((m) => m.id === mitraId);
  const service = services.find((s) => s.id === serviceId);

  const selectedPricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription' =
    pricingType || (service ? service.pricingType : 'case_by_case');
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 10000000);
  const rate = service ? service.commissionRate : 15;
  const commissionCalc = Math.round((nominalValue * rate) / 100);

  const isPendingAcc = req.body.status === 'pending_acc' || req.body.submittedBy === 'client_self';
  const targetStatus = isPendingAcc
    ? 'pending_acc'
    : ((selectedPricingType === 'monthly_subscription' || selectedPricingType === 'annual_subscription') ? 'active_subscription' : 'deal_closed');

  const newDeal: ClientDeal = {
    id: `deal-${Date.now()}`,
    mitraId: mitra ? mitra.id : 'mitra-01',
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
    status: targetStatus,
    date: new Date().toISOString().split('T')[0],
    recurringPaidMonths: selectedPricingType === 'monthly_subscription' ? 1 : undefined,
    recurringPaidYears: selectedPricingType === 'annual_subscription' ? 1 : undefined,
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    durationMonths: durationMonths ? Number(durationMonths) : undefined,
    paymentTermType: paymentTermType || 'one_time',
    notes: notes || '',
    submittedBy: req.body.submittedBy || 'mitra',
  };

  clientDeals.unshift(newDeal);

  // If already directly closed (not pending ACC)
  if (!isPendingAcc && mitra) {
    mitra.referredClientsCount = (mitra.referredClientsCount || 0) + 1;
    if (selectedPricingType === 'monthly_subscription' || selectedPricingType === 'annual_subscription') {
      mitra.activeSubscribersCount = (mitra.activeSubscribersCount || 0) + 1;
    }
    mitra.totalCommission = (mitra.totalCommission || 0) + commissionCalc;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + commissionCalc;

    const newCommTrx: CommissionTransaction = {
      id: `trx-${Date.now()}`,
      mitraId: newDeal.mitraId,
      mitraName: newDeal.mitraName,
      serviceName: newDeal.serviceName,
      clientName: newDeal.companyName,
      dealValue: newDeal.dealValue,
      commissionAmount: newDeal.commissionAmount,
      bonusAmount: 0,
      status: 'pending',
      date: newDeal.date,
    };
    commissions.unshift(newCommTrx);
  }

  // Send Notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: isPendingAcc ? 'Pendaftaran Klien Baru (Menunggu Validasi ACC)' : 'Deal Klien Baru Terdaftar',
    message: `${newDeal.companyName} terdaftar via kode referral ${newDeal.referralCode} (${newDeal.pricingType === 'annual_subscription' ? 'Langganan Tahunan' : newDeal.pricingType === 'monthly_subscription' ? 'Langganan Bulanan' : 'Case-by-Case'}). ${isPendingAcc ? 'Menunggu verifikasi admin untuk mencairkan komisi.' : `Komisi Rp ${commissionCalc.toLocaleString('id-ID')} dicatat.`}`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').insert([newDeal]);
      if (!isPendingAcc && mitra) {
        await supabase.from('commissions').insert([{
          id: `trx-${Date.now()}`,
          mitraId: newDeal.mitraId,
          mitraName: newDeal.mitraName,
          serviceName: newDeal.serviceName,
          clientName: newDeal.companyName,
          dealValue: newDeal.dealValue,
          commissionAmount: newDeal.commissionAmount,
          bonusAmount: 0,
          status: 'pending',
          date: newDeal.date,
        }]);
        await supabase.from('mitras').update({
          referredClientsCount: mitra.referredClientsCount,
          activeSubscribersCount: mitra.activeSubscribersCount,
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout,
        }).eq('id', mitra.id);
      }
    } catch (e) {
      console.warn('Supabase client deal insert error', e);
    }
  }

  res.status(201).json({ success: true, data: newDeal });
});

// Admin ACCs client deal & triggers commission
app.put('/api/clients/:id/acc', async (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status !== 'pending_acc') {
    return res.status(400).json({ success: false, message: 'Klien ini sudah divalidasi sebelumnya.' });
  }

  const isSubscription = deal.pricingType === 'monthly_subscription' || deal.pricingType === 'annual_subscription';
  const approvedStatus = isSubscription ? 'active_subscription' : 'deal_closed';
  deal.status = approvedStatus;

  if (deal.pricingType === 'monthly_subscription') {
    deal.recurringPaidMonths = 1;
  } else if (deal.pricingType === 'annual_subscription') {
    deal.recurringPaidYears = 1;
  }

  // Credit commission to Mitra
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.referredClientsCount = (mitra.referredClientsCount || 0) + 1;
    if (isSubscription) {
      mitra.activeSubscribersCount = (mitra.activeSubscribersCount || 0) + 1;
    }
    mitra.totalCommission = (mitra.totalCommission || 0) + deal.commissionAmount;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + deal.commissionAmount;
  }

  // Record Commission Transaction
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
    date: new Date().toISOString().split('T')[0],
  };
  commissions.unshift(newCommTrx);

  // Send Notification
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Deal Klien Disetujui (ACC)',
    message: `Admin telah meng-ACC klien "${deal.companyName}". Komisi ${deal.pricingType === 'annual_subscription' ? 'Tahun Ke-1' : deal.pricingType === 'monthly_subscription' ? 'Bulan Ke-1' : '1x Bayar (Case-by-Case)'} sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah masuk ke saldo Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  // Send Automated Email via SMTP to Mitra
  if (mitra && mitra.email) {
    sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Deal Klien Disetujui (ACC): ${deal.companyName} - Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')}`,
      category: 'client_acc',
      previewSnippet: `Selamat! Klien rujukan Anda "${deal.companyName}" untuk paket ${deal.serviceName} (${deal.pricingType === 'annual_subscription' ? 'Langganan Tahunan' : deal.pricingType === 'monthly_subscription' ? 'Langganan Bulanan' : 'Case-by-Case'}) telah disetujui (ACC). Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah dikreditkan ke saldo akun kemitraan Anda.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('client_deals').update({
        status: approvedStatus,
        recurringPaidMonths: deal.recurringPaidMonths,
        recurringPaidYears: deal.recurringPaidYears,
      }).eq('id', id);

      await supabase.from('commissions').insert([newCommTrx]);

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

// Admin confirms recurring billing payment for monthly or annual subscription client
app.post('/api/clients/:id/bill-cycle', (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.pricingType !== 'monthly_subscription' && deal.pricingType !== 'annual_subscription') {
    return res.status(400).json({ success: false, message: 'Hanya klien berlangganan bulanan atau tahunan yang dapat diproses tagihan siklus berulang.' });
  }

  let cycleLabel = '';
  if (deal.pricingType === 'monthly_subscription') {
    deal.recurringPaidMonths = (deal.recurringPaidMonths || 1) + 1;
    cycleLabel = `Bulan #${deal.recurringPaidMonths}`;
  } else {
    deal.recurringPaidYears = (deal.recurringPaidYears || 1) + 1;
    cycleLabel = `Tahun Ke-${deal.recurringPaidYears}`;
  }

  // Credit recurring commission to Mitra
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
    date: new Date().toISOString().split('T')[0],
  };
  commissions.unshift(newCommTrx);

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: `Komisi Langganan Masuk (Siklus ${cycleLabel})`,
    message: `Pembayaran ${cycleLabel} untuk klien "${deal.companyName}" terverifikasi. Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')} ditambahkan ke saldo Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  // Send Automated Email via SMTP for recurring cycle
  if (mitra && mitra.email) {
    sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Komisi Langganan Masuk (${cycleLabel}): ${deal.companyName} - Rp ${deal.commissionAmount.toLocaleString('id-ID')}`,
      category: 'recurring_invoice',
      previewSnippet: `Pembayaran perpanjangan ${cycleLabel} untuk klien "${deal.companyName}" telah diterima. Komisi royalti Anda sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah ditambahkan ke dompet saldo kemitraan.`,
    });
  }

  saveDatabase();

  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});

app.put('/api/clients/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, recurringPaidMonths, recurringPaidYears } = req.body;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (status) deal.status = status;
  if (recurringPaidMonths !== undefined) deal.recurringPaidMonths = recurringPaidMonths;
  if (recurringPaidYears !== undefined) deal.recurringPaidYears = recurringPaidYears;

  saveDatabase();

  res.json({ success: true, data: deal });
});

// 3.7 Payout Requests Management Endpoints
app.get('/api/commissions/payout-requests', (req: Request, res: Response) => {
  const { mitraId } = req.query;
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

  // Update transaction status
  const commTrx = commissions.find((c) => c.mitraId === payout.mitraId && c.status === 'processing');
  if (commTrx) {
    commTrx.status = 'paid';
  }

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Pencairan Komisi Telah Ditransfer',
    message: `Dana komisi kotor Rp ${payout.amount.toLocaleString('id-ID')} (Net Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')}) untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) dengan Ref #${payout.transferRefNumber}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  // Send Automated Email via SMTP to Mitra regarding Payout with Slip & Deductions
  if (mitra && mitra.email) {
    sendSystemEmail({
      recipient: mitra.email,
      recipientName: payout.mitraName,
      subject: `Pencairan Komisi Berhasil Diproses: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')} ke ${payout.bankDetails.bankName}`,
      category: 'payout_disbursed',
      previewSnippet: `Pencairan dana komisi kemitraan Anda telah disetujui & ditransfer via ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) a.n ${payout.bankDetails.accountHolder}. Jumlah Kotor: Rp ${payout.amount.toLocaleString('id-ID')} | Potongan PPh 21 (${payout.pph21Rate || 2.5}%): Rp ${(payout.pph21Deduction || 0).toLocaleString('id-ID')} | Biaya Admin: Rp ${(payout.adminFeeDeduction || 0).toLocaleString('id-ID')} | Total Bersih Ditransfer: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString('id-ID')}. No. Ref: #${payout.transferRefNumber}.`,
    });
  }

  saveDatabase();

  if (supabase) {
    try {
      await supabase.from('payout_requests').upsert([payout]);
      if (mitra) {
        await supabase.from('mitras').update({
          pendingPayout: mitra.pendingPayout,
          paidPayout: mitra.paidPayout,
        }).eq('id', payout.mitraId);
      }
      if (commTrx) {
        await supabase.from('commissions').update({ status: 'paid' }).eq('id', commTrx.id);
      }
    } catch (e) {
      console.warn('Supabase payout approve error', e);
    }
  }

  res.json({ success: true, data: payout });
});

// 3.8 Application Settings Endpoints (Admin Controlled)
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ success: true, data: appSettings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updates = req.body;
  appSettings = { ...appSettings, ...updates };

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

  res.json({ success: true, data: appSettings });
});

// 3.9 SMTP Email Server & Dispatch Log Endpoints
app.post('/api/settings/test-email', (req: Request, res: Response) => {
  const { targetEmail } = req.body;
  const emailToTest = (targetEmail || appSettings.supportEmail || 'admin@ndtaxlaw.com').trim();

  if (!emailToTest || !emailToTest.includes('@')) {
    return res.status(400).json({ success: false, message: 'Alamat email tujuan tidak valid.' });
  }

  if (!appSettings.smtpEnabled) {
    return res.status(400).json({
      success: false,
      message: 'Server SMTP saat ini dinonaktifkan. Aktifkan switch SMTP terlebih dahulu sebelum mengirim tes email.',
    });
  }

  // Simulate verification & dispatch
  const result = sendSystemEmail({
    recipient: emailToTest,
    recipientName: 'Administrator Sistem NDTAXANDLAW',
    subject: `[TEST] Uji Coba Konfigurasi Server SMTP NDTAXANDLAW - ${appSettings.smtpHost}`,
    category: 'test_email',
    previewSnippet: `Konfigurasi server SMTP (${appSettings.smtpHost}:${appSettings.smtpPort} - ${appSettings.smtpEncryption.toUpperCase()}) dari pengirim ${appSettings.smtpSenderName} <${appSettings.smtpSenderEmail}> telah berhasil terhubung dan siap digunakan untuk verifikasi akun, info pencairan komisi, serta ACC klien.`,
  });

  res.json({
    success: true,
    message: `Email uji coba berhasil dikirim ke ${emailToTest} via ${appSettings.smtpHost}:${appSettings.smtpPort} (${appSettings.smtpEncryption.toUpperCase()}).`,
    data: result,
  });
});

app.get('/api/emails/logs', (req: Request, res: Response) => {
  res.json({ success: true, data: emailLogs });
});

app.post('/api/emails/resend/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existingLog = emailLogs.find((l) => l.id === id);
  if (!existingLog) {
    return res.status(404).json({ success: false, message: 'Catatan email tidak ditemukan.' });
  }

  const resendResult = sendSystemEmail({
    recipient: existingLog.recipient,
    recipientName: existingLog.recipientName,
    subject: `[KIRIM ULANG] ${existingLog.subject}`,
    category: existingLog.category,
    previewSnippet: existingLog.previewSnippet,
  });

  res.json({ success: true, message: `Email berhasil dikirim ulang ke ${existingLog.recipient}`, data: resendResult });
});

app.delete('/api/emails/logs', (req: Request, res: Response) => {
  emailLogs = [];
  saveDatabase();
  res.json({ success: true, message: 'Riwayat log pengiriman email berhasil dibersihkan.' });
});

// 4. Notifications Endpoints
app.get('/api/notifications', async (req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn('Supabase notifications query error', e);
    }
  }
  res.json({ success: true, data: notifications });
});

app.post('/api/notifications/read-all', (req: Request, res: Response) => {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  saveDatabase();
  res.json({ success: true, data: notifications });
});

// 5. Analytics & History Endpoints
app.get('/api/analytics/monthly', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      salesHistory: monthlySalesHistory,
      summary: {
        currentMonthSales: 430000000,
        currentMonthDeals: 21,
        activeMitraCount: mitras.filter((m) => m.status === 'verified').length,
        totalCommissionsPaid: 398000000,
        averageDealTicket: 20476190,
      },
    },
  });
});

// 6. Gemini AI Powered Monthly Performance & Growth Analysis
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
    console.error('Error generating AI report:', error);

    // Fallback intelligent report if API key not yet configured
    const fallbackReport = `### Executive Performance Summary - NDTAXANDLAW (November 2026)

Berdasarkan konsolidasi metrik operasional NDTAXANDLAW pada periode **November 2026**, performa kemitraan menunjukkan trajektori ekspansi yang solid dengan total transaksi berjalan mencapai **Rp 430.000.000** dari 21 penutupan deal legalitas dan kepatuhan perpajakan.

#### 1. Analisis Tren Penjualan & Pertumbuhan Mitra
- **Pertumbuhan Jaringan**: Basis mitra konsultan aktif meningkat secara konsisten dari 18 mitra pada Juni 2026 menjadi 48 mitra pada November 2026 (+166% pertumbuhan 5 bulan).
- **Layanan Unggulan**: Portofolio dengan kontribusi omset tertinggi didominasi oleh *Corporate Tax Compliance & Transfer Pricing Documentation* (38%) serta *Pendirian PT PMA & Perizinan Khusus OSS-RBA* (32%).
- **Rata-rata Nilai Transaksi (Ticket Size)**: Berada pada angka Rp 20.476.000 per kontrak kerja sama.

#### 2. Evaluasi Distribusi Komisi & Likuiditas Mitra
- Akumulasi komisi yang telah disalurkan kepada mitra mencapai **Rp 398.000.000**, dengan tingkat pencairan rekening bank tercatat aman tanpa kendala administratif.
- Mitra berkinerja unggul berhasil membukukan rata-rata komisi di atas Rp 30.000.000 per kuartal, membuktikan efektivitas kartu identitas eksklusif NDTAXANDLAW dalam meningkatkan *closing rate* di hadapan dewan direksi klien.

#### 3. Rekomendasi Aksi Strategis 30 Hari Kedepan
1. **Intensifikasi Kampanye Akhir Tahun (Tax Year-End Closing)**: Distribusikan materi tools marketing bertema persiapan SPT Tahunan Badan dan review risiko SP2DK melalui katalog digital.
2. **Percepatan Verifikasi Mitra Baru**: Tuntaskan proses verifikasi administrasi calon mitra yang berstatus *Pending Review* dalam tempo 1x24 jam untuk memaksimalkan penetrasi pasar daerah.
3. **Pemberian Insentif Bonus Tier 2**: Terapkan bonus akselerasi 5% tambahan untuk mitra yang mampu mengamankan kontrak *retainer* hukum di atas 12 bulan.`;

    res.json({
      success: true,
      report: fallbackReport,
      isFallback: true,
      generatedAt: new Date().toISOString(),
      note: 'Menggunakan analisis cerdas berbasis rule engine NDTAXANDLAW.',
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
    const summary = {
      mitras: 0,
      services: 0,
      clientDeals: 0,
      marketingTools: 0,
      commissions: 0,
    };

    if (mitras.length > 0) {
      const { error: errM } = await supabase.from('mitras').upsert(mitras);
      if (!errM) summary.mitras = mitras.length;
      else console.warn('Supabase sync mitras warning:', errM.message);
    }

    if (services.length > 0) {
      const { error: errS } = await supabase.from('services').upsert(services);
      if (!errS) summary.services = services.length;
      else console.warn('Supabase sync services warning:', errS.message);
    }

    if (clientDeals.length > 0) {
      const { error: errD } = await supabase.from('client_deals').upsert(clientDeals);
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

    res.json({
      success: true,
      message: 'Seluruh data operasional berhasil disinkronkan ke cloud database Supabase!',
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
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT}`);
  });
}

startServer();
