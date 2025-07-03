# api.py

import sqlite3
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# --- New Imports for the Summarization Agent ---
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic.v1 import BaseModel, Field, ValidationError # Import ValidationError
from typing import List

# --- Configuration ---
DB_NAME = 'news_data.db'
load_dotenv() # Load environment variables like OPENAI_API_KEY

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes on the app

# --- Database Helper Function ---
def get_db_connection():
    """Creates a database connection that returns dictionary-like rows."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --- Summarization Agent Setup ---

# 1. Define the desired output structure for the summary
class Summary(BaseModel):
    """A structured summary of an entity's sentiment profile."""
    positive_financial: List[str] = Field(description="A list of key positive points related to financial performance.")
    negative_financial: List[str] = Field(description="A list of key negative points related to financial performance.")
    positive_overall: List[str] = Field(description="A list of key positive points related to general operations, products, and decisions.")
    negative_overall: List[str] = Field(description="A list of key negative points related to general operations, products, and decisions.")
    final_summary: str = Field(description="A brief, conclusive summary of the entity's overall position based on the provided reasons.")

# 2. Set up the summarization model and chain
try:
    summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_summary_llm = summary_llm.with_structured_output(Summary)
except Exception as e:
    print(f"Could not initialize summarization LLM: {e}")
    structured_summary_llm = None

summary_prompt_template = ChatPromptTemplate.from_messages([
    ("system", """
You are an expert financial analyst. You will be given a list of reasoning snippets from multiple news articles about a specific company or cryptocurrency. Your task is to synthesize these snippets into a clear, structured summary.

Analyze all the provided reasons and categorize the key points into four lists:
1.  **Positive Financial:** Reasons related to stock growth, good earnings, etc.
2.  **Negative Financial:** Reasons related to stock decline, poor earnings, etc.
3.  **Positive Overall:** Reasons related to successful products, partnerships, good decisions, etc.
4.  **Negative Overall:** Reasons related to failed projects, legal issues, poor decisions, etc.

Finally, provide a brief, one or two-sentence `final_summary` of the entity's overall position based on the balance of the points.

Do not invent new information. Base your summary *only* on the provided reasoning snippets. It is critical that your final JSON object includes all fields, especially `final_summary`.
"""),
    ("human", "Please summarize the following reasoning points for {entity_name}:\n\n{reasoning_list}")
])

summary_chain = summary_prompt_template | structured_summary_llm


# --- API Endpoints ---

@app.route('/')
def home():
    """A simple welcome message for the API root."""
    return jsonify({
        "message": "Welcome to the Financial News Sentiment API.",
        "endpoints": {
            "/api/articles": "Get and filter articles with sentiment data.",
            "/api/entities": "Get a list of all unique entities.",
            "/api/usage_stats": "Get API usage and cost statistics.",
            "/api/summarize_entity": "Get an AI-generated summary for a specific company or crypto.",
            "/api/entity_articles_by_sentiment": "Get articles for an entity, grouped by sentiment categories."
        }
    })

# MODIFIED ENDPOINT: /api/entity_articles_by_sentiment
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
    # MODIFIED: Query now includes the 'reasoning' field
    query = """
        SELECT
            a.title,
            a.url,
            s.reasoning,
            s.financial_sentiment,
            s.overall_sentiment
        FROM sentiments s
        JOIN articles a ON s.article_id = a.id
        WHERE s.entity_name LIKE ? AND s.entity_type = ?
    """
    cursor = conn.execute(query, (f"%{entity_name}%", entity_type))
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return jsonify({"error": f"No articles found for entity '{entity_name}' of type '{entity_type}'"}), 404

    # Structure the data as requested
    response_data = {
        "positive_financial": [],
        "negative_financial": [],
        "neutral_financial": [],
        "positive_overall": [],
        "negative_overall": [],
        "neutral_overall": []
    }

    for row in rows:
        # MODIFIED: article_info now includes the 'reasoning'
        article_info = {"title": row['title'], "url": row['url'], "reasoning": row['reasoning']}
        
        # Categorize by financial sentiment
        if row['financial_sentiment'] == 'positive':
            response_data["positive_financial"].append(article_info)
        elif row['financial_sentiment'] == 'negative':
            response_data["negative_financial"].append(article_info)
        elif row['financial_sentiment'] == 'neutral':
            response_data["neutral_financial"].append(article_info)
            
        # Categorize by overall sentiment
        if row['overall_sentiment'] == 'positive':
            response_data["positive_overall"].append(article_info)
        elif row['overall_sentiment'] == 'negative':
            response_data["negative_overall"].append(article_info)
        elif row['overall_sentiment'] == 'neutral':
            response_data["neutral_overall"].append(article_info)
            
    # Remove duplicates from lists if an article fits multiple criteria for the same sentiment type
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
    if not entity_name:
        return jsonify({"error": "An 'entity_name' query parameter is required."}), 400

    conn = get_db_connection()
    reasonings = conn.execute(
        "SELECT reasoning, financial_sentiment, overall_sentiment FROM sentiments WHERE entity_name LIKE ?", 
        (f"%{entity_name}%",)
    ).fetchall()
    conn.close()

    if not reasonings:
        return jsonify({"error": f"No sentiment data found for entity: {entity_name}"}), 404

    reasoning_list_str = "\n".join([f"- (Financial: {r['financial_sentiment']}, Overall: {r['overall_sentiment']}) {r['reasoning']}" for r in reasonings])
    print(f"Generating summary for entity: {entity_name} with {reasoning_list_str} reasonings.")

    if not structured_summary_llm:
        return jsonify({"error": "Summarization agent is not available."}), 503

    MAX_RETRIES = 3
    for attempt in range(MAX_RETRIES):
        try:
            summary_response = summary_chain.invoke({
                "entity_name": entity_name,
                "reasoning_list": reasoning_list_str
            })
            return jsonify(summary_response.dict())
        
        except ValidationError as e:
            print(f"Validation error on summary attempt {attempt + 1}: {e}")
            if attempt < MAX_RETRIES - 1:
                print("Retrying summarization...")
            else:
                print("Max retries reached for summarization.")
                return jsonify({"error": "Failed to generate a valid summary after multiple attempts.", "details": str(e)}), 500
        
        except Exception as e:
            return jsonify({"error": "An unexpected error occurred during summary generation.", "details": str(e)}), 500
            
    return jsonify({"error": "Failed to generate summary."}), 500


@app.route('/api/articles', methods=['GET'])
def get_articles():
    """The main endpoint for fetching and filtering articles."""
    conn = get_db_connection()
    query = """
        SELECT
            a.id as article_id, a.title, a.url, a.author, a.publication_date, a.cleaned_text,
            s.id as sentiment_id, s.entity_name, s.entity_type, s.financial_sentiment, s.overall_sentiment, s.reasoning
        FROM articles a
        LEFT JOIN sentiments s ON a.id = s.article_id
    """
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
    
    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    articles = {}
    for row in rows:
        article_id = row['article_id']
        if article_id not in articles:
            articles[article_id] = {
                "id": article_id, "title": row['title'], "url": row['url'], "author": row['author'],
                "publication_date": row['publication_date'], "cleaned_text": row['cleaned_text'], "sentiments": []
            }
        if row['sentiment_id']:
            articles[article_id]['sentiments'].append({
                "entity_name": row['entity_name'], "entity_type": row['entity_type'],
                "financial_sentiment": row['financial_sentiment'], "overall_sentiment": row['overall_sentiment'],
                "reasoning": row['reasoning']
            })

    return jsonify(list(articles.values())[:limit])


@app.route('/api/entities', methods=['GET'])
def get_entities():
    """Returns a list of all unique entities (companies and cryptos) found."""
    conn = get_db_connection()
    entities = conn.execute("SELECT DISTINCT entity_name, entity_type FROM sentiments ORDER BY entity_name").fetchall()
    conn.close()
    return jsonify([dict(row) for row in entities])


@app.route('/api/usage_stats', methods=['GET'])
def get_usage_stats():
    """Returns API usage and cost statistics, with an option to summarize."""
    summarize = request.args.get('summarize', 'false').lower() == 'true'
    conn = get_db_connection()
    
    if summarize:
        query = """
            SELECT provider, COUNT(*) as total_calls, SUM(total_tokens) as total_tokens, SUM(total_cost_usd) as total_cost
            FROM usage_logs GROUP BY provider
        """
        stats = conn.execute(query).fetchall()
    else:
        stats = conn.execute("SELECT * FROM usage_logs ORDER BY timestamp DESC").fetchall()
    
    conn.close()
    return jsonify([dict(row) for row in stats])


# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True)
