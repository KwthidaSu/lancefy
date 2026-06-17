// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useApp, useCurrentUser } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Select from '@/components/ui/Select';
// import Textarea from '@/components/ui/Textarea';
// import Badge from '@/components/ui/Badge';
// import { formatCurrency } from '@/utils/formatters';

// export default function Refund() {
//     const navigate = useNavigate();
//     const { state, dispatch } = useApp();
//     const currentUser = useCurrentUser();
//     const [selectedProject, setSelectedProject] = useState('');
//     const [selectedMilestone, setSelectedMilestone] = useState('');
//     const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
//     const [partialAmount, setPartialAmount] = useState('');
//     const [reason, setReason] = useState('');
//     const [loading, setLoading] = useState(false);

//     // Get user's projects as client with funded milestones
//     const myProjects = (state.projects || []).filter((p) => p.clientId === currentUser?.id);

//     const project = myProjects.find((p) => p.id === selectedProject);
//     const milestone = project?.milestones.find((m) => m.id === selectedMilestone);

//     const refundAmount =
//         refundType === 'full' ? milestone?.amount || 0 : parseFloat(partialAmount) || 0;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!milestone || !project) return;

//         setLoading(true);

//         // Simulate API delay
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         // Add refund transaction
//         const transaction = {
//             id: `txn-${Date.now()}`,
//             type: 'refund' as const,
//             amount: refundAmount,
//             status: 'completed' as const,
//             date: new Date().toISOString(),
//             relatedProjectId: project.id,
//             relatedMilestoneId: milestone.id,
//             description: `Refund for "${milestone.title}" - ${refundType}`,
//         };

//         dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

//         // Update wallet balance
//         dispatch({
//             type: 'UPDATE_WALLET',
//             payload: {
//                 available: state.walletBalance.available + refundAmount,
//                 inEscrow: state.walletBalance.inEscrow - refundAmount,
//             },
//         });

//         // Update milestone funding status
//         const newFundingStatus = refundType === 'full' ? 'refunded' : 'funded';
//         dispatch({
//             type: 'UPDATE_MILESTONE',
//             payload: {
//                 projectId: project.id,
//                 milestoneId: milestone.id,
//                 updates: { fundingStatus: newFundingStatus as any },
//             },
//         });

//         // Add activity
//         const activity = {
//             id: `act-${Date.now()}`,
//             type: 'project_created' as const, // Using existing type
//             projectId: project.id,
//             milestoneId: milestone.id,
//             userId: currentUser?.id || '',
//             description: `Refunded ${formatCurrency(refundAmount)} from "${milestone.title}"`,
//             createdAt: new Date().toISOString(),
//         };

//         dispatch({ type: 'ADD_ACTIVITY', payload: activity });

//         setLoading(false);
//         navigate('/app/wallet');
//     };

//     return (
//         <div className="p-6 max-w-2xl mx-auto">
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">Request Refund</h1>
//                 <p className="text-gray-600">Get funds back from reserved amount</p>
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
//                             <p className="text-sm text-blue-700 mb-1">Reserved Amount</p>
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
//                                 Select Milestone to Refund
//                             </label>
//                             <div className="space-y-2">
//                                 {project.milestones
//                                     .filter((m) => m.fundingStatus === 'funded')
//                                     .map((m) => (
//                                         <label
//                                             key={m.id}
//                                             className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedMilestone === m.id
//                                                 ? 'border-blue-500 bg-blue-50'
//                                                 : 'border-gray-200 hover:border-gray-300'
//                                                 }`}
//                                         >
//                                             <div className="flex items-center gap-3">
//                                                 <input
//                                                     type="radio"
//                                                     name="milestone"
//                                                     value={m.id}
//                                                     checked={selectedMilestone === m.id}
//                                                     onChange={(e) => setSelectedMilestone(e.target.value)}
//                                                     className="w-4 h-4"
//                                                 />
//                                                 <div>
//                                                     <p className="font-medium text-gray-900">{m.title}</p>
//                                                     <p className="text-sm text-gray-500">{m.description}</p>
//                                                 </div>
//                                             </div>
//                                             <div className="text-right">
//                                                 <p className="font-bold text-gray-900">{formatCurrency(m.amount)}</p>
//                                                 <Badge variant="funded">{m.fundingStatus}</Badge>
//                                             </div>
//                                         </label>
//                                     ))}
//                                 {project.milestones.filter((m) => m.fundingStatus === 'funded').length === 0 && (
//                                     <p className="text-gray-500 text-center py-4">
//                                         No funded milestones available for refund
//                                     </p>
//                                 )}
//                             </div>
//                         </div>
//                     )}

//                     {/* Refund Type */}
//                     {milestone && (
//                         <>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">Refund Type</label>
//                                 <div className="space-y-2">
//                                     <label className="flex items-center">
//                                         <input
//                                             type="radio"
//                                             value="full"
//                                             checked={refundType === 'full'}
//                                             onChange={(e) => setRefundType(e.target.value as 'full')}
//                                             className="mr-2"
//                                         />
//                                         <span className="text-sm">
//                                             <strong>Full Refund</strong> - Get back the entire milestone amount (
//                                             {formatCurrency(milestone.amount)})
//                                         </span>
//                                     </label>
//                                     <label className="flex items-center">
//                                         <input
//                                             type="radio"
//                                             value="partial"
//                                             checked={refundType === 'partial'}
//                                             onChange={(e) => setRefundType(e.target.value as 'partial')}
//                                             className="mr-2"
//                                         />
//                                         <span className="text-sm">
//                                             <strong>Partial Refund</strong> - Specify a custom amount
//                                         </span>
//                                     </label>
//                                 </div>
//                             </div>

//                             {refundType === 'partial' && (
//                                 <div>
//                                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                                         Refund Amount (USD)
//                                     </label>
//                                     <input
//                                         type="number"
//                                         value={partialAmount}
//                                         onChange={(e) => setPartialAmount(e.target.value)}
//                                         placeholder="0.00"
//                                         min="0.01"
//                                         max={milestone.amount}
//                                         step="0.01"
//                                         className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                                         required
//                                     />
//                                     <p className="text-sm text-gray-500 mt-1">
//                                         Maximum: {formatCurrency(milestone.amount)}
//                                     </p>
//                                 </div>
//                             )}

//                             {/* Reason */}
//                             <Textarea
//                                 label="Reason for Refund"
//                                 value={reason}
//                                 onChange={(e) => setReason(e.target.value)}
//                                 placeholder="Please explain why you're requesting a refund..."
//                                 rows={4}
//                                 required
//                             />

//                             {/* Summary */}
//                             <div className="p-4 bg-gray-50 rounded-lg">
//                                 <h3 className="font-semibold text-gray-900 mb-3">Refund Summary</h3>
//                                 <div className="space-y-2">
//                                     <div className="flex items-center justify-between">
//                                         <span className="text-gray-600">Milestone</span>
//                                         <span className="font-medium">{milestone.title}</span>
//                                     </div>
//                                     <div className="flex items-center justify-between">
//                                         <span className="text-gray-600">Original Amount</span>
//                                         <span className="font-medium">{formatCurrency(milestone.amount)}</span>
//                                     </div>
//                                     <div className="flex items-center justify-between">
//                                         <span className="text-gray-600">Refund Type</span>
//                                         <span className="font-medium capitalize">{refundType}</span>
//                                     </div>
//                                     <div className="pt-2 border-t border-gray-200">
//                                         <div className="flex items-center justify-between">
//                                             <span className="font-semibold text-gray-900">Refund Amount</span>
//                                             <span className="text-xl font-bold text-gray-900">
//                                                 {formatCurrency(refundAmount)}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </>
//                     )}

//                     {/* Actions */}
//                     <div className="flex gap-3">
//                         <Button type="button" variant="secondary" onClick={() => navigate('/app/wallet')}>
//                             Cancel
//                         </Button>
//                         <Button type="submit" disabled={loading || !milestone || !reason}>
//                             {loading ? 'Processing...' : 'Request Refund'}
//                         </Button>
//                     </div>
//                 </form>
//             </Card>

//             {/* Warning */}
//             <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
//                 <h3 className="font-medium text-amber-900 mb-2">⚠️ Important</h3>
//                 <ul className="text-sm text-amber-700 space-y-1">
//                     <li>• Refunds return funds from reserved amount to your available balance</li>
//                     <li>• Full refunds will cancel the milestone</li>
//                     <li>• Partial refunds keep the milestone active with reduced amount</li>
//                     <li>• The freelancer will be notified of the refund request</li>
//                     <li>• Disputed refunds may require platform mediation</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }
