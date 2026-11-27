"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type WebcamViolationType = "no_face" | "multiple_faces" | "looking_away";

export type FaceProctorStatus =
  | "initializing"
  | "ok"
  | "no_face"
  | "multiple_faces"
  | "looking_away"
  | "camera_error";

export interface DetectedFace {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface IWebcamProctorOptions {
  enabled?: boolean;
  onViolation?: (type: WebcamViolationType, description: string, snapshotBase64: string) => void;
}

interface MediaPipePoint {
  x: number;
  y: number;
}

interface MediaPipeBoundingBox {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

interface MediaPipeDetection {
  boundingBox: MediaPipeBoundingBox;
  landmarks: MediaPipePoint[];
}

interface MediaPipeResults {
  detections: MediaPipeDetection[];
}

type FaceDetectionInstance = {
  setOptions: (options: { model: string; minDetectionConfidence: number }) => void;
  onResults: (listener: (results: MediaPipeResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

type FaceDetectionConstructor = new (config: {
  locateFile: (file: string) => string;
}) => FaceDetectionInstance;

/**
 * Tải script MediaPipe FaceDetection cục bộ từ /mediapipe/face_detection/
 */
function loadMediaPipeFaceDetectionScript(): Promise<FaceDetectionConstructor> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Môi trường không có window"));
    }

    const win = window as unknown as { FaceDetection?: FaceDetectionConstructor };
    if (win.FaceDetection) {
      return resolve(win.FaceDetection);
    }

    const scriptId = "mediapipe-face-detection-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (win.FaceDetection) resolve(win.FaceDetection);
        else reject(new Error("FaceDetection không tìm thấy sau khi script tải"));
      });
      existingScript.addEventListener("error", () => reject(new Error("Lỗi tải script MediaPipe")));
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "/mediapipe/face_detection/face_detection.js";
    script.async = true;
    script.onload = () => {
      if (win.FaceDetection) {
        resolve(win.FaceDetection);
      } else {
        reject(new Error("FaceDetection không tồn tại trên window"));
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Kiểm tra xem khuôn mặt có đang nhìn lệch, quay đầu, nghiêng đầu hoặc cúi đầu không
 */
function checkIsLookingAway(detection: MediaPipeDetection): boolean {
  const box = detection.boundingBox;

  // 1. Nếu trọng tâm khuôn mặt lệch ra ngoài vùng trung tâm camera
  if (box.xCenter < 0.22 || box.xCenter > 0.78 || box.yCenter < 0.12 || box.yCenter > 0.88) {
    return true;
  }

  const lm = detection.landmarks;
  if (!lm || lm.length < 3) return false;

  const rightEye = lm[0];
  const leftEye = lm[1];
  const nose = lm[2];

  // Khoảng cách 2 mắt
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  if (eyeDist < 0.03) return false; // Quá nhỏ/quá xa

  // 2. Góc nghiêng đầu sang vai (Head Roll / Tilt)
  const eyeDeltaY = Math.abs(rightEye.y - leftEye.y);
  const eyeDeltaX = Math.abs(rightEye.x - leftEye.x) || 0.0001;
  const rollAngleDeg = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);
  // Nếu nghiêng đầu rõ rệt quá 22 độ (tránh bắt nhầm khi cử động cổ tự nhiên)
  if (rollAngleDeg > 22) {
    return true;
  }

  // 3. Góc quay mặt sang trái/phải (Head Yaw)
  // Đo độ lệch ngang của mũi so với trung điểm 2 mắt
  const midEyeX = (rightEye.x + leftEye.x) / 2;
  const noseOffsetRatio = Math.abs(nose.x - midEyeX) / eyeDist;
  // Nhìn thẳng: noseOffsetRatio < 0.14. Khi quay mặt rõ rệt > 25 độ: noseOffsetRatio > 0.25
  if (noseOffsetRatio > 0.25) {
    return true;
  }

  // 4. Tỉ lệ khoảng cách ngang từ mũi tới từng mắt
  const dxR = Math.abs(nose.x - rightEye.x);
  const dxL = Math.abs(nose.x - leftEye.x);
  const yawRatio = Math.min(dxR, dxL) / (Math.max(dxR, dxL) || 0.0001);
  // Nhìn thẳng: yawRatio ~ 0.7 - 1.0. Khi quay mặt nhìn lệch hẳn: yawRatio < 0.32
  if (yawRatio < 0.32) {
    return true;
  }

  // 5. Cúi đầu xuống xem tài liệu/điện thoại hoặc ngửa lên (Head Pitch)
  if (lm.length >= 4) {
    const mouth = lm[3];
    const eyeCenterY = (rightEye.y + leftEye.y) / 2;
    const noseEyeDistY = nose.y - eyeCenterY;
    const mouthNoseDistY = mouth.y - nose.y;
    const pitchRatio = noseEyeDistY / (mouthNoseDistY || 0.0001);

    // Cúi gằm mặt xuống bàn hoặc ngửa cổ
    if (pitchRatio > 2.2 || pitchRatio < 0.35) {
      return true;
    }
  }

  return false;
}

export function useWebcamProctor({ enabled = true, onViolation }: IWebcamProctorOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceProctorStatus>("initializing");
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lưu trữ số lần liên tiếp quan sát thấy hành vi bất thường (mỗi chu kỳ ~500ms)
  const abnormalCountsRef = useRef<{ [key: string]: number }>({
    no_face: 0,
    multiple_faces: 0,
    looking_away: 0,
  });

  const lastViolationTimeRef = useRef<number>(0);
  const isEnabledRef = useRef<boolean>(enabled);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  // Chụp ảnh bằng chứng
  const captureSnapshot = useCallback((): string => {
    if (!videoRef.current) return "";
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(
        `VIOLATION EVIDENCE - ${new Date().toLocaleTimeString("vi-VN")}`,
        10,
        canvas.height - 8
      );

      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (e) {
      console.warn("Lỗi chụp ảnh bằng chứng:", e);
      return "";
    }
  }, []);

  // Ngắt kết nối camera và giải phóng tài nguyên phần cứng
  const stopCamera = useCallback(() => {
    setStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch { }
        });
      }
      return null;
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setDetectedFaces([]);
    setFaceStatus("initializing");
  }, []);

  // 1. Khởi động Camera người dùng khi enabled === true, giải phóng khi tắt hoặc unmount
  useEffect(() => {
    if (!enabled) return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    let activeStream: MediaStream | null = null;
    let isCancelled = false;
    const currentVideoEl = videoRef.current;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => { });
        }
      } catch (err) {
        console.error("Không thể mở Webcam:", err);
        setFaceStatus("camera_error");
        setErrorMessage(
          "Không thể truy cập camera. Vui lòng cấp quyền truy cập webcam trên trình duyệt để tiếp tục làm bài thi."
        );
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (currentVideoEl) {
        currentVideoEl.srcObject = null;
      }
    };
  }, [enabled]);

  // 2. Khởi tạo MediaPipe Face Detection và chạy vòng lặp kiểm tra
  useEffect(() => {
    if (!stream || !enabled) return;

    let isCancelled = false;
    let timer: NodeJS.Timeout | null = null;
    let detectorInstance: FaceDetectionInstance | null = null;

    async function setupAndRun() {
      try {
        const FaceDetectorClass = await loadMediaPipeFaceDetectionScript();
        if (isCancelled) return;

        detectorInstance = new FaceDetectorClass({
          locateFile: (file: string) => `/mediapipe/face_detection/${file}`,
        });

        detectorInstance.setOptions({
          model: "short",
          minDetectionConfidence: 0.5,
        });

        // Xử lý kết quả trả về từ MediaPipe
        detectorInstance.onResults((results: MediaPipeResults) => {
          if (isCancelled) return;

          const detections = results.detections || [];

          // Cập nhật tọa độ hộp khuôn mặt để hiển thị overlay
          const boxes: DetectedFace[] = detections.map((d) => ({
            xCenter: d.boundingBox.xCenter,
            yCenter: d.boundingBox.yCenter,
            width: d.boundingBox.width,
            height: d.boundingBox.height,
          }));
          setDetectedFaces(boxes);

          let currentStatus: FaceProctorStatus = "ok";
          let violationToTrigger: WebcamViolationType | null = null;
          let violationDesc = "";

          // TRƯỜNG HỢP 1: Không có mặt nào (Rời khỏi ghế / che camera)
          if (detections.length === 0) {
            abnormalCountsRef.current.no_face += 1;
            abnormalCountsRef.current.multiple_faces = 0;
            abnormalCountsRef.current.looking_away = 0;

            if (abnormalCountsRef.current.no_face >= 2) {
              currentStatus = "no_face";
            }
            // Duy trì >= 5 chu kỳ (~2.5 giây)
            if (abnormalCountsRef.current.no_face >= 5) {
              violationToTrigger = "no_face";
              violationDesc = "Không phát hiện thấy thí sinh trước camera thi (đã quá 2.5 giây).";
            }
          }
          // TRƯỜNG HỢP 2: Phát hiện >= 2 khuôn mặt (Có người khác vào)
          else if (detections.length >= 2) {
            abnormalCountsRef.current.multiple_faces += 1;
            abnormalCountsRef.current.no_face = 0;
            abnormalCountsRef.current.looking_away = 0;

            if (abnormalCountsRef.current.multiple_faces >= 2) {
              currentStatus = "multiple_faces";
            }
            // Duy trì >= 3 chu kỳ (~2.5 giây)
            if (abnormalCountsRef.current.multiple_faces >= 5) {
              violationToTrigger = "multiple_faces";
              violationDesc = `Phát hiện có ${detections.length} người xuất hiện trong khung hình thi.`;
            }
          }
          // TRƯỜNG HỢP 3: Có 1 khuôn mặt -> kiểm tra nhìn lệch hướng
          else {
            const singleFace = detections[0];
            const isLookingAway = checkIsLookingAway(singleFace);

            if (isLookingAway) {
              abnormalCountsRef.current.looking_away += 1;
              abnormalCountsRef.current.no_face = 0;
              abnormalCountsRef.current.multiple_faces = 0;

              // Sau 2 chu kỳ (~900ms) đổi khung viền sang màu cam cảnh báo nhẹ trên camera
              if (abnormalCountsRef.current.looking_away >= 2) {
                currentStatus = "looking_away";
              }
              // Phải duy trì nhìn lệch liên tục >= 8 chu kỳ (~3.8 - 4 giây) mới hú còi báo động và tính vi phạm
              if (abnormalCountsRef.current.looking_away >= 8) {
                violationToTrigger = "looking_away";
                violationDesc = "Phát hiện thí sinh nhìn lệch / quay nghiêng mặt ra ngoài màn hình thi (kéo dài quá 3.8 giây).";
              }
            } else {
              // Trạng thái bình thường hợp lệ
              currentStatus = "ok";
              abnormalCountsRef.current.no_face = 0;
              abnormalCountsRef.current.multiple_faces = 0;
              abnormalCountsRef.current.looking_away = 0;
            }
          }

          setFaceStatus(currentStatus);

          // Kích hoạt vi phạm khi enabled === true và vượt ngưỡng thời gian
          if (isEnabledRef.current && violationToTrigger && onViolationRef.current) {
            const now = Date.now();
            if (now - lastViolationTimeRef.current >= 3500) {
              lastViolationTimeRef.current = now;
              const snapshot = captureSnapshot();
              onViolationRef.current(violationToTrigger, violationDesc, snapshot);
              abnormalCountsRef.current[violationToTrigger] = 0;
            }
          }
        });

        // Vòng lặp gửi frame hình ảnh vào MediaPipe mỗi 450ms
        const loop = async () => {
          if (isCancelled) return;
          const video = videoRef.current;

          // Tự động gán lại luồng camera nếu phần tử video bị re-mount (chuyển màn hình)
          if (video && stream && video.srcObject !== stream) {
            video.srcObject = stream;
            video.play().catch(() => { });
          }

          if (
            video &&
            video.readyState >= 2 &&
            !video.paused &&
            detectorInstance
          ) {
            try {
              await detectorInstance.send({ image: video });
            } catch (frameErr) {
              console.warn("Lỗi frame MediaPipe:", frameErr);
            }
          }
          timer = setTimeout(loop, 450);
        };

        setFaceStatus("ok");
        loop();
      } catch (err) {
        console.error("Lỗi khởi tạo MediaPipe Face Detection:", err);
        // Fallback: nếu trình duyệt không hỗ trợ WebAssembly thì giữ ok để không chặn thi
        setFaceStatus("ok");
      }
    }

    setupAndRun();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (detectorInstance && detectorInstance.close) {
        try {
          detectorInstance.close();
        } catch { }
      }
    };
  }, [stream, enabled, captureSnapshot]);

  return {
    videoRef,
    canvasRef,
    stream,
    faceStatus,
    detectedFaces,
    errorMessage,
    hasCamera: !!stream,
    captureSnapshot,
    stopCamera,
    simulateStatus: (status: FaceProctorStatus, desc?: string) => {
      setFaceStatus(status);
      if (status !== "ok" && status !== "camera_error" && status !== "initializing") {
        const snap = captureSnapshot();
        if (onViolationRef.current) {
          onViolationRef.current(status, desc || `Giả lập vi phạm: ${status}`, snap);
        }
      }
    },
  };
}
