import React, { useState } from 'react';
import { 
  User, 
  CreditCard, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Mitra, BankDetails } from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, getDefaultAvatar, inferGenderFromName } from '../avatars';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitra: Mitra;
  onUpdateProfile: (id: string, data: Partial<Mitra>) => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  mitra,
  onUpdateProfile,
}) => {
  const [fullName, setFullName] = useState(mitra.fullName);
  const [phone, setPhone] = useState(mitra.phone);
  const [gender, setGender] = useState<'male' | 'female'>(mitra.gender || inferGenderFromName(mitra.fullName));
  const [specialization, setSpecialization] = useState(mitra.specialization);
  const [bankName, setBankName] = useState(mitra.bankDetails.bankName);
  const [accountNumber, setAccountNumber] = useState(mitra.bankDetails.accountNumber);
  const [accountHolder, setAccountHolder] = useState(mitra.bankDetails.accountHolder);
  
  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      alert('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateProfile(mitra.id, {
        fullName,
        phone,
        gender,
        avatarUrl: getDefaultAvatar(gender),
        specialization,
        bankDetails: {
          bankName,
          accountNumber,
          accountHolder,
        },
      });

      setStatusMessage('Data diri dan rekening bank berhasil diperbarui!');
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
                Profil &amp; Data Rekening Mitra
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
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
            )}
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
                  Pilih Avatar Profil Default
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      gender === 'male'
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
                    onClick={() => setGender('female')}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      gender === 'female'
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
