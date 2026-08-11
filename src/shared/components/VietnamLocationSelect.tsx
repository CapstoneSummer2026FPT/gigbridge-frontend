import { useState, useEffect, useMemo } from 'react';
import { Globe, MapPin } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { CustomSelect } from './CustomSelect';

import provinceRaw from '../../features/onboarding/constants/province.json';
import wardRaw from '../../features/onboarding/constants/ward.json';
import './styles/vietnam-location-select.css';

export interface ProvinceItem {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
}

export interface WardItem {
  code: string;
  name: string;
  type: string;
  slug: string;
  name_with_type: string;
  path: string;
  path_with_type: string;
  parent_code: string;
}

export interface VietnamLocationSelectProps {
  value: string;
  onChange: (location: string) => void;
  label?: string;
  showPreview?: boolean;
  className?: string;
}

export function VietnamLocationSelect({
  value,
  onChange,
  label,
  showPreview = true,
  className = '',
}: VietnamLocationSelectProps) {
  const { t } = useTranslation('onboarding');

  // Load & Sort Provinces
  const provincesList = useMemo<ProvinceItem[]>(() => {
    const list = Object.values(provinceRaw) as ProvinceItem[];
    return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, []);

  // Load All Wards
  const allWardsList = useMemo<WardItem[]>(() => {
    return Object.values(wardRaw) as WardItem[];
  }, []);

  const provinceOptions = useMemo(
    () => provincesList.map(p => ({ value: p.code, label: p.name_with_type })),
    [provincesList]
  );

  // Internal selection states
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('12'); // Default TP. HCM
  const [selectedWardCode, setSelectedWardCode] = useState<string>('');

  // Initial sync from external `value` string if available
  useEffect(() => {
    if (!value || !value.trim()) return;

    // Try to find matching ward by path_with_type or path
    const matchedWard = allWardsList.find(w => value.includes(w.name_with_type) || value.includes(w.path));
    if (matchedWard) {
      setSelectedProvinceCode(matchedWard.parent_code);
      setSelectedWardCode(matchedWard.code);
      return;
    }

    // Otherwise try to find matching province by name_with_type or name
    const matchedProvince = provincesList.find(p => value.includes(p.name_with_type) || value.includes(p.name));
    if (matchedProvince) {
      setSelectedProvinceCode(matchedProvince.code);
    }
  }, [value, allWardsList, provincesList]);

  // Wards filtered by current selected province
  const availableWards = useMemo<WardItem[]>(() => {
    if (!selectedProvinceCode) return [];
    return allWardsList
      .filter(w => w.parent_code === selectedProvinceCode)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [allWardsList, selectedProvinceCode]);

  const wardOptions = useMemo(
    () => availableWards.map(w => ({ value: w.code, label: w.name_with_type })),
    [availableWards]
  );

  // Handle Province Selection
  const handleProvinceSelect = (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode);
    const firstWard = allWardsList.find(w => w.parent_code === provinceCode);
    const newWardCode = firstWard ? firstWard.code : '';
    setSelectedWardCode(newWardCode);

    const provinceObj = provincesList.find(p => p.code === provinceCode);
    const wardObj = allWardsList.find(w => w.code === newWardCode);

    let formatted = '';
    if (wardObj && wardObj.path_with_type) {
      formatted = `${wardObj.path_with_type}, Việt Nam`;
    } else if (provinceObj) {
      formatted = `${provinceObj.name_with_type}, Việt Nam`;
    } else {
      formatted = 'Việt Nam';
    }
    onChange(formatted);
  };

  // Handle Ward Selection
  const handleWardSelect = (wardCode: string) => {
    setSelectedWardCode(wardCode);
    const provinceObj = provincesList.find(p => p.code === selectedProvinceCode);
    const wardObj = availableWards.find(w => w.code === wardCode);

    let formatted = '';
    if (wardObj && wardObj.path_with_type) {
      formatted = `${wardObj.path_with_type}, Việt Nam`;
    } else if (provinceObj) {
      formatted = `${provinceObj.name_with_type}, Việt Nam`;
    } else {
      formatted = 'Việt Nam';
    }
    onChange(formatted);
  };

  return (
    <div className={`vls-container ${className}`}>
      <label className="vls-header-label">
        <Globe size={14} />
        <span>{label || t('location.title', { defaultValue: 'Địa điểm làm việc (Việt Nam)' })} *</span>
      </label>

      <div className="vls-grid">
        <div className="vls-field-group">
          <label className="vls-sub-label">
            {t('location.provinceLabel', { defaultValue: 'Tỉnh / Thành phố' })}
          </label>
          <CustomSelect
            value={selectedProvinceCode}
            options={provinceOptions}
            onChange={val => handleProvinceSelect(val)}
            placeholder={t('location.selectProvince', { defaultValue: '-- Chọn Tỉnh / Thành phố --' })}
            searchPlaceholder="Tìm Tỉnh / Thành phố..."
          />
        </div>

        <div className="vls-field-group">
          <label className="vls-sub-label">
            {t('location.wardLabel', { defaultValue: 'Phường / Xã / Thị trấn' })}
          </label>
          <CustomSelect
            value={selectedWardCode}
            options={wardOptions}
            onChange={val => handleWardSelect(val)}
            placeholder={t('location.selectWard', { defaultValue: '-- Chọn Phường / Xã / Thị trấn --' })}
            searchPlaceholder="Tìm Phường / Xã / Thị trấn..."
            disabled={!selectedProvinceCode}
          />
        </div>
      </div>

      {showPreview && value && (
        <div className="vls-preview-box">
          <MapPin size={16} className="vls-preview-icon" />
          <span>{t('location.formattedPreview', { defaultValue: 'Địa điểm hoàn chỉnh:' })} <strong>{value}</strong></span>
        </div>
      )}
    </div>
  );
}

export default VietnamLocationSelect;
