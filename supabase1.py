import os
from supabase import create_client, Client
from datetime import datetime

# ----------------------------------------------------------------
# 1. CONFIGURE YOUR SUPABASE CLIENT
# ----------------------------------------------------------------
# It's best practice to store your credentials in environment variables.
# Replace 'YOUR_SUPABASE_URL' and 'YOUR_SUPABASE_ANON_KEY' if you're not using environment variables.
url: str = os.environ.get("SUPABASE_URL", "YOUR_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")


# Create the Supabase client
supabase: Client = create_client(url, key)

# ----------------------------------------------------------------
# 2. DEFINE THE DATA TO INSERT
# ----------------------------------------------------------------
# This function prepares and inserts a new link into the 'links' table.
def insert_new_link():
    """Inserts a single new record into the 'links' table."""
    print("Attempting to insert a new link...")
    try:
        # The data for the new row as a dictionary.
        # The 'id' column is omitted as it's auto-incrementing.
        # The 'scraped_date' is set to the current UTC time in ISO format.
        new_link_data = {
            'url': f'https://www.example.com/article/{datetime.now().timestamp()}', # Unique URL
            'source_website': 'Example News Python',
            'scraped_date': datetime.utcnow().isoformat()
        }

        # ----------------------------------------------------------------
        # 3. PERFORM THE INSERT OPERATION
        # ----------------------------------------------------------------
        # Use the table() method to select 'links' and insert() to add the data.
        # The execute() method sends the request to the server.
        data, count = supabase.table('links').insert(new_link_data).execute()

        # ----------------------------------------------------------------
        # 4. HANDLE THE RESPONSE
        # ----------------------------------------------------------------
        # The response from execute() is a tuple containing the data and the count.
        # We are interested in the data part, which is at index 1 of the first element.
        print("Successfully inserted data:", data[1])

    except Exception as e:
        # Handle potential errors, such as network issues or database constraints.
        print(f"Error inserting data: {e}")

# ----------------------------------------------------------------
# 5. RUN THE FUNCTION
# ----------------------------------------------------------------
# Call the function to execute the insertion.
insert_new_link()


def insert_multiple_links():
    """Inserts a list of new records into the 'links' table."""
    print("Attempting to insert multiple links...")
    try:
        links_to_insert = [
            {
                'url': f'https://www.anothersite.com/page/{datetime.now().timestamp()}',
                'source_website': 'Another Site Python',
                'scraped_date': datetime.utcnow().isoformat()
            },
            {
                'url': f'https://www.yetanothersite.com/story/{datetime.now().timestamp()}',
                'source_website': 'Yet Another Site Python',
                'scraped_date': datetime.utcnow().isoformat()
            }
        ]
        data, count = supabase.table('links').insert(links_to_insert).execute()
        print("Successfully inserted multiple links:", data[1])

    except Exception as e:
        print(f"Error inserting multiple links: {e}")

# You can uncomment the line below to test inserting multiple links.
# insert_multiple_links()
