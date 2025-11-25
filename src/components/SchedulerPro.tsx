import { forwardRef } from 'react';
import { BryntumSchedulerPro } from '@bryntum/schedulerpro-react';
import { schedulerproProps } from '@/schedulerProConfig';

const SchedulerPro = forwardRef<BryntumSchedulerPro, any>((props, ref) => {
    return <BryntumSchedulerPro ref={ref} {...schedulerproProps} {...props} />;
});

SchedulerPro.displayName = 'SchedulerPro';

export default SchedulerPro;
