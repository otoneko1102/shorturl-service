# SHORTURL SERVICE
簡単に短縮URLサービスを構築するためのテンプレートです。  
日本語用です。

## Features
- [x] URL Shortener
- [x] Custom ID
- [x] Ban Domains
- [x] SSL & Redirect
- [x] Captcha

## Setup
以下の手順を踏むことで簡単に短縮リンクサービスを構築することができます。

### 0. Buy short domain(s) & Install packages
説明は省きます。

#### Required environment
| Name | Version |
| :-- | :-- |
| Ubuntu | v22.04 |

#### Required packages
| Name | Version |
| :-- | :-- |
| Git | v2.43.x |
| Node.js | v22.15.x |
| NPM | v10.9.x |
| PM2 | v6.0.x |
| Nginx | v1.24.x |
| Certbot | v2.9.x |

### 1. Clone repo
```bash
git clone https://github.com/otoneko1102/shorturl-service.git
```

### 2. Edit .env
以下の例のように作成します。

```conf
# Example of backend/.env
PORT=3000
DOMAIN="example.com"
DATABASE_PATH="./lib/database.db"
```

```conf
# Example of frontend/.env
VITE_SERVICE_NAME="example URL Shortener"
VITE_SERVICE_DESCRIPTION="シンプルで高速な短縮URLサービス"
```

### 3. Run commands
以下のコマンドを順に実行します。
pm2の `--name` はオプションです。
```bash
cd shorturl-service
cd frontend
npm install
npm run build
cd ..
cd backend
npm install
pm2 start index.js --name shorturl-service
```

### 4. Edit nginx
自宅サーバーやレンタルサーバーで動かすための設定です。

#### 4.1. Edit server settings
`%DOMAIN%`, `%PORT%` を実際のものに置き換えてください。  
`/etc/nginx/sites-available/%DOMAIN%` を編集します。  
以下は一例です。  
例ではwww付きをwww無しにリダイレクトさせていますが、不必要なら削除してください。

```bash
nano /etc/nginx/sites-available/%DOMAIN%
```

以下のコードをペーストして保存します。  
Certbotなどで証明書を取得していない場合は該当箇所をコメントアウトしてください。

```conf
server {
    listen 80;
    listen [::]:80;
    server_name %DOMAIN$ www.%DOMAIN%;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    location / {
        return 301 https://%DOMAIN%$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.%DOMAIN%;

    ssl_certificate /etc/letsencrypt/live/%DOMAIN%/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/%DOMAIN%/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://%DOMAIN%$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name %DOMAIN%;

    root /var/www/shorturl-service/frontend/build;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/%DOMAIN%/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/%DOMAIN%/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass http://localhost:%PORT%;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ @backend;
    }

    location @backend {
        proxy_pass http://localhost:%PORT%;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4.2. Apply config
```bash
sudo ln -s /etc/nginx/sites-available/%DOMAIN% /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4.3. Apply Certbot
```bash
sudo certbot --nginx -d %DOMAIN% -d www.%DOMAIN%
sudo nginx -t
sudo systemctl restart nginx
```
