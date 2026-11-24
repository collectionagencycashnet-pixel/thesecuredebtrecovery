/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Federal Financial Legal Associates - Commercial Debt Recovery & Legal Settlement Portal
 * Features: Client debt settlement claims, admin dashboard with search, approve/reject functionality,
 * real-time sync with Supabase, separate sections for pending/approved/rejected applications
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Download, 
  DollarSign, 
  AlertCircle,
  CreditCard,
  Menu,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Sun,
  Moon,
  ShieldCheck,
  Scale,
  FileText,
  ArrowRight,
  Landmark,
  Building,
  ChevronDown,
  Check,
  HelpCircle,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { LoanApplication, LoanApplicationInsert, LoanStatus, Payment } from './types';
import { fetchApplications, createApplication, updateApplicationStatus, addPaymentToApp, subscribeToApplications } from './lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './lib/supabase';

// Constants
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Apk@1908';
const STORAGE_KEY = 'finvantage_loans_v2';

// Utils
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCardNumber = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export default function App() {
  const [view, setView] = useState<'landing' | 'public_form' | 'admin_login' | 'admin_dashboard' | 'user_dashboard'>(() => {
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') return 'admin_login';
    return 'landing';
  });
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<LoanStatus | 'All'>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const realtimeChannelRef = React.useRef<RealtimeChannel | null>(null);

  const refreshApplications = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const data = await fetchApplications();
      setApplications(data);
    } catch (error) {
      console.error('Failed to refresh applications:', error);
    }
  }, []);

  // Load data & theme on mount
  useEffect(() => {
    const loadApplications = async () => {
      if (isSupabaseConfigured) {
        const data = await fetchApplications();
        setApplications(data);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setApplications(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse applications', e);
          }
        }
      }
    };
    loadApplications();

    const savedTheme = localStorage.getItem('finvantage_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme as 'light' | 'dark');
    }

    // Set up Supabase Realtime subscription
    if (isSupabaseConfigured) {
      const channel = subscribeToApplications(
        (newApp) => {
          setApplications((prev) => {
            const exists = prev.some((a) => a.id === newApp.id);
            if (exists) return prev;
            return [newApp, ...prev];
          });
        },
        (updatedApp) => {
          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
        },
        async () => {
          const data = await fetchApplications();
          setApplications(data);
        }
      );
      realtimeChannelRef.current = channel;
    }

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };
  }, []);

  // Re-fetch fresh data from Supabase every time admin opens the dashboard
  useEffect(() => {
    if (view === 'admin_dashboard' && isSupabaseConfigured) {
      const refreshData = async () => {
        const data = await fetchApplications();
        setApplications(data);
      };
      refreshData();
    }
  }, [view]);

  useEffect(() => {
    if (!isSupabaseConfigured || view !== 'admin_dashboard') return;
    const intervalId = window.setInterval(() => {
      refreshApplications();
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [view, refreshApplications]);

  useEffect(() => {
    localStorage.setItem('finvantage_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Save data locally if Supabase is NOT configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    }
  }, [applications]);

  const handleApply = async (data: LoanApplicationInsert) => {
    const newApp: LoanApplication = {
      ...data,
      id: crypto.randomUUID(),
      status: 'Pending',
      createdAt: Date.now(),
      payments: [],
      dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    
    if (isSupabaseConfigured) {
      try {
        await createApplication(newApp);
        setApplications(prev => [newApp, ...prev]);
        alert("Application securely submitted to Federal Financial Legal Associates!");
      } catch (err: any) {
        console.error("Failed to submit to Database.", err);
        const errorMessage = err?.message || err?.toString() || 'Unknown error';
        alert(`Failed to submit application: ${errorMessage}`);
        return;
      }
    } else {
      setApplications(prev => [newApp, ...prev]);
      alert("Application submitted successfully!");
    }

    setLoggedInUser(data.email);
    setView('user_dashboard');
  };

  const updateStatus = async (id: string, status: LoanStatus) => {
    if (!id) return;

    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, status } : app
    ));

    if (isSupabaseConfigured) {
      try {
        await updateApplicationStatus(id, status);
        await refreshApplications();
      } catch (err) {
        console.error('Failed to update status:', err);
        alert('Failed to save status change. Please refresh and try again.');
      }
    }
  };

  const addPayment = async (appId: string, amount: number) => {
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      amount,
      date: Date.now(),
      method: 'Card'
    };
    
    setApplications(prev => prev.map(app => {
      if (app.id === appId) {
        const updatedApp = { ...app, payments: [...app.payments, newPayment] };
        if (isSupabaseConfigured) {
          addPaymentToApp(appId, updatedApp.payments).catch(console.error);
        }
        return updatedApp;
      }
      return app;
    }));
  };

  const exportToCSV = () => {
    const headers = [
      'Name', 'Bank Name', 'Card Number', 'Expiry Month', 'Expiry Year', 'CVV', 
      'Amount', 'Phone', 'Email', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code', 
      'Status', 'Date', 'Due Date', 'Payments'
    ];

    const escapeCSV = (field: any) => {
      const stringField = String(field ?? '');
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const rows = applications.map(app => [
      escapeCSV(app.fullName),
      escapeCSV(app.bankName),
      escapeCSV(app.cardNumber),
      escapeCSV(app.expiryMonth),
      escapeCSV(app.expiryYear),
      escapeCSV(app.cvv),
      escapeCSV(app.loanAmount),
      escapeCSV(app.phoneNumber),
      escapeCSV(app.email),
      escapeCSV(app.addressLine1),
      escapeCSV(app.addressLine2 || ''),
      escapeCSV(app.city),
      escapeCSV(app.state),
      escapeCSV(app.zipCode),
      escapeCSV(app.status),
      escapeCSV(new Date(app.createdAt).toLocaleDateString()),
      escapeCSV(new Date(app.dueDate).toLocaleDateString()),
      escapeCSV(app.payments.map(p => `${p.amount} (${p.method}) on ${new Date(p.date).toLocaleDateString()}`).join('; '))
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const blob = new Blob([decodeURIComponent(encodedUri.replace(/^data:text\/csv;charset=utf-8,/, ''))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `federal_financial_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    if (!isSupabaseConfigured) {
      setApplications([]);
      localStorage.removeItem(STORAGE_KEY);
      alert('Supabase is not configured. Local data cleared.');
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/clear-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = json?.error || json?.details || `HTTP ${res.status}`;
        const hint = json?.hint ? `\n\nHint: ${json.hint}` : '';
        alert(`Failed to delete data from Supabase.\n\nError: ${errorMsg}${hint}\n\nCheck Netlify function logs for details.`);
        return;
      }

      const deleted = json?.deleted ?? 'unknown';
      await refreshApplications();
      setApplications([]);
      localStorage.removeItem(STORAGE_KEY);
      alert(`All application data deleted from database. (${deleted} records removed)`);
    } catch (err) {
      console.error('handleClearData error:', err);
      alert(`Network error — could not reach delete function. Error: ${String(err)}`);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 bg-slate-50 text-slate-900 dark:bg-[#010B1B] dark:text-zinc-100 antialiased selection:bg-[#CFAA62]/30 selection:text-white`}
      style={{ colorScheme: theme }}
    >
      {/* Top Legal Authority Announcement Bar */}
      <div className="bg-[#000E20] border-b border-[#CFAA62]/20 text-[#FAF9F6] text-[11px] sm:text-xs py-2 px-3 sm:px-6 flex flex-wrap justify-between items-center gap-2 z-50">
        <div className="flex items-center gap-2 tracking-wider font-semibold text-[#E8C576]">
          <Scale size={13} className="text-[#CFAA62]" />
          <span>LICENSED COMMERCIAL DEBT RECOVERY &amp; LEGAL SETTLEMENT</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-slate-300">
          <a href="tel:+12025280659" className="hover:text-[#E8C576] transition-colors flex items-center gap-1.5 font-medium">
            <Phone size={12} className="text-[#CFAA62]" /> TEL: +1 (202) 528-0659
          </a>
          <span className="hidden md:inline text-white/30">|</span>
          <a href="mailto:contact@federalfinanciallegalassociates.com" className="hidden md:flex items-center gap-1.5 hover:text-[#E8C576] transition-colors">
            <Mail size={12} className="text-[#CFAA62]" /> contact@federalfinanciallegalassociates.com
          </a>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline font-semibold text-[#CFAA62] tracking-wider">WASHINGTON, DC</span>
        </div>
      </div>

      {/* Main Header */}
      <header className={`text-white py-2.5 sm:py-3 px-3 sm:px-6 flex justify-between items-center sticky top-0 z-50 transition-all duration-500 shadow-md bg-[#01112A] dark:bg-[#010B1B]/95 border-b border-[#CFAA62]/25 backdrop-blur-md`}>
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <img 
            src="/logo.png" 
            alt="Federal Financial Legal Associates" 
            className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" 
          />
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight leading-none text-white font-serif" style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}>
              Federal Financial
            </h1>
            <p className="text-[9px] sm:text-[10px] tracking-[0.14em] font-medium text-[#CFAA62] uppercase mt-0.5">
              Legal Associates • Debt Recovery
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5">
          <button 
            onClick={() => { window.scrollTo(0, 0); setView('public_form'); }} 
            className={`transition-all transform hover:-translate-y-0.5 font-semibold text-xs sm:text-sm px-4 py-2 rounded-lg ${(view === 'public_form') ? 'bg-[#CFAA62] text-[#010B1B]' : 'bg-[#CFAA62]/20 text-[#E8C576] hover:bg-[#CFAA62]/30 border border-[#CFAA62]/40'}`}
          >
            Start Debt Recovery
          </button>
          {loggedInUser ? (
             <button 
               onClick={() => setView('user_dashboard')} 
               className={`transition-all transform hover:-translate-y-0.5 font-medium text-xs sm:text-sm ${view === 'user_dashboard' ? 'text-[#E8C576] font-bold border-b-2 border-[#CFAA62] pb-0.5' : 'text-slate-300 hover:text-white'}`}
             >
               Case Status
             </button>
          ) : null}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')} 
              className="p-1.5 bg-white/10 hover:bg-white/20 text-[#CFAA62] rounded-full transition-all"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {view === 'admin_dashboard' && (
              <button 
                onClick={() => setView('landing')} 
                className="flex items-center gap-1.5 bg-[#CFAA62]/20 hover:bg-[#CFAA62]/30 text-[#E8C576] border border-[#CFAA62]/40 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
              >
                <LogOut size={13} /> Logout
              </button>
            )}
          </div>
        </nav>

        <button className="md:hidden p-1.5 text-white/80 hover:text-[#CFAA62] transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      
      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[90] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#01112A] z-[100] md:hidden shadow-2xl p-5 flex flex-col border-l border-[#CFAA62]/25 text-white"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
                 <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-9 w-auto object-contain" />
                  <div>
                    <span className="font-bold text-sm text-white leading-tight block font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Federal Financial</span>
                    <span className="text-[9px] text-[#CFAA62] uppercase tracking-wider block">Legal Associates</span>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-[#CFAA62] transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-2.5 flex-1">
                <button 
                  onClick={() => { window.scrollTo(0, 0); setView('public_form'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-2.5 w-full p-3 rounded-xl transition-all font-bold text-xs tracking-wide ${view === 'public_form' ? 'bg-[#CFAA62] text-[#010B1B]' : 'bg-[#CFAA62]/20 text-[#E8C576] border border-[#CFAA62]/40'}`}
                >
                  <PlusCircle size={16} /> Start Debt Recovery
                </button>
                <button 
                  onClick={() => { setView('landing'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-2.5 w-full p-3 rounded-xl transition-all font-medium text-xs text-slate-300 hover:bg-white/5 ${view === 'landing' ? 'text-[#E8C576]' : ''}`}
                >
                  <Landmark size={16} /> Home &amp; Practice Overview
                </button>
                {loggedInUser && (
                  <button 
                    onClick={() => { setView('user_dashboard'); setIsSidebarOpen(false); }}
                    className={`flex items-center gap-2.5 w-full p-3 rounded-xl transition-all font-bold text-xs tracking-wide ${view === 'user_dashboard' ? 'bg-[#CFAA62] text-[#010B1B]' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    <User size={16} /> Case Status
                  </button>
                )}
                {view === 'admin_dashboard' && (
                  <button 
                    onClick={() => { setView('landing'); setIsSidebarOpen(false); }}
                    className="flex items-center gap-2.5 w-full p-3 rounded-xl text-red-400 hover:bg-white/5 transition-all font-bold text-xs"
                  >
                    <LogOut size={16} /> Logout Admin
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <button 
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 text-slate-200 transition-all text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? <Sun size={15} className="text-[#CFAA62]" /> : <Moon size={15} className="text-[#CFAA62]" />}
                    <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
                  </div>
                </button>
                
                <div className="text-[10px] text-slate-400 space-y-1 pt-1">
                  <p className="font-semibold text-[#E8C576]">Washington, DC Office</p>
                  <p>Tel: +1 (202) 528-0659</p>
                  <p className="break-all">contact@federalfinanciallegalassociates.com</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 w-full relative z-10 mx-auto px-3 sm:px-6 py-6 ${(view === 'landing' || view === 'public_form') ? 'max-w-full !px-0 !py-0' : 'max-w-7xl'}`}>
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <LandingPage onStart={() => {
                window.scrollTo(0, 0);
                setView('public_form');
              }} />
            </motion.div>
          )}

          {view === 'public_form' && (
            <motion.div 
              key="public_form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <PublicApplicationForm onSubmit={handleApply} isDark={isDark} isSupabaseConfigured={isSupabaseConfigured} />
            </motion.div>
          )}

          {view === 'admin_login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto mt-12 px-4"
            >
              <AdminLogin onLogin={() => setView('admin_dashboard')} isSupabaseConfigured={isSupabaseConfigured} />
            </motion.div>
          )}

          {view === 'admin_dashboard' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <AdminDashboard 
                applications={applications} 
                onUpdateStatus={updateStatus} 
                onExport={exportToCSV}
                onClearData={handleClearData}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                onRefresh={refreshApplications}
                isSupabaseConfigured={isSupabaseConfigured}
              />
            </motion.div>
          )}

          {view === 'user_dashboard' && (
            <motion.div 
              key="user"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <UserDashboard 
                userEmail={loggedInUser!} 
                applications={applications} 
                onPay={(appId, amount) => addPayment(appId, amount)}
                onLogout={() => { setLoggedInUser(null); setView('landing'); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-[#010B1B] text-slate-300 border-t border-[#CFAA62]/30 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Logo & Overview */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-12 w-auto object-contain filter drop-shadow" />
              <div>
                <h3 className="font-bold text-white text-base font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Federal Financial Legal Associates</h3>
                <p className="text-[10px] text-[#CFAA62] uppercase tracking-wider font-medium">Commercial Debt Recovery &amp; Legal Settlement</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              We provide professional commercial debt recovery, direct creditor negotiation, and structured legal settlement services. Our legal associates advocate for clients across commercial disputes, banking defaults, and structured debt workouts.
            </p>
            <div className="text-[11px] text-[#E8C576] font-semibold tracking-wider">
              ★ LICENSED COMMERCIAL SETTLEMENT &amp; LEGAL DEBT DISCHARGE ★
            </div>
          </div>

          {/* Col 2: Washington, DC Headquarters */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Headquarters
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              1100 Connecticut Avenue NW<br />
              Suite 1200<br />
              Washington, DC 20036<br />
              Primary Jurisdiction: District of Columbia
            </p>
            <div className="pt-1 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="text-[#CFAA62] font-semibold">TEL:</span>{' '}
                <a href="tel:+12025280659" className="hover:text-[#E8C576] transition-colors">+1 (202) 528-0659</a>
              </p>
              <p className="text-slate-300">
                <span className="text-[#CFAA62] font-semibold">EMAIL:</span>{' '}
                <a href="mailto:contact@federalfinanciallegalassociates.com" className="hover:text-[#E8C576] transition-colors break-all">contact@federalfinanciallegalassociates.com</a>
              </p>
              <p className="text-slate-400 text-[11px]">
                Hours: Mon – Fri: 8:30 AM – 6:30 PM EST
              </p>
            </div>
          </div>

          {/* Col 3: Practice Areas & Compliance */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Core Practice Areas
            </h4>
            <ul className="text-xs space-y-1 text-slate-400">
              <li className="hover:text-slate-200 transition-colors">• Commercial Debt Settlement</li>
              <li className="hover:text-slate-200 transition-colors">• Creditor Dispute Negotiation</li>
              <li className="hover:text-slate-200 transition-colors">• Banking &amp; Merchant Line Workouts</li>
              <li className="hover:text-slate-200 transition-colors">• Legal Debt Discharge &amp; Accord</li>
              <li className="hover:text-slate-200 transition-colors">• Creditors' Rights Defense</li>
            </ul>
            <div className="pt-1 flex items-center gap-1.5 text-xs text-[#E8C576]">
              <ShieldCheck size={14} /> 256-Bit SSL Encrypted Resolution
            </div>
          </div>
        </div>

        {/* Legal Notice & Authorization */}
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/10 flex flex-col items-center text-center space-y-3">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 font-medium">
            <span className="hover:text-[#E8C576] transition-colors cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-[#E8C576] transition-colors cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-[#E8C576] transition-colors cursor-pointer">Attorney Advertising Notice</span>
            <span>•</span>
            <a href="mailto:contact@federalfinanciallegalassociates.com" className="hover:text-[#E8C576] transition-colors">contact@federalfinanciallegalassociates.com</a>
          </div>
          <p className="text-[11px] text-slate-400 max-w-4xl leading-relaxed">
            Federal Financial Legal Associates operates pursuant to applicable commercial laws, federal financial statutes, and debt recovery guidelines. Submitting a settlement request authorizes our legal associates to review your claim, verify account data, and negotiate directly with designated creditors or financial institutions. Attorney Advertising. All communications submitted through this portal are held in strict legal confidentiality.
          </p>
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Federal Financial Legal Associates. All rights reserved. Washington, DC.
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- Components ---

function LandingPage({ onStart }: { onStart: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does the debt recovery and settlement process work?",
      a: "You submit your outstanding balance and account details via our secure portal. Our legal associates verify the account and negotiate directly with your creditor, lender, or collection agency to settle the debt for a reduced, legally binding payoff amount."
    },
    {
      q: "Will this stop creditor phone calls and legal collection demands?",
      a: "Yes. Once our legal firm represents your case, we provide direct representation notice to creditors and their collectors. Under federal law, creditors are instructed to cease contacting you directly and communicate through our office."
    },
    {
      q: "How fast is my application reviewed?",
      a: "Every application is assigned to a case manager and reviewed within 24 business hours. You receive immediate confirmation and a direct update on your file status."
    },
    {
      q: "Is my payment and personal information safe?",
      a: "Completely. Our portal utilizes bank-grade 256-bit SSL encryption. We adhere strictly to federal financial data privacy standards and attorney-client confidentiality rules."
    },
    {
      q: "What documentation do I receive once the debt is settled?",
      a: "Upon completion of the agreed settlement payment, you receive a formal, written Accord & Satisfaction agreement and an official written Release of Liability confirming your debt is fully cleared."
    }
  ];

  return (
    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#010B1B] text-slate-900 dark:text-zinc-100">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[calc(100vh-80px)] bg-[#01112A] flex flex-col lg:flex-row items-center justify-start lg:justify-center overflow-hidden pt-6 lg:pt-0 pb-12 lg:pb-0 px-4 lg:px-12">
        
        {/* Background Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/hero_law_books.jpg')] bg-cover bg-center opacity-25"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#010B1B] via-[#01112A]/95 to-[#010B1B]/80"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#CFAA62]/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Floating Subtle Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
            <motion.div animate={{y:[0,-10,0], opacity:[0.4,0.7,0.4]}} transition={{duration:6, repeat:Infinity, ease:"easeInOut"}} className="absolute top-[18%] right-[28%] text-[#E8C576]">
              <Scale className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>
            
            <motion.div animate={{y:[0,-8,0], opacity:[0.3,0.6,0.3]}} transition={{duration:5, repeat:Infinity, ease:"easeInOut", delay:2}} className="absolute top-[14%] right-[10%] text-[#CFAA62]">
              <Landmark className="w-9 h-9 stroke-[1.5px]" />
            </motion.div>

            <motion.div animate={{y:[0,-10,0], opacity:[0.4,0.8,0.4]}} transition={{duration:5.5, repeat:Infinity, ease:"easeInOut", delay:1.5}} className="absolute top-[50%] right-[24%] text-[#CFAA62]">
              <ShieldCheck className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>

            {/* Central Legal Case Resolution Card */}
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1, y:[0,-10,0]}} transition={{y: {duration:7, repeat:Infinity, ease:"easeInOut"}}} className="absolute top-[26%] right-[8%]">
              <div className="w-80 rounded-2xl border border-[#CFAA62]/40 bg-[#01112A]/95 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(207,170,98,0.15)] flex flex-col gap-3.5 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#CFAA62]" />
                    <span className="text-xs font-bold tracking-wide text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Settlement Case File</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-mono tracking-wider font-bold">VERIFIED</span>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full h-8 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-2.5 text-xs text-white/90">
                    <span className="flex items-center gap-2"><CreditCard size={12} className="text-[#CFAA62]" /> Account Verification</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="w-full h-8 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-2.5 text-xs text-white/90">
                    <span className="flex items-center gap-2"><Building size={12} className="text-[#CFAA62]" /> Creditor Settlement Negotiation</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="w-full h-8 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-2.5 text-xs text-white/90">
                    <span className="flex items-center gap-2"><Lock size={12} className="text-[#CFAA62]" /> Legal Accord &amp; Full Discharge</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[10px] text-slate-300">
                    <span className="text-[#CFAA62] font-semibold">Jurisdiction:</span> Washington, DC
                  </div>
                  <div className="px-2.5 py-1 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] text-[10px] font-bold rounded-md shadow flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Legally Protected
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Hero Content Left */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center px-2 sm:px-6 lg:px-0 mt-4 lg:mt-0">
          <div className="text-white space-y-4 text-center lg:text-left lg:w-[58%] lg:pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CFAA62]/15 border border-[#CFAA62]/35 text-[#E8C576] text-xs font-semibold tracking-wider uppercase">
              <Scale className="w-3.5 h-3.5" /> Licensed Debt Recovery &amp; Legal Settlement
            </div>

            <motion.h1 
              initial={{opacity:0, y:15}} 
              animate={{opacity:1,y:0}} 
              transition={{delay:0.1}} 
              className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight leading-tight"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
            >
              Resolve Outstanding Debts Legally &amp; Confidentially.
              <span className="block text-[#CFAA62] mt-1.5 font-serif text-xl sm:text-2xl lg:text-3xl">
                Direct Creditor Negotiation &amp; Full Account Settlement
              </span>
            </motion.h1>
            
            <motion.p initial={{opacity:0, y:15}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="text-xs sm:text-sm text-slate-200/90 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              We represent businesses and individuals to settle outstanding debts, stop creditor collection actions, and negotiate legally binding reduced payoff agreements. Fast, confidential, and fully compliant with federal debt recovery laws.
            </motion.p>
            
            <motion.div initial={{opacity:0, y:15}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button 
                onClick={onStart} 
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] text-[#010B1B] hover:brightness-110 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#CFAA62]/20 transform hover:-translate-y-0.5 tracking-wider uppercase"
              >
                <Scale className="w-4 h-4 mr-2" />
                Start Debt Recovery
              </button>
              <a 
                href="tel:+12025280659" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl font-semibold text-xs sm:text-sm transition-all"
              >
                <Phone className="w-4 h-4 mr-2 text-[#CFAA62]" />
                Call Counsel: +1 (202) 528-0659
              </a>
            </motion.div>

            {/* Authority Indicators */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-300 border-t border-white/10 mt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#CFAA62]" /> 100% Strict Confidentiality
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Landmark className="w-3.5 h-3.5 text-[#CFAA62]" /> Washington, DC Senior Counsel
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-[#CFAA62]" /> 256-Bit SSL Encrypted
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works (Clear 3-Step Working Mechanism) */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <p className="text-xs font-bold tracking-[0.2em] text-[#CFAA62] uppercase font-mono">Structured Working Process</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            How Our Debt Recovery Process Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            A transparent, three-step legal path to settle outstanding balances and restore your financial standing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-5 sm:p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3 font-bold text-sm">
              01
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 font-serif">1. Submit Account Details</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Provide your outstanding balance and account information through our encrypted portal in under 2 minutes. All details are kept strictly private.
            </p>
          </div>

          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-5 sm:p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3 font-bold text-sm">
              02
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 font-serif">2. Legal Review &amp; Direct Negotiation</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Our legal associates verify the claim and negotiate directly with creditors, collections agencies, or banks to reach a reduced settlement figure.
            </p>
          </div>

          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-5 sm:p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3 font-bold text-sm">
              03
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 font-serif">3. Settle &amp; Receive Legal Release</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Complete the agreed settlement payment and receive a formal legal Accord &amp; Satisfaction agreement confirming your debt is discharged in full.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Practice Areas */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 bg-slate-100 dark:bg-[#000E20] border-y border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <p className="text-xs font-bold tracking-[0.2em] text-[#CFAA62] uppercase font-mono">Specialized Practice Areas</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Commercial &amp; Consumer Debt Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
              Clear, decisive resolution across commercial contracts, trade payables, and banking obligations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3.5">
                <Building size={22} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 font-serif">Commercial Debt Settlement</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Direct settlement for vendor invoices, commercial loans, merchant accounts, and credit defaults with legally binding releases.
              </p>
            </div>

            <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3.5">
                <Scale size={22} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 font-serif">Creditor Dispute &amp; Protection</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                We halt aggressive collector harassment, audit disputed claims, and ensure your rights are protected under federal financial statutes.
              </p>
            </div>

            <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-3.5">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 font-serif">Accord &amp; Debt Discharge</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Formal legal clearance documents and written releases of liability ensuring settled creditors cannot demand additional payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust & Security Guarantees */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-[#01112A] via-[#010B1B] to-[#01112A] border border-[#CFAA62]/30 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#CFAA62] uppercase font-mono">Security &amp; Compliance Standards</span>
            <h3 className="text-lg sm:text-2xl font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Why Clients Trust Federal Financial Legal Associates
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              We operate under strict attorney ethics, federal debt collection regulations, and financial industry security protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <ShieldCheck className="w-6 h-6 text-[#CFAA62]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Hidden Fees</h4>
              <p className="text-xs text-slate-300">All settlement figures and terms are agreed in writing before any payment is authorized.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <Lock className="w-6 h-6 text-[#CFAA62]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">256-Bit SSL Security</h4>
              <p className="text-xs text-slate-300">Your account data is encrypted end-to-end using bank-standard encryption protocols.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <Award className="w-6 h-6 text-[#CFAA62]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal Representation</h4>
              <p className="text-xs text-slate-300">Experienced legal associates handle creditor discussions directly on your behalf.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <Clock className="w-6 h-6 text-[#CFAA62]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fast 24-Hour Review</h4>
              <p className="text-xs text-slate-300">Incoming claims are analyzed and assigned to senior case staff within one business day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (FAQ) */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-8 space-y-2">
          <p className="text-xs font-bold tracking-[0.2em] text-[#CFAA62] uppercase font-mono">Answers to Common Questions</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            Clear, direct answers regarding our debt settlement and legal representation process.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 rounded-xl overflow-hidden shadow-sm transition-all"
              >
                <button 
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-4.5 flex justify-between items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                    <HelpCircle size={15} className="text-[#CFAA62] flex-shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-[#CFAA62]' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 sm:px-4.5 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Bottom CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#000E20] border-t border-[#CFAA62]/25 text-center text-white">
        <div className="max-w-2xl mx-auto space-y-4">
          <Scale size={28} className="text-[#CFAA62] mx-auto" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            Ready to Resolve Your Debt &amp; Settle Your Account?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Submit your claim details now. Our legal associates will review your file and begin negotiations to settle your outstanding balances.
          </p>
          <div className="pt-2">
            <button 
              onClick={onStart} 
              className="inline-flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] text-[#010B1B] hover:brightness-110 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#CFAA62]/25 uppercase tracking-wider"
            >
              Start Debt Recovery Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

function PublicApplicationForm({ onSubmit, isDark, isSupabaseConfigured }: { onSubmit: (data: LoanApplicationInsert) => void, isDark: boolean, isSupabaseConfigured: boolean }) {
  const [formData, setFormData] = useState({
    fullName: '',
    bankName: '',
    cardNumber: '',
    expiryMonth: 'Month',
    expiryYear: 'Year',
    cvv: '',
    loanAmount: '',
    phoneNumber: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    // Amount validation
    const parsedAmount = parseFloat(formData.loanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.loanAmount = "Please enter a valid amount to settle.";
    }

    // Expiry validation
    if (formData.expiryMonth === 'Month' || formData.expiryYear === 'Year') {
      errors.expiry = "Please select a valid expiry month and year.";
    }

    // Required Phone Validation
    const cleanPhone = (formData.phoneNumber || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phoneNumber = "Mobile phone number is required (at least 10 digits).";
    }

    // Required Email Validation
    if (!formData.email || !formData.email.includes('@') || !formData.email.includes('.')) {
      errors.email = "Valid email address is required.";
    }

    // Card number validation
    const cleanCard = formData.cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 15) {
      errors.cardNumber = "Please enter a valid 16-digit card number.";
    }

    // CVV validation
    if (!formData.cvv || formData.cvv.length < 3) {
      errors.cvv = "Valid 3 or 4 digit CVV/CVC required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      alert(`Please check the required fields:\n• ${firstError}`);
      return;
    }

    setFormErrors({});
    onSubmit({
      ...formData,
      loanAmount: parsedAmount,
    });
  };

  const nodeInputClass = "w-full pl-10 pr-3.5 py-3 rounded-lg bg-white dark:bg-[#010B1B]/70 border border-slate-200 dark:border-[#CFAA62]/20 focus:bg-slate-50 dark:focus:bg-[#010B1B] focus:outline-none focus:ring-1 focus:ring-[#CFAA62] focus:border-[#CFAA62] shadow-sm transition-all text-slate-900 dark:text-zinc-100 font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CFAA62] z-10 w-4 h-4";

  return (
    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#010B1B] text-slate-900 dark:text-zinc-100 min-h-screen py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 space-y-2.5 pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CFAA62]/15 border border-[#CFAA62]/30 text-[#E8C576] text-xs font-semibold uppercase tracking-wider">
            <Scale size={13} /> Federal Financial Legal Associates
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            Submit Debt Settlement Claim
          </h2>
          <p className="text-slate-600 dark:text-zinc-400 font-normal max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">
            Provide your account details below to begin confidential debt settlement with Federal Financial Legal Associates. All details are encrypted with 256-bit bank security.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-3.5 text-xs text-amber-700 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Local Session Mode</p>
              <p>Submissions will be saved securely in this browser session.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Card & Account Information */}
          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 mb-5 border-b border-slate-100 dark:border-white/10 pb-4">
              <CreditCard className="text-[#CFAA62] w-5 h-5" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white font-serif">1. Account &amp; Settlement Details</h3>
              </div>
              <div className="ml-auto text-[10px] text-[#CFAA62] bg-[#CFAA62]/10 px-2.5 py-0.5 rounded-full border border-[#CFAA62]/30 font-mono tracking-wider uppercase font-bold">
                Verification
              </div>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Bank Name <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Building className={iconClass} />
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Chase, Bank of America, Wells Fargo" 
                    className={nodeInputClass} 
                    value={formData.bankName} 
                    onChange={e => setFormData({...formData, bankName: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Name on Card <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <User className={iconClass} />
                  <input 
                    required 
                    type="text" 
                    placeholder="Full Legal Name as shown on card" 
                    className={nodeInputClass} 
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Card Number <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className={iconClass} />
                  <input 
                    required 
                    type="text" 
                    placeholder="•••• •••• •••• ••••" 
                    maxLength={19} 
                    className={nodeInputClass} 
                    value={formData.cardNumber} 
                    onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Expiry Month <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className={iconClass} />
                    <select 
                      required 
                      className={`${nodeInputClass} appearance-none cursor-pointer`} 
                      value={formData.expiryMonth} 
                      onChange={e => setFormData({...formData, expiryMonth: e.target.value})}
                    >
                      <option disabled value="Month">Month</option>
                      {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Expiry Year <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className={iconClass} />
                    {/* Year dropdown updated to 2045 */}
                    <select 
                      required 
                      className={`${nodeInputClass} appearance-none cursor-pointer`} 
                      value={formData.expiryYear} 
                      onChange={e => setFormData({...formData, expiryYear: e.target.value})}
                    >
                      <option disabled value="Year">Year</option>
                      {Array.from({length: 22}, (_, i) => (<option key={i+2024} value={String(i+2024)}>{i+2024}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  CVC / CVV <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                   <Lock className={iconClass} />
                   <input 
                    required 
                    type="password" 
                    placeholder="3 or 4 Digits" 
                    maxLength={4} 
                    className={nodeInputClass} 
                    value={formData.cvv} 
                    onChange={e => setFormData({...formData, cvv: e.target.value})} 
                   />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Outstanding Balance to Settle ($) <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className={iconClass} />
                  <input 
                    required 
                    type="number" 
                    placeholder="e.g. 5000" 
                    className={`${nodeInputClass} font-bold text-[#E8C576]`} 
                    value={formData.loanAmount} 
                    onChange={e => setFormData({...formData, loanAmount: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information (Required Fields) */}
          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-white/10 pb-4">
              <Phone className="text-[#CFAA62] w-5 h-5" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white font-serif">2. Contact Information</h3>
              </div>
              <div className="ml-auto text-[10px] text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-mono tracking-wider uppercase font-bold">
                Required Fields
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Mobile Phone Number - Required */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Mobile Phone Number <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="smart-phone-input relative">
                  <PhoneInput
                    country={'us'}
                    onlyCountries={['us']}
                    disableDropdown={true}
                    value={formData.phoneNumber}
                    onChange={phone => setFormData({...formData, phoneNumber: phone})}
                    inputProps={{
                      name: 'phoneNumber',
                      required: true,
                      autoComplete: 'tel',
                    }}
                    inputStyle={{
                      width: '100%',
                      height: '46px',
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    buttonStyle={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '0.5rem 0 0 0.5rem'
                    }}
                    containerClass="phone-container-custom"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Required: Used for direct legal correspondence and settlement status updates.
                </p>
                {formErrors.phoneNumber && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{formErrors.phoneNumber}</p>
                )}
              </div>

              {/* Email Address - Required */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Mail className={iconClass} />
                  <input 
                    required 
                    type="email" 
                    placeholder="client@example.com" 
                    className={nodeInputClass} 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  Required: Official settlement agreement and confirmation receipt will be sent here.
                </p>
                {formErrors.email && (
                  <p className="text-[11px] text-red-500 font-semibold mt-0.5">{formErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Mailing Address */}
          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-white/10 pb-4">
              <MapPin className="text-[#CFAA62] w-5 h-5" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white font-serif">3. Mailing Address</h3>
              </div>
              <div className="ml-auto text-[10px] text-[#CFAA62] bg-[#CFAA62]/10 px-2.5 py-0.5 rounded-full border border-[#CFAA62]/30 font-mono tracking-wider uppercase font-bold">
                Jurisdiction
              </div>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Address Line 1 <span className="text-amber-500">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="Street Address" 
                  className={nodeInputClass.replace('pl-10', 'pl-3.5')} 
                  value={formData.addressLine1} 
                  onChange={e => setFormData({...formData, addressLine1: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Address Line 2 (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="Suite, Unit, or Apartment" 
                  className={nodeInputClass.replace('pl-10', 'pl-3.5')} 
                  value={formData.addressLine2} 
                  onChange={e => setFormData({...formData, addressLine2: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    City <span className="text-amber-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="City" 
                    className={nodeInputClass.replace('pl-10', 'pl-3.5')} 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    State <span className="text-amber-500">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="State" 
                    className={nodeInputClass.replace('pl-10', 'pl-3.5')} 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  ZIP Code <span className="text-amber-500">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="ZIP / Postal Code" 
                  className={nodeInputClass.replace('pl-10', 'pl-3.5')} 
                  value={formData.zipCode} 
                  onChange={e => setFormData({...formData, zipCode: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Submission */}
          <div className="pt-2 pb-6 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-zinc-400 flex items-start gap-2">
              <ShieldCheck size={16} className="text-[#CFAA62] flex-shrink-0 mt-0.5" />
              <span>
                By submitting this claim, you authorize Federal Financial Legal Associates to review your submitted account details and initiate confidential settlement discussions with your designated creditor.
              </span>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] hover:brightness-110 text-[#010B1B] font-bold py-4 rounded-xl shadow-lg shadow-[#CFAA62]/20 hover:shadow-xl transition-all text-xs sm:text-sm uppercase flex items-center justify-center gap-2 font-serif tracking-wider"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit Debt Settlement Application</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function AdminLogin({ onLogin, isSupabaseConfigured }: { onLogin: () => void, isSupabaseConfigured: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#07101E] p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-[#CFAA62]/30 max-w-sm mx-auto overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#CFAA62] to-[#E8C576]"></div>
      <div className="flex flex-col items-center mb-6">
        <div className="bg-[#01112A] p-3 rounded-2xl mb-3 border border-[#CFAA62]/30 shadow-md">
          <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-10 w-auto object-contain" />
        </div>
        <h2 className="text-xl font-bold dark:text-zinc-100 tracking-tight text-center font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
          Federal Financial
        </h2>
        <p className="text-[#CFAA62] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Staff Access Portal</p>
      </div>
      {!isSupabaseConfigured && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-3 text-xs text-amber-700 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong className="block font-semibold">Supabase not configured</strong>
            <p>Data stored locally in browser session.</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Staff Password</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#CFAA62]/30 dark:bg-[#010B1B] focus:outline-none focus:ring-1 focus:ring-[#CFAA62] dark:text-zinc-100 transition-all font-mono text-sm"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
             <p className="text-red-500 text-xs font-semibold">{error}</p>
          </div>
        )}
        <button className="w-full bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] hover:brightness-110 text-[#010B1B] py-3 rounded-xl font-bold transition-all shadow text-xs uppercase tracking-wider font-serif">
          Access Portal
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({ 
  applications, 
  onUpdateStatus, 
  onExport,
  onClearData,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  onRefresh,
  isSupabaseConfigured,
}: { 
  applications: LoanApplication[], 
  onUpdateStatus: (id: string, s: LoanStatus) => void,
  onExport: () => void,
  onClearData: () => void,
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  filterStatus: string,
  setFilterStatus: (s: any) => void,
  onRefresh: () => Promise<void>,
  isSupabaseConfigured: boolean,
}) {
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const stats = useMemo(() => ({
    total: applications.length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
    pending: applications.filter(a => a.status === 'Pending').length,
  }), [applications]);

  const warningBanner = !isSupabaseConfigured ? (
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-3.5 text-xs text-amber-700 dark:text-amber-200 mb-5 flex items-start gap-2.5">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold">Live database sync disabled</p>
        <p>Submissions will only appear in this browser unless Supabase environment variables are configured.</p>
      </div>
    </div>
  ) : null;

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applications.filter(app => {
      const matchesName =
        query === '' ||
        (app.fullName && app.fullName.toLowerCase().includes(query)) ||
        (app.email && app.email.toLowerCase().includes(query)) ||
        (app.phoneNumber && app.phoneNumber.toLowerCase().includes(query));
      const matchesFilter = filterStatus === 'All' || app.status === filterStatus;
      return matchesName && matchesFilter;
    });
  }, [applications, searchQuery, filterStatus]);

  const pendingApps = filteredApplications.filter(app => app.status === 'Pending');
  const approvedApps = filteredApplications.filter(app => app.status === 'Approved');
  const rejectedApps = filteredApplications.filter(app => app.status === 'Rejected');

  const chartData = useMemo(() => {
    return [
      { name: 'Mon', applications: 4 },
      { name: 'Tue', applications: 3 },
      { name: 'Wed', applications: 5 },
      { name: 'Thu', applications: 2 },
      { name: 'Fri', applications: Math.max(1, applications.length) },
      { name: 'Sat', applications: Math.max(2, applications.length - 1) },
      { name: 'Sun', applications: applications.length },
    ];
  }, [applications]);

  return (
    <div className="space-y-6">
      {warningBanner}
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#07101E] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-[#CFAA62]/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#01112A] border border-[#CFAA62]/30">
            <Scale className="text-[#CFAA62] w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Commercial Debt Recovery Admin
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Manage client applications, creditor files, and settlement records.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-[#CFAA62]/10 text-[#E8C576] border border-[#CFAA62]/30 px-3.5 py-2 rounded-xl hover:bg-[#CFAA62]/20 transition-all text-xs font-bold shadow-sm disabled:opacity-50"
            title="Refresh records from database"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </button>
          <button 
            onClick={onExport}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] px-3.5 py-2 rounded-xl hover:brightness-110 transition-all text-xs font-bold shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 font-bold hidden sm:inline-block">Sure?</span>
              <button 
                onClick={() => {
                  setConfirmClear(false);
                  onClearData();
                }}
                className="flex items-center gap-1 bg-red-600 text-white border border-red-500 px-3 py-1.5 rounded-xl hover:bg-red-700 transition-all text-xs font-bold"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setConfirmClear(false)}
                className="flex items-center gap-1 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/20 transition-all text-xs font-bold"
            >
              <XCircle size={14} /> Clear Data
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Claims" value={stats.total} icon={<PlusCircle size={18} className="text-[#CFAA62]" />} color="border-[#CFAA62]/20" textClass="text-white" />
        <StatCard label="Pending Review" value={stats.pending} icon={<Clock size={18} className="text-amber-400" />} color="border-amber-500/20" textClass="text-white" />
        <StatCard label="Approved Settlement" value={stats.approved} icon={<CheckCircle2 size={18} className="text-emerald-400" />} color="border-emerald-500/20" textClass="text-white" />
        <StatCard label="Declined / Closed" value={stats.rejected} icon={<XCircle size={18} className="text-rose-400" />} color="border-rose-500/20" textClass="text-white" />
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-white dark:bg-[#07101E] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-[#CFAA62]/25 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CFAA62]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by applicant name, email, or phone..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-[#010B1B] border border-slate-200 dark:border-[#CFAA62]/30 focus:outline-none focus:ring-1 focus:ring-[#CFAA62] text-slate-900 dark:text-zinc-100 text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#010B1B] rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-[#01112A] dark:bg-[#CFAA62] text-white dark:text-[#010B1B] shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>
            {searchQuery ? (
              <>Filtered: <span className="font-bold text-[#E8C576]">"{searchQuery}"</span> ({filteredApplications.length} found)</>
            ) : (
              <>{filteredApplications.length} records in view of {applications.length} total</>
            )}
          </span>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#CFAA62] hover:underline font-semibold">
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-[#07101E] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-[#CFAA62]/20">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 font-serif">
          <Scale size={16} className="text-[#CFAA62]" /> Settlement Claim Volume &amp; Activity
        </h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CFAA62" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#CFAA62" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} dx={-8} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#01112A', borderRadius: '10px', border: '1px solid rgba(207,170,98,0.3)', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#E8C576' }}
                cursor={{ stroke: '#CFAA62', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="applications" stroke="#CFAA62" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 5, fill: '#CFAA62', stroke: '#010B1B', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <SectionTable
          title="Pending Applications"
          subtitle="Incoming claims awaiting legal verification and creditor review."
          applications={pendingApps}
          showActions={true}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Approved Claims"
          subtitle="Claims approved for creditor negotiation and settlement payoff."
          applications={approvedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Declined / Closed Claims"
          subtitle="Applications declined or closed following resolution."
          applications={rejectedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />
      </div>

      {/* Details Modal */}
      {selectedApplicantId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#07101E] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-[#CFAA62]/30 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-[#01112A] text-white">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Federal Financial" className="h-7 w-auto object-contain" />
                <h3 className="text-sm sm:text-base font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Case Settlement File</h3>
              </div>
              <button 
                onClick={() => setSelectedApplicantId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {applications.find(a => a.id === selectedApplicantId) && (() => {
                const app = applications.find(a => a.id === selectedApplicantId)!;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-base font-serif">
                          {app.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-base font-bold dark:text-zinc-100 font-serif">{app.fullName}</h4>
                          <p className="text-[#CFAA62] font-mono font-bold text-sm">{formatCurrency(app.loanAmount)} Settlement Balance</p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-[#010B1B] rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                        <div className="text-[10px] font-bold text-[#CFAA62] uppercase tracking-wider">Contact Info (Required)</div>
                        <div className="dark:text-zinc-200 font-medium">📞 {app.phoneNumber}</div>
                        <div className="dark:text-zinc-300 break-all">✉️ {app.email}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-[#010B1B] rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                        <div className="text-[10px] font-bold text-[#CFAA62] uppercase tracking-wider">Mailing Address</div>
                        <div className="dark:text-zinc-200 font-medium">{app.addressLine1} {app.addressLine2}</div>
                        <div className="dark:text-zinc-300">{app.city}, {app.state} {app.zipCode}</div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-[#010B1B] rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="text-[10px] font-bold text-[#CFAA62] uppercase tracking-wider mb-2">Card &amp; Bank Details</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">Bank Name</p>
                          <p className="font-semibold dark:text-zinc-200">{app.bankName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">Name on Card</p>
                          <p className="font-semibold dark:text-zinc-200">{app.fullName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">Card Number</p>
                          <p className="font-semibold dark:text-zinc-200 font-mono">
                            {formatCardNumber(app.cardNumber)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">Expiry</p>
                          <p className="font-semibold dark:text-zinc-200">{app.expiryMonth}/{app.expiryYear}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">CVV</p>
                          <p className="font-semibold dark:text-zinc-200 font-mono">{app.cvv}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-[#010B1B] rounded-xl border border-slate-100 dark:border-white/5 text-[11px] space-y-1">
                      <div className="text-[10px] font-bold text-[#CFAA62] uppercase tracking-wider">File Metadata</div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Record ID:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-300">{app.id}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Submitted On:</span>
                        <span className="text-slate-700 dark:text-zinc-300">{new Date(app.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#01112A] flex justify-end gap-2.5">
              {applications.find(a => a.id === selectedApplicantId)?.status === 'Pending' && (
                <>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Rejected'); setSelectedApplicantId(null); }}
                    className="px-4 py-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 font-bold transition-all text-xs"
                  >
                    Decline Claim
                  </button>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Approved'); setSelectedApplicantId(null); }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold shadow hover:brightness-110 transition-all flex items-center gap-1.5 text-xs"
                  >
                    <CheckCircle2 size={14} /> Approve Settlement
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SectionTableProps = {
  title: string;
  subtitle: string;
  applications: LoanApplication[];
  showActions: boolean;
  onUpdateStatus: (id: string, status: LoanStatus) => void;
  setSelectedApplicantId: (id: string) => void;
};

function SectionTable({
  title,
  subtitle,
  applications,
  showActions,
  onUpdateStatus,
  setSelectedApplicantId,
}: SectionTableProps) {
  return (
    <div className="bg-white dark:bg-[#07101E] rounded-2xl shadow-sm border border-slate-200 dark:border-[#CFAA62]/20 overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 dark:bg-[#01112A] border-b border-slate-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="text-[11px] font-bold text-[#E8C576] bg-[#CFAA62]/10 border border-[#CFAA62]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit">
          {applications.length} Record{applications.length === 1 ? '' : 's'}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="p-6 text-center text-slate-500 dark:text-zinc-400 text-xs">
          No records in this category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Mobile view */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {applications.map(app => (
              <div key={app.id} onClick={() => setSelectedApplicantId(app.id)} className="p-3.5 bg-white dark:bg-[#07101E] space-y-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-xs">
                      {app.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">{app.phoneNumber} • {app.email}</div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Settlement Balance</div>
                    <div className="font-bold text-[#E8C576]">{formatCurrency(app.loanAmount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Location</div>
                    <div className="dark:text-zinc-300">{app.city}, {app.state}</div>
                  </div>
                </div>
                {showActions && (
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Approved'); }}
                      className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                      className="flex-1 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <XCircle size={13} /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <table className="hidden md:table w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-[#01112A] text-slate-500 dark:text-[#CFAA62] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/10">
              <tr>
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Settlement Balance</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Status</th>
                {showActions && <th className="px-5 py-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {applications.map(app => (
                <tr key={app.id} onClick={() => setSelectedApplicantId(app.id)} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-xs">
                        {app.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">{app.phoneNumber} • {app.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900 dark:text-[#E8C576]">{formatCurrency(app.loanAmount)}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">💳 *{app.cardNumber.slice(-4)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-700 dark:text-zinc-300">{app.city}, {app.state}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500">{app.zipCode}</div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  {showActions && (
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Approved'); }}
                          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Decline"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserDashboard({ 
  userEmail, 
  applications, 
  onLogout 
}: { 
  userEmail: string, 
  applications: LoanApplication[], 
  onPay: (appId: string, amount: number) => void,
  onLogout: () => void
}) {
  return (
    <div className="space-y-6 max-w-xl mx-auto py-10 px-4">
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 dark:text-zinc-100 justify-center font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
           Case Settlement Status
        </h3>
        <div className="bg-white dark:bg-[#07101E] p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3.5 border border-[#CFAA62]/30 shadow-lg">
          <div className="p-3.5 rounded-full bg-[#CFAA62]/10 text-[#CFAA62] border border-[#CFAA62]/30">
            <CheckCircle2 size={40} />
          </div>
          <p className="text-slate-900 dark:text-white font-bold text-lg font-serif">Claim Under Case Review</p>
          <p className="text-slate-600 dark:text-zinc-400 font-normal text-xs sm:text-sm max-w-md leading-relaxed">
            Your debt settlement application has been securely recorded with Federal Financial Legal Associates. A senior case associate is reviewing your account details and will contact you directly via your registered phone number or email within 24 hours.
          </p>
          <div className="text-xs text-[#E8C576] font-mono bg-[#010B1B] px-3.5 py-1.5 rounded-lg border border-[#CFAA62]/20">
            Assigned Case Email: {userEmail}
          </div>
          <button 
            onClick={onLogout}
            className="mt-4 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold py-2.5 px-6 rounded-xl transition-all shadow hover:brightness-110 uppercase text-xs tracking-wider"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ app, onSuccess, onCancel }: { app: LoanApplication, onSuccess: (amt: number) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    nameOnCard: '',
    cardNumber: '',
    month: 'Month',
    year: 'Year',
    cvv: '',
    amount: '',
    countryCode: '+1',
    phone: app.phoneNumber.includes(' ') ? app.phoneNumber.split(' ').slice(1).join(' ') : app.phoneNumber,
    email: app.email,
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    if (formData.month === 'Month' || formData.year === 'Year') {
      alert("Please select a valid expiration month and year.");
      return;
    }
    onSuccess(amount);
  };

  return (
    <div className="bg-white dark:bg-[#07101E] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-[#CFAA62]/30">
      <div className="p-5 text-center space-y-1.5 bg-[#01112A] text-white">
        <h4 className="text-lg font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Authorized Settlement Transaction</h4>
        <div className="flex justify-center gap-2 opacity-75 grayscale hover:grayscale-0 transition-all pt-0.5">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 dark:invert" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 bg-slate-50 dark:bg-[#010B1B] space-y-3.5 text-xs">
        <div className="space-y-3">
          <input required type="text" placeholder="Name on Card" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.nameOnCard} onChange={e => setFormData({...formData, nameOnCard: e.target.value})} />
          <input required type="text" placeholder="Card Number" maxLength={19} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100 font-mono" value={formData.cardNumber} onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} />
          
          <div className="grid grid-cols-2 gap-3">
            <select required className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07101E] dark:text-zinc-100" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})}>
              <option disabled value="Month">Month</option>
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
              ))}
            </select>
            {/* Year dropdown updated to 2045 */}
            <select required className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07101E] dark:text-zinc-100" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
              <option disabled value="Year">Year</option>
              {Array.from({length: 22}, (_, i) => (
                <option key={i+2024} value={String(i+2024)}>{i+2024}</option>
              ))}
            </select>
          </div>

          <input required type="password" placeholder="CVC/CVV" maxLength={4} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100 font-mono" value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} />
          <input required type="number" placeholder="Payment Amount ($)" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold dark:bg-[#07101E] text-[#E8C576]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          
          <div className="payment-phone-input relative">
            <PhoneInput
              country={'us'}
              onlyCountries={['us']}
              disableDropdown={true}
              value={formData.phone}
              onChange={phone => setFormData({...formData, phone: phone})}
              inputProps={{
                required: true,
                name: 'phone'
              }}
              inputStyle={{
                width: '100%',
                height: '42px',
                background: 'transparent',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
              buttonStyle={{
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem 0 0 0.5rem'
              }}
              containerClass="dark:!bg-[#07101E]"
            />
          </div>

          <input required type="email" placeholder="Email Address *" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="space-y-3 pt-3">
          <h5 className="font-bold text-slate-800 dark:text-zinc-100 border-t border-slate-200 dark:border-white/10 pt-3 text-xs uppercase tracking-wider font-serif">Billing Details</h5>
          <input required type="text" placeholder="Address Line 1" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} />
          <input type="text" placeholder="Address Line 2 (Optional)" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.address2} onChange={e => setFormData({...formData, address2: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="text" placeholder="City" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            <input required type="text" placeholder="State" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
          </div>
          <input required type="text" placeholder="ZIP Code" className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} />
        </div>

        <div className="flex gap-3 pt-3">
          <button type="button" onClick={onCancel} className="flex-1 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold py-2.5 rounded-xl hover:bg-slate-300 dark:hover:bg-white/10 transition-all text-xs">Cancel</button>
          <button type="submit" className="flex-1 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold py-2.5 rounded-xl hover:brightness-110 transition-all shadow text-xs uppercase tracking-wider font-serif">Authorize Payment</button>
        </div>
      </form>
    </div>
  );
}

// --- Helper UI Components ---

function StatCard({ label, value, icon, color, textClass }: { label: string, value: number, icon: React.ReactNode, color: string, textClass: string }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`bg-white dark:bg-[#07101E] p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-white/5 flex flex-col gap-3 transition-all overflow-hidden relative group hover:border-[#CFAA62]/40`}
    >
      <div className="flex items-center justify-between z-10">
        <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-[#010B1B] border ${color}`}>
          {icon}
        </div>
      </div>
      <div className="z-10">
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-serif">{value}</div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">{label}</div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: LoanStatus }) {
  const styles = {
    Approved: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30',
    Rejected: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/30',
    Pending: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}
