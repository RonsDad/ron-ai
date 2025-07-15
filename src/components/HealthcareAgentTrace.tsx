
"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { agentTraceSteps } from '../lib/demo-data';

const stepVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

const iconVariants = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: { type: 'spring', stiffness: 400, damping: 20 } },
};

export function HealthcareAgentTrace() {
  const [completedStep, setCompletedStep] = useState(-1);

  useEffect(() => {
    // Reset on mount in case it's re-rendered
    setCompletedStep(-1);

    const interval = setInterval(() => {
      setCompletedStep(prev => {
        const nextStep = prev + 1;
        if (nextStep >= agentTraceSteps.length -1) {
          clearInterval(interval);
        }
        return nextStep;
      });
    }, 350);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
       <h3 className="text-xl font-semibold text-center text-foreground mb-4">Healthcare AI is thinking...</h3>
      {agentTraceSteps.map((step, index) => {
        const isCompleted = index <= completedStep;
        const isCurrent = index === completedStep + 1;

        return (
          <motion.div
            key={index}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={stepVariants}
            className="flex items-start gap-4 p-3 rounded-lg bg-muted/30"
          >
            <div className="flex-shrink-0 mt-1 w-5 h-5">
              {isCompleted ? (
                <motion.div initial="initial" animate="animate" variants={iconVariants}>
                   <CheckCircle2 className="w-5 h-5 text-green-400" />
                </motion.div>
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <CircleDashed className="w-5 h-5 text-muted-foreground/50" />
              )}
            </div>
            <p className={`flex-1 transition-colors duration-300 ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
              {step}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
