# Import necessary libraries
# requests: for making HTTP requests to get the webpage
# BeautifulSoup: for parsing the HTML content
# json: for saving the output to a file
import requests
from bs4 import BeautifulSoup
import json

def scrape_article_details(url):
    """
    Scrapes the detailed content of a single news article from its URL.

    Args:
        url (str): The URL of the article page.

    Returns:
        dict: A dictionary containing the title, date, author, and full text of the article.
              Returns None if the page cannot be scraped.
    """
    print(f"Attempting to scrape details from: {url}")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')

        # --- Extracting details from the article page ---

        # Title
        title_tag = soup.find('h1', class_='article-title')
        title = title_tag.text.strip() if title_tag else "N/A"

        # Date
        date_tag = soup.find('div', class_='article-date')
        date = date_tag.find('span').text.strip() if date_tag and date_tag.find('span') else "N/A"
        
        # Author
        author_tag = soup.find('span', class_='author-name-text')
        author = author_tag.text.strip() if author_tag else "N/A"

        # Article Body
        article_body_div = soup.find('div', class_='article-body')
        if article_body_div:
            # Join all paragraph texts to form the full article body
            paragraphs = article_body_div.find_all('p')
            full_text = '\n'.join([p.text.strip() for p in paragraphs])
        else:
            full_text = "N/A"

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

# --- Main Execution ---
if __name__ == "__main__":
    # The specific URL you want to scrape.
    # You can change this to any other article URL from zawya.com.
    target_url = "https://www.zawya.com/en/capital-markets/equities/interview-gcc-ipos-are-shielded-from-global-turbulence-but-may-experience-some-delays-jp-morgan-myfdnxuq"
    
    # Scrape the details for the single article
    article_details = scrape_article_details(target_url)
    
    if article_details:
        print("\n--- Successfully Scraped Article ---")
        
        # Print the article's details
        print("\n" + "-"*50)
        print(f"Title: {article_details['title']}")
        print(f"Author: {article_details['author']}")
        print(f"Date: {article_details['publication_date']}")
        print(f"URL: {article_details['url']}")
        print("\n--- Article Text ---")
        print(article_details['full_text'])
        print("-" * 50)

        # Optionally, save the result to a JSON file
        try:
            # We save it inside a list to maintain the same file structure as before
            with open('zawya_article.json', 'w', encoding='utf-8') as f:
                json.dump([article_details], f, ensure_ascii=False, indent=4)
            print("\nScraped data has been saved to 'zawya_article.json'")
        except IOError as e:
            print(f"\nCould not write to file: {e}")

    else:
        print("\nFailed to scrape the article.")
