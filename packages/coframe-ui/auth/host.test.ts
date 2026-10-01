import { describe, expect, it } from 'vitest';
import { hostPage, nextOf, startToken, type ClientInfo } from './host';

const HOSTED: ClientInfo = { role: 'admin', base: '/admin', login: '/login', logout: '/logout' };
const OWN: ClientInfo = { role: 'app', base: '', login: null, logout: null };

const here = {
  href: 'http://localhost:5174/admin/app/rapportini?id=3#top',
  pathname: '/admin/app/rapportini',
  search: '?id=3',
  hash: '#top'
};

describe('hostPage', () => {
  it('is relative in a build, served by the host', () => {
    expect(hostPage('/logout', '')).toBe('/logout');
  });

  it('carries the backend origin in dev', () => {
    expect(hostPage('/logout', 'http://localhost:8301')).toBe('http://localhost:8301/logout');
  });

  it('adds next, encoded, after a query the page already has', () => {
    expect(hostPage('/login', '', '/admin/app?x=1')).toBe('/login?next=%2Fadmin%2Fapp%3Fx%3D1');
    expect(hostPage('/login?lang=it', '', '/admin/')).toBe('/login?lang=it&next=%2Fadmin%2F');
  });
});

describe('nextOf', () => {
  it('is the path in a build', () => {
    expect(nextOf(here, '')).toBe('/admin/app/rapportini?id=3#top');
  });

  it('is the whole address in dev, where the client is on another port', () => {
    expect(nextOf(here, 'http://localhost:8301')).toBe(here.href);
  });
});

describe('startToken', () => {
  const deps = (host: string | null, saved: string | null) => ({
    hostToken: async () => host,
    savedToken: () => saved
  });

  it('with a host login, asks the host even with a token saved', async () => {
    expect(await startToken(HOSTED, deps('from-host', 'saved'))).toBe('from-host');
  });

  it('with a host login and no session, starts with nothing', async () => {
    expect(await startToken(HOSTED, deps(null, 'saved'))).toBeNull();
  });

  it('without a host login, keeps the saved token', async () => {
    expect(await startToken(OWN, deps('from-host', 'saved'))).toBe('saved');
    expect(await startToken(null, deps('from-host', 'saved'))).toBe('saved');
  });
});
