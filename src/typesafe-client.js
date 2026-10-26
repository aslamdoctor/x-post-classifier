export const CATEGORY_META = {
  insight_tutorial: {
    label: "Insight",
    description: "Actionable knowledge, technical breakdown, coding tips, or educational guides."
  },
  news_update: {
    label: "News",
    description: "Reporting releases, events, company announcements, or current affairs."
  },
  engagement_bait: {
    label: "Bait",
    description: "Generic questions, controversial hooks, or follower traps designed to drive replies."
  },
  promo_sales: {
    label: "Promo",
    description: "Selling or promoting a product, course, newsletter, waitlist, or paid service."
  },
  meme_humor: {
    label: "Meme",
    description: "Jokes, satire, shitposts, funny observations, or comedic images."
  },
  personal_opinion: {
    label: "Opinion",
    description: "Personal life updates, thoughts, commentary, or unverified reflections."
  }
};

export const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export function buildTypeSafePayload(tweetState = {}) {
  const criteria = {};
  for (const [name, meta] of Object.entries(CATEGORY_META)) {
    criteria[name] = meta.description;
  }

  const author = tweetState.author_handle
    ? `${tweetState.author_name ? tweetState.author_name + " (" + tweetState.author_handle + ")" : tweetState.author_handle}`
    : "Author";
  const stateText = `Post by ${author}:\n${tweetState.text || "(no text content)"}`;

  return {
    model: "jev-latest",
    state: stateText,
    questions: {
      post_type: {
        type: "choice",
        instructions: "What is the primary intent or type of this post?",
        criteria
      }
    }
  };
}

export function parseTypeSafeResponse(responseJson) {
  if (!responseJson || !responseJson.answers || !responseJson.answers.post_type) {
    return {
      category: "unknown",
      label: "Unknown",
      confidence: 0
    };
  }

  const answer = responseJson.answers.post_type;
  const category = typeof answer.choice === "string" ? answer.choice : answer.choice?.top;
  if (!category) {
    return {
      category: "unknown",
      label: "Unknown",
      confidence: 0
    };
  }

  let confidence = 0;
  if (typeof answer.confidence === "number") {
    confidence = answer.confidence;
  } else if (answer.probabilities && typeof answer.probabilities[category] === "number") {
    confidence = answer.probabilities[category];
  }

  const label = CATEGORY_META[category]?.label || category;

  return {
    category,
    label,
    confidence
  };
}

export async function classifyPost(apiKey, tweetState, fetchFn = fetch) {
  if (!apiKey) {
    return {
      category: "unknown",
      label: "Unknown",
      confidence: 0,
      error: "Missing API key"
    };
  }

  const payload = buildTypeSafePayload(tweetState);

  try {
    const response = await fetchFn(TYPESAFE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return {
        category: "unknown",
        label: "Unknown",
        confidence: 0,
        error: `HTTP ${response.status}: ${response.statusText || "Request failed"}`
      };
    }

    const data = await response.json();
    return parseTypeSafeResponse(data);
  } catch (err) {
    return {
      category: "unknown",
      label: "Unknown",
      confidence: 0,
      error: err.message || "Network error"
    };
  }
}
