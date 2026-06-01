import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Zap, ArrowLeft, Check } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';

const GIGCOIN_PACKAGES = [
  { id: 1, coins: 50, price: 4.99, popular: false },
  { id: 2, coins: 150, price: 12.99, popular: true, savings: '13% off' },
  { id: 3, coins: 500, price: 39.99, popular: false, savings: '20% off' },
  { id: 4, coins: 1000, price: 69.99, popular: false, savings: '30% off' },
];

export default function BuyGigcoinScreen() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      navigate(-1);
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-primary mb-4 hover:opacity-80 transition">
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-3xl font-black text-primary mb-2">Buy GigCoins</h1>
          <p className="text-sm job-detail-desc">Boost your applications and stand out to clients</p>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {GIGCOIN_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`glass-card p-6 cursor-pointer transition-all ${
                selectedPackage === pkg.id 
                  ? 'ring-2 ring-cyan neon-border-cyan' 
                  : 'hover:border-cyan'
              } ${pkg.popular ? 'relative' : ''}`}>
              
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan to-purple text-white">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Zap size={20} className="text-purple" />
                <span className="text-2xl font-black text-primary">{pkg.coins}</span>
              </div>

              <p className="text-sm job-detail-desc mb-4">GigCoins</p>

              <div className="mb-4">
                <span className="text-2xl font-black text-primary">${pkg.price}</span>
                {pkg.savings && (
                  <p className="text-xs text-green mt-1">{pkg.savings}</p>
                )}
              </div>

              {selectedPackage === pkg.id && (
                <div className="flex items-center gap-2 text-xs text-cyan">
                  <Check size={14} />
                  Selected
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Purchase Button */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm job-detail-desc mb-1">Selected Package</p>
              <p className="text-lg font-semibold text-primary">
                {selectedPackage 
                  ? `${GIGCOIN_PACKAGES.find(p => p.id === selectedPackage)?.coins} GigCoins - $${GIGCOIN_PACKAGES.find(p => p.id === selectedPackage)?.price}`
                  : 'No package selected'}
              </p>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={!selectedPackage || isProcessing}
            className="btn-cyan w-full py-3 text-sm flex items-center justify-center gap-2">
            {isProcessing ? (
              <><div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />Processing...</>
            ) : (
              <><Zap size={16} />Purchase GigCoins</>
            )}
          </button>

          <p className="text-xs job-detail-desc text-center mt-4">
            Secure payment powered by Stripe
          </p>
        </div>

        {/* Benefits */}
        <div className="glass-card p-6">
          <h2 className="text-primary font-semibold mb-4">Why GigCoins?</h2>
          <div className="space-y-3">
            {[
              'Stand out with priority applications',
              'Increase your chances of getting hired',
              'Access exclusive job opportunities',
              'Boost your profile visibility',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={16} className="text-green flex-shrink-0" />
                <span className="text-sm text-primary">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
