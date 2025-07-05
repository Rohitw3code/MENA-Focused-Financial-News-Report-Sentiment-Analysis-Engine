# api.py

import sqlite3
import os
import threading
import re
from datetime import datetime
from dotenv import load_dotenv

# --- Flask & Web Server Imports ---
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import pytz

# --- AI & Pipeline Imports ---
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic.v1 import BaseModel, Field, ValidationError
from typing import List

# --- Custom Module Imports ---
import pipeline
import database
from scrapers import scraper_manager
from supabase import create_client, Client

# --- Configuration ---
load_dotenv()
PIPELINE_PASSWORD = os.getenv("PIPELINE_PASSWORD")

# --- Global State for Pipeline Tracking ---
pipeline_status_tracker = {
    "is_running": False,
    "status": "Idle",
    "progress": 0,
    "total": 0,
    "current_task": "N/A",
    "stop_event": None, # NEW: For graceful shutdown
}


# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app)

# --- Database Helper ---
def get_db_connection():
    url: str = os.environ.get("SUPABASE_URL", "YOUR_SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")

    # Create the Supabase client
    supabase: Client = create_client(url, key)
    return supabase

supabase = get_db_connection()


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
    summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_summary_llm = summary_llm.with_structured_output(Summary)
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
    summary_chain = summary_prompt_template | structured_summary_llm
except Exception as e:
    print(f"Warning: Could not initialize summarization LLM. The /summarize_entity endpoint will not work. Error: {e}")
    summary_chain = None


# --- API Endpoints ---

@app.route('/')
def home():
    """A simple welcome message and guide for the API root."""
    return jsonify({
        "message": "Welcome to the Financial News Sentiment API.",
        "endpoints": {
            "/api/scrapers": {
                "method": "GET",
                "description": "NEW: Get a list of all available scraper names.",
            },
            "/api/trigger_pipeline": {
                "method": "POST",
                "description": "MODIFIED: Starts scraping and analysis. Can specify which scrapers to run.",
                "body_example": {"password": "your_password", "provider": "openai", "model_name": "gpt-4-turbo", "scrapers": ["zawya.com", "menabytes.com"]}
            },
            "/api/stop_pipeline": {
                "method": "POST",
                "description": "NEW: Requests the running pipeline to stop gracefully. Requires password.",
                "body_example": {"password": "your_password"}
            },
            "/api/configure_schedule": {
                "method": "POST",
                "description": "Sets the daily UTC time for the automated pipeline run. Requires password.",
                "body_example": {"password": "your_password", "schedule_time": "02:30"}
            },
            "/api/pipeline_status": {
                "method": "GET",
                "description": "Returns the real-time status of the currently running pipeline."
            },
            "/api/pipeline_last_run": {
                "method": "GET",
                "description": "Returns the statistics from the most recently completed pipeline run."
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
            "/api/top_entities": {
                "method": "GET",
                "description": "Get top entities ranked by sentiment count.",
                "params": ["sentiment_type (financial or overall)", "sentiment (positive, negative, neutral)", "order (asc or desc)", "limit"]
            },
            "/api/sentiment_over_time": {
                "method": "GET",
                "description": "Get an entity's sentiment trend over time, formatted for graphing.",
                "params": ["entity_name"]
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
            },
             "/api/usage_stats": {
                "method": "GET",
                "description": "Get API usage and cost statistics.",
                "params": ["summarize=true"]
            }
        }
    })

@app.route('/api/scrapers', methods=['GET'])
def list_scrapers():
    """Lists the names of all available scraper modules."""
    try:
        scraper_names = scraper_manager.get_all_scraper_names()
        return jsonify(scraper_names)
    except Exception as e:
        return jsonify({"error": "Could not retrieve scraper list.", "details": str(e)}), 500

@app.route('/api/stop_pipeline', methods=['POST'])
def stop_pipeline():
    """Requests the currently running pipeline to stop gracefully."""
    if not pipeline_status_tracker["is_running"]:
        return jsonify({"error": "No pipeline is currently running."}), 404

    data = request.get_json(silent=True) or {}
    # Uncomment the following lines to enforce password protection
    # password = data.get("password")
    # if not password or password != PIPELINE_PASSWORD:
    #     return jsonify({"error": "Unauthorized. A valid password is required."}), 401

    stop_event = pipeline_status_tracker.get("stop_event")
    if stop_event and isinstance(stop_event, threading.Event):
        stop_event.set()
        pipeline_status_tracker["status"] = "Stopping..."
        return jsonify({"message": "Pipeline stop signal sent. It will terminate shortly."}), 202
    
    return jsonify({"error": "Could not send stop signal. The pipeline may be in a state that cannot be interrupted."}), 500

@app.route('/api/trigger_pipeline', methods=['POST'])
def trigger_pipeline():
    """
    Triggers the full data pipeline. Now accepts a list of scrapers to run.
    If 'scrapers' is not provided, it will run all available scrapers.
    """
    if pipeline_status_tracker["is_running"]:
        return jsonify({"error": "A pipeline is already running."}), 409

    data = request.get_json(silent=True) or {}
    # Uncomment the following lines to enforce password protection
    # password = data.get("password")
    # if not password or password != PIPELINE_PASSWORD:
    #     return jsonify({"error": "Unauthorized. A valid password is required."}), 401
    
    # --- Scraper Selection ---
    selected_scrapers = data.get("scrapers") # Can be a list of names or None
    try:
        scraper_modules = scraper_manager.get_scraper_modules(selected_scrapers)
        if not scraper_modules:
            return jsonify({"error": "No valid scrapers found for the given selection."}), 400
    except Exception as e:
        return jsonify({"error": "Failed to load scraper modules.", "details": str(e)}), 500

    # --- AI Config ---
    config = {
        "provider": data.get("provider"), "model_name": data.get("model_name"),
        "openai_api_key": data.get("openai_api_key"), "groq_api_key": data.get("groq_api_key")
    }

    def pipeline_task(app_context, scraper_mods, stop_event, llm_config):
        with app_context:
            pipeline_status_tracker["is_running"] = True
            pipeline_status_tracker["stop_event"] = stop_event
            run_status = "Completed"
            # try:
            print("==========pipeline runniniggg========================")
            scraping_stats = pipeline.run_scraping_pipeline(pipeline_status_tracker, scraper_mods, stop_event)
            
            analysis_stats = {}
            if not stop_event.is_set():
                analysis_stats = pipeline.run_analysis_pipeline(pipeline_status_tracker, stop_event, **llm_config)
            
            if stop_event.is_set():
                run_status = "Stopped by user"

            final_stats = {**scraping_stats, **analysis_stats, "status": run_status}
            database.add_pipeline_run(final_stats)

            # except Exception as e:
            #     print(f"Pipeline failed: {e}")
            #     database.add_pipeline_run({"status": f"Failed: {e}"})
            # finally:
            #     # Reset global state
            #     pipeline_status_tracker.update({
            #         "is_running": False, "status": "Idle", "progress": 0, "total": 0,
            #         "current_task": "N/A", "stop_event": None
            #     })

    stop_event = threading.Event()
    thread = threading.Thread(target=pipeline_task, args=(app.app_context(), scraper_modules, stop_event, config))
    thread.daemon = True
    thread.start()

    return jsonify({"message": "Pipeline triggered successfully in the background."}), 202

@app.route('/api/configure_schedule', methods=['POST'])
def configure_schedule():
    """Sets the daily UTC time for the automated pipeline run. Requires a password."""
    data = request.get_json(silent=True) or {}
    # Uncomment the following lines to enforce password protection
    # password = data.get("password")
    # if not password or password != PIPELINE_PASSWORD:
    #     return jsonify({"error": "Unauthorized. A valid password is required."}), 401

    new_time = data.get("schedule_time")
    if not new_time or not re.match(r'^([01]\d|2[0-3]):([0-5]\d)$', new_time):
        return jsonify({"error": "Invalid time format. Please use 'HH:MM'."}), 400

    try:
        hour, minute = map(int, new_time.split(':'))
        database.set_config_value('schedule_time', new_time)
        scheduler.reschedule_job('daily_pipeline_job', trigger='cron', hour=hour, minute=minute, timezone='utc')
        return jsonify({"message": f"Pipeline schedule updated successfully to {new_time} UTC."})
    except Exception as e:
        return jsonify({"error": "Failed to update schedule.", "details": str(e)}), 500

@app.route('/api/pipeline_status', methods=['GET'])
def get_pipeline_status():
    """Returns the real-time status of the currently running pipeline."""
    # Create a copy to avoid returning the non-serializable Event object
    status_copy = pipeline_status_tracker.copy()
    status_copy.pop("stop_event", None)
    return jsonify(status_copy)

@app.route('/api/pipeline_last_run', methods=['GET'])
def get_last_run_stats():
    """Returns the statistics from the most recently completed pipeline run using Supabase."""
    try:
        data, count = supabase.table('pipeline_runs').select('*').order('run_timestamp', desc=True).limit(1).single().execute()
        if data[1]:
            return jsonify(data[1])
        else:
            return jsonify({"message": "No previous pipeline run found."}), 404

    except Exception as e:
        print(f"An error occurred: {e}")
        if "JSON object requested, but row count was 0" in str(e):
             return jsonify({"message": "No previous pipeline run found."}), 404
        return jsonify({"message": "An internal error occurred."}), 500
    
@app.route('/api/top_entities', methods=['GET'])
def get_top_entities():
    """
    Returns a ranked list of entities based on sentiment count,
    filtering by sentiment_type and sentiment,
    ordered and limited as requested.
    """
    sentiment_type = request.args.get('sentiment_type', 'overall')
    sentiment = request.args.get('sentiment', 'positive')
    order = request.args.get('order', 'desc').upper()
    limit = request.args.get('limit', 10, type=int)

    if sentiment_type not in ['financial', 'overall']:
        return jsonify({"error": "Invalid sentiment_type parameter."}), 400
    if sentiment not in ['positive', 'negative', 'neutral']:
        return jsonify({"error": "Invalid sentiment parameter."}), 400
    if order not in ['ASC', 'DESC']:
        return jsonify({"error": "Invalid order parameter."}), 400

    sentiment_column = f"{sentiment_type}_sentiment"

    # Supabase doesn't support dynamic column filters directly, so:
    # We'll fetch all relevant rows with the sentiment filter and aggregate in Python.

    # Query all rows matching sentiment
    response = supabase.table('sentiments') \
        .select('entity_name, entity_type') \
        .eq(sentiment_column, sentiment) \
        .execute()
    rows = response.data or []

    # Count occurrences grouped by (entity_name, entity_type)
    counts = {}
    for row in rows:
        key = (row['entity_name'], row['entity_type'])
        counts[key] = counts.get(key, 0) + 1

    # Convert to list with sentiment_count
    results = [
        {
            'entity_name': k[0],
            'entity_type': k[1],
            'sentiment_count': v
        }
        for k, v in counts.items()
    ]

    # Sort by sentiment_count with requested order
    reverse_order = (order == 'DESC')
    results.sort(key=lambda x: x['sentiment_count'], reverse=reverse_order)

    # Apply limit
    results = results[:limit]

    return jsonify(results)
    

@app.route('/api/sentiment_over_time', methods=['GET'])
def get_sentiment_over_time():
    """For a given entity, returns its sentiment scores over time, formatted for graphing."""

    entity_name = request.args.get('entity_name')
    if not entity_name:
        return jsonify({"error": "An 'entity_name' query parameter is required."}), 400

    response = (
        supabase
        .from_("sentiments")
        .select("*, articles(publication_date)")
        .ilike("entity_name", f"%{entity_name}%")
        .execute()
    )

    def get_score(sentiment):
        return 1 if sentiment == 'positive' else -1 if sentiment == 'negative' else 0


    # if response.error:
    #     return jsonify({"error": response.error.message}), 500

    rows = response.data

    # ✅ Sort in Python:
    rows_sorted = sorted(
        rows, 
        key=lambda r: r["articles"]["publication_date"] if r["articles"] else ""
    )

    # Same as before:
    financial_trend = []
    overall_trend = []
    for row in rows_sorted:
        pub_date = row["articles"]["publication_date"] if row["articles"] else None
        if pub_date:
            financial_trend.append([pub_date, get_score(row["financial_sentiment"])])
            overall_trend.append([pub_date, get_score(row["overall_sentiment"])])

    return jsonify({
        "entity_name": entity_name,
        "financial_sentiment_trend": financial_trend,
        "overall_sentiment_trend": overall_trend
    })


@app.route('/api/dashboard_stats', methods=['GET'])
def get_dashboard_stats():
    """Provides a set of key statistics for a dashboard view using Supabase."""

    # 1️⃣ Count distinct entity_name
    total_entities_resp = (
        supabase
        .from_("sentiments")
        .select("entity_name", count="exact")
        .execute()
    )

    # if total_entities_resp.error:
    #     return jsonify({"error": total_entities_resp.error.message}), 500

    total_entities = len({row['entity_name'] for row in total_entities_resp.data})

    # 2️⃣ Count distinct article_id
    articles_analyzed_resp = (
        supabase
        .from_("sentiments")
        .select("article_id", count="exact")
        .execute()
    )


    articles_analyzed = len({row['article_id'] for row in articles_analyzed_resp.data})

    # 3️⃣ Count total rows
    total_sentiments_resp = (
        supabase
        .from_("sentiments")
        .select("*", count="exact")
        .limit(1)  # Required when using count="exact"
        .execute()
    )

    total_sentiments = total_sentiments_resp.count or 0

    # 4️⃣ Get all financial_sentiment & overall_sentiment
    sentiments_resp = (
        supabase
        .from_("sentiments")
        .select("financial_sentiment, overall_sentiment")
        .execute()
    )

    sentiments = sentiments_resp.data

    distribution = {'positive': 0, 'negative': 0, 'neutral': 0}

    for row in sentiments:
        fs = row['financial_sentiment']
        os = row['overall_sentiment']
        if fs in distribution:
            distribution[fs] += 1
        if os in distribution:
            distribution[os] += 1

    return jsonify({
        "total_entities": total_entities,
        "articles_analyzed": articles_analyzed,
        "total_sentiment_points": total_sentiments,
        "sentiment_distribution": distribution
    })

@app.route('/api/entity_articles_by_sentiment', methods=['GET'])
def get_entity_articles_by_sentiment():
    """For a given entity, returns a structured list of its associated articles, grouped by sentiment."""
    entity_name = request.args.get('entity_name')
    entity_type = request.args.get('entity_type')
    if not entity_name or not entity_type:
        return jsonify({"error": "Both 'entity_name' and 'entity_type' query parameters are required."}), 400

    try:
        data, count = supabase.table('sentiments').select(
            'reasoning, financial_sentiment, overall_sentiment, articles(title, url)'
        ).ilike('entity_name', f'%{entity_name}%').eq('entity_type', entity_type).execute()
        
        rows = data[1]
        if not rows:
            return jsonify({"error": f"No articles found for entity '{entity_name}' of type '{entity_type}'"}), 404

        response_data = {
            "positive_financial": [], "negative_financial": [], "neutral_financial": [],
            "positive_overall": [], "negative_overall": [], "neutral_overall": []
        }
        processed_urls = set()

        for row in rows:
            if not row.get('articles'): continue
            
            article_info = {"title": row['articles']['title'], "url": row['articles']['url'], "reasoning": row['reasoning']}
            
            # Avoid duplicate articles in the same list
            if row['articles']['url'] not in processed_urls:
                if row['financial_sentiment'] == 'positive': response_data["positive_financial"].append(article_info)
                elif row['financial_sentiment'] == 'negative': response_data["negative_financial"].append(article_info)
                else: response_data["neutral_financial"].append(article_info)
                
                if row['overall_sentiment'] == 'positive': response_data["positive_overall"].append(article_info)
                elif row['overall_sentiment'] == 'negative': response_data["negative_overall"].append(article_info)
                else: response_data["neutral_overall"].append(article_info)
                
                processed_urls.add(row['articles']['url'])

        return jsonify(response_data)
    except Exception as e:
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500


@app.route('/api/summarize_entity', methods=['GET'])
def summarize_entity():
    """Takes an entity name and uses an AI agent to generate a structured summary."""
    entity_name = request.args.get('entity_name')
    if not entity_name:
        return jsonify({"error": "An 'entity_name' query parameter is required."}), 400

    try:
        data, count = supabase.table('sentiments').select(
            'reasoning, financial_sentiment, overall_sentiment'
        ).ilike('entity_name', f'%{entity_name}%').execute()

        reasonings = data[1]
        if not reasonings:
            return jsonify({"error": f"No sentiment data found for entity: {entity_name}"}), 404
        
        # The AI agent logic remains the same
        reasoning_list_str = "\n".join([f"- (Financial: {r['financial_sentiment']}, Overall: {r['overall_sentiment']}) {r['reasoning']}" for r in reasonings])
        # if not summary_chain: return jsonify({"error": "Summarization agent is not available."}), 503
        summary_response = summary_chain.invoke({"entity_name": entity_name, "reasoning_list": reasoning_list_str})
        return jsonify(summary_response.dict())
        # return jsonify({"message": "AI summarization logic would run here.", "reasoning_data_collected": len(reasonings)})

    except Exception as e:
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500


@app.route('/api/articles', methods=['GET'])
def get_articles():
    """
    Fetch articles with optional filtering on sentiments fields,
    return articles along with their sentiments nested.
    """
    # Extract filters from query parameters
    entity_name = request.args.get('entity_name')
    entity_type = request.args.get('entity_type')
    financial_sentiment = request.args.get('financial_sentiment')
    overall_sentiment = request.args.get('overall_sentiment')
    limit = request.args.get('limit', 20, type=int)

    # Supabase doesn't support complex SQL JOINs with filtering in one call,
    # so we do two queries:
    # 1) Filter sentiments by conditions, get matching article_ids
    # 2) Fetch articles by these article_ids, then fetch sentiments for those articles
    # Finally, merge results.

    # Build filter conditions for sentiments
    sentiment_filter = supabase.table('sentiments').select('article_id, id, entity_name, entity_type, financial_sentiment, overall_sentiment, reasoning')

    if entity_name:
        sentiment_filter = sentiment_filter.like('entity_name', f'%{entity_name}%')
    if entity_type:
        sentiment_filter = sentiment_filter.eq('entity_type', entity_type)
    if financial_sentiment:
        sentiment_filter = sentiment_filter.eq('financial_sentiment', financial_sentiment)
    if overall_sentiment:
        sentiment_filter = sentiment_filter.eq('overall_sentiment', overall_sentiment)

    sentiment_response = sentiment_filter.execute()
    sentiments = sentiment_response.data or []

    # Collect unique article IDs from filtered sentiments
    article_ids = list({s['article_id'] for s in sentiments})

    # If filtering on sentiments but no matches found, return empty list early
    if (entity_name or entity_type or financial_sentiment or overall_sentiment) and not article_ids:
        return jsonify([])

    # Fetch articles, either all (if no filter) or filtered by article_ids
    articles_query = supabase.table('articles').select('id, title, url, author, publication_date').order('publication_date', desc=True).limit(limit)
    if article_ids:
        articles_query = articles_query.in_('id', article_ids)
    articles_response = articles_query.execute()
    articles = articles_response.data or []

    # Index sentiments by article_id
    sentiments_by_article = {}
    for s in sentiments:
        sentiments_by_article.setdefault(s['article_id'], []).append({
            "entity_name": s['entity_name'],
            "entity_type": s['entity_type'],
            "financial_sentiment": s['financial_sentiment'],
            "overall_sentiment": s['overall_sentiment'],
            "reasoning": s['reasoning']
        })

    # Compose result: articles with nested sentiments
    result = []
    for article in articles:
        result.append({
            "id": article['id'],
            "title": article.get('title'),
            "url": article.get('url'),
            "author": article.get('author'),
            "publication_date": article.get('publication_date'),
            "sentiments": sentiments_by_article.get(article['id'], [])
        })

    return jsonify(result)


@app.route('/api/entities', methods=['GET'])
def get_entities():
    """
    Returns a list of all unique entities (entity_name, entity_type) ordered by entity_name.
    """
    # Supabase does not support DISTINCT in its REST API, so we fetch all and deduplicate in Python.
    response = supabase.table('sentiments').select('entity_name, entity_type').order('entity_name').execute()
    rows = response.data or []

    seen = set()
    unique_entities = []
    for row in rows:
        key = (row['entity_name'], row['entity_type'])
        if key not in seen:
            seen.add(key)
            unique_entities.append(row)

    return jsonify(unique_entities)


@app.route('/api/usage_stats', methods=['GET'])
def get_usage_stats():
    """
    Returns API usage and cost statistics from Supabase.
    If summarize=true, groups by provider and aggregates.
    Else, returns full logs ordered by timestamp DESC.
    """
    summarize = request.args.get('summarize', 'false').lower() == 'true'

    if summarize:
        # Supabase does not support complex aggregation in a single REST query,
        # so we use RPC or do it client-side.
        # Here’s a simple approach assuming no RPC:
        # 1. Fetch all, 2. Aggregate in Python.
        response = supabase.table('usage_logs').select('provider, total_tokens, total_cost_usd').execute()
        rows = response.data

        summary = {}
        for row in rows:
            provider = row['provider']
            if provider not in summary:
                summary[provider] = {
                    'provider': provider,
                    'total_calls': 0,
                    'total_tokens': 0,
                    'total_cost': 0.0
                }
            summary[provider]['total_calls'] += 1
            summary[provider]['total_tokens'] += row.get('total_tokens', 0) or 0
            summary[provider]['total_cost'] += row.get('total_cost_usd', 0.0) or 0.0

        stats = list(summary.values())

    else:
        response = supabase.table('usage_logs').select('*').order('timestamp', desc=True).execute()
        stats = response.data

    return jsonify(stats)


# --- Scheduler Setup ---
def scheduled_pipeline_run():
    """A wrapper for the scheduler to run the pipeline with all available scrapers."""
    with app.app_context():
        if pipeline_status_tracker["is_running"]:
            print("Scheduled run skipped: A pipeline is already in progress.")
            return

        print(f"--- Scheduled pipeline run started at {datetime.now(pytz.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC ---")
        
        stop_event = threading.Event()
        try:
            scraper_modules = scraper_manager.get_scraper_modules() # All scrapers
            if not scraper_modules:
                print("Scheduled run aborted: No scrapers found.")
                return
        except Exception as e:
            print(f"Scheduled run failed during scraper discovery: {e}")
            return

        pipeline_status_tracker["is_running"] = True
        pipeline_status_tracker["stop_event"] = stop_event
        run_status = "Completed"
        try:
            scraping_stats = pipeline.run_scraping_pipeline(pipeline_status_tracker, scraper_modules, stop_event)
            analysis_stats = pipeline.run_analysis_pipeline(pipeline_status_tracker, stop_event) # Default LLM config
            final_stats = {**scraping_stats, **analysis_stats, "status": run_status}
            database.add_pipeline_run(final_stats)
        except Exception as e:
            print(f"Scheduled pipeline failed: {e}")
            database.add_pipeline_run({"status": f"Failed: {e}"})
        finally:
            pipeline_status_tracker.update({
                "is_running": False, "status": "Idle", "progress": 0, "total": 0,
                "current_task": "N/A", "stop_event": None
            })

# --- Main Execution ---
if __name__ == '__main__':
    database.create_database()
    scraper_manager.discover_scrapers() # Pre-discover on startup
    
    scheduler = BackgroundScheduler(daemon=True)
    schedule_time_str = database.get_config_value('schedule_time', '01:00')
    hour, minute = map(int, schedule_time_str.split(':'))
    scheduler.add_job(scheduled_pipeline_run, 'cron', hour=hour, minute=minute, timezone='utc', id='daily_pipeline_job')
    scheduler.start()
    
    print(f"Pipeline scheduler started. Next run scheduled for {schedule_time_str} UTC daily.")
    print(f"Available scrapers found: {scraper_manager.get_all_scraper_names()}")
    
    # --- MODIFICATION FOR NETWORK ACCESS ---
    # The host='0.0.0.0' argument tells Flask to listen on all public IPs,
    # making it accessible from other machines on the network.
    # You will still need to ensure your server's firewall allows connections on the port (default 5000).
    app.run(host='0.0.0.0', debug=True, use_reloader=False)
