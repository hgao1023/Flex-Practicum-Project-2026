'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="relative inline-block mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-8 rounded-3xl shadow-2xl shadow-purple-500/40 animate-pulse">
            <Brain className="h-16 w-16 text-white" />
          </div>
          <div className="absolute -right-3 -bottom-3 bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-xl shadow-lg animate-bounce">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Flex Competitive Intelligence</h1>
        <p className="text-purple-300 mb-8">AI Powered Platform</p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
