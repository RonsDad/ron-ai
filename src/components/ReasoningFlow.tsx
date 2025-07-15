import React from 'react';
import { Brain, Target, CheckCircle, AlertCircle, Activity, Lightbulb, ArrowRight } from 'lucide-react';

interface ReasoningStep {
  stepNumber: number;
  thinking?: string;
  evaluation?: string;
  memory?: string;
  nextGoal?: string;
  actions?: Array<{ type: string; details: any }>;
  results?: Array<{ success: boolean; error?: string }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface ReasoningFlowProps {
  steps: ReasoningStep[];
  currentStep: number;
}

export const ReasoningFlow: React.FC<ReasoningFlowProps> = ({ steps, currentStep }) => {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No reasoning steps yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Agent Reasoning Flow</h3>
      </div>

      {steps.map((step, index) => (
        <div
          key={step.stepNumber}
          className={`relative ${index < steps.length - 1 ? 'pb-8' : ''}`}
        >
          {/* Connection line to next step */}
          {index < steps.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600" />
          )}

          {/* Step card */}
          <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
            step.status === 'in_progress' 
              ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' 
              : 'border-gray-200 dark:border-gray-700'
          } p-4`}>
            {/* Step header */}
            <div className="flex items-start space-x-3 mb-3">
              {/* Step indicator */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                step.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                step.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                step.status === 'in_progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> :
                 step.status === 'failed' ? <AlertCircle className="w-6 h-6" /> :
                 step.status === 'in_progress' ? (
                   <div className="animate-spin">
                     <Activity className="w-6 h-6" />
                   </div>
                 ) : (
                   <span className="font-bold">{step.stepNumber}</span>
                 )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                {/* Thinking/Reasoning */}
                {step.thinking && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                      <Lightbulb className="w-4 h-4" />
                      <span>Reasoning</span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      {step.thinking}
                    </div>
                  </div>
                )}

                {/* Goal */}
                {step.nextGoal && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                      <Target className="w-4 h-4" />
                      <span>Goal</span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {step.nextGoal}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {step.actions && step.actions.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      <Activity className="w-4 h-4" />
                      <span>Actions</span>
                    </div>
                    <div className="space-y-1">
                      {step.actions.map((action, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <ArrowRight className="w-3 h-3" />
                          <span>{formatAction(action)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                {step.results && step.results.length > 0 && (
                  <div className="mt-2">
                    {step.results.map((result, idx) => (
                      <div key={idx} className={`text-sm ${
                        result.error 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {result.error ? `❌ ${result.error}` : '✓ Success'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to format actions
function formatAction(action: any): string {
  if (!action) return 'Unknown action';
  
  const actionType = action.type || Object.keys(action)[0];
  const details = action.details || action[actionType];
  
  switch (actionType) {
    case 'click':
      return `Click on element ${details?.index || details?.selector || 'unknown'}`;
    case 'type':
      return `Type "${details?.text || details?.value}" into element`;
    case 'navigate':
      return `Navigate to ${details?.url || 'unknown URL'}`;
    case 'wait':
      return `Wait ${details?.duration || details?.timeout || 1000}ms`;
    case 'screenshot':
      return 'Take screenshot';
    case 'done':
      return `Complete task`;
    default:
      return `${actionType}`;
  }
}

export default ReasoningFlow; 