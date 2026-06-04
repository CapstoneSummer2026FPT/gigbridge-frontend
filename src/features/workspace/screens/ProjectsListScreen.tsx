import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import { Flag, Calendar, DollarSign, Clock, User } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { MOCK_PROJECTS_FOR_PROJECTS_LIST } from '../mock/data-for-ProjectsListScreen';

export default function ProjectsListScreen() {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const { t } = useTranslation();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const dbProjects = role === 0
    ? DB.getProjectsByClient(user.id)
    : DB.getProjectsByFreelancer(user.id);
  const projects = dbProjects.length > 0
    ? dbProjects
    : MOCK_PROJECTS_FOR_PROJECTS_LIST.filter(project => role === 0
      ? project.clientId === user.id || project.clientId === 'demo_client_001'
      : project.freelancerId === user.id || project.freelancerId === 'demo_freelancer_001'
    );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'badge-green';
      case 'completed': return 'badge-cyan';
      case 'pending': return 'badge-amber';
      default: return 'badge-purple';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flag className="w-8 h-8 text-cyan" />
            <h1 className="text-3xl font-black text-primary">{t('projects.myProjects')}</h1>
          </div>
          <p className="text-secondary">
            {role === 0 ? 'Manage your client projects' : 'View your active freelance projects'}
          </p>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Flag className="w-16 h-16 text-secondary mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-bold text-primary mb-2">{t('projects.noProjectsYet')}</h2>
            <p className="text-secondary mb-6">
              {role === 0
                ? t('projects.startFirstProject')
                : 'Browse jobs and submit proposals to get started'}
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
              const otherUser = role === 0
                ? DB.getUserById(project.freelancerId)
                : DB.getUserById(project.clientId);

              return (
                <div
                  key={project.id}
                  className="glass-card p-6 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate(`/workspace/${project.id}`)}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`${getStatusBadge(project.status)} text-xs px-3 py-1`}>
                      {t(`projects.${project.status}`)}
                    </span>
                    <Flag className={`w-5 h-5 ${getStatusColor(project.status)}`} />
                  </div>

                  {/* Project Title */}
                  <h3 className="text-lg font-bold text-primary mb-2 line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Other User */}
                  {otherUser && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-secondary">
                      <User className="w-4 h-4" />
                      <span className="line-clamp-1">
                        {role === 0 ? t('projects.freelancer') : t('projects.client')}: {otherUser.full_name}
                      </span>
                    </div>
                  )}

                  {/* Project Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-primary font-semibold">${project.totalBudget}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Calendar className="w-4 h-4 text-cyan" />
                      <span>{t('projects.started')}: {new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {project.progress !== undefined && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-secondary">{t('projects.progress')}</span>
                        <span className="text-primary font-semibold">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan to-purple transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* View Button */}
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
