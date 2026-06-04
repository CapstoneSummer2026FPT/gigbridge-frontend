import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Star, MapPin, TrendingUp, Trash2, AlertCircle, Search } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/saved-freelancers-screen.css';

interface SavedFreelancer {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  title: string;
  location: string;
  hourly_rate: number;
  rating: number;
  jobsCompleted: number;
  successRate: number;
  status: 'active' | 'banned';
  skills: string[];
  isBanned?: boolean;
}

export default function SavedFreelancersScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Mock saved freelancers data
  const [savedFreelancers, setSavedFreelancers] = useState<SavedFreelancer[]>([
    {
      id: 'sf_1',
      user_id: 'u_freelancer_1',
      full_name: 'Jane Smith',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      title: 'Senior React Developer',
      location: 'San Francisco, CA',
      hourly_rate: 75,
      rating: 4.9,
      jobsCompleted: 45,
      successRate: 98,
      status: 'active',
      skills: ['React', 'TypeScript', 'Node.js', 'UI/UX Design'],
    },
    {
      id: 'sf_2',
      user_id: 'u_freelancer_2',
      full_name: 'Mike Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      title: 'Full Stack Developer',
      location: 'New York, NY',
      hourly_rate: 85,
      rating: 4.8,
      jobsCompleted: 62,
      successRate: 96,
      status: 'active',
      skills: ['Python', 'Django', 'React', 'PostgreSQL'],
    },
    {
      id: 'sf_3',
      user_id: 'u_freelancer_3',
      full_name: 'Sarah Lee',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
      title: 'UI/UX Designer',
      location: 'Remote',
      hourly_rate: 65,
      rating: 4.7,
      jobsCompleted: 38,
      successRate: 95,
      status: 'active',
      skills: ['Figma', 'Adobe XD', 'Prototyping', 'Web Design'],
    },
    {
      id: 'sf_4',
      user_id: 'u_freelancer_4',
      full_name: 'John Banned',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      title: 'Developer',
      location: 'Unknown',
      hourly_rate: 0,
      rating: 0,
      jobsCompleted: 0,
      successRate: 0,
      status: 'banned',
      skills: [],
      isBanned: true,
    },
  ]);

  const handleUnsave = (id: string) => {
    setSavedFreelancers(prev => prev.filter(f => f.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleViewProfile = (freelancerId: string, isBanned?: boolean) => {
    if (isBanned) {
      alert('MSG30: This account was being banned!');
      return;
    }
    navigate(`/profile/freelancer/${freelancerId}`);
  };

  const filteredFreelancers = savedFreelancers.filter(f =>
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="saved-freelancers-wrapper">
        {/* Header */}
        <div className="saved-freelancers-header">
          <div className="saved-freelancers-header-content">
            <div className="saved-freelancers-header-icon">
              <Bookmark size={32} />
            </div>
            <div>
              <h1 className="saved-freelancers-title">Saved Freelancers</h1>
              <p className="saved-freelancers-subtitle">
                Your bookmarked freelancer profiles - {savedFreelancers.length} total
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="saved-freelancers-search-container glass-card">
          <Search size={20} className="saved-freelancers-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, title, location, or skills..."
            className="saved-freelancers-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="saved-freelancers-search-clear"
            >
              ✕
            </button>
          )}
        </div>

        {/* Freelancers List */}
        <div className="saved-freelancers-container">
          {filteredFreelancers.length === 0 ? (
            <div className="saved-freelancers-empty">
              <Bookmark size={48} />
              <p className="saved-freelancers-empty-title">
                {searchQuery ? 'No freelancers found' : 'No saved freelancers yet'}
              </p>
              <p className="saved-freelancers-empty-subtitle">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Save freelancer profiles to bookmark them for future reference'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/jobs/browse')}
                  className="saved-freelancers-empty-button"
                >
                  Browse Freelancers
                </button>
              )}
            </div>
          ) : (
            <div className="saved-freelancers-list">
              {filteredFreelancers.map((freelancer) => (
                <div
                  key={freelancer.id}
                  className={`saved-freelancer-card glass-card ${freelancer.status === 'banned' ? 'banned' : ''}`}
                >
                  {/* Banned Badge */}
                  {freelancer.isBanned && (
                    <div className="saved-freelancer-banned-badge">
                      <AlertCircle size={14} />
                      <span>Account Banned</span>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="saved-freelancer-avatar-container">
                    <img
                      src={freelancer.avatar_url}
                      alt={freelancer.full_name}
                      className="saved-freelancer-avatar"
                    />
                  </div>

                  {/* Content */}
                  <div className="saved-freelancer-content">
                    <div>
                      <h3 className="saved-freelancer-name">{freelancer.full_name}</h3>
                      <p className="saved-freelancer-title">{freelancer.title}</p>

                      {/* Meta Info */}
                      <div className="saved-freelancer-meta">
                        <div className="saved-freelancer-meta-item">
                          <MapPin size={14} />
                          <span>{freelancer.location}</span>
                        </div>
                        {!freelancer.isBanned && (
                          <>
                            <div className="saved-freelancer-meta-item">
                              <Star size={14} className="text-amber-400" />
                              <span>{freelancer.rating}/5</span>
                            </div>
                            <div className="saved-freelancer-meta-item">
                              <TrendingUp size={14} />
                              <span>{freelancer.jobsCompleted} jobs</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Skills */}
                      {freelancer.skills.length > 0 && (
                        <div className="saved-freelancer-skills">
                          {freelancer.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="saved-freelancer-skill-badge">
                              {skill}
                            </span>
                          ))}
                          {freelancer.skills.length > 3 && (
                            <span className="saved-freelancer-skill-badge more">
                              +{freelancer.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      {!freelancer.isBanned && (
                        <div className="saved-freelancer-stats">
                          <div className="saved-freelancer-stat">
                            <span className="saved-freelancer-stat-label">Rate</span>
                            <span className="saved-freelancer-stat-value">${freelancer.hourly_rate}/hr</span>
                          </div>
                          <div className="saved-freelancer-stat">
                            <span className="saved-freelancer-stat-label">Success Rate</span>
                            <span className="saved-freelancer-stat-value">{freelancer.successRate}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="saved-freelancer-actions">
                    <button
                      onClick={() => handleViewProfile(freelancer.user_id, freelancer.isBanned)}
                      className="saved-freelancer-action-btn saved-freelancer-action-btn-view"
                      disabled={freelancer.isBanned}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(freelancer.id)}
                      className="saved-freelancer-action-btn saved-freelancer-action-btn-remove"
                      title="Remove from saved"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === freelancer.id && (
                    <div className="saved-freelancer-delete-confirm">
                      <AlertCircle size={16} className="text-amber" />
                      <span>Unsave this freelancer?</span>
                      <button
                        onClick={() => handleUnsave(freelancer.id)}
                        className="saved-freelancer-delete-confirm-btn-yes"
                      >
                        Yes, unsave
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="saved-freelancer-delete-confirm-btn-no"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Info */}
        {filteredFreelancers.length > 0 && (
          <div className="saved-freelancers-results-info">
            <p>
              Showing <strong>{filteredFreelancers.length}</strong> of{' '}
              <strong>{savedFreelancers.length}</strong> saved freelancers
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
