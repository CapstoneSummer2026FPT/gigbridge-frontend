import { FileWarning, Flag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import '../../../shared/components/styles/contract-area-tabs.css';

export function ReportAreaTabs(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      label: 'General Reports',
      path: '/admin/reports',
      icon: <Flag size={16} />,
    },
    {
      label: 'Contract Reports',
      path: '/admin/reports/contracts',
      icon: <FileWarning size={16} />,
    },
  ];

  const handleNavigate = (path: string): void => {
    navigate(path);
  };

  return (
    <div className="contract-area-tabs" role="tablist" aria-label="Reports area">
      {tabs.map((tab) => {
        // Match exact or parent path for active state
        const isActive = location.pathname === tab.path || (tab.path === '/admin/reports' && location.pathname.startsWith('/admin/reports/accounts'));

        return (
          <button
            key={tab.path}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleNavigate(tab.path)}
            className={`contract-area-tab ${isActive ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
