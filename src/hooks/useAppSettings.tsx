import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  logo_url: string | null;
  topbar_text: string | null;
  custom_css: string | null;
}

const DEFAULT_SETTINGS: Omit<AppSettings, 'id'> = {
  primary_color: '#22c55e',
  secondary_color: '#16a34a',
  accent_color: '#4ade80',
  background_color: '#ffffff',
  foreground_color: '#0a0a0a',
  logo_url: null,
  topbar_text: null,
  custom_css: null,
};

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applySettings(settings: Partial<AppSettings>) {
  const root = document.documentElement;

  if (settings.primary_color) {
    root.style.setProperty('--primary', hexToHsl(settings.primary_color));
  }
  if (settings.secondary_color) {
    root.style.setProperty('--secondary', hexToHsl(settings.secondary_color));
  }
  if (settings.accent_color) {
    root.style.setProperty('--accent', hexToHsl(settings.accent_color));
  }
  if (settings.background_color) {
    root.style.setProperty('--background', hexToHsl(settings.background_color));
  }
  if (settings.foreground_color) {
    root.style.setProperty('--foreground', hexToHsl(settings.foreground_color));
  }

  // Apply custom CSS
  let customStyleEl = document.getElementById('app-custom-css');
  if (settings.custom_css) {
    if (!customStyleEl) {
      customStyleEl = document.createElement('style');
      customStyleEl.id = 'app-custom-css';
      document.head.appendChild(customStyleEl);
    }
    customStyleEl.textContent = settings.custom_css;
  } else if (customStyleEl) {
    customStyleEl.remove();
  }
}

export function resetSettings() {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--background');
  root.style.removeProperty('--foreground');

  const customStyleEl = document.getElementById('app-custom-css');
  if (customStyleEl) {
    customStyleEl.remove();
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching app settings:', error);
          return;
        }

        if (data) {
          setSettings(data as AppSettings);
          applySettings(data as AppSettings);
        }
      } catch (err) {
        console.error('Error fetching app settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, loading, defaultSettings: DEFAULT_SETTINGS };
}
