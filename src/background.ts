import { validateData, validURL } from "./model";
import { readData } from "./storage";
import { executionCode } from "./script";
let saves = Promise.resolve();
async function report(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await chrome.storage.local.set({ lastError: message });
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#B64235" });
  return message;
}
async function run(id: string, tabId?: number) {
  const d = await readData();
  const item = d.items.find((i) => i.id === id);
  if (!item)
    throw new Error("このショートカットに項目が割り当てられていません。");
  if (item.type === "url") {
    if (!validURL(item.value)) throw new Error("URLが不正です。");
    await chrome.tabs.create({ url: item.value });
    return;
  }
  if (!Number.isInteger(tabId))
    throw new Error("実行対象のタブを選択してください。");
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId!);
  } catch {
    throw new Error("実行対象のタブが閉じられました。再選択してください。");
  }
  if (
    !tab.url ||
    !validURL(tab.url) ||
    /^https:\/\/(chromewebstore.google.com|chrome.google.com\/webstore)/.test(
      tab.url,
    )
  )
    throw new Error(
      "このページではスクリプトを実行できません。通常のWebページを選択してください。",
    );
  const parsed = new URL(tab.url);
  const origin = parsed.protocol + "//" + parsed.hostname + "/*";
  if (!(await chrome.permissions.contains({ origins: [origin] })))
    throw new Error(
      "このサイトへのアクセス権がありません。設定の「データ・権限」から許可してください。",
    );
  try {
    await chrome.userScripts.getScripts();
  } catch {
    throw new Error(
      "Chromeの拡張機能詳細で「ユーザースクリプトを許可」をオンにしてください。",
    );
  }
  const results = await chrome.userScripts.execute({
    target: { tabId: tabId!, frameIds: [0] },
    world: "MAIN",
    js: [{ code: executionCode(item.value) }],
  });
  const failure = results.find((r) => r.error);
  if (failure) throw new Error(String(failure.error));
  const result = results[0]?.result as
    { ribbonOk?: boolean; error?: string } | undefined;
  if (!result?.ribbonOk)
    throw new Error(
      result?.error ||
        "実行結果を確認できませんでした。対象ページの制限を確認してください。",
    );
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL(""))
  )
    return false;
  if (message.type === "SAVE") {
    saves = saves.then(async () => {
      try {
        const data = validateData(message.data);
        const current = await readData();
        if (data.revision !== current.revision)
          throw new Error(
            "別の画面で変更されました。最新の内容を確認して再度操作してください。",
          );
        const next = { ...data, revision: current.revision + 1 };
        await chrome.storage.local.set({ data: next });
        respond({ ok: true, data: next });
      } catch (e) {
        respond({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
    return true;
  }
  if (message.type === "RUN") {
    run(message.id, message.tabId)
      .then(async () => {
        await chrome.action.setBadgeText({ text: "" });
        await chrome.storage.local.remove("lastError");
        respond({ ok: true });
      })
      .catch(async (e) => respond({ ok: false, error: await report(e) }));
    return true;
  }
  return false;
});
chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
    const match = /^slot-(\d+)$/.exec(command);
    if (!match) return;
    const d = await readData();
    const id = d.slots[Number(match[1]) - 1];
    if (!id)
      throw new Error(`直接実行 ${match[1]} に項目を割り当ててください。`);
    const active =
      tab?.id ??
      (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]
        ?.id;
    await run(id, active);
    await chrome.action.setBadgeText({ text: "" });
    await chrome.storage.local.remove("lastError");
  } catch (e) {
    await report(e);
  }
});
