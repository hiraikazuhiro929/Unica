import { WorkDetails, Process } from "@/app/tasks/types";
// ===== 定数 =====
export const MACHINES = [
  "NC旋盤-001",
  "NC旋盤-002",
  "マシニングセンタ-001",
  "マシニングセンタ-002",
  "フライス盤-001",
  "研削盤-001",
  "ボール盤-001",
  "プレス機-001",
  "溶接機-001",
  "切断機-001",
];

export const CLIENT_COLORS = [
  "#ff5858ff", // 赤
  "#5f5fffff", // 青
  "#00FF00", // 緑
  "#FF8000", // オレンジ
  "#9f3effff", // 紫
  "#d1d163ff", // 黄色
  "#00FFFF", // シアン
  "#FF0080", // マゼンタ
  "#4d4d4dff", // グレー
  "#000000", // 黒
  "#FFFFFF", // 白（枠線付きで使用）
  "#a00000ff", // ダークレッド
  "#000080", // ネイビー
  "#008000", // ダークグリーン
  "#800080", // ダークパープル
  "#678d00ff", // オリーブ
  "#008080", // ティール
  "#C0C0C0", // シルバー
  "#ffb6ccff", // ライトピンク
  "#582b2bff", // ブラウン
];

// ===== ユーティリティ関数 =====
export const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

export const calculateTotalHours = (details: WorkDetails) => {
  return (
    (details.setup || 0) +
    (details.machining || 0) +
    (details.finishing || 0) +
    (details.additionalSetup || 0) +
    (details.additionalMachining || 0) +
    (details.additionalFinishing || 0)
  );
};

export const getDaysFromToday = (dateStr: string) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 受注先から色を生成する関数
export const getClientColor = (clientName: string) => {
  if (!clientName) return CLIENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = ((hash << 5) - hash + clientName.charCodeAt(i)) & 0xffffffff;
  }
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
};

// 受注先色からライト版を生成
export const getLightClientColor = (clientName: string) => {
  const color = getClientColor(clientName);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
};