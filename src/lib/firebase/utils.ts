
import { Timestamp } from 'firebase/firestore';

export const convertFirebaseTimestampToString = (ts: any): string => {
    if (!ts) return new Date().toISOString(); // Fallback for undefined or null
    if (ts instanceof Timestamp) {
        return ts.toDate().toISOString();
    }
    // Handling for serialized Timestamps (e.g., from server-side rendering or direct data)
    if (typeof ts === 'object' && ts !== null && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
        return new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000).toISOString();
    }
    // If it's already a string, assume it's an ISO string or try to parse
    if (typeof ts === 'string') {
        try {
            const date = new Date(ts);
            if (!isNaN(date.getTime())) { // Check if it's a valid date string
                return date.toISOString();
            }
        } catch (e) {
          // If parsing fails, fall through to default
        }
    }
    // Fallback if the format is unknown
    console.warn("Unhandled timestamp format in convertFirebaseTimestampToString, returning current date as ISO string:", ts);
    return new Date().toISOString(); 
};
