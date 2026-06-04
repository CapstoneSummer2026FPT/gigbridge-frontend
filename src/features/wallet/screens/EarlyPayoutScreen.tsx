import { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Clock, Crown, Send, Wallet } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { MOCK_EARLY_PAYOUT } from '../mock/data-for-EarlyPayoutScreen';
import { formatVnd } from '../mock/data-for-FinancialOverviewScreen';
import '../styles/early-payout-screen.css';

export default function EarlyPayoutScreen() {
  const [isPremium, setIsPremium] = useState(true);
  const [amount, setAmount] = useState('10000000');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const amountValue = Number(amount || 0);
  const fee = useMemo(() => Math.round(amountValue * MOCK_EARLY_PAYOUT.feeRate), [amountValue]);
  const netAmount = Math.max(0, amountValue - fee);

  const requestPayout = () => {
    setSuccess('');
    if (!isPremium) {
      setError('MSG45: This feature requires a Premium subscription');
      return;
    }
    if (amountValue > MOCK_EARLY_PAYOUT.availableBalanceVnd || amountValue <= 0) {
      setError('MSG59: Insufficient available balance for withdrawal');
      return;
    }
    setError('');
    setSuccess(`Early payout approved. ${formatVnd(netAmount)} will be transferred within 5 minutes.`);
  };

  return (
    <AppLayout>
      <div className="early-payout-page">
        <header className="early-payout-header">
          <div>
            <p><Crown size={18} /> Premium Freelancer</p>
            <h1>Request Early Payout</h1>
            <span>Instant withdrawal bypasses the standard 3-5 business day holding period.</span>
          </div>
          <button className={isPremium ? 'active' : ''} onClick={() => setIsPremium(!isPremium)}>
            <Crown size={16} />
            {isPremium ? 'Premium Active' : 'Non-premium Demo'}
          </button>
        </header>

        {error && <div className="early-payout-alert danger"><AlertTriangle size={17} />{error}</div>}
        {success && <div className="early-payout-alert success"><CheckCircle2 size={17} />{success}</div>}

        <div className="early-payout-layout">
          <main className="early-payout-card">
            <div className="early-payout-balance">
              <Wallet size={24} />
              <div>
                <span>Available Balance</span>
                <strong>{formatVnd(MOCK_EARLY_PAYOUT.availableBalanceVnd)}</strong>
              </div>
            </div>

            <label>
              Withdrawal amount
              <input value={amount} type="number" min={MOCK_EARLY_PAYOUT.minAmountVnd} onChange={event => setAmount(event.target.value)} />
            </label>

            <div className="early-payout-summary">
              <div><span>Requested amount</span><b>{formatVnd(amountValue || 0)}</b></div>
              <div><span>Early payout fee</span><b>{formatVnd(fee || 0)}</b></div>
              <div><span>Net transfer</span><b>{formatVnd(netAmount || 0)}</b></div>
              <div><span>Transfer speed</span><b>{MOCK_EARLY_PAYOUT.instantTransferTime}</b></div>
            </div>

            <button className="early-payout-submit" onClick={requestPayout}>
              <Send size={18} />
              Request Early Payout
            </button>
          </main>

          <aside className="early-payout-side">
            <div>
              <Banknote size={22} />
              <strong>Bank Account</strong>
              <p>{MOCK_EARLY_PAYOUT.defaultAccount.bankName}</p>
              <p>{MOCK_EARLY_PAYOUT.defaultAccount.accountName}</p>
              <p>{MOCK_EARLY_PAYOUT.defaultAccount.accountNumber}</p>
            </div>
            <div>
              <Clock size={22} />
              <strong>Processing Rules</strong>
              <p>Standard withdrawal: {MOCK_EARLY_PAYOUT.standardHoldingDays}</p>
              <p>Early Payout: {MOCK_EARLY_PAYOUT.instantTransferTime}</p>
              <p>Processing fee: {(MOCK_EARLY_PAYOUT.feeRate * 100).toFixed(1)}%</p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
