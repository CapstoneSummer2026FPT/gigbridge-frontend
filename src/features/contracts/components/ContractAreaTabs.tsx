import { FileCheck, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

interface ContractAreaTab {
  label: string;
  path: string;
  icon: JSX.Element;
}

const CONTRACT_AREA_TABS: ContractAreaTab[] = [
  {
    label: 'Contracts',
    path: '/contracts',
    icon: <FileText size={16} />,
  },
  {
    label: 'E-sign Contracts',
    path: '/contracts/esign',
    icon: <FileCheck size={16} />,
  },
];

export function ContractAreaTabs(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string): void => {
    navigate(path);
  };

  return (
    <div className="contract-area-tabs" role="tablist" aria-label="Contract area">
      {CONTRACT_AREA_TABS.map((tab) => {
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
