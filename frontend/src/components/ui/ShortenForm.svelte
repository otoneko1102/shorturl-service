<script lang="ts">
  import { onMount } from "svelte";

  export let serviceDescription = "A simple link shortener.";

  let url = "";
  let alias = "";
  let isSubmitting = false;
  let submitButtonText = "短縮する";
  let showCaptchaModal = false;
  let captchaToken = "";
  let captchaImage = "読み込み中...";
  let captchaOptions = [];
  let captchaError = "";

  type ResultStatus = "idle" | "success" | "error";
  let resultStatus: ResultStatus = "idle";
  let resultMessage = "";
  let isCopying = false;

  let nonstress;
  let isLoadingLibrary = true;

  let urlInput: HTMLInputElement;

  onMount(() => {
    if (window.innerWidth > 768 && urlInput) {
      urlInput.focus();
    }

    const checkInterval = setInterval(() => {
      if (typeof (window as any).nonstress !== "undefined") {
        clearInterval(checkInterval);
        nonstress = (window as any).nonstress;
        isLoadingLibrary = false;
      }
    }, 100);

    setTimeout(() => {
      if (isLoadingLibrary) {
        clearInterval(checkInterval);
        console.error(
          "nonstress.js の読み込みに失敗しました（タイムアウト）。",
        );
        submitButtonText = "読み込み失敗";
        isSubmitting = true;
      }
    }, 5000);
  });

  function resetSubmitButton() {
    submitButtonText = "短縮する";
    isSubmitting = false;
  }

  async function fetchAndShowCaptcha() {
    isSubmitting = true;
    submitButtonText = "認証中...";
    try {
      const response = await fetch("/api/captcha");
      if (!response.ok) {
        throw new Error("CAPTCHAの取得に失敗しました。");
      }
      const data = await response.json();

      captchaToken = data.token;
      captchaImage = data.image;
      captchaOptions = data.options;

      showCaptchaModal = true;
      resetSubmitButton();
      submitButtonText = "認証中...";
      isSubmitting = true;
    } catch (error) {
      displayError(error.message);
      resetSubmitButton();
    }
  }

  async function submitShortenRequest(captchaAnswer) {
    submitButtonText = "生成中...";
    isSubmitting = true;
    showCaptchaModal = false;

    if (isLoadingLibrary || !nonstress) {
      displayError("Proof-of-Workライブラリが読み込めません。");
      resetSubmitButton();
      return;
    }

    try {
      nonstress.generateToken();
      const token = await nonstress.getToken();

      const response = await fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          alias: alias || null,
          captchaToken: captchaToken,
          captchaAnswer: captchaAnswer,
          token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        displaySuccess(data.url);
      } else {
        const errorMessage =
          data.error?.message || "不明なエラーが発生しました。";
        displayError(errorMessage);
      }
    } catch (error) {
      displayError(error.message || "サーバーとの通信に失敗しました。");
    } finally {
      resetSubmitButton();
      alias = "";
    }
  }

  async function handleSubmit() {
    if (isLoadingLibrary) {
      displayError("ライブラリを準備中です。もう一度お試しください。");
      return;
    }
    if (!nonstress) {
      displayError(
        "Proof-of-Workライブラリが読み込めません。ページをリロードしてください。",
      );
      return;
    }

    if (!url.trim()) {
      displayError("URLを入力してください。");
      return;
    }

    resultStatus = "idle";
    resultMessage = "";

    await fetchAndShowCaptcha();
  }

  function handleClear() {
    url = "";
    alias = "";
    resultStatus = "idle";
    resultMessage = "";
  }

  function handleCancelCaptcha() {
    showCaptchaModal = false;
    resetSubmitButton();
  }

  function displaySuccess(shortUrl) {
    resultStatus = "success";
    resultMessage = shortUrl;
  }

  function displayError(message) {
    resultStatus = "error";
    resultMessage = message;
  }

  async function handleCopy() {
    const shortUrl = resultMessage;

    const setCopyingState = (state: boolean) => {
      isCopying = state;
      if (state === true) {
        setTimeout(() => {
          isCopying = false;
        }, 2000);
      }
    };

    const fallbackCopy = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopyingState(true);
      } catch (err) {
        console.error("Fallback copy failed", err);
        alert("コピーに失敗しました。");
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shortUrl);
        setCopyingState(true);
      } catch (err) {
        console.error("Copy failed", err);
        fallbackCopy(shortUrl);
      }
    } else {
      fallbackCopy(shortUrl);
    }
  }
</script>

<div id="app">
  <div class="container">
    <p class="subtitle">{serviceDescription}</p>

    <form on:submit|preventDefault={handleSubmit}>
      <label for="url-input">Long URL:</label>
      <input
        type="url"
        id="url-input"
        placeholder="https://www.example.com/long-url"
        required
        bind:value={url}
        bind:this={urlInput}
      />
      <label for="alias-input">Custom ID (Optional):</label>
      <input
        type="text"
        id="alias-input"
        placeholder="A-Z, a-z, 0-9, -, _"
        pattern="[a-zA-Z0-9-_]+"
        bind:value={alias}
      />

      <button
        type="submit"
        class="submit-button"
        disabled={isSubmitting || isLoadingLibrary}
      >
        {#if isLoadingLibrary}
          ライブラリ準備中...
        {:else}
          {submitButtonText}
        {/if}
      </button>

      <button type="button" class="submit-button" on:click={handleClear}>
        クリア
      </button>
    </form>

    <div id="result-area">
      {#if resultStatus === "success"}
        <div class="result-success">
          <p>短縮URLを生成しました！</p>
          <div class="short-url-box">
            <a href={resultMessage} target="_blank" rel="noopener noreferrer">
              {resultMessage}
            </a>
            <button
              class="copy-button-style"
              on:click={handleCopy}
              disabled={isCopying}
              aria-label="コピー"
            >
              {#if isCopying}
                <span class="copy-icon check-icon"></span>
              {:else}
                <span class="copy-icon copy-icon-path"></span>
              {/if}
            </button>
          </div>
        </div>
      {:else if resultStatus === "error"}
        <div class="result-error">
          {resultMessage}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showCaptchaModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" on:click|self={handleCancelCaptcha}>
    <div class="modal-content">
      <h3>Captcha</h3>
      <p>画像に表示されている文字列を、下の選択肢から選んでください。</p>

      <div class="captcha-area">
        <div id="captcha-image">
          {@html captchaImage}
        </div>
      </div>

      <div id="captcha-options">
        {#each captchaOptions as option}
          <button
            type="button"
            class="captcha-option-button"
            on:click={() => submitShortenRequest(option)}
          >
            {option}
          </button>
        {/each}
      </div>

      <p id="captcha-error">{captchaError}</p>

      <button
        type="button"
        id="captcha-cancel"
        class="submit-button"
        on:click={handleCancelCaptcha}
      >
        キャンセル
      </button>
    </div>
  </div>
{/if}

<style>
  #app {
    width: 100%;
    max-width: 500px;
    padding: 1rem;
  }
  .container {
    background: var(--container-bg);
    padding: 2rem 2.5rem;
    border-radius: var(--radius);
    box-shadow: 0 8px 25px var(--shadow-color);
    text-align: center;
    transition: background-color 0.2s;
  }
  .subtitle {
    color: #6c757d;
    margin-top: 0;
    margin-bottom: 2rem;
  }
  label {
    display: block;
    text-align: left;
    margin-bottom: 5px;
  }
  form input {
    width: 100%;
    padding: 12px;
    margin-bottom: 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    box-sizing: border-box;
    transition: border-color 0.3s;
    font-size: 16px;
    background-color: var(--container-bg);
    color: var(--text-color);
  }
  form input:focus {
    outline: none;
    border-color: var(--primary-color);
  }
  .submit-button {
    width: 100%;
    margin: 5px 0;
    padding: 12px;
    border: none;
    border-radius: var(--radius);
    background-color: var(--primary-color);
    color: #ffffff;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .submit-button:hover {
    background-color: #0056b3;
  }
  .submit-button:disabled {
    background-color: #a0c7ff;
    cursor: not-allowed;
  }
  #result-area {
    margin-top: 1.5rem;
    text-align: left;
  }

  .result-success,
  .result-error {
    padding: 1rem;
    border-radius: var(--radius);
  }

  .result-success {
    background-color: #e9f7ef;
    border: 1px solid var(--success-color);
    color: #155724;
  }
  .result-error {
    background-color: #f8d7da;
    color: var(--error-color);
    border: 1px solid var(--error-color);
    text-align: center;
  }

  .short-url-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    margin-top: 0.5rem;
    border: 1px solid #dddddd;
  }

  .short-url-box a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: bold;
    font-size: 12px;
    white-space: nowrap;
    overflow-x: auto;
    min-width: 0;
  }

  .copy-button-style {
    padding: 0.5rem;
    margin-left: 0.5rem;
    line-height: 0;
    border: 1px solid var(--primary-color);
    background-color: transparent;
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--primary-color);
  }
  .copy-button-style:disabled {
    cursor: not-allowed;
  }

  .copy-icon {
    width: 16px;
    height: 16px;
    display: block;
    background-color: currentColor;
  }
  .copy-icon-path {
    mask-image: url("/icons/copy.svg");
    mask-size: cover;
  }
  .check-icon {
    mask-image: url("/icons/check.svg");
    mask-size: cover;
  }

  :global([data-theme="dark"]) .result-success {
    background-color: #2e7d32;
    border-color: var(--success-color);
    color: #e8f5e9;
  }
  :global([data-theme="dark"]) .result-error {
    background-color: #5c0011;
    color: var(--error-color);
    border-color: var(--error-color);
  }
  :global([data-theme="dark"]) .short-url-box {
    background: #ffffff;
    border: 1px solid #dddddd;
  }

  .modal {
    display: flex;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
  }
  .modal-content {
    background-color: var(--container-bg);
    padding: 2rem;
    border-radius: var(--radius);
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
  .captcha-area {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1rem 0;
  }
  #captcha-image {
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    line-height: 0;
    background-color: #f9f9f9;
    min-width: 150px;
    min-height: 50px;
  }
  :global(#captcha-image svg) {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius);
  }
  #captcha-error {
    color: var(--error-color);
    min-height: 1.2em;
    margin-top: 1rem;
  }
  #captcha-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
    margin: 1.5rem 0;
  }
  .captcha-option-button {
    padding: 12px;
    font-size: 1rem;
    font-family: monospace, sans-serif;
    background-color: var(--background-color);
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    color: var(--text-color);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s;
    word-break: break-all;
  }
  .captcha-option-button:hover {
    background-color: var(--container-bg);
    border-color: #999999;
  }
  #captcha-cancel {
    background-color: #6c757d;
  }
  #captcha-cancel:hover {
    background-color: #5a6268;
  }
</style>
