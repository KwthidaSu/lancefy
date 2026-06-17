// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useApp, useCurrentUser } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Select from '@/components/ui/Select';
// import Badge from '@/components/ui/Badge';
// import { formatCurrency } from '@/utils/formatters';

// export default function EscrowDeposit() {
//     const navigate = useNavigate();
//     const { state, dispatch } = useApp();
//     const currentUser = useCurrentUser();
//     const [selectedProject, setSelectedProject] = useState('');
//     const [selectedMilestone, setSelectedMilestone] = useState('');
//     const [loading, setLoading] = useState(false);

//     // Get user's projects as client
//     const myProjects = (state.projects || []).filter((p) => p.clientId === currentUser?.id);

//     const project = myProjects.find((p) => p.id === selectedProject);
//     const milestone = project?.milestones.find((m) => m.id === selectedMilestone);

//     // Calculate required amount
//     const requiredAmount = milestone ? milestone.amount : 0;
//     const canDeposit = state.walletBalance.available >= requiredAmount;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!milestone || !project) return;

//         setLoading(true);

//         // Simulate API delay
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         // Add transaction
//         const transaction = {
//             id: `txn-${Date.now()}`,
//             type: 'deposit' as const,
//             amount: requiredAmount,
//             status: 'completed' as const,
//             date: new Date().toISOString(),
//             relatedProjectId: project.id,
//             relatedMilestoneId: milestone.id,
//             description: `Secure deposit for "${milestone.title}"`,
//         };

//         dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

//         // Update wallet balance
//         dispatch({
//             type: 'UPDATE_WALLET',
//             payload: {
//                 available: state.walletBalance.available - requiredAmount,
//                 inEscrow: state.walletBalance.inEscrow + requiredAmount,
//             },
//         });

//         // Update milestone funding status
//         dispatch({
//             type: 'UPDATE_MILESTONE',
//             payload: {
//                 projectId: project.id,
//                 milestoneId: milestone.id,
//                 updates: { fundingStatus: 'funded' },
//             },
//         });

//         // Add activity
//         const activity = {
//             id: `act-${Date.now()}`,
//             type: 'milestone_funded' as const,
//             projectId: project.id,
//             milestoneId: milestone.id,
//             userId: currentUser?.id || '',
//             description: `Deposited ${formatCurrency(requiredAmount)} for "${milestone.title}"`,
//             createdAt: new Date().toISOString(),
//         };

//         dispatch({ type: 'ADD_ACTIVITY', payload: activity });

//         setLoading(false);
//         navigate('/app/wallet');
//     };

//     return (
//         <div className="p-6 max-w-2xl mx-auto">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">Secure Deposit</h1>
//                 <p className="text-gray-600">Deposit funds to secure this milestone</p>
//             </div>

//             <Card className="p-6">
//                 <form onSubmit={handleSubmit} className="space-y-6">
//                     {/* Current Balance */}
//                     <div className="grid grid-cols-2 gap-4">
//                         <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//                             <p className="text-sm text-green-700 mb-1">Available Balance</p>
//                             <p className="text-xl font-bold text-green-900">
//                                 {formatCurrency(state.walletBalance.available)}
//                             </p>
//                         </div>
//                         <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                             <p className="text-sm text-blue-700 mb-1">Reserved Funds</p>
//                             <p className="text-xl font-bold text-blue-900">
//                                 {formatCurrency(state.walletBalance.inEscrow)}
//                             </p>
//                         </div>
//                     </div>

//                     {/* Project Selection */}
//                     <Select
//                         label="Select Project"
//                         value={selectedProject}
//                         onChange={(e) => {
//                             setSelectedProject(e.target.value);
//                             setSelectedMilestone('');
//                         }}
//                         options={[
//                             { value: '', label: 'Choose a project...' },
//                             ...myProjects.map((p) => ({
//                                 value: p.id,
//                                 label: p.title,
//                             })),
//                         ]}
//                         required
//                     />

//                     {/* Milestone Selection */}
//                     {project && (
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Select Milestone
//                             </label>
//                             <div className="space-y-2">
//                                 {project.milestones.map((m) => (
//                                     <label
//                                         key={m.id}
//                                         className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedMilestone === m.id
//                                             ? 'border-blue-500 bg-blue-50'
//                                             : 'border-gray-200 hover:border-gray-300'
//                                             } ${m.fundingStatus === 'funded' ? 'opacity-50 cursor-not-allowed' : ''}`}
//                                     >
//                                         <div className="flex items-center gap-3">
//                                             <input
//                                                 type="radio"
//                                                 name="milestone"
//                                                 value={m.id}
//                                                 checked={selectedMilestone === m.id}
//                                                 onChange={(e) => setSelectedMilestone(e.target.value)}
//                                                 disabled={m.fundingStatus === 'funded'}
//                                                 className="w-4 h-4"
//                                             />
//                                             <div>
//                                                 <p className="font-medium text-gray-900">{m.title}</p>
//                                                 <p className="text-sm text-gray-500">{m.description}</p>
//                                             </div>
//                                         </div>
//                                         <div className="text-right">
//                                             <p className="font-bold text-gray-900">{formatCurrency(m.amount)}</p>
//                                             <Badge variant={m.fundingStatus === 'funded' ? 'funded' : 'default'}>
//                                                 {m.fundingStatus}
//                                             </Badge>
//                                         </div>
//                                     </label>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {/* Summary */}
//                     {milestone && (
//                         <div className="p-4 bg-gray-50 rounded-lg">
//                             <h3 className="font-semibold text-gray-900 mb-3">Deposit Summary</h3>
//                             <div className="space-y-2">
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-gray-600">Milestone</span>
//                                     <span className="font-medium">{milestone.title}</span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-gray-600">Amount</span>
//                                     <span className="font-medium">{formatCurrency(requiredAmount)}</span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-gray-600">Your Available Balance</span>
//                                     <span className="font-medium">{formatCurrency(state.walletBalance.available)}</span>
//                                 </div>
//                                 <div className="pt-2 border-t border-gray-200">
//                                     <div className="flex items-center justify-between">
//                                         <span className="font-semibold text-gray-900">Balance After Deposit</span>
//                                         <span className={`text-xl font-bold ${canDeposit ? 'text-gray-900' : 'text-red-600'}`}>
//                                             {formatCurrency(state.walletBalance.available - requiredAmount)}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {!canDeposit && (
//                                 <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
//                                     <p className="text-sm text-red-700">
//                                         ⚠️ Insufficient balance. Please add funds to your wallet first.
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
//                         <Button type="submit" disabled={loading || !milestone || !canDeposit}>
//                             {loading ? 'Processing...' : 'Confirm Deposit'}
//                         </Button>
//                     </div>
//                 </form>
//             </Card>

//             {/* Info */}
//             <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                 <h3 className="font-medium text-blue-900 mb-2">💡 About Safe Payment</h3>
//                 <ul className="text-sm text-blue-700 space-y-1">
//                     <li>• Funds are held securely until milestone completion</li>
//                     <li>• Freelancer can only receive funds after work is approved</li>
//                     <li>• You can request a refund if work is not delivered</li>
//                     <li>• Platform fee (5%) is deducted when releasing payment</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }
