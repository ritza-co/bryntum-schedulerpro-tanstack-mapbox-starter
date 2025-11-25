import { StringHelper } from '@bryntum/schedulerpro';
import type Task from './lib/Task';
import type { BryntumSchedulerProProps } from '@bryntum/schedulerpro-react';
import './lib/AddressSearchField';

export const schedulerproProps: BryntumSchedulerProProps = {
    startDate    : new Date(2025, 11, 1, 8),
    endDate      : new Date(2025, 11, 1, 20),
    flex         : 8,
    minHeight    : 0,
    rowHeight    : 80,
    barMargin    : 4,
    eventStyle   : 'bordered',
    collapsible  : true,
    header       : false,
    allowOverlap : false,

    // Custom view preset with header configuration
    viewPreset : {
        tickWidth         : 20,
        displayDateFormat : 'LST',
        shiftIncrement    : 1,
        shiftUnit         : 'day',
        timeResolution    : {
            unit      : 'minute',
            increment : 30
        },
        headers : [
            {
                unit       : 'hour',
                dateFormat : 'LST'
            }
        ]
    },

    resourceImagePath : 'users/',

    columns : [
        {
            type           : 'resourceInfo',
            text           : 'Name',
            width          : 230,
            showEventCount : false,
            showRole       : true
        }
    ],

    stripeFeature      : true,
    eventBufferFeature : true,

    // Context menu for events
    eventMenuFeature : {
        items : {
            // Add custom "Unassign" menu item
            unassign : {
                text   : 'Unassign',
                icon   : 'fa fa-user-times',
                weight : 200,
                onItem : ({ eventRecord }: { eventRecord: Task }) => {
                    // Remove all assignments from the event
                    eventRecord.assignments.forEach((assignment: any) => {
                        assignment.remove();
                    });
                }
            }
        }
    },

    taskEditFeature : {
        items : {
            generalTab : {
                items : {
                    resourcesField : {
                        required : true
                    },
                    addressField : {
                        type   : 'addresssearchfield',
                        label  : 'Address',
                        name   : 'address',
                        weight : 100
                    },
                    preambleField : {
                        label : 'Travel to'
                    },
                    postambleField : {
                        label : 'Travel from'
                    }
                }
            }
        }
    },

    eventRenderer({ eventRecord }) {
        const task = eventRecord as Task;
        return [
            {
                tag       : 'span',
                className : 'event-name',
                html      : StringHelper.encodeHtml(task.name)
            },
            {
                tag       : 'span',
                className : 'location',
                children  : [
                    task.shortAddress
                        ? {
                            tag       : 'i',
                            className : 'fa fa-map-marker-alt'
                        }
                        : null,
                    task.shortAddress || ' '
                ]
            }
        ];
    },
    tbar : [
        {
            text  : 'Add task',
            ref   : 'newEventButton',
            color : 'b-green',
            icon  : 'fa fa-plus'
        },
        '->',
        {
            type     : 'datefield',
            ref      : 'dateField',
            width    : 200,
            editable : false,
            step     : 1
        },
        {
            type                 : 'textfield',
            ref                  : 'filterByName',
            placeholder          : 'Filter tasks',
            clearable            : true,
            keyStrokeChangeDelay : 100,
            triggers             : {
                filter : {
                    align : 'start',
                    cls   : 'fa fa-filter'
                } as any
            }
        },
        {
            type   : 'slidetoggle',
            ref    : 'toggleUnscheduled',
            label  : 'Show unscheduled',
            height : 'auto'
        }
    ]
};
