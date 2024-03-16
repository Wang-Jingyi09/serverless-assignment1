import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const reviewerName = event.pathParameters?.reviewerName;

        if (!movieId || !reviewerName) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Missing movieId or reviewerName" }),
            };
        }
        // GSI
        const commandOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.TABLE_NAME, 
                IndexName: 'ReviewIndex', 
                KeyConditionExpression:
                    'ReviewerName = :reviewerName and MovieId = :movieId',
                ExpressionAttributeValues: {
                    ':reviewerName': reviewerName,
                    ':movieId': parseInt(movieId),
                },
            })
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: "No review found for this movie and reviewer" }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ review: commandOutput.Items[0] }), // Assuming one review per reviewer per movie
        };
    } catch (error: any) {
        console.error('Error fetching review:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error }),
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
