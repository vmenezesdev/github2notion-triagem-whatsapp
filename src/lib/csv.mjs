export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (!rows.length) return [];
  const [headers, ...values] = rows;
  return values
    .filter((cells) => cells.some((cell) => cell !== ""))
    .map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])));
}

export function stringifyCsv(records, headers = Object.keys(records[0] ?? {})) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `${[headers, ...records.map((record) => headers.map((header) => record[header] ?? ""))]
    .map((row) => row.map(escape).join(","))
    .join("\r\n")}\r\n`;
}
