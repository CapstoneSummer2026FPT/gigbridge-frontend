import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, Building2, CheckCircle, CreditCard, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import '../../admin/styles/admin-users-screen.css';

type MockPaymentMethod = 'qr' | 'bank' | 'card';

interface MockMethodOption {
  readonly id: MockPaymentMethod;
  readonly label: string;
  readonly description: string;
  readonly icon: ReactNode;
}

const PAYMENT_METHODS: readonly MockMethodOption[] = [
  {
    id: 'qr',
    label: 'QR Code',
    description: 'Quet QR ngan hang PayOS',
    icon: <QrCode size={20} />,
  },
  {
    id: 'bank',
    label: 'Ngan hang',
    description: 'Mo phong chuyen khoan ngan hang',
    icon: <Building2 size={20} />,
  },
  {
    id: 'card',
    label: 'The noi dia',
    description: 'Mo phong thanh toan the noi dia',
    icon: <CreditCard size={20} />,
  },
];

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function getRequiredNumber(params: URLSearchParams, key: string): number | null {
  const rawValue = params.get(key);
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function WalletMockCheckoutScreen() {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderCode = getRequiredNumber(params, 'orderCode');
  const amount = getRequiredNumber(params, 'amount');
  const paymentLinkId = params.get('paymentLinkId') ?? (orderCode ? `mock-${orderCode}` : 'mock-payment');
  const returnUrl = params.get('returnUrl') ?? '/wallet/deposit?result=success';
  const cancelUrl = params.get('cancelUrl') ?? '/wallet/deposit?result=cancel';

  const [selectedMethod, setSelectedMethod] = useState<MockPaymentMethod>('qr');
  const [processing, setProcessing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isValidCheckout = orderCode !== null && amount !== null;

  const handleSelectQr = () => setSelectedMethod('qr');
  const handleSelectBank = () => setSelectedMethod('bank');
  const handleSelectCard = () => setSelectedMethod('card');

  const getSelectHandler = (method: MockPaymentMethod) => {
    if (method === 'bank') {
      return handleSelectBank;
    }

    if (method === 'card') {
      return handleSelectCard;
    }

    return handleSelectQr;
  };

  const redirectToCancel = () => {
    window.location.href = cancelUrl;
  };

  const handleConfirmPayment = async () => {
    if (!isValidCheckout || processing) {
      return;
    }

    setProcessing(true);
    setErrorText(null);

    const response = await walletPostAPI.confirmPayOsTopUp({
      orderCode,
      success: true,
      code: '00',
      desc: `Mock PayOS payment via ${selectedMethod}`,
      gatewayTransactionCode: `mock-ref-${orderCode}`,
      amountVnd: amount,
      signature: 'mock-signature',
      data: {
        orderCode,
        amount,
        reference: `mock-ref-${orderCode}`,
        paymentLinkId,
        code: '00',
        desc: 'success',
      },
    });

    if (response.success) {
      window.location.href = returnUrl;
      return;
    }

    setErrorText(response.message || 'Khong the xac nhan giao dich mock.');
    setProcessing(false);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            onClick={() => navigate('/wallet/deposit')}
            className="flex items-center gap-2 text-sm text-primary mb-6 hover:opacity-80 transition"
          >
            <ArrowLeft size={16} />
            Quay lai nap vi
          </button>

          <div className="glass-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={20} className="text-cyan" />
                  <span className="badge-cyan text-xs">Mock PayOS</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-primary">Thanh toan thu nghiem</h1>
                <p className="text-sm text-secondary mt-1">Dung cho moi truong local khi backend bat PayOS mock.</p>
              </div>
              <div className="glass-card p-4 min-w-48">
                <p className="text-xs text-muted mb-1">So tien</p>
                <p className="text-2xl font-bold text-green">{amount !== null ? `${formatVnd(amount)} d` : '--'}</p>
              </div>
            </div>

            {!isValidCheckout ? (
              <div className="bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm font-semibold">Du lieu mock checkout khong hop le.</span>
              </div>
            ) : (
              <>
                <div className="glass-card p-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted mb-1">Order code</p>
                      <p className="text-primary font-mono">{orderCode}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Payment link</p>
                      <p className="text-primary font-mono truncate">{paymentLinkId}</p>
                    </div>
                    <div>
                      <p className="text-muted mb-1">Trang thai</p>
                      <span className="badge-amber text-xs">Cho thanh toan</span>
                    </div>
                  </div>
                </div>

                {errorText ? (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-semibold">{errorText}</span>
                  </div>
                ) : null}

                <section className="mb-8">
                  <h2 className="text-lg font-bold text-primary mb-4">Chon phuong thuc thanh toan</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={getSelectHandler(method.id)}
                        className={`glass-card p-4 text-left transition-all ${
                          selectedMethod === method.id ? 'ring-2 ring-cyan border-cyan' : 'hover:border-cyan/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={selectedMethod === method.id ? 'text-cyan' : 'text-secondary'}>{method.icon}</span>
                          {selectedMethod === method.id ? <CheckCircle size={18} className="text-cyan" /> : null}
                        </div>
                        <p className="text-sm font-bold text-primary mt-3">{method.label}</p>
                        <p className="text-xs text-secondary mt-1">{method.description}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={processing}
                    className="btn-green flex-1 px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Mo phong thanh toan thanh cong
                  </button>
                  <button
                    type="button"
                    onClick={redirectToCancel}
                    disabled={processing}
                    className="btn-ghost-cyan px-6 py-3 disabled:opacity-50"
                  >
                    Huy thanh toan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
