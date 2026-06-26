
import { pipeline, env } from "@huggingface/transformers";

export class LocalAiEngine {
  private classifier: any = null;
  private initializingPromise: Promise<void> | null = null;

  async init(onProgress?: (progress: number, message: string) => void) {
    if (this.initializingPromise) return this.initializingPromise;

    this.initializingPromise = (async () => {
      try {
        console.log("[Local AI] Initializing with Transformers.js (WebGPU)...");

        // Use the guide's configuration
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.logLevel = 'error'; 
        
        // ORT WebGPU specific settings to optimize performance and reduce warnings
        (env.backends.onnx as any).wasm.proxy = false;
        (env.backends.onnx as any).webgpu = {
          powerPreference: 'high-performance'
        };

        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.remoteHost = `${window.location.origin}/api/proxy/`;
        env.remotePathTemplate = '{model}/resolve/{revision}/';

        // Use the model suggested in the user's guide
        // MobileViT is lightweight (~20MB) and good for local vision tasks
        this.classifier = await pipeline('image-classification', 'Xenova/mobilevit-small', {
          device: 'webgpu', // Use WebGPU for hardware acceleration
          dtype: 'fp32',    // fp32 is safer for general WebGPU support
          progress_callback: (report: any) => {
            if (report.status === 'progress') {
              const progress = report.progress / 100;
              const message = `Loading Vision Model: ${report.file} (${Math.round(report.progress)}%)`;
              if (onProgress) onProgress(progress, message);
            } else if (report.status === 'init') {
              if (onProgress) onProgress(0, "Initializing WebGPU...");
            }
          }
        });

        console.log("[Local AI] Transformers.js initialized successfully");
      } catch (error: any) {
        this.initializingPromise = null;
        console.error("Failed to initialize Transformers.js:", error);
        
        let errorMessage = error.message || String(error);
        if (errorMessage.includes("WebGPU")) {
          errorMessage = "WebGPU not supported. Falling back to CPU...";
          // Fallback to CPU if WebGPU fails
          try {
             this.classifier = await pipeline('image-classification', 'Xenova/mobilevit-small', {
                device: 'wasm',
             });
             return;
          } catch (cpuError: any) {
             throw new Error("Local AI (CPU) also failed: " + cpuError.message);
          }
        }
        
        throw new Error(errorMessage);
      }
    })();

    return this.initializingPromise;
  }

  async processImage(imageUri: string, _prompt: string) {
    try {
      if (!this.classifier) {
        await this.init();
      }

      console.log("[Local AI] Analyzing image with MobileViT...");
      const result = await this.classifier(imageUri, { topk: 5 });
      
      console.log("[Local AI] Top Predictions:", result);
      
      // Convert classification results into a pseudo-JSON format that BillScanner expects
      // Since MobileViT is an image classifier, we can't extract items like an LLM,
      // but we can identify the document type and provide feedback.
      const isReceipt = result.some((r: any) => 
        /receipt|paper|menu|document|text/i.test(r.label)
      );

      const topLabel = result[0].label;
      const confidence = Math.round(result[0].score * 100);

      // Return a string that looks like what the LLM might have returned, 
      // but indicating it's a classification result.
      return JSON.stringify({
        shopName: `Receipt (${topLabel})`,
        totalAmount: 0,
        items: [],
        note: `Classified as ${topLabel} with ${confidence}% confidence. Local extraction limited to classification. Use server OCR for full extraction.`
      });

    } catch (error: any) {
      console.error("Local AI Inference failed:", error);
      throw error;
    }
  }

  async unload() {
    this.classifier = null;
    this.initializingPromise = null;
  }
}

export const localAi = new LocalAiEngine();
