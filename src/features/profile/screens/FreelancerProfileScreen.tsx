import { useNavigate, useParams } from 'react-router';
import { Star, MapPin, CheckCircle, Globe, Mail, Phone, ArrowLeft, Crown, AlertCircle, Shield, FileText, Download, Bookmark, Video, X, MessageSquare, BriefcaseBusiness } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import { MOCK_BROWSE_JOBS } from '../../jobs/mock/data-for-BrowseJobsScreen';
import { getStoredReviews } from '../../reviews/mock/data-for-Reviews';
import { InviteFreelancerToJobModal, type InviteFreelancerData } from '../components/InviteFreelancerToJobModal';
import '../../reviews/styles/reviews-screen.css';
import '../styles/freelancer-profile-screen.css';

export default function FreelancerProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useApp();

  const targetId = id || 'u_freelancer_1';
  const user = DB.getUserById(targetId) || DB.getUserById('u_freelancer_1')!;
  const profile = SEED_FREELANCER_PROFILES.find(p => p.user_id === targetId) || SEED_FREELANCER_PROFILES[0];

  // Mock premium/vacation status
  const [isPremium] = useState(true); // Mock: user is premium
  const [isIdentityVerified] = useState(true); // Mock: identity verified
  const [isOnVacation, setIsOnVacation] = useState(false);
  
  // Trust score and CV
  const [trustScore] = useState(92); // Mock: trust score 0-100
  const [cvFile] = useState<{ name: string; url: string } | null>({
    name: 'john_doe_resume.pdf',
    url: '#'
  });

  // Bookmark functionality
  const [isSaved, setIsSaved] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJobInviteModal, setShowJobInviteModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [sentInvites, setSentInvites] = useState<string[]>([]);
  const [sentJobInvites, setSentJobInvites] = useState<string[]>([]);
  const openClientJobs = MOCK_BROWSE_JOBS.filter(job => job.status === 'open').map(job => ({
    id: job.id,
    title: job.title,
    status: job.status,
  }));
  
  const isAlreadyInvitedToJob = (jobId: string): boolean => {
    const inviteKey = `${targetId}_${jobId}`;
    return sentJobInvites.includes(inviteKey);
  };
  const profileReviews = getStoredReviews()
    .filter(review => review.revieweeId === targetId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const averageRating = profileReviews.length
    ? profileReviews.reduce((sum, review) => sum + review.rating, 0) / profileReviews.length
    : 0;

  const handleSaveFreelancer = () => {
    setIsSaved(!isSaved);
  };

  const handleSendInterviewInvite = () => {
    setInviteError('');
    setInviteSuccess('');

    if (user.is_active === false) {
      setInviteError('MSG30: This account was being banned!');
      return;
    }

    if (openClientJobs.length === 0) {
      setInviteError('MSG62: Please create a job post first');
      return;
    }

    if (!selectedJobId) {
      setInviteError('Please select a job post');
      return;
    }

    const inviteKey = `${targetId}_${selectedJobId}`;
    if (sentInvites.includes(inviteKey)) {
      setInviteError('An interview invitation was already sent for this freelancer and job.');
      return;
    }

    setSentInvites(prev => [...prev, inviteKey]);
    setInviteSuccess('Interview invitation sent. The freelancer will receive a notification and can accept or decline within 7 days.');
    setTimeout(() => setShowInviteModal(false), 1200);
  };

  const handleSendJobInvite = async (data: InviteFreelancerData) => {
    const inviteKey = `${data.freelancerId}_${data.jobId}`;
    
    if (sentJobInvites.includes(inviteKey)) {
      throw new Error('This freelancer was already invited to this job.');
    }

    setSentJobInvites(prev => [...prev, inviteKey]);
    // Could add API call here
  };

  const mockSkills = ['React', 'TypeScript', 'Node.js', 'UI/UX Design', 'Figma', 'Tailwind CSS'];
  const mockExperience = [
    { company: 'Tech Startup', title: 'Senior Developer', years: '2021-Present' },
    { company: 'Design Agency', title: 'Full Stack Developer', years: '2019-2021' },
  ];
  const mockPortfolio = [
    { title: 'E-Commerce Platform', tech: 'React, Node.js, MongoDB', image: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop' },
    { title: 'SaaS Dashboard', tech: 'React, TypeScript, AWS', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop' },
    { title: 'Mobile App UI', tech: 'Figma, Prototyping', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop' },
  ];
  const mockCertificates = [
    { title: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', issue_date: '2023-05-15', expiry_date: '2025-05-15', credential_url: 'https://aws.amazon.com/certification' },
    { title: 'Google Cloud Professional Data Engineer', issuer: 'Google Cloud', issue_date: '2023-01-10', expiry_date: null, credential_url: 'https://cloud.google.com/certification' },
  ];

  return (
    <AppLayout>
      <div className="freelancer-profile-wrapper">
        {/* Header with Background */}
        <div className="freelancer-profile-header-bg">
          <button onClick={() => navigate(-1)} className="freelancer-profile-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="freelancer-profile-actions-container">
            {currentUser?.role !== 1 && (
              <button 
                onClick={handleSaveFreelancer}
                className={`freelancer-profile-save-btn ${isSaved ? 'saved' : ''}`}
                title={isSaved ? 'Remove from saved' : 'Save freelancer'}
              >
                <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}
            {currentUser?.role === 0 && (
              <button onClick={() => navigate(`/messages?user=${user.id}`)} className="freelancer-profile-save-btn">
                <MessageSquare size={20} />
                <span>Message</span>
              </button>
            )}
            {currentUser?.role === 0 && (
              <button onClick={() => setShowJobInviteModal(true)} className="freelancer-profile-invite-job-btn">
                <BriefcaseBusiness size={20} />
                <span>Invite to Job</span>
              </button>
            )}
            {currentUser?.role === 0 && (
              <button onClick={() => setShowInviteModal(true)} className="freelancer-profile-save-btn">
                <Video size={20} />
                <span>Invite to Interview</span>
              </button>
            )}
            <button onClick={() => navigate(`/profile/freelancer/${user.id}/edit`)} className="freelancer-profile-edit-btn">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* Profile Card */}
          <div className="freelancer-profile-card">
            <div className="freelancer-profile-card-content">
              {/* Avatar */}
              <div className="freelancer-profile-avatar-container">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
                  alt={user.full_name}
                  className="freelancer-profile-avatar"
                />
                <div className="freelancer-profile-badge-verified">
                  <CheckCircle size={20} />
                </div>
              </div>

              {/* Info */}
              <div className="freelancer-profile-card-info">
                <h1 className="freelancer-profile-name">
                  {user.full_name}
                  {isPremium && isIdentityVerified && (
                    <span className="freelancer-profile-pro-verified-badge" title="Pro Verified Freelancer">
                      <Crown size={14} /> Pro Verified
                    </span>
                  )}
                  {isOnVacation && (
                    <span className="freelancer-profile-vacation-badge" title="On Vacation">
                      <AlertCircle size={14} /> On Vacation
                    </span>
                  )}
                </h1>
                <p className="freelancer-profile-title-text">{profile?.title || 'Senior Developer'}</p>
                
                <div className="freelancer-profile-meta-info">
                  <div className="freelancer-profile-meta-item">
                    <MapPin size={14} className="text-cyan" />
                    <span>{profile?.location || 'Remote'}</span>
                  </div>
                  <div className="freelancer-profile-meta-item">
                    <Globe size={14} className="text-cyan" />
                    <span>Worldwide</span>
                  </div>
                  <div className="freelancer-profile-meta-item">
                    <CheckCircle size={14} className="text-green" />
                    <span>Verified</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="freelancer-profile-quick-stats">
                  <div className="freelancer-profile-quick-stat">
                    <p>4.9</p>
                    <p>Rating</p>
                  </div>
                  <div className="freelancer-profile-quick-stat">
                    <p>45</p>
                    <p>Jobs Done</p>
                  </div>
                  <div className="freelancer-profile-quick-stat">
                    <p>98%</p>
                    <p>Success</p>
                  </div>
                </div>
              </div>

              {/* Hourly Rate - Right Side */}
              <div className="freelancer-profile-rate-container">
                <p>Hourly Rate</p>
                <p>${profile?.hourly_rate || 75}<span>/hr</span></p>
                <p>in VND</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-primary mb-4">About</h2>
                <p className="text-sm leading-relaxed text-secondary">
                  {profile?.bio || 'Experienced full-stack developer with 8+ years of expertise in building scalable web applications. Specialized in React, Node.js, and modern cloud technologies. Passionate about clean code and user experience.'}
                </p>
              </div>

              {/* CV Section */}
              {cvFile && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-cyan" />
                    Resume/CV
                  </h2>
                  <div className="freelancer-profile-cv-card">
                    <div className="freelancer-profile-cv-icon">
                      <FileText size={28} />
                    </div>
                    <div className="freelancer-profile-cv-info">
                      <p>{cvFile.name}</p>
                      <p>PDF Document</p>
                    </div>
                    <button className="freelancer-profile-cv-download-btn" title="Download CV">
                      <Download size={18} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Skills Section */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-primary mb-4">Skills</h2>
                <div className="freelancer-profile-skills">
                  {mockSkills.map(skill => (
                    <div key={skill} className="freelancer-profile-skill-badge">
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience Section */}
              <div className="glass-card p-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Work Experience</h2>
                  <button 
                    onClick={() => navigate('/profile/manage-content?tab=experience')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'var(--gb-cyan, #0077FF)',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0056cc';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--gb-cyan, #0077FF)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Manage
                  </button>
                </div>
                <div className="experience-timeline-track">
                  {mockExperience.map((exp, idx) => (
                    <div key={idx} className="freelancer-profile-experience-item">
                      <div className="freelancer-profile-experience-dot" />
                      <div>
                        <p className="font-semibold text-primary">{exp.title}</p>
                        <p className="text-sm text-secondary">{exp.company}</p>
                        <p className="text-xs text-secondary mt-1">{exp.years}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio Section */}
              <div className="glass-card p-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Portfolio</h2>
                  <button 
                    onClick={() => navigate('/profile/manage-content?tab=portfolio')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'var(--gb-cyan, #0077FF)',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0056cc';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--gb-cyan, #0077FF)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Manage
                  </button>
                </div>
                <div className="freelancer-profile-portfolio-grid">
                  {mockPortfolio.map((project, idx) => (
                    <div key={idx} className="freelancer-profile-portfolio-card">
                      <div className="freelancer-profile-portfolio-image-wrapper">
                        <img 
                          src={project.image}
                          alt={project.title}
                          className="freelancer-profile-portfolio-image"
                        />
                      </div>
                      <div className="freelancer-profile-portfolio-card-info-block">
                        <p className="font-semibold text-primary text-sm">{project.title}</p>
                        <p className="text-xs text-secondary mt-2">{project.tech}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificates Section */}
              <div className="glass-card p-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Certificates & Credentials</h2>
                  <button 
                    onClick={() => navigate('/profile/manage-content?tab=certificates')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'var(--gb-cyan, #0077FF)',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0056cc';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--gb-cyan, #0077FF)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Manage
                  </button>
                </div>
                <div className="space-y-3">
                  {mockCertificates.map((cert, idx) => (
                    <div key={idx} className="freelancer-profile-cert-item p-3">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                        <div className="flex-1">
                          <p className="font-semibold text-primary text-sm">{cert.title}</p>
                          <p className="text-xs text-secondary mt-1">{cert.issuer}</p>
                          <p className="text-xs text-secondary mt-1">
                             Issued: {new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {cert.expiry_date && ` • Expires: ${new Date(cert.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan text-xs font-semibold hover:underline whitespace-nowrap"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="profile-reviews-card">
                <h2>Reviews</h2>
                <div className="profile-review-summary">
                  <div className="profile-review-score">{averageRating.toFixed(1)}</div>
                  <div>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = profileReviews.filter(review => review.rating === star).length;
                      return (
                        <div key={star} className="profile-rating-bar">
                          <span>{star}★</span>
                          <div><i style={{ width: `${profileReviews.length ? (count / profileReviews.length) * 100 : 0}%` }} /></div>
                          <span>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {profileReviews.map(review => (
                  <div key={review.id} className="profile-review-item">
                    <strong>{review.isAnonymous ? 'Anonymous User' : review.reviewerName}</strong>
                    <div className="profile-review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                    <p>{review.comment}</p>
                  </div>
                ))}
                <button
                  className="review-submit"
                  onClick={() => navigate(`/reviews/create?contract=contract_1&reviewee=${targetId}`)}
                >
                  Leave Review
                </button>
              </div>
            </div>

            {/* Right - Sidebar */}
            <div className="space-y-6">
              {/* Trust Score Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-cyan" />
                  Trust Score
                </h3>
                <div className="freelancer-profile-trust-score-display-sidebar">
                  <div className="freelancer-profile-trust-score-circle-sidebar">
                    <svg viewBox="0 0 100 100" className="freelancer-profile-trust-score-ring">
                      <defs>
                        <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--gb-cyan, #0077FF)" />
                          <stop offset="100%" stopColor="var(--gb-purple, #9F4BFF)" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="45" className="freelancer-profile-trust-score-bg" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        className="freelancer-profile-trust-score-fill"
                        style={{ 
                          strokeDashoffset: `${283 - (283 * trustScore) / 100}`
                        }}
                      />
                    </svg>
                    <span className="freelancer-profile-trust-score-text-sidebar">{trustScore}</span>
                  </div>
                  <div className="freelancer-profile-trust-score-info-sidebar">
                    <p className="text-xs text-secondary mb-2 text-center">Calculated from:</p>
                    <ul className="text-xs space-y-1">
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan flex-shrink-0" /><span>Completion rate</span></li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-green flex-shrink-0" /><span>Profile complete</span></li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple flex-shrink-0" /><span>Verification</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Availability Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Availability</h3>
                {isOnVacation ? (
                  <div className="freelancer-profile-vacation-mode-card">
                    <AlertCircle size={20} className="text-amber" />
                    <p className="text-sm font-semibold">On Vacation</p>
                    <p className="text-xs mt-1">Profile is temporarily hidden from client searches</p>
                  </div>
                ) : (
                  <div className="freelancer-profile-availability-badge">
                    <CheckCircle size={16} className="text-green" />
                    <span>Available Now</span>
                  </div>
                )}
                <p className="text-xs text-secondary mt-3">Can start immediately</p>
                {currentUser?.id === targetId && (
                  <button
                    onClick={() => setIsOnVacation(!isOnVacation)}
                    className="freelancer-profile-vacation-toggle"
                    title={isPremium ? 'Toggle vacation mode' : 'Premium feature only'}
                    disabled={!isPremium}
                  >
                    {isOnVacation ? 'Return from Vacation' : 'Activate Vacation Mode'}
                  </button>
                )}
              </div>

              {/* Contact Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Contact</h3>
                <div className="space-y-3">
                  <div className="freelancer-profile-contact-row">
                    <Mail size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{user.email}</span>
                  </div>
                  <div className="freelancer-profile-contact-row">
                    <Phone size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{user.phone_number || '+1 (555) 123-4567'}</span>
                  </div>
                  <div className="freelancer-profile-contact-row">
                    <MapPin size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{profile?.location || 'Remote'}</span>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="freelancer-profile-stat-row">
                    <span className="text-xs text-secondary">Total Earned</span>
                    <span className="font-bold text-cyan">$125K+</span>
                  </div>
                  <div className="freelancer-profile-stat-row">
                    <span className="text-xs text-secondary">Response Time</span>
                    <span className="font-bold text-green">2 hours</span>
                  </div>
                  <div className="freelancer-profile-stat-row">
                    <span className="text-xs text-secondary">Repeat Clients</span>
                    <span className="font-bold text-purple">18</span>
                  </div>
                </div>
              </div>

              {/* Reviews Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Reviews</h3>
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#F59E0B" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-lg font-bold text-primary">4.9/5</p>
                <p className="text-xs text-secondary">Based on 45 reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="proposal-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="proposal-modal proposal-job-modal" onClick={event => event.stopPropagation()}>
            <button className="proposal-modal-close" onClick={() => setShowInviteModal(false)}>
              <X size={18} />
            </button>
            <div className="proposal-modal-title">
              <Video size={20} />
              <div>
                <h2>Invite to Interview</h2>
                <p>{user.full_name}</p>
              </div>
            </div>
            <div className="proposal-manage-toolbar">
              <label>
                <span>Job post</span>
                <select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)}>
                  <option value="">Select an open job</option>
                  {openClientJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                </select>
              </label>
            </div>
            <label className="invite-message-field">
              Optional message
              <textarea value={inviteMessage} onChange={event => setInviteMessage(event.target.value)} placeholder="Add a short message for the freelancer..." />
            </label>
            {inviteError && <p className="browse-jobs-error">{inviteError}</p>}
            {inviteSuccess && <p className="invite-success">{inviteSuccess}</p>}
            <button className="job-detail-primary-action" onClick={handleSendInterviewInvite}>
              Send invitation
            </button>
          </div>
        </div>
      )}

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
    </AppLayout>
  );
}
