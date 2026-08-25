import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building2,
  User,
  Hash,
  Plus,
  Edit2,
  Trash2,
  Star,
  X,
  Landmark,
  ChevronDown,
  Search,
  Check,
  Info,
  CreditCard,
  Copy,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import { BankAccountStatus } from '../../../types';
import type { BankAccountResponse, SupportedBankResponse } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import { toast } from 'sonner';
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

const POPULAR_BANK_CODES = ['VCB', 'MB', 'TCB', 'BIDV', 'CTG', 'VPB', 'ACB'];

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

type BankLogoProps = {
  code: string;
  name: string;
  logo?: string | null;
  size?: 'compact' | 'card';
};

function getBankLogoUrl(code: string, logo?: string | null): string | null {
  if (logo?.startsWith('https://')) return logo;

  const normalizedCode = code.trim().toUpperCase();
  return /^[A-Z0-9_-]{2,20}$/.test(normalizedCode)
    ? `https://api.vietqr.io/img/${encodeURIComponent(normalizedCode)}.png`
    : null;
}

function BankLogo({ code, name, logo, size = 'compact' }: BankLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getBankLogoUrl(code, logo);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <span className={`bam-bank-logo-frame bam-bank-logo-${size}`}>
        <img
          src={imageUrl}
          alt={`${name} logo`}
          className="bam-bank-logo-image"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`bam-bank-logo-frame bam-bank-logo-${size} bam-bank-logo-fallback`}
      data-testid={`bank-logo-fallback-${code}`}
      aria-label={`${name} logo unavailable`}
    >
      <Landmark aria-hidden="true" />
    </span>
  );
}

function BankIdentityMark({ bank }: { bank: SupportedBankResponse }) {
  return <BankLogo code={bank.code} name={bank.name} logo={bank.logo} />;
}

interface BankAccountManagerProps {
  onBankAccountsChange?: (accounts: BankAccountResponse[]) => void;
}

export default function BankAccountManager({ onBankAccountsChange }: BankAccountManagerProps) {
  const { t } = useTranslation(['wallet', 'settings', 'common']);
  const { role } = useApp();
  const isClient = role === UserRole.Client;

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBankResponse[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<BankFormState>(emptyBankForm);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Searchable Dropdown state
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  const onBankAccountsChangeRef = useRef(onBankAccountsChange);
  useEffect(() => {
    onBankAccountsChangeRef.current = onBankAccountsChange;
  }, [onBankAccountsChange]);

  // Click outside handler for custom bank dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBankDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // GSAP Popover Animation when opening dropdown
  useEffect(() => {
    if (bankDropdownOpen && popoverRef.current) {
      gsap.fromTo(
        popoverRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.5)', clearProps: 'all' }
      );
    }
  }, [bankDropdownOpen]);

  // GSAP Entrance Animations
  useGSAP(
    () => {
      if (containerRef.current && !loading) {
        gsap.fromTo(
          '.bam-card',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'power3.out', clearProps: 'all' }
        );

        gsap.fromTo(
          '.bam-account-item',
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.5)', clearProps: 'all' }
        );
      }
    },
    { scope: containerRef, dependencies: [loading, bankAccounts.length] }
  );

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

  const selectedBank = useMemo(
    () => supportedBanks.find(b => b.bin === bankForm.bankBin) || null,
    [supportedBanks, bankForm.bankBin]
  );

  const filteredSupportedBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return supportedBanks;
    const q = bankSearchQuery.toLowerCase().trim();
    return supportedBanks.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.shortName?.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }, [supportedBanks, bankSearchQuery]);

  const popularBanks = useMemo(() => {
    return supportedBanks.filter(b => POPULAR_BANK_CODES.includes(b.code.toUpperCase()));
  }, [supportedBanks]);

  const loadBankAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    const [bankRes, banksRes] = await Promise.all([
      walletGetAPI.getBankAccounts(),
      walletGetAPI.getSupportedBanks(),
    ]);

    if (bankRes.success && bankRes.data) {
      setBankAccounts(bankRes.data);
      onBankAccountsChangeRef.current?.(bankRes.data);
    }

    if (banksRes.success && banksRes.data && banksRes.data.length > 0) {
      setSupportedBanks(banksRes.data);
      setDirectoryUnavailable(false);
    } else {
      setSupportedBanks([]);
      setDirectoryUnavailable(true);
    }

    const loadFailures = [
      !bankRes.success ? getResponseMessage(bankRes.message, t('wallet.bankAccount.errorLoadAccounts', { defaultValue: 'Không thể tải tài khoản ngân hàng.' })) : '',
      !banksRes.success ? getResponseMessage(banksRes.message, t('wallet.bankAccount.errorLoadBanks', { defaultValue: 'Không thể tải danh sách ngân hàng.' })) : '',
    ].filter(Boolean);
    if (!bankRes.success && loadFailures.length > 0) {
      setError(loadFailures[0]);
    }

    setLoading(false);
  }, [t]);

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
    setBankDropdownOpen(false);
    setBankSearchQuery('');
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

    // GSAP Animate Form Focus
    gsap.fromTo(
      '.bam-form-card',
      { scale: 0.98 },
      { scale: 1, duration: 0.3, ease: 'back.out(2)', clearProps: 'all' }
    );
  };

  const handleSaveBankAccount = async () => {
    if (directoryUnavailable) {
      setError(t('wallet.bankAccount.directoryUnavailable', {
        defaultValue: 'Danh mục ngân hàng VietQR đang tạm thời không khả dụng. Vui lòng thử lại sau.',
      }));
      return;
    }

    const accountNumber = bankForm.accountNumber.trim();
    const selectedDirectoryBank = supportedBanks.find(bank => bank.bin === bankForm.bankBin);
    if (!selectedDirectoryBank) {
      setError(t('wallet.bankAccount.errorInvalidBank', { defaultValue: 'Vui lòng chọn ngân hàng hợp lệ.' }));
      return;
    }

    const basePayload = {
      bankBin: selectedDirectoryBank.bin,
      accountName: bankForm.accountName.trim(),
    };

    if (
      basePayload.accountName.length < 2 ||
      ((!editingBankId || editingBankRequiresAccountNumber) && !ACCOUNT_NUMBER_PATTERN.test(accountNumber))
    ) {
      setError(t('wallet.bankAccount.errorInvalidHolderNumber', { defaultValue: 'Vui lòng nhập tên chủ tài khoản và số tài khoản hợp lệ.' }));
      return;
    }

    if (editingBankId && accountNumber && !ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      setError(t('wallet.bankAccount.errorInvalidNewNumber', { defaultValue: 'Số tài khoản mới không hợp lệ.' }));
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
      setSuccess(
        editingBankId
          ? t('wallet.bankAccount.updatedSuccess', { defaultValue: 'Đã cập nhật tài khoản ngân hàng.' })
          : t('wallet.bankAccount.savedSuccess', { defaultValue: 'Đã lưu tài khoản ngân hàng.' })
      );
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, t('wallet.bankAccount.errorSaveAccount', { defaultValue: 'Không thể lưu tài khoản ngân hàng.' })));
    }

    setSavingBank(false);
  };

  const handleSetDefaultBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.updateBankAccount(bankAccountId, { isDefault: true });
    if (response.success && response.data) {
      setSuccess(t('wallet.bankAccount.defaultSuccess', { defaultValue: 'Đã đặt tài khoản mặc định.' }));
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, t('wallet.bankAccount.errorDefaultAccount', { defaultValue: 'Không thể đặt tài khoản mặc định.' })));
    }

    setSavingBank(false);
  };

  const handleDeleteBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.deleteBankAccount(bankAccountId);
    if (response.success) {
      setSuccess(t('wallet.bankAccount.deleteSuccess', { defaultValue: 'Đã xóa tài khoản ngân hàng.' }));
      if (editingBankId === bankAccountId) {
        clearBankForm();
      }
      await loadBankAccounts();
    } else {
      setError(getResponseMessage(response.message, t('wallet.bankAccount.deleteError', { defaultValue: 'Không thể xóa tài khoản đang dùng cho lệnh rút tiền.' })));
    }

    setSavingBank(false);
  };

  const handleCopyAccountNumber = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(t('common.copied', { defaultValue: 'Đã sao chép vào bộ nhớ tạm' }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Live Virtual Card formatted display
  const displayCardNumber = useMemo(() => {
    if (bankForm.accountNumber) {
      // Group digits in 4s
      return bankForm.accountNumber.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    if (editingBankAccount) {
      return editingBankAccount.accountNumberMasked;
    }
    return '•••• •••• •••• ••••';
  }, [bankForm.accountNumber, editingBankAccount]);

  const displayAccountName = useMemo(() => {
    return bankForm.accountName.trim() || t('wallet.bankAccount.accountNamePlaceholder', { defaultValue: 'TÊN CHỦ TÀI KHOẢN' });
  }, [bankForm.accountName, t]);

  return (
    <div ref={containerRef} className="bam-wrapper">
      {/* Form Card: Add or Edit Bank Account (Chỉ hiển thị cho Freelancer, Ẩn đối với Client) */}
      {!isClient && (
        <div className="bam-card bam-form-card">
          <div className="bam-header">
            <div className="bam-header-left">
              <div className="bam-header-icon">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="bam-header-title">
                  {editingBankId
                    ? t('wallet.bankAccount.editTitle', { defaultValue: 'Sửa tài khoản ngân hàng' })
                    : t('wallet.bankAccount.addTitle', { defaultValue: 'Thêm tài khoản ngân hàng' })}
                </h4>
                <p className="bam-header-subtitle">
                  {t('wallet.bankAccount.formSubtitle', { defaultValue: 'Liên kết ngân hàng chính chủ để rút tiền tự động 24/7' })}
                </p>
              </div>
            </div>
            {editingBankId && (
              <button
                type="button"
                onClick={clearBankForm}
                className="bam-action-btn"
                title="Hủy thao tác"
              >
                <X size={14} />
                <span>{t('wallet.bankAccount.cancelBtn', { defaultValue: 'Hủy sửa' })}</span>
              </button>
            )}
          </div>

          {error && (
            <div className="bam-alert bam-alert-danger">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bam-alert bam-alert-success">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {directoryUnavailable && (
            <div
              data-testid="bank-directory-unavailable"
              className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-start gap-2.5"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {t('wallet.bankAccount.directoryUnavailableExisting', {
                  defaultValue: 'Danh mục ngân hàng VietQR đang tạm thời không khả dụng. Bạn vẫn có thể rút tiền bằng tài khoản hợp lệ đã lưu.',
                })}
              </span>
            </div>
          )}

          {/* Form Container with 3D Holographic Card Live Preview & Input Fields */}
          <div className="bam-form-container">
            {/* Live Holographic Virtual Card Preview */}
            <div className="bam-virtual-card-wrapper">
              <div className="bam-virtual-card">
                {/* Top Row: Bank Info & Status Badge */}
                <div className="bam-vcard-top">
                  <div className="bam-vcard-bank">
                    {selectedBank ? (
                      <>
                        <BankLogo code={selectedBank.code} name={selectedBank.name} logo={selectedBank.logo} size="compact" />
                        <span className="bam-vcard-bank-name">{selectedBank.shortName || selectedBank.name}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <Building2 size={16} className="text-white" />
                        </div>
                        <span className="bam-vcard-bank-name">GigBridge Payout</span>
                      </div>
                    )}
                  </div>
                  <span className="bam-vcard-badge">NAPAS 247</span>
                </div>

                {/* EMV Chip & Contactless Wave */}
                <div className="bam-vcard-chip-row">
                  <div className="bam-vcard-chip" />
                  <Wifi size={18} className="bam-vcard-contactless" />
                </div>

                {/* Card Number */}
                <div className="bam-vcard-number">
                  {displayCardNumber}
                </div>

                {/* Bottom Row: Account Holder & Network */}
                <div className="bam-vcard-bottom">
                  <div className="bam-vcard-holder">
                    <div className="bam-vcard-holder-label">Chủ tài khoản (Cardholder)</div>
                    <div className="bam-vcard-holder-name">{displayAccountName}</div>
                  </div>
                  <div className="bam-vcard-vietqr">VietQR</div>
                </div>
              </div>
            </div>

            {/* Input Fields Column */}
            <div className="bam-form-fields">
              {/* Field 1: Custom Searchable Bank Selector */}
              <div className="bam-field-group" ref={dropdownRef}>
                <label className="bam-field-label">
                  <Building2 size={14} className="text-[var(--brand,#494be7)]" />
                  <span>{t('wallet.bankAccount.bankLabel', { defaultValue: 'Ngân hàng thụ hưởng' })}</span>
                </label>

                <div className="bam-custom-select-container">
                  {!selectedBank && <Landmark size={16} className="bam-input-icon" />}

                  <button
                    type="button"
                    onClick={() => !directoryUnavailable && setBankDropdownOpen(!bankDropdownOpen)}
                    disabled={directoryUnavailable}
                    className={`bam-custom-select-trigger ${selectedBank ? 'has-bank' : ''} ${bankDropdownOpen ? 'is-open' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="bam-trigger-content">
                      {selectedBank ? (
                        <div className="flex items-center gap-2.5 min-w-0 truncate">
                          <BankIdentityMark bank={selectedBank} />
                          <span className="truncate font-bold text-sm">
                            {selectedBank.name} ({selectedBank.code})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted,#95959f)]">
                          {t('wallet.bankAccount.selectBank', { defaultValue: 'Chọn ngân hàng' })}
                        </span>
                      )}
                    </div>

                    <ChevronDown size={16} className={`bam-trigger-arrow ${bankDropdownOpen ? 'is-open' : ''}`} />
                  </button>

                  {/* Popover Dropdown with GSAP Animation & Quick Popular Chips */}
                  {bankDropdownOpen && (
                    <div ref={popoverRef} className="bam-select-popover">
                      {/* Search Input Box */}
                      <div className="bam-search-box">
                        <Search size={15} className="bam-search-icon" />
                        <input
                          type="text"
                          value={bankSearchQuery}
                          onChange={e => setBankSearchQuery(e.target.value)}
                          placeholder={t('wallet.bankAccount.searchBankPlaceholder', { defaultValue: 'Tìm kiếm ngân hàng (Ví dụ: VCB, MB, Vietcombank)...' })}
                          className="bam-search-input"
                          autoFocus
                        />
                        {bankSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBankSearchQuery('')}
                            className="bam-search-clear"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Popular Quick Chips */}
                      {popularBanks.length > 0 && !bankSearchQuery && (
                        <div className="bam-popular-banks">
                          <span className="text-[10px] font-bold text-[var(--text-muted,#95959f)] self-center mr-1">Phổ biến:</span>
                          {popularBanks.map(pb => (
                            <button
                              key={pb.bin}
                              type="button"
                              onClick={() => {
                                handleBankFormChange('bankBin', pb.bin);
                                setBankDropdownOpen(false);
                              }}
                              className={`bam-popular-chip ${pb.bin === bankForm.bankBin ? 'is-active' : ''}`}
                            >
                              {pb.shortName || pb.code}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Scrollable Bank Options */}
                      <div className="bam-options-scroll">
                        {filteredSupportedBanks.length > 0 ? (
                          filteredSupportedBanks.map(bank => {
                            const isSelected = bank.bin === bankForm.bankBin;
                            return (
                              <button
                                key={bank.bin}
                                type="button"
                                onClick={() => {
                                  handleBankFormChange('bankBin', bank.bin);
                                  setBankDropdownOpen(false);
                                  setBankSearchQuery('');
                                }}
                                className={`bam-option-item ${isSelected ? 'is-selected' : ''}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 truncate">
                                  <BankIdentityMark bank={bank} />
                                  <span className="min-w-0 text-left">
                                    <span className="block truncate font-bold">{bank.name}</span>
                                    <span className="block truncate text-[11px] opacity-70">
                                      {bank.shortName} · {bank.code}
                                    </span>
                                  </span>
                                </div>

                                {isSelected && <Check size={16} className="text-[var(--brand,#494be7)] shrink-0" />}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-xs text-center text-[var(--text-muted,#95959f)] font-medium">
                            {t('wallet.bankAccount.noBanksFound', { defaultValue: 'Không tìm thấy ngân hàng phù hợp.' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 2 & 3 in 2-Col layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 2: Account Holder Name */}
                <div className="bam-field-group">
                  <label className="bam-field-label">
                    <User size={14} className="text-[var(--brand,#494be7)]" />
                    <span>{t('wallet.bankAccount.accountNameLabel', { defaultValue: 'Tên chủ tài khoản' })}</span>
                  </label>
                  <div className="bam-input-wrapper">
                    <input
                      value={bankForm.accountName}
                      onChange={event => handleBankFormChange('accountName', event.target.value.toUpperCase())}
                      placeholder={t('wallet.bankAccount.accountNamePlaceholder', { defaultValue: 'Ví dụ: NGUYEN VAN A' })}
                      className="bam-input uppercase"
                    />
                  </div>
                </div>

                {/* Field 3: Account Number */}
                <div className="bam-field-group">
                  <label className="bam-field-label">
                    <Hash size={14} className="text-[var(--brand,#494be7)]" />
                    <span>{t('wallet.bankAccount.accountNumberLabel', { defaultValue: 'Số tài khoản ngân hàng' })}</span>
                  </label>
                  <div className="bam-input-wrapper">
                    <input
                      value={bankForm.accountNumber}
                      onChange={event => handleBankFormChange('accountNumber', event.target.value)}
                      placeholder={
                        editingBankRequiresAccountNumber
                          ? t('wallet.bankAccount.accountNumberReentryPlaceholder', { defaultValue: 'Nhập lại số tài khoản' })
                          : editingBankId
                          ? t('wallet.bankAccount.accountNumberNewPlaceholder', { defaultValue: 'Số tài khoản mới (tùy chọn)' })
                          : t('wallet.bankAccount.accountNumberPlaceholder', { defaultValue: 'Nhập số tài khoản' })
                      }
                      className="bam-input font-mono"
                    />
                  </div>
                </div>
              </div>

              {bankAccounts.length > activeBankCount && (
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  {t('wallet.bankAccount.reselectNotice', { defaultValue: 'Một số tài khoản cũ cần chọn lại ngân hàng trước khi sử dụng.' })}
                </p>
              )}

              {/* Action Buttons */}
              <div className="bam-actions-row">
                <button
                  type="button"
                  onClick={() => void handleSaveBankAccount()}
                  disabled={savingBank || directoryUnavailable}
                  className="bam-btn-primary"
                >
                  {savingBank ? <Loader2 size={16} className="animate-spin" /> : editingBankId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                  <span>
                    {editingBankId
                      ? t('wallet.bankAccount.updateBtn', { defaultValue: 'Cập nhật tài khoản' })
                      : t('wallet.bankAccount.saveBtn', { defaultValue: 'Lưu tài khoản' })}
                  </span>
                </button>

                {editingBankId && (
                  <button
                    type="button"
                    onClick={clearBankForm}
                    disabled={savingBank}
                    className="bam-btn-secondary"
                  >
                    <X size={16} />
                    <span>{t('wallet.bankAccount.cancelBtn', { defaultValue: 'Hủy sửa' })}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Accounts List Card (Dành cho Freelancer quản lý rút tiền, hoặc Client xem nếu có) */}
      {(!isClient || bankAccounts.length > 0) ? (
        <div className="bam-card">
          <div className="bam-header">
            <div className="bam-header-left">
              <div className="bam-header-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="bam-header-title">
                  {t('wallet.bankAccount.savedAccountsTitle', { defaultValue: 'Tài khoản đã lưu' })}
                </h4>
                <p className="bam-header-subtitle">
                  {t('wallet.bankAccount.savedSubtitle', { count: bankAccounts.length, defaultValue: `Đã liên kết ${bankAccounts.length} tài khoản ngân hàng` })}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-secondary">
              <Loader2 size={18} className="animate-spin text-[var(--brand,#494be7)]" />
              <span>{t('wallet.bankAccount.loadingAccounts', { defaultValue: 'Đang tải tài khoản...' })}</span>
            </div>
          ) : bankAccounts.length > 0 ? (
            <div className="bam-accounts-grid">
              {bankAccounts.map(account => {
                const isActive = account.status === BankAccountStatus.Active && Boolean(account.bankBin);
                const directoryBank = supportedBanks.find(bank => bank.bin === account.bankBin);
                return (
                  <div
                    key={account.bankAccountId}
                    className={`bam-account-item ${account.isDefault ? 'is-default' : ''} ${!isActive ? 'requires-update' : ''}`}
                  >
                    <div className="bam-account-top">
                      <div className="bam-bank-info">
                        <BankLogo
                          code={directoryBank?.code ?? account.bankCode}
                          name={directoryBank?.name ?? account.bankName}
                          logo={directoryBank?.logo}
                          size="card"
                        />
                        <div className="min-w-0">
                          <h5 className="bam-bank-name">{account.bankName}</h5>
                          <p className="bam-account-name">{account.accountName}</p>
                        </div>
                      </div>

                      {account.isDefault && (
                        <span className="bam-badge bam-badge-default">
                          <Star size={10} className="fill-current" />
                          <span>{t('wallet.bankAccount.defaultBadge', { defaultValue: 'Mặc định' })}</span>
                        </span>
                      )}

                      {!isActive && (
                        <span className="bam-badge bam-badge-warning">
                          <span>{t('wallet.bankAccount.needsUpdateBadge', { defaultValue: 'Cần cập nhật' })}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="bam-account-number-box">
                        <span className="bam-account-number">
                          {account.accountNumberMasked}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccountNumber(account.accountNumberMasked, account.bankAccountId)}
                          className="bam-copy-btn"
                          title="Sao chép"
                        >
                          {copiedId === account.bankAccountId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>

                      {!isActive && (
                        <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                          {t('wallet.bankAccount.reselectAccountNotice', { defaultValue: 'Cần chọn lại ngân hàng và nhập lại số tài khoản.' })}
                        </p>
                      )}
                    </div>

                    {!isClient && (
                      <div className="bam-account-actions">
                        {isActive && !account.isDefault && (
                          <button
                            type="button"
                            onClick={() => void handleSetDefaultBank(account.bankAccountId)}
                            disabled={savingBank}
                            className="bam-action-btn"
                          >
                            <Star size={12} />
                            <span>{t('wallet.bankAccount.setDefault', { defaultValue: 'Đặt mặc định' })}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEditBank(account)}
                          disabled={savingBank || directoryUnavailable}
                          className="bam-action-btn"
                        >
                          <Edit2 size={12} />
                          <span>{t('wallet.bankAccount.edit', { defaultValue: 'Sửa' })}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteBank(account.bankAccountId)}
                          disabled={savingBank}
                          className="bam-action-btn bam-action-btn-danger"
                        >
                          <Trash2 size={12} />
                          <span>{t('wallet.bankAccount.remove', { defaultValue: 'Xóa' })}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm font-semibold text-secondary bg-surface-muted rounded-xl border border-border">
              <p>{t('wallet.bankAccount.noAccounts', { defaultValue: 'Chưa có tài khoản ngân hàng nào được kết nối.' })}</p>
            </div>
          )}
        </div>
      ) : (
        /* Thẻ hướng dẫn phương thức nạp tiền dành riêng cho Client */
        <div className="bam-card bg-gradient-to-br from-[var(--surface,#ffffff)] to-[var(--surface-muted,#f8f9fa)] border border-[var(--border,#ededf0)]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Info size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-primary">
                {t('wallet.clientDepositNoticeTitle', { defaultValue: 'Hình thức nạp tiền cho Khách hàng' })}
              </h4>
              <p className="text-xs text-secondary leading-relaxed">
                {t('wallet.clientDepositNoticeDesc', {
                  defaultValue: 'Với vai trò Khách hàng (Client), bạn thực hiện nạp tiền trực tiếp vào Ví qua cổng PayOS (Quét mã QR / Chuyển khoản ngân hàng 24/7). Bạn không cần thêm tài khoản ngân hàng nhận rút tiền.',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
