type AppIconImageProps = {
  size: number;
  maskable?: boolean;
};

export function AppIconImage({ size, maskable = false }: AppIconImageProps) {
  const padding = maskable ? Math.round(size * 0.12) : 0;
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.42);
  const radius = maskable ? 0 : Math.round(size * 0.22);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
        borderRadius: radius,
        padding,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.04em',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
        }}
      >
        S
      </div>
    </div>
  );
}
