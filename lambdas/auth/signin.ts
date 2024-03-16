import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types"; 
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json"; 

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["SignInBody"] || {});

const client = new CognitoIdentityProviderClient({
    region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", event);
        const body = event.body ? JSON.parse(event.body) : null;

        if (!body || !isValidBodyParams(body)) {
            return {
                statusCode: 400, 
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    message: "Incorrect body format. Must match SignInBody schema.",
                    schema: schema.definitions["SignInBody"],
                }),
            };
        }

        const signInBody = body as SignInBody;

        const params: InitiateAuthCommandInput = {
            ClientId: process.env.CLIENT_ID, 
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: signInBody.username,
                PASSWORD: signInBody.password,
            },
        };

        const command = new InitiateAuthCommand(params);
        const response = await client.send(command);

        if (!response.AuthenticationResult) {
            return {
                statusCode: 401, 
                body: JSON.stringify({
                    message: "Authentication failed",
                }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
                // "Access-Control-Allow-Headers": "*",
                // "Access-Control-Allow-Origin": "*", 
                // "Set-Cookie": `token=${response.AuthenticationResult.IdToken}; Secure; HttpOnly; Path=/; Max-Age=3600;`,
            },
            body: JSON.stringify({
                message: "Authentication successful",
                token: response.AuthenticationResult.IdToken,
            }),
        };
    } catch (err) {
        console.error("Authentication error:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err,
            }),
        };
    }
};
