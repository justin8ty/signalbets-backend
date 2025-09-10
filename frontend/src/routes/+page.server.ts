import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    try {
        // Assuming the backend is running on localhost:3000
        const res = await fetch('http://localhost:3000/polls');
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Backend error:', errorText);
            return {
                polls: [],
                error: `Failed to load polls. Status: ${res.status}`
            };
        }

        const data = await res.json();
        
        return {
            polls: data.polls ?? []
        };

    } catch (error: any) {
        console.error('Failed to fetch polls:', error);
        return {
            polls: [],
            error: 'Could not connect to the backend. Is it running?'
        };
    }
};
