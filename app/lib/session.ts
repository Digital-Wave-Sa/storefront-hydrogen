import type {HydrogenSession} from '@shopify/hydrogen';
import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from 'react-router';

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
/**
 * How long a signed-in session survives, in seconds.
 *
 * Without this the cookie had no `maxAge` and no `expires`, which makes it a
 * browser SESSION cookie: the browser discards it the moment it closes. A
 * shopper stayed signed in for as long as that browser process happened to
 * live and was anonymous again afterwards — and because Chrome restarts its
 * process on updates, on memory pressure, and on mobile whenever the OS
 * reclaims the tab, "how long" had nothing to do with elapsed time. It simply
 * felt random.
 *
 * Thirty days, renewed on use (see `touch` below), so an active shopper is
 * never signed out and an abandoned session on a shared device still dies.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * How stale the session may get before a visit re-issues the cookie.
 *
 * The expiry can only move forward when a `Set-Cookie` goes out, and server.ts
 * sends one only when the session was WRITTEN to. Reading alone is not a
 * write, so browsing without signing in or changing a branch never renewed
 * anything: the 30 days would run from the last write rather than the last
 * visit, and a returning shopper could still be logged out mid-browse.
 *
 * `touch()` makes a visit a write — but only once a day, so this does not put
 * a Set-Cookie header on every response.
 */
const TOUCH_INTERVAL_MS = 1000 * 60 * 60 * 24;

export class AppSession implements HydrogenSession {
  public isPending = false;

  #sessionStorage;
  #session;

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage;
    this.#session = session;
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    });

    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession());

    return new this(storage, session);
  }

  get has() {
    return this.#session.has;
  }

  get get() {
    return this.#session.get;
  }

  get flash() {
    return this.#session.flash;
  }

  get unset() {
    this.isPending = true;
    return this.#session.unset;
  }

  get set() {
    this.isPending = true;
    return this.#session.set;
  }

  /**
   * Push the expiry forward on a real visit, at most once a day.
   *
   * Marking the session pending is what makes server.ts emit a `Set-Cookie`,
   * and re-issuing the cookie is what restarts the 30 days. Doing it on every
   * response would work too, at the cost of a Set-Cookie header on every
   * request; once a day is enough to keep a shopper who visits at all from
   * ever reaching the expiry.
   *
   * Only sessions that already carry something are touched. Writing a
   * timestamp for a first-time anonymous visitor would hand a cookie to every
   * crawler and every bounce, which is noise rather than a session.
   */
  touch() {
    if (!this.#session.has('customerAccessToken')) return;

    const last = Number(this.#session.get('lastSeen') || 0);
    const now = Date.now();
    if (now - last < TOUCH_INTERVAL_MS) return;

    this.set('lastSeen', now);
  }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session);
  }

  commit() {
    this.isPending = false;
    return this.#sessionStorage.commitSession(this.#session);
  }
}
