<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto p-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-4xl font-bold text-gray-800">Active Polls</h1>
		<a href="/create" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300">
			Create New Poll
		</a>
	</div>

	{#if data.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
			<strong class="font-bold">Error:</strong>
			<span class="block sm:inline">{data.error}</span>
		</div>
	{:else if data.polls && data.polls.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.polls as poll (poll.id)}
				<a href={`/polls/${poll.id}`} class="block p-6 bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
					<h5 class="mb-2 text-xl font-bold tracking-tight text-gray-900">{poll.question}</h5>
					<p class="font-normal text-gray-500 text-sm">Created: {new Date(poll.created_at).toLocaleString()}</p>
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
