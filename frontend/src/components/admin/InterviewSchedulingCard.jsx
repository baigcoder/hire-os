import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Briefcase, ArrowRight } from 'lucide-react';

const InterviewSchedulingCard = ({ interviews = [] }) => {
  const navigate = useNavigate();
  
  // Sort interviews by date (soonest first)
  const sortedInterviews = [...interviews]
    .filter(interview => interview.interviewDetails && interview.interviewDetails.date)
    .sort((a, b) => new Date(a.interviewDetails.date) - new Date(b.interviewDetails.date))
    .slice(0, 5); // Show only the next 5 interviews
  
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Interview Schedule</CardTitle>
        <CardDescription>Upcoming interviews with candidates</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedInterviews.length > 0 ? (
          <div className="space-y-4">
            {sortedInterviews.map((interview, index) => (
              <div key={index} className="flex items-start gap-4 border-b pb-4 last:border-0">
                <div className="bg-blue-50 rounded-lg p-3 text-center min-w-[70px]">
                  <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-sm font-medium">{formatDate(interview.interviewDetails.date)}</p>
                  <p className="text-xs text-gray-500">{formatTime(interview.interviewDetails.date)}</p>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    {interview.user?.fullname || 'Candidate'}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    {interview.job?.title || 'Position'}
                  </p>
                  {interview.interviewDetails.details && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                      {interview.interviewDetails.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming interviews scheduled</p>
            <p className="text-sm text-gray-400 mt-1">Schedule interviews with qualified candidates</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2" 
          onClick={() => navigate('/admin/jobs')}
        >
          Manage All Interviews <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InterviewSchedulingCard;