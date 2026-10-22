/** Client for /api/v1/integrity (see backend routes/integrity.route.js). */
import api from "@/utils/api";

const base = (interviewId) => `/integrity/${interviewId}`;

export const integrityApi = {
  get: (id) => api.get(base(id)).then((r) => r.data),
  consent: (id, accept) => api.post(`${base(id)}/consent`, { accept }).then((r) => r.data),
  sendBatch: (id, batch) => api.post(`${base(id)}/events`, batch, { timeout: 10_000 }).then((r) => r.data),
  sendObservations: (id, batch) =>
    api.post(`${base(id)}/observations`, batch, { timeout: 10_000 }).then((r) => r.data),
  uploadEvidence: (id, body) => api.post(`${base(id)}/evidence`, body, { timeout: 15_000 }).then((r) => r.data),
  evidenceUrl: (id, evidenceId) =>
    api.get(`${base(id)}/evidence/${evidenceId}`, { params: { format: "json" } }).then((r) => r.data.url),
  annotate: (id, body) => api.post(`${base(id)}/annotations`, body).then((r) => r.data),
  getReport: (id) => api.get(`${base(id)}/report`).then((r) => r.data),
  requestReport: (id) => api.post(`${base(id)}/report`).then((r) => r.data),
  dispute: (id, text) => api.post(`${base(id)}/disputes`, { text }).then((r) => r.data),
  endCall: (id) => api.post(`/interview/${id}/video/end`).then((r) => r.data),
};

/**
 * Server-sent events with the Authorization header (EventSource can't send
 * one). Calls onEvent(name, data); resolves when the stream ends.
 */
export const streamIntegrity = async (interviewId, { onEvent, signal }) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${api.defaults.baseURL}${base(interviewId)}/live`, {
    headers: { Accept: "text/event-stream", ...(token && { Authorization: `Bearer ${token}` }) },
    credentials: "include",
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Live stream unavailable (${res.status})`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let split;
    while ((split = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      let event = "message";
      const data = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data.push(line.slice(6));
      }
      if (data.length) {
        try {
          onEvent(event, JSON.parse(data.join("\n")));
        } catch {
          // ignore malformed frames
        }
      }
    }
  }
};

export const errorCode = (error) => error?.response?.data?.code;
