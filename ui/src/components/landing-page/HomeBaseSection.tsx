import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Clock, 
  Bot, 
  Megaphone, 
  CheckCircle2, 
  LayoutDashboard,
  PhoneCall,
  RefreshCw,
  Play,
  Pause,
  Zap,
  FileText,
  ChevronDown,
  BarChart3,
  Wrench,
  History
} from 'lucide-react';

interface LeadActivity {
  id: string;
  time: string;
  name: string;
  avatar: string;
  source: string;
  agent: string;
  duration: string;
  qualification: string;
  status: 'Completed' | 'In Progress';
  disposition: 'Appointment Booked' | 'Lead Dispatched' | 'Follow-up Scheduled';
  phone: string;
  summary: string;
  actionTaken: string;
}

const initialActivities: LeadActivity[] = [
  {
    id: '8940',
    time: '14:22 PM',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
    source: 'Inbound SIP Trunk #01',
    agent: 'Commercial HVAC Intake Agent',
    duration: '42.5s',
    qualification: 'Emergency AC Failure Intake',
    status: 'Completed',
    disposition: 'Appointment Booked',
    phone: '+91 98765 43210',
    summary: 'Caller requested emergency technician for commercial AC failure at 440 Industrial Pkwy.',
    actionTaken: 'Google Calendar booking confirmed & SMS dispatched to Tech Mike R.'
  },
  {
    id: '8939',
    time: '13:45 PM',
    name: 'David Miller',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
    source: 'Web Voice Widget',
    agent: 'Inbound Lead Qualifier',
    duration: '68.0s',
    qualification: 'Commercial Maintenance Quote',
    status: 'Completed',
    disposition: 'Lead Dispatched',
    phone: '+91 98765 43211',
    summary: 'Inquired about annual commercial maintenance terms and tier pricing structure.',
    actionTaken: 'Emailed quote PDF to lead & assigned follow-up task to AE Account Exec.'
  },
  {
    id: '8938',
    time: '12:10 PM',
    name: 'Robert Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
    source: 'Direct Toll-Free Main',
    agent: 'Outbound Speed-to-Lead Agent',
    duration: '35.2s',
    qualification: 'Quarterly Inspection Booking',
    status: 'Completed',
    disposition: 'Appointment Booked',
    phone: '+91 98765 43212',
    summary: 'Scheduled quarterly HVAC inspection for retail store location.',
    actionTaken: 'Synced appointment slot with calendar system & logged lead in CRM.'
  }
];

export const HomeBaseSection: React.FC = () => {
  const [activities, setActivities] = useState<LeadActivity[]>(initialActivities);
  const [selectedRowId, setSelectedRowId] = useState<string | null>('8940');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Audio player animation reset
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      setIsPlaying(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  const simulateNewCall = () => {
    const newId = (Math.floor(Math.random() * 9000) + 1000).toString();
    const newLead: LeadActivity = {
      id: newId,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      name: 'Alex Johnson',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
      source: 'Inbound SIP Trunk #01',
      agent: 'Emergency Intake Agent',
      duration: '48.0s',
      qualification: 'Urgent Commercial Intake',
      status: 'Completed',
      disposition: 'Appointment Booked',
      phone: '+91 98765 43213',
      summary: 'Inbound call processed by Talkar Engine. High-intent commercial lead qualified.',
      actionTaken: 'Calendar slot created & instant SMS dispatched to technician.'
    };

    setActivities(prev => [newLead, ...prev]);
    setSelectedRowId(newLead.id);
  };

  return (
    <section className="relative w-full py-20 px-4 md:px-8 bg-[#090A0F] text-zinc-100 border-t border-zinc-800/80 font-sans" id="homebase">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Section Header - Dark Landing Page Theme */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            Talkar Dashboard
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Operational Summary & Call Analytics
          </h2>
          <p className="text-sm md:text-base text-zinc-400 font-normal">
            Talkar Console — real-time KPI metrics, daily volume trends, call history, and automated workflow dispatches.
          </p>
        </div>

        {/* TALKAR OS DASHBOARD SCREENSHOT-STYLE CROPPED MOCKUP */}
        <div className="w-full bg-white border border-slate-200/90 rounded-t-2xl rounded-b-none border-b-0 shadow-2xl overflow-hidden font-sans text-slate-900 grid grid-cols-1 lg:grid-cols-12 max-h-[460px] relative">
          
          {/* TALKAR LIGHT SIDEBAR */}
          <div className="lg:col-span-3 bg-slate-50 border-r border-slate-200 p-5 flex flex-col justify-between hidden md:flex">
            <div className="space-y-5">
              
              {/* Talkar Brand Logo & Workspace */}
              <div className="space-y-3 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#fe6905] flex items-center justify-center text-white shadow-xs">
                      <svg viewBox="128 12 94 74" fill="none" className="w-4 h-4 text-white">
                        <path d="M133.14653,14.92471l84.39741,0.00718l-3.65771,10.74336l-34.2627,-0.01142l-0.00146,10.01591c6.9624,-5.50195 17.95166,-3.3237 23.07715,3.55759c7.88672,10.58987 4.30078,24.5818 -5.50488,32.40026c4.13965,5.82269 8.53857,11.52647 12.6709,17.34316l-14.64844,0.06283l-11.18848,-15.45049c-1.04443,-1.44934 -2.06689,-2.91362 -3.07031,-4.39254c6.19775,-3.76614 13.05762,-8.2656 13.43994,-16.33934c0.47168,-9.99657 -12.62842,-11.39158 -14.55029,-2.11425c-0.55518,2.67958 -0.24023,7.79254 -0.24023,10.71553l-0.00586,21.10959l-12.52734,0.00249c-0.06299,-4.32532 0.0293,-8.65679 0.02637,-12.98986c-2.95166,2.50193 -5.67773,4.01468 -9.57275,4.51908c-5.10059,0.69055 -10.26562,-0.70182 -14.32896,-3.86281c-9.46245,-7.3107 -10.16411,-21.33704 -3.12158,-30.53938c6.37544,-8.33063 18.45981,-10.99102 27.00278,-4.29529c-0.1084,-3.14971 0.00439,-6.54575 -0.03369,-9.75053l-33.85605,-0.00161z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="font-extrabold text-base text-slate-900 tracking-tight">talkar</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live
                  </span>
                </div>

                <div className="w-full bg-white border border-slate-200 hover:bg-slate-100 p-2 rounded-lg flex items-center justify-between text-xs text-slate-700 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                      TK
                    </div>
                    <span className="font-semibold text-slate-900 text-[11px]">Talkar Enterprise</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Navigation Section */}
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow-xs">
                    <LayoutDashboard className="w-4 h-4 text-[#fe6905]" />
                    <span>Overview</span>
                  </div>

                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200/60">
                    <Bot className="w-4 h-4 text-slate-500" />
                    <span>Voice Agents</span>
                  </div>

                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200/60">
                    <Megaphone className="w-4 h-4 text-slate-500" />
                    <span>Campaigns</span>
                  </div>

                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200/60">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    <span>Reports & Analytics</span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1">
                    Operations
                  </div>

                  <div className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-600 font-medium">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Call History</span>
                  </div>

                  <div className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-600 font-medium">
                    <Wrench className="w-4 h-4 text-slate-500" />
                    <span>Tools & Integrations</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Profile Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                  TK
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">hi@yourcompany.in</div>
                </div>
              </div>
            </div>
          </div>

          {/* TALKAR WORKSPACE MAIN PANEL */}
          <div className="lg:col-span-9 p-6 space-y-5 bg-white">
            
            {/* Action Bar Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Overview</h1>
                <p className="text-xs text-slate-500">Real-time operational summary & call analytics</p>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <button 
                  onClick={simulateNewCall}
                  className="px-4 py-2 bg-[#fe6905] hover:bg-[#e25a00] text-white font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-white" />
                  <span>+ Simulate Call</span>
                </button>

                <button 
                  onClick={() => setActivities(initialActivities)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors shadow-2xs cursor-pointer"
                  title="Reset Live Data"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            {/* 4 Full-Proportion KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Calls</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{activities.length + 139}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
                  <Phone className="w-4 h-4" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight text-slate-900">18h</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resolution Rate</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">92.4%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Agents</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">6</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Bot className="w-4 h-4" />
                </div>
              </div>

            </div>

            {/* Recent Call Activity Table Header & Partial Table Rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 tracking-wide">Recent Call Activity</h3>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync Active
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-14">ID</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Agent</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Disposition</th>
                      <th className="py-3 px-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {activities.map((row) => (
                      <React.Fragment key={row.id}>
                        <tr 
                          onClick={() => setSelectedRowId(selectedRowId === row.id ? null : row.id)}
                          className={`cursor-pointer transition-colors ${
                            selectedRowId === row.id ? 'bg-orange-50/60 border-l-4 border-[#fe6905]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3.5 px-3 font-mono text-slate-400 text-xs">#{row.id}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-900 whitespace-nowrap font-medium">{row.phone}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[180px] truncate" title={row.agent}>
                            {row.agent}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">{row.time}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">{row.duration}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              {row.disposition}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right pr-6">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsPlaying(!isPlaying);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Toggle Audio Recording"
                              >
                                {isPlaying && selectedRowId === row.id ? (
                                  <Pause className="w-3.5 h-3.5 text-[#fe6905]" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDABLE RUN DETAILS DRAWER */}
                        {selectedRowId === row.id && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="p-4 border-y border-slate-200">
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#fe6905]" />
                                    <h4 className="text-xs font-bold text-slate-900">
                                      Workflow Execution Trace — Run #{row.id}
                                    </h4>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                                    <div className="text-[10px] font-bold text-[#fe6905] flex items-center gap-1.5">
                                      <FileText className="w-3 h-3" /> AI Call Transcript Summary
                                    </div>
                                    <p className="text-slate-700 leading-relaxed font-normal text-[11px]">{row.summary}</p>
                                  </div>

                                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 space-y-1">
                                    <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Automated Action Executed
                                    </div>
                                    <p className="text-emerald-900 font-semibold leading-relaxed text-[11px]">{row.actionTaken}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Smooth Bottom Screenshot Gradient Fade */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20"></div>

        </div>

      </div>
    </section>
  );
};
