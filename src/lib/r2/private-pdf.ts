import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AppError } from "@/lib/validation/app-error";

const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 300;

export interface PrivatePdfSigner {
  signDownload(input: {
    key: string;
    expiresInSeconds: number;
  }): Promise<{ url: string; expiresAt: string }>;
}

function requiredEnvironment(
  name:
    | "R2_ACCOUNT_ID"
    | "R2_ACCESS_KEY_ID"
    | "R2_SECRET_ACCESS_KEY"
    | "R2_PRIVATE_BUCKET",
): string {
  const value = process.env[name];
  if (!value)
    throw new AppError("INTERNAL", `Missing server configuration: ${name}.`);
  return value;
}

export function privatePdfKey(
  lessonSlug: string,
  version: number,
  contentHash: string,
): string {
  return `pdf/${lessonSlug}/v${version}/${contentHash}.pdf`;
}

export function createPrivatePdfSigner(): PrivatePdfSigner {
  const accountId = requiredEnvironment("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnvironment("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnvironment("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnvironment("R2_PRIVATE_BUCKET");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    async signDownload({ key, expiresInSeconds }) {
      if (
        expiresInSeconds < MIN_TTL_SECONDS ||
        expiresInSeconds > MAX_TTL_SECONDS
      ) {
        throw new AppError(
          "VALIDATION_FAILED",
          "PDF URL expiry is outside the allowed range.",
        );
      }
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        {
          expiresIn: expiresInSeconds,
        },
      );
      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      };
    },
  };
}
