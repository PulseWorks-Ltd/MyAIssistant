import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';

interface Email {
  id: string;
  subject: string;
  from: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  summary?: {
    summary: string;
    keyPoints: string[];
    sentiment: string;
    urgency: string;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const queryClient = useQueryClient();

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const response = await api.get('/emails?limit=50');
      return response.data.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/emails/sync');
      return response.data;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['emails'] });
      }, 5000);
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Copilot</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
            >
              {syncMutation.isPending ? 'Syncing...' : 'Sync Emails'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-600">Loading emails...</div>
          ) : (
            <EmailList
              emails={emailsData?.emails || []}
              selectedEmail={selectedEmail}
              onSelectEmail={setSelectedEmail}
            />
          )}
        </div>

        {/* Email Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedEmail ? (
            <EmailDetail email={selectedEmail} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4">Select an email to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
