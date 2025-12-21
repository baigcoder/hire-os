// ... existing code ...

export const updateApplicationStatus = async (
  applicationId,
  status,
  interviewDate = null,
  interviewDetails = null,
) => {
  try {
    let payload = { status };

    // If scheduling interview, include date and details
    if (status === "interview" && interviewDate) {
      payload.interviewDate = interviewDate;
      payload.interviewDetails = interviewDetails || "";
    }

    const res = await import("axios").then((module) =>
      module.default.post(
        `${import.meta.env.REACT_APP_API_URL}/applications/status/${applicationId}/update`,
        payload,
        { withCredentials: true },
      ),
    );

    return res.data;
  } catch (error) {
    console.error("Error updating application status:", error);
    throw error;
  }
};

// ... existing code ...
