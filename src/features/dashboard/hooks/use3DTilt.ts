import { useState } from 'react';

/**
 * A custom hook to calculate mouse coordinates and rotation angles for interactive
 * 3D cards with sheen/glare effects using CSS custom properties.
 * 
 * @param maxRotation The maximum degrees of rotation allowed (default: 10)
 */
export function use3DTilt(maxRotation = 10) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    // Mouse coordinates relative to the element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized relative position from center (-0.5 to 0.5)
    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;

    // Rotation angles: Y position rotates around X axis, X position rotates around Y axis
    const rx = -py * maxRotation;
    const ry = px * maxRotation;

    // Mouse position percentage for radial gradient light source/sheen
    const mx = `${(x / rect.width) * 100}%`;
    const my = `${(y / rect.height) * 100}%`;

    setStyle({
      '--rx': `${rx}deg`,
      '--ry': `${ry}deg`,
      '--mx': mx,
      '--my': my,
    } as React.CSSProperties);
  };

  const onMouseLeave = () => {
    setStyle({
      '--rx': '0deg',
      '--ry': '0deg',
      '--mx': '50%',
      '--my': '50%',
    } as React.CSSProperties);
  };

  return { onMouseMove, onMouseLeave, style };
}
