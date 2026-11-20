-- ============================================================================
-- SKEMA DATABASE LENGKAP MYSQL / MARIADB UNTUK NDTAXANDLAW KEMITRAAN (14 TABEL)
-- Kompatibel dengan MySQL 5.7+, MySQL 8.0+, & MariaDB 10.2+ (cPanel / VPS)
-- ============================================================================
-- CARA PENGGUNAAN:
-- 1. Buat database baru di cPanel / phpMyAdmin / MySQL CLI, misal: ndtaxlaw_db
-- 2. Pilih database tersebut -> buka tab "Import" atau "SQL"
-- 3. Import file mysql_schema.sql ini -> klik "Go / Jalankan"
-- (Atau cukup pasang kredensial MYSQL_* di .env — server akan membuat
--  seluruh 14 tabel & kolom secara OTOMATIS saat startup!)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABEL MITRA KONSULTAN (mitras)
CREATE TABLE IF NOT EXISTS `mitras` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `memberCode` VARCHAR(128) NULL,
  `referralCode` VARCHAR(128) NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(64) NULL,
  `nik` VARCHAR(64) NULL,
  `ktpFileUrl` LONGTEXT NULL,
  `ktpFileName` VARCHAR(255) NULL,
  `specialization` VARCHAR(255) NULL,
  `status` VARCHAR(64) NULL DEFAULT 'pending',
  `avatarUrl` LONGTEXT NULL,
  `gender` VARCHAR(32) NULL,
  `joinedDate` VARCHAR(64) NULL,
  `bankDetails` LONGTEXT NULL,
  `totalCommission` DECIMAL(18,2) NULL DEFAULT 0,
  `totalBonus` DECIMAL(18,2) NULL DEFAULT 0,
  `pendingPayout` DECIMAL(18,2) NULL DEFAULT 0,
  `paidPayout` DECIMAL(18,2) NULL DEFAULT 0,
  `referredClientsCount` INT NULL DEFAULT 0,
  `activeSubscribersCount` INT NULL DEFAULT 0,
  `emailVerified` TINYINT(1) NULL DEFAULT 0,
  `verificationToken` VARCHAR(255) NULL,
  `verificationTokenExpiry` VARCHAR(64) NULL,
  `rejectionReason` TEXT NULL,
  `rejectedAt` VARCHAR(64) NULL,
  `isActive` TINYINT(1) NULL DEFAULT 1,
  `deactivatedAt` VARCHAR(64) NULL,
  `deactivatedBy` VARCHAR(191) NULL,
  `deactivatedReason` TEXT NULL,
  `customFields` LONGTEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_mitras_email` (`email`),
  INDEX `idx_mitras_nik` (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL KATALOG LAYANAN FIRMA (services)
CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `defaultPrice` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `pricingType` VARCHAR(64) NULL DEFAULT 'case_by_case',
  `commissionRate` DECIMAL(8,2) NULL DEFAULT 15,
  `description` TEXT NULL,
  `isActive` TINYINT(1) NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL DEAL KLIEN & LANGGANAN (client_deals)
CREATE TABLE IF NOT EXISTS `client_deals` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `mitraId` VARCHAR(191) NULL,
  `mitraName` VARCHAR(255) NULL,
  `referralCode` VARCHAR(128) NULL,
  `companyName` VARCHAR(255) NOT NULL,
  `picName` VARCHAR(255) NOT NULL,
  `picPhone` VARCHAR(64) NULL,
  `picEmail` VARCHAR(191) NULL,
  `serviceId` VARCHAR(191) NULL,
  `serviceName` VARCHAR(255) NULL,
  `pricingType` VARCHAR(64) NULL,
  `dealValue` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `commissionAmount` DECIMAL(18,2) NULL DEFAULT 0,
  `appliedCommissionRate` DECIMAL(8,2) NULL,
  `lockedRecurringRate` DECIMAL(8,2) NULL,
  `recurringCommissionAmount` DECIMAL(18,2) NULL,
  `status` VARCHAR(64) NULL DEFAULT 'pending_acc',
  `date` VARCHAR(64) NULL,
  `recurringPaidMonths` INT NULL,
  `recurringPaidYears` INT NULL,
  `periodStart` VARCHAR(64) NULL,
  `periodEnd` VARCHAR(64) NULL,
  `durationMonths` INT NULL,
  `paymentTermType` VARCHAR(64) NULL DEFAULT 'one_time',
  `notes` TEXT NULL,
  `submittedBy` VARCHAR(64) NULL DEFAULT 'mitra',
  `subscriptionStartDate` VARCHAR(64) NULL,
  `billingDayOfMonth` INT NULL,
  `nextBillingDate` VARCHAR(64) NULL,
  `lastBilledDate` VARCHAR(64) NULL,
  `isBillingDue` TINYINT(1) NULL DEFAULT 0,
  `terminatedAt` VARCHAR(64) NULL,
  `terminationReason` TEXT NULL,
  `rejectedAt` VARCHAR(64) NULL,
  `rejectionReason` TEXT NULL,
  `customFields` LONGTEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_client_deals_mitra` (`mitraId`),
  INDEX `idx_client_deals_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL TRANSAKSI KOMISI & BONUS (commissions)
CREATE TABLE IF NOT EXISTS `commissions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `mitraId` VARCHAR(191) NULL,
  `mitraName` VARCHAR(255) NULL,
  `serviceName` VARCHAR(255) NULL,
  `clientName` VARCHAR(255) NULL,
  `dealValue` DECIMAL(18,2) NULL DEFAULT 0,
  `commissionAmount` DECIMAL(18,2) NULL DEFAULT 0,
  `bonusAmount` DECIMAL(18,2) NULL DEFAULT 0,
  `status` VARCHAR(64) NULL DEFAULT 'pending',
  `date` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_commissions_mitra` (`mitraId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL PENGAJUAN PENCAIRAN KOMISI (payout_requests)
CREATE TABLE IF NOT EXISTS `payout_requests` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `mitraId` VARCHAR(191) NULL,
  `mitraName` VARCHAR(255) NULL,
  `memberCode` VARCHAR(128) NULL,
  `amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `bankDetails` LONGTEXT NULL,
  `requestDate` VARCHAR(64) NULL,
  `processedDate` VARCHAR(64) NULL,
  `status` VARCHAR(64) NULL DEFAULT 'pending',
  `pph21Deduction` DECIMAL(18,2) NULL DEFAULT 0,
  `pph21Rate` DECIMAL(8,2) NULL DEFAULT 0,
  `adminFeeDeduction` DECIMAL(18,2) NULL DEFAULT 0,
  `netAmountTransferred` DECIMAL(18,2) NULL DEFAULT 0,
  `proofFileUrl` LONGTEXT NULL,
  `proofFileName` VARCHAR(255) NULL,
  `transferRefNumber` VARCHAR(191) NULL,
  `disbursedBy` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payouts_mitra` (`mitraId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL MATERI PROMOSI & PELATIHAN (marketing_tools)
CREATE TABLE IF NOT EXISTS `marketing_tools` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `fileType` VARCHAR(64) NULL,
  `fileSize` VARCHAR(64) NULL,
  `downloadUrl` LONGTEXT NULL,
  `thumbnailUrl` LONGTEXT NULL,
  `description` TEXT NULL,
  `createdAt` VARCHAR(64) NULL,
  `updatedAt` VARCHAR(64) NULL,
  `targetProduct` VARCHAR(255) NULL,
  `duration` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL NOTIFIKASI SISTEM (notifications)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(64) NULL,
  `timestamp` VARCHAR(64) NULL,
  `isRead` TINYINT(1) NULL DEFAULT 0,
  `targetAudience` VARCHAR(64) NULL,
  `mitraId` VARCHAR(191) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notifications_ts` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABEL PENGATURAN SISTEM (app_settings)
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY DEFAULT 'config_primary',
  `settings` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABEL KREDENSIAL TERENKRIPSI & SYSTEM KV (user_passwords)
CREATE TABLE IF NOT EXISTS `user_passwords` (
  `email` VARCHAR(191) NOT NULL PRIMARY KEY,
  `password` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABEL MANAJEMEN ROLE DINAMIS (system_roles)
CREATE TABLE IF NOT EXISTS `system_roles` (
  `code` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `portalView` VARCHAR(64) NULL DEFAULT 'mitra',
  `defaultTab` VARCHAR(64) NULL DEFAULT 'idcard',
  `allowedTabs` LONGTEXT NULL,
  `permissions` LONGTEXT NULL,
  `isSystem` TINYINT(1) NULL DEFAULT 0,
  `isActive` TINYINT(1) NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABEL LOG AKTIVITAS AUDIT (activity_logs)
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `timestamp` VARCHAR(64) NOT NULL,
  `actorRole` VARCHAR(64) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `actorName` VARCHAR(255) NOT NULL,
  `actorEmail` VARCHAR(191) NULL,
  `actionType` VARCHAR(128) NOT NULL,
  `operation` VARCHAR(64) NOT NULL,
  `targetEntity` VARCHAR(255) NOT NULL,
  `targetId` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `metadata` LONGTEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activity_logs_ts` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABEL LOG PENGIRIMAN EMAIL SMTP (email_logs)
CREATE TABLE IF NOT EXISTS `email_logs` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `recipient` VARCHAR(255) NOT NULL,
  `recipientName` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `status` VARCHAR(64) NOT NULL,
  `smtpResponse` TEXT NULL,
  `timestamp` VARCHAR(64) NOT NULL,
  `sentAt` VARCHAR(64) NULL,
  `previewSnippet` TEXT NULL,
  `errorMessage` TEXT NULL,
  `smtpHostUsed` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_logs_ts` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. TABEL RUANG PERCAKAPAN CHAT (chat_rooms)
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `type` VARCHAR(32) NOT NULL DEFAULT 'direct',
  `name` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `avatarUrl` LONGTEXT NULL,
  `participantIds` LONGTEXT NULL,
  `createdBy` VARCHAR(191) NULL,
  `createdByName` VARCHAR(255) NULL,
  `createdAt` VARCHAR(64) NULL,
  `updatedAt` VARCHAR(64) NULL,
  `lastMessageText` TEXT NULL,
  `lastMessageAt` VARCHAR(64) NULL,
  `lastMessageSenderId` VARCHAR(191) NULL,
  `lastMessageSenderName` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TABEL RIWAYAT PESAN, PIN & REAKSI CHAT (chat_messages)
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `roomId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `senderName` VARCHAR(255) NOT NULL,
  `senderRole` VARCHAR(64) NOT NULL,
  `senderAvatar` LONGTEXT NULL,
  `text` LONGTEXT NULL,
  `imageUrl` LONGTEXT NULL,
  `imageName` VARCHAR(255) NULL,
  `imageOriginalSize` BIGINT NULL,
  `imageCompressedSize` BIGINT NULL,
  `linkPreview` LONGTEXT NULL,
  `replyTo` LONGTEXT NULL,
  `forwardedFrom` VARCHAR(255) NULL,
  `reactions` LONGTEXT NULL,
  `createdAt` VARCHAR(64) NOT NULL,
  `editedAt` VARCHAR(64) NULL,
  `isDeleted` TINYINT(1) NULL DEFAULT 0,
  `deletedAt` VARCHAR(64) NULL,
  `isSystemMessage` TINYINT(1) NULL DEFAULT 0,
  `isPinned` TINYINT(1) NULL DEFAULT 0,
  `pinnedAt` VARCHAR(64) NULL,
  `pinnedBy` VARCHAR(191) NULL,
  `pinnedByName` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_chat_messages_room` (`roomId`),
  INDEX `idx_chat_messages_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
