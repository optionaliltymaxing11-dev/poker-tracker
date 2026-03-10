import { useState, useEffect, useRef } from 'react';
import { liveQuery } from 'dexie';

/**
 * Drop-in replacement for dexie-react-hooks useLiveQuery that works with React 19.
 * Uses useState/useEffect instead of the fragile useReducer/useMemo pattern.
 */
export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: unknown[] = [],
  defaultResult?: T
): T | undefined {
  const [result, setResult] = useState<T | undefined>(defaultResult);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const observable = liveQuery(querier);
    const subscription = observable.subscribe({
      next: (val) => {
        if (isMounted.current) {
          setResult(val);
          setError(null);
        }
      },
      error: (err) => {
        if (isMounted.current) {
          setError(err);
        }
      },
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (error) throw error;
  return result;
}
