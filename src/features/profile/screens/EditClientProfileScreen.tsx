import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Building2, Check, FileText, Globe, MapPin, RefreshCw, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { profileGetAPI, profilePutAPI } from '../../../api/profileAPI';
import type { UpdateClientProfileDto } from '../../../types/models/Profile';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/edit-client-profile-screen.css';

type ValidationErrors = Partial<Record<keyof UpdateClientProfileDto | 'submit', string>>;
type CompanySizeOption = { id: number; name: string };

const emptyForm: UpdateClientProfileDto = {
  companyName: '',
  companyWebsite: '',
  companySize: 0,
  industry: '',
  companyDescription: '',
  location: '',
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function EditClientProfileScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation();
  const mountedRef = useRef(true);
  const [formData, setFormData] = useState<UpdateClientProfileDto>(emptyForm);
  const [companySizes, setCompanySizes] = useState<CompanySizeOption[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    const [profileResponse, sizesResponse, industriesResponse] = await Promise.all([
      profileGetAPI.getMyClientProfile(),
      profileGetAPI.getCompanySizes(),
      profileGetAPI.getIndustries(),
    ]);

    if (!mountedRef.current) return;

    if (!profileResponse.success || !profileResponse.data) {
      setLoadError(profileResponse.message || t('profile.edit.loadError'));
      setIsLoading(false);
      return;
    }
    if (!sizesResponse.success || !sizesResponse.data || !industriesResponse.success || !industriesResponse.data) {
      setLoadError(sizesResponse.message || industriesResponse.message || t('profile.edit.lookupError'));
      setIsLoading(false);
      return;
    }

    const profile = profileResponse.data;
    setCompanySizes(sizesResponse.data);
    setIndustries(industriesResponse.data);
    setFormData({
      companyName: profile.companyName || '',
      companyWebsite: profile.companyWebsite || '',
      companySize: profile.companySize ?? sizesResponse.data[0]?.id ?? 0,
      industry: profile.industry || '',
      companyDescription: profile.companyDescription || '',
      location: profile.location || '',
    });
    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const setField = <K extends keyof UpdateClientProfileDto>(key: K, value: UpdateClientProfileDto[K]) => {
    setFormData(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      delete next.submit;
      return next;
    });
    setIsSaved(false);
  };

  const validate = (): boolean => {
    const next: ValidationErrors = {};
    const companyName = formData.companyName.trim();
    const industry = formData.industry.trim();
    const location = formData.location.trim();
    const website = formData.companyWebsite?.trim() || '';
    const description = formData.companyDescription?.trim() || '';

    if (!companyName) next.companyName = t('profile.edit.required');
    else if (companyName.length > 300) next.companyName = t('profile.edit.maxLength', { count: 300 });
    if (!industry) next.industry = t('profile.edit.required');
    else if (industry.length > 300) next.industry = t('profile.edit.maxLength', { count: 300 });
    if (!location) next.location = t('profile.edit.required');
    else if (location.length > 300) next.location = t('profile.edit.maxLength', { count: 300 });
    if (!companySizes.some(option => option.id === formData.companySize)) {
      next.companySize = t('profile.edit.invalidCompanySize');
    }
    if (website.length > 500) next.companyWebsite = t('profile.edit.maxLength', { count: 500 });
    else if (website && !isHttpUrl(website)) next.companyWebsite = t('profile.edit.invalidWebsite');
    if (description.length > 2000) next.companyDescription = t('profile.edit.maxLength', { count: 2000 });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || !validate()) return;

    setIsSaving(true);
    setIsSaved(false);
    const response = await profilePutAPI.updateClientProfile({
      companyName: formData.companyName.trim(),
      companyWebsite: formData.companyWebsite?.trim() || undefined,
      companySize: formData.companySize,
      industry: formData.industry.trim(),
      companyDescription: formData.companyDescription?.trim() || undefined,
      location: formData.location.trim(),
    });

    if (!mountedRef.current) return;
    setIsSaving(false);
    if (!response.success) {
      setErrors({ submit: response.message || t('profile.edit.saveError') });
      return;
    }

    setIsSaved(true);
    window.setTimeout(() => {
      if (mountedRef.current) navigate(`/profile/client/${user!.id}`);
    }, 700);
  };

  const cancel = () => navigate(`/profile/client/${user!.id}`);

  if (isLoading) {
    return <AppLayout><div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">{t('profile.edit.loading')}</div></AppLayout>;
  }

  if (loadError) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-red-500">{loadError}</p>
          <button type="button" onClick={() => void loadProfile()} className="btn-cyan px-5 py-3 rounded-xl flex items-center gap-2">
            <RefreshCw size={16} /> {t('profile.edit.retry')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const errorFor = (key: keyof UpdateClientProfileDto) => errors[key] && <p className="edit-client-profile-form-error">{errors[key]}</p>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="edit-client-profile-header mb-8">
          <button type="button" onClick={cancel} className="p-3 rounded-xl hover:bg-surface border border-transparent hover:border-border cursor-pointer"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="edit-client-profile-header-title text-2xl font-bold">{t('profile.editClientProfile')}</h1>
            <p className="text-sm text-secondary mt-1">{t('profile.edit.clientSubtitle')}</p>
          </div>
        </div>

        {isSaved && <div className="edit-client-profile-success-message flex items-center gap-3 p-4 rounded-xl border mb-6"><Check size={18} /><span>{t('profile.operationSuccess')}</span></div>}
        {errors.submit && <div role="alert" className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 mb-6"><X size={18} /><span>{errors.submit}</span></div>}

        <form onSubmit={handleSubmit} className="glass-card edit-client-profile-section p-6 space-y-7">
          <div>
            <h2 className="edit-client-profile-section-title font-bold border-b border-border pb-3 mb-6">{t('profile.companyDetails')}</h2>
            <div className="edit-client-profile-form-grid">
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">{t('profile.companyName')} *</label>
                <div className="edit-client-profile-input-wrapper"><input value={formData.companyName} onChange={e => setField('companyName', e.target.value)} maxLength={300} className="edit-client-profile-form-input" /><Building2 size={16} className="edit-client-profile-input-icon" /></div>
                {errorFor('companyName')}
              </div>
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">{t('profile.edit.companySize')} *</label>
                <select value={formData.companySize} onChange={e => setField('companySize', Number(e.target.value))} className="edit-client-profile-form-select w-full">
                  {companySizes.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                {errorFor('companySize')}
              </div>
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">{t('profile.industry')} *</label>
                <select value={formData.industry} onChange={e => setField('industry', e.target.value)} className="edit-client-profile-form-select w-full">
                  <option value="">{t('profile.edit.selectIndustry')}</option>
                  {industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}
                </select>
                {errorFor('industry')}
              </div>
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">{t('profile.websiteUrl')}</label>
                <div className="edit-client-profile-input-wrapper"><input type="url" value={formData.companyWebsite || ''} onChange={e => setField('companyWebsite', e.target.value)} maxLength={500} className="edit-client-profile-form-input" placeholder="https://example.com" /><Globe size={16} className="edit-client-profile-input-icon" /></div>
                {errorFor('companyWebsite')}
              </div>
              <div className="edit-client-profile-form-group md:col-span-2">
                <label className="edit-client-profile-form-label">{t('profile.edit.location')} *</label>
                <div className="edit-client-profile-input-wrapper"><input value={formData.location} onChange={e => setField('location', e.target.value)} maxLength={300} className="edit-client-profile-form-input" /><MapPin size={16} className="edit-client-profile-input-icon" /></div>
                {errorFor('location')}
              </div>
              <div className="edit-client-profile-form-group md:col-span-2">
                <label className="edit-client-profile-form-label">{t('profile.companyDescription')}</label>
                <div className="edit-client-profile-input-wrapper !items-start"><textarea value={formData.companyDescription || ''} onChange={e => setField('companyDescription', e.target.value)} maxLength={2000} rows={7} className="edit-client-profile-form-textarea w-full" /><FileText size={16} className="edit-client-profile-input-icon mt-3" /></div>
                <div className="text-xs text-muted-foreground text-right mt-1">{formData.companyDescription?.length || 0}/2000</div>
                {errorFor('companyDescription')}
              </div>
            </div>
          </div>

          <div className="edit-client-profile-actions flex gap-3 justify-end">
            <button type="button" onClick={cancel} className="px-6 py-3 rounded-xl border border-border cursor-pointer">{t('common.cancel')}</button>
            <button type="submit" disabled={isSaving} className="btn-cyan px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {isSaving ? t('profile.savingChanges') : <><Check size={16} />{t('profile.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
