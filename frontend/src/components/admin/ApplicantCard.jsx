import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import { toast } from 'sonner';

const ApplicantCard = ({ 
    application = {}, 
    onStatusUpdate = () => {} // Default empty function if not provided
}) => {
    const [loading, setLoading] = useState(false);
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewDetails, setInterviewDetails] = useState('');
    const [open, setOpen] = useState(false);

    const updateApplicationStatus = async (status) => {
        try {
            setLoading(true);
            
            let payload = { status };
            
            // If scheduling interview, include date and details
            if (status === 'interview') {
                if (!interviewDate) {
                    toast.error('Please select an interview date');
                    setLoading(false);
                    return;
                }
                
                // Send interview date and details as separate fields
                payload = {
                    status,
                    interviewDate,
                    interviewDetails: interviewDetails || ''
                };
            }
            
            console.log("Sending payload:", payload); // Debug log
            
            const res = await axios.post(
                `${APPLICATION_API_END_POINT}/status/${application._id}/update`,
                payload,
                { withCredentials: true }
            );
            
            if (res.data.success) {
                toast.success(res.data.message);
                if (onStatusUpdate) onStatusUpdate(application._id, status);
                setOpen(false);
            }
        } catch (error) {
            console.error("Error updating application status:", error.response?.data || error);
            toast.error(error.response?.data?.message || 'Failed to update application status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'accepted':
                return <Badge variant="outline" className="bg-green-100 text-green-800">Accepted</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
            case 'interview':
                return <Badge variant="outline" className="bg-blue-100 text-blue-800">Interview Scheduled</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={application.applicant?.profile?.profilePhoto} alt={application.applicant?.fullname} />
                </Avatar>
                <div>
                    <CardTitle>{application.applicant?.fullname}</CardTitle>
                    <CardDescription>{application.applicant?.email}</CardDescription>
                </div>
                <div className="ml-auto">
                    {getStatusBadge(application.status)}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Phone:</span>
                        <span>{application.applicant?.phoneNumber}</span>
                    </div>
                    
                    {application.applicant?.profile?.bio && (
                        <div>
                            <span className="font-semibold">Bio:</span>
                            <p className="text-sm text-gray-600 mt-1">{application.applicant?.profile?.bio}</p>
                        </div>
                    )}
                    
                    {application.applicant?.profile?.skills?.length > 0 && (
                        <div>
                            <span className="font-semibold">Skills:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {application.applicant?.profile?.skills.map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {application.applicant?.profile?.resume && (
                        <div className="mt-2">
                            <a 
                                href={application.applicant?.profile?.resume} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                                View Resume
                            </a>
                        </div>
                    )}
                    
                    {application.status === 'interview' && application.interviewDetails && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <h4 className="font-semibold text-blue-800">Interview Details</h4>
                            <div className="flex items-center gap-2 mt-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span>{new Date(application.interviewDetails.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span>{new Date(application.interviewDetails.date).toLocaleTimeString()}</span>
                            </div>
                            {application.interviewDetails.details && (
                                <p className="mt-2 text-sm">{application.interviewDetails.details}</p>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {application.status === 'pending' && (
                    <>
                        <Button 
                            variant="outline" 
                            className="border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => updateApplicationStatus('rejected')}
                            disabled={loading}
                        >
                            Reject
                        </Button>
                        <Button 
                            variant="outline" 
                            className="border-green-500 text-green-500 hover:bg-green-50"
                            onClick={() => updateApplicationStatus('accepted')}
                            disabled={loading}
                        >
                            Accept
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="border-blue-500 text-blue-500 hover:bg-blue-50"
                                >
                                    Schedule Interview
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Schedule Interview</DialogTitle>
                                    <DialogDescription>
                                        Set a date and time for the interview with {application.applicant?.fullname}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="interview-date">Interview Date & Time</Label>
                                        <Input
                                            id="interview-date"
                                            type="datetime-local"
                                            value={interviewDate}
                                            onChange={(e) => setInterviewDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interview-details">Additional Details</Label>
                                        <Textarea
                                            id="interview-details"
                                            placeholder="Enter interview details, location, or special instructions..."
                                            value={interviewDetails}
                                            onChange={(e) => setInterviewDetails(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={() => updateApplicationStatus('interview')}
                                        disabled={loading}
                                    >
                                        Schedule
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </CardFooter>
        </Card>
    );
};

export default ApplicantCard;