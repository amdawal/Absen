import React, { useState, useRef, useEffect } from 'react';
import { Building2, Search, Check, ChevronDown, X, Sparkles } from 'lucide-react';
import { SAMARINDA_UNIT_KERJA, SamarindaUnit } from '../data/samarindaUnits';

interface UnitKerjaComboboxProps {
  value: string;
  onChange: (unitName: string) => void;
  required?: boolean;
  error?: string | null;
}

export const UnitKerjaCombobox: React.FC<UnitKerjaComboboxProps> = ({
  value,
  onChange,
  required = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = ['Semua', 'Dinas', 'Badan', 'Kecamatan', 'Sekretariat & Pengawasan', 'Layanan Kesehatan'];

  const filteredUnits = SAMARINDA_UNIT_KERJA.filter((unit) => {
    const matchesSearch =
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit.code && unit.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'Semua' || unit.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelect = (unitName: string) => {
    onChange(unitName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} id="unit-kerja-combobox-wrapper">
      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-700" />
          Unit Kerja / OPD Kota Samarinda {required && <span className="text-rose-500">*</span>}
        </span>
        <span className="text-[10px] text-slate-400 font-normal">
          {SAMARINDA_UNIT_KERJA.length} Unit Terdaftar
        </span>
      </label>

      {/* Main Trigger Box */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full min-h-[42px] px-3.5 py-2 bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? 'bg-white border-blue-600 ring-2 ring-blue-100 shadow-xs'
            : error
            ? 'border-rose-300 bg-rose-50/50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-white'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          {value ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {value}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Pilih / Cari Unit Kerja di Kota Samarinda...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-100"
          id="unit-kerja-dropdown-panel"
        >
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama dinas, badan, kecamatan, atau singkatan..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(cat);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List of Units */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1">
            {filteredUnits.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-400">
                Unit kerja &ldquo;{searchQuery}&rdquo; tidak ditemukan.
              </div>
            ) : (
              filteredUnits.map((unit) => {
                const isSelected = value === unit.name;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleSelect(unit.name)}
                    className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs leading-snug">{unit.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                          {unit.category}
                        </span>
                        {unit.code && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {unit.code}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
