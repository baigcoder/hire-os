import React from 'react';
import Navbar from '../shared/Navbar';
import { useSelector } from 'react-redux';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import InterviewCard from './InterviewCard';
import useGetAppliedJobs from '@/hooks/useGetAppliedJobs';

const AppliedJobs = () => {
    // Use the custom hook to fetch applied jobs
    useGetAppliedJobs();

    // Get applications from Redux store
    const { allAppliedJobs } = useSelector(store => store.job);
    const applications = allAppliedJobs || [];
    const { user } = useSelector(store => store.auth);
    const loading = !allAppliedJobs;

    // Filter applications by status
    const pendingApplications = applications.filter(app => app.status === 'pending');
    const acceptedApplications = applications.filter(app => app.status === 'accepted');
    const rejectedApplications = applications.filter(app => app.status === 'rejected');
    const interviewApplications = applications.filter(app => app.status === 'interview');

    return (
        <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-[#FFD700]">📋</span> My Applications
                </h1>

                <Tabs defaultValue="all">
                    <TabsList className="mb-6 bg-[#0a0a0a] border border-white/10 p-1 rounded-lg">
                        <TabsTrigger value="all" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-md text-gray-400 font-medium">All ({applications.length})</TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-md text-gray-400 font-medium">Pending ({pendingApplications.length})</TabsTrigger>
                        <TabsTrigger value="accepted" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-md text-gray-400 font-medium">Accepted ({acceptedApplications.length})</TabsTrigger>
                        <TabsTrigger value="rejected" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-md text-gray-400 font-medium">Rejected ({rejectedApplications.length})</TabsTrigger>
                        <TabsTrigger value="interview" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-md text-gray-400 font-medium">Interviews ({interviewApplications.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        {loading ? (
                            <div className="text-center py-10">Loading applications...</div>
                        ) : applications.length === 0 ? (
                            <div className="text-center py-10">You haven't applied to any jobs yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {applications.map(application => (
                                    application.status === 'interview' ? (
                                        <InterviewCard key={application._id} application={application} />
                                    ) : (
                                        <div key={application._id} className="border rounded-lg p-4">
                                            {/* Regular application card content */}
                                            <h3 className="font-bold">{application.job?.title}</h3>
                                            <p className="text-sm text-gray-600">{application.job?.company?.name}</p>
                                            <div className="mt-2">
                                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="interview">
                        {loading ? (
                            <div className="text-center py-10">Loading interviews...</div>
                        ) : interviewApplications.length === 0 ? (
                            <div className="text-center py-10">You don't have any scheduled interviews.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {interviewApplications.map(application => (
                                    <InterviewCard key={application._id} application={application} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Similar content for other tabs */}
                    <TabsContent value="pending">
                        {/* Pending applications */}
                    </TabsContent>

                    <TabsContent value="accepted">
                        {/* Accepted applications */}
                    </TabsContent>

                    <TabsContent value="rejected">
                        {/* Rejected applications */}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AppliedJobs;