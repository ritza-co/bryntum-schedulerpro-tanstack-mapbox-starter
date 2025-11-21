import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/scheduler')({
    component : Scheduler,
    // Disable SSR for this route since Bryntum is a client-side component
    ssr       : false
});

function Scheduler() {
    return (
        <div>
            TODO: Add Scheduler Pro
        </div>
    );
}