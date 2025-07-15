
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from './ui/badge';
import { BrainCircuit, Loader2, Sparkles, PlusCircle, XCircle, RefreshCw, Search, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ProviderService } from '@/lib/provider-service';
import { generateAgentPrompt } from '@/ai/flows/prompt-builder';
import type { PromptBuilderInput } from '@/ai/flows/prompt-builder';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { LANGUAGES, PREDEFINED_TAGS, MAX_TOTAL_TAGS, MAX_CUSTOM_TAGS } from './prompt-builder/constants';

interface PromptBuilderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onPromptGenerated: (prompt: string) => void;
}

export function PromptBuilderDialog({
  isOpen,
  onOpenChange,
  initialQuery,
  onPromptGenerated,
}: PromptBuilderDialogProps) {
  const [searchType, setSearchType] = useState<'Provider' | 'Facility'>('Provider');
  const [specialty, setSpecialty] = useState<string>('any');
  const [proximity, setProximity] = useState<number>(25);
  const [gender, setGender] = useState<string>('any');
  const [language, setLanguage] = useState<string>('any');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const specializations = ProviderService.getCommonSpecialties();
  const totalTagsCount = selectedTags.length + customTags.length;
  const canAddMoreTags = totalTagsCount < MAX_TOTAL_TAGS;

  useEffect(() => {
    if (!isOpen) {
      setGeneratedPrompt('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchType === 'Facility') {
      setGender('any');
    }
  }, [searchType]);

  const handleTagChange = (tagLabel: string, checked: boolean) => {
    if (checked && !canAddMoreTags) {
      toast({
        variant: 'destructive',
        title: 'Tag Limit Reached',
        description: `You can select up to ${MAX_TOTAL_TAGS} attributes in total.`,
      });
      return;
    }
    setSelectedTags((prev) =>
      checked ? [...prev, tagLabel] : prev.filter((label) => label !== tagLabel)
    );
  };
  
  const handleAddCustomTag = () => {
    if (customTagInput.trim() && customTags.length < MAX_CUSTOM_TAGS && canAddMoreTags) {
      setCustomTags([...customTags, customTagInput.trim()]);
      setCustomTagInput('');
    } else if (!canAddMoreTags) {
      toast({
        variant: 'destructive',
        title: 'Tag Limit Reached',
        description: `You can select up to ${MAX_TOTAL_TAGS} attributes in total.`,
      });
    } else if (customTags.length >= MAX_CUSTOM_TAGS) {
      toast({
        variant: 'destructive',
        title: 'Custom Tag Limit Reached',
        description: `You can add up to ${MAX_CUSTOM_TAGS} custom attributes.`,
      });
    }
  };

  const handleRemoveCustomTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((tag) => tag !== tagToRemove));
  };

  const handleGeneratePrompt = () => {
    const input: PromptBuilderInput = {
      searchType,
      query: initialQuery,
      specialty: specialty === 'any' || !specialty ? undefined : specialty,
      proximity,
      gender: searchType === 'Provider' && gender !== 'any' ? gender : undefined,
      language: language === 'any' || !language ? undefined : language,
      tags: [...selectedTags, ...customTags],
    };

    startTransition(async () => {
      try {
        const result = await generateAgentPrompt(input);
        setGeneratedPrompt(result.agentPrompt);
      } catch (error) {
        console.error('Failed to generate prompt:', error);
        toast({
          variant: "destructive",
          title: "Prompt Generation Failed",
          description: "There was an error communicating with the AI. Please try again later."
        });
      }
    });
  };

  const handleUsePrompt = () => {
    onPromptGenerated(generatedPrompt);
  };
  
  const handleRegenerate = () => {
    setGeneratedPrompt('');
    handleGeneratePrompt();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl glassmorphic max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BrainCircuit className="h-6 w-6 text-primary" />
            AI Prompt Builder
          </DialogTitle>
          <DialogDescription>
            {generatedPrompt ? "Review your generated prompt below." : "Craft the perfect prompt to find your ideal healthcare solution."}
          </DialogDescription>
        </DialogHeader>
        
        {isPending ? (
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating your personalized prompt...</p>
          </div>
        ) : !generatedPrompt ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 py-4">
              {/* Column 1: Search Criteria */}
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <Label>I'm looking for a...</Label>
                  <RadioGroup value={searchType} onValueChange={(v) => setSearchType(v as any)} className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Provider" id="type-provider" />
                      <Label htmlFor="type-provider">Provider</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Facility" id="type-facility" />
                      <Label htmlFor="type-facility">Facility</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialty / Facility Focus</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger id="specialization">
                      <SelectValue placeholder="Select a specialty or focus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language Spoken</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proximity">Proximity</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="proximity" 
                      min={1} 
                      max={100} 
                      step={1} 
                      value={[proximity]} 
                      onValueChange={(value) => setProximity(value[0])}
                    />
                    <span className="text-sm font-medium w-24 text-right">{proximity} miles</span>
                  </div>
                </div>

                {searchType === 'Provider' && (
                  <div className="space-y-2">
                    <Label>Provider Gender</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="gender-any" />
                        <Label htmlFor="gender-any">Any</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="gender-female" />
                        <Label htmlFor="gender-female">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="gender-male" />
                        <Label htmlFor="gender-male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-binary" id="gender-non-binary" />
                        <Label htmlFor="gender-non-binary">Non-binary</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Column 2: Attributes */}
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Additional Attributes ({totalTagsCount}/{MAX_TOTAL_TAGS})</h3>
                  <div className="space-y-2">
                    {PREDEFINED_TAGS.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={tag.id}
                          onCheckedChange={(checked) => handleTagChange(tag.label, !!checked)}
                          checked={selectedTags.includes(tag.label)}
                          disabled={!selectedTags.includes(tag.label) && !canAddMoreTags}
                        />
                        <Label htmlFor={tag.id} className="font-normal text-sm cursor-pointer">
                          {tag.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                 <div className="space-y-2">
                  <Label htmlFor="custom-tag">Other Attributes</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-tag"
                      placeholder="Add a custom attribute"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      disabled={customTags.length >= MAX_CUSTOM_TAGS || !canAddMoreTags}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddCustomTag}
                      disabled={!customTagInput.trim() || customTags.length >= MAX_CUSTOM_TAGS || !canAddMoreTags}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 min-h-[24px]">
                    {customTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveCustomTag(tag)}
                          className="ml-1.5 rounded-full hover:bg-background/50 p-0.5"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={handleGeneratePrompt} disabled={isPending} size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Prompt
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4 space-y-6">
            <div>
              <Label htmlFor="generated-prompt">AI Generated Prompt</Label>
              <Textarea
                id="generated-prompt"
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                rows={7}
                className="mt-2 glassmorphic border-white/10 bg-white/5 dark:bg-black/20 text-base"
              />
            </div>
            <DialogFooter className="justify-between">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRegenerate} variant="outline" size="lg">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Regenerate
                </Button>
                <Button onClick={handleUsePrompt} size="lg">
                  <Search className="mr-2 h-5 w-5" />
                  Use this Prompt
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
