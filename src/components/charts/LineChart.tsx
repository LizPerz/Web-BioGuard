export interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: LineChartPoint[];
  color: string;
  height?: number;
  precision?: number;
  showLabels?: boolean;
}

export function LineChart({ points, color, height = 180, precision = 1, showLabels = true }: LineChartProps) {
  const width = 600;
  const padX = 10;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padX + (points.length > 1 ? i * stepX : innerW / 2),
    y: padY + innerH - ((p.value - min) / span) * innerH,
    label: p.label,
  }));

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${padY + innerH} L${coords[0].x},${padY + innerH} Z`;

  const grid = Array.from({ length: 5 }, (_, i) => padY + (innerH / 4) * i);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Gráfica de línea (máx ${max.toFixed(precision)}, mín ${min.toFixed(precision)})`}
    >
      {grid.map((gy, i) => (
        <line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={gy}
          y2={gy}
          stroke="var(--border-faint, rgba(128, 128, 128, 0.15))"
          strokeWidth={1}
        />
      ))}
      <path d={area} fill={color} opacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showLabels &&
        coords.map((c, i) =>
          i % labelEvery === 0 ? (
            <text
              key={i}
              x={c.x}
              y={height - 2}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-tertiary)"
            >
              {c.label}
            </text>
          ) : null,
        )}
    </svg>
  );
}
