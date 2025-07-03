# database.py

import sqlite3
from datetime import datetime

DB_NAME = 'news_data.db'

def create_database():
    """Initializes the database and creates all tables if they don't exist."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Table 1: Links
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        source_website TEXT NOT NULL,
        scraped_date TEXT NOT NULL
    )''')

    # Table 2: Articles
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id INTEGER NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        author TEXT,
        publication_date TEXT,
        raw_html TEXT,
        raw_text TEXT,
        cleaned_text TEXT,
        FOREIGN KEY (link_id) REFERENCES links (id)
    )''')

    # Table 3: Sentiments
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sentiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        entity_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        reasoning TEXT,
        FOREIGN KEY (article_id) REFERENCES articles (id)
    )''')
    
    # NEW TABLE: Usage Logs
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

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

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
            INSERT INTO articles (link_id, url, title, author, publication_date, raw_html, raw_text, cleaned_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            link_id,
            article_data['url'],
            article_data['title'],
            article_data['author'],
            article_data['publication_date'],
            article_data['raw_html'],
            article_data['raw_text'],
            article_data['cleaned_text']
        ))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def add_sentiment(article_id, entity_name, entity_type, sentiment, reasoning):
    """Adds an entity sentiment record to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sentiments (article_id, entity_name, entity_type, sentiment, reasoning) VALUES (?, ?, ?, ?, ?)",
        (article_id, entity_name, entity_type, sentiment, reasoning)
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

def get_unscraped_links():
    """Fetches links that have not yet been scraped and stored in the articles table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT l.id, l.url, l.source_website FROM links l LEFT JOIN articles a ON l.id = a.link_id WHERE a.id IS NULL')
    links = [{'id': row[0], 'url': row[1], 'source': row[2]} for row in cursor.fetchall()]
    conn.close()
    return links

def get_unanalyzed_articles():
    """Fetches articles that have not yet had their sentiment analyzed."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT a.id, a.cleaned_text FROM articles a LEFT JOIN sentiments s ON a.id = s.article_id WHERE s.id IS NULL AND a.cleaned_text IS NOT NULL AND a.cleaned_text != "N/A" GROUP BY a.id')
    articles = [{'id': row[0], 'text': row[1]} for row in cursor.fetchall()]
    conn.close()
    return articles
