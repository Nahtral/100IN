import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrendingUp, Target, Activity, Calendar } from 'lucide-react';

interface RealTimeUpdateToastProps {
  isRealTime: boolean;
}

let lastToastTime = 0;
let toastCount = 0;

export const RealTimeUpdateToast: React.FC<RealTimeUpdateToastProps> = ({ isRealTime }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isRealTime || !initialized) {
      setInitialized(true);
      return;
    }

    const now = Date.now();
    
    // Rate limit toasts: max 1 per 3 seconds, and max 3 per minute
    if (now - lastToastTime < 3000) return;
    
    toastCount++;
    if (toastCount > 3) {
      // Reset count every minute
      setTimeout(() => {
        toastCount = 0;
      }, 60000);
      return;
    }

    lastToastTime = now;

    // Show different icons and messages randomly
    const updates = [
      { icon: TrendingUp, message: "Performance data updated", color: "text-emerald-600" },
      { icon: Target, message: "Goals progress refreshed", color: "text-blue-600" },
      { icon: Activity, message: "Health metrics updated", color: "text-orange-600" },
      { icon: Calendar, message: "Schedule synchronized", color: "text-purple-600" }
    ];

    const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
    const Icon = randomUpdate.icon;

    toast.success(
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${randomUpdate.color}`} />
        <span className="text-sm font-medium">{randomUpdate.message}</span>
      </div>,
      {
        duration: 2000,
        position: 'bottom-right',
        style: { 
          background: 'hsl(var(--background))', 
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))'
        }
      }
    );
  }, [isRealTime, initialized]);

  return null;
};