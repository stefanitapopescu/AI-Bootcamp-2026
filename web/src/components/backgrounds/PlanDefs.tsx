import { doors, floorPath, wallPaths } from './plan';

/**
 * Planul etajului ca <g id> într-un <defs>, ca să fie refolosit cu <use href="#id">.
 * Culorile vin din variabilele --pl-* setate de fiecare fundal (vezi backgrounds.css).
 */
export function PlanDefs({ id }: { id: string }) {
  return (
    <defs>
      <g id={id}>
        <path className="pl-floor" fillRule="evenodd" d={floorPath} />
        {doors.map((d) => (
          <path key={`m${d.id}`} className="pl-mat" d={d.mat} />
        ))}
        {wallPaths.map((d, i) => (
          <path key={i} className="pl-wall" d={d} />
        ))}
        {doors.map((d) => (
          <path key={d.id} className="pl-door" d={d.line} />
        ))}
      </g>
    </defs>
  );
}
