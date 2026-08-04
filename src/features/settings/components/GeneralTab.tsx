import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router';
import { User, FileText, Briefcase, Building2, MapPin, Globe, Check, AlertCircle, RefreshCw, Camera, Phone, Mail, Users, Layers, AlignLeft, GraduationCap, Clock, FolderGit2, Plus, Trash2, Edit3, ExternalLink, Calendar, Sparkles, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import { profileGetAPI, profilePutAPI } from '../../../api/profileAPI';
import { portfolioAPI } from '../../../api/portfolioAPI';
import { workExperienceAPI } from '../../../api/workExperienceAPI';
import { jobAPI } from '../../../api/jobAPI';
import type { CategoryOptionDto, MajorDto, SkillOptionDto } from '../../../types/models/Category';
import type { PortfolioItemDto, WorkExperienceDto } from '../../../types/models/Profile';
import { Smooth3DSlideshow } from '../../../shared/components/Smooth3DSlideshow';

import { AvatarCropModal } from './AvatarCropModal';

type SubTab = 'basic' | 'details' | 'portfolio' | 'experience';

interface ProfileForm {
  // User basic info
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  preferredLanguage: string;

  // Profile detailed info
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

const initialProfileForm = (user: any): ProfileForm => ({
  firstName: user?.first_name ?? '',
  lastName: user?.last_name ?? '',
  fullName: user?.full_name ?? '',
  email: user?.email ?? '',
  phoneNumber: user?.phone_number ?? '',
  avatarUrl: user?.avatar ?? '',
  preferredLanguage: user?.preferred_language ?? 'vi',

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

export function GeneralTab({ defaultSubTab }: { defaultSubTab?: SubTab }) {
  const { user, role } = useApp();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlSubTab = searchParams.get('subtab') as SubTab | null;
  const [subTab, setSubTab] = useState<SubTab>(urlSubTab || defaultSubTab || 'basic');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileForm>(() =>
    initialProfileForm(user),
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

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

  // Portfolio Management States
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemDto[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    projectUrl: '',
    projectDate: '',
  });

  // Work Experience Management States
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceDto[]>([]);
  const [loadingExperience, setLoadingExperience] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [experienceForm, setExperienceForm] = useState({
    companyName: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const loadPortfolio = useCallback(async () => {
    try {
      setLoadingPortfolio(true);
      const res = await portfolioAPI.getMyPortfolio();
      if (res.success && res.data) {
        setPortfolioItems(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  const loadWorkExperiences = useCallback(async () => {
    try {
      setLoadingExperience(true);
      const res = await workExperienceAPI.getMyWorkExperiences();
      if (res.success && res.data) {
        setWorkExperiences(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExperience(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'portfolio') {
      void loadPortfolio();
    } else if (subTab === 'experience') {
      void loadWorkExperiences();
    }
  }, [subTab, loadPortfolio, loadWorkExperiences]);

  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioForm.title.trim()) {
      toast.error('Project title is required.');
      return;
    }
    try {
      setSavingPortfolio(true);
      if (editingPortfolioId) {
        const res = await portfolioAPI.updatePortfolioItem(editingPortfolioId, portfolioForm);
        if (res.success) {
          toast.success('Portfolio item updated!');
          setEditingPortfolioId(null);
          setShowPortfolioForm(false);
          setPortfolioForm({ title: '', description: '', imageUrl: '', projectUrl: '', projectDate: '' });
          void loadPortfolio();
        } else {
          toast.error(res.message || 'Failed to update portfolio item.');
        }
      } else {
        const res = await portfolioAPI.createPortfolioItem(portfolioForm);
        if (res.success) {
          toast.success('Portfolio item created!');
          setShowPortfolioForm(false);
          setPortfolioForm({ title: '', description: '', imageUrl: '', projectUrl: '', projectDate: '' });
          void loadPortfolio();
        } else {
          toast.error(res.message || 'Failed to create portfolio item.');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving portfolio item.');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const handleDeletePortfolioItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) return;
    try {
      const res = await portfolioAPI.deletePortfolioItem(id);
      if (res.success) {
        toast.success('Portfolio item deleted.');
        void loadPortfolio();
      } else {
        toast.error(res.message || 'Failed to delete portfolio item.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting portfolio item.');
    }
  };

  const handleStartEditPortfolio = (item: PortfolioItemDto) => {
    setEditingPortfolioId(item.portfolioItemId);
    setPortfolioForm({
      title: item.title || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      projectUrl: item.projectUrl || '',
      projectDate: item.projectDate || '',
    });
    setShowPortfolioForm(true);
  };

  const handleSaveWorkExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experienceForm.companyName.trim() || !experienceForm.jobTitle.trim() || !experienceForm.startDate) {
      toast.error('Company Name, Job Title, and Start Date are required.');
      return;
    }
    try {
      setSavingExperience(true);
      if (editingExperienceId) {
        const res = await workExperienceAPI.updateWorkExperience(editingExperienceId, experienceForm);
        if (res.success) {
          toast.success('Work experience updated!');
          setEditingExperienceId(null);
          setShowExperienceForm(false);
          setExperienceForm({ companyName: '', jobTitle: '', startDate: '', endDate: '', description: '' });
          void loadWorkExperiences();
        } else {
          toast.error(res.message || 'Failed to update work experience.');
        }
      } else {
        const res = await workExperienceAPI.createWorkExperience(experienceForm);
        if (res.success) {
          toast.success('Work experience created!');
          setShowExperienceForm(false);
          setExperienceForm({ companyName: '', jobTitle: '', startDate: '', endDate: '', description: '' });
          void loadWorkExperiences();
        } else {
          toast.error(res.message || 'Failed to create work experience.');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error saving work experience.');
    } finally {
      setSavingExperience(false);
    }
  };

  const handleDeleteWorkExperience = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this work experience entry?')) return;
    try {
      const res = await workExperienceAPI.deleteWorkExperience(id);
      if (res.success) {
        toast.success('Work experience entry deleted.');
        void loadWorkExperiences();
      } else {
        toast.error(res.message || 'Failed to delete work experience entry.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting work experience entry.');
    }
  };

  const handleStartEditExperience = (item: WorkExperienceDto) => {
    setEditingExperienceId(item.workExperienceId);
    setExperienceForm({
      companyName: item.companyName || '',
      jobTitle: item.jobTitle || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      description: item.description || '',
    });
    setShowExperienceForm(true);
  };

  // GSAP Sub-Tab Transition Animation
  useGSAP(
    () => {
      if (containerRef.current) {
        gsap.fromTo(
          '.settings-subtab-content',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.1 }
        );
      }
    },
    { dependencies: [subTab], scope: containerRef }
  );

  // Handle Avatar file selection -> Opens Crop Modal
  const handleAvatarFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setRawImageSrc(result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Cropped Avatar Save
  const handleCropSave = (croppedBase64: string) => {
    setAvatarPreview(croppedBase64);
    setFormData(prev => ({ ...prev, avatarUrl: croppedBase64 }));

    // Animate avatar container
    gsap.fromTo(
      '.avatar-edit-wrapper',
      { scale: 0.88, rotate: -5 },
      { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(2)' }
    );

    setAvatarMessage(t('settings.avatarNotice'));
  };

  // Load user profile & options
  const loadData = useCallback(async () => {
    if (!user || role === UserRole.Admin) {
      setFormData(initialProfileForm(user));
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch User Basic Profile (FullName, Email, Phone, Avatar, PreferredLanguage)
      const userProfileRes = await profileGetAPI.getMyUserProfile();
      let userBasic = {
        fullName: user.full_name ?? '',
        email: user.email ?? '',
        phoneNumber: user.phone_number ?? '',
        avatarUrl: user.avatar ?? '',
        preferredLanguage: i18n.language?.startsWith('en') ? 'en' : 'vi',
      };

      if (userProfileRes.success && userProfileRes.data) {
        const prefLang = userProfileRes.data.preferredLanguage?.toLowerCase();
        userBasic = {
          fullName: userProfileRes.data.fullName || (user.full_name ?? ''),
          email: userProfileRes.data.email || (user.email ?? ''),
          phoneNumber: userProfileRes.data.phoneNumber || (user.phone_number ?? ''),
          avatarUrl: userProfileRes.data.avatar || (user.avatar ?? ''),
          preferredLanguage: prefLang === 'en' || prefLang === 'vi' ? prefLang : (i18n.language?.startsWith('en') ? 'en' : 'vi'),
        };
        setAvatarPreview(userProfileRes.data.avatar || user?.avatar || null);
      }

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

          setFormData(prev => ({
            ...prev,
            fullName: userBasic.fullName,
            email: userBasic.email,
            phoneNumber: userBasic.phoneNumber,
            avatarUrl: userBasic.avatarUrl,
            preferredLanguage: userBasic.preferredLanguage,

            location: profile.location ?? '',
            title: profile.title ?? '',
            bio: profile.bio ?? '',
            availability: profile.availability ?? 0,
            majorId: profile.majorId ?? '',
            categoryIds: currentCategoryIds,
            skillIds: profile.skills.map(s => s.skillId),
          }));

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
          setErrorMessage(profileRes.message || t('settings.errorLoadFreelancer'));
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
          setFormData(prev => ({
            ...prev,
            fullName: userBasic.fullName,
            email: userBasic.email,
            phoneNumber: userBasic.phoneNumber,
            avatarUrl: userBasic.avatarUrl,
            preferredLanguage: userBasic.preferredLanguage,

            location: profile.location ?? '',
            companyName: profile.companyName ?? '',
            companyWebsite: profile.companyWebsite ?? '',
            companySize: profile.companySize ?? (sizesRes.data?.[0]?.id ?? 0),
            industry: profile.industry ?? '',
            companyDescription: profile.companyDescription ?? '',
          }));
        } else {
          setErrorMessage(profileRes.message || t('settings.errorLoadClient'));
        }
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : t('settings.errorLoadSettings'));
    } finally {
      setLoading(false);
    }
  }, [role, user, t, i18n.language]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Major change handler
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

  // Category toggle
  const toggleCategory = async (e: MouseEvent<HTMLButtonElement>, categoryId: string) => {
    gsap.fromTo(e.currentTarget, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
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

  // Skill toggle
  const toggleSkill = (e: MouseEvent<HTMLButtonElement>, skillId: string) => {
    gsap.fromTo(e.currentTarget, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
    setFormData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId],
    }));
  };

  // Save handler - Updates both User Basic Profile & Detailed Role Profile
  const handleSave = async () => {
    setSaved(false);
    setErrorMessage(null);
    setSaving(true);

    try {
      // 1. Update User Entity Basic Information (FullName, Email, Phone, Avatar, PreferredLanguage)
      const userUpdateRes = await profilePutAPI.updateUserProfile({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        avatar: formData.avatarUrl,
        preferredLanguage: formData.preferredLanguage,
      });

      if (!userUpdateRes.success) {
        setErrorMessage(userUpdateRes.message || t('settings.errorSaveFailed'));
        setSaving(false);
        return;
      }

      // Sync site language if preferred language changed
      if (formData.preferredLanguage && i18n.language !== formData.preferredLanguage) {
        void i18n.changeLanguage(formData.preferredLanguage);
      }

      // 2. Update Detailed Role Profile (Freelancer or Client)
      if (role === UserRole.Freelancer) {
        if (!formData.majorId && subTab === 'details') {
          setErrorMessage(t('settings.errorMajorRequired'));
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
          setErrorMessage(response.message || t('settings.errorSaveFailed'));
          return;
        }
      } else if (role === UserRole.Client) {
        // Validate companyDescription has at least 50 words
        const descWordCount = formData.companyDescription
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 0).length;
        if (formData.companyDescription.trim() && descWordCount < 50) {
          setErrorMessage(
            t('settings.companyDescMinWords') ||
            `Company description must be at least 50 words. Currently: ${descWordCount} words.`
          );
          setSaving(false);
          return;
        }

        const response = await profilePutAPI.updateClientProfile({
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          companySize: formData.companySize,
          industry: formData.industry,
          companyDescription: formData.companyDescription,
          location: formData.location,
        });

        if (!response.success) {
          setErrorMessage(response.message || t('settings.errorSaveFailed'));
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
      <div className="settings-form-card flex min-h-48 items-center justify-center p-6 text-sm text-secondary">
        <RefreshCw size={20} className="mr-3 animate-spin text-[var(--brand,#494be7)]" />
        {t('settings.loadingSettings')}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Sub-Tab Selector */}
      <div className="settings-subtab-bar">
        <button
          type="button"
          onClick={() => setSubTab('basic')}
          className={`settings-subtab-btn ${subTab === 'basic' ? 'active' : ''}`}
        >
          <User size={16} />
          <span>{t('settings.avatarAndBasicInfo')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('details')}
          className={`settings-subtab-btn ${subTab === 'details' ? 'active' : ''}`}
        >
          <FileText size={16} />
          <span>{t('settings.detailedProfile')}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('portfolio')}
          className={`settings-subtab-btn ${subTab === 'portfolio' ? 'active' : ''}`}
        >
          <FolderGit2 size={16} />
          <span>Portfolio</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('experience')}
          className={`settings-subtab-btn ${subTab === 'experience' ? 'active' : ''}`}
        >
          <Building2 size={16} />
          <span>Work Experience</span>
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
          <span>{t('settings.saveSuccess')}</span>
        </div>
      )}

      {avatarMessage && (
        <div className="alert-info flex items-center justify-between text-xs p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-blue-400 shrink-0" />
            <span>{avatarMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setAvatarMessage(null)}
            className="text-xs underline hover:text-white ml-2 shrink-0"
          >
            {t('common.close', { defaultValue: 'Đóng' })}
          </button>
        </div>
      )}

      {/* Sub-Tab 1: Avatar & User Basic Information */}
      {subTab === 'basic' && (
        <div className="settings-subtab-content space-y-6">
          {/* Avatar Section with Circular Upload Overlay */}
          <section className="settings-form-card">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border,#ededf0)] mb-5">
              <h2 className="settings-form-card-title mb-0">
                <Camera size={18} className="text-[var(--brand,#494be7)]" />
                {t('settings.avatarAndPhoto')}
              </h2>
              {user?.is_email_verified && (
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Check size={13} />
                  {t('settings.verified')}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
              {/* Circular Avatar Preview */}
              <div className="avatar-edit-wrapper group shrink-0 rounded-full">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user?.full_name ?? 'User Avatar'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-[var(--brand,#494be7)] rounded-full">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="avatar-edit-overlay rounded-full"
                >
                  <Camera size={22} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('common.edit', { defaultValue: 'Sửa' })}</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--brand,#494be7)] hover:bg-[var(--brand-hover,#3f41d0)] shadow-md transition-all active:scale-95"
                  >
                    <Camera size={15} />
                    <span>{t('settings.uploadPhoto')}</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setFormData(prev => ({ ...prev, avatarUrl: '' }));
                      }}
                      className="px-3 py-2 text-xs font-semibold text-muted hover:text-red-500 transition-colors"
                    >
                      {t('settings.removePhoto')}
                    </button>
                  )}
                </div>

                <p className="text-xs font-medium text-secondary">
                  {t('settings.photoMaxInfo')}
                </p>
              </div>
            </div>
          </section>

          {/* User Entity Basic Information Form */}
          <section className="settings-form-card space-y-5">
            <h2 className="settings-form-card-title">
              <User size={18} className="text-[var(--brand,#494be7)]" />
              {t('settings.userBasicInfo')}
            </h2>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.fullName')}</label>
                <div className="settings-input-wrapper">
                  <User size={16} className="settings-input-icon" />
                  <input
                    value={formData.fullName}
                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder={t('settings.fullNamePlaceholder')}
                    className="settings-form-input"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.email')}</label>
                <div className="settings-input-wrapper">
                  <Mail size={16} className="settings-input-icon" />
                  <input
                    value={formData.email}
                    readOnly
                    disabled
                    className="settings-form-input opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.phoneNumber')}</label>
                <div className="settings-input-wrapper">
                  <Phone size={16} className="settings-input-icon" />
                  <input
                    value={formData.phoneNumber}
                    onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder={t('settings.phonePlaceholder')}
                    className="settings-form-input"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">{t('settings.selectLanguage')}</label>
                <div className="relative flex items-center p-1 rounded-xl bg-[var(--surface-muted,#f1f1f3)] border border-[var(--border,#ededf0)] h-[46px]">
                  {/* Sliding Pill Background */}
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-[var(--brand,#494be7)] shadow-sm transition-all duration-300 ease-out ${
                      formData.preferredLanguage === 'en' ? 'left-[calc(50%+0.125rem)]' : 'left-1'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, preferredLanguage: 'vi' }))}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 z-10 ${
                      formData.preferredLanguage === 'vi' ? 'text-white' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <span className="text-sm">🇻🇳</span>
                    <span>Tiếng Việt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, preferredLanguage: 'en' }))}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 z-10 ${
                      formData.preferredLanguage === 'en' ? 'text-white' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <span className="text-sm">🇬🇧</span>
                    <span>English</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border,#ededf0)] flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="settings-submit-btn"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{t('settings.saving')}</span>
                  </>
                ) : (
                  <span>{t('settings.saveChanges')}</span>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 2: Detailed Profile (Includes Location, Company Name, Availability, Major, Skills, etc.) */}
      {subTab === 'details' && (
        <div className="settings-subtab-content space-y-6">
          <section className="settings-form-card space-y-6">
            <h2 className="settings-form-card-title">
              <FileText size={18} className="text-[var(--brand,#494be7)]" />
              {role === UserRole.Freelancer ? t('settings.editFreelancerProfile') : t('settings.editClientProfile')}
            </h2>

            {/* Freelancer Detailed Form */}
            {role === UserRole.Freelancer && (
              <div className="space-y-6">
                <div className="settings-form-grid">
                  <div className="settings-form-group full-width">
                    <label className="settings-form-label">{t('settings.headline')}</label>
                    <div className="settings-input-wrapper">
                      <Briefcase size={16} className="settings-input-icon" />
                      <input
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('settings.headlinePlaceholder')}
                        className="settings-form-input"
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
                        placeholder={t('settings.locationPlaceholder')}
                        className="settings-form-input"
                      />
                    </div>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-form-label">{t('settings.availability')}</label>
                    <div className="settings-input-wrapper">
                      <Clock size={16} className="settings-input-icon" />
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
                  </div>

                  <div className="settings-form-group full-width">
                    <label className="settings-form-label">{t('settings.major')}</label>
                    <div className="settings-input-wrapper">
                      <GraduationCap size={16} className="settings-input-icon" />
                      <select
                        value={formData.majorId}
                        onChange={e => void handleMajorChange(e.target.value)}
                        className="settings-form-select"
                      >
                        <option value="">-- {t('settings.selectMajor')} --</option>
                        {majors.map(major => (
                          <option key={major.majorId} value={major.majorId}>
                            {major.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div className="settings-form-group full-width">
                      <label className="settings-form-label mb-2 block">{t('settings.categories')}</label>
                      <div className="settings-tag-grid">
                        {categories.map(cat => {
                          const isSelected = formData.categoryIds.includes(cat.categoryId);
                          return (
                            <button
                              key={cat.categoryId}
                              type="button"
                              onClick={e => void toggleCategory(e, cat.categoryId)}
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
                      <label className="settings-form-label mb-2 block">{t('settings.skills')}</label>
                      <div className="settings-tag-grid">
                        {skills.map(skill => {
                          const isSelected = formData.skillIds.includes(skill.skillId);
                          return (
                            <button
                              key={skill.skillId}
                              type="button"
                              onClick={e => toggleSkill(e, skill.skillId)}
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
                    <label className="settings-form-label">{t('settings.bio')}</label>
                    <div className="settings-input-wrapper">
                      <AlignLeft size={16} className="settings-input-icon self-start mt-3.5" />
                      <textarea
                        value={formData.bio}
                        onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder={t('settings.bioPlaceholder')}
                        className="settings-form-textarea"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client Detailed Form */}
            {role === UserRole.Client && (
              <div className="space-y-6">
                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-form-label">{t('settings.companyName')}</label>
                    <div className="settings-input-wrapper">
                      <Building2 size={16} className="settings-input-icon" />
                      <input
                        value={formData.companyName}
                        onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder={t('settings.companyNamePlaceholder')}
                        className="settings-form-input"
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
                        placeholder={t('settings.locationPlaceholder')}
                        className="settings-form-input"
                      />
                    </div>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-form-label">{t('settings.companyWebsite')}</label>
                    <div className="settings-input-wrapper">
                      <Globe size={16} className="settings-input-icon" />
                      <input
                        value={formData.companyWebsite}
                        onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                        placeholder={t('settings.websitePlaceholder')}
                        className="settings-form-input"
                      />
                    </div>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-form-label">{t('settings.companySize')}</label>
                    <div className="settings-input-wrapper">
                      <Users size={16} className="settings-input-icon" />
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
                  </div>

                  <div className="settings-form-group full-width">
                    <label className="settings-form-label">{t('settings.industry')}</label>
                    <div className="settings-input-wrapper">
                      <Layers size={16} className="settings-input-icon" />
                      <select
                        value={formData.industry}
                        onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        className="settings-form-select"
                      >
                        <option value="">-- {t('settings.selectIndustry')} --</option>
                        {industries.map(ind => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="settings-form-group full-width">
                    <label className="settings-form-label">
                      {t('settings.companyDescription')}
                      <span className="text-[var(--destructive,#dc2626)] ml-0.5">*</span>
                    </label>
                    <div className="settings-input-wrapper">
                      <AlignLeft size={16} className="settings-input-icon self-start mt-3.5" />
                      <textarea
                        value={formData.companyDescription}
                        onChange={e => setFormData(prev => ({ ...prev, companyDescription: e.target.value }))}
                        placeholder={t('settings.companyDescPlaceholder') || 'Describe your company in detail (at least 50 words)...'}
                        className={`settings-form-textarea ${
                          formData.companyDescription.trim() &&
                          formData.companyDescription.trim().split(/\s+/).filter(w => w.length > 0).length < 50
                            ? 'border-[var(--destructive,#dc2626)] focus:ring-[var(--destructive,#dc2626)]'
                            : ''
                        }`}
                      />
                    </div>
                    {/* Live Word Counter */}
                    {(() => {
                      const wc = formData.companyDescription
                        .trim()
                        .split(/\s+/)
                        .filter(w => w.length > 0).length;
                      const isEmpty = formData.companyDescription.trim() === '';
                      const isOk = isEmpty || wc >= 50;
                      return (
                        <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-semibold ${
                          isEmpty ? 'text-[var(--text-muted)]' : isOk ? 'text-[var(--success,#16a34a)]' : 'text-[var(--destructive,#dc2626)]'
                        }`}>
                          <span>
                            {isEmpty
                              ? `0 / 50 ${t('settings.words') || 'words'} ${t('settings.required') || 'required'}`
                              : isOk
                              ? `✓ ${wc} ${t('settings.words') || 'words'}`
                              : `${wc} / 50 ${t('settings.words') || 'words'} (${50 - wc} ${t('settings.wordsRemaining') || 'more required'})`
                            }
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border,#ededf0)] flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="settings-submit-btn"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{t('settings.saving')}</span>
                  </>
                ) : (
                  <span>{t('settings.saveChanges')}</span>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 3: Portfolio Showcase Management */}
      {subTab === 'portfolio' && (
        <div className="settings-subtab-content space-y-6">
          <section className="settings-form-card space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border,#ededf0)]">
              <div>
                <h2 className="settings-form-card-title mb-1">
                  <FolderGit2 size={18} className="text-[var(--brand,#494be7)]" />
                  <span>Portfolio Showcase</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Manage project cards shown in your 3D Coverflow profile gallery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPortfolioId(null);
                  setPortfolioForm({ title: '', description: '', imageUrl: '', projectUrl: '', projectDate: '' });
                  setShowPortfolioForm(!showPortfolioForm);
                }}
                className="cp-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
              >
                {showPortfolioForm ? <X size={15} /> : <Plus size={15} />}
                <span>{showPortfolioForm ? 'Cancel' : 'Add Project'}</span>
              </button>
            </div>

            {/* Form Section */}
            {showPortfolioForm && (
              <form onSubmit={handleSavePortfolioItem} className="p-5 rounded-2xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--brand-soft)] space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--brand,#494be7)]" />
                  <span>{editingPortfolioId ? 'Edit Portfolio Item' : 'New Portfolio Item'}</span>
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">
                      Project Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. E-Commerce Web App"
                      value={portfolioForm.title}
                      onChange={e => setPortfolioForm(prev => ({ ...prev, title: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Brief overview of tech stack, features, and key achievements..."
                      value={portfolioForm.description}
                      onChange={e => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/project-preview.jpg"
                      value={portfolioForm.imageUrl}
                      onChange={e => setPortfolioForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Project Link (URL)</label>
                    <input
                      type="url"
                      placeholder="https://github.com/my-user/my-repo"
                      value={portfolioForm.projectUrl}
                      onChange={e => setPortfolioForm(prev => ({ ...prev, projectUrl: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Completion Date</label>
                    <input
                      type="date"
                      value={portfolioForm.projectDate}
                      onChange={e => setPortfolioForm(prev => ({ ...prev, projectDate: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPortfolioForm(false);
                      setEditingPortfolioId(null);
                    }}
                    className="cp-btn-secondary px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPortfolio}
                    className="cp-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    {savingPortfolio ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{editingPortfolioId ? 'Update Item' : 'Save Item'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Live 3D Coverflow Gallery Preview */}
            <div className="rounded-2xl p-4 bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-2">
                <span className="font-bold uppercase tracking-wider text-[var(--brand,#494be7)] flex items-center gap-1.5">
                  <Sparkles size={14} /> Live Coverflow 3D Gallery Preview
                </span>
                <span>{portfolioItems.length} items</span>
              </div>
              <Smooth3DSlideshow
                slides={
                  portfolioItems.length > 0
                    ? portfolioItems.map((item, idx) => ({
                        id: item.portfolioItemId || String(idx),
                        title: item.title,
                        description: item.description,
                        projectUrl: item.projectUrl,
                        image: {
                          src: item.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
                          alt: item.title,
                        },
                      }))
                    : undefined
                }
                cardWidth={280}
                cardHeight={260}
                radius={4}
                tilt={10}
                sideTilt={6}
                gap={6}
              />
            </div>

            {/* Portfolio Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Existing Projects</h3>
              {loadingPortfolio ? (
                <div className="flex items-center justify-center p-8 text-sm text-secondary">
                  <RefreshCw size={18} className="animate-spin mr-2 text-[var(--brand,#494be7)]" />
                  Loading portfolio...
                </div>
              ) : portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portfolioItems.map(item => (
                    <div
                      key={item.portfolioItemId}
                      className="p-4 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))] flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-indigo-900/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                            GB
                          </div>
                        )}

                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{item.description}</p>
                          )}
                          {item.projectUrl && (
                            <a
                              href={item.projectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[var(--brand,#494be7)] font-medium inline-flex items-center gap-1 hover:underline pt-1"
                            >
                              <ExternalLink size={12} /> View Project
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[var(--text-muted)]">
                        <span>{item.projectDate || 'No date'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditPortfolio(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-secondary hover:text-white"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeletePortfolioItem(item.portfolioItemId)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--text-secondary)] rounded-xl border border-dashed border-[var(--border,#ededf0)]">
                  No portfolio items created yet. Click "+ Add Project" to build your showcase!
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Sub-Tab 4: Work Experience Management */}
      {subTab === 'experience' && (
        <div className="settings-subtab-content space-y-6">
          <section className="settings-form-card space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border,#ededf0)]">
              <div>
                <h2 className="settings-form-card-title mb-1">
                  <Building2 size={18} className="text-[var(--brand,#494be7)]" />
                  <span>Work Experience</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Add your past professional roles and work history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingExperienceId(null);
                  setExperienceForm({ companyName: '', jobTitle: '', startDate: '', endDate: '', description: '' });
                  setShowExperienceForm(!showExperienceForm);
                }}
                className="cp-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
              >
                {showExperienceForm ? <X size={15} /> : <Plus size={15} />}
                <span>{showExperienceForm ? 'Cancel' : 'Add Position'}</span>
              </button>
            </div>

            {/* Form Section */}
            {showExperienceForm && (
              <form onSubmit={handleSaveWorkExperience} className="p-5 rounded-2xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--brand-soft)] space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--brand,#494be7)]" />
                  <span>{editingExperienceId ? 'Edit Work Experience' : 'New Work Experience'}</span>
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Frontend Engineer"
                      value={experienceForm.jobTitle}
                      onChange={e => setExperienceForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">
                      Company / Organization <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Software Inc."
                      value={experienceForm.companyName}
                      onChange={e => setExperienceForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={experienceForm.startDate}
                      onChange={e => setExperienceForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">End Date (Leave empty if current job)</label>
                    <input
                      type="date"
                      value={experienceForm.endDate}
                      onChange={e => setExperienceForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Description / Responsibilities</label>
                    <textarea
                      rows={3}
                      placeholder="Describe key responsibilities, tools used, and deliverables..."
                      value={experienceForm.description}
                      onChange={e => setExperienceForm(prev => ({ ...prev, description: e.target.value }))}
                      className="settings-input w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExperienceForm(false);
                      setEditingExperienceId(null);
                    }}
                    className="cp-btn-secondary px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingExperience}
                    className="cp-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    {savingExperience ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{editingExperienceId ? 'Update Position' : 'Save Position'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Experience List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Work History</h3>
              {loadingExperience ? (
                <div className="flex items-center justify-center p-8 text-sm text-secondary">
                  <RefreshCw size={18} className="animate-spin mr-2 text-[var(--brand,#494be7)]" />
                  Loading work history...
                </div>
              ) : workExperiences.length > 0 ? (
                <div className="space-y-3">
                  {workExperiences.map(item => (
                    <div
                      key={item.workExperienceId}
                      className="p-4 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))] flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-[var(--text-primary)]">{item.jobTitle}</h4>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--brand-soft,rgba(73,75,231,0.15))] text-[var(--brand,#494be7)] font-semibold">
                            {item.companyName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <Calendar size={13} className="text-[var(--brand,#494be7)]" />
                          <span>{item.startDate} - {item.endDate || 'Present'}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-[var(--text-secondary)] pt-1">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditExperience(item)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-secondary hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteWorkExperience(item.workExperienceId)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--text-secondary)] rounded-xl border border-dashed border-[var(--border,#ededf0)]">
                  No work experience entries added yet. Click "+ Add Position" to populate your work history!
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Interactive Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropSave={handleCropSave}
      />
    </div>
  );
}
