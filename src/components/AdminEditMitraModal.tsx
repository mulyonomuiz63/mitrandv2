import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Camera,
  AlertCircle,
  CheckCircle2,
  Upload,
  FileText,
  ExternalLink,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  AppSettings,
  AuthUser,
  DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  Mitra,
  getMitraKtpFileName,
  getMitraKtpFileUrl,
  isBankFormField,
  resolveMitraFormFields,
  resolveSpecializationOptions,
} from '../types';
import {
  FEMALE_AVATAR_URL,
  MALE_AVATAR_URL,
  getDefaultAvatar,
  inferGenderFromName,
} from '../avatars';
import {
  compressAndUploadFile,
  isAllowedVerificationDocumentFile,
} from '../utils/fileCompressor';

interface AdminEditMitraModalProps {
  mitra: Mitra | null;
  settings?: AppSettings | null;
  currentUser?: AuthUser | null;
  onClose: () => void;
  onSave: (id: string, payload: Partial<Mitra> & Record<string, any>) => Promise<any>;
}

const DEFAULT_BANK_OPTIONS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
];

export const AdminEditMitraModal: React.FC<AdminEditMitraModalProps> = ({
  mitra,
  settings,
  currentUser,
  onClose,
  onSave,
}) => {
  const allMitraFields = useMemo(() => resolveMitraFormFields(settings), [settings]);

  const activeSpecOptions = useMemo(() => {
    const raw = resolveSpecializationOptions(settings);
    const filtered = raw.filter((o) => o.isActive);
    return filtered.length > 0 ? filtered : DEFAULT_SPECIALIZATION_OPTIONS;
  }, [settings]);

  const specLabel = useMemo(() => {
    const f = allMitraFields.find((item) => item.systemKey === 'specialization');
    return f?.label || settings?.specializationLabel || DEFAULT_SPECIALIZATION_LABEL;
  }, [allMitraFields, settings]);

  const bankOptions = useMemo(() => {
    const f = allMitraFields.find((item) => item.systemKey === 'bankName');
    return f?.options && f.options.length > 0 ? f.options : DEFAULT_BANK_OPTIONS;
  }, [allMitraFields]);

  const configuredCustomFields = useMemo(
    () => allMitraFields.filter((f) => !f.systemKey && !isBankFormField(f) && f.isActive !== false),
    [allMitraFields]
  );

  const configuredBankCustomFields = useMemo(
    () => allMitraFields.filter((f) => !f.systemKey && isBankFormField(f) && f.isActive !== false),
    [allMitraFields]
  );

  // Core Identity & Account Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [status, setStatus] = useState<'verified' | 'pending' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);

  // KTP / NPWP Document
  const [ktpFileUrl, setKtpFileUrl] = useState('');
  const [ktpFileName, setKtpFileName] = useState('');
  const [isUploadingKtp, setIsUploadingKtp] = useState(false);
  const [ktpInfo, setKtpInfo] = useState<string | null>(null);

  // Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankCustomValues, setBankCustomValues] = useState<Record<string, string>>({});

  // Dynamic Custom Registration Fields
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [uploadingCustomKey, setUploadingCustomKey] = useState<string | null>(null);

  // Optional Password Reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Validation & Submit States
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [checkingUnique, setCheckingUnique] = useState<'email' | 'nik' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hydratedMitraIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mitra) {
      hydratedMitraIdRef.current = null;
      return;
    }
    if (hydratedMitraIdRef.current === mitra.id) return;
    hydratedMitraIdRef.current = mitra.id;

    const bankMeta = (mitra.bankDetails || {}) as any;
    const resolvedGender: 'male' | 'female' =
      mitra.gender === 'female' || mitra.gender === 'male'
        ? mitra.gender
        : bankMeta.__gender === 'female' || bankMeta.__gender === 'male'
        ? bankMeta.__gender
        : mitra.avatarUrl === FEMALE_AVATAR_URL
        ? 'female'
        : mitra.avatarUrl === MALE_AVATAR_URL
        ? 'male'
        : inferGenderFromName(mitra.fullName);

    setFullName(mitra.fullName || '');
    setEmail(mitra.email || '');
    setNik(!mitra.nik || mitra.nik === '-' ? '' : mitra.nik);
    setPhone(!mitra.phone || mitra.phone === '-' ? '' : mitra.phone);
    setGender(resolvedGender);
    setCustomAvatarUrl(
      mitra.avatarUrl &&
        mitra.avatarUrl !== MALE_AVATAR_URL &&
        mitra.avatarUrl !== FEMALE_AVATAR_URL
        ? mitra.avatarUrl
        : ''
    );
    setSpecialization(mitra.specialization || activeSpecOptions[0]?.label || 'Business Partner');
    setMemberCode(mitra.memberCode || '');
    setReferralCode(mitra.referralCode || '');
    setJoinedDate(mitra.joinedDate || '');
    setStatus(mitra.status || 'pending');
    setRejectionReason(mitra.rejectionReason || '');
    setEmailVerified(mitra.emailVerified !== false);

    setKtpFileUrl(getMitraKtpFileUrl(mitra));
    setKtpFileName(getMitraKtpFileName(mitra));
    setKtpInfo(null);

    setBankName(
      !mitra.bankDetails?.bankName || mitra.bankDetails.bankName === '-'
        ? bankOptions[0] || 'Bank Central Asia (BCA)'
        : mitra.bankDetails.bankName
    );
    setAccountNumber(
      !mitra.bankDetails?.accountNumber || mitra.bankDetails.accountNumber.trim() === '-'
        ? ''
        : mitra.bankDetails.accountNumber.trim()
    );
    setAccountHolder(
      !mitra.bankDetails?.accountHolder || mitra.bankDetails.accountHolder === '-'
        ? mitra.fullName || ''
        : mitra.bankDetails.accountHolder
    );

    const initBankCustom: Record<string, string> = {
      ...(mitra.bankDetails?.customBankFields || {}),
    };
    configuredBankCustomFields.forEach((f) => {
      if (!initBankCustom[f.label] && mitra.customFields?.[f.label]) {
        initBankCustom[f.label] = mitra.customFields[f.label];
      }
    });
    setBankCustomValues(initBankCustom);

    const initCustom: Record<string, string> = {};
    if (mitra.customFields) {
      for (const [k, v] of Object.entries(mitra.customFields)) {
        if (
          k === '__ktpFileName' ||
          k === 'mitra-def-ktpFile' ||
          k === 'Upload File KTP / NPWP' ||
          configuredBankCustomFields.some((bf) => bf.label === k)
        ) {
          continue;
        }
        initCustom[k] = v;
      }
    }
    setCustomValues(initCustom);

    setNewPassword('');
    setConfirmPassword('');
    setEmailError(null);
    setNikError(null);
    setFormError(null);
  }, [mitra, activeSpecOptions, bankOptions, configuredBankCustomFields]);

  if (!mitra) return null;

  const extraStoredCustomKeys = Object.keys(customValues).filter(
    (k) => !configuredCustomFields.some((f) => f.label === k)
  );

  const checkUniqueField = async (
    field: 'email' | 'nik',
    val: string
  ): Promise<{ ok: boolean; message?: string }> => {
    const trimmed = val.trim();
    if (!trimmed) {
      if (field === 'email') setEmailError(null);
      if (field === 'nik') setNikError(null);
      return { ok: true };
    }
    setCheckingUnique(field);
    try {
      const res = await fetch('/api/mitra/check-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-skip-crud-alert': 'true' },
        body: JSON.stringify({
          [field]: trimmed,
          excludeMitraId: mitra.id,
        }),
      });
      const json = await res.json();
      if (field === 'email' && json?.emailTaken) {
        const msg = json.emailMessage || 'Email sudah digunakan oleh akun lain.';
        setEmailError(msg);
        return { ok: false, message: msg };
      }
      if (field === 'nik' && json?.nikTaken) {
        const msg = json.nikMessage || 'NIK / NPWP sudah digunakan oleh mitra lain.';
        setNikError(msg);
        return { ok: false, message: msg };
      }
      if (field === 'email') setEmailError(null);
      if (field === 'nik') setNikError(null);
      return { ok: true };
    } catch {
      return { ok: true };
    } finally {
      setCheckingUnique(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 480,
        quality: 0.82,
        uploadToServer: true,
      });
      setCustomAvatarUrl(compressed.hostedUrl || compressed.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') setCustomAvatarUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKtpInfo(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setKtpInfo('Format file wajib JPG, JPEG, PNG, atau PDF.');
      e.target.value = '';
      return;
    }
    setIsUploadingKtp(true);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      setKtpFileUrl(compressed.hostedUrl || compressed.dataUrl);
      setKtpFileName(compressed.fileName || file.name);
      setKtpInfo(
        `Berkas "${compressed.fileName || file.name}" siap disimpan (${compressed.compressedFormattedSize}).`
      );
    } catch (err: any) {
      setKtpInfo(err?.message || 'Gagal mengunggah berkas KTP/NPWP.');
    } finally {
      setIsUploadingKtp(false);
    }
  };

  const handleCustomFileUpload = async (
    target: 'custom' | 'bank',
    key: string,
    file?: File | null
  ) => {
    if (!file) return;
    setUploadingCustomKey(`${target}:${key}`);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      const url = compressed.hostedUrl || compressed.dataUrl;
      if (target === 'bank') {
        setBankCustomValues((prev) => ({ ...prev, [key]: url }));
      } else {
        setCustomValues((prev) => ({ ...prev, [key]: url }));
      }
    } finally {
      setUploadingCustomKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedNik = nik.trim();

    if (trimmedName.length < 2) {
      setFormError('Nama lengkap mitra wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Format alamat email tidak valid.');
      setFormError('Format alamat email tidak valid.');
      return;
    }
    if (newPassword) {
      if (newPassword.length < 6) {
        setFormError('Kata sandi baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }

    // Validate email & NIK uniqueness before submitting
    if (trimmedEmail !== (mitra.email || '').trim().toLowerCase()) {
      const emailRes = await checkUniqueField('email', trimmedEmail);
      if (!emailRes.ok) {
        setFormError(emailRes.message || 'Email sudah digunakan oleh akun lain.');
        return;
      }
    }
    if (trimmedNik && trimmedNik !== '-') {
      const nikRes = await checkUniqueField('nik', trimmedNik);
      if (!nikRes.ok) {
        setFormError(nikRes.message || 'NIK / NPWP sudah digunakan oleh mitra lain.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const resolvedAvatar = customAvatarUrl || getDefaultAvatar(gender, trimmedName);
      const ktpLabel =
        allMitraFields.find((f) => f.systemKey === 'ktpFile')?.label || 'Upload File KTP / NPWP';
      const mergedCustomFields: Record<string, string> = {
        ...customValues,
        ...bankCustomValues,
        ...(ktpFileUrl ? { [ktpLabel]: ktpFileUrl, 'mitra-def-ktpFile': ktpFileUrl } : {}),
        ...(ktpFileName ? { __ktpFileName: ktpFileName } : {}),
      };

      const isStaff = currentUser?.roleCode === 'staff';
      await onSave(mitra.id, {
        fullName: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || '-',
        nik: trimmedNik || '-',
        gender,
        avatarUrl: resolvedAvatar,
        specialization: specialization.trim() || mitra.specialization,
        memberCode: memberCode.trim() || mitra.memberCode,
        referralCode: referralCode.trim() || mitra.referralCode,
        joinedDate: joinedDate.trim() || mitra.joinedDate,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason.trim() : undefined,
        emailVerified,
        ktpFileUrl: ktpFileUrl || undefined,
        ktpFileName: ktpFileName || undefined,
        bankDetails: {
          bankName: bankName.trim() || '-',
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim() || trimmedName,
          customBankFields:
            Object.keys(bankCustomValues).length > 0 ? bankCustomValues : undefined,
        },
        customFields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : undefined,
        ...(newPassword ? { newPassword: newPassword.trim() } : {}),
        editedByAdmin: true,
        actorRole: isStaff ? 'staff' : 'admin',
        actorId: currentUser?.id,
        actorName: currentUser?.name || (isStaff ? 'Staf Operasional' : 'Admin Operasional'),
        actorEmail: currentUser?.email,
      });

      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Gagal memperbarui data mitra.';
      if (msg.toLowerCase().includes('email')) setEmailError(msg);
      if (msg.toLowerCase().includes('nik') || msg.toLowerCase().includes('npwp')) setNikError(msg);
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isKtpPdf =
    ktpFileUrl.toLowerCase().endsWith('.pdf') || ktpFileUrl.startsWith('data:application/pdf');

  const specChoices = activeSpecOptions.some((o) => o.label === specialization)
    ? activeSpecOptions.map((o) => o.label)
    : [specialization, ...activeSpecOptions.map((o) => o.label)].filter(Boolean);

  const bankChoices = bankOptions.includes(bankName)
    ? bankOptions
    : [bankName, ...bankOptions].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold font-display truncate">
              Edit Data Mitra — {mitra.fullName}
            </h3>
            <p className="text-[11px] text-amber-200/90 font-mono truncate">
              {mitra.memberCode} · {mitra.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Tutup Edit Data Mitra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. Foto Profil & Jenis Kelamin */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={customAvatarUrl || getDefaultAvatar(gender, fullName || mitra.fullName)}
                  alt={fullName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-[#092147] bg-white shrink-0"
                />
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900">Foto Profil &amp; Gender</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`px-2.5 py-1 rounded-lg font-semibold border cursor-pointer ${
                        gender === 'male'
                          ? 'bg-[#092147] text-amber-300 border-[#092147]'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      Laki-laki
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`px-2.5 py-1 rounded-lg font-semibold border cursor-pointer ${
                        gender === 'female'
                          ? 'bg-[#092147] text-amber-300 border-[#092147]'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      Perempuan
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {customAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomAvatarUrl('')}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                  >
                    Reset Foto
                  </button>
                )}
                <label className="px-3 py-1.5 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ganti Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* 2. Identitas & Akun Login */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#092147]" />
                <span>Identitas &amp; Akun Login Mitra</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap mitra"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Login &amp; Korespondensi *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={(e) => checkUniqueField('email', e.target.value)}
                    placeholder="email@domain.com"
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-hidden focus:ring-2 ${
                      emailError
                        ? 'border-rose-500 bg-rose-50/40 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {checkingUnique === 'email' && (
                    <p className="text-[10px] text-slate-500 mt-1">Memeriksa keunikan email...</p>
                  )}
                  {emailError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIK / NPWP
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={nik}
                    onChange={(e) => {
                      setNik(e.target.value);
                      if (nikError) setNikError(null);
                    }}
                    onBlur={(e) => checkUniqueField('nik', e.target.value)}
                    placeholder="16 digit NIK / NPWP"
                    className={`w-full px-3 py-2 font-mono rounded-lg border focus:outline-hidden focus:ring-2 ${
                      nikError
                        ? 'border-rose-500 bg-rose-50/40 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  {checkingUnique === 'nik' && (
                    <p className="text-[10px] text-slate-500 mt-1">Memeriksa keunikan NIK/NPWP...</p>
                  )}
                  {nikError && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{nikError}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {specLabel}
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    {specChoices.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ID Anggota
                  </label>
                  <input
                    type="text"
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                    placeholder="ND-TAX-LAW-0001"
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Referral
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="REF-XXXX"
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Bergabung
                  </label>
                  <input
                    type="date"
                    value={/^\d{4}-\d{2}-\d{2}/.test(joinedDate) ? joinedDate.slice(0, 10) : joinedDate}
                    onChange={(e) => setJoinedDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Verifikasi
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'verified' | 'pending' | 'rejected')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    <option value="verified">Lulus Verifikasi</option>
                    <option value="pending">Pending Verifikasi</option>
                    <option value="rejected">Ditolak / Perbaikan</option>
                  </select>
                </div>

                {status === 'rejected' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-rose-700 mb-1">
                      Catatan Alasan Penolakan
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Alasan penolakan..."
                      className="w-full px-3 py-2 rounded-lg border border-rose-300 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emailVerified}
                      onChange={(e) => setEmailVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#092147] cursor-pointer"
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Email Akun Terverifikasi (Langsung Bisa Login)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Berkas KTP / NPWP */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span>Berkas KTP / NPWP</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ktpFileUrl ? ktpFileName || 'Berkas terunggah' : 'Belum ada file terunggah'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {ktpFileUrl && (
                    <a
                      href={ktpFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Lihat</span>
                    </a>
                  )}
                  <label className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{isUploadingKtp ? 'Mengunggah...' : ktpFileUrl ? 'Ganti File' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={handleKtpUpload}
                      disabled={isUploadingKtp}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {ktpFileUrl && !isKtpPdf && (
                <img
                  src={ktpFileUrl}
                  alt="Preview KTP/NPWP"
                  className="max-h-32 rounded-lg border border-slate-200 bg-white p-1 object-contain"
                />
              )}
              {ktpInfo && (
                <p className="text-[11px] font-semibold text-blue-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{ktpInfo}</span>
                </p>
              )}
            </div>

            {/* 4. Rekening Bank Pencairan */}
            <div className="space-y-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80">
              <h4 className="text-[11px] font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                <span>Rekening Bank Pencairan Komisi</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    {bankChoices.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nomor rekening"
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Atas nama rekening"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                {configuredBankCustomFields.map((field) => (
                  <div key={field.id} className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'file' ? (
                      <div className="flex items-center gap-2">
                        {bankCustomValues[field.label] && (
                          <a
                            href={bankCustomValues[field.label]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 font-bold hover:underline"
                          >
                            Lihat Berkas
                          </a>
                        )}
                        <label className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer">
                          {uploadingCustomKey === `bank:${field.label}` ? 'Mengunggah...' : 'Upload'}
                          <input
                            type="file"
                            onChange={(e) =>
                              handleCustomFileUpload('bank', field.label, e.target.files?.[0])
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={bankCustomValues[field.label] || ''}
                        onChange={(e) =>
                          setBankCustomValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                        }
                        placeholder={field.placeholder || field.label}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Data Tambahan Pendaftaran Mitra (Custom Fields) */}
            {(configuredCustomFields.length > 0 || extraStoredCustomKeys.length > 0) && (
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Data Tambahan Pendaftaran Mitra
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {configuredCustomFields.map((field) => (
                    <div key={field.id}>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' && field.options && field.options.length > 0 ? (
                        <select
                          value={customValues[field.label] || ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                        >
                          <option value="">Pilih...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'file' ? (
                        <div className="flex items-center gap-2">
                          {customValues[field.label] && (
                            <a
                              href={customValues[field.label]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 font-bold hover:underline"
                            >
                              Lihat File
                            </a>
                          )}
                          <label className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer">
                            {uploadingCustomKey === `custom:${field.label}` ? 'Mengunggah...' : 'Upload'}
                            <input
                              type="file"
                              onChange={(e) =>
                                handleCustomFileUpload('custom', field.label, e.target.files?.[0])
                              }
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={customValues[field.label] || ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                          }
                          placeholder={field.placeholder || field.label}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                        />
                      )}
                    </div>
                  ))}

                  {extraStoredCustomKeys.map((key) => {
                    const val = customValues[key] || '';
                    const isFileVal =
                      typeof val === 'string' &&
                      (val.startsWith('/uploads/') || val.startsWith('data:'));
                    return (
                      <div key={key}>
                        <label className="block font-semibold text-slate-700 mb-1">{key}</label>
                        {isFileVal ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline py-1.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Lihat Berkas Terunggah</span>
                          </a>
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setCustomValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Reset Kata Sandi (Opsional) */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Ubah Kata Sandi Mitra (Opsional)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak diubah"
                      className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(emailError) || Boolean(nikError)}
              className="px-5 py-2 text-xs font-bold text-amber-300 bg-gradient-to-r from-[#092147] via-[#113872] to-[#061835] hover:brightness-110 border border-amber-400/40 rounded-xl inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data Mitra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
