import React, { useState, useEffect } from 'react';
import { Phone, Plus, X, MessageCircle, Calendar, Search, Filter, ChevronLeft, ChevronRight, Download, Upload, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

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
  agent_name?: string;
}

interface LeadDetail extends Lead {
  calls: any[];
  followups: any[];
}

interface LeadsProps {
  onCall: (number: string) => void;
  currentUser?: { id: number; name: string } | null;
}

export default function Leads({ onCall, currentUser }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', temperature: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', source: '', trip_interested: '' });
  
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [pagination.page, filters]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        status: filters.status,
        temperature: filters.temperature,
        agent_id: currentUser ? currentUser.id.toString() : ''
      });
      
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    }
  };

  const fetchLeadDetails = async (id: number) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/leads/${id}/details`);
      const data = await res.json();
      setSelectedLead(data);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Failed to load lead details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, assigned_agent_id: currentUser?.id }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowAddModal(false);
        setNewLead({ name: '', phone: '', source: '', trip_interested: '' });
        fetchLeads();
        toast.success('Lead added successfully');
      } else {
        // Handle Zod validation errors or generic errors
        const errorMessage = data.error && Array.isArray(data.error) 
          ? data.error.map((e: any) => e.message).join(', ') 
          : data.error || 'Failed to add lead';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const leads = lines.slice(1).map(line => {
        const [name, phone, source, trip] = line.split(',');
        return { name, phone, source, trip_interested: trip, assigned_agent_id: currentUser?.id };
      }).filter(l => l.name && l.phone);

      try {
        const res = await fetch('/api/leads/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Imported ${data.imported} leads`);
          fetchLeads();
        } else {
          toast.error('Import failed');
        }
      } catch (error) {
        toast.error('Error importing leads');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Phone,Source,Trip,Status,Score,Temperature\n"
      + leads.map(l => `${l.name},${l.phone},${l.source},${l.trip_interested},${l.status},${l.ai_score},${l.temperature}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsApp = (lead: Lead) => {
    const message = `Hi ${lead.name}, here are the details for the ${lead.trip_interested} you were interested in.`;
    const url = `https://wa.me/${lead.phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <div className="flex gap-2">
          <label className="bg-[#2d2f31] text-gray-300 p-2 rounded-full hover:bg-[#3d3f41] cursor-pointer transition-colors" title="Import CSV">
            <Upload size={20} />
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="bg-[#2d2f31] text-gray-300 p-2 rounded-full hover:bg-[#3d3f41] transition-colors" title="Export CSV">
            <Download size={20} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#d0bcff] text-[#381e72] p-2 rounded-full shadow-lg hover:bg-[#e8def8] transition-colors"
            title="Add Lead"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              className="w-full bg-[#2d2f31] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#d0bcff] text-sm"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border border-white/10 transition-colors ${showFilters ? 'bg-[#d0bcff] text-[#381e72]' : 'bg-[#2d2f31] text-gray-400'}`}
          >
            <Filter size={20} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-2">
                <select 
                  className="flex-1 bg-[#2d2f31] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  value={filters.status}
                  onChange={e => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up Required">Follow-up</option>
                  <option value="Booked">Booked</option>
                </select>
                <select 
                  className="flex-1 bg-[#2d2f31] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  value={filters.temperature}
                  onChange={e => setFilters({...filters, temperature: e.target.value})}
                >
                  <option value="">All Temps</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-20 no-scrollbar">
        {leads.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">No leads found</div>
        ) : (
          leads.map((lead) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => fetchLeadDetails(lead.id)}
              className="bg-[#2d2f31] p-4 rounded-xl border border-white/5 shadow-sm cursor-pointer hover:border-white/20 transition-colors"
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
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Interested In</p>
                  <p className="text-sm text-gray-300 truncate max-w-[150px]">{lead.trip_interested}</p>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleWhatsApp(lead)}
                    className="p-2 bg-[#25D366]/20 text-[#25D366] rounded-lg hover:bg-[#25D366]/30 transition-colors"
                  >
                    <MessageCircle size={18} />
                  </button>
                  <button
                    onClick={() => onCall(lead.phone)}
                    className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                  >
                    <Phone size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-4 border-t border-white/5 text-sm text-gray-400">
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <div className="flex gap-2">
          <button 
            disabled={pagination.page === 1}
            onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
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
                    type="text" required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.name}
                    onChange={e => setNewLead({...newLead, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel" required
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
                    type="text" required
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={newLead.trip_interested}
                    onChange={e => setNewLead({...newLead, trip_interested: e.target.value})}
                  />
                </div>

                <button type="submit" className="w-full bg-[#d0bcff] text-[#381e72] font-bold py-3 rounded-xl mt-4 hover:bg-[#e8def8] transition-colors">
                  Save Lead
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-[#1a1c1e] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 shadow-2xl h-[90vh] sm:h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedLead.name}</h2>
                  <p className="text-gray-400">{selectedLead.phone}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{selectedLead.status}</span>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{selectedLead.source}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => onCall(selectedLead.phone)} className="bg-green-600/20 text-green-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600/30">
                    <Phone size={20} /> Call
                  </button>
                  <button onClick={() => handleWhatsApp(selectedLead)} className="bg-[#25D366]/20 text-[#25D366] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#25D366]/30">
                    <MessageCircle size={20} /> WhatsApp
                  </button>
                </div>

                {/* History */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} /> History
                  </h3>
                  
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-white/10">
                    {selectedLead.calls.map((call, idx) => (
                      <div key={call.id} className="pl-10 relative">
                        <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-[#2d2f31] border-2 border-[#d0bcff] z-10"></div>
                        <div className="bg-[#2d2f31] p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-white">{call.outcome}</span>
                            <span className="text-xs text-gray-500">{new Date(call.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">
                            {call.type} • {Math.floor(call.duration / 60)}m {call.duration % 60}s • by {call.agent_name || 'Unknown'}
                          </p>
                          {call.notes && (
                            <div className="bg-black/20 p-2 rounded text-sm text-gray-300 italic">
                              "{call.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedLead.calls.length === 0 && (
                      <p className="pl-10 text-gray-500 text-sm">No call history yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
