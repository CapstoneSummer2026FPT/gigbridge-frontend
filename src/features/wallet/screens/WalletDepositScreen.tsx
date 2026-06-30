import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle,
  CreditCard,
  Loader2,
  QrCode,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import '../../admin/styles/admin-users-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';

const VND_PER_GIGCOIN = 1000;
const MIN_VND = 10_000;
const MAX_VND = 250_000_000;
const LAST_PAYOS_ORDER_CODE_KEY = 'gigbridge:lastPayOsTopUpOrderCode';

const QUICK_AMOUNTS_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

function fmtVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function makeIdempotencyKey(): string {
  return `topup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function WalletDepositScreen() {
  const navigate = useNavigate();
  const syncAttemptedRef = useRef<number | null>(null);

  const [selectedVnd, setSelectedVnd] = useState<number>(100_000);
  const [customVnd, setCustomVnd] = useState('');
  const [processing, setProcessing] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnOrderCode, setReturnOrderCode] = useState<number | null>(null);
  const [syncingReturn, setSyncingReturn] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const finalVnd = customVnd ? parseInt(customVnd, 10) || 0 : selectedVnd;
  const gigcoinAmount = finalVnd / VND_PER_GIGCOIN;
  const isAmountValid = finalVnd >= MIN_VND && finalVnd <= MAX_VND;

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await walletGetAPI.getMyWallet();
      if (res.success && res.data) {
        setCurrentBalance(res.data.availableTokens);
      } else {
        setErrorText(res.message || 'Không thể tải số dư ví.');
      }
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
      setErrorText(getErrorMessage(error, 'Không thể kết nối tới máy chủ.'));
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    const status = params.get('status');
    const isCancelled = result === 'cancel' || params.get('cancel') === 'true' || status === 'CANCELLED';
    const fallbackOrderCode = window.localStorage.getItem(LAST_PAYOS_ORDER_CODE_KEY);
    const orderCode = Number(params.get('orderCode') || fallbackOrderCode);

    if (result === 'success' && !isCancelled) {
      setReturnSuccess(true);
      if (Number.isSafeInteger(orderCode) && orderCode > 0) {
        setReturnOrderCode(orderCode);
      }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (isCancelled) {
      setErrorText('Thanh toán đã bị hủy bởi người dùng.');
      window.localStorage.removeItem(LAST_PAYOS_ORDER_CODE_KEY);
      if (Number.isSafeInteger(orderCode) && orderCode > 0) {
        walletPostAPI.syncPayOsTopUp({ orderCode }).catch(err => {
          console.error('Failed to sync cancelled payment status:', err);
        });
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, []);

  useEffect(() => {
    if (!returnSuccess || !returnOrderCode || syncAttemptedRef.current === returnOrderCode) {
      return;
    }

    syncAttemptedRef.current = returnOrderCode;

    const syncReturnedTopUp = async () => {
      setSyncingReturn(true);
      setErrorText(null);

      try {
        let synced = false;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const syncRes = await walletPostAPI.syncPayOsTopUp({ orderCode: returnOrderCode });
          if (!syncRes.success) {
            setErrorText(syncRes.message || 'Không thể đồng bộ giao dịch PayOS.');
            break;
          }

          if (syncRes.data?.status === 1) {
            synced = true;
            window.localStorage.removeItem(LAST_PAYOS_ORDER_CODE_KEY);
            break;
          }

          if (attempt < 4) {
            await new Promise(resolve => window.setTimeout(resolve, 3000));
          }
        }

        await fetchBalance();
        window.dispatchEvent(new Event('gigbridge-wallet-updated'));

        if (!synced) {
          setErrorText('PayOS đã trả về thành công. Hệ thống đang chờ xác nhận giao dịch, vui lòng tải lại số dư sau ít phút.');
        }
      } catch (error) {
        console.error('PayOS sync error:', error);
        setErrorText(getErrorMessage(error, 'Không thể đồng bộ trạng thái thanh toán PayOS.'));
      } finally {
        setSyncingReturn(false);
      }
    };

    void syncReturnedTopUp();
  }, [returnSuccess, returnOrderCode]);

  const handleDeposit = async () => {
    if (!isAmountValid || processing) {
      return;
    }

    setProcessing(true);
    setErrorText(null);

    try {
      const returnUrl = `${window.location.origin}/wallet/deposit?result=success`;
      const cancelUrl = `${window.location.origin}/wallet/deposit?result=cancel`;

      const res = await walletPostAPI.createTopUp({
        tokenAmount: gigcoinAmount,
        returnUrl,
        cancelUrl,
        idempotencyKey: makeIdempotencyKey(),
      });

      if (res.success && res.data?.checkoutUrl) {
        if (res.data.gatewayOrderCode) {
          window.localStorage.setItem(LAST_PAYOS_ORDER_CODE_KEY, res.data.gatewayOrderCode);
        }
        window.location.href = res.data.checkoutUrl;
        return;
      }

      setErrorText(res.message || 'Không thể khởi tạo giao dịch nạp tiền.');
      setProcessing(false);
    } catch (error) {
      console.error('Top-up error:', error);
      setErrorText(getErrorMessage(error, 'Đã xảy ra lỗi trong quá trình khởi tạo thanh toán.'));
      setProcessing(false);
    }
  };

  if (returnSuccess) {
    return (
      <AppLayout>
        <div className="w-full max-w-[100vw] overflow-x-hidden min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="glass-card p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Loader2 size={48} className="text-amber-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Đang Xác Nhận Giao Dịch</h2>
              <p className="text-sm text-secondary mb-6">
                Thanh toán của bạn đang được xử lý. Số dư sẽ được cập nhật sau khi PayOS xác nhận.
              </p>
              {errorText && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-3 mb-4 text-sm font-semibold">
                  {errorText}
                </div>
              )}
              <div className="glass-card p-4 mb-6">
                <p className="text-xs text-muted mb-1">Số Dư Hiện Tại</p>
                <p className="text-xs text-muted mb-1">Số Dư Hiện Tại</p>
                <div className="flex items-center justify-center gap-2">
                  <GigCoinLogo size={20} />
                  <p className="text-2xl font-bold text-green">
                    {loadingBalance ? (
                      <Loader2 size={20} className="animate-spin inline" />
                    ) : (
                      fmtVnd(currentBalance)
                    )}
                  </p>
                  <span className="text-sm text-secondary"></span>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { void fetchBalance(); }}
                  className="btn-ghost-cyan w-full px-6 py-3 font-semibold flex items-center justify-center gap-2"
                  disabled={syncingReturn}
                >
                  <Loader2 size={16} className={syncingReturn ? 'animate-spin' : ''} />
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

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <GigCoinLogo size={20} />
              <span className="badge-green text-xs">Nạp Tiền</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary">Nạp GigCoin</h1>
            <p className="text-sm text-secondary mt-1">Thanh toán qua PayOS - Chuyển khoản ngân hàng / QR Code</p>
            <div className="flex items-center gap-2 mt-3 p-3 glass-card inline-flex">
              <GigCoinLogo size={16} />
              <span className="text-xs text-secondary font-semibold">1 {fmtVnd(VND_PER_GIGCOIN)} VND</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {errorText && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="text-sm font-semibold">{errorText}</span>
                </div>
              )}

              <div className="glass-card p-6">
                <p className="text-xs text-muted mb-2">Số Dư Hiện Tại</p>
                <div className="flex items-center gap-2">
                  <GigCoinLogo size={32} />
                  <p className="text-3xl font-bold text-green">
                    {loadingBalance ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      fmtVnd(currentBalance)
                    )}
                  </p>
                  <span className="text-sm text-secondary"></span>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Chọn Số Tiền</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
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
                      <div>{fmtVnd(amount)} đ</div>
                      <div className="text-xs opacity-60 mt-1">
                        <GigCoinLogo className="inline mr-1" size={12} />
                        {fmtVnd(amount / VND_PER_GIGCOIN)} 
                      </div>
                    </button>
                  ))}
                </div>

                <label className="block text-sm font-semibold text-primary mb-2">Số Tiền Tùy Chỉnh (VND)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">đ</span>
                  <input
                    type="number"
                    value={customVnd}
                    onChange={event => setCustomVnd(event.target.value)}
                    placeholder="Nhập số tiền VND"
                    className="input-gb w-full pl-10 py-3 text-sm"
                    min={MIN_VND}
                    max={MAX_VND}
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  Tối thiểu: {fmtVnd(MIN_VND)} VND - Tối đa: {fmtVnd(MAX_VND)} VND
                </p>
                {customVnd && parseInt(customVnd, 10) > 0 && (
                  <div className="mt-2 p-2 bg-amber-400/10 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">GigCoin nhận được:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <GigCoinLogo size={14} />
                        {fmtVnd((parseInt(customVnd, 10) || 0) / VND_PER_GIGCOIN)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-primary mb-4">Phương Thức Thanh Toán</h3>
                <div className="bg-cyan/10 border-2 border-cyan rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan/20 flex items-center justify-center">
                      <QrCode size={24} className="text-cyan" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-primary">Thanh Toán Trực Tuyến</p>
                      <p className="text-xs text-secondary mt-0.5">QR Code - Chuyển khoản ngân hàng - Ví điện tử</p>
                    </div>
                    <CheckCircle size={20} className="text-cyan" />
                  </div>
                </div>
              </div>

              <div className="bg-cyan/10 borderthì  border-cyan/20 rounded-lg p-4">
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

            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-24">
                <h3 className="text-lg font-bold text-primary mb-4">Tóm Tắt</h3>

                <div className="space-y-3 mb-4 pb-4 border-b border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Số Tiền Nạp</span>
                    <span className="text-primary font-semibold">{fmtVnd(finalVnd)} đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Phí Xử Lý</span>
                    <span className="text-green font-semibold">0 đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">GigCoin Nhận</span>
                    <div className="flex items-center gap-1">
                      <GigCoinLogo size={14} />
                      <span className="text-amber-400 font-bold">{fmtVnd(gigcoinAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Số Dư Hiện Tại</span>
                    <div className="flex items-center gap-1">
                      <GigCoinLogo size={14} />
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
                    <GigCoinLogo size={24} />
                    <span className="text-2xl font-bold text-green">
                      {loadingBalance ? '...' : fmtVnd(currentBalance + gigcoinAmount)}
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