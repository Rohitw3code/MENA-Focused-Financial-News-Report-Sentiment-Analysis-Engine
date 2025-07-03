# database.py

import sqlite3
from datetime import datetime
import pytz # Import pytz for timezone-aware datetimes

DB_NAME = 'news_data.db'

def create_database():
    """Initializes the database and creates all tables if they don't exist."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Table 1: Links to be scraped
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        source_website TEXT NOT NULL,
        scraped_date TEXT NOT NULL
    )''')

    # Table 2: Scraped article content
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id INTEGER NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        author TEXT,
        publication_date TEXT,
        raw_text TEXT,
        cleaned_text TEXT,
        is_analyzed INTEGER DEFAULT 0, -- 0 for False (default), 1 for True
        FOREIGN KEY (link_id) REFERENCES links (id)
    );
    ''')

    # Table 3: Sentiment analysis results for each entity in an article
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sentiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        entity_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        financial_sentiment TEXT NOT NULL,
        overall_sentiment TEXT NOT NULL,
        reasoning TEXT,
        FOREIGN KEY (article_id) REFERENCES articles (id)
    )''')
    
    # Table 4: Logs for API usage and cost tracking
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        total_tokens INTEGER,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_cost_usd REAL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles (id)
    )''')

    # Table 5: Key-value store for application settings
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )''')
    
    # Table 6: Statistics for each execution of the pipeline.
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pipeline_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_timestamp TEXT NOT NULL,
        new_links_found INTEGER,
        articles_scraped INTEGER,
        entities_analyzed INTEGER,
        status TEXT
    )''')
    
    # MODIFIED: Check and set default schedule time if it's not already present
    cursor.execute("SELECT value FROM app_config WHERE key = 'schedule_time'")
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO app_config (key, value) VALUES (?, ?)", ('schedule_time', '01:00'))
        print("Default schedule time ('01:00') set in app_config.")

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def get_config_value(key, default=None):
    """Retrieves a configuration value from the app_config table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_config WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_config_value(key, value):
    """Sets or updates a configuration value in the app_config table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def add_link(url, source):
    """Adds a new link to the database, ignoring duplicates."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        scraped_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("INSERT INTO links (url, source_website, scraped_date) VALUES (?, ?, ?)", (url, source, scraped_date))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def add_article(link_id, article_data):
    """Adds a scraped article to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO articles (link_id, url, title, author, publication_date, raw_text, cleaned_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            link_id,
            article_data['url'],
            article_data['title'],
            article_data['author'],
            article_data['publication_date'],
            article_data['raw_text'],
            article_data['cleaned_text']
        ))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def add_sentiment(article_id, entity_name, entity_type, financial_sentiment, overall_sentiment, reasoning):
    """Adds a dual sentiment record to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sentiments (article_id, entity_name, entity_type, financial_sentiment, overall_sentiment, reasoning) VALUES (?, ?, ?, ?, ?, ?)",
        (article_id, entity_name, entity_type, financial_sentiment, overall_sentiment, reasoning)
    )
    conn.commit()
    conn.close()

def add_usage_log(article_id, provider, usage_stats):
    """Adds a new usage log entry to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO usage_logs (article_id, provider, total_tokens, prompt_tokens, completion_tokens, total_cost_usd, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        article_id,
        provider,
        usage_stats.get('total_tokens'),
        usage_stats.get('prompt_tokens'),
        usage_stats.get('completion_tokens'),
        usage_stats.get('total_cost_usd'),
        timestamp
    ))
    conn.commit()
    conn.close()
    
def add_pipeline_run(stats):
    """Adds a new pipeline run record to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO pipeline_runs (run_timestamp, new_links_found, articles_scraped, entities_analyzed, status) VALUES (?, ?, ?, ?, ?)",
        (
            datetime.now(pytz.utc).strftime('%Y-%m-%d %H:%M:%S'),
            stats.get('new_links_found', 0),
            stats.get('articles_scraped', 0),
            stats.get('entities_analyzed', 0),
            stats.get('status', 'Completed')
        )
    )
    conn.commit()
    conn.close()

def get_unscraped_links():
    """Fetches links that have not yet been scraped and stored in the articles table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT l.id, l.url, l.source_website FROM links l LEFT JOIN articles a ON l.id = a.link_id WHERE a.id IS NULL')
    links = [{'id': row[0], 'url': row[1], 'source': row[2]} for row in cursor.fetchall()]
    conn.close()
    return links

def get_unanalyzed_articles():
    """Fetches articles that have been scraped but not yet analyzed."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT a.id, a.cleaned_text FROM articles a LEFT JOIN sentiments s ON a.id = s.article_id WHERE s.id IS NULL AND a.cleaned_text IS NOT NULL AND a.cleaned_text != "N/A" GROUP BY a.id')
    articles = [{'id': row[0], 'text': row[1]} for row in cursor.fetchall()]
    conn.close()
    return articles

def mark_article_as_analyzed(article_id):
    """Marks a single article as analyzed by setting the flag to 1."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE articles SET is_analyzed = 1 WHERE id = ?", (article_id,))
    conn.commit()
    conn.close()

def get_unanalyzed_articles():
    """
    MODIFIED: Fetches articles where the is_analyzed flag is 0 (False).
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # This query is now simpler and more efficient
    cursor.execute('SELECT id, cleaned_text FROM articles WHERE is_analyzed = 0 AND cleaned_text IS NOT NULL AND cleaned_text != "N/A"')
    articles = [{'id': row[0], 'text': row[1]} for row in cursor.fetchall()]
    conn.close()
    return articles