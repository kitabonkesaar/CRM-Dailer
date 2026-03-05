import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle, Clock, MessageCircle, Calendar, MoreVertical, Timer } from 'lucide-react';
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

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-6">Follow-ups</h1>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
        {followups.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
            <p>No pending follow-ups</p>
          </div>
        ) : (
          followups.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#2d2f31] p-4 rounded-xl border border-white/5 relative overflow-visible"
            >
              <div className="absolute top-0 right-0 p-2 bg-[#d0bcff]/10 rounded-bl-xl rounded-tr-xl">
                <span className="text-xs font-bold text-[#d0bcff] flex items-center gap-1">
                  <Clock size={12} />
                  {formatTime(f.scheduled_at)}
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
        )}
      </div>
    </div>
  );
}
