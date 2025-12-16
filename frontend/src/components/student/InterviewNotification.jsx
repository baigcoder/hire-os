import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { APPLICATION_API_END_POINT } from '@/utils/constant';
import { toast } from 'sonner';

const InterviewNotification = ({ application }) => {
    const navigate = useNavigate();
    
    // Function to check if the interview is scheduled for today
    const isInterviewToday = () => {
        if (!application.interviewDetails?.date) return false;
        
        const today = new Date();
        const interviewDate = new Date(application.interviewDetails.date);
        
        return (
            today.getDate() === interviewDate.getDate() &&
            today.getMonth() === interviewDate.getMonth() &&
            today.getFullYear() === interviewDate.getFullYear()
        );
    };

    // Function to check if the current time is within the interview time window
    const isInterviewTime = () => {
        if (!application.interviewDetails?.date) return false;
        
        const now = new Date();
        const interviewDate = new Date(application.interviewDetails.date);
        
        // Allow access 15 minutes before and up to 1 hour after scheduled time
        const fifteenMinutesBefore = new Date(interviewDate);
        fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() - 15);
        
        const oneHourAfter = new Date(interviewDate);
        oneHourAfter.setHours(oneHourAfter.getHours() + 1);
        
        return now >= fifteenMinutesBefore && now <= oneHourAfter;
    };
    
    // Format date for display
    const formatDate = (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    
    // Format time for display
    const formatTime = (dateString) => {
        const options = { hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleTimeString(undefined, options);
    };
    
    // Navigate to interview details and mark as viewed
    const handleViewInterview = async () => {
        try {
            // Mark notification as viewed
            await axios.post(
                `${APPLICATION_API_END_POINT}/interview/${application._id}/view`,
                {},
                { withCredentials: true }
            );
            
            // Navigate to applied jobs page
            navigate(`/applied-jobs`);
        } catch (error) {
            console.error('Failed to mark notification as viewed:', error);
            // Still navigate even if marking as viewed fails
            navigate(`/applied-jobs`);
        }
    };
    
    // Only show notification for scheduled interviews that haven't been completed
    if (application.status !== 'interview' || application.interviewDetails?.completed) {
        return null;
    }
    
    return (
        <Card className={`w-full mb-4 border-l-4 ${!application.interviewDetails?.viewed ? 'border-l-blue-500' : 'border-l-gray-300'} shadow-md ${!application.interviewDetails?.viewed ? 'bg-blue-50' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Interview Scheduled</CardTitle>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {isInterviewToday() ? "Today" : "Upcoming"}
                    </Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                    <Bell className="h-4 w-4" />
                    {application.job?.title} at {application.job?.company?.name}
                </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
                <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{formatDate(application.interviewDetails?.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{formatTime(application.interviewDetails?.date)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-2">
                <Button 
                    className="w-full" 
                    onClick={handleViewInterview}
                    disabled={!isInterviewToday() && !isInterviewTime()}
                    variant={isInterviewTime() ? "default" : "outline"}
                >
                    {isInterviewTime() ? "Join Interview Now" : "View Interview Details"}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default InterviewNotification;