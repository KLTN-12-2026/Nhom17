"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_image: string;
  teacher_name: string;
  stage_count: number;
  content_count: number;
  is_purchased: boolean;
  completion_percentage: number;
}
interface RoadmapContent {
  id: string;
  content_type: string;
  title: string;
  order: number;
}
interface RoadmapStage {
  id: string;
  stage_title: string;
  order: number;
  description: string;
  contents: RoadmapContent[];
}
interface RoadmapDetail extends RoadmapItem {
  completed_content_ids: string[];
  stages: RoadmapStage[];
}
interface OrderItem {
  id: string;
  order_code: string;
  roadmap_id: string;
  roadmap_title: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}
interface OrderDetail extends OrderItem {
  cover_image: string;
  paid_at: string | null;
}
interface VietQrData {
  bank_id: string;
  account_no: string;
  account_name: string;
  transfer_content: string;
  amount: number;
  qr_url: string;
}
interface OrderCheckoutPayload {
  success: boolean;
  message?: string;
  error?: string;
  order?: OrderDetail;
  vietqr?: VietQrData | null;
  sepay_sync_enabled?: boolean;
  demo_payment_enabled?: boolean;
}
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

const money = (amount: number) =>
  amount <= 0 ? "Miễn phí" : `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
const statusLabel: Record<string, string> = {
  pending: "Chờ thanh toán",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

async function getApiData<T>(url: string, key: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as ApiResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || "Không thể tải dữ liệu.");
  }
  return data[key] as T;
}

export function RoadmapCatalogView() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getApiData<RoadmapItem[]>("/api/student/roadmaps", "roadmaps")
      .then((roadmaps) => {
        if (!cancelled) setItems(roadmaps);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="py-16 text-center text-sm text-slate-500">Đang tải lộ trình ôn luyện...</p>;
  }
  if (error) {
    return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-violet-800 p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">Lộ trình ôn luyện có hướng dẫn</p>
        <h2 className="mt-2 text-2xl font-black">Chuẩn bị kỳ thi theo từng giai đoạn</h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">Chọn lộ trình phù hợp, theo dõi tiến độ học tập và tiếp tục ôn luyện đúng phần còn thiếu.</p>
        <Link href="/student/orders" className="mt-5 inline-flex rounded-xl bg-white/15 px-4 py-2 text-xs font-bold hover:bg-white/25">Lịch sử đơn hàng →</Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">Hiện chưa có lộ trình được xuất bản.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 text-5xl dark:from-slate-800 dark:to-indigo-950">
                {item.cover_image ? (
                  <Image src={item.cover_image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
                ) : "📚"}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{money(item.price)}</span>
                </div>
                <p className="line-clamp-3 min-h-12 text-sm text-slate-500">{item.description || "Lộ trình luyện tập theo từng giai đoạn."}</p>
                <div className="flex gap-4 text-xs text-slate-500"><span>{item.stage_count} giai đoạn</span><span>{item.content_count} nội dung</span><span>{item.teacher_name}</span></div>
                {item.is_purchased && <div className="text-xs font-bold text-emerald-700">Đã sở hữu · Hoàn thành {item.completion_percentage}%</div>}
                <Link href={`/student/roadmaps/${item.id}`} className="block rounded-xl bg-slate-900 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-indigo-700 dark:bg-white dark:text-slate-900">{item.is_purchased ? "Tiếp tục học" : "Xem lộ trình"} →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoadmapDetailView({ roadmapId }: { roadmapId: string }) {
  const [roadmap, setRoadmap] = useState<RoadmapDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getApiData<RoadmapDetail>(`/api/student/roadmaps/${roadmapId}`, "roadmap")
      .then((data) => {
        if (!cancelled) setRoadmap(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
      });
    return () => {
      cancelled = true;
    };
  }, [roadmapId]);

  const completeContent = async (contentId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/student/roadmaps/${roadmapId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId, completed }),
      });
      const data = (await response.json()) as ApiResponse & {
        progress?: { completion_percentage: number; completed_content_ids: string[] };
      };
      if (!response.ok || !data.success || !data.progress) {
        throw new Error(data.message || data.error || "Không lưu được tiến độ.");
      }
      setRoadmap((current) => current ? { ...current, ...data.progress } : current);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
    }
  };

  const purchase = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/student/roadmaps/${roadmapId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: "banking" }),
      });
      const data = (await response.json()) as ApiResponse & { redirect_url?: string };
      if (!response.ok && response.status !== 202) {
        throw new Error(data.message || data.error || "Không tạo được đơn hàng.");
      }
      if (!data.redirect_url) throw new Error("Không nhận được đường dẫn đơn hàng.");
      window.location.href = data.redirect_url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
      setBusy(false);
    }
  };

  if (error && !roadmap) {
    return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  }
  if (!roadmap) return <p className="py-16 text-center text-sm text-slate-500">Đang tải chi tiết lộ trình...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Lộ trình ôn luyện</p>
        <h2 className="mt-2 text-3xl font-black">{roadmap.title}</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">{roadmap.description}</p>
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-300"><span>{roadmap.stage_count} giai đoạn</span><span>{roadmap.content_count} nội dung</span><span>Giảng viên: {roadmap.teacher_name}</span></div>
      </section>
      {!roadmap.is_purchased ? (
        <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs text-slate-500">Giá lộ trình</p><p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{money(roadmap.price)}</p></div>
            <div className="flex flex-wrap items-center gap-3">
              {roadmap.price > 0 && (
                <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                  Chuyển khoản MB Bank (VietQR)
                </span>
              )}
              <button onClick={purchase} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {busy ? "Đang tạo đơn..." : roadmap.price <= 0 ? "Nhận lộ trình miễn phí" : "Thanh toán qua MB Bank"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Đơn có phí sẽ chờ cổng thanh toán xác nhận. Quyền truy cập chỉ được cấp sau khi đơn thanh toán thành công.</p>
          {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
        </section>
      ) : (
        <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex justify-between text-sm font-bold"><span>Tiến độ học tập</span><span>{roadmap.completion_percentage}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${roadmap.completion_percentage}%` }} /></div>
        </section>
      )}
      {error && roadmap.is_purchased && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-4">
        {roadmap.stages.map((stage) => (
          <section key={stage.id} className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{stage.order}</span><div><h3 className="font-bold">{stage.stage_title}</h3><p className="mt-1 text-sm text-slate-500">{stage.description}</p></div></div>
            <div className="mt-4 space-y-2">
              {stage.contents.map((content) => {
                const done = roadmap.completed_content_ids.includes(content.id);
                return <label key={content.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={done} disabled={!roadmap.is_purchased} onChange={(event) => void completeContent(content.id, event.target.checked)} /><span className="text-xs font-bold uppercase text-slate-400">{content.content_type}</span><span className="flex-1">{content.title}</span>{done && <span className="text-xs font-bold text-emerald-600">Hoàn thành</span>}</label>;
              })}
              {stage.contents.length === 0 && <p className="text-xs text-slate-400">Chưa có nội dung trong giai đoạn này.</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function StudentOrdersView() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getApiData<OrderItem[]>("/api/student/orders", "orders")
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="py-12 text-center text-sm text-slate-500">Đang tải đơn hàng...</p>;
  if (error) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  return (
    <div className="space-y-3">
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">Bạn chưa có đơn hàng nào. <Link className="font-bold text-indigo-600" href="/student/roadmaps">Khám phá lộ trình →</Link></div>
      ) : orders.map((order) => (
        <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div><h3 className="font-bold">{order.roadmap_title}</h3><p className="mt-1 text-xs text-slate-500">Mã {order.order_code} · {new Date(order.created_at).toLocaleString("vi-VN")}</p></div>
          <div className="flex items-center gap-3"><div className="text-right"><p className="font-black">{money(order.amount)}</p><p className={`text-xs font-bold ${order.status === "completed" ? "text-emerald-600" : "text-amber-600"}`}>{statusLabel[order.status] || order.status}</p></div>{order.status === "pending" && <Link href={`/student/orders/${order.id}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Thanh toán</Link>}{order.status === "completed" && <Link href={`/student/roadmaps/${order.roadmap_id}`} className="rounded-lg border px-3 py-2 text-xs font-bold">Vào học</Link>}</div>
        </div>
      ))}
    </div>
  );
}

async function fetchOrderCheckout(orderId: string) {
  const response = await fetch(`/api/student/orders/${orderId}`, { cache: "no-store" });
  const data = (await response.json()) as OrderCheckoutPayload;
  if (!response.ok || !data.success || !data.order) {
    throw new Error(data.message || data.error || "Không thể tải đơn hàng.");
  }
  return data;
}

export function OrderCheckoutView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [vietqr, setVietqr] = useState<VietQrData | null>(null);
  const [sepaySyncEnabled, setSepaySyncEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchOrderCheckout(orderId)
      .then((data) => {
        if (cancelled) return;
        setOrder(data.order || null);
        setVietqr(data.vietqr || null);
        setSepaySyncEnabled(Boolean(data.sepay_sync_enabled));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const orderStatus = order?.status;
  useEffect(() => {
    if (orderStatus !== "pending") return;
    const timer = window.setInterval(() => {
      fetchOrderCheckout(orderId)
        .then((data) => {
          if (!data.order) return;
          setOrder(data.order);
          setVietqr(data.vietqr || null);
          setSepaySyncEnabled(Boolean(data.sepay_sync_enabled));
        })
        .catch(() => {
          // Bỏ qua lỗi mạng tạm thời khi polling trạng thái đơn
        });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [orderStatus, orderId]);

  const checkNow = async () => {
    setChecking(true);
    setCheckNote("");
    setError("");
    try {
      const updated = await fetchOrderCheckout(orderId);
      setOrder(updated.order || null);
      setVietqr(updated.vietqr || null);
      setSepaySyncEnabled(Boolean(updated.sepay_sync_enabled));
      if (updated.order?.status === "pending") {
        setCheckNote(
          updated.sepay_sync_enabled
            ? "Chưa thấy giao dịch khớp trong SePay. Nếu bạn vừa chuyển khoản, hãy đợi vài giây rồi bấm kiểm tra lại."
            : "Vui lòng thanh toán. Nếu bạn đã chuyển khoản, hệ thống đang chờ xác nhận từ ngân hàng.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
    } finally {
      setChecking(false);
    }
  };

  const copyTransferContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  if (loading) return <p className="py-12 text-center text-sm text-slate-500">Đang tải thanh toán...</p>;
  if (!order) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error || "Không tìm thấy đơn hàng."}</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Thanh toán lộ trình</p><h2 className="mt-2 text-2xl font-black">{order.roadmap_title}</h2>
        <div className="mt-5 space-y-3 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Mã đơn</span><strong>{order.order_code}</strong></div><div className="flex justify-between"><span className="text-slate-500">Phương thức</span><strong>{order.payment_method === "free" ? "Miễn phí" : "MB Bank (VietQR)"}</strong></div><div className="flex justify-between"><span className="text-slate-500">Tổng thanh toán</span><strong className="text-xl">{money(order.amount)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Trạng thái</span><strong className={order.status === "completed" ? "text-emerald-600" : "text-amber-600"}>{statusLabel[order.status] || order.status}</strong></div></div>
      </div>
      {order.status === "completed" ? (
        <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">Thanh toán thành công. <Link className="font-bold underline" href={`/student/roadmaps/${order.roadmap_id}`}>Vào lộ trình học →</Link></div>
      ) : (
        <div className="space-y-4">
          {vietqr ? (
            <div className="rounded-3xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Quét mã VietQR để thanh toán</p>
              <p className="mt-1 text-xs text-slate-500">Hệ thống tự động kiểm tra giao dịch mỗi 4 giây sau khi bạn chuyển khoản đúng nội dung.</p>
              <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vietqr.qr_url} alt={`Mã QR thanh toán ${order.order_code}`} className="h-56 w-56 rounded-2xl border bg-white p-2 object-contain" />
                <div className="flex-1 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4 border-b pb-2"><span className="text-slate-500">Ngân hàng</span><strong>{vietqr.bank_id}</strong></div>
                  <div className="flex justify-between gap-4 border-b pb-2"><span className="text-slate-500">Số tài khoản</span><strong>{vietqr.account_no}</strong></div>
                  {vietqr.account_name && <div className="flex justify-between gap-4 border-b pb-2"><span className="text-slate-500">Chủ tài khoản</span><strong>{vietqr.account_name}</strong></div>}
                  <div className="flex justify-between gap-4 border-b pb-2"><span className="text-slate-500">Số tiền</span><strong className="text-indigo-600">{money(vietqr.amount)}</strong></div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Nội dung CK</span>
                    <div className="flex items-center gap-2">
                      <strong className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">{vietqr.transfer_content}</strong>
                      <button type="button" onClick={() => void copyTransferContent(vietqr.transfer_content)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                        {copied ? "Đã chép" : "Chép"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <strong>Đơn hàng đang chờ xác nhận.</strong>
              <p className="mt-2">Chưa cấu hình <code>VIETQR_BANK_ID</code> / <code>VIETQR_ACCOUNT_NO</code> trong <code>.env.local</code> để hiển thị mã QR chuyển khoản.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {sepaySyncEnabled
                ? "Đang tự động đối soát giao dịch qua SePay mỗi 4 giây."
                : "Vui lòng thanh toán bằng mã QR phía trên. Trạng thái sẽ tự động cập nhật sau khi nhận được tiền."}
            </p>
            <button
              type="button"
              onClick={() => void checkNow()}
              disabled={checking}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {checking ? "Đang kiểm tra..." : "Tôi đã chuyển khoản — Kiểm tra ngay"}
            </button>
          </div>
          {checkNote && <p className="text-xs text-amber-700 dark:text-amber-300">{checkNote}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
