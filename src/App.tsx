import { useState, useCallback, useEffect, useRef } from "react";
import WorldMap from "./components/WorldMap";
import Sidebar from "./components/Sidebar";
import {
  getAlpha2FromNumeric,
  getNumericFromAlpha2,
} from "./utils/countryCodeMap";
import { generateQuestion, type AnswerHistoryEntry, type QuizQuestion } from "./services/quizApi";
import { countryCenters, countryToContinent, continentCenters } from "./utils/regionData";
import {
  loadStats,
  saveStats,
  clearStats,
  emptyStats,
  getCountryHeatmapData,
  getContinentForCountry,
  type PlayerStats,
  type DetailedAnswer,
} from "./utils/statsEngine";
import "./App.css";

export interface MapAnswer {
  name: string;
  numericCode: string;
  alpha2Code: string | undefined;
}

interface GameState {
  question: QuizQuestion | null;
  knowledgeAnswer: string | null;
  mapAnswer: MapAnswer | null;
  revealed: boolean;
  hintUsed: boolean;
  score: number;
  totalQuestions: number;
  loading: boolean;
  error: string | null;
}

export const CATEGORIES = [
  "all",
  "government",
  "alliances",
  "rivalries",
  "religions",
  "history",
  "capitals",
  "geography",
] as const;

export type Category = (typeof CATEGORIES)[number];

const DEFAULT_CENTER: [number, number] = [-10, 0];
const DEFAULT_ZOOM = 1;

function App() {
  const [started, setStarted] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(loadStats);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");

  const [game, setGame] = useState<GameState>({
    question: null,
    knowledgeAnswer: null,
    mapAnswer: null,
    revealed: false,
    hintUsed: false,
    score: playerStats.totalScore,
    totalQuestions: playerStats.totalQuestions,
    loading: false,
    error: null,
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [showStats, setShowStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Ref so keyboard handler always reads latest game state
  const gameRef = useRef(game);
  gameRef.current = game;
  const categoryRef = useRef(selectedCategory);
  categoryRef.current = selectedCategory;

  // Persist stats to localStorage whenever they change
  useEffect(() => {
    saveStats(playerStats);
  }, [playerStats]);

  const correctNumericCode = game.question
    ? getNumericFromAlpha2(game.question.country_code)
    : undefined;

  const calculatePoints = useCallback(
    (knowledgeAnswer: string, mapAnswer: MapAnswer, hintUsed: boolean) => {
      if (!game.question) return 0;
      const knowledgeCorrect = knowledgeAnswer === game.question.correct_answer;

      if (hintUsed) {
        return knowledgeCorrect ? 0.5 : 0;
      }

      const mapCorrect = mapAnswer.numericCode === correctNumericCode;
      if (knowledgeCorrect && mapCorrect) return 1;
      if (knowledgeCorrect || mapCorrect) return 0.5;
      return 0;
    },
    [game.question, correctNumericCode]
  );

  const reveal = useCallback(
    (knowledgeAnswer: string, mapAnswer: MapAnswer) => {
      setGame((prev) => {
        const points = calculatePoints(knowledgeAnswer, mapAnswer, prev.hintUsed);
        if (prev.question) {
          const kCorrect = knowledgeAnswer === prev.question.correct_answer;
          const mCorrect = mapAnswer.numericCode === correctNumericCode;

          const detailed: DetailedAnswer = {
            countryCode: prev.question.country_code,
            countryName: prev.question.country_name,
            category: prev.question.category,
            continent: getContinentForCountry(prev.question.country_code),
            knowledgeCorrect: kCorrect,
            mapCorrect: mCorrect,
            hintUsed: prev.hintUsed,
            points,
            timestamp: Date.now(),
          };

          setPlayerStats((ps) => {
            const newStreak = points === 1 ? ps.currentStreak + 1 : 0;
            return {
              answers: [...ps.answers, detailed],
              totalScore: ps.totalScore + points,
              totalQuestions: ps.totalQuestions + 1,
              currentStreak: newStreak,
              bestStreak: Math.max(ps.bestStreak, newStreak),
            };
          });

          // Zoom to correct country after reveal
          const cc = prev.question.country_code;
          const center = countryCenters[cc];
          if (center) {
            setTimeout(() => {
              setMapCenter(center);
              setMapZoom(4);
            }, 300);
          }
        }
        return {
          ...prev,
          revealed: true,
          score: prev.score + points,
          totalQuestions: prev.totalQuestions + 1,
        };
      });
    },
    [calculatePoints, correctNumericCode]
  );

  const handleCountryClick = useCallback(
    (name: string, code: string) => {
      if (game.revealed || !game.question || game.mapAnswer) return;

      const mapAnswer: MapAnswer = {
        name,
        numericCode: code,
        alpha2Code: getAlpha2FromNumeric(code),
      };

      setGame((prev) => ({ ...prev, mapAnswer }));

      if (game.knowledgeAnswer) {
        reveal(game.knowledgeAnswer, mapAnswer);
      }
    },
    [game.revealed, game.question, game.mapAnswer, game.knowledgeAnswer, reveal]
  );

  const handleKnowledgeAnswer = useCallback(
    (answer: string) => {
      if (game.revealed || game.knowledgeAnswer) return;

      setGame((prev) => ({ ...prev, knowledgeAnswer: answer }));

      if (game.mapAnswer) {
        reveal(answer, game.mapAnswer);
      }
    },
    [game.revealed, game.knowledgeAnswer, game.mapAnswer, reveal]
  );

  const handleRegionHint = useCallback(() => {
    if (!game.question || game.revealed || game.hintUsed) return;

    const cc = game.question.country_code;
    const continent = countryToContinent[cc];
    if (continent && continentCenters[continent]) {
      const { center, zoom } = continentCenters[continent];
      setMapCenter(center);
      setMapZoom(zoom);
    }

    setGame((prev) => ({ ...prev, hintUsed: true }));
  }, [game.question, game.revealed, game.hintUsed]);

  // Store a ref to handleGenerateQuestion for keyboard handler
  const generateRef = useRef<(() => void) | null>(null);

  const handleGenerateQuestion = useCallback(async () => {
    setShowStats(false);
    setShowHeatmap(false);
    setGame((prev) => ({
      ...prev,
      loading: true,
      error: null,
      question: null,
      knowledgeAnswer: null,
      mapAnswer: null,
      revealed: false,
      hintUsed: false,
    }));
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(DEFAULT_ZOOM);

    // Derive API history from playerStats
    const history: AnswerHistoryEntry[] = playerStats.answers.slice(-10).map((a) => ({
      country: a.countryName,
      category: a.category,
      knowledgeCorrect: a.knowledgeCorrect,
      mapCorrect: a.mapCorrect,
    }));

    const cat = categoryRef.current;
    try {
      const result = await generateQuestion(history, cat !== "all" ? cat : undefined);
      console.log("Quiz question response:", result);
      setGame((prev) => ({ ...prev, question: result, loading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to generate question:", err);
      setGame((prev) => ({ ...prev, error: message, loading: false }));
    }
  }, [playerStats.answers]);

  generateRef.current = handleGenerateQuestion;

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => {
      setMapCenter(pos.coordinates);
      setMapZoom(pos.zoom);
    },
    []
  );

  const handleResetStats = useCallback(() => {
    if (!window.confirm("Reset all stats? This cannot be undone.")) return;
    clearStats();
    const empty = emptyStats();
    setPlayerStats(empty);
    setGame((prev) => ({ ...prev, score: 0, totalQuestions: 0 }));
  }, []);

  // ---- Keyboard shortcuts ----
  // Store refs so the effect doesn't re-run on every game state change
  const knowledgeAnswerRef = useRef(handleKnowledgeAnswer);
  knowledgeAnswerRef.current = handleKnowledgeAnswer;
  const regionHintRef = useRef(handleRegionHint);
  regionHintRef.current = handleRegionHint;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const g = gameRef.current;

      // 1-4 for answer options
      if (["1", "2", "3", "4"].includes(e.key)) {
        if (g.question && !g.revealed && !g.knowledgeAnswer) {
          const idx = parseInt(e.key) - 1;
          if (g.question.options[idx]) {
            e.preventDefault();
            knowledgeAnswerRef.current(g.question.options[idx]);
          }
        }
        return;
      }

      // Enter for next question
      if (e.key === "Enter") {
        if (g.revealed && !g.loading) {
          e.preventDefault();
          generateRef.current?.();
        }
        return;
      }

      // H for region hint
      if (e.key === "h" || e.key === "H") {
        if (g.question && !g.revealed && !g.hintUsed && !g.mapAnswer) {
          e.preventDefault();
          regionHintRef.current();
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const heatmapData = showHeatmap ? getCountryHeatmapData(playerStats) : undefined;

  const wrongNumericCode =
    game.revealed &&
    game.mapAnswer &&
    game.mapAnswer.numericCode !== correctNumericCode
      ? game.mapAnswer.numericCode
      : undefined;

  // ---- Start screen ----
  if (!started) {
    return (
      <div className="start-screen">
        <div className="start-content">
          <h1 className="start-title">World Map Quiz</h1>
          <p className="start-description">
            Test your knowledge of world geopolitics, geography, and history.
            Answer quiz questions and pinpoint countries on an interactive map.
          </p>
          <div className="start-features">
            <div className="feature-item">Answer knowledge questions</div>
            <div className="feature-item">Locate countries on the map</div>
            <div className="feature-item">Track your progress over time</div>
          </div>
          {playerStats.totalQuestions > 0 && (
            <div className="start-resume">
              Returning player &mdash; {playerStats.totalScore % 1 === 0 ? playerStats.totalScore : playerStats.totalScore.toFixed(1)} / {playerStats.totalQuestions} lifetime score
            </div>
          )}
          <button className="start-btn" onClick={() => setStarted(true)}>
            Start Quiz
          </button>
          <div className="start-shortcuts">
            <span><kbd>1</kbd>-<kbd>4</kbd> Answer</span>
            <span><kbd>H</kbd> Hint</span>
            <span><kbd>Enter</kbd> Next</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="map-panel">
        {game.question && !game.revealed && (
          <div className="map-instruction fade-in">
            {game.question.reveal_country ? (
              <>Click on <strong>{game.question.country_name}</strong></>
            ) : (
              "Click on the correct country"
            )}
          </div>
        )}
        <WorldMap
          onCountryClick={handleCountryClick}
          highlightCorrect={game.revealed ? correctNumericCode : undefined}
          highlightWrong={wrongNumericCode || undefined}
          clickedCountry={
            game.mapAnswer && !game.revealed
              ? game.mapAnswer.numericCode
              : undefined
          }
          revealed={game.revealed}
          interactive={!!game.question && !game.revealed && !game.mapAnswer}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          onMoveEnd={handleMoveEnd}
          heatmapData={heatmapData}
        />
        {showHeatmap && (
          <div className="heatmap-legend">
            <span className="legend-stop" style={{ background: "#e74c3c" }}>0%</span>
            <span className="legend-stop" style={{ background: "#f1c40f" }}>50%</span>
            <span className="legend-stop" style={{ background: "#2ecc71" }}>100%</span>
            <span className="legend-stop" style={{ background: "#2a3a4a" }}>N/A</span>
          </div>
        )}
      </div>
      <Sidebar
        question={game.question}
        knowledgeAnswer={game.knowledgeAnswer}
        mapAnswer={game.mapAnswer}
        revealed={game.revealed}
        hintUsed={game.hintUsed}
        score={game.score}
        totalQuestions={game.totalQuestions}
        loading={game.loading}
        error={game.error}
        onKnowledgeAnswer={handleKnowledgeAnswer}
        onGenerateQuestion={handleGenerateQuestion}
        onRegionHint={handleRegionHint}
        showStats={showStats}
        onToggleStats={() => setShowStats((v) => !v)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        playerStats={playerStats}
        onResetStats={handleResetStats}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
    </div>
  );
}

export default App;
