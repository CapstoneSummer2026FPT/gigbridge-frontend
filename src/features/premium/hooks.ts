import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResponse } from '../../types/common';

export function usePremiumResource<T>(loader: () => Promise<ApiResponse<T>>) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(undefined);
    const response = await loader();
    if (id !== request.current) return;
    if (response.success) setData(response.data);
    else setError(response.message);
    setLoading(false);
  }, [loader]);

  useEffect(() => {
    void refresh();
    return () => { request.current += 1; };
  }, [refresh]);

  return { data, loading, error, refresh };
}

