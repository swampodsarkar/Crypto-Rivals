import { useEffect } from 'react';

export default function PopunderAd() {
  useEffect(() => {
    const scriptId = 'adsterra-popunder-24504e783032455dbf89ee3a97a607ee';
    
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = 'https://pl29033187.profitablecpmratenetwork.com/24/50/4e/24504e783032455dbf89ee3a97a607ee.js';
      document.head.appendChild(script);
    }

    return () => {
      // We don't necessarily want to remove popunder scripts on unmount 
      // as they are meant to trigger on the next click anywhere on the page,
      // but if we want it strictly bound to this screen's lifecycle, we could.
      // For now, leaving it attached is standard for popunders.
    };
  }, []);

  return null; // Popunders don't have a visible UI component
}
