import type { Product } from "../types";

interface D1Response<T> { success: boolean; errors?: Array<{ message?: string }>; result?: Array<{ results?: T[]; success?: boolean }>; }

function d1Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  return accountId && databaseId && token ? { accountId, databaseId, token } : null;
}

async function queryD1<T>(sql: string, params: Array<string | number | null> = []): Promise<T[]> {
  const config = d1Config();
  if (!config) return [];
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`, {
    method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql, params: params.map((param) => param === null ? null : String(param)) }), cache: "no-store",
  });
  const payload = await response.json() as D1Response<T>;
  if (!response.ok || !payload.success || payload.result?.[0]?.success === false) throw new Error(payload.errors?.[0]?.message ?? `d1_http_${response.status}`);
  return payload.result?.[0]?.results ?? [];
}

export async function getD1Catalogue(): Promise<Product[] | null> {
  if (!d1Config()) return null;
  try {
    const rows = await queryD1<{ payload: string }>("select payload from catalogue_products order by updated_at desc");
    return rows.flatMap((row) => { try { const value = JSON.parse(row.payload) as Product; return value.images?.length ? [value] : []; } catch { return []; } });
  } catch (error) {
    console.error("[d1] catalogue_read_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return null;
  }
}

export async function syncD1Catalogue(products: Product[]): Promise<void> {
  if (!d1Config()) throw new Error("Cloudflare D1 is not configured");
  await queryD1("delete from catalogue_products");
  for (const product of products) {
    await queryD1("insert into catalogue_products (id, payload, updated_at) values (?, ?, ?) on conflict(id) do update set payload=excluded.payload, updated_at=excluded.updated_at", [product.id, JSON.stringify(product), new Date().toISOString()]);
  }
}
