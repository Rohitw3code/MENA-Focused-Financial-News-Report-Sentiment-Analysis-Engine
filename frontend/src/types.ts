export interface Article {
  id: number;
  title: string;
  url: string;
  author?: string;
  publication_date?: string;
  cleaned_text?: string;
  sentiments: Sentiment[];
}

export interface Sentiment {
  entity_name: string;
  entity_type: string;
  financial_sentiment: string;
  overall_sentiment: string;
  reasoning?: string;
}

export interface Entity {
  entity_name: string;
  entity_type: string;
}

export interface UsageStat {
  id: number;
  article_id: number;
  provider: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost_usd: number;
  timestamp: string;
}

export interface EntitySummary {
  positive_financial: string[];
  negative_financial: string[];
  positive_overall: string[];
  negative_overall: string[];
  final_summary: string;
}