#!/usr/bin/env node
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PdfIdentityManifest } from "./pipeline";

export interface UploadObject {
  key: string;
  body: Uint8Array;
  contentType: string;
}

export interface PrivateObjectStore {
  exists(key: string): Promise<boolean>;
  put(object: UploadObject): Promise<void>;
}

export interface UploadResult {
  status: "dry-run" | "uploaded" | "exists";
  keys: string[];
}

export function assertDevelopmentBucket(bucket: string): void {
  if (bucket !== "chem-private-dev")
    throw new Error("P5 upload target must be exactly chem-private-dev.");
}

export async function uploadPair(input: {
  store?: PrivateObjectStore;
  dryRun: boolean;
  pdf: UploadObject;
  manifest: UploadObject;
}): Promise<UploadResult> {
  const keys = [input.pdf.key, input.manifest.key];
  if (input.dryRun) return { status: "dry-run", keys };
  if (!input.store)
    throw new Error("An object store is required outside dry-run mode.");
  const exists = await Promise.all(keys.map((key) => input.store!.exists(key)));
  if (exists.some(Boolean)) return { status: "exists", keys };
  await input.store.put(input.pdf);
  await input.store.put(input.manifest);
  return { status: "uploaded", keys };
}

class S3PrivateObjectStore implements PrivateObjectStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw new Error(`Unable to check object existence for ${key}.`);
    }
  }

  async put(object: UploadObject): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: object.key,
        Body: object.body,
        ContentType: object.contentType,
      }),
    );
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}.`);
  return value;
}

async function uploadFromManifest(
  manifestPath: string,
  dryRun: boolean,
  store?: PrivateObjectStore,
): Promise<UploadResult> {
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(
    manifestBytes.toString("utf8"),
  ) as PdfIdentityManifest;
  const pdfPath = path.resolve(process.cwd(), manifest.output.localPath);
  return uploadPair({
    store,
    dryRun,
    pdf: {
      key: manifest.output.objectKey,
      body: await readFile(pdfPath),
      contentType: "application/pdf",
    },
    manifest: {
      key: manifest.output.manifestObjectKey,
      body: manifestBytes,
      contentType: "application/json",
    },
  });
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const execute = arguments_.includes("--execute");
  const manifestPaths = arguments_.filter(
    (argument) => !argument.startsWith("--"),
  );
  if (manifestPaths.length === 0)
    throw new Error("Pass at least one generated manifest path.");

  let store: PrivateObjectStore | undefined;
  if (execute) {
    const bucket = requiredEnvironment("R2_PRIVATE_BUCKET");
    assertDevelopmentBucket(bucket);
    const accountId = requiredEnvironment("R2_ACCOUNT_ID");
    store = new S3PrivateObjectStore(
      new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
          secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
        },
      }),
      bucket,
    );
  }

  for (const manifestPath of manifestPaths) {
    const result = await uploadFromManifest(manifestPath, !execute, store);
    console.log(`${result.status}: ${result.keys.join(", ")}`);
    if (result.status === "exists") process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
