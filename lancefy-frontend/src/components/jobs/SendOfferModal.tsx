// import { useState } from "react";
// import { useApp, useCurrentUser } from "@/context/AppContext";
// import type { Project, ProposedMilestone } from "@/types";
// import Button from "@/components/ui/Button";
// import { formatCurrency } from "@/utils/formatters";

// interface SendOfferModalProps {
//   job: Project;
//   onClose: () => void;
// }

// export default function SendOfferModal({ job, onClose }: SendOfferModalProps) {
//   const { dispatch } = useApp();
//   const currentUser = useCurrentUser();
//   const [coverLetter, setCoverLetter] = useState("");
//   const [milestones, setMilestones] = useState<ProposedMilestone[]>(
//     // Initialize with job's milestones as template
//     job.milestones.map((m, index) => ({
//       id: `proposed-${index}`,
//       title: m.title,
//       description: m.description,
//       amount: m.amount,
//       estimated_days: 7,
//       deliverables: [""],
//       status: "pending" as const,
//     })),
//   );

//   const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

//   const handleAddMilestone = () => {
//     setMilestones([
//       ...milestones,
//       {
//         id: `proposed-${Date.now()}`,
//         title: "",
//         description: "",
//         amount: 0,
//         estimated_days: 7,
//         deliverables: [""],
//         status: "pending" as const,
//       },
//     ]);
//   };

//   const handleRemoveMilestone = (index: number) => {
//     if (milestones.length > 1) {
//       setMilestones(milestones.filter((_, i) => i !== index));
//     }
//   };

//   const handleMilestoneChange = (
//     index: number,
//     field: keyof ProposedMilestone,
//     value: any,
//   ) => {
//     const updated = [...milestones];
//     updated[index] = { ...updated[index], [field]: value };
//     setMilestones(updated);
//   };

//   const handleDeliverableChange = (
//     milestoneIndex: number,
//     deliverableIndex: number,
//     value: string,
//   ) => {
//     const updated = [...milestones];
//     updated[milestoneIndex].deliverables[deliverableIndex] = value;
//     setMilestones(updated);
//   };

//   const handleAddDeliverable = (milestoneIndex: number) => {
//     const updated = [...milestones];
//     updated[milestoneIndex].deliverables.push("");
//     setMilestones(updated);
//   };

//   const handleRemoveDeliverable = (
//     milestoneIndex: number,
//     deliverableIndex: number,
//   ) => {
//     const updated = [...milestones];
//     if (updated[milestoneIndex].deliverables.length > 1) {
//       updated[milestoneIndex].deliverables = updated[
//         milestoneIndex
//       ].deliverables.filter((_, i) => i !== deliverableIndex);
//       setMilestones(updated);
//     }
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!currentUser) return;

//     // Validate
//     if (!coverLetter.trim()) {
//       alert("กรุณาเขียนข้อความถึงลูกค้า");
//       return;
//     }

//     if (milestones.some((m) => !m.title.trim() || m.amount <= 0)) {
//       alert("กรุณากรอกข้อมูล Milestone ให้ครบถ้วน");
//       return;
//     }

//     // Create offer
//     const offer = {
//       id: `offer-${Date.now()}`,
//       project_id: job.id,
//       freelancer_id: currentUser.id,
//       client_id: job.client_id,
//       status: "pending" as const,
//       proposed_milestones: milestones,
//       total_amount: totalAmount,
//       cover_letter: coverLetter.trim(),
//       created_at: new Date().toISOString(),
//     };

//     dispatch({ type: "CREATE_OFFER", payload: offer });

//     alert("ส่งข้อเสนอสำเร็จ! รอการตอบรับจากลูกค้า");
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
//         {/* Header */}
//         <div className="p-6 border-b border-gray-200 flex items-center justify-between">
//           <h2 className="text-xl font-bold text-gray-900">ส่งข้อเสนอ</h2>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//           >
//             <svg
//               className="w-5 h-5"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M6 18L18 6M6 6l12 12"
//               />
//             </svg>
//           </button>
//         </div>

//         {/* Content */}
//         <form
//           onSubmit={handleSubmit}
//           className="flex-1 overflow-y-auto p-6 space-y-6"
//         >
//           {/* Cover Letter */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               ข้อความถึงลูกค้า <span className="text-red-500">*</span>
//             </label>
//             <textarea
//               value={coverLetter}
//               onChange={(e) => setCoverLetter(e.target.value)}
//               rows={4}
//               className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="แนะนำตัวเองและอธิบายว่าทำไมคุณเหมาะกับงานนี้..."
//               required
//             />
//           </div>

//           {/* Milestones */}
//           <div>
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg font-semibold text-gray-900">
//                 Milestone ที่เสนอ ({milestones.length})
//               </h3>
//               <button
//                 type="button"
//                 onClick={handleAddMilestone}
//                 className="text-sm text-blue-600 hover:text-blue-700 font-medium"
//               >
//                 + เพิ่ม Milestone
//               </button>
//             </div>

//             <div className="space-y-4">
//               {milestones.map((milestone, index) => (
//                 <div
//                   key={milestone.id}
//                   className="border border-gray-200 rounded-lg p-4"
//                 >
//                   <div className="flex items-start justify-between mb-3">
//                     <h4 className="font-medium text-gray-900">
//                       Milestone {index + 1}
//                     </h4>
//                     {milestones.length > 1 && (
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveMilestone(index)}
//                         className="text-red-600 hover:text-red-700 text-sm"
//                       >
//                         ลบ
//                       </button>
//                     )}
//                   </div>

//                   <div className="space-y-3">
//                     {/* Title */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         ชื่อ Milestone
//                       </label>
//                       <input
//                         type="text"
//                         value={milestone.title}
//                         onChange={(e) =>
//                           handleMilestoneChange(index, "title", e.target.value)
//                         }
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         required
//                       />
//                     </div>

//                     {/* Description */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         รายละเอียด
//                       </label>
//                       <textarea
//                         value={milestone.description}
//                         onChange={(e) =>
//                           handleMilestoneChange(
//                             index,
//                             "description",
//                             e.target.value,
//                           )
//                         }
//                         rows={2}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       />
//                     </div>

//                     {/* Amount and Days */}
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                           ราคา (฿)
//                         </label>
//                         <input
//                           type="number"
//                           value={milestone.amount}
//                           onChange={(e) =>
//                             handleMilestoneChange(
//                               index,
//                               "amount",
//                               Number(e.target.value),
//                             )
//                           }
//                           min="0"
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           required
//                         />
//                       </div>
//                       <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                           ระยะเวลา (วัน)
//                         </label>
//                         <input
//                           type="number"
//                           value={milestone.estimated_days}
//                           onChange={(e) =>
//                             handleMilestoneChange(
//                               index,
//                               "estimated_days",
//                               Number(e.target.value),
//                             )
//                           }
//                           min="1"
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           required
//                         />
//                       </div>
//                     </div>

//                     {/* Deliverables */}
//                     <div>
//                       <div className="flex items-center justify-between mb-2">
//                         <label className="block text-sm font-medium text-gray-700">
//                           สิ่งที่จะส่งมอบ
//                         </label>
//                         <button
//                           type="button"
//                           onClick={() => handleAddDeliverable(index)}
//                           className="text-xs text-blue-600 hover:text-blue-700"
//                         >
//                           + เพิ่ม
//                         </button>
//                       </div>
//                       <div className="space-y-2">
//                         {milestone.deliverables.map((deliverable, dIndex) => (
//                           <div key={dIndex} className="flex gap-2">
//                             <input
//                               type="text"
//                               value={deliverable}
//                               onChange={(e) =>
//                                 handleDeliverableChange(
//                                   index,
//                                   dIndex,
//                                   e.target.value,
//                                 )
//                               }
//                               className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                               placeholder="เช่น ไฟล์ PSD, ภาพ PNG ความละเอียดสูง"
//                             />
//                             {milestone.deliverables.length > 1 && (
//                               <button
//                                 type="button"
//                                 onClick={() =>
//                                   handleRemoveDeliverable(index, dIndex)
//                                 }
//                                 className="px-2 text-red-600 hover:text-red-700"
//                               >
//                                 ×
//                               </button>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Total */}
//           <div className="border-t border-gray-200 pt-4">
//             <div className="flex items-center justify-between">
//               <span className="text-lg font-semibold text-gray-900">
//                 ราคารวมทั้งหมด
//               </span>
//               <span className="text-2xl font-bold text-blue-600">
//                 {formatCurrency(totalAmount)}
//               </span>
//             </div>
//             <p className="text-sm text-gray-500 mt-1">
//               งบประมาณที่ลูกค้าตั้งไว้: {formatCurrency(job.budget)}
//             </p>
//           </div>
//         </form>

//         {/* Footer */}
//         <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
//           <Button type="button" variant="secondary" onClick={onClose}>
//             ยกเลิก
//           </Button>
//           <Button type="submit" onClick={handleSubmit}>
//             ส่งข้อเสนอ
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }
