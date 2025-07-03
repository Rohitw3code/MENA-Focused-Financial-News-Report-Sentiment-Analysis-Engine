# api.py

import sqlite3
import os
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# --- Imports for AI Agents & Pipeline ---
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic.v1 import BaseModel, Field, ValidationError
from typing import List
import pipeline # The new module containing the core logic

# --- Configuration ---
DB_NAME = 'news_data.db'
load_dotenv() # Load environment variables like OPENAI_API_KEY

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Database Helper Function ---
def get_db_connection():
    """Creates a database connection that returns dictionary-like rows."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --- Summarization Agent Setup ---
class Summary(BaseModel):
    """A structured summary of an entity's sentiment profile."""
    positive_financial: List[str] = Field(description="A list of key positive points related to financial performance.")
    negative_financial: List[str] = Field(description="A list of key negative points related to financial performance.")
    neutral_financial: List[str] = Field(description="A list of key neutral points or factual statements related to financial performance.")
    positive_overall: List[str] = Field(description="A list of key positive points related to general operations, products, and decisions.")
    negative_overall: List[str] = Field(description="A list of key negative points related to general operations, products, and decisions.")
    neutral_overall: List[str] = Field(description="A list of key neutral points or factual statements related to general operations.")
    final_summary: str = Field(description="A brief, conclusive summary of the entity's overall position based on the provided reasons.")

try:
    # Initialize the LLM for the summarization agent
    summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_summary_llm = summary_llm.with_structured_output(Summary)
except Exception as e:
    print(f"Warning: Could not initialize summarization LLM. The /summarize_entity endpoint will not work. Error: {e}")
    structured_summary_llm = None

summary_prompt_template = ChatPromptTemplate.from_messages([
    ("system", """
You are an expert financial analyst. You will be given a list of reasoning snippets from multiple news articles about a specific company or cryptocurrency. Your task is to synthesize these snippets into a clear, structured summary.

Analyze all the provided reasons and categorize the key points into six lists:
1.  **Positive Financial:** Reasons related to stock growth, good earnings, etc.
2.  **Negative Financial:** Reasons related to stock decline, poor earnings, etc.
3.  **Neutral Financial:** Factual financial statements without clear positive or negative sentiment.
4.  **Positive Overall:** Reasons related to successful products, partnerships, good decisions, etc.
5.  **Negative Overall:** Reasons related to failed projects, legal issues, poor decisions, etc.
6.  **Neutral Overall:** Factual statements about operations, announcements, or collaborations without clear positive or negative sentiment.

Finally, provide a brief, one or two-sentence `final_summary` of the entity's overall position based on the balance of the points.

Do not invent new information. Base your summary *only* on the provided reasoning snippets. It is critical that your final JSON object includes all fields, especially `final_summary`.
"""),
    ("human", "Please summarize the following reasoning points for {entity_name}:\n\n{reasoning_list}")
])

if structured_summary_llm:
    summary_chain = summary_prompt_template | structured_summary_llm
else:
    summary_chain = None


# --- API Endpoints ---

@app.route('/')
def home():
    """A simple welcome message and guide for the API root."""
    return jsonify({
        "message": "Welcome to the Financial News Sentiment API.",
        "endpoints": {
            "/api/trigger_pipeline": {
                "method": "POST",
                "description": "Starts the scraping and analysis process in the background. Accepts optional JSON body to configure the AI model.",
                "body_example": {"provider": "openai", "model_name": "gpt-4-turbo", "openai_api_key": "sk-..."}
            },
            "/api/articles": {
                "method": "GET",
                "description": "Get and filter articles with sentiment data.",
                "params": ["limit", "entity_name", "entity_type", "financial_sentiment", "overall_sentiment"]
            },
            "/api/entities": {
                "method": "GET",
                "description": "Get a list of all unique entities."
            },
            "/api/usage_stats": {
                "method": "GET",
                "description": "Get API usage and cost statistics.",
                "params": ["summarize=true"]
            },
            "/api/summarize_entity": {
                "method": "GET",
                "description": "Get an AI-generated summary for a specific company or crypto.",
                "params": ["entity_name"]
            },
            "/api/entity_articles_by_sentiment": {
                "method": "GET",
                "description": "Get articles for an entity, grouped by sentiment categories.",
                "params": ["entity_name", "entity_type"]
            }
        }
    })

@app.route('/api/trigger_pipeline', methods=['POST'])
def trigger_pipeline():
    """
    Triggers the full data pipeline to run in the background.
    Accepts an optional JSON body to configure the AI model for the run.
    """
    data = request.get_json(silent=True) or {}
    
    # Extract optional configuration from the request body
    config = {
        "provider": data.get("provider"),
        "model_name": data.get("model_name"),
        "openai_api_key": data.get("openai_api_key"),
        "groq_api_key": data.get("groq_api_key")
    }

    def pipeline_task(app_context, config):
        """The function that will run in a separate thread."""
        with app_context:
            print("--- Background pipeline triggered via API ---")
            pipeline.run_scraping_pipeline()
            pipeline.run_analysis_pipeline(**config)
            print("--- Background pipeline finished ---")

    # Run the pipeline in a background thread to avoid blocking the API
    thread = threading.Thread(target=pipeline_task, args=(app.app_context(), config))
    thread.daemon = True
    thread.start()

    return jsonify({"message": "Pipeline triggered successfully. It will run in the background."}), 202


@app.route('/api/entity_articles_by_sentiment', methods=['GET'])
def get_entity_articles_by_sentiment():
    """
    For a given entity, returns a structured list of its associated articles,
    grouped by both financial and overall sentiment.
    """
    entity_name = request.args.get('entity_name')
    entity_type = request.args.get('entity_type')

    if not entity_name or not entity_type:
        return jsonify({"error": "Both 'entity_name' and 'entity_type' query parameters are required."}), 400

    conn = get_db_connection()
    query = """
        SELECT a.title, a.url, s.reasoning, s.financial_sentiment, s.overall_sentiment
        FROM sentiments s JOIN articles a ON s.article_id = a.id
        WHERE s.entity_name LIKE ? AND s.entity_type = ?
    """
    rows = conn.execute(query, (f"%{entity_name}%", entity_type)).fetchall()
    conn.close()

    if not rows:
        return jsonify({"error": f"No articles found for entity '{entity_name}' of type '{entity_type}'"}), 404

    response_data = {"positive_financial": [], "negative_financial": [], "neutral_financial": [], "positive_overall": [], "negative_overall": [], "neutral_overall": []}
    for row in rows:
        article_info = {"title": row['title'], "url": row['url'], "reasoning": row['reasoning']}
        if row['financial_sentiment'] == 'positive': response_data["positive_financial"].append(article_info)
        elif row['financial_sentiment'] == 'negative': response_data["negative_financial"].append(article_info)
        else: response_data["neutral_financial"].append(article_info)
        if row['overall_sentiment'] == 'positive': response_data["positive_overall"].append(article_info)
        elif row['overall_sentiment'] == 'negative': response_data["negative_overall"].append(article_info)
        else: response_data["neutral_overall"].append(article_info)
            
    for key in response_data:
        response_data[key] = [dict(t) for t in {tuple(d.items()) for d in response_data[key]}]
    return jsonify(response_data)


@app.route('/api/summarize_entity', methods=['GET'])
def summarize_entity():
    """
    Takes an entity name, gathers all its sentiment reasonings from the DB,
    and uses an AI agent to generate a structured summary.
    """
    entity_name = request.args.get('entity_name')
    if not entity_name: return jsonify({"error": "An 'entity_name' query parameter is required."}), 400
    conn = get_db_connection()
    reasonings = conn.execute("SELECT reasoning, financial_sentiment, overall_sentiment FROM sentiments WHERE entity_name LIKE ?", (f"%{entity_name}%",)).fetchall()
    conn.close()
    if not reasonings: return jsonify({"error": f"No sentiment data found for entity: {entity_name}"}), 404
    reasoning_list_str = "\n".join([f"- (Financial: {r['financial_sentiment']}, Overall: {r['overall_sentiment']}) {r['reasoning']}" for r in reasonings])
    if not summary_chain: return jsonify({"error": "Summarization agent is not available."}), 503
    
    MAX_RETRIES = 3
    for attempt in range(MAX_RETRIES):
        try:
            summary_response = summary_chain.invoke({"entity_name": entity_name, "reasoning_list": reasoning_list_str})
            return jsonify(summary_response.dict())
        except ValidationError as e:
            print(f"Validation error on summary attempt {attempt + 1}: {e}")
            if attempt >= MAX_RETRIES - 1: return jsonify({"error": "Failed to generate a valid summary after multiple attempts.", "details": str(e)}), 500
            print("Retrying summarization...")
        except Exception as e:
            return jsonify({"error": "An unexpected error occurred during summary generation.", "details": str(e)}), 500
    return jsonify({"error": "Failed to generate summary."}), 500


@app.route('/api/articles', methods=['GET'])
def get_articles():
    """The main endpoint for fetching and filtering articles."""
    conn = get_db_connection()
    query = "SELECT a.id as article_id, a.title, a.url, a.author, a.publication_date, a.cleaned_text, s.id as sentiment_id, s.entity_name, s.entity_type, s.financial_sentiment, s.overall_sentiment, s.reasoning FROM articles a LEFT JOIN sentiments s ON a.id = s.article_id"
    conditions, params = [], {}
    if request.args.get('entity_name'):
        conditions.append("s.entity_name LIKE :entity_name")
        params['entity_name'] = f"%{request.args.get('entity_name')}%"
    if request.args.get('entity_type'):
        conditions.append("s.entity_type = :entity_type")
        params['entity_type'] = request.args.get('entity_type')
    if request.args.get('financial_sentiment'):
        conditions.append("s.financial_sentiment = :financial_sentiment")
        params['financial_sentiment'] = request.args.get('financial_sentiment')
    if request.args.get('overall_sentiment'):
        conditions.append("s.overall_sentiment = :overall_sentiment")
        params['overall_sentiment'] = request.args.get('overall_sentiment')
    if conditions:
        sub_query = f"SELECT DISTINCT article_id FROM sentiments WHERE {' AND '.join(conditions)}"
        query += f" WHERE a.id IN ({sub_query})"
    query += " ORDER BY a.publication_date DESC"
    limit = request.args.get('limit', 25, type=int)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    articles = {}
    for row in rows:
        article_id = row['article_id']
        if article_id not in articles:
            articles[article_id] = {"id": article_id, "title": row['title'], "url": row['url'], "author": row['author'], "publication_date": row['publication_date'], "cleaned_text": row['cleaned_text'], "sentiments": []}
        if row['sentiment_id']:
            articles[article_id]['sentiments'].append({"entity_name": row['entity_name'], "entity_type": row['entity_type'], "financial_sentiment": row['financial_sentiment'], "overall_sentiment": row['overall_sentiment'], "reasoning": row['reasoning']})
    return jsonify(list(articles.values())[:limit])


@app.route('/api/entities', methods=['GET'])
def get_entities():
    """Returns a list of all unique entities found."""
    conn = get_db_connection()
    entities = conn.execute("SELECT DISTINCT entity_name, entity_type FROM sentiments ORDER BY entity_name").fetchall()
    conn.close()
    return jsonify([dict(row) for row in entities])


@app.route('/api/usage_stats', methods=['GET'])
def get_usage_stats():
    """Returns API usage and cost statistics."""
    summarize = request.args.get('summarize', 'false').lower() == 'true'
    conn = get_db_connection()
    if summarize:
        query = "SELECT provider, COUNT(*) as total_calls, SUM(total_tokens) as total_tokens, SUM(total_cost_usd) as total_cost FROM usage_logs GROUP BY provider"
        stats = conn.execute(query).fetchall()
    else:
        stats = conn.execute("SELECT * FROM usage_logs ORDER BY timestamp DESC").fetchall()
    conn.close()
    return jsonify([dict(row) for row in stats])


# --- Main Execution ---
if __name__ == '__main__':
    # use_reloader=False is recommended when using background threads to avoid running tasks twice on startup.
    app.run(debug=True, use_reloader=False)
