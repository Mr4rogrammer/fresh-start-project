import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";

const BACKUP_FOLDER_NAME = "Tradeify Backups";

async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );
  const createData = await createResponse.json();
  return createData.id;
}

/** Collect all user data from Firebase */
async function collectUserData(uid: string) {
  const paths = [
    "challenges",
    "notes",
    "links",
    "checklists",
    "killZones",
    "goals",
    "tradingRules",
  ];

  const snapshots = await Promise.all(
    paths.map((p) => get(ref(db, `users/${uid}/${p}`)))
  );

  const data: Record<string, any> = {};
  paths.forEach((p, i) => {
    data[p] = snapshots[i].exists() ? snapshots[i].val() : null;
  });

  return data;
}

/** Delete all existing backup files inside the folder */
async function deleteOldBackups(accessToken: string, folderId: string) {
  try {
    const filesResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id)&pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const filesData = await filesResponse.json();
    const files = filesData.files || [];

    await Promise.all(
      files.map((f: { id: string }) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      )
    );
  } catch (error) {
    console.warn("Failed to delete old backups, continuing with upload:", error);
  }
}

/** Backup all user data to Google Drive as JSON */
export async function backupToGoogleDrive(
  accessToken: string,
  uid: string
): Promise<{ fileId: string; fileName: string }> {
  const data = await collectUserData(uid);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `tradeify-backup-${timestamp}.json`;

  const backupPayload = {
    version: 1,
    exportedAt: now.toISOString(),
    data,
  };

  const folderId = await getOrCreateBackupFolder(accessToken);

  // Delete all existing backups in the folder before uploading new one
  await deleteOldBackups(accessToken, folderId);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json",
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append(
    "file",
    new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: "application/json",
    })
  );

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error?.message || "Failed to upload backup");
  }

  const result = await uploadResponse.json();
  return { fileId: result.id, fileName: result.name };
}

/** List existing backups from Drive */
export async function listBackups(
  accessToken: string
): Promise<{ id: string; name: string; createdTime: string }[]> {
  // First find the folder
  const searchFolder = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const folderData = await searchFolder.json();

  if (!folderData.files || folderData.files.length === 0) return [];

  const folderId = folderData.files[0].id;

  const filesResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const filesData = await filesResponse.json();
  return filesData.files || [];
}
