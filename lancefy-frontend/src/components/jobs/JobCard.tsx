import { Link } from 'react-router-dom';
import type { Project } from '@/types';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface JobCardProps {
    project: Project;
}

export default function JobCard({ project }: JobCardProps) {
    const daysAgo = Math.floor(
        (new Date().getTime() - new Date(project.posted_at || project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
        <Link
            to={`/app/jobs/${project.id}`}
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-1">
                        {project.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>โพสต์ {daysAgo === 0 ? 'วันนี้' : `${daysAgo} วันที่แล้ว`}</span>
                        <span>•</span>
                        <Badge variant="default" className="capitalize">
                            {project.category === 'illustration' ? 'วาดรูป' : project.category === 'graphic' ? 'กราฟิก' : '3D'}
                        </Badge>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(project.budget)}</p>
                    <p className="text-xs text-gray-500">งบประมาณ</p>
                </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.scope}</p>

            {/* Requirements */}
            {project.requirements && project.requirements.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        {project.requirements.slice(0, 3).map((req, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                                ✓ {req}
                            </span>
                        ))}
                        {project.requirements.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                +{project.requirements.length - 3} เพิ่มเติม
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        <span>{project.milestones.length} Milestone</span>
                    </div>
                    {project.deadline && (
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <span>ครบกำหนด {formatDate(project.deadline)}</span>
                        </div>
                    )}
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                    ส่งข้อเสนอ
                </button>
            </div>
        </Link>
    );
}
