import React, { useState, useEffect } from 'react';

/**
 * Base shimmering Skeleton block
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-md',
  style,
  ...props
}) => {
  return (
    <div
      className={`animate-shimmer ${rounded} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

/**
 * Image wrapper with automatic Skeleton Screen while the image is loading
 */
export interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string;
  containerClassName?: string;
  rounded?: string;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt = '',
  className = '',
  skeletonClassName = '',
  containerClassName = '',
  rounded = 'rounded-md',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${rounded} ${containerClassName}`}>
      {!isLoaded && !hasError && (
        <Skeleton
          className={`absolute inset-0 w-full h-full z-10 ${skeletonClassName}`}
          rounded={rounded}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          setIsLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        className={`${rounded} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

/**
 * Skeleton rows for <tbody> in any table component
 */
export interface TableSkeletonRowsProps {
  columns?: number;
  rows?: number;
  colSpan?: number;
}

export const TableSkeletonRows: React.FC<TableSkeletonRowsProps> = ({
  columns = 5,
  rows = 5,
}) => {
  const rowList = Array.from({ length: rows });
  const colList = Array.from({ length: columns });

  return (
    <>
      {rowList.map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-100 last:border-0">
          {colList.map((_, cIdx) => {
            // First column often has avatar + text
            if (cIdx === 0) {
              return (
                <td key={cIdx} className="py-4 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 shrink-0" rounded="rounded-xl" />
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                </td>
              );
            }
            // Last column often has action button
            if (cIdx === columns - 1) {
              return (
                <td key={cIdx} className="py-4 px-4 sm:px-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton className="h-7 w-20" rounded="rounded-lg" />
                  </div>
                </td>
              );
            }
            // Badge / status or numeric columns
            return (
              <td key={cIdx} className="py-4 px-4 sm:px-6">
                <div className="space-y-1">
                  <Skeleton
                    className={`h-3.5 ${
                      cIdx % 2 === 0 ? 'w-24' : 'w-32'
                    }`}
                  />
                  {rIdx % 2 === 0 && <Skeleton className="h-2.5 w-16" />}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

/**
 * Full Dashboard Skeleton (Header, KPI Cards, Chart Area, Reward Banner)
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 sm:w-80" rounded="rounded-lg" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <Skeleton className="h-9 w-48" rounded="rounded-lg" />
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="w-8 h-8" rounded="rounded-lg" />
            </div>
            <Skeleton className="h-7 w-3/4" rounded="rounded-md" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>

      {/* Big Chart Skeleton */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" rounded="rounded-full" />
            <Skeleton className="h-6 w-20" rounded="rounded-full" />
          </div>
        </div>

        {/* Visual Chart Bars Mockup */}
        <div className="h-56 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-100">
          {[40, 65, 30, 85, 55, 95].map((pct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                style={{ height: `${pct}%` }}
                className="w-full max-w-[48px] rounded-t-lg animate-shimmer"
              />
              <Skeleton className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Reward Showcase Skeleton */}
      <div className="rounded-2xl p-5 sm:p-6 bg-amber-500/20 border border-amber-300/40 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-60" rounded="rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[#0B2559]/30 rounded-2xl p-4 text-center border border-slate-200/40 space-y-3"
            >
              <Skeleton className="h-4 w-24 mx-auto" rounded="rounded-full" />
              <Skeleton className="w-12 h-12 mx-auto" rounded="rounded-full" />
              <Skeleton className="h-4 w-28 mx-auto" />
              <Skeleton className="h-3 w-36 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Card Grid Skeleton (for Marketing Tools or Products)
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
        >
          <Skeleton className="h-40 w-full" rounded="rounded-none" />
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" rounded="rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <div className="pt-2 flex items-center justify-between">
              <Skeleton className="h-8 w-24" rounded="rounded-lg" />
              <Skeleton className="h-8 w-24" rounded="rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Table Container Skeleton (Includes Top Bar, Table Headers, Shimmer Rows, and Footer)
 */
export const TableContainerSkeleton: React.FC<{
  title?: string;
  columns?: string[];
  rows?: number;
}> = ({
  title = 'Memuat Data...',
  columns = ['Informasi', 'Kategori', 'Tanggal', 'Status', 'Tindakan'],
  rows = 5,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" rounded="rounded-md" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44" rounded="rounded-lg" />
          <Skeleton className="h-8 w-20" rounded="rounded-lg" />
        </div>
      </div>

      {/* Table Head & Shimmering Rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-4 sm:px-6">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableSkeletonRows columns={columns.length} rows={rows} />
          </tbody>
        </table>
      </div>

      {/* Footer Pagination Skeleton */}
      <div className="p-3.5 sm:px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <Skeleton className="h-3.5 w-36" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-16" rounded="rounded-lg" />
          <Skeleton className="h-7 w-16" rounded="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * Full Page Loading Skeleton (Used when the entire portal initial data is fetching)
 */
export const PageLoadingSkeleton: React.FC<{
  brandName?: string;
  tagline?: string;
}> = ({
  brandName = 'NDTAXANDLAW',
  tagline = 'Kantor Konsultan Pajak & Hukum',
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Executive Navbar Skeleton */}
      <header className="bg-[#092147] text-white border-b border-amber-400/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center animate-pulse">
              <span className="font-extrabold text-amber-300 text-xs">ND</span>
            </div>
            <div>
              <div className="h-4 w-32 bg-white/20 rounded animate-shimmer" />
              <div className="h-2.5 w-44 bg-white/10 rounded mt-1 animate-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-white/10 rounded-lg animate-shimmer hidden sm:block" />
            <div className="w-9 h-9 rounded-full bg-white/20 animate-shimmer" />
          </div>
        </div>

        {/* Navigation Tabs Pill Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/10 py-2 flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-7 w-24 bg-white/10 rounded-lg shrink-0 animate-shimmer"
            />
          ))}
        </div>
      </header>

      {/* Main Content Skeleton Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Dashboard Skeleton Layout */}
        <DashboardSkeleton />
      </main>
    </div>
  );
};
