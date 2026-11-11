-- ====================================================================
-- SKRIP SKEMA DATABASE LENGKAP SUPABASE UNTUK NDTAXANDLAW KEMITRAAN
-- ====================================================================
-- CARA PENGGUNAAN:
-- 1. Buka dashboard Supabase project Anda: https://supabase.com/dashboard
-- 2. Pilih project Anda, lalu klik menu "SQL Editor" di bilah kiri.
-- 3. Klik "New Query", tempelkan (paste) seluruh isi skrip ini.
-- 4. Klik tombol "RUN" (Jalankan).
-- Seluruh tabel, indeks, keamanan RLS, dan data awal akan langsung terbuat!
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 8. TABEL PENGATURAN SISTEM (SETTINGS)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'config_primary',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL KATA SANDI PENGGUNA TERENKRIPSI (USER PASSWORDS - SCRYPT + AES-256-GCM)
-- Format: ndenc$v2$<role>$<saltHex>$<scryptHashHex>$<ivHex>$<authTagHex>$<cipherHex>
CREATE TABLE IF NOT EXISTS public.user_passwords (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL MANAJEMEN ROLE DINAMIS (SYSTEM ROLES)
-- Saat ini aktif: 'admin' dan 'mitra' (siap ditambahkan role baru di masa mendatang)
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

-- ====================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS) & IZINKAN AKSES API
-- ====================================================================
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

-- Kebijakan akses penuh untuk Service Role & Anon API
CREATE POLICY "Public Anon Access mitras" ON public.mitras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access client_deals" ON public.client_deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access commissions" ON public.commissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access payout_requests" ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access marketing_tools" ON public.marketing_tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access user_passwords" ON public.user_passwords FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Anon Access system_roles" ON public.system_roles FOR ALL USING (true) WITH CHECK (true);

-- SEED ROLE AWAL (ADMIN & MITRA)
INSERT INTO public.system_roles (code, name, description, "portalView", "defaultTab", "allowedTabs", permissions, "isSystem", "isActive")
VALUES
(
    'admin',
    'Administrator Operasional',
    'Akses penuh ke operasional firma, review & approve deal klien, pemutusan langganan, pencairan komisi, manajemen mitra, layanan, dan pengaturan sistem.',
    'admin',
    'dashboard',
    '["dashboard", "admin-operations", "verification", "activity-logs", "marketing-tools", "commissions", "ai-reports", "idcard"]'::jsonb,
    '["manage_mitra", "review_clients", "approve_payouts", "manage_services", "manage_tools", "manage_settings", "manage_roles", "view_logs"]'::jsonb,
    true,
    true
),
(
    'mitra',
    'Mitra Konsultan Resmi',
    'Akses ke kartu identitas eksklusif, tautan referral, input klien baru, pencairan komisi fix, materi marketing, dan laporan performa mitra.',
    'mitra',
    'idcard',
    '["idcard", "dashboard", "marketing-tools", "commissions", "ai-reports"]'::jsonb,
    '["view_own_idcard", "create_client_referral", "request_payout", "download_marketing_tools", "update_own_profile"]'::jsonb,
    true,
    true
)
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- SEED DATA AWAL MITRA (CONTOH DATA RESMI)
-- ====================================================================
INSERT INTO public.mitras (id, "memberCode", "referralCode", "fullName", email, phone, nik, specialization, status, "avatarUrl", "joinedDate", "bankDetails", "totalCommission", "totalBonus", "pendingPayout", "paidPayout", "referredClientsCount", "activeSubscribersCount", "emailVerified")
VALUES 
(
    'mitra-01',
    'ND-2026-LAW-0042',
    'ND-REF-0042',
    'Bambang Sudirman, S.H., M.Kn.',
    'bambang.sudirman@example.com',
    '0812-8877-6655',
    '3171051508820001',
    'Konsultan Hukum Korporasi & Pengadaan Barang/Jasa',
    'verified',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    '2026-01-15',
    '{"bankName": "Bank Central Asia (BCA)", "accountNumber": "8830192837", "accountHolder": "Bambang Sudirman"}'::jsonb,
    34500000,
    7500000,
    6200000,
    35800000,
    8,
    3,
    true
),
(
    'mitra-02',
    'ND-2026-TAX-0077',
    'ND-REF-0077',
    'Dewi Lestari, S.E., B.K.P.',
    'dewi.lestari@example.com',
    '0813-2211-9988',
    '3275022004850002',
    'Konsultan Pajak Internasional & Transfer Pricing',
    'verified',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    '2026-03-20',
    '{"bankName": "Bank Mandiri", "accountNumber": "1370019283741", "accountHolder": "Dewi Lestari"}'::jsonb,
    48200000,
    12000000,
    0,
    60200000,
    12,
    5,
    true
)
ON CONFLICT (id) DO NOTHING;

-- SEED PASSWORD DEFAULT UNTUK TESTING
INSERT INTO public.user_passwords (email, password)
VALUES 
('admin@ndtaxlaw.com', 'adminND2026!'),
('bambang.sudirman@example.com', 'mitraND2026!'),
('dewi.lestari@example.com', 'mitraND2026!')
ON CONFLICT (email) DO NOTHING;
