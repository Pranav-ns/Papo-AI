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
  // Convert JSON string response into object
  const parsedBody = JSON.parse(ctx.result.body);

  // Extract Claude's reply text
  const res = {
    body: parsedBody.content[0].text,
  };

  // Return clean response
  return res;
}