import { useNavigate } from 'react-router-dom'
import { OptimizedImage } from './ui/OptimizedImage'
import { MapPin, Clock, DollarSign, Bookmark, Building2, Users } from 'lucide-react'

const LatestJobCards = ({ job = {} }) => {
    const navigate = useNavigate();

    // Format posted date
    const getPostedDate = () => {
        if (!job?.createdAt) return 'New';
        const createdAt = new Date(job.createdAt);
        const currentTime = new Date();
        const timeDifference = currentTime - createdAt;
        const daysAgo = Math.floor(timeDifference / (1000 * 24 * 60 * 60));

        if (daysAgo === 0) return 'Today';
        if (daysAgo === 1) return 'Yesterday';
        if (daysAgo < 7) return `${daysAgo}d ago`;
        if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}w ago`;
        return `${Math.floor(daysAgo / 30)}mo ago`;
    };

    // Format salary
    const formatSalary = (salary) => {
        if (!salary) return 'Competitive';
        if (salary >= 100) return `₹${salary / 100}L/yr`;
        return `₹${salary}LPA`;
    };

    return (
        <article
            onClick={() => navigate(`/description/${job._id}`)}
            className="group relative bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:-translate-y-1 cursor-pointer overflow-hidden"
        >
            {/* Absolute gradient glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 group-hover:border-yellow-500/30 transition-colors">
                        {job?.company?.logo ? (
                            <OptimizedImage
                                src={job.company.logo}
                                alt={job.company.name}
                                className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                            />
                        ) : (
                            <Building2 size={24} className="text-gray-500 group-hover:text-yellow-500 transition-colors" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 mb-0.5">{job?.company?.name || 'Company Name'}</p>
                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                            {job?.title || 'Job Title'}
                        </h3>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add save job functionality
                    }}
                    className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
                >
                    <Bookmark size={18} className="text-gray-500 hover:text-yellow-500" />
                </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                {job?.experienceLevel && (
                    <span className="px-2.5 py-1 rounded-md bg-neutral-900 text-xs font-medium text-gray-300 border border-white/5">
                        {job.experienceLevel}
                    </span>
                )}
                {job?.jobType && (
                    <span className="px-2.5 py-1 rounded-md bg-neutral-900 text-xs font-medium text-gray-300 border border-white/5">
                        {job.jobType}
                    </span>
                )}
                {job?.position && (
                    <span className="px-2.5 py-1 rounded-md bg-neutral-900 text-xs font-medium text-gray-300 border border-white/5">
                        {job.position} Position{job.position !== 1 && 's'}
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                {job?.skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="text-xs text-gray-500">#{skill}</span>
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10 mt-auto">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                    <DollarSign size={16} className="text-yellow-500" />
                    {formatSalary(job?.salary)}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {job?.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {getPostedDate()}
                    </span>
                </div>
            </div>
        </article>
    )
}

export default LatestJobCards