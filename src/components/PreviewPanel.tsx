import { useState, useEffect } from "react";
import { Code, FileText, Search, Mail, ChevronDown, Play, RefreshCw, Star, MapPin, Clock, Calendar, CreditCard, Shield, Download, Copy, Maximize2 } from "lucide-react";
import Editor from '@monaco-editor/react';

interface PreviewContent {
  type: "educational" | "search" | "communication" | "code" | "interactive_tool";
  title: string;
  content: any;
  isLoading?: boolean;
  language?: string;
  executable?: boolean;
  framework?: string;
}

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  timestamp: string;
}

interface PreviewPanelProps {
  isActive: boolean;
  content?: PreviewContent;
  onRefresh?: () => void;
}

export function PreviewPanel({ isActive, content, onRefresh }: PreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isActive) return null;

  const getIcon = () => {
    switch (content?.type) {
      case "educational": return FileText;
      case "search": return Search;
      case "communication": return Mail;
      case "code": return Code;
      case "interactive_tool": return Play;
      default: return FileText;
    }
  };

  // Initialize editor content when content changes
  useEffect(() => {
    if (content?.content && typeof content.content === 'string') {
      setEditorValue(content.content);
    } else if (content?.content?.code) {
      setEditorValue(content.content.code);
    }
  }, [content]);

  const handleExecuteCode = async () => {
    if (!editorValue.trim()) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      // Simulate code execution - in real implementation, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For Maya demo, simulate successful execution
      setExecutionResult({
        success: true,
        output: "Maya's symptom tracker initialized successfully!\nTracking: Joint pain, morning stiffness, fatigue\nNext assessment: Tomorrow at 8:00 AM",
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorValue);
  };

  const handleDownload = () => {
    const blob = new Blob([editorValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content?.title || 'code'}.${content?.language || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const IconComponent = getIcon();

  const renderContent = () => {
    if (!content) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div 
              className="w-16 h-16 rounded-xl ice-glass flex items-center justify-center mx-auto"
              style={{
                background: `linear-gradient(135deg, 
                  var(--ice-highlight) 0%, 
                  var(--ice-crystalline) 100%)`
              }}
            >
              <Code 
                size={28} 
                style={{ color: 'var(--accent-blue)' }}
              />
            </div>
            <div>
              <p 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Ready for Preview
              </p>
              <p 
                className="text-sm opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                Content will appear here when generated
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (content.isLoading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div 
              className="w-12 h-12 rounded-xl ice-glass flex items-center justify-center mx-auto animate-pulse-gentle"
              style={{
                background: `linear-gradient(135deg, 
                  var(--ice-highlight) 0%, 
                  var(--ice-crystalline) 100%)`
              }}
            >
              <RefreshCw 
                size={24} 
                style={{ color: 'var(--accent-blue)' }}
                className="animate-spin"
              />
            </div>
            <div>
              <p 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Generating Content...
              </p>
              <p 
                className="text-xs opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                AI is creating {content.type} content
              </p>
            </div>
          </div>
        </div>
      );
    }

    switch (content.type) {
      case "educational":
        return (
          <div className="p-6 space-y-4">
            <div className="ice-glass-elevated p-4 rounded-lg">
              <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Understanding Your Condition
              </h4>
              <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <p>Dermatological conditions can vary widely in their presentation and treatment requirements...</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="ice-glass p-3 rounded-lg">
                    <h5 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Symptoms</h5>
                    <p className="text-xs">• Persistent rash or irritation</p>
                    <p className="text-xs">• Changes in skin texture</p>
                  </div>
                  <div className="ice-glass p-3 rounded-lg">
                    <h5 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Treatment</h5>
                    <p className="text-xs">• Topical medications</p>
                    <p className="text-xs">• Lifestyle modifications</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "search":
        return (
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {[
                { name: "Dr. Sarah Kim, MD", specialty: "Dermatology & Cosmetic Surgery", rating: 4.9, reviews: 127, distance: "2.3 miles", time: "Tomorrow 2:30 PM" },
                { name: "Dr. Michael Lee, MD", specialty: "General & Pediatric Dermatology", rating: 4.8, reviews: 89, distance: "3.1 miles", time: "Tuesday 10:00 AM" },
                { name: "Dr. Lisa Rodriguez, MD", specialty: "Dermatopathology & Mohs Surgery", rating: 4.9, reviews: 156, distance: "4.2 miles", time: "Wednesday 1:15 PM" }
              ].map((provider, i) => (
                <div key={i} className="ice-glass-elevated p-4 rounded-lg interactive-lift cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {provider.name}
                      </h4>
                      <p className="text-sm mb-2 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {provider.specialty}
                      </p>
                    </div>
                    <div className="ice-glass px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0" style={{ color: 'var(--accent-blue)' }}>
                      Open
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex items-center gap-1">
                      <Star 
                        size={12} 
                        style={{ color: 'var(--accent-blue)' }}
                        fill="var(--accent-blue)"
                      />
                      <span>{provider.rating} ({provider.reviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin 
                        size={12} 
                        style={{ color: 'var(--accent-blue)' }}
                      />
                      <span>{provider.distance}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock 
                        size={12} 
                        style={{ color: 'var(--accent-blue)' }}
                      />
                      <span>Next: {provider.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "communication":
        return (
          <div className="p-6 space-y-4">
            <div className="ice-glass-elevated rounded-lg overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: 'var(--ice-border)' }}>
                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Appointment Confirmation
                </h4>
                <p className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  Dr. Michael Lee - Tuesday, 2:30 PM
                </p>
              </div>
              <div className="p-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <p>Dear Patient,</p>
                <p>Your appointment has been successfully scheduled with Dr. Michael Lee for Tuesday at 2:30 PM.</p>
                <div className="ice-glass p-3 rounded-lg">
                  <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Appointment Details:</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} style={{ color: 'var(--accent-blue)' }} />
                      <span>Tuesday, January 9th, 2025</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} style={{ color: 'var(--accent-blue)' }} />
                      <span>2:30 PM - 3:00 PM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} style={{ color: 'var(--accent-blue)' }} />
                      <span>890 Health Center Blvd</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={12} style={{ color: 'var(--accent-blue)' }} />
                      <span>Insurance: Aetna accepted</span>
                    </div>
                  </div>
                </div>
                <p>Please arrive 15 minutes early for check-in.</p>
              </div>
            </div>
          </div>
        );

      case "code":
      case "interactive_tool":
        return (
          <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'p-6'}`}>
            <div className="ice-glass-elevated rounded-lg overflow-hidden h-full flex flex-col">
              {/* Code Editor Header */}
              <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--ice-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {content?.title || 'Interactive Tool'}
                  </span>
                  {content?.language && (
                    <span className="ice-glass px-2 py-1 rounded text-xs" style={{ color: 'var(--accent-blue)' }}>
                      {content.language}
                    </span>
                  )}
                  {content?.framework && (
                    <span className="ice-glass px-2 py-1 rounded text-xs" style={{ color: 'var(--accent-purple)' }}>
                      {content.framework}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopyCode}
                    className="ice-glass px-2 py-1 rounded text-xs interactive-scale"
                    title="Copy code"
                  >
                    <Copy size={12} className="inline mr-1" />
                    Copy
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="ice-glass px-2 py-1 rounded text-xs interactive-scale"
                    title="Download code"
                  >
                    <Download size={12} className="inline mr-1" />
                    Download
                  </button>
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="ice-glass px-2 py-1 rounded text-xs interactive-scale"
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    <Maximize2 size={12} className="inline mr-1" />
                    {isFullscreen ? 'Exit' : 'Full'}
                  </button>
                  {content?.executable && (
                    <button 
                      onClick={handleExecuteCode}
                      disabled={isExecuting || !editorValue.trim()}
                      className={`px-3 py-1 rounded text-xs interactive-scale font-medium ${
                        isExecuting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        background: 'var(--accent-blue)',
                        color: 'white'
                      }}
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw size={12} className="inline mr-1 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play size={12} className="inline mr-1" />
                          Run
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Monaco Editor */}
              <div className={`flex-1 ${isFullscreen ? 'h-screen' : 'h-80'}`}>
                <Editor
                  height="100%"
                  language={content?.language || 'javascript'}
                  value={editorValue}
                  onChange={(value) => setEditorValue(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    fontFamily: 'Monaco, "Monaco for Powerline", monospace',
                    wordWrap: 'on',
                    automaticLayout: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: 'on',
                    accessibilitySupport: 'auto',
                    formatOnPaste: true,
                    formatOnType: true
                  }}
                  loading={<div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>Loading editor...</div>}
                />
              </div>
              
              {/* Execution Results */}
              {executionResult && (
                <div className="border-t" style={{ borderColor: 'var(--ice-border)' }}>
                  <div className={`p-4 text-sm ${
                    executionResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {executionResult.success ? '✓ Execution Complete' : '✗ Execution Failed'}
                      </span>
                      <span className="text-xs opacity-70">
                        {executionResult.timestamp}
                      </span>
                    </div>
                    <div 
                      className="font-mono text-xs p-2 rounded"
                      style={{ 
                        backgroundColor: 'var(--ice-surface)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <pre className="whitespace-pre-wrap">
                        {executionResult.success ? executionResult.output : executionResult.error}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ice-glass-elevated rounded-xl overflow-hidden animate-slide-up">
      {/* Panel Header */}
      <div className="p-4 border-b border-ice-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className="w-8 h-8 rounded-lg ice-glass flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, 
                    var(--ice-highlight) 0%, 
                    var(--ice-crystalline) 100%)`
                }}
              >
                <IconComponent 
                  size={16} 
                  style={{ color: 'var(--accent-blue)' }}
                />
              </div>
              {content?.isLoading && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse-gentle"
                  style={{ backgroundColor: 'var(--accent-blue)' }}
                />
              )}
            </div>
            <div>
              <h3 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Preview
              </h3>
              <p 
                className="text-xs opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                {content ? `${content.type} • ${content.title}` : 'Ready for content'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            {content && onRefresh && (
              <button
                onClick={onRefresh}
                className="ice-glass p-2 rounded-lg interactive-scale transition-all duration-200"
                title="Refresh preview"
                aria-label="Refresh preview"
                type="button"
              >
                <RefreshCw 
                  size={14} 
                  style={{ color: 'var(--text-secondary)' }}
                />
              </button>
            )}
                                                                                                                                
            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ice-glass p-2 rounded-lg interactive-scale transition-all duration-200"
              title={isExpanded ? "Collapse preview" : "Expand preview"}
              aria-label={isExpanded ? "Collapse preview" : "Expand preview"}
              type="button"
            >
              <ChevronDown 
                size={14} 
                style={{ color: 'var(--text-secondary)' }}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {renderContent()}
        </div>
      )}
    </div>
  );
}