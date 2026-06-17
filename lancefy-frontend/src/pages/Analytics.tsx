// import { useApp, useCurrentUser, useCurrentRole } from "@/context/AppContext";
// import Card from "@/components/ui/Card";
// import { formatCurrency } from "@/utils/formatters";

// export default function Analytics() {
//   const { state } = useApp();
//   const currentUser = useCurrentUser();
//   const currentRole = useCurrentRole();

//   // Calculate stats based on role
//   const myProjects =
//     currentRole === "client"
//       ? state.projects.filter((p) => p.client_id === currentUser?.id)
//       : state.projects.filter((p) => p.freelancer_id === currentUser?.id);

//   const completedProjects = myProjects.filter((p) => p.status === "completed");
//   const activeProjects = myProjects.filter((p) => p.status === "active");

//   // Calculate earnings/spending
//   const totalAmount =
//     currentRole === "freelancer"
//       ? state.transactions
//           .filter((t) => t.type === "release" && t.status === "completed")
//           .reduce((sum, t) => sum + (t.amount - (t.fee || 0)), 0)
//       : state.transactions
//           .filter((t) => t.type === "deposit" && t.status === "completed")
//           .reduce((sum, t) => sum + t.amount, 0);

//   // Calculate average rating
//   const myReviews =
//     currentRole === "freelancer"
//       ? state.reviews.filter((r) => r.reviewee_id === currentUser?.id)
//       : state.reviews.filter((r) => r.reviewer_id === currentUser?.id);

//   const avgRating =
//     myReviews.length > 0
//       ? myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length
//       : 0;

//   // Success rate (completed vs total)
//   const successRate =
//     myProjects.length > 0
//       ? Math.round((completedProjects.length / myProjects.length) * 100)
//       : 0;

//   // Monthly earnings/spending (mock data for chart)
//   const monthlyData = [
//     { month: "Jan", amount: 1200 },
//     { month: "Feb", amount: 1800 },
//     { month: "Mar", amount: 1500 },
//     { month: "Apr", amount: 2200 },
//     { month: "May", amount: 1900 },
//     { month: "Jun", amount: 2400 },
//     { month: "Jul", amount: 2100 },
//   ];

//   const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

//   return (
//     <div className="p-6">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
//         <p className="text-gray-600">
//           {currentRole === "client"
//             ? "Your hiring statistics"
//             : "Your freelance performance"}
//         </p>
//       </div>

//       {/* KPI Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//         <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
//           <h3 className="text-sm font-medium text-blue-900 mb-2">
//             {currentRole === "client" ? "Total Spent" : "Total Earned"}
//           </h3>
//           <p className="text-3xl font-bold text-blue-900">
//             {formatCurrency(totalAmount)}
//           </p>
//           <p className="text-sm text-blue-700 mt-2">All time</p>
//         </Card>

//         <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
//           <h3 className="text-sm font-medium text-green-900 mb-2">
//             Completed Projects
//           </h3>
//           <p className="text-3xl font-bold text-green-900">
//             {completedProjects.length}
//           </p>
//           <p className="text-sm text-green-700 mt-2">
//             {activeProjects.length} active
//           </p>
//         </Card>

//         <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
//           <h3 className="text-sm font-medium text-amber-900 mb-2">
//             Average Rating
//           </h3>
//           <p className="text-3xl font-bold text-amber-900">
//             {avgRating.toFixed(1)}
//           </p>
//           <p className="text-sm text-amber-700 mt-2">
//             {myReviews.length} reviews
//           </p>
//         </Card>

//         <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
//           <h3 className="text-sm font-medium text-purple-900 mb-2">
//             Success Rate
//           </h3>
//           <p className="text-3xl font-bold text-purple-900">{successRate}%</p>
//           <p className="text-sm text-purple-700 mt-2">
//             {completedProjects.length}/{myProjects.length} projects
//           </p>
//         </Card>
//       </div>

//       {/* Chart */}
//       <Card className="p-6 mb-8">
//         <h2 className="text-lg font-semibold text-gray-900 mb-6">
//           {currentRole === "client" ? "Spending" : "Earnings"} Over Time
//         </h2>
//         <div className="h-64 flex items-end justify-around gap-2">
//           {monthlyData.map((data) => (
//             <div
//               key={data.month}
//               className="flex-1 flex flex-col items-center gap-2"
//             >
//               <div className="w-full flex flex-col items-center">
//                 <span className="text-xs font-medium text-gray-600 mb-1">
//                   {formatCurrency(data.amount)}
//                 </span>
//                 <div
//                   className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
//                   style={{ height: `${(data.amount / maxAmount) * 200}px` }}
//                 />
//               </div>
//               <span className="text-sm text-gray-600">{data.month}</span>
//             </div>
//           ))}
//         </div>
//       </Card>

//       {/* Additional Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <Card className="p-6">
//           <h3 className="font-semibold text-gray-900 mb-4">
//             Project Categories
//           </h3>
//           <div className="space-y-3">
//             {["illustration", "graphic-design", "3d-modeling"].map(
//               (category) => {
//                 const count = myProjects.filter(
//                   (p) => p.category === category,
//                 ).length;
//                 const percentage =
//                   myProjects.length > 0 ? (count / myProjects.length) * 100 : 0;
//                 return (
//                   <div key={category}>
//                     <div className="flex items-center justify-between mb-1">
//                       <span className="text-sm capitalize">
//                         {category.replace("-", " ")}
//                       </span>
//                       <span className="text-sm font-medium">{count}</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-2">
//                       <div
//                         className="bg-blue-600 h-2 rounded-full transition-all"
//                         style={{ width: `${percentage}%` }}
//                       />
//                     </div>
//                   </div>
//                 );
//               },
//             )}
//           </div>
//         </Card>

//         <Card className="p-6">
//           <h3 className="font-semibold text-gray-900 mb-4">
//             Transaction Summary
//           </h3>
//           <div className="space-y-3">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Transactions</span>
//               <span className="font-medium">{state.transactions.length}</span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Completed</span>
//               <span className="font-medium text-green-600">
//                 {
//                   state.transactions.filter((t) => t.status === "completed")
//                     .length
//                 }
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Pending</span>
//               <span className="font-medium text-amber-600">
//                 {
//                   state.transactions.filter((t) => t.status === "pending")
//                     .length
//                 }
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Fees</span>
//               <span className="font-medium">
//                 {formatCurrency(
//                   state.transactions
//                     .filter((t) => t.fee && t.status === "completed")
//                     .reduce((sum, t) => sum + (t.fee || 0), 0),
//                 )}
//               </span>
//             </div>
//           </div>
//         </Card>

//         <Card className="p-6">
//           <h3 className="font-semibold text-gray-900 mb-4">
//             Performance Metrics
//           </h3>
//           <div className="space-y-3">
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Avg Project Value</span>
//               <span className="font-medium">
//                 {myProjects.length > 0
//                   ? formatCurrency(
//                       myProjects.reduce((sum, p) => sum + p.budget, 0) /
//                         myProjects.length,
//                     )
//                   : "$0"}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Active Disputes</span>
//               <span className="font-medium text-red-600">
//                 {state.disputes.filter((d) => d.status !== "resolved").length}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Total Reviews</span>
//               <span className="font-medium">{myReviews.length}</span>
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-sm text-gray-600">Wallet Balance</span>
//               <span className="font-medium text-green-600">
//                 {formatCurrency(state.wallet_balance.available)}
//               </span>
//             </div>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }
