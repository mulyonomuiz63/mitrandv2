import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Lock,
  Sliders,
  Check,
  X,
  Upload,
  RefreshCw
} from 'lucide-react';
import {
  AuthUser,
  StaffMember,
  AdminProfile,
  STAFF_MENU_OPTIONS,
  DEFAULT_STAFF_ALLOWED_MENUS,
  StaffMenuAccessKey
} from '../types';
import { MALE_AVATAR_URL, FEMALE_AVATAR_URL, resolveAvatarUrl } from '../avatars';
import { useConfirm } from './ConfirmDialogModal';

interface StaffManagementPanelProps {
  currentUser: AuthUser;
  onAdminUserUpdated: (updatedUser: AuthUser) => void;
}

export const StaffManagementPanel: React.FC<StaffManagementPanelProps> = ({
  currentUser,
  onAdminUserUpdated,
}) => {
  const confirm = useConfirm();

  // Sub-navigation inside Staff & Admin Management
  const [activeSection, setActiveSection] = useState<'staff_list' | 'add_staff' | 'admin_profile'>('staff_list');

  // Admin Profile State
  const [adminData, setAdminData] = useState<AdminProfile>({
    id: currentUser.id || 'usr-admin-01',
    name: currentUser.name || 'Super Administrator',
    email: currentUser.email || 'admin@ndtaxlaw.com',
    phone: currentUser.phone || '0812-8899-7711',
    position: currentUser.position || 'Managing Partner & Super Admin',
    gender: currentUser.gender || 'male',
    avatarUrl: resolveAvatarUrl(currentUser.avatarUrl, currentUser.gender || 'male', currentUser.name),
  });
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Staff List State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add New Staff Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPosition, setNewPosition] = useState('Staf Operasional & Administrasi');
  const [newGender, setNewGender] = useState<'male' | 'female'>('female');
  const [newPassword, setNewPassword] = useState('');
  const [showNewStaffPass, setShowNewStaffPass] = useState(false);
  const [newAllowedMenus, setNewAllowedMenus] = useState<StaffMenuAccessKey[]>([
    ...DEFAULT_STAFF_ALLOWED_MENUS,
  ]);
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Editing Existing Staff Modal / Drawer State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('female');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAllowedMenus, setEditAllowedMenus] = useState<StaffMenuAccessKey[]>([]);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [savingStaffEdit, setSavingStaffEdit] = useState(false);

  // Quick Menu Access Drawer per Staff ID
  const [menuAccessStaffId, setMenuAccessStaffId] = useState<string | null>(null);
  const [tempAllowedMenus, setTempAllowedMenus] = useState<StaffMenuAccessKey[]>([]);
  const [savingMenuAccess, setSavingMenuAccess] = useState(false);

  const fetchAdminAndStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile');
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.admin) {
          const adm = data.data.admin;
          setAdminData({
            id: adm.id || 'usr-admin-01',
            name: adm.name || 'Super Administrator',
            email: adm.email || 'admin@ndtaxlaw.com',
            phone: adm.phone || '0812-8899-7711',
            position: adm.position || 'Managing Partner & Super Admin',
            gender: adm.gender || 'male',
            avatarUrl: resolveAvatarUrl(adm.avatarUrl, adm.gender || 'male', adm.name),
          });
        }
        if (Array.isArray(data.data.staffList)) {
          setStaffList(data.data.staffList);
        }
      }
    } catch (err) {
      console.error('Failed fetching admin & staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAndStaff();
  }, []);

  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Ukuran foto maksimal 2.5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAdminData((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!adminData.name.trim() || !adminData.email.trim()) {
      setFeedback({ type: 'error', message: 'Nama lengkap dan email Admin wajib diisi.' });
      return;
    }

    if (adminNewPassword.trim()) {
      if (adminNewPassword.trim().length < 6) {
        setFeedback({ type: 'error', message: 'Password baru Admin minimal 6 karakter.' });
        return;
      }
      if (adminNewPassword.trim() !== adminConfirmPassword.trim()) {
        setFeedback({ type: 'error', message: 'Konfirmasi password baru Admin tidak cocok.' });
        return;
      }
    }

    setSavingAdmin(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminData.name.trim(),
          email: adminData.email.trim(),
          phone: adminData.phone?.trim() || '',
          position: adminData.position?.trim() || 'Managing Partner & Super Admin',
          gender: adminData.gender,
          avatarUrl: adminData.avatarUrl,
          newPassword: adminNewPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan profil Admin.');
      }

      const updated = data.data;
      const updatedUser: AuthUser = {
        ...currentUser,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        position: updated.position,
        gender: updated.gender,
        avatarUrl: updated.avatarUrl,
      };
      onAdminUserUpdated(updatedUser);
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setFeedback({
        type: 'success',
        message: data.message || 'Data profil & password Admin berhasil diperbarui!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan profil Admin.',
      });
    } finally {
      setSavingAdmin(false);
    }
  };

  const toggleMenuInList = (
    list: StaffMenuAccessKey[],
    key: StaffMenuAccessKey
  ): StaffMenuAccessKey[] => {
    if (list.includes(key)) {
      return list.filter((item) => item !== key);
    }
    return [...list, key];
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFeedback({
        type: 'error',
        message: 'Nama Lengkap, Email Login, dan Password Staf wajib diisi.',
      });
      return;
    }
    if (newPassword.trim().length < 6) {
      setFeedback({
        type: 'error',
        message: 'Password Staf minimal terdiri dari 6 karakter.',
      });
      return;
    }
    if (newAllowedMenus.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Pilih minimal 1 menu yang dapat diakses oleh Staf.',
      });
      return;
    }

    setCreatingStaff(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          position: newPosition.trim() || 'Staf Operasional & Administrasi',
          gender: newGender,
          password: newPassword.trim(),
          allowedMenus: newAllowedMenus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menambahkan akun Staf.');
      }

      setStaffList((prev) => [data.data, ...prev]);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPosition('Staf Operasional & Administrasi');
      setNewPassword('');
      setNewAllowedMenus([...DEFAULT_STAFF_ALLOWED_MENUS]);
      setActiveSection('staff_list');
      setFeedback({
        type: 'success',
        message: data.message || `Akun Staf "${data.data.name}" berhasil ditambahkan!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat membuat akun Staf.',
      });
    } finally {
      setCreatingStaff(false);
    }
  };

  const openEditStaffModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone || '');
    setEditPosition(staff.position || 'Staf Operasional & Administrasi');
    setEditGender(staff.gender || 'female');
    setEditIsActive(staff.isActive !== false);
    setEditAllowedMenus(
      Array.isArray(staff.allowedMenus) && staff.allowedMenus.length > 0
        ? [...staff.allowedMenus]
        : [...DEFAULT_STAFF_ALLOWED_MENUS]
    );
    setEditNewPassword('');
    setShowEditPass(false);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFeedback(null);

    if (editNewPassword.trim() && editNewPassword.trim().length < 6) {
      setFeedback({
        type: 'error',
        message: 'Password baru Staf minimal 6 karakter.',
      });
      return;
    }

    if (editAllowedMenus.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Pilih minimal 1 akses menu untuk Staf ini.',
      });
      return;
    }

    setSavingStaffEdit(true);
    try {
      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          position: editPosition.trim(),
          gender: editGender,
          isActive: editIsActive,
          allowedMenus: editAllowedMenus,
          newPassword: editNewPassword.trim() || undefined,
          actorRole: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memperbarui data Staf.');
      }

      setStaffList((prev) => prev.map((s) => (s.id === editingStaff.id ? data.data : s)));
      setEditingStaff(null);
      setFeedback({
        type: 'success',
        message: data.message || `Data & hak akses Staf "${data.data.name}" berhasil diperbarui!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menyimpan data Staf.',
      });
    } finally {
      setSavingStaffEdit(false);
    }
  };

  const handleSaveQuickMenuAccess = async (staff: StaffMember) => {
    if (tempAllowedMenus.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Minimal 1 menu harus diaktifkan untuk Staf.',
      });
      return;
    }

    setSavingMenuAccess(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedMenus: tempAllowedMenus,
          actorRole: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memperbarui hak akses menu Staf.');
      }

      setStaffList((prev) => prev.map((s) => (s.id === staff.id ? data.data : s)));
      setMenuAccessStaffId(null);
      setFeedback({
        type: 'success',
        message: `Hak akses menu untuk Staf "${staff.name}" berhasil disimpan!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal menyimpan pengaturan menu Staf.',
      });
    } finally {
      setSavingMenuAccess(false);
    }
  };

  const handleToggleStaffActive = async (staff: StaffMember) => {
    const nextState = !staff.isActive;
    const ok = await confirm({
      title: nextState ? 'Aktifkan Akun Staf' : 'Nonaktifkan Akun Staf',
      message: nextState
        ? `Apakah Anda yakin ingin mengaktifkan kembali akses login untuk Staf "${staff.name}"?`
        : `Apakah Anda yakin ingin menonaktifkan sementara akses login untuk Staf "${staff.name}"?`,
      confirmText: nextState ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      variant: nextState ? 'primary' : 'warning',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: nextState,
          actorRole: 'admin',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStaffList((prev) => prev.map((s) => (s.id === staff.id ? data.data : s)));
        setFeedback({
          type: 'success',
          message: `Status akun Staf "${staff.name}" berhasil diubah menjadi ${nextState ? 'Aktif' : 'Nonaktif'}.`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    const ok = await confirm({
      title: 'Hapus Akun Staf Permanen',
      message: `Apakah Anda yakin ingin menghapus akun Staf "${staff.name}" (${staff.email}) secara permanen?`,
      confirmText: 'Ya, Hapus Staf',
      cancelText: 'Batalkan',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
        setFeedback({
          type: 'success',
          message: data.message || `Akun Staf "${staff.name}" berhasil dihapus.`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Otoritas Super Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Manajemen Staf, Hak Akses Menu &amp; Akun Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Kelola tim operasional di bawah Admin, tambah Staf baru, aktifkan atau nonaktifkan hak akses menu tertentu untuk masing-masing Staf, serta perbarui data profil dan password Admin utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('staff_list')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === 'staff_list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Staf &amp; Akses Menu ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('add_staff')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === 'add_staff'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Staf Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin_profile')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === 'admin_profile'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Edit Data &amp; Password Admin</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Security Policy Summary Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900">
              Kebijakan Pembatasan Permanen Role Staf (Di Bawah Admin)
            </p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Secara sistem, akun berstatus <strong>Staf</strong> tidak akan pernah memiliki akses ke menu <strong>Log Aktivitas &amp; Log Email</strong>, serta tidak dapat membuka tab sensitif di Pengaturan Sistem (<strong>Mode Sistem Dev/Prod, Database Supabase, SMTP Email, Login Google OAuth, dan Gemini AI</strong>). Untuk menu operasional lainnya, Admin bebas mengaktifkan atau menonaktifkan akses per masing-masing Staf.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAdminAndStaff}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* SECTION 1: DAFTAR STAF & KELOLA HAK AKSES MENU */}
      {activeSection === 'staff_list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Akun Staf Operasional ({staffList.length} Staf)
              </h2>
              <p className="text-xs text-slate-500">
                Klik tombol <strong>"Atur Akses Menu"</strong> pada kartu Staf untuk mengaktifkan atau menonaktifkan menu tertentu secara instan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('add_staff')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Staf Baru</span>
            </button>
          </div>

          {staffList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Belum Ada Staf Terdaftar</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tambahkan akun Staf operasional baru untuk membantu mengelola validasi klien, verifikasi mitra, komisi, dan layanan firma.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('add_staff')}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Staf Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {staffList.map((staff) => {
                const currentMenus =
                  Array.isArray(staff.allowedMenus) && staff.allowedMenus.length > 0
                    ? staff.allowedMenus
                    : DEFAULT_STAFF_ALLOWED_MENUS;
                const isMenuDrawerOpen = menuAccessStaffId === staff.id;

                return (
                  <div
                    key={staff.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                  >
                    <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Staff Identity */}
                      <div className="flex items-start sm:items-center gap-4">
                        <img
                          src={resolveAvatarUrl(staff.avatarUrl, staff.gender, staff.name)}
                          alt={staff.name}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-600/20 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{staff.name}</h3>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                                staff.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {staff.isActive !== false ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                              {staff.position || 'Staf Operasional'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {staff.email}
                            </span>
                            {staff.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {staff.phone}
                              </span>
                            )}
                          </div>

                          {/* Active Menu Badges Preview */}
                          <div className="pt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500 mr-1">
                              Akses Menu ({currentMenus.length}/{STAFF_MENU_OPTIONS.length}):
                            </span>
                            {STAFF_MENU_OPTIONS.map((menuOpt) => {
                              const active = currentMenus.includes(menuOpt.key);
                              return (
                                <span
                                  key={menuOpt.key}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    active
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                >
                                  {menuOpt.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            if (isMenuDrawerOpen) {
                              setMenuAccessStaffId(null);
                            } else {
                              setMenuAccessStaffId(staff.id);
                              setTempAllowedMenus([...currentMenus]);
                            }
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                            isMenuDrawerOpen
                              ? 'bg-indigo-700 text-white border-indigo-700'
                              : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Atur Akses Menu</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditStaffModal(staff)}
                          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Edit Data &amp; Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStaffActive(staff)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                            staff.isActive !== false
                              ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {staff.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          className="p-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
                          title="Hapus Akun Staf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Interactive Expandable Drawer: Atur Hak Akses Menu Staf */}
                    {isMenuDrawerOpen && (
                      <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                              Pengaturan Hak Akses Menu — {staff.name}
                            </h4>
                            <p className="text-xs text-slate-600">
                              Centang (Aktifkan) atau hilangkan centang (Nonaktifkan) menu yang diizinkan untuk diakses oleh Staf ini.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTempAllowedMenus([...DEFAULT_STAFF_ALLOWED_MENUS])}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                            >
                              Aktifkan Semua Menu Staf
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {STAFF_MENU_OPTIONS.map((menu) => {
                            const isChecked = tempAllowedMenus.includes(menu.key);
                            return (
                              <label
                                key={menu.key}
                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                                  isChecked
                                    ? 'bg-white border-blue-500 ring-1 ring-blue-500/30 shadow-2xs'
                                    : 'bg-slate-100/70 border-slate-200 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setTempAllowedMenus((prev) => toggleMenuInList(prev, menu.key))
                                  }
                                  className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900">
                                      {menu.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {menu.description}
                                  </p>
                                  <span
                                    className={`inline-block mt-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                                      isChecked
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isChecked ? 'Diaktifkan' : 'Dinonaktifkan'}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setMenuAccessStaffId(null)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={savingMenuAccess}
                            onClick={() => handleSaveQuickMenuAccess(staff)}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg flex items-center gap-1.5 shadow-xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>
                              {savingMenuAccess ? 'Menyimpan...' : 'Simpan Hak Akses Menu'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: TAMBAH STAF BARU */}
      {activeSection === 'add_staff' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Akun Staf Operasional Baru</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Buat kredensial login Staf baru dan tentukan menu mana saja yang boleh diakses oleh Staf tersebut.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('staff_list')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
            >
              ← Kembali ke Daftar Staf
            </button>
          </div>

          <form onSubmit={handleCreateStaff} className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Rina Wijaya, S.E."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Login Staf *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Contoh: rina.staf@ndtaxlaw.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Staf
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Contoh: 0813-xxxx-xxxx"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Posisi Staf
                </label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Contoh: Staf Operasional & Administrasi"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Login Awal Staf * (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewStaffPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password login staf..."
                    className="w-full pl-3.5 pr-10 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPass(!showNewStaffPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewStaffPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kelamin (Profil Default)
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewGender('male')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                      newGender === 'male'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Pria
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGender('female')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                      newGender === 'female'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    Wanita
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Permissions Selector */}
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pengaturan Hak Akses Menu untuk Staf Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih menu apa saja yang diaktifkan untuk Staf ini (dapat diubah kembali kapan saja oleh Admin).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAllowedMenus([...DEFAULT_STAFF_ALLOWED_MENUS])}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                  >
                    Pilih Semua Menu Staf
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {STAFF_MENU_OPTIONS.map((menu) => {
                  const checked = newAllowedMenus.includes(menu.key);
                  return (
                    <label
                      key={menu.key}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        checked
                          ? 'bg-white border-blue-500 ring-1 ring-blue-500/30 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewAllowedMenus((prev) => toggleMenuInList(prev, menu.key))
                        }
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{menu.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {menu.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSection('staff_list')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl"
              >
                Batalkan
              </button>
              <button
                type="submit"
                disabled={creatingStaff}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>{creatingStaff ? 'Menambahkan Staf...' : 'Simpan & Buat Akun Staf'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 3: EDIT DATA & PASSWORD ADMIN UTAMA */}
      {activeSection === 'admin_profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <span>Edit Data Profil &amp; Password Administrator Utama</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbarui identitas resmi Admin, alamat email login Admin, foto profil, serta kata sandi keamanan Admin.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAdminProfile} className="p-5 sm:p-6 space-y-6">
            {/* Avatar Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <img
                src={resolveAvatarUrl(adminData.avatarUrl, adminData.gender, adminData.name)}
                alt={adminData.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white shadow-md shrink-0"
              />
              <div className="space-y-2 text-center sm:text-left">
                <div>
                  <p className="text-sm font-bold text-slate-900">{adminData.name}</p>
                  <p className="text-xs text-slate-500">{adminData.email}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto Admin</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdminAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminData((prev) => ({
                        ...prev,
                        gender: 'male',
                        avatarUrl: MALE_AVATAR_URL,
                      }))
                    }
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                      adminData.gender === 'male'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Avatar Pria
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminData((prev) => ({
                        ...prev,
                        gender: 'female',
                        avatarUrl: FEMALE_AVATAR_URL,
                      }))
                    }
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                      adminData.gender === 'female'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Avatar Wanita
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Administrator *
                </label>
                <input
                  type="text"
                  required
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Login Administrator *
                </label>
                <input
                  type="email"
                  required
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Admin
                </label>
                <input
                  type="text"
                  value={adminData.phone || ''}
                  onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Posisi Admin
                </label>
                <input
                  type="text"
                  value={adminData.position || ''}
                  onChange={(e) => setAdminData({ ...adminData, position: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            {/* Password Change Block */}
            <div className="p-4 sm:p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Ubah Password Login Admin
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Biarkan kosong jika tidak ingin mengganti password Admin saat ini
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Baru Admin (Min. 6 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="Masukkan password baru Admin..."
                      className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Password Baru Admin
                  </label>
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru Admin..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="submit"
                disabled={savingAdmin}
                className="px-6 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{savingAdmin ? 'Menyimpan...' : 'Simpan Data & Password Admin'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT STAF & PASSWORD + HAK AKSES MENU */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  MANAJEMEN AKUN STAF
                </span>
                <h3 className="text-lg font-bold mt-1">
                  Edit Data, Password &amp; Akses Menu — {editingStaff.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveEditStaff}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap Staf *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Login Staf *
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jabatan / Posisi
                    </label>
                    <input
                      type="text"
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* Reset Password Staf */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      Ganti / Reset Password Staf (Opsional)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Kosongkan jika tidak diubah
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Masukkan password baru untuk Staf ini (min. 6 karakter)..."
                      className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPass(!showEditPass)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Menu Permissions inside Modal */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Hak Akses Menu Staf (Aktifkan / Nonaktifkan)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditAllowedMenus([...DEFAULT_STAFF_ALLOWED_MENUS])}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Aktifkan Semua
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STAFF_MENU_OPTIONS.map((menu) => {
                      const checked = editAllowedMenus.includes(menu.key);
                      return (
                        <label
                          key={menu.key}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 text-xs ${
                            checked
                              ? 'bg-blue-50/60 border-blue-400 text-slate-900'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditAllowedMenus((prev) => toggleMenuInList(prev, menu.key))
                            }
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-bold">{menu.label}</p>
                            <p className="text-[10px] text-slate-500">{menu.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingStaffEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingStaffEdit ? 'Menyimpan...' : 'Simpan Perubahan Staf'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
