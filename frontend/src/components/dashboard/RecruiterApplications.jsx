import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const RecruiterApplications = ({ jobId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get(`/api/applications/job/${jobId}`, {
          headers: {
            "x-auth-token": token,
          },
        });
        setApplications(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching applications:", err);
        setError("Failed to load applications");
        setLoading(false);
      }
    };

    fetchApplications();
  }, [jobId, token]);

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await axios.put(
        `/api/applications/status/${applicationId}`,
        { status: newStatus },
        {
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        },
      );

      // Update local state
      setApplications(
        applications.map((app) =>
          app._id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );
    } catch (err) {
      console.error("Error updating application status:", err);
      setError("Failed to update application status");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No applications received yet.
      </div>
    );
  }

  return (
    <div className="applications-container">
      <h3 className="text-xl font-semibold mb-4">
        Applications ({applications.length})
      </h3>

      <div className="grid gap-6">
        {applications.map((application) => (
          <div
            key={application._id}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold">
                  {application.user.name}
                </h4>
                <p className="text-gray-600">{application.user.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Applied on{" "}
                  {new Date(application.appliedDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    application.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : application.status === "reviewing"
                        ? "bg-blue-100 text-blue-800"
                        : application.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                  }`}
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </span>

                {application.resumeAnalysis && (
                  <div className="mt-2 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-700 font-bold">
                        {application.resumeAnalysis.analysisScore}%
                      </span>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      Match Score
                    </span>
                  </div>
                )}
              </div>
            </div>

            {application.resumeAnalysis && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <h5 className="font-medium text-indigo-800 mb-2">
                  Resume Analysis
                </h5>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Overall Fit</p>
                    <p
                      className={`font-semibold ${
                        application.resumeAnalysis.overallFit === "Excellent"
                          ? "text-green-600"
                          : application.resumeAnalysis.overallFit === "Good"
                            ? "text-blue-600"
                            : application.resumeAnalysis.overallFit === "Fair"
                              ? "text-yellow-600"
                              : "text-red-600"
                      }`}
                    >
                      {application.resumeAnalysis.overallFit}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Experience Match</p>
                    <p className="font-semibold text-indigo-700">
                      {application.resumeAnalysis.experienceMatch}%
                    </p>
                  </div>
                </div>

                {application.resumeAnalysis.keySkillsMatch && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Matching Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {application.resumeAnalysis.keySkillsMatch.map(
                        (skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {application.coverLetter && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-700 mb-1">Cover Letter</h5>
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md">
                  {application.coverLetter}
                </p>
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-2">
              <select
                value={application.status}
                onChange={(e) =>
                  handleStatusChange(application._id, e.target.value)
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="accepted">Accept</option>
                <option value="rejected">Reject</option>
              </select>

              <a
                href={`/api/resume/download/${application.resumeAnalysis?.resumePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200 transition-colors"
              >
                View Resume
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecruiterApplications;
