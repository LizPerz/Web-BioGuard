export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Esta sección está en desarrollo. Pronto estará disponible.
      </p>
    </div>
  );
}
