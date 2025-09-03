interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static limits = new Map<string, RateLimitEntry>();
  
  static check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }
    
    if (entry.count >= config.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  static cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => RateLimiter.cleanup(), 300000);