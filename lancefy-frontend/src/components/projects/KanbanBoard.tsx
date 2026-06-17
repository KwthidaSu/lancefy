import { Milestone, WorkflowStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Link } from "react-router-dom";

interface KanbanBoardProps {
  projectId: string;
  milestones: Milestone[];
}

export default function KanbanBoard({
  projectId,
  milestones,
}: KanbanBoardProps) {
  const columns: {
    id: WorkflowStatus;
    title: string;
    color: string;
    dotColor: string;
  }[] = [
    {
      id: "todo",
      title: "To Do",
      color: "bg-gray-50",
      dotColor: "bg-gray-400",
    },
    {
      id: "in_progress",
      title: "In Progress",
      color: "bg-blue-50",
      dotColor: "bg-blue-500",
    },
    {
      id: "review",
      title: "Review",
      color: "bg-amber-50",
      dotColor: "bg-amber-500",
    },
    {
      id: "done",
      title: "Done",
      color: "bg-lime-50",
      dotColor: "bg-lime-500",
    },
  ];

  const getColumnMilestones = (status: WorkflowStatus) => {
    return milestones.filter((m) => m.workflow_status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto min-h-[500px]">
      {columns.map((col) => {
        const columnMilestones = getColumnMilestones(col.id);

        return (
          <div
            key={col.id}
            className={`flex flex-col h-full rounded-xl ${col.color} p-4 border border-gray-100`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${col.dotColor}`} />
                <h3 className="font-semibold textlg text-gray-700">
                  {col.title}
                </h3>
              </div>
              <span className="text-sm font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {columnMilestones.length}
              </span>
            </div>

            {/* Drop Zone / List */}
            <div className="flex-1 space-y-3">
              {columnMilestones.length > 0 ? (
                columnMilestones.map((milestone) => (
                  <Link
                    key={milestone.id}
                    to={`/app/projects/${projectId}?tab=milestones`}
                  >
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium  text-gray-900 group-hover:text-blue-600 line-clamp-2">
                          {milestone.title}
                        </h4>
                      </div>

                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {milestone.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(milestone.amount)}
                        </span>
                        {milestone.funding_status === "funded" && (
                          <Badge variant="funded">Funded</Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <span>🕒</span>
                        <span
                          className={
                            new Date(milestone.due_date) < new Date() &&
                            col.id !== "done"
                              ? "text-red-500 font-medium"
                              : ""
                          }
                        >
                          {formatDate(milestone.due_date)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <span className="text-sm text-gray-400">No tasks</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
