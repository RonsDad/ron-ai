import { useState, useEffect } from "react";
import { 
  Phone, 
  PhoneCall, 
  X, 
  Minus,
  Volume2,
  Mic,
  MicOff,
  PhoneOff
} from "lucide-react";

interface TelephoneUIProps {
  isActive: boolean;
  isConnected: boolean;
  contactName: string;
  contactNumber: string;
  onCall: () => void;
  onHangup: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onDrag: (position: { x: number; y: number }) => void;
  position: { x: number; y: number };
  isMinimized: boolean;
}

export function TelephoneUI({
  isActive,
  isConnected,
  contactName,
  contactNumber,
  onCall,
  onHangup,
  onClose,
  onMinimize,
  onMaximize,
  onDrag,
  position,
  isMinimized
}: TelephoneUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // SIMPLE drag - just follow mouse
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const handleMove = (e: MouseEvent) => {
      onDrag({ x: e.clientX - 160, y: e.clientY - 20 });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '80px' : '320px',
        height: isMinimized ? '80px' : 'auto'
      }}
    >
      {isMinimized ? (
        // Minimized floating icon
        <button
          className="w-20 h-20 rounded-2xl ice-glass-elevated cursor-pointer shadow-2xl border-0 p-0"
          onClick={onMaximize}
          style={{
            background: `linear-gradient(135deg, 
              var(--ice-surface) 0%,
              var(--ice-base) 50%,
              var(--ice-crystalline) 100%)`
          }}
          aria-label="Expand telephone interface"
        >
          <div className="w-full h-full flex items-center justify-center relative">
            {isConnected && (
              <div 
                className="absolute inset-0 rounded-2xl animate-pulse-gentle"
                style={{
                  background: `linear-gradient(135deg, 
                    rgba(34, 197, 94, 0.1) 0%, 
                    rgba(34, 197, 94, 0.05) 100%)`
                }}
              />
            )}
            
            {isConnected ? (
              <PhoneCall 
                size={24} 
                className="animate-pulse-gentle"
                style={{ color: '#22C55E' }}
              />
            ) : (
              <Phone 
                size={24} 
                style={{ color: 'var(--accent-blue)' }}
              />
            )}

            {isConnected && (
              <div 
                className="absolute -top-2 -right-2 px-2 py-1 rounded-lg ice-glass text-xs font-medium"
                style={{ 
                  color: 'var(--text-primary)',
                  fontSize: '10px'
                }}
              >
                {formatDuration(callDuration)}
              </div>
            )}
          </div>
        </button>
      ) : (
        // Full window
        <div 
          className="ice-glass-elevated rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, 
              var(--ice-surface) 0%,
              var(--ice-base) 30%,
              var(--ice-crystalline) 100%)`
          }}
        >
          {/* Header - drag here */}
          <div
            className="p-4 border-b cursor-move select-none"
            style={{ borderColor: 'var(--ice-border)' }}
            onMouseDown={startDrag}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: isConnected ? '#22C55E' : 'var(--accent-blue)',
                    boxShadow: isConnected ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(59, 130, 246, 0.3)'
                  }}
                />
                <div>
                  <h3 
                    className="font-semibold text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {contactName}
                  </h3>
                  <p 
                    className="text-xs opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {isConnected ? `Connected • ${formatDuration(callDuration)}` : contactNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onMinimize}
                  className="w-6 h-6 rounded-lg ice-glass flex items-center justify-center"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Minimize telephone interface"
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-lg ice-glass flex items-center justify-center hover:bg-red-500/20"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close telephone interface"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Call content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-2xl ice-glass-elevated mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, 
                    var(--ice-highlight) 0%,
                    var(--ice-surface) 50%,
                    var(--ice-crystalline) 100%)`
                }}
              >
                {isConnected ? (
                  <PhoneCall 
                    size={28} 
                    className="animate-pulse-gentle"
                    style={{ color: '#22C55E' }}
                  />
                ) : (
                  <Phone 
                    size={28} 
                    style={{ color: 'var(--accent-blue)' }}
                  />
                )}
              </div>
              
              {isConnected && (
                <div 
                  className="px-3 py-1 rounded-lg ice-glass inline-block text-sm font-medium"
                  style={{ 
                    color: '#22C55E',
                    background: 'rgba(34, 197, 94, 0.1)'
                  }}
                >
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {isConnected ? (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-12 h-12 rounded-xl ice-glass-elevated flex items-center justify-center"
                    style={{
                      color: isMuted ? '#F59E0B' : 'var(--text-secondary)'
                    }}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  <button
                    onClick={onHangup}
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      color: 'white'
                    }}
                    aria-label="Hang up call"
                  >
                    <PhoneOff size={24} />
                  </button>

                  <button
                    className="w-12 h-12 rounded-xl ice-glass-elevated flex items-center justify-center"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Adjust volume"
                  >
                    <Volume2 size={20} />
                  </button>
                </>
              ) : (
                <button
                  onClick={onCall}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    color: 'white'
                  }}
                  aria-label="Start call"
                >
                  <Phone size={28} />
                </button>
              )}
            </div>

            <div 
              className="mt-4 text-center text-sm opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isConnected 
                ? "AI assistant handling your call"
                : "Click to connect"
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}