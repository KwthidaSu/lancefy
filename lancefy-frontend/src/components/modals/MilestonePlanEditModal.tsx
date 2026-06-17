import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { HiOutlineLockClosed, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { MdDragIndicator } from "react-icons/md";

import type { MilestoneBoardItem } from "@/services/projects/project.types";
import {
  createMilestone,
  deleteMilestone,
  proposeMilestonePlan,
  resequenceMilestones,
  updateMilestone,
} from "@/services/projects/project";
import { useToast } from "@/components/ui/Toast";

// ---------- helpers ----------

let _keyCounter = 0;
function newKey() {
  _keyCounter += 1;
  return `new-${_keyCounter}`;
}

const LOCKED_SUBMISSION = ["submitted", "approved", "revision_requested", "paid"];
const LOCKED_FUNDING = ["funded", "released"];

function isLocked(m: MilestoneBoardItem): boolean {
  return (
    LOCKED_SUBMISSION.includes(m.submission_status ?? "") ||
    LOCKED_FUNDING.includes(m.funding_status ?? "")
  );
}

// ---------- types ----------

type EditItem = {
  _key: string;
  id?: string;
  title: string;
  description: string;
  amount: string;
  due_date: string;
  locked: boolean;
  isDirty: boolean;
  isNew: boolean;
};

type Props = {
  open: boolean;
  projectId: string;
  milestones: MilestoneBoardItem[];
  projectCurrency?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function MilestonePlanEditModal({
  open,
  projectId,
  milestones,
  projectCurrency,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [items, setItems] = useState<EditItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // track which id's were in the original list so we know what to delete
  const originalIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const list: EditItem[] = milestones.map((m) => ({
      _key: m.id,
      id: m.id,
      title: m.title ?? "",
      description: m.description ?? "",
      amount: m.amount != null ? String(m.amount) : "",
      due_date: m.due_date ?? "",
      locked: isLocked(m),
      isDirty: false,
      isNew: false,
    }));
    setItems(list);
    originalIdsRef.current = new Set(milestones.map((m) => m.id));
    setSaveError(null);
  }, [open, milestones]);

  if (!open) return null;

  // ---------- item manipulation ----------

  function insertAt(index: number) {
    const next: EditItem = {
      _key: newKey(),
      title: "",
      description: "",
      amount: "",
      due_date: "",
      locked: false,
      isDirty: true,
      isNew: true,
    };
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 0, next);
      return copy;
    });
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(key: string, field: keyof EditItem, value: string) {
    setItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, [field]: value, isDirty: true } : item
      )
    );
  }

  // ---------- validation ----------

  function validate(): string | null {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title.trim()) {
        return `Milestone #${i + 1}: title is required`;
      }
      if (item.amount && Number.isNaN(Number(item.amount))) {
        return `Milestone #${i + 1}: invalid amount`;
      }
    }
    return null;
  }

  // ---------- save ----------

  async function handleSave() {
    const err = validate();
    if (err) {
      setSaveError(err);
      return;
    }
    setSaveError(null);
    setSaving(true);

    try {
      // 1. Deletes: original IDs no longer in list
      const currentIds = new Set(items.filter((i) => i.id).map((i) => i.id!));
      const toDelete = [...originalIdsRef.current].filter((id) => !currentIds.has(id));
      for (const id of toDelete) {
        await deleteMilestone(projectId, id);
      }

      // 2. Creates & updates; collect resolved IDs in order
      const resolvedIds: Array<{ _key: string; id: string }> = [];

      for (const item of items) {
        if (item.isNew) {
          const payload = {
            title: item.title.trim(),
            description: item.description.trim() || undefined,
            amount: item.amount ? Number(item.amount) : undefined,
            due_date: item.due_date || undefined,
            sequence: 1, // will be fixed by resequence
          };
          const res = await createMilestone(projectId, payload);
          resolvedIds.push({ _key: item._key, id: (res.data as { id: string }).id });
        } else if (item.id) {
          if (item.isDirty && !item.locked) {
            const payload: Record<string, unknown> = {};
            if (item.title.trim()) payload.title = item.title.trim();
            payload.description = item.description.trim() || null;
            payload.amount = item.amount ? Number(item.amount) : null;
            payload.due_date = item.due_date || null;
            await updateMilestone(projectId, item.id, payload);
          }
          resolvedIds.push({ _key: item._key, id: item.id });
        }
      }

      // 3. Resequence all milestones in the new order
      const idKeyMap = new Map(resolvedIds.map((r) => [r._key, r.id]));
      const seqItems: { id: string; sequence: number }[] = [];
      let seq = 1;
      for (const item of items) {
        const id = item.id ?? idKeyMap.get(item._key);
        if (id) {
          seqItems.push({ id, sequence: seq });
          seq += 1;
        }
      }
      if (seqItems.length > 0) {
        await resequenceMilestones(projectId, seqItems);
      }

      // 4. Propose plan for other party to review
      await proposeMilestonePlan(projectId);

      showToast(
        t("project.managePage.milestones.planSaved", {
          defaultValue: "Milestone plan saved — waiting for the other party to review",
        }),
        "success"
      );
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save milestone plan";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ---------- render ----------

  const currency = projectCurrency ?? "THB";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t("project.managePage.milestones.editPlan", { defaultValue: "Edit Milestone Plan" })}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("project.managePage.milestones.editPlanHint", {
                defaultValue: "Locked milestones (already submitted) cannot be edited or removed.",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          {/* Insert before first */}
          {!items[0]?.locked && (
            <InsertButton onClick={() => insertAt(0)} />
          )}

          {items.map((item, index) => (
            <div key={item._key}>
              {item.locked ? (
                <LockedRow item={item} seq={index + 1} currency={currency} />
              ) : (
                <EditRow
                  item={item}
                  seq={index + 1}
                  currency={currency}
                  onChange={(field, val) => updateField(item._key, field, val)}
                  onRemove={item.isNew || !item.locked ? () => removeAt(index) : undefined}
                />
              )}
              {/* Insert after each item */}
              <InsertButton onClick={() => insertAt(index + 1)} />
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t("project.managePage.milestones.emptyPlan", {
                defaultValue: "No milestones yet. Add one below.",
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {saveError && (
          <div className="px-6 py-2 bg-red-50 text-red-600 text-sm border-t border-red-100">
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {saving
              ? t("loading", { defaultValue: "Saving…" })
              : t("project.managePage.milestones.saveAndPropose", { defaultValue: "Save & Propose" })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------- sub-components ----------

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <div className="flex-1 h-px bg-gray-100 group-hover:bg-blue-200 transition" />
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition"
      >
        <HiOutlinePlus className="w-3 h-3" />
        {" "}Add
      </button>
      <div className="flex-1 h-px bg-gray-100 group-hover:bg-blue-200 transition" />
    </div>
  );
}

function LockedRow({
  item,
  seq,
  currency,
}: {
  item: EditItem;
  seq: number;
  currency: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl opacity-80">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span className="text-xs font-bold text-gray-400 w-5 text-center">{seq}</span>
        <HiOutlineLockClosed className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {item.amount && (
            <span className="text-xs text-gray-500 font-medium">
              {Number(item.amount).toLocaleString()} {currency}
            </span>
          )}
          {item.due_date && (
            <span className="text-xs text-gray-400">{item.due_date}</span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mt-0.5">
        Locked
      </span>
    </div>
  );
}

function EditRow({
  item,
  seq,
  currency,
  onChange,
  onRemove,
}: {
  item: EditItem;
  seq: number;
  currency: string;
  onChange: (field: keyof EditItem, val: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-200 transition group">
      <div className="flex flex-col items-center gap-1 pt-1 cursor-grab">
        <MdDragIndicator className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
        <span className="text-xs font-bold text-gray-400 w-5 text-center">{seq}</span>
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {/* Title */}
        <input
          type="text"
          placeholder="Milestone title *"
          value={item.title}
          onChange={(e) => onChange("title", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
        />

        {/* Amount + Due date */}
        <div className="flex gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 flex-1">
            <input
              type="number"
              min="0"
              placeholder="Amount"
              value={item.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              className="flex-1 text-sm px-3 py-1.5 focus:outline-none min-w-0"
            />
            <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l border-gray-200 h-full flex items-center">
              {currency}
            </span>
          </div>
          <input
            type="date"
            value={item.due_date}
            onChange={(e) => onChange("due_date", e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          rows={2}
          value={item.description}
          onChange={(e) => onChange("description", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
        />
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition mt-0.5"
          title="Remove milestone"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
