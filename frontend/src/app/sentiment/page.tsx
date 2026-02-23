'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface CompanySentiment {
  company: string;
  documents_analyzed: number;
  sentiment_score: number;
  positive_words: number;
  negative_words: number;
  uncertainty_words: number;
  ai_mentions: number;
  positive_per_1k: number;
  negative_per_1k: number;
  word_count: number;
}

interface SentimentDashboard {
  companies: Array<{
    company: string;
    sentiment_score: number;
    positive_words: number;
    negative_words: number;
    ai_mentions: number;
    trend: string;
    sentiment_change: number;
  }>;
  summary: {
    most_positive: string | null;
    most_negative: string | null;
    most_ai_focused: string | null;
    average_sentiment: number;
  };
}

export default function SentimentPage() {
  const [dashboard, setDashboard] = useState<SentimentDashboard | null>(null);
  const [comparison, setComparison] = useState<CompanySentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSentimentData();
  }, []);

  const fetchSentimentData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, comparisonRes] = await Promise.all([
        fetch(`${API_URL}/api/sentiment/dashboard`),
        fetch(`${API_URL}/api/sentiment/compare`),
      ]);

      if (!dashboardRes.ok || !comparisonRes.ok) {
        throw new Error('Failed to fetch sentiment data');
      }

      const dashboardData = await dashboardRes.json();
      const comparisonData = await comparisonRes.json();

      setDashboard(dashboardData);
      setComparison(comparisonData.comparison || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return 'text-green-600 bg-green-100';
    if (score >= 0.3) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sentiment analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSentimentData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartData = comparison.map(c => ({
    company: c.company,
    sentiment: Math.round(c.sentiment_score * 100),
    positive: c.positive_per_1k,
    negative: c.negative_per_1k,
    ai_mentions: c.ai_mentions,
  }));

  const radarData = comparison.map(c => ({
    company: c.company,
    Sentiment: c.sentiment_score * 100,
    'Positive Language': c.positive_per_1k,
    'AI Focus': c.ai_mentions * 10,
    'Word Count': c.word_count / 100,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sentiment Analysis Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Financial sentiment analysis across EMS companies based on SEC filings and earnings documents
          </p>
        </div>

        {/* Summary Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Most Positive</h3>
              <p className="text-2xl font-bold text-green-600">{dashboard.summary.most_positive || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Most Negative</h3>
              <p className="text-2xl font-bold text-red-600">{dashboard.summary.most_negative || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Most AI Focused</h3>
              <p className="text-2xl font-bold text-blue-600">{dashboard.summary.most_ai_focused || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Avg Sentiment</h3>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.summary.average_sentiment !== undefined
                  ? `${(dashboard.summary.average_sentiment * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Sentiment Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Sentiment Scores by Company</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="company" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sentiment" name="Sentiment %" fill="#3B82F6" />
              <Bar dataKey="positive" name="Positive/1k" fill="#10B981" />
              <Bar dataKey="negative" name="Negative/1k" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Company Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboard?.companies.map(company => (
            <div key={company.company} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{company.company}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(company.sentiment_score)}`}>
                  {(company.sentiment_score * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trend</span>
                  <span>{getTrendIcon(company.trend)} {company.trend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sentiment Change</span>
                  <span className={company.sentiment_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {company.sentiment_change >= 0 ? '+' : ''}{(company.sentiment_change * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">AI Mentions</span>
                  <span className="font-medium">{company.ai_mentions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Detailed Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs Analyzed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sentiment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Positive/1k</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Negative/1k</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uncertainty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Mentions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparison.map(company => (
                  <tr key={company.company} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{company.company}</td>
                    <td className="px-6 py-4">{company.documents_analyzed}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded ${getSentimentColor(company.sentiment_score)}`}>
                        {(company.sentiment_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-green-600">{company.positive_per_1k}</td>
                    <td className="px-6 py-4 text-red-600">{company.negative_per_1k}</td>
                    <td className="px-6 py-4">{company.uncertainty_words}</td>
                    <td className="px-6 py-4">{company.ai_mentions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
