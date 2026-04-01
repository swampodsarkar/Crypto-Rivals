import { useEffect, useRef } from 'react';

export default function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the script for atOptions
    const script1 = document.createElement('script');
    script1.innerHTML = `
      atOptions = {
        'key' : 'd41f17d9971219e82e00e969fd568ff9',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;
    
    // Create the script for invoke.js
    const script2 = document.createElement('script');
    script2.src = 'https://www.highperformanceformat.com/d41f17d9971219e82e00e969fd568ff9/invoke.js';
    script2.async = true;

    containerRef.current.appendChild(script1);
    containerRef.current.appendChild(script2);

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} className="flex justify-center bg-bg-dark py-1" />;
}
