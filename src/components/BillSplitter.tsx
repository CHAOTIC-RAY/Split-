import { useState } from 'react';
import { User, Bill, BillItem, Home } from '../types';
import { Check, User as UserIcon, Share2, Save, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';

interface BillSplitterProps {
  bill: Bill;
  user: User;
  home: Home | null;
  onSave: (bill: Bill) => void;
}

export default function BillSplitter({ bill, user, home, onSave }: BillSplitterProps) {
  const [items, setItems] = useState<BillItem[]>(
    bill.items.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9), assignees: [] }))
  );
  const [isSharing, setIsSharing] = useState(false);

  const members = home?.members || [user, { id: 'user-2', name: 'Partner' }];

  const toggleAssignee = (itemId: string, userId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const assignees = item.assignees.includes(userId)
          ? item.assignees.filter(id => id !== userId)
          : [...item.assignees, userId];
        return { ...item, assignees };
      }
      return item;
    }));
  };

  const calculateUserTotal = (userId: string) => {
    return items.reduce((sum, item) => {
      if (item.assignees.includes(userId)) {
        return sum + (item.price * item.quantity) / item.assignees.length;
      }
      return sum;
    }, 0);
  };

  const handleShare = async () => {
    const node = document.getElementById('receipt-image');
    if (node) {
      setIsSharing(true);
      const dataUrl = await toPng(node);
      const link = document.createElement('a');
      link.download = `bill-${bill.shopName}.png`;
      link.href = dataUrl;
      link.click();
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div id="receipt-image" className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-zinc-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="text-center border-b border-dashed border-white/20 pb-4 mb-4">
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">{bill.shopName}</h3>
          <p className="text-zinc-400 text-sm font-mono">{new Date(bill.date).toLocaleDateString()}</p>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-semibold text-zinc-200">{item.name}</span>
                  <div className="text-xs text-zinc-400">{item.quantity}x @ ${item.price.toFixed(2)}</div>
                </div>
                <div className="text-right font-mono font-bold text-indigo-400">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
              
              <div className="flex gap-2">
                {members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => toggleAssignee(item.id, member.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                      item.assignees.includes(member.id)
                        ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-indigo-400'
                        : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <UserIcon className="w-3 h-3" />
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-dashed border-white/20 space-y-2">
          <div className="flex justify-between text-zinc-400 font-medium">
            <span>Subtotal</span>
            <span className="font-mono">${bill.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-white font-black text-xl">
            <span>TOTAL</span>
            <span className="font-mono text-indigo-400">${bill.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-8 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 space-y-3 shadow-inner">
          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-3 h-3" />
            Settlement Summary
          </h4>
          {members.map(member => {
            const total = calculateUserTotal(member.id);
            if (total === 0) return null;
            return (
              <div key={member.id} className="flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-300">{member.name}</span>
                <span className="font-mono font-bold text-indigo-400">${total.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors shadow-lg backdrop-blur-md"
        >
          <Share2 className="w-5 h-5" />
          {isSharing ? 'Generating...' : 'Share Bill'}
        </button>
        
        <button
          onClick={() => onSave({ ...bill, items, status: 'pending' })}
          className="flex items-center justify-center gap-2 bg-indigo-600/80 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 border border-indigo-500/30 transition-colors backdrop-blur-md"
        >
          <Save className="w-5 h-5" />
          Save History
        </button>
      </div>
    </div>
  );
}
