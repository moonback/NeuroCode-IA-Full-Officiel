import type { MutableRefObject, LegacyRef } from 'react';

type ReactRef<T> = MutableRefObject<T> | LegacyRef<T>;

export function mergeRefs<T>(...refs: (ReactRef<T> | undefined)[]) {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as MutableRefObject<T | null>).current = value;
      }
    });
  };
}