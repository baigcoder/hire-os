// ... existing code ...

// Add this function to handle interview scheduling
const handleScheduleInterview = (applicantId) => {
  // Open a dialog for scheduling interview
  setSelectedApplicantId(applicantId);
  setShowInterviewDialog(true);
};

// In your render method, update the dropdown menu
const ApplicantList = () => {
  return (
  <div>
    {/* ... existing table structure ... */}
    <div className="dropdown-menu">
      <button onClick={() => handleAccept(applicant._id)}>Accepted</button>
      <button onClick={() => handleReject(applicant._id)}>Rejected</button>
      <button onClick={() => handleScheduleInterview(applicant._id)}>Schedule Interview</button>
    </div>
    {/* ... existing code ... */}
    
    {/* Add Interview Dialog */}
    {showInterviewDialog && (
      <InterviewScheduleDialog 
        applicantId={selectedApplicantId}
        onClose={() => setShowInterviewDialog(false)}
        onSchedule={(date, details) => {
          // Call your API to schedule interview
          updateApplicationStatus(selectedApplicantId, 'interview', date, details);
          setShowInterviewDialog(false);
        }}
      />
    )}
  </div>
);

// ... existing code ...