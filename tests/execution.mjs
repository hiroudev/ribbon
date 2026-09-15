import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// The native permission bubble cannot be accepted in headless Chromium.
// Use a separate fixture with pre-granted hosts; never change the shipped manifest.
const root = path.resolve("../../work/execution-" + Date.now());
const extension = path.join(root, "extension");
await cp(path.resolve("dist"), extension, { recursive: true });
const manifest = JSON.parse(
  await readFile(path.join(extension, "manifest.json"), "utf8"),
);
manifest.host_permissions = manifest.optional_host_permissions;
delete manifest.optional_host_permissions;
await writeFile(
  path.join(extension, "manifest.json"),
  JSON.stringify(manifest),
);
const context = await chromium.launchPersistentContext(
  path.join(root, "profile"),
  {
    headless: true,
    executablePath: process.env.CHROME_PATH || chromium.executablePath(),
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const settings = await context.newPage();
  await settings.goto(`chrome://extensions/?id=${id}`);
  const toggle = settings.locator("#allow-user-scripts cr-toggle");
  await toggle.waitFor();
  if ((await toggle.getAttribute("aria-pressed")) === "false")
    await toggle.click();
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/index.html`);
  await page.getByRole("button", { name: "サンプルからはじめる" }).click();
  await page.getByRole("heading", { name: "毎日のワークスペース" }).waitFor();
  const target = await context.newPage();
  await target.goto("http://127.0.0.1:4173");
  const targetId = await page.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url === "http://127.0.0.1:4173/").id;
  });
  async function execute(code) {
    return page.evaluate(
      async ({ code, targetId }) => {
        const d = (await chrome.storage.local.get("data")).data;
        const item = d.items.find((i) => i.type === "script");
        item.value = code;
        const saved = await chrome.runtime.sendMessage({
          type: "SAVE",
          data: d,
        });
        if (!saved.ok) throw new Error(saved.error);
        return chrome.runtime.sendMessage({
          type: "RUN",
          id: item.id,
          tabId: targetId,
        });
      },
      { code, targetId },
    );
  }
  assert.equal(
    (await execute('document.body.dataset.ribbonTest="executed";')).ok,
    true,
  );
  assert.equal(
    await target.evaluate(() => document.body.dataset.ribbonTest),
    "executed",
  );
  for (const code of [
    'throw new Error("expected QA error")',
    '(async()=>{throw new Error("expected QA error")})()',
  ]) {
    const result = await execute(code);
    assert.equal(result.ok, false);
    assert.match(result.error, /expected QA error/);
  }
  assert.equal((await execute("const = ;")).ok, false);
  await target.close();
  assert.equal((await execute("document.title")).ok, false);
  console.log(
    "PASS: userScripts MAIN-world DOM mutation, sync/async/syntax errors, closed target (pre-granted test hosts)",
  );
} finally {
  await context.close();
}
