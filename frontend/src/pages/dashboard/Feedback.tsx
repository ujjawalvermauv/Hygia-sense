import { useState } from 'react';
import { QrCode, Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/dashboard/StatusBadge';

interface FeedbackItem {
  id: number;
  rating: number;
  comment: string;
  washroom: string;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

const feedbackData: FeedbackItem[] = [
  { id: 1, rating: 5, comment: 'Very clean and well maintained. Great job!', washroom: 'Washroom A', timestamp: '2025-01-26 09:45 AM', sentiment: 'positive' },
  { id: 2, rating: 4, comment: 'Good cleanliness, but soap dispenser was empty.', washroom: 'Washroom B', timestamp: '2025-01-26 09:30 AM', sentiment: 'positive' },
  { id: 3, rating: 2, comment: 'Bad odour and wet floor. Needs attention.', washroom: 'Washroom C', timestamp: '2025-01-26 09:15 AM', sentiment: 'negative' },
  { id: 4, rating: 5, comment: 'Excellent maintenance. Keep it up!', washroom: 'Washroom A', timestamp: '2025-01-26 08:50 AM', sentiment: 'positive' },
  { id: 5, rating: 3, comment: 'Average condition. Could be better.', washroom: 'Washroom D', timestamp: '2025-01-26 08:30 AM', sentiment: 'neutral' },
  { id: 6, rating: 1, comment: 'Very dirty. Immediate cleaning required.', washroom: 'Washroom C', timestamp: '2025-01-26 08:00 AM', sentiment: 'negative' },
];

const Feedback = () => {
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

  const filteredFeedback = feedbackData.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'positive') return f.sentiment === 'positive';
    if (filter === 'negative') return f.sentiment === 'negative';
    return true;
  });

  const averageRating = (feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length).toFixed(1);
  const positiveCount = feedbackData.filter((f) => f.sentiment === 'positive').length;
  const negativeCount = feedbackData.filter((f) => f.sentiment === 'negative').length;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-status-warning fill-status-warning' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-header">User Feedback</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Section */}
        <div className="metric-card text-center">
          <h2 className="text-base font-semibold mb-4">Feedback QR Code</h2>
          <div className="w-48 h-48 bg-secondary rounded-lg mx-auto flex items-center justify-center mb-4">
            <QrCode className="w-32 h-32 text-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Scan to submit feedback for washroom
          </p>
          <select className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
            <option>Washroom A - Ground Floor</option>
            <option>Washroom B - First Floor</option>
            <option>Washroom C - Second Floor</option>
            <option>Washroom D - Third Floor</option>
          </select>
        </div>

        {/* Stats Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="metric-card text-center">
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Star className="w-5 h-5 text-status-warning fill-status-warning" />
                <span className="text-2xl font-semibold">{averageRating}</span>
              </div>
            </div>
            <div className="metric-card text-center">
              <p className="text-sm text-muted-foreground">Positive</p>
              <p className="text-2xl font-semibold text-status-good mt-2">{positiveCount}</p>
            </div>
            <div className="metric-card text-center">
              <p className="text-sm text-muted-foreground">Negative</p>
              <p className="text-2xl font-semibold text-status-danger mt-2">{negativeCount}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Feedback</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'positive' | 'negative')}
                  className="px-3 py-1.5 bg-background border border-input rounded-md text-sm"
                >
                  <option value="all">All Feedback</option>
                  <option value="positive">Positive Only</option>
                  <option value="negative">Negative Only</option>
                </select>
              </div>
            </div>

            {/* Feedback Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-left">Rating</th>
                    <th className="pb-3 pr-4 text-left">Comment</th>
                    <th className="pb-3 pr-4 text-left">Location</th>
                    <th className="pb-3 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedback.map((feedback) => (
                    <tr key={feedback.id} className="table-row-hover border-b border-border last:border-b-0">
                      <td className="py-3 pr-4">{renderStars(feedback.rating)}</td>
                      <td className="py-3 pr-4">
                        <p className="text-sm max-w-xs">{feedback.comment}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-muted-foreground">{feedback.washroom}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-xs text-muted-foreground">{feedback.timestamp}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
