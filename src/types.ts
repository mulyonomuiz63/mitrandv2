export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  customBankFields?: Record<string, string>;
}

export interface SpecializationOptionItem {
  id: string;
  label: string;
  isActive: boolean;
}

export type MitraSystemFieldKey =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'nik'
  | 'specialization'
  | 'bankName'
  | 'accountNumber'
  | 'accountHolder';

export type ClientSystemFieldKey =
  | 'companyName'
  | 'picName'
  | 'picPhone'
  | 'picEmail'
  | 'notes';

export interface DynamicFormField {
  id: string;
  systemKey?: MitraSystemFieldKey | ClientSystemFieldKey;
  section?: 'profile' | 'bank';
  isDefault?: boolean;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: string[];
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

export function resolveSpecializationOptions(
  settings?: { specializationOptions?: SpecializationOptionItem[] } | null
): SpecializationOptionItem[] {
  const raw = settings?.specializationOptions;
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
}

export const DEFAULT_BANK_OPTIONS: string[] = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
];

export const DEFAULT_MITRA_FORM_FIELDS: DynamicFormField[] = [
  {
    id: 'mitra-def-fullName',
    systemKey: 'fullName',
    section: 'profile',
    isDefault: true,
    label: 'Nama Lengkap & Gelar',
    type: 'text',
    placeholder: 'Contoh: Muhammad Reza, S.H., M.H.',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-email',
    systemKey: 'email',
    section: 'profile',
    isDefault: true,
    label: 'Email Resmi',
    type: 'text',
    placeholder: 'nama@email.com',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-phone',
    systemKey: 'phone',
    section: 'profile',
    isDefault: true,
    label: 'No. WhatsApp Aktif',
    type: 'text',
    placeholder: '0812-xxxx-xxxx',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-nik',
    systemKey: 'nik',
    section: 'profile',
    isDefault: true,
    label: 'Nomor KTP / NIK',
    type: 'text',
    placeholder: '16 digit NIK resmi',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-specialization',
    systemKey: 'specialization',
    section: 'profile',
    isDefault: true,
    label: DEFAULT_SPECIALIZATION_LABEL,
    type: 'select',
    placeholder: 'Pilih Bidang Keahlian / Profesi Mitra',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-bankName',
    systemKey: 'bankName',
    section: 'bank',
    isDefault: true,
    label: 'Nama Bank Pencairan Komisi',
    type: 'select',
    options: DEFAULT_BANK_OPTIONS,
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-accountNumber',
    systemKey: 'accountNumber',
    section: 'bank',
    isDefault: true,
    label: 'Nomor Rekening Bank',
    type: 'text',
    placeholder: 'Contoh: 8830192837',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-accountHolder',
    systemKey: 'accountHolder',
    section: 'bank',
    isDefault: true,
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
  // Email Verification & Admin Review Fields
  emailVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  customFields?: Record<string, string>;
  isLoadingFallback?: boolean;
}

export function isMitraDataIncomplete(mitra?: Mitra | null, settings?: AppSettings | null): boolean {
  if (!mitra || mitra.id === 'mitra-empty' || mitra.isLoadingFallback) return false;
  const fields = resolveMitraFormFields(settings);
  const isFieldActive = (key: MitraSystemFieldKey) => {
    const found = fields.find((f) => f.systemKey === key);
    return found ? found.isActive !== false : true;
  };

  const missingBankNumber =
    isFieldActive('accountNumber') &&
    (!mitra.bankDetails?.accountNumber ||
      mitra.bankDetails.accountNumber.trim() === '' ||
      mitra.bankDetails.accountNumber.trim() === '-');
  const missingBankName =
    isFieldActive('bankName') &&
    (!mitra.bankDetails?.bankName ||
      mitra.bankDetails.bankName.trim() === '' ||
      mitra.bankDetails.bankName.trim() === '-');
  const missingBankHolder =
    isFieldActive('accountHolder') &&
    (!mitra.bankDetails?.accountHolder ||
      mitra.bankDetails.accountHolder.trim() === '' ||
      mitra.bankDetails.accountHolder.trim() === '-');
  const missingBank = missingBankNumber || missingBankName || missingBankHolder;

  const missingNik =
    isFieldActive('nik') &&
    (!mitra.nik ||
      mitra.nik.trim() === '' ||
      mitra.nik.trim() === '-' ||
      mitra.nik.trim() === '3201000000000000');
  const missingPhone =
    isFieldActive('phone') &&
    (!mitra.phone ||
      mitra.phone.trim() === '' ||
      mitra.phone.trim() === '-');
  return missingBank || missingNik || missingPhone;
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

export function resolveServicePricingType(
  service?: Pick<ServiceItem, 'name' | 'pricingType'> | null
): 'case_by_case' | 'monthly_subscription' | 'annual_subscription' {
  if (!service) return 'monthly_subscription';
  const nameLower = (service.name || '').toLowerCase();
  if (nameLower.includes('(bulanan)')) {
    return 'monthly_subscription';
  }
  if (
    nameLower.includes('(per projek)') ||
    nameLower.includes('(per proyek)') ||
    nameLower.includes('(case by case)') ||
    nameLower.includes('(case-by-case)')
  ) {
    return 'case_by_case';
  }
  if (nameLower.includes('(tahunan)')) {
    return 'annual_subscription';
  }
  return service.pricingType || 'case_by_case';
}

export const OFFICIAL_ND_SERVICES: ServiceItem[] = [
  {
    id: 'srv-nd-01',
    name: 'Jasa Perpajakan (Bulanan)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 5000000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Layanan kepatuhan, administrasi, dan pelaporan perpajakan rutin bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-02',
    name: 'Jasa Akuntansi (Bulanan)',
    category: 'Laporan Keuangan',
    defaultPrice: 5000000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Layanan pembukuan dan penyusunan laporan keuangan akuntansi rutin bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-03',
    name: 'Jasa Keuangan (Bulanan)',
    category: 'Konsultasi Finansial',
    defaultPrice: 5000000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Layanan manajemen, analisis, dan advisori keuangan perusahaan rutin bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-04',
    name: 'Jasa Akuntansi & Perpajakan (Bulanan)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 7500000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Paket terpadu pembukuan akuntansi dan kepatuhan perpajakan rutin bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-05',
    name: 'Jasa Keuangan, Akuntansi, & Perpajakan (Bulanan)',
    category: 'Laporan Keuangan',
    defaultPrice: 10000000,
    pricingType: 'monthly_subscription',
    commissionRate: 20,
    description: 'Paket komprehensif pengelolaan keuangan, akuntansi, dan perpajakan rutin bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-06',
    name: 'Jasa Hukum (Bulanan)',
    category: 'Legalitas Korporasi',
    defaultPrice: 7500000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Layanan retainer konsultan hukum korporasi dan pendampingan legal bulanan.',
    isActive: true,
  },
  {
    id: 'srv-nd-07',
    name: 'Jasa Lainnya (Bulanan)',
    category: 'Konsultasi Finansial',
    defaultPrice: 5000000,
    pricingType: 'monthly_subscription',
    commissionRate: 15,
    description: 'Layanan kustom berlangganan bulanan sesuai kebutuhan spesifik klien.',
    isActive: true,
  },
  {
    id: 'srv-nd-08',
    name: 'Jasa Perpajakan (Per Projek)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 15000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Penanganan kasus atau pekerjaan perpajakan berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-09',
    name: 'Jasa Akuntansi (Per Projek)',
    category: 'Laporan Keuangan',
    defaultPrice: 15000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Penyusunan atau rekonstruksi laporan akuntansi berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-10',
    name: 'Jasa Keuangan (Per Projek)',
    category: 'Konsultasi Finansial',
    defaultPrice: 20000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Advisori dan restrukturisasi keuangan berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-11',
    name: 'Jasa Akuntansi & Perpajakan (Per Projek)',
    category: 'Kepatuhan Pajak',
    defaultPrice: 25000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Penanganan terpadu akuntansi dan perpajakan berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-12',
    name: 'Jasa Keuangan, Akuntansi & Perpajakan (Per Projek)',
    category: 'Laporan Keuangan',
    defaultPrice: 35000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Solusi menyeluruh keuangan, akuntansi, dan perpajakan berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-13',
    name: 'Jasa Hukum (Per Projek)',
    category: 'Legalitas Korporasi',
    defaultPrice: 25000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Pendampingan hukum, litigasi, atau legalitas korporasi berbasis per projek (Case-by-Case).',
    isActive: true,
  },
  {
    id: 'srv-nd-14',
    name: 'Jasa Lainnya (Per Projek)',
    category: 'Konsultasi Finansial',
    defaultPrice: 15000000,
    pricingType: 'case_by_case',
    commissionRate: 10,
    description: 'Layanan profesional khusus berbasis per projek (Case-by-Case) sesuai kesepakatan.',
    isActive: true,
  },
];

export interface CommissionSchemeConfig {
  // Sistem Langganan (monthly_subscription / annual_subscription)
  subHighThreshold: number; // default: 10000000 (>= 10 Juta)
  subHighRate: number;      // default: 20%
  subMidThreshold: number;  // default: 5000000 (5 - 10 Juta)
  subMidRate: number;       // default: 15%
  subLowRate: number;       // default: 10% (< 5 Juta)
  subRecurringRate: number; // default: 10% (Bulan/Siklus Berikutnya)

  // Sistem Case-by-Case (case_by_case)
  caseHighThreshold: number; // default: 100000000 (>= 100 Juta)
  caseHighRate: number;      // default: 20%
  caseMidThreshold: number;  // default: 50000000 (50 - 100 Juta)
  caseMidRate: number;       // default: 15%
  caseLowRate: number;       // default: 10% (< 50 Juta)
  updatedAt?: string;
}

export interface BonusRewardTier {
  id: string;
  no: number;
  salesTarget: number; // Capaian Penjualan (Rp)
  rewardName: string;  // Hadiah / Bonus
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
  targetDealRevenue: number;   // e.g. Rp 50.000.000 (monthly) or Rp 500.000.000 (yearly)
  targetClientCount: number;   // e.g. 3 klien (monthly) or 24 klien (yearly)
  standardBonusAmount: number; // e.g. Rp 5.000.000
  monthlyTargetDealRevenue?: number;
  monthlyTargetClientCount?: number;
  monthlyStandardBonusAmount?: number;
  yearlyTargetDealRevenue?: number;
  yearlyTargetClientCount?: number;
  yearlyStandardBonusAmount?: number;
  rewardTiers?: BonusRewardTier[];
  rewardDescription: string;   // e.g. 'Jalan-Jalan LN, Motor Baru, Umroh, Mobil Baru & Rumah Baru'
  updatedAt?: string;
}

export function resolveBonusRewardTiers(config?: Partial<BonusTargetConfig> | null): BonusRewardTier[] {
  if (config?.rewardTiers && Array.isArray(config.rewardTiers) && config.rewardTiers.length > 0) {
    return config.rewardTiers;
  }
  return DEFAULT_BONUS_REWARD_TIERS;
}

export function resolveQualifiedRewardTier(
  achievedSales: number,
  config?: Partial<BonusTargetConfig> | null
): {
  achievedTier: BonusRewardTier | null;
  nextTier: BonusRewardTier | null;
  activeTiers: BonusRewardTier[];
} {
  const activeTiers = resolveBonusRewardTiers(config)
    .filter((t) => t.isActive !== false)
    .sort((a, b) => a.salesTarget - b.salesTarget);
  let achievedTier: BonusRewardTier | null = null;
  let nextTier: BonusRewardTier | null = null;
  for (const tier of activeTiers) {
    if (achievedSales >= tier.salesTarget) {
      achievedTier = tier;
    } else if (!nextTier) {
      nextTier = tier;
    }
  }
  return { achievedTier, nextTier, activeTiers };
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

export function calculateClientDealCommission(
  pricingType: 'case_by_case' | 'monthly_subscription' | 'annual_subscription',
  dealValue: number,
  scheme?: Partial<CommissionSchemeConfig> | null
): {
  initialRate: number;
  initialAmount: number;
  recurringRate: number;
  recurringAmount: number;
  tierLabel: string;
} {
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

  // Case-by-case
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
  // Locked Deal-Time Commission Fields (Per-Client Commission System)
  appliedCommissionRate?: number;
  lockedRecurringRate?: number;
  recurringCommissionAmount?: number;
  status: 'pending_acc' | 'deal_closed' | 'active_subscription' | 'in_review' | 'cancelled' | 'rejected';
  date: string;
  recurringPaidMonths?: number;
  recurringPaidYears?: number;
  // Case-by-case custom period support (e.g. Feb 2024 s/d Apr 2025 sekali bayar)
  periodStart?: string;
  periodEnd?: string;
  durationMonths?: number;
  paymentTermType?: 'one_time' | 'milestone';
  notes?: string;
  submittedBy?: 'mitra' | 'client_self';
  // Subscription Schedule & Billing Fields
  subscriptionStartDate?: string;
  billingDayOfMonth?: number;
  nextBillingDate?: string;
  lastBilledDate?: string;
  isBillingDue?: boolean;
  // Termination & Rejection Fields
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
  amount: number; // Gross amount
  bankDetails: BankDetails;
  requestDate: string;
  processedDate?: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  // Deduction & Proof of Transfer fields (optional but fully supported)
  pph21Deduction?: number;
  pph21Rate?: number;
  adminFeeDeduction?: number;
  netAmountTransferred?: number;
  proofFileUrl?: string; // Data URL or URL for PDF / JPG / PNG
  proofFileName?: string;
  transferRefNumber?: string;
  disbursedBy?: string;
  notes?: string;
}

export type PayoutScheduleType = 'awal_bulan' | 'pertengahan_bulan' | 'akhir_bulan';

export function getPayoutScheduleLabel(schedule?: PayoutScheduleType | string): string {
  switch (schedule) {
    case 'pertengahan_bulan':
      return 'Setiap Pertengahan Bulan (Tanggal 15–17)';
    case 'akhir_bulan':
      return 'Setiap Akhir Bulan (Tanggal 28–31)';
    case 'awal_bulan':
    default:
      return 'Setiap Awal Bulan (Tanggal 1–5)';
  }
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
  payoutSchedule?: PayoutScheduleType;
  payoutScheduleNote?: string;
  allowClientSelfRegister: boolean;
  googleOAuthEnabled: boolean;
  googleClientId: string;
  geminiApiEnabled: boolean;
  geminiModel: string;

  // Environment Mode (Development vs Production)
  appEnvironment: 'development' | 'production';

  // Live Chat Feature Toggle (Managed by Admin: if false, hidden for Mitra & Staf)
  chatEnabled?: boolean;

  // Dynamic Mitra Specialization & Custom Form Fields Configuration
  specializationEnabled?: boolean;
  specializationLabel?: string;
  specializationOptions?: SpecializationOptionItem[];
  mitraCustomFields?: DynamicFormField[];
  clientCustomFields?: DynamicFormField[];
  mitraFieldsInitialized?: boolean;
  clientFieldsInitialized?: boolean;

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
  emailOnRegistrationVerify: boolean; // Verifikasi email pendaftaran akun mitra
  emailOnPayoutDisbursed: boolean;    // Informasi pencairan komisi & bukti transfer
  emailOnClientAcc: boolean;          // Validasi keberhasilan deal klien (ACC)
  emailOnPasswordReset: boolean;      // Reset password dan instruksi keamanan
  emailOnRecurringInvoice: boolean;   // Notifikasi siklus invoice langganan
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

export function isSystemUpdateNotification(notif: NotificationItem): boolean {
  if (
    notif.type === 'system_update' ||
    notif.targetAudience === 'admin_only' ||
    notif.id.startsWith('notif-sys-') ||
    notif.type === 'tools_update' ||
    notif.type === 'training'
  ) {
    return true;
  }
  const combined = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
  if (
    combined.includes('pengaturan sistem') ||
    combined.includes('update sistem') ||
    combined.includes('perbaikan sistem') ||
    combined.includes('pembaruan sistem') ||
    combined.includes('konfigurasi sistem') ||
    combined.includes('katalog layanan') ||
    combined.includes('skema komisi') ||
    combined.includes('tools marketing') ||
    combined.includes('materi pelatihan') ||
    combined.includes('materi video') ||
    combined.includes('brosur digital') ||
    combined.includes('server smtp')
  ) {
    return true;
  }
  return false;
}

export function filterNotificationsForViewer(
  notifications: NotificationItem[],
  options: {
    viewerRole: 'admin' | 'staff' | 'mitra';
    mitraId?: string;
    mitraName?: string;
    mitraMemberCode?: string;
    mitraReferralCode?: string;
    mitraClientCompanyNames?: string[];
  }
): NotificationItem[] {
  const {
    viewerRole,
    mitraId,
    mitraName,
    mitraMemberCode,
    mitraReferralCode,
    mitraClientCompanyNames = [],
  } = options;

  return notifications.filter((notif) => {
    const isSysUpdate = isSystemUpdateNotification(notif);

    // 1. Admin (Super Admin) receives all system process notifications AND system update notifications
    if (viewerRole === 'admin') {
      return true;
    }

    // 2. Neither Staf nor Mitra should EVER receive system/configuration/tools update notifications
    if (isSysUpdate) {
      return false;
    }

    // 3. Staf receives all operational workflow process notifications (verification, client_deal, commission)
    if (viewerRole === 'staff') {
      return true;
    }

    // 4. Mitra ONLY receives operational process notifications that specifically belong to this Mitra
    if (viewerRole === 'mitra') {
      if (notif.targetAudience === 'admin_staff' || notif.id.startsWith('notif-ops-')) {
        return false;
      }

      const titleLower = (notif.title || '').toLowerCase();
      // Alerts meant for Admin/Staf to verify new registrants
      if (titleLower.startsWith('pendaftaran mitra baru')) {
        return false;
      }

      // Check explicit mitraId field
      if (notif.mitraId) {
        return Boolean(mitraId && notif.mitraId === mitraId);
      }

      // Check encoded ID prefix: notif-mtr-<mitraId>-<timestamp>
      if (notif.id.startsWith('notif-mtr-')) {
        if (!mitraId) return false;
        return notif.id.startsWith(`notif-mtr-${mitraId}-`);
      }

      // Fallback for legacy notifications in database without encoded ID: match by Mitra identity or client names
      const msgLower = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
      if (mitraName && mitraName.trim().length > 2 && msgLower.includes(mitraName.trim().toLowerCase())) {
        return true;
      }
      if (mitraMemberCode && mitraMemberCode !== '-' && msgLower.includes(mitraMemberCode.toLowerCase())) {
        return true;
      }
      if (mitraReferralCode && mitraReferralCode !== '-' && msgLower.includes(mitraReferralCode.toLowerCase())) {
        return true;
      }
      for (const company of mitraClientCompanyNames) {
        if (company && company.trim().length > 2 && msgLower.includes(company.trim().toLowerCase())) {
          return true;
        }
      }

      return false;
    }

    return false;
  });
}

export interface SalesHistoryMonth {
  month: string;
  totalSales: number;
  totalCommission: number;
  mitraCount: number;
  dealsClosed: number;
}

export type UserRoleCode = 'admin' | 'staff' | 'mitra' | string;

export type StaffMenuAccessKey =
  | 'dashboard'
  | 'admin-operations'
  | 'verification'
  | 'marketing-tools'
  | 'commissions'
  | 'manage-services'
  | 'settings-general'
  | 'settings-forms';

export interface StaffMenuOption {
  key: StaffMenuAccessKey;
  label: string;
  description: string;
  category: 'menu_utama' | 'pengaturan';
}

export const STAFF_MENU_OPTIONS: StaffMenuOption[] = [
  {
    key: 'dashboard',
    label: 'Dashboard Operasional',
    description: 'Melihat ringkasan statistik, grafik pertumbuhan, dan analitik performa mitra.',
    category: 'menu_utama',
  },
  {
    key: 'admin-operations',
    label: 'Validasi Klien & Payout',
    description: 'Memvalidasi deal klien (ACC), analisa kinerja mitra, dan memproses pencairan komisi.',
    category: 'menu_utama',
  },
  {
    key: 'verification',
    label: 'Verifikasi Mitra',
    description: 'Memeriksa berkas pendaftaran mitra baru, menyetujui (approve), atau menolak disertai alasan.',
    category: 'menu_utama',
  },
  {
    key: 'marketing-tools',
    label: 'Tools Marketing & Materi',
    description: 'Mengelola dan mengunggah materi promosi, brosur digital, dan panduan untuk mitra.',
    category: 'menu_utama',
  },
  {
    key: 'commissions',
    label: 'Komisi & Payout',
    description: 'Melihat buku besar transaksi komisi, bonus, dan riwayat pencairan dana mitra.',
    category: 'menu_utama',
  },
  {
    key: 'manage-services',
    label: 'Kelola Layanan Pajak',
    description: 'Menambah, mengubah, atau menonaktifkan daftar produk jasa pajak & hukum beserta tarif komisi.',
    category: 'pengaturan',
  },
  {
    key: 'settings-general',
    label: 'Pengaturan: Layanan & Profil Firma',
    description: 'Mengakses tab Layanan & Profil Firma di dalam Pengaturan Sistem.',
    category: 'pengaturan',
  },
  {
    key: 'settings-forms',
    label: 'Pengaturan: Form & Spesialisasi Dinamis',
    description: 'Mengakses tab Form & Spesialisasi Dinamis (input mitra, rekening bank, dan input klien).',
    category: 'pengaturan',
  },
];

export const DEFAULT_STAFF_ALLOWED_MENUS: StaffMenuAccessKey[] = [
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
  allowedMenus: StaffMenuAccessKey[];
  createdAt: string;
  updatedAt?: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  position?: string;
  gender?: 'male' | 'female';
  avatarUrl: string;
}

export interface RoleDefinition {
  code: UserRoleCode;
  name: string;
  description: string;
  portalView: 'admin' | 'mitra';
  defaultTab: string;
  allowedTabs: string[];
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  role: 'admin' | 'mitra';
  roleCode?: UserRoleCode;
  roleName?: string;
  portalView?: 'admin' | 'mitra';
  defaultTab?: string;
  allowedTabs?: string[];
  allowedMenus?: StaffMenuAccessKey[];
  permissions?: string[];
  mitraId?: string;
  staffId?: string;
  referralCode?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
}

export function isBankFormField(field: DynamicFormField): boolean {
  if (!field) return false;
  if (field.section === 'bank') return true;
  if (field.section === 'profile') return false;
  return (
    field.systemKey === 'bankName' ||
    field.systemKey === 'accountNumber' ||
    field.systemKey === 'accountHolder'
  );
}

export function getBankOptionUsageCount(bankLabel: string, mitras: Mitra[]): number {
  const target = (bankLabel || '').trim().toLowerCase();
  if (!target) return 0;
  return (mitras || []).filter(
    (m) => (m.bankDetails?.bankName || '').trim().toLowerCase() === target
  ).length;
}

export function resolveMitraFormFields(settings?: AppSettings | null): DynamicFormField[] {
  const existing = Array.isArray(settings?.mitraCustomFields) ? settings!.mitraCustomFields! : [];
  const specLabel = settings?.specializationLabel || DEFAULT_SPECIALIZATION_LABEL;
  const specEnabled = settings?.specializationEnabled !== false;

  const normalizeField = (f: DynamicFormField): DynamicFormField => {
    const inferredSection: 'profile' | 'bank' =
      f.section ||
      (f.systemKey === 'bankName' ||
      f.systemKey === 'accountNumber' ||
      f.systemKey === 'accountHolder'
        ? 'bank'
        : 'profile');

    if (f.systemKey === 'specialization') {
      return {
        ...f,
        section: inferredSection,
        label: f.label || specLabel,
        isActive: settings?.specializationEnabled !== undefined ? specEnabled : f.isActive,
      };
    }
    return {
      ...f,
      section: inferredSection,
    };
  };

  if (settings?.mitraFieldsInitialized) {
    return existing.map(normalizeField);
  }

  // Merge default fields with any existing custom fields (when not initialized yet)
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return existing.map(normalizeField);
  }

  const defaults = DEFAULT_MITRA_FORM_FIELDS.map((df) => {
    if (df.systemKey === 'specialization') {
      return { ...df, label: specLabel, isActive: specEnabled };
    }
    return { ...df };
  });
  return [...defaults, ...existing.map(normalizeField)];
}

export function resolveClientFormFields(settings?: AppSettings | null): DynamicFormField[] {
  const existing = Array.isArray(settings?.clientCustomFields) ? settings!.clientCustomFields! : [];
  if (settings?.clientFieldsInitialized) {
    return existing;
  }
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return existing;
  }
  return [...DEFAULT_CLIENT_FORM_FIELDS.map((df) => ({ ...df })), ...existing];
}

export function getSpecializationOptionUsageCount(optionLabel: string, mitras: Mitra[]): number {
  const target = (optionLabel || '').trim().toLowerCase();
  if (!target) return 0;
  return (mitras || []).filter((m) => (m.specialization || '').trim().toLowerCase() === target).length;
}

export function getMitraFieldUsageCount(field: DynamicFormField, mitras: Mitra[]): number {
  const list = mitras || [];
  switch (field.systemKey) {
    case 'fullName':
      return list.filter((m) => Boolean(m.fullName && m.fullName.trim() && m.fullName !== '-')).length;
    case 'email':
      return list.filter((m) => Boolean(m.email && m.email.trim() && m.email !== '-')).length;
    case 'phone':
      return list.filter((m) => Boolean(m.phone && m.phone.trim() && m.phone !== '-')).length;
    case 'nik':
      return list.filter(
        (m) => Boolean(m.nik && m.nik.trim() && m.nik !== '-' && m.nik !== '0000000000000000')
      ).length;
    case 'specialization':
      return list.filter((m) => Boolean(m.specialization && m.specialization.trim() && m.specialization !== '-'))
        .length;
    case 'bankName':
      return list.filter(
        (m) => Boolean(m.bankDetails?.bankName && m.bankDetails.bankName.trim() && m.bankDetails.bankName !== '-')
      ).length;
    case 'accountNumber':
      return list.filter(
        (m) =>
          Boolean(
            m.bankDetails?.accountNumber &&
              m.bankDetails.accountNumber.trim() &&
              m.bankDetails.accountNumber !== '-'
          )
      ).length;
    case 'accountHolder':
      return list.filter(
        (m) =>
          Boolean(
            m.bankDetails?.accountHolder &&
              m.bankDetails.accountHolder.trim() &&
              m.bankDetails.accountHolder !== '-'
          )
      ).length;
    default:
      return list.filter((m) => {
        const fromCustom = m.customFields?.[field.label] ?? m.customFields?.[field.id];
        const fromBankCustom =
          m.bankDetails?.customBankFields?.[field.label] ??
          m.bankDetails?.customBankFields?.[field.id];
        return Boolean(
          (fromCustom && String(fromCustom).trim() !== '') ||
            (fromBankCustom && String(fromBankCustom).trim() !== '')
        );
      }).length;
  }
}

export function getClientFieldUsageCount(field: DynamicFormField, clientDeals: ClientDeal[]): number {
  const list = clientDeals || [];
  switch (field.systemKey) {
    case 'companyName':
      return list.filter((c) => Boolean(c.companyName && c.companyName.trim() && c.companyName !== '-')).length;
    case 'picName':
      return list.filter((c) => Boolean(c.picName && c.picName.trim() && c.picName !== '-')).length;
    case 'picPhone':
      return list.filter((c) => Boolean(c.picPhone && c.picPhone.trim() && c.picPhone !== '-')).length;
    case 'picEmail':
      return list.filter((c) => Boolean(c.picEmail && c.picEmail.trim() && c.picEmail !== '-')).length;
    case 'notes':
      return list.filter((c) => Boolean(c.notes && c.notes.trim() !== '')).length;
    default:
      return list.filter((c) => {
        if (!c.customFields) return false;
        const byLabel = c.customFields[field.label];
        const byId = c.customFields[field.id];
        return Boolean((byLabel && String(byLabel).trim() !== '') || (byId && String(byId).trim() !== ''));
      }).length;
  }
}

export interface ChatParticipant {
  id: string;
  name: string;
  email: string;
  role: 'mitra' | 'staff' | 'admin';
  avatar: string;
  avatarUrl?: string;
  badgeLabel?: string;
  code?: string;
  memberCode?: string;
  specialization?: string;
}

export interface ChatLinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface ChatReplyQuote {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  hasImage?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: 'mitra' | 'staff' | 'admin';
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  imageName?: string;
  imageOriginalSize?: number;
  imageCompressedSize?: number;
  linkPreview?: ChatLinkPreview;
  replyTo?: ChatReplyQuote;
  forwardedFrom?: string;
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
}



