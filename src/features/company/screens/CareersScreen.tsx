import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, Briefcase, MapPin, Clock, DollarSign, Users, Code, Palette, BarChart2, Shield } from 'lucide-react';

const JOB_OPENINGS = [
  {
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    salary: '$150k - $200k',
    icon: <Code size={20} />,
    color: 'cyan',
    description: 'Build the next generation of our AI-powered marketplace platform.'
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    salary: '$120k - $160k',
    icon: <Palette size={20} />,
    color: 'purple',
    description: 'Design beautiful, intuitive experiences for freelancers and clients.'
  },
  {
    title: 'Machine Learning Engineer',
    department: 'AI/ML',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$160k - $220k',
    icon: <BarChart2 size={20} />,
    color: 'green',
    description: 'Improve our AI matching algorithms and build new intelligent features.'
  },
  {
    title: 'Security Engineer',
    department: 'Security',
    location: 'Remote',
    type: 'Full-time',
    salary: '$140k - $190k',
    icon: <Shield size={20} />,
    color: 'amber',
    description: 'Keep our platform secure and protect our community from fraud.'
  },
];

const BENEFITS = [
  '🏥 Comprehensive health, dental, and vision insurance',
  '💰 Competitive salary and equity package',
  '🏖️ Unlimited PTO and flexible work hours',
  '💻 Latest MacBook Pro and work-from-home stipend',
  '🎓 $5,000 annual learning & development budget',
  '🌍 Remote-first culture with global team',
  '🍕 Team lunches and quarterly offsites',
  '🚀 Work on cutting-edge AI technology',
];

export default function CareersScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();

  return (
    <GuestLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              saveScrollPosition();
              navigate('/');
            }}
            className="btn-ghost-cyan px-4 py-2 mb-8 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan to-purple">
                <Briefcase size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">Careers at GigBridge</h1>
            </div>
            <p className="text-lg text-secondary max-w-3xl mx-auto">
              Join us in building the future of work. We're looking for talented individuals who want to make an impact.
            </p>
          </div>

          {/* Why Join */}
          <div className="glass-card p-8 mb-12">
            <h2 className="text-2xl font-bold text-primary mb-4 text-center">Why Join GigBridge?</h2>
            <p className="text-secondary text-center mb-6 max-w-3xl mx-auto">
              We're on a mission to revolutionize how people work. Join a team of brilliant engineers, designers,
              and thinkers who are building AI-powered solutions that impact millions of freelancers and clients worldwide.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'Impact at Scale', desc: 'Your work directly affects 70,000+ users across 150+ countries' },
                { title: 'Cutting-Edge Tech', desc: 'Work with the latest AI/ML technologies and modern tech stack' },
                { title: 'Fast Growth', desc: 'Join a rapidly scaling startup backed by top-tier investors' },
                { title: 'Awesome Team', desc: 'Collaborate with talented people from Google, Meta, and top startups' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-primary font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-secondary">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="glass-card p-8 mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Benefits & Perks</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {BENEFITS.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <span className="text-lg flex-shrink-0">{benefit.split(' ')[0]}</span>
                  <p className="text-sm text-secondary">{benefit.split(' ').slice(1).join(' ')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Open Positions */}
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Open Positions</h2>
            <div className="space-y-4">
              {JOB_OPENINGS.map((job, i) => (
                <div key={i} className="glass-card p-6 hover:border-cyan/50 transition-all cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${job.color}/20 flex-shrink-0`}>
                        <span className={`text-${job.color}`}>{job.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-primary mb-1">{job.title}</h3>
                        <p className="text-sm text-secondary mb-3">{job.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                          <div className="flex items-center gap-1">
                            <Briefcase size={12} />
                            <span>{job.department}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{job.type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={12} />
                            <span>{job.salary}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="btn-cyan px-6 py-2 text-sm whitespace-nowrap">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="glass-card p-8 mt-12 text-center">
            <h3 className="text-xl font-bold text-primary mb-3">Don't see a perfect fit?</h3>
            <p className="text-secondary mb-6">
              We're always looking for talented people. Send us your resume and let's chat!
            </p>
            <button className="btn-ghost-cyan px-6 py-3">
              Email careers@gigbridge.com
            </button>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
