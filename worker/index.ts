/** Cloudflare Worker entry point for the backend API. */
import handler from "vinext/server/app-router-entry";

export { ClodexAccess } from "./clodex-access";

export default handler;