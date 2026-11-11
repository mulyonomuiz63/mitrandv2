import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  User, 
  Phone, 
  CreditCard, 
  Building2, 
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  Check
} from 'lucide-react';
import { AuthUser, BankDetails } from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar } from '../avatars';

interface AuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onRegisterSubmit: (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
  }) => Promise<void>;
  appEnvironment?: 'development' | 'production';
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onRegisterSubmit,
  appEnvironment = 'development',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email Verification States
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Register Form States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regSpecialization, setRegSpecialization] = useState('Konsultan Hukum Korporasi & Bisnis');
  const [regBankName, setRegBankName] = useState('Bank Central Asia (BCA)');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regAccountHolder, setRegAccountHolder] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Handle Quick Demo Login Pills
  const handleQuickLogin = async (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else if (data.needsEmailVerification) {
        setVerifyEmail(data.email || email);
        setVerifyToken('');
        setAuthMode('verify');
        setVerifyError(data.message || 'Akun Anda belum melakukan verifikasi email.');
      } else {
        setLoginError(data.message || 'Gagal masuk.');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else if (data.needsEmailVerification) {
        setVerifyEmail(data.email || loginEmail);
        setVerifyToken('');
        setAuthMode('verify');
        setVerifyError(data.message || 'Akun Anda belum melakukan verifikasi email.');
      } else {
        setLoginError(data.message || 'Email atau kata sandi tidak valid.');
      }
    } catch (err) {
      setLoginError('Gagal menghubungkan ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      await onRegisterSubmit({
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        nik: regNik || '3201000000000000',
        specialization: regSpecialization,
        gender: regGender,
        avatarUrl: getDefaultAvatar(regGender),
        bankDetails: {
          bankName: regBankName,
          accountNumber: regAccountNumber,
          accountHolder: regAccountHolder || regFullName,
        },
        password: regPassword || 'mitraND2026!',
      });

      setVerifyEmail(regEmail);
      setVerifyToken('');
      setVerifySuccess('Pendaftaran berhasil! Kode verifikasi 6-digit telah dikirimkan ke email Anda. Silakan masukkan kode dari email Anda di bawah untuk mengaktifkan akun.');
      setAuthMode('verify');
    } catch (err: any) {
      setLoginError(err.message || 'Gagal mengirim pendaftaran.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, token: verifyToken }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifySuccess(data.message || 'Verifikasi email berhasil! Mengalihkan ke login...');
        setTimeout(() => {
          setLoginEmail(verifyEmail);
          setLoginPassword(regPassword || 'mitraND2026!');
          setAuthMode('login');
          setVerifySuccess(null);
        }, 1800);
      } else {
        setVerifyError(data.message || 'Kode verifikasi tidak cocok.');
      }
    } catch {
      setVerifyError('Terjadi kesalahan koneksi saat verifikasi email.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);
    setVerifyError(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyToken('');
        setResendMessage(data.message || 'Kode verifikasi baru berhasil dikirim ke email Anda. Silakan cek kotak masuk atau folder Spam.');
      } else {
        setVerifyError(data.message || 'Gagal mengirim ulang kode.');
      }
    } catch {
      setVerifyError('Gagal menghubungi server untuk kirim ulang kode.');
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpCode('');
        setForgotStep(2);
        setForgotMessage(data.message);
      } else {
        setForgotError(data.message || 'Email tidak ditemukan.');
      }
    } catch {
      setForgotError('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setForgotError('Konfirmasi kata sandi tidak sesuai.');
      return;
    }
    setForgotError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setForgotMessage('Kata sandi berhasil diatur ulang! Mengalihkan ke halaman masuk...');
        setTimeout(() => {
          setLoginEmail(forgotEmail);
          setLoginPassword(newPassword);
          setAuthMode('login');
          setForgotStep(1);
          setForgotMessage(null);
        }, 1800);
      } else {
        setForgotError(data.message || 'Gagal mengatur ulang kata sandi.');
      }
    } catch {
      setForgotError('Gagal memproses pengaturan sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Left Column: Brand Hero & Value Propositions (5 cols on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B2545] via-[#113872] to-[#061835] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Guilloche / Luxury Pattern */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900/80 p-2 border border-amber-300/30 flex items-center justify-center shadow-lg">
                <img
                  src="/assets/aistudio/logo_kotak_5ecb05e4.png"
                  alt="ND Logo Emblem"
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
              <div>
                <img
                  src="/assets/aistudio/logo_c3fdb6de.png"
                  alt="ND TAX AND LAW"
                  className="h-8 w-auto object-contain filter brightness-110"
                />
                <p className="text-[10px] tracking-widest uppercase font-semibold text-amber-300/90 mt-0.5">
                  Tax &amp; Legal Advisory
                </p>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-display mt-8 leading-snug">
              Sistem Portal Kemitraan Konsultan Pajak &amp; Hukum
            </h2>
            <p className="text-xs text-blue-200/90 mt-2 leading-relaxed">
              Platform resmi NDTAXANDLAW untuk penerbitan Kartu Identitas Eksklusif, pencairan komisi bank, dan akses materi promosi multimedia.
            </p>
          </div>

          {/* Value Highlights List */}
          <div className="relative z-10 my-8 space-y-3.5 text-xs text-slate-200">
            <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-md bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Kartu Identitas Digital Eksklusif</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Dilengkapi QR Code verifikasi resmi untuk otentikasi di hadapan klien.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-md bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Komisi Transparan &amp; Payout Bank</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Pencairan komisi &amp; bonus langsung ke rekening bank terdaftar.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-md bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Generator Analitik AI Gemini</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Laporan evaluasi performa dan rekomendasi taktis bulanan otomatis.</p>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Enkripsi 256-Bit</span>
            <span>Versi Portal 2.4-PRO</span>
          </div>
        </div>

        {/* Right Column: Auth Forms (7 cols on lg) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          
          {/* Header Switcher Buttons */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginError(null);
                  }}
                  className={`text-sm font-bold font-display pb-1 border-b-2 transition-all ${
                    authMode === 'login'
                      ? 'border-blue-700 text-blue-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Masuk Akun
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLoginError(null);
                  }}
                  className={`text-sm font-bold font-display pb-1 border-b-2 transition-all ${
                    authMode === 'register'
                      ? 'border-blue-700 text-blue-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Daftar Mitra Baru
                </button>
              </div>

              {(authMode === 'forgot' || authMode === 'verify') && (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setVerifyError(null);
                    setVerifySuccess(null);
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  &larr; Kembali ke Masuk
                </button>
              )}
            </div>

            {/* Alert Messages */}
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {regSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regSuccessMessage}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {authMode === 'login' && (
              <div>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Terdaftar atau ID Mitra
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="contoh: admin@ndtaxlaw.com atau mitra@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setForgotEmail(loginEmail);
                          setForgotError(null);
                        }}
                        className="text-[11px] font-semibold text-blue-700 hover:underline"
                      >
                        Lupa kata sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Masukkan kata sandi akun"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-blue-700 focus:ring-blue-600"
                      />
                      <span>Ingat sesi masuk saya</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Sample Demo Accounts (hanya di Mode Dev; di Mode Production tidak ditampilkan card informasi) */}
                {appEnvironment !== 'production' && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pilih Akun Sample / Demo (Mode Dev 1-Klik):
                      </p>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                        Mode Dev
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Admin Sample */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('admin@ndtaxlaw.com', 'adminND2026!')}
                        className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          ADM
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Admin Operasional</p>
                          <p className="text-[10px] text-slate-500 font-mono">admin@ndtaxlaw.com</p>
                          <p className="text-[9px] text-blue-800 font-semibold mt-0.5">Akses: Manajemen Seluruh Sistem</p>
                        </div>
                      </button>

                      {/* Mitra Sample 1 (Verified) */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('bambang.sudirman@example.com', 'mitraND2026!')}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          MTR
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Bambang Sudirman, S.H.</p>
                          <p className="text-[10px] text-slate-500 font-mono">bambang.sudirman@...</p>
                          <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">Status: Terverifikasi (ID Aktif)</p>
                        </div>
                      </button>

                      {/* Mitra Sample 2 (Pending) */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('rian.pratama@example.com', 'mitraND2026!')}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          REV
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Rian Pratama, S.H.</p>
                          <p className="text-[10px] text-slate-500 font-mono">rian.pratama@...</p>
                          <p className="text-[9px] text-amber-700 font-semibold mt-0.5">Status: Menunggu Review</p>
                        </div>
                      </button>

                      {/* Mitra Sample 3 (Dewi Lestari) */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('dewi.lestari@example.com', 'mitraND2026!')}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          TAX
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Dewi Lestari, S.E.</p>
                          <p className="text-[10px] text-slate-500 font-mono">dewi.lestari@...</p>
                          <p className="text-[9px] text-indigo-700 font-semibold mt-0.5">Spesialis Pajak &amp; Komisi Tinggi</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. REGISTRATION FORM */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Adv. Hendra Wijaya, S.H., M.H."
                    value={regFullName}
                    onChange={(e) => {
                      setRegFullName(e.target.value);
                      if (!regAccountHolder) setRegAccountHolder(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Resmi *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@domain.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812-xxxx-xxxx"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor NIK KTP *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="16 digit NIK"
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Spesialisasi Bisnis
                    </label>
                    <select
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    >
                      <option value="Konsultan Hukum Korporasi & Bisnis">Hukum Korporasi &amp; Bisnis</option>
                      <option value="Konsultan Perpajakan & Tax Planning">Perpajakan &amp; Tax Planning</option>
                      <option value="Pendirian Legalitas PT / PMA & OSS">Pendirian PT / PMA &amp; OSS</option>
                      <option value="Audit Pajak & SP2DK">Audit Pajak &amp; SP2DK</option>
                    </select>
                  </div>
                </div>

                {/* Gender / Default Avatar Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Jenis Kelamin &amp; Foto Profil Default (Avatar)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegGender('male')}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        regGender === 'male'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <img src={MALE_AVATAR_URL} alt="Avatar Laki-laki" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Laki-laki</p>
                        <p className="text-[10px] text-slate-500">Avatar Laki-laki</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegGender('female')}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        regGender === 'female'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <img src={FEMALE_AVATAR_URL} alt="Avatar Perempuan" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Perempuan</p>
                        <p className="text-[10px] text-slate-500">Avatar Perempuan</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bank Details Strip */}
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                    Data Rekening Pencairan Komisi
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">Nama Bank</label>
                      <select
                        value={regBankName}
                        onChange={(e) => setRegBankName(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Bank Central Asia (BCA)">BCA</option>
                        <option value="Bank Mandiri">Mandiri</option>
                        <option value="Bank Rakyat Indonesia (BRI)">BRI</option>
                        <option value="Bank Negara Indonesia (BNI)">BNI</option>
                        <option value="Bank Syariah Indonesia (BSI)">BSI</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 8830192837"
                        value={regAccountNumber}
                        onChange={(e) => setRegAccountNumber(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      required
                      placeholder="Sesuai buku tabungan"
                      value={regAccountHolder}
                      onChange={(e) => setRegAccountHolder(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buat Kata Sandi Akun
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimal 6 karakter aman"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={showRegPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  <span>{isLoading ? 'Mendaftarkan...' : 'Kirim Berkas Pendaftaran Mitra'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD FORM */}
            {authMode === 'forgot' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                  <p className="font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-700" />
                    Pemulihan Akses Akun NDTAXANDLAW
                  </p>
                  <p className="mt-0.5 text-blue-800 text-[11px]">
                    Masukkan alamat email terdaftar untuk menerima kode verifikasi OTP dan mengatur ulang kata sandi.
                  </p>
                </div>

                {forgotMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{forgotMessage}</span>
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotSend} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Terdaftar
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Masukkan email Anda"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>{isLoading ? 'Mengirim...' : 'Kirim Kode Pemulihan'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Kode Verifikasi OTP (6 Digit)</label>
                        <span className="text-[10px] text-slate-400">Cek Email Anda</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6 Digit OTP dari Email"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-xs font-mono font-bold text-center tracking-widest rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Minimal 6 karakter baru"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Ulangi Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Konfirmasi sandi baru"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>{isLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi &amp; Masuk'}</span>
                      <Check className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 4. EMAIL VERIFICATION FORM */}
            {authMode === 'verify' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900 text-sm">Verifikasi Email Akun Mitra</p>
                      <p className="mt-1 text-amber-800 text-xs leading-relaxed">
                        Sebelum dapat masuk, Anda diwajibkan melakukan verifikasi email. Kode verifikasi 6-digit telah dikirimkan ke alamat email:
                      </p>
                      <p className="font-mono font-bold text-amber-950 bg-white/70 px-2 py-1 rounded border border-amber-300 inline-block mt-1.5">
                        {verifyEmail || 'Email Terdaftar'}
                      </p>
                    </div>
                  </div>
                </div>

                {verifySuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium leading-relaxed">{verifySuccess}</span>
                  </div>
                )}

                {verifyError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="leading-relaxed">{verifyError}</span>
                  </div>
                )}

                {resendMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{resendMessage}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyEmailSubmit} className="space-y-4 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Kode Verifikasi 6-Digit *
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Periksa Inbox / Folder Spam
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Contoh: 123456"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-lg font-mono font-bold text-center tracking-[0.5em] rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying || verifyToken.length < 6}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isVerifying ? 'Memverifikasi...' : 'Verifikasi & Aktifkan Akun'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px]">Belum menerima kode verifikasi?</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="font-bold text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50 text-xs"
                  >
                    {isResending ? 'Mengirim ulang...' : 'Kirim Ulang Kode'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Assistance */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            <span>Butuh bantuan akses akun? Hubungi hotline sekretariat NDTAXANDLAW di (021) 5299-8800.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
