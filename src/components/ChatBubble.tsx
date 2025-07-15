import { ReactNode, useEffect, useState } from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatBubbleProps {
  type: "ai" | "user";
  children: ReactNode;
  timestamp?: string;
}

export function ChatBubble({ type, children, timestamp }: ChatBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isAI = type === "ai";
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-8 animate-slide-up ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`flex items-start gap-4 max-w-3xl ${isAI ? 'mr-16' : 'ml-16 flex-row-reverse'}`}>
        {/* Enhanced Avatar */}
        <div 
          className={`flex-shrink-0 w-12 h-12 rounded-2xl glass-effect-elevated flex items-center justify-center animate-scale-in group relative overflow-hidden ${
            isAI ? 'animate-glow-pulse' : ''
          }`}
          style={{
            background: isAI 
              ? `linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)`
              : `linear-gradient(135deg, var(--ice-surface) 0%, var(--ice-crystalline) 100%)`,
            boxShadow: isAI 
              ? `0 4px 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)`
              : `0 4px 20px rgba(0, 0, 0, 0.1)`,
            border: `1px solid ${isAI ? 'var(--accent-blue)' : 'var(--ice-border-bright)'}`,
            animationDelay: '200ms'
          }}
        >
          {/* Avatar shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          {isAI ? (
            <Bot 
              size={20} 
              style={{ color: 'white' }}
              className="transition-transform duration-200 group-hover:scale-110 relative z-10"
            />
          ) : (
            <User 
              size={20} 
              style={{ color: 'var(--accent-blue)' }}
              className="transition-transform duration-200 group-hover:scale-110 relative z-10"
            />
          )}
        </div>

        {/* Enhanced Message Container */}
        <div 
          className={`rounded-3xl p-6 glass-effect-elevated interactive-lift relative overflow-hidden group transition-all duration-500 hover:shadow-2xl ${
            isAI ? '' : 'glass-accent'
          }`}
          style={{
            background: isAI 
              ? `linear-gradient(135deg, 
                  var(--ice-surface) 0%, 
                  var(--ice-base) 30%, 
                  var(--ice-crystalline) 100%)`
              : `linear-gradient(135deg, 
                  var(--accent-blue) 0%, 
                  var(--accent-blue-bright) 100%)`,
            color: isAI ? 'var(--text-primary)' : 'white',
            border: `1px solid ${isAI ? 'var(--ice-border-bright)' : 'var(--accent-blue)'}`,
            boxShadow: isAI 
              ? `0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)`
              : `0 8px 32px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(59, 130, 246, 0.1)`,
            animationDelay: '300ms'
          }}
        >
          {/* Enhanced message content shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-2000 pointer-events-none" />
          
          {/* Crystalline reflection effect */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                transparent 30%, 
                transparent 70%, 
                rgba(255, 255, 255, 0.05) 100%)`
            }}
          />
          
          {/* Content */}
          <div className="relative z-10">
            {typeof children === 'string' ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gradient">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gradient">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mb-2">{children}</h3>,
                  code: ({ children }) => (
                    <code 
                      className="px-1.5 py-0.5 rounded text-sm font-mono"
                      style={{ 
                        backgroundColor: 'var(--ice-surface)',
                        color: 'var(--accent-blue)',
                        border: '1px solid var(--ice-border)'
                      }}
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre 
                      className="p-3 rounded-lg text-sm font-mono overflow-x-auto my-3"
                      style={{ 
                        backgroundColor: 'var(--ice-surface)',
                        border: '1px solid var(--ice-border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote 
                      className="border-l-4 pl-4 py-2 my-3 italic"
                      style={{ 
                        borderColor: 'var(--accent-blue)',
                        backgroundColor: 'var(--ice-surface)'
                      }}
                    >
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  a: ({ href, children }) => (
                    <a 
                      href={href}
                      className="underline hover:no-underline transition-all duration-200"
                      style={{ color: 'var(--accent-blue)' }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-gradient">{children}</strong>,
                  em: ({ children }) => <em className="italic" style={{ color: 'var(--text-secondary)' }}>{children}</em>,
                  table: ({ children }) => (
                    <table className="w-full border-collapse my-3">
                      {children}
                    </table>
                  ),
                  th: ({ children }) => (
                    <th 
                      className="border p-2 font-semibold text-left"
                      style={{ 
                        borderColor: 'var(--ice-border)',
                        backgroundColor: 'var(--ice-surface)'
                      }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td 
                      className="border p-2"
                      style={{ borderColor: 'var(--ice-border)' }}
                    >
                      {children}
                    </td>
                  )
                }}
              >
                {children}
              </ReactMarkdown>
            ) : (
              <div className="leading-relaxed">{children}</div>
            )}
            
            {/* Enhanced timestamp */}
            {timestamp && (
              <div 
                className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: isAI ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}
                />
                <span className="text-xs font-medium">
                  {timestamp}
                </span>
              </div>
            )}
          </div>

          {/* Enhanced message type indicator */}
          <div 
            className={`absolute top-4 ${isAI ? 'right-4' : 'left-4'} w-3 h-3 rounded-full opacity-80 animate-pulse`}
            style={{ 
              backgroundColor: isAI ? 'var(--accent-blue)' : 'white',
              boxShadow: isAI 
                ? `0 0 8px rgba(59, 130, 246, 0.5)` 
                : `0 0 8px rgba(255, 255, 255, 0.5)`
            }}
          />

          {/* Enhanced border glow */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%, 
                transparent 50%, 
                rgba(255, 255, 255, 0.05) 100%)`,
              border: `1px solid ${isAI ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`
            }}
          />
        </div>
      </div>
    </div>
  );
}