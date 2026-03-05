import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsData {
  totalLeads: number;
  bookedLeads: number;
  hotLeads: number;
  pendingFollowups: number;
  conversionRate: string;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  if (!data) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;

  const cards = [
    { label: 'Total Leads', value: data.totalLeads, icon: Users, color: 'bg-blue-500/20 text-blue-300' },
    { label: 'Conversion Rate', value: `${data.conversionRate}%`, icon: TrendingUp, color: 'bg-green-500/20 text-green-300' },
    { label: 'Hot Leads', value: data.hotLeads, icon: CheckCircle, color: 'bg-red-500/20 text-red-300' },
    { label: 'Pending Follow-ups', value: data.pendingFollowups, icon: Calendar, color: 'bg-orange-500/20 text-orange-300' },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar">
      <h1 className="text-2xl font-bold text-white mb-6">Performance</h1>

      <div className="bg-gradient-to-br from-[#d0bcff]/20 to-[#381e72]/20 p-6 rounded-3xl border border-[#d0bcff]/10 mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d0bcff]/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <p className="text-sm text-[#d0bcff] uppercase tracking-wider font-medium mb-2">Agent Performance Score</p>
        <h2 className="text-6xl font-bold text-white mb-2">84</h2>
        <p className="text-xs text-gray-400">Top 15% of agents this week</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#2d2f31] p-4 rounded-2xl border border-white/5"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${card.color}`}>
                <Icon size={20} />
              </div>
              <p className="text-xs text-gray-400 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-[#2d2f31] p-6 rounded-3xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">Follow-up Compliance</h3>
        <div className="flex items-end gap-2 h-32">
          {[65, 40, 75, 50, 85, 60, 90].map((h, i) => (
            <div key={i} className="flex-1 bg-[#d0bcff]/20 rounded-t-lg relative group">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-[#d0bcff] rounded-t-lg transition-all duration-500"
                style={{ height: `${h}%` }}
              ></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>
    </div>
  );
}
