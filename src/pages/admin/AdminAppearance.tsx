import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Upload, RotateCcw, Save, Eye, Loader2, Image as ImageIcon } from 'lucide-react';
import { applySettings, resetSettings, AppSettings } from '@/hooks/useAppSettings';

const PRESET_THEMES = [
  {
    name: 'Verde (Padrão)',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#4ade80',
    background: '#ffffff',
    foreground: '#0a0a0a',
  },
  {
    name: 'Azul Profissional',
    primary: '#3b82f6',
    secondary: '#2563eb',
    accent: '#60a5fa',
    background: '#ffffff',
    foreground: '#1e293b',
  },
  {
    name: 'Roxo Moderno',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
    background: '#faf5ff',
    foreground: '#1e1b4b',
  },
  {
    name: 'Laranja Energia',
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c',
    background: '#fffbeb',
    foreground: '#431407',
  },
];

export default function AdminAppearance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    primary_color: '#22c55e',
    secondary_color: '#16a34a',
    accent_color: '#4ade80',
    background_color: '#ffffff',
    foreground_color: '#0a0a0a',
    logo_url: '',
    topbar_text: '',
    custom_css: '',
  });

  const [originalData, setOriginalData] = useState(formData);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        const settings = {
          primary_color: data.primary_color || '#22c55e',
          secondary_color: data.secondary_color || '#16a34a',
          accent_color: data.accent_color || '#4ade80',
          background_color: data.background_color || '#ffffff',
          foreground_color: data.foreground_color || '#0a0a0a',
          logo_url: data.logo_url || '',
          topbar_text: data.topbar_text || '',
          custom_css: data.custom_css || '',
        };
        setFormData(settings);
        setOriginalData(settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  function handlePreview() {
    applySettings({
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      accent_color: formData.accent_color,
      background_color: formData.background_color,
      foreground_color: formData.foreground_color,
      custom_css: formData.custom_css,
    } as AppSettings);
    toast.success('Preview aplicado! Salve para manter as alterações.');
  }

  function handleResetPreview() {
    setFormData(originalData);
    applySettings(originalData as unknown as AppSettings);
    toast.info('Preview resetado para última versão salva');
  }

  function handleApplyTheme(theme: typeof PRESET_THEMES[0]) {
    const newData = {
      ...formData,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      accent_color: theme.accent,
      background_color: theme.background,
      foreground_color: theme.foreground,
    };
    setFormData(newData);
    applySettings(newData as unknown as AppSettings);
    toast.success(`Tema "${theme.name}" aplicado! Salve para manter.`);
  }

  function handleResetToDefault() {
    const defaultTheme = PRESET_THEMES[0];
    const newData = {
      ...formData,
      primary_color: defaultTheme.primary,
      secondary_color: defaultTheme.secondary,
      accent_color: defaultTheme.accent,
      background_color: defaultTheme.background,
      foreground_color: defaultTheme.foreground,
    };
    setFormData(newData);
    applySettings(newData as unknown as AppSettings);
    toast.info('Cores resetadas para o padrão');
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!settingsId) {
      toast.error('Configurações não encontradas');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          background_color: formData.background_color,
          foreground_color: formData.foreground_color,
          logo_url: formData.logo_url || null,
          topbar_text: formData.topbar_text || null,
          custom_css: formData.custom_css || null,
        })
        .eq('id', settingsId);

      if (error) throw error;

      setOriginalData(formData);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Aparência</h1>
          <p className="text-sm text-muted-foreground">Personalize as cores e visual do app</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleResetPreview} className="flex-1 sm:flex-none">
            <RotateCcw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Resetar</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePreview} className="flex-1 sm:flex-none">
            <Eye className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none">
            {saving ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <Save className="h-4 w-4 sm:mr-2" />}
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="colors" className="text-xs sm:text-sm">Cores</TabsTrigger>
          <TabsTrigger value="brand" className="text-xs sm:text-sm">Marca</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs sm:text-sm">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          {/* Preset Themes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Temas Prontos
              </CardTitle>
              <CardDescription>Escolha um tema pré-definido para começar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => handleApplyTheme(theme)}
                    className="p-2 sm:p-3 rounded-lg border-2 border-border hover:border-primary transition-colors text-left"
                  >
                    <div className="flex gap-1 mb-1 sm:mb-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" style={{ backgroundColor: theme.secondary }} />
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" style={{ backgroundColor: theme.accent }} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium line-clamp-1">{theme.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Cores Personalizadas</CardTitle>
              <CardDescription>Ajuste cada cor individualmente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#22c55e"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="#16a34a"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                      placeholder="#4ade80"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.foreground_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, foreground_color: e.target.value }))}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.foreground_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, foreground_color: e.target.value }))}
                      placeholder="#0a0a0a"
                    />
                  </div>
                </div>
              </div>

              <Button variant="outline" onClick={handleResetToDefault} className="mt-4">
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar para Padrão
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo
              </CardTitle>
              <CardDescription>Faça upload do logo do seu app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <div className="relative">
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="w-24 h-24 object-contain rounded-lg border bg-muted"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Enviando...' : 'Enviar Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG ou SVG. Máximo 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Texto da Topbar</CardTitle>
              <CardDescription>Texto exibido no topo do app (opcional)</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.topbar_text}
                onChange={(e) => setFormData(prev => ({ ...prev, topbar_text: e.target.value }))}
                placeholder="Ex: 🎉 Promoção especial! Use o cupom RECEITA10"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSS Personalizado</CardTitle>
              <CardDescription>
                Adicione estilos CSS customizados (use com cuidado)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.custom_css}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_css: e.target.value }))}
                placeholder={`.my-class {\n  color: red;\n}`}
                className="font-mono min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ CSS inválido pode quebrar o layout do app.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
