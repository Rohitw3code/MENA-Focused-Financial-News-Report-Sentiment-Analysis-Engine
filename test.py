import re
from bs4 import BeautifulSoup

# The base URL of the website to construct full links
BASE_URL = "https://gulfnews.com"
# The name of the file to read from
INPUT_FILENAME = "gulf.html"

def get_article_links(filename):
    """
    Parses an HTML file to extract and return unique article links.

    Args:
        filename (str): The path to the HTML file.

    Returns:
        list: A list of unique, absolute URLs to the articles.
    """
    print(f"--- Reading and parsing {filename} ---")
    try:
        # Open and read the local HTML file
        with open(filename, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file, 'html.parser')

        # Use a set to automatically handle duplicate links
        article_links = set()
        
        # Regex to identify article URLs. This pattern looks for URLs that
        # have at least two path segments and end with a specific numeric ID format.
        # Example: /world/asia/pakistan/story-slug-1.1234567
        article_pattern = re.compile(r'\/[^/]+\/.+-1\.\d+')

        # Find all anchor <a> tags that have an 'href' attribute
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            
            # Check if the link matches the article pattern
            if article_pattern.match(href):
                # Construct the full, absolute URL
                full_url = BASE_URL + href
                article_links.add(full_url)

        print(f"--- Found {len(article_links)} unique articles ---")
        # Return the unique links as a sorted list for consistent output
        return sorted(list(article_links))

    except FileNotFoundError:
        print(f"Error: The file '{filename}' was not found.")
        return []
    except Exception as e:
        print(f"An error occurred while processing the file: {e}")
        return []

# Main execution block
if __name__ == "__main__":
    links = get_article_links(INPUT_FILENAME)
    
    if links:
        print("\n--- Extracted Article Links ---")
        for link in links:
            print(link)
    else:
        print("\n--- No article links were found. ---")
