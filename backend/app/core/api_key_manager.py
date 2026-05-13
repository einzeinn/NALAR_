import os
import threading
import time
from itertools import cycle
from google import genai
from dotenv import load_dotenv

load_dotenv()

class APIKeyManager:
    def __init__(self):
        self.keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if not key:
                break
            self.keys.append(key)
            i += 1
        
        if not self.keys:
            raise ValueError("No GEMINI_API_KEY_* found in .env")
            
        self._lock = threading.Lock()
        self._round_robin = cycle(range(len(self.keys)))  # index cycle
        self._cooldowns = {}   # key -> timestamp until it can be reused
    
    def get_client_and_key(self) -> tuple:
        """
        Return (client, key) using round-robin selection,
        skipping keys that are currently in cooldown.
        If all keys are cooling down, wait until one is ready.
        """
        with self._lock:
            start_time = time.time()
            tried = 0
            while tried < len(self.keys):
                idx = next(self._round_robin)
                key = self.keys[idx]
                until = self._cooldowns.get(key)
                if until and time.time() < until:
                    tried += 1
                    continue
                return genai.Client(api_key=key), key
            
            # All keys are cooling down; wait for the soonest available key.
            min_key = min(self._cooldowns, key=lambda k: self._cooldowns[k])
            wait = self._cooldowns[min_key] - time.time()
            if wait > 0:
                time.sleep(wait)
            return genai.Client(api_key=min_key), min_key
    
    def report_rate_limit(self, key: str):
        """Put a rate-limited key on a 20-second cooldown."""
        with self._lock:
            self._cooldowns[key] = time.time() + 20
            print(f"Key {key[-6:]} rate-limited, cooldown 20s")
    
    def report_success(self, key: str):
        """Clear cooldown after a key is used successfully."""
        with self._lock:
            self._cooldowns.pop(key, None)

_manager = APIKeyManager()

def get_client_and_key():
    return _manager.get_client_and_key()

def report_rate_limit(key: str):
    _manager.report_rate_limit(key)

def report_success(key: str):
    _manager.report_success(key)
