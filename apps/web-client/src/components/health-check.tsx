'use client';

import { useEffect, useState } from 'react';

export function HealthCheck() {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          setStatus('healthy');
          setMessage(data.message || 'Server is healthy');
        } else {
          setStatus('unhealthy');
          setMessage('Server returned an error');
        }
      } catch (error) {
        setStatus('unhealthy');
        setMessage('Unable to connect to server');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          status === 'checking' ? 'bg-yellow-500 animate-pulse' :
          status === 'healthy' ? 'bg-green-500' :
          'bg-red-500'
        }`} />
        <div>
          <p className="text-sm font-medium">Server Status</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    </div>
  );
}
