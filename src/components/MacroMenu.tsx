
import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Search, 
  MapPin,
  Bot,
  ChevronRight,
  ArrowLeft
} from "lucide-react";

interface MacroItem {
  id: string;
  label: string;
  description: string;
  category: string;
  template: string;
}

const macroData: MacroItem[] = [
  {
    id: "medication-savings",
    label: "Medication Savings",
    description: "Find cost-saving opportunities for medications.",
    category: "Financial",
    template: "Find savings for [medication name]"
  },
  {
    id: "book-appointment",
    label: "Book Appointment",
    description: "Schedule medical appointments.",
    category: "Scheduling",
    template: "Book an appointment with a [specialty] doctor"
  },
  {
    id: "insurance-coverage",
    label: "Check Insurance Coverage",
    description: "Verify coverage for treatments.",
    category: "Insurance",
    template: "Check my insurance coverage for [treatment]"
  },
  {
    id: "find-provider",
    label: "Find Specialists",
    description: "Search for healthcare providers.",
    category: "Providers",
    template: "Find a [specialty] specialist near me"
  },
  {
    id: "urgent-care",
    label: "Urgent Care Locator",
    description: "Find nearby urgent care services.",
    category: "Emergency",
    template: "Find urgent care near me"
  },
  {
    id: "medical-records",
    label: "Access Medical Records",
    description: "Navigate patient portals.",
    category: "Records",
    template: "Help me access my medical records from [provider]"
  }
];

const categoryIcons: { [key: string]: React.ReactNode } = {
  "Financial": <DollarSign size={16} />,
  "Scheduling": <Calendar size={16} />,
  "Insurance": <FileText size={16} />,
  "Providers": <Search size={16} />,
  "Emergency": <MapPin size={16} />,
  "Records": <FileText size={16} />
};

interface MacroMenuProps {
  isVisible: boolean;
  onSelect: (prompt: string) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}

export function MacroMenu({ isVisible, onSelect, onClose, triggerRef }: MacroMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.top - 10, left: rect.left });
    }
  }, [isVisible, triggerRef]);

  if (!isVisible) return null;

  const handleSelect = (template: string) => {
    onSelect(template);
    onClose();
  };

  const categories = Array.from(new Set(macroData.map(item => item.category)));
  const filteredItems = selectedCategory 
    ? macroData.filter(item => item.category === selectedCategory)
    : [];

  return (
    <div 
      className="fixed z-50 w-[350px] bg-card border border-border rounded-xl shadow-lg animate-slide-up"
      style={{ top: `${position.top}px`, left: `${position.left}px`, transform: 'translateY(-100%)' }}
    >
      <div className="p-2">
        {selectedCategory ? (
          <div>
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground w-full text-left">
              <ArrowLeft size={16} />
              Back to categories
            </button>
            <div className="border-t border-border my-1"></div>
            {filteredItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => handleSelect(item.template)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          categories.map((category) => (
            <button 
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-primary">{categoryIcons[category]}</div>
                <span className="font-medium text-foreground">{category}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}