import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ChevronRight, ChevronDown, CheckCircle, XCircle, Clock, Brain, Target, Activity, FileText, AlertCircle, Lightbulb, Info } from 'lucide-react';

interface AgentStep {
  stepNumber: number;
  evaluation: string;
  memory: string;
  nextGoal: string;
  thinking?: string;  // Add thinking/reasoning field
  context?: {         // Add context information
    task?: string;
    total_steps?: number;
    previous_errors?: string[];
  };
  actions: Array<{
    type: string;
    details: any;
  }>;
  results: Array<{
    success: boolean;
    error?: string;
    extractedContent?: string;
  }>;
  screenshot?: string;
  url?: string;
  title?: string;
  timestamp: string;
  duration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface AgentStepsPanelProps {
  sessionId: string;
  isActive: boolean;
  currentTask?: string;
  steps: AgentStep[];
  maxSteps?: number;
}

const AgentStepsPanel = forwardRef(({ sessionId, isActive, currentTask, steps, maxSteps = 100 }: AgentStepsPanelProps, ref) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (autoScroll && stepsEndRef.current) {
      stepsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps, autoScroll]);

  // Auto-expand new steps
  useEffect(() => {
    if (steps.length > 0) {
      const latestStep = steps[steps.length - 1];
      setExpandedSteps(prev => new Set([...prev, latestStep.stepNumber]));
    }
  }, [steps.length]);

  // Toggle step expansion
  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepNumber)) {
        newSet.delete(stepNumber);
      } else {
        newSet.add(stepNumber);
      }
      return newSet;
    });
  };

  // Format duration in seconds
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  // Get step status icon
  const getStatusIcon = (status: AgentStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Format action for display
  const formatAction = (action: any) => {
    if (!action) return 'Unknown action';
    
    // Handle different action types
    const actionType = action.type || Object.keys(action)[0];
    const details = action.details || action[actionType];
    
    switch (actionType) {
      case 'click':
        return `Click on element ${details?.index || details?.selector || 'unknown'}`;
      case 'type':
        return `Type "${details?.text || details?.value}" into element ${details?.index || details?.selector || 'unknown'}`;
      case 'navigate':
        return `Navigate to ${details?.url || 'unknown URL'}`;
      case 'wait':
        return `Wait ${details?.duration || details?.timeout || 1000}ms`;
      case 'screenshot':
        return 'Take screenshot';
      case 'done':
        return `Complete task (success: ${details?.success})`;
      default:
        return `${actionType}: ${JSON.stringify(details).substring(0, 50)}...`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agent Steps</h3>
            {isActive && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {steps.length} / {maxSteps} steps
            </span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1 rounded ${autoScroll ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              title="Auto-scroll"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {currentTask && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
            Task: {currentTask}
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {steps.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No steps executed yet</p>
          </div>
        ) : (
          steps.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Step Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => toggleStep(step.stepNumber)}
              >
                <div className="flex items-center space-x-3">
                  {expandedSteps.has(step.stepNumber) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  {getStatusIcon(step.status)}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Step {step.stepNumber}
                  </span>
                  {step.nextGoal && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {step.nextGoal.split('\n')[0]}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  {step.duration && <span>{formatDuration(step.duration)}</span>}
                  <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedSteps.has(step.stepNumber) && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  {/* Thinking/Reasoning */}
                  {step.thinking && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-purple-600 dark:text-purple-400">
                        <Lightbulb className="w-3 h-3" />
                        <span>Agent Reasoning</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg whitespace-pre-wrap">
                        {step.thinking}
                      </div>
                    </div>
                  )}

                  {/* Context Information */}
                  {step.context && (step.context.previous_errors?.length || step.context.total_steps) && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Info className="w-3 h-3" />
                        <span>Context</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded space-y-1">
                        {step.context.total_steps && (
                          <div>Total steps taken: {step.context.total_steps}</div>
                        )}
                        {step.context.previous_errors && step.context.previous_errors.length > 0 && (
                          <div className="text-red-600 dark:text-red-400">
                            Previous errors: {step.context.previous_errors.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Evaluation */}
                  {step.evaluation && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Evaluation of Previous Step</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        {step.evaluation}
                      </div>
                    </div>
                  )}

                  {/* Memory */}
                  {step.memory && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Brain className="w-3 h-3" />
                        <span>Memory</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        {step.memory}
                      </div>
                    </div>
                  )}

                  {/* Next Goal */}
                  {step.nextGoal && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Target className="w-3 h-3" />
                        <span>Goal for This Step</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        {step.nextGoal}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {step.actions && step.actions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Activity className="w-3 h-3" />
                        <span>Actions</span>
                      </div>
                      <div className="space-y-1">
                        {step.actions.map((action, idx) => (
                          <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            {idx + 1}. {formatAction(action)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {step.results && step.results.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <FileText className="w-3 h-3" />
                        <span>Results</span>
                      </div>
                      <div className="space-y-1">
                        {step.results.map((result, idx) => (
                          <div 
                            key={idx} 
                            className={`text-sm p-2 rounded ${
                              result.error 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            }`}
                          >
                            {result.error ? (
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{result.error}</span>
                              </div>
                            ) : (
                              <span>{result.extractedContent || 'Success'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Screenshot Preview */}
                  {step.screenshot && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Screenshot
                      </div>
                      <div className="relative group">
                        <img 
                          src={`data:image/png;base64,${step.screenshot}`} 
                          alt={`Step ${step.stepNumber} screenshot`}
                          className="w-full rounded border border-gray-300 dark:border-gray-600"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {step.url && <div>URL: {step.url}</div>}
                          {step.title && <div>Title: {step.title}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={stepsEndRef} />
      </div>
    </div>
  );
});

AgentStepsPanel.displayName = 'AgentStepsPanel';

export default AgentStepsPanel; 