import { SAMPLES } from "../samples";

interface SampleMenuProps {
  onLoad: (config: string, template: string) => void;
}

export function SampleMenu({ onLoad }: SampleMenuProps) {
  return (
    <div role="group" aria-label="samples">
      {SAMPLES.map((s) => (
        <button key={s.label} type="button" onClick={() => onLoad(s.config, s.template)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
