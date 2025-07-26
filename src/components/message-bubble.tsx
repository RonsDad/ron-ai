"use client"

import { Bot, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  className?: string
}

export function MessageBubble({ role, content, timestamp, className }: MessageBubbleProps) {
  const isUser = role === "user"

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse", className)}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%]",
          isUser && "flex flex-col items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            isUser 
              ? "bg-primary text-primary-foreground" 
              : "bg-card border border-border"
          )}
        >
          {/* Markdown content */}
          <div className={cn(
            "prose prose-sm max-w-none",
            isUser && "prose-invert",
            !isUser && "dark:prose-invert"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom code block rendering
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "")
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={match[1]}
                      PreTag="div"
                      className="!mt-0 !mb-0 !text-xs"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className={cn(
                        "px-1 py-0.5 rounded text-xs",
                        isUser 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-muted text-foreground"
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                // Customize other elements as needed
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                // This is a component factory for ReactMarkdown, not a standalone <li>
                // The actual <li> elements will be properly nested within <ul>/<ol> during rendering
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-muted-foreground mt-1 px-2">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}
