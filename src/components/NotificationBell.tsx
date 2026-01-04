import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Settings, Droplets, UtensilsCrossed, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationBellProps {
  onOpenSettings?: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "reminder":
      return <Droplets className="w-4 h-4 text-blue-500" />;
    case "meal":
      return <UtensilsCrossed className="w-4 h-4 text-primary" />;
    case "success":
      return <Check className="w-4 h-4 text-green-500" />;
    default:
      return <Info className="w-4 h-4 text-muted-foreground" />;
  }
};

export function NotificationBell({ onOpenSettings }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  // Mark all as read and clear app badge when popover opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      console.log("[NotificationBell] Popover opened, marking all as read and clearing badge");
      markAllAsRead();
    }
  }, [open, unreadCount, markAllAsRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-background border border-border shadow-lg z-50"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Marcar lidas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={clearAll}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onOpenSettings}
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markAsRead(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        "p-3 hover:bg-accent/50 transition-colors cursor-pointer group",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={onMarkRead}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm line-clamp-1",
                !notification.is_read ? "font-medium" : "text-muted-foreground"
              )}
            >
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
        )}
      </div>
    </div>
  );
}
