import { Bill } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

interface SpendingDashboardProps {
  bills: Bill[];
}

const COLORS = ['#818cf8', '#c084fc', '#f472b6', '#fb7185', '#fb923c', '#facc15'];

export default function SpendingDashboard({ bills }: SpendingDashboardProps) {
  const totalSpent = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);

  const chartData = bills.slice(0, 7).reverse().map(bill => ({
    name: new Date(bill.date).toLocaleDateString(undefined, { weekday: 'short' }),
    amount: bill.totalAmount
  }));

  const categoryMap: Record<string, number> = {};
  bills.forEach(bill => {
    bill.items.forEach(item => {
      const cat = item.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.quantity);
    });
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-500/20 backdrop-blur-xl rounded-3xl p-5 text-white border border-indigo-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Monthly Spend</span>
          </div>
          <div className="text-3xl font-black">${totalSpent.toFixed(2)}</div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold bg-white/10 w-fit px-2 py-0.5 rounded-full text-indigo-200">
            <TrendingDown className="w-3 h-3" />
            12% vs last month
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-white">
          <div className="flex items-center gap-2 mb-1 text-zinc-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Avg per Bill</span>
          </div>
          <div className="text-3xl font-black text-white">
            ${bills.length > 0 ? (totalSpent / bills.length).toFixed(2) : '0.00'}
          </div>
          <div className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {bills.length} bills tracked
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">Daily Spending</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(24,24,27,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              <Bar dataKey="amount" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">Category Breakdown</h3>
        <div className="h-64 w-full flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(24,24,27,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 ml-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] font-bold text-zinc-300 uppercase truncate w-24">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
