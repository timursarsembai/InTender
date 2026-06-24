import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../Input/Input';

export interface LocationData {
  region: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (address: string, locationData: LocationData | null) => void;
  error?: string;
  required?: boolean;
}

export function LocationAutocomplete({
  label,
  placeholder = 'Введите город, район или область...',
  value,
  onChange,
  error,
  required,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&countrycodes=kz&limit=5`,
      );
      const data = await response.json();
      setSuggestions(data);
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val, null); // Reset location data if manually typing

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchLocation(val);
    }, 500);
  };

  const handleSelect = (suggestion: any) => {
    const addr = suggestion.address;
    const region = addr.state || addr.region || '';
    const district = addr.county || addr.district || '';
    const city =
      addr.city || addr.town || addr.village || addr.settlement || addr.municipality || '';

    // Create a readable address string
    const parts = [city, district, region].filter(Boolean);
    const fullAddress = parts.join(', ');

    setQuery(fullAddress);
    onChange(fullAddress, {
      region,
      district,
      city,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <Input
        label={label}
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        error={error}
        required={required}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
      />
      {loading && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 35,
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          Загрузка...
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            listStyle: 'none',
            padding: '0.5rem 0',
            margin: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(s)}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderBottom:
                  idx < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
