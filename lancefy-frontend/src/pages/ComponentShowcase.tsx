import { useState } from 'react';
import {
    Upload, Download, FileText, Star, Heart, Bell, Mail, Settings
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import Timeline from '@/components/ui/Timeline';
import Tabs from '@/components/ui/Tabs';
import FileList from '@/components/ui/FileList';
import { useToast } from '@/components/ui/Toast';

export default function ComponentShowcase() {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('buttons');
    const { showToast } = useToast();

    const showcaseSections = [
        { id: 'buttons', label: 'Buttons', icon: '🔘' },
        { id: 'inputs', label: 'Inputs', icon: '📝' },
        { id: 'cards', label: 'Cards', icon: '🃏' },
        { id: 'badges', label: 'Badges', icon: '🏷️' },
        { id: 'modals', label: 'Modals', icon: '🪟' },
        { id: 'feedback', label: 'Feedback', icon: '💬' },
        { id: 'data', label: 'Data Display', icon: '📊' },
    ];

    const mockFiles = [
        {
            id: '1',
            name: 'project-proposal.pdf',
            size: 2048576,
            type: 'application/pdf',
            url: '#',
            uploadedAt: new Date('2024-01-15'),
        },
        {
            id: '2',
            name: 'design-mockup.png',
            size: 1536000,
            type: 'image/png',
            url: '#',
            uploadedAt: new Date('2024-01-16'),
        },
    ];

    const timelineItems = [
        {
            id: '1',
            title: 'Project Created',
            description: 'New project initialized',
            timestamp: '2024-01-10T10:00:00Z',
            variant: 'success' as const,
        },
        {
            id: '2',
            title: 'Milestone Completed',
            description: 'First milestone delivered',
            timestamp: '2024-01-15T14:30:00Z',
            variant: 'default' as const,
        },
        {
            id: '3',
            title: 'Payment Received',
            description: 'Payment processed successfully',
            timestamp: '2024-01-20T09:15:00Z',
            variant: 'success' as const,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
            {/* Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                Component Showcase
                            </h1>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">
                                ห้องแสดง UI Components ทั้งหมดพร้อมตัวอย่างการใช้งาน
                            </p>
                        </div>
                        <Badge variant="in-progress">
                            14 Components
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {showcaseSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveTab(section.id)}
                            className={`
                px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200
                ${activeTab === section.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }
              `}
                        >
                            <span className="mr-2">{section.icon}</span>
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {/* Buttons Section */}
                {activeTab === 'buttons' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Button Variants
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Primary Buttons
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="primary" size="sm">Small</Button>
                                        <Button variant="primary" size="md">Medium</Button>
                                        <Button variant="primary" size="lg">Large</Button>
                                        <Button variant="primary" disabled>Disabled</Button>
                                        <Button variant="primary" isLoading>Loading</Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Secondary Buttons
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="secondary" size="sm">Small</Button>
                                        <Button variant="secondary" size="md">Medium</Button>
                                        <Button variant="secondary" size="lg">Large</Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Danger & Ghost Buttons
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="danger">Delete</Button>
                                        <Button variant="ghost">Cancel</Button>
                                        <Button variant="ghost" className="gap-2">
                                            <Settings size={18} />
                                            Settings
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Buttons with Icons
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="primary" className="gap-2">
                                            <Upload size={18} />
                                            Upload
                                        </Button>
                                        <Button variant="secondary" className="gap-2">
                                            <Download size={18} />
                                            Download
                                        </Button>
                                        <Button variant="primary" className="gap-2">
                                            <Mail size={18} />
                                            Send Email
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Inputs Section */}
                {activeTab === 'inputs' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Form Inputs
                            </h2>
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Text Inputs
                                    </h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="ชื่อผู้ใช้"
                                            placeholder="กรอกชื่อผู้ใช้"
                                        />
                                        <Input
                                            label="อีเมล"
                                            type="email"
                                            placeholder="example@email.com"
                                            required
                                        />
                                        <Input
                                            label="รหัสผ่าน"
                                            type="password"
                                            placeholder="••••••••"
                                            error="รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
                                        />
                                        <Input
                                            label="Disabled Input"
                                            value="Cannot edit this"
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Textarea
                                    </h3>
                                    <Textarea
                                        label="คำอธิบาย"
                                        placeholder="กรอกรายละเอียดโปรเจค..."
                                        rows={4}
                                    />
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Select Dropdown
                                    </h3>
                                    <Select
                                        label="ประเภทโปรเจค"
                                        options={[
                                            { value: '', label: 'เลือกประเภทโปรเจค' },
                                            { value: 'web', label: 'Web Development' },
                                            { value: 'mobile', label: 'Mobile App' },
                                            { value: 'design', label: 'UI/UX Design' },
                                            { value: 'data', label: 'Data Science' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Cards Section */}
                {activeTab === 'cards' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card hover>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Star className="text-blue-600 dark:text-blue-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            Featured Card
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            With hover effect
                                        </p>
                                    </div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    This card has a hover effect that lifts it up slightly.
                                </p>
                            </Card>

                            <Card>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <Heart className="text-green-600 dark:text-green-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            Standard Card
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Default style
                                        </p>
                                    </div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    A simple card component with clean design.
                                </p>
                            </Card>

                            <Card hover>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Bell className="text-purple-600 dark:text-purple-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            Notification Card
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Interactive
                                        </p>
                                    </div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Perfect for displaying notifications and updates.
                                </p>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Badges Section */}
                {activeTab === 'badges' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Badge Variants
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Status Variants
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Badge variant="default">Default</Badge>
                                        <Badge variant="pending">Pending</Badge>
                                        <Badge variant="in-progress">In Progress</Badge>
                                        <Badge variant="review">Review</Badge>
                                        <Badge variant="funded">Funded</Badge>
                                        <Badge variant="released">Released</Badge>
                                        <Badge variant="refunded">Refunded</Badge>
                                        <Badge variant="dispute">Dispute</Badge>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Use Cases
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Badge variant="funded">Active</Badge>
                                        <Badge variant="pending">Pending Approval</Badge>
                                        <Badge variant="dispute">Rejected</Badge>
                                        <Badge variant="in-progress">In Development</Badge>
                                        <Badge variant="default">Draft</Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Modals Section */}
                {activeTab === 'modals' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Modal Dialogs
                            </h2>
                            <div className="space-y-4">
                                <p className="text-slate-600 dark:text-slate-400">
                                    Click the button below to open a modal dialog.
                                </p>
                                <Button variant="primary" onClick={() => setModalOpen(true)}>
                                    Open Modal
                                </Button>
                            </div>

                            <Modal
                                isOpen={modalOpen}
                                onClose={() => setModalOpen(false)}
                                title="Example Modal"
                            >
                                <div className="space-y-4">
                                    <p className="text-slate-600 dark:text-slate-400">
                                        This is an example modal dialog. You can put any content here.
                                    </p>
                                    <Input label="Name" placeholder="Enter your name" />
                                    <Textarea label="Message" placeholder="Enter your message" rows={3} />
                                    <div className="flex gap-3 justify-end pt-4">
                                        <Button variant="ghost" onClick={() => setModalOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button variant="primary" onClick={() => setModalOpen(false)}>
                                            Submit
                                        </Button>
                                    </div>
                                </div>
                            </Modal>
                        </Card>
                    </div>
                )}

                {/* Feedback Section */}
                {activeTab === 'feedback' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Feedback Components
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Toast Notifications
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="primary"
                                            onClick={() => showToast('Success message!', 'success')}
                                        >
                                            Success Toast
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => showToast('Info message!', 'info')}
                                        >
                                            Info Toast
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => showToast('Error message!', 'error')}
                                        >
                                            Error Toast
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Progress Bars
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">25% Complete</p>
                                            <ProgressBar value={25} showLabel />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">50% Complete</p>
                                            <ProgressBar value={50} showLabel />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">75% Complete</p>
                                            <ProgressBar value={75} showLabel />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">100% Complete</p>
                                            <ProgressBar value={100} showLabel />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                        Empty State
                                    </h3>
                                    <EmptyState
                                        icon={<FileText size={48} />}
                                        title="No items found"
                                        description="There are no items to display at the moment."
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Data Display Section */}
                {activeTab === 'data' && (
                    <div className="space-y-8 animate-fade-in">
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Avatar
                            </h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <Avatar alt="John Doe" size="sm" />
                                <Avatar alt="Jane Smith" size="md" />
                                <Avatar alt="Bob Wilson" size="lg" />
                                <Avatar
                                    src="https://i.pravatar.cc/150?img=1"
                                    alt="User"
                                    size="lg"
                                />
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Timeline
                            </h2>
                            <Timeline items={timelineItems} />
                        </Card>

                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Tabs
                            </h2>
                            <Tabs
                                tabs={[
                                    { id: 'tab1', label: 'Overview', content: <div className="p-4 text-slate-600 dark:text-slate-400">Overview content goes here.</div> },
                                    { id: 'tab2', label: 'Details', content: <div className="p-4 text-slate-600 dark:text-slate-400">Details content goes here.</div> },
                                    { id: 'tab3', label: 'Settings', content: <div className="p-4 text-slate-600 dark:text-slate-400">Settings content goes here.</div> },
                                ]}
                            />
                        </Card>

                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                File List
                            </h2>
                            <FileList files={mockFiles} onRemove={(id) => console.log('Delete', id)} />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
