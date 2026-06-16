import React from 'react';
import { CheckCircle, DollarSign, Star, Users } from 'lucide-react';

export const getCompanySizeLabel = (size?: string | number) => {
  if (size === 0 || size === '0' || size === 'Small' || size === 'small') return 'Small Team (10-50)';
  if (size === 1 || size === '1' || size === 'Medium' || size === 'medium') return 'Medium Enterprise (50-250)';
  if (size === 2 || size === '2' || size === 'Large' || size === 'large') return 'Large Corporation (250+)';
  return String(size || 'Small Team (10-50)');
};

export const CLIENT_TRUST_BADGES = [
  { label: 'Identity Verified', styleClass: 'badge-icon-green', icon: <CheckCircle size={16} /> },
  { label: 'Payment Verified', styleClass: 'badge-icon-blue', icon: <DollarSign size={16} /> },
  { label: 'Top Client', styleClass: 'badge-icon-amber', icon: <Star size={16} /> },
  { label: 'Repeat Hirer', styleClass: 'badge-icon-purple', icon: <Users size={16} /> },
];

export const FREELANCER_TRUST_BADGES = [
  { label: 'Identity Verified', styleClass: 'badge-icon-green', icon: <CheckCircle size={16} /> },
  { label: 'Payment Verified', styleClass: 'badge-icon-blue', icon: <DollarSign size={16} /> },
  { label: 'Top Rated', styleClass: 'badge-icon-amber', icon: <Star size={16} /> },
  { label: 'Expert Vetted', styleClass: 'badge-icon-purple', icon: <Users size={16} /> },
];
