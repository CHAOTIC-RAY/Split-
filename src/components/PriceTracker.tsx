import { useState } from 'react';
import { Search, Store, ArrowRight, Tag, Loader2 } from 'lucide-react';
import { ProductPrice } from '../types';

export default function PriceTracker() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductPrice[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchPrices = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      // Offline local search
      await new Promise(resolve => setTimeout(resolve, 500));
      const savedPrices = localStorage.getItem('product_prices');
      const allPrices: ProductPrice[] = savedPrices ? JSON.parse(savedPrices) : [];
      
      const matches = allPrices.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(matches);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const bestPrice = results.length > 0 ? results.reduce((min, p) => p.price < min.price ? p : min, results[0]) : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Price Comparison</h2>
        <p className="text-zinc-400">Find the cheapest shop for your items.</p>
      </div>

      <div className="relative">
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchPrices()}
          placeholder="Search product (e.g. Milk, Eggs)"
          className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all font-medium backdrop-blur-xl"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-6 h-6" />
        <button 
          onClick={searchPrices}
          className="absolute right-2 top-2 bottom-2 bg-indigo-600/80 hover:bg-indigo-500 text-white px-6 rounded-2xl font-bold transition-colors border border-indigo-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </button>
      </div>

      {bestPrice && (
        <div className="bg-green-500/10 border border-green-500/20 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 text-green-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Cheapest Found</p>
            <p className="text-lg font-bold text-white">${bestPrice.price.toFixed(2)} at {bestPrice.shopName}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">Recent Price History</h3>
        {results.length > 0 ? (
          results.map((p, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex justify-between items-center hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 border border-white/10 text-zinc-300 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-zinc-200">{p.shopName}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(p.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="text-lg font-black text-indigo-400 font-mono">${p.price.toFixed(2)}</div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-500 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Search for a product to see price history</p>
          </div>
        )}
      </div>
    </div>
  );
}
