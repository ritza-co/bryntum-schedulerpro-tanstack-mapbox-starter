import { useEffect, useState } from 'react';
import type { SchedulerPro } from '@bryntum/schedulerpro';

export interface UnplannedTask {
    id: string | number;
    name: string;
    address?: {
        display_name?: string;
        lat?: number;
        lon?: number;
    };
    duration: number;
    durationUnit: string;
    preamble?: string;
    postamble?: string;
}

/**
 * Hook to filter unscheduled tasks from Bryntum Scheduler Pro's event store
 *
 */
export function useUnplannedTasks(scheduler: SchedulerPro | null | undefined) {
    const [tasks, setTasks] = useState<Array<UnplannedTask>>([]);

    useEffect(() => {
        if (!scheduler) return;

        const { project } = scheduler;

        // Events without assignments are unscheduled
        const filterUnplannedTasks = () => {
            const unplanned = project.eventStore.records.filter(
                (eventRecord: any) => !eventRecord.assignments || eventRecord.assignments.length === 0
            );

            setTasks(
                unplanned.map((event: any) => ({
                    id           : event.id,
                    name         : event.name || '',
                    address      : event.address,
                    duration     : event.duration || 0,
                    durationUnit : event.durationUnit || 'h',
                    // Convert Bryntum Duration objects to any (to handle in component)
                    preamble     : event.preamble,
                    postamble    : event.postamble
                }))
            );
        };

        // Initial filter
        filterUnplannedTasks();

        // Listen to store changes (same pattern as maps-demo)
        // When assignments change, refresh the filtered data
        const eventStoreListeners = {
            change : filterUnplannedTasks
        };

        const assignmentStoreListeners = {
            change : filterUnplannedTasks
        };

        project.eventStore.on(eventStoreListeners);
        project.assignmentStore.on(assignmentStoreListeners);

        // Cleanup listeners
        return () => {
            // Check if stores still exist before removing listeners (they may be destroyed during navigation)
            project.eventStore.un(eventStoreListeners);

            project.assignmentStore.un(assignmentStoreListeners);
        };
    }, [scheduler]);

    return tasks;
}
