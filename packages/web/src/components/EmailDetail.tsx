import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../services/api';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedDateTime: string;
  summary?: {
    summary: string;
    keyPoints: string[];
    sentiment: string;
    urgency: string;
    category?: string;
  };
}

interface EmailDetailProps {
  email: Email;
}

export default function EmailDetail({ email }: EmailDetailProps) {
  const [shorthand, setShorthand] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [showReplyBox, setShowReplyBox] = useState(false);
  const queryClient = useQueryClient();

  const summarizeMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const response = await api.post(`/ai/summarize/${emailId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const draftReplyMutation = useMutation({
    mutationFn: async ({ emailId, shorthand }: { emailId: string; shorthand: string }) => {
      const response = await api.post('/ai/draft-reply', { emailId, shorthand });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedReply(data.data.generatedReply);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string[]; subject: string; body: string }) => {
      const response = await api.post('/emails/send', { to, subject, body });
      return response.data;
    },
    onSuccess: () => {
      setShowReplyBox(false);
      setShorthand('');
      setGeneratedReply('');
      alert('Email sent successfully!');
    },
  });

  const handleSummarize = () => {
    summarizeMutation.mutate(email.id);
  };

  const handleGenerateReply = () => {
    if (shorthand.trim()) {
      draftReplyMutation.mutate({ emailId: email.id, shorthand });
    }
  };

  const handleSendReply = () => {
    if (generatedReply.trim()) {
      sendEmailMutation.mutate({
        to: [email.from],
        subject: `Re: ${email.subject}`,
        body: generatedReply,
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Email Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{email.subject}</h2>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <p className="font-medium">From: {email.from}</p>
            <p>To: {email.to.join(', ')}</p>
          </div>
          <p>{format(new Date(email.receivedDateTime), 'PPpp')}</p>
        </div>
      </div>

      {/* Email Summary */}
      {email.summary ? (
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
          <p className="text-gray-700 mb-3">{email.summary.summary}</p>
          {email.summary.keyPoints.length > 0 && (
            <div>
              <p className="font-medium text-gray-900 mb-1">Key Points:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {email.summary.keyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {email.summary.sentiment}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              email.summary.urgency === 'high' ? 'bg-red-100 text-red-800' :
              email.summary.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {email.summary.urgency} urgency
            </span>
            {email.summary.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {email.summary.category}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <button
            onClick={handleSummarize}
            disabled={summarizeMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
          >
            {summarizeMutation.isPending ? 'Summarizing...' : 'Generate AI Summary'}
          </button>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>

      {/* Reply Section */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        {!showReplyBox ? (
          <button
            onClick={() => setShowReplyBox(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Reply with AI
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Instructions (Shorthand)
              </label>
              <input
                type="text"
                value={shorthand}
                onChange={(e) => setShorthand(e.target.value)}
                placeholder="e.g., Accept meeting, ask for more details"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleGenerateReply}
                disabled={draftReplyMutation.isPending || !shorthand.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
              >
                {draftReplyMutation.isPending ? 'Generating...' : 'Generate Reply'}
              </button>
            </div>

            {generatedReply && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Reply
                </label>
                <textarea
                  value={generatedReply}
                  onChange={(e) => setGeneratedReply(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={handleSendReply}
                    disabled={sendEmailMutation.isPending}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition duration-200"
                  >
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyBox(false);
                      setShorthand('');
                      setGeneratedReply('');
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
