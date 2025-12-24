import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Termos de Uso</h1>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e usar este aplicativo, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar o aplicativo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              Este aplicativo oferece ferramentas de planejamento alimentar, geração de receitas e acompanhamento nutricional utilizando inteligência artificial. As informações fornecidas são de caráter informativo e educacional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Uso Responsável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você concorda em usar o aplicativo de forma responsável e em conformidade com todas as leis aplicáveis. É proibido:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Usar o serviço para fins ilegais ou não autorizados</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Compartilhar sua conta com terceiros</li>
              <li>Reproduzir ou distribuir conteúdo sem autorização</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Informações Nutricionais</h2>
            <p className="text-muted-foreground leading-relaxed">
              As informações nutricionais, receitas e planos alimentares gerados por inteligência artificial são estimativas e têm caráter meramente informativo. <strong>Não substituem</strong> a orientação de profissionais de saúde qualificados como médicos, nutricionistas ou nutrólogos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O aplicativo é fornecido "como está", sem garantias de qualquer tipo. Não nos responsabilizamos por decisões tomadas com base nas informações fornecidas pelo aplicativo, nem por danos diretos ou indiretos resultantes do uso do serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo do aplicativo, incluindo textos, gráficos, logos, ícones e software, é de nossa propriedade ou licenciado para nós, sendo protegido por leis de propriedade intelectual.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Modificações dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação. O uso continuado do aplicativo após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos de Uso, entre em contato conosco através dos canais disponíveis no aplicativo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
