# Import necessary libraries
import requests
from bs4 import BeautifulSoup
import sqlite3
import csv
import re
import time

def setup_database(db_name="news.db"):
    """
    Sets up the SQLite database and creates the articles table if it doesn't exist.

    Args:
        db_name (str): The name of the database file.
    
    Returns:
        tuple: A tuple containing the connection and cursor objects.
    """
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        
        # Create table with a UNIQUE constraint on the URL to prevent duplicates
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            title TEXT,
            author TEXT,
            publication_date TEXT,
            cleaned_text TEXT
        )
        ''')
        print(f"Database '{db_name}' is set up successfully.")
        return conn, cursor
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None, None

def preprocess_text(text):
    """
    Cleans and preprocesses text for NLP analysis.
    - Converts to lowercase
    - Removes punctuation and special characters
    - Removes extra whitespace

    Args:
        text (str): The raw text to be cleaned.

    Returns:
        str: The cleaned text.
    """
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove punctuation, numbers, and special characters
    text = re.sub(r'[^a-z\s]', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def scrape_article_details(url):
    """
    Scrapes the detailed content of a single news article from its URL.

    Args:
        url (str): The URL of the article page.

    Returns:
        dict: A dictionary containing the raw article details, or None if scraping fails.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')

        title_tag = soup.find('h1', class_='article-title')
        title = title_tag.text.strip() if title_tag else "N/A"

        date_tag = soup.find('div', class_='article-date')
        date = date_tag.find('span').text.strip() if date_tag and date_tag.find('span') else "N/A"
        
        author_tag = soup.find('span', class_='author-name-text')
        author = author_tag.text.strip() if author_tag else "N/A"

        article_body_div = soup.find('div', class_='article-body')
        full_text = '\n'.join([p.text.strip() for p in article_body_div.find_all('p')]) if article_body_div else "N/A"

        return {
            'title': title,
            'publication_date': date,
            'author': author,
            'full_text': full_text,
            'url': url
        }
    except requests.exceptions.RequestException as e:
        print(f"Could not fetch article {url}. Error: {e}")
        return None

def get_article_links(base_url="https://www.zawya.com/en/business"):
    """
    Scrapes the main business page to get links to news articles.

    Returns:
        list: A list of unique URLs for the news articles.
    """
    print(f"Attempting to fetch news links from: {base_url}")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(base_url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'lxml')
        links = []
        articles = soup.find_all('div', class_='teaser')

        for article in articles:
            link_tag = article.find(['h2', 'h3'], class_='teaser-title')
            if link_tag and link_tag.find('a'):
                link = link_tag.find('a')['href']
                if not link.startswith('http'):
                    link = "https://www.zawya.com" + link
                links.append(link)
        
        return list(set(links)) # Return only unique links
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the main news page: {e}")
        return []

def save_to_csv(data, filename="scraped_articles.csv"):
    """Saves a list of dictionaries to a CSV file."""
    if not data:
        return
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        print(f"\nSuccessfully saved {len(data)} articles to '{filename}'")
    except IOError as e:
        print(f"Error writing to CSV file: {e}")

def insert_into_db(cursor, conn, article_data):
    """Inserts a single article into the database, ignoring duplicates."""
    sql = ''' INSERT OR IGNORE INTO articles(url, title, author, publication_date, cleaned_text)
              VALUES(?,?,?,?,?) '''
    try:
        cursor.execute(sql, (
            article_data['url'],
            article_data['title'],
            article_data['author'],
            article_data['publication_date'],
            article_data['cleaned_text']
        ))
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database insert error: {e}")

# --- Main Execution ---
if __name__ == "__main__":
    # 1. Setup Database
    conn, cursor = setup_database()
    if not conn:
        exit()

    # 2. Get all article links
    article_links = get_article_links()
    
    if not article_links:
        print("\nNo article links found. Exiting.")
        conn.close()
        exit()

    total_articles = len(article_links)
    print(f"\nFound {total_articles} unique article links. Starting detailed scraping.")
    
    all_articles_data = []
    
    # 3. Scrape and process each article
    for i, link in enumerate(article_links):
        print(f"\n--- Scraping article {i+1}/{total_articles}: {link} ---")
        details = scrape_article_details(link)
        
        if details:
            # Preprocess the text for NLP
            cleaned_text = preprocess_text(details['full_text'])
            
            # Show preprocessing for the first article as an example
            if i == 0:
                print("\n--- PREPROCESSING EXAMPLE (First Article) ---")
                print("\n[RAW TEXT SNIPPET]:")
                print(details['full_text'][:200] + "...")
                print("\n[CLEANED TEXT SNIPPET]:")
                print(cleaned_text[:200] + "...")
                print("------------------------------------------")

            # Prepare data for storage
            processed_article = {
                'url': details['url'],
                'title': details['title'],
                'author': details['author'],
                'publication_date': details['publication_date'],
                'cleaned_text': cleaned_text
            }
            
            all_articles_data.append(processed_article)
            
            # Insert into database immediately
            insert_into_db(cursor, conn, processed_article)
        
        # Be respectful to the server
        time.sleep(1)

    # 4. Save all data to CSV at the end
    save_to_csv(all_articles_data)

    # 5. Close the database connection
    print(f"\nScraping complete. Total articles processed and saved: {len(all_articles_data)}.")
    conn.close()

