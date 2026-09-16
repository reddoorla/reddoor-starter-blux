import * as prismic from "@prismicio/client";
import { enableAutoPreviews, type CreateClientConfig } from "@prismicio/svelte/kit";
import config from "../../slicemachine.config.json";
import { frozenArtifacts } from "./blux-frozen/artifacts";

export const repositoryName = import.meta.env.VITE_PRISMIC_ENVIRONMENT || config.repositoryName;

/**
 * True when the starter has not yet been wired to a real Prismic repository.
 * Prerender entry points (sitemap, dynamic [uid]) short-circuit to empty
 * results in that case so `pnpm build` succeeds on an unconfigured clone.
 */
export const isPlaceholderRepo = repositoryName === "your-prismic-repo-name";

/**
 * True when this repo committed frozen-page artifacts (a Blux freeze site).
 * Frozen pages render from a committed template, so the frozen loaders skip the
 * native page/catalog query path entirely.
 */
export const isFrozenSite = Object.keys(frozenArtifacts).length > 0;

/**
 * Every client is routes-free — deliberately. Prismic's routes resolver
 * validates each `routes` entry against the repo's DOC-BEARING types (the
 * error's "Expected one of" lists exactly those, and pushing type models via
 * the Custom Types API does not help), then rejects EVERY query on the client
 * with a 400 when any entry misses. A cloned repo only ever populates one of
 * `page` / `catalog_page`, so a routes config naming both breaks every single
 * repo it ships to: native sites 400 on the `catalog_page` entries, migrated
 * sites on the `page` entries, frozen and pre-content repos on all of them
 * (observed live against 48bb12d1 and the-pointe-burbank, 2026-07-28).
 *
 * Without routes, `getAllByType` on an absent type resolves to an empty list
 * instead of erroring — which is what the both-worlds page-doc probe relies
 * on. The cost is that the API no longer fills `doc.url`/`link.url` for
 * content-relationship fields; nothing in the starter reads those today
 * (web-type links carry their own URL), and `linkResolver` below is the local
 * replacement to pass to `asLink` when a consumer does need one.
 */
export const linkResolver: prismic.LinkResolverFunction = (doc) => {
  if ((doc.type === "page" || doc.type === "catalog_page") && doc.uid) {
    return doc.uid === "home" ? "/" : `/${doc.uid}`;
  }
  return null;
};

export const createClient = ({ cookies, ...config }: CreateClientConfig = {}) => {
  const client = prismic.createClient(repositoryName, config);

  enableAutoPreviews({ client, cookies });

  return client;
};
