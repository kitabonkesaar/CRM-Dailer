import React, { useEffect, useState } from 'react';
import { Bell, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Followup {
  id: number;
  lead_name: string;
  lead_phone: string;
  scheduled_at: string;
}

export default function FollowupAlert({ onCall }: { onCall: (number: string) => void }) {
  const [alertedIds, setAlertedIds] = useState<Set<number>>(new Set());

  const playSound = () => {
    // Simple beep using Web Audio API
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    const checkFollowups = async () => {
      try {
        const res = await fetch('/api/followups');
        const data: Followup[] = await res.json();
        const now = new Date();
        
        const due = data.filter(f => {
          const scheduled = new Date(f.scheduled_at);
          const diff = scheduled.getTime() - now.getTime();
          
          // Check if due within the next 5 minutes (0 to 5 mins in future)
          // Or slightly past due (up to 1 min ago)
          return diff <= 5 * 60 * 1000 && diff >= -60000 && !alertedIds.has(f.id);
        });

        if (due.length > 0) {
          due.forEach(f => {
             playSound();
             toast.custom((t) => (
               <div className="bg-[#2d2f31] border border-red-500/50 rounded-xl shadow-2xl p-4 w-80 flex flex-col gap-3">
                 <div className="flex items-center gap-2 text-red-400">
                   <Bell className="animate-bounce" size={20} />
                   <span className="font-bold">Follow-up Due Soon!</span>
                 </div>
                 <div>
                   <h3 className="text-white font-semibold">{f.lead_name}</h3>
                   <p className="text-gray-400 text-sm">{f.lead_phone}</p>
                   <p className="text-xs text-gray-500 mt-1">
                     Scheduled: {new Date(f.scheduled_at).toLocaleTimeString()}
                   </p>
                 </div>
                 <button
                   onClick={() => {
                     onCall(f.lead_phone);
                     toast.dismiss(t);
                   }}
                   className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                 >
                   <Phone size={16} />
                   Call Now
                 </button>
               </div>
             ), { duration: 10000 });
          });

          setAlertedIds(prev => {
            const next = new Set(prev);
            due.forEach(d => next.add(d.id));
            return next;
          });
        }
      } catch (error) {
        console.error('Error checking followups:', error);
      }
    };

    const interval = setInterval(checkFollowups, 10000); // Check every 10 seconds
    checkFollowups(); // Initial check

    return () => clearInterval(interval);
  }, [alertedIds, onCall]);

  return null; // No visual component needed, handled by Toaster
}
