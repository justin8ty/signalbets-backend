<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto p-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold text-gray-800">Active Polls</h1>
		<Button href="/create" variant="default">
			Create New Poll
		</Button>
	</div>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
			<strong class="font-bold">Error:</strong>
			<span class="block sm:inline">{data.error}</span>
		</div>
	{:else if data.polls && data.polls.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.polls as poll (poll.id)}
				<a href={`/polls/${poll.id}`} class="block">
					<Card.Root class="p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
						<Card.Header>
							<Card.Title class="text-xl">{poll.question}</Card.Title>
						</Card.Header>
						<Card.Description>
							Created: {new Date(poll.created_at).toLocaleString()}
						</Card.Description>
					</Card.Root>
				</a>
			{/each}
		</div>
	{:else}
		<div class="text-center py-16 px-4">
			<p class="text-gray-500 text-xl mb-4">No polls have been created yet.</p>
			<p class="text-gray-400">Be the first to create one!</p>
		</div>
	{/if}
</div>
