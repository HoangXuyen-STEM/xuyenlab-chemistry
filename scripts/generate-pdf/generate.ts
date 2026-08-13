#!/usr/bin/env node
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import {
  classifyExistingPlan,
  createLessonPlan,
  stableJson,
  type LessonPlan,
} from "./pipeline";

const repositoryRoot = process.cwd();
const port = Number(process.env.PDF_PREVIEW_PORT ?? "3105");
const suppliedBaseUrl = process.env.PDF_PREVIEW_BASE_URL;
const baseUrl = suppliedBaseUrl ?? `http://127.0.0.1:${port}`;

function validateContent(): void {
  const result = spawnSync(
    "python3",
    ["scripts/validate-content/validate.py", "--json"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Content validation failed:\n${result.stdout}${result.stderr}`,
    );
  process.stdout.write(result.stdout);
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for production server at ${url}.`);
}

async function startProductionServer(): Promise<ChildProcess | undefined> {
  if (suppliedBaseUrl) return undefined;
  const server = spawn(
    process.execPath,
    [
      path.join(repositoryRoot, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: repositoryRoot,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  await waitForServer(baseUrl);
  return server;
}

async function generate(
  plan: LessonPlan,
  page: import("playwright").Page,
): Promise<void> {
  const startedAt = Date.now();
  await mkdir(path.dirname(plan.pdfAbsolutePath), { recursive: true });
  await mkdir(path.dirname(plan.metricsAbsolutePath), { recursive: true });
  const temporaryPath = `${plan.pdfAbsolutePath}.tmp`;
  await rm(temporaryPath, { force: true });
  const response = await page.goto(`${baseUrl}${plan.fixturePath}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok())
    throw new Error(
      `Fixture failed (${response?.status() ?? "no response"}): ${plan.fixturePath}`,
    );
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: temporaryPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await rename(temporaryPath, plan.pdfAbsolutePath);
  await writeFile(plan.manifestAbsolutePath, stableJson(plan.identity), "utf8");
  const { size } = await import("node:fs/promises").then(({ stat }) =>
    stat(plan.pdfAbsolutePath),
  );
  await writeFile(
    plan.metricsAbsolutePath,
    stableJson({
      lessonSlug: plan.identity.lesson.slug,
      contentHash: plan.identity.canonical.sha256,
      durationMs: Date.now() - startedAt,
      pdfBytes: size,
    }),
    "utf8",
  );
  console.log(
    `generated ${plan.identity.output.objectKey} (${size} bytes, ${Date.now() - startedAt} ms)`,
  );
}

async function main(): Promise<void> {
  validateContent();
  const pilot = JSON.parse(
    await import("node:fs/promises").then(({ readFile }) =>
      readFile("content/pilot-staging-manifest.json", "utf8"),
    ),
  ) as {
    lessons: Array<{ mdxPath: string; slug: string; topic: string }>;
  };
  const plans = await Promise.all(
    pilot.lessons.map((lesson) =>
      createLessonPlan({
        repositoryRoot,
        canonicalPath: lesson.mdxPath,
        expectedSlug: lesson.slug,
        topic: lesson.topic,
      }),
    ),
  );
  const states = await Promise.all(plans.map(classifyExistingPlan));
  for (const [index, state] of states.entries()) {
    if (state === "unchanged")
      console.log(`unchanged ${plans[index].identity.output.objectKey}`);
  }
  const pending = plans.filter((_, index) => states[index] === "generate");
  if (pending.length === 0) return;

  const server = await startProductionServer();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    for (const plan of pending) await generate(plan, page);
  } finally {
    await browser?.close();
    server?.kill("SIGTERM");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
