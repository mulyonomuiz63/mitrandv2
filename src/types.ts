export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
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
  { id: 'spec-1', label: 'Konsultan Perpajakan & Tax Planning', isActive: true },
  { id: 'spec-2', label: 'Hukum Korporasi & Bisnis', isActive: true },
  { id: 'spec-3', label: 'Akuntansi & Pembukuan Korporat', isActive: true },
  { id: 'spec-4', label: 'Legalitas & Perizinan OSS-RBA', isActive: true },
  { id: 'spec-5', label: 'Kuasa Hukum Pengadilan Pajak', isActive: true },
  { id: 'spec-6', label: 'Business Partner / Referral Umum', isActive: true },
];

export const DEFAULT_MITRA_FORM_FIELDS: DynamicFormField[] = [
  {
    id: 'mitra-def-fullName',
    systemKey: 'fullName',
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
    isDefault: true,
    label: 'Nama Bank Pencairan Komisi',
    type: 'select',
    options: [
      'Bank Central Asia (BCA)',
      'Bank Mandiri',
      'Bank Rakyat Indonesia (BRI)',
      'Bank Negara Indonesia (BNI)',
      'Bank Syariah Indonesia (BSI)',
      'CIMB Niaga',
    ],
    required: true,
    isActive: true,
  },
  {
    id: 'mitra-def-accountNumber',
    systemKey: 'accountNumber',
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

export interface SalesHistoryMonth {
  month: string;
  totalSales: number;
  totalCommission: number;
  mitraCount: number;
  dealsClosed: number;
}

export type UserRoleCode = 'admin' | 'mitra' | string;

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
  role: 'admin' | 'mitra';
  roleCode?: UserRoleCode;
  roleName?: string;
  portalView?: 'admin' | 'mitra';
  defaultTab?: string;
  allowedTabs?: string[];
  permissions?: string[];
  mitraId?: string;
  referralCode?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
}

export function resolveMitraFormFields(settings?: AppSettings | null): DynamicFormField[] {
  const existing = Array.isArray(settings?.mitraCustomFields) ? settings!.mitraCustomFields! : [];
  const specLabel = settings?.specializationLabel || DEFAULT_SPECIALIZATION_LABEL;
  const specEnabled = settings?.specializationEnabled !== false;

  if (settings?.mitraFieldsInitialized) {
    return existing.map((f) => {
      if (f.systemKey === 'specialization') {
        return {
          ...f,
          label: f.label || specLabel,
          isActive: settings.specializationEnabled !== undefined ? specEnabled : f.isActive,
        };
      }
      return f;
    });
  }

  // Merge default fields with any existing custom fields (when not initialized yet)
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return existing;
  }

  const defaults = DEFAULT_MITRA_FORM_FIELDS.map((df) => {
    if (df.systemKey === 'specialization') {
      return { ...df, label: specLabel, isActive: specEnabled };
    }
    return { ...df };
  });
  return [...defaults, ...existing];
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
        if (!m.customFields) return false;
        const byLabel = m.customFields[field.label];
        const byId = m.customFields[field.id];
        return Boolean((byLabel && String(byLabel).trim() !== '') || (byId && String(byId).trim() !== ''));
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

