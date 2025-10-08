import { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

interface VaultUnlockProps {
  price: number; // in cents
  onUnlock: () => void;
  creatorName: string;
  disabled?: boolean;
}

export default function VaultUnlock({
  price,
  onUnlock,
  creatorName,
  disabled = false,
}: VaultUnlockProps) {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (loading || disabled) return;
    
    setLoading(true);
    try {
      await onUnlock();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-6 text-center">
      <div className="space-y-4">
        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-lg">
            Premium Content
          </h3>
          <p className="text-gray-300 text-sm">
            This content is locked and requires payment to unlock
          </p>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-white">
            {formatCurrency(price)}
          </div>
          <p className="text-gray-400 text-sm">
            One-time payment to {creatorName}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-green-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Unlock forever</span>
          </div>
          <div className="flex items-center space-x-2 text-green-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>High quality content</span>
          </div>
          <div className="flex items-center space-x-2 text-green-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Support the creator</span>
          </div>
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleUnlock}
          disabled={loading || disabled}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Unlock for {formatCurrency(price)}</span>
            </div>
          )}
        </button>

        {/* Security Note */}
        <div className="text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>Secure payment via Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

