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
