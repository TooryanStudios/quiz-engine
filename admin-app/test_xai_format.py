import requests
import sys
from unittest.mock import patch

# Mock the requests.Session.request method to intercept the request
def intercept_request(self, method, url, **kwargs):
    print("URL:", url)
    print("JSON:", kwargs.get("json"))
    sys.exit(0)

with patch("requests.Session.request", intercept_request):
    import xai_sdk
    client = xai_sdk.Client(api_key="fake_key")
    try:
        client.image.sample(
            prompt="test prompt",
            model="grok-imagine-image-quality",
            image_urls=["http://test.com/1.jpg", "http://test.com/2.jpg"]
        )
    except SystemExit:
        pass
    except Exception as e:
        print("Error:", e)
