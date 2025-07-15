"use client";

import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { cn } from "./ui/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  thinking?: any[];
  tool_calls?: any[];
  tool_results?: any[];
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const LoadingSpinner = () => (
  <motion.div
    className="flex space-x-1.5"
    initial="hidden"
    animate="visible"
    variants={{
      visible: {
        transition: {
          staggerChildren: 0.2,
        },
      },
    }}
  >
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-muted-foreground rounded-full"
        variants={{
          hidden: { y: 0 },
          visible: {
            y: [0, -4, 0],
            transition: {
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            },
          },
        }}
      />
    ))}
  </motion.div>
);

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  const { sender, text, thinking, tool_calls, tool_results } = message;
  const isUser = sender === 'user';

  return (
    <div
      className={cn(
        "flex items-start gap-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="w-10 h-10 border-2 border-primary/50">
          <div className="w-full h-full flex items-center justify-center bg-background">
            <Bot className="w-6 h-6 text-primary"/>
          </div>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[75%] space-y-2",
           isUser ? "text-right" : "text-left",
        )}
      >
        <div
          className={cn(
            "p-4 rounded-2xl",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted rounded-bl-none"
          )}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-current">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Thinking section - Moved above main content with proper formatting */}
        
        {/* Tool calls section */}
        {tool_calls && tool_calls.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tools">
              <AccordionTrigger className="text-xs">Tool Calls ({tool_calls.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {tool_calls.map((tool, index) => (
                    <pre key={index} className="bg-black/20 p-2 rounded-md text-xs">{JSON.stringify(tool, null, 2)}</pre>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* Tool results section */}
        {tool_results && tool_results.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="results">
              <AccordionTrigger className="text-xs">Tool Results ({tool_results.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {tool_results.map((result, index) => (
                    <pre key={index} className="bg-black/20 p-2 rounded-md text-xs">{JSON.stringify(result, null, 2)}</pre>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      {isUser && (
        <Avatar className="w-10 h-10 border-2 border-muted">
            <div className="w-full h-full flex items-center justify-center bg-muted">
                <User className="w-5 h-5" />
            </div>
        </Avatar>
      )}
    </div>
  );
} 