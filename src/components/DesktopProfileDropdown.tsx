import { User as SupabaseUser } from "@supabase/supabase-js";
import { Crown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DesktopProfileDropdownProps {
  user: SupabaseUser | null;
  isSubscribed: boolean;
  subscriptionStatus?: string;
  onOpenProfile: () => void;
  onLogout: () => void;
}

// Generate a consistent color based on the user's name/email
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-primary",
    "bg-emerald-500",
    "bg-violet-500", 
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name or email
const getInitials = (user: SupabaseUser | null): string => {
  if (!user) return "?";
  
  const firstName = user.user_metadata?.first_name;
  const lastName = user.user_metadata?.last_name;
  
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  
  return "?";
};

const getDisplayName = (user: SupabaseUser | null): string => {
  if (!user) return "Usuário";
  
  const firstName = user.user_metadata?.first_name;
  const lastName = user.user_metadata?.last_name;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) {
    return firstName;
  }
  
  return user.email?.split("@")[0] || "Usuário";
};

export function DesktopProfileDropdown({
  user,
  isSubscribed,
  subscriptionStatus,
  onOpenProfile,
  onLogout,
}: DesktopProfileDropdownProps) {
  const initials = getInitials(user);
  const displayName = getDisplayName(user);
  const avatarColor = getAvatarColor(user?.email || "default");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="hidden md:flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Avatar with initials */}
          <div
            className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-medium shadow-sm`}
          >
            {initials}
          </div>
          {/* Chevron indicator */}
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-medium`}
            >
              {initials}
            </div>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground leading-none">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        {/* Subscription status */}
        {isSubscribed && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="badge-pro">
                  <Crown className="w-3 h-3" />
                  PRO
                </span>
                {subscriptionStatus === "trialing" && (
                  <span className="text-xs text-muted-foreground">Trial</span>
                )}
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Menu items */}
        <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
