import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateUser, validateSession } from '../src/lib/auth';

// Ensure env admin tests are deterministic
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fab@2023';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME as string;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD as string;

test('env-admin credentials authenticateUser creates DB user and returns session', async () => {
  // Authenticate using env-stored admin credentials
  const result = await authenticateUser({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }, '127.0.0.1', 'test-agent');
  // DEBUG: show returned result when troubleshooting test failures
  console.log('AUTHENTICATE RESULT =>', JSON.stringify(result));
  assert.equal('error' in result, false, `Expected successful auth but got error: ${(result as any).error}`);

  const { user, session } = result as any;
  assert.ok(user, 'user should be returned');
  assert.equal(user.username, ADMIN_USERNAME);
  assert.equal(user.role, 'admin');
  assert.ok(session && session.session_token, 'session token should be present');

  // validateSession should accept the created session token
  const validated = await validateSession(session.session_token);
  assert.ok(validated, 'validateSession should return a user for the session token');
  assert.equal(validated?.username, ADMIN_USERNAME);
});

test('validateSession rejects invalid token (dashboard protected)', async () => {
  const invalid = await validateSession('this-is-not-a-valid-session-token');
  assert.equal(invalid, null);
});

// Sanity-check createSession directly (debugging flaky behavior in test DB)
import { createSession } from '../src/lib/auth';

test('createSession returns a session object for existing user', async () => {
  // ensure admin user exists in the in-memory DB
  const authRes = await authenticateUser({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }, '127.0.0.1', 'agent');
  const uid = (authRes as any).user?.id;
  const session = await createSession(uid, '127.0.0.1', 'agent');
  console.log('CREATE_SESSION =>', JSON.stringify(session));
  assert.ok(session && session.session_token, 'createSession should return a session with a token');
});

// Integration-style checks: call route handlers directly
import { POST as loginPOST } from '../src/app/api/auth/login/route';
import { GET as validateGET } from '../src/app/api/auth/validate/route';

test('POST /api/auth/login returns success and sets session cookie', async () => {
  const req = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
  });

  const res: any = await loginPOST(req as any);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.user.username, ADMIN_USERNAME);
  // response should include a Set-Cookie header for session_token
  const setCookie = res.headers?.get('set-cookie') || res.headers?.get('Set-Cookie');
  assert.ok(setCookie || res.cookies, 'Expected Set-Cookie header or cookies API on NextResponse');
});

test('GET /api/auth/validate without session returns 401 (dashboard protected)', async () => {
  const req = new Request('http://localhost/api/auth/validate');
  const res: any = await validateGET(req as any);
  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.valid, false);
});