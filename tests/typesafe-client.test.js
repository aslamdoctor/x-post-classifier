import { describe, it, expect } from "bun:test";
import {
  buildTypeSafePayload,
  parseTypeSafeResponse,
  classifyPost,
  CATEGORY_META,
  TYPESAFE_ENDPOINT
} from "../src/typesafe-client.js";

describe("TypeSafe Client Module", () => {
  it("builds valid Choice question payload with state and criteria for /v1/systemone", () => {
    const payload = buildTypeSafePayload({
      author_handle: "@vishalsingh2972",
      author_name: "Vishal Singh",
      text: "there is so much gold on Chinese GitHub"
    });

    expect(payload.model).toBe("jev-latest");
    expect(payload.state).toContain("Vishal Singh");
    expect(payload.state).toContain("@vishalsingh2972");
    expect(payload.state).toContain("there is so much gold on Chinese GitHub");

    expect(payload.questions.post_type).toBeDefined();
    const q = payload.questions.post_type;
    expect(q.type).toBe("choice");
    expect(q.instructions).toBe("What is the primary intent or type of this post?");
    expect(Object.keys(q.criteria).length).toBe(6);

    expect(Object.keys(q.criteria)).toEqual([
      "insight_tutorial",
      "news_update",
      "engagement_bait",
      "promo_sales",
      "meme_humor",
      "personal_opinion"
    ]);
  });

  it("parses top choice string and confidence from TypeSafe SystemOne response", () => {
    const mockResponse = {
      model: "jev-1.14.0",
      answers: {
        post_type: {
          type: "choice",
          choice: "insight_tutorial",
          confidence: 0.88,
          probabilities: {
            insight_tutorial: 0.88,
            news_update: 0.08,
            engagement_bait: 0.02,
            promo_sales: 0.01,
            meme_humor: 0.005,
            personal_opinion: 0.005
          }
        }
      }
    };

    const result = parseTypeSafeResponse(mockResponse);
    expect(result.category).toBe("insight_tutorial");
    expect(result.label).toBe("Insight");
    expect(result.confidence).toBe(0.88);
  });

  it("returns fallback metadata when response is malformed or empty", () => {
    expect(parseTypeSafeResponse(null)).toEqual({
      category: "unknown",
      label: "Unknown",
      confidence: 0
    });

    expect(parseTypeSafeResponse({})).toEqual({
      category: "unknown",
      label: "Unknown",
      confidence: 0
    });
  });

  it("makes authenticated POST request to TypeSafe API endpoint and returns parsed response", async () => {
    let requestedUrl = null;
    let requestOptions = null;

    const mockFetch = async (url, options) => {
      requestedUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({
          answers: {
            post_type: {
              type: "choice",
              choice: "meme_humor",
              confidence: 0.94,
              probabilities: {
                meme_humor: 0.94
              }
            }
          }
        })
      };
    };

    const tweetState = {
      author_handle: "@tester",
      author_name: "Tester",
      text: "funny joke here"
    };

    const result = await classifyPost("ts-test-key", tweetState, mockFetch);

    expect(requestedUrl).toBe(TYPESAFE_ENDPOINT);
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers["Authorization"]).toBe("Bearer ts-test-key");
    expect(requestOptions.headers["Content-Type"]).toBe("application/json");

    const sentBody = JSON.parse(requestOptions.body);
    expect(sentBody.state).toContain("funny joke here");
    expect(result.category).toBe("meme_humor");
    expect(result.label).toBe("Meme");
    expect(result.confidence).toBe(0.94);
  });

  it("handles non-ok API responses gracefully", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Rate limit exceeded"
    });

    const result = await classifyPost("ts-test-key", { text: "hello" }, mockFetch);
    expect(result.category).toBe("unknown");
    expect(result.label).toBe("Unknown");
    expect(result.confidence).toBe(0);
  });
});
