import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '@/lib/env'

type PutObjectInput = {
  readonly key: string
  readonly body: Buffer | Uint8Array | string
  readonly contentType: string
  readonly cacheControl?: string
}

const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const globalForStorage = globalThis as unknown as { foxStorageClient?: S3Client }

const client =
  globalForStorage.foxStorageClient ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  })

globalForStorage.foxStorageClient = client

export async function putObject(input: PutObjectInput): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? DEFAULT_CACHE_CONTROL,
    }),
  )

  return publicUrl(input.key)
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
}

export function publicUrl(key: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`
}
