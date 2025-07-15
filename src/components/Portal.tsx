import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.top = '0';
    mount.style.left = '0';
    mount.style.width = '0';
    mount.style.height = '0';
    mount.style.pointerEvents = 'none';
    mount.style.zIndex = '9999';
    
    document.body.appendChild(mount);
    mountRef.current = mount;

    return () => {
      if (mountRef.current) {
        document.body.removeChild(mountRef.current);
      }
    };
  }, []);

  return mountRef.current ? createPortal(children, mountRef.current) : null;
}
