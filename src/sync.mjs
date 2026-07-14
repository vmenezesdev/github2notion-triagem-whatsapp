import fs from "node:fs/promises";
import path from "node:path";
import { parseCsv, stringifyCsv } from "./lib/csv.mjs";
import { atomicWrite, readJson } from "./lib/io.mjs";
import { normalize, TRACKING_HEADERS } from "./pipeline.mjs";
import { NotionClient } from "./notion-client.mjs";

export async function syncGroups({ groupsPath, trackingPath, config, apply = false, env = process.env, client: providedClient }) {
  const { groups } = await readJson(groupsPath);
  const tracking = parseCsv(await fs.readFile(trackingPath, "utf8"));
  const byId = new Map(tracking.map((record) => [record.group_id, record]));
  const policy = config.policy;
  const notion = config.notion;
  const dataSourceId = env[notion.dataSourceIdEnv];
  const client = apply ? (providedClient ?? new NotionClient({
    token: env.NOTION_API_KEY,
    apiVersion: env.NOTION_API_VERSION || notion.apiVersion,
    maxAttempts: policy.maxAttempts,
    maxBackoffMs: policy.maxBackoffMs
  })) : undefined;

  if (apply && !dataSourceId) throw new Error(`${notion.dataSourceIdEnv} nao configurada.`);
  if (apply && groups.some((group) => !group.low_confidence) && !env[notion.disciplinesDataSourceIdEnv]) {
    throw new Error(`${notion.disciplinesDataSourceIdEnv} e obrigatoria quando existem grupos do fluxo padrao.`);
  }

  const disciplines = apply && env[notion.disciplinesDataSourceIdEnv]
    ? await client.queryDataSource(env[notion.disciplinesDataSourceIdEnv])
    : [];
  let consecutiveCause = "";
  let consecutiveFailures = 0;
  const summary = { mode: apply ? "apply" : "dry-run", verified: 0, reused: 0, created: 0, failed: 0, groups: [] };

  for (const group of groups) {
    const record = byId.get(group.group_id);
    if (!record) throw new Error(`Controle ausente para ${group.group_id}. Rode prepare primeiro.`);
    try {
      record.attempts = String(Number(record.attempts || 0) + 1);
      record.updated_at = new Date().toISOString();
      if (!apply) {
        validateGroup(group);
        const title = publicTitle(group, policy.lowConfidencePrefix);
        record.status = "dry_run_verified";
        record.notes = group.low_confidence ? "relacao_vazia;triagem_humana_obrigatoria" : "pronto_para_apply";
        summary.verified += 1;
        summary.groups.push({ group_id: group.group_id, action: "would_sync", title });
        await saveTracking(trackingPath, tracking);
        continue;
      }

      const disciplineId = group.low_confidence ? "" : exactDisciplineId(group.discipline, disciplines, notion.disciplineTitleProperty);
      const effectiveGroup = disciplineId || group.low_confidence
        ? group
        : {
            ...group,
            low_confidence: true,
            evidence: [...group.evidence, "Nenhuma correspondencia exata foi encontrada no catalogo de disciplinas."]
          };
      const title = publicTitle(effectiveGroup, policy.lowConfidencePrefix);
      record.status = "uploading";
      await saveTracking(trackingPath, tracking);
      const uploadIds = record.upload_ids ? record.upload_ids.split(";").filter(Boolean) : [];
      for (let index = uploadIds.length; index < group.attachments.length; index += 1) {
        uploadIds.push(await client.uploadFile(group.attachments[index].path));
        record.upload_ids = uploadIds.join(";");
        await saveTracking(trackingPath, tracking);
      }

      record.status = "creating_or_reusing";
      await saveTracking(trackingPath, tracking);
      const existing = await client.queryByTitle(dataSourceId, notion.properties.title, title);
      if (existing.length > 1) throw new Error(`Mais de uma pagina encontrada para a chave ${group.group_id}.`);
      let page = existing[0];
      if (page) summary.reused += 1;
      else {
        page = await client.createPage(pageBody({ group: effectiveGroup, title, uploadIds, disciplineId, dataSourceId, properties: notion.properties }));
        summary.created += 1;
      }
      record.page_id = page.id;
      record.page_url = page.url || "";
      record.status = "verifying";
      await saveTracking(trackingPath, tracking);
      const current = await client.getPage(page.id);
      const issues = verifyPage(current, { group: effectiveGroup, title, disciplineId, properties: notion.properties });
      if (issues.length) throw new Error(`Verificacao falhou: ${issues.join(", ")}`);
      record.status = effectiveGroup.low_confidence ? "verified_low_confidence" : "verified";
      record.last_error = "";
      record.notes = effectiveGroup.low_confidence ? "triagem_humana_obrigatoria" : "";
      summary.verified += 1;
      summary.groups.push({ group_id: group.group_id, action: existing[0] ? "reused" : "created", page_id: page.id });
      consecutiveCause = "";
      consecutiveFailures = 0;
    } catch (error) {
      record.status = "error";
      record.last_error = error.message;
      summary.failed += 1;
      summary.groups.push({ group_id: group.group_id, action: "failed", error: error.message });
      const cause = error.code || String(error.status || error.message).slice(0, 80);
      if (cause === consecutiveCause) consecutiveFailures += 1;
      else {
        consecutiveCause = cause;
        consecutiveFailures = 1;
      }
      await saveTracking(trackingPath, tracking);
      if (consecutiveFailures >= policy.sameCauseCircuitBreaker) break;
      continue;
    }
    await saveTracking(trackingPath, tracking);
  }
  return summary;
}

function publicTitle(group, prefix) {
  return `${group.low_confidence ? `${prefix} ` : ""}${group.title} - ${group.group_id}`;
}

function validateGroup(group) {
  if (!group.group_id || !group.title || !group.attachments?.length) throw new Error("Grupo incompleto.");
  if (group.low_confidence && !group.evidence?.length) throw new Error("Grupo de baixa confianca sem justificativa.");
}

function exactDisciplineId(localName, pages, titleProperty) {
  const matches = pages.filter((page) => normalize(pageTitle(page, titleProperty)) === normalize(localName));
  return matches.length === 1 ? matches[0].id : "";
}

function pageTitle(page, property) {
  return (page.properties?.[property]?.title ?? []).map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

function pageBody({ group, title, uploadIds, disciplineId, dataSourceId, properties }) {
  const relation = disciplineId ? [{ id: disciplineId }] : [];
  return {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties: {
      [properties.title]: { title: [{ text: { content: title } }] },
      [properties.files]: {
        files: uploadIds.map((id, index) => ({
          name: path.basename(group.attachments[index].path),
          type: "file_upload",
          file_upload: { id }
        }))
      },
      [properties.referenceDate]: { date: group.reference_date ? { start: group.reference_date } : null },
      [properties.disciplineRelation]: { relation },
      [properties.materialType]: { multi_select: [{ name: group.material_type }] },
      [properties.privacy]: { multi_select: [] }
    },
    children: group.low_confidence ? [{
      object: "block",
      type: "callout",
      callout: {
        icon: { type: "emoji", emoji: "⚠️" },
        rich_text: [{ type: "text", text: { content: `Triagem humana obrigatoria. Chave: ${group.group_id}. Evidencia: ${group.evidence.join(" | ").slice(0, 1500)}` } }]
      }
    }] : []
  };
}

function verifyPage(page, { group, title, disciplineId, properties }) {
  const issues = [];
  const props = page.properties ?? {};
  if (pageTitle(page, properties.title) !== title) issues.push("titulo");
  const names = (props[properties.files]?.files ?? []).map((file) => file.name);
  const expected = group.attachments.map((attachment) => path.basename(attachment.path));
  if (JSON.stringify(names) !== JSON.stringify(expected)) issues.push("arquivos_ou_ordem");
  const relations = (props[properties.disciplineRelation]?.relation ?? []).map((item) => item.id);
  if (disciplineId && !relations.includes(disciplineId)) issues.push("disciplina");
  if (!disciplineId && relations.length) issues.push("relacao_incerta_preenchida");
  const types = (props[properties.materialType]?.multi_select ?? []).map((item) => item.name);
  if (types.length !== 1 || types[0] !== group.material_type) issues.push("tipo");
  const date = props[properties.referenceDate]?.date?.start ?? "";
  if (date !== group.reference_date) issues.push("data");
  return issues;
}

async function saveTracking(filename, records) {
  await atomicWrite(filename, stringifyCsv(records, TRACKING_HEADERS));
}
