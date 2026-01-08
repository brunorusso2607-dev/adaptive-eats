import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, Shield, Scan, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanResult {
  ingredient: string;
  status: "safe" | "danger" | "warning";
  reason?: string;
}

const DEMO_SCENARIOS = [
  {
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
    title: "Pizza Margherita",
    userProfile: "Intolerância a Lactose",
    results: [
      { ingredient: "Massa de trigo", status: "safe" as const },
      { ingredient: "Molho de tomate", status: "safe" as const },
      { ingredient: "Queijo mozzarella", status: "danger" as const, reason: "Contém lactose" },
      { ingredient: "Manjericão fresco", status: "safe" as const },
    ],
    verdict: "danger",
    message: "⚠️ ALERTA: Queijo mozzarella contém lactose",
  },
  {
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    title: "Salada Caesar",
    userProfile: "Intolerância a Glúten",
    results: [
      { ingredient: "Alface romana", status: "safe" as const },
      { ingredient: "Frango grelhado", status: "safe" as const },
      { ingredient: "Croutons de pão", status: "danger" as const, reason: "Contém glúten (trigo)" },
      { ingredient: "Parmesão", status: "safe" as const },
      { ingredient: "Molho caesar", status: "warning" as const, reason: "Pode conter glúten oculto" },
    ],
    verdict: "danger",
    message: "⚠️ BLOQUEADO: Croutons contêm trigo",
  },
  {
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    title: "Bowl de Açaí",
    userProfile: "FODMAP",
    results: [
      { ingredient: "Açaí", status: "safe" as const },
      { ingredient: "Banana", status: "warning" as const, reason: "FODMAP moderado" },
      { ingredient: "Granola", status: "safe" as const },
      { ingredient: "Mel", status: "danger" as const, reason: "Alto FODMAP (frutose)" },
    ],
    verdict: "danger",
    message: "⚠️ ALERTA: Mel é alto em FODMAP",
  },
];

export function ScannerDemo() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const scenario = DEMO_SCENARIOS[currentScenario];

  // Only run animation when visible in viewport
  useEffect(() => {
    if (!isVisible) return;
    
    let isMounted = true;
    
    const runDemo = async () => {
      if (!isMounted) return;
      setIsScanning(true);
      setShowResults(false);
      setScanProgress(0);

      // Simulate scanning progress with fewer updates
      for (let i = 0; i <= 100; i += 10) {
        if (!isMounted) return;
        await new Promise((r) => setTimeout(r, 80));
        setScanProgress(i);
      }

      if (!isMounted) return;
      await new Promise((r) => setTimeout(r, 300));
      setIsScanning(false);
      setShowResults(true);

      // Wait and move to next scenario
      await new Promise((r) => setTimeout(r, 6000));
      if (isMounted) {
        setCurrentScenario((prev) => (prev + 1) % DEMO_SCENARIOS.length);
      }
    };

    runDemo();
    
    return () => { isMounted = false; };
  }, [currentScenario, isVisible]);

  return (
    <motion.div 
      className="relative max-w-md mx-auto"
      onViewportEnter={() => setIsVisible(true)}
      onViewportLeave={() => setIsVisible(false)}
      viewport={{ margin: "-100px" }}
    >
      {/* Phone Frame */}
      <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full z-10" />
        
        <div className="relative bg-background rounded-[2.5rem] overflow-hidden aspect-[9/16]">
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">ReceitAI Scanner</span>
          </div>

          {/* Food Image */}
          <div className="relative h-1/2 overflow-hidden">
            <img
              src={scenario.image}
              alt={scenario.title}
              className="w-full h-full object-cover"
            />
            
            {/* Scanning Overlay */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Scan className="w-16 h-16 text-primary" />
                  </motion.div>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    Analisando ingredientes...
                  </p>
                  <div className="w-48 h-2 bg-muted rounded-full mt-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scan Line Animation */}
            {isScanning && (
              <motion.div
                className="absolute left-0 right-0 h-1 bg-primary/60 shadow-glow"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            )}
          </div>

          {/* Results Panel */}
          <div className="h-1/2 p-4 overflow-y-auto">
            <AnimatePresence mode="wait">
              {showResults ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {scenario.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Perfil: {scenario.userProfile}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                        scenario.verdict === "safe"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {scenario.verdict === "safe" ? (
                        <>
                          <Shield className="w-3 h-3" /> Seguro
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Risco
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ingredients List */}
                  <div className="space-y-2">
                    {scenario.results.map((result, index) => (
                      <motion.div
                        key={result.ingredient}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg text-xs",
                          result.status === "safe" && "bg-primary/5",
                          result.status === "danger" && "bg-destructive/10",
                          result.status === "warning" && "bg-warning/10"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                            result.status === "safe" && "bg-primary text-primary-foreground",
                            result.status === "danger" && "bg-destructive text-destructive-foreground",
                            result.status === "warning" && "bg-warning text-warning-foreground"
                          )}
                        >
                          {result.status === "safe" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {result.ingredient}
                          </p>
                          {result.reason && (
                            <p className="text-muted-foreground text-[10px]">
                              {result.reason}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Alert Message */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={cn(
                      "p-3 rounded-xl text-xs font-medium text-center",
                      scenario.verdict === "safe"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {scenario.message}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  <Sparkles className="w-8 h-8 text-primary mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Veto Layer Ativo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Validando 50.000+ ingredientes
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Stats - Static, no infinite animations */}
      <div className="absolute -right-4 top-1/4 bg-card shadow-lg rounded-xl p-3 border border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">95%</p>
          <p className="text-[10px] text-muted-foreground">Precisão</p>
        </div>
      </div>

      <div className="absolute -left-4 top-1/2 bg-card shadow-lg rounded-xl p-3 border border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">18</p>
          <p className="text-[10px] text-muted-foreground">Intolerâncias</p>
        </div>
      </div>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-card shadow-lg rounded-xl px-4 py-2 border border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-xs font-medium text-foreground">Veto Layer Determinístico</p>
        </div>
      </div>
    </motion.div>
  );
}
