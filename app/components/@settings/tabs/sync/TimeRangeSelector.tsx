import { classNames } from '~/utils/classNames';
import type { TimeRange } from '~/types/sync';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  options: Array<{ value: TimeRange; label: string }>;
}

export default function TimeRangeSelector({ value, onChange, options }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TimeRange)}
        className={classNames(
          'px-2 py-1 text-sm rounded-md',
          'bg-bolt-elements-background-depth-2',
          'border border-bolt-elements-borderColor/10',
          'text-bolt-elements-textPrimary',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
