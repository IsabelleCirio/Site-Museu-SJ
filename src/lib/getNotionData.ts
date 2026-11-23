
import { notion } from "./notion";

export async function getNotionData() {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID não configurado.");
  }

  // Busca as informações do banco de dados
  const database = await notion.databases.retrieve({
    database_id: databaseId,
  });

  // Identifica a fonte de dados do banco
  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error("Nenhuma fonte de dados encontrada.");
  }

  const dataSourceId = database.data_sources[0].id;

  // Consulta os registros
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
  });

  return response.results;
}
