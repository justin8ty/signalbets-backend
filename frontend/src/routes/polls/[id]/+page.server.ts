
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const fetchPoll = async () => {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/polls/${params.id}`);
			if (!res.ok) {
				throw error(res.status, 'Poll not found');
			}
			return await res.json();
		} catch (e: any) {
			throw error(500, e.message || 'Could not connect to backend');
		}
	};

	const fetchResults = async () => {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/polls/${params.id}/results`);
			if (!res.ok) {
				return {}; // Return empty if no results yet
			}
			return await res.json();
		} catch (e) {
			return {};
		}
	};

	return {
		poll: await fetchPoll(),
		initialResults: await fetchResults(),
		streamed: {
			results: fetchResults()
		}
	};
};

export const actions: Actions = {
	default: async ({ params, request, fetch }) => {
		const data = await request.formData();
		const optionId = data.get('optionId');

		if (!optionId) {
			return fail(400, { error: 'No option selected.' });
		}

		try {
			const res = await fetch(`${PUBLIC_API_URL}/polls/${params.id}/vote`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ optionId })
			});

			if (!res.ok) {
				const errorBody = await res.json();
				return fail(res.status, { error: errorBody.message || 'Failed to vote.' });
			}

			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Could not connect to backend.' });
		}
	}
};
