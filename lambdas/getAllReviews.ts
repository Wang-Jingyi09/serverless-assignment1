import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, content) => {
    const movieId = event.pathParameters?.movieId;
    const minRating = event.queryStringParameters?.minRating;

    if (!movieId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing movieId" }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // let queryParams = {
    //     TableName: process.env.TABLE_NAME,
    //     KeyConditionExpression: 'MovieId = :movieId',
    //     ExpressionAttributeValues: {
    //       ':movieId': { N: String(movieId) },
    //     },
    //   };
    let queryParams: QueryCommandInput = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'MovieId = :movieId',
        ExpressionAttributeValues: {
            ':movieId': parseInt(movieId),
        } as Record<string, any>, 
    };
    if (minRating) {
        queryParams = {
            ...queryParams,
            FilterExpression : 'Rating >= :minRating',
            ExpressionAttributeValues: { 
                ...queryParams.ExpressionAttributeValues, 
                ':minRating': Number(minRating) }
        };
    }

    try {
        // Print Event
        console.log("Event: ", event);

        const commandOutput = await ddbDocClient.send(new QueryCommand(queryParams));

        // check if there is a review
        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "No reviews found for this movie" }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ reviews: commandOutput.Items }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (error) {
        console.error('Error fetching movie reviews:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not fetch movie reviews", error }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}