import { useRef, useState } from 'react';
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
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { useApp } from '../../../app/providers/AppProvider';
import { useClientProfile } from '../hooks/useClientProfile';
import { ReportUserModal } from '../components/ReportUserModal';
import { getCompanySizeLabel } from '../utils/profileUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../../reviews/styles/reviews-screen.css';
import '../styles/client-profile-screen.css';
import '../styles/freelancer-profile-screen.css';

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
    setShowMoreMenu,
    setCurrentPage,
  } = useClientProfile(targetId);

  // GSAP Entrance Animation with clearProps for 100% Perfect Alignment
  useGSAP(
    () => {
      if (!loading && profileData) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(
          '.cp-hero-card',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.45, clearProps: 'all' }
        )
        .fromTo(
          '.cp-avatar-circle',
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.7)', clearProps: 'all' },
          '-=0.25'
        )
        .fromTo(
          '.cp-card',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, clearProps: 'all' },
          '-=0.2'
        );
      }
    },
    { scope: containerRef, dependencies: [loading, profileData] }
  );

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
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Client profile unavailable</h1>
          <p className="text-[var(--text-secondary)]">{error || 'No client profile was selected.'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-[var(--brand,#494be7)] px-5 py-2.5 font-bold text-white shadow-md hover:bg-[var(--brand-hover,#3f41d0)] transition-all cursor-pointer"
          >
            Go back
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
              <span>Back</span>
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
                    {getCompanySizeLabel(profile.company_size) || 'UI/UX Designer'}
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
                  <span>Edit Profile</span>
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
                          alert('Link copied to clipboard!');
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

          {/* Bento Grid System */}
          <div className="cp-bento-grid">
            {/* Combined Bio & Company Info Card (Col-12) */}
            <div className="cp-card cp-col-12">
              <div className="cp-bio-company-grid">
                {/* Left Column: Bio Description */}
                <div className="cp-bio-col">
                  <div className="cp-card-title-group">
                    <AlignLeft size={18} className="cp-card-icon" />
                    <h2 className="cp-card-title">Bio & Overview</h2>
                  </div>
                  <p className="cp-bio-text">
                    {profile.company_description || "I'm professional designer & business leader focused on building high-impact digital products and leading innovation."}
                  </p>
                </div>

                {/* Right Column: Company Info List */}
                <div className="cp-company-col">
                  <div className="cp-card-title-group">
                    <Briefcase size={18} className="cp-card-icon" />
                    <h2 className="cp-card-title">Company Info</h2>
                  </div>

                  <div className="cp-info-list">
                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <MapPin size={14} className="cp-card-icon" /> Location
                      </span>
                      <span className="cp-info-val">{profile.location || 'Da Nang, Viet Nam'}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Globe size={14} className="cp-card-icon" /> Website
                      </span>
                      <span className="cp-info-val cp-info-val-brand">
                        {profile.company_website || 'www.uiuxdesign.com'}
                      </span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Users size={14} className="cp-card-icon" /> Company Size
                      </span>
                      <span className="cp-info-val">{getCompanySizeLabel(profile.company_size) || 'UI/UX Designer'}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Briefcase size={14} className="cp-card-icon" /> Industry
                      </span>
                      <span className="cp-info-val">{profile.industry || 'Thiết kế & Sáng tạo số'}</span>
                    </div>

                    <div className="cp-info-item">
                      <span className="cp-info-label">
                        <Mail size={14} className="cp-card-icon" /> Email
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
                  <h2 className="cp-card-title">Elo Point</h2>
                </div>
                <span className="cp-pill-brand">
                  Verified
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
                  <span className="fp-arc-label">PROFILE STRENGTH</span>
                </div>
              </div>
            </div>

            {/* Job List Card (Col-8) */}
            <div className="cp-card cp-col-8 flex flex-col justify-between space-y-5">
              <div className="cp-card-header">
                <div className="cp-card-title-group">
                  <JobIcon size={18} className="cp-card-icon" />
                  <h2 className="cp-card-title">Job List</h2>
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

              {/* Job Cards */}
              <div className="cp-job-list">
                {/* Sample Job Card 1 */}
                <div className="cp-job-item">
                  <div className="space-y-1.5 flex-1">
                    <h3 className="cp-job-title">
                      Web Dev
                    </h3>
                    <p className="cp-job-meta">
                      $5 - $15 • Fixed Price • Remote
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

                {/* Sample Job Card 2 */}
                <div className="cp-job-item">
                  <div className="space-y-1.5 flex-1">
                    <h3 className="cp-job-title">
                      Web Dev
                    </h3>
                    <p className="cp-job-meta">
                      $5 - $15 • Fixed Price • Remote
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
              </div>
            </div>
          </div>

          {/* Row 3: Client Reviews Card */}
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
                    Based on {reviewsList.length} reviews from freelancers
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
                          role="freelancer"
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
