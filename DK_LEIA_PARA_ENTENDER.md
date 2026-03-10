# ExcelHub — Documentação do Projeto

## O que é?
ExcelHub é um sistema de versionamento para planilhas, tipo um GitHub mas para arquivos Excel/CSV. A ideia é resolver o problema clássico de empresas que trabalham com `planilha_v2_final_FINAL(2).xlsx` — aqui tudo tem controle de versão, histórico e colaboração.

## Stack
- **Next.js 14** (App Router) + React 18 + TypeScript
- **PostgreSQL** com Prisma ORM
- **NextAuth** (login com GitHub e Google)
- **TailwindCSS** com dark mode
- **Recharts** para gráficos
- **XLSX** para parsing de Excel

## Fluxo principal
1. Usuário faz login (GitHub/Google)
2. Cria um repositório (público ou privado)
3. Faz upload de um arquivo `.xlsx` ou `.csv`
4. O sistema parseia o arquivo, salva um snapshot JSON de todas as células e cria um commit
5. A partir daí funciona igual Git: branches, commits, diffs, merge requests

## Funcionalidades

### Repositórios
- Criar, editar, deletar repos
- Visibilidade pública ou privada
- Adicionar collaborators (Owner, Editor, Viewer)

### Branches e Commits
- Criar branches a partir de qualquer outra
- Cada upload de arquivo vira um commit com hash, mensagem e autor
- Histórico completo de commits por branch

### Visualizador de Planilha
- Renderiza o Excel direto no browser como tabela
- Mostra fórmulas com ícone `ƒ` e tooltip

### Diff (comparação de versões)
- Compara dois commits célula por célula
- Cores: verde (adicionado), vermelho (removido), amarelo (modificado), indigo (fórmula alterada)
- Modo side-by-side e modo unificado
- Entende fórmulas — detecta quando só a fórmula muda mas o valor não

### Merge Requests
- Abrir MR de uma branch para outra (tipo Pull Request)
- Three-way merge: encontra o ancestral comum e faz merge inteligente
- Se duas pessoas editaram a mesma célula → mostra conflito com opção de resolver manualmente
- Review comments: comentar em células específicas do diff, com threads e replies

### Notificações
- Sino no header com contagem de não-lidas
- Notificações automáticas para: commits, MRs (abertas/mergeadas/fechadas), comments, novos collaborators
- Webhooks configuráveis por repo (recebe POST com payload assinado via HMAC)

### Audit Log
- Registra todas as ações do repositório (quem fez o quê, quando, de qual IP)
- Filtros por ação e data
- Export em PDF e CSV (server-side)

### Métricas
- Dashboard com cards de overview (commits, branches, MRs, collaborators)
- Gráfico de commits por semana (últimas 12 semanas)
- Top contributors com gráfico de pizza
- Breakdown de MRs por status

### Outros
- Busca global (Cmd+K) por repos e usuários
- Chat com IA (integração OpenRouter)
- Dark mode
- Barra de progresso na navegação

## Como rodar

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente (.env)
# DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID/SECRET, AUTH_GOOGLE_ID/SECRET

# Rodar migrations do banco
npx prisma migrate dev

# Iniciar dev server (porta 3001)
npm run dev -- -p 3001
```

## Estrutura de pastas resumida
```
src/
├── app/           → Páginas e API routes (Next.js App Router)
├── components/    → Componentes React (auth, layout, repo, ui, notifications)
├── lib/           → Lógica core (auth, prisma, excel parser, diff engine, merge, notifications)
└── types/         → Definições TypeScript
```
