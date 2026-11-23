
import { notion } from "./notion";

export async function getNotionAcervo() {
  const databaseId = process.env.NOTION_ACERVO_DATABASE_ID;

  if (!databaseId) {
    throw new Error("ID do banco de acervo não configurado.");
  }

  const database = await notion.databases.retrieve({
    database_id: databaseId,
  });

  if (
    !("data_sources" in database) ||
    database.data_sources.length === 0
  ) {
    throw new Error("Fonte de dados do acervo não encontrada.");
  }

  const dataSourceId = database.data_sources[0].id;

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });

  const results = [...response.results];
  let nextCursor = response.next_cursor;

  while (nextCursor) {
    const nextResponse = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: nextCursor,
    });

    results.push(...nextResponse.results);
    nextCursor = nextResponse.next_cursor;
  }

  return results;
}
