# Import necessary libraries
import sqlite3
import pandas as pd
import os
import re
from transformers import pipeline, logging
from langdetect import detect, LangDetectException

# Suppress verbose logging from the transformers library for a cleaner output
logging.set_verbosity_error()

# --- AI Core: Model Initialization ---
def initialize_ai_models():
    """
    Loads and initializes the pre-trained AI models from Hugging Face.
    
    Returns:
        tuple: A tuple containing the FinBERT, CAMeL-BERT, and NER pipelines.
    """
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
def predict_sentiment(text, finbert, camelbert):
    """
    Analyzes the sentiment of a given text by first detecting its language.
    """
    if not text or not finbert or not camelbert:
        return 'unknown'
    try:
        lang = detect(text)
        if lang == 'en':
            result = finbert(text, truncation=True)
        elif lang == 'ar':
            result = camelbert(text, truncation=True)
        else:
            return 'unsupported_language'
        return result[0]['label'].lower()
    except Exception:
        return 'analysis_error'

def extract_company_names(text, ner_pipeline):
    """
    Extracts company/organization names from text using a NER model.
    """
    if not text or not ner_pipeline:
        return ""
    try:
        entities = ner_pipeline(text)
        company_names = {entity['word'].replace('##', '').strip() for entity in entities if entity['entity_group'] == 'ORG'}
        return ", ".join(sorted(list(company_names)))
    except Exception as e:
        print(f"   > Error during company name extraction: {e}")
        return ""

# --- Database Fetching ---
def fetch_latest_article(db_name="news.db"):
    """
    Connects to the SQLite database and fetches the most recently added article.
    """
    if not os.path.exists(db_name):
        print(f"[ERROR] The database file '{db_name}' was not found.")
        print("Please run the main scraper script first to create and populate the database.")
        return None
    try:
        conn = sqlite3.connect(db_name)
        print(f"Successfully connected to '{db_name}'.")
        query = "SELECT * FROM articles ORDER BY id DESC LIMIT 1"
        df = pd.read_sql_query(query, conn)
        if df.empty:
            print("The 'articles' table is empty. No data to fetch.")
            return None
        print("Latest article fetched successfully.")
        return df.iloc[0]
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print(f"Database connection to '{db_name}' closed.")

def display_prediction_report(article_data, predicted_sentiment, extracted_companies):
    """
    Displays the live prediction results in a structured report format.
    """
    print("\n" + "="*50)
    print("      LIVE AI-POWERED ANALYSIS REPORT")
    print("="*50)
    
    print(f"\n📄 ARTICLE: {article_data['title']}")
    print(f"   URL: {article_data['url']}")
    
    print("\n" + "-"*50)
    print("         PREDICTION & EXTRACTION RESULTS")
    print("-"*50)

    # Display Sentiment Prediction
    sentiment = predicted_sentiment.upper()
    sentiment_emoji = "❓"
    if sentiment == 'POSITIVE':
        sentiment_emoji = "📈"
    elif sentiment == 'NEGATIVE':
        sentiment_emoji = "📉"
    elif sentiment == 'NEUTRAL':
        sentiment_emoji = "📊"
        
    print(f"\n{sentiment_emoji} Predicted Sentiment: {sentiment}")

    # Display Extracted Company Names
    if not extracted_companies:
        extracted_companies = "None Found"
        
    print(f"🏢 Mentioned Companies: {extracted_companies}")
    
    print("\n" + "="*50)

# --- Main Execution ---
if __name__ == "__main__":
    # 1. Initialize the AI models
    finbert, camelbert, ner_model = initialize_ai_models()
    if not finbert or not ner_model:
        exit()

    # 2. Fetch the latest article from the database
    latest_article = fetch_latest_article()

    if latest_article is not None:
        # 3. Get the text to be analyzed from the fetched data
        # We use the 'cleaned_text' for sentiment and the original 'title' for NER
        # as titles often have proper capitalization which helps NER models.
        text_for_sentiment = latest_article.get('cleaned_text', '')
        text_for_ner = latest_article.get('title', '') # Using title for company names

        print("\nRunning live analysis on the fetched data...")

        # 4. Run the prediction models on the fetched data
        live_sentiment = predict_sentiment(text_for_sentiment, finbert, camelbert)
        live_companies = extract_company_names(text_for_ner, ner_model)

        # 5. Display the live prediction report
        display_prediction_report(latest_article, live_sentiment, live_companies)
    else:
        print("\nCould not generate a prediction report because no data was found in the database.")
