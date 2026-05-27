import React, { useState } from "react";
import { Loader } from "@aws-amplify/ui-react";
import "./App.css";

import { Amplify } from "aws-amplify";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

const amplifyClient = generateClient<Schema>({
  authMode: "userPool",
});

function App() {
  const [result, setResult] = useState<string>("");
  const [ingredients, setIngredients] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ingredients.trim()) {
      setResult("Please enter a few ingredients first.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      console.log("Ingredients sent:", ingredients);

      const response = await amplifyClient.queries.askBedrock({
        ingredients: [ingredients],
      });

      console.log("Full response:", response);

      const data = response?.data;
      const errors = response?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        console.error("Amplify errors:", errors);
        setResult(`Error: ${errors[0]?.message || "Unknown Amplify error"}`);
        return;
      }

      if (!data) {
        setResult("No data returned from the AI. Check your backend/sandbox.");
        return;
      }

      if (!data.body) {
        console.log("Data without body:", data);
        setResult("AI responded, but no recipe text was returned.");
        return;
      }

      setResult(data.body);
    } catch (error) {
      console.error("Caught error:", error);
      setResult(`Something went wrong: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-page">
      <section className="chat-shell">
        <header className="chat-header">
          <div className="brand">
            <div className="brand-icon">🍳</div>

            <div>
              <h1>Papo</h1>
              <p>Your AI recipe buddy</p>
            </div>
          </div>

          <span className="status-pill">AWS Serverless</span>
        </header>

        <section className="chat-window">
          <div className="message bot-message">
            <div className="avatar">🤖</div>

            <div className="bubble">
              <p className="message-label">Papo AI</p>
              <p>
                Hey! Tell me what ingredients you have, and I’ll create a recipe
                for you.
              </p>
            </div>
          </div>

          {ingredients && (
            <div className="message user-message">
              <div className="bubble user-bubble">
                <p className="message-label">You</p>
                <p>{ingredients}</p>
              </div>

              <div className="avatar user-avatar">👨‍🍳</div>
            </div>
          )}

          {loading && (
            <div className="message bot-message">
              <div className="avatar">🤖</div>

              <div className="bubble loading-bubble">
                <p className="message-label">Papo AI</p>

                <div className="loading-row">
                  <Loader size="small" />
                  <span>Cooking up your recipe...</span>
                </div>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="message bot-message">
              <div className="avatar">🍽️</div>

              <div className="bubble recipe-bubble">
                <p className="message-label">Generated recipe</p>
                <p>{result}</p>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={onSubmit} className="chat-input-area">
          <input
            type="text"
            id="ingredients"
            name="ingredients"
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="Example: rice, paneer, tomato, onion..."
          />

          <button type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;