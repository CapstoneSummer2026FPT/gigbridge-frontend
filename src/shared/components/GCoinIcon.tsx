import { FC } from 'react';

interface GCoinIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const GCoinIcon: FC<GCoinIconProps> = ({ size = 16, className = '', style }) => {
  return (
    <img
      src="/icons/G-coin.png"
      alt="G-coin"
      className={`inline-block select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export default GCoinIcon;
