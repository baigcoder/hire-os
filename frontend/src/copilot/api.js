/** Client for /api/v1/copilot (see backend routes/copilot.route.js). */
import api from "@/utils/api";

const base = (id) => `/copilot/${id}`;

export const copilotApi = {
  get: (id) => api.get(base(id)).then((r) => r.data),
  uploadAudio: (id, blob, { seq, startedAt }) =>
    api
      .post(`${base(id)}/audio`, blob, {
        headers: {
          "Content-Type": blob.type || "audio/webm",
          "x-chunk-seq": String(seq),
          "x-chunk-started-at": String(startedAt),
        },
        timeout: 30_000,
      })
      .then((r) => r.data),
  regenerate: (id) => api.post(`${base(id)}/scorecard`, null, { params: { force: 1 } }).then((r) => r.data),
  refresh: (id) => api.post(`${base(id)}/refresh`).then((r) => r.data),
  draft: (id) => api.post(`${base(id)}/draft`).then((r) => r.data),
  rate: (id, competencyId, body) => api.put(`${base(id)}/competencies/${competencyId}/rating`, body).then((r) => r.data),
  overall: (id, body) => api.put(`${base(id)}/overall`, body).then((r) => r.data),
};
