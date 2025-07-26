"use client"

import { useState } from "react"
import { BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { AIPromptBuilder } from "@/components/ai-prompt-builder"
import { useUserProfile } from "@/hooks/use-user-profile"

export function PromptBuilderDialog() {
    const [open, setOpen] = useState(false)
    const { userProfile } = useUserProfile()

    const handlePromptGenerated = (prompt: string) => {
        console.log("Generated prompt:", prompt)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-medium hover:text-primary">
                    <BrainCircuit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    AI Prompt Builder
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Prompt Builder</DialogTitle>
                    <DialogDescription>Create personalized healthcare search prompts using AI</DialogDescription>
                </DialogHeader>
                <AIPromptBuilder userProfile={userProfile} onPromptGenerated={handlePromptGenerated} />
            </DialogContent>
        </Dialog>
    )
}
