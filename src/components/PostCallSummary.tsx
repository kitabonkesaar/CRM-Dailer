import React, { useState, useEffect } from 'react';
import { Save, Calendar, DollarSign, XCircle, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PostCallSummaryProps {
  number: string;
  duration: number;
  onComplete: () => void;
  currentUser?: { id: number; name: string } | null;
}

export default function PostCallSummary({ number, duration, onComplete, currentUser }: PostCallSummaryProps) {
  const [outcome, setOutcome] = useState('Interested');
  const [notes, setNotes] = useState('');
  const [lead, setLead] = useState<{ id: number; name: string; trip_interested?: string } | null>(null);
  
  // Disposition Fields
  const [followupDate, setFollowupDate] = useState('');
  const [bookingValue, setBookingValue] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetch(`/api/leads/${number}`)
      .then(res => res.json())
      .then(data => setLead(data))
      .catch(() => {});
  }, [number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Log the call
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
          agent_id: currentUser?.id || 1,
        }),
      });

      // 2. Handle Disposition Logic
      if (outcome === 'Interested' && followupDate && lead?.id) {
        await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            scheduled_at: new Date(followupDate).toISOString(),
            notes: `Follow-up set after call. Notes: ${notes}`,
            agent_id: currentUser?.id
          }),
        });
      } else if (outcome === 'Booked' && lead?.id) {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Booked' })
        });
      } else if (outcome === 'Not Interested' && lead?.id) {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Lost', notes: `Reason: ${rejectionReason}` })
        });
      }

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
              {['Interested', 'Not Interested', 'No Answer', 'Busy', 'Follow-up', 'Booked'].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    outcome === o
                      ? 'bg-[#d0bcff] text-[#381e72] shadow-lg'
                      : 'bg-[#2d2f31] text-gray-300 hover:bg-[#3d3f41]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields based on Outcome */}
          <AnimatePresence>
            {(outcome === 'Interested' || outcome === 'Follow-up') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <label className="block text-sm text-gray-400 mb-1">Next Follow-up</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="datetime-local"
                    required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={followupDate}
                    onChange={e => setFollowupDate(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {outcome === 'Booked' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <label className="block text-sm text-gray-400 mb-1">Booking Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={bookingValue}
                    onChange={e => setBookingValue(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {outcome === 'Not Interested' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <select
                  className="w-full bg-[#2d2f31] border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#d0bcff]"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                >
                  <option value="">Select Reason</option>
                  <option value="Too Expensive">Too Expensive</option>
                  <option value="Not Interested in Destination">Not Interested in Destination</option>
                  <option value="Already Booked">Already Booked</option>
                  <option value="Bad Timing">Bad Timing</option>
                  <option value="Other">Other</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

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
