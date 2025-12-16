import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const InterviewDialog = ({ application, onClose, onSchedule }) => {
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewDetails, setInterviewDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = () => {
    if (!interviewDate) {
      return;
    }
    
    setLoading(true);
    onSchedule(application._id, interviewDate, interviewDetails);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Set a date and time for the interview with {application?.applicant?.fullname}.
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule}
            disabled={loading || !interviewDate}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewDialog;