import mapboxgl from 'mapbox-gl';
import { type ButtonConfig, type ButtonGroupConfig, EventHelper, type EventStore, Panel, type PanelConfig, type StoreListeners, StringHelper, TimeAxis, Toast, type WidgetConfig } from '@bryntum/schedulerpro';
import type { MarkerConfig, PopupConfig, constructParams } from './Types';
import type Task from './Task';

class CustomTimeAxis extends TimeAxis {
    declare isTimeSpanInAxis: (eventRecord: Task) => boolean;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const detectWebGL = () => {
    try {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const supported = Boolean(canvas.getContext('webgl'));
        canvas.remove();
        return supported;
    }
    catch (e) {
        return false;
    }
};

// A simple class containing a MapboxGL JS map instance
export default class MapPanel extends Panel {
    // Class properties
    static override type = 'mappanel';
    static override $name = 'MapPanel';

    declare map: mapboxgl.Map;
    declare popup: mapboxgl.Popup;
    declare lon: number;
    declare lat: number;
    declare zoom: number;
    declare eventStore: EventStore;
    declare timeAxis: CustomTimeAxis;

    // Configuration
    static get configurable() {
        return {
            monitorResize : true,
            // Some defaults of the initial map display
            zoom          : 11,
            lat           : 40.7128,
            lon           : -74.006,
            textContent   : false,

            // Toolbar buttons
            tbar : [this.createTitleWidget(), this.createZoomButtonGroup()]
        } as PanelConfig;
    }

    constructor(args: constructParams) {
        super(args);
    }

    // Initialization methods
    private static createTitleWidget = (): WidgetConfig => ({
        type : 'widget',
        cls  : 'widget-title',
        html : 'Map View',
        flex : 1
    });

    private static createZoomButtonGroup = (): ButtonGroupConfig => ({
        type        : 'buttonGroup',
        ref         : 'zoomGroup',
        toggleGroup : true,
        items       : [
            {
                icon    : 'fa fa-plus',
                onClick : 'up.onZoomIn'
            },
            {
                icon    : 'fa fa-minus',
                onClick : 'up.onZoomOut'
            }
        ] as Array<ButtonConfig>
    });

    // Lifecycle methods
    override construct(...args: Array<constructParams>) {
        const me = this;

        super.construct(...args);

        if (!detectWebGL()) {
            Toast.show({
                html    : `ERROR! Can not show show maps. WebGL is not supported!`,
                color   : 'b-red',
                style   : 'color:white',
                timeout : 0
            });
            return;
        }

        const mapContainerEl = me.contentElement;

        me.map = new mapboxgl.Map({
            container : mapContainerEl,
            style     : 'mapbox://styles/mapbox/streets-v11',
            center    : [me.lon, me.lat],
            zoom      : me.zoom
        });

        // First load the map and then set up our event listeners for store CRUD and time axis changes
        me.map.on('load', async() => {
            // code editor destroys created Widgets on editing code
            if (me.isDestroying) {
                return;
            }

            mapContainerEl.classList.add('maploaded');

            // await for the project commit to complete to have all data normalized before adding the markers
            // otherwise the `this.timeAxis.isTimeSpanInAxis(eventRecord)` check may fail in the
            // `addEventMarker()` method, because of the missing end date in the record
            await me.eventStore.project.commitAsync();

            me.onStoreChange({
                action  : 'dataset',
                records : me.eventStore.records,
                source  : me.eventStore,
                record  : me.eventStore.records[0],
                changes : {}
            });
        });

        me.eventStore.on('change', me.onStoreChange, me);
        me.timeAxis.on('reconfigure', me.onTimeAxisReconfigure, me);

        EventHelper.addListener(mapContainerEl, 'click', me.onMapClick, {
            delegate : '.mapboxgl-marker',
            element  : mapContainerEl,
            thisObj  : me
        });
    }

    // Map interaction methods
    onZoomIn() {
        this.map.zoomIn();
    }

    onZoomOut() {
        this.map.zoomOut();
    }

    // Marker management
    addEventMarker(eventRecord: Task) {
        const { lat, lon } = eventRecord.address;
        if (!lat || !lon || (!this.timeAxis.isTimeSpanInAxis(eventRecord) && eventRecord.isScheduled)) return;

        const marker = this.createMarker(eventRecord, lat, lon);
        this.attachMarkerToEvent(marker, eventRecord);
    }

    private createMarker(eventRecord: Task, lat: number, lon: number) {
        // Get color from event, or first assigned resource, or default grey
        const resource = eventRecord.resource;
        const color = eventRecord.eventColor || resource?.eventColor || '#f0f0f0';
        return new mapboxgl.Marker({ color } as MarkerConfig).setLngLat([lon, lat]);
    }

    private attachMarkerToEvent(marker: mapboxgl.Marker, eventRecord: Task) {
        marker.getElement().id = eventRecord.id.toString();
        eventRecord.marker = marker;
        (marker as any).eventRecord = eventRecord;
        marker.addTo(this.map);
    }

    removeEventMarker(eventRecord: Task) {
        const marker = eventRecord.marker;
        if (marker) {
            if ((marker as any).popup) {
                (marker as any).popup.remove();
                (marker as any).popup = null;
            }
            marker.remove();
        }
        (eventRecord as any).marker = null;
    }

    removeAllMarkers() {
        this.eventStore.forEach((eventRecord: Task) => this.removeEventMarker(eventRecord));
    }

    // Map view methods
    scrollMarkerIntoView(eventRecord: Task) {
        const marker = eventRecord.marker;
        this.map.easeTo({ center : marker.getLngLat() });
    }

    showTooltip(eventRecord: Task, centerAtMarker: boolean) {
        const marker = eventRecord.marker;
        this.popup?.remove();

        if (centerAtMarker) {
            this.scrollMarkerIntoView(eventRecord);
        }

        this.createAndShowPopup(eventRecord, marker);
    }

    private createAndShowPopup(eventRecord: Task, marker: mapboxgl.Marker) {
        const popup =
            (this.popup =
            (marker as any).popup =
                new mapboxgl.Popup({
                    offset : [0, -21]
                } as PopupConfig));

        popup.setLngLat(marker.getLngLat()).setHTML(this.createPopupContent(eventRecord)).addTo(this.map);
    }

    private createPopupContent = (eventRecord: Task) => StringHelper.xss`
        <span class="event-name">${eventRecord.name}</span>
        <span class="resource"><i class="fa fa-fw fa-user"></i>${eventRecord.resource?.name || 'Unassigned'}</span>
        <span class="location"><i class="fa fa-fw fa-map-marker-alt"></i>${eventRecord.shortAddress}</span>
    `;

    // Event handlers
    onMapClick({ target }: { target: mapboxgl.Marker }) {
        const markerEl = (target as any).closest('.mapboxgl-marker');
        if (!markerEl) return;

        const eventRecord = this.eventStore.getById(markerEl.id) as Task;
        this.showTooltip(eventRecord, true);
        this.trigger('markerclick', {
            marker : eventRecord.marker,
            eventRecord
        });
    }

    override onResize = () => {
        // This widget was resized, so refresh the Mapbox map
        this.map?.resize();
    };

    onTimeAxisReconfigure() {
        this.eventStore.forEach((eventRecord: Task) => {
            this.removeEventMarker(eventRecord);
            this.addEventMarker(eventRecord);
        });
    }

    // When data changes in the eventStore, update the map markers accordingly
    async onStoreChange(event: Parameters<NonNullable<Exclude<StoreListeners['change'], string>>>[0]) {
        // await for the project commit to complete to have all data normalized before adding the markers
        await this.eventStore.project.commitAsync();

        switch (event.action) {
            case 'add':
            case 'dataset':
                if (event.action === 'dataset') {
                    this.removeAllMarkers();
                }
                event.records.forEach((eventRecord) => this.addEventMarker(eventRecord as Task));
                break;

            case 'remove':
                event.records.forEach((eventRecord) => this.removeEventMarker(eventRecord as Task));
                break;

            case 'update': {
                const eventRecord = event.record as Task;

                if (!eventRecord) return;
                this.removeEventMarker(eventRecord);
                this.addEventMarker(eventRecord);

                break;
            }

            case 'filter': {
                const renderedMarkers: Array<Task> = [];

                this.eventStore
                    .query((rec: Task) => rec.marker, true)
                    .forEach((eventRecord) => {
                        if (!event.records.includes(eventRecord as Task)) {
                            this.removeEventMarker(eventRecord as Task);
                        }
                        else {
                            renderedMarkers.push(eventRecord as Task);
                        }
                    });

                event.records.forEach((eventRecord) => {
                    const task = eventRecord as Task;
                    if (!renderedMarkers.includes(task)) {
                        this.addEventMarker(task);
                    }
                });

                break;
            }
        }
    }
}

// Register this widget type with its Factory
MapPanel.initClass();
