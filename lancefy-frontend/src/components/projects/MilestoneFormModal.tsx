import { useState } from "react";
import type { MilestoneBoardItem } from "@/services/projects/project.types";
import { createMilestone, updateMilestone, type MilestonePayload } from "@/services/projects/project";
import { useToast } from "@/components/ui/Toast";

interface MilestoneFormModalProps {
  projectId: string;
  defaultCurrency?: string;
  editItem?: MilestoneBoardItem;
  onClose: () => void;
  onSaved: () => void;
}

export default function MilestoneFormModal({
  projectId,
  defaultCurrency = "THB",
  editItem,
  onClose,
  onSaved,
}: MilestoneFormModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [amount, setAmount] = useState(editItem?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(editItem?.currency ?? defaultCurrency);
  const [dueDate, setDueDate] = useState(editItem?.due_date?.slice(0, 10) ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("กรุณาระบุชื่อ milestone");
      return;
    }
    const payload: MilestonePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
      currency: currency || undefined,
      due_date: dueDate || undefined,
    };
    try {
      setSubmitting(true);
      setError(null);
      if (editItem) {
        await updateMilestone(projectId, editItem.id, payload);
        showToast("แก้ไข Milestone เรียบร้อย", "success");
      } else {
        await createMilestone(projectId, payload);
        showToast("เพิ่ม Milestone เรียบร้อย", "success");
      }
      onSaved();
      onClose();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {editItem ? "แก้ไข Milestone" : "เพิ่ม Milestone"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              ชื่อ Milestone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="เช่น ออกแบบ UI หน้า Dashboard"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              รายละเอียด
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="อธิบายงานในขั้นตอนนี้"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                จำนวนเงิน
              </label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                สกุลเงิน
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="THB">THB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              วันครบกำหนด
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-accent text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? "กำลังบันทึก..." : editItem ? "บันทึกการแก้ไข" : "เพิ่ม Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
