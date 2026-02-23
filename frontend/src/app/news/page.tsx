'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  TrendingUp,
  Brain,
  DollarSign,
  Settings,
  Factory,
  Filter,
  Calendar,
  Clock
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const COMPANIES = ['FLEX', 'JBL', 'CLS', 'BHE', 'SANM'];
const COMPANY_NAMES: Record<string, string> = {
  'FLEX': 'Flex Ltd.',
  'JBL': 'Jabil Inc.',
  'CLS': 'Celestica Inc.',
  'BHE': 'Benchmark Electronics',
  'SANM': 'Sanmina Corporation',
};

const COMPANY_COLORS: Record<string, string> = {
  'FLEX': '#3B82F6',
  'JBL': '#10B981',
  'CLS': '#6366F1',
  'BHE': '#F59E0B',
  'SANM': '#EF4444',
};

const CATEGORY_ICONS: Record<string, any> = {
  'earnings': DollarSign,
  'ai': Brain,
  'capex': TrendingUp,
  'strategy': Settings,
  'operations': Factory,
  'general': Newspaper,
};

const CATEGORY_COLORS: Record<string, string> = {
  'earnings': 'bg-green-100 text-green-700',
  'ai': 'bg-purple-100 text-purple-700',
  'capex': 'bg-orange-100 text-orange-700',
  'strategy': 'bg-blue-100 text-blue-700',
  'operations': 'bg-gray-100 text-gray-700',
  'general': 'bg-slate-100 text-slate-700',
};

interface NewsItem {
  title: string;
  url: string;
  description: string;
  source: string;
  categories: string[];
  relevance_score?: number;
}

interface UpcomingEarnings {
  ticker: string;
  company_name: string;
  quarter: string;
  expected_month: string;
  expected_year?: number;
  days_until?: number;
}

export default function NewsPage() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [companyNews, setCompanyNews] = useState<Record<string, NewsItem[]>>({});
  const [industryNews, setIndustryNews] = useState<NewsItem[]>([]);
  const [comparativeNews, setComparativeNews] = useState<any[]>([]);
  const [upcomingEarnings, setUpcomingEarnings] = useState<UpcomingEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllNews();
  }, []);

  const fetchAllNews = async () => {
    setLoading(true);
    try {
      // Fetch all types of news in parallel
      const [allNewsRes, industryRes, comparativeRes, earningsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/news/all?count_per_company=5`),
        fetch(`${API_URL}/api/news/industry?count=10`),
        fetch(`${API_URL}/api/news/comparative`),
        fetch(`${API_URL}/api/earnings/upcoming`),
      ]);

      if (allNewsRes.status === 'fulfilled' && allNewsRes.value.ok) {
        const data = await allNewsRes.value.json();
        const newsMap: Record<string, NewsItem[]> = {};
        for (const ticker of COMPANIES) {
          newsMap[ticker] = data.companies?.[ticker]?.news || [];
        }
        setCompanyNews(newsMap);
      }

      if (industryRes.status === 'fulfilled' && industryRes.value.ok) {
        const data = await industryRes.value.json();
        setIndustryNews(data.news || []);
      }

      if (comparativeRes.status === 'fulfilled' && comparativeRes.value.ok) {
        const data = await comparativeRes.value.json();
        setComparativeNews(data.comparative_news || []);
      }

      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const data = await earningsRes.value.json();
        setUpcomingEarnings(data.upcoming_earnings || []);
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    setRefreshing(true);
    await fetchAllNews();
    setRefreshing(false);
  };

  // Filter news based on selections
  const getFilteredNews = (): NewsItem[] => {
    let allNews: NewsItem[] = [];

    if (selectedCompany === 'all') {
      // Combine all company news
      for (const ticker of COMPANIES) {
        allNews = [...allNews, ...companyNews[ticker]?.map(n => ({ ...n, company: ticker })) || []];
      }
    } else {
      allNews = companyNews[selectedCompany]?.map(n => ({ ...n, company: selectedCompany })) || [];
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      allNews = allNews.filter(n => n.categories?.includes(selectedCategory));
    }

    return allNews;
  };

  const filteredNews = getFilteredNews();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4 font-medium">Loading news feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Newspaper className="h-6 w-6" />
            </div>
            News Feed
          </h1>
          <p className="text-slate-500 mt-2">Real-time competitive intelligence news</p>
        </div>
        <button
          onClick={refreshNews}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Company Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <Building2 className="h-4 w-4 text-slate-400 ml-2" />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-slate-700 pr-8"
          >
            <option value="all">All Companies</option>
            {COMPANIES.map(ticker => (
              <option key={ticker} value={ticker}>{COMPANY_NAMES[ticker]}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <Filter className="h-4 w-4 text-slate-400 ml-2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-slate-700 pr-8"
          >
            <option value="all">All Categories</option>
            <option value="earnings">Earnings</option>
            <option value="ai">AI & Tech</option>
            <option value="capex">CapEx & Investment</option>
            <option value="strategy">Strategy</option>
            <option value="operations">Operations</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Latest News</span>
                <Badge variant="outline">{filteredNews.length} articles</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredNews.length > 0 ? (
                filteredNews.map((item, idx) => {
                  const CategoryIcon = CATEGORY_ICONS[item.categories?.[0]] || Newspaper;
                  return (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {item.source}
                            </Badge>
                            {item.categories?.slice(0, 2).map(cat => (
                              <Badge key={cat} className={`text-xs ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.general}`}>
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Newspaper className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No news found for the selected filters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Industry News */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-slate-600" />
                Industry News
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {industryNews.slice(0, 5).map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all group"
                >
                  <h4 className="font-medium text-slate-900 text-sm group-hover:text-blue-600 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{item.source}</p>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Earnings */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Upcoming Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEarnings.slice(0, 6).map((earnings, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: COMPANY_COLORS[earnings.ticker] }}
                    >
                      {earnings.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{COMPANY_NAMES[earnings.ticker] || earnings.ticker}</p>
                      <p className="text-xs text-slate-500">{earnings.quarter}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{earnings.expected_month}</p>
                    {earnings.days_until !== undefined && (
                      <p className="text-xs text-slate-400">~{Math.round(earnings.days_until)} days</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comparative News */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Comparative Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comparativeNews.length > 0 ? (
                comparativeNews.slice(0, 5).map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all group"
                  >
                    <h4 className="font-medium text-slate-900 text-sm group-hover:text-purple-600 line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.companies_mentioned?.map((company: string) => (
                        <Badge key={company} variant="outline" className="text-xs">
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  No comparative news found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">News Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Total Articles</span>
                  <span className="font-bold">{Object.values(companyNews).flat().length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Industry News</span>
                  <span className="font-bold">{industryNews.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Comparative</span>
                  <span className="font-bold">{comparativeNews.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Upcoming Earnings</span>
                  <span className="font-bold">{upcomingEarnings.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
