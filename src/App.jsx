import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabaseClient";
import "./App.css";

const EMOJIS = ["🍒", "🍋", "🍇", "🍉", "🥝", "🍑", "🍓", "🍍"];
const FLIP_DELAY_MS = 700;
const MATCH_DELAY_MS = 350;

const shuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildDeck = () => {
  const pairs = EMOJIS.flatMap((emoji) => [
    { id: crypto.randomUUID(), emoji },
    { id: crypto.randomUUID(), emoji }
  ]);
  return shuffle(pairs);
};

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function App() {
  const [cards, setCards] = useState(() => buildDeck());
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [timeMs, setTimeMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [lockBoard, setLockBoard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState("");

  const score = useMemo(() => Math.max(0, 1000 - attempts * 25), [attempts]);
  const allMatched = matchedIds.length === cards.length && cards.length > 0;

  useEffect(() => {
    if (!timerRunning) return undefined;
    const intervalId = setInterval(() => {
      setTimeMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!supabaseConfigured || !supabase) {
        setLeaderboardLoading(false);
        setLeaderboardError("Supabase not configured. Check .env and restart.");
        return;
      }

      setLeaderboardLoading(true);
      setLeaderboardError("");
      const { data, error } = await supabase
        .from("leaderboard")
        .select("id, player_name, attempts, time_ms, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) {
        setLeaderboardError("Failed to load leaderboard.");
      } else {
        setLeaderboard(data ?? []);
      }
      setLeaderboardLoading(false);
    };

    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (flippedIds.length !== 2) return;

    const [firstId, secondId] = flippedIds;
    const firstCard = cards.find((card) => card.id === firstId);
    const secondCard = cards.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) return;

    setAttempts((prev) => prev + 1);
    if (firstCard.emoji === secondCard.emoji) {
      setMatchedIds((prev) => [...prev, firstId, secondId]);
      setTimeout(() => {
        setFlippedIds([]);
        setLockBoard(false);
      }, MATCH_DELAY_MS);
    } else {
      setTimeout(() => {
        setFlippedIds([]);
        setLockBoard(false);
      }, FLIP_DELAY_MS);
    }
  }, [flippedIds, cards]);

  useEffect(() => {
    if (allMatched) {
      setTimerRunning(false);
    }
  }, [allMatched]);

  const handleFlip = (cardId) => {
    if (lockBoard) return;
    if (flippedIds.includes(cardId) || matchedIds.includes(cardId)) return;

    if (!timerRunning) setTimerRunning(true);
    setFlippedIds((prev) => {
      if (prev.length === 1) setLockBoard(true);
      return [...prev, cardId].slice(0, 2);
    });
  };

  const handleRestart = () => {
    setCards(buildDeck());
    setFlippedIds([]);
    setMatchedIds([]);
    setAttempts(0);
    setTimeMs(0);
    setTimerRunning(false);
    setLockBoard(false);
    setHasSubmitted(false);
    setSaveError("");
    setPlayerName("");
  };

  const handleSaveScore = async () => {
    if (savingScore || hasSubmitted) return;
    if (!supabaseConfigured || !supabase) {
      setSaveError("Supabase not configured. Check .env and restart.");
      return;
    }
    setSavingScore(true);
    setSaveError("");

    const trimmedName = playerName.trim();

    const payload = {
      player_name: trimmedName.length > 0 ? trimmedName : "Anonymous",
      attempts,
      time_ms: timeMs,
      score
    };

    const { error } = await supabase.from("leaderboard").insert(payload);
    if (error) {
      setSaveError("Failed to save score. Try again.");
    } else {
      setHasSubmitted(true);
      const { data } = await supabase
        .from("leaderboard")
        .select("id, player_name, attempts, time_ms, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10);
      setLeaderboard(data ?? []);
    }

    setSavingScore(false);
  };

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Memory Challenge</p>
        <h1>Card Flip Game</h1>
        <p className="subtitle">
          4x4 easy mode. Match all pairs with the fewest attempts.
        </p>
        <div className="stats">
          <div>
            <span className="label">Time</span>
            <strong>{formatTime(timeMs)}</strong>
          </div>
          <div>
            <span className="label">Attempts</span>
            <strong>{attempts}</strong>
          </div>
          <div>
            <span className="label">Score</span>
            <strong>{score}</strong>
          </div>
          <button className="cta" onClick={handleRestart} type="button">
            Restart
          </button>
        </div>
      </header>

      {!supabaseConfigured && (
        <section className="notice">
          <strong>Supabase is not connected.</strong>
          <p>
            Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`,
            then restart the dev server.
          </p>
        </section>
      )}

      <section className="board" aria-live="polite">
        {cards.map((card) => {
          const isFlipped =
            flippedIds.includes(card.id) || matchedIds.includes(card.id);
          return (
            <button
              key={card.id}
              className={`card ${isFlipped ? "is-flipped" : ""}`}
              onClick={() => handleFlip(card.id)}
              type="button"
              aria-label="Flip card"
              disabled={lockBoard || matchedIds.includes(card.id)}
            >
              <span className="card-inner">
                <span className="card-face card-front">?</span>
                <span className="card-face card-back">{card.emoji}</span>
              </span>
            </button>
          );
        })}
      </section>

      {allMatched && (
        <section className="result">
          <h2>Great job!</h2>
          <p>
            You cleared the board in {attempts} attempts. Final score: {score}.
          </p>
          <div className="result-actions">
            <label className="name-field">
              <span className="label">Name</span>
              <input
                className="name-input"
                type="text"
                placeholder="Anonymous"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={20}
                disabled={hasSubmitted}
              />
            </label>
            <button
              className="cta secondary"
              onClick={handleSaveScore}
              type="button"
              disabled={savingScore || hasSubmitted}
            >
              {hasSubmitted ? "Saved" : savingScore ? "Saving..." : "Save score"}
            </button>
            {saveError && <span className="inline-error">{saveError}</span>}
          </div>
        </section>
      )}

      <section className="leaderboard">
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <span className="leaderboard-note">Top 10 scores</span>
        </div>
        {leaderboardLoading && <p>Loading leaderboard...</p>}
        {leaderboardError && <p className="inline-error">{leaderboardError}</p>}
        {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
          <p>No scores yet. Be the first!</p>
        )}
        {!leaderboardLoading && leaderboard.length > 0 && (
          <ol className="leaderboard-list">
            {leaderboard.map((entry) => (
              <li key={entry.id} className="leaderboard-item">
                <div className="leaderboard-main">
                  <span className="player">{entry.player_name}</span>
                  <span className="meta">
                    Attempts: {entry.attempts} · Time: {formatTime(entry.time_ms)}
                  </span>
                </div>
                <span className="score">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
