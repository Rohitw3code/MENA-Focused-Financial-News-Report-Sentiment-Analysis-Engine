# main.py

import database
from scrapers import zawya_scraper # This is where you import your scrapers
from analysis import sentiment_analyzer

def run_pipeline():
    """
    Executes the full data pipeline:
    1. Scrapes links for articles.
    2. Scrapes content for each new link.
    3. Performs sentiment analysis on new articles.
    """
    # --- INITIALIZATION ---
    # Set up the database and tables
    database.create_database()

    # Register all scraper modules here. To add a new website, create a scraper
    # and add its module to this list.
    scraper_modules = [zawya_scraper]
    
    # =================================================================================
    # STEP 1: SCRAPE LINKS
    # =================================================================================
    print("\n" + "="*25 + " STEP 1: SCRAPING LINKS " + "="*25)
    new_links_found = 0
    for scraper in scraper_modules:
        print(f"\nRunning scraper for: {scraper.SOURCE_NAME}")
        urls = scraper.get_article_urls()
        if not urls:
            print(f"No links found for {scraper.SOURCE_NAME}.")
            continue
            
        for url in urls:
            # Add link to the database; duplicates are ignored automatically
            link_id = database.add_link(url, scraper.SOURCE_NAME)
            if link_id:
                new_links_found += 1
    print(f"\nFinished scraping links. Found {new_links_found} new URLs.")

    # =================================================================================
    # STEP 2: SCRAPE ARTICLES
    # =================================================================================
    print("\n" + "="*25 + " STEP 2: SCRAPING ARTICLES " + "="*24)
    links_to_scrape = database.get_unscraped_links()
    articles_scraped_count = 0
    if not links_to_scrape:
        print("No new articles to scrape.")
    else:
        print(f"Found {len(links_to_scrape)} new links to scrape articles from.")
        for link in links_to_scrape[:10]:
            # Find the correct scraper based on the source stored in the database
            scraper_to_use = None
            for s_mod in scraper_modules:
                if s_mod.SOURCE_NAME == link['source']:
                    scraper_to_use = s_mod
                    break
            
            if scraper_to_use:
                article_data = scraper_to_use.scrape_article_content(link['url'])
                if article_data:
                    # Add the scraped article to the database
                    database.add_article(link['id'], article_data)
                    articles_scraped_count += 1
    print(f"\nFinished scraping articles. Scraped {articles_scraped_count} new articles.")

    # =================================================================================
    # STEP 3: ANALYZE SENTIMENT
    # =================================================================================
    print("\n" + "="*25 + " STEP 3: ANALYZING SENTIMENT " + "="*23)
    articles_to_analyze = database.get_unanalyzed_articles()
    sentiments_found_count = 0
    if not articles_to_analyze:
        print("No new articles to analyze for sentiment.")
    else:
        print(f"Found {len(articles_to_analyze)} new articles to analyze.")
        for article in articles_to_analyze:
            sentiments = sentiment_analyzer.analyze_text_for_sentiment(article['text'])
            if sentiments:
                for sent in sentiments:
                    # Add each company's sentiment to the database
                    database.add_sentiment(article['id'], sent.company_name, sent.sentiment)
                    sentiments_found_count += 1
                print(f"-> Found {len(sentiments)} companies in article ID {article['id']}.")
    print(f"\nFinished sentiment analysis. Found {sentiments_found_count} new sentiment records.")

    print("\n" + "="*30 + " PIPELINE COMPLETE " + "="*30)


if __name__ == "__main__":
    run_pipeline()