import '../src/styles/globals.css';
import { Inter } from 'next/font/google';
import type { AppProps } from 'next/app';
import React from 'react';

// Monkey-patch to suppress hydration warnings on interactive elements
const originalCreateElement = React.createElement;
(React as any).createElement = function(type: any, props: any, ...children: any[]) {
  if ((type === 'input' || type === 'button') && props) {
    // ensure hydration warning is suppressed
    props = { ...props, suppressHydrationWarning: true };
  }
  return originalCreateElement(type, props, ...children);
};

const inter = Inter({ subsets: ['latin'] });

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
