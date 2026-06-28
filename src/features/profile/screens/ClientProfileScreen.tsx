import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Star, MapPin, CheckCircle, Briefcase, Users, TrendingUp, Shield, Edit3, ArrowLeft, Globe, Mail, Phone, MoreVertical, Share2, Flag, ChevronLeft, ChevronRight, X, Bookmark } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { useClientProfile } from '../hooks/useClientProfile';
import { ReportUserModal } from '../components/ReportUserModal';
import { getCompanySizeLabel, CLIENT_TRUST_BADGES } from '../utils/profileUtils';
import '../../reviews/styles/reviews-screen.css';
import '../styles/freelancer-profile-redesign.css';

export default function ClientProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const targetId = id || 'u_client_1';

  const {
    loading,
    profileData,
    eloPoints,
    eloRingPercent,
    isSaved,
    showMoreMenu,
    currentPage,
    reviewsList,
    showReviewModal,
    reviewRating,
    reviewComment,
    reviewAnonymous,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    jobs,
    setIsSaved,
    setShowMoreMenu,
    setCurrentPage,
    setReviewRating,
    setReviewComment,
    setReviewAnonymous,
    setShowReviewModal,
    handleSaveClient,
    handleAddReview,
  } = useClientProfile(targetId, currentUser);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--gb-cyan)]"></div>
        </div>
      </AppLayout>
    );
  }

  const user = profileData.user;
  const profile = profileData.profile;

  return (
    <AppLayout>
      <main className="flex-1 py-12">
        <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
          
          {/* Back Button and Breadcrumb */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate(-1)} 
              className="glass-overlay text-on-surface-variant font-label-md text-label-md p-2.5 rounded-lg flex items-center justify-center hover:bg-surface/80 transition-all cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-body-md text-on-surface-variant font-medium">Back to search</span>
          </div>

          {/* Header Section */}
          <header className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-surface-container-lowest shadow-sm flex-shrink-0">
                <img 
                  alt={`Profile picture of ${user.full_name}`} 
                  className="w-full h-full rounded-full object-cover" 
                  src={user.avatar || profile?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"} 
                />
              </div>
              <div>
                <h1 className="font-display-lg text-display-lg text-on-surface mb-1">{user.full_name}</h1>
                <p className="font-headline-sm text-headline-sm text-on-surface-variant mb-2">
                  {profile?.company_name || 'Company Name'}
                </p>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--gb-cyan)] text-white font-label-md text-[12px] font-bold tracking-wide shadow-sm mb-4">
                  <CheckCircle size={14} className="text-white fill-current" />
                  Payment Verified
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={18} className="text-[var(--gb-cyan)]" />
                    <span className="font-label-md text-label-md">{profile?.location || 'San Francisco, CA'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe size={18} className="text-[var(--gb-cyan)]" />
                    <span className="font-label-md text-label-md">{profile?.company_website || 'website.com'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <Star size={18} className="fill-current text-yellow-500" />
                    <span className="font-label-md text-label-md text-on-surface">
                      {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}{' '}
                      <span className="text-on-surface-variant font-normal">({reviewsList.length} reviews)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full lg:w-auto">
              <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Total Spent</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">$50K+</p>
                </div>
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Jobs Posted</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">{jobs.length}</p>
                </div>
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Hire Rate</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">82%</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row flex-nowrap gap-3 overflow-x-auto scrollbar-hide justify-start lg:justify-end items-center w-full lg:w-auto py-1">
                {currentUser?.id === targetId ? (
                  <button 
                    onClick={() => navigate(`/profile/client/${user.id}/edit`)}
                    className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm cursor-pointer border border-transparent flex-shrink-0"
                  >
                    <Edit3 size={18} />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleSaveClient} 
                      className={`glass-overlay font-label-md text-label-md px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-surface/80 transition-colors cursor-pointer flex-shrink-0 ${isSaved ? 'text-[var(--gb-cyan)] border-[var(--gb-cyan)]/50' : 'text-on-surface-variant'}`}
                    >
                      <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  </>
                )}

                {currentUser?.id !== user.id && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    disabled={reportSubmitted}
                    className="glass-overlay text-error font-label-md text-label-md px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-error-container/10 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-60"
                  >
                    <Flag size={18} />
                    {reportSubmitted ? 'Report submitted' : 'Report User'}
                  </button>
                )}
                
                {/* More dropdown */}
                <div className="relative flex-shrink-0">
                  <button 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="glass-overlay text-on-surface-variant font-label-md text-label-md px-3 py-2.5 rounded-lg flex items-center justify-center hover:bg-surface/80 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-32 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg opacity-100 visible transition-all z-20 overflow-hidden">
                        <button 
                          onClick={() => {
                            setShowMoreMenu(false);
                            navigator.clipboard.writeText(window.location.href);
                            alert('Link copied to clipboard!');
                          }}
                          className="w-full text-left px-4 py-2 text-body-md text-on-surface-variant hover:bg-surface-container-low flex items-center gap-2 transition-colors border-b border-outline-variant cursor-pointer"
                        >
                          <Share2 size={16} />
                          Share
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Bento Grid Content */}
          <div className="grid-bento items-start">
            
            {/* About - Full Width */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-12 flex flex-col justify-start">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">About</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {profile?.company_description || 'We are a growing tech startup focused on building innovative solutions. We work with talented developers and designers to create world-class products.'}
              </p>
            </div>

            {/* Company Info */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col justify-start h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Company Info</h2>
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                  <MapPin size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Location</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium">{profile?.location || 'Remote'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                  <Globe size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Website</p>
                    <a href={profile?.company_website || '#'} target="_blank" rel="noopener noreferrer" className="font-body-md text-body-md text-[var(--gb-cyan)] hover:underline font-medium break-all">
                      {profile?.company_website || 'website.com'}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                  <Users size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Company Size</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium">{getCompanySizeLabel(profile?.company_size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                  <Briefcase size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Industry</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium">{profile?.industry || 'Technology'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                  <Mail size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Email Address</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium break-all">{user.email}</p>
                  </div>
                </div>
                {user.phone_number && (
                  <div className="flex items-center gap-3 py-1 text-on-surface-variant">
                    <Phone size={16} className="text-[var(--gb-cyan)] flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant/70">Phone Number</p>
                      <p className="font-body-md text-body-md text-on-surface font-medium">{user.phone_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ELO / ELO Points */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center text-center h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface w-full text-left mb-6">ELO Points</h2>
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="trustGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--gb-cyan)" />
                      <stop offset="100%" stopColor="var(--gb-purple)" />
                    </linearGradient>
                  </defs>
                  <circle className="score-circle drop-shadow-lg" cx="50" cy="50" fill="transparent" r="42" stroke="url(#trustGradient)" strokeLinecap="round" strokeWidth="8" style={{ '--score-percent': eloRingPercent } as React.CSSProperties}></circle>
                </svg>
                <div className="flex flex-col items-center">
                  <span className="font-display-lg text-[48px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--gb-cyan)] to-[var(--gb-purple)]">
                    {eloPoints}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[var(--gb-cyan)] font-bold">
                <Shield size={16} className="text-[var(--gb-cyan)] fill-current" />
                <span className="font-label-md text-label-md uppercase tracking-wider">ELO Points</span>
              </div>
            </div>

            {/* Company Stats */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col justify-between h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Company Stats</h2>
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface-variant">Total Spent</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">$50K+</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface-variant">Hire Rate</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">82%</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface-variant">Active Jobs</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">{jobs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">Member Since</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">Jan 2024</span>
                </div>
              </div>
            </div>

            {/* Active Jobs */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-8 p-8 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <Briefcase size={20} className="text-[var(--gb-cyan)]" />
                  Active Jobs
                </h2>
                {currentUser?.id === targetId && (
                  <button 
                    onClick={() => navigate('/jobs/create')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer font-label-md"
                  >
                    Post a Job
                  </button>
                )}
              </div>
              
              {jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {jobs.slice(0, 6).map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="border border-outline-variant bg-surface-container-lowest rounded-xl p-5 flex justify-between items-center transition-all hover:border-[var(--gb-cyan)]/50 hover:shadow-md cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-headline-sm text-headline-sm text-on-surface truncate" title={job.title}>
                          {job.title}
                        </p>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-2 mb-3 line-clamp-2">
                          {job.description || 'No description provided.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                          <span className="text-[var(--gb-cyan)] font-bold">
                            ${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            job.status === 'open' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {job.status}
                          </span>
                          <span className="text-on-surface-variant font-medium">
                            {job.proposalCount} proposals
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-[var(--gb-cyan)]">
                        <TrendingUp size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant">
                  <Briefcase size={32} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No active jobs posted yet</p>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col justify-start h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Trust & Verification</h2>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {CLIENT_TRUST_BADGES.map(badge => (
                  <div 
                    key={badge.label} 
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-center hover:border-[var(--gb-cyan)]/30 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center mb-2 ${badge.styleClass}`}>
                      {badge.icon}
                    </div>
                    <span className="font-label-md text-[10px] text-on-surface font-bold break-words w-full">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Freelancer Reviews */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-12 p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Freelancer Reviews</h2>
                {false && currentUser?.role === 1 && (
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                  >
                    Leave a Review
                  </button>
                )}
              </div>

              {reviewsList.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Review Summary */}
                  <div className="flex flex-col items-start w-full lg:w-1/3 bg-surface-container-low p-6 rounded-2xl border border-outline-variant h-fit">
                    <div className="flex items-end gap-3 mb-2">
                      <span className="font-display-lg text-[64px] font-bold text-on-surface leading-none tracking-tighter">
                        {averageRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={24} 
                          className={i < Math.floor(averageRating) ? 'fill-current text-yellow-500' : 'text-outline-variant'}
                        />
                      ))}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-8">Based on {reviewsList.length} reviews</p>
                    
                    <div className="w-full flex flex-col gap-3">
                      {distribution.map(({ star, count, percentage }) => (
                        <div key={star} className="flex items-center gap-3">
                          <span className="font-label-md text-label-md w-4">{star}</span>
                          <div className="flex-1 h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div 
                              className="progress-bar-fill h-full bg-primary rounded-full" 
                              style={{ '--progress-width': `${percentage}%` } as React.CSSProperties}
                            />
                          </div>
                          <span className="font-label-md text-label-md w-4 text-right text-on-surface-variant">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review List */}
                  <div className="flex-1 flex flex-col gap-5">
                    {paginatedReviews.map(review => (
                      <div key={review.id} className="review-card p-6 rounded-2xl border border-outline-variant shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-sm">
                              {review.isAnonymous ? 'A' : review.reviewerName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-label-md text-[16px] text-on-surface font-bold">
                                {review.isAnonymous ? 'Anonymous Reviewer' : review.reviewerName}
                              </h4>
                              <p className="font-body-md text-[13px] text-on-surface-variant mt-0.5">
                                {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center text-yellow-500 bg-surface-container-lowest px-2 py-1 rounded-full border border-outline-variant">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={16} 
                                className={i < review.rating ? 'fill-current text-yellow-500' : 'text-outline-variant'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                          "{review.comment}"
                        </p>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        {[...Array(totalPages)].map((_, idx) => {
                          const pageNum = idx + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold shadow-sm cursor-pointer ${
                                currentPage === pageNum 
                                  ? 'bg-primary text-on-primary font-bold' 
                                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low font-medium'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant">
                  <Star size={32} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No reviews yet</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Write a Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="invite-freelancer-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="invite-freelancer-modal animate-in fade-in zoom-in duration-200 shadow-xl" onClick={event => event.stopPropagation()}>
              <button className="invite-freelancer-close cursor-pointer" onClick={() => setShowReviewModal(false)}>
                <X size={18} />
              </button>
              <div className="invite-freelancer-header">
                <div className="invite-freelancer-title-group">
                  <div className="invite-freelancer-icon">
                    <Star size={24} className="fill-current" />
                  </div>
                  <div>
                    <h2>Write a Review</h2>
                    <p>Share your experience with {user.full_name}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddReview} className="invite-freelancer-content">
                {/* Rating Input */}
                <div className="invite-section">
                  <h3 className="invite-section-title">Rating</h3>
                  <div className="flex gap-2.5 py-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-yellow-500 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star 
                          size={32} 
                          className={star <= reviewRating ? 'fill-current text-yellow-500' : 'text-outline-variant'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="invite-section">
                  <h3 className="invite-section-title">Review Comment</h3>
                  <textarea 
                    value={reviewComment} 
                    onChange={event => setReviewComment(event.target.value)} 
                    placeholder="Write details of your experience working with this client..."
                    required
                    rows={4}
                    className="invite-textarea"
                  />
                </div>

                {/* Anonymous Checkbox */}
                <div className="flex items-center gap-2 pb-2">
                  <input 
                    type="checkbox"
                    id="anonymous-review"
                    checked={reviewAnonymous}
                    onChange={event => setReviewAnonymous(event.target.checked)}
                    className="w-4 h-4 text-[var(--gb-cyan)] rounded border-outline-variant focus:ring-[var(--gb-cyan)] cursor-pointer"
                  />
                  <label htmlFor="anonymous-review" className="font-body-md text-on-surface-variant cursor-pointer select-none">
                    Submit review anonymously
                  </label>
                </div>

                {/* Actions Footer inside Content Container */}
                <div className="flex gap-3 pt-6 border-t border-outline-variant mt-auto">
                  <button 
                    type="button" 
                    onClick={() => setShowReviewModal(false)}
                    className="invite-btn cancel-btn"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="invite-btn submit-btn"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
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
