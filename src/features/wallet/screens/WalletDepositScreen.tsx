import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CheckCircle, AlertCircle, Coins, Loader2, QrCode, Building2, CreditCard, Clock } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import '../../admin/styles/admin-users-screen.css';

// Exchange rate: 1 Gig Coin = 1,000 VND
const VND_PER_TOKEN = 1000;
const MIN_VND = 10_000;
const MAX_VND = 250_000_000;

const QUICK_AMOUNTS_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

/** Format VND with dot separator */
function fmtVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/** Generate a simple idempotency key */
function makeIdempotencyKey(): string {
  return `topup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function WalletDepositScreen() {
  const navigate = useNavigate();

  // State
  const [selectedVnd, setSelectedVnd] = useState<number>(100_000);
  const [customVnd, setCustomVnd] = useState('');
  const [processing, setProcessing] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Parse redirect query params from PayOS
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    if (result === 'success') {
      setReturnSuccess(true);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    } else if (result === 'cancel') {
      setErrorText('Thanh toán đã bị hủy bởi người dùng.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch wallet balance
  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await walletGetAPI.getMyWallet();
      if (res.success && res.data) {
        setCurrentBalance(res.data.availableTokens);
      } else {
        setErrorText(res.message || 'Không thể tải số dư ví.');
      }
    } catch (err) {
      console.error('Failed to load wallet balance:', err);
      setErrorText('Không thể kết nối tới máy chủ.');
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Derived values
  const finalVnd = customVnd ? parseInt(customVnd, 10) || 0 : selectedVnd;
  const tokenAmount = finalVnd / VND_PER_TOKEN;
  const isAmountValid = finalVnd >= MIN_VND && finalVnd <= MAX_VND;

  // Submit top-up
  const handleDeposit = async () => {
    if (!isAmountValid || processing) return;

    setProcessing(true);
    setErrorText(null);

    try {
      const returnUrl = window.location.origin + '/wallet/deposit?result=success';
      const cancelUrl = window.location.origin + '/wallet/deposit?result=cancel';

      const res = await walletPostAPI.createTopUp({
        tokenAmount,
        returnUrl,
        cancelUrl,
        idempotencyKey: makeIdempotencyKey(),
      });

      if (res.success && res.data?.checkoutUrl) {
        // Redirect to PayOS payment page
        window.location.href = res.data.checkoutUrl;
      } else {
        setErrorText(res.message || 'Không thể khởi tạo giao dịch nạp tiền.');
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Top-up error:', err);
      setErrorText(err?.message || 'Đã xảy ra lỗi trong quá trình khởi tạo thanh toán.');
      setProcessing(false);
    }
  };

  // ── Success return view ──
  if (returnSuccess) {
    return (
      <AppLayout>
        <div className="w-full max-w-[100vw] overflow-x-hidden min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Clock size={48} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Đang Xác Nhận Giao Dịch</h2>
              <p className="text-sm text-secondary mb-6">
                Thanh toán của bạn đang được xử lý. Số dư sẽ được cập nhật sau khi PayOS xác nhận.
              </p>
              <div className="glass-card p-4 mb-6">
                <p className="text-xs text-muted mb-1">Số Dư Hiện Tại</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="text-green" size={20} />
                  <p className="text-2xl font-bold text-green">
                    {loadingBalance ? (
                      <Loader2 size={20} className="animate-spin inline" />
                    ) : (
                      fmtVnd(currentBalance)
                    )}
                  </p>
                  <span className="text-sm text-secondary">tokens</span>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { fetchBalance(); }}
                  className="btn-ghost-cyan w-full px-6 py-3 font-semibold flex items-center justify-center gap-2"
                >
                  <Loader2 size={16} />
                  Tải lại số dư
                </button>
                <button
                  onClick={() => navigate('/wallet/history')}
                  className="btn-cyan w-full px-6 py-3 font-semibold"
                >
                  Xem Lịch Sử Giao Dịch
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Main deposit form ──
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
            <p className="text-sm text-secondary mt-1">Thanh toán qua PayOS – Chuyển khoản ngân hàng / QR Code</p>
            <div className="flex items-center gap-2 mt-3 p-3 glass-card inline-flex">
              <Coins className="text-amber-400" size={16} />
              <span className="text-xs text-secondary font-semibold">1 Token = {fmtVnd(VND_PER_TOKEN)} VND</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Error alert */}
              {errorText && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="text-sm font-semibold">{errorText}</span>
                </div>
              )}

              {/* Current Balance */}
              <div className="glass-card p-6">
                <p className="text-xs text-muted mb-2">Số Dư Hiện Tại</p>
                <div className="flex items-center gap-2">
                  <Coins className="text-green" size={32} />
                  <p className="text-3xl font-bold text-green">
                    {loadingBalance ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      fmtVnd(currentBalance)
                    )}
                  </p>
                  <span className="text-sm text-secondary">tokens</span>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Chọn Số Tiền</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {QUICK_AMOUNTS_VND.map(amount => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedVnd(amount); setCustomVnd(''); }}
                      className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                        selectedVnd === amount && !customVnd
                          ? 'bg-green/20 text-green border-2 border-green'
                          : 'glass-button text-secondary hover:bg-white/5'
                      }`}
                    >
                      <div>{fmtVnd(amount)} ₫</div>
                      <div className="text-xs opacity-60 mt-1">
                        <Coins className="inline w-3 h-3 mr-1" />
                        {fmtVnd(amount / VND_PER_TOKEN)} tokens
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Số Tiền Tùy Chỉnh (VND)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">₫</span>
                    <input
                      type="number"
                      value={customVnd}
                      onChange={e => setCustomVnd(e.target.value)}
                      placeholder="Nhập số tiền VND"
                      className="input-gb w-full pl-10 py-3 text-sm"
                      min={MIN_VND}
                      max={MAX_VND}
                    />
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Tối thiểu: {fmtVnd(MIN_VND)} VND · Tối đa: {fmtVnd(MAX_VND)} VND
                  </p>
                  {customVnd && parseInt(customVnd) > 0 && (
                    <div className="mt-2 p-2 bg-amber-400/10 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary">Tokens nhận được:</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins size={14} />
                          {fmtVnd(parseInt(customVnd) / VND_PER_TOKEN)}
                        </span>
                      </div>
                    </div>
                  )}
                  {customVnd && parseInt(customVnd) > 0 && parseInt(customVnd) < MIN_VND && (
                    <p className="text-xs text-red-400 mt-1">
                      Số tiền phải tối thiểu {fmtVnd(MIN_VND)} VND
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Method - PayOS only */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Phương Thức Thanh Toán</h3>
                <div className="bg-cyan/10 border-2 border-cyan rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan/20 flex items-center justify-center">
                      <QrCode size={24} className="text-cyan" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-primary">PayOS – Thanh Toán Trực Tuyến</p>
                      <p className="text-xs text-secondary mt-0.5">QR Code · Chuyển khoản ngân hàng · Ví điện tử</p>
                    </div>
                    <CheckCircle size={20} className="text-cyan" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { icon: <QrCode size={14} />, label: 'QR Code' },
                    { icon: <Building2 size={14} />, label: 'Ngân hàng' },
                    { icon: <CreditCard size={14} />, label: 'Thẻ nội địa' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1.5 p-2 glass-card text-xs text-secondary justify-center">
                      {m.icon}
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-cyan/10 border border-cyan/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-cyan flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">Thanh Toán Bảo Mật</p>
                    <p className="text-xs text-secondary">
                      Giao dịch được xử lý qua cổng thanh toán PayOS. GigBridge không lưu trữ thông tin thanh toán của bạn.
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
                      {fmtVnd(finalVnd)} ₫
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Phí Xử Lý</span>
                    <span className="text-green font-semibold">0 ₫</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Tokens Nhận</span>
                    <div className="flex items-center gap-1">
                      <Coins className="text-amber-400" size={14} />
                      <span className="text-amber-400 font-bold">
                        {fmtVnd(tokenAmount)}
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
                        {loadingBalance ? '...' : fmtVnd(currentBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-green/10 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-primary">Số Dư Mới (dự kiến)</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Coins className="text-green" size={24} />
                    <span className="text-2xl font-bold text-green">
                      {loadingBalance ? '...' : fmtVnd(currentBalance + tokenAmount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={processing || !isAmountValid}
                  className="btn-green w-full px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
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
