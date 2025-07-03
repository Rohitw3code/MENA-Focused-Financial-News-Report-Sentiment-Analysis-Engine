import requests
from bs4 import BeautifulSoup
import re

# The base URL of the website you want to scrape
BASE_URL = "https://www.menabytes.com"
# The name of the file where the main page HTML will be saved
OUTPUT_FILENAME = "menabytes.html"

def extract_article_details(url):
    """
    Extracts structured data from a single news article page.

    Args:
        url (str): The URL of the article to process.

    Returns:
        dict: A dictionary containing the article's URL, title,
              publication date, author, raw text, and cleaned text,
              or None if the request fails.
    """
    print(f"\n--- Processing article: {url} ---")
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract the title from the <h1> tag
        title_tag = soup.find('h1', class_='post-title')
        title = title_tag.get_text(strip=True) if title_tag else 'N/A'

        # Extract the publication date from the <time> tag
        date_tag = soup.find('time', itemprop='datePublished')
        date = date_tag['datetime'] if date_tag else 'N/A'

        # Extract the author from the <span> tag with class 'author-name'
        author_tag = soup.find('span', class_='author-name')
        author = author_tag.get_text(strip=True) if author_tag else 'N/A'

        # Extract the main content of the article
        content_area = soup.find('div', id='content-main')
        raw_text = ''
        cleaned_text = ''
        if content_area:
            # Get the raw HTML content
            raw_text = str(content_area)
            # Get the cleaned text, joining paragraphs
            paragraphs = content_area.find_all('p')
            cleaned_text = '\n'.join([p.get_text(strip=True) for p in paragraphs])
        else:
            raw_text = 'Content not found'
            cleaned_text = 'Content not found'
        
        # Return the structured data
        return {
            'url': url,
            'title': title,
            'publication_date': date,
            'author': author,
            'raw_text': raw_text,
            'cleaned_text': cleaned_text
        }

    except requests.exceptions.RequestException as req_err:
        print(f"An error occurred while fetching {url}: {req_err}")
        return None
    except Exception as e:
        print(f"An error occurred while parsing {url}: {e}")
        return None


def scrape_and_find_links():
    """
    Scrapes the main page to find all news article links.
    """
    try:
        # Send an HTTP GET request to the main URL
        print(f"Requesting HTML from {BASE_URL}...")
        response = requests.get(BASE_URL, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        html_content = response.text

        # Save the HTML content to a file
        with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as file:
            file.write(html_content)
        print(f"Successfully saved the HTML to {OUTPUT_FILENAME}")

        # Parse the HTML to find news links
        soup = BeautifulSoup(html_content, 'html.parser')
        news_items = soup.find_all('li', class_='infinite-post')
        news_links = [item.find('a')['href'] for item in news_items if item.find('a')]
        
        return news_links

    except requests.exceptions.RequestException as req_err:
        print(f"An error occurred: {req_err}")
    except IOError as io_err:
        print(f"File error occurred: {io_err}")
    
    return []

# Main execution block
if __name__ == "__main__":
    # First, get all the links from the homepage
    links = scrape_and_find_links()
    
    if links:
        print(f"\nFound {len(links)} article links on the main page.")
        
        # Let's process the first link as an example
        first_link = links[0]
        article_data = extract_article_details(first_link)
        
        if article_data:
            print("\n--- Extracted Data from First Article ---")
            print(f"URL: {article_data['url']}")
            print(f"Title: {article_data['title']}")
            print(f"Publication Date: {article_data['publication_date']}")
            print(f"Author: {article_data['author']}")
            print("\n--- Cleaned Text ---")
            print(article_data['cleaned_text'][:500] + "...") # Print first 500 chars
            # To see the raw HTML, you could print(article_data['raw_text'])
    else:
        print("\nCould not find any article links.")
