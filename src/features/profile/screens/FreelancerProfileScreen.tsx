import { useRef, useState } from 'react';
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
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { Smooth3DSlideshow } from '../../../shared/components/Smooth3DSlideshow';
import { useApp } from '../../../app/providers/AppProvider';
import { useFreelancerProfile } from '../hooks/useFreelancerProfile';
import { InviteFreelancerToJobModal } from '../components/InviteFreelancerToJobModal';
import { ReportUserModal } from '../components/ReportUserModal';
import { useTranslation } from '../../../hooks/useTranslation';
import '../../reviews/styles/reviews-screen.css';
import '../styles/client-profile-screen.css';
import '../styles/freelancer-profile-screen.css';

const getAvailabilityText = (avail?: number) => {
  if (avail === 0) return 'Full-time (40h/week)';
  if (avail === 1) return 'Part-time (20h/week)';
  if (avail === 2) return 'Not Available';
  return 'Available for Hire';
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
    setShowJobInviteModal,
    setShowMoreMenu,
    setCurrentPage,
    handleSaveFreelancer,
  } = useFreelancerProfile(
    targetId,
    currentUser?.role === 0 && currentUser?.id !== targetId,
  );

  // GSAP Entrance Timeline Animation (Identical clearProps & stagger logic to ClientProfileScreen)
  useGSAP(
    () => {
      if (containerRef.current && !loading) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(
          '.cp-glow-orb',
          { opacity: 0, scale: 0.8 },
          { opacity: 0.6, scale: 1, duration: 0.8, stagger: 0.15, clearProps: 'all' }
        )
        .fromTo(
          '.cp-hero-card',
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.5, clearProps: 'all' },
          '-=0.5'
        )
        .fromTo(
          '.cp-card',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, clearProps: 'all' },
          '-=0.3'
        );
      }
    },
    { scope: containerRef, dependencies: [loading] }
  );

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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Freelancer profile unavailable</h1>
          <p className="text-[var(--text-secondary)]">{error || 'No freelancer profile was selected.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cp-btn-secondary"
          >
            Go back
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

  const availabilityText = getAvailabilityText(profile.availability);

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
              <span>Back</span>
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
                <div className="flex items-center gap-3">
                  <h1 className="cp-hero-name">
                    {user.full_name || 'Bao Dinh'}
                  </h1>
                  {profile?.showProVerifiedBadge === true && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand,#494be7)] text-white text-[11px] font-extrabold tracking-wide shadow-sm">
                      <Crown size={12} className="fill-current" />
                      <span>Pro Verified</span>
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
                  <span>Edit Profile</span>
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
                          toast.success('Link copied to clipboard!');
                        }}
                        className="cp-dropdown-item"
                      >
                        <Share2 size={14} />
                        Share
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
                          {reportSubmitted ? 'Reported' : 'Report User'}
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
                    <h2 className="cp-card-title">Bio & Overview</h2>
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
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Categories</h3>
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
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Skills</h3>
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
                  <h2 className="cp-card-title">Elo Point</h2>
                </div>
                <span className="cp-pill-brand">
                  Verified
                </span>
              </div>

              {/* SVG Arc Gauge — 290° arc, gap 70° at BOTTOM */}
              {/*
                SVG Y-axis goes DOWN: 0°=right, 90°=BOTTOM, 180°=left, 270°=top
                Gap centered at 90° (bottom):
                  from 90°-35°=55° to 90°+35°=125°
                Arc: from 125° → clockwise → 55°  (= 290°, large arc)

                125° → x=100+80·cos(125°)=54.11,  y=100+80·sin(125°)=165.54  (lower-left)
                 55° → x=100+80·cos(55°)=145.89,  y=100+80·sin(55°)=165.54   (lower-right)

                Path: M 54.11 165.54 A 80 80 0 1 1 145.89 165.54
                large-arc=1, sweep=1 (clockwise)
              */}
              <div className="fp-arc-gauge-wrap">
                <div className="fp-arc-glow" />
                <svg
                  viewBox="0 0 200 200"
                  className="fp-arc-svg"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Background track — 290° */}
                  <path
                    d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
                    fill="none"
                    stroke="var(--border, #E7E8EA)"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  {/* Foreground arc — brand color */}
                  <path
                    d="M 54.11 165.54 A 80 80 0 1 1 145.89 165.54"
                    fill="none"
                    stroke="var(--brand, #494be7)"
                    strokeWidth="13"
                    strokeLinecap="round"
                    className="fp-arc-progress"
                  />
                </svg>
                {/* Score + label, centered inside the circle */}
                <div className="fp-arc-center">
                  <span className="fp-arc-number">{eloPoints || 9999}</span>
                  <span className="fp-arc-label">PROFILE STRENGTH</span>
                </div>
              </div>
            </div>

            {/* Recently Worked Card (Col-8) - Exact Client Profile Job List Format */}
            <div className="cp-card cp-col-8 flex flex-col justify-between space-y-5">
              <div className="cp-card-header">
                <div className="cp-card-title-group">
                  <Layers size={18} className="cp-card-icon" />
                  <h2 className="cp-card-title">Recently Worked</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="text-xs font-bold text-[var(--brand,#494be7)] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                >
                  <span>See more</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Job / Experience List */}
              <div className="cp-job-list">
                {experience.length > 0 ? (
                  experience.map((exp, idx) => (
                    <div key={idx} className="cp-job-item">
                      <div className="space-y-1.5 flex-1">
                        <h3 className="cp-job-title">{exp.title}</h3>
                        <p className="cp-job-meta">
                          $5 - $15 • Fixed Price • {exp.company || 'Remote'} ({exp.years})
                        </p>
                        <div className="cp-job-tags">
                          {['NEXT.JS', 'ASP. NET CORE', 'POSTGRESQL', 'NODE.JS'].map(tag => (
                            <span key={tag} className="cp-job-tag-pill">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/jobs')}
                        className="cp-action-icon-btn"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="cp-job-item">
                      <div className="space-y-1.5 flex-1">
                        <h3 className="cp-job-title">Web Dev</h3>
                        <p className="cp-job-meta">$5 - $15 • Fixed Price • Remote</p>
                        <div className="cp-job-tags">
                          {['NEXT.JS', 'ASP. NET CORE', 'POSTGRESQL', 'NODE.JS'].map(tag => (
                            <span key={tag} className="cp-job-tag-pill">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/jobs')}
                        className="cp-action-icon-btn"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="cp-job-item">
                      <div className="space-y-1.5 flex-1">
                        <h3 className="cp-job-title">Web Dev</h3>
                        <p className="cp-job-meta">$5 - $15 • Fixed Price • Remote</p>
                        <div className="cp-job-tags">
                          {['NEXT.JS', 'ASP. NET CORE', 'POSTGRESQL', 'NODE.JS'].map(tag => (
                            <span key={tag} className="cp-job-tag-pill">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/jobs')}
                        className="cp-action-icon-btn"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Portfolio Card (Coverflow 3D Gallery) (Col-12) */}
          <div className="cp-card cp-col-12 space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="cp-card-title-group">
                <FolderGit2 size={18} className="cp-card-icon text-[var(--brand,#494be7)]" />
                <h2 className="cp-card-title">Portfolio & Projects</h2>
              </div>
              <span className="cp-pill-brand text-xs">
                {profileData.rawPortfolioItems?.length || profileData.portfolio?.length || 0} Projects
              </span>
            </div>

            <div className="w-full py-2">
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
                cardWidth={380}
                cardHeight={340}
                autoplay={false}
              />
            </div>
          </div>

          {/* Row 4: Work Experience Card (Col-12) */}
          <div className="cp-card cp-col-12 space-y-6">
            <div className="flex items-center justify-between">
              <div className="cp-card-title-group">
                <Building2 size={18} className="cp-card-icon text-[var(--brand,#494be7)]" />
                <h2 className="cp-card-title">Work Experience</h2>
              </div>
              <span className="cp-pill-muted text-xs">
                {profileData.rawWorkExperiences?.length || experience.length || 0} Positions
              </span>
            </div>

            <div className="space-y-4">
              {profileData.rawWorkExperiences && profileData.rawWorkExperiences.length > 0 ? (
                profileData.rawWorkExperiences.map((exp, idx) => (
                  <div
                    key={exp.workExperienceId || idx}
                    className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))] transition-all hover:border-[var(--brand-soft)]"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {exp.jobTitle}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--brand-soft,rgba(73,75,231,0.15))] text-[var(--brand,#494be7)] font-semibold">
                          {exp.companyName}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed pt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] shrink-0 self-start md:self-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      <Calendar size={13} className="text-[var(--brand,#494be7)]" />
                      <span>
                        {exp.startDate} - {exp.endDate || 'Present'}
                      </span>
                    </div>
                  </div>
                ))
              ) : experience.length > 0 ? (
                experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-xl bg-[var(--surface-hover,rgba(255,255,255,0.03))] border border-[var(--border,rgba(255,255,255,0.08))]"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {exp.title}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--brand-soft,rgba(73,75,231,0.15))] text-[var(--brand,#494be7)] font-semibold">
                          {exp.company}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] shrink-0">
                      <Calendar size={13} className="text-[var(--brand,#494be7)]" />
                      <span>{exp.years}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-[var(--text-secondary)]">
                  No work experience entries added yet.
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Client Reviews Card (Col-12) */}
          <div className="cp-card cp-col-12 space-y-6">
            <div className="cp-card-title-group">
              <Star size={18} className="text-amber-500 fill-current" />
              <h2 className="cp-card-title">{t('reviews.clientReviews') || 'Client Reviews'}</h2>
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
                    Based on {reviewsList.length} reviews from clients
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
              /* Fallback Demo Review Cards */
              <div className="cp-review-grid">
                <div className="cp-col-4 cp-review-summary-card">
                  <span className="cp-review-score-big">4.8</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className="fill-current text-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    Based on 4 reviews from clients
                  </p>
                </div>

                <div className="cp-col-8 cp-review-list">
                  <div className="cp-review-item-card">
                    <div className="cp-review-item-header">
                      <div className="flex items-center gap-3">
                        <div className="cp-reviewer-avatar">J</div>
                        <div>
                          <h4 className="cp-reviewer-name">Jonathan Gudev</h4>
                          <p className="text-xs font-bold text-[var(--brand,#494be7)]">Bangkiv Software</p>
                        </div>
                      </div>
                      <div className="cp-review-rating-badge">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className="fill-current text-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="cp-review-comment">
                      "Bạn ấy có một kĩ năng code điêu luyện, gõ promt xuất quỷ nhập thần. Đứng đầu trường chuyên Tuyên Quang."
                    </p>
                  </div>

                  <div className="cp-review-item-card">
                    <div className="cp-review-item-header">
                      <div className="flex items-center gap-3">
                        <div className="cp-reviewer-avatar">J</div>
                        <div>
                          <h4 className="cp-reviewer-name">Jonathan Gudev</h4>
                          <p className="text-xs font-bold text-[var(--brand,#494be7)]">Bangkiv Software</p>
                        </div>
                      </div>
                      <div className="cp-review-rating-badge">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className={i < 4 ? 'fill-current text-amber-500' : 'text-[var(--border-strong)]'} />
                        ))}
                      </div>
                    </div>
                    <p className="cp-review-comment">
                      "Bạn ấy có một kĩ năng code điêu luyện, gõ promt xuất quỷ nhập thần. Đứng đầu trường chuyên Tuyên Quang."
                    </p>
                  </div>
                </div>
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
