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
  | 'ktpFile'
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
  type: 'text' | 'number' | 'select' | 'textarea' | 'file';
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
    placeholder: 'Nama lengkap',
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
    placeholder: '0812xxxx',
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
    placeholder: '16 digit NIK',
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-ktpFile',
    systemKey: 'ktpFile',
    section: 'profile',
    isDefault: true,
    label: 'Upload File KTP / NPWP',
    type: 'file',
    placeholder: 'JPG, PNG, atau PDF',
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
    placeholder: 'Pilih keahlian',
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
    type: 'number',
    placeholder: 'Nomor rekening',
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
    placeholder: 'Nama pemilik rekening',
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
    placeholder: 'Nama perusahaan',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picName',
    systemKey: 'picName',
    isDefault: true,
    label: 'Nama PIC / Direktur Penanggung Jawab',
    type: 'text',
    placeholder: 'Nama PIC',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picPhone',
    systemKey: 'picPhone',
    isDefault: true,
    label: 'Nomor WhatsApp / HP PIC',
    type: 'text',
    placeholder: '0812xxxx',
    required: true,
    isActive: true,
  },
  {
    id: 'client-def-picEmail',
    systemKey: 'picEmail',
    isDefault: true,
    label: 'Email PIC / Kantor Klien',
    type: 'text',
    placeholder: 'email@perusahaan.com',
    required: false,
    isActive: true,
  },
  {
    id: 'client-def-notes',
    systemKey: 'notes',
    isDefault: true,
    label: 'Catatan Tambahan & Kebutuhan Spesifik Klien',
    type: 'textarea',
    placeholder: 'Catatan kebutuhan...',
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
  ktpFileUrl?: string;
  ktpFileName?: string;
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
  isActive?: boolean;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivatedReason?: string;
  customFields?: Record<string, string>;
  isLoadingFallback?: boolean;
}

export function getMitraKtpFileUrl(mitra?: Mitra | null): string {
  if (!mitra) return '';
  const bankMeta = (mitra.bankDetails || {}) as any;
  const direct = mitra.ktpFileUrl || bankMeta.__ktpFileUrl;
  if (direct && typeof direct === 'string' && direct.trim() !== '' && direct.trim() !== '-') {
    return direct.trim();
  }
  if (mitra.customFields) {
    for (const [k, v] of Object.entries(mitra.customFields)) {
      if (!v || typeof v !== 'string') continue;
      const kl = k.toLowerCase();
      if (
        (k === 'mitra-def-ktpFile' || kl.includes('ktp') || kl.includes('npwp')) &&
        v.trim() !== '' &&
        v.trim() !== '-'
      ) {
        return v.trim();
      }
    }
  }
  return '';
}

export function getMitraKtpFileName(mitra?: Mitra | null): string {
  if (!mitra) return '';
  const bankMeta = (mitra.bankDetails || {}) as any;
  const directName =
    mitra.ktpFileName || bankMeta.__ktpFileName || mitra.customFields?.['__ktpFileName'];
  if (directName && typeof directName === 'string' && directName.trim() !== '') {
    return directName.trim();
  }
  const url = getMitraKtpFileUrl(mitra);
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const base = url.split('/').pop() || 'Dokumen_KTP_NPWP';
    return base.replace(/^\d+-/, '');
  }
  return 'Dokumen_KTP_NPWP';
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
      mitra.bankDetails.accountNumber.trim() === '-' ||
      !/^\d+$/.test(mitra.bankDetails.accountNumber.trim()));
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

  const ktpField = fields.find((f) => f.systemKey === 'ktpFile');
  const isKtpRequiredAndActive = ktpField
    ? ktpField.isActive !== false && ktpField.required !== false
    : true;
  const missingKtpFile = isKtpRequiredAndActive && !getMitraKtpFileUrl(mitra);

  const missingRequiredCustomFile = fields.some((f) => {
    if (f.systemKey || f.isActive === false || !f.required || f.type !== 'file') return false;
    const val =
      mitra.customFields?.[f.label] ||
      mitra.customFields?.[f.id] ||
      mitra.bankDetails?.customBankFields?.[f.label] ||
      mitra.bankDetails?.customBankFields?.[f.id];
    return !val || String(val).trim() === '' || String(val).trim() === '-';
  });

  return missingBank || missingNik || missingPhone || missingKtpFile || missingRequiredCustomFile;
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
  logoVerticalUrl?: string;
  logoHorizontalUrl?: string;
  logoBarcodeUrl?: string;
  activeLogoType?: 'vertical' | 'horizontal';
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

  // Master Template Isi Surat Penawaran Prospek (Admin & Staf)
  prospectLetterTemplate?: Partial<ProspectLetterContent>;
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
    | 'mitra_status'
    | 'mitra_delete'
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
    | 'tool_update'
    | 'tool_delete'
    | 'settings_update'
    | 'bonus_grant'
    | 'commission_scheme_update'
    | 'prospect_create'
    | 'prospect_update'
    | 'prospect_delete'
    | 'chat_file_delete'
    | 'chat_reset';
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
  updatedAt?: string;
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
  type: 'tools_update' | 'verification' | 'commission' | 'training' | 'client_deal' | 'system_update' | 'chat';
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
  | 'prospects'
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
    key: 'prospects',
    label: 'Prospek & Surat Penawaran',
    description: 'Memantau surat penawaran yang dibuat mitra serta menerbitkan surat penawaran atas nama mitra.',
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
    label: 'Pengaturan: Manajemen Form Input',
    description: 'Mengakses tab Manajemen Form Input (input mitra, rekening bank, dan input klien).',
    category: 'pengaturan',
  },
];

export const DEFAULT_STAFF_ALLOWED_MENUS: StaffMenuAccessKey[] = [
  'dashboard',
  'admin-operations',
  'verification',
  'prospects',
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

const LEGACY_PLACEHOLDER_UPGRADES: Record<string, string> = {
  'Contoh: Muhammad Reza, S.H., M.H.': 'Nama lengkap',
  '0812-xxxx-xxxx': '0812xxxx',
  '0812-XXXX-XXXX': '0812xxxx',
  '16 digit NIK resmi': '16 digit NIK',
  'Unggah dokumen KTP atau NPWP (Format: JPG, JPEG, PNG, atau PDF)': 'JPG, PNG, atau PDF',
  'Pilih Bidang Keahlian / Profesi Mitra': 'Pilih keahlian',
  'Contoh: 8830192837': 'Nomor rekening',
  'Harus sesuai buku tabungan': 'Nama pemilik rekening',
  'Contoh: PT Surya Kencana Abadi': 'Nama perusahaan',
  'Contoh: PT Sumber Pangan Makmur': 'Nama perusahaan',
  'Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)': 'Nama PIC',
  'Contoh: Budi Santoso (Direktur)': 'Nama PIC',
  'finance@suryakencana.co.id': 'email@perusahaan.com',
  'finance@sumberpangan.com': 'email@perusahaan.com',
  'Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP.':
    'Catatan kebutuhan...',
  'Contoh: Perlu pendampingan untuk membalas surat SP2DK atau persiapan audit laporan keuangan akhir tahun.':
    'Catatan kebutuhan...',
};

function normalizeShortPlaceholder(placeholder?: string): string | undefined {
  if (!placeholder) return placeholder;
  return LEGACY_PLACEHOLDER_UPGRADES[placeholder.trim()] || placeholder;
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
    const nextPlaceholder = normalizeShortPlaceholder(f.placeholder);

    if (f.systemKey === 'specialization') {
      return {
        ...f,
        placeholder: nextPlaceholder,
        section: inferredSection,
        label: f.label || specLabel,
        isActive: settings?.specializationEnabled !== undefined ? specEnabled : f.isActive,
      };
    }
    if (f.systemKey === 'accountNumber') {
      return {
        ...f,
        placeholder: nextPlaceholder,
        type: f.type === 'text' ? 'number' : (f.type || 'number'),
        section: inferredSection,
      };
    }
    return {
      ...f,
      placeholder: nextPlaceholder,
      section: inferredSection,
    };
  };

  const ensureDefaultKtpFileField = (list: DynamicFormField[]): DynamicFormField[] => {
    const hasKtpFile = list.some(
      (f) => f.systemKey === 'ktpFile' || f.id === 'mitra-def-ktpFile'
    );
    if (hasKtpFile) return list;
    const defaultKtpField = DEFAULT_MITRA_FORM_FIELDS.find((f) => f.systemKey === 'ktpFile');
    if (!defaultKtpField) return list;
    const nikIdx = list.findIndex((f) => f.systemKey === 'nik' || f.id === 'mitra-def-nik');
    if (nikIdx >= 0) {
      const next = [...list];
      next.splice(nikIdx + 1, 0, { ...defaultKtpField });
      return next;
    }
    return [{ ...defaultKtpField }, ...list];
  };

  if (settings?.mitraFieldsInitialized) {
    return ensureDefaultKtpFileField(existing.map(normalizeField));
  }

  // Merge default fields with any existing custom fields (when not initialized yet)
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return ensureDefaultKtpFileField(existing.map(normalizeField));
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
  const normalizeClientField = (f: DynamicFormField): DynamicFormField => ({
    ...f,
    placeholder: normalizeShortPlaceholder(f.placeholder),
  });
  if (settings?.clientFieldsInitialized) {
    return existing.map(normalizeClientField);
  }
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return existing.map(normalizeClientField);
  }
  return [...DEFAULT_CLIENT_FORM_FIELDS.map((df) => ({ ...df })), ...existing.map(normalizeClientField)];
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
    case 'ktpFile':
      return list.filter((m) => Boolean(getMitraKtpFileUrl(m))).length;
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

export interface ChatMessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  userRole: 'mitra' | 'staff' | 'admin';
  createdAt: string;
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
  reactions?: ChatMessageReaction[];
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isSystemMessage?: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  pinnedByName?: string;
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

export interface ProspectAddressParts {
  street: string;
  village: string;
  district: string;
  cityType: 'Kota' | 'Kab.';
  city: string;
  province: string;
  postalCode?: string;
}

export interface ProspectLetterLawItem {
  title: string;
  bullets: string[];
}

export interface ProspectLetterServiceItem {
  lead: string;
  body: string;
}

export interface ProspectLetterComparisonRow {
  component: string;
  internalStaff: string;
  consultant: string;
}

export interface ProspectLetterContent {
  // Page 1
  city: string;
  dateLine: string; // Supports {{TANGGAL_SURAT}}
  metaNomorLabel: string;
  nomorValue: string; // Supports {{NOMOR_SURAT}}
  metaSifatLabel: string;
  sifat: string;
  metaLampiranLabel: string;
  lampiran: string;
  metaPerihalLabel: string;
  perihal: string;
  recipientBlock: string; // Supports {{NAMA_PERUSAHAAN}} & {{ALAMAT_PERUSAHAAN}}
  greeting: string;
  introPara1: string;
  introPara2: string; // Supports {{NAMA_PERUSAHAAN}} placeholder
  sectionMainTitle: string;
  section1Title: string;
  section1Items: ProspectLetterLawItem[];
  section1Sanction: string;

  // Page 2
  section2Title: string;
  section2Items: ProspectLetterLawItem[];
  section2Sanction: string;
  section3Title: string;
  section3Items: ProspectLetterLawItem[];
  section3Sanction: string;

  // Page 3
  aboutTitle: string;
  aboutPara: string;
  servicesTitle: string;
  servicesIntro: string;
  servicesItems: ProspectLetterServiceItem[];
  servicesCaseNote: string;
  comparisonTitle: string;
  comparisonIntro: string;
  comparisonHeaders: [string, string, string];
  comparisonRows: ProspectLetterComparisonRow[];
  comparisonClosing: string;

  // Page 4 & Footer
  consultTitle: string;
  consultPara: string;
  mitraBoxTitle: string;
  mitraBoxNameLabel: string;
  mitraBoxNameValue: string; // Supports {{NAMA_MITRA}}
  mitraBoxIdLabel: string;
  mitraBoxIdValue: string; // Supports {{ID_MITRA}}
  mitraBoxPhoneLabel: string;
  mitraBoxPhoneValue: string; // Supports {{WA_MITRA}}
  mitraBoxEmailLabel: string;
  mitraBoxEmailValue: string; // Supports {{EMAIL_MITRA}}
  closingPara: string;
  directorSignHeading: string;
  directorFirmLabel: string;
  directorName: string;
  directorTitle: string;
  mitraSignHeading: string;
  mitraSignerLabel: string;
  mitraSignerName: string; // Supports {{NAMA_MITRA}}
  mitraRoleLabel: string;
  footerLeftTitle: string;
  footerLeftLines: string[];
  footerRightTitle: string;
  footerRightLines: string[];

  // Page Layout Margins & Padding (mm)
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  paddingTopMm: number;
  paddingBottomMm: number;
  paddingLeftMm: number;
  paddingRightMm: number;
}

export const DEFAULT_PROSPECT_LETTER_CONTENT: ProspectLetterContent = {
  city: 'Jakarta',
  dateLine: 'Jakarta, {{TANGGAL_SURAT}}',
  metaNomorLabel: 'Nomor',
  nomorValue: '{{NOMOR_SURAT}}',
  metaSifatLabel: 'Sifat',
  sifat: 'Terbatas',
  metaLampiranLabel: 'Lampiran',
  lampiran: 'Satu set',
  metaPerihalLabel: 'Perihal',
  perihal: 'Pemberitahuan dan Penawaran',
  recipientBlock:
    'Kepada Yth\nPimpinan/Direksi {{NAMA_PERUSAHAAN}}\nAlamat: {{ALAMAT_PERUSAHAAN}}',
  greeting: 'Dengan hormat,',
  introPara1:
    'Bersama ini kami sampaikan salam sejahtera untuk kita semua, karena telah diberi kesempatan untuk bisa menjalankan usaha dan memberikan penghidupan yang layak untuk banyak orang. Semoga kita diberikan keselamatan dan kesuksesan dalam menjalankan aktivitas sehari-hari. Aamiin.',
  introPara2:
    'Dalam rangka mendukung aktivitas usaha, memberikan bimbingan, dan membantu penyelesaian persoalan para pengusaha terkait isu keuangan, perpajakan, dan hukum, ND TAX AND LAW menyampaikan surat ini kepada {{NAMA_PERUSAHAAN}} sebagai bentuk kepedulian dan penawaran kerjasama yang saling menguntungkan.',
  sectionMainTitle:
    'KEWAJIBAN MENYUSUN LAPORAN KEUANGAN, KEWAJIBAN PERPAJAKAN, DAN KEWAJIBAN KETENAGAKERJAAN',
  section1Title: 'Dasar Hukum Kewajiban Menyusun Laporan Keuangan:',
  section1Items: [
    {
      title: 'Undang-Undang Tentang Perseroan Terbatas',
      bullets: [
        'Pasal 66, mengenai kewajiban menyusun laporan tahunan (didalamnya harus memuat laporan keuangan).',
      ],
    },
    {
      title: 'Undang-Undang Tentang Ketentuan Umum dan Tata Cara Perpajakan',
      bullets: [
        'Pasal 28, mengenai kewajiban pembukuan/menyusun laporan keuangan dalam rangka menjalankan kewajiban perpajakan.',
        'Pasal 4, mengenai kewajiban melampirkan laporan keuangan dalam menyampaikan Surat Pemberitahuan Tahunan.',
      ],
    },
    {
      title:
        'Peraturan Pemerintah Tentang Modal Dasar Perseroan Serta Pendaftaran Pendirian, Perubahan, dan Pembubaran Perseroan yang Memenuhi Kriteria Untuk Usaha Mikro dan Kecil.',
      bullets: [
        'Pasal 10, mengenai kewajiban membuat laporan keuangan dan menyampaikan kepada menteri paling lambat 6 bulan setelah akhir periode akuntansi berjalan.',
      ],
    },
  ],
  section1Sanction:
    'Pelanggaran terhadap ketentuan tersebut dapat berupa sanksi administrasi, denda, pencabutan status badan hukum, sampai dengan sanksi pidana.',

  section2Title: 'Dasar Hukum Kewajiban Perpajakan',
  section2Items: [
    {
      title: 'Undang-Undang Tentang Pajak Penghasilan',
      bullets: [
        'Pasal 4 ayat (2), 15, 21, 22, 23, 26, dll, mengenai kewajiban melakukan pemotongan, penyetoran, dan pelaporan pajak penghasilan.',
      ],
    },
    {
      title: 'Undang-Undang Tentang Pajak Pertambahan Nilai',
      bullets: [
        'Pasal 3, mengenai kewajiban melaporkan usaha dan kewajiban memungut, menyetor, dan melaporkan pajak pertambahan nilai.',
      ],
    },
    {
      title: 'Undang-Undang Tentang Ketentuan Umum dan Tata Cara Perpajakan',
      bullets: [
        'Pasal 12, mengenai kewajiban membayar pajak dengan tidak menggantungkan adanya Surat Ketetapan Pajak.',
        'Pasal 3, mengenai kewajiban menyampaikan surat pemberitahuan dengan benar, lengkap, jelas, dan menandatanganinya.',
        'Pasal 39, mengenai sanksi pidana perpajakan.',
      ],
    },
  ],
  section2Sanction:
    'Pelanggaran terhadap ketentuan perpajakan dapat berupa sanksi administrasi berupa denda, bunga hingga 24 bulan, sampai dengan sanksi pidana perpajakan.',

  section3Title: 'Dasar Hukum Kewajiban Ketenagakerjaan',
  section3Items: [
    {
      title: 'Undang-Undang Tentang Pelindungan Ketenagakerjaan',
      bullets: [
        'Pasal 137 dan Pasal 144, mengenai kewajiban membayar upah paling rendah sebesar upah minimum yang ditetapkan gubernur, serta ketentuan upah bagi usaha mikro dan kecil.',
        'Pasal 92, mengenai kewajiban membayar upah dan memberikan jaminan sosial kepada pekerja yang sedang dalam masa percobaan.',
        'Pasal 287 sampai dengan Pasal 290, mengenai sanksi pidana atas pelanggaran kewajiban pengupahan dan jaminan sosial.',
      ],
    },
    {
      title: 'Undang-Undang Tentang Badan Penyelenggara Jaminan Sosial',
      bullets: [
        'Pasal 15, mengenai kewajiban mendaftarkan diri dan seluruh pekerjanya sebagai peserta BPJS Kesehatan dan BPJS Ketenagakerjaan.',
        'Pasal 19, mengenai kewajiban memungut iuran yang menjadi beban pekerja dan menyetorkannya bersama iuran pemberi kerja.',
      ],
    },
    {
      title: 'Peraturan Pemerintah Tentang Pengupahan',
      bullets: [
        'Pasal 21, mengenai kewajiban menyusun struktur dan skala upah.',
        'Pasal 61, mengenai denda atas keterlambatan pembayaran upah.',
      ],
    },
    {
      title:
        'Peraturan Menteri Ketenagakerjaan Tentang Tunjangan Hari Raya Keagamaan bagi Pekerja/Buruh di Perusahaan',
      bullets: [
        'Pasal 2 dan Pasal 5, mengenai kewajiban membayar THR kepada pekerja dengan masa kerja 1 bulan atau lebih, paling lambat 7 hari sebelum hari raya keagamaan.',
      ],
    },
  ],
  section3Sanction:
    'Pelanggaran terhadap ketentuan ketenagakerjaan dapat berupa sanksi administrasi, denda, penghentian sementara kegiatan usaha, tidak mendapat pelayanan publik tertentu, sampai dengan sanksi pidana.',

  aboutTitle: 'TENTANG ND TAX AND LAW',
  aboutPara:
    'ND Tax and Law adalah kantor konsultan perpajakan dan hukum dengan pengalaman lebih dari 15 tahun dan telah mendampingi lebih dari 100 wajib pajak dan pelaku usaha. Legalitas kami berdasarkan SK Kemenkumham AHU-0068631-AH.01.14, dan kami memiliki Izin praktik konsultan Pajak dan Advokat yang telah terdaftar resmi.',
  servicesTitle: 'Layanan Yang Dapat Kami Berikan',
  servicesIntro:
    'Kami menyediakan empat layanan bulanan yang masing-masing tersedia hanya mulai 999 Ribu per bulan:',
  servicesItems: [
    {
      lead: 'Jasa Perpajakan:',
      body: 'analisis aspek pajak atas transaksi, penghitungan PPh 21/26, PPh 23, dan PPh 4 ayat (2), pembuatan bukti potong, faktur pajak, dan kode billing, pelaporan SPT Masa PPh 21/26, PPh Unifikasi, dan PPN, serta kertas kerja ekualisasi.',
    },
    {
      lead: 'Jasa Akuntansi:',
      body: 'analisis dan dokumentasi transaksi, input jurnal, membuat buku besar, serta penyusunan laporan posisi keuangan, laba rugi, dan perubahan ekuitas setiap bulan.',
    },
    {
      lead: 'Jasa Keuangan:',
      body: 'administrasi penagihan dan invoice, pembayaran supplier, gaji, dan operasional, rekap kas dan bank, pengelolaan utang-piutang, serta laporan realisasi anggaran.',
    },
    {
      lead: 'Jasa Legal:',
      body: 'melakukan review dokumen bisnis, membuat dokumen kontrak/perjanjian, membuat opini hukum, melakukan somasi, memberi tanggapan somasi, investigasi kecurangan, perizinan, dan lain sebagainya.',
    },
  ],
  servicesCaseNote:
    'Untuk kasus tertentu seperti SP2DK, pemeriksaan, keberatan, dan banding/gugatan di pengadilan, tersedia jasa konsultan per kasus. Besaran biaya setiap layanan ditentukan berdasarkan kompleksitas dan risiko kasusnya.',
  comparisonTitle: 'Bahan Pertimbangan: Staf Internal dan Konsultan',
  comparisonIntro: 'Bapak/Ibu dapat membandingkan kedua pilihan berikut ini.',
  comparisonHeaders: ['Komponen', 'Staf Internal', 'Konsultan Kami'],
  comparisonRows: [
    { component: 'Biaya bulanan', internalStaff: 'Gaji, mulai Rp3–6 juta', consultant: 'Mulai 999 Ribu' },
    { component: 'THR', internalStaff: '1 kali gaji per tahun', consultant: 'Tidak ada' },
    { component: 'BPJS Kes & BPJSTK', internalStaff: 'Ditanggung perusahaan', consultant: 'Tidak ada' },
    { component: 'Pesangon atau kompensasi', internalStaff: 'Ada saat hubungan kerja berakhir', consultant: 'Tidak ada' },
    { component: 'Fasilitas kerja', internalStaff: 'Ruang, perangkat, dan aplikasi', consultant: 'Tidak perlu disediakan' },
    { component: 'Pembaruan peraturan', internalStaff: 'Perlu pelatihan berkala', consultant: 'Sudah Kompeten' },
  ],
  comparisonClosing:
    'Layanan kami dapat dipakai sebagai alternatif, atau sebagai pendamping staf internal yang sudah ada pada perusahaan untuk memastikan kepatuhannya.',

  consultTitle: 'Konsultasi Awal Tanpa Biaya',
  consultPara:
    'Kami membuka kesempatan konsultasi awal tanpa biaya untuk membahas kondisi dan kebutuhan perusahaan. Bapak/Ibu dapat menghubungi kami melalui WhatsApp 082180744977, email business@ndtaxandlaw.com, atau mitra strategis resmi kami. Untuk profil perusahaan dan informasi lebih lanjut tersedia di www.ndtaxandlaw.com.',
  mitraBoxTitle: 'Mitra Strategis',
  mitraBoxNameLabel: 'Nama',
  mitraBoxNameValue: '{{NAMA_MITRA}}',
  mitraBoxIdLabel: 'No. ID',
  mitraBoxIdValue: '{{ID_MITRA}}',
  mitraBoxPhoneLabel: 'Whatsapp',
  mitraBoxPhoneValue: '{{WA_MITRA}}',
  mitraBoxEmailLabel: 'Email',
  mitraBoxEmailValue: '{{EMAIL_MITRA}}',
  closingPara: 'Demikian surat ini kami sampaikan. Atas perhatiannya, kami ucapkan terima kasih.',
  directorSignHeading: 'Mengetahui,',
  directorFirmLabel: 'ND TAX AND LAW',
  directorName: 'Nurtiyas, S.E., M.Ak, BKP',
  directorTitle: 'Direktur Utama',
  mitraSignHeading: 'Hormat Kami,',
  mitraSignerLabel: 'MITRA RESMI',
  mitraSignerName: '{{NAMA_MITRA}}',
  mitraRoleLabel: 'Mitra Strategis',
  footerLeftTitle: 'ND TAX AND LAW',
  footerLeftLines: [
    'KBIG OFFICE – Jl. Sawo Raya, Lampung',
    'Telepon: 021-86941220 / 0821-8074-4977',
    'Email: lampung@ndtaxandlaw.com',
    'Website: www.ndtaxandlaw.com',
  ],
  footerRightTitle: 'ND TAX AND LAW',
  footerRightLines: [
    'Menara 165 Lantai 4, Jakarta Selatan',
    'Telepon: 021-86941220 / 0821-8074-4977',
    'Email: jakarta@ndtaxandlaw.com',
    'Website: www.ndtaxandlaw.com',
  ],
  marginTopMm: 40,
  marginBottomMm: 40,
  marginLeftMm: 30,
  marginRightMm: 30,
  paddingTopMm: 0,
  paddingBottomMm: 0,
  paddingLeftMm: 0,
  paddingRightMm: 0,
};

export function resolveProspectLetterContent(
  letterCustom?: Partial<ProspectLetterContent> | null,
  masterTemplate?: Partial<ProspectLetterContent> | null
): ProspectLetterContent {
  const mergeOne = (
    base: ProspectLetterContent,
    override?: Partial<ProspectLetterContent> | null
  ): ProspectLetterContent => {
    if (!override || typeof override !== 'object') return base;
    const str = (v: unknown, fb: string) =>
      typeof v === 'string' && v.trim().length > 0 ? v : fb;
    const lawList = (v: unknown, fb: ProspectLetterLawItem[]): ProspectLetterLawItem[] =>
      Array.isArray(v) && v.length > 0
        ? v
            .filter((item) => item && typeof item === 'object')
            .map((item: any) => ({
              title: String(item.title || '').trim(),
              bullets: Array.isArray(item.bullets)
                ? item.bullets.map((b: any) => String(b || '').trim()).filter(Boolean)
                : [],
            }))
            .filter((item) => item.title.length > 0)
        : fb;
    const serviceList = (v: unknown, fb: ProspectLetterServiceItem[]): ProspectLetterServiceItem[] =>
      Array.isArray(v) && v.length > 0
        ? v
            .filter((item) => item && typeof item === 'object')
            .map((item: any) => ({
              lead: String(item.lead || '').trim(),
              body: String(item.body || '').trim(),
            }))
            .filter((item) => item.lead.length > 0 || item.body.length > 0)
        : fb;
    const compRows = (v: unknown, fb: ProspectLetterComparisonRow[]): ProspectLetterComparisonRow[] =>
      Array.isArray(v) && v.length > 0
        ? v
            .filter((item) => item && typeof item === 'object')
            .map((item: any) => ({
              component: String(item.component || '').trim(),
              internalStaff: String(item.internalStaff || '').trim(),
              consultant: String(item.consultant || '').trim(),
            }))
            .filter((item) => item.component.length > 0)
        : fb;
    const strLines = (v: unknown, fb: string[]): string[] =>
      Array.isArray(v) && v.length > 0
        ? v.map((line) => String(line || '').trim()).filter(Boolean)
        : fb;
    const headers: [string, string, string] =
      Array.isArray(override.comparisonHeaders) && override.comparisonHeaders.length === 3
        ? [
            str(override.comparisonHeaders[0], base.comparisonHeaders[0]),
            str(override.comparisonHeaders[1], base.comparisonHeaders[1]),
            str(override.comparisonHeaders[2], base.comparisonHeaders[2]),
          ]
        : base.comparisonHeaders;

    const resolvedCity = str(override.city, base.city);
    const hasCustomDateLine = typeof override.dateLine === 'string' && override.dateLine.trim().length > 0;
    const hasCustomCityOnly =
      !hasCustomDateLine && typeof override.city === 'string' && override.city.trim().length > 0;
    const resolvedDateLine = hasCustomDateLine
      ? (override.dateLine as string)
      : hasCustomCityOnly
      ? `${resolvedCity}, {{TANGGAL_SURAT}}`
      : base.dateLine;

    return {
      city: resolvedCity,
      dateLine: resolvedDateLine,
      metaNomorLabel: str(override.metaNomorLabel, base.metaNomorLabel),
      nomorValue: str(override.nomorValue, base.nomorValue),
      metaSifatLabel: str(override.metaSifatLabel, base.metaSifatLabel),
      sifat: str(override.sifat, base.sifat),
      metaLampiranLabel: str(override.metaLampiranLabel, base.metaLampiranLabel),
      lampiran: str(override.lampiran, base.lampiran),
      metaPerihalLabel: str(override.metaPerihalLabel, base.metaPerihalLabel),
      perihal: str(override.perihal, base.perihal),
      recipientBlock: str(override.recipientBlock, base.recipientBlock),
      greeting: str(override.greeting, base.greeting),
      introPara1: str(override.introPara1, base.introPara1),
      introPara2: str(override.introPara2, base.introPara2),
      sectionMainTitle: str(override.sectionMainTitle, base.sectionMainTitle),
      section1Title: str(override.section1Title, base.section1Title),
      section1Items: lawList(override.section1Items, base.section1Items),
      section1Sanction: str(override.section1Sanction, base.section1Sanction),

      section2Title: str(override.section2Title, base.section2Title),
      section2Items: lawList(override.section2Items, base.section2Items),
      section2Sanction: str(override.section2Sanction, base.section2Sanction),
      section3Title: str(override.section3Title, base.section3Title),
      section3Items: lawList(override.section3Items, base.section3Items),
      section3Sanction: str(override.section3Sanction, base.section3Sanction),

      aboutTitle: str(override.aboutTitle, base.aboutTitle),
      aboutPara: str(override.aboutPara, base.aboutPara),
      servicesTitle: str(override.servicesTitle, base.servicesTitle),
      servicesIntro: str(override.servicesIntro, base.servicesIntro),
      servicesItems: serviceList(override.servicesItems, base.servicesItems),
      servicesCaseNote: str(override.servicesCaseNote, base.servicesCaseNote),
      comparisonTitle: str(override.comparisonTitle, base.comparisonTitle),
      comparisonIntro: str(override.comparisonIntro, base.comparisonIntro),
      comparisonHeaders: headers,
      comparisonRows: compRows(override.comparisonRows, base.comparisonRows),
      comparisonClosing: str(override.comparisonClosing, base.comparisonClosing),

      consultTitle: str(override.consultTitle, base.consultTitle),
      consultPara: str(override.consultPara, base.consultPara),
      mitraBoxTitle: str(override.mitraBoxTitle, base.mitraBoxTitle),
      mitraBoxNameLabel: str(override.mitraBoxNameLabel, base.mitraBoxNameLabel),
      mitraBoxNameValue: str(override.mitraBoxNameValue, base.mitraBoxNameValue),
      mitraBoxIdLabel: str(override.mitraBoxIdLabel, base.mitraBoxIdLabel),
      mitraBoxIdValue: str(override.mitraBoxIdValue, base.mitraBoxIdValue),
      mitraBoxPhoneLabel: str(override.mitraBoxPhoneLabel, base.mitraBoxPhoneLabel),
      mitraBoxPhoneValue: str(override.mitraBoxPhoneValue, base.mitraBoxPhoneValue),
      mitraBoxEmailLabel: str(override.mitraBoxEmailLabel, base.mitraBoxEmailLabel),
      mitraBoxEmailValue: str(override.mitraBoxEmailValue, base.mitraBoxEmailValue),
      closingPara: str(override.closingPara, base.closingPara),
      directorSignHeading: str(override.directorSignHeading, base.directorSignHeading),
      directorFirmLabel: str(override.directorFirmLabel, base.directorFirmLabel),
      directorName: str(override.directorName, base.directorName),
      directorTitle: str(override.directorTitle, base.directorTitle),
      mitraSignHeading: str(override.mitraSignHeading, base.mitraSignHeading),
      mitraSignerLabel: str(override.mitraSignerLabel, base.mitraSignerLabel),
      mitraSignerName: str(override.mitraSignerName, base.mitraSignerName),
      mitraRoleLabel: str(override.mitraRoleLabel, base.mitraRoleLabel),
      footerLeftTitle: str(override.footerLeftTitle, base.footerLeftTitle),
      footerLeftLines: strLines(override.footerLeftLines, base.footerLeftLines),
      footerRightTitle: str(override.footerRightTitle, base.footerRightTitle),
      footerRightLines: strLines(override.footerRightLines, base.footerRightLines),
      marginTopMm: (() => {
        const n = Number(override.marginTopMm);
        return Number.isFinite(n) ? Math.min(70, Math.max(15, Math.round(n * 10) / 10)) : base.marginTopMm;
      })(),
      marginBottomMm: (() => {
        const n = Number(override.marginBottomMm);
        return Number.isFinite(n) ? Math.min(70, Math.max(15, Math.round(n * 10) / 10)) : base.marginBottomMm;
      })(),
      marginLeftMm: (() => {
        const n = Number(override.marginLeftMm);
        return Number.isFinite(n) ? Math.min(55, Math.max(10, Math.round(n * 10) / 10)) : base.marginLeftMm;
      })(),
      marginRightMm: (() => {
        const n = Number(override.marginRightMm);
        return Number.isFinite(n) ? Math.min(55, Math.max(10, Math.round(n * 10) / 10)) : base.marginRightMm;
      })(),
      paddingTopMm: (() => {
        const n = Number(override.paddingTopMm);
        return Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 10) / 10)) : base.paddingTopMm;
      })(),
      paddingBottomMm: (() => {
        const n = Number(override.paddingBottomMm);
        return Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 10) / 10)) : base.paddingBottomMm;
      })(),
      paddingLeftMm: (() => {
        const n = Number(override.paddingLeftMm);
        return Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 10) / 10)) : base.paddingLeftMm;
      })(),
      paddingRightMm: (() => {
        const n = Number(override.paddingRightMm);
        return Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 10) / 10)) : base.paddingRightMm;
      })(),
    };
  };

  const withMaster = mergeOne(DEFAULT_PROSPECT_LETTER_CONTENT, masterTemplate);
  return mergeOne(withMaster, letterCustom);
}

export interface ProspectLetter {
  id: string;
  letterNumber: string;
  sequenceNumber: number;
  verificationCode: string;
  letterDate: string; // YYYY-MM-DD
  companyName: string;
  businessField?: string;
  companyAddress: string;
  addressParts?: ProspectAddressParts;
  customContent?: Partial<ProspectLetterContent>;
  mitraId: string;
  mitraName: string;
  mitraMemberCode: string;
  mitraPhone: string;
  mitraEmail: string;
  directorName: string;
  directorTitle: string;
  createdByRole: 'mitra' | 'admin' | 'staff';
  createdByName: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProspectMitraSummaryRow {
  mitraId: string;
  mitraName: string;
  memberCode: string;
  referralCode: string;
  phone: string;
  email: string;
  avatarUrl: string;
  gender?: 'male' | 'female';
  status: 'verified' | 'pending' | 'rejected';
  totalLetters: number;
  latestLetterDate: string | null;
  latestCompanyName: string | null;
  recentCompanies: string[];
}




