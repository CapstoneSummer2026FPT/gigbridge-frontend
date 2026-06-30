import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, MapPin, Briefcase, Clock, Star, Zap, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/browse-jobs-screen.css';
import { GigCoinBudget, GigCoinLogo } from '../../../shared/components/GigCoinAmount';

interface JobListing {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientRating: number;
  budget: number;
  duration: string;
  skills: string[];
  category: string;
  proposals: number;
  isFeatured: boolean;
  postedAt: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
}

export default function BrowseJobsForFreelancerScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState({ min: 0, max: 10000 });
  const [jobType, setJobType] = useState<'All' | 'Featured' | 'Open'>('All');
  const [showFilters, setShowFilters] = useState(false);

  // Mock job listings
  const [jobs] = useState<JobListing[]>([
    {
      id: 'job_1',
      title: 'Build E-Commerce Platform',
      description: 'Need a scalable e-commerce platform with React frontend and Node.js backend...',
      clientName: 'TechCorp Inc',
      clientRating: 4.9,
      budget: 5000,
      duration: '4 weeks',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      category: 'Web Development',
      proposals: 12,
      isFeatured: true,
      postedAt: '2 days ago',
      level: 'Intermediate',
    },
    {
      id: 'job_2',
      title: 'Mobile App UI Design',
      description: 'Create UI mockups for mobile app using Figma...',
      clientName: 'StartupXYZ',
      clientRating: 4.7,
      budget: 1500,
      duration: '2 weeks',
      skills: ['Figma', 'UI Design', 'Prototyping'],
      category: 'UI/UX Design',
      proposals: 28,
      isFeatured: false,
      postedAt: '5 days ago',
      level: 'Intermediate',
    },
    {
      id: 'job_3',
      title: 'Logo Design for Brand',
      description: 'Professional logo design for new startup brand...',
      clientName: 'Creative Agency',
      clientRating: 4.8,
      budget: 800,
      duration: '1 week',
      skills: ['Graphic Design', 'Branding', 'Adobe Creative Suite'],
      category: 'Graphic Design',
      proposals: 45,
      isFeatured: false,
      postedAt: '1 day ago',
      level: 'Expert',
    },
    {
      id: 'job_4',
      title: 'WordPress Website Maintenance',
      description: 'Monthly website maintenance and updates...',
      clientName: 'Small Business Co',
      clientRating: 4.5,
      budget: 50,
      duration: 'Ongoing',
      skills: ['WordPress', 'HTML/CSS', 'PHP'],
      category: 'Web Development',
      proposals: 8,
      isFeatured: false,
      postedAt: '1 week ago',
      level: 'Beginner',
    },
    {
      id: 'job_5',
      title: 'Python Data Analysis Project',
      description: 'Analyze customer data and create visualizations...',
      clientName: 'Data Solutions Ltd',
      clientRating: 4.6,
      budget: 3000,
      duration: '3 weeks',
      skills: ['Python', 'Pandas', 'Data Visualization', 'SQL'],
      category: 'Data Science',
      proposals: 15,
      isFeatured: true,
      postedAt: '3 days ago',
      level: 'Expert',
    },
  ]);

  const availableSkills = [
    'React', 'Node.js', 'Python', 'PostgreSQL', 'Figma',
    'UI Design', 'WordPress', 'HTML/CSS', 'Data Visualization', 'Branding'
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBudget = job.budget >= budgetRange.min && job.budget <= budgetRange.max;

    const matchesSkills = selectedSkills.length === 0 ||
      selectedSkills.some(skill => job.skills.includes(skill));

    const matchesType = jobType === 'All' ||
      (jobType === 'Featured' && job.isFeatured) ||
      (jobType === 'Open' && !job.isFeatured);

    return matchesSearch && matchesBudget && matchesSkills && matchesType;
  });

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
    setBudgetRange({ min: 0, max: 10000 });
    setJobType('All');
  };

  return (
    <AppLayout>
      <div className="browse-jobs-wrapper">
        {/* Header */}
        <div className="browse-jobs-header">
          <h1 className="browse-jobs-title">Browse Jobs</h1>
          <p className="browse-jobs-subtitle">
            Find the perfect job opportunity - {jobs.length} available
          </p>
        </div>

        {/* Main Content */}
        <div className="browse-jobs-content">
          {/* Sidebar Filters - Desktop */}
          <aside className="browse-jobs-sidebar glass-card">
            {/* Search */}
            <div className="filter-group">
              <label className="filter-label">Search Jobs</label>
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keywords..."
                  className="search-input"
                />
              </div>
            </div>

            {/* Job Type */}
            <div className="filter-group">
              <label className="filter-label">Job Type</label>
              <div className="filter-options">
                {['All', 'Featured', 'Open'].map(type => (
                  <button
                    key={type}
                    onClick={() => setJobType(type as any)}
                    className={`filter-option ${jobType === type ? 'active' : ''}`}
                  >
                    {type === 'Featured' && <Zap size={14} />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Range */}
            <div className="filter-group">
              <label className="filter-label">Budget Range</label>
              <div className="budget-inputs">
                <input
                  type="number"
                  value={budgetRange.min}
                  onChange={(e) => setBudgetRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                  placeholder="Min"
                  className="budget-input"
                />
                <span>-</span>
                <input
                  type="number"
                  value={budgetRange.max}
                  onChange={(e) => setBudgetRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                  placeholder="Max"
                  className="budget-input"
                />
              </div>
              <p className="budget-display"><GigCoinBudget min={budgetRange.min} max={budgetRange.max} /></p>
            </div>

            {/* Skills */}
            <div className="filter-group">
              <label className="filter-label">Skills</label>
              <div className="skills-filter">
                {availableSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => handleToggleSkill(skill)}
                    className={`skill-filter-btn ${selectedSkills.includes(skill) ? 'active' : ''}`}
                  >
                    {selectedSkills.includes(skill) && <X size={12} />}
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button onClick={handleResetFilters} className="reset-filters-btn">
              Reset Filters
            </button>
          </aside>

          {/* Jobs List */}
          <main className="browse-jobs-list">
            {/* Mobile Filter Toggle */}
            <div className="browse-jobs-mobile-header">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="browse-jobs-filter-toggle"
              >
                <Filter size={18} />
                Filters
              </button>
              <span className="jobs-count">{filteredJobs.length} jobs</span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="browse-jobs-empty">
                <Search size={48} />
                <p className="empty-title">No jobs found</p>
                <p className="empty-subtitle">
                  Try adjusting your search or filters
                </p>
                <button onClick={handleResetFilters} className="browse-jobs-reset-btn">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="jobs-grid">
                {filteredJobs.map(job => (
                  <div key={job.id} className="job-card glass-card">
                    {/* Featured Badge */}
                    {job.isFeatured && (
                      <div className="job-featured-badge">
                        <Zap size={14} /> Featured
                      </div>
                    )}

                    {/* Header */}
                    <div className="job-card-header">
                      <h3 className="job-card-title">{job.title}</h3>
                      <p className="job-client">
                        <span className="client-name">{job.clientName}</span>
                        <span className="client-rating">
                          <Star size={12} fill="currentColor" /> {job.clientRating}
                        </span>
                      </p>
                    </div>

                    {/* Description */}
                    <p className="job-description">{job.description}</p>

                    {/* Meta Info */}
                    <div className="job-meta">
                      <div className="meta-item">
                        <GigCoinLogo size={14} />
                        <span className="meta-text">
                          {job.budget} GigCoin
                        </span>
                      </div>
                      <div className="meta-item">
                        <Clock size={14} />
                        <span className="meta-text">{job.duration}</span>
                      </div>
                      <div className="meta-item">
                        <Briefcase size={14} />
                        <span className="meta-text">{job.proposals} proposals</span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="job-skills">
                      {job.skills.map(skill => (
                        <span key={skill} className="skill-tag">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="job-card-footer">
                      <p className="job-posted">{job.postedAt}</p>
                      <button
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="job-view-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
