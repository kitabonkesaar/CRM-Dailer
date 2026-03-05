/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Dialer from './components/Dialer';
import Leads from './components/Leads';
import Analytics from './components/Analytics';
import Followups from './components/Followups';
import CallSimulation from './components/CallSimulation';
import PostCallSummary from './components/PostCallSummary';
import FollowupAlert from './components/FollowupAlert';
import AdminLayout from './components/admin/AdminLayout';
import { AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

import { Toaster } from 'sonner';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dialer');
  const [activeCall, setActiveCall] = useState<{ number: string } | null>(null);
  const [postCall, setPostCall] = useState<{ number: string; duration: number } | null>(null);

  const handleStartCall = (number: string) => {
    setActiveCall({ number });
  };

  const handleEndCall = (duration: number) => {
    if (activeCall) {
      setPostCall({ number: activeCall.number, duration });
      setActiveCall(null);
    }
  };

  const handlePostCallComplete = () => {
    setPostCall(null);
  };

  if (isAdmin) {
    return <AdminLayout onLogout={() => setIsAdmin(false)} />;
  }

  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'dialer' && <Dialer onCall={handleStartCall} />}
        {activeTab === 'leads' && <Leads onCall={handleStartCall} />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'followups' && <Followups onCall={handleStartCall} />}

        {/* Global Follow-up Alert */}
        <FollowupAlert onCall={handleStartCall} />

        {/* Overlays */}
        <AnimatePresence>
          {activeCall && (
            <CallSimulation 
              number={activeCall.number} 
              onEnd={handleEndCall} 
            />
          )}
          {postCall && (
            <PostCallSummary 
              number={postCall.number} 
              duration={postCall.duration} 
              onComplete={handlePostCallComplete} 
            />
          )}
        </AnimatePresence>
      </Layout>
      
      {/* Hidden Admin Trigger (Bottom Right) */}
      <button 
        onClick={() => setIsAdmin(true)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/20 hover:text-white/50 transition-colors"
        title="Admin Panel"
      >
        <Shield size={16} />
      </button>
    </>
  );
}
