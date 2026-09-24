const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

const escapeQuery = (value) => value.replaceAll("'", "\\'");

export async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "", refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? "", grant_type: "refresh_token" })
  });
  if (!response.ok) throw new Error(`drive_token_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("drive_token_missing");
  return payload.access_token;
}

async function driveFetch(token, url, options = {}) {
  const response = await fetch(url, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error(`drive_request_failed:${response.status}:${(await response.text()).slice(0, 200)}`);
  return response;
}

export async function findOrCreateBackupFolder(token, parentId, backupId, date) {
  const query = encodeURIComponent(`'${escapeQuery(parentId)}' in parents and name='${escapeQuery(backupId)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const list = await driveFetch(token, `${API}/files?q=${query}&fields=files(id,name,appProperties,createdTime)&spaces=drive`);
  const existing = (await list.json()).files?.[0];
  if (existing) return existing;
  const created = await driveFetch(token, `${API}/files?fields=id,name,appProperties,createdTime`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: backupId, mimeType: "application/vnd.google-apps.folder", parents: [parentId], appProperties: { app: "ebenertkd", type: "backup", date, status: "incomplete" } }) });
  return created.json();
}

async function findFile(token, folderId, name) {
  const query = encodeURIComponent(`'${escapeQuery(folderId)}' in parents and name='${escapeQuery(name)}' and trashed=false`);
  const response = await driveFetch(token, `${API}/files?q=${query}&fields=files(id,name,size,appProperties)&spaces=drive`);
  return (await response.json()).files?.[0];
}

export async function uploadEncryptedObject(token, folderId, name, contents, metadata) {
  const existing = await findFile(token, folderId, name);
  if (existing?.appProperties?.ciphertextSha256 === metadata.ciphertextSha256) return existing;
  if (existing) await driveFetch(token, `${API}/files/${existing.id}`, { method: "DELETE" });
  const session = await driveFetch(token, `${UPLOAD_API}/files?uploadType=resumable&fields=id,name,size,appProperties`, { method: "POST", headers: { "content-type": "application/json", "x-upload-content-type": "application/octet-stream", "x-upload-content-length": String(contents.length) }, body: JSON.stringify({ name, parents: [folderId], appProperties: { app: "ebenertkd", ...metadata } }) });
  const location = session.headers.get("location");
  if (!location) throw new Error("drive_resumable_location_missing");
  const uploaded = await driveFetch(token, location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-length": String(contents.length) }, body: contents });
  const result = await uploaded.json();
  if (result.appProperties?.ciphertextSha256 !== metadata.ciphertextSha256 || Number(result.size) !== contents.length) throw new Error(`drive_upload_verification_failed:${name}`);
  return result;
}

export async function markBackupComplete(token, folderId, manifestSha256) {
  const response = await driveFetch(token, `${API}/files/${folderId}?fields=id,name,appProperties`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appProperties: { app: "ebenertkd", type: "backup", status: "complete", manifestSha256 } }) });
  return response.json();
}

export async function listBackupFolders(token, parentId) {
  const query = encodeURIComponent(`'${escapeQuery(parentId)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='app' and value='ebenertkd' }`);
  const response = await driveFetch(token, `${API}/files?q=${query}&fields=files(id,name,appProperties,createdTime)&pageSize=1000&spaces=drive`);
  return (await response.json()).files ?? [];
}

export async function deleteBackupFolder(token, folderId) {
  await driveFetch(token, `${API}/files/${folderId}`, { method: "DELETE" });
}
