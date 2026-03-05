import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Phone, Settings, LogOut, Download, Search, Edit, Trash2, UserPlus, Save, X, Activity, Calendar, CheckSquare, Square, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

interface AdminLayoutProps {
  onLogout: () => void;
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);
  const [callsOverTime, setCallsOverTime] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'Agent' });
  const [searchTerm, setSearchTerm] = useState('');
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  
  // Date Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Actions
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState('');

  // Settings
  const [adminProfile, setAdminProfile] = useState({ name: 'Admin User', email: 'admin@example.com' });

  useEffect(() => {
    fetchStats();
    fetchAgents();
    fetchLeads();
    fetchLeaderboard();
    fetchTopAgents();
    fetchCallsOverTime();
    fetchAuditLogs();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    let url = '/api/admin/stats';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await fetch(url);
    setStats(await res.json());
  };

  const fetchAgents = async () => {
    const res = await fetch('/api/admin/agents');
    setAgents(await res.json());
  };

  const fetchLeads = async () => {
    const res = await fetch('/api/leads?limit=1000'); // Fetch all for admin
    const data = await res.json();
    setLeads(data.data || []);
  };

  const fetchLeaderboard = async () => {
    const res = await fetch('/api/admin/leaderboard');
    setLeaderboard(await res.json());
  };

  const fetchTopAgents = async () => {
    let url = '/api/admin/top-agents';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await fetch(url);
    setTopAgents(await res.json());
  };

  const fetchCallsOverTime = async () => {
    const res = await fetch('/api/admin/calls-over-time');
    setCallsOverTime(await res.json());
  };

  const fetchAuditLogs = async () => {
    const res = await fetch('/api/admin/audit-logs');
    setAuditLogs(await res.json());
  };

  const handleExportCSV = () => {
    alert("Exporting Call Logs to CSV...");
    window.open('/api/call-logs', '_blank');
  };

  const handleDeleteLead = async (id: number) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      fetchLeads();
      fetchAuditLogs();
      toast.success('Lead deleted');
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    await fetch(`/api/leads/${editingLead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingLead),
    });
    setEditingLead(null);
    fetchLeads();
    fetchAuditLogs();
    toast.success('Lead updated');
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      if (res.ok) {
        setShowAddAgent(false);
        setNewAgent({ name: '', email: '', role: 'Agent' });
        fetchAgents();
        fetchAuditLogs();
        toast.success('Agent added');
      }
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    await fetch(`/api/admin/agents/${editingAgent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingAgent),
    });
    setEditingAgent(null);
    fetchAgents();
    fetchAuditLogs();
    toast.success('Agent updated');
  };

  const handleDeleteAgent = async (id: number) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await fetch(`/api/admin/agents/${id}`, { method: 'DELETE' });
      fetchAgents();
      fetchAuditLogs();
      toast.success('Agent deleted');
    }
  };

  const toggleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(l => l !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAgentId || selectedLeads.length === 0) return;
    
    try {
      await Promise.all(selectedLeads.map(id => 
        fetch(`/api/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_agent_id: parseInt(bulkAgentId) })
        })
      ));
      fetchLeads();
      fetchAuditLogs();
      setSelectedLeads([]);
      setBulkAgentId('');
      toast.success(`Assigned ${selectedLeads.length} leads`);
    } catch (error) {
      console.error('Bulk assign error:', error);
      toast.error('Failed to assign leads');
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(agentSearchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#111315] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1c1e] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
          <p className="text-xs text-gray-500">AI Sales Dialer</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'leads', label: 'Lead Manager', icon: Users },
            { id: 'agents', label: 'Agents', icon: Phone },
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#d0bcff] text-[#381e72] font-medium' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Overview</h2>
              <div className="flex gap-4">
                <input 
                  type="date" 
                  className="bg-[#2d2f31] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#d0bcff]"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <input 
                  type="date" 
                  className="bg-[#2d2f31] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#d0bcff]"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Total Calls</p>
                <p className="text-4xl font-bold">{stats.totalCalls}</p>
              </div>
              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Active Agents</p>
                <p className="text-4xl font-bold">{stats.activeAgents}</p>
              </div>
              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Total Leads</p>
                <p className="text-4xl font-bold">{stats.totalLeads}</p>
              </div>
              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <p className="text-gray-400 text-sm mb-1">Conversion Rate</p>
                <p className="text-4xl font-bold text-green-400">{stats.conversionRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold mb-4">Calls Over Time</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={callsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1c1e', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#d0bcff' }}
                        cursor={{ stroke: '#ffffff20' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#d0bcff" strokeWidth={3} dot={{ fill: '#d0bcff', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Monthly Conversions</h3>
                  <button onClick={handleExportCSV} className="flex items-center gap-2 text-[#d0bcff] hover:text-white transition-colors text-sm">
                    <Download size={16} />
                    Export Logs
                  </button>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topAgents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1c1e', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#d0bcff' }}
                        cursor={{ fill: '#ffffff05' }}
                      />
                      <Bar dataKey="conversions" radius={[4, 4, 0, 0]}>
                        {topAgents.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#d0bcff' : '#4f378b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5">
              <h3 className="text-xl font-bold mb-4">Top Performers</h3>
              <div className="space-y-4">
                {leaderboard.slice(0, 3).map((agent, index) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#d0bcff] text-[#381e72] flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-400">{agent.total_calls} Calls</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">{agent.conversions}</p>
                      <p className="text-xs text-gray-500">Sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'leads' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Lead Manager</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  className="bg-[#2d2f31] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#d0bcff] w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
              {selectedLeads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[#d0bcff] text-[#381e72] p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg"
                >
                  <span className="font-bold">{selectedLeads.length} leads selected</span>
                  <div className="flex gap-4">
                    <select 
                      className="bg-white/20 border-none rounded-lg px-3 py-2 text-[#381e72] font-medium focus:outline-none cursor-pointer"
                      value={bulkAgentId}
                      onChange={e => setBulkAgentId(e.target.value)}
                    >
                      <option value="">Assign to Agent...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleBulkAssign}
                      disabled={!bulkAgentId}
                      className="bg-[#381e72] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#4f378b] disabled:opacity-50 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#2d2f31] rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-gray-400 text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-10">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                        {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className={`hover:bg-white/5 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-white/5' : ''}`}>
                      <td className="p-4">
                        <button onClick={() => toggleSelectLead(lead.id)} className={`text-gray-400 hover:text-white ${selectedLeads.includes(lead.id) ? 'text-[#d0bcff]' : ''}`}>
                          {selectedLeads.includes(lead.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </td>
                      <td className="p-4 font-medium">{lead.name}</td>
                      <td className="p-4 text-gray-400">{lead.phone}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          lead.temperature === 'Hot' ? 'bg-red-500/20 text-red-300' :
                          lead.temperature === 'Warm' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {lead.ai_score}
                        </span>
                      </td>
                      <td className="p-4">{lead.status}</td>
                      <td className="p-4 text-gray-400">{lead.agent_name || 'Unassigned'}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingLead(lead)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteLead(lead.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'agents' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Employee Management</h2>
              <button 
                onClick={() => setShowAddAgent(true)}
                className="bg-[#d0bcff] text-[#381e72] px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#e8def8] transition-colors"
              >
                <UserPlus size={20} />
                Add Agent
              </button>
            </div>

            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Search agents..." 
                className="bg-[#2d2f31] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#d0bcff] w-64"
                value={agentSearchTerm}
                onChange={e => setAgentSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5 relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => setEditingAgent(agent)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-blue-300">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteAgent(agent.id)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d0bcff] to-[#381e72] flex items-center justify-center text-2xl font-bold text-white">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{agent.name}</h3>
                      <p className="text-sm text-gray-400">{agent.role}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Email</p>
                      <p className="text-sm truncate" title={agent.email}>{agent.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Joined</p>
                      <p className="text-sm">{new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-bold mb-8">Detailed Analytics</h2>
            
            <div className="bg-[#2d2f31] p-6 rounded-2xl border border-white/5 mb-8">
              <h3 className="text-xl font-bold mb-6">Agent Performance Leaderboard</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/20 text-gray-400 text-sm uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Agent</th>
                      <th className="p-4">Total Calls</th>
                      <th className="p-4">Talk Time</th>
                      <th className="p-4">Conversions</th>
                      <th className="p-4">Avg. Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaderboard.map((agent, index) => (
                      <tr key={agent.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-[#d0bcff]">#{index + 1}</td>
                        <td className="p-4 font-medium">{agent.name}</td>
                        <td className="p-4">{agent.total_calls}</td>
                        <td className="p-4">{Math.floor(agent.total_duration / 60)}m {agent.total_duration % 60}s</td>
                        <td className="p-4 text-green-400 font-bold">{agent.conversions}</td>
                        <td className="p-4 text-gray-400">
                          {agent.total_calls > 0 
                            ? `${Math.floor(agent.total_duration / agent.total_calls)}s` 
                            : '0s'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-bold mb-8">Audit Logs</h2>
            
            <div className="bg-[#2d2f31] rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-gray-400 text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-gray-400 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          log.action === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                          log.action === 'CREATE' ? 'bg-green-500/20 text-green-300' :
                          log.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-mono">{log.entity_type} #{log.entity_id}</td>
                      <td className="p-4 text-sm text-gray-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-bold mb-8">Settings</h2>
            
            <div className="bg-[#2d2f31] p-8 rounded-2xl border border-white/5 max-w-2xl">
              <h3 className="text-xl font-bold mb-6">Admin Profile</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#1a1c1e] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={adminProfile.name}
                    onChange={e => setAdminProfile({...adminProfile, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-[#1a1c1e] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#d0bcff]"
                    value={adminProfile.email}
                    onChange={e => setAdminProfile({...adminProfile, email: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => toast.success('Profile updated')}
                  className="bg-[#d0bcff] text-[#381e72] font-bold px-6 py-3 rounded-xl hover:bg-[#e8def8] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Edit Lead Modal */}
      <AnimatePresence>
        {editingLead && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1a1c1e] w-full max-w-lg rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Edit Lead</h2>
                <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleUpdateLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    <input className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" value={editingLead.name} onChange={e => setEditingLead({...editingLead, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Phone</label>
                    <input className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" value={editingLead.phone} onChange={e => setEditingLead({...editingLead, phone: e.target.value})} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" value={editingLead.status} onChange={e => setEditingLead({...editingLead, status: e.target.value})}>
                    <option>New</option>
                    <option>Interested</option>
                    <option>Follow-up Required</option>
                    <option>Booked</option>
                    <option>Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Assigned Agent</label>
                  <select className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" value={editingLead.assigned_agent_id || ''} onChange={e => setEditingLead({...editingLead, assigned_agent_id: e.target.value})}>
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="w-full bg-[#d0bcff] text-[#381e72] font-bold py-3 rounded-xl mt-4">
                  Save Changes
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Agent Modal */}
      <AnimatePresence>
        {(showAddAgent || editingAgent) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1a1c1e] w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
                <button onClick={() => { setShowAddAgent(false); setEditingAgent(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              
              <form onSubmit={editingAgent ? handleUpdateAgent : handleAddAgent} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input 
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" 
                    value={editingAgent ? editingAgent.name : newAgent.name} 
                    onChange={e => editingAgent ? setEditingAgent({...editingAgent, name: e.target.value}) : setNewAgent({...newAgent, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" 
                    value={editingAgent ? editingAgent.email : newAgent.email} 
                    onChange={e => editingAgent ? setEditingAgent({...editingAgent, email: e.target.value}) : setNewAgent({...newAgent, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Role</label>
                  <select 
                    className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" 
                    value={editingAgent ? editingAgent.role : newAgent.role} 
                    onChange={e => editingAgent ? setEditingAgent({...editingAgent, role: e.target.value}) : setNewAgent({...newAgent, role: e.target.value})}
                  >
                    <option value="Agent">Agent</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                {editingAgent && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select 
                      className="w-full bg-[#2d2f31] border border-white/10 rounded-lg p-3" 
                      value={editingAgent.status} 
                      onChange={e => setEditingAgent({...editingAgent, status: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}

                <button type="submit" className="w-full bg-[#d0bcff] text-[#381e72] font-bold py-3 rounded-xl mt-4">
                  {editingAgent ? 'Update Agent' : 'Add Agent'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
