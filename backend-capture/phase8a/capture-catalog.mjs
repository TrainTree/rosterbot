import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const projectRef = "rithmbggiiusrmdcqrif";
const root = new URL("./", import.meta.url);
const queryDir = new URL("./introspection/", root);
const outputDir = new URL("./catalog/", root);
const allQueryFiles = [
  "object-inventory.sql",
  "table-details.sql",
  "function-details.sql",
  "privilege-details.sql",
  "column-privileges.sql",
  "default-privileges.sql",
  "write-path-search.sql",
  "schema-role-details.sql",
  "automation-inventory.sql",
];
const requestedFiles = process.argv.slice(2);
const queryFiles = requestedFiles.length ? requestedFiles : allQueryFiles;
for (const queryFile of queryFiles) {
  if (!allQueryFiles.includes(queryFile)) {
    throw new Error(`Query is not allowlisted: ${queryFile}`);
  }
}

const token = (await readFile(join(homedir(), ".supabase", "access-token"), "utf8")).trim();
if (!token) throw new Error("Supabase CLI access token is unavailable");

await mkdir(outputDir, { recursive: true });

for (const queryFile of queryFiles) {
  const query = await readFile(new URL(queryFile, queryDir), "utf8");
  if (!/^\s*(select|with)\b/i.test(query)) {
    throw new Error(`Refusing non-SELECT catalog query: ${queryFile}`);
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${queryFile}: HTTP ${response.status}: ${responseText}`);
  }

  const parsed = JSON.parse(responseText);
  const outputFile = new URL(queryFile.replace(/\.sql$/, ".json"), outputDir);
  await writeFile(outputFile, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${queryFile}: ${parsed.length} catalog row(s)\n`);
}
