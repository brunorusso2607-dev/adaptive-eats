import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { NotificationHandler } from "@/components/NotificationHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Activate from "./pages/Activate";
import Onboarding from "./pages/Onboarding";
import TermsOfUse from "./pages/TermsOfUse";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminStats from "./pages/admin/AdminStats";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminPromptSimulator from "./pages/admin/AdminPromptSimulator";
import AdminAIErrorLogs from "./pages/admin/AdminAIErrorLogs";
import AdminAnalysisFeedback from "./pages/admin/AdminAnalysisFeedback";
import AdminPixels from "./pages/admin/AdminPixels";
import AdminAppearance from "./pages/admin/AdminAppearance";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminSystemUsers from "./pages/admin/AdminSystemUsers";
import AdminGemini from "./pages/admin/AdminGemini";
import AdminOnboarding from "./pages/admin/AdminOnboarding";
import AdminMealTimes from "./pages/admin/AdminMealTimes";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags";
import AdminIntoleranceMappings from "./pages/admin/AdminIntoleranceMappings";
import AdminFoodCorrections from "./pages/admin/AdminFoodCorrections";
import AdminIngredientValidations from "./pages/admin/AdminIngredientValidations";
import AdminAIUsage from "./pages/admin/AdminAIUsage";
import AdminBlockedIngredients from "./pages/admin/AdminBlockedIngredients";
import AdminAIMealPlanTest from "./pages/admin/AdminAIMealPlanTest";
import AdminFoods from "./pages/admin/AdminFoods";
import AdminPromptValidation from "./pages/admin/AdminPromptValidation";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminLanguages from "./pages/admin/AdminLanguages";

// QueryClient com configurações globais de timeout e retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Timeout de 30 segundos para queries
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (antigo cacheTime)
      retry: (failureCount, error: any) => {
        // Não retry em erros de autenticação
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Máximo 3 retries para outros erros
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst', // Usa cache primeiro quando offline
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

function AppRoutes() {
  // Load and apply app settings on mount
  useAppSettings();
  
  // Auto-update inteligente - atualiza quando app volta do segundo plano
  useAutoUpdate();
  
  // Monitora sessão de autenticação e redireciona se expirar
  useAuthSession();
  
  // Monitora status de conexão e mostra feedback visual
  useNetworkStatus();
  
  return (
    <>
      {/* Global notification handler - processes markAsRead params on any page */}
      <NotificationHandler />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/landingpage" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ativar" element={<Activate />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/termos-de-uso" element={<TermsOfUse />} />
        <Route path="/politica-privacidade" element={<PrivacyPolicy />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="ai-error-logs" element={<AdminAIErrorLogs />} />
          <Route path="analysis-feedback" element={<AdminAnalysisFeedback />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="prompt-simulator" element={<AdminPromptSimulator />} />
          <Route path="pixels" element={<AdminPixels />} />
          <Route path="appearance" element={<AdminAppearance />} />
          <Route path="webhooks" element={<AdminWebhooks />} />
          <Route path="system-users" element={<AdminSystemUsers />} />
          <Route path="gemini" element={<AdminGemini />} />
          <Route path="onboarding" element={<AdminOnboarding />} />
          <Route path="meal-times" element={<AdminMealTimes />} />
          <Route path="feature-flags" element={<AdminFeatureFlags />} />
          <Route path="intolerance-mappings" element={<AdminIntoleranceMappings />} />
          <Route path="food-corrections" element={<AdminFoodCorrections />} />
          <Route path="ingredient-validations" element={<AdminIngredientValidations />} />
          <Route path="ai-usage" element={<AdminAIUsage />} />
          <Route path="blocked-ingredients" element={<AdminBlockedIngredients />} />
          <Route path="ai-meal-plan-test" element={<AdminAIMealPlanTest />} />
          <Route path="foods" element={<AdminFoods />} />
          <Route path="prompt-validation" element={<AdminPromptValidation />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
          <Route path="languages" element={<AdminLanguages />} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
