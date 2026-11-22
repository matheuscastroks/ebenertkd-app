// Opt-in process guard for local validation. Not loaded by the application.
const undici = require("undici");
const { MockAgent, setGlobalDispatcher } = undici;
const http = require("node:http");
const https = require("node:https");
const dispatcher = new MockAgent();
dispatcher.disableNetConnect();
setGlobalDispatcher(dispatcher);
function denied() { throw new Error("OFFLINE_VALIDATION: outbound HTTP is disabled"); }
globalThis.fetch = async () => denied();
undici.fetch = async () => denied();
http.request = denied;
http.get = denied;
https.request = denied;
https.get = denied;
