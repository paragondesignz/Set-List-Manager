/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _utils_normalize from "../_utils/normalize.js";
import type * as auth from "../auth.js";
import type * as bandMembers from "../bandMembers.js";
import type * as bands from "../bands.js";
import type * as http from "../http.js";
import type * as setlistItems from "../setlistItems.js";
import type * as setlists from "../setlists.js";
import type * as songs from "../songs.js";
import type * as storage from "../storage.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_utils/normalize": typeof _utils_normalize;
  auth: typeof auth;
  bandMembers: typeof bandMembers;
  bands: typeof bands;
  http: typeof http;
  setlistItems: typeof setlistItems;
  setlists: typeof setlists;
  songs: typeof songs;
  storage: typeof storage;
  templates: typeof templates;
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
