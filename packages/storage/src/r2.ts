import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env["R2_ACCOUNT_ID"] &&
      process.env["R2_ACCESS_KEY_ID"] &&
      process.env["R2_SECRET_ACCESS_KEY"] &&
      process.env["R2_BUCKET_NAME"],
  );
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function safeFileSegment(name: string): string {
  const trimmed = name.trim() || "file";
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 120) || "file";
}

export function buildObjectKey(workspaceId: string, taskId: string, fileName: string): string {
  const id = randomUUID();
  return `${workspaceId}/${taskId}/${id}-${safeFileSegment(fileName)}`;
}

export function publicUrlForKey(key: string): string {
  const base = (process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/${key}`;
}

export async function presignPutUpload(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const bucket = requireEnv("R2_BUCKET_NAME");
  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  };
  const cmd = new PutObjectCommand(input);
  return getSignedUrl(getClient(), cmd, { expiresIn: 3600 });
}

export async function deleteObjectByKey(key: string): Promise<void> {
  const bucket = requireEnv("R2_BUCKET_NAME");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function assertKeyMatchesTask(key: string, workspaceId: string, taskId: string): boolean {
  const prefix = `${workspaceId}/${taskId}/`;
  return key.startsWith(prefix) && key.length > prefix.length;
}
