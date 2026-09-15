import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || chromium.executablePath(),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "サンプルからはじめる" }).click();
  await page.getByRole("heading", { name: "毎日のワークスペース" }).waitFor();
  await page
    .getByRole("button", { name: "テーマとデザイン", exact: true })
    .click();
  await page.getByLabel("アクセント", { exact: false }).fill("#347856");
  await page.getByLabel("カスタムテーマ名").fill("Forest QA");
  await page.getByRole("button", { name: "保存して適用", exact: true }).click();
  await page.getByText("テーマを適用しました", { exact: true }).waitFor();
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ribbon-data")),
  );
  assert.equal(data.themes[0].colors.accent, "#347856");
  assert.equal(data.themes[0].name, "Forest QA");
  await page.getByRole("button", { name: "ページ", exact: true }).click();
  await page
    .getByLabel("ページタイトル", { exact: true })
    .fill("My creative corner");
  await page.getByLabel("コレクションの列数").selectOption("2");
  await page.getByRole("button", { name: "ページ設定を保存" }).click();
  await page.getByText("ページを保存しました", { exact: true }).waitFor();
  await page.getByRole("button", { name: "キー", exact: true }).click();
  await page
    .getByLabel("直接実行 30", { exact: true })
    .selectOption(data.items[0].id);
  await page.waitForFunction(
    (id) => JSON.parse(localStorage.getItem("ribbon-data")).slots[29] === id,
    data.items[0].id,
  );
  await page.getByRole("button", { name: "データ・権限", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "JSONを書き出す", exact: true })
    .click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /ribbon-backup/);
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ribbon-data")),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await page.getByRole("alert").waitFor();
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem("ribbon-data"))),
    data,
  );
  await page.getByLabel("エラーを閉じる").click();
  const backup = structuredClone(data);
  backup.settings.title = "Restored workspace";
  await page.locator("input[type=file]").setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "置き換えて読み込む" }).click();
  await page.getByRole("heading", { name: "Restored workspace" }).waitFor();
  await page
    .getByRole("button", { name: "ページをデザイン", exact: true })
    .click();
  const source = page
    .locator(".bookmark-card")
    .filter({ has: page.locator("strong", { hasText: "Gmail" }) });
  const destination = page
    .locator(".collection")
    .filter({ has: page.getByRole("heading", { name: "つくる・学ぶ" }) });
  await page.setViewportSize({ width: 1440, height: 2000 });
  await source
    .locator(".item-controls > svg")
    .dragTo(destination.locator(".collection-head"));
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("ribbon-data")).items.find(
        (i) => i.name === "Gmail",
      ).groupId === "development",
  );
  await page.getByRole("button", { name: "編集を完了", exact: true }).click();
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await page.getByLabel("名前", { exact: true }).fill("Unsafe URL");
  await page.getByLabel("URL", { exact: true }).fill("javascript:alert(1)");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "http://" }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.getByLabel("閉じる", { exact: true }).click();
  await page.reload();
  await page.getByRole("heading", { name: "Restored workspace" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: custom colors, custom theme, page design, slot 30, export, invalid import protection, confirmed restore, drag between groups, unsafe URL validation",
  );
} finally {
  await browser.close();
}
