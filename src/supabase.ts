import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// User Supabase Configuration for Production Project
export const DEFAULT_SUPABASE_URL = 'https://wopbuflusryycanyfqop.supabase.co';
export const DEFAULT_SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcGJ1Zmx1c3J5eWNhbnlmcW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI3MTk0OCwiZXhwIjoyMTA5ODQ3OTQ4fQ.ENSCRB0h0EysxzjRSJWHWm7KKAk555GRaW20itnd1ko';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcGJ1Zmx1c3J5eWNhbnlmcW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNzE5NDgsImV4cCI6MjEwOTg0Nzk0OH0._fuaGK87lMOCz6aAPH__XASA2ZCY2cwy3hmqgvPX7pU';

const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
// Prefer service role key for server-side execution so RLS does not block admin/internal procedures
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_SERVICE_ROLE;

// Create client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey);
};

export const getSupabaseConfig = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl,
    hasKey: Boolean(supabaseKey),
  };
};

export interface TableSchemaCheck {
  table: string;
  label: string;
  exists: boolean;
  missingColumns: string[];
}

export const FULL_IDEMPOTENT_SCHEMA_SQL = `-- ====================================================================
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

const TABLE_DEFINITIONS: Array<{
  table: string;
  label: string;
  createSql: string;
  columnsToVerify?: Array<{ name: string; alterSql: string }>;
}> = [
  {
    table: 'mitras',
    label: 'Data Mitra Konsultan',
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
      { name: 'gender', alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS gender TEXT;' },
      { name: 'emailVerified', alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;' },
      { name: 'verificationToken', alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;' },
      { name: 'verificationTokenExpiry', alterSql: 'ALTER TABLE public.mitras ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TEXT;' },
    ],
  },
  {
    table: 'services',
    label: 'Katalog Layanan Firma',
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
CREATE POLICY "Public Anon Access services" ON public.services FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'client_deals',
    label: 'Transaksi & Deal Klien',
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
      { name: 'subscriptionStartDate', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TEXT;' },
      { name: 'billingDayOfMonth', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "billingDayOfMonth" INTEGER;' },
      { name: 'nextBillingDate', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "nextBillingDate" TEXT;' },
      { name: 'lastBilledDate', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "lastBilledDate" TEXT;' },
      { name: 'isBillingDue', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "isBillingDue" BOOLEAN DEFAULT false;' },
      { name: 'terminatedAt', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminatedAt" TEXT;' },
      { name: 'terminationReason', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "terminationReason" TEXT;' },
      { name: 'rejectedAt', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectedAt" TEXT;' },
      { name: 'rejectionReason', alterSql: 'ALTER TABLE public.client_deals ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;' },
    ],
  },
  {
    table: 'commissions',
    label: 'Buku Besar Komisi',
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
CREATE POLICY "Public Anon Access commissions" ON public.commissions FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'payout_requests',
    label: 'Pencairan Komisi (Payout)',
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
CREATE POLICY "Public Anon Access payout_requests" ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'marketing_tools',
    label: 'Materi Promosi & Tools',
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
CREATE POLICY "Public Anon Access marketing_tools" ON public.marketing_tools FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'notifications',
    label: 'Notifikasi Sistem',
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
CREATE POLICY "Public Anon Access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'user_passwords',
    label: 'Kredensial & Sistem KV',
    createSql: `CREATE TABLE IF NOT EXISTS public.user_passwords (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access user_passwords" ON public.user_passwords;
CREATE POLICY "Public Anon Access user_passwords" ON public.user_passwords FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'app_settings',
    label: 'Pengaturan Sistem & SMTP',
    createSql: `CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'config_primary',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon Access app_settings" ON public.app_settings;
CREATE POLICY "Public Anon Access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'system_roles',
    label: 'Hak Akses & Role Dinamis',
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
CREATE POLICY "Public Anon Access system_roles" ON public.system_roles FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'activity_logs',
    label: 'Log Aktivitas Mitra & Admin',
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
CREATE POLICY "Public Anon Access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    table: 'email_logs',
    label: 'Log Pengiriman Email SMTP',
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
CREATE POLICY "Public Anon Access email_logs" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);`,
  },
];

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  tableChecks?: TableSchemaCheck[];
  hasPendingMigration?: boolean;
  migrationSql?: string;
  fullSchemaSql?: string;
  error?: string;
}> => {
  if (!supabase) {
    return {
      success: false,
      message: 'SUPABASE_URL atau SUPABASE_KEY belum terisi di environment variable server hosting Anda.',
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL,
    };
  }

  try {
    const tableChecks: TableSchemaCheck[] = [];
    const migrationParts: string[] = [];

    for (const def of TABLE_DEFINITIONS) {
      const { error } = await supabase.from(def.table).select('*').limit(1);
      if (error) {
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: false,
          missingColumns: [],
        });
        migrationParts.push(`-- Buat Tabel Baru: public.${def.table} (${def.label})\n${def.createSql}`);
      } else {
        const missingCols: string[] = [];
        if (def.columnsToVerify && def.columnsToVerify.length > 0) {
          for (const col of def.columnsToVerify) {
            const { error: colErr } = await supabase.from(def.table).select(col.name).limit(1);
            if (colErr) {
              missingCols.push(col.name);
              migrationParts.push(`-- Tambah Kolom Baru "${col.name}" pada Tabel public.${def.table}\n${col.alterSql}`);
            }
          }
        }
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: true,
          missingColumns: missingCols,
        });
      }
    }

    const existingTables = tableChecks.filter((t) => t.exists).map((t) => t.table);
    const missingTables = tableChecks.filter((t) => !t.exists).map((t) => t.table);
    const tablesWithMissingCols = tableChecks.filter((t) => t.missingColumns.length > 0);
    const hasPendingMigration = missingTables.length > 0 || tablesWithMissingCols.length > 0;

    const generatedMigrationSql =
      migrationParts.length > 0
        ? `-- ====================================================================\n-- QUERY UPDATE TABEL & KOLOM BARU SUPABASE (OTOMATIS TERDETEKSI)\n-- Salin dan jalankan di menu SQL Editor Supabase Anda\n-- ====================================================================\n\n${migrationParts.join('\n\n')}`
        : `-- Seluruh 12 tabel dan kolom terbaru sudah lengkap di Supabase Anda!\n-- Jika Anda ingin memastikan ulang struktur kolom terbaru, Anda dapat menjalankan query aman berikut:\n\n${FULL_IDEMPOTENT_SCHEMA_SQL}`;

    if (existingTables.length === 0) {
      return {
        success: false,
        message: 'Terhubung ke Supabase, namun tabel belum dibuat! Silakan salin dan jalankan Query SQL di bawah pada SQL Editor Supabase Anda.',
        tablesFound: [],
        tableChecks,
        hasPendingMigration: true,
        migrationSql: generatedMigrationSql,
        fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL,
      };
    }

    return {
      success: true,
      message: hasPendingMigration
        ? `Supabase Terhubung (${existingTables.length}/${tableChecks.length} tabel aktif). Tersedia query update untuk ${missingTables.length} tabel tambahan & ${tablesWithMissingCols.reduce((a, b) => a + b.missingColumns.length, 0)} kolom baru.`
        : `Koneksi ke Supabase berhasil aktif dan seluruh ${tableChecks.length} tabel serta kolom database sudah lengkap!`,
      tablesFound: existingTables,
      tableChecks,
      hasPendingMigration,
      migrationSql: generatedMigrationSql,
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Koneksi timeout / jaringan'}`,
      error: err.message,
      fullSchemaSql: FULL_IDEMPOTENT_SCHEMA_SQL,
    };
  }
};
