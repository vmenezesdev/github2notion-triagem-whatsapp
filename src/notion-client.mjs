import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_API_VERSION = "2026-03-11";

export class NotionClient {
  constructor({ token, apiVersion = DEFAULT_API_VERSION, fetchImpl = fetch, sleep = defaultSleep, random = Math.random, maxAttempts = 6, maxBackoffMs = 30_000 }) {
    if (!token) throw new Error("NOTION_API_KEY nao configurada.");
    this.token = token;
    this.apiVersion = apiVersion;
    this.fetch = fetchImpl;
    this.sleep = sleep;
    this.random = random;
    this.maxAttempts = maxAttempts;
    this.maxBackoffMs = maxBackoffMs;
  }

  async request(pathname, { method = "GET", body } = {}) {
    return this.withRetry(async () => {
      const response = await this.fetch(`https://api.notion.com${pathname}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": this.apiVersion,
          ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      return parseResponse(response);
    });
  }

  async withRetry(operation) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!error.retryable || attempt === this.maxAttempts) throw error;
        const retryAfter = Number(error.retryAfter || 0) * 1_000;
        const exponential = Math.min(this.maxBackoffMs, 500 * (2 ** (attempt - 1)));
        const jitter = Math.floor(exponential * 0.25 * this.random());
        await this.sleep(Math.max(retryAfter, exponential + jitter));
      }
    }
    throw lastError;
  }

  async queryDataSource(dataSourceId, body = {}) {
    const results = [];
    let cursor;
    do {
      const page = await this.request(`/v1/data_sources/${dataSourceId}/query`, {
        method: "POST",
        body: { ...body, ...(cursor ? { start_cursor: cursor } : {}) }
      });
      results.push(...page.results);
      cursor = page.has_more ? page.next_cursor : undefined;
    } while (cursor);
    return results;
  }

  queryByTitle(dataSourceId, titleProperty, title) {
    return this.queryDataSource(dataSourceId, {
      page_size: 10,
      filter: { property: titleProperty, title: { equals: title } }
    });
  }

  getPage(pageId) {
    return this.request(`/v1/pages/${pageId}`);
  }

  createPage(body) {
    return this.request("/v1/pages", { method: "POST", body });
  }

  async uploadFile(filename) {
    const name = path.basename(filename);
    const contentType = mimeType(name);
    const upload = await this.request("/v1/file_uploads", {
      method: "POST",
      body: { mode: "single_part", filename: name, content_type: contentType }
    });
    const bytes = await fs.readFile(filename);
    await this.withRetry(async () => {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: contentType }), name);
      const response = await this.fetch(`https://api.notion.com/v1/file_uploads/${upload.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": this.apiVersion
        },
        body: form
      });
      return parseResponse(response);
    });
    return upload.id;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (response.ok) return payload;
  const error = new Error(payload.message || `Notion API respondeu ${response.status}.`);
  error.status = response.status;
  error.code = payload.code;
  error.retryAfter = response.headers.get("retry-after");
  error.retryable = response.status === 429 || response.status >= 500;
  throw error;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return ({
    ".txt": "text/plain",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  })[extension] ?? "application/octet-stream";
}
