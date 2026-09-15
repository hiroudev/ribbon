import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
  CSSProperties,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Check,
  X,
  Settings,
  Palette as PaletteIcon,
  Keyboard,
  Download,
  Upload,
  LayoutGrid,
  Star,
  Zap,
  Bookmark,
  Folder,
  Inbox,
  Coffee,
  Sparkles,
  Code,
  Globe,
  BookOpen,
  Briefcase,
  Heart,
  Music,
  Camera,
  GripVertical,
  Pencil,
  Trash2,
  ExternalLink,
  PanelLeft,
  Link,
  Shield,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import {
  Data,
  Group,
  Item,
  Theme,
  Palette,
  initialData,
  starterData,
  themes,
  ungrouped,
  uid,
  validateItem,
  validateData,
  removeItem,
  removeGroup,
  searchItems,
  reorder,
  contrast,
  validURL,
} from "./model";
import { isExtension, readData, saveData, runItem } from "./storage";
import "./style.css";
const icons = {
  Folder,
  Inbox,
  Coffee,
  Sparkles,
  Code,
  Globe,
  BookOpen,
  Briefcase,
  Heart,
  Music,
  Camera,
  Zap,
  Bookmark,
};
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const C = icons[name as keyof typeof icons] || Folder;
  return <C size={size} />;
}
const colors = [
  "#C66A48",
  "#8B78BD",
  "#598E7C",
  "#5686B7",
  "#C38343",
  "#C46E8D",
  "#64748B",
  "#6267C4",
];
const popup = location.pathname.endsWith("popup.html");
const appURL = (path: string) =>
  isExtension ? chrome.runtime.getURL(path) : new URL(path, location.href).href;
function openDashboard() {
  if (isExtension) chrome.tabs.create({ url: appURL("index.html") });
  else window.open(appURL("index.html"), "_blank", "noopener");
}
function App() {
  const [data, setData] = useState<Data | null>(null),
    [loadError, setLoadError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [kind, setKind] = useState("all"),
    [editLayout, setEditLayout] = useState(false),
    [modal, setModal] = useState<
      | null
      | { type: "item"; item: Item }
      | { type: "group"; group: Group }
      | { type: "settings"; tab: string }
      | { type: "import"; data: Data }
    >(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]),
    [target, setTarget] = useState<number | undefined>(),
    [selected, setSelected] = useState(0),
    [commands, setCommands] = useState<chrome.commands.Command[]>([]),
    [busy, setBusy] = useState(false);
  const search = useRef<HTMLInputElement>(null),
    file = useRef<HTMLInputElement>(null),
    timer = useRef<ReturnType<typeof setTimeout>>(),
    drag = useRef<{ type: "group" | "item"; id: string } | null>(null),
    dataRef = useRef(data),
    saveQueue = useRef(Promise.resolve(true));
  const notify = (s: string) => {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4000);
  };
  useEffect(() => {
    readData()
      .then((d) => {
        setData(d);
        dataRef.current = d;
      })
      .catch((e) => setLoadError(e.message));
    if (isExtension) {
      chrome.tabs.query({ currentWindow: true }).then((ts) => {
        setTabs(ts.filter((t) => !!t.url && validURL(t.url)));
        if (popup) setTarget(ts.find((t) => t.active)?.id);
      });
      chrome.commands.getAll().then(setCommands);
      chrome.storage.local
        .get("lastError")
        .then((r) => r.lastError && setError(String(r.lastError)));
    }
    const change = () =>
      readData()
        .then((d) => {
          setData(d);
          dataRef.current = d;
        })
        .catch((e) => setError(e.message));
    if (isExtension) chrome.storage.onChanged.addListener(change);
    else window.addEventListener("storage", change);
    return () => {
      clearTimeout(timer.current);
      if (isExtension) chrome.storage.onChanged.removeListener(change);
      else window.removeEventListener("storage", change);
    };
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    setSelected(0);
  }, [query, filter, kind]);
  function update(fn: (d: Data) => Data) {
    saveQueue.current = saveQueue.current
      .then(async () => {
        const before = dataRef.current;
        if (!before) return false;
        try {
          const next = await saveData(fn(structuredClone(before)));
          dataRef.current = next;
          setData(next);
          return true;
        } catch (e) {
          setError((e as Error).message);
          const fresh = await readData();
          dataRef.current = fresh;
          setData(fresh);
          return false;
        }
      })
      .catch((e) => {
        setError(String(e));
        return false;
      });
    return saveQueue.current;
  }
  if (loadError)
    return (
      <div className="fatal">
        <h1>データを読み込めませんでした</h1>
        <p>{loadError}</p>
        <p>既存データは変更されていません。</p>
        <button onClick={() => location.reload()}>再読み込み</button>
      </div>
    );
  if (!data) return <div className="loading">Ribbon を開いています…</div>;
  const d = data;
  const allThemes = [...themes, ...d.themes],
    theme = allThemes.find((t) => t.id === d.settings.themeId) || themes[0];
  const vars = {
    ...Object.fromEntries(
      Object.entries(theme.colors).map(([k, v]) => ["--" + k, v]),
    ),
    "--accent-ink":
      contrast(theme.colors.accent, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#162330",
  } as CSSProperties;
  const matches = searchItems(d.items, query).filter(
    (i) =>
      (filter === "all" ||
        (filter === "favorites" && i.favorite) ||
        filter === i.groupId) &&
      (kind === "all" || kind === i.type),
  );
  const visibleGroups = [
    ...d.groups,
    ...(d.items.some((i) => !i.groupId) || filter === "" ? [ungrouped] : []),
  ]
    .filter(
      (g) => filter === "all" || filter === "favorites" || filter === g.id,
    )
    .filter(
      (g) =>
        (!query && kind === "all" && filter !== "favorites") ||
        matches.some((i) => i.groupId === g.id),
    );
  const makeItem = (
    groupId = filter !== "all" && filter !== "favorites" ? filter : "",
  ) =>
    setModal({
      type: "item",
      item: {
        id: uid(),
        name: "",
        value: "",
        description: "",
        keyword: "",
        type: "url",
        groupId,
        favorite: false,
        icon: "",
      },
    });
  const makeGroup = () =>
    setModal({
      type: "group",
      group: {
        ...ungrouped,
        id: uid(),
        name: "",
        description: "",
        color: colors[d.groups.length % colors.length],
        icon: "Folder",
      },
    });
  const execute = async (item: Item) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!isExtension && item.type === "url")
        window.open(item.value, "_blank", "noopener,noreferrer");
      else await runItem(item.id, target);
      setError("");
      notify(item.type === "url" ? "新しいタブで開きました" : "実行しました");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const addCurrent = async () => {
    if (!isExtension) {
      notify("現在のページの登録は拡張機能から利用できます");
      return;
    }
    const tab = popup
      ? await chrome.tabs.get(target!)
      : tabs.find((t) => t.id === target);
    if (!tab?.url || !validURL(tab.url)) {
      setError("登録する閲覧タブを選択してください。");
      return;
    }
    setModal({
      type: "item",
      item: {
        id: uid(),
        name: tab.title || tab.url,
        value: tab.url,
        type: "url",
        description: "",
        groupId: "",
        keyword: "",
        favorite: false,
        icon: "",
      },
    });
  };
  const deleteItem = (item: Item) => {
    if (confirm(`「${item.name}」を削除しますか？`))
      void update((d) => removeItem(d, item.id));
  };
  const moveItem = (id: string, gid: string) =>
    void update((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, groupId: gid } : i)),
    }));
  const drop = (g: Group, before?: string) => {
    const source = drag.current;
    drag.current = null;
    if (!source) return;
    if (source.type === "group" && g.id)
      void update((d) => ({
        ...d,
        groups: reorder(d.groups, source.id, g.id),
      }));
    else if (source.type === "item")
      void update((d) => ({
        ...d,
        items: before
          ? reorder(
              d.items.map((i) =>
                i.id === source.id ? { ...i, groupId: g.id } : i,
              ),
              source.id,
              before,
            )
          : [
              ...d.items.filter((i) => i.id !== source.id),
              ...d.items
                .filter((i) => i.id === source.id)
                .map((i) => ({ ...i, groupId: g.id })),
            ],
      }));
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(d, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ribbon-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify("バックアップを書き出しました");
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try {
      if (f.size > 10 * 1024 * 1024)
        throw new Error("バックアップは10MB以下にしてください。");
      setModal({
        type: "import",
        data: validateData(JSON.parse(await f.text())),
      });
    } catch (e) {
      setError((e as Error).message);
    }
    if (file.current) file.current.value = "";
  };
  const keynav = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(matches.length - 1, s + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    }
    if (e.key === "Enter" && matches[selected]) {
      e.preventDefault();
      void execute(matches[selected]);
    }
    if (e.key === "Escape" && popup) window.close();
  };
  return (
    <div
      className={`${popup ? "popup" : "app"} ${d.settings.density}`}
      style={vars}
    >
      {!popup && (
        <aside className="sidebar">
          <a className="brand" href={appURL("index.html")}>
            <img src="./icons/icon128.png" alt="" />
            <span>
              ribbon<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="workspace-label">
            PERSONAL SPACE<span>ローカル</span>
          </div>
          <nav>
            <button
              className={filter === "all" ? "nav active" : "nav"}
              onClick={() => setFilter("all")}
            >
              <LayoutGrid size={18} />
              すべてのブックマーク<span>{d.items.length}</span>
            </button>
            <button
              className={filter === "favorites" ? "nav active" : "nav"}
              onClick={() => setFilter("favorites")}
            >
              <Star size={18} />
              お気に入り<span>{d.items.filter((i) => i.favorite).length}</span>
            </button>
          </nav>
          <div className="nav-label">
            コレクション
            <button
              className="icon-btn"
              aria-label="グループを追加"
              onClick={makeGroup}
            >
              <Plus size={16} />
            </button>
          </div>
          <nav className="group-nav">
            {[...d.groups, ungrouped].map((g) => (
              <button
                key={g.id}
                className={filter === g.id ? "nav active" : "nav"}
                onClick={() => setFilter(g.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(g);
                }}
              >
                <span style={{ color: g.color }}>
                  <Icon name={g.icon} />
                </span>
                {g.name}
                <span>{d.items.filter((i) => i.groupId === g.id).length}</span>
              </button>
            ))}
          </nav>
          <button className="subtle add-collection" onClick={makeGroup}>
            <Plus size={16} />
            コレクションをつくる
          </button>
          <div className="sidebar-bottom">
            <div className="shortcut-tip">
              <Keyboard size={19} />
              <div>
                ひらめきを、すぐそばに。
                <small>検索して、すばやくアクセス。</small>
              </div>
              <kbd>Ctrl K</kbd>
            </div>
            <button
              className="nav"
              onClick={() => setModal({ type: "settings", tab: "themes" })}
            >
              <PaletteIcon size={18} />
              テーマとデザイン
            </button>
            <button
              className="nav"
              onClick={() => setModal({ type: "settings", tab: "shortcuts" })}
            >
              <Settings size={18} />
              設定とショートカット
            </button>
            <div className="local-status">
              <span />
              このブラウザに保存されています
            </div>
          </div>
        </aside>
      )}
      <main>
        {popup ? (
          <header className="popup-head">
            <div className="mini-brand">
              <img src="./icons/icon48.png" alt="" />
              ribbon.
            </div>
            <button className="subtle" onClick={openDashboard}>
              ワークスペースを開く
              <ArrowUpRight size={16} />
            </button>
          </header>
        ) : (
          <header className="topbar">
            <span>
              <PanelLeft size={17} />
              マイライブラリ
              <ChevronRight size={14} />
              <strong>
                {filter === "all"
                  ? "すべてのブックマーク"
                  : filter === "favorites"
                    ? "お気に入り"
                    : [...d.groups, ungrouped].find((g) => g.id === filter)
                        ?.name}
              </strong>
            </span>
            <div>
              <span className="private-label">
                <Shield size={14} />
                プライベート
              </span>
              <button
                className="icon-btn"
                aria-label="設定"
                onClick={() => setModal({ type: "settings", tab: "shortcuts" })}
              >
                <Settings size={18} />
              </button>
            </div>
          </header>
        )}
        <div className="content">
          <section className="toolbar">
            <div className="searchbox">
              <Search size={18} />
              <input
                ref={search}
                autoFocus={popup}
                placeholder="名前・キーワードで検索…"
                aria-label="ブックマークを検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={keynav}
              />
              {query ? (
                <button
                  className="icon-btn"
                  aria-label="検索をクリア"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>{popup ? "↵" : "Ctrl K"}</kbd>
              )}
            </div>
            {!popup && (
              <>
                <button
                  className={`button ${editLayout ? "selected" : ""}`}
                  onClick={() => setEditLayout(!editLayout)}
                >
                  <LayoutGrid size={16} />
                  {editLayout ? "編集を完了" : "ページをデザイン"}
                </button>
                <button className="button primary" onClick={() => makeItem()}>
                  <Plus size={17} />
                  追加する
                </button>
              </>
            )}
          </section>
          <div className="filter-row">
            <div className="tabs">
              {[
                ["all", "すべて"],
                ["url", "ブックマーク"],
                ["script", "アクション"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={kind === id ? "chosen" : ""}
                  onClick={() => setKind(id)}
                >
                  {id === "script" && <Zap size={13} />} {label}
                </button>
              ))}
            </div>
            <span className="small-muted">
              {matches.length} 件{!popup && "のアイテム"}
            </span>
          </div>
          {editLayout && !popup && (
            <div className="design-banner">
              <div>
                <GripVertical size={20} />
                <span>
                  <strong>あなたらしく、並べよう。</strong>
                  <small>
                    グループとカードをドラッグして配置。各グループの編集から色・幅・表示形式を変更できます。
                  </small>
                </span>
              </div>
              <button
                className="button"
                onClick={() => setModal({ type: "settings", tab: "page" })}
              >
                ページ設定
              </button>
            </div>
          )}
          {!popup && d.items.some((i) => i.type === "script") && (
            <div className="target-row">
              <Zap size={14} />
              <label htmlFor="target">アクションの実行先</label>
              <select
                id="target"
                value={target ?? ""}
                onChange={(e) =>
                  setTarget(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">閲覧タブを選択してください</option>
                {tabs.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title || t.url}
                  </option>
                ))}
              </select>
              <button
                className="subtle"
                onClick={() => {
                  if (isExtension)
                    chrome.tabs
                      .query({ currentWindow: true })
                      .then((ts) =>
                        setTabs(ts.filter((t) => !!t.url && validURL(t.url))),
                      );
                }}
              >
                更新
              </button>
            </div>
          )}
          {popup ? (
            <>
              <div className="quick-results" role="list">
                {matches.map((i, index) => (
                  <button
                    className={`quick-item ${index === selected ? "focused" : ""}`}
                    key={i.id}
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => void execute(i)}
                    disabled={busy}
                  >
                    <ItemMark
                      item={i}
                      color={
                        d.groups.find((g) => g.id === i.groupId)?.color ||
                        colors[0]
                      }
                    />
                    <span>
                      <strong>{i.name}</strong>
                      <small>
                        {d.groups.find((g) => g.id === i.groupId)?.name ||
                          "未分類"}{" "}
                        · {i.type === "script" ? "アクション" : domain(i.value)}
                      </small>
                    </span>
                    {i.keyword && <kbd>{i.keyword}</kbd>}
                    {i.type === "script" ? (
                      <Zap size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </button>
                ))}
                {!matches.length && (
                  <div className="empty compact-empty">
                    <Search />
                    <h3>
                      {d.items.length
                        ? "見つかりませんでした"
                        : "お気に入りの場所を、ここに。"}
                    </h3>
                    <p>ワークスペースから登録できます。</p>
                    <button className="button" onClick={openDashboard}>
                      ワークスペースを開く
                    </button>
                  </div>
                )}
              </div>
              <footer className="popup-footer">
                <span>↑ ↓ 選択　↵ 開く</span>
                <button className="subtle" onClick={() => void addCurrent()}>
                  <Plus size={14} />
                  このページを保存
                </button>
              </footer>
            </>
          ) : (
            <>
              {!d.groups.length && !d.items.length ? (
                <div className="empty welcome">
                  <div className="empty-icon">
                    <Bookmark size={30} />
                  </div>
                  <div className="eyebrow">MAKE ROOM FOR YOUR FAVORITES</div>
                  <h2>あなたのウェブを、心地よく。</h2>
                  <p>
                    よく使うサイトも、便利なアクションも。
                    <br />
                    コレクションにまとめて、自分だけのスタートページをつくりましょう。
                  </p>
                  <div>
                    <button
                      className="button primary"
                      onClick={() => makeItem()}
                    >
                      <Plus size={16} />
                      最初のブックマークを追加
                    </button>
                    <button
                      className="button"
                      onClick={() =>
                        void update((current) => ({
                          ...starterData(),
                          revision: current.revision,
                        }))
                      }
                    >
                      <Sparkles size={16} />
                      サンプルからはじめる
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="board"
                  style={{ "--columns": d.settings.columns } as CSSProperties}
                >
                  {visibleGroups.map((g, gi) => (
                    <section
                      key={g.id}
                      className={`collection ${g.layout} ${editLayout ? "editing" : ""}`}
                      style={
                        {
                          "--group": g.color,
                          "--span": g.span,
                        } as CSSProperties
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(g);
                      }}
                    >
                      <header
                        className="collection-head"
                        draggable={editLayout && !!g.id}
                        onDragStart={(e) => {
                          drag.current = { type: "group", id: g.id };
                          e.dataTransfer.setData("text/plain", g.id);
                        }}
                      >
                        <span className="collection-icon">
                          <Icon name={g.icon} size={20} />
                        </span>
                        <div>
                          <h2>
                            {g.name}
                            <span>
                              {matches.filter((i) => i.groupId === g.id).length}
                            </span>
                          </h2>
                          <p>{g.description || "お気に入りを、この場所に。"}</p>
                        </div>
                        {g.id && (
                          <button
                            className="icon-btn"
                            aria-label={`${g.name}を編集`}
                            onClick={() =>
                              setModal({ type: "group", group: g })
                            }
                          >
                            {editLayout ? (
                              <Pencil size={15} />
                            ) : (
                              <MoreHorizontal size={19} />
                            )}
                          </button>
                        )}
                      </header>
                      {editLayout && g.id && (
                        <div className="group-controls">
                          <button
                            className="subtle"
                            disabled={gi === 0}
                            onClick={() =>
                              void update((d) => ({
                                ...d,
                                groups: reorder(
                                  d.groups,
                                  g.id,
                                  d.groups[
                                    Math.max(
                                      0,
                                      d.groups.findIndex((x) => x.id === g.id) -
                                        1,
                                    )
                                  ]?.id,
                                ),
                              }))
                            }
                          >
                            <ArrowUp size={14} />
                            前へ
                          </button>
                          <button
                            className="subtle"
                            disabled={d.groups.at(-1)?.id === g.id}
                            onClick={() =>
                              void update((d) => {
                                const at = d.groups.findIndex(
                                  (x) => x.id === g.id,
                                );
                                const arr = [...d.groups];
                                [arr[at], arr[at + 1]] = [arr[at + 1], arr[at]];
                                return { ...d, groups: arr };
                              })
                            }
                          >
                            <ArrowDown size={14} />
                            次へ
                          </button>
                          <span>
                            {g.span === 2 ? "ワイド" : "標準"} /{" "}
                            {g.layout === "cards" ? "カード" : "リスト"}
                          </span>
                        </div>
                      )}
                      <div className="collection-items">
                        {matches
                          .filter((i) => i.groupId === g.id)
                          .map((i) => (
                            <article
                              className="bookmark-card"
                              key={i.id}
                              draggable={editLayout}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                drag.current = { type: "item", id: i.id };
                                e.dataTransfer.setData("text/plain", i.id);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                drop(g, i.id);
                              }}
                            >
                              <button
                                className="card-open"
                                disabled={busy}
                                onClick={() => void execute(i)}
                              >
                                <ItemMark item={i} color={g.color} />
                                <span className="card-text">
                                  <strong>{i.name}</strong>
                                  <span>
                                    {i.description || domain(i.value)}
                                  </span>
                                </span>
                                <span className="card-arrow">
                                  {i.type === "script" ? (
                                    <Zap size={16} />
                                  ) : (
                                    <ArrowUpRight size={16} />
                                  )}
                                </span>
                              </button>
                              <div className="card-bottom">
                                <span
                                  className={
                                    i.type === "script"
                                      ? "type-tag script"
                                      : "type-tag"
                                  }
                                >
                                  {i.type === "script" ? (
                                    <>
                                      <Zap size={11} />
                                      アクション
                                    </>
                                  ) : (
                                    domain(i.value)
                                  )}
                                </span>
                                <div>
                                  {d.slots.includes(i.id) && (
                                    <kbd
                                      title={
                                        commands.find(
                                          (c) =>
                                            c.name ===
                                            `slot-${d.slots.indexOf(i.id) + 1}`,
                                        )?.shortcut || "Chrome設定でキーを登録"
                                      }
                                    >
                                      #{d.slots.indexOf(i.id) + 1}
                                    </kbd>
                                  )}
                                  <button
                                    className={`icon-btn favorite ${i.favorite ? "is-favorite" : ""}`}
                                    aria-label={`${i.name}のお気に入りを切替`}
                                    onClick={() =>
                                      void update((d) => ({
                                        ...d,
                                        items: d.items.map((x) =>
                                          x.id === i.id
                                            ? { ...x, favorite: !x.favorite }
                                            : x,
                                        ),
                                      }))
                                    }
                                  >
                                    <Star
                                      size={14}
                                      fill={
                                        i.favorite ? "currentColor" : "none"
                                      }
                                    />
                                  </button>
                                  <button
                                    className="icon-btn card-edit"
                                    aria-label={`${i.name}を編集`}
                                    onClick={() =>
                                      setModal({ type: "item", item: i })
                                    }
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </div>
                              </div>
                              {editLayout && (
                                <div className="item-controls">
                                  <GripVertical size={15} />
                                  <select
                                    aria-label={`${i.name}のグループ`}
                                    value={i.groupId}
                                    onChange={(e) =>
                                      moveItem(i.id, e.target.value)
                                    }
                                  >
                                    {[ungrouped, ...d.groups].map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="icon-btn"
                                    aria-label={`${i.name}を前に移動`}
                                    onClick={() =>
                                      void update((d) => {
                                        const inGroup = d.items.filter(
                                          (x) => x.groupId === i.groupId,
                                        );
                                        const at = inGroup.findIndex(
                                          (x) => x.id === i.id,
                                        );
                                        return {
                                          ...d,
                                          items:
                                            at > 0
                                              ? reorder(
                                                  d.items,
                                                  i.id,
                                                  inGroup[at - 1].id,
                                                )
                                              : d.items,
                                        };
                                      })
                                    }
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                      </div>
                      <button
                        className="collection-add"
                        onClick={() => makeItem(g.id)}
                      >
                        <Plus size={15} />
                        ブックマークを追加
                      </button>
                    </section>
                  ))}
                  {!query && kind === "all" && filter === "all" && (
                    <button className="new-group" onClick={makeGroup}>
                      <span>
                        <Plus size={23} />
                      </span>
                      <strong>新しいコレクション</strong>
                      <small>好きなテーマで、まとめよう。</small>
                    </button>
                  )}
                </div>
              )}
              {(query || kind !== "all" || filter === "favorites") &&
                !matches.length && (
                  <div className="empty">
                    <Search size={28} />
                    <h3>まだ、ここにはありません。</h3>
                    <p>検索条件を変えるか、ブックマークを追加してください。</p>
                    <button
                      className="button"
                      onClick={() => {
                        setQuery("");
                        setKind("all");
                        setFilter("all");
                      }}
                    >
                      すべて表示
                    </button>
                  </div>
                )}
              <footer className="page-footer">
                <span>
                  ribbon. <span>小さくまとめて、大きくひらく。</span>
                </span>
                <button className="subtle" onClick={exportData}>
                  <Download size={14} />
                  バックアップ
                </button>
              </footer>
            </>
          )}
        </div>
      </main>
      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>操作を完了できませんでした</strong>
            <p>{error}</p>
          </div>
          <button
            className="icon-btn"
            aria-label="エラーを閉じる"
            onClick={() => {
              setError("");
              if (isExtension) {
                void chrome.storage.local.remove("lastError");
                void chrome.action.setBadgeText({ text: "" });
              }
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {modal?.type === "item" && (
        <ItemEditor
          item={modal.item}
          groups={d.groups}
          exists={d.items.some((i) => i.id === modal.item.id)}
          onClose={() => setModal(null)}
          onDelete={() => {
            deleteItem(modal.item);
            setModal(null);
          }}
          onSave={async (item) => {
            const ok = await update((d) => ({
              ...d,
              items: d.items.some((i) => i.id === item.id)
                ? d.items.map((i) => (i.id === item.id ? item : i))
                : [...d.items, item],
            }));
            if (ok) setModal(null);
          }}
        />
      )}
      {modal?.type === "group" && (
        <GroupEditor
          group={modal.group}
          exists={d.groups.some((g) => g.id === modal.group.id)}
          onClose={() => setModal(null)}
          onDelete={() => {
            if (
              confirm(
                `「${modal.group.name}」を削除しますか？ ブックマークは未分類へ移動します。`,
              )
            ) {
              void update((d) => removeGroup(d, modal.group.id));
              if (filter === modal.group.id) setFilter("all");
              setModal(null);
            }
          }}
          onSave={async (group) => {
            const ok = await update((d) => ({
              ...d,
              groups: d.groups.some((g) => g.id === group.id)
                ? d.groups.map((g) => (g.id === group.id ? group : g))
                : [...d.groups, group],
            }));
            if (ok) setModal(null);
          }}
        />
      )}
      {modal?.type === "settings" && (
        <SettingsPanel
          data={d}
          initialTab={modal.tab}
          commands={commands}
          update={update}
          onClose={() => setModal(null)}
          onExport={exportData}
          onImport={() => file.current?.click()}
          onError={setError}
        />
      )}
      {modal?.type === "import" && (
        <Modal title="バックアップを読み込む" onClose={() => setModal(null)}>
          <p>現在の内容を、以下のバックアップで置き換えます。</p>
          <div className="import-summary">
            <strong>{modal.data.items.length}</strong> ブックマーク　
            <strong>{modal.data.groups.length}</strong> コレクション
          </div>
          <p>
            読み込んだスクリプトは自動実行されません。必要に応じて現在のデータを先に書き出してください。
          </p>
          <div className="form-actions">
            <button className="button" onClick={exportData}>
              現在のデータを書き出す
            </button>
            <button
              className="button primary"
              onClick={async () => {
                const ok = await update((d) => ({
                  ...modal.data,
                  revision: d.revision,
                }));
                if (ok) {
                  setFilter("all");
                  setModal(null);
                }
              }}
            >
              置き換えて読み込む
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "JavaScript";
  }
}
function ItemMark({ item, color }: { item: Item; color: string }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon =
    item.type === "url" && !item.icon && isExtension && !faviconFailed;
  return (
    <span
      className={`item-mark ${item.type}`}
      style={{ "--mark": color } as CSSProperties}
    >
      {item.type === "script" ? (
        <Zap size={21} />
      ) : showFavicon ? (
        <img
          src={`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.value)}&size=32`}
          alt=""
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        item.icon || item.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const first = ref.current?.querySelector<HTMLElement>(
      "input,button,select,textarea",
    );
    first?.focus();
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const elements = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"]',
          ) || [],
        ).filter((x) => x.offsetParent !== null);
        const a = elements[0],
          b = elements.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b?.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <header>
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" aria-label="閉じる" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function ItemEditor({
  item,
  groups,
  exists,
  onClose,
  onSave,
  onDelete,
}: {
  item: Item;
  groups: Group[];
  exists: boolean;
  onClose: () => void;
  onSave: (i: Item) => Promise<void>;
  onDelete: () => void;
}) {
  const [draft, set] = useState({ ...item }),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const change = (key: keyof Item, value: string | boolean) =>
    set({ ...draft, [key]: value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      validateItem(draft);
      setSaving(true);
      await onSave({
        ...draft,
        name: draft.name.trim(),
        value: draft.value.trim(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={exists ? "ブックマークを編集" : "お気に入りを追加"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="segmented">
          <button
            type="button"
            className={draft.type === "url" ? "selected" : ""}
            onClick={() => change("type", "url")}
          >
            <Link size={16} />
            ブックマーク
          </button>
          <button
            type="button"
            className={draft.type === "script" ? "selected" : ""}
            onClick={() => change("type", "script")}
          >
            <Zap size={16} />
            ブックマークレット
          </button>
        </div>
        <label>
          名前
          <input
            required
            maxLength={200}
            value={draft.name}
            placeholder="例：デザインのアイデア集"
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <label>
          {draft.type === "url" ? "URL" : "JavaScript"}
          {draft.type === "url" ? (
            <input
              required
              value={draft.value}
              placeholder="https://"
              onChange={(e) => change("value", e.target.value)}
            />
          ) : (
            <textarea
              className="code-input"
              required
              rows={7}
              value={draft.value}
              placeholder="javascript:(() => { … })();"
              onChange={(e) => change("value", e.target.value)}
            />
          )}
        </label>
        {draft.type === "script" && (
          <p className="field-hint">
            選択したページで実行します。内容を理解しているコードを登録してください。
          </p>
        )}
        <label>
          ひとことメモ
          <input
            maxLength={2000}
            value={draft.description}
            placeholder="この場所でできること"
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            コレクション
            <select
              value={draft.groupId}
              onChange={(e) => change("groupId", e.target.value)}
            >
              {[ungrouped, ...groups].map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            検索キーワード
            <input
              maxLength={100}
              value={draft.keyword}
              placeholder="例：design"
              onChange={(e) => change("keyword", e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            アイコンの文字・絵文字
            <input
              maxLength={8}
              value={draft.icon}
              placeholder="例：✦ / F / 📚"
              onChange={(e) => change("icon", e.target.value)}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.favorite}
              onChange={(e) => change("favorite", e.target.checked)}
            />
            お気に入りに追加
          </label>
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {exists && (
            <button type="button" className="button danger" onClick={onDelete}>
              <Trash2 size={15} />
              削除
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" disabled={saving} type="submit">
            <Check size={16} />
            保存する
          </button>
        </div>
      </form>
    </Modal>
  );
}
function GroupEditor({
  group,
  exists,
  onClose,
  onSave,
  onDelete,
}: {
  group: Group;
  exists: boolean;
  onClose: () => void;
  onSave: (g: Group) => Promise<void>;
  onDelete: () => void;
}) {
  const [draft, set] = useState({ ...group });
  return (
    <Modal
      title={exists ? "コレクションをデザイン" : "コレクションをつくる"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(draft);
        }}
      >
        <div
          className="group-preview"
          style={{ "--group": draft.color } as CSSProperties}
        >
          <span className="collection-icon">
            <Icon name={draft.icon} size={24} />
          </span>
          <div>
            <strong>{draft.name || "新しいコレクション"}</strong>
            <p>{draft.description || "あなたの「好き」をまとめる場所。"}</p>
          </div>
        </div>
        <label>
          名前
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => set({ ...draft, name: e.target.value })}
            placeholder="例：週末の楽しみ"
          />
        </label>
        <label>
          説明
          <input
            maxLength={2000}
            value={draft.description}
            onChange={(e) => set({ ...draft, description: e.target.value })}
            placeholder="このコレクションをひとことで"
          />
        </label>
        <label>アクセントカラー</label>
        <div className="swatches">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              className={draft.color === c ? "picked" : ""}
              style={{ background: c }}
              onClick={() => set({ ...draft, color: c })}
            >
              {draft.color === c && <Check size={15} />}
            </button>
          ))}
          <input
            aria-label="カスタムグループ色"
            type="color"
            value={draft.color}
            onChange={(e) => set({ ...draft, color: e.target.value })}
          />
        </div>
        <label>アイコン</label>
        <div className="icon-picker">
          {Object.keys(icons).map((name) => (
            <button
              key={name}
              type="button"
              className={draft.icon === name ? "selected" : ""}
              aria-label={name}
              onClick={() => set({ ...draft, icon: name })}
            >
              <Icon name={name} />
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label>
            表示形式
            <select
              value={draft.layout}
              onChange={(e) =>
                set({ ...draft, layout: e.target.value as Group["layout"] })
              }
            >
              <option value="cards">カード</option>
              <option value="list">コンパクトなリスト</option>
            </select>
          </label>
          <label>
            グループの幅
            <select
              value={draft.span}
              onChange={(e) =>
                set({ ...draft, span: Number(e.target.value) as 1 | 2 })
              }
            >
              <option value="1">標準（1列）</option>
              <option value="2">ワイド（2列）</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          {exists && (
            <button type="button" className="button danger" onClick={onDelete}>
              <Trash2 size={15} />
              削除
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="button primary">
            保存する
          </button>
        </div>
      </form>
    </Modal>
  );
}
function SettingsPanel({
  data,
  initialTab,
  commands,
  update,
  onClose,
  onExport,
  onImport,
  onError,
}: {
  data: Data;
  initialTab: string;
  commands: chrome.commands.Command[];
  update: (fn: (d: Data) => Data) => Promise<boolean>;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onError: (e: string) => void;
}) {
  const [tab, setTab] = useState(initialTab),
    [page, setPage] = useState({ ...data.settings }),
    [themeId, setThemeId] = useState(data.settings.themeId),
    [themeName, setThemeName] = useState("マイテーマ"),
    [custom, setCustom] = useState<Palette>({
      ...(
        [...themes, ...data.themes].find(
          (t) => t.id === data.settings.themeId,
        ) || themes[0]
      ).colors,
    }),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(""),
    [permission, setPermission] = useState("状態を確認中…");
  const paletteLabels: Record<keyof Palette, string> = {
    bg: "ページ背景",
    sidebar: "サイドバー",
    surface: "カード",
    text: "文字",
    accent: "アクセント",
    border: "境界線",
  };
  const themeList = [...themes, ...data.themes];
  async function checkPermissions() {
    if (!isExtension) {
      setPermission("Chrome拡張として読み込むと設定できます。");
      return;
    }
    try {
      const host = await chrome.permissions.contains({
        origins: ["http://*/*", "https://*/*"],
      });
      let scripts = false;
      try {
        await chrome.userScripts.getScripts();
        scripts = true;
      } catch {}
      setPermission(
        `${host ? "✓" : "○"} サイトへのアクセス　${scripts ? "✓" : "○"} ユーザースクリプト`,
      );
    } catch (e) {
      setPermission(String(e));
    }
  }
  useEffect(() => {
    void checkPermissions();
  }, []);
  return (
    <Modal title="ワークスペースの設定" wide onClose={onClose}>
      <div className="settings-tabs">
        {[
          ["page", "ページ", LayoutGrid],
          ["themes", "テーマ", PaletteIcon],
          ["shortcuts", "キー", Keyboard],
          ["data", "データ・権限", Shield],
        ].map(([id, label, C]) => {
          const I = C as typeof LayoutGrid;
          return (
            <button
              key={id as string}
              className={tab === id ? "selected" : ""}
              onClick={() => {
                setTab(id as string);
                setSaved("");
              }}
            >
              <I size={16} />
              {label as string}
            </button>
          );
        })}
      </div>
      <div className="settings-content">
        {tab === "page" && (
          <>
            <h3>まとめページを、自分らしく。</h3>
            <p className="muted">
              タイトル、カバー、並び方をかんたんに整えられます。
            </p>
            <label>
              ページタイトル
              <input
                maxLength={200}
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
              />
            </label>
            <label>
              サブタイトル
              <input
                maxLength={1000}
                value={page.subtitle}
                onChange={(e) => setPage({ ...page, subtitle: e.target.value })}
              />
            </label>
            <label>カバー</label>
            <div className="cover-options">
              {[
                ["ribbon", "リボン"],
                ["gradient", "グラデーション"],
                ["plain", "シンプル"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={`cover-option ${id} ${page.cover === id ? "selected" : ""}`}
                  onClick={() =>
                    setPage({ ...page, cover: id as Data["settings"]["cover"] })
                  }
                >
                  <span />
                  {label}
                  {page.cover === id && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                コレクションの列数
                <select
                  value={page.columns}
                  onChange={(e) =>
                    setPage({
                      ...page,
                      columns: Number(e.target.value) as 2 | 3 | 4,
                    })
                  }
                >
                  <option value="2">2列・ゆったり</option>
                  <option value="3">3列・一覧しやすく</option>
                  <option value="4">4列・たくさん表示</option>
                </select>
              </label>
              <label>
                余白
                <select
                  value={page.density}
                  onChange={(e) =>
                    setPage({
                      ...page,
                      density: e.target.value as Data["settings"]["density"],
                    })
                  }
                >
                  <option value="comfortable">心地よい余白</option>
                  <option value="compact">コンパクト</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button
                className="button primary"
                onClick={async () => {
                  const ok = await update((d) => ({
                    ...d,
                    settings: { ...page, themeId: d.settings.themeId },
                  }));
                  if (ok) setSaved("ページを保存しました");
                }}
              >
                ページ設定を保存
              </button>
            </div>
          </>
        )}
        {tab === "themes" && (
          <>
            <h3>気分に合う、色を選ぼう。</h3>
            <p className="muted">
              プレビューで配色を確認し、「適用」で全画面に反映します。
            </p>
            <div className="theme-grid">
              {themeList.map((t) => (
                <button
                  key={t.id}
                  className={`theme-tile ${themeId === t.id ? "selected" : ""}`}
                  onClick={() => {
                    setThemeId(t.id);
                    setCustom({ ...t.colors });
                    setThemeName(
                      themes.some((b) => b.id === t.id)
                        ? `${t.name} カスタム`
                        : t.name,
                    );
                    setDirty(false);
                  }}
                >
                  <span
                    className="theme-mini"
                    style={{
                      background: t.colors.bg,
                      borderColor: t.colors.border,
                    }}
                  >
                    <i style={{ background: t.colors.sidebar }} />
                    <span>
                      <b style={{ background: t.colors.accent }} />
                      <i style={{ background: t.colors.surface }} />
                      <i style={{ background: t.colors.surface }} />
                    </span>
                  </span>
                  <span>
                    {t.name}
                    {themeId === t.id && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            <div
              className="palette-preview"
              style={{
                background: custom.bg,
                color: custom.text,
                borderColor: custom.border,
              }}
            >
              <aside style={{ background: custom.sidebar }}>
                <span style={{ color: custom.accent }}>●</span>
                <i>Collection</i>
              </aside>
              <div>
                <strong>My workspace</strong>
                <p
                  style={{
                    background: custom.surface,
                    borderColor: custom.border,
                  }}
                >
                  <Bookmark size={19} style={{ color: custom.accent }} />
                  お気に入りの場所
                  <ArrowUpRight size={16} />
                </p>
              </div>
            </div>
            <h4>配色をカスタマイズ</h4>
            <div className="color-fields">
              {(Object.keys(paletteLabels) as (keyof Palette)[]).map((k) => (
                <label key={k}>
                  <input
                    type="color"
                    value={custom[k]}
                    onChange={(e) => {
                      setCustom({ ...custom, [k]: e.target.value });
                      setDirty(true);
                    }}
                  />
                  <span>
                    {paletteLabels[k]}
                    <small>{custom[k].toUpperCase()}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="field-hint">
              文字のコントラスト：背景{" "}
              {contrast(custom.text, custom.bg).toFixed(1)}:1 / カード{" "}
              {contrast(custom.text, custom.surface).toFixed(1)}:1（目安
              4.5:1以上）
            </p>
            <label>
              カスタムテーマ名
              <input
                value={themeName}
                maxLength={100}
                onChange={(e) => {
                  setThemeName(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <div className="form-actions">
              <button
                className="button"
                onClick={() => {
                  setCustom({
                    ...themeList.find((t) => t.id === themeId)!.colors,
                  });
                  setDirty(false);
                }}
              >
                色を戻す
              </button>
              {data.themes.some((t) => t.id === themeId) && (
                <button
                  className="button danger"
                  onClick={async () => {
                    const ok = await update((d) => ({
                      ...d,
                      themes: d.themes.filter((t) => t.id !== themeId),
                      settings: {
                        ...d.settings,
                        themeId:
                          d.settings.themeId === themeId
                            ? "light"
                            : d.settings.themeId,
                      },
                    }));
                    if (!ok) return;
                    setThemeId("light");
                    setCustom({ ...themes[0].colors });
                    setDirty(false);
                  }}
                >
                  削除
                </button>
              )}
              <div className="spacer" />
              <button
                className="button primary"
                onClick={async () => {
                  if (dirty) {
                    if (!themeName.trim()) {
                      onError("カスタムテーマ名を入力してください。");
                      return;
                    }
                    const id = data.themes.some((t) => t.id === themeId)
                      ? themeId
                      : uid();
                    const t: Theme = {
                      id,
                      name: themeName.trim(),
                      colors: custom,
                    };
                    const ok = await update((d) => ({
                      ...d,
                      themes: [...d.themes.filter((x) => x.id !== id), t],
                      settings: { ...d.settings, themeId: id },
                    }));
                    if (!ok) return;
                    setThemeId(id);
                    setDirty(false);
                  } else {
                    const ok = await update((d) => ({
                      ...d,
                      settings: { ...d.settings, themeId },
                    }));
                    if (!ok) return;
                  }
                  setSaved("テーマを適用しました");
                }}
              >
                {dirty ? "保存して適用" : "テーマを適用"}
              </button>
            </div>
          </>
        )}
        {tab === "shortcuts" && (
          <>
            <h3>お気に入りまで、ワンショートカット。</h3>
            <p className="muted">
              項目を30個の枠に割り当て、Chrome設定で各枠のキーを指定します。
            </p>
            <div className="shortcut-overview">
              <Keyboard size={25} />
              <div>
                <strong>クイックアクセスを開く</strong>
                <small>検索 → ↑ ↓ で選択 → Enter で実行</small>
              </div>
              <kbd>
                {commands.find((c) => c.name === "_execute_action")?.shortcut ||
                  "未設定"}
              </kbd>
            </div>
            <button
              className="button"
              onClick={() => {
                if (isExtension)
                  void chrome.tabs.create({
                    url: "chrome://extensions/shortcuts",
                  });
                else onError("Chrome拡張として読み込んでから設定できます。");
              }}
            >
              Chromeのキー設定を開く
              <ExternalLink size={15} />
            </button>
            <div className="slot-list">
              {data.slots.map((id, n) => (
                <div className="slot" key={n}>
                  <span>{String(n + 1).padStart(2, "0")}</span>
                  <select
                    aria-label={`直接実行 ${n + 1}`}
                    value={id || ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      void update((d) => ({
                        ...d,
                        slots: d.slots.map((v, j) => (j === n ? value : v)),
                      }));
                    }}
                  >
                    <option value="">項目を割り当てる…</option>
                    {data.items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.type === "script" ? "⚡" : "↗"} {i.name}
                      </option>
                    ))}
                  </select>
                  <kbd>
                    {commands.find((c) => c.name === `slot-${n + 1}`)
                      ?.shortcut || "キー未設定"}
                  </kbd>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "data" && (
          <>
            <h3>あなたのデータは、あなたの手元に。</h3>
            <p className="muted">
              登録内容はこのChromeプロファイルに保存します。アンインストール前にバックアップしてください。
            </p>
            <div className="data-buttons">
              <button className="button" onClick={onExport}>
                <Download size={17} />
                JSONを書き出す
              </button>
              <button className="button" onClick={onImport}>
                <Upload size={17} />
                バックアップを読み込む
              </button>
            </div>
            <hr />
            <h3>ブックマークレットの実行設定</h3>
            <p className="muted">
              ① Webサイトへのアクセスを許可し、②
              拡張機能の詳細で「ユーザースクリプトを許可」をオンにしてください。
            </p>
            <p className="permission-status">{permission}</p>
            <div className="data-buttons">
              <button
                className="button"
                onClick={async () => {
                  if (!isExtension) return;
                  try {
                    await chrome.permissions.request({
                      origins: ["http://*/*", "https://*/*"],
                    });
                    await checkPermissions();
                  } catch (e) {
                    onError(String(e));
                  }
                }}
              >
                ① サイトへのアクセスを許可
              </button>
              <button
                className="button"
                onClick={() => {
                  if (isExtension)
                    void chrome.tabs.create({
                      url: `chrome://extensions/?id=${chrome.runtime.id}`,
                    });
                }}
              >
                ② 拡張機能の詳細を開く
              </button>
              <button
                className="subtle"
                onClick={() => void checkPermissions()}
              >
                状態を再確認
              </button>
            </div>
            <p className="field-hint">
              Chromeの内部ページやウェブストアなど、実行できないページがあります。スクリプトは手動で実行したときのみ動作します。
            </p>
          </>
        )}
        {saved && (
          <p className="saved-message" role="status">
            <Check size={16} />
            {saved}
          </p>
        )}
      </div>
    </Modal>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
