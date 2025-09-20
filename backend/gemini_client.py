import os
import json
import google.generativeai as genai
from google.generativeai import types
import base64
from datetime import datetime

# Read the API key from gemini.md
with open(os.path.join(os.path.dirname(__file__), "..", "gemini.md"), "r") as f:
    API_KEY = f.read().strip()

genai.configure(api_key=API_KEY)

prompt_query = """Prioritize highly reliable and authoritative sources for your analysis. 
        If a source's reliability is questionable, factor that into your assessment. 
        If the text provided to you is incomplete or you are unsure of the truth, use the given url to get the complete information of the provided selected text.

        If the provided text is not a statement, a question, or a coherent phrase that can be fact-checked, consider it a mistake from the user-end. 
        In this case, you MUST respond ONLY with a JSON object explaining the issue 
        (e.g., "The selected text is not a statement and cannot be analyzed.") 
        and put it under the key "brief-info",
        "percentage" should be equal to 0,
        'heading' should be "Ambiguous Search Query Result",
        'reasoning' should empty,
        'sources' should be an empty list.'

        Otherwise, you MUST respond ONLY with a JSON object with the following keys: 
        The JSON object must have the following keys: 
        'heading' (a brief, neutral, descriptive title for the text being analyzed, max 10 words), 
        'percentage' (an integer representing factual correctness from 0-100, search online(various other sites to analyze the correctness of the fact) and the provided url to get the percetage), 
        'brief_info' (a very brief summary of the analysis based on your percentage of the score and other online sources,
        start like this 'According to my research, ...',
        max 2 sentences), 
        'reasoning' (Based on the provided text, if the percentage shows that the given fact is the truth then provide a little more information other than whats in the provided text
        but if the provided text is false then search various other online sources for it and provide the corresponding truth, 
        start your sentance by providing information on the news provider and the companies involved,
        max 2 sentences),
        and 'sources' (a list of all the URLs that you used to check the correctness of the text.
        provide all teh urls that you used to check the correctness of the text,
        For each URL, include only those that are directly connected to the statement of the text provided so the users can verify your sources by themselves and
        ignore the ones which you used to learn about hte topic in general 
        
        )

        Do NOT include any other text or formatting outside the JSON object."""

def _clean_json_response(text: str) -> str:
    """
    Cleans the response from the Gemini API to extract the JSON object.
    Removes markdown code block fences and strips whitespace.
    """
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def get_gemini_response(text: str, url: str, model_name: str = 'gemini-2.5-flash-lite') -> dict:
    try:
        model = genai.GenerativeModel(model_name)        
        prompt = f"""You are an AI assistant that analyzes text for factual correctness. 
        {prompt_query}
        
      
      

Text to analyze:
'{text}' found it on {url}
"""
        print(f"[Gemini Client] Sending text analysis request to Gemini API...")
        response = model.generate_content(prompt)
        content = response.text
        print(f"[Gemini Client] Raw response from Gemini (text):\n{content}")
        cleaned_content = _clean_json_response(content)
        print(f"[Gemini Client] Cleaned response (text):\n{cleaned_content}")
        try:
            parsed_content = json.loads(cleaned_content)
            print(f"[Gemini Client] Successfully parsed JSON (text).")
            return parsed_content
        except json.JSONDecodeError:
            print(f"[Gemini Client] JSONDecodeError (text): Failed to parse cleaned response as JSON.\nRaw content: {content}")
            return {"error": "Failed to parse Gemini response as JSON", "raw_response": content}
    except Exception as e:
        print(f"[Gemini Client] Exception during text analysis API call: {e}")
        return {"error": f"An error occurred while requesting from Gemini API: {e}"}

 

def get_gemini_response_for_image(image_data: str, url: str, model_name: str = 'gemini-2.5-flash-lite') -> dict:
    model = genai.GenerativeModel(model_name)
    
    # The image data is a data URL: data:image/png;base64,...
    # We need to extract the base64 part.
    try:
        header, encoded = image_data.split(",", 1)
        
        # The image data is coming from canvas.toDataURL('image/png') which is a base64 string.
        # We need to decode it from base64.
        image_bytes = base64.b64decode(encoded)
        
        image_part = {
            "mime_type": "image/png", # Assuming PNG, since we get it from canvas.toDataURL('image/png')
            "data": image_bytes
        }

        prompt_text = f"""You are an AI assistant that analyzes images for factual correctness. Analyze the content of the image and provide a factual correctness score. 
        
        {prompt_query}

        The user found the image on {url}.
"""
    
        
        print(f"[Gemini Client] Sending image analysis request to Gemini API...")
        response = model.generate_content([prompt_text, image_part])
        content = response.text
        print(f"[Gemini Client] Raw response from Gemini (image):\n{content}")
        cleaned_content = _clean_json_response(content)
        print(f"[Gemini Client] Cleaned response (image):\n{cleaned_content}")
        try:
            parsed_content = json.loads(cleaned_content)
            print(f"[Gemini Client] Successfully parsed JSON (image).")
            return parsed_content
        except json.JSONDecodeError:
            print(f"[Gemini Client] JSONDecodeError (image): Failed to parse cleaned response as JSON.\nRaw content: {content}")
            return {"error": "Failed to parse Gemini response as JSON", "raw_response": content}

    except Exception as e:
        print(f"[Gemini Client] Exception during image analysis API call: {e}")
        return {"error": f"An error occurred while processing the image or requesting from Gemini API: {e}"}