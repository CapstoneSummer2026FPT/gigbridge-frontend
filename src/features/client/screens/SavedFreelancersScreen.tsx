import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Heart, Search, Star, MessageSquare, Eye, Trash2 } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../../admin/styles/admin-users-screen.css';

interface SavedFreelancer {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  rating: number;
  reviewCount: number;
  projectBudget: number;
  location: string;
  skills: string[];
  completedJobs: number;
  savedAt: string;
  bio: string;
  availability: 'available' | 'busy' | 'unavailable';
}

// Mock data
const MOCK_SAVED_FREELANCERS: SavedFreelancer[] = [
  {
    id: 'user_freelancer_1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    title: 'Senior Full-Stack Developer',
    rating: 4.9,
    reviewCount: 47,
    projectBudget: 8500,
    location: 'San Francisco, CA',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    completedJobs: 132,
    savedAt: '2026-05-15T10:00:00Z',
    bio: 'Experienced full-stack developer specializing in modern web applications with 8+ years of experience.',
    availability: 'available',
  },
  {
    id: 'user_freelancer_2',
    firstName: 'Michael',
    lastName: 'Chen',
    title: 'UI/UX Designer',
    rating: 5.0,
    reviewCount: 35,
    projectBudget: 5200,
    location: 'New York, NY',
    skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
    completedJobs: 89,
    savedAt: '2026-05-10T14:30:00Z',
    bio: 'Creative designer focused on user-centered design solutions for web and mobile applications.',
    availability: 'busy',
  },
  {
    id: 'user_freelancer_3',
    firstName: 'Emma',
    lastName: 'Williams',
    title: 'Mobile App Developer',
    rating: 4.8,
    reviewCount: 62,
    projectBudget: 11000,
    location: 'Austin, TX',
    skills: ['React Native', 'Flutter', 'iOS', 'Android'],
    completedJobs: 156,
    savedAt: '2026-05-05T09:00:00Z',
    bio: 'Passionate mobile developer with expertise in cross-platform app development.',
    availability: 'available',
  },
  {
    id: 'user_freelancer_4',
    firstName: 'David',
    lastName: 'Martinez',
    title: 'Data Scientist',
    rating: 4.7,
    reviewCount: 28,
    projectBudget: 14000,
    location: 'Seattle, WA',
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    completedJobs: 73,
    savedAt: '2026-04-28T16:00:00Z',
    bio: 'Data scientist specializing in machine learning and predictive analytics.',
    availability: 'unavailable',
  },
];

export default function SavedFreelancersScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy' | 'unavailable'>('all');
  const [showRemoveModal, setShowRemoveModal] = useState<SavedFreelancer | null>(null);

  const filteredFreelancers = useMemo(() => {
    return MOCK_SAVED_FREELANCERS.filter(freelancer => {
      const matchesSearch = searchQuery === '' ||
        `${freelancer.firstName} ${freelancer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        freelancer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        freelancer.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAvailability = availabilityFilter === 'all' || freelancer.availability === availabilityFilter;

      return matchesSearch && matchesAvailability;
    });
  }, [searchQuery, availabilityFilter]);

  const getAvailabilityBadge = (availability: string) => {
    if (availability === 'available') return <span className="badge-green text-xs">Available</span>;
    if (availability === 'busy') return <span className="badge-amber text-xs">Busy</span>;
    return <span className="badge-red text-xs">Unavailable</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRemove = (freelancerId: string) => {
    console.log('Removing saved freelancer:', freelancerId);
    // API call to remove from saved
    setShowRemoveModal(null);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={20} className="text-red" />
              <span className="badge-red text-xs">Saved</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">Saved Freelancers</h1>
            <p className="text-sm text-secondary mt-1">Your favorite freelancers for future projects</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Saved', value: MOCK_SAVED_FREELANCERS.length.toString(), icon: <Heart size={16} />, color: 'red' },
              { label: 'Available', value: MOCK_SAVED_FREELANCERS.filter(f => f.availability === 'available').length.toString(), icon: <Star size={16} />, color: 'green' },
              { label: 'Avg Rating', value: '4.85', icon: <Star size={16} />, color: 'amber' },
              { label: 'Total Reviews', value: MOCK_SAVED_FREELANCERS.reduce((sum, f) => sum + f.reviewCount, 0).toString(), icon: <MessageSquare size={16} />, color: 'cyan' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search freelancers..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={availabilityFilter}
                onChange={e => setAvailabilityFilter(e.target.value as any)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          {/* Freelancers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFreelancers.map(freelancer => (
              <div key={freelancer.id} className="glass-card p-6 hover:border-red/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-white font-bold flex-shrink-0">
                      {freelancer.firstName.charAt(0)}{freelancer.lastName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-primary mb-1">
                        {freelancer.firstName} {freelancer.lastName}
                      </h3>
                      <p className="text-sm text-secondary mb-2">{freelancer.title}</p>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber fill-amber" />
                          <span className="text-sm font-semibold text-primary">{freelancer.rating}</span>
                          <span className="text-xs text-muted">({freelancer.reviewCount})</span>
                        </div>
                        {getAvailabilityBadge(freelancer.availability)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRemoveModal(freelancer)}
                    className="p-2 rounded-lg hover:bg-red/10 transition-all"
                  >
                    <Heart size={20} className="text-red fill-red" />
                  </button>
                </div>

                <p className="text-sm text-secondary mb-4 line-clamp-2">{freelancer.bio}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {freelancer.skills.slice(0, 4).map(skill => (
                    <span key={skill} className="tag-pill text-xs">{skill}</span>
                  ))}
                  {freelancer.skills.length > 4 && (
                    <span className="tag-pill text-xs">+{freelancer.skills.length - 4}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-muted mb-1">Typical Budget</p>
                    <p className="text-sm font-bold text-green">${freelancer.projectBudget.toLocaleString()}/project</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Jobs Done</p>
                    <p className="text-sm font-bold text-primary">{freelancer.completedJobs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Location</p>
                    <p className="text-xs text-primary truncate" title={freelancer.location}>
                      {freelancer.location.split(',')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/profile/freelancer/${freelancer.id}`)}
                    className="btn-ghost-cyan flex-1 px-4 py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => navigate(`/messages?user=${freelancer.id}`)}
                    className="btn-cyan flex-1 px-4 py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={14} />
                    Message
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-muted">
                    Saved on {formatDate(freelancer.savedAt)}
                  </p>
                </div>
              </div>
            ))}

            {filteredFreelancers.length === 0 && (
              <div className="col-span-full glass-card p-12 text-center">
                <Heart size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-lg font-semibold text-primary mb-2">No saved freelancers</p>
                <p className="text-sm text-secondary mb-6">Start browsing and save talented freelancers for future projects</p>
                <button
                  onClick={() => navigate('/jobs/browse')}
                  className="btn-cyan px-6 py-3"
                >
                  Browse Freelancers
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRemoveModal(null)}>
          <div className="glass-card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                <Trash2 size={24} className="text-red" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Remove from Saved</h2>
                <p className="text-xs text-muted">Remove this freelancer from your favorites</p>
              </div>
            </div>

            <div className="glass-card p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-white font-bold flex-shrink-0">
                  {showRemoveModal.firstName.charAt(0)}{showRemoveModal.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">
                    {showRemoveModal.firstName} {showRemoveModal.lastName}
                  </p>
                  <p className="text-xs text-secondary">{showRemoveModal.title}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-secondary mb-6">
              Are you sure you want to remove this freelancer from your saved list? You can always save them again later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveModal(null)}
                className="btn-ghost-cyan flex-1 px-6 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(showRemoveModal.id)}
                className="btn-red flex-1 px-6 py-2 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
