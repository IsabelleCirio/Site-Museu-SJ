/**
 * scripts/sync-notion.ts
 *
 * Sincroniza os bancos do Notion (acervo e vídeos) com o banco Prisma do site.
 * Substitui o fluxo "CSV -> import-acervo.ts": a fonte passa a ser o Notion.
 *
 * Uso:
 *   npm run sync-notion              # acervo + vídeos
 *   npm run sync-notion -- acervo    # só o acervo
 *   npm run sync-notion -- videos    # só os vídeos
 *   npm run sync-notion -- --force   # baixa as imagens de novo
 *   npm run sync-notion -- --clean-legacy
 *       # desativa registros antigos (importados do CSV) que não existem no Notion
 *
 * Variáveis (.env): NOTION_TOKEN, NOTION_ACERVO_DATABASE_ID,
 * NOTION_VIDEOS_DATABASE_ID e, opcionalmente, MEDIA_DIR
 * (padrão: ./uploads/notion, que fica no volume uploads_data do Docker).
 *
 * Imagens e vídeos baixados são servidos pela rota /media/* do Next
 * (src/app/media/[...path]/route.ts).
 *
 * Requer `notionId String? @unique` nos models Acervo e VideoEspecial.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client, collectPaginatedAPI, isFullPage } from '@notionhq/client';
import { PrismaClient } from '@prisma/client';
import convert from 'heic-convert';
import sharp from 'sharp';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const prisma = new PrismaClient();

const FORCE = process.argv.includes('--force');
const CLEAN_LEGACY = process.argv.includes('--clean-legacy');
const TARGET = process.argv.slice(2).find((a) => !a.startsWith('--'));

const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? path.join(process.cwd(), 'uploads', 'notion'));
const IMG_DIR = path.join(MEDIA_DIR, 'acervo');
const VIDEO_DIR = path.join(MEDIA_DIR, 'videos');
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|tiff?|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

// ---------- nomes das colunas no Notion ----------
// Acervo: iguais aos cabeçalhos do CSV que você já usava.
const ACERVO = {
  nome: 'Nome',
  acervo: 'Acervo',
  add: 'Add',
  arquivos: 'Arquivos e mídia',
  colecao: 'Coleção',
  contexto: 'Contexto Historico',
  dataProducao: 'Data de Produção',
  dimensoes: 'Dimensões',
  doador: 'Doador',
  estado: 'Estado de Conservação',
  local: 'Local de Origem',
  material: 'Material',
  inventario: 'Nº de Inventário',
  periodo: 'Período/Época',
  tecnica: 'Técnica',
} as const;

// Vídeos: colunas do banco "Metadados - vídeos".
// "Tipo" e "Ordem" são opcionais: se a coluna não existir, usa 'especial' e a
// ordem da lista. Créditos, Créditos adicionais, Duração e Produção ainda não
// são salvos porque o model VideoEspecial não tem campos para eles.
const VIDEOS = {
  titulo: 'Nome',
  descricao: 'Descrição',
  tipo: 'Tipo',
  arquivo: 'Arquivos e mídia', // arquivo anexado (preferido)
  url: 'URL', // usado só se não houver arquivo anexado
  ordem: 'Ordem',
  ativo: 'Add',
} as const;

// ---------- leitura de propriedades do Notion ----------
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

function getProp(props: Record<string, any>, name: string): any {
  if (props[name]) return props[name];
  const target = norm(name);
  const key = Object.keys(props).find((k) => norm(k) === target);
  return key ? props[key] : undefined;
}

const plain = (arr: any[] = []) => arr.map((t) => t.plain_text).join('');

function readText(prop: any): string | null {
  if (!prop) return null;
  let value: string | null | undefined;
  switch (prop.type) {
    case 'title':
      value = plain(prop.title);
      break;
    case 'rich_text':
      value = plain(prop.rich_text);
      break;
    case 'select':
      value = prop.select?.name;
      break;
    case 'status':
      value = prop.status?.name;
      break;
    case 'multi_select':
      value = prop.multi_select.map((s: any) => s.name).join(', ');
      break;
    case 'number':
      value = prop.number?.toString();
      break;
    case 'url':
      value = prop.url;
      break;
    case 'date':
      value = prop.date?.start;
      break;
    default:
      value = null;
  }
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readBool(prop: any): boolean {
  if (!prop) return true;
  if (prop.type === 'checkbox') return prop.checkbox;
  const text = readText(prop);
  if (!text) return true;
  return !['no', 'não', 'nao', 'false'].includes(norm(text));
}

function readNumber(prop: any): number | null {
  if (!prop) return null;
  if (prop.type === 'number') return prop.number;
  const n = Number(readText(prop));
  return Number.isFinite(n) ? n : null;
}

function readFiles(prop: any): { name: string; url: string }[] {
  if (!prop || prop.type !== 'files') return [];
  return prop.files.map((f: any) => ({
    name: f.name as string,
    url: (f.type === 'file' ? f.file.url : f.external.url) as string,
  }));
}

// ---------- parsers (mesmos do import-acervo.ts) ----------
function parseLocalOrigem(text: string | null) {
  const empty = { cidadeOrigem: null, estadoOrigem: null, paisOrigem: null };
  if (!text) return empty;
  const cleaned = text.trim();
  if (cleaned.toLowerCase() === 'brasil') {
    return { cidadeOrigem: null, estadoOrigem: null, paisOrigem: 'Brasil' };
  }
  const parts = cleaned.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return empty;
  if (parts.length === 1) {
    return { cidadeOrigem: parts[0], estadoOrigem: null, paisOrigem: 'Brasil' };
  }
  return {
    cidadeOrigem: parts[0] || null,
    estadoOrigem: parts[1] || null,
    paisOrigem: parts[2] || 'Brasil',
  };
}

function parseDimensoes(text: string | null) {
  if (!text) return { altura: null, largura: null, profundidade: null };
  const pick = (re: RegExp) => text.match(re)?.[1]?.trim() ?? null;
  const altura = pick(/altura\s*[:\-]?\s*([^,;]+)/i);
  const largura = pick(/largura\s*[:\-]?\s*([^,;]+)/i);
  const profundidade = pick(/profundidade\s*[:\-]?\s*([^,;]+)/i);
  if (!altura && !largura && !profundidade) {
    return { altura: text, largura: null, profundidade: null };
  }
  return { altura, largura, profundidade };
}

// ---------- arquivos ----------
// Arquivo vazio (0 bytes) conta como inexistente: será baixado de novo.
const exists = (file: string) =>
  stat(file).then(
    (info) => info.size > 0,
    () => false,
  );

// O caminho da URL do Notion muda quando o arquivo é trocado, e a assinatura
// (?X-Amz-...) muda a cada consulta. Por isso o hash usa só o caminho: foto
// nova = nome novo; foto igual = reaproveita o arquivo já baixado.
const hashOf = (url: string) =>
  createHash('sha1').update(new URL(url).pathname).digest('hex').slice(0, 12);

// Mostra a causa real de erros genéricos como "fetch failed" (DNS, timeout...).
function errMsg(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as any).cause;
  return cause ? `${err.message} (${cause.code ?? cause.message ?? cause})` : err.message;
}

// Baixa com timeout e até 3 tentativas.
async function download(url: string, timeoutMs = 120_000): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw lastErr;
}

// Converte para WebP gravando em arquivo temporário, para nunca deixar um
// arquivo vazio ou pela metade no destino se a conversão falhar.
async function toWebp(input: Buffer, dest: string) {
  const tmp = `${dest}.part`;
  try {
    try {
      await sharp(input).rotate().webp({ quality: 82 }).toFile(tmp);
    } catch {
      // Foto de iPhone (HEIC) com outra extensão: converte para JPEG e tenta de novo.
      const jpeg = Buffer.from(await convert({ buffer: input as any, format: 'JPEG', quality: 0.92 }));
      await sharp(jpeg).rotate().webp({ quality: 82 }).toFile(tmp);
    }
    await rename(tmp, dest);
  } finally {
    await rm(tmp, { force: true });
  }
}

async function saveImage(url: string): Promise<string> {
  const fileName = `${hashOf(url)}.webp`;
  const dest = path.join(IMG_DIR, fileName);
  if (FORCE || !(await exists(dest))) {
    const res = await download(url);
    let input = Buffer.from(await res.arrayBuffer());
    // O sharp não decodifica HEIC/HEIF (fotos de iPhone): converte antes para JPEG.
    if (/\.hei[cf]$/i.test(new URL(url).pathname)) {
      input = Buffer.from(await convert({ buffer: input as any, format: 'JPEG', quality: 0.92 }));
    }
    await toWebp(input, dest);
  }
  return `/media/acervo/${fileName}`;
}

async function saveVideo(url: string, name: string): Promise<string> {
  const safe = path.basename(name).replace(/[^\w.\-]+/g, '_');
  const fileName = `${hashOf(url)}-${safe}`;
  const dest = path.join(VIDEO_DIR, fileName);
  if (FORCE || !(await exists(dest))) {
    const res = await download(url, 15 * 60_000);
    if (!res.body) throw new Error('resposta sem corpo');
    // Grava em arquivo temporário: se a conexão cair, não fica vídeo pela metade.
    const tmp = `${dest}.part`;
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(tmp));
    await rename(tmp, dest);
  }
  return `/media/videos/${fileName}`;
}

async function resolveVideo(filesProp: any, urlProp: any): Promise<string | null> {
  // 1) arquivo anexado no Notion: baixa e serve por /media/videos
  const file = readFiles(filesProp).find((f) => VIDEO_EXT.test(new URL(f.url).pathname));
  if (file) return saveVideo(file.url, file.name);

  // 2) coluna URL: link externo (YouTube, Vimeo...) ou nome de arquivo em public/videos
  const text = readText(urlProp);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text; // YouTube, Vimeo, etc.
  return `/videos/${path.basename(text)}`; // arquivo já existente em public/videos
}

// ---------- Notion ----------
async function fetchPages(databaseId: string) {
  const db: any = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId: string | undefined = db.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error(`Fonte de dados não encontrada (${databaseId}).`);

  const results = await collectPaginatedAPI(notion.dataSources.query, {
    data_source_id: dataSourceId,
    sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
  });
  return results.filter(isFullPage);
}

async function getAdminId(): Promise<number> {
  const admin = await prisma.usuario.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('Nenhum usuário admin encontrado. Rode antes: npm run setup-db');
  return admin.id;
}

// ---------- acervo ----------
async function syncAcervo(adminId: number) {
  const databaseId = process.env.NOTION_ACERVO_DATABASE_ID;
  if (!databaseId) throw new Error('NOTION_ACERVO_DATABASE_ID não configurado.');

  console.log('🖼️  Lendo acervo no Notion...');
  const pages = await fetchPages(databaseId);
  if (pages.length === 0) {
    throw new Error('Nenhuma peça retornada; abortando para não desativar o acervo.');
  }
  await mkdir(IMG_DIR, { recursive: true });

  const seen: string[] = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, page] of pages.entries()) {
    const p = page.properties as Record<string, any>;
    const prop = (key: keyof typeof ACERVO) => getProp(p, ACERVO[key]);

    try {
      const titulo = readText(prop('nome'));
      if (!titulo) {
        skipped++;
        continue;
      }

      const imagens = new Set<string>();
      for (const file of readFiles(prop('arquivos'))) {
        if (!IMAGE_EXT.test(new URL(file.url).pathname)) {
          console.warn(`  ⚠️ arquivo ignorado em "${titulo}" (formato não suportado): ${file.name}`);
          continue;
        }
        try {
          imagens.add(await saveImage(file.url));
        } catch (err) {
          console.warn(`  ⚠️ imagem de "${titulo}" falhou:`, errMsg(err));
        }
      }
      const lista = [...imagens];
      const imagem = lista[0] ?? null;

      const { cidadeOrigem, estadoOrigem, paisOrigem } = parseLocalOrigem(readText(prop('local')));
      const { altura, largura, profundidade } = parseDimensoes(readText(prop('dimensoes')));

      // Campos que não vêm do Notion (descricao, artista, localizacao, formaAquisicao)
      // ficam de fora de propósito: o sync não apaga o que já existir neles.
      const data = {
        titulo,
        nome: titulo,
        imagem,
        imagemCapa: imagem,
        ordem: index + 1,
        colecao: readText(prop('colecao')),
        tags: readText(prop('acervo')),
        ativo: readBool(prop('add')),
        usuarioId: adminId,
        numeroInventario: readText(prop('inventario')),
        periodo: readText(prop('periodo')),
        dataProducao: readText(prop('dataProducao')),
        material: readText(prop('material')),
        tecnica: readText(prop('tecnica')),
        altura,
        largura,
        profundidade,
        cidadeOrigem,
        estadoOrigem,
        paisOrigem,
        contextoHistorico: readText(prop('contexto')),
        doador: readText(prop('doador')),
        estadoConservacao: readText(prop('estado')),
      };

      // Peça antiga (importada do CSV) com o mesmo nº de inventário: adota o
      // registro existente em vez de duplicar, mantendo o mesmo id.
      // Só adota se esta página do Notion ainda não tem registro (evita conflito
      // quando o nº de inventário se repete).
      if (data.numeroInventario) {
        const already = await prisma.acervo.findUnique({ where: { notionId: page.id } });
        if (!already) {
          const legacy = await prisma.acervo.findFirst({
            where: { numeroInventario: data.numeroInventario, notionId: null },
          });
          if (legacy) {
            await prisma.acervo.update({ where: { id: legacy.id }, data: { notionId: page.id } });
          }
        }
      }

      const acervo = await prisma.acervo.upsert({
        where: { notionId: page.id },
        update: data,
        create: { ...data, notionId: page.id },
      });

      await prisma.acervoMidia.deleteMany({ where: { acervoId: acervo.id } });
      if (lista.length > 0) {
        await prisma.acervoMidia.createMany({
          data: lista.map((url, i) => ({
            acervoId: acervo.id,
            tipo: 'imagem',
            url,
            ordem: i + 1,
          })),
        });
      }

      seen.push(page.id);
      ok++;
    } catch (err) {
      failed++;
      seen.push(page.id); // falhou, mas continua no Notion: não pode ser desativada
      console.error(`  ❌ página ${page.id}:`, errMsg(err));
    }
  }

  // Peças removidas do Notion ficam inativas (não são apagadas do banco).
  const off = await prisma.acervo.updateMany({
    where: { notionId: { not: null, notIn: seen } },
    data: { ativo: false },
  });

  let legacyOff = 0;
  if (CLEAN_LEGACY && failed === 0) {
    legacyOff = (await prisma.acervo.updateMany({ where: { notionId: null }, data: { ativo: false } })).count;
  }

  console.log(
    `✅ Acervo: ${ok} sincronizadas, ${skipped} sem nome, ${failed} com erro, ${off.count} desativadas` +
      (CLEAN_LEGACY ? `, ${legacyOff} antigas desativadas.` : '.'),
  );
}

// ---------- vídeos ----------
async function syncVideos(adminId: number) {
  const databaseId = process.env.NOTION_VIDEOS_DATABASE_ID;
  if (!databaseId) throw new Error('NOTION_VIDEOS_DATABASE_ID não configurado.');

  console.log('🎥 Lendo vídeos no Notion...');
  const pages = await fetchPages(databaseId);
  if (pages.length === 0) {
    throw new Error('Nenhum vídeo retornado; abortando para não desativar os vídeos.');
  }
  await mkdir(VIDEO_DIR, { recursive: true });

  const seen: string[] = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, page] of pages.entries()) {
    const p = page.properties as Record<string, any>;
    const prop = (key: keyof typeof VIDEOS) => getProp(p, VIDEOS[key]);

    try {
      const titulo = readText(prop('titulo'));
      const video = await resolveVideo(prop('arquivo'), prop('url'));
      if (!titulo || !video) {
        skipped++;
        continue;
      }

      const data = {
        titulo,
        descricao: readText(prop('descricao')) ?? '',
        tipo: readText(prop('tipo')) ?? 'especial',
        video,
        ordem: readNumber(prop('ordem')) ?? index + 1,
        ativo: readBool(prop('ativo')),
        usuarioId: adminId,
      };

      await prisma.videoEspecial.upsert({
        where: { notionId: page.id },
        update: data,
        create: { ...data, notionId: page.id },
      });

      seen.push(page.id);
      ok++;
    } catch (err) {
      failed++;
      seen.push(page.id); // falhou, mas continua no Notion: não pode ser desativada
      console.error(`  ❌ página ${page.id}:`, errMsg(err));
    }
  }

  const off = await prisma.videoEspecial.updateMany({
    where: { notionId: { not: null, notIn: seen } },
    data: { ativo: false },
  });

  let legacyOff = 0;
  if (CLEAN_LEGACY && failed === 0) {
    legacyOff = (await prisma.videoEspecial.updateMany({ where: { notionId: null }, data: { ativo: false } })).count;
  }

  console.log(
    `✅ Vídeos: ${ok} sincronizados, ${skipped} incompletos, ${failed} com erro, ${off.count} desativados` +
      (CLEAN_LEGACY ? `, ${legacyOff} antigos desativados.` : '.'),
  );
}

// ---------- principal ----------
async function main() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN não configurado.');
  const adminId = await getAdminId();
  if (!TARGET || TARGET === 'acervo') await syncAcervo(adminId);
  if (!TARGET || TARGET === 'videos') await syncVideos(adminId);
}

main()
  .catch((err) => {
    console.error('❌ Erro na sincronização:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());