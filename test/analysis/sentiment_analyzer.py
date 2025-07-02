# analysis/sentiment_analyzer.py

import os
from dotenv import load_dotenv
from typing import List, Literal
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_groq import ChatGroq

# Load environment variables (GROQ_API_KEY)
load_dotenv()

# --- Pydantic Data Structures ---
class CompanySentiment(BaseModel):
    """A data model for the sentiment towards a single company."""
    company_name: str = Field(description="The name of the company.")
    sentiment: Literal["positive", "negative", "neutral"] = Field(
        description="The sentiment of the text specifically related to this company."
    )

class TextAnalysis(BaseModel):
    """A data model to hold the company sentiment analysis of a given text."""
    companies: List[CompanySentiment] = Field(
        description="A list of companies mentioned in the text and the sentiment towards each."
    )

# --- LLM and Prompt Setup ---
try:
    llm = ChatGroq(model_name="llama3-8b-8192")
    structured_llm = llm.with_structured_output(TextAnalysis)
except Exception as e:
    print(f"Error initializing ChatGroq model: {e}")
    structured_llm = None

system_prompt = """
You are an expert analyst. Your task is to analyze the provided text to identify all mentioned company names.
For each company you find, you must determine the specific sentiment (positive, negative, or neutral) associated with it.
If a company is mentioned but the context is neutral, assign 'neutral'.
If no companies are mentioned, return an empty list.
Provide the output in the required JSON format.
"""
human_prompt = "{text}"
prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", human_prompt)])

chain = prompt | structured_llm

def analyze_text_for_sentiment(text: str) -> List[CompanySentiment]:
    """
    Analyzes text and returns a list of companies and their sentiments.
    
    Returns:
        A list of CompanySentiment objects or an empty list if an error occurs.
    """
    if not structured_llm:
        print("LLM not initialized. Skipping sentiment analysis.")
        return []
    
    if not text or not isinstance(text, str) or len(text.strip()) < 20:
        # print(f"Skipping analysis for short or invalid text.")
        return []

    print(f"\nAnalyzing article for sentiment...")
    try:
        response = chain.invoke({"text": text})
        return response.companies
    except Exception as e:
        print(f"An error occurred during sentiment analysis: {e}")
        return []