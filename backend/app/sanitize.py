import re

RESUME_MAX_LENGTH = 10000
JD_MAX_LENGTH = 5000
QUESTION_MAX_LENGTH = 2000
ANSWER_MAX_LENGTH = 2000

INJECTION_PATTERNS = [
    r"ignore\s+previous\s+instructions",
    r"ignore\s+all\s+instructions",
    r"disregard\s+previous\s+instructions",
    r"reveal\s+system\s+prompt",
    r"show\s+hidden\s+prompt",
    r"act\s+as\s+system",
    r"override\s+instructions",
]


def sanitize_input(text: str) -> str:
    if not text:
        return ""

    sanitized = text.strip()

    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(
            pattern,
            "[REMOVED]",
            sanitized,
            flags=re.IGNORECASE,
        )

    return sanitized


def wrap_user_input(text: str) -> str:
    return f"<user_input>\n{text}\n</user_input>"


def sanitize_and_wrap(text: str) -> str:
    return wrap_user_input(sanitize_input(text))
