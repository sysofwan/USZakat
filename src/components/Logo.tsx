interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * US Zakat Calculator logo — "US Zakat" bold on top, "Calculator" stretched to match width below.
 */
export default function Logo({ size = 'medium', color = 'currentColor' }: LogoProps) {
  const dims = {
    small: { width: 88, height: 32, mainSize: 18, subSize: 12, mainY: 16, subY: 29 },
    medium: { width: 115, height: 40, mainSize: 24, subSize: 15, mainY: 21, subY: 37 },
    large: { width: 210, height: 68, mainSize: 42, subSize: 26, mainY: 36, subY: 62 },
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
        textLength={dims.width}
        lengthAdjust="spacing"
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
        textLength={dims.width}
        lengthAdjust="spacing"
      >
        Calculator
      </text>
    </svg>
  );
}
