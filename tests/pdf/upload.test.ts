import { describe, expect, it, vi } from "vitest";

import {
  assertDevelopmentBucket,
  uploadPair,
  type PrivateObjectStore,
} from "../../scripts/generate-pdf/upload";

const pdf = {
  key: "pdf/lesson/v1/hash.pdf",
  body: new Uint8Array([1]),
  contentType: "application/pdf",
};
const manifest = {
  key: "pdf/lesson/v1/hash.manifest.json",
  body: new Uint8Array([2]),
  contentType: "application/json",
};

describe("guarded development upload", () => {
  it("performs no cloud calls in dry-run mode", async () => {
    const store: PrivateObjectStore = { exists: vi.fn(), put: vi.fn() };
    await expect(
      uploadPair({ store, dryRun: true, pdf, manifest }),
    ).resolves.toMatchObject({ status: "dry-run" });
    expect(store.exists).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("does not overwrite when either object already exists", async () => {
    const store: PrivateObjectStore = {
      exists: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      put: vi.fn(),
    };
    await expect(
      uploadPair({ store, dryRun: false, pdf, manifest }),
    ).resolves.toMatchObject({ status: "exists" });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("uploads only the PDF and its identity manifest when neither exists", async () => {
    const store: PrivateObjectStore = {
      exists: vi.fn().mockResolvedValue(false),
      put: vi.fn(),
    };
    await expect(
      uploadPair({ store, dryRun: false, pdf, manifest }),
    ).resolves.toMatchObject({ status: "uploaded" });
    expect(store.put).toHaveBeenCalledTimes(2);
    expect(store.put).toHaveBeenNthCalledWith(1, pdf);
    expect(store.put).toHaveBeenNthCalledWith(2, manifest);
  });

  it("accepts only the development private bucket", () => {
    expect(() => assertDevelopmentBucket("chem-private-dev")).not.toThrow();
    expect(() => assertDevelopmentBucket("chem-private")).toThrow(
      "exactly chem-private-dev",
    );
  });
});
