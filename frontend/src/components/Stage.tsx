import { meshActive } from '../lib/geometry';
import { useStore } from '../store';
import { DomSurface } from './DomSurface';
import { GlSurface } from './GlSurface';

/** Projected output: surfaces in z-order (first = back). */
export function Stage() {
  const surfaces = useStore(st => st.surfaces);
  return (
    <div className="stage">
      {surfaces.map(s => (meshActive(s) ? <GlSurface key={s.id + ':gl'} s={s} /> : <DomSurface key={s.id + ':dom'} s={s} />))}
    </div>
  );
}
