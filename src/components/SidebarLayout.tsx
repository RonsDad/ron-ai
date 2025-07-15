"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "./ui/sidebar";
import { ChatHistory } from "./ChatHistory";
import { Button } from "./ui/button";
import { LogOut, Settings, PanelLeftClose, PanelLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Chat History</h2>
            </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <ChatHistory />
        </SidebarContent>
        <SidebarFooter className="p-2 flex-col gap-2">
            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                <Avatar className="h-9 w-9">
                    <AvatarImage src="/api/placeholder/40/40" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold">User</p>
                    <p className="text-xs text-muted-foreground">user@example.com</p>
                </div>
                <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden">
                  <LogOut className="h-4 w-4"/>
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}