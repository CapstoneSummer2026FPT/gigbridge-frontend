import { FileCheck, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import '../../../shared/components/styles/contract-area-tabs.css';

export function ContractAreaTabs(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith('/admin');

  const tabs = [
    {
      label: 'Contracts',
      path: isAdmin ? '/admin/contracts' : '/contracts',
      icon: <FileText size={16} />,
    },
    {
      label: 'E-sign Contracts',
      path: isAdmin ? '/admin/contracts/esign' : '/contracts/esign',
      icon: <FileCheck size={16} />,
    },
  ];

  const handleNavigate = (path: string): void => {
    navigate(path);
  };

  return (
    <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm" role="tablist" aria-label="Contract area">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;

        return (
          <button
            key={tab.path}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleNavigate(tab.path)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              isActive
                ? 'bg-[var(--brand,#494be7)] border-[var(--brand,#494be7)] text-white shadow-md shadow-[var(--brand,#494be7)]/25'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
