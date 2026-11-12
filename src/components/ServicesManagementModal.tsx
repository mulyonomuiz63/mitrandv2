import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, ShieldCheck, Tag, DollarSign, Percent, Layers, CheckCircle } from 'lucide-react';
import { ServiceItem } from '../types';

interface ServicesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceUpdated?: () => void;
}

export const ServicesManagementModal: React.FC<ServicesManagementModalProps> = ({
  isOpen,
  onClose,
  onServiceUpdated,
}) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceItem['category']>('Laporan Keuangan');
  const [defaultPrice, setDefaultPrice] = useState<number>(5000000);
  const [pricingType, setPricingType] = useState<'case_by_case' | 'monthly_subscription' | 'annual_subscription'>('case_by_case');
  const [commissionRate, setCommissionRate] = useState<number>(15);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services?all=true');
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      setShowAddForm(false);
      setEditingServiceId(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCategory('Laporan Keuangan');
    setDefaultPrice(5000000);
    setPricingType('case_by_case');
    setCommissionRate(15);
    setDescription('');
    setShowAddForm(false);
    setEditingServiceId(null);
    setErrorMsg('');
  };

  const handleEditClick = (srv: ServiceItem) => {
    setEditingServiceId(srv.id);
    setName(srv.name);
    setCategory(srv.category);
    setDefaultPrice(srv.defaultPrice);
    setPricingType(srv.pricingType);
    setCommissionRate(srv.commissionRate);
    setDescription(srv.description);
    setShowAddForm(true);
    setErrorMsg('');
  };

  const handleToggleActive = async (srv: ServiceItem) => {
    try {
      const res = await fetch(`/api/services/${srv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !srv.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setServices(services.map((s) => (s.id === srv.id ? { ...s, isActive: !s.isActive } : s)));
        if (onServiceUpdated) onServiceUpdated();
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus layanan ini dari katalog?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setServices(services.filter((s) => s.id !== id));
        setSuccessMsg('Layanan berhasil dihapus');
        setTimeout(() => setSuccessMsg(''), 2500);
        if (onServiceUpdated) onServiceUpdated();
      }
    } catch (e) {
      console.error('Failed to delete service:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || !defaultPrice) {
      setErrorMsg('Nama, kategori, dan nominal wajib diisi');
      return;
    }

    try {
      if (editingServiceId) {
        // Edit existing
        const res = await fetch(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            category,
            defaultPrice: Number(defaultPrice),
            pricingType,
            commissionRate: Number(commissionRate),
            description: description.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg('Layanan berhasil diperbarui');
          resetForm();
          fetchServices();
          if (onServiceUpdated) onServiceUpdated();
        } else {
          setErrorMsg(data.message || 'Gagal memperbarui layanan');
        }
      } else {
        // Add new
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            category,
            defaultPrice: Number(defaultPrice),
            pricingType,
            commissionRate: Number(commissionRate),
            description: description.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg('Layanan baru berhasil ditambahkan');
          resetForm();
          fetchServices();
          if (onServiceUpdated) onServiceUpdated();
        } else {
          setErrorMsg(data.message || 'Gagal menambahkan layanan');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* FIXED STICKY HEADER */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded">
                PANEL ADMIN OPERASIONAL
              </span>
              <span className="text-xs text-slate-300">
                Katalog Layanan Pajak &amp; Keuangan Dinamis
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Kelola Katalog Layanan &amp; Skema Komisi
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-600">
                Admin dapat menambah paket layanan baru atau menyesuaikan persentase komisi mitra (Case-by-case atau Langganan Bulanan).
              </p>
            </div>
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Tambah Layanan Baru
              </button>
            ) : (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Tutup Formulir
              </button>
            )}
          </div>

          {/* Add / Edit Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-5 bg-slate-50 border border-blue-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingServiceId ? 'Edit Layanan' : 'Tambah Layanan Baru ke Katalog'}
                </h3>
                <span className="text-xs text-slate-500">Formulir Konfigurasi Layanan</span>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Layanan Pajak / Akuntansi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Audit Forensik & Rekonsiliasi Fiskal Lanjutan"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Layanan
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="Laporan Keuangan">Laporan Keuangan</option>
                    <option value="Kepatuhan Pajak">Kepatuhan Pajak</option>
                    <option value="Pendampingan Audit">Pendampingan Audit</option>
                    <option value="Legalitas Korporasi">Legalitas Korporasi</option>
                    <option value="Konsultasi Finansial">Konsultasi Finansial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skema Pembayaran
                  </label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="case_by_case">Case-by-Case (Proyek Sekali Bayar)</option>
                    <option value="monthly_subscription">Langganan Bulanan (Retainer Rutin)</option>
                    <option value="annual_subscription">Langganan Tahunan (Annual Retainer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal Default (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Persentase Komisi Mitra (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi Ringkas Layanan
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ringkasan cakupan pekerjaan dan deliverables..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
                >
                  {editingServiceId ? 'Simpan Perubahan' : 'Tambahkan ke Katalog'}
                </button>
              </div>
            </form>
          )}

          {/* Services List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Nama Layanan</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Skema</th>
                  <th className="p-3 text-right">Nominal Default</th>
                  <th className="p-3 text-center">Komisi Mitra</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {services.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 max-w-xs">
                      <div>{srv.name}</div>
                      <div className="text-[11px] font-normal text-slate-500 line-clamp-1">{srv.description}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                        {srv.category}
                      </span>
                    </td>
                    <td className="p-3">
                      {srv.pricingType === 'annual_subscription' ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-semibold text-[10px] border border-purple-200">
                          📅 Tahunan
                        </span>
                      ) : srv.pricingType === 'monthly_subscription' ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px] border border-blue-200">
                          🔄 Bulanan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px] border border-slate-200">
                          ⚡ Case 1x
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      Rp {srv.defaultPrice.toLocaleString('id-ID')}
                      {srv.pricingType === 'monthly_subscription' && <span className="text-[10px] text-slate-500 font-normal"> / bln</span>}
                      {srv.pricingType === 'annual_subscription' && <span className="text-[10px] text-slate-500 font-normal"> / thn</span>}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-xs">
                        {srv.commissionRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(srv)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          srv.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {srv.isActive ? 'Aktif' : 'Non-aktif'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(srv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Layanan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Hapus Layanan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FIXED STICKY FOOTER */}
        <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
