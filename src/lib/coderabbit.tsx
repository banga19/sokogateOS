// Coderabbit widget wrapper (React component)
import React, { useEffect } from 'react';
import { env } from '../env';

if (!env.CODERABBIT_API_KEY) {
  throw new Error('Missing CODERABBIT_API_KEY env var');
}

export const CoderabbitWidget: React.FC = () => {
  useEffect(() => {
    // Insert Coderabbit script tag dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.coderabbit.ai/widget.js';
    script.async = true;
    script.setAttribute('data-api-key', env.CODERABBIT_API_KEY);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null; // Widget injects itself into the DOM
};

// Usage in a React page/component:
// import { CoderabbitWidget } from '../../src/lib/coderabbit';
// <CoderabbitWidget />