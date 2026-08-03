import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import { BankAccountStatus } from '../../../types';
import type { BankAccountResponse, SupportedBankResponse } from '../../../types';
import '../styles/early-payout-screen.css';
import '../styles/bank-account-manager.css';

type BankFormState = {
  bankBin: string;
  accountNumber: string;
  accountName: string;
};

const emptyBankForm: BankFormState = {
  bankBin: '',
  accountNumber: '',
  accountName: '',
};

const ACCOUNT_NUMBER_PATTERN = /^[0-9A-Za-z\s-]{4,40}$/;

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

interface BankAccountManagerProps {
  /**
   * Called with the full saved-account list whenever it changes (initial load,
   * save, update, delete). Lets a parent keep its own list/selection in sync —
   * e.g. the withdrawal screen's bank picker.
   */
  onBankAccountsChange?: (accounts: BankAccountResponse[]) => void;
}

/**
 * Self-contained bank-account manager used by both the withdrawal screen
 * (/wallet/withdrawals) and the Settings payment tab (/settings). Accounts are
 * persisted on the backend under Wallet/bank-accounts, so any account added in
 * Settings is immediately available for selection in the withdrawal flow.
 */
export default function BankAccountManager({ onBankAccountsChange }: BankAccountManagerProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBankResponse[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>(emptyBankForm);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep the latest parent callback in a ref so loadBankAccounts stays stable
  // and the component does not refetch on every parent re-render.
  const onBankAccountsChangeRef = useRef(onBankAccountsChange);
  useEffect(() => {
    onBankAccountsChangeRef.current = onBankAccountsChange;
  }, [onBankAccountsChange]);

  const editingBankAccount = useMemo(
    () => bankAccounts.find(account => account.bankAccountId === editingBankId) || null,
    [bankAccounts, editingBankId]
  );
  const editingBankRequiresAccountNumber = Boolean(
    editingBankAccount && editingBankAccount.status !== BankAccountStatus.Active
  );
  const activeBankCount = useMemo(
    () => bankAccounts.filter(account => account.status === BankAccountStatus.Active && Boolean(account.bankBin)).length,
    [bankAccounts]
  );

  const loadBankAccounts = useCallback(async () => {
    setLoading(true);
    const [bankRes, banksRes] = await Promise.all([
      walletGetAPI.getBankAccounts(),
      walletGetAPI.getSupportedBanks(),
    ]);

    if (bankRes.success && bankRes.data) {
      setBankAccounts(bankRes.data);
      onBankAccountsChangeRef.current?.(bankRes.data);
    }

    if (banksRes.success && banksRes.data) {
      setSupportedBanks(banksRes.data);
    }

    const loadFailures = [
      !bankRes.success ? getResponseMessage(bankRes.message, 'Không thể tải tài khoản ngân hàng.') : '',
      !banksRes.success ? getResponseMessage(banksRes.message, 'Không thể tải danh sách ngân hàng.') : '',
    ].filter(Boolean);
    if (loadFailures.length > 0) {
      setError(loadFailures.join(' '));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBankAccounts();
  }, [loadBankAccounts]);

  const handleBankFormChange = (key: keyof BankFormState, value: string) => {
    setBankForm(prev => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const clearBankForm = () => {
    setBankForm(emptyBankForm);
    setEditingBankId(null);
  };

  const handleEditBank = (account: BankAccountResponse) => {
    setBankForm({
      bankBin: account.bankBin ?? '',
      accountName: account.accountName,
      accountNumber: '',
    });
    setEditingBankId(account.bankAccountId);
    setError('');
    setSuccess('');
  };

  const handleSaveBankAccount = async () => {
    const accountNumber = bankForm.accountNumber.trim();
    const selectedDirectoryBank = supportedBanks.find(bank => bank.bin === bankForm.bankBin);
    if (!selectedDirectoryBank) {
      setError('Vui long chon ngan hang hop le.');
      return;
    }

    const basePayload = {
      bankBin: selectedDirectoryBank.bin,
      bankCode: selectedDirectoryBank.code,
      bankName: selectedDirectoryBank.name,
      accountName: bankForm.accountName.trim(),
    };

    if (!basePayload.bankCode || basePayload.bankCode.length < 2 || basePayload.bankName.length < 2) {
      setError('Vui lòng nhập mã ngân hàng và tên ngân hàng hợp lệ.');
      return;
    }

    if (
      basePayload.accountName.length < 2 ||
      ((!editingBankId || editingBankRequiresAccountNumber) && !ACCOUNT_NUMBER_PATTERN.test(accountNumber))
    ) {
      setError('Vui lòng nhập tên chủ tài khoản và số tài khoản hợp lệ.');
      return;
    }

    if (editingBankId && accountNumber && !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      setError('Số tài khoản mới không hợp lệ.');
      return;
    }

    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = editingBankId
      ? await walletPostAPI.updateBankAccount(editingBankId, {
        ...basePayload,
        ...(accountNumber ? { accountNumber } : {}),
      })
      : await walletPostAPI.createBankAccount({
        ...basePayload,
        accountNumber,
        isDefault: activeBankCount === 0,
      });

    if (response.success && response.data) {
      clearBankForm();
      setSuccess(editingBankId ? 'Đã cập nhật tài khoản ngân hàng.' : 'Đã lưu tài khoản ngân hàng.');
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, 'Không thể lưu tài khoản ngân hàng.'));
    }

    setSavingBank(false);
  };

  const handleSetDefaultBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.updateBankAccount(bankAccountId, { isDefault: true });
    if (response.success && response.data) {
      setSuccess('Đã đặt tài khoản mặc định.');
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, 'Không thể đặt tài khoản mặc định.'));
    }

    setSavingBank(false);
  };

  const handleDeleteBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.deleteBankAccount(bankAccountId);
    if (response.success) {
      setSuccess('Đã xóa tài khoản ngân hàng.');
      if (editingBankId === bankAccountId) {
        clearBankForm();
      }
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, 'Không thể xóa tài khoản đang dùng cho lệnh rút tiền.'));
    }

    setSavingBank(false);
  };

  return (
    <>
      <div className="bam-card">
        <Banknote size={22} />
        <strong>{editingBankId ? 'Sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}</strong>
        {error && (
          <p className="early-payout-alert danger"><AlertTriangle size={15} />{error}</p>
        )}
        {success && (
          <p className="early-payout-alert success"><CheckCircle2 size={15} />{success}</p>
        )}
        <div className="early-payout-form-grid">
          <select value={bankForm.bankBin} onChange={event => handleBankFormChange('bankBin', event.target.value)}>
            <option value="">Chọn ngân hàng</option>
            {supportedBanks.map(bank => (
              <option key={bank.bin} value={bank.bin}>{bank.shortName} - {bank.name}</option>
            ))}
          </select>
          <input
            value={bankForm.accountName}
            onChange={event => handleBankFormChange('accountName', event.target.value)}
            placeholder="Tên chủ tài khoản"
          />
          <input
            value={bankForm.accountNumber}
            onChange={event => handleBankFormChange('accountNumber', event.target.value)}
            placeholder={editingBankRequiresAccountNumber
              ? 'Nhập lại số tài khoản'
              : editingBankId ? 'Số tài khoản mới (tùy chọn)' : 'Số tài khoản'}
          />
        </div>
        {bankAccounts.length > activeBankCount && (
          <small className="early-payout-balance-note">Một số tài khoản cũ cần chọn lại ngân hàng trước khi sử dụng.</small>
        )}
        <button type="button" onClick={() => void handleSaveBankAccount()} disabled={savingBank}>
          {savingBank ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {editingBankId ? 'Cập nhật tài khoản' : 'Lưu tài khoản'}
        </button>
        {editingBankId && (
          <button type="button" onClick={clearBankForm} disabled={savingBank}>
            Hủy sửa
          </button>
        )}
      </div>

      <div className="bam-card">
        <ShieldCheck size={22} />
        <strong>Tài khoản đã lưu</strong>
        {loading ? (
          <p className="early-payout-balance-note"><Loader2 size={14} className="animate-spin" /> Đang tải tài khoản...</p>
        ) : (
          <div className="early-payout-bank-list">
            {bankAccounts.map(account => {
              const isActive = account.status === BankAccountStatus.Active && Boolean(account.bankBin);
              return (
                <article key={account.bankAccountId} className={isActive ? '' : 'requires-update'}>
                  <span>{account.bankName}</span>
                  <p>{account.accountName}</p>
                  <p>{account.accountNumberMasked}</p>
                  {!isActive && <small>Cần chọn lại ngân hàng và nhập lại số tài khoản.</small>}
                  <div>
                    {isActive && !account.isDefault && (
                      <button type="button" onClick={() => void handleSetDefaultBank(account.bankAccountId)} disabled={savingBank}>
                        Đặt mặc định
                      </button>
                    )}
                    <button type="button" onClick={() => handleEditBank(account)} disabled={savingBank}>
                      Sửa
                    </button>
                    <button type="button" onClick={() => void handleDeleteBank(account.bankAccountId)} disabled={savingBank}>
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })}
            {bankAccounts.length === 0 && <p>Chưa có tài khoản ngân hàng.</p>}
          </div>
        )}
      </div>
    </>
  );
}
