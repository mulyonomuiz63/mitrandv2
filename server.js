// server.ts
import express from "express";
import dotenv2 from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
var DEFAULT_SUPABASE_URL = "https://wopbuflusryycanyfqop.supabase.co";
var DEFAULT_SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcGJ1Zmx1c3J5eWNhbnlmcW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI3MTk0OCwiZXhwIjoyMTA5ODQ3OTQ4fQ.ENSCRB0h0EysxzjRSJWHWm7KKAk555GRaW20itnd1ko";
var supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_SERVICE_ROLE;
var supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
var isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey);
};
var getSupabaseConfig = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl,
    hasKey: Boolean(supabaseKey)
  };
};
var FULL_IDEMPOTENT_SCHEMA_SQL = `-- ====================================================================
-- SKEMA LENGKAP & MIGRASI KOLOM OTOMATIS SUPABASE NDTAXANDLAW (12 TABEL)
-- Aman dijalankan berulang kali (Idempotent: CREATE IF NOT EXISTS & ADD COLUMN IF NOT EXISTS)
-- ====================================================================

-- 1. TABEL MITRA
CREATE TABLE IF NOT EXISTS public.mitras (
    id TEXT PRIMARY KEY,
    "memberCode" TEXT,
    "referralCode" TEXT,
    "fullName" TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    nik TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'pending',
    "avatarUrl" TEXT,
    gender TEXT,
    "joinedDate" TEXT,
    "bankDetails" JSONB,
    "totalCommission" NUMERIC DEFAULT 0,
    "totalBonus" NUMERIC DEFAULT 0,
    "pendingPayout" NUMERIC DEFAULT 0,
    "paidPayout" NUMERIC DEFAULT 0,
    "referredClientsCount" INTEGER DEFAULT 0,
    "activeSubscribersCount" INTEGER DEFAULT 0,
    "emailVerified" BOOLEAN DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TEXT;

-- 2. TABEL KATALOG LAYANAN (SERVICES)
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    "defaultPrice" NUMERIC NOT NULL,
    "pricingType" TEXT DEFAULT 'case_by_case',
    "commissionRate" NUMERIC DEFAULT 15,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL DEAL KLIEN (CLIENT DEALS)
CREATE TABLE IF NOT EXISTS public.client_deals (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "referralCode" TEXT,
    "companyName" TEXT NOT NULL,
    "picName" TEXT NOT NULL,
    "picPhone" TEXT,
    "picEmail" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "pricingType" TEXT,
    "dealValue" NUMERIC NOT NULL,
    "commissionAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending_acc',
    date TEXT,
    "recurringPaidMonths" INTEGER,
    "recurringPaidYears" INTEGER,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "durationMonths" INTEGER,
    "paymentTermType" TEXT DEFAULT 'one_time',
    notes TEXT,
    "submittedBy" TEXT DEFAULT 'mitra',
    "subscriptionStartDate" TEXT,
    "billingDayOfMonth" INTEGER,
    "nextBillingDate" TEXT,
    "lastBilledDate" TEXT,
    "isBillingDue" BOOLEAN DEFAULT false,
    "terminatedAt" TEXT,
    "terminationReason" TEXT,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "billingDayOfMonth" INTEGER;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "nextBillingDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "lastBilledDate" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "isBillingDue" BOOLEAN DEFAULT false;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminatedAt" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminationReason" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectedAt" TEXT;
ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- 4. TABEL TRANSAKSI KOMISI (COMMISSIONS)
CREATE TABLE IF NOT EXISTS public.commissions (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "serviceName" TEXT,
    "clientName" TEXT,
    "dealValue" NUMERIC DEFAULT 0,
    "commissionAmount" NUMERIC DEFAULT 0,
    "bonusAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL PENGAJUAN PENCAIRAN KOMISI (PAYOUT REQUESTS)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "memberCode" TEXT,
    amount NUMERIC NOT NULL,
    "bankDetails" JSONB,
    "requestDate" TEXT,
    "processedDate" TEXT,
    status TEXT DEFAULT 'pending',
    "pph21Deduction" NUMERIC DEFAULT 0,
    "pph21Rate" NUMERIC DEFAULT 0,
    "adminFeeDeduction" NUMERIC DEFAULT 0,
    "netAmountTransferred" NUMERIC DEFAULT 0,
    "proofFileUrl" TEXT,
    "proofFileName" TEXT,
    "transferRefNumber" TEXT,
    "disbursedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL MATERI PROMOSI & PELATIHAN (MARKETING TOOLS)
CREATE TABLE IF NOT EXISTS public.marketing_tools (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" TEXT,
    "downloadUrl" TEXT,
    "thumbnailUrl" TEXT,
    description TEXT,
    "createdAt" TEXT,
    "targetProduct" TEXT,
    duration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL NOTIFIKASI SISTEM (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    timestamp TEXT,
    "isRead" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PENGATURAN SISTEM (APP SETTINGS)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'config_primary',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL KATA SANDI PENGGUNA TERENKRIPSI (USER PASSWORDS)
CREATE TABLE IF NOT EXISTS public.user_passwords (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_passwords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 10. TABEL MANAJEMEN ROLE DINAMIS (SYSTEM ROLES)
CREATE TABLE IF NOT EXISTS public.system_roles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "portalView" TEXT DEFAULT 'mitra',
    "defaultTab" TEXT DEFAULT 'idcard',
    "allowedTabs" JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    "isSystem" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL LOG AKTIVITAS AUDIT (ACTIVITY LOGS)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actionType" TEXT NOT NULL,
    operation TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABEL LOG PENGIRIMAN EMAIL SMTP (EMAIL LOGS)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    "smtpResponse" TEXT,
    timestamp TEXT NOT NULL,
    "previewSnippet" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN RLS & KEBIJAKAN AKSES API (AMAN DIJALANKAN ULANG)
ALTER TABLE public.mitras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Anon Access mitras" ON public.mitras;
CREATE POLICY "Public Anon Access mitras" ON public.mitras FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access services" ON public.services;
CREATE POLICY "Public Anon Access services" ON public.services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access client_deals" ON public.client_deals;
CREATE POLICY "Public Anon Access client_deals" ON public.client_deals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access commissions" ON public.commissions;
CREATE POLICY "Public Anon Access commissions" ON public.commissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access payout_requests" ON public.payout_requests;
CREATE POLICY "Public Anon Access payout_requests" ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access marketing_tools" ON public.marketing_tools;
CREATE POLICY "Public Anon Access marketing_tools" ON public.marketing_tools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access notifications" ON public.notifications;
CREATE POLICY "Public Anon Access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access app_settings" ON public.app_settings;
CREATE POLICY "Public Anon Access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access user_passwords" ON public.user_passwords;
CREATE POLICY "Public Anon Access user_passwords" ON public.user_passwords FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access system_roles" ON public.system_roles;
CREATE POLICY "Public Anon Access system_roles" ON public.system_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access activity_logs" ON public.activity_logs;
CREATE POLICY "Public Anon Access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Anon Access email_logs" ON public.email_logs;
CREATE POLICY "Public Anon Access email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);`;
var TABLE_DEFINITIONS = [
  {
    table: "mitras",
    label: "Data Mitra Konsultan",
    createSql: `CREATE TABLE IF NOT EXISTS public.mitras (
    id TEXT PRIMARY KEY,
    "memberCode" TEXT,
    "referralCode" TEXT,
    "fullName" TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    nik TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'pending',
    "avatarUrl" TEXT,
    gender TEXT,
    "joinedDate" TEXT,
    "bankDetails" JSONB,
    "totalCommission" NUMERIC DEFAULT 0,
    "totalBonus" NUMERIC DEFAULT 0,
    "pendingPayout" NUMERIC DEFAULT 0,
    "paidPayout" NUMERIC DEFAULT 0,
    "referredClientsCount" INTEGER DEFAULT 0,
    "activeSubscribersCount" INTEGER DEFAULT 0,
    "emailVerified" BOOLEAN DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.mitras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access mitras" ON public.mitras;
CREATE POLICY "Public Anon Access mitras" ON public.mitras FOR ALL USING (true) WITH CHECK (true);`,
    columnsToVerify: [
      { name: "gender", alterSql: "ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS gender TEXT;" },
      { name: "emailVerified", alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;' },
      { name: "verificationToken", alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;' },
      { name: "verificationTokenExpiry", alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TEXT;' }
    ]
  },
  {
    table: "services",
    label: "Katalog Layanan Firma",
    createSql: `CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    "defaultPrice" NUMERIC NOT NULL,
    "pricingType" TEXT DEFAULT 'case_by_case',
    "commissionRate" NUMERIC DEFAULT 15,
    description TEXT,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access services" ON public.services;
CREATE POLICY "Public Anon Access services" ON public.services FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "client_deals",
    label: "Transaksi & Deal Klien",
    createSql: `CREATE TABLE IF NOT EXISTS public.client_deals (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "referralCode" TEXT,
    "companyName" TEXT NOT NULL,
    "picName" TEXT NOT NULL,
    "picPhone" TEXT,
    "picEmail" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "pricingType" TEXT,
    "dealValue" NUMERIC NOT NULL,
    "commissionAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending_acc',
    date TEXT,
    "recurringPaidMonths" INTEGER,
    "recurringPaidYears" INTEGER,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "durationMonths" INTEGER,
    "paymentTermType" TEXT DEFAULT 'one_time',
    notes TEXT,
    "submittedBy" TEXT DEFAULT 'mitra',
    "subscriptionStartDate" TEXT,
    "billingDayOfMonth" INTEGER,
    "nextBillingDate" TEXT,
    "lastBilledDate" TEXT,
    "isBillingDue" BOOLEAN DEFAULT false,
    "terminatedAt" TEXT,
    "terminationReason" TEXT,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.client_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access client_deals" ON public.client_deals;
CREATE POLICY "Public Anon Access client_deals" ON public.client_deals FOR ALL USING (true) WITH CHECK (true);`,
    columnsToVerify: [
      { name: "subscriptionStartDate", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TEXT;' },
      { name: "billingDayOfMonth", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "billingDayOfMonth" INTEGER;' },
      { name: "nextBillingDate", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "nextBillingDate" TEXT;' },
      { name: "lastBilledDate", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "lastBilledDate" TEXT;' },
      { name: "isBillingDue", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "isBillingDue" BOOLEAN DEFAULT false;' },
      { name: "terminatedAt", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminatedAt" TEXT;' },
      { name: "terminationReason", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminationReason" TEXT;' },
      { name: "rejectedAt", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectedAt" TEXT;' },
      { name: "rejectionReason", alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;' }
    ]
  },
  {
    table: "commissions",
    label: "Buku Besar Komisi",
    createSql: `CREATE TABLE IF NOT EXISTS public.commissions (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "serviceName" TEXT,
    "clientName" TEXT,
    "dealValue" NUMERIC DEFAULT 0,
    "commissionAmount" NUMERIC DEFAULT 0,
    "bonusAmount" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access commissions" ON public.commissions;
CREATE POLICY "Public Anon Access commissions" ON public.commissions FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "payout_requests",
    label: "Pencairan Komisi (Payout)",
    createSql: `CREATE TABLE IF NOT EXISTS public.payout_requests (
    id TEXT PRIMARY KEY,
    "mitraId" TEXT,
    "mitraName" TEXT,
    "memberCode" TEXT,
    amount NUMERIC NOT NULL,
    "bankDetails" JSONB,
    "requestDate" TEXT,
    "processedDate" TEXT,
    status TEXT DEFAULT 'pending',
    "pph21Deduction" NUMERIC DEFAULT 0,
    "pph21Rate" NUMERIC DEFAULT 0,
    "adminFeeDeduction" NUMERIC DEFAULT 0,
    "netAmountTransferred" NUMERIC DEFAULT 0,
    "proofFileUrl" TEXT,
    "proofFileName" TEXT,
    "transferRefNumber" TEXT,
    "disbursedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access payout_requests" ON public.payout_requests;
CREATE POLICY "Public Anon Access payout_requests" ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "marketing_tools",
    label: "Materi Promosi & Tools",
    createSql: `CREATE TABLE IF NOT EXISTS public.marketing_tools (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" TEXT,
    "downloadUrl" TEXT,
    "thumbnailUrl" TEXT,
    description TEXT,
    "createdAt" TEXT,
    "targetProduct" TEXT,
    duration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.marketing_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access marketing_tools" ON public.marketing_tools;
CREATE POLICY "Public Anon Access marketing_tools" ON public.marketing_tools FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "notifications",
    label: "Notifikasi Sistem",
    createSql: `CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    timestamp TEXT,
    "isRead" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access notifications" ON public.notifications;
CREATE POLICY "Public Anon Access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "user_passwords",
    label: "Kredensial & Sistem KV",
    createSql: `CREATE TABLE IF NOT EXISTS public.user_passwords (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access user_passwords" ON public.user_passwords;
CREATE POLICY "Public Anon Access user_passwords" ON public.user_passwords FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "app_settings",
    label: "Pengaturan Sistem & SMTP",
    createSql: `CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'config_primary',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access app_settings" ON public.app_settings;
CREATE POLICY "Public Anon Access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "system_roles",
    label: "Hak Akses & Role Dinamis",
    createSql: `CREATE TABLE IF NOT EXISTS public.system_roles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "portalView" TEXT DEFAULT 'mitra',
    "defaultTab" TEXT DEFAULT 'idcard',
    "allowedTabs" JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    "isSystem" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access system_roles" ON public.system_roles;
CREATE POLICY "Public Anon Access system_roles" ON public.system_roles FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "activity_logs",
    label: "Log Aktivitas Mitra & Admin",
    createSql: `CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actionType" TEXT NOT NULL,
    operation TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access activity_logs" ON public.activity_logs;
CREATE POLICY "Public Anon Access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);`
  },
  {
    table: "email_logs",
    label: "Log Pengiriman Email SMTP",
    createSql: `CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    "smtpResponse" TEXT,
    timestamp TEXT NOT NULL,
    "previewSnippet" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access email_logs" ON public.email_logs;
CREATE POLICY "Public Anon Access email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);`
  }
];
var testSupabaseConnection = async () => {
  if (!supabase) {
    return {
      success: false,
      message: "SUPABASE_URL atau SUPABASE_KEY belum terisi di environment variable server hosting Anda.",
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL
    };
  }
  try {
    const tableChecks = [];
    const migrationParts = [];
    for (const def of TABLE_DEFINITIONS) {
      const { error } = await supabase.from(def.table).select("*").limit(1);
      if (error) {
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: false,
          missingColumns: []
        });
        migrationParts.push(`-- Buat Tabel Baru: public.${def.table} (${def.label})
${def.createSql}`);
      } else {
        const missingCols = [];
        if (def.columnsToVerify && def.columnsToVerify.length > 0) {
          for (const col of def.columnsToVerify) {
            const { error: colErr } = await supabase.from(def.table).select(col.name).limit(1);
            if (colErr) {
              missingCols.push(col.name);
              migrationParts.push(`-- Tambah Kolom Baru "${col.name}" pada Tabel public.${def.table}
${col.alterSql}`);
            }
          }
        }
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: true,
          missingColumns: missingCols
        });
      }
    }
    const existingTables = tableChecks.filter((t) => t.exists).map((t) => t.table);
    const missingTables = tableChecks.filter((t) => !t.exists).map((t) => t.table);
    const tablesWithMissingCols = tableChecks.filter((t) => t.missingColumns.length > 0);
    const hasPendingMigration = missingTables.length > 0 || tablesWithMissingCols.length > 0;
    const generatedMigrationSql = migrationParts.length > 0 ? `-- ====================================================================
-- QUERY UPDATE TABEL & KOLOM BARU SUPABASE (OTOMATIS TERDETEKSI)
-- Salin dan jalankan di menu SQL Editor Supabase Anda
-- ====================================================================

${migrationParts.join("\n\n")}` : `-- Seluruh 12 tabel dan kolom terbaru sudah lengkap di Supabase Anda!
-- Jika Anda ingin memastikan ulang struktur kolom terbaru, Anda dapat menjalankan query aman berikut:

${FULL_IDEMPOTENT_SCHEMA_SQL}`;
    if (existingTables.length === 0) {
      return {
        success: false,
        message: "Terhubung ke Supabase, namun tabel belum dibuat! Silakan salin dan jalankan Query SQL di bawah pada SQL Editor Supabase Anda.",
        tablesFound: [],
        tableChecks,
        hasPendingMigration: true,
        migrationSql: generatedMigrationSql,
        fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL
      };
    }
    return {
      success: true,
      message: hasPendingMigration ? `Supabase Terhubung (${existingTables.length}/${tableChecks.length} tabel aktif). Tersedia query update untuk ${missingTables.length} tabel tambahan & ${tablesWithMissingCols.reduce((a, b) => a + b.missingColumns.length, 0)} kolom baru.` : `Koneksi ke Supabase berhasil aktif dan seluruh ${tableChecks.length} tabel serta kolom database sudah lengkap!`,
      tablesFound: existingTables,
      tableChecks,
      hasPendingMigration,
      migrationSql: generatedMigrationSql,
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL
    };
  } catch (err) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || "Koneksi timeout / jaringan"}`,
      error: err.message,
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL
    };
  }
};

// src/avatars.ts
var maleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgMale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="suitMale" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bgMale)" />
  <circle cx="100" cy="100" r="94" fill="none" stroke="#60a5fa" stroke-opacity="0.25" stroke-width="2" />
  <!-- Shoulders / Suit -->
  <path d="M35 195 C35 145, 65 130, 100 130 C135 130, 165 145, 165 195 Z" fill="url(#suitMale)" />
  <!-- White Shirt & Tie -->
  <polygon points="84,130 100,175 116,130" fill="#f8fafc" />
  <polygon points="96,136 104,136 106,168 100,178 94,168" fill="#f59e0b" />
  <!-- Suit Lapels -->
  <path d="M75 132 L100 175 L86 130 Z" fill="#334155" />
  <path d="M125 132 L100 175 L114 130 Z" fill="#334155" />
  <!-- Neck -->
  <rect x="88" y="108" width="24" height="26" rx="10" fill="#f1c27d" />
  <!-- Ears -->
  <circle cx="66" cy="84" r="8" fill="#e0ac69" />
  <circle cx="134" cy="84" r="8" fill="#e0ac69" />
  <!-- Head -->
  <rect x="68" y="48" width="64" height="72" rx="30" fill="#f1c27d" />
  <!-- Neat Short Male Hair -->
  <path d="M66 76 C64 46, 80 36, 100 36 C120 36, 136 46, 134 76 C132 60, 122 52, 100 52 C78 52, 68 60, 66 76 Z" fill="#1e293b" />
  <!-- Eyebrows -->
  <path d="M78 74 Q85 71 92 74" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none" />
  <path d="M108 74 Q115 71 122 74" stroke="#1e293b" stroke-width="3" stroke-linecap="round" fill="none" />
  <!-- Eyes -->
  <circle cx="85" cy="82" r="3.5" fill="#0f172a" />
  <circle cx="115" cy="82" r="3.5" fill="#0f172a" />
  <!-- Confident Smile -->
  <path d="M90 101 Q100 108 110 101" stroke="#9a3412" stroke-width="3" stroke-linecap="round" fill="none" />
</svg>`;
var femaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgFemale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="blazerFemale" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#bgFemale)" />
  <circle cx="100" cy="100" r="94" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="2" />
  <!-- Back Hair -->
  <path d="M56 78 C52 115, 58 140, 68 148 L132 148 C142 140, 148 115, 144 78 Z" fill="#1c1917" />
  <!-- Shoulders / Blazer -->
  <path d="M38 195 C38 146, 66 132, 100 132 C134 132, 162 146, 162 195 Z" fill="url(#blazerFemale)" />
  <!-- Inner Blouse & Gold Necklace Accent -->
  <polygon points="82,132 100,176 118,132" fill="#fef3c7" />
  <path d="M88 138 Q100 148 112 138" stroke="#f59e0b" stroke-width="2.5" fill="none" />
  <!-- Blazer Lapels -->
  <path d="M74 134 L100 176 L83 132 Z" fill="#334155" />
  <path d="M126 134 L100 176 L117 132 Z" fill="#334155" />
  <!-- Neck -->
  <rect x="90" y="110" width="20" height="25" rx="9" fill="#f5cfa0" />
  <!-- Head -->
  <rect x="70" y="50" width="60" height="68" rx="29" fill="#f5cfa0" />
  <!-- Styled Female Hair Sweep -->
  <path d="M64 82 C62 46, 80 36, 102 36 C124 36, 138 48, 136 82 C132 62, 118 56, 94 58 C78 60, 68 68, 64 82 Z" fill="#1c1917" />
  <!-- Eyebrows -->
  <path d="M79 74 Q85 70 91 73" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <path d="M109 73 Q115 70 121 74" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
  <!-- Eyes & Lashes -->
  <circle cx="85" cy="82" r="3.5" fill="#0f172a" />
  <circle cx="115" cy="82" r="3.5" fill="#0f172a" />
  <!-- Warm Smile -->
  <path d="M91 101 Q100 107 109 101" stroke="#be123c" stroke-width="3" stroke-linecap="round" fill="none" />
</svg>`;
var MALE_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(maleSvg)}`;
var FEMALE_AVATAR_URL = `data:image/svg+xml;utf8,${encodeURIComponent(femaleSvg)}`;
function inferGenderFromName(fullName) {
  if (!fullName) return "male";
  const lower = fullName.toLowerCase();
  const femaleKeywords = [
    "dewi",
    "lestari",
    "siti",
    "ratna",
    "maya",
    "indah",
    "putri",
    "ayu",
    "ibu",
    "ny.",
    "fitri",
    "ani",
    "sri",
    "rina",
    "dina",
    "nina",
    "lia",
    "wulan",
    "dian",
    "nur",
    "kartika",
    "intan",
    "amelia",
    "nadia",
    "sarah",
    "annisa",
    "nabila",
    "tiara",
    "citra",
    "bunga",
    "melati",
    "anggun"
  ];
  for (const kw of femaleKeywords) {
    if (lower.includes(kw)) return "female";
  }
  return "male";
}
function getDefaultAvatar(gender, fullName) {
  const resolvedGender = gender || inferGenderFromName(fullName);
  return resolvedGender === "female" ? FEMALE_AVATAR_URL : MALE_AVATAR_URL;
}
function resolveAvatarUrl(avatarUrl, gender, fullName) {
  if (!avatarUrl || avatarUrl.includes("images.unsplash.com")) {
    return getDefaultAvatar(gender, fullName);
  }
  return avatarUrl;
}

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json({ limit: "10mb" }));
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var DEFAULT_SPECIALIZATION_LABEL = "Bidang Keahlian / Profesi Mitra";
var DEFAULT_SPECIALIZATION_OPTIONS = [
  { id: "spec-1", label: "Konsultan Perpajakan & Tax Planning", isActive: true },
  { id: "spec-2", label: "Hukum Korporasi & Bisnis", isActive: true },
  { id: "spec-3", label: "Akuntansi & Pembukuan Korporat", isActive: true },
  { id: "spec-4", label: "Legalitas & Perizinan OSS-RBA", isActive: true },
  { id: "spec-5", label: "Kuasa Hukum Pengadilan Pajak", isActive: true },
  { id: "spec-6", label: "Business Partner / Referral Umum", isActive: true }
];
var DEFAULT_MITRA_FORM_FIELDS = [
  {
    id: "mitra-def-fullName",
    systemKey: "fullName",
    isDefault: true,
    section: "profile",
    label: "Nama Lengkap & Gelar",
    type: "text",
    placeholder: "Contoh: Muhammad Reza, S.H., M.H.",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-email",
    systemKey: "email",
    isDefault: true,
    section: "profile",
    label: "Email Resmi",
    type: "text",
    placeholder: "nama@email.com",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-phone",
    systemKey: "phone",
    isDefault: true,
    section: "profile",
    label: "No. WhatsApp Aktif",
    type: "text",
    placeholder: "0812-xxxx-xxxx",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-nik",
    systemKey: "nik",
    isDefault: true,
    section: "profile",
    label: "Nomor KTP / NIK",
    type: "text",
    placeholder: "16 digit NIK resmi",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-specialization",
    systemKey: "specialization",
    isDefault: true,
    section: "profile",
    label: DEFAULT_SPECIALIZATION_LABEL,
    type: "select",
    placeholder: "Pilih Bidang Keahlian / Profesi Mitra",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-bankName",
    systemKey: "bankName",
    isDefault: true,
    section: "bank",
    label: "Nama Bank Pencairan Komisi",
    type: "select",
    options: [
      "Bank Central Asia (BCA)",
      "Bank Mandiri",
      "Bank Rakyat Indonesia (BRI)",
      "Bank Negara Indonesia (BNI)",
      "Bank Syariah Indonesia (BSI)",
      "CIMB Niaga"
    ],
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-accountNumber",
    systemKey: "accountNumber",
    isDefault: true,
    section: "bank",
    label: "Nomor Rekening Bank",
    type: "text",
    placeholder: "Contoh: 8830192837",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-accountHolder",
    systemKey: "accountHolder",
    isDefault: true,
    section: "bank",
    label: "Nama Pemilik Rekening",
    type: "text",
    placeholder: "Harus sesuai buku tabungan",
    required: true,
    isActive: true
  }
];
var DEFAULT_CLIENT_FORM_FIELDS = [
  {
    id: "client-def-companyName",
    systemKey: "companyName",
    isDefault: true,
    label: "Nama Perusahaan / Entitas Klien",
    type: "text",
    placeholder: "Contoh: PT Surya Kencana Abadi",
    required: true,
    isActive: true
  },
  {
    id: "client-def-picName",
    systemKey: "picName",
    isDefault: true,
    label: "Nama PIC / Direktur Penanggung Jawab",
    type: "text",
    placeholder: "Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)",
    required: true,
    isActive: true
  },
  {
    id: "client-def-picPhone",
    systemKey: "picPhone",
    isDefault: true,
    label: "Nomor WhatsApp / HP PIC",
    type: "text",
    placeholder: "0812-XXXX-XXXX",
    required: true,
    isActive: true
  },
  {
    id: "client-def-picEmail",
    systemKey: "picEmail",
    isDefault: true,
    label: "Email PIC / Kantor Klien",
    type: "text",
    placeholder: "finance@suryakencana.co.id",
    required: false,
    isActive: true
  },
  {
    id: "client-def-notes",
    systemKey: "notes",
    isDefault: true,
    label: "Catatan Tambahan & Kebutuhan Spesifik Klien",
    type: "textarea",
    placeholder: "Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP.",
    required: false,
    isActive: true
  }
];
var DEFAULT_STAFF_ALLOWED_MENUS = [
  "dashboard",
  "admin-operations",
  "verification",
  "marketing-tools",
  "commissions",
  "manage-services",
  "settings-general",
  "settings-forms"
];
var mitras = [
  {
    id: "mitra-01",
    memberCode: "ND-2026-LAW-0042",
    referralCode: "ND-REF-0042",
    fullName: "Bambang Sudirman, S.H., M.Kn.",
    email: "bambang.sudirman@example.com",
    phone: "0812-8899-7711",
    nik: "3201123456780001",
    specialization: "Konsultan Hukum Korporasi & Kontrak Bisnis",
    status: "verified",
    gender: "male",
    avatarUrl: MALE_AVATAR_URL,
    joinedDate: "2026-01-15",
    bankDetails: {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8830192837",
      accountHolder: "Bambang Sudirman"
    },
    totalCommission: 345e5,
    totalBonus: 75e5,
    pendingPayout: 62e5,
    paidPayout: 358e5,
    referredClientsCount: 8,
    activeSubscribersCount: 3,
    emailVerified: true
  },
  {
    id: "mitra-02",
    memberCode: "ND-2026-TAX-0077",
    referralCode: "ND-REF-0077",
    fullName: "Dewi Lestari, S.E., B.K.P.",
    email: "dewi.lestari@example.com",
    phone: "0813-2211-4455",
    nik: "3174098765430002",
    specialization: "Spesialis Pajak Penghasilan Badan & Tax Planning",
    status: "verified",
    gender: "female",
    avatarUrl: FEMALE_AVATAR_URL,
    joinedDate: "2026-03-02",
    bankDetails: {
      bankName: "Bank Mandiri",
      accountNumber: "1370019283741",
      accountHolder: "Dewi Lestari"
    },
    totalCommission: 482e5,
    totalBonus: 12e6,
    pendingPayout: 0,
    paidPayout: 602e5,
    referredClientsCount: 12,
    activeSubscribersCount: 5,
    emailVerified: true
  },
  {
    id: "mitra-03",
    memberCode: "ND-2026-LAW-0089",
    referralCode: "ND-REF-0089",
    fullName: "Rian Pratama, S.H.",
    email: "rian.pratama@example.com",
    phone: "0857-4433-2211",
    nik: "3302051203920003",
    specialization: "Pendirian Legalitas PT / CV & Perizinan OSS-RBA",
    status: "pending",
    gender: "male",
    avatarUrl: MALE_AVATAR_URL,
    joinedDate: "2026-11-05",
    bankDetails: {
      bankName: "Bank Rakyat Indonesia (BRI)",
      accountNumber: "020601089274502",
      accountHolder: "Rian Pratama"
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: true
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
var services = [
  {
    id: "srv-01",
    name: "Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)",
    category: "Laporan Keuangan",
    defaultPrice: 75e5,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Penyusunan Neraca, Laba Rugi, Cashflow, Jurnal Penyesuaian, Buku Besar, dan Rekonsiliasi Bank berkala sesuai PSAK.",
    isActive: true
  },
  {
    id: "srv-02",
    name: "Kepatuhan & Pelaporan SPT Tahunan Badan (PPh Badan 1771)",
    category: "Kepatuhan Pajak",
    defaultPrice: 15e6,
    pricingType: "case_by_case",
    commissionRate: 15,
    description: "Kalkulasi kredit pajak, koreksi fiskal positif/negatif, lampiran khusus, dan e-filing resmi DJP dengan garansi nihil teguran formil.",
    isActive: true
  },
  {
    id: "srv-03",
    name: "Paket Kepatuhan Pajak Bulanan (SPT Masa PPh 21/23/25/4(2) & PPN 1111)",
    category: "Kepatuhan Pajak",
    defaultPrice: 45e5,
    pricingType: "monthly_subscription",
    commissionRate: 12,
    description: "Pembuatan bukti potong Unifikasi, rekonsiliasi faktur pajak keluaran/masukan, dan pelaporan tepat waktu setiap bulan.",
    isActive: true
  },
  {
    id: "srv-04",
    name: "Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP",
    category: "Pendampingan Audit",
    defaultPrice: 35e6,
    pricingType: "case_by_case",
    commissionRate: 20,
    description: "Penyusunan tanggapan tertulis resmi SP2DK, rekonsiliasi data pengujian silang, dan pendampingan tatap muka dengan Account Representative DJP.",
    isActive: true
  },
  {
    id: "srv-05",
    name: "Tax Planning, Restrukturisasi Bisnis & Dokumentasi Transfer Pricing (TP Doc)",
    category: "Konsultasi Finansial",
    defaultPrice: 5e7,
    pricingType: "case_by_case",
    commissionRate: 18,
    description: "Optimasi beban pajak korporasi secara legal (tax avoidance vs evasion compliant), skema holding, dan Master/Local File TP Doc.",
    isActive: true
  },
  {
    id: "srv-06",
    name: "Pendirian Legalitas PT / PMA, Perizinan OSS-RBA & NIB Berbasis Risiko",
    category: "Legalitas Korporasi",
    defaultPrice: 18e6,
    pricingType: "case_by_case",
    commissionRate: 15,
    description: "Akta Notaris, SK Kemenkumham, NPWP Badan, NIB Berbasis Risiko OSS-RBA, dan sertifikat standar operasional.",
    isActive: true
  },
  {
    id: "srv-07",
    name: "Retainer Kepatuhan Pajak & Audit Keuangan Tahunan (Annual Retainer)",
    category: "Kepatuhan Pajak",
    defaultPrice: 65e6,
    pricingType: "annual_subscription",
    commissionRate: 15,
    description: "Paket langganan komprehensif 1 tahun penuh: SPT Tahunan Badan, SPT Masa 12 bulan, audit internal laporan keuangan, dan konsultasi tak terbatas.",
    isActive: true
  },
  {
    id: "srv-08",
    name: "Retainer Konsultan Hukum Korporasi & Pengawasan Kontrak (Tahunan)",
    category: "Legalitas Korporasi",
    defaultPrice: 85e6,
    pricingType: "annual_subscription",
    commissionRate: 15,
    description: "Pendampingan legal corporate retainer tahunan: legal opinion, review & drafting kontrak bisnis berkala, dan penanganan sengketa ketenagakerjaan.",
    isActive: true
  }
];
var clientDeals = [
  {
    id: "deal-01",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    referralCode: "ND-REF-0042",
    companyName: "PT Nusantara Energi Makmur",
    picName: "Hendra Wijaya (Direktur Keuangan)",
    picPhone: "0811-2233-4455",
    picEmail: "hendra.wijaya@nusantaraenergi.co.id",
    serviceId: "srv-01",
    serviceName: "Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)",
    pricingType: "monthly_subscription",
    dealValue: 12e6,
    commissionAmount: 18e5,
    status: "active_subscription",
    date: "2026-08-10",
    subscriptionStartDate: "2026-08-10",
    billingDayOfMonth: 10,
    nextBillingDate: "2026-11-10",
    lastBilledDate: "2026-10-10",
    isBillingDue: true,
    recurringPaidMonths: 3,
    notes: "Klien berlangganan retainer laporan keuangan bulanan & review pajak sejak Agustus 2026."
  },
  {
    id: "deal-02",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    referralCode: "ND-REF-0042",
    companyName: "PT Sinar Logistik Samudra",
    picName: "Ibu Ratna Dewi (Komisaris)",
    picPhone: "0812-9988-7766",
    picEmail: "ratna@sinarlogistik.com",
    serviceId: "srv-04",
    serviceName: "Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP",
    pricingType: "case_by_case",
    dealValue: 45e6,
    commissionAmount: 9e6,
    status: "deal_closed",
    date: "2026-10-15",
    notes: "Kasus SP2DK ketidaksesuaian omset PPN telah selesai diselesaikan dengan DJP, komisi 1x bayar cair."
  },
  {
    id: "deal-03",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    referralCode: "ND-REF-0077",
    companyName: "CV Berkah Manunggal Pangan",
    picName: "Budi Santoso (Founder & CEO)",
    picPhone: "0813-5566-7788",
    picEmail: "budi@berkahpangan.co.id",
    serviceId: "srv-03",
    serviceName: "Paket Kepatuhan Pajak Bulanan (SPT Masa PPh 21/23/25/4(2) & PPN 1111)",
    pricingType: "monthly_subscription",
    dealValue: 5e6,
    commissionAmount: 6e5,
    status: "active_subscription",
    date: "2026-09-01",
    subscriptionStartDate: "2026-09-01",
    billingDayOfMonth: 1,
    nextBillingDate: "2026-11-01",
    lastBilledDate: "2026-10-01",
    isBillingDue: true,
    recurringPaidMonths: 2,
    notes: "Pelaporan SPT Masa rutin setiap bulan."
  },
  {
    id: "deal-04",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    referralCode: "ND-REF-0042",
    companyName: "PT Bahari Mandiri Nusantara",
    picName: "Ahmad Fauzi (Direktur Operasional)",
    picPhone: "0812-3344-5566",
    picEmail: "fauzi@baharimandiri.com",
    serviceId: "srv-01",
    serviceName: "Penyusunan Laporan Keuangan Bulanan & Tahunan (Komersial & Fiskal)",
    pricingType: "monthly_subscription",
    dealValue: 1e7,
    commissionAmount: 15e5,
    status: "pending_acc",
    date: "2026-11-09",
    subscriptionStartDate: "2026-11-09",
    billingDayOfMonth: 9,
    notes: "Klien mengisi formulir registrasi mandiri via tautan referral Mitra Bambang Sudirman.",
    submittedBy: "client_self"
  },
  {
    id: "deal-05",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    referralCode: "ND-REF-0077",
    companyName: "PT Cipta Kreasi Sejahtera",
    picName: "Maya Indah (General Manager)",
    picPhone: "0813-9900-1122",
    picEmail: "maya@ciptakreasi.co.id",
    serviceId: "srv-04",
    serviceName: "Pendampingan SP2DK, Pemeriksaan Pajak, & Keberatan DJP",
    pricingType: "case_by_case",
    dealValue: 35e6,
    commissionAmount: 7e6,
    status: "pending_acc",
    date: "2026-11-08",
    notes: "Kebutuhan mendesak tanggapan SP2DK KPP Pratama Tebet.",
    submittedBy: "client_self"
  },
  {
    id: "deal-06",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    referralCode: "ND-REF-0042",
    companyName: "PT Samudera Petro Energi",
    picName: "Ir. Ridwan Kamil (Project Director)",
    picPhone: "0811-9876-5432",
    picEmail: "ridwan@samuderapetro.co.id",
    serviceId: "srv-05",
    serviceName: "Tax Planning, Restrukturisasi Bisnis & Dokumentasi Transfer Pricing (TP Doc)",
    pricingType: "case_by_case",
    dealValue: 85e6,
    commissionAmount: 153e5,
    status: "deal_closed",
    date: "2026-06-15",
    periodStart: "Februari 2024",
    periodEnd: "April 2025",
    durationMonths: 15,
    paymentTermType: "one_time",
    notes: "Perikatan restrukturisasi keuangan & pajak multi-bulan periode Feb 2024 s/d Apr 2025 (15 Bulan) - Sekali bayar."
  },
  {
    id: "deal-07",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    referralCode: "ND-REF-0077",
    companyName: "PT Graha Rekayasa Konstruksi",
    picName: "Drs. Hendro Wibowo (Direktur Utama)",
    picPhone: "0812-7766-5544",
    picEmail: "hendro@graharekayasa.com",
    serviceId: "srv-07",
    serviceName: "Retainer Kepatuhan Pajak & Audit Keuangan Tahunan (Annual Retainer)",
    pricingType: "annual_subscription",
    dealValue: 65e6,
    commissionAmount: 975e4,
    status: "active_subscription",
    date: "2026-03-20",
    subscriptionStartDate: "2026-03-20",
    billingDayOfMonth: 20,
    nextBillingDate: "2027-03-20",
    lastBilledDate: "2026-03-20",
    isBillingDue: false,
    recurringPaidYears: 1,
    notes: "Langganan tahunan retainer kepatuhan pajak & audit keuangan komprehensif."
  }
];
var payoutRequests = [
  {
    id: "pay-001",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    memberCode: "ND-2026-LAW-0042",
    amount: 62e5,
    bankDetails: {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8830192837",
      accountHolder: "Bambang Sudirman"
    },
    requestDate: "2026-11-08",
    status: "pending",
    notes: "Pengajuan pencairan komisi closing kuartal berjalan."
  },
  {
    id: "pay-002",
    mitraId: "mitra-02",
    mitraName: "Dewi Lestari, S.E., B.K.P.",
    memberCode: "ND-2026-TAX-0077",
    amount: 18e6,
    bankDetails: {
      bankName: "Bank Mandiri",
      accountNumber: "1370019283741",
      accountHolder: "Dewi Lestari"
    },
    requestDate: "2026-10-26",
    processedDate: "2026-10-26",
    status: "approved",
    pph21Deduction: 45e4,
    pph21Rate: 2.5,
    adminFeeDeduction: 2500,
    netAmountTransferred: 17547500,
    transferRefNumber: "TRX-MDR-20261026-99214",
    proofFileName: "Bukti_Transfer_Mandiri_Dewi_Lestari.pdf",
    disbursedBy: "Admin Operasional NDTAXANDLAW",
    notes: "Pencairan komisi PT Global Indo Logistik - Sukses ditransfer via BI-FAST."
  },
  {
    id: "pay-003",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    memberCode: "ND-2026-LAW-0042",
    amount: 1125e4,
    bankDetails: {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "8830192837",
      accountHolder: "Bambang Sudirman"
    },
    requestDate: "2026-10-15",
    processedDate: "2026-10-15",
    status: "approved",
    pph21Deduction: 281250,
    pph21Rate: 2.5,
    adminFeeDeduction: 2500,
    netAmountTransferred: 10966250,
    transferRefNumber: "TRX-BCA-20261015-88102",
    proofFileName: "Bukti_Transfer_BCA_Bambang_Sudirman.pdf",
    disbursedBy: "Admin Operasional NDTAXANDLAW",
    notes: "Pencairan komisi PT Nusantara Megah Resources - Sukses."
  }
];
var appSettings = {
  firmName: "NDTAXANDLAW",
  tagline: "Firma Konsultan Pajak & Kuasa Hukum Pengadilan Pajak Terakreditasi",
  supportPhone: "0812-8899-7711",
  supportEmail: "advisory@ndtaxlaw.com",
  officeAddress: "Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950",
  defaultCommissionRate: 15,
  allowClientSelfRegister: true,
  googleOAuthEnabled: false,
  googleClientId: "",
  geminiApiEnabled: true,
  geminiModel: "gemini-3.8-flash",
  appEnvironment: process.env.APP_ENV === "development" ? "development" : "production",
  smtpEnabled: true,
  smtpHost: process.env.SMTP_HOST || "mail.ndtaxlaw.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpEncryption: process.env.SMTP_ENCRYPTION || "ssl",
  smtpUser: process.env.SMTP_USER || "notifications@ndtaxlaw.com",
  smtpPassword: process.env.SMTP_PASS || "",
  smtpSenderName: "NDTAXANDLAW System",
  smtpSenderEmail: process.env.SMTP_USER || "notifications@ndtaxlaw.com",
  smtpReplyToEmail: "advisory@ndtaxlaw.com",
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
  clientFieldsInitialized: true
};
var emailLogs = [];
var activityLogs = [
  {
    id: "act-seed-01",
    actorRole: "admin",
    actorId: "admin-01",
    actorName: "Admin Operasional NDTAXANDLAW",
    actorEmail: "admin@ndtaxlaw.com",
    actionType: "payout_approve",
    operation: "UPDATE",
    targetEntity: "Pembayaran Komisi Mitra",
    description: "Menyetujui dan mentransfer pembayaran komisi Rp 17.547.500 untuk Mitra Dewi Lestari, S.E., B.K.P. (Ref: #TRX-MDR-20261026-99214).",
    timestamp: "2026-10-26T11:00:00Z"
  },
  {
    id: "act-seed-02",
    actorRole: "mitra",
    actorId: "mitra-01",
    actorName: "Bambang Sudirman, S.H., M.Kn.",
    actorEmail: "bambang.sudirman@example.com",
    actionType: "client_create",
    operation: "CREATE",
    targetEntity: "Input Klien",
    description: 'Menambahkan pengajuan deal klien baru "PT Bahari Mandiri Nusantara" dengan nilai kontrak Rp 10.000.000.',
    timestamp: "2026-11-09T09:15:00Z"
  },
  {
    id: "act-seed-03",
    actorRole: "mitra",
    actorId: "mitra-03",
    actorName: "Rian Pratama, S.H.",
    actorEmail: "rian.pratama@example.com",
    actionType: "register",
    operation: "CREATE",
    targetEntity: "Pendaftaran Mitra",
    description: "Pendaftaran akun mitra baru Rian Pratama, S.H. (Spesialisasi Bisnis: Pendirian Legalitas PT / CV & Perizinan OSS-RBA).",
    timestamp: "2026-11-05T14:20:00Z"
  }
];
var persistSettingsToSupabase = async () => {
  if (!supabase) return;
  try {
    await supabase.from("user_passwords").upsert([
      { email: "__sys_config__@ndtaxlaw.internal", password: JSON.stringify(appSettings) },
      { email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) }
    ]);
  } catch (e) {
    console.warn("[Supabase Settings KV Warning]", e);
  }
  try {
    await supabase.from("app_settings").upsert([
      { id: "config_primary", settings: { ...appSettings, roles: systemRoles }, updated_at: (/* @__PURE__ */ new Date()).toISOString() }
    ]);
  } catch {
  }
};
var getThreeMonthsAgoCutoff = () => {
  const d = /* @__PURE__ */ new Date();
  d.setMonth(d.getMonth() - 3);
  return {
    cutoffMs: d.getTime(),
    cutoffIso: d.toISOString()
  };
};
var pruneOldLogs = async (syncSupabase = false) => {
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
        supabase.from("activity_logs").delete().lt("timestamp", cutoffIso),
        supabase.from("email_logs").delete().lt("timestamp", cutoffIso)
      ]);
      if (changed) {
        await supabase.from("user_passwords").upsert([
          { email: "__sys_activity_logs__@ndtaxlaw.internal", password: JSON.stringify(activityLogs.slice(0, 250)) },
          {
            email: "__sys_email_logs__@ndtaxlaw.internal",
            password: JSON.stringify(emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest))
          }
        ]);
      }
    } catch {
    }
  }
};
var persistActivityLogsToSupabase = async (latestItem) => {
  if (!supabase) return;
  try {
    await supabase.from("user_passwords").upsert([
      { email: "__sys_activity_logs__@ndtaxlaw.internal", password: JSON.stringify(activityLogs.slice(0, 250)) }
    ]);
  } catch (e) {
    console.warn("[Supabase Activity Logs KV Warning]", e);
  }
  if (latestItem) {
    try {
      await supabase.from("activity_logs").upsert([latestItem]);
    } catch {
    }
  }
};
var toSupabaseEmailLogRow = (item) => ({
  id: item.id,
  recipient: item.recipient,
  recipientName: item.recipientName || item.recipient,
  subject: item.subject,
  category: item.category,
  status: item.status,
  smtpResponse: item.status === "failed" ? `ERROR [${item.smtpHostUsed || "SMTP"}]: ${item.errorMessage || "Gagal mengirim email"}` : `OK [${item.smtpHostUsed || "SMTP"}]`,
  timestamp: item.sentAt || (/* @__PURE__ */ new Date()).toISOString(),
  previewSnippet: item.previewSnippet || ""
});
var fromSupabaseEmailLogRow = (row) => {
  const rawResp = String(row.smtpResponse || "");
  const hostMatch = rawResp.match(/\[(.*?)\]/);
  const extractedHost = row.smtpHostUsed || (hostMatch ? hostMatch[1] : void 0);
  const extractedError = row.errorMessage || (row.status === "failed" ? rawResp.replace(/^ERROR\s*\[.*?\]:\s*/i, "").trim() || "Pengiriman email gagal" : void 0);
  return {
    id: row.id,
    recipient: row.recipient || "",
    recipientName: row.recipientName || row.recipient || "",
    subject: row.subject || "",
    category: row.category || "system_alert",
    sentAt: row.sentAt || row.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    status: row.status === "sent" ? "sent" : "failed",
    previewSnippet: row.previewSnippet || "",
    errorMessage: extractedError,
    smtpHostUsed: extractedHost
  };
};
var persistEmailLogsToSupabase = async (latestItem) => {
  await pruneOldLogs(false);
  if (!supabase) return;
  try {
    const compactLogs = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
    await supabase.from("user_passwords").upsert([
      { email: "__sys_email_logs__@ndtaxlaw.internal", password: JSON.stringify(compactLogs) }
    ]);
  } catch (e) {
    console.warn("[Supabase Email Logs KV Warning]", e);
  }
  try {
    if (latestItem) {
      await supabase.from("email_logs").upsert([toSupabaseEmailLogRow(latestItem)]);
    } else if (emailLogs.length > 0) {
      const rows = emailLogs.slice(0, 100).map(toSupabaseEmailLogRow);
      await supabase.from("email_logs").upsert(rows);
    }
  } catch (e) {
    console.warn("[Supabase email_logs Table Warning]", e);
  }
};
var recordActivity = (params) => {
  const newItem = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    actorRole: params.actorRole,
    actorId: params.actorId,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    actionType: params.actionType,
    operation: params.operation,
    targetEntity: params.targetEntity,
    description: params.description,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
var buildEmailHtml = (subject, recipientName, snippet) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #092147 0%, #113872 100%); padding: 20px 24px; border-radius: 10px 10px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">${appSettings.firmName || "NDTAXANDLAW"}</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fcd34d;">${appSettings.tagline || "Tax & Legal Advisory Portal"}</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none; color: #1e293b;">
        <p style="margin-top: 0; font-size: 14px;">Yth. <strong>${recipientName || "Mitra NDTAXANDLAW"}</strong>,</p>
        <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px;">${subject}</h3>
        <div style="background-color: #f1f5f9; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #334155;">
          ${snippet.replace(/\n/g, "<br/>")}
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
var sendSystemEmail = async (params) => {
  if (supabase && (!appSettings.smtpPassword || appSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")) {
    try {
      const { data: kvCfg } = await supabase.from("user_passwords").select("*").eq("email", "__sys_config__@ndtaxlaw.internal").maybeSingle();
      if (kvCfg && kvCfg.password) {
        const parsed = JSON.parse(kvCfg.password);
        if (parsed && typeof parsed === "object") {
          appSettings = { ...appSettings, ...parsed };
        }
      }
    } catch {
    }
  }
  const host = (appSettings.smtpHost || process.env.SMTP_HOST || "").trim();
  const port = Number(appSettings.smtpPort || process.env.SMTP_PORT || 465);
  const user = (appSettings.smtpUser || process.env.SMTP_USER || "").trim();
  const pass = appSettings.smtpPassword || process.env.SMTP_PASS || "";
  const encryption = port === 465 ? "ssl" : appSettings.smtpEncryption || "tls";
  const smtpHostUsed = `${host}:${port} (${encryption.toUpperCase()})`;
  if (!appSettings.smtpEnabled) {
    const failedLog = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "failed",
      previewSnippet: params.previewSnippet,
      errorMessage: "Server SMTP sedang dinonaktifkan dalam pengaturan sistem.",
      smtpHostUsed
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    return { success: false, logId: failedLog.id, message: failedLog.errorMessage };
  }
  if (!host || !user || !pass || pass === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
    const errMsg = "Kredensial SMTP belum dikonfigurasi lengkap (Host, Email User, atau Password SMTP masih kosong / default). Silakan atur kredensial SMTP Niagahoster/cPanel Anda di menu Pengaturan SMTP.";
    const failedLog = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "failed",
      previewSnippet: params.previewSnippet,
      errorMessage: errMsg,
      smtpHostUsed
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    console.warn(`[SMTP Gagal] ${errMsg}`);
    return { success: false, logId: failedLog.id, message: errMsg, error: errMsg };
  }
  const isSecure = port === 465;
  let fromEmail = (appSettings.smtpSenderEmail || "").trim();
  if (!fromEmail || fromEmail === "notifications@ndtaxlaw.com" || !fromEmail.includes("@")) {
    fromEmail = user;
  }
  const fromName = (appSettings.smtpSenderName || appSettings.firmName || "NDTAXANDLAW").replace(/"/g, "");
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15e3,
      greetingTimeout: 15e3,
      socketTimeout: 2e4
    });
    const htmlBody = params.htmlContent || buildEmailHtml(params.subject, params.recipientName || params.recipient, params.previewSnippet);
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.recipient,
      replyTo: appSettings.smtpReplyToEmail || fromEmail,
      subject: params.subject,
      text: params.previewSnippet,
      html: htmlBody
    });
    const sentLog = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "sent",
      previewSnippet: params.previewSnippet,
      htmlContent: htmlBody,
      smtpHostUsed
    };
    emailLogs.unshift(sentLog);
    saveDatabase();
    await persistEmailLogsToSupabase(sentLog);
    console.log(`[SMTP Terkirim] [${params.category}] Ke: ${params.recipient} | MessageID: ${info.messageId} via ${smtpHostUsed}`);
    return {
      success: true,
      logId: sentLog.id,
      message: `Email berhasil dikirim ke ${params.recipient} melalui server SMTP ${smtpHostUsed}.`
    };
  } catch (err) {
    const errMsg = err?.message || "Koneksi ke server SMTP gagal / ditolak.";
    const failedLog = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      recipient: params.recipient,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "failed",
      previewSnippet: params.previewSnippet,
      errorMessage: errMsg,
      smtpHostUsed
    };
    emailLogs.unshift(failedLog);
    saveDatabase();
    await persistEmailLogsToSupabase(failedLog);
    console.error(`[SMTP Error] Gagal mengirim email ke ${params.recipient} via ${smtpHostUsed}:`, errMsg);
    return {
      success: false,
      logId: failedLog.id,
      message: `Gagal mengirim email melalui SMTP (${smtpHostUsed}): ${errMsg}`,
      error: errMsg
    };
  }
};
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
var computeDynamicSalesHistory = () => {
  if (!isProductionMode() && !supabase) {
    return monthlySalesHistory;
  }
  const monthNamesId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const now = /* @__PURE__ */ new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${yyyy}-${mm}`;
    const label = `${monthNamesId[d.getMonth()]} ${yyyy}`;
    buckets.push({
      key,
      month: label,
      totalSales: 0,
      totalCommission: 0,
      mitraCount: 0,
      dealsClosed: 0
    });
  }
  const approvedDeals = clientDeals.filter(
    (d) => d.status === "active_subscription" || d.status === "deal_closed"
  );
  for (const deal of approvedDeals) {
    const rawDate = (deal.subscriptionStartDate || deal.date || "").slice(0, 7);
    const targetBucket = buckets.find((b) => b.key === rawDate) || buckets[buckets.length - 1];
    if (targetBucket) {
      targetBucket.totalSales += Number(deal.dealValue) || 0;
      targetBucket.totalCommission += Number(deal.commissionAmount) || 0;
      targetBucket.dealsClosed += 1;
    }
  }
  if (approvedDeals.length === 0 && commissions.length > 0) {
    for (const trx of commissions) {
      const rawDate = (trx.date || "").slice(0, 7);
      const targetBucket = buckets.find((b) => b.key === rawDate) || buckets[buckets.length - 1];
      if (targetBucket) {
        targetBucket.totalSales += Number(trx.dealValue) || 0;
        targetBucket.totalCommission += (Number(trx.commissionAmount) || 0) + (Number(trx.bonusAmount) || 0);
        targetBucket.dealsClosed += 1;
      }
    }
  }
  for (const b of buckets) {
    const countUpToMonth = mitras.filter((m) => {
      const jm = (m.joinedDate || "").slice(0, 7);
      return !jm || jm <= b.key;
    }).length;
    b.mitraCount = countUpToMonth;
  }
  return buckets.map(({ key: _k, ...rest }) => rest);
};
var systemRoles = [
  {
    code: "admin",
    name: "Administrator Operasional",
    description: "Akses penuh manajemen operasional, manajemen staf, validasi klien & mitra, pencairan komisi, log audit, dan pengaturan sistem.",
    portalView: "admin",
    defaultTab: "dashboard",
    allowedTabs: ["dashboard", "admin-operations", "verification", "activity-logs", "marketing-tools", "commissions", "staff-management", "ai-reports", "idcard"],
    permissions: ["all", "manage_mitra", "manage_clients", "approve_payouts", "manage_services", "view_logs", "manage_settings", "manage_roles", "manage_staff"],
    isSystem: true,
    isActive: true
  },
  {
    code: "staff",
    name: "Staf Operasional",
    description: "Role Staf di bawah Admin: akses operasional sesuai menu yang diaktifkan Admin (kecuali Log Aktivitas/Email dan pengaturan sensitif Mode Sistem, Supabase, SMTP, Google OAuth, & Gemini AI).",
    portalView: "admin",
    defaultTab: "dashboard",
    allowedTabs: ["dashboard", "admin-operations", "verification", "marketing-tools", "commissions", "ai-reports", "idcard"],
    permissions: ["manage_mitra", "manage_clients", "approve_payouts", "manage_services", "manage_general_settings"],
    isSystem: true,
    isActive: true
  },
  {
    code: "mitra",
    name: "Mitra Konsultan & Referral",
    description: "Akses portal kemitraan eksklusif: kartu identitas mitra, input klien referral, pelacakan komisi, penarikan dana, dan materi promosi.",
    portalView: "mitra",
    defaultTab: "idcard",
    allowedTabs: ["idcard", "dashboard", "marketing-tools", "commissions"],
    permissions: ["view_idcard", "input_client", "view_commissions", "request_payout", "download_tools"],
    isSystem: true,
    isActive: true
  }
];
var getRoleDefinition = (roleCode) => {
  const normalized = (roleCode || "mitra").trim().toLowerCase();
  const found = systemRoles.find((r) => r.code.toLowerCase() === normalized && r.isActive);
  if (found) return found;
  if (normalized === "admin") return systemRoles[0];
  if (normalized === "staff") return systemRoles[1];
  return systemRoles[2] || systemRoles[1];
};
var PASSWORD_ENC_PREFIX = "ndenc$v2$";
var PASSWORD_SECRET_KEY = crypto.createHash("sha256").update(process.env.PASSWORD_SECRET_KEY || "NDTAXANDLAW-ENTERPRISE-AES256-SCRYPT-KEY-2026").digest();
var isEncryptedPassword = (val) => {
  return Boolean(val && val.startsWith(PASSWORD_ENC_PREFIX));
};
var encryptUserPassword = (plainPassword, roleCode = "mitra") => {
  const cleanRole = (roleCode || "mitra").trim().toLowerCase();
  if (isEncryptedPassword(plainPassword)) {
    const parts = plainPassword.split("$");
    if (parts.length >= 8) {
      parts[2] = cleanRole;
      return parts.join("$");
    }
    return plainPassword;
  }
  const salt = crypto.randomBytes(16);
  const scryptHash = crypto.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", PASSWORD_SECRET_KEY, iv);
  const encryptedBuf = Buffer.concat([
    cipher.update(scryptHash),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "ndenc",
    "v2",
    cleanRole,
    salt.toString("hex"),
    scryptHash.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encryptedBuf.toString("hex")
  ].join("$");
};
var extractUserRole = (storedValue, fallbackRole = "mitra") => {
  if (!storedValue) return fallbackRole;
  if (isEncryptedPassword(storedValue)) {
    const parts = storedValue.split("$");
    if (parts.length >= 3 && parts[2]) {
      return parts[2].toLowerCase();
    }
  }
  return fallbackRole;
};
var verifyUserPassword = (inputPassword, storedValue, defaultRole = "mitra") => {
  if (!storedValue || !inputPassword) {
    return { valid: false, role: defaultRole, needsUpgrade: false };
  }
  if (isEncryptedPassword(storedValue)) {
    try {
      const parts = storedValue.split("$");
      const role = parts[2] || defaultRole;
      const salt = Buffer.from(parts[3], "hex");
      const expectedHash = Buffer.from(parts[4], "hex");
      const computedHash = crypto.scryptSync(inputPassword, salt, 64, { N: 16384, r: 8, p: 1 });
      if (parts.length >= 8) {
        const iv = Buffer.from(parts[5], "hex");
        const authTag = Buffer.from(parts[6], "hex");
        const encryptedBuf = Buffer.from(parts[7], "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", PASSWORD_SECRET_KEY, iv);
        decipher.setAuthTag(authTag);
        const decryptedHash = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
        if (decryptedHash.length === computedHash.length && crypto.timingSafeEqual(decryptedHash, computedHash)) {
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
  const isMatch = inputPassword === storedValue;
  return { valid: isMatch, role: defaultRole, needsUpgrade: isMatch };
};
var adminAccount = {
  id: "admin-01",
  name: "Admin Operasional NDTAXANDLAW",
  email: "admin@ndtaxlaw.com",
  phone: "0812-8899-7711",
  position: "Super Administrator Operasional",
  password: "adminND2026!",
  role: "admin",
  gender: "male",
  avatarUrl: MALE_AVATAR_URL
};
var staffAccounts = [
  {
    id: "staff-01",
    name: "Rina Kusuma, S.E.",
    email: "staf@ndtaxlaw.com",
    phone: "0812-7788-9900",
    position: "Staf Operasional & Verifikasi Pajak",
    gender: "female",
    avatarUrl: FEMALE_AVATAR_URL,
    isActive: true,
    allowedMenus: [...DEFAULT_STAFF_ALLOWED_MENUS],
    createdAt: "2026-01-15"
  }
];
var userPasswords = /* @__PURE__ */ new Map([
  ["admin@ndtaxlaw.com", encryptUserPassword("adminND2026!", "admin")],
  ["staf@ndtaxlaw.com", encryptUserPassword("stafND2026!", "staff")],
  ["bambang.sudirman@example.com", encryptUserPassword("mitraND2026!", "mitra")],
  ["dewi.lestari@example.com", encryptUserPassword("mitraND2026!", "mitra")],
  ["rian.pratama@example.com", encryptUserPassword("mitraND2026!", "mitra")]
]);
var passwordResetTokens = /* @__PURE__ */ new Map();
var isProductionMode = () => {
  return appSettings.appEnvironment === "production" || process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
};
var normalizeMitraAvatars = (list) => {
  return list.map((m) => {
    const gender = m.gender || inferGenderFromName(m.fullName);
    const bankMeta = m.bankDetails || {};
    return {
      ...m,
      gender,
      avatarUrl: resolveAvatarUrl(m.avatarUrl, gender, m.fullName),
      rejectionReason: m.rejectionReason || bankMeta.__rejectionReason || void 0,
      rejectedAt: m.rejectedAt || bankMeta.__rejectedAt || void 0,
      customFields: m.customFields || bankMeta.__customFields || void 0
    };
  });
};
var computeNextBillingDate = (baseDateStr, billingDay, pricingType) => {
  const parts = (baseDateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).split("-").map(Number);
  let year = parts[0] || (/* @__PURE__ */ new Date()).getFullYear();
  let month = (parts[1] || (/* @__PURE__ */ new Date()).getMonth() + 1) - 1;
  const day = Math.min(28, Math.max(1, billingDay || parts[2] || 1));
  if (pricingType === "annual_subscription") {
    year += 1;
  } else {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};
var ND_META_REGEX = /\s*<!--ND_META:(.*?)-->\s*$/s;
var toSupabaseClientDeal = (deal) => {
  const cleanNotes = (deal.notes || "").replace(ND_META_REGEX, "").trim();
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
    customFields: deal.customFields
  };
  const encodedNotes = `${cleanNotes}${cleanNotes ? " " : ""}<!--ND_META:${JSON.stringify(metaObj)}-->`;
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
    paymentTermType: deal.paymentTermType ?? "one_time",
    notes: encodedNotes,
    submittedBy: deal.submittedBy ?? "mitra"
  };
};
var fromSupabaseClientDeal = (row) => {
  const rawNotes = typeof row.notes === "string" ? row.notes : "";
  const match = rawNotes.match(ND_META_REGEX);
  let meta = {};
  if (match && match[1]) {
    try {
      meta = JSON.parse(match[1]);
    } catch {
    }
  }
  const cleanNotes = rawNotes.replace(ND_META_REGEX, "").trim();
  return {
    ...row,
    notes: cleanNotes,
    subscriptionStartDate: row.subscriptionStartDate || meta.subscriptionStartDate,
    billingDayOfMonth: row.billingDayOfMonth || meta.billingDayOfMonth,
    nextBillingDate: row.nextBillingDate || meta.nextBillingDate,
    lastBilledDate: row.lastBilledDate || meta.lastBilledDate,
    isBillingDue: row.isBillingDue !== void 0 ? row.isBillingDue : meta.isBillingDue,
    terminatedAt: row.terminatedAt || meta.terminatedAt,
    terminationReason: row.terminationReason || meta.terminationReason,
    rejectedAt: row.rejectedAt || meta.rejectedAt,
    rejectionReason: row.rejectionReason || meta.rejectionReason,
    customFields: row.customFields || meta.customFields
  };
};
var normalizeClientDeals = (list) => {
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return list.map((rawDeal) => {
    const d = fromSupabaseClientDeal(rawDeal);
    if (d.pricingType === "monthly_subscription" || d.pricingType === "annual_subscription") {
      const startDate = d.subscriptionStartDate || d.date || todayStr;
      const dayFromDate = Number(startDate.split("-")[2]) || 1;
      const billingDay = d.billingDayOfMonth || dayFromDate;
      let nextBill = d.nextBillingDate;
      let dueFlag = d.isBillingDue;
      if (!nextBill) {
        if (d.id === "deal-01") {
          nextBill = "2026-11-10";
          dueFlag = true;
        } else if (d.id === "deal-03") {
          nextBill = "2026-11-01";
          dueFlag = true;
        } else {
          nextBill = computeNextBillingDate(d.lastBilledDate || startDate, billingDay, d.pricingType);
          dueFlag = todayStr >= nextBill;
        }
      } else if (dueFlag === void 0) {
        dueFlag = todayStr >= nextBill;
      }
      return {
        ...d,
        subscriptionStartDate: startDate,
        billingDayOfMonth: billingDay,
        nextBillingDate: nextBill,
        isBillingDue: dueFlag
      };
    }
    return d;
  });
};
var DATA_DIR = path.join(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "database.json");
var cleanupLocalDatabaseFileInProduction = () => {
  if (!isProductionMode() || !supabase) return;
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      console.log("[Production Mode] File database lokal (data/database.json) dihapus otomatis agar tidak memenuhi penyimpanan server (100% menggunakan Supabase).");
    }
    if (fs.existsSync(DATA_DIR)) {
      const remaining = fs.readdirSync(DATA_DIR);
      if (remaining.length === 0) {
        fs.rmdirSync(DATA_DIR);
      }
    }
  } catch {
  }
};
var saveDatabase = () => {
  try {
    if (isProductionMode() && supabase) {
      cleanupLocalDatabaseFileInProduction();
      return;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const passwordsObj = {};
    for (const [k, v] of userPasswords.entries()) {
      const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === k.toLowerCase());
      const role = k.toLowerCase() === adminAccount.email.toLowerCase() ? "admin" : isStaffEmail ? "staff" : extractUserRole(v, "mitra");
      passwordsObj[k.toLowerCase()] = encryptUserPassword(v, role);
    }
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
      userPasswords: passwordsObj
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage Error] Gagal menyimpan konfigurasi ke disk:", err);
  }
};
var loadDatabase = () => {
  try {
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
      console.log("[Production Mode] Database lokal dinonaktifkan sepenuhnya. Menggunakan Cloud Supabase 100%.");
      return;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data.appSettings) {
        appSettings = { ...appSettings, ...data.appSettings };
        if (appSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          appSettings.smtpPassword = process.env.SMTP_PASS || "";
        }
        if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
          appSettings.appEnvironment = "production";
        }
      }
      if (Array.isArray(data.roles) && data.roles.length > 0) {
        systemRoles = data.roles;
      }
      if (data.adminProfile && typeof data.adminProfile === "object") {
        adminAccount = {
          ...adminAccount,
          ...data.adminProfile,
          role: "admin"
        };
      }
      if (Array.isArray(data.staffAccounts)) {
        staffAccounts = data.staffAccounts.map((s) => ({
          ...s,
          allowedMenus: Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0 ? s.allowedMenus : [...DEFAULT_STAFF_ALLOWED_MENUS]
        }));
      }
      if (Array.isArray(data.emailLogs)) {
        emailLogs = data.emailLogs.filter((l) => !["email-001", "email-002", "email-003"].includes(l.id));
      }
      if (Array.isArray(data.activityLogs)) {
        activityLogs = data.activityLogs;
      }
      if (data.userPasswords && typeof data.userPasswords === "object") {
        for (const [em, pass] of Object.entries(data.userPasswords)) {
          const emailKey = em.toLowerCase();
          const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === emailKey);
          const role = emailKey === adminAccount.email.toLowerCase() ? "admin" : isStaffEmail ? "staff" : extractUserRole(pass, "mitra");
          userPasswords.set(emailKey, encryptUserPassword(pass, role));
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
        console.log("[Production Mode] Hanya terhubung ke Database Supabase (penyimpanan lokal dinonaktifkan).");
      } else {
        if (Array.isArray(data.mitras)) mitras = normalizeMitraAvatars(data.mitras);
        if (Array.isArray(data.services)) services = data.services;
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
    console.error("[Storage Error] Gagal memuat konfigurasi disk:", err);
  }
};
var syncFromSupabase = async () => {
  if (!supabase) return;
  try {
    const { data: dbMitras, error: errM } = await supabase.from("mitras").select("*");
    if (!errM && Array.isArray(dbMitras)) {
      mitras = normalizeMitraAvatars(dbMitras);
      console.log(`[Supabase Cloud] Sinkronisasi ${mitras.length} mitra dari Supabase`);
    }
    const { data: dbServices, error: errS } = await supabase.from("services").select("*");
    if (!errS && Array.isArray(dbServices)) {
      services = dbServices;
      console.log(`[Supabase Cloud] Sinkronisasi ${services.length} layanan dari Supabase`);
    }
    const { data: dbDeals, error: errD } = await supabase.from("client_deals").select("*");
    if (!errD && Array.isArray(dbDeals)) {
      clientDeals = normalizeClientDeals(dbDeals);
      console.log(`[Supabase Cloud] Sinkronisasi ${clientDeals.length} deal klien dari Supabase`);
    }
    const { data: dbCommissions, error: errC } = await supabase.from("commissions").select("*");
    if (!errC && Array.isArray(dbCommissions)) {
      commissions = dbCommissions;
      console.log(`[Supabase Cloud] Sinkronisasi ${commissions.length} komisi dari Supabase`);
    }
    const { data: dbPayouts, error: errPay } = await supabase.from("payout_requests").select("*");
    if (!errPay && Array.isArray(dbPayouts)) {
      payoutRequests = dbPayouts;
      console.log(`[Supabase Cloud] Sinkronisasi ${payoutRequests.length} pengajuan pencairan dari Supabase`);
    }
    const { data: dbTools, error: errT } = await supabase.from("marketing_tools").select("*");
    if (!errT && Array.isArray(dbTools)) {
      marketingTools = dbTools;
      console.log(`[Supabase Cloud] Sinkronisasi ${marketingTools.length} tools marketing dari Supabase`);
    }
    const { data: dbNotifs, error: errN } = await supabase.from("notifications").select("*").order("timestamp", { ascending: false });
    if (!errN && Array.isArray(dbNotifs)) {
      notifications = dbNotifs;
      console.log(`[Supabase Cloud] Sinkronisasi ${notifications.length} notifikasi dari Supabase`);
    }
    const { data: dbPasswords, error: errP } = await supabase.from("user_passwords").select("*");
    if (!errP && Array.isArray(dbPasswords)) {
      const toUpgradeInSupabase = [];
      let hasSysConfig = false;
      let hasSysRoles = false;
      let hasSysAdminProfile = false;
      let hasSysStaffAccounts = false;
      let hasSysActivityLogs = false;
      let hasSysEmailLogs = false;
      for (const row of dbPasswords) {
        if (!row.email || !row.password) continue;
        const emailLower = row.email.toLowerCase();
        if (emailLower === "__sys_config__@ndtaxlaw.internal") {
          hasSysConfig = true;
          try {
            const parsedSettings = JSON.parse(row.password);
            if (parsedSettings && typeof parsedSettings === "object") {
              if (parsedSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
                delete parsedSettings.smtpPassword;
              }
              appSettings = { ...appSettings, ...parsedSettings };
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_roles__@ndtaxlaw.internal") {
          hasSysRoles = true;
          try {
            const parsedRoles = JSON.parse(row.password);
            if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
              systemRoles = parsedRoles;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_admin_profile__@ndtaxlaw.internal") {
          hasSysAdminProfile = true;
          try {
            const parsedAdmin = JSON.parse(row.password);
            if (parsedAdmin && typeof parsedAdmin === "object") {
              adminAccount = {
                ...adminAccount,
                ...parsedAdmin,
                role: "admin"
              };
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_staff_accounts__@ndtaxlaw.internal") {
          hasSysStaffAccounts = true;
          try {
            const parsedStaff = JSON.parse(row.password);
            if (Array.isArray(parsedStaff)) {
              staffAccounts = parsedStaff.map((s) => ({
                ...s,
                allowedMenus: Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0 ? s.allowedMenus : [...DEFAULT_STAFF_ALLOWED_MENUS]
              }));
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_activity_logs__@ndtaxlaw.internal") {
          hasSysActivityLogs = true;
          try {
            const parsedActivity = JSON.parse(row.password);
            if (Array.isArray(parsedActivity)) {
              activityLogs = parsedActivity;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_email_logs__@ndtaxlaw.internal") {
          hasSysEmailLogs = true;
          try {
            const parsedEmails = JSON.parse(row.password);
            if (Array.isArray(parsedEmails)) {
              emailLogs = parsedEmails;
            }
          } catch {
          }
          continue;
        }
        if (emailLower.startsWith("__sys_") && emailLower.endsWith("@ndtaxlaw.internal")) {
          continue;
        }
        const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === emailLower);
        const defaultRole = row.role || (emailLower === adminAccount.email.toLowerCase() ? "admin" : isStaffEmail ? "staff" : "mitra");
        if (!isEncryptedPassword(row.password)) {
          const encrypted = encryptUserPassword(row.password, defaultRole);
          userPasswords.set(emailLower, encrypted);
          toUpgradeInSupabase.push({ email: emailLower, password: encrypted });
        } else {
          userPasswords.set(emailLower, row.password);
        }
      }
      if (!hasSysConfig) {
        toUpgradeInSupabase.push({ email: "__sys_config__@ndtaxlaw.internal", password: JSON.stringify(appSettings) });
      }
      if (!hasSysRoles) {
        toUpgradeInSupabase.push({ email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) });
      }
      if (!hasSysAdminProfile) {
        const { password: _ap, ...safeAdmin } = adminAccount;
        toUpgradeInSupabase.push({ email: "__sys_admin_profile__@ndtaxlaw.internal", password: JSON.stringify(safeAdmin) });
      }
      if (!hasSysStaffAccounts) {
        toUpgradeInSupabase.push({ email: "__sys_staff_accounts__@ndtaxlaw.internal", password: JSON.stringify(staffAccounts) });
      }
      if (!hasSysActivityLogs) {
        toUpgradeInSupabase.push({ email: "__sys_activity_logs__@ndtaxlaw.internal", password: JSON.stringify(activityLogs.slice(0, 250)) });
      }
      if (!hasSysEmailLogs) {
        const compactEmails = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
        toUpgradeInSupabase.push({ email: "__sys_email_logs__@ndtaxlaw.internal", password: JSON.stringify(compactEmails) });
      }
      for (const m of mitras) {
        const mEmail = m.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r) => r.email && r.email.toLowerCase() === mEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(mEmail) || encryptUserPassword("mitraND2026!", "mitra");
          userPasswords.set(mEmail, localEnc);
          toUpgradeInSupabase.push({ email: mEmail, password: localEnc });
        }
      }
      for (const s of staffAccounts) {
        const sEmail = s.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r) => r.email && r.email.toLowerCase() === sEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(sEmail) || encryptUserPassword("stafND2026!", "staff");
          userPasswords.set(sEmail, localEnc);
          toUpgradeInSupabase.push({ email: sEmail, password: localEnc });
        }
      }
      const adminEmail = adminAccount.email.toLowerCase();
      if (!dbPasswords.some((r) => r.email && r.email.toLowerCase() === adminEmail)) {
        const adminEnc = userPasswords.get(adminEmail) || encryptUserPassword(adminAccount.password, "admin");
        userPasswords.set(adminEmail, adminEnc);
        toUpgradeInSupabase.push({ email: adminEmail, password: adminEnc });
      }
      if (toUpgradeInSupabase.length > 0) {
        await supabase.from("user_passwords").upsert(toUpgradeInSupabase);
        console.log(`[Supabase Cloud] Sinkronisasi pengaturan, profil admin, akun staf, log aktivitas, log email & kredensial terenkripsi ke Supabase selesai.`);
      }
    }
    try {
      const { data: dbSettings, error: errSet } = await supabase.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
      if (!errSet && dbSettings && dbSettings.settings) {
        const cloudSettings = dbSettings.settings;
        if (cloudSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          delete cloudSettings.smtpPassword;
        }
        appSettings = { ...appSettings, ...cloudSettings };
      }
    } catch {
    }
    try {
      const { data: dbActLogs, error: errAct } = await supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(250);
      if (!errAct && Array.isArray(dbActLogs) && dbActLogs.length > 0) {
        activityLogs = dbActLogs;
      }
    } catch {
    }
    try {
      const { data: dbEmLogs, error: errEm } = await supabase.from("email_logs").select("*").order("timestamp", { ascending: false }).limit(200);
      if (!errEm && Array.isArray(dbEmLogs)) {
        const mappedFromTable = dbEmLogs.map(fromSupabaseEmailLogRow);
        const mergedMap = /* @__PURE__ */ new Map();
        for (const item of [...mappedFromTable, ...emailLogs]) {
          if (item && item.id && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        }
        emailLogs = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
        );
        if (emailLogs.length > dbEmLogs.length) {
          const rowsToSync = emailLogs.slice(0, 100).map(toSupabaseEmailLogRow);
          await supabase.from("email_logs").upsert(rowsToSync);
        }
      }
    } catch {
    }
    saveDatabase();
  } catch (err) {
    console.warn("[Supabase Cloud Warning] Gagal sinkronisasi data dari Supabase saat startup:", err);
  }
};
loadDatabase();
if (!process.env.APP_ENV) {
  appSettings.appEnvironment = "production";
}
syncFromSupabase();
app.get("/api/roles", (req, res) => {
  res.json({
    success: true,
    data: systemRoles
  });
});
app.post("/api/roles", async (req, res) => {
  const { code, name, description, portalView, defaultTab, allowedTabs, permissions } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: "Kode role dan nama role wajib diisi." });
  }
  const cleanCode = String(code).trim().toLowerCase().replace(/\s+/g, "_");
  if (systemRoles.some((r) => r.code.toLowerCase() === cleanCode)) {
    return res.status(400).json({ success: false, message: `Role "${cleanCode}" sudah terdaftar.` });
  }
  const newRole = {
    code: cleanCode,
    name: String(name).trim(),
    description: description || `Role akses ${name}`,
    portalView: portalView === "admin" ? "admin" : "mitra",
    defaultTab: defaultTab || (portalView === "admin" ? "dashboard" : "idcard"),
    allowedTabs: Array.isArray(allowedTabs) && allowedTabs.length > 0 ? allowedTabs : portalView === "admin" ? ["dashboard", "admin-operations", "verification", "activity-logs", "marketing-tools", "commissions", "ai-reports", "idcard"] : ["idcard", "dashboard", "marketing-tools", "commissions"],
    permissions: Array.isArray(permissions) ? permissions : [],
    isSystem: false,
    isActive: true
  };
  systemRoles.push(newRole);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("user_passwords").upsert([
        { email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) }
      ]);
    } catch {
    }
  }
  res.status(201).json({ success: true, data: newRole });
});
app.put("/api/roles/:code", async (req, res) => {
  const { code } = req.params;
  const target = systemRoles.find((r) => r.code.toLowerCase() === code.toLowerCase());
  if (!target) {
    return res.status(404).json({ success: false, message: "Role tidak ditemukan." });
  }
  const { name, description, portalView, defaultTab, allowedTabs, permissions, isActive } = req.body;
  if (name !== void 0) target.name = name;
  if (description !== void 0) target.description = description;
  if (portalView === "admin" || portalView === "mitra") target.portalView = portalView;
  if (defaultTab !== void 0) target.defaultTab = defaultTab;
  if (Array.isArray(allowedTabs)) target.allowedTabs = allowedTabs;
  if (Array.isArray(permissions)) target.permissions = permissions;
  if (isActive !== void 0 && !target.isSystem) target.isActive = Boolean(isActive);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("user_passwords").upsert([
        { email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) }
      ]);
    } catch {
    }
  }
  res.json({ success: true, data: target });
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const isProd = isProductionMode();
  if (supabase) {
    try {
      const { data: sysRows } = await supabase.from("user_passwords").select("*").in("email", [
        "__sys_admin_profile__@ndtaxlaw.internal",
        "__sys_staff_accounts__@ndtaxlaw.internal",
        normalizedEmail
      ]);
      if (Array.isArray(sysRows)) {
        for (const r of sysRows) {
          const emLow = (r.email || "").toLowerCase();
          if (emLow === "__sys_admin_profile__@ndtaxlaw.internal" && r.password) {
            try {
              const parsedAdmin = JSON.parse(r.password);
              if (parsedAdmin && typeof parsedAdmin === "object") {
                adminAccount = { ...adminAccount, ...parsedAdmin, role: "admin" };
              }
            } catch {
            }
          } else if (emLow === "__sys_staff_accounts__@ndtaxlaw.internal" && r.password) {
            try {
              const parsedStaff = JSON.parse(r.password);
              if (Array.isArray(parsedStaff)) {
                staffAccounts = parsedStaff.map((s) => ({
                  ...s,
                  allowedMenus: Array.isArray(s.allowedMenus) && s.allowedMenus.length > 0 ? s.allowedMenus : [...DEFAULT_STAFF_ALLOWED_MENUS]
                }));
              }
            } catch {
            }
          }
        }
        const pwRow = sysRows.find((r) => (r.email || "").toLowerCase() === normalizedEmail);
        if (pwRow && pwRow.email && pwRow.password) {
          const isStaff = staffAccounts.some((s) => s.email.toLowerCase() === normalizedEmail);
          const defaultRole = normalizedEmail === adminAccount.email.toLowerCase() ? "admin" : isStaff ? "staff" : "mitra";
          if (!isEncryptedPassword(pwRow.password)) {
            const enc = encryptUserPassword(pwRow.password, defaultRole);
            userPasswords.set(normalizedEmail, enc);
            await supabase.from("user_passwords").upsert([{ email: normalizedEmail, password: enc }]);
          } else {
            userPasswords.set(normalizedEmail, pwRow.password);
          }
        }
      }
    } catch {
    }
  }
  if (normalizedEmail === adminAccount.email.toLowerCase()) {
    const storedAdminCred = userPasswords.get(adminAccount.email.toLowerCase()) || encryptUserPassword(adminAccount.password, "admin");
    const verifyRes = verifyUserPassword(password, storedAdminCred, "admin");
    if (verifyRes.valid) {
      const roleDef = getRoleDefinition("admin");
      recordActivity({
        actorRole: "admin",
        actorId: adminAccount.id,
        actorName: adminAccount.name,
        actorEmail: adminAccount.email,
        actionType: "login",
        operation: "LOGIN",
        targetEntity: "Autentikasi Admin",
        description: `Admin Operasional (${adminAccount.email}) berhasil login ke Panel Admin (Enkripsi: scrypt+AES256, Role: ${roleDef.code}).`
      });
      saveDatabase();
      return res.json({
        success: true,
        user: {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          phone: adminAccount.phone || "0812-8899-7711",
          position: adminAccount.position || "Super Administrator Operasional",
          role: "admin",
          roleCode: "admin",
          roleName: roleDef.name,
          portalView: "admin",
          defaultTab: "dashboard",
          allowedTabs: [
            "dashboard",
            "admin-operations",
            "verification",
            "activity-logs",
            "marketing-tools",
            "commissions",
            "staff-management",
            "ai-reports",
            "idcard"
          ],
          permissions: roleDef.permissions,
          gender: adminAccount.gender || "male",
          avatarUrl: resolveAvatarUrl(adminAccount.avatarUrl, adminAccount.gender || "male", adminAccount.name)
        },
        environment: appSettings.appEnvironment
      });
    }
    return res.status(401).json({ success: false, message: "Kata sandi admin tidak valid." });
  }
  const staffMember = staffAccounts.find((s) => s.email.toLowerCase() === normalizedEmail);
  if (staffMember) {
    if (!staffMember.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun Staf Anda sedang dinonaktifkan oleh Admin. Silakan hubungi Administrator."
      });
    }
    const storedStaffCred = userPasswords.get(normalizedEmail) || encryptUserPassword("stafND2026!", "staff");
    const verifyRes = verifyUserPassword(password, storedStaffCred, "staff");
    const isStaffPassValid = isProd ? verifyRes.valid : verifyRes.valid || password === "stafND2026!";
    if (isStaffPassValid) {
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, "staff");
        userPasswords.set(normalizedEmail, upgraded);
        if (supabase) {
          try {
            await supabase.from("user_passwords").upsert([{ email: normalizedEmail, password: upgraded }]);
          } catch {
          }
        }
      }
      const allowedMenus = Array.isArray(staffMember.allowedMenus) && staffMember.allowedMenus.length > 0 ? staffMember.allowedMenus : [...DEFAULT_STAFF_ALLOWED_MENUS];
      const staffNavTabs = ["dashboard", "admin-operations", "verification", "marketing-tools", "commissions"].filter(
        (t) => allowedMenus.includes(t)
      );
      const effectiveAllowedTabs = [
        ...staffNavTabs.length > 0 ? staffNavTabs : ["dashboard"],
        "idcard",
        "ai-reports"
      ];
      const defaultStaffTab = staffNavTabs[0] || "dashboard";
      const resolvedStaffGender = staffMember.gender || inferGenderFromName(staffMember.name);
      const resolvedStaffAvatar = resolveAvatarUrl(
        staffMember.avatarUrl,
        resolvedStaffGender,
        staffMember.name
      );
      recordActivity({
        actorRole: "staff",
        actorId: staffMember.id,
        actorName: staffMember.name,
        actorEmail: staffMember.email,
        actionType: "login",
        operation: "LOGIN",
        targetEntity: "Autentikasi Staf",
        description: `Staf Operasional "${staffMember.name}" (${staffMember.email}) berhasil login ke Panel Operasional.`
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
          role: "admin",
          roleCode: "staff",
          roleName: staffMember.position || "Staf Operasional",
          portalView: "admin",
          defaultTab: defaultStaffTab,
          allowedTabs: effectiveAllowedTabs,
          allowedMenus,
          permissions: ["staff_access", ...allowedMenus],
          gender: resolvedStaffGender,
          avatarUrl: resolvedStaffAvatar
        },
        environment: appSettings.appEnvironment
      });
    }
    return res.status(401).json({ success: false, message: "Kata sandi akun Staf tidak valid." });
  }
  let mitra;
  if (supabase) {
    try {
      const { data: dbMitras, error: errM } = await supabase.from("mitras").select("*");
      if (!errM && Array.isArray(dbMitras)) {
        mitras = normalizeMitraAvatars(dbMitras);
        mitra = mitras.find(
          (m) => m.email.toLowerCase() === normalizedEmail || m.memberCode && m.memberCode.toLowerCase() === normalizedEmail
        );
      }
    } catch (e) {
      if (isProd) {
        return res.status(503).json({
          success: false,
          message: "Gagal terhubung ke Database Supabase pada mode Production."
        });
      }
    }
  }
  if (!mitra && !isProd) {
    mitra = mitras.find(
      (m) => m.email.toLowerCase() === normalizedEmail || m.memberCode && m.memberCode.toLowerCase() === normalizedEmail
    );
  }
  if (mitra) {
    if (mitra.emailVerified === false) {
      return res.status(403).json({
        success: false,
        needsEmailVerification: true,
        email: mitra.email,
        message: "Akun Anda belum melakukan verifikasi email. Silakan periksa inbox (atau folder spam) email Anda dan masukkan kode verifikasi 6-digit untuk mengaktifkan akun sebelum masuk."
      });
    }
    const mitraEmailLower = mitra.email.toLowerCase();
    const storedCred = userPasswords.get(mitraEmailLower) || encryptUserPassword("mitraND2026!", "mitra");
    const verifyRes = verifyUserPassword(password, storedCred, "mitra");
    const isPasswordValid = isProd ? verifyRes.valid : verifyRes.valid || password === "mitraND2026!";
    if (isPasswordValid) {
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, verifyRes.role || "mitra");
        userPasswords.set(mitraEmailLower, upgraded);
        if (supabase) {
          try {
            await supabase.from("user_passwords").upsert([{ email: mitraEmailLower, password: upgraded }]);
          } catch {
          }
        }
      }
      const roleDef = getRoleDefinition(verifyRes.role || "mitra");
      const resolvedGender = mitra.gender || inferGenderFromName(mitra.fullName);
      const resolvedAvatar = resolveAvatarUrl(mitra.avatarUrl, resolvedGender, mitra.fullName);
      mitra.gender = resolvedGender;
      mitra.avatarUrl = resolvedAvatar;
      recordActivity({
        actorRole: "mitra",
        actorId: mitra.id,
        actorName: mitra.fullName,
        actorEmail: mitra.email,
        actionType: "login",
        operation: "LOGIN",
        targetEntity: "Autentikasi Mitra",
        description: `Mitra ${mitra.fullName} (${mitra.memberCode}) berhasil login ke Portal Kemitraan (Role: ${roleDef.code}).`
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
          avatarUrl: resolvedAvatar
        },
        environment: appSettings.appEnvironment
      });
    }
    return res.status(401).json({ success: false, message: "Kata sandi akun mitra salah. Silakan periksa kembali." });
  }
  return res.status(404).json({
    success: false,
    message: "Akun tidak ditemukan di database Supabase. Pastikan email atau nomor keanggotaan sudah terdaftar."
  });
});
var persistAdminAndStaffToCloud = async () => {
  saveDatabase();
  if (supabase) {
    try {
      const { password: _ap, ...safeAdmin } = adminAccount;
      await supabase.from("user_passwords").upsert([
        { email: "__sys_admin_profile__@ndtaxlaw.internal", password: JSON.stringify(safeAdmin) },
        { email: "__sys_staff_accounts__@ndtaxlaw.internal", password: JSON.stringify(staffAccounts) }
      ]);
    } catch (e) {
      console.warn("Supabase admin/staff sync warning:", e);
    }
  }
};
app.get("/api/admin/profile", async (req, res) => {
  const { password: _ap, ...safeAdmin } = adminAccount;
  res.json({
    success: true,
    data: {
      admin: {
        ...safeAdmin,
        avatarUrl: resolveAvatarUrl(safeAdmin.avatarUrl, safeAdmin.gender || "male", safeAdmin.name)
      },
      staffList: staffAccounts.map((s) => ({
        ...s,
        avatarUrl: resolveAvatarUrl(s.avatarUrl, s.gender || "female", s.name)
      }))
    }
  });
});
app.put("/api/admin/profile", async (req, res) => {
  const { name, email, phone, position, gender, avatarUrl, newPassword } = req.body;
  const oldEmailLower = adminAccount.email.toLowerCase();
  const nextEmailLower = email ? String(email).trim().toLowerCase() : oldEmailLower;
  if (!nextEmailLower || !nextEmailLower.includes("@")) {
    return res.status(400).json({ success: false, message: "Format email Admin tidak valid." });
  }
  if (nextEmailLower !== oldEmailLower && (staffAccounts.some((s) => s.email.toLowerCase() === nextEmailLower) || mitras.some((m) => m.email.toLowerCase() === nextEmailLower))) {
    return res.status(400).json({
      success: false,
      message: `Email "${nextEmailLower}" sudah digunakan oleh akun Staf atau Mitra lain.`
    });
  }
  if (name) adminAccount.name = String(name).trim();
  if (phone !== void 0) adminAccount.phone = String(phone).trim();
  if (position !== void 0) adminAccount.position = String(position).trim();
  if (gender === "male" || gender === "female") adminAccount.gender = gender;
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    adminAccount.avatarUrl = avatarUrl.trim();
  } else if (gender === "male" || gender === "female") {
    adminAccount.avatarUrl = getDefaultAvatar(gender, adminAccount.name);
  }
  const prevStoredEnc = userPasswords.get(oldEmailLower) || encryptUserPassword(adminAccount.password, "admin");
  if (nextEmailLower !== oldEmailLower) {
    userPasswords.delete(oldEmailLower);
    adminAccount.email = nextEmailLower;
    if (supabase) {
      try {
        await supabase.from("user_passwords").delete().ilike("email", oldEmailLower);
      } catch {
      }
    }
  }
  if (newPassword && String(newPassword).trim().length >= 6) {
    const cleanNewPass = String(newPassword).trim();
    adminAccount.password = cleanNewPass;
    const encryptedPass = encryptUserPassword(cleanNewPass, "admin");
    userPasswords.set(nextEmailLower, encryptedPass);
    if (supabase) {
      try {
        await supabase.from("user_passwords").upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {
      }
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, "admin");
    userPasswords.set(nextEmailLower, reEncrypted);
    if (supabase) {
      try {
        await supabase.from("user_passwords").upsert([{ email: nextEmailLower, password: reEncrypted }]);
      } catch {
      }
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "profile_update",
    operation: "UPDATE",
    targetEntity: "Profil & Keamanan Admin",
    description: `Admin memperbarui data profil (${adminAccount.name} - ${adminAccount.email})${newPassword ? " beserta kata sandi akun Admin." : "."}`
  });
  await persistAdminAndStaffToCloud();
  const { password: _ap, ...safeAdmin } = adminAccount;
  res.json({
    success: true,
    message: "Data profil dan keamanan Admin berhasil diperbarui!",
    data: {
      ...safeAdmin,
      avatarUrl: resolveAvatarUrl(safeAdmin.avatarUrl, safeAdmin.gender || "male", safeAdmin.name)
    }
  });
});
app.get("/api/staff", async (req, res) => {
  res.json({
    success: true,
    data: staffAccounts.map((s) => ({
      ...s,
      avatarUrl: resolveAvatarUrl(s.avatarUrl, s.gender || "female", s.name)
    }))
  });
});
app.post("/api/staff", async (req, res) => {
  const { name, email, phone, position, gender, avatarUrl, password, allowedMenus, isActive } = req.body;
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanName || !cleanEmail || !cleanEmail.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap dan alamat email Staf wajib diisi dengan benar."
    });
  }
  if (cleanEmail === adminAccount.email.toLowerCase() || staffAccounts.some((s) => s.email.toLowerCase() === cleanEmail) || mitras.some((m) => m.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({
      success: false,
      message: `Email "${cleanEmail}" sudah terdaftar pada sistem. Gunakan alamat email lain.`
    });
  }
  const resolvedGender = gender === "female" ? "female" : gender === "male" ? "male" : inferGenderFromName(cleanName);
  const resolvedAvatar = avatarUrl && String(avatarUrl).trim().length > 0 ? String(avatarUrl).trim() : getDefaultAvatar(resolvedGender, cleanName);
  const validMenus = Array.isArray(allowedMenus) && allowedMenus.length > 0 ? allowedMenus : [...DEFAULT_STAFF_ALLOWED_MENUS];
  const newStaff = {
    id: `staff-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    phone: (phone || "").trim() || "-",
    position: (position || "").trim() || "Staf Operasional",
    gender: resolvedGender,
    avatarUrl: resolvedAvatar,
    isActive: isActive !== false,
    allowedMenus: validMenus,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  staffAccounts.unshift(newStaff);
  const encryptedPass = encryptUserPassword(
    password && String(password).trim().length >= 6 ? String(password).trim() : "stafND2026!",
    "staff"
  );
  userPasswords.set(cleanEmail, encryptedPass);
  if (supabase) {
    try {
      await supabase.from("user_passwords").upsert([{ email: cleanEmail, password: encryptedPass }]);
    } catch {
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "register",
    operation: "CREATE",
    targetEntity: "Manajemen Staf",
    description: `Admin menambahkan akun Staf baru "${newStaff.name}" (${newStaff.email}) dengan jabatan "${newStaff.position}".`
  });
  await persistAdminAndStaffToCloud();
  res.status(201).json({
    success: true,
    message: `Akun Staf "${newStaff.name}" berhasil ditambahkan!`,
    data: newStaff
  });
});
app.put("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const staff = staffAccounts.find((s) => s.id === id);
  if (!staff) {
    return res.status(404).json({ success: false, message: "Data Staf tidak ditemukan." });
  }
  const { name, email, phone, position, gender, avatarUrl, newPassword, allowedMenus, isActive, actorRole } = req.body;
  const oldEmailLower = staff.email.toLowerCase();
  const nextEmailLower = email ? String(email).trim().toLowerCase() : oldEmailLower;
  if (!nextEmailLower || !nextEmailLower.includes("@")) {
    return res.status(400).json({ success: false, message: "Format email Staf tidak valid." });
  }
  if (nextEmailLower !== oldEmailLower && (nextEmailLower === adminAccount.email.toLowerCase() || staffAccounts.some((s) => s.id !== id && s.email.toLowerCase() === nextEmailLower) || mitras.some((m) => m.email.toLowerCase() === nextEmailLower))) {
    return res.status(409).json({
      success: false,
      message: `Email "${nextEmailLower}" sudah digunakan oleh pengguna lain.`
    });
  }
  if (name) staff.name = String(name).trim();
  if (phone !== void 0) staff.phone = String(phone).trim();
  if (position !== void 0) staff.position = String(position).trim();
  if (gender === "male" || gender === "female") staff.gender = gender;
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    staff.avatarUrl = avatarUrl.trim();
  } else if (gender === "male" || gender === "female") {
    staff.avatarUrl = getDefaultAvatar(gender, staff.name);
  }
  if (Array.isArray(allowedMenus)) {
    staff.allowedMenus = allowedMenus;
  }
  if (isActive !== void 0) {
    staff.isActive = Boolean(isActive);
  }
  staff.updatedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const prevStoredEnc = userPasswords.get(oldEmailLower) || encryptUserPassword("stafND2026!", "staff");
  if (nextEmailLower !== oldEmailLower) {
    userPasswords.delete(oldEmailLower);
    staff.email = nextEmailLower;
    if (supabase) {
      try {
        await supabase.from("user_passwords").delete().ilike("email", oldEmailLower);
      } catch {
      }
    }
  }
  if (newPassword && String(newPassword).trim().length >= 6) {
    const encryptedPass = encryptUserPassword(String(newPassword).trim(), "staff");
    userPasswords.set(nextEmailLower, encryptedPass);
    if (supabase) {
      try {
        await supabase.from("user_passwords").upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {
      }
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, "staff");
    userPasswords.set(nextEmailLower, reEncrypted);
    if (supabase) {
      try {
        await supabase.from("user_passwords").upsert([{ email: nextEmailLower, password: reEncrypted }]);
      } catch {
      }
    }
  }
  recordActivity({
    actorRole: actorRole === "staff" ? "staff" : "admin",
    actorId: actorRole === "staff" ? staff.id : adminAccount.id,
    actorName: actorRole === "staff" ? staff.name : adminAccount.name,
    actorEmail: actorRole === "staff" ? staff.email : adminAccount.email,
    actionType: "profile_update",
    operation: "UPDATE",
    targetEntity: "Data & Hak Akses Staf",
    description: actorRole === "staff" ? `Staf "${staff.name}" (${staff.email}) memperbarui profil akunnya${newPassword ? " beserta kata sandi." : "."}` : `Admin memperbarui data / hak akses menu Staf "${staff.name}" (${staff.email}).`
  });
  await persistAdminAndStaffToCloud();
  res.json({
    success: true,
    message: "Data dan konfigurasi akun Staf berhasil diperbarui!",
    data: {
      ...staff,
      avatarUrl: resolveAvatarUrl(staff.avatarUrl, staff.gender || "female", staff.name)
    }
  });
});
app.delete("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  const target = staffAccounts.find((s) => s.id === id);
  if (!target) {
    return res.status(404).json({ success: false, message: "Data Staf tidak ditemukan." });
  }
  const emailLower = target.email.toLowerCase();
  staffAccounts = staffAccounts.filter((s) => s.id !== id);
  userPasswords.delete(emailLower);
  if (supabase) {
    try {
      await supabase.from("user_passwords").delete().ilike("email", emailLower);
    } catch {
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "profile_update",
    operation: "DELETE",
    targetEntity: "Manajemen Staf",
    description: `Admin menghapus akun Staf "${target.name}" (${target.email}).`
  });
  await persistAdminAndStaffToCloud();
  res.json({
    success: true,
    message: `Akun Staf "${target.name}" berhasil dihapus.`
  });
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const isAdmin = normalizedEmail === adminAccount.email.toLowerCase();
  const staff = staffAccounts.find((s) => s.email.toLowerCase() === normalizedEmail);
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!isAdmin && !staff && !mitra) {
    return res.status(404).json({
      success: false,
      message: "Email tidak terdaftar di database sistem NDTAXANDLAW."
    });
  }
  const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
  passwordResetTokens.set(normalizedEmail, {
    otp: otpCode,
    expiresAt: Date.now() + 30 * 60 * 1e3
  });
  const recipientName = isAdmin ? adminAccount.name : staff ? staff.name : mitra ? mitra.fullName : "Pengguna NDTAXANDLAW";
  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName,
    subject: `Kode Verifikasi Pemulihan Kata Sandi Akun NDTAXANDLAW: ${otpCode}`,
    category: "password_reset",
    previewSnippet: `Halo ${recipientName},

Kode OTP pemulihan kata sandi akun Anda adalah: ${otpCode}

Gunakan kode 6-digit ini untuk memperbarui kata sandi baru Anda. Kode berlaku selama 30 menit. Jangan bagikan kode ini kepada orang lain demi keamanan.`
  });
  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message: `Gagal mengirim email kode OTP ke ${email}. Pastikan pengaturan SMTP sudah terhubung dengan benar. (${emailResult.message})`
    });
  }
  res.json({
    success: true,
    message: `Kode OTP pemulihan kata sandi telah dikirim ke email ${email}. Silakan periksa inbox atau folder spam Anda.`
  });
});
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, otpCode, newPassword } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter." });
  }
  const storedToken = passwordResetTokens.get(normalizedEmail);
  if (storedToken) {
    if (otpCode && storedToken.otp !== String(otpCode).trim()) {
      return res.status(400).json({ success: false, message: "Kode OTP pemulihan tidak cocok. Silakan periksa kembali email Anda." });
    }
    passwordResetTokens.delete(normalizedEmail);
  }
  const isStaff = staffAccounts.some((s) => s.email.toLowerCase() === normalizedEmail);
  const existingRole = normalizedEmail === adminAccount.email.toLowerCase() ? "admin" : isStaff ? "staff" : extractUserRole(userPasswords.get(normalizedEmail), "mitra");
  const encryptedPassword = encryptUserPassword(newPassword, existingRole);
  userPasswords.set(normalizedEmail, encryptedPassword);
  const staff = staffAccounts.find((s) => s.email.toLowerCase() === normalizedEmail);
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  recordActivity({
    actorRole: normalizedEmail === adminAccount.email.toLowerCase() ? "admin" : isStaff ? "staff" : "mitra",
    actorId: mitra?.id || staff?.id || "admin-01",
    actorName: mitra?.fullName || staff?.name || adminAccount.name,
    actorEmail: normalizedEmail,
    actionType: "password_reset",
    operation: "UPDATE",
    targetEntity: "Keamanan Akun",
    description: `Kata sandi untuk akun ${normalizedEmail} berhasil diperbarui dan dienkripsi (scrypt + AES-256-GCM).`
  });
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("user_passwords").upsert([{ email: normalizedEmail, password: encryptedPassword }]);
    } catch (e) {
      console.warn("Supabase password reset update error", e);
    }
  }
  res.json({
    success: true,
    message: "Kata sandi Anda telah berhasil diubah dan dienkripsi. Silakan masuk menggunakan kata sandi baru."
  });
});
app.post("/api/auth/verify-email", async (req, res) => {
  const { email, token } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const inputToken = (token || "").trim();
  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Akun dengan email tersebut tidak ditemukan." });
  }
  if (mitra.emailVerified) {
    return res.json({ success: true, message: "Email akun ini sudah terverifikasi sebelumnya. Anda dapat langsung masuk." });
  }
  const isTokenValid = Boolean(mitra.verificationToken && mitra.verificationToken === inputToken);
  if (!isTokenValid) {
    return res.status(400).json({
      success: false,
      message: "Kode verifikasi 6-digit salah atau tidak cocok. Silakan periksa kembali pesan di email Anda."
    });
  }
  mitra.emailVerified = true;
  mitra.verificationToken = void 0;
  mitra.verificationTokenExpiry = void 0;
  recordActivity({
    actorRole: "mitra",
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: "verify_email",
    operation: "UPDATE",
    targetEntity: "Verifikasi Email Mitra",
    description: `Mitra ${mitra.fullName} (${mitra.email}) berhasil memverifikasi alamat email menggunakan kode OTP 6-digit.`
  });
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("mitras").update({
        emailVerified: true,
        verificationToken: null
      }).eq("email", normalizedEmail);
    } catch (e) {
      console.warn("Supabase verify-email update error", e);
    }
  }
  res.json({
    success: true,
    message: "Verifikasi email berhasil! Akun kemitraan Anda kini telah aktif dan siap digunakan untuk masuk ke portal."
  });
});
app.post("/api/auth/resend-verification", async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Akun mitra dengan email tersebut tidak ditemukan." });
  }
  if (mitra.emailVerified) {
    return res.json({ success: true, message: "Email akun Anda sudah terverifikasi. Silakan langsung masuk." });
  }
  const newToken = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiryIso = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  mitra.verificationToken = newToken;
  mitra.verificationTokenExpiry = expiryIso;
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("mitras").update({
        verificationToken: newToken,
        verificationTokenExpiry: expiryIso
      }).eq("email", normalizedEmail);
    } catch (e) {
      console.warn("Supabase resend-verification update error", e);
    }
  }
  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: mitra.fullName,
    subject: `[Kirim Ulang] Kode Verifikasi Email Akun Kemitraan NDTAXANDLAW: ${newToken}`,
    category: "registration_verify",
    previewSnippet: `Halo ${mitra.fullName},

Berikut adalah kode verifikasi email 6-digit terbaru Anda: ${newToken}

Silakan masukkan kode tersebut pada halaman verifikasi untuk mengaktifkan akun kemitraan Anda sebelum masuk.`
  });
  recordActivity({
    actorRole: "mitra",
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: "verify_email",
    operation: "UPDATE",
    targetEntity: "Kirim Ulang Kode Verifikasi Email",
    description: emailResult.success ? `Mitra "${mitra.fullName}" meminta kirim ulang kode OTP verifikasi ke ${mitra.email} (Terkirim via SMTP).` : `Mitra "${mitra.fullName}" meminta kirim ulang kode OTP verifikasi ke ${mitra.email}, namun pengiriman email gagal: ${emailResult.message}`
  });
  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message: `Gagal mengirim email verifikasi ke ${mitra.email}. Silakan periksa konfigurasi SMTP di Pengaturan Sistem. Detail: ${emailResult.message}`
    });
  }
  res.json({
    success: true,
    message: `Kode verifikasi baru telah dikirimkan ke alamat email ${mitra.email}. Silakan cek kotak masuk atau folder spam Anda.`
  });
});
app.get("/api/mitra", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("mitras").select("*");
      if (!error && Array.isArray(data)) {
        mitras = normalizeMitraAvatars(data);
        saveDatabase();
        return res.json({ success: true, data: mitras });
      }
      if (isProductionMode() && error) {
        return res.status(503).json({ success: false, message: `Supabase Error: ${error.message}`, data: [] });
      }
    } catch (e) {
      if (isProductionMode()) {
        return res.status(503).json({ success: false, message: "Gagal memuat data mitra dari Supabase.", data: [] });
      }
      console.warn("Supabase query error for mitras, using dev fallback", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Supabase wajib terhubung pada mode Production.", data: [] });
  }
  mitras = normalizeMitraAvatars(mitras);
  res.json({ success: true, data: mitras });
});
app.get("/api/mitra/public-verify/:code", async (req, res) => {
  const rawCode = String(req.params.code || "").trim();
  if (!rawCode) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Informasi data mitra tidak ditemukan."
    });
  }
  if (supabase) {
    try {
      const { data } = await supabase.from("mitras").select("*");
      if (Array.isArray(data)) {
        mitras = normalizeMitraAvatars(data);
      }
    } catch {
    }
  }
  const normalizedQuery = rawCode.toUpperCase();
  const matched = mitras.find(
    (m) => (m.memberCode || "").trim().toUpperCase() === normalizedQuery || (m.referralCode || "").trim().toUpperCase() === normalizedQuery || (m.id || "").trim().toUpperCase() === normalizedQuery
  );
  if (!matched || matched.status !== "verified") {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Informasi Data Mitra Tidak Ditemukan atau Belum Terverifikasi Resmi."
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
      gender: matched.gender || "male",
      status: "verified",
      firmName: appSettings.firmName || "NDTAXANDLAW",
      supportPhone: appSettings.supportPhone || "0812-8899-7711",
      supportEmail: appSettings.supportEmail || "advisory@ndtaxlaw.com",
      officeAddress: appSettings.officeAddress || "Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950"
    }
  });
});
app.post("/api/mitra/register", async (req, res) => {
  const { fullName, email, phone, nik, specialization, bankDetails, password, gender, role, customFields } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email wajib diisi untuk kredensial akun." });
  }
  const safeFullName = (fullName || "").trim() || email.split("@")[0];
  const safePhone = (phone || "").trim() || "-";
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (supabase) {
    try {
      const { data: dbMitras, error: errM } = await supabase.from("mitras").select("*");
      if (!errM && Array.isArray(dbMitras)) {
        mitras = normalizeMitraAvatars(dbMitras);
      }
    } catch {
    }
  }
  const existingMitra = mitras.find((m) => m.email.toLowerCase() === normalizedEmail);
  if (existingMitra) {
    return res.status(400).json({
      success: false,
      message: `Email "${email}" sudah terdaftar sebagai mitra. Silakan masuk (login) ke akun Anda atau gunakan email lain.`
    });
  }
  const verificationToken = Math.floor(1e5 + Math.random() * 9e5).toString();
  const generatedReferralCode = `ND-REF-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const resolvedGender = gender === "female" ? "female" : gender === "male" ? "male" : inferGenderFromName(safeFullName);
  const assignedRole = getRoleDefinition(role || "mitra").code;
  const cleanCustomFields = customFields && typeof customFields === "object" && Object.keys(customFields).length > 0 ? customFields : void 0;
  const baseBank = bankDetails || {
    bankName: "Bank Central Asia (BCA)",
    accountNumber: "-",
    accountHolder: safeFullName
  };
  const newMitra = {
    id: `mitra-${Date.now()}`,
    memberCode: `ND-${(/* @__PURE__ */ new Date()).getFullYear()}-PEN-${Math.floor(1e3 + Math.random() * 9e3)}`,
    referralCode: generatedReferralCode,
    fullName: safeFullName,
    email: normalizedEmail,
    phone: safePhone,
    nik: (nik || "").trim() || "-",
    specialization: appSettings.specializationEnabled === false ? specialization || "Mitra Referral & Konsultan Bisnis" : specialization || "Konsultan Perpajakan & Tax Planning",
    status: "pending",
    gender: resolvedGender,
    avatarUrl: req.body.avatarUrl || getDefaultAvatar(resolvedGender, safeFullName),
    joinedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    bankDetails: cleanCustomFields ? { ...baseBank, __customFields: cleanCustomFields } : baseBank,
    customFields: cleanCustomFields,
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
  };
  mitras.unshift(newMitra);
  const encryptedPass = encryptUserPassword(password || "mitraND2026!", assignedRole);
  userPasswords.set(normalizedEmail, encryptedPass);
  recordActivity({
    actorRole: "mitra",
    actorId: newMitra.id,
    actorName: newMitra.fullName,
    actorEmail: newMitra.email,
    actionType: "register",
    operation: "CREATE",
    targetEntity: "Pendaftaran Mitra",
    description: `Pendaftaran mitra baru "${newMitra.fullName}" (${newMitra.email}, Role: ${assignedRole}) dengan ${appSettings.specializationLabel || DEFAULT_SPECIALIZATION_LABEL}: ${newMitra.specialization}. Password dienkripsi (scrypt + AES-256-GCM).`
  });
  if (supabase) {
    try {
      const { gender: _g, customFields: _cf, ...supabaseMitraPayload } = newMitra;
      const { error: insertErr } = await supabase.from("mitras").insert([supabaseMitraPayload]);
      if (insertErr) {
        console.warn("Supabase mitra insert warning:", insertErr.message);
      }
      await supabase.from("user_passwords").upsert([{ email: normalizedEmail, password: encryptedPass }]);
    } catch (e) {
      console.warn("Supabase insert error for new mitra", e);
    }
  }
  saveDatabase();
  const emailResult = await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: fullName,
    subject: `Kode Verifikasi Email & Aktivasi Kemitraan NDTAXANDLAW: ${verificationToken}`,
    category: "registration_verify",
    previewSnippet: `Halo ${fullName},

Selamat bergabung di jaringan Kemitraan NDTAXANDLAW.
Kode verifikasi email 6-digit Anda adalah: ${verificationToken}

Silakan masukkan kode ini pada formulir aktivasi akun untuk mengaktifkan akun Anda sebelum dapat masuk (login).`
  });
  const newNotif = {
    id: `notif-${Date.now()}`,
    title: "Pendaftaran Mitra Baru",
    message: `${fullName} baru saja mendaftar kemitraan (Menunggu verifikasi email & approval).`,
    type: "verification",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(newNotif);
  if (supabase) {
    try {
      await supabase.from("notifications").insert([newNotif]);
    } catch {
    }
  }
  saveDatabase();
  res.status(201).json({
    success: true,
    data: newMitra,
    needsEmailVerification: true,
    email: normalizedEmail,
    emailSent: emailResult.success,
    emailError: emailResult.error,
    message: emailResult.success ? `Pendaftaran berhasil disimpan! Kode verifikasi 6-digit telah dikirimkan ke email ${normalizedEmail}. Silakan cek inbox/spam Anda.` : `Pendaftaran berhasil disimpan, namun pengiriman email verifikasi mengalami kendala SMTP: ${emailResult.message}`
  });
});
app.put("/api/mitra/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  mitra.status = status;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (status === "verified") {
    if (!mitra.memberCode || mitra.memberCode.includes("-PEN-")) {
      const randomCode = Math.floor(100 + Math.random() * 900);
      mitra.memberCode = `ND-${(/* @__PURE__ */ new Date()).getFullYear()}-LAW-${randomCode}`;
    }
    mitra.rejectionReason = void 0;
    mitra.rejectedAt = void 0;
    if (mitra.bankDetails) {
      const cleanedBank = { ...mitra.bankDetails };
      delete cleanedBank.__rejectionReason;
      delete cleanedBank.__rejectedAt;
      mitra.bankDetails = cleanedBank;
    }
    const notif = {
      id: `notif-${Date.now()}`,
      title: "Status Kemitraan Disetujui (Lulus Verifikasi)",
      message: `Selamat! Pendaftaran Mitra ${mitra.fullName} telah disetujui oleh Admin. Kartu Identitas Eksklusif (${mitra.memberCode}), Kode Referral (${mitra.referralCode}), dan fitur Input Klien kini telah aktif penuh.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false
    };
    notifications.unshift(notif);
    if (mitra.email) {
      await sendSystemEmail({
        recipient: mitra.email,
        recipientName: mitra.fullName,
        subject: `Selamat! Akun Mitra NDTAXANDLAW Anda Lulus Verifikasi (${mitra.memberCode})`,
        category: "registration_verify",
        previewSnippet: `Pendaftaran kemitraan Anda atas nama ${mitra.fullName} telah diperiksa dan DISETUJUI (Lulus Verifikasi) oleh Admin NDTAXANDLAW.

Nomor Anggota Resmi: ${mitra.memberCode}
Kode Referral Resmi: ${mitra.referralCode}

Sekarang Anda sudah dapat menggunakan Kode Referral, menginput data klien, serta mengunduh Kartu Identitas Eksklusif Mitra di portal.`
      });
    }
    if (supabase) {
      try {
        await supabase.from("notifications").insert([notif]);
      } catch (e) {
        console.warn("Supabase insert error", e);
      }
    }
  } else if (status === "rejected") {
    const reasonText = rejectionReason && String(rejectionReason).trim() || "Data pendaftaran belum sesuai kriteria verifikasi Admin. Silakan periksa dan perbaiki data diri atau rekening bank Anda, lalu ajukan ulang verifikasi.";
    mitra.rejectionReason = reasonText;
    mitra.rejectedAt = todayStr;
    mitra.bankDetails = {
      ...mitra.bankDetails,
      __rejectionReason: reasonText,
      __rejectedAt: todayStr
    };
    const notif = {
      id: `notif-${Date.now()}`,
      title: "Verifikasi Pendaftaran Mitra Ditolak \u2014 Perlu Perbaikan Data",
      message: `Pendaftaran Mitra ${mitra.fullName} ditolak oleh Admin. Alasan: "${reasonText}". Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false
    };
    notifications.unshift(notif);
    if (mitra.email) {
      await sendSystemEmail({
        recipient: mitra.email,
        recipientName: mitra.fullName,
        subject: `Pemberitahuan Hasil Verifikasi Mitra NDTAXANDLAW: Perlu Perbaikan Data`,
        category: "registration_verify",
        previewSnippet: `Hasil pemeriksaan data pendaftaran Mitra Anda (${mitra.fullName}) memerlukan perbaikan dengan keterangan dari Admin:

"${reasonText}"

Silakan masuk ke Portal Mitra, perbaiki data diri / rekening bank Anda, lalu klik tombol "Ajukan Ulang Verifikasi" agar dapat diperiksa kembali oleh Admin.`
      });
    }
    if (supabase) {
      try {
        await supabase.from("notifications").insert([notif]);
      } catch (e) {
        console.warn("Supabase insert error", e);
      }
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "mitra_verify",
    operation: "UPDATE",
    targetEntity: "Verifikasi Mitra",
    description: status === "verified" ? `Admin menyetujui (Approve) verifikasi Mitra "${mitra.fullName}" menjadi TERVERIFIKASI (${mitra.memberCode}).` : `Admin menolak verifikasi data Mitra "${mitra.fullName}". Alasan: "${mitra.rejectionReason}".`
  });
  if (supabase) {
    try {
      await supabase.from("mitras").update({
        status,
        memberCode: mitra.memberCode,
        bankDetails: mitra.bankDetails
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase update verify error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: mitra });
});
app.put("/api/mitra/:id/profile", async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, nik, specialization, bankDetails, gender, avatarUrl, newPassword, resubmitVerification, customFields } = req.body;
  if (supabase) {
    try {
      const { data: dbMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  const wasRejected = mitra.status === "rejected";
  if (fullName) mitra.fullName = fullName;
  if (phone) mitra.phone = phone;
  if (nik) mitra.nik = nik;
  if (specialization) mitra.specialization = specialization;
  if (customFields && typeof customFields === "object") {
    mitra.customFields = { ...mitra.customFields || {}, ...customFields };
  }
  if (bankDetails || mitra.customFields) {
    const mergedBank = { ...mitra.bankDetails, ...bankDetails || {} };
    if (mitra.customFields && Object.keys(mitra.customFields).length > 0) {
      mergedBank.__customFields = mitra.customFields;
    }
    if (wasRejected || resubmitVerification) {
      delete mergedBank.__rejectionReason;
      delete mergedBank.__rejectedAt;
    }
    mitra.bankDetails = mergedBank;
  }
  if (gender === "male" || gender === "female") {
    mitra.gender = gender;
  }
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    mitra.avatarUrl = avatarUrl.trim();
  } else if (gender === "male" || gender === "female") {
    mitra.avatarUrl = getDefaultAvatar(gender, mitra.fullName);
  }
  if (wasRejected || resubmitVerification) {
    mitra.status = "pending";
    mitra.rejectionReason = void 0;
    mitra.rejectedAt = void 0;
    if (mitra.bankDetails) {
      const cleanedBank = { ...mitra.bankDetails };
      delete cleanedBank.__rejectionReason;
      delete cleanedBank.__rejectedAt;
      mitra.bankDetails = cleanedBank;
    }
    const notif = {
      id: `notif-${Date.now()}`,
      title: "Pengajuan Ulang Verifikasi Data Mitra",
      message: `Mitra "${mitra.fullName}" telah memperbaiki data pendaftaran dan mengajukan ulang verifikasi kepada Admin.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false
    };
    notifications.unshift(notif);
    if (supabase) {
      try {
        await supabase.from("notifications").insert([notif]);
      } catch {
      }
    }
  }
  if (newPassword && newPassword.length >= 6) {
    const encryptedPwd = encryptUserPassword(newPassword, "mitra");
    userPasswords.set(mitra.email.toLowerCase(), encryptedPwd);
    if (supabase) {
      try {
        await supabase.from("user_passwords").upsert([{ email: mitra.email.toLowerCase(), password: encryptedPwd }]);
      } catch {
      }
    }
  }
  recordActivity({
    actorRole: "mitra",
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: "profile_update",
    operation: "UPDATE",
    targetEntity: wasRejected || resubmitVerification ? "Pengajuan Ulang Verifikasi Mitra" : "Profil & Rekening Mitra",
    description: wasRejected || resubmitVerification ? `Mitra "${mitra.fullName}" memperbarui data diri/rekening dan mengajukan ulang verifikasi pendaftaran ke Admin.` : `Mitra "${mitra.fullName}" memperbarui data profil dan rekening bank (${mitra.bankDetails.bankName} - ${mitra.bankDetails.accountNumber}).`
  });
  if (supabase) {
    try {
      await supabase.from("mitras").update({
        fullName: mitra.fullName,
        phone: mitra.phone,
        nik: mitra.nik,
        specialization: mitra.specialization,
        bankDetails: mitra.bankDetails,
        avatarUrl: mitra.avatarUrl,
        status: mitra.status
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase update profile error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: mitra });
});
app.get("/api/marketing-tools", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("marketing_tools").select("*");
      if (!error && Array.isArray(data)) {
        marketingTools = data;
        saveDatabase();
        return res.json({ success: true, data: marketingTools });
      }
    } catch (e) {
      console.warn("Supabase tools error", e);
    }
  }
  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
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
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_create",
    operation: "CREATE",
    targetEntity: "Tools Marketing",
    description: `Admin mengunggah materi marketing baru: "${title}" (${category}).`
  });
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
  saveDatabase();
  res.status(201).json({ success: true, data: newTool });
});
app.delete("/api/marketing-tools/:id", async (req, res) => {
  const { id } = req.params;
  const target = marketingTools.find((t) => t.id === id);
  marketingTools = marketingTools.filter((t) => t.id !== id);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_delete",
    operation: "DELETE",
    targetEntity: "Tools Marketing",
    description: `Admin menghapus materi marketing: "${target?.title || id}".`
  });
  if (supabase) {
    try {
      await supabase.from("marketing_tools").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete tool error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, message: "Materi berhasil dihapus" });
});
app.get("/api/commissions", async (req, res) => {
  const { mitraId } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("commissions").select("*");
      if (!error && Array.isArray(data)) {
        commissions = data;
        saveDatabase();
        if (mitraId) {
          return res.json({ success: true, data: commissions.filter((c) => c.mitraId === mitraId) });
        }
        return res.json({ success: true, data: commissions });
      }
    } catch (e) {
      console.warn("Supabase commissions query error", e);
    }
  }
  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
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
  const alreadyPendingAmount = payoutRequests.filter((p) => p.mitraId === mitra.id && p.status === "pending").reduce((sum, p) => sum + (p.amount || 0), 0);
  const availableFixCommission = Math.max(0, (mitra.pendingPayout || 0) - alreadyPendingAmount);
  const nominalAmount = Number(amount);
  if (!nominalAmount || nominalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Nominal pencairan harus lebih besar dari Rp 0."
    });
  }
  if (availableFixCommission <= 0) {
    return res.status(400).json({
      success: false,
      message: "Saldo komisi fix Anda saat ini Rp 0 (atau seluruh saldo sedang dalam antrean pencairan). Komisi baru hanya masuk setelah klien di-approve oleh Admin."
    });
  }
  if (nominalAmount > availableFixCommission) {
    return res.status(400).json({
      success: false,
      message: `Nominal penarikan (Rp ${nominalAmount.toLocaleString("id-ID")}) melebihi saldo komisi fix yang tersedia (Rp ${availableFixCommission.toLocaleString("id-ID")}).`
    });
  }
  const newPayout = {
    id: `pay-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    memberCode: mitra.memberCode,
    amount: nominalAmount,
    bankDetails: mitra.bankDetails,
    requestDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    status: "pending",
    notes: "Pengajuan pencairan komisi melalui Portal Mitra."
  };
  payoutRequests.unshift(newPayout);
  recordActivity({
    actorRole: "mitra",
    actorId: mitra.id,
    actorName: mitra.fullName,
    actorEmail: mitra.email,
    actionType: "payout_request",
    operation: "CREATE",
    targetEntity: "Pengajuan Pembayaran Komisi",
    description: `Mitra "${mitra.fullName}" mengajukan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString("id-ID")} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Pengajuan Penarikan Komisi",
    message: `Pengajuan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString("id-ID")} oleh ${mitra.fullName} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (supabase) {
    try {
      await supabase.from("payout_requests").insert([newPayout]);
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase insert payout error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, message: "Pengajuan pencairan berhasil dikirim", data: newPayout });
});
app.get("/api/services", async (req, res) => {
  const { all } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("services").select("*");
      if (!error && Array.isArray(data)) {
        services = data;
        saveDatabase();
      }
    } catch (e) {
      console.warn("Supabase services query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
  }
  if (all === "true") {
    return res.json({ success: true, data: services });
  }
  return res.json({ success: true, data: services.filter((s) => s.isActive) });
});
app.post("/api/services", async (req, res) => {
  const { name, category, defaultPrice, pricingType, commissionRate, description } = req.body;
  if (!name || !category || !defaultPrice) {
    return res.status(400).json({ success: false, message: "Nama, kategori, dan nominal default wajib diisi." });
  }
  const newService = {
    id: `srv-${Date.now()}`,
    name,
    category: category || "Laporan Keuangan",
    defaultPrice: Number(defaultPrice) || 5e6,
    pricingType: pricingType === "monthly_subscription" ? "monthly_subscription" : pricingType === "annual_subscription" ? "annual_subscription" : "case_by_case",
    commissionRate: Number(commissionRate) || 15,
    description: description || "Layanan profesional NDTAXANDLAW.",
    isActive: true
  };
  services.unshift(newService);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "service_create",
    operation: "CREATE",
    targetEntity: "Katalog Layanan Pajak",
    description: `Admin menambahkan paket layanan baru: "${name}" (Harga Default: Rp ${newService.defaultPrice.toLocaleString("id-ID")}, Komisi: ${newService.commissionRate}%).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Katalog Layanan Diperbarui",
    message: `Admin menambahkan layanan baru: "${name}" (${newService.pricingType === "monthly_subscription" ? "Langganan Bulanan" : "Case by Case"}). Mitra dapat mulai menawarkan ke klien.`,
    type: "tools_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("services").insert([newService]);
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase insert service error", e);
    }
  }
  res.status(201).json({ success: true, data: newService });
});
app.put("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, defaultPrice, pricingType, commissionRate, description, isActive } = req.body;
  const service = services.find((s) => s.id === id);
  if (!service) {
    return res.status(404).json({ success: false, message: "Layanan tidak ditemukan" });
  }
  if (name !== void 0) service.name = name;
  if (category !== void 0) service.category = category;
  if (defaultPrice !== void 0) service.defaultPrice = Number(defaultPrice);
  if (pricingType !== void 0) service.pricingType = pricingType;
  if (commissionRate !== void 0) service.commissionRate = Number(commissionRate);
  if (description !== void 0) service.description = description;
  if (isActive !== void 0) service.isActive = Boolean(isActive);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "service_update",
    operation: "UPDATE",
    targetEntity: "Katalog Layanan Pajak",
    description: `Admin memperbarui paket layanan: "${service.name}" (Rp ${service.defaultPrice.toLocaleString("id-ID")}, Status: ${service.isActive ? "Aktif" : "Nonaktif"}).`
  });
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("services").upsert([service]);
    } catch (e) {
      console.warn("Supabase upsert service error", e);
    }
  }
  res.json({ success: true, data: service });
});
app.delete("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const target = services.find((s) => s.id === id);
  services = services.filter((s) => s.id !== id);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "service_delete",
    operation: "DELETE",
    targetEntity: "Katalog Layanan Pajak",
    description: `Admin menghapus layanan pajak: "${target?.name || id}".`
  });
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("services").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete service error", e);
    }
  }
  res.json({ success: true, message: "Layanan berhasil dihapus" });
});
app.get("/api/clients", async (req, res) => {
  const { mitraId, referralCode } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("client_deals").select("*");
      if (!error && Array.isArray(data)) {
        clientDeals = data.map((row) => fromSupabaseClientDeal(row));
        saveDatabase();
      }
    } catch (e) {
      console.warn("Supabase client_deals query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
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
app.post("/api/clients", async (req, res) => {
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
    customFields
  } = req.body;
  if (!serviceId) {
    return res.status(400).json({ success: false, message: "Pilihan paket layanan wajib diisi." });
  }
  const safeCompanyName = (companyName || "").trim() || (picName || "").trim() || "Klien Referral NDTAXANDLAW";
  const safePicName = (picName || "").trim() || safeCompanyName;
  if (supabase) {
    try {
      const { data: supaSettings } = await supabase.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
      if (supaSettings?.settings) {
        appSettings = { ...appSettings, ...supaSettings.settings };
      }
    } catch {
    }
    try {
      const { data: supaMitras } = await supabase.from("mitras").select("*");
      if (Array.isArray(supaMitras)) {
        mitras = normalizeMitraAvatars(supaMitras);
      }
    } catch {
    }
  }
  if (req.body.submittedBy === "client_self" && appSettings.allowClientSelfRegister === false) {
    return res.status(403).json({
      success: false,
      message: "Pendaftaran Mandiri Klien melalui Tautan Referral saat ini sedang dinonaktifkan oleh Administrator."
    });
  }
  const mitra = mitras.find((m) => m.id === mitraId || m.referralCode === req.body.referralCode);
  if (!mitra || mitra.status !== "verified") {
    return res.status(403).json({
      success: false,
      message: "Kode referral dan input data klien belum dapat digunakan karena akun mitra masih dalam proses verifikasi Admin."
    });
  }
  const service = services.find((s) => s.id === serviceId);
  const selectedPricingType = pricingType || (service ? service.pricingType : "case_by_case");
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 1e7);
  const rate = service ? service.commissionRate : 15;
  const commissionCalc = Math.round(nominalValue * rate / 100);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const isSubscription = selectedPricingType === "monthly_subscription" || selectedPricingType === "annual_subscription";
  const startSubDate = isSubscription ? subscriptionStartDate || todayStr : void 0;
  const billingDay = isSubscription ? Number(billingDayOfMonth) || Number((startSubDate || todayStr).split("-")[2]) || 1 : void 0;
  const cleanClientCustomFields = customFields && typeof customFields === "object" && Object.keys(customFields).length > 0 ? customFields : void 0;
  const newDeal = {
    id: `deal-${Date.now()}`,
    mitraId: mitra ? mitra.id : mitraId || "mitra-01",
    mitraName: mitra ? mitra.fullName : "Mitra Terdaftar",
    referralCode: mitra ? mitra.referralCode : req.body.referralCode || "ND-REF-0000",
    companyName: safeCompanyName,
    picName: safePicName,
    picPhone: picPhone || "-",
    picEmail: picEmail || "-",
    serviceId,
    serviceName: service ? service.name : "Layanan Konsultasi Pajak & Keuangan",
    pricingType: selectedPricingType,
    dealValue: nominalValue,
    commissionAmount: commissionCalc,
    status: "pending_acc",
    date: todayStr,
    subscriptionStartDate: startSubDate,
    billingDayOfMonth: billingDay,
    periodStart: periodStart || void 0,
    periodEnd: periodEnd || void 0,
    durationMonths: durationMonths ? Number(durationMonths) : void 0,
    paymentTermType: paymentTermType || "one_time",
    notes: notes || "",
    submittedBy: req.body.submittedBy || "mitra",
    customFields: cleanClientCustomFields
  };
  clientDeals.unshift(newDeal);
  recordActivity({
    actorRole: newDeal.submittedBy === "client_self" ? "client" : "mitra",
    actorId: newDeal.mitraId,
    actorName: newDeal.submittedBy === "client_self" ? `${picName} (${companyName})` : newDeal.mitraName,
    actorEmail: mitra?.email || picEmail,
    actionType: "client_create",
    operation: "CREATE",
    targetEntity: "Input Klien (Menunggu Review Admin)",
    description: `${newDeal.submittedBy === "client_self" ? `Klien "${companyName}" mendaftar mandiri` : `Mitra "${newDeal.mitraName}" menginput klien baru "${companyName}"`} untuk layanan "${newDeal.serviceName}" senilai Rp ${nominalValue.toLocaleString("id-ID")} (Ref: ${newDeal.referralCode}). Status: Sedang Ditinjau Admin (Komisi Rp 0 sebelum di-approve).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Klien Baru Sedang Ditinjau Admin",
    message: `${newDeal.companyName} terdaftar via kode referral ${newDeal.referralCode} (${newDeal.pricingType === "annual_subscription" ? "Langganan Tahunan" : newDeal.pricingType === "monthly_subscription" ? "Langganan Bulanan" : "Case-by-Case"}). Menunggu review & approve deal dari Admin agar komisi masuk ke saldo Mitra.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").insert([toSupabaseClientDeal(newDeal)]);
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase client deal insert error", e);
    }
  }
  res.status(201).json({ success: true, data: newDeal });
});
app.put("/api/clients/:id/acc", async (req, res) => {
  const { id } = req.params;
  const { subscriptionStartDate, billingDayOfMonth, dealValue, notes } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  if (deal.status !== "pending_acc") {
    return res.status(400).json({ success: false, message: "Klien ini sudah direview/divalidasi sebelumnya." });
  }
  if (dealValue !== void 0 && Number(dealValue) > 0) {
    const service = services.find((s) => s.id === deal.serviceId);
    const rate = service ? service.commissionRate : 15;
    deal.dealValue = Number(dealValue);
    deal.commissionAmount = Math.round(deal.dealValue * rate / 100);
  }
  if (notes !== void 0) {
    deal.notes = notes;
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const isSubscription = deal.pricingType === "monthly_subscription" || deal.pricingType === "annual_subscription";
  const approvedStatus = isSubscription ? "active_subscription" : "deal_closed";
  deal.status = approvedStatus;
  if (isSubscription) {
    const startDate = subscriptionStartDate || deal.subscriptionStartDate || todayStr;
    const billingDay = Number(billingDayOfMonth) || deal.billingDayOfMonth || Number(startDate.split("-")[2]) || 1;
    deal.subscriptionStartDate = startDate;
    deal.billingDayOfMonth = billingDay;
    deal.lastBilledDate = startDate;
    deal.nextBillingDate = computeNextBillingDate(startDate, billingDay, deal.pricingType);
    deal.isBillingDue = todayStr >= deal.nextBillingDate;
    if (deal.pricingType === "monthly_subscription") {
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
  const initialCycleLabel = deal.pricingType === "monthly_subscription" ? "Bulan #1" : deal.pricingType === "annual_subscription" ? "Tahun #1" : "Deal Kontrak";
  const newCommTrx = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${initialCycleLabel})`,
    clientName: deal.companyName,
    dealValue: deal.dealValue,
    commissionAmount: deal.commissionAmount,
    bonusAmount: 0,
    status: "pending",
    date: todayStr
  };
  commissions.unshift(newCommTrx);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_acc",
    operation: "UPDATE",
    targetEntity: "Approve Deal Klien (ACC)",
    description: `Admin menyetujui (Approve Deal) klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Komisi sebesar Rp ${deal.commissionAmount.toLocaleString("id-ID")} resmi masuk ke saldo siap cair Mitra.`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Deal Klien Di-Approve Admin (Komisi Masuk)",
    message: `Admin telah meng-approve deal klien "${deal.companyName}". Komisi ${deal.pricingType === "annual_subscription" ? "Tahun Ke-1" : deal.pricingType === "monthly_subscription" ? "Bulan Ke-1" : "1x Bayar (Case-by-Case)"} sebesar Rp ${deal.commissionAmount.toLocaleString("id-ID")} telah masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Deal Klien Di-Approve: ${deal.companyName} - Komisi Rp ${deal.commissionAmount.toLocaleString("id-ID")} Siap Dicairkan`,
      category: "client_acc",
      previewSnippet: `Selamat! Klien rujukan Anda "${deal.companyName}" untuk paket ${deal.serviceName} telah dikonfirmasi Deal dan Di-Approve oleh Admin.

Komisi sebesar Rp ${deal.commissionAmount.toLocaleString("id-ID")} telah masuk ke saldo komisi siap cair Anda.`
    });
  }
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
      await supabase.from("commissions").insert([newCommTrx]);
      await supabase.from("notifications").insert([notif]);
      if (mitra) {
        await supabase.from("mitras").update({
          referredClientsCount: mitra.referredClientsCount,
          activeSubscribersCount: mitra.activeSubscribersCount,
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout
        }).eq("id", deal.mitraId);
      }
    } catch (e) {
      console.warn("Supabase client ACC update error", e);
    }
  }
  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});
app.put("/api/clients/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Data klien tidak ditemukan" });
  }
  if (deal.status !== "pending_acc") {
    return res.status(400).json({ success: false, message: "Hanya klien yang sedang ditinjau yang dapat ditolak." });
  }
  deal.status = "rejected";
  deal.rejectedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  deal.rejectionReason = reason && String(reason).trim() || "Tidak deal setelah review dan konfirmasi dengan calon klien";
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_update",
    operation: "UPDATE",
    targetEntity: "Penolakan Klien (Tidak Deal)",
    description: `Admin menolak / menyatakan Tidak Deal untuk klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Alasan: ${deal.rejectionReason}. Mitra tidak mendapatkan komisi (Rp 0).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Hasil Review Klien: Tidak Deal / Ditolak",
    message: `Pengajuan klien "${deal.companyName}" dinyatakan Tidak Deal oleh Admin (${deal.rejectionReason}). Komisi untuk pengajuan ini adalah Rp 0.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase reject client error", e);
    }
  }
  res.json({
    success: true,
    message: `Klien "${deal.companyName}" ditandai Tidak Deal (Ditolak). Komisi Mitra tetap Rp 0.`,
    data: deal
  });
});
app.put("/api/clients/:id/trigger-billing-due", async (req, res) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  if (deal.status !== "active_subscription") {
    return res.status(400).json({ success: false, message: "Hanya langganan aktif yang memiliki jadwal tagihan." });
  }
  deal.isBillingDue = true;
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
    } catch (e) {
      console.warn("Supabase trigger-billing-due error", e);
    }
  }
  res.json({
    success: true,
    message: `Waktu tagihan untuk "${deal.companyName}" telah aktif. Silakan klik tombol Approve Pembayaran Langganan.`,
    data: deal
  });
});
app.post("/api/clients/:id/bill-cycle", async (req, res) => {
  const { id } = req.params;
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  if (deal.status === "cancelled" || deal.status === "rejected" || deal.status !== "active_subscription") {
    return res.status(400).json({
      success: false,
      message: "Langganan klien ini sudah berakhir / dihentikan. Mitra tidak lagi berhak mendapatkan komisi berulang dari klien ini."
    });
  }
  if (deal.pricingType !== "monthly_subscription" && deal.pricingType !== "annual_subscription") {
    return res.status(400).json({ success: false, message: "Hanya klien berlangganan bulanan atau tahunan yang dapat diproses tagihan siklus berulang." });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let cycleLabel = "";
  if (deal.pricingType === "monthly_subscription") {
    deal.recurringPaidMonths = (deal.recurringPaidMonths || 1) + 1;
    cycleLabel = `Bulan #${deal.recurringPaidMonths}`;
  } else {
    deal.recurringPaidYears = (deal.recurringPaidYears || 1) + 1;
    cycleLabel = `Tahun Ke-${deal.recurringPaidYears}`;
  }
  const billingDay = deal.billingDayOfMonth || Number((deal.subscriptionStartDate || deal.date || todayStr).split("-")[2]) || 1;
  const baseForNext = deal.nextBillingDate || todayStr;
  deal.lastBilledDate = todayStr;
  deal.nextBillingDate = computeNextBillingDate(baseForNext, billingDay, deal.pricingType);
  deal.isBillingDue = false;
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.totalCommission = (mitra.totalCommission || 0) + deal.commissionAmount;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + deal.commissionAmount;
  }
  const newCommTrx = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${cycleLabel})`,
    clientName: deal.companyName,
    dealValue: deal.dealValue,
    commissionAmount: deal.commissionAmount,
    bonusAmount: 0,
    status: "pending",
    date: todayStr
  };
  commissions.unshift(newCommTrx);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_update",
    operation: "UPDATE",
    targetEntity: "Approve Pembayaran Langganan Klien",
    description: `Admin meng-approve pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}". Komisi berulang Rp ${deal.commissionAmount.toLocaleString("id-ID")} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}. Tagihan berikutnya: ${deal.nextBillingDate}.`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: `Komisi Langganan Masuk (Approve ${cycleLabel})`,
    message: `Pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve Admin. Komisi Rp ${deal.commissionAmount.toLocaleString("id-ID")} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Komisi Langganan Masuk (${cycleLabel}): ${deal.companyName} - Rp ${deal.commissionAmount.toLocaleString("id-ID")}`,
      category: "recurring_invoice",
      previewSnippet: `Pembayaran perpanjangan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve oleh Admin.

Komisi royalti Anda sebesar Rp ${deal.commissionAmount.toLocaleString("id-ID")} telah ditambahkan ke dompet saldo siap cair Anda.`
    });
  }
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
      await supabase.from("commissions").insert([newCommTrx]);
      await supabase.from("notifications").insert([notif]);
      if (mitra) {
        await supabase.from("mitras").update({
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("Supabase bill-cycle error", e);
    }
  }
  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});
app.put("/api/clients/:id/terminate", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  if (deal.status === "cancelled") {
    return res.status(400).json({ success: false, message: "Langganan klien ini sudah dihentikan sebelumnya." });
  }
  const wasActiveSubscriber = deal.status === "active_subscription";
  deal.status = "cancelled";
  deal.terminatedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  deal.terminationReason = reason && String(reason).trim() || "Klien berhenti berlangganan layanan";
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra && wasActiveSubscriber) {
    mitra.activeSubscribersCount = Math.max(0, (mitra.activeSubscribersCount || 1) - 1);
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_update",
    operation: "UPDATE",
    targetEntity: "Pemutusan Langganan Klien",
    description: `Admin memutuskan langganan klien "${deal.companyName}" (Mitra: ${deal.mitraName}). Alasan: ${deal.terminationReason}. Komisi berulang otomatis dihentikan karena langganan telah berakhir.`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Langganan Klien Berakhir / Diputus",
    message: `Klien "${deal.companyName}" (${deal.serviceName}) telah berhenti berlangganan per ${deal.terminatedAt}. Komisi berulang untuk Mitra ${deal.mitraName} otomatis dihentikan.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
      await supabase.from("notifications").insert([notif]);
      if (mitra) {
        await supabase.from("mitras").update({
          activeSubscribersCount: mitra.activeSubscribersCount
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("Supabase terminate client subscription error", e);
    }
  }
  res.json({
    success: true,
    message: `Langganan klien "${deal.companyName}" berhasil diputus. Mitra ${deal.mitraName} otomatis tidak akan mendapatkan komisi lagi dari klien ini.`,
    data: deal
  });
});
app.put("/api/clients/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, recurringPaidMonths, recurringPaidYears } = req.body;
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  const prevStatus = deal.status;
  if (status) deal.status = status;
  if (recurringPaidMonths !== void 0) deal.recurringPaidMonths = recurringPaidMonths;
  if (recurringPaidYears !== void 0) deal.recurringPaidYears = recurringPaidYears;
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    if (prevStatus === "active_subscription" && status === "cancelled") {
      mitra.activeSubscribersCount = Math.max(0, (mitra.activeSubscribersCount || 1) - 1);
      deal.terminatedAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    } else if (prevStatus === "cancelled" && status === "active_subscription") {
      mitra.activeSubscribersCount = (mitra.activeSubscribersCount || 0) + 1;
      deal.terminatedAt = void 0;
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_update",
    operation: "UPDATE",
    targetEntity: "Status Deal Klien",
    description: `Admin memperbarui status deal klien "${deal.companyName}" menjadi "${deal.status}".`
  });
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("client_deals").upsert([toSupabaseClientDeal(deal)]);
      if (mitra) {
        await supabase.from("mitras").update({
          activeSubscribersCount: mitra.activeSubscribersCount
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("Supabase update client status error", e);
    }
  }
  res.json({ success: true, data: deal });
});
app.get("/api/commissions/payout-requests", async (req, res) => {
  const { mitraId } = req.query;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("payout_requests").select("*");
      if (!error && Array.isArray(data)) {
        payoutRequests = data;
        saveDatabase();
      }
    } catch (e) {
      console.warn("Supabase payout_requests query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
  }
  if (mitraId) {
    return res.json({ success: true, data: payoutRequests.filter((p) => p.mitraId === mitraId) });
  }
  return res.json({ success: true, data: payoutRequests });
});
app.put("/api/commissions/payout-requests/:id/approve", async (req, res) => {
  const { id } = req.params;
  const {
    pph21Deduction,
    pph21Rate,
    adminFeeDeduction,
    netAmountTransferred,
    proofFileUrl,
    proofFileName,
    transferRefNumber,
    notes
  } = req.body;
  const payout = payoutRequests.find((p) => p.id === id);
  if (!payout) {
    return res.status(404).json({ success: false, message: "Pengajuan pencairan tidak ditemukan" });
  }
  if (payout.status === "approved") {
    return res.status(400).json({ success: false, message: "Pengajuan pencairan ini sudah disetujui dan diselesaikan sebelumnya." });
  }
  payout.status = "approved";
  payout.processedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const pphVal = pph21Deduction !== void 0 && pph21Deduction !== "" ? Math.max(0, Number(pph21Deduction)) : 0;
  const pphPercent = pph21Rate !== void 0 && pph21Rate !== "" ? Number(pph21Rate) : pphVal > 0 ? Number((pphVal / payout.amount * 100).toFixed(1)) : 0;
  const adminFeeVal = adminFeeDeduction !== void 0 && adminFeeDeduction !== "" ? Math.max(0, Number(adminFeeDeduction)) : 0;
  const calculatedNet = Math.max(0, payout.amount - pphVal - adminFeeVal);
  payout.pph21Deduction = pphVal;
  payout.pph21Rate = pphPercent;
  payout.adminFeeDeduction = adminFeeVal;
  payout.netAmountTransferred = netAmountTransferred !== void 0 && netAmountTransferred !== "" ? Number(netAmountTransferred) : calculatedNet;
  if (proofFileUrl) payout.proofFileUrl = proofFileUrl;
  if (proofFileName) payout.proofFileName = proofFileName;
  payout.transferRefNumber = transferRefNumber || `TRX-ND-${Date.now().toString().slice(-8)}`;
  payout.disbursedBy = "Admin Operasional NDTAXANDLAW";
  if (notes) payout.notes = notes;
  const mitra = mitras.find((m) => m.id === payout.mitraId);
  if (mitra) {
    mitra.pendingPayout = Math.max(0, (mitra.pendingPayout || 0) - payout.amount);
    mitra.paidPayout = (mitra.paidPayout || 0) + payout.amount;
  }
  let remainingToMarkPaid = payout.amount;
  const paidCommissionIds = [];
  for (const c of commissions) {
    if (c.mitraId === payout.mitraId && c.status !== "paid" && remainingToMarkPaid > 0) {
      c.status = "paid";
      remainingToMarkPaid -= c.commissionAmount;
      paidCommissionIds.push(c.id);
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "payout_approve",
    operation: "UPDATE",
    targetEntity: "Pembayaran Komisi Mitra",
    description: `Admin menyetujui & mentransfer pembayaran komisi Mitra "${payout.mitraName}" sebesar Bersih Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString("id-ID")} (Kotor: Rp ${payout.amount.toLocaleString("id-ID")}, PPh21: Rp ${pphVal.toLocaleString("id-ID")}) ke ${payout.bankDetails.bankName} ${payout.bankDetails.accountNumber} (Ref: #${payout.transferRefNumber}).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Pencairan Komisi Telah Ditransfer",
    message: `Dana komisi kotor Rp ${payout.amount.toLocaleString("id-ID")} (Net Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString("id-ID")}) untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) dengan Ref #${payout.transferRefNumber}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: payout.mitraName,
      subject: `Pencairan Komisi Berhasil Diproses: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString("id-ID")} ke ${payout.bankDetails.bankName}`,
      category: "payout_disbursed",
      previewSnippet: `Pencairan dana komisi kemitraan Anda telah disetujui & ditransfer via ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) a.n ${payout.bankDetails.accountHolder}.

Jumlah Kotor: Rp ${payout.amount.toLocaleString("id-ID")}
Potongan PPh 21 (${payout.pph21Rate || 2.5}%): Rp ${(payout.pph21Deduction || 0).toLocaleString("id-ID")}
Biaya Admin: Rp ${(payout.adminFeeDeduction || 0).toLocaleString("id-ID")}
Total Bersih Ditransfer: Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString("id-ID")}
No. Referensi: #${payout.transferRefNumber}`
    });
  }
  saveDatabase();
  if (supabase) {
    try {
      await supabase.from("payout_requests").upsert([payout]);
      await supabase.from("notifications").insert([notif]);
      if (mitra) {
        await supabase.from("mitras").update({
          pendingPayout: mitra.pendingPayout,
          paidPayout: mitra.paidPayout
        }).eq("id", payout.mitraId);
      }
      for (const commId of paidCommissionIds) {
        await supabase.from("commissions").update({ status: "paid" }).eq("id", commId);
      }
    } catch (e) {
      console.warn("Supabase payout approve error", e);
    }
  }
  res.json({ success: true, data: payout });
});
app.get("/api/settings", async (req, res) => {
  if (supabase) {
    try {
      const { data: pwRows, error: errPw } = await supabase.from("user_passwords").select("*").in("email", ["__sys_config__@ndtaxlaw.internal", "__sys_roles__@ndtaxlaw.internal"]);
      if (!errPw && Array.isArray(pwRows)) {
        for (const row of pwRows) {
          if (row.email === "__sys_config__@ndtaxlaw.internal" && row.password) {
            try {
              const parsed = JSON.parse(row.password);
              const { roles: storedRoles, ...restSettings } = parsed;
              appSettings = { ...appSettings, ...restSettings };
              if (Array.isArray(storedRoles) && storedRoles.length > 0) {
                systemRoles = storedRoles;
              }
            } catch {
            }
          } else if (row.email === "__sys_roles__@ndtaxlaw.internal" && row.password) {
            try {
              const parsedRoles = JSON.parse(row.password);
              if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
                systemRoles = parsedRoles;
              }
            } catch {
            }
          }
        }
      }
      const { data: settingsData, error } = await supabase.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
      if (!error && settingsData && settingsData.settings) {
        const { roles: storedRoles, ...restSettings } = settingsData.settings;
        appSettings = { ...appSettings, ...restSettings };
        if (Array.isArray(storedRoles) && storedRoles.length > 0) {
          systemRoles = storedRoles;
        }
      }
    } catch (e) {
      console.warn("Supabase settings query error", e);
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
  res.json({ success: true, data: appSettings, roles: systemRoles });
});
app.put("/api/settings", async (req, res) => {
  const updates = req.body;
  const previousEnv = appSettings.appEnvironment;
  appSettings = { ...appSettings, ...updates };
  if (previousEnv !== "production" && appSettings.appEnvironment === "production" && supabase) {
    await syncFromSupabase();
    appSettings = { ...appSettings, ...updates };
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "settings_update",
    operation: "UPDATE",
    targetEntity: "Pengaturan Sistem & SMTP",
    description: `Admin memperbarui konfigurasi sistem (SMTP: ${appSettings.smtpHost}:${appSettings.smtpPort}, Mode: ${appSettings.appEnvironment}).`
  });
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Pengaturan Sistem Diperbarui",
    message: "Konfigurasi profil layanan, server SMTP email & notifikasi otomatis, OAuth Google, dan integrasi AI telah diperbarui.",
    type: "tools_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  notifications.unshift(notif);
  saveDatabase();
  await persistSettingsToSupabase();
  if (supabase) {
    try {
      await supabase.from("notifications").insert([notif]);
    } catch (e) {
      console.warn("Supabase notification insert error", e);
    }
  }
  res.json({ success: true, data: appSettings });
});
app.post("/api/settings/test-email", async (req, res) => {
  const { targetEmail, smtpConfig } = req.body;
  const emailToTest = (targetEmail || appSettings.supportEmail || "admin@ndtaxlaw.com").trim();
  if (!emailToTest || !emailToTest.includes("@")) {
    return res.status(400).json({ success: false, message: "Alamat email tujuan tidak valid." });
  }
  if (smtpConfig && typeof smtpConfig === "object") {
    appSettings = { ...appSettings, ...smtpConfig };
    saveDatabase();
    await persistSettingsToSupabase();
  }
  if (!appSettings.smtpEnabled) {
    return res.status(400).json({
      success: false,
      message: "Server SMTP saat ini dinonaktifkan. Aktifkan switch SMTP terlebih dahulu sebelum mengirim tes email."
    });
  }
  const result = await sendSystemEmail({
    recipient: emailToTest,
    recipientName: "Administrator Sistem NDTAXANDLAW",
    subject: `[TEST] Uji Coba Koneksi Server SMTP NDTAXANDLAW (${appSettings.smtpHost})`,
    category: "test_email",
    previewSnippet: `Konfigurasi server SMTP (${appSettings.smtpHost}:${appSettings.smtpPort} - ${appSettings.smtpEncryption.toUpperCase()}) dari pengirim ${appSettings.smtpSenderName} <${appSettings.smtpSenderEmail || appSettings.smtpUser}> telah berhasil terhubung secara riil dan siap digunakan untuk mengirim kode verifikasi akun, info pencairan komisi, serta ACC klien.`
  });
  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.message,
      data: result
    });
  }
  res.json({
    success: true,
    message: result.message,
    data: result
  });
});
app.get("/api/emails/logs", async (req, res) => {
  if (supabase) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await supabase.from("email_logs").delete().lt("timestamp", cutoffIso);
      const [{ data: tableLogs, error: errTable }, { data: kvRow, error: errKv }] = await Promise.all([
        supabase.from("email_logs").select("*").order("timestamp", { ascending: false }).limit(300),
        supabase.from("user_passwords").select("*").eq("email", "__sys_email_logs__@ndtaxlaw.internal").maybeSingle()
      ]);
      const fromTable = !errTable && Array.isArray(tableLogs) ? tableLogs.map(fromSupabaseEmailLogRow) : [];
      let fromKv = [];
      if (!errKv && kvRow && kvRow.password) {
        try {
          const parsed = JSON.parse(kvRow.password);
          if (Array.isArray(parsed)) fromKv = parsed;
        } catch {
        }
      }
      const mergedMap = /* @__PURE__ */ new Map();
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
      if (emailLogs.length > fromTable.length) {
        try {
          await supabase.from("email_logs").upsert(emailLogs.slice(0, 100).map(toSupabaseEmailLogRow));
        } catch {
        }
      }
      return res.json({ success: true, data: emailLogs });
    } catch (e) {
      console.warn("Supabase email logs query error", e);
    }
  }
  await pruneOldLogs(false);
  res.json({ success: true, data: emailLogs });
});
app.post("/api/emails/resend/:id", async (req, res) => {
  const { id } = req.params;
  const existingLog = emailLogs.find((l) => l.id === id);
  if (!existingLog) {
    return res.status(404).json({ success: false, message: "Catatan email tidak ditemukan." });
  }
  const resendResult = await sendSystemEmail({
    recipient: existingLog.recipient,
    recipientName: existingLog.recipientName,
    subject: existingLog.subject.startsWith("[KIRIM ULANG]") ? existingLog.subject : `[KIRIM ULANG] ${existingLog.subject}`,
    category: existingLog.category,
    previewSnippet: existingLog.previewSnippet
  });
  if (!resendResult.success) {
    return res.status(500).json({
      success: false,
      message: resendResult.message,
      data: resendResult
    });
  }
  res.json({ success: true, message: `Email berhasil dikirim ulang ke ${existingLog.recipient}`, data: resendResult });
});
app.delete("/api/emails/logs", async (req, res) => {
  emailLogs = [];
  saveDatabase();
  await persistEmailLogsToSupabase();
  if (supabase) {
    try {
      await supabase.from("email_logs").delete().neq("id", "");
    } catch {
    }
  }
  res.json({ success: true, message: "Riwayat log pengiriman email berhasil dibersihkan dari lokal dan Supabase." });
});
app.get("/api/activity-logs", async (req, res) => {
  if (supabase) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await supabase.from("activity_logs").delete().lt("timestamp", cutoffIso);
      const { data: tableLogs, error: errTable } = await supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(500);
      if (!errTable && Array.isArray(tableLogs) && tableLogs.length > 0) {
        activityLogs = tableLogs;
        await pruneOldLogs(false);
        saveDatabase();
        return res.json({ success: true, data: activityLogs });
      }
      const { data: kvRow, error: errKv } = await supabase.from("user_passwords").select("*").eq("email", "__sys_activity_logs__@ndtaxlaw.internal").maybeSingle();
      if (!errKv && kvRow && kvRow.password) {
        const parsed = JSON.parse(kvRow.password);
        if (Array.isArray(parsed)) {
          activityLogs = parsed;
          await pruneOldLogs(false);
          saveDatabase();
        }
      }
    } catch (e) {
      console.warn("Supabase activity logs query error", e);
    }
  }
  await pruneOldLogs(false);
  res.json({ success: true, data: activityLogs });
});
app.delete("/api/activity-logs", async (req, res) => {
  activityLogs = [];
  saveDatabase();
  await persistActivityLogsToSupabase();
  if (supabase) {
    try {
      await supabase.from("activity_logs").delete().neq("id", "");
    } catch {
    }
  }
  res.json({ success: true, message: "Riwayat log aktivitas berhasil dibersihkan dari lokal dan Supabase." });
});
app.get("/api/notifications", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("notifications").select("*").order("timestamp", { ascending: false });
      if (!error && Array.isArray(data)) {
        notifications = data;
        saveDatabase();
        return res.json({ success: true, data: notifications });
      }
    } catch (e) {
      console.warn("Supabase notifications query error", e);
    }
  }
  if (isProductionMode() && !supabase) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database Supabase." });
  }
  res.json({ success: true, data: notifications });
});
app.post("/api/notifications/read-all", async (req, res) => {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  if (supabase) {
    try {
      await supabase.from("notifications").update({ isRead: true }).neq("isRead", true);
    } catch (e) {
      console.warn("Supabase mark read notifications error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: notifications });
});
app.get("/api/analytics/monthly", async (req, res) => {
  if (supabase) {
    await syncFromSupabase();
  }
  const activeDeals = clientDeals.filter((d) => d.status === "active_subscription" || d.status === "deal_closed");
  const totalSalesFromDeals = activeDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  const totalPaidCommissions = mitras.reduce((sum, m) => sum + (Number(m.paidPayout) || 0) + (Number(m.pendingPayout) || 0), 0);
  const verifiedMitraCount = mitras.filter((m) => m.status === "verified").length;
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
        averageDealTicket: avgTicket
      }
    }
  });
});
app.post("/api/ai/monthly-report", async (req, res) => {
  try {
    if (!appSettings.geminiApiEnabled) {
      return res.json({
        success: false,
        message: "Modul Analisis Gemini AI dinonaktifkan di Pengaturan Sistem oleh Admin.",
        disabled: true
      });
    }
    const { targetPeriod = "November 2026", userRole = "admin", specificMitraId } = req.body;
    const targetMitra = specificMitraId ? mitras.find((m) => m.id === specificMitraId) : null;
    const verifiedMitrasCount = mitras.filter((m) => m.status === "verified").length;
    const pendingCount = mitras.filter((m) => m.status === "pending").length;
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
    const activeDealsCount = clientDeals.filter((d) => d.status === "active_subscription" || d.status === "deal_closed").length;
    const activeDealsValue = clientDeals.filter((d) => d.status === "active_subscription" || d.status === "deal_closed").reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    const totalMitraCommissions = mitras.reduce((sum, m) => sum + (Number(m.totalCommission) || 0), 0);
    const fallbackReport = `### Executive Performance Summary - NDTAXANDLAW (November 2026)

Berdasarkan konsolidasi metrik operasional NDTAXANDLAW dari database Supabase pada periode **November 2026**, performa kemitraan mencatat total transaksi aktif mencapai **Rp ${activeDealsValue.toLocaleString("id-ID")}** dari **${activeDealsCount} kontrak aktif** dan **${mitras.length} mitra terdaftar**.

#### 1. Analisis Tren Penjualan & Pertumbuhan Mitra
- **Jaringan Mitra Terdaftar**: Terdapat ${mitras.filter((m) => m.status === "verified").length} mitra terverifikasi dan ${mitras.filter((m) => m.status === "pending").length} calon mitra yang sedang dalam tahap verifikasi.
- **Layanan Unggulan**: Portofolio layanan perpajakan korporasi, pembukuan, dan kepatuhan SPT tetap menjadi pendorong utama komisi mitra.

#### 2. Evaluasi Distribusi Komisi & Likuiditas Mitra
- Total akumulasi komisi mitra tercatat sebesar **Rp ${totalMitraCommissions.toLocaleString("id-ID")}**.

#### 3. Rekomendasi Aksi Strategis 30 Hari Kedepan
1. **Intensifikasi Kampanye Akhir Tahun (Tax Year-End Closing)**: Distribusikan materi tools marketing bertema persiapan SPT Tahunan Badan dan review risiko SP2DK melalui katalog digital.
2. **Percepatan Verifikasi Mitra & Review Klien**: Tuntaskan proses review klien berstatus *Sedang Ditinjau Admin* dalam tempo 1x24 jam.`;
    res.json({
      success: true,
      report: fallbackReport,
      isFallback: true,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      note: "Menggunakan analisis cerdas berbasis data riil database Supabase NDTAXANDLAW."
    });
  }
});
app.get("/api/system/supabase-status", async (req, res) => {
  const config = getSupabaseConfig();
  const test = await testSupabaseConnection();
  res.json({
    success: true,
    data: {
      ...config,
      ...test,
      appEnvironment: appSettings.appEnvironment,
      strictSupabaseOnly: isProductionMode(),
      passwordEncryption: "SCRYPT + AES-256-GCM (ndenc$v2)",
      activeRolesCount: systemRoles.filter((r) => r.isActive).length,
      totalRolesCount: systemRoles.length
    }
  });
});
app.post("/api/system/supabase-sync", async (req, res) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: "SUPABASE_URL atau SUPABASE_KEY belum terpasang di file .env atau Environment Variable hosting Anda."
    });
  }
  try {
    if (isProductionMode()) {
      return res.status(403).json({
        success: false,
        message: "Fitur Sinkronkan Data Awal dinonaktifkan pada Mode Production demi melindungi data operasional di Supabase agar tidak tertimpa."
      });
    }
    const summary = {
      mitras: 0,
      services: 0,
      clientDeals: 0,
      marketingTools: 0,
      commissions: 0,
      activityLogs: activityLogs.length,
      emailLogs: emailLogs.length
    };
    if (mitras.length > 0) {
      const cleanMitras = mitras.map(({ gender: _g, ...rest }) => rest);
      const { error: errM } = await supabase.from("mitras").upsert(cleanMitras);
      if (!errM) summary.mitras = mitras.length;
      else console.warn("Supabase sync mitras warning:", errM.message);
    }
    if (services.length > 0) {
      const { error: errS } = await supabase.from("services").upsert(services);
      if (!errS) summary.services = services.length;
      else console.warn("Supabase sync services warning:", errS.message);
    }
    if (clientDeals.length > 0) {
      const cleanDeals = clientDeals.map((d) => toSupabaseClientDeal(d));
      const { error: errD } = await supabase.from("client_deals").upsert(cleanDeals);
      if (!errD) summary.clientDeals = clientDeals.length;
      else console.warn("Supabase sync deals warning:", errD.message);
    }
    if (marketingTools.length > 0) {
      const { error: errT } = await supabase.from("marketing_tools").upsert(marketingTools);
      if (!errT) summary.marketingTools = marketingTools.length;
      else console.warn("Supabase sync tools warning:", errT.message);
    }
    if (commissions.length > 0) {
      const { error: errC } = await supabase.from("commissions").upsert(commissions);
      if (!errC) summary.commissions = commissions.length;
      else console.warn("Supabase sync commissions warning:", errC.message);
    }
    await persistSettingsToSupabase();
    await persistActivityLogsToSupabase();
    await persistEmailLogsToSupabase();
    res.json({
      success: true,
      message: "Seluruh data operasional, pengaturan, log aktivitas, dan log email berhasil disinkronkan ke cloud database Supabase!",
      summary
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Terjadi kendala sinkronisasi ke Supabase: ${err.message || "Unknown error"}`
    });
  }
});
app.get("/api/system/database-backup", async (req, res) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: "Koneksi Database Supabase belum aktif. Fitur Backup khusus untuk mem-backup data dari server Supabase."
    });
  }
  try {
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
      resPasswords
    ] = await Promise.all([
      supabase.from("mitras").select("*"),
      supabase.from("services").select("*"),
      supabase.from("client_deals").select("*"),
      supabase.from("commissions").select("*"),
      supabase.from("payout_requests").select("*"),
      supabase.from("marketing_tools").select("*"),
      supabase.from("notifications").select("*"),
      supabase.from("app_settings").select("*"),
      supabase.from("system_roles").select("*"),
      supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }),
      supabase.from("email_logs").select("*").order("timestamp", { ascending: false }),
      supabase.from("user_passwords").select("*")
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
      source: "SUPABASE_PRODUCTION_DATABASE",
      supabaseUrl: supabaseConfig.url,
      backupVersion: "2.4-SUPABASE",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      firmName: appSettings.firmName || "NDTAXANDLAW",
      environment: "production",
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
        user_passwords: sbPasswords.length
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
        user_passwords: sbPasswords
      }
    };
    recordActivity({
      actorRole: "admin",
      actorName: "Admin Operasional",
      actionType: "settings_update",
      operation: "CREATE",
      targetEntity: "Backup Database Supabase",
      description: `Admin mengunduh Backup Database langsung dari Supabase (${sbMitras.length} mitra, ${sbDeals.length} klien/deal, ${sbCommissions.length} komisi, ${sbPayouts.length} payout).`
    });
    res.json(backupPayload);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal mengambil data backup dari Supabase: ${err.message || "Unknown error"}`
    });
  }
});
app.post("/api/system/database-restore", async (req, res) => {
  if (!supabase) {
    return res.status(400).json({
      success: false,
      message: "Koneksi Database Supabase belum aktif. Fitur Restore hanya dapat dijalankan langsung ke database Supabase."
    });
  }
  try {
    const { backupData, mode = "merge" } = req.body;
    const rawTables = backupData?.tables || backupData?.data || backupData;
    if (!rawTables || typeof rawTables !== "object") {
      return res.status(400).json({
        success: false,
        message: "Format file backup Supabase tidak valid atau kosong."
      });
    }
    const isReplace = mode === "replace";
    const tblMitras = Array.isArray(rawTables.mitras) ? rawTables.mitras : [];
    const tblServices = Array.isArray(rawTables.services) ? rawTables.services : [];
    const tblDeals = Array.isArray(rawTables.client_deals) ? rawTables.client_deals : Array.isArray(rawTables.clientDeals) ? rawTables.clientDeals.map((d) => toSupabaseClientDeal(d)) : [];
    const tblCommissions = Array.isArray(rawTables.commissions) ? rawTables.commissions : [];
    const tblPayouts = Array.isArray(rawTables.payout_requests) ? rawTables.payout_requests : Array.isArray(rawTables.payoutRequests) ? rawTables.payoutRequests : [];
    const tblTools = Array.isArray(rawTables.marketing_tools) ? rawTables.marketing_tools : Array.isArray(rawTables.marketingTools) ? rawTables.marketingTools : [];
    const tblNotifs = Array.isArray(rawTables.notifications) ? rawTables.notifications : [];
    const tblSettings = Array.isArray(rawTables.app_settings) ? rawTables.app_settings : [];
    const tblRoles = Array.isArray(rawTables.system_roles) ? rawTables.system_roles : [];
    const tblActLogs = Array.isArray(rawTables.activity_logs) ? rawTables.activity_logs : Array.isArray(rawTables.activityLogs) ? rawTables.activityLogs : [];
    const tblEmailLogs = Array.isArray(rawTables.email_logs) ? rawTables.email_logs : Array.isArray(rawTables.emailLogs) ? rawTables.emailLogs.map(toSupabaseEmailLogRow) : [];
    const tblPasswords = Array.isArray(rawTables.user_passwords) ? rawTables.user_passwords : rawTables.userPasswords && typeof rawTables.userPasswords === "object" ? Object.entries(rawTables.userPasswords).map(([email, password]) => ({ email, password })) : [];
    if (isReplace) {
      await Promise.allSettled([
        supabase.from("mitras").delete().neq("id", ""),
        supabase.from("services").delete().neq("id", ""),
        supabase.from("client_deals").delete().neq("id", ""),
        supabase.from("commissions").delete().neq("id", ""),
        supabase.from("payout_requests").delete().neq("id", ""),
        supabase.from("marketing_tools").delete().neq("id", ""),
        supabase.from("notifications").delete().neq("id", ""),
        supabase.from("activity_logs").delete().neq("id", ""),
        supabase.from("email_logs").delete().neq("id", "")
      ]);
    }
    if (tblMitras.length > 0) {
      await supabase.from("mitras").upsert(tblMitras);
    }
    if (tblServices.length > 0) {
      await supabase.from("services").upsert(tblServices);
    }
    if (tblDeals.length > 0) {
      await supabase.from("client_deals").upsert(tblDeals);
    }
    if (tblCommissions.length > 0) {
      await supabase.from("commissions").upsert(tblCommissions);
    }
    if (tblPayouts.length > 0) {
      await supabase.from("payout_requests").upsert(tblPayouts);
    }
    if (tblTools.length > 0) {
      await supabase.from("marketing_tools").upsert(tblTools);
    }
    if (tblNotifs.length > 0) {
      await supabase.from("notifications").upsert(tblNotifs);
    }
    if (tblSettings.length > 0) {
      await supabase.from("app_settings").upsert(tblSettings);
    }
    if (tblRoles.length > 0) {
      await supabase.from("system_roles").upsert(tblRoles);
    }
    if (tblActLogs.length > 0) {
      await supabase.from("activity_logs").upsert(tblActLogs);
    }
    if (tblEmailLogs.length > 0) {
      await supabase.from("email_logs").upsert(tblEmailLogs);
    }
    if (tblPasswords.length > 0) {
      await supabase.from("user_passwords").upsert(tblPasswords);
    }
    await syncFromSupabase();
    recordActivity({
      actorRole: "admin",
      actorName: "Admin Operasional",
      actionType: "settings_update",
      operation: "UPDATE",
      targetEntity: "Restore Database Supabase",
      description: `Admin berhasil melakukan Restore Database langsung ke Supabase (${isReplace ? "Mode Timpa Penuh" : "Mode Gabung Data"}): ${mitras.length} mitra, ${clientDeals.length} klien/deal, ${commissions.length} komisi.`
    });
    res.json({
      success: true,
      message: `Restore ke Database Supabase berhasil (${isReplace ? "Timpa Penuh" : "Gabung Data"})! Data di Supabase saat ini: ${mitras.length} Mitra, ${clientDeals.length} Klien/Deal, ${commissions.length} Komisi.`,
      counts: {
        mitras: mitras.length,
        services: services.length,
        client_deals: clientDeals.length,
        commissions: commissions.length,
        payout_requests: payoutRequests.length,
        marketing_tools: marketingTools.length,
        activity_logs: activityLogs.length,
        email_logs: emailLogs.length
      },
      settings: appSettings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal memproses restore ke Supabase: ${err.message || "Unknown error"}`
    });
  }
});
async function startServer() {
  const distPath = path.join(__dirname, "dist");
  const hasDistBuild = fs.existsSync(path.join(distPath, "index.html"));
  const isCompiledServer = __filename.endsWith("server.js");
  const shouldServeStaticDist = hasDistBuild && (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production" || isProductionMode() || isCompiledServer);
  if (shouldServeStaticDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT} (static=${shouldServeStaticDist})`);
  });
}
startServer();
export {
  DEFAULT_CLIENT_FORM_FIELDS,
  DEFAULT_MITRA_FORM_FIELDS,
  DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  DEFAULT_STAFF_ALLOWED_MENUS,
  cleanupLocalDatabaseFileInProduction,
  computeDynamicSalesHistory,
  encryptUserPassword,
  extractUserRole,
  fromSupabaseClientDeal,
  fromSupabaseEmailLogRow,
  getRoleDefinition,
  getThreeMonthsAgoCutoff,
  isEncryptedPassword,
  isProductionMode,
  loadDatabase,
  persistActivityLogsToSupabase,
  persistEmailLogsToSupabase,
  persistSettingsToSupabase,
  pruneOldLogs,
  recordActivity,
  saveDatabase,
  sendSystemEmail,
  syncFromSupabase,
  toSupabaseClientDeal,
  toSupabaseEmailLogRow,
  verifyUserPassword
};
