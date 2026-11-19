import React, { useState } from 'react';
import { 
  UserPlus, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Building2, 
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  FileText
} from 'lucide-react';
import {
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

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings | null;
  onRegister: (data: {
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
}

const DEFAULT_BANK_OPTIONS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
];

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onRegister,
}) => {
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nik, setNik] = useState('');
  const [ktpFileUrl, setKtpFileUrl] = useState('');
  const [ktpFileName, setKtpFileName] = useState('');
  const [ktpCompressionInfo, setKtpCompressionInfo] = useState<string | null>(null);
  const [isUploadingKtp, setIsUploadingKtp] = useState(false);
  const [uploadingCustomKey, setUploadingCustomKey] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [specialization, setSpecialization] = useState(
    activeSpecOptions[0]?.label || 'Business Partner'
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [bankCustomFieldValues, setBankCustomFieldValues] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Bank fields
  const [bankName, setBankName] = useState(bankOptions[0] || 'Bank Central Asia (BCA)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeSpecOptions.length > 0 && !activeSpecOptions.some((o) => o.label === specialization)) {
      setSpecialization(activeSpecOptions[0].label);
    }
  }, [activeSpecOptions, specialization]);

  React.useEffect(() => {
    if (bankOptions.length > 0 && !bankOptions.includes(bankName)) {
      setBankName(bankOptions[0]);
    }
  }, [bankOptions, bankName]);

  if (!isOpen) return null;

  const handleKtpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setErrorMessage('Format file KTP/NPWP tidak valid. Harap unggah file JPG, JPEG, PNG, atau PDF.');
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
      setKtpCompressionInfo(
        `Terkompres: ${compressed.originalFormattedSize} → ${compressed.compressedFormattedSize}`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengompres file KTP/NPWP.');
    } finally {
      setIsUploadingKtp(false);
    }
  };

  const handleDynamicFileUpload = async (file: File, fieldLabel: string) => {
    setErrorMessage(null);
    if (!isAllowedVerificationDocumentFile(file)) {
      setErrorMessage(`Format file "${fieldLabel}" harus berupa JPG, JPEG, PNG, atau PDF.`);
      return;
    }
    setUploadingCustomKey(fieldLabel);
    try {
      const compressed = await compressAndUploadFile(file, {
        maxDimension: 1400,
        quality: 0.78,
        uploadToServer: true,
      });
      setCustomFieldValues((prev) => ({
        ...prev,
        [fieldLabel]: compressed.hostedUrl || compressed.dataUrl,
      }));
    } catch (err: any) {
      setErrorMessage(err?.message || `Gagal mengunggah file "${fieldLabel}".`);
    } finally {
      setUploadingCustomKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (isSysActive('ktpFile') && getSysField('ktpFile')?.required !== false && !ktpFileUrl) {
      setErrorMessage('Silakan unggah dokumen File KTP / NPWP (Format JPG, JPEG, PNG, atau PDF).');
      return;
    }
    setIsSubmitting(true);
    try {
      const ktpLabel = getSysField('ktpFile')?.label || 'Upload File KTP / NPWP';
      const mergedCustomFields: Record<string, string> = {
        ...customFieldValues,
        ...bankCustomFieldValues,
        ...(ktpFileUrl ? { [ktpLabel]: ktpFileUrl, 'mitra-def-ktpFile': ktpFileUrl } : {}),
        ...(ktpFileName ? { __ktpFileName: ktpFileName } : {}),
      };
      await onRegister({
        fullName: fullName || (email ? email.split('@')[0] : 'Mitra NDTAXANDLAW'),
        email,
        phone: isSysActive('phone') ? phone : '-',
        nik: isSysActive('nik') && nik ? nik : '-',
        ktpFileUrl: ktpFileUrl || undefined,
        ktpFileName: ktpFileName || undefined,
        specialization: specEnabled ? specialization : 'Business Partner',
        gender,
        avatarUrl: getDefaultAvatar(gender),
        bankDetails: {
          bankName: '-',
          accountNumber: '-',
          accountHolder: fullName || 'Mitra NDTAXANDLAW',
        },
        password: password || 'mitraND2026!',
        customFields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : undefined,
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
                    Lengkapi data diri profesional. Data rekening bank dapat dilengkapi setelah login.
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
                          getSysField('fullName')?.placeholder || 'Contoh: Muhammad Reza, S.H., M.H.'
                        }
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (!accountHolder) setAccountHolder(e.target.value);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
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
                            {getSysField('nik')?.label || 'Nomor KTP / NIK'}{' '}
                            {getSysField('nik')?.required !== false && '*'}
                          </label>
                          <input
                            type="text"
                            required={getSysField('nik')?.required !== false}
                            maxLength={16}
                            placeholder={getSysField('nik')?.placeholder || '16 digit NIK resmi'}
                            value={nik}
                            onChange={(e) => setNik(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </div>
                      )}
                      {specEnabled && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {specLabel} {specSysField?.required !== false && '*'}
                          </label>
                          <select
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
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
                        ktpFileUrl
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
                          {ktpFileName && (
                            <p className="text-[11px] font-bold text-emerald-700 mt-1">
                              ✓ {ktpFileName} {ktpCompressionInfo ? `(${ktpCompressionInfo})` : ''}
                            </p>
                          )}
                        </div>
                        <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
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
                  )}

                  {/* Gender Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Pilih Jenis Kelamin
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
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
                        onClick={() => setGender('female')}
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

                  {(isSysActive('email') || isSysActive('phone')) && (
                    <div
                      className={`grid grid-cols-1 ${
                        isSysActive('email') && isSysActive('phone') ? 'sm:grid-cols-2' : ''
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
                            placeholder={getSysField('email')?.placeholder || 'nama@email.com'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </div>
                      )}
                      {isSysActive('phone') && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {getSysField('phone')?.label || 'No. WhatsApp Aktif'}{' '}
                            {getSysField('phone')?.required !== false && '*'}
                          </label>
                          <input
                            type="tel"
                            required={getSysField('phone')?.required !== false}
                            placeholder={getSysField('phone')?.placeholder || '0812-xxxx-xxxx'}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Mitra Custom Fields configured by Admin */}
                  {activeMitraCustomFields.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeMitraCustomFields.map((field) => (
                        <div
                          key={field.id}
                          className={
                            field.type === 'textarea' || field.type === 'file'
                              ? 'sm:col-span-2'
                              : ''
                          }
                        >
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          {field.type === 'file' ? (
                            <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-600 truncate">
                                {customFieldValues[field.label] ? (
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
                                  {uploadingCustomKey === field.label
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
                                    if (f) handleDynamicFileUpload(f, field.label);
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
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
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
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
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
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Portal Kemitraan
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter aman"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Daftar Mitra'}
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
