import {
  ServiceItem,
  SphScopeItem,
  SphServiceKey,
  SphServiceSelection,
  SphTurnoverTierId,
  SphVolumeTierId,
} from '../types';

export interface SphTurnoverTierOption {
  id: SphTurnoverTierId;
  labelId: string;
  labelEn: string;
  isNegotiation?: boolean;
}

export interface SphVolumeTierOption {
  id: SphVolumeTierId;
  labelJournalId: string;
  labelJournalEn: string;
  labelTransactionId: string;
  labelTransactionEn: string;
  isNegotiation?: boolean;
}

export interface SphMonthlyServiceDefinition {
  key: SphServiceKey;
  defaultSystemServiceId?: string;
  nameId: string;
  shortNameId: string;
  nameEn: string;
  shortNameEn: string;
  unitType: 'journal' | 'transaction' | 'package';
  usesFatMatrix: boolean;
  fallbackDefaultPrice: number;
  scopeItems: SphScopeItem[];
}

export const SPH_TURNOVER_TIERS: SphTurnoverTierOption[] = [
  {
    id: 'up_to_1b',
    labelId: 'Rp0 s/d Rp1 Miliar',
    labelEn: 'IDR 0 to IDR 1 billion',
  },
  {
    id: '1b_to_2b',
    labelId: 'Di atas Rp1 Miliar s/d Rp2 Miliar',
    labelEn: 'Above IDR 1 billion to IDR 2 billion',
  },
  {
    id: '2b_to_4_8b',
    labelId: 'Di atas Rp2 Miliar s/d Rp4,8 Miliar',
    labelEn: 'Above IDR 2 billion to IDR 4.8 billion',
  },
  {
    id: '4_8b_to_15b',
    labelId: 'Di atas Rp4,8 Miliar s/d Rp15 Miliar',
    labelEn: 'Above IDR 4.8 billion to IDR 15 billion',
  },
  {
    id: 'above_15b',
    labelId: 'Di atas Rp15 Miliar',
    labelEn: 'Above IDR 15 billion',
    isNegotiation: true,
  },
];

export const SPH_VOLUME_TIERS: SphVolumeTierOption[] = [
  {
    id: '0_50',
    labelJournalId: '0 s/d 50 jurnal',
    labelJournalEn: '0 to 50 journal entries',
    labelTransactionId: '0 s/d 50 transaksi',
    labelTransactionEn: '0 to 50 transactions',
  },
  {
    id: '51_100',
    labelJournalId: 'Di atas 50 s/d 100 jurnal',
    labelJournalEn: 'Above 50 to 100 journal entries',
    labelTransactionId: 'Di atas 50 s/d 100 transaksi',
    labelTransactionEn: 'Above 50 to 100 transactions',
  },
  {
    id: '101_200',
    labelJournalId: 'Di atas 100 s/d 200 jurnal',
    labelJournalEn: 'Above 100 to 200 journal entries',
    labelTransactionId: 'Di atas 100 s/d 200 transaksi',
    labelTransactionEn: 'Above 100 to 200 transactions',
  },
  {
    id: 'above_200',
    labelJournalId: 'Di atas 200 jurnal',
    labelJournalEn: 'Above 200 journal entries',
    labelTransactionId: 'Di atas 200 transaksi',
    labelTransactionEn: 'Above 200 transactions',
    isNegotiation: true,
  },
];

/**
 * Official FAT Monthly Service Pricing Matrix from ND Tax & Law Official Proposal
 * (Pages 5, 6, 7 of ND Tax And Law - Penawaran Harga Jasa FAT)
 * null means NEGOSIASI (manual input required).
 */
const FAT_PRICE_MATRIX: Record<SphTurnoverTierId, Record<SphVolumeTierId, number | null>> = {
  up_to_1b: {
    '0_50': 999_000,
    '51_100': 1_250_000,
    '101_200': 1_750_000,
    above_200: null,
  },
  '1b_to_2b': {
    '0_50': 1_250_000,
    '51_100': 1_750_000,
    '101_200': 2_250_000,
    above_200: null,
  },
  '2b_to_4_8b': {
    '0_50': 1_500_000,
    '51_100': 1_950_000,
    '101_200': 2_450_000,
    above_200: null,
  },
  '4_8b_to_15b': {
    '0_50': 2_500_000,
    '51_100': 3_000_000,
    '101_200': 4_500_000,
    above_200: null,
  },
  above_15b: {
    '0_50': null,
    '51_100': null,
    '101_200': null,
    above_200: null,
  },
};

export function lookupFatMonthlyPrice(
  turnoverTierId: SphTurnoverTierId,
  volumeTierId: SphVolumeTierId
): { price: number; isNegotiation: boolean } {
  const row = FAT_PRICE_MATRIX[turnoverTierId];
  const val = row ? row[volumeTierId] : null;
  if (val === null || val === undefined) {
    return { price: 0, isNegotiation: true };
  }
  return { price: val, isNegotiation: false };
}

export const SPH_MONTHLY_SERVICES: SphMonthlyServiceDefinition[] = [
  {
    key: 'accounting',
    defaultSystemServiceId: 'srv-nd-02',
    nameId: 'Jasa Akuntansi Bulanan',
    shortNameId: 'Jasa Akuntansi',
    nameEn: 'Monthly Accounting Services',
    shortNameEn: 'Accounting Services',
    unitType: 'journal',
    usesFatMatrix: true,
    fallbackDefaultPrice: 999_000,
    scopeItems: [
      { idText: 'Melakukan analisis transaksi bisnis.', enText: 'Analyze business transactions.' },
      {
        idText: 'Membuat rekapitulasi histori transaksi bisnis.',
        enText: 'Compile summaries of business transaction history.',
      },
      {
        idText: 'Menyiapkan dokumen lampiran jurnal akuntansi.',
        enText: 'Prepare supporting documents for accounting journal entries.',
      },
      {
        idText: 'Melakukan entri jurnal pada sistem akuntansi.',
        enText: 'Record journal entries in the accounting system.',
      },
      {
        idText: 'Melakukan monitoring buku besar pada sistem akuntansi.',
        enText: 'Monitor the general ledger in the accounting system.',
      },
      {
        idText: 'Menyajikan laporan posisi keuangan/neraca.',
        enText: 'Present the statement of financial position (balance sheet).',
      },
      {
        idText: 'Menyajikan laporan laba rugi bulanan.',
        enText: 'Present the monthly income statement.',
      },
      {
        idText: 'Menyajikan laporan perubahan ekuitas.',
        enText: 'Present the statement of changes in equity.',
      },
      {
        idText: 'Membuat catatan kendala/permasalahan pelaporan.',
        enText: 'Document reporting constraints and issues.',
      },
      {
        idText: 'Membuat dokumentasi/arsip laporan keuangan.',
        enText: 'Maintain financial statement documentation and records.',
      },
    ],
  },
  {
    key: 'tax',
    defaultSystemServiceId: 'srv-nd-01',
    nameId: 'Jasa Perpajakan Bulanan',
    shortNameId: 'Jasa Perpajakan',
    nameEn: 'Monthly Tax Services',
    shortNameEn: 'Tax Services',
    unitType: 'transaction',
    usesFatMatrix: true,
    fallbackDefaultPrice: 999_000,
    scopeItems: [
      {
        idText: 'Melakukan analisis aspek pajak transaksi bisnis.',
        enText: 'Analyze the tax aspects of business transactions.',
      },
      {
        idText: 'Menghitung PPh Pasal 21/26, 23, dan 4 ayat (2).',
        enText: 'Calculate Income Tax (PPh) under Articles 21/26, 23, and 4(2).',
      },
      {
        idText: 'Membuat e-Bupot PPh Pasal 21/26, 23, dan 4 ayat (2).',
        enText: 'Prepare e-Bupot withholding slips for PPh Articles 21/26, 23, and 4(2).',
      },
      {
        idText: 'Membuat faktur pajak atas penjualan (khusus PKP).',
        enText: 'Issue VAT invoices on sales (for VAT-registered entrepreneurs only).',
      },
      {
        idText: 'Membuat ID Billing pajak yang harus dibayar.',
        enText: 'Generate ID Billing codes for taxes payable.',
      },
      {
        idText: 'Menyusun dan melaporkan SPT Masa PPh Pasal 21/26.',
        enText: 'Prepare and file monthly PPh Article 21/26 tax returns.',
      },
      {
        idText: 'Menyusun dan melaporkan SPT Masa PPh Unifikasi.',
        enText: 'Prepare and file monthly Unified PPh tax returns.',
      },
      {
        idText: 'Menyusun dan melaporkan SPT Masa PPN (khusus PKP).',
        enText: 'Prepare and file monthly VAT returns (for VAT-registered entrepreneurs only).',
      },
      {
        idText: 'Membuat kertas kerja ekualisasi pajak.',
        enText: 'Prepare tax equalization working papers.',
      },
      {
        idText: 'Membuat dokumentasi/arsip perpajakan.',
        enText: 'Maintain tax documentation and records.',
      },
    ],
  },
  {
    key: 'finance',
    defaultSystemServiceId: 'srv-nd-03',
    nameId: 'Jasa Keuangan Bulanan',
    shortNameId: 'Jasa Keuangan',
    nameEn: 'Monthly Finance Services',
    shortNameEn: 'Finance Services',
    unitType: 'transaction',
    usesFatMatrix: true,
    fallbackDefaultPrice: 999_000,
    scopeItems: [
      {
        idText: 'Menyiapkan kebutuhan administrasi tagihan.',
        enText: 'Handle billing administration requirements.',
      },
      {
        idText: 'Membuat invoice/tagihan penjualan kepada customer.',
        enText: 'Issue sales invoices to customers.',
      },
      {
        idText: 'Membayar tagihan supplier atau vendor.',
        enText: 'Pay supplier and vendor invoices.',
      },
      {
        idText: 'Membayar gaji, pembelian barang dan/atau jasa.',
        enText: 'Process payroll and payments for goods and/or services.',
      },
      {
        idText: 'Membuat rekapitulasi keluar masuk kas dan bank.',
        enText: 'Prepare summaries of cash and bank inflows and outflows.',
      },
      {
        idText: 'Mengelola piutang usaha dan utang usaha.',
        enText: 'Manage accounts receivable and accounts payable.',
      },
      {
        idText: 'Mengelola data penjualan dan pembelian.',
        enText: 'Manage sales and purchase data.',
      },
      {
        idText: 'Membuat pengajuan anggaran operasional bulanan.',
        enText: 'Prepare monthly operating budget proposals.',
      },
      {
        idText: 'Membuat laporan realisasi anggaran operasional bulanan.',
        enText: 'Prepare monthly operating budget realization reports.',
      },
      {
        idText: 'Melakukan dokumentasi/arsip keuangan.',
        enText: 'Maintain financial documentation and records.',
      },
    ],
  },
  {
    key: 'legal',
    defaultSystemServiceId: 'srv-nd-06',
    nameId: 'Jasa Hukum Bulanan',
    shortNameId: 'Jasa Hukum / Legal',
    nameEn: 'Monthly Legal Services',
    shortNameEn: 'Legal Services',
    unitType: 'package',
    usesFatMatrix: false,
    fallbackDefaultPrice: 7_500_000,
    scopeItems: [
      {
        idText: 'Melakukan review dokumen bisnis dan kontrak komersial perusahaan.',
        enText: 'Review corporate business documents and commercial contracts.',
      },
      {
        idText: 'Menyusun draf perjanjian kerja sama, MOU, dan kontrak kerja.',
        enText: 'Draft cooperation agreements, MOUs, and employment contracts.',
      },
      {
        idText: 'Memberikan pendapat hukum (legal opinion) atas persoalan operasional usaha.',
        enText: 'Provide legal opinions on operational business matters.',
      },
      {
        idText: 'Melakukan pendampingan penyusunan surat somasi dan tanggapan somasi.',
        enText: 'Assist in drafting legal warning letters (somasi) and formal responses.',
      },
      {
        idText: 'Memberikan konsultasi kepatuhan hukum korporasi dan ketenagakerjaan.',
        enText: 'Provide corporate and employment legal compliance advisory.',
      },
      {
        idText: 'Mendampingi penelaahan perizinan usaha dan dokumentasi legalitas perusahaan.',
        enText: 'Assist in reviewing business licenses and corporate legal documentation.',
      },
    ],
  },
  {
    key: 'other',
    defaultSystemServiceId: 'srv-nd-07',
    nameId: 'Jasa Konsultasi Lainnya Bulanan',
    shortNameId: 'Jasa Lainnya',
    nameEn: 'Other Monthly Advisory Services',
    shortNameEn: 'Other Advisory Services',
    unitType: 'package',
    usesFatMatrix: false,
    fallbackDefaultPrice: 5_000_000,
    scopeItems: [
      {
        idText: 'Memberikan layanan konsultasi dan pendampingan bulanan sesuai kebutuhan spesifik perusahaan.',
        enText: 'Provide monthly advisory and assistance tailored to the company’s specific needs.',
      },
      {
        idText: 'Melakukan evaluasi dan pelaporan berkala atas ruang lingkup pekerjaan yang disepakati.',
        enText: 'Conduct periodic evaluations and reporting on the agreed scope of work.',
      },
      {
        idText: 'Menyusun dokumentasi dan rekomendasi tindak lanjut bagi manajemen.',
        enText: 'Prepare documentation and actionable recommendations for management.',
      },
    ],
  },
];

export function getSphServiceDefinition(key: SphServiceKey): SphMonthlyServiceDefinition {
  return SPH_MONTHLY_SERVICES.find((s) => s.key === key) || SPH_MONTHLY_SERVICES[0];
}

export function getTurnoverTierOption(id: SphTurnoverTierId): SphTurnoverTierOption {
  return SPH_TURNOVER_TIERS.find((t) => t.id === id) || SPH_TURNOVER_TIERS[0];
}

export function getVolumeTierOption(id: SphVolumeTierId): SphVolumeTierOption {
  return SPH_VOLUME_TIERS.find((v) => v.id === id) || SPH_VOLUME_TIERS[0];
}

export function buildSphServiceSelection(
  key: SphServiceKey,
  turnoverTierId: SphTurnoverTierId,
  volumeTierId: SphVolumeTierId,
  systemServices?: ServiceItem[],
  customMonthlyPrice?: number
): SphServiceSelection {
  const def = getSphServiceDefinition(key);
  const turnover = getTurnoverTierOption(turnoverTierId);
  const volume = getVolumeTierOption(volumeTierId);

  const matchedSystemService = (systemServices || []).find((s) => {
    if (def.defaultSystemServiceId && s.id === def.defaultSystemServiceId) return true;
    const n = (s.name || '').toLowerCase();
    if (key === 'accounting') return n.includes('akuntansi') && n.includes('bulanan') && !n.includes('perpajakan') && !n.includes('keuangan');
    if (key === 'tax') return n.includes('perpajakan') && n.includes('bulanan') && !n.includes('akuntansi') && !n.includes('keuangan');
    if (key === 'finance') return n.includes('keuangan') && n.includes('bulanan') && !n.includes('akuntansi') && !n.includes('perpajakan');
    if (key === 'legal') return n.includes('hukum') && n.includes('bulanan');
    if (key === 'other') return n.includes('lainnya') && n.includes('bulanan');
    return false;
  });

  let defaultMonthlyPrice = def.fallbackDefaultPrice;
  let isNegotiation = false;

  if (def.usesFatMatrix) {
    const lookedUp = lookupFatMonthlyPrice(turnoverTierId, volumeTierId);
    defaultMonthlyPrice = lookedUp.price;
    isNegotiation = lookedUp.isNegotiation;
  } else {
    defaultMonthlyPrice = matchedSystemService?.defaultPrice || def.fallbackDefaultPrice;
    isNegotiation = false;
  }

  const resolvedPrice =
    typeof customMonthlyPrice === 'number' && Number.isFinite(customMonthlyPrice) && customMonthlyPrice >= 0
      ? Math.round(customMonthlyPrice)
      : defaultMonthlyPrice;

  const isJournal = def.unitType === 'journal';
  const isPackage = def.unitType === 'package';

  return {
    serviceKey: key,
    serviceId: matchedSystemService?.id || def.defaultSystemServiceId,
    serviceNameId: def.shortNameId,
    serviceNameEn: def.shortNameEn,
    unitType: def.unitType,
    turnoverTierId,
    turnoverLabelId: turnover.labelId,
    turnoverLabelEn: turnover.labelEn,
    volumeTierId,
    volumeLabelId: isPackage
      ? 'Retainer Bulanan'
      : isJournal
        ? volume.labelJournalId
        : volume.labelTransactionId,
    volumeLabelEn: isPackage
      ? 'Monthly Retainer'
      : isJournal
        ? volume.labelJournalEn
        : volume.labelTransactionEn,
    defaultMonthlyPrice,
    monthlyPrice: resolvedPrice,
    isNegotiation,
    scopeItems: def.scopeItems.map((i) => ({ ...i })),
  };
}

export function formatSphCurrencyId(amount: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return `Rp${n.toLocaleString('id-ID')}`;
}

export function formatSphCurrencyEn(amount: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return `IDR ${n.toLocaleString('en-US')}`;
}

// Indonesian number-to-words (Terbilang)
const ID_WORDS = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
];

function terbilangCoreId(n: number): string {
  if (n < 12) return ID_WORDS[n];
  if (n < 20) return `${terbilangCoreId(n - 10)} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return `${ID_WORDS[tens]} puluh${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 200) {
    const rem = n - 100;
    return `seratus${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    return `${ID_WORDS[hundreds]} ratus${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 2000) {
    const rem = n - 1000;
    return `seribu${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    return `${terbilangCoreId(thousands)} ribu${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rem = n % 1_000_000;
    return `${terbilangCoreId(millions)} juta${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  if (n < 1_000_000_000_000) {
    const billions = Math.floor(n / 1_000_000_000);
    const rem = n % 1_000_000_000;
    return `${terbilangCoreId(billions)} miliar${rem ? ` ${terbilangCoreId(rem)}` : ''}`;
  }
  return String(n);
}

export function terbilangRupiahId(amount: number): string {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n === 0) return 'nol rupiah';
  return `${terbilangCoreId(n).replace(/\s+/g, ' ').trim()} rupiah`;
}

export function numberWordId(num: number): string {
  const n = Math.max(0, Math.round(Number(num) || 0));
  if (n === 0) return 'nol';
  return terbilangCoreId(n).replace(/\s+/g, ' ').trim();
}

// English number-to-words
const EN_ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function englishUnder1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${EN_ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    const ten = EN_TENS[Math.floor(n / 10)];
    const one = EN_ONES[n % 10];
    parts.push(one ? `${ten}-${one}` : ten);
  } else if (n > 0) {
    parts.push(EN_ONES[n]);
  }
  return parts.join(' ');
}

export function numberWordEn(num: number): string {
  const n = Math.max(0, Math.round(Number(num) || 0));
  if (n === 0) return 'zero';
  const scales: Array<[number, string]> = [
    [1_000_000_000, 'billion'],
    [1_000_000, 'million'],
    [1_000, 'thousand'],
  ];
  let rem = n;
  const parts: string[] = [];
  for (const [unit, label] of scales) {
    if (rem >= unit) {
      parts.push(`${englishUnder1000(Math.floor(rem / unit))} ${label}`);
      rem %= unit;
    }
  }
  if (rem > 0) parts.push(englishUnder1000(rem));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function terbilangRupiahEn(amount: number): string {
  return `${numberWordEn(amount)} rupiah`;
}

export function composeSphBilingualTitles(services: SphServiceSelection[]): {
  subjectId: string;
  subjectEn: string;
  openingPhraseId: string;
  openingPhraseEn: string;
} {
  const list = services.length > 0 ? services : [];
  if (list.length === 0) {
    return {
      subjectId: 'Penawaran Harga Jasa Bulanan',
      subjectEn: 'Monthly Service Fee Quotation',
      openingPhraseId: 'jasa konsultasi bulanan',
      openingPhraseEn: 'monthly advisory services',
    };
  }

  const labelMapId: Record<SphServiceKey, string> = {
    accounting: 'Akuntansi',
    tax: 'Perpajakan',
    finance: 'Keuangan',
    legal: 'Hukum',
    other: 'Konsultasi Lainnya',
  };
  const labelMapEn: Record<SphServiceKey, string> = {
    accounting: 'Accounting',
    tax: 'Tax',
    finance: 'Finance',
    legal: 'Legal',
    other: 'Advisory',
  };

  const namesId = list.map((s) => labelMapId[s.serviceKey] || s.serviceNameId.replace(/^Jasa\s+/i, ''));
  const namesEn = list.map((s) => labelMapEn[s.serviceKey] || s.serviceNameEn.replace(/\s+Services$/i, ''));

  const joinId =
    namesId.length === 1
      ? namesId[0]
      : namesId.length === 2
        ? `${namesId[0]} dan ${namesId[1]}`
        : `${namesId.slice(0, -1).join(', ')}, dan ${namesId[namesId.length - 1]}`;

  const joinEn =
    namesEn.length === 1
      ? namesEn[0]
      : namesEn.length === 2
        ? `${namesEn[0]} and ${namesEn[1]}`
        : `${namesEn.slice(0, -1).join(', ')}, and ${namesEn[namesEn.length - 1]}`;

  return {
    subjectId: `Penawaran Harga Jasa ${joinId} Bulanan`,
    subjectEn: `Monthly ${joinEn} Service Fee Quotation`,
    openingPhraseId: `jasa ${joinId.toLowerCase()} bulanan`,
    openingPhraseEn: `monthly ${joinEn.toLowerCase()} services`,
  };
}
