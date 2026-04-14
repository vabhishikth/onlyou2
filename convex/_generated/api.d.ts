/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_otp from "../auth/otp.js";
import type * as auth_otpDb from "../auth/otpDb.js";
import type * as auth_sender from "../auth/sender.js";
import type * as auth_sessions from "../auth/sessions.js";
import type * as featureFlags from "../featureFlags.js";
import type * as seed_fakeUsers from "../seed/fakeUsers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/otp": typeof auth_otp;
  "auth/otpDb": typeof auth_otpDb;
  "auth/sender": typeof auth_sender;
  "auth/sessions": typeof auth_sessions;
  featureFlags: typeof featureFlags;
  "seed/fakeUsers": typeof seed_fakeUsers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
