import Icon from './Icon';
import { useEffect, useState } from 'preact/hooks';

export default function ProductNav({ base = '', helpId = 'how-it-works', appMode = false }: { base?: string; helpId?: string; appMode?: boolean }) {
  const [active, setActive] = useState('calculator');
  const items = [
    ...(appMode ? [{ id: 'subjects', label: 'Subjects', icon: 'subjects' as const }] : []),
    { id: 'calculator', label: 'Calculator', icon: 'calculator' as const },
    ...(appMode ? [{ id: 'saved-tools', label: 'History', icon: 'history' as const }] : []),
    { id: helpId, label: 'Help', icon: 'help' as const },
  ];
  useEffect(() => {
    const onHash = () => { const id = location.hash.slice(1); if (items.some(item => item.id === id)) setActive(id); };
    onHash(); window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [helpId]);
  return <nav class="product-nav" aria-label="Attendance navigation">{items.map(item => <a key={item.id} href={`${base}#${item.id}`} aria-current={!base && active === item.id ? 'location' : undefined} onClick={() => setActive(item.id)}><Icon name={item.icon} size={17}/><span>{item.label}</span></a>)}</nav>;
}
