<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import ModeToggle from '$lib/components/ui/mode-toggle.svelte';

	let { children } = $props();

	import '../app.css';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="flex justify-between items-center p-4 border-b bg-background">
	<div class="flex items-center space-x-4">
		<h1 class="font-bold text-lg">SignalBets</h1>
		<nav class="flex space-x-4">
			<a href="/" class="text-sm hover:text-primary transition-colors">Polls</a>
			<a href="/create" class="text-sm text-muted-foreground hover:text-primary transition-colors">Create</a>
		</nav>
	</div>
	<ModeToggle />
</header>

<main class="container mx-auto p-8">
	{@render children?.()}
</main>
