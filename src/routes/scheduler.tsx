import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { type DateField, DateHelper, type SchedulerPro as SchedulerProInstance, type SlideToggle, type Splitter } from '@bryntum/schedulerpro';
import { type BryntumSchedulerPro, BryntumSchedulerProProjectModel, BryntumSplitter } from '@bryntum/schedulerpro-react';
import SchedulerPro from '@/components/SchedulerPro';
import { UnplannedTasksTable } from '@/components/UnplannedTasksTable';
import MapPanel from '@/lib/MapPanel';
import Task from '@/lib/Task';

import '@bryntum/schedulerpro/fontawesome/css/fontawesome.css';
import '@bryntum/schedulerpro/fontawesome/css/solid.css';
import '@bryntum/schedulerpro/schedulerpro.css';
import '@bryntum/schedulerpro/svalbard-light.css';

export const Route = createFileRoute('/scheduler')({
    component : Scheduler,
    // Disable SSR for this route since Bryntum is a client-side component
    ssr       : false
});

function Scheduler() {
    const schedulerproRef = useRef<BryntumSchedulerPro>(null);
    const projectRef = useRef<BryntumSchedulerProProjectModel>(null);
    const [schedulerInstance, setSchedulerInstance] = useState<SchedulerProInstance>();
    const [unplannedSplitter, setUnplannedSplitter] = useState<Splitter>();
    const [tableCollapsed, setTableCollapsed] = useState(false);
    const [mapPanel, setMapPanel] = useState<MapPanel>();

    // Event handler: clicking an event should show its marker on the map
    const onEventClick = ({ eventRecord }: { eventRecord: any }) => {
        const task = eventRecord as Task;
        if (task.marker && mapPanel) {
            mapPanel.showTooltip(task, true);
        }
    };

    // Event handler: after saving an event, scroll its marker into view on the map
    const onAfterEventSave = ({ eventRecord }: { eventRecord: any }) => {
        const task = eventRecord as Task;
        if (task.marker && mapPanel) {
            mapPanel.scrollMarkerIntoView(task);
        }
    };

    // Event handler: marker click from map
    const onMarkerClick = async({ eventRecord }: { eventRecord: Task }) => {
        const scheduler = schedulerproRef.current?.instance;
        if (!scheduler) return;

        if (eventRecord.resources.length > 0) {
            await scheduler.scrollEventIntoView(eventRecord, { animate : true, highlight : true });
            scheduler.selectedEvents = [eventRecord];
        }
    };

    // Define event handlers for toolbar widgets
    const onDateFieldChange = ({ value, userAction }: { value: Date; userAction: boolean }) => {
        const scheduler = schedulerproRef.current?.instance;
        if (userAction && scheduler) {
            const startTime = DateHelper.add(value, 8, 'hour');
            const endTime = DateHelper.add(value, 20, 'hour');
            scheduler.setTimeSpan(startTime, endTime);
        }
    };

    const onFilterChange = ({ value }: { value: string }) => {
        const scheduler = schedulerproRef.current?.instance;
        if (scheduler) {
            const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            scheduler.eventStore.filter({
                filters : (event: Task) => new RegExp(escapedValue, 'i').test(event.name),
                replace : true
            });
        }
    };

    const onNewEventClick = () => {
        const scheduler = schedulerproRef.current?.instance;
        const project = projectRef.current?.instance;
        if (scheduler && project) {
            const newTask = new (project.eventStore.modelClass as typeof Task)({
                startDate : scheduler.startDate
            });
            scheduler.editEvent(newTask);
        }
    };

    const onToggleUnscheduled = ({ value }: { value: boolean }) => {
        setTableCollapsed(!value);
    };

    const onUnplannedSplitterToggle = ({ eventName }: { eventName: string }): void => {
        const newValue = eventName === 'splitterCollapseClick';
        const slideToggle = schedulerproRef.current?.instance?.widgetMap['toggleUnscheduled'] as SlideToggle;
        if (slideToggle) {
            slideToggle.value = newValue;
        }
        setTableCollapsed(!newValue);
    };

    // Wire up splitter toggle events
    useEffect(() => {
        if (unplannedSplitter) {
            unplannedSplitter.on({
                splitterExpandClick   : onUnplannedSplitterToggle,
                splitterCollapseClick : onUnplannedSplitterToggle
            } as any);
        }
    }, [unplannedSplitter]);

    // Initialize components when both scheduler and project are ready
    useEffect(() => {
        const schedulerPro = schedulerproRef.current?.instance,
            project = projectRef.current?.instance;

        if (schedulerPro && project) {

            // Wire events to widgets
            const widgetMap = schedulerPro.widgetMap;

            (widgetMap['dateField'] as DateField).value = schedulerPro.startDate;
            widgetMap['dateField'].on('change', onDateFieldChange);

            widgetMap['newEventButton'].on('click', onNewEventClick);

            widgetMap['filterByName'].on('change', onFilterChange);

            (widgetMap['toggleUnscheduled'] as SlideToggle).value = true;
            widgetMap['toggleUnscheduled'].on('change', onToggleUnscheduled);

            setSchedulerInstance(schedulerPro);

            // Create MapPanel with 20% width (flex: 2 vs scheduler's flex: 8 = 20%)
            const mapPanelInstance = new MapPanel({
                ref         : 'map',
                appendTo    : 'content',
                flex        : 2,
                collapsible : true,
                header      : false,
                eventStore  : schedulerPro.eventStore,
                timeAxis    : schedulerPro.timeAxis,
                listeners   : {
                    markerclick : onMarkerClick
                }
            } as any);

            setMapPanel(mapPanelInstance);

            // Cleanup function
            return () => {
                mapPanelInstance.destroy?.();
            };
        }
    }, []);

    return (
        <>
            {/* Project model with data loading */}
            <BryntumSchedulerProProjectModel
                ref={projectRef}
                autoLoad={true}
                loadUrl="data/data.json"
                eventModelClass={Task}
                validateResponse={true}
            />

            <div className="demo-app">
                {/* Top row: Scheduler + Map */}
                <div id="content" className="b-side-by-side">
                    <SchedulerPro
                        ref={schedulerproRef}
                        project={projectRef}
                        onEventClick={onEventClick}
                        onAfterEventSave={onAfterEventSave}
                    />
                    <BryntumSplitter showButtons={true} />
                    {/* MapPanel will append itself here via appendTo: 'content' */}
                </div>

                {/* Splitter between top and bottom */}
                {schedulerInstance && (
                    <BryntumSplitter
                        showButtons="end"
                        onPaint={({ firstPaint, source }) => {
                            if (firstPaint) {
                                setUnplannedSplitter(source as Splitter);
                            }
                        }}
                    />
                )}
                <UnplannedTasksTable scheduler={schedulerInstance} collapsed={tableCollapsed} />
            </div>
        </>
    );
}
