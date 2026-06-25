import { useState, useEffect } from 'react';
import { User, Home } from '../types';
import { Users, Copy, Check, LogIn, Plus } from 'lucide-react';

interface HomeManagerProps {
  user: User;
  onHomeUpdate: (home: Home | null) => void;
}

export default function HomeManager({ user, onHomeUpdate }: HomeManagerProps) {
  const [homeName, setHomeName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentHome, setCurrentHome] = useState<Home | null>(null);

  useEffect(() => {
    if (user.homeId) {
      const savedHome = localStorage.getItem(`home_${user.homeId}`);
      if (savedHome) {
        const h = JSON.parse(savedHome);
        setCurrentHome(h);
        onHomeUpdate(h);
      }
    }
  }, [user.homeId]);

  const createHome = async () => {
    const res = await fetch('/api/home/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: homeName, userId: user.id, userName: user.name })
    });
    const data = await res.json();
    setCurrentHome(data);
    onHomeUpdate(data);
    localStorage.setItem(`home_${data.id}`, JSON.stringify(data));
    localStorage.setItem('bill_user', JSON.stringify({ ...user, homeId: data.id }));
  };

  const joinHome = async () => {
    const res = await fetch('/api/home/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, userId: user.id, userName: user.name })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    
    setCurrentHome(data);
    onHomeUpdate(data);
    localStorage.setItem(`home_${data.id}`, JSON.stringify(data));
    localStorage.setItem('bill_user', JSON.stringify({ ...user, homeId: data.id }));
  };

  const copyInvite = () => {
    if (currentHome) {
      navigator.clipboard.writeText(currentHome.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-md">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Household & Couples</h2>
        <p className="text-zinc-400">Shared history for bills, groceries, and rent.</p>
      </div>

      {currentHome ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-white">{currentHome.name}</h3>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                {currentHome.members.length} Members
              </p>
            </div>
            <button 
              onClick={copyInvite}
              className="flex items-center gap-2 text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-xl border border-indigo-500/30 hover:bg-indigo-500/40 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {currentHome.inviteCode}
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Members</h4>
            <div className="flex flex-wrap gap-3">
              {currentHome.members.map(member => (
                <div key={member.id} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {member.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-zinc-300">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-indigo-400" />
              Create a Home
            </h3>
            <input 
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              placeholder="e.g. The Smith Household"
              className="w-full px-4 py-3 rounded-2xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            <button 
              onClick={createHome}
              disabled={!homeName}
              className="w-full py-3 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold rounded-2xl disabled:opacity-50 transition-colors backdrop-blur-md border border-indigo-500/30"
            >
              Create Now
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-white/10" />
            <span className="relative bg-zinc-950 px-4 text-xs font-bold text-zinc-600 uppercase tracking-widest">OR</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-white">
              <LogIn className="w-5 h-5 text-indigo-400" />
              Join with Code
            </h3>
            <input 
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 rounded-2xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-widest text-center font-bold"
            />
            <button 
              onClick={joinHome}
              disabled={inviteCode.length < 6}
              className="w-full py-3 bg-white/5 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
            >
              Join Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
