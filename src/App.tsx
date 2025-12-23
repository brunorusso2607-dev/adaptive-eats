import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Activate from "./pages/Activate";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminStats from "./pages/admin/AdminStats";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminPromptSimulator from "./pages/admin/AdminPromptSimulator";
import AdminAIErrorLogs from "./pages/admin/AdminAIErrorLogs";
import AdminPixels from "./pages/admin/AdminPixels";
import AdminAppearance from "./pages/admin/AdminAppearance";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminSystemUsers from "./pages/admin/AdminSystemUsers";
import AdminGemini from "./pages/admin/AdminGemini";
import AdminOnboarding from "./pages/admin/AdminOnboarding";
import AdminMealTimes from "./pages/admin/AdminMealTimes";

const queryClient = new QueryClient();

function AppContent() {
  // Load and apply app settings on mount
  useAppSettings();
  
  // Auto-update inteligente - atualiza quando app volta do segundo plano
  useAutoUpdate();
  
  return (
    <BrowserRouter>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/landingpage" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ativar" element={<Activate />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="ai-error-logs" element={<AdminAIErrorLogs />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="prompt-simulator" element={<AdminPromptSimulator />} />
          <Route path="pixels" element={<AdminPixels />} />
          <Route path="appearance" element={<AdminAppearance />} />
          <Route path="webhooks" element={<AdminWebhooks />} />
          <Route path="system-users" element={<AdminSystemUsers />} />
          <Route path="gemini" element={<AdminGemini />} />
          <Route path="onboarding" element={<AdminOnboarding />} />
          <Route path="meal-times" element={<AdminMealTimes />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
