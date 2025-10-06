import { HealthCheck } from '@/components/health-check';
import { PeopleTable } from '@/components/people-table';

export default function Home() {
  return (
    <div className="min-h-screen p-8 sm:p-20">
      <main className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your backend API and manage people records
          </p>
        </div>

        <HealthCheck />

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">People Directory</h2>
          <PeopleTable />
        </div>
      </main>
    </div>
  );
}
