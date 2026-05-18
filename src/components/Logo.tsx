interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * US Zakat Calculator logo — "US Zakat" bold on top, "Calculator" smaller below.
 */
export default function Logo({ size = 'medium', color = 'currentColor' }: LogoProps) {
  const dims = {
    small: { width: 90, height: 34, mainSize: 15, subSize: 9, mainY: 14, subY: 28 },
    medium: { width: 120, height: 44, mainSize: 20, subSize: 12, mainY: 18, subY: 36 },
    large: { width: 220, height: 76, mainSize: 36, subSize: 20, mainY: 32, subY: 62 },
  }[size];

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="US Zakat Calculator"
    >
      <text
        x="0"
        y={dims.mainY}
        fill={color}
        fontFamily="'Inter', 'Roboto', sans-serif"
        fontWeight="800"
        fontSize={dims.mainSize}
      >
        US Zakat
      </text>
      <text
        x="0"
        y={dims.subY}
        fill={color}
        fontFamily="'Inter', 'Roboto', sans-serif"
        fontWeight="300"
        fontSize={dims.subSize}
        opacity="0.7"
        letterSpacing="0.5"
      >
        Calculator
      </text>
    </svg>
  );
}
