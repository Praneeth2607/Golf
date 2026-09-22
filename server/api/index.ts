// Vercel serverless entry point. Vercel invokes the default export of any
// file under api/ as a request handler; an Express app works directly here
// without extra adapter code (see: https://vercel.com/guides/using-express-with-vercel).
// `vercel.json`'s rewrite sends every request to this one function, and
// Express does its own routing internally from there.
import { app } from "../src/app";

export default app;
