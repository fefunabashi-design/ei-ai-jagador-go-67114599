import { Link } from "react-router-dom";

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
          <h1 className="text-base font-semibold">Privacidade e Segurança</h1>
          <span className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 text-sm leading-relaxed">
        <section>
          <p className="text-muted-foreground">
            Esta página é mantida pelos responsáveis do E Aí Jogador para esclarecer
            como tratamos dados pessoais e quais controles de segurança estão ativos
            no aplicativo. Não é uma certificação independente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Dados que coletamos</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Dados de cadastro: nome, e-mail, telefone, data de nascimento, cidade.</li>
            <li>Dados de time e jogadores cadastrados pelo administrador do time.</li>
            <li>Dados de partidas, escalações, pagamentos (comprovantes Pix) e mensalidades.</li>
            <li>Mensagens em chats de partida e publicações na Resenha.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Quem pode ver o quê</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Seu perfil completo só é visível para você.</li>
            <li>Dados sensíveis do time (CPF, telefones e e-mails da diretoria) só são visíveis para o dono do time.</li>
            <li>Telefone, e-mail, data de nascimento e CPF de jogadores só são visíveis para o próprio jogador e para o dono do time.</li>
            <li>Chats, escalações e convocações de partida são visíveis apenas para participantes da partida.</li>
            <li>Listagem pública de times e jogadores mostra apenas dados não sensíveis (nome, apelido, foto, posição, região).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Controles de segurança ativos</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Autenticação obrigatória com e-mail/senha, Google e Apple.</li>
            <li>Regras de acesso por linha (Row-Level Security) em todas as tabelas sensíveis.</li>
            <li>Canais de tempo real restritos aos participantes da partida ou membros do time.</li>
            <li>Operações privilegiadas executadas apenas no servidor (Edge Functions) com chaves protegidas.</li>
            <li>Comprovantes de pagamento armazenados em bucket privado, acessíveis apenas ao próprio usuário e aos administradores.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Seus direitos</h2>
          <p className="text-muted-foreground">
            Você pode editar seu perfil, sair de um time ou solicitar a exclusão da sua
            conta a qualquer momento. Para solicitações de privacidade (LGPD) entre em
            contato pelo suporte do aplicativo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Reporte de vulnerabilidades</h2>
          <p className="text-muted-foreground">
            Se você encontrou um possível problema de segurança, por favor entre em
            contato pelo suporte do aplicativo antes de divulgar publicamente.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-6 border-t border-border">
          Este conteúdo é editável pelos responsáveis pelo aplicativo e descreve as
          práticas atuais. Para detalhes legais completos, consulte os Termos de Uso.
        </p>
      </main>
    </div>
  );
};

export default Privacidade;
