'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell,
  Mail,
  MessageSquare,
  Database,
  RefreshCw,
  Save,
  Check,
  X,
  Zap,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Palette,
  Globe,
  Server
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface SystemStatus {
  database: { documents: number; collections: number };
  scheduler: { running: boolean; jobs: number };
  api: { connected: boolean };
}

interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  emailAddress: string;
  slackChannel: string;
  alertTypes: {
    capex: boolean;
    sentiment: boolean;
    ai_investment: boolean;
    new_filing: boolean;
    strategic: boolean;
  };
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    slackEnabled: false,
    emailAddress: '',
    slackChannel: '#competitive-intel',
    alertTypes: {
      capex: true,
      sentiment: true,
      ai_investment: true,
      new_filing: false,
      strategic: true,
    },
    digestFrequency: 'daily',
    minSeverity: 'medium',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    loadLocalSettings();
  }, []);

  const fetchStatus = async () => {
    try {
      const [statsRes, healthRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/analysis/overview`),
        fetch(`${API_URL}/`),
      ]);

      let systemStatus: SystemStatus = {
        database: { documents: 0, collections: 0 },
        scheduler: { running: true, jobs: 2 },
        api: { connected: false },
      };

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        systemStatus.database = {
          documents: data.total_documents || 0,
          collections: 5,
        };
      }

      if (healthRes.status === 'fulfilled') {
        systemStatus.api = { connected: healthRes.value.ok };
      }

      setStatus(systemStatus);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/config`);
      if (res.ok) {
        setNotificationConfig(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const loadLocalSettings = () => {
    const stored = localStorage.getItem('notificationSettings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {}
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateAlertType = (type: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      alertTypes: { ...prev.alertTypes, [type]: enabled },
    }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-600 mx-auto"></div>
          <p className="text-slate-600 mt-4 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-3 rounded-xl shadow-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 mt-1">Configure your platform preferences</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
            saved 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Notifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notification Channels */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email Notifications</h3>
                      <p className="text-sm text-slate-500">Receive alerts via email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings('emailEnabled', !settings.emailEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.emailEnabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.emailEnabled ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
                {settings.emailEnabled && (
                  <input
                    type="email"
                    value={settings.emailAddress}
                    onChange={(e) => updateSettings('emailAddress', e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                )}
                <div className="mt-2 text-xs text-slate-500">
                  {notificationConfig?.email.enabled 
                    ? <span className="text-green-600">✓ SendGrid API configured</span>
                    : <span className="text-amber-600">⚠ SendGrid API not configured</span>
                  }
                </div>
              </div>

              {/* Slack */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Slack Notifications</h3>
                      <p className="text-sm text-slate-500">Receive alerts in Slack</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings('slackEnabled', !settings.slackEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.slackEnabled ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.slackEnabled ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
                {settings.slackEnabled && (
                  <input
                    type="text"
                    value={settings.slackChannel}
                    onChange={(e) => updateSettings('slackChannel', e.target.value)}
                    placeholder="#channel-name"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  />
                )}
                <div className="mt-2 text-xs text-slate-500">
                  {notificationConfig?.slack.enabled 
                    ? <span className="text-green-600">✓ Slack webhook configured</span>
                    : <span className="text-amber-600">⚠ Slack webhook not configured</span>
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Types */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Alert Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'capex', label: 'CapEx Anomalies', description: 'Unusual capital expenditure changes', icon: '💰' },
                  { key: 'sentiment', label: 'Sentiment Shifts', description: 'Significant tone changes in filings', icon: '📊' },
                  { key: 'ai_investment', label: 'AI Investment Changes', description: 'Changes in AI/Data Center focus', icon: '🧠' },
                  { key: 'new_filing', label: 'New Filings', description: 'When new SEC filings are detected', icon: '📄' },
                  { key: 'strategic', label: 'Strategic Changes', description: 'Mergers, acquisitions, restructuring', icon: '🎯' },
                ].map((type) => (
                  <div key={type.key} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-xs text-slate-500">{type.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateAlertType(type.key, !settings.alertTypes[type.key as keyof typeof settings.alertTypes])}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          settings.alertTypes[type.key as keyof typeof settings.alertTypes] ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.alertTypes[type.key as keyof typeof settings.alertTypes] ? 'translate-x-5' : ''
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Delivery Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Digest Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Digest Frequency</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'realtime', label: 'Real-time', desc: 'Instant alerts' },
                    { value: 'daily', label: 'Daily', desc: 'Once per day' },
                    { value: 'weekly', label: 'Weekly', desc: 'Once per week' },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      onClick={() => updateSettings('digestFrequency', freq.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        settings.digestFrequency === freq.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">{freq.label}</div>
                      <div className="text-xs text-slate-500">{freq.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Minimum Severity</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: 'low', label: 'Low', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                    { value: 'high', label: 'High', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                    { value: 'critical', label: 'Critical', color: 'bg-red-100 border-red-300 text-red-700' },
                  ].map((sev) => (
                    <button
                      key={sev.value}
                      onClick={() => updateSettings('minSeverity', sev.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        settings.minSeverity === sev.value
                          ? sev.color
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{sev.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - System Status */}
        <div className="space-y-6">
          {/* System Status */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-green-500" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-medium">API Server</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {status?.api.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Vector Database</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {status?.database.documents.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Documents</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {status?.database.collections}
                    </p>
                    <p className="text-xs text-slate-500">Companies</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Scheduler</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <Badge className="bg-green-100 text-green-700">Running</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Jobs</span>
                    <span className="font-medium">{status?.scheduler.jobs || 2}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => window.location.href = '/alerts'}
                className="w-full p-3 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-all text-left flex items-center gap-3"
              >
                <Bell className="h-5 w-5" />
                <span>View All Alerts</span>
              </button>
              <button
                onClick={() => window.location.href = '/data'}
                className="w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all text-left flex items-center gap-3"
              >
                <Database className="h-5 w-5" />
                <span>Manage Data Sources</span>
              </button>
              <button
                onClick={fetchStatus}
                className="w-full p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-left flex items-center gap-3"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Refresh Status</span>
              </button>
            </CardContent>
          </Card>

          {/* Environment Info */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Environment
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">API URL</span>
                  <span className="font-mono text-xs">{API_URL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mode</span>
                  <span>Development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Version</span>
                  <span>1.0.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
