import React, { useState, useEffect } from 'react';
import { Phone, Plus, X, MessageCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Lead {
  id: number;
  name: string;
  phone: string;
  source: string;
  trip_interested: string;
  status: string;
  ai_score: number;
  temperature: string;
  next_followup?: string;
}

interface LeadsProps {
  onCall: (number: string) => void;
}

export default function Leads({ onCall }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', source: '', trip_interested: '' });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewLead({ name: '', phone: '', source: '', trip_interested: '' });
        fetchLeads();
      }
    } catch (error) {
      console.error('Error adding lead:', error);
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    const message = `Hi ${lead.name}, here are the details for the ${lead.trip_interested} you were interested in.`;
    const url = `https://wa.me/${lead.phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#d0bcff] text-[#381e72] p-2 rounded-full shadow-lg hover:bg-[#e8def8] transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
        {leads.map((lead) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2d2f31] p-4 rounded-xl border border-white/5 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">{lead.name}</h3>
                <p className="text-sm text-gray-400">{lead.phone}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                lead.temperature === 'Hot' ? 'bg-red-500/20 text-red-300' :
                lead.temperature === 'Warm' ? 'bg-orange-500/20 text-orange-300' :
                'bg-blue-500/20 text-blue-300'
              }`}>
                {lead.temperature} ({lead.ai_score})
              </div>
            </div>
            
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Interested In</p>
              <p className="text-sm text-gray-300">{lead.trip_interested}</p>
            </div>

            {lead.next_followup && (
              <div className="mb-3 flex items-center gap-2 text-yellow-500/80 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/20">
                <Calendar size={14} />
                <span className="text-xs font-medium">
                  Next Follow-up: {new Date(lead.next_followup).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 gap-2">
              <span className="text-xs text-gray-500 flex-1">{lead.source}</span>
              <button
                onClick={() => handleWhatsApp(lead)}
                className="bg-[#25D366]/20 text-[#25D366] p-2 rounded-lg hover:bg-[#25D366]/30 transition-colors"
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={() => onCall(lead.phone)}
                className="flex items-center gap-2 bg-green-600/20 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-600/30 transition-colors text-sm font-medium"
              >
                <Phone size={14} />
                Call Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1c1e] w-full max-w-sm rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Lead</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.name}
                    onChange={e => setNewLead({...newLead, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.phone}
                    onChange={e => setNewLead({...newLead, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Source</label>
                  <select
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.source}
                    onChange={e => setNewLead({...newLead, source: e.target.value})}
                  >
                    <option value="">Select Source</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Interested In</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.trip_interested}
                    onChange={e => setNewLead({...newLead, trip_interested: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#d0bcff] text-[#381e72] font-bold py-3 rounded-xl mt-4 hover:bg-[#e8def8] transition-colors"
                >
                  Save Lead
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
