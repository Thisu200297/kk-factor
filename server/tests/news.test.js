/**
 * The news importer's decisions, tested without touching the network.
 *
 * Everything here is a pure function on a shape the WordPress API or the RSS
 * feed hands over, so these run in milliseconds and still cover the parts
 * that have actually gone wrong: which of our headings a story lands under,
 * which rendition of the photo we ask the reader to download, and the
 * syndication trailer WordPress staples to every excerpt.
 */
const wpApi = require('../services/wpApi');
const {
  mapCategory,
  stripSyndicationTrailer,
  stripPublisherChrome,
  makeExcerpt,
  bodyFor,
  fromFeedItem,
  CATEGORY_MAP,
  FALLBACK_CATEGORY,
} = require('../services/newsImporter');

describe('apiRootFrom', () => {
  it('finds the API from a feed URL', () => {
    expect(wpApi.apiRootFrom('https://greekcitytimes.com/feed/')).toBe(
      'https://greekcitytimes.com/wp-json/wp/v2'
    );
  });

  it('finds it from a bare host, assuming https', () => {
    expect(wpApi.apiRootFrom('greekcitytimes.com')).toBe(
      'https://greekcitytimes.com/wp-json/wp/v2'
    );
  });

  it('accepts an API root that is already one, however much path was given', () => {
    expect(wpApi.apiRootFrom('https://example.com/wp-json/wp/v2/posts')).toBe(
      'https://example.com/wp-json/wp/v2'
    );
    expect(wpApi.apiRootFrom('https://example.com/wp-json')).toBe(
      'https://example.com/wp-json/wp/v2'
    );
  });

  it('is null rather than throwing on nonsense', () => {
    expect(wpApi.apiRootFrom('')).toBeNull();
    expect(wpApi.apiRootFrom(null)).toBeNull();
    expect(wpApi.apiRootFrom('http://')).toBeNull();
  });
});

describe('featuredImage', () => {
  const post = (sizes, sourceUrl = 'https://x/original-3000px.jpg') => ({
    _embedded: {
      'wp:featuredmedia': [{ source_url: sourceUrl, media_details: { sizes } }],
    },
  });

  it('prefers a card-sized rendition over the multi-megabyte original', () => {
    const url = wpApi.featuredImage(
      post({
        large: { source_url: 'https://x/1024.jpg' },
        full: { source_url: 'https://x/3000.jpg' },
      })
    );
    expect(url).toBe('https://x/1024.jpg');
  });

  it('falls back through the sizes a site actually has', () => {
    expect(wpApi.featuredImage(post({ medium_large: { source_url: 'https://x/768.jpg' } })))
      .toBe('https://x/768.jpg');
    expect(wpApi.featuredImage(post({ medium: { source_url: 'https://x/300.jpg' } })))
      .toBe('https://x/300.jpg');
  });

  it('falls back to the original when a site publishes no renditions', () => {
    expect(wpApi.featuredImage(post({}))).toBe('https://x/original-3000px.jpg');
  });

  it('is null when there is no photo, or when WordPress returned an error stub', () => {
    expect(wpApi.featuredImage({})).toBeNull();
    expect(wpApi.featuredImage({ _embedded: {} })).toBeNull();
    expect(
      wpApi.featuredImage({
        _embedded: { 'wp:featuredmedia': [{ code: 'rest_forbidden' }] },
      })
    ).toBeNull();
  });
});

describe('categoryNames', () => {
  it('reads the sections and ignores the tags', () => {
    const names = wpApi.categoryNames({
      _embedded: {
        'wp:term': [
          [
            { taxonomy: 'category', name: 'Greek News' },
            { taxonomy: 'category', name: 'Melbourne' },
          ],
          [{ taxonomy: 'post_tag', name: 'thessaloniki' }],
        ],
      },
    });
    expect(names).toEqual(['Greek News', 'Melbourne']);
  });

  it('is an empty list, not a crash, when nothing was embedded', () => {
    expect(wpApi.categoryNames({})).toEqual([]);
    expect(wpApi.categoryNames({ _embedded: { 'wp:term': [] } })).toEqual([]);
  });
});

describe('mapCategory', () => {
  it('files Greece under Greek News', () => {
    expect(mapCategory(['Greek News'])).toBe('Greek News');
    expect(mapCategory(['RELIGION'])).toBe('Greek News');
    expect(mapCategory(['Ancient Greece'])).toBe('Greek News');
  });

  it('files the diaspora under its own heading — this station is in Melbourne', () => {
    expect(mapCategory(['Greek Australian News'])).toBe('Greek Australian');
    expect(mapCategory(['Melbourne'])).toBe('Greek Australian');
    expect(mapCategory(['Sydney'])).toBe('Greek Australian');
    expect(mapCategory(['Diaspora'])).toBe('Greek Australian');
  });

  it('files wire copy about elsewhere under Politics', () => {
    expect(mapCategory(['World News'])).toBe('Politics');
    expect(mapCategory(['Turkey'])).toBe('Politics');
    expect(mapCategory(['Usa'])).toBe('Politics');
  });

  it('is case- and space-insensitive, because publishers are inconsistent', () => {
    expect(mapCategory(['  gReEk CuLtUrE  '])).toBe('Entertainment');
  });

  it('takes the first section it recognises, ignoring ones it does not', () => {
    expect(mapCategory(['Something Invented', 'Sports'])).toBe('Sports');
  });

  it('falls back rather than dropping a story', () => {
    expect(mapCategory([])).toBe(FALLBACK_CATEGORY);
    expect(mapCategory(['Nothing We Know About'])).toBe(FALLBACK_CATEGORY);
    expect(mapCategory(undefined)).toBe(FALLBACK_CATEGORY);
  });

  it('maps every name in the table to a real heading', () => {
    for (const [source, ours] of Object.entries(CATEGORY_MAP)) {
      expect(typeof ours).toBe('string');
      expect(mapCategory([source])).toBe(ours);
    }
  });
});

describe('stripSyndicationTrailer', () => {
  it('removes the trailer WordPress staples to every syndicated excerpt', () => {
    const html =
      '<p>Real reporting here.</p>' +
      '<p>The post <a href="https://x/story">A Headline</a> appeared first on ' +
      '<a href="https://x">Greek City Times</a>.</p>';
    const out = stripSyndicationTrailer(html);
    expect(out).toBe('<p>Real reporting here.</p>');
    expect(out).not.toMatch(/appeared first on/i);
  });

  it('leaves a body that has no trailer alone', () => {
    const html = '<p>Just the story.</p>';
    expect(stripSyndicationTrailer(html)).toBe(html);
  });

  it('does not eat a sentence that merely mentions the phrase mid-article', () => {
    const html = '<p>The post appeared first on the noticeboard, she said.</p><p>Then this.</p>';
    expect(stripSyndicationTrailer(html)).toBe(html);
  });

  it('survives null and undefined', () => {
    expect(stripSyndicationTrailer(null)).toBe('');
    expect(stripSyndicationTrailer(undefined)).toBe('');
  });
});

describe('fromFeedItem', () => {
  it('puts an RSS item into the same shape the API produces', () => {
    const item = {
      guid: 'https://greekcitytimes.com/?p=600419',
      title: 'A Headline',
      link: 'https://greekcitytimes.com/2026/09/10/a-headline/',
      contentEncoded: '<p>Body</p><img src="https://x/lead.jpg">',
      contentSnippet: 'Body',
      creator: 'Bill Giannopoulos',
      categories: ['Greek News'],
      isoDate: '2026-09-10T13:34:26.000Z',
    };
    const out = fromFeedItem(item);

    expect(out.guid).toBe('https://greekcitytimes.com/?p=600419');
    expect(out.image).toBe('https://x/lead.jpg');
    expect(out.author).toBe('Bill Giannopoulos');
    expect(out.categories).toEqual(['Greek News']);
    expect(out.publishedAt).toBeInstanceOf(Date);
    expect(out.modifiedAt).toBeNull();
  });

  it('agrees with the API about a story’s identity, so switching source does not duplicate', () => {
    // WordPress writes ?p=<id> into both the feed's guid and the API's
    // guid.rendered. If that ever stops being true, every stored article is
    // imported a second time.
    const fromFeed = fromFeedItem({
      guid: 'https://greekcitytimes.com/?p=600419',
      title: 't',
      link: 'https://x',
    });
    const fromApi = wpApi.normalise({
      id: 600419,
      guid: { rendered: 'https://greekcitytimes.com/?p=600419' },
      title: { rendered: 't' },
      link: 'https://x',
    });
    expect(fromFeed.guid).toBe(fromApi.guid);
  });

  it('tolerates an item with nothing much in it', () => {
    const out = fromFeedItem({});
    expect(out.guid).toBe('');
    expect(out.image).toBeNull();
    expect(out.categories).toEqual([]);
    expect(out.publishedAt).toBeNull();
  });
});

describe('normalise', () => {
  it('reads date_gmt as UTC, not as local time', () => {
    // WordPress sends "2026-09-10T13:34:26" with no zone on a field whose
    // name already says GMT. Parsed as local time, every article's timestamp
    // is wrong by the server's offset — and Render does not run in Melbourne.
    const out = wpApi.normalise({
      id: 1,
      guid: { rendered: 'g' },
      date_gmt: '2026-09-10T13:34:26',
      modified_gmt: '2026-09-10T14:00:00',
    });
    expect(out.publishedAt.toISOString()).toBe('2026-09-10T13:34:26.000Z');
    expect(out.modifiedAt.toISOString()).toBe('2026-09-10T14:00:00.000Z');
  });

  it('falls back to the post id when a site sends no guid', () => {
    expect(wpApi.normalise({ id: 42 }).guid).toBe('?p=42');
  });
});

describe('stripPublisherChrome', () => {
  it('removes the ad label the sanitiser leaves stranded in the prose', () => {
    // The sanitiser drops the consent-gated <script> and keeps the label, so
    // the word "Advertising1" ends up reading as part of the article.
    const html =
      '<p>Real reporting.</p>' +
      '<div class="greek-2domain-0426 greek-2entity-placement" id="greek-233102">' +
      '<div class="greek-2adlabel">Advertising1</div>' +
      '</div>' +
      '<p>More reporting.</p>';

    const out = stripPublisherChrome(html);
    expect(out).not.toMatch(/Advertising/i);
    expect(out).toContain('Real reporting.');
    expect(out).toContain('More reporting.');
  });

  it('removes the wrapper it emptied, rather than leaving a hollow div', () => {
    const out = stripPublisherChrome(
      '<div class="x entity-placement"><div class="adlabel">Advertising2</div></div>'
    );
    expect(out.trim()).toBe('');
  });

  it('removes the blocks publishers staple to every article', () => {
    const out = stripPublisherChrome(
      '<p>Story.</p><div class="greek-2after-post">Read more from us</div>'
    );
    expect(out).toContain('Story.');
    expect(out).not.toMatch(/Read more from us/);
  });

  it('leaves an article that has none of it exactly as it was', () => {
    const html = '<p>Just the story.</p><h2>A heading</h2><p>And more.</p>';
    expect(stripPublisherChrome(html)).toBe(html);
  });

  it('never eats the article when a block is not closed as expected', () => {
    // Non-greedy, so an unclosed wrapper costs a fragment of markup rather
    // than everything after it.
    const html = '<div class="adlabel">Advertising1<p>The whole article follows.</p>';
    expect(stripPublisherChrome(html)).toContain('The whole article follows.');
  });

  it('survives null and undefined', () => {
    expect(stripPublisherChrome(null)).toBe('');
    expect(stripPublisherChrome(undefined)).toBe('');
  });
});

describe('makeExcerpt', () => {
  it('leaves a short summary alone', () => {
    expect(makeExcerpt('Short enough.')).toBe('Short enough.');
  });

  it('ends on a word rather than in the middle of one', () => {
    const long = `${'word '.repeat(80)}finalword`;
    const out = makeExcerpt(long, 100);
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, -1)).not.toMatch(/\s$/);
    expect(out.replace('…', '').split(' ').pop()).toBe('word');
  });

  it('does not throw away most of the summary chasing a space', () => {
    // One enormous word: backing up to the last space would leave almost
    // nothing, so it is cut where it is.
    const out = makeExcerpt(`a ${'x'.repeat(400)}`, 100);
    expect(out.length).toBeGreaterThan(90);
  });

  it('does not leave a dangling comma or dash before the ellipsis', () => {
    const out = makeExcerpt(`${'word '.repeat(20)}something, more words here`, 105);
    expect(out).not.toMatch(/[,;:\-]…$/);
  });

  it('survives null and undefined', () => {
    expect(makeExcerpt(null)).toBe('');
    expect(makeExcerpt(undefined)).toBe('');
  });
});

describe('bodyFor', () => {
  // The helpers above were right and the article still went out with the ad
  // label in it, because the one line that calls them had not been changed.
  // Testing the helper alone did not catch that. Testing the seam does.
  const AD =
    '<div class="greek-2domain-0426 greek-2entity-placement">' +
    '<div class="greek-2adlabel">Advertising1</div>' +
    '</div>';

  it('keeps the publisher\'s furniture out of a full article', () => {
    const out = bodyFor(
      { html: `<p>First half.</p>${AD}<h2>A heading</h2><p>Second half.</p>` },
      true
    );
    expect(out).not.toMatch(/Advertis/i);
    expect(out).toContain('First half.');
    expect(out).toContain('Second half.');
    expect(out).toContain('A heading');
  });

  it('keeps it out of an excerpt too', () => {
    const out = bodyFor({ excerptHtml: `<p>A teaser.</p>${AD}` }, false);
    expect(out).not.toMatch(/Advertis/i);
    expect(out).toContain('A teaser.');
  });

  it('stores the whole article only when permission has been given', () => {
    const item = {
      html: '<p>The whole article, at length.</p>',
      excerptHtml: '<p>Two lines.</p>',
    };
    expect(bodyFor(item, true)).toContain('The whole article');
    expect(bodyFor(item, false)).toContain('Two lines.');
    expect(bodyFor(item, false)).not.toContain('The whole article');
  });

  it('strips script and iframe whichever mode it is in', () => {
    const nasty = '<p>Text.</p><script>alert(1)</script><iframe src="https://x"></iframe>';
    expect(bodyFor({ html: nasty }, true)).not.toMatch(/<script|<iframe/i);
    expect(bodyFor({ excerptHtml: nasty }, false)).not.toMatch(/<script|<iframe/i);
  });
});
