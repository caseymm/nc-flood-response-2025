import { readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url =
  "https://docs.google.com/spreadsheets/d/11aiflZi5aZl-udztLQ-dyzeXBNG03AVBzKGl-h6j-eA/gviz/tq?tqx=out:json&gid=1013354488";

const outputPath = `${__dirname}/../public/sheetData.json`;
const w3wPath = `${__dirname}/../public/w3w.json`;

async function fetchSheet() {
  try {
    const res = await fetch(url);
    const text = await res.text();

    const match = text.match(
      /google\.visualization\.Query\.setResponse\(([\s\S]+)\);/
    );
    if (!match) throw new Error("Unexpected format");

    const json = JSON.parse(match[1]);
    const rows = json.table.rows;
    const cols = json.table.cols.map((col) => {
      const label = col.label;
      return label.startsWith("ID") ? "ID" : label;
    });

    const parsed = rows.map((row) =>
      Object.fromEntries(
        row.c.map((cell, i) => {
          const key = cols[i];
          let value = cell?.v ?? null;
          if (
            key === "ID" &&
            typeof value === "string" &&
            value.startsWith("///")
          ) {
            value = value.slice(3);
          }
          if (key === "Urgency" && typeof value === "string") {
            value = value[0];
          }
          return [key, value];
        })
      )
    );

    return parsed;
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

async function loadW3wData(path) {
  const file = await readFile(path, "utf-8");
  return JSON.parse(file);
}

async function main() {
  try {
    const [sheetData, w3wData] = await Promise.all([
      fetchSheet(),
      loadW3wData(w3wPath),
    ]);

    await writeFile(outputPath, JSON.stringify(sheetData, null, 2));
    console.log(`✅ Fetched sheet data saved to ${outputPath}`);

    const editableW3w = JSON.parse(JSON.stringify(w3wData));

    const sheetDataIds = sheetData.map((row) => row.ID);
    await Promise.all(
      sheetDataIds.map(async (id, idx) => {
        if (!w3wData.find((obj) => obj.ID === id)) {
          // go get the coords
          console.log(id);
          const res = await fetch(`https://what3words.com/${id}`);
          const text = await res.text();
          const match = text.match(
            /<meta property="og:image"\s+content="[^"]*lat=([-\d.]+)&amp;lng=([-\d.]+)&amp;/
          );

          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            console.log(`📍 ${id} → lat: ${lat}, lng: ${lng}`);

            // Now you can add this to editableW3w or do whatever you need
            editableW3w.push({ ID: id, lat, lng });
          } else {
            console.warn(`❓ Could not extract coordinates for ${id}`);
          }
        }
      })
    );
    await writeFile(w3wPath, JSON.stringify(editableW3w, null, 2));
    console.log(`✅ Fetched sheet data saved to ${w3wPath}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();
