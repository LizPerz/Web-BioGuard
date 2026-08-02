import logoUrl from '../../assets/logo.png';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 34, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src={logoUrl}
        alt="BioGuard"
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: 'contain',
        }}
      />
      {showText && (
        <span style={{
          fontSize: size > 30 ? '1.1rem' : '0.9rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          BioGuard
        </span>
      )}
    </div>
  );
}
