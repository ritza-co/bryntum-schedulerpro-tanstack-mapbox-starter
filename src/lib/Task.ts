import { type Duration, EventModel } from '@bryntum/schedulerpro';
import type Address from './Address';

export default class Task extends EventModel {
    declare address: Address;
    declare marker: mapboxgl.Marker;
    declare preamble: Duration;
    declare postamble: Duration;
    declare duration: number;

    static get fields() {
        return [
            { name : 'address', type : 'object' },
            // in this demo, default duration for tasks will be 1 hour (instead of days)
            { name : 'duration', type : 'number', defaultValue : 1 },
            { name : 'durationUnit', defaultValue : 'h' }
        ];
    }

    get shortAddress() {
        return (this.address?.display_name || '').split(',')[0];
    }
}
