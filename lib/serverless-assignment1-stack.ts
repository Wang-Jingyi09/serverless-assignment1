import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as custom from "aws-cdk-lib/custom-resources";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cognito from 'aws-cdk-lib/aws-cognito';

import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api'
import { AppApi } from './app-api'
import { Construct } from 'constructs';
import { generateReviewBatch } from "../shared/util";
import { reviews } from "../seed/reviews";
export class ServerlessAssignment1Stack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    new AppApi(this, 'AppApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });




    // create DynamoDB table
    const movieReviewsTable = new dynamodb.Table(this, 'MovieReviews', {
      partitionKey: { name: 'MovieId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING },  // ensure a movie will have no or only one review with the same date. 
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    // GSI for ensuring a movie never has more than one review on the same date
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "MovieDateIndex",
      partitionKey: { name: 'MovieId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'ReviewDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for ensuring a reviewer never reviews a movie more than once
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "ReviewerMovieIndex",
      partitionKey: { name: 'ReviewerName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'MovieId', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
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

    // Lambda A
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

    // Lambda B
    const addReviewFn = new lambdanode.NodejsFunction(
      this,
      "AddReviewFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/addReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    // Lambda C
    const getReviewByReviewerFn = new lambdanode.NodejsFunction(
      this,
      "GetReviewByReviewerFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getReviewByReviewer.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    //extend Lambda C
    const getReviewByMovieAndYearFn = new lambdanode.NodejsFunction(
      this,
      "GetReviewByMovieAndYearFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getReviewByMovieAndYear.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    //Lambda D
    const getAllReviewsByReviewerFn = new lambdanode.NodejsFunction(
      this,
      "GetAllReviewsByReviewerFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getAllReviewsByReviewer.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    //Lambda E
    const updateReviewFn = new lambdanode.NodejsFunction(
      this,
      "UpdateReviewFn ",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/updateReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      });

    // Permissions 
    movieReviewsTable.grantReadData(getAllReviewsFn); //A
    movieReviewsTable.grantReadWriteData(addReviewFn);//B
    movieReviewsTable.grantReadData(getReviewByReviewerFn);//C
    movieReviewsTable.grantReadData(getReviewByMovieAndYearFn); //C PLUS
    movieReviewsTable.grantReadData(getAllReviewsByReviewerFn); // D
    movieReviewsTable.grantWriteData(updateReviewFn); // E


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
    const reviewsResource = api.root.addResource('reviews');
    const movie = movies.addResource('{movieId}');
    const reviewsEndpoint = movie.addResource("reviews");
    const reviewerEndpoint = reviewsEndpoint.addResource("{reviewerName}");
    const reviewerReviews = reviewsResource.addResource('{reviewerName}');

    reviewsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllReviewsFn, { proxy: true })
    );
    reviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addReviewFn, { proxy: true })
    );
    reviewerEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getReviewByReviewerFn, { proxy: true })
    );
    reviewerReviews.addMethod(
      'GET',
      new apig.LambdaIntegration(getAllReviewsByReviewerFn, { proxy: true })
    );
    reviewerEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateReviewFn, { proxy: true })
    );


  }// end constructor

}

