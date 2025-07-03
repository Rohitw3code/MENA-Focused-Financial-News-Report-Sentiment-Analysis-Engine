# api.py

import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS # Import the CORS extension

# --- Configuration ---
DB_NAME = 'news_data.db'

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes on the app

# --- Database Helper Function ---
def get_db_connection():
    """Creates a database connection that returns dictionary-like rows."""
    conn = sqlite3.connect(DB_NAME)
    # This makes the rows behave like dictionaries, which is great for JSON conversion
    conn.row_factory = sqlite3.Row
    return conn

# --- API Endpoints ---

@app.route('/')
def home():
    """A simple welcome message for the API root."""
    return jsonify({
        "message": "Welcome to the Financial News Sentiment API.",
        "endpoints": {
            "/api/articles": "Get and filter articles with sentiment data.",
            "/api/entities": "Get a list of all unique entities.",
            "/api/usage_stats": "Get API usage and cost statistics."
        }
    })

@app.route('/api/articles', methods=['GET'])
def get_articles():
    """
    The main endpoint for fetching and filtering articles.
    It joins articles with their sentiments and allows for flexible filtering.
    
    Query Parameters:
    - limit (int): Max number of articles to return. Default: 25.
    - entity_name (str): Filter by company/crypto name (case-insensitive).
    - entity_type (str): 'company' or 'crypto'.
    - financial_sentiment (str): 'positive', 'negative', 'neutral'.
    - overall_sentiment (str): 'positive', 'negative', 'neutral'.
    """
    conn = get_db_connection()
    
    # Base query joins articles with sentiments
    query = """
        SELECT
            a.id as article_id,
            a.title,
            a.url,
            a.author,
            a.publication_date,
            a.cleaned_text,
            s.id as sentiment_id,
            s.entity_name,
            s.entity_type,
            s.financial_sentiment,
            s.overall_sentiment,
            s.reasoning
        FROM articles a
        LEFT JOIN sentiments s ON a.id = s.article_id
    """
    
    conditions = []
    params = {}

    # Dynamically build the WHERE clause based on query parameters
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

    # If there are any filters, we need to find the article_ids that match
    if conditions:
        sub_query = f"SELECT DISTINCT article_id FROM sentiments WHERE {' AND '.join(conditions)}"
        query += f" WHERE a.id IN ({sub_query})"

    query += " ORDER BY a.publication_date DESC"
    
    limit = request.args.get('limit', 25, type=int)
    
    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    # Process rows into a structured format (group sentiments by article)
    articles = {}
    for row in rows:
        article_id = row['article_id']
        if article_id not in articles:
            articles[article_id] = {
                "id": article_id,
                "title": row['title'],
                "url": row['url'],
                "author": row['author'],
                "publication_date": row['publication_date'],
                "cleaned_text": row['cleaned_text'],
                "sentiments": []
            }
        if row['sentiment_id']: # Ensure sentiment data exists
            articles[article_id]['sentiments'].append({
                "entity_name": row['entity_name'],
                "entity_type": row['entity_type'],
                "financial_sentiment": row['financial_sentiment'],
                "overall_sentiment": row['overall_sentiment'],
                "reasoning": row['reasoning']
            })

    # Return the limited list of articles
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
            SELECT
                provider,
                COUNT(*) as total_calls,
                SUM(total_tokens) as total_tokens,
                SUM(total_cost_usd) as total_cost
            FROM usage_logs
            GROUP BY provider
        """
        stats = conn.execute(query).fetchall()
    else:
        stats = conn.execute("SELECT * FROM usage_logs ORDER BY timestamp DESC").fetchall()
    
    conn.close()
    return jsonify([dict(row) for row in stats])


# --- Main Execution ---
if __name__ == '__main__':
    # To run this, execute `python api.py` in your terminal.
    # You can then access the endpoints using a tool like Postman, curl, or a custom script.
    app.run(debug=True)
