-- Fix the signal_type constraint to allow 'viewer-join'

-- Drop the old constraint
ALTER TABLE webrtc_signals 
DROP CONSTRAINT IF EXISTS webrtc_signals_signal_type_check;

-- Add the new constraint with 'viewer-join' included
ALTER TABLE webrtc_signals 
ADD CONSTRAINT webrtc_signals_signal_type_check 
CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'viewer-join'));

