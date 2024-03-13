import { marshall } from "@aws-sdk/util-dynamodb";
import { MovieReview } from "./types";

export const generateReviewItem = (review: MovieReview) => {
    return {
        PutRequest: {
            Item: marshall({
                MovieId: review.MovieId,
                ReviewerName: review.ReviewerName,
                ReviewDate: review.ReviewDate,
                Content: review.Content,
                Rating: review.Rating,
            }),
        },
    };
};

export const generateReviewBatch = (data: MovieReview[]) => {
    return data.map((e) => {
        return generateReviewItem(e);
    });
};