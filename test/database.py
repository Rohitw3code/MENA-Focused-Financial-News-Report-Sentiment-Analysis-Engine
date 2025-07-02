# database.py

import sqlite3
from datetime import datetime

DB_NAME = 'news_data.db'

def create_database():
    """Initializes the database and creates tables if they don't exist."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Table 1: Links - Stores URLs to be scraped
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        source_website TEXT NOT NULL,
        scraped_date TEXT NOT NULL
    )''')

    # Table 2: Articles - Stores content scraped from each link
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id INTEGER NOT NULL,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        author TEXT,
        publication_date TEXT,
        raw_html TEXT,
        cleaned_text TEXT,
        FOREIGN KEY (link_id) REFERENCES links (id)
    )''')

    # Table 3: Sentiments - Stores company sentiment analysis for each article
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sentiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        company_name TEXT NOT NULL,
        sentiment TEXT NOT NULL,
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
        cursor.execute(
            "INSERT INTO links (url, source_website, scraped_date) VALUES (?, ?, ?)",
            (url, source, scraped_date)
        )
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        # This error occurs if the URL is already in the database (due to UNIQUE constraint)
        # print(f"Link already exists: {url}")
        return None
    finally:
        conn.close()

def add_article(link_id, article_data):
    """Adds a scraped article to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO articles (link_id, url, title, author, publication_date, raw_html, cleaned_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            link_id,
            article_data['url'],
            article_data['title'],
            article_data['author'],
            article_data['publication_date'],
            article_data['raw_html'],
            article_data['full_text']
        ))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        print(f"Article already exists: {article_data['url']}")
        return None
    finally:
        conn.close()

def add_sentiment(article_id, company_name, sentiment):
    """Adds a company sentiment record to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sentiments (article_id, company_name, sentiment) VALUES (?, ?, ?)",
        (article_id, company_name, sentiment)
    )
    conn.commit()
    conn.close()

def get_unscraped_links():
    """Fetches links that have not yet been scraped and stored in the articles table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT l.id, l.url, l.source_website FROM links l
        LEFT JOIN articles a ON l.id = a.link_id
        WHERE a.id IS NULL
    ''')
    links = [{'id': row[0], 'url': row[1], 'source': row[2]} for row in cursor.fetchall()]
    conn.close()
    return links

def get_unanalyzed_articles():
    """Fetches articles that have not yet had their sentiment analyzed."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.id, a.cleaned_text FROM articles a
        LEFT JOIN sentiments s ON a.id = s.article_id
        WHERE s.id IS NULL AND a.cleaned_text IS NOT NULL AND a.cleaned_text != 'N/A'
        GROUP BY a.id
    ''')
    articles = [{'id': row[0], 'text': row[1]} for row in cursor.fetchall()]
    conn.close()
    return articles