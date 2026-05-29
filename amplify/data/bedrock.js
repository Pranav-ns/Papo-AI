import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const ingredients = ctx.args.ingredients || [];

  const prompt =
    "You are a professional chef. A user has these ingredients: " +
    ingredients.join(", ") +
    ". Suggest a detailed recipe with a name, ingredients list with quantities, and step-by-step cooking instructions. Format the response clearly with sections for Recipe Name, Ingredients, and Instructions.";

  return {
    resourcePath: "/model/amazon.nova-lite-v1:0/invoke",
    method: "POST",
    params: {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          max_new_tokens: 1000,
        },
      }),
    },
  };
}

export function response(ctx) {
  const { statusCode, body } = ctx.result;

  if (statusCode === 200) {
    const parsed = JSON.parse(body);
    return { body: parsed.output.message.content[0].text };
  }

  const parsed = JSON.parse(body);
  const msg = parsed.message || ("Bedrock error: HTTP " + statusCode);
  util.appendError(msg, "BedrockError");
  return { body: msg, error: msg };
}