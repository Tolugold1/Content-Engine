import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireFeature } from "@content-engine/config";

/** Cloudflare R2 (S3-compatible) object storage for audio, videos and stills. */
export class R2Storage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error(`Object ${key} is empty`);
    return Buffer.from(await result.Body.transformToByteArray());
  }

  /** Short-lived link. Pass `downloadName` to make browsers save the file instead of playing it. */
  signedUrl(key: string, options: { expiresInSeconds?: number; downloadName?: string } = {}): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(options.downloadName ? { ResponseContentDisposition: `attachment; filename="${options.downloadName}"` } : {}),
      }),
      { expiresIn: options.expiresInSeconds ?? 3_600 },
    );
  }
}

let storage: R2Storage | undefined;

export function getStorage(): R2Storage {
  if (!storage) {
    const keys = requireFeature("storage");
    storage = new R2Storage({
      accountId: keys.R2_ACCOUNT_ID,
      accessKeyId: keys.R2_ACCESS_KEY_ID,
      secretAccessKey: keys.R2_SECRET_ACCESS_KEY,
      bucket: keys.R2_BUCKET,
    });
  }
  return storage;
}

/** Storage layout: one folder per draft. */
export const mediaKeys = {
  audio: (draftId: string) => `drafts/${draftId}/voice.mp3`,
  video: (draftId: string) => `drafts/${draftId}/video.mp4`,
  still: (draftId: string) => `drafts/${draftId}/still.png`,
};
