from __future__ import annotations

"""
LLM Generator.
Priority: Groq (free) → Gemini (free) → OpenAI (paid) → fallback (no key)
"""

import asyncio
import logging
from typing import AsyncGenerator

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = (
    "You are a precise AI assistant. Answer ONLY from the provided context. "
    "If the answer is not in the context, say so clearly. "
    "Be concise and use Markdown when it helps readability."
)


def _active_llm() -> str:
    p = settings.llm_provider.lower()
    if p in ("groq", "gemini", "openai"):
        return p
    # auto: Groq → Gemini → OpenAI → none
    if settings.groq_api_key and len(settings.groq_api_key) > 10:
        return "groq"
    if settings.gemini_api_key and len(settings.gemini_api_key) > 10:
        return "gemini"
    if settings.openai_api_key and settings.openai_api_key.startswith("sk-"):
        return "openai"
    return "none"


class LLMGenerator:
    def __init__(self):
        self._groq = None
        self._openai = None

    @staticmethod
    def build_context(documents: list) -> str:
        if not documents:
            return "No relevant documents found in the knowledge base."
        parts = []
        for i, doc in enumerate(documents, 1):
            meta = doc["metadata"]
            parts.append(
                f"[Source {i}: {meta.get('source','?')} | "
                f"chunk {meta.get('chunk_index', 0)} | "
                f"relevance {doc.get('score', 0):.3f}]\n"
                f"{doc['content']}"
            )
        return "\n\n---\n\n".join(parts)

    async def stream(self, query: str, context: str) -> AsyncGenerator[str, None]:
        provider = _active_llm()
        logger.info(f"LLM provider: {provider}")
        if provider == "groq":
            async for t in self._stream_groq(query, context):
                yield t
        elif provider == "gemini":
            async for t in self._stream_gemini(query, context):
                yield t
        elif provider == "openai":
            async for t in self._stream_openai(query, context):
                yield t
        else:
            async for t in self._stream_fallback(context):
                yield t

    # ── Groq (FREE) ───────────────────────────────────────────────────────────

    def _get_groq(self):
        if self._groq is None:
            from groq import AsyncGroq
            self._groq = AsyncGroq(api_key=settings.groq_api_key)
        return self._groq

    async def _stream_groq(self, query: str, context: str) -> AsyncGenerator[str, None]:
        client = self._get_groq()
        stream = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Context:\n{context}\n\nQuestion: {query}"},
            ],
            stream=True,
            temperature=0.1,
            max_tokens=1024,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── Gemini ────────────────────────────────────────────────────────────────

    async def _stream_gemini(self, query: str, context: str) -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()
        prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion: {query}"

        def _run():
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_llm_model)
            resp = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1, max_output_tokens=1024,
                ),
                stream=True,
            )
            return [chunk.text for chunk in resp if chunk.text]

        tokens = await loop.run_in_executor(None, _run)
        for t in tokens:
            yield t

    # ── OpenAI ────────────────────────────────────────────────────────────────

    def _get_openai(self):
        if self._openai is None:
            from openai import AsyncOpenAI
            self._openai = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._openai

    async def _stream_openai(self, query: str, context: str) -> AsyncGenerator[str, None]:
        client = self._get_openai()
        stream = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Context:\n{context}\n\nQuestion: {query}"},
            ],
            stream=True, temperature=0.1, max_tokens=1024,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── No key fallback ───────────────────────────────────────────────────────

    async def _stream_fallback(self, context: str) -> AsyncGenerator[str, None]:
        msg = (
            "⚠️ **No LLM API key set.** Get a free Groq key (takes 30 seconds):\n\n"
            "1. Go to **https://console.groq.com**\n"
            "2. Sign up → API Keys → Create key\n"
            "3. Add `GROQ_API_KEY=your-key` to `.env`\n"
            "4. Run `docker-compose down && docker-compose up -d`\n\n"
            "---\n**Retrieved context (no AI summary):**\n\n"
            f"{context}"
        )
        for word in msg.split(" "):
            yield word + " "
            await asyncio.sleep(0.008)
