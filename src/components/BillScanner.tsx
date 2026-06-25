import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface BillScannerProps {
  onScan: (bill: any) => void;
}

export default function BillScanner({ onScan }: BillScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setIsProcessing(true);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.readAsDataURL(file);
      });

      const response = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      onScan({
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      alert('Failed to extract bill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Add New Bill</h2>
        <p className="text-zinc-400">Snap a photo or upload a receipt to start splitting.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex flex-col items-center justify-center aspect-square rounded-3xl bg-indigo-600/80 hover:bg-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(99,102,241,0.2)] border border-indigo-400/30 backdrop-blur-md group"
        >
          <Camera className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
          <span className="font-semibold">Take Photo</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex flex-col items-center justify-center aspect-square rounded-3xl bg-white/5 border-2 border-white/10 hover:border-indigo-500/50 hover:bg-white/10 text-zinc-300 transition-all backdrop-blur-md group"
        >
          <Upload className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
          <span className="font-semibold">Upload File</span>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        accept="image/*"
        className="hidden"
      />

      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/10 flex flex-col items-center gap-4"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-indigo-300" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">OCR Engine Processing...</p>
            <p className="text-sm text-zinc-400">Extracting items, prices, and taxes</p>
          </div>
        </motion.div>
      )}

      {!isProcessing && previewUrl && (
        <div className="relative rounded-3xl overflow-hidden aspect-[3/4] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-zinc-300 text-xs font-medium uppercase tracking-wider opacity-80">Last scanned image</p>
          </div>
        </div>
      )}
    </div>
  );
}
