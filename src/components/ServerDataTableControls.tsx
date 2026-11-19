import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
export { TableSkeletonRows } from './SkeletonLoader';

const INDO_MONTH_MAP: Record<string, number> = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mar: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  agu: 7, agt: 7, agustus: 7, aug: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9,
  nov: 10, november: 10,
  des: 11, dec: 11, desember: 11,
};

export function parseClientRecordTimestamp(
  dateStr?: string,
  idStr?: string,
  fallbackOrder = 0
): number {
  let idEpoch = 0;
  if (idStr) {
    const m = /(\d{12,14})/.exec(String(idStr));
    if (m) idEpoch = Number(m[1]);
  }
  if (!dateStr) return idEpoch || fallbackOrder;
  const s = String(dateStr).trim();
  if (s.toLowerCase().includes('baru saja')) {
    return idEpoch || Date.now() + fallbackOrder;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
      return parsed + (idEpoch ? idEpoch % 86400000 : fallbackOrder);
    }
  }
  const dmY = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/.exec(s);
  if (dmY) {
    const day = Number(dmY[1]);
    const monthKey = dmY[2].toLowerCase();
    const year = Number(dmY[3]);
    const monthIdx = INDO_MONTH_MAP[monthKey] ?? INDO_MONTH_MAP[monthKey.slice(0, 3)];
    if (monthIdx !== undefined) {
      const base = new Date(year, monthIdx, day).getTime();
      return base + (idEpoch ? idEpoch % 86400000 : fallbackOrder);
    }
  }
  const fallbackParsed = Date.parse(s);
  if (!Number.isNaN(fallbackParsed)) {
    return fallbackParsed + (idEpoch ? idEpoch % 86400000 : fallbackOrder);
  }
  return idEpoch || fallbackOrder;
}

export interface ServerDataTableMeta {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  totalAll: number;
}

interface UseServerDataTableOptions<T> {
  resource: string;
  fallbackItems: T[];
  defaultPerPage?: number;
  externalSearch?: string;
  extraParams?: Record<string, string | number | undefined>;
  dependencyKey?: string | number;
}

export function useServerDataTable<T>({
  resource,
  fallbackItems,
  defaultPerPage = 10,
  externalSearch,
  extraParams,
  dependencyKey,
}: UseServerDataTableOptions<T>) {
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(defaultPerPage);
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [serverRows, setServerRows] = useState<T[] | null>(null);
  const [serverMeta, setServerMeta] = useState<ServerDataTableMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const activeSearch = externalSearch !== undefined ? externalSearch : internalSearch;

  const extraParamsJson = JSON.stringify(extraParams || {});

  useEffect(() => {
    setPage(1);
  }, [activeSearch, perPage, extraParamsJson]);

  const fetchServerPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('perPage', String(perPage));
      if (activeSearch.trim()) {
        qs.set('search', activeSearch.trim());
      }
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
          if (v !== undefined && v !== null && String(v) !== '') {
            qs.set(k, String(v));
          }
        }
      }
      const res = await fetch(`/api/datatables/${resource}?${qs.toString()}`, {
        headers: { 'x-skip-crud-alert': 'true' },
      });
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data) && json.meta) {
        setServerRows(json.data);
        setServerMeta(json.meta);
      }
    } catch {
      // Fallback handled automatically below
    } finally {
      setIsLoading(false);
    }
  }, [resource, page, perPage, activeSearch, extraParamsJson]);

  useEffect(() => {
    fetchServerPage();
  }, [fetchServerPage, dependencyKey, fallbackItems.length]);

  const fallbackResult = useMemo(() => {
    const totalItems = fallbackItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * perPage;
    return {
      rows: fallbackItems.slice(startIdx, startIdx + perPage),
      meta: {
        page: safePage,
        perPage,
        totalItems,
        totalPages,
        totalAll: totalItems,
      },
    };
  }, [fallbackItems, page, perPage]);

  // If fallbackItems was updated locally or server response matches current length, keep UI crisp
  const useFallback =
    !serverRows ||
    !serverMeta ||
    (fallbackItems.length !== serverMeta.totalItems && !activeSearch.trim());

  const resolvedMeta = useFallback ? fallbackResult.meta : serverMeta!;
  const resolvedRows = useFallback ? fallbackResult.rows : serverRows!;

  return {
    rows: resolvedRows,
    meta: resolvedMeta,
    page: resolvedMeta.page,
    perPage,
    setPage,
    setPerPage,
    search: activeSearch,
    setSearch: setInternalSearch,
    isLoading,
    refresh: fetchServerPage,
  };
}

interface ServerDataTableTopBarProps {
  perPage: number;
  onPerPageChange: (next: number) => void;
  perPageOptions?: number[];
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  rightSlot?: React.ReactNode;
  unitLabel?: string;
}

export const ServerDataTableTopBar: React.FC<ServerDataTableTopBarProps> = ({
  perPage,
  onPerPageChange,
  perPageOptions = [10, 25, 50, 100],
  search = '',
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  hideSearch = false,
  isLoading = false,
  onRefresh,
  rightSlot,
  unitLabel = 'baris',
}) => {
  return (
    <div className="px-4 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 text-slate-600">
        <span className="font-medium">Tampilkan</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
        >
          {perPageOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="font-medium">{unitLabel} per halaman</span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Muat ulang data dari server"
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        {rightSlot}
        {!hideSearch && onSearchChange && (
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-800"
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface ServerDataTableFooterProps {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  unitLabel?: string;
}

export const ServerDataTableFooter: React.FC<ServerDataTableFooterProps> = ({
  page,
  perPage,
  totalItems,
  totalPages,
  onPageChange,
  unitLabel = 'data',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endItem = Math.min(safePage * perPage, totalItems);

  const visiblePages = Array.from({ length: safeTotalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === safeTotalPages || Math.abs(p - safePage) <= 1
  );

  return (
    <div className="px-4 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
      <div>
        Menampilkan{' '}
        <strong className="text-slate-900 font-mono">
          {startItem}–{endItem}
        </strong>{' '}
        dari <strong className="text-slate-900 font-mono">{totalItems}</strong> {unitLabel}{' '}
        <span className="text-slate-400 hidden sm:inline">
          (Halaman {safePage} dari {safeTotalPages})
        </span>
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 cursor-pointer"
        >
          « Sebelumnya
        </button>

        {visiblePages.map((p, idx, arr) => (
          <React.Fragment key={p}>
            {idx > 0 && arr[idx - 1] !== p - 1 && (
              <span className="px-1 text-slate-400">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                p === safePage
                  ? 'bg-[#092147] text-amber-300 border border-amber-400/40 shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}

        <button
          type="button"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 cursor-pointer"
        >
          Berikutnya »
        </button>
      </div>
    </div>
  );
};
