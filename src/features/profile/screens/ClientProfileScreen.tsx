import { useNavigate, useParams } from 'react-router';
import { Star, MapPin, CheckCircle, Briefcase, DollarSign, Users, TrendingUp, Shield, Edit3, ArrowLeft, Globe, Mail, Phone } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { DB } from '../../../mock_backend';
import { SEED_CLIENT_PROFILES } from '../../../mock_backend/database/seed';
import '../styles/client-profile-screen.css';

export default function ClientProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const targetId = id || 'u_client_1';
  const user = DB.getUserById(targetId) || DB.getUserById('u_client_1')!;
  const profile = SEED_CLIENT_PROFILES.find(p => p.user_id === targetId) || SEED_CLIENT_PROFILES[0];
  const jobs = DB.getJobsByClient(targetId);

  return (
    <AppLayout>
      <div className="client-profile-wrapper">
        {/* Header with Background */}
        <div className="client-profile-header-bg">
          <button onClick={() => navigate(-1)} className="client-profile-back-btn">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => navigate(`/profile/client/${user.id}/edit`)} className="client-profile-edit-btn">
            Edit Profile
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* Profile Card */}
          <div className="client-profile-card glass-card -mt-20 mb-8">
            <div className="client-profile-card-content">
              {/* Avatar */}
              <div className="client-profile-avatar-container">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                  alt={user.full_name}
                  className="client-profile-avatar"
                />
                <div className="client-profile-badge-verified">
                  <CheckCircle size={20} className="text-green" />
                </div>
              </div>

              {/* Info */}
              <div className="client-profile-card-info">
                <h1 className="client-profile-name">{user.full_name}</h1>
                <p className="client-profile-company">{profile?.company_name || 'Company Name'}</p>
                
                <div className="client-profile-meta-info">
                  <div className="client-profile-meta-item">
                    <MapPin size={14} className="text-cyan" />
                    <span>{profile?.location || 'Remote'}</span>
                  </div>
                  <div className="client-profile-meta-item">
                    <Globe size={14} className="text-cyan" />
                    <span>{profile?.company_website || 'website.com'}</span>
                  </div>
                  <div className="client-profile-meta-item">
                    <CheckCircle size={14} className="text-green" />
                    <span>Payment Verified</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="client-profile-quick-stats">
                  <div className="client-profile-quick-stat">
                    <p className="text-2xl font-black text-green">$50K+</p>
                    <p className="text-xs text-secondary">Total Spent</p>
                  </div>
                  <div className="client-profile-quick-stat">
                    <p className="text-2xl font-black text-cyan">12</p>
                    <p className="text-xs text-secondary">Jobs Posted</p>
                  </div>
                  <div className="client-profile-quick-stat">
                    <p className="text-2xl font-black text-purple">25</p>
                    <p className="text-xs text-secondary">Hired</p>
                  </div>
                  <div className="client-profile-quick-stat">
                    <p className="text-2xl font-black text-amber-400">4.8</p>
                    <p className="text-xs text-secondary">Rating</p>
                  </div>
                </div>
              </div>

              {/* Industry & Member Since - Right Side */}
              <div className="client-profile-info-right">
                <div className="client-profile-info-item">
                  <p className="text-xs text-secondary mb-1">Industry</p>
                  <p className="font-semibold text-primary">{profile?.industry || 'Technology'}</p>
                </div>
                <div className="client-profile-info-item">
                  <p className="text-xs text-secondary mb-1">Member Since</p>
                  <p className="font-semibold text-primary">Jan 2024</p>
                </div>
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
                  {profile?.company_description || 'We are a growing tech startup focused on building innovative solutions. We work with talented developers and designers to create world-class products.'}
                </p>
              </div>

              {/* Active Jobs Section */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-cyan" />
                  Active Jobs
                </h2>
                <div className="space-y-3">
                  {jobs.slice(0, 5).map(job => (
                    <div 
                      key={job.id}
                      className="client-profile-job-card"
                      onClick={() => navigate(`/jobs/${job.id}`)}>
                      <div className="flex-1">
                        <p className="font-semibold text-primary text-sm">{job.title}</p>
                        <p className="text-xs text-secondary mt-1">{job.description?.substring(0, 100)}...</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-cyan">${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}</span>
                          <span className={`text-xs badge-${job.status === 'open' ? 'green' : 'amber'}`}>{job.status}</span>
                          <span className="text-xs text-secondary">{job.proposalCount} proposals</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <TrendingUp size={16} className="text-cyan" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Badges Section */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-cyan" />
                  Trust & Verification
                </h2>
                <div className="client-profile-badges-grid">
                  {[
                    { label: 'Identity Verified', color: '#22C55E', icon: <CheckCircle size={16} /> },
                    { label: 'Payment Verified', color: '#0077FF', icon: <DollarSign size={16} /> },
                    { label: 'Top Client', color: '#F59E0B', icon: <Star size={16} /> },
                    { label: 'Repeat Hirer', color: '#9F4BFF', icon: <Users size={16} /> },
                  ].map(badge => (
                    <div key={badge.label} className="client-profile-badge" style={{ borderColor: `${badge.color}33` }}>
                      <div style={{ color: badge.color }}>{badge.icon}</div>
                      <span className="text-xs font-medium text-primary">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Sidebar */}
            <div className="space-y-6">
              {/* Company Stats Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Company Stats</h3>
                <div className="space-y-4">
                  <div className="client-profile-stat-row">
                    <span className="text-xs text-secondary">Total Spent</span>
                    <span className="font-bold text-green">$50K+</span>
                  </div>
                  <div className="client-profile-stat-row">
                    <span className="text-xs text-secondary">Active Jobs</span>
                    <span className="font-bold text-cyan">{jobs.length}</span>
                  </div>
                  <div className="client-profile-stat-row">
                    <span className="text-xs text-secondary">Hire Rate</span>
                    <span className="font-bold text-green">82%</span>
                  </div>
                  <div className="client-profile-stat-row">
                    <span className="text-xs text-secondary">Avg Rating</span>
                    <span className="font-bold text-amber-400">4.8/5</span>
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Contact Info</h3>
                <div className="space-y-3">
                  <div className="client-profile-contact-row">
                    <Mail size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{user.email}</span>
                  </div>
                  <div className="client-profile-contact-row">
                    <Phone size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{user.phone_number || '+1 (555) 123-4567'}</span>
                  </div>
                  <div className="client-profile-contact-row">
                    <MapPin size={14} className="text-cyan" />
                    <span className="text-xs text-secondary">{profile?.location || 'Remote'}</span>
                  </div>
                </div>
              </div>

              {/* Ratings Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Client Ratings</h3>
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#F59E0B" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-lg font-bold text-primary">4.8/5</p>
                <p className="text-xs text-secondary mt-1">Based on 24 reviews</p>
              </div>

              {/* Company Size Card */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-primary mb-4">Company Info</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-secondary mb-1">Company Size</p>
                    <p className="text-sm font-semibold text-primary">Small Team (10-50)</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary mb-1">Website</p>
                    <p className="text-sm font-semibold text-cyan underline cursor-pointer">
                      {profile?.company_website || 'website.com'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
