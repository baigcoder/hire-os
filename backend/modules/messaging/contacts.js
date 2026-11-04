/**
 * Who may message or call whom. One rule, used by messages, calls and the
 * contact list:
 *
 *   - company staff (owner, recruiters) ↔ each other, within one company
 *   - a candidate ↔ that company's staff, once an interview is scheduled
 *     for the candidate there (any status but cancelled)
 *
 * Nobody else: candidates can't reach other candidates or companies they
 * have no interview with.
 */
import { User } from "../../models/user.model.js";
import { Interview } from "../../models/interview.model.js";

export const STAFF_ROLES = ["recruiter", "company_admin"];
const isStaff = (u) => STAFF_ROLES.includes(u?.role) && Boolean(u.companyId);
const LIVE = { status: { $ne: "cancelled" } };

const loadUser = (id) => User.findById(id).select("fullname email role companyId profile.profilePhoto").lean();

const hasInterview = (studentId, companyId) => Interview.exists({ studentId, companyId, ...LIVE });

/** True when `aId` may message or call `bId`. */
export const canContact = async (aId, bId) => {
  if (!aId || !bId || String(aId) === String(bId)) return false;
  const [a, b] = await Promise.all([loadUser(aId), loadUser(bId)]);
  if (!a || !b) return false;
  if (isStaff(a) && isStaff(b)) return String(a.companyId) === String(b.companyId);
  const student = a.role === "student" ? a : b.role === "student" ? b : null;
  const staff = student === a ? b : a;
  if (!student || !isStaff(staff)) return false;
  return Boolean(await hasInterview(student._id, staff.companyId));
};

const card = (u, extra = {}) => ({
  _id: String(u._id),
  fullname: u.fullname,
  email: u.email,
  role: u.role,
  photo: u.profile?.profilePhoto || null,
  ...extra,
});

/**
 * The people `userId` may contact, for the Messages screen. A candidate sees
 * the recruiter on each interview plus the owner; staff see their team and
 * the candidates interviewing with the company.
 */
export const listContacts = async (userId) => {
  const me = await loadUser(userId);
  if (!me) return [];

  if (me.role === "student") {
    const interviews = await Interview.find({ studentId: me._id, ...LIVE })
      .select("recruiterId companyId jobId scheduledAt")
      .populate("jobId", "title")
      .populate("companyId", "name")
      .sort({ scheduledAt: -1 })
      .lean();
    const companyIds = [...new Set(interviews.map((i) => String(i.companyId?._id ?? i.companyId)).filter(Boolean))];
    const recruiterIds = interviews.map((i) => i.recruiterId).filter(Boolean);
    const staff = await User.find({
      $or: [{ _id: { $in: recruiterIds } }, { role: "company_admin", companyId: { $in: companyIds } }],
      role: { $in: STAFF_ROLES },
    })
      .select("fullname email role companyId profile.profilePhoto")
      .lean();
    return staff
      .filter((s) => companyIds.includes(String(s.companyId)))
      .map((s) => {
        const iv = interviews.find((i) => String(i.recruiterId) === String(s._id)) ??
          interviews.find((i) => String(i.companyId?._id ?? i.companyId) === String(s.companyId));
        return card(s, { companyName: iv?.companyId?.name, jobTitle: iv?.jobId?.title, interviewAt: iv?.scheduledAt });
      });
  }

  if (!isStaff(me)) return [];
  const [team, interviews] = await Promise.all([
    User.find({ _id: { $ne: me._id }, companyId: me.companyId, role: { $in: STAFF_ROLES } })
      .select("fullname email role companyId profile.profilePhoto")
      .lean(),
    Interview.find({ companyId: me.companyId, ...LIVE })
      .select("studentId jobId scheduledAt")
      .populate("studentId", "fullname email role profile.profilePhoto")
      .populate("jobId", "title")
      .sort({ scheduledAt: -1 })
      .lean(),
  ]);
  const seen = new Set();
  const candidates = interviews
    .filter((i) => i.studentId && !seen.has(String(i.studentId._id)) && seen.add(String(i.studentId._id)))
    .map((i) => card(i.studentId, { jobTitle: i.jobId?.title, interviewAt: i.scheduledAt }));
  return [...team.map((t) => card(t, { team: true })), ...candidates];
};
