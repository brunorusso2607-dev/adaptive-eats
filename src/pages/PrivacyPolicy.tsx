import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coletamos as seguintes informações para fornecer nossos serviços:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail e senha</li>
              <li><strong>Dados de perfil:</strong> idade, sexo, peso, altura e objetivos de saúde</li>
              <li><strong>Preferências alimentares:</strong> restrições, alergias e intolerâncias</li>
              <li><strong>Dados de uso:</strong> refeições geradas, planos alimentares e histórico de consumo</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos seus dados para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Personalizar refeições e planos alimentares</li>
              <li>Calcular necessidades nutricionais</li>
              <li>Acompanhar seu progresso e metas</li>
              <li>Melhorar nossos serviços e algoritmos</li>
              <li>Enviar comunicações relevantes sobre o serviço</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Proteção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Seus dados são armazenados em servidores seguros com criptografia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Não vendemos</strong> suas informações pessoais. Podemos compartilhar dados apenas:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Com prestadores de serviços essenciais (hospedagem, processamento)</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger direitos, propriedade ou segurança</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimento a qualquer momento</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Cookies e Tecnologias</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, lembrar preferências e analisar o uso do aplicativo. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. Após a exclusão da conta, seus dados serão removidos em até 30 dias, exceto quando houver obrigação legal de retenção.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas através do aplicativo ou por e-mail. Recomendamos revisar esta página regularmente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco através dos canais disponíveis no aplicativo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
