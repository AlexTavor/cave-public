export interface CircularProgressProps {
    /** Progress value from 0 to 1 */
    progress: number;
    /** Diameter of the circle in pixels */
    size: number;
    /** Width of the stroke. Default: 10% of size */
    strokeWidth?: number;
    /** Optional CSS class */
    className?: string;
}
