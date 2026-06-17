// import { Project, UserRole } from "@/types";
// import Button from "@/components/ui/Button";
// import Card from "@/components/ui/Card";
// import Badge from "@/components/ui/Badge";
// import { useApp, useCurrentRole, useCurrentUser } from "@/context/AppContext";
// import { formatCurrency, formatDate } from "@/utils/formatters";

// interface NegotiationPanelProps {
//   project: Project;
// }

// export default function NegotiationPanel({ project }: NegotiationPanelProps) {
//   const { dispatch } = useApp();
//   const currentRole = useCurrentRole();
//   const currentUser = useCurrentUser();

//   // Default to false objects if undefined (should be defined in valid projects)
//   const approvalState = project.start_approval || {
//     client: false,
//     freelancer: false,
//   };

//   const isClient = currentRole === "client";
//   const isFreelancer = currentRole === "freelancer";

//   // Check if current user has already approved
//   const hasApproved = isClient
//     ? approvalState.client
//     : approvalState.freelancer;

//   const handleApprove = () => {
//     if (!currentUser) return;

//     // Create the new approval state
//     const newApprovalState = {
//       ...approvalState,
//       [currentRole]: true,
//       approved_at: new Date().toISOString(),
//     };

//     // If both will be true after this action, also set status to active
//     const willBeActive =
//       (isClient && newApprovalState.freelancer) ||
//       (isFreelancer && newApprovalState.client);

//     const updates: Partial<Project> = {
//       start_approval: newApprovalState,
//       ...(willBeActive && { status: "active" }),
//     };

//     dispatch({
//       type: "UPDATE_PROJECT",
//       payload: {
//         id: project.id,
//         updates,
//       },
//     });

//     // Log activity
//     dispatch({
//       type: "ADD_ACTIVITY",
//       payload: {
//         id: `act-${Date.now()}`,
//         type: "project_accepted", // Reusing existing type or we could add 'terms_approved'
//         project_id: project.id,
//         user_id: currentUser.id,
//         description: `${currentUser.name} approved project terms`,
//         created_at: new Date().toISOString(),
//       },
//     });
//   };

//   return (
//     <Card className="bg-indigo-50 border-indigo-200 mb-6">
//       <div className="p-6">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
//           <div>
//             <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
//               <span className="text-2xl">🤝</span> Negotiation Phase
//             </h2>
//             <p className="text-indigo-700 mt-1">
//               ทั้งสองฝ่ายต้องอนุมัติข้อตกลงด้านล่างเพื่อเริ่มโปรเจกต์
//             </p>
//           </div>
//           <div className="mt-4 md:mt-0 flex gap-4">
//             <div
//               className={`px-4 py-2 rounded-lg border ${approvalState.client ? "bg-green-100 border-green-200 text-green-800" : "bg-gray-100 border-gray-200 text-gray-500"}`}
//             >
//               <p className="text-xs font-semibold uppercase tracking-wide">
//                 ลูกค้า (Client)
//               </p>
//               <p className="font-bold">
//                 {approvalState.client ? "อนุมัติแล้ว" : "รออนุมัติ"}
//               </p>
//             </div>
//             <div
//               className={`px-4 py-2 rounded-lg border ${approvalState.freelancer ? "bg-green-100 border-green-200 text-green-800" : "bg-gray-100 border-gray-200 text-gray-500"}`}
//             >
//               <p className="text-xs font-semibold uppercase tracking-wide">
//                 ฟรีแลนซ์ (Freelancer)
//               </p>
//               <p className="font-bold">
//                 {approvalState.freelancer ? "อนุมัติแล้ว" : "รออนุมัติ"}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Terms Summary */}
//         <div className="bg-white rounded-lg border border-indigo-100 p-4 mb-6">
//           <h3 className="font-semibold text-gray-900 mb-3 block border-b pb-2">
//             ข้อตกลงโปรเจกต์ (Project Terms)
//           </h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
//             <div>
//               <span className="text-gray-500 block">งบประมาณทั้งหมด:</span>
//               <span className="font-medium text-gray-900 text-lg">
//                 {formatCurrency(project.budget)}
//               </span>
//             </div>
//             <div>
//               <span className="text-gray-500 block">รูปแบบการชำระเงิน:</span>
//               <span className="font-medium capitalize text-gray-900">
//                 {project.funding_mode}
//               </span>
//             </div>
//           </div>

//           <div className="space-y-3">
//             <p className="text-sm font-medium text-gray-700">
//               ลำดับงาน (Milestones):
//             </p>
//             {project.milestones.map((m, index) => (
//               <div
//                 key={m.id}
//                 className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200"
//               >
//                 <div>
//                   <p className="font-medium text-gray-900">
//                     {index + 1}. {m.title}
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     ส่งมอบภายใน: {formatDate(m.due_date)}
//                   </p>
//                 </div>
//                 <span className="font-semibold text-gray-700">
//                   {formatCurrency(m.amount)}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="flex justify-end gap-3">
//           <Button
//             variant="ghost"
//             className="text-indigo-700 hover:bg-indigo-100"
//           >
//             เสนอขอแก้ไข
//           </Button>
//           {!hasApproved ? (
//             <Button
//               onClick={handleApprove}
//               className="bg-indigo-600 hover:bg-indigo-700"
//             >
//               อนุมัติและเริ่มโปรเจกต์
//             </Button>
//           ) : (
//             <div className="flex items-center text-green-700 font-medium px-4 py-2 bg-green-50 rounded">
//               <span className="mr-2">✓</span> คุณได้อนุมัติข้อตกลงแล้ว
//             </div>
//           )}
//         </div>
//       </div>
//     </Card>
//   );
// }
