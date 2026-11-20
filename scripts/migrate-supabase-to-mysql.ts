import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  TABLE_DEFINITIONS,
  ensureMysqlSchema,
  getMysqlConfig,
  getMysqlPool,
  migrateFromSupabaseToMysql,
  mysqlDb,
} from '../src/mysql.ts';

dotenv.config();

const args = process.argv.slice(2);

const getArg = (prefix: string): string | undefined => {
  const found = args.find((a) => a.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : undefined;
};

const hasFlag = (flag: string): boolean => args.includes(flag);

const printHelp = () => {
  console.log(`
================================================================================
  NDTAXANDLAW — PRODUCTION MIGRATION TOOL (SUPABASE -> MYSQL)
================================================================================

Cara Pakai 1 — Migrasi Langsung dari Production Supabase ke MySQL:
  Pastikan di .env (atau environment shell) sudah terisi:
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
    MIGRATE_SUPABASE_URL="https://xxxx.supabase.co"
    MIGRATE_SUPABASE_KEY="eyJ...service_role_key..."

  Lalu jalankan:
    npm run migrate:mysql -- --dry-run          (Cek jumlah data Supabase tanpa menulis ke MySQL)
    npm run migrate:mysql                       (Migrasi mode MERGE aman ke MySQL)
    npm run migrate:mysql -- --mode=replace     (Kosongkan tabel MySQL dulu lalu isi penuh dari Supabase)

Cara Pakai 2 — Migrasi Offline dari File Backup JSON Supabase:
    npm run migrate:mysql -- --from-json=./supabase-backup.json
    npm run migrate:mysql -- --from-json=./supabase-backup.json --mode=replace

Opsi:
  --supabase-url=<URL>       Override URL Supabase sumber
  --supabase-key=<KEY>       Override Service Role Key Supabase sumber
  --from-json=<PATH>         Migrasi dari file JSON hasil backup aplikasi
  --mode=merge|replace       merge (default, aman upsert) | replace (hapus target dulu)
  --dry-run                  Simulasi pengecekan data tanpa menulis ke MySQL
  --help                     Tampilkan panduan ini
`);
};

async function runFromJson(jsonPath: string, mode: 'merge' | 'replace', dryRun: boolean) {
  const resolved = path.resolve(process.cwd(), jsonPath);
  if (!fs.existsSync(resolved)) {
    console.error(`[ERROR] File JSON tidak ditemukan: ${resolved}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  const tablesObj = raw?.tables || raw?.data || raw;
  if (!tablesObj || typeof tablesObj !== 'object') {
    console.error('[ERROR] Format file JSON backup tidak valid (tidak ditemukan objek tables/data).');
    process.exit(1);
  }

  console.log(`\n[Sumber] File Backup JSON: ${resolved}`);
  console.log(`[Mode]   ${dryRun ? 'DRY-RUN (Simulasi)' : mode.toUpperCase()}`);

  const cfg = getMysqlConfig();
  if (!dryRun) {
    if (!cfg.isConfigured) {
      console.error('[ERROR] Kredensial MYSQL_HOST / MYSQL_USER / MYSQL_DATABASE belum dikonfigurasi di .env.');
      process.exit(1);
    }
    console.log(`[Target] MySQL: ${cfg.connectionLabel}`);
    const initRes = await ensureMysqlSchema();
    if (!initRes.success) {
      console.error(`[ERROR] ${initRes.message}`);
      process.exit(1);
    }
    console.log(`[Skema]  ${initRes.message}\n`);
  }

  const pool = getMysqlPool();
  let totalSource = 0;
  let totalMigrated = 0;

  for (const def of TABLE_DEFINITIONS) {
    // Support both snake_case table keys and camelCase legacy backup keys
    const camelAlias: Record<string, string> = {
      client_deals: 'clientDeals',
      payout_requests: 'payoutRequests',
      marketing_tools: 'marketingTools',
      activity_logs: 'activityLogs',
      email_logs: 'emailLogs',
      user_passwords: 'userPasswords',
      chat_rooms: 'chatRooms',
      chat_messages: 'chatMessages',
    };

    let rows: any[] = [];
    if (Array.isArray(tablesObj[def.table])) {
      rows = tablesObj[def.table];
    } else if (camelAlias[def.table] && Array.isArray(tablesObj[camelAlias[def.table]])) {
      rows = tablesObj[camelAlias[def.table]];
    } else if (def.table === 'user_passwords' && tablesObj.userPasswords && typeof tablesObj.userPasswords === 'object') {
      rows = Object.entries(tablesObj.userPasswords).map(([email, password]) => ({ email, password }));
    }

    totalSource += rows.length;

    if (dryRun) {
      console.log(`  - ${def.table.padEnd(18)} : ${String(rows.length).padStart(6)} baris (DRY-RUN)`);
      continue;
    }

    if (mode === 'replace') {
      await pool!.query(`DELETE FROM \`${def.table}\``);
    }

    if (rows.length > 0) {
      const { error } = await mysqlDb.from(def.table).upsert(rows);
      if (error) {
        console.error(`  [ERROR] ${def.table}: ${error.message}`);
        continue;
      }
      totalMigrated += rows.length;
    }

    const [cntRows]: any = await pool!.query(`SELECT COUNT(*) AS cnt FROM \`${def.table}\``);
    const finalCount = Number(cntRows?.[0]?.cnt || 0);
    console.log(
      `  ✓ ${def.table.padEnd(18)} : Sumber=${String(rows.length).padStart(6)} | Masuk=${String(rows.length).padStart(6)} | Total MySQL=${String(finalCount).padStart(6)}`
    );
  }

  console.log(`\n================================================================================`);
  console.log(
    dryRun
      ? `DRY-RUN SELESAI: Total ${totalSource} baris ditemukan di file JSON.`
      : `MIGRASI JSON -> MYSQL SELESAI! Total ${totalMigrated}/${totalSource} baris berhasil masuk ke MySQL.`
  );
  console.log(`================================================================================\n`);

  if (pool) await pool.end();
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp();
    process.exit(0);
  }

  const modeArg = (getArg('--mode') || 'merge').toLowerCase();
  const mode: 'merge' | 'replace' = modeArg === 'replace' ? 'replace' : 'merge';
  const dryRun = hasFlag('--dry-run');
  const fromJson = getArg('--from-json');

  if (fromJson) {
    await runFromJson(fromJson, mode, dryRun);
    return;
  }

  const supabaseUrl =
    getArg('--supabase-url') ||
    process.env.MIGRATE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const supabaseKey =
    getArg('--supabase-key') ||
    process.env.MIGRATE_SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('[ERROR] MIGRATE_SUPABASE_URL dan MIGRATE_SUPABASE_KEY (atau --supabase-url / --supabase-key / --from-json) wajib diisi.');
    printHelp();
    process.exit(1);
  }

  const cfg = getMysqlConfig();
  console.log(`\n================================================================================`);
  console.log(`  MEMULAI MIGRASI PRODUKSI: SUPABASE -> MYSQL`);
  console.log(`================================================================================`);
  console.log(`[Sumber] Supabase : ${supabaseUrl}`);
  console.log(`[Target] MySQL    : ${cfg.isConfigured ? cfg.connectionLabel : '(Belum dikonfigurasi)'}`);
  console.log(`[Mode]            : ${dryRun ? 'DRY-RUN (Cek Data Saja)' : mode.toUpperCase()}\n`);

  const result = await migrateFromSupabaseToMysql({
    supabaseUrl,
    supabaseKey,
    mode,
    dryRun,
  });

  for (const t of result.tables) {
    const icon = t.status === 'ok' ? '✓' : t.status === 'skipped' ? '○' : '✗';
    const detail = t.error
      ? `(${t.error})`
      : dryRun
      ? `Sumber=${t.sourceCount}`
      : `Sumber=${t.sourceCount} | Masuk=${t.migratedCount} | Total MySQL=${t.mysqlFinalCount}`;
    console.log(`  ${icon} ${t.table.padEnd(18)} : ${detail}`);
  }

  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(result.message);
  console.log(`--------------------------------------------------------------------------------\n`);

  const pool = getMysqlPool();
  if (pool) await pool.end();

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL MIGRATION ERROR]', err);
  process.exit(1);
});
