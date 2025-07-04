import re
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# The base URL of the website you want to scrape
BASE_URL = "https://gulfnews.com"

def get_fully_loaded_page(url):
    """
    Uses Selenium to load a web page completely, including dynamic JavaScript content.
    It scrolls down the page to trigger any lazy-loaded elements.

    Args:
        url (str): The URL of the page to load.

    Returns:
        BeautifulSoup: A BeautifulSoup object of the fully rendered page, or None if an error occurs.
    """
    print(f"--- Loading page with Selenium to execute JavaScript: {url} ---")
    try:
        # Setup Chrome options for headless mode (runs browser in the background without a UI)
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")

        # Set up the Selenium Chrome driver.
        # webdriver-manager will automatically download and manage the correct driver for your installed Chrome version.
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

        # Go to the page
        driver.get(url)

        # Wait for the initial page content to load
        print("--- Waiting for initial page load... ---")
        time.sleep(5)  # A simple wait to allow initial JavaScript to run. For more complex sites, an explicit wait might be better.

        # Scroll down to the bottom of the page to trigger lazy-loading of more articles.
        print("--- Scrolling down to load more content... ---")
        last_height = driver.execute_script("return document.body.scrollHeight")
        
        # We'll scroll a few times to make sure we get everything.
        for i in range(3): 
            print(f"--- Scrolling... Pass {i+1}/3 ---")
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3) # Wait for new content to load after scrolling
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                print("--- Reached the bottom of the page. ---")
                break # Exit if the page height hasn't changed, meaning no new content was loaded.
            last_height = new_height

        # Get the page source after JavaScript has rendered the content
        page_source = driver.page_source
        print("--- Page fully loaded and source captured. ---")

        # Close the browser to free up resources
        driver.quit()

        # Parse the page source with BeautifulSoup
        soup = BeautifulSoup(page_source, 'html.parser')
        return soup

    except Exception as e:
        print(f"An error occurred while using Selenium: {e}")
        if 'driver' in locals():
            driver.quit()
        return None

def get_article_links(soup):
    """
    Parses a BeautifulSoup object to extract and return unique article links.

    Args:
        soup (BeautifulSoup): The parsed HTML of the page.

    Returns:
        list: A list of unique, absolute URLs to the articles.
    """
    if not soup:
        print("--- BeautifulSoup object is None. Cannot extract links. ---")
        return []
        
    print("--- Parsing HTML to find article links... ---")
    
    # Use a set to automatically handle duplicate links
    article_links = set()
    
    # Regex to identify article URLs. This pattern looks for URLs that
    # have at least two path segments and end with a specific numeric ID format.
    # Example: /world/asia/pakistan/story-slug-1.1234567
    article_pattern = re.compile(r'\/[^/]+\/.+-1\.\d+')

    # Find all anchor <a> tags that have an 'href' attribute
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        
        # Check if the link matches the article pattern and is not just a fragment
        if href and article_pattern.match(href):
            # Construct the full, absolute URL if it's a relative link
            if href.startswith('/'):
                full_url = BASE_URL + href
                article_links.add(full_url)
            # If it's already a full URL from the same domain, add it
            elif href.startswith(BASE_URL):
                 article_links.add(href)

    print(f"--- Found {len(article_links)} unique articles ---")
    # Return the unique links as a sorted list for consistent output
    return sorted(list(article_links))

# Main execution block
if __name__ == "__main__":
    # Note: This script requires Selenium and a webdriver.
    # You can install them with pip:
    # pip install selenium webdriver-manager
    
    # Get the fully loaded page content using Selenium
    page_soup = get_fully_loaded_page(BASE_URL)
    
    # Extract links from the loaded page content
    if page_soup:
        links = get_article_links(page_soup)
        
        if links:
            print("\n--- Extracted Article Links ---")
            for link in links:
                print(link)
        else:
            print("\n--- No article links were found. ---")
    else:
        print("\n--- Failed to load the page content. ---")
