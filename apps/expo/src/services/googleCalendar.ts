/**
 * Google Calendar Integration Service
 * Uses the same Google Sign-In flow as login (@react-native-google-signin)
 */

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status: string;
  htmlLink: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface GoogleSignInResult {
  accessToken: string;
  refreshToken?: string;
  email: string;
  expiresAt: Date;
}

/**
 * Configure Google Sign-In with calendar scope
 */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    offlineAccess: true, // Request refresh token
  });
}

/**
 * Sign in with Google and get calendar access
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    // Configure before signing in
    configureGoogleSignIn();

    // Check if already signed in
    const isSignedIn = GoogleSignin.hasPreviousSignIn();
    
    let userInfo;
    if (isSignedIn) {
      // Try silent sign in first
      try {
        userInfo = await GoogleSignin.signInSilently();
      } catch {
        // Silent sign in failed, do regular sign in
        userInfo = await GoogleSignin.signIn();
      }
    } else {
      userInfo = await GoogleSignin.signIn();
    }

    if (!userInfo.data) {
      throw new Error("No user data received from Google Sign-In");
    }

    // Get access token
    const tokens = await GoogleSignin.getTokens();
    
    if (!tokens.accessToken) {
      throw new Error("No access token received from Google");
    }

    // Calculate expiration (tokens typically expire in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return {
      accessToken: tokens.accessToken,
      refreshToken: userInfo.data.serverAuthCode || undefined,
      email: userInfo.data.user.email,
      expiresAt,
    };
  } catch (error: unknown) {
    const googleError = error as { code?: string };
    
    if (googleError.code === "SIGN_IN_CANCELLED") {
      throw new Error("Sign in cancelled");
    } else if (googleError.code === statusCodes.IN_PROGRESS) {
      throw new Error("Sign in already in progress");
    } else if (googleError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    
    throw error;
  }
}

/**
 * Get current access token (refreshes if needed)
 */
export async function getAccessToken(): Promise<string> {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch {
    // Token might be expired, try to refresh
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  }
}

/**
 * Refresh access token
 * Note: GoogleSignin.getTokens() handles refresh automatically
 */
export async function refreshAccessToken(
  _refreshToken: string,
): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  try {
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    
    return {
      accessToken: tokens.accessToken,
      expiresIn: 3600, // 1 hour
    };
  } catch (error) {
    throw new Error("Failed to refresh token. Please reconnect your calendar.");
  }
}

/**
 * Sign out from Google (for calendar purposes)
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Error signing out from Google:", error);
  }
}

/**
 * Fetch user's calendar list
 */
export async function fetchCalendars(
  accessToken: string,
): Promise<GoogleCalendar[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch calendars: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Fetch events from a specific calendar
 */
export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string = "primary",
  options?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
  },
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: String(options?.singleEvents ?? true),
    orderBy: options?.orderBy ?? "startTime",
    maxResults: String(options?.maxResults ?? 50),
  });

  if (options?.timeMin) {
    params.append("timeMin", options.timeMin.toISOString());
  }

  if (options?.timeMax) {
    params.append("timeMax", options.timeMax.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Get user's email from access token
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  const data = await response.json();
  return data.email;
}
