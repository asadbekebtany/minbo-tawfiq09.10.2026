import { getLocalUploadRoot, publicUploadUrl } from "@/lib/upload-dir";

export type StoredFile = {
  url: string;
  key: string;
};

export interface StorageProvider {
  name: string;
  save(input: {
    bytes: Buffer;
    mime: string;
    folder: string;
    filename: string;
  }): Promise<StoredFile>;
}

export class LocalDiskStorageProvider implements StorageProvider {
  name = "local";

  async save(input: {
    bytes: Buffer;
    mime: string;
    folder: string;
    filename: string;
  }): Promise<StoredFile> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = getLocalUploadRoot();
    const dir = path.join(root, input.folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, input.filename), input.bytes);
    const key = `${input.folder}/${input.filename}`;
    return { url: publicUploadUrl(key), key };
  }
}

let current: StorageProvider = new LocalDiskStorageProvider();

export function getStorageProvider(): StorageProvider {
  const requested = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();
  if (requested !== "local" && current.name === "local") {
    console.warn(
      `STORAGE_PROVIDER=${requested} hali implementatsiya qilinmagan. Local disk ishlatiladi.`,
    );
  }
  return current;
}

export function setStorageProvider(provider: StorageProvider) {
  current = provider;
}
