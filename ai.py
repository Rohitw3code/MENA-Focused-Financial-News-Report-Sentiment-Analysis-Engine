# main.py

# This script demonstrates how to use LangChain with Groq to perform
# per-company sentiment analysis and entity extraction from a given text.

# --- 1. Installation ---
# Before running, make sure you have the required libraries installed.
# pip install langchain langchain-groq python-dotenv pydantic

import os
from dotenv import load_dotenv
from typing import List, Literal

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_groq import ChatGroq

# --- 2. Environment Setup ---
# Load environment variables from a .env file in the same directory.
# Your .env file should contain your Groq API key like this:
# GROQ_API_KEY="your_groq_api_key_here"
load_dotenv()

# Check if the Groq API key is set.
if "GROQ_API_KEY" not in os.environ:
    print("Error: GROQ_API_KEY not found in environment variables.")
    print("Please create a .env file and add your Groq API key.")
    exit()

# --- 3. Define the Desired Output Structure ---
# We use Pydantic to define the exact format we want the LLM to return.
# This ensures we get structured, predictable, and validated output.

class CompanySentiment(BaseModel):
    """A data model for the sentiment towards a single company."""
    company_name: str = Field(description="The name of the company.")
    sentiment: Literal["positive", "negative", "neutral"] = Field(
        description="The sentiment of the text specifically related to this company."
    )

class TextAnalysis(BaseModel):
    """A data model to hold the company sentiment analysis of a given text."""
    companies: List[CompanySentiment] = Field(
        description="A list of companies mentioned in the text and the sentiment towards each. Should be an empty list if no companies are found."
    )

# --- 4. Initialize the Language Model ---
# We'll use the ChatGroq model, which provides a fast inference service.
# We pass our structured Pydantic model to the `with_structured_output` method.
# This tells the model to format its response according to our TextAnalysis schema.
try:
    llm = ChatGroq(model_name="llama3-8b-8192")
    structured_llm = llm.with_structured_output(TextAnalysis)
except Exception as e:
    print(f"Error initializing ChatGroq model: {e}")
    exit()


# --- 5. Create the Prompt Template ---
# This template guides the model on its task. It takes one input variable, "text".
system_prompt = """
You are an expert analyst. Your task is to analyze the provided text to identify all mentioned company names.
For each company you find, you must determine the specific sentiment (positive, negative, or neutral) associated with it in the text.

If a company is mentioned but the context is neutral, assign 'neutral'.
If no companies are mentioned, return an empty list.

Provide the output in the required JSON format.
"""

human_prompt = "{text}"

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", human_prompt)
])

# --- 6. Build the LangChain Chain ---
# We chain the prompt template with our structured LLM.
# The input text will first be formatted by the prompt, and then the
# complete prompt will be sent to the LLM for structured processing.
chain = prompt | structured_llm

# --- 7. Run the Analysis ---
def analyze_text(text: str) -> TextAnalysis:
    """
    Analyzes the input text for sentiment towards each mentioned company.

    Args:
        text: The text to analyze.

    Returns:
        An instance of the TextAnalysis Pydantic model containing the results.
    """
    print(f"\n--- Analyzing Text ---\n'{text}'\n")
    try:
        response = chain.invoke({"text": text})
        return response
    except Exception as e:
        print(f"An error occurred during analysis: {e}")
        return None

# --- Example Usage ---
if __name__ == "__main__":
    # Example 1: Mixed sentiment text
    text1 = "I am absolutely thrilled with the new laptop from Apple! The performance is outstanding. However, the customer service from Google was surprisingly unhelpful when I had a setup question."
    analysis1 = analyze_text(text1)
    if analysis1:
        print("--- Results ---")
        if analysis1.companies:
            for company in analysis1.companies:
                print(f"Company: {company.company_name}, Sentiment: {company.sentiment}")
        else:
            print("No companies were mentioned.")
        print("-" * 20)

    # Example 2: Negative news article
    text2 = "Investors are concerned after Microsoft reported lower-than-expected earnings. Meanwhile, Amazon's stock also saw a slight dip in after-hours trading."
    analysis2 = analyze_text(text2)
    if analysis2:
        print("--- Results ---")
        if analysis2.companies:
            for company in analysis2.companies:
                print(f"Company: {company.company_name}, Sentiment: {company.sentiment}")
        else:
            print("No companies were mentioned.")
        print("-" * 20)

    # Example 3: A neutral statement
    text3 = "The report, which mentions Meta and OpenAI, is a factual summary of market events. It does not contain opinions."
    analysis3 = analyze_text(text3)
    if analysis3:
        print("--- Results ---")
        if analysis3.companies:
            for company in analysis3.companies:
                print(f"Company: {company.company_name}, Sentiment: {company.sentiment}")
        else:
            print("No companies were mentioned.")
        print("-" * 20)
