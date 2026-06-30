import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, BookOpen, User, Briefcase, Search, FileText, MessageSquare, Shield, Bot, Star, CheckCircle } from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';

const GUIDES = {
  'For Freelancers': [
    {
      title: 'Getting Started as a Freelancer',
      icon: <User size={20} />,
      color: 'cyan',
      steps: [
        { title: 'Create Your Profile', desc: 'Sign up, choose "Freelancer" role, and complete your profile with skills, experience, and portfolio.' },
        { title: 'Take Skill Assessments', desc: 'Complete skill tests to verify your expertise and boost your profile ranking.' },
        { title: 'Set Your Rates', desc: 'Research market rates using our AI Market Insights and set competitive hourly or project rates.' },
        { title: 'Browse Jobs', desc: 'Use AI-powered job matches or browse manually. Filter by skills, budget, and project type.' },
        { title: 'Submit Proposals', desc: 'Write compelling proposals or use our AI Proposal Generator to create custom pitches.' },
      ]
    },
    {
      title: 'Winning Projects',
      icon: <Star size={20} />,
      color: 'purple',
      steps: [
        { title: 'Optimize Your Profile', desc: 'Add a professional photo, detailed bio, portfolio samples, and client testimonials.' },
        { title: 'Respond Quickly', desc: 'Reply to job invitations and messages within 24 hours. Speed matters!' },
        { title: 'Personalize Proposals', desc: 'Reference specific project details and explain why you\'re the perfect fit.' },
        { title: 'Showcase Relevant Work', desc: 'Include portfolio samples that match the job requirements.' },
        { title: 'Set Competitive Rates', desc: 'Balance value with competitiveness. Check AI Market Insights for guidance.' },
      ]
    },
    {
      title: 'Managing Projects',
      icon: <Briefcase size={20} />,
      color: 'green',
      steps: [
        { title: 'Clarify Requirements', desc: 'Discuss project scope, deliverables, and timeline before starting work.' },
        { title: 'Set Milestones', desc: 'Break large projects into milestones with clear deliverables and payments.' },
        { title: 'Communicate Regularly', desc: 'Update clients on progress, ask questions early, and be responsive.' },
        { title: 'Deliver Quality Work', desc: 'Meet deadlines, exceed expectations, and request feedback.' },
        { title: 'Build Long-Term Relationships', desc: 'Great work leads to repeat clients and referrals.' },
      ]
    },
  ],
  'For Clients': [
    {
      title: 'Hiring Your First Freelancer',
      icon: <Search size={20} />,
      color: 'cyan',
      steps: [
        { title: 'Post a Clear Job', desc: 'Describe your project clearly, including scope, budget, timeline, and required skills.' },
        { title: 'Review AI Matches', desc: 'Our AI will recommend top freelancers. Review their profiles, portfolios, and ratings.' },
        { title: 'Use AI Interviews (Optional)', desc: 'Screen candidates with automated video interviews to save time.' },
        { title: 'Invite to Apply', desc: 'Invite promising freelancers to submit proposals or browse incoming applications.' },
        { title: 'Make Your Decision', desc: 'Compare proposals, check references, and hire the best fit.' },
      ]
    },
    {
      title: 'Working with Freelancers',
      icon: <MessageSquare size={20} />,
      color: 'purple',
      steps: [
        { title: 'Onboard Properly', desc: 'Share necessary files, logins, and context. Set clear expectations upfront.' },
        { title: 'Create Milestones', desc: 'Break work into milestones with specific deliverables and payment amounts.' },
        { title: 'Provide Feedback', desc: 'Give constructive feedback early and often. Clear communication prevents issues.' },
        { title: 'Approve Work Promptly', desc: 'Review deliverables quickly and release milestone payments on time.' },
        { title: 'Leave Reviews', desc: 'Rate your experience to help other clients and build the freelancer\'s reputation.' },
      ]
    },
    {
      title: 'Payment & Budgeting',
      icon: <GCoinIcon size={20} />,
      color: 'green',
      steps: [
        { title: 'Set Your Budget', desc: 'Use AI Market Insights to understand typical rates for your project type.' },
        { title: 'Fund Milestones', desc: 'Deposit funds into escrow when creating milestones. Freelancers see you\'re serious.' },
        { title: 'Approve Completed Work', desc: 'Funds are released from escrow when you approve milestone deliverables.' },
        { title: 'Request Revisions', desc: 'If work doesn\'t meet requirements, request specific changes before approving.' },
        { title: 'Dispute Resolution', desc: 'If needed, use our dispute system. Our AI and support team will mediate fairly.' },
      ]
    },
  ],
  'Platform Features': [
    {
      title: 'Using AI Features',
      icon: <Bot size={20} />,
      color: 'cyan',
      steps: [
        { title: 'AI Matching', desc: 'Our AI analyzes 200+ signals to recommend perfect job/talent matches for you.' },
        { title: 'AI Proposal Generator', desc: 'Freelancers: Generate custom proposals in seconds. Pro feature.' },
        { title: 'AI Interviews', desc: 'Clients: Pre-screen candidates with automated video interviews and AI analysis.' },
        { title: 'AI Work Assistant', desc: 'Get help writing job posts, contracts, and professional messages.' },
        { title: 'Market Insights', desc: 'Access real-time data on rates, demand, and trending skills.' },
      ]
    },
    {
      title: 'Security Best Practices',
      icon: <Shield size={20} />,
      color: 'purple',
      steps: [
        { title: 'Keep Work On Platform', desc: 'All communication, files, and payments should happen on GigBridge.' },
        { title: 'Use Milestone Payments', desc: 'Break projects into milestones to protect both parties.' },
        { title: 'Verify Identities', desc: 'Check profiles, reviews, and portfolios before hiring or accepting work.' },
        { title: 'Report Suspicious Activity', desc: 'Use the Report button if you encounter scams or policy violations.' },
        { title: 'Enable Two-Factor Auth', desc: 'Protect your account with 2FA in Security Settings.' },
      ]
    },
    {
      title: 'Building Your Reputation',
      icon: <CheckCircle size={20} />,
      color: 'green',
      steps: [
        { title: 'Complete Your Profile', desc: 'Detailed profiles rank higher in search and AI matches.' },
        { title: 'Deliver Quality Work', desc: 'Every successful project builds your rating and reputation.' },
        { title: 'Communicate Professionally', desc: 'Clear, timely communication leads to better reviews.' },
        { title: 'Request Testimonials', desc: 'Ask satisfied clients for detailed reviews and recommendations.' },
        { title: 'Stay Active', desc: 'Regular activity signals reliability and keeps you in top search results.' },
      ]
    },
  ],
};

export default function GuideScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();
  const [activeCategory, setActiveCategory] = useState<keyof typeof GUIDES>('For Freelancers');
  const [activeGuide, setActiveGuide] = useState(0);

  const currentGuides = GUIDES[activeCategory];
  const currentGuide = currentGuides[activeGuide];

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
                <BookOpen size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">User Guide</h1>
            </div>
            <p className="text-lg text-secondary max-w-3xl mx-auto">
              Step-by-step guides to help you succeed on GigBridge
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {(Object.keys(GUIDES) as Array<keyof typeof GUIDES>).map(category => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setActiveGuide(0);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeCategory === category
                    ? 'bg-cyan/20 text-cyan border border-cyan'
                    : 'glass-button text-secondary hover:text-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Guide Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Guide List */}
            <div className="lg:col-span-1 space-y-3">
              {currentGuides.map((guide, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGuide(i)}
                  className={`w-full glass-card p-4 text-left transition-all ${
                    activeGuide === i ? 'border-cyan/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${guide.color}/20`}>
                      <span className={`text-${guide.color}`}>{guide.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-primary truncate">{guide.title}</h3>
                      <p className="text-xs text-muted">{guide.steps.length} steps</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Guide Content */}
            <div className="lg:col-span-2 glass-card p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${currentGuide.color}/20`}>
                  <span className={`text-${currentGuide.color}`}>{currentGuide.icon}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{currentGuide.title}</h2>
                  <p className="text-sm text-muted">{currentGuide.steps.length} steps to success</p>
                </div>
              </div>

              <div className="space-y-4">
                {currentGuide.steps.map((step, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${currentGuide.color}/20 flex-shrink-0`}>
                        <span className={`text-sm font-bold text-${currentGuide.color}`}>{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-primary font-semibold mb-2">{step.title}</h3>
                        <p className="text-sm text-secondary leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="glass-card p-8 mt-12">
            <h3 className="text-xl font-bold text-primary mb-6 text-center">Quick Tips for Success</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { tip: 'Response Time Matters', desc: 'Respond to messages within 24 hours to maintain high ratings' },
                { tip: 'Profile Completeness', desc: 'Complete profiles get 3x more visibility in AI matches' },
                { tip: 'Use AI Features', desc: 'GigBridge Pro users win 40% more projects on average' },
                { tip: 'Build Relationships', desc: 'Repeat clients account for 60% of successful freelancers\' income' },
                { tip: 'Stay Professional', desc: 'Clear contracts and professional communication prevent disputes' },
                { tip: 'Ask for Reviews', desc: '5-star ratings increase your chances of getting hired by 250%' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-4">
                  <CheckCircle size={20} className="text-green flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">{item.tip}</p>
                    <p className="text-xs text-secondary">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="glass-card p-8 mt-8 text-center">
            <h3 className="text-xl font-bold text-primary mb-3">Still have questions?</h3>
            <p className="text-secondary mb-6">
              Check our FAQ or contact support for personalized help
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/faq')}
                className="btn-cyan px-6 py-3"
              >
                View FAQ
              </button>
              <button className="btn-ghost-cyan px-6 py-3">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
