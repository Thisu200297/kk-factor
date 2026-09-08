/**
 * The site rejecting its own login form.
 *
 * A browser attaches an Origin header to every POST, PUT, PATCH and DELETE,
 * including the ones a page sends back to the server that served it. On a
 * single-origin deployment that means `Origin: https://the-site.example`
 * arriving at the site itself, which an allow-list built only from
 * FRONTEND_URL refuses — sign-in breaks on the deployed site while every
 * local test passes, because curl and node-fetch send no Origin at all.
 *
 * These use OPTIONS so the answer comes from the CORS layer and nothing has
 * to reach a database.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
const app = require('../app');

const SITE = 'the-kk-factor.onrender.com';

const preflight = (origin) =>
  request(app)
    .options('/api/auth/login')
    .set('Host', SITE)
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', origin)
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type');

describe('CORS', () => {
  it('allows a request with no Origin at all (curl, server-to-server)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('allows the configured front end', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it("allows the deployed site's own origin, with no configuration", async () => {
    const res = await preflight(`https://${SITE}`);
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(`https://${SITE}`);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('still refuses a genuinely foreign origin', async () => {
    const res = await preflight('https://not-the-kk-factor.example');
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/not allowed/i);
  });

  it('is not fooled by an origin that merely contains the host', async () => {
    const res = await preflight(`https://${SITE}.evil.example`);
    expect(res.status).toBe(403);
  });
});
