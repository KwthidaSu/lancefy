// import React, { useState } from "react";
// import { useApp, useCurrentRole } from "@/context/AppContext";
// import Card from "@/components/ui/Card";
// import { Link } from "react-router-dom";

// export default function Calendar() {
//   const { state } = useApp();
//   const currentRole = useCurrentRole();
//   const user = state.current_user;

//   const [currentDate, setCurrentDate] = useState(new Date());

//   if (!user) return null;

//   // Filter projects based on role
//   const myProjects = state.projects.filter((p) => {
//     if (currentRole === "client") return p.client_id === user.id;
//     return p.freelancer_id === user.id;
//   });

//   // Extract milestones
//   const allMilestones = myProjects.flatMap((p) =>
//     p.milestones.map((m) => ({
//       ...m,
//       projectTitle: p.title,
//       projectId: p.id,
//       category: p.category,
//     })),
//   );

//   // Calendar logic
//   const getDaysInMonth = (date: Date) => {
//     const year = date.getFullYear();
//     const month = date.getMonth();
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const firstDayOfMonth = new Date(year, month, 1).getDay();
//     return { daysInMonth, firstDayOfMonth };
//   };

//   const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);

//   const prevMonth = () => {
//     setCurrentDate(
//       new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
//     );
//   };

//   const nextMonth = () => {
//     setCurrentDate(
//       new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
//     );
//   };

//   const monthNames = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "May",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   const generateCalendarDays = () => {
//     const days = [];

//     // Empty slots for previous month
//     for (let i = 0; i < firstDayOfMonth; i++) {
//       days.push(
//         <div
//           key={`empty-${i}`}
//           className="bg-gray-50/50 min-h-[120px] border-b border-r border-gray-100"
//         />,
//       );
//     }

//     // Days of current month
//     for (let day = 1; day <= daysInMonth; day++) {
//       const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//       const dayMilestones = allMilestones.filter((m) =>
//         m.due_date.startsWith(dateStr),
//       );

//       const isToday = new Date().toISOString().startsWith(dateStr);

//       days.push(
//         <div
//           key={day}
//           className={`min-h-[120px] p-2 border-b border-r border-gray-100 bg-white ${isToday ? "bg-blue-50/30" : ""}`}
//         >
//           <div className="flex justify-between items-start mb-2">
//             <span
//               className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}
//             >
//               {day}
//             </span>
//           </div>
//           <div className="space-y-1">
//             {dayMilestones.map((m) => (
//               <Link key={m.id} to={`/app/projects/${m.projectId}`}>
//                 <div
//                   className={`text-xs p-1.5 rounded border mb-1 truncate cursor-pointer transition-colors ${
//                     m.workflow_status === "done"
//                       ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
//                       : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
//                   }`}
//                 >
//                   <div className="font-medium truncate">{m.title}</div>
//                   <div className="text-[10px] opacity-75 truncate">
//                     {m.projectTitle}
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         </div>,
//       );
//     }

//     return days;
//   };

//   return (
//     <div className="p-6 h-full flex flex-col">
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
//           <p className="text-gray-500">Manage your deadlines and milestones</p>
//         </div>
//         <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
//           <button
//             onClick={prevMonth}
//             className="p-2 hover:bg-gray-100 rounded-md"
//           >
//             <svg
//               className="w-5 h-5 text-gray-600"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M15 19l-7-7 7-7"
//               />
//             </svg>
//           </button>
//           <span className="text-lg font-semibold min-w-[140px] text-center text-gray-900">
//             {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
//           </span>
//           <button
//             onClick={nextMonth}
//             className="p-2 hover:bg-gray-100 rounded-md"
//           >
//             <svg
//               className="w-5 h-5 text-gray-600"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M9 5l7 7-7 7"
//               />
//             </svg>
//           </button>
//         </div>
//       </div>

//       <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border border-gray-200 rounded-xl">
//         {/* Weekday Headers */}
//         <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
//           {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
//             <div
//               key={day}
//               className="py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-tighter"
//             >
//               {day}
//             </div>
//           ))}
//         </div>

//         {/* Calendar Grid */}
//         <div className="flex-1 grid grid-cols-7 overflow-y-auto">
//           {generateCalendarDays()}
//         </div>
//       </Card>
//     </div>
//   );
// }
