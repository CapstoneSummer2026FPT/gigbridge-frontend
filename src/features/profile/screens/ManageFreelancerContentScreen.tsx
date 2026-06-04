import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Briefcase, FileText, Award, Download } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import ManageWorkExperienceContent from '../components/ManageWorkExperienceContent';
import ManagePortfolioContent from '../components/ManagePortfolioContent';
import ManageCertificatesContent from '../components/ManageCertificatesContent';
import ManageCVContent from '../components/ManageCVContent';
import '../styles/manage-freelancer-content-screen.css';

type TabType = 'experience' | 'portfolio' | 'certificates' | 'cv';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

export default function ManageFreelancerContentScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  
  // Get tab from URL query parameter, default to 'experience'
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam && ['experience', 'portfolio', 'certificates', 'cv'].includes(tabParam)) 
      ? tabParam 
      : 'experience'
  );

  // Update active tab when URL query parameter changes
  useEffect(() => {
    if (tabParam && ['experience', 'portfolio', 'certificates', 'cv'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  const tabs: Tab[] = [
    { id: 'experience', label: 'Work Experience', icon: <Briefcase size={18} /> },
    { id: 'portfolio', label: 'Portfolio', icon: <FileText size={18} /> },
    { id: 'certificates', label: 'Certificates', icon: <Award size={18} /> },
    { id: 'cv', label: 'CV/Resume', icon: <Download size={18} /> },
  ];

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    // Update URL with tab parameter
    navigate(`?tab=${tabId}`, { replace: true });
  };

  const handleCancel = () => {
    navigate(`/profile/freelancer/${user?.id}`);
  };

  return (
    <AppLayout>
      <div className="manage-freelancer-content-wrapper">
        {/* Header */}
        <div className="manage-freelancer-content-header">
          <button
            onClick={handleCancel}
            className="manage-freelancer-content-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="manage-freelancer-content-title">Manage Professional Content</h1>
        </div>

        {/* Tab Navigation */}
        <div className="manage-freelancer-content-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`manage-freelancer-content-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="manage-freelancer-content-container">
          {activeTab === 'experience' && <ManageWorkExperienceContent />}
          {activeTab === 'portfolio' && <ManagePortfolioContent />}
          {activeTab === 'certificates' && <ManageCertificatesContent />}
          {activeTab === 'cv' && <ManageCVContent />}
        </div>
      </div>
    </AppLayout>
  );
}
