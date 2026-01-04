import { useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TrackingPixel {
  id: string;
  platform: string;
  pixel_id: string;
  api_token: string | null;
  is_active: boolean;
}

// Extend window for tracking pixels
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track: (...args: unknown[]) => void;
      page: () => void;
      load: (id: string) => void;
    };
    pintrk?: (...args: unknown[]) => void;
    snaptr?: (...args: unknown[]) => void;
    twq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type TrackingEvent = 
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "Purchase"
  | "CompleteRegistration"
  | "Lead"
  | "AddToCart";

interface EventData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  [key: string]: unknown;
}

export function useTrackingPixels() {
  const pixelsLoadedRef = useRef(false);

  const { data: pixels } = useQuery({
    queryKey: ["active-tracking-pixels"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("tracking_pixels") as any)
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      return data as TrackingPixel[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load pixel scripts
  useEffect(() => {
    if (!pixels || pixels.length === 0 || pixelsLoadedRef.current) return;

    pixels.forEach((pixel) => {
      loadPixelScript(pixel);
    });

    pixelsLoadedRef.current = true;
  }, [pixels]);

  const loadPixelScript = (pixel: TrackingPixel) => {
    switch (pixel.platform) {
      case "facebook":
        loadFacebookPixel(pixel.pixel_id);
        break;
      case "google":
        loadGoogleTag(pixel.pixel_id);
        break;
      case "tiktok":
        loadTikTokPixel(pixel.pixel_id);
        break;
      case "pinterest":
        loadPinterestTag(pixel.pixel_id);
        break;
      case "snapchat":
        loadSnapchatPixel(pixel.pixel_id);
        break;
      case "twitter":
        loadTwitterPixel(pixel.pixel_id);
        break;
    }
  };

  const trackEvent = useCallback((event: TrackingEvent, data?: EventData) => {
    if (!pixels || pixels.length === 0) return;

    pixels.forEach((pixel) => {
      try {
        switch (pixel.platform) {
          case "facebook":
            trackFacebookEvent(event, data);
            break;
          case "google":
            trackGoogleEvent(event, data);
            break;
          case "tiktok":
            trackTikTokEvent(event, data);
            break;
          case "pinterest":
            trackPinterestEvent(event, data);
            break;
          case "snapchat":
            trackSnapchatEvent(event, data);
            break;
          case "twitter":
            trackTwitterEvent(event, data);
            break;
        }
      } catch (error) {
        console.error(`Error tracking ${event} on ${pixel.platform}:`, error);
      }
    });
  }, [pixels]);

  return { trackEvent, pixels };
}

// ========== Facebook Pixel ==========
function loadFacebookPixel(pixelId: string) {
  if (window.fbq) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

function trackFacebookEvent(event: TrackingEvent, data?: EventData) {
  if (!window.fbq) return;
  window.fbq("track", event, data);
}

// ========== Google Ads ==========
function loadGoogleTag(conversionId: string) {
  if (window.gtag) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", conversionId);
}

function trackGoogleEvent(event: TrackingEvent, data?: EventData) {
  if (!window.gtag) return;

  const eventMapping: Record<TrackingEvent, string> = {
    PageView: "page_view",
    ViewContent: "view_item",
    InitiateCheckout: "begin_checkout",
    Purchase: "purchase",
    CompleteRegistration: "sign_up",
    Lead: "generate_lead",
    AddToCart: "add_to_cart",
  };

  window.gtag("event", eventMapping[event] || event, data);
}

// ========== TikTok Pixel ==========
function loadTikTokPixel(pixelId: string) {
  if (window.ttq) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
}

function trackTikTokEvent(event: TrackingEvent, data?: EventData) {
  if (!window.ttq) return;

  const eventMapping: Record<TrackingEvent, string> = {
    PageView: "ViewContent",
    ViewContent: "ViewContent",
    InitiateCheckout: "InitiateCheckout",
    Purchase: "CompletePayment",
    CompleteRegistration: "CompleteRegistration",
    Lead: "SubmitForm",
    AddToCart: "AddToCart",
  };

  window.ttq.track(eventMapping[event] || event, data);
}

// ========== Pinterest Tag ==========
function loadPinterestTag(tagId: string) {
  if (window.pintrk) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function(e){if(!window.pintrk){window.pintrk = function () {
    window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
    n=window.pintrk;n.queue=[],n.version="3.0";var
    t=document.createElement("script");t.async=!0,t.src=e;var
    r=document.getElementsByTagName("script")[0];
    r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
    pintrk('load', '${tagId}');
    pintrk('page');
  `;
  document.head.appendChild(script);
}

function trackPinterestEvent(event: TrackingEvent, data?: EventData) {
  if (!window.pintrk) return;

  const eventMapping: Record<TrackingEvent, string> = {
    PageView: "pagevisit",
    ViewContent: "viewcategory",
    InitiateCheckout: "checkout",
    Purchase: "checkout",
    CompleteRegistration: "signup",
    Lead: "lead",
    AddToCart: "addtocart",
  };

  window.pintrk("track", eventMapping[event] || event, data);
}

// ========== Snapchat Pixel ==========
function loadSnapchatPixel(pixelId: string) {
  if (window.snaptr) return;

  const script = document.createElement("script");
  script.innerHTML = `
    (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
    {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
    a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
    r.src=n;var u=t.getElementsByTagName(s)[0];
    u.parentNode.insertBefore(r,u);})(window,document,
    'https://sc-static.net/scevent.min.js');
    snaptr('init', '${pixelId}', {});
    snaptr('track', 'PAGE_VIEW');
  `;
  document.head.appendChild(script);
}

function trackSnapchatEvent(event: TrackingEvent, data?: EventData) {
  if (!window.snaptr) return;

  const eventMapping: Record<TrackingEvent, string> = {
    PageView: "PAGE_VIEW",
    ViewContent: "VIEW_CONTENT",
    InitiateCheckout: "START_CHECKOUT",
    Purchase: "PURCHASE",
    CompleteRegistration: "SIGN_UP",
    Lead: "SIGN_UP",
    AddToCart: "ADD_TO_CART",
  };

  window.snaptr("track", eventMapping[event] || event, data);
}

// ========== Twitter Pixel ==========
function loadTwitterPixel(pixelId: string) {
  if (window.twq) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
    },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
    a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
    twq('config','${pixelId}');
  `;
  document.head.appendChild(script);
}

function trackTwitterEvent(event: TrackingEvent, data?: EventData) {
  if (!window.twq) return;

  const eventMapping: Record<TrackingEvent, string> = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    InitiateCheckout: "InitiatedCheckout",
    Purchase: "Purchase",
    CompleteRegistration: "CompleteRegistration",
    Lead: "Lead",
    AddToCart: "AddToCart",
  };

  window.twq("event", eventMapping[event] || event, data);
}
