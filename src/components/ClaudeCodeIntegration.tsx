import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CodeSandbox } from './CodeSandbox';

interface ClaudeCodeIntegrationProps {
    message?: string;
    onCodeGenerated?: (code: string, language: string) => void;
    onRequestProcessed?: (result: any) => void;
}

interface GeneratedCode {
    code: string;
    language: string;
    description: string;
    filename?: string;
    timestamp: number;
}

export const ClaudeCodeIntegration: React.FC<ClaudeCodeIntegrationProps> = ({
    message,
    onCodeGenerated,
    onRequestProcessed
}) => {
    const [generatedCode, setGeneratedCode] = useState<GeneratedCode[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedCodeIndex, setSelectedCodeIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'sandbox'>('overview');

    // Detect if a message contains code generation request
    const detectCodeRequest = (text: string): boolean => {
        const codeKeywords = [
            'create', 'generate', 'write', 'build', 'implement', 'code',
            'function', 'class', 'component', 'script', 'program',
            'application', 'tool', 'utility', 'example', 'demo'
        ];
        
        const languageKeywords = [
            'javascript', 'python', 'typescript', 'html', 'css', 'react',
            'vue', 'angular', 'node', 'express', 'fastapi', 'flask'
        ];
        
        const lowerText = text.toLowerCase();
        return codeKeywords.some(keyword => lowerText.includes(keyword)) &&
               (languageKeywords.some(keyword => lowerText.includes(keyword)) || 
                lowerText.includes('code'));
    };

    // Extract code from Claude response
    const extractCodeFromResponse = (response: string): GeneratedCode[] => {
        const codeBlocks: GeneratedCode[] = [];
        
        // Match code blocks with language specifiers
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const language = match[1] || 'text';
            const code = match[2].trim();
            
            if (code) {
                codeBlocks.push({
                    code,
                    language,
                    description: `Generated ${language} code`,
                    timestamp: Date.now()
                });
            }
        }
        
        return codeBlocks;
    };

    // Process message for code generation
    useEffect(() => {
        if (message && detectCodeRequest(message)) {
            setIsGenerating(true);
            
            // Simulate code generation (in real implementation, this would call Claude API)
            setTimeout(() => {
                const extractedCode = extractCodeFromResponse(message);
                
                if (extractedCode.length === 0) {
                    // Generate a simple example if no code blocks found
                    const simpleExample: GeneratedCode = {
                        code: `// Example code generated from: "${message}"\nconsole.log("Hello from Claude Code!");`,
                        language: 'javascript',
                        description: 'Simple JavaScript example',
                        timestamp: Date.now()
                    };
                    setGeneratedCode([simpleExample]);
                } else {
                    setGeneratedCode(extractedCode);
                }
                
                setIsGenerating(false);
                setActiveTab('code');
                
                if (onCodeGenerated && extractedCode.length > 0) {
                    onCodeGenerated(extractedCode[0].code, extractedCode[0].language);
                }
            }, 1000);
        }
    }, [message, onCodeGenerated]);

    const handleCodeRun = (code: string) => {
        if (onRequestProcessed) {
            onRequestProcessed({
                type: 'code_execution',
                code,
                language: generatedCode[selectedCodeIndex]?.language || 'javascript',
                timestamp: Date.now()
            });
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        // You might want to show a toast notification here
    };

    const downloadCode = (code: string, filename: string) => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (generatedCode.length === 0 && !isGenerating) {
        return (
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span>⚡</span>
                        Claude Code Integration
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">
                            Ask Claude to generate code, and it will appear here with a live sandbox!
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Try: "Create a React component" or "Write a Python function"
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>⚡</span>
                    Claude Code Integration
                    {isGenerating && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Generating...
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="code">Code</TabsTrigger>
                        <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4">
                            <h3 className="text-lg font-semibold">Generated Code Files</h3>
                            {generatedCode.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                     onClick={() => setSelectedCodeIndex(idx)}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">{item.description}</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {item.language} • {new Date(item.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(item.code);
                                                    }}>
                                                Copy
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        downloadCode(item.code, `code-${idx}.${item.language}`);
                                                    }}>
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="code" className="space-y-4">
                        {generatedCode.length > 0 && (
                            <div className="space-y-4">
                                {generatedCode.length > 1 && (
                                    <div className="flex gap-2">
                                        {generatedCode.map((_, idx) => (
                                            <Button
                                                key={idx}
                                                variant={selectedCodeIndex === idx ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedCodeIndex(idx)}
                                            >
                                                File {idx + 1}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-medium">
                                            {generatedCode[selectedCodeIndex]?.description}
                                        </h4>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" 
                                                    onClick={() => copyToClipboard(generatedCode[selectedCodeIndex]?.code || '')}>
                                                Copy Code
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                    onClick={() => setActiveTab('sandbox')}>
                                                Run in Sandbox
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                        <code className="text-sm font-mono">
                                            {generatedCode[selectedCodeIndex]?.code}
                                        </code>
                                    </pre>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="sandbox" className="space-y-4">
                        {generatedCode.length > 0 && (
                            <CodeSandbox
                                initialCode={generatedCode[selectedCodeIndex]?.code || ''}
                                language={generatedCode[selectedCodeIndex]?.language as any || 'javascript'}
                                onPreview={handleCodeRun}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default ClaudeCodeIntegration;