import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  starterData,
  validateData,
  removeGroup,
  removeItem,
  normalizeScript,
  searchItems,
  reorder,
  contrast,
  validateItem,
} from "../src/model";
import { executionCode } from "../src/script";
import { runInNewContext } from "node:vm";
test("empty and starter backups round-trip without losing order, scripts or settings", () => {
  for (const d of [initialData(), starterData()])
    assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))), d);
});
test("reject unsafe URL protocols, dangling groups/slots and unsupported versions", () => {
  const base = starterData();
  for (const mutation of [
    (d: any) => (d.items[0].value = "javascript:alert(1)"),
    (d: any) => (d.items[0].groupId = "missing"),
    (d: any) => (d.slots[0] = "missing"),
    (d: any) => (d.version = 2),
    (d: any) => (d.settings.themeId = "missing"),
    (d: any) => (d.groups[0].color = "red"),
    (d: any) => d.groups.push(d.groups[0]),
    (d: any) => d.slots.pop(),
  ]) {
    const d = structuredClone(base);
    mutation(d);
    assert.throws(() => validateData(d));
    assert.deepEqual(base, validateData(base));
  }
});
test("delete group preserves its bookmarks and moves to ungrouped", () => {
  const d = starterData();
  const next = removeGroup(d, "daily");
  assert.equal(next.items.length, d.items.length);
  assert.ok(
    next.items
      .filter((i) => d.items.find((x) => x.id === i.id)?.groupId === "daily")
      .every((i) => i.groupId === ""),
  );
  validateData(next);
});
test("delete bookmark clears all shortcut slots referring to it", () => {
  const d = starterData();
  d.slots[0] = d.slots[29] = d.items[0].id;
  const next = removeItem(d, d.items[0].id);
  assert.equal(next.slots[0], null);
  assert.equal(next.slots[29], null);
  validateData(next);
});
test("bookmarklets accept raw and encoded JavaScript without corrupting raw percent escapes", () => {
  assert.equal(
    normalizeScript("javascript:alert(%22hello%22)"),
    'alert("hello")',
  );
  assert.equal(normalizeScript('const x="%20";'), 'const x="%20";');
  assert.throws(() => normalizeScript("javascript:"));
  assert.throws(() => validateItem({ ...starterData().items[0], name: " " }));
});
test("search supports Japanese and keyword ranking with multiple terms", () => {
  const d = starterData();
  assert.equal(searchItems(d.items, "タイトル")[0].keyword, "title");
  assert.equal(
    searchItems(d.items, "web リファレンス")[0].name,
    "MDN Web Docs",
  );
  assert.equal(searchItems(d.items, "unknown").length, 0);
});
test("reorder preserves membership and supports moving down", () => {
  const d = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    reorder(d, "c", "a").map((x) => x.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    reorder(d, "a", "c").map((x) => x.id),
    ["b", "a", "c"],
  );
  assert.equal(contrast("#000000", "#FFFFFF"), 21);
});
test("execution wrapper catches syntax, synchronous and awaited async errors", async () => {
  assert.throws(() => executionCode("const = ;"));
  const success = await runInNewContext(executionCode("globalThis.test = 1;"));
  assert.equal(success.ribbonOk, true);
  for (const code of [
    'throw new Error("sync");',
    '(async()=>{throw new Error("async")})()',
  ]) {
    const result = await runInNewContext(executionCode(code));
    assert.equal(result.ribbonOk, false);
    assert.match(result.error, /sync/);
  }
});
