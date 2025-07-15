"use client";

import { useChatStore } from "../hooks/use-chat-store";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Folder, MessageSquare, Plus } from "lucide-react";
import { useEffect } from "react";
import { cn } from "./ui/utils";

// Demo data for chat history
const chatHistoryFolders = [
  {
    id: "folder-1",
    name: "Healthcare Searches",
    chats: [
      { id: "chat-1", title: "Find a cardiologist", messages: [] },
      { id: "chat-2", title: "Pediatric dentist recommendations", messages: [] },
      { id: "chat-3", title: "Specialist for back pain", messages: [] }
    ]
  },
  {
    id: "folder-2",
    name: "Browser Tasks",
    chats: [
      { id: "chat-4", title: "Research medical conditions", messages: [] },
      { id: "chat-5", title: "Compare insurance options", messages: [] }
    ]
  },
  {
    id: "folder-3",
    name: "General",
    chats: [
      { id: "chat-6", title: "How to use the platform", messages: [] }
    ]
  }
];

export function ChatHistory() {
  const { folders, activeChatId, setActiveChatId, createNewChat } = useChatStore();

  // Load demo data into store on initial mount
  useEffect(() => {
    if (folders.length === 0) {
      useChatStore.setState({ folders: chatHistoryFolders, activeChatId: "chat-1" });
    }
  }, [folders.length]);

  return (
    <div className="p-2 space-y-2">
      <Accordion
        type="multiple"
        defaultValue={folders.map((folder) => folder.id)}
        className="w-full"
      >
        {folders.map((folder) => (
          <AccordionItem key={folder.id} value={folder.id} className="border-b-0">
            <div className="flex items-center justify-between group">
              <AccordionTrigger className="hover:no-underline flex-1 py-1.5 px-2 rounded-md hover:bg-muted text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">{folder.name}</span>
                </div>
              </AccordionTrigger>
               <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 group-data-[collapsible=icon]:hidden"
                onClick={() => createNewChat(folder.id, "New Chat")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <AccordionContent className="pl-4 pt-1 pb-0 group-data-[collapsible=icon]:hidden">
              <ul className="space-y-1">
                {folder.chats.map((chat) => (
                  <li key={chat.id}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-8",
                        activeChatId === chat.id && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => setActiveChatId(chat.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="truncate">{chat.title}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}