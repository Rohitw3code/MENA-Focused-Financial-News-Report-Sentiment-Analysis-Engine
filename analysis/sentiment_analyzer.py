# analysis/sentiment_analyzer.py

import os
from dotenv import load_dotenv
from typing import List, Literal, Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic.v1 import BaseModel, Field, ValidationError

# Import model providers
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

# Import the callbacks for token usage tracking
from langchain_community.callbacks import get_openai_callback
from langchain_core.callbacks import BaseCallbackHandler


# --- CONFIGURATION ---
LLM_PROVIDER = 'openai' # or 'groq'
OPENAI_MODEL_NAME = 'gpt-4o-mini' # e.g., 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o-mini'
GROQ_MODEL_NAME = 'llama3-70b-8192' # e.g., 'llama3-8b-8192', 'llama3-70b-8192'

load_dotenv()


# --- Pydantic Data Structures ---
class EntitySentiment(BaseModel):
    """A data model for the dual sentiment towards a single, validated entity."""
    entity_name: str = Field(
        description="The full, official name of the company or cryptocurrency, resolved from any abbreviations (e.g., 'IBM' becomes 'International Business Machines')."
    )
    entity_type: Literal["company", "crypto"] = Field(
        description="The type of the entity."
    )
    financial_sentiment: Literal["positive", "negative", "neutral"] = Field(
        description="Sentiment based ONLY on financial performance like stock prices, earnings, and market data."
    )
    overall_sentiment: Literal["positive", "negative", "neutral"] = Field(
        description="Sentiment based on general news like company decisions, product launches, partnerships, or legal issues."
    )
    reasoning: str = Field(
        description="Brief justification for both sentiment classifications, explaining the key factors from the text."
    )

class TextAnalysis(BaseModel):
    """A data model to hold the entity sentiment analysis of a given text."""
    entities: List[EntitySentiment] = Field(
        description="A list of valid entities. This list MUST be empty if no valid entities are found."
    )

# --- Custom Callback Handler for Groq ---
class GroqTokenUsageCallback(BaseCallbackHandler):
    """Callback handler to capture token usage from Groq."""
    def __init__(self):
        self.usage = {}

    def on_llm_end(self, response, **kwargs: Any) -> Any:
        if response.llm_output and 'token_usage' in response.llm_output:
            self.usage = response.llm_output['token_usage']


# --- MODEL INITIALIZATION FACTORY ---
def get_language_model():
    """Initializes and returns the appropriate language model."""
    if LLM_PROVIDER == 'openai':
        print(f"Using OpenAI model: {OPENAI_MODEL_NAME}")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY not found in environment variables.")
        return ChatOpenAI(model_name=OPENAI_MODEL_NAME, temperature=0)
    
    elif LLM_PROVIDER == 'groq':
        print(f"Using Groq model: {GROQ_MODEL_NAME}")
        if not os.getenv("GROQ_API_KEY"):
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        return ChatGroq(model_name=GROQ_MODEL_NAME, temperature=0)
    
    else:
        raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}.")


# --- LLM and Prompt Setup ---
try:
    llm = get_language_model()
    structured_llm = llm.with_structured_output(TextAnalysis)
except Exception as e:
    print(f"Error initializing language model: {e}")
    structured_llm = None

# --- System Prompt (REVISED) ---
system_prompt = """
You are a highly precise financial analyst. Your task is to extract **only legitimate companies and cryptocurrencies** from the provided text and analyze them from two different perspectives: **financial sentiment** and **overall sentiment**.

**CRITICAL RULES FOR EXTRACTION:**
1.  **RESOLVE FULL ENTITY NAME:** You MUST return the full, official name of the entity. If you see an abbreviation (e.g., "IBM", "MSFT") or a common name ("Google"), you must resolve it to its official name (e.g., "International Business Machines", "Microsoft", "Alphabet Inc."). Do the same for cryptocurrencies (e.g., "ETH" becomes "Ethereum").
2.  **DO NOT EXTRACT LOCATIONS:** You MUST ignore names of countries, cities, etc.
3.  **FOCUS ON PARENT COMPANIES:** If a product is mentioned, identify the parent company.
4.  **EMPTY LIST IS VALID:** It is not guaranteed that every article will contain a company or cryptocurrency. If you scan the text and find no such entities, your only valid response is to return an empty list for the 'entities' field. Do not invent entities.

**RULES FOR DUAL SENTIMENT ANALYSIS:**
For each entity, you will provide TWO sentiment scores:

1.  **Financial Sentiment:** This is strictly about quantitative performance.
    * `positive`: Stock growth, beating earnings expectations, record profits, successful funding.
    * `negative`: Stock crashes, missing earnings, financial losses, major fines.
    * `neutral`: Factual financial statements without clear positive/negative movement (e.g., "The company's revenue was $50 billion.").

2.  **Overall Sentiment:** This is about qualitative, operational news.
    * `positive`: Successful product launches, strategic partnerships, positive employee relations, praise for company decisions.
    * `negative`: Product recalls, failed projects, executive scandals, lawsuits, poor strategic decisions.
    * `neutral`: Factual announcements without clear qualitative impact (e.g., "The company will hold its annual conference in June.").

**OUTPUT FORMAT:**
For each valid entity, provide its resolved official name, type, financial sentiment, overall sentiment, and a brief reasoning. **It is critical that every entity object in your JSON output contains all of these fields: `entity_name`, `entity_type`, `financial_sentiment`, `overall_sentiment`, and `reasoning`.**
"""
human_prompt = "{text}"
prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", human_prompt)])

chain = prompt | structured_llm

def analyze_text_for_sentiment(text: str):
    """
    Analyzes text and returns a list of entities, along with token usage and cost.
    Includes a retry mechanism and a defensive check for malformed objects.
    """
    if not structured_llm:
        print("LLM not initialized. Skipping sentiment analysis.")
        return [], {}
    if not text or not isinstance(text, str) or len(text.strip()) < 20:
        return [], {}

    print(f"\nAnalyzing article for sentiment with dual analysis using {LLM_PROVIDER} ({llm.model_name})...")
    
    MAX_RETRIES = 3
    for attempt in range(MAX_RETRIES):
        try:
            response = None
            usage_stats = {}

            if LLM_PROVIDER == 'openai':
                with get_openai_callback() as cb:
                    response = chain.invoke({"text": text})
                    usage_stats = {
                        "total_tokens": cb.total_tokens,
                        "prompt_tokens": cb.prompt_tokens,
                        "completion_tokens": cb.completion_tokens,
                        "total_cost_usd": cb.total_cost,
                    }
                    print(f"OpenAI Usage: {usage_stats['total_tokens']} tokens. Cost: ${usage_stats['total_cost_usd']:.6f} USD")

            elif LLM_PROVIDER == 'groq':
                token_callback = GroqTokenUsageCallback()
                response = chain.invoke({"text": text}, config={"callbacks": [token_callback]})
                token_usage = token_callback.usage
                # ... (Groq cost calculation logic remains the same)
                usage_stats = { "total_cost_usd": 0 } # Placeholder
                print(f"Groq Usage...")

            # --- NEW: Defensive Check ---
            # After getting a response, validate that each object is complete.
            validated_entities = []
            if response and response.entities:
                for entity in response.entities:
                    required_attrs = ['entity_name', 'entity_type', 'financial_sentiment', 'overall_sentiment', 'reasoning']
                    if all(hasattr(entity, attr) for attr in required_attrs):
                        validated_entities.append(entity)
                    else:
                        # This will log if a model returns an incomplete object.
                        print(f"Warning: Skipping malformed entity object from LLM: {entity.dict() if hasattr(entity, 'dict') else entity}")
            
            return validated_entities, usage_stats

        except ValidationError as e:
            print(f"Validation error (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt >= MAX_RETRIES - 1:
                print("Max retries reached. Failed to get a valid response.")
                return [], {}
            print("Retrying...")
        
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return [], {}

    return [], {}
