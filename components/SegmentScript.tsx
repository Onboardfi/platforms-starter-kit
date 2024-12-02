// components/SegmentScript.tsx
import Script from 'next/script';

export default function SegmentScript() {
  const writeKey = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
  
  if (!writeKey) {
    console.error('Segment write key is not configured');
    return null;
  }

  return (
    <Script
      id="segment-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){if(window.analytics.initialized)return window.analytics[e].apply(window.analytics,arguments);var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var i=0;i<analytics.methods.length;i++){var key=analytics.methods[i];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.16.1";
          analytics.load("${writeKey}");
          analytics.page();
          }}();
        `,
      }}
    />
  );
}