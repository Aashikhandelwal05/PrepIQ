import requests

# Step 1: Base URL of your backend
BASE_URL = "http://127.0.0.1:8000"

# Step 2: Paste your real token here
token = "eyJlbWFpbCI6InNocmFkZGhhOUBnbWFpbC5jb20iLCJleHAiOjE3ODA1ODQxODMsInN1YiI6ImY0ZWIyNTEwLWM3ZjctNDA0MS04YzMwLWMxOGI3MmNkYjlhZCJ9.9c5612274efc7f831b6e1159d60a86e56e758710a360b4feba9fdde0b15f63b5"

# Step 3: Paste your real user ID here
user_id = "f4eb2510-c7f7-4041-8c30-c18b72cdb9ad"

# Step 4: Headers (VERY IMPORTANT)
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Step 5: Intentionally invalid payload
payload = {
    "companyName": "",
    "jobTitle": "   ",
    "jobUrl": "not-a-url",
    "status": "Applied",
}

# Step 6: Send POST request
response = requests.post(
    f"{BASE_URL}/api/users/{user_id}/jobs", json=payload, headers=headers
)

# Step 7: Print results
print("STATUS CODE:", response.status_code)
print("RESPONSE JSON:", response.json())
