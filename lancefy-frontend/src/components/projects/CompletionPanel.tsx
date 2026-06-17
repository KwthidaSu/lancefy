import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  Project,
  AssignmentSummary,
} from "@/services/projects/project.types";
import type { CurrentUser } from "@/auth/auth.types";
import { confirmProjectCompletion } from "@/services/projects/project";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

interface CompletionPanelProps {
  project: Project;
  assignment: AssignmentSummary | null;
  currentUser: CurrentUser | null;
  readyForCompletion: boolean;
  onUpdate: () => void;
  onBothCompleted?: (assignmentId: string, revieweeId: string, revieweeName: string, projectTitle: string) => void;
}

export default function CompletionPanel({
  project,
  assignment,
  currentUser,
  readyForCompletion,
  onUpdate,
  onBothCompleted,
}: CompletionPanelProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const normalizedStatus = String(project.status ?? "").toLowerCase();
  const isCompletedProject =
    normalizedStatus === "complete" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "closed";
  const shouldRenderPanel =
    (normalizedStatus === "active" && readyForCompletion) || isCompletedProject;

  if (!assignment || !currentUser || !shouldRenderPanel) return null;

  const clientId = project.owner_id ?? project.client_id ?? project.client?.id ?? assignment.client_id;
  const isClient = clientId === currentUser.id;
  const isFreelancer = assignment.freelancer_id === currentUser.id;

  if (!isClient && !isFreelancer) return null;

  const clientApproved = !!assignment.client_completion_confirmed_at;
  const freelancerApproved = !!assignment.freelancer_completion_confirmed_at;

  const hasApproved = isClient ? clientApproved : freelancerApproved;
  const canConfirm = normalizedStatus === "active" && readyForCompletion && !hasApproved;

  const handleConfirmCompletion = async () => {
    if (loading) return;
    // Will both parties have confirmed after this action?
    const bothWillComplete = isClient ? freelancerApproved : clientApproved;
    try {
      setLoading(true);
      await confirmProjectCompletion(project.id);
      showToast(
        t("project.completionSuccess", { defaultValue: "ยืนยันจบงานสำเร็จ" }),
        "success",
      );
      setShowConfirmModal(false);
      onUpdate();
      if (bothWillComplete && onBothCompleted) {
        const revieweeId = isClient ? assignment.freelancer_id : (clientId ?? "");
        onBothCompleted(assignment.id, revieweeId, "", project.title);
      }
    } catch {
      showToast(
        t("project.completionError", {
          defaultValue: "เกิดข้อผิดพลาดในการยืนยันจบงาน",
        }),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-text-primary">
              {t("project.completionPanel.title", {
                defaultValue: "🎉 จบงานโปรเจกต์ (Completion)",
              })}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("project.completionPanel.subtitle", {
                defaultValue:
                  "งานทั้งหมดเสร็จสิ้นแล้ว กรุณากดยืนยันเพื่อปิดโปรเจกต์",
              })}
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div
                className={`px-4 py-2 rounded-lg border flex flex-col items-center justify-center min-w-[120px] ${clientApproved ? "bg-lime-50/50 border-lime-200 text-lime-800" : "bg-gray-50/50 border-gray-200 text-gray-500"}`}
              >
                <p className="text-[12px] font-bold uppercase tracking-wide">
                  {t("project.completionPanel.client", {
                    defaultValue: "ลูกค้า (CLIENT)",
                  })}
                </p>
                <p className="font-bold text-base mt-0.5 tracking-tight">
                  {clientApproved
                    ? t("project.completionPanel.approved", {
                        defaultValue: "ยืนยันแล้ว",
                      })
                    : t("project.completionPanel.pending", {
                        defaultValue: "รอยืนยัน",
                      })}
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-lg border flex flex-col items-center justify-center min-w-[120px] ${freelancerApproved ? "bg-lime-50/50 border-lime-200 text-lime-800" : "bg-gray-50/50 border-gray-200 text-gray-500"}`}
              >
                <p className="text-[12px] font-bold uppercase tracking-wide">
                  {t("project.completionPanel.freelancer", {
                    defaultValue: "ฟรีแลนซ์ (FREELANCER)",
                  })}
                </p>
                <p className="font-bold text-base mt-0.5 tracking-tight">
                  {freelancerApproved
                    ? t("project.completionPanel.approved", {
                        defaultValue: "ยืนยันแล้ว",
                      })
                    : t("project.completionPanel.pending", {
                        defaultValue: "รอยืนยัน",
                      })}
                </p>
              </div>
            </div>

            <div className="flex justify-start md:justify-end">
              {canConfirm ? (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#00A86B] text-white text-sm font-bold rounded-lg hover:bg-[#008f5a] disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                >
                  {loading
                    ? t("project.completionPanel.saving", {
                        defaultValue: "กำลังบันทึก...",
                      })
                    : t("project.completionPanel.confirmButton", {
                        defaultValue: "ยืนยันจบงาน",
                      })}
                </button>
              ) : hasApproved ? (
                <div className="flex items-center text-lime-700 font-medium px-4 py-2.5 bg-lime-50 rounded-lg border border-lime-200 text-sm whitespace-nowrap">
                  <span className="mr-2">✓</span>{" "}
                  {t("project.completionPanel.confirmed", {
                    defaultValue: "คุณได้ยืนยันจบงานแล้ว",
                  })}
                </div>
              ) : (
                <div className="flex items-center text-slate-700 font-medium px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm whitespace-nowrap">
                  {t("project.completionPanel.projectClosed", {
                    defaultValue: "โปรเจกต์นี้ปิดแล้ว",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmModal}
        loading={loading}
        title={t("project.completionPanel.confirmTitle", {
          defaultValue: "ยืนยันจบงาน",
        })}
        description={t("project.completionPanel.confirmDescription", {
          defaultValue: "เมื่อยืนยันแล้ว ระบบจะปิดโปรเจกต์เมื่อทั้งสองฝ่ายยืนยันครบ",
        })}
        confirmText={t("project.completionPanel.confirmButton", {
          defaultValue: "ยืนยันจบงาน",
        })}
        onCancel={() => {
          if (!loading) setShowConfirmModal(false);
        }}
        onConfirm={handleConfirmCompletion}
      />
    </div>
  );
}
