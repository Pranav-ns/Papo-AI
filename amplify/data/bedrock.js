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
  // 1. AWS BEDROCK RESILIENT FALLBACK LOGIC
  // If Bedrock returns a non-200 status code (e.g. 403 Access Denied for Claude model),
  // instead of failing, we generate a beautiful simulated gourmet recipe matching the inputs!
  if (ctx.result.statusCode !== 200) {
    const { ingredients = [] } = ctx.args;
    const ingredientList = ingredients.join(", ");
    
    // Capitalize helper
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const mainIngredient = ingredients[0] ? capitalize(ingredients[0]) : "Gourmet Ingredients";
    
    let recipeTitle = `Rustic ${mainIngredient} Skillet`;
    if (ingredients.length >= 2) {
      recipeTitle = `Pan-Seared ${capitalize(ingredients[0])} with ${capitalize(ingredients[1])}`;
    }

    const mockBody = `⚠️ **AWS Bedrock model access is disabled or pending approval, but Papo AI has generated a local recipe for you!**

### ${recipeTitle}

A delightful home-cooked recipe prepared using professional skillet-cooking techniques.

**Prep Time:** 10 mins | **Cook Time:** 15 mins | **Servings:** 2

**Ingredients Needed:**
- **${ingredients.map(capitalize).join("**\n- **")}**
- 2 tbsp Extra Virgin Olive Oil
- 1 clove Garlic (minced)
- Salt and freshly cracked black pepper (to taste)
- A pinch of dried oregano or fresh herbs

**Preparation Steps:**
1. **Prep the main ingredients**: Wash, peel, and chop your **${ingredientList}** into bite-sized pieces.
2. **Infuse the Oil**: Heat 2 tablespoons of olive oil in a skillet over medium heat. Add the minced garlic and sauté for 1 minute until fragrant.
3. **Sear & Cook**: Carefully add the prepared **${ingredientList}** to the skillet. Cook for 8-10 minutes, tossing occasionally, until beautifully caramelized and tender.
4. **Season**: Sprinkle with salt, cracked black pepper, and your choice of dried oregano or fresh herbs to elevate the flavor profile.
5. **Plating**: Transfer to a plate, drizzle with a touch of fresh olive oil or lemon juice, and serve hot!

*To activate live Claude 3 AI generation: log into your AWS Console -> search Bedrock -> Model Access -> Request access to 'Claude 3 Sonnet' in us-east-1.*`;

    return {
      body: mockBody,
      error: `Bedrock failed with status ${ctx.result.statusCode}`
    };
  }

  // 2. Normal Successful Claude response parsing
  try {
    const parsedBody = JSON.parse(ctx.result.body);

    if (parsedBody && Array.isArray(parsedBody.content) && parsedBody.content[0]?.text) {
      return {
        body: parsedBody.content[0].text
      };
    } else {
      const fallbackMsg = parsedBody.message || "Received empty response from Bedrock.";
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