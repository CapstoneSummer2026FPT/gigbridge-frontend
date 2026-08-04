import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';
import { useTranslation } from '../../../hooks/useTranslation';

export function PreferencesTab() {
  const { t } = useTranslation();

  return (
    <section className="glass-card space-y-6 p-6">
      <h2 className="font-semibold text-primary">{t('settings.languageTheme')}</h2>
      <div className="space-y-4 max-w-xl">
        <div className="settings-form-group">
          <label className="settings-form-label">{t('settings.selectLanguage')}</label>
          <div className="mt-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </section>
  );
}
