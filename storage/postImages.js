const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const {
    S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand,
    GetObjectCommand, DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const bucket = process.env.S3_IMAGE_BUCKET || 'post-images';
const client = process.env.S3_ENDPOINT && new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
    }
});

let bucketReady;

async function prepareImage(buffer) {
    const input = sharp(buffer, { animated: true, limitInputPixels: 25_000_000, failOn: 'warning' });
    const meta = await input.metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'heif'].includes(meta.format) ||
        (meta.format === 'heif' && meta.compression !== 'av1') ||
        meta.width * meta.height > 25_000_000 ||
        ((meta.pages || 1) > 1 && meta.format !== 'gif')) {
        throw new Error('Unsupported image');
    }

    const resized = input.autoOrient().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
    const gif = meta.format === 'gif';
    const { data, info } = await (gif ? resized.gif() : resized.webp({ quality: 85 }))
        .toBuffer({ resolveWithObject: true });
    if (data.length > 10 * 1024 * 1024) throw new Error('Encoded image too large');

    return {
        data,
        image: {
            key: randomUUID(),
            type: gif ? 'image/gif' : 'image/webp',
            width: info.width,
            height: info.pageHeight || info.height
        }
    };
}

async function saveImage({ data, image }) {
    if (!client) throw new Error('S3 storage is not configured');
    bucketReady ??= client.send(new HeadBucketCommand({ Bucket: bucket })).catch(async error => {
        if (error.$metadata?.httpStatusCode !== 404) throw error;
        try {
            await client.send(new CreateBucketCommand({ Bucket: bucket }));
        } catch (createError) {
            if (createError.name !== 'BucketAlreadyOwnedByYou') throw createError;
        }
    }).catch(error => {
        bucketReady = undefined;
        throw error;
    });
    await bucketReady;
    await client.send(new PutObjectCommand({
        Bucket: bucket, Key: image.key, Body: data, ContentType: image.type
    }));
}

function readImage(image) {
    if (!client) throw new Error('S3 storage is not configured');
    return client.send(new GetObjectCommand({ Bucket: bucket, Key: image.key }));
}

async function removeImage(image) {
    if (!image || !client) return;
    try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: image.key }));
    } catch (error) {
        console.error('Could not remove post image:', error.name);
    }
}

module.exports = { prepareImage, saveImage, readImage, removeImage };
