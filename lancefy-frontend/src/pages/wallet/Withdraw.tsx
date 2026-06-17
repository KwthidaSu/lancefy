// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useApp } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Input from '@/components/ui/Input';
// import Select from '@/components/ui/Select';
// import { formatCurrency } from '@/utils/formatters';

// export default function Withdraw() {
//     const navigate = useNavigate();
//     const { state, dispatch } = useApp();
//     const [amount, setAmount] = useState('');
//     const [withdrawMethod, setWithdrawMethod] = useState('bank-transfer');
//     const [loading, setLoading] = useState(false);

//     const maxAmount = state.walletBalance.available;
//     const canWithdraw = parseFloat(amount) > 0 && parseFloat(amount) <= maxAmount;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);

//         // Simulate API delay
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         const amountNum = parseFloat(amount);

//         // Add transaction
//         const transaction = {
//             id: `txn-${Date.now()}`,
//             type: 'withdraw' as const,
//             amount: amountNum,
//             status: 'completed' as const,
//             date: new Date().toISOString(),
//             description: `Withdrawal via ${withdrawMethod.replace('-', ' ')}`,
//         };

//         dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

//         // Update wallet balance
//         dispatch({
//             type: 'UPDATE_WALLET',
//             payload: {
//                 available: state.walletBalance.available - amountNum,
//             },
//         });

//         // Add activity
//         const activity = {
//             id: `act-${Date.now()}`,
//             type: 'project_created' as const, // Using existing type
//             userId: state.currentUser?.id || '',
//             description: `Withdrew ${formatCurrency(amountNum)} from wallet`,
//             createdAt: new Date().toISOString(),
//         };

//         dispatch({ type: 'ADD_ACTIVITY', payload: activity });

//         setLoading(false);
//         navigate('/app/wallet');
//     };

//     const handleMaxAmount = () => {
//         setAmount(maxAmount.toString());
//     };

//     return (
//         <div className="p-6 max-w-2xl mx-auto">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">Withdraw Funds</h1>
//                 <p className="text-gray-600">Transfer funds from your wallet to your bank account</p>
//             </div>

//             <Card className="p-6">
//                 <form onSubmit={handleSubmit} className="space-y-6">
//                     {/* Current Balance */}
//                     <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//                         <p className="text-sm text-green-700 mb-1">Available Balance</p>
//                         <p className="text-2xl font-bold text-green-900">{formatCurrency(maxAmount)}</p>
//                     </div>

//                     {/* Amount */}
//                     <div>
//                         <Input
//                             label="Withdrawal Amount (USD)"
//                             type="number"
//                             value={amount}
//                             onChange={(e) => setAmount(e.target.value)}
//                             placeholder="0.00"
//                             min="10"
//                             max={maxAmount}
//                             step="0.01"
//                             required
//                         />
//                         <button
//                             type="button"
//                             onClick={handleMaxAmount}
//                             className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
//                         >
//                             Withdraw maximum amount ({formatCurrency(maxAmount)})
//                         </button>
//                     </div>

//                     {/* Withdrawal Method */}
//                     <Select
//                         label="Withdrawal Method"
//                         value={withdrawMethod}
//                         onChange={(e) => setWithdrawMethod(e.target.value)}
//                         options={[
//                             { value: 'bank-transfer', label: 'Bank Transfer' },
//                             { value: 'paypal', label: 'PayPal' },
//                             { value: 'wire-transfer', label: 'Wire Transfer' },
//                         ]}
//                         required
//                     />

//                     {/* Bank Details (Mock) */}
//                     {withdrawMethod === 'bank-transfer' && (
//                         <div className="p-4 bg-gray-50 rounded-lg space-y-3">
//                             <Input label="Bank Name" placeholder="Your Bank" required />
//                             <Input label="Account Number" placeholder="1234567890" required />
//                             <Input label="Routing Number" placeholder="123456789" required />
//                             <Input label="Account Holder Name" placeholder="John Doe" required />
//                         </div>
//                     )}

//                     {withdrawMethod === 'paypal' && (
//                         <div className="p-4 bg-gray-50 rounded-lg">
//                             <Input label="PayPal Email" type="email" placeholder="your@email.com" required />
//                         </div>
//                     )}

//                     {/* Summary */}
//                     {amount && (
//                         <div className="p-4 bg-gray-50 rounded-lg">
//                             <div className="flex items-center justify-between mb-2">
//                                 <span className="text-gray-600">Withdrawal Amount</span>
//                                 <span className="font-medium">{formatCurrency(parseFloat(amount) || 0)}</span>
//                             </div>
//                             <div className="flex items-center justify-between mb-2">
//                                 <span className="text-gray-600">Processing Fee</span>
//                                 <span className="font-medium">$0.00</span>
//                             </div>
//                             <div className="pt-2 border-t border-gray-200">
//                                 <div className="flex items-center justify-between mb-3">
//                                     <span className="font-semibold text-gray-900">You Will Receive</span>
//                                     <span className="text-xl font-bold text-gray-900">
//                                         {formatCurrency(parseFloat(amount) || 0)}
//                                     </span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-gray-600">Remaining Balance</span>
//                                     <span className={`font-medium ${canWithdraw ? 'text-gray-900' : 'text-red-600'}`}>
//                                         {formatCurrency(maxAmount - (parseFloat(amount) || 0))}
//                                     </span>
//                                 </div>
//                             </div>

//                             {!canWithdraw && parseFloat(amount) > maxAmount && (
//                                 <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
//                                     <p className="text-sm text-red-700">
//                                         ⚠️ Withdrawal amount exceeds available balance
//                                     </p>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* Actions */}
//                     <div className="flex gap-3">
//                         <Button type="button" variant="secondary" onClick={() => navigate('/app/wallet')}>
//                             Cancel
//                         </Button>
//                         <Button type="submit" disabled={loading || !canWithdraw}>
//                             {loading ? 'Processing...' : 'Withdraw Funds'}
//                         </Button>
//                     </div>
//                 </form>
//             </Card>

//             {/* Info */}
//             <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                 <h3 className="font-medium text-blue-900 mb-2">💡 About Withdrawals</h3>
//                 <ul className="text-sm text-blue-700 space-y-1">
//                     <li>• Minimum withdrawal amount is $10</li>
//                     <li>• Bank transfers typically take 3-5 business days</li>
//                     <li>• PayPal transfers are usually instant</li>
//                     <li>• No withdrawal fees</li>
//                     <li>• You can only withdraw from available balance (not reserved funds)</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }
