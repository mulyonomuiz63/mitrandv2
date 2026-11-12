import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Mitra, BankDetails } from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar, inferGenderFromName } from '../avatars';
import { useConfirm } from './ConfirmDialogModal';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitra: Mitra;
  onUpdateProfile: (id: string, data: Partial<Mitra> & { newPassword?: string }) => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  mitra,
  onUpdateProfile,
}) => {
  const confirm = useConfirm();
  const [fullName, setFullName] = useState(mitra.fullName);
  const [phone, setPhone] = useState(mitra.phone);
  const [gender, setGender] = useState<'male' | 'female'>(mitra.gender || inferGenderFromName(mitra.fullName));
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
  const [specialization, setSpecialization] = useState(mitra.specialization);
  const [bankName, setBankName] = useState(mitra.bankDetails.bankName);
  const [accountNumber, setAccountNumber] = useState(mitra.bankDetails.accountNumber);
  const [accountHolder, setAccountHolder] = useState(mitra.bankDetails.accountHolder);
  
  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(mitra.fullName);
    setPhone(mitra.phone);
    setGender(mitra.gender || inferGenderFromName(mitra.fullName));
    if (
      mitra.avatarUrl &&
      mitra.avatarUrl !== MALE_AVATAR_URL &&
      mitra.avatarUrl !== FEMALE_AVATAR_URL
    ) {
      setCustomAvatarUrl(mitra.avatarUrl);
    } else {
      setCustomAvatarUrl('');
    }
    setSpecialization(mitra.specialization);
    setBankName(mitra.bankDetails.bankName);
    setAccountNumber(mitra.bankDetails.accountNumber);
    setAccountHolder(mitra.bankDetails.accountHolder);
  }, [mitra, isOpen]);

  if (!isOpen) return null;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setCustomAvatarUrl(compressed);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Simpan Perubahan Profil & Rekening',
      message: 'Apakah Anda yakin ingin menyimpan perubahan data diri, foto profil, dan informasi rekening bank Anda?',
      detail: `Nama Mitra: ${fullName}\nNo. WhatsApp: ${phone}\nRekening Pencairan: ${bankName} - ${accountNumber} (a.n. ${accountHolder})${newPassword ? '\nKata Sandi: Akan diperbarui' : ''}`,
      confirmText: 'Ya, Simpan Perubahan',
      cancelText: 'Batalkan',
      variant: 'primary',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const resolvedAvatar = customAvatarUrl || getDefaultAvatar(gender, fullName);
      await onUpdateProfile(mitra.id, {
        fullName,
        phone,
        gender,
        avatarUrl: resolvedAvatar,
        specialization,
        bankDetails: {
          bankName,
          accountNumber,
          accountHolder,
        },
        ...(newPassword ? { newPassword } : {}),
      });

      setStatusMessage('Data diri, foto profil, dan rekening bank berhasil diperbarui!');
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
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
                Profil, Foto &amp; Data Rekening Mitra
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {mitra.memberCode} · Status: {mitra.status === 'verified' ? 'Terverifikasi' : 'Menunggu Review'}
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
            {statusMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIK KTP
                  </label>
                  <input
                    type="text"
                    disabled
                    value={mitra.nik}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spesialisasi Bisnis
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              {/* Gender / Avatar Default Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Jenis Kelamin / Avatar Default (Jika Tidak Upload Foto)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGender('male');
                      setCustomAvatarUrl('');
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      gender === 'male' && !customAvatarUrl
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <img src={MALE_AVATAR_URL} alt="Avatar Laki-laki" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Avatar Laki-laki</p>
                      <p className="text-[10px] text-slate-500">Default Laki-laki</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('female');
                      setCustomAvatarUrl('');
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      gender === 'female' && !customAvatarUrl
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <img src={FEMALE_AVATAR_URL} alt="Avatar Perempuan" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Avatar Perempuan</p>
                      <p className="text-[10px] text-slate-500">Default Perempuan</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Bank */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-700" />
              <span>Data Rekening Bank Pencairan Komisi</span>
            </h4>
            <p className="text-[11px] text-slate-500 mb-2">
              Pastikan nomor rekening tepat agar transfer pencairan komisi tidak tertunda.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Penerima
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                >
                  <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                  <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>

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
                    placeholder="Minimal 6 karakter"
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
                    placeholder="Ulangi sandi baru"
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
