import re

with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix imports and remove urllib
content = re.sub(
    r'from datetime import datetime, timedelta, timezone.*?from uuid import uuid4',
    '''import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

import httpx''',
    content,
    flags=re.DOTALL
)

# 2. Remove global httpx_client
content = re.sub(
    r'httpx_client: httpx\.AsyncClient \| None = None\n+',
    '',
    content
)

# 3. Update call_openrouter_json
call_openrouter_orig = r'''async def call_openrouter_json\(system_prompt: str, user_prompt: str\) -> dict\[str, Any\]:.*?<<<<<<< HEAD.*?=======.*?(>>>>>>>.*?)\n.*?headers = \{'''

call_openrouter_new = '''async def call_openrouter_json(
    system_prompt: str, user_prompt: str, client: httpx.AsyncClient | None = None
) -> dict[str, Any]:
    if not OPENROUTER_API_KEY:
        raise OpenRouterError("OpenRouter is not configured")

    payload = {
        "model": OPENROUTER_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    headers = {'''

content = re.sub(call_openrouter_orig, call_openrouter_new, content, flags=re.DOTALL)

# 4. Update the retry loop in call_openrouter_json
retry_loop_orig = r'''    max_retries = 3.*?return json\.loads\(content\)
    except \(KeyError, IndexError, TypeError, json\.JSONDecodeError\) as exc:
        raise OpenRouterError\("OpenRouter returned an invalid response format"\) from exc'''

retry_loop_new = '''    max_retries = 3
    body = None
    for attempt in range(max_retries + 1):
        try:
            local_client = client
            if local_client is None:
                local_client = httpx.AsyncClient(
                    timeout=httpx.Timeout(5.0, read=OPENROUTER_TIMEOUT_SECONDS)
                )
                must_close = True
            else:
                must_close = False

            try:
                response = await local_client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    json=payload,
                    headers=headers,
                )
            finally:
                if must_close:
                    await local_client.aclose()

            if response.status_code in (429, 503):
                if attempt < max_retries:
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        backoff = int(retry_after)
                    else:
                        backoff = 2 ** attempt
                    
                    logger.warning(
                        "OpenRouter returned status %d. Retrying in %ds "
                        "(attempt %d/%d)...",
                        response.status_code,
                        backoff,
                        attempt + 1,
                        max_retries,
                    )
                    await asyncio.sleep(backoff)
                    continue
                else:
                    raise OpenRouterError(
                        f"OpenRouter request failed with status {response.status_code} "
                        f"after {max_retries} retries"
                    )

            response.raise_for_status()
            body = response.json()
            break
        except httpx.HTTPStatusError as exc:
            raise OpenRouterError(
                f"OpenRouter request failed: {exc.response.status_code} {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise OpenRouterError(f"OpenRouter connection failed: {exc}") from exc

    if not body:
        raise OpenRouterError("OpenRouter request failed to return a response body")

    try:
        content = body["choices"][0]["message"]["content"]
        return json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise OpenRouterError("OpenRouter returned an invalid response format") from exc'''

content = re.sub(retry_loop_orig, retry_loop_new, content, flags=re.DOTALL)

# 5. Update generate_session_payload
gen_session_orig = r'''async def generate_session_payload\(job_title: str, company: str, jd_text: str, resume_text: str\) -> tuple\[list\[GapItem\], int, list\[QuestionItem\], list\[RoadmapDay\]\]:
    try:
        response = await call_openrouter_json\('''

gen_session_new = '''async def generate_session_payload(
    job_title: str,
    company: str,
    jd_text: str,
    resume_text: str,
    client: httpx.AsyncClient | None = None,
) -> tuple[list[GapItem], int, list[QuestionItem], list[RoadmapDay]]:
    try:
        response = await call_openrouter_json(
            system_prompt='''

content = re.sub(gen_session_orig, gen_session_new, content)

# Also fix the call arguments to include client
call_openrouter_call_orig = r'''        response = await call_openrouter_json\(
            system_prompt=\(
(.*?)
            \),
            user_prompt=\(
(.*?)
            \),
        \)'''

call_openrouter_call_new = r'''        response = await call_openrouter_json(
            system_prompt=(
\1
            ),
            user_prompt=(
\2
            ),
            client=client,
        )'''

content = re.sub(call_openrouter_call_orig, call_openrouter_call_new, content, flags=re.DOTALL)


# 6. Update evaluate_mock_attempt
eval_mock_orig = r'''async def evaluate_mock_attempt\(question: str, answer: str\) -> tuple\[int, MockFeedback\]:
    # --- ML: always analyze confidence regardless of OpenRouter outcome ---
    confidence = ConfidenceAnalysis\(\*\*analyze_confidence\(answer\)\)

    try:
        response = await call_openrouter_json\('''

eval_mock_new = '''async def evaluate_mock_attempt(
    question: str, answer: str, client: httpx.AsyncClient | None = None
) -> tuple[int, MockFeedback]:
    # --- ML: always analyze confidence regardless of OpenRouter outcome ---
    confidence = ConfidenceAnalysis(**analyze_confidence(answer))

    try:
        response = await call_openrouter_json('''

content = re.sub(eval_mock_orig, eval_mock_new, content)

# 7. Update startup and shutdown
startup_shutdown_orig = r'''@app\.on_event\("startup"\)
async def startup\(\) -> None:
    global httpx_client
    httpx_client = httpx\.AsyncClient\(
        timeout=httpx\.Timeout\(5\.0, read=60\.0\),
        limits=httpx\.Limits\(max_keepalive_connections=20, max_connections=100\)
    \)
.*?@app\.on_event\("shutdown"\)
async def shutdown\(\) -> None:
    global httpx_client
    if httpx_client is not None:
        await httpx_client\.aclose\(\)'''

startup_shutdown_new = '''@app.on_event("startup")
async def startup() -> None:
    app.state.httpx_client = httpx.AsyncClient(
        timeout=httpx.Timeout(5.0, read=OPENROUTER_TIMEOUT_SECONDS),
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
    )
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logging.getLogger(__name__).exception("Failed to create database tables")
        raise


@app.on_event("shutdown")
async def shutdown() -> None:
    client = getattr(app.state, "httpx_client", None)
    if client is not None:
        await client.aclose()'''

content = re.sub(startup_shutdown_orig, startup_shutdown_new, content, flags=re.DOTALL)

# 8. Update create_session endpoint
create_session_orig = r'''@app\.post\("/api/users/\{user_id\}/sessions", response_model=InterviewSession, status_code=status\.HTTP_201_CREATED\)
async def create_session\(
    user_id: str,
    payload: CreateInterviewSessionRequest,
    _: UserTable = Depends\(require_current_user\),
    db: Session = Depends\(get_db\),
\) -> InterviewSession:
    gap_analysis, readiness, question_bank, roadmap = await generate_session_payload\(payload\.jobTitle, payload\.company, payload\.jdText, payload\.resumeText\)'''

create_session_new = '''@app.post("/api/users/{user_id}/sessions", response_model=InterviewSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    user_id: str,
    payload: CreateInterviewSessionRequest,
    request: Request,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> InterviewSession:
    client = getattr(request.app.state, "httpx_client", None)
    gap_analysis, readiness, question_bank, roadmap = await generate_session_payload(
        payload.jobTitle, payload.company, payload.jdText, payload.resumeText, client=client
    )'''

content = re.sub(create_session_orig, create_session_new, content)

# 9. Update create_mock_attempt endpoint
create_mock_orig = r'''@app\.post\("/api/users/\{user_id\}/mocks", response_model=MockAttempt, status_code=status\.HTTP_201_CREATED\)
async def create_mock_attempt\(
    user_id: str,
    payload: CreateMockAttemptRequest,
    _: UserTable = Depends\(require_current_user\),
    db: Session = Depends\(get_db\),
\) -> MockAttempt:
    if not payload\.question\.strip\(\):
        raise HTTPException\(status_code=status\.HTTP_422_UNPROCESSABLE_ENTITY, detail="Question must not be empty"\)
    if not payload\.userAnswer\.strip\(\):
        raise HTTPException\(status_code=status\.HTTP_422_UNPROCESSABLE_ENTITY, detail="Answer must not be empty"\)
    score, feedback = await evaluate_mock_attempt\(payload\.question, payload\.userAnswer\)'''

create_mock_new = '''@app.post("/api/users/{user_id}/mocks", response_model=MockAttempt, status_code=status.HTTP_201_CREATED)
async def create_mock_attempt(
    user_id: str,
    payload: CreateMockAttemptRequest,
    request: Request,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> MockAttempt:
    if not payload.question.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Question must not be empty")
    if not payload.userAnswer.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Answer must not be empty")
    
    client = getattr(request.app.state, "httpx_client", None)
    score, feedback = await evaluate_mock_attempt(payload.question, payload.userAnswer, client=client)'''

content = re.sub(create_mock_orig, create_mock_new, content)


with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
