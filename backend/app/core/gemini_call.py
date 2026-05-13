import json
import time
from google.genai import types
from google.genai.errors import ClientError

from app.core.api_key_manager import (
    get_client_and_key,
    report_rate_limit,
    report_success,
)

# Retryable Gemini errors
_RETRYABLE_CODES = {429, 500, 503, 504}


def _extract_json(text: str) -> str:
    """
    Extract the first JSON object from the model response.
    Handles cases where the model adds extra text.
    """

    text = text.strip()

    # Remove markdown fences.
    if text.startswith("```json"):
        text = text[7:]

    if text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    # Find JSON object.
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:
        text = text[start:end + 1]

    return text.strip()


def gemini_call(
    prompt: str,
    max_retries: int = 5,
    max_output_tokens: int = 8192,
) -> str:
    """
    Stable Gemini call wrapper.
    """

    last_error = None

    for attempt in range(max_retries):

        client, key = get_client_and_key()

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=max_output_tokens,
                    response_mime_type="application/json",
                ),
            )

            text = getattr(response, "text", None)

            if not text or not text.strip():
                print(
                    f"[gemini_call] Empty response "
                    f"(attempt {attempt + 1})"
                )

                last_error = "Empty response"

                time.sleep(2 ** attempt)
                continue

            text = text.strip()

            report_success(key)

            return text

        except ClientError as e:

            code = getattr(e, "code", None)

            if code in _RETRYABLE_CODES:

                wait = 2 ** attempt

                if code == 429:
                    print(
                        f"Rate limit key {key[-6:]}, "
                        f"cooldown + rotate key"
                    )

                    report_rate_limit(key)

                else:
                    print(
                        f"Gemini {code} "
                        f"(attempt {attempt + 1}) "
                        f"retry in {wait}s"
                    )

                time.sleep(wait)

                last_error = str(e)
                continue

            print(f"Non-retryable Gemini error: {e}")
            raise RuntimeError(str(e)) from e

        except Exception as e:

            print(f"Gemini unknown error: {e}")

            last_error = str(e)

            time.sleep(2 ** attempt)

    raise RuntimeError(
        f"All Gemini retries failed. Last error: {last_error}"
    )


def gemini_json(
    prompt: str,
    fallback: dict,
    max_retries: int = 5,
    max_output_tokens: int = 8192,
) -> dict:
    """
    Gemini wrapper that parses JSON directly.
    """

    try:

        text = gemini_call(
            prompt=prompt,
            max_retries=max_retries,
            max_output_tokens=max_output_tokens,
        )

        print("\n================ RAW GEMINI ================\n")
        print(text)
        print("\n============================================\n")

        text = _extract_json(text)

        parsed = json.loads(text)

        if not isinstance(parsed, dict):
            raise ValueError("Response is not JSON object")

        return parsed

    except json.JSONDecodeError as e:

        print(f"JSON decode error: {e}")

        try:

            print("Retrying with larger token limit...")

            text = gemini_call(
                prompt=prompt,
                max_retries=2,
                max_output_tokens=min(
                    max_output_tokens * 2,
                    32768,
                ),
            )

            text = _extract_json(text)

            return json.loads(text)

        except Exception as retry_err:

            print(f"Retry failed: {retry_err}")
            print("Using fallback response")

            return fallback

    except Exception as e:

        print(f"gemini_json failed: {e}")
        print("Using fallback response")

        return fallback
