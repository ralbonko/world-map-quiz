import type { PlayerStats } from "../utils/statsEngine";
import {
  getOverallAccuracy,
  getKnowledgeAccuracy,
  getMapAccuracy,
  getCategoryBreakdown,
  getRegionBreakdown,
  getMostMissedCountries,
} from "../utils/statsEngine";

interface StatsPanelProps {
  stats: PlayerStats;
  onReset: () => void;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default function StatsPanel({ stats, onReset }: StatsPanelProps) {
  if (stats.totalQuestions === 0) {
    return (
      <div className="stats-panel">
        <p className="sidebar-placeholder">No stats yet. Play some questions!</p>
      </div>
    );
  }

  const categories = getCategoryBreakdown(stats);
  const regions = getRegionBreakdown(stats);
  const missed = getMostMissedCountries(stats, 5);

  return (
    <div className="stats-panel">
      {/* Overall */}
      <div className="stats-section">
        <h3 className="stats-heading">Overall</h3>
        <div className="stat-row">
          <span className="stat-label">Score</span>
          <span className="stat-value">
            {stats.totalScore % 1 === 0 ? stats.totalScore : stats.totalScore.toFixed(1)} / {stats.totalQuestions}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{pct(getOverallAccuracy(stats))}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Knowledge</span>
          <span className="stat-value">{pct(getKnowledgeAccuracy(stats))}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Map</span>
          <span className="stat-value">{pct(getMapAccuracy(stats))}</span>
        </div>
      </div>

      {/* Streaks */}
      <div className="stats-section">
        <h3 className="stats-heading">Streaks</h3>
        <div className="stat-row">
          <span className="stat-label">Current</span>
          <span className="stat-value">{stats.currentStreak}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Best</span>
          <span className="stat-value">{stats.bestStreak}</span>
        </div>
      </div>

      {/* By Category */}
      {Object.keys(categories).length > 0 && (
        <div className="stats-section">
          <h3 className="stats-heading">By Category</h3>
          {Object.entries(categories)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, data]) => (
              <div key={cat} className="category-row">
                <span className="category-name">{cat}</span>
                <span className="category-count">({data.total})</span>
                <div className="category-bars">
                  <div className="bar-track">
                    <div className="bar-fill bar-knowledge" style={{ width: pct(data.knowledge) }} />
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-map" style={{ width: pct(data.map) }} />
                  </div>
                </div>
                <div className="category-pcts">
                  <span className="bar-label-k">{pct(data.knowledge)}</span>
                  <span className="bar-label-m">{pct(data.map)}</span>
                </div>
              </div>
            ))}
          <div className="bar-legend">
            <span className="bar-legend-item"><span className="legend-swatch swatch-knowledge" /> Knowledge</span>
            <span className="bar-legend-item"><span className="legend-swatch swatch-map" /> Map</span>
          </div>
        </div>
      )}

      {/* By Region */}
      {Object.keys(regions).length > 0 && (
        <div className="stats-section">
          <h3 className="stats-heading">By Region</h3>
          <table className="region-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>K%</th>
                <th>M%</th>
                <th>#</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(regions)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([region, data]) => (
                  <tr key={region}>
                    <td>{region}</td>
                    <td>{pct(data.knowledge)}</td>
                    <td>{pct(data.map)}</td>
                    <td>{data.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Most Missed */}
      {missed.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-heading">Most Missed</h3>
          <ul className="missed-list">
            {missed.map((c) => (
              <li key={c.countryCode} className="missed-item">
                <span className="missed-name">{c.countryName}</span>
                <span className="missed-score">
                  {pct(c.avgScore)} avg ({c.attempts})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="reset-btn" onClick={onReset}>
        Reset Stats
      </button>
    </div>
  );
}
