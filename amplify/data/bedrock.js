import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const ingredients = ctx.args.ingredients || [];

  const prompt =
    "You are a professional chef. A user has these ingredients: " +
    ingredients.join(", ") +
    ". Suggest a detailed recipe with a name, ingredients list with quantities, and step-by-step cooking instructions.";

  return {
    resourcePath: "/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke",
    method: "POST",
    params: {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      }),
    },
  };
}

export function response(ctx) {
  const { statusCode, body } = ctx.result;

  if (statusCode === 200) {
    const parsed = JSON.parse(body);
    return { body: parsed.content[0].text };
  }

  const parsed = JSON.parse(body);
  const msg = parsed.message || ("Bedrock error: HTTP " + statusCode);
  util.appendError(msg, "BedrockError");
  return { body: msg, error: msg };
}