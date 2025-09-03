import { supabase } from '@/integrations/supabase/client';

class ConnectionOptimizer {
  private static connectionPool: Map<string, Promise<any>> = new Map();
  private static queryQueue: Array<{ query: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private static isProcessing = false;
  private static maxConcurrentQueries = 5;
  private static activeQueries = 0;

  static async optimizedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl = 30000
  ): Promise<T> {
    // Check if query is already in progress
    if (this.connectionPool.has(key)) {
      return this.connectionPool.get(key);
    }

    // Create the query promise
    const queryPromise = new Promise<T>((resolve, reject) => {
      this.queryQueue.push({
        query: queryFn,
        resolve,
        reject
      });
      this.processQueue();
    });

    // Store in pool with TTL
    this.connectionPool.set(key, queryPromise);
    setTimeout(() => {
      this.connectionPool.delete(key);
    }, ttl);

    return queryPromise;
  }

  private static async processQueue() {
    if (this.isProcessing || this.activeQueries >= this.maxConcurrentQueries) {
      return;
    }

    this.isProcessing = true;

    while (this.queryQueue.length > 0 && this.activeQueries < this.maxConcurrentQueries) {
      const queryItem = this.queryQueue.shift();
      if (!queryItem) continue;

      this.activeQueries++;
      
      try {
        const result = await queryItem.query();
        queryItem.resolve(result);
      } catch (error) {
        queryItem.reject(error);
      } finally {
        this.activeQueries--;
      }
    }

    this.isProcessing = false;

    // Process remaining queue if any
    if (this.queryQueue.length > 0) {
      setTimeout(() => this.processQueue(), 10);
    }
  }

  static clearPool() {
    this.connectionPool.clear();
    this.queryQueue.length = 0;
    this.activeQueries = 0;
    this.isProcessing = false;
  }
}

export { ConnectionOptimizer };