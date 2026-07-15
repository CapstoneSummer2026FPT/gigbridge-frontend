import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Briefcase, Check, FileText, MapPin, RefreshCw, Tags, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { profileGetAPI, profilePutAPI } from '../../../api/profileAPI';
import { jobAPI } from '../../../api/jobAPI';
import type { UpdateFreelancerProfileDto } from '../../../types/models/Profile';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/edit-freelancer-profile-screen.css';

type FormErrors = Partial<Record<keyof UpdateFreelancerProfileDto | 'submit', string>>;
type AvailabilityOption = { id: number; name: string };

const emptyForm: UpdateFreelancerProfileDto = {
  title: '',
  bio: '',
  availability: 0,
  location: '',
  majorId: '',
  categoryIds: [],
  skillIds: [],
};

export default function EditFreelancerProfileScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation();
  const mountedRef = useRef(true);
  const saveLockRef = useRef(false);
  const [formData, setFormData] = useState<UpdateFreelancerProfileDto>(emptyForm);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [skills, setSkills] = useState<SkillOptionDto[]>([]);
  const [availabilityOptions, setAvailabilityOptions] = useState<AvailabilityOption[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadError, setLoadError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [skillError, setSkillError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCategories = useCallback(async (majorId: string): Promise<CategoryOptionDto[] | null> => {
    if (!majorId) {
      setCategories([]);
      return [];
    }

    setIsLoadingCategories(true);
    setCategoryError('');
    const response = await jobAPI.getCategoriesByMajor(majorId);
    if (!mountedRef.current) return null;
    setIsLoadingCategories(false);
    if (!response.success || !response.data) {
      setCategories([]);
      setCategoryError(response.message || t('profile.edit.categoryLoadError'));
      return null;
    }

    setCategories(response.data);
    return response.data;
  }, [t]);

  const fetchSkills = useCallback(async (
    categoryIds: string[],
    existingSkills: SkillOptionDto[] = [],
  ): Promise<SkillOptionDto[] | null> => {
    setIsLoadingSkills(true);
    setSkillError('');
    const responses = await Promise.all(categoryIds.map(categoryId => jobAPI.getSkillsByCategory(categoryId)));
    if (!mountedRef.current) return null;
    setIsLoadingSkills(false);

    const failedResponse = responses.find(response => !response.success || !response.data);
    if (failedResponse) {
      setSkills(existingSkills);
      setSkillError(failedResponse.message || t('profile.edit.skillLoadError'));
      return null;
    }

    const merged = new Map<string, SkillOptionDto>();
    existingSkills.forEach(skill => merged.set(skill.skillId, skill));
    responses.forEach(response => response.data?.forEach(skill => merged.set(skill.skillId, skill)));
    const options = [...merged.values()].sort((left, right) => left.name.localeCompare(right.name));
    setSkills(options);
    return options;
  }, [t]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    setHasConflict(false);
    setErrors({});
    const [profileResponse, majorsResponse, availabilityResponse] = await Promise.all([
      profileGetAPI.getMyFreelancerProfile(),
      jobAPI.getMajors(),
      profileGetAPI.getAvailabilityStatuses(),
    ]);

    if (!mountedRef.current) return;
    if (!profileResponse.success || !profileResponse.data) {
      setLoadError(profileResponse.message || t('profile.edit.loadError'));
      setIsLoading(false);
      return;
    }
    if (!majorsResponse.success || !majorsResponse.data || !availabilityResponse.success || !availabilityResponse.data) {
      setLoadError(majorsResponse.message || availabilityResponse.message || t('profile.edit.lookupError'));
      setIsLoading(false);
      return;
    }

    const profile = profileResponse.data;
    setMajors(majorsResponse.data);
    setAvailabilityOptions(availabilityResponse.data);
    if (profile.majorId) {
      const loadedCategories = await fetchCategories(profile.majorId);
      if (loadedCategories === null) {
        setIsLoading(false);
        return;
      }
    }
    const existingSkills = (profile.skills || []).map(skill => ({
      skillId: skill.skillId,
      name: skill.skillName,
    }));
    const loadedSkills = await fetchSkills(
      profile.categories?.map(category => category.categoryId) || [],
      existingSkills,
    );
    if (loadedSkills === null) {
      setIsLoading(false);
      return;
    }
    if (!mountedRef.current) return;
    setFormData({
      title: profile.title || '',
      bio: profile.bio || '',
      availability: profile.availability ?? availabilityResponse.data[0]?.id ?? 0,
      location: profile.location || '',
      majorId: profile.majorId || '',
      categoryIds: profile.categories?.map(category => category.categoryId) || [],
      skillIds: profile.skills?.map(skill => skill.skillId) || [],
    });
    setIsLoading(false);
  }, [fetchCategories, fetchSkills, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const setField = <K extends keyof UpdateFreelancerProfileDto>(key: K, value: UpdateFreelancerProfileDto[K]) => {
    setFormData(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      delete next.submit;
      return next;
    });
    setIsSaved(false);
  };

  const changeMajor = async (majorId: string) => {
    setFormData(current => ({ ...current, majorId, categoryIds: [], skillIds: [] }));
    setSkills([]);
    setSkillError('');
    setErrors(current => ({ ...current, majorId: undefined, categoryIds: undefined, skillIds: undefined, submit: undefined }));
    setIsSaved(false);
    await fetchCategories(majorId);
  };

  const toggleCategory = async (categoryId: string) => {
    const selected = formData.categoryIds.includes(categoryId);
    const nextCategoryIds = selected
      ? formData.categoryIds.filter(id => id !== categoryId)
      : [...formData.categoryIds, categoryId];
    setField('categoryIds', nextCategoryIds);
    const availableSkills = await fetchSkills(nextCategoryIds);
    if (availableSkills !== null) {
      const availableSkillIds = new Set(availableSkills.map(skill => skill.skillId));
      setFormData(current => ({
        ...current,
        skillIds: (current.skillIds || []).filter(skillId => availableSkillIds.has(skillId)),
      }));
    }
  };

  const toggleSkill = (skillId: string) => {
    const selectedSkillIds = formData.skillIds || [];
    setField('skillIds', selectedSkillIds.includes(skillId)
      ? selectedSkillIds.filter(id => id !== skillId)
      : [...selectedSkillIds, skillId]);
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const title = formData.title.trim();
    const bio = formData.bio.trim();
    const location = formData.location.trim();

    if (!title) next.title = t('profile.edit.required');
    else if (title.length > 300) next.title = t('profile.edit.maxLength', { count: 300 });
    if (!bio) next.bio = t('profile.edit.required');
    else if (bio.length > 2000) next.bio = t('profile.edit.maxLength', { count: 2000 });
    if (!location) next.location = t('profile.edit.required');
    else if (location.length > 300) next.location = t('profile.edit.maxLength', { count: 300 });
    if (!availabilityOptions.some(option => option.id === formData.availability)) {
      next.availability = t('profile.edit.invalidAvailability');
    }
    if (!formData.majorId || !majors.some(major => major.majorId === formData.majorId)) {
      next.majorId = t('profile.edit.majorRequired');
    }
    if (formData.categoryIds.length === 0) {
      next.categoryIds = t('profile.edit.categoryRequired');
    } else if (formData.categoryIds.some(id => !categories.some(category => category.categoryId === id))) {
      next.categoryIds = t('profile.edit.invalidCategory');
    }
    if ((formData.skillIds || []).some(id => !skills.some(skill => skill.skillId === id))) {
      next.skillIds = t('profile.edit.invalidSkill');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saveLockRef.current || isSaving || isLoadingCategories || isLoadingSkills || categoryError || skillError || !validate()) return;

    saveLockRef.current = true;
    setIsSaving(true);
    setIsSaved(false);
    setHasConflict(false);

    try {
      const response = await profilePutAPI.updateFreelancerProfile({
        title: formData.title.trim(),
        bio: formData.bio.trim(),
        availability: formData.availability,
        location: formData.location.trim(),
        majorId: formData.majorId,
        categoryIds: [...new Set(formData.categoryIds)],
        skillIds: [...new Set(formData.skillIds || [])],
      });

      if (!mountedRef.current) return;
      if (!response.success) {
        const isConflict = response.statusCode === 409;
        setHasConflict(isConflict);
        setErrors({
          submit: isConflict
            ? t('profile.edit.concurrentUpdate')
            : response.message || t('profile.edit.saveError'),
        });
        return;
      }

      setIsSaved(true);
      window.setTimeout(() => {
        if (mountedRef.current) navigate(`/profile/freelancer/${user!.id}`);
      }, 700);
    } finally {
      saveLockRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const cancel = () => navigate(`/profile/freelancer/${user!.id}`);

  if (isLoading) {
    return <AppLayout><div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">{t('profile.edit.loading')}</div></AppLayout>;
  }

  if (loadError) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-red-500">{loadError}</p>
          <button type="button" onClick={() => void loadProfile()} className="btn-cyan px-5 py-3 rounded-xl flex items-center gap-2"><RefreshCw size={16} />{t('profile.edit.retry')}</button>
        </div>
      </AppLayout>
    );
  }

  const errorFor = (key: keyof UpdateFreelancerProfileDto) => errors[key] && <p className="edit-freelancer-profile-form-error">{errors[key]}</p>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="edit-freelancer-profile-header mb-8">
          <button type="button" onClick={cancel} className="p-3 rounded-xl hover:bg-surface border border-transparent hover:border-border cursor-pointer"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="edit-freelancer-profile-header-title text-2xl font-bold">{t('profile.editFreelancerProfile')}</h1>
            <p className="text-sm text-secondary mt-1">{t('profile.edit.freelancerSubtitle')}</p>
          </div>
        </div>

        {isSaved && <div className="edit-freelancer-profile-success-message flex items-center gap-3 p-4 rounded-xl border mb-6"><Check size={18} /><span>{t('profile.operationSuccess')}</span></div>}
        {errors.submit && (
          <div role="alert" className="flex items-center justify-between gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 mb-6">
            <span className="flex items-center gap-3"><X size={18} /><span>{errors.submit}</span></span>
            {hasConflict && (
              <button type="button" onClick={() => void loadProfile()} className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 cursor-pointer">
                <RefreshCw size={14} />{t('profile.edit.reloadProfile')}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="glass-card edit-freelancer-profile-section p-6">
            <h2 className="edit-freelancer-profile-section-title font-bold border-b border-border pb-3 mb-6">{t('profile.edit.professionalDetails')}</h2>
            <div className="edit-freelancer-profile-form-grid">
              <div className="edit-freelancer-profile-form-group md:col-span-2">
                <label className="edit-freelancer-profile-form-label">{t('profile.professionalTitle')} *</label>
                <div className="edit-freelancer-profile-input-wrapper"><input value={formData.title} onChange={e => setField('title', e.target.value)} maxLength={300} className="edit-freelancer-profile-form-input" /><Briefcase size={16} className="edit-freelancer-profile-input-icon" /></div>
                {errorFor('title')}
              </div>
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">{t('profile.availabilityStatus')} *</label>
                <select value={formData.availability} onChange={e => setField('availability', Number(e.target.value))} className="edit-freelancer-profile-form-select w-full">
                  {availabilityOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                {errorFor('availability')}
              </div>
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">{t('profile.edit.location')} *</label>
                <div className="edit-freelancer-profile-input-wrapper"><input value={formData.location} onChange={e => setField('location', e.target.value)} maxLength={300} className="edit-freelancer-profile-form-input" /><MapPin size={16} className="edit-freelancer-profile-input-icon" /></div>
                {errorFor('location')}
              </div>
              <div className="edit-freelancer-profile-form-group md:col-span-2">
                <label className="edit-freelancer-profile-form-label">{t('profile.edit.bio')} *</label>
                <div className="edit-freelancer-profile-input-wrapper !items-start"><textarea value={formData.bio} onChange={e => setField('bio', e.target.value)} maxLength={2000} rows={8} className="edit-freelancer-profile-form-textarea w-full" /><FileText size={16} className="edit-freelancer-profile-input-icon mt-3" /></div>
                <div className="text-xs text-muted-foreground text-right mt-1">{formData.bio.length}/2000</div>
                {errorFor('bio')}
              </div>
            </div>
          </section>

          <section className="glass-card edit-freelancer-profile-section p-6">
            <h2 className="edit-freelancer-profile-section-title font-bold border-b border-border pb-3 mb-6">{t('profile.edit.specialization')}</h2>
            <div className="edit-freelancer-profile-form-group">
              <label className="edit-freelancer-profile-form-label">{t('profile.edit.major')} *</label>
              <select value={formData.majorId} onChange={e => void changeMajor(e.target.value)} className="edit-freelancer-profile-form-select w-full">
                <option value="">{t('profile.edit.selectMajor')}</option>
                {majors.map(major => <option key={major.majorId} value={major.majorId}>{major.name}</option>)}
              </select>
              {errorFor('majorId')}
            </div>

            <div className="edit-freelancer-profile-form-group mt-6">
              <label className="edit-freelancer-profile-form-label flex items-center gap-2"><Tags size={16} />{t('profile.edit.categories')} *</label>
              {isLoadingCategories ? (
                <p className="text-sm text-muted-foreground mt-3">{t('profile.edit.loadingCategories')}</p>
              ) : categoryError ? (
                <div className="flex items-center justify-between gap-3 mt-3 p-3 rounded-xl border border-red-500/20 text-red-500">
                  <span>{categoryError}</span>
                  <button type="button" onClick={() => void fetchCategories(formData.majorId)} className="flex items-center gap-1 cursor-pointer"><RefreshCw size={14} />{t('profile.edit.retry')}</button>
                </div>
              ) : formData.majorId && categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {categories.map(category => {
                    const selected = formData.categoryIds.includes(category.categoryId);
                    return (
                      <button key={category.categoryId} type="button" onClick={() => void toggleCategory(category.categoryId)} className={`text-left px-4 py-3 rounded-xl border cursor-pointer ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted-foreground'}`}>
                        <span className="flex items-center gap-2">{selected && <Check size={15} />}{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">{formData.majorId ? t('profile.edit.noCategories') : t('profile.edit.selectMajorFirst')}</p>
              )}
              {errorFor('categoryIds')}
            </div>

            <div className="edit-freelancer-profile-form-group mt-6">
              <label className="edit-freelancer-profile-form-label flex items-center gap-2"><Briefcase size={16} />{t('profile.edit.skills')}</label>
              {isLoadingSkills ? (
                <p className="text-sm text-muted-foreground mt-3">{t('profile.edit.loadingSkills')}</p>
              ) : skillError ? (
                <div className="flex items-center justify-between gap-3 mt-3 p-3 rounded-xl border border-red-500/20 text-red-500">
                  <span>{skillError}</span>
                  <button type="button" onClick={() => void fetchSkills(formData.categoryIds)} className="flex items-center gap-1 cursor-pointer"><RefreshCw size={14} />{t('profile.edit.retry')}</button>
                </div>
              ) : formData.categoryIds.length > 0 && skills.length > 0 ? (
                <div className="flex flex-wrap gap-3 mt-3">
                  {skills.map(skill => {
                    const selected = (formData.skillIds || []).includes(skill.skillId);
                    return (
                      <button key={skill.skillId} type="button" onClick={() => toggleSkill(skill.skillId)} className={`px-4 py-2 rounded-full border cursor-pointer ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted-foreground'}`}>
                        <span className="flex items-center gap-2">{selected && <Check size={14} />}{skill.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">{formData.categoryIds.length > 0 ? t('profile.edit.noSkills') : t('profile.edit.selectCategoryFirst')}</p>
              )}
              {errorFor('skillIds')}
            </div>
          </section>

          <div className="edit-freelancer-profile-actions flex gap-3 justify-end">
            <button type="button" onClick={cancel} className="px-6 py-3 rounded-xl border border-border cursor-pointer">{t('common.cancel')}</button>
            <button type="submit" disabled={isSaving || isLoadingCategories || isLoadingSkills || Boolean(categoryError) || Boolean(skillError)} className="btn-cyan px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {isSaving ? t('profile.savingChanges') : <><Check size={16} />{t('profile.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
