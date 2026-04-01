import { useEffect } from 'react';

export default function NativeAdBanner() {
  useEffect(() => {
    const scriptId = 'adsterra-native-486b640d3310b56f17ad9a45f196ef75';
    // Only append the script if it doesn't already exist to prevent duplicates
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.dataset.cfasync = 'false';
      script.src = 'https://pl29033190.profitablecpmratenetwork.com/486b640d3310b56f17ad9a45f196ef75/invoke.js';
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-6 overflow-hidden rounded-2xl bg-black/20 border border-white/5 min-h-[100px] items-center">
      <div id="container-486b640d3310b56f17ad9a45f196ef75"></div>
    </div>
  );
}
