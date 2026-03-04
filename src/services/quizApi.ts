const API_BASE = 'http://localhost:3001';

export interface QuizQuestion {
  question: string;
  category: string;
  country_name: string;
  country_code: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  reveal_country: boolean;
}

export interface AnswerHistoryEntry {
  country: string;
  category: string;
  knowledgeCorrect: boolean;
  mapCorrect: boolean;
}

export async function generateQuestion(history?: AnswerHistoryEntry[], category?: string): Promise<QuizQuestion> {
  const response = await fetch(`${API_BASE}/api/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, category }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
