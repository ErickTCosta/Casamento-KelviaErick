# Kelvia & Erick — RSVP

Aplicação Next.js com Prisma e PostgreSQL no Supabase para confirmação nominal de casamento.

## Configuração local

1. Execute `npm install`.
2. Copie `.env.example` para `.env` e configure `DATABASE_URL` e `DIRECT_URL`. Use a senha do banco Supabase; caracteres especiais na senha devem ser codificados para URL (por exemplo, `#` como `%23`). Gere um token temporário de primeiro acesso com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` e salve-o como `ADMIN_SETUP_TOKEN`.
3. Execute `npm run db:migrate` para criar as tabelas e as permissões RLS.
4. Execute `npm run db:seed` para cadastrar os 31 convites iniciais. O seed não apaga respostas nem registros existentes.
5. Inicie a aplicação com `npm run dev` e abra `/admin`. Informe o `ADMIN_SETUP_TOKEN` e escolha uma senha de pelo menos 12 caracteres. O usuário fixo é `Erick`; a senha é armazenada como hash scrypt e não pode ser recuperada pelo painel.
6. Depois de configurar a conta, remova `ADMIN_SETUP_TOKEN` do ambiente local e da Vercel.

Use `npm run db:status` para conferir as contagens de convites, pessoas, presentes e o estado do RLS.

Acesse `http://localhost:3000`. O painel administrativo fica em `http://localhost:3000/admin`; `/?admin=1` redireciona para o painel.

O servidor de desenvolvimento usa `.next-dev`, separada de `.next`, usada no build de produção.

## Publicação na Vercel

Configure na Vercel as variáveis `DATABASE_URL`, `DIRECT_URL`, `ADMIN_SETUP_TOKEN` e `NEXT_PUBLIC_SITE_URL` para os ambientes desejados. Use em `NEXT_PUBLIC_SITE_URL` a URL pública que deve ser copiada nos convites (preferencialmente um domínio de produção estável, sem barra no final), e não a URL de um deployment de preview. Use a URI Supabase de pooler em modo transação em `DATABASE_URL` e a URI de pooler em modo sessão em `DIRECT_URL`. Nunca publique credenciais no repositório. Depois de concluir o primeiro cadastro do administrador, remova `ADMIN_SETUP_TOKEN` da Vercel e faça um novo deploy.

Antes do primeiro deploy, execute `npm run db:migrate` e `npm run db:seed` a partir de um ambiente seguro que tenha as URLs configuradas. O build da Vercel gera o Prisma Client automaticamente.

As tabelas têm Row Level Security ativado e não concedem acesso direto aos papéis `anon` e `authenticated`; a aplicação acessa o PostgreSQL somente por rotas server-side com as credenciais do banco.

O administrador entra com as credenciais definidas no ambiente; a sessão é mantida em um cookie HttpOnly e expira após 12 horas. As rotas `/api/admin/*` exigem essa sessão. Os convidados respondem pelo link individual do convite.

O prazo de confirmação exibido ao convidado é **10 de outubro de 2026**.
