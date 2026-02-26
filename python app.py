import requests
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma


def query_ollama(prompt, model="gpt-oss:20b-cloud"):
    
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream":  False
        }   
    )

    if response.status_code != 200:
        raise Exception(f"Request failed with status code {response.status_code}: {response.text}")
    return response.json()["response"]

response = query_ollama("When did Nigeria get independence. " \
"Provide more context about the event.")
print(response)

response1 = query_ollama("Why did you say it was July 1 1960 before?")
print(response1)