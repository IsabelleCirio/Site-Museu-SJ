/**
 * src/app/media/[...path]/route.ts
 *
 * Serve os arquivos baixados pelo sync do Notion (imagens WebP e vídeos) a
 * partir do volume do Docker. Necessário porque o Next em produção só serve
 * arquivos que já estavam em public/ no momento do build.
 *
 * Funciona também com <Image> do next/image, já que a otimização busca a
 * imagem neste mesmo servidor.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MEDIA_DIR = path.resolve(
  process.env.MEDIA_DIR ?? path.join(process.cwd(), 'uploads', 'notion'),
);

const TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  // .mov só toca no Chrome se for H.264/AAC; o ideal é converter para .mp4.
  '.mov': 'video/mp4',
  '.webm': 'video/webm',
};

const notFound = () => new NextResponse('Não encontrado', { status: 404 });

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const file = path.resolve(MEDIA_DIR, ...params.path);

  // Impede sair da pasta de mídia (ex.: ../../.env)
  if (!file.startsWith(MEDIA_DIR + path.sep)) return notFound();

  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return notFound();

  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size === 0) return notFound(); // vazio = inválido
    size = info.size;
  } catch {
    return notFound();
  }

  const headers: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    // O nome do arquivo é um hash: foto trocada no Notion vira arquivo novo.
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  let start = 0;
  let end = size - 1;
  let status = 200;

  // Safari exige Range para tocar vídeo, e os demais navegadores usam para avançar.
  const range = req.headers.get('range');
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (match) {
    if (match[1]) {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]), end);
    } else if (match[2]) {
      start = Math.max(size - Number(match[2]), 0);
    }
    if (start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }

  headers['Content-Length'] = String(end - start + 1);

  const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
  return new NextResponse(stream, { status, headers });
}