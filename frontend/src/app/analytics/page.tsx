'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Brain,
  Zap,
  BarChart3,
  RefreshCw,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface TrendData {
  company: string;
  overall_outlook: string;
  capex_trend: { direction: string; confidence: number };
  ai_focus_trend: { direction: string; confidence: number };
  sentiment_trend: { direction: string; confidence: number };
}

interface ClassificationData {
  company: string;
  overall_ai_focus_percentage: number;
  investment_focus: string;
}

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<any>(null);
  const [classification, setClassification] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [trendsRes, classRes, anomalyRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/trends`),
        fetch(`${API_URL}/api/analytics/classification`),
        fetch(`${API_URL}/api/analytics/anomalies`),
      ]);

      if (trendsRes.ok) setTrends(await trendsRes.json());
      if (classRes.ok) setClassification(await classRes.json());
      if (anomalyRes.ok) setAnomalies(await anomalyRes.json());
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    if (direction === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (direction === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getOutlookColor = (outlook: string) => {
    if (outlook === 'positive') return 'bg-green-100 text-green-700 border-green-200';
    if (outlook === 'cautious') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
            <Brain className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 mt-4 font-medium">Analyzing market trends...</p>
        </div>
      </div>
    );
  }

  const aiClassificationData = classification?.companies?.map((c: ClassificationData) => ({
    company: c.company,
    ai_focus: c.overall_ai_focus_percentage,
    traditional: 100 - c.overall_ai_focus_percentage,
  })) || [];

  const trendComparisonData = trends?.companies?.map((t: TrendData) => ({
    company: t.company,
    capex: t.capex_trend?.confidence || 0,
    ai: t.ai_focus_trend?.confidence || 0,
    sentiment: t.sentiment_trend?.confidence || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-purple-500/20">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Advanced Analytics</h1>
              <p className="text-slate-500 mt-1">AI-powered market intelligence and trend analysis</p>
            </div>
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Market Outlook Banner */}
      {trends?.market_outlook && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-900 to-slate-800 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Market Outlook</h3>
                <p className="text-slate-300">{trends.market_outlook}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Industry AI Focus</span>
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {classification?.industry_average_ai_focus || 0}%
            </p>
            <p className="text-sm text-slate-500">Average across companies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Anomalies Detected</span>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {(anomalies?.capex_anomalies?.length || 0) + (anomalies?.sentiment_shifts?.length || 0)}
            </p>
            <p className="text-sm text-slate-500">Across all metrics</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">AI Leaders</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {trends?.rankings?.ai_focus_growth?.length || 0}
            </p>
            <p className="text-sm text-slate-500">Companies growing AI focus</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Companies Analyzed</span>
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {trends?.companies?.length || 0}
            </p>
            <p className="text-sm text-slate-500">Full trend analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI vs Traditional Investment */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI vs Traditional Investment Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={aiClassificationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="company" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ai_focus" name="AI/Data Center" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="traditional" name="Traditional" stackId="a" fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Confidence Radar */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Trend Analysis Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={trendComparisonData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="company" tick={{ fill: '#64748B', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="CapEx" dataKey="capex" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Radar name="AI Focus" dataKey="ai" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                <Radar name="Sentiment" dataKey="sentiment" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Company Trend Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Company Trend Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {trends?.companies?.map((company: TrendData) => (
            <Card key={company.company} className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{company.company}</h3>
                  <Badge className={`${getOutlookColor(company.overall_outlook)} border`}>
                    {company.overall_outlook}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">CapEx</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(company.capex_trend?.direction)}
                      <span className="text-slate-700">{company.capex_trend?.direction || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">AI Focus</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(company.ai_focus_trend?.direction)}
                      <span className="text-slate-700">{company.ai_focus_trend?.direction || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Sentiment</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(company.sentiment_trend?.direction)}
                      <span className="text-slate-700">{company.sentiment_trend?.direction || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Anomalies Section */}
      {anomalies && (anomalies.capex_anomalies?.length > 0 || anomalies.sentiment_shifts?.length > 0) && (
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Detected Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.capex_anomalies?.map((anomaly: any, idx: number) => (
                <div key={`capex-${idx}`} className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-orange-900">{anomaly.company}</span>
                    <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                      CapEx Anomaly
                    </Badge>
                  </div>
                  <p className="text-sm text-orange-800">
                    {anomaly.anomalies?.length || 0} periods with unusual CapEx activity detected
                  </p>
                </div>
              ))}
              
              {anomalies.sentiment_shifts?.map((shift: any, idx: number) => (
                <div key={`sentiment-${idx}`} className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-purple-900">{shift.company}</span>
                    <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                      Sentiment Shift
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-800">
                    {shift.shifts?.length || 0} significant sentiment changes detected
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
