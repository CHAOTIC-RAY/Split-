import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { localAi } from "../lib/builtinAi";
import { BillItem } from "../types";

interface BillScannerProps {
  onScan: (bill: any) => void;
  model: 'local' | 'gemini-lite';
}

export default function BillScanner({ onScan, model }: BillScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setOcrProgress(10);
    setOcrStatus("Compressing & Enhancing Image...");

    const preprocessImage = async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(URL.createObjectURL(file));

          const maxDim = 2000;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    };

    try {
      const processedImageUrl = await preprocessImage(file);

      if (model === 'gemini-lite') {
        handleGeminiScan(processedImageUrl);
        return;
      }

      setOcrStatus("Initializing Local Vision (WebGPU)...");
      setOcrProgress(0.1);

      try {
        await localAi.init((progress, message) => {
          setOcrStatus(message);
          setOcrProgress(progress);
        });

        setOcrStatus("Analyzing Receipt Locally...");
        const prompt = "Extract receipt data: store name, total amount, and items (name, price, quantity, category). Return strictly as JSON.";
        const result = await localAi.processImage(processedImageUrl, prompt);

        if (result) {
          let parsedData: any = { items: [] };
          try {
            const jsonMatch = result.match(/\{.*\}/s);
            if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0]);
            } else {
              const lines = result.split("\n");
              parsedData = {
                shopName: lines[0]?.substring(0, 50) || "Scanned Receipt",
                totalAmount: parseFloat(result.match(/total[:\s]*\$?([\d.,]+)/i)?.[1].replace(",", "") || "0"),
                items: []
              };
            }
          } catch (e) {
            console.error("Failed to parse local AI output", e);
          }

          // If local AI didn't find any items (expected with MobileViT), fall back to server OCR
          if (!parsedData.items || parsedData.items.length === 0) {
            console.log("Local AI didn't find items, falling back to server OCR for extraction...");
            handleServerFallback(processedImageUrl);
            return;
          }

          // Normalize
          const shopName = parsedData.shopName || parsedData.store_name || "Scanned Receipt";
          const totalAmount = typeof parsedData.totalAmount === "number" ? parsedData.totalAmount : parseFloat(String(parsedData.totalAmount || 0));
          const items = (Array.isArray(parsedData.items) ? parsedData.items : []).map((item: any) => ({
            id: Math.random().toString(36).substring(7),
            name: item.name || "Unknown Item",
            price: typeof item.price === "number" ? item.price : parseFloat(String(item.price || 0)),
            quantity: typeof item.quantity === "number" ? item.quantity : 1,
            category: item.category || "General",
            assignees: []
          }));

          onScan({
            shopName,
            totalAmount,
            items,
            date: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            rawText: result,
          });

          setOcrStatus("Success!");
          setOcrProgress(1);
          setIsProcessing(false);
        } else {
          throw new Error("Empty result from local AI");
        }

      } catch (localError: any) {
        console.error("Local AI Error:", localError);
        handleServerFallback(processedImageUrl);
      }

    } catch (error: any) {
      console.error("Processing Error:", error);
      alert("Failed to process image.");
      setIsProcessing(false);
    }
  };

  const handleGeminiScan = async (image: string) => {
    try {
      setOcrStatus("Scanning with Gemini 2.0 Flash-Lite...");
      setOcrProgress(0.3);
      
      const response = await fetch("/api/gemini/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, model: "gemini-3.1-flash-lite" }),
      });
      
      if (!response.ok) {
        throw new Error(`Gemini Scan Failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setOcrProgress(0.9);
      
      const items = (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
        id: Math.random().toString(36).substring(7),
        name: item.name || "Unknown Item",
        price: typeof item.price === "number" ? item.price : parseFloat(String(item.price || 0)),
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
        category: item.category || "General",
        assignees: []
      }));

      onScan({
        shopName: data.shopName || "Gemini Scan",
        totalAmount: typeof data.totalAmount === "number" ? data.totalAmount : parseFloat(String(data.totalAmount || 0)),
        items,
        date: data.date || new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        rawText: JSON.stringify(data),
      });

      setOcrStatus("Success!");
      setOcrProgress(1);
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Gemini Scan Error:", error);
      setOcrStatus("Gemini failed, trying server OCR...");
      handleServerFallback(image);
    }
  };

  const handleServerFallback = async (image: string) => {
    try {
      setOcrStatus("Falling back to Server OCR...");
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      onScan({
        ...data,
        date: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        rawText: JSON.stringify(data),
      });
      setIsProcessing(false);
    } catch (e) {
      alert("All OCR methods failed.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Add New Bill</h2>
        <p className="text-zinc-400">
          Snap a photo or upload a receipt to start splitting.
        </p>
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
              <span className="text-[10px] font-bold text-indigo-300">
                {Math.round(ocrProgress * 100)}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-white capitalize">
              {ocrStatus || "OCR Engine Processing..."}
            </p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, ocrProgress * 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {!isProcessing && previewUrl && (
        <div className="relative rounded-3xl overflow-hidden aspect-[3/4] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-zinc-300 text-xs font-medium uppercase tracking-wider opacity-80">
              Last scanned image
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
