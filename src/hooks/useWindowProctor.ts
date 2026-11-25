"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type WindowViolationType =
  | "tab_switch"
  | "window_blur"
  | "fullscreen_exit"
  | "devtools_open"
  | "copy_paste_attempt";

export interface IWindowProctorOptions {
  enabled?: boolean;
  maxViolations?: number;
  requireFullscreen?: boolean;
  gracePeriodMs?: number; // Thời gian ân hạn lúc mới vào bài thi
  onViolation?: (type: WindowViolationType, description: string) => void;
  onRevoke?: (totalViolations: number) => void;
}

/**
 * Phát âm thanh cảnh báo sử dụng Web Audio API
 */
export function playWarningBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn("Không thể phát âm thanh cảnh báo:", e);
  }
}

export function useWindowProctor({
  enabled = true,
  maxViolations = 3,
  requireFullscreen = true,
  gracePeriodMs = 6000,
  onViolation,
  onRevoke,
}: IWindowProctorOptions) {
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== "undefined" ? !!document.fullscreenElement : false
  );
  const [activeWarning, setActiveWarning] = useState<{
    type: WindowViolationType;
    description: string;
    count: number;
  } | null>(null);

  const lastViolationTimeRef = useRef<number>(0);
  const lastTabSwitchTimeRef = useRef<number>(0);
  const isRevokedRef = useRef<boolean>(false);
  const enabledStartTimeRef = useRef<number>(0);

  // Ghi lại thời điểm bắt đầu kích hoạt giám sát để tính thời gian ân hạn
  useEffect(() => {
    if (enabled) {
      enabledStartTimeRef.current = Date.now();
    }
  }, [enabled]);

  // Kích hoạt một vi phạm mới (kèm Debounce chống spam sự kiện)
  const triggerViolation = useCallback(
    (type: WindowViolationType, description: string) => {
      if (!enabled || isRevokedRef.current) return;

      const now = Date.now();
      // Trong thời gian ân hạn (Grace Period) thì không tính vi phạm
      if (now - enabledStartTimeRef.current < gracePeriodMs) {
        return;
      }

      // Chống spam: Mỗi vi phạm cách nhau tối thiểu 3.5 giây
      if (now - lastViolationTimeRef.current < 3500) {
        return;
      }
      lastViolationTimeRef.current = now;

      playWarningBeep();

      setViolationCount((prev) => {
        const next = prev + 1;
        setActiveWarning({
          type,
          description,
          count: next,
        });

        if (onViolation) {
          onViolation(type, description);
        }

        if (next >= maxViolations) {
          isRevokedRef.current = true;
          if (onRevoke) {
            onRevoke(next);
          }
        }
        return next;
      });
    },
    [enabled, gracePeriodMs, maxViolations, onViolation, onRevoke]
  );

  // Yêu cầu chuyển sang chế độ Toàn Màn Hình
  const requestFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return false;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        return true;
      }
      return true;
    } catch (err) {
      console.warn("Không thể bật fullscreen:", err);
      return false;
    }
  }, []);

  // Đóng modal cảnh báo hiện tại
  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
    if (requireFullscreen && !document.fullscreenElement) {
      requestFullscreen();
    }
  }, [requireFullscreen, requestFullscreen]);

  // Reset toàn bộ vi phạm để test lại
  const resetViolations = useCallback(() => {
    setViolationCount(0);
    setActiveWarning(null);
    isRevokedRef.current = false;
    enabledStartTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Lắng nghe trạng thái Toàn màn hình khi thay đổi
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      if (requireFullscreen && !isNowFullscreen && !isRevokedRef.current) {
        triggerViolation(
          "fullscreen_exit",
          "Thí sinh đã thoát chế độ toàn màn hình. Yêu cầu bật lại toàn màn hình ngay lập tức!"
        );
      }
    };

    // 2. Kiểm tra chuyển Tab / Thu nhỏ trình duyệt (Rất chính xác, không bắt nhầm)
    const handleVisibilityChange = () => {
      if (document.hidden && !isRevokedRef.current) {
        lastTabSwitchTimeRef.current = Date.now();
        triggerViolation(
          "tab_switch",
          "Phát hiện thí sinh chuyển tab hoặc thu nhỏ trình duyệt làm bài thi."
        );
      }
    };

    // 3. Kiểm tra mất tiêu điểm cửa sổ (Alt+Tab sang ứng dụng ngoài)
    const handleWindowBlur = () => {
      if (isRevokedRef.current) return;

      // Nếu vừa mới bắt sự kiện tab_switch thì bỏ qua blur để không bị tính trùng lặp 2 lần
      if (Date.now() - lastTabSwitchTimeRef.current < 4000) {
        return;
      }

      // Đợi 1500ms để tránh bắt nhầm khi click giao diện hoặc popup hệ thống
      setTimeout(() => {
        if (!document.hasFocus() && !isRevokedRef.current) {
          if (Date.now() - lastTabSwitchTimeRef.current < 4000) return;
          triggerViolation(
            "window_blur",
            "Phát hiện rời khỏi cửa sổ bài thi (Alt+Tab hoặc click sang phần mềm khác)."
          );
        }
      }, 1500);
    };

    // 4. Chặn các phím tắt nguy hiểm (F12, Inspect, Copy, Paste, Cắt)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 mở DevTools
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          "devtools_open",
          "Cố gắng mở công cụ nhà phát triển (F12) bị nghiêm cấm!"
        );
        return;
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools Chrome/Edge)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          "devtools_open",
          "Cố gắng mở thanh kiểm tra phần tử (Inspect DevTools) bị nghiêm cấm!"
        );
        return;
      }

      // Chặn Ctrl+C / Ctrl+V / Ctrl+X
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V" || e.key === "x" || e.key === "X")
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          "copy_paste_attempt",
          "Hành vi sao chép (Copy/Paste) câu hỏi đề thi bị nghiêm cấm!"
        );
        return;
      }
    };

    // 5. Chặn chuột phải (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation(
        "copy_paste_attempt",
        "Thao tác bấm chuột phải trên đề thi đã bị vô hiệu hóa."
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, requireFullscreen, triggerViolation]);

  return {
    violationCount,
    isFullscreen,
    activeWarning,
    isRevoked: violationCount >= maxViolations,
    requestFullscreen,
    dismissWarning,
    triggerViolation,
    resetViolations,
  };
}
