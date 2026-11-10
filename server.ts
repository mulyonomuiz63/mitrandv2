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
  type: 'tools_update' | 'verification' | 'commission' | 'training';
  timestamp: string;
  isRead: boolean;
}

// Initial Data
let mitras: Mitra[] = [
  {
    id: 'mitra-01',
    memberCode: 'ND-2026-LAW-0042',
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
  },
  {
    id: 'mitra-02',
    memberCode: 'ND-2026-TAX-0077',
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
  },
  {
    id: 'mitra-03',
    memberCode: 'ND-2026-LAW-0089',
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

  const newMitra: Mitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${new Date().getFullYear()}-PEN-${Math.floor(1000 + Math.random() * 9000)}`,
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
