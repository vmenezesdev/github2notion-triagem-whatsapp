#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichInventory, prepareBatches } from "./pipeline.mjs";
import { parseArgs, readJson, requireArgs, writeJson } from "./lib/io.mjs";
import { syncGroups } from "./sync.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [command = "help", ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

try {
  if (command === "demo") await demo();
  else if (command === "enrich") await enrich(args);
  else if (command === "prepare") await prepare(args);
  else if (command === "sync") await sync(args);
  else showHelp();
} catch (error) {
  process.stderr.write(`Erro: ${error.message}\n`);
  process.exitCode = 1;
}

async function enrich(options) {
  requireArgs(options, ["inventory", "messages", "decisions", "out"]);
  const records = await enrichInventory({
    inventoryPath: path.resolve(options.inventory),
    messagesPath: path.resolve(options.messages),
    decisionsPath: path.resolve(options.decisions),
    outputPath: path.resolve(options.out)
  });
  process.stdout.write(`Enriquecidos ${records.length} registros.\n`);
}

async function prepare(options) {
  requireArgs(options, ["enriched", "attachments", "groups", "tracking"]);
  const groups = await prepareBatches({
    enrichedPath: path.resolve(options.enriched),
    attachmentsDir: path.resolve(options.attachments),
    groupsPath: path.resolve(options.groups),
    trackingPath: path.resolve(options.tracking)
  });
  process.stdout.write(`Preparados ${groups.length} grupos.\n`);
}

async function sync(options) {
  requireArgs(options, ["groups", "tracking"]);
  const config = await readJson(path.resolve(options.config || path.join(root, "config.example.json")));
  const summary = await syncGroups({
    groupsPath: path.resolve(options.groups),
    trackingPath: path.resolve(options.tracking),
    config,
    apply: Boolean(options.apply)
  });
  if (options.summary) await writeJson(path.resolve(options.summary), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function demo() {
  const local = path.join(root, ".local", "demo");
  const enriched = path.join(local, "enriched.json");
  const groups = path.join(local, "groups.json");
  const tracking = path.join(local, "tracking.csv");
  await enrichInventory({
    inventoryPath: path.join(root, "examples", "inventory.synthetic.csv"),
    messagesPath: path.join(root, "examples", "messages.synthetic.json"),
    decisionsPath: path.join(root, "examples", "decisions.synthetic.json"),
    outputPath: enriched
  });
  await prepareBatches({
    enrichedPath: enriched,
    attachmentsDir: path.join(root, "examples", "fixtures"),
    groupsPath: groups,
    trackingPath: tracking
  });
  const summary = await syncGroups({
    groupsPath: groups,
    trackingPath: tracking,
    config: await readJson(path.join(root, "config.example.json")),
    apply: false
  });
  await writeJson(path.join(local, "summary.json"), summary);
  process.stdout.write(`Demo concluida em ${local}\n${JSON.stringify(summary, null, 2)}\n`);
}

function showHelp() {
  process.stdout.write(`Uso:\n  npm run demo\n  node src/cli.mjs enrich --inventory <csv> --messages <json> --decisions <json> --out <json>\n  node src/cli.mjs prepare --enriched <json> --attachments <dir> --groups <json> --tracking <csv>\n  node src/cli.mjs sync --groups <json> --tracking <csv> [--config <json>] [--summary <json>] [--apply]\n\nSem --apply, sync executa somente validacoes locais.\n`);
}
