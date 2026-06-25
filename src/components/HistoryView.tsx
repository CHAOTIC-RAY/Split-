import { Bill } from '../types';
import { ShoppingBag, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryViewProps {
  bills: Bill[];
}

export default function HistoryView({ bills }: HistoryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        <span className="bg-white/10 text-zinc-300 border border-white/10 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
          {bills.length} Items
        </span>
      </div>

      {bills.length > 0 ? (
        <div className="space-y-3">
          {bills.map((bill, index) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all group flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/40 transition-colors">
                <ShoppingBag className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{bill.shopName || bill.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    {new Date(bill.date).toLocaleDateString()}
                  </div>
                  {bill.shopName && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      <MapPin className="w-3 h-3" />
                      {bill.shopName}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-white font-mono">${bill.totalAmount.toFixed(2)}</div>
                <div className={`text-[9px] font-black uppercase tracking-widest ${
                  bill.status === 'paid' ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {bill.status}
                </div>
              </div>
              
              <ChevronRight className="text-zinc-500 w-5 h-5 group-hover:text-white transition-colors" />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <ShoppingBag className="w-10 h-10 text-zinc-500" />
          </div>
          <p className="text-zinc-300 font-medium">No transactions yet.</p>
          <p className="text-zinc-500 text-sm">Scan your first bill to see it here.</p>
        </div>
      )}
    </div>
  );
}
