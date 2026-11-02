/**
 * Live chat between signed-in clients and support staff.
 */
import { UserRole } from '../../src/generated/prisma/client.js';
import { CLIENT_MESSAGES_PER_MINUTE } from '../../src/support/support.service.js';
import { bootstrap, registerVerified, type Harness } from './support/harness.js';

describe('Live chat', () => {
  let h: Harness;
  let alice: Awaited<ReturnType<typeof registerVerified>>;
  let bob: Awaited<ReturnType<typeof registerVerified>>;
  let staff: Awaited<ReturnType<typeof registerVerified>>;
  let conversationId: string;

  beforeAll(async () => {
    h = await bootstrap();
    alice = await registerVerified(h, 'chat-alice');
    bob = await registerVerified(h, 'chat-bob');
    staff = await registerVerified(h, 'chat-staff');
    await h.prisma.user.update({ where: { id: staff.id }, data: { role: UserRole.ADMIN } });
  });
  afterAll(async () => h?.close());

  it('requires sign-in', async () => {
    await h.http().get('/api/support/conversation').expect(401);
    await h.http().post('/api/support/conversation/messages').send({ body: 'hi' }).expect(401);
  });

  it('starts empty, then opens a conversation on the first message', async () => {
    const empty = await h.http().get('/api/support/conversation').set(alice.auth).expect(200);
    expect(empty.body).toEqual({ conversation: null, messages: [], unread: 0 });

    const sent = await h.http().post('/api/support/conversation/messages').set(alice.auth).send({ body: '  Hello, my deposit is pending.  ' }).expect(201);
    expect(sent.body).toMatchObject({ body: 'Hello, my deposit is pending.', fromStaff: false });

    const thread = await h.http().get('/api/support/conversation').set(alice.auth).expect(200);
    expect(thread.body.conversation.status).toBe('open');
    expect(thread.body.messages).toHaveLength(1);
    conversationId = thread.body.conversation.id;
  });

  it('rejects empty and oversized messages', async () => {
    await h.http().post('/api/support/conversation/messages').set(alice.auth).send({ body: '   ' }).expect(400);
    await h.http().post('/api/support/conversation/messages').set(alice.auth).send({ body: 'x'.repeat(2001) }).expect(400);
    await h.http().post('/api/support/conversation/messages').set(alice.auth).send({}).expect(400);
  });

  it('keeps each client’s thread private', async () => {
    const other = await h.http().get('/api/support/conversation').set(bob.auth).expect(200);
    expect(other.body.conversation).toBeNull();
  });

  it('only admins can use the support inbox', async () => {
    await h.http().get('/api/admin/support/conversations').set(alice.auth).expect(403);
    await h.http().get(`/api/admin/support/conversations/${conversationId}`).set(bob.auth).expect(403);
  });

  it('shows the conversation to staff as unread, with the client and last message', async () => {
    const unread = await h.http().get('/api/admin/support/unread').set(staff.auth).expect(200);
    expect(unread.body.conversations).toBeGreaterThanOrEqual(1);
    const list = await h.http().get('/api/admin/support/conversations').set(staff.auth).expect(200);
    const row = list.body.find((c: { id: string }) => c.id === conversationId);
    expect(row).toMatchObject({ client: { email: alice.email }, unread: 1, lastMessage: { body: 'Hello, my deposit is pending.' } });
  });

  it('delivers a staff reply to the client as unread, and clears it when read', async () => {
    const seen = await h.http().get('/api/support/conversation').set(alice.auth).expect(200);
    const before = seen.body.messages.at(-1).createdAt as string; // how the widget polls
    await h.http().post(`/api/admin/support/conversations/${conversationId}/messages`).set(staff.auth).send({ body: 'Thanks, checking now.' }).expect(201);

    const thread = await h.http().get('/api/support/conversation').set(alice.auth).expect(200);
    expect(thread.body.unread).toBe(1);
    expect(thread.body.messages.at(-1)).toMatchObject({ body: 'Thanks, checking now.', fromStaff: true });

    const poll = await h.http().get(`/api/support/conversation?after=${encodeURIComponent(before)}`).set(alice.auth).expect(200);
    expect(poll.body.messages.map((m: { body: string }) => m.body)).toEqual(['Thanks, checking now.']);

    await h.http().post('/api/support/conversation/read').set(alice.auth).expect(204);
    expect((await h.http().get('/api/support/conversation').set(alice.auth)).body.unread).toBe(0);

    // Replying marks the thread read for staff.
    const list = await h.http().get('/api/admin/support/conversations').set(staff.auth).expect(200);
    expect(list.body.find((c: { id: string }) => c.id === conversationId).unread).toBe(0);
  });

  it('lets staff close and reopen, with an audit entry; a new client message reopens it', async () => {
    await h.http().patch(`/api/admin/support/conversations/${conversationId}`).set(staff.auth).send({ status: 'closed' }).expect(200);
    const closed = await h.http().get('/api/admin/support/conversations?status=closed').set(staff.auth).expect(200);
    expect(closed.body.map((c: { id: string }) => c.id)).toContain(conversationId);
    expect(await h.prisma.adminAuditLog.count({ where: { action: 'support.close', targetId: conversationId } })).toBe(1);

    await h.http().post('/api/support/conversation/messages').set(alice.auth).send({ body: 'One more question' }).expect(201);
    const t = await h.http().get(`/api/admin/support/conversations/${conversationId}`).set(staff.auth).expect(200);
    expect(t.body.conversation.status).toBe('open');
    expect(t.body.messages).toHaveLength(3);
  });

  it('returns 404 for unknown conversations and 400 for malformed ids', async () => {
    await h.http().get('/api/admin/support/conversations/00000000-0000-4000-8000-000000000000').set(staff.auth).expect(404);
    await h.http().get('/api/admin/support/conversations/not-a-uuid').set(staff.auth).expect(400);
  });

  it(`limits clients to ${CLIENT_MESSAGES_PER_MINUTE} messages a minute`, async () => {
    for (let i = 0; i < CLIENT_MESSAGES_PER_MINUTE; i++) {
      await h.http().post('/api/support/conversation/messages').set(bob.auth).send({ body: `msg ${i}` }).expect(201);
    }
    await h.http().post('/api/support/conversation/messages').set(bob.auth).send({ body: 'one too many' }).expect(429);
  });
});
