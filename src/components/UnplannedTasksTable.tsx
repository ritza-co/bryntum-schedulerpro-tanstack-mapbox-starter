import { useEffect, useMemo, useRef } from 'react';
import { rankItem } from '@tanstack/match-sorter-utils';
import {  type ColumnDef,  type FilterFn,flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { SchedulerPro } from '@bryntum/schedulerpro';
import { type UnplannedTask, useUnplannedTasks } from '@/hooks/useUnplannedTasks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableDragHelper } from '@/lib/TableDragHelper';

interface UnplannedTasksTableProps {
    scheduler: SchedulerPro | null | undefined;
    collapsed?: boolean;
}

const fuzzyFilter: FilterFn<UnplannedTask> = (row, columnId, value) => {
    const itemValue = row.getValue(columnId);
    const search = typeof value === 'string' ? value : String(value ?? '');
    return rankItem(String(itemValue ?? ''), search).passed;
};

export function UnplannedTasksTable({ scheduler, collapsed = false }: UnplannedTasksTableProps) {
    const tasks = useUnplannedTasks(scheduler);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Initialize drag-and-drop
    useEffect(() => {
        const tableElement = tableContainerRef.current;

        if (!scheduler || !tableElement) return;

        // Create drag helper instance
        const dragHelper = new TableDragHelper({
            scheduler,
            tableElement
        });

        // Cleanup on unmount
        return () => {
            dragHelper.destroy();
        };
    }, [scheduler]);

    // Define columns matching the demo's Bryntum Grid columns
    const columns = useMemo<Array<ColumnDef<UnplannedTask>>>(
        () => [
            {
                accessorKey : 'name',
                header      : 'Unscheduled tasks',
                cell        : ({ row }) => (
                    <div className="flex items-center unscheduledNameCell">
                        <i className="fa fa-fw fa-grip mr-2 text-gray-500 hover:text-gray-700"></i>
                        <span>{row.getValue('name')}</span>
                    </div>
                )
            },
            {
                accessorKey : 'address.display_name',
                header      : () => (
                    <div className="flex items-center">
                        <i className="fa fa-fw fa-map-marker-alt mr-1"></i>
                        <span>Location</span>
                    </div>
                ),
                cell : ({ row }) => {
                    const address = row.original.address?.display_name;
                    return <div className="text-sm">{address || ''}</div>;
                }
            },
            {
                accessorKey : 'duration',
                header      : () => (
                    <div className="flex items-center">
                        <i className="b-icon fa-clock mr-1"></i>
                        <span>Duration</span>
                    </div>
                ),
                cell : ({ row }) => {
                    const duration = row.getValue<number>('duration');
                    const unit = row.original.durationUnit;
                    return (
                        <div className="text-sm">
                            {duration}
                            {unit}
                        </div>
                    );
                }
            },
            {
                accessorKey : 'preamble',
                header      : () => (
                    <div className="flex items-center" title="Start trip">
                        <i className="b-icon fa-car-side mr-1"></i>
                        <i className="b-icon fa-arrow-right mr-1"></i>
                        <span>Travel time</span>
                    </div>
                ),
                cell : ({ row }) => {
                    const preamble = row.original.preamble as any;
                    // Handle Bryntum Duration objects or strings
                    const displayValue = preamble
                        ? typeof preamble === 'object'
                            ? `${preamble._magnitude}${preamble._unit}`
                            : preamble
                        : '';
                    return <div className="text-sm">{displayValue}</div>;
                }
            },
            {
                accessorKey : 'postamble',
                header      : () => (
                    <div className="flex items-center justify-center" title="Return trip">
                        <i className="b-icon fa-arrow-left mr-1"></i>
                        <i className="b-icon fa-car-side mr-1" style={{ transform : 'rotateY(180deg)' }}></i>
                        <span>Return time</span>
                    </div>
                ),
                cell : ({ row }) => {
                    const postamble = row.original.postamble as any;
                    // Handle Bryntum Duration objects or strings
                    const displayValue = postamble
                        ? typeof postamble === 'object'
                            ? `${postamble._magnitude}${postamble._unit}`
                            : postamble
                        : '';
                    return <div className="text-sm text-center">{displayValue}</div>;
                }
            }
        ],
        []
    );

    const table = useReactTable({
        data      : tasks,
        columns,
        filterFns : {
            fuzzy : fuzzyFilter
        },
        getCoreRowModel : getCoreRowModel()
    });

    return (
        <div
            className={`w-full b-unplanned-grid ${collapsed ? 'b-collapsed' : ''}`}
            ref={tableContainerRef}
            style={{
                flex       : collapsed ? '0 0 0px' : '0 1 400px',
                minHeight  : 0,
                transition : 'flex 0.3s ease-in-out',
                overflow   : collapsed ? 'hidden' : 'auto'
            }}
        >
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && 'selected'}
                                data-row-id={row.original.id}
                                className="cursor-grab active:cursor-grabbing hover:bg-gray-50"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No unscheduled tasks
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
