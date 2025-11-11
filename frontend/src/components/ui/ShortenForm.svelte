<script lang="ts">
  import { onMount } from "svelte";
  import FormInputs from "./FormInputs.svelte";
  import ResultDisplay from "./ResultDisplay.svelte";
  import CaptchaModal from "./CaptchaModal.svelte";

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
        console.error("nonstress.js の読み込みに失敗しました。");
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
      captchaError = "";

      showCaptchaModal = true;
      resetSubmitButton();
      submitButtonText = "認証中...";
      isSubmitting = true;
    } catch (error) {
      displayError(error.message);
      resetSubmitButton();
    }
  }

  async function submitShortenRequest(captchaAnswer: string) {
    submitButtonText = "生成中...";
    isSubmitting = true;
    showCaptchaModal = false;

    if (isLoadingLibrary || !nonstress) {
      displayError("ライブラリが読み込めません。");
      resetSubmitButton();
      return;
    }

    let captchaFailed = false;

    try {
      nonstress.generateToken();
      const token = await nonstress.getToken();

      const response = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        alias = "";
      } else {
        const errorMessage =
          data.error?.message || "不明なエラーが発生しました。";
        displayError(errorMessage);

        if (data.error?.code === "CAPTCHA_FAILED") {
          captchaFailed = true;
          await fetchAndShowCaptcha();
          captchaError = "認証に失敗しました。もう一度お試しください。";
        }
      }
    } catch (error) {
      displayError(error.message || "サーバーとの通信に失敗しました。");
    } finally {
      if (!captchaFailed) {
        resetSubmitButton();
      }
    }
  }

  async function handleSubmit() {
    if (isLoadingLibrary) {
      displayError("もう一度お試しください。");
      return;
    }
    if (!nonstress) {
      displayError("ページをリロードしてください。");
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
</script>

<div id="app">
  <div class="container">
    <p class="subtitle">{serviceDescription}</p>

    <FormInputs
      bind:url
      bind:alias
      bind:urlInput
      {isSubmitting}
      {isLoadingLibrary}
      {submitButtonText}
      on:submit={handleSubmit}
      on:clear={handleClear}
    />

    <ResultDisplay {resultStatus} {resultMessage} />
  </div>
</div>

{#if showCaptchaModal}
  <CaptchaModal
    {captchaImage}
    {captchaOptions}
    {captchaError}
    on:selectOption={(e) => submitShortenRequest(e.detail)}
    on:cancel={handleCancelCaptcha}
  />
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

  :global(#captcha-image svg) {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius);
  }
</style>
