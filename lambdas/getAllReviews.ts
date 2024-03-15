import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, content) => {
    const movieId = event.pathParameters?.movieId;
    if (!movieId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing movieId" }),
        };
    }

    try {
        // Print Event
        console.log("Event: ", event);
        const commandOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME,
                KeyConditionExpression: "MovieId = :movieId",
                ExpressionAttributeValues: {
                    ":movieId": parseInt(movieId), 
                },
            })
        );

        // check if there is a review
        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "No reviews found for this movie" }),
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