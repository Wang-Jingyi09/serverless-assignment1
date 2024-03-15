import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        // Print Event
        console.log("Event: ", event);
        const movieIdString = event.pathParameters?.movieId;
        const movieId = movieIdString ? parseInt(movieIdString) : null;

        if (movieId === null || isNaN(movieId)) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Missing or invalid movieId in the path" }),
            };
        }

        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body || !isValidBodyParams(body)) { // Validate request body against schema
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "Invalid request body or missing request body" }),
            };
        }

        // if (!body.ReviewerName || !body.Content || typeof body.Rating !== 'number') {
        //     return {
        //         statusCode: 400,
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ message: "Missing required fields in request body" }),
        //     };
        // }


        const reviewDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
    
        const commandOutput = await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    MovieId: movieId,
                    ReviewDate: reviewDate,
                    ...body,
                },
            })
        );
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "Review added successfully" }),
        };
    } catch (error: any) {
        console.error('Error adding review:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "Could not add a review", error: error.message }), // 提供更多错误信息
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