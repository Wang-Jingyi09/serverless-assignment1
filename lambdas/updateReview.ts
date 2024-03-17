import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

function createDDBDocClient() {
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
const ddbDocClient = createDDBDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    if (!event.pathParameters) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Missing path parameters"
            })
        };
    }

    const { movieId, reviewerName } = event.pathParameters;
    const { content } = JSON.parse(event.body || '{}');

    if (!movieId || !reviewerName || !content ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Missing required fields or invalid input"
            })
        };
    }

    const params = {
        TableName: process.env.TABLE_NAME,
        Key: {
            MovieId: parseInt(movieId),
            ReviewerName: reviewerName,
        },
        UpdateExpression: "set Content = :c",
        ExpressionAttributeValues: {
            ":c": content
        },
    };

    try {
        await ddbDocClient.send(new UpdateCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Review updated successfully"
            })
        };
    } catch (error) {
        console.error('Error updating review:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Could not update the review",
                error: error
            })
        };
    }
};

