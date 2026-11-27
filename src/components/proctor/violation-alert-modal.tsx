"use client";

//popup cảnh báo, hiển thị ảnh vị phạm
import React, { useState, useEffect } from "react";
import Image from "next/image";

interface ViolationAlertModalProps {
  isOpen: boolean;
  violationType: string;
  description: string;
  violationCount: number;
  maxViolations?: number;
  evidenceSnapshot?: string | null;
  isRevoked?: boolean;
  onConfirmDismiss: () => void;
  onExitRevokedExam?: () => void;
}

export default function ViolationAlertModal({
  isOpen,
  violationType,
  description,
  violationCount,
  maxViolations = 3,
  evidenceSnapshot,
  isRevoked = false,
  onConfirmDismiss,
  onExitRevokedExam,
}: ViolationAlertModalProps) {
  const [countdown, setCountdown] = useState<number>(3);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCountdown(3);
    }
  }

  // Đếm ngược 3 giây trước khi cho phép bấm nút "Tôi cam kết quay lại làm bài"
  useEffect(() => {
    if (!isOpen || isRevoked) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRevoked]);

  if (!isOpen) return null;

  // Lấy tên tiếng Việt thân thiện của loại vi phạm
  const getViolationTitle = (type: string) => {
    switch (type) {
      case "tab_switch":
        return "CHUYỂN TAB TRÌNH DUYỆT";
      case "window_blur":
        return "RỜI KHỎI CỬA SỔ BÀI THI";
      case "fullscreen_exit":
        return "THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH";
      case "devtools_open":
        return "CỐ TÌNH MỞ CÔNG CỤ DEVTOOLS";
      case "copy_paste_attempt":
        return "HÀNH VI SAO CHÉP ĐỀ THI";
      case "no_face":
        return "RỜI KHỎI MÀN HÌNH THI (KHÔNG THẤY MẶT)";
      case "multiple_faces":
        return "PHÁT HIỆN NHIỀU NGƯỜI TRONG CAMERA";
      case "looking_away":
        return "QUAY MẶT / NHÌN LỆCH HƯỚNG RA NGOÀI";
      default:
        return "VI PHẠM QUY CHẾ THI";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-center">
        {/* Glow hiệu ứng cảnh báo đỏ */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Huy hiệu cảnh báo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700/80 flex items-center justify-center text-3xl mb-4 shadow-inner">
          {isRevoked ? "⛔" : "⚠️"}
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 mb-2">
          {isRevoked
            ? "BÀI THI ĐÃ BỊ ĐÌNH CHỈ THI TỰ ĐỘNG"
            : `CẢNH BÁO VI PHẠM (LẦN ${violationCount}/${maxViolations})`}
        </span>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          {isRevoked ? "ĐÌNH CHỈ THI DO QUÁ SỐ LẦN VI PHẠM" : getViolationTitle(violationType)}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {description}
        </p>

        {/* Ảnh bằng chứng từ Webcam (nếu có) */}
        {evidenceSnapshot && (
          <div className="mb-4 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 inline-block">
            <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
              Ảnh bằng chứng vi phạm ghi nhận tự động:
            </span>
            <div className="relative w-48 h-36 mx-auto rounded-xl overflow-hidden border border-red-400">
              <Image
                src={evidenceSnapshot}
                alt="Ảnh bằng chứng vi phạm"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Cảnh báo hậu quả */}
        {!isRevoked ? (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 text-left mb-6">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <span>⚠️</span>
              <span>Lưu ý nghiêm ngặt:</span>
            </p>
            <p className="leading-relaxed">
              Mọi hành vi vi phạm đều được gửi <strong>thời gian thực về màn hình giám sát của Giám thị</strong>. Nếu vi phạm đủ <strong>{maxViolations} lần</strong>, bài thi sẽ bị <strong>tự động thu hồi và đình chỉ thi</strong> ngay lập tức!
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-800 dark:text-red-300 text-left mb-6">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <span>⛔</span>
              <span>Quy chế thi THPT Quốc Gia:</span>
            </p>
            <p className="leading-relaxed">
              Bạn đã vi phạm quy chế quá <strong>{maxViolations} lần</strong> quy định. Toàn bộ bài làm của bạn đã bị hủy bỏ và chuyển sang trạng thái <strong>Đình chỉ (Revoked)</strong>. Biên bản vi phạm và ảnh bằng chứng đã được chuyển về Hội đồng giám thị.
            </p>
          </div>
        )}

        {/* Nút hành động */}
        {!isRevoked ? (
          <button
            type="button"
            disabled={countdown > 0}
            onClick={onConfirmDismiss}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition shadow-lg cursor-pointer ${countdown > 0
                ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white active:scale-98 shadow-red-600/30"
              }`}
          >
            {countdown > 0
              ? `Tôi cam kết không vi phạm lại (${countdown}s)`
              : "Tôi cam kết quay lại làm bài ngay →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onExitRevokedExam}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white transition shadow-lg cursor-pointer"
          >
            Đóng bài thi & Xem biên bản vi phạm →
          </button>
        )}
      </div>
    </div>
  );
}
