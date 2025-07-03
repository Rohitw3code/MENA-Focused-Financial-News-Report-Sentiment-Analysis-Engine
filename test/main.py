# main.py

import database
from scrapers import zawya_scraper
from analysis import sentiment_analyzer

def run_analysis_pipeline():
    """
    Executes the analysis part of the data pipeline.
    This function assumes scraping has already been done.
    """
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
            # Unpack the tuple returned by the function (entities_list, usage_stats)
            entities_list, usage_stats = sentiment_analyzer.analyze_text_for_sentiment(article['text'])
            
            # Log usage data if any was returned
            if usage_stats:
                database.add_usage_log(
                    article_id=article['id'],
                    provider=sentiment_analyzer.LLM_PROVIDER,
                    usage_stats=usage_stats
                )

            # Process the list of entities if it's not empty
            if entities_list:
                print(f"-> Found {len(entities_list)} valid entities in article ID {article['id']}.")
                # Loop over the entities_list
                for entity in entities_list:
                    database.add_sentiment(
                        article_id=article['id'],
                        entity_name=entity.entity_name,
                        entity_type=entity.entity_type,
                        sentiment=entity.sentiment,
                        reasoning=entity.reasoning
                    )
                    sentiments_found_count += 1
            
    print(f"\nFinished sentiment analysis. Found {sentiments_found_count} new sentiment records.")
    

def run_scraping_pipeline():
    """
    Executes the scraping part of the data pipeline.
    """
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
            if database.add_link(url=url, source=scraper.SOURCE_NAME):
                new_links_found += 1
    print(f"\nFinished scraping links. Found {new_links_found} new URLs to process.")

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
            scraper_to_use = next((s for s in scraper_modules if s.SOURCE_NAME == link['source']), None)
            if scraper_to_use:
                article_data = scraper_to_use.scrape_article_content(link['url'])
                if article_data:
                    database.add_article(link_id=link['id'], article_data=article_data)
                    articles_scraped_count += 1
    print(f"\nFinished scraping articles. Scraped {articles_scraped_count} new articles.")


if __name__ == "__main__":
    # --- INITIALIZATION ---
    # This must be the first step to ensure the database and tables exist.
    database.create_database()
    
    # --- EXECUTION ---
    # To keep the main function clean, scraping and analysis are separated.
    
    # You can comment this out if you don't need to scrape for new articles every time.
    run_scraping_pipeline() 
    
    # Run the analysis pipeline on the scraped articles.
    run_analysis_pipeline()

    print("\n" + "="*30 + " PIPELINE COMPLETE " + "="*30)
