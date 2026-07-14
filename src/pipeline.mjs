import fs from "node:fs/promises";
import path from "node:path";
import { parseCsv, stringifyCsv } from "./lib/csv.mjs";
import { atomicWrite, readJson, writeJson } from "./lib/io.mjs";

export const TRACKING_HEADERS = [
  "group_id", "title", "status", "page_id", "page_url", "upload_ids",
  "attempts", "last_error", "updated_at", "notes"
];

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function contextFor(filename, messages, before = 2, after = 2) {
  const hits = [];
  messages.forEach((message, index) => {
    if ((message.attachments ?? []).includes(filename)) {
      hits.push({
        messageIndex: index,
        window: messages.slice(Math.max(0, index - before), index + after + 1)
      });
    }
  });
  return hits;
}

export async function enrichInventory({ inventoryPath, messagesPath, decisionsPath, outputPath }) {
  const inventory = parseCsv(await fs.readFile(inventoryPath, "utf8"));
  const messages = await readJson(messagesPath);
  const decisions = await readJson(decisionsPath);
  const byFilename = new Map(decisions.map((item) => [item.filename, item]));

  const records = inventory.map((item, index) => {
    const decision = byFilename.get(item.filename) ?? {};
    const hits = contextFor(item.filename, messages);
    const anchor = hits[0]?.window.find((message) => (message.attachments ?? []).includes(item.filename));
    return {
      filename: item.filename,
      source_order: index + 1,
      group_id: decision.group_id || `UNRESOLVED-${String(index + 1).padStart(3, "0")}`,
      discipline: decision.discipline || "Nao identificado",
      term: decision.term || "Nao identificado",
      assessment: decision.assessment || "Material nao classificado",
      reference_date: decision.reference_date || anchor?.timestamp?.slice(0, 10) || "",
      confidence: decision.confidence || "sem_evidencia",
      evidence: decision.evidence || "Nenhuma decisao curada foi fornecida.",
      context_hits: hits.length
    };
  });
  await writeJson(outputPath, { generated_at: new Date().toISOString(), records });
  return records;
}

export function classifyMaterial(assessment) {
  const value = normalize(assessment);
  if (/\b(prova|avaliacao|ap|af|n1|n2|n3|p1|p2|p3)\b/.test(value)) return "Prova Passada";
  if (/\b(lista|exercicio|atividade)\b/.test(value)) return "Atividade";
  if (/\b(anotacao|lousa|resumo)\b/.test(value)) return "Anotacoes";
  return "Material em Geral";
}

export async function prepareBatches({ enrichedPath, attachmentsDir, groupsPath, trackingPath }) {
  const { records } = await readJson(enrichedPath);
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.group_id) ?? {
      group_id: record.group_id,
      title: `${record.discipline} - ${record.assessment}`,
      discipline: record.discipline,
      term: record.term,
      assessment: record.assessment,
      reference_date: record.reference_date,
      material_type: classifyMaterial(record.assessment),
      confidence: record.confidence,
      low_confidence: !["alta", "media"].includes(normalize(record.confidence)),
      evidence: [],
      attachments: []
    };
    group.evidence.push(record.evidence);
    group.attachments.push({
      filename: record.filename,
      source_order: record.source_order,
      path: path.resolve(attachmentsDir, record.filename)
    });
    groups.set(record.group_id, group);
  }

  for (const group of groups.values()) {
    group.attachments.sort((a, b) => a.source_order - b.source_order);
    group.evidence = [...new Set(group.evidence)];
    for (const attachment of group.attachments) {
      await fs.access(attachment.path);
    }
  }

  const prepared = [...groups.values()];
  await writeJson(groupsPath, { generated_at: new Date().toISOString(), groups: prepared });
  let tracking = [];
  try {
    tracking = parseCsv(await fs.readFile(trackingPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const existing = new Map(tracking.map((record) => [record.group_id, record]));
  for (const group of prepared) {
    if (!existing.has(group.group_id)) {
      tracking.push({
        group_id: group.group_id,
        title: group.title,
        status: "prepared",
        page_id: "",
        page_url: "",
        upload_ids: "",
        attempts: "0",
        last_error: "",
        updated_at: new Date().toISOString(),
        notes: group.low_confidence ? "triagem_humana_obrigatoria" : ""
      });
    }
  }
  await atomicWrite(trackingPath, stringifyCsv(tracking, TRACKING_HEADERS));
  return prepared;
}
