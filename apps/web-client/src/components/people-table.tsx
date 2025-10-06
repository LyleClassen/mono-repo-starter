'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { paths } from '@/lib/api/schema';

type PeopleResponse = paths['/people']['get']['responses']['200']['content']['application/json'];
type Person = PeopleResponse['data'][number];

export function PeopleTable() {
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.GET('/people', {
        params: {
          query: {
            limit,
            offset,
            ...(search && { search }),
          },
        },
      });

      if (data) {
        setPeople(data.data);
        setTotal(data.total);
      } else {
        console.error('Failed to fetch people:', error);
      }
    } catch (error) {
      console.error('Failed to fetch people:', error);
    } finally {
      setLoading(false);
    }
  }, [search, limit, offset]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPeople();
    }, 300);

    return () => clearTimeout(debounce);
  }, [fetchPeople]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOffset(0); // Reset to first page on new search
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search people..."
          value={search}
          onChange={handleSearchChange}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {total}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Age</th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : people.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No people found
                </td>
              </tr>
            ) : (
              people.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    {person.firstName} {person.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {person.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {person.age}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {person.city}, {person.country}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
