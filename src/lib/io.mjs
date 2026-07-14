import fs from "node:fs/promises";
import path from "node:path";

export async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, "utf8"));
}

export async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await atomicWrite(filename, `${JSON.stringify(value, null, 2)}\n`);
}

export async function atomicWrite(filename, content) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, filename);
}

export function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }
    const [rawKey, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) result[rawKey] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) result[rawKey] = argv[++i];
    else result[rawKey] = true;
  }
  return result;
}

export function requireArgs(args, names) {
  const missing = names.filter((name) => !args[name]);
  if (missing.length) throw new Error(`Argumentos obrigatorios ausentes: ${missing.map((name) => `--${name}`).join(", ")}`);
}
