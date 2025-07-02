# Import the 'requests' library, which is a standard for making HTTP requests in Python.
# If you don't have it installed, you can install it by running: pip install requests
import requests
import os # Import the os library to work with file paths

def get_html_content(url):
    """
    Fetches the HTML content of a given website URL.

    Args:
        url (str): The URL of the website you want to get the content from.

    Returns:
        str: The HTML content of the website as a string, or None if the request fails.
    """
    try:
        # Send an HTTP GET request to the specified URL.
        # The headers are used to mimic a real browser, which can help avoid being blocked by some websites.
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)

        # The raise_for_status() method will raise an HTTPError if the HTTP request returned an unsuccessful status code.
        response.raise_for_status()

        # The 'text' attribute holds the decoded content of the response.
        # Requests library automatically decodes content from the server.
        return response.text

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred: {conn_err}")
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred: {timeout_err}")
    except requests.exceptions.RequestException as err:
        print(f"An unexpected error occurred: {err}")
    
    return None

def save_to_file(content, filename="output.html"):
    """
    Saves the given content to a file with UTF-8 encoding.

    Args:
        content (str): The string content to save.
        filename (str): The name of the file to save to.
    """
    try:
        # Open the file in write mode ('w') with UTF-8 encoding to handle all characters.
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        # Get the full path of the file for a clear message.
        full_path = os.path.abspath(filename)
        print(f"\nSuccessfully saved HTML content to: {full_path}")
    except IOError as e:
        print(f"\nError writing to file: {e}")


# --- Example Usage ---
if __name__ == "__main__":
    # The URL that was causing the error.
    target_url = "https://www.zawya.com/en/capital-markets/equities/interview-gcc-ipos-are-shielded-from-global-turbulence-but-may-experience-some-delays-jp-morgan-myfdnxuq"
    
    print(f"Attempting to fetch HTML content from: {target_url}")
    
    # Call the function to get the HTML content.
    html_content = get_html_content(target_url)
    
    # If the content was fetched successfully, save it to a file.
    if html_content:
        save_to_file(html_content)
    else:
        print("\nFailed to retrieve website content.")
