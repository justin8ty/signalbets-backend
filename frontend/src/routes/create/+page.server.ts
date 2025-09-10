import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const question = data.get('question');
		const options = data.getAll('options').filter(o => o.toString().trim() !== '');

		if (!question || question.toString().length < 3) {
			return fail(400, { question, options, error: 'Question must be at least 3 characters long.' });
		}

		if (options.length < 2) {
			return fail(400, { question, options, error: 'You must provide at least two options.' });
		}

		try {
			const res = await fetch('http://localhost:3000/polls', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ question, options })
			});

			if (!res.ok) {
				const errorBody = await res.json();
				return fail(res.status, { question, options, error: errorBody.message || 'Failed to create poll.' });
			}

			const { pollId } = await res.json();
			throw redirect(303, `/polls/${pollId}`);

		} catch (error: any) {
            if (error.status === 303) throw error; // rethrow redirects
			console.error('Error creating poll:', error);
			return fail(500, { question, options, error: 'Could not create poll. Is the backend running?' });
		}
	}
};
