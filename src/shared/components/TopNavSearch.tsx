import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  Search,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  TOP_NAV_SEARCH_SCOPE,
  type TopNavSearchScope,
} from '../utils/topNavSearch';

interface TopNavSearchProps {
  value: string;
  scope: TopNavSearchScope;
  isScopeSelectorEnabled: boolean;
  isScopeMenuOpen: boolean;
  onValueChange: (value: string) => void;
  onScopeChange: (scope: TopNavSearchScope) => void;
  onScopeMenuOpenChange: (isOpen: boolean) => void;
  onSubmit: () => void;
}

interface SearchScopeOption {
  value: TopNavSearchScope;
  label: string;
  description: string;
  icon: typeof UsersRound;
}

export function TopNavSearch({
  value,
  scope,
  isScopeSelectorEnabled,
  isScopeMenuOpen,
  onValueChange,
  onScopeChange,
  onScopeMenuOpenChange,
  onSubmit,
}: TopNavSearchProps) {
  const { t } = useTranslation();
  const options: readonly SearchScopeOption[] = [
    {
      value: TOP_NAV_SEARCH_SCOPE.Talent,
      label: t('topNavSearch.talent'),
      description: t('topNavSearch.talentDescription'),
      icon: UsersRound,
    },
    {
      value: TOP_NAV_SEARCH_SCOPE.Jobs,
      label: t('topNavSearch.jobs'),
      description: t('topNavSearch.jobsDescription'),
      icon: BriefcaseBusiness,
    },
  ];
  const selectedOption = options.find(option => option.value === scope) ?? options[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onValueChange(event.target.value);
  };

  const handleBlur = (event: FocusEvent<HTMLFormElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      onScopeMenuOpenChange(false);
    }
  };

  return (
    <form
      className="relative hidden min-w-0 max-w-xl flex-1 md:flex"
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      role="search"
    >
      <div className="flex w-full min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            size={16}
            className="nav-search-icon absolute top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={value}
            onChange={handleValueChange}
            placeholder={t('topNavSearch.placeholder')}
            aria-label={t('topNavSearch.inputLabel')}
            className={`input-gb nav-search-input w-full py-2 text-sm ${
              isScopeSelectorEnabled ? 'top-nav-search-input-with-scope' : ''
            }`}
          />
        </div>

        {isScopeSelectorEnabled ? (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              className="top-nav-search-scope-button flex h-full min-w-[7.75rem] items-center justify-between gap-2 px-4 text-sm font-semibold text-primary"
              aria-haspopup="menu"
              aria-expanded={isScopeMenuOpen}
              onClick={() => onScopeMenuOpenChange(!isScopeMenuOpen)}
            >
              <span>{selectedOption.label}</span>
              <ChevronDown
                aria-hidden="true"
                size={16}
                className={`transition-transform ${isScopeMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isScopeMenuOpen ? (
              <div
                className="dropdown-menu absolute right-0 top-[calc(100%+0.75rem)] z-[110] w-80 rounded-2xl p-2"
                role="menu"
                aria-label={t('topNavSearch.scopeMenuLabel')}
              >
                {options.map(option => {
                  const Icon = option.icon;
                  const isSelected = option.value === scope;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => onScopeChange(option.value)}
                    >
                      <Icon aria-hidden="true" size={20} className="mt-0.5 flex-shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
