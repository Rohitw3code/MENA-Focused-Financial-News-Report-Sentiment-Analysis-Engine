# Import necessary libraries
# requests: for making HTTP requests to get the webpage
# BeautifulSoup: for parsing the HTML content
import requests
from bs4 import BeautifulSoup

def scrape_zawya_news():
    """
    Scrapes news articles from the business section of zawya.com.

    Returns:
        list: A list of dictionaries, where each dictionary represents a news article.
              Returns an empty list if the request fails or no news is found.
    """
    # The URL has been updated to the correct website based on the HTML provided.
    target_url = "https://www.zawya.com/en/business"
    print(f"Attempting to fetch news from: {target_url}")

    try:
        # Send an HTTP GET request to the URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(target_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse the HTML content using BeautifulSoup with the lxml parser
        soup = BeautifulSoup(response.content, 'lxml')

        scraped_news = []

        # Find all article containers. On Zawya, each news item is in a div with the class 'teaser'.
        articles = soup.find_all('div', class_='teaser')

        if not articles:
            print("Could not find any articles with the 'teaser' class. The website structure may have changed.")
            return []

        for article in articles:
            try:
                # The title and link are inside an 'a' tag within an 'h2' or 'h3' with the class 'teaser-title'
                headline_tag = article.find(['h2', 'h3'], class_='teaser-title')
                if not headline_tag or not headline_tag.find('a'):
                    continue
                
                link_tag = headline_tag.find('a')
                title = link_tag.text.strip()
                link = link_tag['href']

                # The category is in an 'a' tag within a span with the class 'teaser-keyword'
                category_tag = article.find('span', class_='teaser-keyword')
                category = "N/A" # Default value if category is not found
                if category_tag and category_tag.find('a'):
                    category = category_tag.find('a').text.strip()

                # Ensure the link is absolute
                if not link.startswith('http'):
                    link = "https://www.zawya.com" + link

                scraped_news.append({
                    'category': category,
                    'title': title,
                    'link': link
                })

            except (AttributeError, TypeError) as e:
                # This will catch errors if an article's structure is unexpected
                # print(f"Skipping an article due to a parsing error: {e}")
                continue
        
        # Remove duplicate articles based on the link
        unique_news = [dict(t) for t in {tuple(d.items()) for d in scraped_news}]

        return unique_news

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the website: {e}")
        return []

# --- Example Usage ---
if __name__ == "__main__":
    news_items = scrape_zawya_news()

    if news_items:
        print(f"\nFound {len(news_items)} unique news articles:")
        print("-" * 50)
        # Sort by category for better readability
        for item in sorted(news_items, key=lambda x: x['category']):
            print(f"Category: {item['category']}")
            print(f"Title: {item['title']}")
            print(f"Link: {item['link']}")
            print("-" * 50)
    else:
        print("\nNo news articles found or failed to retrieve content.")
