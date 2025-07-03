# pipeline.py

import database
from scrapers import zawya_scraper
from analysis.sentiment_analyzer import SentimentAnalyzer

def run_scraping_pipeline(status_tracker):
    """
    Executes the scraping part of the data pipeline and updates a status tracker.
    
    This function performs two main steps:
    1. Scrapes the main news page for a list of article URLs.
    2. For each new URL, it scrapes the detailed content of the article.
    
    Args:
        status_tracker (dict): A dictionary to update with the real-time status of the process.
        
    Returns:
        dict: A dictionary containing statistics about the scraping run.
    """
    # --- Step 1: Scrape Links ---
    status_tracker['status'] = 'Scraping links'
    status_tracker['progress'] = 0
    status_tracker['total'] = 1 # Represents one phase
    status_tracker['current_task'] = 'Fetching article lists from sources.'
    
    scraper_modules = [zawya_scraper]
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
    
    status_tracker['progress'] = 1
    print(f"Finished scraping links. Found {new_links_found} new URLs.")

    # --- Step 2: Scrape Articles ---
    links_to_scrape = database.get_unscraped_links()
    status_tracker['status'] = 'Scraping articles'
    status_tracker['progress'] = 0
    status_tracker['total'] = len(links_to_scrape)
    
    articles_scraped_count = 0
    if not links_to_scrape:
        status_tracker['current_task'] = 'No new articles to scrape.'
    else:
        for i, link in enumerate(links_to_scrape):
            scraper_to_use = next((s for s in scraper_modules if s.SOURCE_NAME == link['source']), None)
            if scraper_to_use:
                article_data = scraper_to_use.scrape_article_content(link['url'])
                if article_data:
                    database.add_article(link_id=link['id'], article_data=article_data)
                    articles_scraped_count += 1
                    status_tracker['current_task'] = f"Scraped: {article_data.get('title', 'N/A')}"
            status_tracker['progress'] = i + 1

    print(f"Finished scraping articles. Scraped {articles_scraped_count} new articles.")
    return {'new_links_found': new_links_found, 'articles_scraped': articles_scraped_count}


def run_analysis_pipeline(status_tracker, provider=None, model_name=None, openai_api_key=None, groq_api_key=None):
    """
    Executes the analysis part of the pipeline and updates a status tracker.
    
    This function fetches all unanalyzed articles from the database, passes them
    to the AI for sentiment analysis, and stores the results.
    
    Args:
        status_tracker (dict): A dictionary to update with the real-time status.
        provider (str, optional): The AI provider to use ('openai' or 'groq').
        model_name (str, optional): The specific model name to use.
        openai_api_key (str, optional): An OpenAI API key.
        groq_api_key (str, optional): A Groq API key.
        
    Returns:
        dict: A dictionary containing statistics about the analysis run.
    """
    # Instantiate the analyzer with the provided (or default) configuration
    analyzer = SentimentAnalyzer(
        provider=provider,
        model_name=model_name,
        openai_api_key=openai_api_key,
        groq_api_key=groq_api_key
    )
    
    articles_to_analyze = database.get_unanalyzed_articles()
    status_tracker['status'] = 'Analyzing sentiment'
    status_tracker['progress'] = 0
    status_tracker['total'] = len(articles_to_analyze)
    
    sentiments_found_count = 0
    total_session_cost = 0.0
    
    if not articles_to_analyze:
        status_tracker['current_task'] = 'No new articles to analyze.'
    else:
        for i, article in enumerate(articles_to_analyze):
            status_tracker['current_task'] = f"Analyzing article ID: {article['id']}"
            entities_list, usage_stats = analyzer.analyze_text_for_sentiment(article['text'])
            
            if usage_stats:
                database.add_usage_log(
                    article_id=article['id'],
                    provider=analyzer.provider,
                    usage_stats=usage_stats
                )
                total_session_cost += usage_stats.get('total_cost_usd', 0.0)

            if entities_list:
                for entity in entities_list:
                    database.add_sentiment(
                        article_id=article['id'],
                        entity_name=entity.entity_name,
                        entity_type=entity.entity_type,
                        financial_sentiment=entity.financial_sentiment,
                        overall_sentiment=entity.overall_sentiment,
                        reasoning=entity.reasoning
                    )
                    sentiments_found_count += 1
            status_tracker['progress'] = i + 1
            
    print(f"\nFinished sentiment analysis. Found {sentiments_found_count} new sentiment records.")
    print(f"Total estimated cost for this session: ${total_session_cost:.6f} USD")
    return {'entities_analyzed': sentiments_found_count}
