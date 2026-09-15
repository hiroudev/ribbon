import { Data, initialData, validateData } from "./model";
export const isExtension =
  typeof chrome !== "undefined" && !!chrome.runtime?.id;
export async function readData(): Promise<Data> {
  const raw = isExtension
    ? (await chrome.storage.local.get("data")).data
    : JSON.parse(localStorage.getItem("ribbon-data") || "null");
  return raw ? validateData(raw) : initialData();
}
export async function saveData(d: Data): Promise<Data> {
  validateData(d);
  if (isExtension) {
    const r = await chrome.runtime.sendMessage({ type: "SAVE", data: d });
    if (!r.ok) throw new Error(r.error);
    return r.data;
  }
  const current = await readData();
  if (d.revision !== current.revision)
    throw new Error(
      "別の画面で変更されました。最新の内容を確認して再度操作してください。",
    );
  const next = { ...d, revision: d.revision + 1 };
  localStorage.setItem("ribbon-data", JSON.stringify(next));
  return next;
}
export async function runItem(id: string, tabId?: number) {
  if (!isExtension)
    throw new Error(
      "スクリプトの実行はChrome拡張として読み込んでから利用できます。",
    );
  const r = await chrome.runtime.sendMessage({ type: "RUN", id, tabId });
  if (!r.ok) throw new Error(r.error);
}
