
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import {
		Chart,
		BarController,
		CategoryScale,
		LinearScale,
		BarElement,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';
    import { PUBLIC_API_URL } from '$env/static/public';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart;
	let ws: WebSocket;
    const connectionStatus = writable('Connecting...');

	onMount(() => {
		Chart.register(
			BarController,
			CategoryScale,
			LinearScale,
			BarElement,
			Title,
			Tooltip,
			Legend
		);

        const initialLabels = data.poll.options.map((opt: any) => opt.text);
        const initialData = data.poll.options.map((opt: any) => {
            const result = data.initialResults.results?.[opt.id] ?? 0;
            return result;
        });

		const chartData = {
			labels: initialLabels,
			datasets: [
				{
					label: 'Votes',
					data: initialData,
					backgroundColor: 'rgba(79, 70, 229, 0.8)',
					borderColor: 'rgba(79, 70, 229, 1)',
					borderWidth: 1
				}
			]
		};

		chart = new Chart(canvas, {
			type: 'bar',
			data: chartData,
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				},
                animation: {
                    duration: 500
                },
                responsive: true,
                maintainAspectRatio: false
			}
		});

		// WebSocket connection
        const wsUrl = PUBLIC_API_URL.replace(/^http/, 'ws');
		ws = new WebSocket(`${wsUrl}/polls/${data.poll.id}/results/ws`);

		ws.onopen = async () => {
            console.log('WebSocket connection opened!');
            connectionStatus.set('Live');
            await tick();
        };

		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === 'VOTE_UPDATE') {
                const newVoteCounts = data.poll.options.map((opt: any) => message.results[opt.id] || 0);
				chart.data.datasets[0].data = newVoteCounts;
				chart.update('none'); // use 'none' for a smoother update
			}
		};

        ws.onclose = () => {
            connectionStatus.set('Connection closed. Refresh to reconnect.');
        };

        ws.onerror = () => {
            connectionStatus.set('Error connecting to live results.');
        };
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
		}
		if (chart) {
			chart.destroy();
		}
	});

</script>

<div class="container mx-auto p-8 max-w-4xl">
    <a href="/" class="text-indigo-600 hover:text-indigo-800 mb-6 inline-block">&larr; Back to Polls</a>
	<h1 class="text-4xl font-bold text-gray-800 mb-2">{data.poll.question}</h1>
    <p class="text-gray-500 mb-8">Vote for your favorite option below.</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
			<h2 class="text-2xl font-bold mb-6">Cast Your Vote</h2>
            <form method="POST" use:enhance>
                <div class="space-y-4">
                    {#each data.poll.options as option (option.id)}
                        <label class="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors duration-200">
                            <input type="radio" name="optionId" value={option.id} class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300">
                            <span class="ml-4 text-lg text-gray-800">{option.text}</span>
                        </label>
                    {/each}
                </div>
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg mt-6 shadow-md hover:shadow-lg transition-all duration-300">
                    Submit Vote
                </button>
                 {#if form?.error}
                    <p class="text-red-500 mt-4 text-center">{form.error}</p>
                {/if}
                {#if form?.success}
                    <p class="text-green-500 mt-4 text-center">Vote cast successfully!</p>
                {/if}
            </form>
		</div>

		<div class="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <div class="flex justify-between items-center mb-4">
			    <h2 class="text-2xl font-bold">Live Results</h2>
                <span class="text-sm font-medium px-3 py-1 rounded-full
                    {$connectionStatus === 'Live' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    {$connectionStatus}
                </span>
            </div>
			<div class="relative h-80">
				<canvas bind:this={canvas}></canvas>
			</div>
		</div>
	</div>
</div>
