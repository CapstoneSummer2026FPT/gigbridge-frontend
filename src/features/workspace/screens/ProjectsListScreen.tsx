import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { Flag, Calendar, Clock, User } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import GCoinIcon from '../../../shared/components/GCoinIcon';

const getStatusLabel = (status: ContractStatus, t: any): string => {
  switch (status) {
    case ContractStatus.Active:
      return t('projects.statusActive') || 'active';
    case ContractStatus.Completed:
      return t('projects.statusCompleted') || 'completed';
    case ContractStatus.PendingEscrow:
    case ContractStatus.PendingSignature:
      return t('projects.statusPending') || 'pending';
    default:
      return t('projects.statusInProgress') || 'in progress';
  }
};

export default function ProjectsListScreen() {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ContractDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    let current = true;
    const loadProjects = async (): Promise<void> => {
      try {
        setLoading(true);
        setError('');
        const response = await contractGetAPI.getMyContracts({ status: ContractStatus.Active });
        if (!current) return;

        if (response.success && response.data) {
          setProjects(response.data);
        } else {
          setError(response.message || t('projects.unableToLoad'));
          setProjects([]);
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err);
        if (current) {
          setError(t('projects.unableToLoad'));
          setProjects([]);
        }
      } finally {
        if (current) setLoading(false);
      }
    };

    void loadProjects();
    return () => {
      current = false;
    };
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.Active: return 'text-green-400';
      case ContractStatus.Completed: return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.Active: return 'badge-green';
      case ContractStatus.Completed: return 'badge-cyan';
      default: return 'badge-amber';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flag className="w-8 h-8 text-cyan" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('currentLanguage') === 'vi' ? (
                <>
                  <span className="text-blue-600 black:text-blue-400 italic font-light">Dự án</span> của tôi
                </>
              ) : (
                <>
                  My <span className="text-blue-600 black:text-blue-400 italic font-light">Projects</span>
                </>
              )}
            </h1>
          </div>
          <p className="text-secondary">
            {role === 0 ? t('projects.subtitleClient') : t('projects.subtitleFreelancer')}
          </p>
        </div>

        {loading ? (
          <div className="glass-card p-12 text-center">
            <Clock className="w-12 h-12 text-secondary mx-auto mb-4 opacity-40 animate-pulse" />
            <p className="text-secondary">{t('projects.loadingWorkspaces')}</p>
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <Flag className="w-16 h-16 text-secondary mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-bold text-primary mb-2">{t('projects.unableToLoad')}</h2>
            <p className="text-secondary mb-6">{error}</p>
            <button className="btn-cyan px-6 py-3" onClick={() => window.location.reload()}>
              {t('projects.retry')}
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Flag className="w-16 h-16 text-secondary mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-bold text-primary mb-2">{t('projects.noProjectsYet')}</h2>
            <p className="text-secondary mb-6">
              {role === 0
                ? t('projects.startFirstProject')
                : t('projects.browseJobsProposals')}
            </p>
            <button
              className="btn-cyan px-6 py-3"
              onClick={() => navigate(role === 0 ? '/jobs/post' : '/jobs/browse')}
            >
              {role === 0 ? t('jobs.postJob') : t('jobs.browseJobs')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const otherUserName = role === 0
                ? project.freelancerName || project.freelancerEmail || t('projects.freelancer')
                : project.clientName || project.clientEmail || t('projects.client');
              const statusLabel = getStatusLabel(project.status, t);

              return (
                <div
                  key={project.contractsId}
                  className="glass-card p-6 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate(`/workspace/${project.contractsId}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`${getStatusBadge(project.status)} text-xs px-3 py-1`}>
                      {statusLabel}
                    </span>
                    <Flag className={`w-5 h-5 ${getStatusColor(project.status)}`} />
                  </div>

                  <h3 className="text-lg font-bold text-primary mb-2 line-clamp-2">
                    {project.jobTitle || project.title}
                  </h3>

                  <div className="flex items-center gap-2 mb-4 text-sm text-secondary">
                    <User className="w-4 h-4" />
                    <span className="line-clamp-1">
                      {role === 0 ? t('projects.freelancer') : t('projects.client')}: {otherUserName}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <span className="text-primary font-semibold"><GigCoinAmount amount={project.totalBudget} /></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Calendar className="w-4 h-4 text-cyan" />
                      <span>{t('projects.started')}: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                  </div>

                  <button className="btn-ghost-cyan w-full py-2 text-sm mt-2">
                    {t('projects.openWorkspace')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
