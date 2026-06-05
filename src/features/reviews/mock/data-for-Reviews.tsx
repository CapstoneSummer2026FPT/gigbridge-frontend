export type ReviewViewModel = {
  id: string;
  contractId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  createdAt: string;
};

export const MOCK_REVIEWS: ReviewViewModel[] = [
  {
    id: 'rev_1',
    contractId: 'contract_1',
    reviewerId: 'u_client_1',
    reviewerName: 'Acme Studio',
    revieweeId: 'u_freelancer_1',
    rating: 5,
    comment: 'Excellent delivery quality and fast communication.',
    isAnonymous: false,
    createdAt: '2026-05-29T10:00:00Z',
  },
  {
    id: 'rev_2',
    contractId: 'contract_2',
    reviewerId: 'u_client_2',
    reviewerName: 'Beta Labs',
    revieweeId: 'u_freelancer_1',
    rating: 4,
    comment: 'Strong technical skills and reliable milestone updates.',
    isAnonymous: true,
    createdAt: '2026-05-20T09:30:00Z',
  },
  {
    id: 'rev_3',
    contractId: 'contract_3',
    reviewerId: 'u_freelancer_1',
    reviewerName: 'John Doe',
    revieweeId: 'u_client_1',
    rating: 5,
    comment: 'Clear requirements and prompt payment approval.',
    isAnonymous: false,
    createdAt: '2026-05-18T14:15:00Z',
  },
];

export const getStoredReviews = () => {
  const stored = window.localStorage.getItem('gb_reviews');
  return stored ? JSON.parse(stored) as ReviewViewModel[] : MOCK_REVIEWS;
};

export const saveStoredReviews = (reviews: ReviewViewModel[]) => {
  window.localStorage.setItem('gb_reviews', JSON.stringify(reviews));
};
