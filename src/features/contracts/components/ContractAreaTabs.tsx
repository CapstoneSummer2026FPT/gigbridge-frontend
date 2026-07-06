import { FileCheck, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

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
    <div className="contract-area-tabs" role="tablist" aria-label="Contract area">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;

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
