import { describe, expect, it } from 'vitest';
import { webSrc, ytParse, ytSrc } from './urls';

describe('ytParse', () => {
  it.each([
    ['https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'aqz-KE-bpKQ'],
    ['https://youtu.be/aqz-KE-bpKQ?si=x', 'aqz-KE-bpKQ'],
    ['youtube.com/shorts/aqz-KE-bpKQ', 'aqz-KE-bpKQ'],
    ['https://m.youtube.com/embed/aqz-KE-bpKQ', 'aqz-KE-bpKQ'],
    ['aqz-KE-bpKQ', 'aqz-KE-bpKQ'],
  ])('%s', (url, id) => expect(ytParse(url)?.id).toBe(id));

  it('parses start times', () => {
    expect(ytParse('https://youtu.be/aqz-KE-bpKQ?t=90')?.start).toBe(90);
    expect(ytParse('https://youtube.com/watch?v=aqz-KE-bpKQ&t=1m30s')?.start).toBe(90);
  });

  it('rejects non-YouTube links', () => {
    expect(ytParse('https://vimeo.com/123')).toBeNull();
    expect(ytParse('')).toBeNull();
  });

  it('builds a looping embed URL', () => {
    const src = ytSrc({ id: 'aqz-KE-bpKQ', start: 5 }, 'http://localhost:8000');
    expect(src).toContain('/embed/aqz-KE-bpKQ?');
    expect(src).toContain('playlist=aqz-KE-bpKQ');
    expect(src).toContain('start=5');
    expect(src).toContain('origin=http%3A%2F%2Flocalhost%3A8000');
    expect(ytSrc({ id: null, list: 'PL123' })).toContain('/embed/videoseries?');
  });
});

describe('webSrc', () => {
  it('converts Vimeo links to the background player', () => {
    expect(webSrc('vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871?autoplay=1&muted=1&loop=1&background=1');
  });
  it('adds https when missing', () => {
    expect(webSrc('example.com/x')).toBe('https://example.com/x');
  });
});
