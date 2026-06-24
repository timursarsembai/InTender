import dynamic from 'next/dynamic';

export const Map = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '300px',
        width: '100%',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
      }}
    >
      Загрузка карты...
    </div>
  ),
});
