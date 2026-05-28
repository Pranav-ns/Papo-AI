export function request(ctx) {
  // Get ingredients from frontend arguments
  const { ingredients = [] } = ctx.args;

  // Create prompt for Claude AI
  const prompt = `Suggest a recipe idea using these ingredients:
${ingredients.join(", ")}.`;

  // Return API request configuration
  return {
    // Claude 3 Sonnet model endpoint
    resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,

    // HTTP method
    method: "POST",

    params: {
      headers: {
        "Content-Type": "application/json",
      },

      // Request body sent to Claude
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,

        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    },
  };
}

export function response(ctx) {
  // 1. Check for non-200 HTTP response codes from Bedrock
  if (ctx.result.statusCode !== 200) {
    let errorMessage = `HTTP ${ctx.result.statusCode}`;
    try {
      const errorObj = JSON.parse(ctx.result.body);
      errorMessage = errorObj.message || errorObj.error || errorMessage;
    } catch (e) {
      if (ctx.result.body) {
        errorMessage = ctx.result.body;
      }
    }
    return {
      body: `⚠️ **AWS Bedrock Error:** ${errorMessage}\n\n*Please ensure that model access for **Claude 3 Sonnet** is enabled in your Amazon Bedrock console for us-east-1.*`,
      error: errorMessage
    };
  }

  // 2. Parse and safely extract content
  try {
    const parsedBody = JSON.parse(ctx.result.body);

    if (parsedBody && Array.isArray(parsedBody.content) && parsedBody.content[0]?.text) {
      return {
        body: parsedBody.content[0].text
      };
    } else {
      const fallbackMsg = parsedBody.message || "Received empty or unexpected response structure from Bedrock.";
      return {
        body: `⚠️ **AWS Bedrock Structure Error:** ${fallbackMsg}`,
        error: fallbackMsg
      };
    }
  } catch (e) {
    return {
      body: `⚠️ **JSON Parse Error:** Failed to decode response from AI model.`,
      error: e.message
    };
  }
}