import { Bell, BellOff, Clock, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';

const timeOptions = [
  { value: '07:00:00', label: '07:00' },
  { value: '08:00:00', label: '08:00' },
  { value: '09:00:00', label: '09:00' },
  { value: '10:00:00', label: '10:00' },
  { value: '11:00:00', label: '11:00' },
  { value: '12:00:00', label: '12:00' },
  { value: '13:00:00', label: '13:00' },
  { value: '14:00:00', label: '14:00' },
  { value: '15:00:00', label: '15:00' },
  { value: '16:00:00', label: '16:00' },
  { value: '17:00:00', label: '17:00' },
  { value: '18:00:00', label: '18:00' },
  { value: '19:00:00', label: '19:00' },
  { value: '20:00:00', label: '20:00' },
  { value: '21:00:00', label: '21:00' },
  { value: '22:00:00', label: '22:00' },
];

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification
  } = usePushNotifications();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. 
            Tente usar o Chrome, Firefox ou Edge em um dispositivo compatível.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba lembretes para registrar suas refeições, como no Duolingo!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main subscription toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Ativar Notificações</Label>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? "Você receberá lembretes automáticos"
                : "Ative para receber lembretes diários"
              }
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={(checked) => checked ? subscribe() : unsubscribe()}
            disabled={isLoading}
          />
        </div>

        {permission === 'denied' && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Notificações bloqueadas. Você precisa permitir notificações nas configurações do navegador.
          </div>
        )}

        {isSubscribed && (
          <>
            {/* Meal reminders toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lembretes de Refeições</Label>
                <p className="text-sm text-muted-foreground">
                  Lembrar de registrar refeições
                </p>
              </div>
              <Switch
                checked={preferences.meal_reminders}
                onCheckedChange={(checked) => updatePreferences({ meal_reminders: checked })}
              />
            </div>

            {/* Streak alerts toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de Sequência</Label>
                <p className="text-sm text-muted-foreground">
                  Avisar quando sua sequência está em risco
                </p>
              </div>
              <Switch
                checked={preferences.streak_alerts}
                onCheckedChange={(checked) => updatePreferences({ streak_alerts: checked })}
              />
            </div>

            {/* Reminder time selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário do Lembrete
              </Label>
              <Select
                value={preferences.reminder_time}
                onValueChange={(value) => updatePreferences({ reminder_time: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Você receberá um lembrete neste horário se não tiver registrado refeições no dia.
              </p>
            </div>

            {/* Test notification button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={sendTestNotification}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Enviar Notificação de Teste
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
