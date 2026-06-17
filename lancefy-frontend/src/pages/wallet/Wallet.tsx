// import { Link } from 'react-router-dom';
// import { useApp, useCurrentRole } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Badge from '@/components/ui/Badge';
// import Button from '@/components/ui/Button';
// import { formatCurrency, formatDate } from '@/utils/formatters';

// export default function Wallet() {
//     const { state } = useApp();
//     const currentRole = useCurrentRole();

//     // Render based on role
//     if (currentRole === 'client') {
//         return <ClientPayments state={state} />;
//     } else {
//         return <FreelancerWallet state={state} />;
//     }
// }

// function ClientPayments({ state }: { state: any }) {
//     // Filter transactions for client (payments made)
//     const transactions = (state.transactions || []).filter((t: any) =>
//         ['topup', 'deposit', 'release', 'payment'].includes(t.type)
//     ).slice(0, 20);

//     return (
//         <div className="p-6">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">ประวัติการชำระเงิน (Payment History)</h1>
//                 <p className="text-gray-600">ดูรายการชำระเงินย้อนหลังและสถานะการจ่ายเงินของคุณ</p>
//             </div>

//             {/* Quick Stats for Client */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
//                 <Card className="p-6">
//                     <h3 className="text-sm font-medium text-gray-600 mb-2">ยอดจ่ายรวมทั้งหมด</h3>
//                     <p className="text-3xl font-bold text-gray-900">
//                         {formatCurrency(
//                             transactions
//                                 .filter((t: any) => t.status === 'completed')
//                                 .reduce((sum: number, t: any) => sum + t.amount, 0)
//                         )}
//                     </p>
//                 </Card>
//                 <Card className="p-6">
//                     <h3 className="text-sm font-medium text-gray-600 mb-2">รายการล่าสุด</h3>
//                     <p className="text-3xl font-bold text-gray-900">{transactions.length} รายการ</p>
//                 </Card>
//             </div>

//             <Card>
//                 <div className="p-6 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">รายการชำระเงินล่าสุด</h2>
//                 </div>
//                 {transactions.length === 0 ? (
//                     <div className="p-12 text-center text-gray-500">
//                         ยังไม่มีประวัติการชำระเงิน
//                     </div>
//                 ) : (
//                     <div className="divide-y divide-gray-200">
//                         {transactions.map((transaction: any) => {
//                             const project = transaction.relatedProjectId
//                                 ? state.projects.find((p: any) => p.id === transaction.relatedProjectId)
//                                 : null;

//                             return (
//                                 <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
//                                     <div className="flex items-start justify-between">
//                                         <div className="flex items-start gap-4">
//                                             <div className="text-2xl pt-1">🧾</div>
//                                             <div>
//                                                 <div className="flex items-center gap-2">
//                                                     <h3 className="font-medium text-gray-900">
//                                                         ชำระเงินสำหรับ: {project ? project.title : transaction.description}
//                                                     </h3>
//                                                     <Badge variant={transaction.status === 'completed' ? 'released' : 'pending'}>
//                                                         {transaction.status === 'completed' ? 'สำเร็จ' : 'รอตรวจสอบ'}
//                                                     </Badge>
//                                                 </div>
//                                                 <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
//                                                 <p className="text-xs text-gray-500 mt-2">{formatDate(transaction.date)}</p>
//                                             </div>
//                                         </div>
//                                         <div className="text-right">
//                                             <p className="text-xl font-bold text-gray-900">
//                                                 -{formatCurrency(transaction.amount)}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 )}
//             </Card>
//         </div>
//     );
// }

// function FreelancerWallet({ state }: { state: any }) {
//     // For freelancer, show withdrawals and earnings
//     const transactions = state.transactions;
//     const totalBalance = (state.walletBalance?.available || 0) + (state.walletBalance?.inEscrow || 0);

//     return (
//         <div className="p-6">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">กระเป๋าเงิน (Wallet)</h1>
//                 <p className="text-gray-600">จัดการรายได้และการถอนเงินของคุณ</p>
//             </div>

//             {/* Balance Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//                 <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
//                     <div className="flex items-center justify-between mb-2">
//                         <h3 className="text-sm font-medium text-blue-900">ยอดเงินรวมทั้งหมด (Total)</h3>
//                         <span className="text-2xl">💰</span>
//                     </div>
//                     <p className="text-3xl font-bold text-blue-900">{formatCurrency(totalBalance)}</p>
//                     <p className="text-sm text-blue-700 mt-2">รวมยอดที่รอโอนและถอนได้</p>
//                 </Card>

//                 <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
//                     <div className="flex items-center justify-between mb-2">
//                         <h3 className="text-sm font-medium text-green-900">ถอนได้ (Available)</h3>
//                         <div className="flex gap-2">
//                             <span className="text-2xl">💵</span>
//                         </div>
//                     </div>
//                     <p className="text-3xl font-bold text-green-900">{formatCurrency(state.walletBalance.available)}</p>
//                     <Link to="/app/wallet/withdraw" className="inline-block mt-3">
//                         <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
//                             แจ้งถอนเงิน
//                         </Button>
//                     </Link>
//                 </Card>

//                 <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
//                     <div className="flex items-center justify-between mb-2">
//                         <h3 className="text-sm font-medium text-gray-700">รอโอน (Reserved)</h3>
//                         <span className="text-2xl">🔒</span>
//                     </div>
//                     <p className="text-3xl font-bold text-gray-700">{formatCurrency(state.walletBalance.inEscrow)}</p>
//                     <p className="text-sm text-gray-600 mt-2">เงินจะเข้าเมื่อลูกค้ากดอนุมัติงาน</p>
//                 </Card>
//             </div>

//             {/* Transaction History */}
//             <Card>
//                 <div className="p-6 border-b border-gray-200">
//                     <h2 className="text-lg font-semibold text-gray-900">ประวัติธุรกรรม</h2>
//                 </div>
//                 {transactions.length === 0 ? (
//                     <div className="p-12 text-center text-gray-500">
//                         ไม่มีประวัติธุรกรรม
//                     </div>
//                 ) : (
//                     <div className="divide-y divide-gray-200">
//                         {transactions.map((transaction: any) => (
//                             <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
//                                 <div className="flex items-start justify-between">
//                                     <div className="flex items-start gap-4">
//                                         <div className="text-2xl pt-1">
//                                             {transaction.type === 'withdraw' ? '💸' : '📥'}
//                                         </div>
//                                         <div>
//                                             <h3 className="font-medium text-gray-900 capitalize">
//                                                 {transaction.type === 'withdraw' ? 'ถอนเงิน' : 'รับเงินค่าจ้าง'}
//                                             </h3>
//                                             <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
//                                             <p className="text-xs text-gray-500 mt-2">{formatDate(transaction.date)}</p>
//                                         </div>
//                                     </div>
//                                     <div className="text-right">
//                                         <p className={`text-xl font-bold ${transaction.type === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
//                                             {transaction.type === 'withdraw' ? '-' : '+'}{formatCurrency(transaction.amount)}
//                                         </p>
//                                         <Badge variant={transaction.status === 'completed' ? 'released' : 'pending'}>
//                                             {transaction.status}
//                                         </Badge>
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </Card>
//         </div>
//     );
// }
