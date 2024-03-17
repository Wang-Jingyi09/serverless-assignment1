import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Set up DynamoDB document client
const client = new DynamoDB({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    if (!event.pathParameters || !event.pathParameters.movieId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "MovieId is required" }),
        };
    }
    const movieId = parseInt(event.pathParameters.movieId);

    if (isNaN(movieId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "MovieId must be a number" }),
        };
    }
    const yearQuery = event.queryStringParameters?.year;

    // Validate yearQuery
    if (!yearQuery || !/^\d{4}$/.test(yearQuery)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Year must be a 4-digit number" }),
        };
    }

    // Create start and end dates for year query
    const startDate = `${yearQuery}-01-01`;
    const endDate = `${yearQuery}-12-31`;

    // DynamoDB query for reviews within the specified year for the specified movie
    const params = {
        TableName: process.env.TABLE_NAME,
        IndexName: "MovieDateIndex",
        KeyConditionExpression: "MovieId = :movieId and ReviewDate BETWEEN :startDate AND :endDate",
        ExpressionAttributeValues: {
            ":movieId": movieId,
            ":startDate": startDate,
            ":endDate": endDate,
        },
    };

    try {
        const { Items } = await ddbDocClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ reviews: Items }),
        };
    } catch (err) {
        console.error("DynamoDB error: ", err);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Internal server error"
            }),
        };
    }
};
