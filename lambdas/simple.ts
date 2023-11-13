/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import { sharp } from "/opt/nodejs/sharp-utils";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client();

export const handler : SQSHandler = async (event) => {
  console.log("Event ", event);
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const message = JSON.parse(recordBody.Message);
    console.log('Message ',JSON.stringify(message))

    // if (!recordBody.Records) {
    //   return {
    //     statusCode: 400,
    //     body: "No messages presente.",
    //   };
    // }
    for (const messageRecord of message.Records) {
      const s3e = messageRecord.s3;
      const srcBucket = s3e.bucket.name;
      // Object key may have spaces or unicode non-ASCII characters.
      const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
      // Infer the image type from the file suffix.
      const typeMatch = srcKey.match(/\.([^.]*)$/);
      if (!typeMatch) {
        console.log("Could not determine the image type.");
        return ;
      }
      // Check that the image type is supported
      const imageType = typeMatch[1].toLowerCase();
      if (imageType != "jpeg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return ;
      }
      // // Download the image from the S3 source bucket.
      let origimage = null;
      try {
        const params: GetObjectCommandInput = {
          Bucket: srcBucket,
          Key: srcKey,
        };
        origimage = await s3.send(new GetObjectCommand(params));
      } catch (error) {
        console.log(error);
        return ;
      }
      // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
      const width = 200;
      let resizedImage = null;
      try {
        const str = await origimage.Body?.transformToByteArray();
        resizedImage = await sharp(str).resize(width).toBuffer();
      } catch (error) {
        console.log(error);
        return ;
      }
      try {
        // Upload the thumbnail image to the destination bucket
        const destparams: PutObjectCommandInput = {
          Bucket: process.env.BUCKET_NAME,
          Key: srcKey,
          Body: resizedImage,
          ContentType: "image",
        };
        await s3.send(new PutObjectCommand(destparams));
      } catch (error) {
        console.log(error);
        return ;
      }
    }
  }
  return ;
};
