export const getCompanySizeLabel = (size?: string | number) => {
  if (size === 0 || size === '0' || size === 'Solo' || size === 'solo') return 'Solo';
  if (size === 1 || size === '1' || size === 'Small' || size === 'small') return 'Small';
  if (size === 2 || size === '2' || size === 'Medium' || size === 'medium') return 'Medium';
  if (size === 3 || size === '3' || size === 'Large' || size === 'large') return 'Large';
  return 'Not provided';
};
