const { slugify } = require('../utils/slugify');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { firstImage, toPlainText } = require('../services/feeds');
const { signAccessToken, verifyAccessToken, verifyRefreshToken, signRefreshToken } = require('../utils/jwt');

describe('slugify', () => {
  it('makes a URL-safe slug', () => {
    expect(slugify('Breaking: KK Factor Launches!')).toBe('breaking-kk-factor-launches');
  });

  it('folds accents rather than dropping the word', () => {
    expect(slugify('Café Ellás')).toBe('cafe-ellas');
  });

  it('collapses runs of separators and trims them', () => {
    expect(slugify('  --- a   b __ c --- ')).toBe('a-b-c');
  });

  it('survives a title made entirely of punctuation', () => {
    expect(slugify('!!! ??? ***')).toBe('');
  });
});

describe('getPagination', () => {
  it('defaults sensibly', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 12, offset: 0 });
  });

  it('computes the offset', () => {
    expect(getPagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  /** ?limit=100000 must not become a full collection scan. */
  it('clamps the limit to the maximum', () => {
    expect(getPagination({ limit: '5000' }).limit).toBe(50);
    expect(getPagination({ limit: '5000' }, { maxLimit: 200 }).limit).toBe(200);
  });

  it('refuses a page before the first', () => {
    expect(getPagination({ page: '-4' }).page).toBe(1);
    expect(getPagination({ page: 'nonsense' }).page).toBe(1);
  });
});

describe('paginatedResponse', () => {
  it('reports the last page correctly', () => {
    const { pagination } = paginatedResponse({ count: 25, rows: [] }, 3, 10);
    expect(pagination).toMatchObject({ page: 3, totalPages: 3, hasNext: false, hasPrev: true });
  });

  it('reports an empty collection as one page', () => {
    const { pagination } = paginatedResponse({ count: 0, rows: [] }, 1, 12);
    expect(pagination).toMatchObject({ totalPages: 1, hasNext: false, hasPrev: false });
  });
});

describe('feed helpers', () => {
  it('finds the first image in an article body', () => {
    const html = '<p>Words</p><img src="https://cdn.test/a.jpg" alt=""><img src="https://cdn.test/b.jpg">';
    expect(firstImage(html)).toBe('https://cdn.test/a.jpg');
  });

  it('returns null when the body has no image', () => {
    expect(firstImage('<p>Words only</p>')).toBeNull();
    expect(firstImage(null)).toBeNull();
  });

  it('flattens html to readable text', () => {
    expect(toPlainText('<p>One</p><p>Two &amp; three</p>')).toBe('One Two & three');
  });
});

describe('tokens', () => {
  const user = { id: '507f1f77bcf86cd799439011', email: 'a@b.test', role: 'admin' };

  it('round-trips an access token', () => {
    const payload = verifyAccessToken(signAccessToken(user));
    expect(payload).toMatchObject({ sub: user.id, role: 'admin', type: 'access' });
  });

  it('carries the token version on a refresh token', () => {
    expect(verifyRefreshToken(signRefreshToken(user, 4))).toMatchObject({ ver: 4, type: 'refresh' });
  });

  /**
   * The two secrets are different, and each verifier checks the `type` claim,
   * so a refresh token can never be presented as an access token.
   */
  it('refuses a refresh token where an access token is expected', () => {
    expect(() => verifyAccessToken(signRefreshToken(user, 0))).toThrow();
  });

  it('refuses a tampered token', () => {
    const token = `${signAccessToken(user)}x`;
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
