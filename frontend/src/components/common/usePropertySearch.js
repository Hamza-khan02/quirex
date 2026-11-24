import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../config/api';

// Loads /api/property-list with the page's URL query (?listingType=rent&page=2),
// so a filtered page can be bookmarked or shared. Pass `fixedQuery` to ignore
// the URL, as the home page's featured list does.
export const usePropertySearch = (fixedQuery) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1, loaded: false });
  const query = fixedQuery ?? searchParams.toString();

  const refresh = useCallback(async () => {
    const response = await api.get(`/api/property-list?${query}`);
    if (response?.data?.code == 200) {
      setResult({ ...response.data.data, loaded: true });
    } else {
      setResult((previous) => ({ ...previous, loaded: true }));
    }
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { ...result, searchParams, setSearchParams, setPage, refresh };
};
