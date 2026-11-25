"use client";

import React, { useState } from "react";
import { FaceProctorStatus, DetectedFace } from "@/hooks/useWebcamProctor";

interface WebcamProctorViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stream?: MediaStream | null;
  faceStatus: FaceProctorStatus;
  detectedFaces?: DetectedFace[];
  errorMessage: string | null;
  hasCamera: boolean;
  variant?: "floating" | "checkin" | "sidebar";
  onSimulateNoFace?: () => void;
  onSimulateMultipleFaces?: () => void;
  onSimulateLookingAway?: () => void;
  showDevControls?: boolean;
}

export default function WebcamProctorView({
  videoRef,
  canvasRef,
  stream,
  faceStatus,
  detectedFaces = [],
  errorMessage,
  hasCamera,
  variant = "floating",
  onSimulateNoFace,
  onSimulateMultipleFaces,
  onSimulateLookingAway,
  showDevControls = false,
}: WebcamProctorViewProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Đảm bảo video luôn được gắn luồng MediaStream khi component mount/remount
  React.useEffect(() => {
    const video = videoRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => { });
    }
  }, [stream, videoRef]);

  // Cấu hình nhãn và màu sắc tương ứng theo trạng thái AI
  let badgeText = "Đang kết nối camera...";
  let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
  let pulseColor = "bg-slate-400";

  switch (faceStatus) {
    case "ok":
      badgeText = "✓ Khuôn mặt hợp lệ";
      badgeColor = "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
      pulseColor = "bg-emerald-400";
      break;
    case "no_face":
      badgeText = "⚠️ Không thấy khuôn mặt";
      badgeColor = "bg-red-950/90 text-red-300 border-red-700 animate-pulse";
      pulseColor = "bg-red-500";
      break;
    case "multiple_faces":
      badgeText = `⚠️ Phát hiện nhiều người (${detectedFaces.length || 2})`;
      badgeColor = "bg-red-950/90 text-red-300 border-red-700 animate-pulse";
      pulseColor = "bg-red-500";
      break;
    case "looking_away":
      badgeText = "⚠️ Đang nhìn lệch hướng";
      badgeColor = "bg-amber-950/90 text-amber-300 border-amber-700 animate-pulse";
      pulseColor = "bg-amber-400";
      break;
    case "camera_error":
      badgeText = "❌ Lỗi webcam";
      badgeColor = "bg-red-950 text-red-400 border-red-800";
      pulseColor = "bg-red-600";
      break;
  }

  // Render các hộp nhận diện khuôn mặt động (Bounding Boxes)
  const renderFaceBoxes = () => {
    if (!detectedFaces || detectedFaces.length === 0) return null;

    return detectedFaces.map((face, idx) => {
      // Do video bị lật gương (scale-x-100), lật tọa độ X tương ứng
      const mirroredXCenter = 1 - face.xCenter;
      const left = Math.max(0, (mirroredXCenter - face.width / 2) * 100);
      const top = Math.max(0, (face.yCenter - face.height / 2) * 100);
      const width = Math.min(100 - left, face.width * 100);
      const height = Math.min(100 - top, face.height * 100);

      const isMultiple = detectedFaces.length >= 2;
      const isLookingAway = faceStatus === "looking_away";

      const borderColor = isMultiple
        ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]"
        : isLookingAway
          ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
          : "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]";

      const badgeBg = isMultiple
        ? "bg-red-600 text-white"
        : isLookingAway
          ? "bg-amber-600 text-white"
          : "bg-emerald-600 text-white";

      const label = isMultiple
        ? `Người #${idx + 1}`
        : isLookingAway
          ? "Nhìn lệch"
          : "Hợp lệ";

      return (
        <div
          key={idx}
          className={`absolute border-2 rounded-xl pointer-events-none transition-all duration-150 ${borderColor}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        >
          {/* 4 Góc trang trí */}
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

          {/* Tag nhãn nhỏ phía trên hộp */}
          <span
            className={`absolute -top-4 left-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeBg}`}
          >
            {label}
          </span>
        </div>
      );
    });
  };

  // Giao diện lớn cho Màn hình Check-in trước khi bắt đầu thi
  if (variant === "checkin") {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="relative aspect-4/3 w-full max-w-xs rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex items-center justify-center mb-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Bounding Boxes nhận diện khuôn mặt thực tế */}
          {renderFaceBoxes()}

          {/* Hộp mặc định nếu chưa phát hiện tọa độ nhưng camera đã mở */}
          {detectedFaces.length === 0 && faceStatus === "ok" && (
            <div className="absolute inset-6 border border-emerald-500/50 rounded-xl pointer-events-none">
              <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
            </div>
          )}

          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950 text-slate-400">
              <span className="text-2xl mb-1">📷</span>
              <span className="text-xs text-red-400 font-bold">
                {errorMessage || "Chưa cấp quyền Webcam"}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Vui lòng bấm &ldquo;Cho phép&rdquo; trên trình duyệt để tiếp tục.
              </span>
            </div>
          )}
        </div>

        <div className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${badgeColor}`}>
          {badgeText}
        </div>
      </div>
    );
  }

  // Giao diện nhúng trực tiếp trong Sidebar cột phụ trang làm bài thi
  if (variant === "sidebar") {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${pulseColor} animate-ping`} />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Camera Giám Sát AI
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Live</span>
        </div>

        <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Bounding Box nhận diện động từ MediaPipe */}
          {renderFaceBoxes()}

          {/* Bounding Box mặc định khi chưa có tọa độ */}
          {detectedFaces.length === 0 && faceStatus === "ok" && (
            <div className="absolute inset-4 border border-emerald-500/50 rounded-xl pointer-events-none transition-all duration-300">
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
            </div>
          )}

          {/* Cảnh báo vi phạm đỏ khi mất mặt hoàn toàn */}
          {faceStatus === "no_face" && (
            <div className="absolute inset-0 bg-red-600/20 border-2 border-red-500 rounded-xl flex items-center justify-center pointer-events-none animate-pulse">
              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                Mất khuôn mặt
              </span>
            </div>
          )}

          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950 text-slate-400">
              <span className="text-xl mb-1">📷</span>
              <span className="text-[11px] leading-tight text-red-400 font-medium">
                {errorMessage || "Chưa cấp quyền Webcam"}
              </span>
            </div>
          )}
        </div>

        <div className={`w-full text-center py-1.5 px-2 rounded-xl text-xs font-bold border transition ${badgeColor}`}>
          {badgeText}
        </div>
      </div>
    );
  }

  // Giao diện widget nổi ở góc màn hình khi đang làm bài thi
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 select-none">
      <div
        className={`bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${isMinimized ? "w-48 p-2.5" : "w-56 sm:w-64 p-3"
          }`}
      >
        {/* Header Widget */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${pulseColor} animate-ping`} />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
              AI Proctoring
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-white text-xs p-0.5 rounded cursor-pointer transition"
            title={isMinimized ? "Phóng to" : "Thu nhỏ"}
          >
            {isMinimized ? "▲" : "▼"}
          </button>
        </div>

        {/* Khung hình Webcam */}
        {!isMinimized && (
          <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Bounding Box nhận diện động từ MediaPipe */}
            {renderFaceBoxes()}

            {/* Bounding Box mặc định khi chưa có tọa độ */}
            {detectedFaces.length === 0 && faceStatus === "ok" && (
              <div className="absolute inset-5 border border-emerald-500/50 rounded-xl pointer-events-none transition-all duration-300">
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
                <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
              </div>
            )}

            {/* Cảnh báo vi phạm đỏ khi mất mặt hoàn toàn */}
            {faceStatus === "no_face" && (
              <div className="absolute inset-0 bg-red-600/20 border-2 border-red-500 rounded-xl flex items-center justify-center pointer-events-none animate-pulse">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                  Mất khuôn mặt
                </span>
              </div>
            )}

            {/* Báo lỗi nếu không có camera */}
            {!hasCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950 text-slate-400">
                <span className="text-xl mb-1">📷</span>
                <span className="text-[10px] leading-tight text-red-400 font-medium">
                  {errorMessage || "Chưa cấp quyền Webcam"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Trạng thái AI hiện tại */}
        <div className="mt-2">
          <div
            className={`w-full text-center py-1 px-2 rounded-lg text-[10.5px] font-bold border transition-colors ${badgeColor}`}
          >
            {badgeText}
          </div>
        </div>

        {/* Nút bấm kiểm thử nhanh */}
        {showDevControls && !isMinimized && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80">
            <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              🧪 Giả lập vi phạm (Test)
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={onSimulateNoFace}
                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 transition cursor-pointer"
              >
                Mất mặt
              </button>
              <button
                type="button"
                onClick={onSimulateMultipleFaces}
                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 transition cursor-pointer"
              >
                2 Người
              </button>
              <button
                type="button"
                onClick={onSimulateLookingAway}
                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-amber-900/60 text-slate-300 hover:text-amber-200 border border-slate-700 transition cursor-pointer"
              >
                Quay đi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
