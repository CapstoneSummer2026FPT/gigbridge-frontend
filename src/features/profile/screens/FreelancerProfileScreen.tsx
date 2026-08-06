import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router';
import {
  Star,
  MapPin,
  ArrowLeft,
  Crown,
  Bookmark,
  BriefcaseBusiness,
  MoreHorizontal,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers,
  AlignLeft,
  Shield,
  GraduationCap,
  Clock,
  Tag,
  Code2,
  Building2,
  FolderGit2,
  Calendar,
  Plus,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { Smooth3DSlideshow } from '../../../shared/components/Smooth3DSlideshow';
import { useApp } from '../../../app/providers/AppProvider';
import { useFreelancerProfile } from '../hooks/useFreelancerProfile';
import { InviteFreelancerToJobModal } from '../components/InviteFreelancerToJobModal';
import { ReportUserModal } from '../components/ReportUserModal';
import { useTranslation } from '../../../hooks/useTranslation';
import { formatGigCoinRange } from '../../../shared/utils/gigcoin';
import type { FreelancerCompletedProjectDto } from '../../../api/contractAPI/GET';
import '../../reviews/styles/reviews-screen.css';
import '../styles/client-profile-screen.css';
import '../styles/freelancer-profile-screen.css';

interface FreelancerCompletedProjectsCarouselProps {
  completedProjects: FreelancerCompletedProjectDto[];
  loading: boolean;
}

function FreelancerCompletedProjectsCarousel({ completedProjects, loading }: FreelancerCompletedProjectsCarouselProps) {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const itemsPerPage = 2;
  const totalSlides = Math.max(1, Math.ceil(completedProjects.length / itemsPerPage));

  useEffect(() => {
    setActiveSlide(0);
  }, [completedProjects.length]);

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

  if (completedProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[140px] my-auto text-center p-6">
        <p className="text-[var(--text-muted)] text-xs font-semibold">
          Chưa có dự án nào hoàn thành gần đây.
        </p>
      </div>
    );
  }

  const currentPair = completedProjects.slice(activeSlide * itemsPerPage, (activeSlide + 1) * itemsPerPage);

  return (
    <div
      className="flex-1 flex flex-col justify-start space-y-3 min-h-[145px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="cp-job-list flex flex-col justify-start items-stretch gap-2.5 transition-all duration-500 ease-in-out flex-1">
        {currentPair.map(proj => {
          const title = proj.jobPost?.title || 'Dự án đã hoàn thành';
          const budgetText = formatGigCoinRange(proj.totalBudget, proj.totalBudget);
          const categoryName = proj.jobPost?.categoryName || proj.jobPost?.majorName || 'Hoàn thành';
          const skillsList = proj.jobPost?.skills?.map(s => s.skillName || s.name || '') || [];
          const targetJobId = proj.jobPostsId || proj.jobPost?.jobPostsId;

          return (
            <div
              key={proj.contractId}
              onClick={() => {
                if (targetJobId) {
                  navigate(`/jobs/${targetJobId}`);
                }
              }}
              className="group relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-[var(--surface)] via-[var(--surface)] to-[var(--surface-muted)]/40 hover:to-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--brand,#494be7)]/60 shadow-2xs hover:shadow-sm transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Left active green indicator bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-300" />

              <div className="space-y-1.5 flex-1 min-w-0 pl-1">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <h3 className="truncate font-black text-xs sm:text-sm text-[var(--text-primary)] group-hover:text-[var(--brand,#494be7)] transition-colors">
                    {title}
                  </h3>
                  <span className="shrink-0 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 shadow-2xs">
                    {budgetText}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-semibold truncate">
                  <span className="shrink-0 text-[var(--text-secondary)] font-bold">
                    Khách hàng: {proj.clientName || 'N/A'}
                  </span>
                  <span className="text-[var(--border-strong,#a1a1aa)]">•</span>
                  <span className="shrink-0">{categoryName}</span>
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
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  index === activeSlide
                    ? 'w-6 bg-emerald-500'
                    : 'w-2 bg-[var(--border-strong,#d4d4d8)] hover:bg-emerald-500/50'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-bold">
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev === 0 ? totalSlides - 1 : prev - 1))}
              className="p-1 hover:text-emerald-500 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {activeSlide + 1} / {totalSlides}
            </span>
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev + 1) % totalSlides)}
              className="p-1 hover:text-emerald-500 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const getAvailabilityText = (avail?: number, t?: (key: string) => string) => {
  if (avail === 0) return t ? t('profile.availability.fullTime') : 'Full-time (40h/week)';
  if (avail === 1) return t ? t('profile.availability.partTime') : 'Part-time (20h/week)';
  if (avail === 2) return t ? t('profile.availability.notAvailable') : 'Not Available';
  return t ? t('profile.availability.available') : 'Available for Hire';
};

export default function FreelancerProfileScreen() {
  const { t } = useTranslation(['profile', 'reviews', 'common']);
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
    freelancerProfileId,
    isSaved,
    isSaving,
    showJobInviteModal,
    showMoreMenu,
    currentPage,
    reviewsList,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    completedProjects,
    completedLoading,
    setShowJobInviteModal,
    setShowMoreMenu,
    setCurrentPage,
    handleSaveFreelancer,
  } = useFreelancerProfile(
    targetId,
    currentUser?.role === 0 && currentUser?.id !== targetId,
  );

  // Reusable GSAP Entrance Hook
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.cp-glow-orb', scale: 0.8, duration: 0.8, stagger: 0.15, clearProps: 'all' },
      { selector: '.cp-hero-card', y: 25, duration: 0.5, clearProps: 'all' },
      { selector: '.cp-card', y: 20, duration: 0.45, stagger: 0.08, clearProps: 'all' },
    ],
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand,#494be7)]"></div>
        </div>
      </AppLayout>
    );
  }

  if (error || !targetId) {
    return (
      <AppLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('profile.edit.loadError')}</h1>
          <p className="text-[var(--text-secondary)]">{error || 'No freelancer profile was selected.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cp-btn-secondary"
          >
            {t('profile.back')}
          </button>
        </div>
      </AppLayout>
    );
  }

  const user = profileData.user;
  const profile = profileData.profile;
  const skills = profileData.skills;
  const experience = profileData.experience;

  const initials = user.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'B';

  const availabilityText = getAvailabilityText(profile.availability, t);

  return (
    <AppLayout>
      <main className="cp-main-wrapper mesh-gradient-bg min-h-[calc(100vh-6rem)] p-3 sm:p-6">
        {/* Ambient Glowing Orbs */}
        <div className="cp-glow-orb cp-glow-orb-1" />
        <div className="cp-glow-orb cp-glow-orb-2" />
        <div className="cp-glow-orb cp-glow-orb-3" />

        <div className="cp-container" ref={containerRef}>
          {/* Top Bar Navigation */}
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
            <div className="cp-hero-left">
              {/* Circle Avatar (Transparent background, brand stroke outline) */}
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
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h1 className="cp-hero-name">
                    {user.full_name || 'Bao Dinh'}
                  </h1>
                  {profile?.showProVerifiedBadge === true && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand,#494be7)] text-white text-[11px] font-extrabold tracking-wide shadow-sm">
                      <Crown size={12} className="fill-current" />
                      <span>{t('profile.proVerified')}</span>
                    </div>
                  )}
                </div>

                {/* Professional Title / Headline */}
                <p className="cp-hero-subtitle">
                  {profile.title || profile.majorName || 'Senior Full-Stack Engineer'}
                </p>

                {/* Location Meta */}
                <div className="cp-meta-row">
                  <div className="cp-meta-item">
                    <MapPin size={15} className="cp-card-icon" />
                    <span>{profile.location || 'Da Nang, Viet Nam'}</span>
                  </div>
                </div>

                {/* Hero Header Major & Availability Pills */}
                <div className="cp-pills-row">
                  <span className="cp-pill-brand inline-flex items-center gap-1.5">
                    <GraduationCap size={13} />
                    {profile.majorName || 'Software Engineering'}
                  </span>
                  <span className="cp-pill-muted inline-flex items-center gap-1.5">
                    <Clock size={13} />
                    {availabilityText}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Block: Action Buttons */}
            <div className="cp-hero-actions">
              {currentUser?.id === targetId ? (
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="cp-btn-secondary"
                >
                  <Edit3 size={15} />
                  <span>{t('profile.editProfile')}</span>
                </button>
              ) : (
                <>
                  {currentUser?.role === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowJobInviteModal(true)}
                      className="cp-btn-secondary bg-[var(--brand,#494be7)] text-white hover:bg-[var(--brand-hover)] border-none"
                    >
                      <BriefcaseBusiness size={15} />
                      <span>{t('profile.inviteToJob', { defaultValue: 'Invite to Job' })}</span>
                    </button>
                  )}

                  {currentUser?.role === 0 && (
                    <button
                      type="button"
                      onClick={() => void handleSaveFreelancer()}
                      disabled={isSaving}
                      className="cp-btn-secondary"
                    >
                      <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                      <span>{isSaved ? t('profile.saved', { defaultValue: 'Saved' }) : t('profile.save', { defaultValue: 'Save' })}</span>
                    </button>
                  )}
                </>
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
                          toast.success(t('profile.linkCopied'));
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

          {/* Row 1: Combined Bio & Categories / Skills Bento Card (Col-12) */}
          <div className="cp-bento-grid">
            <div className="cp-card cp-col-12">
              <div className="cp-bio-company-grid">
                {/* Left Column: Bio / Overview Description */}
                <div className="cp-bio-col">
                  <div className="cp-card-title-group">
                    <AlignLeft size={18} className="cp-card-icon" />
                    <h2 className="cp-card-title">{t('profile.bioOverview')}</h2>
                  </div>
                  <p className="cp-bio-text">
                    {profile.bio || "I'm a professional freelancer & software engineer focused on designing intuitive interfaces, building high-impact digital products, and creating scalable web solutions."}
                  </p>
                </div>

                {/* Right Column: Categories & Skills (Rendered as Pill Badges) */}
                <div className="cp-company-col space-y-5">
                  {/* Section 1: Categories Pills */}
                  <div className="space-y-2">
                    <div className="cp-card-title-group">
                      <Tag size={16} className="cp-card-icon" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('profile.categories')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {profile.categories && profile.categories.length > 0 ? (
                        profile.categories.map((cat, idx) => (
                          <span key={idx} className="cp-pill-brand">
                            {cat.name}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="cp-pill-brand">Web Development</span>
                          <span className="cp-pill-brand">UI/UX Design</span>
                          <span className="cp-pill-brand">Mobile Apps</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Skills Pills */}
                  <div className="space-y-2">
                    <div className="cp-card-title-group">
                      <Code2 size={16} className="cp-card-icon" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('profile.skills')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.length > 0 ? (
                        skills.map((skill, idx) => (
                          <span key={idx} className="cp-pill-muted">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="cp-pill-muted">React</span>
                          <span className="cp-pill-muted">Next.js</span>
                          <span className="cp-pill-muted">TypeScript</span>
                          <span className="cp-pill-muted">Tailwind CSS</span>
                          <span className="cp-pill-muted">Figma</span>
                          <span className="cp-pill-muted">ASP.NET Core</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Elo Point Card & Recently Worked Card */}
          <div className="cp-bento-grid">
            {/* Elo Point Card (Col-4) - Arc Gauge Speedometer Style */}
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
            </div>

            {/* Recently Worked Card (Col-8) */}
            <div className="cp-card cp-col-8 flex flex-col justify-between space-y-5">
              <div className="cp-card-header flex items-center justify-between">
                <div className="cp-card-title-group">
                  <Layers size={18} className="cp-card-icon" />
                  <h2 className="cp-card-title">
                    {t('profile.recentlyWorked')} {completedProjects.length > 0 ? `(${completedProjects.length})` : ''}
                  </h2>
                </div>
              </div>

              {/* Dynamic Completed Projects Carousel */}
              <FreelancerCompletedProjectsCarousel completedProjects={completedProjects} loading={completedLoading} />
            </div>
          </div>

          {/* Row 3: Portfolio & Work Experience Side-by-Side Bento Grid */}
          <div className="cp-bento-grid">
            {/* Portfolio Card (Col-6) */}
            <div className="cp-card cp-col-6 space-y-6 overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="cp-card-title-group">
                  <FolderGit2 size={18} className="cp-card-icon text-[var(--brand,#494be7)]" />
                  <h2 className="cp-card-title">{t('profile.portfolioProjects')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.id === targetId && (
                    <button
                      type="button"
                      onClick={() => navigate('/settings?tab=profile&subtab=portfolio')}
                      className="cp-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold"
                    >
                      <Plus size={13} />
                      <span>{t('profile.addProject')}</span>
                    </button>
                  )}
                  <span className="cp-pill-brand text-xs">
                    {t('profile.projectsCount', { count: profileData.rawPortfolioItems?.length || profileData.portfolio?.length || 0 })}
                  </span>
                </div>
              </div>

              <div className="w-full py-2 flex-1 flex items-center justify-center">
                <Smooth3DSlideshow
                  slides={
                    profileData.rawPortfolioItems && profileData.rawPortfolioItems.length > 0
                      ? profileData.rawPortfolioItems.map((item, idx) => ({
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
                  cardWidth={210}
                  cardHeight={210}
                  radius={4}
                  tilt={10}
                  sideTilt={6}
                  gap={6}
                  autoplay={false}
                />
              </div>
            </div>

            {/* Work Experience Card (Col-6) */}
            <div className="cp-card cp-col-6 space-y-6 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="cp-card-title-group">
                  <Building2 size={18} className="cp-card-icon text-[var(--brand,#494be7)]" />
                  <h2 className="cp-card-title">{t('profile.workExperience')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.id === targetId && (
                    <button
                      type="button"
                      onClick={() => navigate('/settings?tab=profile&subtab=experience')}
                      className="cp-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold"
                    >
                      <Plus size={13} />
                      <span>{t('profile.addPosition')}</span>
                    </button>
                  )}
                  <span className="cp-pill-muted text-xs">
                    {t('profile.positionsCount', { count: profileData.rawWorkExperiences?.length || experience.length || 0 })}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
                {profileData.rawWorkExperiences && profileData.rawWorkExperiences.length > 0 ? (
                  profileData.rawWorkExperiences.map((exp, idx) => (
                    <div
                      key={exp.workExperienceId || idx}
                      className="flex flex-col gap-2 p-3.5 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))] transition-all hover:border-[var(--brand-soft)]"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                          {exp.jobTitle}
                        </h3>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--brand-soft,rgba(73,75,231,0.15))] text-[var(--brand,#494be7)] font-semibold">
                          {exp.companyName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                        <Calendar size={12} className="text-[var(--brand,#494be7)]" />
                        <span>
                          {exp.startDate} - {exp.endDate || 'Present'}
                        </span>
                      </div>

                      {exp.description && (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-0.5 line-clamp-3">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : experience.length > 0 ? (
                  experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))]"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                          {exp.title}
                        </h3>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--brand-soft,rgba(73,75,231,0.15))] text-[var(--brand,#494be7)] font-semibold">
                          {exp.company}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                        <Calendar size={12} className="text-[var(--brand,#494be7)]" />
                        <span>{exp.years}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                    {t('profile.noWorkExperience')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Client Reviews Card (Col-12) */}
          <div className="cp-card cp-col-12 space-y-6">
            <div className="cp-card-title-group">
              <Star size={18} className="text-amber-500 fill-current" />
              <h2 className="cp-card-title">{t('profile.clientReviews')}</h2>
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
                    {t('profile.basedOnReviewsClient', { count: reviewsList.length })}
                  </p>

                  <div className="w-full space-y-2 pt-2">
                    {distribution.map(({ star, count, percentage }) => (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 font-bold text-[var(--text-secondary)]">{star}</span>
                        <div className="flex-1 cp-progress-track">
                          <div
                            className="cp-progress-fill h-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-4 font-bold text-[var(--text-secondary)] text-right">{count}</span>
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
                          role="client"
                          disabled={review.isAnonymous}
                          className="flex items-center gap-3"
                        >
                          <div className="cp-reviewer-avatar">
                            {review.isAnonymous ? 'A' : review.reviewerName.charAt(0)}
                          </div>
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
              <div className="p-8 text-center space-y-2 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))]">
                <Star size={24} className="mx-auto text-[var(--text-muted)] opacity-50" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No client reviews yet</p>
                <p className="text-xs text-[var(--text-muted)]">Reviews will appear here once contracts are completed.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showJobInviteModal && (
          <InviteFreelancerToJobModal
            freelancerName={user.full_name}
            freelancerId={freelancerProfileId}
            onClose={() => setShowJobInviteModal(false)}
          />
        )}
      </AnimatePresence>
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
