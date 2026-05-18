interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * US Zakat Calculator logo with "Calculator" in smaller text.
 * Renders as inline SVG for crisp scaling.
 */
export default function Logo({ size = 'medium', color = 'currentColor' }: LogoProps) {
  const dims = {
    small: { width: 140, height: 32, mainSize: 16, subSize: 10 },
    medium: { width: 180, height: 40, mainSize: 20, subSize: 12 },
    large: { width: 320, height: 64, mainSize: 36, subSize: 20 },
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
        y={dims.height * 0.55}
        fill={color}
        fontFamily="'Inter', 'Roboto', sans-serif"
        fontWeight="800"
        fontSize={dims.mainSize}
      >
        US Zakat
      </text>
      <text
        x={size === 'large' ? 195 : size === 'medium' ? 112 : 97}
        y={dims.height * 0.55}
        fill={color}
        fontFamily="'Inter', 'Roboto', sans-serif"
        fontWeight="300"
        fontSize={dims.subSize}
        opacity="0.75"
      >
        Calculator
      </text>
    </svg>
  );
}
