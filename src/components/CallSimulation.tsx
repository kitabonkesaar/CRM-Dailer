import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, Volume2, FileText, Grip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallSimulationProps {
  number: string;
  onEnd: (duration: number) => void;
}

export default function CallSimulation({ number, onEnd }: CallSimulationProps) {
  const [duration, setDuration] = useState(0);
  const [lead, setLead] = useState<{ name: string; trip_interested?: string } | null>(null);
  const [activeView, setActiveView] = useState<'controls' | 'script'>('controls');

  useEffect(() => {
    // Fetch lead info if available
    fetch(`/api/leads/${number}`)
      .then(res => res.json())
      .then(data => setLead(data))
      .catch(() => {}); // Ignore error

    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [number]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getScript = () => {
    const trip = lead?.trip_interested || 'our packages';
    return (
      <div className="space-y-4 text-left">
        <div>
          <h4 className="text-[#d0bcff] text-xs uppercase font-bold mb-1">Introduction</h4>
          <p className="text-sm text-gray-300">
            "Hi, am I speaking with <span className="text-white font-bold">{lead?.name || 'the customer'}</span>? This is [Name] from TravelCo. I saw you were interested in our <span className="text-white font-bold">{trip}</span>."
          </p>
        </div>
        <div>
          <h4 className="text-[#d0bcff] text-xs uppercase font-bold mb-1">Value Prop</h4>
          <p className="text-sm text-gray-300">
            "We currently have a special offer for that destination including [Benefit 1] and [Benefit 2]. Is this something you're still planning?"
          </p>
        </div>
        <div>
          <h4 className="text-[#d0bcff] text-xs uppercase font-bold mb-1">Closing</h4>
          <p className="text-sm text-gray-300">
            "Great! I can send you the full itinerary via WhatsApp right now. Does that work for you?"
          </p>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-[#111315] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveView('controls')}
            className={`p-2 rounded-full transition-colors ${activeView === 'controls' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
          >
            <Grip size={20} />
          </button>
          <button 
            onClick={() => setActiveView('script')}
            className={`p-2 rounded-full transition-colors ${activeView === 'script' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
          >
            <FileText size={20} />
          </button>
        </div>
        <div className="text-gray-500 font-mono">{formatDuration(duration)}</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeView === 'controls' ? (
            <motion.div 
              key="controls"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full"
            >
              <div className="w-32 h-32 rounded-full bg-[#2d2f31] mb-6 flex items-center justify-center border-4 border-[#2d2f31] shadow-2xl relative">
                <div className="absolute inset-0 rounded-full border-4 border-[#d0bcff]/20 animate-ping"></div>
                <span className="text-4xl font-bold text-white">
                  {lead?.name ? lead.name.charAt(0) : '#'}
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2 text-center">
                {lead?.name || 'Unknown Caller'}
              </h2>
              <p className="text-xl text-gray-400 mb-8">{number}</p>

              <div className="w-full max-w-xs grid grid-cols-2 gap-6 mb-12">
                <button className="aspect-square rounded-full bg-[#2d2f31] flex flex-col items-center justify-center gap-2 text-white hover:bg-[#3d3f41] transition-colors">
                  <Mic size={24} />
                  <span className="text-xs">Mute</span>
                </button>
                <button className="aspect-square rounded-full bg-[#2d2f31] flex flex-col items-center justify-center gap-2 text-white hover:bg-[#3d3f41] transition-colors">
                  <Volume2 size={24} />
                  <span className="text-xs">Speaker</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="script"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md bg-[#2d2f31] p-6 rounded-2xl border border-white/5"
            >
              <h3 className="text-xl font-bold text-white mb-4">Call Script</h3>
              {getScript()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-8 flex justify-center">
        <button
          onClick={() => onEnd(duration)}
          className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
        >
          <PhoneOff size={32} />
        </button>
      </div>
    </motion.div>
  );
}
