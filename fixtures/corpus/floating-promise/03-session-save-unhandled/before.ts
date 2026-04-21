import { Session } from "./orm";

interface LoginContext {
  userId: string;
  ip: string;
  userAgent: string;
}

// Persists a session record after the user authenticates. The ORM's save()
// returns a promise; if the DB connection drops the caller never learns.
export function persistLogin(session: Session, ctx: LoginContext): void {
  session.userId = ctx.userId;
  session.ip = ctx.ip;
  session.userAgent = ctx.userAgent;
  session.save();
}

export class SessionRepository {
  touch(session: Session): void {
    session.lastSeenAt = new Date();
    session.save();
  }
}
