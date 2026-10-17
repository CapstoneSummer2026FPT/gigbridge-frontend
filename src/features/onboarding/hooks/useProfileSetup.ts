import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { profilePutAPI, profileGetAPI } from '../../../api/profileAPI';
import { jobAPI } from '../../../api/jobAPI';
import { UserRole } from '../../../types/models/User';
import type { UpdateClientProfileDto, UpdateFreelancerProfileDto } from '../../../types/models/Profile';
import type { CategoryOptionDto, MajorDto } from '../../../types/models/Category';
import { secureStorage } from '../../../shared/utils/secureStorage';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

const INDUSTRIES_FALLBACK = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education',
  'Marketing', 'Real Estate', 'Entertainment', 'Manufacturing', 'Other'
];

const COMPANY_SIZES_FALLBACK = [
  { id: 0, name: 'Solo (1-9 employees)' },
  { id: 1, name: 'Small (10-49 employees)' },
  { id: 2, name: 'Medium (50-249 employees)' },
  { id: 3, name: 'Large (250+ employees)' }
];

export function useProfileSetup() {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');

  // Safely retrieve app context
  let appContext;
  try {
    appContext = useApp();
  } catch {
    appContext = null;
  }

  const role = appContext?.role ?? 0;
  const markSetupComplete = appContext?.markSetupComplete || (() => {});
  const isClient = (role as unknown) === 0 || (role as unknown) === UserRole.Client;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups & Taxonomies
  const [companySizes, setCompanySizes] = useState<{ id: number; name: string }[]>(COMPANY_SIZES_FALLBACK);
  const [industries, setIndustries] = useState<string[]>(INDUSTRIES_FALLBACK);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  // Client form data
  const [clientData, setClientData] = useState({
    companyName: '',
    companyWebsite: '',
    companySize: 0,
    industry: '',
    location: '',
    companyDescription: '',
  });

  // Freelancer form data
  const [freelancerData, setFreelancerData] = useState<UpdateFreelancerProfileDto>({
    title: '',
    bio: '',
    availability: 0,
    location: '',
    majorId: '',
    categoryIds: [],
    allowSearchEngineIndexing: false,
  });

  // Fetch Lookups for Client
  useEffect(() => {
    if (isClient) {
      void (async () => {
        try {
          const [sizesRes, indRes] = await Promise.all([
            profileGetAPI.getCompanySizes(),
            profileGetAPI.getIndustries(),
          ]);
          if (sizesRes.success && sizesRes.data) setCompanySizes(sizesRes.data);
          if (indRes.success && indRes.data) setIndustries(indRes.data);
        } catch (err) {
          console.error('Failed to load lookups from BE:', err);
        }
      })();
    }
  }, [isClient]);

  // Fetch Majors for Freelancer
  const loadMajors = useCallback(async () => {
    setIsTaxonomyLoading(true);
    setTaxonomyError(null);
    try {
      const response = await jobAPI.getMajors();
      if (!response.success || !response.data) {
        throw new Error(response.message || t('errors.setupFailed'));
      }
      setMajors(response.data);
    } catch (err) {
      setMajors([]);
      setTaxonomyError((err as Error).message);
    } finally {
      setIsTaxonomyLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isClient && role === UserRole.Freelancer) {
      void loadMajors();
    }
  }, [isClient, loadMajors, role]);

  const handleMajorChange = async (majorId: string) => {
    setFreelancerData(current => ({ ...current, majorId, categoryIds: [] }));
    setCategories([]);
    setTaxonomyError(null);
    if (!majorId) return;

    setIsTaxonomyLoading(true);
    try {
      const response = await jobAPI.getCategoriesByMajor(majorId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load categories.');
      }
      setCategories(response.data);
    } catch (err) {
      setTaxonomyError((err as Error).message || 'Failed to load categories.');
    } finally {
      setIsTaxonomyLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFreelancerData(current => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter(id => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const validateCurrentStep = (): boolean => {
    const validationMessages: string[] = [];

    if (isClient) {
      if (step === 1 && (!clientData.companyName.trim() || !clientData.industry)) {
        validationMessages.push(t('errors.clientStep1Required'));
      }
      if (step === 2 && !clientData.location.trim()) validationMessages.push(t('errors.locationRequired'));
    } else {
      if (step === 1 && (!freelancerData.title.trim() || !freelancerData.majorId || freelancerData.categoryIds.length === 0)) {
        validationMessages.push(t('errors.freelancerStep1Required'));
      }
      if (step === 2 && !freelancerData.location.trim()) validationMessages.push(t('errors.locationRequired'));
      if (step === 2 && !freelancerData.bio.trim()) validationMessages.push(t('errors.bioRequired'));
    }

    if (validationMessages.length === 0) return true;
    showValidationToast(validationMessages, { fallback: t('errors.setupFailed') });
    document.querySelector<HTMLElement>('.profile-setup-card input:not([disabled]), .profile-setup-card textarea:not([disabled]), .profile-setup-card button:not([disabled])')?.focus();
    return false;
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const profileData = isClient ? clientData : freelancerData;

      if (isClient) {
        const response = await profilePutAPI.updateClientProfile(profileData as UpdateClientProfileDto);
        if (!response.success) {
          const fallback = response.message || t('errors.setupFailed');
          if (isValidationResponse(response)) showValidationToast(response, { fallback });
          else setError(fallback);
          return;
        }
      } else {
        const response = await profilePutAPI.updateFreelancerProfile(profileData as UpdateFreelancerProfileDto);
        if (!response.success) {
          const fallback = response.message || t('errors.setupFailed');
          if (isValidationResponse(response)) showValidationToast(response, { fallback });
          else setError(fallback);
          return;
        }
      }

      // Update secureStorage session
      const user = secureStorage.getItem<Record<string, unknown>>('gigbridge_user');
      if (user) {
        user.is_setup = true;
        secureStorage.setItem('gigbridge_user', user);

        const session = secureStorage.getItem<{ user: Record<string, unknown>; role: unknown }>('gigbridge_session');
        if (session) {
          session.user.is_setup = true;
          secureStorage.setItem('gigbridge_session', session);
        }
      }

      markSetupComplete();
      navigate(isClient ? '/client/dashboard' : '/freelancer/dashboard');
    } catch (err: unknown) {
      console.error('Setup failed:', err);
      setError(err instanceof Error ? err.message : t('errors.setupFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    role,
    isClient,
    step,
    setStep,
    isSubmitting,
    error,
    clientData,
    setClientData,
    freelancerData,
    setFreelancerData,
    companySizes,
    industries,
    majors,
    categories,
    isTaxonomyLoading,
    taxonomyError,
    loadMajors,
    handleMajorChange,
    toggleCategory,
    // Handlers
    validateCurrentStep,
    handleSubmit,
  };
}
