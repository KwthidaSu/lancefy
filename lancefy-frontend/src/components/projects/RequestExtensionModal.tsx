import { useState } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import DeadlineDatePicker from '@/components/ui/DeadlineDatePicker';

interface MilestoneOption {
    id: string;
    title: string;
}

interface RequestExtensionModalProps {
    milestones: MilestoneOption[];
    onClose: () => void;
    onSubmit: (milestoneId: string, newDate: string, reason: string) => void;
}

export default function RequestExtensionModal({ milestones, onClose, onSubmit }: RequestExtensionModalProps) {
    const [milestoneId, setMilestoneId] = useState(milestones[0]?.id || '');
    const [newDate, setNewDate] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(milestoneId, newDate, reason);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">ขอขยายเวลาส่งงาน</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-1">
                            ระบุ Milestone ที่ต้องการขยายเวลา
                        </label>
                        <Select
                            value={milestoneId}
                            onChange={(e) => setMilestoneId(e.target.value)}
                            options={[
                                { value: '', label: '-- เลือก Milestone --' },
                                ...milestones.map((m) => ({ value: m.id, label: m.title }))
                            ]}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-1">
                            วันที่ต้องการส่ง (ใหม่)
                        </label>
                        <DeadlineDatePicker
                            value={newDate}
                            onChange={(date) => setNewDate(date || '')}
                        />
                    </div>

                    <Textarea
                        label="เหตุผลที่ขอขยายเวลา"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="อธิบายเหตุผลให้ลูกค้าทราบ..."
                        rows={3}
                        required
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            ยกเลิก
                        </Button>
                        <Button type="submit">
                            ส่งคำขอ
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

