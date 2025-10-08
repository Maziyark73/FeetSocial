import { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

interface TipButtonProps {
  onTip: (amount: number) => void;
  creatorName: string;
  disabled?: boolean;
}

const tipAmounts = [
  { amount: 500, label: '$5' },
  { amount: 1000, label: '$10' },
  { amount: 2500, label: '$25' },
  { amount: 5000, label: '$50' },
  { amount: 10000, label: '$100' },
];

export default function TipButton({
  onTip,
  creatorName,
  disabled = false,
}: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTip = async (amount: number) => {
    if (loading || disabled) return;
    
    setLoading(true);
    try {
      await onTip(amount);
      setShowModal(false);
      setSelectedAmount(null);
      setCustomAmount('');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount) * 100; // Convert to cents
    if (amount > 0) {
      handleTip(amount);
    }
  };

  const handlePresetAmount = (amount: number) => {
    setSelectedAmount(amount);
    handleTip(amount);
  };

  return (
    <>
      {/* Tip Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className="flex items-center space-x-2 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Send a tip"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <span className="text-sm">Tip</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">
                Tip {creatorName}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Show your appreciation with a tip
              </p>
            </div>

            {/* Preset Amounts */}
            <div className="space-y-3">
              <h4 className="text-white font-medium">Quick tip amounts:</h4>
              <div className="grid grid-cols-2 gap-3">
                {tipAmounts.map((tip) => (
                  <button
                    key={tip.amount}
                    onClick={() => handlePresetAmount(tip.amount)}
                    disabled={loading}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedAmount === tip.amount
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-gray-600 bg-gray-700/50 text-white hover:border-yellow-500 hover:bg-yellow-500/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="font-semibold">{tip.label}</div>
                    <div className="text-xs text-gray-400">Quick tip</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-3">
              <h4 className="text-white font-medium">Custom amount:</h4>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCustomAmount}
                  disabled={loading || !customAmount || parseFloat(customAmount) <= 0}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Tip'}
                </button>
              </div>
            </div>

            {/* Security Note */}
            <div className="text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                <span>Secure payment via Stripe</span>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

