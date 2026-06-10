// Example Custom Hooks for Jobs Feature

// features/jobs/hooks/useJobFilters.ts

import { useState, useMemo } from 'react';
import type { Job } from '@/types/models/Job';

interface JobFilters {
  category: string;
  skills: string[];
  minBudget: number;
  maxBudget: number;
  searchQuery: string;
}

export function useJobFilters(jobs: Job[]) {
  const [filters, setFilters] = useState<JobFilters>({
    category: '',
    skills: [],
    minBudget: 0,
    maxBudget: Infinity,
    searchQuery: '',
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Category filter
      if (filters.category && job.category !== filters.category) {
        return false;
      }

      // Skills filter
      if (filters.skills.length > 0) {
        const hasRequiredSkills = filters.skills.every(skill =>
          job.skills.includes(skill)
        );
        if (!hasRequiredSkills) return false;
      }

      // Budget filter
      if (job.budget < filters.minBudget || job.budget > filters.maxBudget) {
        return false;
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [jobs, filters]);

  const updateFilter = <K extends keyof JobFilters>(
    key: K,
    value: JobFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      skills: [],
      minBudget: 0,
      maxBudget: Infinity,
      searchQuery: '',
    });
  };

  return {
    filters,
    filteredJobs,
    updateFilter,
    resetFilters,
    totalCount: jobs.length,
    filteredCount: filteredJobs.length,
  };
}

// Usage in component:
// const { filters, filteredJobs, updateFilter, resetFilters } = useJobFilters(allJobs);


// features/jobs/hooks/useJobForm.ts

import { useState } from 'react';

interface JobFormData {
  title: string;
  category: string;
  description: string;
  skills: string[];
  budgetMin: string;
  budgetMax: string;
  jobType: 'fixed';
  deadline: string;
  isRemote: boolean;
}

export function useJobForm() {
  const [form, setForm] = useState<JobFormData>({
    title: '',
    category: '',
    description: '',
    skills: [],
    budgetMin: '',
    budgetMax: '',
    jobType: 'fixed',
    deadline: '',
    isRemote: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});

  const updateField = <K extends keyof JobFormData>(
    key: K,
    value: JobFormData[K]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when field is updated
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    if (!form.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!form.category) {
      newErrors.category = 'Please select a category';
    }

    if (!form.description.trim() || form.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (form.skills.length === 0) {
      newErrors.skills = 'Please add at least one skill';
    }

    if (!form.budgetMin || parseFloat(form.budgetMin) <= 0) {
      newErrors.budgetMin = 'Please enter a valid budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setForm({
      title: '',
      category: '',
      description: '',
      skills: [],
      budgetMin: '',
      budgetMax: '',
      jobType: 'fixed',
      deadline: '',
      isRemote: true,
    });
    setErrors({});
  };

  return {
    form,
    errors,
    updateField,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// Usage:
// const { form, errors, updateField, validate } = useJobForm();
