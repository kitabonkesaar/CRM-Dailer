import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, Clock, MessageCircle, Calendar as CalendarIcon, MoreVertical, Timer, AlertCircle, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Followup {
  id: number;
  lead_id: number;
  lead_name: string;
  lead_phone: string;
  temperature: string;
  scheduled_at: string;
  notes: string;
  trip_interested: string;
  source: string;
}

interface FollowupsProps {
  onCall: (number: string) => void;
}

export default function Followups({ onCall }: FollowupsProps) {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [showReschedule, setShowReschedule] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'missed' | 'calendar'>('pending');

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    try {
      const res = await fetch('/api/followups');
      const data = await res.json();
      setFollowups(data);
    } catch (error) {
      console.error('Error fetching followups:', error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await fetch(`/api/followups/${id}/complete`, { method: 'POST' });
      fetchFollowups();
    } catch (error) {
      console.error('Error completing followup:', error);
    }
  };

  const handleBooked = async (followup: Followup) => {
    try {
      // Update lead status to Booked
      await fetch(`/api/leads/${followup.lead_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Booked' })
      });
      // Complete the followup
      await handleComplete(followup.id);
    } catch (error) {
      console.error('Error marking as booked:', error);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const url = `https://wa.me/${phone.replace(/\+/g, '')}`;
    window.open(url, '_blank');
  };

  const handleReschedule = async (id: number, minutes: number) => {
    try {
      const newTime = new Date();
      newTime.setMinutes(newTime.getMinutes() + minutes);
      
      await fetch(`/api/followups/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: newTime.toISOString() })
      });
      setShowReschedule(null);
      fetchFollowups();
    } catch (error) {
      console.error('Error rescheduling:', error);
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const now = new Date();
  
  const getFilteredFollowups = () => {
    if (activeTab === 'missed') {
      return followups.filter(f => new Date(f.scheduled_at) < now);
    }
    if (activeTab === 'pending') {
      return followups.filter(f => new Date(f.scheduled_at) >= now);
    }
    return followups; // Calendar view handles its own grouping
  };

  const filteredFollowups = getFilteredFollowups();

  // Group by date for Calendar view
  const groupedFollowups = followups.reduce((acc, f) => {
    const date = new Date(f.scheduled_at).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(f);
    return acc;
  }, {} as Record<string, Followup[]>);

  const sortedDates = Object.keys(groupedFollowups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Follow-ups</h1>
        <div className="flex bg-[#2d2f31] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'pending' ? 'bg-[#d0bcff] text-[#381e72]' : 'text-gray-400 hover:text-white'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('missed')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'missed' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Missed
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-[#d0bcff] text-[#381e72]' : 'text-gray-400 hover:text-white'}`}
          >
            <CalendarIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
        {activeTab === 'calendar' ? (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h3 className="text-[#d0bcff] font-bold mb-2 sticky top-0 bg-[#1a1c1e] py-2 z-10 border-b border-white/5">
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <div className="space-y-3">
                  {groupedFollowups[date].map(f => (
                    <div key={f.id} className="bg-[#2d2f31] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{f.lead_name}</p>
                        <p className="text-xs text-gray-400">{formatTime(f.scheduled_at)} • {f.trip_interested}</p>
                      </div>
                      <button onClick={() => onCall(f.lead_phone)} className="p-2 bg-green-600/20 text-green-400 rounded-lg">
                        <Phone size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {sortedDates.length === 0 && (
              <div className="text-center text-gray-500 mt-20">No scheduled follow-ups</div>
            )}
          </div>
        ) : (
          filteredFollowups.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              {activeTab === 'missed' ? (
                <>
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No missed follow-ups! Great job.</p>
                </>
              ) : (
                <>
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No pending follow-ups for today.</p>
                </>
              )}
            </div>
          ) : (
            filteredFollowups.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-[#2d2f31] p-4 rounded-xl border relative overflow-visible ${activeTab === 'missed' ? 'border-red-500/20' : 'border-white/5'}`}
              >
                <div className={`absolute top-0 right-0 p-2 rounded-bl-xl rounded-tr-xl ${activeTab === 'missed' ? 'bg-red-500/10' : 'bg-[#d0bcff]/10'}`}>
                  <span className={`text-xs font-bold flex items-center gap-1 ${activeTab === 'missed' ? 'text-red-400' : 'text-[#d0bcff]'}`}>
                    {activeTab === 'missed' ? <AlertCircle size={12} /> : <Clock size={12} />}
                    {activeTab === 'missed' ? new Date(f.scheduled_at).toLocaleDateString() : formatTime(f.scheduled_at)}
                  </span>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-1">{f.lead_name}</h3>
                  <p className="text-sm text-gray-400 font-mono">{f.lead_phone}</p>
                  {f.trip_interested && (
                    <div className="mt-2 inline-block px-2 py-1 bg-white/5 rounded text-xs text-gray-300">
                      Interested in: <span className="text-white font-medium">{f.trip_interested}</span>
                    </div>
                  )}
                  {f.notes && (
                     <p className="mt-2 text-sm text-gray-400 italic">"{f.notes}"</p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button
                    onClick={() => onCall(f.lead_phone)}
                    className="bg-green-600/20 text-green-400 py-2 rounded-lg hover:bg-green-600/30 transition-colors flex flex-col items-center justify-center gap-1"
                    title="Call"
                  >
                    <Phone size={18} />
                    <span className="text-[10px] font-medium">Call</span>
                  </button>
                  
                  <button
                    onClick={() => handleWhatsApp(f.lead_phone)}
                    className="bg-[#25D366]/20 text-[#25D366] py-2 rounded-lg hover:bg-[#25D366]/30 transition-colors flex flex-col items-center justify-center gap-1"
                    title="WhatsApp"
                  >
                    <MessageCircle size={18} />
                    <span className="text-[10px] font-medium">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleBooked(f)}
                    className="bg-purple-600/20 text-purple-400 py-2 rounded-lg hover:bg-purple-600/30 transition-colors flex flex-col items-center justify-center gap-1"
                    title="Mark Booked"
                  >
                    <CheckCircle size={18} />
                    <span className="text-[10px] font-medium">Booked</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowReschedule(showReschedule === f.id ? null : f.id)}
                      className="w-full h-full bg-orange-600/20 text-orange-400 py-2 rounded-lg hover:bg-orange-600/30 transition-colors flex flex-col items-center justify-center gap-1"
                      title="Reschedule"
                    >
                      <Timer size={18} />
                      <span className="text-[10px] font-medium">Reschedule</span>
                    </button>

                    <AnimatePresence>
                      {showReschedule === f.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 w-32 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl overflow-hidden z-10"
                        >
                          <div className="flex flex-col">
                            <button onClick={() => handleReschedule(f.id, 15)} className="px-3 py-2 text-xs text-left text-gray-300 hover:bg-white/10">+ 15 mins</button>
                            <button onClick={() => handleReschedule(f.id, 60)} className="px-3 py-2 text-xs text-left text-gray-300 hover:bg-white/10">+ 1 hour</button>
                            <button onClick={() => handleReschedule(f.id, 1440)} className="px-3 py-2 text-xs text-left text-gray-300 hover:bg-white/10">+ 1 day</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          )
        )}
      </div>
    </div>
  );
}
