import React from 'react';
import { Phone, Users, Calendar, BarChart3, UserCircle } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

interface Agent {
  id: number;
  name: string;
  role: string;
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  agents?: Agent[];
  currentUser?: Agent | null;
  setCurrentUser?: (agent: Agent) => void;
}

export default function Layout({ children, activeTab, setActiveTab, agents = [], currentUser, setCurrentUser }: LayoutProps) {
  const tabs = [
    { id: 'dialer', label: 'Dialer', icon: Phone },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'followups', label: 'Follow-ups', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-[#1a1c1e] w-full max-w-md mx-auto border-x border-white/5 overflow-hidden relative text-[#e2e2e6] shadow-2xl">
      {/* Header with User Selector */}
      <header className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-[#1a1c1e]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d0bcff] to-[#381e72] flex items-center justify-center text-[#381e72] font-bold text-xs">
            {currentUser?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Logged in as</span>
            <select 
              className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              value={currentUser?.id || ''}
              onChange={(e) => {
                const agent = agents.find(a => a.id === Number(e.target.value));
                if (agent && setCurrentUser) setCurrentUser(agent);
              }}
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id} className="bg-[#2d2f31] text-white">
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs font-mono text-[#d0bcff]/50 border border-[#d0bcff]/20 px-2 py-1 rounded">
          v1.2.0
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 scroll-smooth no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#1a1c1e]/40 backdrop-blur-xl border-t border-white/5 px-4 py-3 flex justify-around items-center z-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center gap-1 group py-1 px-3"
            >
              <motion.div
                animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                className={`p-2 rounded-2xl transition-colors ${
                  isActive ? 'bg-[#d0bcff] text-[#381e72]' : 'text-[#909094] group-hover:text-[#e2e2e6]'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                isActive ? 'text-[#e2e2e6]' : 'text-[#909094]'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 w-1 h-1 bg-[#d0bcff] rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
