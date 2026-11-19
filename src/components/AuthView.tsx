import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
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
  Check,
  Upload,
  FileText
} from 'lucide-react';
import {
  AuthUser,
  BankDetails,
  AppSettings,
  MitraSystemFieldKey,
  DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  resolveSpecializationOptions,
  isBankFormField,
  resolveMitraFormFields,
} from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar } from '../avatars';
import { compressAndUploadFile, isAllowedVerificationDocumentFile } from '../utils/fileCompressor';

interface AuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onRegisterSubmit: (formData: {
    fullName: string;
    email: string;
    phone: string;
    nik: string;
    ktpFileUrl?: string;
    ktpFileName?: string;
    specialization: string;
    bankDetails: BankDetails;
    password?: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
    customFields?: Record<string, string>;
  }) => Promise<any>;
  appEnvironment?: 'development' | 'production';
  initialMode?: 'login' | 'register';
  supportPhone?: string;
  firmName?: string;
  settings?: AppSettings | null;
  onBackToLanding?: () => void;
}

const DEFAULT_BANK_OPTIONS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
];

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onRegisterSubmit,
  appEnvironment = 'development',
  initialMode = 'login',
  supportPhone = '0812-8899-7711',
  firmName = 'NDTAXANDLAW',
  settings,
  onBackToLanding,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'verify'>(initialMode);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  const allMitraFields = React.useMemo(() => resolveMitraFormFields(settings), [settings]);
  const getSysField = React.useCallback(
    (key: MitraSystemFieldKey) => allMitraFields.find((f) => f.systemKey === key),
    [allMitraFields]
  );
  const isSysActive = React.useCallback(
    (key: MitraSystemFieldKey) => {
      const f = getSysField(key);
      return f ? f.isActive !== false : false;
    },
    [getSysField]
  );

  const activeSpecOptions = React.useMemo(() => {
    const raw = resolveSpecializationOptions(settings);
    const filtered = raw.filter((o) => o.isActive);
    return filtered.length > 0 ? filtered : DEFAULT_SPECIALIZATION_OPTIONS;
  }, [settings]);

  const specSysField = getSysField('specialization');
  const specEnabled =
    settings?.specializationEnabled !== false &&
    (specSysField ? specSysField.isActive !== false : true);
  const specLabel =
    specSysField?.label || settings?.specializationLabel || DEFAULT_SPECIALIZATION_LABEL;
  const activeMitraCustomFields = React.useMemo(
    () => allMitraFields.filter((f) => !f.systemKey && !isBankFormField(f) && f.isActive !== false),
    [allMitraFields]
  );
  const activeMitraBankCustomFields = React.useMemo(
    () => allMitraFields.filter((f) => !f.systemKey && isBankFormField(f) && f.isActive !== false),
    [allMitraFields]
  );

  const bankField = getSysField('bankName');
  const bankOptions =
    bankField?.options && bankField.options.length > 0
      ? bankField.options
      : DEFAULT_BANK_OPTIONS;
  
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
  const [regKtpFileUrl, setRegKtpFileUrl] = useState('');
  const [regKtpFileName, setRegKtpFileName] = useState('');
  const [regKtpCompressionInfo, setRegKtpCompressionInfo] = useState<string | null>(null);
  const [isUploadingRegKtp, setIsUploadingRegKtp] = useState(false);
  const [uploadingRegCustomKey, setUploadingRegCustomKey] = useState<string | null>(null);
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regSpecialization, setRegSpecialization] = useState(
    activeSpecOptions[0]?.label || 'Business Partner'
  );
  const [regCustomFields, setRegCustomFields] = useState<Record<string, string>>({});
  const [regBankCustomFields, setRegBankCustomFields] = useState<Record<string, string>>({});
  const [regBankName, setRegBankName] = useState(bankOptions[0] || 'Bank Central Asia (BCA)');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regAccountHolder, setRegAccountHolder] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeSpecOptions.length > 0 && !activeSpecOptions.some((o) => o.label === regSpecialization)) {
      setRegSpecialization(activeSpecOptions[0].label);
    }
  }, [activeSpecOptions, regSpecialization]);

  useEffect(() => {
    if (bankOptions.length > 0 && !bankOptions.includes(regBankName)) {
      setRegBankName(bankOptions[0]);
    }
  }, [bankOptions, regBankName]);

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

  // Google OAuth 2.0 Integration Handlers
  const [isGsiRendered, setIsGsiRendered] = useState(false);
  const handleGoogleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response?.credential) return;
      setIsLoading(true);
      setLoginError(null);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          onLoginSuccess(data.user);
        } else {
          setLoginError(data.message || 'Gagal masuk menggunakan akun Google.');
        }
      } catch {
        setLoginError('Terjadi kesalahan saat memverifikasi akun Google ke server.');
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess]
  );

  const handleGoogleTokenLogin = useCallback(
    async (accessToken: string) => {
      setIsLoading(true);
      setLoginError(null);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          onLoginSuccess(data.user);
        } else {
          setLoginError(data.message || 'Gagal masuk menggunakan akun Google.');
        }
      } catch {
        setLoginError('Terjadi kesalahan saat menghubungkan ke server Google.');
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess]
  );

  // Initialize Google Identity Services (GSI) Client
  useEffect(() => {
    if (!settings?.googleOAuthEnabled) return;

    const clientId = (settings?.googleClientId || '').trim();
    if (!clientId) return;

    const scriptId = 'google-identity-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const setupGsi = () => {
      const w = window as any;
      if (!w.google?.accounts?.id) return;

      try {
        w.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const targetDiv = document.getElementById('gsiLoginButtonContainer');
        if (targetDiv) {
          targetDiv.innerHTML = '';
          w.google.accounts.id.renderButton(targetDiv, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
          });
          setIsGsiRendered(true);
        }
      } catch (e) {
        console.warn('[GSI Setup Warning]', e);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupGsi;
      document.body.appendChild(script);
    } else {
      setupGsi();
    }
  }, [settings?.googleOAuthEnabled, settings?.googleClientId, authMode, handleGoogleCredentialResponse]);

  const handleManualGoogleClick = () => {
    const clientId = (settings?.googleClientId || '').trim();
    if (!clientId) {
      setLoginError('Google Client ID belum diisi pada menu Pengaturan Admin.');
      return;
    }

    const w = window as any;
    if (w.google?.accounts?.oauth2) {
      try {
        const client = w.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: (tokenRes: any) => {
            if (tokenRes?.access_token) {
              handleGoogleTokenLogin(tokenRes.access_token);
            } else if (tokenRes?.error) {
              setLoginError(`Google OAuth: ${tokenRes.error_description || tokenRes.error}`);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn('[Google OAuth Token Client Error]', err);
      }
    }

    if (w.google?.accounts?.id) {
      w.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const redirectUri = window.location.origin;
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
            clientId
          )}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}&response_type=token&scope=email%20profile%20openid`;
          window.open(authUrl, 'google_login_popup', 'width=500,height=600');
        }
      });
      return;
    }

    // Direct popup fallback
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=email%20profile%20openid`;
    window.open(authUrl, 'google_login_popup', 'width=500,height=600');
  };

  const handleRegKtpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoginError(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setLoginError('Format file KTP/NPWP tidak valid. Harap unggah file JPG, JPEG, PNG, atau PDF.');
      e.target.value = '';
      return;
    }
    setIsUploadingRegKtp(true);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      setRegKtpFileUrl(compressed.hostedUrl || compressed.dataUrl);
      setRegKtpFileName(compressed.fileName || file.name);
      setRegKtpCompressionInfo(
        `Terkompres: ${compressed.originalFormattedSize} → ${compressed.compressedFormattedSize}`
      );
    } catch (err: any) {
      setLoginError(err?.message || 'Gagal mengompres file KTP/NPWP.');
    } finally {
      setIsUploadingRegKtp(false);
    }
  };

  const handleRegDynamicFileUpload = async (file: File, fieldLabel: string) => {
    setLoginError(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setLoginError(`Format file "${fieldLabel}" harus berupa JPG, JPEG, PNG, atau PDF.`);
      return;
    }
    setUploadingRegCustomKey(fieldLabel);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      setRegCustomFields((prev) => ({
        ...prev,
        [fieldLabel]: compressed.hostedUrl || compressed.dataUrl,
      }));
    } catch (err: any) {
      setLoginError(err?.message || `Gagal mengunggah file "${fieldLabel}".`);
    } finally {
      setUploadingRegCustomKey(null);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (isSysActive('ktpFile') && getSysField('ktpFile')?.required !== false && !regKtpFileUrl) {
      setLoginError('Silakan unggah dokumen File KTP / NPWP (Format JPG, JPEG, PNG, atau PDF).');
      return;
    }
    setIsLoading(true);

    try {
      const ktpLabel = getSysField('ktpFile')?.label || 'Upload File KTP / NPWP';
      const mergedCustom: Record<string, string> = {
        ...regCustomFields,
        ...regBankCustomFields,
        ...(regKtpFileUrl ? { [ktpLabel]: regKtpFileUrl, 'mitra-def-ktpFile': regKtpFileUrl } : {}),
        ...(regKtpFileName ? { __ktpFileName: regKtpFileName } : {}),
      };
      const regResult = await onRegisterSubmit({
        fullName: regFullName || (regEmail ? regEmail.split('@')[0] : 'Mitra NDTAXANDLAW'),
        email: regEmail,
        phone: isSysActive('phone') ? regPhone : '-',
        nik: isSysActive('nik') && regNik ? regNik : '-',
        ktpFileUrl: regKtpFileUrl || undefined,
        ktpFileName: regKtpFileName || undefined,
        specialization: specEnabled ? regSpecialization : 'Business Partner',
        gender: regGender,
        avatarUrl: getDefaultAvatar(regGender),
        bankDetails: {
          bankName: '-',
          accountNumber: '-',
          accountHolder: regFullName || 'Mitra NDTAXANDLAW',
        },
        password: regPassword || 'mitraND2026!',
        customFields: Object.keys(mergedCustom).length > 0 ? mergedCustom : undefined,
      });

      if (regResult && regResult.user) {
        onLoginSuccess(regResult.user);
        return;
      }

      setVerifyEmail(regEmail);
      setVerifyToken('');
      setVerifyError(null);
      setResendMessage(null);
      setVerifySuccess(null);
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
    const cleanedOtp = otpCode.trim();
    if (!cleanedOtp || cleanedOtp.length < 6) {
      setForgotError('Kode OTP pemulihan 6-digit wajib diisi.');
      return;
    }
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
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otpCode: cleanedOtp,
          otp: cleanedOtp,
          token: cleanedOtp,
          newPassword,
        }),
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

          {/* Top Brand Header: Logo Sebelah Kiri & Tombol Kembali Sebelah Kanan */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center bg-slate-900/70 px-3.5 py-2 rounded-xl border border-amber-300/25 shadow-md">
                <img
                  src={settings?.logoUrl || '/assets/aistudio/logo_nd_vertikal.svg'}
                  alt="ND TAX AND LAW"
                  className="h-9 sm:h-10 w-auto object-contain filter brightness-110"
                />
              </div>

              {onBackToLanding && (
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer shrink-0"
                  title="Kembali ke Halaman Utama"
                >
                  <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Kembali</span>
                </button>
              )}
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
                  Daftar Mitra
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
                        placeholder="contoh: admin@ndtaxandlaw.com atau mitra@example.com"
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
                    className="w-full py-2.5 px-4 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isLoading ? 'Memverifikasi...' : 'Masuk'}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </button>
                </form>

                {/* 1.1 GOOGLE OAUTH 2.0 LOGIN BUTTON (Tampil jika diaktifkan di Admin Settings) */}
                {settings?.googleOAuthEnabled && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Atau Masuk Lebih Cepat
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2 w-full">
                      {/* Container for official Google Identity Services button */}
                      <div id="gsiLoginButtonContainer" className="flex justify-center w-full min-h-[40px]" />

                      {/* Custom Official-Style Google Button (Hanya tampil jika tombol resmi GSI belum berhasil dirender) */}
                      {!isGsiRendered && (
                        <button
                          type="button"
                          onClick={handleManualGoogleClick}
                          disabled={isLoading}
                          className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Masuk dengan Akun Google</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

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
                        onClick={() => handleQuickLogin('admin@ndtaxandlaw.com', 'adminND2026!')}
                        className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          ADM
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Admin Utama</p>
                          <p className="text-[10px] text-slate-500 font-mono">admin@ndtaxandlaw.com</p>
                          <p className="text-[9px] text-blue-800 font-semibold mt-0.5">Akses: Penuh + Kelola Staf &amp; Log</p>
                        </div>
                      </button>

                      {/* Staff Sample */}
                      <button
                        type="button"
                        onClick={() => handleQuickLogin('staf@ndtaxandlaw.com', 'stafND2026!')}
                        className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-left transition-colors flex items-start gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          STF
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">Staf Operasional</p>
                          <p className="text-[10px] text-slate-500 font-mono">staf@ndtaxandlaw.com</p>
                          <p className="text-[9px] text-indigo-800 font-semibold mt-0.5">Akses: Operasional (Di Bawah Admin)</p>
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
              <div className="space-y-4">
                {settings?.googleOAuthEnabled && (
                  <div className="space-y-3 pb-3 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={handleManualGoogleClick}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Daftar Cepat dengan Google</span>
                    </button>
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <span className="relative bg-white px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Atau Lengkapi Formulir Manual
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                {isSysActive('fullName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('fullName')?.label || 'Nama Lengkap & Gelar'}{' '}
                      {getSysField('fullName')?.required !== false && '*'}
                    </label>
                    <input
                      type="text"
                      required={getSysField('fullName')?.required !== false}
                      placeholder={
                        getSysField('fullName')?.placeholder ||
                        'Contoh: Adv. Hendra Wijaya, S.H., M.H.'
                      }
                      value={regFullName}
                      onChange={(e) => {
                        setRegFullName(e.target.value);
                        if (!regAccountHolder) setRegAccountHolder(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                )}

                {(isSysActive('email') || isSysActive('phone')) && (
                  <div
                    className={`grid ${
                      isSysActive('email') && isSysActive('phone') ? 'grid-cols-2' : 'grid-cols-1'
                    } gap-3`}
                  >
                    {isSysActive('email') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {getSysField('email')?.label || 'Email Resmi'}{' '}
                          {getSysField('email')?.required !== false && '*'}
                        </label>
                        <input
                          type="email"
                          required={getSysField('email')?.required !== false}
                          placeholder={getSysField('email')?.placeholder || 'email@domain.com'}
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                        />
                      </div>
                    )}
                    {isSysActive('phone') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {getSysField('phone')?.label || 'No. WhatsApp'}{' '}
                          {getSysField('phone')?.required !== false && '*'}
                        </label>
                        <input
                          type="tel"
                          required={getSysField('phone')?.required !== false}
                          placeholder={getSysField('phone')?.placeholder || '0812-xxxx-xxxx'}
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(isSysActive('nik') || specEnabled) && (
                  <div
                    className={`grid grid-cols-1 ${
                      isSysActive('nik') && specEnabled ? 'sm:grid-cols-2' : ''
                    } gap-3`}
                  >
                    {isSysActive('nik') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {getSysField('nik')?.label || 'Nomor NIK KTP'}{' '}
                          {getSysField('nik')?.required !== false && '*'}
                        </label>
                        <input
                          type="text"
                          required={getSysField('nik')?.required !== false}
                          maxLength={16}
                          placeholder={getSysField('nik')?.placeholder || '16 digit NIK'}
                          value={regNik}
                          onChange={(e) => setRegNik(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                    {specEnabled && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {specLabel} {specSysField?.required !== false && '*'}
                        </label>
                        <select
                          value={regSpecialization}
                          onChange={(e) => setRegSpecialization(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          {activeSpecOptions.map((opt) => (
                            <option key={opt.id} value={opt.label}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload File KTP / NPWP */}
                {isSysActive('ktpFile') && (
                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      regKtpFileUrl
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-amber-50/80 border-amber-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-700" />
                          <span>{getSysField('ktpFile')?.label || 'Upload File KTP / NPWP'}</span>
                          {getSysField('ktpFile')?.required !== false && (
                            <span className="text-rose-600">*</span>
                          )}
                        </label>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Format: <strong>JPG, JPEG, PNG, atau PDF</strong> (otomatis dikompres).
                        </p>
                        {regKtpFileName && (
                          <p className="text-[11px] font-bold text-emerald-700 mt-1">
                            ✓ {regKtpFileName}{' '}
                            {regKtpCompressionInfo ? `(${regKtpCompressionInfo})` : ''}
                          </p>
                        )}
                      </div>
                      <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingRegKtp
                            ? 'Mengompres...'
                            : regKtpFileUrl
                            ? 'Ganti File'
                            : 'Pilih File KTP/NPWP'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={handleRegKtpFileChange}
                          disabled={isUploadingRegKtp}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Dynamic Mitra Custom Fields configured by Admin */}
                {activeMitraCustomFields.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeMitraCustomFields.map((field) => (
                      <div
                        key={field.id}
                        className={
                          field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''
                        }
                      >
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        {field.type === 'file' ? (
                          <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-600 truncate">
                              {regCustomFields[field.label] ? (
                                <span className="font-bold text-emerald-700">
                                  ✓ File sudah diunggah
                                </span>
                              ) : (
                                <span>{field.placeholder || 'Format: JPG, JPEG, PNG, atau PDF'}</span>
                              )}
                            </div>
                            <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {uploadingRegCustomKey === field.label
                                  ? 'Mengompres...'
                                  : regCustomFields[field.label]
                                  ? 'Ganti File'
                                  : 'Upload File'}
                              </span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleRegDynamicFileUpload(f, field.label);
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            required={field.required}
                            value={regCustomFields[field.label] || ''}
                            onChange={(e) =>
                              setRegCustomFields((prev) => ({
                                ...prev,
                                [field.label]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="">-- Pilih {field.label} --</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={2}
                            required={field.required}
                            placeholder={field.placeholder || `Isi ${field.label}`}
                            value={regCustomFields[field.label] || ''}
                            onChange={(e) =>
                              setRegCustomFields((prev) => ({
                                ...prev,
                                [field.label]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                          />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            required={field.required}
                            placeholder={field.placeholder || `Isi ${field.label}`}
                            value={regCustomFields[field.label] || ''}
                            onChange={(e) =>
                              setRegCustomFields((prev) => ({
                                ...prev,
                                [field.label]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Gender Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Jenis Kelamin
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegGender('male')}
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        regGender === 'male'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={MALE_AVATAR_URL} alt="LAKI-LAKI" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        <p className="text-xs font-bold text-slate-900">LAKI-LAKI</p>
                      </div>
                      {regGender === 'male' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegGender('female')}
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        regGender === 'female'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={FEMALE_AVATAR_URL} alt="PEREMPUAN" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                        <p className="text-xs font-bold text-slate-900">PEREMPUAN</p>
                      </div>
                      {regGender === 'female' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
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
                  className="w-full py-2.5 px-4 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  <span>{isLoading ? 'Mendaftarkan...' : 'Daftar Mitra'}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </form>
            </div>
          )}

            {/* 3. FORGOT PASSWORD FORM */}
            {authMode === 'forgot' && (
              <div className="space-y-4">
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
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#113872]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>{isLoading ? 'Mengirim...' : 'Kirim Kode Pemulihan'}</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
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
                      className="w-full py-2.5 px-4 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>{isLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi & Masuk'}</span>
                      <Check className="w-4 h-4 text-amber-400" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 4. EMAIL VERIFICATION FORM (1 Notifikasi Terpadu & Jelas) */}
            {authMode === 'verify' && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border text-xs ${
                    verifySuccess
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : verifyError
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-blue-50/80 border-blue-200 text-blue-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {verifySuccess ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : verifyError ? (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        {verifySuccess
                          ? 'Verifikasi Email Berhasil'
                          : verifyError
                            ? 'Perhatian Verifikasi Email'
                            : 'Verifikasi Email Akun Mitra'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed">
                        {verifySuccess
                          ? verifySuccess
                          : verifyError
                            ? verifyError
                            : resendMessage
                              ? resendMessage
                              : 'Pendaftaran berhasil disimpan! Kami telah mengirimkan kode OTP 6-digit ke alamat email di bawah ini. Silakan masukkan kode tersebut untuk mengaktifkan akun Anda:'}
                      </p>
                      {verifyEmail && (
                        <p className="font-mono font-bold bg-white/90 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 inline-block mt-2">
                          {verifyEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

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

          {/* Footer Copyright */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2">
            <span>{settings?.copyrightText || 'Hak Cipta © 2026 NDTAXANDLAW. Seluruh Hak Dilindungi.'}</span>
            {settings?.appVersion && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                {settings.appVersion}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
