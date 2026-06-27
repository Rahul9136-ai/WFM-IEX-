// AI-generated summary card. Content comes from src/lib/insights.js (rule-based
// analysis of the real numbers on the tab).
export default function AISummary({ insight, title = 'AI Summary' }) {
  if (!insight) return null
  const tone = insight.tone ?? 'neutral'
  return (
    <div className={`card ai-summary ai-${tone}`}>
      <div className="ai-head">
        <span className="ai-spark">✦</span>
        <h3>{title}</h3>
        <span className="ai-tag">generated</span>
      </div>
      <p className="ai-headline">{insight.headline}</p>
      <ul className="ai-bullets">
        {insight.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  )
}
