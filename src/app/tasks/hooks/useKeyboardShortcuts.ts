import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onNewProcess?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  onRefresh?: () => void;
  onToggleView?: () => void;
  isModalOpen?: boolean;
}

export const useKeyboardShortcuts = ({
  onNewProcess,
  onSearch,
  onSave,
  onClose,
  onRefresh,
  onToggleView,
  isModalOpen = false,
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モーダルが開いている時とそうでない時で挙動を分ける
      if (isModalOpen) {
        // モーダル内のショートカット
        if (e.key === "Escape" && onClose) {
          e.preventDefault();
          onClose();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "s" && onSave) {
          e.preventDefault();
          onSave();
        }
        return;
      }

      // 入力フィールドにフォーカスがある場合はショートカットを無効化
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // グローバルショートカット
      switch (true) {
        // Ctrl/Cmd + N: 新規工程作成
        case (e.ctrlKey || e.metaKey) && e.key === "n":
          e.preventDefault();
          onNewProcess?.();
          break;

        // Ctrl/Cmd + F: 検索フォーカス
        case (e.ctrlKey || e.metaKey) && e.key === "f":
          e.preventDefault();
          onSearch?.();
          break;

        // F5 or Ctrl/Cmd + R: リフレッシュ
        case e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "r"):
          e.preventDefault();
          onRefresh?.();
          break;

        // Ctrl/Cmd + Shift + V: ビュー切り替え
        case (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V":
          e.preventDefault();
          onToggleView?.();
          break;

        // ESC: モーダルを閉じる（グローバル）
        case e.key === "Escape":
          e.preventDefault();
          onClose?.();
          break;

        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    onNewProcess,
    onSearch,
    onSave,
    onClose,
    onRefresh,
    onToggleView,
    isModalOpen,
  ]);

  // ショートカットキーの説明を返す関数
  const getShortcutInfo = () => {
    const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
    const modKey = isMac ? "Cmd" : "Ctrl";

    return {
      newProcess: `${modKey} + N`,
      search: `${modKey} + F`,
      save: `${modKey} + S`,
      refresh: `F5 または ${modKey} + R`,
      toggleView: `${modKey} + Shift + V`,
      close: "Esc",
    };
  };

  return {
    getShortcutInfo,
  };
};