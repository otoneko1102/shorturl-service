# API Reference

## API Root

```text
/api
```

## How to use?

### Captcha

このエンドポイントはサイト側以外からの呼び出しをするべきではありません。

### Create

```text
POST /create
```

#### Request Body

application/json:

```json
{
  "url": "https://example.com",
  "key": "YOUR_API_KEY"
}
```

#### Response

```json
{ "url": "https://%DOMAIN%/%ID%" }
```

#### Example

axios:

```js
import axios from "axios";

(async () => {
  const url = "https://%DOMAIN%/api/create";
  const body = {
    url: "https://example.com",
    key: "XXXXXX",
  };

  try {
    const response = await axios.post(url, body);
    const data = response.data;
    console.log("成功:", data);
  } catch (error) {
    console.error("エラー:", error);
  }
})();
```

node-fetch:

```js
import fetch from "node-fetch";

(async () => {
  const url = "https://%DOMAIN%/api/create";
  const body = {
    url: "https://example.com",
    key: "XXXXXX",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("成功:", data);
    } else {
      const errorData = await response.json().catch(() => ({
        message: "エラー",
      }));
      throw new Error(`${response.status}`, { cause: errorData });
    }
  } catch (error) {
    console.error("エラー:", error);
  }
})();
```
