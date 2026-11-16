import { useEffect, useState } from 'react';
import { useStore } from '../store';

export function Toast() {
  const toast = useStore(st => st.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return <div className={'toast' + (visible ? ' show' : '')}>{toast?.msg}</div>;
}
