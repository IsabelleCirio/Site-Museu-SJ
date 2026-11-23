# Documentação do Projeto

## Visão Geral
Este projeto é uma landing page responsiva para o Museu Histórico de São José, desenvolvida com **Next.js** e **Tailwind CSS**. O objetivo é proporcionar uma experiência imersiva para os visitantes, incluindo um **tour 3D interativo**.

## Documentação funcional

- [Casos de uso observados no código](docs/casos-de-uso.md) — documentação reversa dos fluxos de visitantes e administradores, com pontos ainda pendentes de validação.

## Tecnologias Utilizadas
- **Next.js** (React Framework)
- **Tailwind CSS** (Estilização)
- **TypeScript** (Tipagem)
- **Three.js** (para o tour 3D)
- **Docker** (Containerização)

## Como Rodar o Projeto
### 1. Clonar o Repositório
```bash
git clone https://github.com/Projeto-Site-do-Museu/ProjetoMuseu
cd nome-do-projeto
```

### 2. Instalar Dependências
```bash
npm install
# ou
yarn install
```

### 3. Rodar o Servidor de Desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

Acesse `http://localhost:3000` no navegador para ver a aplicação em funcionamento.

### 4. Rodar o Projeto com Docker

#### Ambiente de Desenvolvimento
Para rodar o projeto em ambiente de desenvolvimento com Docker (com hot reload):

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Este comando irá:
- Construir a imagem Docker para desenvolvimento
- Montar o código-fonte como um volume para permitir hot reload
- Iniciar o servidor de desenvolvimento com `next dev`

Acesse `http://localhost:3000` no navegador para ver a aplicação em funcionamento.

#### Ambiente de Produção
Para rodar o projeto em ambiente de produção com Docker:

```bash
docker-compose up --build
```

Este comando irá:
- Construir a imagem Docker para produção
- Executar o build da aplicação
- Iniciar o servidor otimizado com `next start`

Acesse `http://localhost:3000` no navegador para ver a aplicação em funcionamento.

### 5. Rodar o Servidor definitivo sem Docker

Inicialmente, execute: 

```bash
npm run build
```

Este comando irá gerar uma versão otimizada do site, porém qualquer erro no código pode impossibilitar o build e deve ser corrigido

após o build

```bash
npm run start
```

Acesse `http://localhost:3000` no navegador para ver a aplicação em funcionamento.

### 6. Banco de Dados: MySQL + Prisma

#### Dependências

- [MySQL](https://www.mysql.com/) (Servidor de banco de dados relacional)
- [Prisma ORM](https://www.prisma.io/) (`prisma` e `@prisma/client`)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) (para hash de senhas)

Instale as dependências do Prisma no projeto:

```bash
npm install prisma @prisma/client bcryptjs
npx prisma init
```

#### Configuração do MySQL

1. **Instale o MySQL** (caso não tenha):

   ```bash
   sudo apt update
   sudo apt install mysql-server
   ```

2. **Crie um usuário e banco de dados:**

   ```bash
   sudo mysql
   ```

   No prompt do MySQL:

   ```sql
   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
   CREATE DATABASE database_museu;
   GRANT ALL PRIVILEGES ON database_museu.* TO 'admin'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Configure a string de conexão no arquivo `.env`:**

   ```env
   DATABASE_URL="mysql://admin:password@localhost:3306/database_museu"
   ```

#### Comandos Prisma

- **Gerar as tabelas no banco:**

  ```bash
  npx prisma migrate dev --name init
  ```

- **Visualizar e editar dados via interface web:**

  ```bash
  npx prisma studio
  ```

- **Gerar o client do Prisma (após alterar o schema):**

  ```bash
  npx prisma generate
  ```

#### Boas Práticas

- **Nunca salve senhas em texto puro**: Sempre utilize hash (exemplo: `bcryptjs`).
- **Versione o schema do banco**: Use migrations do Prisma para manter o histórico das alterações.
- **Use variáveis de ambiente**: Nunca exponha senhas ou dados sensíveis no código.
- **Faça backup regular do banco**: Especialmente em produção.
- **Utilize o Prisma Client para todas as queries**: Evita SQL Injection e facilita manutenção.
- **Mantenha o schema.prisma atualizado**: Sempre que alterar entidades ou relacionamentos.

#### Acesso ao Banco de Dados

- **Acesso via terminal:**

  ```bash
  mysql -u admin -p -h localhost -P 3306 database_museu
  ```

- **Acesso via Prisma Studio:**

  ```bash
  npx prisma studio
  ```

### Como gerar o hash da senha do admin

Para criar um usuário admin manualmente no banco, você precisa gerar o hash da senha.  
No terminal, execute:

```sh
node
```
E então, dentro do prompt do Node.js, digite:

```js
const bcrypt = require('bcryptjs');
bcrypt.hashSync('ifsc.br.museu!##&', 10);
```
O resultado será o hash da senha. Use esse valor no campo `senhaHash` ao criar o usuário admin no banco de dados.

#### Referências

- [Documentação Prisma](https://www.prisma.io/docs/)
- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Prisma + Next.js](https://www.prisma.io/docs/guides/development-environment/nextjs)

---

**Observação:**  
Sempre que alterar o arquivo `prisma/schema.prisma`, rode `npx prisma migrate dev` para atualizar o banco de dados.


# Boas práticas

### O projeto foi criado em Next.JS com Tailwind.CSS, utilizando conceitos de MobileFirst.
Em resumo, caso altere a estrutura do código, tome *MUITO* cuidado para não alterar as boas práticas.
Toda a responsividade do site gira em torno do MobileFirst. Os estilos em comum permanecem inalterados, mas os estilos que são diferentes para mobile e web devem ser feitos da seguinte forma:

ClassName=" estilo-para-mobile md:estilo-para-web"

mantendo esta estrutura a responsividade do site deve ser facilmente ajustada.

#Utilize apenas as novas versões do Next!

todas as maiores funcionalidades do site estão feitas conforme as boas práticas das versões mais recentes do next, então, em caso de novas alterações, olhe para o restante do código e não adicione nenhuma sintaxe nova, pois provavelmente estará errada.

# Futuras alterações 

O site foi desenhado para que todos as imagens e textos sejam dinamicos a partir de uma API. Esta API deve ser criada, juntamente ao banco de dados e uma interface gráfica para o gestor administrar o site de forma simples e segura apenas realizando requisições para a API. Após a conclusão da mesma, os Mocks de imagens e texto do site devem ser substituidos pelo retorno da requisição para a API, tornando o site dinâmico às alterações.

## Estrutura do Projeto
```
/
├── components/       # Componentes reutilizáveis
├── public/           # Arquivos estáticos (imagens, fontes)
├── src/              # Diretório fonte do projeto
|   ├── app/          # Páginas da aplicação
│     ├── globals.css # arquivo css geral (utilizar apenas para configurações globais, para estilizações de pagina utilizar as classes tailwind.)
│     ├── page.tsx    # Página principal (Home)
│     ├── about       # pagina sobre
│     ├── acervo      # pagina acervo
│     ├── tour        # pagina tour3D
│     ├── ...         # dentre outros
|   ├── components/   # Diretório dos componentes
│     ├── footer.tsx  # Footer do site
│     ├── header.tsx  # header do site
│     ├── tour3D.tsc  # componente do tour 3D
│     ├── ...         # dentre outros
├── package.json      # Configuração de dependências
├── tsconfig.json     # Configuração do TypeScript
├── next.config.js    # Configuração do Next.js
├── Dockerfile        # Configuração Docker para produção
├── Dockerfile.dev    # Configuração Docker para desenvolvimento
├── docker-compose.yml       # Configuração docker-compose para produção
└── docker-compose.dev.yml   # Configuração docker-compose para desenvolvimento
```

## Diagrama do Banco de Dados

Fonte: `prisma/schema.prisma`. Campos marcados como "opcional" aceitam `NULL`.

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
        String colecao "opcional"
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
        Int usuarioId FK
        String nome "opcional"
        String numeroInventario "opcional"
        String artista "opcional"
        String tags "opcional"
        String localizacao "opcional"
        String periodo "opcional"
        String dataProducao "opcional"
        String material "opcional"
        String tecnica "opcional"
        String altura "opcional"
        String largura "opcional"
        String profundidade "opcional"
        String cidadeOrigem "opcional"
        String estadoOrigem "opcional"
        String paisOrigem "opcional"
        String contextoHistorico "opcional; Text"
        String doador "opcional"
        String formaAquisicao "opcional"
        String estadoConservacao "opcional"
        String imagemCapa "opcional"
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
        String video
        String thumbnail "opcional"
        Int ordem "opcional"
        Boolean ativo
        DateTime createdAt
        DateTime updatedAt
        Int usuarioId FK
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

## Padrões e Boas Práticas
- **Componentização**: Componentes reutilizáveis para facilitar a manutenção.
- **Responsividade**: Uso de Tailwind CSS para adaptação a diferentes tamanhos de tela.
- **Code Style**: Uso de **ESLint e Prettier** para manter a uniformidade do código.
- **Performance**: Imagens otimizadas e uso de **lazy loading**.

## Considerações Finais
Caso precise adicionar novas funcionalidades ou realizar manutenção, siga os padrões estabelecidos e consulte a documentação do Next.js e Tailwind CSS.




# Documentação do Projeto

## Visão Geral

Este projeto é o site do **Museu Histórico de São José**: uma landing page responsiva desenvolvida com **Next.js** e **Tailwind CSS**, que oferece uma experiência imersiva aos visitantes, com acervo de peças, vídeos, artigos, **tour 3D interativo** e jogos.

O conteúdo do **acervo** e dos **vídeos** é cadastrado no **Notion** e sincronizado automaticamente com o banco de dados do site. Quem cuida do conteúdo edita apenas o Notion.

## Documentação funcional

- [Casos de uso observados no código](docs/casos-de-uso.md) — documentação reversa dos fluxos de visitantes e administradores, com pontos ainda pendentes de validação.

## Tecnologias Utilizadas

- **Next.js 14** (React Framework, App Router)
- **Tailwind CSS** (Estilização)
- **TypeScript** (Tipagem)
- **Three.js** (Tour 3D)
- **Prisma + MySQL** (Banco de dados)
- **Notion API** (Fonte do acervo e dos vídeos)
- **sharp** (Conversão de imagens para WebP)
- **Docker e Docker Compose** (Containerização)
- **Caddy** (Proxy reverso em produção)
- **Biome** (Lint e formatação)

## Como funciona o conteúdo

```
Notion (acervo e vídeos)
        │   npm run sync-notion
        ▼
   MySQL (Prisma)  +  imagens e vídeos baixados em /app/uploads/notion
        │
        ▼
   Site Next.js  ──  rota /media/* serve as imagens e vídeos baixados
```

O comando `sync-notion` lê os dois bancos do Notion, grava os dados no MySQL, baixa as fotos (convertidas para WebP) e os vídeos anexados. Peças e vídeos removidos do Notion ficam **inativos** no site (não são apagados do banco). Os arquivos baixados ficam no volume `uploads_data` do Docker e são servidos pela rota `/media/*`, então atualizar o conteúdo **não exige refazer o build**.

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

## Como Rodar o Projeto com Docker (recomendado)

### 1. Clonar o repositório

```bash
git clone https://github.com/Projeto-Site-do-Museu/ifsc-museu-saojose.git
cd ifsc-museu-saojose
```

### 2. Criar o arquivo `.env`

```bash
cp .env.example .env
```

Preencha as variáveis:

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

Ao final, o terminal mostra um resumo com o número de peças e vídeos sincronizados e de erros. Recarregue o site em `http://localhost:3000`.

## Configurando o Notion

1. Acesse **Ferramentas do desenvolvedor → Developer connections** e crie uma conexão com autenticação por **token de API** (conexão interna). Em permissões, deixe apenas **ler conteúdo**. Esse tipo de conexão não depende da conta de uma pessoa nem expira como os tokens de acesso individuais.
2. Copie o token para `NOTION_TOKEN` no `.env`.
3. Abra cada banco (acervo e vídeos) no Notion, clique em **⋯ → Conexões** e adicione a conexão criada. Sem isso, a API responde "não encontrado".
4. O ID de cada banco é o trecho de 32 caracteres na URL da página do banco. Coloque-os em `NOTION_ACERVO_DATABASE_ID` e `NOTION_VIDEOS_DATABASE_ID`.

### Colunas esperadas

**Banco do acervo:** `Nome`, `Acervo`, `Add` (caixa de seleção: peça ativa), `Arquivos e mídia` (fotos), `Coleção`, `Contexto Historico`, `Data de Produção`, `Dimensões`, `Doador`, `Estado de Conservação`, `Local de Origem`, `Material`, `Nº de Inventário`, `Período/Época`, `Técnica`.

**Banco de vídeos:** `Nome`, `Descrição`, `Arquivos e mídia` (arquivo `.mp4` anexado, preferido), `URL` (usada se não houver arquivo), `Add` (caixa de seleção) e, opcionalmente, `Tipo` e `Ordem`. As colunas `Créditos`, `Créditos adicionais`, `Duração` e `Produção` ainda não são salvas no banco.

Os nomes das colunas estão no topo de `scripts/sync-notion.ts` (constantes `ACERVO` e `VIDEOS`) e podem ser ajustados.

Formatos de imagem aceitos: JPG, PNG, WebP, GIF, AVIF, TIFF e HEIC (fotos de iPhone são convertidas automaticamente). Vídeos: prefira `.mp4` (H.264/AAC); arquivos `.mov` podem não tocar em todos os navegadores.

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

## Rodar o Projeto sem Docker

Requer um MySQL acessível (veja [Banco de Dados](#banco-de-dados-mysql--prisma)). No `.env.local`, use `localhost` no lugar de `mysql` na `DATABASE_URL`.

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

## Banco de Dados: MySQL + Prisma

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

## Produção

O `Caddyfile` do repositório configura o proxy reverso do site. Em produção:

1. Clone o repositório no servidor e crie o `.env` com valores próprios (senhas diferentes das de teste).
2. Siga os passos da seção "Como Rodar o Projeto com Docker".
3. Agende a sincronização com o Notion, por exemplo todos os dias às 3h, no `cron` do servidor:

   ```
   0 3 * * * cd /caminho/do/projeto && docker compose exec -T app npm run sync-notion >> /var/log/museu-sync.log 2>&1
   ```

Se alguma página lê o Prisma durante o build, ela mostrará dados antigos até o próximo build; nesse caso, use `export const dynamic = 'force-dynamic'` ou `revalidate` na página.

## Estrutura do Projeto

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
│   ├── components/      # Componentes reutilizáveis (header, footer, tour3D...)
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

## Diagrama do Banco de Dados

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

## Boas Práticas

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

## Problemas comuns

**`permission denied ... docker.sock`**: o usuário não está no grupo `docker`. Rode `sudo usermod -aG docker $USER` e saia e entre de novo na sessão.

**`env file ... .env not found`**: crie o arquivo com `cp .env.example .env`.

**Build falha em `next/font`** (`Cannot read properties of null (reading '1')`): o Google Fonts respondeu de forma inesperada durante o build. Tente novamente; se persistir, use a fonte localmente com `next/font/local`.

**`value is too long for the column's type`**: a coluna do MySQL é pequena demais. Adicione `@db.Text` ao campo no `schema.prisma` e rode `npx prisma db push`.

**`Nenhum usuário admin encontrado`**: rode `npm run setup-db` antes do `sync-notion`.

**Fotos não aparecem (quadro preto com o título):** rode o sync de novo. Se persistir, veja os avisos `⚠️` que ele imprime, que indicam qual arquivo falhou.

**O Notion retorna "object not found":** a conexão não foi adicionada ao banco (⋯ → Conexões) ou o ID do banco está errado.

**`Port 3000 is in use, trying 3001`:** a porta está ocupada, em geral pelo container do Docker. Use `http://localhost:3000` (Docker) ou pare o container com `docker compose stop app` para usar o servidor de desenvolvimento.

## Segurança

- Nunca versione o `.env`, tokens ou senhas.
- Use uma conexão do Notion com permissão apenas de leitura.
- Troque a senha padrão do administrador antes de colocar o site no ar.
- Não escreva senhas reais na documentação ou nos scripts.

## Contribuindo

1. Faça um **fork** do repositório e clone o seu fork.
2. Crie uma branch para a sua alteração: `git checkout -b minha-alteracao`.
3. Faça os commits e envie: `git push -u origin minha-alteracao`.
4. Abra um **Pull Request** para o repositório original.

## Futuras alterações

- Painel de administração mais completo (hoje o conteúdo do acervo e dos vídeos é gerenciado no Notion).
- Salvar no banco os campos `Créditos`, `Duração` e `Produção` dos vídeos.
- Integrar os modelos 3D (`.glb`) do Notion ao tour virtual.
- Novos jogos, usando os mesmos dados do acervo.

## Considerações finais

Caso precise adicionar novas funcionalidades ou fazer manutenção, siga os padrões estabelecidos e consulte a documentação do Next.js e do Tailwind CSS.

## Créditos

Projeto de extensão do Instituto Federal de Santa Catarina (IFSC) em parceria com o Museu Histórico de São José. Adicione aqui a equipe, os orientadores e a licença do projeto.