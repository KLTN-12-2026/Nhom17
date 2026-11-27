"use client";

import { useCallback, useEffect, useState } from "react";

type Content = { content_type: "exam" | "practice" | "lesson"; title: string; order: number };
type Stage = { stage_title: string; description: string; order: number; contents: Content[] };
type Roadmap = { _id: string; title: string; description?: string; price: number; cover_image?: string; is_published: boolean; stages: Stage[] };
type Editor = Omit<Roadmap, "_id">;
const emptyEditor = (): Editor => ({ title: "", description: "", price: 0, cover_image: "", is_published: false, stages: [{ stage_title: "Giai đoạn 1", description: "", order: 1, contents: [] }] });

export default function InstructorRoadmapsView() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/instructor/roadmaps", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Không thể tải lộ trình.");
      setRoadmaps(data.roadmaps || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (roadmap: Roadmap) => {
    setEditingId(roadmap._id);
    setEditor({ title: roadmap.title, description: roadmap.description || "", price: roadmap.price, cover_image: roadmap.cover_image || "", is_published: roadmap.is_published, stages: roadmap.stages?.length ? roadmap.stages : [] });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (publish: boolean) => {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...editor, is_published: publish };
      const response = await fetch(editingId ? `/api/instructor/roadmaps/${editingId}` : "/api/instructor/roadmaps", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Không lưu được lộ trình.");
      setNotice(data.message || "Đã lưu lộ trình.");
      setEditingId(""); setEditor(emptyEditor()); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa lộ trình này?")) return;
    try {
      const response = await fetch(`/api/instructor/roadmaps/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Không xóa được lộ trình.");
      setNotice(data.message); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra."); }
  };

  const updateStage = (index: number, patch: Partial<Stage>) => setEditor((current) => ({ ...current, stages: current.stages.map((stage, i) => i === index ? { ...stage, ...patch } : stage) }));
  const addStage = () => setEditor((current) => ({ ...current, stages: [...current.stages, { stage_title: `Giai đoạn ${current.stages.length + 1}`, description: "", order: current.stages.length + 1, contents: [] }] }));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">{editingId ? "Chỉnh sửa lộ trình" : "Tạo lộ trình mới"}</h2><p className="mt-1 text-sm text-slate-500">Bản nháp chỉ bạn thấy; xuất bản xong học sinh mới xem được.</p></div>{editingId && <button onClick={() => { setEditingId(""); setEditor(emptyEditor()); }} className="rounded-lg border px-3 py-2 text-sm">Hủy sửa</button>}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Tên lộ trình<input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal dark:border-slate-700 dark:bg-slate-800" placeholder="Ví dụ: Ôn thi Toán 12" /></label>
          <label className="text-sm font-semibold">Giá (VND)<input type="number" min="0" value={editor.price} onChange={(e) => setEditor({ ...editor, price: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-3 font-normal dark:border-slate-700 dark:bg-slate-800" /></label>
          <label className="text-sm font-semibold md:col-span-2">Mô tả<textarea value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border p-3 font-normal dark:border-slate-700 dark:bg-slate-800" /></label>
          <label className="text-sm font-semibold md:col-span-2">URL ảnh bìa<input value={editor.cover_image} onChange={(e) => setEditor({ ...editor, cover_image: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal dark:border-slate-700 dark:bg-slate-800" placeholder="https://..." /></label>
        </div>
        <div className="mt-6 space-y-4">
          {editor.stages.map((stage, stageIndex) => <section key={stageIndex} className="rounded-xl border p-4 dark:border-slate-700">
            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><input aria-label="Tên giai đoạn" value={stage.stage_title} onChange={(e) => updateStage(stageIndex, { stage_title: e.target.value })} className="rounded-lg border p-2.5 dark:border-slate-700 dark:bg-slate-800" /><input aria-label="Mô tả giai đoạn" value={stage.description} onChange={(e) => updateStage(stageIndex, { description: e.target.value })} placeholder="Mô tả giai đoạn" className="rounded-lg border p-2.5 dark:border-slate-700 dark:bg-slate-800" /><button onClick={() => setEditor((current) => ({ ...current, stages: current.stages.filter((_, i) => i !== stageIndex).map((s, i) => ({ ...s, order: i + 1 })) }))} className="rounded-lg px-3 text-sm text-rose-600">Xóa giai đoạn</button></div>
            <div className="mt-3 space-y-2">{stage.contents.map((content, contentIndex) => <div key={contentIndex} className="grid gap-2 md:grid-cols-[160px_1fr_auto]"><select aria-label="Loại nội dung" value={content.content_type} onChange={(e) => { const contents = stage.contents.map((c, i) => i === contentIndex ? { ...c, content_type: e.target.value as Content["content_type"] } : c); updateStage(stageIndex, { contents }); }} className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800"><option value="lesson">Bài học</option><option value="practice">Luyện tập</option><option value="exam">Đề thi</option></select><input aria-label="Tên nội dung" value={content.title} onChange={(e) => { const contents = stage.contents.map((c, i) => i === contentIndex ? { ...c, title: e.target.value } : c); updateStage(stageIndex, { contents }); }} placeholder="Tên nội dung" className="rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800" /><button onClick={() => updateStage(stageIndex, { contents: stage.contents.filter((_, i) => i !== contentIndex).map((c, i) => ({ ...c, order: i + 1 })) })} className="px-2 text-sm text-rose-600">Xóa</button></div>)}</div>
            <button onClick={() => updateStage(stageIndex, { contents: [...stage.contents, { content_type: "lesson", title: "", order: stage.contents.length + 1 }] })} className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800">+ Thêm nội dung</button>
          </section>)}
          <button onClick={addStage} className="rounded-lg border px-3 py-2 text-sm font-bold dark:border-slate-700">+ Thêm giai đoạn</button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-emerald-700">{notice}</p>}
        <div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} onClick={() => void save(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu bản nháp"}</button><button disabled={saving} onClick={() => void save(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Xuất bản cho học sinh</button></div>
      </section>
      <section className="space-y-3"><h2 className="text-lg font-black">Lộ trình của bạn</h2>{loading ? <p className="text-sm text-slate-500">Đang tải...</p> : roadmaps.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">Chưa có lộ trình nào.</p> : roadmaps.map((roadmap) => <article key={roadmap._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div><h3 className="font-bold">{roadmap.title}</h3><p className="mt-1 text-xs text-slate-500">{roadmap.stages?.length || 0} giai đoạn · {new Intl.NumberFormat("vi-VN").format(roadmap.price)} ₫ · {roadmap.is_published ? "Đã xuất bản" : "Bản nháp"}</p></div><div className="flex gap-2"><button onClick={() => edit(roadmap)} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700">Chỉnh sửa</button><button onClick={() => void remove(roadmap._id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">Xóa</button></div></article>)}</section>
    </div>
  );
}
