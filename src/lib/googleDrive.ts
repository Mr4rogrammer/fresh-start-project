// Google Drive API service for uploading trade screenshots

const FOLDER_NAME = 'Tradeify Screenshots';

// Get or create the Tradeify folder in user's Drive
async function getOrCreateFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  const createData = await createResponse.json();
  return createData.id;
}

// Upload image to Google Drive and return shareable link
export async function uploadToGoogleDrive(
  accessToken: string,
  file: File,
  fileName?: string
): Promise<{ fileId: string; webViewLink: string; thumbnailLink: string }> {
  try {
    // Get or create folder
    const folderId = await getOrCreateFolder(accessToken);

    // Create file metadata
    const metadata = {
      name: fileName || `trade_${Date.now()}_${file.name}`,
      parents: [folderId],
    };

    // Create form data for multipart upload
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', file);

    // Upload file
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error?.message || 'Failed to upload file');
    }

    const uploadData = await uploadResponse.json();

    // Make file publicly accessible (anyone with link can view)
    const permResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );

    if (!permResponse.ok) {
      const permError = await permResponse.json();
      console.error('Failed to set public permission:', permError);
      // Continue anyway - file is uploaded but might not be publicly accessible
    }

    // Get the updated file with webContentLink
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=id,webViewLink,webContentLink,thumbnailLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const fileData = await fileResponse.json();

    return {
      fileId: fileData.id,
      webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
      thumbnailLink: `https://drive.google.com/thumbnail?id=${fileData.id}&sz=w1000`,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
}

// Delete file from Google Drive
export async function deleteFromGoogleDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// Get direct image URL from Drive file ID
export function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Get thumbnail URL (smaller, faster loading)
export function getDriveThumbnailUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
}

// Extract file ID from Drive URL
export function extractFileIdFromUrl(url: string): string | null {
  // Handle various Google Drive URL formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
