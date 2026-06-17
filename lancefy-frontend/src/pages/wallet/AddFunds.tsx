// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useApp } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Input from '@/components/ui/Input';
// import Select from '@/components/ui/Select';
// import { formatCurrency } from '@/utils/formatters';

// export default function AddFunds() {
//     const navigate = useNavigate();
//     const { state, dispatch } = useApp();
//     const [amount, setAmount] = useState('');
//     const [paymentMethod, setPaymentMethod] = useState('credit-card');
//     const [loading, setLoading] = useState(false);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setLoading(true);

//         // Simulate API delay
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         const amountNum = parseFloat(amount);

//         // Add transaction
//         const transaction = {
//             id: `txn-${Date.now()}`,
//             type: 'topup' as const,
//             amount: amountNum,
//             status: 'completed' as const,
//             date: new Date().toISOString(),
//             description: `Wallet top-up via ${paymentMethod.replace('-', ' ')}`,
//         };

//         dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

//         // Update wallet balance
//         dispatch({
//             type: 'UPDATE_WALLET',
//             payload: {
//                 available: state.walletBalance.available + amountNum,
//             },
//         });

//         // Add activity
//         const activity = {
//             id: `act-${Date.now()}`,
//             type: 'project_created' as const, // Using existing type
//             userId: state.currentUser?.id || '',
//             description: `Added ${formatCurrency(amountNum)} to wallet`,
//             createdAt: new Date().toISOString(),
//         };

//         dispatch({ type: 'ADD_ACTIVITY', payload: activity });

//         setLoading(false);
//         navigate('/app/wallet');
//     };

//     return (
//         <div className="p-6 max-w-2xl mx-auto">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
//                 <p className="text-gray-600">Top up your wallet balance</p>
//             </div>

//             <Card className="p-6">
//                 <form onSubmit={handleSubmit} className="space-y-6">
//                     {/* Current Balance */}
//                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                         <p className="text-sm text-blue-700 mb-1">Current Available Balance</p>
//                         <p className="text-2xl font-bold text-blue-900">
//                             {formatCurrency(state.walletBalance.available)}
//                         </p>
//                     </div>

//                     {/* Amount */}
//                     <Input
//                         label="Amount (USD)"
//                         type="number"
//                         value={amount}
//                         onChange={(e) => setAmount(e.target.value)}
//                         placeholder="100.00"
//                         min="10"
//                         step="0.01"
//                         required
//                     />

//                     {/* Quick Amount Buttons */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">Quick Amount</label>
//                         <div className="grid grid-cols-4 gap-2">
//                             {[50, 100, 250, 500].map((amt) => (
//                                 <Button
//                                     key={amt}
//                                     type="button"
//                                     variant="secondary"
//                                     size="sm"
//                                     onClick={() => setAmount(amt.toString())}
//                                 >
//                                     ${amt}
//                                 </Button>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Payment Method */}
//                     <Select
//                         label="Payment Method"
//                         value={paymentMethod}
//                         onChange={(e) => setPaymentMethod(e.target.value)}
//                         options={[
//                             { value: 'credit-card', label: 'Credit Card' },
//                             { value: 'debit-card', label: 'Debit Card' },
//                             { value: 'bank-transfer', label: 'Bank Transfer' },
//                             { value: 'paypal', label: 'PayPal' },
//                         ]}
//                         required
//                     />

//                     {/* Payment Method Details (Mock) */}
//                     {paymentMethod === 'credit-card' && (
//                         <div className="p-4 bg-gray-50 rounded-lg space-y-3">
//                             <Input label="Card Number" placeholder="1234 5678 9012 3456" required />
//                             <div className="grid grid-cols-2 gap-3">
//                                 <Input label="Expiry" placeholder="MM/YY" required />
//                                 <Input label="CVV" placeholder="123" required />
//                             </div>
//                         </div>
//                     )}

//                     {/* Summary */}
//                     {amount && (
//                         <div className="p-4 bg-gray-50 rounded-lg">
//                             <div className="flex items-center justify-between mb-2">
//                                 <span className="text-gray-600">Amount</span>
//                                 <span className="font-medium">{formatCurrency(parseFloat(amount) || 0)}</span>
//                             </div>
//                             <div className="flex items-center justify-between mb-2">
//                                 <span className="text-gray-600">Processing Fee</span>
//                                 <span className="font-medium">$0.00</span>
//                             </div>
//                             <div className="pt-2 border-t border-gray-200">
//                                 <div className="flex items-center justify-between">
//                                     <span className="font-semibold text-gray-900">Total</span>
//                                     <span className="text-xl font-bold text-gray-900">
//                                         {formatCurrency(parseFloat(amount) || 0)}
//                                     </span>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Actions */}
//                     <div className="flex gap-3">
//                         <Button type="button" variant="secondary" onClick={() => navigate('/app/wallet')}>
//                             Cancel
//                         </Button>
//                         <Button type="submit" disabled={loading || !amount}>
//                             {loading ? 'Processing...' : 'Add Funds'}
//                         </Button>
//                     </div>
//                 </form>
//             </Card>

//             {/* Info */}
//             <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                 <h3 className="font-medium text-blue-900 mb-2">💡 About Adding Funds</h3>
//                 <ul className="text-sm text-blue-700 space-y-1">
//                     <li>• Funds are added instantly to your available balance</li>
//                     <li>• Minimum top-up amount is $10</li>
//                     <li>• No processing fees for wallet top-ups</li>
//                     <li>• Funds can be used for deposits or withdrawn anytime</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }
