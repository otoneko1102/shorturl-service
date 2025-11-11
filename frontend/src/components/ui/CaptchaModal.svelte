<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let captchaImage: string;
  export let captchaOptions: string[];
  export let captchaError: string;

  const dispatch = createEventDispatcher();

  function handleSelect(option: string) {
    dispatch("selectOption", option);
  }

  function handleCancel() {
    dispatch("cancel");
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal" on:click|self={handleCancel}>
  <div class="modal-content">
    <h3>Captcha</h3>
    <p>正解を下の選択肢から選んでください。</p>

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
          on:click={() => handleSelect(option)}
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
      on:click={handleCancel}
    >
      キャンセル
    </button>
  </div>
</div>

<style>
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

  /* --- 修正箇所：このブロックを追加 --- */
  :global(#captcha-image svg) {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius);
  }
  /* --- 修正箇所ここまで --- */

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
  #captcha-cancel {
    background-color: #6c757d;
  }
  #captcha-cancel:hover {
    background-color: #5a6268;
  }
</style>
