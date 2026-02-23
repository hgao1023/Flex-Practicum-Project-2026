'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Building2, 
  Globe, 
  RefreshCw,
  Factory,
  Briefcase,
  Users
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const COMPANY_COLORS: Record<string, string> = {
  Flex: '#00A0E3',
  Jabil: '#1E4D2B',
  Celestica: '#003366',
  Benchmark: '#B8860B',
  Sanmina: '#C41E3A',
};

const REGION_COLORS = ['#3B82F6', '#8B5CF6', '#10B981'];

interface Facility {
  company: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: string;
  is_headquarters: boolean;
}

export default function MapPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeographicData();
  }, []);

  const fetchGeographicData = async () => {
    setLoading(true);
    try {
      const [facilitiesRes, compareRes] = await Promise.all([
        fetch(`${API_URL}/api/geographic/facilities`),
        fetch(`${API_URL}/api/geographic/compare`),
      ]);

      if (facilitiesRes.ok) {
        const data = await facilitiesRes.json();
        setFacilities(data.facilities || []);
      }
      if (compareRes.ok) {
        setComparison(await compareRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch geographic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFacilities = selectedCompany
    ? facilities.filter(f => f.company === selectedCompany)
    : facilities;

  const facilityCountByCompany = facilities.reduce((acc, f) => {
    acc[f.company] = (acc[f.company] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const facilityCountData = Object.entries(facilityCountByCompany).map(([company, count]) => ({
    company,
    count,
    fill: COMPANY_COLORS[company] || '#64748B',
  }));

  const regionalData = comparison?.companies?.map((c: any) => ({
    company: c.company,
    Americas: c.regional_distribution?.Americas || 0,
    EMEA: c.regional_distribution?.EMEA || 0,
    APAC: c.regional_distribution?.APAC || 0,
  })) || [];

  const overlapLocations = comparison?.overlap_analysis?.locations || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <Globe className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 mt-4 font-medium">Loading facility data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-green-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Geographic Analysis</h1>
              <p className="text-slate-500 mt-1">Global facility mapping and regional distribution</p>
            </div>
          </div>
          <button
            onClick={fetchGeographicData}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Total Facilities</span>
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{facilities.length}</p>
            <p className="text-sm text-slate-500">Across all companies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Shared Locations</span>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {Object.keys(overlapLocations).length}
            </p>
            <p className="text-sm text-slate-500">Cities with multiple companies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">APAC Leader</span>
              <MapPin className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {comparison?.regional_leaders?.APAC?.company || 'N/A'}
            </p>
            <p className="text-sm text-slate-500">
              {comparison?.regional_leaders?.APAC?.count || 0} facilities
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Americas Leader</span>
              <Factory className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {comparison?.regional_leaders?.Americas?.company || 'N/A'}
            </p>
            <p className="text-sm text-slate-500">
              {comparison?.regional_leaders?.Americas?.count || 0} facilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company Filter */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 mr-2">Filter by company:</span>
        <button
          onClick={() => setSelectedCompany(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedCompany === null
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All
        </button>
        {Object.keys(COMPANY_COLORS).map((company) => (
          <button
            key={company}
            onClick={() => setSelectedCompany(company)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCompany === company
                ? 'text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            style={{
              backgroundColor: selectedCompany === company ? COMPANY_COLORS[company] : undefined,
            }}
          >
            {company}
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Facility Count by Company */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Facilities by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facilityCountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="company" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Facilities" radius={[4, 4, 0, 0]}>
                  {facilityCountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Regional Distribution */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              Regional Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="company" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Americas" stackId="a" fill="#3B82F6" />
                <Bar dataKey="EMEA" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="APAC" stackId="a" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Facility List */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Facility Locations
            </div>
            <Badge variant="secondary">{filteredFacilities.length} locations</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFacilities.map((facility, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  facility.is_headquarters
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {facility.is_headquarters ? (
                      <Briefcase className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Factory className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-semibold text-slate-900">{facility.city}</span>
                  </div>
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${COMPANY_COLORS[facility.company]}20`,
                      color: COMPANY_COLORS[facility.company],
                      borderColor: COMPANY_COLORS[facility.company],
                    }}
                  >
                    {facility.company}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{facility.country}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{facility.type}</span>
                  <span className="text-xs text-slate-400">
                    {facility.lat.toFixed(2)}, {facility.lng.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shared Locations */}
      {Object.keys(overlapLocations).length > 0 && (
        <Card className="border-0 shadow-xl mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Shared Manufacturing Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(overlapLocations).map(([city, companies]) => (
                <div
                  key={city}
                  className="p-4 bg-purple-50 rounded-xl border border-purple-200"
                >
                  <h4 className="font-semibold text-purple-900 mb-2">{city}</h4>
                  <div className="flex flex-wrap gap-1">
                    {(companies as string[]).map((company) => (
                      <Badge
                        key={company}
                        className="text-xs"
                        style={{
                          backgroundColor: COMPANY_COLORS[company],
                          color: 'white',
                        }}
                      >
                        {company}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
