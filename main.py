# main.py

import database
from pipeline import run_scraping_pipeline, run_analysis_pipeline

if __name__ == "__main__":
    # Ensure the database is ready
    database.create_database()
    
    # Run the scraping pipeline
    run_scraping_pipeline() 
    
    # Run the analysis pipeline with default settings from .env
    run_analysis_pipeline()

    print("\n" + "="*30 + " PIPELINE COMPLETE " + "="*30)
