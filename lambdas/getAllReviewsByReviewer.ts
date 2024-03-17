import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const docClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const reviewerName = event.pathParameters?.reviewerName;
    if (!reviewerName) {
        return {
            statusCode: 400,
            body: 'ReviewerName is required'
        };

    }

    const params = {
        TableName: process.env.TABLE_NAME,
        IndexName: 'ReviewerMovieIndex',
        KeyConditionExpression: 'ReviewerName = :reviewerName',
        ExpressionAttributeValues: {
            ':reviewerName': reviewerName
        },
    };

    try {
        const { Items } = await docClient.send(new QueryCommand(params));
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Items)
        };
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: errorMessage
            })
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