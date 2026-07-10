import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../app.js';
import { db } from '../config/database.js';
import { seedTestData, type TestIds } from './helpers/seed.js';
import { makeToken } from './helpers/auth.js';

let ids: TestIds;
let previewUserId: string;
let previewCourseId: string;
const PREVIEW_CODE = 'PREVIEW-101';

function previewToken(): string {
  return makeToken({ userId: previewUserId, email: 'preview@test.com', role: 'student' });
}

beforeEach(() => {
  ids = seedTestData();

  previewUserId = uuidv4();
  previewCourseId = uuidv4();

  db.exec(`
    INSERT INTO users (id, name, email, password_hash, role, access_level)
    VALUES ('${previewUserId}', 'Preview Visitor', 'preview@test.com', '', 'student', 'preview');

    INSERT INTO courses (id, title, description, course_code, sections, is_public_preview)
    VALUES ('${previewCourseId}', 'Public Preview Course', 'Open to visitors', '${PREVIEW_CODE}', '[]', 1);
  `);
});

describe('Read-only preview access', () => {
  it('GET /courses returns only public-preview courses for preview users', async () => {
    const res = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${previewToken()}`);

    expect(res.status).toBe(200);
    const codes = res.body.data.courses.map((c: { courseCode: string }) => c.courseCode);
    expect(codes).toEqual([PREVIEW_CODE]);
    // Not enrolled anywhere, so the regular seeded courses must not leak through.
    expect(codes).not.toContain(ids.courseCode);
  });

  it('GET /courses/:id allows a preview course but forbids a non-preview course', async () => {
    const ok = await request(app)
      .get(`/api/v1/courses/${previewCourseId}`)
      .set('Authorization', `Bearer ${previewToken()}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.isPublicPreview).toBe(true);

    const denied = await request(app)
      .get(`/api/v1/courses/${ids.courseId}`)
      .set('Authorization', `Bearer ${previewToken()}`);
    expect(denied.status).toBe(403);
  });

  it('blocks preview users from write endpoints with 403 FORBIDDEN', async () => {
    const forum = await request(app)
      .post('/api/v1/forum/topics')
      .set('Authorization', `Bearer ${previewToken()}`)
      .send({ title: 'Hello', body: 'Can I post?' });
    expect(forum.status).toBe(403);
    expect(forum.body.error.code).toBe('FORBIDDEN');

    const message = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${previewToken()}`)
      .send({ recipientId: ids.adminId });
    expect(message.status).toBe(403);
  });

  it('still lets full-access students reach their enrolled courses', async () => {
    const token = makeToken({
      userId: ids.studentUserId,
      email: 'student@test.com',
      role: 'student',
      studentId: ids.studentId,
    });
    const res = await request(app).get('/api/v1/courses').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const codes = res.body.data.courses.map((c: { courseCode: string }) => c.courseCode);
    expect(codes).toContain(ids.courseCode);
    expect(codes).not.toContain(PREVIEW_CODE);
  });
});
