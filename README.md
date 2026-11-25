# Museu Histórico de São José — Site

## Visão Geral

Este projeto é uma landing page responsiva para o **Museu Histórico de São José**, desenvolvida com **Next.js** e **Tailwind CSS**. O objetivo é proporcionar uma experiência imersiva aos visitantes, com acervo de peças, vídeos, artigos, **tour 3D interativo** e jogos.

O conteúdo do **acervo** e dos **vídeos** é cadastrado no **Notion** e sincronizado com o banco de dados do site por um script. Quem cuida do conteúdo edita apenas o Notion; o site lê tudo do próprio banco e não depende do Notion para funcionar (veja [Como funciona a integração com o Notion](#como-funciona-a-integração-com-o-notion)).

## Documentação funcional

- [Casos de uso observados no código](docs/casos-de-uso.md) — documentação reversa dos fluxos de visitantes e administradores, com pontos ainda pendentes de validação.

## Tecnologias Utilizadas

- **Next.js 14** (React Framework, App Router)
- **Tailwind CSS** (Estilização)
- **TypeScript** (Tipagem)
- **Three.js** (Tour 3D)
- **Prisma + MySQL** (Banco de dados)
- **Notion API** (Fonte do acervo e dos vídeos)
- **sharp** e **heic-convert** (Conversão de imagens para WebP)
- **Docker e Docker Compose** (Containerização)
- **Caddy** (Proxy reverso em produção)
- **Biome** (Lint e formatação)

## Sumário

1. [Como funciona a integração com o Notion](#como-funciona-a-integração-com-o-notion)
2. [Pré-requisitos](#pré-requisitos)
3. [Como rodar o projeto com Docker (recomendado)](#como-rodar-o-projeto-com-docker-recomendado)
4. [Configurando o Notion](#configurando-o-notion)
5. [Rotina do dia a dia](#rotina-do-dia-a-dia)
6. [Rodar o projeto sem Docker](#rodar-o-projeto-sem-docker)
7. [Banco de dados: MySQL + Prisma](#banco-de-dados-mysql--prisma)
8. [Produção](#produção)
9. [Estrutura do projeto](#estrutura-do-projeto)
10. [Diagrama do banco de dados](#diagrama-do-banco-de-dados)
11. [Boas práticas](#boas-práticas)
12. [Segurança](#segurança)
13. [Futuras alterações](#futuras-alterações)

---

## Como funciona a integração com o Notion

### Visão geral

```mermaid
flowchart LR
    N[("Notion<br/>acervo e vídeos")] -->|"npm run sync-notion"| S["scripts/sync-notion.ts"]
    S -->|"upsert por notionId"| DB[("MySQL (Prisma)")]
    S -->|"fotos em WebP e vídeos"| V[("Volume uploads_data")]
    V --> M["Rota /media/*"]
    DB --> A["Site Next.js"]
    M --> A
```

O site **não consulta o Notion quando alguém o visita**. O script `sync-notion` faz essa ponte, de forma manual ou agendada:

1. Lê os dois bancos do Notion (acervo e vídeos) usando uma conexão interna, com permissão só de leitura.
2. Grava ou atualiza cada item no MySQL, usando o ID da página do Notion (`notionId`) como chave. Rodar o sync várias vezes não duplica registros.
3. Baixa as fotos, converte para WebP e salva no volume `uploads_data`. Baixa também os vídeos anexados.
4. O site lê os dados do MySQL e as mídias pela rota `/media/*`.

Por isso o site continua no ar mesmo que o Notion fique indisponível ou o token seja revogado: o que para é apenas a atualização do conteúdo. Atualizar o conteúdo também não exige refazer o build do site.

### O que cada coluna do Notion vira no banco

**Acervo** (`Acervo` e `AcervoMidia`):

| Coluna no Notion | Campo no banco |
|---|---|
| `Nome` | `titulo` e `nome` |
| `Acervo` | `tags` |
| `Add` (caixa de seleção) | `ativo` (peça visível ou não) |
| `Arquivos e mídia` | `imagem`, `imagemCapa` (primeira foto) e uma linha em `AcervoMidia` por foto |
| `Coleção` | `colecao` |
| `Contexto Historico` | `contextoHistorico` |
| `Data de Produção` | `dataProducao` |
| `Dimensões` | `altura`, `largura` e `profundidade` (veja abaixo) |
| `Doador` | `doador` |
| `Estado de Conservação` | `estadoConservacao` |
| `Local de Origem` | `cidadeOrigem`, `estadoOrigem` e `paisOrigem` (veja abaixo) |
| `Material` | `material` |
| `Nº de Inventário` | `numeroInventario` |
| `Período/Época` | `periodo` |
| `Técnica` | `tecnica` |

Os campos `descricao`, `artista`, `localizacao` e `formaAquisicao` **não vêm do Notion**; o sync não os altera, então o que já existir neles é preservado.

- **Dimensões:** se o texto tiver o formato `Altura: 30 cm, Largura: 20 cm, Profundidade: 10 cm`, cada medida vai para o seu campo. Caso contrário, o texto inteiro vai para `altura`.
- **Local de Origem:** o formato esperado é `Cidade - UF - País`. Se houver só a cidade, o país assume "Brasil".
- **Ordem:** as peças são numeradas pela ordem de criação no Notion.

**Vídeos** (`VideoEspecial`):

| Coluna no Notion | Campo no banco |
|---|---|
| `Nome` | `titulo` |
| `Descrição` | `descricao` |
| `Tipo` (opcional) | `tipo` (padrão: `especial`) |
| `Arquivos e mídia` | `video` (arquivo baixado e servido em `/media/videos/...`). **É o preferido.** |
| `URL` | `video`, usada só se não houver arquivo anexado (YouTube, Vimeo etc.) |
| `Ordem` (opcional) | `ordem` (padrão: posição na lista) |
| `Add` | `ativo` |

As colunas `Créditos`, `Créditos adicionais`, `Duração` e `Produção` ainda não são salvas, pois o model `VideoEspecial` não tem campos para elas.

### Regras de sincronização

- **Peça nova no Notion:** é criada no banco.
- **Peça editada no Notion:** é atualizada no banco. Editar os mesmos campos pelo painel admin não é recomendado, pois serão sobrescritos na próxima sincronização.
- **Peça removida do Notion:** fica **inativa** no site (não é apagada do banco).
- **Peça que falhou na sincronização:** continua como estava e não é desativada.
- **Peças antigas (importadas do CSV):** se uma peça do Notion tiver o mesmo `Nº de Inventário` de uma antiga, o registro antigo é reaproveitado, mantendo o mesmo `id`. As antigas que não existem no Notion podem ser desativadas com `--clean-legacy`.
- **Segurança contra lista vazia:** se o Notion devolver zero itens, o sync aborta em vez de desativar o acervo inteiro.

### Como as mídias são tratadas

- **Fotos:** são baixadas, giradas conforme a orientação original, convertidas para WebP e salvas com um nome gerado a partir do arquivo no Notion. Foto igual não é baixada de novo; foto trocada no Notion vira um arquivo novo.
- **HEIC (iPhone):** é convertido automaticamente. Se um arquivo HEIC vier com outra extensão, o script tenta a conversão também.
- **Vídeos:** são gravados primeiro em arquivo temporário, então um download interrompido não deixa vídeo pela metade. Prefira `.mp4` (H.264/AAC); `.mov` pode não tocar em todos os navegadores.
- **Arquivos vazios:** contam como não baixados e são baixados de novo.
- **Falhas de rede:** cada download tem timeout e até 3 tentativas. A causa real do erro aparece no terminal.
- **Por que o Notion não serve as imagens direto:** os links de arquivos do Notion expiram em cerca de 1 hora. Baixar as mídias evita imagens quebradas.

### Rota `/media/*`

O Next.js em produção só serve arquivos que existiam em `public/` no momento do build, e as mídias do Notion chegam depois. A rota `src/app/media/[...path]/route.ts` lê os arquivos do volume `uploads_data` e os entrega ao navegador, com cache longo (o nome muda quando a foto muda), suporte a `Range` (necessário para vídeos no Safari e para avançar o vídeo) e proteção contra acesso a arquivos fora da pasta de mídia.

### Dependência do Notion

| Situação | O que acontece |
|---|---|
| Notion fora do ar ou token revogado | O site continua com os últimos dados sincronizados; só a atualização para |
| Parar de usar o Notion | Basta parar de rodar o sync; os dados ficam no banco e podem ser editados direto nele |
| Vídeo cadastrado só pela coluna `URL` | Depende do serviço do link (YouTube, Drive...) |
| Rotas de API que consultam o Notion a cada acesso, se ainda existirem | Dependem do Notion em tempo real; se o site não as usa, podem ser removidas |

Faça **backup** do volume do MySQL (`db_data`) e do `uploads_data`, pois o conteúdo sincronizado vive no servidor.

---

## Pré-requisitos

- [Git](https://git-scm.com/)
- [Docker](https://docs.docker.com/engine/install/) com o plugin **Docker Compose** (`docker compose version` deve funcionar)
- Acesso aos bancos do museu no Notion (veja [Configurando o Notion](#configurando-o-notion))
- Para rodar sem Docker: Node.js 20+ e um servidor MySQL

No Linux, para usar o Docker sem `sudo`:

```bash
sudo usermod -aG docker $USER
```

Depois saia da sessão e entre de novo.

## Como rodar o projeto com Docker (recomendado)

### 1. Clonar o repositório

```bash
git clone https://github.com/Projeto-Site-do-Museu/ifsc-museu-saojose.git
cd ifsc-museu-saojose
```

(Se estiver usando um fork, troque pelo endereço do seu fork.)

### 2. Criar o arquivo `.env`

```bash
cp .env.example .env
```

Preencha as variáveis, **sem aspas e sem espaços ao redor do `=`**:

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Frase longa e aleatória usada para assinar os logins do painel |
| `MY_DATABASE` | Nome do banco MySQL (ex.: `museu`) |
| `MY_SECRET_PW` | Senha do usuário `root` do MySQL. Você escolhe; use só letras e números |
| `DATABASE_URL` | `mysql://root:SENHA@mysql:3306/NOME_DO_BANCO` (mesma senha e mesmo nome acima; o host é `mysql`, o nome do serviço no Compose) |
| `NOTION_TOKEN` | Token da conexão do Notion |
| `NOTION_ACERVO_DATABASE_ID` | ID do banco do acervo |
| `NOTION_VIDEOS_DATABASE_ID` | ID do banco de vídeos |
| `NOTION_DATABASE_ID` | ID do banco usado pela rota genérica de consulta ao Notion, se estiver em uso |

> **Nunca envie o `.env` ao GitHub.** Confira se ele está no `.gitignore`.

### 3. Criar a rede do Docker (uma única vez)

```bash
docker network create museu_network
```

### 4. Subir o projeto

```bash
docker compose up -d --build
```

O primeiro build leva alguns minutos. Quando terminar, o site fica em `http://localhost:3000`.

### 5. Criar as tabelas do banco (primeira vez)

```bash
docker compose exec app npx prisma db push
```

Se aparecer erro de conexão, espere alguns segundos até o MySQL terminar de iniciar e tente de novo.

### 6. Criar o usuário administrador (primeira vez)

```bash
docker compose exec app npm run setup-db
```

Cria o usuário `admin@acervo.local`, os artigos, o carrossel e as configurações iniciais. **Este comando apaga o acervo existente**: rode somente em um banco novo e nunca mais depois que o acervo estiver no ar. A senha inicial do admin está definida em `scripts/setup-database.ts`: **troque-a antes de publicar o site**.

### 7. Sincronizar o acervo e os vídeos do Notion

```bash
docker compose exec app npm run sync-notion
```

Na primeira vez, o sync baixa e converte todas as fotos e pode levar vários minutos. O terminal mostra o progresso (`[12/216] Nome da peça`) e, ao final, um resumo com o número de peças e vídeos sincronizados e de erros. Depois recarregue o site em `http://localhost:3000`.

## Configurando o Notion

1. Acesse **Ferramentas do desenvolvedor → Developer connections** e crie uma conexão com autenticação por **token de API** (conexão interna). Em permissões, deixe apenas **ler conteúdo**. Esse tipo de conexão não depende da conta de uma pessoa nem expira como os tokens de acesso individuais.
2. Copie o token para `NOTION_TOKEN` no `.env`.
3. Abra cada banco (acervo e vídeos) no Notion, clique em **⋯ → Conexões** e adicione a conexão criada. Sem isso, a API responde "não encontrado".
4. O ID de cada banco é o trecho de 32 caracteres na URL da página do banco. Coloque-os em `NOTION_ACERVO_DATABASE_ID` e `NOTION_VIDEOS_DATABASE_ID`.

Os nomes das colunas esperadas estão na tabela de mapeamento, acima, e no topo de `scripts/sync-notion.ts` (constantes `ACERVO` e `VIDEOS`), onde podem ser ajustados. Formatos de imagem aceitos: JPG, PNG, WebP, GIF, AVIF, TIFF e HEIC.

## Rotina do dia a dia

| Situação | Comando |
|---|---|
| Iniciar o projeto | `docker compose up -d` |
| Parar o projeto | `docker compose stop` |
| Mudou o código do site | `docker compose up -d --build` |
| Mudou o `schema.prisma` | `docker compose up -d --build` e depois `docker compose exec app npx prisma db push` |
| Mudou algo no Notion | `docker compose exec app npm run sync-notion` |
| Mudou o `.env` | `docker compose up -d` |
| Ver os logs do site | `docker compose logs -f app` |
| Ver o estado dos containers | `docker compose ps` |

Opções do sync (dentro do container, prefixe com `docker compose exec app`):

```bash
npm run sync-notion -- acervo          # só o acervo
npm run sync-notion -- videos          # só os vídeos
npm run sync-notion -- --force         # baixa as mídias de novo
npm run sync-notion -- --clean-legacy  # desativa registros antigos que não existem no Notion
```

> Evite `docker compose down -v`: o `-v` apaga o volume do banco de dados.

## Rodar o projeto sem Docker

Requer um MySQL acessível (veja [Banco de dados](#banco-de-dados-mysql--prisma)). No `.env.local`, use `localhost` no lugar de `mysql` na `DATABASE_URL`. O MySQL do `docker-compose.yml` não expõe a porta 3306 para fora do Docker; para usá-lo com o servidor de desenvolvimento local, adicione `ports: ["3306:3306"]` ao serviço `mysql`.

### Servidor de desenvolvimento

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
# ou
yarn install
yarn dev
```

Acesse `http://localhost:3000` no navegador. Se a porta 3000 estiver ocupada (por exemplo, pelo container do Docker), o Next usa a 3001 e avisa no terminal.

### Servidor definitivo

```bash
npm run build
npm run start
```

O `build` gera uma versão otimizada do site; qualquer erro no código pode impedi-lo e precisa ser corrigido antes.

## Banco de dados: MySQL + Prisma

### Dependências

- [MySQL](https://www.mysql.com/) (servidor de banco de dados relacional)
- [Prisma ORM](https://www.prisma.io/) (`prisma` e `@prisma/client`)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) (hash de senhas)

Com `npm install`, tudo isso já vem instalado.

### MySQL local (sem Docker)

1. Instale o MySQL:

   ```bash
   sudo apt update
   sudo apt install mysql-server
   ```

2. Crie um usuário e o banco:

   ```bash
   sudo mysql
   ```

   ```sql
   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'SUA_SENHA';
   CREATE DATABASE database_museu;
   GRANT ALL PRIVILEGES ON database_museu.* TO 'admin'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. Configure a conexão no `.env`:

   ```env
   DATABASE_URL="mysql://admin:SUA_SENHA@localhost:3306/database_museu"
   ```

### Comandos Prisma

- **Aplicar o schema ao banco** (usado no fluxo com Docker):

  ```bash
  npx prisma db push
  ```

- **Criar uma migration versionada** (para manter o histórico de alterações):

  ```bash
  npx prisma migrate dev --name nome-da-alteracao
  ```

- **Visualizar e editar dados pela interface web:**

  ```bash
  npx prisma studio
  ```

- **Gerar o client do Prisma** (após alterar o schema):

  ```bash
  npx prisma generate
  ```

> Sempre que alterar o `prisma/schema.prisma`, rode `npx prisma generate` e atualize o banco (`db push` ou `migrate dev`). Campos de texto longo devem usar `@db.Text`: no MySQL, o `String` padrão do Prisma tem só 191 caracteres.

### Usuário administrador

O usuário admin inicial é criado pelo `npm run setup-db`. Para criar outro manualmente, gere o hash da senha:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'SUA_SENHA'
```

Use o resultado no campo `senhaHash` ao criar o usuário na tabela `Usuario`.

### Acesso ao banco

```bash
mysql -u admin -p -h localhost -P 3306 database_museu   # via terminal
npx prisma studio                                        # via interface web
```

### Boas práticas

- **Nunca salve senhas em texto puro:** use sempre hash (`bcryptjs`).
- **Use variáveis de ambiente:** nunca coloque senhas ou tokens no código.
- **Mantenha o `schema.prisma` atualizado** sempre que alterar entidades ou relacionamentos.
- **Use o Prisma Client para as consultas:** evita SQL Injection e facilita a manutenção.
- **Faça backup regular do banco**, principalmente em produção.

### Referências

- [Documentação Prisma](https://www.prisma.io/docs/)
- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Prisma + Next.js](https://www.prisma.io/docs/guides/development-environment/nextjs)
- [Notion API](https://developers.notion.com/)

## Produção

O `Caddyfile` do repositório configura o proxy reverso do site. Em produção:

1. Clone o repositório no servidor e crie o `.env` com valores próprios (senhas diferentes das de teste).
2. Siga os passos da seção "Como rodar o projeto com Docker".
3. Agende a sincronização com o Notion, por exemplo todos os dias às 3h, no `cron` do servidor:

   ```
   0 3 * * * cd /caminho/do/projeto && docker compose exec -T app npm run sync-notion >> /var/log/museu-sync.log 2>&1
   ```

4. Para publicar uma versão nova do código, rode `docker compose up -d --build`.

Se alguma página lê o Prisma durante o build, ela mostrará dados antigos até o próximo build; nesse caso, use `export const dynamic = 'force-dynamic'` ou `revalidate` na página. O `mysql` deve ter `restart: unless-stopped` no `docker-compose.yml`, para voltar junto com o site depois de um reinício do servidor.

## Estrutura do projeto

```
/
├── prisma/              # Schema do banco (schema.prisma) e seed
├── public/              # Arquivos estáticos (imagens, fontes, vídeos, modelos 3D)
├── scripts/             # Importação e sincronização (sync-notion.ts, setup-database.ts)
├── dados_acervo/        # Dados antigos do acervo (CSV e imagens), usados só pelo setup-db
├── docs/                # Documentação adicional
├── src/                 # Código-fonte do projeto
│   ├── app/             # Páginas e rotas da aplicação
│   │   ├── globals.css  # CSS global (use só para configurações globais; nas páginas use classes Tailwind)
│   │   ├── page.tsx     # Página principal (Home)
│   │   ├── about/       # Página Sobre
│   │   ├── acervo/      # Página Acervo
│   │   ├── tour/        # Página do Tour 3D
│   │   ├── media/       # Rota /media/* que serve as mídias baixadas do Notion
│   │   └── ...          # Demais páginas e rotas de API
│   ├── components/      # Componentes reutilizáveis (header, footer, tour 3D...)
│   └── lib/             # Utilitários, incluindo a conexão com o Notion
├── Dockerfile           # Imagem de produção
├── docker-compose.yml   # Site (app) e MySQL
├── Caddyfile            # Proxy reverso para produção
├── next.config.mjs      # Configuração do Next.js
├── biome.jsonc          # Configuração de lint e formatação
├── tailwind.config.ts   # Configuração do Tailwind
├── tsconfig.json        # Configuração do TypeScript
└── package.json         # Dependências e scripts
```

## Diagrama do banco de dados

Fonte: `prisma/schema.prisma` (confira lá em caso de divergência). Campos marcados como "opcional" aceitam `NULL`. Os campos `notionId` guardam o ID da página no Notion e são preenchidos pela sincronização.

```mermaid
erDiagram
    Usuario {
        Int id PK "autoincrement()"
        String nome
        String email UK
        String senhaHash
        String role
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
    }
    Artigo {
        Int id PK "autoincrement()"
        String titulo
        String resumo "opcional; Text"
        String conteudo "LongText"
        String imagem "opcional"
        String video "opcional"
        DateTime dataPublicacao "opcional"
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
        Int usuarioId FK
    }
    Acervo {
        Int id PK "autoincrement()"
        String titulo
        String descricao "opcional; Text"
        String imagem "opcional"
        Int ordem "opcional"
        String colecao "opcional; Text"
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
        Int usuarioId FK
        String nome "opcional"
        String numeroInventario "opcional; Text"
        String artista "opcional"
        String tags "opcional; Text"
        String localizacao "opcional"
        String periodo "opcional; Text"
        String dataProducao "opcional; Text"
        String material "opcional; Text"
        String tecnica "opcional; Text"
        String altura "opcional; Text"
        String largura "opcional; Text"
        String profundidade "opcional; Text"
        String cidadeOrigem "opcional"
        String estadoOrigem "opcional"
        String paisOrigem "opcional"
        String contextoHistorico "opcional; Text"
        String doador "opcional; Text"
        String formaAquisicao "opcional"
        String estadoConservacao "opcional; Text"
        String imagemCapa "opcional"
        String notionId UK "opcional; id da página no Notion"
    }
    AcervoMidia {
        Int id PK "autoincrement()"
        Int acervoId FK
        String tipo
        String url "Text"
        String titulo "opcional"
        Int ordem "opcional"
        Boolean ativo
        DateTime createdAt
    }
    VideoEspecial {
        Int id PK "autoincrement()"
        String titulo
        String descricao "opcional; Text"
        String tipo
        String video "Text"
        String thumbnail "opcional"
        Int ordem "opcional"
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
        Int usuarioId FK
        String notionId UK "opcional; id da página no Notion"
    }
    ContadorVisitante {
        Int id PK "autoincrement()"
        Int contador
        DateTime dataRegistro
        String ipOrigem "opcional"
        String userAgent "opcional"
        DateTime createdAt
    }
    Configuracao {
        Int id PK "autoincrement()"
        String chave UK
        String valor "Text"
        String descricao "opcional"
        DateTime createdAt
        DateTime updatedAt
    }

    Usuario ||--o{ Artigo : "escreve"
    Usuario ||--o{ Acervo : "gerencia"
    Usuario ||--o{ VideoEspecial : "administra"
    Acervo ||--o{ AcervoMidia : "possui"
```

A exclusão de um `Acervo` remove suas `AcervoMidia` em cascata, conforme a relação definida no Prisma.

## Boas práticas

### Mobile First com Tailwind CSS

O projeto foi criado em Next.js com Tailwind CSS, utilizando conceitos de **Mobile First**. Caso altere a estrutura do código, tome *MUITO* cuidado para não quebrar essas práticas. Toda a responsividade do site gira em torno do Mobile First: os estilos comuns permanecem inalterados, e os estilos que diferem entre mobile e web devem ser escritos assim:

```tsx
className="estilo-para-mobile md:estilo-para-web"
```

Mantendo essa estrutura, a responsividade do site é fácil de ajustar.

### Utilize apenas as versões novas do Next

As principais funcionalidades do site seguem as boas práticas das versões mais recentes do Next.js (App Router). Em novas alterações, observe o restante do código e não adicione sintaxe antiga, pois provavelmente estará incorreta.

### Padrões gerais

- **Componentização:** componentes reutilizáveis para facilitar a manutenção.
- **Responsividade:** Tailwind CSS para adaptação a diferentes tamanhos de tela.
- **Code style:** o projeto usa **Biome**. Rode `npm run lint` para verificar e `npm run lint:fix` / `npm run format:fix` para corrigir.
- **Performance:** imagens otimizadas (WebP) e uso de **lazy loading**.

## Segurança

- Nunca versione o `.env`, tokens ou senhas.
- Use uma conexão do Notion com permissão apenas de leitura.
- Troque a senha padrão do administrador antes de colocar o site no ar.
- Não escreva senhas reais na documentação ou nos scripts.
- Se algum token ou senha já esteve em um commit, considere-o comprometido e gere outro: o histórico do Git guarda tudo.

## Futuras alterações

- Painel de administração mais completo (hoje o conteúdo do acervo e dos vídeos é gerenciado no Notion).
- Salvar no banco os campos `Créditos`, `Duração` e `Produção` dos vídeos.
- Integrar os modelos 3D (`.glb`) do Notion ao tour virtual.
- Novos jogos, usando os mesmos dados do acervo.
- Remover as rotas de API antigas que consultam o Notion diretamente, se não forem mais usadas.

## Considerações finais

Caso precise adicionar novas funcionalidades ou fazer manutenção, siga os padrões estabelecidos e consulte a documentação do Next.js e do Tailwind CSS.

## Créditos

Projeto de extensão do Instituto Federal de Santa Catarina (IFSC) em parceria com o Museu Histórico de São José. Adicione aqui a equipe, os orientadores e a licença do projeto.
