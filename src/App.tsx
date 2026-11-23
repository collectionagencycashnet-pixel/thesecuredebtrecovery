/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Federal Financial Legal Associates - Case & Financial Resolution Portal
 * Features: Client financial resolution applications, admin dashboard with search, approve/reject functionality,
 * real-time sync with Supabase, separate sections for pending/approved/rejected applications
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Download, 
  DollarSign, 
  AlertCircle,
  CreditCard,
  History,
  Menu,
  X,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Workflow,
  Zap,
  Database,
  Play,
  Sun,
  Moon,
  ShieldCheck,
  Scale,
  FileText,
  Star,
  ArrowRight,
  MousePointerClick,
  Globe,
  Landmark,
  Wallet,
  ShoppingBag,
  Building,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { LoanApplication, LoanApplicationInsert, LoanStatus, Payment } from './types';
import { fetchApplications, createApplication, updateApplicationStatus, addPaymentToApp, deleteAllApplications, subscribeToApplications } from './lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './lib/supabase';

// Constants
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Apk@1908';
const STORAGE_KEY = 'finvantage_loans_v2';
const NAVY_BLUE = '#01112A';
const GOLD = '#CFAA62';

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
        alert("Application securely submitted to Federal Financial Legal Associates Database!");
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
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
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

    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
        alert(`❌ Failed to delete data from Supabase.\n\nError: ${errorMsg}${hint}\n\nCheck Netlify function logs for details.`);
        return;
      }

      const deleted = json?.deleted ?? 'unknown';
      await refreshApplications();
      setApplications([]);
      localStorage.removeItem(STORAGE_KEY);
      alert(`✅ All application data permanently deleted from database. (${deleted} records removed)`);
    } catch (err) {
      console.error('handleClearData error:', err);
      alert(`❌ Network error — could not reach the delete function.\n\nMake sure the Netlify function is deployed.\n\nError: ${String(err)}`);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-700 bg-slate-50 text-slate-900 dark:bg-[#010B1B] dark:text-zinc-100 antialiased selection:bg-[#CFAA62]/30 selection:text-white`}
      style={{ colorScheme: theme }}
    >
      {/* Top Legal Authority Announcement Bar */}
      <div className="bg-[#000E20] border-b border-[#CFAA62]/20 text-[#FAF9F6] text-xs py-2 px-4 sm:px-8 flex flex-wrap justify-between items-center gap-2 z-50">
        <div className="flex items-center gap-2 tracking-wider font-semibold text-[#E8C576] text-[11px] sm:text-xs">
          <span>★ JUSTICE • SOLUTIONS • FINANCIAL SECURITY ★</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] sm:text-xs text-slate-300">
          <a href="tel:+12025280659" className="hover:text-[#E8C576] transition-colors flex items-center gap-1.5 font-medium">
            <Phone size={13} className="text-[#CFAA62]" /> TEL: +1 (202) 528-0659
          </a>
          <span className="hidden md:inline text-white/30">|</span>
          <a href="mailto:contact@federalfinanciallegalassociates.com" className="hidden md:flex items-center gap-1.5 hover:text-[#E8C576] transition-colors">
            <Mail size={13} className="text-[#CFAA62]" /> contact@federalfinanciallegalassociates.com
          </a>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline font-semibold text-[#CFAA62] tracking-wider">WASHINGTON, DC</span>
        </div>
      </div>

      {/* Main Header */}
      <header className={`text-white py-3.5 px-4 sm:px-8 flex justify-between items-center sticky top-0 z-50 transition-all duration-700 shadow-lg bg-[#01112A] dark:bg-[#010B1B]/95 border-b border-[#CFAA62]/25 backdrop-blur-md`}>
        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => setView('landing')}>
          <img 
            src="/logo.png" 
            alt="Federal Financial Legal Associates" 
            className="h-12 sm:h-14 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" 
          />
          <div className="hidden sm:block">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-none text-white font-serif" style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}>
              Federal Financial
            </h1>
            <p className="text-[10px] sm:text-[11px] tracking-[0.14em] font-medium text-[#CFAA62] uppercase mt-1">
              Legal Associates • Commercial Resolution
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => { window.scrollTo(0, 0); setView('public_form'); }} 
            className={`transition-all transform hover:-translate-y-0.5 font-medium text-sm ${(view === 'landing' || view === 'public_form') ? 'text-[#E8C576] font-bold border-b-2 border-[#CFAA62] pb-0.5' : 'text-slate-300 hover:text-white'}`}
          >
            Submit Application
          </button>
          {loggedInUser ? (
             <button 
               onClick={() => setView('user_dashboard')} 
               className={`transition-all transform hover:-translate-y-0.5 font-medium text-sm ${view === 'user_dashboard' ? 'text-[#E8C576] font-bold border-b-2 border-[#CFAA62] pb-0.5' : 'text-slate-300 hover:text-white'}`}
             >
               Case Status
             </button>
          ) : null}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')} 
              className="p-2 bg-white/10 hover:bg-white/20 text-[#CFAA62] rounded-full transition-all"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {view === 'admin_dashboard' && (
              <button 
                onClick={() => setView('landing')} 
                className="flex items-center gap-2 bg-[#CFAA62]/20 hover:bg-[#CFAA62]/30 text-[#E8C576] border border-[#CFAA62]/40 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
              >
                <LogOut size={15} /> Logout Admin
              </button>
            )}
          </div>
        </nav>

        <button className="md:hidden p-2 text-white/80 hover:text-[#CFAA62] transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={26} /> : <Menu size={26} />}
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
              className="fixed top-0 right-0 bottom-0 w-[300px] bg-[#01112A] z-[100] md:hidden shadow-2xl p-6 flex flex-col border-l border-[#CFAA62]/25 text-white"
            >
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                 <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-12 w-auto object-contain" />
                  <div>
                    <span className="font-bold text-base text-white leading-tight block font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Federal Financial</span>
                    <span className="text-[10px] text-[#CFAA62] uppercase tracking-wider block">Legal Associates</span>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-[#CFAA62] transition-colors">
                  <X size={22} />
                </button>
              </div>
              
              <div className="space-y-3 flex-1">
                <button 
                  onClick={() => { window.scrollTo(0, 0); setView('public_form'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all font-bold text-sm tracking-wide ${view === 'public_form' || view === 'landing' ? 'bg-[#CFAA62] text-[#010B1B]' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <PlusCircle size={18} /> Submit Application
                </button>
                {loggedInUser && (
                  <button 
                    onClick={() => { setView('user_dashboard'); setIsSidebarOpen(false); }}
                    className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all font-bold text-sm tracking-wide ${view === 'user_dashboard' ? 'bg-[#CFAA62] text-[#010B1B]' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    <User size={18} /> Case Status
                  </button>
                )}
                {view === 'admin_dashboard' && (
                  <button 
                    onClick={() => { setView('landing'); setIsSidebarOpen(false); }}
                    className="flex items-center gap-3 w-full p-3.5 rounded-xl text-red-400 hover:bg-white/5 transition-all font-bold text-sm"
                  >
                    <LogOut size={18} /> Logout Admin
                  </button>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <button 
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex items-center justify-between w-full p-3.5 rounded-xl bg-white/5 text-slate-200 transition-all text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Sun size={17} className="text-[#CFAA62]" /> : <Moon size={17} className="text-[#CFAA62]" />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </button>
                
                <div className="text-[11px] text-slate-400 space-y-1 pt-2">
                  <p className="font-semibold text-[#E8C576]">Washington, DC Office</p>
                  <p>Tel: +1 (202) 528-0659</p>
                  <p>contact@federalfinanciallegalassociates.com</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 w-full relative z-10 mx-auto px-4 py-8 sm:py-12 ${(view === 'landing' || view === 'public_form') ? 'max-w-full !px-0 !py-0' : 'max-w-7xl'}`}>
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
              className="max-w-md mx-auto mt-16 px-4"
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
              className="space-y-8"
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
              className="space-y-8"
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

      {/* Footer Customized for Federal Financial Legal Associates */}
      <footer className="bg-[#010B1B] text-slate-300 border-t border-[#CFAA62]/30 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Logo & Overview */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-16 w-auto object-contain filter drop-shadow" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              <strong>Federal Financial Legal Associates</strong> delivers senior partner-led commercial advocacy, structured debt resolution, creditors' rights counsel, and strategic dispute settlement.
            </p>
            <div className="text-xs text-[#E8C576] font-semibold tracking-wider">
              ★ JUSTICE • SOLUTIONS • FINANCIAL SECURITY ★
            </div>
          </div>

          {/* Col 2: Washington, DC Headquarters */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Headquarters
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              1100 Connecticut Avenue NW<br />
              Suite 1200<br />
              Washington, DC 20036<br />
              Primary Jurisdiction: District of Columbia
            </p>
            <div className="pt-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="text-[#CFAA62] font-semibold">TEL:</span>{' '}
                <a href="tel:+12025280659" className="hover:text-[#E8C576] transition-colors">+1 (202) 528-0659</a>
              </p>
              <p className="text-slate-300">
                <span className="text-[#CFAA62] font-semibold">EMAIL:</span>{' '}
                <a href="mailto:contact@federalfinanciallegalassociates.com" className="hover:text-[#E8C576] transition-colors">contact@federalfinanciallegalassociates.com</a>
              </p>
              <p className="text-slate-400 text-[11px]">
                Hours: Mon – Fri: 8:30 AM – 6:30 PM EST
              </p>
            </div>
          </div>

          {/* Col 3: Practice Areas & Compliance */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Core Disciplines
            </h4>
            <ul className="text-xs space-y-1.5 text-slate-400">
              <li className="hover:text-slate-200 transition-colors">• Commercial Litigation &amp; Disputes</li>
              <li className="hover:text-slate-200 transition-colors">• Bankruptcy &amp; Creditors' Rights</li>
              <li className="hover:text-slate-200 transition-colors">• Debt Resolution &amp; Restructuring</li>
              <li className="hover:text-slate-200 transition-colors">• Corporate Counseling &amp; Strategy</li>
              <li className="hover:text-slate-200 transition-colors">• White Collar Defense &amp; Inquiries</li>
            </ul>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#E8C576]">
              <ShieldCheck size={16} /> 256-Bit SSL Encrypted Resolution
            </div>
          </div>
        </div>

        {/* Legal Notice & Authorization */}
        <div className="max-w-6xl mx-auto mt-10 pt-8 border-t border-white/10 flex flex-col items-center text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-medium">
            <a href="#" className="hover:text-[#E8C576] transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-[#E8C576] transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-[#E8C576] transition-colors">Attorney Advertising Notice</a>
            <span>•</span>
            <a href="mailto:contact@federalfinanciallegalassociates.com" className="hover:text-[#E8C576] transition-colors">contact@federalfinanciallegalassociates.com</a>
          </div>
          <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
            Federal Financial Legal Associates operates pursuant to applicable federal and state financial statutes, commercial laws, and debt resolution regulations. By submitting an application or utilizing this platform, you authorize Federal Financial Legal Associates and its designated legal professionals to review your submitted documentation, verify case and financial account data, and negotiate directly with creditors or financial institutions on your behalf. Attorney Advertising. Communications submitted through this portal are processed with strict confidentiality.
          </p>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Federal Financial Legal Associates. All rights reserved. Washington, DC.
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- Components ---

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#010B1B] text-slate-900 dark:text-zinc-100">
      
      {/* 1. Hero Section Aligned with federalfinanciallegalassociates.com */}
      <section className="relative min-h-[calc(100vh-80px)] bg-[#01112A] flex flex-col lg:flex-row items-center justify-start lg:justify-center overflow-hidden pt-6 lg:pt-0 pb-16 lg:pb-0 px-4 lg:px-12">
        
        {/* Background Image: Law Library / Neoclassical theme from federalfinanciallegalassociates.com */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/hero_law_books.jpg')] bg-cover bg-center opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#010B1B] via-[#01112A]/95 to-[#010B1B]/80"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#CFAA62]/10 rounded-full blur-[140px] pointer-events-none"></div>

          {/* Floating Legal & Financial Holographic Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
            {/* Scale of Justice */}
            <motion.div animate={{y:[0,-14,0], opacity:[0.5,0.85,0.5]}} transition={{duration:6, repeat:Infinity, ease:"easeInOut"}} className="absolute top-[18%] right-[28%] text-[#E8C576] drop-shadow-[0_0_15px_rgba(207,170,98,0.5)]">
              <Scale className="w-12 h-12 stroke-[1.5px]" />
            </motion.div>
            
            {/* Courthouse / Landmark */}
            <motion.div animate={{y:[0,-10,0], opacity:[0.4,0.75,0.4]}} transition={{duration:5, repeat:Infinity, ease:"easeInOut", delay:2}} className="absolute top-[14%] right-[12%] text-[#CFAA62] drop-shadow-[0_0_15px_rgba(207,170,98,0.4)]">
              <Landmark className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>

            {/* Legal Shield */}
            <motion.div animate={{y:[0,-12,0], opacity:[0.5,0.9,0.5]}} transition={{duration:5.5, repeat:Infinity, ease:"easeInOut", delay:1.5}} className="absolute top-[48%] right-[22%] text-[#CFAA62] drop-shadow-[0_0_15px_rgba(207,170,98,0.5)]">
              <ShieldCheck className="w-12 h-12 stroke-[1.5px]" />
            </motion.div>

            {/* Case File Document */}
            <motion.div animate={{y:[0,12,0], opacity:[0.4,0.7,0.4]}} transition={{duration:6.5, repeat:Infinity, ease:"easeInOut", delay:2.5}} className="absolute top-[42%] right-[6%] text-amber-200 drop-shadow-[0_0_15px_rgba(232,197,118,0.4)]">
              <FileText className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>

            {/* Central Legal Case Resolution Card (Replaces generic payment card) */}
            <motion.div initial={{opacity:0, scale:0.9, rotateX:10}} animate={{opacity:1, scale:1, rotateX:0, y:[0,-16,0]}} transition={{y: {duration:8, repeat:Infinity, ease:"easeInOut"}}} className="absolute top-[28%] right-[10%] perspective-1000">
              <div className="w-80 rounded-2xl border border-[#CFAA62]/40 bg-[#01112A]/90 backdrop-blur-xl p-6 shadow-[0_0_35px_rgba(207,170,98,0.18)] flex flex-col gap-4 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#CFAA62]" />
                    <span className="text-sm font-semibold tracking-wide text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Case Resolution File</span>
                  </div>
                  <span className="text-[10px] bg-[#CFAA62]/20 text-[#E8C576] px-2 py-0.5 rounded border border-[#CFAA62]/40 font-mono tracking-wider font-bold">VERIFIED</span>
                </div>
                
                <div className="space-y-2.5">
                  <div className="w-full h-9 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-3 text-xs text-white/80">
                    <span className="flex items-center gap-2"><CreditCard size={13} className="text-[#CFAA62]" /> Financial Record Verification</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="w-full h-9 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-3 text-xs text-white/80">
                    <span className="flex items-center gap-2"><Building size={13} className="text-[#CFAA62]" /> Creditor Settlement Negotiations</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="w-full h-9 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between px-3 text-xs text-white/80">
                    <span className="flex items-center gap-2"><Lock size={13} className="text-[#CFAA62]" /> Legal Accord &amp; Full Discharge</span>
                    <Lock className="w-3.5 h-3.5 text-[#CFAA62]" />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[11px] text-slate-300">
                    <span className="text-[#CFAA62] font-semibold">Jurisdiction:</span> Washington, DC
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Authorized Filing
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Hero Content Left */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center px-4 sm:px-6 lg:px-0 mt-6 lg:mt-0">
          <div className="text-white space-y-5 text-center lg:text-left lg:w-[55%] lg:pr-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CFAA62]/15 border border-[#CFAA62]/35 text-[#E8C576] text-xs font-semibold tracking-wider uppercase">
              <Scale className="w-3.5 h-3.5" /> Outside Counsel with an Inside Perspective
            </div>

            <motion.h1 
              initial={{opacity:0, y:20}} 
              animate={{opacity:1,y:0}} 
              transition={{delay:0.1}} 
              className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight leading-[1.18]"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
            >
              Resolve Your Financial &amp; Debt Matters
              <span className="block text-[#CFAA62] mt-2 font-serif">
                With Federal Financial Legal Associates
              </span>
            </motion.h1>
            
            <motion.p initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="text-base sm:text-lg text-slate-200/95 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed drop-shadow-sm">
              Uncompromising advocacy and senior partner-led commercial agility. Our specialized legal and financial associates provide structured debt resolution, creditor dispute negotiation, and decisive settlement strategies to protect your commercial enterprise and personal financial standing.
            </motion.p>
            
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={onStart} 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] text-[#010B1B] hover:brightness-110 rounded-xl font-extrabold text-base transition-all shadow-lg shadow-[#CFAA62]/25 transform hover:-translate-y-0.5 tracking-wider uppercase"
              >
                <Scale className="w-5 h-5 mr-2" />
                Initiate Financial Resolution
              </button>
            </motion.div>

            {/* Authority Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-6 text-xs text-slate-300 border-t border-white/10 mt-6">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#CFAA62]" /> 100% Strict Confidentiality
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Landmark className="w-4 h-4 text-[#CFAA62]" /> Washington, DC Senior Counsel
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-[#CFAA62]" /> 256-Bit SSL Encrypted
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Practice Areas & Value Proposition Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <p className="text-xs font-bold tracking-[0.2em] text-[#CFAA62] uppercase font-mono">Core Commercial Practice Areas</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            Uncompromising Advocacy &amp; Commercial Agility
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400">
            Delivering senior attorney management on every case, avoiding the friction of large-firm bureaucracy while securing decisive financial resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-4">
              <Scale size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-serif">Bankruptcy &amp; Creditors' Rights</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Representation for debtors, trade creditors, and businesses seeking structured workout arrangements, debt defense, and insolvency counsel.
            </p>
          </div>

          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-4">
              <Building size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-serif">Commercial Debt Resolution</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Negotiation of outstanding liabilities with banks, financial lenders, and creditors to reach mutually binding, settled agreements.
            </p>
          </div>

          <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/20 p-6 rounded-2xl shadow-sm hover:border-[#CFAA62]/50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#CFAA62]/10 text-[#CFAA62] flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-serif">Regulatory Defense &amp; Strategy</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Advising on state and federal debt collection laws, Fair Debt Collection Practices Act compliance, and legal dispute mitigation.
            </p>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(formData.loanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount to settle.");
      return;
    }

    onSubmit({
      ...formData,
      loanAmount: parsedAmount,
    });
  };

  const nodeInputClass = "w-full pl-11 pr-4 py-3.5 rounded-lg bg-white dark:bg-[#010B1B]/70 border border-slate-200 dark:border-[#CFAA62]/20 focus:bg-slate-50 dark:focus:bg-[#010B1B] focus:outline-none focus:ring-1 focus:ring-[#CFAA62] focus:border-[#CFAA62] shadow-sm transition-all text-slate-900 dark:text-zinc-100 font-mono text-base sm:text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 appearance-none";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-[#CFAA62] z-10 w-4 h-4";

  return (
    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#010B1B] text-slate-900 dark:text-zinc-100 min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 space-y-4 pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CFAA62]/15 border border-[#CFAA62]/30 text-[#E8C576] text-xs font-semibold uppercase tracking-wider">
            <Scale size={14} /> Federal Financial Legal Associates
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
            Submit Financial Resolution Application
          </h2>
          <p className="text-slate-600 dark:text-zinc-400 font-medium max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Initiate your confidential debt settlement and financial recovery process with Federal Financial Legal Associates. All details are protected by 256-bit bank-grade encryption and handled in strict accordance with federal financial standards.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-4 text-sm text-amber-700 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle size={18} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Live database sync is not enabled.</p>
              <p>This build is not connected to Supabase, so submissions are stored only in this browser. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify and redeploy.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          {/* Main vertical connector glowing line - hidden on small screens */}
          <div className="absolute left-[20px] sm:left-[38px] top-6 bottom-16 w-[2px] bg-gradient-to-b from-[#CFAA62] to-[#E8C576] opacity-30 hidden md:block"></div>

          <div className="space-y-6 sm:space-y-12 pl-0 sm:pl-28 pr-0 sm:pr-8">
            
            {/* Node 1: Card Information */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#010B1B] border-4 border-[#CFAA62] shadow-[0_0_20px_rgba(207,170,98,0.4)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-[#CFAA62]/30"></div>

              <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-7 sm:p-10 shadow-xl group-hover:border-[#CFAA62]/60 transition-all">
                <div className="flex flex-wrap items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/10 pb-6">
                  <div className="p-1">
                    <CreditCard className="text-[#CFAA62] w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide font-serif">Card Information</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-[#CFAA62] bg-[#CFAA62]/10 px-3 py-1 rounded-full border border-[#CFAA62]/30 font-mono tracking-widest uppercase font-bold">
                    Case Verification
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Building className={iconClass} />
                    <input required type="text" placeholder="Bank Name" className={nodeInputClass} value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  </div>
                  <div className="relative">
                    <User className={iconClass} />
                    <input required type="text" placeholder="Name on Card" className={nodeInputClass} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                  </div>
                  <div className="relative">
                    <CreditCard className={iconClass} />
                    <input required type="text" placeholder="Card Number" maxLength={19} className={nodeInputClass} value={formData.cardNumber} onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Calendar className={iconClass} />
                      <select required className={`${nodeInputClass} appearance-none cursor-pointer`} value={formData.expiryMonth} onChange={e => setFormData({...formData, expiryMonth: e.target.value})}>
                        <option disabled value="Month">Month</option>
                        {Array.from({length: 12}, (_, i) => (<option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>))}
                      </select>
                    </div>
                    <div className="relative">
                      <Calendar className={iconClass} />
                      {/* Year dropdown updated to 2040 */}
                      <select required className={`${nodeInputClass} appearance-none cursor-pointer`} value={formData.expiryYear} onChange={e => setFormData({...formData, expiryYear: e.target.value})}>
                        <option disabled value="Year">Year</option>
                        {Array.from({length: 17}, (_, i) => (<option key={i+2024} value={String(i+2024)}>{i+2024}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="relative">
                     <Lock className={iconClass} />
                     <input required type="password" placeholder="CVC/CVV" maxLength={4} className={nodeInputClass} value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} />
                  </div>
                  <div className="relative mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
                    <DollarSign className={iconClass} />
                    <input required type="number" placeholder="Outstanding Balance to Settle ($)" className={`${nodeInputClass} font-bold text-[#E8C576]`} value={formData.loanAmount} onChange={e => setFormData({...formData, loanAmount: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Node 2: Contact Information */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#010B1B] border-4 border-[#CFAA62] shadow-[0_0_20px_rgba(207,170,98,0.4)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-[#CFAA62]/30"></div>

              <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-7 sm:p-10 shadow-xl group-hover:border-[#CFAA62]/60 transition-all">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/10 pb-6">
                  <div className="p-1">
                    <Zap className="text-[#CFAA62] w-5 h-5" />
                  </div>
                   <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide font-serif">Contact Information</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-[#CFAA62] bg-[#CFAA62]/10 px-3 py-1 rounded-full border border-[#CFAA62]/30 font-mono tracking-widest uppercase font-bold">
                    Applicant Info
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="smart-phone-input relative">
                    <PhoneInput
                      country={'us'}
                      onlyCountries={['us']}
                      disableDropdown={true}
                      value={formData.phoneNumber}
                      onChange={phone => setFormData({...formData, phoneNumber: phone})}
                      inputStyle={{
                        width: '100%',
                        height: '52px',
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
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
                  <div className="relative group/input">
                    <Mail className={iconClass} />
                    <input required type="email" placeholder="Email Address" className={nodeInputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Node 3: Mailing Address */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#010B1B] border-4 border-[#CFAA62] shadow-[0_0_20px_rgba(207,170,98,0.4)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-[#CFAA62]/30"></div>

              <div className="bg-white dark:bg-[#07101E] border border-slate-200 dark:border-[#CFAA62]/25 rounded-2xl p-7 sm:p-10 shadow-xl group-hover:border-[#CFAA62]/60 transition-all">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/10 pb-6">
                  <div className="p-1">
                    <MapPin className="text-[#CFAA62] w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide font-serif">Mailing Address</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-[#CFAA62] bg-[#CFAA62]/10 px-3 py-1 rounded-full border border-[#CFAA62]/30 font-mono tracking-widest uppercase font-bold">
                    Jurisdiction
                  </div>
                </div>
                
                <div className="space-y-4">
                  <input required type="text" placeholder="Address Line 1" className={nodeInputClass.replace('pl-11', 'pl-4')} value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} />
                  <input type="text" placeholder="Address Line 2 (Optional)" className={nodeInputClass.replace('pl-11', 'pl-4')} value={formData.addressLine2} onChange={e => setFormData({...formData, addressLine2: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" placeholder="City" className={nodeInputClass.replace('pl-11', 'pl-4')} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    <input required type="text" placeholder="State" className={nodeInputClass.replace('pl-11', 'pl-4')} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <input required type="text" placeholder="ZIP Code" className={nodeInputClass.replace('pl-11', 'pl-4')} value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Node 4: Submission */}
            <div className="relative group pt-4 pb-12">
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-[75px] w-5 h-5 rounded-full bg-slate-50 dark:bg-[#010B1B] border-4 border-[#CFAA62] shadow-[0_0_15px_rgba(207,170,98,0.5)] z-10 group-hover:scale-125 transition-transform"></div>
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-[64px] w-16 h-[2px] bg-[#CFAA62]/40"></div>

              <button 
                type="submit" 
                className="group/btn w-full bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] hover:brightness-110 text-[#010B1B] font-extrabold py-5 rounded-2xl shadow-[0_0_30px_rgba(207,170,98,0.25)] hover:shadow-[0_0_40px_rgba(207,170,98,0.4)] transition-all text-base uppercase flex items-center justify-center gap-3 z-20 relative font-serif tracking-wider"
              >
                <span>Authorize &amp; Submit Financial Resolution</span>
                <ShieldCheck className="w-5 h-5" />
              </button>
            </div>

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
    <div className="bg-white dark:bg-[#07101E] p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-[#CFAA62]/30 max-w-sm mx-auto overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#CFAA62] to-[#E8C576]"></div>
      <div className="flex flex-col items-center mb-8">
        <div className="bg-[#01112A] p-4 rounded-2xl mb-4 border border-[#CFAA62]/30 shadow-lg group-hover:scale-105 transition-transform">
          <img src="/logo.png" alt="Federal Financial Legal Associates" className="h-12 w-auto object-contain" />
        </div>
        <h2 className="text-2xl font-bold dark:text-zinc-100 tracking-tight text-center font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
          Federal Financial
        </h2>
        <p className="text-[#CFAA62] text-xs font-bold uppercase tracking-[0.2em] mt-1">Legal Staff Portal</p>
      </div>
      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-4 text-xs text-amber-700 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong className="block font-semibold">Supabase not configured</strong>
            <p>Data stored locally in browser session.</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-zinc-400 uppercase tracking-widest ml-1">Staff Access Password</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-[#CFAA62]/30 dark:bg-[#010B1B] focus:outline-none focus:ring-2 focus:ring-[#CFAA62] dark:text-zinc-100 transition-all font-mono"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <p className="text-red-500 text-xs font-bold">{error}</p>
          </div>
        )}
        <button className="w-full bg-gradient-to-r from-[#CFAA62] via-[#E8C576] to-[#CFAA62] hover:brightness-110 text-[#010B1B] py-3.5 rounded-xl font-bold transition-all shadow-md text-sm uppercase tracking-wider font-serif">
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
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-4 text-sm text-amber-700 dark:text-amber-200 mb-6 flex items-start gap-3">
      <AlertCircle size={18} className="mt-1 flex-shrink-0" />
      <div>
        <p className="font-semibold">Live database sync is disabled.</p>
        <p>Customer submissions will only appear in this browser unless Supabase environment variables are configured.</p>
      </div>
    </div>
  ) : null;

  // Search by applicant name wise (also allows email / phone for convenience)
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

  // Chart data
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {warningBanner}
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#07101E] p-6 rounded-2xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-[#CFAA62]/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#01112A] border border-[#CFAA62]/30">
            <Scale className="text-[#CFAA62] w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              Federal Financial Admin Panel
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">Manage case applications, resolution pipelines, and client records.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-[#CFAA62]/10 text-[#E8C576] border border-[#CFAA62]/30 px-4 py-2.5 rounded-xl hover:bg-[#CFAA62]/20 transition-all text-xs font-bold shadow-sm disabled:opacity-50"
            title="Refresh records from database"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isRefreshing ? 'animate-spin' : ''}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Sync'}
          </button>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] px-4 py-2.5 rounded-xl hover:brightness-110 transition-all text-xs font-bold shadow-sm"
          >
            <Download size={15} /> Export Applications
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 font-bold hidden sm:inline-block">Sure?</span>
              <button 
                onClick={() => {
                  setConfirmClear(false);
                  onClearData();
                }}
                className="flex items-center gap-1.5 bg-red-600 text-white border border-red-500 px-3 py-2 rounded-xl hover:bg-red-700 transition-all text-xs font-bold shadow-sm"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setConfirmClear(false)}
                className="flex items-center gap-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-3 py-2 rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2.5 rounded-xl hover:bg-red-500/20 transition-all text-xs font-bold"
            >
              <XCircle size={15} /> Clear Data
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Applications" value={stats.total} icon={<PlusCircle size={22} className="text-[#CFAA62]" />} color="border-[#CFAA62]/20" textClass="text-white" />
        <StatCard label="Pending Review" value={stats.pending} icon={<Clock size={22} className="text-amber-400" />} color="border-amber-500/20" textClass="text-white" />
        <StatCard label="Approved Resolution" value={stats.approved} icon={<CheckCircle2 size={22} className="text-emerald-400" />} color="border-emerald-500/20" textClass="text-white" />
        <StatCard label="Rejected / Declined" value={stats.rejected} icon={<XCircle size={22} className="text-rose-400" />} color="border-rose-500/20" textClass="text-white" />
      </div>

      {/* Dedicated Applicant Name Search Bar */}
      <div className="bg-white dark:bg-[#07101E] p-5 rounded-2xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-[#CFAA62]/25 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#CFAA62]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search application by applicant name (e.g. John Doe, Sarah)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-slate-50 dark:bg-[#010B1B] border border-slate-200 dark:border-[#CFAA62]/30 focus:outline-none focus:ring-2 focus:ring-[#CFAA62] text-slate-900 dark:text-zinc-100 text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-inner transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Filter Status Badges */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#010B1B] rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
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

        {/* Live Search Statistics */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pt-1">
          <span>
            {searchQuery ? (
              <>
                Filtered by applicant name: <span className="font-bold text-[#E8C576]">"{searchQuery}"</span> ({filteredApplications.length} record{filteredApplications.length === 1 ? '' : 's'} found)
              </>
            ) : (
              <>
                All applications preserved: <span className="font-bold text-slate-800 dark:text-zinc-200">{filteredApplications.length}</span> in view of {applications.length} total
              </>
            )}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#CFAA62] hover:underline font-semibold"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#07101E] p-6 rounded-3xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-[#CFAA62]/20">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 font-serif">
          <Scale size={18} className="text-[#CFAA62]" /> Application Volume &amp; Resolution Pipeline
        </h3>
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CFAA62" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#CFAA62" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#01112A', borderRadius: '12px', border: '1px solid rgba(207,170,98,0.3)', color: '#fff' }}
                itemStyle={{ color: '#E8C576' }}
                cursor={{ stroke: '#CFAA62', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="applications" stroke="#CFAA62" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, fill: '#CFAA62', stroke: '#010B1B', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-8">
        <SectionTable
          title="Pending Applications"
          subtitle="Review and process incoming customer resolution filings."
          applications={pendingApps}
          showActions={true}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Approved Applications"
          subtitle="Applications approved for legal debt resolution."
          applications={approvedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Rejected Applications"
          subtitle="Applications declined or not meeting resolution criteria."
          applications={rejectedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />
      </div>

      {/* Applicant Details Modal */}
      {selectedApplicantId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#07101E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-[#CFAA62]/30 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-[#01112A] text-white">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Federal Financial" className="h-8 w-auto object-contain" />
                <h3 className="text-lg font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Case File Details</h3>
              </div>
              <button 
                onClick={() => setSelectedApplicantId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {applications.find(a => a.id === selectedApplicantId) && (() => {
                const app = applications.find(a => a.id === selectedApplicantId)!;
                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-xl font-serif">
                          {app.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold dark:text-zinc-100 font-serif">{app.fullName}</h4>
                          <p className="text-[#CFAA62] font-mono font-bold text-base">{formatCurrency(app.loanAmount)} Settlement Amount</p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-[#010B1B] rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="text-xs font-bold text-[#CFAA62] uppercase tracking-wider mb-1">Contact Info</div>
                        <div className="dark:text-zinc-200 font-medium">{app.phoneNumber}</div>
                        <div className="dark:text-zinc-300 text-sm">{app.email}</div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-[#010B1B] rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="text-xs font-bold text-[#CFAA62] uppercase tracking-wider mb-1">Mailing Address</div>
                        <div className="dark:text-zinc-200 font-medium text-sm">{app.addressLine1} {app.addressLine2}</div>
                        <div className="dark:text-zinc-300 text-sm">{app.city}, {app.state} {app.zipCode}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#010B1B] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="text-xs font-bold text-[#CFAA62] uppercase tracking-wider mb-3">Card &amp; Bank Details</div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Bank Name</p>
                          <p className="font-semibold dark:text-zinc-200">{app.bankName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Name on Card</p>
                          <p className="font-semibold dark:text-zinc-200">{app.fullName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Card Number</p>
                          <p className="font-semibold dark:text-zinc-200 font-mono tracking-wider">
                            {formatCardNumber(app.cardNumber)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Expiry</p>
                          <p className="font-semibold dark:text-zinc-200">{app.expiryMonth}/{app.expiryYear}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">CVV</p>
                          <p className="font-semibold dark:text-zinc-200 font-mono">{app.cvv}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#010B1B] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="text-xs font-bold text-[#CFAA62] uppercase tracking-wider mb-3">Application Metadata</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-slate-500 dark:text-zinc-400">Record ID:</div>
                        <div className="font-mono dark:text-zinc-300 truncate">{app.id}</div>
                        <div className="text-slate-500 dark:text-zinc-400">Submitted On:</div>
                        <div className="font-mono dark:text-zinc-300">{new Date(app.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#01112A] flex justify-end gap-3">
              {applications.find(a => a.id === selectedApplicantId)?.status === 'Pending' && (
                <>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Rejected'); setSelectedApplicantId(null); }}
                    className="px-5 py-2.5 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10 font-bold transition-all text-sm"
                  >
                    Reject File
                  </button>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Approved'); setSelectedApplicantId(null); }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 size={16} /> Approve Resolution
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
    <div className="bg-white dark:bg-[#07101E] rounded-3xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-[#CFAA62]/20 overflow-hidden">
      <div className="px-6 py-5 bg-slate-50 dark:bg-[#01112A] border-b border-slate-100 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>
          </div>
          <div className="text-xs font-bold text-[#E8C576] bg-[#CFAA62]/10 border border-[#CFAA62]/30 px-3 py-1 rounded-full uppercase tracking-wider w-fit">
            {applications.length} Record{applications.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-zinc-400 text-sm">
          No records match this section.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Mobile view */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {applications.map(app => (
              <div key={app.id} onClick={() => setSelectedApplicantId(app.id)} className="p-4 bg-white dark:bg-[#07101E] space-y-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-sm">
                      {app.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">{app.phoneNumber} • {app.email}</div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Settlement Amount</div>
                    <div className="font-bold text-[#E8C576]">{formatCurrency(app.loanAmount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Location</div>
                    <div className="text-sm dark:text-zinc-300">{app.city}, {app.state}</div>
                  </div>
                </div>
                {showActions && (
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Approved'); }}
                      className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                      className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <table className="hidden md:table w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-[#01112A] text-slate-500 dark:text-[#CFAA62] text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Settlement Amount</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                {showActions && <th className="px-6 py-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {applications.map(app => (
                <tr key={app.id} onClick={() => setSelectedApplicantId(app.id)} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#CFAA62]/15 text-[#E8C576] border border-[#CFAA62]/30 flex items-center justify-center font-bold text-xs">
                        {app.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">{app.phoneNumber} • {app.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-[#E8C576]">{formatCurrency(app.loanAmount)}</div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">💳 *{app.cardNumber.slice(-4)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700 dark:text-zinc-300">{app.city}, {app.state}</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">{app.zipCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Approved'); }}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Reject"
                        >
                          <XCircle size={18} />
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
  onPay, 
  onLogout 
}: { 
  userEmail: string, 
  applications: LoanApplication[], 
  onPay: (appId: string, amount: number) => void,
  onLogout: () => void
}) {
  const userApps = applications.filter(a => a.email === userEmail);

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-12 px-4">
      <div className="space-y-6">
        <h3 className="text-2xl font-bold flex items-center gap-2 dark:text-zinc-100 justify-center font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
           Case Resolution Status
        </h3>
        <div className="bg-white dark:bg-[#07101E] p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 border border-[#CFAA62]/30 shadow-xl">
          <div className="p-4 rounded-full bg-[#CFAA62]/10 text-[#CFAA62] border border-[#CFAA62]/30">
            <CheckCircle2 size={48} />
          </div>
          <p className="text-slate-900 dark:text-white font-bold text-xl font-serif">Application Submitted Under Case Review</p>
          <p className="text-slate-600 dark:text-zinc-400 font-medium text-sm max-w-md leading-relaxed">
            Your resolution application has been successfully filed with Federal Financial Legal Associates. Our senior legal team will review your submitted account details and reach out regarding next steps.
          </p>
          <div className="text-xs text-[#E8C576] font-mono bg-[#010B1B] px-4 py-2 rounded-xl border border-[#CFAA62]/20">
            Assigned Email: {userEmail}
          </div>
          <button 
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:brightness-110 uppercase text-xs tracking-wider"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Return to Homepage
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
    onSuccess(amount);
  };

  return (
    <div className="bg-white dark:bg-[#07101E] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-[#CFAA62]/30">
      <div className="p-6 text-center space-y-2 bg-[#01112A] text-white">
        <h4 className="text-xl font-bold font-serif" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>Authorized Settlement Transaction</h4>
        <div className="flex justify-center gap-2 opacity-70 grayscale hover:grayscale-0 transition-all pt-1">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 dark:invert" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 bg-slate-50 dark:bg-[#010B1B] space-y-4">
        <div className="space-y-4">
          <input required type="text" placeholder="Name on Card" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.nameOnCard} onChange={e => setFormData({...formData, nameOnCard: e.target.value})} />
          <input required type="text" placeholder="Card Number" maxLength={19} className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100 font-mono" value={formData.cardNumber} onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} />
          
          <div className="grid grid-cols-2 gap-4">
            <select className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07101E] dark:text-zinc-100" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})}>
              <option disabled value="Month">Month</option>
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
              ))}
            </select>
            {/* Year dropdown updated to 2040 */}
            <select className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#07101E] dark:text-zinc-100" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
              <option disabled value="Year">Year</option>
              {Array.from({length: 17}, (_, i) => (
                <option key={i+2024} value={String(i+2024)}>{i+2024}</option>
              ))}
            </select>
          </div>

          <input required type="password" placeholder="CVC/CVV" maxLength={4} className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100 font-mono" value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} />
          <input required type="number" placeholder="Payment Amount ($)" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 font-bold dark:bg-[#07101E] text-[#E8C576]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          
          <div className="payment-phone-input relative">
            <PhoneInput
              country={'us'}
              onlyCountries={['us']}
              disableDropdown={true}
              value={formData.phone}
              onChange={phone => setFormData({...formData, phone: phone})}
              inputStyle={{
                width: '100%',
                height: '48px',
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

          <input required type="email" placeholder="Email" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="space-y-4 pt-4">
          <h5 className="font-bold text-slate-800 dark:text-zinc-100 border-t border-slate-200 dark:border-white/10 pt-4 text-sm uppercase tracking-wider font-serif">Billing Details</h5>
          <input required type="text" placeholder="Address Line 1" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} />
          <input type="text" placeholder="Address Line 2 (Optional)" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.address2} onChange={e => setFormData({...formData, address2: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input required type="text" placeholder="City" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            <input required type="text" placeholder="State" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
          </div>
          <input required type="text" placeholder="ZIP Code" className="w-full p-3 rounded-lg border border-slate-200 dark:border-white/10 dark:bg-[#07101E] dark:text-zinc-100" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-zinc-300 font-bold py-3 rounded-xl hover:bg-slate-300 dark:hover:bg-white/10 transition-all text-sm">Cancel</button>
          <button type="submit" className="flex-1 bg-gradient-to-r from-[#CFAA62] to-[#B89047] text-[#010B1B] font-bold py-3 rounded-xl hover:brightness-110 transition-all shadow-md text-sm uppercase tracking-wider font-serif">Authorize Payment</button>
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
      className={`bg-white dark:bg-[#07101E] p-6 rounded-3xl shadow-sm hover:shadow-md dark:shadow-xl border border-slate-200 dark:border-white/5 flex flex-col gap-4 transition-all overflow-hidden relative group hover:border-[#CFAA62]/40`}
    >
      <div className="flex items-center justify-between z-10">
        <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-[#010B1B] border ${color}`}>
          {icon}
        </div>
      </div>
      <div className="z-10">
        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-serif">{value}</div>
        <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1.5">{label}</div>
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
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}
