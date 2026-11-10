import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Building2,
  FileText,
  DollarSign,
  Download,
  ShieldCheck,
  Calendar,
  CreditCard,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { PayoutRequest } from '../types';

interface PayoutReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: PayoutRequest | null;
}

export const PayoutReceiptModal: React.FC<PayoutReceiptModalProps> = ({
  isOpen,
  onClose,
  payout,
}) => {
  if (!isOpen || !payout) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const grossAmount = payout.amount || 0;
  const pphVal = payout.pph21Deduction || 0;
  const adminFeeVal = payout.adminFeeDeduction || 0;
  const netAmount = payout.netAmountTransferred !== undefined ? payout.netAmountTransferred : Math.max(0, grossAmount - pphVal - adminFeeVal);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* FIXED STICKY HEADER */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <Receipt className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-bold font-display">
              Voucher &amp; Slip Resmi Pencairan Komisi
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Slip</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE RECEIPT BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 print:overflow-visible print:p-0">
        <div className="mt-4 space-y-6 text-slate-800">
          
          {/* Company Branding & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <img
                src="/assets/aistudio/logo_c3fdb6de.png"
                alt="ND TAX AND LAW"
                className="h-10 w-auto object-contain mb-1"
              />
              <p className="text-[11px] text-slate-500 font-mono">
                Menara Kadin Indonesia Lt. 24, Jakarta Selatan | Telp: 0812-8899-7711
              </p>
            </div>
            <div className="sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DITRANSFER (LUNAS)
              </span>
              <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                Ref: {payout.transferRefNumber || `TRX-ND-${payout.id.toUpperCase()}`}
              </p>
            </div>
          </div>

          {/* Mitra and Bank Destination Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Penerima Komisi (Mitra)
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{payout.mitraName}</p>
              <p className="font-mono text-blue-700 font-semibold">{payout.memberCode}</p>
              <p className="text-slate-500 mt-1">
                Tanggal Pengajuan: <span className="font-mono">{payout.requestDate}</span>
              </p>
              <p className="text-slate-500">
                Tanggal Diproses: <span className="font-mono font-bold text-slate-800">{payout.processedDate || payout.requestDate}</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Rekening Tujuan Transfer
              </span>
              <p className="text-sm font-bold text-blue-900 mt-0.5">{payout.bankDetails.bankName}</p>
              <p className="text-sm font-mono font-bold text-slate-800 tracking-wide">
                {payout.bankDetails.accountNumber}
              </p>
              <p className="text-slate-600">
                Atas Nama: <strong className="text-slate-900">{payout.bankDetails.accountHolder}</strong>
              </p>
              <p className="text-slate-500 mt-1">
                Diproses oleh: <span className="font-medium text-slate-700">{payout.disbursedBy || 'Finance NDTAXANDLAW'}</span>
              </p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-700 uppercase tracking-wider flex justify-between items-center">
              <span>Rincian Pembayaran Komisi &amp; Potongan Pajak</span>
              <span>Nominal (IDR)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              
              {/* Gross */}
              <div className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">Hak Komisi Kotor (Gross Commission)</span>
                  <p className="text-[11px] text-slate-500">Total komisi yang disetujui dari closing klien perikatan.</p>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatRupiah(grossAmount)}
                </span>
              </div>

              {/* PPh 21 Deduction */}
              <div className="px-4 py-3 flex justify-between items-center bg-rose-50/40">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-rose-900">Potongan PPh Pasal 21 Tenaga Ahli</span>
                    {payout.pph21Rate ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        {payout.pph21Rate}%
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {pphVal > 0 
                      ? 'Dipotong untuk disetorkan ke Kas Negara via Billing Pajak DJP (Bukti Potong dapat diminta).'
                      : 'Nihil / Bebas pemotongan (ditanggung penuh atau non-subjek).'}
                  </p>
                </div>
                <span className={`font-mono font-bold text-sm ${pphVal > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {pphVal > 0 ? `- ${formatRupiah(pphVal)}` : 'Rp 0'}
                </span>
              </div>

              {/* Bank Admin Fee */}
              <div className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-700">Biaya Transfer Administrasi Bank</span>
                  <p className="text-[11px] text-slate-500">Biaya transaksi transfer perbankan (BI-FAST / Realtime Online).</p>
                </div>
                <span className={`font-mono font-bold text-sm ${adminFeeVal > 0 ? 'text-slate-700' : 'text-emerald-600'}`}>
                  {adminFeeVal > 0 ? `- ${formatRupiah(adminFeeVal)}` : 'Gratis (Rp 0)'}
                </span>
              </div>

              {/* Net Transferred Total */}
              <div className="px-4 py-3.5 bg-blue-50/70 flex justify-between items-center border-t-2 border-blue-600">
                <div>
                  <span className="text-sm font-extrabold text-blue-950 uppercase tracking-wide">
                    Total Diterima Bersih (Net Amount)
                  </span>
                  <p className="text-[11px] text-blue-800">
                    Jumlah nominal efektif yang ditransfer ke rekening bank mitra.
                  </p>
                </div>
                <span className="font-mono font-extrabold text-emerald-700 text-lg">
                  {formatRupiah(netAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Proof of Transfer Attachment */}
          {payout.proofFileUrl || payout.proofFileName ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Lampiran Bukti Struk Transfer Bank
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {payout.proofFileName || 'Bukti_Transfer_Resmi.pdf'}
                </span>
              </div>

              {payout.proofFileUrl && payout.proofFileUrl.startsWith('data:image') ? (
                <div className="mt-2 text-center">
                  <img
                    src={payout.proofFileUrl}
                    alt="Bukti Transfer Bank"
                    className="max-h-60 mx-auto rounded-lg border border-slate-300 shadow-xs object-contain"
                  />
                  <div className="mt-2">
                    <a
                      href={payout.proofFileUrl}
                      download={payout.proofFileName || 'bukti_transfer.jpg'}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Gambar Bukti Transfer
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {payout.proofFileName || 'Bukti_Transfer_Bank_Resmi.pdf'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Format PDF terotentikasi tim Finance NDTAXANDLAW
                      </p>
                    </div>
                  </div>

                  {payout.proofFileUrl ? (
                    <a
                      href={payout.proofFileUrl}
                      download={payout.proofFileName || 'bukti_transfer.pdf'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh File</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi Sistem
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 text-center">
              <span>Transfer otomatis diproses melalui jaringan interbank kliring nasional (SKNBI/BI-FAST).</span>
            </div>
          )}

          {/* Notes */}
          {payout.notes && (
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700">
              <span className="font-bold text-blue-900">Catatan Finance: </span>
              <span>{payout.notes}</span>
            </div>
          )}

          {/* Electronic Seal Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            <p>
              Dokumen ini diterbitkan secara otomatis dan terotentikasi melalui Sistem Finansial Resmi NDTAXANDLAW.
            </p>
            <p className="mt-0.5">
              Sebagai bukti sah pencairan komisi perikatan jasa konsultasi pajak dan hukum korporasi.
            </p>
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM FOOTER BUTTON */}
      <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
        <button
          onClick={onClose}
          type="button"
          className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-xs"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
);
};
