import React, { useState, useRef, useEffect } from "react";
import { Loader, useAuthenticator } from "@aws-amplify/ui-react";
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isRecipe?: boolean;
}

const PRESET_CHIPS = [
  { label: "Quick Breakfast", value: "eggs, bread, butter" },
  { label: "Dinner Pasta", value: "pasta, tomato sauce, cheese" },
  { label: "Healthy Salad", value: "lettuce, cucumber, olive oil" },
  { label: "One-Pot Meal", value: "rice, chicken, beans" }
];

const PremiumBullet = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: "auto" }}>
    <circle cx="4" cy="4" r="4" fill="currentColor" opacity="0.6"/>
  </svg>
);

const parseBoldText = (text: string) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} className="highlight">{part}</strong>;
    }
    return part;
  });
};

const RecipeRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  
  return (
    <div className="recipe-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={idx} />;
        
        if (trimmed.startsWith("###")) {
          return <h3 key={idx} className="recipe-h3">{trimmed.replace(/^###\s*/, "")}</h3>;
        }
        if (trimmed.startsWith("##")) {
          return <h2 key={idx} className="recipe-h2">{trimmed.replace(/^##\s*/, "")}</h2>;
        }
        if (trimmed.startsWith("#")) {
          return <h1 key={idx} className="recipe-h1">{trimmed.replace(/^#\s*/, "")}</h1>;
        }
        
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const listText = trimmed.replace(/^[-*]\s*/, "");
          return (
            <ul key={idx} className="recipe-ul">
              <li>{parseBoldText(listText)}</li>
            </ul>
          );
        }
        
        if (/^\d+\.\s/.test(trimmed)) {
          const listText = trimmed.replace(/^\d+\.\s*/, "");
          return (
            <ol key={idx} className="recipe-ol">
              <li>{parseBoldText(listText)}</li>
            </ol>
          );
        }
        
        return <p key={idx} className="recipe-p">{parseBoldText(trimmed)}</p>;
      })}
    </div>
  );
};

function App() {
  const { user, signOut } = useAuthenticator();
  
  const [ingredients, setIngredients] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello Chef. What ingredients are we working with today?",
    }
  ]);
  
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handlePresetClick = (value: string) => {
    setIngredients(value);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetIngredients = ingredients.trim();
    if (!targetIngredients) return;

    const userMessageId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: targetIngredients
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIngredients("");
    setLoading(true);

    try {
      const response = await amplifyClient.queries.askBedrock({
        ingredients: [targetIngredients],
      });

      const data = response?.data;
      const errors = response?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Error: ${errors[0]?.message || "Failed to contact AI"}`
          }
        ]);
        return;
      }

      if (!data || !data.body) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Empty response received.`
          }
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.body,
          isRecipe: true
        }
      ]);

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `System error: ${String(error)}.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const userDisplayName = user?.signInDetails?.loginId || user?.username || "Chef";
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <div className="app-page">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ alignItems: "center", gap: "10px" }}>
          <img src="/logo.png" alt="Papo Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <h1>Papo AI</h1>
        </div>

        <div className="sidebar-section">
          <h2 className="section-title">Chefs</h2>
          <div className="nav-item active">
            <span className="nav-item-icon"><PremiumBullet /></span>
            <span>Head Chef</span>
          </div>
          <div className="nav-item">
            <span className="nav-item-icon"><PremiumBullet /></span>
            <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
              Nutritionist Agent
              <span className="badge-coming-soon">SOON</span>
            </span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-profile">
            <div className="avatar-small">{userInitial}</div>
            <div className="user-details">
              <span className="user-name">{userDisplayName}</span>
              <span className="user-status">
                <span className="status-dot"></span> Online
              </span>
            </div>
          </div>
          <div className="logout-link" onClick={signOut}>Sign out</div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <section className="main-content">
        <header className="top-bar">
          <h2 className="top-bar-title">Head Chef v1.0</h2>
        </header>

        <div className="chat-window" ref={chatWindowRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role === "user" ? "user-message" : "bot-message"} animate-fade-in`}>
              <div className="message-label">
                {msg.role === "user" ? "You" : "Papo AI"}
              </div>
              
              <div className={`bubble ${msg.role === "user" ? "user-bubble" : msg.isRecipe ? "recipe-bubble" : "bot-bubble"}`}>
                {msg.isRecipe ? (
                  <RecipeRenderer text={msg.content} />
                ) : (
                  <div className="message-text">{parseBoldText(msg.content)}</div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message bot-message animate-fade-in">
              <div className="message-label">Papo AI</div>
              <div className="bubble bot-bubble">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <Loader size="small" /> Generating recipe...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div style={{ width: "100%", maxWidth: "800px" }}>
            
            {messages.length === 1 && !loading && (
              <div className="preset-chips animate-fade-in">
                {PRESET_CHIPS.map((chip, idx) => (
                  <button key={idx} className="preset-chip" onClick={() => handlePresetClick(chip.value)}>
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className="chat-input-area">
              <input
                type="text"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Type ingredients (eg- Rice, Paneer, Onion, Corn, Tomatoes)........."
                autoComplete="off"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !ingredients.trim()}>
                Generate
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;