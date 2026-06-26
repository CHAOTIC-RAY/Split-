import { useState } from 'react';
import { MessageSquare, Scan, Sparkles, Loader2 } from 'lucide-react';
import { SMSTransaction } from '../types';

interface SMSParserProps {
  onTransaction: (transaction: SMSTransaction) => void;
}

export default function SMSParser({ onTransaction }: SMSParserProps) {
  const [smsText, setSmsText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!smsText) return;
    setIsParsing(true);
    try {
      // Simple regex-based non-API parsing locally
      const amountMatch = smsText.match(/\$([0-9]+\.[0-9]+)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      
      let bankName = "Unknown Bank";
      if (smsText.toLowerCase().includes("chase")) bankName = "Chase";
      if (smsText.toLowerCase().includes("bank of america")) bankName = "BoA";
      
      let sender = "Unknown Merchant";
      const atMatch = smsText.match(/at\s+([A-Z0-9\s]+)\./i);
      if (atMatch) sender = atMatch[1].trim();
      else if (smsText.toLowerCase().includes("sent to")) {
        const sentMatch = smsText.match(/sent to\s+([A-Z0-9\s]+)\s+for/i);
        if (sentMatch) sender = sentMatch[1].trim();
      }

      onTransaction({
        amount,
        sender,
        bankName,
        date: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        isHousehold: false,
        text: smsText
      });
      setSmsText('');
    } catch (error) {
      alert('Failed to parse SMS');
    } finally {
      setIsParsing(false);
    }
  };

  const examples = [
    "Debit Card: Your a/c no. XXX1234 is debited for $45.67 on 2024-03-12 at STARBUCKS.",
    "Transfer: $120.00 sent to JANE DOE for RENT on 2024-03-11. Ref: 998811."
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(236,72,153,0.2)]">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">SMS Recognition</h2>
        <p className="text-zinc-400">Paste bank alerts to auto-track transactions.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4">
        <textarea 
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          placeholder="Paste SMS here..."
          className="w-full h-32 px-4 py-3 rounded-2xl bg-black/20 border border-white/10 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none transition-all"
        />
        <button 
          onClick={handleParse}
          disabled={isParsing || !smsText}
          className="w-full py-4 bg-pink-600/80 hover:bg-pink-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.3)] border border-pink-500/30 transition-colors backdrop-blur-md"
        >
          {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isParsing ? 'Extracting...' : 'Extract Transaction'}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Try Examples</h4>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setSmsText(ex)}
            className="w-full text-left p-3 rounded-2xl bg-white/5 text-zinc-300 text-xs font-medium hover:bg-white/10 transition-colors border border-white/5"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
