import { useCallback, useEffect, useState } from 'react';
import { User, FileText, Briefcase, Building2, MapPin, Globe, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import { profileGetAPI, profilePutAPI } from '../../../api/profileAPI';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';

type SubTab = 'basic' | 'details';

interface ProfileForm {
  name: string;
  email: string;
  location: string;
  title: string;
  bio: string;
  availability: number;
  majorId: string;
  categoryIds: string[];
  skillIds: string[];
  companyName: string;
  companyWebsite: string;
  companySize: number;
  industry: string;
  companyDescription: string;
}

const initialProfileForm = (name = '', email = ''): ProfileForm => ({
  name,
  email,
  location: '',
  title: '',
  bio: '',
  availability: 0,
  majorId: '',
  categoryIds: [],
  skillIds: [],
  companyName: '',
  companyWebsite: '',
  companySize: 0,
  industry: '',
  companyDescription: '',
});

export function GeneralTab() {
  const { user, role } = useApp();
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('basic');
  const [formData, setFormData] = useState<ProfileForm>(() =>
    initialProfileForm(user?.full_name, user?.email),
  );

  // Lookup options
  const [availabilityStatuses, setAvailabilityStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [skills, setSkills] = useState<SkillOptionDto[]>([]);
  const [companySizes, setCompanySizes] = useState<Array<{ id: number; name: string }>>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user profile & options
  const loadData = useCallback(async () => {
    if (!user || role === UserRole.Admin) {
      setFormData(initialProfileForm(user?.full_name, user?.email));
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (role === UserRole.Freelancer) {
        const [profileRes, majorsRes, availabilityRes] = await Promise.all([
          profileGetAPI.getMyFreelancerProfile(),
          jobAPI.getMajors(),
          profileGetAPI.getAvailabilityStatuses(),
        ]);

        if (availabilityRes.success && availabilityRes.data) {
          setAvailabilityStatuses(availabilityRes.data);
        }
        if (majorsRes.success && majorsRes.data) {
          setMajors(majorsRes.data);
        }

        if (profileRes.success && profileRes.data) {
          const profile = profileRes.data;
          const currentCategoryIds = profile.categories.map(c => c.categoryId);
          
          setFormData({
            ...initialProfileForm(user.full_name, user.email),
            location: profile.location ?? '',
            title: profile.title ?? '',
            bio: profile.bio ?? '',
            availability: profile.availability ?? 0,
            majorId: profile.majorId ?? '',
            categoryIds: currentCategoryIds,
            skillIds: profile.skills.map(s => s.skillId),
          });

          // Fetch categories & skills if majorId exists
          if (profile.majorId) {
            const catRes = await jobAPI.getCategoriesByMajor(profile.majorId);
            if (catRes.success && catRes.data) {
              setCategories(catRes.data);
            }
          }
          if (currentCategoryIds.length > 0) {
            const skillResponses = await Promise.all(currentCategoryIds.map(cId => jobAPI.getSkillsByCategory(cId)));
            const mergedSkills = new Map<string, SkillOptionDto>();
            profile.skills.forEach(s => mergedSkills.set(s.skillId, { skillId: s.skillId, name: s.skillName }));
            skillResponses.forEach(r => r.data?.forEach(s => mergedSkills.set(s.skillId, s)));
            setSkills([...mergedSkills.values()]);
          }
        } else {
          setErrorMessage(profileRes.message || 'Could not load freelancer profile.');
        }
      } else if (role === UserRole.Client) {
        const [profileRes, sizesRes, industriesRes] = await Promise.all([
          profileGetAPI.getMyClientProfile(),
          profileGetAPI.getCompanySizes(),
          profileGetAPI.getIndustries(),
        ]);

        if (sizesRes.success && sizesRes.data) setCompanySizes(sizesRes.data);
        if (industriesRes.success && industriesRes.data) setIndustries(industriesRes.data);

        if (profileRes.success && profileRes.data) {
          const profile = profileRes.data;
          setFormData({
            ...initialProfileForm(user.full_name, user.email),
            location: profile.location ?? '',
            companyName: profile.companyName ?? '',
            companyWebsite: profile.companyWebsite ?? '',
            companySize: profile.companySize ?? (sizesRes.data?.[0]?.id ?? 0),
            industry: profile.industry ?? '',
            companyDescription: profile.companyDescription ?? '',
          });
        } else {
          setErrorMessage(profileRes.message || 'Could not load client profile.');
        }
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Error loading profile settings.');
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Major change
  const handleMajorChange = async (majorId: string) => {
    setFormData(prev => ({ ...prev, majorId, categoryIds: [], skillIds: [] }));
    setCategories([]);
    setSkills([]);
    if (majorId) {
      const res = await jobAPI.getCategoriesByMajor(majorId);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    }
  };

  // Handle Category toggle
  const toggleCategory = async (categoryId: string) => {
    const nextCategoryIds = formData.categoryIds.includes(categoryId)
      ? formData.categoryIds.filter(id => id !== categoryId)
      : [...formData.categoryIds, categoryId];

    setFormData(prev => ({ ...prev, categoryIds: nextCategoryIds }));

    if (nextCategoryIds.length > 0) {
      const responses = await Promise.all(nextCategoryIds.map(id => jobAPI.getSkillsByCategory(id)));
      const merged = new Map<string, SkillOptionDto>();
      responses.forEach(r => r.data?.forEach(s => merged.set(s.skillId, s)));
      setSkills([...merged.values()]);
    } else {
      setSkills([]);
      setFormData(prev => ({ ...prev, skillIds: [] }));
    }
  };

  // Handle Skill toggle
  const toggleSkill = (skillId: string) => {
    setFormData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId],
    }));
  };

  // Save handler
  const handleSave = async () => {
    setSaved(false);
    setErrorMessage(null);
    setSaving(true);

    try {
      if (role === UserRole.Freelancer) {
        if (!formData.majorId) {
          setErrorMessage(t('profile.errors.majorRequired', { defaultValue: 'Please select a major.' }));
          setSaving(false);
          return;
        }

        const response = await profilePutAPI.updateFreelancerProfile({
          title: formData.title,
          bio: formData.bio,
          availability: formData.availability,
          location: formData.location,
          majorId: formData.majorId,
          categoryIds: formData.categoryIds,
          skillIds: formData.skillIds,
        });

        if (!response.success) {
          setErrorMessage(response.message || t('profile.errors.saveFailed'));
          return;
        }
      } else if (role === UserRole.Client) {
        const response = await profilePutAPI.updateClientProfile({
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          companySize: formData.companySize,
          industry: formData.industry,
          companyDescription: formData.companyDescription,
          location: formData.location,
        });

        if (!response.success) {
          setErrorMessage(response.message || t('profile.errors.saveFailed'));
          return;
        }
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'GB';

  if (loading) {
    return (
      <div className="glass-card flex min-h-48 items-center justify-center p-6 text-sm text-secondary">
        <RefreshCw size={18} className="mr-2 animate-spin text-[var(--gb-cyan)]" />
        {t('settings.loadingSettings')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tab Selector */}
      <div className="settings-subtab-bar">
        <button
          type="button"
          onClick={() => setSubTab('basic')}
          className={`settings-subtab-btn ${subTab === 'basic' ? 'active' : ''}`}
        >
          <User size={16} />
          <span>{t('settings.basicInfo', { defaultValue: 'Avatar & Basic Info' })}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('details')}
          className={`settings-subtab-btn ${subTab === 'details' ? 'active' : ''}`}
        >
          <FileText size={16} />
          <span>{t('settings.detailedProfile', { defaultValue: 'Detailed Profile' })}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="alert-red flex items-center gap-2 text-sm p-4 rounded-xl">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {saved && (
        <div className="alert-green flex items-center gap-2 text-sm p-4 rounded-xl">
          <Check size={16} />
          <span>{t('settings.saveSuccess', { defaultValue: 'Profile updated successfully!' })}</span>
        </div>
      )}

      {/* Sub-Tab 1: Basic Information & Avatar */}
      {subTab === 'basic' && (
        <div className="space-y-6">
          <section className="glass-card p-6">
            <h2 className="mb-5 font-semibold text-primary">
              {t('settings.profilePhoto', { defaultValue: 'Avatar & Identity' })}
            </h2>
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--gb-cyan)]/15 text-xl font-bold text-[var(--gb-cyan)] shadow-inner">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-primary text-base">{user?.full_name}</p>
                <p className="mt-0.5 text-sm text-secondary">{user?.email}</p>
                {user?.is_email_verified && (
                  <span className="badge-green mt-2 inline-flex items-center gap-1 text-xs">
                    <Check size={12} />
                    {t('settings.verified', { defaultValue: 'Verified' })}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="glass-card space-y-5 p-6">
            <h2 className="font-semibold text-primary">{t('settings.basicInfo')}</h2>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.fullName')}</label>
                <div className="settings-input-wrapper">
                  <User size={16} className="settings-input-icon" />
                  <input
                    value={formData.name}
                    readOnly
                    disabled
                    className="settings-form-input opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.email')}</label>
                <div className="settings-input-wrapper">
                  <User size={16} className="settings-input-icon" />
                  <input
                    value={formData.email}
                    readOnly
                    disabled
                    className="settings-form-input opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.location')}</label>
                <div className="settings-input-wrapper">
                  <MapPin size={16} className="settings-input-icon" />
                  <input
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Ho Chi Minh City, Vietnam"
                    className="settings-form-input"
                  />
                </div>
              </div>

              {role === UserRole.Freelancer && (
                <div className="settings-form-group">
                  <label className="settings-form-label">{t('settings.availability')}</label>
                  <select
                    value={formData.availability}
                    onChange={e => setFormData(prev => ({ ...prev, availability: Number(e.target.value) }))}
                    className="settings-form-select"
                  >
                    {availabilityStatuses.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {role === UserRole.Client && (
                <div className="settings-form-group">
                  <label className="settings-form-label">{t('profile.companyName')}</label>
                  <div className="settings-input-wrapper">
                    <Building2 size={16} className="settings-input-icon" />
                    <input
                      value={formData.companyName}
                      onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Company Name"
                      className="settings-form-input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-gb-primary px-6 py-2.5 text-sm font-medium"
              >
                {saving ? t('settings.saving') : t('settings.saveChanges')}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 2: Detailed Profile (Fields from Edit Profile Screens) */}
      {subTab === 'details' && (
        <section className="glass-card space-y-6 p-6">
          <h2 className="font-semibold text-primary">
            {role === UserRole.Freelancer ? t('profile.editFreelancerProfile') : t('profile.editClientProfile')}
          </h2>

          {/* Freelancer Detailed Form */}
          {role === UserRole.Freelancer && (
            <div className="space-y-6">
              <div className="settings-form-grid">
                <div className="settings-form-group full-width">
                  <label className="settings-form-label">{t('profile.title', { defaultValue: 'Professional Title / Headline' })}</label>
                  <div className="settings-input-wrapper">
                    <Briefcase size={16} className="settings-input-icon" />
                    <input
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Senior Fullstack Developer"
                      className="settings-form-input"
                    />
                  </div>
                </div>

                <div className="settings-form-group full-width">
                  <label className="settings-form-label">{t('profile.major', { defaultValue: 'Major / Specialization' })}</label>
                  <select
                    value={formData.majorId}
                    onChange={e => void handleMajorChange(e.target.value)}
                    className="settings-form-select"
                  >
                    <option value="">-- {t('profile.selectMajor', { defaultValue: 'Select Major' })} --</option>
                    {majors.map(major => (
                      <option key={major.majorId} value={major.majorId}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>

                {categories.length > 0 && (
                  <div className="settings-form-group full-width">
                    <label className="settings-form-label mb-2 block">{t('profile.categories', { defaultValue: 'Categories' })}</label>
                    <div className="settings-tag-grid">
                      {categories.map(cat => {
                        const isSelected = formData.categoryIds.includes(cat.categoryId);
                        return (
                          <button
                            key={cat.categoryId}
                            type="button"
                            onClick={() => void toggleCategory(cat.categoryId)}
                            className={`settings-tag-badge ${isSelected ? 'selected' : ''}`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {skills.length > 0 && (
                  <div className="settings-form-group full-width">
                    <label className="settings-form-label mb-2 block">{t('profile.skills', { defaultValue: 'Skills' })}</label>
                    <div className="settings-tag-grid">
                      {skills.map(skill => {
                        const isSelected = formData.skillIds.includes(skill.skillId);
                        return (
                          <button
                            key={skill.skillId}
                            type="button"
                            onClick={() => toggleSkill(skill.skillId)}
                            className={`settings-tag-badge ${isSelected ? 'selected' : ''}`}
                          >
                            {skill.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="settings-form-group full-width">
                  <label className="settings-form-label">{t('profile.bio', { defaultValue: 'Overview / Bio' })}</label>
                  <textarea
                    value={formData.bio}
                    onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Describe your expertise, experience, and background..."
                    className="settings-form-textarea"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Client Detailed Form */}
          {role === UserRole.Client && (
            <div className="space-y-6">
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">{t('profile.companyName')}</label>
                  <div className="settings-input-wrapper">
                    <Building2 size={16} className="settings-input-icon" />
                    <input
                      value={formData.companyName}
                      onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="e.g. Acme Tech Solutions"
                      className="settings-form-input"
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">{t('profile.companyWebsite', { defaultValue: 'Company Website' })}</label>
                  <div className="settings-input-wrapper">
                    <Globe size={16} className="settings-input-icon" />
                    <input
                      value={formData.companyWebsite}
                      onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                      placeholder="https://example.com"
                      className="settings-form-input"
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">{t('profile.companySize', { defaultValue: 'Company Size' })}</label>
                  <select
                    value={formData.companySize}
                    onChange={e => setFormData(prev => ({ ...prev, companySize: Number(e.target.value) }))}
                    className="settings-form-select"
                  >
                    {companySizes.map(size => (
                      <option key={size.id} value={size.id}>
                        {size.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">{t('profile.industry', { defaultValue: 'Industry' })}</label>
                  <select
                    value={formData.industry}
                    onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="settings-form-select"
                  >
                    <option value="">-- Select Industry --</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-form-group full-width">
                  <label className="settings-form-label">{t('profile.companyDescription', { defaultValue: 'Company Description' })}</label>
                  <textarea
                    value={formData.companyDescription}
                    onChange={e => setFormData(prev => ({ ...prev, companyDescription: e.target.value }))}
                    placeholder="Tell freelancers about your company, mission, and culture..."
                    className="settings-form-textarea"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-gb-primary px-6 py-2.5 text-sm font-medium"
            >
              {saving ? t('settings.saving') : t('settings.saveChanges')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
