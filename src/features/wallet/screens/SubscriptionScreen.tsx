import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, Check, Zap, Star, TrendingUp, Shield, Bot, Calendar } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { SubscriptionDuration } from '../../../types/models/Financial';
import '../../admin/styles/admin-users-screen.css';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';

const FREE_FEATURES = [
  'Basic job posting',
  'Limited proposals (3/month)',
  'Standard support',
  'Basic analytics',
];

const PRO_FEATURES = [
  'Unlimited job posting',
  'Unlimited proposals',
  'AI-powered matching',
  'AI interview preparation',
  'AI proposal generator',
  'Priority support 24/7',
  'Advanced analytics',
  'Custom contracts',
  'Featured listings',
  'No platform fees',
];

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState<SubscriptionDuration>(SubscriptionDuration.Monthly);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Mock current subscription
  const currentPlan = 'Free';
  const isProUser = currentPlan === 'Pro';

  const monthlyPrice = 29.99;
  const yearlyPrice = 299.99;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const yearlySavings = (monthlyPrice * 12) - yearlyPrice;

  const selectedPrice = duration === SubscriptionDuration.Monthly ? monthlyPrice : yearlyPrice;

  const handleSubscribe = async () => {
    setProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    setShowConfirm(false);
    // Redirect to success or payment page
    navigate('/subscription/success');
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap size={24} className="text-purple" />
              <span className="badge-purple text-sm">Upgrade</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary mb-3">
              Unlock GigBridge <span className="gradient-text-cyan">Pro</span>
            </h1>
            <p className="text-lg text-secondary">Get unlimited access to AI-powered features</p>
          </div>

          {/* Duration Toggle */}
          <div className="flex justify-center mb-12">
            <div className="role-toggle">
              <button
                onClick={() => setDuration(SubscriptionDuration.Monthly)}
                className={`role-toggle-btn ${duration === SubscriptionDuration.Monthly ? 'active' : ''}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setDuration(SubscriptionDuration.Yearly)}
                className={`role-toggle-btn ${duration === SubscriptionDuration.Yearly ? 'active' : ''}`}
              >
                Yearly
                <span className="badge-green text-[10px] ml-1.5 inline-flex items-center gap-1">Save <GigCoinAmount amount={yearlySavings} /></span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Free Plan */}
            <div className="glass-card p-8 relative">
              {currentPlan === 'Free' && (
                <div className="absolute top-4 right-4">
                  <span className="badge-cyan text-xs">Current Plan</span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <GigCoinAmount amount={0} className="text-4xl font-black text-primary" />
                  <span className="text-sm text-secondary">/month</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {FREE_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-gray" />
                    </div>
                    <span className="text-sm text-secondary">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={currentPlan === 'Free'}
                className="btn-ghost-cyan w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentPlan === 'Free' ? 'Current Plan' : 'Downgrade'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="glass-card p-8 relative neon-border-purple">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge-purple text-xs flex items-center gap-1">
                  <Star size={12} />
                  Most Popular
                </span>
              </div>
              {currentPlan === 'Pro' && (
                <div className="absolute top-4 right-4">
                  <span className="badge-green text-xs">Active</span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold gradient-text-purple mb-2">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-green">
                    ${duration === SubscriptionDuration.Monthly ? monthlyPrice.toFixed(2) : yearlyMonthlyEquivalent.toFixed(2)}
                  </span>
                  <span className="text-sm text-secondary">/month</span>
                </div>
                {duration === SubscriptionDuration.Yearly && (
                  <p className="text-xs text-green mt-1">
                    Billed ${yearlyPrice.toFixed(2)}/year
                  </p>
                )}
              </div>

              <div className="space-y-3 mb-8">
                {PRO_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-green" />
                    </div>
                    <span className="text-sm text-primary font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                disabled={currentPlan === 'Pro'}
                className="btn-purple w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentPlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>

          {/* Features Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-purple/20 flex items-center justify-center mx-auto mb-4">
                <Bot size={28} className="text-purple" />
              </div>
              <h4 className="text-lg font-bold text-primary mb-2">AI-Powered Tools</h4>
              <p className="text-sm text-secondary">
                Smart matching, proposal generator, and interview prep powered by advanced AI
              </p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={28} className="text-green" />
              </div>
              <h4 className="text-lg font-bold text-primary mb-2">Unlimited Growth</h4>
              <p className="text-sm text-secondary">
                No limits on jobs, proposals, or earnings. Scale your freelance business
              </p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-cyan/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={28} className="text-cyan" />
              </div>
              <h4 className="text-lg font-bold text-primary mb-2">Priority Support</h4>
              <p className="text-sm text-secondary">
                24/7 dedicated support team to help you succeed on the platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="glass-card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple/20 flex items-center justify-center">
                <Zap size={24} className="text-purple" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Confirm Upgrade</h2>
                <p className="text-xs text-muted">Review your subscription details</p>
              </div>
            </div>

            <div className="glass-card p-5 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-primary mb-1">GigBridge Pro</p>
                  <p className="text-xs text-secondary capitalize">{duration} billing</p>
                </div>
                <span className="badge-purple text-xs">Pro</span>
              </div>

              <div className="space-y-2 text-sm pt-3 border-t border-white/5">
                <div className="flex justify-between">
                  <span className="text-secondary">
                    {duration === SubscriptionDuration.Monthly ? 'Monthly' : 'Yearly'} Price
                  </span>
                  <span className="text-primary font-semibold">{selectedPrice.toFixed(2)} GigCoin</span>
                </div>
                {duration === SubscriptionDuration.Yearly && (
                  <div className="flex justify-between">
                    <span className="text-green text-xs">You save</span>
                    <span className="text-green font-semibold text-xs">${yearlySavings.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-3 mt-3 border-t border-white/5">
                <span className="text-primary font-bold">Total Due Today</span>
                <span className="text-2xl font-black text-green">{selectedPrice.toFixed(2)} GigCoin</span>
              </div>
            </div>

            <div className="bg-cyan/10 border border-cyan/20 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Calendar size={18} className="text-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Auto-Renewal</p>
                  <p className="text-xs text-secondary">
                    Your subscription will automatically renew on{' '}
                    {new Date(Date.now() + (duration === SubscriptionDuration.Monthly ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}. Cancel anytime from settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-ghost-cyan flex-1 px-6 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={processing}
                className="btn-purple flex-1 px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Confirm & Pay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
