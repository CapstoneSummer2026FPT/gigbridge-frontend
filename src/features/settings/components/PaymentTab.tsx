import BankAccountManager from '../../wallet/components/BankAccountManager';
import { useTranslation } from '../../../hooks/useTranslation';

export function PaymentTab() {
  const { t } = useTranslation();

  return (
    <section className="glass-card p-6">
      <h2 className="mb-5 font-semibold text-primary">{t('settings.paymentMethods')}</h2>
      <BankAccountManager />
    </section>
  );
}
