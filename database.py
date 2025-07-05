# database.py

import sqlite3
from datetime import datetime
import pytz
import os
from supabase import create_client, Client
from typing import List, Dict, Any


DB_NAME = 'news_data.db'
url: str = os.environ.get("SUPABASE_URL", "YOUR_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")


# Create the Supabase client
supabase: Client = create_client(url, key)

# --- Table Creation ---
def create_database():
    """Initializes the database and creates all tables if they don't exist."""
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        # Links to be scraped
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL UNIQUE,
            source_website TEXT NOT NULL, scraped_date TEXT NOT NULL
        )''')
        # Scraped article content
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT, link_id INTEGER NOT NULL,
            url TEXT NOT NULL UNIQUE, title TEXT, author TEXT, publication_date TEXT,
            raw_text TEXT, cleaned_text TEXT, is_analyzed INTEGER DEFAULT 0,
            FOREIGN KEY (link_id) REFERENCES links (id)
        );''')
        # Sentiment analysis results
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sentiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, article_id INTEGER NOT NULL,
            entity_name TEXT NOT NULL, entity_type TEXT NOT NULL,
            financial_sentiment TEXT NOT NULL, overall_sentiment TEXT NOT NULL,
            reasoning TEXT, FOREIGN KEY (article_id) REFERENCES articles (id)
        )''')
        # API usage and cost tracking logs
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, article_id INTEGER NOT NULL,
            provider TEXT NOT NULL, total_tokens INTEGER, prompt_tokens INTEGER,
            completion_tokens INTEGER, total_cost_usd REAL, timestamp TEXT NOT NULL,
            FOREIGN KEY (article_id) REFERENCES articles (id)
        )''')
        # Application settings
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY, value TEXT NOT NULL
        )''')
        # Pipeline execution statistics
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, run_timestamp TEXT NOT NULL,
            new_links_found INTEGER, articles_scraped INTEGER,
            entities_analyzed INTEGER, status TEXT
        )''')
        # Set default schedule time if not present
        cursor.execute("INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)", ('schedule_time', '01:00'))
        conn.commit()
    print("Database initialized successfully.")

# --- Config Management ---
def get_config_value(key: str, default=None):
    """Retrieves a configuration value from the app_config table."""
    print(f"Getting config for key='{key}'...")
    try:
        data, count = supabase.table('app_config').select('value').eq('key', key).execute()
        # The result is in data[1], which is a list of dictionaries.
        if data[1]:
            value = data[1][0]['value']
            print(f"Found value: {value}")
            return value
        else:
            print("Key not found, returning default value.")
            return default
    except Exception as e:
        print(f"Error getting config value: {e}")
        return default

def set_config_value(key: str, value: str):
    """
    Sets or updates a configuration value in the app_config table.
    This is equivalent to an "INSERT OR REPLACE" or "UPSERT".
    """
    print(f"Upserting config: key='{key}', value='{value}'")
    try:
        # The upsert method will insert a new row or update an existing one
        # if a row with the same primary key ('key') already exists.
        data, count = supabase.table('app_config').upsert({
            'key': key,
            'value': value
        }).execute()
        
        print("Upsert successful:", data[1])
    except Exception as e:
        print(f"Error upserting config value: {e}")

# --- Data Addition ---
def add_link(url: str, source: str):
    """Adds a new link to the database, ignoring duplicates."""
    print(f"Attempting to add link: {url}")
    # try:
    # Set ignore_duplicates=True to prevent an error if the URL already exists.
    # The database will simply ignore the new record.
    data, count = supabase.table('links').insert({
        'url': url,
        'source_website': source,
        'scraped_date': datetime.utcnow().isoformat()
    }).execute()

    # If data[1] is not empty, the insert was successful.
    if data[1]:
        print("Link added successfully.")
        return data[1][0] # Return the inserted record
    else:
        print("Link is a duplicate and was ignored.")
        return None
            
    # except Exception as e:
    #     print(f"An error occurred while adding the link: {e}")
    #     return None

def add_article(link_id: int, article_data: dict):
    """Adds a scraped article to the database, ignoring duplicates based on URL."""
    print(f"Attempting to add article for link_id: {link_id}")
    try:
        # Prepare the record for insertion.
        record_to_insert = {
            'link_id': link_id,
            'url': article_data.get('url'),
            'title': article_data.get('title'),
            'author': article_data.get('author'),
            'publication_date': article_data.get('publication_date'),
            'raw_text': article_data.get('raw_text'),
            'cleaned_text': article_data.get('cleaned_text')
        }

        # Use ignore_duplicates=True to avoid errors on unique URL constraint.
        data, count = supabase.table('articles').insert(record_to_insert).execute()

        if data[1]:
            print("Article added successfully.")
            return data[1][0] # Return the newly created article record
        else:
            print("Article with this URL already exists and was ignored.")
            return None
    except Exception as e:
        print(f"An error occurred while adding the article: {e}")
        return None
    
def add_sentiment(article_id: int, entity_name: str, entity_type: str, financial_sentiment: str, overall_sentiment: str, reasoning: str):
    """Adds a sentiment record to the database."""
    print(f"Attempting to add sentiment for article_id: {article_id}")
    try:
        record = {
            'article_id': article_id,
            'entity_name': entity_name,
            'entity_type': entity_type,
            'financial_sentiment': financial_sentiment,
            'overall_sentiment': overall_sentiment,
            'reasoning': reasoning
        }
        data, count = supabase.table('sentiments').insert(record).execute()
        
        if data[1]:
            print("Sentiment added successfully.")
            return data[1][0]
        return None
    except Exception as e:
        print(f"An error occurred while adding sentiment: {e}")
        return None
    
def add_usage_log(article_id: int, provider: str, usage_stats: dict):
    """Adds a new usage log entry to the database."""
    print(f"Attempting to log usage for article_id: {article_id}")
    try:
        record = {
            'article_id': article_id,
            'provider': provider,
            'total_tokens': usage_stats.get('total_tokens'),
            'prompt_tokens': usage_stats.get('prompt_tokens'),
            'completion_tokens': usage_stats.get('completion_tokens'),
            'total_cost_usd': usage_stats.get('total_cost_usd'),
            'timestamp': datetime.utcnow().isoformat()
        }
        data, count = supabase.table('usage_logs').insert(record).execute()
        
        if data[1]:
            print("Usage log added successfully.")
            return data[1][0]
        return None
    except Exception as e:
        print(f"An error occurred while adding usage log: {e}")
        return None
    

def add_pipeline_run(stats: dict):
    """Adds a new pipeline run record to the database."""
    print("Attempting to log a pipeline run...")
    try:
        record = {
            'run_timestamp': datetime.utcnow().isoformat(),
            'new_links_found': stats.get('new_links_found', 0),
            'articles_scraped': stats.get('articles_scraped', 0),
            'entities_analyzed': stats.get('entities_analyzed', 0),
            'status': stats.get('status', 'Completed')
        }
        data, count = supabase.table('pipeline_runs').insert(record).execute()
        
        if data[1]:
            print("Pipeline run logged successfully.")
            return data[1][0]
        return None
    except Exception as e:
        print(f"An error occurred while logging the pipeline run: {e}")
        return None
    
    
# --- Data Retrieval ---
def get_unscraped_links() -> List[Dict[str, Any]]:
    """
    Fetches links from the 'links' table that do not have a corresponding
    entry in the 'articles' table.

    This is achieved by performing a LEFT JOIN from 'links' to 'articles'
    and filtering for rows where the 'articles.id' is NULL.
    """
    try:
        print("Fetching unscraped links from Supabase...")
        response = supabase.table('links').select(
            'id, url, source_website'
        ).execute()
        
        all_links = response.data
        
        # Get all link_ids from articles table
        articles_response = supabase.table('articles').select('link_id').execute()
        scraped_link_ids = {article['link_id'] for article in articles_response.data}
        # Filter links that have not been scraped
        unscraped_links = [
            link for link in all_links if link['id'] not in scraped_link_ids
        ]

        print(f"Found {len(unscraped_links)} unscraped links.")
        return unscraped_links
    except Exception as e:
        print(f"An error occurred while fetching unscraped links: {e}")
        return []
    

def get_unanalyzed_articles():
    """
    Fetches articles that have not been analyzed (is_analyzed = 0)
    and have valid cleaned_text.
    """
    response = supabase.table('articles').select('id, cleaned_text').eq('is_analyzed', 0).neq('cleaned_text', None).neq('cleaned_text', 'N/A').execute()
    articles = response.data
    # Rename 'cleaned_text' to 'text' for compatibility with your usage.
    for article in articles:
        article['text'] = article.pop('cleaned_text')
    return articles

def mark_article_as_analyzed(article_id):
    """
    Marks an article as analyzed by setting is_analyzed to 1.
    """
    response = supabase.table('articles').update({'is_analyzed': 1}).eq('id', article_id).execute()
    return response