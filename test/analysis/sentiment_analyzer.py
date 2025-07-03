# analysis/sentiment_analyzer.py

import os
from dotenv import load_dotenv
from typing import List, Literal, Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic.v1 import BaseModel, Field

# Import model providers
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

# Import the callbacks for token usage tracking
from langchain_community.callbacks import get_openai_callback
from langchain_core.callbacks import BaseCallbackHandler


# --- CONFIGURATION ---
# Change this value to 'openai' to use ChatGPT, or 'groq' to use Groq.
LLM_PROVIDER = 'groq'

# Load environment variables from .env file
load_dotenv()


# --- Pydantic Data Structures ---
class EntitySentiment(BaseModel):
    """A data model for the sentiment towards a single, validated entity."""
    entity_name: str = Field(description="The full, official name of the company or cryptocurrency.")
    entity_type: Literal["company", "crypto"] = Field(description="The type of the entity.")
    sentiment: Literal["positive", "negative", "neutral"] = Field(description="The sentiment based on financial context.")
    reasoning: str = Field(description="Brief justification for the classification and sentiment choice.")

class TextAnalysis(BaseModel):
    """A data model to hold the entity sentiment analysis of a given text."""
    entities: List[EntitySentiment] = Field(
        description="A list of valid entities (companies or cryptos) mentioned in the text."
    )

# --- CORRECTED: Custom Callback Handler for Groq ---
class GroqTokenUsageCallback(BaseCallbackHandler):
    """Callback handler to capture token usage from Groq."""
    def __init__(self):
        self.usage = {}

    def on_llm_end(self, response, **kwargs: Any) -> Any:
        """Run when LLM ends running and capture the token usage."""
        if response.llm_output and 'token_usage' in response.llm_output:
            self.usage = response.llm_output['token_usage']


# --- MODEL INITIALIZATION FACTORY ---
def get_language_model():
    """
    Initializes and returns the appropriate language model based on the provider.
    """
    if LLM_PROVIDER == 'openai':
        print("Using OpenAI model.")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY not found in environment variables.")
        return ChatOpenAI(model_name="gpt-4-turbo", temperature=0)
    
    elif LLM_PROVIDER == 'groq':
        print("Using Groq model.")
        if not os.getenv("GROQ_API_KEY"):
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        return ChatGroq(model_name="llama3-8b-8192", temperature=0)
    
    else:
        raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}. Please choose 'openai' or 'groq'.")


# --- LLM and Prompt Setup ---
try:
    llm = get_language_model()
    structured_llm = llm.with_structured_output(TextAnalysis)
except Exception as e:
    print(f"Error initializing language model: {e}")
    structured_llm = None

# --- System Prompt (works for both models) ---
system_prompt = """
You are a highly precise financial analyst. Your task is to extract **only legitimate companies and cryptocurrencies** from the provided text and analyze the financial sentiment towards them.

**CRITICAL RULES FOR EXTRACTION:**
1.  **DO NOT EXTRACT LOCATIONS:** You MUST ignore names of countries, cities, states, or continents (e.g., 'Malaysia', 'Brazil', 'Saudi Arabia', 'Thailand', 'Chile'). These are not companies.
2.  **FOCUS ON PARENT COMPANIES:** If a product or brand (e.g., 'Marlboro', 'HEETS', 'L&M') is mentioned, you should identify the parent company (e.g., 'Philip Morris International') if it is present in the text. If the parent company is not mentioned, you may list the product but classify it as 'company'.
3.  **USE OFFICIAL & SPECIFIC NAMES:** For entities like 'X', use the full official name if context allows (e.g., 'X, formerly Twitter'). Avoid generic terms like 'the bank' unless you can resolve it to a specific name like 'RBL Bank'.
4.  **ENTITY CLASSIFICATION:**
    * `company`: A registered business entity, stock exchange, or major corporation.
    * `crypto`: A digital or virtual currency like Bitcoin or Ethereum.

**RULES FOR SENTIMENT ANALYSIS:**
-   **positive**: Assign this ONLY if the text explicitly mentions stock growth, record profits, successful funding, market outperformance, or other clear financial gains. General positive economic news about a country is NOT a positive sentiment for a company.
-   **negative**: Assign this ONLY if the text explicitly mentions stock crashes, financial losses, failed projects, regulatory fines, or other clear financial setbacks.
-   **neutral**: Assign this for factual statements, announcements (like IPO plans or reports), or mentions without a clear, direct financial impact described in the text.

**OUTPUT FORMAT:**
For each valid entity, you must provide its name, type, sentiment, and a **brief reasoning** for your classification and sentiment choice. If you find no valid entities, return an empty list.
"""
human_prompt = "{text}"
prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", human_prompt)])

chain = prompt | structured_llm

def analyze_text_for_sentiment(text: str):
    """
    Analyzes text and returns a list of entities, along with token usage and cost.
    Returns a tuple: (List[EntitySentiment], dict)
    """
    if not structured_llm:
        print("LLM not initialized. Skipping sentiment analysis.")
        return [], {}
    if not text or not isinstance(text, str) or len(text.strip()) < 20:
        return [], {}

    print(f"\nAnalyzing article for sentiment with strict rules using {LLM_PROVIDER}...")
    
    try:
        if LLM_PROVIDER == 'openai':
            # Use the get_openai_callback to track token usage and cost for OpenAI
            with get_openai_callback() as cb:
                response = chain.invoke({"text": text})
                usage_stats = {
                    "total_tokens": cb.total_tokens,
                    "prompt_tokens": cb.prompt_tokens,
                    "completion_tokens": cb.completion_tokens,
                    "total_cost_usd": cb.total_cost,
                }
                print(f"OpenAI Usage: {usage_stats['total_tokens']} tokens. Cost: ${usage_stats['total_cost_usd']:.6f} USD")
                return response.entities, usage_stats

        elif LLM_PROVIDER == 'groq':
            # CORRECTED: Use the custom callback to capture token usage for Groq
            token_callback = GroqTokenUsageCallback()
            response = chain.invoke(
                {"text": text},
                config={"callbacks": [token_callback]}
            )
            
            token_usage = token_callback.usage
            input_tokens = token_usage.get('prompt_tokens', 0)
            output_tokens = token_usage.get('completion_tokens', 0)
            total_tokens = token_usage.get('total_tokens', 0)

            # Pricing for Llama3-8B on Groq
            GROQ_PRICE_PER_MILLION_INPUT = 0.05 
            GROQ_PRICE_PER_MILLION_OUTPUT = 0.05

            cost = ((input_tokens / 1_000_000) * GROQ_PRICE_PER_MILLION_INPUT) + \
                   ((output_tokens / 1_000_000) * GROQ_PRICE_PER_MILLION_OUTPUT)
            
            usage_stats = {
                "total_tokens": total_tokens,
                "prompt_tokens": input_tokens,
                "completion_tokens": output_tokens,
                "total_cost_usd": cost,
            }
            print(f"Groq Usage: {usage_stats['total_tokens']} tokens. Est. Cost: ${usage_stats['total_cost_usd']:.6f} USD")
            return response.entities, usage_stats
        
        else:
            return [], {}

    except Exception as e:
        print(f"An error occurred during sentiment analysis: {e}")
        return [], {}
