import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, stringifyCsv } from "../src/lib/csv.mjs";

test("CSV preserva virgulas, aspas e quebras de linha", () => {
  const records = [{ id: "G001", note: "linha 1, \"citacao\"\nlinha 2" }];
  assert.deepEqual(parseCsv(stringifyCsv(records, ["id", "note"])), records);
});
