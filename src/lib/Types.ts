import type { EventStore, PanelConfig, PanelListeners, ResourceModel, TimeAxis } from '@bryntum/schedulerpro';

import type Task from './Task';

// MapPanel types
export interface MarkerConfig {
    color: string;
}

export interface PopupConfig {
    offset: [number, number];
}

// Bryntum types
type constructParamsListeners = PanelListeners & { markerclick: (params: { eventRecord: Task }) => void };

export type constructParams = PanelConfig & {
    appendTo: string;
    eventStore: EventStore;
    flex: number;
    listeners: constructParamsListeners;
    ref: string;
    timeAxis: TimeAxis;
};

// Extend Bryntum types
export type DragDropContext = {
    // Base DragHelper context properties
    element: HTMLElement;
    target: HTMLElement;
    grabbed: HTMLElement;
    relatedElements: Array<HTMLElement>;
    valid: boolean;
    newX: number;
    newY: number;

    // Custom properties
    task: Task;
    totalDuration: number;
    resourceRecord?: ResourceModel;
};
