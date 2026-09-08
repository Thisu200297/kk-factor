const { sanitizePlain, sanitizeRichText, decodeTextEntities } = require('../utils/sanitize');

describe('sanitizePlain', () => {
  it('strips markup from a title', () => {
    expect(sanitizePlain('<b>Breaking</b> news')).toBe('Breaking news');
  });

  /**
   * The bug this exists for: a headline arriving from a feed as
   * "Greek Community &amp; What&#8217;s Ahead" was stored with the entities
   * intact, and React escaped them again on the way out — so the reader saw
   * the literal "&amp;" on the page.
   */
  it('decodes typographic entities so they read as characters', () => {
    expect(sanitizePlain('Greek Community &amp; What&#8217;s Ahead')).toBe(
      'Greek Community & What’s Ahead'
    );
    expect(sanitizePlain('O&#39;Brien')).toBe("O'Brien");
    expect(sanitizePlain('Open &ndash; today')).toBe('Open – today');
  });

  /**
   * And the line it must not cross. Decoding these would turn a neutralised
   * tag back into something that is only safe as long as every consumer
   * renders it as text — a promise this helper cannot make for code that has
   * not been written yet.
   */
  it('leaves angle brackets encoded', () => {
    expect(sanitizePlain('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(sanitizePlain('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('passes non-strings straight through', () => {
    expect(sanitizePlain(undefined)).toBeUndefined();
    expect(sanitizePlain(7)).toBe(7);
  });

  it('trims', () => {
    expect(sanitizePlain('   spaced   ')).toBe('spaced');
  });
});

describe('sanitizeRichText', () => {
  it('keeps the formatting an editor is allowed to use', () => {
    const html = '<h2>Heading</h2><p>Body with <strong>bold</strong> and <em>italics</em>.</p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('removes scripts, iframes and event handlers', () => {
    const dirty =
      '<p onclick="steal()">Hello</p><script>bad()</script><iframe src="https://evil.test"></iframe>';
    const clean = sanitizeRichText(dirty);

    expect(clean).toContain('Hello');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('<iframe');
  });

  it('adds rel="noopener noreferrer" to links', () => {
    expect(sanitizeRichText('<a href="https://example.test">x</a>')).toContain(
      'rel="noopener noreferrer"'
    );
  });
});

describe('decodeTextEntities', () => {
  it('is idempotent on text that has none', () => {
    expect(decodeTextEntities('plain text')).toBe('plain text');
  });
});
