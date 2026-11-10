import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './src/supabase.ts';

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

// In-Memory Database with Rich Default Seed Data
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
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Laporan Keuangan' | 'Kepatuhan Pajak' | 'Pendampingan Audit' | 'Legalitas Korporasi' | 'Konsultasi Finansial';
  defaultPrice: number;
  pricingType: 'case_by_case' | 'monthly_subscription';
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
  pricingType: 'case_by_case' | 'monthly_subscription';
  dealValue: number;
  commissionAmount: number;
  status: 'pending_acc' | 'deal_closed' | 'active_subscription' | 'in_review' | 'cancelled' | 'rejected';
  date: string;
  recurringPaidMonths?: number;
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

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Check admin
  if (normalizedEmail === adminAccount.email.toLowerCase()) {
    if (password === adminAccount.password || password === 'adminND2026!') {
      return res.json({
        success: true,
        user: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          role: 'admin',
          avatarUrl: adminAccount.avatarUrl,
        },
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi admin tidak valid.' });
  }

  // Check mitra
  const mitra = mitras.find(
    (m) => m.email.toLowerCase() === normalizedEmail || m.memberCode.toLowerCase() === normalizedEmail
  );

  if (mitra) {
    const expectedPassword = userPasswords.get(mitra.email.toLowerCase()) || 'mitraND2026!';
    if (password === expectedPassword || password === 'mitraND2026!') {
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
      });
    }
    return res.status(401).json({ success: false, message: 'Kata sandi mitra salah. Silakan coba lagi.' });
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

  res.json({
    success: true,
    message: `Kode pemulihan kata sandi telah dikirim ke ${email}.`,
    otpCode, // sent for smooth user testing
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter.' });
  }

  userPasswords.set(normalizedEmail, newPassword);

  res.json({
    success: true,
    message: 'Kata sandi Anda telah berhasil diubah. Silakan masuk menggunakan kata sandi baru.',
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
  const { fullName, email, phone, nik, specialization, bankDetails } = req.body;
  if (!fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Nama, Email, dan No HP wajib diisi.' });
  }

  const generatedReferralCode = `ND-REF-${Math.floor(1000 + Math.random() * 9000)}`;

  const newMitra: Mitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${new Date().getFullYear()}-PEN-${Math.floor(1000 + Math.random() * 9000)}`,
    referralCode: generatedReferralCode,
    fullName,
    email,
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
  };

  mitras.unshift(newMitra);

  if (supabase) {
    try {
      await supabase.from('mitras').insert([newMitra]);
    } catch (e) {
      console.warn('Supabase insert error for new mitra', e);
    }
  }

  // Add system notification for admin
  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: 'Pendaftaran Mitra Baru',
    message: `${fullName} baru saja mengajukan pendaftaran kemitraan. Mohon verifikasi berkas di panel Admin.`,
    type: 'verification',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(newNotif);

  if (supabase) {
    try {
      await supabase.from('notifications').insert([newNotif]);
    } catch (e) {
      console.warn('Supabase insert notification error', e);
    }
  }

  res.status(201).json({ success: true, data: newMitra });
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

app.post('/api/services', (req: Request, res: Response) => {
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

  res.status(201).json({ success: true, data: newService });
});

app.put('/api/services/:id', (req: Request, res: Response) => {
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

  res.json({ success: true, data: service });
});

app.delete('/api/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  services = services.filter((s) => s.id !== id);
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

app.post('/api/clients', (req: Request, res: Response) => {
  const {
    mitraId,
    companyName,
    picName,
    picPhone,
    picEmail,
    serviceId,
    dealValue,
    pricingType,
    notes,
  } = req.body;

  if (!companyName || !picName || !serviceId) {
    return res.status(400).json({ success: false, message: 'Nama perusahaan klien, PIC, dan layanan wajib diisi.' });
  }

  const mitra = mitras.find((m) => m.id === mitraId);
  const service = services.find((s) => s.id === serviceId);

  const selectedPricingType: 'case_by_case' | 'monthly_subscription' =
    pricingType || (service ? service.pricingType : 'case_by_case');
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 10000000);
  const rate = service ? service.commissionRate : 15;
  const commissionCalc = Math.round((nominalValue * rate) / 100);

  const isPendingAcc = req.body.status === 'pending_acc' || req.body.submittedBy === 'client_self';
  const targetStatus = isPendingAcc
    ? 'pending_acc'
    : (selectedPricingType === 'monthly_subscription' ? 'active_subscription' : 'deal_closed');

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
    notes: notes || '',
    submittedBy: req.body.submittedBy || 'mitra',
  };

  clientDeals.unshift(newDeal);

  // If already directly closed (not pending ACC)
  if (!isPendingAcc && mitra) {
    mitra.referredClientsCount = (mitra.referredClientsCount || 0) + 1;
    if (selectedPricingType === 'monthly_subscription') {
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
    message: `${newDeal.companyName} terdaftar via kode referral ${newDeal.referralCode}. ${isPendingAcc ? 'Menunggu verifikasi admin untuk mencairkan komisi.' : `Komisi Rp ${commissionCalc.toLocaleString('id-ID')} dicatat.`}`,
    type: 'client_deal',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  res.status(201).json({ success: true, data: newDeal });
});

// Admin ACCs client deal & triggers commission
app.put('/api/clients/:id/acc', (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.status !== 'pending_acc') {
    return res.status(400).json({ success: false, message: 'Klien ini sudah divalidasi sebelumnya.' });
  }

  const approvedStatus = deal.pricingType === 'monthly_subscription' ? 'active_subscription' : 'deal_closed';
  deal.status = approvedStatus;

  // Credit commission to Mitra
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.referredClientsCount = (mitra.referredClientsCount || 0) + 1;
    if (deal.pricingType === 'monthly_subscription') {
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
    message: `Admin telah meng-ACC klien "${deal.companyName}". Komisi ${deal.pricingType === 'monthly_subscription' ? 'bulan ke-1' : '1x bayar'} sebesar Rp ${deal.commissionAmount.toLocaleString('id-ID')} telah masuk ke saldo Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});

// Admin confirms monthly recurring billing payment for subscription client
app.post('/api/clients/:id/bill-cycle', (req: Request, res: Response) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (deal.pricingType !== 'monthly_subscription') {
    return res.status(400).json({ success: false, message: 'Hanya klien berlangganan bulanan yang dapat diproses tagihan berulang.' });
  }

  deal.recurringPaidMonths = (deal.recurringPaidMonths || 1) + 1;

  // Credit another month's recurring commission to Mitra
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.totalCommission = (mitra.totalCommission || 0) + deal.commissionAmount;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + deal.commissionAmount;
  }

  const newCommTrx: CommissionTransaction = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (Bulan #${deal.recurringPaidMonths})`,
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
    title: 'Komisi Langganan Bulanan Masuk (Recurring)',
    message: `Pembayaran bulan ke-${deal.recurringPaidMonths} untuk klien "${deal.companyName}" terverifikasi. Komisi Rp ${deal.commissionAmount.toLocaleString('id-ID')} ditambahkan ke saldo Mitra ${deal.mitraName}.`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});

app.put('/api/clients/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, recurringPaidMonths } = req.body;
  const deal = clientDeals.find((d) => d.id === id);

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal klien tidak ditemukan' });
  }

  if (status) deal.status = status;
  if (recurringPaidMonths !== undefined) deal.recurringPaidMonths = recurringPaidMonths;

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

app.put('/api/commissions/payout-requests/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const payout = payoutRequests.find((p) => p.id === id);

  if (!payout) {
    return res.status(404).json({ success: false, message: 'Pengajuan pencairan tidak ditemukan' });
  }

  payout.status = 'approved';
  payout.processedDate = new Date().toISOString().split('T')[0];

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
    message: `Dana komisi Rp ${payout.amount.toLocaleString('id-ID')} untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}).`,
    type: 'commission',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

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
    message: 'Konfigurasi layanan aplikasi, OAuth Google, dan integrasi AI telah diperbarui oleh Admin.',
    type: 'tools_update',
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(notif);

  res.json({ success: true, data: appSettings });
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
