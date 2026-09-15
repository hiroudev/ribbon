import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import path from "node:path";
const extension = path.resolve("dist");
const context = await chromium.launchPersistentContext(
  path.resolve("../../work/extension-test-profile-" + Date.now()),
  {
    headless: true,
    executablePath: process.env.CHROME_PATH || chromium.executablePath(),
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 1440, height: 1000 },
  },
);
try {
  const sw =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(sw.url()).host;
  console.log("EXTENSION", id);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${id}/index.html`);
  await page.getByRole("button", { name: "サンプルからはじめる" }).click();
  await page.getByRole("heading", { name: "毎日のワークスペース" }).waitFor();
  const commands = await page.evaluate(() => chrome.commands.getAll());
  assert.equal(commands.length, 31);
  const data = await page.evaluate(
    async () => (await chrome.storage.local.get("data")).data,
  );
  assert.equal(data.items.length, 9);
  await page.reload();
  await page.getByRole("heading", { name: "毎日のワークスペース" }).waitFor();
  const stale = await page.evaluate(async () => {
    const d = (await chrome.storage.local.get("data")).data;
    const first = await chrome.runtime.sendMessage({ type: "SAVE", data: d });
    const second = await chrome.runtime.sendMessage({ type: "SAVE", data: d });
    return { first, second };
  });
  assert.equal(stale.first.ok, true);
  assert.equal(stale.second.ok, false);
  const script = data.items.find((i) => i.type === "script");
  const forbidden = await page.evaluate(
    async ({ id }) =>
      chrome.runtime.sendMessage({
        type: "RUN",
        id,
        tabId: (await chrome.tabs.getCurrent()).id,
      }),
    { id: script.id },
  );
  assert.equal(forbidden.ok, false);
  assert.match(forbidden.error, /このページ/);
  const target = await context.newPage();
  await target.goto("http://127.0.0.1:4173");
  const targetId = await page.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url === "http://127.0.0.1:4173/").id;
  });
  const missing = await page.evaluate(
    async ({ id, tabId }) =>
      chrome.runtime.sendMessage({ type: "RUN", id, tabId }),
    { id: script.id, tabId: targetId },
  );
  assert.equal(missing.ok, false);
  assert.match(missing.error, /アクセス権/);
  const settings = await context.newPage();
  await settings.goto(`chrome://extensions/?id=${id}`);
  await settings.screenshot({
    path: "../../work/qa/chrome-extension-details.png",
  });
  console.log("SETTINGS", await settings.locator("body").innerText());
  console.log(
    "PASS: extension loads, 31 commands, persisted storage, concurrent save conflict, prohibited target, missing host permissions",
  );
  assert.deepEqual(errors, []);
} finally {
  await context.close();
}
