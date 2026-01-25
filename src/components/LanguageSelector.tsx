import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Locale, getCountryFlag, getCountryName } from "@/contexts/I18nContext";

// ═══════════════════════════════════════════════════════════════════════
// IDIOMAS DISPONÍVEIS
// ═══════════════════════════════════════════════════════════════════════

const AVAILABLE_LOCALES: Array<{ locale: Locale; label: string }> = [
  { locale: 'pt-BR', label: 'Português (Brasil)' },
  { locale: 'pt-PT', label: 'Português (Portugal)' },
  { locale: 'en-US', label: 'English (United States)' },
  { locale: 'en-GB', label: 'English (United Kingdom)' },
  { locale: 'es-ES', label: 'Español (España)' },
  { locale: 'es-MX', label: 'Español (México)' },
  { locale: 'es-AR', label: 'Español (Argentina)' },
  { locale: 'es-CL', label: 'Español (Chile)' },
  { locale: 'es-PE', label: 'Español (Perú)' },
  { locale: 'fr-FR', label: 'Français (France)' },
  { locale: 'de-DE', label: 'Deutsch (Deutschland)' },
  { locale: 'it-IT', label: 'Italiano (Italia)' },
];

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════

export function LanguageSelector() {
  const { locale, countryCode, setLocale, t } = useI18n();

  const currentLanguage = AVAILABLE_LOCALES.find(l => l.locale === locale);
  const currentFlag = getCountryFlag(countryCode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentFlag}</span>
          <span className="hidden md:inline">{currentLanguage?.label.split(' ')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel>{t('language.select')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Português */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Português
        </div>
        <DropdownMenuItem
          onClick={() => setLocale('pt-BR')}
          className={locale === 'pt-BR' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇧🇷</span>
          <span>Brasil</span>
          {locale === 'pt-BR' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('pt-PT')}
          className={locale === 'pt-PT' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇵🇹</span>
          <span>Portugal</span>
          {locale === 'pt-PT' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* English */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          English
        </div>
        <DropdownMenuItem
          onClick={() => setLocale('en-US')}
          className={locale === 'en-US' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇺🇸</span>
          <span>United States</span>
          {locale === 'en-US' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('en-GB')}
          className={locale === 'en-GB' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇬🇧</span>
          <span>United Kingdom</span>
          {locale === 'en-GB' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Español */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Español
        </div>
        <DropdownMenuItem
          onClick={() => setLocale('es-ES')}
          className={locale === 'es-ES' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇪🇸</span>
          <span>España</span>
          {locale === 'es-ES' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('es-MX')}
          className={locale === 'es-MX' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇲🇽</span>
          <span>México</span>
          {locale === 'es-MX' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('es-AR')}
          className={locale === 'es-AR' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇦🇷</span>
          <span>Argentina</span>
          {locale === 'es-AR' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('es-CL')}
          className={locale === 'es-CL' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇨🇱</span>
          <span>Chile</span>
          {locale === 'es-CL' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('es-PE')}
          className={locale === 'es-PE' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇵🇪</span>
          <span>Perú</span>
          {locale === 'es-PE' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Autres langues */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Other Languages
        </div>
        <DropdownMenuItem
          onClick={() => setLocale('fr-FR')}
          className={locale === 'fr-FR' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇫🇷</span>
          <span>Français</span>
          {locale === 'fr-FR' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('de-DE')}
          className={locale === 'de-DE' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇩🇪</span>
          <span>Deutsch</span>
          {locale === 'de-DE' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('it-IT')}
          className={locale === 'it-IT' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇮🇹</span>
          <span>Italiano</span>
          {locale === 'it-IT' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
