import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export function readJsonFile<T>(fileName: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) return structuredClone(fallback);
    const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    return value;
  } catch {
    return structuredClone(fallback);
  }
}

export function writeJsonFile<T>(fileName: string, value: T): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, fileName);
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporary, target);
}
