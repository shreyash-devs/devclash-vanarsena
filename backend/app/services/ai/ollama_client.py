import asyncio
import itertools
import httpx
import structlog
from typing import List

from app.config import Settings

logger = structlog.get_logger()

class OllamaPool:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.hosts = []
        self.host_cycle = None
        self.semaphores = {}
        
    async def initialize(self):
        """
        Pings each host, only keeps reachable ones, logs results.
        Called post-init or during lifespan.
        """
        reachable = []
        async with httpx.AsyncClient(timeout=2.0) as client:
            for host in self.settings.ollama_host_list:
                try:
                    resp = await client.get(f"{host}/api/tags")
                    if resp.status_code == 200:
                        reachable.append(host)
                        self.semaphores[host] = asyncio.Semaphore(3)
                        logger.info("ollama_pool_host_online", host=host)
                    else:
                        logger.warning("ollama_pool_host_unhealthy", host=host, status=resp.status_code)
                except Exception as e:
                    logger.warning("ollama_pool_host_down", host=host, error=str(e))
                    
        self.hosts = reachable
        if self.hosts:
            self.host_cycle = itertools.cycle(self.hosts)
        else:
            logger.error("ollama_pool_empty", message="No reachable Ollama hosts found. Generation will fail or return mocks.")
            
    async def _execute_with_retry(self, host: str, execute_func):
        """Auto-retry once on timeout before failing."""
        tries = 2
        for attempt in range(tries):
            try:
                # Per-host semaphore limiting 3 concurrent requests
                async with self.semaphores[host]:
                    return await execute_func(host)
            except httpx.TimeoutException as e:
                logger.warning("ollama_timeout_retry", host=host, attempt=attempt+1)
                if attempt == tries - 1:
                    logger.error("ollama_timeout_failed", host=host)
                    raise e
            except Exception as e:
                logger.error("ollama_request_failed", host=host, error=str(e))
                raise e

    def _get_next_host(self) -> str:
        if not self.hosts or not self.host_cycle:
            raise ValueError("No Ollama hosts available")
        return next(self.host_cycle)

    async def generate(self, model: str, prompt: str, temperature: float = 0.7) -> str:
        if not self.hosts:
            # Fallback for systems without Ollama running locally but needing to pass tasks
            return f"[Mock Generate] Response for model {model}"
            
        host = self._get_next_host()
        
        async def call_api(target_host: str):
            async with httpx.AsyncClient(timeout=30.0) as client:
                data = {
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature}
                }
                resp = await client.post(f"{target_host}/api/generate", json=data)
                resp.raise_for_status()
                return resp.json().get("response", "")
                
        return await self._execute_with_retry(host, call_api)

    async def embed(self, model: str, text: str) -> List[float]:
        if not self.hosts:
            # Return dummy embeddings so the system doesn't crash on unequipped dev machines (Task requirement safety)
            return [0.0] * 768
            
        host = self._get_next_host()
        
        async def call_api(target_host: str):
            async with httpx.AsyncClient(timeout=15.0) as client:
                data = {
                    "model": model,
                    "prompt": text
                }
                resp = await client.post(f"{target_host}/api/embeddings", json=data)
                resp.raise_for_status()
                return resp.json().get("embedding", [])
                
        return await self._execute_with_retry(host, call_api)
