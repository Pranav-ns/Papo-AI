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

// Preset chips to help users try recipes instantly
const PRESET_CHIPS = [
  { label: "🍳 Quick Egg Breakfast", value: "eggs, bread, avocado, butter" },
  { label: "🍝 Creamy Pasta", value: "pasta, garlic, chicken breast, cream, parmesan" },
  { label: "🥗 Healthy Salad", value: "cucumber, cherry tomatoes, olive oil, lemon, feta cheese" },
  { label: "🥞 Fluffy Pancakes", value: "flour, milk, egg, maple syrup, butter" }
];

// Helper to render bold **text** inside paragraphs and lists
const parseBoldText = (text: string) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} className="highlight">{part}</strong>;
    }
    return part;
  });
};

// Custom lightweight Recipe Markdown-to-HTML parser component
const RecipeRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  
  return (
    <div className="recipe-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="recipe-spacer" />;
        
        // Title headers
        if (trimmed.startsWith("###")) {
          return <h3 key={idx} className="recipe-h3">{trimmed.replace(/^###\s*/, "")}</h3>;
        }
        if (trimmed.startsWith("##")) {
          return <h2 key={idx} className="recipe-h2">{trimmed.replace(/^##\s*/, "")}</h2>;
        }
        if (trimmed.startsWith("#")) {
          return <h1 key={idx} className="recipe-h1">{trimmed.replace(/^#\s*/, "")}</h1>;
        }
        
        // Bulleted lists
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const listText = trimmed.replace(/^[-*]\s*/, "");
          return (
            <ul key={idx} className="recipe-ul">
              <li>{parseBoldText(listText)}</li>
            </ul>
          );
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const listText = trimmed.replace(/^\d+\.\s*/, "");
          return (
            <ol key={idx} className="recipe-ol">
              <li>{parseBoldText(listText)}</li>
            </ol>
          );
        }
        
        // Default paragraph
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
      content: `Hey! I am **Papo AI**, your personal chef. Tell me what ingredients you have in your kitchen, and I will instantly formulate a delicious recipe for you!`,
    }
  ]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom when messages change or loading state toggles
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetClick = (value: string) => {
    setIngredients(value);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetIngredients = ingredients.trim();
    if (!targetIngredients) return;

    // 1. Add User Message to History
    const userMessageId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: targetIngredients
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIngredients(""); // Clear input right away
    setLoading(true);

    try {
      console.log("Generating recipe for:", targetIngredients);

      // 2. Fetch Recipe from Bedrock
      const response = await amplifyClient.queries.askBedrock({
        ingredients: [targetIngredients],
      });

      console.log("Amplify Response:", response);

      const data = response?.data;
      const errors = response?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        console.error("Amplify errors:", errors);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `⚠️ **Error:** ${errors[0]?.message || "Failed to contact bedrock AI"}`
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
            content: `⚠️ **Oops!** The AI generated an empty response. Please try again with different ingredients.`
          }
        ]);
        return;
      }

      // 3. Add AI Recipe Response
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
      console.error("Caught error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ **Something went wrong:** ${String(error)}. Please check your AWS setup or network connection.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const userDisplayName = user?.signInDetails?.loginId || user?.username || "Chef";

  return (
    <main className="app-page">
      <section className="chat-shell animate-fade-in">
        {/* Sleek Glass Header */}
        <header className="chat-header">
          <div className="brand">
            <div className="brand-icon">🍳</div>
            <div>
              <h1>Papo</h1>
              <p>Your AI recipe buddy</p>
            </div>
          </div>

          <div className="header-actions">
            <span className="status-pill">
              <span className="status-dot"></span>
              Bedrock AI Active
            </span>
            
            {/* User Profile Droplist */}
            <div className="profile-container" ref={profileMenuRef}>
              <button 
                className={`profile-trigger ${showProfileMenu ? "active" : ""}`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="View Profile"
              >
                <div className="profile-avatar">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown animate-slide-up">
                  <div className="dropdown-user-info">
                    <p className="dropdown-username">{userDisplayName}</p>
                    <p className="dropdown-role">Member Chef</p>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="logout-btn" onClick={signOut}>
                    <span className="logout-icon">🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Chat Window */}
        <section className="chat-window" ref={chatWindowRef}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
            >
              {msg.role === "assistant" && (
                <div className="avatar bot-avatar">
                  {msg.isRecipe ? "🍽️" : "🤖"}
                </div>
              )}

              <div className={`bubble ${msg.role === "user" ? "user-bubble" : msg.isRecipe ? "recipe-bubble" : "bot-bubble"}`}>
                <p className="message-label">
                  {msg.role === "user" ? "You" : msg.isRecipe ? "Papo Custom Recipe" : "Papo AI"}
                </p>
                {msg.isRecipe ? (
                  <RecipeRenderer text={msg.content} />
                ) : (
                  <p className="message-text">{parseBoldText(msg.content)}</p>
                )}
              </div>

              {msg.role === "user" && (
                <div className="avatar user-avatar">👨‍🍳</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message bot-message">
              <div className="avatar bot-avatar">🤖</div>
              <div className="bubble loading-bubble">
                <p className="message-label">Papo AI</p>
                <div className="loading-row">
                  <Loader size="small" />
                  <span>Cooking up your custom recipe...</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Interaction Presets Bar */}
        {messages.length === 1 && !loading && (
          <div className="presets-bar animate-fade-in">
            <p className="presets-title">Tap quick ideas to try:</p>
            <div className="preset-chips">
              {PRESET_CHIPS.map((chip, idx) => (
                <button 
                  key={idx} 
                  className="preset-chip"
                  onClick={() => handlePresetClick(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Inputs */}
        <form onSubmit={onSubmit} className="chat-input-area">
          <input
            type="text"
            id="ingredients"
            name="ingredients"
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="Type ingredients... (e.g. spinach, salmon, cream)"
            autoComplete="off"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !ingredients.trim()}>
            {loading ? "Cooking..." : "Generate"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;