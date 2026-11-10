import React, { useState } from 'react';
import { 
  UserPlus, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Building2, 
  AlertCircle 
} from 'lucide-react';
import { BankDetails } from '../types';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
  }) => Promise<any>;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nik, setNik] = useState('');
  const [specialization, setSpecialization] = useState('Konsultan Hukum Korporasi & Bisnis');
  const [password, setPassword] = useState('');
  
  // Bank fields
  const [bankName, setBankName] = useState('Bank Central Asia (BCA)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onRegister({
        fullName,
        email,
        phone,
        nik: nik || '3201000000000000',
        specialization,
        bankDetails: {
          bankName,
          accountNumber,
          accountHolder: accountHolder || fullName,
        },
        password: password || 'mitraND2026!',
      });
      setIsDone(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pendaftaran gagal diproses. Silakan periksa kembali data Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {!isDone ? (
          <>
            {/* FIXED STICKY HEADER */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 p-1.5 flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                  <img
                    src="/assets/aistudio/logo_kotak_5ecb05e4.png"
                    alt="ND Logo"
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Pendaftaran Mitra NDTAXANDLAW
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lengkapi data diri dan rekening bank untuk verifikasi dan penerbitan Kartu Identitas Eksklusif.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-lg font-bold"
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* SCROLLABLE FORM BODY */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Gagal Mendaftar</p>
                      <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Section 1: Data Diri */}
              <div>
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                  1. Data Diri &amp; Keahlian Profesional
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap &amp; Gelar *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Reza, S.H., M.H."
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (!accountHolder) setAccountHolder(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor KTP / NIK *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        placeholder="16 digit NIK resmi"
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Spesialisasi Konsultan
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      >
                        <option value="Konsultan Hukum Korporasi & Bisnis">Konsultan Hukum Korporasi &amp; Bisnis</option>
                        <option value="Konsultan Perpajakan & Tax Planning">Konsultan Perpajakan &amp; Tax Planning</option>
                        <option value="Pendirian Legalitas PT / PMA & OSS">Pendirian Legalitas PT / PMA &amp; OSS</option>
                        <option value="Litigasi & Penyelesaian Sengketa">Litigasi &amp; Penyelesaian Sengketa</option>
                        <option value="Audit Pajak & Pendampingan SP2DK">Audit Pajak &amp; Pendampingan SP2DK</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Resmi *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        No. WhatsApp Aktif *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0812-xxxx-xxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Data Rekening Bank untuk Komisi */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                  <span>2. Data Rekening Bank Pencairan Komisi</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Komisi dan bonus penjualan layanan NDTAXANDLAW akan ditransfer secara otomatis ke nomor rekening ini.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Bank *
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    >
                      <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                      <option value="Bank Mandiri">Bank Mandiri</option>
                      <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                      <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                      <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                      <option value="CIMB Niaga">CIMB Niaga</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Rekening *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 8830192837"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Pemilik Rekening *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Harus sesuai buku tabungan"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Portal Kemitraan
                </label>
                <input
                  type="password"
                  placeholder="Minimal 8 karakter aman"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* FIXED BOTTOM FOOTER BUTTONS */}
            <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Kirim Pendaftaran Mitra'}
              </button>
            </div>
          </form>
        </>
        ) : (
          <div className="text-center p-6 sm:p-8">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Pendaftaran Kemitraan Berhasil!
            </h3>
            <div className="mt-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-left max-w-md mx-auto text-xs text-blue-950 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="font-semibold text-blue-900">Langkah Berikutnya: Verifikasi Email Anda</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Kode verifikasi 6-digit telah dikirimkan secara otomatis ke alamat email: <strong className="font-mono text-blue-950">{email}</strong>.
              </p>
              <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                Penting: Akun Anda belum dapat digunakan untuk masuk (login) sebelum melakukan verifikasi email. Silakan masukkan kode verifikasi 6-digit saat masuk ke portal.
              </p>
            </div>

            <button
              onClick={() => {
                setIsDone(false);
                onClose();
              }}
              className="mt-6 px-6 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors"
            >
              Selesai &amp; Buka Halaman Masuk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
