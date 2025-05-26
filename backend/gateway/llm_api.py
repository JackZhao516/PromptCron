import os
import re
from openai import OpenAI
import logging
from typing import Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger('promptcron')

def get_ai_response(prompt) -> Tuple[str, str]:
    """Get response from OpenAI API with web search
    Returns:
        Tuple[str, str]: (response_content, citations)
    """
    # Verify API key is set
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        error_msg = "OPENAI_API_KEY environment variable is not set"
        logger.error(error_msg)
        return f"Error: {error_msg}", ""

    try:
        logger.info(f"prompt: {prompt}")
        client = OpenAI(
            api_key=api_key
        )
        response = client.responses.create(
            model="gpt-4.1",
            tools=[{
                "type": "web_search_preview",
                "search_context_size": "high",  # Get more context from each search result
            }],
            tool_choice="required",  # Force using web search
            temperature=0.7,
            instructions=
            """
                You are a helpful assistant with access to current information through web search.
                IMPORTANT: You MUST search the web for accurate information and cite your sources.
                For each fact or piece of information you provide:
                1. Include the specific URL where you found it
                2. Format citations as markdown links: [domain.com](full_url)
                3. Use multiple sources when possible for comprehensive information
            """,
            input=
            f"""Please search the web to answer this question accurately. Include URLs for your sources:
                {prompt}
            """
        )
        
        # Extract main response and citations
        response_content = response.output_text
        citations = []
        
        # Extract citations from the response
        if hasattr(response, 'output') and len(response.output) > 1:
            message = response.output[1]
            if hasattr(message, 'content') and len(message.content) > 0:
                content = message.content[0]
                if hasattr(content, 'annotations') and content.annotations:
                    for annotation in content.annotations:
                        if hasattr(annotation, 'type') and annotation.type == "url_citation":
                            domain = re.sub(r'^https?://(?:www\.)?([^/]+).*$', r'\1', annotation.url)
                            citations.append(f"- [{domain}]({annotation.url})\n")
        
        # try to extract URLs from the text using markdown link format
        urls = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', response_content)
        if urls:
            for domain, url in urls:
                citations.append(f"- [{domain}]({url})\n")
                
        # remove duplicate citations
        citations = "\n\n##Sources:\n" + "\n".join(sorted(list(set(citations)))) if citations else ""
        
        logger.info(f"successfully executed prompt: {prompt}")
        return response_content, citations
    except Exception as e:
        error_msg = f"Error getting AI response: {e}"
        logger.error(error_msg)
        return f"Error: {str(e)}", ""
