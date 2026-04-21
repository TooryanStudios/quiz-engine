import { parseAnswerItems } from './parseAnswer'

export function AnswerContent({ answer, className }: { answer: string; className?: string }) {
  const items = parseAnswerItems(answer)
  if (items) {
    return (
      <div className={`sc-answer-list${className ? ` ${className}` : ''}`}>
        {items.map((item, i) => (
          <div key={i} className="sc-answer-item">
            <span className="sc-answer-item-badge">{item.badge}</span>
            <span className="sc-answer-item-text">{item.text}</span>
          </div>
        ))}
      </div>
    )
  }
  return <p className={`sc-answer-text${className ? ` ${className}` : ''}`}>{answer}</p>
}
