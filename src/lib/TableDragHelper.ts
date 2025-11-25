import { DomHelper, DragHelper, StringHelper } from '@bryntum/schedulerpro';

export class TableDragHelper extends DragHelper {
    scheduler: any;
    tableElement: any;

    // Use static configurable without 'get'
    static configurable = {
        callOnFunctions      : true,
        autoSizeClonedTarget : false,

        unifiedProxy : true,

        // Don't remove proxy on drop, we reuse it in the Scheduler
        removeProxyAfterDrop : false,

        // Clone the row element
        cloneTarget : true,

        // Drop zone is the scheduler timeline
        dropTargetSelector : '.b-timeline-sub-grid',

        // Draggable rows (using data-row-id attribute from TanStack Table)
        targetSelector : '[data-row-id]',

        // Don't constrain drag to container
        constrain : false
    };

    // Use constructor instead of construct
    constructor(config: any) {
        super({
            ...config,
            outerElement : config.tableElement
        });

        // Manually assign custom properties after super()
        this.scheduler = config.scheduler;
        this.tableElement = config.tableElement;
    }

    /**
     * Create visual proxy during drag
     * Creates a fake event bar that will be adopted by the Scheduler
     */
    override createProxy(grabbedElement: HTMLElement): HTMLDivElement {
        const scheduler = this.scheduler;
        const context = (this as any).context;

        // Safety check - scheduler should be set during construct
        if (!scheduler) {
            console.error('TableDragHelper: scheduler is undefined in createProxy');
            return document.createElement('div');
        }

        // Get task ID from data attribute
        const taskId = grabbedElement.getAttribute('data-row-id');
        if (!taskId) return document.createElement('div');

        // Get task from scheduler's event store
        const appointment = scheduler.project.eventStore.getById(taskId);
        if (!appointment) return document.createElement('div');

        // Store appointment in context for later use
        context.appointment = appointment;

        // Calculate widths for event and buffers (maps-demo-react pattern: Drag.ts:40-43)
        const durationInPixels = scheduler.timeAxisViewModel.getDistanceForDuration(appointment.durationMS);
        const preambleWidth = scheduler.timeAxisViewModel.getDistanceForDuration(
            appointment.preamble?.milliseconds || 0
        );
        const postambleWidth = scheduler.timeAxisViewModel.getDistanceForDuration(
            appointment.postamble?.milliseconds || 0
        );

        // Create proxy element (maps-demo-react pattern: Drag.ts:45)
        const proxy = document.createElement('div');
        proxy.classList.add('b-sch-horizontal', 'b-event-buffer');

        // Create inner HTML with event buffers (maps-demo-react pattern: Drag.ts:48-59)
        proxy.innerHTML = StringHelper.xss`
      <div class="b-sch-event-wrap b-colorize b-color-gray b-style-bordered b-unassigned-class b-sch-horizontal b-event-buffer ${scheduler.timeAxisSubGrid.width < durationInPixels ? 'b-exceeds-axis-width' : ''}" role="presentation" style="width:${durationInPixels + preambleWidth + postambleWidth}px;max-width:${scheduler.timeAxisSubGrid.width}px;height:${scheduler.rowHeight - 2 * (scheduler.resourceMargin as number)}px">
        <div class="b-sch-event-buffer b-sch-event-buffer-before" role="presentation" style="width: ${preambleWidth}px;"><span class="b-buffer-label" role="presentation">${appointment.preamble?.toString() || ''}</span></div>
        <div class="b-sch-event-buffer b-sch-event-buffer-after" role="presentation" style="width: ${postambleWidth}px;"><span class="b-buffer-label" role="presentation">${appointment.postamble?.toString() || ''}</span></div>
        <div class="b-sch-event b-has-content b-sch-event-with-icon">
          <div class="b-sch-event-content">
            <span class="event-name">${appointment.name}</span>
            <span class="location"> <i class="fa fa-map-marker-alt"></i>${appointment.shortAddress || ''}</span>
          </div>
        </div>
      </div>
    `;

        return proxy;
    }

    /**
     * Called when drag starts
     * Enables edge scrolling and disables tooltips
     */
    override onDragStart = () => {
        const { scheduler } = this;

        // Enable edge scrolling
        scheduler.enableScrollingCloseToEdges(scheduler.timeAxisSubGrid);

        // Disable tooltips during drag
        if (scheduler.features?.eventTooltip) {
            scheduler.features.eventTooltip.disabled = true;
        }
    };

    /**
     * Called during drag
     * Validates drop location and provides visual feedback
     */
    override onDrag = ({ context }: { context: any }): void => {
        const { scheduler } = this;
        const { appointment } = context;

        if (!appointment) {
            context.valid = false;
            return;
        }

        // Get date from mouse position
        const newStartDate = scheduler.getDateFromCoordinate(context.newX, 'round', false);

        // Get resource from drop target
        const doctor = context.target && scheduler.resolveResourceRecord(context.target);

        if (!newStartDate || !doctor) {
            context.valid = false;
            return;
        }

        // Calculate end date
        const endDate = new Date(newStartDate.getTime() + appointment.durationMS);

        // Check if time slot is available
        const isAvailable =
            scheduler.allowOverlap || scheduler.isDateRangeAvailable(newStartDate, endDate, null, doctor);

        // Check calendar working hours if available
        const calendar = doctor.calendar;
        const isWorkingTime = !calendar || calendar.isWorkingTime(newStartDate, endDate, true);

        // Mark valid/invalid for visual feedback
        context.valid = Boolean(newStartDate && doctor && isAvailable && isWorkingTime);
        context.doctor = doctor;
    };

    override onDrop = async({ context }: { context: any }): Promise<void> => {
        const { scheduler } = this;

        if (context.valid) {
            const { appointment, element, doctor } = context;

            // Get drop date from element position (more accurate than context.newX)
            const coordinate = DomHelper.getTranslateX(element);
            const dropDate = scheduler.getDateFromCoordinate(coordinate, 'round', false);

            if (dropDate && doctor) {
                try {
                    // Suspend animations for better performance (maps-demo-react pattern)
                    scheduler.suspendAnimations();

                    // Hand over data + existing element to Scheduler
                    // This reuses the proxy element for better performance
                    await scheduler.scheduleEvent({
                        eventRecord    : appointment,
                        startDate      : dropDate,
                        resourceRecord : doctor,
                        element        : element // Reuse the proxy element
                    });

                    // Explicitly set event color from resource if event doesn't have its own color
                    // This ensures the event bar and map marker get the correct color
                    if (!appointment.eventColor && doctor.eventColor) {
                        appointment.eventColor = doctor.eventColor;
                    }

                    // Resume animations
                    scheduler.resumeAnimations();

                    // The task will automatically disappear from the table because:
                    // 1. scheduleEvent() creates an assignment
                    // 2. assignmentStore fires a 'change' event
                    // 3. useUnplannedTasks hook detects the change
                    // 4. Hook filters out tasks with assignments
                    // 5. Table re-renders without the task
                }
                catch (error) {
                    console.error('Failed to schedule event:', error);
                    scheduler.resumeAnimations();
                }
            }
        }

        // Re-enable scrolling and tooltips
        scheduler.disableScrollingCloseToEdges(scheduler.timeAxisSubGrid);
        if (scheduler.features?.eventTooltip) {
            scheduler.features.eventTooltip.disabled = false;
        }
    };
}
