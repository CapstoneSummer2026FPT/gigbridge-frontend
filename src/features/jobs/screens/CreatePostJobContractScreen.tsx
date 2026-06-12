import { useNavigate } from 'react-router';
import { ArrowLeft, FileCheck, ListChecks } from 'lucide-react';

import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobScreen.css';

export default function CreatePostJobContractScreen() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          type="button"
          onClick={() => navigate('/jobs/post/questions')}
          className="btn-ghost-cyan px-4 py-2 flex items-center gap-2 mb-6"
        >
          <ArrowLeft size={16} />
          Back to JobPost Flow
        </button>

        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-cyan/20 flex items-center justify-center mx-auto mb-4">
            <FileCheck size={28} className="text-cyan" />
          </div>
          <h1 className="text-2xl font-black text-primary mb-3">
            Contract setup moved to the contract workflow
          </h1>
          <p className="text-sm text-secondary mb-6 leading-relaxed">
            JobPosts are now created through the question-first flow, then contracts are managed through the backend contract workflow after proposal acceptance.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/jobs/post/questions')}
              className="btn-cyan px-5 py-3 flex items-center justify-center gap-2"
            >
              <ListChecks size={16} />
              Create JobPost
            </button>
            <button
              type="button"
              onClick={() => navigate('/jobs/my-jobs')}
              className="btn-ghost-cyan px-5 py-3"
            >
              View My Jobs
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
