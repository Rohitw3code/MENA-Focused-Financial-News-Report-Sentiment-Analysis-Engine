# Import necessary libraries
import sqlite3
import pandas as pd
import os
import re
from transformers import pipeline, logging
from langdetect import detect, LangDetectException
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# Suppress verbose logging from the transformers library for a cleaner output
logging.set_verbosity_error()

# --- AI Core: Model Initialization ---
def initialize_ai_models():
    """Loads and initializes the pre-trained AI models from Hugging Face."""
    print("Initializing AI models... (This may take a moment for the first download)")
    try:
        finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
        camelbert_pipeline = pipeline("sentiment-analysis", model="CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment")
        ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
        print("All AI models loaded successfully.")
        return finbert_pipeline, camelbert_pipeline, ner_pipeline
    except Exception as e:
        print(f"Error loading models: {e}")
        return None, None, None

# --- AI Core: Prediction Functions ---
def analyze_sentiment(text, finbert, camelbert):
    """Analyzes the sentiment of a given text, returning both label and score."""
    if not text or not finbert or not camelbert:
        return {'label': 'unknown', 'score': 0.0}
    try:
        lang = detect(text)
        if lang == 'en':
            result = finbert(text, truncation=True, max_length=512)
        elif lang == 'ar':
            result = camelbert(text, truncation=True, max_length=512)
        else:
            return {'label': 'unsupported_language', 'score': 0.0}
        return result[0]
    except Exception:
        return {'label': 'analysis_error', 'score': 0.0}

def extract_company_names(text, ner_pipeline):
    """Extracts company/organization names from text using a NER model."""
    if not text or not ner_pipeline:
        return []
    try:
        entities = ner_pipeline(text)
        # Filter for entities labeled 'ORG' and clean up the text
        company_names = {
            entity['word'].replace('##', '').strip() 
            for entity in entities if entity['entity_group'] == 'ORG'
        }
        return sorted(list(company_names))
    except Exception as e:
        print(f"   > Error during company name extraction: {e}")
        return []

# --- Database and Data Handling ---
def setup_database(db_name="news.db"):
    """Sets up the SQLite database with a relational schema for better filtering."""
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        
        # Table for articles with added metadata columns
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            title TEXT,
            author TEXT,
            publication_date DATE,
            detected_language TEXT,
            full_text TEXT
        )
        ''')

        # Table for company-specific predictions, linked to articles
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS company_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER,
            company_name TEXT,
            sentiment_label TEXT,
            sentiment_score REAL,
            FOREIGN KEY (article_id) REFERENCES articles (id)
        )
        ''')
        print(f"Database '{db_name}' is set up with relational tables.")
        return conn, cursor
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None, None

def save_analysis_to_db(cursor, conn, article_details, analysis_results):
    """Saves the article and its associated predictions to the relational database."""
    try:
        # 1. Insert the article and get its ID
        article_sql = ''' INSERT OR IGNORE INTO articles(url, title, author, publication_date, detected_language, full_text)
                          VALUES(?,?,?,?,?,?) '''
        cursor.execute(article_sql, (
            article_details['url'], article_details['title'], article_details['author'],
            article_details['publication_date'], article_details['detected_language'], article_details['full_text']
        ))
        
        cursor.execute("SELECT id FROM articles WHERE url = ?", (article_details['url'],))
        result = cursor.fetchone()
        if not result: return
        article_id = result[0]

        # 2. Insert each company prediction into the separate predictions table
        prediction_sql = ''' INSERT INTO company_predictions(article_id, company_name, sentiment_label, sentiment_score)
                             VALUES(?,?,?,?) '''
        for result in analysis_results:
            cursor.execute(prediction_sql, (
                article_id, result['company'], result['sentiment'], result['score']
            ))
        
        conn.commit()
        print(f"   > Saved analysis for {len(analysis_results)} companies to the database.")
    except sqlite3.IntegrityError:
        print(f"   > Article already exists in the database. Skipping.")
    except Exception as e:
        print(f"   > An error occurred during database insertion: {e}")

# --- Web Scraping and Data Formatting ---
def scrape_article_details(url):
    """Scrapes the content and metadata of a single news article."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'lxml')
        
        title = soup.find('h1', class_='article-title').text.strip() if soup.find('h1', class_='article-title') else "N/A"
        
        date_tag = soup.find('div', class_='article-date')
        date_str = date_tag.find('span').text.strip() if date_tag and date_tag.find('span') else ""
        
        # Format date for better database filtering
        try:
            # Example format: "May 8, 2025"
            parsed_date = datetime.strptime(date_str, '%B %d, %Y')
            formatted_date = parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            formatted_date = None # Handle cases where date is not in the expected format

        author = soup.find('span', class_='author-name-text').text.strip() if soup.find('span', class_='author-name-text') else "N/A"
        body_div = soup.find('div', class_='article-body')
        full_text = '\n'.join([p.text.strip() for p in body_div.find_all('p')]) if body_div else ""
        
        return {'title': title, 'publication_date': formatted_date, 'author': author, 'full_text': full_text, 'url': url}
    except requests.exceptions.RequestException as e:
        print(f"   > Could not fetch article {url}. Error: {e}")
        return None

# --- Reporting ---
def display_prediction_report(article_details, analysis_results):
    """Displays the live prediction results in a structured report format."""
    print("\n" + "="*60)
    print("         LIVE AI-POWERED FINANCIAL ANALYSIS REPORT")
    print("="*60)
    print(f"\n📄 ARTICLE: {article_details['title']} ({article_details['publication_date']})")
    print(f"   URL: {article_details['url']}")
    
    print("\n" + "-"*60)
    print("    COMPANY-SPECIFIC SENTIMENT PREDICTION & METADATA")
    print("-"*60)

    if not analysis_results:
        print("\nNo companies were identified in this article.")
    else:
        for result in analysis_results:
            sentiment = result['sentiment'].upper()
            score = result['score']
            company = result['company']
            
            emoji = "❓"
            if sentiment == 'POSITIVE': emoji = "📈"
            elif sentiment == 'NEGATIVE': emoji = "📉"
            elif sentiment == 'NEUTRAL': emoji = "📊"
            
            print(f"\n🏢 Company: {company}")
            print(f"   {emoji} Predicted Sentiment: {sentiment} (Confidence: {score:.2%})")
            
    print("\n" + "="*60)

# --- Main Execution ---
if __name__ == "__main__":
    target_url = "https://www.zawya.com/en/capital-markets/equities/interview-gcc-ipos-are-shielded-from-global-turbulence-but-may-experience-some-delays-jp-morgan-myfdnxuq"

    finbert, camelbert, ner_model = initialize_ai_models()
    if not finbert or not ner_model:
        exit()

    conn, cursor = setup_database()
    if not conn:
        exit()

    print(f"\n--- Processing Article: {target_url} ---")
    details = scrape_article_details(target_url)
    
    if details:
        article_text = details['full_text']
        
        print("\n--- AI Analysis Step ---")
        try:
            lang = detect(article_text)
            details['detected_language'] = lang
        except LangDetectException:
            lang = 'unknown'
            details['detected_language'] = lang
        print(f"   > Detected language: {lang}")

        companies_found = extract_company_names(article_text, ner_model)
        
        analysis_results = []
        if companies_found:
            print(f"   > Found {len(companies_found)} companies: {', '.join(companies_found)}")
            # FIX: Changed function call from 'predict_sentiment' to 'analyze_sentiment'
            sentiment_result = analyze_sentiment(article_text, finbert, camelbert)
            
            for company in companies_found:
                analysis_results.append({
                    "company": company,
                    "sentiment": sentiment_result.get('label', 'error'),
                    "score": sentiment_result.get('score', 0.0)
                })
        else:
            print("   > No company names found in the article.")

        save_analysis_to_db(cursor, conn, details, analysis_results)
        display_prediction_report(details, analysis_results)
    else:
        print("\nFailed to scrape and process the article.")

    conn.close()
