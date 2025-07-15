/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Send, ArrowUp, Eye, EyeOff, Search, Paperclip, Mic, MicOff, Loader2, Zap, GraduationCap } from "lucide-react";
import { MacroMenu } from "./MacroMenu";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Add global declarations for browser speech-recognition APIs so TypeScript stops complaining
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string, deepResearch: boolean, educationalMode: boolean, onMessageProcessed?: (response: string | ReactNode) => void) => Promise<void>;
  disabled?: boolean;
  onShowBrowser?: () => void;
  onShowPreview?: (content: any) => void;
  onShowPhone?: () => void;
}

export function ChatInput({ onSendMessage, disabled = false, onShowBrowser, onShowPreview, onShowPhone }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showMacroMenu, setShowMacroMenu] = useState(false);
  const [macroMenuPosition, setMacroMenuPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [educationalMode, setEducationalMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Close menu if slash was deleted
    if (showMacroMenu && !newValue.includes("/")) {
      setShowMacroMenu(false);
    }
    setMessage(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Open macro menu immediately on "/"
    if (!showMacroMenu && e.key === "/") {
      if (textareaRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMacroMenuPosition({ x: rect.left + 20, y: rect.top });
        setShowMacroMenu(true);
      }
      return;
    }

    // Only block arrow keys and Enter/Escape for macro menu navigation
    if (showMacroMenu && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter', 'Escape'].includes(e.key)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !showMacroMenu) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // submit message: send to agent, deepResearch flag indicates tool use
  const handleSubmit = () => {
    const text = message.trim();
    if (!text || disabled) return;
    onSendMessage(text, deepResearch, educationalMode);
    setMessage("");
    setShowMacroMenu(false);
    setDeepResearch(false);
    setEducationalMode(false);
    setAttachments([]);
  };

  // Deep Research toggle
  const toggleDeepResearch = () => {
    setDeepResearch(!deepResearch);
  };

  // Educational Mode toggle
  const toggleEducationalMode = () => {
    setEducationalMode(!educationalMode);
  };

  // Attachment handling
  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Speech-to-Text handling
  const toggleSTT = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setMessage(prev => prev + transcript);
        }
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      alert('Speech recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    // Recognition will stop automatically
  };

  const handleMacroSelect = (value: string) => {
    // Find the last "/" in the message and replace everything after it
    const lastSlashIndex = message.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      const beforeSlash = message.substring(0, lastSlashIndex);
      const newMessage = beforeSlash + value;
      setMessage(newMessage);
      
      
      // Focus back to textarea and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newMessage.length, newMessage.length);
        }
      }, 0);
    }
    setShowMacroMenu(false);
  };

  const handleMacroClose = () => {
    setShowMacroMenu(false);
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <>
      <div 
        ref={containerRef}
        className="relative ice-glass-elevated rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl group"
        style={{
          background: `linear-gradient(135deg, 
            var(--ice-surface) 0%,
            var(--ice-base) 30%,
            var(--ice-crystalline) 70%,
            var(--ice-highlight) 100%)`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.12), 
                      0 2px 8px rgba(0, 0, 0, 0.08),
                      inset 0 1px 2px rgba(255, 255, 255, 0.1)`,
          border: '1px solid var(--ice-border-bright)'
        }}
      >
        {/* Enhanced ice/glass overlay with animated shimmer */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(135deg, 
              var(--ice-highlight) 0%,
              transparent 25%,
              transparent 75%,
              var(--ice-reflection) 100%)`,
            opacity: 0.4
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000" />
        </div>

        {/* Attachment display */}
        {attachments.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-xl ice-glass text-sm"
                style={{
                  backgroundColor: 'var(--ice-surface)',
                  border: '1px solid var(--ice-border)'
                }}
              >
                <Paperclip size={14} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="hover:bg-red-500/20 rounded-full p-1 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Deep Research indicator */}
        {deepResearch && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl animate-pulse" style={{
            backgroundColor: 'var(--accent-blue)',
            color: 'white'
          }}>
            <Search size={14} />
            <span className="text-sm font-medium">Deep Research Mode Active</span>
          </div>
        )}

        {/* Educational Mode indicator */}
        {educationalMode && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl animate-pulse" style={{
            backgroundColor: 'var(--accent-purple)',
            color: 'white'
          }}>
            <GraduationCap size={14} />
            <span className="text-sm font-medium">Educational Content Mode Active</span>
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-3 relative z-10">
          <div className="flex-1 relative">
            {/* Markdown Preview Toggle */}
            {message.trim() && (
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className="absolute right-3 top-3 z-10 p-1 rounded-lg ice-glass transition-all duration-200 hover:shadow-md"
                style={{ 
                  backgroundColor: 'var(--ice-surface)',
                  border: '1px solid var(--ice-border)'
                }}
              >
                {showMarkdownPreview ? (
                  <EyeOff size={14} style={{ color: 'var(--text-secondary)' }} />
                ) : (
                  <Eye size={14} style={{ color: 'var(--text-secondary)' }} />
                )}
              </button>
            )}

            {showMarkdownPreview && message.trim() ? (
              /* Markdown Preview */
              <div
                className="w-full rounded-xl px-4 py-3 text-sm leading-relaxed min-h-[48px] max-h-[120px] overflow-y-auto"
                style={{
                  backgroundColor: 'var(--ice-base)',
                  border: '1px solid var(--ice-border)',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ children }) => (
                      <code 
                        className="px-1 py-0.5 rounded text-xs"
                        style={{ 
                          backgroundColor: 'var(--ice-surface)',
                          color: 'var(--accent-blue)'
                        }}
                      >
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre 
                        className="p-2 rounded text-xs overflow-x-auto"
                        style={{ 
                          backgroundColor: 'var(--ice-surface)',
                          border: '1px solid var(--ice-border)'
                        }}
                      >
                        {children}
                      </pre>
                    )
                  }}
                >
                  {message}
                </ReactMarkdown>
              </div>
            ) : (
              /* Regular Textarea */
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message Nira... (try typing / for quick info, supports **markdown**)"
                disabled={disabled}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed transition-all duration-300 focus:outline-none focus:ring-2 min-h-[48px] max-h-[120px]"
                style={{
                  backgroundColor: 'var(--ice-base)',
                  border: '1px solid var(--ice-border)',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(20px)'
                }}
                rows={1}
              />
            )}
            
            {/* Placeholder enhancement */}
            {!showMarkdownPreview && (
              <div 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-40"
                style={{
                  display: message ? 'none' : 'block'
                }}
              >
                <div className="flex items-center gap-1 text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Press
                  </span>
                  <kbd 
                    className="px-1.5 py-0.5 rounded text-xs ice-glass"
                    style={{ 
                      color: 'var(--accent-blue)',
                      fontSize: '10px'
                    }}
                  >
                    /
                  </kbd>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Container */}
          <div className="flex items-center gap-2">
            {/* Deep Research Button */}
            <button
              onClick={toggleDeepResearch}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 interactive-scale group relative overflow-hidden ${
                deepResearch ? 'shadow-lg' : 'hover:shadow-md'
              }`}
              style={{
                background: deepResearch
                  ? `linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)`
                  : `linear-gradient(135deg, var(--ice-surface) 0%, var(--ice-base) 100%)`,
                border: `1px solid ${deepResearch ? 'var(--accent-blue)' : 'var(--ice-border)'}`,
                boxShadow: deepResearch ? `0 0 20px rgba(59, 130, 246, 0.3)` : undefined
              }}
              title="Deep Research Mode"
            >
              <Search 
                size={16} 
                className={`transition-all duration-300 ${deepResearch ? 'animate-pulse' : 'group-hover:scale-110'}`}
                style={{ color: deepResearch ? 'white' : 'var(--accent-blue)' }}
              />
            </button>

            {/* Educational Mode Button */}
            <button
              onClick={toggleEducationalMode}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 interactive-scale group relative overflow-hidden ${
                educationalMode ? 'shadow-lg' : 'hover:shadow-md'
              }`}
              style={{
                background: educationalMode
                  ? `linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-bright) 100%)`
                  : `linear-gradient(135deg, var(--ice-surface) 0%, var(--ice-base) 100%)`,
                border: `1px solid ${educationalMode ? 'var(--accent-purple)' : 'var(--ice-border)'}`,
                boxShadow: educationalMode ? `0 0 20px rgba(147, 51, 234, 0.3)` : undefined
              }}
              title="Educational Content Mode"
            >
              <GraduationCap 
                size={16} 
                className={`transition-all duration-300 ${educationalMode ? 'animate-pulse' : 'group-hover:scale-110'}`}
                style={{ color: educationalMode ? 'white' : 'var(--accent-purple)' }}
              />
            </button>

            {/* Attachment Button */}
            <button
              onClick={handleAttachment}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 interactive-scale group relative overflow-hidden hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, var(--ice-surface) 0%, var(--ice-base) 100%)`,
                border: '1px solid var(--ice-border)'
              }}
              title="Attach File"
            >
              <Paperclip 
                size={16} 
                className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                style={{ color: 'var(--accent-blue)' }}
              />
            </button>

            {/* Speech-to-Text Button */}
            <button
              onClick={toggleSTT}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 interactive-scale group relative overflow-hidden ${
                isListening ? 'shadow-lg animate-pulse' : 'hover:shadow-md'
              }`}
              style={{
                background: isListening
                  ? `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`
                  : `linear-gradient(135deg, var(--ice-surface) 0%, var(--ice-base) 100%)`,
                border: `1px solid ${isListening ? '#ef4444' : 'var(--ice-border)'}`,
                boxShadow: isListening ? `0 0 20px rgba(239, 68, 68, 0.3)` : undefined
              }}
              title={isListening ? "Stop Recording" : "Start Voice Input"}
            >
              {isListening ? (
                <MicOff 
                  size={16} 
                  className="animate-pulse"
                  style={{ color: 'white' }}
                />
              ) : (
                <Mic 
                  size={16} 
                  className="transition-transform duration-300 group-hover:scale-110"
                  style={{ color: 'var(--accent-blue)' }}
                />
              )}
            </button>

            {/* Enhanced Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || disabled}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 interactive-scale group relative overflow-hidden ${
                message.trim() && !disabled
                  ? 'ice-glass-elevated shadow-lg hover:shadow-xl' 
                  : 'ice-glass opacity-50 cursor-not-allowed'
              }`}
              style={{
                background: message.trim() && !disabled
                  ? `linear-gradient(135deg, 
                      var(--accent-blue) 0%, 
                      var(--accent-blue-bright) 100%)`
                  : `linear-gradient(135deg, 
                      var(--ice-surface) 0%,
                      var(--ice-base) 100%)`,
                boxShadow: message.trim() && !disabled 
                  ? `0 4px 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)`
                  : undefined
              }}
              title="Send Message"
            >
              {/* Crystalline shine effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(45deg, 
                    transparent 30%, 
                    var(--ice-highlight) 50%, 
                    transparent 70%)`
                }}
              />
              
              <div className="relative">
                {disabled ? (
                  <div className="flex space-x-0.5">
                    {[0, 1, 2].map((i) => (
                      <div 
                        key={i}
                        className="w-1 h-1 rounded-full animate-bounce"
                        style={{ 
                          backgroundColor: 'var(--accent-blue)',
                          animationDelay: `${i * 150}ms`
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <ArrowUp 
                    size={18} 
                    className="transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12"
                    style={{ 
                      color: message.trim() ? 'white' : 'var(--text-secondary)'
                    }}
                  />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced bottom border glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-px rounded-full"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              var(--accent-blue) 20%, 
              var(--accent-blue-bright) 50%, 
              var(--accent-blue) 80%, 
              transparent 100%)`,
            opacity: deepResearch ? 0.8 : 0.3,
            filter: deepResearch ? 'blur(0.5px)' : 'none'
          }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
          title="Upload attachment"
          aria-label="Upload attachment"
        />
      </div>

      {/* Macro Menu - rendered without wrapper to avoid layout disruption */}
      {showMacroMenu && (
        <MacroMenu
          isVisible={showMacroMenu}
          onSelect={handleMacroSelect}
          onClose={handleMacroClose}
          position={macroMenuPosition}
        />
      )}
    </>
  );
}
