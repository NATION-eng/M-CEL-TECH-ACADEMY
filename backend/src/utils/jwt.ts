import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface TokenPayload {
  id: string;
  role: string;
}

export const generateAccessToken = (id: Types.ObjectId, role: string, sessionTimeoutMinutes?: number): string => {
  // A configured session timeout (from Platform Settings) overrides the env
  // default; falls back to it if unset or invalid, so a bad/missing setting
  // can never leave the app issuing tokens with no expiry at all.
  const expiresIn = sessionTimeoutMinutes && sessionTimeoutMinutes > 0
    ? `${sessionTimeoutMinutes}m`
    : (process.env.JWT_EXPIRES_IN || '15m');
  return jwt.sign(
    { id: id.toString(), role },
    process.env.JWT_SECRET as string,
    { expiresIn } as jwt.SignOptions
  );
};

export const generateRefreshToken = (id: Types.ObjectId, role: string, rememberMe?: boolean): string => {
  // "Remember me" trades a longer-lived refresh token for not having to log
  // in again after closing the browser; unchecked, the frontend also clears
  // the session from storage on browser close (see auth.store.ts) so the
  // shorter token expiry here is really just defense in depth.
  const expiresIn = rememberMe ? '30d' : (process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  return jwt.sign(
    { id: id.toString(), role },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn } as jwt.SignOptions
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as TokenPayload;
};

/**
 * On rotation we only have the still-valid old token, not the original login
 * request — so "was this a remember-me session?" is inferred from how long
 * the token was issued for. Without this, every rotation would silently
 * downgrade a 30-day remembered session back to the 7-day default on its
 * very first refresh.
 */
export const wasRememberMeToken = (token: string): boolean => {
  const decoded = jwt.decode(token) as (TokenPayload & { iat?: number; exp?: number }) | null;
  if (!decoded?.iat || !decoded?.exp) return false;
  const lifetimeDays = (decoded.exp - decoded.iat) / 86400;
  return lifetimeDays > 10; // default is 7d; remember-me is 30d
};
