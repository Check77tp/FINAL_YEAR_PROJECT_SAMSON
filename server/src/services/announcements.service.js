// Business logic layer for administrator announcements. Framework-agnostic —
// no req/res objects here.
//
// An announcement is a notice from an administrator ("Water off in Block C,
// 10:00-12:00"), aimed at ONE hostel or at ALL hostels. It is stored, shown as
// a banner on each targeted student's dashboard, and pushed to their devices.
import * as announcementsRepository from '../repositories/announcements.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { notifyUsers } from './push.service.js';
import { httpError } from '../utils/httpError.js';

const TITLE_MAX = 80;
const MESSAGE_MAX = 500;
const HOSTEL_MAX = 60;

export function mapAnnouncement(row) {
  return {
    id: row.announcement_id,
    title: row.title,
    message: row.message,
    hostel: row.hostel, // null = all hostels
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    createdBy: row.author?.name ?? null,
  };
}

const isActive = (row, now) => !row.expires_at || new Date(row.expires_at) > now;

// Pure: the announcements a student should see - active ones for their hostel
// plus those sent to all hostels.
export function selectForStudent(rows, studentHostel, now = new Date()) {
  return rows.filter(
    (row) => isActive(row, now) && (row.hostel === null || (studentHostel && row.hostel === studentHostel))
  );
}

// Who receives the push: students who chose this hostel in Settings, plus
// students who never did but whose latest request was in it.
export async function resolveRecipients(hostel) {
  if (!hostel) return usersRepository.findAllStudentIds();

  const chosen = await usersRepository.findStudentIdsByHostel(hostel);
  const latestByStudent = await requestsRepository.findLatestHostelPerStudent();
  const learned = [...latestByStudent.entries()].filter(([, h]) => h === hostel).map(([id]) => id);
  return [...new Set([...chosen, ...learned])];
}

// Administrator action.
export async function createAnnouncement({ adminId, title, message, hostel, expiresAt }) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const cleanHostel = typeof hostel === 'string' && hostel.trim() ? hostel.trim() : null;

  if (cleanTitle.length < 3 || cleanTitle.length > TITLE_MAX) {
    throw httpError(`Title must be 3-${TITLE_MAX} characters`, 400);
  }
  if (cleanMessage.length < 5 || cleanMessage.length > MESSAGE_MAX) {
    throw httpError(`Message must be 5-${MESSAGE_MAX} characters`, 400);
  }
  if (cleanHostel && cleanHostel.length > HOSTEL_MAX) {
    throw httpError('Hostel name is too long', 400);
  }

  let expiry = null;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      throw httpError('Expiry must be a date in the future', 400);
    }
  }

  const row = await announcementsRepository.insertAnnouncement({
    title: cleanTitle,
    message: cleanMessage,
    hostel: cleanHostel,
    createdBy: adminId,
    expiresAt: expiry ? expiry.toISOString() : null,
  });

  // Push to the audience. A side effect: never blocks or fails the creation.
  let recipients = 0;
  try {
    const ids = await resolveRecipients(cleanHostel);
    recipients = ids.length;
    void notifyUsers(ids, {
      title: cleanHostel ? `${cleanTitle} (${cleanHostel})` : cleanTitle,
      body: cleanMessage.length > 120 ? `${cleanMessage.slice(0, 117)}...` : cleanMessage,
      url: '/',
      tag: `announcement-${row.announcement_id}`,
    });
  } catch (err) {
    console.error('Announcement push failed:', err.message);
  }

  return { announcement: mapAnnouncement(row), recipients };
}

// Students see what applies to them; administrators see everything (including
// expired ones, so they can manage them); everyone else sees none.
export async function listForUser(user, now = new Date()) {
  if (user.role === 'administrator') {
    const rows = await announcementsRepository.findRecentAnnouncements();
    return rows.map((row) => ({ ...mapAnnouncement(row), active: isActive(row, now) }));
  }
  if (user.role !== 'student') return [];

  const [rows, chosenHostel] = await Promise.all([
    announcementsRepository.findRecentAnnouncements(),
    usersRepository.findHostelByUserId(user.user_id).catch(() => null),
  ]);
  let hostel = chosenHostel;
  if (!hostel) {
    const own = await requestsRepository.findRequestsByStudentId(user.user_id);
    hostel = own.find((r) => r.hostel)?.hostel || null;
  }
  return selectForStudent(rows, hostel, now).map(mapAnnouncement);
}

export async function removeAnnouncement(announcementId) {
  await announcementsRepository.deleteAnnouncement(announcementId);
  return { id: announcementId, deleted: true };
}

// ---- A student's hostel ----------------------------------------------------
export async function getMyHostel(userId) {
  return { hostel: await usersRepository.findHostelByUserId(userId).catch(() => null) };
}

export async function setMyHostel(userId, hostel) {
  const clean = typeof hostel === 'string' ? hostel.trim() : '';
  if (!clean || clean.length > HOSTEL_MAX) {
    throw httpError('A hostel is required', 400);
  }
  await usersRepository.updateHostel(userId, clean);
  return { hostel: clean };
}
