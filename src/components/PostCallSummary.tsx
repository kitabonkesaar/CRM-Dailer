import React, { useState, useEffect } from 'react';
import { Save, X, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface PostCallSummaryProps {
  number: string;
  duration: number;
  onComplete: () => void;
}

export default function PostCallSummary({ number, duration, onComplete }: PostCallSummaryProps) {
  const [outcome, setOutcome] = useState('Interested');
  const [notes, setNotes] = useState('');
  const [lead, setLead] = useState<{ id: number; name: string; trip_interested?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/leads/${number}`)
      .then(res => res.json())
      .then(data => setLead(data))
      .catch(() => {});
  }, [number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead?.id,
          phone: number,
          type: 'outgoing',
          duration,
          outcome,
          notes,
          tags: 'Manual',
        }),
      });
      onComplete();
    } catch (error) {
      console.error('Error logging call:', error);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hi ${lead?.name || 'there'}, here are the details for the ${lead?.trip_interested || 'trip'} you were interested in.`;
    const url = `https://wa.me/${number.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-[#1a1c1e] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-white/10 shadow-2xl h-[85vh] sm:h-auto overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Call Summary</h2>
          <button onClick={onComplete} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="bg-[#2d2f31] p-4 rounded-xl mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{lead?.name || 'New Lead'}</h3>
            <p className="text-sm text-gray-400">{number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase">Duration</p>
            <p className="text-xl font-mono text-[#d0bcff]">
              {Math.floor(duration / 60)}m {duration % 60}s
            </p>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={handleWhatsApp}
            className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl shadow-lg hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} />
            Send Trip Details via WhatsApp
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Outcome</label>
            <div className="grid grid-cols-2 gap-3">
              {['Interested', 'Not Interested', 'No Answer', 'Busy', 'Follow-up', 'Booked', 'Not a Lead'].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    outcome === o
                      ? o === 'Not a Lead'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                        : 'bg-[#d0bcff] text-[#381e72] shadow-lg'
                      : o === 'Not a Lead'
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                        : 'bg-[#2d2f31] text-gray-300 hover:bg-[#3d3f41]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              className="w-full bg-[#2d2f31] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#d0bcff] min-h-[120px]"
              placeholder="Add call notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Log
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
