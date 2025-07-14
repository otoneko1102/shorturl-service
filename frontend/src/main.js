import "./style.css";

const footer = document.getElementsByTagName("footer")[0];

const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url-input");
const aliasInput = document.getElementById("alias-input");
const resultArea = document.getElementById("result-area");
const submitButton = document.getElementById("submit-button");
const clearButton = document.getElementById("clear-button");

const captchaModal = document.getElementById("captcha-modal");
const captchaImageContainer = document.getElementById("captcha-image");
const captchaInput = document.getElementById("captcha-input");
const captchaSubmitButton = document.getElementById("captcha-submit");
const captchaCancelButton = document.getElementById("captcha-cancel");
const captchaError = document.getElementById("captcha-error");

document.addEventListener("DOMContentLoaded", () => {
  const repo = document.createElement("a");
  repo.textContent = "GitHub Repo";
  repo.href = "https://github.com/otoneko1102/shorturl-service";
  repo.target = "_blank";

  footer.appendChild(repo);
});

let captchaToken = "";

function resetSubmitButton() {
  submitButton.textContent = "短縮する";
  submitButton.disabled = false;
}

async function fetchAndShowCaptcha() {
  submitButton.textContent = "認証中...";
  submitButton.disabled = true;
  captchaError.textContent = "";
  captchaImageContainer.innerHTML = "読み込み中...";

  try {
    const response = await fetch("/api/captcha");
    if (!response.ok) {
      throw new Error("CAPTCHAの取得に失敗しました。");
    }
    const data = await response.json();

    captchaToken = data.token;
    captchaImageContainer.innerHTML = data.image;

    captchaModal.style.display = "flex";
    captchaInput.value = "";
    captchaInput.focus();
    resetSubmitButton();
    submitButton.textContent = "認証中...";
    submitButton.disabled = true;
  } catch (error) {
    displayError(error.message);
    resetSubmitButton();
  }
}

async function submitShortenRequest() {
  submitButton.textContent = "生成中...";
  submitButton.disabled = true;
  captchaModal.style.display = "none";

  try {
    const response = await fetch("/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: urlInput.value,
        alias: aliasInput.value || null,
        captchaToken: captchaToken,
        captchaAnswer: captchaInput.value,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      displaySuccess(data.shortUrl);
    } else {
      const errorMessage =
        data.error?.message || "不明なエラーが発生しました。";
      displayError(errorMessage);
    }
  } catch (error) {
    displayError(error.message || "サーバーとの通信に失敗しました。");
  } finally {
    resetSubmitButton();
    aliasInput.value = "";
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!urlInput.value.trim()) {
    displayError("URLを入力してください。");
    return;
  }
  resultArea.innerHTML = "";
  fetchAndShowCaptcha();
});

clearButton.addEventListener("click", () => {
  urlInput.value = "";
  aliasInput.value = "";
  resultArea.innerHTML = "";
});

captchaSubmitButton.addEventListener("click", () => {
  if (!captchaInput.value.trim()) {
    captchaError.textContent = "文字を入力してください。";
    return;
  }
  submitShortenRequest();
});

captchaCancelButton.addEventListener("click", () => {
  captchaModal.style.display = "none";
  resetSubmitButton();
});

window.addEventListener("click", (e) => {
  if (e.target === captchaModal) {
    captchaModal.style.display = "none";
    resetSubmitButton();
  }
});

captchaInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    captchaSubmitButton.click();
  }
});

function displaySuccess(shortUrl) {
  resultArea.innerHTML = `
    <div class="result-success">
      <p>短縮URLが生成されました！</p>
      <div class="short-url-box">
        <a href="${shortUrl}" target="_blank">${shortUrl}</a>
        <button id="copy-button">コピー</button>
      </div>
    </div>
  `;
  const copyButton = document.getElementById("copy-button");
  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      const originalText = copyButton.textContent;
      copyButton.textContent = "完了！";
      copyButton.disabled = true;
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.disabled = false;
      }, 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
      alert("コピーに失敗しました。");
    }
    document.body.removeChild(textArea);
  };
  copyButton.addEventListener("click", () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(shortUrl)
        .then(() => {
          const originalText = copyButton.textContent;
          copyButton.textContent = "完了！";
          copyButton.disabled = true;
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.disabled = false;
          }, 2000);
        })
        .catch((err) => {
          console.error("Copy failed", err);
          alert("コピーに失敗しました。");
        });
    } else {
      fallbackCopy(shortUrl);
    }
  });
}

function displayError(message) {
  resultArea.innerHTML = `<div class="result-error">${message}</div>`;
}
