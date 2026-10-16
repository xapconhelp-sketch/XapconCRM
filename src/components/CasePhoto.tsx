import { useEffect, useState } from 'react';
import { caseFileService } from '../services/caseFileService';

export default function CasePhoto({ reference, alt }: { reference: string; alt: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setUrl(''); setFailed(false);
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const nextUrl = await caseFileService.url(reference);
        if (!cancelled) { setUrl(nextUrl); setFailed(false); }
      } catch { if (!cancelled) { setUrl(''); setFailed(true); } }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 45_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [reference]);
  if (!url) return <span className="text-[9px] text-slate-500" role="status">{failed ? 'Sin acceso' : 'Cargando foto…'}</span>;
  return <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-all" />;
}
