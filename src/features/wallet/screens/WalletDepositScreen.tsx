import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wallet, CreditCard, DollarSign, ArrowRight, CheckCircle, AlertCircle, XCircle, Coins } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../../admin/styles/admin-users-screen.css';

type PaymentMethod = 'card' | 'paypal' | 'bank';
type Currency = 'VND' | 'USD';

// Exchange rates
const VND_TO_GIG_COIN = 1000; // 1 Gig Coin = 1,000 VND
const USD_TO_VND = 25000; // 1 USD = 25,000 VND (example rate)

const DEPOSIT_AMOUNTS_VND = [50000, 100000, 250000, 500000, 1000000, 2500000];
const DEPOSIT_AMOUNTS_USD = [50, 100, 250, 500, 1000, 2500];

export default function WalletDepositScreen() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>('VND');
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentBalance = 2450.50; // Current Gig Coin balance

  // Calculate Gig Coins based on currency
  const calculateGigCoins = (amount: number, curr: Currency): number => {
    if (curr === 'VND') {
      return amount / VND_TO_GIG_COIN;
    } else {
      // USD -> VND -> Gig Coins
      const vndAmount = amount * USD_TO_VND;
      return vndAmount / VND_TO_GIG_COIN;
    }
  };

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
  const gigCoinsToReceive = calculateGigCoins(finalAmount, currency);
  const newBalance = currentBalance + gigCoinsToReceive;

  const depositAmounts = currency === 'VND' ? DEPOSIT_AMOUNTS_VND : DEPOSIT_AMOUNTS_USD;

  const handleDeposit = async () => {
    setProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    setSuccess(true);

    // Redirect after success
    setTimeout(() => {
      navigate('/wallet/history');
    }, 2000);
  };

  if (success) {
    return (
      <AppLayout>
        <div className="w-full max-w-[100vw] overflow-x-hidden min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} className="text-green" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Nạp Tiền Thành Công!</h2>
              <p className="text-sm text-secondary mb-4">
                Bạn đã nạp {currency === 'VND'
                  ? `${finalAmount.toLocaleString('vi-VN')} VND`
                  : `$${finalAmount.toFixed(2)} USD`}
              </p>
              <div className="glass-card p-4 mb-4">
                <p className="text-xs text-muted mb-1">Gig Coins Nhận Được</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="text-amber-400" size={24} />
                  <p className="text-3xl font-bold text-amber-400">{gigCoinsToReceive.toLocaleString()}</p>
                </div>
              </div>
              <div className="glass-card p-4 mb-6">
                <p className="text-xs text-muted mb-1">Số Dư Mới</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="text-green" size={20} />
                  <p className="text-2xl font-bold text-green">{newBalance.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/wallet/history')}
                className="btn-cyan w-full px-6 py-3"
              >
                Xem Lịch Sử Giao Dịch
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={20} className="text-amber-400" />
              <span className="badge-green text-xs">Nạp Tiền</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">Nạp Gig Coin</h1>
            <p className="text-sm text-secondary mt-1">Thêm tiền vào ví của bạn</p>
            <div className="flex items-center gap-2 mt-3 p-3 glass-card inline-flex">
              <Coins className="text-amber-400" size={16} />
              <span className="text-xs text-secondary">1 Gig Coin = 1,000 VND</span>
              <span className="text-xs text-muted">•</span>
              <span className="text-xs text-secondary">1 USD ≈ 25 Gig Coins</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Deposit Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Balance */}
              <div className="glass-card p-6">
                <p className="text-xs text-muted mb-2">Số Dư Hiện Tại</p>
                <div className="flex items-center gap-2">
                  <Coins className="text-green" size={32} />
                  <p className="text-3xl font-bold text-green">{currentBalance.toLocaleString()}</p>
                  <span className="text-sm text-secondary">Gig Coins</span>
                </div>
              </div>

              {/* Currency Selector */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Chọn Đơn Vị Tiền Tệ</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setCurrency('VND');
                      setSelectedAmount(100000);
                      setCustomAmount('');
                    }}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      currency === 'VND'
                        ? 'bg-amber-400/20 text-amber-400 border-2 border-amber-400'
                        : 'glass-button text-secondary hover:bg-white/5'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">₫</div>
                      <div>VND</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setCurrency('USD');
                      setSelectedAmount(100);
                      setCustomAmount('');
                    }}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      currency === 'USD'
                        ? 'bg-amber-400/20 text-amber-400 border-2 border-amber-400'
                        : 'glass-button text-secondary hover:bg-white/5'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">$</div>
                      <div>USD</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Select Amount */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Chọn Số Tiền</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {depositAmounts.map(amount => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                      className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                        selectedAmount === amount && !customAmount
                          ? 'bg-green/20 text-green border-2 border-green'
                          : 'glass-button text-secondary hover:bg-white/5'
                      }`}
                    >
                      <div>
                        {currency === 'VND'
                          ? `${(amount / 1000).toLocaleString()}K`
                          : `$${amount}`}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        <Coins className="inline w-3 h-3 mr-1" />
                        {calculateGigCoins(amount, currency).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Số Tiền Tùy Chỉnh</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">
                      {currency === 'VND' ? '₫' : '$'}
                    </span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder={currency === 'VND' ? 'Nhập số tiền' : 'Enter amount'}
                      className="input-gb w-full pl-10 py-3 text-sm"
                      min={currency === 'VND' ? '10000' : '10'}
                      max={currency === 'VND' ? '250000000' : '10000'}
                    />
                  </div>
                  <p className="text-xs text-muted mt-2">
                    {currency === 'VND'
                      ? 'Tối thiểu: 10,000 VND | Tối đa: 250,000,000 VND'
                      : 'Minimum: $10 | Maximum: $10,000'}
                  </p>
                  {customAmount && (
                    <div className="mt-2 p-2 bg-amber-400/10 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary">Gig Coins nhận được:</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins size={14} />
                          {calculateGigCoins(parseFloat(customAmount), currency).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Phương Thức Thanh Toán</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-cyan/20 text-cyan border-2 border-cyan'
                        : 'glass-button text-secondary hover:bg-white/5'
                    }`}
                  >
                    <CreditCard size={20} />
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">Thẻ Tín Dụng / Ghi Nợ</p>
                      <p className="text-xs opacity-60">Visa, Mastercard, Amex</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      paymentMethod === 'paypal'
                        ? 'bg-cyan/20 text-cyan border-2 border-cyan'
                        : 'glass-button text-secondary hover:bg-white/5'
                    }`}
                  >
                    <Wallet size={20} />
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">PayPal</p>
                      <p className="text-xs opacity-60">Nhanh & bảo mật</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('bank')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      paymentMethod === 'bank'
                        ? 'bg-cyan/20 text-cyan border-2 border-cyan'
                        : 'glass-button text-secondary hover:bg-white/5'
                    }`}
                  >
                    <DollarSign size={20} />
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">Chuyển Khoản Ngân Hàng</p>
                      <p className="text-xs opacity-60">2-3 ngày làm việc</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-cyan/10 border border-cyan/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-cyan flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">Thanh Toán Bảo Mật</p>
                    <p className="text-xs text-secondary">
                      Tất cả giao dịch đều được mã hóa và bảo mật. Thông tin thanh toán của bạn không bao giờ được lưu trên máy chủ của chúng tôi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-24">
                <h3 className="text-lg font-bold text-primary mb-4">Tóm Tắt</h3>

                <div className="space-y-3 mb-4 pb-4 border-b border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Số Tiền Nạp</span>
                    <span className="text-primary font-semibold">
                      {currency === 'VND'
                        ? `${finalAmount.toLocaleString('vi-VN')} ₫`
                        : `$${finalAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Phí Xử Lý</span>
                    <span className="text-green font-semibold">
                      {currency === 'VND' ? '0 ₫' : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Gig Coins Nhận</span>
                    <div className="flex items-center gap-1">
                      <Coins className="text-amber-400" size={14} />
                      <span className="text-amber-400 font-bold">
                        {gigCoinsToReceive.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Số Dư Hiện Tại</span>
                    <div className="flex items-center gap-1">
                      <Coins className="text-primary" size={14} />
                      <span className="text-primary font-semibold">
                        {currentBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-green/10 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-primary">Số Dư Mới</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Coins className="text-green" size={24} />
                    <span className="text-2xl font-bold text-green">
                      {newBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={processing || (currency === 'VND' ? finalAmount < 10000 : finalAmount < 10)}
                  className="btn-green w-full px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang Xử Lý...
                    </>
                  ) : (
                    <>
                      Xác Nhận Nạp Tiền
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="btn-ghost-cyan w-full px-6 py-2 mt-3"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
