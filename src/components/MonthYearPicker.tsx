import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

interface MonthYearPickerProps {
  label: string;
  selectedMonth: number; // 1 - 12
  selectedYear: number;
  onChange: (month: number, year: number, formattedString: string) => void;
  minYear?: number;
  maxYear?: number;
  isDarkTheme?: boolean;
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  label,
  selectedMonth,
  selectedYear,
  onChange,
  minYear = 2022,
  maxYear = 2032,
  isDarkTheme = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(selectedYear);
  }, [selectedYear]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthIndex: number) => {
    const monthNum = monthIndex + 1;
    const formatted = `${MONTH_NAMES_ID[monthIndex]} ${viewYear}`;
    onChange(monthNum, viewYear, formatted);
    setIsOpen(false);
  };

  const formattedValue = `${MONTH_NAMES_ID[selectedMonth - 1] || 'Januari'} ${selectedYear}`;

  return (
    <div className="relative" ref={pickerRef}>
      <label className={`block text-[11px] font-semibold mb-1 ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
      </label>

      {/* Trigger Button (Click to open Month-Year Popup) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left ${
          isDarkTheme
            ? 'bg-slate-900 border-slate-700 text-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500'
            : 'bg-white border-slate-300 text-slate-900 hover:border-blue-600 focus:ring-2 focus:ring-blue-600 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className="font-semibold">{formattedValue}</span>
        </div>
        <span className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
          Pilih ▼
        </span>
      </button>

      {/* Popover Month & Year Selector */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-50 w-64 p-3 rounded-xl shadow-2xl border animate-in fade-in zoom-in-95 ${
            isDarkTheme
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Year Header Navigator */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.max(minYear, y - 1))}
              className={`p-1 rounded-lg transition-colors ${
                isDarkTheme ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Tahun Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Year Select Dropdown */}
            <div className="flex items-center gap-1 font-bold text-xs">
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border outline-none cursor-pointer ${
                  isDarkTheme
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-900'
                }`}
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
                  <option key={y} value={y} className={isDarkTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViewYear((y) => Math.min(maxYear, y + 1))}
              className={`p-1 rounded-lg transition-colors ${
                isDarkTheme ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Tahun Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12 Months Grid (Click to Select) */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT_ID.map((mShort, idx) => {
              const isSelected = selectedMonth === idx + 1 && selectedYear === viewYear;
              return (
                <button
                  key={mShort}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 px-1 text-xs font-medium rounded-lg text-center transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isDarkTheme
                      ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                      : 'hover:bg-blue-50 text-slate-700 hover:text-blue-900'
                  }`}
                >
                  {mShort}
                </button>
              );
            })}
          </div>

          {/* Quick Helper */}
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>
              Klik bulan untuk memilih
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-blue-500 hover:underline font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
