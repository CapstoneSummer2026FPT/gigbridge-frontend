import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Star, MapPin, Globe, Mail, Phone, ArrowLeft, Crown, AlertCircle, Shield, FileText, Download, Bookmark, BriefcaseBusiness, MoreVertical, Share2, Flag, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { useFreelancerProfile } from '../hooks/useFreelancerProfile';
import { InviteFreelancerToJobModal } from '../components/InviteFreelancerToJobModal';
import { ReportUserModal } from '../components/ReportUserModal';
import '../../reviews/styles/reviews-screen.css';
import '../styles/freelancer-profile-redesign.css';

export default function FreelancerProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const targetId = id || 'u_freelancer_1';

  const {
    loading,
    profileData,
    isPremium,
    isIdentityVerified,
    trustScore,
    cvFile,
    isSaved,
    showJobInviteModal,
    showMoreMenu,
    currentPage,
    reviewsList,
    showReviewModal,
    reviewRating,
    reviewComment,
    reviewAnonymous,
    openClientJobs,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    strokeDashoffset,
    setIsSaved,
    setShowJobInviteModal,
    setShowMoreMenu,
    setCurrentPage,
    setReviewRating,
    setReviewComment,
    setReviewAnonymous,
    setShowReviewModal,
    isAlreadyInvitedToJob,
    handleSaveFreelancer,
    handleSendJobInvite,
    handleAddReview,
  } = useFreelancerProfile(targetId, currentUser);

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
  const profile = profileData.profile as any;
  const mockSkills = profileData.skills;
  const mockExperience = profileData.experience;
  const mockPortfolio = profileData.portfolio;

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
                  src={user.avatar || profile?.avatar || "https://lh3.googleusercontent.com/aida/AP1WRLvTjTa1-3r3tFeq57CEp89G35mBVqejed9NKbNbVSYqTz1LbH4MLhcQR0tL3wByuVcdrfsci217i2j8rESmJYuRlbPU16X1AxClX4_FVYC-BOAGG1aVO6s7mAdYJpEmPQZsZ4gdum6p0pPPr0WcCgjbb1btS02zyXnxi6hlaBOEB3g9P4JoRSI0SoO4Y_Srf5uUzatcd3Yosh7FDMwNK4qMOW7QhofAmJvVUQ-0QI2mcMiszXLGGn5T2ew"}
                />
              </div>
              <div>
                <h1 className="font-display-lg text-display-lg text-on-surface mb-1">{user.full_name}</h1>
                <p className="font-headline-sm text-headline-sm text-on-surface-variant mb-2">
                  {profile?.title || 'Senior Full-Stack React Developer'}
                </p>
                {isPremium && isIdentityVerified && (
                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--gb-cyan)] text-white font-label-md text-[12px] font-bold tracking-wide shadow-sm mb-4">
                    <Crown size={14} className="text-white fill-current" />
                    Pro Verified
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-6 text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={18} className="text-[var(--gb-cyan)]" />
                    <span className="font-label-md text-label-md">{profile?.location || 'San Francisco, CA'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe size={18} className="text-[var(--gb-cyan)]" />
                    <span className="font-label-md text-label-md">Available Worldwide</span>
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
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Hourly Rate</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">${profile?.hourly_rate || 95}</p>
                </div>
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Jobs Done</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">45</p>
                </div>
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col items-center justify-center min-w-[120px]">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Success Rate</p>
                  <p className="font-display-lg text-[32px] text-[var(--gb-cyan)] font-bold">98%</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row flex-nowrap gap-3 overflow-x-auto scrollbar-hide justify-start lg:justify-end items-center w-full lg:w-auto py-1">
                {currentUser?.role === 0 && (
                  <button
                    onClick={() => setShowJobInviteModal(true)}
                    className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm cursor-pointer border border-transparent flex-shrink-0"
                  >
                    <BriefcaseBusiness size={18} />
                    Invite to Job
                  </button>
                )}

                {currentUser?.role !== 1 && (
                  <button
                    onClick={handleSaveFreelancer}
                    className={`glass-overlay font-label-md text-label-md px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-surface/80 transition-colors cursor-pointer flex-shrink-0 ${isSaved ? 'text-[var(--gb-cyan)] border-[var(--gb-cyan)]/50' : 'text-on-surface-variant'}`}
                  >
                    <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
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

            {/* About */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-8 flex flex-col justify-center h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">About</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {profile?.bio || 'I build blazing-fast, scalable web applications with React, Next.js, and Node.js. With 7+ years of experience, I specialize in e-commerce platforms, SaaS products, and AI-powered applications.'}
              </p>
            </div>

            {/* Skills */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {mockSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className={
                      idx < 2
                        ? "bg-[var(--gb-cyan)] text-white font-label-md text-label-md px-4 py-2 rounded-full shadow-sm"
                        : "bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2 rounded-full border border-[var(--gb-cyan)]/25 hover:border-[var(--gb-cyan)]/50 transition-colors"
                    }
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* ELO Score */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center text-center h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface w-full text-left mb-6">ELO Score</h2>
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="eloGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--gb-cyan)" />
                      <stop offset="100%" stopColor="var(--gb-purple)" />
                    </linearGradient>
                  </defs>
                  <circle className="drop-shadow-lg" cx="50" cy="50" fill="transparent" r="42" stroke="url(#eloGradient)" stroke-dasharray="263.89" stroke-dashoffset={strokeDashoffset} strokeLinecap="round" strokeWidth="8"></circle>
                </svg>
                <div className="flex flex-col items-center">
                  <span className="font-display-lg text-[48px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--gb-cyan)] to-[var(--gb-purple)]">
                    {trustScore}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[var(--gb-cyan)] font-bold">
                <CheckCircle size={16} className="text-[var(--gb-cyan)] fill-current" />
                <span className="font-label-md text-label-md uppercase tracking-wider">ELO Rating</span>
              </div>
            </div>

            {/* Profile Statistics */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col justify-between h-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Profile Statistics</h2>
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface-variant">Total Reviews</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">{reviewsList.length}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface-variant">Member Since</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">Jan 2021</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">Response Time</span>
                  <span className="font-headline-sm text-headline-sm text-[var(--gb-cyan)]">1 hour</span>
                </div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Portfolio</h2>
                {currentUser?.role === 1 && (
                  <button
                    onClick={() => navigate('/profile/manage-content?tab=portfolio')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer font-label-md"
                  >
                    Manage
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {mockPortfolio.map((project, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest cursor-pointer"
                  >
                    <div className="aspect-[4/3] bg-surface-container-low p-2">
                      <div
                        className="w-full h-full bg-cover bg-center rounded transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${project.image})` }}
                      />
                    </div>
                    <div className="p-3 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors">
                      <p className="font-label-md text-label-md text-on-surface truncate" title={project.title}>
                        {project.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resume / CV */}
            <div className="bento-card col-span-1 md:col-span-3 lg:col-span-4 flex flex-col justify-start w-full">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Resume / CV</h2>
              <div className="flex flex-col gap-4">
                <div className="h-48 w-full bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden relative group">
                  <div className="absolute inset-0 bg-on-surface/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <FileText size={32} className="text-on-surface-variant" />
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop"
                    alt="CV Template Preview"
                    className="w-full h-full object-cover object-top opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="text-secondary flex-shrink-0" />
                    <span className="font-body-md text-on-surface font-medium truncate" title={cvFile?.name || "john_doe_resume.pdf"}>
                      {cvFile?.name || "john_doe_resume.pdf"}
                    </span>
                  </div>
                  {cvFile && (
                    <a
                      href={cvFile.url}
                      download
                      className="bg-primary text-on-primary font-label-md px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Work Experience */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-8 p-8 w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Work Experience</h2>
                {currentUser?.role === 1 && (
                  <button
                    onClick={() => navigate('/profile/manage-content?tab=experience')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer font-label-md"
                  >
                    Manage
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-6">
                {mockExperience.map((exp, idx) => (
                  <div key={idx} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">{exp.title}</h3>
                        <p className="font-body-md text-body-md text-on-surface-variant">{exp.company}, {exp.years}</p>
                      </div>
                    </div>
                    {idx < mockExperience.length - 1 && <div className="h-px w-full bg-outline-variant" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Client Reviews */}
            <div className="bento-card col-span-1 md:col-span-6 lg:col-span-12 p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Client Reviews</h2>
                {currentUser?.role === 0 && (
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
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${percentage}%` }}
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
                              className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold shadow-sm cursor-pointer ${currentPage === pageNum
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

      {/* Modals */}
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
                    placeholder="Write details of your experience working with this freelancer..."
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

      <AnimatePresence>
        {showJobInviteModal && (
          <InviteFreelancerToJobModal
            freelancerName={user.full_name}
            freelancerId={targetId}
            availableJobs={openClientJobs}
            onClose={() => setShowJobInviteModal(false)}
            onSubmit={handleSendJobInvite}
            isAlreadyInvited={isAlreadyInvitedToJob}
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
