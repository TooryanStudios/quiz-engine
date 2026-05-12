import httpx
from unittest.mock import patch
import sys

# We'll just define a mock class to capture httpx.post
original_post = httpx.Client.post

def intercept_post(self, url, **kwargs):
    print('URL:', url)
    print('JSON:', kwargs.get('json'))
    sys.exit(0)

httpx.Client.post = intercept_post

import xai_sdk
client = xai_sdk.Client(api_key='fake_key')
client.image.sample(
    prompt='test prompt',
    model='grok-imagine-image-quality',
    image_urls=['http://test.com/1.jpg', 'http://test.com/2.jpg']
)
