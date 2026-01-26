import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Save, Loader2, Image as ImageIcon, Info } from 'lucide-react';
import { applySettings, AppSettings } from '@/hooks/useAppSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminAppearance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    logo_url: '',
    topbar_text: '',
    custom_css: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('id, logo_url, topbar_text, custom_css')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setFormData({
          logo_url: data.logo_url || '',
          topbar_text: data.topbar_text || '',
          custom_css: data.custom_css || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
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
          logo_url: formData.logo_url || null,
          topbar_text: formData.topbar_text || null,
          custom_css: formData.custom_css || null,
        })
        .eq('id', settingsId);

      if (error) throw error;

      applySettings(formData as unknown as AppSettings);
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Aparência</h1>
          <p className="text-sm text-muted-foreground">Configure logo e textos do app</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Info about fixed colors */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          As cores do app são fixas e otimizadas para uma experiência premium e consistente.
          Aqui você pode personalizar apenas logo, textos e CSS customizado.
        </AlertDescription>
      </Alert>

      {/* Logo Card */}
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
                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
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

      {/* Topbar Text Card */}
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

      {/* Custom CSS Card */}
      <Card>
        <CardHeader>
          <CardTitle>CSS Personalizado</CardTitle>
          <CardDescription>Adicione estilos CSS customizados (avançado)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.custom_css}
            onChange={(e) => setFormData(prev => ({ ...prev, custom_css: e.target.value }))}
            placeholder={`/* Exemplo de CSS customizado */\n.my-custom-class {\n  color: #333;\n}`}
            className="font-mono text-sm min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use com cuidado. CSS inválido pode quebrar o layout do app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
