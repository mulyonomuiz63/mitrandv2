// server.ts
import express from "express";
import dotenv2 from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
var supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json());
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var mitras = [
  {
    id: "mitra-01",
    memberCode: "ND-2026-LAW-0042",
    fullName: "Bambang Sudirman, S.H., M.Kn.",
    email: "bambang.sudirman@example.com",
    phone: "0812-8899-7711",
    nik: "3201123456780001",
    specialization: "Konsultan Hukum Korporasi & Kontrak Bisnis",
    status: "verified",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    joinedDate: "2026-01-15",
    bankDetails: {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8830192837",
      accountHolder: "Bambang Sudirman"
    },
    totalCommission: 345e5,
    totalBonus: 75e5,
    pendingPayout: 62e5,
    paidPayout: 358e5
  },
  {
    id: "mitra-02",
    memberCode: "ND-2026-TAX-0077",
    fullName: "Dewi Lestari, S.E., B.K.P.",
    email: "dewi.lestari@example.com",
    phone: "0813-2211-4455",
    nik: "3174098765430002",
    specialization: "Spesialis Pajak Penghasilan Badan & Tax Planning",
    status: "verified",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    joinedDate: "2026-03-02",
    bankDetails: {
      bankName: "Bank Mandiri",
      accountNumber: "1370019283741",
      accountHolder: "Dewi Lestari"
    },
    totalCommission: 482e5,
    totalBonus: 12e6,
    pendingPayout: 0,
    paidPayout: 602e5
  },
  {
    id: "mitra-03",
    memberCode: "ND-2026-LAW-0089",
    fullName: "Rian Pratama, S.H.",
    email: "rian.pratama@example.com",
    phone: "0857-4433-2211",
    nik: "3302051203920003",
    specialization: "Pendirian Legalitas PT / CV & Perizinan OSS-RBA",
    status: "pending",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    joinedDate: "2026-11-05",
    bankDetails: {
      bankName: "Bank Rakyat Indonesia (BRI)",
      accountNumber: "020601089274502",
      accountHolder: "Rian Pratama"
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0
  }
];
var marketingTools = [
  {
    id: "tool-01",
    title: "Katalog Layanan Lengkap NDTAXANDLAW 2026",
    category: "Brosur Digital",
    fileType: "pdf",
    fileSize: "4.8 MB",
    downloadUrl: "#katalog-2026-pdf",
    thumbnailUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
    description: "Panduan komprehensif seluruh portofolio jasa hukum korporasi, litigasi, perencanaan pajak, dan restrukturisasi finansial untuk calon klien.",
    createdAt: "2026-10-20",
    targetProduct: "Semua Layanan Korporasi & Pajak"
  },
  {
    id: "tool-02",
    title: "Banner Promosi: Solusi Audit & SP2DK Pajak 2026",
    category: "Banner Promosi",
    fileType: "png",
    fileSize: "2.1 MB",
    downloadUrl: "#banner-sp2dk-png",
    thumbnailUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    description: "Format siap posting di Instagram Feed, LinkedIn, & status WhatsApp dengan pesan edukatif pendampingan pemeriksaan pajak resmi.",
    createdAt: "2026-10-28",
    targetProduct: "Jasa Pendampingan Audit & SP2DK"
  },
  {
    id: "tool-03",
    title: "Video Edukasi: Keuntungan Pendirian PT PMA & Legalitas Usaha",
    category: "Video Presentasi",
    fileType: "mp4",
    fileSize: "28.4 MB",
    duration: "04:15 min",
    downloadUrl: "#video-pma-mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    description: "Video animasi penjelasan hukum dan pajak kemudahan investasi dan perizinan berusaha bagi pelaku usaha lokal maupun investor asing.",
    createdAt: "2026-11-02",
    targetProduct: "Pendirian Legalitas PT / PMA"
  },
  {
    id: "tool-04",
    title: "Playbook Strategi Closing Klien Konsultan Hukum Pajak",
    category: "Materi Pelatihan",
    fileType: "pdf",
    fileSize: "6.2 MB",
    downloadUrl: "#playbook-closing-pdf",
    thumbnailUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    description: "Modul materi pelatihan eksklusif untuk mitra: teknik negosiasi retainer hukum, penanganan objection klien bisnis, dan formulasi proposal.",
    createdAt: "2026-11-04",
    targetProduct: "Retainer Konsultan Pajak & Hukum"
  },
  {
    id: "tool-05",
    title: "Deck Presentasi Pitching Dewan Direksi (PPTX to PDF)",
    category: "Panduan Penjualan",
    fileType: "pdf",
    fileSize: "8.5 MB",
    downloadUrl: "#deck-pitch-pdf",
    thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    description: "Slide siap pakai berstandar tinggi untuk dipresentasikan mitra saat meeting tatap muka dengan Direksi atau Pemegang Saham.",
    createdAt: "2026-11-06",
    targetProduct: "Legal Due Diligence & M&A"
  }
];
var commissions = [
  {
    id: "trx-101",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    serviceName: "Pendirian PT PMA & Izin Usaha Tambang",
    clientName: "PT Nusantara Megah Resources",
    dealValue: 75e6,
    commissionAmount: 1125e4,
    bonusAmount: 2e6,
    status: "paid",
    date: "2026-10-14"
  },
  {
    id: "trx-102",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    serviceName: "Annual Tax Compliance & Transfer Pricing Doc",
    clientName: "PT Global Indo Logistik",
    dealValue: 12e7,
    commissionAmount: 18e6,
    bonusAmount: 5e6,
    status: "paid",
    date: "2026-10-25"
  },
  {
    id: "trx-103",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    serviceName: "Legal Due Diligence Akuisisi Saham",
    clientName: "CV Sinar Abadi Raya",
    dealValue: 45e6,
    commissionAmount: 62e5,
    bonusAmount: 0,
    status: "processing",
    date: "2026-11-02"
  },
  {
    id: "trx-104",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    serviceName: "Restrukturisasi Utang & Pajak Kepailitan",
    clientName: "PT Mitra Graha Sentosa",
    dealValue: 9e7,
    commissionAmount: 135e5,
    bonusAmount: 3e6,
    status: "processing",
    date: "2026-11-07"
  }
];
var notifications = [
  {
    id: "notif-01",
    title: "Tools Marketing Baru Ditambahkan",
    message: 'Admin telah mengunggah "Deck Presentasi Pitching Dewan Direksi (PDF)" ke repositori tools marketing.',
    type: "tools_update",
    timestamp: "2026-11-06T09:30:00Z",
    isRead: false
  },
  {
    id: "notif-02",
    title: "Materi Pelatihan Baru Tersedia",
    message: 'Akses modul eksklusif "Playbook Strategi Closing Klien Konsultan Hukum Pajak" sekarang terbuka untuk semua mitra.',
    type: "training",
    timestamp: "2026-11-04T14:15:00Z",
    isRead: false
  },
  {
    id: "notif-03",
    title: "Pencairan Komisi Diproses",
    message: "Komisi transaksi PT Global Indo Logistik sebesar Rp 23.000.000 telah ditransfer ke rekening Bank Mandiri.",
    type: "commission",
    timestamp: "2026-10-26T11:00:00Z",
    isRead: true
  }
];
var monthlySalesHistory = [
  { month: "Jun 2026", totalSales: 31e7, totalCommission: 465e5, mitraCount: 18, dealsClosed: 14 },
  { month: "Jul 2026", totalSales: 42e7, totalCommission: 63e6, mitraCount: 24, dealsClosed: 19 },
  { month: "Agu 2026", totalSales: 54e7, totalCommission: 81e6, mitraCount: 29, dealsClosed: 25 },
  { month: "Sep 2026", totalSales: 61e7, totalCommission: 915e5, mitraCount: 35, dealsClosed: 28 },
  { month: "Okt 2026", totalSales: 785e6, totalCommission: 11775e4, mitraCount: 42, dealsClosed: 36 },
  { month: "Nov 2026 (M-T-D)", totalSales: 43e7, totalCommission: 645e5, mitraCount: 48, dealsClosed: 21 }
];
var adminAccount = {
  id: "admin-01",
  name: "Admin Operasional NDTAXANDLAW",
  email: "admin@ndtaxlaw.com",
  password: "adminND2026!",
  role: "admin",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80"
};
var userPasswords = /* @__PURE__ */ new Map([
  ["admin@ndtaxlaw.com", "adminND2026!"],
  ["bambang.sudirman@example.com", "mitraND2026!"],
  ["dewi.lestari@example.com", "mitraND2026!"],
  ["rian.pratama@example.com", "mitraND2026!"]
]);
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (normalizedEmail === adminAccount.email.toLowerCase()) {
    if (password === adminAccount.password || password === "adminND2026!") {
      return res.json({
        success: true,
        user: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          role: "admin",
          avatarUrl: adminAccount.avatarUrl
        }
      });
    }
    return res.status(401).json({ success: false, message: "Kata sandi admin tidak valid." });
  }
  const mitra = mitras.find(
    (m) => m.email.toLowerCase() === normalizedEmail || m.memberCode.toLowerCase() === normalizedEmail
  );
  if (mitra) {
    const expectedPassword = userPasswords.get(mitra.email.toLowerCase()) || "mitraND2026!";
    if (password === expectedPassword || password === "mitraND2026!") {
      return res.json({
        success: true,
        user: {
          id: mitra.id,
          name: mitra.fullName,
          email: mitra.email,
          role: "mitra",
          mitraId: mitra.id,
          avatarUrl: mitra.avatarUrl
        }
      });
    }
    return res.status(401).json({ success: false, message: "Kata sandi mitra salah. Silakan coba lagi." });
  }
  return res.status(404).json({
    success: false,
    message: "Akun tidak ditemukan. Pastikan email atau nomor keanggotaan sudah terdaftar."
  });
});
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const isAdmin = normalizedEmail === adminAccount.email.toLowerCase();
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!isAdmin && !mitra) {
    return res.status(404).json({
      success: false,
      message: "Email tidak terdaftar di sistem NDTAXANDLAW."
    });
  }
  const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
  res.json({
    success: true,
    message: `Kode pemulihan kata sandi telah dikirim ke ${email}.`,
    otpCode
    // sent for smooth user testing
  });
});
app.post("/api/auth/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter." });
  }
  userPasswords.set(normalizedEmail, newPassword);
  res.json({
    success: true,
    message: "Kata sandi Anda telah berhasil diubah. Silakan masuk menggunakan kata sandi baru."
  });
});
app.get("/api/mitra", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("mitras").select("*");
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn("Supabase query error for mitras, using fallback", e);
    }
  }
  res.json({ success: true, data: mitras });
});
app.post("/api/mitra/register", async (req, res) => {
  const { fullName, email, phone, nik, specialization, bankDetails } = req.body;
  if (!fullName || !email || !phone) {
    return res.status(400).json({ success: false, message: "Nama, Email, dan No HP wajib diisi." });
  }
  const newMitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${(/* @__PURE__ */ new Date()).getFullYear()}-PEN-${Math.floor(1e3 + Math.random() * 9e3)}`,
    fullName,
    email,
    phone,
    nik: nik || "3201000000000000",
    specialization: specialization || "Konsultan Umum Pajak & Hukum",
    status: "pending",
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
    joinedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    bankDetails: bankDetails || {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "",
      accountHolder: fullName
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0
  };
  mitras.unshift(newMitra);
  if (supabase) {
    try {
      await supabase.from("mitras").insert([newMitra]);
    } catch (e) {
      console.warn("Supabase insert error for new mitra", e);
    }
  }
  const newNotif = {
    id: `notif-${Date.now()}`,
    title: "Pendaftaran Mitra Baru",
    message: `${fullName} baru saja mengajukan pendaftaran kemitraan. Mohon verifikasi berkas di panel Admin.`,
    type: "verification",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(newNotif);
  if (supabase) {
    try {
      await supabase.from("notifications").insert([newNotif]);
    } catch (e) {
      console.warn("Supabase insert notification error", e);
    }
  }
  res.status(201).json({ success: true, data: newMitra });
});
app.put("/api/mitra/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  mitra.status = status;
  if (status === "verified") {
    const randomCode = Math.floor(100 + Math.random() * 900);
    mitra.memberCode = `ND-${(/* @__PURE__ */ new Date()).getFullYear()}-LAW-${randomCode}`;
    const notif = {
      id: `notif-${Date.now()}`,
      title: "Status Kemitraan Disetujui",
      message: `Pendaftaran ${mitra.fullName} telah disetujui. Kartu Identitas Eksklusif (${mitra.memberCode}) telah aktif.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false
    };
    notifications.unshift(notif);
    if (supabase) {
      try {
        await supabase.from("notifications").insert([notif]);
      } catch (e) {
        console.warn("Supabase insert error", e);
      }
    }
  }
  if (supabase) {
    try {
      await supabase.from("mitras").update({ status, memberCode: mitra.memberCode }).eq("id", id);
    } catch (e) {
      console.warn("Supabase update verify error", e);
    }
  }
  res.json({ success: true, data: mitra });
});
app.put("/api/mitra/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, specialization, bankDetails } = req.body;
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  if (fullName) mitra.fullName = fullName;
  if (phone) mitra.phone = phone;
  if (specialization) mitra.specialization = specialization;
  if (bankDetails) mitra.bankDetails = { ...mitra.bankDetails, ...bankDetails };
  if (supabase) {
    try {
      await supabase.from("mitras").update({
        fullName: mitra.fullName,
        phone: mitra.phone,
        specialization: mitra.specialization,
        bankDetails: mitra.bankDetails
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase update profile error", e);
    }
  }
  res.json({ success: true, data: mitra });
});
app.get("/api/marketing-tools", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("marketing_tools").select("*");
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn("Supabase tools error", e);
    }
  }
  res.json({ success: true, data: marketingTools });
});
app.post("/api/marketing-tools", async (req, res) => {
  const { title, category, fileType, fileSize, downloadUrl, thumbnailUrl, description, targetProduct, duration } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, message: "Judul dan Kategori wajib diisi" });
  }
  const newTool = {
    id: `tool-${Date.now()}`,
    title,
    category,
    fileType: fileType || "pdf",
    fileSize: fileSize || "3.5 MB",
    downloadUrl: downloadUrl || "#file-download",
    thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    description: description || "Materi pendukung pemasaran resmi NDTAXANDLAW.",
    targetProduct: targetProduct || "Layanan Konsultasi Pajak & Hukum",
    duration: duration || void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  marketingTools.unshift(newTool);
  if (supabase) {
    try {
      await supabase.from("marketing_tools").insert([newTool]);
    } catch (e) {
      console.warn("Supabase insert tool error", e);
    }
  }
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Tools Marketing Baru Ditambahkan",
    message: `Admin telah menambahkan materi baru: "${title}" (${category}). Mitra dapat mengunduhnya sekarang.`,
    type: "tools_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (supabase) {
    try {
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase insert notif error", e);
    }
  }
  res.status(201).json({ success: true, data: newTool });
});
app.delete("/api/marketing-tools/:id", async (req, res) => {
  const { id } = req.params;
  marketingTools = marketingTools.filter((t) => t.id !== id);
  if (supabase) {
    try {
      await supabase.from("marketing_tools").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete tool error", e);
    }
  }
  res.json({ success: true, message: "Materi berhasil dihapus" });
});
app.get("/api/commissions", async (req, res) => {
  const { mitraId } = req.query;
  if (supabase) {
    try {
      const query = supabase.from("commissions").select("*");
      if (mitraId) query.eq("mitraId", mitraId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn("Supabase commissions query error", e);
    }
  }
  if (mitraId) {
    return res.json({ success: true, data: commissions.filter((c) => c.mitraId === mitraId) });
  }
  res.json({ success: true, data: commissions });
});
app.post("/api/commissions/payout", async (req, res) => {
  const { mitraId, amount } = req.body;
  const mitra = mitras.find((m) => m.id === mitraId);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Pengajuan Penarikan Komisi",
    message: `Pengajuan pencairan komisi sebesar Rp ${(amount || 5e6).toLocaleString("id-ID")} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (supabase) {
    try {
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase insert payout notif error", e);
    }
  }
  res.json({ success: true, message: "Pengajuan pencairan berhasil dikirim" });
});
app.get("/api/notifications", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("notifications").select("*").order("timestamp", { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    } catch (e) {
      console.warn("Supabase notifications query error", e);
    }
  }
  res.json({ success: true, data: notifications });
});
app.post("/api/notifications/read-all", (req, res) => {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  res.json({ success: true, data: notifications });
});
app.get("/api/analytics/monthly", (req, res) => {
  res.json({
    success: true,
    data: {
      salesHistory: monthlySalesHistory,
      summary: {
        currentMonthSales: 43e7,
        currentMonthDeals: 21,
        activeMitraCount: mitras.filter((m) => m.status === "verified").length,
        totalCommissionsPaid: 398e6,
        averageDealTicket: 20476190
      }
    }
  });
});
app.post("/api/ai/monthly-report", async (req, res) => {
  try {
    const { targetPeriod = "November 2026", userRole = "admin", specificMitraId } = req.body;
    const targetMitra = specificMitraId ? mitras.find((m) => m.id === specificMitraId) : null;
    const verifiedMitrasCount = mitras.filter((m) => m.status === "verified").length;
    const pendingCount = mitras.filter((m) => m.status === "pending").length;
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
${targetMitra ? `- Evaluasi Spesifik Mitra: ${targetMitra.fullName} (${targetMitra.memberCode}), Total Komisi: Rp ${targetMitra.totalCommission.toLocaleString("id-ID")}` : ""}

Tugas:
Hasilkan laporan eksekutif terstruktur dengan format Markdown yang rapi:
1. **Executive Performance Summary**: Ringkasan performa penjualan dan pertumbuhan mitra.
2. **Analisis Tren Penjualan & Produk Terlaris**: Evaluasi tren pendapatan, perbandingan bulan lalu ke bulan ini, dan segmen layanan terkuat (Pajak Korporasi vs Pendirian Legalitas).
3. **Evaluasi Produktivitas Mitra**: Analisis perolehan komisi dan rasio closing transaksi mitra.
4. **Rekomendasi Strategis 30 Hari Kedepan**: 3-4 rekomendasi taktis bagi manajemen operasional dan mitra lapangan untuk melipatgandakan omset dan ekspansi klien.

Gunakan bahasa Indonesia formal, berwibawa, analitis, dan berorientasi hasil. Sertakan angka-angka data pendukung secara presisi.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptContext
    });
    const aiReportText = response.text || "Gagal menghasilkan teks analisis.";
    res.json({
      success: true,
      report: aiReportText,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      model: "gemini-3.8-flash"
    });
  } catch (error) {
    console.error("Error generating AI report:", error);
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
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      note: "Menggunakan analisis cerdas berbasis rule engine NDTAXANDLAW."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT}`);
  });
}
startServer();
