<script lang="ts">
    import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();

	let options = ['', ''];

	function addOption() {
		if (options.length < 5) {
			options = [...options, ''];
		}
	}

	function removeOption(index: number) {
		if (options.length > 2) {
			options = options.filter((_, i) => i !== index);
		}
	}
</script>

<div class="container mx-auto p-8 max-w-2xl">
    <h1 class="text-4xl font-bold text-gray-800 mb-8">Create a New Poll</h1>

    <form method="POST" use:enhance class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
        {#if form?.error}
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
                <p><strong class="font-bold">Error:</strong> {form.error}</p>
            </div>
        {/if}

        <div class="mb-6">
            <label for="question" class="block mb-2 text-lg font-medium text-gray-900">Poll Question</label>
            <input type="text" id="question" name="question" value={form?.question || ''} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3" placeholder="What's on your mind?" required>
        </div>

        <div class="mb-4">
            <label class="block mb-2 text-lg font-medium text-gray-900">Options</label>
            <div class="space-y-3">
                {#each options as option, i (i)}
                    <div class="flex items-center gap-2">
                        <input type="text" name="options" bind:value={options[i]} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3" placeholder={`Option ${i + 1}`}>
                        {#if options.length > 2}
                            <button type="button" on:click={() => removeOption(i)} class="text-red-500 hover:text-red-700 font-bold p-2">X</button>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>

        <div class="flex justify-between items-center mb-8">
            <button type="button" on:click={addOption} disabled={options.length >= 5} class="text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium py-2 transition-colors duration-300">
                + Add Option
            </button>
            <span class="text-sm text-gray-500">{options.length} / 5</span>
        </div>

        <div class="flex items-center justify-end gap-4">
            <a href="/" class="text-gray-600 hover:text-gray-800 font-medium py-2 px-4">Cancel</a>
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                Create Poll
            </button>
        </div>
    </form>
</div>
