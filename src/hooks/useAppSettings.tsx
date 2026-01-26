import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  id: string;
  logo_url: string | null;
  topbar_text: string | null;
  custom_css: string | null;
}

export function applySettings(settings: Partial<AppSettings>) {
  // Apply custom CSS only (colors are now fixed in index.css)
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
          .select('id, logo_url, topbar_text, custom_css')
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

  return { settings, loading };
}
