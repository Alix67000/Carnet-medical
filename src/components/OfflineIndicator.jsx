import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Mode hors-ligne : vos données sont enregistrées localement et synchronisées au retour du réseau.</span>
    </div>
  );
}
