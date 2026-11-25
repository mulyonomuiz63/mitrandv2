import mysql, { Pool, PoolOptions, RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// MYSQL CONFIGURATION & CONNECTION POOL (MYSQL 5.7+, MYSQL 8.0+, MARIADB 10.2+)
// ============================================================================

export interface MysqlConfigInfo {
  isConfigured: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
  ssl: boolean;
  hasPassword: boolean;
  connectionLabel: string;
}

export const getMysqlConfig = (): MysqlConfigInfo => {
  const host = (process.env.MYSQL_HOST || process.env.DB_HOST || '').trim();
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306) || 3306;
  const user = (process.env.MYSQL_USER || process.env.DB_USER || '').trim();
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const database = (process.env.MYSQL_DATABASE || process.env.DB_NAME || '').trim();
  const sslRaw = (process.env.MYSQL_SSL || process.env.DB_SSL || '').trim().toLowerCase();
  const ssl = sslRaw === 'true' || sslRaw === '1' || sslRaw === 'required';

  const isConfigured = Boolean(host && user && database);
  return {
    isConfigured,
    host,
    port,
    user,
    database,
    ssl,
    hasPassword: Boolean(password),
    connectionLabel: isConfigured ? `mysql://${user}@${host}:${port}/${database}` : '',
  };
};

export const isMysqlConfigured = (): boolean => getMysqlConfig().isConfigured;

let _pool: Pool | null = null;
let _poolSignature = '';

export const getMysqlPool = (): Pool | null => {
  const cfg = getMysqlConfig();
  if (!cfg.isConfigured) return null;

  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const sig = `${cfg.host}|${cfg.port}|${cfg.user}|${cfg.database}|${cfg.ssl}|${password.length}`;
  if (_pool && _poolSignature === sig) {
    return _pool;
  }

  if (_pool) {
    _pool.end().catch(() => {});
    _pool = null;
  }

  const options: PoolOptions = {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10) || 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: true,
    supportBigNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 15000,
    ...(cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  };

  _pool = mysql.createPool(options);
  _poolSignature = sig;
  return _pool;
};

// ============================================================================
// TABLE & COLUMN REGISTRY (14 TABLES — 100% COMPATIBLE WITH MYSQL & MARIADB)
// ============================================================================

export interface ColumnDef {
  name: string;
  sqlType: string;
  kind?: 'string' | 'number' | 'boolean' | 'json';
}

export interface TableDef {
  table: string;
  label: string;
  primaryKey: string;
  columns: ColumnDef[];
  indexes?: string[];
}

export const TABLE_DEFINITIONS: TableDef[] = [
  {
    table: 'mitras',
    label: 'Data Mitra Konsultan',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'memberCode', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'referralCode', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'fullName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'email', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'phone', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'nik', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'ktpFileUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'ktpFileName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'specialization', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'status', sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: 'string' },
      { name: 'avatarUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'gender', sqlType: 'VARCHAR(32) NULL', kind: 'string' },
      { name: 'joinedDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'bankDetails', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'totalCommission', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'totalBonus', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'pendingPayout', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'paidPayout', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'referredClientsCount', sqlType: 'INT NULL DEFAULT 0', kind: 'number' },
      { name: 'activeSubscribersCount', sqlType: 'INT NULL DEFAULT 0', kind: 'number' },
      { name: 'emailVerified', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'verificationToken', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'verificationTokenExpiry', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'rejectionReason', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'rejectedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'isActive', sqlType: 'TINYINT(1) NULL DEFAULT 1', kind: 'boolean' },
      { name: 'deactivatedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'deactivatedBy', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'deactivatedReason', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'customFields', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_mitras_email` (`email`)', 'INDEX `idx_mitras_nik` (`nik`)'],
  },
  {
    table: 'services',
    label: 'Katalog Layanan Firma',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'name', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'category', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'defaultPrice', sqlType: 'DECIMAL(18,2) NOT NULL DEFAULT 0', kind: 'number' },
      { name: 'pricingType', sqlType: "VARCHAR(64) NULL DEFAULT 'case_by_case'", kind: 'string' },
      { name: 'commissionRate', sqlType: 'DECIMAL(8,2) NULL DEFAULT 15', kind: 'number' },
      { name: 'description', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'isActive', sqlType: 'TINYINT(1) NULL DEFAULT 1', kind: 'boolean' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'client_deals',
    label: 'Deal Klien & Langganan',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'mitraId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'mitraName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'referralCode', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'companyName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'picName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'picPhone', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'picEmail', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'serviceId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'serviceName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'pricingType', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'dealValue', sqlType: 'DECIMAL(18,2) NOT NULL DEFAULT 0', kind: 'number' },
      { name: 'commissionAmount', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'appliedCommissionRate', sqlType: 'DECIMAL(8,2) NULL', kind: 'number' },
      { name: 'lockedRecurringRate', sqlType: 'DECIMAL(8,2) NULL', kind: 'number' },
      { name: 'recurringCommissionAmount', sqlType: 'DECIMAL(18,2) NULL', kind: 'number' },
      { name: 'status', sqlType: "VARCHAR(64) NULL DEFAULT 'pending_acc'", kind: 'string' },
      { name: 'date', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'recurringPaidMonths', sqlType: 'INT NULL', kind: 'number' },
      { name: 'recurringPaidYears', sqlType: 'INT NULL', kind: 'number' },
      { name: 'periodStart', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'periodEnd', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'durationMonths', sqlType: 'INT NULL', kind: 'number' },
      { name: 'paymentTermType', sqlType: "VARCHAR(64) NULL DEFAULT 'one_time'", kind: 'string' },
      { name: 'notes', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'submittedBy', sqlType: "VARCHAR(64) NULL DEFAULT 'mitra'", kind: 'string' },
      { name: 'subscriptionStartDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'billingDayOfMonth', sqlType: 'INT NULL', kind: 'number' },
      { name: 'nextBillingDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'lastBilledDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'isBillingDue', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'terminatedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'terminationReason', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'rejectedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'rejectionReason', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'customFields', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_client_deals_mitra` (`mitraId`)', 'INDEX `idx_client_deals_status` (`status`)'],
  },
  {
    table: 'commissions',
    label: 'Transaksi Komisi & Bonus',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'mitraId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'mitraName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'serviceName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'clientName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'dealValue', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'commissionAmount', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'bonusAmount', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'status', sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: 'string' },
      { name: 'date', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_commissions_mitra` (`mitraId`)'],
  },
  {
    table: 'payout_requests',
    label: 'Pengajuan Pencairan Komisi',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'mitraId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'mitraName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'memberCode', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'amount', sqlType: 'DECIMAL(18,2) NOT NULL DEFAULT 0', kind: 'number' },
      { name: 'bankDetails', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'requestDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'processedDate', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'status', sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: 'string' },
      { name: 'pph21Deduction', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'pph21Rate', sqlType: 'DECIMAL(8,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'adminFeeDeduction', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'netAmountTransferred', sqlType: 'DECIMAL(18,2) NULL DEFAULT 0', kind: 'number' },
      { name: 'proofFileUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'proofFileName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'transferRefNumber', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'disbursedBy', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'notes', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_payouts_mitra` (`mitraId`)'],
  },
  {
    table: 'marketing_tools',
    label: 'Materi Promosi & Pelatihan',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'title', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'category', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'fileType', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'fileSize', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'downloadUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'thumbnailUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'description', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'createdAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'updatedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'targetProduct', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'duration', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'notifications',
    label: 'Notifikasi Sistem',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'title', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'message', sqlType: 'TEXT NOT NULL', kind: 'string' },
      { name: 'type', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'timestamp', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'isRead', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'targetAudience', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'mitraId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_notifications_ts` (`timestamp`)'],
  },
  {
    table: 'app_settings',
    label: 'Pengaturan Aplikasi & SMTP',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY DEFAULT 'config_primary'", kind: 'string' },
      { name: 'settings', sqlType: 'LONGTEXT NOT NULL', kind: 'json' },
      { name: 'updated_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'user_passwords',
    label: 'Kredensial Terenkripsi & System KV',
    primaryKey: 'email',
    columns: [
      { name: 'email', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'password', sqlType: 'LONGTEXT NOT NULL', kind: 'string' },
      { name: 'updated_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'system_roles',
    label: 'Manajemen Role Dinamis',
    primaryKey: 'code',
    columns: [
      { name: 'code', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'name', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'description', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'portalView', sqlType: "VARCHAR(64) NULL DEFAULT 'mitra'", kind: 'string' },
      { name: 'defaultTab', sqlType: "VARCHAR(64) NULL DEFAULT 'idcard'", kind: 'string' },
      { name: 'allowedTabs', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'permissions', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'isSystem', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'isActive', sqlType: 'TINYINT(1) NULL DEFAULT 1', kind: 'boolean' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'activity_logs',
    label: 'Log Aktivitas Audit',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'timestamp', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'actorRole', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'actorId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'actorName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'actorEmail', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'actionType', sqlType: 'VARCHAR(128) NOT NULL', kind: 'string' },
      { name: 'operation', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'targetEntity', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'targetId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'description', sqlType: 'TEXT NOT NULL', kind: 'string' },
      { name: 'metadata', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_activity_logs_ts` (`timestamp`)'],
  },
  {
    table: 'email_logs',
    label: 'Log Pengiriman Email SMTP',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'recipient', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'recipientName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'subject', sqlType: 'VARCHAR(500) NOT NULL', kind: 'string' },
      { name: 'category', sqlType: 'VARCHAR(128) NOT NULL', kind: 'string' },
      { name: 'status', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'smtpResponse', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'timestamp', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'sentAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'previewSnippet', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'errorMessage', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'smtpHostUsed', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_email_logs_ts` (`timestamp`)'],
  },
  {
    table: 'chat_rooms',
    label: 'Ruang Chat Personal & Grup',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'type', sqlType: "VARCHAR(32) NOT NULL DEFAULT 'direct'", kind: 'string' },
      { name: 'name', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'description', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'avatarUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'participantIds', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'createdBy', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'createdByName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'createdAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'updatedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'lastMessageText', sqlType: 'TEXT NULL', kind: 'string' },
      { name: 'lastMessageAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'lastMessageSenderId', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'lastMessageSenderName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
  },
  {
    table: 'chat_messages',
    label: 'Riwayat Pesan, Pin & Reaksi Chat',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'roomId', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'senderId', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'senderName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'senderRole', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'senderAvatar', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'text', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'imageUrl', sqlType: 'LONGTEXT NULL', kind: 'string' },
      { name: 'imageName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'imageOriginalSize', sqlType: 'BIGINT NULL', kind: 'number' },
      { name: 'imageCompressedSize', sqlType: 'BIGINT NULL', kind: 'number' },
      { name: 'linkPreview', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'replyTo', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'forwardedFrom', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'reactions', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'createdAt', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'editedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'isDeleted', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'deletedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'isSystemMessage', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'isPinned', sqlType: 'TINYINT(1) NULL DEFAULT 0', kind: 'boolean' },
      { name: 'pinnedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'pinnedBy', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'pinnedByName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: ['INDEX `idx_chat_messages_room` (`roomId`)', 'INDEX `idx_chat_messages_created` (`createdAt`)'],
  },
  {
    table: 'prospect_letters',
    label: 'Surat Penawaran Prospek Mitra',
    primaryKey: 'id',
    columns: [
      { name: 'id', sqlType: 'VARCHAR(191) NOT NULL PRIMARY KEY', kind: 'string' },
      { name: 'letterNumber', sqlType: 'VARCHAR(128) NOT NULL', kind: 'string' },
      { name: 'sequenceNumber', sqlType: 'INT NOT NULL DEFAULT 1', kind: 'number' },
      { name: 'verificationCode', sqlType: 'VARCHAR(128) NOT NULL', kind: 'string' },
      { name: 'letterDate', sqlType: 'VARCHAR(32) NOT NULL', kind: 'string' },
      { name: 'companyName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'companyAddress', sqlType: 'TEXT NOT NULL', kind: 'string' },
      { name: 'addressParts', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'customContent', sqlType: 'LONGTEXT NULL', kind: 'json' },
      { name: 'mitraId', sqlType: 'VARCHAR(191) NOT NULL', kind: 'string' },
      { name: 'mitraName', sqlType: 'VARCHAR(255) NOT NULL', kind: 'string' },
      { name: 'mitraMemberCode', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'mitraPhone', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'mitraEmail', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'directorName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'directorTitle', sqlType: 'VARCHAR(128) NULL', kind: 'string' },
      { name: 'createdByRole', sqlType: "VARCHAR(32) NOT NULL DEFAULT 'mitra'", kind: 'string' },
      { name: 'createdByName', sqlType: 'VARCHAR(255) NULL', kind: 'string' },
      { name: 'createdById', sqlType: 'VARCHAR(191) NULL', kind: 'string' },
      { name: 'createdAt', sqlType: 'VARCHAR(64) NOT NULL', kind: 'string' },
      { name: 'updatedAt', sqlType: 'VARCHAR(64) NULL', kind: 'string' },
      { name: 'created_at', sqlType: 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', kind: 'string' },
    ],
    indexes: [
      'INDEX `idx_prospect_letters_mitra` (`mitraId`)',
      'INDEX `idx_prospect_letters_vcode` (`verificationCode`)',
      'INDEX `idx_prospect_letters_created` (`createdAt`)',
    ],
  },
];

const TABLE_DEF_MAP = new Map<string, TableDef>(TABLE_DEFINITIONS.map((t) => [t.table, t]));

export const buildCreateTableSql = (def: TableDef): string => {
  const lines = def.columns.map((c) => `  \`${c.name}\` ${c.sqlType}`);
  if (def.indexes && def.indexes.length > 0) {
    lines.push(...def.indexes.map((idx) => `  ${idx}`));
  }
  return `CREATE TABLE IF NOT EXISTS \`${def.table}\` (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
};

export const FULL_MYSQL_SCHEMA_SQL: string = [
  '-- ============================================================================',
  '-- SKEMA DATABASE LENGKAP MYSQL / MARIADB UNTUK NDTAXANDLAW KEMITRAAN (14 TABEL)',
  '-- Kompatibel dengan MySQL 5.7+, MySQL 8.0+, & MariaDB 10.2+ (cPanel / VPS)',
  '-- Aman dijalankan berulang kali (IF NOT EXISTS)',
  '-- ============================================================================',
  '',
  'SET NAMES utf8mb4;',
  'SET FOREIGN_KEY_CHECKS = 0;',
  '',
  ...TABLE_DEFINITIONS.map((def, i) => `-- ${i + 1}. TABEL ${def.table.toUpperCase()} (${def.label})\n${buildCreateTableSql(def)}\n`),
  'SET FOREIGN_KEY_CHECKS = 1;',
].join('\n');

// ============================================================================
// ROW SERIALIZATION / DESERIALIZATION (JSON, BOOLEAN, NUMBER)
// ============================================================================

const serializeValue = (col: ColumnDef, value: any): any => {
  if (value === undefined || value === null) return null;
  if (col.kind === 'json') {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  if (col.kind === 'boolean') {
    return value ? 1 : 0;
  }
  if (col.kind === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};

const deserializeRow = (def: TableDef, raw: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const col of def.columns) {
    if (!(col.name in raw)) continue;
    const val = raw[col.name];
    if (val === null || val === undefined) {
      // Omit null optional columns or keep null cleanly (preserve undefined for optional fields like isActive, isPinned)
      if (col.kind === 'boolean') {
        if (col.name === 'emailVerified' || col.name === 'isRead' || col.name === 'isDeleted' || col.name === 'isBillingDue') {
          out[col.name] = false;
        } else if (col.name === 'isActive') {
          out[col.name] = true;
        }
      } else {
        out[col.name] = undefined;
      }
      continue;
    }

    if (col.kind === 'json') {
      if (typeof val === 'string') {
        try {
          out[col.name] = JSON.parse(val);
        } catch {
          out[col.name] = val;
        }
      } else {
        out[col.name] = val;
      }
    } else if (col.kind === 'boolean') {
      out[col.name] = Boolean(Number(val));
    } else if (col.kind === 'number') {
      const n = Number(val);
      out[col.name] = Number.isNaN(n) ? 0 : n;
    } else if (val instanceof Date) {
      out[col.name] = val.toISOString();
    } else {
      out[col.name] = val;
    }
  }
  return out;
};

// ============================================================================
// SAFE SCHEMA AUTO-INITIALIZER & COLUMN MIGRATOR
// ============================================================================

export interface TableSchemaCheck {
  table: string;
  label: string;
  exists: boolean;
  missingColumns: string[];
  rowCount?: number;
}

export const ensureMysqlSchema = async (): Promise<{
  success: boolean;
  createdTables: string[];
  addedColumns: string[];
  message: string;
}> => {
  const pool = getMysqlPool();
  const cfg = getMysqlConfig();
  if (!pool || !cfg.isConfigured) {
    return {
      success: false,
      createdTables: [],
      addedColumns: [],
      message: 'Kredensial MySQL (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE) belum dikonfigurasi di file .env.',
    };
  }

  const createdTables: string[] = [];
  const addedColumns: string[] = [];

  try {
    const [existingTablesRows] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );
    const existingTables = new Set(existingTablesRows.map((r) => String(r.TABLE_NAME).toLowerCase()));

    for (const def of TABLE_DEFINITIONS) {
      const alreadyExists = existingTables.has(def.table.toLowerCase());
      if (!alreadyExists) {
        await pool.query(buildCreateTableSql(def));
        createdTables.push(def.table);
      } else {
        const [colRows] = await pool.query<RowDataPacket[]>(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [cfg.database, def.table]
        );
        const existingCols = new Set(colRows.map((c) => String(c.COLUMN_NAME).toLowerCase()));

        for (const col of def.columns) {
          if (!existingCols.has(col.name.toLowerCase())) {
            const alterType = col.sqlType.replace(/\bPRIMARY KEY\b/gi, '').replace(/\bNOT NULL\b/gi, 'NULL');
            await pool.query(`ALTER TABLE \`${def.table}\` ADD COLUMN \`${col.name}\` ${alterType}`);
            addedColumns.push(`${def.table}.${col.name}`);
          }
        }
      }
    }

    return {
      success: true,
      createdTables,
      addedColumns,
      message:
        createdTables.length === 0 && addedColumns.length === 0
          ? `Seluruh ${TABLE_DEFINITIONS.length} tabel & kolom MySQL sudah lengkap dan sinkron.`
          : `Skema MySQL berhasil diperbarui (${createdTables.length} tabel baru, ${addedColumns.length} kolom tambahan).`,
    };
  } catch (err: any) {
    return {
      success: false,
      createdTables,
      addedColumns,
      message: `Gagal menginisialisasi skema MySQL: ${err?.message || 'Unknown error'}`,
    };
  }
};

// ============================================================================
// DROP-IN CHAINABLE MYSQL QUERY BUILDER (100% PARAMETERIZED & INJECTION-SAFE)
// ============================================================================

type QueryOp = 'select' | 'insert' | 'upsert' | 'update' | 'delete';
interface WhereClause {
  column: string;
  op: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN';
  value: any;
}

export interface DbQueryResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

class MysqlTableQueryBuilder implements PromiseLike<DbQueryResult<any>> {
  private tableDef: TableDef;
  private colMap: Map<string, ColumnDef>;
  private op: QueryOp = 'select';
  private selectCols = '*';
  private payloadRows: Record<string, any>[] = [];
  private updateObj: Record<string, any> = {};
  private wheres: WhereClause[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(tableName: string) {
    const def = TABLE_DEF_MAP.get(tableName);
    if (!def) {
      throw new Error(`Tabel MySQL tidak dikenal: ${tableName}`);
    }
    this.tableDef = def;
    this.colMap = new Map(def.columns.map((c) => [c.name, c]));
  }

  select(columns = '*') {
    this.op = 'select';
    this.selectCols = columns;
    return this;
  }

  insert(rows: Record<string, any> | Record<string, any>[]) {
    this.op = 'insert';
    this.payloadRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: Record<string, any> | Record<string, any>[], _options?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payloadRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values: Record<string, any>) {
    this.op = 'update';
    this.updateObj = values || {};
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  private assertColumn(col: string): string {
    if (!this.colMap.has(col)) {
      throw new Error(`Kolom "${col}" tidak terdaftar pada tabel "${this.tableDef.table}"`);
    }
    return col;
  }

  eq(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '=', value });
    return this;
  }

  neq(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '!=', value });
    return this;
  }

  lt(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '<', value });
    return this;
  }

  lte(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '<=', value });
    return this;
  }

  gt(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '>', value });
    return this;
  }

  gte(column: string, value: any) {
    this.wheres.push({ column: this.assertColumn(column), op: '>=', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.wheres.push({ column: this.assertColumn(column), op: 'IN', value: Array.isArray(values) ? values : [] });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = {
      column: this.assertColumn(column),
      ascending: opts?.ascending !== false,
    };
    return this;
  }

  limit(n: number) {
    this.limitCount = Math.max(0, Math.floor(Number(n) || 0));
    return this;
  }

  single() {
    this.singleMode = 'single';
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    this.limitCount = 1;
    return this;
  }

  private buildWhereSql(): { sql: string; params: any[] } {
    if (this.wheres.length === 0) return { sql: '', params: [] };
    const clauses: string[] = [];
    const params: any[] = [];

    for (const w of this.wheres) {
      const colDef = this.colMap.get(w.column)!;
      if (w.op === 'IN') {
        const arr = Array.isArray(w.value) ? w.value : [];
        if (arr.length === 0) {
          clauses.push('1 = 0');
        } else {
          clauses.push(`\`${w.column}\` IN (${arr.map(() => '?').join(', ')})`);
          params.push(...arr.map((v) => serializeValue(colDef, v)));
        }
      } else if (w.value === null) {
        clauses.push(w.op === '=' ? `\`${w.column}\` IS NULL` : `\`${w.column}\` IS NOT NULL`);
      } else {
        clauses.push(`\`${w.column}\` ${w.op} ?`);
        params.push(serializeValue(colDef, w.value));
      }
    }

    return { sql: ` WHERE ${clauses.join(' AND ')}`, params };
  }

  private async execute(): Promise<DbQueryResult<any>> {
    const pool = getMysqlPool();
    if (!pool) {
      return { data: null, error: { message: 'MySQL belum dikonfigurasi di file .env.' } };
    }

    const tbl = `\`${this.tableDef.table}\``;

    try {
      if (this.op === 'select') {
        let colsSql = '*';
        if (this.selectCols && this.selectCols.trim() !== '*') {
          const requested = this.selectCols
            .split(',')
            .map((s) => s.trim().replace(/^["'`]|["'`]$/g, ''))
            .filter((s) => this.colMap.has(s));
          if (requested.length > 0) {
            colsSql = requested.map((c) => `\`${c}\``).join(', ');
          }
        }
        const { sql: whereSql, params } = this.buildWhereSql();
        const orderSql = this.orderBy
          ? ` ORDER BY \`${this.orderBy.column}\` ${this.orderBy.ascending ? 'ASC' : 'DESC'}`
          : '';
        const limitSql = this.limitCount !== null ? ` LIMIT ${this.limitCount}` : '';

        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT ${colsSql} FROM ${tbl}${whereSql}${orderSql}${limitSql}`,
          params
        );
        const mapped = rows.map((r) => deserializeRow(this.tableDef, r));

        if (this.singleMode === 'maybeSingle') {
          return { data: mapped.length > 0 ? mapped[0] : null, error: null };
        }
        if (this.singleMode === 'single') {
          if (mapped.length === 0) {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          }
          return { data: mapped[0], error: null };
        }
        return { data: mapped, error: null };
      }

      if (this.op === 'insert' || this.op === 'upsert') {
        const cleanRows = this.payloadRows.filter((r) => r && typeof r === 'object');
        if (cleanRows.length === 0) {
          return { data: [], error: null };
        }

        // Collect union of valid known columns present across the batch
        const colNamesSet = new Set<string>();
        for (const row of cleanRows) {
          for (const key of Object.keys(row)) {
            if (this.colMap.has(key) && row[key] !== undefined) {
              colNamesSet.add(key);
            }
          }
        }
        const colNames = Array.from(colNamesSet);
        if (colNames.length === 0) {
          return { data: [], error: null };
        }

        // Chunk batches so very large upserts never exceed MySQL max_allowed_packet or placeholder limits
        const CHUNK_SIZE = 50;
        const colsHeader = colNames.map((c) => `\`${c}\``).join(', ');
        const pk = this.tableDef.primaryKey;
        const updateCols = colNames.filter((c) => c !== pk);
        const onDupSql =
          this.op === 'upsert'
            ? updateCols.length > 0
              ? ` ON DUPLICATE KEY UPDATE ${updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')}`
              : ` ON DUPLICATE KEY UPDATE \`${pk}\` = \`${pk}\``
            : '';

        for (let i = 0; i < cleanRows.length; i += CHUNK_SIZE) {
          const chunk = cleanRows.slice(i, i + CHUNK_SIZE);
          const valueGroups: string[] = [];
          const params: any[] = [];

          for (const row of chunk) {
            const placeholders: string[] = [];
            for (const cName of colNames) {
              const colDef = this.colMap.get(cName)!;
              placeholders.push('?');
              params.push(serializeValue(colDef, row[cName]));
            }
            valueGroups.push(`(${placeholders.join(', ')})`);
          }

          const sql = `INSERT INTO ${tbl} (${colsHeader}) VALUES ${valueGroups.join(', ')}${onDupSql}`;
          await pool.query(sql, params);
        }

        return { data: cleanRows, error: null };
      }

      if (this.op === 'update') {
        const entries = Object.entries(this.updateObj).filter(
          ([k, v]) => this.colMap.has(k) && v !== undefined && k !== this.tableDef.primaryKey
        );
        if (entries.length === 0) {
          return { data: [], error: null };
        }

        const setClauses: string[] = [];
        const params: any[] = [];
        for (const [colName, val] of entries) {
          const colDef = this.colMap.get(colName)!;
          setClauses.push(`\`${colName}\` = ?`);
          params.push(serializeValue(colDef, val));
        }

        const { sql: whereSql, params: whereParams } = this.buildWhereSql();
        await pool.query(`UPDATE ${tbl} SET ${setClauses.join(', ')}${whereSql}`, [...params, ...whereParams]);
        return { data: [this.updateObj], error: null };
      }

      if (this.op === 'delete') {
        const { sql: whereSql, params } = this.buildWhereSql();
        await pool.query(`DELETE FROM ${tbl}${whereSql}`, params);
        return { data: [], error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          message: err?.sqlMessage || err?.message || 'MySQL query error',
          code: err?.code,
        },
      };
    }
  }

  then<TResult1 = DbQueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: DbQueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const mysqlDb = {
  from: (table: string) => new MysqlTableQueryBuilder(table),
};

// ============================================================================
// CONNECTION & SCHEMA DIAGNOSTICS (FOR ADMIN SETTINGS UI)
// ============================================================================

export const testMysqlConnection = async (): Promise<{
  success: boolean;
  isConfigured: boolean;
  message: string;
  tablesFound: number;
  tableChecks: TableSchemaCheck[];
  hasPendingMigration: boolean;
  migrationSql: string;
  fullSchemaSql: string;
  serverVersion?: string;
}> => {
  const cfg = getMysqlConfig();
  if (!cfg.isConfigured) {
    return {
      success: false,
      isConfigured: false,
      message:
        'Variabel MYSQL_HOST, MYSQL_USER, dan MYSQL_DATABASE belum dikonfigurasi di file .env hosting/server Anda.',
      tablesFound: 0,
      tableChecks: TABLE_DEFINITIONS.map((t) => ({
        table: t.table,
        label: t.label,
        exists: false,
        missingColumns: t.columns.map((c) => c.name),
      })),
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL,
    };
  }

  const pool = getMysqlPool();
  if (!pool) {
    return {
      success: false,
      isConfigured: false,
      message: 'Pool koneksi MySQL tidak dapat diinisialisasi.',
      tablesFound: 0,
      tableChecks: [],
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL,
    };
  }

  try {
    const [verRows] = await pool.query<RowDataPacket[]>('SELECT VERSION() AS ver');
    const serverVersion = verRows?.[0]?.ver ? String(verRows[0].ver) : 'MySQL';

    const [tableRows] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );
    const existingTables = new Set(tableRows.map((r) => String(r.TABLE_NAME).toLowerCase()));

    const [colRows] = await pool.query<RowDataPacket[]>(
      `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );
    const colsByTable = new Map<string, Set<string>>();
    for (const r of colRows) {
      const tName = String(r.TABLE_NAME).toLowerCase();
      if (!colsByTable.has(tName)) colsByTable.set(tName, new Set());
      colsByTable.get(tName)!.add(String(r.COLUMN_NAME).toLowerCase());
    }

    const tableChecks: TableSchemaCheck[] = [];
    const migrationSnippets: string[] = [];
    let tablesFound = 0;

    for (const def of TABLE_DEFINITIONS) {
      const exists = existingTables.has(def.table.toLowerCase());
      if (!exists) {
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: false,
          missingColumns: [],
        });
        migrationSnippets.push(`-- Buat tabel baru: ${def.table}\n${buildCreateTableSql(def)}`);
      } else {
        tablesFound++;
        const existingCols = colsByTable.get(def.table.toLowerCase()) || new Set<string>();
        const missingColumns: string[] = [];
        for (const col of def.columns) {
          if (!existingCols.has(col.name.toLowerCase())) {
            missingColumns.push(col.name);
            const alterType = col.sqlType.replace(/\bPRIMARY KEY\b/gi, '').replace(/\bNOT NULL\b/gi, 'NULL');
            migrationSnippets.push(`ALTER TABLE \`${def.table}\` ADD COLUMN \`${col.name}\` ${alterType};`);
          }
        }

        let rowCount = 0;
        try {
          const [cntRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM \`${def.table}\``);
          rowCount = Number(cntRows?.[0]?.cnt || 0);
        } catch {}

        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: true,
          missingColumns,
          rowCount,
        });
      }
    }

    const hasPendingMigration = migrationSnippets.length > 0;
    const migrationSql = hasPendingMigration
      ? [
          '-- ============================================================================',
          '-- QUERY UPDATE TABEL & KOLOM BARU MYSQL NDTAXANDLAW',
          '-- Jalankan di phpMyAdmin / MySQL CLI atau klik tombol Auto-Sinkronkan Tabel',
          '-- ============================================================================',
          '',
          ...migrationSnippets,
        ].join('\n\n')
      : `-- ✅ Seluruh ${TABLE_DEFINITIONS.length} tabel & kolom di database MySQL "${cfg.database}" sudah lengkap dan up-to-date!`;

    return {
      success: tablesFound > 0,
      isConfigured: true,
      serverVersion,
      message:
        tablesFound === TABLE_DEFINITIONS.length && !hasPendingMigration
          ? `Koneksi ke MySQL (${serverVersion}) berhasil aktif! Seluruh ${tablesFound}/${TABLE_DEFINITIONS.length} tabel & kolom sudah sinkron.`
          : tablesFound === 0
          ? `Terhubung ke server MySQL (${serverVersion}), namun belum ada tabel aplikasi. Klik "Auto-Buat 14 Tabel MySQL" untuk membuat seluruh tabel secara otomatis.`
          : `Terhubung ke MySQL (${serverVersion}) — ${tablesFound}/${TABLE_DEFINITIONS.length} tabel aktif, terdapat tabel/kolom baru yang siap disinkronkan.`,
      tablesFound,
      tableChecks,
      hasPendingMigration,
      migrationSql,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL,
    };
  } catch (err: any) {
    return {
      success: false,
      isConfigured: true,
      message: `Gagal terhubung ke MySQL (${cfg.host}:${cfg.port}/${cfg.database}): ${err?.message || 'Connection refused'}`,
      tablesFound: 0,
      tableChecks: [],
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL,
    };
  }
};

// ============================================================================
// ONE-TIME PRODUCTION MIGRATION ENGINE: SUPABASE REST API -> MYSQL
// (Uses native fetch() — ZERO runtime dependency on @supabase/supabase-js!)
// ============================================================================

export interface TableMigrationReport {
  table: string;
  label: string;
  sourceCount: number;
  migratedCount: number;
  mysqlFinalCount: number;
  status: 'ok' | 'skipped' | 'warning' | 'error';
  error?: string;
}

export interface SupabaseToMysqlMigrationResult {
  success: boolean;
  dryRun: boolean;
  mode: 'merge' | 'replace';
  totalSourceRows: number;
  totalMigratedRows: number;
  tables: TableMigrationReport[];
  message: string;
  completedAt: string;
}

const fetchAllRowsFromSupabaseTable = async (
  supabaseUrl: string,
  supabaseKey: string,
  table: string
): Promise<{ rows: Record<string, any>[]; error?: string }> => {
  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const PAGE_SIZE = 1000;
  const allRows: Record<string, any>[] = [];
  let offset = 0;

  while (true) {
    const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: 'count=exact',
      },
    });

    if (res.status === 404 || res.status === 400) {
      const txt = await res.text().catch(() => '');
      if (txt.includes('does not exist') || txt.includes('Could not find the table') || txt.includes('PGRST205')) {
        return { rows: [], error: 'Tabel belum ada di Supabase (dilewati)' };
      }
      return { rows: [], error: `HTTP ${res.status}: ${txt.slice(0, 180)}` };
    }

    if (res.status === 416) {
      // Requested Range Not Satisfiable = empty or reached end of table
      break;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { rows: [], error: `HTTP ${res.status}: ${txt.slice(0, 180)}` };
    }

    const batch = (await res.json()) as Record<string, any>[];
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    allRows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { rows: allRows };
};

export const migrateFromSupabaseToMysql = async (params: {
  supabaseUrl: string;
  supabaseKey: string;
  mode?: 'merge' | 'replace';
  dryRun?: boolean;
}): Promise<SupabaseToMysqlMigrationResult> => {
  const supabaseUrl = (params.supabaseUrl || '').trim();
  const supabaseKey = (params.supabaseKey || '').trim();
  const mode: 'merge' | 'replace' = params.mode === 'replace' ? 'replace' : 'merge';
  const dryRun = Boolean(params.dryRun);

  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      dryRun,
      mode,
      totalSourceRows: 0,
      totalMigratedRows: 0,
      tables: [],
      message: 'URL Supabase dan Service Role Key / API Key wajib diisi untuk menarik data produksi.',
      completedAt: new Date().toISOString(),
    };
  }

  const pool = getMysqlPool();
  if (!dryRun) {
    if (!pool || !isMysqlConfigured()) {
      return {
        success: false,
        dryRun,
        mode,
        totalSourceRows: 0,
        totalMigratedRows: 0,
        tables: [],
        message: 'Koneksi MySQL belum aktif. Pastikan MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE sudah terpasang di .env.',
        completedAt: new Date().toISOString(),
      };
    }

    const schemaInit = await ensureMysqlSchema();
    if (!schemaInit.success) {
      return {
        success: false,
        dryRun,
        mode,
        totalSourceRows: 0,
        totalMigratedRows: 0,
        tables: [],
        message: schemaInit.message,
        completedAt: new Date().toISOString(),
      };
    }
  }

  const reports: TableMigrationReport[] = [];
  let totalSourceRows = 0;
  let totalMigratedRows = 0;
  let hardErrors = 0;

  for (const def of TABLE_DEFINITIONS) {
    try {
      const { rows, error: fetchErr } = await fetchAllRowsFromSupabaseTable(
        supabaseUrl,
        supabaseKey,
        def.table
      );

      if (fetchErr) {
        const isMissingTable = fetchErr.includes('dilewati');
        reports.push({
          table: def.table,
          label: def.label,
          sourceCount: 0,
          migratedCount: 0,
          mysqlFinalCount: 0,
          status: isMissingTable ? 'skipped' : 'error',
          error: fetchErr,
        });
        if (!isMissingTable) hardErrors++;
        continue;
      }

      totalSourceRows += rows.length;

      if (dryRun) {
        reports.push({
          table: def.table,
          label: def.label,
          sourceCount: rows.length,
          migratedCount: 0,
          mysqlFinalCount: 0,
          status: 'ok',
        });
        continue;
      }

      if (mode === 'replace') {
        await pool!.query(`DELETE FROM \`${def.table}\``);
      }

      let migratedCount = 0;
      if (rows.length > 0) {
        const { error: upErr } = await mysqlDb.from(def.table).upsert(rows);
        if (upErr) {
          hardErrors++;
          reports.push({
            table: def.table,
            label: def.label,
            sourceCount: rows.length,
            migratedCount: 0,
            mysqlFinalCount: 0,
            status: 'error',
            error: upErr.message,
          });
          continue;
        }
        migratedCount = rows.length;
        totalMigratedRows += migratedCount;
      }

      const [cntRows] = await pool!.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM \`${def.table}\``);
      const mysqlFinalCount = Number(cntRows?.[0]?.cnt || 0);

      reports.push({
        table: def.table,
        label: def.label,
        sourceCount: rows.length,
        migratedCount,
        mysqlFinalCount,
        status: 'ok',
      });
    } catch (err: any) {
      hardErrors++;
      reports.push({
        table: def.table,
        label: def.label,
        sourceCount: 0,
        migratedCount: 0,
        mysqlFinalCount: 0,
        status: 'error',
        error: err?.message || 'Gagal membaca/menulis tabel',
      });
    }
  }

  return {
    success: hardErrors === 0,
    dryRun,
    mode,
    totalSourceRows,
    totalMigratedRows,
    tables: reports,
    message: dryRun
      ? hardErrors === 0
        ? `Cek data Supabase berhasil! Ditemukan total ${totalSourceRows.toLocaleString('id-ID')} baris data di ${TABLE_DEFINITIONS.length} tabel yang siap dimigrasikan ke MySQL.`
        : `Pengecekan selesai dengan ${hardErrors} error tabel. Periksa URL & Service Role Key Supabase Anda.`
      : hardErrors === 0
      ? `Migrasi Supabase -> MySQL SUKSES 100%! Total ${totalMigratedRows.toLocaleString('id-ID')} baris data dari ${TABLE_DEFINITIONS.length} tabel berhasil dipindahkan ke MySQL (${mode === 'replace' ? 'Mode Replace' : 'Mode Merge Aman'}).`
      : `Migrasi selesai dengan ${hardErrors} kendala pada beberapa tabel (${totalMigratedRows.toLocaleString('id-ID')} baris berhasil masuk MySQL).`,
    completedAt: new Date().toISOString(),
  };
};

// ============================================================================
// MYSQL SQL DUMP GENERATOR (EXPORT DATA MYSQL KE .SQL SIAP IMPORT PHPMYADMIN)
// ============================================================================

const escapeSqlValue = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `'${str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '')}'`;
};

export const generateMysqlSqlDump = async (): Promise<{
  success: boolean;
  sql: string;
  counts: Record<string, number>;
  error?: string;
}> => {
  const pool = getMysqlPool();
  if (!pool || !isMysqlConfigured()) {
    return {
      success: false,
      sql: '',
      counts: {},
      error: 'Koneksi MySQL belum aktif.',
    };
  }

  const lines: string[] = [
    '-- ============================================================================',
    `-- BACKUP FULL SQL DATABASE MYSQL NDTAXANDLAW (${new Date().toISOString()})`,
    '-- ============================================================================',
    '',
    FULL_MYSQL_SCHEMA_SQL,
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];
  const counts: Record<string, number> = {};

  try {
    for (const def of TABLE_DEFINITIONS) {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${def.table}\``);
      counts[def.table] = rows.length;
      if (rows.length === 0) continue;

      lines.push(`-- Data tabel \`${def.table}\` (${rows.length} baris)`);
      const colNames = def.columns.map((c) => c.name).filter((c) => c in rows[0]);
      const colsHeader = colNames.map((c) => `\`${c}\``).join(', ');
      const pk = def.primaryKey;
      const updateCols = colNames.filter((c) => c !== pk);
      const onDup =
        updateCols.length > 0
          ? ` ON DUPLICATE KEY UPDATE ${updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')}`
          : '';

      for (const row of rows) {
        const vals = colNames.map((c) => escapeSqlValue(row[c])).join(', ');
        lines.push(`INSERT INTO \`${def.table}\` (${colsHeader}) VALUES (${vals})${onDup};`);
      }
      lines.push('');
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    return { success: true, sql: lines.join('\n'), counts };
  } catch (err: any) {
    return {
      success: false,
      sql: '',
      counts,
      error: err?.message || 'Gagal membuat SQL dump MySQL',
    };
  }
};
