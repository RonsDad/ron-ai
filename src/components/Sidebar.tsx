import { Button } from "./ui/button";
import { 
  Command, 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  HelpCircle, 
  Settings, 
  Palette,
  Plus,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  activeSection?: string;
}

export function Sidebar({ activeSection = "command-center" }: SidebarProps) {
  const primaryNavItems = [
    { id: "command-center", label: "Command Center", icon: Command },
    { id: "tasks", label: "My Tasks", icon: CheckSquare },
    { id: "communication", label: "Communication Hub", icon: MessageSquare },
    { id: "appointments", label: "Appointments", icon: Calendar },
  ];

  const secondaryNavItems = [
    { id: "help", label: "Help", icon: HelpCircle },
    { id: "theme", label: "Toggle Theme", icon: Palette },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 h-full flex flex-col ice-glass-elevated animate-fade-in relative z-10">
      {/* Crystalline light refraction overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `linear-gradient(145deg, 
            transparent 0%, 
            var(--ice-highlight) 25%, 
            transparent 50%, 
            var(--ice-crystalline) 75%, 
            transparent 100%)`
        }}
      />

      {/* Ice crystal pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, var(--ice-frost) 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, var(--ice-crystalline) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, var(--ice-highlight) 0%, transparent 30%)`
        }}
      />

      {/* Logo */}
      <div className="relative p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Ice crystal icon container */}
            <div 
              className="w-8 h-8 rounded-lg ice-glass flex items-center justify-center group"
              style={{
                background: `linear-gradient(135deg, 
                  var(--ice-highlight) 0%, 
                  var(--ice-crystalline) 100%)`
              }}
            >
              <Sparkles 
                size={18} 
                className="animate-pulse transition-transform duration-300 group-hover:scale-110"
                style={{ color: 'var(--accent-blue)' }}
              />
              {/* Inner crystalline glow */}
              <div 
                className="absolute inset-0 rounded-lg blur-md animate-glow-pulse opacity-60"
                style={{ backgroundColor: 'var(--accent-blue)' }}
              />
            </div>
          </div>
          <div>
            <h1 
              className="text-2xl font-medium glow-text-subtle text-gradient tracking-tight" 
            >
              Nira
            </h1>
            <p 
              className="text-xs mt-1 opacity-80 font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              AI Healthcare Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 p-4 space-y-2 relative">
        {primaryNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group interactive-scale relative overflow-hidden animate-slide-up ${
                isActive 
                  ? 'ice-glass glow-text-subtle' 
                  : 'hover:ice-glass'
              }`}
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                animationDelay: `${index * 100}ms`,
                background: isActive 
                  ? `linear-gradient(135deg, 
                      var(--ice-highlight) 0%, 
                      var(--ice-crystalline) 100%)` 
                  : 'transparent'
              }}
            >
              {/* Ice crystal background for active state */}
              {isActive && (
                <>
                  <div 
                    className="absolute inset-0 rounded-xl opacity-30 animate-glow-pulse"
                    style={{ 
                      background: `radial-gradient(ellipse at center, 
                        var(--accent-blue) 0%, 
                        transparent 70%)`
                    }}
                  />
                  {/* Crystalline edge highlight */}
                  <div 
                    className="absolute inset-0 rounded-xl border"
                    style={{ 
                      borderColor: 'var(--ice-border-bright)',
                      background: `linear-gradient(145deg, 
                        var(--ice-highlight) 0%, 
                        transparent 50%)`
                    }}
                  />
                </>
              )}
              
              <Icon 
                size={18} 
                className={`relative z-10 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />
              <span className="relative z-10 font-medium">{item.label}</span>
              
              {/* Ice shimmer effect on hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
            </button>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 space-y-2 border-t border-white/10 relative">
        {/* Crystalline separator */}
        <div 
          className="absolute top-0 left-4 right-4 h-px"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              var(--ice-border-bright) 50%, 
              transparent 100%)`
          }}
        />
        
        {secondaryNavItems.map((item, index) => {
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left hover:ice-glass interactive-scale group animate-slide-up relative overflow-hidden"
              style={{ 
                color: 'var(--text-tertiary)',
                animationDelay: `${(index + 4) * 100}ms`
              }}
            >
              <Icon 
                size={16} 
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-medium group-hover:text-white transition-colors duration-200">
                {item.label}
              </span>
              
              {/* Ice shimmer effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1200 pointer-events-none" />
            </button>
          );
        })}
      </div>

      {/* New Chat Button */}
      <div className="p-4 animate-slide-up" style={{ animationDelay: '700ms' }}>
        <Button 
          className="w-full flex items-center gap-3 py-3 ice-glass-elevated glow-border interactive-lift group relative overflow-hidden border-0"
          style={{ 
            background: `linear-gradient(135deg, 
              var(--accent-blue) 0%, 
              var(--accent-blue-bright) 100%)`,
            color: 'white'
          }}
        >
          {/* Crystalline shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          {/* Ice crystal pattern overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 30% 30%, var(--ice-highlight) 0%, transparent 50%)`
            }}
          />
          
          <Plus size={18} className="relative z-10 transition-transform duration-200 group-hover:rotate-90" />
          <span className="relative z-10 font-medium">New Chat</span>
        </Button>
      </div>

      {/* Bottom ice glow */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-24 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ 
          background: `radial-gradient(ellipse, 
            var(--accent-blue) 0%, 
            var(--ice-crystalline) 50%, 
            transparent 100%)`
        }}
      />
    </div>
  );
}