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

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  error?: string;
}> => {
  if (!supabase) {
    return {
      success: false,
      message: 'SUPABASE_URL atau SUPABASE_KEY belum terisi di environment variable server hosting Anda.',
    };
  }

  try {
    // Test basic query to mitras table
    const { data, error } = await supabase.from('mitras').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Terhubung ke Supabase, namun tabel belum dibuat! Silakan jalankan file supabase_schema.sql di SQL Editor Supabase Anda.',
          error: error.message,
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase mengembalikan error: ${error.message} (Kode: ${error.code})`,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil aktif dan tabel database terdeteksi dengan baik!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Koneksi timeout / jaringan'}`,
      error: err.message,
    };
  }
};
