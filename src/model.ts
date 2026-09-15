export type Palette = {
  bg: string;
  sidebar: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
};
export type Group = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  layout: "cards" | "list";
  span: 1 | 2;
};
export type Item = {
  id: string;
  name: string;
  type: "url" | "script";
  value: string;
  description: string;
  groupId: string;
  keyword: string;
  favorite: boolean;
  icon: string;
};
export type Theme = { id: string; name: string; colors: Palette };
export type Data = {
  version: 1;
  revision: number;
  groups: Group[];
  items: Item[];
  slots: (string | null)[];
  themes: Theme[];
  settings: {
    title: string;
    subtitle: string;
    themeId: string;
    columns: 2 | 3;
    density: "comfortable" | "compact";
    cover: "ribbon" | "plain" | "gradient";
  };
};
export const themes: Theme[] = [
  {
    id: "light",
    name: "Ribbon Light",
    colors: {
      bg: "#F7F8FA",
      sidebar: "#FFFFFF",
      surface: "#FFFFFF",
      text: "#233447",
      accent: "#C65B3B",
      border: "#E5E8ED",
    },
  },
  {
    id: "dark",
    name: "Ribbon Dark",
    colors: {
      bg: "#151B24",
      sidebar: "#1A222E",
      surface: "#202A37",
      text: "#E5EAF2",
      accent: "#F1A17F",
      border: "#354153",
    },
  },
  {
    id: "light-modern",
    name: "Light Modern",
    colors: {
      bg: "#F5F5F5",
      sidebar: "#FFFFFF",
      surface: "#FFFFFF",
      text: "#253046",
      accent: "#3F64C5",
      border: "#DDDFE5",
    },
  },
  {
    id: "dark-modern",
    name: "Dark Modern",
    colors: {
      bg: "#181818",
      sidebar: "#202020",
      surface: "#262626",
      text: "#ECECEC",
      accent: "#77AFF5",
      border: "#414141",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    colors: {
      bg: "#25261F",
      sidebar: "#2C2D25",
      surface: "#34362C",
      text: "#F8F8F2",
      accent: "#A6E22E",
      border: "#4B4D40",
    },
  },
  {
    id: "nord",
    name: "Nord",
    colors: {
      bg: "#2E3440",
      sidebar: "#343C4B",
      surface: "#3B4252",
      text: "#ECEFF4",
      accent: "#88C0D0",
      border: "#4C566A",
    },
  },
];
export const uid = () => crypto.randomUUID();
export const ungrouped: Group = {
  id: "",
  name: "未分類",
  description: "まだグループに入っていないブックマーク",
  color: "#8590A3",
  icon: "Inbox",
  layout: "cards",
  span: 1,
};
export function initialData(): Data {
  return {
    version: 1,
    revision: 0,
    groups: [],
    items: [],
    slots: Array(30).fill(null),
    themes: [],
    settings: {
      title: "My workspace",
      subtitle: "お気に入りの場所と、小さなアイデアをひとつに。",
      themeId: "light",
      columns: 3,
      density: "comfortable",
      cover: "ribbon",
    },
  };
}
export function starterData(): Data {
  const d = initialData();
  d.groups = [
    {
      id: "daily",
      name: "毎日のワークスペース",
      description: "いつも使う、大切な場所。",
      color: "#C66A48",
      icon: "Coffee",
      layout: "cards",
      span: 1,
    },
    {
      id: "inspiration",
      name: "デザインとインスピレーション",
      description: "次のアイデアに、出会う。",
      color: "#8B78BD",
      icon: "Sparkles",
      layout: "cards",
      span: 1,
    },
    {
      id: "development",
      name: "つくる・学ぶ",
      description: "思いつきを、かたちに。",
      color: "#598E7C",
      icon: "Code",
      layout: "cards",
      span: 1,
    },
  ];
  const rows: [string, string, string, string, string][] = [
    ["daily", "Gmail", "https://mail.google.com/", "メールをひとまとめに", "G"],
    [
      "daily",
      "Google Calendar",
      "https://calendar.google.com/",
      "今日の予定をチェック",
      "31",
    ],
    [
      "daily",
      "Notion",
      "https://www.notion.so/",
      "メモとプロジェクトのホーム",
      "N",
    ],
    [
      "inspiration",
      "Figma",
      "https://www.figma.com/",
      "アイデアから、デザインへ",
      "F",
    ],
    [
      "inspiration",
      "Dribbble",
      "https://dribbble.com/",
      "世界のクリエイティブを探す",
      "D",
    ],
    [
      "inspiration",
      "Pinterest",
      "https://www.pinterest.com/",
      "気になるビジュアルを集める",
      "P",
    ],
    [
      "development",
      "GitHub",
      "https://github.com/",
      "コードとプロジェクト",
      "GH",
    ],
    [
      "development",
      "MDN Web Docs",
      "https://developer.mozilla.org/",
      "ウェブ開発のリファレンス",
      "M",
    ],
  ];
  d.items = rows.map(([groupId, name, value, description, icon], i) => ({
    id: uid(),
    groupId,
    name,
    value,
    description,
    icon,
    type: "url",
    keyword: name.split(" ")[0].toLowerCase(),
    favorite: i === 0 || i === 3,
  }));
  d.items.push({
    id: uid(),
    groupId: "development",
    name: "ページタイトルを確認",
    description: "今のページのタイトルを表示",
    value: "javascript:alert(document.title);",
    icon: "Zap",
    type: "script",
    keyword: "title",
    favorite: false,
  });
  return d;
}
export function validURL(s: string) {
  try {
    return ["https:", "http:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}
export function normalizeScript(s: string) {
  let code = s.trim();
  if (/^javascript:/i.test(code)) {
    code = code.replace(/^javascript:/i, "");
    if (/%[0-9a-f]{2}/i.test(code)) {
      try {
        code = decodeURIComponent(code);
      } catch {
        throw new Error("JavaScript URLの文字コードが不正です。");
      }
    }
  }
  if (!code.trim()) throw new Error("JavaScriptを入力してください。");
  return code;
}
export function validateItem(item: Item) {
  if (!item.name.trim()) throw new Error("名前を入力してください。");
  if (item.type === "url" && !validURL(item.value))
    throw new Error("http:// または https:// のURLを入力してください。");
  if (item.type === "script") normalizeScript(item.value);
}
export function removeItem(d: Data, id: string): Data {
  return {
    ...d,
    items: d.items.filter((i) => i.id !== id),
    slots: d.slots.map((s) => (s === id ? null : s)),
  };
}
export function removeGroup(d: Data, id: string): Data {
  return {
    ...d,
    groups: d.groups.filter((g) => g.id !== id),
    items: d.items.map((i) => (i.groupId === id ? { ...i, groupId: "" } : i)),
  };
}
export function searchItems(items: Item[], q: string) {
  const tokens = q.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items
    .filter((i) =>
      tokens.every((t) =>
        `${i.name} ${i.description} ${i.keyword}`
          .toLocaleLowerCase()
          .includes(t),
      ),
    )
    .sort(
      (a, b) =>
        Number(b.keyword.toLowerCase() === q.toLowerCase()) -
        Number(a.keyword.toLowerCase() === q.toLowerCase()),
    );
}
export function reorder<T extends { id: string }>(
  items: T[],
  id: string,
  before: string,
): T[] {
  const source = items.find((i) => i.id === id);
  if (!source || id === before) return items;
  const rest = items.filter((i) => i.id !== id);
  const at = rest.findIndex((i) => i.id === before);
  rest.splice(at < 0 ? rest.length : at, 0, source);
  return rest;
}
export function contrast(a: string, b: string) {
  const luminance = (s: string) => {
    const v = [1, 3, 5]
      .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function validateData(raw: unknown): Data {
  const fail = (): never => {
    throw new Error("バックアップの形式または参照関係が不正です。");
  };
  if (!raw || typeof raw !== "object") return fail();
  const d = raw as Data;
  if (d.version !== 1)
    throw new Error("このバックアップのバージョンには対応していません。");
  const str = (x: unknown, max = 1000000) =>
    typeof x === "string" && x.length <= max;
  const color = (x: unknown) =>
    typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x);
  if (
    !Array.isArray(d.groups) ||
    !Array.isArray(d.items) ||
    !Array.isArray(d.slots) ||
    d.slots.length !== 30 ||
    !Array.isArray(d.themes) ||
    !d.settings ||
    !Number.isSafeInteger(d.revision) ||
    d.revision < 0
  )
    return fail();
  const unique = (a: { id: string }[]) =>
    a.every((x) => x && str(x.id, 100) && !!x.id) &&
    new Set(a.map((x) => x.id)).size === a.length;
  if (!unique(d.groups) || !unique(d.items) || !unique(d.themes)) return fail();
  for (const g of d.groups)
    if (
      !str(g.name, 200) ||
      !g.name.trim() ||
      !str(g.description, 2000) ||
      !str(g.icon, 40) ||
      !color(g.color) ||
      !["cards", "list"].includes(g.layout) ||
      ![1, 2].includes(g.span)
    )
      return fail();
  for (const i of d.items) {
    if (
      !str(i.name, 200) ||
      !str(i.description, 2000) ||
      !str(i.keyword, 100) ||
      !str(i.icon, 40) ||
      !str(i.value) ||
      !["url", "script"].includes(i.type) ||
      typeof i.favorite !== "boolean" ||
      (i.groupId !== "" && !d.groups.some((g) => g.id === i.groupId))
    )
      return fail();
    validateItem(i);
  }
  if (d.slots.some((s) => s !== null && !d.items.some((i) => i.id === s)))
    return fail();
  for (const t of d.themes)
    if (
      !str(t.name, 100) ||
      !t.name.trim() ||
      themes.some((b) => b.id === t.id) ||
      !t.colors ||
      !["bg", "sidebar", "surface", "text", "accent", "border"].every((k) =>
        color(t.colors[k as keyof Palette]),
      )
    )
      return fail();
  const s = d.settings;
  if (
    !str(s.title, 200) ||
    !str(s.subtitle, 1000) ||
    ![2, 3].includes(s.columns) ||
    !["comfortable", "compact"].includes(s.density) ||
    !["ribbon", "plain", "gradient"].includes(s.cover) ||
    ![...themes, ...d.themes].some((t) => t.id === s.themeId)
  )
    return fail();
  return structuredClone(d);
}
