import React from 'react';
import { Bot, Zap, BrainCircuit, MessageSquare, X } from 'lucide-react';

interface ChatMacroMenuProps {
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

const macroPrompts = [
    { icon: Zap, text: "Find top-rated doctors", prompt: "Find top-rated primary care physicians in my area" },
    { icon: BrainCircuit, text: "Explain my lab results", prompt: "Explain these lab results in simple terms: [paste results]" },
    { icon: MessageSquare, text: "Compare treatment options", prompt: "Compare treatment options for [condition]" },
    { icon: Bot, text: "Generate a question list for my doctor", prompt: "Generate a list of questions to ask my doctor about [topic]" },
];

export const ChatMacroMenu: React.FC<ChatMacroMenuProps> = ({ onSelect, onClose }) => {
  return (
    <div 
      className="absolute bottom-full mb-4 w-full max-w-4xl rounded-2xl shadow-lg p-4 animate-slide-up"
      style={{ 
        background: 'var(--obsidian)',
        border: '1px solid var(--steel)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-snow">Suggested Prompts</h3>
        <button onClick={onClose} className="btn-icon" aria-label="Close suggested prompts">
            <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {macroPrompts.map((item, index) => (
          <button 
            key={index}
            onClick={() => {
                onSelect(item.prompt);
                onClose();
            }}
            className="text-left flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-charcoal"
            style={{
              background: 'var(--charcoal)',
              border: '1px solid var(--steel)',
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--obsidian)'}}
            >
              <item.icon size={20} className="text-white" style={{color: 'var(--flame)'}}/>
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--snow)' }}>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}; 