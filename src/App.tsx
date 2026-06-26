import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, History, Users, BarChart3, Search, MessageSquare, Settings, PlusCircle, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import BillScanner from './components/BillScanner';
import BillSplitter from './components/BillSplitter';
import SpendingDashboard from './components/SpendingDashboard';
import HomeManager from './components/HomeManager';
import HistoryView from './components/HistoryView';
import SMSParser from './components/SMSParser';
import PriceTracker from './components/PriceTracker';
import { Bill, User, Home } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'home' | 'stats' | 'sms' | 'prices'>('scan');
  const [user, setUser] = useState<User | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [scannedBill, setScannedBill] = useState<Partial<Bill> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'local' | 'gemini-lite'>('local');

  useEffect(() => {
    const savedModel = localStorage.getItem('bill_selected_model');
    if (savedModel === 'gemini-lite' || savedModel === 'local') {
      setSelectedModel(savedModel);
    }
    const savedUser = localStorage.getItem('bill_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      const newUser = { id: Math.random().toString(36).substr(2, 9), name: 'Guest User', email: '' };
      setUser(newUser);
      localStorage.setItem('bill_user', JSON.stringify(newUser));
    }

    const savedBills = localStorage.getItem('bill_history');
    if (savedBills) {
      setBills(JSON.parse(savedBills));
    }
  }, []);

  const saveBill = (bill: Bill) => {
    const updatedBills = [bill, ...bills];
    setBills(updatedBills);
    localStorage.setItem('bill_history', JSON.stringify(updatedBills));
    
    // Save items for offline price tracker
    const existingPricesStr = localStorage.getItem('product_prices');
    const existingPrices = existingPricesStr ? JSON.parse(existingPricesStr) : [];
    bill.items.forEach(item => {
      existingPrices.push({
        name: item.name,
        price: (item.price || 0) / (item.quantity || 1),
        shopName: bill.shopName || "Unknown Shop",
        date: bill.date
      });
    });
    localStorage.setItem('product_prices', JSON.stringify(existingPrices));

    setScannedBill(null);
    setActiveTab('history');
  };

  const tabs = [
    { id: 'scan', label: 'Scan', icon: Camera },
    { id: 'history', label: 'History', icon: History },
    { id: 'home', label: 'Home', icon: Users },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'prices', label: 'Prices', icon: Search },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500/80 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <PlusCircle className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Split</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium text-zinc-300 border border-white/5 backdrop-blur-md">
            <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
            {selectedModel === 'local' ? 'MobileViT (WebGPU)' : 'Gemini 2.0 Flash-Lite'}
          </div>
          {home && (
            <span className="text-xs font-medium bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30 backdrop-blur-md">
              {home.name}
            </span>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  Settings
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-zinc-400 block mb-3">AI Scanning Model</label>
                  <div className="grid gap-3">
                    <button
                      onClick={() => {
                        setSelectedModel('local');
                        localStorage.setItem('bill_selected_model', 'local');
                      }}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                        selectedModel === 'local' 
                          ? "bg-indigo-500/10 border-indigo-500/50 text-white" 
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        selectedModel === 'local' ? "border-indigo-400" : "border-zinc-600"
                      )}>
                        {selectedModel === 'local' && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Local Vision (MobileViT)</div>
                        <p className="text-xs text-zinc-500 mt-1">Runs entirely in your browser using WebGPU. Privacy-focused, no data leaves your device.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedModel('gemini-lite');
                        localStorage.setItem('bill_selected_model', 'gemini-lite');
                      }}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                        selectedModel === 'gemini-lite' 
                          ? "bg-indigo-500/10 border-indigo-500/50 text-white" 
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        selectedModel === 'gemini-lite' ? "border-indigo-400" : "border-zinc-600"
                      )}>
                        {selectedModel === 'gemini-lite' && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Gemini 2.0 Flash-Lite</div>
                        <p className="text-xs text-zinc-500 mt-1">Cloud-powered AI with advanced extraction. High accuracy, requires internet connection.</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-28 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {!scannedBill ? (
                <BillScanner onScan={setScannedBill} model={selectedModel} />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Verify & Split</h2>
                    <button onClick={() => setScannedBill(null)} className="text-zinc-400 hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <BillSplitter bill={scannedBill as Bill} user={user} home={home} onSave={saveBill} />
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <HistoryView bills={bills} />
            </motion.div>
          )}
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <HomeManager user={user} onHomeUpdate={setHome} />
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SpendingDashboard bills={bills} />
            </motion.div>
          )}
          {activeTab === 'sms' && (
            <motion.div key="sms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SMSParser onTransaction={(t) => {
                const newBill: Bill = {
                  id: t.id,
                  title: `SMS: ${t.bankName}`,
                  shopName: t.sender,
                  date: t.date,
                  totalAmount: t.amount,
                  items: [{ id: '1', name: t.text, price: t.amount, quantity: 1, category: 'Uncategorized', assignees: [] }],
                  creatorId: user.id,
                  status: 'paid',
                  createdAt: new Date().toISOString()
                };
                saveBill(newBill);
              }} />
            </motion.div>
          )}
          {activeTab === 'prices' && (
            <motion.div key="prices" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PriceTracker />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-8px_32px_0_rgba(0,0,0,0.3)] pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-w-[64px]",
                isActive ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "scale-110")} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
              {isActive && (
                <motion.div layoutId="activeDot" className="w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
