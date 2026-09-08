const { toVideoId, composePost } = require('../controllers/showController');

/**
 * She will paste whatever her browser or the YouTube app gives her, which is
 * five different shapes depending on where she copied it from. Getting this
 * wrong means the live banner silently shows no video on the one night of the
 * week it matters.
 */
describe('toVideoId', () => {
  const ID = 'dQw4w9WgXcQ';

  it.each([
    ['a bare id', ID],
    ['a watch URL', `https://www.youtube.com/watch?v=${ID}`],
    ['a watch URL with more parameters', `https://www.youtube.com/watch?v=${ID}&t=42s&ab_channel=x`],
    ['a share link', `https://youtu.be/${ID}`],
    ['a live URL', `https://www.youtube.com/live/${ID}`],
    ['an embed URL', `https://www.youtube-nocookie.com/embed/${ID}`],
  ])('reads %s', (_label, input) => {
    expect(toVideoId(input)).toBe(ID);
  });

  it('trims whitespace from a paste', () => {
    expect(toVideoId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it.each([
    ['empty', ''],
    ['undefined', undefined],
    ['a channel URL', 'https://www.youtube.com/@RoulaKrikellis'],
    ['some other site', 'https://vimeo.com/12345678'],
    ['an id of the wrong length', 'abc123'],
  ])('returns null for %s', (_label, input) => {
    expect(toVideoId(input)).toBeNull();
  });
});

describe('composePost', () => {
  const state = {
    isLive: true,
    title: 'The Greek Eurobeat Show — with Pantelis Krestas',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  };

  it('carries the title, the site and the video link', () => {
    const post = composePost(state, 'https://thekkfactor.com.au');

    expect(post).toContain('WE ARE LIVE ON AIR');
    expect(post).toContain(state.title);
    expect(post).toContain('https://thekkfactor.com.au');
    expect(post).toContain(state.videoUrl);
    expect(post).toContain('#TheKKFactor');
  });

  it('falls back to the show name when no title was typed', () => {
    const post = composePost({ ...state, title: null }, 'https://thekkfactor.com.au');
    expect(post).toContain('THE KK FACTOR');
  });

  it('omits the video line when there is no video', () => {
    const post = composePost({ ...state, videoUrl: null }, 'https://thekkfactor.com.au');
    expect(post).not.toContain('youtube.com');
  });

  /** It is pasted into Instagram and TikTok, which are plain-text fields. */
  it('is plain text with no markup', () => {
    expect(composePost(state, 'https://thekkfactor.com.au')).not.toMatch(/<[a-z]/i);
  });
});
