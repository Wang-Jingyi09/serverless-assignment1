import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as custom from "aws-cdk-lib/custom-resources";
import * as apig from "aws-cdk-lib/aws-apigateway";

import { Construct } from 'constructs';
import { generateReviewBatch } from "../shared/util";
import { reviews } from "../seed/reviews";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ServerlessAssignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here

    // create DynamoDB table
    const movieReviewsTable = new dynamodb.Table(this, 'MovieReviews', {
      partitionKey: { name: 'MovieId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'ReviewDate', type: dynamodb.AttributeType.STRING },  // ensure a movie will have no or only one review with the same date. 
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    new custom.AwsCustomResource(this, "reviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateReviewBatch(reviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("reviewsddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    //Lambda A
    const getAllReviewsFn = new lambdanode.NodejsFunction(
      this,
      "GetAllReviewsFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getAllReviews.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    // Permissions 
    movieReviewsTable.grantReadData(getAllReviewsFn);

    // REST API 
    const api = new apig.RestApi(this, "MovieReviewsAPI", {
      description: "Movie Reviews API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });


    //Endpoints
    const movies = api.root.addResource('movies');
    const movie = movies.addResource('{movieId}');
    const reviewsEndpoint = movie.addResource("reviews");
    
    reviewsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllReviewsFn, { proxy: true })
    );
  }
}
