import React from 'react';
import { X, Plus, Globe } from 'lucide-react';

interface TabInfo {
  page_id: number;
  url: string;
  title: string;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId?: number;
  onTabClick?: (tabId: number) => void;
  onTabClose?: (tabId: number) => void;
  onNewTab?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab
}) => {
  // Helper to get favicon URL
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  };

  // Helper to truncate title
  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--ice-glass)',
      borderBottom: '1px solid var(--ice-border)',
      padding: '4px 8px',
      gap: '4px',
      overflowX: 'auto',
      minHeight: '36px'
    }}>
      {tabs.map((tab) => {
        const isActive = tab.page_id === activeTabId;
        const faviconUrl = getFaviconUrl(tab.url);
        
        return (
          <div
            key={tab.page_id}
            className={isActive ? 'ice-glass-elevated' : 'glass-accent'}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: '120px',
              maxWidth: '200px',
              gap: '6px',
              border: isActive ? '1px solid var(--accent-blue)' : '1px solid transparent',
              background: isActive ? 'var(--ice-highlight)' : 'transparent',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onClick={() => onTabClick?.(tab.page_id)}
            title={`${tab.title}\n${tab.url}`}
          >
            {/* Favicon or globe icon */}
            {faviconUrl ? (
              <img 
                src={faviconUrl} 
                alt="" 
                style={{ width: '16px', height: '16px', flexShrink: 0 }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                  const nextEl = img.nextElementSibling as HTMLElement;
                  if (nextEl) nextEl.style.display = 'block';
                }}
              />
            ) : null}
            <Globe 
              size={14} 
              style={{ 
                flexShrink: 0, 
                color: 'var(--text-secondary)',
                display: faviconUrl ? 'none' : 'block'
              }} 
            />
            
            {/* Tab title */}
            <span style={{
              fontSize: '12px',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}>
              {truncateTitle(tab.title || tab.url || 'New Tab')}
            </span>
            
            {/* Close button */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose?.(tab.page_id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }}
                className="tab-close-button"
                aria-label={`Close tab ${tab.title}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--ice-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      
      {/* New tab button */}
      {onNewTab && (
        <button
          onClick={onNewTab}
          className="ice-glass interactive-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid var(--ice-border)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
          title="Open new tab"
        >
          <Plus size={14} />
        </button>
      )}
      
      <style jsx>{`
        .tab-close-button {
          opacity: 0;
        }
        
        div:hover .tab-close-button {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default TabBar; 