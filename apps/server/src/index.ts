/**
 * Entry point. Kept to the `listen(app)` shape so it also deploys to Colyseus
 * Cloud unchanged. For self-hosting details see https://docs.colyseus.io/server
 */
import { listen } from "@colyseus/tools";
import app from "./app.config";

listen(app);
