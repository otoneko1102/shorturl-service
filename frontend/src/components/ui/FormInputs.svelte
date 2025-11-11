<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let url: string;
  export let alias: string;
  export let isSubmitting: boolean;
  export let isLoadingLibrary: boolean;
  export let submitButtonText: string;
  export let urlInput: HTMLInputElement = undefined;

  const dispatch = createEventDispatcher();

  function handleSubmit() {
    dispatch("submit");
  }

  function handleClear() {
    dispatch("clear");
  }
</script>

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
      Loading...
    {:else}
      {submitButtonText}
    {/if}
  </button>

  <button type="button" class="submit-button" on:click={handleClear}>
    クリア
  </button>
</form>

<style>
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
</style>
