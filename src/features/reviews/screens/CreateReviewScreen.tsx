import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { ContractDto } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { ProjectReviewForm } from '../components/ProjectReviewForm';
import '../styles/reviews-screen.css';

export default function CreateReviewScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { role } = useApp();
  const { t } = useTranslation();
  const contractId = params.get('contractId') ?? params.get('contract') ?? '';
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadContract = async () => {
      if (!contractId) {
        setError(t('reviews.contractRequired'));
        setLoading(false);
        return;
      }

      const response = await contractGetAPI.getContractById(contractId);
      if (cancelled) return;
      if (!response.success || !response.data) {
        setError(response.message || t('reviews.loadError'));
      } else {
        setContract(response.data);
      }
      setLoading(false);
    };

    void loadContract();
    return () => { cancelled = true; };
  }, [contractId, t]);

  const validRole = role === UserRole.Client || role === UserRole.Freelancer ? role : null;
  const alreadyReviewed = submitted || contract?.hasReviewedByCurrentUser;

  return (
    <AppLayout>
      <div className="review-create-page">
        <div className="review-create-card">
          <h1>{t('reviews.title')}</h1>
          <p>{t('reviews.subtitle')}</p>

          {loading && <p>{t('reviews.loading')}</p>}
          {!loading && error && <p className="review-error" role="alert">{error}</p>}
          {!loading && !error && alreadyReviewed && (
            <div className="review-complete-state">
              <CheckCircle2 size={44} />
              <h2>{t('reviews.alreadyReviewed')}</h2>
              <p>{t('reviews.alreadyReviewedDesc')}</p>
              <button type="button" className="review-submit" onClick={() => navigate(`/workspace/${contractId}`)}>
                {t('reviews.backToProject')}
              </button>
            </div>
          )}
          {!loading && !error && contract && validRole && !alreadyReviewed && contract.canReview && (
            <ProjectReviewForm
              contract={contract}
              role={validRole}
              onSubmitted={() => setSubmitted(true)}
              onCancel={() => navigate(-1)}
            />
          )}
          {!loading && !error && contract && !alreadyReviewed && !contract.canReview && (
            <p className="review-error" role="alert">{t('reviews.notAvailable')}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
