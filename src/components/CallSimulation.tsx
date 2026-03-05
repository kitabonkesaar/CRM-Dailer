import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CallSimulationProps {
  number: string;
  onEnd: (duration: number) => void;
}

export default function CallSimulation({ number, onEnd }: CallSimulationProps) {
  const [duration, setDuration] = useState(0);
  const [lead, setLead] = useState<{ name: string } | null>(null);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-[#111315] flex flex-col items-center justify-between py-12 px-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
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
        
        <p className="text-2xl font-mono text-[#d0bcff] tracking-widest">
          {formatDuration(duration)}
        </p>
      </div>

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

      <button
        onClick={() => onEnd(duration)}
        className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
      >
        <PhoneOff size={32} />
      </button>
    </motion.div>
  );
}
