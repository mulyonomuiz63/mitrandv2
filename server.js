// server.ts
import express from "express";
import dotenv2 from "dotenv";
import path3 from "path";
import fs3 from "fs";
import os2 from "os";
import crypto2 from "crypto";
import { execFile as execFile2 } from "child_process";
import { fileURLToPath } from "url";
import ffmpegStatic from "ffmpeg-static";
import nodemailer from "nodemailer";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";

// src/mysql.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
var getMysqlConfig = () => {
  const host = (process.env.MYSQL_HOST || process.env.DB_HOST || "").trim();
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306) || 3306;
  const user = (process.env.MYSQL_USER || process.env.DB_USER || "").trim();
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "";
  const database = (process.env.MYSQL_DATABASE || process.env.DB_NAME || "").trim();
  const sslRaw = (process.env.MYSQL_SSL || process.env.DB_SSL || "").trim().toLowerCase();
  const ssl = sslRaw === "true" || sslRaw === "1" || sslRaw === "required";
  const isConfigured = Boolean(host && user && database);
  return {
    isConfigured,
    host,
    port,
    user,
    database,
    ssl,
    hasPassword: Boolean(password),
    connectionLabel: isConfigured ? `mysql://${user}@${host}:${port}/${database}` : ""
  };
};
var isMysqlConfigured = () => getMysqlConfig().isConfigured;
var _pool = null;
var _poolSignature = "";
var getMysqlPool = () => {
  const cfg = getMysqlConfig();
  if (!cfg.isConfigured) return null;
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? "";
  const sig = `${cfg.host}|${cfg.port}|${cfg.user}|${cfg.database}|${cfg.ssl}|${password.length}`;
  if (_pool && _poolSignature === sig) {
    return _pool;
  }
  if (_pool) {
    _pool.end().catch(() => {
    });
    _pool = null;
  }
  const options = {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10) || 10,
    queueLimit: 0,
    charset: "utf8mb4",
    decimalNumbers: true,
    supportBigNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 1e4,
    connectTimeout: 15e3,
    ...cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}
  };
  _pool = mysql.createPool(options);
  _poolSignature = sig;
  return _pool;
};
var TABLE_DEFINITIONS = [
  {
    table: "mitras",
    label: "Data Mitra Konsultan",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "memberCode", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "referralCode", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "fullName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "email", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "phone", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "nik", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "ktpFileUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "ktpFileName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "specialization", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "status", sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: "string" },
      { name: "avatarUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "gender", sqlType: "VARCHAR(32) NULL", kind: "string" },
      { name: "joinedDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "bankDetails", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "totalCommission", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "totalBonus", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "pendingPayout", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "paidPayout", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "referredClientsCount", sqlType: "INT NULL DEFAULT 0", kind: "number" },
      { name: "activeSubscribersCount", sqlType: "INT NULL DEFAULT 0", kind: "number" },
      { name: "emailVerified", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "verificationToken", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "verificationTokenExpiry", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "rejectionReason", sqlType: "TEXT NULL", kind: "string" },
      { name: "rejectedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "isActive", sqlType: "TINYINT(1) NULL DEFAULT 1", kind: "boolean" },
      { name: "deactivatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "deactivatedBy", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "deactivatedReason", sqlType: "TEXT NULL", kind: "string" },
      { name: "customFields", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_mitras_email` (`email`)", "INDEX `idx_mitras_nik` (`nik`)"]
  },
  {
    table: "services",
    label: "Katalog Layanan Firma",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "name", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "category", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "defaultPrice", sqlType: "DECIMAL(18,2) NOT NULL DEFAULT 0", kind: "number" },
      { name: "pricingType", sqlType: "VARCHAR(64) NULL DEFAULT 'case_by_case'", kind: "string" },
      { name: "commissionRate", sqlType: "DECIMAL(8,2) NULL DEFAULT 15", kind: "number" },
      { name: "description", sqlType: "TEXT NULL", kind: "string" },
      { name: "isActive", sqlType: "TINYINT(1) NULL DEFAULT 1", kind: "boolean" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "client_deals",
    label: "Deal Klien & Langganan",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "mitraId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "mitraName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "referralCode", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "companyName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "picName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "picPhone", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "picEmail", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "serviceId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "serviceName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "pricingType", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "dealValue", sqlType: "DECIMAL(18,2) NOT NULL DEFAULT 0", kind: "number" },
      { name: "commissionAmount", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "appliedCommissionRate", sqlType: "DECIMAL(8,2) NULL", kind: "number" },
      { name: "lockedRecurringRate", sqlType: "DECIMAL(8,2) NULL", kind: "number" },
      { name: "recurringCommissionAmount", sqlType: "DECIMAL(18,2) NULL", kind: "number" },
      { name: "status", sqlType: "VARCHAR(64) NULL DEFAULT 'pending_acc'", kind: "string" },
      { name: "date", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "recurringPaidMonths", sqlType: "INT NULL", kind: "number" },
      { name: "recurringPaidYears", sqlType: "INT NULL", kind: "number" },
      { name: "periodStart", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "periodEnd", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "durationMonths", sqlType: "INT NULL", kind: "number" },
      { name: "paymentTermType", sqlType: "VARCHAR(64) NULL DEFAULT 'one_time'", kind: "string" },
      { name: "notes", sqlType: "TEXT NULL", kind: "string" },
      { name: "submittedBy", sqlType: "VARCHAR(64) NULL DEFAULT 'mitra'", kind: "string" },
      { name: "subscriptionStartDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "billingDayOfMonth", sqlType: "INT NULL", kind: "number" },
      { name: "nextBillingDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "lastBilledDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "isBillingDue", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "terminatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "terminationReason", sqlType: "TEXT NULL", kind: "string" },
      { name: "rejectedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "rejectionReason", sqlType: "TEXT NULL", kind: "string" },
      { name: "customFields", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_client_deals_mitra` (`mitraId`)", "INDEX `idx_client_deals_status` (`status`)"]
  },
  {
    table: "commissions",
    label: "Transaksi Komisi & Bonus",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "mitraId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "mitraName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "serviceName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "clientName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "dealValue", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "commissionAmount", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "bonusAmount", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "status", sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: "string" },
      { name: "date", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_commissions_mitra` (`mitraId`)"]
  },
  {
    table: "payout_requests",
    label: "Pengajuan Pencairan Komisi",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "mitraId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "mitraName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "memberCode", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "amount", sqlType: "DECIMAL(18,2) NOT NULL DEFAULT 0", kind: "number" },
      { name: "bankDetails", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "requestDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "processedDate", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "status", sqlType: "VARCHAR(64) NULL DEFAULT 'pending'", kind: "string" },
      { name: "pph21Deduction", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "pph21Rate", sqlType: "DECIMAL(8,2) NULL DEFAULT 0", kind: "number" },
      { name: "adminFeeDeduction", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "netAmountTransferred", sqlType: "DECIMAL(18,2) NULL DEFAULT 0", kind: "number" },
      { name: "proofFileUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "proofFileName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "transferRefNumber", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "disbursedBy", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "notes", sqlType: "TEXT NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_payouts_mitra` (`mitraId`)"]
  },
  {
    table: "marketing_tools",
    label: "Materi Promosi & Pelatihan",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "title", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "category", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "fileType", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "fileSize", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "downloadUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "thumbnailUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "description", sqlType: "TEXT NULL", kind: "string" },
      { name: "createdAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "updatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "targetProduct", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "duration", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "notifications",
    label: "Notifikasi Sistem",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "title", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "message", sqlType: "TEXT NOT NULL", kind: "string" },
      { name: "type", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "timestamp", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "isRead", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "targetAudience", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "mitraId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_notifications_ts` (`timestamp`)"]
  },
  {
    table: "app_settings",
    label: "Pengaturan Aplikasi & SMTP",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY DEFAULT 'config_primary'", kind: "string" },
      { name: "settings", sqlType: "LONGTEXT NOT NULL", kind: "json" },
      { name: "updated_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "user_passwords",
    label: "Kredensial Terenkripsi & System KV",
    primaryKey: "email",
    columns: [
      { name: "email", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "password", sqlType: "LONGTEXT NOT NULL", kind: "string" },
      { name: "updated_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "system_roles",
    label: "Manajemen Role Dinamis",
    primaryKey: "code",
    columns: [
      { name: "code", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "name", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "description", sqlType: "TEXT NULL", kind: "string" },
      { name: "portalView", sqlType: "VARCHAR(64) NULL DEFAULT 'mitra'", kind: "string" },
      { name: "defaultTab", sqlType: "VARCHAR(64) NULL DEFAULT 'idcard'", kind: "string" },
      { name: "allowedTabs", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "permissions", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "isSystem", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "isActive", sqlType: "TINYINT(1) NULL DEFAULT 1", kind: "boolean" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "activity_logs",
    label: "Log Aktivitas Audit",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "timestamp", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "actorRole", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "actorId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "actorName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "actorEmail", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "actionType", sqlType: "VARCHAR(128) NOT NULL", kind: "string" },
      { name: "operation", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "targetEntity", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "targetId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "description", sqlType: "TEXT NOT NULL", kind: "string" },
      { name: "metadata", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_activity_logs_ts` (`timestamp`)"]
  },
  {
    table: "email_logs",
    label: "Log Pengiriman Email SMTP",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "recipient", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "recipientName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "subject", sqlType: "VARCHAR(500) NOT NULL", kind: "string" },
      { name: "category", sqlType: "VARCHAR(128) NOT NULL", kind: "string" },
      { name: "status", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "smtpResponse", sqlType: "TEXT NULL", kind: "string" },
      { name: "timestamp", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "sentAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "previewSnippet", sqlType: "TEXT NULL", kind: "string" },
      { name: "errorMessage", sqlType: "TEXT NULL", kind: "string" },
      { name: "smtpHostUsed", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_email_logs_ts` (`timestamp`)"]
  },
  {
    table: "chat_rooms",
    label: "Ruang Chat Personal & Grup",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "type", sqlType: "VARCHAR(32) NOT NULL DEFAULT 'direct'", kind: "string" },
      { name: "name", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "description", sqlType: "TEXT NULL", kind: "string" },
      { name: "avatarUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "participantIds", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "createdBy", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "createdByName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "createdAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "updatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "lastMessageText", sqlType: "TEXT NULL", kind: "string" },
      { name: "lastMessageAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "lastMessageSenderId", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "lastMessageSenderName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ]
  },
  {
    table: "chat_messages",
    label: "Riwayat Pesan, Pin & Reaksi Chat",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "roomId", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "senderId", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "senderName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "senderRole", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "senderAvatar", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "text", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "imageUrl", sqlType: "LONGTEXT NULL", kind: "string" },
      { name: "imageName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "imageOriginalSize", sqlType: "BIGINT NULL", kind: "number" },
      { name: "imageCompressedSize", sqlType: "BIGINT NULL", kind: "number" },
      { name: "linkPreview", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "replyTo", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "forwardedFrom", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "reactions", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "createdAt", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "editedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "isDeleted", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "deletedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "isSystemMessage", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "isPinned", sqlType: "TINYINT(1) NULL DEFAULT 0", kind: "boolean" },
      { name: "pinnedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "pinnedBy", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "pinnedByName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: ["INDEX `idx_chat_messages_room` (`roomId`)", "INDEX `idx_chat_messages_created` (`createdAt`)"]
  },
  {
    table: "prospect_letters",
    label: "Surat Penawaran Prospek Mitra",
    primaryKey: "id",
    columns: [
      { name: "id", sqlType: "VARCHAR(191) NOT NULL PRIMARY KEY", kind: "string" },
      { name: "letterNumber", sqlType: "VARCHAR(128) NOT NULL", kind: "string" },
      { name: "sequenceNumber", sqlType: "INT NOT NULL DEFAULT 1", kind: "number" },
      { name: "verificationCode", sqlType: "VARCHAR(128) NOT NULL", kind: "string" },
      { name: "letterDate", sqlType: "VARCHAR(32) NOT NULL", kind: "string" },
      { name: "companyName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "businessField", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "companyAddress", sqlType: "TEXT NOT NULL", kind: "string" },
      { name: "addressParts", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "customContent", sqlType: "LONGTEXT NULL", kind: "json" },
      { name: "mitraId", sqlType: "VARCHAR(191) NOT NULL", kind: "string" },
      { name: "mitraName", sqlType: "VARCHAR(255) NOT NULL", kind: "string" },
      { name: "mitraMemberCode", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "mitraPhone", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "mitraEmail", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "directorName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "directorTitle", sqlType: "VARCHAR(128) NULL", kind: "string" },
      { name: "createdByRole", sqlType: "VARCHAR(32) NOT NULL DEFAULT 'mitra'", kind: "string" },
      { name: "createdByName", sqlType: "VARCHAR(255) NULL", kind: "string" },
      { name: "createdById", sqlType: "VARCHAR(191) NULL", kind: "string" },
      { name: "createdAt", sqlType: "VARCHAR(64) NOT NULL", kind: "string" },
      { name: "updatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" },
      { name: "created_at", sqlType: "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP", kind: "string" }
    ],
    indexes: [
      "UNIQUE INDEX `uniq_prospect_letters_number` (`letterNumber`)",
      "INDEX `idx_prospect_letters_mitra` (`mitraId`)",
      "INDEX `idx_prospect_letters_vcode` (`verificationCode`)",
      "INDEX `idx_prospect_letters_created` (`createdAt`)"
    ]
  },
  {
    table: "prospect_letter_sequences",
    label: "Counter Nomor Surat Prospek (Atomic & Unik)",
    primaryKey: "seqYear",
    columns: [
      { name: "seqYear", sqlType: "INT NOT NULL PRIMARY KEY", kind: "number" },
      { name: "lastSequence", sqlType: "INT NOT NULL DEFAULT 0", kind: "number" },
      { name: "updatedAt", sqlType: "VARCHAR(64) NULL", kind: "string" }
    ]
  }
];
var TABLE_DEF_MAP = new Map(TABLE_DEFINITIONS.map((t) => [t.table, t]));
var buildCreateTableSql = (def) => {
  const lines = def.columns.map((c) => `  \`${c.name}\` ${c.sqlType}`);
  if (def.indexes && def.indexes.length > 0) {
    lines.push(...def.indexes.map((idx) => `  ${idx}`));
  }
  return `CREATE TABLE IF NOT EXISTS \`${def.table}\` (
${lines.join(",\n")}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
};
var FULL_MYSQL_SCHEMA_SQL = [
  "-- ============================================================================",
  "-- SKEMA DATABASE LENGKAP MYSQL / MARIADB UNTUK NDTAXANDLAW KEMITRAAN (14 TABEL)",
  "-- Kompatibel dengan MySQL 5.7+, MySQL 8.0+, & MariaDB 10.2+ (cPanel / VPS)",
  "-- Aman dijalankan berulang kali (IF NOT EXISTS)",
  "-- ============================================================================",
  "",
  "SET NAMES utf8mb4;",
  "SET FOREIGN_KEY_CHECKS = 0;",
  "",
  ...TABLE_DEFINITIONS.map((def, i) => `-- ${i + 1}. TABEL ${def.table.toUpperCase()} (${def.label})
${buildCreateTableSql(def)}
`),
  "SET FOREIGN_KEY_CHECKS = 1;"
].join("\n");
var serializeValue = (col, value) => {
  if (value === void 0 || value === null) return null;
  if (col.kind === "json") {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  if (col.kind === "boolean") {
    return value ? 1 : 0;
  }
  if (col.kind === "number") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};
var deserializeRow = (def, raw) => {
  const out = {};
  for (const col of def.columns) {
    if (!(col.name in raw)) continue;
    const val = raw[col.name];
    if (val === null || val === void 0) {
      if (col.kind === "boolean") {
        if (col.name === "emailVerified" || col.name === "isRead" || col.name === "isDeleted" || col.name === "isBillingDue") {
          out[col.name] = false;
        } else if (col.name === "isActive") {
          out[col.name] = true;
        }
      } else {
        out[col.name] = void 0;
      }
      continue;
    }
    if (col.kind === "json") {
      if (typeof val === "string") {
        try {
          out[col.name] = JSON.parse(val);
        } catch {
          out[col.name] = val;
        }
      } else {
        out[col.name] = val;
      }
    } else if (col.kind === "boolean") {
      out[col.name] = Boolean(Number(val));
    } else if (col.kind === "number") {
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
var ensureMysqlSchema = async () => {
  const pool = getMysqlPool();
  const cfg = getMysqlConfig();
  if (!pool || !cfg.isConfigured) {
    return {
      success: false,
      createdTables: [],
      addedColumns: [],
      message: "Kredensial MySQL (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE) belum dikonfigurasi di file .env."
    };
  }
  const createdTables = [];
  const addedColumns = [];
  try {
    const [existingTablesRows] = await pool.query(
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
        const [colRows] = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [cfg.database, def.table]
        );
        const existingCols = new Set(colRows.map((c) => String(c.COLUMN_NAME).toLowerCase()));
        for (const col of def.columns) {
          if (!existingCols.has(col.name.toLowerCase())) {
            const alterType = col.sqlType.replace(/\bPRIMARY KEY\b/gi, "").replace(/\bNOT NULL\b/gi, "NULL");
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
      message: createdTables.length === 0 && addedColumns.length === 0 ? `Seluruh ${TABLE_DEFINITIONS.length} tabel & kolom MySQL sudah lengkap dan sinkron.` : `Skema MySQL berhasil diperbarui (${createdTables.length} tabel baru, ${addedColumns.length} kolom tambahan).`
    };
  } catch (err) {
    return {
      success: false,
      createdTables,
      addedColumns,
      message: `Gagal menginisialisasi skema MySQL: ${err?.message || "Unknown error"}`
    };
  }
};
var MysqlTableQueryBuilder = class {
  constructor(tableName) {
    this.op = "select";
    this.selectCols = "*";
    this.payloadRows = [];
    this.updateObj = {};
    this.wheres = [];
    this.orderBy = null;
    this.limitCount = null;
    this.singleMode = "none";
    const def = TABLE_DEF_MAP.get(tableName);
    if (!def) {
      throw new Error(`Tabel MySQL tidak dikenal: ${tableName}`);
    }
    this.tableDef = def;
    this.colMap = new Map(def.columns.map((c) => [c.name, c]));
  }
  select(columns = "*") {
    this.op = "select";
    this.selectCols = columns;
    return this;
  }
  insert(rows) {
    this.op = "insert";
    this.payloadRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows, _options) {
    this.op = "upsert";
    this.payloadRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(values) {
    this.op = "update";
    this.updateObj = values || {};
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  assertColumn(col) {
    if (!this.colMap.has(col)) {
      throw new Error(`Kolom "${col}" tidak terdaftar pada tabel "${this.tableDef.table}"`);
    }
    return col;
  }
  eq(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: "=", value });
    return this;
  }
  neq(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: "!=", value });
    return this;
  }
  lt(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: "<", value });
    return this;
  }
  lte(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: "<=", value });
    return this;
  }
  gt(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: ">", value });
    return this;
  }
  gte(column, value) {
    this.wheres.push({ column: this.assertColumn(column), op: ">=", value });
    return this;
  }
  in(column, values) {
    this.wheres.push({ column: this.assertColumn(column), op: "IN", value: Array.isArray(values) ? values : [] });
    return this;
  }
  order(column, opts) {
    this.orderBy = {
      column: this.assertColumn(column),
      ascending: opts?.ascending !== false
    };
    return this;
  }
  limit(n) {
    this.limitCount = Math.max(0, Math.floor(Number(n) || 0));
    return this;
  }
  single() {
    this.singleMode = "single";
    this.limitCount = 1;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    this.limitCount = 1;
    return this;
  }
  buildWhereSql() {
    if (this.wheres.length === 0) return { sql: "", params: [] };
    const clauses = [];
    const params = [];
    for (const w of this.wheres) {
      const colDef = this.colMap.get(w.column);
      if (w.op === "IN") {
        const arr = Array.isArray(w.value) ? w.value : [];
        if (arr.length === 0) {
          clauses.push("1 = 0");
        } else {
          clauses.push(`\`${w.column}\` IN (${arr.map(() => "?").join(", ")})`);
          params.push(...arr.map((v) => serializeValue(colDef, v)));
        }
      } else if (w.value === null) {
        clauses.push(w.op === "=" ? `\`${w.column}\` IS NULL` : `\`${w.column}\` IS NOT NULL`);
      } else {
        clauses.push(`\`${w.column}\` ${w.op} ?`);
        params.push(serializeValue(colDef, w.value));
      }
    }
    return { sql: ` WHERE ${clauses.join(" AND ")}`, params };
  }
  async execute() {
    const pool = getMysqlPool();
    if (!pool) {
      return { data: null, error: { message: "MySQL belum dikonfigurasi di file .env." } };
    }
    const tbl = `\`${this.tableDef.table}\``;
    try {
      if (this.op === "select") {
        let colsSql = "*";
        if (this.selectCols && this.selectCols.trim() !== "*") {
          const requested = this.selectCols.split(",").map((s) => s.trim().replace(/^["'`]|["'`]$/g, "")).filter((s) => this.colMap.has(s));
          if (requested.length > 0) {
            colsSql = requested.map((c) => `\`${c}\``).join(", ");
          }
        }
        const { sql: whereSql, params } = this.buildWhereSql();
        const orderSql = this.orderBy ? ` ORDER BY \`${this.orderBy.column}\` ${this.orderBy.ascending ? "ASC" : "DESC"}` : "";
        const limitSql = this.limitCount !== null ? ` LIMIT ${this.limitCount}` : "";
        const [rows] = await pool.query(
          `SELECT ${colsSql} FROM ${tbl}${whereSql}${orderSql}${limitSql}`,
          params
        );
        const mapped = rows.map((r) => deserializeRow(this.tableDef, r));
        if (this.singleMode === "maybeSingle") {
          return { data: mapped.length > 0 ? mapped[0] : null, error: null };
        }
        if (this.singleMode === "single") {
          if (mapped.length === 0) {
            return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          }
          return { data: mapped[0], error: null };
        }
        return { data: mapped, error: null };
      }
      if (this.op === "insert" || this.op === "upsert") {
        const cleanRows = this.payloadRows.filter((r) => r && typeof r === "object");
        if (cleanRows.length === 0) {
          return { data: [], error: null };
        }
        const colNamesSet = /* @__PURE__ */ new Set();
        for (const row of cleanRows) {
          for (const key of Object.keys(row)) {
            if (this.colMap.has(key) && row[key] !== void 0) {
              colNamesSet.add(key);
            }
          }
        }
        const colNames = Array.from(colNamesSet);
        if (colNames.length === 0) {
          return { data: [], error: null };
        }
        const CHUNK_SIZE = 50;
        const colsHeader = colNames.map((c) => `\`${c}\``).join(", ");
        const pk = this.tableDef.primaryKey;
        const updateCols = colNames.filter((c) => c !== pk);
        const onDupSql = this.op === "upsert" ? updateCols.length > 0 ? ` ON DUPLICATE KEY UPDATE ${updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(", ")}` : ` ON DUPLICATE KEY UPDATE \`${pk}\` = \`${pk}\`` : "";
        for (let i = 0; i < cleanRows.length; i += CHUNK_SIZE) {
          const chunk = cleanRows.slice(i, i + CHUNK_SIZE);
          const valueGroups = [];
          const params = [];
          for (const row of chunk) {
            const placeholders = [];
            for (const cName of colNames) {
              const colDef = this.colMap.get(cName);
              placeholders.push("?");
              params.push(serializeValue(colDef, row[cName]));
            }
            valueGroups.push(`(${placeholders.join(", ")})`);
          }
          const sql = `INSERT INTO ${tbl} (${colsHeader}) VALUES ${valueGroups.join(", ")}${onDupSql}`;
          await pool.query(sql, params);
        }
        return { data: cleanRows, error: null };
      }
      if (this.op === "update") {
        const entries = Object.entries(this.updateObj).filter(
          ([k, v]) => this.colMap.has(k) && v !== void 0 && k !== this.tableDef.primaryKey
        );
        if (entries.length === 0) {
          return { data: [], error: null };
        }
        const setClauses = [];
        const params = [];
        for (const [colName, val] of entries) {
          const colDef = this.colMap.get(colName);
          setClauses.push(`\`${colName}\` = ?`);
          params.push(serializeValue(colDef, val));
        }
        const { sql: whereSql, params: whereParams } = this.buildWhereSql();
        await pool.query(`UPDATE ${tbl} SET ${setClauses.join(", ")}${whereSql}`, [...params, ...whereParams]);
        return { data: [this.updateObj], error: null };
      }
      if (this.op === "delete") {
        const { sql: whereSql, params } = this.buildWhereSql();
        await pool.query(`DELETE FROM ${tbl}${whereSql}`, params);
        return { data: [], error: null };
      }
      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err?.sqlMessage || err?.message || "MySQL query error",
          code: err?.code
        }
      };
    }
  }
  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
};
var mysqlDb = {
  from: (table) => new MysqlTableQueryBuilder(table)
};
var testMysqlConnection = async () => {
  const cfg = getMysqlConfig();
  if (!cfg.isConfigured) {
    return {
      success: false,
      isConfigured: false,
      message: "Variabel MYSQL_HOST, MYSQL_USER, dan MYSQL_DATABASE belum dikonfigurasi di file .env hosting/server Anda.",
      tablesFound: 0,
      tableChecks: TABLE_DEFINITIONS.map((t) => ({
        table: t.table,
        label: t.label,
        exists: false,
        missingColumns: t.columns.map((c) => c.name)
      })),
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL
    };
  }
  const pool = getMysqlPool();
  if (!pool) {
    return {
      success: false,
      isConfigured: false,
      message: "Pool koneksi MySQL tidak dapat diinisialisasi.",
      tablesFound: 0,
      tableChecks: [],
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL
    };
  }
  try {
    const [verRows] = await pool.query("SELECT VERSION() AS ver");
    const serverVersion = verRows?.[0]?.ver ? String(verRows[0].ver) : "MySQL";
    const [tableRows] = await pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );
    const existingTables = new Set(tableRows.map((r) => String(r.TABLE_NAME).toLowerCase()));
    const [colRows] = await pool.query(
      `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`,
      [cfg.database]
    );
    const colsByTable = /* @__PURE__ */ new Map();
    for (const r of colRows) {
      const tName = String(r.TABLE_NAME).toLowerCase();
      if (!colsByTable.has(tName)) colsByTable.set(tName, /* @__PURE__ */ new Set());
      colsByTable.get(tName).add(String(r.COLUMN_NAME).toLowerCase());
    }
    const tableChecks = [];
    const migrationSnippets = [];
    let tablesFound = 0;
    for (const def of TABLE_DEFINITIONS) {
      const exists = existingTables.has(def.table.toLowerCase());
      if (!exists) {
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: false,
          missingColumns: []
        });
        migrationSnippets.push(`-- Buat tabel baru: ${def.table}
${buildCreateTableSql(def)}`);
      } else {
        tablesFound++;
        const existingCols = colsByTable.get(def.table.toLowerCase()) || /* @__PURE__ */ new Set();
        const missingColumns = [];
        for (const col of def.columns) {
          if (!existingCols.has(col.name.toLowerCase())) {
            missingColumns.push(col.name);
            const alterType = col.sqlType.replace(/\bPRIMARY KEY\b/gi, "").replace(/\bNOT NULL\b/gi, "NULL");
            migrationSnippets.push(`ALTER TABLE \`${def.table}\` ADD COLUMN \`${col.name}\` ${alterType};`);
          }
        }
        let rowCount = 0;
        try {
          const [cntRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${def.table}\``);
          rowCount = Number(cntRows?.[0]?.cnt || 0);
        } catch {
        }
        tableChecks.push({
          table: def.table,
          label: def.label,
          exists: true,
          missingColumns,
          rowCount
        });
      }
    }
    const hasPendingMigration = migrationSnippets.length > 0;
    const migrationSql = hasPendingMigration ? [
      "-- ============================================================================",
      "-- QUERY UPDATE TABEL & KOLOM BARU MYSQL NDTAXANDLAW",
      "-- Jalankan di phpMyAdmin / MySQL CLI atau klik tombol Auto-Sinkronkan Tabel",
      "-- ============================================================================",
      "",
      ...migrationSnippets
    ].join("\n\n") : `-- \u2705 Seluruh ${TABLE_DEFINITIONS.length} tabel & kolom di database MySQL "${cfg.database}" sudah lengkap dan up-to-date!`;
    return {
      success: tablesFound > 0,
      isConfigured: true,
      serverVersion,
      message: tablesFound === TABLE_DEFINITIONS.length && !hasPendingMigration ? `Koneksi ke MySQL (${serverVersion}) berhasil aktif! Seluruh ${tablesFound}/${TABLE_DEFINITIONS.length} tabel & kolom sudah sinkron.` : tablesFound === 0 ? `Terhubung ke server MySQL (${serverVersion}), namun belum ada tabel aplikasi. Klik "Auto-Buat 14 Tabel MySQL" untuk membuat seluruh tabel secara otomatis.` : `Terhubung ke MySQL (${serverVersion}) \u2014 ${tablesFound}/${TABLE_DEFINITIONS.length} tabel aktif, terdapat tabel/kolom baru yang siap disinkronkan.`,
      tablesFound,
      tableChecks,
      hasPendingMigration,
      migrationSql,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      message: `Gagal terhubung ke MySQL (${cfg.host}:${cfg.port}/${cfg.database}): ${err?.message || "Connection refused"}`,
      tablesFound: 0,
      tableChecks: [],
      hasPendingMigration: true,
      migrationSql: FULL_MYSQL_SCHEMA_SQL,
      fullSchemaSql: FULL_MYSQL_SCHEMA_SQL
    };
  }
};
var fetchAllRowsFromSupabaseTable = async (supabaseUrl, supabaseKey, table) => {
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const PAGE_SIZE = 1e3;
  const allRows = [];
  let offset = 0;
  while (true) {
    const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: "count=exact"
      }
    });
    if (res.status === 404 || res.status === 400) {
      const txt = await res.text().catch(() => "");
      if (txt.includes("does not exist") || txt.includes("Could not find the table") || txt.includes("PGRST205")) {
        return { rows: [], error: "Tabel belum ada di Supabase (dilewati)" };
      }
      return { rows: [], error: `HTTP ${res.status}: ${txt.slice(0, 180)}` };
    }
    if (res.status === 416) {
      break;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { rows: [], error: `HTTP ${res.status}: ${txt.slice(0, 180)}` };
    }
    const batch = await res.json();
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
var migrateFromSupabaseToMysql = async (params) => {
  const supabaseUrl = (params.supabaseUrl || "").trim();
  const supabaseKey = (params.supabaseKey || "").trim();
  const mode = params.mode === "replace" ? "replace" : "merge";
  const dryRun = Boolean(params.dryRun);
  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      dryRun,
      mode,
      totalSourceRows: 0,
      totalMigratedRows: 0,
      tables: [],
      message: "URL Supabase dan Service Role Key / API Key wajib diisi untuk menarik data produksi.",
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
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
        message: "Koneksi MySQL belum aktif. Pastikan MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE sudah terpasang di .env.",
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
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
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  const reports = [];
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
        const isMissingTable = fetchErr.includes("dilewati");
        reports.push({
          table: def.table,
          label: def.label,
          sourceCount: 0,
          migratedCount: 0,
          mysqlFinalCount: 0,
          status: isMissingTable ? "skipped" : "error",
          error: fetchErr
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
          status: "ok"
        });
        continue;
      }
      if (mode === "replace") {
        await pool.query(`DELETE FROM \`${def.table}\``);
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
            status: "error",
            error: upErr.message
          });
          continue;
        }
        migratedCount = rows.length;
        totalMigratedRows += migratedCount;
      }
      const [cntRows] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${def.table}\``);
      const mysqlFinalCount = Number(cntRows?.[0]?.cnt || 0);
      reports.push({
        table: def.table,
        label: def.label,
        sourceCount: rows.length,
        migratedCount,
        mysqlFinalCount,
        status: "ok"
      });
    } catch (err) {
      hardErrors++;
      reports.push({
        table: def.table,
        label: def.label,
        sourceCount: 0,
        migratedCount: 0,
        mysqlFinalCount: 0,
        status: "error",
        error: err?.message || "Gagal membaca/menulis tabel"
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
    message: dryRun ? hardErrors === 0 ? `Cek data Supabase berhasil! Ditemukan total ${totalSourceRows.toLocaleString("id-ID")} baris data di ${TABLE_DEFINITIONS.length} tabel yang siap dimigrasikan ke MySQL.` : `Pengecekan selesai dengan ${hardErrors} error tabel. Periksa URL & Service Role Key Supabase Anda.` : hardErrors === 0 ? `Migrasi Supabase -> MySQL SUKSES 100%! Total ${totalMigratedRows.toLocaleString("id-ID")} baris data dari ${TABLE_DEFINITIONS.length} tabel berhasil dipindahkan ke MySQL (${mode === "replace" ? "Mode Replace" : "Mode Merge Aman"}).` : `Migrasi selesai dengan ${hardErrors} kendala pada beberapa tabel (${totalMigratedRows.toLocaleString("id-ID")} baris berhasil masuk MySQL).`,
    completedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
};
var escapeSqlValue = (val) => {
  if (val === null || val === void 0) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return `'${str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "")}'`;
};
var generateMysqlSqlDump = async () => {
  const pool = getMysqlPool();
  if (!pool || !isMysqlConfigured()) {
    return {
      success: false,
      sql: "",
      counts: {},
      error: "Koneksi MySQL belum aktif."
    };
  }
  const lines = [
    "-- ============================================================================",
    `-- BACKUP FULL SQL DATABASE MYSQL NDTAXANDLAW (${(/* @__PURE__ */ new Date()).toISOString()})`,
    "-- ============================================================================",
    "",
    FULL_MYSQL_SCHEMA_SQL,
    "",
    "SET FOREIGN_KEY_CHECKS = 0;",
    ""
  ];
  const counts = {};
  try {
    for (const def of TABLE_DEFINITIONS) {
      const [rows] = await pool.query(`SELECT * FROM \`${def.table}\``);
      counts[def.table] = rows.length;
      if (rows.length === 0) continue;
      lines.push(`-- Data tabel \`${def.table}\` (${rows.length} baris)`);
      const colNames = def.columns.map((c) => c.name).filter((c) => c in rows[0]);
      const colsHeader = colNames.map((c) => `\`${c}\``).join(", ");
      const pk = def.primaryKey;
      const updateCols = colNames.filter((c) => c !== pk);
      const onDup = updateCols.length > 0 ? ` ON DUPLICATE KEY UPDATE ${updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(", ")}` : "";
      for (const row of rows) {
        const vals = colNames.map((c) => escapeSqlValue(row[c])).join(", ");
        lines.push(`INSERT INTO \`${def.table}\` (${colsHeader}) VALUES (${vals})${onDup};`);
      }
      lines.push("");
    }
    lines.push("SET FOREIGN_KEY_CHECKS = 1;");
    return { success: true, sql: lines.join("\n"), counts };
  } catch (err) {
    return {
      success: false,
      sql: "",
      counts,
      error: err?.message || "Gagal membuat SQL dump MySQL"
    };
  }
};
var _prospectSeqTableEnsured = false;
var _prospectUniqueIdxEnsured = false;
var ensureProspectSequenceTableMysql = async (pool) => {
  if (_prospectSeqTableEnsured) return;
  const seqDef = TABLE_DEF_MAP.get("prospect_letter_sequences");
  if (seqDef) {
    await pool.query(buildCreateTableSql(seqDef));
  }
  _prospectSeqTableEnsured = true;
};
var ensureProspectLetterNumberUniqueIndexMysql = async () => {
  if (_prospectUniqueIdxEnsured) return;
  const pool = getMysqlPool();
  const cfg = getMysqlConfig();
  if (!pool || !cfg.isConfigured) return;
  try {
    await ensureProspectSequenceTableMysql(pool);
    const [idxRows] = await pool.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'prospect_letters' AND INDEX_NAME = 'uniq_prospect_letters_number'`,
      [cfg.database]
    );
    if (idxRows.length === 0) {
      const [dupRows] = await pool.query(
        `SELECT letterNumber, COUNT(*) AS cnt FROM prospect_letters GROUP BY letterNumber HAVING cnt > 1 LIMIT 1`
      );
      if (dupRows.length === 0) {
        await pool.query(
          "ALTER TABLE `prospect_letters` ADD UNIQUE INDEX `uniq_prospect_letters_number` (`letterNumber`)"
        );
      }
    }
    _prospectUniqueIdxEnsured = true;
  } catch (err) {
    console.warn("[MySQL Prospect Unique Index Warning]", err);
  }
};
var syncProspectSequenceFloorMysql = async (year, minSeq) => {
  const pool = getMysqlPool();
  if (!pool || !isMysqlConfigured()) return;
  const safeYear = Math.floor(Number(year));
  const safeMin = Math.max(0, Math.floor(Number(minSeq) || 0));
  if (!Number.isFinite(safeYear) || safeYear < 2e3 || safeYear > 9999 || safeMin <= 0) return;
  try {
    await ensureProspectSequenceTableMysql(pool);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    await pool.query(
      `INSERT INTO \`prospect_letter_sequences\` (\`seqYear\`, \`lastSequence\`, \`updatedAt\`)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`lastSequence\` = GREATEST(\`lastSequence\`, VALUES(\`lastSequence\`)),
         \`updatedAt\` = VALUES(\`updatedAt\`)`,
      [safeYear, safeMin, nowIso]
    );
  } catch (err) {
    console.warn("[MySQL Prospect Sequence Floor Sync Warning]", err);
  }
};
var allocateAtomicProspectSequenceMysql = async (year, minFloorSeq = 0) => {
  const pool = getMysqlPool();
  if (!pool || !isMysqlConfigured()) return null;
  const safeYear = Math.floor(Number(year));
  const safeFloor = Math.max(0, Math.floor(Number(minFloorSeq) || 0));
  if (!Number.isFinite(safeYear) || safeYear < 2e3 || safeYear > 9999) {
    throw new Error("Tahun urutan surat tidak valid.");
  }
  await ensureProspectSequenceTableMysql(pool);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    await conn.query(
      `INSERT IGNORE INTO \`prospect_letter_sequences\` (\`seqYear\`, \`lastSequence\`, \`updatedAt\`)
       VALUES (?, ?, ?)`,
      [safeYear, safeFloor, nowIso]
    );
    const [lockedRows] = await conn.query(
      `SELECT \`lastSequence\` FROM \`prospect_letter_sequences\` WHERE \`seqYear\` = ? FOR UPDATE`,
      [safeYear]
    );
    const lockedLastSeq = Number(lockedRows?.[0]?.lastSequence || 0);
    let dbMaxSeq = 0;
    try {
      const [maxRows] = await conn.query(
        `SELECT COALESCE(MAX(GREATEST(
           COALESCE(\`sequenceNumber\`, 0),
           CAST(SUBSTRING_INDEX(\`letterNumber\`, '/', 1) AS UNSIGNED)
         )), 0) AS maxSeq
         FROM \`prospect_letters\`
         WHERE \`letterDate\` LIKE ? OR \`letterNumber\` LIKE ?`,
        [`${safeYear}-%`, `%/${safeYear}`]
      );
      dbMaxSeq = Number(maxRows?.[0]?.maxSeq || 0);
    } catch {
      dbMaxSeq = 0;
    }
    const nextSeq = Math.max(lockedLastSeq, dbMaxSeq, safeFloor) + 1;
    await conn.query(
      `UPDATE \`prospect_letter_sequences\`
       SET \`lastSequence\` = ?, \`updatedAt\` = ?
       WHERE \`seqYear\` = ?`,
      [nextSeq, nowIso, safeYear]
    );
    await conn.commit();
    return nextSeq;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
    }
    console.warn("[MySQL Atomic Prospect Sequence Warning]", err);
    return null;
  } finally {
    conn.release();
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

// src/types.ts
var DEFAULT_SPECIALIZATION_LABEL = "Bidang Keahlian / Profesi Mitra";
var DEFAULT_BANK_OPTIONS = [
  "Bank Central Asia (BCA)",
  "Bank Mandiri",
  "Bank Rakyat Indonesia (BRI)",
  "Bank Negara Indonesia (BNI)",
  "Bank Syariah Indonesia (BSI)",
  "CIMB Niaga"
];
var DEFAULT_MITRA_FORM_FIELDS = [
  {
    id: "mitra-def-fullName",
    systemKey: "fullName",
    section: "profile",
    isDefault: true,
    label: "Nama Lengkap & Gelar",
    type: "text",
    placeholder: "Nama lengkap",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-email",
    systemKey: "email",
    section: "profile",
    isDefault: true,
    label: "Email Resmi",
    type: "text",
    placeholder: "nama@email.com",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-phone",
    systemKey: "phone",
    section: "profile",
    isDefault: true,
    label: "No. WhatsApp Aktif",
    type: "text",
    placeholder: "0812xxxx",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-nik",
    systemKey: "nik",
    section: "profile",
    isDefault: true,
    label: "Nomor KTP / NIK",
    type: "text",
    placeholder: "16 digit NIK",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-ktpFile",
    systemKey: "ktpFile",
    section: "profile",
    isDefault: true,
    label: "Upload File KTP / NPWP",
    type: "file",
    placeholder: "JPG, PNG, atau PDF",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-specialization",
    systemKey: "specialization",
    section: "profile",
    isDefault: true,
    label: DEFAULT_SPECIALIZATION_LABEL,
    type: "select",
    placeholder: "Pilih keahlian",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-bankName",
    systemKey: "bankName",
    section: "bank",
    isDefault: true,
    label: "Nama Bank Pencairan Komisi",
    type: "select",
    options: DEFAULT_BANK_OPTIONS,
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-accountNumber",
    systemKey: "accountNumber",
    section: "bank",
    isDefault: true,
    label: "Nomor Rekening Bank",
    type: "number",
    placeholder: "Nomor rekening",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-accountHolder",
    systemKey: "accountHolder",
    section: "bank",
    isDefault: true,
    label: "Nama Pemilik Rekening",
    type: "text",
    placeholder: "Nama pemilik rekening",
    required: true,
    isActive: true
  }
];
function getMitraKtpFileUrl(mitra) {
  if (!mitra) return "";
  const bankMeta = mitra.bankDetails || {};
  const direct = mitra.ktpFileUrl || bankMeta.__ktpFileUrl;
  if (direct && typeof direct === "string" && direct.trim() !== "" && direct.trim() !== "-") {
    return direct.trim();
  }
  if (mitra.customFields) {
    for (const [k, v] of Object.entries(mitra.customFields)) {
      if (!v || typeof v !== "string") continue;
      const kl = k.toLowerCase();
      if ((k === "mitra-def-ktpFile" || kl.includes("ktp") || kl.includes("npwp")) && v.trim() !== "" && v.trim() !== "-") {
        return v.trim();
      }
    }
  }
  return "";
}
function getMissingMitraFields(mitra, settings) {
  if (!mitra || mitra.id === "mitra-empty" || mitra.isLoadingFallback) return [];
  const fields = resolveMitraFormFields(settings);
  const missing = [];
  const getField = (key) => fields.find((f) => f.systemKey === key);
  const isFieldRequiredAndActive = (key, defaultRequired = true) => {
    const found = getField(key);
    if (!found) return defaultRequired;
    return found.isActive !== false && found.required !== false;
  };
  if (isFieldRequiredAndActive("nik") && (!mitra.nik || mitra.nik.trim() === "" || mitra.nik.trim() === "-" || mitra.nik.trim() === "3201000000000000")) {
    missing.push(getField("nik")?.label || "NIK KTP (16 Digit)");
  }
  if (isFieldRequiredAndActive("phone") && (!mitra.phone || mitra.phone.trim() === "" || mitra.phone.trim() === "-")) {
    missing.push(getField("phone")?.label || "Nomor WhatsApp");
  }
  if (isFieldRequiredAndActive("ktpFile") && !getMitraKtpFileUrl(mitra)) {
    missing.push(getField("ktpFile")?.label || "Upload File KTP / NPWP");
  }
  if (isFieldRequiredAndActive("bankName") && (!mitra.bankDetails?.bankName || mitra.bankDetails.bankName.trim() === "" || mitra.bankDetails.bankName.trim() === "-")) {
    missing.push(getField("bankName")?.label || "Nama Bank");
  }
  if (isFieldRequiredAndActive("accountNumber") && (!mitra.bankDetails?.accountNumber || mitra.bankDetails.accountNumber.trim() === "" || mitra.bankDetails.accountNumber.trim() === "-" || !/^\d+$/.test(mitra.bankDetails.accountNumber.trim()))) {
    missing.push(getField("accountNumber")?.label || "Nomor Rekening");
  }
  if (isFieldRequiredAndActive("accountHolder") && (!mitra.bankDetails?.accountHolder || mitra.bankDetails.accountHolder.trim() === "" || mitra.bankDetails.accountHolder.trim() === "-")) {
    missing.push(getField("accountHolder")?.label || "Nama Pemilik Rekening");
  }
  for (const f of fields) {
    if (f.systemKey || f.isActive === false || !f.required) continue;
    const val = mitra.customFields?.[f.label] || mitra.customFields?.[f.id] || mitra.bankDetails?.customBankFields?.[f.label] || mitra.bankDetails?.customBankFields?.[f.id];
    if (!val || String(val).trim() === "" || String(val).trim() === "-") {
      missing.push(f.label);
    }
  }
  return missing;
}
function isMitraDataIncomplete(mitra, settings) {
  return getMissingMitraFields(mitra, settings).length > 0;
}
function resolveServicePricingType(service) {
  if (!service) return "monthly_subscription";
  const nameLower = (service.name || "").toLowerCase();
  if (nameLower.includes("(bulanan)")) {
    return "monthly_subscription";
  }
  if (nameLower.includes("(per projek)") || nameLower.includes("(per proyek)") || nameLower.includes("(case by case)") || nameLower.includes("(case-by-case)")) {
    return "case_by_case";
  }
  if (nameLower.includes("(tahunan)")) {
    return "annual_subscription";
  }
  return service.pricingType || "case_by_case";
}
var OFFICIAL_ND_SERVICES = [
  {
    id: "srv-nd-01",
    name: "Jasa Perpajakan (Bulanan)",
    category: "Kepatuhan Pajak",
    defaultPrice: 5e6,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Layanan kepatuhan, administrasi, dan pelaporan perpajakan rutin bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-02",
    name: "Jasa Akuntansi (Bulanan)",
    category: "Laporan Keuangan",
    defaultPrice: 5e6,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Layanan pembukuan dan penyusunan laporan keuangan akuntansi rutin bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-03",
    name: "Jasa Keuangan (Bulanan)",
    category: "Konsultasi Finansial",
    defaultPrice: 5e6,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Layanan manajemen, analisis, dan advisori keuangan perusahaan rutin bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-04",
    name: "Jasa Akuntansi & Perpajakan (Bulanan)",
    category: "Kepatuhan Pajak",
    defaultPrice: 75e5,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Paket terpadu pembukuan akuntansi dan kepatuhan perpajakan rutin bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-05",
    name: "Jasa Keuangan, Akuntansi, & Perpajakan (Bulanan)",
    category: "Laporan Keuangan",
    defaultPrice: 1e7,
    pricingType: "monthly_subscription",
    commissionRate: 20,
    description: "Paket komprehensif pengelolaan keuangan, akuntansi, dan perpajakan rutin bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-06",
    name: "Jasa Hukum (Bulanan)",
    category: "Legalitas Korporasi",
    defaultPrice: 75e5,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Layanan retainer konsultan hukum korporasi dan pendampingan legal bulanan.",
    isActive: true
  },
  {
    id: "srv-nd-07",
    name: "Jasa Lainnya (Bulanan)",
    category: "Konsultasi Finansial",
    defaultPrice: 5e6,
    pricingType: "monthly_subscription",
    commissionRate: 15,
    description: "Layanan kustom berlangganan bulanan sesuai kebutuhan spesifik klien.",
    isActive: true
  },
  {
    id: "srv-nd-08",
    name: "Jasa Perpajakan (Per Projek)",
    category: "Kepatuhan Pajak",
    defaultPrice: 15e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Penanganan kasus atau pekerjaan perpajakan berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-09",
    name: "Jasa Akuntansi (Per Projek)",
    category: "Laporan Keuangan",
    defaultPrice: 15e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Penyusunan atau rekonstruksi laporan akuntansi berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-10",
    name: "Jasa Keuangan (Per Projek)",
    category: "Konsultasi Finansial",
    defaultPrice: 2e7,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Advisori dan restrukturisasi keuangan berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-11",
    name: "Jasa Akuntansi & Perpajakan (Per Projek)",
    category: "Kepatuhan Pajak",
    defaultPrice: 25e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Penanganan terpadu akuntansi dan perpajakan berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-12",
    name: "Jasa Keuangan, Akuntansi & Perpajakan (Per Projek)",
    category: "Laporan Keuangan",
    defaultPrice: 35e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Solusi menyeluruh keuangan, akuntansi, dan perpajakan berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-13",
    name: "Jasa Hukum (Per Projek)",
    category: "Legalitas Korporasi",
    defaultPrice: 25e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Pendampingan hukum, litigasi, atau legalitas korporasi berbasis per projek (Case-by-Case).",
    isActive: true
  },
  {
    id: "srv-nd-14",
    name: "Jasa Lainnya (Per Projek)",
    category: "Konsultasi Finansial",
    defaultPrice: 15e6,
    pricingType: "case_by_case",
    commissionRate: 10,
    description: "Layanan profesional khusus berbasis per projek (Case-by-Case) sesuai kesepakatan.",
    isActive: true
  }
];
var LEGACY_PLACEHOLDER_UPGRADES = {
  "Contoh: Muhammad Reza, S.H., M.H.": "Nama lengkap",
  "0812-xxxx-xxxx": "0812xxxx",
  "0812-XXXX-XXXX": "0812xxxx",
  "16 digit NIK resmi": "16 digit NIK",
  "Unggah dokumen KTP atau NPWP (Format: JPG, JPEG, PNG, atau PDF)": "JPG, PNG, atau PDF",
  "Pilih Bidang Keahlian / Profesi Mitra": "Pilih keahlian",
  "Contoh: 8830192837": "Nomor rekening",
  "Harus sesuai buku tabungan": "Nama pemilik rekening",
  "Contoh: PT Surya Kencana Abadi": "Nama perusahaan",
  "Contoh: PT Sumber Pangan Makmur": "Nama perusahaan",
  "Contoh: Bpk. Bambang Gunawan (Direktur Keuangan)": "Nama PIC",
  "Contoh: Budi Santoso (Direktur)": "Nama PIC",
  "finance@suryakencana.co.id": "email@perusahaan.com",
  "finance@sumberpangan.com": "email@perusahaan.com",
  "Contoh: Klien membutuhkan pendampingan segera karena jatuh tempo SPT Badan tanggal 30 atau sedang menerima surat panggilan klarifikasi SP2DK dari KPP.": "Catatan kebutuhan...",
  "Contoh: Perlu pendampingan untuk membalas surat SP2DK atau persiapan audit laporan keuangan akhir tahun.": "Catatan kebutuhan..."
};
function normalizeShortPlaceholder(placeholder) {
  if (!placeholder) return placeholder;
  return LEGACY_PLACEHOLDER_UPGRADES[placeholder.trim()] || placeholder;
}
function resolveMitraFormFields(settings) {
  const existing = Array.isArray(settings?.mitraCustomFields) ? settings.mitraCustomFields : [];
  const specLabel = settings?.specializationLabel || DEFAULT_SPECIALIZATION_LABEL;
  const specEnabled = settings?.specializationEnabled !== false;
  const normalizeField = (f) => {
    const inferredSection = f.section || (f.systemKey === "bankName" || f.systemKey === "accountNumber" || f.systemKey === "accountHolder" ? "bank" : "profile");
    const nextPlaceholder = normalizeShortPlaceholder(f.placeholder);
    if (f.systemKey === "specialization") {
      return {
        ...f,
        placeholder: nextPlaceholder,
        section: inferredSection,
        label: f.label || specLabel,
        isActive: settings?.specializationEnabled !== void 0 ? specEnabled : f.isActive
      };
    }
    if (f.systemKey === "accountNumber") {
      return {
        ...f,
        placeholder: nextPlaceholder,
        type: f.type === "text" ? "number" : f.type || "number",
        section: inferredSection
      };
    }
    return {
      ...f,
      placeholder: nextPlaceholder,
      section: inferredSection
    };
  };
  const ensureDefaultKtpFileField = (list) => {
    const hasKtpFile = list.some(
      (f) => f.systemKey === "ktpFile" || f.id === "mitra-def-ktpFile"
    );
    if (hasKtpFile) return list;
    const defaultKtpField = DEFAULT_MITRA_FORM_FIELDS.find((f) => f.systemKey === "ktpFile");
    if (!defaultKtpField) return list;
    const nikIdx = list.findIndex((f) => f.systemKey === "nik" || f.id === "mitra-def-nik");
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
  const hasAnyDefault = existing.some((f) => Boolean(f.systemKey || f.isDefault));
  if (hasAnyDefault) {
    return ensureDefaultKtpFileField(existing.map(normalizeField));
  }
  const defaults = DEFAULT_MITRA_FORM_FIELDS.map((df) => {
    if (df.systemKey === "specialization") {
      return { ...df, label: specLabel, isActive: specEnabled };
    }
    return { ...df };
  });
  return [...defaults, ...existing.map(normalizeField)];
}
var DEFAULT_PROSPECT_LETTER_CONTENT = {
  city: "Jakarta",
  dateLine: "Jakarta, {{TANGGAL_SURAT}}",
  metaNomorLabel: "Nomor",
  nomorValue: "{{NOMOR_SURAT}}",
  metaSifatLabel: "Sifat",
  sifat: "Terbatas",
  metaLampiranLabel: "Lampiran",
  lampiran: "Satu set",
  metaPerihalLabel: "Perihal",
  perihal: "Pemberitahuan dan Penawaran",
  recipientBlock: "Kepada Yth\nPimpinan/Direksi {{NAMA_PERUSAHAAN}}\nAlamat: {{ALAMAT_PERUSAHAAN}}",
  greeting: "Dengan hormat,",
  introPara1: "Bersama ini kami sampaikan salam sejahtera untuk kita semua, karena telah diberi kesempatan untuk bisa menjalankan usaha dan memberikan penghidupan yang layak untuk banyak orang. Semoga kita diberikan keselamatan dan kesuksesan dalam menjalankan aktivitas sehari-hari. Aamiin.",
  introPara2: "Dalam rangka mendukung aktivitas usaha, memberikan bimbingan, dan membantu penyelesaian persoalan para pengusaha terkait isu keuangan, perpajakan, dan hukum, ND TAX AND LAW menyampaikan surat ini kepada {{NAMA_PERUSAHAAN}} sebagai bentuk kepedulian dan penawaran kerjasama yang saling menguntungkan.",
  sectionMainTitle: "KEWAJIBAN MENYUSUN LAPORAN KEUANGAN, KEWAJIBAN PERPAJAKAN, DAN KEWAJIBAN KETENAGAKERJAAN",
  section1Title: "Dasar Hukum Kewajiban Menyusun Laporan Keuangan:",
  section1Items: [
    {
      title: "Undang-Undang Tentang Perseroan Terbatas",
      bullets: [
        "Pasal 66, mengenai kewajiban menyusun laporan tahunan (didalamnya harus memuat laporan keuangan)."
      ]
    },
    {
      title: "Undang-Undang Tentang Ketentuan Umum dan Tata Cara Perpajakan",
      bullets: [
        "Pasal 28, mengenai kewajiban pembukuan/menyusun laporan keuangan dalam rangka menjalankan kewajiban perpajakan.",
        "Pasal 4, mengenai kewajiban melampirkan laporan keuangan dalam menyampaikan Surat Pemberitahuan Tahunan."
      ]
    },
    {
      title: "Peraturan Pemerintah Tentang Modal Dasar Perseroan Serta Pendaftaran Pendirian, Perubahan, dan Pembubaran Perseroan yang Memenuhi Kriteria Untuk Usaha Mikro dan Kecil.",
      bullets: [
        "Pasal 10, mengenai kewajiban membuat laporan keuangan dan menyampaikan kepada menteri paling lambat 6 bulan setelah akhir periode akuntansi berjalan."
      ]
    }
  ],
  section1Sanction: "Pelanggaran terhadap ketentuan tersebut dapat berupa sanksi administrasi, denda, pencabutan status badan hukum, sampai dengan sanksi pidana.",
  section2Title: "Dasar Hukum Kewajiban Perpajakan",
  section2Items: [
    {
      title: "Undang-Undang Tentang Pajak Penghasilan",
      bullets: [
        "Pasal 4 ayat (2), 15, 21, 22, 23, 26, dll, mengenai kewajiban melakukan pemotongan, penyetoran, dan pelaporan pajak penghasilan."
      ]
    },
    {
      title: "Undang-Undang Tentang Pajak Pertambahan Nilai",
      bullets: [
        "Pasal 3, mengenai kewajiban melaporkan usaha dan kewajiban memungut, menyetor, dan melaporkan pajak pertambahan nilai."
      ]
    },
    {
      title: "Undang-Undang Tentang Ketentuan Umum dan Tata Cara Perpajakan",
      bullets: [
        "Pasal 12, mengenai kewajiban membayar pajak dengan tidak menggantungkan adanya Surat Ketetapan Pajak.",
        "Pasal 3, mengenai kewajiban menyampaikan surat pemberitahuan dengan benar, lengkap, jelas, dan menandatanganinya.",
        "Pasal 39, mengenai sanksi pidana perpajakan."
      ]
    }
  ],
  section2Sanction: "Pelanggaran terhadap ketentuan perpajakan dapat berupa sanksi administrasi berupa denda, bunga hingga 24 bulan, sampai dengan sanksi pidana perpajakan.",
  section3Title: "Dasar Hukum Kewajiban Ketenagakerjaan",
  section3Items: [
    {
      title: "Undang-Undang Tentang Pelindungan Ketenagakerjaan",
      bullets: [
        "Pasal 137 dan Pasal 144, mengenai kewajiban membayar upah paling rendah sebesar upah minimum yang ditetapkan gubernur, serta ketentuan upah bagi usaha mikro dan kecil.",
        "Pasal 92, mengenai kewajiban membayar upah dan memberikan jaminan sosial kepada pekerja yang sedang dalam masa percobaan.",
        "Pasal 287 sampai dengan Pasal 290, mengenai sanksi pidana atas pelanggaran kewajiban pengupahan dan jaminan sosial."
      ]
    },
    {
      title: "Undang-Undang Tentang Badan Penyelenggara Jaminan Sosial",
      bullets: [
        "Pasal 15, mengenai kewajiban mendaftarkan diri dan seluruh pekerjanya sebagai peserta BPJS Kesehatan dan BPJS Ketenagakerjaan.",
        "Pasal 19, mengenai kewajiban memungut iuran yang menjadi beban pekerja dan menyetorkannya bersama iuran pemberi kerja."
      ]
    },
    {
      title: "Peraturan Pemerintah Tentang Pengupahan",
      bullets: [
        "Pasal 21, mengenai kewajiban menyusun struktur dan skala upah.",
        "Pasal 61, mengenai denda atas keterlambatan pembayaran upah."
      ]
    },
    {
      title: "Peraturan Menteri Ketenagakerjaan Tentang Tunjangan Hari Raya Keagamaan bagi Pekerja/Buruh di Perusahaan",
      bullets: [
        "Pasal 2 dan Pasal 5, mengenai kewajiban membayar THR kepada pekerja dengan masa kerja 1 bulan atau lebih, paling lambat 7 hari sebelum hari raya keagamaan."
      ]
    }
  ],
  section3Sanction: "Pelanggaran terhadap ketentuan ketenagakerjaan dapat berupa sanksi administrasi, denda, penghentian sementara kegiatan usaha, tidak mendapat pelayanan publik tertentu, sampai dengan sanksi pidana.",
  aboutTitle: "TENTANG ND TAX AND LAW",
  aboutPara: "ND Tax and Law adalah kantor konsultan perpajakan dan hukum dengan pengalaman lebih dari 15 tahun dan telah mendampingi lebih dari 100 wajib pajak dan pelaku usaha. Legalitas kami berdasarkan SK Kemenkumham AHU-0068631-AH.01.14, dan kami memiliki Izin praktik konsultan Pajak dan Advokat yang telah terdaftar resmi.",
  servicesTitle: "Layanan Yang Dapat Kami Berikan",
  servicesIntro: "Kami menyediakan empat layanan bulanan yang masing-masing tersedia hanya mulai 999 Ribu per bulan:",
  servicesItems: [
    {
      lead: "Jasa Perpajakan:",
      body: "analisis aspek pajak atas transaksi, penghitungan PPh 21/26, PPh 23, dan PPh 4 ayat (2), pembuatan bukti potong, faktur pajak, dan kode billing, pelaporan SPT Masa PPh 21/26, PPh Unifikasi, dan PPN, serta kertas kerja ekualisasi."
    },
    {
      lead: "Jasa Akuntansi:",
      body: "analisis dan dokumentasi transaksi, input jurnal, membuat buku besar, serta penyusunan laporan posisi keuangan, laba rugi, dan perubahan ekuitas setiap bulan."
    },
    {
      lead: "Jasa Keuangan:",
      body: "administrasi penagihan dan invoice, pembayaran supplier, gaji, dan operasional, rekap kas dan bank, pengelolaan utang-piutang, serta laporan realisasi anggaran."
    },
    {
      lead: "Jasa Legal:",
      body: "melakukan review dokumen bisnis, membuat dokumen kontrak/perjanjian, membuat opini hukum, melakukan somasi, memberi tanggapan somasi, investigasi kecurangan, perizinan, dan lain sebagainya."
    }
  ],
  servicesCaseNote: "Untuk kasus tertentu seperti SP2DK, pemeriksaan, keberatan, dan banding/gugatan di pengadilan, tersedia jasa konsultan per kasus. Besaran biaya setiap layanan ditentukan berdasarkan kompleksitas dan risiko kasusnya.",
  comparisonTitle: "Bahan Pertimbangan: Staf Internal dan Konsultan",
  comparisonIntro: "Bapak/Ibu dapat membandingkan kedua pilihan berikut ini.",
  comparisonHeaders: ["Komponen", "Staf Internal", "Konsultan Kami"],
  comparisonRows: [
    { component: "Biaya bulanan", internalStaff: "Gaji, mulai Rp3\u20136 juta", consultant: "Mulai 999 Ribu" },
    { component: "THR", internalStaff: "1 kali gaji per tahun", consultant: "Tidak ada" },
    { component: "BPJS Kes & BPJSTK", internalStaff: "Ditanggung perusahaan", consultant: "Tidak ada" },
    { component: "Pesangon atau kompensasi", internalStaff: "Ada saat hubungan kerja berakhir", consultant: "Tidak ada" },
    { component: "Fasilitas kerja", internalStaff: "Ruang, perangkat, dan aplikasi", consultant: "Tidak perlu disediakan" },
    { component: "Pembaruan peraturan", internalStaff: "Perlu pelatihan berkala", consultant: "Sudah Kompeten" }
  ],
  comparisonClosing: "Layanan kami dapat dipakai sebagai alternatif, atau sebagai pendamping staf internal yang sudah ada pada perusahaan untuk memastikan kepatuhannya.",
  consultTitle: "Konsultasi Awal Tanpa Biaya",
  consultPara: "Kami membuka kesempatan konsultasi awal tanpa biaya untuk membahas kondisi dan kebutuhan perusahaan. Bapak/Ibu dapat menghubungi kami melalui WhatsApp 082180744977, email business@ndtaxandlaw.com, atau mitra strategis resmi kami. Untuk profil perusahaan dan informasi lebih lanjut tersedia di www.ndtaxandlaw.com.",
  mitraBoxTitle: "Mitra Strategis",
  mitraBoxNameLabel: "Nama",
  mitraBoxNameValue: "{{NAMA_MITRA}}",
  mitraBoxIdLabel: "No. ID",
  mitraBoxIdValue: "{{ID_MITRA}}",
  mitraBoxPhoneLabel: "Whatsapp",
  mitraBoxPhoneValue: "{{WA_MITRA}}",
  mitraBoxEmailLabel: "Email",
  mitraBoxEmailValue: "{{EMAIL_MITRA}}",
  closingPara: "Demikian surat ini kami sampaikan. Atas perhatiannya, kami ucapkan terima kasih.",
  directorSignHeading: "Mengetahui,",
  directorFirmLabel: "ND TAX AND LAW",
  directorName: "Nurtiyas, S.E., M.Ak, BKP",
  directorTitle: "Direktur Utama",
  mitraSignHeading: "Hormat Kami,",
  mitraSignerLabel: "MITRA RESMI",
  mitraSignerName: "{{NAMA_MITRA}}",
  mitraRoleLabel: "Mitra Strategis",
  footerLeftTitle: "ND TAX AND LAW",
  footerLeftLines: [
    "KBIG OFFICE \u2013 Jl. Sawo Raya, Lampung",
    "Telepon: 021-86941220 / 0821-8074-4977",
    "Email: lampung@ndtaxandlaw.com",
    "Website: www.ndtaxandlaw.com"
  ],
  footerRightTitle: "ND TAX AND LAW",
  footerRightLines: [
    "Menara 165 Lantai 4, Jakarta Selatan",
    "Telepon: 021-86941220 / 0821-8074-4977",
    "Email: jakarta@ndtaxandlaw.com",
    "Website: www.ndtaxandlaw.com"
  ],
  marginTopMm: 40,
  marginBottomMm: 40,
  marginLeftMm: 30,
  marginRightMm: 30,
  paddingTopMm: 0,
  paddingBottomMm: 0,
  paddingLeftMm: 0,
  paddingRightMm: 0
};
function resolveProspectLetterContent(letterCustom, masterTemplate) {
  const mergeOne = (base, override) => {
    if (!override || typeof override !== "object") return base;
    const str = (v, fb) => typeof v === "string" && v.trim().length > 0 ? v : fb;
    const lawList = (v, fb) => Array.isArray(v) && v.length > 0 ? v.filter((item) => item && typeof item === "object").map((item) => ({
      title: String(item.title || "").trim(),
      bullets: Array.isArray(item.bullets) ? item.bullets.map((b) => String(b || "").trim()).filter(Boolean) : []
    })).filter((item) => item.title.length > 0) : fb;
    const serviceList = (v, fb) => Array.isArray(v) && v.length > 0 ? v.filter((item) => item && typeof item === "object").map((item) => ({
      lead: String(item.lead || "").trim(),
      body: String(item.body || "").trim()
    })).filter((item) => item.lead.length > 0 || item.body.length > 0) : fb;
    const compRows = (v, fb) => Array.isArray(v) && v.length > 0 ? v.filter((item) => item && typeof item === "object").map((item) => ({
      component: String(item.component || "").trim(),
      internalStaff: String(item.internalStaff || "").trim(),
      consultant: String(item.consultant || "").trim()
    })).filter((item) => item.component.length > 0) : fb;
    const strLines = (v, fb) => Array.isArray(v) && v.length > 0 ? v.map((line) => String(line || "").trim()).filter(Boolean) : fb;
    const headers = Array.isArray(override.comparisonHeaders) && override.comparisonHeaders.length === 3 ? [
      str(override.comparisonHeaders[0], base.comparisonHeaders[0]),
      str(override.comparisonHeaders[1], base.comparisonHeaders[1]),
      str(override.comparisonHeaders[2], base.comparisonHeaders[2])
    ] : base.comparisonHeaders;
    const resolvedCity = str(override.city, base.city);
    const hasCustomDateLine = typeof override.dateLine === "string" && override.dateLine.trim().length > 0;
    const hasCustomCityOnly = !hasCustomDateLine && typeof override.city === "string" && override.city.trim().length > 0;
    const resolvedDateLine = hasCustomDateLine ? override.dateLine : hasCustomCityOnly ? `${resolvedCity}, {{TANGGAL_SURAT}}` : base.dateLine;
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
      })()
    };
  };
  const withMaster = mergeOne(DEFAULT_PROSPECT_LETTER_CONTENT, masterTemplate);
  return mergeOne(withMaster, letterCustom);
}

// src/utils/prospectCompanyMatcher.ts
var LEGAL_PREFIXES = /* @__PURE__ */ new Set([
  "pt",
  "cv",
  "ud",
  "pd",
  "fa",
  "po",
  "yayasan",
  "koperasi",
  "perum",
  "firma",
  "perkumpulan",
  "perseroan",
  "klinik",
  "rs",
  "rsud",
  "rsia",
  "toko",
  "warung",
  "bengkel",
  "apotek",
  "apotik"
]);
var LEGAL_SUFFIXES = /* @__PURE__ */ new Set(["tbk", "persero", "ltd", "inc", "corp", "llc", "sdn", "bhd"]);
var GENERIC_COMPANY_WORDS = /* @__PURE__ */ new Set([
  "indonesia",
  "nusantara",
  "indo",
  "group",
  "grup",
  "global",
  "internasional",
  "international",
  "nasional",
  "jaya",
  "abadi",
  "makmur",
  "sentosa",
  "mandiri",
  "sejahtera",
  "sukses",
  "perkasa",
  "utama",
  "prima",
  "karya",
  "sinar",
  "bintang",
  "berkah",
  "mulia",
  "pratama",
  "indah",
  "bersama",
  "teknologi",
  "solusi",
  "mitra",
  "putra",
  "putri",
  "cahaya",
  "sumber",
  "rezeki",
  "rejeki",
  "agung",
  "lestari",
  "maju",
  "bangun",
  "cipta",
  "kencana",
  "graha",
  "buana",
  "persada",
  "energi",
  "niaga",
  "usaha",
  "dagang",
  "jasa",
  "konstruksi",
  "properti",
  "logistik",
  "trans",
  "transport",
  "trading",
  "ekspres",
  "express",
  "digital",
  "media",
  "kreatif",
  "creative",
  "konsultan",
  "consulting"
]);
function normalizeCompanyName(raw) {
  const cleaned = String(raw || "").toLowerCase().replace(/\bp\s*\.\s*t\s*\.?(?=\s|$)/gi, "pt ").replace(/\bc\s*\.\s*v\s*\.?(?=\s|$)/gi, "cv ").replace(/\bu\s*\.\s*d\s*\.?(?=\s|$)/gi, "ud ").replace(/\bp\s*\.\s*d\s*\.?(?=\s|$)/gi, "pd ").replace(/\bf\s*\.\s*a\s*\.?(?=\s|$)/gi, "fa ").replace(/&/g, " dan ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const allTokens = cleaned ? cleaned.split(" ").filter(Boolean) : [];
  let entityPrefix = "";
  const coreTokens = [...allTokens];
  if (coreTokens.length >= 3 && coreTokens[0].length === 1 && coreTokens[1].length === 1) {
    const joined = coreTokens[0] + coreTokens[1];
    if (LEGAL_PREFIXES.has(joined)) {
      coreTokens.splice(0, 2, joined);
    }
  }
  if (coreTokens.length >= 2 && LEGAL_PREFIXES.has(coreTokens[0])) {
    entityPrefix = coreTokens.shift() || "";
  }
  while (coreTokens.length >= 2 && LEGAL_SUFFIXES.has(coreTokens[coreTokens.length - 1])) {
    coreTokens.pop();
  }
  const coreName = coreTokens.join(" ").trim();
  const compactCore = coreName.replace(/\s+/g, "");
  return {
    raw: String(raw || "").trim(),
    fullNormalized: cleaned,
    entityPrefix,
    coreName,
    compactCore,
    tokens: coreTokens
  };
}
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const prev = new Array(lb + 1);
  const curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= lb; j++) prev[j] = curr[j];
  }
  return prev[lb];
}
function levenshteinSimilarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}
function isExactSameCompany(a, b) {
  if (!a.compactCore || !b.compactCore) return false;
  if (a.fullNormalized && a.fullNormalized === b.fullNormalized) {
    return true;
  }
  if (a.compactCore === b.compactCore) {
    if (a.entityPrefix === b.entityPrefix || !a.entityPrefix || !b.entityPrefix) {
      return true;
    }
  }
  return false;
}
function evaluateSimilarity(a, b) {
  if (!a.compactCore || !b.compactCore) {
    return { matched: false, score: 0, reason: "" };
  }
  if (a.compactCore === b.compactCore && a.entityPrefix && b.entityPrefix && a.entityPrefix !== b.entityPrefix) {
    return {
      matched: true,
      score: 0.96,
      reason: `Nama inti sama (beda badan usaha: ${b.entityPrefix.toUpperCase()})`
    };
  }
  if (a.compactCore.length < 3 || b.compactCore.length < 3) {
    return { matched: false, score: 0, reason: "" };
  }
  const tokensA = a.tokens;
  const tokensB = b.tokens;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const sharedTokens = tokensA.filter((t) => setB.has(t));
  const uniqueShared = Array.from(new Set(sharedTokens));
  const distinctiveShared = uniqueShared.filter((t) => t.length >= 4 && !GENERIC_COMPANY_WORDS.has(t));
  const shorterTokens = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longerSet = tokensA.length <= tokensB.length ? setB : setA;
  const allShorterInLonger = shorterTokens.length > 0 && shorterTokens.every((t) => longerSet.has(t));
  if (allShorterInLonger) {
    const hasEnoughSpecificity = shorterTokens.length >= 2 || shorterTokens.length === 1 && shorterTokens[0].length >= 4 && !GENERIC_COMPANY_WORDS.has(shorterTokens[0]);
    if (hasEnoughSpecificity) {
      const ratio = shorterTokens.length / Math.max(tokensA.length, tokensB.length);
      return {
        matched: true,
        score: Math.min(0.94, 0.8 + ratio * 0.14),
        reason: "Kemiripan kata (tambahan kata depan/tengah/belakang)"
      };
    }
  }
  const shorterCompact = a.compactCore.length <= b.compactCore.length ? a.compactCore : b.compactCore;
  const longerCompact = a.compactCore.length <= b.compactCore.length ? b.compactCore : a.compactCore;
  if (shorterCompact.length >= 5 && longerCompact.includes(shorterCompact)) {
    const shorterIsSingleGeneric = shorterTokens.length === 1 && GENERIC_COMPANY_WORDS.has(shorterTokens[0]);
    if (!shorterIsSingleGeneric) {
      const ratio = shorterCompact.length / longerCompact.length;
      return {
        matched: true,
        score: Math.min(0.92, 0.78 + ratio * 0.14),
        reason: "Sebagian nama perusahaan sangat mirip"
      };
    }
  }
  const minTokenCount = Math.min(tokensA.length, tokensB.length);
  const maxTokenCount = Math.max(tokensA.length, tokensB.length);
  const overlapMin = minTokenCount > 0 ? uniqueShared.length / minTokenCount : 0;
  const overlapMax = maxTokenCount > 0 ? uniqueShared.length / maxTokenCount : 0;
  if (uniqueShared.length >= 2 && overlapMin >= 0.6) {
    return {
      matched: true,
      score: Math.min(0.9, 0.72 + overlapMax * 0.18),
      reason: "Beberapa kata kunci perusahaan sama"
    };
  }
  const strongDistinctive = distinctiveShared.filter((t) => t.length >= 5);
  if (strongDistinctive.length >= 1 && overlapMax >= 0.4) {
    return {
      matched: true,
      score: Math.min(0.86, 0.7 + overlapMax * 0.16),
      reason: `Mengandung nama/merek serupa ("${strongDistinctive[0]}")`
    };
  }
  if (a.compactCore.length >= 5 && b.compactCore.length >= 5) {
    const simCompact = levenshteinSimilarity(a.compactCore, b.compactCore);
    const simCore = levenshteinSimilarity(a.coreName, b.coreName);
    const bestSim = Math.max(simCompact, simCore);
    if (bestSim >= 0.78) {
      return {
        matched: true,
        score: Number(bestSim.toFixed(2)),
        reason: "Ejaan nama perusahaan sangat mirip"
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}
function checkProspectCompanyDuplicates(candidateCompanyName, existingLetters, targetMitraId, excludeLetterId) {
  const candidateNorm = normalizeCompanyName(candidateCompanyName);
  if (!candidateNorm.compactCore) {
    return {
      blocked: false,
      exactMatches: [],
      similarMatches: [],
      ownMatches: []
    };
  }
  const exactMatches = [];
  const similarMatches = [];
  const ownMatches = [];
  const seenSimilarKeys = /* @__PURE__ */ new Set();
  for (const letter of existingLetters) {
    if (!letter || !letter.companyName) continue;
    if (excludeLetterId && letter.id === excludeLetterId) continue;
    const existingNorm = normalizeCompanyName(letter.companyName);
    if (!existingNorm.compactCore) continue;
    const isSameMitra = Boolean(targetMitraId && letter.mitraId === targetMitraId);
    if (isExactSameCompany(candidateNorm, existingNorm)) {
      const matchItem = {
        letterId: letter.id,
        letterNumber: letter.letterNumber,
        companyName: letter.companyName,
        companyAddress: letter.companyAddress,
        letterDate: letter.letterDate || letter.createdAt,
        mitraId: letter.mitraId,
        mitraName: letter.mitraName,
        mitraMemberCode: letter.mitraMemberCode,
        matchType: isSameMitra ? "own" : "exact",
        matchReason: isSameMitra ? "Anda sebelumnya sudah membuat surat penawaran untuk perusahaan ini" : "Nama perusahaan sama persis dengan surat yang sudah dibuat Mitra lain",
        score: 1
      };
      if (isSameMitra) {
        ownMatches.push(matchItem);
      } else {
        exactMatches.push(matchItem);
      }
      continue;
    }
    if (!isSameMitra) {
      const sim = evaluateSimilarity(candidateNorm, existingNorm);
      if (sim.matched) {
        const dedupeKey = `${letter.mitraId}::${existingNorm.fullNormalized}`;
        if (!seenSimilarKeys.has(dedupeKey)) {
          seenSimilarKeys.add(dedupeKey);
          similarMatches.push({
            letterId: letter.id,
            letterNumber: letter.letterNumber,
            companyName: letter.companyName,
            companyAddress: letter.companyAddress,
            letterDate: letter.letterDate || letter.createdAt,
            mitraId: letter.mitraId,
            mitraName: letter.mitraName,
            mitraMemberCode: letter.mitraMemberCode,
            matchType: "similar",
            matchReason: sim.reason,
            score: sim.score
          });
        }
      }
    }
  }
  similarMatches.sort((a, b) => b.score - a.score);
  return {
    blocked: exactMatches.length > 0,
    exactMatches: exactMatches.slice(0, 5),
    similarMatches: similarMatches.slice(0, 5),
    ownMatches: ownMatches.slice(0, 3)
  };
}

// server-utils/proposalPdfStamper.ts
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  fill,
  stroke,
  setFillingColor,
  setStrokingColor,
  setLineWidth
} from "pdf-lib";
var BASE_PAGE_W = 594.96;
var BASE_PAGE_H = 841.92;
var KAPPA = 0.5522847498;
function sanitizeWinAnsi(input) {
  const normalized = String(input || "").normalize("NFC").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  let out = "";
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code >= 32 && code <= 126 || code >= 160 && code <= 255) {
      out += normalized[i];
    }
  }
  return out;
}
function getInitials(name) {
  const parts = sanitizeWinAnsi(name).split(/\s+/).filter((w) => w && !w.includes("."));
  if (parts.length === 0) return "ND";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
function roundedRectOps(x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const c = r * KAPPA;
  return [
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + c, y, x + w, y + r - c, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - r + c, x + w - r + c, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + r - c, y + h, x, y + h - r + c, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - c, x + r - c, y, x + r, y),
    closePath()
  ];
}
function isPngBuffer(buf) {
  return buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71;
}
function isJpegBuffer(buf) {
  return buf.length >= 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255;
}
async function convertImageBufferToPng(buf, ffmpegBin) {
  if (!ffmpegBin) return null;
  const uid = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const inPath = path.join(os.tmpdir(), `nd-avatar-in-${uid}`);
  const outPath = path.join(os.tmpdir(), `nd-avatar-out-${uid}.png`);
  try {
    fs.writeFileSync(inPath, buf);
    await new Promise((resolve, reject) => {
      execFile(
        ffmpegBin,
        ["-y", "-i", inPath, "-frames:v", "1", outPath],
        { timeout: 15e3, maxBuffer: 5 * 1024 * 1024 },
        (err) => err ? reject(err) : resolve()
      );
    });
    if (fs.existsSync(outPath)) {
      const converted = fs.readFileSync(outPath);
      return converted.length > 0 ? converted : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    try {
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
    } catch {
    }
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {
    }
  }
}
async function embedMitraAvatarImage(pdfDoc, avatarBuffer, ffmpegBin) {
  if (!avatarBuffer || avatarBuffer.length < 16) return null;
  try {
    if (isPngBuffer(avatarBuffer)) {
      return await pdfDoc.embedPng(avatarBuffer);
    }
    if (isJpegBuffer(avatarBuffer)) {
      return await pdfDoc.embedJpg(avatarBuffer);
    }
    const convertedPng = await convertImageBufferToPng(avatarBuffer, ffmpegBin);
    if (convertedPng && isPngBuffer(convertedPng)) {
      return await pdfDoc.embedPng(convertedPng);
    }
  } catch {
    return null;
  }
  return null;
}
function fitSingleLineText(text, font, preferredSize, minSize, maxWidth) {
  const clean = sanitizeWinAnsi(text);
  if (!clean) return { text: "-", size: preferredSize };
  let size = preferredSize;
  while (size > minSize && font.widthOfTextAtSize(clean, size) > maxWidth) {
    size = Number((size - 0.35).toFixed(2));
  }
  if (size < minSize) size = minSize;
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) {
    return { text: clean, size };
  }
  let truncated = clean;
  while (truncated.length > 3 && font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
    truncated = truncated.slice(0, -1).trimEnd();
  }
  return { text: `${truncated}...`, size };
}
function drawTrackedText(page, text, x, y, font, size, letterSpacing, color) {
  let cursorX = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    page.drawText(ch, { x: cursorX, y, size, font, color });
    cursorX += font.widthOfTextAtSize(ch, size) + letterSpacing;
  }
}
function drawPartnerCardOnPage(page, mitra, lang, fontRegular, fontBold, avatarImage) {
  const { width: pageW, height: pageH } = page.getSize();
  const sx = pageW / BASE_PAGE_W;
  const sy = pageH / BASE_PAGE_H;
  const s = Math.min(sx, sy);
  const cardX = 44.4 * sx;
  const cardY = 44.8 * sy;
  const cardW = 243.4 * sx;
  const cardH = 98.7 * sy;
  const cardR = 4.6 * s;
  const darkBg = rgb(0.055, 0.071, 0.094);
  const subtleBorder = rgb(0.29, 0.259, 0.196);
  const gold = rgb(0.788, 0.643, 0.361);
  const white = rgb(1, 1, 1);
  const softWhite = rgb(0.898, 0.914, 0.933);
  const photoBackdrop = rgb(0.84, 0.855, 0.875);
  const navyFallback = rgb(0.067, 0.22, 0.447);
  page.pushOperators(
    pushGraphicsState(),
    setFillingColor(darkBg),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    fill(),
    popGraphicsState()
  );
  page.pushOperators(
    pushGraphicsState(),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    clip(),
    endPath(),
    setFillingColor(gold),
    ...roundedRectOps(cardX, cardY, 3.1 * sx, cardH, 0),
    fill(),
    popGraphicsState()
  );
  page.pushOperators(
    pushGraphicsState(),
    setStrokingColor(subtleBorder),
    setLineWidth(0.85 * s),
    ...roundedRectOps(cardX, cardY, cardW, cardH, cardR),
    stroke(),
    popGraphicsState()
  );
  const photoX = 62.6 * sx;
  const photoY = 60.8 * sy;
  const photoW = 67.5 * sx;
  const photoH = 67.5 * sy;
  const photoR = 5.2 * s;
  page.pushOperators(
    pushGraphicsState(),
    ...roundedRectOps(photoX, photoY, photoW, photoH, photoR),
    clip(),
    endPath(),
    setFillingColor(avatarImage ? photoBackdrop : navyFallback),
    ...roundedRectOps(photoX, photoY, photoW, photoH, 0),
    fill()
  );
  if (avatarImage) {
    const imgDims = avatarImage.scale(1);
    const coverScale = Math.max(photoW / Math.max(1, imgDims.width), photoH / Math.max(1, imgDims.height));
    const drawW = imgDims.width * coverScale;
    const drawH = imgDims.height * coverScale;
    const drawX = photoX + (photoW - drawW) / 2;
    const drawY = photoY + (photoH - drawH) * 0.65;
    page.drawImage(avatarImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH
    });
  } else {
    const initials = getInitials(mitra.fullName);
    const initSize = 22 * s;
    const initW = fontBold.widthOfTextAtSize(initials, initSize);
    page.drawText(initials, {
      x: photoX + (photoW - initW) / 2,
      y: photoY + (photoH - initSize * 0.72) / 2,
      size: initSize,
      font: fontBold,
      color: gold
    });
  }
  page.pushOperators(popGraphicsState());
  page.pushOperators(
    pushGraphicsState(),
    setStrokingColor(gold),
    setLineWidth(1 * s),
    ...roundedRectOps(photoX, photoY, photoW, photoH, photoR),
    stroke(),
    popGraphicsState()
  );
  const colX = 144.8 * sx;
  const textX = 159.5 * sx;
  const maxTextW = Math.max(60 * sx, cardX + cardW - 10 * sx - textX);
  const roleLabel = lang === "en" ? "ND STRATEGIC PARTNER" : "MITRA STRATEGIS ND";
  drawTrackedText(
    page,
    roleLabel,
    colX,
    118.2 * sy,
    fontBold,
    6.6 * s,
    0.95 * s,
    gold
  );
  const iconScale = 9.5 * s / 24;
  const iconStroke = 1.85;
  const nameRowBaseY = 97.2 * sy;
  const nameIconTopY = nameRowBaseY + 8.6 * sy;
  page.drawSvgPath("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", {
    x: colX,
    y: nameIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke
  });
  page.drawSvgPath("M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z", {
    x: colX,
    y: nameIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke
  });
  const fittedName = fitSingleLineText(
    mitra.fullName || "Mitra ND Tax and Law",
    fontBold,
    10 * s,
    7.2 * s,
    maxTextW
  );
  page.drawText(fittedName.text, {
    x: textX,
    y: nameRowBaseY,
    size: fittedName.size,
    font: fontBold,
    color: white
  });
  const emailRowBaseY = 79.8 * sy;
  const emailIconTopY = emailRowBaseY + 8.1 * sy;
  page.drawSvgPath("M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", {
    x: colX,
    y: emailIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke
  });
  page.drawSvgPath("M22 6l-10 7L2 6", {
    x: colX,
    y: emailIconTopY,
    scale: iconScale,
    borderColor: gold,
    borderWidth: iconStroke
  });
  const fittedEmail = fitSingleLineText(
    mitra.email || "-",
    fontRegular,
    8.5 * s,
    6.4 * s,
    maxTextW
  );
  page.drawText(fittedEmail.text, {
    x: textX,
    y: emailRowBaseY,
    size: fittedEmail.size,
    font: fontRegular,
    color: softWhite
  });
  const phoneRowBaseY = 63 * sy;
  const phoneIconTopY = phoneRowBaseY + 8.3 * sy;
  page.drawSvgPath(
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
    {
      x: colX,
      y: phoneIconTopY,
      scale: iconScale,
      borderColor: gold,
      borderWidth: iconStroke
    }
  );
  const fittedPhone = fitSingleLineText(
    mitra.phone || "-",
    fontRegular,
    8.5 * s,
    6.6 * s,
    maxTextW
  );
  page.drawText(fittedPhone.text, {
    x: textX,
    y: phoneRowBaseY,
    size: fittedPhone.size,
    font: fontRegular,
    color: softWhite
  });
}
async function getPdfPageCount(pdfBuffer) {
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}
async function stampMitraPartnerCardOnPdf(templatePdfBuffer, mitra, options) {
  const mode = options.stampMode || "first_and_last";
  if (mode === "none") {
    return templatePdfBuffer;
  }
  const pdfDoc = await PDFDocument.load(templatePdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    return templatePdfBuffer;
  }
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const avatarImage = await embedMitraAvatarImage(
    pdfDoc,
    mitra.avatarBuffer,
    options.ffmpegBin
  );
  const targetIndices = /* @__PURE__ */ new Set();
  if (mode === "first_only") {
    targetIndices.add(0);
  } else if (mode === "all_pages") {
    for (let i = 0; i < pages.length; i++) targetIndices.add(i);
  } else {
    targetIndices.add(0);
    if (pages.length > 1) {
      targetIndices.add(pages.length - 1);
    }
  }
  for (const idx of targetIndices) {
    drawPartnerCardOnPage(
      pages[idx],
      mitra,
      options.lang,
      fontRegular,
      fontBold,
      avatarImage
    );
  }
  const outBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(outBytes);
}

// server-utils/whatsappClient.ts
import fs2 from "fs";
import path2 from "path";
import QRCode from "qrcode";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestWaWebVersion,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";
var AUTH_DIR = path2.join(process.cwd(), "data", "wa-auth");
var silentLogger = pino({ level: "silent" });
var CONNECT_WATCHDOG_MS = 25e3;
var VERSION_FETCH_TIMEOUT_MS = 6e3;
var activeSocket = null;
var connectionStatus = "disconnected";
var statusDetail = null;
var currentQrDataUrl = null;
var connectedPhone = null;
var connectedName = null;
var lastError = null;
var reconnectTimer = null;
var connectingWatchdogTimer = null;
var reconnectAttempts = 0;
var manualDisconnect = false;
var isStarting = false;
var socketGeneration = 0;
var credsSaveChain = Promise.resolve();
var hasHadQrInAttempt = false;
var cachedWaVersion = null;
function normalizeIndonesianWaDigits(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}
function extractPhoneDigitsFromJid(jid) {
  if (!jid) return "";
  const beforeAt = jid.split("@")[0] || "";
  const beforeColon = beforeAt.split(":")[0] || "";
  return beforeColon.replace(/\D/g, "");
}
function hasSavedSessionFiles() {
  try {
    return fs2.existsSync(path2.join(AUTH_DIR, "creds.json"));
  } catch {
    return false;
  }
}
function isSavedSessionRegistered() {
  try {
    const credsPath = path2.join(AUTH_DIR, "creds.json");
    if (!fs2.existsSync(credsPath)) return false;
    const parsed = JSON.parse(fs2.readFileSync(credsPath, "utf-8"));
    return Boolean(parsed?.registered && parsed?.me?.id);
  } catch {
    return false;
  }
}
function clearAuthDirectory() {
  try {
    if (fs2.existsSync(AUTH_DIR)) {
      fs2.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("[WhatsApp] Failed to clear auth directory:", err);
  }
}
function clearAllTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (connectingWatchdogTimer) {
    clearTimeout(connectingWatchdogTimer);
    connectingWatchdogTimer = null;
  }
}
function closeSocketQuietly(sock) {
  if (!sock) return;
  try {
    sock.ev.removeAllListeners("connection.update");
    sock.ev.removeAllListeners("creds.update");
  } catch {
  }
  try {
    sock.end(void 0);
  } catch {
  }
}
function startConnectingWatchdog(expectedGen) {
  if (connectingWatchdogTimer) {
    clearTimeout(connectingWatchdogTimer);
    connectingWatchdogTimer = null;
  }
  connectingWatchdogTimer = setTimeout(() => {
    connectingWatchdogTimer = null;
    if (expectedGen !== socketGeneration) return;
    if (connectionStatus !== "connecting") return;
    console.warn("[WhatsApp] Connection watchdog timeout \u2014 resetting stuck connecting state.");
    const staleSock = activeSocket;
    activeSocket = null;
    socketGeneration += 1;
    closeSocketQuietly(staleSock);
    if (!isSavedSessionRegistered()) {
      clearAuthDirectory();
    }
    connectionStatus = "disconnected";
    statusDetail = null;
    currentQrDataUrl = null;
    connectedPhone = null;
    connectedName = null;
    isStarting = false;
    reconnectAttempts = 0;
    lastError = 'Koneksi ke server WhatsApp melebihi batas waktu atau penautan di HP gagal. Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.';
  }, CONNECT_WATCHDOG_MS);
}
async function resolveLatestWaVersion() {
  if (cachedWaVersion && Date.now() - cachedWaVersion.fetchedAt < 6 * 60 * 60 * 1e3) {
    return cachedWaVersion.version;
  }
  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Version fetch timeout")), ms))
  ]);
  try {
    const waWeb = await withTimeout(fetchLatestWaWebVersion({}), VERSION_FETCH_TIMEOUT_MS);
    if (Array.isArray(waWeb?.version) && waWeb.version.length === 3) {
      cachedWaVersion = { version: waWeb.version, fetchedAt: Date.now() };
      return waWeb.version;
    }
  } catch {
  }
  try {
    const baileysVer = await withTimeout(fetchLatestBaileysVersion(), VERSION_FETCH_TIMEOUT_MS);
    if (Array.isArray(baileysVer?.version) && baileysVer.version.length === 3) {
      cachedWaVersion = { version: baileysVer.version, fetchedAt: Date.now() };
      return baileysVer.version;
    }
  } catch {
  }
  return void 0;
}
function getWhatsAppStatus() {
  return {
    status: connectionStatus,
    statusDetail,
    qrDataUrl: currentQrDataUrl,
    connectedPhone,
    connectedName,
    lastError,
    hasSavedSession: hasSavedSessionFiles()
  };
}
async function startSocketConnection(options) {
  if (isStarting) {
    return getWhatsAppStatus();
  }
  isStarting = true;
  manualDisconnect = false;
  clearAllTimers();
  if (activeSocket) {
    const prev = activeSocket;
    activeSocket = null;
    closeSocketQuietly(prev);
  }
  const myGen = ++socketGeneration;
  connectionStatus = "connecting";
  statusDetail = options?.detailMessage || "Menghubungkan ke server WhatsApp...";
  currentQrDataUrl = null;
  if (!options?.isReconnect) {
    lastError = null;
    hasHadQrInAttempt = false;
  }
  startConnectingWatchdog(myGen);
  try {
    await credsSaveChain.catch(() => {
    });
    fs2.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await resolveLatestWaVersion();
    if (myGen !== socketGeneration || manualDisconnect) {
      return getWhatsAppStatus();
    }
    const sock = makeWASocket({
      ...version ? { version } : {},
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger)
      },
      logger: silentLogger,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 25e3,
      defaultQueryTimeoutMs: 25e3,
      keepAliveIntervalMs: 25e3,
      qrTimeout: 45e3
    });
    activeSocket = sock;
    sock.ev.on("creds.update", () => {
      credsSaveChain = credsSaveChain.then(() => saveCreds()).catch((err) => {
        console.warn("[WhatsApp] saveCreds error:", err);
      });
    });
    sock.ev.on("connection.update", async (update) => {
      if (myGen !== socketGeneration) return;
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        if (connectingWatchdogTimer) {
          clearTimeout(connectingWatchdogTimer);
          connectingWatchdogTimer = null;
        }
        hasHadQrInAttempt = true;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            width: 280,
            margin: 2,
            color: { dark: "#092147", light: "#FFFFFF" }
          });
          connectionStatus = "qr";
          statusDetail = "Scan QR Code menggunakan WhatsApp di HP Admin Grup";
          lastError = null;
          reconnectAttempts = 0;
        } catch (err) {
          console.warn("[WhatsApp] QR generation error:", err);
        }
      }
      if (connection === "open") {
        clearAllTimers();
        connectionStatus = "connected";
        statusDetail = "Terhubung";
        currentQrDataUrl = null;
        lastError = null;
        reconnectAttempts = 0;
        hasHadQrInAttempt = false;
        const userId = sock.user?.id || "";
        connectedPhone = extractPhoneDigitsFromJid(userId) || null;
        connectedName = sock.user?.name || null;
        console.log(`[WhatsApp] Connected as +${connectedPhone || "unknown"} (${connectedName || "-"})`);
      }
      if (connection === "close") {
        if (connectingWatchdogTimer) {
          clearTimeout(connectingWatchdogTimer);
          connectingWatchdogTimer = null;
        }
        const errObj = lastDisconnect?.error;
        const statusCode = errObj?.output?.statusCode ?? errObj?.data?.statusCode ?? errObj?.statusCode;
        const errMessage = String(errObj?.message || "");
        console.log(
          `[WhatsApp] Connection closed (code=${statusCode ?? "unknown"}, msg="${errMessage}", registered=${Boolean(
            state.creds.registered
          )})`
        );
        activeSocket = null;
        currentQrDataUrl = null;
        if (manualDisconnect) {
          connectionStatus = "disconnected";
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          return;
        }
        await credsSaveChain.catch(() => {
        });
        if (myGen !== socketGeneration || manualDisconnect) return;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;
        if (isRestartRequired) {
          reconnectAttempts = 0;
          connectionStatus = "connecting";
          statusDetail = "QR berhasil dipindai! Menyelesaikan penautan dengan WhatsApp...";
          lastError = null;
          startConnectingWatchdog(myGen);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (myGen !== socketGeneration || manualDisconnect) return;
            startSocketConnection({
              isReconnect: true,
              detailMessage: "Menyelesaikan penautan perangkat dengan WhatsApp..."
            }).catch(() => {
            });
          }, 500);
          return;
        }
        const isLoggedOutOrBadSession = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 405 || statusCode === DisconnectReason.badSession;
        if (isLoggedOutOrBadSession) {
          clearAuthDirectory();
          connectionStatus = "disconnected";
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError = statusCode === 405 ? 'Penautan ditolak oleh server WhatsApp (kode 405). Sesi lama telah dibersihkan \u2014 silakan klik "Tampilkan QR WhatsApp" dan scan ulang.' : 'Sesi WhatsApp terputus atau penautan dibatalkan dari HP. Silakan klik "Tampilkan QR WhatsApp" untuk scan ulang.';
          return;
        }
        const isQrExpiredOrPairingTimeout = statusCode === DisconnectReason.timedOut || statusCode === 408 || /qr refs attempts ended|timed out/i.test(errMessage);
        if (isQrExpiredOrPairingTimeout && (!state.creds.registered || hasHadQrInAttempt)) {
          if (!isSavedSessionRegistered()) {
            clearAuthDirectory();
          }
          connectionStatus = "disconnected";
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError = 'QR Code kedaluwarsa atau penautan di HP gagal. Silakan klik "Tampilkan QR WhatsApp" untuk memuat QR baru.';
          return;
        }
        const maxRetries = isSavedSessionRegistered() ? 3 : 1;
        if (reconnectAttempts < maxRetries) {
          reconnectAttempts += 1;
          connectionStatus = "connecting";
          statusDetail = `Menghubungkan ulang ke WhatsApp (percobaan ${reconnectAttempts}/${maxRetries})...`;
          startConnectingWatchdog(myGen);
          const delayMs = reconnectAttempts * 1500;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (myGen !== socketGeneration || manualDisconnect) return;
            startSocketConnection({
              isReconnect: true,
              detailMessage: `Menghubungkan ulang ke WhatsApp (${reconnectAttempts}/${maxRetries})...`
            }).catch(() => {
            });
          }, delayMs);
        } else {
          if (!isSavedSessionRegistered()) {
            clearAuthDirectory();
          }
          connectionStatus = "disconnected";
          statusDetail = null;
          connectedPhone = null;
          connectedName = null;
          reconnectAttempts = 0;
          lastError = errMessage && errMessage !== "Connection Closed" ? `Koneksi WhatsApp gagal (${errMessage}). Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.` : 'Penautan WhatsApp gagal atau terputus. Silakan klik "Tampilkan QR WhatsApp" untuk mencoba lagi.';
        }
      }
    });
  } catch (err) {
    clearAllTimers();
    connectionStatus = "disconnected";
    statusDetail = null;
    activeSocket = null;
    currentQrDataUrl = null;
    lastError = err?.message || "Gagal memulai koneksi WhatsApp. Silakan coba lagi.";
  } finally {
    isStarting = false;
  }
  return getWhatsAppStatus();
}
async function connectWhatsApp(options) {
  const forceReset = Boolean(options?.forceReset);
  if (!forceReset) {
    if (connectionStatus === "connected" && activeSocket) {
      return getWhatsAppStatus();
    }
    if ((isStarting || activeSocket) && (connectionStatus === "connecting" || connectionStatus === "qr")) {
      return getWhatsAppStatus();
    }
  } else {
    manualDisconnect = false;
    clearAllTimers();
    socketGeneration += 1;
    if (activeSocket) {
      const old = activeSocket;
      activeSocket = null;
      closeSocketQuietly(old);
    }
    isStarting = false;
    reconnectAttempts = 0;
    if (connectionStatus !== "connected") {
      clearAuthDirectory();
    }
    connectionStatus = "disconnected";
    statusDetail = null;
    currentQrDataUrl = null;
    lastError = null;
  }
  return startSocketConnection({
    isReconnect: false,
    detailMessage: "Menghubungkan ke server WhatsApp & menyiapkan QR Code..."
  });
}
async function disconnectWhatsApp(logout = true) {
  manualDisconnect = true;
  clearAllTimers();
  socketGeneration += 1;
  const sock = activeSocket;
  activeSocket = null;
  isStarting = false;
  connectionStatus = "disconnected";
  statusDetail = null;
  currentQrDataUrl = null;
  connectedPhone = null;
  connectedName = null;
  lastError = null;
  reconnectAttempts = 0;
  if (sock) {
    try {
      if (logout) {
        await sock.logout();
      } else {
        closeSocketQuietly(sock);
      }
    } catch {
      closeSocketQuietly(sock);
    }
  }
  if (logout) {
    clearAuthDirectory();
  }
  return getWhatsAppStatus();
}
function initWhatsAppIfSavedSession() {
  if (isSavedSessionRegistered()) {
    connectWhatsApp().catch((err) => {
      console.warn("[WhatsApp] Auto-resume session failed:", err?.message || err);
    });
  } else if (hasSavedSessionFiles()) {
    clearAuthDirectory();
  }
}
async function listAdminWhatsAppGroups() {
  if (connectionStatus !== "connected" || !activeSocket) {
    throw new Error("WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.");
  }
  const sock = activeSocket;
  const selfPhone = extractPhoneDigitsFromJid(sock.user?.id);
  const selfLid = extractPhoneDigitsFromJid(sock.user?.lid);
  const groupsMap = await sock.groupFetchAllParticipating();
  const list = Object.values(groupsMap || {}).map((g) => {
    const participants = Array.isArray(g.participants) ? g.participants : [];
    const me = participants.find((p) => {
      const pDigits = extractPhoneDigitsFromJid(p.phoneNumber || p.id);
      const pLid = extractPhoneDigitsFromJid(p.lid || p.id);
      return selfPhone && pDigits === selfPhone || selfLid && pLid === selfLid;
    });
    const isAdmin = Boolean(
      me && (me.admin === "admin" || me.admin === "superadmin" || me.isAdmin || me.isSuperAdmin)
    );
    return {
      id: g.id,
      subject: g.subject || g.id,
      participantsCount: participants.length,
      isAdmin
    };
  });
  list.sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return a.subject.localeCompare(b.subject, "id");
  });
  return list;
}
async function getWhatsAppGroupInviteLink(groupJid) {
  if (connectionStatus !== "connected" || !activeSocket || !groupJid) return null;
  try {
    const code = await activeSocket.groupInviteCode(groupJid);
    return code ? `https://chat.whatsapp.com/${code}` : null;
  } catch {
    return null;
  }
}
async function getWhatsAppGroupParticipantPhones(groupJid) {
  if (connectionStatus !== "connected" || !activeSocket) {
    throw new Error("WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.");
  }
  const meta = await activeSocket.groupMetadata(groupJid);
  const phones = /* @__PURE__ */ new Set();
  for (const p of meta.participants || []) {
    const pnDigits = extractPhoneDigitsFromJid(p.phoneNumber || p.id);
    if (pnDigits) phones.add(pnDigits);
  }
  return phones;
}
async function updateWhatsAppGroupParticipants(groupJid, entries, action, groupName, fallbackInviteLink) {
  if (connectionStatus !== "connected" || !activeSocket) {
    throw new Error("WhatsApp Admin belum terhubung. Silakan scan QR terlebih dahulu.");
  }
  const sock = activeSocket;
  const outcomes = [];
  let cachedInviteLink = void 0;
  const resolveInviteLink = async () => {
    if (cachedInviteLink === void 0) {
      cachedInviteLink = await getWhatsAppGroupInviteLink(groupJid);
    }
    return cachedInviteLink || fallbackInviteLink || "";
  };
  for (const entry of entries) {
    const formattedPhone = normalizeIndonesianWaDigits(entry.phone);
    if (!formattedPhone || formattedPhone.length < 9) {
      outcomes.push({
        ...entry,
        formattedPhone,
        outcome: "not_on_whatsapp",
        detail: "Nomor WhatsApp Mitra tidak valid atau belum diisi."
      });
      continue;
    }
    let targetJid = `${formattedPhone}@s.whatsapp.net`;
    if (action === "add") {
      try {
        const check = await sock.onWhatsApp(formattedPhone);
        const first = Array.isArray(check) ? check[0] : void 0;
        if (!first || !first.exists) {
          outcomes.push({
            ...entry,
            formattedPhone,
            outcome: "not_on_whatsapp",
            detail: `Nomor ${entry.phone} belum terdaftar di WhatsApp.`
          });
          continue;
        }
        if (first.jid) {
          targetJid = first.jid;
        }
      } catch {
      }
    }
    try {
      const responseList = await sock.groupParticipantsUpdate(groupJid, [targetJid], action);
      const item = Array.isArray(responseList) ? responseList[0] : void 0;
      const statusStr = String(item?.status ?? "200");
      if (statusStr === "200") {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: action === "add" ? "added" : "removed",
          detail: action === "add" ? `Berhasil ditambahkan langsung ke Grup WhatsApp ${groupName || ""}.`.trim() : `Berhasil dikeluarkan dari Grup WhatsApp ${groupName || ""}.`.trim()
        });
      } else if (statusStr === "409" && action === "add") {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: "already_in_group",
          detail: "Nomor Mitra ini sudah berada di dalam Grup WhatsApp."
        });
      } else if (statusStr === "403" && action === "add") {
        const link = await resolveInviteLink();
        let dmSent = false;
        if (link) {
          try {
            await sock.sendMessage(targetJid, {
              text: `Halo ${entry.fullName}, Admin mengundang Anda bergabung ke grup WhatsApp resmi *${groupName || "Mitra ND Tax & Law"}*.

Pengaturan privasi WhatsApp Anda membatasi penambahan otomatis, silakan klik tautan resmi berikut untuk bergabung:
${link}`
            });
            dmSent = true;
          } catch (dmErr) {
            console.warn("[WhatsApp] Failed to send fallback invite DM:", dmErr);
          }
        }
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: "invited_via_dm",
          detail: dmSent ? "Privasi WA peserta membatasi tambah langsung \u2014 undangan resmi otomatis dikirim ke chat WA peserta." : "Privasi WA peserta membatasi tambah langsung. Pastikan nomor Admin WA adalah Admin Grup agar link undangan bisa dikirim otomatis."
        });
      } else if (statusStr === "401") {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: "not_admin",
          detail: "Nomor WhatsApp yang terhubung bukan Admin pada grup WhatsApp tujuan."
        });
      } else if (statusStr === "408") {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: "failed",
          detail: "Peserta baru saja keluar dari grup ini sehingga WhatsApp membatasi penambahan langsung sementara."
        });
      } else if (statusStr === "404") {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: action === "remove" ? "removed" : "not_on_whatsapp",
          detail: action === "remove" ? "Peserta sudah tidak berada di dalam grup." : `Nomor ${entry.phone} tidak ditemukan di WhatsApp.`
        });
      } else {
        outcomes.push({
          ...entry,
          formattedPhone,
          outcome: "failed",
          detail: `WhatsApp mengembalikan kode status ${statusStr}.`
        });
      }
    } catch (err) {
      const msg = String(err?.message || "");
      const isNotAdmin = /forbidden|not-authorized|401/i.test(msg);
      outcomes.push({
        ...entry,
        formattedPhone,
        outcome: isNotAdmin ? "not_admin" : "failed",
        detail: isNotAdmin ? "Nomor WhatsApp yang terhubung bukan Admin pada grup WhatsApp tujuan." : msg || "Gagal memproses permintaan ke server WhatsApp."
      });
    }
  }
  return outcomes;
}

// server.ts
var db = isMysqlConfigured() ? mysqlDb : null;
var mysqlPreviewFallbackActive = false;
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var sanitizeStringValue = (input) => {
  if (/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i.test(input)) {
    return input.replace(/\0/g, "");
  }
  return input.replace(/\0/g, "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript\s*:/gi, "blocked:").replace(/vbscript\s*:/gi, "blocked:").replace(/\bon(error|load|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=/gi, "data-blocked-event=");
};
var sanitizePayloadDeep = (value, depth = 0) => {
  if (depth > 12 || value === null || value === void 0) return value;
  if (typeof value === "string") {
    return sanitizeStringValue(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadDeep(item, depth + 1));
  }
  if (typeof value === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      cleaned[key] = sanitizePayloadDeep(val, depth + 1);
    }
    return cleaned;
  }
  return value;
};
var sanitizeSqlIdentifier = (raw) => {
  return String(raw || "").replace(/[\0;'"\\`]|--|\/\*|\*\//g, "").trim();
};
var escapeHtml = (unsafe) => {
  return String(unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};
var safeTimingCompare = (a, b) => {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto2.timingSafeEqual(bufA, bufB);
};
var apiRateBuckets = /* @__PURE__ */ new Map();
var authRateBuckets = /* @__PURE__ */ new Map();
var getClientIp = (req) => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};
var consumeRateLimit = (store, key, maxRequests, windowMs) => {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  existing.count += 1;
  if (existing.count > maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1e3))
    };
  }
  return { allowed: true, retryAfterSec: 0 };
};
app.use("/api", (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizePayloadDeep(req.body);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizePayloadDeep(req.params);
  }
  const clientIp = getClientIp(req);
  const generalCheck = consumeRateLimit(apiRateBuckets, clientIp, 300, 60 * 1e3);
  if (!generalCheck.allowed) {
    res.setHeader("Retry-After", String(generalCheck.retryAfterSec));
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak permintaan dari jaringan Anda. Silakan tunggu ${generalCheck.retryAfterSec} detik sebelum mencoba kembali.`
    });
  }
  next();
});
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var DEFAULT_SPECIALIZATION_LABEL2 = "Bidang Keahlian / Profesi Mitra";
var DEFAULT_SPECIALIZATION_OPTIONS = [
  { id: "spec-1", label: "Business Partner", isActive: true }
];
var LEGACY_SEEDED_SPEC_LABELS = /* @__PURE__ */ new Set([
  "Konsultan Perpajakan & Tax Planning",
  "Hukum Korporasi & Bisnis",
  "Akuntansi & Pembukuan Korporat",
  "Legalitas & Perizinan OSS-RBA",
  "Kuasa Hukum Pengadilan Pajak",
  "Business Partner / Referral Umum"
]);
var normalizeSpecializationOptions = (raw) => {
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
    (item) => item.label.trim().toLowerCase() === "business partner"
  );
  return hasBusinessPartner ? customOrValid : [{ id: "spec-1", label: "Business Partner", isActive: true }, ...customOrValid];
};
var DEFAULT_MITRA_FORM_FIELDS2 = [
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
    id: "mitra-def-ktpFile",
    systemKey: "ktpFile",
    isDefault: true,
    section: "profile",
    label: "Upload File KTP / NPWP",
    type: "file",
    placeholder: "Unggah dokumen KTP atau NPWP (Format: JPG, JPEG, PNG, atau PDF)",
    required: true,
    isActive: true
  },
  {
    id: "mitra-def-specialization",
    systemKey: "specialization",
    isDefault: true,
    section: "profile",
    label: DEFAULT_SPECIALIZATION_LABEL2,
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
    type: "number",
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
var DEFAULT_BONUS_REWARD_TIERS = [
  { id: "tier-1", no: 1, salesTarget: 5e8, rewardName: "Jalan-Jalan LN", isActive: true },
  { id: "tier-2", no: 2, salesTarget: 1e9, rewardName: "Motor Baru", isActive: true },
  { id: "tier-3", no: 3, salesTarget: 15e8, rewardName: "Umroh", isActive: true },
  { id: "tier-4", no: 4, salesTarget: 5e9, rewardName: "Mobil Baru", isActive: true },
  { id: "tier-5", no: 5, salesTarget: 1e10, rewardName: "Rumah Baru", isActive: true }
];
var DEFAULT_COMMISSION_SCHEME = {
  subHighThreshold: 1e7,
  subHighRate: 20,
  subMidThreshold: 5e6,
  subMidRate: 15,
  subLowRate: 10,
  subRecurringRate: 10,
  caseHighThreshold: 1e8,
  caseHighRate: 20,
  caseMidThreshold: 5e7,
  caseMidRate: 15,
  caseLowRate: 10
};
var DEFAULT_BONUS_TARGET_CONFIG = {
  periodType: "yearly",
  monthlyBonusEnabled: true,
  yearlyBonusEnabled: true,
  targetDealRevenue: 5e8,
  targetClientCount: 12,
  standardBonusAmount: 25e6,
  monthlyTargetDealRevenue: 5e7,
  monthlyTargetClientCount: 3,
  monthlyStandardBonusAmount: 5e6,
  yearlyTargetDealRevenue: 5e8,
  yearlyTargetClientCount: 12,
  yearlyStandardBonusAmount: 25e6,
  rewardTiers: DEFAULT_BONUS_REWARD_TIERS,
  rewardDescription: "Jalan-Jalan LN, Motor Baru, Umroh, Mobil Baru & Rumah Baru"
};
var calculateClientDealCommission = (pricingType, dealValue, scheme) => {
  const cfg = {
    ...DEFAULT_COMMISSION_SCHEME,
    ...scheme || {}
  };
  const val = Math.max(0, Number(dealValue) || 0);
  if (pricingType === "monthly_subscription" || pricingType === "annual_subscription") {
    let initialRate2 = cfg.subLowRate;
    let tierLabel2 = `Langganan < Rp ${(cfg.subMidThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.subLowRate}%)`;
    if (val >= cfg.subHighThreshold) {
      initialRate2 = cfg.subHighRate;
      tierLabel2 = `Langganan \u2265 Rp ${(cfg.subHighThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.subHighRate}%)`;
    } else if (val >= cfg.subMidThreshold) {
      initialRate2 = cfg.subMidRate;
      tierLabel2 = `Langganan Rp ${(cfg.subMidThreshold / 1e6).toLocaleString("id-ID")}\u2013${(cfg.subHighThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.subMidRate}%)`;
    }
    const recurringRate = cfg.subRecurringRate;
    return {
      initialRate: initialRate2,
      initialAmount: Math.round(val * initialRate2 / 100),
      recurringRate,
      recurringAmount: Math.round(val * recurringRate / 100),
      tierLabel: tierLabel2
    };
  }
  let initialRate = cfg.caseLowRate;
  let tierLabel = `Per Kasus < Rp ${(cfg.caseMidThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.caseLowRate}%)`;
  if (val >= cfg.caseHighThreshold) {
    initialRate = cfg.caseHighRate;
    tierLabel = `Per Kasus \u2265 Rp ${(cfg.caseHighThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.caseHighRate}%)`;
  } else if (val >= cfg.caseMidThreshold) {
    initialRate = cfg.caseMidRate;
    tierLabel = `Per Kasus Rp ${(cfg.caseMidThreshold / 1e6).toLocaleString("id-ID")}\u2013${(cfg.caseHighThreshold / 1e6).toLocaleString("id-ID")} Juta (${cfg.caseMidRate}%)`;
  }
  return {
    initialRate,
    initialAmount: Math.round(val * initialRate / 100),
    recurringRate: 0,
    recurringAmount: 0,
    tierLabel
  };
};
var DEFAULT_STAFF_ALLOWED_MENUS = [
  "dashboard",
  "admin-operations",
  "verification",
  "marketing-tools",
  "commissions",
  "prospects",
  "manage-services",
  "settings-general",
  "settings-forms"
];
var toDbNotification = (n) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type,
  timestamp: n.timestamp,
  isRead: Boolean(n.isRead),
  targetAudience: n.targetAudience ?? null,
  mitraId: n.mitraId ?? null
});
var mitras = [
  {
    id: "mitra-tes-01",
    memberCode: "ND-TAX-LAW-9901",
    referralCode: "ND-REF-9901",
    fullName: "Mitra Uji Coba ND",
    email: "mitra.tes@ndtaxandlaw.com",
    phone: "0812-9900-1122",
    nik: "3174011205909901",
    ktpFileUrl: "/assets/aistudio/logo_kotak_5ecb05e4.png",
    ktpFileName: "KTP_Mitra_Uji_Coba.png",
    specialization: "Konsultan Bisnis & Perpajakan",
    status: "verified",
    isActive: true,
    gender: "male",
    avatarUrl: MALE_AVATAR_URL,
    joinedDate: "2026-11-24",
    bankDetails: {
      bankName: "Bank Central Asia (BCA)",
      accountNumber: "1234567890",
      accountHolder: "Mitra Uji Coba ND"
    },
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: true
  },
  {
    id: "mitra-01",
    memberCode: "ND-TAX-LAW-0042",
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
    memberCode: "ND-TAX-LAW-0077",
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
    memberCode: "ND-TAX-LAW-0089",
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
var PUBLIC_PROPOSALS_DIR = path3.join(__dirname, "public", "proposals");
var DEFAULT_PROPOSAL_TEMPLATES = [
  {
    id: "prop-fat-id",
    title: "Penawaran Harga Jasa FAT (Financial, Accounting & Tax)",
    description: "Dokumen resmi penawaran harga jasa akuntansi & perpajakan ND Tax & Law (Bahasa Indonesia).",
    targetProduct: "Jasa FAT (Financial, Accounting & Tax)",
    stampMode: "first_and_last",
    pdfId: {
      url: "/proposals/nd-proposal-fat-id.pdf",
      fileName: "ND Tax And Law - Penawaran Harga Jasa FAT (ID).pdf",
      fileSize: "1.37 MB",
      pageCount: 10,
      updatedAt: "2026-11-26"
    },
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26"
  },
  {
    id: "prop-fat-en",
    title: "Service Fee Proposal FAT (Financial, Accounting & Tax)",
    description: "Official ND Tax & Law Financial, Accounting & Tax service fee proposal (English Version).",
    targetProduct: "FAT Services (Financial, Accounting & Tax)",
    stampMode: "first_and_last",
    pdfEn: {
      url: "/proposals/nd-proposal-fat-en.pdf",
      fileName: "ND Tax And Law - Service Fee Proposal FAT (EN).pdf",
      fileSize: "1.36 MB",
      pageCount: 10,
      updatedAt: "2026-11-26"
    },
    createdAt: "2026-11-26",
    updatedAt: "2026-11-26"
  }
];
var normalizeProposalTemplates = (list) => {
  const normalized = [];
  let changed = false;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const hasId = Boolean(item.pdfId?.url);
    const hasEn = Boolean(item.pdfEn?.url);
    if (hasId && hasEn) {
      changed = true;
      const isDefaultOfficial = item.id === "prop-fat-official";
      normalized.push({
        id: isDefaultOfficial ? "prop-fat-id" : `${item.id}-id`,
        title: isDefaultOfficial ? "Penawaran Harga Jasa FAT (Financial, Accounting & Tax)" : item.title,
        description: item.description || "",
        targetProduct: item.targetProduct || "Jasa FAT (Financial, Accounting & Tax)",
        stampMode: item.stampMode || "first_and_last",
        pdfId: item.pdfId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      });
      normalized.push({
        id: isDefaultOfficial ? "prop-fat-en" : `${item.id}-en`,
        title: isDefaultOfficial ? "Service Fee Proposal FAT (Financial, Accounting & Tax)" : `${item.title} (English)`,
        description: item.description || "",
        targetProduct: isDefaultOfficial ? "FAT Services (Financial, Accounting & Tax)" : item.targetProduct || "ND Tax & Law Services",
        stampMode: item.stampMode || "first_and_last",
        pdfEn: item.pdfEn,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      });
    } else if (hasId || hasEn) {
      normalized.push(item);
    }
  }
  return { list: normalized, changed };
};
var proposalTemplates = DEFAULT_PROPOSAL_TEMPLATES.map((p) => ({ ...p }));
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
var LEGACY_SEEDED_SERVICE_IDS = /* @__PURE__ */ new Set([
  "srv-01",
  "srv-02",
  "srv-03",
  "srv-04",
  "srv-05",
  "srv-06",
  "srv-07",
  "srv-08"
]);
var normalizeServicesCatalog = (rawList) => {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return {
      list: OFFICIAL_ND_SERVICES.map((s) => ({ ...s })),
      migrated: true
    };
  }
  let migrated = false;
  const filtered = rawList.filter((s) => {
    if (!s || LEGACY_SEEDED_SERVICE_IDS.has(s.id)) {
      migrated = true;
      return false;
    }
    return true;
  }).map((s) => {
    const resolvedPricing = resolveServicePricingType(s);
    if (s.pricingType !== resolvedPricing) {
      migrated = true;
    }
    return {
      ...s,
      pricingType: resolvedPricing
    };
  });
  const hasOfficial = filtered.some((s) => s.id.startsWith("srv-nd-"));
  if (!hasOfficial) {
    migrated = true;
    return {
      list: [...OFFICIAL_ND_SERVICES.map((s) => ({ ...s })), ...filtered],
      migrated
    };
  }
  return { list: filtered, migrated };
};
var services = OFFICIAL_ND_SERVICES.map((s) => ({ ...s }));
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
    commissionAmount: 24e5,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 12e5,
    status: "active_subscription",
    date: "2026-08-10",
    subscriptionStartDate: "2026-08-10",
    billingDayOfMonth: 10,
    nextBillingDate: "2026-11-10",
    lastBilledDate: "2026-10-10",
    isBillingDue: true,
    recurringPaidMonths: 3,
    notes: "Klien berlangganan retainer laporan keuangan bulanan & review pajak sejak Agustus 2026 (Deal \u226510 Jt: Komisi Awal 20%, Bulan Berikutnya 10%)."
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
    commissionAmount: 45e5,
    appliedCommissionRate: 10,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
    status: "deal_closed",
    date: "2026-10-15",
    notes: "Kasus SP2DK ketidaksesuaian omset PPN telah selesai diselesaikan dengan DJP (Case <50 Jt: Komisi 10% cair)."
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
    dealValue: 6e6,
    commissionAmount: 9e5,
    appliedCommissionRate: 15,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 6e5,
    status: "active_subscription",
    date: "2026-09-01",
    subscriptionStartDate: "2026-09-01",
    billingDayOfMonth: 1,
    nextBillingDate: "2026-11-01",
    lastBilledDate: "2026-10-01",
    isBillingDue: true,
    recurringPaidMonths: 2,
    notes: "Pelaporan SPT Masa rutin setiap bulan (Deal 5\u201310 Jt: Komisi Awal 15%, Bulan Berikutnya 10%)."
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
    commissionAmount: 2e6,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 1e6,
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
    commissionAmount: 35e5,
    appliedCommissionRate: 10,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
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
    commissionAmount: 1275e4,
    appliedCommissionRate: 15,
    lockedRecurringRate: 0,
    recurringCommissionAmount: 0,
    status: "deal_closed",
    date: "2026-06-15",
    periodStart: "Februari 2024",
    periodEnd: "April 2025",
    durationMonths: 15,
    paymentTermType: "one_time",
    notes: "Perikatan restrukturisasi keuangan & pajak multi-bulan periode Feb 2024 s/d Apr 2025 (15 Bulan) - Sekali bayar (Deal 50\u2013100 Jt: Komisi 15%)."
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
    commissionAmount: 13e6,
    appliedCommissionRate: 20,
    lockedRecurringRate: 10,
    recurringCommissionAmount: 65e5,
    status: "active_subscription",
    date: "2026-03-20",
    subscriptionStartDate: "2026-03-20",
    billingDayOfMonth: 20,
    nextBillingDate: "2027-03-20",
    lastBilledDate: "2026-03-20",
    isBillingDue: false,
    recurringPaidYears: 1,
    notes: "Langganan tahunan retainer kepatuhan pajak & audit keuangan komprehensif (Deal \u226510 Jt: Komisi Awal 20%, Siklus Berikutnya 10%)."
  }
];
var payoutRequests = [
  {
    id: "pay-001",
    mitraId: "mitra-01",
    mitraName: "Bambang Sudirman, S.H., M.Kn.",
    memberCode: "ND-TAX-LAW-0042",
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
    memberCode: "ND-TAX-LAW-0077",
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
    memberCode: "ND-TAX-LAW-0042",
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
var DEFAULT_FIRM_TAGLINE = "Kantor Konsultan Pajak & Hukum";
var LEGACY_TAGLINES = /* @__PURE__ */ new Set([
  "Firma Konsultan Pajak & Kuasa Hukum Pengadilan Pajak Terakreditasi",
  "Tax & Legal Advisory Portal"
]);
var normalizeFirmTagline = (tagline) => {
  const trimmed = (tagline || "").trim();
  if (!trimmed || LEGACY_TAGLINES.has(trimmed)) {
    return DEFAULT_FIRM_TAGLINE;
  }
  return trimmed;
};
var appSettings = {
  firmName: "NDTAXANDLAW",
  tagline: DEFAULT_FIRM_TAGLINE,
  supportPhone: "0812-8899-7711",
  supportEmail: "advisory@ndtaxandlaw.com",
  officeAddress: "Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950",
  logoUrl: "/assets/aistudio/logo_nd_vertikal.svg",
  logoVerticalUrl: "/assets/aistudio/logo_nd_vertikal.svg",
  logoHorizontalUrl: "/assets/aistudio/logo_c3fdb6de.png",
  logoBarcodeUrl: "/assets/aistudio/logo_kotak_5ecb05e4.png",
  activeLogoType: "vertical",
  appVersion: "v2.5.0",
  copyrightText: "Hak Cipta \xA9 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.",
  defaultCommissionRate: 15,
  commissionScheme: { ...DEFAULT_COMMISSION_SCHEME },
  bonusTargetConfig: { ...DEFAULT_BONUS_TARGET_CONFIG },
  allowClientSelfRegister: true,
  chatEnabled: true,
  googleOAuthEnabled: false,
  googleClientId: "",
  geminiApiEnabled: true,
  geminiModel: "gemini-3.8-flash",
  appEnvironment: process.env.APP_ENV === "production" ? "production" : process.env.APP_ENV === "development" ? "development" : isMysqlConfigured() ? "production" : "development",
  smtpEnabled: true,
  smtpHost: process.env.SMTP_HOST || "mail.ndtaxandlaw.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpEncryption: process.env.SMTP_ENCRYPTION || "ssl",
  smtpUser: process.env.SMTP_USER || "notifications@ndtaxandlaw.com",
  smtpPassword: process.env.SMTP_PASS || "",
  smtpSenderName: "NDTAXANDLAW System",
  smtpSenderEmail: process.env.SMTP_USER || "notifications@ndtaxandlaw.com",
  smtpReplyToEmail: "advisory@ndtaxandlaw.com",
  emailOnRegistrationVerify: true,
  emailOnPayoutDisbursed: true,
  emailOnClientAcc: true,
  emailOnPasswordReset: true,
  emailOnRecurringInvoice: true,
  specializationEnabled: true,
  specializationLabel: DEFAULT_SPECIALIZATION_LABEL2,
  specializationOptions: DEFAULT_SPECIALIZATION_OPTIONS,
  mitraCustomFields: DEFAULT_MITRA_FORM_FIELDS2,
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
    actorEmail: "admin@ndtaxandlaw.com",
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
var persistSettingsToMysql = async () => {
  if (!db) return;
  try {
    await db.from("user_passwords").upsert([
      { email: "__sys_config__@ndtaxlaw.internal", password: JSON.stringify(appSettings) },
      { email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) }
    ]);
  } catch (e) {
    console.warn("[MySQL Settings KV Warning]", e);
  }
  try {
    await db.from("app_settings").upsert([
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
var pruneOldLogs = async (syncDb = false) => {
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
  if (db && (syncDb || changed)) {
    try {
      await Promise.all([
        db.from("activity_logs").delete().lt("timestamp", cutoffIso),
        db.from("email_logs").delete().lt("timestamp", cutoffIso)
      ]);
      if (changed) {
        await db.from("user_passwords").upsert([
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
var persistActivityLogsToMysql = async (latestItem) => {
  if (!db) return;
  try {
    await db.from("user_passwords").upsert([
      { email: "__sys_activity_logs__@ndtaxlaw.internal", password: JSON.stringify(activityLogs.slice(0, 250)) }
    ]);
  } catch (e) {
    console.warn("[MySQL Activity Logs KV Warning]", e);
  }
  if (latestItem) {
    try {
      await db.from("activity_logs").upsert([latestItem]);
    } catch {
    }
  }
};
var toDbEmailLogRow = (item) => ({
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
var fromDbEmailLogRow = (row) => {
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
var persistEmailLogsToMysql = async (latestItem) => {
  await pruneOldLogs(false);
  if (!db) return;
  try {
    const compactLogs = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
    await db.from("user_passwords").upsert([
      { email: "__sys_email_logs__@ndtaxlaw.internal", password: JSON.stringify(compactLogs) }
    ]);
  } catch (e) {
    console.warn("[MySQL Email Logs KV Warning]", e);
  }
  try {
    if (latestItem) {
      await db.from("email_logs").upsert([toDbEmailLogRow(latestItem)]);
    } else if (emailLogs.length > 0) {
      const rows = emailLogs.slice(0, 100).map(toDbEmailLogRow);
      await db.from("email_logs").upsert(rows);
    }
  } catch (e) {
    console.warn("[MySQL email_logs Table Warning]", e);
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
  void persistActivityLogsToMysql(newItem);
  return newItem;
};
var buildEmailHtml = (subject, recipientName, snippet) => {
  const safeFirmName = escapeHtml(appSettings.firmName || "NDTAXANDLAW");
  const safeTagline = escapeHtml(normalizeFirmTagline(appSettings.tagline));
  const safeRecipient = escapeHtml(recipientName || "Mitra NDTAXANDLAW");
  const safeSubject = escapeHtml(subject);
  const safeSnippetHtml = escapeHtml(snippet).replace(/\n/g, "<br/>");
  const safePhone = escapeHtml(appSettings.supportPhone || "");
  const safeSupportEmail = escapeHtml(appSettings.supportEmail || "");
  const safeAddress = escapeHtml(appSettings.officeAddress || "");
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #092147 0%, #113872 100%); padding: 20px 24px; border-radius: 10px 10px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">${safeFirmName}</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #fcd34d;">${safeTagline}</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none; color: #1e293b;">
        <p style="margin-top: 0; font-size: 14px;">Yth. <strong>${safeRecipient}</strong>,</p>
        <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 12px;">${safeSubject}</h3>
        <div style="background-color: #f1f5f9; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #334155;">
          ${safeSnippetHtml}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Jika Anda memiliki pertanyaan, silakan hubungi tim operasional kami melalui WhatsApp di <strong>${safePhone}</strong> atau balas email ini ke <strong>${safeSupportEmail}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Email ini dikirim secara otomatis oleh Sistem Portal Kemitraan ${safeFirmName}.<br/>
          ${safeAddress}
        </p>
      </div>
    </div>
  `;
};
var sendSystemEmail = async (params) => {
  if (db && (!appSettings.smtpPassword || appSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")) {
    try {
      const { data: kvCfg } = await db.from("user_passwords").select("*").eq("email", "__sys_config__@ndtaxlaw.internal").maybeSingle();
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
    await persistEmailLogsToMysql(failedLog);
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
    await persistEmailLogsToMysql(failedLog);
    console.warn(`[SMTP Gagal] ${errMsg}`);
    return { success: false, logId: failedLog.id, message: errMsg, error: errMsg };
  }
  const isSecure = port === 465;
  let fromEmail = (appSettings.smtpSenderEmail || "").trim();
  if (!fromEmail || fromEmail === "notifications@ndtaxandlaw.com" || fromEmail === "notifications@ndtaxlaw.com" || !fromEmail.includes("@")) {
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
    await persistEmailLogsToMysql(sentLog);
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
    await persistEmailLogsToMysql(failedLog);
    console.error(`[SMTP Error] Gagal mengirim email ke ${params.recipient} via ${smtpHostUsed}:`, errMsg);
    return {
      success: false,
      logId: failedLog.id,
      message: `Gagal mengirim email melalui SMTP (${smtpHostUsed}): ${errMsg}`,
      error: errMsg
    };
  }
};
var prospectLetters = [];
var prospectLetterSequences = {};
var usedProspectLetterNumbers = /* @__PURE__ */ new Set();
var sphDocuments = [];
var sphSequences = {};
var reconcileSphSequenceState = () => {
  for (const item of sphDocuments) {
    if (!item) continue;
    const rawNum = String(item.sphNumber || "").trim();
    const suffixYearMatch = /\/(\d{4})$/.exec(rawNum);
    const dateYear = Number(String(item.sphDate || item.createdAt || "").slice(0, 4));
    const year = suffixYearMatch && Number(suffixYearMatch[1]) >= 2e3 ? Number(suffixYearMatch[1]) : Number.isFinite(dateYear) && dateYear >= 2e3 ? dateYear : null;
    const prefixMatch = /^(\d+)\//.exec(rawNum);
    const seq = Math.max(0, Number(item.sequenceNumber) || 0, prefixMatch ? Number(prefixMatch[1]) || 0 : 0);
    if (year && seq > 0) {
      const yk = String(year);
      sphSequences[yk] = Math.max(sphSequences[yk] || 0, seq);
    }
  }
};
var persistSphDocumentsToCloud = async () => {
  if (!db) return;
  try {
    await db.from("user_passwords").upsert([
      {
        email: "__sys_sph_documents__@ndtaxlaw.internal",
        password: JSON.stringify({ items: sphDocuments, sequences: sphSequences })
      }
    ]);
  } catch (e) {
    console.warn("MySQL KV sph_documents backup warning:", e);
  }
};
var allocateUniqueSphMeta = (dateObj) => {
  const jakartaMs = dateObj.getTime() + 7 * 60 * 60 * 1e3;
  const jakartaDate = new Date(jakartaMs);
  const year = jakartaDate.getUTCFullYear();
  const monthIdx = jakartaDate.getUTCMonth();
  const day = jakartaDate.getUTCDate();
  const romanMonth = ROMAN_MONTHS[monthIdx] || "I";
  const yearKey = String(year);
  reconcileSphSequenceState();
  let nextSeq = (sphSequences[yearKey] || 0) + 1;
  let candidate = `${String(nextSeq).padStart(3, "0")}/ND/SPH/${romanMonth}/${year}`;
  const taken = new Set(sphDocuments.map((s) => String(s.sphNumber || "").trim().toUpperCase()));
  while (taken.has(candidate.toUpperCase())) {
    nextSeq += 1;
    candidate = `${String(nextSeq).padStart(3, "0")}/ND/SPH/${romanMonth}/${year}`;
  }
  sphSequences[yearKey] = nextSeq;
  const sphDate = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { sequenceNumber: nextSeq, sphNumber: candidate, sphDate };
};
var prospectMutationQueue = Promise.resolve();
var withProspectMutationLock = async (fn) => {
  const prev = prospectMutationQueue;
  let release;
  prospectMutationQueue = new Promise((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
};
var recentProspectCreateRequests = /* @__PURE__ */ new Map();
var PROSPECT_IDEMPOTENCY_TTL_MS = 2 * 60 * 1e3;
var pruneExpiredProspectCreateRequests = () => {
  const nowMs = Date.now();
  for (const [k, v] of recentProspectCreateRequests.entries()) {
    if (v.expiresAt <= nowMs) {
      recentProspectCreateRequests.delete(k);
    }
  }
  while (recentProspectCreateRequests.size > 500) {
    const oldestKey = recentProspectCreateRequests.keys().next().value;
    if (!oldestKey) break;
    recentProspectCreateRequests.delete(oldestKey);
  }
};
var extractProspectLetterYearAndSeq = (item) => {
  const rawNum = String(item.letterNumber || "").trim();
  const suffixYearMatch = /\/(\d{4})$/.exec(rawNum);
  const dateYear = Number(String(item.letterDate || item.createdAt || "").slice(0, 4));
  const year = suffixYearMatch && Number(suffixYearMatch[1]) >= 2e3 ? Number(suffixYearMatch[1]) : Number.isFinite(dateYear) && dateYear >= 2e3 ? dateYear : null;
  const seqFromNum = Number(item.sequenceNumber) || 0;
  const prefixMatch = /^(\d+)\//.exec(rawNum);
  const seqFromStr = prefixMatch ? Number(prefixMatch[1]) || 0 : 0;
  return { year, seq: Math.max(0, seqFromNum, seqFromStr) };
};
var recordUsedProspectLetterMeta = (item) => {
  const normalizedNumber = String(item.letterNumber || "").trim().toUpperCase();
  if (normalizedNumber) {
    usedProspectLetterNumbers.add(normalizedNumber);
  }
  const { year, seq } = extractProspectLetterYearAndSeq(item);
  if (year && seq > 0) {
    const yearKey = String(year);
    prospectLetterSequences[yearKey] = Math.max(prospectLetterSequences[yearKey] || 0, seq);
  }
};
var reconcileProspectLetterSequenceState = () => {
  for (const item of prospectLetters) {
    if (item) {
      recordUsedProspectLetterMeta(item);
    }
  }
};
var isProspectLetterNumberTaken = (candidateNumber) => {
  const normalized = candidateNumber.trim().toUpperCase();
  if (usedProspectLetterNumbers.has(normalized)) return true;
  return prospectLetters.some((l) => String(l.letterNumber || "").trim().toUpperCase() === normalized);
};
var ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
var formatStructuredProspectAddress = (parts, fallbackRaw = "") => {
  if (!parts || typeof parts !== "object") {
    return String(fallbackRaw || "").trim();
  }
  const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
  const streetRaw = clean(parts.street);
  const villageRaw = clean(parts.village);
  const districtRaw = clean(parts.district);
  const cityType = parts.cityType === "Kab." ? "Kab." : "Kota";
  const cityRaw = clean(parts.city);
  const provinceRaw = clean(parts.province);
  const postalRaw = clean(parts.postalCode).replace(/[^\d]/g, "").slice(0, 5);
  const segments = [];
  if (streetRaw) {
    segments.push(streetRaw);
  }
  if (villageRaw) {
    const hasPrefix = /^(kel\.?|kelurahan|desa|ds\.?)\s+/i.test(villageRaw);
    segments.push(hasPrefix ? villageRaw : `Kel./Desa ${villageRaw}`);
  }
  if (districtRaw) {
    const hasPrefix = /^(kec\.?|kecamatan)\s+/i.test(districtRaw);
    segments.push(hasPrefix ? districtRaw : `Kec. ${districtRaw}`);
  }
  if (cityRaw) {
    const hasPrefix = /^(kota|kab\.?|kabupaten)\s+/i.test(cityRaw);
    segments.push(hasPrefix ? cityRaw : `${cityType} ${cityRaw}`);
  }
  if (provinceRaw) {
    const hasPrefix = /^(prov\.?|provinsi)\s+/i.test(provinceRaw);
    segments.push(hasPrefix ? provinceRaw : `Prov. ${provinceRaw}`);
  }
  const joined = segments.join(", ");
  if (postalRaw) {
    return joined ? `${joined} ${postalRaw}` : postalRaw;
  }
  return joined || String(fallbackRaw || "").trim();
};
var allocateUniqueProspectLetterMeta = async (dateObj) => {
  const jakartaMs = dateObj.getTime() + 7 * 60 * 60 * 1e3;
  const jakartaDate = new Date(jakartaMs);
  const year = jakartaDate.getUTCFullYear();
  const monthIdx = jakartaDate.getUTCMonth();
  const day = jakartaDate.getUTCDate();
  const romanMonth = ROMAN_MONTHS[monthIdx] || "I";
  const yearKey = String(year);
  reconcileProspectLetterSequenceState();
  const localFloorSeq = prospectLetterSequences[yearKey] || 0;
  let nextSeq = null;
  if (db) {
    nextSeq = await allocateAtomicProspectSequenceMysql(year, localFloorSeq);
  }
  if (nextSeq === null || !Number.isFinite(nextSeq) || nextSeq <= localFloorSeq) {
    nextSeq = localFloorSeq + 1;
  }
  let paddedSeq = String(nextSeq).padStart(3, "0");
  let letterNumber = `${paddedSeq}/ND/SPP/${romanMonth}/${year}`;
  while (isProspectLetterNumberTaken(letterNumber)) {
    nextSeq += 1;
    paddedSeq = String(nextSeq).padStart(3, "0");
    letterNumber = `${paddedSeq}/ND/SPP/${romanMonth}/${year}`;
  }
  prospectLetterSequences[yearKey] = Math.max(prospectLetterSequences[yearKey] || 0, nextSeq);
  usedProspectLetterNumbers.add(letterNumber.toUpperCase());
  if (db) {
    await syncProspectSequenceFloorMysql(year, nextSeq);
  }
  const randomSuffix = crypto2.randomBytes(3).toString("hex").toUpperCase();
  const verificationCode = `ND-SPP-${year}-${paddedSeq}-${randomSuffix}`;
  const letterDate = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { sequenceNumber: nextSeq, letterNumber, verificationCode, letterDate };
};
var sanitizeProspectLetterContent = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const src = raw;
  const out = {};
  const cleanStr = (val, maxLen) => {
    if (typeof val !== "string") return void 0;
    const trimmed = val.replace(/\r\n/g, "\n").trim();
    if (!trimmed) return void 0;
    return trimmed.slice(0, maxLen);
  };
  const cleanLawItems = (val, maxItems) => {
    if (!Array.isArray(val)) return void 0;
    const list = val.slice(0, maxItems).filter((item) => item && typeof item === "object").map((item) => ({
      title: String(item.title || "").replace(/\s+/g, " ").trim().slice(0, 320),
      bullets: Array.isArray(item.bullets) ? item.bullets.slice(0, 8).map((b) => String(b || "").replace(/\s+/g, " ").trim().slice(0, 420)).filter(Boolean) : []
    })).filter((item) => item.title.length > 0);
    return list.length > 0 ? list : void 0;
  };
  const cleanServices = (val) => {
    if (!Array.isArray(val)) return void 0;
    const list = val.slice(0, 8).filter((item) => item && typeof item === "object").map((item) => ({
      lead: String(item.lead || "").replace(/\s+/g, " ").trim().slice(0, 120),
      body: String(item.body || "").replace(/\s+/g, " ").trim().slice(0, 500)
    })).filter((item) => item.lead.length > 0 || item.body.length > 0);
    return list.length > 0 ? list : void 0;
  };
  const cleanComparisonRows = (val) => {
    if (!Array.isArray(val)) return void 0;
    const list = val.slice(0, 10).filter((item) => item && typeof item === "object").map((item) => ({
      component: String(item.component || "").replace(/\s+/g, " ").trim().slice(0, 120),
      internalStaff: String(item.internalStaff || "").replace(/\s+/g, " ").trim().slice(0, 140),
      consultant: String(item.consultant || "").replace(/\s+/g, " ").trim().slice(0, 120)
    })).filter((item) => item.component.length > 0);
    return list.length > 0 ? list : void 0;
  };
  const cleanLines = (val, maxLines) => {
    if (!Array.isArray(val)) return void 0;
    const list = val.slice(0, maxLines).map((line) => String(line || "").replace(/\s+/g, " ").trim().slice(0, 140)).filter(Boolean);
    return list.length > 0 ? list : void 0;
  };
  const assignStr = (key, maxLen) => {
    const cleaned = cleanStr(src[key], maxLen);
    if (cleaned !== void 0) {
      out[key] = cleaned;
    }
  };
  assignStr("city", 120);
  assignStr("dateLine", 220);
  assignStr("metaNomorLabel", 100);
  assignStr("nomorValue", 220);
  assignStr("metaSifatLabel", 100);
  assignStr("sifat", 120);
  assignStr("metaLampiranLabel", 100);
  assignStr("lampiran", 120);
  assignStr("metaPerihalLabel", 100);
  assignStr("perihal", 220);
  assignStr("recipientBlock", 800);
  assignStr("greeting", 140);
  assignStr("introPara1", 1200);
  assignStr("introPara2", 1200);
  assignStr("sectionMainTitle", 360);
  assignStr("section1Title", 280);
  assignStr("section1Sanction", 700);
  assignStr("section2Title", 280);
  assignStr("section2Sanction", 700);
  assignStr("section3Title", 280);
  assignStr("section3Sanction", 700);
  assignStr("aboutTitle", 240);
  assignStr("aboutPara", 1200);
  assignStr("servicesTitle", 240);
  assignStr("servicesIntro", 600);
  assignStr("servicesCaseNote", 800);
  assignStr("comparisonTitle", 280);
  assignStr("comparisonIntro", 400);
  assignStr("comparisonClosing", 700);
  assignStr("consultTitle", 240);
  assignStr("consultPara", 1200);
  assignStr("mitraBoxTitle", 160);
  assignStr("mitraBoxNameLabel", 100);
  assignStr("mitraBoxNameValue", 200);
  assignStr("mitraBoxIdLabel", 100);
  assignStr("mitraBoxIdValue", 200);
  assignStr("mitraBoxPhoneLabel", 100);
  assignStr("mitraBoxPhoneValue", 200);
  assignStr("mitraBoxEmailLabel", 100);
  assignStr("mitraBoxEmailValue", 200);
  assignStr("closingPara", 600);
  assignStr("directorSignHeading", 140);
  assignStr("directorFirmLabel", 160);
  assignStr("directorName", 180);
  assignStr("directorTitle", 160);
  assignStr("mitraSignHeading", 140);
  assignStr("mitraSignerLabel", 160);
  assignStr("mitraSignerName", 200);
  assignStr("mitraRoleLabel", 160);
  assignStr("footerLeftTitle", 160);
  assignStr("footerRightTitle", 160);
  const s1 = cleanLawItems(src.section1Items, 6);
  if (s1) out.section1Items = s1;
  const s2 = cleanLawItems(src.section2Items, 6);
  if (s2) out.section2Items = s2;
  const s3 = cleanLawItems(src.section3Items, 8);
  if (s3) out.section3Items = s3;
  const services2 = cleanServices(src.servicesItems);
  if (services2) out.servicesItems = services2;
  if (Array.isArray(src.comparisonHeaders) && src.comparisonHeaders.length === 3) {
    const h0 = cleanStr(src.comparisonHeaders[0], 140);
    const h1 = cleanStr(src.comparisonHeaders[1], 140);
    const h2 = cleanStr(src.comparisonHeaders[2], 140);
    if (h0 && h1 && h2) {
      out.comparisonHeaders = [h0, h1, h2];
    }
  }
  const compRows = cleanComparisonRows(src.comparisonRows);
  if (compRows) out.comparisonRows = compRows;
  const fl = cleanLines(src.footerLeftLines, 6);
  if (fl) out.footerLeftLines = fl;
  const fr = cleanLines(src.footerRightLines, 6);
  if (fr) out.footerRightLines = fr;
  const cleanMm = (val, min, max) => {
    if (val === void 0 || val === null || val === "") return void 0;
    const n = Number(val);
    if (!Number.isFinite(n)) return void 0;
    return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
  };
  const mTop = cleanMm(src.marginTopMm, 15, 70);
  const mBottom = cleanMm(src.marginBottomMm, 15, 70);
  const mLeft = cleanMm(src.marginLeftMm, 10, 55);
  const mRight = cleanMm(src.marginRightMm, 10, 55);
  const pTop = cleanMm(src.paddingTopMm, 0, 30);
  const pBottom = cleanMm(src.paddingBottomMm, 0, 30);
  const pLeft = cleanMm(src.paddingLeftMm, 0, 30);
  const pRight = cleanMm(src.paddingRightMm, 0, 30);
  if (mTop !== void 0) out.marginTopMm = mTop;
  if (mBottom !== void 0) out.marginBottomMm = mBottom;
  if (mLeft !== void 0) out.marginLeftMm = mLeft;
  if (mRight !== void 0) out.marginRightMm = mRight;
  if (pTop !== void 0) out.paddingTopMm = pTop;
  if (pBottom !== void 0) out.paddingBottomMm = pBottom;
  if (pLeft !== void 0) out.paddingLeftMm = pLeft;
  if (pRight !== void 0) out.paddingRightMm = pRight;
  const effML = out.marginLeftMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.marginLeftMm;
  const effMR = out.marginRightMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.marginRightMm;
  const effPL = out.paddingLeftMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.paddingLeftMm;
  const effPR = out.paddingRightMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.paddingRightMm;
  if (effML + effMR + effPL + effPR > 130) {
    const excess = effML + effMR + effPL + effPR - 130;
    const trimEach = Math.ceil(excess / 2 * 10) / 10;
    if (out.paddingLeftMm !== void 0) out.paddingLeftMm = Math.max(0, Math.round((effPL - trimEach) * 10) / 10);
    if (out.paddingRightMm !== void 0) out.paddingRightMm = Math.max(0, Math.round((effPR - trimEach) * 10) / 10);
  }
  const effMT = out.marginTopMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.marginTopMm;
  const effMB = out.marginBottomMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.marginBottomMm;
  const effPT = out.paddingTopMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.paddingTopMm;
  const effPB = out.paddingBottomMm ?? DEFAULT_PROSPECT_LETTER_CONTENT.paddingBottomMm;
  if (effMT + effMB + effPT + effPB > 170) {
    const excess = effMT + effMB + effPT + effPB - 170;
    const trimEach = Math.ceil(excess / 2 * 10) / 10;
    if (out.paddingTopMm !== void 0) out.paddingTopMm = Math.max(0, Math.round((effPT - trimEach) * 10) / 10);
    if (out.paddingBottomMm !== void 0) out.paddingBottomMm = Math.max(0, Math.round((effPB - trimEach) * 10) / 10);
  }
  return Object.keys(out).length > 0 ? out : void 0;
};
var persistProspectLettersToMysql = async (latestItem, deletedId) => {
  if (!db) return { duplicateNumber: false };
  let duplicateNumber = false;
  const stripBusinessField = (item) => {
    const { businessField: _bf, ...rest } = item;
    return rest;
  };
  const isDuplicateLetterNumberError = (err) => {
    const msg = String(err?.message || "").toLowerCase();
    const code = String(err?.code || "").toUpperCase();
    return code === "ER_DUP_ENTRY" || msg.includes("duplicate entry") && (msg.includes("letternumber") || msg.includes("uniq_prospect_letters_number"));
  };
  try {
    if (deletedId) {
      await db.from("prospect_letters").delete().eq("id", deletedId);
    } else if (latestItem) {
      let { error } = await db.from("prospect_letters").upsert([latestItem]);
      if (error && String(error.message || "").toLowerCase().includes("businessfield")) {
        ({ error } = await db.from("prospect_letters").upsert([stripBusinessField(latestItem)]));
      }
      if (error && isDuplicateLetterNumberError(error)) {
        duplicateNumber = true;
      }
    } else if (prospectLetters.length > 0) {
      const { error } = await db.from("prospect_letters").upsert(prospectLetters);
      if (error && String(error.message || "").toLowerCase().includes("businessfield")) {
        await db.from("prospect_letters").upsert(prospectLetters.map(stripBusinessField));
      }
    }
  } catch (e) {
    if (isDuplicateLetterNumberError(e)) {
      duplicateNumber = true;
    } else {
      console.warn("[MySQL prospect_letters Table Warning]", e);
    }
  }
  if (duplicateNumber) {
    return { duplicateNumber: true };
  }
  try {
    await db.from("user_passwords").upsert([
      { email: "__sys_prospect_letters__@ndtaxlaw.internal", password: JSON.stringify(prospectLetters) },
      {
        email: "__sys_prospect_letter_sequences__@ndtaxlaw.internal",
        password: JSON.stringify({
          sequences: prospectLetterSequences,
          usedNumbers: Array.from(usedProspectLetterNumbers)
        })
      }
    ]);
  } catch (e) {
    console.warn("[MySQL KV Prospect Letters Warning]", e);
  }
  for (const [yearKey, seqVal] of Object.entries(prospectLetterSequences)) {
    const y = Number(yearKey);
    const s = Number(seqVal);
    if (Number.isFinite(y) && Number.isFinite(s) && s > 0) {
      await syncProspectSequenceFloorMysql(y, s);
    }
  }
  return { duplicateNumber: false };
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
    id: "notif-mtr-mitra-01-verify",
    title: "Status Kemitraan Disetujui (Lulus Verifikasi)",
    message: "Selamat! Pendaftaran Mitra R. Hendra Wijaya, S.E., BKP (ND-TAX-LAW-0042) telah disetujui dan divalidasi oleh Admin.",
    type: "verification",
    timestamp: "2026-11-06T09:30:00Z",
    isRead: false,
    targetAudience: "mitra",
    mitraId: "mitra-01"
  },
  {
    id: "notif-mtr-mitra-01-payout",
    title: "Pencairan Komisi Diproses",
    message: "Komisi transaksi PT Global Indo Logistik untuk Mitra R. Hendra Wijaya, S.E., BKP sebesar Rp 23.000.000 telah ditransfer ke rekening Bank Mandiri.",
    type: "commission",
    timestamp: "2026-10-26T11:00:00Z",
    isRead: true,
    targetAudience: "mitra",
    mitraId: "mitra-01"
  },
  {
    id: "notif-sys-init-01",
    title: "Pengaturan Sistem Diperbarui",
    message: "Konfigurasi sistem portal, skema komisi per klien, dan server email SMTP telah diperbarui oleh Admin.",
    type: "system_update",
    timestamp: "2026-11-04T14:15:00Z",
    isRead: true,
    targetAudience: "admin_only"
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
  if (!isProductionMode() && !db) {
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
    description: "Role Staf di bawah Admin: akses operasional sesuai menu yang diaktifkan Admin (kecuali Log Aktivitas/Email dan pengaturan sensitif Mode Sistem, MySQL, SMTP, Google OAuth, & Gemini AI).",
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
    defaultTab: "dashboard",
    allowedTabs: ["dashboard", "idcard", "marketing-tools", "commissions"],
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
var PASSWORD_SECRET_KEY = crypto2.createHash("sha256").update(process.env.PASSWORD_SECRET_KEY || "NDTAXANDLAW-ENTERPRISE-AES256-SCRYPT-KEY-2026").digest();
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
  const salt = crypto2.randomBytes(16);
  const scryptHash = crypto2.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 });
  const iv = crypto2.randomBytes(12);
  const cipher = crypto2.createCipheriv("aes-256-gcm", PASSWORD_SECRET_KEY, iv);
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
      const computedHash = crypto2.scryptSync(inputPassword, salt, 64, { N: 16384, r: 8, p: 1 });
      if (parts.length >= 8) {
        const iv = Buffer.from(parts[5], "hex");
        const authTag = Buffer.from(parts[6], "hex");
        const encryptedBuf = Buffer.from(parts[7], "hex");
        const decipher = crypto2.createDecipheriv("aes-256-gcm", PASSWORD_SECRET_KEY, iv);
        decipher.setAuthTag(authTag);
        const decryptedHash = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
        if (decryptedHash.length === computedHash.length && crypto2.timingSafeEqual(decryptedHash, computedHash)) {
          return { valid: true, role, needsUpgrade: false };
        }
        return { valid: false, role, needsUpgrade: false };
      }
      if (expectedHash.length === computedHash.length && crypto2.timingSafeEqual(expectedHash, computedHash)) {
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
  email: "admin@ndtaxandlaw.com",
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
    email: "staf@ndtaxandlaw.com",
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
  ["admin@ndtaxandlaw.com", encryptUserPassword("adminND2026!", "admin")],
  ["admin@ndtaxlaw.com", encryptUserPassword("adminND2026!", "admin")],
  ["staf@ndtaxandlaw.com", encryptUserPassword("stafND2026!", "staff")],
  ["staf@ndtaxlaw.com", encryptUserPassword("stafND2026!", "staff")],
  ["bambang.sudirman@example.com", encryptUserPassword("mitraND2026!", "mitra")],
  ["dewi.lestari@example.com", encryptUserPassword("mitraND2026!", "mitra")],
  ["rian.pratama@example.com", encryptUserPassword("mitraND2026!", "mitra")],
  ["mitra.tes@ndtaxandlaw.com", encryptUserPassword("MitraTes2026!", "mitra")]
]);
var chatRooms = [
  {
    id: "room-direct-mitra-01__staff-01",
    type: "direct",
    name: "Bambang Sudirman, S.H., M.Kn. & Rina Kusuma, S.E.",
    participantIds: ["mitra-01", "staff-01"],
    createdBy: "mitra-01",
    createdAt: new Date(Date.now() - 3600 * 1e3 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 1e3 * 15).toISOString(),
    lastMessageText: "Baik Pak Bambang, dokumen SPT Masa PT Nusantara sudah kami verifikasi.",
    lastMessageAt: new Date(Date.now() - 60 * 1e3 * 15).toISOString(),
    lastMessageSenderName: "Rina Kusuma, S.E."
  },
  {
    id: "room-group-koordinasi-pajak",
    type: "group",
    name: "Grup Koordinasi Mitra & Staf Pajak",
    description: "Ruang diskusi cepat koordinasi klien kepatuhan pajak & legalitas korporasi",
    participantIds: ["staff-01", "mitra-01", "mitra-02"],
    createdBy: "staff-01",
    createdAt: new Date(Date.now() - 3600 * 1e3 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 1e3 * 8).toISOString(),
    lastMessageText: "Silakan gunakan grup ini untuk koordinasi dokumen klien secara real-time.",
    lastMessageAt: new Date(Date.now() - 60 * 1e3 * 8).toISOString(),
    lastMessageSenderName: "Rina Kusuma, S.E."
  }
];
var chatMessages = [
  {
    id: "msg-seed-01",
    roomId: "room-direct-mitra-01__staff-01",
    senderId: "mitra-01",
    senderName: "Bambang Sudirman, S.H., M.Kn.",
    senderRole: "mitra",
    senderAvatar: MALE_AVATAR_URL,
    text: "Selamat pagi Bu Rina, mohon bantuannya untuk cek kelengkapan berkas klien PT Nusantara Energi Makmur.",
    createdAt: new Date(Date.now() - 60 * 1e3 * 25).toISOString()
  },
  {
    id: "msg-seed-02",
    roomId: "room-direct-mitra-01__staff-01",
    senderId: "staff-01",
    senderName: "Rina Kusuma, S.E.",
    senderRole: "staff",
    senderAvatar: FEMALE_AVATAR_URL,
    text: "Baik Pak Bambang, dokumen SPT Masa PT Nusantara sudah kami verifikasi.",
    replyTo: {
      messageId: "msg-seed-01",
      senderId: "mitra-01",
      senderName: "Bambang Sudirman, S.H., M.Kn.",
      text: "Selamat pagi Bu Rina, mohon bantuannya untuk cek kelengkapan berkas klien PT Nusantara Energi Makmur."
    },
    createdAt: new Date(Date.now() - 60 * 1e3 * 15).toISOString()
  },
  {
    id: "msg-seed-03",
    roomId: "room-group-koordinasi-pajak",
    senderId: "staff-01",
    senderName: "Rina Kusuma, S.E.",
    senderRole: "staff",
    senderAvatar: FEMALE_AVATAR_URL,
    text: "Selamat datang di Grup Koordinasi Mitra & Staf Pajak NDTAXANDLAW. Silakan gunakan grup ini untuk koordinasi dokumen klien secara real-time.",
    createdAt: new Date(Date.now() - 60 * 1e3 * 8).toISOString()
  }
];
var passwordResetTokens = /* @__PURE__ */ new Map();
var isProductionMode = () => {
  if (mysqlPreviewFallbackActive || !db || !isMysqlConfigured()) return false;
  return appSettings.appEnvironment === "production" || process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
};
var formatMitraMemberCode = (rawCode, fallbackId) => {
  const trimmed = String(rawCode || "").trim().toUpperCase();
  if (trimmed.startsWith("ND-TAX-LAW-")) {
    const suffix = trimmed.slice("ND-TAX-LAW-".length).trim();
    if (suffix) return `ND-TAX-LAW-${suffix}`;
  }
  const parts = trimmed.split("-").filter(Boolean);
  const lastSegment = parts.length > 0 ? parts[parts.length - 1] : "";
  if (lastSegment && /\d/.test(lastSegment)) {
    return `ND-TAX-LAW-${lastSegment}`;
  }
  const idDigits = String(fallbackId || "").replace(/\D/g, "").slice(-4);
  return `ND-TAX-LAW-${idDigits || "0001"}`;
};
var normalizeMitraAvatars = (list) => {
  return list.map((m) => {
    const bankMeta = m.bankDetails || {};
    const avatarInferredGender = m.avatarUrl === FEMALE_AVATAR_URL ? "female" : m.avatarUrl === MALE_AVATAR_URL ? "male" : void 0;
    const gender = m.gender === "female" || m.gender === "male" ? m.gender : bankMeta.__gender === "female" || bankMeta.__gender === "male" ? bankMeta.__gender : avatarInferredGender || inferGenderFromName(m.fullName);
    const emailVerified = typeof m.emailVerified === "boolean" ? m.emailVerified : typeof bankMeta.__emailVerified === "boolean" ? bankMeta.__emailVerified : true;
    const verificationToken = m.verificationToken || bankMeta.__verificationToken || void 0;
    const verificationTokenExpiry = m.verificationTokenExpiry || bankMeta.__verificationTokenExpiry || void 0;
    const resolvedCustomFields = m.customFields || bankMeta.__customFields || void 0;
    let resolvedKtpUrl = m.ktpFileUrl || bankMeta.__ktpFileUrl || void 0;
    if (!resolvedKtpUrl && resolvedCustomFields) {
      for (const [k, v] of Object.entries(resolvedCustomFields)) {
        if (!v || typeof v !== "string") continue;
        const kl = k.toLowerCase();
        if ((k === "mitra-def-ktpFile" || kl.includes("ktp") || kl.includes("npwp")) && v.trim() !== "" && v.trim() !== "-") {
          resolvedKtpUrl = v.trim();
          break;
        }
      }
    }
    const resolvedKtpName = m.ktpFileName || bankMeta.__ktpFileName || resolvedCustomFields?.["__ktpFileName"] || void 0;
    const isActive = typeof m.isActive === "boolean" ? m.isActive : typeof bankMeta.__isActive === "boolean" ? bankMeta.__isActive : true;
    const deactivatedAt = m.deactivatedAt || bankMeta.__deactivatedAt || void 0;
    const deactivatedBy = m.deactivatedBy || bankMeta.__deactivatedBy || void 0;
    const deactivatedReason = m.deactivatedReason || bankMeta.__deactivatedReason || void 0;
    const profileCompletionNotice = m.profileCompletionNotice || bankMeta.__profileCompletionNotice || void 0;
    const profileCompletionNoticeAt = m.profileCompletionNoticeAt || bankMeta.__profileCompletionNoticeAt || void 0;
    const whatsappGroupInvited = typeof m.whatsappGroupInvited === "boolean" ? m.whatsappGroupInvited : Boolean(bankMeta.__whatsappGroupInvited);
    const whatsappGroupInvitedAt = m.whatsappGroupInvitedAt || bankMeta.__whatsappGroupInvitedAt || void 0;
    return {
      ...m,
      memberCode: formatMitraMemberCode(m.memberCode, m.id),
      gender,
      avatarUrl: resolveAvatarUrl(m.avatarUrl, gender, m.fullName),
      emailVerified,
      verificationToken,
      verificationTokenExpiry,
      rejectionReason: m.rejectionReason || bankMeta.__rejectionReason || void 0,
      rejectedAt: m.rejectedAt || bankMeta.__rejectedAt || void 0,
      profileCompletionNotice,
      profileCompletionNoticeAt,
      whatsappGroupInvited,
      whatsappGroupInvitedAt,
      isActive,
      deactivatedAt,
      deactivatedBy,
      deactivatedReason,
      customFields: resolvedCustomFields,
      ktpFileUrl: resolvedKtpUrl,
      ktpFileName: resolvedKtpName
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
var toDbClientDeal = (deal) => {
  const cleanNotes = (deal.notes || "").replace(ND_META_REGEX, "").trim();
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
    appliedCommissionRate: deal.appliedCommissionRate ?? null,
    lockedRecurringRate: deal.lockedRecurringRate ?? null,
    recurringCommissionAmount: deal.recurringCommissionAmount ?? null,
    status: deal.status,
    date: deal.date,
    recurringPaidMonths: deal.recurringPaidMonths ?? null,
    recurringPaidYears: deal.recurringPaidYears ?? null,
    periodStart: deal.periodStart ?? null,
    periodEnd: deal.periodEnd ?? null,
    durationMonths: deal.durationMonths ?? null,
    paymentTermType: deal.paymentTermType ?? "one_time",
    notes: cleanNotes,
    submittedBy: deal.submittedBy ?? "mitra",
    subscriptionStartDate: deal.subscriptionStartDate ?? null,
    billingDayOfMonth: deal.billingDayOfMonth ?? null,
    nextBillingDate: deal.nextBillingDate ?? null,
    lastBilledDate: deal.lastBilledDate ?? null,
    isBillingDue: Boolean(deal.isBillingDue),
    terminatedAt: deal.terminatedAt ?? null,
    terminationReason: deal.terminationReason ?? null,
    rejectedAt: deal.rejectedAt ?? null,
    rejectionReason: deal.rejectionReason ?? null,
    customFields: deal.customFields ?? null
  };
};
var fromDbClientDeal = (row) => {
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
  const pType = row.pricingType || "case_by_case";
  const dVal = Number(row.dealValue) || 0;
  const fallbackCalc = calculateClientDealCommission(pType, dVal, appSettings?.commissionScheme);
  const appliedRate = row.appliedCommissionRate ?? meta.appliedCommissionRate ?? (dVal > 0 && row.commissionAmount > 0 ? Math.round(Number(row.commissionAmount) / dVal * 100) : fallbackCalc.initialRate);
  const lockedRecRate = row.lockedRecurringRate ?? meta.lockedRecurringRate ?? (pType === "case_by_case" ? 0 : fallbackCalc.recurringRate);
  const recCommAmt = row.recurringCommissionAmount ?? meta.recurringCommissionAmount ?? (pType === "case_by_case" ? 0 : Math.round(dVal * lockedRecRate / 100));
  return {
    ...row,
    notes: cleanNotes,
    appliedCommissionRate: appliedRate,
    lockedRecurringRate: lockedRecRate,
    recurringCommissionAmount: recCommAmt,
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
    const d = fromDbClientDeal(rawDeal);
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
var DATA_DIR = path3.join(process.cwd(), "data");
var DB_FILE = path3.join(DATA_DIR, "database.json");
var cleanupLocalDatabaseFileInProduction = () => {
  if (!isProductionMode() || !db) return;
  try {
    if (fs3.existsSync(DB_FILE)) {
      fs3.unlinkSync(DB_FILE);
      console.log("[Production Mode] File database lokal (data/database.json) dihapus otomatis agar tidak memenuhi penyimpanan server (100% menggunakan MySQL).");
    }
    if (fs3.existsSync(DATA_DIR)) {
      const remaining = fs3.readdirSync(DATA_DIR);
      if (remaining.length === 0) {
        fs3.rmdirSync(DATA_DIR);
      }
    }
  } catch {
  }
};
var saveDatabase = () => {
  try {
    if (isProductionMode() && db) {
      cleanupLocalDatabaseFileInProduction();
      return;
    }
    if (!fs3.existsSync(DATA_DIR)) {
      fs3.mkdirSync(DATA_DIR, { recursive: true });
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
      proposalTemplates,
      commissions,
      notifications,
      emailLogs,
      activityLogs,
      appSettings,
      roles: systemRoles,
      adminProfile: safeAdminProfile,
      staffAccounts,
      chatRooms,
      chatMessages,
      prospectLetters,
      prospectLetterSequences,
      usedProspectLetterNumbers: Array.from(usedProspectLetterNumbers),
      sphDocuments,
      sphSequences,
      userPasswords: passwordsObj
    };
    fs3.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage Error] Gagal menyimpan konfigurasi ke disk:", err);
  }
};
var LEGACY_SEEDED_CHAT_ROOM_IDS = /* @__PURE__ */ new Set([
  "room-direct-mitra-01__staff-01",
  "room-group-koordinasi-pajak"
]);
var LEGACY_SEEDED_CHAT_MSG_IDS = /* @__PURE__ */ new Set([
  "msg-seed-01",
  "msg-seed-02",
  "msg-seed-03"
]);
var loadDatabase = () => {
  try {
    if (isProductionMode() && db) {
      mitras = [];
      services = [];
      clientDeals = [];
      payoutRequests = [];
      marketingTools = [];
      commissions = [];
      notifications = [];
      activityLogs = [];
      emailLogs = [];
      chatRooms = [];
      chatMessages = [];
      prospectLetters = [];
      sphDocuments = [];
      cleanupLocalDatabaseFileInProduction();
      console.log("[Production Mode] Database lokal dinonaktifkan sepenuhnya. Menggunakan Database MySQL 100%.");
      return;
    }
    if (!fs3.existsSync(DATA_DIR)) {
      fs3.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs3.existsSync(DB_FILE)) {
      const raw = fs3.readFileSync(DB_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data.appSettings) {
        appSettings = { ...appSettings, ...data.appSettings };
        if (appSettings.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
          appSettings.smtpPassword = process.env.SMTP_PASS || "";
        }
        if (isMysqlConfigured() && (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production")) {
          appSettings.appEnvironment = "production";
        } else if (!isMysqlConfigured()) {
          appSettings.appEnvironment = "development";
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
      if (Array.isArray(data.chatRooms)) {
        chatRooms = data.chatRooms;
      }
      if (Array.isArray(data.chatMessages)) {
        chatMessages = data.chatMessages;
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
        chatRooms = [];
        chatMessages = [];
        prospectLetters = [];
        sphDocuments = [];
        cleanupLocalDatabaseFileInProduction();
        console.log("[Production Mode] Hanya terhubung ke Database MySQL (penyimpanan lokal dinonaktifkan).");
      } else {
        if (Array.isArray(data.mitras)) mitras = normalizeMitraAvatars(data.mitras);
        if (Array.isArray(data.services)) {
          services = normalizeServicesCatalog(data.services).list;
        }
        if (Array.isArray(data.clientDeals)) clientDeals = normalizeClientDeals(data.clientDeals);
        if (Array.isArray(data.payoutRequests)) payoutRequests = data.payoutRequests;
        if (Array.isArray(data.marketingTools)) marketingTools = data.marketingTools;
        if (Array.isArray(data.proposalTemplates) && data.proposalTemplates.length > 0) {
          proposalTemplates = normalizeProposalTemplates(data.proposalTemplates).list;
        }
        if (Array.isArray(data.commissions)) commissions = data.commissions;
        if (Array.isArray(data.notifications)) notifications = data.notifications;
        if (Array.isArray(data.prospectLetters)) prospectLetters = data.prospectLetters;
        if (data.prospectLetterSequences && typeof data.prospectLetterSequences === "object") {
          for (const [yk, val] of Object.entries(data.prospectLetterSequences)) {
            const n = Number(val) || 0;
            if (n > 0) {
              prospectLetterSequences[yk] = Math.max(prospectLetterSequences[yk] || 0, n);
            }
          }
        }
        if (Array.isArray(data.usedProspectLetterNumbers)) {
          for (const num of data.usedProspectLetterNumbers) {
            const norm = String(num || "").trim().toUpperCase();
            if (norm) usedProspectLetterNumbers.add(norm);
          }
        }
        if (Array.isArray(data.sphDocuments)) sphDocuments = data.sphDocuments;
        if (data.sphSequences && typeof data.sphSequences === "object") {
          for (const [yk, val] of Object.entries(data.sphSequences)) {
            const n = Number(val) || 0;
            if (n > 0) sphSequences[yk] = Math.max(sphSequences[yk] || 0, n);
          }
        }
        reconcileProspectLetterSequenceState();
        reconcileSphSequenceState();
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
      chatRooms = [];
      chatMessages = [];
      prospectLetters = [];
      sphDocuments = [];
      cleanupLocalDatabaseFileInProduction();
    }
  } catch (err) {
    console.error("[Storage Error] Gagal memuat konfigurasi disk:", err);
  }
};
var syncFromMysql = async () => {
  if (!db) return;
  try {
    const { data: dbMitras, error: errM } = await db.from("mitras").select("*");
    if (!errM && Array.isArray(dbMitras)) {
      mitras = normalizeMitraAvatars(dbMitras);
      console.log(`[MySQL Database] Sinkronisasi ${mitras.length} mitra dari MySQL`);
    }
    const { data: dbServices, error: errS } = await db.from("services").select("*");
    if (!errS && Array.isArray(dbServices)) {
      const normSrv = normalizeServicesCatalog(dbServices);
      services = normSrv.list;
      if (normSrv.migrated) {
        try {
          await db.from("services").delete().in("id", Array.from(LEGACY_SEEDED_SERVICE_IDS));
          await db.from("services").upsert(services);
        } catch (e) {
          console.warn("[MySQL Services Catalog Sync Warning]", e);
        }
      }
      console.log(`[MySQL Database] Sinkronisasi ${services.length} layanan dari MySQL`);
    }
    const { data: dbDeals, error: errD } = await db.from("client_deals").select("*");
    if (!errD && Array.isArray(dbDeals)) {
      clientDeals = normalizeClientDeals(dbDeals);
      console.log(`[MySQL Database] Sinkronisasi ${clientDeals.length} deal klien dari MySQL`);
    }
    const { data: dbCommissions, error: errC } = await db.from("commissions").select("*");
    if (!errC && Array.isArray(dbCommissions)) {
      commissions = dbCommissions;
      console.log(`[MySQL Database] Sinkronisasi ${commissions.length} komisi dari MySQL`);
    }
    const { data: dbPayouts, error: errPay } = await db.from("payout_requests").select("*");
    if (!errPay && Array.isArray(dbPayouts)) {
      payoutRequests = dbPayouts;
      console.log(`[MySQL Database] Sinkronisasi ${payoutRequests.length} pengajuan pencairan dari MySQL`);
    }
    const { data: dbTools, error: errT } = await db.from("marketing_tools").select("*");
    if (!errT && Array.isArray(dbTools) && dbTools.length > 0) {
      marketingTools = dbTools;
      console.log(`[MySQL Database] Sinkronisasi ${marketingTools.length} tools marketing dari MySQL`);
    }
    const { data: dbNotifs, error: errN } = await db.from("notifications").select("*").order("timestamp", { ascending: false });
    if (!errN && Array.isArray(dbNotifs)) {
      notifications = dbNotifs;
      console.log(`[MySQL Database] Sinkronisasi ${notifications.length} notifikasi dari MySQL`);
    }
    let tableChatRooms = [];
    let tableChatMessages = [];
    try {
      const [{ data: dbRooms, error: errCR }, { data: dbMsgs, error: errCM }] = await Promise.all([
        db.from("chat_rooms").select("*"),
        db.from("chat_messages").select("*").order("createdAt", { ascending: true })
      ]);
      if (!errCR && Array.isArray(dbRooms)) {
        tableChatRooms = dbRooms;
      }
      if (!errCM && Array.isArray(dbMsgs)) {
        tableChatMessages = dbMsgs;
      }
    } catch {
    }
    let tableProspectLetters = [];
    try {
      const { data: dbProspects, error: errPL } = await db.from("prospect_letters").select("*").order("createdAt", { ascending: false });
      if (!errPL && Array.isArray(dbProspects)) {
        tableProspectLetters = dbProspects;
      }
    } catch {
    }
    try {
      const { data: dbSeqRows, error: errSeq } = await db.from("prospect_letter_sequences").select("*");
      if (!errSeq && Array.isArray(dbSeqRows)) {
        for (const row of dbSeqRows) {
          const yk = String(Number(row.seqYear) || "");
          const lastSeq = Number(row.lastSequence) || 0;
          if (yk && lastSeq > 0) {
            prospectLetterSequences[yk] = Math.max(prospectLetterSequences[yk] || 0, lastSeq);
          }
        }
      }
    } catch {
    }
    void ensureProspectLetterNumberUniqueIndexMysql();
    let kvChatRooms = [];
    let kvChatMessages = [];
    let kvProspectLetters = [];
    const { data: dbPasswords, error: errP } = await db.from("user_passwords").select("*");
    if (!errP && Array.isArray(dbPasswords)) {
      const toUpgradeInMysql = [];
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
              appSettings.tagline = normalizeFirmTagline(appSettings.tagline);
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
        if (emailLower === "__sys_chat_rooms__@ndtaxlaw.internal") {
          try {
            const parsedRooms = JSON.parse(row.password);
            if (Array.isArray(parsedRooms)) {
              kvChatRooms = parsedRooms;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_chat_messages__@ndtaxlaw.internal") {
          try {
            const parsedMsgs = JSON.parse(row.password);
            if (Array.isArray(parsedMsgs)) {
              kvChatMessages = parsedMsgs;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_marketing_tools__@ndtaxlaw.internal") {
          try {
            const parsedTools = JSON.parse(row.password);
            if (Array.isArray(parsedTools) && parsedTools.length > 0) {
              const mergedToolsMap = /* @__PURE__ */ new Map();
              for (const t of [...marketingTools, ...parsedTools]) {
                if (t && t.id && !mergedToolsMap.has(t.id)) {
                  mergedToolsMap.set(t.id, t);
                }
              }
              marketingTools = Array.from(mergedToolsMap.values());
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_proposal_templates__@ndtaxlaw.internal") {
          try {
            const parsedProposals = JSON.parse(row.password);
            if (Array.isArray(parsedProposals) && parsedProposals.length > 0) {
              proposalTemplates = normalizeProposalTemplates(parsedProposals).list;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_prospect_letters__@ndtaxlaw.internal") {
          try {
            const parsedLetters = JSON.parse(row.password);
            if (Array.isArray(parsedLetters)) {
              kvProspectLetters = parsedLetters;
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_prospect_letter_sequences__@ndtaxlaw.internal") {
          try {
            const parsedSeq = JSON.parse(row.password);
            if (parsedSeq && typeof parsedSeq === "object") {
              if (parsedSeq.sequences && typeof parsedSeq.sequences === "object") {
                for (const [yk, val] of Object.entries(parsedSeq.sequences)) {
                  const n = Number(val) || 0;
                  if (n > 0) {
                    prospectLetterSequences[yk] = Math.max(prospectLetterSequences[yk] || 0, n);
                  }
                }
              }
              if (Array.isArray(parsedSeq.usedNumbers)) {
                for (const num of parsedSeq.usedNumbers) {
                  const norm = String(num || "").trim().toUpperCase();
                  if (norm) usedProspectLetterNumbers.add(norm);
                }
              }
            }
          } catch {
          }
          continue;
        }
        if (emailLower === "__sys_sph_documents__@ndtaxlaw.internal") {
          try {
            const parsedSph = JSON.parse(row.password);
            if (parsedSph && typeof parsedSph === "object") {
              if (Array.isArray(parsedSph.items)) {
                sphDocuments = parsedSph.items;
              }
              if (parsedSph.sequences && typeof parsedSph.sequences === "object") {
                for (const [yk, val] of Object.entries(parsedSph.sequences)) {
                  const n = Number(val) || 0;
                  if (n > 0) {
                    sphSequences[yk] = Math.max(sphSequences[yk] || 0, n);
                  }
                }
              }
              reconcileSphSequenceState();
            }
          } catch {
          }
          continue;
        }
        if ((emailLower.startsWith("__sys_file_") || emailLower.startsWith("__sys_chat_file_")) && emailLower.endsWith("__@ndtaxlaw.internal")) {
          try {
            const parsedFile = JSON.parse(row.password);
            if (parsedFile && parsedFile.fileName && parsedFile.base64) {
              const safeName = path3.basename(String(parsedFile.fileName));
              if (safeName && safeName !== "." && safeName !== "..") {
                const isChatBucket = emailLower.startsWith("__sys_chat_file_") || parsedFile.bucket === "chat";
                const subFolder = isChatBucket ? "chat" : "marketing-tools";
                const buf = Buffer.from(parsedFile.base64, "base64");
                const homeDir = path3.join(os2.homedir(), ".ndtaxandlaw_storage", "uploads", subFolder);
                const dataDir = path3.join(DATA_DIR, "uploads", subFolder);
                const pubDir = path3.join(__dirname, "public", "uploads", subFolder);
                for (const dir of [homeDir, dataDir, pubDir]) {
                  try {
                    if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
                    const resolvedBase = path3.resolve(dir);
                    const target = path3.resolve(resolvedBase, safeName);
                    if (target.startsWith(resolvedBase + path3.sep) && !fs3.existsSync(target)) {
                      fs3.writeFileSync(target, buf);
                    }
                  } catch {
                  }
                }
              }
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
          toUpgradeInMysql.push({ email: emailLower, password: encrypted });
        } else {
          userPasswords.set(emailLower, row.password);
        }
      }
      if (!hasSysConfig) {
        toUpgradeInMysql.push({ email: "__sys_config__@ndtaxlaw.internal", password: JSON.stringify(appSettings) });
      }
      if (!hasSysRoles) {
        toUpgradeInMysql.push({ email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) });
      }
      if (!hasSysAdminProfile) {
        const { password: _ap, ...safeAdmin } = adminAccount;
        toUpgradeInMysql.push({ email: "__sys_admin_profile__@ndtaxlaw.internal", password: JSON.stringify(safeAdmin) });
      }
      if (!hasSysStaffAccounts) {
        toUpgradeInMysql.push({ email: "__sys_staff_accounts__@ndtaxlaw.internal", password: JSON.stringify(staffAccounts) });
      }
      if (!hasSysActivityLogs) {
        toUpgradeInMysql.push({ email: "__sys_activity_logs__@ndtaxlaw.internal", password: JSON.stringify(activityLogs.slice(0, 250)) });
      }
      if (!hasSysEmailLogs) {
        const compactEmails = emailLogs.slice(0, 200).map(({ htmlContent: _h, ...rest }) => rest);
        toUpgradeInMysql.push({ email: "__sys_email_logs__@ndtaxlaw.internal", password: JSON.stringify(compactEmails) });
      }
      for (const m of mitras) {
        const mEmail = m.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r) => r.email && r.email.toLowerCase() === mEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(mEmail) || encryptUserPassword("mitraND2026!", "mitra");
          userPasswords.set(mEmail, localEnc);
          toUpgradeInMysql.push({ email: mEmail, password: localEnc });
        }
      }
      const mergedProspectMap = /* @__PURE__ */ new Map();
      for (const item of tableProspectLetters) {
        if (item && item.id && !mergedProspectMap.has(item.id)) {
          mergedProspectMap.set(item.id, item);
        }
      }
      for (const kvItem of kvProspectLetters) {
        if (!kvItem || !kvItem.id) continue;
        const existing = mergedProspectMap.get(kvItem.id);
        if (!existing) {
          mergedProspectMap.set(kvItem.id, kvItem);
        } else if (!existing.businessField && kvItem.businessField) {
          mergedProspectMap.set(kvItem.id, { ...existing, businessField: kvItem.businessField });
        }
      }
      if (tableProspectLetters.length > 0 || kvProspectLetters.length > 0) {
        prospectLetters = Array.from(mergedProspectMap.values()).sort(
          (a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")
        );
      }
      reconcileProspectLetterSequenceState();
      for (const s of staffAccounts) {
        const sEmail = s.email.toLowerCase();
        const existingInCloud = dbPasswords.some((r) => r.email && r.email.toLowerCase() === sEmail);
        if (!existingInCloud) {
          const localEnc = userPasswords.get(sEmail) || encryptUserPassword("stafND2026!", "staff");
          userPasswords.set(sEmail, localEnc);
          toUpgradeInMysql.push({ email: sEmail, password: localEnc });
        }
      }
      const adminEmail = adminAccount.email.toLowerCase();
      if (!dbPasswords.some((r) => r.email && r.email.toLowerCase() === adminEmail)) {
        const adminEnc = userPasswords.get(adminEmail) || encryptUserPassword(adminAccount.password, "admin");
        userPasswords.set(adminEmail, adminEnc);
        toUpgradeInMysql.push({ email: adminEmail, password: adminEnc });
      }
      const mergedRoomsMap = /* @__PURE__ */ new Map();
      for (const r of [...tableChatRooms, ...kvChatRooms]) {
        if (!r || !r.id) continue;
        if (isProductionMode() && LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id)) continue;
        const existing = mergedRoomsMap.get(r.id);
        if (!existing || new Date(r.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
          mergedRoomsMap.set(r.id, r);
        }
      }
      if (mergedRoomsMap.size > 0 || isProductionMode()) {
        chatRooms = Array.from(mergedRoomsMap.values()).sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
      }
      const mergedMsgsMap = /* @__PURE__ */ new Map();
      for (const m of [...tableChatMessages, ...kvChatMessages]) {
        if (!m || !m.id) continue;
        if (isProductionMode() && LEGACY_SEEDED_CHAT_MSG_IDS.has(m.id)) continue;
        const existing = mergedMsgsMap.get(m.id);
        if (!existing) {
          mergedMsgsMap.set(m.id, m);
        } else {
          const nextReactions = Array.isArray(m.reactions) && m.reactions.length > 0 ? m.reactions : existing.reactions;
          mergedMsgsMap.set(m.id, {
            ...existing,
            ...m,
            reactions: nextReactions
          });
        }
      }
      if (mergedMsgsMap.size > 0 || isProductionMode()) {
        chatMessages = Array.from(mergedMsgsMap.values()).sort(
          (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      }
      console.log(
        `[MySQL Database] Sinkronisasi ${chatRooms.length} ruang chat & ${chatMessages.length} pesan chat dari MySQL`
      );
      if (toUpgradeInMysql.length > 0) {
        await db.from("user_passwords").upsert(toUpgradeInMysql);
        console.log(`[MySQL Database] Sinkronisasi pengaturan, profil admin, akun staf, log aktivitas, log email & kredensial terenkripsi ke MySQL selesai.`);
      }
    }
    try {
      const { data: dbSettings, error: errSet } = await db.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
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
      const { data: dbActLogs, error: errAct } = await db.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(250);
      if (!errAct && Array.isArray(dbActLogs) && dbActLogs.length > 0) {
        activityLogs = dbActLogs;
      }
    } catch {
    }
    try {
      const { data: dbEmLogs, error: errEm } = await db.from("email_logs").select("*").order("timestamp", { ascending: false }).limit(200);
      if (!errEm && Array.isArray(dbEmLogs)) {
        const mappedFromTable = dbEmLogs.map(fromDbEmailLogRow);
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
          const rowsToSync = emailLogs.slice(0, 100).map(toDbEmailLogRow);
          await db.from("email_logs").upsert(rowsToSync);
        }
      }
    } catch {
    }
    saveDatabase();
  } catch (err) {
    console.warn("[MySQL Database Warning] Gagal sinkronisasi data dari MySQL saat startup:", err);
  }
};
if (!process.env.APP_ENV) {
  appSettings.appEnvironment = isMysqlConfigured() ? "production" : "development";
}
if (db) {
  ensureMysqlSchema().then((res) => {
    if (res.success) {
      console.log(`[MySQL Database] ${res.message}`);
      loadDatabase();
      return syncFromMysql();
    } else {
      console.warn(`[MySQL Schema Warning] ${res.message}`);
      const cfg = getMysqlConfig();
      const isLocalHost = cfg.host === "127.0.0.1" || cfg.host === "localhost";
      const isConnRefused = /ECONNREFUSED/i.test(String(res.message || ""));
      if (isLocalHost && isConnRefused) {
        mysqlPreviewFallbackActive = true;
        db = null;
        appSettings.appEnvironment = "development";
        console.warn("[MySQL Fallback] MySQL lokal tidak berjalan di lingkungan preview; beralih otomatis ke mode development lokal.");
        loadDatabase();
        return;
      }
      loadDatabase();
      return syncFromMysql();
    }
  }).catch((err) => {
    console.warn("[MySQL Startup Warning]", err);
    const cfg = getMysqlConfig();
    const isLocalHost = cfg.host === "127.0.0.1" || cfg.host === "localhost";
    if (isLocalHost && /ECONNREFUSED/i.test(String(err?.message || err || ""))) {
      mysqlPreviewFallbackActive = true;
      db = null;
      appSettings.appEnvironment = "development";
    }
    loadDatabase();
  });
} else {
  loadDatabase();
}
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
  if (db) {
    try {
      await db.from("user_passwords").upsert([
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
  if (db) {
    try {
      await db.from("user_passwords").upsert([
        { email: "__sys_roles__@ndtaxlaw.internal", password: JSON.stringify(systemRoles) }
      ]);
    } catch {
    }
  }
  res.json({ success: true, data: target });
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = sanitizeSqlIdentifier((email || "").trim().toLowerCase());
  const isProd = isProductionMode();
  if (!normalizedEmail || !password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Email/ID Anggota dan kata sandi wajib diisi."
    });
  }
  const loginRateKey = `login:${getClientIp(req)}:${normalizedEmail}`;
  const loginRate = consumeRateLimit(authRateBuckets, loginRateKey, 12, 10 * 60 * 1e3);
  if (!loginRate.allowed) {
    res.setHeader("Retry-After", String(loginRate.retryAfterSec));
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan login yang gagal. Akun dikunci sementara selama ${loginRate.retryAfterSec} detik demi keamanan.`
    });
  }
  if (db) {
    try {
      const { data: sysRows } = await db.from("user_passwords").select("*").in("email", [
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
            await db.from("user_passwords").upsert([{ email: normalizedEmail, password: enc }]);
          } else {
            userPasswords.set(normalizedEmail, pwRow.password);
          }
        }
      }
    } catch {
    }
  }
  const isAdminLoginMatch = normalizedEmail === adminAccount.email.toLowerCase() || normalizedEmail === "admin@ndtaxandlaw.com" || normalizedEmail === "admin@ndtaxlaw.com";
  if (isAdminLoginMatch) {
    const storedAdminCred = userPasswords.get(normalizedEmail) || userPasswords.get(adminAccount.email.toLowerCase()) || encryptUserPassword(adminAccount.password, "admin");
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
            "idcard",
            "chat"
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
  const altStaffEmail = normalizedEmail.endsWith("@ndtaxandlaw.com") ? normalizedEmail.replace("@ndtaxandlaw.com", "@ndtaxlaw.com") : normalizedEmail.endsWith("@ndtaxlaw.com") ? normalizedEmail.replace("@ndtaxlaw.com", "@ndtaxandlaw.com") : normalizedEmail;
  const staffMember = staffAccounts.find(
    (s) => s.email.toLowerCase() === normalizedEmail || s.email.toLowerCase() === altStaffEmail
  );
  if (staffMember) {
    if (!staffMember.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun Staf Anda sedang dinonaktifkan oleh Admin. Silakan hubungi Administrator."
      });
    }
    const storedStaffCred = userPasswords.get(normalizedEmail) || userPasswords.get(staffMember.email.toLowerCase()) || encryptUserPassword("stafND2026!", "staff");
    const verifyRes = verifyUserPassword(password, storedStaffCred, "staff");
    const isStaffPassValid = isProd ? verifyRes.valid : verifyRes.valid || password === "stafND2026!";
    if (isStaffPassValid) {
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, "staff");
        userPasswords.set(normalizedEmail, upgraded);
        if (db) {
          try {
            await db.from("user_passwords").upsert([{ email: normalizedEmail, password: upgraded }]);
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
  if (db) {
    try {
      const { data: dbMitras, error: errM } = await db.from("mitras").select("*");
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
          message: "Gagal terhubung ke Database MySQL pada mode Production."
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
    if (mitra.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "MITRA_INACTIVE",
        message: "Akun Mitra Anda sedang dinonaktifkan oleh Admin / Staf sehingga tidak dapat login. Silakan hubungi Administrator untuk informasi lebih lanjut."
      });
    }
    const mitraEmailLower = mitra.email.toLowerCase();
    const storedCred = userPasswords.get(mitraEmailLower) || encryptUserPassword("mitraND2026!", "mitra");
    const verifyRes = verifyUserPassword(password, storedCred, "mitra");
    const isPasswordValid = isProd ? verifyRes.valid : verifyRes.valid || password === "mitraND2026!";
    if (isPasswordValid) {
      if (mitra.emailVerified === false) {
        const freshOtp = Math.floor(1e5 + Math.random() * 9e5).toString();
        const freshExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
        mitra.verificationToken = freshOtp;
        mitra.verificationTokenExpiry = freshExpiry;
        mitra.bankDetails = {
          ...mitra.bankDetails || {
            bankName: "-",
            accountNumber: "-",
            accountHolder: mitra.fullName
          },
          __emailVerified: false,
          __verificationToken: freshOtp,
          __verificationTokenExpiry: freshExpiry
        };
        const memIdx = mitras.findIndex((m) => m.id === mitra.id);
        if (memIdx >= 0) {
          mitras[memIdx] = mitra;
        }
        saveDatabase();
        if (db) {
          try {
            const { error: upErr } = await db.from("mitras").update({
              emailVerified: false,
              verificationToken: freshOtp,
              verificationTokenExpiry: freshExpiry,
              bankDetails: mitra.bankDetails
            }).eq("id", mitra.id);
            if (upErr) {
              await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", mitra.id);
            }
          } catch (e) {
            console.warn("MySQL auto-OTP login update error:", e);
          }
        }
        const otpMail = await sendSystemEmail({
          recipient: mitra.email,
          recipientName: mitra.fullName,
          subject: `[Kode OTP: ${freshOtp}] Verifikasi Akun Login Kemitraan NDTAXANDLAW`,
          category: "registration_verify",
          previewSnippet: `Halo ${mitra.fullName},

Akun kemitraan Anda (${mitra.memberCode}) belum terverifikasi. Berikut adalah Kode Verifikasi (OTP) 6-Digit untuk mengaktifkan akun Anda:

KODE VERIFIKASI: ${freshOtp}

Masukkan 6 digit kode di atas pada halaman Verifikasi Akun agar Anda dapat login ke portal NDTAXANDLAW. Kode ini berlaku selama 24 jam.`
        });
        return res.status(403).json({
          success: false,
          needsEmailVerification: true,
          otpSent: true,
          emailSent: otpMail.success,
          email: mitra.email,
          message: `Akun Anda belum terverifikasi. Kode verifikasi OTP 6-digit telah otomatis dikirimkan ke email ${mitra.email}. Silakan masukkan kode OTP tersebut untuk mengaktifkan akun sebelum login.`
        });
      }
      if (verifyRes.needsUpgrade) {
        const upgraded = encryptUserPassword(password, verifyRes.role || "mitra");
        userPasswords.set(mitraEmailLower, upgraded);
        if (db) {
          try {
            await db.from("user_passwords").upsert([{ email: mitraEmailLower, password: upgraded }]);
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
    message: "Akun tidak ditemukan atau belum terdaftar"
  });
});
var normalizeMitraEmail = (raw) => String(raw || "").trim().toLowerCase();
var normalizeNikNpwp = (raw) => {
  const cleaned = String(raw || "").replace(/[\s.\-/]/g, "").trim().toLowerCase();
  if (!cleaned || cleaned === "-" || cleaned === "0" || cleaned === "3201000000000000") {
    return "";
  }
  return cleaned;
};
var syncMitrasFromMysqlForValidation = async () => {
  if (!db) return;
  try {
    const { data: dbMitras, error: errM } = await db.from("mitras").select("*");
    if (!errM && Array.isArray(dbMitras)) {
      mitras = normalizeMitraAvatars(dbMitras);
    }
  } catch {
  }
};
var checkMitraIdentityUniqueness = (params) => {
  const rawEmail = String(params.email || "").trim();
  const normalizedEmail = normalizeMitraEmail(rawEmail);
  const rawNik = String(params.nik || "").trim();
  const normalizedNik = normalizeNikNpwp(rawNik);
  const excludeId = params.excludeMitraId || "";
  let emailTaken = false;
  let emailMessage = null;
  let nikTaken = false;
  let nikMessage = null;
  if (normalizedEmail) {
    const isAdminEmail = normalizedEmail === adminAccount.email.toLowerCase() || normalizedEmail === "admin@ndtaxandlaw.com" || normalizedEmail === "admin@ndtaxlaw.com";
    const altStaffEmail = normalizedEmail.endsWith("@ndtaxandlaw.com") ? normalizedEmail.replace("@ndtaxandlaw.com", "@ndtaxlaw.com") : normalizedEmail.endsWith("@ndtaxlaw.com") ? normalizedEmail.replace("@ndtaxlaw.com", "@ndtaxandlaw.com") : normalizedEmail;
    const isStaffEmail = staffAccounts.some(
      (s) => s.email.toLowerCase() === normalizedEmail || s.email.toLowerCase() === altStaffEmail
    );
    const existingMitraByEmail = mitras.find(
      (m) => m.id !== excludeId && normalizeMitraEmail(m.email) === normalizedEmail
    );
    if (isAdminEmail || isStaffEmail) {
      emailTaken = true;
      emailMessage = "Email sudah digunakan";
    } else if (existingMitraByEmail) {
      emailTaken = true;
      emailMessage = "Email sudah digunakan";
    }
  }
  if (normalizedNik) {
    const existingMitraByNik = mitras.find(
      (m) => m.id !== excludeId && normalizeNikNpwp(m.nik) === normalizedNik
    );
    if (existingMitraByNik) {
      nikTaken = true;
      nikMessage = "NIK / NPWP sudah digunakan";
    }
  }
  return {
    available: !emailTaken && !nikTaken,
    emailTaken,
    emailMessage,
    nikTaken,
    nikMessage,
    conflictField: emailTaken ? "email" : nikTaken ? "nik" : null,
    message: emailMessage || nikMessage || null
  };
};
app.post("/api/mitra/check-unique", async (req, res) => {
  try {
    const { email, nik, excludeMitraId } = req.body || {};
    await syncMitrasFromMysqlForValidation();
    const result = checkMitraIdentityUniqueness({ email, nik, excludeMitraId });
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Gagal memvalidasi keunikan data mitra."
    });
  }
});
app.post("/api/auth/google", async (req, res) => {
  try {
    const {
      credential,
      idToken,
      accessToken,
      email: directEmail,
      name: directName,
      picture: directPicture,
      mode
    } = req.body;
    const isRegisterMode = mode === "register";
    let googleEmail = directEmail || "";
    let googleName = directName || "";
    let googlePicture = directPicture || "";
    const rawToken = credential || idToken;
    if (rawToken && typeof rawToken === "string") {
      try {
        const parts = rawToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.email) googleEmail = payload.email;
          if (payload.name) googleName = payload.name;
          if (payload.picture) googlePicture = payload.picture;
        }
      } catch (jwtErr) {
        console.warn("[Google Auth JWT Decode Warning]", jwtErr);
      }
    }
    if (!googleEmail && accessToken && typeof accessToken === "string") {
      try {
        const gRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.email) googleEmail = gData.email;
          if (gData.name) googleName = gData.name;
          if (gData.picture) googlePicture = gData.picture;
        }
      } catch (gErr) {
        console.warn("[Google UserInfo Fetch Warning]", gErr);
      }
    }
    const normalizedEmail = (googleEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Kredensial akun Google tidak valid atau email tidak terdeteksi."
      });
    }
    await syncMitrasFromMysqlForValidation();
    if (isRegisterMode) {
      const uniqueness = checkMitraIdentityUniqueness({ email: normalizedEmail });
      if (uniqueness.emailTaken) {
        return res.status(400).json({
          success: false,
          field: "email",
          code: "EMAIL_ALREADY_REGISTERED",
          message: `Email Google "${normalizedEmail}" sudah pernah terdaftar di sistem. Setiap mitra hanya boleh mendaftar dengan 1 email unik. Silakan masuk melalui tab Masuk Akun.`
        });
      }
    }
    const isAdminMatch = normalizedEmail === adminAccount.email.toLowerCase() || normalizedEmail === "admin@ndtaxandlaw.com" || normalizedEmail === "admin@ndtaxlaw.com";
    if (isAdminMatch) {
      const roleDef2 = getRoleDefinition("admin");
      recordActivity({
        actorRole: "admin",
        actorId: adminAccount.id,
        actorName: adminAccount.name,
        actorEmail: adminAccount.email,
        actionType: "login",
        operation: "LOGIN",
        targetEntity: "Autentikasi Google Admin",
        description: `Admin Operasional (${adminAccount.email}) berhasil login melalui Google OAuth.`
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
          roleName: roleDef2.name,
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
            "idcard",
            "chat"
          ],
          permissions: roleDef2.permissions,
          gender: adminAccount.gender || "male",
          avatarUrl: googlePicture || resolveAvatarUrl(adminAccount.avatarUrl, adminAccount.gender || "male", adminAccount.name)
        },
        environment: appSettings.appEnvironment
      });
    }
    const altStaffEmail = normalizedEmail.endsWith("@ndtaxandlaw.com") ? normalizedEmail.replace("@ndtaxandlaw.com", "@ndtaxlaw.com") : normalizedEmail.endsWith("@ndtaxlaw.com") ? normalizedEmail.replace("@ndtaxlaw.com", "@ndtaxandlaw.com") : normalizedEmail;
    const staffMember = staffAccounts.find(
      (s) => s.email.toLowerCase() === normalizedEmail || s.email.toLowerCase() === altStaffEmail
    );
    if (staffMember) {
      if (!staffMember.isActive) {
        return res.status(403).json({
          success: false,
          message: "Akun Staf Anda sedang dinonaktifkan oleh Admin. Silakan hubungi Administrator."
        });
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
      const resolvedStaffAvatar = googlePicture || resolveAvatarUrl(staffMember.avatarUrl, resolvedStaffGender, staffMember.name);
      recordActivity({
        actorRole: "staff",
        actorId: staffMember.id,
        actorName: staffMember.name,
        actorEmail: staffMember.email,
        actionType: "login",
        operation: "LOGIN",
        targetEntity: "Autentikasi Google Staf",
        description: `Staf Operasional "${staffMember.name}" (${staffMember.email}) berhasil login melalui Google OAuth.`
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
    let mitra = mitras.find((m) => normalizeMitraEmail(m.email) === normalizedEmail);
    if (!mitra) {
      const newMitraId = `mitra-${Date.now()}`;
      const memberCode = formatMitraMemberCode("", newMitraId);
      const referralCode = `ND-REF-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const resolvedGender2 = inferGenderFromName(googleName || "Mitra");
      const resolvedAvatar2 = googlePicture || resolveAvatarUrl(void 0, resolvedGender2, googleName);
      mitra = {
        id: newMitraId,
        memberCode,
        referralCode,
        fullName: googleName || "Mitra Google",
        email: normalizedEmail,
        phone: "",
        nik: "",
        specialization: "Business Partner",
        status: "pending",
        avatarUrl: resolvedAvatar2,
        joinedDate: (/* @__PURE__ */ new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        bankDetails: {
          bankName: "Bank Central Asia (BCA)",
          accountNumber: "",
          accountHolder: googleName || "Mitra",
          __gender: resolvedGender2,
          __emailVerified: true
        },
        totalCommission: 0,
        totalBonus: 0,
        pendingPayout: 0,
        paidPayout: 0,
        referredClientsCount: 0,
        activeSubscribersCount: 0,
        gender: resolvedGender2,
        emailVerified: true
      };
      mitras.unshift(mitra);
      if (db) {
        try {
          const {
            gender: _g,
            customFields: _cf,
            ktpFileUrl: _kfu,
            ktpFileName: _kfn,
            ...dbMitraPayload
          } = mitra;
          const { error: insertErr } = await db.from("mitras").insert([dbMitraPayload]);
          if (insertErr) {
            const {
              emailVerified: _ev,
              verificationToken: _vt,
              verificationTokenExpiry: _vte,
              ...minimalPayload
            } = dbMitraPayload;
            const { error: retryErr } = await db.from("mitras").insert([minimalPayload]);
            if (retryErr) {
              console.warn("[MySQL Mitra Google Register Warning]", retryErr.message);
            }
          }
        } catch (supaErr) {
          console.warn("[MySQL Mitra Google Register Warning]", supaErr);
        }
      }
      saveDatabase();
      recordActivity({
        actorRole: "mitra",
        actorId: mitra.id,
        actorName: mitra.fullName,
        actorEmail: mitra.email,
        actionType: "register",
        operation: "CREATE",
        targetEntity: "Pendaftaran Mitra Baru via Google OAuth",
        description: `Mitra baru "${mitra.fullName}" (${mitra.memberCode}) berhasil terdaftar via Google OAuth.`
      });
    }
    if (mitra.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "MITRA_INACTIVE",
        message: "Akun Mitra Anda sedang dinonaktifkan oleh Admin / Staf sehingga tidak dapat login menggunakan Google. Silakan hubungi Administrator."
      });
    }
    if (mitra.emailVerified === false) {
      mitra.emailVerified = true;
      if (db) {
        try {
          await db.from("mitras").update({ emailVerified: true }).eq("id", mitra.id);
        } catch {
        }
      }
      saveDatabase();
    }
    const roleDef = getRoleDefinition("mitra");
    const resolvedGender = mitra.gender || inferGenderFromName(mitra.fullName);
    const resolvedAvatar = googlePicture || resolveAvatarUrl(mitra.avatarUrl, resolvedGender, mitra.fullName);
    recordActivity({
      actorRole: "mitra",
      actorId: mitra.id,
      actorName: mitra.fullName,
      actorEmail: mitra.email,
      actionType: "login",
      operation: "LOGIN",
      targetEntity: "Autentikasi Google Mitra",
      description: `Mitra ${mitra.fullName} (${mitra.memberCode}) berhasil login melalui Google OAuth.`
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
  } catch (err) {
    console.error("[Google OAuth Error]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Terjadi kesalahan saat memproses login Google."
    });
  }
});
var persistAdminAndStaffToCloud = async () => {
  saveDatabase();
  if (db) {
    try {
      const { password: _ap, ...safeAdmin } = adminAccount;
      await db.from("user_passwords").upsert([
        { email: "__sys_admin_profile__@ndtaxlaw.internal", password: JSON.stringify(safeAdmin) },
        { email: "__sys_staff_accounts__@ndtaxlaw.internal", password: JSON.stringify(staffAccounts) }
      ]);
    } catch (e) {
      console.warn("MySQL admin/staff sync warning:", e);
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
    if (db) {
      try {
        await db.from("user_passwords").delete().eq("email", oldEmailLower);
      } catch {
      }
    }
  }
  if (newPassword && String(newPassword).trim().length >= 6) {
    const cleanNewPass = String(newPassword).trim();
    adminAccount.password = cleanNewPass;
    const encryptedPass = encryptUserPassword(cleanNewPass, "admin");
    userPasswords.set(nextEmailLower, encryptedPass);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {
      }
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, "admin");
    userPasswords.set(nextEmailLower, reEncrypted);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: reEncrypted }]);
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
  if (db) {
    try {
      await db.from("user_passwords").upsert([{ email: cleanEmail, password: encryptedPass }]);
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
    if (db) {
      try {
        await db.from("user_passwords").delete().eq("email", oldEmailLower);
      } catch {
      }
    }
  }
  if (newPassword && String(newPassword).trim().length >= 6) {
    const encryptedPass = encryptUserPassword(String(newPassword).trim(), "staff");
    userPasswords.set(nextEmailLower, encryptedPass);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: encryptedPass }]);
      } catch {
      }
    }
  } else {
    const reEncrypted = encryptUserPassword(prevStoredEnc, "staff");
    userPasswords.set(nextEmailLower, reEncrypted);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: reEncrypted }]);
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
  if (db) {
    try {
      await db.from("user_passwords").delete().eq("email", emailLower);
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
  const normalizedEmail = sanitizeSqlIdentifier((email || "").trim().toLowerCase());
  const otpReqRate = consumeRateLimit(
    authRateBuckets,
    `forgot:${getClientIp(req)}:${normalizedEmail}`,
    5,
    10 * 60 * 1e3
  );
  if (!otpReqRate.allowed) {
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak permintaan kode OTP. Silakan tunggu ${otpReqRate.retryAfterSec} detik.`
    });
  }
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
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
  const otpCode = crypto2.randomInt(1e5, 999999).toString();
  const tokenPayload = {
    otp: otpCode,
    expiresAt: Date.now() + 30 * 60 * 1e3,
    attempts: 0
  };
  passwordResetTokens.set(normalizedEmail, tokenPayload);
  if (db) {
    try {
      await db.from("user_passwords").upsert([{ email: `__otp__:${normalizedEmail}`, password: JSON.stringify(tokenPayload) }]);
    } catch {
    }
  }
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
  const { email, newPassword } = req.body;
  const rawOtp = req.body.otpCode ?? req.body.otp ?? req.body.token ?? "";
  const normalizedEmail = sanitizeSqlIdentifier((email || "").trim().toLowerCase());
  const cleanOtp = String(rawOtp || "").replace(/\D/g, "").trim();
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter." });
  }
  if (!cleanOtp || cleanOtp.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Kode OTP pemulihan 6-digit wajib diisi."
    });
  }
  let storedToken = passwordResetTokens.get(normalizedEmail);
  if (!storedToken && db) {
    try {
      const { data: kvOtp } = await db.from("user_passwords").select("password").eq("email", `__otp__:${normalizedEmail}`).maybeSingle();
      if (kvOtp?.password) {
        const parsed = JSON.parse(kvOtp.password);
        if (parsed && parsed.otp) {
          storedToken = parsed;
          passwordResetTokens.set(normalizedEmail, parsed);
        }
      }
    } catch {
    }
  }
  if (!storedToken) {
    const recentResetLog = emailLogs.find(
      (log) => log.category === "password_reset" && (log.recipient || "").toLowerCase() === normalizedEmail && Date.now() - new Date(log.sentAt || 0).getTime() < 60 * 60 * 1e3
    );
    if (recentResetLog) {
      const otpMatch = (recentResetLog.subject || "").match(/(\d{6})/) || (recentResetLog.previewSnippet || "").match(/(\d{6})/);
      if (otpMatch && otpMatch[1]) {
        storedToken = {
          otp: otpMatch[1],
          expiresAt: Date.now() + 30 * 60 * 1e3,
          attempts: 0
        };
        passwordResetTokens.set(normalizedEmail, storedToken);
      }
    }
  }
  if (!storedToken || Date.now() > storedToken.expiresAt) {
    passwordResetTokens.delete(normalizedEmail);
    return res.status(400).json({
      success: false,
      message: "Kode OTP tidak ditemukan atau sudah kedaluwarsa. Silakan minta kode OTP baru."
    });
  }
  if (!safeTimingCompare(storedToken.otp, cleanOtp)) {
    storedToken.attempts += 1;
    if (storedToken.attempts >= 5) {
      passwordResetTokens.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        message: "Terlalu banyak percobaan OTP yang salah. Kode OTP telah hangus, silakan minta kode baru."
      });
    }
    return res.status(400).json({
      success: false,
      message: "Kode OTP pemulihan tidak cocok. Silakan periksa kembali email Anda."
    });
  }
  passwordResetTokens.delete(normalizedEmail);
  if (db) {
    try {
      await db.from("user_passwords").delete().eq("email", `__otp__:${normalizedEmail}`);
    } catch {
    }
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
  if (db) {
    try {
      await db.from("user_passwords").upsert([{ email: normalizedEmail, password: encryptedPassword }]);
    } catch (e) {
      console.warn("MySQL password reset update error", e);
    }
  }
  res.json({
    success: true,
    message: "Kata sandi Anda telah berhasil diubah dan dienkripsi. Silakan masuk menggunakan kata sandi baru."
  });
});
app.post("/api/auth/verify-email", async (req, res) => {
  const { email, token } = req.body;
  const normalizedEmail = sanitizeSqlIdentifier((email || "").trim().toLowerCase());
  const inputToken = String(token || "").trim();
  const verifyRate = consumeRateLimit(
    authRateBuckets,
    `verify-email:${getClientIp(req)}:${normalizedEmail}`,
    10,
    10 * 60 * 1e3
  );
  if (!verifyRate.allowed) {
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan verifikasi. Silakan tunggu ${verifyRate.retryAfterSec} detik.`
    });
  }
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
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
  const isExpired = mitra.verificationTokenExpiry && new Date(mitra.verificationTokenExpiry).getTime() < Date.now();
  if (isExpired) {
    return res.status(400).json({
      success: false,
      message: "Kode verifikasi 6-digit telah kedaluwarsa. Silakan klik Kirim Ulang Kode Verifikasi."
    });
  }
  const isTokenValid = Boolean(
    mitra.verificationToken && inputToken && safeTimingCompare(mitra.verificationToken, inputToken)
  );
  if (!isTokenValid) {
    return res.status(400).json({
      success: false,
      message: "Kode verifikasi 6-digit salah atau tidak cocok. Silakan periksa kembali pesan di email Anda."
    });
  }
  mitra.emailVerified = true;
  mitra.verificationToken = void 0;
  mitra.verificationTokenExpiry = void 0;
  if (mitra.bankDetails) {
    const cleanedBank = { ...mitra.bankDetails, __emailVerified: true };
    delete cleanedBank.__verificationToken;
    delete cleanedBank.__verificationTokenExpiry;
    mitra.bankDetails = cleanedBank;
  }
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
  if (db) {
    try {
      const { error: upErr } = await db.from("mitras").update({
        emailVerified: true,
        verificationToken: null,
        bankDetails: mitra.bankDetails
      }).eq("id", mitra.id);
      if (upErr) {
        await db.from("mitras").update({
          bankDetails: mitra.bankDetails
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("MySQL verify-email update error", e);
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
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
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
  mitra.bankDetails = {
    ...mitra.bankDetails || {},
    __emailVerified: false,
    __verificationToken: newToken,
    __verificationTokenExpiry: expiryIso
  };
  saveDatabase();
  if (db) {
    try {
      const { error: upErr } = await db.from("mitras").update({
        verificationToken: newToken,
        verificationTokenExpiry: expiryIso,
        bankDetails: mitra.bankDetails
      }).eq("id", mitra.id);
      if (upErr) {
        await db.from("mitras").update({
          bankDetails: mitra.bankDetails
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("MySQL resend-verification update error", e);
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
var toPublicSafeMitraList = (list) => list.map(({ verificationToken: _vt, verificationTokenExpiry: _vte, ...safeMitra }) => safeMitra);
app.get("/api/mitra", async (req, res) => {
  if (db) {
    try {
      const { data, error } = await db.from("mitras").select("*");
      if (!error && Array.isArray(data)) {
        mitras = normalizeMitraAvatars(data);
        saveDatabase();
        return res.json({ success: true, data: toPublicSafeMitraList(mitras) });
      }
      if (isProductionMode() && error) {
        return res.status(503).json({ success: false, message: `MySQL Error: ${error.message}`, data: [] });
      }
    } catch (e) {
      if (isProductionMode()) {
        return res.status(503).json({ success: false, message: "Gagal memuat data mitra dari MySQL.", data: [] });
      }
      console.warn("MySQL query error for mitras, using dev fallback", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Database MySQL wajib terhubung pada mode Production.", data: [] });
  }
  mitras = normalizeMitraAvatars(mitras);
  res.json({ success: true, data: toPublicSafeMitraList(mitras) });
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
  if (db) {
    try {
      const { data } = await db.from("mitras").select("*");
      if (Array.isArray(data)) {
        mitras = normalizeMitraAvatars(data);
      }
    } catch {
    }
  }
  const normalizedQuery = rawCode.toUpperCase();
  const formattedQuery = formatMitraMemberCode(rawCode).toUpperCase();
  const matched = mitras.find(
    (m) => (m.memberCode || "").trim().toUpperCase() === normalizedQuery || (m.memberCode || "").trim().toUpperCase() === formattedQuery || (m.referralCode || "").trim().toUpperCase() === normalizedQuery || (m.id || "").trim().toUpperCase() === normalizedQuery
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
      supportEmail: appSettings.supportEmail || "advisory@ndtaxandlaw.com",
      officeAddress: appSettings.officeAddress || "Menara Kadin Indonesia Lt. 24, Jl. H.R. Rasuna Said, Jakarta Selatan 12950"
    }
  });
});
app.post("/api/mitra/register", async (req, res) => {
  const {
    fullName,
    email,
    phone,
    nik,
    ktpFileUrl,
    ktpFileName,
    specialization,
    bankDetails,
    password,
    gender,
    role,
    customFields,
    autoApprove,
    actorRole,
    actorName,
    actorId,
    actorEmail
  } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email wajib diisi untuk kredensial akun." });
  }
  const safeFullName = (fullName || "").trim() || email.split("@")[0];
  const safePhone = (phone || "").trim() || "-";
  const isAdminOrStaffCreated = Boolean(autoApprove) && (actorRole === "admin" || actorRole === "staff");
  const normalizedEmail = (email || "").trim().toLowerCase();
  await syncMitrasFromMysqlForValidation();
  const uniqueness = checkMitraIdentityUniqueness({ email, nik });
  if (uniqueness.emailTaken) {
    return res.status(400).json({
      success: false,
      field: "email",
      message: uniqueness.emailMessage
    });
  }
  if (uniqueness.nikTaken) {
    return res.status(400).json({
      success: false,
      field: "nik",
      message: uniqueness.nikMessage
    });
  }
  const verificationToken = Math.floor(1e5 + Math.random() * 9e5).toString();
  const verificationExpiryIso = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  const generatedReferralCode = `ND-REF-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const resolvedGender = gender === "female" ? "female" : gender === "male" ? "male" : inferGenderFromName(safeFullName);
  const assignedRole = getRoleDefinition(role || "mitra").code;
  const cleanCustomFields = customFields && typeof customFields === "object" && Object.keys(customFields).length > 0 ? { ...customFields } : void 0;
  let resolvedKtpUrl = typeof ktpFileUrl === "string" && ktpFileUrl.trim() ? ktpFileUrl.trim() : void 0;
  let resolvedKtpName = typeof ktpFileName === "string" && ktpFileName.trim() ? ktpFileName.trim() : void 0;
  if (resolvedKtpUrl && resolvedKtpUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(resolvedKtpUrl, resolvedKtpName || `ktp-${safeFullName}`, "jpg");
    if (saved) resolvedKtpUrl = saved.hostedUrl;
  }
  if (cleanCustomFields) {
    for (const [k, v] of Object.entries(cleanCustomFields)) {
      if (typeof v === "string" && v.startsWith("data:")) {
        const saved = saveDataUrlToHostingServer(v, `${k}-${safeFullName}`, "jpg");
        if (saved) cleanCustomFields[k] = saved.hostedUrl;
      }
      const kl = k.toLowerCase();
      if (!resolvedKtpUrl && (k === "mitra-def-ktpFile" || kl.includes("ktp") || kl.includes("npwp")) && cleanCustomFields[k]) {
        resolvedKtpUrl = cleanCustomFields[k];
      }
    }
  }
  const baseBank = bankDetails || {
    bankName: "Bank Central Asia (BCA)",
    accountNumber: "-",
    accountHolder: safeFullName
  };
  const newMitraId = `mitra-${Date.now()}`;
  const rawMemberCode = `ND-TAX-LAW-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const resolvedMemberCode = isAdminOrStaffCreated ? formatMitraMemberCode(rawMemberCode, newMitraId) : rawMemberCode;
  const newMitra = {
    id: newMitraId,
    memberCode: resolvedMemberCode,
    referralCode: generatedReferralCode,
    fullName: safeFullName,
    email: normalizedEmail,
    phone: safePhone,
    nik: (nik || "").trim() || "-",
    ktpFileUrl: resolvedKtpUrl,
    ktpFileName: resolvedKtpName,
    specialization: specialization || "Business Partner",
    status: isAdminOrStaffCreated ? "verified" : "pending",
    isActive: true,
    gender: resolvedGender,
    avatarUrl: req.body.avatarUrl || getDefaultAvatar(resolvedGender, safeFullName),
    joinedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    bankDetails: {
      ...baseBank,
      __gender: resolvedGender,
      __emailVerified: false,
      __verificationToken: verificationToken,
      __verificationTokenExpiry: verificationExpiryIso,
      ...resolvedKtpUrl ? { __ktpFileUrl: resolvedKtpUrl } : {},
      ...resolvedKtpName ? { __ktpFileName: resolvedKtpName } : {},
      ...cleanCustomFields ? { __customFields: cleanCustomFields } : {}
    },
    customFields: cleanCustomFields,
    totalCommission: 0,
    totalBonus: 0,
    pendingPayout: 0,
    paidPayout: 0,
    referredClientsCount: 0,
    activeSubscribersCount: 0,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: verificationExpiryIso
  };
  mitras.unshift(newMitra);
  const encryptedPass = encryptUserPassword(password || "mitraND2026!", assignedRole);
  userPasswords.set(normalizedEmail, encryptedPass);
  recordActivity({
    actorRole: isAdminOrStaffCreated ? actorRole === "staff" ? "staff" : "admin" : "mitra",
    actorId: isAdminOrStaffCreated ? actorId || "admin-1" : newMitra.id,
    actorName: isAdminOrStaffCreated ? actorName || (actorRole === "staff" ? "Staf" : "Administrator") : newMitra.fullName,
    actorEmail: isAdminOrStaffCreated ? actorEmail || "" : newMitra.email,
    actionType: "register",
    operation: "CREATE",
    targetEntity: "Pendaftaran Mitra",
    description: isAdminOrStaffCreated ? `Mitra baru "${newMitra.fullName}" (${newMitra.email}, ${newMitra.memberCode}) ditambahkan langsung oleh ${actorName || (actorRole === "staff" ? "Staf" : "Admin")} dan otomatis disetujui (Approved). Akun menunggu verifikasi OTP saat login pertama.` : `Pendaftaran mitra baru "${newMitra.fullName}" (${newMitra.email}, Role: ${assignedRole}) dengan ${appSettings.specializationLabel || DEFAULT_SPECIALIZATION_LABEL2}: ${newMitra.specialization}. Kode OTP 6-digit dikirim ke email.`
  });
  if (db) {
    try {
      const {
        gender: _g,
        customFields: _cf,
        ktpFileUrl: _kfu,
        ktpFileName: _kfn,
        ...dbMitraPayload
      } = newMitra;
      const { error: insertErr } = await db.from("mitras").insert([dbMitraPayload]);
      if (insertErr) {
        const {
          emailVerified: _ev,
          verificationToken: _vt,
          verificationTokenExpiry: _vte,
          ...minimalPayload
        } = dbMitraPayload;
        const { error: retryErr } = await db.from("mitras").insert([minimalPayload]);
        if (retryErr) {
          console.warn("MySQL mitra insert warning:", retryErr.message);
        }
      }
      await db.from("user_passwords").upsert([{ email: normalizedEmail, password: encryptedPass }]);
    } catch (e) {
      console.warn("MySQL insert error for new mitra", e);
    }
  }
  saveDatabase();
  const emailResult = isAdminOrStaffCreated ? await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: safeFullName,
    subject: `Akun Mitra NDTAXANDLAW Anda Telah Disetujui (${newMitra.memberCode})`,
    category: "registration_verify",
    previewSnippet: `Halo ${safeFullName},

Akun Kemitraan Resmi NDTAXANDLAW Anda (${newMitra.memberCode}) telah didaftarkan dan otomatis disetujui oleh Admin/Staf.

Saat Anda melakukan login pertama kali dengan email ${normalizedEmail}, sistem akan otomatis mengirimkan kode verifikasi OTP 6-digit ke email Anda. Setelah verifikasi OTP berhasil, Anda dapat langsung masuk dan melengkapi Data Diri.`
  }) : await sendSystemEmail({
    recipient: normalizedEmail,
    recipientName: safeFullName,
    subject: `[Kode OTP: ${verificationToken}] Verifikasi Email Akun Kemitraan NDTAXANDLAW`,
    category: "registration_verify",
    previewSnippet: `Halo ${safeFullName},

Terima kasih telah mendaftar di jaringan Kemitraan Resmi NDTAXANDLAW (${newMitra.memberCode}).

Berikut adalah Kode Verifikasi (OTP) 6-Digit Anda untuk memvalidasi email aktif:

KODE VERIFIKASI: ${verificationToken}

Silakan masukkan 6 digit kode di atas pada halaman Verifikasi Email untuk mengaktifkan akun kemitraan Anda. Kode ini berlaku selama 24 jam.`
  });
  const newNotif = {
    id: `notif-ops-${Date.now()}`,
    title: isAdminOrStaffCreated ? "Mitra Baru Ditambahkan & Disetujui" : "Pendaftaran Mitra Baru",
    message: isAdminOrStaffCreated ? `${safeFullName} (${newMitra.memberCode}) ditambahkan oleh ${actorName || (actorRole === "staff" ? "Staf" : "Admin")} dan otomatis disetujui (Menunggu verifikasi OTP saat login).` : `${safeFullName} (${newMitra.memberCode}) baru saja mendaftar kemitraan (Menunggu validasi Admin).`,
    type: "verification",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "admin_staff"
  };
  notifications.unshift(newNotif);
  if (db) {
    try {
      await db.from("notifications").insert([toDbNotification(newNotif)]);
    } catch {
    }
  }
  saveDatabase();
  const { verificationToken: _stripVt, verificationTokenExpiry: _stripVte, ...safeMitraData } = newMitra;
  res.status(201).json({
    success: true,
    data: safeMitraData,
    autoApproved: isAdminOrStaffCreated,
    needsEmailVerification: true,
    email: normalizedEmail,
    emailSent: emailResult.success,
    emailError: emailResult.error,
    message: isAdminOrStaffCreated ? `Mitra "${safeFullName}" berhasil ditambahkan dan otomatis disetujui (Approved). Saat mitra login pertama kali, sistem akan otomatis mengirim kode OTP verifikasi ke email ${normalizedEmail}.` : `Pendaftaran berhasil disimpan! Kami telah mengirimkan kode OTP 6-digit ke alamat email ${normalizedEmail}. Silakan masukkan kode tersebut untuk mengaktifkan akun Anda.`
  });
});
app.put("/api/mitra/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason, groupChatIds } = req.body;
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  if (!["verified", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status verifikasi tidak valid." });
  }
  const prevStatus = mitra.status;
  mitra.status = status;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const joinedGroupNames = [];
  if (status === "verified") {
    mitra.memberCode = formatMitraMemberCode(mitra.memberCode, mitra.id);
    mitra.rejectionReason = void 0;
    mitra.rejectedAt = void 0;
    mitra.profileCompletionNotice = void 0;
    mitra.profileCompletionNoticeAt = void 0;
    if (mitra.bankDetails) {
      const cleanedBank = { ...mitra.bankDetails };
      delete cleanedBank.__rejectionReason;
      delete cleanedBank.__rejectedAt;
      delete cleanedBank.__profileCompletionNotice;
      delete cleanedBank.__profileCompletionNoticeAt;
      mitra.bankDetails = cleanedBank;
    }
    const requestedGroupIds = Array.isArray(groupChatIds) ? Array.from(new Set(groupChatIds.map((gid) => String(gid || "").trim()).filter(Boolean))) : [];
    if (requestedGroupIds.length > 0) {
      if (db) {
        try {
          await syncChatFromMysql();
        } catch {
        }
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      for (const roomId of requestedGroupIds) {
        const room = chatRooms.find(
          (r) => r.id === roomId && r.type === "group" && (!isProductionMode() || !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id))
        );
        if (!room) continue;
        if (!room.participantIds.includes(mitra.id)) {
          room.participantIds = Array.from(/* @__PURE__ */ new Set([...room.participantIds, mitra.id]));
          room.updatedAt = nowIso;
          await notifyMembersAddedToGroup(
            room,
            [mitra.id],
            "system-admin",
            "Admin Operasional",
            false
          );
        }
        joinedGroupNames.push(room.name || "Grup Chat");
      }
    }
    const groupSummaryText = joinedGroupNames.length > 0 ? ` Anda juga telah ditambahkan ke group chat: ${joinedGroupNames.join(", ")}.` : "";
    const notif = {
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: "Status Kemitraan Disetujui (Lulus Verifikasi)",
      message: `Selamat! Pendaftaran Mitra ${mitra.fullName} telah disetujui oleh Admin. Kartu Identitas Eksklusif (${mitra.memberCode}), Kode Referral (${mitra.referralCode}), dan fitur Input Klien kini telah aktif penuh.${groupSummaryText}`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false,
      targetAudience: "mitra",
      mitraId: mitra.id
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

Sekarang Anda sudah dapat menggunakan Kode Referral, menginput data klien, serta mengunduh Kartu Identitas Eksklusif Mitra di portal.${groupSummaryText}`
      });
    }
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch (e) {
        console.warn("MySQL insert error", e);
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
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: "Verifikasi Pendaftaran Mitra Ditolak \u2014 Perlu Perbaikan Data",
      message: `Pendaftaran Mitra ${mitra.fullName} ditolak oleh Admin. Alasan: "${reasonText}". Silakan perbaiki data diri Anda dan ajukan ulang verifikasi.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false,
      targetAudience: "mitra",
      mitraId: mitra.id
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
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch (e) {
        console.warn("MySQL insert error", e);
      }
    }
  } else if (status === "pending") {
    const revokeNote = rejectionReason && String(rejectionReason).trim().slice(0, 1e3) || "Status verifikasi akun Mitra Anda dibatalkan sementara oleh Admin untuk peninjauan ulang / kelengkapan data diri.";
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    mitra.rejectionReason = void 0;
    mitra.rejectedAt = void 0;
    mitra.profileCompletionNotice = revokeNote;
    mitra.profileCompletionNoticeAt = nowIso;
    const updatedBank = { ...mitra.bankDetails || {} };
    delete updatedBank.__rejectionReason;
    delete updatedBank.__rejectedAt;
    updatedBank.__profileCompletionNotice = revokeNote;
    updatedBank.__profileCompletionNoticeAt = nowIso;
    mitra.bankDetails = updatedBank;
    const notif = {
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: "Verifikasi Kemitraan Dibatalkan \u2014 Mohon Lengkapi Data",
      message: `Admin membatalkan status verifikasi akun Mitra ${mitra.fullName} (dikembalikan ke Menunggu Verifikasi). Catatan Admin: "${revokeNote}". Silakan periksa & lengkapi data diri Anda di menu Profil.`,
      type: "verification",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: mitra.id
    };
    notifications.unshift(notif);
    if (mitra.email) {
      await sendSystemEmail({
        recipient: mitra.email,
        recipientName: mitra.fullName,
        subject: `Pemberitahuan Pembatalan Verifikasi Mitra NDTAXANDLAW (${mitra.memberCode})`,
        category: "registration_verify",
        previewSnippet: `Status verifikasi akun Mitra Anda (${mitra.fullName}) telah dibatalkan sementara oleh Admin dan dikembalikan ke status Menunggu Verifikasi.

Catatan Admin:
"${revokeNote}"

Silakan masuk ke Portal Mitra untuk memeriksa dan melengkapi data diri Anda.`
      });
    }
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch (e) {
        console.warn("MySQL insert error", e);
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
    description: status === "verified" ? `Admin menyetujui (Approve) verifikasi Mitra "${mitra.fullName}" menjadi TERVERIFIKASI (${mitra.memberCode})${joinedGroupNames.length > 0 ? ` dan memasukkan ke group chat: ${joinedGroupNames.join(", ")}.` : "."}` : status === "pending" ? `Admin membatalkan verifikasi Mitra "${mitra.fullName}" (dari ${prevStatus} ke pending). Catatan: "${mitra.profileCompletionNotice || "-"}".` : `Admin menolak verifikasi data Mitra "${mitra.fullName}". Alasan: "${mitra.rejectionReason}".`
  });
  if (db) {
    try {
      await db.from("mitras").update({
        status,
        memberCode: mitra.memberCode,
        bankDetails: mitra.bankDetails
      }).eq("id", id);
    } catch (e) {
      console.warn("MySQL update verify error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: mitra, addedGroups: joinedGroupNames });
});
app.post("/api/mitra/:id/notify-incomplete", async (req, res) => {
  const { id } = req.params;
  const { message, missingItems } = req.body || {};
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan." });
  }
  const cleanItems = Array.isArray(missingItems) ? missingItems.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12) : [];
  const rawMsg = typeof message === "string" ? message.trim().slice(0, 1e3) : "";
  const finalNotice = rawMsg || (cleanItems.length > 0 ? `Mohon segera melengkapi data berikut pada Profil Mitra Anda: ${cleanItems.join(", ")}.` : "Mohon segera melengkapi data diri, berkas KTP/NPWP, foto profil, dan informasi rekening bank Anda di Portal Mitra.");
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  mitra.profileCompletionNotice = finalNotice;
  mitra.profileCompletionNoticeAt = nowIso;
  mitra.bankDetails = {
    ...mitra.bankDetails || {},
    __profileCompletionNotice: finalNotice,
    __profileCompletionNoticeAt: nowIso
  };
  const notif = {
    id: `notif-mtr-inc-${mitra.id}-${Date.now()}`,
    title: "Permintaan Kelengkapan Data Diri dari Admin",
    message: `${finalNotice}`,
    type: "verification",
    timestamp: nowIso,
    isRead: false,
    targetAudience: "mitra",
    mitraId: mitra.id
  };
  notifications.unshift(notif);
  if (mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Mohon Lengkapi Data Diri Mitra NDTAXANDLAW (${mitra.memberCode})`,
      category: "registration_verify",
      previewSnippet: `Halo ${mitra.fullName},

Admin NDTAXANDLAW menginformasikan agar Anda segera melengkapi data diri pada Portal Mitra:

"${finalNotice}"

Silakan login ke Portal Mitra dan perbarui data Anda melalui menu Profil.`
    });
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "mitra_verify",
    operation: "UPDATE",
    targetEntity: "Kelengkapan Data Mitra",
    description: `Admin mengirim pemberitahuan kelengkapan data diri kepada Mitra "${mitra.fullName}": "${finalNotice}".`
  });
  if (db) {
    try {
      await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", id);
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL notify-incomplete error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: mitra, message: `Pemberitahuan kelengkapan data berhasil dikirim ke ${mitra.fullName}.` });
});
function formatPhoneToIndonesianWa(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}
function isSafeExternalHttpsUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^0\./.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
async function dispatchWhatsAppGatewayGroupAction(action, participants) {
  const gatewayUrl = (process.env.WA_GATEWAY_URL || "").trim();
  const groupJid = (process.env.WA_GROUP_JID || "").trim();
  if (!gatewayUrl || !groupJid || participants.length === 0) {
    return { attempted: false, ok: false };
  }
  if (!isSafeExternalHttpsUrl(gatewayUrl)) {
    return { attempted: true, ok: false, detail: "WA_GATEWAY_URL harus berupa HTTPS publik yang valid." };
  }
  try {
    const headers = { "Content-Type": "application/json" };
    const token = (process.env.WA_GATEWAY_TOKEN || "").trim();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        groupId: groupJid,
        participants
      }),
      signal: AbortSignal.timeout(1e4)
    });
    if (!resp.ok) {
      return { attempted: true, ok: false, detail: `Gateway HTTP ${resp.status}` };
    }
    return { attempted: true, ok: true };
  } catch (err) {
    return { attempted: true, ok: false, detail: err?.message || "Koneksi gateway gagal" };
  }
}
app.get("/api/whatsapp/status", (_req, res) => {
  res.json({
    success: true,
    data: {
      ...getWhatsAppStatus(),
      whatsappGroupJid: appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || "",
      whatsappGroupName: appSettings.whatsappGroupName || "",
      whatsappGroupLink: appSettings.whatsappGroupLink || ""
    }
  });
});
app.post("/api/whatsapp/connect", async (req, res) => {
  try {
    const forceReset = Boolean(req.body?.forceReset);
    const status = await connectWhatsApp({ forceReset });
    res.json({
      success: true,
      data: {
        ...status,
        whatsappGroupJid: appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || "",
        whatsappGroupName: appSettings.whatsappGroupName || ""
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err?.message || "Gagal memulai koneksi WhatsApp."
    });
  }
});
app.post("/api/whatsapp/disconnect", async (_req, res) => {
  try {
    const status = await disconnectWhatsApp(true);
    res.json({
      success: true,
      data: status,
      message: "Koneksi WhatsApp Admin berhasil diputuskan."
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err?.message || "Gagal memutuskan koneksi WhatsApp."
    });
  }
});
app.get("/api/whatsapp/groups", async (_req, res) => {
  try {
    const groups = await listAdminWhatsAppGroups();
    res.json({
      success: true,
      data: groups,
      selectedGroupJid: appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || ""
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "Gagal mengambil daftar Grup WhatsApp."
    });
  }
});
app.post("/api/whatsapp/sync-members", async (req, res) => {
  try {
    const targetJid = String(req.body?.groupJid || appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || "").trim();
    if (!targetJid) {
      return res.status(400).json({
        success: false,
        message: "Pilih Grup WhatsApp tujuan terlebih dahulu sebelum menyinkronkan peserta."
      });
    }
    if (db) {
      try {
        const { data: dbMitras } = await db.from("mitras").select("*");
        if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
      } catch {
      }
    }
    const realPhones = await getWhatsAppGroupParticipantPhones(targetJid);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let inGroupCount = 0;
    for (const m of mitras) {
      const normalized = normalizeIndonesianWaDigits(m.phone);
      const isMember = Boolean(normalized && realPhones.has(normalized));
      if (isMember) inGroupCount += 1;
      if (Boolean(m.whatsappGroupInvited) !== isMember) {
        m.whatsappGroupInvited = isMember;
        m.whatsappGroupInvitedAt = isMember ? m.whatsappGroupInvitedAt || nowIso : void 0;
        const bankCopy = { ...m.bankDetails || {} };
        if (isMember) {
          bankCopy.__whatsappGroupInvited = true;
          bankCopy.__whatsappGroupInvitedAt = m.whatsappGroupInvitedAt;
        } else {
          delete bankCopy.__whatsappGroupInvited;
          delete bankCopy.__whatsappGroupInvitedAt;
        }
        m.bankDetails = bankCopy;
        if (db) {
          try {
            await db.from("mitras").update({ bankDetails: m.bankDetails }).eq("id", m.id);
          } catch {
          }
        }
      }
    }
    saveDatabase();
    res.json({
      success: true,
      inGroupCount,
      totalGroupParticipants: realPhones.size,
      message: `Sinkronisasi selesai: ${inGroupCount} Mitra terdeteksi aktif di dalam Grup WhatsApp asli (total ${realPhones.size} anggota grup).`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err?.message || "Gagal menyinkronkan peserta Grup WhatsApp."
    });
  }
});
app.post("/api/mitra/:id/whatsapp-group", async (req, res) => {
  const { id } = req.params;
  const { groupName, groupLink, groupJid, customMessage, action } = req.body || {};
  const isRemove = action === "remove";
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan." });
  }
  let resolvedLink = (appSettings.whatsappGroupLink || "").trim();
  let resolvedName = (appSettings.whatsappGroupName || "Grup WhatsApp Mitra ND Tax & Law").trim();
  let resolvedJid = (typeof groupJid === "string" && groupJid.trim() ? groupJid.trim() : appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || "").trim();
  if (typeof groupLink === "string" && groupLink.trim()) {
    const trimmedLink = groupLink.trim();
    try {
      const parsed = new URL(trimmedLink);
      if (parsed.protocol !== "https:") {
        return res.status(400).json({ success: false, message: "Tautan Grup WhatsApp harus menggunakan protokol HTTPS." });
      }
      resolvedLink = parsed.toString();
      appSettings.whatsappGroupLink = resolvedLink;
    } catch {
      return res.status(400).json({ success: false, message: "Format tautan Grup WhatsApp tidak valid." });
    }
  }
  if (typeof groupName === "string" && groupName.trim()) {
    resolvedName = groupName.trim().slice(0, 120);
    appSettings.whatsappGroupName = resolvedName;
  }
  const waStatus = getWhatsAppStatus();
  const hasRealBaileys = waStatus.status === "connected" && Boolean(resolvedJid);
  const hasExternalGateway = Boolean((process.env.WA_GATEWAY_URL || "").trim() && (process.env.WA_GROUP_JID || "").trim());
  if (!hasRealBaileys && !hasExternalGateway) {
    return res.status(400).json({
      success: false,
      requiresWhatsAppConnection: true,
      message: waStatus.status === "connected" ? 'Silakan pilih Grup WhatsApp tujuan terlebih dahulu di tab "Koneksi WhatsApp" agar peserta dapat ditambahkan langsung ke grup.' : 'WhatsApp Admin belum terhubung. Buka tab "Koneksi WhatsApp" lalu scan QR menggunakan WhatsApp Admin Grup agar peserta benar-benar masuk ke Grup WhatsApp.'
    });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const formattedPhone = formatPhoneToIndonesianWa(mitra.phone);
  if (hasRealBaileys) {
    const outcomes = await updateWhatsAppGroupParticipants(
      resolvedJid,
      [{ mitraId: mitra.id, fullName: mitra.fullName, phone: mitra.phone || "" }],
      isRemove ? "remove" : "add",
      resolvedName,
      resolvedLink
    );
    const result = outcomes[0];
    if (isRemove) {
      if (result.outcome !== "removed") {
        return res.status(400).json({ success: false, outcome: result, message: result.detail });
      }
      mitra.whatsappGroupInvited = false;
      mitra.whatsappGroupInvitedAt = void 0;
      const cleanedBank = { ...mitra.bankDetails || {} };
      delete cleanedBank.__whatsappGroupInvited;
      delete cleanedBank.__whatsappGroupInvitedAt;
      mitra.bankDetails = cleanedBank;
    } else if (result.outcome === "added" || result.outcome === "already_in_group") {
      mitra.whatsappGroupInvited = true;
      mitra.whatsappGroupInvitedAt = nowIso;
      mitra.bankDetails = {
        ...mitra.bankDetails || {},
        __whatsappGroupInvited: true,
        __whatsappGroupInvitedAt: nowIso
      };
    } else if (result.outcome === "invited_via_dm") {
      return res.json({
        success: true,
        data: mitra,
        outcome: result,
        whatsappGroupName: resolvedName,
        whatsappGroupLink: resolvedLink,
        message: `${mitra.fullName}: ${result.detail}`
      });
    } else {
      return res.status(400).json({
        success: false,
        outcome: result,
        message: `${mitra.fullName}: ${result.detail}`
      });
    }
    if (!isRemove) {
      const extraNote = typeof customMessage === "string" && customMessage.trim() ? ` ${customMessage.trim().slice(0, 500)}` : "";
      const notif = {
        id: `notif-mtr-wa-${mitra.id}-${Date.now()}`,
        title: `Peserta ${resolvedName}`,
        message: `Admin telah menambahkan Anda ke Grup WhatsApp ${resolvedName}.${extraNote}`,
        type: "verification",
        timestamp: nowIso,
        isRead: false,
        targetAudience: "mitra",
        mitraId: mitra.id
      };
      notifications.unshift(notif);
      if (db) {
        try {
          await db.from("notifications").insert([toDbNotification(notif)]);
        } catch {
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
      targetEntity: "Grup WhatsApp Mitra",
      description: isRemove ? `Admin mengeluarkan Mitra "${mitra.fullName}" dari Grup WhatsApp "${resolvedName}".` : `Admin menambahkan Mitra "${mitra.fullName}" (${mitra.phone || "-"}) ke Grup WhatsApp "${resolvedName}".`
    });
    if (db) {
      try {
        await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", id);
      } catch (e) {
        console.warn("MySQL whatsapp-group error", e);
      }
    }
    await persistSettingsToMysql();
    saveDatabase();
    return res.json({
      success: true,
      data: mitra,
      outcome: result,
      whatsappGroupName: resolvedName,
      whatsappGroupLink: resolvedLink,
      message: `${mitra.fullName}: ${result.detail}`
    });
  }
  const gatewayResult = formattedPhone ? await dispatchWhatsAppGatewayGroupAction(isRemove ? "remove" : "add", [formattedPhone]) : { attempted: false, ok: false, detail: "Nomor WhatsApp Mitra belum diisi." };
  if (!gatewayResult.ok) {
    return res.status(400).json({
      success: false,
      message: `Gagal memproses melalui WhatsApp Gateway: ${gatewayResult.detail || "tidak diketahui"}.`
    });
  }
  if (isRemove) {
    mitra.whatsappGroupInvited = false;
    mitra.whatsappGroupInvitedAt = void 0;
    const cleanedBank = { ...mitra.bankDetails || {} };
    delete cleanedBank.__whatsappGroupInvited;
    delete cleanedBank.__whatsappGroupInvitedAt;
    mitra.bankDetails = cleanedBank;
  } else {
    mitra.whatsappGroupInvited = true;
    mitra.whatsappGroupInvitedAt = nowIso;
    mitra.bankDetails = {
      ...mitra.bankDetails || {},
      __whatsappGroupInvited: true,
      __whatsappGroupInvitedAt: nowIso
    };
  }
  if (db) {
    try {
      await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", id);
    } catch {
    }
  }
  saveDatabase();
  res.json({
    success: true,
    data: mitra,
    gatewayDispatched: true,
    whatsappGroupName: resolvedName,
    whatsappGroupLink: resolvedLink,
    message: isRemove ? `Mitra "${mitra.fullName}" berhasil dikeluarkan dari ${resolvedName} via WhatsApp Gateway.` : `Mitra "${mitra.fullName}" berhasil ditambahkan otomatis ke ${resolvedName} via WhatsApp Gateway.`
  });
});
app.post("/api/whatsapp-group/members", async (req, res) => {
  const { mitraIds, action, customMessage, groupJid } = req.body || {};
  if (!Array.isArray(mitraIds) || mitraIds.length === 0) {
    return res.status(400).json({ success: false, message: "Pilih minimal 1 Mitra terlebih dahulu." });
  }
  const op = action === "remove" ? "remove" : "add";
  const targetIdSet = new Set(mitraIds.map((v) => String(v || "").trim()).filter(Boolean));
  const resolvedName = (appSettings.whatsappGroupName || "Grup WhatsApp Mitra ND Tax & Law").trim();
  const resolvedLink = (appSettings.whatsappGroupLink || "").trim();
  const resolvedJid = (typeof groupJid === "string" && groupJid.trim() ? groupJid.trim() : appSettings.whatsappGroupJid || process.env.WA_GROUP_JID || "").trim();
  const waStatus = getWhatsAppStatus();
  const hasRealBaileys = waStatus.status === "connected" && Boolean(resolvedJid);
  const hasExternalGateway = Boolean((process.env.WA_GATEWAY_URL || "").trim() && (process.env.WA_GROUP_JID || "").trim());
  if (!hasRealBaileys && !hasExternalGateway) {
    return res.status(400).json({
      success: false,
      requiresWhatsAppConnection: true,
      message: waStatus.status === "connected" ? 'Silakan pilih Grup WhatsApp tujuan terlebih dahulu di tab "Koneksi WhatsApp" agar peserta dapat ditambahkan langsung ke grup.' : 'WhatsApp Admin belum terhubung. Silakan buka tab "Koneksi WhatsApp" lalu scan QR menggunakan WhatsApp Admin Grup agar peserta benar-benar masuk ke Grup WhatsApp.'
    });
  }
  if (db) {
    try {
      const { data: dbMitras } = await db.from("mitras").select("*");
      if (Array.isArray(dbMitras)) mitras = normalizeMitraAvatars(dbMitras);
    } catch {
    }
  }
  const matchedMitras = mitras.filter((m) => targetIdSet.has(m.id));
  if (matchedMitras.length === 0) {
    return res.status(404).json({ success: false, message: "Data Mitra yang dipilih tidak ditemukan." });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const extraNote = typeof customMessage === "string" && customMessage.trim() ? ` ${customMessage.trim().slice(0, 500)}` : "";
  if (hasRealBaileys) {
    const outcomes = await updateWhatsAppGroupParticipants(
      resolvedJid,
      matchedMitras.map((m) => ({ mitraId: m.id, fullName: m.fullName, phone: m.phone || "" })),
      op,
      resolvedName,
      resolvedLink
    );
    const outcomeById = new Map(outcomes.map((o) => [o.mitraId, o]));
    let addedCount = 0;
    let alreadyCount = 0;
    let removedCount = 0;
    let invitedDmCount = 0;
    const failedDetails = [];
    const updatedMitras = [];
    for (const mitra of matchedMitras) {
      const resItem = outcomeById.get(mitra.id);
      if (!resItem) continue;
      if (op === "remove" && resItem.outcome === "removed") {
        removedCount += 1;
        mitra.whatsappGroupInvited = false;
        mitra.whatsappGroupInvitedAt = void 0;
        const cleanedBank = { ...mitra.bankDetails || {} };
        delete cleanedBank.__whatsappGroupInvited;
        delete cleanedBank.__whatsappGroupInvitedAt;
        mitra.bankDetails = cleanedBank;
        if (db) {
          try {
            await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", mitra.id);
          } catch {
          }
        }
        updatedMitras.push(mitra);
      } else if (op === "add" && (resItem.outcome === "added" || resItem.outcome === "already_in_group")) {
        if (resItem.outcome === "added") addedCount += 1;
        else alreadyCount += 1;
        mitra.whatsappGroupInvited = true;
        mitra.whatsappGroupInvitedAt = nowIso;
        mitra.bankDetails = {
          ...mitra.bankDetails || {},
          __whatsappGroupInvited: true,
          __whatsappGroupInvitedAt: nowIso
        };
        const notif = {
          id: `notif-mtr-wa-${mitra.id}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
          title: `Peserta ${resolvedName}`,
          message: `Admin telah menambahkan Anda ke Grup WhatsApp ${resolvedName}.${extraNote}`,
          type: "verification",
          timestamp: nowIso,
          isRead: false,
          targetAudience: "mitra",
          mitraId: mitra.id
        };
        notifications.unshift(notif);
        if (db) {
          try {
            await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", mitra.id);
            await db.from("notifications").insert([toDbNotification(notif)]);
          } catch {
          }
        }
        updatedMitras.push(mitra);
      } else if (resItem.outcome === "invited_via_dm") {
        invitedDmCount += 1;
      } else {
        failedDetails.push(`${mitra.fullName} (${resItem.detail})`);
      }
    }
    recordActivity({
      actorRole: "admin",
      actorId: adminAccount.id,
      actorName: adminAccount.name,
      actorEmail: adminAccount.email,
      actionType: "mitra_verify",
      operation: "UPDATE",
      targetEntity: "Grup WhatsApp Mitra",
      description: op === "remove" ? `Admin mengeluarkan ${removedCount} Mitra dari Grup WhatsApp "${resolvedName}".` : `Admin memproses penambahan ke Grup WhatsApp "${resolvedName}": ${addedCount} masuk langsung, ${alreadyCount} sudah di grup, ${invitedDmCount} dikirim undangan DM WA, ${failedDetails.length} gagal.`
    });
    saveDatabase();
    const parts = [];
    if (addedCount > 0) parts.push(`${addedCount} peserta berhasil masuk langsung ke Grup WhatsApp`);
    if (alreadyCount > 0) parts.push(`${alreadyCount} peserta sudah ada di dalam grup`);
    if (removedCount > 0) parts.push(`${removedCount} peserta berhasil dikeluarkan dari Grup WhatsApp`);
    if (invitedDmCount > 0) parts.push(`${invitedDmCount} peserta dibatasi privasi WA (link undangan otomatis dikirim ke chat WA)`);
    if (failedDetails.length > 0) parts.push(`${failedDetails.length} gagal: ${failedDetails.slice(0, 3).join("; ")}`);
    const anySuccess = addedCount > 0 || alreadyCount > 0 || removedCount > 0 || invitedDmCount > 0;
    return res.status(anySuccess ? 200 : 400).json({
      success: anySuccess,
      count: updatedMitras.length,
      data: updatedMitras,
      outcomes,
      message: parts.join(" \xB7 ") || "Tidak ada perubahan pada Grup WhatsApp."
    });
  }
  const phonesToDispatch = matchedMitras.map((m) => formatPhoneToIndonesianWa(m.phone)).filter(Boolean);
  const gatewayResult = await dispatchWhatsAppGatewayGroupAction(op, phonesToDispatch);
  if (!gatewayResult.ok) {
    return res.status(400).json({
      success: false,
      message: `Gagal memproses melalui WhatsApp Gateway: ${gatewayResult.detail || "tidak diketahui"}.`
    });
  }
  for (const mitra of matchedMitras) {
    if (op === "remove") {
      mitra.whatsappGroupInvited = false;
      mitra.whatsappGroupInvitedAt = void 0;
      const cleanedBank = { ...mitra.bankDetails || {} };
      delete cleanedBank.__whatsappGroupInvited;
      delete cleanedBank.__whatsappGroupInvitedAt;
      mitra.bankDetails = cleanedBank;
    } else {
      mitra.whatsappGroupInvited = true;
      mitra.whatsappGroupInvitedAt = nowIso;
      mitra.bankDetails = {
        ...mitra.bankDetails || {},
        __whatsappGroupInvited: true,
        __whatsappGroupInvitedAt: nowIso
      };
    }
    if (db) {
      try {
        await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", mitra.id);
      } catch {
      }
    }
  }
  saveDatabase();
  res.json({
    success: true,
    count: matchedMitras.length,
    data: matchedMitras,
    gatewayDispatched: true,
    message: op === "remove" ? `${matchedMitras.length} Mitra berhasil dikeluarkan dari ${resolvedName} via WhatsApp Gateway.` : `${matchedMitras.length} Mitra berhasil ditambahkan otomatis ke ${resolvedName} via WhatsApp Gateway.`
  });
});
app.put("/api/mitra/:id/active-status", async (req, res) => {
  const { id } = req.params;
  const { isActive, reason, actorName, actorRole, actorId, actorEmail } = req.body || {};
  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Parameter isActive (boolean) wajib diisi."
    });
  }
  await syncMitrasFromMysqlForValidation();
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Data Mitra tidak ditemukan." });
  }
  const resolvedRole = actorRole === "staff" ? "staff" : "admin";
  const resolvedActorName = String(actorName || "").trim() || (resolvedRole === "staff" ? "Staf Operasional" : adminAccount.name);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  mitra.isActive = isActive;
  const updatedBank = { ...mitra.bankDetails || {} };
  updatedBank.__isActive = isActive;
  if (!isActive) {
    mitra.deactivatedAt = nowIso;
    mitra.deactivatedBy = resolvedActorName;
    mitra.deactivatedReason = trimmedReason || void 0;
    updatedBank.__deactivatedAt = nowIso;
    updatedBank.__deactivatedBy = resolvedActorName;
    if (trimmedReason) {
      updatedBank.__deactivatedReason = trimmedReason;
    } else {
      delete updatedBank.__deactivatedReason;
    }
  } else {
    mitra.deactivatedAt = void 0;
    mitra.deactivatedBy = void 0;
    mitra.deactivatedReason = void 0;
    delete updatedBank.__deactivatedAt;
    delete updatedBank.__deactivatedBy;
    delete updatedBank.__deactivatedReason;
  }
  mitra.bankDetails = updatedBank;
  if (db) {
    try {
      await db.from("mitras").update({ bankDetails: mitra.bankDetails }).eq("id", id);
    } catch (e) {
      console.warn("MySQL update mitra active-status error", e);
    }
  }
  recordActivity({
    actorRole: resolvedRole,
    actorId: actorId || (resolvedRole === "staff" ? "staff-01" : adminAccount.id),
    actorName: resolvedActorName,
    actorEmail: actorEmail || adminAccount.email,
    actionType: "mitra_status",
    operation: "UPDATE",
    targetEntity: "Status Aktif Mitra",
    description: isActive ? `${resolvedActorName} mengaktifkan kembali akun Mitra "${mitra.fullName}" (${mitra.memberCode}). Mitra kini dapat login kembali.` : `${resolvedActorName} menonaktifkan akun Mitra "${mitra.fullName}" (${mitra.memberCode}) sehingga tidak dapat login.${trimmedReason ? ` Alasan: "${trimmedReason}".` : ""}`
  });
  saveDatabase();
  return res.json({
    success: true,
    data: mitra,
    message: isActive ? `Akun Mitra "${mitra.fullName}" berhasil diaktifkan kembali.` : `Akun Mitra "${mitra.fullName}" berhasil dinonaktifkan dan tidak dapat login.`
  });
});
app.delete("/api/mitra/:id", async (req, res) => {
  const { id } = req.params;
  const { actorName, actorRole, actorId, actorEmail } = req.body || {};
  await syncMitrasFromMysqlForValidation();
  if (db) {
    try {
      const { data: dbDeals, error: errD } = await db.from("client_deals").select("*");
      if (!errD && Array.isArray(dbDeals)) {
        clientDeals = dbDeals;
      }
    } catch {
    }
  }
  const mitraIndex = mitras.findIndex((m) => m.id === id);
  if (mitraIndex === -1) {
    return res.status(404).json({ success: false, message: "Data Mitra tidak ditemukan." });
  }
  const targetMitra = mitras[mitraIndex];
  const linkedClients = clientDeals.filter((c) => c.mitraId === id);
  const effectiveClientCount = Math.max(
    linkedClients.length,
    Number(targetMitra.referredClientsCount || 0)
  );
  if (effectiveClientCount > 0) {
    return res.status(400).json({
      success: false,
      code: "MITRA_HAS_CLIENTS",
      clientCount: effectiveClientCount,
      message: `Data Mitra "${targetMitra.fullName}" tidak dapat dihapus karena sudah memiliki ${effectiveClientCount} klien terdaftar. Anda hanya dapat menonaktifkan akun mitra ini agar tidak bisa login.`
    });
  }
  mitras.splice(mitraIndex, 1);
  const normalizedEmail = normalizeMitraEmail(targetMitra.email);
  if (normalizedEmail) {
    userPasswords.delete(normalizedEmail);
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  for (const room of chatRooms) {
    if (Array.isArray(room.participantIds) && room.participantIds.includes(id)) {
      room.participantIds = room.participantIds.filter((pid) => pid !== id);
      room.updatedAt = nowIso;
      try {
        await persistChatToCloud(room, void 0);
        broadcastChatEvent({ type: "chat:room_updated", room });
      } catch {
      }
    }
  }
  notifications = notifications.filter((n) => n.mitraId !== id);
  if (db) {
    try {
      await db.from("mitras").delete().eq("id", id);
      await db.from("notifications").delete().eq("mitraId", id);
      if (normalizedEmail) {
        await db.from("user_passwords").delete().eq("email", normalizedEmail);
      }
    } catch (e) {
      console.warn("MySQL delete mitra error", e);
    }
  }
  const resolvedRole = actorRole === "staff" ? "staff" : "admin";
  const resolvedActorName = String(actorName || "").trim() || (resolvedRole === "staff" ? "Staf Operasional" : adminAccount.name);
  recordActivity({
    actorRole: resolvedRole,
    actorId: actorId || (resolvedRole === "staff" ? "staff-01" : adminAccount.id),
    actorName: resolvedActorName,
    actorEmail: actorEmail || adminAccount.email,
    actionType: "mitra_delete",
    operation: "DELETE",
    targetEntity: "Hapus Data Mitra",
    description: `${resolvedActorName} menghapus permanen data Mitra "${targetMitra.fullName}" (${targetMitra.memberCode}, ${targetMitra.email}) yang belum memiliki klien.`
  });
  saveDatabase();
  return res.json({
    success: true,
    deletedId: id,
    message: `Data Mitra "${targetMitra.fullName}" berhasil dihapus secara permanen.`
  });
});
app.put("/api/mitra/:id/profile", async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    email,
    phone,
    nik,
    ktpFileUrl,
    ktpFileName,
    specialization,
    bankDetails,
    gender,
    avatarUrl,
    newPassword,
    resubmitVerification,
    customFields,
    memberCode,
    referralCode,
    joinedDate,
    status,
    rejectionReason,
    emailVerified,
    editedByAdmin,
    actorRole,
    actorId,
    actorName,
    actorEmail
  } = req.body;
  await syncMitrasFromMysqlForValidation();
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Mitra tidak ditemukan" });
  }
  const isAdminOrStaffEdit = Boolean(editedByAdmin) || actorRole === "admin" || actorRole === "staff";
  const oldEmailLower = normalizeMitraEmail(mitra.email);
  let nextEmailLower = oldEmailLower;
  if (typeof email === "string" && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Format alamat email tidak valid."
      });
    }
    if (cleanEmail !== oldEmailLower) {
      const emailCheck = checkMitraIdentityUniqueness({
        email: cleanEmail,
        excludeMitraId: id
      });
      if (emailCheck.emailTaken) {
        return res.status(400).json({
          success: false,
          field: "email",
          message: emailCheck.emailMessage || "Email sudah digunakan oleh akun lain."
        });
      }
      nextEmailLower = cleanEmail;
    }
  }
  if (typeof nik === "string" && normalizeNikNpwp(nik)) {
    const uniqueness = checkMitraIdentityUniqueness({
      nik,
      excludeMitraId: id
    });
    if (uniqueness.nikTaken) {
      return res.status(400).json({
        success: false,
        field: "nik",
        message: uniqueness.nikMessage
      });
    }
  }
  if (isAdminOrStaffEdit && typeof memberCode === "string" && memberCode.trim()) {
    const cleanMemberCode = memberCode.trim().toUpperCase();
    const duplicateCode = mitras.find(
      (m) => m.id !== id && String(m.memberCode || "").trim().toUpperCase() === cleanMemberCode
    );
    if (duplicateCode) {
      return res.status(400).json({
        success: false,
        field: "memberCode",
        message: `ID Anggota "${cleanMemberCode}" sudah digunakan oleh mitra lain.`
      });
    }
    mitra.memberCode = cleanMemberCode;
  }
  if (isAdminOrStaffEdit && typeof referralCode === "string" && referralCode.trim()) {
    const cleanReferralCode = referralCode.trim().toUpperCase();
    const duplicateRef = mitras.find(
      (m) => m.id !== id && String(m.referralCode || "").trim().toUpperCase() === cleanReferralCode
    );
    if (duplicateRef) {
      return res.status(400).json({
        success: false,
        field: "referralCode",
        message: `Kode Referral "${cleanReferralCode}" sudah digunakan oleh mitra lain.`
      });
    }
    mitra.referralCode = cleanReferralCode;
  }
  const wasRejected = mitra.status === "rejected";
  if (typeof fullName === "string" && fullName.trim()) mitra.fullName = fullName.trim();
  if (typeof phone === "string") {
    const cleanPhone = phone.trim();
    if (cleanPhone) mitra.phone = cleanPhone;
  }
  if (typeof nik === "string") {
    mitra.nik = nik.trim() || "-";
  }
  if (typeof specialization === "string" && specialization.trim()) {
    mitra.specialization = specialization.trim();
  }
  if (isAdminOrStaffEdit && typeof joinedDate === "string" && joinedDate.trim()) {
    mitra.joinedDate = joinedDate.trim();
  }
  if (isAdminOrStaffEdit && typeof emailVerified === "boolean") {
    mitra.emailVerified = emailVerified;
    if (emailVerified) {
      mitra.verificationToken = void 0;
      mitra.verificationTokenExpiry = void 0;
    }
  }
  if (typeof ktpFileUrl === "string" && ktpFileUrl.trim()) {
    let cleanKtpUrl = ktpFileUrl.trim();
    if (cleanKtpUrl.startsWith("data:")) {
      const saved = saveDataUrlToHostingServer(
        cleanKtpUrl,
        typeof ktpFileName === "string" && ktpFileName.trim() ? ktpFileName.trim() : `ktp-${mitra.fullName}`,
        "jpg"
      );
      if (saved) cleanKtpUrl = saved.hostedUrl;
    }
    mitra.ktpFileUrl = cleanKtpUrl;
  }
  if (typeof ktpFileName === "string" && ktpFileName.trim()) {
    mitra.ktpFileName = ktpFileName.trim();
  }
  if (customFields && typeof customFields === "object") {
    const mergedCf = { ...mitra.customFields || {} };
    for (const [k, v] of Object.entries(customFields)) {
      if (typeof v === "string" && v.startsWith("data:")) {
        const saved = saveDataUrlToHostingServer(v, `${k}-${mitra.fullName}`, "jpg");
        mergedCf[k] = saved ? saved.hostedUrl : v;
      } else if (typeof v === "string") {
        mergedCf[k] = v;
      }
      const kl = k.toLowerCase();
      if (!mitra.ktpFileUrl && (k === "mitra-def-ktpFile" || kl.includes("ktp") || kl.includes("npwp")) && mergedCf[k]) {
        mitra.ktpFileUrl = mergedCf[k];
      }
    }
    mitra.customFields = mergedCf;
  }
  if (gender === "male" || gender === "female") {
    mitra.gender = gender;
  }
  if (bankDetails || mitra.customFields || mitra.gender || mitra.ktpFileUrl || mitra.ktpFileName) {
    const mergedBank = { ...mitra.bankDetails, ...bankDetails || {} };
    if (mitra.gender === "male" || mitra.gender === "female") {
      mergedBank.__gender = mitra.gender;
    }
    if (mitra.ktpFileUrl) {
      mergedBank.__ktpFileUrl = mitra.ktpFileUrl;
    }
    if (mitra.ktpFileName) {
      mergedBank.__ktpFileName = mitra.ktpFileName;
    }
    if (mitra.customFields && Object.keys(mitra.customFields).length > 0) {
      mergedBank.__customFields = mitra.customFields;
    }
    if (bankDetails && typeof bankDetails.accountNumber === "string") {
      const rawAcc = bankDetails.accountNumber.trim();
      if (rawAcc === "-") {
        mergedBank.accountNumber = "";
      } else {
        mergedBank.accountNumber = rawAcc.replace(/\D/g, "");
      }
    }
    if (!isAdminOrStaffEdit && (wasRejected || resubmitVerification)) {
      delete mergedBank.__rejectionReason;
      delete mergedBank.__rejectedAt;
    }
    mitra.bankDetails = mergedBank;
  }
  if (!isAdminOrStaffEdit) {
    const remainingMissing = getMissingMitraFields(mitra, appSettings);
    if (remainingMissing.length === 0) {
      mitra.profileCompletionNotice = void 0;
      mitra.profileCompletionNoticeAt = void 0;
      if (mitra.bankDetails) {
        const cleanedBank = { ...mitra.bankDetails };
        delete cleanedBank.__profileCompletionNotice;
        delete cleanedBank.__profileCompletionNoticeAt;
        mitra.bankDetails = cleanedBank;
      }
    }
  }
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim().length > 0) {
    mitra.avatarUrl = avatarUrl.trim();
  } else if (gender === "male" || gender === "female") {
    mitra.avatarUrl = getDefaultAvatar(gender, mitra.fullName);
  }
  if (isAdminOrStaffEdit && (status === "verified" || status === "pending" || status === "rejected")) {
    mitra.status = status;
    const bankMeta = { ...mitra.bankDetails || {} };
    if (status === "rejected") {
      const cleanReason = typeof rejectionReason === "string" && rejectionReason.trim() ? rejectionReason.trim() : mitra.rejectionReason || "Data pendaftaran memerlukan perbaikan.";
      mitra.rejectionReason = cleanReason;
      mitra.rejectedAt = mitra.rejectedAt || (/* @__PURE__ */ new Date()).toISOString();
      bankMeta.__rejectionReason = cleanReason;
      bankMeta.__rejectedAt = mitra.rejectedAt;
    } else {
      mitra.rejectionReason = void 0;
      mitra.rejectedAt = void 0;
      delete bankMeta.__rejectionReason;
      delete bankMeta.__rejectedAt;
    }
    mitra.bankDetails = bankMeta;
  } else if (!isAdminOrStaffEdit && (wasRejected || resubmitVerification)) {
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
      id: `notif-mtr-${mitra.id}-${Date.now()}`,
      title: "Pengajuan Ulang Verifikasi Data Mitra",
      message: `Mitra "${mitra.fullName}" (${mitra.memberCode}) telah memperbaiki data pendaftaran dan mengajukan ulang verifikasi kepada Admin.`,
      type: "verification",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false,
      targetAudience: "mitra",
      mitraId: mitra.id
    };
    notifications.unshift(notif);
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch {
      }
    }
  }
  const prevStoredEnc = userPasswords.get(oldEmailLower) || encryptUserPassword("mitraND2026!", "mitra");
  if (nextEmailLower !== oldEmailLower) {
    userPasswords.delete(oldEmailLower);
    mitra.email = nextEmailLower;
    if (db) {
      try {
        await db.from("user_passwords").delete().eq("email", oldEmailLower);
      } catch {
      }
    }
  }
  if (newPassword && String(newPassword).trim().length >= 6) {
    const encryptedPwd = encryptUserPassword(String(newPassword).trim(), "mitra");
    userPasswords.set(nextEmailLower, encryptedPwd);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: encryptedPwd }]);
      } catch {
      }
    }
  } else if (nextEmailLower !== oldEmailLower) {
    const migratedPwd = encryptUserPassword(prevStoredEnc, "mitra");
    userPasswords.set(nextEmailLower, migratedPwd);
    if (db) {
      try {
        await db.from("user_passwords").upsert([{ email: nextEmailLower, password: migratedPwd }]);
      } catch {
      }
    }
  }
  recordActivity({
    actorRole: isAdminOrStaffEdit ? actorRole === "staff" ? "staff" : "admin" : "mitra",
    actorId: isAdminOrStaffEdit ? actorId || adminAccount.id : mitra.id,
    actorName: isAdminOrStaffEdit ? actorName || (actorRole === "staff" ? "Staf Operasional" : adminAccount.name) : mitra.fullName,
    actorEmail: isAdminOrStaffEdit ? actorEmail || adminAccount.email : mitra.email,
    actionType: "profile_update",
    operation: "UPDATE",
    targetEntity: isAdminOrStaffEdit ? "Edit Data Mitra oleh Admin/Staf" : wasRejected || resubmitVerification ? "Pengajuan Ulang Verifikasi Mitra" : "Profil & Rekening Mitra",
    description: isAdminOrStaffEdit ? `${actorRole === "staff" ? "Staf" : "Admin"} memperbarui data lengkap Mitra "${mitra.fullName}" (${mitra.memberCode}, Email: ${mitra.email}, NIK/NPWP: ${mitra.nik}).` : wasRejected || resubmitVerification ? `Mitra "${mitra.fullName}" memperbarui data diri/rekening dan mengajukan ulang verifikasi pendaftaran ke Admin.` : `Mitra "${mitra.fullName}" memperbarui data profil dan rekening bank (${mitra.bankDetails.bankName} - ${mitra.bankDetails.accountNumber}).`
  });
  if (db) {
    const dbUpdatePayload = {
      fullName: mitra.fullName,
      email: mitra.email,
      phone: mitra.phone,
      nik: mitra.nik,
      specialization: mitra.specialization,
      bankDetails: mitra.bankDetails,
      avatarUrl: mitra.avatarUrl,
      status: mitra.status,
      joinedDate: mitra.joinedDate,
      memberCode: mitra.memberCode,
      referralCode: mitra.referralCode,
      ...typeof mitra.emailVerified === "boolean" ? { emailVerified: mitra.emailVerified } : {}
    };
    try {
      const { error: updateErr } = await db.from("mitras").update(dbUpdatePayload).eq("id", id);
      if (updateErr) {
        const { emailVerified: _ev, ...minimalUpdate } = dbUpdatePayload;
        await db.from("mitras").update(minimalUpdate).eq("id", id);
      }
    } catch (e) {
      console.warn("MySQL update profile error", e);
    }
  }
  saveDatabase();
  res.json({
    success: true,
    data: mitra,
    message: `Data Mitra "${mitra.fullName}" berhasil diperbarui.`
  });
});
var MARKETING_UPLOADS_DIR = path3.join(__dirname, "public", "uploads", "marketing-tools");
var DATA_UPLOADS_DIR = path3.join(DATA_DIR, "uploads", "marketing-tools");
var PERSISTENT_HOME_UPLOADS_DIR = path3.join(
  os2.homedir(),
  ".ndtaxandlaw_storage",
  "uploads",
  "marketing-tools"
);
var LEGACY_DIST_MARKETING_UPLOADS_DIR = path3.join(__dirname, "dist", "uploads", "marketing-tools");
var CHAT_PUBLIC_UPLOADS_DIR = path3.join(__dirname, "public", "uploads", "chat");
var CHAT_DATA_UPLOADS_DIR = path3.join(DATA_DIR, "uploads", "chat");
var CHAT_HOME_UPLOADS_DIR = path3.join(
  os2.homedir(),
  ".ndtaxandlaw_storage",
  "uploads",
  "chat"
);
var LEGACY_DIST_CHAT_UPLOADS_DIR = path3.join(__dirname, "dist", "uploads", "chat");
for (const dir of [
  PERSISTENT_HOME_UPLOADS_DIR,
  DATA_UPLOADS_DIR,
  MARKETING_UPLOADS_DIR,
  CHAT_HOME_UPLOADS_DIR,
  CHAT_DATA_UPLOADS_DIR,
  CHAT_PUBLIC_UPLOADS_DIR
]) {
  try {
    if (!fs3.existsSync(dir)) {
      fs3.mkdirSync(dir, { recursive: true });
    }
  } catch {
  }
}
var resolveConfinedFilePath = (baseDir, rawFileName) => {
  const safeName = path3.basename(String(rawFileName || "").trim());
  if (!safeName || safeName === "." || safeName === "..") return null;
  const resolvedBase = path3.resolve(baseDir);
  const resolvedTarget = path3.resolve(resolvedBase, safeName);
  if (!resolvedTarget.startsWith(resolvedBase + path3.sep)) return null;
  return resolvedTarget;
};
var rescueLegacyUploadsToPersistentHome = (homeDir, legacySourceDirs) => {
  try {
    if (!fs3.existsSync(homeDir)) fs3.mkdirSync(homeDir, { recursive: true });
    for (const srcDir of legacySourceDirs) {
      if (!fs3.existsSync(srcDir)) continue;
      for (const file of fs3.readdirSync(srcDir)) {
        const srcPath = resolveConfinedFilePath(srcDir, file);
        const destPath = resolveConfinedFilePath(homeDir, file);
        if (!srcPath || !destPath) continue;
        try {
          if (!fs3.statSync(srcPath).isFile()) continue;
          if (!fs3.existsSync(destPath)) {
            fs3.copyFileSync(srcPath, destPath);
          }
        } catch {
        }
      }
    }
  } catch {
  }
};
rescueLegacyUploadsToPersistentHome(PERSISTENT_HOME_UPLOADS_DIR, [
  DATA_UPLOADS_DIR,
  MARKETING_UPLOADS_DIR,
  LEGACY_DIST_MARKETING_UPLOADS_DIR
]);
rescueLegacyUploadsToPersistentHome(CHAT_HOME_UPLOADS_DIR, [
  CHAT_DATA_UPLOADS_DIR,
  CHAT_PUBLIC_UPLOADS_DIR,
  LEGACY_DIST_CHAT_UPLOADS_DIR
]);
var ALLOWED_CHAT_ATTACHMENT_EXTS = /* @__PURE__ */ new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "mp4",
  "webm",
  "mov",
  "m4v",
  "3gp",
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "aac",
  "opus",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "rtf",
  "odt",
  "ods",
  "odp",
  "zip",
  "rar",
  "7z"
]);
var MAX_CHAT_ATTACHMENT_BYTES = 30 * 1024 * 1024;
var MAX_CHAT_HD_VIDEO_BYTES = 120 * 1024 * 1024;
var MAX_CHAT_VIDEO_DURATION_SEC = 120;
var MAX_RAW_VIDEO_UPLOAD_BYTES = 250 * 1024 * 1024;
var VIDEO_UPLOAD_CHUNK_MAX_BYTES = 10 * 1024 * 1024;
var atomicWriteFileSync = (targetPath, data) => {
  const dir = path3.dirname(targetPath);
  if (!fs3.existsSync(dir)) {
    fs3.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}-${crypto2.randomBytes(3).toString("hex")}`;
  try {
    fs3.writeFileSync(tmpPath, data);
    fs3.renameSync(tmpPath, targetPath);
  } catch (err) {
    try {
      if (fs3.existsSync(tmpPath)) fs3.unlinkSync(tmpPath);
    } catch {
    }
    fs3.writeFileSync(targetPath, data);
  }
};
var RESOLVED_FFMPEG_BIN = typeof ffmpegStatic === "string" && ffmpegStatic.trim() && fs3.existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg";
var checkedWebVideoCache = /* @__PURE__ */ new Set();
var inFlightVideoTranscodes = /* @__PURE__ */ new Map();
var bufferLikelyNeedsWebVideoTranscode = (buf, ext) => {
  const lowerExt = ext.toLowerCase();
  if (lowerExt === "mov" || lowerExt === "3gp" || lowerExt === "m4v") return true;
  return buf.includes(Buffer.from("hvc1")) || buf.includes(Buffer.from("hev1")) || buf.includes(Buffer.from("dvh1")) || buf.includes(Buffer.from("dvhe"));
};
var transcodeVideoFileToWebMp4 = async (inPath, options) => {
  const maxDur = Math.max(1, Math.min(MAX_CHAT_VIDEO_DURATION_SEC, Number(options?.maxDurationSec || MAX_CHAT_VIDEO_DURATION_SEC)));
  const startSec = Number.isFinite(Number(options?.trimStartSec)) ? Math.max(0, Number(options?.trimStartSec)) : 0;
  const rawEndSec = Number.isFinite(Number(options?.trimEndSec)) ? Number(options?.trimEndSec) : void 0;
  const clippedDurationSec = rawEndSec !== void 0 && rawEndSec > startSec ? Math.min(maxDur, Math.max(0.5, rawEndSec - startSec)) : maxDur;
  let rawBytes = Number(options?.rawByteSize || 0);
  if (!rawBytes) {
    try {
      rawBytes = fs3.statSync(inPath).size;
    } catch {
    }
  }
  const isHd = Boolean(options?.hd);
  const srcExt = (options?.sourceExt || path3.extname(inPath).replace(/^\./, "") || "mp4").toLowerCase();
  if (isHd && (srcExt === "mp4" || srcExt === "webm") && rawBytes <= MAX_CHAT_HD_VIDEO_BYTES) {
    const rawBuf = fs3.readFileSync(inPath);
    const needsCodecConvert = bufferLikelyNeedsWebVideoTranscode(rawBuf, srcExt);
    if (!needsCodecConvert && !options?.needsTrim) {
      return {
        buffer: rawBuf,
        ext: srcExt,
        transcoded: false,
        clippedDurationSec
      };
    }
    if (!needsCodecConvert && options?.needsTrim && srcExt === "mp4") {
      const uniqueCopyId = `${Date.now()}-${crypto2.randomBytes(4).toString("hex")}`;
      const copyOutPath = path3.join(os2.tmpdir(), `nd-vid-hdcopy-${uniqueCopyId}.mp4`);
      const copyArgs = ["-y"];
      if (startSec > 0.01) copyArgs.push("-ss", startSec.toFixed(2));
      copyArgs.push("-i", inPath, "-t", clippedDurationSec.toFixed(2), "-c", "copy", "-movflags", "+faststart", copyOutPath);
      try {
        await new Promise((resolve, reject) => {
          execFile2(RESOLVED_FFMPEG_BIN, copyArgs, { timeout: 9e4, maxBuffer: 10 * 1024 * 1024 }, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        if (fs3.existsSync(copyOutPath)) {
          const outBuf = fs3.readFileSync(copyOutPath);
          if (outBuf.length > 1024) {
            return { buffer: outBuf, ext: "mp4", transcoded: true, clippedDurationSec };
          }
        }
      } catch {
      } finally {
        try {
          if (fs3.existsSync(copyOutPath)) fs3.unlinkSync(copyOutPath);
        } catch {
        }
      }
    }
  }
  const uniqueId = `${Date.now()}-${crypto2.randomBytes(4).toString("hex")}`;
  const outPath = path3.join(os2.tmpdir(), `nd-vid-out-${uniqueId}.mp4`);
  const args = ["-y"];
  if (startSec > 0.01) {
    args.push("-ss", startSec.toFixed(2));
  }
  if (isHd) {
    args.push(
      "-i",
      inPath,
      "-t",
      clippedDurationSec.toFixed(2),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-level",
      "4.2",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outPath
    );
  } else {
    let maxDim = 1280;
    let crf = "24";
    let maxrate = "1800k";
    let bufsize = "3600k";
    let audioBitrate = "128k";
    if (clippedDurationSec > 75) {
      maxDim = 854;
      crf = "27";
      maxrate = "750k";
      bufsize = "1500k";
      audioBitrate = "96k";
    } else if (clippedDurationSec > 35 || rawBytes > 20 * 1024 * 1024) {
      maxDim = 960;
      crf = "26";
      maxrate = "1100k";
      bufsize = "2200k";
      audioBitrate = "96k";
    }
    args.push(
      "-i",
      inPath,
      "-t",
      clippedDurationSec.toFixed(2),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "main",
      "-level",
      "4.0",
      "-preset",
      "veryfast",
      "-crf",
      crf,
      "-maxrate",
      maxrate,
      "-bufsize",
      bufsize,
      "-vf",
      `scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      "-c:a",
      "aac",
      "-b:a",
      audioBitrate,
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outPath
    );
  }
  try {
    await new Promise((resolve, reject) => {
      execFile2(
        RESOLVED_FFMPEG_BIN,
        args,
        { timeout: 18e4, maxBuffer: 10 * 1024 * 1024 },
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
    if (fs3.existsSync(outPath)) {
      const outBuf = fs3.readFileSync(outPath);
      if (outBuf.length > 1024) {
        return { buffer: outBuf, ext: "mp4", transcoded: true, clippedDurationSec };
      }
    }
  } catch (err) {
    console.warn("Chat video web-MP4 transcode fallback:", err?.message || err);
  } finally {
    try {
      if (fs3.existsSync(outPath)) fs3.unlinkSync(outPath);
    } catch {
    }
  }
  return {
    buffer: fs3.existsSync(inPath) ? fs3.readFileSync(inPath) : Buffer.alloc(0),
    ext: srcExt || "mp4",
    transcoded: false,
    clippedDurationSec
  };
};
var transcodeVideoBufferToWebMp4 = async (rawBuffer, sourceExt, options) => {
  const cleanExt = sourceExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const uniqueId = `${Date.now()}-${crypto2.randomBytes(4).toString("hex")}`;
  const inPath = path3.join(os2.tmpdir(), `nd-vid-in-${uniqueId}.${cleanExt}`);
  try {
    fs3.writeFileSync(inPath, rawBuffer);
    const res = await transcodeVideoFileToWebMp4(inPath, {
      trimStartSec: options?.trimStartSec,
      trimEndSec: options?.trimEndSec,
      maxDurationSec: MAX_CHAT_VIDEO_DURATION_SEC,
      rawByteSize: rawBuffer.length
    });
    return {
      buffer: res.buffer.length > 0 ? res.buffer : rawBuffer,
      ext: res.transcoded ? "mp4" : cleanExt,
      transcoded: res.transcoded
    };
  } finally {
    try {
      if (fs3.existsSync(inPath)) fs3.unlinkSync(inPath);
    } catch {
    }
  }
};
var maybeAutoHealExistingChatVideo = async (bucket, safeName, filePath) => {
  if (bucket !== "chat") return;
  const lower = safeName.toLowerCase();
  if (!/\.(mp4|mov|m4v|3gp)$/.test(lower)) return;
  if (checkedWebVideoCache.has(lower)) return;
  const existingTask = inFlightVideoTranscodes.get(lower);
  if (existingTask) {
    await existingTask;
    return;
  }
  const task = (async () => {
    try {
      const stat = fs3.statSync(filePath);
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_CHAT_ATTACHMENT_BYTES) {
        checkedWebVideoCache.add(lower);
        return;
      }
      const rawBuf = fs3.readFileSync(filePath);
      const ext = lower.split(".").pop() || "mp4";
      if (!bufferLikelyNeedsWebVideoTranscode(rawBuf, ext)) {
        checkedWebVideoCache.add(lower);
        return;
      }
      const result = await transcodeVideoBufferToWebMp4(rawBuf, ext);
      if (result.transcoded && result.buffer.length > 1024) {
        const dirs = getUploadBucketDirs("chat");
        for (const dir of [dirs.homeDir, dirs.dataDir, dirs.publicDir]) {
          const target = resolveConfinedFilePath(dir, safeName);
          if (!target) continue;
          try {
            atomicWriteFileSync(target, result.buffer);
          } catch {
          }
        }
        if (db && result.buffer.length <= 18 * 1024 * 1024) {
          const cloudKey = `${dirs.cloudKeyPrefix}${lower}__@ndtaxlaw.internal`;
          const cloudPayload = JSON.stringify({
            fileName: safeName,
            bucket: "chat",
            mime: "video/mp4",
            base64: result.buffer.toString("base64"),
            savedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          await Promise.resolve(
            db.from("user_passwords").upsert([{ email: cloudKey, password: cloudPayload }])
          ).catch(() => {
          });
        }
      }
    } catch {
    } finally {
      checkedWebVideoCache.add(lower);
      inFlightVideoTranscodes.delete(lower);
    }
  })();
  inFlightVideoTranscodes.set(lower, task);
  await task;
};
var getMimeTypeFromExt = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/mp4";
  if (lower.endsWith(".m4v")) return "video/mp4";
  if (lower.endsWith(".3gp")) return "video/mp4";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".odt")) return "application/vnd.oasis.opendocument.text";
  if (lower.endsWith(".ods")) return "application/vnd.oasis.opendocument.spreadsheet";
  if (lower.endsWith(".odp")) return "application/vnd.oasis.opendocument.presentation";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".rar")) return "application/vnd.rar";
  if (lower.endsWith(".7z")) return "application/x-7z-compressed";
  return "application/octet-stream";
};
var getUploadBucketDirs = (bucket) => {
  if (bucket === "chat") {
    return {
      homeDir: CHAT_HOME_UPLOADS_DIR,
      dataDir: CHAT_DATA_UPLOADS_DIR,
      publicDir: CHAT_PUBLIC_UPLOADS_DIR,
      legacyDistDir: LEGACY_DIST_CHAT_UPLOADS_DIR,
      cloudKeyPrefix: "__sys_chat_file_",
      urlPrefix: "/uploads/chat/"
    };
  }
  return {
    homeDir: PERSISTENT_HOME_UPLOADS_DIR,
    dataDir: DATA_UPLOADS_DIR,
    publicDir: MARKETING_UPLOADS_DIR,
    legacyDistDir: LEGACY_DIST_MARKETING_UPLOADS_DIR,
    cloudKeyPrefix: "__sys_file_",
    urlPrefix: "/uploads/marketing-tools/"
  };
};
var parseHostedUploadUrl = (rawUrl) => {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;
  let pathOnly = trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      pathOnly = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }
  pathOnly = pathOnly.split("?")[0].split("#")[0];
  if (pathOnly.startsWith("/uploads/chat/")) {
    const fileName = path3.basename(decodeURIComponent(pathOnly.slice("/uploads/chat/".length)));
    if (!fileName || fileName === "." || fileName === "..") return null;
    return { bucket: "chat", fileName, normalizedUrl: `/uploads/chat/${fileName}` };
  }
  if (pathOnly.startsWith("/uploads/marketing-tools/")) {
    const fileName = path3.basename(decodeURIComponent(pathOnly.slice("/uploads/marketing-tools/".length)));
    if (!fileName || fileName === "." || fileName === "..") return null;
    return { bucket: "marketing-tools", fileName, normalizedUrl: `/uploads/marketing-tools/${fileName}` };
  }
  return null;
};
var isHostedUploadUrlStillReferenced = (targetNormalizedUrl) => {
  const matchesUrl = (candidate) => {
    const parsed = parseHostedUploadUrl(candidate);
    return Boolean(parsed && parsed.normalizedUrl === targetNormalizedUrl);
  };
  if (marketingTools.some((t) => matchesUrl(t.downloadUrl) || matchesUrl(t.thumbnailUrl))) {
    return true;
  }
  if (proposalTemplates.some((p) => matchesUrl(p.pdfId?.url) || matchesUrl(p.pdfEn?.url))) {
    return true;
  }
  if (chatMessages.some((m) => !m.isDeleted && matchesUrl(m.imageUrl))) {
    return true;
  }
  if (chatRooms.some((r) => matchesUrl(r.avatarUrl))) {
    return true;
  }
  if (mitras.some((m) => matchesUrl(m.avatarUrl) || matchesUrl(m.ktpFileUrl))) {
    return true;
  }
  if (staffAccounts.some((s) => matchesUrl(s.avatarUrl))) {
    return true;
  }
  if (matchesUrl(appSettings.logoUrl) || matchesUrl(appSettings.logoVerticalUrl) || matchesUrl(appSettings.logoHorizontalUrl) || matchesUrl(appSettings.logoBarcodeUrl) || matchesUrl(adminAccount.avatarUrl)) {
    return true;
  }
  return false;
};
var deleteHostedUploadFile = async (rawUrl, options) => {
  const parsed = parseHostedUploadUrl(rawUrl);
  if (!parsed) return false;
  if (!options?.force && isHostedUploadUrlStillReferenced(parsed.normalizedUrl)) {
    return false;
  }
  const dirs = getUploadBucketDirs(parsed.bucket);
  let removedAny = false;
  for (const dir of [dirs.homeDir, dirs.dataDir, dirs.publicDir, dirs.legacyDistDir]) {
    const confined = resolveConfinedFilePath(dir, parsed.fileName);
    if (!confined) continue;
    try {
      if (fs3.existsSync(confined) && fs3.statSync(confined).isFile()) {
        fs3.unlinkSync(confined);
        removedAny = true;
      }
    } catch {
    }
  }
  if (db) {
    const lowerName = parsed.fileName.toLowerCase();
    const candidateKeys = Array.from(
      /* @__PURE__ */ new Set([
        `${dirs.cloudKeyPrefix}${lowerName}__@ndtaxlaw.internal`,
        `__sys_file_${lowerName}__@ndtaxlaw.internal`,
        `__sys_chat_file_${lowerName}__@ndtaxlaw.internal`
      ])
    );
    try {
      await db.from("user_passwords").delete().in("email", candidateKeys);
    } catch {
    }
  }
  return removedAny;
};
var getHostedUploadByteSize = (rawUrl) => {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return 0;
  if (trimmed.startsWith("data:")) {
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx === -1) return 0;
    const base64Len = trimmed.length - commaIdx - 1;
    return Math.max(0, Math.floor(base64Len * 3 / 4));
  }
  const parsed = parseHostedUploadUrl(trimmed);
  if (!parsed) return 0;
  const dirs = getUploadBucketDirs(parsed.bucket);
  for (const dir of [dirs.homeDir, dirs.dataDir, dirs.publicDir, dirs.legacyDistDir]) {
    const confined = resolveConfinedFilePath(dir, parsed.fileName);
    if (!confined) continue;
    try {
      if (fs3.existsSync(confined)) {
        const st = fs3.statSync(confined);
        if (st.isFile()) return st.size;
      }
    } catch {
    }
  }
  return 0;
};
var serveHostedUploadFile = async (bucket, req, res) => {
  const safeName = path3.basename(String(req.params.filename || "").trim());
  if (!safeName || safeName === "." || safeName === "..") {
    return res.status(404).end();
  }
  const dirs = getUploadBucketDirs(bucket);
  const homePath = resolveConfinedFilePath(dirs.homeDir, safeName);
  const dataPath = resolveConfinedFilePath(dirs.dataDir, safeName);
  const pubPath = resolveConfinedFilePath(dirs.publicDir, safeName);
  const legacyDistPath = resolveConfinedFilePath(dirs.legacyDistDir, safeName);
  if (!homePath) {
    return res.status(404).end();
  }
  const applyUploadHeaders = (mimeType) => {
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=604800");
    if (String(req.query.download || "") === "1") {
      const requestedName = path3.basename(String(req.query.name || safeName).replace(/["\r\n]/g, "")).slice(0, 140) || safeName;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${requestedName}"; filename*=UTF-8''${encodeURIComponent(requestedName)}`
      );
    }
  };
  if (fs3.existsSync(homePath)) {
    await maybeAutoHealExistingChatVideo(bucket, safeName, homePath);
    applyUploadHeaders(getMimeTypeFromExt(safeName));
    return res.sendFile(homePath);
  }
  for (const candidate of [dataPath, pubPath, legacyDistPath]) {
    if (candidate && fs3.existsSync(candidate)) {
      try {
        if (!fs3.existsSync(dirs.homeDir)) {
          fs3.mkdirSync(dirs.homeDir, { recursive: true });
        }
        fs3.copyFileSync(candidate, homePath);
        await maybeAutoHealExistingChatVideo(bucket, safeName, homePath);
        applyUploadHeaders(getMimeTypeFromExt(safeName));
        return res.sendFile(homePath);
      } catch {
        applyUploadHeaders(getMimeTypeFromExt(safeName));
        return res.sendFile(candidate);
      }
    }
  }
  if (db) {
    try {
      const lowerName = safeName.toLowerCase();
      const cloudKey = `${dirs.cloudKeyPrefix}${lowerName}__@ndtaxlaw.internal`;
      const fallbackKey = bucket === "chat" ? `__sys_file_${lowerName}__@ndtaxlaw.internal` : `__sys_chat_file_${lowerName}__@ndtaxlaw.internal`;
      const { data: rows } = await db.from("user_passwords").select("email, password").in("email", [cloudKey, fallbackKey]);
      const matched = Array.isArray(rows) ? rows.find((r) => String(r?.email || "").toLowerCase() === cloudKey) || rows[0] : null;
      if (matched?.password) {
        const parsed = JSON.parse(matched.password);
        if (parsed?.base64) {
          const buf = Buffer.from(parsed.base64, "base64");
          for (const dir of [dirs.homeDir, dirs.dataDir, dirs.publicDir]) {
            const target = resolveConfinedFilePath(dir, safeName);
            if (!target) continue;
            try {
              if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
              fs3.writeFileSync(target, buf);
            } catch {
            }
          }
          if (fs3.existsSync(homePath)) {
            await maybeAutoHealExistingChatVideo(bucket, safeName, homePath);
            applyUploadHeaders(getMimeTypeFromExt(safeName));
            return res.sendFile(homePath);
          }
          const resolvedMime = parsed.mime || getMimeTypeFromExt(safeName);
          applyUploadHeaders(resolvedMime);
          const rangeHeader = req.headers.range;
          if (rangeHeader && buf.length > 0) {
            const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
            if (m) {
              const start = m[1] ? Math.min(Number(m[1]), buf.length - 1) : 0;
              const end = m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
              if (start <= end) {
                const chunk = buf.subarray(start, end + 1);
                res.status(206);
                res.setHeader("Content-Range", `bytes ${start}-${end}/${buf.length}`);
                res.setHeader("Content-Length", String(chunk.length));
                return res.send(chunk);
              }
            }
          }
          res.setHeader("Content-Length", String(buf.length));
          return res.send(buf);
        }
      }
    } catch {
    }
  }
  return res.status(404).json({ success: false, message: "File tidak ditemukan." });
};
app.get("/uploads/marketing-tools/:filename", async (req, res) => {
  return serveHostedUploadFile("marketing-tools", req, res);
});
app.get("/uploads/chat/:filename", async (req, res) => {
  return serveHostedUploadFile("chat", req, res);
});
app.use("/uploads", express.static(path3.join(os2.homedir(), ".ndtaxandlaw_storage", "uploads"), { maxAge: "7d" }));
app.use("/uploads", express.static(path3.join(__dirname, "public", "uploads"), { maxAge: "7d" }));
var formatFileSizeServer = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};
var compressBinaryBuffer = (buf, _ext) => {
  return buf;
};
var persistMarketingToolsToCloud = async () => {
  if (!db) return;
  try {
    await db.from("user_passwords").upsert([
      {
        email: "__sys_marketing_tools__@ndtaxlaw.internal",
        password: JSON.stringify(marketingTools)
      }
    ]);
  } catch (e) {
    console.warn("MySQL KV marketing_tools backup warning:", e);
  }
};
var saveBufferToHostingServer = (rawBuffer, originalName, extInput, bucket = "marketing-tools", originalBytesOverride, maxBytesOverride) => {
  const ext = extInput.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const originalBytes = originalBytesOverride || rawBuffer.length;
  const maxAllowedBytes = maxBytesOverride || MAX_CHAT_ATTACHMENT_BYTES;
  if (bucket === "chat") {
    if (rawBuffer.length > maxAllowedBytes) return null;
    if (!ALLOWED_CHAT_ATTACHMENT_EXTS.has(ext)) return null;
  }
  const optimizedBuffer = compressBinaryBuffer(rawBuffer, ext);
  const safeBaseName = String(originalName || (bucket === "chat" ? "chat-file" : "materi-marketing")).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || (bucket === "chat" ? "chat-file" : "materi-marketing");
  const fileName = `${Date.now()}-${safeBaseName}.${ext}`;
  const dirs = getUploadBucketDirs(bucket);
  const targetDirs = [dirs.homeDir, dirs.dataDir, dirs.publicDir];
  for (const targetDir of targetDirs) {
    const confinedTarget = resolveConfinedFilePath(targetDir, fileName);
    if (!confinedTarget) continue;
    try {
      atomicWriteFileSync(confinedTarget, optimizedBuffer);
    } catch {
    }
  }
  let cloudSyncPromise;
  if (db && optimizedBuffer.length <= 18 * 1024 * 1024) {
    const cloudKey = `${dirs.cloudKeyPrefix}${fileName.toLowerCase()}__@ndtaxlaw.internal`;
    const cloudPayload = JSON.stringify({
      fileName,
      bucket,
      mime: getMimeTypeFromExt(fileName),
      base64: optimizedBuffer.toString("base64"),
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    cloudSyncPromise = Promise.resolve(
      db.from("user_passwords").upsert([{ email: cloudKey, password: cloudPayload }])
    ).catch(() => {
    });
  }
  return {
    hostedUrl: `${dirs.urlPrefix}${fileName}`,
    fileName,
    savedBytes: optimizedBuffer.length,
    originalBytes,
    formattedSize: formatFileSizeServer(optimizedBuffer.length),
    cloudSyncPromise
  };
};
var saveDataUrlToHostingServer = (dataUrl, originalName, fallbackExt, bucket = "marketing-tools") => {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64Data = match[2];
  const rawBuffer = Buffer.from(base64Data, "base64");
  let ext = fallbackExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  if (mime.includes("pdf")) ext = "pdf";
  else if (mime.includes("svg")) ext = "svg";
  else if (mime.includes("webp")) ext = "webp";
  else if (mime.includes("gif")) ext = "gif";
  else if (mime.includes("png")) ext = "png";
  else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
  else if (mime.includes("video/webm")) ext = "webm";
  else if (mime.includes("video/quicktime")) ext = "mov";
  else if (mime.includes("video/3gpp")) ext = "3gp";
  else if (mime.includes("video/x-m4v")) ext = "m4v";
  else if (mime.includes("video/mp4") || mime.startsWith("video/")) ext = "mp4";
  else if (mime.includes("audio/mpeg") || mime.includes("audio/mp3")) ext = "mp3";
  else if (mime.includes("audio/wav") || mime.includes("audio/x-wav")) ext = "wav";
  else if (mime.includes("audio/mp4") || mime.includes("audio/x-m4a") || mime.includes("audio/m4a")) ext = "m4a";
  else if (mime.includes("audio/ogg")) ext = "ogg";
  else if (mime.includes("audio/aac")) ext = "aac";
  else if (mime.includes("audio/opus")) ext = "opus";
  else if (mime.startsWith("audio/")) ext = ["mp3", "wav", "m4a", "ogg", "aac", "opus"].includes(ext) ? ext : "mp3";
  else if (mime.includes("mp4")) ext = "mp4";
  else if (mime.includes("spreadsheetml")) ext = "xlsx";
  else if (mime.includes("ms-excel") || mime.includes("excel")) ext = ext === "xlsx" ? "xlsx" : "xls";
  else if (mime.includes("wordprocessingml")) ext = "docx";
  else if (mime.includes("msword")) ext = "doc";
  else if (mime.includes("presentationml")) ext = "pptx";
  else if (mime.includes("ms-powerpoint") || mime.includes("powerpoint")) ext = ext === "pptx" ? "pptx" : "ppt";
  else if (mime.includes("opendocument.text")) ext = "odt";
  else if (mime.includes("opendocument.spreadsheet")) ext = "ods";
  else if (mime.includes("opendocument.presentation")) ext = "odp";
  else if (mime.includes("rtf")) ext = "rtf";
  else if (mime.includes("x-7z")) ext = "7z";
  else if (mime.includes("rar")) ext = "rar";
  else if (mime.includes("zip")) ext = "zip";
  else if (mime.includes("csv")) ext = "csv";
  else if (mime.includes("text/plain")) ext = "txt";
  return saveBufferToHostingServer(rawBuffer, originalName, ext, bucket);
};
app.post("/api/marketing-tools/upload", async (req, res) => {
  try {
    const { dataUrl, fileName, fileType, originalByteSize } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res.status(400).json({ success: false, message: "Data file tidak valid." });
    }
    const saved = saveDataUrlToHostingServer(dataUrl, fileName || "materi", fileType || "pdf", "marketing-tools");
    if (!saved) {
      return res.status(400).json({ success: false, message: "Gagal memproses format file." });
    }
    if (saved.cloudSyncPromise) {
      await saved.cloudSyncPromise;
    }
    const origBytes = Number(originalByteSize) > 0 ? Number(originalByteSize) : saved.originalBytes;
    return res.json({
      success: true,
      data: {
        hostedUrl: saved.hostedUrl,
        savedBytes: saved.savedBytes,
        originalBytes: origBytes,
        formattedSize: saved.formattedSize,
        originalFormattedSize: formatFileSizeServer(origBytes)
      }
    });
  } catch (err) {
    console.error("Upload marketing tool file error:", err);
    return res.status(500).json({ success: false, message: "Gagal menyimpan file ke server hosting." });
  }
});
app.get("/api/marketing-tools", async (req, res) => {
  if (db) {
    try {
      const [{ data: tableData, error: tableErr }, { data: kvData }] = await Promise.all([
        db.from("marketing_tools").select("*"),
        db.from("user_passwords").select("password").eq("email", "__sys_marketing_tools__@ndtaxlaw.internal").maybeSingle()
      ]);
      let kvTools = [];
      const hasKvSnapshot = Boolean(kvData?.password);
      if (kvData?.password) {
        try {
          const parsed = JSON.parse(kvData.password);
          if (Array.isArray(parsed)) kvTools = parsed;
        } catch {
        }
      }
      if (!tableErr || hasKvSnapshot) {
        const merged = /* @__PURE__ */ new Map();
        for (const t of [...Array.isArray(tableData) ? tableData : [], ...kvTools]) {
          if (t && t.id && !merged.has(t.id)) {
            merged.set(t.id, t);
          }
        }
        marketingTools = Array.from(merged.values());
        saveDatabase();
        return res.json({ success: true, data: marketingTools });
      }
    } catch (e) {
      console.warn("MySQL tools error", e);
    }
  }
  if (isProductionMode() && !db) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
  }
  res.json({ success: true, data: marketingTools });
});
app.post("/api/marketing-tools", async (req, res) => {
  const { title, category, fileType, fileSize, downloadUrl, thumbnailUrl, description, targetProduct, duration } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, message: "Judul dan Kategori wajib diisi" });
  }
  let finalDownloadUrl = downloadUrl || "#file-download";
  let finalFileSize = fileSize || "3.5 MB";
  let finalThumbnailUrl = thumbnailUrl || (fileType === "png" || fileType === "jpg" ? finalDownloadUrl : "");
  if (typeof finalDownloadUrl === "string" && finalDownloadUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(finalDownloadUrl, title, fileType || "pdf", "marketing-tools");
    if (saved) {
      if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
      finalDownloadUrl = saved.hostedUrl;
      finalFileSize = saved.formattedSize;
      if (fileType === "png" || fileType === "jpg") {
        finalThumbnailUrl = saved.hostedUrl;
      }
    }
  }
  if (typeof finalThumbnailUrl === "string" && finalThumbnailUrl.startsWith("data:")) {
    const savedThumb = saveDataUrlToHostingServer(finalThumbnailUrl, `${title}-thumb`, "jpg", "marketing-tools");
    if (savedThumb) {
      if (savedThumb.cloudSyncPromise) await savedThumb.cloudSyncPromise;
      finalThumbnailUrl = savedThumb.hostedUrl;
    }
  }
  const newTool = {
    id: `tool-${Date.now()}`,
    title,
    category,
    fileType: fileType || "pdf",
    fileSize: finalFileSize,
    downloadUrl: finalDownloadUrl,
    thumbnailUrl: finalThumbnailUrl,
    description: description || "Materi pendukung pemasaran resmi NDTAXANDLAW.",
    targetProduct: targetProduct || "Layanan Konsultasi Pajak & Hukum",
    ...duration ? { duration } : {},
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
    description: `Admin mengunggah materi marketing baru: "${title}" (${category}) [${finalFileSize}].`
  });
  if (db) {
    try {
      const { error: insErr } = await db.from("marketing_tools").upsert([newTool]);
      if (insErr) {
        console.warn("MySQL marketing_tools table insert warning (using KV backup):", insErr.message);
      }
    } catch (e) {
      console.warn("MySQL insert tool error", e);
    }
    await persistMarketingToolsToCloud();
  }
  const notif = {
    id: `notif-sys-${Date.now()}`,
    title: "Tools Marketing Baru Ditambahkan",
    message: `Admin telah menambahkan materi baru: "${title}" (${category}).`,
    type: "system_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "admin_only"
  };
  notifications.unshift(notif);
  if (db) {
    try {
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL insert notif error", e);
    }
  }
  saveDatabase();
  res.status(201).json({ success: true, data: newTool });
});
app.put("/api/marketing-tools/:id", async (req, res) => {
  const { id } = req.params;
  const idx = marketingTools.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Materi marketing tidak ditemukan." });
  }
  const existing = marketingTools[idx];
  const prevDownloadUrl = existing.downloadUrl;
  const prevThumbnailUrl = existing.thumbnailUrl;
  const {
    title,
    category,
    fileType,
    fileSize,
    downloadUrl,
    thumbnailUrl,
    description,
    targetProduct,
    duration
  } = req.body;
  if (!title || !category) {
    return res.status(400).json({ success: false, message: "Judul dan Kategori wajib diisi." });
  }
  const nextFileType = fileType || existing.fileType || "pdf";
  let finalDownloadUrl = downloadUrl || existing.downloadUrl || "#file-download";
  let finalFileSize = fileSize || existing.fileSize || "3.5 MB";
  let finalThumbnailUrl = thumbnailUrl !== void 0 ? thumbnailUrl : nextFileType === "png" || nextFileType === "jpg" ? finalDownloadUrl : existing.thumbnailUrl || "";
  if (typeof finalDownloadUrl === "string" && finalDownloadUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(finalDownloadUrl, title, nextFileType, "marketing-tools");
    if (saved) {
      if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
      finalDownloadUrl = saved.hostedUrl;
      finalFileSize = saved.formattedSize;
      if (nextFileType === "png" || nextFileType === "jpg") {
        finalThumbnailUrl = saved.hostedUrl;
      }
    }
  }
  if (typeof finalThumbnailUrl === "string" && finalThumbnailUrl.startsWith("data:")) {
    const savedThumb = saveDataUrlToHostingServer(finalThumbnailUrl, `${title}-thumb`, "jpg", "marketing-tools");
    if (savedThumb) {
      if (savedThumb.cloudSyncPromise) await savedThumb.cloudSyncPromise;
      finalThumbnailUrl = savedThumb.hostedUrl;
    }
  }
  const updatedTool = {
    ...existing,
    title: String(title).trim(),
    category,
    fileType: nextFileType,
    fileSize: finalFileSize,
    downloadUrl: finalDownloadUrl,
    thumbnailUrl: nextFileType === "png" || nextFileType === "jpg" ? finalThumbnailUrl || finalDownloadUrl : "",
    description: description !== void 0 ? String(description).trim() || "Materi pendukung pemasaran resmi NDTAXANDLAW." : existing.description,
    targetProduct: targetProduct !== void 0 ? String(targetProduct).trim() || "Layanan Konsultasi NDTAXANDLAW" : existing.targetProduct,
    duration: nextFileType === "mp4" ? duration || existing.duration || "03:30 min" : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  marketingTools[idx] = updatedTool;
  const newUrls = new Set([updatedTool.downloadUrl, updatedTool.thumbnailUrl].filter(Boolean));
  for (const oldUrl of Array.from(new Set([prevDownloadUrl, prevThumbnailUrl].filter(Boolean)))) {
    if (oldUrl && !newUrls.has(oldUrl)) {
      await deleteHostedUploadFile(oldUrl);
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_update",
    operation: "UPDATE",
    targetEntity: "Tools Marketing",
    description: `Admin memperbarui materi marketing: "${updatedTool.title}" (${updatedTool.category}) [${updatedTool.fileSize}].`
  });
  if (db) {
    try {
      const { error: upErr } = await db.from("marketing_tools").upsert([updatedTool]);
      if (upErr) {
        console.warn("MySQL marketing_tools table update warning (using KV backup):", upErr.message);
      }
    } catch (e) {
      console.warn("MySQL update tool error", e);
    }
    await persistMarketingToolsToCloud();
  }
  saveDatabase();
  res.json({ success: true, data: updatedTool });
});
app.delete("/api/marketing-tools/:id", async (req, res) => {
  const { id } = req.params;
  const target = marketingTools.find((t) => t.id === id);
  marketingTools = marketingTools.filter((t) => t.id !== id);
  if (target) {
    for (const oldUrl of Array.from(new Set([target.downloadUrl, target.thumbnailUrl].filter(Boolean)))) {
      await deleteHostedUploadFile(oldUrl);
    }
  }
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
  if (db) {
    try {
      await db.from("marketing_tools").delete().eq("id", id);
    } catch (e) {
      console.warn("MySQL delete tool error", e);
    }
    await persistMarketingToolsToCloud();
  }
  saveDatabase();
  res.json({ success: true, message: "Materi berhasil dihapus" });
});
var persistProposalTemplatesToCloud = async () => {
  if (!db) return;
  try {
    await db.from("user_passwords").upsert([
      {
        email: "__sys_proposal_templates__@ndtaxlaw.internal",
        password: JSON.stringify(proposalTemplates)
      }
    ]);
  } catch (e) {
    console.warn("MySQL KV proposal_templates backup warning:", e);
  }
};
var loadLocalOrHostedFileBuffer = async (rawUrl) => {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    if (!match) return null;
    try {
      return Buffer.from(match[2], "base64");
    } catch {
      return null;
    }
  }
  let pathOnly = trimmed.split("?")[0].split("#")[0];
  if (pathOnly.startsWith("http://") || pathOnly.startsWith("https://")) {
    try {
      const parsedUrl = new URL(pathOnly);
      if (!parsedUrl.pathname.startsWith("/uploads/") && !parsedUrl.pathname.startsWith("/proposals/") && !parsedUrl.pathname.startsWith("/assets/")) {
        return null;
      }
      pathOnly = parsedUrl.pathname;
    } catch {
      return null;
    }
  }
  if (pathOnly.startsWith("/proposals/")) {
    const fileName = path3.basename(decodeURIComponent(pathOnly.slice("/proposals/".length)));
    const confined = resolveConfinedFilePath(PUBLIC_PROPOSALS_DIR, fileName);
    if (confined && fs3.existsSync(confined) && fs3.statSync(confined).isFile()) {
      return fs3.readFileSync(confined);
    }
    return null;
  }
  const parsedUpload = parseHostedUploadUrl(pathOnly);
  if (parsedUpload) {
    const dirs = getUploadBucketDirs(parsedUpload.bucket);
    for (const dir of [dirs.homeDir, dirs.dataDir, dirs.publicDir, dirs.legacyDistDir]) {
      const confined = resolveConfinedFilePath(dir, parsedUpload.fileName);
      if (confined && fs3.existsSync(confined) && fs3.statSync(confined).isFile()) {
        return fs3.readFileSync(confined);
      }
    }
    if (db) {
      try {
        const lowerName = parsedUpload.fileName.toLowerCase();
        const cloudKey = `${dirs.cloudKeyPrefix}${lowerName}__@ndtaxlaw.internal`;
        const { data: rows } = await db.from("user_passwords").select("password").eq("email", cloudKey).limit(1);
        if (Array.isArray(rows) && rows[0]?.password) {
          const parsedCloud = JSON.parse(rows[0].password);
          if (parsedCloud?.base64) {
            return Buffer.from(parsedCloud.base64, "base64");
          }
        }
      } catch {
      }
    }
    return null;
  }
  if (pathOnly.startsWith("/assets/")) {
    const publicAssetsRoot = path3.resolve(__dirname, "public", "assets");
    const relSub = decodeURIComponent(pathOnly.slice("/assets/".length)).replace(/^\/+/, "");
    const resolved = path3.resolve(publicAssetsRoot, relSub);
    if (resolved.startsWith(publicAssetsRoot + path3.sep) && fs3.existsSync(resolved) && fs3.statSync(resolved).isFile()) {
      return fs3.readFileSync(resolved);
    }
  }
  return null;
};
app.get("/api/proposal-templates", async (req, res) => {
  if (db) {
    try {
      const { data: kvData } = await db.from("user_passwords").select("password").eq("email", "__sys_proposal_templates__@ndtaxlaw.internal").limit(1);
      if (Array.isArray(kvData) && kvData[0]?.password) {
        const parsed = JSON.parse(kvData[0].password);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeProposalTemplates(parsed);
          proposalTemplates = normalized.list;
          if (normalized.changed) {
            await persistProposalTemplatesToCloud();
            saveDatabase();
          }
        }
      }
    } catch {
    }
  }
  res.json({ success: true, data: proposalTemplates });
});
app.post("/api/proposal-templates/upload", async (req, res) => {
  try {
    const { dataUrl, fileName } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res.status(400).json({ success: false, message: "Data file PDF tidak valid." });
    }
    const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      return res.status(400).json({ success: false, message: "Format unggahan PDF tidak dikenali." });
    }
    const rawBuffer = Buffer.from(match[2], "base64");
    const MAX_PROPOSAL_PDF_BYTES = 35 * 1024 * 1024;
    if (rawBuffer.length === 0 || rawBuffer.length > MAX_PROPOSAL_PDF_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Ukuran file PDF maksimal 35 MB dan tidak boleh kosong."
      });
    }
    if (rawBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({
        success: false,
        message: "File yang diunggah bukan dokumen PDF yang valid."
      });
    }
    const pageCount = await getPdfPageCount(rawBuffer);
    if (pageCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Dokumen PDF tidak dapat dibaca atau rusak. Silakan periksa kembali file Anda."
      });
    }
    const cleanDisplayName = String(fileName || "Surat-Penawaran.pdf").replace(/[^\w\s().-]/g, "").trim().slice(0, 140) || "Surat-Penawaran.pdf";
    const saved = saveBufferToHostingServer(
      rawBuffer,
      cleanDisplayName,
      "pdf",
      "marketing-tools",
      rawBuffer.length,
      MAX_PROPOSAL_PDF_BYTES
    );
    if (!saved) {
      return res.status(400).json({ success: false, message: "Gagal menyimpan file PDF ke server." });
    }
    if (saved.cloudSyncPromise) {
      await saved.cloudSyncPromise;
    }
    const versionInfo = {
      url: saved.hostedUrl,
      fileName: cleanDisplayName.toLowerCase().endsWith(".pdf") ? cleanDisplayName : `${cleanDisplayName}.pdf`,
      fileSize: saved.formattedSize,
      pageCount,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    };
    return res.json({ success: true, data: versionInfo });
  } catch (err) {
    console.error("Upload proposal PDF error:", err);
    return res.status(500).json({ success: false, message: "Gagal memproses unggahan PDF surat penawaran." });
  }
});
app.post("/api/proposal-templates", async (req, res) => {
  const { title, description, targetProduct, stampMode, pdfId, pdfEn } = req.body || {};
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) {
    return res.status(400).json({ success: false, message: "Judul surat penawaran wajib diisi." });
  }
  if (!pdfId?.url && !pdfEn?.url) {
    return res.status(400).json({
      success: false,
      message: "Unggah minimal satu versi PDF (Bahasa Indonesia atau Bahasa Inggris)."
    });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const validStampMode = stampMode === "first_only" || stampMode === "all_pages" ? stampMode : "first_and_last";
  const newProposal = {
    id: `prop-${Date.now()}`,
    title: cleanTitle.slice(0, 180),
    description: String(description || "").trim().slice(0, 600),
    targetProduct: String(targetProduct || "Layanan ND Tax & Law").trim().slice(0, 140),
    stampMode: validStampMode,
    pdfId: pdfId?.url ? pdfId : void 0,
    pdfEn: pdfEn?.url ? pdfEn : void 0,
    createdAt: todayStr,
    updatedAt: todayStr
  };
  proposalTemplates.unshift(newProposal);
  await persistProposalTemplatesToCloud();
  saveDatabase();
  const langLabel = newProposal.pdfEn && !newProposal.pdfId ? "English" : "Bahasa Indonesia";
  const notif = {
    id: `notif-prop-${Date.now()}`,
    title: "Surat Penawaran Baru Tersedia",
    message: `Admin telah mengunggah Surat Penawaran baru (${langLabel}): "${newProposal.title}". Mitra dapat langsung mengunduh dengan identitas Mitra otomatis.`,
    type: "tools_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra"
  };
  notifications.unshift(notif);
  if (db) {
    try {
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch {
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_create",
    operation: "CREATE",
    targetEntity: "Surat Penawaran PDF",
    description: `Admin menambahkan Surat Penawaran dinamis: "${newProposal.title}".`
  });
  res.status(201).json({ success: true, data: newProposal });
});
app.put("/api/proposal-templates/:id", async (req, res) => {
  const { id } = req.params;
  const idx = proposalTemplates.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Surat penawaran tidak ditemukan." });
  }
  const existing = proposalTemplates[idx];
  const { title, description, targetProduct, stampMode, pdfId, pdfEn } = req.body || {};
  const oldUrls = [existing.pdfId?.url, existing.pdfEn?.url].filter(Boolean);
  const updated = {
    ...existing,
    title: typeof title === "string" && title.trim() ? title.trim().slice(0, 180) : existing.title,
    description: typeof description === "string" ? description.trim().slice(0, 600) : existing.description,
    targetProduct: typeof targetProduct === "string" && targetProduct.trim() ? targetProduct.trim().slice(0, 140) : existing.targetProduct,
    stampMode: stampMode === "first_only" || stampMode === "all_pages" || stampMode === "first_and_last" ? stampMode : existing.stampMode,
    pdfId: pdfId === null ? void 0 : pdfId?.url ? pdfId : existing.pdfId,
    pdfEn: pdfEn === null ? void 0 : pdfEn?.url ? pdfEn : existing.pdfEn,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  proposalTemplates[idx] = updated;
  await persistProposalTemplatesToCloud();
  saveDatabase();
  for (const oldUrl of oldUrls) {
    if (oldUrl !== updated.pdfId?.url && oldUrl !== updated.pdfEn?.url) {
      await deleteHostedUploadFile(oldUrl);
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_update",
    operation: "UPDATE",
    targetEntity: "Surat Penawaran PDF",
    description: `Admin memperbarui Surat Penawaran dinamis: "${updated.title}".`
  });
  res.json({ success: true, data: updated });
});
app.delete("/api/proposal-templates/:id", async (req, res) => {
  const { id } = req.params;
  const target = proposalTemplates.find((p) => p.id === id);
  if (!target) {
    return res.status(404).json({ success: false, message: "Surat penawaran tidak ditemukan." });
  }
  proposalTemplates = proposalTemplates.filter((p) => p.id !== id);
  await persistProposalTemplatesToCloud();
  saveDatabase();
  for (const oldUrl of [target.pdfId?.url, target.pdfEn?.url].filter(Boolean)) {
    await deleteHostedUploadFile(oldUrl);
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "tool_delete",
    operation: "DELETE",
    targetEntity: "Surat Penawaran PDF",
    description: `Admin menghapus Surat Penawaran dinamis: "${target.title}".`
  });
  res.json({ success: true, message: "Surat penawaran berhasil dihapus." });
});
app.get("/api/proposal-templates/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const langParam = String(req.query.lang || "id").toLowerCase() === "en" ? "en" : "id";
    const mitraIdParam = String(req.query.mitraId || "").trim();
    const isInline = String(req.query.inline || "") === "1";
    const template = proposalTemplates.find((p) => p.id === id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Surat penawaran tidak ditemukan." });
    }
    const version = langParam === "en" ? template.pdfEn : template.pdfId;
    if (!version || !version.url) {
      return res.status(404).json({
        success: false,
        message: langParam === "en" ? "Versi Bahasa Inggris belum diunggah untuk surat penawaran ini." : "Versi Bahasa Indonesia belum diunggah untuk surat penawaran ini."
      });
    }
    const pdfBuffer = await loadLocalOrHostedFileBuffer(version.url);
    if (!pdfBuffer) {
      return res.status(404).json({
        success: false,
        message: "File PDF surat penawaran tidak ditemukan di server."
      });
    }
    let outputBytes = pdfBuffer;
    let mitraNameSlug = "";
    if (mitraIdParam) {
      let targetMitra = mitras.find((m) => m.id === mitraIdParam);
      if (!targetMitra && db) {
        try {
          const { data: dbMitras } = await db.from("mitras").select("*");
          if (Array.isArray(dbMitras)) {
            mitras = normalizeMitraAvatars(dbMitras);
            targetMitra = mitras.find((m) => m.id === mitraIdParam);
          }
        } catch {
        }
      }
      if (targetMitra) {
        if (String(req.query.enforceComplete || "") === "1" && (targetMitra.status !== "verified" || isMitraDataIncomplete(targetMitra, appSettings))) {
          const missing = getMissingMitraFields(targetMitra, appSettings);
          return res.status(403).json({
            success: false,
            message: missing.length > 0 ? `Mohon lengkapi data wajib berikut sebelum mengunduh surat penawaran: ${missing.join(", ")}.` : "Akun Mitra Anda belum terverifikasi atau data diri belum lengkap."
          });
        }
        let avatarBuffer = null;
        const avatarCandidate = (targetMitra.avatarUrl || "").trim();
        if (avatarCandidate && !avatarCandidate.startsWith("data:image/svg") && !avatarCandidate.toLowerCase().endsWith(".svg")) {
          avatarBuffer = await loadLocalOrHostedFileBuffer(avatarCandidate);
        }
        outputBytes = await stampMitraPartnerCardOnPdf(
          pdfBuffer,
          {
            fullName: targetMitra.fullName || "Mitra ND Tax & Law",
            email: targetMitra.email || "",
            phone: targetMitra.phone || "",
            avatarBuffer
          },
          {
            lang: langParam,
            stampMode: template.stampMode || "first_and_last",
            ffmpegBin: typeof ffmpegStatic === "string" ? ffmpegStatic : null
          }
        );
        mitraNameSlug = targetMitra.fullName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
      }
    }
    const baseSafeTitle = (template.title || "Surat_Penawaran_ND_Tax_And_Law").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 65);
    const langTag = langParam === "en" ? "EN" : "ID";
    const downloadFileName = mitraNameSlug ? `${baseSafeTitle}_${langTag}_${mitraNameSlug}.pdf` : `${baseSafeTitle}_${langTag}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader(
      "Content-Disposition",
      `${isInline ? "inline" : "attachment"}; filename="${downloadFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`
    );
    return res.send(Buffer.from(outputBytes));
  } catch (err) {
    console.error("Download dynamic proposal PDF error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses dokumen surat penawaran PDF."
    });
  }
});
app.get("/api/commissions", async (req, res) => {
  const { mitraId } = req.query;
  if (db) {
    try {
      const { data, error } = await db.from("commissions").select("*");
      if (!error && Array.isArray(data)) {
        commissions = data;
        saveDatabase();
        if (mitraId) {
          return res.json({ success: true, data: commissions.filter((c) => c.mitraId === mitraId) });
        }
        return res.json({ success: true, data: commissions });
      }
    } catch (e) {
      console.warn("MySQL commissions query error", e);
    }
  }
  if (isProductionMode() && !db) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
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
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: "Pengajuan Penarikan Komisi",
    message: `Pengajuan pencairan komisi sebesar Rp ${nominalAmount.toLocaleString("id-ID")} oleh ${mitra.fullName} ke ${mitra.bankDetails.bankName} (${mitra.bankDetails.accountNumber}) sedang diproses finance.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: mitra.id
  };
  notifications.unshift(notif);
  if (db) {
    try {
      await db.from("payout_requests").insert([newPayout]);
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL insert payout error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, message: "Pengajuan pencairan berhasil dikirim", data: newPayout });
});
app.get("/api/services", async (req, res) => {
  const { all } = req.query;
  if (db) {
    try {
      const { data, error } = await db.from("services").select("*");
      if (!error && Array.isArray(data)) {
        const normSrv = normalizeServicesCatalog(data);
        services = normSrv.list;
        if (normSrv.migrated) {
          await db.from("services").delete().in("id", Array.from(LEGACY_SEEDED_SERVICE_IDS));
          await db.from("services").upsert(services);
        }
        saveDatabase();
      }
    } catch (e) {
      console.warn("MySQL services query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
  } else {
    services = normalizeServicesCatalog(services).list;
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
  const resolvedPricingType = resolveServicePricingType({
    name,
    pricingType: pricingType === "monthly_subscription" ? "monthly_subscription" : pricingType === "annual_subscription" ? "annual_subscription" : "case_by_case"
  });
  const newService = {
    id: `srv-${Date.now()}`,
    name,
    category: category || "Laporan Keuangan",
    defaultPrice: Number(defaultPrice) || 5e6,
    pricingType: resolvedPricingType,
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
    id: `notif-sys-${Date.now()}`,
    title: "Katalog Layanan Diperbarui",
    message: `Admin menambahkan layanan baru: "${name}" (${newService.pricingType === "monthly_subscription" ? "Langganan Bulanan" : "Case by Case"}).`,
    type: "system_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "admin_only"
  };
  notifications.unshift(notif);
  saveDatabase();
  if (db) {
    try {
      await db.from("services").insert([newService]);
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL insert service error", e);
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
  service.pricingType = resolveServicePricingType(service);
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
  if (db) {
    try {
      await db.from("services").upsert([service]);
    } catch (e) {
      console.warn("MySQL upsert service error", e);
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
  if (db) {
    try {
      await db.from("services").delete().eq("id", id);
    } catch (e) {
      console.warn("MySQL delete service error", e);
    }
  }
  res.json({ success: true, message: "Layanan berhasil dihapus" });
});
app.get("/api/clients", async (req, res) => {
  const { mitraId, referralCode } = req.query;
  if (db) {
    try {
      const { data, error } = await db.from("client_deals").select("*");
      if (!error && Array.isArray(data)) {
        clientDeals = data.map((row) => fromDbClientDeal(row));
        saveDatabase();
      }
    } catch (e) {
      console.warn("MySQL client_deals query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
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
  if (db) {
    try {
      const { data: supaSettings } = await db.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
      if (supaSettings?.settings) {
        appSettings = { ...appSettings, ...supaSettings.settings };
      }
    } catch {
    }
    try {
      const { data: supaMitras } = await db.from("mitras").select("*");
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
  const selectedPricingType = service ? resolveServicePricingType(service) : pricingType || "case_by_case";
  const nominalValue = Number(dealValue) || (service ? service.defaultPrice : 1e7);
  const perClientComm = calculateClientDealCommission(
    selectedPricingType,
    nominalValue,
    appSettings.commissionScheme
  );
  const commissionCalc = perClientComm.initialAmount;
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
    appliedCommissionRate: perClientComm.initialRate,
    lockedRecurringRate: perClientComm.recurringRate,
    recurringCommissionAmount: perClientComm.recurringAmount,
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
    description: `${newDeal.submittedBy === "client_self" ? `Klien "${companyName}" mendaftar mandiri` : `Mitra "${newDeal.mitraName}" menginput klien baru "${companyName}"`} untuk layanan "${newDeal.serviceName}" senilai Rp ${nominalValue.toLocaleString("id-ID")} (${perClientComm.tierLabel}, Ref: ${newDeal.referralCode}). Status: Sedang Ditinjau Admin (Komisi Rp 0 sebelum di-approve).`
  });
  const notif = {
    id: `notif-mtr-${newDeal.mitraId}-${Date.now()}`,
    title: "Klien Baru Sedang Ditinjau Admin",
    message: `${newDeal.companyName} terdaftar melalui Mitra ${newDeal.mitraName} (${newDeal.referralCode} \u2022 ${perClientComm.tierLabel}). Menunggu validasi & approve deal dari Admin agar komisi masuk ke saldo Mitra.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: newDeal.mitraId
  };
  notifications.unshift(notif);
  saveDatabase();
  if (db) {
    try {
      await db.from("client_deals").insert([toDbClientDeal(newDeal)]);
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL client deal insert error", e);
    }
  }
  res.status(201).json({ success: true, data: newDeal });
});
app.put("/api/clients/:id/acc", async (req, res) => {
  const { id } = req.params;
  const {
    subscriptionStartDate,
    billingDayOfMonth,
    dealValue,
    notes,
    customCommissionRate,
    customRecurringRate
  } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Deal klien tidak ditemukan" });
  }
  if (deal.status !== "pending_acc") {
    return res.status(400).json({ success: false, message: "Klien ini sudah direview/divalidasi sebelumnya." });
  }
  if (dealValue !== void 0 && Number(dealValue) > 0) {
    deal.dealValue = Number(dealValue);
  }
  const tierCalc = calculateClientDealCommission(
    deal.pricingType,
    deal.dealValue,
    appSettings.commissionScheme
  );
  const finalInitialRate = customCommissionRate !== void 0 && Number(customCommissionRate) >= 0 ? Number(customCommissionRate) : tierCalc.initialRate;
  const finalRecurringRate = deal.pricingType === "case_by_case" ? 0 : customRecurringRate !== void 0 && Number(customRecurringRate) >= 0 ? Number(customRecurringRate) : tierCalc.recurringRate;
  deal.appliedCommissionRate = finalInitialRate;
  deal.commissionAmount = Math.round(deal.dealValue * finalInitialRate / 100);
  deal.lockedRecurringRate = finalRecurringRate;
  deal.recurringCommissionAmount = deal.pricingType === "case_by_case" ? 0 : Math.round(deal.dealValue * finalRecurringRate / 100);
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
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: "Deal Klien Di-Approve Admin (Komisi Masuk)",
    message: `Admin telah meng-approve deal klien "${deal.companyName}". Komisi ${deal.pricingType === "annual_subscription" ? "Tahun Ke-1" : deal.pricingType === "monthly_subscription" ? "Bulan Ke-1" : "1x Bayar (Case-by-Case)"} sebesar Rp ${deal.commissionAmount.toLocaleString("id-ID")} telah masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: deal.mitraId
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
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
      await db.from("commissions").insert([newCommTrx]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      if (mitra) {
        await db.from("mitras").update({
          referredClientsCount: mitra.referredClientsCount,
          activeSubscribersCount: mitra.activeSubscribersCount,
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout
        }).eq("id", deal.mitraId);
      }
    } catch (e) {
      console.warn("MySQL client ACC update error", e);
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
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: "Hasil Review Klien: Tidak Deal / Ditolak",
    message: `Pengajuan klien "${deal.companyName}" (Mitra: ${deal.mitraName}) dinyatakan Tidak Deal oleh Admin (${deal.rejectionReason}). Komisi untuk pengajuan ini adalah Rp 0.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: deal.mitraId
  };
  notifications.unshift(notif);
  saveDatabase();
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL reject client error", e);
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
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
    } catch (e) {
      console.warn("MySQL trigger-billing-due error", e);
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
  const lockedRecurringRate = deal.lockedRecurringRate ?? 10;
  const recurringCommission = deal.recurringCommissionAmount && deal.recurringCommissionAmount > 0 ? deal.recurringCommissionAmount : Math.round(deal.dealValue * lockedRecurringRate / 100);
  deal.lockedRecurringRate = lockedRecurringRate;
  deal.recurringCommissionAmount = recurringCommission;
  const mitra = mitras.find((m) => m.id === deal.mitraId);
  if (mitra) {
    mitra.totalCommission = (mitra.totalCommission || 0) + recurringCommission;
    mitra.pendingPayout = (mitra.pendingPayout || 0) + recurringCommission;
  }
  const newCommTrx = {
    id: `trx-${Date.now()}`,
    mitraId: deal.mitraId,
    mitraName: deal.mitraName,
    serviceName: `${deal.serviceName} (${cycleLabel} - Komisi Berulang ${lockedRecurringRate}%)`,
    clientName: deal.companyName,
    dealValue: deal.dealValue,
    commissionAmount: recurringCommission,
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
    description: `Admin meng-approve pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}". Komisi berulang ${lockedRecurringRate}% sebesar Rp ${recurringCommission.toLocaleString("id-ID")} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}. Tagihan berikutnya: ${deal.nextBillingDate}.`
  });
  const notif = {
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: `Komisi Langganan Masuk (Approve ${cycleLabel} - ${lockedRecurringRate}%)`,
    message: `Pembayaran langganan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve Admin. Komisi berulang (${lockedRecurringRate}%) sebesar Rp ${recurringCommission.toLocaleString("id-ID")} otomatis masuk ke saldo siap cair Mitra ${deal.mitraName}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: deal.mitraId
  };
  notifications.unshift(notif);
  if (mitra && mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Komisi Langganan Masuk (${cycleLabel} - ${lockedRecurringRate}%): ${deal.companyName} - Rp ${recurringCommission.toLocaleString("id-ID")}`,
      category: "recurring_invoice",
      previewSnippet: `Pembayaran perpanjangan ${cycleLabel} untuk klien "${deal.companyName}" telah di-approve oleh Admin.

Komisi berulang Anda (${lockedRecurringRate}% sesuai kesepakatan deal) sebesar Rp ${recurringCommission.toLocaleString("id-ID")} telah ditambahkan ke dompet saldo siap cair Anda.`
    });
  }
  saveDatabase();
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
      await db.from("commissions").insert([newCommTrx]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      if (mitra) {
        await db.from("mitras").update({
          totalCommission: mitra.totalCommission,
          pendingPayout: mitra.pendingPayout
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("MySQL bill-cycle error", e);
    }
  }
  res.json({ success: true, data: deal, commissionTransaction: newCommTrx });
});
app.put("/api/admin/commission-scheme", async (req, res) => {
  const { commissionScheme, bonusTargetConfig, payoutSchedule, payoutScheduleNote } = req.body || {};
  if (commissionScheme && typeof commissionScheme === "object") {
    appSettings.commissionScheme = {
      ...DEFAULT_COMMISSION_SCHEME,
      ...appSettings.commissionScheme || {},
      ...commissionScheme,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (bonusTargetConfig && typeof bonusTargetConfig === "object") {
    appSettings.bonusTargetConfig = {
      ...DEFAULT_BONUS_TARGET_CONFIG,
      ...appSettings.bonusTargetConfig || {},
      ...bonusTargetConfig,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (payoutSchedule === "awal_bulan" || payoutSchedule === "pertengahan_bulan" || payoutSchedule === "akhir_bulan") {
    appSettings.payoutSchedule = payoutSchedule;
  }
  if (typeof payoutScheduleNote === "string") {
    appSettings.payoutScheduleNote = payoutScheduleNote;
  }
  for (const deal of clientDeals) {
    if (deal.status === "pending_acc") {
      const calc = calculateClientDealCommission(
        deal.pricingType,
        deal.dealValue,
        appSettings.commissionScheme
      );
      deal.appliedCommissionRate = calc.initialRate;
      deal.commissionAmount = calc.initialAmount;
      deal.lockedRecurringRate = calc.recurringRate;
      deal.recurringCommissionAmount = calc.recurringAmount;
    }
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "commission_scheme_update",
    operation: "UPDATE",
    targetEntity: "Manajemen Skema Komisi & Target Bonus Mitra",
    description: `Admin memperbarui skema komisi per klien (Langganan: ${appSettings.commissionScheme?.subLowRate}%/${appSettings.commissionScheme?.subMidRate}%/${appSettings.commissionScheme?.subHighRate}% + Berulang ${appSettings.commissionScheme?.subRecurringRate}%, Case-by-Case: ${appSettings.commissionScheme?.caseLowRate}%/${appSettings.commissionScheme?.caseMidRate}%/${appSettings.commissionScheme?.caseHighRate}%) serta Target Bonus (${appSettings.bonusTargetConfig?.periodType === "yearly" ? "Tahunan" : "Bulanan"}). Klien yang sudah aktif langganan tetap menggunakan tarif komisi saat waktu deal.`
  });
  saveDatabase();
  await persistSettingsToMysql();
  res.json({
    success: true,
    message: "Skema komisi per klien dan pengaturan target bonus berhasil disimpan. Klien yang sudah berstatus langganan aktif tetap memperoleh komisi sesuai kesepakatan waktu deal.",
    data: {
      commissionScheme: appSettings.commissionScheme,
      bonusTargetConfig: appSettings.bonusTargetConfig
    }
  });
});
app.put("/api/admin/clients/:id/commission", async (req, res) => {
  const { id } = req.params;
  const { appliedCommissionRate, lockedRecurringRate, dealValue } = req.body || {};
  const deal = clientDeals.find((d) => d.id === id);
  if (!deal) {
    return res.status(404).json({ success: false, message: "Data klien tidak ditemukan." });
  }
  if (dealValue !== void 0 && Number(dealValue) > 0) {
    deal.dealValue = Number(dealValue);
  }
  if (appliedCommissionRate !== void 0 && Number(appliedCommissionRate) >= 0) {
    deal.appliedCommissionRate = Number(appliedCommissionRate);
    deal.commissionAmount = Math.round(deal.dealValue * deal.appliedCommissionRate / 100);
  }
  if ((deal.pricingType === "monthly_subscription" || deal.pricingType === "annual_subscription") && lockedRecurringRate !== void 0 && Number(lockedRecurringRate) >= 0) {
    deal.lockedRecurringRate = Number(lockedRecurringRate);
    deal.recurringCommissionAmount = Math.round(deal.dealValue * deal.lockedRecurringRate / 100);
  }
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "client_update",
    operation: "UPDATE",
    targetEntity: "Penyesuaian Komisi Klien",
    description: `Admin menyesuaikan komisi deal klien "${deal.companyName}" (Mitra: ${deal.mitraName}) menjadi ${deal.appliedCommissionRate}% (Rp ${deal.commissionAmount.toLocaleString("id-ID")})${deal.pricingType !== "case_by_case" ? ` & Komisi Berulang ${deal.lockedRecurringRate}% (Rp ${(deal.recurringCommissionAmount || 0).toLocaleString("id-ID")})` : ""}.`
  });
  saveDatabase();
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
    } catch {
    }
  }
  res.json({
    success: true,
    message: `Komisi untuk klien "${deal.companyName}" berhasil diperbarui.`,
    data: deal
  });
});
app.post("/api/admin/mitra/:id/bonus", async (req, res) => {
  const { id } = req.params;
  const { bonusAmount, title, periodLabel, notes } = req.body || {};
  const mitra = mitras.find((m) => m.id === id);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Data mitra tidak ditemukan." });
  }
  const amountNum = Math.round(Number(bonusAmount) || 0);
  if (amountNum <= 0) {
    return res.status(400).json({ success: false, message: "Nominal bonus wajib lebih dari Rp 0." });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const bonusTitle = (title || "Bonus Pencapaian Target Standar Mitra").trim();
  const periodStr = (periodLabel || (appSettings.bonusTargetConfig?.periodType === "yearly" ? "Target Tahunan" : "Target Bulanan")).trim();
  mitra.totalBonus = (mitra.totalBonus || 0) + amountNum;
  mitra.totalCommission = (mitra.totalCommission || 0) + amountNum;
  mitra.pendingPayout = (mitra.pendingPayout || 0) + amountNum;
  const bonusTrx = {
    id: `trx-bonus-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    serviceName: `\u{1F3C6} ${bonusTitle} (${periodStr})`,
    clientName: notes ? `Apresiasi Mitra: ${String(notes).trim()}` : "Pencapaian Target Standar NDTAXANDLAW",
    dealValue: 0,
    commissionAmount: 0,
    bonusAmount: amountNum,
    status: "pending",
    date: todayStr
  };
  commissions.unshift(bonusTrx);
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "bonus_grant",
    operation: "CREATE",
    targetEntity: "Pemberian Bonus Mitra",
    description: `Admin memberikan bonus prestasi "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString("id-ID")} kepada Mitra ${mitra.fullName}. Saldo bonus otomatis masuk ke saldo siap cair Mitra.`
  });
  const notif = {
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: `Selamat! Bonus Mitra Masuk: Rp ${amountNum.toLocaleString("id-ID")}`,
    message: `Admin telah memberikan "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString("id-ID")} kepada Mitra ${mitra.fullName}. Dana bonus telah masuk ke saldo siap cair Anda.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: mitra.id
  };
  notifications.unshift(notif);
  if (mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Selamat! Anda Menerima Bonus Prestasi Mitra Rp ${amountNum.toLocaleString("id-ID")} - NDTAXANDLAW`,
      category: "client_acc",
      previewSnippet: `Halo ${mitra.fullName},

Selamat atas pencapaian performa Anda! Admin NDTAXANDLAW telah memberikan "${bonusTitle}" (${periodStr}) sebesar Rp ${amountNum.toLocaleString("id-ID")}.${notes ? `

Catatan Apresiasi: ${notes}` : ""}

Dana bonus telah ditambahkan langsung ke dompet saldo siap cair Anda.`
    });
  }
  saveDatabase();
  if (db) {
    try {
      await db.from("commissions").insert([bonusTrx]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      await db.from("mitras").update({
        totalBonus: mitra.totalBonus,
        totalCommission: mitra.totalCommission,
        pendingPayout: mitra.pendingPayout
      }).eq("id", mitra.id);
    } catch (e) {
      console.warn("MySQL bonus grant update error", e);
    }
  }
  res.status(201).json({
    success: true,
    message: `Bonus sebesar Rp ${amountNum.toLocaleString("id-ID")} berhasil diberikan kepada ${mitra.fullName} dan masuk ke saldo siap cair.`,
    data: { mitra, bonusTransaction: bonusTrx }
  });
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
    id: `notif-mtr-${deal.mitraId}-${Date.now()}`,
    title: "Langganan Klien Berakhir / Diputus",
    message: `Klien "${deal.companyName}" (${deal.serviceName}) telah berhenti berlangganan per ${deal.terminatedAt}. Komisi berulang untuk Mitra ${deal.mitraName} otomatis dihentikan.`,
    type: "client_deal",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: deal.mitraId
  };
  notifications.unshift(notif);
  saveDatabase();
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      if (mitra) {
        await db.from("mitras").update({
          activeSubscribersCount: mitra.activeSubscribersCount
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("MySQL terminate client subscription error", e);
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
  if (db) {
    try {
      await db.from("client_deals").upsert([toDbClientDeal(deal)]);
      if (mitra) {
        await db.from("mitras").update({
          activeSubscribersCount: mitra.activeSubscribersCount
        }).eq("id", mitra.id);
      }
    } catch (e) {
      console.warn("MySQL update client status error", e);
    }
  }
  res.json({ success: true, data: deal });
});
app.get("/api/commissions/payout-requests", async (req, res) => {
  const { mitraId } = req.query;
  if (db) {
    try {
      const { data, error } = await db.from("payout_requests").select("*");
      if (!error && Array.isArray(data)) {
        payoutRequests = data;
        saveDatabase();
      }
    } catch (e) {
      console.warn("MySQL payout_requests query error", e);
    }
  } else if (isProductionMode()) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
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
    id: `notif-mtr-${payout.mitraId}-${Date.now()}`,
    title: "Pencairan Komisi Telah Ditransfer",
    message: `Dana komisi kotor Rp ${payout.amount.toLocaleString("id-ID")} (Net Rp ${(payout.netAmountTransferred || payout.amount).toLocaleString("id-ID")}) untuk ${payout.mitraName} telah berhasil ditransfer ke ${payout.bankDetails.bankName} (${payout.bankDetails.accountNumber}) dengan Ref #${payout.transferRefNumber}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: payout.mitraId
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
  if (db) {
    try {
      await db.from("payout_requests").upsert([payout]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      if (mitra) {
        await db.from("mitras").update({
          pendingPayout: mitra.pendingPayout,
          paidPayout: mitra.paidPayout
        }).eq("id", payout.mitraId);
      }
      for (const commId of paidCommissionIds) {
        await db.from("commissions").update({ status: "paid" }).eq("id", commId);
      }
    } catch (e) {
      console.warn("MySQL payout approve error", e);
    }
  }
  res.json({ success: true, data: payout });
});
app.post("/api/commissions/direct-disburse", async (req, res) => {
  const {
    mitraId,
    amount,
    pph21Deduction,
    pph21Rate,
    adminFeeDeduction,
    netAmountTransferred,
    proofFileUrl,
    proofFileName,
    transferRefNumber,
    notes
  } = req.body || {};
  const mitra = mitras.find((m) => m.id === mitraId);
  if (!mitra) {
    return res.status(404).json({ success: false, message: "Data Mitra tidak ditemukan." });
  }
  const grossAmount = Math.max(0, Number(amount) || Number(mitra.pendingPayout) || 0);
  if (grossAmount <= 0) {
    return res.status(400).json({ success: false, message: "Mitra belum memiliki saldo komisi siap cair." });
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const pphVal = pph21Deduction !== void 0 && pph21Deduction !== "" ? Math.max(0, Number(pph21Deduction)) : 0;
  const pphPercent = pph21Rate !== void 0 && pph21Rate !== "" ? Number(pph21Rate) : pphVal > 0 ? Number((pphVal / grossAmount * 100).toFixed(1)) : 0;
  const adminFeeVal = adminFeeDeduction !== void 0 && adminFeeDeduction !== "" ? Math.max(0, Number(adminFeeDeduction)) : 0;
  const calculatedNet = Math.max(0, grossAmount - pphVal - adminFeeVal);
  const finalNet = netAmountTransferred !== void 0 && netAmountTransferred !== "" ? Number(netAmountTransferred) : calculatedNet;
  const newPayout = {
    id: `pay-${Date.now()}`,
    mitraId: mitra.id,
    mitraName: mitra.fullName,
    memberCode: mitra.memberCode,
    amount: grossAmount,
    bankDetails: mitra.bankDetails || {
      bankName: "-",
      accountNumber: "-",
      accountHolder: mitra.fullName
    },
    requestDate: todayStr,
    processedDate: todayStr,
    status: "approved",
    pph21Deduction: pphVal,
    pph21Rate: pphPercent,
    adminFeeDeduction: adminFeeVal,
    netAmountTransferred: finalNet,
    proofFileUrl: proofFileUrl || void 0,
    proofFileName: proofFileName || void 0,
    transferRefNumber: transferRefNumber || `TRX-ND-${Date.now().toString().slice(-8)}`,
    disbursedBy: "Admin Operasional NDTAXANDLAW",
    notes: notes || `Pencairan komisi terjadwal oleh Admin ke rekening ${mitra.fullName}.`
  };
  payoutRequests.unshift(newPayout);
  const updatedPendingPayIds = [];
  for (const p of payoutRequests) {
    if (p.id !== newPayout.id && p.mitraId === mitra.id && p.status === "pending") {
      p.status = "approved";
      p.processedDate = todayStr;
      p.transferRefNumber = newPayout.transferRefNumber;
      p.disbursedBy = newPayout.disbursedBy;
      updatedPendingPayIds.push(p);
    }
  }
  mitra.pendingPayout = Math.max(0, (mitra.pendingPayout || 0) - grossAmount);
  mitra.paidPayout = (mitra.paidPayout || 0) + grossAmount;
  let remainingToMarkPaid = grossAmount;
  const paidCommissionIds = [];
  for (const c of commissions) {
    if (c.mitraId === mitra.id && c.status !== "paid" && remainingToMarkPaid > 0) {
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
    operation: "CREATE",
    targetEntity: "Pencairan Komisi Langsung oleh Admin",
    description: `Admin mencairkan & mentransfer komisi Mitra "${mitra.fullName}" sebesar Bersih Rp ${finalNet.toLocaleString("id-ID")} (Kotor: Rp ${grossAmount.toLocaleString("id-ID")}, PPh21: Rp ${pphVal.toLocaleString("id-ID")}) ke ${newPayout.bankDetails.bankName} ${newPayout.bankDetails.accountNumber} (Ref: #${newPayout.transferRefNumber}).`
  });
  const notif = {
    id: `notif-mtr-${mitra.id}-${Date.now()}`,
    title: "Komisi Anda Telah Dicairkan Admin",
    message: `Dana komisi kotor Rp ${grossAmount.toLocaleString("id-ID")} (Bersih Diterima Rp ${finalNet.toLocaleString("id-ID")}) untuk ${mitra.fullName} telah dicairkan oleh Admin ke rekening ${newPayout.bankDetails.bankName} (${newPayout.bankDetails.accountNumber}) dengan Ref #${newPayout.transferRefNumber}.`,
    type: "commission",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "mitra",
    mitraId: mitra.id
  };
  notifications.unshift(notif);
  if (mitra.email) {
    await sendSystemEmail({
      recipient: mitra.email,
      recipientName: mitra.fullName,
      subject: `Pencairan Komisi Resmi NDTAXANDLAW: Rp ${finalNet.toLocaleString("id-ID")} ke ${newPayout.bankDetails.bankName}`,
      category: "payout_disbursed",
      previewSnippet: `Dana komisi kemitraan Anda telah dicairkan secara terjadwal oleh Admin via ${newPayout.bankDetails.bankName} (${newPayout.bankDetails.accountNumber}) a.n ${newPayout.bankDetails.accountHolder}.

Jumlah Kotor: Rp ${grossAmount.toLocaleString("id-ID")}
Potongan PPh 21 (${pphPercent}%): Rp ${pphVal.toLocaleString("id-ID")}
Biaya Admin: Rp ${adminFeeVal.toLocaleString("id-ID")}
Total Bersih Ditransfer: Rp ${finalNet.toLocaleString("id-ID")}
No. Referensi: #${newPayout.transferRefNumber}`
    });
  }
  saveDatabase();
  if (db) {
    try {
      await db.from("payout_requests").upsert([newPayout, ...updatedPendingPayIds]);
      await db.from("notifications").insert([toDbNotification(notif)]);
      await db.from("mitras").update({
        pendingPayout: mitra.pendingPayout,
        paidPayout: mitra.paidPayout
      }).eq("id", mitra.id);
      for (const commId of paidCommissionIds) {
        await db.from("commissions").update({ status: "paid" }).eq("id", commId);
      }
    } catch (e) {
      console.warn("MySQL direct disburse error", e);
    }
  }
  return res.json({ success: true, data: newPayout });
});
app.get("/api/settings", async (req, res) => {
  if (db) {
    try {
      const { data: pwRows, error: errPw } = await db.from("user_passwords").select("*").in("email", ["__sys_config__@ndtaxlaw.internal", "__sys_roles__@ndtaxlaw.internal"]);
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
      const { data: settingsData, error } = await db.from("app_settings").select("*").eq("id", "config_primary").maybeSingle();
      if (!error && settingsData && settingsData.settings) {
        const { roles: storedRoles, ...restSettings } = settingsData.settings;
        appSettings = { ...appSettings, ...restSettings };
        if (Array.isArray(storedRoles) && storedRoles.length > 0) {
          systemRoles = storedRoles;
        }
      }
    } catch (e) {
      console.warn("MySQL settings query error", e);
    }
  }
  let settingsMigrated = false;
  const normalizedTagline = normalizeFirmTagline(appSettings.tagline);
  if (appSettings.tagline !== normalizedTagline) {
    appSettings.tagline = normalizedTagline;
    settingsMigrated = true;
  }
  if (!appSettings.mitraFieldsInitialized) {
    const existingMitra = Array.isArray(appSettings.mitraCustomFields) ? appSettings.mitraCustomFields : [];
    const hasDef = existingMitra.some((f) => Boolean(f.systemKey || f.isDefault));
    if (!hasDef) {
      appSettings.mitraCustomFields = [...DEFAULT_MITRA_FORM_FIELDS2, ...existingMitra];
    }
    appSettings.mitraFieldsInitialized = true;
    settingsMigrated = true;
  }
  const currentMitraFields = Array.isArray(appSettings.mitraCustomFields) ? appSettings.mitraCustomFields : [...DEFAULT_MITRA_FORM_FIELDS2];
  if (!currentMitraFields.some((f) => f.systemKey === "ktpFile" || f.id === "mitra-def-ktpFile")) {
    const ktpDef = DEFAULT_MITRA_FORM_FIELDS2.find((f) => f.systemKey === "ktpFile");
    if (ktpDef) {
      const nikIdx = currentMitraFields.findIndex((f) => f.systemKey === "nik" || f.id === "mitra-def-nik");
      const nextFields = [...currentMitraFields];
      if (nikIdx >= 0) {
        nextFields.splice(nikIdx + 1, 0, { ...ktpDef });
      } else {
        nextFields.unshift({ ...ktpDef });
      }
      appSettings.mitraCustomFields = nextFields;
      settingsMigrated = true;
    }
  }
  const accDefField = currentMitraFields.find((f) => f.systemKey === "accountNumber");
  if (accDefField && accDefField.type === "text") {
    accDefField.type = "number";
    settingsMigrated = true;
  }
  if (!appSettings.clientFieldsInitialized) {
    const existingClient = Array.isArray(appSettings.clientCustomFields) ? appSettings.clientCustomFields : [];
    const hasDef = existingClient.some((f) => Boolean(f.systemKey || f.isDefault));
    if (!hasDef) {
      appSettings.clientCustomFields = [...DEFAULT_CLIENT_FORM_FIELDS, ...existingClient];
    }
    appSettings.clientFieldsInitialized = true;
    settingsMigrated = true;
  }
  appSettings.specializationOptions = normalizeSpecializationOptions(appSettings.specializationOptions);
  let logoMigrated = settingsMigrated;
  if (appSettings.logoUrl && appSettings.logoUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(appSettings.logoUrl, "logo-resmi-nd", "png");
    if (saved?.hostedUrl) {
      appSettings.logoUrl = saved.hostedUrl;
      logoMigrated = true;
    }
  }
  if (appSettings.logoVerticalUrl && appSettings.logoVerticalUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(appSettings.logoVerticalUrl, "logo-vertikal-nd", "png");
    if (saved?.hostedUrl) {
      appSettings.logoVerticalUrl = saved.hostedUrl;
      logoMigrated = true;
    }
  }
  if (appSettings.logoHorizontalUrl && appSettings.logoHorizontalUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(appSettings.logoHorizontalUrl, "logo-horizontal-nd", "png");
    if (saved?.hostedUrl) {
      appSettings.logoHorizontalUrl = saved.hostedUrl;
      logoMigrated = true;
    }
  }
  if (appSettings.logoBarcodeUrl && appSettings.logoBarcodeUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(appSettings.logoBarcodeUrl, "logo-barcode-nd", "png");
    if (saved?.hostedUrl) {
      appSettings.logoBarcodeUrl = saved.hostedUrl;
      logoMigrated = true;
    }
  }
  if (!appSettings.logoVerticalUrl) {
    appSettings.logoVerticalUrl = appSettings.logoUrl && appSettings.logoUrl !== "/assets/aistudio/logo_c3fdb6de.png" ? appSettings.logoUrl : "/assets/aistudio/logo_nd_vertikal.svg";
  }
  if (!appSettings.logoHorizontalUrl) {
    appSettings.logoHorizontalUrl = appSettings.logoUrl === "/assets/aistudio/logo_c3fdb6de.png" ? appSettings.logoUrl : "/assets/aistudio/logo_c3fdb6de.png";
  }
  if (!appSettings.logoBarcodeUrl) {
    appSettings.logoBarcodeUrl = "/assets/aistudio/logo_kotak_5ecb05e4.png";
  }
  if (!appSettings.activeLogoType) {
    appSettings.activeLogoType = appSettings.logoUrl === appSettings.logoHorizontalUrl && appSettings.logoUrl !== appSettings.logoVerticalUrl ? "horizontal" : "vertical";
  }
  if (logoMigrated) {
    saveDatabase();
    persistSettingsToMysql().catch(() => {
    });
  }
  const clientSafeSettings = {
    ...appSettings,
    smtpPassword: appSettings.smtpPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
  };
  res.json({ success: true, data: clientSafeSettings, roles: systemRoles });
});
app.put("/api/settings", async (req, res) => {
  const prevLogoUrls = [
    appSettings.logoUrl,
    appSettings.logoVerticalUrl,
    appSettings.logoHorizontalUrl,
    appSettings.logoBarcodeUrl
  ].filter((u) => typeof u === "string" && u.trim().length > 0);
  const updates = { ...req.body || {} };
  if (updates.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
    delete updates.smtpPassword;
  }
  if (typeof updates.logoUrl === "string" && updates.logoUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(updates.logoUrl, "logo-resmi-nd", "png");
    if (saved?.hostedUrl) updates.logoUrl = saved.hostedUrl;
  }
  if (typeof updates.logoVerticalUrl === "string" && updates.logoVerticalUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(updates.logoVerticalUrl, "logo-vertikal-nd", "png");
    if (saved?.hostedUrl) updates.logoVerticalUrl = saved.hostedUrl;
  }
  if (typeof updates.logoHorizontalUrl === "string" && updates.logoHorizontalUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(updates.logoHorizontalUrl, "logo-horizontal-nd", "png");
    if (saved?.hostedUrl) updates.logoHorizontalUrl = saved.hostedUrl;
  }
  if (typeof updates.logoBarcodeUrl === "string" && updates.logoBarcodeUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(updates.logoBarcodeUrl, "logo-barcode-nd", "png");
    if (saved?.hostedUrl) updates.logoBarcodeUrl = saved.hostedUrl;
  }
  const prevRequiredFieldKeys = new Set(
    resolveMitraFormFields(appSettings).filter((f) => f.isActive !== false && f.required).map((f) => `${f.id}::${f.label.trim().toLowerCase()}`)
  );
  const previousEnv = appSettings.appEnvironment;
  appSettings = { ...appSettings, ...updates };
  if (appSettings.activeLogoType === "horizontal" && appSettings.logoHorizontalUrl) {
    appSettings.logoUrl = appSettings.logoHorizontalUrl;
  } else if (appSettings.activeLogoType === "vertical" && appSettings.logoVerticalUrl) {
    appSettings.logoUrl = appSettings.logoVerticalUrl;
  }
  const nextRequiredFields = resolveMitraFormFields(appSettings).filter(
    (f) => f.isActive !== false && f.required
  );
  const newlyRequiredFields = nextRequiredFields.filter(
    (f) => !prevRequiredFieldKeys.has(`${f.id}::${f.label.trim().toLowerCase()}`)
  );
  if (newlyRequiredFields.length > 0) {
    const newFieldLabels = newlyRequiredFields.map((f) => f.label).join(", ");
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const broadcastMsg = `Admin menambahkan kolom data diri wajib baru (${newFieldLabels}). Mohon segera melengkapi data diri Anda melalui menu Profil agar seluruh fitur kemitraan (Input Klien, Surat Penawaran, Tools Marketing & Tautan Referral) tetap dapat diakses.`;
    const mitraRequiredNotif = {
      id: `notif-req-fields-${Date.now()}`,
      title: "Wajib Lengkapi Data Diri Terbaru",
      message: broadcastMsg,
      type: "verification",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra"
    };
    notifications.unshift(mitraRequiredNotif);
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(mitraRequiredNotif)]);
      } catch (e) {
        console.warn("MySQL required-fields notification insert error", e);
      }
    }
    for (const m of mitras) {
      const missingList = getMissingMitraFields(m, appSettings);
      if (missingList.length > 0) {
        const personalNotice = `Mohon segera melengkapi kolom data diri wajib berikut: ${missingList.join(", ")}.`;
        m.profileCompletionNotice = personalNotice;
        m.profileCompletionNoticeAt = nowIso;
        m.bankDetails = {
          ...m.bankDetails || {},
          __profileCompletionNotice: personalNotice,
          __profileCompletionNoticeAt: nowIso
        };
        if (db) {
          try {
            await db.from("mitras").update({ bankDetails: m.bankDetails }).eq("id", m.id);
          } catch {
          }
        }
      }
    }
  }
  for (const oldLogoUrl of Array.from(new Set(prevLogoUrls))) {
    await deleteHostedUploadFile(oldLogoUrl);
  }
  if (previousEnv !== "production" && appSettings.appEnvironment === "production" && db) {
    await syncFromMysql();
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
    id: `notif-sys-${Date.now()}`,
    title: "Pengaturan Sistem Diperbarui",
    message: "Konfigurasi profil layanan, server SMTP email & notifikasi otomatis, OAuth Google, dan integrasi sistem telah diperbarui oleh Admin.",
    type: "system_update",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false,
    targetAudience: "admin_only"
  };
  notifications.unshift(notif);
  saveDatabase();
  await persistSettingsToMysql();
  if (db) {
    try {
      await db.from("notifications").insert([toDbNotification(notif)]);
    } catch (e) {
      console.warn("MySQL notification insert error", e);
    }
  }
  const clientSafeSettings = {
    ...appSettings,
    smtpPassword: appSettings.smtpPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
  };
  res.json({ success: true, data: clientSafeSettings });
});
app.put("/api/settings/whatsapp-group", async (req, res) => {
  const { whatsappGroupName, whatsappGroupLink, whatsappGroupJid } = req.body || {};
  const cleanName = typeof whatsappGroupName === "string" && whatsappGroupName.trim() ? whatsappGroupName.trim().slice(0, 120) : appSettings.whatsappGroupName || "Grup WhatsApp Mitra ND Tax & Law";
  const rawLink = typeof whatsappGroupLink === "string" ? whatsappGroupLink.trim() : "";
  const cleanJid = typeof whatsappGroupJid === "string" ? whatsappGroupJid.trim().slice(0, 120) : appSettings.whatsappGroupJid || "";
  let validatedLink = rawLink ? "" : appSettings.whatsappGroupLink || "";
  if (rawLink) {
    try {
      const parsed = new URL(rawLink);
      if (parsed.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          message: "Tautan Grup WhatsApp harus menggunakan protokol HTTPS (misal: https://chat.whatsapp.com/...)."
        });
      }
      validatedLink = parsed.toString();
    } catch {
      return res.status(400).json({
        success: false,
        message: "Format tautan Grup WhatsApp tidak valid."
      });
    }
  } else if (typeof whatsappGroupLink === "string") {
    validatedLink = "";
  }
  if (cleanJid && !validatedLink && getWhatsAppStatus().status === "connected") {
    const fetchedLink = await getWhatsAppGroupInviteLink(cleanJid);
    if (fetchedLink) validatedLink = fetchedLink;
  }
  appSettings.whatsappGroupName = cleanName;
  appSettings.whatsappGroupLink = validatedLink;
  appSettings.whatsappGroupJid = cleanJid;
  recordActivity({
    actorRole: "admin",
    actorId: adminAccount.id,
    actorName: adminAccount.name,
    actorEmail: adminAccount.email,
    actionType: "settings_update",
    operation: "UPDATE",
    targetEntity: "Grup WhatsApp Mitra",
    description: `Admin memperbarui konfigurasi Grup WhatsApp Mitra: "${cleanName}"${cleanJid ? ` (${cleanJid})` : ""}.`
  });
  saveDatabase();
  await persistSettingsToMysql();
  res.json({
    success: true,
    data: {
      whatsappGroupName: appSettings.whatsappGroupName,
      whatsappGroupLink: appSettings.whatsappGroupLink,
      whatsappGroupJid: appSettings.whatsappGroupJid
    },
    message: "Pengaturan Grup WhatsApp Mitra berhasil disimpan."
  });
});
app.post("/api/settings/test-email", async (req, res) => {
  const { targetEmail, smtpConfig } = req.body;
  const emailToTest = (targetEmail || appSettings.supportEmail || "admin@ndtaxandlaw.com").trim();
  if (!emailToTest || !emailToTest.includes("@")) {
    return res.status(400).json({ success: false, message: "Alamat email tujuan tidak valid." });
  }
  if (smtpConfig && typeof smtpConfig === "object") {
    appSettings = { ...appSettings, ...smtpConfig };
    saveDatabase();
    await persistSettingsToMysql();
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
  if (db) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await db.from("email_logs").delete().lt("timestamp", cutoffIso);
      const [{ data: tableLogs, error: errTable }, { data: kvRow, error: errKv }] = await Promise.all([
        db.from("email_logs").select("*").order("timestamp", { ascending: false }).limit(300),
        db.from("user_passwords").select("*").eq("email", "__sys_email_logs__@ndtaxlaw.internal").maybeSingle()
      ]);
      const fromTable = !errTable && Array.isArray(tableLogs) ? tableLogs.map(fromDbEmailLogRow) : [];
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
          await db.from("email_logs").upsert(emailLogs.slice(0, 100).map(toDbEmailLogRow));
        } catch {
        }
      }
      return res.json({ success: true, data: emailLogs });
    } catch (e) {
      console.warn("MySQL email logs query error", e);
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
  await persistEmailLogsToMysql();
  if (db) {
    try {
      await db.from("email_logs").delete().neq("id", "");
    } catch {
    }
  }
  res.json({ success: true, message: "Riwayat log pengiriman email berhasil dibersihkan dari lokal dan MySQL." });
});
app.get("/api/activity-logs", async (req, res) => {
  if (db) {
    try {
      const { cutoffIso } = getThreeMonthsAgoCutoff();
      await db.from("activity_logs").delete().lt("timestamp", cutoffIso);
      const { data: tableLogs, error: errTable } = await db.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(500);
      if (!errTable && Array.isArray(tableLogs) && tableLogs.length > 0) {
        activityLogs = tableLogs;
        await pruneOldLogs(false);
        saveDatabase();
        return res.json({ success: true, data: activityLogs });
      }
      const { data: kvRow, error: errKv } = await db.from("user_passwords").select("*").eq("email", "__sys_activity_logs__@ndtaxlaw.internal").maybeSingle();
      if (!errKv && kvRow && kvRow.password) {
        const parsed = JSON.parse(kvRow.password);
        if (Array.isArray(parsed)) {
          activityLogs = parsed;
          await pruneOldLogs(false);
          saveDatabase();
        }
      }
    } catch (e) {
      console.warn("MySQL activity logs query error", e);
    }
  }
  await pruneOldLogs(false);
  res.json({ success: true, data: activityLogs });
});
app.delete("/api/activity-logs", async (req, res) => {
  activityLogs = [];
  saveDatabase();
  await persistActivityLogsToMysql();
  if (db) {
    try {
      await db.from("activity_logs").delete().neq("id", "");
    } catch {
    }
  }
  res.json({ success: true, message: "Riwayat log aktivitas berhasil dibersihkan dari lokal dan MySQL." });
});
app.get("/api/notifications", async (req, res) => {
  if (db) {
    try {
      const { data, error } = await db.from("notifications").select("*").order("timestamp", { ascending: false });
      if (!error && Array.isArray(data)) {
        notifications = data;
        saveDatabase();
        return res.json({ success: true, data: notifications });
      }
    } catch (e) {
      console.warn("MySQL notifications query error", e);
    }
  }
  if (isProductionMode() && !db) {
    return res.status(503).json({ success: false, message: "Mode Production hanya membaca dari database MySQL." });
  }
  res.json({ success: true, data: notifications });
});
app.post("/api/notifications/read-all", async (req, res) => {
  const targetIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    notifications = notifications.map((n) => idSet.has(n.id) ? { ...n, isRead: true } : n);
    if (db) {
      try {
        await db.from("notifications").update({ isRead: true }).in("id", targetIds);
      } catch (e) {
        console.warn("MySQL mark read notifications error", e);
      }
    }
  } else {
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
    if (db) {
      try {
        await db.from("notifications").update({ isRead: true }).neq("isRead", true);
      } catch (e) {
        console.warn("MySQL mark read notifications error", e);
      }
    }
  }
  saveDatabase();
  res.json({ success: true, data: notifications });
});
app.delete("/api/notifications/:id", async (req, res) => {
  const { id } = req.params;
  notifications = notifications.filter((n) => n.id !== id);
  if (db) {
    try {
      await db.from("notifications").delete().eq("id", id);
    } catch (e) {
      console.warn("MySQL delete notification error", e);
    }
  }
  saveDatabase();
  res.json({ success: true, data: notifications });
});
app.post("/api/notifications/delete-batch", async (req, res) => {
  const targetIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    notifications = notifications.filter((n) => !idSet.has(n.id));
    if (db) {
      try {
        await db.from("notifications").delete().in("id", targetIds);
      } catch (e) {
        console.warn("MySQL batch delete notifications error", e);
      }
    }
    saveDatabase();
  }
  res.json({ success: true, data: notifications });
});
var INDO_MONTH_MAP_SERVER = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  agu: 7,
  agt: 7,
  agustus: 7,
  aug: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oct: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  des: 11,
  dec: 11,
  desember: 11
};
var parseServerRecordTimestamp = (dateStr, idStr, fallbackOrder = 0) => {
  let idEpoch = 0;
  if (idStr) {
    const m = /(\d{12,14})/.exec(String(idStr));
    if (m) idEpoch = Number(m[1]);
  }
  if (!dateStr) return idEpoch || fallbackOrder;
  const s = String(dateStr).trim();
  if (s.toLowerCase().includes("baru saja")) {
    return idEpoch || Date.now() + fallbackOrder;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
      return parsed + (idEpoch ? idEpoch % 864e5 : fallbackOrder);
    }
  }
  const dmY = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/.exec(s);
  if (dmY) {
    const day = Number(dmY[1]);
    const monthKey = dmY[2].toLowerCase();
    const year = Number(dmY[3]);
    const monthIdx = INDO_MONTH_MAP_SERVER[monthKey] ?? INDO_MONTH_MAP_SERVER[monthKey.slice(0, 3)];
    if (monthIdx !== void 0) {
      const base = new Date(year, monthIdx, day).getTime();
      return base + (idEpoch ? idEpoch % 864e5 : fallbackOrder);
    }
  }
  const fallbackParsed = Date.parse(s);
  if (!Number.isNaN(fallbackParsed)) {
    return fallbackParsed + (idEpoch ? idEpoch % 864e5 : fallbackOrder);
  }
  return idEpoch || fallbackOrder;
};
app.get("/api/datatables/:resource", async (req, res) => {
  const { resource } = req.params;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const perPage = Math.min(500, Math.max(1, parseInt(String(req.query.perPage || "10"), 10) || 10));
  const search = String(req.query.search || "").trim().toLowerCase();
  const status = String(req.query.status || "all").trim();
  const category = String(req.query.category || "Semua").trim();
  const fileType = String(req.query.fileType || "all").trim();
  const mitraId = String(req.query.mitraId || "").trim();
  const period = String(req.query.period || "monthly").trim();
  const bonusCfg = appSettings.bonusTargetConfig || DEFAULT_BONUS_TARGET_CONFIG;
  const rewardTiers = bonusCfg.rewardTiers && bonusCfg.rewardTiers.length > 0 ? bonusCfg.rewardTiers : DEFAULT_BONUS_TARGET_CONFIG.rewardTiers;
  const hasAchievedRewardTier = (omzet) => {
    const sorted = [...rewardTiers].sort((a, b) => a.salesTarget - b.salesTarget);
    return sorted.some((t) => omzet >= t.salesTarget);
  };
  let allItems = [];
  let filteredItems = [];
  if (resource === "marketing-tools") {
    allItems = [...marketingTools].map((item, idx) => ({
      ...item,
      _ts: parseServerRecordTimestamp(item.updatedAt || item.createdAt, item.id, marketingTools.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((tool) => {
      const matchCat = category === "Semua" || category === "all" || !category || tool.category === category;
      const matchType = fileType === "all" || !fileType || tool.fileType === fileType;
      const matchSearch = !search || (tool.title || "").toLowerCase().includes(search) || (tool.description || "").toLowerCase().includes(search) || (tool.category || "").toLowerCase().includes(search) || (tool.fileType || "").toLowerCase().includes(search);
      return matchCat && matchType && matchSearch;
    });
  } else if (resource === "mitras") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    allItems = safeList.map((m, idx) => ({
      ...m,
      _ts: parseServerRecordTimestamp(m.joinedDate, m.id, safeList.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((m) => {
      const matchStatus = status === "all" || !status || (status === "inactive" ? m.isActive === false : m.status === status);
      const matchSearch = !search || (m.fullName || "").toLowerCase().includes(search) || (m.memberCode || "").toLowerCase().includes(search) || (m.specialization || "").toLowerCase().includes(search) || (m.email || "").toLowerCase().includes(search) || (m.phone || "").toLowerCase().includes(search) || (m.nik || "").toLowerCase().includes(search);
      return matchStatus && matchSearch;
    });
  } else if (resource === "clients") {
    const scopedDeals = mitraId ? clientDeals.filter((d) => d.mitraId === mitraId) : [...clientDeals];
    allItems = scopedDeals.map((d, idx) => ({
      ...d,
      _ts: parseServerRecordTimestamp(d.date || d.subscriptionStartDate, d.id, scopedDeals.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((deal) => {
      const matchStatus = status === "all" || !status || deal.status === status;
      if (!search) return matchStatus;
      const customFieldsText = deal.customFields ? Object.entries(deal.customFields).map(([k, v]) => `${k} ${v}`).join(" ").toLowerCase() : "";
      const matchSearch = (deal.companyName || "").toLowerCase().includes(search) || (deal.picName || "").toLowerCase().includes(search) || (deal.picPhone || "").toLowerCase().includes(search) || (deal.picEmail || "").toLowerCase().includes(search) || (deal.serviceName || "").toLowerCase().includes(search) || (deal.referralCode || "").toLowerCase().includes(search) || (deal.mitraName || "").toLowerCase().includes(search) || (deal.notes || "").toLowerCase().includes(search) || customFieldsText.includes(search);
      return matchStatus && matchSearch;
    });
  } else if (resource === "commissions") {
    const scopedTrx = mitraId ? commissions.filter((t) => t.mitraId === mitraId) : [...commissions];
    allItems = scopedTrx.map((t, idx) => ({
      ...t,
      _ts: parseServerRecordTimestamp(t.date, t.id, scopedTrx.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((trx) => {
      const matchStatus = status === "all" || !status || trx.status === status;
      const matchSearch = !search || (trx.clientName || "").toLowerCase().includes(search) || (trx.mitraName || "").toLowerCase().includes(search) || (trx.serviceName || "").toLowerCase().includes(search) || (trx.date || "").toLowerCase().includes(search);
      return matchStatus && matchSearch;
    });
  } else if (resource === "payout-requests") {
    const scopedPay = mitraId ? payoutRequests.filter((p) => p.mitraId === mitraId) : [...payoutRequests];
    allItems = scopedPay.map((p, idx) => ({
      ...p,
      _ts: parseServerRecordTimestamp(p.processedDate || p.requestDate, p.id, scopedPay.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((reqItem) => {
      const matchStatus = status === "all" || !status || reqItem.status === status;
      const matchSearch = !search || (reqItem.mitraName || "").toLowerCase().includes(search) || (reqItem.memberCode || "").toLowerCase().includes(search) || (reqItem.bankDetails?.bankName || "").toLowerCase().includes(search) || (reqItem.bankDetails?.accountNumber || "").toLowerCase().includes(search) || (reqItem.bankDetails?.accountHolder || "").toLowerCase().includes(search) || (reqItem.requestDate || "").toLowerCase().includes(search) || (reqItem.processedDate || "").toLowerCase().includes(search);
      return matchStatus && matchSearch;
    });
  } else if (resource === "mitra-target-evaluation") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    const mRevTarget = Math.max(1, Number(bonusCfg.monthlyTargetDealRevenue ?? 5e7));
    const mCliTarget = Math.max(1, Number(bonusCfg.monthlyTargetClientCount ?? 3));
    const yRevTarget = Math.max(1, Number(bonusCfg.yearlyTargetDealRevenue ?? 5e8));
    const yCliTarget = Math.max(1, Number(bonusCfg.yearlyTargetClientCount ?? 12));
    allItems = safeList.map((m) => {
      const mDeals = clientDeals.filter(
        (d) => d.mitraId === m.id && (d.status === "active_subscription" || d.status === "deal_closed")
      );
      const totalDealOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
      const totalDealClients = mDeals.length;
      const mExceeded = totalDealOmzet >= mRevTarget || totalDealClients >= mCliTarget;
      const yExceeded = totalDealOmzet >= yRevTarget || totalDealClients >= yCliTarget;
      const tierReached = hasAchievedRewardTier(totalDealOmzet);
      const achievedTarget = mExceeded || yExceeded || tierReached;
      return {
        ...m,
        _achievedTarget: achievedTarget ? 1 : 0,
        _omzet: totalDealOmzet,
        _clients: totalDealClients
      };
    });
    allItems.sort((a, b) => {
      if (b._achievedTarget !== a._achievedTarget) return b._achievedTarget - a._achievedTarget;
      if (b._omzet !== a._omzet) return b._omzet - a._omzet;
      return b._clients - a._clients;
    });
    filteredItems = allItems.filter((m) => {
      if (!search) return true;
      return (m.fullName || "").toLowerCase().includes(search) || (m.memberCode || "").toLowerCase().includes(search) || (m.referralCode || "").toLowerCase().includes(search) || (m.specialization || "").toLowerCase().includes(search);
    });
  } else if (resource === "mitra-performance") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    const getStatusRank = (st) => {
      if (st === "pending") return 0;
      if (st === "verified") return 1;
      return 2;
    };
    allItems = [...safeList].sort((a, b) => {
      const rankDiff = getStatusRank(a.status) - getStatusRank(b.status);
      if (rankDiff !== 0) return rankDiff;
      const clientsDiff = (Number(b.referredClientsCount) || 0) - (Number(a.referredClientsCount) || 0);
      if (clientsDiff !== 0) return clientsDiff;
      return (Number(b.totalCommission) || 0) - (Number(a.totalCommission) || 0);
    });
    filteredItems = allItems.filter((m) => {
      const matchStatus = status === "all" || !status || m.status === status;
      const matchSearch = !search || (m.fullName || "").toLowerCase().includes(search) || (m.memberCode || "").toLowerCase().includes(search) || (m.referralCode || "").toLowerCase().includes(search) || (m.specialization || "").toLowerCase().includes(search);
      return matchStatus && matchSearch;
    });
  } else if (resource === "mitra-payout-balances") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    allItems = [...safeList].sort((a, b) => {
      const balDiff = (Number(b.pendingPayout) || 0) - (Number(a.pendingPayout) || 0);
      if (balDiff !== 0) return balDiff;
      return (Number(b.totalCommission) || 0) - (Number(a.totalCommission) || 0);
    });
    filteredItems = allItems.filter((m) => {
      if (!search) return true;
      return (m.fullName || "").toLowerCase().includes(search) || (m.memberCode || "").toLowerCase().includes(search) || (m.bankDetails?.bankName || "").toLowerCase().includes(search) || (m.bankDetails?.accountNumber || "").toLowerCase().includes(search) || (m.bankDetails?.accountHolder || "").toLowerCase().includes(search);
    });
  } else if (resource === "mitra-monitoring-targets") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    const targetRev = period === "yearly" ? Math.max(1, Number(bonusCfg.yearlyTargetDealRevenue ?? 5e8)) : Math.max(1, Number(bonusCfg.monthlyTargetDealRevenue ?? 5e7));
    const targetCli = period === "yearly" ? Math.max(1, Number(bonusCfg.yearlyTargetClientCount ?? 12)) : Math.max(1, Number(bonusCfg.monthlyTargetClientCount ?? 3));
    allItems = safeList.map((m) => {
      const mDeals = clientDeals.filter(
        (d) => d.mitraId === m.id && (d.status === "active_subscription" || d.status === "deal_closed")
      );
      const mOmzet = mDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
      const mClients = mDeals.length;
      const mAchieved = mOmzet >= targetRev || mClients >= targetCli || hasAchievedRewardTier(mOmzet);
      return {
        ...m,
        _achieved: mAchieved ? 1 : 0,
        _omzet: mOmzet,
        _clients: mClients
      };
    });
    allItems.sort((a, b) => {
      if (b._achieved !== a._achieved) return b._achieved - a._achieved;
      if (b._omzet !== a._omzet) return b._omzet - a._omzet;
      return b._clients - a._clients;
    });
    filteredItems = allItems.filter((m) => {
      if (!search) return true;
      return (m.fullName || "").toLowerCase().includes(search) || (m.memberCode || "").toLowerCase().includes(search) || (m.referralCode || "").toLowerCase().includes(search);
    });
  } else if (resource === "prospects") {
    const scopedLetters = mitraId ? prospectLetters.filter((l) => l.mitraId === mitraId) : [...prospectLetters];
    allItems = scopedLetters.map((l, idx) => ({
      ...l,
      _ts: parseServerRecordTimestamp(l.createdAt || l.letterDate, l.id, scopedLetters.length - idx)
    }));
    allItems.sort((a, b) => b._ts - a._ts);
    filteredItems = allItems.filter((l) => {
      if (!search) return true;
      return (l.letterNumber || "").toLowerCase().includes(search) || (l.companyName || "").toLowerCase().includes(search) || (l.businessField || "").toLowerCase().includes(search) || (l.companyAddress || "").toLowerCase().includes(search) || (l.mitraName || "").toLowerCase().includes(search) || (l.mitraMemberCode || "").toLowerCase().includes(search) || (l.createdByName || "").toLowerCase().includes(search);
    });
  } else if (resource === "prospects-summary") {
    const safeList = toPublicSafeMitraList(normalizeMitraAvatars(mitras));
    const lettersByMitra = /* @__PURE__ */ new Map();
    for (const l of prospectLetters) {
      if (!l.mitraId) continue;
      if (!lettersByMitra.has(l.mitraId)) lettersByMitra.set(l.mitraId, []);
      lettersByMitra.get(l.mitraId).push(l);
    }
    allItems = safeList.map((m) => {
      const mLetters = (lettersByMitra.get(m.id) || []).sort(
        (a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")
      );
      const latest = mLetters[0] || null;
      const recentCompanies = Array.from(new Set(mLetters.map((x) => x.companyName))).slice(0, 5);
      return {
        mitraId: m.id,
        mitraName: m.fullName,
        memberCode: m.memberCode,
        referralCode: m.referralCode,
        phone: m.phone,
        email: m.email,
        avatarUrl: m.avatarUrl,
        gender: m.gender,
        status: m.status,
        totalLetters: mLetters.length,
        latestLetterDate: latest ? latest.letterDate || latest.createdAt : null,
        latestCompanyName: latest ? latest.companyName : null,
        recentCompanies,
        _allCompanyNames: mLetters.map((x) => `${x.companyName || ""} ${x.businessField || ""}`.toLowerCase()).join(" "),
        _latestTs: latest ? Date.parse(latest.createdAt || latest.letterDate || "") || 0 : 0
      };
    });
    allItems.sort((a, b) => {
      if (b.totalLetters !== a.totalLetters) return b.totalLetters - a.totalLetters;
      if (b._latestTs !== a._latestTs) return b._latestTs - a._latestTs;
      return String(a.mitraName || "").localeCompare(String(b.mitraName || ""));
    });
    filteredItems = allItems.filter((row) => {
      if (status === "has_letters" && row.totalLetters <= 0) return false;
      if (status === "no_letters" && row.totalLetters > 0) return false;
      if (!search) return true;
      return (row.mitraName || "").toLowerCase().includes(search) || (row.memberCode || "").toLowerCase().includes(search) || (row.referralCode || "").toLowerCase().includes(search) || (row.phone || "").toLowerCase().includes(search) || (row._allCompanyNames || "").includes(search);
    }).map(({ _allCompanyNames, _latestTs, ...publicRow }) => publicRow);
  } else if (resource === "sph") {
    const mitraIdFilter = String(req.query.mitraId || "").trim();
    const prospectLetterIdFilter = String(req.query.prospectLetterId || "").trim();
    let scoped = [...sphDocuments].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    if (mitraIdFilter && mitraIdFilter !== "all") {
      scoped = scoped.filter((s) => s.mitraId === mitraIdFilter);
    }
    if (prospectLetterIdFilter) {
      scoped = scoped.filter((s) => s.prospectLetterId === prospectLetterIdFilter);
    }
    const counts = {
      total: scoped.length,
      pending: scoped.filter((s) => s.status === "pending").length,
      approved: scoped.filter((s) => s.status === "approved").length,
      rejected: scoped.filter((s) => s.status === "rejected").length
    };
    let filtered = scoped;
    if (status && status !== "all") {
      filtered = filtered.filter((s) => s.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (s) => s.sphNumber.toLowerCase().includes(search) || s.companyName.toLowerCase().includes(search) || s.mitraName.toLowerCase().includes(search) || s.mitraMemberCode.toLowerCase().includes(search) || s.prospectLetterNumber.toLowerCase().includes(search) || s.services.some((sv) => sv.serviceNameId.toLowerCase().includes(search))
      );
    }
    const totalItemsSph = filtered.length;
    const totalPagesSph = Math.max(1, Math.ceil(totalItemsSph / perPage));
    const safePageSph = Math.min(page, totalPagesSph);
    const startSph = (safePageSph - 1) * perPage;
    return res.json({
      success: true,
      data: filtered.slice(startSph, startSph + perPage),
      counts,
      meta: {
        page: safePageSph,
        perPage,
        totalItems: totalItemsSph,
        totalPages: totalPagesSph,
        totalAll: scoped.length
      }
    });
  } else {
    return res.status(404).json({ success: false, message: "Resource DataTables tidak ditemukan." });
  }
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + perPage);
  return res.json({
    success: true,
    data: paginatedItems,
    meta: {
      page: safePage,
      perPage,
      totalItems,
      totalPages,
      totalAll: allItems.length
    }
  });
});
app.get("/api/prospects", async (req, res) => {
  const mitraId = String(req.query.mitraId || "").trim();
  const list = mitraId ? prospectLetters.filter((l) => l.mitraId === mitraId) : [...prospectLetters];
  list.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
  return res.json({ success: true, data: list });
});
app.get("/api/prospects/template", async (_req, res) => {
  const resolved = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
  return res.json({
    success: true,
    data: resolved,
    hasCustomTemplate: Boolean(
      appSettings.prospectLetterTemplate && Object.keys(appSettings.prospectLetterTemplate).length > 0
    )
  });
});
app.put("/api/prospects/template", async (req, res) => {
  try {
    const {
      content,
      resetToDefault,
      actorRole: rawActorRole,
      actorId,
      actorName,
      actorEmail
    } = req.body || {};
    if (rawActorRole !== "admin" && rawActorRole !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Hanya Admin atau Staf yang dapat mengubah template isi surat penawaran."
      });
    }
    if (resetToDefault) {
      appSettings.prospectLetterTemplate = void 0;
    } else {
      const sanitized = sanitizeProspectLetterContent(content);
      if (!sanitized) {
        return res.status(400).json({
          success: false,
          message: "Isi template surat tidak valid."
        });
      }
      appSettings.prospectLetterTemplate = sanitized;
    }
    saveDatabase();
    void persistSettingsToMysql();
    const resolved = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
    recordActivity({
      actorRole: rawActorRole,
      actorId: actorId ? String(actorId) : void 0,
      actorName: String(actorName || (rawActorRole === "staff" ? "Staf Operasional" : "Admin Operasional")).trim(),
      actorEmail: actorEmail ? String(actorEmail) : void 0,
      actionType: "prospect_update",
      operation: "UPDATE",
      targetEntity: "Template Isi Surat Prospek",
      description: resetToDefault ? "Mengembalikan template isi surat penawaran prospek ke standar awal." : "Memperbarui template master isi surat penawaran prospek."
    });
    return res.json({
      success: true,
      message: resetToDefault ? "Template isi surat dikembalikan ke default." : "Template isi surat penawaran berhasil disimpan.",
      data: resolved,
      hasCustomTemplate: !resetToDefault
    });
  } catch (err) {
    console.error("[Prospect Template Update Error]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan template isi surat."
    });
  }
});
app.get("/api/prospects/public-verify/:code", async (req, res) => {
  const rawCode = String(req.params.code || "").trim();
  if (!rawCode) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Kode verifikasi surat tidak ditemukan."
    });
  }
  const normalized = rawCode.toLowerCase();
  const found = prospectLetters.find(
    (l) => (l.verificationCode || "").toLowerCase() === normalized || (l.id || "").toLowerCase() === normalized || (l.letterNumber || "").toLowerCase() === normalized
  );
  if (!found) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Surat penawaran dengan kode tersebut tidak terdaftar di sistem resmi ND TAX AND LAW."
    });
  }
  const effectiveContent = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
  return res.json({
    success: true,
    verified: true,
    data: {
      documentType: "prospect_letter",
      id: found.id,
      letterNumber: found.letterNumber,
      verificationCode: found.verificationCode,
      letterDate: found.letterDate,
      companyName: found.companyName,
      companyAddress: found.companyAddress,
      mitraName: found.mitraName,
      mitraMemberCode: found.mitraMemberCode,
      mitraPhone: found.mitraPhone,
      mitraEmail: found.mitraEmail,
      directorName: effectiveContent.directorName || found.directorName || DEFAULT_PROSPECT_LETTER_CONTENT.directorName,
      directorTitle: effectiveContent.directorTitle || found.directorTitle || DEFAULT_PROSPECT_LETTER_CONTENT.directorTitle,
      firmName: effectiveContent.directorFirmLabel || "ND TAX AND LAW",
      firmLegalBasis: "SK Kemenkumham AHU-0068631-AH.01.14",
      supportPhone: appSettings.supportPhone || "021-86941220 / 0821-8074-4977",
      supportEmail: appSettings.supportEmail || "business@ndtaxandlaw.com",
      createdAt: found.createdAt
    }
  });
});
app.get("/api/sph/public-verify/:code", async (req, res) => {
  if (db) {
    await syncFromMysql();
  }
  const rawCode = String(req.params.code || "").trim();
  if (!rawCode) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Kode verifikasi Surat Penawaran Harga (SPH) tidak ditemukan."
    });
  }
  const normalized = rawCode.toLowerCase();
  const found = sphDocuments.find(
    (s) => (s.id || "").toLowerCase() === normalized || (s.sphNumber || "").toLowerCase() === normalized
  );
  if (!found) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Surat Penawaran Harga (SPH) dengan kode tersebut tidak terdaftar di sistem resmi ND TAX AND LAW."
    });
  }
  if (found.status !== "approved") {
    return res.status(403).json({
      success: false,
      verified: false,
      message: "Surat Penawaran Harga (SPH) ini belum divalidasi/disetujui oleh Admin ND TAX AND LAW."
    });
  }
  const effectiveContent = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
  return res.json({
    success: true,
    verified: true,
    data: {
      documentType: "sph",
      id: found.id,
      sphNumber: found.sphNumber,
      letterNumber: found.sphNumber,
      verificationCode: found.sphNumber,
      letterDate: found.sphDate || found.createdAt,
      prospectLetterNumber: found.prospectLetterNumber || "",
      companyName: found.companyName,
      companyAddress: found.companyAddress,
      businessField: found.businessField || "",
      clientSignerName: found.clientSignerName || "",
      clientSignerTitleId: found.clientSignerTitleId || "",
      mitraName: found.mitraName,
      mitraMemberCode: found.mitraMemberCode,
      mitraPhone: found.mitraPhone,
      mitraEmail: found.mitraEmail,
      directorName: found.directorName || effectiveContent.directorName || DEFAULT_PROSPECT_LETTER_CONTENT.directorName,
      directorTitle: found.directorTitleId || effectiveContent.directorTitle || DEFAULT_PROSPECT_LETTER_CONTENT.directorTitle,
      firmName: effectiveContent.directorFirmLabel || "ND TAX AND LAW",
      firmLegalBasis: "SK Kemenkumham AHU-0068631-AH.01.14",
      supportPhone: appSettings.supportPhone || "021-86941220 / 0821-8074-4977",
      supportEmail: appSettings.supportEmail || "business@ndtaxandlaw.com",
      services: (found.services || []).map((sv) => ({
        serviceNameId: sv.serviceNameId,
        serviceNameEn: sv.serviceNameEn,
        tierLabel: sv.volumeLabelId || "",
        turnoverLabel: sv.turnoverLabelId || "",
        monthlyPrice: sv.monthlyPrice
      })),
      normalTotalMonthly: found.normalTotalMonthly,
      discountAmount: found.discountAmount,
      finalTotalMonthly: found.finalTotalMonthly,
      durationMonths: found.durationMonths,
      approvedAt: found.approvedAt || found.updatedAt || found.createdAt,
      approvedBy: found.approvedBy || "Admin ND TAX AND LAW",
      createdAt: found.createdAt
    }
  });
});
app.post("/api/prospects/check-company", async (req, res) => {
  const {
    companyName: rawCompanyName,
    targetMitraId: rawTargetMitraId,
    excludeLetterId: rawExcludeLetterId
  } = req.body || {};
  const companyName = String(rawCompanyName || "").replace(/\s+/g, " ").trim();
  const targetMitraId = String(rawTargetMitraId || "").trim();
  const excludeLetterId = rawExcludeLetterId ? String(rawExcludeLetterId).trim() : void 0;
  if (companyName.length < 2) {
    return res.json({
      success: true,
      data: {
        blocked: false,
        exactMatches: [],
        similarMatches: [],
        ownMatches: []
      }
    });
  }
  const result = checkProspectCompanyDuplicates(
    companyName,
    prospectLetters,
    targetMitraId,
    excludeLetterId
  );
  return res.json({
    success: true,
    data: result
  });
});
app.post("/api/prospects", async (req, res) => {
  try {
    const {
      companyName: rawCompanyName,
      businessField: rawBusinessField,
      addressParts: rawAddressParts,
      companyAddress: rawCompanyAddress,
      mitraId: rawMitraId,
      actorRole: rawActorRole,
      actorId,
      actorName,
      actorEmail,
      clientRequestId: rawClientRequestId
    } = req.body || {};
    const actorRole = rawActorRole === "admin" || rawActorRole === "staff" ? rawActorRole : "mitra";
    const companyName = String(rawCompanyName || "").replace(/\s+/g, " ").trim();
    if (companyName.length < 2 || companyName.length > 90) {
      return res.status(400).json({
        success: false,
        message: "Nama perusahaan wajib diisi (minimal 2 karakter dan maksimal 90 karakter)."
      });
    }
    const businessField = String(rawBusinessField || "").replace(/\s+/g, " ").trim().slice(0, 100);
    if (businessField.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Bidang usaha wajib diisi (minimal 2 karakter)."
      });
    }
    const parts = rawAddressParts && typeof rawAddressParts === "object" ? {
      street: String(rawAddressParts.street || "").replace(/\s+/g, " ").trim().slice(0, 75),
      village: String(rawAddressParts.village || "").replace(/\s+/g, " ").trim().slice(0, 40),
      district: String(rawAddressParts.district || "").replace(/\s+/g, " ").trim().slice(0, 40),
      cityType: rawAddressParts.cityType === "Kab." ? "Kab." : "Kota",
      city: String(rawAddressParts.city || "").replace(/\s+/g, " ").trim().slice(0, 40),
      province: String(rawAddressParts.province || "").replace(/\s+/g, " ").trim().slice(0, 50),
      postalCode: String(rawAddressParts.postalCode || "").replace(/[^\d]/g, "").slice(0, 5)
    } : void 0;
    if (parts) {
      if (!parts.street || !parts.village || !parts.district || !parts.city || !parts.province) {
        return res.status(400).json({
          success: false,
          message: "Alamat perusahaan wajib dilengkapi berurutan (Jalan, Desa/Kelurahan, Kecamatan, Kab/Kota, dan Provinsi)."
        });
      }
    }
    const assembledAddress = formatStructuredProspectAddress(parts, String(rawCompanyAddress || "").trim());
    if (assembledAddress.length < 10 || assembledAddress.length > 220) {
      return res.status(400).json({
        success: false,
        message: "Alamat perusahaan tidak valid atau terlalu panjang (maksimal 220 karakter)."
      });
    }
    const targetMitraId = actorRole === "mitra" ? String(actorId || rawMitraId || "").trim() : String(rawMitraId || "").trim();
    const targetMitra = mitras.find((m) => m.id === targetMitraId);
    if (!targetMitra) {
      return res.status(404).json({
        success: false,
        message: "Mitra tujuan tidak ditemukan. Silakan pilih Mitra yang terdaftar."
      });
    }
    if (actorRole === "mitra" && targetMitra.status !== "verified") {
      return res.status(403).json({
        success: false,
        code: "MITRA_NOT_VERIFIED",
        message: "Akun Anda belum diverifikasi Admin sehingga belum dapat membuat surat penawaran."
      });
    }
    if (isMitraDataIncomplete(targetMitra, appSettings)) {
      return res.status(403).json({
        success: false,
        code: "MITRA_PROFILE_INCOMPLETE",
        message: actorRole === "mitra" ? "Data Diri Anda belum lengkap. Mohon lengkapi NIK/NPWP, berkas KTP/NPWP, nomor WhatsApp, serta rekening bank pencairan komisi terlebih dahulu sebelum membuat surat penawaran." : `Data Diri Mitra "${targetMitra.fullName}" belum lengkap (NIK/NPWP, berkas KTP/NPWP, nomor WhatsApp, atau rekening bank). Lengkapi data mitra terlebih dahulu sebelum membuat surat penawaran.`
      });
    }
    const clientReqToken = String(rawClientRequestId || "").trim().slice(0, 80);
    const idempotencyKey = clientReqToken ? `${String(actorId || targetMitra.id)}::${targetMitra.id}::${clientReqToken}` : "";
    const result = await withProspectMutationLock(async () => {
      pruneExpiredProspectCreateRequests();
      if (idempotencyKey) {
        const cached = recentProspectCreateRequests.get(idempotencyKey);
        if (cached && cached.expiresAt > Date.now()) {
          return { status: 201, body: { success: true, message: `Surat penawaran ${cached.letter.letterNumber} untuk ${cached.letter.companyName} berhasil diterbitkan.`, data: cached.letter } };
        }
      }
      const dupCheck = checkProspectCompanyDuplicates(companyName, prospectLetters, targetMitra.id);
      if (dupCheck.blocked && dupCheck.exactMatches.length > 0) {
        const conflict = dupCheck.exactMatches[0];
        return {
          status: 409,
          body: {
            success: false,
            code: "COMPANY_ALREADY_CLAIMED",
            message: `Perusahaan "${conflict.companyName}" sudah dibuatkan surat penawaran oleh Mitra lain (${conflict.mitraName} \xB7 ${conflict.mitraMemberCode}). Mitra lain tidak dapat membuat penawaran untuk perusahaan yang sama.`,
            exactMatches: dupCheck.exactMatches
          }
        };
      }
      const effectiveContent = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
      let createdLetter = null;
      const MAX_ALLOC_ATTEMPTS = 5;
      for (let attempt = 0; attempt < MAX_ALLOC_ATTEMPTS; attempt++) {
        const now = /* @__PURE__ */ new Date();
        const { sequenceNumber, letterNumber, verificationCode, letterDate } = await allocateUniqueProspectLetterMeta(now);
        const candidateLetter = {
          id: `prsp-${Date.now()}-${crypto2.randomBytes(3).toString("hex")}`,
          letterNumber,
          sequenceNumber,
          verificationCode,
          letterDate,
          companyName,
          businessField,
          companyAddress: assembledAddress,
          addressParts: parts,
          mitraId: targetMitra.id,
          mitraName: targetMitra.fullName,
          mitraMemberCode: targetMitra.memberCode || "-",
          mitraPhone: targetMitra.phone || "-",
          mitraEmail: targetMitra.email || "-",
          directorName: effectiveContent.directorName || DEFAULT_PROSPECT_LETTER_CONTENT.directorName,
          directorTitle: effectiveContent.directorTitle || DEFAULT_PROSPECT_LETTER_CONTENT.directorTitle,
          createdByRole: actorRole,
          createdByName: String(actorName || targetMitra.fullName || "Sistem").trim(),
          createdById: String(actorId || targetMitra.id || "").trim(),
          createdAt: now.toISOString()
        };
        prospectLetters.unshift(candidateLetter);
        const persistRes = await persistProspectLettersToMysql(candidateLetter);
        if (persistRes.duplicateNumber) {
          prospectLetters.shift();
          continue;
        }
        createdLetter = candidateLetter;
        saveDatabase();
        break;
      }
      if (!createdLetter) {
        return {
          status: 503,
          body: {
            success: false,
            message: "Sistem sedang memproses banyak penerbitan surat secara bersamaan. Silakan coba klik simpan kembali."
          }
        };
      }
      if (idempotencyKey) {
        recentProspectCreateRequests.set(idempotencyKey, {
          letter: createdLetter,
          expiresAt: Date.now() + PROSPECT_IDEMPOTENCY_TTL_MS
        });
      }
      recordActivity({
        actorRole,
        actorId: String(actorId || targetMitra.id),
        actorName: String(actorName || targetMitra.fullName),
        actorEmail: String(actorEmail || targetMitra.email),
        actionType: "prospect_create",
        operation: "CREATE",
        targetEntity: `Surat Prospek ${createdLetter.letterNumber}`,
        description: actorRole === "mitra" ? `Mitra ${targetMitra.fullName} membuat surat penawaran ${createdLetter.letterNumber} untuk ${companyName} (Bidang: ${businessField}).` : `${actorRole === "admin" ? "Admin" : "Staf"} (${actorName || "Tim Operasional"}) membuat surat penawaran ${createdLetter.letterNumber} untuk ${companyName} (Bidang: ${businessField}) atas nama Mitra ${targetMitra.fullName}.`
      });
      return {
        status: 201,
        body: {
          success: true,
          message: `Surat penawaran ${createdLetter.letterNumber} untuk ${companyName} berhasil diterbitkan.`,
          data: createdLetter
        }
      };
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[Prospect Create Error]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat surat penawaran prospek."
    });
  }
});
app.put("/api/prospects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyName: rawCompanyName,
      businessField: rawBusinessField,
      addressParts: rawAddressParts,
      companyAddress: rawCompanyAddress,
      mitraId: rawMitraId,
      actorRole: rawActorRole,
      actorId,
      actorName,
      actorEmail
    } = req.body || {};
    const actorRole = rawActorRole === "admin" || rawActorRole === "staff" ? rawActorRole : "mitra";
    const result = await withProspectMutationLock(async () => {
      const idx = prospectLetters.findIndex((l) => l.id === id);
      if (idx === -1) {
        return { status: 404, body: { success: false, message: "Data surat prospek tidak ditemukan." } };
      }
      const existing = prospectLetters[idx];
      if (actorRole === "mitra") {
        const normalizedActorId = String(actorId || "").trim();
        if (!normalizedActorId || existing.mitraId !== normalizedActorId) {
          return {
            status: 403,
            body: {
              success: false,
              message: "Anda hanya dapat mengedit surat penawaran milik Anda sendiri."
            }
          };
        }
      }
      const companyName = rawCompanyName !== void 0 ? String(rawCompanyName || "").replace(/\s+/g, " ").trim() : existing.companyName;
      if (companyName.length < 2 || companyName.length > 90) {
        return {
          status: 400,
          body: {
            success: false,
            message: "Nama perusahaan wajib diisi (minimal 2 karakter dan maksimal 90 karakter)."
          }
        };
      }
      const nextBusinessField = rawBusinessField !== void 0 ? String(rawBusinessField || "").replace(/\s+/g, " ").trim().slice(0, 100) : existing.businessField || "";
      if (rawBusinessField !== void 0 && nextBusinessField.length < 2) {
        return {
          status: 400,
          body: {
            success: false,
            message: "Bidang usaha wajib diisi (minimal 2 karakter)."
          }
        };
      }
      let nextParts = existing.addressParts;
      let nextAddress = existing.companyAddress;
      if (rawAddressParts && typeof rawAddressParts === "object") {
        const parts = {
          street: String(rawAddressParts.street || "").replace(/\s+/g, " ").trim().slice(0, 75),
          village: String(rawAddressParts.village || "").replace(/\s+/g, " ").trim().slice(0, 40),
          district: String(rawAddressParts.district || "").replace(/\s+/g, " ").trim().slice(0, 40),
          cityType: rawAddressParts.cityType === "Kab." ? "Kab." : "Kota",
          city: String(rawAddressParts.city || "").replace(/\s+/g, " ").trim().slice(0, 40),
          province: String(rawAddressParts.province || "").replace(/\s+/g, " ").trim().slice(0, 50),
          postalCode: String(rawAddressParts.postalCode || "").replace(/[^\d]/g, "").slice(0, 5)
        };
        if (!parts.street || !parts.village || !parts.district || !parts.city || !parts.province) {
          return {
            status: 400,
            body: {
              success: false,
              message: "Alamat perusahaan wajib dilengkapi berurutan (Jalan, Desa/Kelurahan, Kecamatan, Kab/Kota, dan Provinsi)."
            }
          };
        }
        nextParts = parts;
        nextAddress = formatStructuredProspectAddress(parts, existing.companyAddress);
      } else if (typeof rawCompanyAddress === "string" && rawCompanyAddress.trim()) {
        nextAddress = rawCompanyAddress.replace(/\s+/g, " ").trim();
      }
      if (nextAddress.length < 10 || nextAddress.length > 220) {
        return {
          status: 400,
          body: {
            success: false,
            message: "Alamat perusahaan tidak valid atau terlalu panjang (maksimal 220 karakter)."
          }
        };
      }
      let nextMitra = mitras.find((m) => m.id === existing.mitraId) || null;
      if ((actorRole === "admin" || actorRole === "staff") && rawMitraId && String(rawMitraId).trim() !== existing.mitraId) {
        const reassigned = mitras.find((m) => m.id === String(rawMitraId).trim());
        if (!reassigned) {
          return {
            status: 404,
            body: {
              success: false,
              message: "Mitra tujuan tidak ditemukan."
            }
          };
        }
        nextMitra = reassigned;
      }
      const effectiveMitraId = nextMitra ? nextMitra.id : existing.mitraId;
      const dupCheck = checkProspectCompanyDuplicates(
        companyName,
        prospectLetters,
        effectiveMitraId,
        existing.id
      );
      if (dupCheck.blocked && dupCheck.exactMatches.length > 0) {
        const conflict = dupCheck.exactMatches[0];
        return {
          status: 409,
          body: {
            success: false,
            code: "COMPANY_ALREADY_CLAIMED",
            message: `Perusahaan "${conflict.companyName}" sudah dibuatkan surat penawaran oleh Mitra lain (${conflict.mitraName} \xB7 ${conflict.mitraMemberCode}). Tidak dapat menggunakan perusahaan yang sama.`,
            exactMatches: dupCheck.exactMatches
          }
        };
      }
      const effectiveContent = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
      const updatedLetter = {
        ...existing,
        // Explicitly keep issued numbering metadata immutable
        letterNumber: existing.letterNumber,
        sequenceNumber: existing.sequenceNumber,
        verificationCode: existing.verificationCode,
        letterDate: existing.letterDate,
        companyName,
        businessField: nextBusinessField || existing.businessField,
        companyAddress: nextAddress,
        addressParts: nextParts,
        customContent: void 0,
        mitraId: effectiveMitraId,
        mitraName: nextMitra ? nextMitra.fullName : existing.mitraName,
        mitraMemberCode: nextMitra ? nextMitra.memberCode || "-" : existing.mitraMemberCode,
        mitraPhone: nextMitra ? nextMitra.phone || "-" : existing.mitraPhone,
        mitraEmail: nextMitra ? nextMitra.email || "-" : existing.mitraEmail,
        directorName: effectiveContent.directorName || existing.directorName || DEFAULT_PROSPECT_LETTER_CONTENT.directorName,
        directorTitle: effectiveContent.directorTitle || existing.directorTitle || DEFAULT_PROSPECT_LETTER_CONTENT.directorTitle,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      prospectLetters[idx] = updatedLetter;
      recordUsedProspectLetterMeta(updatedLetter);
      saveDatabase();
      await persistProspectLettersToMysql(updatedLetter);
      recordActivity({
        actorRole,
        actorId: String(actorId || updatedLetter.mitraId),
        actorName: String(actorName || updatedLetter.mitraName),
        actorEmail: actorEmail ? String(actorEmail) : void 0,
        actionType: "prospect_update",
        operation: "UPDATE",
        targetEntity: `Surat Prospek ${updatedLetter.letterNumber}`,
        description: `Memperbarui surat penawaran ${updatedLetter.letterNumber} untuk ${updatedLetter.companyName} (Mitra: ${updatedLetter.mitraName}).`
      });
      return {
        status: 200,
        body: {
          success: true,
          message: `Surat penawaran ${updatedLetter.letterNumber} berhasil diperbarui.`,
          data: updatedLetter
        }
      };
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[Prospect Update Error]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui surat penawaran prospek."
    });
  }
});
app.delete("/api/prospects/:id", async (req, res) => {
  const { id } = req.params;
  const actorRoleRaw = String(req.body?.actorRole || req.query.actorRole || "admin").trim();
  const actorId = String(req.body?.actorId || req.query.actorId || "").trim();
  const actorName = String(req.body?.actorName || req.query.actorName || "Admin Operasional").trim();
  const actorEmail = String(req.body?.actorEmail || req.query.actorEmail || "").trim();
  const result = await withProspectMutationLock(async () => {
    const idx = prospectLetters.findIndex((l) => l.id === id);
    if (idx === -1) {
      return { status: 404, body: { success: false, message: "Data surat prospek tidak ditemukan." } };
    }
    const existing = prospectLetters[idx];
    if (actorRoleRaw === "mitra" && (!actorId || existing.mitraId !== actorId)) {
      return {
        status: 403,
        body: {
          success: false,
          message: "Anda hanya dapat menghapus surat penawaran milik Anda sendiri."
        }
      };
    }
    recordUsedProspectLetterMeta(existing);
    prospectLetters.splice(idx, 1);
    saveDatabase();
    await persistProspectLettersToMysql(void 0, id);
    recordActivity({
      actorRole: actorRoleRaw === "mitra" ? "mitra" : actorRoleRaw === "staff" ? "staff" : "admin",
      actorId: actorId || void 0,
      actorName,
      actorEmail: actorEmail || void 0,
      actionType: "prospect_delete",
      operation: "DELETE",
      targetEntity: `Surat Prospek ${existing.letterNumber}`,
      description: `Menghapus surat penawaran ${existing.letterNumber} (${existing.companyName}) milik Mitra ${existing.mitraName}. Nomor surat tetap dicatat sebagai terpakai.`
    });
    return {
      status: 200,
      body: {
        success: true,
        message: `Surat penawaran ${existing.letterNumber} berhasil dihapus.`
      }
    };
  });
  return res.status(result.status).json(result.body);
});
var sanitizeSphServices = (rawServices) => {
  if (!Array.isArray(rawServices)) return [];
  const validKeys = /* @__PURE__ */ new Set(["accounting", "tax", "finance", "legal", "other"]);
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of rawServices) {
    if (!item || typeof item !== "object") continue;
    const s = item;
    const key = String(s.serviceKey || "").trim();
    if (!validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    const monthlyPrice = Math.max(0, Math.round(Number(s.monthlyPrice) || 0));
    const defaultMonthlyPrice = Math.max(0, Math.round(Number(s.defaultMonthlyPrice) || 0));
    const scopeItems = Array.isArray(s.scopeItems) ? s.scopeItems.filter((sc) => sc && (sc.idText || sc.enText)).map((sc) => ({
      idText: String(sc.idText || "").trim(),
      enText: String(sc.enText || sc.idText || "").trim()
    })) : [];
    const unitType = s.unitType === "transaction" ? "transaction" : s.unitType === "package" ? "package" : "journal";
    out.push({
      serviceKey: key,
      serviceId: s.serviceId ? String(s.serviceId) : void 0,
      serviceNameId: String(s.serviceNameId || "Jasa Bulanan").trim(),
      serviceNameEn: String(s.serviceNameEn || "Monthly Service").trim(),
      unitType,
      turnoverTierId: s.turnoverTierId || "up_to_1b",
      turnoverLabelId: String(s.turnoverLabelId || "Rp0 - Rp1 Miliar").trim(),
      turnoverLabelEn: String(s.turnoverLabelEn || "Rp0 - Rp1 Billion").trim(),
      volumeTierId: s.volumeTierId || "0_50",
      volumeLabelId: String(s.volumeLabelId || "0-50 Jurnal/Bulan").trim(),
      volumeLabelEn: String(s.volumeLabelEn || "0-50 Journals/Month").trim(),
      defaultMonthlyPrice,
      monthlyPrice,
      isNegotiation: Boolean(s.isNegotiation),
      scopeItems
    });
  }
  return out;
};
var computeSphCounts = (list) => {
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  for (const s of list) {
    if (s.status === "approved") approved += 1;
    else if (s.status === "rejected") rejected += 1;
    else pending += 1;
  }
  return { total: list.length, pending, approved, rejected };
};
app.get("/api/sph", async (req, res) => {
  if (db) {
    await syncFromMysql();
  }
  const prospectLetterId = String(req.query.prospectLetterId || "").trim();
  const mitraId = String(req.query.mitraId || "").trim();
  const status = String(req.query.status || "").trim();
  const search = String(req.query.search || "").trim().toLowerCase();
  let list = [...sphDocuments].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  if (prospectLetterId) {
    list = list.filter((s) => s.prospectLetterId === prospectLetterId);
  }
  if (mitraId) {
    list = list.filter((s) => s.mitraId === mitraId);
  }
  const counts = computeSphCounts(list);
  if (status && status !== "all") {
    list = list.filter((s) => s.status === status);
  }
  if (search) {
    list = list.filter(
      (s) => s.sphNumber.toLowerCase().includes(search) || s.companyName.toLowerCase().includes(search) || s.mitraName.toLowerCase().includes(search) || s.prospectLetterNumber.toLowerCase().includes(search) || s.services.some((sv) => sv.serviceNameId.toLowerCase().includes(search))
    );
  }
  return res.json({ success: true, data: list, counts });
});
app.post("/api/sph", async (req, res) => {
  try {
    if (db) {
      await syncFromMysql();
    }
    const {
      prospectLetterId,
      services: rawServices,
      discountType: rawDiscountType,
      discountValue: rawDiscountValue,
      durationMonths: rawDuration,
      clientSignerName,
      clientSignerTitleId,
      clientSignerTitleEn,
      notes,
      autoApprove,
      actorRole: rawActorRole,
      actorName,
      actorId,
      actorEmail
    } = req.body || {};
    const actorRole = rawActorRole === "admin" ? "admin" : rawActorRole === "staff" ? "staff" : "mitra";
    const letter = prospectLetters.find((l) => l.id === String(prospectLetterId || "").trim());
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: "Surat penawaran prospek referensi tidak ditemukan."
      });
    }
    if (actorRole === "mitra" && actorId && letter.mitraId !== String(actorId)) {
      return res.status(403).json({
        success: false,
        message: "Anda hanya dapat membuat SPH untuk surat penawaran milik Anda sendiri."
      });
    }
    const sanitizedServices = sanitizeSphServices(rawServices);
    if (sanitizedServices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Pilih minimal 1 layanan bulanan untuk membuat SPH."
      });
    }
    if (sanitizedServices.some((s) => s.monthlyPrice <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Setiap layanan yang dipilih wajib memiliki nominal harga bulanan lebih dari Rp0."
      });
    }
    const normalTotalMonthly = sanitizedServices.reduce((sum, s) => sum + s.monthlyPrice, 0);
    const discountType = rawDiscountType === "percent" || rawDiscountType === "amount" || rawDiscountType === "special_package" ? rawDiscountType : "none";
    const numericDiscountInput = Math.max(0, Number(rawDiscountValue) || 0);
    let discountValue = 0;
    let discountAmount = 0;
    let finalTotalMonthly = normalTotalMonthly;
    if (discountType === "percent") {
      discountValue = Math.min(90, numericDiscountInput);
      discountAmount = Math.round(normalTotalMonthly * discountValue / 100);
      finalTotalMonthly = Math.max(0, normalTotalMonthly - discountAmount);
    } else if (discountType === "amount") {
      discountValue = Math.min(normalTotalMonthly, Math.round(numericDiscountInput));
      discountAmount = discountValue;
      finalTotalMonthly = Math.max(0, normalTotalMonthly - discountAmount);
    } else if (discountType === "special_package") {
      const pkg = numericDiscountInput > 0 ? Math.min(normalTotalMonthly, Math.round(numericDiscountInput)) : normalTotalMonthly;
      discountValue = pkg;
      discountAmount = Math.max(0, normalTotalMonthly - pkg);
      finalTotalMonthly = pkg;
    }
    if (finalTotalMonthly <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total harga akhir penawaran harus lebih dari Rp0."
      });
    }
    const durationMonths = Math.max(1, Math.min(60, Math.round(Number(rawDuration) || 12)));
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const { sequenceNumber, sphNumber, sphDate } = allocateUniqueSphMeta(/* @__PURE__ */ new Date());
    const isAdminAutoApprove = (actorRole === "admin" || actorRole === "staff") && Boolean(autoApprove);
    const resolvedMaster = resolveProspectLetterContent(void 0, appSettings.prospectLetterTemplate);
    const newSph = {
      id: `sph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sphNumber,
      sequenceNumber,
      sphDate,
      prospectLetterId: letter.id,
      prospectLetterNumber: letter.letterNumber,
      mitraId: letter.mitraId,
      mitraName: letter.mitraName,
      mitraMemberCode: letter.mitraMemberCode,
      mitraPhone: letter.mitraPhone,
      mitraEmail: letter.mitraEmail,
      companyName: letter.companyName,
      companyAddress: letter.companyAddress,
      businessField: letter.businessField,
      pricingSystem: "monthly_subscription",
      services: sanitizedServices,
      normalTotalMonthly,
      discountType,
      discountValue,
      discountAmount,
      finalTotalMonthly,
      durationMonths,
      directorName: resolvedMaster.directorName || letter.directorName || DEFAULT_PROSPECT_LETTER_CONTENT.directorName,
      directorTitleId: resolvedMaster.directorTitle || letter.directorTitle || DEFAULT_PROSPECT_LETTER_CONTENT.directorTitle,
      directorTitleEn: "Managing Director",
      clientSignerName: clientSignerName ? String(clientSignerName).trim().slice(0, 100) : "",
      clientSignerTitleId: clientSignerTitleId ? String(clientSignerTitleId).trim().slice(0, 100) : "",
      clientSignerTitleEn: clientSignerTitleEn ? String(clientSignerTitleEn).trim().slice(0, 100) : "",
      notes: notes ? String(notes).trim().slice(0, 600) : "",
      status: isAdminAutoApprove ? "approved" : "pending",
      approvedAt: isAdminAutoApprove ? nowIso : void 0,
      approvedBy: isAdminAutoApprove ? String(actorName || "Admin Operasional") : void 0,
      createdByRole: actorRole,
      createdByName: String(actorName || letter.mitraName),
      createdById: actorId ? String(actorId) : void 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    sphDocuments.unshift(newSph);
    saveDatabase();
    await persistSphDocumentsToCloud();
    const serviceSummary = sanitizedServices.map((s) => s.serviceNameId).join(" + ");
    const notif = isAdminAutoApprove ? {
      id: `notif-mtr-${newSph.mitraId}-${Date.now()}`,
      title: "SPH Baru Diterbitkan & Disetujui",
      message: `SPH ${newSph.sphNumber} untuk ${newSph.companyName} (${serviceSummary}) telah dibuat & disetujui Admin. Dokumen PDF SPH siap diunduh.`,
      type: "client_deal",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: newSph.mitraId
    } : {
      id: `notif-adm-sph-${Date.now()}`,
      title: "Pengajuan SPH Baru Menunggu Persetujuan",
      message: `Mitra ${newSph.mitraName} mengajukan SPH ${newSph.sphNumber} untuk ${newSph.companyName} (${serviceSummary}, Rp${newSph.finalTotalMonthly.toLocaleString("id-ID")}/bln). Mohon tinjau & approve/tolak.`,
      type: "client_deal",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "admin_staff"
    };
    notifications.unshift(notif);
    saveDatabase();
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch (e) {
        console.warn("MySQL SPH notification insert warning:", e);
      }
    }
    recordActivity({
      actorRole,
      actorId: String(actorId || letter.mitraId),
      actorName: String(actorName || letter.mitraName),
      actorEmail: actorEmail ? String(actorEmail) : void 0,
      actionType: "sph_create",
      operation: "CREATE",
      targetEntity: `SPH ${newSph.sphNumber}`,
      description: `Membuat SPH ${newSph.sphNumber} untuk ${newSph.companyName} (${serviceSummary}) senilai Rp${newSph.finalTotalMonthly.toLocaleString("id-ID")}/bln.`
    });
    return res.status(201).json({
      success: true,
      message: isAdminAutoApprove ? `SPH ${newSph.sphNumber} berhasil dibuat dan langsung disetujui.` : `Pengajuan SPH ${newSph.sphNumber} berhasil dikirim ke Admin untuk persetujuan.`,
      data: newSph
    });
  } catch (err) {
    console.error("[SPH Create Error]", err);
    return res.status(500).json({ success: false, message: "Gagal membuat SPH." });
  }
});
app.put("/api/sph/:id", async (req, res) => {
  try {
    if (db) {
      await syncFromMysql();
    }
    const { id } = req.params;
    const idx = sphDocuments.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Data SPH tidak ditemukan." });
    }
    const existing = sphDocuments[idx];
    const {
      services: rawServices,
      discountType: rawDiscountType,
      discountValue: rawDiscountValue,
      durationMonths: rawDuration,
      clientSignerName,
      clientSignerTitleId,
      clientSignerTitleEn,
      notes,
      autoApprove,
      actorRole: rawActorRole,
      actorName,
      actorId,
      actorEmail
    } = req.body || {};
    const actorRole = rawActorRole === "admin" ? "admin" : rawActorRole === "staff" ? "staff" : "mitra";
    if (actorRole === "mitra") {
      if (!actorId || existing.mitraId !== String(actorId)) {
        return res.status(403).json({
          success: false,
          message: "Anda hanya dapat mengubah SPH milik Anda sendiri."
        });
      }
      if (existing.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "SPH yang sudah disetujui Admin tidak dapat diubah lagi. Buat SPH baru jika memerlukan penawaran berbeda."
        });
      }
    }
    const sanitizedServices = sanitizeSphServices(rawServices);
    if (sanitizedServices.length === 0 || sanitizedServices.some((s) => s.monthlyPrice <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Pilih minimal 1 layanan bulanan dengan nominal harga lebih dari Rp0."
      });
    }
    const normalTotalMonthly = sanitizedServices.reduce((sum, s) => sum + s.monthlyPrice, 0);
    const discountType = rawDiscountType === "percent" || rawDiscountType === "amount" || rawDiscountType === "special_package" ? rawDiscountType : "none";
    const numericDiscountInput = Math.max(0, Number(rawDiscountValue) || 0);
    let discountValue = 0;
    let discountAmount = 0;
    let finalTotalMonthly = normalTotalMonthly;
    if (discountType === "percent") {
      discountValue = Math.min(90, numericDiscountInput);
      discountAmount = Math.round(normalTotalMonthly * discountValue / 100);
      finalTotalMonthly = Math.max(0, normalTotalMonthly - discountAmount);
    } else if (discountType === "amount") {
      discountValue = Math.min(normalTotalMonthly, Math.round(numericDiscountInput));
      discountAmount = discountValue;
      finalTotalMonthly = Math.max(0, normalTotalMonthly - discountAmount);
    } else if (discountType === "special_package") {
      const pkg = numericDiscountInput > 0 ? Math.min(normalTotalMonthly, Math.round(numericDiscountInput)) : normalTotalMonthly;
      discountValue = pkg;
      discountAmount = Math.max(0, normalTotalMonthly - pkg);
      finalTotalMonthly = pkg;
    }
    if (finalTotalMonthly <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total harga akhir penawaran harus lebih dari Rp0."
      });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const isAdminAutoApprove = (actorRole === "admin" || actorRole === "staff") && Boolean(autoApprove);
    const nextStatus = actorRole === "mitra" ? "pending" : isAdminAutoApprove ? "approved" : existing.status;
    const updated = {
      ...existing,
      services: sanitizedServices,
      normalTotalMonthly,
      discountType,
      discountValue,
      discountAmount,
      finalTotalMonthly,
      durationMonths: Math.max(1, Math.min(60, Math.round(Number(rawDuration) || existing.durationMonths || 12))),
      clientSignerName: clientSignerName !== void 0 ? String(clientSignerName).trim().slice(0, 100) : existing.clientSignerName,
      clientSignerTitleId: clientSignerTitleId !== void 0 ? String(clientSignerTitleId).trim().slice(0, 100) : existing.clientSignerTitleId,
      clientSignerTitleEn: clientSignerTitleEn !== void 0 ? String(clientSignerTitleEn).trim().slice(0, 100) : existing.clientSignerTitleEn,
      notes: notes !== void 0 ? String(notes).trim().slice(0, 600) : existing.notes,
      status: nextStatus,
      rejectionReason: nextStatus === "pending" || nextStatus === "approved" ? void 0 : existing.rejectionReason,
      rejectedAt: nextStatus === "pending" || nextStatus === "approved" ? void 0 : existing.rejectedAt,
      rejectedBy: nextStatus === "pending" || nextStatus === "approved" ? void 0 : existing.rejectedBy,
      approvedAt: nextStatus === "approved" ? existing.approvedAt || nowIso : void 0,
      approvedBy: nextStatus === "approved" ? existing.approvedBy || String(actorName || "Admin Operasional") : void 0,
      updatedAt: nowIso
    };
    sphDocuments[idx] = updated;
    saveDatabase();
    await persistSphDocumentsToCloud();
    if (actorRole === "mitra") {
      const notif = {
        id: `notif-adm-sph-rev-${Date.now()}`,
        title: "Revisi Pengajuan SPH dari Mitra",
        message: `Mitra ${updated.mitraName} mengajukan ulang revisi SPH ${updated.sphNumber} untuk ${updated.companyName} (Rp${updated.finalTotalMonthly.toLocaleString("id-ID")}/bln).`,
        type: "client_deal",
        timestamp: nowIso,
        isRead: false,
        targetAudience: "admin_staff"
      };
      notifications.unshift(notif);
      saveDatabase();
      if (db) {
        try {
          await db.from("notifications").insert([toDbNotification(notif)]);
        } catch {
        }
      }
    }
    recordActivity({
      actorRole,
      actorId: String(actorId || updated.mitraId),
      actorName: String(actorName || updated.mitraName),
      actorEmail: actorEmail ? String(actorEmail) : void 0,
      actionType: "sph_update",
      operation: "UPDATE",
      targetEntity: `SPH ${updated.sphNumber}`,
      description: `Memperbarui SPH ${updated.sphNumber} (${updated.companyName}) menjadi Rp${updated.finalTotalMonthly.toLocaleString("id-ID")}/bln.`
    });
    return res.json({
      success: true,
      message: actorRole === "mitra" ? `Revisi SPH ${updated.sphNumber} berhasil dikirim ulang ke Admin.` : `SPH ${updated.sphNumber} berhasil diperbarui.`,
      data: updated
    });
  } catch (err) {
    console.error("[SPH Update Error]", err);
    return res.status(500).json({ success: false, message: "Gagal memperbarui SPH." });
  }
});
app.put("/api/sph/:id/approve", async (req, res) => {
  try {
    if (db) {
      await syncFromMysql();
    }
    const { id } = req.params;
    const { actorRole, actorName, actorId, actorEmail } = req.body || {};
    if (actorRole === "mitra") {
      return res.status(403).json({
        success: false,
        message: "Hanya Admin atau Staf yang dapat menyetujui SPH."
      });
    }
    const idx = sphDocuments.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Data SPH tidak ditemukan." });
    }
    const existing = sphDocuments[idx];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const approverName = String(actorName || "Admin Operasional").trim();
    const approved = {
      ...existing,
      status: "approved",
      approvedAt: nowIso,
      approvedBy: approverName,
      rejectionReason: void 0,
      rejectedAt: void 0,
      rejectedBy: void 0,
      updatedAt: nowIso
    };
    sphDocuments[idx] = approved;
    saveDatabase();
    await persistSphDocumentsToCloud();
    const notif = {
      id: `notif-mtr-${approved.mitraId}-${Date.now()}`,
      title: "SPH Disetujui \u2014 Siap Diunduh",
      message: `Pengajuan SPH ${approved.sphNumber} untuk ${approved.companyName} telah disetujui oleh ${approverName}. Anda kini dapat mengunduh PDF SPH resmi.`,
      type: "verification",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: approved.mitraId
    };
    notifications.unshift(notif);
    saveDatabase();
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch {
      }
    }
    recordActivity({
      actorRole: actorRole === "staff" ? "staff" : "admin",
      actorId: actorId ? String(actorId) : void 0,
      actorName: approverName,
      actorEmail: actorEmail ? String(actorEmail) : void 0,
      actionType: "sph_approve",
      operation: "UPDATE",
      targetEntity: `SPH ${approved.sphNumber}`,
      description: `Menyetujui (Approve) SPH ${approved.sphNumber} untuk ${approved.companyName} milik Mitra ${approved.mitraName}.`
    });
    return res.json({
      success: true,
      message: `SPH ${approved.sphNumber} berhasil disetujui. Mitra kini dapat mengunduh PDF SPH.`,
      data: approved
    });
  } catch (err) {
    console.error("[SPH Approve Error]", err);
    return res.status(500).json({ success: false, message: "Gagal menyetujui SPH." });
  }
});
app.put("/api/sph/:id/reject", async (req, res) => {
  try {
    if (db) {
      await syncFromMysql();
    }
    const { id } = req.params;
    const { rejectionReason, actorRole, actorName, actorId, actorEmail } = req.body || {};
    if (actorRole === "mitra") {
      return res.status(403).json({
        success: false,
        message: "Hanya Admin atau Staf yang dapat menolak SPH."
      });
    }
    const cleanReason = String(rejectionReason || "").trim();
    if (cleanReason.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi agar Mitra mengetahui informasi revisinya."
      });
    }
    const idx = sphDocuments.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Data SPH tidak ditemukan." });
    }
    const existing = sphDocuments[idx];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const rejectorName = String(actorName || "Admin Operasional").trim();
    const rejected = {
      ...existing,
      status: "rejected",
      rejectionReason: cleanReason.slice(0, 800),
      rejectedAt: nowIso,
      rejectedBy: rejectorName,
      approvedAt: void 0,
      approvedBy: void 0,
      updatedAt: nowIso
    };
    sphDocuments[idx] = rejected;
    saveDatabase();
    await persistSphDocumentsToCloud();
    const notif = {
      id: `notif-mtr-${rejected.mitraId}-${Date.now()}`,
      title: "Pengajuan SPH Ditolak Admin",
      message: `SPH ${rejected.sphNumber} untuk ${rejected.companyName} ditolak oleh ${rejectorName}. Alasan: ${rejected.rejectionReason}`,
      type: "verification",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: rejected.mitraId
    };
    notifications.unshift(notif);
    saveDatabase();
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(notif)]);
      } catch {
      }
    }
    recordActivity({
      actorRole: actorRole === "staff" ? "staff" : "admin",
      actorId: actorId ? String(actorId) : void 0,
      actorName: rejectorName,
      actorEmail: actorEmail ? String(actorEmail) : void 0,
      actionType: "sph_reject",
      operation: "UPDATE",
      targetEntity: `SPH ${rejected.sphNumber}`,
      description: `Menolak SPH ${rejected.sphNumber} untuk ${rejected.companyName} milik Mitra ${rejected.mitraName}. Alasan: ${rejected.rejectionReason}`
    });
    return res.json({
      success: true,
      message: `SPH ${rejected.sphNumber} telah ditolak dan alasan dikirimkan ke Mitra.`,
      data: rejected
    });
  } catch (err) {
    console.error("[SPH Reject Error]", err);
    return res.status(500).json({ success: false, message: "Gagal menolak SPH." });
  }
});
app.delete("/api/sph/:id", async (req, res) => {
  try {
    if (db) {
      await syncFromMysql();
    }
    const { id } = req.params;
    const actorRoleRaw = String(req.body?.actorRole || req.query.actorRole || "admin").trim();
    const actorId = String(req.body?.actorId || req.query.actorId || "").trim();
    const actorName = String(req.body?.actorName || req.query.actorName || "Admin Operasional").trim();
    const actorEmail = String(req.body?.actorEmail || req.query.actorEmail || "").trim();
    const idx = sphDocuments.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Data SPH tidak ditemukan." });
    }
    const existing = sphDocuments[idx];
    if (actorRoleRaw === "mitra" && (!actorId || existing.mitraId !== actorId)) {
      return res.status(403).json({
        success: false,
        message: "Anda hanya dapat menghapus SPH milik Anda sendiri."
      });
    }
    reconcileSphSequenceState();
    sphDocuments.splice(idx, 1);
    saveDatabase();
    await persistSphDocumentsToCloud();
    recordActivity({
      actorRole: actorRoleRaw === "mitra" ? "mitra" : actorRoleRaw === "staff" ? "staff" : "admin",
      actorId: actorId || void 0,
      actorName,
      actorEmail: actorEmail || void 0,
      actionType: "sph_delete",
      operation: "DELETE",
      targetEntity: `SPH ${existing.sphNumber}`,
      description: `Menghapus SPH ${existing.sphNumber} (${existing.companyName}) milik Mitra ${existing.mitraName}.`
    });
    return res.json({
      success: true,
      message: `SPH ${existing.sphNumber} berhasil dihapus.`
    });
  } catch (err) {
    console.error("[SPH Delete Error]", err);
    return res.status(500).json({ success: false, message: "Gagal menghapus SPH." });
  }
});
app.get("/api/analytics/monthly", async (req, res) => {
  if (db) {
    await syncFromMysql();
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

Berdasarkan konsolidasi metrik operasional NDTAXANDLAW dari database MySQL pada periode **November 2026**, performa kemitraan mencatat total transaksi aktif mencapai **Rp ${activeDealsValue.toLocaleString("id-ID")}** dari **${activeDealsCount} kontrak aktif** dan **${mitras.length} mitra terdaftar**.

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
      note: "Menggunakan analisis cerdas berbasis data riil database MySQL NDTAXANDLAW."
    });
  }
});
var handleMysqlStatus = async (_req, res) => {
  const config = getMysqlConfig();
  const test = await testMysqlConnection();
  res.json({
    success: true,
    data: {
      ...config,
      ...test,
      url: config.connectionLabel,
      appEnvironment: appSettings.appEnvironment,
      strictMysqlOnly: isProductionMode() && isMysqlConfigured(),
      passwordEncryption: "SCRYPT + AES-256-GCM (ndenc$v2)",
      activeRolesCount: systemRoles.filter((r) => r.isActive).length,
      totalRolesCount: systemRoles.length
    }
  });
};
app.get("/api/system/mysql-status", handleMysqlStatus);
app.get("/api/system/db-status", handleMysqlStatus);
app.post("/api/system/mysql-init-schema", async (_req, res) => {
  if (!isMysqlConfigured()) {
    return res.status(400).json({
      success: false,
      message: "Kredensial MySQL (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE) belum terpasang di file .env server Anda."
    });
  }
  const initResult = await ensureMysqlSchema();
  if (!initResult.success) {
    return res.status(500).json(initResult);
  }
  await syncFromMysql();
  recordActivity({
    actorRole: "admin",
    actorName: "Admin Operasional",
    actionType: "settings_update",
    operation: "UPDATE",
    targetEntity: "Skema Database MySQL",
    description: initResult.message
  });
  return res.json(initResult);
});
var handleMysqlSync = async (_req, res) => {
  if (!db) {
    return res.status(400).json({
      success: false,
      message: "MYSQL_HOST, MYSQL_USER, atau MYSQL_DATABASE belum terpasang di file .env atau Environment Variable hosting Anda."
    });
  }
  try {
    if (isProductionMode()) {
      return res.status(403).json({
        success: false,
        message: "Fitur Sinkronkan Data Awal dinonaktifkan pada Mode Production demi melindungi data operasional di MySQL agar tidak tertimpa."
      });
    }
    await ensureMysqlSchema();
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
      const { error: errM } = await db.from("mitras").upsert(mitras);
      if (!errM) summary.mitras = mitras.length;
      else console.warn("MySQL sync mitras warning:", errM.message);
    }
    if (services.length > 0) {
      const { error: errS } = await db.from("services").upsert(services);
      if (!errS) summary.services = services.length;
      else console.warn("MySQL sync services warning:", errS.message);
    }
    if (clientDeals.length > 0) {
      const cleanDeals = clientDeals.map((d) => toDbClientDeal(d));
      const { error: errD } = await db.from("client_deals").upsert(cleanDeals);
      if (!errD) summary.clientDeals = clientDeals.length;
      else console.warn("MySQL sync deals warning:", errD.message);
    }
    if (marketingTools.length > 0) {
      const { error: errT } = await db.from("marketing_tools").upsert(marketingTools);
      if (!errT) summary.marketingTools = marketingTools.length;
      else console.warn("MySQL sync tools warning:", errT.message);
    }
    if (commissions.length > 0) {
      const { error: errC } = await db.from("commissions").upsert(commissions);
      if (!errC) summary.commissions = commissions.length;
      else console.warn("MySQL sync commissions warning:", errC.message);
    }
    await persistSettingsToMysql();
    await persistActivityLogsToMysql();
    await persistEmailLogsToMysql();
    res.json({
      success: true,
      message: "Seluruh data operasional, pengaturan, log aktivitas, dan log email berhasil disinkronkan ke database MySQL!",
      summary
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Terjadi kendala sinkronisasi ke MySQL: ${err.message || "Unknown error"}`
    });
  }
};
app.post("/api/system/mysql-sync", handleMysqlSync);
app.post("/api/system/db-sync", handleMysqlSync);
app.get("/api/system/database-backup", async (req, res) => {
  if (!db) {
    return res.status(400).json({
      success: false,
      message: "Koneksi Database MySQL belum aktif. Pasang MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE di file .env server Anda."
    });
  }
  try {
    const format = String(req.query.format || "json").toLowerCase();
    if (format === "sql") {
      const dump = await generateMysqlSqlDump();
      if (!dump.success) {
        return res.status(500).json({ success: false, message: dump.error || "Gagal membuat SQL dump MySQL." });
      }
      recordActivity({
        actorRole: "admin",
        actorName: "Admin Operasional",
        actionType: "settings_update",
        operation: "CREATE",
        targetEntity: "Backup SQL Database MySQL",
        description: `Admin mengunduh Backup SQL (.sql) Database MySQL (${dump.counts.mitras || 0} mitra, ${dump.counts.client_deals || 0} klien/deal).`
      });
      res.setHeader("Content-Type", "application/sql; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mysql-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.sql"`
      );
      return res.send(dump.sql);
    }
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
      resPasswords,
      resChatRooms,
      resChatMessages
    ] = await Promise.all([
      db.from("mitras").select("*"),
      db.from("services").select("*"),
      db.from("client_deals").select("*"),
      db.from("commissions").select("*"),
      db.from("payout_requests").select("*"),
      db.from("marketing_tools").select("*"),
      db.from("notifications").select("*"),
      db.from("app_settings").select("*"),
      db.from("system_roles").select("*"),
      db.from("activity_logs").select("*").order("timestamp", { ascending: false }),
      db.from("email_logs").select("*").order("timestamp", { ascending: false }),
      db.from("user_passwords").select("*"),
      db.from("chat_rooms").select("*"),
      db.from("chat_messages").select("*").order("createdAt", { ascending: true })
    ]);
    const dbMitras = Array.isArray(resMitras.data) ? resMitras.data : [];
    const dbServices = Array.isArray(resServices.data) ? resServices.data : [];
    const dbDeals = Array.isArray(resDeals.data) ? resDeals.data : [];
    const dbCommissions = Array.isArray(resCommissions.data) ? resCommissions.data : [];
    const dbPayouts = Array.isArray(resPayouts.data) ? resPayouts.data : [];
    const dbTools = Array.isArray(resTools.data) ? resTools.data : [];
    const dbNotifs = Array.isArray(resNotifs.data) ? resNotifs.data : [];
    const dbSettings = Array.isArray(resSettings.data) ? resSettings.data : [];
    const dbRoles = Array.isArray(resRoles.data) ? resRoles.data : [];
    const dbActLogs = Array.isArray(resActLogs.data) ? resActLogs.data : [];
    const dbEmailLogs = Array.isArray(resEmailLogs.data) ? resEmailLogs.data : [];
    const dbPasswords = Array.isArray(resPasswords.data) ? resPasswords.data : [];
    const dbChatRooms = Array.isArray(resChatRooms.data) ? resChatRooms.data : [];
    const dbChatMessages = Array.isArray(resChatMessages.data) ? resChatMessages.data : [];
    const mysqlConfig = getMysqlConfig();
    const backupPayload = {
      success: true,
      source: "MYSQL_PRODUCTION_DATABASE",
      mysqlHost: mysqlConfig.host,
      mysqlDatabase: mysqlConfig.database,
      backupVersion: "3.0-MYSQL",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      firmName: appSettings.firmName || "NDTAXANDLAW",
      environment: "production",
      counts: {
        mitras: dbMitras.length,
        services: dbServices.length,
        client_deals: dbDeals.length,
        commissions: dbCommissions.length,
        payout_requests: dbPayouts.length,
        marketing_tools: dbTools.length,
        notifications: dbNotifs.length,
        app_settings: dbSettings.length,
        system_roles: dbRoles.length,
        activity_logs: dbActLogs.length,
        email_logs: dbEmailLogs.length,
        user_passwords: dbPasswords.length,
        chat_rooms: dbChatRooms.length,
        chat_messages: dbChatMessages.length
      },
      tables: {
        mitras: dbMitras,
        services: dbServices,
        client_deals: dbDeals,
        commissions: dbCommissions,
        payout_requests: dbPayouts,
        marketing_tools: dbTools,
        notifications: dbNotifs,
        app_settings: dbSettings,
        system_roles: dbRoles,
        activity_logs: dbActLogs,
        email_logs: dbEmailLogs,
        user_passwords: dbPasswords,
        chat_rooms: dbChatRooms,
        chat_messages: dbChatMessages
      }
    };
    recordActivity({
      actorRole: "admin",
      actorName: "Admin Operasional",
      actionType: "settings_update",
      operation: "CREATE",
      targetEntity: "Backup Database MySQL",
      description: `Admin mengunduh Backup Database langsung dari MySQL (${dbMitras.length} mitra, ${dbDeals.length} klien/deal, ${dbCommissions.length} komisi, ${dbPayouts.length} payout).`
    });
    res.json(backupPayload);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal mengambil data backup dari MySQL: ${err.message || "Unknown error"}`
    });
  }
});
app.post("/api/system/database-restore", async (req, res) => {
  if (!db) {
    return res.status(400).json({
      success: false,
      message: "Koneksi Database MySQL belum aktif. Pastikan variabel MYSQL_* sudah terpasang di .env server Anda."
    });
  }
  try {
    const { backupData, mode = "merge" } = req.body;
    const rawTables = backupData?.tables || backupData?.data || backupData;
    if (!rawTables || typeof rawTables !== "object") {
      return res.status(400).json({
        success: false,
        message: "Format file backup JSON tidak valid atau kosong."
      });
    }
    await ensureMysqlSchema();
    const isReplace = mode === "replace";
    const tblMitras = Array.isArray(rawTables.mitras) ? rawTables.mitras : [];
    const tblServices = Array.isArray(rawTables.services) ? rawTables.services : [];
    const tblDeals = Array.isArray(rawTables.client_deals) ? rawTables.client_deals.map((d) => toDbClientDeal(fromDbClientDeal(d))) : Array.isArray(rawTables.clientDeals) ? rawTables.clientDeals.map((d) => toDbClientDeal(fromDbClientDeal(d))) : [];
    const tblCommissions = Array.isArray(rawTables.commissions) ? rawTables.commissions : [];
    const tblPayouts = Array.isArray(rawTables.payout_requests) ? rawTables.payout_requests : Array.isArray(rawTables.payoutRequests) ? rawTables.payoutRequests : [];
    const tblTools = Array.isArray(rawTables.marketing_tools) ? rawTables.marketing_tools : Array.isArray(rawTables.marketingTools) ? rawTables.marketingTools : [];
    const tblNotifs = Array.isArray(rawTables.notifications) ? rawTables.notifications : [];
    const tblSettings = Array.isArray(rawTables.app_settings) ? rawTables.app_settings : [];
    const tblRoles = Array.isArray(rawTables.system_roles) ? rawTables.system_roles : [];
    const tblActLogs = Array.isArray(rawTables.activity_logs) ? rawTables.activity_logs : Array.isArray(rawTables.activityLogs) ? rawTables.activityLogs : [];
    const tblEmailLogs = Array.isArray(rawTables.email_logs) ? rawTables.email_logs : Array.isArray(rawTables.emailLogs) ? rawTables.emailLogs.map(toDbEmailLogRow) : [];
    const tblPasswords = Array.isArray(rawTables.user_passwords) ? rawTables.user_passwords : rawTables.userPasswords && typeof rawTables.userPasswords === "object" ? Object.entries(rawTables.userPasswords).map(([email, password]) => ({ email, password })) : [];
    const tblChatRooms = Array.isArray(rawTables.chat_rooms) ? rawTables.chat_rooms : Array.isArray(rawTables.chatRooms) ? rawTables.chatRooms : [];
    const tblChatMessages = Array.isArray(rawTables.chat_messages) ? rawTables.chat_messages : Array.isArray(rawTables.chatMessages) ? rawTables.chatMessages : [];
    if (isReplace) {
      await Promise.allSettled([
        db.from("mitras").delete().neq("id", ""),
        db.from("services").delete().neq("id", ""),
        db.from("client_deals").delete().neq("id", ""),
        db.from("commissions").delete().neq("id", ""),
        db.from("payout_requests").delete().neq("id", ""),
        db.from("marketing_tools").delete().neq("id", ""),
        db.from("notifications").delete().neq("id", ""),
        db.from("activity_logs").delete().neq("id", ""),
        db.from("email_logs").delete().neq("id", ""),
        db.from("chat_rooms").delete().neq("id", ""),
        db.from("chat_messages").delete().neq("id", "")
      ]);
    }
    if (tblMitras.length > 0) await db.from("mitras").upsert(tblMitras);
    if (tblServices.length > 0) await db.from("services").upsert(tblServices);
    if (tblDeals.length > 0) await db.from("client_deals").upsert(tblDeals);
    if (tblCommissions.length > 0) await db.from("commissions").upsert(tblCommissions);
    if (tblPayouts.length > 0) await db.from("payout_requests").upsert(tblPayouts);
    if (tblTools.length > 0) await db.from("marketing_tools").upsert(tblTools);
    if (tblNotifs.length > 0) await db.from("notifications").upsert(tblNotifs);
    if (tblSettings.length > 0) await db.from("app_settings").upsert(tblSettings);
    if (tblRoles.length > 0) await db.from("system_roles").upsert(tblRoles);
    if (tblActLogs.length > 0) await db.from("activity_logs").upsert(tblActLogs);
    if (tblEmailLogs.length > 0) await db.from("email_logs").upsert(tblEmailLogs);
    if (tblPasswords.length > 0) await db.from("user_passwords").upsert(tblPasswords);
    if (tblChatRooms.length > 0) await db.from("chat_rooms").upsert(tblChatRooms);
    if (tblChatMessages.length > 0) await db.from("chat_messages").upsert(tblChatMessages);
    await syncFromMysql();
    recordActivity({
      actorRole: "admin",
      actorName: "Admin Operasional",
      actionType: "settings_update",
      operation: "UPDATE",
      targetEntity: "Restore / Import Database MySQL",
      description: `Admin berhasil melakukan Restore/Import Database ke MySQL (${isReplace ? "Mode Timpa Penuh" : "Mode Gabung Data"}): ${mitras.length} mitra, ${clientDeals.length} klien/deal, ${commissions.length} komisi.`
    });
    res.json({
      success: true,
      message: `Restore / Import ke Database MySQL berhasil (${isReplace ? "Timpa Penuh" : "Gabung Data"})! Data di MySQL saat ini: ${mitras.length} Mitra, ${clientDeals.length} Klien/Deal, ${commissions.length} Komisi.`,
      counts: {
        mitras: mitras.length,
        services: services.length,
        client_deals: clientDeals.length,
        commissions: commissions.length,
        payout_requests: payoutRequests.length,
        marketing_tools: marketingTools.length,
        activity_logs: activityLogs.length,
        email_logs: emailLogs.length,
        chat_rooms: chatRooms.length,
        chat_messages: chatMessages.length
      },
      settings: appSettings
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal memproses restore ke MySQL: ${err.message || "Unknown error"}`
    });
  }
});
app.post("/api/system/migrate-from-supabase", async (req, res) => {
  try {
    const {
      supabaseUrl,
      supabaseKey,
      mode = "merge",
      dryRun = false
    } = req.body || {};
    const cleanUrl = String(supabaseUrl || "").trim();
    const cleanKey = String(supabaseKey || "").trim();
    if (!cleanUrl || !cleanKey) {
      return res.status(400).json({
        success: false,
        message: "URL Project Supabase lama dan Service Role Key / API Key wajib diisi."
      });
    }
    if (!dryRun && !isMysqlConfigured()) {
      return res.status(400).json({
        success: false,
        message: "Koneksi Database MySQL belum aktif. Silakan pasang MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, dan MYSQL_DATABASE di file .env server Anda terlebih dahulu."
      });
    }
    const result = await migrateFromSupabaseToMysql({
      supabaseUrl: cleanUrl,
      supabaseKey: cleanKey,
      mode: mode === "replace" ? "replace" : "merge",
      dryRun: Boolean(dryRun)
    });
    if (!dryRun && result.success) {
      await syncFromMysql();
      recordActivity({
        actorRole: "admin",
        actorName: "Admin Operasional",
        actionType: "settings_update",
        operation: "UPDATE",
        targetEntity: "Migrasi Supabase -> MySQL",
        description: result.message
      });
    }
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Gagal memproses migrasi Supabase -> MySQL: ${err?.message || "Unknown error"}`
    });
  }
});
var chatWsClients = /* @__PURE__ */ new Set();
var broadcastChatEvent = (payload) => {
  const raw = JSON.stringify(payload);
  for (const client of chatWsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(raw);
      } catch {
      }
    }
  }
};
var syncChatFromMysql = async () => {
  if (!db) return;
  try {
    const [
      { data: dbRooms, error: errCR },
      { data: dbMsgs, error: errCM },
      { data: kvRows, error: errKV }
    ] = await Promise.all([
      db.from("chat_rooms").select("*"),
      db.from("chat_messages").select("*").order("createdAt", { ascending: true }),
      db.from("user_passwords").select("email, password").in("email", [
        "__sys_chat_rooms__@ndtaxlaw.internal",
        "__sys_chat_messages__@ndtaxlaw.internal"
      ])
    ]);
    const tableRooms = !errCR && Array.isArray(dbRooms) ? dbRooms : [];
    const tableMsgs = !errCM && Array.isArray(dbMsgs) ? dbMsgs : [];
    let kvRooms = [];
    let kvMsgs = [];
    let hasKvRooms = false;
    let hasKvMsgs = false;
    if (!errKV && Array.isArray(kvRows)) {
      for (const row of kvRows) {
        const key = String(row.email || "").toLowerCase();
        if (key === "__sys_chat_rooms__@ndtaxlaw.internal" && row.password) {
          try {
            const parsed = JSON.parse(row.password);
            if (Array.isArray(parsed)) {
              kvRooms = parsed;
              hasKvRooms = true;
            }
          } catch {
          }
        } else if (key === "__sys_chat_messages__@ndtaxlaw.internal" && row.password) {
          try {
            const parsed = JSON.parse(row.password);
            if (Array.isArray(parsed)) {
              kvMsgs = parsed;
              hasKvMsgs = true;
            }
          } catch {
          }
        }
      }
    }
    const roomSources = !errCR || hasKvRooms ? [...tableRooms, ...kvRooms] : [...chatRooms];
    const mergedRooms = /* @__PURE__ */ new Map();
    for (const r of roomSources) {
      if (!r || !r.id) continue;
      if (isProductionMode() && LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id)) continue;
      const prev = mergedRooms.get(r.id);
      if (!prev || new Date(r.updatedAt || 0).getTime() >= new Date(prev.updatedAt || 0).getTime()) {
        mergedRooms.set(r.id, r);
      }
    }
    chatRooms = Array.from(mergedRooms.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    const msgSources = !errCM || hasKvMsgs ? [...tableMsgs, ...kvMsgs] : [...chatMessages];
    const mergedMsgs = /* @__PURE__ */ new Map();
    for (const m of msgSources) {
      if (!m || !m.id) continue;
      if (isProductionMode() && LEGACY_SEEDED_CHAT_MSG_IDS.has(m.id)) continue;
      const prev = mergedMsgs.get(m.id);
      if (!prev) {
        mergedMsgs.set(m.id, m);
      } else {
        mergedMsgs.set(m.id, {
          ...prev,
          ...m,
          reactions: Array.isArray(m.reactions) ? m.reactions : prev.reactions
        });
      }
    }
    chatMessages = Array.from(mergedMsgs.values()).sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  } catch (err) {
    console.warn("[MySQL Chat Sync Warning]", err);
  }
};
var persistChatToCloud = async (specificRoom, specificMsg) => {
  if (isProductionMode()) {
    chatRooms = chatRooms.filter((r) => !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id));
    chatMessages = chatMessages.filter((m) => !LEGACY_SEEDED_CHAT_MSG_IDS.has(m.id));
  }
  saveDatabase();
  if (db) {
    try {
      if (specificRoom) {
        await db.from("chat_rooms").upsert([specificRoom]);
      } else if (chatRooms.length > 0) {
        await db.from("chat_rooms").upsert(chatRooms);
      }
      if (specificMsg) {
        await db.from("chat_messages").upsert([specificMsg]);
      } else if (chatMessages.length > 0) {
        await db.from("chat_messages").upsert(chatMessages);
      }
    } catch {
    }
    try {
      await db.from("user_passwords").upsert([
        {
          email: "__sys_chat_rooms__@ndtaxlaw.internal",
          password: JSON.stringify(chatRooms)
        },
        {
          email: "__sys_chat_messages__@ndtaxlaw.internal",
          password: JSON.stringify(chatMessages)
        }
      ]);
    } catch {
    }
  }
};
var buildChatParticipantsList = () => {
  const staffList = staffAccounts.filter((s) => s.isActive).map((s) => {
    const g = s.gender || inferGenderFromName(s.name);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      role: "staff",
      avatar: resolveAvatarUrl(s.avatarUrl, g, s.name),
      code: s.position || "Staf Operasional",
      specialization: s.position || "Staf Operasional & Verifikasi Pajak"
    };
  });
  const mitraList = mitras.map((m) => {
    const g = m.gender || inferGenderFromName(m.fullName);
    return {
      id: m.id,
      name: m.fullName,
      email: m.email,
      role: "mitra",
      avatar: resolveAvatarUrl(m.avatarUrl, g, m.fullName),
      code: m.memberCode,
      specialization: m.specialization
    };
  });
  return [...staffList, ...mitraList];
};
var extractServerLinkMetadata = async (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const hostname = parsed.hostname.replace(/^www\./i, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const resp = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NDTaxAndLawChatBot/1.0)",
          Accept: "text/html,application/xhtml+xml"
        }
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const html = (await resp.text()).slice(0, 65e3);
        const getMeta = (prop) => {
          const reg1 = new RegExp(
            `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
            "i"
          );
          const reg2 = new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
            "i"
          );
          return reg1.exec(html)?.[1] || reg2.exec(html)?.[1] || "";
        };
        const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
        const ogTitle = getMeta("og:title") || getMeta("twitter:title") || titleMatch?.[1] || hostname;
        const ogDesc = getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || `Tautan referensi dari ${hostname}`;
        const ogSite = getMeta("og:site_name") || hostname.toUpperCase();
        let ogImage = getMeta("og:image") || getMeta("twitter:image") || "";
        if (ogImage && ogImage.startsWith("/")) {
          ogImage = `${parsed.origin}${ogImage}`;
        }
        return {
          url: parsed.toString(),
          title: ogTitle.trim().slice(0, 140),
          description: ogDesc.trim().slice(0, 240),
          siteName: ogSite.trim().slice(0, 60),
          image: ogImage || void 0
        };
      }
    } catch {
      clearTimeout(timeout);
    }
    return {
      url: parsed.toString(),
      title: `${hostname.toUpperCase()} \u2014 Tautan Eksternal`,
      description: `Buka tautan ${parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : parsed.hostname} di tab baru.`,
      siteName: hostname.toUpperCase()
    };
  } catch {
    return null;
  }
};
var hasDirectRoomHistory = (room, allMessages) => {
  if (room.type !== "direct") return true;
  if (room.lastMessageAt) return true;
  return allMessages.some((m) => m.roomId === room.id);
};
app.get("/api/chat/state", async (req, res) => {
  const userId = String(req.query.userId || "").trim();
  const role = String(req.query.role || "mitra").trim().toLowerCase();
  const isAdmin = role === "admin";
  if (db && (isProductionMode() || chatRooms.length === 0)) {
    await syncChatFromMysql();
  }
  const activeRooms = isProductionMode() ? chatRooms.filter((r) => !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id)) : chatRooms;
  const activeMessages = isProductionMode() ? chatMessages.filter((m) => !LEGACY_SEEDED_CHAT_MSG_IDS.has(m.id)) : chatMessages;
  const participants = buildChatParticipantsList();
  const visibleRooms = activeRooms.filter(
    (r) => (isAdmin || r.participantIds.includes(userId)) && hasDirectRoomHistory(r, activeMessages)
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const visibleRoomIds = new Set(visibleRooms.map((r) => r.id));
  const visibleMessages = activeMessages.filter((m) => visibleRoomIds.has(m.roomId));
  res.json({
    chatEnabled: appSettings.chatEnabled !== false,
    participants,
    rooms: visibleRooms,
    messages: visibleMessages
  });
});
app.get("/api/chat/groups", async (_req, res) => {
  if (db) {
    try {
      await syncChatFromMysql();
    } catch {
    }
  }
  const activeRooms = isProductionMode() ? chatRooms.filter((r) => !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id)) : chatRooms;
  const groupRooms = activeRooms.filter((r) => r.type === "group").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({
    success: true,
    chatEnabled: appSettings.chatEnabled !== false,
    data: groupRooms
  });
});
app.get("/api/chat/link-preview", async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  if (!rawUrl) {
    return res.status(400).json({ message: "URL wajib diisi" });
  }
  const preview = await extractServerLinkMetadata(rawUrl);
  if (!preview) {
    return res.status(400).json({ message: "Tidak dapat membaca metadata URL" });
  }
  res.json(preview);
});
app.post("/api/chat/rooms/direct", async (req, res) => {
  const { userAId, userBId } = req.body;
  if (!userAId || !userBId || userAId === userBId) {
    return res.status(400).json({ message: "Peserta percakapan tidak valid." });
  }
  const sorted = [String(userAId), String(userBId)].sort();
  const existing = chatRooms.find(
    (r) => r.type === "direct" && r.participantIds.length === 2 && r.participantIds.includes(sorted[0]) && r.participantIds.includes(sorted[1]) && (!isProductionMode() || !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id))
  );
  if (existing && hasDirectRoomHistory(existing, chatMessages)) {
    return res.json(existing);
  }
  const participants = buildChatParticipantsList();
  const pA = participants.find((p) => p.id === sorted[0]);
  const pB = participants.find((p) => p.id === sorted[1]);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const draftRoom = {
    id: existing?.id || `room-direct-${sorted[0]}__${sorted[1]}`,
    type: "direct",
    name: `${pA?.name || sorted[0]} & ${pB?.name || sorted[1]}`,
    participantIds: sorted,
    createdBy: String(userAId),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: existing?.updatedAt || nowIso,
    isDraft: true
  };
  res.status(200).json(draftRoom);
});
var notifyMembersAddedToGroup = async (room, addedMemberIds, actorId, actorName, isNewGroup = false) => {
  const uniqueAdded = Array.from(new Set(addedMemberIds.map(String).filter(Boolean)));
  const participants = buildChatParticipantsList();
  const addedNames = uniqueAdded.map((pid) => {
    const found = participants.find((p) => p.id === pid);
    return found?.name || pid;
  });
  const safeActorName = String(actorName || "Tim Operasional").trim() || "Tim Operasional";
  const groupTitle = room.name || "Grup Chat";
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const text = isNewGroup ? addedNames.length > 0 ? `\u{1F389} ${safeActorName} membuat grup "${groupTitle}" dan menambahkan ${addedNames.join(", ")} ke dalam grup.` : `\u{1F389} ${safeActorName} membuat grup "${groupTitle}".` : `\u{1F44B} ${safeActorName} menambahkan ${addedNames.join(", ")} ke dalam grup "${groupTitle}".`;
  const sysMsg = {
    id: `msg-sys-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    roomId: room.id,
    senderId: String(actorId || "system"),
    senderName: safeActorName,
    senderRole: "staff",
    senderAvatar: MALE_AVATAR_URL,
    text,
    reactions: [],
    createdAt: nowIso,
    isSystemMessage: true
  };
  chatMessages.push(sysMsg);
  room.updatedAt = nowIso;
  room.lastMessageAt = nowIso;
  room.lastMessageSenderId = sysMsg.senderId;
  room.lastMessageSenderName = safeActorName;
  room.lastMessageText = text;
  await persistChatToCloud(room, sysMsg);
  broadcastChatEvent({
    type: "chat:message_created",
    message: sysMsg,
    room
  });
  for (const pid of uniqueAdded) {
    if (pid === String(actorId)) continue;
    const isMitra = mitras.some((m) => m.id === pid);
    if (!isMitra) continue;
    const groupNotif = {
      id: `notif-mtr-${pid}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      title: `Anda Ditambahkan ke Grup "${groupTitle}"`,
      message: `${safeActorName} menambahkan Anda ke dalam grup chat "${groupTitle}". Buka menu Chat untuk mulai berdiskusi dengan tim.`,
      type: "chat",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: pid
    };
    notifications.unshift(groupNotif);
    if (db) {
      try {
        await db.from("notifications").insert([toDbNotification(groupNotif)]);
      } catch {
      }
    }
  }
  saveDatabase();
};
app.post("/api/chat/rooms/group", async (req, res) => {
  const { name, description, avatarUrl, participantIds, createdBy, createdByName } = req.body;
  if (!name || !Array.isArray(participantIds) || participantIds.length < 2) {
    return res.status(400).json({
      message: "Nama grup dan minimal 2 peserta wajib dipilih."
    });
  }
  let finalAvatarUrl = avatarUrl ? String(avatarUrl).trim() : void 0;
  if (finalAvatarUrl && finalAvatarUrl.startsWith("data:")) {
    const saved = saveDataUrlToHostingServer(
      finalAvatarUrl,
      `group-avatar-${Date.now()}`,
      "jpg",
      "chat"
    );
    if (saved) {
      if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
      finalAvatarUrl = saved.hostedUrl;
    }
  }
  const uniqueIds = Array.from(new Set(participantIds.map(String)));
  const creatorId = String(createdBy || uniqueIds[0]);
  const creatorName = String(createdByName || "Anggota");
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const newRoom = {
    id: `room-group-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    type: "group",
    name: String(name).trim(),
    description: String(description || "Grup Diskusi Mitra & Staf").trim(),
    avatarUrl: finalAvatarUrl,
    participantIds: uniqueIds,
    createdBy: creatorId,
    createdByName: creatorName,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastMessageText: `Grup "${String(name).trim()}" dibuat oleh ${creatorName}`,
    lastMessageAt: nowIso,
    lastMessageSenderName: creatorName
  };
  chatRooms.unshift(newRoom);
  const addedOtherIds = uniqueIds.filter((pid) => pid !== creatorId);
  await notifyMembersAddedToGroup(newRoom, addedOtherIds, creatorId, creatorName, true);
  res.status(201).json(newRoom);
});
app.put("/api/chat/rooms/:id", async (req, res) => {
  const { id } = req.params;
  const room = chatRooms.find((r) => r.id === id);
  if (!room) {
    return res.status(404).json({ message: "Ruang grup tidak ditemukan." });
  }
  const prevAvatarUrl = room.avatarUrl;
  const {
    name,
    description,
    avatarUrl,
    removeAvatar,
    participantIds,
    actorId,
    actorName,
    actorRole
  } = req.body;
  const cleanActorId = String(actorId || "").trim();
  const isVerifiedAdminOrStaff = actorRole === "admin" || actorRole === "staff" || cleanActorId === adminAccount.id || staffAccounts.some((s) => s.id === cleanActorId);
  const isVerifiedMitra = !isVerifiedAdminOrStaff && mitras.some((m) => m.id === cleanActorId);
  const prevIds = Array.isArray(room.participantIds) ? [...room.participantIds] : [];
  let newlyAddedIds = [];
  if (Array.isArray(participantIds)) {
    const nextIds = Array.from(new Set(participantIds.map(String)));
    const added = nextIds.filter((pid) => !prevIds.includes(pid));
    const removed = prevIds.filter((pid) => !nextIds.includes(pid));
    const membershipChanged = added.length > 0 || removed.length > 0;
    if (membershipChanged) {
      if (isVerifiedMitra || !isVerifiedAdminOrStaff && actorRole === "mitra") {
        const isOnlySelfLeave = added.length === 0 && removed.length === 1 && removed[0] === cleanActorId;
        if (!isOnlySelfLeave) {
          return res.status(403).json({
            message: "Hanya Admin/Staf yang dapat menambah atau mengeluarkan anggota grup. Mitra hanya dapat keluar dari grup secara mandiri."
          });
        }
      }
      if (nextIds.length < 1) {
        return res.status(400).json({ message: "Grup harus memiliki minimal 1 anggota." });
      }
      newlyAddedIds = added;
      room.participantIds = nextIds;
    }
  }
  if (name !== void 0 && String(name).trim()) {
    room.name = String(name).trim();
  }
  if (description !== void 0) {
    room.description = String(description).trim();
  }
  if (removeAvatar === true) {
    room.avatarUrl = void 0;
  } else if (avatarUrl !== void 0 && String(avatarUrl).trim()) {
    let nextAvatar = String(avatarUrl).trim();
    if (nextAvatar.startsWith("data:")) {
      const saved = saveDataUrlToHostingServer(
        nextAvatar,
        `group-avatar-${room.id}-${Date.now()}`,
        "jpg",
        "chat"
      );
      if (saved) {
        if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
        nextAvatar = saved.hostedUrl;
      }
    }
    room.avatarUrl = nextAvatar;
  }
  if (prevAvatarUrl && prevAvatarUrl !== room.avatarUrl) {
    await deleteHostedUploadFile(prevAvatarUrl);
  }
  room.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (newlyAddedIds.length > 0) {
    await notifyMembersAddedToGroup(
      room,
      newlyAddedIds,
      String(actorId || "system"),
      String(actorName || "Admin Operasional"),
      false
    );
  } else {
    await persistChatToCloud(room, void 0);
    broadcastChatEvent({ type: "chat:room_updated", room });
  }
  res.json(room);
});
app.post("/api/chat/rooms/:id/leave", async (req, res) => {
  const { id } = req.params;
  const room = chatRooms.find((r) => r.id === id);
  if (!room || room.type !== "group") {
    return res.status(404).json({ success: false, message: "Ruang grup tidak ditemukan." });
  }
  const userId = String(req.body?.userId || "").trim();
  const userName = String(req.body?.userName || "").trim();
  if (!userId) {
    return res.status(400).json({ success: false, message: "Identitas pengguna tidak valid." });
  }
  const prevIds = Array.isArray(room.participantIds) ? room.participantIds.map(String) : [];
  if (!prevIds.includes(userId)) {
    return res.status(400).json({ success: false, message: "Anda sudah bukan anggota grup ini." });
  }
  room.participantIds = prevIds.filter((pid) => pid !== userId);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const resolvedMitra = mitras.find((m) => m.id === userId);
  const resolvedStaff = staffAccounts.find((s) => s.id === userId);
  const safeName = userName || resolvedMitra?.fullName || resolvedStaff?.name || "Anggota";
  const leaveText = `\u{1F44B} ${safeName} keluar dari grup.`;
  const sysMsg = {
    id: `msg-sys-leave-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    roomId: room.id,
    senderId: userId,
    senderName: safeName,
    senderRole: resolvedStaff ? "staff" : "mitra",
    senderAvatar: resolvedMitra?.avatarUrl || resolvedStaff?.avatarUrl || MALE_AVATAR_URL,
    text: leaveText,
    reactions: [],
    createdAt: nowIso,
    isSystemMessage: true
  };
  chatMessages.push(sysMsg);
  room.updatedAt = nowIso;
  room.lastMessageAt = nowIso;
  room.lastMessageSenderId = userId;
  room.lastMessageSenderName = safeName;
  room.lastMessageText = leaveText;
  await persistChatToCloud(room, sysMsg);
  saveDatabase();
  broadcastChatEvent({
    type: "chat:message_created",
    message: sysMsg,
    room
  });
  broadcastChatEvent({
    type: "chat:room_updated",
    room
  });
  return res.json({
    success: true,
    message: `Anda berhasil keluar dari grup "${room.name}".`,
    room
  });
});
var resolveSafeVideoUploadTempPath = (uploadIdRaw) => {
  const cleanId = String(uploadIdRaw || "").trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(cleanId)) return null;
  return path3.join(os2.tmpdir(), `nd-vid-upload-${cleanId}.part`);
};
app.post("/api/chat/upload-video/chunk", async (req, res) => {
  const uploadId = String(req.query.uploadId || "").trim();
  const chunkIndex = Number(req.query.chunkIndex ?? 0);
  const partPath = resolveSafeVideoUploadTempPath(uploadId);
  if (!partPath || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return res.status(400).json({ message: "Parameter upload video tidak valid." });
  }
  try {
    const chunks = [];
    let chunkBytes = 0;
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        chunkBytes += chunk.length;
        if (chunkBytes > VIDEO_UPLOAD_CHUNK_MAX_BYTES) {
          reject(new Error("CHUNK_TOO_LARGE"));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve());
      req.on("error", (err) => reject(err));
    });
    const buf = Buffer.concat(chunks);
    const existingSize = chunkIndex > 0 && fs3.existsSync(partPath) ? fs3.statSync(partPath).size : 0;
    if (existingSize + buf.length > MAX_RAW_VIDEO_UPLOAD_BYTES) {
      try {
        if (fs3.existsSync(partPath)) fs3.unlinkSync(partPath);
      } catch {
      }
      return res.status(413).json({
        message: "Ukuran video mentah maksimal 250 MB."
      });
    }
    if (chunkIndex === 0) {
      fs3.writeFileSync(partPath, buf);
    } else {
      fs3.appendFileSync(partPath, buf);
    }
    return res.json({
      success: true,
      chunkIndex,
      receivedBytes: existingSize + buf.length
    });
  } catch (err) {
    return res.status(400).json({
      message: err?.message === "CHUNK_TOO_LARGE" ? "Potongan unggahan terlalu besar." : "Gagal menerima potongan video."
    });
  }
});
app.post("/api/chat/upload-video/finalize", async (req, res) => {
  const { uploadId, fileName, trimStartSec, trimEndSec, totalDurationSec, hd, senderRole } = req.body || {};
  if (senderRole === "admin") {
    return res.status(403).json({ message: "Admin berada dalam Mode Monitoring." });
  }
  const partPath = resolveSafeVideoUploadTempPath(String(uploadId || ""));
  if (!partPath || !fs3.existsSync(partPath)) {
    return res.status(400).json({ message: "File unggahan video tidak ditemukan atau sudah kedaluwarsa." });
  }
  try {
    const rawStat = fs3.statSync(partPath);
    const originalBytes = rawStat.size;
    if (originalBytes <= 0 || originalBytes > MAX_RAW_VIDEO_UPLOAD_BYTES) {
      return res.status(400).json({ message: "Ukuran video tidak valid (maksimal 250 MB)." });
    }
    const rawName = String(fileName || `video-${Date.now()}.mp4`).trim();
    const rawExt = rawName.includes(".") ? (rawName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") : "mp4";
    const startNum = Number.isFinite(Number(trimStartSec)) ? Math.max(0, Number(trimStartSec)) : 0;
    const endNum = Number.isFinite(Number(trimEndSec)) ? Number(trimEndSec) : void 0;
    const totalNum = Number.isFinite(Number(totalDurationSec)) ? Number(totalDurationSec) : void 0;
    const isHd = Boolean(hd);
    const needsTrim = startNum > 0.25 || endNum !== void 0 && totalNum !== void 0 && endNum < totalNum - 0.5 || totalNum !== void 0 && totalNum > MAX_CHAT_VIDEO_DURATION_SEC + 0.5;
    const transcoded = await transcodeVideoFileToWebMp4(partPath, {
      trimStartSec: startNum,
      trimEndSec: endNum,
      maxDurationSec: MAX_CHAT_VIDEO_DURATION_SEC,
      rawByteSize: originalBytes,
      hd: isHd,
      sourceExt: rawExt,
      needsTrim
    });
    if (!transcoded.buffer || transcoded.buffer.length === 0) {
      return res.status(500).json({ message: "Gagal memproses video." });
    }
    const finalExt = transcoded.transcoded ? "mp4" : rawExt;
    const finalDisplayName = finalExt === "mp4" && !rawName.toLowerCase().endsWith(".mp4") ? rawName.replace(/\.[^/.]+$/, "") + ".mp4" : rawName;
    const saved = saveBufferToHostingServer(
      transcoded.buffer,
      finalDisplayName,
      finalExt,
      "chat",
      originalBytes,
      isHd ? MAX_CHAT_HD_VIDEO_BYTES : MAX_CHAT_ATTACHMENT_BYTES
    );
    if (!saved) {
      return res.status(400).json({
        message: isHd ? "Video HD melebihi batas maksimal 120 MB. Nonaktifkan HD agar dikompres otomatis atau perpendek potongan." : "Video hasil kompresi masih melebihi batas maksimal 30 MB. Silakan perpendek durasi potongan video."
      });
    }
    if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
    checkedWebVideoCache.add(saved.fileName.toLowerCase());
    return res.json({
      success: true,
      hostedUrl: saved.hostedUrl,
      fileName: finalDisplayName,
      originalBytes,
      savedBytes: saved.savedBytes,
      formattedSize: saved.formattedSize,
      transcoded: transcoded.transcoded,
      hd: isHd
    });
  } catch (err) {
    console.error("Finalize video upload error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan saat memotong & mengompres video." });
  } finally {
    try {
      if (fs3.existsSync(partPath)) fs3.unlinkSync(partPath);
    } catch {
    }
  }
});
app.post("/api/chat/messages", async (req, res) => {
  const {
    roomId,
    senderId,
    senderName,
    senderRole,
    senderAvatar,
    text,
    imageUrl,
    imageName,
    imageOriginalSize,
    imageCompressedSize,
    replyTo,
    linkPreview,
    forwardedFrom,
    participantIds
  } = req.body;
  if (senderRole === "admin") {
    return res.status(403).json({
      message: "Admin berada dalam Mode Monitoring dan tidak mengirim pesan di ruang chat Mitra/Staf."
    });
  }
  const cleanText = String(text || "").trim();
  if (!cleanText && !imageUrl) {
    return res.status(400).json({ message: "Isi pesan atau lampiran tidak boleh kosong." });
  }
  let room = chatRooms.find((r) => r.id === roomId);
  if (!room && typeof roomId === "string" && roomId.startsWith("room-direct-")) {
    const rawPair = Array.isArray(participantIds) && participantIds.length === 2 ? participantIds.map((pid) => String(pid).trim()).filter(Boolean) : roomId.slice("room-direct-".length).split("__").map((pid) => pid.trim()).filter(Boolean);
    if (rawPair.length === 2 && rawPair[0] !== rawPair[1] && rawPair.includes(String(senderId))) {
      const sorted = [rawPair[0], rawPair[1]].sort();
      const existingByPair = chatRooms.find(
        (r) => r.type === "direct" && r.participantIds.length === 2 && r.participantIds.includes(sorted[0]) && r.participantIds.includes(sorted[1]) && (!isProductionMode() || !LEGACY_SEEDED_CHAT_ROOM_IDS.has(r.id))
      );
      if (existingByPair) {
        room = existingByPair;
      } else {
        const participants = buildChatParticipantsList();
        const pA = participants.find((p) => p.id === sorted[0]);
        const pB = participants.find((p) => p.id === sorted[1]);
        const createdNow = (/* @__PURE__ */ new Date()).toISOString();
        const createdDirectRoom = {
          id: `room-direct-${sorted[0]}__${sorted[1]}`,
          type: "direct",
          name: `${pA?.name || sorted[0]} & ${pB?.name || sorted[1]}`,
          participantIds: sorted,
          createdBy: String(senderId),
          createdAt: createdNow,
          updatedAt: createdNow
        };
        chatRooms.unshift(createdDirectRoom);
        room = createdDirectRoom;
      }
    }
  }
  if (!room) {
    return res.status(404).json({ message: "Ruang percakapan tidak ditemukan." });
  }
  if (!room.participantIds.includes(String(senderId))) {
    return res.status(403).json({
      message: "Anda bukan anggota dari ruang percakapan atau grup ini."
    });
  }
  let finalImageUrl = imageUrl ? String(imageUrl) : void 0;
  let finalImageName = imageName ? String(imageName) : void 0;
  let resolvedCompressedSize = imageCompressedSize ? Number(imageCompressedSize) : void 0;
  if (finalImageUrl && finalImageUrl.startsWith("data:")) {
    const extFromName = String(finalImageName || "").includes(".") ? (String(finalImageName).split(".").pop() || "pdf").toLowerCase() : "jpg";
    const isUploadedVideo = finalImageUrl.toLowerCase().startsWith("data:video/") || ["mp4", "webm", "mov", "m4v", "3gp"].includes(extFromName);
    let dataUrlToSave = finalImageUrl;
    let extToSave = extFromName;
    if (isUploadedVideo) {
      const m = /^data:([^;]+);base64,(.+)$/i.exec(finalImageUrl);
      if (m) {
        const rawVidBuf = Buffer.from(m[2], "base64");
        if (rawVidBuf.length <= MAX_CHAT_ATTACHMENT_BYTES) {
          const transcoded = await transcodeVideoBufferToWebMp4(rawVidBuf, extFromName);
          if (transcoded.transcoded) {
            dataUrlToSave = `data:video/mp4;base64,${transcoded.buffer.toString("base64")}`;
            extToSave = "mp4";
            resolvedCompressedSize = transcoded.buffer.length;
            if (finalImageName && !finalImageName.toLowerCase().endsWith(".mp4")) {
              finalImageName = finalImageName.replace(/\.[^/.]+$/, "") + ".mp4";
            }
          }
        }
      }
    }
    const saved = saveDataUrlToHostingServer(
      dataUrlToSave,
      finalImageName || `chat-file-${Date.now()}`,
      extToSave,
      "chat"
    );
    if (!saved) {
      return res.status(400).json({
        message: "Format file tidak didukung atau ukuran melebihi batas maksimal 30 MB. Mendukung gambar, video, audio, dan dokumen."
      });
    }
    if (saved.cloudSyncPromise) await saved.cloudSyncPromise;
    finalImageUrl = saved.hostedUrl;
    if (isUploadedVideo) {
      const savedBase = path3.basename(saved.hostedUrl).toLowerCase();
      checkedWebVideoCache.add(savedBase);
    }
    if (!resolvedCompressedSize || resolvedCompressedSize > saved.savedBytes) {
      resolvedCompressedSize = saved.savedBytes;
    }
  }
  let resolvedLinkPreview = linkPreview;
  if (!resolvedLinkPreview && cleanText) {
    const urlMatch = cleanText.match(/https?:\/\/[^\s<>"]+/i);
    if (urlMatch) {
      const extracted = await extractServerLinkMetadata(urlMatch[0]);
      if (extracted) resolvedLinkPreview = extracted;
    }
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const newMsg = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    roomId: room.id,
    senderId: String(senderId),
    senderName: String(senderName || "Peserta"),
    senderRole: senderRole === "staff" ? "staff" : "mitra",
    senderAvatar: String(senderAvatar || MALE_AVATAR_URL),
    text: cleanText,
    imageUrl: finalImageUrl,
    imageName: finalImageName,
    imageOriginalSize: imageOriginalSize ? Number(imageOriginalSize) : void 0,
    imageCompressedSize: resolvedCompressedSize,
    linkPreview: resolvedLinkPreview,
    replyTo: replyTo || void 0,
    forwardedFrom: forwardedFrom ? String(forwardedFrom) : void 0,
    reactions: [],
    createdAt: nowIso
  };
  chatMessages.push(newMsg);
  const isImgAttachment = finalImageUrl ? isImageAttachmentUrl(finalImageUrl, newMsg.imageName) : false;
  const isVidAttachment = finalImageUrl ? isVideoAttachmentUrl(finalImageUrl, newMsg.imageName) : false;
  const isAudAttachment = finalImageUrl ? isAudioAttachmentUrl(finalImageUrl, newMsg.imageName) : false;
  const attachmentPreviewText = finalImageUrl ? isImgAttachment ? "\u{1F4F7} Mengirim gambar" : isVidAttachment ? "\u{1F3AC} Mengirim video" : isAudAttachment ? "\u{1F3B5} Mengirim audio" : `\u{1F4C4} ${newMsg.imageName || "Mengirim dokumen"}` : "Pesan baru";
  room.updatedAt = nowIso;
  room.lastMessageAt = nowIso;
  room.lastMessageSenderId = newMsg.senderId;
  room.lastMessageSenderName = newMsg.senderName;
  room.lastMessageText = cleanText || attachmentPreviewText;
  await persistChatToCloud(room, newMsg);
  const recipientIds = (room.participantIds || []).filter((pid) => pid !== newMsg.senderId);
  const previewSnippet = (cleanText || (finalImageUrl ? isImgAttachment ? "\u{1F4F7} Mengirim gambar" : isVidAttachment ? "\u{1F3AC} Mengirim video" : isAudAttachment ? "\u{1F3B5} Mengirim audio" : `\u{1F4C4} Dokumen: ${newMsg.imageName || "File"}` : "Pesan baru")).slice(0, 140);
  const chatNotifsToUpsert = [];
  const staffRecipientExists = recipientIds.some((pid) => staffAccounts.some((s) => s.id === pid));
  for (const pid of recipientIds) {
    const isMitraRecipient = mitras.some((m) => m.id === pid);
    if (!isMitraRecipient) continue;
    const notifId = `notif-chat-${room.id}-${pid}`.slice(0, 185);
    const chatNotif = {
      id: notifId,
      title: room.type === "group" ? `Pesan Grup: ${room.name}` : `Pesan Baru dari ${newMsg.senderName}`,
      message: room.type === "group" ? `${newMsg.senderName}: ${previewSnippet}` : previewSnippet,
      type: "chat",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "mitra",
      mitraId: pid
    };
    const existIdx = notifications.findIndex((n) => n.id === notifId);
    if (existIdx !== -1) notifications.splice(existIdx, 1);
    notifications.unshift(chatNotif);
    chatNotifsToUpsert.push(chatNotif);
  }
  if (staffRecipientExists) {
    const staffNotifId = `notif-chat-${room.id}-staff`.slice(0, 185);
    const staffChatNotif = {
      id: staffNotifId,
      title: room.type === "group" ? `Pesan Grup: ${room.name}` : `Pesan Chat dari ${newMsg.senderName}`,
      message: room.type === "group" ? `${newMsg.senderName}: ${previewSnippet}` : previewSnippet,
      type: "chat",
      timestamp: nowIso,
      isRead: false,
      targetAudience: "admin_staff"
    };
    const existIdx = notifications.findIndex((n) => n.id === staffNotifId);
    if (existIdx !== -1) notifications.splice(existIdx, 1);
    notifications.unshift(staffChatNotif);
    chatNotifsToUpsert.push(staffChatNotif);
  }
  if (chatNotifsToUpsert.length > 0) {
    if (db) {
      try {
        await db.from("notifications").upsert(chatNotifsToUpsert.map(toDbNotification));
      } catch (e) {
        console.warn("MySQL upsert chat notification warning:", e);
      }
    }
    saveDatabase();
  }
  broadcastChatEvent({
    type: "chat:message_created",
    message: newMsg,
    room
  });
  res.status(201).json(newMsg);
});
app.post("/api/chat/messages/:id/reactions", async (req, res) => {
  const { id } = req.params;
  const { userId, userName, userRole, emoji } = req.body;
  if (!userId || !emoji) {
    return res.status(400).json({ message: "User dan emoji reaksi wajib diisi." });
  }
  const msg = chatMessages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ message: "Pesan tidak ditemukan." });
  }
  if (msg.isDeleted) {
    return res.status(400).json({ message: "Tidak dapat memberi reaksi pada pesan yang telah ditarik." });
  }
  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room && userRole !== "admin" && !room.participantIds.includes(String(userId))) {
    return res.status(403).json({ message: "Anda bukan anggota dari ruang percakapan ini." });
  }
  const currentReactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
  const existingIdx = currentReactions.findIndex((r) => r.userId === String(userId));
  const cleanEmoji = String(emoji).trim();
  if (existingIdx !== -1) {
    if (currentReactions[existingIdx].emoji === cleanEmoji) {
      currentReactions.splice(existingIdx, 1);
    } else {
      currentReactions[existingIdx] = {
        emoji: cleanEmoji,
        userId: String(userId),
        userName: String(userName || "Peserta"),
        userRole: userRole === "staff" ? "staff" : userRole === "admin" ? "admin" : "mitra",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  } else {
    currentReactions.push({
      emoji: cleanEmoji,
      userId: String(userId),
      userName: String(userName || "Peserta"),
      userRole: userRole === "staff" ? "staff" : userRole === "admin" ? "admin" : "mitra",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  msg.reactions = currentReactions;
  await persistChatToCloud(void 0, msg);
  broadcastChatEvent({ type: "chat:message_updated", message: msg });
  res.json(msg);
});
app.put("/api/chat/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { userId, text } = req.body;
  const msg = chatMessages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ message: "Pesan tidak ditemukan." });
  }
  if (msg.senderId !== String(userId)) {
    return res.status(403).json({ message: "Anda hanya dapat mengedit pesan milik Anda sendiri." });
  }
  if (msg.isDeleted) {
    return res.status(400).json({ message: "Pesan yang sudah ditarik tidak dapat diedit." });
  }
  const elapsedMs = Date.now() - new Date(msg.createdAt).getTime();
  if (elapsedMs >= 5 * 60 * 1e3) {
    return res.status(400).json({
      message: "Batas waktu edit 5 menit telah berakhir. Pesan tidak dapat diubah lagi."
    });
  }
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return res.status(400).json({ message: "Teks pesan tidak boleh kosong." });
  }
  msg.text = cleanText;
  msg.editedAt = (/* @__PURE__ */ new Date()).toISOString();
  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room) {
    room.lastMessageText = `${cleanText} (diedit)`;
  }
  await persistChatToCloud(room, msg);
  broadcastChatEvent({ type: "chat:message_updated", message: msg });
  res.json(msg);
});
app.delete("/api/chat/messages/:id", async (req, res) => {
  const { id } = req.params;
  const userId = String(req.query.userId || req.body?.userId || "").trim();
  const msg = chatMessages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ message: "Pesan tidak ditemukan." });
  }
  if (msg.senderId !== userId) {
    return res.status(403).json({ message: "Anda hanya dapat menarik pesan milik Anda sendiri." });
  }
  const elapsedMs = Date.now() - new Date(msg.createdAt).getTime();
  if (elapsedMs >= 5 * 60 * 1e3) {
    return res.status(400).json({
      message: "Batas waktu penarikan pesan 5 menit telah berakhir."
    });
  }
  const prevImageUrl = msg.imageUrl;
  msg.isDeleted = true;
  msg.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
  msg.text = "";
  msg.imageUrl = void 0;
  msg.imageName = void 0;
  msg.imageOriginalSize = void 0;
  msg.imageCompressedSize = void 0;
  msg.linkPreview = void 0;
  msg.reactions = [];
  msg.isPinned = false;
  msg.pinnedAt = void 0;
  msg.pinnedBy = void 0;
  msg.pinnedByName = void 0;
  if (prevImageUrl) {
    await deleteHostedUploadFile(prevImageUrl);
  }
  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room) {
    room.lastMessageText = "\u{1F6AB} Pesan telah ditarik";
  }
  await persistChatToCloud(room, msg);
  broadcastChatEvent({ type: "chat:message_updated", message: msg, room });
  res.json(msg);
});
app.post("/api/chat/messages/:id/pin", async (req, res) => {
  const { id } = req.params;
  const { userId, userName, userRole, pinned } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "Identitas pengguna wajib diisi." });
  }
  if (userRole === "admin") {
    return res.status(403).json({
      message: "Admin berada dalam Mode Monitoring dan tidak menyematkan pesan."
    });
  }
  const msg = chatMessages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ message: "Pesan tidak ditemukan." });
  }
  if (msg.isDeleted || msg.isSystemMessage) {
    return res.status(400).json({
      message: "Pesan sistem atau pesan yang sudah ditarik tidak dapat disematkan."
    });
  }
  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (!room || !room.participantIds.includes(String(userId))) {
    return res.status(403).json({
      message: "Anda bukan anggota dari ruang percakapan ini."
    });
  }
  const nextPinned = typeof pinned === "boolean" ? pinned : !Boolean(msg.isPinned);
  msg.isPinned = nextPinned;
  if (nextPinned) {
    msg.pinnedAt = (/* @__PURE__ */ new Date()).toISOString();
    msg.pinnedBy = String(userId);
    msg.pinnedByName = String(userName || "Peserta");
  } else {
    msg.pinnedAt = void 0;
    msg.pinnedBy = void 0;
    msg.pinnedByName = void 0;
  }
  await persistChatToCloud(void 0, msg);
  broadcastChatEvent({ type: "chat:message_updated", message: msg });
  res.json(msg);
});
app.put("/api/chat/settings", async (req, res) => {
  const { chatEnabled } = req.body;
  appSettings.chatEnabled = Boolean(chatEnabled);
  saveDatabase();
  await persistSettingsToMysql();
  broadcastChatEvent({
    type: "chat:sync",
    chatEnabled: appSettings.chatEnabled
  });
  res.json({
    success: true,
    message: appSettings.chatEnabled ? "Fitur Live Chat berhasil DIAKTIFKAN untuk seluruh Mitra & Staf." : "Fitur Live Chat berhasil DINONAKTIFKAN untuk Mitra & Staf.",
    settings: {
      ...appSettings,
      smtpPassword: appSettings.smtpPassword ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
    }
  });
});
var verifyAdminChatActor = (req) => {
  const role = String(
    req.body?.actorRole || req.query.actorRole || req.headers["x-actor-role"] || ""
  ).trim().toLowerCase();
  if (role !== "admin") return false;
  const actorId = String(req.body?.actorId || req.query.actorId || "").trim();
  const actorEmail = String(req.body?.actorEmail || req.query.actorEmail || "").trim().toLowerCase();
  if (actorId) {
    const isMitra = mitras.some((m) => m.id === actorId);
    const isStaff = staffAccounts.some((s) => s.id === actorId);
    if (isMitra || isStaff) return false;
  }
  if (actorEmail && actorEmail !== adminAccount.email.toLowerCase()) {
    const isMitraEmail = mitras.some((m) => m.email.toLowerCase() === actorEmail);
    const isStaffEmail = staffAccounts.some((s) => s.email.toLowerCase() === actorEmail);
    if (isMitraEmail || isStaffEmail) return false;
  }
  return true;
};
var computeChatResetCutoffMs = (period) => {
  const now = /* @__PURE__ */ new Date();
  if (period === "all") return Number.POSITIVE_INFINITY;
  if (period === "3m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.getTime();
  }
  if (period === "6m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d.getTime();
  }
  if (period === "1y") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d.getTime();
  }
  return null;
};
var isImageAttachmentUrl = (url, fileName) => {
  const target = `${url} ${fileName || ""}`.toLowerCase();
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|webp|gif|svg)(\b|\?|$)/i.test(target);
};
var isVideoAttachmentUrl = (url, fileName) => {
  const target = `${url} ${fileName || ""}`.toLowerCase();
  if (url.startsWith("data:video/")) return true;
  return /\.(mp4|webm|mov|m4v|3gp)(\b|\?|$)/i.test(target);
};
var isAudioAttachmentUrl = (url, fileName) => {
  const target = `${url} ${fileName || ""}`.toLowerCase();
  if (url.startsWith("data:audio/")) return true;
  return /\.(mp3|wav|m4a|ogg|aac|opus)(\b|\?|$)/i.test(target);
};
app.get("/api/chat/admin/files", async (req, res) => {
  if (!verifyAdminChatActor(req)) {
    return res.status(403).json({ success: false, message: "Akses khusus Administrator." });
  }
  if (db && (isProductionMode() || chatMessages.length === 0)) {
    await syncChatFromMysql();
  }
  const roomMap = new Map(chatRooms.map((r) => [r.id, r]));
  const items = [];
  let totalBytes = 0;
  for (const msg of chatMessages) {
    if (msg.isDeleted || !msg.imageUrl) continue;
    if (isProductionMode() && LEGACY_SEEDED_CHAT_MSG_IDS.has(msg.id)) continue;
    const room = roomMap.get(msg.roomId);
    const parsed = parseHostedUploadUrl(msg.imageUrl);
    const diskSize = getHostedUploadByteSize(msg.imageUrl);
    const byteSize = diskSize > 0 ? diskSize : Number(msg.imageCompressedSize || msg.imageOriginalSize || 0);
    totalBytes += byteSize;
    const resolvedName = msg.imageName || parsed?.fileName || `lampiran-${msg.id}.jpg`;
    items.push({
      id: msg.id,
      messageId: msg.id,
      roomId: msg.roomId,
      roomName: room?.name || msg.roomId,
      roomType: room?.type === "group" ? "group" : "direct",
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      fileUrl: msg.imageUrl,
      fileName: resolvedName,
      isImage: isImageAttachmentUrl(msg.imageUrl, resolvedName),
      isVideo: isVideoAttachmentUrl(msg.imageUrl, resolvedName),
      isAudio: isAudioAttachmentUrl(msg.imageUrl, resolvedName),
      byteSize,
      formattedSize: formatFileSizeServer(byteSize),
      caption: msg.text || "",
      createdAt: msg.createdAt
    });
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({
    success: true,
    data: items,
    summary: {
      totalFiles: items.length,
      totalBytes,
      totalFormattedSize: formatFileSizeServer(totalBytes)
    }
  });
});
app.delete("/api/chat/admin/files/:messageId", async (req, res) => {
  if (!verifyAdminChatActor(req)) {
    return res.status(403).json({ success: false, message: "Akses khusus Administrator." });
  }
  if (db && (isProductionMode() || chatMessages.length === 0)) {
    await syncChatFromMysql();
  }
  const { messageId } = req.params;
  const msg = chatMessages.find((m) => m.id === messageId);
  if (!msg || !msg.imageUrl) {
    return res.status(404).json({ success: false, message: "File chat tidak ditemukan." });
  }
  const oldUrl = msg.imageUrl;
  const oldName = msg.imageName || parseHostedUploadUrl(oldUrl)?.fileName || messageId;
  msg.imageUrl = void 0;
  msg.imageName = void 0;
  msg.imageOriginalSize = void 0;
  msg.imageCompressedSize = void 0;
  if (!msg.text) {
    msg.isDeleted = true;
    msg.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  await deleteHostedUploadFile(oldUrl);
  const room = chatRooms.find((r) => r.id === msg.roomId);
  if (room) {
    const latestRoomMsg = chatMessages.filter((m) => m.roomId === room.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (latestRoomMsg && latestRoomMsg.id === msg.id) {
      room.lastMessageText = msg.text || "Lampiran dihapus oleh Admin";
    }
  }
  await persistChatToCloud(room, msg);
  recordActivity({
    actorRole: "admin",
    actorId: String(req.body?.actorId || req.query.actorId || adminAccount.id),
    actorName: String(req.body?.actorName || req.query.actorName || adminAccount.name),
    actorEmail: String(req.body?.actorEmail || req.query.actorEmail || adminAccount.email),
    actionType: "chat_file_delete",
    operation: "DELETE",
    targetEntity: "Galeri File Chat",
    description: `Admin menghapus file chat "${oldName}" dari ruang ${room?.name || msg.roomId}.`
  });
  broadcastChatEvent({ type: "chat:message_updated", message: msg, room });
  broadcastChatEvent({ type: "chat:sync" });
  return res.json({
    success: true,
    deletedMessageId: msg.id
  });
});
app.get("/api/chat/admin/reset-stats", async (req, res) => {
  if (!verifyAdminChatActor(req)) {
    return res.status(403).json({ success: false, message: "Akses khusus Administrator." });
  }
  if (db && (isProductionMode() || chatMessages.length === 0)) {
    await syncChatFromMysql();
  }
  const activeMsgs = isProductionMode() ? chatMessages.filter((m) => !LEGACY_SEEDED_CHAT_MSG_IDS.has(m.id)) : chatMessages;
  const countFor = (period) => {
    const cutoff = computeChatResetCutoffMs(period);
    if (cutoff === null) return { messages: 0, files: 0, totalBytes: 0, formattedSize: "0 B" };
    let messages = 0;
    let files = 0;
    let totalBytes = 0;
    for (const m of activeMsgs) {
      const ts = new Date(m.createdAt || 0).getTime();
      if (period === "all" || Number.isFinite(ts) && ts < cutoff) {
        messages++;
        if (m.imageUrl && !m.isDeleted) {
          files++;
          const sz = getHostedUploadByteSize(m.imageUrl) || Number(m.imageCompressedSize || 0);
          totalBytes += sz;
        }
      }
    }
    return {
      messages,
      files,
      totalBytes,
      formattedSize: formatFileSizeServer(totalBytes)
    };
  };
  return res.json({
    success: true,
    stats: {
      "3m": countFor("3m"),
      "6m": countFor("6m"),
      "1y": countFor("1y"),
      all: countFor("all")
    }
  });
});
app.post("/api/chat/admin/reset", async (req, res) => {
  if (!verifyAdminChatActor(req)) {
    return res.status(403).json({ success: false, message: "Akses khusus Administrator." });
  }
  const period = String(req.body?.period || "").trim().toLowerCase();
  const cutoffMs = computeChatResetCutoffMs(period);
  if (cutoffMs === null) {
    return res.status(400).json({ success: false, message: "Periode reset tidak valid." });
  }
  if (db && (isProductionMode() || chatMessages.length === 0)) {
    await syncChatFromMysql();
  }
  const toDelete = [];
  const toKeep = [];
  for (const m of chatMessages) {
    const ts = new Date(m.createdAt || 0).getTime();
    if (period === "all" || Number.isFinite(ts) && ts < cutoffMs) {
      toDelete.push(m);
    } else {
      toKeep.push(m);
    }
  }
  const deletedMessageIds = toDelete.map((m) => m.id);
  const candidateFileUrls = Array.from(
    new Set(toDelete.map((m) => m.imageUrl).filter((u) => Boolean(u)))
  );
  chatMessages = toKeep;
  let deletedFilesCount = 0;
  for (const fileUrl of candidateFileUrls) {
    const removed = await deleteHostedUploadFile(fileUrl);
    if (removed) deletedFilesCount++;
  }
  const remainingByRoom = /* @__PURE__ */ new Map();
  for (const m of chatMessages) {
    const arr = remainingByRoom.get(m.roomId) || [];
    arr.push(m);
    remainingByRoom.set(m.roomId, arr);
  }
  const removedRoomIds = [];
  const updatedRooms = [];
  for (const room of chatRooms) {
    const msgs = remainingByRoom.get(room.id) || [];
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      room.lastMessageAt = last.createdAt;
      room.lastMessageSenderId = last.senderId;
      room.lastMessageSenderName = last.senderName;
      room.lastMessageText = last.isDeleted ? "\u{1F6AB} Pesan telah ditarik" : last.text || (last.imageUrl ? isImageAttachmentUrl(last.imageUrl, last.imageName) ? "\u{1F4F7} Mengirim gambar" : isVideoAttachmentUrl(last.imageUrl, last.imageName) ? "\u{1F3AC} Mengirim video" : isAudioAttachmentUrl(last.imageUrl, last.imageName) ? "\u{1F3B5} Mengirim audio" : `\u{1F4C4} ${last.imageName || "Mengirim dokumen"}` : "Pesan baru");
      room.updatedAt = last.createdAt;
      updatedRooms.push(room);
    } else if (room.type === "group") {
      room.lastMessageText = "";
      room.lastMessageAt = void 0;
      room.lastMessageSenderId = void 0;
      room.lastMessageSenderName = void 0;
      updatedRooms.push(room);
    } else {
      removedRoomIds.push(room.id);
    }
  }
  chatRooms = updatedRooms;
  const deletedChatNotifIds = [];
  notifications = notifications.filter((n) => {
    if (n.type !== "chat") return true;
    const ts = new Date(n.timestamp || 0).getTime();
    if (period === "all" || Number.isFinite(ts) && ts < cutoffMs) {
      deletedChatNotifIds.push(n.id);
      return false;
    }
    return true;
  });
  if (db) {
    try {
      const CHUNK = 200;
      for (let i = 0; i < deletedMessageIds.length; i += CHUNK) {
        await db.from("chat_messages").delete().in("id", deletedMessageIds.slice(i, i + CHUNK));
      }
      for (let i = 0; i < removedRoomIds.length; i += CHUNK) {
        await db.from("chat_rooms").delete().in("id", removedRoomIds.slice(i, i + CHUNK));
      }
      if (chatRooms.length > 0) {
        await db.from("chat_rooms").upsert(chatRooms);
      }
      for (let i = 0; i < deletedChatNotifIds.length; i += CHUNK) {
        await db.from("notifications").delete().in("id", deletedChatNotifIds.slice(i, i + CHUNK));
      }
    } catch (e) {
      console.warn("MySQL chat reset table delete warning:", e);
    }
    try {
      await db.from("user_passwords").upsert([
        {
          email: "__sys_chat_rooms__@ndtaxlaw.internal",
          password: JSON.stringify(chatRooms)
        },
        {
          email: "__sys_chat_messages__@ndtaxlaw.internal",
          password: JSON.stringify(chatMessages)
        }
      ]);
    } catch (e) {
      console.warn("MySQL chat reset KV sync warning:", e);
    }
  }
  saveDatabase();
  const periodLabel = period === "3m" ? "> 3 bulan lalu" : period === "6m" ? "> 6 bulan lalu" : period === "1y" ? "> 1 tahun lalu" : "semua riwayat chat";
  recordActivity({
    actorRole: "admin",
    actorId: String(req.body?.actorId || adminAccount.id),
    actorName: String(req.body?.actorName || adminAccount.name),
    actorEmail: String(req.body?.actorEmail || adminAccount.email),
    actionType: "chat_reset",
    operation: "DELETE",
    targetEntity: "Reset Chat",
    description: `Admin mereset chat (${periodLabel}): ${deletedMessageIds.length} pesan & ${deletedFilesCount} file dihapus permanen.`
  });
  broadcastChatEvent({ type: "chat:sync" });
  return res.json({
    success: true,
    deletedMessages: deletedMessageIds.length,
    deletedFiles: deletedFilesCount,
    deletedRooms: removedRoomIds.length
  });
});
async function startServer() {
  const distPath = path3.join(__dirname, "dist");
  const distIndexPath = path3.join(distPath, "index.html");
  const hasDistBuild = fs3.existsSync(distIndexPath);
  const isCompiledServer = __filename.endsWith("server.js");
  const shouldServeStaticDist = hasDistBuild && (process.env.NODE_ENV === "production" || isCompiledServer);
  if (shouldServeStaticDist) {
    const sendSanitizedDistHtml = (_req, res) => {
      try {
        const rawHtml = fs3.readFileSync(distIndexPath, "utf-8");
        const safeHtml = rawHtml.replace(/\scrossorigin(?:="[^"]*")?/gi, "");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(safeHtml);
      } catch {
        res.sendFile(distIndexPath);
      }
    };
    app.get("/", sendSanitizedDistHtml);
    app.get("/index.html", sendSanitizedDistHtml);
    app.use(express.static(distPath, { index: false }));
    app.get("*", sendSanitizedDistHtml);
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const httpServer = app.listen(PORT, () => {
    console.log(`NDTAXANDLAW Server is running on port ${PORT} (static=${shouldServeStaticDist})`);
    initWhatsAppIfSavedSession();
  });
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      const first = protocols.values().next().value;
      return first || false;
    }
  });
  wss.on("connection", (ws) => {
    chatWsClients.add(ws);
    ws.on("close", () => {
      chatWsClients.delete(ws);
    });
    ws.on("error", () => {
      chatWsClients.delete(ws);
    });
  });
  httpServer.on("upgrade", (request, socket, head) => {
    const reqUrl = request.url || "";
    if (reqUrl.startsWith("/ws/chat")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      wss.handleUpgrade(request, socket, head, (ws) => {
        try {
          ws.send(JSON.stringify({ type: "connected" }));
        } catch {
        }
      });
    }
  });
}
startServer();
export {
  DEFAULT_BONUS_REWARD_TIERS,
  DEFAULT_BONUS_TARGET_CONFIG,
  DEFAULT_CLIENT_FORM_FIELDS,
  DEFAULT_COMMISSION_SCHEME,
  DEFAULT_FIRM_TAGLINE,
  DEFAULT_MITRA_FORM_FIELDS2 as DEFAULT_MITRA_FORM_FIELDS,
  DEFAULT_SPECIALIZATION_LABEL2 as DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  DEFAULT_STAFF_ALLOWED_MENUS,
  LEGACY_SEEDED_CHAT_MSG_IDS,
  LEGACY_SEEDED_CHAT_ROOM_IDS,
  calculateClientDealCommission,
  cleanupLocalDatabaseFileInProduction,
  computeDynamicSalesHistory,
  encryptUserPassword,
  escapeHtml,
  extractUserRole,
  formatMitraMemberCode,
  fromDbClientDeal,
  fromDbEmailLogRow,
  getRoleDefinition,
  getThreeMonthsAgoCutoff,
  isEncryptedPassword,
  isProductionMode,
  loadDatabase,
  normalizeFirmTagline,
  normalizeServicesCatalog,
  normalizeSpecializationOptions,
  persistActivityLogsToMysql,
  persistEmailLogsToMysql,
  persistSettingsToMysql,
  pruneOldLogs,
  recordActivity,
  safeTimingCompare,
  sanitizeSqlIdentifier,
  saveDatabase,
  sendSystemEmail,
  syncFromMysql,
  toDbClientDeal,
  toDbEmailLogRow,
  verifyUserPassword
};
