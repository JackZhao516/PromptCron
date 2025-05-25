import os
import openai

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

async def get_ai_response(prompt):
    """Get response from OpenAI API"""
    try:
        response = await openai.ChatCompletion.create(
            model="gpt-4-1106-preview",  # Using the latest GPT-4 model with internet access
            messages=[
                {"role": "system", "content": "You are a helpful assistant with access to current information through the internet."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error getting AI response: {e}")
        return f"Error: {str(e)}" 
