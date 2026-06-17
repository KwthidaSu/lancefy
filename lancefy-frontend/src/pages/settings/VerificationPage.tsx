// import { useState } from 'react';
// import { useApp, useCurrentUser } from '@/context/AppContext';
// import Card from '@/components/ui/Card';
// import Button from '@/components/ui/Button';
// import Badge from '@/components/ui/Badge';
// import { formatDate } from '@/utils/formatters';

// export default function VerificationPage() {
//     const { state, dispatch } = useApp();
//     const currentUser = useCurrentUser();
//     const [idCardFile, setIdCardFile] = useState<File | null>(null);
//     const [selfieFile, setSelfieFile] = useState<File | null>(null);
//     const [idCardPreview, setIdCardPreview] = useState<string>('');
//     const [selfiePreview, setSelfiePreview] = useState<string>('');
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const verificationStatus = currentUser?.verificationStatus || 'pending';
//     const verificationDocs = currentUser?.verificationDocuments;

//     const handleFileChange = (
//         e: React.ChangeEvent<HTMLInputElement>,
//         type: 'idCard' | 'selfie'
//     ) => {
//         const file = e.target.files?.[0];
//         if (!file) return;

//         // Create preview
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const preview = reader.result as string;
//             if (type === 'idCard') {
//                 setIdCardFile(file);
//                 setIdCardPreview(preview);
//             } else {
//                 setSelfieFile(file);
//                 setSelfiePreview(preview);
//             }
//         };
//         reader.readAsDataURL(file);
//     };

//     const handleSubmit = (e: React.FormEvent) => {
//         e.preventDefault();

//         if (!idCardFile || !selfieFile) {
//             alert('กรุณาอัพโหลดรูปภาพทั้งสองรูป');
//             return;
//         }

//         if (!currentUser) return;

//         setIsSubmitting(true);

//         // Simulate upload delay
//         setTimeout(() => {
//             // In real app, upload files to server
//             // For now, use preview URLs
//             dispatch({
//                 type: 'UPDATE_USER',
//                 payload: {
//                     id: currentUser.id,
//                     updates: {
//                         verificationStatus: 'pending',
//                         verificationDocuments: {
//                             idCard: idCardPreview,
//                             selfie: selfiePreview,
//                             submittedAt: new Date().toISOString(),
//                         },
//                     },
//                 },
//             });

//             setIsSubmitting(false);
//             alert('ส่งเอกสารสำเร็จ! รอการตรวจสอบจากทีมงาน');
//         }, 1500);
//     };

//     return (
//         <div className="p-6 max-w-4xl mx-auto">
//             <h1 className="text-2xl font-bold text-gray-900 mb-2">ยืนยันตัวตน</h1>
//             <p className="text-gray-600 mb-6">
//                 เพื่อความปลอดภัยและความน่าเชื่อถือ กรุณาอัพโหลดเอกสารยืนยันตัวตน
//             </p>

//             {/* Status Card */}
//             <Card className="p-6 mb-6">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <h2 className="text-lg font-semibold text-gray-900 mb-1">สถานะการยืนยัน</h2>
//                         <p className="text-sm text-gray-600">
//                             {verificationStatus === 'verified'
//                                 ? 'บัญชีของคุณได้รับการยืนยันแล้ว'
//                                 : verificationStatus === 'pending'
//                                     ? 'กำลังรอการตรวจสอบจากทีมงาน'
//                                     : 'ยังไม่ได้ยืนยันตัวตน'}
//                         </p>
//                     </div>
//                     <Badge
//                         variant={
//                             verificationStatus === 'verified'
//                                 ? 'released'
//                                 : verificationStatus === 'pending'
//                                     ? 'pending'
//                                     : 'default'
//                         }
//                     >
//                         {verificationStatus === 'verified'
//                             ? '✓ ยืนยันแล้ว'
//                             : verificationStatus === 'pending'
//                                 ? '⏳ รอตรวจสอบ'
//                                 : '⚠️ ยังไม่ยืนยัน'}
//                     </Badge>
//                 </div>

//                 {verificationDocs?.submittedAt && (
//                     <div className="mt-4 pt-4 border-t border-gray-200">
//                         <p className="text-sm text-gray-600">
//                             ส่งเอกสารเมื่อ: {formatDate(verificationDocs.submittedAt)}
//                         </p>
//                         {verificationDocs.reviewedAt && (
//                             <p className="text-sm text-gray-600">
//                                 ตรวจสอบเมื่อ: {formatDate(verificationDocs.reviewedAt)}
//                             </p>
//                         )}
//                         {verificationDocs.rejectionReason && (
//                             <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
//                                 <p className="text-sm text-red-800">
//                                     <span className="font-medium">เหตุผลที่ปฏิเสธ:</span> {verificationDocs.rejectionReason}
//                                 </p>
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </Card>

//             {/* Upload Form */}
//             {verificationStatus !== 'verified' && (
//                 <Card className="p-6">
//                     <form onSubmit={handleSubmit}>
//                         <div className="space-y-6">
//                             {/* Instructions */}
//                             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                                 <h3 className="font-medium text-blue-900 mb-2">คำแนะนำ</h3>
//                                 <ul className="text-sm text-blue-800 space-y-1">
//                                     <li>• อัพโหลดรูปบัตรประชาชนที่ชัดเจน อ่านได้ทุกตัวอักษร</li>
//                                     <li>• ถ่ายรูปเซลฟี่พร้อมถือบัตรประชาชนข้างใบหน้า</li>
//                                     <li>• ไฟล์ต้องเป็น JPG, PNG หรือ PDF ขนาดไม่เกิน 5MB</li>
//                                     <li>• ข้อมูลของคุณจะถูกเก็บเป็นความลับและปลอดภัย</li>
//                                 </ul>
//                             </div>

//                             {/* ID Card Upload */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     รูปบัตรประชาชน <span className="text-red-500">*</span>
//                                 </label>
//                                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
//                                     {idCardPreview ? (
//                                         <div className="space-y-3">
//                                             <img
//                                                 src={idCardPreview}
//                                                 alt="ID Card Preview"
//                                                 className="max-h-48 mx-auto rounded-lg"
//                                             />
//                                             <button
//                                                 type="button"
//                                                 onClick={() => {
//                                                     setIdCardFile(null);
//                                                     setIdCardPreview('');
//                                                 }}
//                                                 className="text-sm text-red-600 hover:text-red-700"
//                                             >
//                                                 ลบรูป
//                                             </button>
//                                         </div>
//                                     ) : (
//                                         <div>
//                                             <svg
//                                                 className="mx-auto h-12 w-12 text-gray-400"
//                                                 fill="none"
//                                                 viewBox="0 0 24 24"
//                                                 stroke="currentColor"
//                                             >
//                                                 <path
//                                                     strokeLinecap="round"
//                                                     strokeLinejoin="round"
//                                                     strokeWidth={2}
//                                                     d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
//                                                 />
//                                             </svg>
//                                             <p className="mt-2 text-sm text-gray-600">
//                                                 คลิกเพื่ือเลือกไฟล์หรือลากไฟล์มาวาง
//                                             </p>
//                                             <input
//                                                 type="file"
//                                                 accept="image/*"
//                                                 onChange={(e) => handleFileChange(e, 'idCard')}
//                                                 className="hidden"
//                                                 id="idCard"
//                                             />
//                                             <label
//                                                 htmlFor="idCard"
//                                                 className="mt-3 inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
//                                             >
//                                                 เลือกไฟล์
//                                             </label>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Selfie Upload */}
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                                     รูปเซลฟี่พร้อมบัตรประชาชน <span className="text-red-500">*</span>
//                                 </label>
//                                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
//                                     {selfiePreview ? (
//                                         <div className="space-y-3">
//                                             <img
//                                                 src={selfiePreview}
//                                                 alt="Selfie Preview"
//                                                 className="max-h-48 mx-auto rounded-lg"
//                                             />
//                                             <button
//                                                 type="button"
//                                                 onClick={() => {
//                                                     setSelfieFile(null);
//                                                     setSelfiePreview('');
//                                                 }}
//                                                 className="text-sm text-red-600 hover:text-red-700"
//                                             >
//                                                 ลบรูป
//                                             </button>
//                                         </div>
//                                     ) : (
//                                         <div>
//                                             <svg
//                                                 className="mx-auto h-12 w-12 text-gray-400"
//                                                 fill="none"
//                                                 viewBox="0 0 24 24"
//                                                 stroke="currentColor"
//                                             >
//                                                 <path
//                                                     strokeLinecap="round"
//                                                     strokeLinejoin="round"
//                                                     strokeWidth={2}
//                                                     d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
//                                                 />
//                                             </svg>
//                                             <p className="mt-2 text-sm text-gray-600">
//                                                 คลิกเพื่อเลือกไฟล์หรือลากไฟล์มาวาง
//                                             </p>
//                                             <input
//                                                 type="file"
//                                                 accept="image/*"
//                                                 onChange={(e) => handleFileChange(e, 'selfie')}
//                                                 className="hidden"
//                                                 id="selfie"
//                                             />
//                                             <label
//                                                 htmlFor="selfie"
//                                                 className="mt-3 inline-block px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
//                                             >
//                                                 เลือกไฟล์
//                                             </label>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Submit Button */}
//                             <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
//                                 <Button
//                                     type="submit"
//                                     disabled={!idCardFile || !selfieFile || isSubmitting}
//                                     className="w-full sm:w-auto"
//                                 >
//                                     {isSubmitting ? 'กำลังส่ง...' : 'ส่งเอกสารยืนยันตัวตน'}
//                                 </Button>
//                             </div>
//                         </div>
//                     </form>
//                 </Card>
//             )}

//             {/* Verified Badge */}
//             {verificationStatus === 'verified' && (
//                 <Card className="p-6 bg-green-50 border-green-200">
//                     <div className="flex items-center gap-3">
//                         <div className="flex-shrink-0">
//                             <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                             </svg>
//                         </div>
//                         <div>
//                             <h3 className="text-lg font-semibold text-green-900">บัญชีได้รับการยืนยันแล้ว</h3>
//                             <p className="text-sm text-green-700">
//                                 คุณสามารถใช้งานฟีเจอร์ทั้งหมดของ Frelio ได้เต็มรูปแบบ
//                             </p>
//                         </div>
//                     </div>
//                 </Card>
//             )}
//         </div>
//     );
// }
