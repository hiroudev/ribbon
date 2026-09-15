import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || chromium.executablePath(),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("../../work/qa", { recursive: true });
try {
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "サンプルからはじめる" }).click();
  await page.getByRole("heading", { name: "毎日のワークスペース" }).waitFor();
  await page.screenshot({
    path: "../../work/qa/dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await page.getByLabel("名前", { exact: true }).fill("テスト用ブックマーク");
  await page.getByLabel("URL", { exact: true }).fill("https://example.com/");
  await page.getByLabel("ひとことメモ").fill("動作確認用");
  await page.getByLabel("検索キーワード").fill("qa-example");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await page
    .getByRole("button", { name: /テスト用ブックマーク 動作確認用/ })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: /テスト用ブックマーク 動作確認用/ })
    .waitFor();
  await page.getByLabel("ブックマークを検索").fill("qa-example");
  assert.equal(await page.locator(".bookmark-card").count(), 1);
  await page.getByLabel("検索をクリア").click();
  await page
    .getByRole("button", { name: "ページをデザイン", exact: true })
    .click();
  await page.getByLabel("テスト用ブックマークのグループ").selectOption("daily");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("ribbon-data")).items.find(
        (i) => i.name === "テスト用ブックマーク",
      ).groupId === "daily",
  );
  await page
    .getByRole("button", { name: "毎日のワークスペースを編集", exact: true })
    .click();
  await page.getByLabel("グループの幅").selectOption("2");
  await page.getByLabel("表示形式").selectOption("list");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("ribbon-data")).groups[0].span === 2,
  );
  await page.getByRole("button", { name: "編集を完了", exact: true }).click();
  await page
    .getByRole("button", { name: "テーマとデザイン", exact: true })
    .click();
  await page.getByRole("button", { name: "Nord", exact: true }).click();
  await page.getByRole("button", { name: "テーマを適用", exact: true }).click();
  await page.getByText("テーマを適用しました", { exact: true }).waitFor();
  await page.screenshot({
    path: "../../work/qa/theme-settings.png",
    fullPage: true,
  });
  await page.getByLabel("閉じる", { exact: true }).click();
  assert.equal(
    await page
      .locator(".app")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--bg")),
    "#2E3440",
  );
  await page.screenshot({ path: "../../work/qa/nord.png", fullPage: true });
  await page
    .getByRole("button", { name: "テーマとデザイン", exact: true })
    .click();
  await page.getByRole("button", { name: "Ribbon Light", exact: true }).click();
  await page.getByRole("button", { name: "テーマを適用", exact: true }).click();
  await page.getByLabel("閉じる", { exact: true }).click();
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.screenshot({ path: "../../work/qa/narrow.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.goto("http://127.0.0.1:4173/popup.html");
  await page.getByLabel("ブックマークを検索").fill("タイトル");
  await page.getByRole("button", { name: /ページタイトルを確認/ }).waitFor();
  await page.getByLabel("ブックマークを検索").press("Enter");
  await page.getByRole("alert").waitFor();
  await page.screenshot({ path: "../../work/qa/popup.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: add, reload persistence, search, group move, layout, theme, responsive, popup and safe preview execution",
  );
} finally {
  await browser.close();
}
