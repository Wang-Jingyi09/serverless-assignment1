import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const translateClient = new TranslateClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    // Extract path parameters and query parameters
    const { reviewerName, movieId } = event.pathParameters || {};
    const { language } = event.queryStringParameters || {};

    // Validate required parameters
    if (!reviewerName || !movieId || !language) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required parameters' }),
        };
    }

    try {
        const getParams = {
            TableName: process.env.TABLE_NAME,
            Key: {
                ReviewerName: reviewerName,
                MovieId: parseInt(movieId),
            },
        };
        const { Item } = await ddbDocClient.send(new GetCommand(getParams));

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Review not found' }),
            };
        }

        // Translate review content
        const translateParams = {
            Text: Item.Content,
            SourceLanguageCode: 'auto',
            TargetLanguageCode: language,
        };
        const { TranslatedText } = await translateClient.send(new TranslateTextCommand(translateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({
                original: Item.Content,
                translation: TranslatedText,
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error
            }),
        };
    }
};
