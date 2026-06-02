import { useNavigate, useParams } from 'react-router';
import { Star, MapPin, CheckCircle, Globe, Mail, Phone, ArrowLeft, Crown, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import '../styles/freelancer-profile-screen.css';

export default function FreelancerProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, role: currentRole } = useApp();

  const targetId = id || 'u_freelancer_1';
  const user = DB.getUserById(targetId) || DB.getUserById('u_freelancer_1')!;
  const profile = SEED_FREELANCER_PROFILES.find(p => p.user_id === targetId) || SEED_FREELANCER_PROFILES[0];

  // Mock premium/vacation status
  const [isPremium] = useState(true); // Mock: user is premium
  const [isIdentityVerified] = useState(true); // Mock: identity verified
  const [isOnVacation, setIsOnVacation] = useState(false);

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
          <button onClick={() => navigate(`/profile/freelancer/${user.id}/edit`)} className="freelancer-profile-edit-btn">
            Edit Profile
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* Profile Card */}
          <div className="freelancer-profile-card glass-card -mt-20 mb-8">
            <div className="freelancer-profile-card-content">
              {/* Avatar */}
              <div className="freelancer-profile-avatar-container">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
                  alt={user.full_name}
                  className="freelancer-profile-avatar"
                />
              </div>

              {/* Info */}
              <div className="freelancer-profile-card-info">
                <h1 className="freelancer-profile-name">
                  {user.full_name}
                  {isPremium && isIdentityVerified && (
                    <span className="freelancer-profile-pro-verified-badge" title="Pro Verified Freelancer">
                      <Crown size={16} /> Pro Verified
                    </span>
                  )}
                  {isOnVacation && (
                    <span className="freelancer-profile-vacation-badge" title="On Vacation">
                      <AlertCircle size={16} /> On Vacation
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
                    <p className="text-2xl font-black text-cyan">4.9</p>
                    <p className="text-xs text-secondary">Rating</p>
                  </div>
                  <div className="freelancer-profile-quick-stat">
                    <p className="text-2xl font-black text-green">45</p>
                    <p className="text-xs text-secondary">Jobs Done</p>
                  </div>
                  <div className="freelancer-profile-quick-stat">
                    <p className="text-2xl font-black text-purple">98%</p>
                    <p className="text-xs text-secondary">Success</p>
                  </div>
                </div>
              </div>

              {/* Hourly Rate - Right Side */}
              <div className="freelancer-profile-rate-container">
                <p className="text-xs text-secondary mb-2">Hourly Rate</p>
                <p className="text-3xl font-black text-cyan">${profile?.hourly_rate || 75}<span className="text-sm">/hr</span></p>
                <p className="text-xs text-secondary mt-1">in VND</p>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Work Experience</h2>
                  <button 
                    onClick={() => navigate('/profile/work-experience')}
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
                <div className="space-y-4">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Portfolio</h2>
                  <button 
                    onClick={() => navigate('/profile/portfolio')}
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
                    <div key={idx} className="freelancer-profile-portfolio-card glass-card overflow-hidden hover:shadow-lg transition-all">
                      <div className="freelancer-profile-portfolio-image-wrapper">
                        <img 
                          src={project.image}
                          alt={project.title}
                          className="freelancer-profile-portfolio-image"
                        />
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-primary text-sm">{project.title}</p>
                        <p className="text-xs text-secondary mt-2">{project.tech}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificates Section */}
              <div className="glass-card p-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="text-lg font-bold text-primary m-0">Certificates & Credentials</h2>
                  <button 
                    onClick={() => navigate('/profile/portfolio')}
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
                    <div key={idx} className="freelancer-profile-cert-item glass-card p-3">
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
            </div>

            {/* Right - Sidebar */}
            <div className="space-y-6">
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
    </AppLayout>
  );
}
