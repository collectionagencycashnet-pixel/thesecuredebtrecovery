/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Secure Debt Recovery Application
 * Features: Loan applications, admin dashboard with approve/reject functionality,
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

const PosTerminalIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="8" width="14" height="14" rx="2" ry="2" />
    <rect x="7" y="10" width="10" height="4" rx="1" />
    <path d="M7 8V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4" />
    <path d="M7 5h10" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="12" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </svg>
);
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
const NAVY_BLUE = '#002147';

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
      // onInsert: a new customer just submitted → prepend to list
      (newApp) => {
        setApplications((prev) => {
          // Avoid duplicates (in case the submitting device already added it locally)
          const exists = prev.some((a) => a.id === newApp.id);
          if (exists) return prev;
          return [newApp, ...prev];
        });
      },
      // onUpdate: a status/payment change came in from another session
      (updatedApp) => {
        setApplications((prev) =>
          prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        );
      },
      // onDelete: trigger full re-fetch when any record is deleted
      async () => {
        const data = await fetchApplications();
        setApplications(data);
      }
    );
    realtimeChannelRef.current = channel;
  }

  // Cleanup subscription when component unmounts
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
      dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // Default 30 days due
    };
    
    if (isSupabaseConfigured) {
      try {
        await createApplication(newApp);
        setApplications(prev => [newApp, ...prev]);
        alert("Application securely submitted to Database!");
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

    // After applying, show user dashboard to track it
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
    
    // Helper to escape CSV fields, mitigating CSV injection and formatting issues
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      // Escape quotes and wrap in quotes
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
    link.setAttribute("download", `applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    try {
      if (isSupabaseConfigured) {
        // Use serverless function that calls Supabase with service_role key.
        const res = await fetch('/.netlify/functions/clear-applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': import.meta.env.VITE_ADMIN_PASSWORD || ''
          },
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Server delete failed: ${body}`);
        }
      } else {
        // fallback to local removal when Supabase not configured
        localStorage.removeItem(STORAGE_KEY);
      }

      // Clear UI state regardless
      setApplications([]);
      alert('All application data has been cleared.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Please check the console for details.');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-700 bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-zinc-100 antialiased selection:bg-rose-500/30 selection:text-white`}
      style={{ colorScheme: theme }}
    >
      {/* Header */}
      <header className={`text-white py-4 px-6 flex justify-between items-center sticky top-0 z-50 transition-all duration-700 shadow-md dark:shadow-none bg-[#002147] dark:bg-[#09090b]/80 dark:border-b dark:border-white/5 dark:backdrop-blur-md`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <div className={`p-2 rounded-lg transition-all bg-white dark:bg-rose-500 dark:shadow-[0_0_15px_rgba(244,63,94,0.4)]`}>
            <PosTerminalIcon className={`w-6 h-6 text-[#002147] dark:text-white`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none" style={{ fontFamily: 'Times New Roman, Times, serif' }}>Horizon Recovery</h1>
            <p className={`text-[10px] tracking-[0.05em] font-medium transition-colors opacity-80 dark:opacity-100 dark:text-rose-400 mt-1`}>Cash Net, Speedy Cash, Ace Cash, Cash America Financial Support</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => { window.scrollTo(0, 0); setView('public_form'); }} className={`transition-all transform hover:-translate-y-0.5 ${(view === 'landing' || view === 'public_form') ? 'text-white font-semibold dark:text-rose-400 dark:font-bold' : 'text-white/70 hover:text-white'}`}>Apply Now</button>
          {loggedInUser ? (
             <button onClick={() => setView('user_dashboard')} className={`transition-all transform hover:-translate-y-0.5 ${view === 'user_dashboard' ? 'text-white font-semibold dark:text-rose-400 dark:font-bold' : 'text-white/70 hover:text-white'}`}>My Dashboard</button>
          ) : null}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {view === 'admin_dashboard' && (
              <button 
                onClick={() => setView('landing')} 
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all text-sm font-medium"
              >
                <LogOut size={16} /> Logout Admin
              </button>
            )}
          </div>
        </nav>

        <button className="md:hidden p-2 text-white/80 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
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
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[90] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[300px] bg-white dark:bg-[#0a0a0c] z-[100] md:hidden shadow-2xl p-8 flex flex-col border-l border-slate-200 dark:border-white/10 backdrop-blur-xl"
            >
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#002147] dark:bg-rose-500 shadow-lg">
                    <PosTerminalIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900 dark:text-white leading-tight" style={{ fontFamily: 'Times New Roman, Times, serif' }}>Horizon Recovery</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 dark:text-white/60 hover:text-rose-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-2 flex-1">
                <MobileNavLink 
                  icon={<PlusCircle size={20} />} 
                  label="Apply Now" 
                  active={view === 'landing' || view === 'public_form'} 
                  onClick={() => { window.scrollTo(0, 0); setView('public_form'); setIsSidebarOpen(false); }} 
                />
                {loggedInUser && (
                  <MobileNavLink 
                    icon={<User size={20} />} 
                    label="My Dashboard" 
                    active={view === 'user_dashboard'} 
                    onClick={() => { setView('user_dashboard'); setIsSidebarOpen(false); }} 
                  />
                )}
                {view === 'admin_dashboard' && (
                  <MobileNavLink 
                    icon={<LogOut size={20} />} 
                    label="Logout Admin" 
                    active={false} 
                    onClick={() => { setView('landing'); setIsSidebarOpen(false); }} 
                  />
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-white/10 space-y-4">
                <button 
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/80 hover:text-[#002147] dark:hover:text-white transition-all text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-colors ${isDark ? 'bg-rose-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDark ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
                
                {view === 'admin_dashboard' && (
                  <button 
                    onClick={() => { setView('landing'); setIsSidebarOpen(false); }}
                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all text-sm font-bold border border-rose-500/20"
                  >
                    <LogOut size={18} />
                    Logout Admin
                  </button>
                )}
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
              className="max-w-md mx-auto mt-20"
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

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0a0f1c] border-t border-slate-200 dark:border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <PosTerminalIcon className="w-5 h-5 text-rose-500" />
              <span className="font-bold text-lg text-slate-900 dark:text-zinc-100" style={{ fontFamily: 'Times New Roman, Times, serif' }}>Horizon Recovery</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-500 text-sm">Professional Lending & Debt Recovery.</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 text-sm font-medium text-slate-500 dark:text-zinc-400">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="mailto:horizondebtrecovery.team@gmail.com" className="hover:text-slate-900 dark:hover:text-white transition-colors">horizondebtrecovery.team@gmail.com</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col items-center text-center">
          <p className="text-xs text-slate-400 dark:text-zinc-600 mb-4 max-w-4xl leading-relaxed">
            By submitting an application or viewing this site, you authorize our partners and affiliates to verify your personal, employment, and financial information to process your request in accordance with our Terms of Service and Privacy Policy. Information handling complies with applicable financial regulations. Horizon Recovery operates pursuant to federal and state debt or lending laws.
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-600">© {new Date().getFullYear()} Horizon Recovery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// --- Components ---

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#040914] text-slate-900 dark:text-zinc-100">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[calc(100vh-80px)] bg-[#09152b] dark:bg-[#070b14] flex flex-col lg:flex-row items-center justify-start lg:justify-center overflow-hidden pt-0 lg:pt-0 pb-16 lg:pb-0 px-0 lg:px-12">
        
        {/* Mobile & Tablet image */}
        <div className="w-full relative lg:hidden pt-4 px-4 bg-[#09152b] dark:bg-[#070b14]">
          <img src="/payment-exchange.png" alt="Payment Exchange" className="w-full h-auto aspect-[4/3] object-cover opacity-100 rounded-t-2xl shadow-[0_0_20px_rgba(56,189,248,0.15)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09152b] via-[#09152b]/5 to-transparent dark:from-[#070b14] dark:via-[#070b14]/5 dark:to-transparent"></div>
        </div>

        {/* Desktop Background Area */}
        <div className="absolute inset-0 hidden lg:block">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2500&auto=format&fit=crop')] bg-cover bg-center opacity-60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#09152b] via-[#09152b]/80 to-transparent dark:from-[#070b14] dark:via-[#070b14]/80 dark:to-transparent"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Floating Holographic Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
            {/* Globe */}
            <motion.div animate={{y:[0,-15,0], opacity:[0.5,0.8,0.5]}} transition={{duration:6, repeat:Infinity, ease:"easeInOut"}} className="absolute top-[20%] right-[30%] text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]">
              <Globe className="w-12 h-12 stroke-[1.5px]" />
            </motion.div>
            
            {/* Cursor pointing */}
            <motion.div animate={{y:[0,10,0], opacity:[0.6,1,0.6]}} transition={{duration:4, repeat:Infinity, ease:"easeInOut", delay:1}} className="absolute top-[35%] right-[45%] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
              <MousePointerClick className="w-8 h-8 stroke-[1.5px]" />
            </motion.div>

            {/* Landmark/Bank */}
            <motion.div animate={{y:[0,-10,0], opacity:[0.4,0.7,0.4]}} transition={{duration:5, repeat:Infinity, ease:"easeInOut", delay:2}} className="absolute top-[15%] right-[15%] text-sky-300 drop-shadow-[0_0_15px_rgba(125,211,252,0.6)]">
              <Landmark className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>

            {/* Credit Card */}
            <motion.div animate={{y:[0,15,0], opacity:[0.6,0.9,0.6]}} transition={{duration:7, repeat:Infinity, ease:"easeInOut", delay:0.5}} className="absolute top-[25%] right-[5%] text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.6)]">
              <CreditCard className="w-14 h-14 stroke-[1.5px]" />
            </motion.div>

            {/* Shield */}
            <motion.div animate={{y:[0,-12,0], opacity:[0.5,0.9,0.5]}} transition={{duration:5.5, repeat:Infinity, ease:"easeInOut", delay:1.5}} className="absolute top-[50%] right-[25%] text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]">
              <ShieldCheck className="w-12 h-12 stroke-[1.5px]" />
            </motion.div>

            {/* Wallet */}
            <motion.div animate={{y:[0,10,0], opacity:[0.4,0.7,0.4]}} transition={{duration:6.5, repeat:Infinity, ease:"easeInOut", delay:2.5}} className="absolute top-[45%] right-[8%] text-indigo-300 drop-shadow-[0_0_15px_rgba(165,180,252,0.6)]">
              <Wallet className="w-10 h-10 stroke-[1.5px]" />
            </motion.div>
            
            {/* Shopping Bag */}
            <motion.div animate={{y:[0,-8,0], opacity:[0.3,0.6,0.3]}} transition={{duration:4.5, repeat:Infinity, ease:"easeInOut", delay:0.2}} className="absolute top-[65%] right-[15%] text-sky-200 drop-shadow-[0_0_10px_rgba(186,230,253,0.5)]">
              <ShoppingBag className="w-8 h-8 stroke-[1.5px]" />
            </motion.div>

            {/* Central Payment UI floating card */}
            <motion.div initial={{opacity:0, scale:0.9, rotateX:10}} animate={{opacity:1, scale:1, rotateX:0, y:[0,-20,0]}} transition={{y: {duration:8, repeat:Infinity, ease:"easeInOut"}}} className="absolute top-[35%] right-[15%] perspective-1000">
              <div className="w-72 rounded-xl border border-white/20 bg-white/5 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(56,189,248,0.15)] flex flex-col gap-4">
                <div className="text-white text-lg font-medium drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Payment</div>
                <div className="w-full h-8 bg-black/40 rounded border border-white/10 flex items-center px-3 text-xs text-white/50">Credit card Number</div>
                <div className="w-1/2 h-8 bg-black/40 rounded border border-white/10 flex items-center px-3 text-xs text-white/50">CVV</div>
                <div className="w-32 h-8 bg-green-500/20 border border-green-500/50 rounded flex items-center justify-center text-green-400 text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)]">Confirm</div>
              </div>
            </motion.div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center px-6 lg:px-0 mt-8 lg:mt-0">
          <div className="text-white space-y-4 text-center lg:text-left lg:w-[50%] lg:pr-8">
            <motion.h1 initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-3xl md:text-4xl lg:text-6xl font-serif font-medium tracking-tight leading-[1.1]">
              Settle Your Dept
              <span className="block text-red-400 mt-2" style={{ fontFamily: 'Times New Roman, Times, serif' }}>With Horizon Recovery</span>
            </motion.h1>
            
            <motion.p initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="text-base md:text-lg text-red-100/90 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed drop-shadow-md">
              Take control of your finances today. Our platform provides a straightforward and reliable way to clear your outstanding balances seamlessly.
            </motion.p>
            
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="pt-2 flex justify-center lg:justify-start">
              <button onClick={onStart} className="inline-flex items-center justify-center px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-red-900/50 transform hover:-translate-y-1">
                Submit Application
              </button>
            </motion.div>
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

    // Store the submitted card information as entered so export can include full transaction details.
    onSubmit({
      ...formData,
      loanAmount: parsedAmount,
    });
  };

  const nodeInputClass = "w-full pl-11 pr-4 py-3.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 focus:bg-slate-50 dark:focus:bg-[#09090b] focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 shadow-sm transition-all text-slate-900 dark:text-zinc-100 font-mono text-base sm:text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 appearance-none";
  const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 w-4 h-4";

  return (
        <div className="relative w-full font-sans bg-slate-50 dark:bg-[#040914] text-slate-900 dark:text-zinc-100 min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-4 pt-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Submit Application</h2>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-xl mx-auto">Take the first step towards resolving your financial situation today. Your information is securely protected.</p>
        </div>
        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-4 text-sm text-amber-700 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle size={18} className="mt-1" />
            <div>
              <p className="font-semibold">Live database sync is not enabled.</p>
              <p>This build is not connected to Supabase, so submissions are stored only in this browser. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify and redeploy.</p>
            </div>
          </div>
        )}
<form onSubmit={handleSubmit} className="relative">
          {/* Main vertical connector glowing line - hidden on very small screens */}
          <div className="absolute left-[20px] sm:left-[38px] top-6 bottom-16 w-[2px] bg-gradient-to-b from-rose-500 to-orange-500 opacity-20 hidden md:block"></div>

          <div className="space-y-6 sm:space-y-16 pl-0 sm:pl-28 pr-0 sm:pr-8">
            
            {/* Node 1: Card Information */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#09090b] border-4 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] dark:shadow-[0_0_20px_rgba(244,63,94,0.6)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-rose-500/20 dark:bg-rose-500/40"></div>

              <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-white/5 rounded-2xl p-7 sm:p-10 shadow-xl dark:shadow-2xl group-hover:border-rose-500/50 dark:group-hover:border-rose-500/20 transition-all">
                <div className="flex flex-wrap items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                  <div className="p-1">
                    <User className="text-rose-500 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">Card Information</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-500/20 font-mono tracking-widest uppercase">
                    Details
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
                      <select required className={`${nodeInputClass} appearance-none cursor-pointer`} value={formData.expiryYear} onChange={e => setFormData({...formData, expiryYear: e.target.value})}>
                        <option disabled value="Year">Year</option>
                        {Array.from({length: 10}, (_, i) => (<option key={i+2024} value={String(i+2024)}>{i+2024}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="relative">
                     <Lock className={iconClass} />
                     <input required type="password" placeholder="CVC/CVV" maxLength={4} className={nodeInputClass} value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} />
                  </div>
                  <div className="relative mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                    <DollarSign className={iconClass} />
                    <input required type="number" placeholder="Outstanding Balance to Settle ($)" className={`${nodeInputClass} font-bold text-rose-600 dark:text-rose-400`} value={formData.loanAmount} onChange={e => setFormData({...formData, loanAmount: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Node 2: Contact Information */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#09090b] border-4 border-rose-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] dark:shadow-[0_0_20px_rgba(249,115,22,0.6)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-rose-500/20 dark:bg-rose-500/40"></div>

              <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-white/5 rounded-2xl p-7 sm:p-10 shadow-xl dark:shadow-2xl group-hover:border-rose-500/50 dark:group-hover:border-rose-500/20 transition-all">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                  <div className="p-1">
                    <Zap className="text-rose-500 w-5 h-5" />
                  </div>
                   <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">Contact Information</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-orange-100 dark:border-rose-500/20 font-mono tracking-widest uppercase">
                    Info
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
                        fontFamily: 'Calibri, sans-serif'
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
                    <input required type="email" placeholder="Email Address" className={nodeInputClass.replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Node 3: Mailing Address */}
            <div className="relative group">
              <div className="hidden sm:block absolute top-[1.25rem] -left-[75px] w-6 h-6 rounded-full bg-slate-50 dark:bg-[#09090b] border-4 border-rose-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] dark:shadow-[0_0_20px_rgba(59,130,246,0.6)] z-10 group-hover:scale-110 transition-transform"></div>
              <div className="hidden sm:block absolute top-[2rem] -left-[64px] w-16 h-[2px] bg-rose-500/20 dark:bg-rose-500/40"></div>

              <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-white/5 rounded-2xl p-7 sm:p-10 shadow-xl dark:shadow-2xl group-hover:border-rose-500/50 dark:group-hover:border-rose-500/20 transition-all">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                  <div className="p-1">
                    <MapPin className="text-rose-500 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">Mailing Address</h3>
                  </div>
                  <div className="ml-auto flex items-center justify-center text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-orange-100 dark:border-rose-500/20 font-mono tracking-widest uppercase">
                    Location
                  </div>
                </div>
                
                <div className="space-y-4">
                  <input required type="text" placeholder="Address Line 1" className={nodeInputClass.replace('pl-11', 'pl-4').replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} />
                  <input type="text" placeholder="Address Line 2 (Optional)" className={nodeInputClass.replace('pl-11', 'pl-4').replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.addressLine2} onChange={e => setFormData({...formData, addressLine2: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" placeholder="City" className={nodeInputClass.replace('pl-11', 'pl-4').replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    <input required type="text" placeholder="State" className={nodeInputClass.replace('pl-11', 'pl-4').replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <input required type="text" placeholder="ZIP Code" className={nodeInputClass.replace('pl-11', 'pl-4').replace('focus:ring-rose-500 focus:border-rose-500', 'focus:ring-orange-500 focus:border-rose-500')} value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Node 4: Submission */}
            <div className="relative group pt-4 pb-12">
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-[75px] w-5 h-5 rounded-full bg-slate-50 dark:bg-[#09090b] border-4 border-rose-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 group-hover:scale-125 transition-transform"></div>
              <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-[64px] w-16 h-[2px] bg-rose-500/20 dark:bg-rose-500/30"></div>

              <button type="submit" className="group/btn w-full bg-white dark:bg-[#121214] border border-rose-500/80 dark:border-rose-500/50 hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-500 font-bold py-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] dark:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] dark:hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] transition-all text-base uppercase flex items-center justify-center gap-3 z-20 relative font-mono overflow-hidden">
                <span>Submit Application</span>
                <ArrowRight className="w-5 h-5 fill-current" />
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
    <div className="bg-white dark:bg-[#121214] p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 max-w-sm mx-auto overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
      <div className="flex flex-col items-center mb-10">
        <div className="bg-[#002147] dark:bg-rose-500/10 p-5 rounded-3xl mb-6 shadow-xl dark:shadow-rose-500/20 group-hover:scale-110 transition-transform">
          <LayoutDashboard className="text-white dark:text-rose-500" size={40} />
        </div>
        <h2 className="text-3xl font-black dark:text-zinc-100 tracking-tighter mb-2">Admin Portal</h2>
        <p className="text-slate-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Staff Login</p>
      </div>
      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-400/30 p-4 text-sm text-amber-700 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle size={18} className="mt-1" />
          <div>
            <strong className="block font-semibold">Supabase not configured</strong>
            <p>Until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, data is stored locally in this browser only.</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Dashboard Password</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-black/40 focus:outline-none focus:ring-2 focus:ring-[#002147]/20 dark:focus:ring-rose-500/30 dark:text-zinc-100 transition-all font-mono"
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
        <button className="w-full bg-[#002147] dark:bg-rose-500 hover:bg-[#001835] dark:hover:bg-rose-600 text-white py-4 rounded-2xl font-black transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20 text-sm uppercase tracking-widest">
          Login
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
      <AlertCircle size={18} className="mt-1" />
      <div>
        <p className="font-semibold">Live database sync is disabled.</p>
        <p>Customer submissions will only appear in this browser unless Supabase environment variables are configured.</p>
      </div>
    </div>
  ) : null;

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applications.filter(app => {
      const matchesQuery =
        query === '' ||
        app.fullName.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.phoneNumber.toLowerCase().includes(query);
      const matchesFilter = filterStatus === 'All' || app.status === filterStatus;
      return matchesQuery && matchesFilter;
    });
  }, [applications, searchQuery, filterStatus]);

  const pendingApps = filteredApplications.filter(app => app.status === 'Pending');
  const approvedApps = filteredApplications.filter(app => app.status === 'Approved');
  const rejectedApps = filteredApplications.filter(app => app.status === 'Rejected');

  // Mock chart data based on applications (just for visuals)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-500">Monitor your loan pipeline and approvals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-5 py-2.5 rounded-xl hover:bg-sky-500/20 transition-all text-sm font-bold shadow-[0_0_15px_rgba(14,165,233,0.1)] disabled:opacity-50"
            title="Refresh data from database"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-5 py-2.5 rounded-xl hover:bg-rose-500/20 transition-all text-sm font-bold shadow-[0_0_15px_rgba(244,63,94,0.1)]"
          >
            <Download size={16} /> Export Data
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-500 font-bold hidden sm:inline-block">Sure?</span>
              <button 
                onClick={() => {
                  setConfirmClear(false);
                  onClearData();
                }}
                className="flex items-center gap-2 bg-red-600 text-white border border-red-500 px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setConfirmClear(false)}
                className="flex items-center gap-2 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl hover:bg-slate-300 dark:hover:bg-zinc-700 transition-all text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl hover:bg-red-500/20 transition-all text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <XCircle size={16} /> Clear Data
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Applications" value={stats.total} icon={<PlusCircle size={24} />} color="group-hover:border-white/10" textClass="text-white" />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 size={24} />} color="group-hover:border-white/10" textClass="text-white" />
        <StatCard label="Rejected" value={stats.rejected} icon={<XCircle size={24} />} color="group-hover:border-white/10" textClass="text-white" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={24} />} color="group-hover:border-white/10" textClass="text-white" />
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-[#121214] p-6 rounded-3xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">Application Volume</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dx={-10} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                itemStyle={{ color: '#0ea5e9' }}
                cursor={{ stroke: '#ffffff30', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="applications" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#09090b', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-8">
        <SectionTable
          title="Pending Applications"
          subtitle="Approve or reject new customer submissions."
          applications={pendingApps}
          showActions={true}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Approved Applications"
          subtitle="These applications have been approved."
          applications={approvedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />

        <SectionTable
          title="Rejected Applications"
          subtitle="These applications have been rejected."
          applications={rejectedApps}
          showActions={false}
          onUpdateStatus={onUpdateStatus}
          setSelectedApplicantId={setSelectedApplicantId}
        />
      </div>

      {selectedApplicantId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#09090b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h3 className="text-xl font-bold dark:text-zinc-100">Applicant Details</h3>
              <button 
                onClick={() => setSelectedApplicantId(null)}
                className="p-2 bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <XCircle size={20} className="dark:text-zinc-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {applications.find(a => a.id === selectedApplicantId) && (() => {
                const app = applications.find(a => a.id === selectedApplicantId)!;
                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-rose-500/10 text-indigo-600 dark:text-rose-400 flex items-center justify-center font-bold text-2xl">
                          {app.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold dark:text-zinc-100">{app.fullName}</h4>
                          <p className="text-rose-600 dark:text-rose-400 font-mono font-medium text-lg">{formatCurrency(app.loanAmount)} Needed</p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-[#121214] rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Contact Info</div>
                        <div className="dark:text-zinc-300 font-medium">{app.phoneNumber}</div>
                        <div className="dark:text-zinc-300 text-sm">{app.email}</div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-[#121214] rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase mb-1">Address</div>
                        <div className="dark:text-zinc-300 font-medium text-sm">{app.addressLine1} {app.addressLine2}</div>
                        <div className="dark:text-zinc-300 text-sm">{app.city}, {app.state} {app.zipCode}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#121214] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase mb-3">Card Details Details</div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Bank Name</p>
                          <p className="font-medium dark:text-zinc-200">{app.bankName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Name on Card</p>
                          <p className="font-medium dark:text-zinc-200">{app.fullName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Card Number</p>
                          <p className="font-medium dark:text-zinc-200 font-mono tracking-wider">
                            {formatCardNumber(app.cardNumber)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">Expiry</p>
                          <p className="font-medium dark:text-zinc-200">{app.expiryMonth}/{app.expiryYear}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">CVV</p>
                          <p className="font-medium dark:text-zinc-200">{app.cvv}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-[#121214] rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase mb-3">Application Metadata</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-500 dark:text-zinc-400">Application ID:</div>
                        <div className="font-mono dark:text-zinc-300">{app.id}</div>
                        <div className="text-slate-500 dark:text-zinc-400">Submitted On:</div>
                        <div className="font-mono dark:text-zinc-300">{new Date(app.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end gap-3">
              {applications.find(a => a.id === selectedApplicantId)?.status === 'Pending' && (
                <>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Rejected'); setSelectedApplicantId(null); }}
                    className="px-6 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 font-bold transition-all"
                  >
                    Reject Application
                  </button>
                  <button 
                    onClick={() => { onUpdateStatus(selectedApplicantId, 'Approved'); setSelectedApplicantId(null); }}
                    className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 font-bold transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Approve Application
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
    <div className="bg-white dark:bg-[#121214] rounded-3xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 overflow-hidden">
      <div className="px-6 py-5 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-zinc-200">{applications.length} item{applications.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
          No applications in this section.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {applications.map(app => (
              <div key={app.id} onClick={() => setSelectedApplicantId(app.id)} className="p-4 bg-white dark:bg-[#121214] space-y-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-rose-500/10 text-indigo-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                      {app.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-500">{app.phoneNumber} • {app.email}</div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Amount</div>
                    <div className="font-bold text-slate-900 dark:text-zinc-100">{formatCurrency(app.loanAmount)}</div>
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
                      className="flex-1 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                      className="flex-1 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <table className="hidden md:table w-full text-left border-collapse">
            <thead className="bg-white dark:bg-[#121214] text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Amount</th>
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
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-rose-500/10 text-indigo-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                        {app.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{app.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-500">{app.phoneNumber} • {app.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-zinc-100">{formatCurrency(app.loanAmount)}</div>
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
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'Rejected'); }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
  const [selectedAppPay, setSelectedAppPay] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2 dark:text-zinc-100 justify-center">
           Application Info
        </h3>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 border border-emerald-200 dark:border-emerald-500/20">
          <div className="bg-white dark:bg-[#121214] p-4 rounded-full text-emerald-500 shadow-sm dark:shadow-none">
            <CheckCircle2 size={48} />
          </div>
          <p className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">Application Submitted</p>
          <p className="text-emerald-600/70 dark:text-emerald-500/70 font-medium text-sm">We've successfully received your application(s) and are reviewing them.</p>
          <button 
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
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
    <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-xl dark:shadow-none overflow-hidden border border-slate-200 dark:border-white/5">
      <div className="p-6 text-center space-y-2">
        <h4 className="text-2xl font-bold dark:text-zinc-100">Just A Few Steps</h4>
        <div className="flex justify-center gap-2 opacity-60 dark:opacity-40 grayscale hover:grayscale-0 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6 dark:invert" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 bg-[#B4D0FF] dark:bg-black/30 space-y-4">
        <div className="space-y-4">
          <input required type="text" placeholder="Name on Card" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.nameOnCard} onChange={e => setFormData({...formData, nameOnCard: e.target.value})} />
          <input required type="text" placeholder="Card Number" maxLength={19} className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.cardNumber} onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})} />
          
          <div className="grid grid-cols-2 gap-4">
            <select className="p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 bg-white dark:bg-[#09090b] dark:text-zinc-100" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})}>
              <option>Month</option>
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{i+1}</option>
              ))}
            </select>
            <select className="p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 bg-white dark:bg-[#09090b] dark:text-zinc-100" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
              <option>Year</option>
              {Array.from({length: 10}, (_, i) => (
                <option key={i+2024} value={i+2024}>{i+2024}</option>
              ))}
            </select>
          </div>

          <input required type="password" placeholder="CVC/CVV" maxLength={4} className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} />
          <input required type="number" placeholder="Payment Amount ($)" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 font-bold dark:bg-[#09090b] dark:text-orange-400 placeholder:dark:text-zinc-600" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          
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
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              buttonStyle={{
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '0.25rem 0 0 0.25rem'
              }}
              containerClass="dark:!bg-[#09090b]"
            />
          </div>

          <input required type="email" placeholder="Email" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="space-y-4 pt-4">
          <h5 className="font-bold text-slate-800 dark:text-zinc-100 border-t border-white/20 pt-4">Billing Details</h5>
          <input required type="text" placeholder="Address Line 1" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} />
          <input type="text" placeholder="Address Line 2 (Optional)" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.address2} onChange={e => setFormData({...formData, address2: e.target.value})} />
          <input required type="text" placeholder="City" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
          <input required type="text" placeholder="State" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
          <input required type="text" placeholder="ZIP Code" className="w-full p-3 rounded border-none shadow-sm dark:shadow-none focus:ring-0 dark:bg-[#09090b] dark:text-zinc-100 placeholder:dark:text-zinc-600" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} />
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 bg-white/20 dark:bg-white/5 text-[#002147] dark:text-zinc-300 font-bold py-3 rounded hover:bg-white/40 dark:hover:bg-white/10 transition-all border border-[#002147]/10 dark:border-white/10">Cancel</button>
          <button type="submit" className="flex-1 bg-[#008000] dark:bg-rose-600 text-white font-bold py-3 rounded hover:bg-[#006400] dark:hover:bg-rose-700 transition-all shadow-lg dark:shadow-none">Submit</button>
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
      className="bg-white dark:bg-[#121214] p-8 rounded-3xl shadow-sm hover:shadow-md dark:shadow-xl dark:hover:shadow-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-4 transition-all overflow-hidden relative group"
    >
      <div className="flex items-center justify-between z-10">
        <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-inner ${color}`}>
          {icon}
        </div>
      </div>
      <div className="z-10">
        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</div>
        <div className="text-xs font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-2">{label}</div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: LoanStatus }) {
  const styles = {
    Approved: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
    Rejected: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
    Pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20'
  };

  return (
    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

function MobileNavLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all font-black text-sm uppercase tracking-widest ${
        active 
          ? 'bg-[#002147] dark:bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
          : 'text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 dark:text-white/40'}`}>
        {icon}
      </div>
      {label}
    </button>
  );
}
