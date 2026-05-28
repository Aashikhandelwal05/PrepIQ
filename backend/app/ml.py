"""
ML/NLP module for PrepIQ.

Provides three local ML capabilities:
1. Resume skill extraction using spaCy NER + keyword matching
2. Resume-JD match scoring using TF-IDF cosine similarity
3. Answer confidence analysis using TextBlob sentiment
"""

from __future__ import annotations

import logging
import re
import threading
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-loaded ML models (loaded once on first use)
# ---------------------------------------------------------------------------

_spacy_lock = threading.Lock()
_spacy_cache: dict[str, object] = {}
_tfidf_vectorizer = None
_sentence_transformer_model = None


def _get_spacy():
    """Lazy-load spaCy model (thread-safe, no global mutation)."""
    if "nlp" in _spacy_cache:
        return _spacy_cache["nlp"]
    with _spacy_lock:
        if "nlp" not in _spacy_cache:
            try:
                import spacy
                _spacy_cache["nlp"] = spacy.load("en_core_web_sm")
                logger.info("spaCy model loaded successfully")
            except OSError:
                logger.warning("spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm")
                _spacy_cache["nlp"] = None
    return _spacy_cache["nlp"]


def _get_sentence_transformer():
    """Lazy-load sentence-transformers model."""
    global _sentence_transformer_model
    if _sentence_transformer_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Load the lightweight, fast model recommended in the issue
            _sentence_transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("sentence-transformers model 'all-MiniLM-L6-v2' loaded successfully")
        except Exception as exc:
            logger.warning("Failed to load sentence-transformers model: %s", exc)
            _sentence_transformer_model = False
    return _sentence_transformer_model if _sentence_transformer_model is not False else None


# ---------------------------------------------------------------------------
# Curated tech skill keywords (for matching beyond NER)
# ---------------------------------------------------------------------------

TECH_SKILLS = {
    # Programming Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
    "dart", "lua", "haskell", "elixir", "clojure",

    # Frontend
    "react", "reactjs", "react.js", "angular", "vue", "vuejs", "vue.js",
    "next.js", "nextjs", "nuxt", "svelte", "html", "css", "sass", "scss",
    "tailwind", "tailwindcss", "bootstrap", "jquery", "webpack", "vite",
    "redux", "zustand", "framer motion",

    # Backend
    "node", "nodejs", "node.js", "express", "expressjs", "fastapi", "flask",
    "django", "spring", "spring boot", "laravel", "rails", "ruby on rails",
    "asp.net", "gin", "fiber", "nestjs",

    # Databases
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite",
    "dynamodb", "cassandra", "elasticsearch", "neo4j", "firebase", "supabase",
    "prisma", "sequelize", "sqlalchemy", "mongoose",

    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci",
    "nginx", "apache", "linux", "bash", "shell scripting",

    # AI/ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "scikit-learn", "sklearn", "pandas", "numpy", "opencv", "nlp",
    "natural language processing", "computer vision", "transformers",
    "hugging face", "langchain", "openai", "llm",

    # Tools & Misc
    "git", "github", "gitlab", "bitbucket", "jira", "confluence",
    "figma", "postman", "swagger", "graphql", "rest", "restful",
    "api", "microservices", "agile", "scrum", "kanban",
    "testing", "jest", "pytest", "unittest", "cypress", "selenium",
    "oauth", "jwt", "websockets", "grpc",
}


# ---------------------------------------------------------------------------
# Feature 1: Resume Skill Extraction
# ---------------------------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    """
    Extract technical skills from resume text using spaCy NER + keyword matching.

    Returns a deduplicated list of recognized skills.
    """
    if not text or not text.strip():
        return []

    found_skills: set[str] = set()
    text_lower = text.lower()
    # Normalize separators and spacing for multi-word skill matching
    normalized_text = re.sub(r'[-_/]', ' ', text_lower)
    normalized_text = re.sub(r'\s+', ' ', normalized_text).strip()


    # Method 1: Keyword matching against curated skill list
    for skill in sorted(TECH_SKILLS, key=len, reverse=True):
        # Multi-word skills need safer boundary handling
        if ' ' in skill:
            pattern = r'(?<!\w)' + re.escape(skill) + r'(?!\w)'
        else:
            pattern = r'\b' + re.escape(skill) + r'\b'

        if re.search(pattern, normalized_text):

            # Avoid adding shorter overlapping skills
            if any(skill in existing.lower() for existing in found_skills):
                continue

            found_skills.add(
                skill.title() if len(skill) > 3 else skill.upper()
            )

    # Method 2: spaCy NER to catch additional entities
    nlp = _get_spacy()
    if nlp:
        try:
            # Limit text length for performance
            doc = nlp(text[:5000])
            for ent in doc.ents:
                if ent.label_ in ("ORG", "PRODUCT", "WORK_OF_ART"):
                    ent_lower = ent.text.lower().strip()
                    if ent_lower in TECH_SKILLS:
                        found_skills.add(ent.text.strip())
        except Exception as exc:
            logger.warning("spaCy NER failed: %s", exc)

    # Sort for consistent output
    return sorted(found_skills)


# ---------------------------------------------------------------------------
# Feature 2: Resume ↔ JD Match Score
# ---------------------------------------------------------------------------

def compute_match_score(resume_text: str, jd_text: str) -> dict[str, int]:
    """
    Compute similarity between resume and job description using semantic embeddings
    and TF-IDF + cosine similarity as a fallback.

    Returns a dict with semanticScore, keywordOverlapScore, and overallScore.
    """
    if not resume_text or not jd_text or not resume_text.strip() or not jd_text.strip():
        return {"semanticScore": 0, "keywordOverlapScore": 0, "overallScore": 0}

    keyword_score = 0
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),  # Unigrams and bigrams for better matching
            lowercase=True,
        )

        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

        # Scale similarity to 0-100 score
        keyword_score = min(100, max(0, int(similarity * 200)))
    except Exception as exc:
        logger.warning("TF-IDF match score failed: %s", exc)

    semantic_score = 0
    model = _get_sentence_transformer()
    if model:
        try:
            from sklearn.metrics.pairwise import cosine_similarity

            embeddings = model.encode([resume_text, jd_text])
            sim = cosine_similarity(embeddings[0:1], embeddings[1:2])[0][0]

            semantic_score = min(100, max(0, int(sim * 100)))
        except Exception as exc:
            logger.warning("Semantic match score failed: %s", exc)

    # Calculate overall score, weighted towards semantic score if available
    if model:
        overall_score = int(0.7 * semantic_score + 0.3 * keyword_score)
    else:
        overall_score = keyword_score

    return {
        "semanticScore": semantic_score,
        "keywordOverlapScore": keyword_score,
        "overallScore": overall_score
    }


# ---------------------------------------------------------------------------
# Feature 3: Answer Confidence Analysis
# ---------------------------------------------------------------------------

def analyze_confidence(answer_text: str) -> dict[str, Any]:
    """
    Analyze the confidence and quality of a mock interview answer
    using TextBlob sentiment analysis + text metrics.

    Returns a dict with:
    - confidenceScore: 0-100 overall confidence rating
    - sentiment: "positive", "neutral", or "negative"
    - specificity: 0-100 how specific/concrete the answer is
    - wordCount: total words in the answer
    """
    if not answer_text or not answer_text.strip():
        return {
            "confidenceScore": 0,
            "sentiment": "neutral",
            "specificity": 0,
            "wordCount": 0,
        }

    words = answer_text.split()
    word_count = len(words)
    sentences = [s.strip() for s in re.split(r'[.!?]+', answer_text) if s.strip()]
    sentence_count = max(1, len(sentences))

    # --- Sentiment analysis with TextBlob ---
    polarity = 0.0

    try:
        from textblob import TextBlob

        blob = TextBlob(answer_text)
        polarity = blob.sentiment.polarity        # -1.0 to 1.0

    except Exception as exc:
        logger.warning("TextBlob sentiment analysis failed: %s", exc)

    # Classify sentiment
    if polarity > 0.1:
        sentiment = "positive"
    elif polarity < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # More numbers, percentages, and concrete metrics = more specific
    number_count = len(re.findall(r'\b\d+[\d,.]*%?\b', answer_text))
    metric_keywords = ["increased", "decreased", "improved", "reduced", "achieved",
                       "delivered", "built", "managed", "led", "saved", "generated",
                       "revenue", "users", "clients", "team", "project"]
    metric_hits = sum(1 for kw in metric_keywords if kw in answer_text.lower())

    specificity_raw = (number_count * 15) + (metric_hits * 8)
    specificity = min(100, max(0, specificity_raw))

    # --- Confidence score ---
    # Composite of: sentiment, length, specificity, sentence structure
    length_score = min(40, word_count * 0.2)           # Up to 40 pts for length (200+ words)
    sentiment_score = max(0, (polarity + 1) * 15)      # Up to 30 pts for positive tone
    specificity_score = specificity * 0.2               # Up to 20 pts for specifics
    structure_score = min(10, sentence_count * 2)       # Up to 10 pts for multi-sentence

    confidence_score = int(min(100, length_score + sentiment_score + specificity_score + structure_score))

    return {
        "confidenceScore": confidence_score,
        "sentiment": sentiment,
        "specificity": specificity,
        "wordCount": word_count,
    }
