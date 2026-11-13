import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  ShieldCheck,
  Save,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Check,
  Users
} from 'lucide-react';
import {
  AuthUser,
  STAFF_MENU_OPTIONS,
  DEFAULT_STAFF_ALLOWED_MENUS,
  StaffMenuAccessKey
} from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, resolveAvatarUrl } from '../avatars';

interface StaffProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUserUpdated: (updatedUser: AuthUser) => void;
  onNavigateToStaffManagement?: () => void;
}

export const StaffProfileEditModal: React.FC<StaffProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onNavigateToStaffManagement,
}) => {
  const isStaff = currentUser.roleCode === 'staff';
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [position, setPosition] = useState(
    currentUser.position || (isStaff ? 'Staf Operasional & Administrasi' : 'Super Administrator')
  );
  const [gender, setGender] = useState<'male' | 'female'>(currentUser.gender || 'male');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser.avatarUrl || (currentUser.gender === 'female' ? FEMALE_AVATAR_URL : MALE_AVATAR_URL)
  );

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setPosition(
        currentUser.position || (isStaff ? 'Staf Operasional & Administrasi' : 'Super Administrator')
      );
      setGender(currentUser.gender || 'male');
      setAvatarUrl(
        resolveAvatarUrl(currentUser.avatarUrl, currentUser.gender || 'male', currentUser.name)
      );
      setNewPassword('');
      setConfirmPassword('');
      setFeedback(null);

      // Fetch latest from server
      if (isStaff && (currentUser.staffId || currentUser.id)) {
        fetch('/api/staff')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && Array.isArray(res.data)) {
              const found = res.data.find(
                (s: any) =>
                  s.id === currentUser.staffId ||
                  s.id === currentUser.id ||
                  s.email?.toLowerCase() === currentUser.email?.toLowerCase()
              );
              if (found) {
                setName(found.name || currentUser.name);
                setEmail(found.email || currentUser.email);
                setPhone(found.phone || '');
                setPosition(found.position || 'Staf Operasional & Administrasi');
                setGender(found.gender || 'male');
                setAvatarUrl(resolveAvatarUrl(found.avatarUrl, found.gender, found.name));
              }
            }
          })
          .catch(() => {});
      } else if (!isStaff) {
        fetch('/api/admin/profile')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data?.admin) {
              const adm = res.data.admin;
              setName(adm.name || currentUser.name);
              setEmail(adm.email || currentUser.email);
              setPhone(adm.phone || '');
              setPosition(adm.position || 'Super Administrator');
              setGender(adm.gender || 'male');
              setAvatarUrl(resolveAvatarUrl(adm.avatarUrl, adm.gender, adm.name));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, currentUser, isStaff]);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Ukuran foto maksimal 2.5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !email.trim()) {
      setFeedback({ type: 'error', message: 'Nama lengkap dan alamat email wajib diisi.' });
      return;
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setFeedback({ type: 'error', message: 'Password baru minimal harus terdiri dari 6 karakter.' });
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setFeedback({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
        return;
      }
    }

    setSaving(true);
    try {
      if (isStaff) {
        const targetStaffId = currentUser.staffId || currentUser.id;
        const res = await fetch(`/api/staff/${targetStaffId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            position: position.trim(),
            gender,
            avatarUrl,
            newPassword: newPassword.trim() || undefined,
            actorRole: 'staff',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Gagal memperbarui profil Staf.');
        }

        const updatedStaff = data.data;
        const updatedAuthUser: AuthUser = {
          ...currentUser,
          name: updatedStaff.name,
          email: updatedStaff.email,
          phone: updatedStaff.phone,
          position: updatedStaff.position,
          gender: updatedStaff.gender,
          avatarUrl: updatedStaff.avatarUrl,
          allowedMenus: updatedStaff.allowedMenus || currentUser.allowedMenus,
        };
        onUserUpdated(updatedAuthUser);
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({
          type: 'success',
          message: data.message || 'Profil Staf berhasil diperbarui!',
        });
      } else {
        const res = await fetch('/api/admin/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            position: position.trim(),
            gender,
            avatarUrl,
            newPassword: newPassword.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Gagal memperbarui profil Admin.');
        }

        const updatedAdmin = data.data;
        const updatedAuthUser: AuthUser = {
          ...currentUser,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          phone: updatedAdmin.phone,
          position: updatedAdmin.position,
          gender: updatedAdmin.gender,
          avatarUrl: updatedAdmin.avatarUrl,
        };
        onUserUpdated(updatedAuthUser);
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({
          type: 'success',
          message: data.message || 'Profil & kredensial Admin berhasil diperbarui!',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan perubahan profil.',
      });
    } finally {
      setSaving(false);
    }
  };

  const staffAllowedMenus: StaffMenuAccessKey[] =
    currentUser.allowedMenus && currentUser.allowedMenus.length > 0
      ? currentUser.allowedMenus
      : DEFAULT_STAFF_ALLOWED_MENUS;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {isStaff ? 'PROFIL STAF OPERASIONAL' : 'PROFIL ADMINISTRATOR UTAMA'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              {isStaff ? (
                <UserCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              )}
              <span>
                {isStaff ? 'Edit Profil & Password Staf' : 'Edit Data Profil & Password Admin'}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold">{feedback.message}</span>
              </div>
            )}

            {/* Avatar & Identity Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <img
                src={resolveAvatarUrl(avatarUrl, gender, name)}
                alt={name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white shadow-md shrink-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-bold text-slate-900">{name || 'Pengguna'}</p>
                <p className="text-xs text-slate-500">{email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                  <label className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('male');
                      setAvatarUrl(MALE_AVATAR_URL);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      gender === 'male'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('female');
                      setAvatarUrl(FEMALE_AVATAR_URL);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      gender === 'female'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Wanita
                  </button>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap {isStaff ? 'Staf' : 'Admin'} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Login Resmi *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ndtaxlaw.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Posisi Operasional
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Contoh: Staf Operasional & Administrasi"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password Update Section */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Ganti Password Login (Opsional)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500">
                  Kosongkan jika tidak ingin mengubah password
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Password Baru (Min. 6 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru..."
                      className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Staff Active Menus Info OR Admin Quick Shortcut */}
            {isStaff ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Hak Akses Menu Staf Anda Saat Ini
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Dikelola oleh Administrator
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STAFF_MENU_OPTIONS.map((menu) => {
                    const enabled = staffAllowedMenus.includes(menu.key);
                    return (
                      <span
                        key={menu.key}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border ${
                          enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {enabled && <Check className="w-3 h-3 text-emerald-600" />}
                        <span>{menu.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              onNavigateToStaffManagement && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-blue-700 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-950">
                        Ingin Menambah Staf Baru atau Mengatur Hak Akses Menu Staf?
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Buka halaman Manajemen Staf &amp; Admin untuk menambah staf dan mengatur izin menu.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToStaffManagement();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shrink-0"
                  >
                    Kelola Staf →
                  </button>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
