interface BatchRequest {
  key: string;
  resolver: (result: any) => void;
  rejecter: (error: any) => void;
}

export class RequestBatcher {
  private static batches = new Map<string, BatchRequest[]>();
  private static timeouts = new Map<string, NodeJS.Timeout>();
  
  static batch<T>(
    key: string,
    batchFn: (keys: string[]) => Promise<Record<string, T>>,
    delay = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.batches.get(key) || [];
      batch.push({ key, resolver: resolve, rejecter: reject });
      this.batches.set(key, batch);
      
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key)!);
      }
      
      this.timeouts.set(key, setTimeout(async () => {
        const currentBatch = this.batches.get(key) || [];
        this.batches.delete(key);
        this.timeouts.delete(key);
        
        if (currentBatch.length === 0) return;
        
        try {
          const keys = currentBatch.map(req => req.key);
          const results = await batchFn(keys);
          
          currentBatch.forEach(req => {
            if (results[req.key]) {
              req.resolver(results[req.key]);
            } else {
              req.rejecter(new Error(`No result for key: ${req.key}`));
            }
          });
        } catch (error) {
          currentBatch.forEach(req => req.rejecter(error));
        }
      }, delay));
    });
  }
}