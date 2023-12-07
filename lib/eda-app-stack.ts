import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    // Integration infrastructure

    const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });

    const mailerQ = new sqs.Queue(this, "mailer-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });

    const newImageTopic = new sns.Topic(this, "NewImageTopic", {
      displayName: "New Image topic",
    });

    // const mailerQ = new sqs.Queue(this, "mailer-queue", {
    //   receiveMessageWaitTime: cdk.Duration.seconds(10),
    // });

    // Lambda functions

    const processImageFn = new lambdanode.NodejsFunction(
      this,
      "ResizeImageFn",
      {
        // architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/processImage.ts`,
        timeout: cdk.Duration.seconds(15),
        memorySize: 128,
        environment: {
          BUCKET_NAME: imagesBucket.bucketName,
        },
        // bundling: {
        //   minify: false,
        //   // layers that are already available in the lambda env
        //   externalModules: ["aws-sdk", "sharp"],
        // },
        // layers: [sharpLayer],
      }
    );

    // const mailerFn = new lambdanode.NodejsFunction(this, "mailer-function", {
    //   runtime: lambda.Runtime.NODEJS_16_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(3),
    //   entry: `${__dirname}/../lambdas/mailer.ts`,
    // });

    // Subscriptions

    newImageTopic.addSubscription(new subs.SqsSubscription(mailerQ));

    // filterPolicyWithMessageBody: {
    //   Records: sns.FilterOrPolicy.policy({
    //     s3: sns.FilterOrPolicy.policy({
    //       object: sns.FilterOrPolicy.policy({
    //         key: sns.FilterOrPolicy.filter(
    //           sns.SubscriptionFilter.stringFilter({
    //             matchPrefixes: ["image"],
    //           })

    //           //   )
    //         ),
    //       }),
    //     }),
    //   }),
    // },
    newImageTopic.addSubscription(
      new subs.SqsSubscription(imageProcessQueue, {
        filterPolicyWithMessageBody: {
          Records: sns.FilterOrPolicy.policy({
            s3: sns.FilterOrPolicy.policy({
              s3SchemaVersion: sns.FilterOrPolicy.filter(
                sns.SubscriptionFilter.stringFilter({
                  allowlist: ["1.0"],
                })
              ),
            }),
          }),
        },
        rawMessageDelivery: true,
      })
    );

    // Event sources

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(newImageTopic)
    );

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.SnsDestination(newImageTopic)
    );

    const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });

    // const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
    //   batchSize: 5,
    //   maxBatchingWindow: cdk.Duration.seconds(10),
    // });

    // Lambda triggers

    processImageFn.addEventSource(newImageEventSource);
    // mailerFn.addEventSource(newImageMailEventSource);

    // Permissions

    imagesBucket.grantRead(processImageFn);

    // Output

    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });
  }
}
