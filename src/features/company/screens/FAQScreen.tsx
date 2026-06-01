import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, HelpCircle, ChevronDown, Search } from 'lucide-react';

const FAQ_CATEGORIES = {
  'Getting Started': [
    {
      question: 'How do I create an account?',
      answer: 'Click "Start as Freelancer" or "Hire Top Talent" on the homepage. You\'ll be guided through a simple signup process where you choose your role (freelancer or client), create your profile, and verify your email.'
    },
    {
      question: 'Is GigBridge free to use?',
      answer: 'Yes! Creating an account and browsing jobs/talent is completely free. We charge a small service fee (10% for freelancers, 5% for clients) only when you successfully complete a project. We also offer GigBridge Pro with additional AI features for $29.99/month.'
    },
    {
      question: 'How does the AI matching work?',
      answer: 'Our AI analyzes 200+ signals including skills, experience, work history, client preferences, budget compatibility, and communication styles to create smart matches. The more you use GigBridge, the better our AI gets at finding perfect matches for you.'
    },
  ],
  'For Freelancers': [
    {
      question: 'How do I get more job matches?',
      answer: 'Complete your profile thoroughly, add a professional photo, showcase your best work in your portfolio, take skill assessments, and maintain high ratings. Our AI prioritizes complete, high-quality profiles in matches.'
    },
    {
      question: 'What is the AI Proposal Generator?',
      answer: 'The AI Proposal Generator analyzes job descriptions and your profile to create customized, compelling proposals in seconds. It learns from your successful proposals to improve over time. Available with GigBridge Pro.'
    },
    {
      question: 'How and when do I get paid?',
      answer: 'Payments are released when clients approve milestones. Funds are held securely in escrow and transferred to your GigBridge wallet. You can withdraw to your bank account anytime with no minimum balance. Withdrawals typically take 2-3 business days.'
    },
    {
      question: 'What if a client doesn\'t pay?',
      answer: 'All payments go through our secure escrow system. If there\'s a dispute, our AI reviews the work and contract terms. If needed, our support team mediates. We protect freelancers with milestone-based payments and contract enforcement.'
    },
  ],
  'For Clients': [
    {
      question: 'How do I find the right freelancer?',
      answer: 'Post a job with clear requirements, and our AI will match you with top candidates. You can also browse freelancer profiles, filter by skills and ratings, and use our AI Interview feature to screen candidates automatically.'
    },
    {
      question: 'What is the AI Interview feature?',
      answer: 'AI Interviews allow you to pre-screen candidates with automated video interviews. Our AI asks relevant questions based on the job requirements and provides you with analyzed responses, ratings, and key insights about each candidate.'
    },
    {
      question: 'How does payment protection work?',
      answer: 'Funds are held in escrow when you create milestones. Freelancers only receive payment when you approve completed work. If there\'s an issue, you can request revisions or dispute the milestone. Your money is protected until you\'re satisfied.'
    },
    {
      question: 'Can I hire the same freelancer again?',
      answer: 'Absolutely! You can save your favorite freelancers and invite them directly to new projects. Building long-term relationships with trusted freelancers is encouraged and makes future hiring even easier.'
    },
  ],
  'Payments & Billing': [
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, bank transfers, and cryptocurrency (BTC, ETH, USDC). Payment methods vary by country.'
    },
    {
      question: 'What are the fees?',
      answer: 'Freelancers pay 10% on earnings (reduced to 5% with GigBridge Pro). Clients pay a 5% service fee on project budgets. There are no hidden fees or subscription requirements unless you choose GigBridge Pro.'
    },
    {
      question: 'How do refunds work?',
      answer: 'If work doesn\'t meet contract requirements and the freelancer cannot resolve the issues, you can request a refund. Our AI reviews the contract, deliverables, and communication. Refunds are processed within 5-7 business days if approved.'
    },
  ],
  'AI Features': [
    {
      question: 'What AI features are available?',
      answer: 'GigBridge offers AI Matching (smart job/talent recommendations), AI Proposal Generator, AI Interviews, AI Work Assistant (helps with contracts and communication), and Market Insights (data-driven rate and demand analysis).'
    },
    {
      question: 'Is my data used to train the AI?',
      answer: 'We use anonymized, aggregated data to improve our AI models. Your personal information, private messages, and proprietary work are never used for training. You can opt-out of data collection in your privacy settings.'
    },
    {
      question: 'Can I turn off AI features?',
      answer: 'Yes! While we recommend using AI features for the best experience, you can disable specific features in your account settings. However, AI Matching cannot be fully disabled as it\'s core to our platform.'
    },
  ],
  'Security & Support': [
    {
      question: 'Is my information secure?',
      answer: 'Yes. We use bank-level 256-bit SSL encryption, two-factor authentication, and regular security audits. Payment information is processed through PCI-compliant providers. We never store your full credit card details.'
    },
    {
      question: 'How do I report a scam or fraud?',
      answer: 'Click the "Report" button on any job, profile, or message. Our AI fraud detection system will investigate immediately. Serious violations result in account suspension and, if needed, cooperation with law enforcement.'
    },
    {
      question: 'How do I contact support?',
      answer: 'Click the "Help" icon in the bottom-right corner for instant chat support (available 24/7). You can also email support@gigbridge.com or browse our Help Center for detailed guides and tutorials.'
    },
  ],
};

export default function FAQScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = Object.entries(FAQ_CATEGORIES).reduce((acc, [category, questions]) => {
    const filtered = questions.filter(
      q =>
        searchQuery === '' ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof FAQ_CATEGORIES);

  return (
    <GuestLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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
                <HelpCircle size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">Frequently Asked Questions</h1>
            </div>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              Find answers to common questions about GigBridge
            </p>
          </div>

          {/* Search */}
          <div className="glass-card p-4 mb-8">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="input-gb w-full py-3 text-sm pl-10"
              />
            </div>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {Object.entries(filteredFAQs).map(([category, questions]) => (
              <div key={category}>
                <h2 className="text-xl font-bold text-primary mb-4">{category}</h2>
                <div className="space-y-3">
                  {questions.map((faq, i) => {
                    const itemKey = `${category}-${i}`;
                    const isExpanded = expandedItems.has(itemKey);

                    return (
                      <div key={i} className="glass-card overflow-hidden">
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                        >
                          <span className="text-sm font-semibold text-primary">{faq.question}</span>
                          <ChevronDown
                            size={20}
                            className={`text-cyan flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-white/5">
                            <p className="text-sm text-secondary leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {Object.keys(filteredFAQs).length === 0 && (
              <div className="glass-card p-12 text-center">
                <HelpCircle size={48} className="text-muted mx-auto mb-4" />
                <p className="text-primary font-semibold mb-2">No results found</p>
                <p className="text-sm text-secondary">Try searching with different keywords</p>
              </div>
            )}
          </div>

          {/* Still Need Help */}
          <div className="glass-card p-8 mt-12 text-center">
            <h3 className="text-xl font-bold text-primary mb-3">Still need help?</h3>
            <p className="text-secondary mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn-cyan px-6 py-3">
                Contact Support
              </button>
              <button
                onClick={() => navigate('/guide')}
                className="btn-ghost-cyan px-6 py-3"
              >
                View User Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
