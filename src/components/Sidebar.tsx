import type { QuizQuestion } from "../services/quizApi";
import type { PlayerStats } from "../utils/statsEngine";
import type { MapAnswer, Category } from "../App";
import { CATEGORIES } from "../App";
import StatsPanel from "./StatsPanel";

interface SidebarProps {
  question: QuizQuestion | null;
  knowledgeAnswer: string | null;
  mapAnswer: MapAnswer | null;
  revealed: boolean;
  hintUsed: boolean;
  score: number;
  totalQuestions: number;
  loading: boolean;
  error: string | null;
  onKnowledgeAnswer: (answer: string) => void;
  onGenerateQuestion: () => void;
  onRegionHint: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  playerStats: PlayerStats;
  onResetStats: () => void;
  selectedCategory: Category;
  onCategoryChange: (cat: Category) => void;
}

export default function Sidebar({
  question,
  knowledgeAnswer,
  mapAnswer,
  revealed,
  hintUsed,
  score,
  totalQuestions,
  loading,
  error,
  onKnowledgeAnswer,
  onGenerateQuestion,
  onRegionHint,
  showStats,
  onToggleStats,
  showHeatmap,
  onToggleHeatmap,
  playerStats,
  onResetStats,
  selectedCategory,
  onCategoryChange,
}: SidebarProps) {
  const knowledgeCorrect =
    revealed && question && knowledgeAnswer === question.correct_answer;
  const mapCorrect =
    revealed && question && mapAnswer?.alpha2Code === question.country_code;

  const getOptionClass = (opt: string) => {
    const classes = ["option-item"];
    if (!revealed && knowledgeAnswer === opt) classes.push("selected");
    if (revealed) {
      if (opt === question?.correct_answer) classes.push("correct");
      else if (opt === knowledgeAnswer) classes.push("wrong");
    }
    return classes.join(" ");
  };

  // Calculate current question points for score badge
  const currentPoints = (() => {
    if (!revealed || !question) return null;
    const kCorrect = knowledgeAnswer === question.correct_answer;
    if (hintUsed) return kCorrect ? 0.5 : 0;
    const mCorrect = mapAnswer?.alpha2Code === question.country_code;
    if (kCorrect && mCorrect) return 1;
    if (kCorrect || mCorrect) return 0.5;
    return 0;
  })();

  // Last 10 answers for score history dots
  const recentAnswers = playerStats.answers.slice(-10);

  return (
    <aside className="sidebar">
      <h2>Quiz Panel</h2>

      <div className="toggle-row">
        <button
          className={`toggle-btn ${showStats ? "toggle-active" : ""}`}
          onClick={onToggleStats}
        >
          Stats
        </button>
        <button
          className={`toggle-btn ${showHeatmap ? "toggle-active" : ""}`}
          onClick={onToggleHeatmap}
        >
          Heatmap
        </button>
      </div>

      {/* Score display with history dots */}
      {totalQuestions > 0 && !showStats && (
        <div className="score-area fade-in">
          <div className="score-display">
            {score % 1 === 0 ? score : score.toFixed(1)} / {totalQuestions}
          </div>
          {recentAnswers.length > 0 && (
            <div className="score-dots" title="Recent answers">
              {recentAnswers.map((a, i) => (
                <span
                  key={i}
                  className={`score-dot ${
                    a.points === 1
                      ? "dot-perfect"
                      : a.points === 0.5
                      ? "dot-partial"
                      : "dot-wrong"
                  }`}
                  title={`${a.countryName}: ${a.points === 1 ? "Perfect" : a.points === 0.5 ? "Partial" : "Missed"} (${a.points}pt)`}
                />
              ))}
            </div>
          )}
          {playerStats.currentStreak > 1 && (
            <div className="streak-badge">{playerStats.currentStreak} streak</div>
          )}
        </div>
      )}

      {showStats ? (
        <StatsPanel stats={playerStats} onReset={onResetStats} />
      ) : (
        <>
          {/* Category filter */}
          {!question && !loading && (
            <div className="category-filter fade-in">
              <label className="filter-label">Category</label>
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value as Category)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="error-text fade-in">{error}</p>}

          {!question && !loading && (
            <button className="generate-btn" onClick={onGenerateQuestion}>
              Generate Question
            </button>
          )}

          {loading && !question && (
            <div className="loading-state fade-in">
              <div className="loading-spinner" />
              <span className="loading-text">Generating question...</span>
            </div>
          )}

          {question && (
            <div className={`question-card ${revealed ? "card-revealed" : "fade-in"}`}>
              <div className="card-header">
                <span className="category-badge">{question.category}</span>
                {/* Two-part progress indicator */}
                <div className="progress-indicator">
                  <div className={`progress-part ${knowledgeAnswer ? (revealed && knowledgeCorrect ? "part-correct" : revealed && !knowledgeCorrect ? "part-wrong" : "part-done") : "part-waiting"}`}>
                    <span className="part-icon">{revealed ? (knowledgeCorrect ? "\u2713" : "\u2717") : knowledgeAnswer ? "\u2713" : "?"}</span>
                    <span className="part-label">Knowledge</span>
                  </div>
                  <div className="progress-divider" />
                  <div className={`progress-part ${hintUsed ? "part-skipped" : mapAnswer ? (revealed && mapCorrect ? "part-correct" : revealed && !mapCorrect ? "part-wrong" : "part-done") : "part-waiting"}`}>
                    <span className="part-icon">{hintUsed ? "--" : revealed ? (mapCorrect ? "\u2713" : "\u2717") : mapAnswer ? "\u2713" : "?"}</span>
                    <span className="part-label">Map</span>
                  </div>
                </div>
              </div>

              <p className="question-text">{question.question}</p>

              {!revealed && !hintUsed && !mapAnswer && (
                <button className="hint-btn" onClick={onRegionHint}>
                  Region Hint <kbd>H</kbd>
                </button>
              )}

              {!revealed && hintUsed && (
                <p className="hint-used-label">Region hint used &mdash; map points forfeited</p>
              )}

              <ul className="options-list">
                {question.options.map((opt, i) => (
                  <li
                    key={i}
                    className={getOptionClass(opt)}
                    onClick={() => {
                      if (!revealed && !knowledgeAnswer) onKnowledgeAnswer(opt);
                    }}
                  >
                    {!revealed && !knowledgeAnswer && (
                      <kbd className="option-key">{i + 1}</kbd>
                    )}
                    <span className="option-text">{opt}</span>
                    {revealed && opt === question.correct_answer && (
                      <span className="result-icon correct-icon">&#10003;</span>
                    )}
                    {revealed &&
                      opt === knowledgeAnswer &&
                      opt !== question.correct_answer && (
                        <span className="result-icon wrong-icon">&#10007;</span>
                      )}
                  </li>
                ))}
              </ul>

              {revealed && (
                <div className="results-section slide-in">
                  {/* Score badge for this question */}
                  <div className={`round-score ${currentPoints === 1 ? "score-perfect" : currentPoints === 0.5 ? "score-partial" : "score-zero"}`}>
                    {currentPoints === 1 ? "Perfect!" : currentPoints === 0.5 ? "Partial" : "Missed"}
                    <span className="round-pts">+{currentPoints}pt</span>
                  </div>

                  <div className="result-row">
                    <span className="result-label">Knowledge:</span>
                    {knowledgeCorrect ? (
                      <span className="result-icon correct-icon">&#10003;</span>
                    ) : (
                      <span className="result-icon wrong-icon">&#10007;</span>
                    )}
                  </div>
                  <div className="result-row">
                    <span className="result-label">
                      Map: {mapAnswer?.name}
                    </span>
                    {hintUsed ? (
                      <span className="result-icon hint-icon">--</span>
                    ) : mapCorrect ? (
                      <span className="result-icon correct-icon">&#10003;</span>
                    ) : (
                      <span className="result-icon wrong-icon">&#10007;</span>
                    )}
                  </div>
                  <div className="explanation-text">
                    <p>{question.explanation}</p>
                  </div>
                  <button
                    className="generate-btn next-btn"
                    onClick={onGenerateQuestion}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Next Question"}
                    {!loading && <kbd className="btn-kbd">Enter</kbd>}
                  </button>
                </div>
              )}
            </div>
          )}

          {!question && !loading && !error && totalQuestions === 0 && (
            <p className="sidebar-placeholder fade-in">
              Press the button to start the quiz.
            </p>
          )}
        </>
      )}
    </aside>
  );
}
