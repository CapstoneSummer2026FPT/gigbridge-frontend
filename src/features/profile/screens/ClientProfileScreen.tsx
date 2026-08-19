import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Star,
  MapPin,
  Briefcase,
  Users,
  Shield,
  Edit3,
  ArrowLeft,
  Globe,
  Mail,
  MoreHorizontal,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Briefcase as JobIcon,
  AlignLeft,
} from 'lucide-react';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { useApp } from '../../../app/providers/AppProvider';
import { useClientProfile } from '../hooks/useClientProfile';
import { ReportUserModal } from '../components/ReportUserModal';
import { getCompanySizeLabel } from '../utils/profileUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import { formatGigCoinRange } from '../../../shared/utils/gigcoin';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import '../../reviews/styles/reviews-screen.css';
import '../styles/client-profile-screen.css';
import '../styles/freelancer-profile-screen.css';

interface ClientJobCarouselProps {
  jobs: JobPostSummaryDto[];
  loading: boolean;
  isOwner?: boolean;
}

function ClientJobCarousel({ jobs, loading, isOwner }: ClientJobCarouselProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const itemsPerPage = 2;
  const totalSlides = Math.max(1, Math.ceil(jobs.length / itemsPerPage));

  // Reset to slide 0 when jobs list changes
  useEffect(() => {
    setActiveSlide(0);
  }, [jobs.length]);

  // Auto 3s slide rotation
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(timer);
  }, [totalSlides, isPaused]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-[var(--surface-muted)] rounded w-3/4" />
            <div className="h-3 bg-[var(--surface-muted)] rounded w-1/2" />
          </div>
        </div>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-[var(--surface-muted)] rounded w-3/4" />
            <div className="h-3 bg-[var(--surface-muted)] rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[140px] my-auto text-center p-6">
        <p className="text-[var(--text-muted)] text-xs font-semibold">
          {isOwner
            ? t('profile.noOpenJobsOwner', { defaultValue: 'Bạn chưa có công việc nào đang mở.' })
            : t('profile.noOpenJobsClient', { defaultValue: 'Khách hàng chưa có công việc nào đang mở.' })}
        </p>
      </div>
    );
  }

  const currentPair = jobs.slice(activeSlide * itemsPerPage, (activeSlide + 1) * itemsPerPage);

  return (
    <div
      className="flex-1 flex flex-col justify-start space-y-3 min-h-[145px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="cp-job-list flex flex-col justify-start items-stretch gap-2.5 transition-all duration-500 ease-in-out flex-1">
        {currentPair.map(job => {
          const skillsList =
            job.skills?.map((s: any) => s.skillName || s.name || '') || job.skillNames || job.customSkillNames || [];
          const budgetText = formatGigCoinRange(job.budgetMin, job.budgetMax);

          return (
            <div
              key={job.jobPostsId}
              onClick={() => navigate(`/jobs/${job.jobPostsId}`)}
              className="group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[var(--surface)] via-[var(--surface)] to-[var(--surface-muted)]/40 hover:to-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--brand,#494be7)]/60 shadow-2xs hover:shadow-sm transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Left active indicator bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[var(--brand,#494be7)] transition-all duration-300" />

              <div className="space-y-1.5 flex-1 min-w-0 pl-1">
                {/* Title & Budget */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <h3 className="truncate font-black text-xs sm:text-sm text-[var(--text-primary)] group-hover:text-[var(--brand,#494be7)] transition-colors">
                    {job.title}
                  </h3>
                  <span className="shrink-0 text-[11px] font-black text-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.12))] px-2.5 py-0.5 rounded-lg border border-[var(--brand-border,rgba(73,75,231,0.25))] shadow-2xs">
                    {budgetText}
                  </span>
                </div>

                {/* Meta & Skills */}
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-semibold truncate">
                  {(job.categoryName || job.majorName) && (
                    <span className="shrink-0 text-[var(--text-secondary)] font-bold">
                      {job.categoryName || job.majorName}
                    </span>
                  )}
                  {skillsList.length > 0 && (
                    <>
                      <span className="text-[var(--border-strong,#a1a1aa)]">•</span>
                      <div className="flex items-center gap-1 overflow-hidden">
                        {skillsList.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] group-hover:border-[var(--brand,#494be7)]/30 group-hover:text-[var(--brand,#494be7)] transition-colors"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Hover Action Icon */}
              <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] group-hover:bg-[var(--brand,#494be7)] group-hover:text-white group-hover:border-[var(--brand,#494be7)] transition-all duration-300 flex items-center justify-center shadow-2xs">
                <ChevronRight size={15} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination indicators & controls if > 1 slide */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${index === activeSlide
                    ? 'w-6 bg-[var(--brand,#494be7)]'
                    : 'w-2 bg-[var(--border-strong,#d4d4d8)] hover:bg-[var(--brand,#494be7)]/50'
                  }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-bold">
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev === 0 ? totalSlides - 1 : prev - 1))}
              className="p-1 hover:text-[var(--brand,#494be7)] cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {activeSlide + 1} / {totalSlides}
            </span>
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev + 1) % totalSlides)}
              className="p-1 hover:text-[var(--brand,#494be7)] cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientProfileScreen() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const targetId = id || currentUser?.id || '';

  const {
    loading,
    error,
    profileData,
    eloPoints,
    showMoreMenu,
    currentPage,
    reviewsList,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    clientJobs,
    jobsLoading,
    setShowMoreMenu,
    setCurrentPage,
  } = useClientProfile(targetId);

  // Reusable GSAP Entrance Hook
  usePageGSAP({
    containerRef,
    loading: loading || !profileData,
    groups: [
      { selector: '.cp-hero-card', y: 15, duration: 0.45, clearProps: 'all' },
      { selector: '.cp-avatar-circle', scale: 0.7, duration: 0.45, ease: 'back.out(1.7)', clearProps: 'all' },
      { selector: '.cp-card', y: 15, duration: 0.45, stagger: 0.08, clearProps: 'all' },
    ],
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)] bg-[var(--background)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand,#494be7)]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !targetId) {
    return (
      <AppLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center bg-[var(--background)] text-[var(--text-primary)]">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">{t('profile.edit.loadError')}</h1>
          <p className="text-[var(--text-secondary)]">{error || 'No client profile was selected.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-[var(--brand,#494be7)] px-5 py-2.5 font-bold text-white shadow-md hover:bg-[var(--brand-hover,#3f41d0)] transition-all cursor-pointer"
          >
            {t('profile.back')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const user = profileData.user;
  const profile = profileData.profile;
  const initials =
    user.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || '?';

  return (
    <AppLayout>
      <main className="cp-main-wrapper mesh-gradient-bg min-h-[calc(100vh-6rem)] p-3 sm:p-6" ref={containerRef}>
        {/* Ambient Background Glowing Orbs */}
        <div className="cp-glow-orb cp-glow-orb-1" />
        <div className="cp-glow-orb cp-glow-orb-2" />
        <div className="cp-glow-orb cp-glow-orb-3" />

        <div className="cp-container">
          {/* Top Navigation Bar with Back Button */}
          <div className="cp-top-bar">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cp-btn-secondary"
            >
              <ArrowLeft size={16} className="cp-card-icon" />
              <span>{t('profile.back')}</span>
            </button>
          </div>

          {/* Hero Header Section - Transparent Card with Brand Stroke Avatar */}
          <div className="cp-hero-card">
            {/* Left Block: Avatar + Name & Meta Details */}
            <div className="cp-hero-left">
              {/* Circle Avatar (No background, brand stroke outline) */}
              <div className="cp-avatar-circle">
                {user.avatar || profile.avatar ? (
                  <img
                    src={user.avatar || profile.avatar}
                    alt={user.full_name}
                    className="cp-avatar-img"
                  />
                ) : (
                  <div className="cp-avatar-fallback">
                    {initials}
                  </div>
                )}
              </div>

              {/* User Meta Details Block */}
              <div className="cp-hero-details">
                <h1 className="cp-hero-name">
                  {user.full_name || 'Bao Dinh'}
                </h1>

                <p className="cp-hero-subtitle">
                  {profile.company_name || 'UI/UX Design'}
                </p>

                <div className="cp-meta-row">
                  <div className="cp-meta-item">
                    <MapPin size={15} className="cp-card-icon" />
                    <span>{profile.location || 'Da Nang, Viet Nam'}</span>
                  </div>

                  {profile.company_website ? (
                    <a
                      href={profile.company_website.startsWith('http') ? profile.company_website : `https://${profile.company_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-meta-link"
                    >
                      <Globe size={15} />
                      <span>{profile.company_website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ) : (
                    <div className="cp-meta-link">
                      <Globe size={15} />
                      <span>www.uiuxdesign.com</span>
                    </div>
                  )}
                </div>

                <div className="cp-pills-row">
                  <span className="cp-pill-brand">
                    {profile.industry || 'Thiết kế & Sáng tạo số'}
                  </span>

                  <span className="cp-pill-muted">
                    {getCompanySizeLabel(profile.company_size)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Block: Edit Profile & Option Dropdown */}
            <div className="cp-hero-actions">
              {currentUser?.id === targetId && (
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="cp-btn-secondary"
                >
                  <Edit3 size={15} />
                  <span>{t('profile.editProfile')}</span>
                </button>
              )}

              <div className="cp-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="cp-action-icon-btn"
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMoreMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                    <div className="cp-dropdown-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          void navigator.clipboard.writeText(window.location.href);
                          alert(t('profile.linkCopied'));
                        }}
                        className="cp-dropdown-item"
                      >
                        <Share2 size={14} />
                        {t('profile.share')}
                      </button>

                      {currentUser?.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowReportModal(true);
                          }}
                          disabled={reportSubmitted}
                          className="cp-dropdown-item cp-dropdown-item-danger"
                        >
                          <Flag size={14} />
                          {reportSubmitted ? t('profile.reported') : t('profile.reportUser')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bento Grid System */}
          <div className="cp-bento-grid">
            {/* Combined Bio & Company Info Card (Col-12) */}
            <div className="cp-card cp-col-12">
              <div className="cp-bio-company-grid">
                {/* Left Column: Bio Description */}
                <div className="cp-bio-col">
                  <div className="cp-card-title-group">
                    <AlignLeft size={18} className="cp-card-icon" />
                    <h2 className="cp-card-title">{t('profile.bioOverview')}</h2>
                  </div>
                  <p className="cp-bio-text">
                    {profile.company_description || "I'm professional designer & business leader focused on building high-impact digital products and leading innovation."}
                  </p>
                </div>

                {/* Right Column: Company Info List */}
                <div className="cp-company-col">
                  <div className="cp-card-title-group">
                    <Briefcase size={18} className="cp-card-icon" />
                    <h2 className="cp-card-title">{t('profile.companyInfo')}</h2>
                  </div>

                  <div className="cp-info-list">
                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <MapPin size={14} className="cp-card-icon" /> {t('profile.location')}
                      </span>
                      <span className="cp-info-val">{profile.location || 'Da Nang, Viet Nam'}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Globe size={14} className="cp-card-icon" /> {t('profile.website')}
                      </span>
                      <span className="cp-info-val cp-info-val-brand">
                        {profile.company_website || 'www.uiuxdesign.com'}
                      </span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Users size={14} className="cp-card-icon" /> {t('profile.companySize')}
                      </span>
                      <span className="cp-info-val">{getCompanySizeLabel(profile.company_size)}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Briefcase size={14} className="cp-card-icon" /> {t('profile.industry')}
                      </span>
                      <span className="cp-info-val">{profile.industry || 'Thiết kế & Sáng tạo số'}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Mail size={14} className="cp-card-icon" /> {t('profile.email')}
                      </span>
                      <span className="cp-info-val cp-info-val-brand">{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Row 2: Elo Point Card & Job List Card */}
          <div className="cp-bento-grid">
            {/* Elo Point Card (Col-4) — Arc Gauge */}
            <div className="cp-card cp-col-4 cp-elo-wrapper">
              <div className="w-full flex items-center justify-between">
                <div className="cp-card-title-group">
                  <Shield size={18} className="cp-card-icon" />
                  <h2 className="cp-card-title">{t('profile.eloPoint')}</h2>
                </div>
                <span className="cp-pill-brand">
                  {t('profile.verified')}
                </span>
              </div>

              {/* SVG Arc Gauge — 290° arc, gap 70° at bottom */}
              <div className="fp-arc-gauge-wrap">
                <div className="fp-arc-glow" />
                <svg
                  viewBox="0 0 200 200"
                  className="fp-arc-svg"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
                    fill="none"
                    stroke="var(--border, #E7E8EA)"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
                    fill="none"
                    stroke="var(--brand, #494be7)"
                    strokeWidth="13"
                    strokeLinecap="round"
                    className="fp-arc-progress"
                  />
                </svg>
                <div className="fp-arc-center">
                  <span className="fp-arc-number">{eloPoints || 9999}</span>
                  <span className="fp-arc-label">{t('profile.profileStrength')}</span>
                </div>
              </div>

              {currentUser?.id === targetId && (
                <button
                  type="button"
                  onClick={() => navigate('/elo')}
                  className="text-xs font-bold text-[var(--brand,#494be7)] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none mt-3 mx-auto"
                >
                  <span>{t('profile.eloHistoryLink')}</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* Job List Card (Col-8) */}
            <div className="cp-card cp-col-8 flex flex-col justify-between space-y-5">
              <div className="cp-card-header flex items-center justify-between">
                <div className="cp-card-title-group">
                  <JobIcon size={18} className="cp-card-icon" />
                  <h2 className="cp-card-title">
                    {t('profile.jobList')} {clientJobs.length > 0 ? `(${clientJobs.length})` : ''}
                  </h2>
                </div>
                {currentUser?.id === targetId && (
                  <button
                    type="button"
                    onClick={() => navigate('/jobs/post')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand,#494be7)] hover:bg-[var(--brand-hover,#3f41d0)] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer border-none"
                  >
                    <span>+ Đăng công việc</span>
                  </button>
                )}
              </div>

              {/* Dynamic Job Carousel */}
              <ClientJobCarousel jobs={clientJobs} loading={jobsLoading} isOwner={currentUser?.id === targetId} />
            </div>
          </div>

          {/* Row 3: Client Reviews Card */}
          <div className="cp-card cp-col-12 space-y-6">
            <div className="cp-card-title-group">
              <Star size={18} className="text-amber-500 fill-current" />
              <h2 className="cp-card-title">{t('profile.freelancerReviews')}</h2>
            </div>

            {reviewsList.length > 0 ? (
              <div className="cp-review-grid">
                {/* Summary Box (Col-4) */}
                <div className="cp-col-4 cp-review-summary-card">
                  <span className="cp-review-score-big">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={i < Math.floor(averageRating) ? 'fill-current text-amber-500' : 'text-[var(--border-strong)]'}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    {t('profile.basedOnReviewsFreelancer', { count: reviewsList.length })}
                  </p>

                  <div className="w-full space-y-2 pt-2">
                    {distribution.map(({ star, count, percentage }) => (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-0.5 min-w-[24px] font-bold text-[var(--text-secondary)]">
                          <span>{star}</span>
                          <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                        </div>
                        <div className="flex-1 cp-progress-track">
                          <div
                            className="cp-progress-fill transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="min-w-[18px] font-bold text-[var(--text-secondary)] text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Cards (Col-8) */}
                <div className="cp-col-8 cp-review-list">
                  {paginatedReviews.map(review => (
                    <div key={review.id} className="cp-review-item-card">
                      <div className="cp-review-item-header">
                        <UserProfileLink
                          userId={review.reviewerId}
                          role="freelancer"
                          disabled={review.isAnonymous}
                          className="flex items-center gap-3"
                        >
                          <UserAvatar
                            name={review.isAnonymous ? t('reviews.anonymousReviewer') : review.reviewerName}
                            userId={review.isAnonymous ? undefined : review.reviewerId}
                            size="md"
                            className="shrink-0"
                          />
                          <div>
                            <h4 className="cp-reviewer-name">
                              {review.isAnonymous ? t('reviews.anonymousReviewer') : review.reviewerName}
                            </h4>
                            <p className="text-[11px] font-medium text-[var(--text-muted)]">
                              {new Date(review.createdAt).toLocaleDateString(t('common.search') === 'Search' ? 'en-US' : 'vi-VN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            {review.projectTitle && (
                              <p className="text-xs font-bold text-[var(--brand,#494be7)] mt-0.5">
                                {t('reviews.projectContext', { project: review.projectTitle })}
                              </p>
                            )}
                          </div>
                        </UserProfileLink>

                        <div className="cp-review-rating-badge">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              className={i < review.rating ? 'fill-current text-amber-500' : 'text-[var(--border-strong)]'}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Criteria Ratings Breakdown */}
                      <div className="flex flex-wrap gap-3 text-xs font-medium text-[var(--text-secondary)] py-1">
                        {review.communicationRating && <span>Communication: <strong className="text-[var(--text-primary)]">{review.communicationRating}/5</strong></span>}
                        {review.qualityRating && <span>Quality: <strong className="text-[var(--text-primary)]">{review.qualityRating}/5</strong></span>}
                        {review.timelinessRating && <span>Timeliness: <strong className="text-[var(--text-primary)]">{review.timelinessRating}/5</strong></span>}
                      </div>

                      {review.comment && (
                        <p className="cp-review-comment">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="cp-btn-secondary"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="cp-btn-secondary"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Clean Empty State when client has no reviews yet */
              <div className="py-12 text-center bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] flex flex-col items-center justify-center gap-3">
                <Star size={36} className="opacity-40 text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {t('reviews.noReviews') || 'No reviews yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showReportModal && (
        <ReportUserModal
          userId={user.id}
          userName={user.full_name}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setReportSubmitted(true);
            setShowReportModal(false);
          }}
        />
      )}
    </AppLayout>
  );
}
