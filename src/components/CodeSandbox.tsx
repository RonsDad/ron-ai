import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface CodeSandboxProps {
    initialCode?: string;
    language?: 'javascript' | 'python' | 'html' | 'css' | 'typescript';
    onCodeChange?: (code: string) => void;
    onPreview?: (code: string) => void;
}

interface PreviewFrame {
    type: 'web' | 'console' | 'error';
    content: string;
    timestamp: number;
}

export const CodeSandbox: React.FC<CodeSandboxProps> = ({
    initialCode = '',
    language = 'javascript',
    onCodeChange,
    onPreview
}) => {
    const [code, setCode] = useState(initialCode);
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState<PreviewFrame[]>([]);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'console'>('editor');

    useEffect(() => {
        if (onCodeChange) {
            onCodeChange(code);
        }
    }, [code, onCodeChange]);

    const addOutput = (type: PreviewFrame['type'], content: string) => {
        setOutput(prev => [...prev, { type, content, timestamp: Date.now() }]);
    };

    const runCode = async () => {
        if (!code.trim()) return;
        
        setIsRunning(true);
        setOutput([]);
        
        try {
            if (language === 'javascript' || language === 'typescript') {
                // Simple JavaScript execution in iframe
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                
                const iframeWindow = iframe.contentWindow;
                if (iframeWindow) {
                    // Override console methods to capture output
                    const originalLog = iframeWindow.console.log;
                    const originalError = iframeWindow.console.error;
                    
                    iframeWindow.console.log = (...args) => {
                        addOutput('console', args.join(' '));
                        originalLog.apply(iframeWindow.console, args);
                    };
                    
                    iframeWindow.console.error = (...args) => {
                        addOutput('error', args.join(' '));
                        originalError.apply(iframeWindow.console, args);
                    };
                    
                    // Execute the code
                    try {
                        iframeWindow.eval(code);
                        addOutput('console', 'Code executed successfully');
                    } catch (error) {
                        addOutput('error', `Error: ${error}`);
                    }
                }
                
                document.body.removeChild(iframe);
            } else if (language === 'python') {
                // For Python, we'd need a backend service
                addOutput('console', 'Python execution requires backend service');
            } else if (language === 'html') {
                // HTML preview
                addOutput('web', code);
            }
            
            if (onPreview) {
                onPreview(code);
            }
        } catch (error) {
            addOutput('error', `Execution error: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    const clearOutput = () => {
        setOutput([]);
    };

    const getLanguageIcon = () => {
        switch (language) {
            case 'javascript': return '🟨';
            case 'typescript': return '🔷';
            case 'python': return '🐍';
            case 'html': return '🌐';
            case 'css': return '🎨';
            default: return '📄';
        }
    };

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>{getLanguageIcon()}</span>
                    Code Sandbox - {language.toUpperCase()}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="console">Console</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="editor" className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={runCode} disabled={isRunning}>
                                {isRunning ? 'Running...' : 'Run Code'}
                            </Button>
                            <Button variant="outline" onClick={clearOutput}>
                                Clear Output
                            </Button>
                        </div>
                        
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-96 p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Write your ${language} code here...`}
                            style={{
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                borderColor: 'var(--border)'
                            }}
                        />
                    </TabsContent>
                    
                    <TabsContent value="preview" className="space-y-4">
                        <div className="border rounded-lg p-4 min-h-96">
                            {language === 'html' && output.find(o => o.type === 'web') ? (
                                <iframe
                                    srcDoc={output.find(o => o.type === 'web')?.content}
                                    className="w-full h-80 border-0"
                                    title="HTML Preview"
                                />
                            ) : (
                                <div className="text-center text-gray-500 py-20">
                                    <p>Run code to see preview</p>
                                    <p className="text-sm">
                                        {language === 'html' 
                                            ? 'HTML will render here' 
                                            : 'Console output will appear in the Console tab'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="console" className="space-y-4">
                        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm min-h-96 overflow-y-auto">
                            {output.length === 0 ? (
                                <p className="text-gray-500">No output yet. Run some code!</p>
                            ) : (
                                output.map((item, idx) => (
                                    <div key={idx} className={`mb-2 ${
                                        item.type === 'error' ? 'text-red-400' : 
                                        item.type === 'console' ? 'text-green-400' : 
                                        'text-white'
                                    }`}>
                                        <span className="text-gray-500 text-xs">
                                            [{new Date(item.timestamp).toLocaleTimeString()}]
                                        </span>
                                        <span className="ml-2">
                                            {item.type === 'error' ? '❌' : '✅'} {item.content}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default CodeSandbox;