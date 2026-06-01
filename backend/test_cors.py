import requests

backend_url = "https://dineinflow.onrender.com"
test_origin = "https://dineinflowd-git-main-amixsites-projects.vercel.app"
session_id = "sess_WwiDq8jMaytSl342sBS5kw"

print("--- Testing OPTIONS Preflight request ---")
headers_options = {
    "Origin": test_origin,
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "content-type"
}
res_options = requests.options(f"{backend_url}/api/session/{session_id}", headers=headers_options)
print("OPTIONS Status:", res_options.status_code)
print("OPTIONS Headers:")
for k, v in res_options.headers.items():
    if "access-control" in k.lower():
        print(f"  {k}: {v}")

print("\n--- Testing GET request ---")
headers_get = {
    "Origin": test_origin
}
res_get = requests.get(f"{backend_url}/api/session/{session_id}", headers=headers_get)
print("GET Status:", res_get.status_code)
print("GET Headers:")
for k, v in res_get.headers.items():
    if "access-control" in k.lower():
        print(f"  {k}: {v}")
