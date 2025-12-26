import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: React.ReactNode;
  options: Option[];
  value: string | string[]; // Single value or array of values
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select...',
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Point 6: Alphabetical Sorting with safety check
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      const labelA = String(a?.label || '');
      const labelB = String(b?.label || '');
      return labelA.localeCompare(labelB);
    });
  }, [options]);

  const filteredOptions = sortedOptions.filter(option => {
    const safeLabel = String(option?.label || '').toLowerCase();
    const safeSearch = String(searchTerm || '').toLowerCase();
    return safeLabel.includes(safeSearch);
  });

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : (value ? [value] : []);
      const newValue = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
    }
    // Point 1: Close dropdown immediately on select
    setIsOpen(false);
  };

  const removeValue = (e: React.MouseEvent, valToRemove: string) => {
    e.stopPropagation();
    if (Array.isArray(value)) {
      onChange(value.filter(v => v !== valToRemove));
    } else {
        onChange('');
    }
  };

  const getDisplayValue = () => {
    if (multiple) {
       const currentValues = Array.isArray(value) ? value : (value && value !== '' ? [value] : []);
       if (currentValues.length === 0) return <span className="text-gray-500">{placeholder}</span>;
       
       return (
         <div className="flex flex-wrap gap-1">
           {currentValues.map(val => {
             const opt = options.find(o => o.value === val);
             return (
               <span key={val} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs flex items-center">
                 {opt ? opt.label : val}
                 <X size={12} className="ml-1 cursor-pointer hover:text-indigo-900" onClick={(e) => removeValue(e, val)} />
               </span>
             );
           })}
         </div>
       );
    } else {
      const selectedOption = options.find(o => o.value === value);
      return selectedOption ? (
        <span className="text-black">{selectedOption.label}</span>
      ) : (
        <span className="text-gray-500">{placeholder}</span>
      );
    }
  };

  return (
    <div className={`space-y-1 relative ${className}`} ref={wrapperRef}>
      {label && <label className="text-sm font-medium text-black block mb-1">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 cursor-pointer flex justify-between items-center min-h-[42px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 overflow-hidden">
          {getDisplayValue()}
        </div>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-white sticky top-0">
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = multiple 
                    ? (Array.isArray(value) && value.includes(option.value))
                    : value === option.value;
                
                return (
                  <div
                    key={option.value}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-black'}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={16} />}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};