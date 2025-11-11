<script lang="ts">
  export let resultStatus: "idle" | "success" | "error";
  export let resultMessage: string;

  let isCopying = false;
  let copyButton: HTMLButtonElement;

  async function handleCopy() {
    const shortUrl = resultMessage;

    const setCopyingState = (state: boolean) => {
      isCopying = state;
      if (state === true) {
        setTimeout(() => {
          isCopying = false;
          if (document.activeElement !== copyButton) {
            copyButton?.focus();
          }
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
          aria-label={isCopying ? "コピーしました" : "コピー"}
          bind:this={copyButton}
        >
          {#if isCopying}
            <span class="copy-icon check-icon" aria-hidden="true"></span>
          {:else}
            <span class="copy-icon copy-icon-path" aria-hidden="true"></span>
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

<style>
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
</style>
