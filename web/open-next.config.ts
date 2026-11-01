import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every data page is rendered per request (the API calls use no-store), so no
// incremental cache store (R2 or KV) is configured.
export default defineCloudflareConfig({});
