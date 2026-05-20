interface LogoIconProps {
  size?: number;
}

export default function LogoIcon({ size = 48 }: LogoIconProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-icon.svg`}
      alt="US Zakat Calculator"
      width={size}
      height={size}
    />
  );
}
