<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	let { form }: { form: ActionData } = $props();

	let options = $state(['', '']);

	function addOption() {
		if (options.length < 5) {
			options.push('');
		}
	}

	function removeOption(index: number) {
		if (options.length > 2) {
			options.splice(index, 1);
		}
	}
</script>


<div class="container mx-auto p-8 max-w-2xl">
	<h1 class="text-4xl font-bold text-gray-800 mb-8">Create a New Poll</h1>

	<Card.Root class="p-8">
		{#if form?.error}
			<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
				<p><strong class="font-bold">Error:</strong> {form.error}</p>
			</div>
		{/if}

		<form method="POST" use:enhance>
			<div class="mb-6">
				<Label for="question" class="block mb-2 text-lg font-medium">Poll Question</Label>
				<Input
					id="question"
					name="question"
					value={form?.question || ''}
					placeholder="What's on your mind?"
					required
				/>
			</div>

			<div class="mb-4">
				<Label class="block mb-2 text-lg font-medium">Options</Label>
				<div class="space-y-3">
					{#each options as option, i (i)}
						<div class="flex items-center gap-2">
							<Input
								name="options"
								bind:value={options[i]}
								placeholder={`Option ${i + 1}`}
							/>
							{#if options.length > 2}
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onclick={() => removeOption(i)}
								>
									X
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="flex justify-between items-center mb-8">
				<Button
					type="button"
					variant="outline"
					onclick={addOption}
					disabled={options.length >= 5}
				>
					+ Add Option
				</Button>
				<span class="text-sm text-gray-500">{options.length} / 5</span>
			</div>

			<div class="flex items-center justify-end gap-4">
				<Button variant="ghost" href="/" as="a">
					Cancel
				</Button>
				<Button type="submit" variant="default">
					Create Poll
				</Button>
			</div>
		</form>
	</Card.Root>
</div>
