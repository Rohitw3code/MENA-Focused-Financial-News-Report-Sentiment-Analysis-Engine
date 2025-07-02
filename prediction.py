# Import necessary libraries
import requests
from bs4 import BeautifulSoup
import sqlite3
import csv
import re
import time
from transformers import pipeline, logging
from langdetect import detect, LangDetectException

# Suppress verbose logging from the transformers library for a cleaner output
logging.set_verbosity_error()

# --- AI Core: Sentiment Analysis Setup ---
def initialize_sentiment_models():
    """
    Loads and initializes the pre-trained sentiment analysis models from Hugging Face.
    
    Returns:
        tuple: A tuple containing the English and Arabic sentiment analysis pipelines.
    """
    print("Initializing sentiment analysis models... (This may take a moment)")
    try:
        # Model for English financial text
        finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
        
        # Model for Arabic text
        camelbert_pipeline = pipeline("sentiment-analysis", model="CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment")
        
        print("Sentiment models loaded successfully.")
        return finbert_pipeline, camelbert_pipeline
    except Exception as e:
        print(f"Error loading models: {e}")
        print("Please ensure you have a stable internet connection and the 'transformers' and 'torch' libraries are installed.")
        return None, None

def analyze_sentiment(text, finbert, camelbert):
    """
    Analyzes the sentiment of a given text by first detecting its language.
    Handles long text by truncating it for the model.

    Args:
        text (str): The text to analyze.
        finbert: The FinBERT sentiment analysis pipeline for English.
        camelbert: The CAMeL-Lab BERT pipeline for Arabic.

    Returns:
        str: The sentiment label ('positive', 'negative', 'neutral') or 'unknown'.
    """
    if not text or not finbert or not camelbert:
        return 'unknown'
        
    try:
        # 1. Language Detection
        lang = detect(text)
        print(f"   > Detected language: {lang}")

        # 2. Conditional Routing to the appropriate model
        #    FIX: Added truncation=True to handle texts longer than the model's max length (512 tokens).
        if lang == 'en':
            sentiment_result = finbert(text, truncation=True)
        elif lang == 'ar':
            sentiment_result = camelbert(text, truncation=True)
        else:
            print(f"   > Unsupported language '{lang}'. Skipping sentiment analysis.")
            return 'unsupported_language'
        
        label = sentiment_result[0]['label']
        return label.lower()

    except LangDetectException:
        print("   > Could not detect language. Skipping sentiment analysis.")
        return 'lang_detect_error'
    except Exception as e:
        print(f"   > An error occurred during sentiment analysis: {e}")
        return 'analysis_error'

# --- Database and Data Handling ---
def setup_database(db_name="news.db"):
    """
    Sets up the SQLite database and creates/updates the articles table.
    FIX: Ensured the 'sentiment' column is included in the table creation.
    """
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            title TEXT,
            author TEXT,
            publication_date TEXT,
            cleaned_text TEXT,
            sentiment TEXT
        )
        ''')
        print(f"Database '{db_name}' is set up successfully.")
        return conn, cursor
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None, None

def preprocess_text(text):
    """Cleans text for NLP analysis."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\@\w+', '', text)
    text = re.sub(r'[^\w\s\u0600-\u06FF]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def insert_into_db(cursor, conn, article_data):
    """Inserts a single article into the database, ignoring duplicates."""
    sql = ''' INSERT OR IGNORE INTO articles(url, title, author, publication_date, cleaned_text, sentiment)
              VALUES(?,?,?,?,?,?) '''
    try:
        cursor.execute(sql, (
            article_data['url'],
            article_data['title'],
            article_data['author'],
            article_data['publication_date'],
            article_data['cleaned_text'],
            article_data['sentiment']
        ))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database insert error: {e}")

def save_to_csv(data, filename="scraped_articles.csv"):
    """Saves a list of dictionaries to a CSV file."""
    if not data:
        return
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        print(f"\nSuccessfully saved {len(data)} article(s) to '{filename}'")
    # FIX: Added specific error handling for PermissionError.
    except PermissionError:
        print(f"\n[ERROR] Could not write to '{filename}'.")
        print("Please make sure the file is not open in another program (like Excel) and try again.")
    except IOError as e:
        print(f"An unexpected error occurred while writing to CSV file: {e}")

# --- Web Scraping Function ---
def scrape_article_details(url):
    """Scrapes the content of a single news article."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'lxml')
        title = soup.find('h1', class_='article-title').text.strip() if soup.find('h1', class_='article-title') else "N/A"
        date_tag = soup.find('div', class_='article-date')
        date = date_tag.find('span').text.strip() if date_tag and date_tag.find('span') else "N/A"
        author = soup.find('span', class_='author-name-text').text.strip() if soup.find('span', class_='author-name-text') else "N/A"
        body_div = soup.find('div', class_='article-body')
        full_text = '\n'.join([p.text.strip() for p in body_div.find_all('p')]) if body_div else "N/A"
        return {'title': title, 'publication_date': date, 'author': author, 'full_text': full_text, 'url': url}
    except requests.exceptions.RequestException as e:
        print(f"   > Could not fetch article {url}. Error: {e}")
        return None

# --- Main Execution ---
if __name__ == "__main__":
    target_url = "https://www.zawya.com/en/capital-markets/equities/interview-gcc-ipos-are-shielded-from-global-turbulence-but-may-experience-some-delays-jp-morgan-myfdnxuq"

    finbert_model, camelbert_model = initialize_sentiment_models()
    if not finbert_model or not camelbert_model:
        exit()

    conn, cursor = setup_database()
    if not conn:
        exit()

    print(f"\n--- Processing article: {target_url} ---")
    details = scrape_article_details(target_url)
    
    if details:
        cleaned_text = preprocess_text(details['full_text'])
        
        print("\n--- PREPROCESSING STEP ---")
        print("\n[RAW TEXT SNIPPET]:")
        print(details['full_text'][:250] + "...")
        print("\n[CLEANED TEXT SNIPPET]:")
        print(cleaned_text[:250] + "...")
        print("--------------------------")

        sentiment = analyze_sentiment(cleaned_text, finbert_model, camelbert_model)
        print(f"   > Analyzed Sentiment: {sentiment.upper()}")

        processed_article = {
            'url': details['url'],
            'title': details['title'],
            'author': details['author'],
            'publication_date': details['publication_date'],
            'cleaned_text': cleaned_text,
            'sentiment': sentiment
        }
        
        insert_into_db(cursor, conn, processed_article)
        save_to_csv([processed_article])
        
        print("\nAnalysis complete. Article processed and saved.")
    else:
        print("\nFailed to scrape and process the article.")

    conn.close()
