import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  subject: string;
  from: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  summary?: {
    urgency: string;
  };
}

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
}

export default function EmailList({ emails, selectedEmail, onSelectEmail }: EmailListProps) {
  return (
    <div className="divide-y divide-gray-200">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onSelectEmail(email)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition duration-150 ${
            selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
          } ${!email.isRead ? 'bg-blue-50/30' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                {!email.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
                <p className={`text-sm font-medium text-gray-900 truncate ${
                  !email.isRead ? 'font-semibold' : ''
                }`}>
                  {email.from}
                </p>
              </div>
              <p className={`text-sm text-gray-900 truncate mt-1 ${
                !email.isRead ? 'font-semibold' : ''
              }`}>
                {email.subject}
              </p>
              <p className="text-sm text-gray-600 truncate mt-1">
                {email.bodyPreview}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(email.receivedDateTime), { addSuffix: true })}
              </p>
              {email.summary?.urgency === 'high' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                  Urgent
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
