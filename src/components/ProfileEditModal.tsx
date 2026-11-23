import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  CreditCard, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  Building2,
  Eye,
  EyeOff,
  Camera,
  AlertCircle,
  Upload,
  FileText,
  ExternalLink
} from 'lucide-react';
import {
  Mitra,
  BankDetails,
  AppSettings,
  MitraSystemFieldKey,
  DEFAULT_SPECIALIZATION_LABEL,
  DEFAULT_SPECIALIZATION_OPTIONS,
  resolveSpecializationOptions,
  isBankFormField,
  resolveMitraFormFields,
  getMitraKtpFileUrl,
  getMitraKtpFileName,
} from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar, inferGenderFromName } from '../avatars';
import { useConfirm } from './ConfirmDialogModal';
import { compressAndUploadFile, isAllowedVerificationDocumentFile } from '../utils/fileCompressor';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitra: Mitra;
  settings?: AppSettings | null;
  onUpdateProfile: (id: string, data: Partial<Mitra> & { newPassword?: string }) => Promise<void>;
}

const DEFAULT_BANK_OPTIONS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  mitra,
  settings,
  onUpdateProfile,
}) => {
  const confirm = useConfirm();
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

  const resolveMitraGender = React.useCallback((m: Mitra): 'male' | 'female' => {
    if (m.gender === 'female' || m.gender === 'male') return m.gender;
    const bankMeta = (m.bankDetails || {}) as any;
    if (bankMeta.__gender === 'female' || bankMeta.__gender === 'male') return bankMeta.__gender;
    if (m.avatarUrl === FEMALE_AVATAR_URL) return 'female';
    if (m.avatarUrl === MALE_AVATAR_URL) return 'male';
    return inferGenderFromName(m.fullName);
  }, []);

  const [fullName, setFullName] = useState(mitra.fullName || '');
  const [nik, setNik] = useState(
    !mitra.nik || mitra.nik === '-' || mitra.nik === '3201000000000000' ? '' : mitra.nik
  );
  const [phone, setPhone] = useState(
    !mitra.phone || mitra.phone === '-' ? '' : mitra.phone.replace(/\D/g, '')
  );
  const [ktpFileUrl, setKtpFileUrl] = useState<string>(() => getMitraKtpFileUrl(mitra));
  const [ktpFileName, setKtpFileName] = useState<string>(() => getMitraKtpFileName(mitra));
  const [ktpCompressionInfo, setKtpCompressionInfo] = useState<string | null>(null);
  const [isUploadingKtp, setIsUploadingKtp] = useState(false);
  const [uploadingCustomKey, setUploadingCustomKey] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>(() => resolveMitraGender(mitra));
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>(() => {
    if (
      mitra.avatarUrl &&
      mitra.avatarUrl !== MALE_AVATAR_URL &&
      mitra.avatarUrl !== FEMALE_AVATAR_URL
    ) {
      return mitra.avatarUrl;
    }
    return '';
  });
  const [specialization, setSpecialization] = useState(
    mitra.specialization && activeSpecOptions.some((o) => o.label === mitra.specialization)
      ? mitra.specialization
      : activeSpecOptions[0]?.label || 'Business Partner'
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(
    mitra.customFields || {}
  );
  const [bankCustomFieldValues, setBankCustomFieldValues] = useState<Record<string, string>>(
    mitra.bankDetails?.customBankFields || {}
  );
  const [bankName, setBankName] = useState(
    !mitra.bankDetails?.bankName || mitra.bankDetails.bankName === '-'
      ? bankOptions[0] || 'Bank Central Asia (BCA)'
      : mitra.bankDetails.bankName
  );
  const [accountNumber, setAccountNumber] = useState(
    !mitra.bankDetails?.accountNumber ||
    mitra.bankDetails.accountNumber.trim() === '-' ||
    !/^\d+$/.test(mitra.bankDetails.accountNumber.trim())
      ? ''
      : mitra.bankDetails.accountNumber.trim()
  );
  const [accountHolder, setAccountHolder] = useState(
    !mitra.bankDetails?.accountHolder || mitra.bankDetails.accountHolder === '-'
      ? mitra.fullName || ''
      : mitra.bankDetails.accountHolder
  );
  
  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [isCheckingNik, setIsCheckingNik] = useState(false);

  const hydratedForOpenRef = useRef<{ isOpen: boolean; mitraId: string | null }>({
    isOpen: false,
    mitraId: null,
  });

  useEffect(() => {
    if (!isOpen) {
      hydratedForOpenRef.current = { isOpen: false, mitraId: null };
      return;
    }
    // Only hydrate form state when the modal opens or switches to another mitra,
    // never overwrite in-progress typing during background polling refreshes.
    if (
      hydratedForOpenRef.current.isOpen &&
      hydratedForOpenRef.current.mitraId === mitra.id
    ) {
      return;
    }
    hydratedForOpenRef.current = { isOpen: true, mitraId: mitra.id };

    setFullName(mitra.fullName || '');
    setNik(!mitra.nik || mitra.nik === '-' || mitra.nik === '3201000000000000' ? '' : mitra.nik);
    setNikError(null);
    setErrorMessage(null);
    setStatusMessage(null);
    setNewPassword('');
    setConfirmPassword('');
    setPhone(!mitra.phone || mitra.phone === '-' ? '' : mitra.phone.replace(/\D/g, ''));
    setKtpFileUrl(getMitraKtpFileUrl(mitra));
    setKtpFileName(getMitraKtpFileName(mitra));
    setKtpCompressionInfo(null);
    setGender(resolveMitraGender(mitra));
    if (
      mitra.avatarUrl &&
      mitra.avatarUrl !== MALE_AVATAR_URL &&
      mitra.avatarUrl !== FEMALE_AVATAR_URL
    ) {
      setCustomAvatarUrl(mitra.avatarUrl);
    } else {
      setCustomAvatarUrl('');
    }
    setSpecialization(
      mitra.specialization && activeSpecOptions.some((o) => o.label === mitra.specialization)
        ? mitra.specialization
        : activeSpecOptions[0]?.label || 'Business Partner'
    );
    setCustomFieldValues(mitra.customFields || {});
    const initialBankCustom: Record<string, string> = {
      ...(mitra.bankDetails?.customBankFields || {}),
    };
    activeMitraBankCustomFields.forEach((f) => {
      if (!initialBankCustom[f.label] && mitra.customFields?.[f.label]) {
        initialBankCustom[f.label] = mitra.customFields[f.label];
      }
    });
    setBankCustomFieldValues(initialBankCustom);
    setBankName(
      !mitra.bankDetails?.bankName || mitra.bankDetails.bankName === '-'
        ? bankOptions[0] || 'Bank Central Asia (BCA)'
        : mitra.bankDetails.bankName
    );
    setAccountNumber(
      !mitra.bankDetails?.accountNumber ||
      mitra.bankDetails.accountNumber.trim() === '-' ||
      !/^\d+$/.test(mitra.bankDetails.accountNumber.trim())
        ? ''
        : mitra.bankDetails.accountNumber.trim()
    );
    setAccountHolder(
      !mitra.bankDetails?.accountHolder || mitra.bankDetails.accountHolder === '-'
        ? mitra.fullName || ''
        : mitra.bankDetails.accountHolder
    );
  }, [mitra, isOpen, activeMitraBankCustomFields, activeSpecOptions, bankOptions, resolveMitraGender]);

  if (!isOpen) return null;

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKtpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setErrorMessage('Format file KTP/NPWP tidak valid. Harap unggah file berformat JPG, JPEG, PNG, atau PDF.');
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
      const finalUrl = compressed.hostedUrl || compressed.dataUrl;
      setKtpFileUrl(finalUrl);
      setKtpFileName(compressed.fileName || file.name);
      setKtpCompressionInfo(
        `Terkompres: ${compressed.originalFormattedSize} → ${compressed.compressedFormattedSize}`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengompres dan mengunggah dokumen KTP/NPWP.');
    } finally {
      setIsUploadingKtp(false);
    }
  };

  const handleDynamicFileUpload = async (
    file: File,
    fieldLabel: string,
    isBankSection: boolean
  ) => {
    setErrorMessage(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setErrorMessage(
        `Format file untuk "${fieldLabel}" harus berupa JPG, JPEG, PNG, atau PDF.`
      );
      return;
    }
    setUploadingCustomKey(`${isBankSection ? 'bank' : 'profile'}:${fieldLabel}`);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      const finalUrl = compressed.hostedUrl || compressed.dataUrl;
      if (isBankSection) {
        setBankCustomFieldValues((prev) => ({
          ...prev,
          [fieldLabel]: finalUrl,
        }));
      } else {
        setCustomFieldValues((prev) => ({
          ...prev,
          [fieldLabel]: finalUrl,
        }));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || `Gagal mengunggah file "${fieldLabel}".`);
    } finally {
      setUploadingCustomKey(null);
    }
  };

  const checkNikUnique = async (value: string): Promise<{ ok: boolean; message?: string }> => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === '3201000000000000') {
      setNikError(null);
      return { ok: true };
    }
    setIsCheckingNik(true);
    try {
      const res = await fetch('/api/mitra/check-unique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-skip-crud-alert': 'true' },
        body: JSON.stringify({ nik: trimmed, excludeMitraId: mitra.id }),
      });
      const data = await res.json();
      if (data.nikTaken) {
        const msg =
          data.nikMessage ||
          'NIK / NPWP sudah terdaftar pada akun mitra lain. Setiap mitra hanya boleh menggunakan 1 NIK / NPWP yang unik.';
        setNikError(msg);
        return { ok: false, message: msg };
      }
      setNikError(null);
      return { ok: true };
    } catch {
      return { ok: true };
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNikError(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (isSysActive('phone') && getSysField('phone')?.required !== false) {
      const cleanPhone = (phone || '').trim();
      if (!cleanPhone || !/^\d+$/.test(cleanPhone)) {
        setErrorMessage('No. WhatsApp Aktif wajib diisi dengan angka saja tanpa huruf atau simbol.');
        return;
      }
    } else if (phone && !/^\d+$/.test(phone.trim())) {
      setErrorMessage('No. WhatsApp Aktif hanya boleh berisi angka.');
      return;
    }
    if (isSysActive('ktpFile') && getSysField('ktpFile')?.required !== false && !ktpFileUrl) {
      setErrorMessage(
        'Dokumen File KTP / NPWP wajib diunggah (Format JPG, JPEG, PNG, atau PDF) untuk kelengkapan verifikasi.'
      );
      return;
    }
    if (isSysActive('accountNumber') && getSysField('accountNumber')?.required !== false) {
      const cleanAcc = (accountNumber || '').trim();
      if (!cleanAcc || cleanAcc === '-' || !/^\d+$/.test(cleanAcc)) {
        setErrorMessage('Nomor Rekening Bank wajib diisi dengan angka yang valid (hanya angka).');
        return;
      }
    } else if (accountNumber && (!/^\d+$/.test(accountNumber.trim()) || accountNumber.trim() === '-')) {
      setErrorMessage('Nomor Rekening Bank harus berupa angka (hanya angka).');
      return;
    }
    for (const f of activeMitraCustomFields) {
      if (f.type === 'file' && f.required && !customFieldValues[f.label]) {
        setErrorMessage(`Mohon unggah file untuk kolom wajib "${f.label}".`);
        return;
      }
    }
    for (const f of activeMitraBankCustomFields) {
      if (f.type === 'file' && f.required && !bankCustomFieldValues[f.label]) {
        setErrorMessage(`Mohon unggah file untuk kolom wajib "${f.label}".`);
        return;
      }
    }

    // Validasi keunikan NIK / NPWP sebelum membuka konfirmasi simpan
    if (isSysActive('nik') && nik && nik.trim()) {
      const nikCheck = await checkNikUnique(nik);
      if (!nikCheck.ok) {
        setErrorMessage(
          nikCheck.message ||
            'NIK / NPWP sudah terdaftar pada akun mitra lain. Gunakan NIK / NPWP Anda sendiri.'
        );
        return;
      }
    }

    const isRejected = mitra.status === 'rejected';
    const ok = await confirm({
      title: isRejected
        ? 'Simpan Perbaikan & Ajukan Ulang Verifikasi'
        : 'Konfirmasi Simpan Perubahan Profil & Rekening',
      message: isRejected
        ? 'Apakah data yang Anda perbaiki sudah sesuai dengan catatan Admin dan siap diajukan kembali untuk diverifikasi?'
        : 'Apakah Anda yakin ingin menyimpan perubahan data diri, berkas KTP/NPWP, foto profil, dan informasi rekening bank Anda?',
      detail: `Nama Mitra: ${fullName}\nNIK KTP: ${nik}\nBerkas KTP/NPWP: ${ktpFileName || (ktpFileUrl ? 'Sudah Diunggah' : 'Belum Diunggah')}\nNo. WhatsApp: ${phone}\nRekening Pencairan: ${bankName} - ${accountNumber} (a.n. ${accountHolder})${newPassword ? '\nKata Sandi: Akan diperbarui' : ''}`,
      confirmText: isRejected ? 'Ya, Simpan & Ajukan Ulang' : 'Ya, Simpan Perubahan',
      cancelText: 'Batalkan',
      variant: isRejected ? 'success' : 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const resolvedAvatar = customAvatarUrl || getDefaultAvatar(gender, fullName);
      const ktpLabel = getSysField('ktpFile')?.label || 'Upload File KTP / NPWP';
      const mergedCustomFields: Record<string, string> = {
        ...customFieldValues,
        ...bankCustomFieldValues,
        ...(ktpFileUrl ? { [ktpLabel]: ktpFileUrl, 'mitra-def-ktpFile': ktpFileUrl } : {}),
        ...(ktpFileName ? { __ktpFileName: ktpFileName } : {}),
      };
      await onUpdateProfile(mitra.id, {
        fullName,
        phone,
        nik,
        ktpFileUrl: ktpFileUrl || undefined,
        ktpFileName: ktpFileName || undefined,
        gender,
        avatarUrl: resolvedAvatar,
        specialization,
        customFields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : undefined,
        bankDetails: {
          bankName,
          accountNumber,
          accountHolder,
          customBankFields:
            Object.keys(bankCustomFieldValues).length > 0 ? bankCustomFieldValues : undefined,
        },
        ...(isRejected ? { resubmitVerification: true } : {}),
        ...(newPassword ? { newPassword } : {}),
      } as any);

      setStatusMessage(
        isRejected
          ? 'Perbaikan data berhasil disimpan & diajukan ulang ke Admin untuk diverifikasi!'
          : 'Data diri, foto profil, dan rekening bank berhasil diperbarui!'
      );
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan perubahan data profil.';
      if (msg.toLowerCase().includes('nik') || msg.toLowerCase().includes('npwp')) {
        setNikError(msg);
      }
      setErrorMessage(msg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* FIXED HEADER */}
        <div className="shrink-0 p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between">
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
                Data Diri
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {mitra.memberCode} · Status:{' '}
                {mitra.status === 'verified'
                  ? 'Lulus Verifikasi'
                  : mitra.status === 'rejected'
                  ? 'Ditolak (Perlu Perbaikan Data)'
                  : 'Menunggu Review Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {mitra.status === 'rejected' && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                <p className="font-bold text-red-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Catatan Perbaikan dari Admin:</span>
                </p>
                <p className="font-semibold text-slate-900">
                  "{mitra.rejectionReason || 'Silakan periksa dan perbaiki data diri atau rekening bank Anda.'}"
                </p>
                <p className="text-[11px] text-red-700">
                  Perbaiki kolom yang diperlukan di bawah, lalu klik <strong>"Simpan &amp; Ajukan Ulang Verifikasi"</strong>.
                </p>
              </div>
            )}

            {statusMessage && (
              <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border-2 border-emerald-400 shadow-md">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border-2 border-red-400 shadow-md">
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Upload Foto Profil Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={customAvatarUrl || getDefaultAvatar(gender, fullName)}
                  alt={fullName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-blue-600 shadow-xs shrink-0 bg-white"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Foto Profil Mitra Resmi</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Foto ini ditampilkan pada Kartu Identitas Digital dan Header Portal.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {customAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomAvatarUrl('')}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                  >
                    Pakai Default
                  </button>
                )}
                <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

          {/* Data Diri */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Data Diri Mitra
            </h4>
            <div className="space-y-3">
              {isSysActive('fullName') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {getSysField('fullName')?.label || 'Nama Lengkap & Gelar'}
                  </label>
                  <input
                    type="text"
                    required={getSysField('fullName')?.required !== false}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(isSysActive('phone') || isSysActive('nik')) && (
                <div
                  className={`grid ${
                    isSysActive('phone') && isSysActive('nik') ? 'grid-cols-2' : 'grid-cols-1'
                  } gap-3`}
                >
                  {isSysActive('phone') && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {getSysField('phone')?.label || 'No. WhatsApp'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={getSysField('phone')?.placeholder || '0812xxxx'}
                        required={getSysField('phone')?.required !== false}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        * Wajib diisi angka saja tanpa huruf, spasi, atau tanda hubung
                      </p>
                    </div>
                  )}
                  {isSysActive('nik') && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {getSysField('nik')?.label || 'NIK / NPWP'}{' '}
                        {(mitra.status !== 'verified' ||
                          !mitra.nik ||
                          mitra.nik === '-' ||
                          mitra.nik === '3201000000000000') && (
                          <span className="text-blue-600">(Dapat Diperbaiki)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        maxLength={25}
                        required={getSysField('nik')?.required !== false}
                        disabled={
                          mitra.status === 'verified' &&
                          Boolean(
                            mitra.nik &&
                              mitra.nik.trim() !== '' &&
                              mitra.nik.trim() !== '-' &&
                              mitra.nik.trim() !== '3201000000000000'
                          )
                        }
                        value={nik}
                        onChange={(e) => {
                          setNik(e.target.value);
                          if (nikError) setNikError(null);
                        }}
                        onBlur={(e) => checkNikUnique(e.target.value)}
                        className={`w-full px-3 py-2 text-xs font-mono rounded-lg border ${
                          mitra.status === 'verified' &&
                          Boolean(
                            mitra.nik &&
                              mitra.nik.trim() !== '' &&
                              mitra.nik.trim() !== '-' &&
                              mitra.nik.trim() !== '3201000000000000'
                          )
                            ? 'border-slate-200 bg-slate-50 text-slate-500'
                            : nikError
                            ? 'border-red-500 bg-red-50/40 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-hidden'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                      {isCheckingNik && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Memeriksa keunikan NIK / NPWP...
                        </p>
                      )}
                      {nikError && (
                        <p className="text-[11px] font-semibold text-red-600 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{nikError}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Upload File KTP / NPWP (Wajib untuk Kelengkapan Verifikasi) */}
              {isSysActive('ktpFile') && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 ${
                    ktpFileUrl
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-700" />
                          <span>{getSysField('ktpFile')?.label || 'Upload File KTP / NPWP'}</span>
                          {getSysField('ktpFile')?.required !== false && (
                            <span className="text-rose-600">*</span>
                          )}
                        </label>
                        {ktpFileUrl ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Sudah Diunggah
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Wajib Upload untuk Verifikasi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ktpFileUrl && (
                        <a
                          href={ktpFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Lihat File</span>
                        </a>
                      )}
                      <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingKtp
                            ? 'Mengompres...'
                            : ktpFileUrl
                            ? 'Ganti File'
                            : 'Pilih File KTP/NPWP'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={handleKtpFileChange}
                          disabled={isUploadingKtp}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {ktpFileUrl && (
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {ktpFileUrl.toLowerCase().endsWith('.pdf') ||
                        ktpFileUrl.startsWith('data:application/pdf') ? (
                          <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            PDF
                          </div>
                        ) : (
                          <img
                            src={ktpFileUrl}
                            alt="Preview KTP/NPWP"
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {ktpFileName || 'Dokumen_KTP_NPWP'}
                          </p>
                          {ktpCompressionInfo && (
                            <p className="text-[10px] font-mono text-emerald-700">
                              {ktpCompressionInfo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {specEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {specLabel}
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {!activeSpecOptions.some((o) => o.label === specialization) && specialization && (
                      <option value={specialization}>{specialization}</option>
                    )}
                    {activeSpecOptions.map((opt) => (
                      <option key={opt.id} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                            {customFieldValues[field.label] ? (
                              <a
                                href={customFieldValues[field.label]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>File sudah diunggah (Klik untuk lihat)</span>
                              </a>
                            ) : (
                              <span>{field.placeholder || 'Format: JPG, JPEG, PNG, atau PDF'}</span>
                            )}
                          </div>
                          <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingCustomKey === `profile:${field.label}`
                                ? 'Mengompres...'
                                : customFieldValues[field.label]
                                ? 'Ganti File'
                                : 'Upload File'}
                            </span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleDynamicFileUpload(f, field.label, false);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={customFieldValues[field.label] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
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
                          value={customFieldValues[field.label] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
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
                          value={customFieldValues[field.label] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGender('male');
                    }}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      gender === 'male'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={MALE_AVATAR_URL} alt="LAKI-LAKI" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      <p className="text-xs font-bold text-slate-900">LAKI-LAKI</p>
                    </div>
                    {gender === 'male' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('female');
                    }}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      gender === 'female'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={FEMALE_AVATAR_URL} alt="PEREMPUAN" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                      <p className="text-xs font-bold text-slate-900">PEREMPUAN</p>
                    </div>
                    {gender === 'female' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Bank */}
          {(isSysActive('bankName') ||
            isSysActive('accountNumber') ||
            isSysActive('accountHolder') ||
            activeMitraBankCustomFields.length > 0) && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                <span>Data Rekening Bank Pencairan Komisi</span>
              </h4>

              <div className="space-y-3">
                {isSysActive('bankName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {getSysField('bankName')?.label || 'Bank Penerima'}
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    >
                      {!bankOptions.includes(bankName) && bankName && (
                        <option value={bankName}>{bankName}</option>
                      )}
                      {bankOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(isSysActive('accountNumber') || isSysActive('accountHolder')) && (
                  <div
                    className={`grid ${
                      isSysActive('accountNumber') && isSysActive('accountHolder')
                        ? 'grid-cols-2'
                        : 'grid-cols-1'
                    } gap-3`}
                  >
                    {isSysActive('accountNumber') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {getSysField('accountNumber')?.label || 'Nomor Rekening'}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder={getSysField('accountNumber')?.placeholder || 'Nomor rekening'}
                          required={getSysField('accountNumber')?.required !== false}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          * Wajib diisi angka saja tanpa tanda hubung (-), spasi, atau huruf
                        </p>
                      </div>
                    )}
                    {isSysActive('accountHolder') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {getSysField('accountHolder')?.label || 'Nama Pemilik Rekening'}
                        </label>
                        <input
                          type="text"
                          required={getSysField('accountHolder')?.required !== false}
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Bank Custom Fields configured by Admin */}
                {activeMitraBankCustomFields.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeMitraBankCustomFields.map((field) => (
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
                              {bankCustomFieldValues[field.label] ? (
                                <a
                                  href={bankCustomFieldValues[field.label]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>File sudah diunggah (Klik untuk lihat)</span>
                                </a>
                              ) : (
                                <span>{field.placeholder || 'JPG, PNG, atau PDF'}</span>
                              )}
                            </div>
                            <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {uploadingCustomKey === `bank:${field.label}`
                                  ? 'Mengompres...'
                                  : bankCustomFieldValues[field.label]
                                  ? 'Ganti File'
                                  : 'Upload File'}
                              </span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleDynamicFileUpload(f, field.label, true);
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            required={field.required}
                            value={bankCustomFieldValues[field.label] || ''}
                            onChange={(e) =>
                              setBankCustomFieldValues((prev) => ({
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
                            value={bankCustomFieldValues[field.label] || ''}
                            onChange={(e) =>
                              setBankCustomFieldValues((prev) => ({
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
                            value={bankCustomFieldValues[field.label] || ''}
                            onChange={(e) =>
                              setBankCustomFieldValues((prev) => ({
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
              </div>
            </div>
          )}

          {/* Ganti Password */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Ganti Kata Sandi (Opsional)</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min. 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
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
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg transition-colors shadow-xs disabled:opacity-50 ${
                mitra.status === 'rejected'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isSubmitting
                ? 'Menyimpan...'
                : mitra.status === 'rejected'
                ? 'Simpan & Ajukan Ulang Verifikasi'
                : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
